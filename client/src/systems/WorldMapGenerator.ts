import { createRandom } from "./WorldContentGenerator";

// client/scripts/generate-world.mjs で作っていた「仮マップ」の組み立てロジックを、
// ワールドシードから実行時にランダム生成できるようクライアント側に移植したもの。
// 池の位置・大きさと、ショップ/クラフト台の位置をワールドシードごとに揺らす。
// 道・境界の壁・NPCの位置など骨格部分は元のスクリプトと同じ(=常に到達可能な配置を保証するため)。

const TILE_SIZE = 32;
const CHUNK_W = 40;
const CHUNK_H = 30;
// マップを4倍(面積)に拡大するため、各領域を縦横2倍に引き伸ばす(generate-world.mjsと同じ)
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

type Grid = number[];
type Point = { x: number; y: number };

type TiledObject = {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  properties: { name: string; type: string; value: string }[];
};

type Region = {
  ground: Grid;
  obstacles: Grid;
  npcs: TiledObject[];
  shops: TiledObject[];
};

export type GeneratedWorldMap = {
  /** Phaser.Cache.TilemapCacheへそのまま登録できるTiled JSON形式のマップデータ */
  tiledJson: Record<string, unknown>;
  /** クラフト台を設置するワールドタイル座標(TILE_SIZE倍・中心寄せは呼び出し側で行う) */
  craftTableTile: Point;
};

function makeGrid(width: number, height: number, fill: number): Grid {
  return new Array(width * height).fill(fill);
}

function setTile(grid: Grid, width: number, height: number, x: number, y: number, value: number): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  grid[y * width + x] = value;
}

// 中心から角度ごとに半径を波打たせた、四角くない自然な水たまり/池の形を塗る
function fillOrganicWater(
  grid: Grid,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  baseRadius: number,
  wobble: [number, number],
): void {
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
function addBorderWalls(obstacles: Grid, width: number, height: number, walls: Set<string>): void {
  if (walls.has("north")) for (let x = 0; x < width; x++) setTile(obstacles, width, height, x, 0, ROCK);
  if (walls.has("south")) for (let x = 0; x < width; x++) setTile(obstacles, width, height, x, height - 1, ROCK);
  if (walls.has("west")) for (let y = 0; y < height; y++) setTile(obstacles, width, height, 0, y, ROCK);
  if (walls.has("east")) for (let y = 0; y < height; y++) setTile(obstacles, width, height, width - 1, y, ROCK);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 元の中心・半径・wobbleを基準に、ワールドシードごとに少しだけ形と位置を揺らす */
function jitterPond(
  random: () => number,
  base: { x: number; y: number; radius: number; wobble: [number, number] },
  jitterRangeTiles: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
): { x: number; y: number; radius: number; wobble: [number, number] } {
  const x = clamp(base.x + Math.round((random() - 0.5) * 2 * jitterRangeTiles), bounds.minX, bounds.maxX);
  const y = clamp(base.y + Math.round((random() - 0.5) * 2 * jitterRangeTiles), bounds.minY, bounds.maxY);
  const radius = base.radius * (0.75 + random() * 0.5);
  const wobble: [number, number] = [
    base.wobble[0] * (0.6 + random() * 0.8),
    base.wobble[1] * (0.6 + random() * 0.8),
  ];
  return { x, y, radius, wobble };
}

/** 道・池を避けた「草」タイルの中から、アンカーからの距離条件を満たすものをランダムに1つ選ぶ */
function pickRandomGrassTile(
  random: () => number,
  ground: Grid,
  width: number,
  height: number,
  margin: number,
  anchor: Point,
  minDistFromAnchor: number,
  maxDistFromAnchor: number,
  avoid: Point[],
  avoidMinDist: number,
): Point {
  const candidates: Point[] = [];
  for (let y = margin; y < height - margin; y++) {
    for (let x = margin; x < width - margin; x++) {
      if (ground[y * width + x] !== GRASS) continue;
      const dist = Math.hypot(x - anchor.x, y - anchor.y);
      if (dist < minDistFromAnchor || dist > maxDistFromAnchor) continue;
      if (avoid.some((p) => Math.hypot(p.x - x, p.y - y) < avoidMinDist)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return anchor;
  return candidates[Math.floor(random() * candidates.length)];
}

let nextObjectIdCounter = 1;

function npcObject(tileX: number, tileY: number, npcName: string, dialogue: string): TiledObject {
  return {
    id: nextObjectIdCounter++,
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

function shopObject(tileX: number, tileY: number): TiledObject {
  return {
    id: nextObjectIdCounter++,
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

// スポーン地点(ホーム領域のローカル・未スケール座標)。SPAWN_TILE(38,80)をホーム領域原点(0,60)基準・SCALE=2で逆算した値
const HOME_SPAWN_LOCAL: Point = { x: 19, y: 10 };

// ---------------- home領域(スポーン地点を含む拠点エリア) ----------------
function buildHome(random: () => number): Region & { craftTableLocal: Point } {
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

  const pond = jitterPond(
    random,
    { x: 33, y: 23, radius: 3.6, wobble: [1.3, 0.6] },
    3,
    { minX: 24, maxX: 37, minY: 18, maxY: 27 },
  );
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, pond.x, pond.y, pond.radius, pond.wobble);

  // 北(旧chunk-north)・東(旧chunk-east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "west"]));

  const npcs = [
    npcObject(21, 11, "ミナ", "ようこそ、マイワールドへ!採集ポイントをクリックして素材を集めてね。"),
    npcObject(16, 18, "ケン", "この世界はどこまでも歩いて回れるよ。北や東にも足を延ばしてみて。"),
  ];

  const avoid: Point[] = [HOME_SPAWN_LOCAL, { x: 21, y: 11 }, { x: 16, y: 18 }];

  const craftTableLocal = pickRandomGrassTile(random, ground, CHUNK_W, CHUNK_H, 3, HOME_SPAWN_LOCAL, 2, 10, avoid, 2);
  avoid.push(craftTableLocal);

  const shopLocal = pickRandomGrassTile(random, ground, CHUNK_W, CHUNK_H, 3, HOME_SPAWN_LOCAL, 3, 14, avoid, 3);
  const shops = [shopObject(shopLocal.x, shopLocal.y)];

  return { ground, obstacles, npcs, shops, craftTableLocal };
}

// ---------------- north領域(homeの北) ----------------
function buildNorth(random: () => number): Region {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // homeの縦の道(x=18-19)と繋がる道
  for (let y = 0; y < CHUNK_H; y++) {
    setTile(ground, CHUNK_W, CHUNK_H, 18, y, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, 19, y, PATH);
  }

  const pond = jitterPond(
    random,
    { x: 7, y: 8, radius: 3.4, wobble: [1.0, 0.5] },
    3,
    { minX: 3, maxX: 16, minY: 3, maxY: 26 },
  );
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, pond.x, pond.y, pond.radius, pond.wobble);

  // 南(home)・東(northeast)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "west"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

// ---------------- east領域(homeの東) ----------------
function buildEast(random: () => number): Region {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // homeの横の道(y=15-16)と繋がる道
  for (let x = 0; x < CHUNK_W; x++) {
    setTile(ground, CHUNK_W, CHUNK_H, x, 15, PATH);
    setTile(ground, CHUNK_W, CHUNK_H, x, 16, PATH);
  }

  const pond = jitterPond(
    random,
    { x: 24, y: 21, radius: 4.2, wobble: [1.3, 0.7] },
    3,
    { minX: 3, maxX: 36, minY: 18, maxY: 26 },
  );
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, pond.x, pond.y, pond.radius, pond.wobble);

  // 西(home)・北(northeast)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["south", "east"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

// ---------------- northeast領域(homeの北東) ----------------
function buildNortheast(random: () => number): Region {
  const ground = makeGrid(CHUNK_W, CHUNK_H, GRASS);
  const obstacles = makeGrid(CHUNK_W, CHUNK_H, 0);

  // 中央に大きな湖
  const pond = jitterPond(
    random,
    { x: 20, y: 15, radius: 5.6, wobble: [1.8, 0.9] },
    3,
    { minX: 3, maxX: 36, minY: 3, maxY: 26 },
  );
  fillOrganicWater(ground, CHUNK_W, CHUNK_H, pond.x, pond.y, pond.radius, pond.wobble);

  // 西(north)・南(east)は隣接領域なので壁を作らない
  addBorderWalls(obstacles, CHUNK_W, CHUNK_H, new Set(["north", "east"]));

  return { ground, obstacles, npcs: [], shops: [] };
}

function blitGrid(dst: Grid, dstW: number, src: Grid, srcW: number, srcH: number, originX: number, originY: number): void {
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      dst[(originY + y) * dstW + (originX + x)] = src[y * srcW + x];
    }
  }
}

function offsetObjects(objects: TiledObject[], originX: number, originY: number): TiledObject[] {
  return objects.map((obj) => ({
    ...obj,
    x: obj.x + originX * TILE_SIZE,
    y: obj.y + originY * TILE_SIZE,
  }));
}

// 元のデザイン解像度(40x30)で作った領域を、タイル単位でfactor倍に引き伸ばす
function scaleGrid(grid: Grid, width: number, height: number, factor: number): Grid {
  const newWidth = width * factor;
  const out = new Array<number>(newWidth * height * factor);
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

function scaleObjects(objects: TiledObject[], factor: number): TiledObject[] {
  return objects.map((obj) => ({
    ...obj,
    x: obj.x * factor,
    y: obj.y * factor,
    width: obj.width * factor,
    height: obj.height * factor,
  }));
}

function scaleRegion(region: Region, factor: number): Region {
  return {
    ground: scaleGrid(region.ground, CHUNK_W, CHUNK_H, factor),
    obstacles: scaleGrid(region.obstacles, CHUNK_W, CHUNK_H, factor),
    npcs: scaleObjects(region.npcs, factor),
    shops: scaleObjects(region.shops, factor),
  };
}

/**
 * ルームごとのワールドシードから、地形(池の位置・大きさ)とショップ・クラフト台の位置を
 * 決定的に生成する。同じシードなら常に同じ配置になり、ゲームリセットで新しいシードが
 * 発行されるたびに(道・境界壁・NPCの骨格はそのまま)地形と配置が少し変わる。
 */
export function generateWorldMap(seed: number): GeneratedWorldMap {
  const random = createRandom(seed);
  nextObjectIdCounter = 1;

  const home = buildHome(random);
  const north = buildNorth(random);
  const east = buildEast(random);
  const northeast = buildNortheast(random);

  const regions = [
    { ...scaleRegion(north, SCALE), originX: 0, originY: 0 },
    { ...scaleRegion(home, SCALE), originX: 0, originY: SCALED_CHUNK_H },
    { ...scaleRegion(east, SCALE), originX: SCALED_CHUNK_W, originY: SCALED_CHUNK_H },
    { ...scaleRegion(northeast, SCALE), originX: SCALED_CHUNK_W, originY: 0 },
  ];

  const worldGround = makeGrid(WORLD_W, WORLD_H, GRASS);
  const worldObstacles = makeGrid(WORLD_W, WORLD_H, 0);
  const worldNpcs: TiledObject[] = [];
  const worldShops: TiledObject[] = [];

  for (const region of regions) {
    blitGrid(worldGround, WORLD_W, region.ground, SCALED_CHUNK_W, SCALED_CHUNK_H, region.originX, region.originY);
    blitGrid(worldObstacles, WORLD_W, region.obstacles, SCALED_CHUNK_W, SCALED_CHUNK_H, region.originX, region.originY);
    worldNpcs.push(...offsetObjects(region.npcs, region.originX, region.originY));
    worldShops.push(...offsetObjects(region.shops, region.originX, region.originY));
  }

  const tiledJson = {
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
    nextobjectid: nextObjectIdCounter,
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

  // ホーム領域のローカル座標(未スケール) → ワールドタイル座標
  const craftTableTile: Point = {
    x: home.craftTableLocal.x * SCALE,
    y: SCALED_CHUNK_H + home.craftTableLocal.y * SCALE,
  };

  return { tiledJson, craftTableTile };
}
