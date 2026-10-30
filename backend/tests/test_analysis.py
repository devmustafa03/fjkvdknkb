from datetime import UTC, date, datetime, time

import pytest

from app.analysis import (
    Forecast,
    analyse,
    decision_cutoff,
    delivery_window,
)


def utc(*args: int) -> datetime:
    return datetime(*args, tzinfo=UTC)


GATE = time(9, 50)


class TestDeliveryWindow:
    def test_delivery_day_runs_23_to_23_uk_time(self) -> None:
        start, end = delivery_window(date(2026, 1, 5), date(2026, 1, 5))
        assert start == utc(2026, 1, 4, 23)
        assert end == utc(2026, 1, 5, 23)

    def test_multi_day_window(self) -> None:
        start, end = delivery_window(date(2026, 1, 2), date(2026, 2, 1))
        assert start == utc(2026, 1, 1, 23)
        assert end == utc(2026, 2, 1, 23)


class TestDecisionCutoff:
    def test_first_period_of_delivery_day_uses_previous_day_gate(self) -> None:
        # 23:00 on 4 Jan is already delivery day 5 Jan
        assert decision_cutoff(utc(2026, 1, 4, 23), GATE) == utc(2026, 1, 4, 9, 50)

    def test_last_period_of_delivery_day(self) -> None:
        assert decision_cutoff(utc(2026, 1, 5, 22, 30), GATE) == utc(2026, 1, 4, 9, 50)

    def test_respects_british_summer_time(self) -> None:
        # BST: gate 09:50 local is 08:50 UTC
        assert decision_cutoff(utc(2026, 7, 1, 12), GATE) == utc(2026, 6, 30, 8, 50)


def fc(publish: datetime, target: datetime, mw: float) -> Forecast:
    return Forecast(publish=publish, target=target, mw=mw)


class TestAnalyse:
    """Delivery day 5 Jan; gate closes 4 Jan 09:50."""

    first, last = date(2026, 1, 5), date(2026, 1, 5)
    t0 = utc(2026, 1, 4, 23)
    t1 = utc(2026, 1, 5, 0)

    def run(self, actuals: dict[datetime, float], forecasts: list[Forecast]):
        return analyse(actuals, forecasts, self.first, self.last, GATE)

    def test_picks_latest_forecast_published_before_gate(self) -> None:
        forecasts = [
            fc(utc(2026, 1, 4, 4, 30), self.t0, 1000),
            fc(utc(2026, 1, 4, 7, 30), self.t0, 1100),
            fc(utc(2026, 1, 4, 9, 30), self.t0, 1150),
            fc(utc(2026, 1, 4, 11, 30), self.t0, 1300),  # after gate
        ]
        result = self.run({self.t0: 1200}, forecasts)
        point = result.series[0]
        assert point.forecast == 1150
        assert point.publish_time == utc(2026, 1, 4, 9, 30)
        assert point.horizon_hours == 13.5

    def test_forecast_published_exactly_at_gate_is_usable(self) -> None:
        forecasts = [fc(utc(2026, 1, 4, 9, 50), self.t0, 900)]
        assert self.run({self.t0: 1000}, forecasts).series[0].forecast == 900

    def test_no_forecast_before_gate_leaves_gap(self) -> None:
        forecasts = [fc(utc(2026, 1, 4, 11, 30), self.t0, 1300)]
        point = self.run({self.t0: 1200}, forecasts).series[0]
        assert point.actual == 1200
        assert point.forecast is None
        assert point.error is None

    def test_half_hour_actuals_have_no_forecast(self) -> None:
        half = utc(2026, 1, 4, 23, 30)
        forecasts = [fc(utc(2026, 1, 4, 7, 30), self.t0, 1000)]
        result = self.run({self.t0: 1000, half: 1050}, forecasts)
        assert [p.time for p in result.series] == [self.t0, half]
        assert result.series[1].forecast is None

    def test_points_outside_delivery_window_are_dropped(self) -> None:
        outside = utc(2026, 1, 5, 23)
        result = self.run({self.t0: 1000, outside: 999}, [])
        assert [p.time for p in result.series] == [self.t0]

    def test_metrics(self) -> None:
        pub = utc(2026, 1, 4, 7, 30)
        actuals = {self.t0: 1000, self.t1: 2000}
        forecasts = [fc(pub, self.t0, 1200), fc(pub, self.t1, 1600)]
        m = self.run(actuals, forecasts).metrics
        assert m is not None
        assert m.count == 2
        assert m.mae == 300
        assert m.bias == -100
        assert m.rmse == pytest.approx((200**2 / 2 + 400**2 / 2) ** 0.5)
        assert m.mae_pct == pytest.approx(300 / 1500 * 100)
        assert m.max_shortfall == 200
        assert m.max_surplus == 400

    def test_one_sided_errors_clamp_the_other_extreme_to_zero(self) -> None:
        pub = utc(2026, 1, 4, 7, 30)
        forecasts = [fc(pub, self.t0, 1200), fc(pub, self.t1, 2300)]
        m = self.run({self.t0: 1000, self.t1: 2000}, forecasts).metrics
        assert m is not None
        assert m.max_shortfall == 300
        assert m.max_surplus == 0

    def test_zero_mean_actual_has_no_percentage(self) -> None:
        m = self.run({self.t0: 0}, [fc(utc(2026, 1, 4, 7, 30), self.t0, 500)]).metrics
        assert m is not None
        assert m.mae_pct is None

    def test_band_brackets_forecast_with_error_quantiles(self) -> None:
        pub = utc(2026, 1, 4, 7, 30)
        actuals = {self.t0: 1000, self.t1: 2000}
        forecasts = [fc(pub, self.t0, 1200), fc(pub, self.t1, 1600)]
        result = self.run(actuals, forecasts)
        m = result.metrics
        assert m is not None
        point = result.series[0]
        assert point.band_low == pytest.approx(1200 - m.p90)
        assert point.band_high == pytest.approx(1200 - m.p10)

    def test_band_low_never_goes_below_zero(self) -> None:
        pub = utc(2026, 1, 4, 7, 30)
        forecasts = [fc(pub, self.t0, 100), fc(pub, self.t1, 3000)]
        result = self.run({self.t0: 50, self.t1: 1000}, forecasts)
        assert result.series[0].band_low == 0

    def test_empty_inputs_give_no_metrics(self) -> None:
        result = self.run({}, [])
        assert result.series == []
        assert result.metrics is None
        assert result.histogram == []

    def test_horizon_profile_uses_every_forecast_vintage(self) -> None:
        actuals = {self.t0: 1000}
        forecasts = [
            fc(utc(2026, 1, 4, 22, 30), self.t0, 1100),
            fc(utc(2026, 1, 4, 9, 30), self.t0, 1500),
            fc(utc(2026, 1, 4, 22, 30), utc(2026, 1, 4, 22), 5),  # target before window
            fc(utc(2026, 1, 5, 0, 30), self.t0, 1),  # published after target
        ]
        profile = self.run(actuals, forecasts).horizon_profile
        assert [(b.hours, b.count, b.mae) for b in profile] == [(0, 1, 100), (13, 1, 500)]

    def test_horizon_profile_ignores_leads_beyond_48_hours(self) -> None:
        forecasts = [fc(utc(2026, 1, 2, 22), self.t0, 1100), fc(utc(2026, 1, 3, 0), self.t0, 1200)]
        profile = self.run({self.t0: 1000}, forecasts).horizon_profile
        assert [(b.hours, b.count) for b in profile] == [(47, 1)]

    def test_histogram_bins_errors(self) -> None:
        pub = utc(2026, 1, 4, 7, 30)
        actuals = {self.t0: 1000, self.t1: 2000}
        forecasts = [fc(pub, self.t0, 1200), fc(pub, self.t1, 1600)]
        histogram = self.run(actuals, forecasts).histogram
        assert [(b.start, b.count) for b in histogram] == [(-500, 1), (0, 1)]
