/**
 * マインクラフトや牧場物語を参考にした昼夜サイクル。
 * サーバーとの通信を増やさずに全プレイヤーの時刻を揃えるため、Date.now()から決定的に算出する
 * (時計のずれはあっても数秒程度で、体感には影響しない)。
 */
export const CYCLE_DURATION_MS = 8 * 60 * 1000;

const NIGHT_THRESHOLD = 0.5;

/** サイクル内の進行度(0〜1未満)を返す */
export function getCycleProgress(nowMs: number, cycleDurationMs = CYCLE_DURATION_MS): number {
  return (((nowMs % cycleDurationMs) + cycleDurationMs) % cycleDurationMs) / cycleDurationMs;
}

/** 進行度から夜の暗さ(0=真昼、1=真夜中)をcosカーブで滑らかに求める。progress=0.5が真夜中 */
export function getNightIntensity(progress: number): number {
  return (1 - Math.cos(progress * Math.PI * 2)) / 2;
}

/** マインクラフトのように、夜間はモンスターの再出現が早まる判定に使う */
export function isNight(progress: number): boolean {
  return getNightIntensity(progress) > NIGHT_THRESHOLD;
}
