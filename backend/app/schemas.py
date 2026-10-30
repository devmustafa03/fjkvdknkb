from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class SeriesPoint(Schema):
    time: datetime
    actual: float | None
    forecast: float | None = None
    publish_time: datetime | None = None
    horizon_hours: float | None = None
    error: float | None = None  # forecast - actual: positive = wind shortfall
    band_low: float | None = None
    band_high: float | None = None


class Metrics(Schema):
    count: int
    mean_actual: float
    mean_forecast: float
    mae: float
    rmse: float
    bias: float
    mae_pct: float | None
    p10: float
    p50: float
    p90: float
    max_shortfall: float
    max_surplus: float


class HorizonBucket(Schema):
    hours: int
    count: int
    mae: float
    p90_abs: float


class HistogramBin(Schema):
    start: float
    end: float
    count: int


class Analysis(Schema):
    delivery_from: date
    delivery_to: date
    gate: time
    window_start: datetime
    window_end: datetime
    series: list[SeriesPoint]
    metrics: Metrics | None
    horizon_profile: list[HorizonBucket]
    histogram: list[HistogramBin]
