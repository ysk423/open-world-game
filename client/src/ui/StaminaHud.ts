import type { Stamina } from "../systems/Stamina";

export class StaminaHud {
  private el: HTMLDivElement;

  constructor(stamina: Stamina) {
    this.el = document.createElement("div");
    this.el.id = "stamina-hud";
    document.body.appendChild(this.el);

    stamina.onChange((current, max) => this.render(current, max));
  }

  private render(current: number, max: number): void {
    this.el.textContent = `🏃 ${Math.round(current)}/${max}`;
  }
}
