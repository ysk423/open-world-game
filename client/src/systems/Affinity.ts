const AFFINITY_STORAGE_KEY = "open-world-game:affinity";

// 牧場物語を参考にした「なかよし度」。この数の倍数に達するたびに特別なお礼がもらえる
export const AFFINITY_MILESTONE_STEP = 5;

type Listener = (affinity: Readonly<Record<string, number>>) => void;

/** NPC名ごとの「なかよし度」。クエスト達成後も贈り物を続けることで少しずつ上がる */
export class Affinity {
  private points: Record<string, number> = {};
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(AFFINITY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) return;
      for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
          this.points[name] = value;
        }
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(AFFINITY_STORAGE_KEY, JSON.stringify(this.points));
  }

  getPoints(npcName: string): number {
    return this.points[npcName] ?? 0;
  }

  /** 1ポイント加算する。ちょうど節目(5の倍数)に達した場合はtrueを返す */
  add(npcName: string): boolean {
    const next = this.getPoints(npcName) + 1;
    this.points[npcName] = next;
    this.save();
    this.notify();
    return next % AFFINITY_MILESTONE_STEP === 0;
  }

  reset(): void {
    this.points = {};
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.points);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.points);
  }
}
