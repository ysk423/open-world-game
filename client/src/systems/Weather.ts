// ルームごとの乱数(WorldContentGenerator)とは別に、時刻ベースで決定的な天候を作る。
// 追加の通信なしに全プレイヤーで天候が揃うよう、Date.now()から算出する(昼夜サイクルと同じ考え方)。
const WEATHER_WINDOW_MS = 3 * 60 * 1000;
const RAIN_CHANCE = 0.35;

/** 決定的な擬似乱数生成器(mulberry32)。同じseedなら常に同じ値を返す */
function mulberry32(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 現在の「天候ウィンドウ」の番号(この番号ごとに雨か晴れかが決まる) */
function getWeatherWindowIndex(nowMs: number): number {
  return Math.floor(nowMs / WEATHER_WINDOW_MS);
}

/** 牧場物語を参考にした天候。数分おきに雨/晴れが決定的に切り替わる */
export function isRaining(nowMs: number): boolean {
  return mulberry32(getWeatherWindowIndex(nowMs)) < RAIN_CHANCE;
}

/** 現在の天候ウィンドウ内での進行度(0〜1未満)。雨の演出のフェード等に使える */
export function getWeatherWindowProgress(nowMs: number): number {
  return (nowMs % WEATHER_WINDOW_MS) / WEATHER_WINDOW_MS;
}
