export type ItemId =
  | "wood"
  | "stone"
  | "herb"
  | "coin"
  | "seed"
  | "crop"
  | "meat"
  | "seed_wheat"
  | "wheat"
  | "cooked_meat"
  | "fish";

export const INVENTORY_STORAGE_KEY = "open-world-game:inventory";
const ITEM_IDS: ItemId[] = [
  "wood",
  "stone",
  "herb",
  "coin",
  "seed",
  "crop",
  "meat",
  "seed_wheat",
  "wheat",
  "cooked_meat",
  "fish",
];

type Counts = Record<ItemId, number>;
type Listener = (counts: Readonly<Counts>) => void;

function emptyCounts(): Counts {
  return {
    wood: 0,
    stone: 0,
    herb: 0,
    coin: 0,
    seed: 0,
    crop: 0,
    meat: 0,
    seed_wheat: 0,
    wheat: 0,
    cooked_meat: 0,
    fish: 0,
  };
}

/** 個人インベントリ。localStorageに永続化し、リロードしても保持される */
export class Inventory {
  private counts: Counts = emptyCounts();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Counts>;
      for (const id of ITEM_IDS) {
        const value = parsed[id];
        if (typeof value === "number" && Number.isFinite(value)) {
          this.counts[id] = value;
        }
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(this.counts));
  }

  add(itemId: ItemId, amount = 1): void {
    this.counts[itemId] += amount;
    this.save();
    this.notify();
  }

  reset(): void {
    this.counts = emptyCounts();
    this.save();
    this.notify();
  }

  /** セーブデータからの復元用。不正な値は0として扱う */
  setCounts(counts: Partial<Counts>): void {
    const next = emptyCounts();
    for (const id of ITEM_IDS) {
      const value = counts[id];
      if (typeof value === "number" && Number.isFinite(value)) {
        next[id] = value;
      }
    }
    this.counts = next;
    this.save();
    this.notify();
  }

  canAfford(costs: Partial<Counts>): boolean {
    return (Object.entries(costs) as [ItemId, number][]).every(
      ([id, amount]) => this.counts[id] >= amount,
    );
  }

  /** 支払い可能な場合のみ差し引いてtrueを返す。不足していればfalseで何も変えない */
  spend(costs: Partial<Counts>): boolean {
    if (!this.canAfford(costs)) return false;
    for (const [id, amount] of Object.entries(costs) as [ItemId, number][]) {
      this.counts[id] -= amount;
    }
    this.save();
    this.notify();
    return true;
  }

  getCounts(): Readonly<Counts> {
    return this.counts;
  }

  /** 登録時に現在値で一度呼ばれ、以後変化のたびに呼ばれる */
  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.counts);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.counts);
  }
}
