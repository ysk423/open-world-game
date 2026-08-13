import Phaser from "phaser";
import { InputManager } from "../input/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { RoomClient } from "../net/RoomClient";
import type { AnimState, PlayerState } from "../net/types";
import { getJoinInfo } from "../net/joinInfo";

const WATER_GID = 3;
const ROCK_GID = 4;

// スポーン地点(縦の道の上、タイル座標)
const SPAWN_TILE = { x: 19, y: 10 };

// 位置同期を送る間隔(ms)。低頻度・高頻度どちらにも寄せすぎない程度の値
const NETWORK_TICK_MS = 80;

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private roomClient!: RoomClient;
  private remotePlayers = new Map<string, RemotePlayer>();
  private selfId: string | null = null;

  private lastSent = { x: 0, y: 0, direction: "down", animState: "idle" as AnimState };
  private sinceLastSend = 0;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.tilemapTiledJSON("sample-map", "maps/sample-map.json");
    this.load.image("tiles", "assets/tileset.png");
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
  }

  create(): void {
    const map = this.make.tilemap({ key: "sample-map" });
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

    const mapWidthPx = map.widthInPixels;
    const mapHeightPx = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidthPx, mapHeightPx);

    this.player = new Player(
      this,
      SPAWN_TILE.x * map.tileWidth + map.tileWidth / 2,
      SPAWN_TILE.y * map.tileHeight + map.tileHeight / 2,
    );

    this.physics.add.collider(this.player.sprite, groundLayer);
    this.physics.add.collider(this.player.sprite, obstacleLayer);

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    this.inputManager = new InputManager(this);
    this.inputManager.onAction((point) => {
      // フェーズ0〜1では採集/攻撃ロジックは未実装のため、視覚フィードバックのみ表示する
      this.showActionFeedback(point.worldX, point.worldY);
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
      onPlayerMoved: (id, x, y, direction, animState) => {
        this.remotePlayers.get(id)?.updateTarget(x, y, direction, animState);
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
    const marker = this.add.circle(x, y, 3, 0xffffff, 0.9);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 2.5,
      duration: 250,
      onComplete: () => marker.destroy(),
    });
  }
}
