import type { Health } from "../systems/Health";

export class HealthHud {
  private el: HTMLDivElement;

  constructor(health: Health) {
    this.el = document.createElement("div");
    this.el.id = "health-hud";
    document.body.appendChild(this.el);

    health.onChange((hp, maxHp) => this.render(hp, maxHp));
  }

  private render(hp: number, maxHp: number): void {
    const hearts: string[] = [];
    for (let i = 0; i < maxHp; i++) {
      hearts.push(i < hp ? "❤️" : "🖤");
    }
    this.el.textContent = hearts.join("");
  }
}
