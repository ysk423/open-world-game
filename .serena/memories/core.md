# Core — open-world-game (SURVIVE)

2Dドット絵オープンワールド生存ゲーム(マルチプレイ、最大4人)。モノレポ:

- `client/` — Phaser 3 + TypeScript + Vite。Cloudflare Pagesにデプロイ。
- `server/` — Cloudflare Workers + Durable Objects(`partyserver`ライブラリ)。単一ルーム("main")= 単一Durable Object。

一次情報源は `Docs/design.md`(技術設計、実装済み内容ベース)と `Docs/spec.md`(機能・ゲームデザイン仕様)。
このファイルたちが更新され続けるので、詳細はコード読解より先にまずそちらを読むこと。`Docs/todo.md`/`Docs/todo-next.md`に次にやりたいことのメモがある。

MVP(フェーズ0〜5)は完了・本番デプロイ済み。現在はMVP対象外機能の追加実装フェーズ。

## 最重要の設計不変条件

- **サーバーが同期・永続化するのはプレイヤーのリアルタイム位置と拠点に設置された建物のみ**。インベントリ/HP/満腹度/スタミナ/実績/装備/クエスト等はすべてクライアントの`localStorage`個人単位で、ネットワーク同期されない(他プレイヤーの画面には反映されない)。
- Phaserシーンは`GameScene`(`client/src/scenes/GameScene.ts`, 約2400行)の1つのみ。タイトル/ロビーはPhaserではなく`client/index.html`のプレーンHTMLオーバーレイ。
- マップ地形(池・ショップ・クラフト台の配置)は静的Tiled JSONを廃止し、`worldSeed`から`WorldMapGenerator.ts`が実行時生成する(道・境界壁・NPC位置・スポーン地点`(38,80)`は固定骨格)。ゲームリセットのたびに地形も変わる。
- クラフトはサーバー側で検証されない(友達内輪プレイ前提)。

詳細トピック別メモ: `mem:tech_stack`, `mem:suggested_commands`, `mem:conventions`, `mem:task_completion`。
