import type { ItemId } from "./Inventory";
import type { WeaponId, ArmorId } from "./Equipment";
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
  | "bed"
  | "inn"
  | "shipping_bin"
  | "barn"
  | "casino"
  | "custom_sign"
  | "beehive"
  | "hot_spring"
  | "scarecrow";

export type RecipeEffect =
  | { type: "building"; buildingType: BuildingType }
  | { type: "weapon"; weaponId: WeaponId }
  | { type: "tool"; toolId: ToolId }
  | { type: "item"; itemId: ItemId; amount: number }
  | { type: "upgrade"; weaponId: WeaponId }
  | { type: "armor"; armorId: ArmorId }
  | { type: "enchant"; weaponId: WeaponId };

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
    id: "cooked_fish",
    name: "焚き火で魚を焼く(売値アップ)",
    inputs: { fish: 1 },
    effect: { type: "item", itemId: "cooked_fish", amount: 1 },
  },
  {
    id: "smelt_iron",
    name: "かまどで石を精錬して鉄インゴットを作る",
    inputs: { stone: 5 },
    effect: { type: "item", itemId: "iron_ingot", amount: 1 },
  },
  {
    id: "totem",
    name: "不死のトーテム(気絶を1回だけ防ぎHP1で復活する)",
    inputs: { iron_ingot: 2, honey: 1 },
    effect: { type: "item", itemId: "totem", amount: 1 },
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
    id: "inn",
    name: "宿屋(コインを払うとHPが全回復する)",
    inputs: { wood: 4, stone: 2 },
    effect: { type: "building", buildingType: "inn" },
  },
  {
    id: "shipping_bin",
    name: "出荷箱(アイテムを入れると翌日コインになる)",
    inputs: { wood: 3, stone: 1 },
    effect: { type: "building", buildingType: "shipping_bin" },
  },
  {
    id: "barn",
    name: "納屋(近くの相棒のミルク生産が早まる)",
    inputs: { wood: 4, stone: 2 },
    effect: { type: "building", buildingType: "barn" },
  },
  {
    id: "custom_sign",
    name: "看板(自分の好きな言葉を書き込める)",
    inputs: { wood: 2 },
    effect: { type: "building", buildingType: "custom_sign" },
  },
  {
    id: "scarecrow",
    name: "カカシ(近くの畑の育成が早まる)",
    inputs: { wood: 2 },
    effect: { type: "building", buildingType: "scarecrow" },
  },
  {
    id: "hot_spring",
    name: "温泉(1日1回、無料でHPとスタミナが全回復する)",
    inputs: { wood: 3, stone: 3 },
    effect: { type: "building", buildingType: "hot_spring" },
  },
  {
    id: "beehive",
    name: "蜂の巣(はちみつを収穫できるが、まれに刺される)",
    inputs: { wood: 3 },
    effect: { type: "building", buildingType: "beehive" },
  },
  {
    id: "casino",
    name: "カジノ(コインを賭けて増やせるかも?)",
    inputs: { wood: 5, stone: 3 },
    effect: { type: "building", buildingType: "casino" },
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
    id: "hand_torch",
    name: "手持ちのたいまつ(夜、常に周囲を照らす)",
    inputs: { wood: 1 },
    effect: { type: "tool", toolId: "handTorch" },
  },
  {
    id: "bicycle",
    name: "自転車(スタミナを消費せずダッシュし続けられる)",
    inputs: { wood: 5, stone: 2 },
    effect: { type: "tool", toolId: "bicycle" },
  },
  {
    id: "shears",
    name: "ハサミ(野生動物を倒さずに毛を刈って羊毛を集められる)",
    inputs: { stone: 2, wood: 1 },
    effect: { type: "tool", toolId: "shears" },
  },
  {
    id: "compass",
    name: "コンパス(拠点への方角と距離が常に画面に表示される)",
    inputs: { iron_ingot: 1, wood: 1 },
    effect: { type: "tool", toolId: "compass" },
  },
  {
    id: "ender_pearl",
    name: "エンダーパール(右クリックした地点へコインを払って瞬間移動)",
    inputs: { stone: 3, coin: 10 },
    effect: { type: "tool", toolId: "enderPearl" },
  },
  {
    id: "shield",
    name: "盾(Bキーを押している間、モンスターの接触ダメージを防ぐ)",
    inputs: { wood: 3, stone: 2 },
    effect: { type: "tool", toolId: "shield" },
  },
  {
    id: "ender_chest",
    name: "エンダーチェスト(どこからでも倉庫を開ける)",
    inputs: { stone: 5, coin: 20 },
    effect: { type: "tool", toolId: "enderChest" },
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
    name: "弓(モンスターに遠くから攻撃できる)",
    inputs: { wood: 3, herb: 2 },
    effect: { type: "weapon", weaponId: "bow" },
  },
  {
    id: "iron_sword",
    name: "鉄の剣(石の剣より強い)",
    inputs: { iron_ingot: 3, wood: 1 },
    effect: { type: "weapon", weaponId: "iron_sword" },
  },
  {
    id: "upgrade_wooden_sword",
    name: "木の剣を強化(+1攻撃力)",
    inputs: { wood: 2, stone: 2 },
    effect: { type: "upgrade", weaponId: "wooden_sword" },
  },
  {
    id: "upgrade_stone_sword",
    name: "石の剣を強化(+1攻撃力)",
    inputs: { stone: 4, coin: 3 },
    effect: { type: "upgrade", weaponId: "stone_sword" },
  },
  {
    id: "enchant_knockback_wooden_sword",
    name: "木の剣にノックバックのエンチャント",
    inputs: { herb: 3, coin: 5 },
    effect: { type: "enchant", weaponId: "wooden_sword" },
  },
  {
    id: "enchant_knockback_stone_sword",
    name: "石の剣にノックバックのエンチャント",
    inputs: { herb: 3, coin: 5 },
    effect: { type: "enchant", weaponId: "stone_sword" },
  },
  {
    id: "leather_armor",
    name: "革の鎧(被弾を15%の確率で防ぎ、10%の確率で反撃する)",
    inputs: { herb: 3, wood: 2 },
    effect: { type: "armor", armorId: "leather_armor" },
  },
  {
    id: "iron_armor",
    name: "鉄の鎧(被弾を30%の確率で防ぎ、20%の確率で反撃する)",
    inputs: { stone: 5, wood: 2 },
    effect: { type: "armor", armorId: "iron_armor" },
  },
];
