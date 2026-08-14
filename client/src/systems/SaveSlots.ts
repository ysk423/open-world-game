import type { ItemId } from "./Inventory";
import { SAVE_SLOT_COUNT } from "../net/types";

export { SAVE_SLOT_COUNT };

export type SlotData = {
  counts: Record<ItemId, number>;
  hp: number;
  savedAt: number;
};

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
];

function slotKey(slot: number): string {
  return `open-world-game:save-slot-${slot}`;
}

/** 個人データ(インベントリ・HP)をスロットに保存する。拠点の建物はサーバー側で別途保存される */
export function saveSlot(slot: number, counts: Readonly<Record<ItemId, number>>, hp: number): void {
  const data: SlotData = { counts: { ...counts }, hp, savedAt: Date.now() };
  localStorage.setItem(slotKey(slot), JSON.stringify(data));
}

export function deleteSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot));
}

/** 個数データの妥当性を検証し、正規化して返す。不正な値は0として扱う */
export function parseCounts(raw: unknown): Record<ItemId, number> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Partial<Record<ItemId, number>>;
  const counts = {
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
  };
  for (const id of ITEM_IDS) {
    const value = source[id];
    if (typeof value === "number" && Number.isFinite(value)) counts[id] = value;
  }
  return counts;
}

export function loadSlot(slot: number): SlotData | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SlotData>;
    if (typeof parsed.savedAt !== "number" || typeof parsed.hp !== "number" || !parsed.counts) {
      return null;
    }
    const counts = parseCounts(parsed.counts);
    if (!counts) return null;
    return { counts, hp: parsed.hp, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}
