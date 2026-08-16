import type { ItemId } from "./Inventory";

const STORAGE_KEY = "open-world-game:storage-shed";

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
  "milk",
  "seed_tomato",
  "tomato",
  "cooked_fish",
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
    milk: 0,
    seed_tomato: 0,
    tomato: 0,
    cooked_fish: 0,
  };
}

/**
 * マインクラフトの宝箱を参考にした個人の倉庫。持ち物と違い「ゲームをリセット」しても
 * 中身は消えない(倉庫の建物自体は他の建物と同様に更地に戻るが、預けた中身は別に保管される)。
 */
export class Storage {
  private counts: Counts = emptyCounts();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.counts));
  }

  add(itemId: ItemId, amount = 1): void {
    this.counts[itemId] += amount;
    this.save();
    this.notify();
  }

  canAfford(costs: Partial<Counts>): boolean {
    return (Object.entries(costs) as [ItemId, number][]).every(
      ([id, amount]) => this.counts[id] >= amount,
    );
  }

  /** 引き出し可能な場合のみ差し引いてtrueを返す */
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

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.counts);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.counts);
  }
}
