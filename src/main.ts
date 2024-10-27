import { GameObj, Key, Vec2, OpacityComp } from "kaboom";
import { bomb, destructible, explode, withOnCreate } from "./components";

loadSprite("bean", "/sprites/bean.png");
loadSprite("bomberman_front", "/sprites/bomberman_front.png");
loadSprite("coin", "/sprites/coin.png");
loadSprite("spike", "/sprites/spike.png");
loadSprite("wall", "/sprites/wall.png");
loadSprite("wood", "/sprites/wood-explode.png", {
  sliceX: 5,
  sliceY: 2,
  anims: {
    explode: { from: 0, to: 9, speed: 30 },
    idle: 0,
  },
});
loadSprite("ghosty", "/sprites/ghosty.png");
loadSprite("bomb", "/sprites/16bit_bomb1.png");
loadSprite("fire", "/sprites/fire.png", {
  sliceX: 3,
  sliceY: 1,
  anims: {
    center: 0,
    horizontal: 1,
    point: 2,
  },
});

const SPEED = 320;
const TILE_SIZE = 64;

scene("game", () => {
  let livesCounter = 3;

  const level = addLevel(
    [
      "========================",
      "=       ++      $$     =",
      "= = = = = = = = = = = ==",
      "=      ++       ++     =",
      "= = = = = = = = = = = ==",
      "=^      ++      ++     =",
      "========================",
    ],
    {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      pos: vec2(TILE_SIZE * 2, TILE_SIZE * 2),
      tiles: {
        $: () => [
          sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          body(),
          anchor("center"),
          "player",
          { playerId: 2 },
        ],
        "0": () => [
          sprite("bomb", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          anchor("center"),
          scale(0.5),
          timer(),
          bomb(),
          "bomb",
        ],
        "=": () => [
          sprite("wall", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          body({ isStatic: true }),
          anchor("center"),
          "wall",
        ],
        "+": () => [
          sprite("wood", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          destructible(),
          body({ isStatic: true }),
          anchor("center"),
        ],
        "*": () => [
          sprite("fire", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          withOnCreate(),
          anchor("center"),
          pos(),
          rotate(0),
          explode(),
          opacity(1),
          lifespan(0.5, { fade: 0.5 }),
          { direction: undefined, force: 4 },
          "explosion",
        ],
      },
    }
  );

  // display score
  const livesLabel = add([
    text(livesCounter.toString()),
    anchor("center"),
    pos(width() / 2, 80),
    fixed(),
    z(100),
  ]);

  function removeLife() {
    livesCounter--;
    livesLabel.text = livesCounter.toString();

    if (livesCounter <= 0) 
      destroy(player);  
    
  }

  const player = add([
    sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
    pos(TILE_SIZE * 3, TILE_SIZE * 3),
    area({ shape: new Rect(vec2(0), TILE_SIZE / 2, TILE_SIZE / 1.4) }),
    body(),
    anchor("center"),
    "player",
    { imune: false },   
  ]);

  const dirs = {
    left: LEFT,
    right: RIGHT,
    up: UP,
    down: DOWN,
  };

  for (const dir in dirs) {
    onKeyDown(dir as Key, () => {
      player.move(dirs[dir as keyof typeof dirs].scale(SPEED));
    });
  }

  onKeyPress("space", () => {
    level.spawn("0", posToTile(player.pos.sub(TILE_SIZE * 2, TILE_SIZE * 2)));
  });

  player.onCollide("explosion", (obj: GameObj) => {
    const opacityComp = obj.c("opacity") as OpacityComp;
    if (opacityComp.opacity > 0.7) removeLife();
  });
});

scene("menu", (score) => {
  add([
    sprite("bean"),
    pos(width() / 2, height() / 2 - 108),
    scale(3),
    anchor("center"),
  ]);

  // display score
  add([
    text(score),
    pos(width() / 2, height() / 2 + 108),
    scale(3),
    anchor("center"),
  ]);

  // go back to game with space is pressed
  onKeyPress("space", () => go("game"));
  onClick(() => go("game"));
});

function posToTile(pos: Vec2) {
  return vec2(Math.round(pos.x / TILE_SIZE), Math.round(pos.y / TILE_SIZE));
}

go("game");
