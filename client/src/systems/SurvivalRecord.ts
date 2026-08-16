const BEST_SURVIVAL_KEY = "open-world-game:survival-best-ms";

/** 個人の自己ベスト生存時間(ミリ秒)。記録がなければ0 */
export function getBestSurvivalMs(): number {
  const raw = localStorage.getItem(BEST_SURVIVAL_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** 今回の生存時間を記録する。自己ベストを更新した場合はisNewBest=trueを返す */
export function recordSurvivalMs(survivedMs: number): { isNewBest: boolean; best: number } {
  const current = getBestSurvivalMs();
  if (survivedMs > current) {
    localStorage.setItem(BEST_SURVIVAL_KEY, String(Math.round(survivedMs)));
    return { isNewBest: true, best: survivedMs };
  }
  return { isNewBest: false, best: current };
}

/** ミリ秒を「1:23:45」または「12:34」形式の見やすい文字列に変換する */
export function formatSurvivalTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
