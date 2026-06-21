import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DefaultFeedbackClient } from "@mwstudio/feedback";
import "@mwstudio/ui/styles.css";
import "./house.css";
import { App } from "./App";

const el = document.getElementById("root");
if (!el) throw new Error("#root not found");

// Wave 0: in-memory client. Wired to the real backend FeedbackStore later.
const feedbackClient = new DefaultFeedbackClient();

createRoot(el).render(
  <StrictMode>
    <App feedbackClient={feedbackClient} />
  </StrictMode>,
);
