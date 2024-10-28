import {
  Comp,
  GameObj,
  Key,
  LevelComp,
  OpacityComp,
  TimerComp,
  Vec2,
} from "kaboom";
import {
  INITIAL_BOMB_FORCE,
  DAMAGE_DEBUF,
  IMMUNITY_TIME,
  NUM_LIVES,
  SPEED,
  TILE_SIZE,
} from "../constants";
import { getOscillation } from "../utils";

const directionsMap = {
  left: LEFT,
  right: RIGHT,
  up: UP,
  down: DOWN,
};

export type PlayerComp = Comp &
  OpacityComp &
  TimerComp & { imune: boolean; immunityCounter: boolean };

function playerComp(): PlayerComp {
  return {
    id: "player",
    require: ["opacity", "timer"],
    immunityCounter: false,
    add() {},
    update() {
      if (this.imune) {
        if (!this.immunityCounter) {
          this.immunityCounter = true;
          this.curSpeed *= DAMAGE_DEBUF;

          this.wait(IMMUNITY_TIME, () => {
            this.imune = false;
            this.immunityCounter = false;
            this.curSpeed = this.speed;
          });
        }

        const opacityComp = this as OpacityComp;
        opacityComp.opacity = getOscillation([0.3, 1], 10);
      } else {
        const opacityComp = this as OpacityComp;
        opacityComp.opacity = 1;
      }
    },
  } as any;
}

export function createPlayer(level: LevelComp) {
  const player = add([
    sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
    pos(TILE_SIZE * 3, TILE_SIZE * 3),
    area({ shape: new Rect(vec2(0), TILE_SIZE / 2, TILE_SIZE / 1.4) }),
    body(),
    anchor("center"),
    opacity(),
    timer(),
    playerComp() as any,
    {
      imune: true,
      lives: NUM_LIVES,
      speed: SPEED,
      curSpeed: SPEED,
      force: INITIAL_BOMB_FORCE,
      maxBombs: 1,
      currBombs: 0,
    },
  ]);

  for (const dir in directionsMap) {
    onKeyDown(dir as Key, () => {
      player.move(
        directionsMap[dir as keyof typeof directionsMap].scale(player.curSpeed)
      );
    });
  }

  onKeyPress("space", () => {
    if (player.currBombs >= player.maxBombs) return;

    // Check if there is a bomb in the same position
    const pos = myPos2Tile(player.pos.sub(TILE_SIZE * 2, TILE_SIZE * 2));

    if (level.getAt(pos).some((obj) => obj.is("bomb"))) return;

    const bomb = level.spawn("0", pos) as any;
    bomb.force = player.force;
    bomb.onExplode = () => {
      player.currBombs--;
    };

    play("place_bomb");
    player.currBombs++;
  });

  function removeLife() {
    player.lives--;
    player.imune = true;

    if (player.lives === 0) {
      console.log("game over");
      destroy(player);
      play("die");
    } else play("damage");
  }

  player.onCollide("explosion", (obj: GameObj) => {
    const opacityComp = obj.c("opacity") as OpacityComp;
    if (opacityComp.opacity > 0.7 && !player.imune) {
      removeLife();
    }
  });

  player.onCollide("powerUp", (obj: GameObj) => {
    player.speed += obj.stats.speed;
    player.maxBombs += obj.stats.bombs;
    player.force += obj.stats.range;

    destroy(obj);
    play("power_up");
  });

  return player;
}

function myPos2Tile(pos: Vec2) {
  return vec2(Math.round(pos.x / TILE_SIZE), Math.round(pos.y / TILE_SIZE));
}
