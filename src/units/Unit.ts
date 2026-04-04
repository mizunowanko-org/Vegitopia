import Phaser from "phaser";
import { TILE_SIZE } from "../terrain/TerrainGrid";

export type Team = "veggie" | "pest";

export interface UnitStats {
  maxHp: number;
  speed: number; // tiles per second
  attackDamage: number;
  attackRange: number; // in tiles (1 = adjacent)
  attackCooldown: number; // ms
}

export abstract class Unit {
  readonly team: Team;
  readonly stats: UnitStats;
  hp: number;
  col: number;
  row: number;
  targetCol: number;
  targetRow: number;
  graphics: Phaser.GameObjects.Graphics;
  labelText: Phaser.GameObjects.Text;
  alive: boolean = true;
  lastAttackTime: number = 0;

  private moveProgress: number = 0;
  private prevCol: number;
  private prevRow: number;

  constructor(
    scene: Phaser.Scene,
    team: Team,
    stats: UnitStats,
    col: number,
    row: number,
  ) {
    this.team = team;
    this.stats = { ...stats };
    this.hp = stats.maxHp;
    this.col = col;
    this.row = row;
    this.targetCol = col;
    this.targetRow = row;
    this.prevCol = col;
    this.prevRow = row;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);
    this.labelText = scene.add.text(0, 0, this.getLabel()[0], {
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.labelText.setDepth(11);
  }

  get x(): number {
    const fromX = this.prevCol * TILE_SIZE + TILE_SIZE / 2;
    const toX = this.col * TILE_SIZE + TILE_SIZE / 2;
    return fromX + (toX - fromX) * this.moveProgress;
  }

  get y(): number {
    const fromY = this.prevRow * TILE_SIZE + TILE_SIZE / 2;
    const toY = this.row * TILE_SIZE + TILE_SIZE / 2;
    return fromY + (toY - fromY) * this.moveProgress;
  }

  get isMoving(): boolean {
    return this.prevCol !== this.col || this.prevRow !== this.row;
  }

  get isAtTarget(): boolean {
    return this.col === this.targetCol && this.row === this.targetRow && this.moveProgress >= 1;
  }

  moveTo(col: number, row: number): void {
    if (this.isMoving && this.moveProgress < 1) return; // still moving
    if (col === this.col && row === this.row) return;
    this.prevCol = this.col;
    this.prevRow = this.row;
    this.col = col;
    this.row = row;
    this.moveProgress = 0;
  }

  updateMovement(delta: number): void {
    if (!this.isMoving) {
      this.moveProgress = 1;
      return;
    }
    const stepTime = 1000 / this.stats.speed;
    this.moveProgress = Math.min(this.moveProgress + delta / stepTime, 1);
    if (this.moveProgress >= 1) {
      this.prevCol = this.col;
      this.prevRow = this.row;
    }
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(this.hp - amount, 0);
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  canAttack(time: number): boolean {
    return time - this.lastAttackTime >= this.stats.attackCooldown;
  }

  abstract getColor(): number;
  abstract getLabel(): string;

  draw(): void {
    this.graphics.clear();
    if (!this.alive) {
      this.labelText.setVisible(false);
      return;
    }

    const cx = this.x;
    const cy = this.y;
    const radius = TILE_SIZE * 0.35;

    // Body
    this.graphics.fillStyle(this.getColor(), 1);
    this.graphics.fillCircle(cx, cy, radius);

    // Label
    this.labelText.setPosition(cx, cy);
    this.labelText.setVisible(true);

    // HP bar
    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 3;
    const barX = cx - barWidth / 2;
    const barY = cy - radius - 6;
    const hpRatio = this.hp / this.stats.maxHp;

    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);
    this.graphics.fillStyle(hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.25 ? 0xcccc44 : 0xcc4444, 1);
    this.graphics.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }

  destroy(): void {
    this.graphics.destroy();
    this.labelText.destroy();
  }

  distanceTo(col: number, row: number): number {
    return Math.abs(this.col - col) + Math.abs(this.row - row);
  }
}
