import json
import threading
from collections.abc import Callable, Iterator
from datetime import UTC, datetime

import httpx
import pytest

from app import elexon

T0 = datetime(2026, 1, 4, 23, tzinfo=UTC)
ACTUAL = {
    "fuelType": "WIND",
    "startTime": "2026-01-04T23:00:00Z",
    "publishTime": "2026-01-04T23:30:00Z",
    "generation": 1000,
}
FORECAST = {"startTime": "2026-01-04T23:00:00Z", "publishTime": "2026-01-04T07:30:00Z", "generation": 1200}

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture(autouse=True)
def fresh_cache() -> Iterator[None]:
    elexon._fetch.cache_clear()
    yield
    elexon._fetch.cache_clear()


@pytest.fixture
def upstream(monkeypatch: pytest.MonkeyPatch) -> dict[str, object]:
    """Fake Elexon: set `handler`, read `requests`."""
    state: dict[str, object] = {"requests": [], "handler": lambda _: httpx.Response(200, json=[])}

    def dispatch(request: httpx.Request) -> httpx.Response:
        state["requests"].append(request)  # type: ignore[union-attr]
        return state["handler"](request)  # type: ignore[operator]

    transport = httpx.MockTransport(dispatch)
    real_client = httpx.Client  # the patched name below would otherwise call itself
    monkeypatch.setattr(elexon.httpx, "Client", lambda **kw: real_client(transport=transport, **kw))
    return state


def healthy(request: httpx.Request) -> httpx.Response:
    rows = [ACTUAL] if "FUELHH" in request.url.path else [FORECAST]
    return httpx.Response(200, json=rows)


def test_parse_rows_and_forecasts() -> None:
    rows = elexon.parse_rows(json.dumps([ACTUAL]).encode())
    assert rows[0].startTime == T0
    assert rows[0].fuelType == "WIND"
    forecasts = elexon.to_forecasts(elexon.parse_rows(json.dumps([FORECAST]).encode()))
    assert forecasts[0].target == T0 and forecasts[0].mw == 1200


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param([{"startTime": "yesterday"}], id="not a timestamp"),
        pytest.param([{**FORECAST, "startTime": "2026-01-04T23:00:00"}], id="naive timestamp"),
        pytest.param({"data": []}, id="not a list"),
    ],
)
def test_parse_rejects_malformed_payload(payload: object) -> None:
    with pytest.raises(ValueError):
        elexon.parse_rows(json.dumps(payload).encode())


def test_fetches_both_datasets_with_the_documented_params(upstream: dict[str, object]) -> None:
    upstream["handler"] = healthy
    dataset = elexon.load()
    assert dataset.actuals == {T0: 1000.0}
    assert dataset.forecasts[0].mw == 1200
    params = {r.url.path.split("/")[-2]: dict(r.url.params) for r in upstream["requests"]}  # type: ignore[union-attr]
    assert params["FUELHH"] == {
        "fuelType": "WIND",
        "settlementDateFrom": "2026-01-01",
        "settlementDateTo": "2026-02-01",
    }
    assert params["WINDFOR"] == {
        "publishDateTimeFrom": "2025-12-29T23:00:00+00:00",
        "publishDateTimeTo": "2026-02-01T23:00:00+00:00",
    }


def test_second_load_is_served_from_memory(upstream: dict[str, object]) -> None:
    upstream["handler"] = healthy
    first = elexon.load()
    assert elexon.load() is first
    assert len(upstream["requests"]) == 2  # type: ignore[arg-type]


def test_failed_fetch_is_not_cached(upstream: dict[str, object]) -> None:
    upstream["handler"] = lambda _: httpx.Response(503)
    with pytest.raises(httpx.HTTPStatusError):
        elexon.load()
    upstream["handler"] = healthy
    assert elexon.load().actuals == {T0: 1000.0}


@pytest.mark.parametrize(
    ("actual_rows", "forecast_rows"),
    [
        pytest.param([], [FORECAST], id="no actuals"),
        pytest.param([ACTUAL], [], id="no forecasts"),
        pytest.param([{**ACTUAL, "fuelType": "CCGT"}], [FORECAST], id="wrong fuel type"),
    ],
)
def test_incomplete_data_is_rejected_and_not_cached(
    upstream: dict[str, object], actual_rows: list[dict[str, object]], forecast_rows: list[dict[str, object]]
) -> None:
    upstream["handler"] = lambda r: httpx.Response(200, json=actual_rows if "FUELHH" in r.url.path else forecast_rows)
    with pytest.raises(ValueError):
        elexon.load()
    upstream["handler"] = healthy
    assert elexon.load().actuals == {T0: 1000.0}


def test_concurrent_cold_requests_fetch_once(upstream: dict[str, object]) -> None:
    upstream["handler"] = healthy
    threads = [threading.Thread(target=elexon.load) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(upstream["requests"]) == 2  # type: ignore[arg-type]
