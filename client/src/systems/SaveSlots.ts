import type { ItemId } from "./Inventory";
import { SAVE_SLOT_COUNT } from "../net/types";

export { SAVE_SLOT_COUNT };

export type SlotData = {
  counts: Record<ItemId, number>;
  hp: number;
  savedAt: number;
};

const ITEM_IDS: ItemId[] = ["wood", "stone", "herb"];

function slotKey(slot: number): string {
  return `open-world-game:save-slot-${slot}`;
}

/** 個人データ(インベントリ・HP)をスロットに保存する。拠点の建物はサーバー側で別途保存される */
export function saveSlot(slot: number, counts: Readonly<Record<ItemId, number>>, hp: number): void {
  const data: SlotData = { counts: { ...counts }, hp, savedAt: Date.now() };
  localStorage.setItem(slotKey(slot), JSON.stringify(data));
}

export function loadSlot(slot: number): SlotData | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SlotData>;
    if (typeof parsed.savedAt !== "number" || typeof parsed.hp !== "number" || !parsed.counts) {
      return null;
    }
    const counts = { wood: 0, stone: 0, herb: 0 };
    for (const id of ITEM_IDS) {
      const value = parsed.counts[id];
      if (typeof value === "number" && Number.isFinite(value)) counts[id] = value;
    }
    return { counts, hp: parsed.hp, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}
