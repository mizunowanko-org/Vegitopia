export enum TerrainType {
  River = "river",
  Wilderness = "wilderness",
  Limestone = "limestone",
  Farm = "farm",
}

export interface FarmTile {
  buildProgress: number; // 0-100
  hp: number;
  maxHp: number;
  seeded: boolean;
  growthTimer: number; // 0-100
}

export const TILE_SIZE = 32;
export const BUILD_THRESHOLD = 100;
export const FARM_MAX_HP = 100;
export const GROWTH_THRESHOLD = 100;
export const BUILDABLE_DISTANCE = 5;

const TERRAIN_COLORS: Record<TerrainType, number> = {
  [TerrainType.River]: 0x4488cc,
  [TerrainType.Wilderness]: 0x88aa44,
  [TerrainType.Limestone]: 0x999999,
  [TerrainType.Farm]: 0x664422,
};

export class TerrainGrid {
  readonly cols: number;
  readonly rows: number;
  private grid: TerrainType[][];
  private farms: Map<string, FarmTile> = new Map();
  private riverTiles: { col: number; row: number }[] = [];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < cols; c++) {
        this.grid[r][c] = TerrainType.Wilderness;
      }
    }
  }

  setTerrain(col: number, row: number, type: TerrainType): void {
    if (!this.inBounds(col, row)) return;
    this.grid[row][col] = type;
    if (type === TerrainType.River) {
      this.riverTiles.push({ col, row });
    }
  }

  getTerrain(col: number, row: number): TerrainType {
    if (!this.inBounds(col, row)) return TerrainType.Limestone;
    return this.grid[row][col];
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  isPassable(col: number, row: number): boolean {
    const t = this.getTerrain(col, row);
    return t !== TerrainType.River && t !== TerrainType.Limestone;
  }

  isBuildable(col: number, row: number): boolean {
    if (!this.inBounds(col, row)) return false;
    if (this.grid[row][col] !== TerrainType.Wilderness) return false;
    return this.distanceToRiver(col, row) <= BUILDABLE_DISTANCE;
  }

  getBuildBlockedReason(col: number, row: number): string {
    if (!this.inBounds(col, row)) return "マップの外だよ！";
    const terrain = this.grid[row][col];
    if (terrain === TerrainType.River) return "川の上には建てられないよ！";
    if (terrain === TerrainType.Limestone) return "石灰岩の上には建てられないよ！";
    if (terrain === TerrainType.Farm) return "もう畑があるよ！";
    if (this.distanceToRiver(col, row) > BUILDABLE_DISTANCE) return "川から遠すぎるよ！";
    return "ここには建てられないよ！";
  }

  private distanceToRiver(col: number, row: number): number {
    let minDist = Infinity;
    for (const rt of this.riverTiles) {
      const dist = Math.abs(col - rt.col) + Math.abs(row - rt.row);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  startBuilding(col: number, row: number): boolean {
    if (!this.isBuildable(col, row)) return false;
    const key = `${col},${row}`;
    if (!this.farms.has(key)) {
      this.farms.set(key, {
        buildProgress: 0,
        hp: 0,
        maxHp: FARM_MAX_HP,
        seeded: false,
        growthTimer: 0,
      });
    }
    return true;
  }

  advanceBuild(col: number, row: number, amount: number): boolean {
    const key = `${col},${row}`;
    const farm = this.farms.get(key);
    if (!farm) return false;
    if (farm.buildProgress >= BUILD_THRESHOLD) return false;
    farm.buildProgress = Math.min(farm.buildProgress + amount, BUILD_THRESHOLD);
    if (farm.buildProgress >= BUILD_THRESHOLD) {
      this.grid[row][col] = TerrainType.Farm;
      farm.hp = farm.maxHp;
    }
    return true;
  }

  repairFarm(col: number, row: number, amount: number): boolean {
    const farm = this.getCompletedFarm(col, row);
    if (!farm || farm.hp >= farm.maxHp) return false;
    farm.hp = Math.min(farm.hp + amount, farm.maxHp);
    return true;
  }

  seedFarm(col: number, row: number): boolean {
    const farm = this.getCompletedFarm(col, row);
    if (!farm || farm.seeded) return false;
    farm.seeded = true;
    farm.growthTimer = 0;
    return true;
  }

  advanceGrowth(col: number, row: number, amount: number): number | null {
    const farm = this.getCompletedFarm(col, row);
    if (!farm || !farm.seeded) return null;
    if (farm.growthTimer >= GROWTH_THRESHOLD) return null;
    farm.growthTimer = Math.min(farm.growthTimer + amount, GROWTH_THRESHOLD);
    if (farm.growthTimer >= GROWTH_THRESHOLD) {
      farm.seeded = false;
      farm.growthTimer = 0;
      return 1; // harvest ready — spawn a unit
    }
    return null;
  }

  damageFarm(col: number, row: number, amount: number): boolean {
    const farm = this.getCompletedFarm(col, row);
    if (!farm) return false;
    farm.hp = Math.max(farm.hp - amount, 0);
    if (farm.hp <= 0) {
      this.farms.delete(`${col},${row}`);
      this.grid[row][col] = TerrainType.Wilderness;
    }
    return true;
  }

  getFarm(col: number, row: number): FarmTile | undefined {
    return this.farms.get(`${col},${row}`);
  }

  getCompletedFarm(col: number, row: number): FarmTile | undefined {
    const farm = this.farms.get(`${col},${row}`);
    if (farm && farm.buildProgress >= BUILD_THRESHOLD) return farm;
    return undefined;
  }

  getBuildingInProgress(col: number, row: number): FarmTile | undefined {
    const farm = this.farms.get(`${col},${row}`);
    if (farm && farm.buildProgress < BUILD_THRESHOLD) return farm;
    return undefined;
  }

  getAllFarms(): { col: number; row: number; farm: FarmTile }[] {
    const result: { col: number; row: number; farm: FarmTile }[] = [];
    for (const [key, farm] of this.farms) {
      if (farm.buildProgress >= BUILD_THRESHOLD) {
        const [c, r] = key.split(",").map(Number);
        result.push({ col: c, row: r, farm });
      }
    }
    return result;
  }

  getAllBuildingSites(): { col: number; row: number; farm: FarmTile }[] {
    const result: { col: number; row: number; farm: FarmTile }[] = [];
    for (const [key, farm] of this.farms) {
      if (farm.buildProgress < BUILD_THRESHOLD) {
        const [c, r] = key.split(",").map(Number);
        result.push({ col: c, row: r, farm });
      }
    }
    return result;
  }

  getTerrainColor(col: number, row: number): number {
    const terrain = this.getTerrain(col, row);
    if (terrain === TerrainType.Wilderness) {
      const key = `${col},${row}`;
      const farm = this.farms.get(key);
      if (farm && farm.buildProgress < BUILD_THRESHOLD) {
        // building in progress — interpolate color
        const t = farm.buildProgress / BUILD_THRESHOLD;
        return lerpColor(TERRAIN_COLORS[TerrainType.Wilderness], TERRAIN_COLORS[TerrainType.Farm], t);
      }
    }
    return TERRAIN_COLORS[terrain];
  }

  /** BFS to find shortest path between two passable tiles. Returns the path (excluding start) or null. */
  findPath(startCol: number, startRow: number, goalCol: number, goalRow: number): { col: number; row: number }[] | null {
    if (!this.inBounds(startCol, startRow) || !this.inBounds(goalCol, goalRow)) return null;
    if (startCol === goalCol && startRow === goalRow) return [];

    const key = (c: number, r: number) => r * this.cols + c;
    const visited = new Set<number>();
    const prev = new Map<number, { col: number; row: number }>();
    const queue: { col: number; row: number }[] = [{ col: startCol, row: startRow }];
    visited.add(key(startCol, startRow));

    const dirs = [{ dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const d of dirs) {
        const nc = cur.col + d.dc;
        const nr = cur.row + d.dr;
        const nk = key(nc, nr);
        if (!this.inBounds(nc, nr) || visited.has(nk) || !this.isPassable(nc, nr)) continue;
        visited.add(nk);
        prev.set(nk, { col: cur.col, row: cur.row });
        if (nc === goalCol && nr === goalRow) {
          // Reconstruct path
          const path: { col: number; row: number }[] = [];
          let c = nc, r = nr;
          while (c !== startCol || r !== startRow) {
            path.push({ col: c, row: r });
            const p = prev.get(key(c, r))!;
            c = p.col;
            r = p.row;
          }
          path.reverse();
          return path;
        }
        queue.push({ col: nc, row: nr });
      }
    }
    return null; // unreachable
  }

  /** Check if a tile is reachable from another via passable tiles. */
  isReachable(fromCol: number, fromRow: number, toCol: number, toRow: number): boolean {
    return this.findPath(fromCol, fromRow, toCol, toRow) !== null;
  }

  generateMap(): void {
    // River running roughly through the middle
    const midRow = Math.floor(this.rows / 2);
    // Bridge positions at roughly 1/3 and 2/3 across the map
    const bridge1 = Math.floor(this.cols / 3);
    const bridge2 = Math.floor((this.cols * 2) / 3);
    for (let c = 0; c < this.cols; c++) {
      // Skip river tiles at bridge positions to create passable gaps
      if (c === bridge1 || c === bridge2) continue;
      const offset = Math.floor(Math.sin(c * 0.3) * 2);
      for (let dr = -1; dr <= 1; dr++) {
        const r = midRow + offset + dr;
        if (this.inBounds(c, r)) {
          this.setTerrain(c, r, TerrainType.River);
        }
      }
    }

    // Scatter some limestone
    const rng = mulberry32(42);
    for (let i = 0; i < Math.floor(this.cols * this.rows * 0.05); i++) {
      const c = Math.floor(rng() * this.cols);
      const r = Math.floor(rng() * this.rows);
      if (this.grid[r][c] === TerrainType.Wilderness) {
        this.setTerrain(c, r, TerrainType.Limestone);
      }
    }
  }
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}
