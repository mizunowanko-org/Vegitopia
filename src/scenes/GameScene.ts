import Phaser from "phaser";
import { TerrainGrid, TerrainType, TILE_SIZE } from "../terrain/TerrainGrid";
import { Unit } from "../units/Unit";
import { Potato } from "../units/Potato";
import { Daikon } from "../units/Daikon";
import { Chili } from "../units/Chili";
import { Aphid } from "../units/Aphid";
import { BuildingSystem } from "../systems/BuildingSystem";
import { FarmingSystem } from "../systems/FarmingSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { AISystem } from "../systems/AISystem";
import { HUD } from "../ui/HUD";

const MAP_COLS = 40;
const MAP_ROWS = 30;
const ENEMY_SPAWN_INTERVAL = 15000; // ms

export class GameScene extends Phaser.Scene {
  private grid!: TerrainGrid;
  private units: Unit[] = [];
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private hud!: HUD;
  private buildingSystem!: BuildingSystem;
  private farmingSystem!: FarmingSystem;
  private combatSystem!: CombatSystem;
  private aiSystem!: AISystem;
  private lastEnemySpawn: number = 0;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.grid = new TerrainGrid(MAP_COLS, MAP_ROWS);
    this.grid.generateMap();

    this.terrainGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(5);

    this.buildingSystem = new BuildingSystem();
    this.farmingSystem = new FarmingSystem();
    this.combatSystem = new CombatSystem();
    this.aiSystem = new AISystem();
    this.hud = new HUD(this);

    // Camera setup
    this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    this.cameras.main.setZoom(1);

    // Spawn initial units
    this.spawnInitialUnits();

    // Input handling
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < 60) return; // ignore HUD area clicks
      this.handleClick(pointer);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.handleHover(pointer);
    });

    // Camera drag
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Zoom
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gx: number, _gy: number, _dx: number, dy: number) => {
      const zoom = this.cameras.main.zoom;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom - dy * 0.001, 0.5, 3));
    });

    this.lastEnemySpawn = this.time.now;
    this.drawTerrain();
  }

  update(time: number, delta: number): void {
    // Systems
    const potatoes = this.units.filter((u): u is Potato => u instanceof Potato && u.alive);
    const daikons = this.units.filter((u): u is Daikon => u instanceof Daikon && u.alive);

    this.aiSystem.update(delta, this.units.filter(u => u.alive), this.grid);
    this.buildingSystem.update(delta, potatoes, this.grid);

    const harvests = this.farmingSystem.update(delta, daikons, this.grid);
    for (const h of harvests) {
      this.spawnRandomVeggie(h.col, h.row);
    }

    this.combatSystem.update(time, this.units.filter(u => u.alive), this.grid);

    // Update unit movement
    for (const unit of this.units) {
      if (unit.alive) {
        unit.updateMovement(delta);
        unit.draw();
      }
    }

    // Remove dead units
    this.cleanupDead();

    // Spawn enemies periodically
    if (time - this.lastEnemySpawn > ENEMY_SPAWN_INTERVAL) {
      this.spawnEnemy();
      this.lastEnemySpawn = time;
    }

    this.drawTerrain();
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const color = this.grid.getTerrainColor(c, r);
        this.terrainGraphics.fillStyle(color, 1);
        this.terrainGraphics.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);

        // Show farm HP and growth
        const farm = this.grid.getCompletedFarm(c, r);
        if (farm) {
          // HP bar on tile
          const barY = r * TILE_SIZE + TILE_SIZE - 4;
          const hpRatio = farm.hp / farm.maxHp;
          this.terrainGraphics.fillStyle(0x333333, 1);
          this.terrainGraphics.fillRect(c * TILE_SIZE + 2, barY, TILE_SIZE - 5, 2);
          this.terrainGraphics.fillStyle(0x44cc44, 1);
          this.terrainGraphics.fillRect(c * TILE_SIZE + 2, barY, (TILE_SIZE - 5) * hpRatio, 2);

          // Growth indicator
          if (farm.seeded) {
            const growRatio = farm.growthTimer / 100;
            this.terrainGraphics.fillStyle(0x88dd88, 0.6);
            const dotSize = 4 + growRatio * 6;
            this.terrainGraphics.fillCircle(
              c * TILE_SIZE + TILE_SIZE / 2,
              r * TILE_SIZE + TILE_SIZE / 2,
              dotSize,
            );
          }
        }
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const { col, row } = this.hud.worldToTile(worldX, worldY);

    if (!this.grid.inBounds(col, row)) return;

    if (this.hud.placementMode === "build") {
      if (this.grid.isBuildable(col, row)) {
        this.grid.startBuilding(col, row);
      }
    } else if (this.hud.placementMode === "seed") {
      this.grid.seedFarm(col, row);
    }
  }

  private handleHover(pointer: Phaser.Input.Pointer): void {
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const { col, row } = this.hud.worldToTile(worldX, worldY);

    this.highlightGraphics.clear();

    if (!this.grid.inBounds(col, row)) return;

    // Highlight tile
    this.highlightGraphics.lineStyle(2, 0xffffff, 0.5);
    this.highlightGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);

    // Show info
    const terrain = this.grid.getTerrain(col, row);
    let extra = "";
    if (this.hud.placementMode === "build" && this.grid.isBuildable(col, row)) {
      extra = "Click to build!";
    }
    const farm = this.grid.getFarm(col, row);
    if (farm) {
      if (farm.buildProgress < 100) {
        extra = `Building: ${Math.floor(farm.buildProgress)}%`;
      } else {
        extra = `Farm HP: ${Math.floor(farm.hp)}/${farm.maxHp}`;
        if (farm.seeded) {
          extra += ` | Growth: ${Math.floor(farm.growthTimer)}%`;
        }
      }
    }
    this.hud.showTileInfo(col, row, terrain, extra);
  }

  private spawnInitialUnits(): void {
    const midRow = Math.floor(MAP_ROWS / 2);
    // Spawn veggies near the river
    this.addUnit(new Potato(this, 5, midRow - 4));
    this.addUnit(new Potato(this, 7, midRow - 4));
    this.addUnit(new Daikon(this, 6, midRow - 5));
    this.addUnit(new Daikon(this, 8, midRow - 5));
    this.addUnit(new Chili(this, 4, midRow - 3));
    this.addUnit(new Chili(this, 9, midRow - 3));

    // Spawn initial enemies at map edges
    this.addUnit(new Aphid(this, 0, 2));
    this.addUnit(new Aphid(this, MAP_COLS - 1, MAP_ROWS - 3));
  }

  private spawnEnemy(): void {
    const edge = Math.floor(Math.random() * 4);
    let col: number, row: number;
    switch (edge) {
      case 0: col = 0; row = Math.floor(Math.random() * MAP_ROWS); break;
      case 1: col = MAP_COLS - 1; row = Math.floor(Math.random() * MAP_ROWS); break;
      case 2: col = Math.floor(Math.random() * MAP_COLS); row = 0; break;
      default: col = Math.floor(Math.random() * MAP_COLS); row = MAP_ROWS - 1; break;
    }
    if (this.grid.isPassable(col, row)) {
      this.addUnit(new Aphid(this, col, row));
    }
  }

  private spawnRandomVeggie(col: number, row: number): void {
    const types = [Potato, Daikon, Chili];
    const Type = types[Math.floor(Math.random() * types.length)];
    // Spawn adjacent to the farm
    const dirs = [
      { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
      { dc: 0, dr: 1 }, { dc: 0, dr: -1 },
    ];
    for (const d of dirs) {
      const nc = col + d.dc;
      const nr = row + d.dr;
      if (this.grid.isPassable(nc, nr)) {
        this.addUnit(new Type(this, nc, nr));
        return;
      }
    }
    // Fallback: spawn on the farm itself
    this.addUnit(new Type(this, col, row));
  }

  private addUnit(unit: Unit): void {
    this.units.push(unit);
    unit.draw();
  }

  private cleanupDead(): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      if (!this.units[i].alive) {
        this.units[i].destroy();
        this.units.splice(i, 1);
      }
    }
  }
}
