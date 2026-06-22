"use client";

import { useState } from "react";

const STRATEGY_NAMES = [
  "EMACrossoverStrategy",
  "MomentumLongStrategy",
  "BreakoutLongStrategy",
  "BreakoutShortStrategy",
  "MomentumShortStrategy",
  "ReversalLongStrategy",
  "ReversalShortStrategy",
  "MACDSignalStrategy",
  "BollingerSqueezeStrategy",
  "ADXTrendStrategy",
  "VolumeSurgeStrategy",
  "RSIDivergenceStrategy",
];

interface BacktestResult {
  ticker: string;
  strategy: string;
  hold_bars: number;
  total_trades: number;
  win_rate: number;
  avg_return: number;
  sharpe: number;
  max_drawdown: number;
}

export default function BacktestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState(STRATEGY_NAMES[0]);
  const [holdBars, setHoldBars] = useState(10);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({
        ticker: ticker.trim().toUpperCase(),
        strategy_name: strategy,
        hold_bars: String(holdBars),
      });
      const r = await fetch(`/api/scanner/backtest?${params}`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({ detail: `HTTP ${r.status}` }));
        throw new Error(body.detail || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  const ratingColor = (winRate: number) => {
    if (winRate >= 0.55) return "text-green-400";
    if (winRate >= 0.4) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Backtest</h1>

      <div className="bg-gray-900 rounded-lg p-5 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:border-blue-500"
              placeholder="AAPL"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {STRATEGY_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("Strategy", "")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Hold Bars
            </label>
            <input
              type="number"
              value={holdBars}
              onChange={(e) => setHoldBars(Math.max(1, Math.min(252, Number(e.target.value))))}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-20 focus:outline-none focus:border-blue-500"
              min={1}
              max={252}
            />
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !ticker.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded px-5 py-2 text-sm font-medium transition-colors"
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-700 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-gray-900 rounded-lg p-5">
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {result.ticker} &mdash; {result.strategy} &mdash; {result.hold_bars} bar hold
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Metric</th>
                  <th className="text-right py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Total Trades</td>
                  <td className="py-2 text-right font-mono">{result.total_trades}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Win Rate</td>
                  <td className={`py-2 text-right font-mono ${ratingColor(result.win_rate)}`}>
                    {pct(result.win_rate)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Avg Return / Trade</td>
                  <td
                    className={`py-2 text-right font-mono ${
                      result.avg_return >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pct(result.avg_return)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Sharpe Ratio</td>
                  <td
                    className={`py-2 text-right font-mono ${
                      result.sharpe >= 1 ? "text-green-400" : result.sharpe >= 0 ? "text-yellow-400" : "text-red-400"
                    }`}
                  >
                    {result.sharpe.toFixed(3)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Max Drawdown</td>
                  <td className="py-2 text-right font-mono text-red-400">
                    {pct(result.max_drawdown)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <p className="text-gray-600 text-sm">
          Select a ticker and strategy, then click Run Backtest to see results.
        </p>
      )}
    </div>
  );
}
