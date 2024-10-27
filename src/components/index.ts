import {
  AreaComp,
  Comp,
  GameObj,
  ScaleComp,
  SpriteComp,
  TileComp,
  TimerComp,
  Vec2,
} from "kaboom";

export function destructible(): Comp {
  return {
    id: "destructible",
    add() {
      const spriteComp = this as SpriteComp;
      const tileComp = this as TileComp;
      spriteComp.onAnimEnd((anim) => {
        if (anim === "explode") {
          tileComp.getLevel()?.remove(this as any);
        }
      });
    },
  };
}

export function bomb(): Comp {
  return {
    id: "bombComp",
    require: ["scale", "pos", "timer", "area"],
    add() {
      const areaComp = this as AreaComp;
      areaComp.onCollideEnd("player", () => {
        //this.
      });

      const timerComp = this as TimerComp;
      timerComp.wait(2, () => {
        const tileComp = this as TileComp;
        const level = tileComp.getLevel();
        level.spawn("*", tileComp.tilePos);
        destroy(this as any);
      });
    },
    update() {
      const scaleComp = this as ScaleComp;
      const variation = 0.15;
      scaleComp.scaleTo(1 + -1 * variation * 0.5 * (Math.sin(time() * 8) + 1));
    },
  };
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
};

export function explode(): Comp & Partial<OnCreateComp> & Partial<ExplodeComp> {
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
        let detonated = false;

        objs.map((obj) => {
          if (obj.c("destructible")) {
            const spriteComp = obj.c("sprite") as SpriteComp;
            spriteComp.play("explode");

            detonated = true;
          }
        });

        return detonated;
      }

      function spawnExplosion(pos: Vec2, dir: Vec2) {
        const obj = level.spawn("*", pos);

        if (!obj) return;
        obj.direction = dir;
        obj.force = tileComp.force - 1;

        // Select sprite
        if (obj.force === 1) obj.play("point");
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
      else if (tileComp.force > 1) {
        const pos = tileComp.tilePos;
        const nextPos = pos.add(this.direction);

        if (canDetonateAt(nextPos) && !detonateAt(nextPos))
          spawnExplosion(nextPos, this.direction);
      }
    },
    update() {
      // const pos = this as TileComp;
      // console.log("Explode", pos.tilePos);
      // const pos = this as PosComp;
    },
  };
}
