import type { ItemId } from "./Inventory";
import type { WeaponId, ArmorId } from "./Equipment";
import type { ToolId } from "./Tools";

export type BuildingType =
  | "flower_bed"
  | "storage_shed"
  | "farm_plot"
  | "rock"
  | "torch"
  | "inn"
  | "shipping_bin"
  | "beehive"
  | "pet_box";

export type RecipeEffect =
  | { type: "building"; buildingType: BuildingType }
  | { type: "weapon"; weaponId: WeaponId }
  | { type: "tool"; toolId: ToolId }
  | { type: "item"; itemId: ItemId; amount: number }
  | { type: "armor"; armorId: ArmorId };

export type Recipe = {
  id: string;
  name: string;
  /** 一覧では1行に収まる名前だけを表示し、機能説明はここに分離してツールチップ/ⓘで表示する */
  description?: string;
  inputs: Partial<Record<ItemId, number>>;
  effect: RecipeEffect;
};

/** 建物の表示名。BuildingItems/ItemsPanelでの表示にも使う */
export const BUILDING_TYPE_NAME: Record<BuildingType, string> = {
  flower_bed: "花壇",
  storage_shed: "倉庫",
  farm_plot: "畑",
  rock: "石",
  torch: "たいまつ",
  inn: "宿屋",
  shipping_bin: "出荷箱",
  beehive: "蜂の巣",
  pet_box: "相棒ボックス",
};

export const BUILDING_TYPES: BuildingType[] = Object.keys(BUILDING_TYPE_NAME) as BuildingType[];

export const RECIPES: Recipe[] = [
  {
    id: "flower_bed",
    name: "花壇",
    inputs: { herb: 2 },
    effect: { type: "building", buildingType: "flower_bed" },
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
    name: "石",
    inputs: { stone: 1 },
    effect: { type: "building", buildingType: "rock" },
  },
  {
    id: "cooked_meat",
    name: "焼き肉",
    description: "焚き火で肉を焼く(売値アップ)",
    inputs: { meat: 1 },
    effect: { type: "item", itemId: "cooked_meat", amount: 1 },
  },
  {
    id: "cooked_fish",
    name: "焼き魚",
    description: "焚き火で魚を焼く(売値アップ)",
    inputs: { fish: 1 },
    effect: { type: "item", itemId: "cooked_fish", amount: 1 },
  },
  {
    id: "smelt_iron",
    name: "鉄インゴット",
    description: "かまどで石を精錬して作る",
    inputs: { stone: 5 },
    effect: { type: "item", itemId: "iron_ingot", amount: 1 },
  },
  {
    id: "totem",
    name: "不死のトーテム",
    description: "気絶を1回だけ防ぎHP1で復活する",
    inputs: { iron_ingot: 2, honey: 1 },
    effect: { type: "item", itemId: "totem", amount: 1 },
  },
  {
    id: "torch",
    name: "たいまつ",
    description: "夜、周囲を明るくする",
    inputs: { wood: 2 },
    effect: { type: "building", buildingType: "torch" },
  },
  {
    id: "inn",
    name: "宿屋",
    description: "コインを払うとHPが全回復する",
    inputs: { wood: 4, stone: 2 },
    effect: { type: "building", buildingType: "inn" },
  },
  {
    id: "shipping_bin",
    name: "出荷箱",
    description: "アイテムを入れると翌日コインになる",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "building", buildingType: "shipping_bin" },
  },
  {
    id: "pet_box",
    name: "相棒ボックス",
    description: "相棒を預ける/呼び戻す。預ければ別の動物をなつかせられる",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "building", buildingType: "pet_box" },
  },
  {
    id: "beehive",
    name: "蜂の巣",
    description: "はちみつを収穫できるが、まれに刺される",
    inputs: { wood: 3 },
    effect: { type: "building", buildingType: "beehive" },
  },
  {
    id: "axe",
    name: "斧",
    description: "木の採集量+1",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "tool", toolId: "axe" },
  },
  {
    id: "pickaxe",
    name: "つるはし",
    description: "石の採集量+1",
    inputs: { wood: 1, stone: 4 },
    effect: { type: "tool", toolId: "pickaxe" },
  },
  {
    id: "watering_can",
    name: "じょうろ",
    description: "畑に水をあげて成長を早める",
    inputs: { wood: 2, stone: 1 },
    effect: { type: "tool", toolId: "wateringCan" },
  },
  {
    id: "bicycle",
    name: "自転車",
    description: "スタミナを消費せずダッシュし続けられる",
    inputs: { wood: 5, stone: 2 },
    effect: { type: "tool", toolId: "bicycle" },
  },
  {
    id: "shield",
    name: "盾",
    description: "Bキーを押している間、モンスターの接触ダメージを防ぐ",
    inputs: { wood: 3, stone: 2 },
    effect: { type: "tool", toolId: "shield" },
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
  {
    id: "bow",
    name: "弓",
    description: "モンスターに遠くから攻撃できる",
    inputs: { wood: 3, herb: 2 },
    effect: { type: "weapon", weaponId: "bow" },
  },
  {
    id: "iron_sword",
    name: "鉄の剣",
    description: "石の剣より強い",
    inputs: { iron_ingot: 3, wood: 1 },
    effect: { type: "weapon", weaponId: "iron_sword" },
  },
  {
    id: "leather_armor",
    name: "革の鎧",
    description: "被弾を15%の確率で防ぎ、10%の確率で反撃する",
    inputs: { herb: 3, wood: 2 },
    effect: { type: "armor", armorId: "leather_armor" },
  },
  {
    id: "iron_armor",
    name: "鉄の鎧",
    description: "被弾を30%の確率で防ぎ、20%の確率で反撃する",
    inputs: { stone: 5, wood: 2 },
    effect: { type: "armor", armorId: "iron_armor" },
  },
];
