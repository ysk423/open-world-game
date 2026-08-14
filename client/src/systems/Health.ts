type Listener = (hp: number, maxHp: number) => void;

/** プレイヤーの体力。ゲームオーバーはなく、0になったら呼び出し側が拠点復帰などを行う */
export class Health {
  private hp: number;
  private maxHp: number;
  private listeners: Listener[] = [];

  constructor(maxHp = 5) {
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

  /** 回復する。maxHpを超えない */
  heal(amount = 1): void {
    if (this.hp >= this.maxHp) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.notify();
  }

  reset(): void {
    this.hp = this.maxHp;
    this.notify();
  }

  /** 最大HPを変更する(レベルアップ用)。増えた分は現在HPにもそのまま加算される */
  setMaxHp(newMaxHp: number): void {
    const diff = newMaxHp - this.maxHp;
    this.maxHp = newMaxHp;
    this.hp = diff > 0 ? Math.min(this.maxHp, this.hp + diff) : Math.min(this.hp, this.maxHp);
    this.notify();
  }

  /** セーブデータからの復元用。範囲外の値は0〜maxHpに丸める */
  setHp(hp: number): void {
    this.hp = Math.min(this.maxHp, Math.max(0, hp));
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
