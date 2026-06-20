from .base import StrategyResult, BaseStrategy
from .ema_crossover import EMACrossoverStrategy
from .momentum_long import MomentumLongStrategy
from .breakout_long import BreakoutLongStrategy
from .breakout_short import BreakoutShortStrategy
from .momentum_short import MomentumShortStrategy
from .reversal_long import ReversalLongStrategy
from .reversal_short import ReversalShortStrategy
from .macd_signal import MACDSignalStrategy
from .bollinger_squeeze import BollingerSqueezeStrategy
from .adx_trend import ADXTrendStrategy
from .volume_surge import VolumeSurgeStrategy
from .rsi_divergence_strat import RSIDivergenceStrategy

ALL_STRATEGIES = [
    EMACrossoverStrategy(),
    MomentumLongStrategy(),
    BreakoutLongStrategy(),
    BreakoutShortStrategy(),
    MomentumShortStrategy(),
    ReversalLongStrategy(),
    ReversalShortStrategy(),
    MACDSignalStrategy(),
    BollingerSqueezeStrategy(),
    ADXTrendStrategy(),
    VolumeSurgeStrategy(),
    RSIDivergenceStrategy(),
]

__all__ = [
    "StrategyResult", "BaseStrategy",
    "EMACrossoverStrategy", "MomentumLongStrategy", "BreakoutLongStrategy",
    "BreakoutShortStrategy", "MomentumShortStrategy",
    "ReversalLongStrategy", "ReversalShortStrategy",
    "MACDSignalStrategy", "BollingerSqueezeStrategy", "ADXTrendStrategy",
    "VolumeSurgeStrategy", "RSIDivergenceStrategy",
    "ALL_STRATEGIES",
]
