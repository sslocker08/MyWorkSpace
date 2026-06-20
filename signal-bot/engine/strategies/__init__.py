from .base import StrategyResult, BaseStrategy
from .ema_crossover import EMACrossoverStrategy
from .momentum_long import MomentumLongStrategy
from .breakout_long import BreakoutLongStrategy
from .breakout_short import BreakoutShortStrategy
from .momentum_short import MomentumShortStrategy
from .reversal_long import ReversalLongStrategy
from .reversal_short import ReversalShortStrategy

ALL_STRATEGIES = [
    EMACrossoverStrategy(),
    MomentumLongStrategy(),
    BreakoutLongStrategy(),
    BreakoutShortStrategy(),
    MomentumShortStrategy(),
    ReversalLongStrategy(),
    ReversalShortStrategy(),
]

__all__ = [
    "StrategyResult", "BaseStrategy",
    "EMACrossoverStrategy", "MomentumLongStrategy", "BreakoutLongStrategy",
    "BreakoutShortStrategy", "MomentumShortStrategy",
    "ReversalLongStrategy", "ReversalShortStrategy",
    "ALL_STRATEGIES",
]
