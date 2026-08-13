import type { ItemId } from "./Inventory";

export type BuildingType = "fence" | "well" | "flower_bed" | "signpost" | "storage_shed";

export type RecipeEffect =
  | { type: "building"; buildingType: BuildingType }
  | { type: "unlock_chunk"; chunkId: string };

export type Recipe = {
  id: string;
  name: string;
  inputs: Partial<Record<ItemId, number>>;
  effect: RecipeEffect;
};

export const RECIPES: Recipe[] = [
  {
    id: "fence",
    name: "柵",
    inputs: { wood: 2 },
    effect: { type: "building", buildingType: "fence" },
  },
  {
    id: "well",
    name: "井戸",
    inputs: { stone: 2 },
    effect: { type: "building", buildingType: "well" },
  },
  {
    id: "flower_bed",
    name: "花壇",
    inputs: { herb: 2 },
    effect: { type: "building", buildingType: "flower_bed" },
  },
  {
    id: "signpost",
    name: "道しるべ",
    inputs: { wood: 1, stone: 1 },
    effect: { type: "building", buildingType: "signpost" },
  },
  {
    id: "storage_shed",
    name: "倉庫",
    inputs: { wood: 2, herb: 1 },
    effect: { type: "building", buildingType: "storage_shed" },
  },
  {
    id: "north_bridge",
    name: "北への道",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "unlock_chunk", chunkId: "chunk-north" },
  },
  {
    id: "east_bridge",
    name: "東への道",
    inputs: { stone: 3, wood: 1 },
    effect: { type: "unlock_chunk", chunkId: "chunk-east" },
  },
];
