import { getControlsRoot } from "./layoutRoots";

/** 画面右下の「押している間だけダッシュする」ボタン(タッチ端末向け)。キーボードのスペースキーに相当する */
export class SprintButton {
  constructor(onChange: (active: boolean) => void) {
    const button = document.createElement("button");
    button.id = "sprint-button";
    button.type = "button";
    button.textContent = "🏃";

    const setActive = (active: boolean) => (event: Event) => {
      event.preventDefault();
      onChange(active);
    };
    button.addEventListener("pointerdown", setActive(true));
    button.addEventListener("pointerup", setActive(false));
    button.addEventListener("pointerleave", setActive(false));
    button.addEventListener("pointercancel", setActive(false));

    getControlsRoot().appendChild(button);
  }
}
