type Listener = (hunger: number, maxHunger: number) => void;

const DRAIN_PER_SEC = 1 / 20; // 満タンから空腹になるまで約200秒(3分20秒)

/**
 * マインクラフトの満腹度を参考にした、時間経過で自然に減っていくリソース。
 * 0になると(GameScene側の処理で)体力が削られ始めるため、食べ物を食べて
 * 定期的に補給しないと生存できない「競技」としての緊張感を作る
 */
export class Hunger {
  private hunger: number;
  private readonly maxHunger: number;
  private listeners: Listener[] = [];

  constructor(maxHunger = 10) {
    this.maxHunger = maxHunger;
    this.hunger = maxHunger;
  }

  getHunger(): number {
    return this.hunger;
  }

  getMaxHunger(): number {
    return this.maxHunger;
  }

  isStarving(): boolean {
    return this.hunger <= 0;
  }

  /** 食べ物を食べて満腹度を回復する。最大値を超えない */
  eat(amount: number): void {
    const next = Math.min(this.maxHunger, this.hunger + amount);
    if (next !== this.hunger) {
      this.hunger = next;
      this.notify();
    }
  }

  /** 呼び出し側(GameScene)が毎フレーム呼ぶ */
  tick(deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    const next = Math.max(0, this.hunger - DRAIN_PER_SEC * deltaSec);
    if (next !== this.hunger) {
      this.hunger = next;
      this.notify();
    }
  }

  reset(): void {
    this.hunger = this.maxHunger;
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.hunger, this.maxHunger);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.hunger, this.maxHunger);
  }
}
