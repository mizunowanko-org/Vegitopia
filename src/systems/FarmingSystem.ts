import { TerrainGrid } from "../terrain/TerrainGrid";
import { Daikon } from "../units/Daikon";

const GROWTH_RATE = 10; // growth per second

export interface HarvestEvent {
  col: number;
  row: number;
}

export class FarmingSystem {
  update(delta: number, farmers: Daikon[], grid: TerrainGrid): HarvestEvent[] {
    const dt = delta / 1000;
    const harvests: HarvestEvent[] = [];

    for (const farmer of farmers) {
      if (!farmer.alive || farmer.isMoving) continue;

      const col = farmer.col;
      const row = farmer.row;
      const farm = grid.getCompletedFarm(col, row);
      if (!farm) continue;

      // Auto-seed if not seeded
      if (!farm.seeded) {
        grid.seedFarm(col, row);
      }

      // Advance growth
      const result = grid.advanceGrowth(col, row, GROWTH_RATE * dt);
      if (result !== null) {
        harvests.push({ col, row });
      }
    }

    return harvests;
  }
}
