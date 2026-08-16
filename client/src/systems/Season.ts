import { CYCLE_DURATION_MS } from "./DayNightCycle";

/**
 * 牧場物語風の四季。サーバー通信を増やさず全員で揃うよう、昼夜サイクルの1日単位で
 * Date.now()から決定的に算出する(4日で一周する)。
 */
export type Season = "spring" | "summer" | "autumn" | "winter";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export const SEASON_NAME: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export const SEASON_ICON: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍁",
  winter: "❄️",
};

// 季節ごとの作物の育成速度倍率(夏は早く育ち、冬は遅い)
export const SEASON_GROWTH_MULTIPLIER: Record<Season, number> = {
  spring: 1,
  summer: 0.8,
  autumn: 1,
  winter: 1.5,
};

export function getSeason(nowMs: number): Season {
  const dayIndex = Math.floor(nowMs / CYCLE_DURATION_MS);
  const index = ((dayIndex % SEASONS.length) + SEASONS.length) % SEASONS.length;
  return SEASONS[index];
}
