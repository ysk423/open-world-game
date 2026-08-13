import Phaser from "phaser";
import { InputManager } from "../input/InputManager";
import type { ActionPoint } from "../input/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { GatheringPoint } from "../entities/GatheringPoint";
import { Building } from "../entities/Building";
import { Monster } from "../entities/Monster";
import { RoomClient } from "../net/RoomClient";
import type { AnimState, PlacedBuilding, PlayerState } from "../net/types";
import { getJoinInfo } from "../net/joinInfo";
import { Inventory, type ItemId } from "../systems/Inventory";
import type { BuildingType, Recipe } from "../systems/recipes";
import { Health } from "../systems/Health";
import { InventoryHud } from "../ui/InventoryHud";
import { CraftMenu } from "../ui/CraftMenu";
import { HealthHud } from "../ui/HealthHud";

const WATER_GID = 3;
const ROCK_GID = 4;

const MAP_WIDTH_TILES = 40;
const MAP_HEIGHT_TILES = 30;
const TILE_SIZE = 16;

// スポーン地点(縦の道の上、タイル座標。chunk-homeの座標系)
const SPAWN_TILE = { x: 19, y: 10 };

// 位置同期を送る間隔(ms)。低頻度・高頻度どちらにも寄せすぎない程度の値
const NETWORK_TICK_MS = 80;

// プレイヤーがこの距離まで端に近づいたら隣接チャンクへ遷移する
const EDGE_MARGIN = 6;
// 遷移後、反対側の端からどれだけ内側に出現するか。
// プレイヤーの物理ボディは見た目のスプライトから上下非対称にオフセットされている
// (Player.tsのsetOffset参照。上+4px/下+14pxとズレが大きい)。この値が小さすぎると、
// 反対側の端に出現した直後、その端のEDGE_MARGIN判定にちょうど一致してしまい、
// 出現した瞬間に元のチャンクへ押し戻される(バウンスする)ことがある。
const ENTRY_OFFSET = 30;

// 採集の判定距離
const GATHER_CLICK_RADIUS = 20;
const GATHER_REACH_RADIUS = 40;

// 攻撃の判定距離
const ATTACK_CLICK_RADIUS = 20;
const ATTACK_REACH_RADIUS = 40;

const PLAYER_MAX_HP = 3;
const CONTACT_DAMAGE = 1;
const CONTACT_INVULN_MS = 1000;

type ChunkDirection = "north" | "south" | "east" | "west";

const CHUNK_NEIGHBORS: Record<string, Partial<Record<ChunkDirection, string>>> = {
  "chunk-home": { north: "chunk-north", east: "chunk-east" },
  "chunk-north": { south: "chunk-home" },
  "chunk-east": { west: "chunk-home" },
};

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private roomClient!: RoomClient;
  private inventory!: Inventory;
  private craftMenu!: CraftMenu;
  private health!: Health;
  private invulnerableUntil = 0;

  private remotePlayers = new Map<string, RemotePlayer>();
  private selfId: string | null = null;

  private currentChunk = "chunk-home";
  private isTransitioning = false;
  private lockedMessageShown = false;

  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private obstacleLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundCollider?: Phaser.Physics.Arcade.Collider;
  private obstacleCollider?: Phaser.Physics.Arcade.Collider;
  private gatheringPoints: GatheringPoint[] = [];
  private buildingSprites: Building[] = [];
  private monsters: Monster[] = [];
  private monsterOverlaps: Phaser.Physics.Arcade.Collider[] = [];

  private baseState = {
    buildings: [] as PlacedBuilding[],
    unlockedChunks: new Set<string>(["chunk-home"]),
  };

  private lastSent = {
    x: 0,
    y: 0,
    direction: "down",
    animState: "idle" as AnimState,
    chunkId: "",
  };
  private sinceLastSend = 0;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.tilemapTiledJSON("chunk-home", "maps/chunk-home.json");
    this.load.tilemapTiledJSON("chunk-north", "maps/chunk-north.json");
    this.load.tilemapTiledJSON("chunk-east", "maps/chunk-east.json");
    this.load.image("tiles", "assets/tileset.png");
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("gathering", "assets/gathering.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet("buildings", "assets/buildings.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("monster", "assets/monster.png");
  }

  create(): void {
    this.inventory = new Inventory();
    new InventoryHud(this.inventory);
    this.craftMenu = new CraftMenu(this.inventory, this.baseState.unlockedChunks, (recipe) => {
      this.handleCraft(recipe);
    });
    this.health = new Health(PLAYER_MAX_HP);
    new HealthHud(this.health);

    this.player = new Player(
      this,
      SPAWN_TILE.x * TILE_SIZE + TILE_SIZE / 2,
      SPAWN_TILE.y * TILE_SIZE + TILE_SIZE / 2,
    );

    this.buildChunk("chunk-home");

    this.inputManager = new InputManager(this);
    this.inputManager.onAction((point) => {
      this.handleAction(point);
    });

    this.setupNetworking();
  }

  private setupNetworking(): void {
    const { name, roomId } = getJoinInfo();
    this.roomClient = new RoomClient(roomId, name, {
      onInit: (selfId, players, buildings, unlockedChunks) => {
        this.selfId = selfId;
        for (const player of players) {
          if (player.id === selfId) continue;
          this.addRemotePlayer(player);
        }

        this.baseState.buildings = buildings;
        this.syncUnlockedChunks(unlockedChunks);
        for (const building of buildings) {
          this.addBuildingSprite(building);
        }
      },
      onPlayerJoined: (player) => {
        if (player.id === this.selfId) return;
        this.addRemotePlayer(player);
      },
      onPlayerMoved: (id, x, y, direction, animState, chunkId) => {
        const remote = this.remotePlayers.get(id);
        if (!remote) return;
        remote.updateTarget(x, y, direction, animState, chunkId);
        remote.setVisibleForChunk(this.currentChunk);
      },
      onPlayerLeft: (id) => {
        this.remotePlayers.get(id)?.destroy();
        this.remotePlayers.delete(id);
      },
      onRoomFull: () => {
        window.alert("このルームは満員です(最大4人まで)。別のルームIDを試してください。");
        window.location.reload();
      },
      onBuildingPlaced: (building) => {
        this.baseState.buildings.push(building);
        this.addBuildingSprite(building);
      },
      onChunkUnlocked: (chunkId) => {
        this.baseState.unlockedChunks.add(chunkId);
        this.craftMenu.refresh();
      },
    });
  }

  private addRemotePlayer(player: PlayerState): void {
    if (this.remotePlayers.has(player.id)) return;
    const remote = new RemotePlayer(this, player);
    remote.setVisibleForChunk(this.currentChunk);
    this.remotePlayers.set(player.id, remote);
  }

  private syncUnlockedChunks(chunkIds: string[]): void {
    this.baseState.unlockedChunks.clear();
    for (const id of chunkIds) this.baseState.unlockedChunks.add(id);
    this.craftMenu.refresh();
  }

  update(_time: number, delta: number): void {
    const moveState = this.inputManager.getMoveState();
    this.player.update(moveState);

    for (const remote of this.remotePlayers.values()) {
      remote.tick();
    }

    if (!this.isTransitioning) {
      this.checkChunkTransition();
    }

    this.sinceLastSend += delta;
    if (this.sinceLastSend >= NETWORK_TICK_MS) {
      this.sinceLastSend = 0;
      this.sendLocalStateIfChanged();
    }
  }

  // ---------- チャンク管理 ----------

  private buildChunk(chunkId: string, entryDirection?: ChunkDirection): void {
    this.groundCollider?.destroy();
    this.obstacleCollider?.destroy();
    this.groundLayer?.destroy();
    this.obstacleLayer?.destroy();
    for (const point of this.gatheringPoints) point.destroy();
    this.gatheringPoints = [];
    for (const building of this.buildingSprites) building.destroy();
    this.buildingSprites = [];
    for (const overlap of this.monsterOverlaps) overlap.destroy();
    this.monsterOverlaps = [];
    for (const monster of this.monsters) monster.destroy();
    this.monsters = [];

    const map = this.make.tilemap({ key: chunkId });
    const tileset = map.addTilesetImage("tileset", "tiles");
    if (!tileset) {
      throw new Error(`タイルセットの読み込みに失敗しました: ${chunkId}`);
    }

    const groundLayer = map.createLayer("ground", tileset, 0, 0);
    const obstacleLayer = map.createLayer("obstacles", tileset, 0, 0);
    if (!groundLayer || !obstacleLayer) {
      throw new Error(`マップレイヤーの作成に失敗しました: ${chunkId}`);
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

    this.groundCollider = this.physics.add.collider(this.player.sprite, groundLayer);
    this.obstacleCollider = this.physics.add.collider(this.player.sprite, obstacleLayer);

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
        const monster = new Monster(this, x, y);
        this.monsters.push(monster);
        this.monsterOverlaps.push(
          this.physics.add.overlap(this.player.sprite, monster.sprite, () => {
            this.handleMonsterContact();
          }),
        );
      }
    }

    this.currentChunk = chunkId;
    for (const building of this.baseState.buildings) {
      this.addBuildingSprite(building);
    }

    if (entryDirection) {
      const { x, y } = this.getEntryPosition(entryDirection);
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
    }

    for (const remote of this.remotePlayers.values()) {
      remote.setVisibleForChunk(this.currentChunk);
    }
  }

  private addBuildingSprite(building: PlacedBuilding): void {
    if (building.chunkId !== this.currentChunk) return;
    this.buildingSprites.push(
      new Building(this, building.x, building.y, building.buildingType as BuildingType),
    );
  }

  private getEntryPosition(enteredFrom: ChunkDirection): { x: number; y: number } {
    const currentX = this.player.sprite.x;
    const currentY = this.player.sprite.y;
    const maxX = MAP_WIDTH_TILES * TILE_SIZE;
    const maxY = MAP_HEIGHT_TILES * TILE_SIZE;

    switch (enteredFrom) {
      case "north":
        return { x: currentX, y: maxY - ENTRY_OFFSET };
      case "south":
        return { x: currentX, y: ENTRY_OFFSET };
      case "east":
        return { x: ENTRY_OFFSET, y: currentY };
      case "west":
        return { x: maxX - ENTRY_OFFSET, y: currentY };
    }
  }

  private checkChunkTransition(): void {
    const neighbors = CHUNK_NEIGHBORS[this.currentChunk] ?? {};
    // スプライトの座標ではなく実際の物理ボディの境界を見る。ボディは見た目の
    // スプライトからオフセットされているため、collideWorldBoundsによる
    // クランプ位置とsprite.x/yの単純な閾値比較がズレることがある。
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const maxX = MAP_WIDTH_TILES * TILE_SIZE;
    const maxY = MAP_HEIGHT_TILES * TILE_SIZE;

    let atLockedEdge = false;

    if (neighbors.north && body.top <= EDGE_MARGIN) {
      atLockedEdge = this.attemptTransition(neighbors.north, "north");
    } else if (neighbors.south && body.bottom >= maxY - EDGE_MARGIN) {
      atLockedEdge = this.attemptTransition(neighbors.south, "south");
    } else if (neighbors.east && body.right >= maxX - EDGE_MARGIN) {
      atLockedEdge = this.attemptTransition(neighbors.east, "east");
    } else if (neighbors.west && body.left <= EDGE_MARGIN) {
      atLockedEdge = this.attemptTransition(neighbors.west, "west");
    }

    if (!atLockedEdge) {
      this.lockedMessageShown = false;
    }
  }

  /** 遷移を試みる。ロック中のチャンクだった場合はtrue(=ロックされた端にいる)を返す */
  private attemptTransition(chunkId: string, direction: ChunkDirection): boolean {
    if (!this.baseState.unlockedChunks.has(chunkId)) {
      if (!this.lockedMessageShown) {
        this.lockedMessageShown = true;
        this.showLockedMessage();
      }
      return true;
    }
    this.transitionTo(chunkId, direction);
    return false;
  }

  private transitionTo(chunkId: string, direction: ChunkDirection): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.buildChunk(chunkId, direction);
      this.cameras.main.fadeIn(150, 0, 0, 0);
      this.isTransitioning = false;
    });
  }

  // ---------- クラフト ----------

  private handleCraft(recipe: Recipe): void {
    if (recipe.effect.type === "unlock_chunk" && this.baseState.unlockedChunks.has(recipe.effect.chunkId)) {
      return;
    }
    if (!this.inventory.spend(recipe.inputs)) return;

    if (recipe.effect.type === "building") {
      const x = Math.round(this.player.sprite.x);
      const y = Math.round(this.player.sprite.y);
      const building: PlacedBuilding = {
        id: crypto.randomUUID(),
        buildingType: recipe.effect.buildingType,
        x,
        y,
        chunkId: this.currentChunk,
      };
      this.baseState.buildings.push(building);
      this.addBuildingSprite(building);
      this.roomClient.sendCraftBuilding(recipe.effect.buildingType, x, y, this.currentChunk);
    } else {
      this.baseState.unlockedChunks.add(recipe.effect.chunkId);
      this.craftMenu.refresh();
      this.roomClient.sendCraftUnlock(recipe.effect.chunkId);
    }

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

  private showLockedMessage(): void {
    const text = this.add
      .text(this.player.sprite.x, this.player.sprite.y - 20, "🔒 素材を集めて道を作ろう", {
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1000,
      delay: 800,
      onComplete: () => text.destroy(),
    });
  }

  // ---------- 戦闘 ----------

  private handleMonsterContact(): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + CONTACT_INVULN_MS;

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
    this.isTransitioning = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.currentChunk !== "chunk-home") {
        this.buildChunk("chunk-home");
      }
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(
        SPAWN_TILE.x * TILE_SIZE + TILE_SIZE / 2,
        SPAWN_TILE.y * TILE_SIZE + TILE_SIZE / 2,
      );
      this.health.reset();
      this.cameras.main.fadeIn(200, 0, 0, 0);
      this.isTransitioning = false;
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

    const died = closest.takeDamage(this, 1);
    if (died) {
      this.monsters = this.monsters.filter((m) => m !== closest);
      closest.destroy();
    }
    return true;
  }

  // ---------- アクション(採集・攻撃など) ----------

  private handleAction(point: ActionPoint): void {
    if (this.tryAttack(point)) return;
    const harvested = this.tryGather(point);
    if (!harvested) {
      this.showActionFeedback(point.worldX, point.worldY);
    }
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

    this.inventory.add(closest.itemId, 1);
    this.showGatherFeedback(closest.worldX, closest.worldY, closest.itemId);
    return true;
  }

  private showGatherFeedback(x: number, y: number, itemId: ItemId): void {
    const label = { wood: "+1 🪵", stone: "+1 🪨", herb: "+1 🌿" }[itemId];
    const text = this.add
      .text(x, y - 12, label, { fontSize: "10px", color: "#ffffff" })
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
    const chunkId = this.currentChunk;

    const last = this.lastSent;
    if (
      last.x === x &&
      last.y === y &&
      last.direction === direction &&
      last.animState === animState &&
      last.chunkId === chunkId
    ) {
      return;
    }

    this.lastSent = { x, y, direction, animState, chunkId };
    this.roomClient.sendMove(x, y, direction, animState, chunkId);
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
