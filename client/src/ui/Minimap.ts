import { getHudRoot } from "./layoutRoots";

export type MinimapPoint = { x: number; y: number; color: string };

const DEFAULT_SIZE = 120;

/**
 * ドラクエ・ポケモン風の簡易ミニマップ。ワールド全体を小さな正方形に縮小して描画し、
 * プレイヤーとショップ・建物・NPCの現在位置を点で表示する。
 * サイズ・要素idを指定できるので、常時表示の小さいミニマップと、DQ風の全体マップ表示
 * (トグルで開く大きい版)の両方をこのクラスの別インスタンスとして使い回せる。
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapWidth: number;
  private mapHeight: number;
  private size: number;
  private playerDotRadius: number;
  private pointDotRadius: number;

  constructor(mapWidth: number, mapHeight: number, elementId = "minimap", size = DEFAULT_SIZE) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.size = size;
    this.playerDotRadius = Math.max(3, Math.round(size * 0.025));
    this.pointDotRadius = Math.max(2, Math.round(size * 0.017));

    this.canvas = document.createElement("canvas");
    this.canvas.id = elementId;
    this.canvas.width = size;
    this.canvas.height = size;
    // world-map(全体マップ)側はposition:fixedのままなので、hud-rowの子になっても
    // 通常フローに参加せず中央固定オーバーレイとして表示され続ける
    getHudRoot().appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("ミニマップ用の2Dコンテキストの取得に失敗しました");
    this.ctx = ctx;
  }

  get element(): HTMLCanvasElement {
    return this.canvas;
  }

  private toMiniCoords(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX / this.mapWidth) * this.size,
      y: (worldY / this.mapHeight) * this.size,
    };
  }

  render(playerX: number, playerY: number, points: readonly MinimapPoint[], label?: string): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.fillStyle = "rgba(26, 26, 26, 0.7)";
    ctx.fillRect(0, 0, this.size, this.size);

    if (label) {
      ctx.font = "11px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, 4, 3);
    }

    for (const point of points) {
      const p = this.toMiniCoords(point.x, point.y);
      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.pointDotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const player = this.toMiniCoords(playerX, playerY);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, this.playerDotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  destroy(): void {
    this.canvas.remove();
  }
}
