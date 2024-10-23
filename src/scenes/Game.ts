import { Scene } from "phaser";

const SPEED = 320;
const TILE_SIZE = 64;

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;

  private player!: Phaser.GameObjects.Sprite;
  private tileMap!: Phaser.Tilemaps.Tilemap;

  constructor() {
    super("Game");
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x00ff00);

    this.background = this.add.image(512, 384, "background");
    this.background.setAlpha(0.5);

    this.createTileMap();
    this.createPlayer();

    // Creating a blank tilemap with the specified dimensions
    const map = this.make.tilemap({
      tileWidth: 16,
      tileHeight: 16,
      width: 15,
      height: 15,
    });
    const tiles = map.addTilesetImage("tiles")!;

    const layer = map.createBlankLayer("layer1", tiles)!;
    layer.setScale(3);

    // Add a simple scene with some random element. Since there is only one layer, we can use map or
    // layer interchangeably to access tile manipulation methods.
    map.fill(58, 0, 10, map.width, 1); // Surface of the water
    layer.fill(77, 0, 11, map.width, 2); // Body of the water
    map.randomize(0, 0, 8, 10, [44, 45, 46, 47, 48]); // Left chunk of random wall tiles
    layer.randomize(8, 0, 9, 10, [20, 21, 22, 23, 24]); // Right chunk of random wall tiles

    this.input.once("pointerdown", () => {
      this.scene.start("GameOver");
    });
  }

  update() {}

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

    this.tileMap.addTilesetImage("wall");
    const tileSet = this.tileMap.addTilesetImage("wood")!;

    // Create layers
    const layer = this.tileMap.createBlankLayer("Tile Layer 1", tileSet, 0, 0)!;

    // Place tiles based on levelData
    for (let y = 0; y < levelData.length; y++) {
      for (let x = 0; x < levelData[y].length; x++) {
        const tile = levelData[y][x];
        switch (tile) {
          case "=":
            //layer.putTileAt(1, x, y); // Assuming tile index 1 is for walls
            break;
          case "+":
            //layer.putTileAt(2, x, y); // Assuming tile index 2 is for destructible wood
            break;
          case "@":
            // Player position, but we won't put a tile here
            break;
          case "$":
            //layer.putTileAt(3, x, y); // Assuming tile index 3 is for coins
            break;
          case "^":
            //layer.putTileAt(4, x, y); // Assuming tile index 4 is for another player
            break;
          case "0":
            //layer.putTileAt(5, x, y); // Assuming tile index 5 is for bombs
            break;
          case "*":
            //layer.putTileAt(6, x, y); // Assuming tile index 6 is for explosions
            break;
        }
      }
    }
    layer.setCollisionByExclusion([-1]); // Exclude -1 for collision
  }

  private createPlayer() {
    this.player = this.physics.add
      .sprite(100, 100, "bomberman_front")
      .setOrigin(0.5, 0.5);
    // this.physics.add.collider(
    //   this.player,
    //   this.tiles.getTileLayer("Tile Layer 1")
    // );
  }
}
