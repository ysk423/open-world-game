import type { Health } from "../systems/Health";

export class HealthHud {
  private el: HTMLDivElement;
  private heartsEl: HTMLSpanElement;
  private healButton: HTMLButtonElement;

  constructor(health: Health, onHeal: () => void) {
    this.el = document.createElement("div");
    this.el.id = "health-hud";

    this.heartsEl = document.createElement("span");
    this.el.appendChild(this.heartsEl);

    this.healButton = document.createElement("button");
    this.healButton.id = "heal-button";
    this.healButton.textContent = "🌿 回復";
    this.healButton.addEventListener("click", onHeal);
    this.el.appendChild(this.healButton);

    document.body.appendChild(this.el);

    health.onChange((hp, maxHp) => this.render(hp, maxHp));
  }

  private render(hp: number, maxHp: number): void {
    const hearts: string[] = [];
    for (let i = 0; i < maxHp; i++) {
      hearts.push(i < hp ? "❤️" : "🖤");
    }
    this.heartsEl.textContent = hearts.join("");
    this.healButton.style.display = hp >= maxHp ? "none" : "inline-block";
  }
}
