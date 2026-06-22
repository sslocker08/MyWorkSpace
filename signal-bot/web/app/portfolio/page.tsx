"use client";

import { useEffect, useState, useCallback } from "react";

interface Position {
  id: string;
  ticker: string;
  direction: string;
  score: number;
  entry_price: number;
  stop_loss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  risk_reward: number;
  regime: string | null;
  ceiling_score: number | null;
  created_at: string | null;
}

interface PnLPosition {
  ticker: string;
  direction: string;
  entry_price: number;
  current_price: number;
  unrealized_pnl_pct: number;
  score: number;
}

interface PnLSummary {
  positions: PnLPosition[];
  total_positions: number;
  avg_unrealized_pnl_pct: number;
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [pnl, setPnl] = useState<PnLSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchInput, setWatchInput] = useState("");
  const [watchLoading, setWatchLoading] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      const r = await fetch("/api/portfolio");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPositions(data.positions || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const r = await fetch("/api/portfolio/watchlist");
      if (!r.ok) return;
      const data = await r.json();
      setWatchlist(data.tickers || []);
    } catch {
      // watchlist is optional / Redis may be absent
    }
  }, []);

  const fetchPnL = async () => {
    setPnlLoading(true);
    try {
      const r = await fetch("/api/portfolio/pnl");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPnl(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load PnL");
    } finally {
      setPnlLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchWatchlist();
  }, [fetchPositions, fetchWatchlist]);

  const addWatch = async () => {
    const t = watchInput.trim().toUpperCase();
    if (!t) return;
    setWatchLoading(true);
    try {
      await fetch(`/api/portfolio/watch/${encodeURIComponent(t)}`, { method: "POST" });
      setWatchInput("");
      await fetchWatchlist();
    } catch {
      // best-effort
    } finally {
      setWatchLoading(false);
    }
  };

  const removeWatch = async (ticker: string) => {
    try {
      await fetch(`/api/portfolio/watch/${encodeURIComponent(ticker)}`, { method: "DELETE" });
      await fetchWatchlist();
    } catch {
      // best-effort
    }
  };

  const dirColor = (d: string) =>
    d === "LONG" ? "text-green-400" : "text-red-400";

  const pnlColor = (v: number) =>
    v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-gray-400";

  const pnlRow = pnl?.positions.find((p) => true); // just to access type

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>

      {/* Active Positions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-300">
            Active Positions
            {positions.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">({positions.length})</span>
            )}
          </h2>
          <button
            onClick={fetchPnL}
            disabled={pnlLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded px-3 py-1.5 text-sm transition-colors"
          >
            {pnlLoading ? "Loading PnL..." : "Refresh PnL"}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900 rounded-lg p-4 text-gray-500">Loading positions...</div>
        )}
        {error && (
          <div className="bg-red-950 border border-red-700 rounded-lg p-3 text-red-300 text-sm mb-3">
            {error}
          </div>
        )}
        {!loading && positions.length === 0 && (
          <div className="bg-gray-900 rounded-lg p-4 text-gray-500">
            No active positions with score &ge; 70.
          </div>
        )}

        {positions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-900 rounded-lg overflow-hidden">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="text-left px-4 py-3">Ticker</th>
                  <th className="text-left px-4 py-3">Dir</th>
                  <th className="text-right px-4 py-3">Score</th>
                  <th className="text-right px-4 py-3">Entry</th>
                  <th className="text-right px-4 py-3">Current</th>
                  <th className="text-right px-4 py-3">PnL %</th>
                  <th className="text-right px-4 py-3">RR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(pnl ? pnl.positions : positions.map((p) => ({
                  ticker: p.ticker,
                  direction: p.direction,
                  entry_price: p.entry_price,
                  current_price: p.entry_price,
                  unrealized_pnl_pct: 0,
                  score: p.score,
                }))).map((row) => {
                  const pos = positions.find((p) => p.ticker === row.ticker);
                  return (
                    <tr key={row.ticker} className="hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 font-bold">{row.ticker}</td>
                      <td className={`px-4 py-3 ${dirColor(row.direction)}`}>
                        {row.direction}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {row.score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        ${row.entry_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {pnl ? `$${row.current_price.toFixed(2)}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${pnl ? pnlColor(row.unrealized_pnl_pct) : "text-gray-600"}`}>
                        {pnl ? `${row.unrealized_pnl_pct > 0 ? "+" : ""}${row.unrealized_pnl_pct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {pos?.risk_reward.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pnl && (
          <div className="mt-3 flex gap-4 text-sm text-gray-400">
            <span>
              Avg PnL:{" "}
              <span className={pnlColor(pnl.avg_unrealized_pnl_pct)}>
                {pnl.avg_unrealized_pnl_pct > 0 ? "+" : ""}
                {pnl.avg_unrealized_pnl_pct.toFixed(2)}%
              </span>
            </span>
          </div>
        )}
      </section>

      {/* Watchlist */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300 mb-3">Watchlist</h2>
        <div className="bg-gray-900 rounded-lg p-5">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Add ticker..."
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addWatch()}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-36 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addWatch}
              disabled={watchLoading || !watchInput.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 rounded px-4 py-2 text-sm transition-colors"
            >
              Add
            </button>
          </div>

          {watchlist.length === 0 ? (
            <p className="text-gray-500 text-sm">No tickers in watchlist.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchlist.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1 bg-gray-800 rounded px-3 py-1.5"
                >
                  <span className="text-sm font-medium">{t}</span>
                  <button
                    onClick={() => removeWatch(t)}
                    className="ml-1 text-gray-500 hover:text-red-400 transition-colors text-xs"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
