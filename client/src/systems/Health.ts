type Listener = (hp: number, maxHp: number) => void;

/** プレイヤーの体力。ゲームオーバーはなく、0になったら呼び出し側が拠点復帰などを行う */
export class Health {
  private hp: number;
  private readonly maxHp: number;
  private listeners: Listener[] = [];

  constructor(maxHp = 3) {
    this.maxHp = maxHp;
    this.hp = maxHp;
  }

  /** ダメージを与える。0になった(倒れた)瞬間だけtrueを返す */
  damage(amount = 1): boolean {
    if (this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.notify();
    return this.hp <= 0;
  }

  reset(): void {
    this.hp = this.maxHp;
    this.notify();
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.hp, this.maxHp);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.hp, this.maxHp);
  }
}
