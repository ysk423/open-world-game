export type MinimapPoint = { x: number; y: number; color: string };

const SIZE = 120;
const PLAYER_DOT_RADIUS = 3;
const POINT_DOT_RADIUS = 2;

/**
 * ドラクエ・ポケモン風の簡易ミニマップ。ワールド全体を小さな正方形に縮小して描画し、
 * プレイヤーとショップ・建物・NPCの現在位置を点で表示する。
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapWidth: number;
  private mapHeight: number;

  constructor(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    this.canvas = document.createElement("canvas");
    this.canvas.id = "minimap";
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("ミニマップ用の2Dコンテキストの取得に失敗しました");
    this.ctx = ctx;
  }

  private toMiniCoords(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX / this.mapWidth) * SIZE,
      y: (worldY / this.mapHeight) * SIZE,
    };
  }

  render(playerX: number, playerY: number, points: readonly MinimapPoint[]): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(26, 26, 26, 0.7)";
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (const point of points) {
      const p = this.toMiniCoords(point.x, point.y);
      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POINT_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    const player = this.toMiniCoords(playerX, playerY);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  destroy(): void {
    this.canvas.remove();
  }
}
