import type { StatsSnapshot } from "./Stats";

export type Achievement = {
  id: string;
  name: string;
  icon: string;
  isUnlocked: (snapshot: Readonly<StatsSnapshot>, level: number) => boolean;
};

/**
 * ポケモン図鑑・ドラクエの称号を参考にした実績。生涯累計の記録(Stats)とレベル(Experience)から
 * 純粋に導出するだけなので、追加の永続化は不要(達成条件を満たしていれば常に解除済み扱い)。
 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_kill", name: "はじめての討伐", icon: "🗡️", isUnlocked: (s) => s.monstersDefeated >= 1 },
  { id: "monster_hunter", name: "モンスターハンター(10体討伐)", icon: "⚔️", isUnlocked: (s) => s.monstersDefeated >= 10 },
  { id: "boss_slayer", name: "ボスキラー", icon: "👑", isUnlocked: (s) => s.bossesDefeated >= 1 },
  { id: "rare_finder", name: "レアハンター", icon: "★", isUnlocked: (s) => s.rareMonstersDefeated >= 1 },
  { id: "treasure_hunter", name: "トレジャーハンター(宝箱5個)", icon: "🎁", isUnlocked: (s) => s.chestsOpened >= 5 },
  { id: "animal_friend", name: "どうぶつの友(3匹となかよく)", icon: "💛", isUnlocked: (s) => s.animalsBefriended >= 3 },
  { id: "angler", name: "釣り名人(魚10匹)", icon: "🐟", isUnlocked: (s) => s.itemsGathered.fish >= 10 },
  { id: "farmer", name: "働き者の農家(小麦20個)", icon: "🌾", isUnlocked: (s) => s.itemsGathered.wheat >= 20 },
  { id: "popular", name: "人気者(贈り物10回)", icon: "🎀", isUnlocked: (s) => s.giftsGiven >= 10 },
  { id: "veteran", name: "ベテラン冒険者(Lv.10)", icon: "🌟", isUnlocked: (_s, level) => level >= 10 },
  { id: "legend", name: "伝説の勇者(Lv.20)", icon: "🏆", isUnlocked: (_s, level) => level >= 20 },
];
