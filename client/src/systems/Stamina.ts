type Listener = (stamina: number, maxStamina: number) => void;

const DRAIN_PER_SEC = 25;
const REGEN_PER_SEC = 15;
// 0付近で「ダッシュ判定→わずかに回復→再びダッシュ判定」を1フレームおきに繰り返して
// 速度がちらつくのを防ぐため、0ちょうどではなく少し余裕を持たせた閾値で判定する
const MIN_STAMINA_TO_SPRINT = 5;

/**
 * 牧場物語のスタミナを参考にしたダッシュ用リソース。ダッシュ中は減り、
 * それ以外の時は自然に回復する。0になるとダッシュできなくなる。
 */
export class Stamina {
  private stamina: number;
  private readonly maxStamina: number;
  private listeners: Listener[] = [];

  constructor(maxStamina = 100) {
    this.maxStamina = maxStamina;
    this.stamina = maxStamina;
  }

  getStamina(): number {
    return this.stamina;
  }

  getMaxStamina(): number {
    return this.maxStamina;
  }

  canSprint(): boolean {
    return this.stamina > MIN_STAMINA_TO_SPRINT;
  }

  /** 呼び出し側(GameScene)が毎フレーム呼ぶ。sprintingならdeltaMsぶん減り、そうでなければ回復する */
  tick(deltaMs: number, sprinting: boolean): void {
    const deltaSec = deltaMs / 1000;
    const rate = sprinting ? -DRAIN_PER_SEC : REGEN_PER_SEC;
    const next = Math.min(this.maxStamina, Math.max(0, this.stamina + rate * deltaSec));
    if (next !== this.stamina) {
      this.stamina = next;
      this.notify();
    }
  }

  reset(): void {
    this.stamina = this.maxStamina;
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.stamina, this.maxStamina);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.stamina, this.maxStamina);
  }
}
