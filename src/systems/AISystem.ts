import { Unit } from "../units/Unit";
import { Potato } from "../units/Potato";
import { Daikon } from "../units/Daikon";
import { Chili } from "../units/Chili";
import { Aphid } from "../units/Aphid";
import { TerrainGrid } from "../terrain/TerrainGrid";

export class AISystem {
  update(delta: number, allUnits: Unit[], grid: TerrainGrid): void {
    for (const unit of allUnits) {
      if (!unit.alive || unit.isMoving) continue;

      if (unit instanceof Potato) {
        this.updateBuilder(unit, grid);
      } else if (unit instanceof Daikon) {
        this.updateFarmer(unit, grid);
      } else if (unit instanceof Chili) {
        this.updateFighter(unit, allUnits, grid);
      } else if (unit instanceof Aphid) {
        this.updatePest(unit, allUnits, grid);
      }
    }
  }

  private updateBuilder(unit: Potato, grid: TerrainGrid): void {
    // If at a building site or damaged farm, stay
    const building = grid.getBuildingInProgress(unit.col, unit.row);
    if (building) return;

    const farm = grid.getCompletedFarm(unit.col, unit.row);
    if (farm && farm.hp < farm.maxHp) return;

    // Find nearest building site
    const sites = grid.getAllBuildingSites();
    const nearest = this.findNearest(unit, sites);
    if (nearest) {
      this.moveToward(unit, nearest.col, nearest.row, grid);
      return;
    }

    // Find nearest damaged farm
    const damagedFarms = grid.getAllFarms().filter(f => f.farm.hp < f.farm.maxHp);
    const nearestDamaged = this.findNearest(unit, damagedFarms);
    if (nearestDamaged) {
      this.moveToward(unit, nearestDamaged.col, nearestDamaged.row, grid);
      return;
    }

    // Idle — wander near farms
    this.wander(unit, grid);
  }

  private updateFarmer(unit: Daikon, grid: TerrainGrid): void {
    // If at a farm, stay
    const farm = grid.getCompletedFarm(unit.col, unit.row);
    if (farm) return;

    // Find nearest unseeded or growing farm
    const farms = grid.getAllFarms();
    const target = farms.find(f => !f.farm.seeded || f.farm.growthTimer < 100);
    if (target) {
      this.moveToward(unit, target.col, target.row, grid);
      return;
    }

    // Find any farm
    const anyFarm = this.findNearest(unit, farms);
    if (anyFarm) {
      this.moveToward(unit, anyFarm.col, anyFarm.row, grid);
      return;
    }

    this.wander(unit, grid);
  }

  private updateFighter(unit: Chili, allUnits: Unit[], grid: TerrainGrid): void {
    // Find nearest enemy
    let nearestDist = Infinity;
    let nearestEnemy: Unit | null = null;
    for (const other of allUnits) {
      if (!other.alive || other.team === unit.team) continue;
      const dist = unit.distanceTo(other.col, other.row);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = other;
      }
    }

    if (nearestEnemy) {
      if (nearestDist <= unit.stats.attackRange) return; // in range, let combat handle it
      // Move toward enemy
      this.stepToward(unit, nearestEnemy.col, nearestEnemy.row, grid);
    }
  }

  private updatePest(unit: Aphid, allUnits: Unit[], grid: TerrainGrid): void {
    // Priority: attack farms, then veggies on the way
    const farms = grid.getAllFarms();
    const nearestFarm = this.findNearest(unit, farms);

    if (nearestFarm) {
      const dist = unit.distanceTo(nearestFarm.col, nearestFarm.row);
      if (dist <= unit.stats.attackRange) return; // in range
      this.moveToward(unit, nearestFarm.col, nearestFarm.row, grid);
      return;
    }

    // No farms — attack nearest veggie
    let nearestDist = Infinity;
    let nearestVeggie: Unit | null = null;
    for (const other of allUnits) {
      if (!other.alive || other.team !== "veggie") continue;
      const dist = unit.distanceTo(other.col, other.row);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestVeggie = other;
      }
    }

    if (nearestVeggie) {
      this.stepToward(unit, nearestVeggie.col, nearestVeggie.row, grid);
      return;
    }

    this.wander(unit, grid);
  }

  private findNearest<T extends { col: number; row: number }>(
    unit: Unit,
    targets: T[],
  ): T | null {
    let best: T | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const d = unit.distanceTo(t.col, t.row);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  private moveToward(unit: Unit, targetCol: number, targetRow: number, grid: TerrainGrid): void {
    const dx = Math.sign(targetCol - unit.col);
    const dy = Math.sign(targetRow - unit.row);

    // Try horizontal first, then vertical
    if (dx !== 0 && grid.isPassable(unit.col + dx, unit.row)) {
      unit.moveTo(unit.col + dx, unit.row);
    } else if (dy !== 0 && grid.isPassable(unit.col, unit.row + dy)) {
      unit.moveTo(unit.col, unit.row + dy);
    } else if (dx !== 0 && dy !== 0) {
      // Try the other axis
      if (grid.isPassable(unit.col, unit.row + dy)) {
        unit.moveTo(unit.col, unit.row + dy);
      } else if (grid.isPassable(unit.col + dx, unit.row)) {
        unit.moveTo(unit.col + dx, unit.row);
      }
    }
  }

  private stepToward(unit: Unit, targetCol: number, targetRow: number, grid: TerrainGrid): void {
    const dx = Math.sign(targetCol - unit.col);
    const dy = Math.sign(targetRow - unit.row);
    const preferHorizontal = Math.abs(targetCol - unit.col) >= Math.abs(targetRow - unit.row);

    const tryMove = (dc: number, dr: number): boolean => {
      if ((dc !== 0 || dr !== 0) && grid.isPassable(unit.col + dc, unit.row + dr)) {
        unit.moveTo(unit.col + dc, unit.row + dr);
        return true;
      }
      return false;
    };

    if (preferHorizontal) {
      if (tryMove(dx, 0)) return;
      if (tryMove(0, dy)) return;
    } else {
      if (tryMove(0, dy)) return;
      if (tryMove(dx, 0)) return;
    }
  }

  private wander(unit: Unit, grid: TerrainGrid): void {
    // Random walk
    const dirs = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
    ];
    // Only wander occasionally
    if (Math.random() > 0.02) return;
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const nc = unit.col + dir.dc;
    const nr = unit.row + dir.dr;
    if (grid.isPassable(nc, nr)) {
      unit.moveTo(nc, nr);
    }
  }
}
