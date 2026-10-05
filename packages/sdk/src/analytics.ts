/** Self-measurement for debug mode — tracks the SDK's own processing cost. */
export class SdkAnalytics {
  private _totalEvents = 0;
  private _totalProcessingMs = 0;
  private _batchesSent = 0;
  private _evicted = 0;

  recordEvent(processingMs: number): void {
    this._totalEvents++;
    this._totalProcessingMs += processingMs;
  }

  recordBatch(eventCount: number): void {
    this._batchesSent++;
    if (this._batchesSent % 5 === 0) {
      const avg = this._totalEvents > 0
        ? (this._totalProcessingMs / this._totalEvents).toFixed(3)
        : '0';
      console.log(
        `[BioSDK] perf — events: ${this._totalEvents}, avg processing: ${avg} ms/event, batches: ${this._batchesSent}, evicted: ${this._evicted}`,
      );
    }
    // Suppress "unused" warning
    void eventCount;
  }

  recordEviction(count: number): void {
    this._evicted += count;
  }

  get report() {
    return {
      totalEvents: this._totalEvents,
      avgProcessingMs: this._totalEvents > 0 ? this._totalProcessingMs / this._totalEvents : 0,
      batchesSent: this._batchesSent,
      evicted: this._evicted,
    };
  }
}
