import Phaser from "phaser";
import { Unit } from "./Unit";

export class Chili extends Unit {
  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, "veggie", {
      maxHp: 100,
      speed: 3,
      attackDamage: 15,
      attackRange: 1,
      attackCooldown: 800,
    }, col, row);
  }

  getColor(): number {
    return 0xcc3333;
  }

  getLabel(): string {
    return "Chili";
  }
}
