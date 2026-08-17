/**
 * HUD要素・タッチ操作ボタンを追加する先のコンテナ。index.htmlに静的に用意されている
 * `#hud-row`(上段)・`#controls-row`(下段)へ追加することで、スマホ縦持ち時にCSS側
 * (style.cssの`@media (orientation: portrait)`)が上段=HUD/中段=ゲーム画面/下段=操作ボタン
 * の3段レイアウトに組み替えられるようにする。デスクトップ/横持ちでは各要素は従来どおり
 * position:fixedで画面端に固定されるため、親要素がどちらでも見た目は変わらない。
 * コンテナが見つからない場合(将来的なテスト環境など)はdocument.bodyへフォールバックする。
 */
function resolveRoot(id: string): HTMLElement {
  return document.getElementById(id) ?? document.body;
}

export function getHudRoot(): HTMLElement {
  return resolveRoot("hud-row");
}

export function getControlsRoot(): HTMLElement {
  return resolveRoot("controls-row");
}
