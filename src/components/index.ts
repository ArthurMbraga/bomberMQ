import { Comp, GameObj, SpriteComp, TileComp, Vec2 } from "kaboom";
import { POWER_UP_PROB } from "../constants";

type DestructibleConfig = {
  stopPropagation: boolean;
  animate: boolean;
  noPowerUp?: boolean;
};

export type DestructibleComp = {
  stopPropagation: boolean;
  animate: boolean;
  begin: () => boolean;
} & Comp &
  SpriteComp &
  TileComp;

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

          if (!config.noPowerUp && Math.random() < POWER_UP_PROB) {
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

type OnCreateComp = {
  isFirstTime: boolean;
  onCreate?: Function;
} & Comp;

export function withOnCreate(): OnCreateComp {
  return {
    id: "withOnCreate",
    isFirstTime: true,
    update() {
      if (this.isFirstTime && this.onCreate) {
        this.onCreate();
        this.isFirstTime = false;
      }
    },
  };
}

type ExplodeComp = {
  direction: Vec2;
  force: number;
} & Comp &
  OnCreateComp;

export function explode(): ExplodeComp {
  return {
    id: "explode",
    require: ["pos", "withOnCreate", "rotate"],
    add() {},
    onCreate() {
      const tileComp = this as TileComp & ExplodeComp;
      const level = tileComp.getLevel();

      function containsWall(objs: GameObj[]) {
        return objs.some((o) => o.is("wall"));
      }
      function canDetonateAt(pos: Vec2) {
        const objs = level.getAt(pos);
        return !containsWall(objs);
      }
      function detonateAt(pos: Vec2) {
        const objs = level.getAt(pos);
        let stopPropagation = false;

        objs.map((obj) => {
          if (obj.c("destructible")) {
            const destructibleComp = obj.c("destructible") as DestructibleComp;
            const shouldStopPropagation = destructibleComp.begin();
            if (shouldStopPropagation) stopPropagation = true;
          }
        });

        return stopPropagation;
      }

      function spawnExplosion(pos: Vec2, dir: Vec2) {
        const obj = level.spawn("*", pos);

        if (!obj) return;
        obj.direction = dir;
        obj.force = tileComp.force - 1;

        // Select sprite
        if (obj.force == 0) obj.play("point");
        else obj.play("horizontal");

        // Rotate the explosion
        if (dir === UP) obj.rotateTo(-90);
        else if (dir === DOWN) obj.rotateTo(-270);
        else if (dir === LEFT) obj.rotateTo(180);
        else if (dir === RIGHT) obj.rotateTo(0);
      }

      // 1. case -> propagate to all directions
      if (!this.direction) {
        const directions = [UP, DOWN, LEFT, RIGHT];
        for (const dir of directions) {
          const pos = tileComp.tilePos;
          const nextPos = pos.add(dir);

          if (canDetonateAt(nextPos) && !detonateAt(nextPos))
            spawnExplosion(nextPos, dir);
        }
      }
      // 2. case -> propagate to a specific direction
      else if (tileComp.force > 0) {
        const pos = tileComp.tilePos;
        const nextPos = pos.add(this.direction);

        if (canDetonateAt(nextPos) && !detonateAt(nextPos))
          spawnExplosion(nextPos, this.direction);
      }
    },
  } as any;
}
