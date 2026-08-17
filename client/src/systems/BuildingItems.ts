import { BUILDING_TYPES } from "./recipes";
import type { BuildingType } from "./recipes";

const BUILDING_ITEMS_STORAGE_KEY = "open-world-game:building-items";

type Counts = Record<BuildingType, number>;
type Listener = (counts: Readonly<Counts>) => void;

function emptyCounts(): Counts {
  const counts = {} as Counts;
  for (const type of BUILDING_TYPES) counts[type] = 0;
  return counts;
}

/**
 * クラフトした建物は即座にワールドへ配置されるのではなく、いったんこの「持ち物」に入る。
 * 実際の配置はBuildingItemsPanelの「設置」操作で行う(作る→アイテム化→使う、の2段階)。
 * Inventoryと同じCountsパターンだが、素材(ItemId)とは別の名前空間として扱う。
 */
export class BuildingItems {
  private counts: Counts = emptyCounts();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(BUILDING_ITEMS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Counts>;
      for (const type of BUILDING_TYPES) {
        const value = parsed[type];
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
          this.counts[type] = value;
        }
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(BUILDING_ITEMS_STORAGE_KEY, JSON.stringify(this.counts));
  }

  add(buildingType: BuildingType, amount = 1): void {
    this.counts[buildingType] += amount;
    this.save();
    this.notify();
  }

  /** 所持数が足りる場合のみ差し引いてtrueを返す。不足していればfalseで何も変えない */
  spend(buildingType: BuildingType, amount = 1): boolean {
    if (this.counts[buildingType] < amount) return false;
    this.counts[buildingType] -= amount;
    this.save();
    this.notify();
    return true;
  }

  getCounts(): Readonly<Counts> {
    return this.counts;
  }

  reset(): void {
    this.counts = emptyCounts();
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.counts);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.counts);
  }
}
