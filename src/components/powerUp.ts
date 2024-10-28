import { Comp, SpriteAnim } from "kaboom";
import { getOscillation } from "../utils";
import { POWER_UP_RARITY } from "../constants";

export function powerUpComp(): Comp {
  return {
    id: "powerUp",
    require: ["sprite"],
    type: undefined,
    add() {
      // Generate type of power up
      let rand = Math.random();
      for (const [type, rarity] of Object.entries(POWER_UP_RARITY)) {
        if (rand < rarity) {
          (this as any).type = type;
          break;
        }
        rand -= rarity;
      }
      this.play(this.type);
    },
    update() {
      (this as any).pos.y += getOscillation([-0.4, 0.4], 6);
    },
  } as any;
}
