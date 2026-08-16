const CLAIMED_KEY = "open-world-game:achievement-reward-claimed";

/** ポケモンの図鑑コンプリート報酬を参考にした、実績全達成時の一度きりのボーナス */
export function hasClaimedAchievementReward(): boolean {
  return localStorage.getItem(CLAIMED_KEY) === "true";
}

export function markAchievementRewardClaimed(): void {
  localStorage.setItem(CLAIMED_KEY, "true");
}
