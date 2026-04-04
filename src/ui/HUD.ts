import Phaser from "phaser";
import { TILE_SIZE } from "../terrain/TerrainGrid";

export type PlacementMode = "build" | "seed" | null;

interface LegendEntry {
  color: number;
  label: string;
  team: string;
}

const UNIT_LEGEND: LegendEntry[] = [
  { color: 0xddb860, label: "Potato", team: "Veggie" },
  { color: 0xeeeedd, label: "Daikon", team: "Veggie" },
  { color: 0xcc3333, label: "Chili", team: "Veggie" },
  { color: 0x44aa44, label: "Aphid", team: "Pest" },
];

export class HUD {
  private scene: Phaser.Scene;
  private modeText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private unitInfoText: Phaser.GameObjects.Text;
  private buildBtn: Phaser.GameObjects.Text;
  private seedBtn: Phaser.GameObjects.Text;
  private legendGraphics: Phaser.GameObjects.Graphics;
  placementMode: PlacementMode = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const btnStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#444466",
      padding: { x: 8, y: 4 },
    };

    this.buildBtn = scene.add.text(10, 10, " Build Farm ", btnStyle)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMode("build"));

    this.seedBtn = scene.add.text(130, 10, " Seed Farm ", btnStyle)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMode("seed"));

    this.modeText = scene.add.text(260, 14, "", {
      fontSize: "13px",
      color: "#ffcc44",
    })
      .setScrollFactor(0)
      .setDepth(100);

    this.infoText = scene.add.text(10, 40, "", {
      fontSize: "12px",
      color: "#cccccc",
    })
      .setScrollFactor(0)
      .setDepth(100);

    this.unitInfoText = scene.add.text(10, 70, "", {
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#333355",
      padding: { x: 6, y: 3 },
    })
      .setScrollFactor(0)
      .setDepth(100);

    // Legend panel
    this.legendGraphics = scene.add.graphics();
    this.legendGraphics.setScrollFactor(0);
    this.legendGraphics.setDepth(100);
    this.drawLegend();
  }

  private drawLegend(): void {
    const cam = this.scene.cameras.main;
    const panelX = cam.width - 120;
    const panelY = 10;
    const rowHeight = 20;
    const panelHeight = UNIT_LEGEND.length * rowHeight + 30;

    // Background
    this.legendGraphics.fillStyle(0x222244, 0.85);
    this.legendGraphics.fillRoundedRect(panelX - 10, panelY, 120, panelHeight, 6);

    // Title
    const title = this.scene.add.text(panelX, panelY + 6, "Units", {
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffcc44",
    })
      .setScrollFactor(0)
      .setDepth(101);

    // Entries
    UNIT_LEGEND.forEach((entry, i) => {
      const y = panelY + 26 + i * rowHeight;
      // Color dot
      this.legendGraphics.fillStyle(entry.color, 1);
      this.legendGraphics.fillCircle(panelX + 6, y + 6, 5);
      // Initial letter
      this.scene.add.text(panelX + 2, y, entry.label[0], {
        fontSize: "8px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 1,
      })
        .setOrigin(0.5, 0)
        .setPosition(panelX + 6, y + 1)
        .setScrollFactor(0)
        .setDepth(102);
      // Label
      this.scene.add.text(panelX + 18, y, entry.label, {
        fontSize: "11px",
        color: entry.team === "Pest" ? "#ff8888" : "#aaddaa",
      })
        .setScrollFactor(0)
        .setDepth(101);
    });
  }

  toggleMode(mode: PlacementMode): void {
    if (this.placementMode === mode) {
      this.placementMode = null;
    } else {
      this.placementMode = mode;
    }
    this.updateModeDisplay();
  }

  private updateModeDisplay(): void {
    if (this.placementMode === "build") {
      this.modeText.setText("Mode: BUILD — Click a tile to place a farm");
      this.buildBtn.setBackgroundColor("#886622");
      this.seedBtn.setBackgroundColor("#444466");
    } else if (this.placementMode === "seed") {
      this.modeText.setText("Mode: SEED — Click a farm to seed it");
      this.buildBtn.setBackgroundColor("#444466");
      this.seedBtn.setBackgroundColor("#228844");
    } else {
      this.modeText.setText("");
      this.buildBtn.setBackgroundColor("#444466");
      this.seedBtn.setBackgroundColor("#444466");
    }
  }

  showTileInfo(col: number, row: number, terrain: string, extra: string): void {
    this.infoText.setText(`Tile (${col}, ${row}) — ${terrain}${extra ? "\n" + extra : ""}`);
  }

  showUnitInfo(name: string, team: string, hp: number, maxHp: number): void {
    this.unitInfoText.setText(`${name} (${team}) — HP: ${Math.floor(hp)}/${maxHp}`);
  }

  clearUnitInfo(): void {
    this.unitInfoText.setText("");
  }

  worldToTile(worldX: number, worldY: number): { col: number; row: number } {
    return {
      col: Math.floor(worldX / TILE_SIZE),
      row: Math.floor(worldY / TILE_SIZE),
    };
  }
}
