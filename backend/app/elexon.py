import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import cache

import httpx
from pydantic import AwareDatetime, BaseModel, TypeAdapter

from app.analysis import Forecast, delivery_window

logger = logging.getLogger(__name__)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
TIMEOUT = httpx.Timeout(15.0, connect=5.0)  # Stay well inside Vercel's 30 s function limit
FUEL_TYPE = "WIND"
# Decisions on 1-31 Jan buy delivery days 2 Jan-1 Feb
DELIVERY_FIRST = date(2026, 1, 2)
DELIVERY_LAST = date(2026, 2, 1)
FORECAST_LOOKBACK = timedelta(days=3)  # WINDFOR runs reach ~66 h ahead


class Row(BaseModel):
    startTime: AwareDatetime
    publishTime: AwareDatetime
    generation: float
    fuelType: str | None = None


@dataclass(frozen=True)
class Dataset:
    actuals: dict[datetime, float]
    forecasts: list[Forecast]


_rows = TypeAdapter(list[Row])
_lock = threading.Lock()


def parse_rows(payload: bytes) -> list[Row]:
    return _rows.validate_json(payload)


def to_forecasts(rows: list[Row]) -> list[Forecast]:
    return [Forecast(publish=r.publishTime, target=r.startTime, mw=r.generation) for r in rows]


def _stream(client: httpx.Client, dataset: str, params: dict[str, str]) -> list[Row]:
    res = client.get(f"{BASE_URL}/{dataset}/stream", params=params)
    res.raise_for_status()
    return parse_rows(res.content)


@cache
def _fetch() -> Dataset:
    start, end = delivery_window(DELIVERY_FIRST, DELIVERY_LAST)
    actual_params = {
        "fuelType": FUEL_TYPE,
        "settlementDateFrom": (DELIVERY_FIRST - timedelta(days=1)).isoformat(),
        "settlementDateTo": DELIVERY_LAST.isoformat(),
    }
    forecast_params = {
        "publishDateTimeFrom": (start - FORECAST_LOOKBACK).isoformat(),
        "publishDateTimeTo": end.isoformat(),
    }
    began = time.perf_counter()
    with httpx.Client(timeout=TIMEOUT) as client, ThreadPoolExecutor(2) as pool:
        actual_job = pool.submit(_stream, client, "FUELHH", actual_params)
        forecast_job = pool.submit(_stream, client, "WINDFOR", forecast_params)
        actual_rows, forecast_rows = actual_job.result(), forecast_job.result()

    # Never cache an empty 200 as the month's data
    if not actual_rows or not forecast_rows:
        raise ValueError("Elexon returned no rows")
    if any(r.fuelType != FUEL_TYPE for r in actual_rows):
        raise ValueError("FUELHH returned rows for other fuel types")

    dataset = Dataset(
        actuals={r.startTime: r.generation for r in actual_rows},
        forecasts=to_forecasts(forecast_rows),
    )
    logger.info(
        "Loaded %d actuals and %d forecasts from Elexon in %.1fs",
        len(dataset.actuals),
        len(dataset.forecasts),
        time.perf_counter() - began,
    )
    return dataset


def load() -> Dataset:
    # Lock stops concurrent cold requests fetching twice
    with _lock:
        return _fetch()
