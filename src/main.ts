import { AreaComp, Comp, Key, ScaleComp, Vec2 } from "kaplay";

// load assets
loadSprite("bean", "/sprites/bean.png");
loadSprite("bomberman_front", "/sprites/bomberman_front.png");
loadSprite("coin", "/sprites/coin.png");
loadSprite("spike", "/sprites/spike.png");
loadSprite("wall", "/sprites/wall.png");
loadSprite("wood", "/sprites/wood.png");
loadSprite("ghosty", "/sprites/ghosty.png");
loadSprite("bomb", "/sprites/16bit_bomb1.png");

const SPEED = 320;
const TILE_SIZE = 64;

type BlinkComp = Comp;

function blink(): BlinkComp {
  return {
    id: "blink",
    require: ["scale"],
    add() {},
    update() {
      const scaleComp = this as ScaleComp;
      // Oscila entre 0.5 e 1
      const variation = 0.15;
      scaleComp.scaleTo(1 + -1 * variation * 0.5 * (Math.sin(time() * 8) + 1));
    },
  };
}

scene("game", () => {
  const level = addLevel(
    [
      // Símbolos que representam o mapa
      "========================",
      "=@      ++      $$     =",
      "= = = = = = = = = = = ==",
      "=      ++       ++     =",
      "= = = = = = = = = = = ==",
      "=^      ++      ##     =",
      "========================",
    ],
    {
      // Tamanho de cada bloco
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      // Posição do canto superior esquerdo
      pos: vec2(TILE_SIZE * 2, TILE_SIZE * 2),
      // Definição dos símbolos
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
          blink(),
          "bomb",
          { playerId: 3 },
        ],
        "#": () => [
          sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          body(),
          anchor("center"),
          "player",
          { playerId: 4 },
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
          body({ isStatic: true }),
          anchor("center"),
          "wood",
        ],
      },
    }
  );

  const player = add([
    sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
    pos(TILE_SIZE * 2 + TILE_SIZE * 2, TILE_SIZE * 2 + TILE_SIZE * 2),
    area(),
    body(),
    anchor("center"),
    // "player",
    // { playerId: 1 },
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
});

function posToTile(pos: Vec2) {
  return vec2(Math.round(pos.x / TILE_SIZE), Math.round(pos.y / TILE_SIZE));
}
go("game");
