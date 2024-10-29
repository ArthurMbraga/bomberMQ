import { AreaComp, Comp, ScaleComp, TileComp, TimerComp } from "kaplay";
import { BOMB_EXPLODE_TIME, INITIAL_BOMB_FORCE } from "../constants";

export type BombData = {
  force: number;
};

type BombComp = {
  onExplode: () => void;
} & BombData &
  Comp &
  AreaComp &
  TimerComp &
  ScaleComp &
  TileComp;

export function bomb(): BombComp {
  return {
    id: "bombComp",
    require: ["scale", "pos", "timer", "area"],
    force: INITIAL_BOMB_FORCE,
    onExplode: () => {},
    add() {
      let collideCount = 0;
      const areaComp = this as AreaComp;
      areaComp.onCollideEnd("player", () => {
        collideCount--;
        if (collideCount > 0) return;
        (this as any).use(body({ isStatic: true }));
      });

      areaComp.onCollide("player", () => {
        collideCount++;
      });

      const timerComp = this as TimerComp;
      timerComp.wait(BOMB_EXPLODE_TIME, () => {
        const tileComp = this as TileComp;
        const level = tileComp.getLevel();
        const explosion = level.spawn("*", tileComp.tilePos);
        (explosion as any).force = this.force;
        destroy(this as any);
        play("explosion");
        this.onExplode();
      });
    },
    update() {
      const scaleComp = this as ScaleComp;
      const variation = 0.15;
      scaleComp.scaleTo(1 + -1 * variation * 0.5 * (Math.sin(time() * 8) + 1));
    },
  } as any;
}
