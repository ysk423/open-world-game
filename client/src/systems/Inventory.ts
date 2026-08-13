export type ItemId = "wood" | "stone" | "herb";

const STORAGE_KEY = "open-world-game:inventory";
const ITEM_IDS: ItemId[] = ["wood", "stone", "herb"];

type Counts = Record<ItemId, number>;
type Listener = (counts: Readonly<Counts>) => void;

function emptyCounts(): Counts {
  return { wood: 0, stone: 0, herb: 0 };
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
