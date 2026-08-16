import Phaser from "phaser";
import { InputManager } from "../input/InputManager";
import type { ActionPoint, Direction } from "../input/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { GatheringPoint } from "../entities/GatheringPoint";
import { Building } from "../entities/Building";
import { FarmPlot, CROP_PRIORITY, CROP_CONFIG } from "../entities/FarmPlot";
import { Rock } from "../entities/Rock";
import { Torch, ensureTorchTextures, TORCH_GLOW_TEXTURE_KEY } from "../entities/Torch";
import { Bed } from "../entities/Bed";
import { Chest } from "../entities/Chest";
import { Monster } from "../entities/Monster";
import { Animal } from "../entities/Animal";
import { Npc } from "../entities/Npc";
import { Shop } from "../entities/Shop";
import { RoomClient } from "../net/RoomClient";
import type { AnimState, PlacedBuilding, PlayerState } from "../net/types";
import { getJoinInfo, SHARED_ROOM_ID } from "../net/joinInfo";
import { Inventory, type ItemId } from "../systems/Inventory";
import type { BuildingType, Recipe } from "../systems/recipes";
import { Health } from "../systems/Health";
import { Equipment } from "../systems/Equipment";
import { Experience } from "../systems/Experience";
import { Stamina } from "../systems/Stamina";
import { Storage } from "../systems/Storage";
import { StoragePanel } from "../ui/StoragePanel";
import { Tools } from "../systems/Tools";
import { Quests, getQuestForNpc } from "../systems/Quests";
import { Affinity, AFFINITY_MILESTONE_STEP } from "../systems/Affinity";
import { Stats } from "../systems/Stats";
import { StatsPanel } from "../ui/StatsPanel";
import { saveSlot, loadSlot, deleteSlot } from "../systems/SaveSlots";
import { buildExportFile, downloadJsonFile, type ExportedSaveFile } from "../systems/ExportImport";
import { generateWorldContent } from "../systems/WorldContentGenerator";
import { getCycleProgress, getNightIntensity, isNight } from "../systems/DayNightCycle";
import { isRaining } from "../systems/Weather";
import { getSeason, SEASON_ICON, SEASON_NAME } from "../systems/Season";
import { InventoryHud } from "../ui/InventoryHud";
import { CraftMenu } from "../ui/CraftMenu";
import { HealthHud } from "../ui/HealthHud";
import { HelpPanel } from "../ui/HelpPanel";
import { SaveLoadPanel } from "../ui/SaveLoadPanel";
import { DataManagementPanel } from "../ui/DataManagementPanel";
import { EquipmentPanel } from "../ui/EquipmentPanel";
import { ExperienceHud } from "../ui/ExperienceHud";
import { ShopPanel, SHOP_BUY_PRICES, SHOP_SELL_PRICES, getDailySpecialItem, getEffectiveSellPrice } from "../ui/ShopPanel";
import { TouchDPad } from "../ui/TouchDPad";
import { ActionButton } from "../ui/ActionButton";
import { SprintButton } from "../ui/SprintButton";
import { StaminaHud } from "../ui/StaminaHud";
import { Minimap, type MinimapPoint } from "../ui/Minimap";
import { isTouchDevice } from "../utils/device";

const WATER_GID = 3;
const ROCK_GID = 4;
const BRIDGE_GID = 5;

// タイル/スプライトは32px(素材を16pxから倍の解像度に描き直した際に合わせて倍増)。
const TILE_SIZE = 32;

// スポーン地点(縦の道の上、タイル座標。ワールド全体の座標系。
// マップを2倍スケール(4倍面積)に拡張したのに合わせて元の(19,40)を2倍にしてある)
const SPAWN_TILE = { x: 38, y: 80 };
const SPAWN_X = SPAWN_TILE.x * TILE_SIZE + TILE_SIZE / 2;
const SPAWN_Y = SPAWN_TILE.y * TILE_SIZE + TILE_SIZE / 2;

// 位置同期を送る間隔(ms)。低頻度・高頻度どちらにも寄せすぎない程度の値
const NETWORK_TICK_MS = 80;

// タッチ操作は指先の面積があり狙った場所ぴったりをタップしにくいため、
// クリック判定(タップ位置と対象の距離)をマウスより広めにとる
const CLICK_RADIUS = isTouchDevice() ? 65 : 40;
const REACH_RADIUS = 80;

// 採集の判定距離
const GATHER_CLICK_RADIUS = CLICK_RADIUS;
const GATHER_REACH_RADIUS = REACH_RADIUS;

// 攻撃の判定距離
const ATTACK_CLICK_RADIUS = CLICK_RADIUS;
const ATTACK_REACH_RADIUS = REACH_RADIUS;

// 会話の判定距離
const TALK_CLICK_RADIUS = CLICK_RADIUS;
const TALK_REACH_RADIUS = REACH_RADIUS;

// 畑の判定距離
const FARM_CLICK_RADIUS = CLICK_RADIUS;
const FARM_REACH_RADIUS = REACH_RADIUS;

// ショップの判定距離
const SHOP_CLICK_RADIUS = CLICK_RADIUS;
const SHOP_REACH_RADIUS = REACH_RADIUS;

// シフトキーでアクションする時、向いている方向のこの距離先を対象点にする
const SHIFT_ACTION_REACH = 40;
const SHIFT_ACTION_OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const PLAYER_MAX_HP = 5;
const CONTACT_DAMAGE = 1;
const CONTACT_INVULN_MS = 1000;

// DQ風の状態異常「毒」。レア個体・ボスとの接触でまれに毒になり、一定時間じわじわダメージを受ける
const POISON_CHANCE = 0.4;
const POISON_DURATION_MS = 8000;
const POISON_TICK_MS = 1000;
const POISON_DAMAGE_PER_TICK = 1;

// ドラクエ風の経験値。モンスターの方が動物より手強い分、経験値も多めにする
const MONSTER_EXP = 8;
const ANIMAL_EXP = 4;

// はぐれメタル/色違い風の「レアモンスター」の出現率と報酬倍率
const RARE_MONSTER_CHANCE = 0.1;
const RARE_MONSTER_REWARD_MULTIPLIER = 3;
// DQ/ポケモン風に、夜はレアモンスターが出やすくなる
const NIGHT_RARE_MONSTER_MULTIPLIER = 1.5;

// マインクラフトのスライムを参考に、通常モンスターは倒すと2体の子スライムに分裂する
const SLIME_SPLIT_COUNT = 2;
const SLIME_SPLIT_OFFSET = 16;
const MINI_REWARD_MULTIPLIER = 0.5;

// 牧場物語風の動物への餌やり。作物を持っていれば攻撃の代わりに餌をあげてなかよくなれる
const FEED_ITEMS: ItemId[] = ["wheat", "crop"];
const ANIMAL_FEED_COIN_REWARD = 3;
const ANIMAL_FEED_EXP_MULTIPLIER = 2;

// ポケモンの「色違い」を参考にした、まれに出現する特別な動物。餌付け報酬が増える
const SHINY_ANIMAL_CHANCE = 0.08;
const SHINY_ANIMAL_REWARD_MULTIPLIER = 5;

// DQ/ゼルダ風の宝箱。開けた後はしばらくして別の場所に再出現する
const CHEST_EXP = 10;
const CHEST_MIN_COIN_REWARD = 8;
const CHEST_MAX_COIN_REWARD = 20;
const CHEST_RESPAWN_DELAY_MS = 60000;

// 牧場物語/どうぶつの森風の釣り。水面をクリック/タップすると釣りを試みる
const FISH_COOLDOWN_MS = 1500;
const FISH_SUCCESS_CHANCE = 0.6;
const FISH_EXP = 4;

// DQ風のフィールドボス。常に1体だけワールドに存在し、倒すと大きな報酬をもたらす。
// 倒すたびに次のボスが強くなる分、報酬も上乗せする
const BOSS_REWARD_MULTIPLIER = 10;
const BOSS_TIER_REWARD_STEP = 0.5;
const BOSS_RESPAWN_DELAY_MS = 90000;

// 井戸は使うとスタミナが全回復する休憩ポイント。連打で無限回復しないようクールダウンを設ける
const WELL_COOLDOWN_MS = 5000;

// DQ/牧場物語風の宿屋。コインを払うとHPが全回復する
const INN_HEAL_COST = 5;

// DQ風の「ルーラ」。Tキーでコインを払い、拠点(ベッド/リスポーン地点)へ瞬間移動する
const WARP_COST = 5;
const WARP_COOLDOWN_MS = 10000;

// DQ風の「とくぎ」。Fキーでスタミナを消費し、近くのモンスターに通常の何倍ものダメージを与える
const SKILL_STAMINA_COST = 30;
const SKILL_COOLDOWN_MS = 8000;
const SKILL_DAMAGE_MULTIPLIER = 2;

// DQ風の「会心の一撃」。攻撃のたびに一定確率でダメージが跳ね上がる
const CRIT_CHANCE = 0.15;
const CRIT_MULTIPLIER = 2;

// 花壇は時間経過でハーブが育ち、収穫できる(牧場物語のガーデン要素を参考にした放置系の収穫)
const FLOWER_BED_HERB_INTERVAL_MS = 20000;
const FLOWER_BED_MAX_YIELD = 5;

// ドラクエ風の道しるべ。使うとゲームのコツをヒントとして教えてくれる
const SIGNPOST_MESSAGES = [
  "ダッシュボタン(またはスペースキー)を押しながら移動するとダッシュできる。スタミナ切れに注意。",
  "井戸に話しかけるとスタミナが全回復するぞ。",
  "夜になるとモンスターの再出現が早まる…油断せずに。",
  "宝箱はしばらくすると別の場所に現れる。見つけたら開けておこう。",
  "雨の日は畑の作物がよく育つらしい。",
  "動物に作物をあげると、なかよくなれるかもしれない。",
  "倉庫に預けたものは、拠点をリセットしても消えないぞ。",
  "水辺をタップすると釣りができる。気長に試そう。",
];



// モンスターを倒してから再出現するまでの時間
const MONSTER_RESPAWN_DELAY_MS = 20000;
// 動物を倒してから再出現するまでの時間
const ANIMAL_RESPAWN_DELAY_MS = 15000;
// 再出現位置は極力プレイヤーから離す(近すぎる候補は避ける)
const MONSTER_RESPAWN_MIN_DIST = 150;

// 夜間の画面の暗さの最大値(0=無色、1=完全に不透明)
const NIGHT_OVERLAY_MAX_ALPHA = 0.5;
const NIGHT_OVERLAY_COLOR = 0x0a1a40;

// 牧場物語風の天候(雨)。降っている間は画面を少し暗くし、雨粒パーティクルを降らせる
const RAIN_OVERLAY_COLOR = 0x3a4a5c;
const RAIN_OVERLAY_ALPHA = 0.25;

const ITEM_ICON: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  coin: "💰",
  seed: "🌱",
  crop: "🥕",
  meat: "🍖",
  seed_wheat: "🌾",
  wheat: "🍞",
  cooked_meat: "🍗",
  fish: "🐟",
  milk: "🥛",
  seed_tomato: "🌱",
  tomato: "🍅",
  cooked_fish: "🍢",
};

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private roomClient!: RoomClient;
  private inventory!: Inventory;
  private equipment!: Equipment;
  private tools!: Tools;
  private quests!: Quests;
  private affinity!: Affinity;
  private stats!: Stats;
  private experience!: Experience;
  private craftMenu!: CraftMenu;
  private health!: Health;
  private stamina!: Stamina;
  private storage!: Storage;
  private storagePanel!: StoragePanel;
  private invulnerableUntil = 0;
  private nextFishAllowedAt = 0;
  private nextWellAllowedAt = 0;
  private nextWarpAllowedAt = 0;
  private nextSkillAllowedAt = 0;
  private poisonedUntil = 0;
  private nextPoisonTickAt = 0;
  private pendingLoadSlot: number | null = null;
  private pendingExportSlot: number | null = null;

  private remotePlayers = new Map<string, RemotePlayer>();
  private selfId: string | null = null;

  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private obstacleLayer?: Phaser.Tilemaps.TilemapLayer;
  private walkableTiles: { x: number; y: number }[] = [];

  private gatheringPoints: GatheringPoint[] = [];
  private buildingSprites: Building[] = [];
  private flowerBedPlantedAt = new Map<Building, number>();
  private farmPlots: FarmPlot[] = [];
  private monsters: Monster[] = [];
  private boss: Monster | null = null;
  private monsterOverlaps: Phaser.Physics.Arcade.Collider[] = [];
  private animals: Animal[] = [];
  private pet: Animal | null = null;
  private rocks: Rock[] = [];
  private torches: Torch[] = [];
  private handTorchGlow?: Phaser.GameObjects.Image;
  private beds: Bed[] = [];
  private chests: Chest[] = [];
  private respawnPoint = { x: SPAWN_X, y: SPAWN_Y };
  private npcs: Npc[] = [];
  private shops: Shop[] = [];
  private shopPanel!: ShopPanel;
  private minimap!: Minimap;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private rainOverlay!: Phaser.GameObjects.Rectangle;
  private rainEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private isCurrentlyRaining = false;

  private buildings: PlacedBuilding[] = [];

  private lastSent = {
    x: 0,
    y: 0,
    direction: "down",
    animState: "idle" as AnimState,
  };
  private sinceLastSend = 0;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.tilemapTiledJSON("world", "maps/world.json");
    this.load.image("tiles", "assets/tileset.png");
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet("gathering", "assets/gathering.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("buildings", "assets/buildings.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("farm", "assets/farm.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("monster", "assets/monster.png");
    this.load.image("animal", "assets/animal.png");
    this.load.image("shop", "assets/shop.png");
    this.load.image("rock-object", "assets/rock-object.png");
    this.load.spritesheet("npc", "assets/npc.png", {
      frameWidth: 32,
      frameHeight: 64,
    });

    this.load.audio("bgm", "assets/audio/bgm.wav");
    this.load.audio("sfx-gather", "assets/audio/sfx-gather.wav");
    this.load.audio("sfx-attack", "assets/audio/sfx-attack.wav");
    this.load.audio("sfx-craft", "assets/audio/sfx-craft.wav");
    this.load.audio("sfx-talk", "assets/audio/sfx-talk.wav");
    this.load.audio("sfx-hurt", "assets/audio/sfx-hurt.wav");
  }

  create(): void {
    this.inventory = new Inventory();
    this.equipment = new Equipment();
    this.tools = new Tools();
    this.quests = new Quests();
    this.affinity = new Affinity();
    this.stats = new Stats();
    this.experience = new Experience();
    new StatsPanel(this.stats, this.experience);
    new InventoryHud(this.inventory);
    this.craftMenu = new CraftMenu(
      this.inventory,
      () => new Set(this.equipment.getOwned()),
      () => new Set(this.tools.getOwned()),
      (weaponId) => this.equipment.getUpgradeLevel(weaponId),
      () => new Set(this.equipment.getOwnedArmor()),
      (recipe) => this.handleCraft(recipe),
    );
    new EquipmentPanel(this.equipment, (weaponId) => this.equipment.equip(weaponId), (armorId) =>
      this.equipment.equipArmor(armorId),
    );
    new ExperienceHud(this.experience);
    this.health = new Health(PLAYER_MAX_HP);
    this.syncMaxHpFromLevel();
    new HealthHud(this.health, () => this.handleHeal());
    this.stamina = new Stamina();
    new StaminaHud(this.stamina);
    new HelpPanel();
    new SaveLoadPanel({
      onSave: (slot) => this.handleSave(slot),
      onLoad: (slot) => this.handleLoad(slot),
      onDelete: (slot) => this.handleDelete(slot),
    });
    new DataManagementPanel({
      onExport: (slot) => this.handleExport(slot),
      onImport: (slot, data) => this.handleImport(slot, data),
    });
    this.shopPanel = new ShopPanel(this.inventory, {
      onSell: (itemId) => this.handleSell(itemId),
      onBuy: (itemId) => this.handleBuy(itemId),
    });
    this.storage = new Storage();
    this.storagePanel = new StoragePanel(this.inventory, this.storage, {
      onDeposit: (itemId) => this.handleDeposit(itemId),
      onWithdraw: (itemId) => this.handleWithdraw(itemId),
    });

    if (!this.sound.get("bgm")) {
      this.sound.play("bgm", { loop: true, volume: 0.25 });
    }

    this.player = new Player(this, SPAWN_X, SPAWN_Y);

    this.buildWorld();

    this.inputManager = new InputManager(this);
    this.inputManager.onAction((point) => {
      this.handleAction(point);
    });
    this.inputManager.onShiftAction(() => {
      this.handleShiftAction();
    });
    this.inputManager.onTeleportAction(() => {
      this.handleWarp();
    });
    this.inputManager.onSkillAction(() => {
      this.handleSkill();
    });
    if (isTouchDevice()) {
      new TouchDPad((x, y) => this.inputManager.setTouchMove(x, y));
      new ActionButton(() => this.handleShiftAction());
      new SprintButton((active) => this.inputManager.setTouchSprint(active));
    }

    this.setupNetworking();
  }

  private setupNetworking(): void {
    const { name } = getJoinInfo();
    this.roomClient = new RoomClient(SHARED_ROOM_ID, name, {
      onInit: (selfId, players, buildings, worldSeed) => {
        this.selfId = selfId;
        for (const player of players) {
          if (player.id === selfId) continue;
          this.addRemotePlayer(player);
        }

        this.buildings = buildings;
        for (const building of buildings) {
          this.addBuildingSprite(building);
        }

        this.clearWorldContent();
        this.placeWorldContent(worldSeed);
      },
      onPlayerJoined: (player) => {
        if (player.id === this.selfId) return;
        this.addRemotePlayer(player);
      },
      onPlayerMoved: (id, x, y, direction, animState) => {
        const remote = this.remotePlayers.get(id);
        if (!remote) return;
        remote.updateTarget(x, y, direction, animState);
      },
      onPlayerLeft: (id) => {
        this.remotePlayers.get(id)?.destroy();
        this.remotePlayers.delete(id);
      },
      onRoomFull: () => {
        window.alert("拠点は満員です(最大4人まで)。しばらくしてから再度お試しください。");
        window.location.reload();
      },
      onBuildingPlaced: (building) => {
        this.buildings.push(building);
        this.addBuildingSprite(building);
      },
      onGameReset: () => {
        for (const building of this.buildings) {
          if (building.buildingType === "bridge") this.revertBridgeTile(building.x, building.y);
        }
        this.buildings = [];
        for (const building of this.buildingSprites) building.destroy();
        this.buildingSprites = [];
        this.flowerBedPlantedAt.clear();
        for (const plot of this.farmPlots) plot.destroy();
        this.farmPlots = [];
        for (const torch of this.torches) torch.destroy();
        this.torches = [];
        for (const bed of this.beds) bed.destroy();
        this.beds = [];
        this.pet?.destroy();
        this.pet = null;
        this.respawnPoint = { x: SPAWN_X, y: SPAWN_Y };
        this.clearWorldContent();
        this.inventory.reset();
        this.experience.reset();
        this.syncMaxHpFromLevel();
        this.health.reset();
        this.stamina.reset();
        this.equipment.reset();
        this.tools.reset();
        this.quests.reset();
        this.affinity.reset();
        this.handTorchGlow?.destroy();
        this.handTorchGlow = undefined;
        const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
        body.reset(SPAWN_X, SPAWN_Y);
      },
      onGameLoaded: (slot, buildings) => {
        for (const building of this.buildings) {
          if (building.buildingType === "bridge") this.revertBridgeTile(building.x, building.y);
        }
        this.buildings = buildings;
        for (const building of this.buildingSprites) building.destroy();
        this.buildingSprites = [];
        this.flowerBedPlantedAt.clear();
        for (const plot of this.farmPlots) plot.destroy();
        this.farmPlots = [];
        for (const torch of this.torches) torch.destroy();
        this.torches = [];
        for (const bed of this.beds) bed.destroy();
        this.beds = [];
        this.respawnPoint = { x: SPAWN_X, y: SPAWN_Y };
        for (const building of buildings) this.addBuildingSprite(building);

        // 自分が要求したロードの場合のみ、個人の持ち物・HPも復元する(他プレイヤーの分は変えない)
        if (this.pendingLoadSlot === slot) {
          this.pendingLoadSlot = null;
          const data = loadSlot(slot);
          if (data) {
            this.inventory.setCounts(data.counts);
            this.health.setHp(data.hp);
          }
        }
        this.showFloatingMessage(`スロット${slot}をロードしました`);
      },
      onLoadFailed: (slot) => {
        this.pendingLoadSlot = null;
        this.showFloatingMessage(`スロット${slot}は空です`);
      },
      onExportData: (slot, buildings) => {
        if (this.pendingExportSlot !== slot) return;
        this.pendingExportSlot = null;
        const local = loadSlot(slot);
        if (!local) return;
        const file = buildExportFile(slot, local.counts, local.hp, buildings);
        downloadJsonFile(`open-world-game-slot${slot}.json`, file);
        this.showFloatingMessage(`スロット${slot}をエクスポートしました`);
      },
      onExportFailed: (slot) => {
        this.pendingExportSlot = null;
        this.showFloatingMessage(`スロット${slot}は空です`);
      },
    });
  }

  // ---------- セーブ/ロード ----------

  private handleSave(slot: number): void {
    saveSlot(slot, this.inventory.getCounts(), this.health.getHp());
    this.roomClient.sendSaveGame(slot);
    this.showFloatingMessage(`スロット${slot}にセーブしました`);
  }

  private handleDelete(slot: number): void {
    deleteSlot(slot);
    this.roomClient.sendDeleteGame(slot);
    this.showFloatingMessage(`スロット${slot}を削除しました`);
  }

  private handleLoad(slot: number): void {
    this.pendingLoadSlot = slot;
    this.roomClient.sendLoadGame(slot);
  }

  private handleExport(slot: number): void {
    if (!loadSlot(slot)) return;
    this.pendingExportSlot = slot;
    this.roomClient.sendExportGame(slot);
  }

  private handleImport(slot: number, data: ExportedSaveFile): void {
    saveSlot(slot, data.counts, data.hp);
    this.pendingLoadSlot = slot;
    this.roomClient.sendImportGame(slot, data.buildings);
  }

  private addRemotePlayer(player: PlayerState): void {
    if (this.remotePlayers.has(player.id)) return;
    this.remotePlayers.set(player.id, new RemotePlayer(this, player));
  }

  update(_time: number, delta: number): void {
    const moveState = this.inputManager.getMoveState();
    // ポケモンの自転車を参考に、所持していればスタミナを気にせずダッシュし続けられる
    const hasBicycle = this.tools.has("bicycle");
    const sprinting =
      moveState.moving && this.inputManager.isSprintRequested() && (hasBicycle || this.stamina.canSprint());
    this.player.update(moveState, sprinting);
    this.stamina.tick(delta, sprinting && !hasBicycle);
    this.boss?.updateNameLabel();
    this.pet?.followUpdate(this.player.sprite.x, this.player.sprite.y);

    for (const remote of this.remotePlayers.values()) {
      remote.tick();
    }

    this.updateDayNightCycle();
    this.updateWeather();
    this.updateMinimap();
    this.updatePoison();

    this.sinceLastSend += delta;
    if (this.sinceLastSend >= NETWORK_TICK_MS) {
      this.sinceLastSend = 0;
      this.sendLocalStateIfChanged();
    }
  }

  // ---------- 昼夜サイクル ----------

  private updateDayNightCycle(): void {
    const progress = getCycleProgress(Date.now());
    const intensity = getNightIntensity(progress);
    this.nightOverlay.setFillStyle(NIGHT_OVERLAY_COLOR, intensity * NIGHT_OVERLAY_MAX_ALPHA);

    // 牧場物語風に、夜はNPCが眠って徘徊をやめる(setSleeping内で状態が変わらなければ何もしない)
    const night = isNight(progress);
    for (const npc of this.npcs) {
      npc.setSleeping(this, night);
    }

    if (this.tools.has("handTorch")) {
      if (!this.handTorchGlow) {
        ensureTorchTextures(this);
        this.handTorchGlow = this.add.image(this.player.sprite.x, this.player.sprite.y, TORCH_GLOW_TEXTURE_KEY);
        this.handTorchGlow.setBlendMode(Phaser.BlendModes.ADD);
        this.handTorchGlow.setDepth(16);
      }
      this.handTorchGlow.setPosition(this.player.sprite.x, this.player.sprite.y);
    }
  }

  // ---------- 天候(雨) ----------

  private updateWeather(): void {
    const raining = isRaining(Date.now());
    if (raining !== this.isCurrentlyRaining) {
      this.isCurrentlyRaining = raining;
      if (raining) this.rainEmitter.start();
      else this.rainEmitter.stop();
    }
    this.rainOverlay.setFillStyle(RAIN_OVERLAY_COLOR, raining ? RAIN_OVERLAY_ALPHA : 0);
  }

  // ---------- ミニマップ ----------

  private updateMinimap(): void {
    const points: MinimapPoint[] = [];
    for (const shop of this.shops) {
      points.push({ x: shop.worldX, y: shop.worldY, color: "#4ade80" });
    }
    for (const npc of this.npcs) {
      points.push({ x: npc.worldX, y: npc.worldY, color: "#60a5fa" });
    }
    for (const building of this.buildingSprites) {
      points.push({ x: building.sprite.x, y: building.sprite.y, color: "#facc15" });
    }
    for (const monster of this.monsters) {
      points.push({ x: monster.sprite.x, y: monster.sprite.y, color: monster.isBoss ? "#dc2626" : "#f87171" });
    }
    if (this.pet) {
      points.push({ x: this.pet.sprite.x, y: this.pet.sprite.y, color: "#22d3ee" });
    }
    const season = getSeason(Date.now());
    const seasonLabel = `${SEASON_ICON[season]} ${SEASON_NAME[season]}`;
    this.minimap.render(this.player.sprite.x, this.player.sprite.y, points, seasonLabel);
  }

  private ensureRainDropTexture(): void {
    if (this.textures.exists("rain-drop")) return;
    const g = this.add.graphics();
    g.lineStyle(2, 0xbfd9f7, 1);
    g.lineBetween(2, 0, -3, 14);
    g.generateTexture("rain-drop", 8, 16);
    g.destroy();
  }

  // ---------- ワールド構築 ----------

  private buildWorld(): void {
    const map = this.make.tilemap({ key: "world" });
    const tileset = map.addTilesetImage("tileset", "tiles");
    if (!tileset) {
      throw new Error("タイルセットの読み込みに失敗しました");
    }

    const groundLayer = map.createLayer("ground", tileset, 0, 0);
    const obstacleLayer = map.createLayer("obstacles", tileset, 0, 0);
    if (!groundLayer || !obstacleLayer) {
      throw new Error("マップレイヤーの作成に失敗しました");
    }
    groundLayer.setCollision(WATER_GID);
    obstacleLayer.setCollision(ROCK_GID);
    this.groundLayer = groundLayer;
    this.obstacleLayer = obstacleLayer;

    const mapWidthPx = map.widthInPixels;
    const mapHeightPx = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.minimap = new Minimap(mapWidthPx, mapHeightPx);

    this.physics.add.collider(this.player.sprite, groundLayer);
    this.physics.add.collider(this.player.sprite, obstacleLayer);

    // 昼夜サイクルの暗さを表現するオーバーレイ(カメラに固定し、UI用の文字表示より下に描画する)
    this.nightOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, NIGHT_OVERLAY_COLOR, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(15);

    // 天候(雨)の暗さオーバーレイと雨粒パーティクル(どちらもカメラに固定)
    this.rainOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, RAIN_OVERLAY_COLOR, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(14);
    this.ensureRainDropTexture();
    this.rainEmitter = this.add
      .particles(0, 0, "rain-drop", {
        x: { min: 0, max: this.scale.width },
        y: -10,
        lifespan: 700,
        speedY: { min: 260, max: 340 },
        speedX: { min: -20, max: -10 },
        alpha: { start: 0.6, end: 0.2 },
        quantity: 2,
        frequency: 40,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(14);

    // モンスターの再出現先を選ぶための、歩行可能なタイル座標一覧(水・岩以外)
    this.walkableTiles = [];
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const isWater = groundLayer.getTileAt(tx, ty)?.index === WATER_GID;
        const isRock = obstacleLayer.getTileAt(tx, ty)?.index === ROCK_GID;
        if (!isWater && !isRock) this.walkableTiles.push({ x: tx, y: ty });
      }
    }

    const npcLayer = map.getObjectLayer("npcs");
    if (npcLayer) {
      npcLayer.objects.forEach((obj, index) => {
        const npcName = obj.properties?.find((p: { name: string }) => p.name === "npcName")
          ?.value as string | undefined;
        const dialogue = obj.properties?.find((p: { name: string }) => p.name === "dialogue")
          ?.value as string | undefined;
        if (!npcName || !dialogue) return;
        const x = (obj.x ?? 0) + (obj.width ?? TILE_SIZE) / 2;
        const y = (obj.y ?? 0) + (obj.height ?? TILE_SIZE) / 2;
        this.npcs.push(new Npc(this, x, y, index % 2, npcName, dialogue));
      });
    }

    const shopLayer = map.getObjectLayer("shops");
    if (shopLayer) {
      for (const obj of shopLayer.objects) {
        const x = (obj.x ?? 0) + (obj.width ?? TILE_SIZE) / 2;
        const y = (obj.y ?? 0) + (obj.height ?? TILE_SIZE) / 2;
        this.shops.push(new Shop(this, x, y));
      }
    }

    for (const building of this.buildings) {
      this.addBuildingSprite(building);
    }
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    if (building.buildingType === "farm_plot") {
      this.farmPlots.push(new FarmPlot(this, building.x, building.y));
      return;
    }
    if (building.buildingType === "bridge") {
      this.applyBridgeTile(building.x, building.y);
      return;
    }
    if (building.buildingType === "torch") {
      this.torches.push(new Torch(this, building.x, building.y));
      return;
    }
    if (building.buildingType === "bed") {
      this.beds.push(new Bed(this, building.x, building.y));
      return;
    }
    const sprite = new Building(this, building.x, building.y, building.buildingType as BuildingType);
    this.buildingSprites.push(sprite);
    if (sprite.solid) {
      this.physics.add.collider(this.player.sprite, sprite.sprite);
    }
    if (sprite.buildingType === "flower_bed") {
      this.flowerBedPlantedAt.set(sprite, Date.now());
    }
  }

  /** 橋はBuildingスプライトとしてではなく、水面タイルを橋タイルへ書き換えることで表現する(同じbuildings配列を使い、通行可否もタイル判定に乗る) */
  private applyBridgeTile(worldX: number, worldY: number): void {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    this.groundLayer?.putTileAt(BRIDGE_GID, tileX, tileY)?.setCollision(false);
  }

  private revertBridgeTile(worldX: number, worldY: number): void {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    this.groundLayer?.putTileAt(WATER_GID, tileX, tileY)?.setCollision(true);
  }

  // ---------- ルームごとのランダム配置(采集ポイント・モンスター・動物・岩) ----------

  /** サーバーから受け取ったworldSeedをもとに、決定的な擬似乱数で采集ポイント等を配置する */
  private placeWorldContent(seed: number): void {
    const avoidPoints: { x: number; y: number }[] = [
      { x: SPAWN_X, y: SPAWN_Y },
      ...this.npcs.map((npc) => ({ x: npc.worldX, y: npc.worldY })),
      ...this.shops.map((shop) => ({ x: shop.worldX, y: shop.worldY })),
    ];
    const plan = generateWorldContent(seed, this.walkableTiles, TILE_SIZE, avoidPoints);

    for (const point of plan.gathering) {
      this.gatheringPoints.push(new GatheringPoint(this, point.x, point.y, point.itemId));
    }
    for (const point of plan.monsters) {
      this.spawnMonster(point.x, point.y);
    }
    const bossPos = this.pickRandomWalkableWorldPos();
    if (bossPos) this.spawnMonster(bossPos.x, bossPos.y, true);
    for (const point of plan.animals) {
      this.spawnAnimal(point.x, point.y);
    }
    for (const point of plan.rocks) {
      this.spawnRock(point.x, point.y);
    }
    for (const point of plan.chests) {
      this.spawnChest(point.x, point.y);
    }
  }

  /** 再接続時にworldSeedが変わっている場合に備えて、以前のランダム配置を消しておく */
  private clearWorldContent(): void {
    for (const gp of this.gatheringPoints) gp.destroy();
    this.gatheringPoints = [];
    for (const monster of this.monsters) monster.destroy();
    this.monsters = [];
    this.boss = null;
    for (const overlap of this.monsterOverlaps) overlap.destroy();
    this.monsterOverlaps = [];
    for (const animal of this.animals) animal.destroy();
    this.animals = [];
    for (const rock of this.rocks) rock.destroy();
    this.rocks = [];
    for (const chest of this.chests) chest.destroy();
    this.chests = [];
  }

  // ---------- 岩(拾って再配置できる障害物) ----------

  private spawnRock(x: number, y: number): void {
    const rock = new Rock(this, x, y);
    this.rocks.push(rock);
    this.physics.add.collider(this.player.sprite, rock.sprite);
  }

  // ---------- 宝箱 ----------

  private spawnChest(x: number, y: number): void {
    this.chests.push(new Chest(this, x, y));
  }

  private scheduleChestRespawn(): void {
    this.time.delayedCall(CHEST_RESPAWN_DELAY_MS, () => {
      const pos = this.pickRandomWalkableWorldPos();
      if (!pos) return;
      this.spawnChest(pos.x, pos.y);
    });
  }

  // ---------- モンスター ----------

  private spawnMonster(x: number, y: number, isBoss = false, isMini = false, bossTier = 0): void {
    const rareChance = isNight(getCycleProgress(Date.now()))
      ? RARE_MONSTER_CHANCE * NIGHT_RARE_MONSTER_MULTIPLIER
      : RARE_MONSTER_CHANCE;
    const isRare = !isBoss && !isMini && Math.random() < rareChance;
    const monster = new Monster(this, x, y, isRare, isBoss, isMini, bossTier);
    this.monsters.push(monster);
    if (isBoss) this.boss = monster;
    if (this.groundLayer) this.physics.add.collider(monster.sprite, this.groundLayer);
    if (this.obstacleLayer) this.physics.add.collider(monster.sprite, this.obstacleLayer);
    this.monsterOverlaps.push(
      this.physics.add.overlap(this.player.sprite, monster.sprite, () => {
        this.handleMonsterContact(monster);
      }),
    );
  }

  private scheduleBossRespawn(bossTier: number): void {
    this.time.delayedCall(BOSS_RESPAWN_DELAY_MS, () => {
      const pos = this.pickRandomWalkableWorldPos();
      if (!pos) return;
      this.spawnMonster(pos.x, pos.y, true, false, bossTier);
    });
  }

  private pickRandomWalkableWorldPos(): { x: number; y: number } | null {
    if (this.walkableTiles.length === 0) return null;

    let best: { x: number; y: number } | null = null;
    let bestDist = -1;
    for (let attempt = 0; attempt < 10; attempt++) {
      const tile = Phaser.Utils.Array.GetRandom(this.walkableTiles);
      const worldX = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = tile.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(worldX, worldY, this.player.sprite.x, this.player.sprite.y);
      if (dist >= MONSTER_RESPAWN_MIN_DIST) return { x: worldX, y: worldY };
      if (dist > bestDist) {
        bestDist = dist;
        best = { x: worldX, y: worldY };
      }
    }
    return best;
  }

  private scheduleMonsterRespawn(): void {
    // マインクラフトのように、夜は敵の再出現が早まる
    const night = isNight(getCycleProgress(Date.now()));
    const delay = night ? MONSTER_RESPAWN_DELAY_MS / 2 : MONSTER_RESPAWN_DELAY_MS;
    this.time.delayedCall(delay, () => {
      const pos = this.pickRandomWalkableWorldPos();
      if (!pos) return;
      this.spawnMonster(pos.x, pos.y);
    });
  }

  // ---------- 動物 ----------

  private spawnAnimal(x: number, y: number): void {
    const isShiny = Math.random() < SHINY_ANIMAL_CHANCE;
    const animal = new Animal(this, x, y, isShiny);
    this.animals.push(animal);
    if (this.groundLayer) this.physics.add.collider(animal.sprite, this.groundLayer);
    if (this.obstacleLayer) this.physics.add.collider(animal.sprite, this.obstacleLayer);
  }

  private scheduleAnimalRespawn(): void {
    this.time.delayedCall(ANIMAL_RESPAWN_DELAY_MS, () => {
      const pos = this.pickRandomWalkableWorldPos();
      if (!pos) return;
      this.spawnAnimal(pos.x, pos.y);
    });
  }

  // ---------- クラフト ----------

  private handleCraft(recipe: Recipe): void {
    if (recipe.effect.type === "weapon" && this.equipment.getOwned().includes(recipe.effect.weaponId)) {
      return;
    }
    if (recipe.effect.type === "tool" && this.tools.has(recipe.effect.toolId)) {
      return;
    }
    if (recipe.effect.type === "upgrade" && !this.equipment.canUpgrade(recipe.effect.weaponId)) {
      return;
    }
    if (recipe.effect.type === "armor" && this.equipment.getOwnedArmor().includes(recipe.effect.armorId)) {
      return;
    }

    if (recipe.effect.type === "building" && recipe.effect.buildingType === "bridge") {
      this.handleCraftBridge(recipe.name, recipe.inputs);
      return;
    }

    if (!this.inventory.spend(recipe.inputs)) return;

    if (recipe.effect.type === "weapon") {
      this.equipment.acquire(recipe.effect.weaponId);
      this.craftMenu.refresh();
      this.sound.play("sfx-craft", { volume: 0.5 });
      this.showFloatingMessage(`${recipe.name}を作った!`);
      return;
    }

    if (recipe.effect.type === "tool") {
      this.tools.acquire(recipe.effect.toolId);
      this.craftMenu.refresh();
      this.sound.play("sfx-craft", { volume: 0.5 });
      this.showFloatingMessage(`${recipe.name}を作った!`);
      return;
    }

    if (recipe.effect.type === "upgrade") {
      this.equipment.upgrade(recipe.effect.weaponId);
      this.craftMenu.refresh();
      this.sound.play("sfx-craft", { volume: 0.5 });
      this.showFloatingMessage(`⚒️ 強化した!(Lv.${this.equipment.getUpgradeLevel(recipe.effect.weaponId)})`);
      return;
    }

    if (recipe.effect.type === "armor") {
      this.equipment.acquireArmor(recipe.effect.armorId);
      this.craftMenu.refresh();
      this.sound.play("sfx-craft", { volume: 0.5 });
      this.showFloatingMessage(`${recipe.name}を作った!`);
      return;
    }

    if (recipe.effect.type === "item") {
      this.inventory.add(recipe.effect.itemId, recipe.effect.amount);
      this.sound.play("sfx-craft", { volume: 0.5 });
      this.showFloatingMessage(`${recipe.name}を作った!`);
      return;
    }

    const x = Math.round(this.player.sprite.x);
    const y = Math.round(this.player.sprite.y);
    const building: PlacedBuilding = {
      id: crypto.randomUUID(),
      buildingType: recipe.effect.buildingType,
      x,
      y,
    };
    this.buildings.push(building);
    this.addBuildingSprite(building);
    this.roomClient.sendCraftBuilding(recipe.effect.buildingType, x, y);

    this.sound.play("sfx-craft", { volume: 0.5 });
    this.showFloatingMessage(`${recipe.name}を作った!`);
  }

  /** 橋は建物としてではなく、向いている方向の水面タイルを橋タイルに書き換える形で設置する */
  private handleCraftBridge(name: string, inputs: Partial<Record<ItemId, number>>): void {
    const offset = SHIFT_ACTION_OFFSET[this.player.currentDirection];
    const tileX = Math.floor(this.player.sprite.x / TILE_SIZE) + offset.x;
    const tileY = Math.floor(this.player.sprite.y / TILE_SIZE) + offset.y;
    const tile = this.groundLayer?.getTileAt(tileX, tileY);
    if (!tile || tile.index !== WATER_GID) {
      this.showFloatingMessage("水面に向かって橋をかけてください");
      return;
    }

    if (!this.inventory.spend(inputs)) return;

    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;
    const building: PlacedBuilding = {
      id: crypto.randomUUID(),
      buildingType: "bridge",
      x: worldX,
      y: worldY,
    };
    this.buildings.push(building);
    this.addBuildingSprite(building);
    this.roomClient.sendCraftBuilding("bridge", worldX, worldY);

    this.sound.play("sfx-craft", { volume: 0.5 });
    this.showFloatingMessage(`${name}を作った!`);
  }

  private showFloatingMessage(message: string): void {
    const text = this.add
      .text(this.player.sprite.x, this.player.sprite.y - 20, message, {
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      y: text.y - 12,
      alpha: 0,
      duration: 1200,
      delay: 400,
      onComplete: () => text.destroy(),
    });
  }

  // ---------- 回復 ----------

  private handleHeal(): void {
    const atFullHp = this.health.getHp() >= this.health.getMaxHp();
    const isPoisoned = this.time.now < this.poisonedUntil;
    if (atFullHp && !isPoisoned) return;
    if (!this.inventory.spend({ herb: 1 })) {
      this.showFloatingMessage("🌿が足りません");
      return;
    }
    if (!atFullHp) this.health.heal(1);
    this.sound.play("sfx-gather", { volume: 0.4 });
    if (isPoisoned) {
      this.poisonedUntil = 0;
      this.showFloatingMessage(atFullHp ? "毒が治った(-1 🌿)" : "回復した・毒も治った(-1 🌿)");
    } else {
      this.showFloatingMessage("回復した(-1 🌿)");
    }
  }

  // ---------- ショップ ----------

  private handleSell(itemId: ItemId): void {
    if (SHOP_SELL_PRICES[itemId] === undefined) return;
    const now = Date.now();
    const price = getEffectiveSellPrice(itemId, now);
    if (!this.inventory.spend({ [itemId]: 1 } as Partial<Record<ItemId, number>>)) return;
    this.inventory.add("coin", price);
    const isSpecial = itemId === getDailySpecialItem(now);
    this.showFloatingMessage(isSpecial ? `⭐本日のおすすめ!売った(+${price} 💰)` : `売った(+${price} 💰)`);
  }

  private handleBuy(itemId: ItemId): void {
    const price = SHOP_BUY_PRICES[itemId];
    if (!price) return;
    if (!this.inventory.spend({ coin: price })) {
      this.showFloatingMessage("💰が足りません");
      return;
    }
    this.inventory.add(itemId, 1);
    this.showFloatingMessage(`買った(-${price} 💰)`);
  }

  // ---------- 倉庫 ----------

  private handleDeposit(itemId: ItemId): void {
    if (!this.inventory.spend({ [itemId]: 1 } as Partial<Record<ItemId, number>>)) return;
    this.storage.add(itemId, 1);
  }

  private handleWithdraw(itemId: ItemId): void {
    if (!this.storage.spend({ [itemId]: 1 } as Partial<Record<ItemId, number>>)) return;
    this.inventory.add(itemId, 1);
  }

  // ---------- 経験値・レベル ----------

  /** レベルに応じた最大HPの上乗せ分をHealthに反映する(増えた分は現在HPにも加算される) */
  private syncMaxHpFromLevel(): void {
    this.health.setMaxHp(PLAYER_MAX_HP + this.experience.getBonusMaxHp());
  }

  /** 装備の攻撃力にレベルボーナスを加えた、実際に敵へ与えるダメージ */
  private getPlayerDamage(): number {
    return this.equipment.getDamage() + this.experience.getBonusDamage();
  }

  private rollCritical(): boolean {
    return Math.random() < CRIT_CHANCE;
  }

  /** DQ風の会心の一撃を考慮した、実際に敵へ与える攻撃ダメージ(通常攻撃・とくぎ共通) */
  private computeAttackDamage(multiplier = 1): { damage: number; isCrit: boolean } {
    const isCrit = this.rollCritical();
    const base = this.getPlayerDamage() * multiplier;
    return { damage: isCrit ? base * CRIT_MULTIPLIER : base, isCrit };
  }

  /** 経験値を加算し、レベルが上がっていればHPボーナスを反映してメッセージを出す */
  private grantExp(amount: number): void {
    const newLevel = this.experience.add(amount);
    if (newLevel === null) return;
    this.syncMaxHpFromLevel();
    this.showFloatingMessage(`レベルアップ!Lv.${newLevel}`);
  }

  // ---------- 戦闘 ----------

  private handleMonsterContact(monster: Monster): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + CONTACT_INVULN_MS;

    if (Math.random() < this.equipment.getBlockChance()) {
      this.showFloatingMessage("🛡️ 防いだ!");
      return;
    }

    this.sound.play("sfx-hurt", { volume: 0.5 });
    const defeated = this.health.damage(CONTACT_DAMAGE);
    this.player.sprite.setTint(0xff5555);
    this.time.delayedCall(200, () => {
      if (this.player.sprite.active) this.player.sprite.clearTint();
    });

    if ((monster.isRare || monster.isBoss) && Math.random() < POISON_CHANCE) {
      this.poisonedUntil = Math.max(this.poisonedUntil, now + POISON_DURATION_MS);
      this.nextPoisonTickAt = now + POISON_TICK_MS;
      this.showFloatingMessage("🤢 毒を受けた…");
    }

    if (defeated) {
      this.respawnAtBase();
    }
  }

  private respawnAtBase(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(this.respawnPoint.x, this.respawnPoint.y);
      this.health.reset();
      this.poisonedUntil = 0;
      this.cameras.main.fadeIn(200, 0, 0, 0);
      this.showFloatingMessage("気を失った…拠点で目が覚めた");
    });
  }

  // ---------- 毒(状態異常) ----------

  private updatePoison(): void {
    const now = this.time.now;
    if (now >= this.poisonedUntil) return;
    if (now < this.nextPoisonTickAt) return;

    this.nextPoisonTickAt = now + POISON_TICK_MS;
    const defeated = this.health.damage(POISON_DAMAGE_PER_TICK);
    this.showFloatingMessage("🤢 毒でダメージを受けた");
    if (defeated) {
      this.poisonedUntil = 0;
      this.respawnAtBase();
    }
  }

  /** モンスターが倒れた時の共通処理(報酬・分裂・経験値・リスポーン)。通常攻撃・とくぎ両方から呼ばれる */
  private resolveMonsterDeath(monster: Monster): void {
    this.monsters = this.monsters.filter((m) => m !== monster);
    const rewardMultiplier = monster.isBoss
      ? BOSS_REWARD_MULTIPLIER * (1 + monster.bossTier * BOSS_TIER_REWARD_STEP)
      : monster.isRare
        ? RARE_MONSTER_REWARD_MULTIPLIER
        : monster.isMini
          ? MINI_REWARD_MULTIPLIER
          : 1;
    const coinReward = Math.max(1, Math.round(2 * rewardMultiplier));
    this.inventory.add("coin", coinReward);
    this.showGatherFeedback(monster.sprite.x, monster.sprite.y, "coin", coinReward);
    const deathX = monster.sprite.x;
    const deathY = monster.sprite.y;
    const shouldSplit = monster.canSplit;
    monster.destroy();
    if (monster.isBoss) {
      this.boss = null;
      this.scheduleBossRespawn(monster.bossTier + 1);
    } else if (!monster.isMini) {
      this.scheduleMonsterRespawn();
    }
    if (shouldSplit) {
      for (let i = 0; i < SLIME_SPLIT_COUNT; i++) {
        const angle = Phaser.Math.Angle.Random();
        const sx = deathX + Math.cos(angle) * SLIME_SPLIT_OFFSET;
        const sy = deathY + Math.sin(angle) * SLIME_SPLIT_OFFSET;
        this.spawnMonster(sx, sy, false, true);
      }
    }
    this.grantExp(MONSTER_EXP * rewardMultiplier);
    this.stats.recordMonsterDefeat(monster.isRare);
    if (monster.isBoss) {
      this.stats.recordBossDefeated();
      this.showFloatingMessage("👑 ボスを倒した!");
    } else if (monster.isRare) {
      this.showFloatingMessage("★ レアモンスターを倒した!");
    } else if (shouldSplit) {
      this.showFloatingMessage("スライムが分裂した!");
    }
  }

  private tryAttack(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    // 牧場物語風に、相棒(なついた動物)をクリックすると用意できたミルクを集められる
    if (this.pet) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, this.pet.sprite.x, this.pet.sprite.y);
      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, this.pet.sprite.x, this.pet.sprite.y);
      if (clickDist <= ATTACK_CLICK_RADIUS && reachDist <= ATTACK_REACH_RADIUS) {
        const result = this.pet.collectProduce(this);
        if (result.collected) {
          this.inventory.add("milk", 1);
          this.stats.recordGather("milk", 1);
          this.showGatherFeedback(this.pet.sprite.x, this.pet.sprite.y, "milk", 1);
          this.sound.play("sfx-gather", { volume: 0.5 });
          if (result.leveledUp) {
            this.showFloatingMessage(`🎉 相棒がレベルアップ!(Lv.${this.pet.petLevel})`);
          }
        } else {
          this.showFloatingMessage("🐾 まだ用意中…");
        }
        return true;
      }
    }

    type Target = { kind: "monster"; obj: Monster } | { kind: "animal"; obj: Animal };
    let closest: Target | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const monster of this.monsters) {
      const clickDist = Phaser.Math.Distance.Between(
        point.worldX,
        point.worldY,
        monster.sprite.x,
        monster.sprite.y,
      );
      if (clickDist > ATTACK_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, monster.sprite.x, monster.sprite.y);
      if (reachDist > ATTACK_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = { kind: "monster", obj: monster };
        closestDist = clickDist;
      }
    }

    for (const animal of this.animals) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, animal.sprite.x, animal.sprite.y);
      if (clickDist > ATTACK_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, animal.sprite.x, animal.sprite.y);
      if (reachDist > ATTACK_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = { kind: "animal", obj: animal };
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    if (closest.kind === "monster") {
      this.sound.play("sfx-attack", { volume: 0.5 });
      const monster = closest.obj;
      const { damage, isCrit } = this.computeAttackDamage();
      const died = monster.takeDamage(this, damage);
      if (isCrit) this.showFloatingMessage("💥 会心の一撃!");
      if (died) this.resolveMonsterDeath(monster);
      return true;
    }

    const animal = closest.obj;

    // 牧場物語を参考に、作物を持っていれば攻撃の代わりに餌をあげてなかよくなれる。
    // ポケモン風に、なついた動物はその場で消える代わりにプレイヤーについてくる相棒になる(1匹まで)
    const feedItem = FEED_ITEMS.find((id) => this.inventory.getCounts()[id] > 0);
    if (feedItem) {
      this.inventory.spend({ [feedItem]: 1 } as Partial<Record<ItemId, number>>);
      this.animals = this.animals.filter((a) => a !== animal);
      this.pet?.destroy();
      this.pet = animal;
      animal.startFollowing(this);
      const rewardMultiplier = animal.isShiny ? SHINY_ANIMAL_REWARD_MULTIPLIER : 1;
      const coinReward = ANIMAL_FEED_COIN_REWARD * rewardMultiplier;
      this.inventory.add("coin", coinReward);
      this.showGatherFeedback(animal.sprite.x, animal.sprite.y, "coin", coinReward);
      this.showFloatingMessage(
        animal.isShiny ? "✨ 色違いの動物となかよくなった!" : "🐾 なついて相棒になった!",
      );
      this.sound.play("sfx-gather", { volume: 0.5 });
      this.scheduleAnimalRespawn();
      this.grantExp(ANIMAL_EXP * ANIMAL_FEED_EXP_MULTIPLIER * rewardMultiplier);
      this.stats.recordAnimalBefriended();
      return true;
    }

    this.sound.play("sfx-attack", { volume: 0.5 });
    const { damage: animalDamage, isCrit: animalIsCrit } = this.computeAttackDamage();
    const died = animal.takeDamage(this, animalDamage);
    if (animalIsCrit) this.showFloatingMessage("💥 会心の一撃!");
    if (died) {
      this.animals = this.animals.filter((a) => a !== animal);
      this.inventory.add("meat", 1);
      this.showGatherFeedback(animal.sprite.x, animal.sprite.y, "meat", 1);
      animal.destroy();
      this.scheduleAnimalRespawn();
      this.grantExp(ANIMAL_EXP);
      this.stats.recordAnimalDefeat();
    }
    return true;
  }

  // ---------- 会話 ----------

  private tryTalk(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Npc | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const npc of this.npcs) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, npc.worldX, npc.worldY);
      if (clickDist > TALK_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, npc.worldX, npc.worldY);
      if (reachDist > TALK_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = npc;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    if (closest.isSleeping) {
      this.showFloatingMessage(`💤 ${closest.npcName}は眠っている…`);
      return true;
    }

    this.sound.play("sfx-talk", { volume: 0.5 });

    const quest = getQuestForNpc(closest.npcName);
    if (quest && !this.quests.isCompleted(closest.npcName)) {
      const spent = this.inventory.spend({
        [quest.requestItem]: quest.requestAmount,
      } as Partial<Record<ItemId, number>>);
      if (spent) {
        this.quests.complete(closest.npcName);
        this.inventory.add("coin", quest.rewardCoin);
        this.grantExp(quest.rewardExp);
        this.showDialogue(closest.worldX, closest.worldY, closest.npcName, quest.completeDialogue);
        this.showGatherFeedback(closest.worldX, closest.worldY, "coin", quest.rewardCoin);
      } else {
        this.showDialogue(closest.worldX, closest.worldY, closest.npcName, quest.askDialogue);
      }
      return true;
    }

    // 牧場物語風、クエスト達成後も同じ好物を渡すと少しずつなかよくなれる
    if (quest && this.inventory.spend({ [quest.requestItem]: 1 } as Partial<Record<ItemId, number>>)) {
      const reachedMilestone = this.affinity.add(closest.npcName);
      this.stats.recordGiftGiven();
      this.inventory.add("coin", 1);
      this.showGatherFeedback(closest.worldX, closest.worldY, "coin", 1);
      if (reachedMilestone) {
        const bonus = AFFINITY_MILESTONE_STEP;
        this.inventory.add("coin", bonus);
        this.grantExp(bonus);
        this.showDialogue(closest.worldX, closest.worldY, closest.npcName, "すっかりなかよしね!これはお礼よ。");
      } else {
        this.showDialogue(closest.worldX, closest.worldY, closest.npcName, "また持ってきてくれたのね、ありがとう!");
      }
      return true;
    }

    const dialogue = quest ? quest.thanksDialogue : closest.dialogue;
    this.showDialogue(closest.worldX, closest.worldY, closest.npcName, dialogue);
    return true;
  }

  private showDialogue(x: number, y: number, npcName: string, dialogue: string): void {
    const text = this.add
      .text(x, y - 22, `${npcName}: ${dialogue}`, {
        fontSize: "9px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 5, y: 4 },
        wordWrap: { width: 160 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 800,
      delay: 2600,
      onComplete: () => text.destroy(),
    });
  }

  // ---------- 畑 ----------

  private tryFarm(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: FarmPlot | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const plot of this.farmPlots) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, plot.worldX, plot.worldY);
      if (clickDist > FARM_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, plot.worldX, plot.worldY);
      if (reachDist > FARM_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = plot;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    if (closest.isReady) {
      const harvested = closest.harvest();
      if (harvested) {
        this.inventory.add(harvested.itemId, harvested.amount);
        this.stats.recordGather(harvested.itemId, harvested.amount);
        this.sound.play("sfx-gather", { volume: 0.5 });
        this.showGatherFeedback(closest.worldX, closest.worldY, harvested.itemId, harvested.amount);
      }
      return true;
    }

    if (closest.isEmpty) {
      const counts = this.inventory.getCounts();
      const cropId = CROP_PRIORITY.find((id) => counts[CROP_CONFIG[id].seedItem] > 0);
      if (!cropId) {
        this.showFloatingMessage("たねが足りません");
        return true;
      }
      const seedItem = CROP_CONFIG[cropId].seedItem;
      if (!this.inventory.spend({ [seedItem]: 1 } as Partial<Record<ItemId, number>>)) {
        return true;
      }
      closest.plant(this, cropId);
      this.showFloatingMessage("種をまいた");
      return true;
    }

    if (this.tools.has("wateringCan") && closest.water(this)) {
      this.showFloatingMessage("💧 水をあげた");
      this.sound.play("sfx-gather", { volume: 0.4 });
      return true;
    }

    this.showFloatingMessage("育成中…");
    return true;
  }

  // ---------- ショップ ----------

  private tryShop(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Shop | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const shop of this.shops) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, shop.worldX, shop.worldY);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, shop.worldX, shop.worldY);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = shop;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.shopPanel.toggle();
    return true;
  }

  // ---------- 倉庫(建物のstorage_shedに話しかけると開く) ----------

  private tryStorage(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Building | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const building of this.buildingSprites) {
      if (building.buildingType !== "storage_shed") continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, building.sprite.x, building.sprite.y);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, building.sprite.x, building.sprite.y);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = building;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.storagePanel.toggle();
    return true;
  }

  // ---------- 井戸(建物のwellを使うとスタミナが全回復する) ----------

  private tryWell(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Building | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const building of this.buildingSprites) {
      if (building.buildingType !== "well") continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, building.sprite.x, building.sprite.y);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, building.sprite.x, building.sprite.y);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = building;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    if (this.stamina.getStamina() >= this.stamina.getMaxStamina()) {
      this.showFloatingMessage("スタミナは満タンだ");
      return true;
    }

    const now = this.time.now;
    if (now < this.nextWellAllowedAt) {
      this.showFloatingMessage("一休みしよう…");
      return true;
    }
    this.nextWellAllowedAt = now + WELL_COOLDOWN_MS;

    this.stamina.reset();
    this.sound.play("sfx-gather", { volume: 0.4 });
    this.showFloatingMessage("💧 スタミナが全回復した!");
    return true;
  }

  // ---------- 宿屋(コインを払うとHPが全回復する) ----------

  private tryInn(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Building | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const building of this.buildingSprites) {
      if (building.buildingType !== "inn") continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, building.sprite.x, building.sprite.y);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, building.sprite.x, building.sprite.y);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = building;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    const isPoisoned = this.time.now < this.poisonedUntil;
    if (this.health.getHp() >= this.health.getMaxHp() && !isPoisoned) {
      this.showFloatingMessage("元気いっぱいだ");
      return true;
    }

    if (!this.inventory.spend({ coin: INN_HEAL_COST } as Partial<Record<ItemId, number>>)) {
      this.showFloatingMessage(`💰が足りない(${INN_HEAL_COST}枚必要)`);
      return true;
    }

    this.health.reset();
    this.poisonedUntil = 0;
    this.sound.play("sfx-gather", { volume: 0.4 });
    this.showFloatingMessage(`🛏️ HPが全回復した!(-${INN_HEAL_COST}💰)`);
    return true;
  }

  // ---------- 花壇(時間経過でハーブが育つ) ----------

  private tryFlowerBed(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Building | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const building of this.buildingSprites) {
      if (building.buildingType !== "flower_bed") continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, building.sprite.x, building.sprite.y);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, building.sprite.x, building.sprite.y);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = building;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    const plantedAt = this.flowerBedPlantedAt.get(closest) ?? Date.now();
    const elapsed = Date.now() - plantedAt;
    const yieldAmount = Math.min(FLOWER_BED_MAX_YIELD, Math.floor(elapsed / FLOWER_BED_HERB_INTERVAL_MS));

    if (yieldAmount <= 0) {
      this.showFloatingMessage("🌱 まだ育っていない…");
      return true;
    }

    this.flowerBedPlantedAt.set(closest, Date.now());
    this.inventory.add("herb", yieldAmount);
    this.stats.recordGather("herb", yieldAmount);
    this.sound.play("sfx-gather", { volume: 0.5 });
    this.showGatherFeedback(closest.sprite.x, closest.sprite.y, "herb", yieldAmount);
    return true;
  }

  // ---------- 道しるべ(ヒント表示) ----------

  private trySignpost(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Building | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const building of this.buildingSprites) {
      if (building.buildingType !== "signpost") continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, building.sprite.x, building.sprite.y);
      if (clickDist > SHOP_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, building.sprite.x, building.sprite.y);
      if (reachDist > SHOP_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = building;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    // 同じ道しるべは常に同じヒントを示すよう、建物リスト内の位置から決定的に選ぶ
    const index = this.buildingSprites.indexOf(closest) % SIGNPOST_MESSAGES.length;
    this.showDialogue(closest.sprite.x, closest.sprite.y, "道しるべ", SIGNPOST_MESSAGES[index]);
    return true;
  }

  // ---------- アクション(採集・攻撃・会話など) ----------

  private handleAction(point: ActionPoint): void {
    if (this.tryAttack(point)) return;
    if (this.tryTalk(point)) return;
    if (this.tryShop(point)) return;
    if (this.tryStorage(point)) return;
    if (this.tryWell(point)) return;
    if (this.tryInn(point)) return;
    if (this.tryFlowerBed(point)) return;
    if (this.trySignpost(point)) return;
    if (this.tryFarm(point)) return;
    if (this.tryRock(point)) return;
    if (this.tryBed(point)) return;
    if (this.tryChest(point)) return;
    if (this.tryFish(point)) return;
    const harvested = this.tryGather(point);
    if (!harvested) {
      this.showActionFeedback(point.worldX, point.worldY);
    }
  }

  // ---------- 岩の採取(拾って石を入手) ----------

  private tryRock(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Rock | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const rock of this.rocks) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, rock.worldX, rock.worldY);
      if (clickDist > CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, rock.worldX, rock.worldY);
      if (reachDist > REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = rock;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.rocks = this.rocks.filter((r) => r !== closest);
    this.sound.play("sfx-gather", { volume: 0.5 });
    this.inventory.add("stone", 1);
    this.stats.recordGather("stone", 1);
    this.showGatherFeedback(closest.worldX, closest.worldY, "stone", 1);
    closest.destroy();
    return true;
  }

  // ---------- ベッド(復帰地点の設定) ----------

  private tryBed(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Bed | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const bed of this.beds) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, bed.worldX, bed.worldY);
      if (clickDist > CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, bed.worldX, bed.worldY);
      if (reachDist > REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = bed;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.respawnPoint = { x: closest.worldX, y: closest.worldY };
    this.sound.play("sfx-craft", { volume: 0.4 });
    this.showFloatingMessage("🛏 ここを復帰地点にした");
    return true;
  }

  // ---------- 宝箱を開ける ----------

  private tryChest(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Chest | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const chest of this.chests) {
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, chest.worldX, chest.worldY);
      if (clickDist > CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, chest.worldX, chest.worldY);
      if (reachDist > REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = chest;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.openChest(closest);
    return true;
  }

  private openChest(chest: Chest): void {
    this.chests = this.chests.filter((c) => c !== chest);
    const coinReward = Phaser.Math.Between(CHEST_MIN_COIN_REWARD, CHEST_MAX_COIN_REWARD);
    this.inventory.add("coin", coinReward);
    this.stats.recordChestOpened();
    this.showGatherFeedback(chest.worldX, chest.worldY, "coin", coinReward);
    this.showFloatingMessage("🎁 宝箱を開けた!");
    this.sound.play("sfx-craft", { volume: 0.5 });
    this.grantExp(CHEST_EXP);
    chest.destroy();
    this.scheduleChestRespawn();
  }

  // ---------- 釣り(水面をクリック/タップすると試みる) ----------

  private tryFish(point: ActionPoint): boolean {
    const dist = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      point.worldX,
      point.worldY,
    );
    if (dist > REACH_RADIUS) return false;

    const tileX = Math.floor(point.worldX / TILE_SIZE);
    const tileY = Math.floor(point.worldY / TILE_SIZE);
    const tile = this.groundLayer?.getTileAt(tileX, tileY);
    if (!tile || tile.index !== WATER_GID) return false;

    const now = this.time.now;
    if (now < this.nextFishAllowedAt) {
      return true;
    }
    this.nextFishAllowedAt = now + FISH_COOLDOWN_MS;

    if (Math.random() < FISH_SUCCESS_CHANCE) {
      this.inventory.add("fish", 1);
      this.stats.recordGather("fish", 1);
      this.grantExp(FISH_EXP);
      this.sound.play("sfx-gather", { volume: 0.5 });
      this.showGatherFeedback(point.worldX, point.worldY, "fish", 1);
    } else {
      this.showFloatingMessage("😅 逃げられた…");
    }
    return true;
  }

  /** シフトキーでのアクション。向いている方向の少し先を対象点にして、クリックと同じ判定を使う */
  private handleShiftAction(): void {
    const offset = SHIFT_ACTION_OFFSET[this.player.currentDirection];
    const worldX = this.player.sprite.x + offset.x * SHIFT_ACTION_REACH;
    const worldY = this.player.sprite.y + offset.y * SHIFT_ACTION_REACH;
    this.handleAction({ screenX: 0, screenY: 0, worldX, worldY });
  }

  // ---------- ルーラ(拠点への瞬間移動) ----------

  private handleWarp(): void {
    const now = this.time.now;
    if (now < this.nextWarpAllowedAt) {
      this.showFloatingMessage("詠唱がまだ整っていない…");
      return;
    }

    if (!this.inventory.spend({ coin: WARP_COST } as Partial<Record<ItemId, number>>)) {
      this.showFloatingMessage(`💰が足りない(${WARP_COST}枚必要)`);
      return;
    }

    this.nextWarpAllowedAt = now + WARP_COOLDOWN_MS;
    this.cameras.main.flash(200, 255, 255, 255);
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(this.respawnPoint.x, this.respawnPoint.y);
    this.sound.play("sfx-craft", { volume: 0.5 });
    this.showFloatingMessage(`✨ ルーラで拠点へ戻った!(-${WARP_COST}💰)`);
  }

  // ---------- とくぎ(強力な一撃) ----------

  private handleSkill(): void {
    const now = this.time.now;
    if (now < this.nextSkillAllowedAt) {
      this.showFloatingMessage("とくぎの準備がまだ整っていない…");
      return;
    }
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;
    let closest: Monster | null = null;
    let closestDist = Number.POSITIVE_INFINITY;
    for (const monster of this.monsters) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, monster.sprite.x, monster.sprite.y);
      if (dist > ATTACK_REACH_RADIUS) continue;
      if (dist < closestDist) {
        closest = monster;
        closestDist = dist;
      }
    }

    if (!closest) {
      this.showFloatingMessage("近くに敵がいない");
      return;
    }

    if (!this.stamina.spend(SKILL_STAMINA_COST)) {
      this.showFloatingMessage(`スタミナが足りない(${SKILL_STAMINA_COST}必要)`);
      return;
    }

    this.nextSkillAllowedAt = now + SKILL_COOLDOWN_MS;
    this.sound.play("sfx-attack", { volume: 0.6 });
    const monster = closest;
    const { damage, isCrit } = this.computeAttackDamage(SKILL_DAMAGE_MULTIPLIER);
    this.showFloatingMessage(isCrit ? "💥 とくぎ発動!さらに会心の一撃!" : "💥 とくぎ発動!");
    const died = monster.takeDamage(this, damage);
    if (died) this.resolveMonsterDeath(monster);
  }

  private tryGather(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: GatheringPoint | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const gp of this.gatheringPoints) {
      if (gp.isDepleted) continue;
      const clickDist = Phaser.Math.Distance.Between(point.worldX, point.worldY, gp.worldX, gp.worldY);
      if (clickDist > GATHER_CLICK_RADIUS) continue;

      const reachDist = Phaser.Math.Distance.Between(playerX, playerY, gp.worldX, gp.worldY);
      if (reachDist > GATHER_REACH_RADIUS) continue;

      if (clickDist < closestDist) {
        closest = gp;
        closestDist = clickDist;
      }
    }

    if (!closest || !closest.tryHarvest(this)) {
      return false;
    }

    // マインクラフト風の斧・つるはしを持っていると、対応する資材の採集量が増える
    const hasBoost =
      (closest.itemId === "wood" && this.tools.has("axe")) ||
      (closest.itemId === "stone" && this.tools.has("pickaxe"));
    const amount = hasBoost ? 2 : 1;

    this.sound.play("sfx-gather", { volume: 0.5 });
    this.inventory.add(closest.itemId, amount);
    this.stats.recordGather(closest.itemId, amount);
    this.showGatherFeedback(closest.worldX, closest.worldY, closest.itemId, amount);
    return true;
  }

  private showGatherFeedback(x: number, y: number, itemId: ItemId, amount = 1): void {
    const text = this.add
      .text(x, y - 12, `+${amount} ${ITEM_ICON[itemId]}`, { fontSize: "10px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      y: y - 24,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  private sendLocalStateIfChanged(): void {
    const x = Math.round(this.player.sprite.x);
    const y = Math.round(this.player.sprite.y);
    const direction = this.player.currentDirection;
    const animState: AnimState = this.player.isMoving ? "walk" : "idle";

    const last = this.lastSent;
    if (last.x === x && last.y === y && last.direction === direction && last.animState === animState) {
      return;
    }

    this.lastSent = { x, y, direction, animState };
    this.roomClient.sendMove(x, y, direction, animState);
  }

  private showActionFeedback(x: number, y: number): void {
    const marker = this.add.circle(x, y, 3, 0xffffff, 0.9).setDepth(20);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 2.5,
      duration: 250,
      onComplete: () => marker.destroy(),
    });
  }
}
