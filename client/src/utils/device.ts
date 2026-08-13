/** タッチ操作が使える端末かどうか(スマホ・タブレット判定に使う簡易チェック) */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
