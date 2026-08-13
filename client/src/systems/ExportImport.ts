import type { ItemId } from "./Inventory";
import { parseCounts } from "./SaveSlots";
import type { PlacedBuilding } from "../net/types";

export type ExportedSaveFile = {
  version: 1;
  slot: number;
  savedAt: number;
  counts: Record<ItemId, number>;
  hp: number;
  buildings: PlacedBuilding[];
};

const MAX_IMPORTED_BUILDINGS = 5000;

export function buildExportFile(
  slot: number,
  counts: Readonly<Record<ItemId, number>>,
  hp: number,
  buildings: readonly PlacedBuilding[],
): ExportedSaveFile {
  return {
    version: 1,
    slot,
    savedAt: Date.now(),
    counts: { ...counts },
    hp,
    buildings: [...buildings],
  };
}

function isValidBuildingList(value: unknown): value is PlacedBuilding[] {
  if (!Array.isArray(value) || value.length > MAX_IMPORTED_BUILDINGS) return false;
  return value.every(
    (b) =>
      typeof b === "object" &&
      b !== null &&
      typeof (b as PlacedBuilding).id === "string" &&
      typeof (b as PlacedBuilding).buildingType === "string" &&
      Number.isFinite((b as PlacedBuilding).x) &&
      Number.isFinite((b as PlacedBuilding).y),
  );
}

/** エクスポートされたJSONファイルの中身を検証する。不正なら null を返す */
export function parseImportFile(raw: string): ExportedSaveFile | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ExportedSaveFile>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.slot !== "number" || !Number.isInteger(parsed.slot)) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (typeof parsed.hp !== "number" || !Number.isFinite(parsed.hp)) return null;
    const counts = parseCounts(parsed.counts);
    if (!counts) return null;
    if (!isValidBuildingList(parsed.buildings)) return null;
    return { version: 1, slot: parsed.slot, savedAt: parsed.savedAt, counts, hp: parsed.hp, buildings: parsed.buildings };
  } catch {
    return null;
  }
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
