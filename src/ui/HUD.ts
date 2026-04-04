import Phaser from "phaser";
import { TILE_SIZE } from "../terrain/TerrainGrid";

export type PlacementMode = "build" | "seed" | null;

export class HUD {
  private scene: Phaser.Scene;
  private modeText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private feedbackText: Phaser.GameObjects.Text;
  private buildBtn: Phaser.GameObjects.Text;
  private seedBtn: Phaser.GameObjects.Text;
  private feedbackTimer?: Phaser.Time.TimerEvent;
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

    this.feedbackText = scene.add.text(400, 14, "", {
      fontSize: "14px",
      color: "#ff6644",
      fontStyle: "bold",
    })
      .setScrollFactor(0)
      .setDepth(100);
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

  showFeedback(message: string): void {
    this.feedbackText.setText(message);
    if (this.feedbackTimer) {
      this.feedbackTimer.destroy();
    }
    this.feedbackTimer = this.scene.time.delayedCall(2000, () => {
      this.feedbackText.setText("");
    });
  }

  worldToTile(worldX: number, worldY: number): { col: number; row: number } {
    return {
      col: Math.floor(worldX / TILE_SIZE),
      row: Math.floor(worldY / TILE_SIZE),
    };
  }
}
