import Phaser from "phaser";
import { InputManager } from "../input/InputManager";
import type { ActionPoint } from "../input/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { GatheringPoint } from "../entities/GatheringPoint";
import { RoomClient } from "../net/RoomClient";
import type { AnimState, PlayerState } from "../net/types";
import { getJoinInfo } from "../net/joinInfo";
import { Inventory, type ItemId } from "../systems/Inventory";
import { InventoryHud } from "../ui/InventoryHud";

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
// 遷移後、反対側の端からどれだけ内側に出現するか
const ENTRY_OFFSET = 20;

// 採集の判定距離
const GATHER_CLICK_RADIUS = 20;
const GATHER_REACH_RADIUS = 40;

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

  private remotePlayers = new Map<string, RemotePlayer>();
  private selfId: string | null = null;

  private currentChunk = "chunk-home";
  private isTransitioning = false;

  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private obstacleLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundCollider?: Phaser.Physics.Arcade.Collider;
  private obstacleCollider?: Phaser.Physics.Arcade.Collider;
  private gatheringPoints: GatheringPoint[] = [];

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
  }

  create(): void {
    this.inventory = new Inventory();
    new InventoryHud(this.inventory);

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
      onInit: (selfId, players) => {
        this.selfId = selfId;
        for (const player of players) {
          if (player.id === selfId) continue;
          this.addRemotePlayer(player);
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
    });
  }

  private addRemotePlayer(player: PlayerState): void {
    if (this.remotePlayers.has(player.id)) return;
    const remote = new RemotePlayer(this, player);
    remote.setVisibleForChunk(this.currentChunk);
    this.remotePlayers.set(player.id, remote);
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

    if (entryDirection) {
      const { x, y } = this.getEntryPosition(entryDirection);
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
    }

    this.currentChunk = chunkId;
    for (const remote of this.remotePlayers.values()) {
      remote.setVisibleForChunk(this.currentChunk);
    }
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

    if (neighbors.north && body.top <= EDGE_MARGIN) {
      this.transitionTo(neighbors.north, "north");
    } else if (neighbors.south && body.bottom >= maxY - EDGE_MARGIN) {
      this.transitionTo(neighbors.south, "south");
    } else if (neighbors.east && body.right >= maxX - EDGE_MARGIN) {
      this.transitionTo(neighbors.east, "east");
    } else if (neighbors.west && body.left <= EDGE_MARGIN) {
      this.transitionTo(neighbors.west, "west");
    }
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

  // ---------- アクション(採集など) ----------

  private handleAction(point: ActionPoint): void {
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
