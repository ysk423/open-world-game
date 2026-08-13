/** 画面右下の大きな丸ボタン。タッチ端末でクリックに相当するアクション(向いている方向への採集・攻撃・会話など)を行う */
export class ActionButton {
  constructor(onAction: () => void) {
    const button = document.createElement("button");
    button.id = "action-button";
    button.type = "button";
    button.textContent = "●";

    const trigger = (event: Event): void => {
      event.preventDefault();
      onAction();
    };
    button.addEventListener("pointerdown", trigger);

    document.body.appendChild(button);
  }
}
