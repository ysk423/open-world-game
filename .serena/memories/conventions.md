# Conventions

## ディレクトリ(client/src/)
- `entities/` — Player/RemotePlayer/Animal/Monster/Npc/Building等のゲームオブジェクトクラス。
- `systems/` — ゲームロジック(Inventory/Hunger/Stamina/Achievements等)。多くは「個数だけをlocalStorageに保持するCountsパターン」(`Inventory`と`BuildingItems`は同パターンだが別名前空間)。
- `ui/` — HUD・パネル類。
- `net/` — WebSocket通信(`RoomClient.ts`)と共有メッセージ型(`types.ts`)。
- `input/InputManager.ts` — キーボード/マウス/タッチ入力を「移動方向」「アクション実行」等の抽象イベントに変換する層。ゲームロジック側は入力デバイス種別を意識しない。

## 命名・実装上のクセ(非自明なので要注意)
- アクションキーは内部的に旧名称`onShiftAction`のまま(元Shiftキー→OSのIME等に横取りされる問題でXキーに変更した経緯。左クリック/タップも引き続き有効)。
- `InputManager.handlePointerDown`は右クリックを早期returnで無視する(削除済み機能の名残)。
- HUD要素は`layoutRoots.ts`の`getHudRoot()`/`getControlsRoot()`経由で`#hud-row`/`#controls-row`に追加する(直接DOMに追加しない)。縦持ち時のみCSSが3段レイアウトに切り替える。

## 建物クラフトは2段階
建物(`effect.type === "building"`)のクラフトは即座にワールド配置されない。`handleCraft`は`BuildingItems`に加算するのみ。実際の配置は「☰メニュー」→「📥設置」の`BuildingItemsPanel`から別途行う(他のレシピ種別=道具/武器/防具/アイテムとは異なる)。

## Health/ゲームオーバー設計
`Health`はHP管理のみ、ゲームオーバー処理は持たない。`damage()`はHPが0になった瞬間だけ`true`を返し、以降の分岐(トーテム復活/ゲームオーバー)は呼び出し側`GameScene`が担う。
