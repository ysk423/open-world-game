#クラフト台や、ショップでMenuを開いた後に、場所を離れると、Menuを閉じれなくなる、閉じる操作はどこでもできるように(✅ 完了・2026-08-18)

→ 対応済み。原因はクラフトメニュー(`CraftMenu`)だけにパネル自身の閉じるボタンが無く、
開くための「クラフト台への近接クリック/Xキー」しか閉じる手段が無かったこと(ショップは元々
`#shop-close`ボタンを持っていたため、近接しなくても閉じられていた)。`CraftMenu`にも
`#craft-close`(✕ボタン)を追加し、常にどこからでも閉じられるようにした
([client/src/ui/CraftMenu.ts](../client/src/ui/CraftMenu.ts))。

#設置と装備は一つのMenuにまとめて、「アイテム」ってできないかな?(✅ 完了・2026-08-18)

→ 対応済み。「📥 設置」(`BuildingItemsPanel`)と「⚔️ 装備」(`EquipmentPanel`)を統合した
`ItemsPanel`を新設し、「☰ メニュー」の項目を「🎒 アイテム」1つにまとめた
([client/src/ui/ItemsPanel.ts](../client/src/ui/ItemsPanel.ts))。パネル内は設置/装備/防具の
3セクション構成。

#Game内の文字がまだちいさい、もう少し大きく(✅ 完了・2026-08-18)

→ 対応済み。前回(同日)の底上げに続けて、HUD・各パネル・タイトル画面のフォントサイズを
もう1段階拡大した([client/src/style.css](../client/src/style.css)、
[client/src/scenes/GameScene.ts](../client/src/scenes/GameScene.ts)のフィールド上テキスト)。
絵文字アイコンのみの表示(ハート・満腹度・D-pad等)は引き続き据え置き。
