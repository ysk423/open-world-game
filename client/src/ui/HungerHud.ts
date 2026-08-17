import type { Hunger } from "../systems/Hunger";

export class HungerHud {
  private el: HTMLDivElement;
  private drumsticksEl: HTMLSpanElement;
  private eatButton: HTMLButtonElement;

  constructor(hunger: Hunger, onEat: () => void) {
    this.el = document.createElement("div");
    this.el.id = "hunger-hud";

    this.drumsticksEl = document.createElement("span");
    this.el.appendChild(this.drumsticksEl);

    this.eatButton = document.createElement("button");
    this.eatButton.id = "eat-button";
    this.eatButton.textContent = "🍗 食べる";
    this.eatButton.addEventListener("click", onEat);
    this.el.appendChild(this.eatButton);

    document.body.appendChild(this.el);

    hunger.onChange((value, max) => this.render(value, max));
  }

  private render(value: number, max: number): void {
    const drumsticks: string[] = [];
    const filled = Math.round(value);
    for (let i = 0; i < max; i++) {
      drumsticks.push(i < filled ? "🍗" : "🦴");
    }
    this.drumsticksEl.textContent = drumsticks.join("");
    this.eatButton.style.display = value >= max ? "none" : "inline-block";
  }
}
