import Phaser from "phaser";
import { InputManager } from "../input/InputManager";
import type { ActionPoint, Direction } from "../input/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { GatheringPoint } from "../entities/GatheringPoint";
import { Building } from "../entities/Building";
import { FarmPlot } from "../entities/FarmPlot";
import { Monster } from "../entities/Monster";
import { Npc } from "../entities/Npc";
import { RoomClient } from "../net/RoomClient";
import type { AnimState, PlacedBuilding, PlayerState } from "../net/types";
import { getJoinInfo, SHARED_ROOM_ID } from "../net/joinInfo";
import { Inventory, type ItemId } from "../systems/Inventory";
import type { BuildingType, Recipe } from "../systems/recipes";
import { Health } from "../systems/Health";
import { Equipment } from "../systems/Equipment";
import { saveSlot, loadSlot } from "../systems/SaveSlots";
import { InventoryHud } from "../ui/InventoryHud";
import { CraftMenu } from "../ui/CraftMenu";
import { HealthHud } from "../ui/HealthHud";
import { HelpPanel } from "../ui/HelpPanel";
import { SaveLoadPanel } from "../ui/SaveLoadPanel";
import { EquipmentPanel } from "../ui/EquipmentPanel";
import { ShopPanel, SHOP_BUY_PRICES, SHOP_SELL_PRICES } from "../ui/ShopPanel";
import { TouchDPad } from "../ui/TouchDPad";
import { isTouchDevice } from "../utils/device";

const WATER_GID = 3;
const ROCK_GID = 4;

// タイル/スプライトは32px(素材を16pxから倍の解像度に描き直した際に合わせて倍増)。
const TILE_SIZE = 32;

// スポーン地点(縦の道の上、タイル座標。ワールド全体の座標系)
const SPAWN_TILE = { x: 19, y: 40 };
const SPAWN_X = SPAWN_TILE.x * TILE_SIZE + TILE_SIZE / 2;
const SPAWN_Y = SPAWN_TILE.y * TILE_SIZE + TILE_SIZE / 2;

// 位置同期を送る間隔(ms)。低頻度・高頻度どちらにも寄せすぎない程度の値
const NETWORK_TICK_MS = 80;

// 採集の判定距離
const GATHER_CLICK_RADIUS = 40;
const GATHER_REACH_RADIUS = 80;

// 攻撃の判定距離
const ATTACK_CLICK_RADIUS = 40;
const ATTACK_REACH_RADIUS = 80;

// 会話の判定距離
const TALK_CLICK_RADIUS = 40;
const TALK_REACH_RADIUS = 80;

// 畑の判定距離
const FARM_CLICK_RADIUS = 40;
const FARM_REACH_RADIUS = 80;

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

// モンスターを倒してから再出現するまでの時間
const MONSTER_RESPAWN_DELAY_MS = 20000;
// 再出現位置は極力プレイヤーから離す(近すぎる候補は避ける)
const MONSTER_RESPAWN_MIN_DIST = 150;

const ITEM_ICON: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  coin: "💰",
  seed: "🌱",
  crop: "🥕",
};

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private roomClient!: RoomClient;
  private inventory!: Inventory;
  private equipment!: Equipment;
  private craftMenu!: CraftMenu;
  private health!: Health;
  private invulnerableUntil = 0;
  private pendingLoadSlot: number | null = null;

  private remotePlayers = new Map<string, RemotePlayer>();
  private selfId: string | null = null;

  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private obstacleLayer?: Phaser.Tilemaps.TilemapLayer;
  private walkableTiles: { x: number; y: number }[] = [];

  private gatheringPoints: GatheringPoint[] = [];
  private buildingSprites: Building[] = [];
  private farmPlots: FarmPlot[] = [];
  private monsters: Monster[] = [];
  private monsterOverlaps: Phaser.Physics.Arcade.Collider[] = [];
  private npcs: Npc[] = [];

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
    new InventoryHud(this.inventory);
    this.craftMenu = new CraftMenu(
      this.inventory,
      () => new Set(this.equipment.getOwned()),
      (recipe) => this.handleCraft(recipe),
    );
    new EquipmentPanel(this.equipment, (weaponId) => this.equipment.equip(weaponId));
    this.health = new Health(PLAYER_MAX_HP);
    new HealthHud(this.health, () => this.handleHeal());
    new HelpPanel();
    new SaveLoadPanel({
      onSave: (slot) => this.handleSave(slot),
      onLoad: (slot) => this.handleLoad(slot),
    });
    new ShopPanel(this.inventory, {
      onSell: (itemId) => this.handleSell(itemId),
      onBuy: (itemId) => this.handleBuy(itemId),
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
    if (isTouchDevice()) {
      new TouchDPad((x, y) => this.inputManager.setTouchMove(x, y));
    }

    this.setupNetworking();
  }

  private setupNetworking(): void {
    const { name } = getJoinInfo();
    this.roomClient = new RoomClient(SHARED_ROOM_ID, name, {
      onInit: (selfId, players, buildings) => {
        this.selfId = selfId;
        for (const player of players) {
          if (player.id === selfId) continue;
          this.addRemotePlayer(player);
        }

        this.buildings = buildings;
        for (const building of buildings) {
          this.addBuildingSprite(building);
        }
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
        this.buildings = [];
        for (const building of this.buildingSprites) building.destroy();
        this.buildingSprites = [];
        for (const plot of this.farmPlots) plot.destroy();
        this.farmPlots = [];
        this.inventory.reset();
        this.health.reset();
        this.equipment.reset();
        const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
        body.reset(SPAWN_X, SPAWN_Y);
      },
      onGameLoaded: (slot, buildings) => {
        this.buildings = buildings;
        for (const building of this.buildingSprites) building.destroy();
        this.buildingSprites = [];
        for (const plot of this.farmPlots) plot.destroy();
        this.farmPlots = [];
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
    });
  }

  // ---------- セーブ/ロード ----------

  private handleSave(slot: number): void {
    saveSlot(slot, this.inventory.getCounts(), this.health.getHp());
    this.roomClient.sendSaveGame(slot);
    this.showFloatingMessage(`スロット${slot}にセーブしました`);
  }

  private handleLoad(slot: number): void {
    this.pendingLoadSlot = slot;
    this.roomClient.sendLoadGame(slot);
  }

  private addRemotePlayer(player: PlayerState): void {
    if (this.remotePlayers.has(player.id)) return;
    this.remotePlayers.set(player.id, new RemotePlayer(this, player));
  }

  update(_time: number, delta: number): void {
    const moveState = this.inputManager.getMoveState();
    this.player.update(moveState);

    for (const remote of this.remotePlayers.values()) {
      remote.tick();
    }

    this.sinceLastSend += delta;
    if (this.sinceLastSend >= NETWORK_TICK_MS) {
      this.sinceLastSend = 0;
      this.sendLocalStateIfChanged();
    }
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

    this.physics.add.collider(this.player.sprite, groundLayer);
    this.physics.add.collider(this.player.sprite, obstacleLayer);

    // モンスターの再出現先を選ぶための、歩行可能なタイル座標一覧(水・岩以外)
    this.walkableTiles = [];
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const isWater = groundLayer.getTileAt(tx, ty)?.index === WATER_GID;
        const isRock = obstacleLayer.getTileAt(tx, ty)?.index === ROCK_GID;
        if (!isWater && !isRock) this.walkableTiles.push({ x: tx, y: ty });
      }
    }

    const gatheringLayer = map.getObjectLayer("gathering");
    if (gatheringLayer) {
      for (const obj of gatheringLayer.objects) {
        const itemId = obj.properties?.find(
          (p: { name: string }) => p.name === "itemId",
        )?.value as ItemId | undefined;
        if (!itemId) continue;
        const x = (obj.x ?? 0) + (obj.width ?? TILE_SIZE) / 2;
        const y = (obj.y ?? 0) + (obj.height ?? TILE_SIZE) / 2;
        this.gatheringPoints.push(new GatheringPoint(this, x, y, itemId));
      }
    }

    const monsterLayer = map.getObjectLayer("monsters");
    if (monsterLayer) {
      for (const obj of monsterLayer.objects) {
        const x = (obj.x ?? 0) + (obj.width ?? TILE_SIZE) / 2;
        const y = (obj.y ?? 0) + (obj.height ?? TILE_SIZE) / 2;
        this.spawnMonster(x, y);
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

    for (const building of this.buildings) {
      this.addBuildingSprite(building);
    }
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    if (building.buildingType === "farm_plot") {
      this.farmPlots.push(new FarmPlot(this, building.x, building.y));
      return;
    }
    const sprite = new Building(this, building.x, building.y, building.buildingType as BuildingType);
    this.buildingSprites.push(sprite);
    if (sprite.solid) {
      this.physics.add.collider(this.player.sprite, sprite.sprite);
    }
  }

  // ---------- モンスター ----------

  private spawnMonster(x: number, y: number): void {
    const monster = new Monster(this, x, y);
    this.monsters.push(monster);
    if (this.groundLayer) this.physics.add.collider(monster.sprite, this.groundLayer);
    if (this.obstacleLayer) this.physics.add.collider(monster.sprite, this.obstacleLayer);
    this.monsterOverlaps.push(
      this.physics.add.overlap(this.player.sprite, monster.sprite, () => {
        this.handleMonsterContact();
      }),
    );
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
    this.time.delayedCall(MONSTER_RESPAWN_DELAY_MS, () => {
      const pos = this.pickRandomWalkableWorldPos();
      if (!pos) return;
      this.spawnMonster(pos.x, pos.y);
    });
  }

  // ---------- クラフト ----------

  private handleCraft(recipe: Recipe): void {
    if (recipe.effect.type === "weapon" && this.equipment.getOwned().includes(recipe.effect.weaponId)) {
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
    if (this.health.getHp() >= this.health.getMaxHp()) return;
    if (!this.inventory.spend({ herb: 1 })) {
      this.showFloatingMessage("🌿が足りません");
      return;
    }
    this.health.heal(1);
    this.sound.play("sfx-gather", { volume: 0.4 });
    this.showFloatingMessage("回復した(-1 🌿)");
  }

  // ---------- ショップ ----------

  private handleSell(itemId: ItemId): void {
    const price = SHOP_SELL_PRICES[itemId];
    if (!price) return;
    if (!this.inventory.spend({ [itemId]: 1 } as Partial<Record<ItemId, number>>)) return;
    this.inventory.add("coin", price);
    this.showFloatingMessage(`売った(+${price} 💰)`);
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

  // ---------- 戦闘 ----------

  private handleMonsterContact(): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + CONTACT_INVULN_MS;

    this.sound.play("sfx-hurt", { volume: 0.5 });
    const defeated = this.health.damage(CONTACT_DAMAGE);
    this.player.sprite.setTint(0xff5555);
    this.time.delayedCall(200, () => {
      if (this.player.sprite.active) this.player.sprite.clearTint();
    });

    if (defeated) {
      this.respawnAtBase();
    }
  }

  private respawnAtBase(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(SPAWN_X, SPAWN_Y);
      this.health.reset();
      this.cameras.main.fadeIn(200, 0, 0, 0);
      this.showFloatingMessage("気を失った…拠点で目が覚めた");
    });
  }

  private tryAttack(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: Monster | null = null;
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
        closest = monster;
        closestDist = clickDist;
      }
    }

    if (!closest) return false;

    this.sound.play("sfx-attack", { volume: 0.5 });
    const died = closest.takeDamage(this, this.equipment.getDamage());
    if (died) {
      this.monsters = this.monsters.filter((m) => m !== closest);
      this.inventory.add("coin", 2);
      this.showGatherFeedback(closest.sprite.x, closest.sprite.y, "coin", 2);
      closest.destroy();
      this.scheduleMonsterRespawn();
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

    this.sound.play("sfx-talk", { volume: 0.5 });
    this.showDialogue(closest.worldX, closest.worldY, closest.npcName, closest.dialogue);
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
      closest.harvest();
      this.inventory.add("crop", 2);
      this.sound.play("sfx-gather", { volume: 0.5 });
      this.showGatherFeedback(closest.worldX, closest.worldY, "crop", 2);
      return true;
    }

    if (closest.isEmpty) {
      if (!this.inventory.spend({ seed: 1 })) {
        this.showFloatingMessage("🌱の種が足りません");
        return true;
      }
      closest.plant(this);
      this.showFloatingMessage("種をまいた");
      return true;
    }

    this.showFloatingMessage("育成中…");
    return true;
  }

  // ---------- アクション(採集・攻撃・会話など) ----------

  private handleAction(point: ActionPoint): void {
    if (this.tryAttack(point)) return;
    if (this.tryTalk(point)) return;
    if (this.tryFarm(point)) return;
    const harvested = this.tryGather(point);
    if (!harvested) {
      this.showActionFeedback(point.worldX, point.worldY);
    }
  }

  /** シフトキーでのアクション。向いている方向の少し先を対象点にして、クリックと同じ判定を使う */
  private handleShiftAction(): void {
    const offset = SHIFT_ACTION_OFFSET[this.player.currentDirection];
    const worldX = this.player.sprite.x + offset.x * SHIFT_ACTION_REACH;
    const worldY = this.player.sprite.y + offset.y * SHIFT_ACTION_REACH;
    this.handleAction({ screenX: 0, screenY: 0, worldX, worldY });
  }

  private tryGather(point: ActionPoint): boolean {
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    let closest: GatheringPoint | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const gp of this.gatheringPoints) {
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

    this.sound.play("sfx-gather", { volume: 0.5 });
    this.inventory.add(closest.itemId, 1);
    this.showGatherFeedback(closest.worldX, closest.worldY, closest.itemId, 1);
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
