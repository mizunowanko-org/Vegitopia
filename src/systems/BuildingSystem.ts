import { TerrainGrid } from "../terrain/TerrainGrid";
import { Potato } from "../units/Potato";

const BUILD_RATE = 20; // progress per second
const REPAIR_RATE = 15; // hp per second

export class BuildingSystem {
  update(delta: number, builders: Potato[], grid: TerrainGrid): void {
    const dt = delta / 1000;
    for (const builder of builders) {
      if (!builder.alive || builder.isMoving) continue;

      const col = builder.col;
      const row = builder.row;

      // Try to advance building in progress at current tile
      const building = grid.getBuildingInProgress(col, row);
      if (building) {
        grid.advanceBuild(col, row, BUILD_RATE * dt);
        continue;
      }

      // Try to repair completed farm at current tile
      const farm = grid.getCompletedFarm(col, row);
      if (farm && farm.hp < farm.maxHp) {
        grid.repairFarm(col, row, REPAIR_RATE * dt);
      }
    }
  }
}
