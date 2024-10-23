import { Scene } from "phaser";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath("assets");

    this.load.image("logo", "logo.png");
    this.load.image("tiles", "platformer_tiles.png");

    this.load.image('tileset', '/path/to/your/tileset.png'); // Load your tileset image
    this.load.image('bomberman_front', '/sprites/bomberman_front.png');
    this.load.image('coin', '/sprites/coin.png');
    this.load.image('bomb', '/sprites/16bit_bomb1.png');
    this.load.image('spike', '/sprites/spike.png');
    this.load.image('wall', '/sprites/wall.png');
    this.load.spritesheet('wood', '/sprites/wood-explode.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('fire', '/sprites/fire.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('ghosty', '/sprites/ghosty.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start("MainMenu");
  }
}