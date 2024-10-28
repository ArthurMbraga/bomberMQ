import { ColorComp, Comp, SpriteAnim } from "kaboom";
import { getOscillation } from "../utils";
import { POWER_UP_RARITY } from "../constants";

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
      let rand = Math.random();
      for (const [type, rarity] of Object.entries(POWER_UP_RARITY)) {
        if (rand < rarity) {
          (this as any).type = type;
          break;
        }
        rand -= rarity;
      }

      this.play(this.type);

      // Set color based on type
      const colorComp = this as ColorComp;
      switch (this.type) {
        case "bomb":
          colorComp.color = Color.fromHex("#dd7f25");
          this.stats.bombs = 1;
          break;
        case "speed":
          colorComp.color = Color.fromHex("#3583c1");
          this.stats.speed = 50;
          break;
        case "range":
          colorComp.color = Color.fromHex("#c13535");
          this.stats.range = 1;
          break;
      }
    },
    update() {
      (this as any).pos.y += getOscillation([-0.4, 0.4], 6);
    },
  } as any;
}
