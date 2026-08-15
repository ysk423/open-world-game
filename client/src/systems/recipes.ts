import type { ItemId } from "./Inventory";
import type { WeaponId } from "./Equipment";
import type { ToolId } from "./Tools";

export type BuildingType =
  | "fence"
  | "well"
  | "flower_bed"
  | "signpost"
  | "storage_shed"
  | "farm_plot"
  | "rock"
  | "bridge"
  | "torch"
  | "bed";

export type RecipeEffect =
  | { type: "building"; buildingType: BuildingType }
  | { type: "weapon"; weaponId: WeaponId }
  | { type: "tool"; toolId: ToolId }
  | { type: "item"; itemId: ItemId; amount: number };

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
    id: "rock",
    name: "石を置く",
    inputs: { stone: 1 },
    effect: { type: "building", buildingType: "rock" },
  },
  {
    id: "bridge",
    name: "橋(向いている水面に架ける)",
    inputs: { wood: 3 },
    effect: { type: "building", buildingType: "bridge" },
  },
  {
    id: "cooked_meat",
    name: "焚き火で肉を焼く(売値アップ)",
    inputs: { meat: 1 },
    effect: { type: "item", itemId: "cooked_meat", amount: 1 },
  },
  {
    id: "torch",
    name: "たいまつ(夜、周囲を明るくする)",
    inputs: { wood: 2 },
    effect: { type: "building", buildingType: "torch" },
  },
  {
    id: "bed",
    name: "ベッド(使うと復帰地点になる)",
    inputs: { wood: 4 },
    effect: { type: "building", buildingType: "bed" },
  },
  {
    id: "axe",
    name: "斧(木の採集量+1)",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "tool", toolId: "axe" },
  },
  {
    id: "pickaxe",
    name: "つるはし(石の採集量+1)",
    inputs: { wood: 1, stone: 4 },
    effect: { type: "tool", toolId: "pickaxe" },
  },
  {
    id: "watering_can",
    name: "じょうろ(畑に水をあげて成長を早める)",
    inputs: { wood: 2, stone: 1 },
    effect: { type: "tool", toolId: "wateringCan" },
  },
  {
    id: "bicycle",
    name: "自転車(スタミナを消費せずダッシュし続けられる)",
    inputs: { wood: 5, stone: 2 },
    effect: { type: "tool", toolId: "bicycle" },
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
