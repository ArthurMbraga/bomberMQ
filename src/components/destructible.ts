import { Comp, SpriteComp, TileComp } from "kaplay";
import { POWER_UP_PROB } from "../constants";

export type DestructibleComp = {
  stopPropagation: boolean;
  animate: boolean;
  begin: () => boolean;
} & Comp &
  SpriteComp &
  TileComp;

type DestructibleConfig = {
  stopPropagation: boolean;
  animate: boolean;
  noPowerUp?: boolean;
};

export function destructible(config: DestructibleConfig): DestructibleComp {
  return {
    id: "destructible",
    require: ["sprite", "tile"],
    add() {
      const spriteComp = this;
      const tileComp = this;
      const level = tileComp.getLevel();
      spriteComp.onAnimEnd((anim: string) => {
        if (anim === "explode") {
          level?.remove(this as any);

          if (!config.noPowerUp && rand() < POWER_UP_PROB) {
            level.spawn("$", tileComp.tilePos);
          }
        }
      });
    },
    begin() {
      const tileComp = this;
      const spriteComp = this;

      const level = tileComp.getLevel();
      if (config.animate) spriteComp.play("explode");
      else level?.remove(this as any);
      return config.stopPropagation;
    },
  } as any;
}
