import type { AnalyticsEvent, AnalyticsSink } from "./types";

/** Collects events in memory — for tests and local inspection. */
export class InMemorySink implements AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];
  record(event: AnalyticsEvent): void {
    this.events.push(event);
  }
  byName(name: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.name === name);
  }
  clear(): void {
    this.events.length = 0;
  }
}

/** Drops everything. Useful as a safe default before a real sink is wired. */
export class NoopSink implements AnalyticsSink {
  record(): void {}
}

/** Logs events — handy in development. */
export class ConsoleSink implements AnalyticsSink {
  constructor(private readonly log: (...args: unknown[]) => void = console.debug) {}
  record(event: AnalyticsEvent): void {
    this.log(`[analytics] ${event.name}`, event.props);
  }
}

/** Fans an event out to several sinks (e.g. console + warehouse). */
export class MultiSink implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}
  async record(event: AnalyticsEvent): Promise<void> {
    await Promise.all(this.sinks.map((s) => s.record(event)));
  }
}
