"""Forecast the desk had at gate closure, and its error."""

from bisect import bisect_right
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from math import floor, sqrt
from statistics import fmean, quantiles
from zoneinfo import ZoneInfo

from app.schemas import Analysis, HistogramBin, HorizonBucket, Metrics, SeriesPoint

UK = ZoneInfo("Europe/London")
DELIVERY_DAY_START = time(23)  # GB day-ahead delivery day runs 23:00 to 23:00 UK
MAX_HORIZON_HOURS = 48
HISTOGRAM_BIN_MW = 500


@dataclass(frozen=True, slots=True)
class Forecast:
    publish: datetime
    target: datetime
    mw: float


def delivery_window(first: date, last: date) -> tuple[datetime, datetime]:
    start = datetime.combine(first - timedelta(days=1), DELIVERY_DAY_START, UK)
    end = datetime.combine(last, DELIVERY_DAY_START, UK)
    return start.astimezone(UTC), end.astimezone(UTC)


def decision_cutoff(target: datetime, gate: time) -> datetime:
    local = target.astimezone(UK)
    # Hours from 23:00 UK belong to the next delivery day
    auction_day = local.date() if local.time() >= DELIVERY_DAY_START else local.date() - timedelta(days=1)
    return datetime.combine(auction_day, gate, UK).astimezone(UTC)


def analyse(
    actuals: dict[datetime, float],
    forecasts: list[Forecast],
    first: date,
    last: date,
    gate: time,
) -> Analysis:
    start, end = delivery_window(first, last)

    vintages: dict[datetime, list[Forecast]] = defaultdict(list)
    for f in forecasts:
        # WINDFOR re-states past hours; those are not forecasts
        if start <= f.target < end and f.publish <= f.target:
            vintages[f.target].append(f)
    for vs in vintages.values():
        vs.sort(key=lambda f: f.publish)

    chosen = {t: best for t, vs in vintages.items() if (best := _latest_before(vs, decision_cutoff(t, gate)))}
    times = sorted({t for t in actuals if start <= t < end} | chosen.keys())
    errors = [chosen[t].mw - actuals[t] for t in times if t in chosen and t in actuals]
    matched_actuals = [actuals[t] for t in times if t in chosen and t in actuals]
    metrics = _metrics(errors, matched_actuals)

    return Analysis(
        delivery_from=first,
        delivery_to=last,
        gate=gate,
        window_start=start,
        window_end=end,
        series=[_point(t, actuals.get(t), chosen.get(t), metrics) for t in times],
        metrics=metrics,
        horizon_profile=_horizon_profile(vintages, actuals),
        histogram=_histogram(errors),
    )


def _latest_before(vintages: list[Forecast], cutoff: datetime) -> Forecast | None:
    i = bisect_right(vintages, cutoff, key=lambda f: f.publish)
    return vintages[i - 1] if i else None


def _deciles(values: list[float]) -> list[float]:
    return quantiles(values, n=10, method="inclusive") if len(values) > 1 else values * 9


def _metrics(errors: list[float], actuals: list[float]) -> Metrics | None:
    if not errors:
        return None
    mean_actual = fmean(actuals)
    mae = fmean(abs(e) for e in errors)
    deciles = _deciles(errors)
    return Metrics(
        count=len(errors),
        mean_actual=mean_actual,
        mean_forecast=mean_actual + fmean(errors),
        mae=mae,
        rmse=sqrt(fmean(e * e for e in errors)),
        bias=fmean(errors),
        mae_pct=mae / mean_actual * 100 if mean_actual else None,
        p10=deciles[0],
        p50=deciles[4],
        p90=deciles[8],
        max_shortfall=max(0.0, max(errors)),
        max_surplus=max(0.0, -min(errors)),
    )


def _point(t: datetime, actual: float | None, f: Forecast | None, m: Metrics | None) -> SeriesPoint:
    if f is None:
        return SeriesPoint(time=t, actual=actual)
    return SeriesPoint(
        time=t,
        actual=actual,
        forecast=f.mw,
        publish_time=f.publish,
        horizon_hours=(t - f.publish) / timedelta(hours=1),
        error=None if actual is None else f.mw - actual,
        band_low=max(0.0, f.mw - m.p90) if m else None,
        band_high=f.mw - m.p10 if m else None,
    )


def _horizon_profile(vintages: dict[datetime, list[Forecast]], actuals: dict[datetime, float]) -> list[HorizonBucket]:
    buckets: dict[int, list[float]] = defaultdict(list)
    for t, vs in vintages.items():
        if t not in actuals:
            continue
        for f in vs:
            hours = (t - f.publish) / timedelta(hours=1)
            if hours <= MAX_HORIZON_HOURS:
                buckets[int(hours)].append(abs(f.mw - actuals[t]))
    return [
        HorizonBucket(hours=h, count=len(e), mae=fmean(e), p90_abs=_deciles(e)[8]) for h, e in sorted(buckets.items())
    ]


def _histogram(errors: list[float]) -> list[HistogramBin]:
    if not errors:
        return []
    counts = Counter(floor(e / HISTOGRAM_BIN_MW) for e in errors)
    return [
        HistogramBin(start=k * HISTOGRAM_BIN_MW, end=(k + 1) * HISTOGRAM_BIN_MW, count=counts[k])
        for k in range(min(counts), max(counts) + 1)
    ]
