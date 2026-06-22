from dataclasses import dataclass, field
from typing import Optional
import pandas as pd


@dataclass
class StrategyResult:
    name: str
    triggered: bool
    direction: Optional[str] = None  # "LONG" or "SHORT"
    confidence: float = 0.0          # 0.0 - 1.0
    reason: str = ""
    indicators: dict = field(default_factory=dict)


class BaseStrategy:
    name: str = "base"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        raise NotImplementedError
