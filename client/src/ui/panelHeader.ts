/** パネル共通のヘッダー(タイトル+✕閉じるボタン)を生成する。CraftMenu/ItemsPanel/ShopPanel等で同じ見た目に使う */
export function createPanelHeader(title: string, closeButtonId: string, onClose: () => void): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "shop-header";

  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeButton = document.createElement("button");
  closeButton.id = closeButtonId;
  closeButton.textContent = "✕";
  closeButton.addEventListener("click", onClose);
  header.appendChild(closeButton);

  return header;
}
