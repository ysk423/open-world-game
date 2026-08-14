import type { ItemId } from "./Inventory";

export type StatsSnapshot = {
  itemsGathered: Record<ItemId, number>;
  monstersDefeated: number;
  rareMonstersDefeated: number;
  animalsDefeated: number;
};

const STATS_STORAGE_KEY = "open-world-game:stats";

function emptySnapshot(): StatsSnapshot {
  return {
    itemsGathered: {
      wood: 0,
      stone: 0,
      herb: 0,
      coin: 0,
      seed: 0,
      crop: 0,
      meat: 0,
      seed_wheat: 0,
      wheat: 0,
    },
    monstersDefeated: 0,
    rareMonstersDefeated: 0,
    animalsDefeated: 0,
  };
}

type Listener = (snapshot: Readonly<StatsSnapshot>) => void;

/**
 * ポケモンの図鑑を参考にした、生涯累計の収集・討伐記録。ゲーム進行そのものには影響しない
 * 「やりこみ」要素で、リセットしても消えない(拠点のリセットとは別物として扱う)。
 */
export class Stats {
  private snapshot: StatsSnapshot = emptySnapshot();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StatsSnapshot>;
      const next = emptySnapshot();
      if (parsed.itemsGathered && typeof parsed.itemsGathered === "object") {
        for (const id of Object.keys(next.itemsGathered) as ItemId[]) {
          const value = parsed.itemsGathered[id];
          if (typeof value === "number" && Number.isFinite(value)) next.itemsGathered[id] = value;
        }
      }
      for (const key of ["monstersDefeated", "rareMonstersDefeated", "animalsDefeated"] as const) {
        const value = parsed[key];
        if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
      }
      this.snapshot = next;
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.snapshot));
  }

  recordGather(itemId: ItemId, amount: number): void {
    this.snapshot.itemsGathered[itemId] += amount;
    this.save();
    this.notify();
  }

  recordMonsterDefeat(isRare: boolean): void {
    this.snapshot.monstersDefeated += 1;
    if (isRare) this.snapshot.rareMonstersDefeated += 1;
    this.save();
    this.notify();
  }

  recordAnimalDefeat(): void {
    this.snapshot.animalsDefeated += 1;
    this.save();
    this.notify();
  }

  getSnapshot(): Readonly<StatsSnapshot> {
    return this.snapshot;
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.snapshot);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
