import type { Experience } from "../systems/Experience";

export class ExperienceHud {
  private el: HTMLDivElement;

  constructor(experience: Experience) {
    this.el = document.createElement("div");
    this.el.id = "experience-hud";
    document.body.appendChild(this.el);

    experience.onChange((level, exp, expToNextLevel) => this.render(level, exp, expToNextLevel));
  }

  private render(level: number, exp: number, expToNextLevel: number): void {
    const label = expToNextLevel > 0 ? `Lv.${level} (${exp}/${expToNextLevel})` : `Lv.${level} (MAX)`;
    this.el.textContent = `⭐ ${label}`;
  }
}
