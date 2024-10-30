# BomberMQ

BomberMQ is a multiplayer game built with TypeScript, Vite, and MQTT for real-time communication. Players can place bombs, collect power-ups, and compete against each other in a dynamic game environment.

![BomberMQ Gameplay](https://github.com/ArthurMbraga/bomberMQ/raw/main/public/logo_small.jpeg)

## Architecture

The BomberMQ project consists of three main components:

1. **MQTT Broker**: Facilitates real-time communication between the game clients and the orchestrator. It handles the messaging protocol and ensures that messages are delivered to the appropriate recipients.
2. **Web Application**: The front-end of the game, built with Vite and TypeScript. It provides the user interface and game logic for players to interact with the game.
3. **Orchestrator**: It ensures that all players are synchronized and handles when the game should start and the initial game setup.


## Deployment

### Prerequisites

- Docker
- Docker Compose


### Deploying with Docker Compose
  
  
You can deploy the project using Docker Compose. The `docker-compose.yaml` file is provided for this purpose.

Before starting the application, remember to change the IP address of your machine in the `.env` file:

```properties
# .env
VITE_MQTT_BROKER_URL=ws://<your-machine-ip>:1883
```

To start the application and orchestrator using Docker Compose, run:

```sh
docker-compose up
```

Docker Compose will expose the following services:

- **BomberMQ Web Server**: accessible `http://localhost:3000`
- **MQTT Broker**: accessible `ws://localhost:1883`

## Development Setup

### Prerequisites

- Node.js
- pnpm
- A running MQTT Broker (e.g. Mosquitto)

### Installation

1. Install dependencies
   ```sh
    pnpm install
   ```
2. Ensure your MQTT broker is running and accessible. Update the `VITE_MQTT_BROKER_URL` environment variable in the `.env` file with the URL of your MQTT broker.

   ```properties
   # .env
   VITE_MQTT_BROKER_URL=ws://localhost:1883
   ```

### Running the project
#### Running the orchestrator

To start the orchestrator, run:

```sh
pnpm run orchestrator
```

If you make any modifications to the orchestrator files, you should run the command again to apply the changes.


##### Running the development web server

To start the development server, ensure that both the **MQTT broker** and **orchestrator** are running. Then, run:

```sh
pnpm run dev
```

The development server will be running at `http://localhost:3000`.


