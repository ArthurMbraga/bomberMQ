import { Scene } from "phaser";

const SPEED = 320;
const TILE_SIZE = 18;

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;

  private player!: Phaser.GameObjects.Sprite;
  private tileMap!: Phaser.Tilemaps.Tilemap;

  private layer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super("Game");
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x00ff00);

    this.background = this.add.image(512, 384, "background");
    this.background.setAlpha(0.5);

    // Animations
    this.anims.create({
      key: "explosion",
      frames: this.anims.generateFrameNumbers("wood"),
      frameRate: 16,
    });

    this.createTileMap();
    this.createPlayer();

    // Keybindings
    this.input.keyboard?.on("keydown-A", () => this.movePlayer(-1, 0, 180)); // Left
    this.input.keyboard?.on("keydown-D", () => this.movePlayer(1, 0, 0)); // Right
    this.input.keyboard?.on("keydown-W", () => this.movePlayer(0, -1, -90)); // Up
    this.input.keyboard?.on("keydown-S", () => this.movePlayer(0, 1, 90)); // Down
  }

  private createTileMap() {
    const levelData = [
      "========================",
      "=       ++             =",
      "= = = = = = = = = = = ==",
      "=      ++       ++     =",
      "= = = = = = = = = = = ==",
      "=       ++      ++     =",
      "========================",
    ];

    // Create the tilemap
    this.tileMap = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const img1 = this.tileMap.addTilesetImage("wall", "wall")!;
    const img2 = this.tileMap.addTilesetImage("wood", "wood")!;

    // Create layers
    const layer = this.tileMap.createBlankLayer(
      "Tile Layer 1",
      [img1, img2],
      0,
      0
    )!;

    const charMap = {
      "=": 0,
      "+": 9,
    };

    // Place tiles based on levelData
    for (let y = 0; y < levelData.length; y++) {
      for (let x = 0; x < levelData[y].length; x++) {
        const tile = levelData[y][x] as keyof typeof charMap;
        if (charMap[tile] !== undefined) layer.putTileAt(charMap[tile], x, y);
      }
    }
    layer.setCollisionByExclusion([-1]); // Exclude -1 for collision

    this.layer = layer;

    console.log(this.tileMap.layers);
    //const coins = this.tileMap.createFromObjects("Tile Layer 1", { gid: 0 });
    const coins = this.tileMap.createFromTiles(0, 0, {
      useSpriteSheet: true,
    });

    this.tileMap.removeTileAt(0, 1);
    this.tileMap.getTileAt(0, 0)?.setAlpha(0);
    //this.tileMap.getTileAt(0, 1)?.destroy();

    //this.anims.play("explosion", this.tileMap.getTileAt(0, 2));

    this.tweens.add({
      targets: [this.tileMap.removeTileAt(0, 1)],
      y: "-=32",
      duration: 1000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    console.log(layer);
  }

  private movePlayer(dx: number, dy: number, angle: number) {
    const newX = this.player.x + (dx * TILE_SIZE) / 10;
    const newY = this.player.y + (dy * TILE_SIZE) / 10;

    // Prevent moving out of bounds
    if (
      newX < 0 ||
      newY < 0 ||
      newX >= this.tileMap.widthInPixels ||
      newY >= this.tileMap.heightInPixels
    ) {
      return;
    }

    const tile = this.layer.getTileAtWorldXY(newX, newY, true);

    if (tile.index === -1) {
      // Not blocked
      this.player.x = newX;
      this.player.y = newY;
      this.player.angle = angle;
    }
  }

  private createPlayer() {
    this.player = this.physics.add
      .sprite(100, 100, "bomberman_front")
      .setOrigin(0.5, 0.5);
  }
}
