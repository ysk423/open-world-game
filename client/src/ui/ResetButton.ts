/** 画面左上の「リセット」ボタン。押すと拠点の建物とエリア開放を全員分リセットする */
export class ResetButton {
  constructor(onReset: () => void) {
    const button = document.createElement("button");
    button.id = "reset-toggle";
    button.textContent = "🔄 拠点リセット";
    button.addEventListener("click", () => {
      if (window.confirm("拠点の建物とエリア開放を全員分リセットします。よろしいですか?")) {
        onReset();
      }
    });
    document.body.appendChild(button);
  }
}
