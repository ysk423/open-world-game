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

// gid: 0=空, 1=草, 2=道, 3=水, 4=岩
const GRASS = 1;
const PATH = 2;
const WATER = 3;
const ROCK = 4;

function makeGrid(width, height, fill) {
  return new Array(width * height).fill(fill);
}

function setTile(grid, width, height, x, y, value) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  grid[y * width + x] = value;
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
function gatheringObject(itemId, tileX, tileY) {
  return {
    id: nextObjectId++,
    name: `${itemId}_${nextObjectId}`,
    type: "gathering",
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    visible: true,
    properties: [{ name: "itemId", type: "string", value: itemId }],
  };
}

function monsterObject(tileX, tileY) {
  return {
    id: nextObjectId++,
    name: `monster_${nextObjectId}`,
    type: "monster",
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    visible: true,
    properties: [],
  };
}

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

function animalObject(tileX, tileY) {
  return {
    id: nextObjectId++,
    name: `animal_${nextObjectId}`,
    type: "animal",
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    visible: true,
    properties: [],
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
  for (let y = 20; y < 27; y++) {
    for (let x = 30; x < 37; x++) {
      setTile(ground, CHUNK_W, CHUNK_H, x, y, WATER);
    }
  }

  const rockPositions = [
    [5, 5], [6, 5], [10, 20], [11, 20], [25, 8],
    [3, 22], [8, 12], [15, 25], [22, 22], [28, 5],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, CHUNK_W, CHUNK_H, x, y, ROCK);

  // 北(旧chunk-north)・東(旧chunk-east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "west"]));

  const gatheringPoints = [
    gatheringObject("wood", 6, 8),
    gatheringObject("wood", 12, 4),
    gatheringObject("wood", 33, 6),
    gatheringObject("wood", 2, 18),
    gatheringObject("stone", 9, 21),
    gatheringObject("stone", 24, 21),
    gatheringObject("stone", 36, 15),
    gatheringObject("herb", 14, 10),
    gatheringObject("herb", 27, 18),
    gatheringObject("herb", 5, 25),
    gatheringObject("herb", 20, 4),
  ];

  const npcs = [
    npcObject(21, 11, "ミナ", "ようこそ、はじまりの湾へ!採集ポイントをクリックして素材を集めてね。"),
    npcObject(16, 18, "ケン", "この湾はどこまでも歩いて回れるよ。北や東にも足を延ばしてみて。"),
  ];

  const monsters = [monsterObject(4, 27)];
  const animals = [animalObject(24, 17), animalObject(35, 24)];
  const shops = [shopObject(14, 14)];

  return { ground, obstacles, gatheringPoints, monsters, npcs, animals, shops };
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
  for (let y = 5; y < 12; y++) {
    for (let x = 3; x < 10; x++) {
      setTile(ground, CHUNK_W, CHUNK_H, x, y, WATER);
    }
  }

  const rockPositions = [
    [24, 6], [25, 6], [30, 15], [12, 20], [13, 20], [35, 10], [7, 22],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, CHUNK_W, CHUNK_H, x, y, ROCK);

  // 南(home)・東(northeast、新設)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "west"]));

  const gatheringPoints = [
    gatheringObject("wood", 22, 8),
    gatheringObject("wood", 15, 15),
    gatheringObject("wood", 33, 20),
    gatheringObject("stone", 32, 12),
    gatheringObject("stone", 28, 20),
    gatheringObject("stone", 4, 25),
    gatheringObject("herb", 10, 18),
    gatheringObject("herb", 20, 24),
    gatheringObject("herb", 36, 6),
  ];

  // 縦の道(x=18-19)から離れた開けた場所に配置。道を通るだけなら遭遇せず迂回できる
  const monsters = [monsterObject(28, 15), monsterObject(15, 5)];
  const animals = [animalObject(26, 20), animalObject(6, 15)];

  return { ground, obstacles, gatheringPoints, monsters, npcs: [], animals, shops: [] };
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
  for (let y = 18; y < 25; y++) {
    for (let x = 20; x < 28; x++) {
      setTile(ground, CHUNK_W, CHUNK_H, x, y, WATER);
    }
  }

  const rockPositions = [
    [8, 5], [9, 5], [15, 10], [33, 8], [30, 22], [5, 20],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, CHUNK_W, CHUNK_H, x, y, ROCK);

  // 西(home)・北(northeast、新設)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "east"]));

  const gatheringPoints = [
    gatheringObject("wood", 12, 6),
    gatheringObject("wood", 30, 5),
    gatheringObject("wood", 36, 25),
    gatheringObject("stone", 18, 20),
    gatheringObject("stone", 35, 15),
    gatheringObject("herb", 6, 12),
    gatheringObject("herb", 25, 27),
    gatheringObject("herb", 3, 3),
  ];

  // 横の道(y=15-16)から離れた開けた場所に配置。道を通るだけなら遭遇せず迂回できる
  const monsters = [monsterObject(12, 24), monsterObject(33, 20)];
  const animals = [animalObject(25, 10), animalObject(9, 27)];

  return { ground, obstacles, gatheringPoints, monsters, npcs: [], animals, shops: [] };
}

// ---------------- northeast領域(homeの北東。マップ拡大に合わせて新設) ----------------
function buildNortheast() {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // 中央に大きな湖
  for (let y = 10; y < 20; y++) {
    for (let x = 14; x < 26; x++) {
      setTile(ground, CHUNK_W, CHUNK_H, x, y, WATER);
    }
  }

  const rockPositions = [
    [4, 6], [5, 6], [34, 5], [35, 5], [7, 24], [30, 25], [20, 3], [10, 15],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, CHUNK_W, CHUNK_H, x, y, ROCK);

  // 西(north)・南(east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "east"]));

  const gatheringPoints = [
    gatheringObject("wood", 5, 12),
    gatheringObject("wood", 34, 10),
    gatheringObject("wood", 20, 26),
    gatheringObject("stone", 8, 20),
    gatheringObject("stone", 30, 15),
    gatheringObject("herb", 12, 5),
    gatheringObject("herb", 28, 22),
    gatheringObject("herb", 36, 18),
  ];

  const monsters = [monsterObject(20, 8)];
  const animals = [animalObject(30, 6), animalObject(9, 9)];

  return { ground, obstacles, gatheringPoints, monsters, npcs: [], animals, shops: [] };
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
    gatheringPoints: scaleObjects(region.gatheringPoints, factor),
    monsters: scaleObjects(region.monsters, factor),
    npcs: scaleObjects(region.npcs, factor),
    animals: scaleObjects(region.animals, factor),
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
const worldGathering = [];
const worldMonsters = [];
const worldNpcs = [];
const worldAnimals = [];
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
  worldGathering.push(...offsetObjects(region.gatheringPoints, region.originX, region.originY));
  worldMonsters.push(...offsetObjects(region.monsters, region.originX, region.originY));
  worldNpcs.push(...offsetObjects(region.npcs, region.originX, region.originY));
  worldAnimals.push(...offsetObjects(region.animals, region.originX, region.originY));
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
  nextlayerid: 8,
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
      name: "gathering",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldGathering,
    },
    {
      id: 4,
      name: "monsters",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldMonsters,
    },
    {
      id: 5,
      name: "npcs",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldNpcs,
    },
    {
      id: 6,
      name: "animals",
      type: "objectgroup",
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: worldAnimals,
    },
    {
      id: 7,
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

const mapsDir = join(__dirname, "..", "public", "maps");
const outPath = join(mapsDir, "world.json");
writeFileSync(outPath, JSON.stringify(world, null, 2));
console.log(`written: ${outPath}`);
