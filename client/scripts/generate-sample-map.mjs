// 仮のTiledタイルマップ(JSON)を生成するワンショットスクリプト。
// 後で本物のTiledエディタで作ったマップに差し替える想定。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TILE_SIZE = 16;
const WIDTH = 40;
const HEIGHT = 30;

// gid: 0=空, 1=草, 2=道, 3=水, 4=岩
const GRASS = 1;
const PATH = 2;
const WATER = 3;
const ROCK = 4;

function makeGrid(width, height, fill) {
  return new Array(width * height).fill(fill);
}

const ground = makeGrid(WIDTH, HEIGHT, GRASS);
const obstacles = makeGrid(WIDTH, HEIGHT, 0);

function setTile(grid, x, y, value) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  grid[y * WIDTH + x] = value;
}

// 横に貫く道
for (let x = 0; x < WIDTH; x++) {
  setTile(ground, x, 15, PATH);
  setTile(ground, x, 16, PATH);
}
// 縦の道(拠点付近から北へ)
for (let y = 0; y < 16; y++) {
  setTile(ground, 18, y, PATH);
  setTile(ground, 19, y, PATH);
}

// 右下の池
for (let y = 20; y < 27; y++) {
  for (let x = 30; x < 37; x++) {
    setTile(ground, x, y, WATER);
  }
}

// 岩を点在させる(障害物レイヤー、当たり判定あり)
const rockPositions = [
  [5, 5], [6, 5], [10, 20], [11, 20], [25, 8], [26, 9],
  [3, 22], [33, 10], [8, 12], [15, 25], [22, 22], [28, 5],
];
for (const [x, y] of rockPositions) {
  setTile(obstacles, x, y, ROCK);
}

// マップ外周を岩で囲う(探索範囲の見た目上の境界)
for (let x = 0; x < WIDTH; x++) {
  setTile(obstacles, x, 0, ROCK);
  setTile(obstacles, x, HEIGHT - 1, ROCK);
}
for (let y = 0; y < HEIGHT; y++) {
  setTile(obstacles, 0, y, ROCK);
  setTile(obstacles, WIDTH - 1, y, ROCK);
}

const map = {
  compressionlevel: -1,
  width: WIDTH,
  height: HEIGHT,
  tilewidth: TILE_SIZE,
  tileheight: TILE_SIZE,
  infinite: false,
  orientation: "orthogonal",
  renderorder: "right-down",
  type: "map",
  tiledversion: "1.10.2",
  version: "1.10",
  nextlayerid: 3,
  nextobjectid: 1,
  layers: [
    {
      id: 1,
      name: "ground",
      type: "tilelayer",
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
      opacity: 1,
      visible: true,
      data: ground,
    },
    {
      id: 2,
      name: "obstacles",
      type: "tilelayer",
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
      opacity: 1,
      visible: true,
      data: obstacles,
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "tileset",
      image: "../assets/tileset.png",
      imagewidth: TILE_SIZE * 4,
      imageheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilecount: 4,
      columns: 4,
      margin: 0,
      spacing: 0,
    },
  ],
};

const outPath = join(__dirname, "..", "public", "maps", "sample-map.json");
writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`written: ${outPath}`);
