"use client";

import { useEffect, useState } from "react";

interface TopSignal {
  ticker: string;
  direction: string;
  score: number;
}

interface DailyDigest {
  ceiling_score: number;
  regime: string;
  top_signals: TopSignal[];
  macro_summary: string;
  risk_warnings: string[];
}

interface NewsSentiment {
  score: number;
  sentiment: string;
  ticker: string;
}

export default function IntelligencePage() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);

  const [newsTicker, setNewsTicker] = useState("");
  const [newsHeadline, setNewsHeadline] = useState("");
  const [newsResult, setNewsResult] = useState<NewsSentiment | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/digest")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setDigest(data);
        setDigestLoading(false);
      })
      .catch((e) => {
        setDigestError(e.message);
        setDigestLoading(false);
      });
  }, []);

  const handleNewsSentiment = async () => {
    if (!newsTicker.trim() || !newsHeadline.trim()) return;
    setNewsLoading(true);
    setNewsError(null);
    setNewsResult(null);
    try {
      const params = new URLSearchParams({ headline: newsHeadline });
      const r = await fetch(
        `/api/intelligence/news/${encodeURIComponent(newsTicker.trim())}?${params}`
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setNewsResult(data);
    } catch (e: unknown) {
      setNewsError(e instanceof Error ? e.message : "Failed");
    } finally {
      setNewsLoading(false);
    }
  };

  const ceilingColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-yellow-500";
    return "text-green-500";
  };

  const sentimentColor = (s: string) => {
    if (s === "POSITIVE") return "text-green-400";
    if (s === "NEGATIVE") return "text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">LLM Intelligence</h1>

      {/* Daily Digest Card */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-300">Daily Market Digest</h2>
        {digestLoading && (
          <div className="bg-gray-900 rounded-lg p-4 text-gray-500">Loading digest...</div>
        )}
        {digestError && (
          <div className="bg-red-950 border border-red-700 rounded-lg p-4 text-red-300">
            {digestError === "HTTP 503"
              ? "Intelligence features require ANTHROPIC_API_KEY."
              : `Error: ${digestError}`}
          </div>
        )}
        {digest && (
          <div className="bg-gray-900 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Ceiling Score</p>
                <p className={`text-3xl font-bold ${ceilingColor(digest.ceiling_score)}`}>
                  {digest.ceiling_score.toFixed(1)}
                  <span className="text-sm text-gray-500 ml-1">/100</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Regime</p>
                <p className="text-xl font-semibold text-blue-400">{digest.regime}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Macro Summary</p>
              <p className="text-gray-200 leading-relaxed">{digest.macro_summary}</p>
            </div>

            {digest.risk_warnings.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Risk Warnings</p>
                <ul className="space-y-1">
                  {digest.risk_warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-yellow-300 text-sm">
                      <span className="mt-0.5">&#9888;</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {digest.top_signals.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top Signals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {digest.top_signals.map((s) => (
                    <div
                      key={s.ticker}
                      className="bg-gray-800 rounded p-2 text-center"
                    >
                      <p className="font-bold text-sm">{s.ticker}</p>
                      <p
                        className={`text-xs ${
                          s.direction === "LONG" ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {s.direction}
                      </p>
                      <p className="text-xs text-gray-400">{s.score.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* News Sentiment */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-gray-300">News Headline Sentiment</h2>
        <div className="bg-gray-900 rounded-lg p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Ticker (e.g. AAPL)"
              value={newsTicker}
              onChange={(e) => setNewsTicker(e.target.value.toUpperCase())}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Headline text..."
              value={newsHeadline}
              onChange={(e) => setNewsHeadline(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleNewsSentiment}
              disabled={newsLoading || !newsTicker.trim() || !newsHeadline.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              {newsLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {newsError && (
            <p className="text-red-400 text-sm">{newsError}</p>
          )}
          {newsResult && (
            <div className="bg-gray-800 rounded p-3 flex gap-6 items-center">
              <div>
                <p className="text-xs text-gray-500">Ticker</p>
                <p className="font-bold">{newsResult.ticker}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Score</p>
                <p className="text-xl font-bold">
                  {newsResult.score > 0 ? "+" : ""}
                  {newsResult.score.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sentiment</p>
                <p className={`font-semibold ${sentimentColor(newsResult.sentiment)}`}>
                  {newsResult.sentiment}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
