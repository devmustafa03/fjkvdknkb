from datetime import UTC, datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app import elexon
from app.analysis import Forecast
from app.main import app


def utc(*args: int) -> datetime:
    return datetime(*args, tzinfo=UTC)


T0 = utc(2026, 1, 4, 23)
DATASET = elexon.Dataset(
    actuals={T0: 1000.0, utc(2026, 1, 4, 23, 30): 1100.0},
    forecasts=[Forecast(publish=utc(2026, 1, 4, 7, 30), target=T0, mw=1200.0)],
)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(elexon, "load", lambda: DATASET)
    return TestClient(app)


def elexon_down() -> elexon.Dataset:
    raise httpx.ConnectError("down")


def test_health(client: TestClient) -> None:
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_analysis_returns_camel_case_contract(client: TestClient) -> None:
    res = client.get("/api/v1/wind/analysis", params={"from": "2026-01-05", "to": "2026-01-05", "gate": "09:50"})
    assert res.status_code == 200
    assert "max-age" in res.headers["cache-control"]
    body = res.json()
    assert body["windowStart"] == "2026-01-04T23:00:00Z"
    first = body["series"][0]
    assert first["forecast"] == 1200
    assert first["publishTime"] == "2026-01-04T07:30:00Z"
    assert first["horizonHours"] == 15.5
    assert body["metrics"]["mae"] == 200
    assert body["horizonProfile"][0]["hours"] == 15


@pytest.mark.parametrize(
    "params",
    [
        pytest.param({"from": "2026-01-06", "to": "2026-01-05"}, id="reversed"),
        pytest.param({"from": "2026-01-01", "to": "2026-01-05"}, id="decision on 31 Dec is out of scope"),
        pytest.param({"from": "2026-01-05", "to": "2026-02-02"}, id="decision on 1 Feb is out of scope"),
        pytest.param({"from": "2026-01-05", "to": "2026-01-05", "gate": "23:00"}, id="after delivery starts"),
        pytest.param({"from": "2026-01-05", "to": "2026-01-05", "gate": "9am"}, id="not a time"),
        pytest.param({"from": "2026-01-05", "to": "2026-01-05", "gate": "0٩:50"}, id="unicode digit"),
        pytest.param({"from": "not-a-date"}, id="not a date"),
    ],
)
def test_invalid_params_return_consistent_error(client: TestClient, params: dict[str, str]) -> None:
    res = client.get("/api/v1/wind/analysis", params=params)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_range_error_names_the_offending_field(client: TestClient) -> None:
    res = client.get("/api/v1/wind/analysis", params={"from": "2026-01-05", "to": "2026-02-02"})
    detail = res.json()["error"]["details"][0]
    assert detail["loc"] == ["query", "to"]
    assert detail["type"] == "value_error"


def test_upstream_failure_maps_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(elexon, "load", elexon_down)
    res = TestClient(app).get("/api/v1/wind/analysis")
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
    assert "cache-control" not in res.headers


def test_bad_input_is_rejected_before_fetching_upstream(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(elexon, "load", elexon_down)
    res = TestClient(app).get("/api/v1/wind/analysis", params={"from": "2026-01-01"})
    assert res.status_code == 422


def test_unexpected_error_keeps_the_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom() -> elexon.Dataset:
        raise RuntimeError("bug")

    monkeypatch.setattr(elexon, "load", boom)
    res = TestClient(app, raise_server_exceptions=False).get("/api/v1/wind/analysis")
    assert res.status_code == 500
    assert res.json()["error"]["code"] == "INTERNAL_ERROR"


def test_unknown_route_uses_error_shape(client: TestClient) -> None:
    res = client.get("/api/v1/nope")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"
