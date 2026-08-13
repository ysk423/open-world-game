// 仮のTiledタイルマップ(JSON)を1枚の連続した大きなワールドとして生成するワンショットスクリプト。
// 後で本物のTiledエディタで作ったマップに差し替える想定。
//
// もともとは chunk-home / chunk-north / chunk-east の3枚の別マップ(読込時にチャンク遷移で
// 切り替える方式)だったが、切り替え時のフェード演出やエリア開放要素をなくし、
// 1枚の大きなマップを自由に歩き回れるようにするため、3チャンク分をタイル座標オフセットで
// 合成して1枚のワールドマップに焼き込む。
//
// 各領域は元のデザイン解像度(40x30)のまま組み立て、最後にSCALE倍に拡大(同じ相対レイアウトを
// タイル単位で複製)してからワールドへ合成する。以前は北東の隅が空き地(岩で埋めた死角)
// だったが、この拡大に合わせて北東領域(buildNortheast)を新設し、4領域が隙間なく
// つながる2x2グリッドにした。
//
// 採集ポイント・モンスター・動物・岩(装飾)は、以前はここで固定位置に焼き込んでいたが、
// ルームごとに少しずつ内容を変えられるよう、サーバーが発行するシード値をもとに
// クライアント側(WorldContentGenerator.ts)で実行時に配置するようにした。そのため
// このスクリプトが出力するのは地形(地面・障害物タイル)とNPC・ショップ(固定の目印)のみ。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TILE_SIZE = 32;
const CHUNK_W = 40;
const CHUNK_H = 30;
// マップを4倍(面積)に拡大するため、各領域を縦横2倍に引き伸ばす
const SCALE = 2;
const SCALED_CHUNK_W = CHUNK_W * SCALE;
const SCALED_CHUNK_H = CHUNK_H * SCALE;
const WORLD_W = SCALED_CHUNK_W * 2;
const WORLD_H = SCALED_CHUNK_H * 2;

// gid: 0=空, 1=草, 2=道, 3=水, 4=岩, 5=橋
const GRASS = 1;
const PATH = 2;
const WATER = 3;
const ROCK = 4;
const BRIDGE = 5;

function makeGrid(width, height, fill) {
  return new Array(width * height).fill(fill);
}

function setTile(grid, width, height, x, y, value) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  grid[y * width + x] = value;
}

// 中心から角度ごとに半径を波打たせた、四角くない自然な水たまり/池の形を塗る
function fillOrganicWater(grid, width, height, centerX, centerY, baseRadius, wobble) {
  const span = Math.ceil(baseRadius + wobble[0] + wobble[1]) + 1;
  for (let y = Math.max(0, centerY - span); y <= Math.min(height - 1, centerY + span); y++) {
    for (let x = Math.max(0, centerX - span); x <= Math.min(width - 1, centerX + span); x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const edge = baseRadius + Math.sin(angle * 3) * wobble[0] + Math.sin(angle * 5 + 1.3) * wobble[1];
      if (dist <= edge) setTile(grid, width, height, x, y, WATER);
    }
  }
}

// walls: 壁を作る辺の集合 ("north","south","east","west")
function addBorderWalls(obstacles, width, height, walls) {
  if (walls.has("north")) {
    for (let x = 0; x < width; x++) setTile(obstacles, width, height, x, 0, ROCK);
  }
  if (walls.has("south")) {
    for (let x = 0; x < width; x++) setTile(obstacles, width, height, x, height - 1, ROCK);
  }
  if (walls.has("west")) {
    for (let y = 0; y < height; y++) setTile(obstacles, width, height, 0, y, ROCK);
  }
  if (walls.has("east")) {
    for (let y = 0; y < height; y++) setTile(obstacles, width, height, width - 1, y, ROCK);
  }
}

let nextObjectId = 1;
function npcObject(tileX, tileY, npcName, dialogue) {
  return {
    id: nextObjectId++,
    name: npcName,
    type: "npc",
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    visible: true,
    properties: [
      { name: "npcName", type: "string", value: npcName },
      { name: "dialogue", type: "string", value: dialogue },
    ],
  };
}

function shopObject(tileX, tileY) {
  return {
    id: nextObjectId++,
    name: "shop",
    type: "shop",
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    visible: true,
    properties: [],
  };
}

// 各領域(旧チャンク)を、自分だけのローカル座標系(0-39, 0-29)で組み立てる。
// ---------------- home領域(homeの北西) ----------------
function buildHome() {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  for (let x = 0; x < CHUNK_W; x++) {
    setTile(ground, CHUNK_W, CHUNK_H, x, 15, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, x, 16, PATH);
  }
  for (let y = 0; y < CHUNK_H; y++) {
    setTile(ground, CHUNK_W, CHUNK_H, 18, y, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, 19, y, PATH);
  }
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, 33, 23, 3.6, [1.3, 0.6]);

  // 北(旧chunk-north)・東(旧chunk-east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "west"]));

  const npcs = [
    npcObject(21, 11, "ミナ", "ようこそ、マイワールドへ!採集ポイントをクリックして素材を集めてね。"),
    npcObject(16, 18, "ケン", "この世界はどこまでも歩いて回れるよ。北や東にも足を延ばしてみて。"),
  ];

  const shops = [shopObject(14, 14)];

  return { ground, obstacles, npcs, shops };
}

// ---------------- north領域(homeの北) ----------------
function buildNorth() {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // homeの縦の道(x=18-19)と繋がる道
  for (let y = 0; y < CHUNK_H; y++) {
    setTile(ground, CHUNK_W, CHUNK_H, 18, y, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, 19, y, PATH);
  }
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, 7, 8, 3.4, [1.0, 0.5]);

  // 南(home)・東(northeast、新設)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "west"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

// ---------------- east領域(homeの東) ----------------
function buildEast() {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // homeの横の道(y=15-16)と繋がる道
  for (let x = 0; x < CHUNK_W; x++) {
    setTile(ground, CHUNK_W, CHUNK_H, x, 15, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, x, 16, PATH);
  }
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, 24, 21, 4.2, [1.3, 0.7]);

  // 西(home)・北(northeast、新設)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "east"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

// ---------------- northeast領域(homeの北東。マップ拡大に合わせて新設) ----------------
function buildNortheast() {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // 中央に大きな湖
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, 20, 15, 5.6, [1.8, 0.9]);

  // 西(north)・南(east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "east"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

function blitGrid(dst, dstW, src, srcW, srcH, originX, originY) {
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      dst[(originY + y) * dstW + (originX + x)] = src[y * srcW + x];
    }
  }
}

function offsetObjects(objects, originX, originY) {
  return objects.map((obj) => ({
    ...obj,
    x: obj.x + originX * TILE_SIZE,
    y: obj.y + originY * TILE_SIZE,
  }));
}

// 元のデザイン解像度(40x30)で作った領域を、タイル単位でfactor倍に引き伸ばす
// (1タイルをfactor x factorのブロックに複製する。同じ相対レイアウトのまま面積だけ増える)
function scaleGrid(grid, width, height, factor) {
  const newWidth = width * factor;
  const out = new Array(newWidth * height * factor);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = grid[y * width + x];
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          out[(y * factor + dy) * newWidth + (x * factor + dx)] = value;
        }
      }
    }
  }
  return out;
}

function scaleObjects(objects, factor) {
  return objects.map((obj) => ({
    ...obj,
    x: obj.x * factor,
    y: obj.y * factor,
    width: obj.width * factor,
    height: obj.height * factor,
  }));
}

function scaleRegion(region, factor) {
  return {
    ground: scaleGrid(region.ground, CHUNK_W, CHUNK_H, factor),
    obstacles: scaleGrid(region.obstacles, CHUNK_W, CHUNK_H, factor),
    npcs: scaleObjects(region.npcs, factor),
    shops: scaleObjects(region.shops, factor),
  };
}

const regions = [
  { ...scaleRegion(buildNorth(), SCALE), originX: 0, originY: 0 },
  { ...scaleRegion(buildHome(), SCALE), originX: 0, originY: SCALED_CHUNK_H },
  { ...scaleRegion(buildEast(), SCALE), originX: SCALED_CHUNK_W, originY: SCALED_CHUNK_H },
  { ...scaleRegion(buildNortheast(), SCALE), originX: SCALED_CHUNK_W, originY: 0 },
];

const worldGround = makeGrid(WORLD_W, WORLD_H, GRASS);
const worldObstacles = makeGrid(WORLD_W, WORLD_H, 0);
const worldNpcs = [];
const worldShops = [];

for (const region of regions) {
  blitGrid(worldGround, WORLD_W, region.ground, SCALED_CHUNK_W, SCALED_CHUNK_H, region.originX, region.originY);
  blitGrid(
    worldObstacles,
    WORLD_W,
    region.obstacles,
    SCALED_CHUNK_W,
    SCALED_CHUNK_H,
    region.originX,
    region.originY,
  );
  worldNpcs.push(...offsetObjects(region.npcs, region.originX, region.originY));
  worldShops.push(...offsetObjects(region.shops, region.originX, region.originY));
}

const world = {
  compressionlevel: -1,
  width: WORLD_W,
  height: WORLD_H,
  tilewidth: TILE_SIZE,
  tileheight: TILE_SIZE,
  infinite: false,
  orientation: "orthogonal",
  renderorder: "right-down",
  type: "map",
  tiledversion: "1.10.2",
  version: "1.10",
  nextlayerid: 6,
  nextobjectid: nextObjectId,
  layers: [
    {
      id: 1,
      name: "ground",
      type: "tilelayer",
      x: 0,
      y: 0,
      width: WORLD_W,
      height: WORLD_H,
      opacity: 1,
      visible: true,
      data: worldGround,
    },
    {
      id: 2,
      name: "obstacles",
      type: "tilelayer",
      x: 0,
      y: 0,
      width: WORLD_W,
      height: WORLD_H,
      opacity: 1,
      visible: true,
      data: worldObstacles,
    },
    {
      id: 3,
      name: "npcs",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldNpcs,
    },
    {
      id: 4,
      name: "shops",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldShops,
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "tileset",
      image: "../assets/tileset.png",
      imagewidth: TILE_SIZE * 5,
      imageheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilecount: 5,
      columns: 5,
      margin: 0,
      spacing: 0,
    },
  ],
};

const mapsDir = join(__dirname, "..", "public", "maps");
const outPath = join(mapsDir, "world.json");
writeFileSync(outPath, JSON.stringify(world, null, 2));
console.log(`written: ${outPath}`);
