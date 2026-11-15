/**
 * Online services boundary. Everything the future server will provide goes
 * through this interface; today it is backed by an offline stub.
 *
 * Planned server responsibilities:
 *  - accounts + cloud save (replace LocalSaveStore)
 *  - leaderboards (rush score, clock times, daily solve time)
 *  - daily puzzle global stats (% of players solved, average moves)
 *  - store receipts validation (Capacitor in-app purchases)
 */
export interface ScoreEntry {
  name: string;
  value: number;
}

export interface Backend {
  readonly online: boolean;
  submitScore(board: string, value: number): Promise<void>;
  topScores(board: string): Promise<ScoreEntry[]>;
  /** Validate an in-app purchase receipt; returns granted product ids. */
  redeemPurchase(productId: string, receipt: string): Promise<string[]>;
}

export class OfflineBackend implements Backend {
  readonly online = false;
  async submitScore() {}
  async topScores(): Promise<ScoreEntry[]> {
    return [];
  }
  async redeemPurchase(): Promise<string[]> {
    throw new Error('Purchases require the online service');
  }
}

export const backend: Backend = new OfflineBackend();
