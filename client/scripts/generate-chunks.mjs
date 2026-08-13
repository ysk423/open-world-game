// 仮のTiledタイルマップ(JSON)を複数チャンク分生成するワンショットスクリプト。
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

function setTile(grid, x, y, value) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  grid[y * WIDTH + x] = value;
}

// walls: 壁を作る辺の集合 ("north","south","east","west")
function addBorderWalls(obstacles, walls) {
  if (walls.has("north")) {
    for (let x = 0; x < WIDTH; x++) setTile(obstacles, x, 0, ROCK);
  }
  if (walls.has("south")) {
    for (let x = 0; x < WIDTH; x++) setTile(obstacles, x, HEIGHT - 1, ROCK);
  }
  if (walls.has("west")) {
    for (let y = 0; y < HEIGHT; y++) setTile(obstacles, 0, y, ROCK);
  }
  if (walls.has("east")) {
    for (let y = 0; y < HEIGHT; y++) setTile(obstacles, WIDTH - 1, y, ROCK);
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

function buildMap(ground, obstacles, gatheringPoints) {
  return {
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
    nextlayerid: 4,
    nextobjectid: nextObjectId,
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
      {
        id: 3,
        name: "gathering",
        type: "objectgroup",
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        objects: gatheringPoints,
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
}

// ---------------- chunk-home ----------------
function buildHome() {
  nextObjectId = 1;
  const ground = makeGrid(WIDTH, HEIGHT, GRASS);
  const obstacles = makeGrid(WIDTH, HEIGHT, 0);

  for (let x = 0; x < WIDTH; x++) {
    setTile(ground, x, 15, PATH);
    setTile(ground, x, 16, PATH);
  }
  for (let y = 0; y < HEIGHT; y++) {
    setTile(ground, 18, y, PATH);
    setTile(ground, 19, y, PATH);
  }
  for (let y = 20; y < 27; y++) {
    for (let x = 30; x < 37; x++) {
      setTile(ground, x, y, WATER);
    }
  }

  const rockPositions = [
    [5, 5], [6, 5], [10, 20], [11, 20], [25, 8],
    [3, 22], [8, 12], [15, 25], [22, 22], [28, 5],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, x, y, ROCK);

  // 北(chunk-north)・東(chunk-east)には隣接チャンクがあるので壁を作らない
  addBorderWalls(obstacles, new Set(["south", "west"]));

  const gatheringPoints = [
    gatheringObject("wood", 6, 8),
    gatheringObject("wood", 12, 4),
    gatheringObject("wood", 33, 6),
    gatheringObject("stone", 9, 21),
    gatheringObject("stone", 24, 21),
    gatheringObject("herb", 14, 10),
    gatheringObject("herb", 27, 18),
    gatheringObject("herb", 5, 25),
  ];

  return buildMap(ground, obstacles, gatheringPoints);
}

// ---------------- chunk-north (homeの北) ----------------
function buildNorth() {
  nextObjectId = 1;
  const ground = makeGrid(WIDTH, HEIGHT, GRASS);
  const obstacles = makeGrid(WIDTH, HEIGHT, 0);

  // homeの縦の道(x=18-19)と繋がる道
  for (let y = 0; y < HEIGHT; y++) {
    setTile(ground, 18, y, PATH);
    setTile(ground, 19, y, PATH);
  }
  for (let y = 5; y < 12; y++) {
    for (let x = 3; x < 10; x++) {
      setTile(ground, x, y, WATER);
    }
  }

  const rockPositions = [
    [24, 6], [25, 6], [30, 15], [12, 20], [13, 20], [35, 10], [7, 22],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, x, y, ROCK);

  // 南(home)には隣接チャンクがあるので壁を作らない
  addBorderWalls(obstacles, new Set(["north", "east", "west"]));

  const gatheringPoints = [
    gatheringObject("wood", 22, 8),
    gatheringObject("wood", 15, 15),
    gatheringObject("stone", 32, 12),
    gatheringObject("stone", 28, 20),
    gatheringObject("herb", 10, 18),
    gatheringObject("herb", 20, 24),
  ];

  return buildMap(ground, obstacles, gatheringPoints);
}

// ---------------- chunk-east (homeの東) ----------------
function buildEast() {
  nextObjectId = 1;
  const ground = makeGrid(WIDTH, HEIGHT, GRASS);
  const obstacles = makeGrid(WIDTH, HEIGHT, 0);

  // homeの横の道(y=15-16)と繋がる道
  for (let x = 0; x < WIDTH; x++) {
    setTile(ground, x, 15, PATH);
    setTile(ground, x, 16, PATH);
  }
  for (let y = 18; y < 25; y++) {
    for (let x = 20; x < 28; x++) {
      setTile(ground, x, y, WATER);
    }
  }

  const rockPositions = [
    [8, 5], [9, 5], [15, 10], [33, 8], [30, 22], [5, 20],
  ];
  for (const [x, y] of rockPositions) setTile(obstacles, x, y, ROCK);

  // 西(home)には隣接チャンクがあるので壁を作らない
  addBorderWalls(obstacles, new Set(["north", "south", "east"]));

  const gatheringPoints = [
    gatheringObject("wood", 12, 6),
    gatheringObject("wood", 30, 5),
    gatheringObject("stone", 18, 20),
    gatheringObject("stone", 35, 15),
    gatheringObject("herb", 6, 12),
    gatheringObject("herb", 25, 27),
  ];

  return buildMap(ground, obstacles, gatheringPoints);
}

const chunks = {
  "chunk-home": buildHome(),
  "chunk-north": buildNorth(),
  "chunk-east": buildEast(),
};

const mapsDir = join(__dirname, "..", "public", "maps");
for (const [name, data] of Object.entries(chunks)) {
  const outPath = join(mapsDir, `${name}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`written: ${outPath}`);
}
