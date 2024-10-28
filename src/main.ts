import { LevelComp } from "kaboom";
import { bomb, destructible, explode, withOnCreate } from "./components";
import { createPlayer } from "./components/player";
import { INITIAL_BOMB_FORCE, TILE_SIZE } from "./constants";
import { powerUpComp as powerUp } from "./components/powerUp";
import mqtt from "mqtt";

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

scene("game", () => {
  let livesCounter = 3;

  const level = addLevel(
    [
      "========================",
      "=    +  ++      @@     =",
      "= = =+= =+=+=+= = = = ==",
      "=+     ++   +++ ++  +  =",
      "=+= = =+=+= = = = = = ==",
      "=+  +   ++ +  + ++  +  =",
      "=+= =+=+=+= =+= = = = ==",
      "=+  +   ++ +++  ++  +  =",
      "========================",
    ],
    {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      pos: vec2(TILE_SIZE * 2, TILE_SIZE * 2),
      tiles: {
        "@": () => [
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
          area({ scale: 0.9 }),
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
        ],
      },
    }
  );

  // display score
  const livesLabel = add([
    text(livesCounter.toString()),
    anchor("center"),
    pos(width() / 2, 80),
    fixed(),
    z(100),
  ]);

  const player = createPlayer(level as unknown as LevelComp);
  players.push({ playerId: 1, obj: player });
  onKeyDown(dir as Key, () => {
    player.move(dirs[dir as keyof typeof dirs].scale(SPEED));
    sendPlayerAction("1", dir as 'up' | 'down' | 'left' | 'right');
  });
0});

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
