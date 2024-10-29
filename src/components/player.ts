import { Comp, GameObj, OpacityComp, TimerComp, Vec2 } from "kaboom";
import {
  DAMAGE_DEBUF,
  IMMUNITY_TIME,
  INITIAL_BOMB_FORCE,
  NUM_LIVES,
  INITIAL_SPEED,
  TILE_SIZE,
} from "../constants";
import { getOscillation } from "../utils";

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

export type PlayerData = { id: string; color: string };
export function createPlayer(position: Vec2, data: PlayerData) {
  const player = add([
    sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
    pos(position.scale(TILE_SIZE)),
    area(),
    body(),
    anchor("center"),
    opacity(),
    timer(),
    color(data.color),
    playerComp() as any,
    {
      playerId: data.id,
      imune: true,
      lives: NUM_LIVES,
      speed: INITIAL_SPEED,
      curSpeed: INITIAL_SPEED,
      force: INITIAL_BOMB_FORCE,
      maxBombs: 1,
      currBombs: 0,
    },
  ]);

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
