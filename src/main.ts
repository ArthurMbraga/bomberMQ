import { Key } from "kaboom"

// load assets
loadSprite('bean', '/sprites/bean.png')
loadSprite("coin", "/sprites/coin.png")
loadSprite("spike", "/sprites/spike.png")
loadSprite("wall", "/sprites/wall.png")
loadSprite("wood", "/sprites/wood.png")
loadSprite("ghosty", "/sprites/ghosty.png")
loadSound("score", "/examples/sounds/score.mp3")

const SPEED = 320

const level = addLevel([
    // Símbolos que representam o mapa
    "========================",
    "=@      ++      $$     =",
    "= = = = = = = = = = = ==",
    "=      ++       ++     =",
    "= = = = = = = = = = = ==",
    "=^      ++      ##     =",
    "========================",
], {
    // Tamanho de cada bloco
    tileWidth: 64,
    tileHeight: 64,
    // Posição do canto superior esquerdo
    pos: vec2(100, 100),
    // Definição dos símbolos
    tiles: {
        "@": () => [
            sprite("bean"),
            area(),
            body(),
            anchor("bot"),
            "player",
            { playerId: 1 },
        ],
        "$": () => [
            sprite("bean"),
            area(),
            body(),
            anchor("bot"),
            "player",
            { playerId: 2 },
        ],
        "^": () => [
            sprite("bean"),
            area(),
            body(),
            anchor("bot"),
            "player",
            { playerId: 3 },
        ],
        "#": () => [
            sprite("bean"),
            area(),
            body(),
            anchor("bot"),
            "player",
            { playerId: 4 },
        ],
        "=": () => [
            sprite("wall", {width: 64, height: 64}),
            area(),
            body({ isStatic: true }),
            anchor("bot"),
            "wall",
        ],
        "+": () => [
            sprite("wood", {width: 64, height: 64}),
            area(),
            body({ isStatic: true }),
            anchor("bot"),
            "wood",
        ],
    },
});

const player = level.get("player")[0]

const dirs = {
    "left": LEFT,
    "right": RIGHT,
    "up": UP,
    "down": DOWN,
}

for (const dir in dirs) {
    onKeyDown(dir as Key, () => {
        player.move(dirs[dir as keyof typeof dirs].scale(SPEED))
    })
}

// add a kaboom on mouse click
onClick(() => {
    addKaboom(mousePos())
})

// burp on 'b'
// onKeyPress('b', burp)