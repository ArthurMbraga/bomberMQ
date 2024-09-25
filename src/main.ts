import { Key } from "kaplay"

// load assets
loadSprite('bean', '/sprites/bean.png')
loadSprite('bomberman_front', '/sprites/bomberman_front.png')
loadSprite("coin", "/sprites/coin.png")
loadSprite("spike", "/sprites/spike.png")
loadSprite("wall", "/sprites/wall.png")
loadSprite("wood", "/sprites/wood.png")
loadSprite("ghosty", "/sprites/ghosty.png")
loadSound("score", "/examples/sounds/score.mp3")

scene("game", () => {


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
                sprite("bomberman_front", { width: 64, height: 64 }),
                area(),
                pos(0, 0),
                body(),
                anchor("center"),
                "player",
                { playerId: 1 },
            ],
            "$": () => [
                sprite("bomberman_front", { width: 64, height: 64 }),
                area(),
                body(),
                anchor("bot"),
                "player",
                { playerId: 2 },
            ],
            "0": () => [
                sprite("coin", { width: 64, height: 64 }),
                area(),
                body(),
                anchor("bot"),
                "bomb",
                { playerId: 3 },
            ],
            "#": () => [
                sprite("bomberman_front", { width: 64, height: 64 }),
                area(),
                body(),
                anchor("bot"),
                "player",
                { playerId: 4 },
            ],
            "=": () => [
                sprite("wall", { width: 64, height: 64 }),
                area(),
                body({ isStatic: true }),
                anchor("bot"),
                "wall",
            ],
            "+": () => [
                sprite("wood", { width: 64, height: 64 }),
                area(),
                body({ isStatic: true }),
                anchor("bot"),
                "wood",
            ],
        },
    });

    const player = add([
        sprite("bomberman_front", { width: 64, height: 64 }),
        pos(0, 0),
        area(),
        body({isStatic: true}),
        anchor("center"),
        // "player",
        // { playerId: 1 },
    ])

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

    function spawnBomb(p: any) {
        console.log(p)
        // level.spawn("0", p)
        add([
            rect(12, 48),
            area(),
            pos(p.add(vec2(0, 32))),
            anchor("center"),
            color(127, 127, 255),
            outline(4),
            offscreen({ destroy: true }),
            // strings here means a tag
            "bullet",
        ])
    }

    onKeyPress("space", () => {
        // spawnBomb(player.pos)
        level.spawn("0", player.pos)
    })
})

go("game")