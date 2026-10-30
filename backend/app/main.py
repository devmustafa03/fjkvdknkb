import logging
from datetime import date, time
from typing import Annotated

import httpx
from fastapi import FastAPI, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app import elexon
from app.analysis import analyse
from app.elexon import DELIVERY_FIRST, DELIVERY_LAST, Dataset
from app.schemas import Analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

# ASCII digits only; gate precedes the 23:00 delivery start
GATE_PATTERN = r"^([01][0-9]|2[0-2]):[0-5][0-9]$"
DEFAULT_GATE = "09:50"  # N2EX GB day-ahead gate closure
CACHE_CONTROL = "public, max-age=3600, s-maxage=86400"  # Historical data never changes

app = FastAPI(
    title="WindSight API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redirect_slashes=False,
)


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def _error(status: int, code: str, message: str, details: object = None) -> JSONResponse:
    body = {"code": code, "message": message} | ({"details": details} if details is not None else {})
    return JSONResponse(status_code=status, content={"error": body})


@app.exception_handler(ApiError)
async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return _error(422, "VALIDATION_ERROR", "Invalid request parameters", jsonable_encoder(exc.errors()))


@app.exception_handler(HTTPException)
async def _http_error(_: Request, exc: HTTPException) -> JSONResponse:
    code = "NOT_FOUND" if exc.status_code == 404 else f"HTTP_{exc.status_code}"
    return _error(exc.status_code, code, str(exc.detail))


@app.exception_handler(Exception)
async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return _error(500, "INTERNAL_ERROR", "Something went wrong on our side, please retry")


def load_dataset() -> Dataset:
    try:
        return elexon.load()
    except (httpx.HTTPError, ValueError) as exc:
        logger.exception("Elexon fetch failed")
        raise ApiError(502, "UPSTREAM_UNAVAILABLE", "Elexon BMRS data is unavailable, please retry shortly") from exc


def _check_range(first: date, last: date) -> None:
    if DELIVERY_FIRST <= first <= last <= DELIVERY_LAST:
        return
    field, value = ("from", first) if not DELIVERY_FIRST <= first <= DELIVERY_LAST else ("to", last)
    raise RequestValidationError(
        [
            {
                "type": "value_error",
                "loc": ["query", field],
                "msg": f"Need {DELIVERY_FIRST} <= from <= to <= {DELIVERY_LAST}",
                "input": value.isoformat(),
            }
        ]
    )


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/wind/analysis", response_model=Analysis)
def wind_analysis(
    response: Response,
    first: Annotated[date, Query(alias="from", description="First delivery day")] = DELIVERY_FIRST,
    last: Annotated[date, Query(alias="to", description="Last delivery day")] = DELIVERY_LAST,
    gate: Annotated[str, Query(pattern=GATE_PATTERN, description="Gate closure on D-1, UK time")] = DEFAULT_GATE,
) -> Analysis:
    # Bad input must get 422 even while Elexon is down
    _check_range(first, last)
    dataset = load_dataset()
    response.headers["Cache-Control"] = CACHE_CONTROL
    return analyse(dataset.actuals, dataset.forecasts, first, last, time.fromisoformat(gate))
