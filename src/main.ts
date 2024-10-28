import mqtt from "mqtt";

import {
  Comp,
  GameObj,
  Key,
  ScaleComp,
  SpriteComp,
  TileComp,
  TimerComp,
  Vec2,
} from "kaplay";

// load assets
loadSprite("bean", "/sprites/bean.png");
loadSprite("bomberman_front", "/sprites/bomberman_front.png");
loadSprite("coin", "/sprites/coin.png");
loadSprite("spike", "/sprites/spike.png");
loadSprite("wall", "/sprites/wall.png");
loadSprite("wood", "/sprites/wood-explode.png", {
  sliceX: 5,
  sliceY: 2,
  anims: {
    explode: { from: 0, to: 9, speed: 30 },
    idle: 0,
  },
});
loadSprite("ghosty", "/sprites/ghosty.png");
loadSprite("bomb", "/sprites/16bit_bomb1.png");
loadSprite("fire", "/sprites/fire.png", {
  sliceX: 3,
  sliceY: 1,
  anims: {
    center: 0,
    horizontal: 1,
    point: 2,
  },
});

let players: { playerId: number, obj: GameObj }[] = [];

function getPlayerById(playerId: number): GameObj | undefined {
  return players.find(p => p.playerId === playerId)?.obj;
}

const mqttClient = mqtt.connect("ws://localhost:1883");

mqttClient.on("connect", () => {
  console.log("Connected to MQTT");
  mqttClient.subscribe("game/player/+/move");
  mqttClient.subscribe("game/newPlayer");
});

mqttClient.on('error', (err) => {
  console.error('Erro de conexão MQTT:', err);
});

type PlayerPosition = {
  x: number;
  y: number;
};

type NewPlayerMessage = {
  playerId: number;
  position: PlayerPosition;
};

type PlayerMoveMessage = {
  direction: 'up' | 'down' | 'left' | 'right';
};


mqttClient.on("message", (topic, message) => {
  console.log("Received message", topic, message.toString());
  const playerData = JSON.parse(message.toString());

  if (topic === "game/newPlayer") {
    const playerData: NewPlayerMessage = JSON.parse(message.toString());
    addNewPlayer(playerData);
  } else if (topic.startsWith('game/player/') && topic.endsWith('/move')) {
    const playerId = parseInt(extractPlayerIdFromTopic(topic));
    const playerMoveData: PlayerMoveMessage = JSON.parse(message.toString());
    handlePlayerAction(playerId, playerMoveData);
  }

});

function extractPlayerIdFromTopic(topic: string): string {
  const parts = topic.split('/');
  return parts[2];
}


const SPEED = 320;
const TILE_SIZE = 64;

function addNewPlayer(playerData: NewPlayerMessage) {
  const newPlayer = add([
    sprite("bomberman_front", { width: TILE_SIZE, height: TILE_SIZE }),
    pos(playerData.position.x, playerData.position.y),
    area(),
    body(),
    anchor("center"),
    "player",
    { playerId: playerData.playerId },
  ]);

  players.push({ playerId: playerData.playerId, obj: newPlayer });
}

function sendPlayerAction(playerId: string, direction: 'up' | 'down' | 'left' | 'right') {
  const action: PlayerMoveMessage = { direction };
  const topic = `game/player/${playerId}/move`;

  mqttClient.publish(topic, JSON.stringify(action));
}

function handlePlayerAction(playerId: number, action: PlayerMoveMessage) {
  const direction = action.direction;

  const player = getPlayerById(playerId);

  if (!player) {
    console.warn("Player not found", playerId);
    return;
  }

  if (direction === "left") {
    player.move(LEFT.scale(SPEED));
  } else if (direction === "right") {
    player.move(RIGHT.scale(SPEED));
  } else if (direction === "up") {
    player.move(UP.scale(SPEED));
  } else if (direction === "down") {
    player.move(DOWN.scale(SPEED));
  }
}

type BlinkComp = Comp;

function blink(): BlinkComp {
  return {
    id: "blink",
    require: ["scale", "pos", "timer"],
    add() {
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
      // Oscila entre 0.5 e 1
      const variation = 0.15;
      const posComp = this as TileComp;
      scaleComp.scaleTo(1 + -1 * variation * 0.5 * (Math.sin(time() * 8) + 1));
    },
  };
}

type Test = {
  isFirstTime: boolean;
  onCreate?: Function;
  setOnCreate(func: () => void): void;
};

type OnCreateComp = Comp & Test;

function withOnCreate(): OnCreateComp {
  return {
    id: "withOnCreate",
    isFirstTime: true,
    setOnCreate(func) {
      this.onCreate = func;
    },
    update() {
      if (this.isFirstTime && this.onCreate) {
        this.onCreate();
        this.isFirstTime = false;
      }
    },
  };
}

function destructable(): Comp {
  return {
    id: "destructable",
    add() {
      const spriteComp = this as SpriteComp;
      const tileComp = this as TileComp;
      spriteComp.onAnimEnd((anim) => {
        if (anim === "explode") {
          // destroy(this as any);
          tileComp.getLevel().remove(this as any);
        }
      });
    },
  };
}

type ExplodeComp = {
  direction: Vec2;
  force: number;
};

function explode(): Comp & Partial<OnCreateComp> & Partial<ExplodeComp> {
  return {
    id: "explode",
    require: ["pos", "withOnCreate", "rotate"],
    add() {},
    onCreate() {
      const tileComp = this as TileComp & ExplodeComp;
      const level = tileComp.getLevel();

      function isWall(objs: GameObj[]) {
        return objs.some((o) => o.is("wall"));
      }

      function isDestroyable(objs: GameObj[]) {
        return objs.some((o) => {
          if (o.is("wood")) console.log("wood", o);
          return o.is("wood");
        });
      }

      function detonateAt(pos: Vec2) {
        const objs = level.getAt(pos);
        console.log("detonateAt", pos, objs);
        if (isWall(objs)) return false;

        if (isDestroyable(objs)) {
          objs.map((obj) => {
            const spriteComp = obj.c("sprite") as SpriteComp;
            if (obj.c("destructable")) spriteComp.play("explode");
          });
          return false;
        }
        return true;
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

          if (detonateAt(nextPos)) spawnExplosion(nextPos, dir);
        }
      }
      // 2. case -> propagate to a specific direction
      else if (tileComp.force > 1) {
        const pos = tileComp.tilePos;
        const nextPos = pos.add(this.direction);

        if (detonateAt(nextPos)) spawnExplosion(nextPos, this.direction);
      }
    },
    update() {
      // const pos = this as TileComp;
      // console.log("Explode", pos.tilePos);
      // const pos = this as PosComp;
    },
  };
}

scene("game", () => {
  const level = addLevel(
    [
      "========================",
      "=@      ++      $$     =",
      "= = = = = = = = = = = ==",
      "=      ++       ++     =",
      "= = = = = = = = = = = ==",
      "=^      ++      ##     =",
      "========================",
    ],
    {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      pos: vec2(TILE_SIZE * 2, TILE_SIZE * 2),
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
          timer(),
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
          destructable(),
          body({ isStatic: true }),
          anchor("center"),
          "wood",
        ],
        "*": () => [
          sprite("fire", { width: TILE_SIZE, height: TILE_SIZE }),
          area(),
          withOnCreate(),
          anchor("center"),
          pos(),
          rotate(0),
          explode(),
          opacity(1),
          lifespan(0.5, { fade: 0.5 }),
          { direction: undefined, force: 4 },
          "explosion",
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
    "player",
    { playerId: 1 },
  ]);

  players.push({ playerId: 1, obj: player });

  const dirs = {
    left: LEFT,
    right: RIGHT,
    up: UP,
    down: DOWN,
  };

  for (const dir in dirs) {
    onKeyDown(dir as Key, () => {
      player.move(dirs[dir as keyof typeof dirs].scale(SPEED));
      sendPlayerAction("1", dir as 'up' | 'down' | 'left' | 'right');
    });
  }

  onKeyPress("space", () => {
    level.spawn("0", posToTile(player.pos.sub(TILE_SIZE * 2, TILE_SIZE * 2)));
  });

  onKeyPress("2", () => {
    console.log(getPlayerById(1));
});

  player.onCollide("explosion", () => {
    destroy(player);
  });
});

function posToTile(pos: Vec2) {
  return vec2(Math.round(pos.x / TILE_SIZE), Math.round(pos.y / TILE_SIZE));
}

go("game");
