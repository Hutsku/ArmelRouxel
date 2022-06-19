import * as pf from './pathfinding.js';

let config = {
    type: Phaser.AUTO,
    width: 450,
    height: 450,
    physics: {
        default: 'arcade',
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let ennemy;
let platforms;
let cursors;
let graphics;
let mire;
let angle;
let straight = true;
let debug = true;
let grid;

let game = new Phaser.Game(config);

function preload () {
    this.load.image('red', '/assets/red.png');
    this.load.image('ground', '/assets/platform.png');
    this.load.image('white', '/assets/white.png');
    this.load.image('black', '/assets/black.png');
    this.load.image('grey', '/assets/grey.png');
}

function create () {
    // Création de la scène
    this.add.image(250, 250, 'grey').setDisplaySize(550, 550);

    platforms = this.physics.add.staticGroup();
    platforms.create(315, 375, 'white')
    platforms.create(105, 195, 'white')
    platforms.create(135, 195, 'white')
    platforms.create(165, 195, 'white')
    platforms.create(195, 195, 'white')
    platforms.create(225, 195, 'white')
    platforms.create(255, 195, 'white')
    platforms.create(75, 225, 'white')
    platforms.create(255, 225, 'white')

    /*platforms.createMultiple({
        key: 'white',
        repeat: 20,
        setXY: { x: 12, y: 500, stepX: 25 }
    })*/

    // Création du joueur
    player = this.physics.add.sprite(105, 405, 'red');
    player.setCollideWorldBounds(true);

    // Création du joueur
    ennemy = this.physics.add.sprite(165, 135, 'black');
    ennemy.setCollideWorldBounds(true);

    graphics = this.add.graphics({ lineStyle: { width: 1, color: 0xaa00aa } });
    mire = new Phaser.Geom.Line(player.x, player.y, ennemy.x, ennemy.y);

    // Initialisation des collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(ennemy, platforms);
    this.physics.add.collider(player, ennemy);

    // Evenements clavier
    cursors = this.input.keyboard.createCursorKeys();

    // Création de la grille
    grid = new pf.SquareGrid(450, 450);
}

function update () {
    player.setVelocityX(0);
    player.setVelocityY(0);
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
    }
    if (cursors.right.isDown) {
        player.setVelocityX(200);
    }
    if (cursors.up.isDown) {
        player.setVelocityY(-200);
    }
    if (cursors.down.isDown) {
        player.setVelocityY(200);
    }

    if (straight) {
        angle = Math.atan2(player.y - ennemy.y, player.x - ennemy.x);
        ennemy.setVelocityX(100 * Math.cos(angle));
        ennemy.setVelocityY(100 * Math.sin(angle));
    }
    if (debug) {
        graphics.clear();
        mire.setTo(player.x, player.y, ennemy.x, ennemy.y);
        graphics.strokeLineShape(mire);   

        graphics.lineStyle(1, 0x0000aa);
        for (var x = 0; x < grid.grid.length; x++) {
            for (var y = 0; y < grid.grid[x].length; y++) {
                graphics.strokeRectShape(grid.grid[x][y].rect);
            }
        }

        // On met en valeur la maille occupé par le joueur
        /*graphics.lineStyle(1, 0x00aa00);
        graphics.strokeRectShape(grid.grid[parseInt(player.x/30)][parseInt(player.y/30)].rect);
        let neighbors = grid.neighbors(`[${parseInt(player.x/30)*30}, ${parseInt(player.y/30)*30}]`)
        if (neighbors) {
            for (let node of neighbors) {
                graphics.strokeRectShape(node.rect);
            }            
        }*/

        let path = pf.AStarSearch(grid, 
            new Phaser.Geom.Point(parseInt(player.x/30)*30+15, parseInt(player.y/30)*30+15),
            new Phaser.Geom.Point(parseInt(ennemy.x/30)*30+15, parseInt(ennemy.y/30)*30+15)
        )
        graphics.lineStyle(1, 0xaa0000);
        if (path) graphics.strokePoints(path);
    }
}