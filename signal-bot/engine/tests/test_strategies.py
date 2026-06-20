"""Strategy trigger correctness — each strategy fires on its matching golden
fixture with the right direction, and does NOT false-trigger on a flat series.

These are the positive/negative screening cases: a strategy that fires on noise
(false positive) is as dangerous as one that never fires.
"""
import pytest

from strategies.ema_crossover import EMACrossoverStrategy
from strategies.momentum_long import MomentumLongStrategy
from strategies.breakout_long import BreakoutLongStrategy
from strategies.breakout_short import BreakoutShortStrategy
from strategies.momentum_short import MomentumShortStrategy
from strategies.reversal_long import ReversalLongStrategy
from strategies.reversal_short import ReversalShortStrategy
from strategies.macd_signal import MACDSignalStrategy
from strategies.bollinger_squeeze import BollingerSqueezeStrategy
from strategies.adx_trend import ADXTrendStrategy
from strategies.volume_surge import VolumeSurgeStrategy
from strategies.rsi_divergence_strat import RSIDivergenceStrategy
from core.indicators import rsi, rsi_divergence


# --- ema_crossover ----------------------------------------------------------

def test_ema_crossover_golden_cross_long(golden_cross_df):
    res = EMACrossoverStrategy().evaluate("TEST", golden_cross_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_ema_crossover_death_cross_short(death_cross_df):
    res = EMACrossoverStrategy().evaluate("TEST", death_cross_df)
    assert res.triggered is True
    assert res.direction == "SHORT"


def test_ema_crossover_no_trigger_on_flat(flat_df):
    res = EMACrossoverStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# --- momentum_long ----------------------------------------------------------

def test_momentum_long_triggers_on_uptrend(uptrend_df):
    res = MomentumLongStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_momentum_long_no_trigger_on_flat(flat_df):
    res = MomentumLongStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_momentum_long_no_trigger_on_downtrend(downtrend_df):
    res = MomentumLongStrategy().evaluate("TEST", downtrend_df)
    assert res.triggered is False


# --- breakout_long ----------------------------------------------------------

def test_breakout_long_triggers_on_breakout(breakout_df):
    res = BreakoutLongStrategy().evaluate("TEST", breakout_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_breakout_long_length_gate(flat_df):
    # flat_df is only 80 bars < 260 -> must not trigger.
    res = BreakoutLongStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_breakout_long_no_trigger_on_long_flat(long_series_df):
    # long enough (>260) but the volume-surge/near-high combo is engineered only
    # into breakout_df; a generic climb should not fire on the last bar.
    res = BreakoutLongStrategy().evaluate("TEST", long_series_df)
    # Not asserting it must be False in every world, but with no final-bar volume
    # surge the 2x filter should keep it quiet.
    assert res.triggered is False


# --- breakout_short ---------------------------------------------------------

def test_breakout_short_triggers_on_breakdown(breakdown_df):
    res = BreakoutShortStrategy().evaluate("TEST", breakdown_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_breakout_short_length_gate(flat_df):
    # flat_df is only 80 bars < 260 -> must not trigger.
    res = BreakoutShortStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_breakout_short_no_trigger_on_long_flat(long_series_df):
    # >260 bars and an uptrend -> no fresh-low/downtrend/volume-surge combo.
    res = BreakoutShortStrategy().evaluate("TEST", long_series_df)
    assert res.triggered is False


# --- momentum_short ---------------------------------------------------------

def test_momentum_short_triggers_on_moderate_downtrend(momentum_short_df):
    # Dedicated fixture: a MODERATE downtrend that recently bounced slightly, so
    # the final-bar RSI sits in the 25-40 band (NOT the single digits a clean
    # steady downtrend pins it at). downtrend_df is intentionally too steep for
    # this gate and is used only as a negative case below.
    res = MomentumShortStrategy().evaluate("TEST", momentum_short_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_momentum_short_no_trigger_on_clean_downtrend(downtrend_df):
    # A CLEAN steady downtrend pins RSI in single digits (< 25), below the band,
    # so momentum_short must NOT fire — it targets weak/falling, not crashed.
    res = MomentumShortStrategy().evaluate("TEST", downtrend_df)
    assert res.triggered is False


def test_momentum_short_no_trigger_on_flat(flat_df):
    res = MomentumShortStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_momentum_short_no_trigger_on_uptrend(uptrend_df):
    res = MomentumShortStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is False


# --- reversal_long (counter-trend mean-reversion) ---------------------------

def test_reversal_long_triggers_on_oversold(oversold_df):
    res = ReversalLongStrategy().evaluate("TEST", oversold_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_reversal_long_no_trigger_on_flat(flat_df):
    res = ReversalLongStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_reversal_long_no_trigger_on_uptrend(uptrend_df):
    # A clean uptrend is neither oversold nor at the lower band.
    res = ReversalLongStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is False


# --- reversal_short (counter-trend mean-reversion) --------------------------

def test_reversal_short_triggers_on_overbought(overbought_df):
    res = ReversalShortStrategy().evaluate("TEST", overbought_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_reversal_short_no_trigger_on_flat(flat_df):
    res = ReversalShortStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_reversal_short_no_trigger_on_downtrend(downtrend_df):
    # A clean downtrend is neither overbought nor at the upper band.
    res = ReversalShortStrategy().evaluate("TEST", downtrend_df)
    assert res.triggered is False


# --- reversal SELECTIVITY (boundary) gates -----------------------------------
# Prove the reversal strategies are SELECTIVE: they must NOT fire when conditions
# are CLOSE but not met (RSI just on the safe side of the threshold AND close just
# inside the band). This guards against a "the test only proves an extreme cliff
# trips it" weakness — an over-eager strategy that fired here would be caught.

def test_reversal_long_selective_near_boundary(near_oversold_df):
    # RSI ~32.6 (just ABOVE the 30 floor) and close just ABOVE the lower band ->
    # both gates narrowly fail -> reversal_long must NOT fire.
    res = ReversalLongStrategy().evaluate("TEST", near_oversold_df)
    assert res.triggered is False


def test_reversal_short_selective_near_boundary(near_overbought_df):
    # RSI ~69.5 (just BELOW the 70 ceiling) and close just BELOW the upper band ->
    # both gates narrowly fail -> reversal_short must NOT fire.
    res = ReversalShortStrategy().evaluate("TEST", near_overbought_df)
    assert res.triggered is False


# ===========================================================================
# BATCH 5 — new bidirectional strategies. Each is tested for BOTH directions on
# dedicated analytic trigger fixtures (exact direction asserted) plus a no-fire
# case on a flat/choppy series.
# ===========================================================================

# --- macd_signal ------------------------------------------------------------

def test_macd_signal_bullish_cross_long(macd_bull_cross_df):
    res = MACDSignalStrategy().evaluate("TEST", macd_bull_cross_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_macd_signal_bearish_cross_short(macd_bear_cross_df):
    res = MACDSignalStrategy().evaluate("TEST", macd_bear_cross_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_macd_signal_no_trigger_on_flat(flat_df):
    res = MACDSignalStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# --- bollinger_squeeze ------------------------------------------------------

def test_bollinger_squeeze_breakout_up_long(squeeze_breakout_up_df):
    res = BollingerSqueezeStrategy().evaluate("TEST", squeeze_breakout_up_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_bollinger_squeeze_breakout_down_short(squeeze_breakout_down_df):
    res = BollingerSqueezeStrategy().evaluate("TEST", squeeze_breakout_down_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_bollinger_squeeze_no_trigger_on_flat(flat_df):
    # flat_df is only 80 bars but never breaks out -> no squeeze breakout.
    res = BollingerSqueezeStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_bollinger_squeeze_no_trigger_on_uptrend(uptrend_df):
    # A steady uptrend has wide, non-contracting bands -> no squeeze.
    res = BollingerSqueezeStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is False


# --- adx_trend --------------------------------------------------------------

def test_adx_trend_plus_di_cross_long(adx_bull_cross_df):
    res = ADXTrendStrategy().evaluate("TEST", adx_bull_cross_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_adx_trend_minus_di_cross_short(adx_bear_cross_df):
    res = ADXTrendStrategy().evaluate("TEST", adx_bear_cross_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_adx_trend_no_trigger_on_flat(flat_df):
    # A choppy series has weak ADX (no strong trend) -> must NOT fire.
    res = ADXTrendStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# --- volume_surge -----------------------------------------------------------

def test_volume_surge_up_day_long(volume_surge_up_df):
    res = VolumeSurgeStrategy().evaluate("TEST", volume_surge_up_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_volume_surge_down_day_short(volume_surge_down_df):
    res = VolumeSurgeStrategy().evaluate("TEST", volume_surge_down_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_volume_surge_no_trigger_on_flat(flat_df):
    # flat_df volume wobbles only slightly -> z-score never exceeds 3.
    res = VolumeSurgeStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# --- rsi_divergence (strategy) ----------------------------------------------

def test_rsi_divergence_bullish_long(bullish_divergence_df):
    res = RSIDivergenceStrategy().evaluate("TEST", bullish_divergence_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_rsi_divergence_bearish_short(bearish_divergence_df):
    res = RSIDivergenceStrategy().evaluate("TEST", bearish_divergence_df)
    assert res.triggered is True
    assert res.direction == "SHORT"
    assert 0.0 <= res.confidence <= 1.0


def test_rsi_divergence_no_trigger_on_clean_uptrend(uptrend_df):
    # A clean uptrend has no two-swing price/RSI divergence -> must NOT fire.
    res = RSIDivergenceStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is False


def test_rsi_divergence_no_trigger_on_flat(flat_df):
    res = RSIDivergenceStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# ===========================================================================
# Improved rsi_divergence INDICATOR — two-swing slope comparison, selectivity.
# ===========================================================================

def test_rsi_divergence_indicator_detects_bullish(bullish_divergence_df):
    close = bullish_divergence_df["close"]
    rsi_vals = rsi(close, 14)
    div = rsi_divergence(close, rsi_vals, lookback=20)
    assert div["bullish"] is True
    assert div["bearish"] is False


def test_rsi_divergence_indicator_detects_bearish(bearish_divergence_df):
    close = bearish_divergence_df["close"]
    rsi_vals = rsi(close, 14)
    div = rsi_divergence(close, rsi_vals, lookback=20)
    assert div["bearish"] is True
    assert div["bullish"] is False


def test_rsi_divergence_indicator_selective_on_clean_uptrend(uptrend_df):
    # A clean uptrend (price higher-highs WITH RSI higher-highs) has NO regular
    # divergence -> both flags must be False (selectivity, not over-firing).
    close = uptrend_df["close"]
    rsi_vals = rsi(close, 14)
    div = rsi_divergence(close, rsi_vals, lookback=20)
    assert div["bullish"] is False
    assert div["bearish"] is False


def test_rsi_divergence_indicator_selective_on_clean_downtrend(downtrend_df):
    close = downtrend_df["close"]
    rsi_vals = rsi(close, 14)
    div = rsi_divergence(close, rsi_vals, lookback=20)
    assert div["bullish"] is False
    assert div["bearish"] is False


# ===========================================================================
# BATCH 5 — NEAR-BOUNDARY SELECTIVITY gates (KL-1 resolution).
# Each test proves that the strategy is SELECTIVE: it must NOT fire when the
# trigger ingredient is CLOSE but not met. These complement the golden-fixture
# tests above (which prove the strategies DO fire on full-strength signals).
# ===========================================================================

def test_macd_signal_no_fire_near_boundary(near_macd_df):
    # MACD line is one bar short of the bullish cross (prev (macd-signal) ≈ -0.025
    # on the final bar). Neither bullish_cross nor bearish_cross is True.
    res = MACDSignalStrategy().evaluate("TEST", near_macd_df)
    assert res.triggered is False


def test_bollinger_squeeze_no_fire_near_boundary(near_squeeze_df):
    # Squeeze coil present (was_squeezed=True) but final close (+0.03%) stays
    # inside the tight Bollinger bands — breakout_up and breakout_down both False.
    res = BollingerSqueezeStrategy().evaluate("TEST", near_squeeze_df)
    assert res.triggered is False


def test_adx_trend_no_fire_near_boundary(near_adx_df):
    # Strong ADX (>> 30) from a 50-bar downtrend, but only 5 bars of recovery —
    # the +DI/-DI cross needs ~12 bars; bull_cross=False on the final bar.
    res = ADXTrendStrategy().evaluate("TEST", near_adx_df)
    assert res.triggered is False


def test_volume_surge_no_fire_near_boundary(near_volume_surge_df):
    # Final bar has 4M volume (4x normal) but a prior 5M spike in the 20-bar
    # window inflates the rolling std, pushing z ≈ 2.43 below the 3.0 floor.
    res = VolumeSurgeStrategy().evaluate("TEST", near_volume_surge_df)
    assert res.triggered is False


def test_rsi_divergence_no_fire_near_boundary(near_rsi_divergence_df):
    # Two genuine swing lows where both price AND RSI make lower lows — no RSI
    # improvement while price falls — so bullish=False. Swing highs show price
    # lower high (bounce < rally) so bearish=False. Neither fires.
    res = RSIDivergenceStrategy().evaluate("TEST", near_rsi_divergence_df)
    assert res.triggered is False
