import { KEventController as EventController, GameObj, Key, LevelComp, Vec2 } from "kaplay";
import mqtt from "mqtt";
import { v4 as uuidv4 } from "uuid";
import { bomb, BombData } from "./components/bomb";
import { destructible } from "./components/destructible";
import { explosion } from "./components/explosion";
import { createPlayer } from "./components/player";
import { powerUpComp as powerUp } from "./components/powerUp";
import { withOnCreate } from "./components/withOnCreate";
import { INITIAL_BOMB_FORCE, LEVEL_STRING, TILE_SIZE } from "./constants";

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

const playersMap: Record<string, GameObj<any>> = {};
const topicsCounter: Record<string, number> = {};

const PLAYER_ID = uuidv4();

let level: LevelComp;

function getPlayerById(playerId: string) {
  return playersMap[playerId];
}

const mqttBrokerUrl = import.meta.env.MQTT_BROKER_URL || "ws://localhost:1883";
const mqttClient = mqtt.connect(mqttBrokerUrl);

mqttClient.on("connect", () => {
  console.log("Connected to MQTT");
  mqttClient.subscribe("game/start");
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

type StartMessage = {
  playerId: string;
  position: number;
  color: string;
  numberOfPlayers: number;
};

const INITIAL_POSITIONS = [vec2(2, 2), vec2(24, 2), vec2(2, 8), vec2(24, 8)];
const initialPlayersData: StartMessage[] = [];

const gameScene = add([]);

mqttClient.on("message", (topic, message) => {
  if (topic.startsWith("game/player/")) {
    const playerId = extractPlayerIdFromTopic(topic);
    if (playerId === PLAYER_ID) return;

    const decodedMessage: BaseMessage = JSON.parse(message.toString());

    if (!topicsCounter[topic]) topicsCounter[topic] = decodedMessage.count;

    if (topicsCounter[topic] > decodedMessage.count) return;
    topicsCounter[topic] = decodedMessage.count;

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
  } else if (topic === "game/start") {
    clearInterval(hubInterval);

    const decodedMessage: StartMessage = JSON.parse(message.toString());

    initialPlayersData.push(decodedMessage);
    const { playerId, numberOfPlayers } = decodedMessage;

    mqttClient.subscribe(`game/player/${playerId}/attributes`);
    mqttClient.subscribe(`game/player/${playerId}/bomb`);
    mqttClient.subscribe(`game/player/${playerId}/death`);

    if (initialPlayersData.length === numberOfPlayers) go("game");
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
}, 10);

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

scene("game", () => {
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
        anchor("center"),
        "wall",
      ],
      "+": () => [
        sprite("wood", { width: TILE_SIZE, height: TILE_SIZE }),
        destructible({ animate: true, stopPropagation: true }),
        anchor("center"),
        "wood",
      ],
      "*": () => [
        sprite("fire", { width: TILE_SIZE, height: TILE_SIZE }),
        area({ scale: 0.5 }),
        withOnCreate(),
        anchor("center"),
        pos(),
        rotate(0),
        explosion(),
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

  const directionsMap = {
    left: LEFT,
    right: RIGHT,
    up: UP,
    down: DOWN,
  };

  // Add players
  initialPlayersData.forEach((data) => {
    const { playerId, position, color } = data;

    const tilePos = INITIAL_POSITIONS[position];

    const player = createPlayer(tilePos, { id: playerId, color });

    playersMap[playerId] = player;
  });

  const player = playersMap[PLAYER_ID];

  for (const dir in directionsMap) {
    gameScene.onKeyDown(dir as Key, () => {
      // Check if there is a wall in the direction
      const delta = directionsMap[dir as keyof typeof directionsMap];
      const nextPlayerPos = player.pos.add(delta.scale(player.curSpeed));

      // Half of the tile size
      const halfTile = vec2(TILE_SIZE / 2, TILE_SIZE / 2).scale(0.95);

      // Check 2 player corners
      const corners: Vec2[] = [];

      if (dir === "right" || dir === "down") {
        corners.push(nextPlayerPos.add(halfTile));
      }
      if (dir === "left" || dir === "up") {
        corners.push(nextPlayerPos.sub(halfTile));
      }
      if (dir === "right" || dir === "up") {
        corners.push(nextPlayerPos.add(halfTile.x, -halfTile.y));
      }
      if (dir === "left" || dir === "down") {
        corners.push(nextPlayerPos.add(-halfTile.x, halfTile.y));
      }

      // Check if any corner is inside a wall
      if (
        corners.some((corner) =>
          level
            .getAt(myPos2Tile(corner))
            .some((obj) => obj.is("wall") || obj.is("wood"))
        )
      )
        return;
      player.pos = nextPlayerPos;
    });
  }

  gameScene.onKeyPress("space", () => {
    if (player.currBombs >= player.maxBombs) return;
    const pos = myPos2Tile(player.pos);

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
    const offset = pos.sub(TILE_SIZE * 1, TILE_SIZE * 1);
    return vec2(
      Math.round(offset.x / TILE_SIZE),
      Math.round(offset.y / TILE_SIZE)
    );
  }
});

let hubInterval: NodeJS.Timeout;

scene("menu", () => {
  add([
    text("Player Id:" + PLAYER_ID),
    pos(width() / 2, height() / 2 + 108),
    scale(1),
    color(0, 0, 0),
    anchor("center"),
  ]);

  let isReady = false;
  let onUpdateEvent: EventController;

  addButton("Ready", vec2(width() / 2, height() / 2), (btn, btnText) => {
    isReady = !isReady;

    if (!onUpdateEvent)
      onUpdateEvent = btn.onUpdate(() => {
        const t = time() * 10;
        btn.color = hsl2rgb((t / 20) % 1, 0.6, 0.7);
        btn.scale = vec2(1.2);
      });

    onUpdateEvent.paused = !isReady;
    btnText.text = isReady ? "Waiting..." : "Ready";

    if (!isReady) {
      btn.scale = vec2(1);
      btn.color = rgb();
    }
  });

  // Loop for sending ping to the server
  hubInterval = setInterval(() => {
    mqttClient.publish(
      `hub/player/${PLAYER_ID}/ping`,
      JSON.stringify({ isReady })
    );
  }, 500);
});

function addButton(
  txt: string,
  p: Vec2,
  callback: (btn: GameObj, btnText: GameObj) => void
) {
  // add a parent background object
  const btn = add([
    rect(240, 80, { radius: 8 }),
    pos(p),
    area(),
    scale(1),
    anchor("center"),
    outline(4),
    color(),
  ]);

  // add a child object that displays the text
  const btnText = btn.add([text(txt), anchor("center"), color(0, 0, 0)]);

  // onHoverUpdate() comes from area() component
  // it runs every frame when the object is being hovered
  btn.onHoverUpdate(() => {
    const t = time() * 10;
    btn.color = hsl2rgb((t / 10) % 1, 0.6, 0.7);
    btn.scale = vec2(1.2);
    setCursor("pointer");
  });

  // onHoverEnd() comes from area() component
  // it runs once when the object stopped being hovered
  btn.onHoverEnd(() => {
    btn.scale = vec2(1);
    btn.color = rgb();
  });

  // onClick() comes from area() component
  // it runs once when the object is clicked
  btn.onClick(() => callback(btn, btnText));

  return { btn, btnText };
}

// Manually add player
// initialPlayersData.push({
//   playerId: PLAYER_ID,
//   position: 0,
//   color: "#FF6347",
//   numberOfPlayers: 1,
// });

// go("game");
go("menu");
