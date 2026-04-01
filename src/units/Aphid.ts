import Phaser from "phaser";
import { Unit } from "./Unit";

export class Aphid extends Unit {
  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, "pest", {
      maxHp: 50,
      speed: 1.5,
      attackDamage: 8,
      attackRange: 1,
      attackCooldown: 1200,
    }, col, row);
  }

  getColor(): number {
    return 0x44aa44;
  }

  getLabel(): string {
    return "Aphid";
  }
}
