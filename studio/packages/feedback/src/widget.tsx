// @mwstudio/feedback/widget — the in-tool feature-request form every Studio
// product mounts. One-click trigger → inline modal (no email), auto-captured
// screen context, submits via a FeedbackClient. Styling is intentionally
// minimal/unopinionated so each product's design system (packages/ui) skins it.
import { useId, useState } from "react";
import { captureContext } from "./context";
import { FeedbackValidationError, validateNewFeedback } from "./validation";
import { FEEDBACK_TYPES, type FeedbackClient, type FeedbackType } from "./types";

export interface FeedbackWidgetProps {
  client: FeedbackClient;
  productId: string;
  appVersion: string;
  /** Current feature/screen id, attached to the request context. */
  featureId?: string;
  /** Logged-in user id, if any. */
  userId?: string;
  /** Trigger label. Defaults to the lightbulb request affordance. */
  triggerLabel?: string;
  /** Called after a successful submit (e.g. to refresh a roadmap list). */
  onSubmitted?: (id: string) => void;
}

type Phase = "idle" | "submitting" | "done";

export function FeedbackWidget({
  client,
  productId,
  appVersion,
  featureId,
  userId,
  triggerLabel = "💡 リクエスト",
  onSubmitted,
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const bodyId = useId();

  function reset() {
    setType("feature");
    setBody("");
    setPhase("idle");
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      productId,
      type,
      body,
      context: captureContext(appVersion, featureId),
      ...(userId ? { userId } : {}),
    };
    try {
      validateNewFeedback(input);
    } catch (err) {
      setError(
        err instanceof FeedbackValidationError ? err.message : "入力エラー",
      );
      return;
    }
    setPhase("submitting");
    try {
      const item = await client.submit(input);
      setPhase("done");
      onSubmitted?.(item.id);
    } catch {
      setPhase("idle");
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    }
  }

  return (
    <div className="mwfeedback">
      <button
        type="button"
        className="mwfeedback__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="mwfeedback__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h2 id={titleId} className="mwfeedback__title">
            機能リクエスト・フィードバック
          </h2>

          {phase === "done" ? (
            <div className="mwfeedback__done">
              <p>ありがとうございます。リクエストを受け付けました。</p>
              <button type="button" onClick={close}>
                閉じる
              </button>
            </div>
          ) : (
            <form className="mwfeedback__form" onSubmit={handleSubmit}>
              <label className="mwfeedback__field">
                <span>種別</span>
                <select
                  aria-label="種別"
                  value={type}
                  onChange={(e) => setType(e.target.value as FeedbackType)}
                >
                  {FEEDBACK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mwfeedback__field" htmlFor={bodyId}>
                <span>内容</span>
              </label>
              <textarea
                id={bodyId}
                aria-label="内容"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="どんな機能・改善がほしいですか？"
              />

              {error && (
                <p className="mwfeedback__error" role="alert">
                  {error}
                </p>
              )}

              <div className="mwfeedback__actions">
                <button type="button" onClick={close}>
                  キャンセル
                </button>
                <button type="submit" disabled={phase === "submitting"}>
                  {phase === "submitting" ? "送信中…" : "送信"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
