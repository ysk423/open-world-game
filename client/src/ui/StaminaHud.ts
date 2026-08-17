import type { Stamina } from "../systems/Stamina";
import { getHudRoot } from "./layoutRoots";

export class StaminaHud {
  private el: HTMLDivElement;

  constructor(stamina: Stamina) {
    this.el = document.createElement("div");
    this.el.id = "stamina-hud";
    getHudRoot().appendChild(this.el);

    stamina.onChange((current, max) => this.render(current, max));
  }

  private render(current: number, max: number): void {
    this.el.textContent = `🏃 ${Math.round(current)}/${max}`;
  }
}
