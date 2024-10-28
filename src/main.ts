import { GameObj, Key, LevelComp, Vec2 } from "kaboom";
import mqtt from "mqtt";
import { destructible, explode, withOnCreate } from "./components";
import { createPlayer } from "./components/player";
import { powerUpComp as powerUp } from "./components/powerUp";
import { INITIAL_BOMB_FORCE, TILE_SIZE } from "./constants";
import { bomb, BombData } from "./components/bomb";

loadSprite("bean", "/sprites/bean.png");
loadSprite("bomberman_front", "/sprites/bomberman_front.png");
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
loadSprite("power_up", "/sprites/power_up.png", {
  sliceX: 3,
  sliceY: 1,
  anims: {
    range: 0,
    speed: 1,
    bomb: 2,
  },
});

loadSound("explosion", "/sounds/explosion.wav");
loadSound("damage", "/sounds/damage.wav");
loadSound("place_bomb", "/sounds/place_bomb.wav");
loadSound("die", "/sounds/die.wav");
loadSound("power_up", "/sounds/power_up.wav");

// FIX SEED
randSeed(0);
setBackground(Color.fromHex("#f0f0f0"));

const playersMap: Record<string, GameObj> = {};
const topicsCOunter: Record<string, number> = {};

const PLAYER_ID = "1";

const LEVEL_STRING = [
  "=========================",
  "=  +++  +   +   +  +++  =",
  "= =+=+= = = = = = =+=+= =",
  "=  +++  +  +++  +  +++  =",
  "=+=+=+=+=+=+=+=+=+=+=+=+=",
  "=  +++  +  +++  +  +++  =",
  "= =+=+= = = = = = =+=+= =",
  "=  +++  +   +   +  +++  =",
  "=========================",
];

let level: LevelComp;

function getPlayerById(playerId: string) {
  return playersMap[playerId];
}

const mqttClient = mqtt.connect("ws://172.20.10.8:1883");

mqttClient.on("connect", () => {
  console.log("Connected to MQTT");
  mqttClient.subscribe("game/player/2/attributes");
  mqttClient.subscribe("game/player/2/bomb");
  mqttClient.subscribe("game/player/2/death");
  // mqttClient.subscribe("game/newPlayer");
});

mqttClient.on("error", (err) => {
  console.error("Erro de conexão MQTT:", err);
});

type BaseMessage = { count: number };

type PlayerAttributes = {
  imune: boolean;
  lives: number;
  speed: number;
  curSpeed: number;
  force: number;
  position: { x: number; y: number };
};

type PlayerAttributesMessage = PlayerAttributes & BaseMessage;

type PlayerBombMessage = {
  position: { x: number; y: number };
  data: BombData;
} & BaseMessage;

mqttClient.on("message", (topic, message) => {
  if (topic.startsWith("game/player/")) {
    const playerId = extractPlayerIdFromTopic(topic);
    if (playerId === PLAYER_ID) return;

    const decodedMessage: BaseMessage = JSON.parse(message.toString());

    if (!topicsCOunter[topic]) topicsCOunter[topic] = decodedMessage.count;

    if (topicsCOunter[topic] > decodedMessage.count) return;
    topicsCOunter[topic] = decodedMessage.count;

    if (topic.endsWith("/attributes")) {
      handlePlayerAttributes(
        playerId,
        decodedMessage as PlayerAttributesMessage
      );
    }

    if (topic.endsWith("/bomb")) {
      const { position, data } = decodedMessage as PlayerBombMessage;
      const pos = vec2(position.x, position.y);
      const bomb = placeBomb(pos, data);
      bomb.force = data.force;
    }

    if (topic.endsWith("/death")) {
      const player = getPlayerById(playerId);
      if (!player) return;

      destroy(player);
    }
  }
});

function extractPlayerIdFromTopic(topic: string) {
  const parts = topic.split("/");
  return parts[2];
}

let attributesCounter = 0;
let lastAtributes = "";
function asyncSendPlayerAttributes(
  playerId: string,
  attributes: PlayerAttributes
) {
  return new Promise<void>((resolve) => {
    const action: PlayerAttributesMessage = {
      ...attributes,
      count: attributesCounter++,
    };

    const attributesString = JSON.stringify(attributes);
    if (lastAtributes === attributesString) return;
    lastAtributes = attributesString;

    const topic = `game/player/${playerId}/attributes`;
    mqttClient.publish(topic, JSON.stringify(action));
    resolve();
  });
}

// Loop thread to send player attributes
setInterval(async () => {
  const player = getPlayerById(PLAYER_ID);
  if (!player) return;

  const attributes = {
    imune: player.imune,
    lives: player.lives,
    speed: player.speed,
    curSpeed: player.curSpeed,
    force: player.force,
    position: { x: player.pos.x, y: player.pos.y },
  } as PlayerAttributes;

  await asyncSendPlayerAttributes(PLAYER_ID, attributes);
});

let bombCounter = 0;
function sendBombPlacement(position: Vec2, data: BombData) {
  const action: PlayerBombMessage = {
    position,
    data,
    count: bombCounter++,
  };
  mqttClient.publishAsync(
    `game/player/${PLAYER_ID}/bomb`,
    JSON.stringify(action)
  );
}

function placeBomb(pos: Vec2, data: BombData) {
  const bomb = level.spawn("0", pos) as any;
  bomb.force = data.force;

  play("place_bomb");

  return bomb;
}

function handlePlayerAttributes(
  playerId: string,
  attributes: PlayerAttributesMessage
) {
  const player = getPlayerById(playerId);

  if (!player) {
    console.warn("Player not found", playerId);
    return;
  }

  const { imune, lives, position } = attributes;

  player.imune = imune;
  player.lives = lives;
  player.pos = vec2(position.x, position.y);
}

function broadcastComp(): any {
  return {
    id: "broadCast",
    update() {
      const attributes = {
        imune: this.imune,
        lives: this.lives,
        position: { x: this.pos.x, y: this.pos.y },
      } as PlayerAttributes;
      asyncSendPlayerAttributes(this.playerId, attributes);
    },
  } as any;
}

scene("game", () => {
  let livesCounter = 3;

  level = addLevel(LEVEL_STRING, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    pos: vec2(TILE_SIZE * 1, TILE_SIZE * 1),
    tiles: {
      "0": () => [
        sprite("bomb", { width: TILE_SIZE, height: TILE_SIZE }),
        area(),
        anchor("center"),
        scale(0.5),
        timer(),
        bomb(),
        "bomb",
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
        destructible({ animate: true, stopPropagation: true }),
        body({ isStatic: true }),
        anchor("center"),
      ],
      "*": () => [
        sprite("fire", { width: TILE_SIZE, height: TILE_SIZE }),
        area({ scale: 0.5 }),
        withOnCreate(),
        anchor("center"),
        pos(),
        rotate(0),
        explode(),
        opacity(1),
        lifespan(0.5, { fade: 0.5 }),
        { direction: undefined, force: INITIAL_BOMB_FORCE },
        "explosion",
      ],
      $: () => [
        sprite("power_up", {
          width: TILE_SIZE / 1.5,
          height: TILE_SIZE / 1.5,
        }),
        area(),
        color(),
        destructible({
          animate: false,
          stopPropagation: false,
          noPowerUp: true,
        }),
        anchor("center"),
        powerUp(),
        opacity(1),
        lifespan(8, { fade: 1 }),
      ],
    },
  }) as unknown as LevelComp;

  // display score
  const livesLabel = add([
    text(livesCounter.toString()),
    anchor("center"),
    pos(width() / 2, 80),
    fixed(),
    z(100),
  ]);

  playersMap["1"] = createPlayer(vec2(2, 2), { id: "1" });
  playersMap["2"] = createPlayer(vec2(24, 2), { id: "2" });

  const directionsMap = {
    left: LEFT,
    right: RIGHT,
    up: UP,
    down: DOWN,
  };

  const player = playersMap[PLAYER_ID];
  // player.use(broadcastComp());

  for (const dir in directionsMap) {
    onKeyDown(dir as Key, () => {
      player.move(
        directionsMap[dir as keyof typeof directionsMap].scale(player.curSpeed)
      );
    });
  }

  onKeyPress("space", () => {
    if (player.currBombs >= player.maxBombs) return;
    const pos = myPos2Tile(player.pos.sub(TILE_SIZE * 1, TILE_SIZE * 1));

    if (level.getAt(pos).some((obj) => obj.is("bomb"))) return;

    const bomb = placeBomb(pos, {
      force: player.force,
    });

    bomb.onExplode = () => {
      player.currBombs--;
    };

    sendBombPlacement(pos, { force: player.force });
    player.currBombs++;
  });

  function myPos2Tile(pos: Vec2) {
    return vec2(Math.round(pos.x / TILE_SIZE), Math.round(pos.y / TILE_SIZE));
  }
});

scene("menu", (score) => {
  add([
    sprite("bean"),
    pos(width() / 2, height() / 2 - 108),
    scale(3),
    anchor("center"),
  ]);

  // display score
  add([
    text(score),
    pos(width() / 2, height() / 2 + 108),
    scale(3),
    anchor("center"),
  ]);

  // go back to game with space is pressed
  onKeyPress("space", () => go("game"));
  onClick(() => go("game"));
});

go("game");
