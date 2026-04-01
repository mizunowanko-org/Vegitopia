import { Unit } from "../units/Unit";
import { TerrainGrid } from "../terrain/TerrainGrid";

export class CombatSystem {
  update(
    time: number,
    allUnits: Unit[],
    grid: TerrainGrid,
  ): void {
    for (const attacker of allUnits) {
      if (!attacker.alive || attacker.isMoving) continue;
      if (attacker.stats.attackDamage <= 0) continue;
      if (!attacker.canAttack(time)) continue;

      if (attacker.team === "pest") {
        // Pests prioritize farms, then veggies
        if (this.attackAdjacentFarm(attacker, grid, time)) continue;
        this.attackAdjacentEnemy(attacker, allUnits, time);
      } else {
        // Veggies attack adjacent pests
        this.attackAdjacentEnemy(attacker, allUnits, time);
      }
    }
  }

  private attackAdjacentFarm(attacker: Unit, grid: TerrainGrid, time: number): boolean {
    const neighbors = this.getAdjacentTiles(attacker.col, attacker.row);
    for (const { col, row } of neighbors) {
      const farm = grid.getCompletedFarm(col, row);
      if (farm) {
        grid.damageFarm(col, row, attacker.stats.attackDamage);
        attacker.lastAttackTime = time;
        return true;
      }
    }
    // Also check current tile
    const farm = grid.getCompletedFarm(attacker.col, attacker.row);
    if (farm) {
      grid.damageFarm(attacker.col, attacker.row, attacker.stats.attackDamage);
      attacker.lastAttackTime = time;
      return true;
    }
    return false;
  }

  private attackAdjacentEnemy(attacker: Unit, allUnits: Unit[], time: number): boolean {
    for (const target of allUnits) {
      if (!target.alive || target.team === attacker.team) continue;
      if (attacker.distanceTo(target.col, target.row) <= attacker.stats.attackRange) {
        target.takeDamage(attacker.stats.attackDamage);
        attacker.lastAttackTime = time;
        return true;
      }
    }
    return false;
  }

  private getAdjacentTiles(col: number, row: number): { col: number; row: number }[] {
    return [
      { col: col - 1, row },
      { col: col + 1, row },
      { col, row: row - 1 },
      { col, row: row + 1 },
    ];
  }
}
