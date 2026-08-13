import type { ItemId } from "./Inventory";
import type { WeaponId } from "./Equipment";

export type BuildingType = "fence" | "well" | "flower_bed" | "signpost" | "storage_shed" | "farm_plot";

export type RecipeEffect =
  | { type: "building"; buildingType: BuildingType }
  | { type: "weapon"; weaponId: WeaponId };

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
    id: "farm_plot",
    name: "畑",
    inputs: { wood: 2, stone: 1 },
    effect: { type: "building", buildingType: "farm_plot" },
  },
  {
    id: "wooden_sword",
    name: "木の剣",
    inputs: { wood: 3 },
    effect: { type: "weapon", weaponId: "wooden_sword" },
  },
  {
    id: "stone_sword",
    name: "石の剣",
    inputs: { wood: 1, stone: 3 },
    effect: { type: "weapon", weaponId: "stone_sword" },
  },
];
