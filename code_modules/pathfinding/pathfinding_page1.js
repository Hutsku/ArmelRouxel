import * as pf from './pathfinding.js';

/* ============================ OBJETS ENTITEES ============================ */
function discretizeGridPosition (x, y, size) {
    let posX = parseInt(x/size)*size+size/2;
    let posY = parseInt(y/size)*size+size/2;
    return {x: posX, y: posY}
}

class Follower {
    constructor (sprite, target) {
        this.sprite = sprite;
        this.width  = sprite.displayWidth;
        this.target = target;
        this.path;
        this.queue;

        // Paramètres de fonctionnement interne
        this._mire1 = new Phaser.Geom.Line();
        this._mire2 = new Phaser.Geom.Line();
        this._approxCircle = new Phaser.Geom.Circle()
        // variable de fonctionnement du path finding. nextNode stock le 2e point du chemin et 
        // firstNode permet de verifier si l'entité est déjà passé sur le premier point
        this._nextNode;
        this._firstNode;
    }

    // Calcule le chemin le plus court possible vers la cible
    pathfinding (grid, platforms, config, stepLimit=-1) {
        // On vérifie sur un chemin en ligne droite est possible
        let collide = false
        this._updateMire(this.target)
        for (let sprite of platforms.getChildren()) {
            let bound = sprite.getBounds()
            if (Phaser.Geom.Intersects.GetLineToRectangle(this._mire1, bound).length || 
                Phaser.Geom.Intersects.GetLineToRectangle(this._mire2, bound).length) {
                collide = true;
                break;
            }
        }

        // Si on peut bouger en ligne droite, on le fait, sinon on trouve le chemin le + court
        if (!collide && config.straight) this.path = [{position: this.target.getCenter()}];
        else if (config.pathfinding) { 
            let startPosition = discretizeGridPosition(this.sprite.x, this.sprite.y, grid.size);
            let goalPosition  = discretizeGridPosition(this.target.x, this.target.y, grid.size);

            // On établi l'algorithm à utiliser
            let searchAlgorithm = pf.AStarSearch;
            if (config.pathfinding == "BFS") searchAlgorithm = pf.BreadthFirstSearch;
            if (config.pathfinding == "Dijkstra") searchAlgorithm = pf.DijkstraSearch;
            if (config.pathfinding == "GBF") searchAlgorithm = pf.GreedyBestFirstSearch;
            if (config.pathfinding == "A*") searchAlgorithm = pf.AStarSearch;
            let result = searchAlgorithm(grid.nodes[`${startPosition.x},${startPosition.y}`],
                grid.nodes[`${goalPosition.x},${goalPosition.y}`], config.isGradual, stepLimit)

            this.path = result.path;
            this.queue = result.queue;

            // On simplifie le chemin en supprimant ceux qui peuvent se prendre en ligne droite
            // --> Si un des deux points est en mouvement, inutile de simplifier plus loins que la première ligne droite
            if (config.linearize) this.path = this._linearizePathStatic(this.path, platforms)
        }
    }

    // Fait suivre le chemin trouvé
    move () {
        let target;
        if (this.path.length > 1) {
            // Si le chemin change (du moins son début) alors on reinitialise la progression
            if (!this._nextNode) this._nextNode = this.path[1];
            if (!this._equalPoints(this._nextNode.position, this.path[1].position)) {
                this._firstNode = false;
                this._nextNode = this.path[1];
            }

            // On vérifie si l'entité est venu sur le prochain point
            if (this._equalPoints(this.sprite, this.path[0].position, 2) && !this._firstNode) this._firstNode = true
            if (this._firstNode)target = this._nextNode.position;
            else target = this.path[0].position;    
        }
        else if (this.path.length) target = this.path[0].position;

        if (this.path.length) {
            let angle = Math.atan2(target.y - this.sprite.y, target.x - this.sprite.x);
            this.sprite.setVelocityX(100 * Math.cos(angle));
            this.sprite.setVelocityY(100 * Math.sin(angle));               
        }
        else {
            this.sprite.setVelocityX(0);
            this.sprite.setVelocityY(0);
        }
    }

    // Optimise le chemin en supprimant les points redondants (si il y a une ligne de vue directe)
    // Version dynamique (on linearise seulement les premiers points)
    _linearizePath (path, platforms) {
        if (path.length <=1 ) return [];

        let index = 0
        let newPath = Array.from(path) // on copie le chemin
        for (let node of newPath) {
            let collide = false
            this._updateMire(node.position)
            for (let sprite of platforms.getChildren()) {
                let bound = sprite.getBounds()
                if (Phaser.Geom.Intersects.GetLineToRectangle(this._mire1, bound).length || 
                    Phaser.Geom.Intersects.GetLineToRectangle(this._mire2, bound).length) {
                    collide = true;
                    break;
                }
            }

            if (!collide) index++;
            else break;
        }
        if (index > 1) return newPath.slice(index-1)
        return newPath
    }

    // ...
    // Version statique (on linearise tous les points du chemin)
    _linearizePathStatic (path, platforms) {
        if (path.length <=1 ) return [];

        let index = 0;
        let startPoint = this.sprite;
        let newPath = [];
        for (let node of path) {
            let collide = false
            this._updateMire(node.position, startPoint)
            for (let sprite of platforms.getChildren()) {
                let bound = sprite.getBounds()
                if (Phaser.Geom.Intersects.GetLineToRectangle(this._mire1, bound).length || 
                    Phaser.Geom.Intersects.GetLineToRectangle(this._mire2, bound).length) {
                    collide = true;
                    break;
                }
            }

            if (collide && index) {
                newPath.push(path[index-1])
                startPoint = path[index-1].position;
            };
            index++;
        }
        newPath.push(path[path.length-1])
        return newPath
    }

    // Met en valeur les noeuds de la file d'attente (pour afficher la pathfinding graduel)
    _displayQueue (queue) {  
    }

    // Met à jour la position de la mire (avec epaisseur)
    _updateMire (target, start=this.sprite) {
        let angle = -Math.atan2(target.y - start.y, target.x - start.x);

        // On adapte la taille de la mire seon l'angle (étant donné que c'est un carré)
        let dx, dy;
        if  (-Math.PI/4 <= angle && angle < Math.PI/4) {
            dy = this.width/2;
            dx = (this.width/2) * Math.sin(2*angle);
        }
        else if (Math.PI/4 <= angle && angle < 3*Math.PI/4) {
            dx = this.width/2;
            dy = (this.width/2) * -Math.sin(2*angle-Math.PI)
        }
        else if (-3*Math.PI/4 <= angle && angle < -Math.PI/4) {
            dx = -this.width/2;
            dy = (this.width/2) * Math.sin(2*angle-Math.PI)
        }
        else {
            dy = -this.width/2;
            dx = (this.width/2) * -Math.sin(2*angle);
        }

        this._mire1.setTo(start.x + dx, start.y + dy, target.x + dx, target.y + dy)    
        this._mire2.setTo(start.x - dx, start.y - dy, target.x - dx, target.y - dy)
    }

    // Vérifie si l'entité est sur le point, dans un cercle concentrique d'un rayon donné
    _equalPoints (a, b, radius=1) {
        this._approxCircle.setTo(b.x, b.y, radius)
        return Phaser.Geom.Circle.ContainsPoint(this._approxCircle, a)
    }

    // Affiche les différentes proriétés graphiques debug
    debug (config, graphics) {
        // On trace la ligne de vision entre les 2 entités
        if (config.mireTarget) {
            graphics.strokeLineShape(this._mire1);
            graphics.strokeLineShape(this._mire2);
        }

        // On trace le chemin trouvé par le pathfiding
        graphics.lineStyle(5, 0xaa0000);
        if (config.path && this.path.length) {
            let debugPath = Array.from(this.path)
            debugPath.unshift({position: this.sprite})
            graphics.strokePoints(debugPath.map(function(x) {return x.position}));
            graphics.lineStyle(1, 0x00aa00);
            if (config.pathNode) {
                for (let node of debugPath) {
                    graphics.strokeCircle(node.position.x, node.position.y, 5);
                }
            }
        }

        // On trace le quadrillage
        graphics.lineStyle(2, 0x0000ff);
        if (config.isGradual && this.queue.length) {
            for (let item of this.queue) {
                let rect = new Phaser.Geom.Rectangle(item.node.position.x-this.width/2, item.node.position.y-this.width/2, this.width, this.width);
                graphics.strokeRectShape(rect);
            } 
        } 
    }
}

class Pathfinding extends Phaser.Scene {
    constructor (name, width, height, size, config) {
        super(name);
        this.name = name;

        this.player;
        this.ennemy;
        this.platforms;
        this.entities;
        this.cursors;
        this.pointer;
        this.graphics;

        this.direction = new Phaser.Geom.Point()

        this.grid = new pf.SquareGrid(width, height, size);
        this.size = size;
        this.stepLimit = 0;

        this.config = config;

        this._pointerClick = false;
        this._newPlatformWeight = 1;
    }

    // Change la valeur d'un noeud du quadrillage et créer une plateforme si necessaire
    changeNode (position, weight) {
        let node = this.grid.getNode(position);
        if (node.weight == weight) return;

        node.weight = weight;
        // this.input.hitTestPointer(this.pointer) marche seulement avec des gameobject interactifs
        if (weight == -1) {
            let sprite = this.platforms.create(node.position.x, node.position.y, 'grey')
            sprite.displayWidth = this.size
            sprite.scaleY = sprite.scaleX;
        }
        if (weight == 1) {
            for (let sprite of this.platforms.getChildren()) {
                if (sprite.x == node.position.x && sprite.y == node.position.y) {
                    sprite.destroy()
                    break;
                }
            }   
        }
    }

    // Initialise les valeurs par défaut
    init (data) {
        // Création des paramètres
        this.platforms = this.physics.add.staticGroup();
        this.entities  = this.physics.add.group();
        this.cursors   = this.input.keyboard.createCursorKeys();
        this.pointer   = this.input.activePointer;
    }

    preload () {
        this.load.image('red', '/assets/red.png');
        this.load.image('ground', '/assets/platform.png');
        this.load.image('white', '/assets/White.png');
        this.load.image('black', '/assets/black.png');
        this.load.image('grey', '/assets/grey.png');
        this.load.image('blue', '/assets/blue.png');
        this.load.image('lightgrey', '/assets/lightgrey.png');
    }

    create (data) {
        // Création de la scène
        this.add.image(250, 150, 'lightgrey').setDisplaySize(500, 300);
        this.graphics  = this.add.graphics({ lineStyle: { width: 1, color: 0xaa00aa } });

        // Création des entités
        this.player = this.entities.create(375, 105, 'red').setInteractive({ 
            cursor: 'grab' 
        });
        this.player.displayWidth = this.size;
        this.player.scaleY = this.player.scaleX;
        this.player.setCollideWorldBounds(true);

        let ennemySprite = this.entities.create(135, 195, 'black').setInteractive({ 
            cursor: 'grab' 
        });
        ennemySprite.displayWidth = 29;
        ennemySprite.scaleY = ennemySprite.scaleX;
        ennemySprite.setCollideWorldBounds(true);

        this.entities.setDepth(1)

        // Initialisation des collisions
        this.physics.add.collider(this.entities, this.platforms);
        this.physics.add.collider(this.player, ennemySprite);

        // Création de la grille et du suivi
        this.ennemy = new Follower(ennemySprite, this.player);

        if (this.config.isDraggable) {
            this.input.setDraggable([this.player, ennemySprite]);
            this.player.on('drag', function(pointer, x, y) {
                this.setPosition(x, y)
            })
            ennemySprite.on('drag', function(pointer, x, y) {
                this.setPosition(x, y)
            })
        }

        // Désactive la scène si hors de l'écran
        let scene = this.scene;
        let name = this.name;
        const observer = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.intersectionRatio > 0) scene.resume()
                else scene.pause(name)
            });
        }, {threshold: 0});
        observer.observe(document.getElementById(this.name));
    }

    update (time, delta) {
        // Gestion du déplacement du joueur
        this.player.setVelocityX(0);
        this.player.setVelocityY(0);
        this.direction.setTo();
        if (this.cursors.left.isDown)  this.direction.x = -1
        if (this.cursors.right.isDown) this.direction.x = 1
        if (this.cursors.up.isDown)    this.direction.y = -1
        if (this.cursors.down.isDown)  this.direction.y = 1

        // On prend en compte les déplacement diagonaux
        if (this.direction.x || this.direction.y) {
            let angle = Math.atan2(this.direction.y, this.direction.x)
            this.player.setVelocityX(200 * Math.cos(angle))
            this.player.setVelocityY(200 * Math.sin(angle))
        }

        // On gère les évenements souris
        this.pointer   = this.input.activePointer;
        if (this.pointer.isDown && this.pointer.downElement == this.game.canvas && this.input.getDragState(this.pointer) != 4) {
            if (!this._pointerClick) {
                let weight = this.grid.getNode(this.pointer.position).weight;
                if (weight == -1) this._newPlatformWeight = 1;
                if (weight == 1) this._newPlatformWeight = -1;
            }
            if (this.config.createPlatforms) this.changeNode(this.pointer.position, this._newPlatformWeight);
            this._pointerClick = true;
        }
        if (this._pointerClick && this.pointer.upTime >= this.pointer.downTime) this._pointerClick = false;

        // Pathfinding
        this.ennemy.pathfinding(this.grid, this.platforms, this.config, this.stepLimit);
        if (this.config.isMoving) this.ennemy.move();

        // Affichage debug
        if (this.config.debugActive) this.debug();
    }

    // Affiche les paramètres graphiques pour le debug
    debug () {
        this.graphics.clear();

        // On trace le quadrillage
        this.graphics.lineStyle(1, 0x999999);
        if (this.config.grid) {
            for (var x = 0; x < this.grid.grid.length; x++) {
                for (var y = 0; y < this.grid.grid[x].length; y++) {
                    this.graphics.strokeRectShape(this.grid.grid[x][y].rect);
                }
            }            
        }

        this.ennemy.debug(this.config, this.graphics) // Affiche la ligne de vision, le chemin, etc.

        // On met en valeur la maille occupé par le joueur
        this.graphics.lineStyle(1, 0x00aa00);
        if (this.config.squarePosition) {
            this.graphics.strokeRectShape(this.grid.grid[parseInt(this.player.x/30)][parseInt(this.player.y/30)].rect);          
        }
    }
}

class BreadthFirstScene extends Pathfinding {
    create (data) {
        super.create(data);
        // On ajoute les plateformes
        this.platforms.create(255, 15, 'grey')
        this.platforms.create(255, 45, 'grey')
        this.platforms.create(255, 105, 'grey')
        this.platforms.create(255, 135, 'grey')
        this.platforms.create(255, 165, 'grey')
        this.platforms.create(255, 195, 'grey')
        this.platforms.create(255, 225, 'grey')
        this.platforms.create(285, 225, 'grey')
        this.platforms.create(315, 225, 'grey')
        this.platforms.create(345, 225, 'grey')
        this.platforms.create(375, 225, 'grey')
        this.platforms.create(405, 225, 'grey')
        this.platforms.create(435, 225, 'grey')
        this.platforms.create(465, 225, 'grey')
        this.grid.changeNodes(this.platforms.getChildren())

        this.player.setPosition(375, 105);
        this.ennemy.sprite.setPosition(135, 195);
    }
}
class DijkstraScene extends Pathfinding {
    create (data) {
        super.create(data);
        // On ajoute les plateformes
        this.platforms.create(135, 285, 'blue')
        this.platforms.create(165, 285, 'blue')
        this.platforms.create(165, 255, 'blue')
        this.platforms.create(165, 75, 'blue')
        this.platforms.create(165, 105, 'blue')
        this.platforms.create(195, 285, 'blue')
        this.platforms.create(195, 15, 'blue')
        this.platforms.create(195, 75, 'blue')
        this.platforms.create(195, 105, 'blue')
        this.platforms.create(195, 135, 'blue')
        this.platforms.create(195, 165, 'blue')
        this.platforms.create(225, 105, 'blue')
        this.platforms.create(225, 135, 'blue')
        this.platforms.create(225, 165, 'blue')
        this.platforms.create(225, 195, 'blue')
        this.platforms.create(225, 225, 'blue')
        this.platforms.create(255, 75, 'blue')
        this.platforms.create(255, 105, 'blue')
        this.platforms.create(255, 135, 'blue')
        this.platforms.create(255, 165, 'blue')
        this.platforms.create(255, 195, 'blue')
        this.platforms.create(255, 225, 'blue')
        this.platforms.create(255, 255, 'blue')
        this.platforms.create(285, 45, 'blue')
        this.platforms.create(285, 75, 'blue')
        this.platforms.create(285, 105, 'blue')
        this.platforms.create(285, 165, 'blue')
        this.platforms.create(285, 195, 'blue')
        this.platforms.create(285, 225, 'blue')
        this.platforms.create(315, 75, 'blue')
        this.platforms.create(315, 105, 'blue')
        this.platforms.create(315, 135, 'blue')
        this.platforms.create(315, 165, 'blue')
        this.platforms.create(315, 195, 'blue')
        this.platforms.create(315, 255, 'blue')
        this.grid.changeNodes(this.platforms.getChildren(), 5)
        this.graphics  = this.add.graphics({ lineStyle: { width: 1, color: 0xaa00aa } });

        this.player.setPosition(375, 135);
        this.ennemy.sprite.setPosition(75, 165);
    }
}
class GreedyBestFirstScene extends Pathfinding {
    create (data) {
        super.create(data);
        // On ajoute les plateformes
        this.platforms.create(135, 75, 'grey')
        this.platforms.create(165, 75, 'grey')
        this.platforms.create(195, 75, 'grey')
        this.platforms.create(225, 75, 'grey')
        this.platforms.create(255, 75, 'grey')
        this.platforms.create(285, 75, 'grey')
        this.platforms.create(315, 75, 'grey')
        this.platforms.create(345, 75, 'grey')
        this.platforms.create(345, 105, 'grey')
        this.platforms.create(345, 135, 'grey')
        this.platforms.create(345, 165, 'grey')
        this.platforms.create(345, 195, 'grey')
        this.platforms.create(345, 225, 'grey')
        this.platforms.create(345, 255, 'grey')
        this.platforms.create(345, 285, 'grey')
        this.grid.changeNodes(this.platforms.getChildren())

        this.player.setPosition(405, 75);
        this.ennemy.sprite.setPosition(165, 225);
    }
}
class LinearizationScene extends Pathfinding {
    create (data) {
        super.create(data);
        // On ajoute les plateformes
        this.platforms.create(45, 105, 'grey')
        this.platforms.create(45, 135, 'grey')
        this.platforms.create(45, 195, 'grey')
        this.platforms.create(45, 225, 'grey')
        this.platforms.create(45, 255, 'grey')
        this.platforms.create(45, 285, 'grey')
        this.platforms.create(75, 105, 'grey')
        this.platforms.create(105, 105, 'grey')
        this.platforms.create(135, 105, 'grey')
        this.platforms.create(165, 105, 'grey')
        this.platforms.create(195, 105, 'grey')
        this.platforms.create(225, 105, 'grey')
        this.platforms.create(225, 15, 'grey')
        this.platforms.create(225, 45, 'grey')
        this.platforms.create(225, 75, 'grey')
        this.platforms.create(225, 135, 'grey')
        this.platforms.create(225, 165, 'grey')
        this.platforms.create(225, 195, 'grey')
        this.platforms.create(225, 255, 'grey')
        this.platforms.create(225, 285, 'grey')
        this.platforms.create(315, 105, 'grey')
        this.platforms.create(315, 15, 'grey')
        this.platforms.create(315, 45, 'grey')
        this.platforms.create(315, 75, 'grey')
        this.platforms.create(315, 135, 'grey')
        this.platforms.create(315, 165, 'grey')
        this.platforms.create(315, 195, 'grey')
        this.platforms.create(315, 255, 'grey')
        this.platforms.create(315, 285, 'grey')
        this.platforms.create(345, 165, 'grey')
        this.platforms.create(375, 165, 'grey')
        this.platforms.create(435, 165, 'grey')
        this.platforms.create(465, 165, 'grey')
        this.grid.changeNodes(this.platforms.getChildren())
    }
}

/* ========================= CREATION DES CONSTANTES ======================== */

let config1 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: false,
    straight: true,
    linearize: false,
    createPlatforms: false,
    isDraggable: true,
    moveEntities: false
}
let game1 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'straightLine',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: new Pathfinding('straightLine', 480, 300, 30, config1),
});

let config2 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: 'BFS',
    straight: false,
    linearize: false,
    createPlatforms: true,
    isDraggable: true,
    isGradual: true,
    moveEntities: false
}
let scene2 = new BreadthFirstScene('bfs', 480, 300, 30, config2)
let game2 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'bfs',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene2,
});

let config3 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: 'Dijkstra',
    straight: false,
    linearize: false,
    createPlatforms: true,
    isDraggable: true,
    isGradual: true,
    moveEntities: false
}
let scene3 = new DijkstraScene('dijkstra', 480, 300, 30, config3)
let game3 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'dijkstra',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene3,
});

let config4 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: 'GBF',
    straight: false,
    linearize: false,
    createPlatforms: true,
    isDraggable: true,
    isGradual: true,
    moveEntities: false
}
let scene4 = new Pathfinding('gbf-plain', 480, 300, 30, config4)
let game4 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'gbf-plain',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene4,
});

let config5 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: 'GBF',
    straight: false,
    linearize: false,
    createPlatforms: true,
    isDraggable: true,
    isGradual: true,
    moveEntities: false
}
let scene5 = new GreedyBestFirstScene('gbf', 480, 300, 30, config5)
let game5 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'gbf',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene5,
});

let config6 = {
    debugActive: true,
    grid: true,
    path: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: 'A*',
    straight: false,
    linearize: false,
    createPlatforms: true,
    isDraggable: true,
    isGradual: true,
    moveEntities: false
}
let scene6 = new GreedyBestFirstScene('a*', 480, 300, 30, config6)
let game6 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'a*',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene6,
});

let config7 = {
    debugActive: true,
    grid: true,
    path: true,
    pathNode: true,
    mireTarget: false,
    squarePosition: false,

    pathfinding: "A*",
    straight: true,
    linearize: true,
    createPlatforms: true,
    isDraggable: true,
    isMoving: false
}
let scene7 = new LinearizationScene('linearize', 480, 300, 30, config7);
let game7 = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 300,
    parent: 'linearize',
    antialias: true,
    physics: {
        default: 'arcade',
    },
    scene: scene7,
});

/* ================================= EVENEMENTS INPUT ======================================== */

$('#slider1').val(0);
$('#slider2').val(0);
$('#slider3').val(0);
$('#slider4').val(0);
$('#slider5').val(0);
$('#switch1').prop('checked', true);
$('#switch2').prop('checked', false);

$('#slider1').on('input', function() {scene2.stepLimit = this.value});
$('#slider2').on('input', function() {scene3.stepLimit = this.value});
$('#slider3').on('input', function() {scene4.stepLimit = this.value});
$('#slider4').on('input', function() {scene5.stepLimit = this.value});
$('#slider5').on('input', function() {scene6.stepLimit = this.value});
$('#switch1').on('input', function() {scene7.config.linearize = $('#switch1:checked').val()});
$('#switch2').on('input', function() {
    scene7.ennemy.sprite.setVelocityX(0);
    scene7.ennemy.sprite.setVelocityY(0); 
    scene7.config.isMoving  = $('#switch2:checked').val()
});