import { ColorComp, Comp } from "kaplay";
import {
  INCREASE_BOMBS,
  INCREASE_RANGE,
  INCREASE_SPEED,
  POWER_UP_RARITY,
} from "../constants";
import { getOscillation } from "../utils";

export function powerUpComp(): Comp {
  return {
    id: "powerUp",
    require: ["sprite", "color"],
    type: undefined,
    stats: {
      speed: 0,
      range: 0,
      bombs: 0,
    },
    add() {
      // Generate type of power up
      let r = rand();
      for (const [type, rarity] of Object.entries(POWER_UP_RARITY)) {
        if (r < rarity) {
          (this as any).type = type;
          break;
        }
        r -= rarity;
      }

      this.play(this.type);

      // Set color based on type
      const colorComp = this as ColorComp;
      switch (this.type) {
        case "bomb":
          colorComp.color = Color.fromHex("#dd7f25");
          this.stats.bombs = INCREASE_BOMBS;
          break;
        case "speed":
          colorComp.color = Color.fromHex("#3583c1");
          this.stats.speed = INCREASE_SPEED;
          break;
        case "range":
          colorComp.color = Color.fromHex("#c13535");
          this.stats.range = INCREASE_RANGE;
          break;
      }
    },
    update() {
      (this as any).pos.y += getOscillation([-0.4, 0.4], 6);
    },
  } as any;
}
