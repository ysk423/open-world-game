import type { ItemId } from "./Inventory";

export type WorldContentPlan = {
  gathering: { itemId: ItemId; x: number; y: number }[];
  monsters: { x: number; y: number }[];
  animals: { x: number; y: number }[];
  rocks: { x: number; y: number }[];
};

// ルームごとに少しずつ内容を変えるための配置数(採集ポイントの内訳)
const GATHERING_COUNTS: Partial<Record<ItemId, number>> = {
  wood: 14,
  stone: 10,
  herb: 12,
};
const MONSTER_COUNT = 6;
const ANIMAL_COUNT = 8;
const ROCK_COUNT = 22;

// 配置済みのもの・避けたい地点(スポーン地点やNPCなど)から最低限空けたい距離(ワールドpx)
const MIN_SPACING_PX = 56;
const MAX_ATTEMPTS_PER_ITEM = 40;

/** 決定的な擬似乱数生成器(mulberry32)。同じシードなら常に同じ並びの乱数を返す */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * サーバーが発行したルームごとのシード値をもとに、採集ポイント・モンスター・動物・岩の
 * 配置を決定的に生成する。同じシードのルームなら常に同じ配置になり、ルームが変わる
 * (=シードが変わる)と配置も少し変わる。
 */
export function generateWorldContent(
  seed: number,
  walkableTiles: { x: number; y: number }[],
  tileSize: number,
  avoidPoints: { x: number; y: number }[],
): WorldContentPlan {
  const random = createRandom(seed);
  const placed: { x: number; y: number }[] = [...avoidPoints];

  function pickPosition(): { x: number; y: number } | null {
    if (walkableTiles.length === 0) return null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_ITEM; attempt++) {
      const tile = walkableTiles[Math.floor(random() * walkableTiles.length)];
      const x = tile.x * tileSize + tileSize / 2;
      const y = tile.y * tileSize + tileSize / 2;
      const tooClose = placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_SPACING_PX);
      if (!tooClose) return { x, y };
    }
    return null;
  }

  function placeMany(count: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const pos = pickPosition();
      if (!pos) break;
      placed.push(pos);
      result.push(pos);
    }
    return result;
  }

  const gathering: { itemId: ItemId; x: number; y: number }[] = [];
  for (const [itemId, count] of Object.entries(GATHERING_COUNTS) as [ItemId, number][]) {
    for (const pos of placeMany(count)) gathering.push({ itemId, ...pos });
  }

  const monsters = placeMany(MONSTER_COUNT);
  const animals = placeMany(ANIMAL_COUNT);
  const rocks = placeMany(ROCK_COUNT);

  return { gathering, monsters, animals, rocks };
}
