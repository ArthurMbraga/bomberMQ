import mqtt from "mqtt";

const mqttClient = mqtt.connect("ws://172.20.10.8:1883");

mqttClient.on("connect", () => {
  console.log("Connected to MQTT");
  mqttClient.subscribe("hub/player/+/ping");
});

mqttClient.on("error", (err) => {
  console.error("Erro de conexão MQTT:", err);
});

type PingMessage = {
  isReady: boolean;
};

type PlayersMap = {
  [key: string]: {
    lastPing: number;
    isReady?: boolean;
    position?: number;
    color?: string;
  };
};
const players: PlayersMap = {};

mqttClient.on("message", (topic, message) => {
  if (topic.startsWith("hub/player/")) {
    const playerId = extractPlayerIdFromTopic(topic);

    if (topic.endsWith("/ping")) {
      // if there is more than 4 players connected, ignore new players
      if (Object.keys(players).length >= 4) return;

      const decodedMessage: PingMessage = JSON.parse(message.toString());

      players[playerId] = {
        lastPing: Date.now(),
        isReady: decodedMessage.isReady,
      };

      // remove all players that didn't ping in the last 2 seconds
      const now = Date.now();
      Object.keys(players).forEach((playerId) => {
        if (now - players[playerId].lastPing > 2000) {
          delete players[playerId];
        }
      });

      // If there is one player connected, ignore
      if (Object.keys(players).length <= 1) return;

      // check if all players are ready
      const allPlayersReady = Object.keys(players).every(
        (playerId) => players[playerId].isReady
      );

      if (allPlayersReady) {
        console.log("All players are ready");

        // Give each player a random position between 0 and 3 and a color
        const positions = shuffle([0, 1, 2, 3]);
        const colors = shuffle(["#FF6347", "#FF8C00", "#FFD700", "#32CD32", "#1E90FF"]);
        const playerIds = Object.keys(players);

        playerIds.forEach((playerId) => {
          const position = positions.pop();
          const color = colors.pop();

          const numberOfPlayers = Object.keys(players).length;
          mqttClient.publish(
            "game/start",
            JSON.stringify({
              playerId,
              position,
              color,
              numberOfPlayers,
            })
          );
        });
      }
    }
  }
});

function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function extractPlayerIdFromTopic(topic: string) {
  const parts = topic.split("/");
  return parts[2];
}
