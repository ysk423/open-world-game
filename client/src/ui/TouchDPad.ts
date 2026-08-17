import { getControlsRoot } from "./layoutRoots";

type DPadDirection = "up" | "down" | "left" | "right";

const VECTOR: Record<DPadDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** 画面左下の仮想十字キー。タッチ端末でキーボード移動の代わりに使う */
export class TouchDPad {
  private pressed = new Set<DPadDirection>();

  constructor(onMove: (x: number, y: number) => void) {
    const root = document.createElement("div");
    root.id = "touch-dpad";

    const makeButton = (dir: DPadDirection, label: string, className: string): HTMLButtonElement => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dpad-button ${className}`;
      button.textContent = label;

      const press = (event: Event): void => {
        event.preventDefault();
        this.pressed.add(dir);
        onMove(...this.currentVector());
      };
      const release = (event: Event): void => {
        event.preventDefault();
        this.pressed.delete(dir);
        onMove(...this.currentVector());
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);

      return button;
    };

    root.appendChild(makeButton("up", "▲", "dpad-up"));
    root.appendChild(makeButton("left", "◀", "dpad-left"));
    root.appendChild(makeButton("right", "▶", "dpad-right"));
    root.appendChild(makeButton("down", "▼", "dpad-down"));

    getControlsRoot().appendChild(root);
  }

  private currentVector(): [number, number] {
    let x = 0;
    let y = 0;
    for (const dir of this.pressed) {
      x += VECTOR[dir].x;
      y += VECTOR[dir].y;
    }
    return [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
  }
}
