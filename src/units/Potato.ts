import Phaser from "phaser";
import { Unit } from "./Unit";

export class Potato extends Unit {
  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, "veggie", {
      maxHp: 80,
      speed: 2,
      attackDamage: 0,
      attackRange: 0,
      attackCooldown: Infinity,
    }, col, row);
  }

  getColor(): number {
    return 0xddb860;
  }

  getLabel(): string {
    return "Potato";
  }
}
