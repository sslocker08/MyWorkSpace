import { Badge, Button, Card } from "@mwstudio/ui";
import { FeedbackWidget } from "@mwstudio/feedback/widget";
import type { FeedbackClient } from "@mwstudio/feedback";
import { useAnalytics, usePageView } from "@mwstudio/analytics/react";
import { engines, flagships, MODEL_LABEL, type BillingModel } from "./products";

const APP_VERSION = "0.1.0";

const modelVariant: Record<BillingModel, "accent" | "success" | "warning" | "neutral"> = {
  OT: "accent",
  SUB: "success",
  FRE: "warning",
  MKT: "neutral",
};

export interface AppProps {
  /** Injected so tests can assert submissions; main.tsx provides a real one. */
  feedbackClient: FeedbackClient;
}

/**
 * Portfolio house site. Proves the Wave 0 shared layer composes end-to-end:
 * it skins itself with @mwstudio/ui primitives + tokens and mounts the
 * @mwstudio/feedback widget so any visitor can file an in-tool request.
 */
export function App({ feedbackClient }: AppProps) {
  const analytics = useAnalytics();
  usePageView("/");

  return (
    <div className="house">
      <header className="house__bar">
        <strong className="house__brand">MyWorkSpace Studio</strong>
        <FeedbackWidget
          client={feedbackClient}
          productId="house"
          appVersion={APP_VERSION}
          featureId="home"
          onSubmitted={(id) =>
            analytics.track("feedback_submitted", { feedbackId: id })
          }
        />
      </header>

      <main>
        <section className="house__hero">
          <h1>競合が少ない、ニッチを撃ち抜く。</h1>
          <p>
            既存製品が古い／専用ツールが無いニッチに、エンジン共有型で最高品質の
            プロダクトを量産する工房。
          </p>
          <Button
            intent="primary"
            size="lg"
            onClick={() => analytics.track("cta_click", { id: "hero-portfolio" })}
          >
            ポートフォリオを見る
          </Button>
        </section>

        <section className="house__section" aria-labelledby="engines-h">
          <h2 id="engines-h">6つの再利用エンジン</h2>
          <div className="house__grid">
            {engines.map((e) => (
              <Card key={e.key}>
                <Card.Header>{e.name}</Card.Header>
                <Card.Body>{e.blurb}</Card.Body>
              </Card>
            ))}
          </div>
        </section>

        <section className="house__section" aria-labelledby="flagships-h">
          <h2 id="flagships-h">Wave 1 旗艦プロダクト</h2>
          <div className="house__grid">
            {flagships.map((f) => (
              <Card key={f.name}>
                <Card.Header>
                  <span>{f.name}</span>
                </Card.Header>
                <Card.Body>
                  <p>{f.wedge}</p>
                  <div className="house__tags">
                    <Badge variant="outline">{f.engine}</Badge>
                    <Badge variant={modelVariant[f.model]}>
                      {MODEL_LABEL[f.model]}
                    </Badge>
                    <Badge variant="neutral">機会 {f.score}/5</Badge>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="house__footer">
        <p>
          改善要望はヘッダの「💡 リクエスト」から。すぐ反映します。
        </p>
      </footer>
    </div>
  );
}
