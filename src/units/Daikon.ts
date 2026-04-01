import Phaser from "phaser";
import { Unit } from "./Unit";

export class Daikon extends Unit {
  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, "veggie", {
      maxHp: 60,
      speed: 2,
      attackDamage: 0,
      attackRange: 0,
      attackCooldown: Infinity,
    }, col, row);
  }

  getColor(): number {
    return 0xeeeedd;
  }

  getLabel(): string {
    return "Daikon";
  }
}
