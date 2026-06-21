import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DefaultFeedbackClient } from "@mwstudio/feedback";
import { Analytics, ConsoleSink } from "@mwstudio/analytics";
import { AnalyticsProvider } from "@mwstudio/analytics/react";
import "@mwstudio/ui/styles.css";
import "./house.css";
import { App } from "./App";

const el = document.getElementById("root");
if (!el) throw new Error("#root not found");

// Wave 0: in-memory feedback + console analytics sink. Both swap for real
// backends (FeedbackStore / CDP sink) without touching components.
const feedbackClient = new DefaultFeedbackClient();
const analytics = new Analytics({
  productId: "house",
  appVersion: "0.1.0",
  sink: new ConsoleSink(),
});

createRoot(el).render(
  <StrictMode>
    <AnalyticsProvider analytics={analytics}>
      <App feedbackClient={feedbackClient} />
    </AnalyticsProvider>
  </StrictMode>,
);
