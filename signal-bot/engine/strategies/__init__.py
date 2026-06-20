from .base import StrategyResult, BaseStrategy
from .ema_crossover import EMACrossoverStrategy
from .momentum_long import MomentumLongStrategy
from .breakout_long import BreakoutLongStrategy

ALL_STRATEGIES = [
    EMACrossoverStrategy(),
    MomentumLongStrategy(),
    BreakoutLongStrategy(),
]

__all__ = [
    "StrategyResult", "BaseStrategy",
    "EMACrossoverStrategy", "MomentumLongStrategy", "BreakoutLongStrategy",
    "ALL_STRATEGIES",
]
