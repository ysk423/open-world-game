# Menu/ワールド生成の見直し(✅ 完了・2026-08-17)

1. Menuにクラフトっていらなくない？クラフト台をクリックしたときだけだせばよい
   → 対応済み。「☰ メニュー」から🔨クラフトの項目を削除し、拠点のクラフト台をクリック/Xキーで
   開く導線のみに一本化した([client/src/scenes/GameScene.ts](../client/src/scenes/GameScene.ts)のMenuHub初期化部分)。
2. アイテムや、ショップ、クラフト台、池の位置みたいなオブジェクトもろもろの配置は、毎回ランダムで位置を変更できない？
   → 対応済み。地形(池の位置・大きさ)とショップ・クラフト台の配置を、サーバーが発行する
   ワールドシードから実行時に生成するように変更した([client/src/systems/WorldMapGenerator.ts](../client/src/systems/WorldMapGenerator.ts)を新規追加)。
   道・境界の壁・NPCの位置など骨格部分は従来どおり固定し、常に到達可能な配置になるようにしている。
   これに伴い、静的だった`client/public/maps/world.json`と生成スクリプト`client/scripts/generate-world.mjs`は削除した。
