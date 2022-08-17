import * as pf from './pathfinding.js';

/* ============================ CLASSES DE JEU ============================== */

class Main extends Phaser.Scene {

    constructor (width, height, debug) {
        super('Main');

        this.player;
        this.ennemy;
        this.platforms;
        this.entities;
        this.cursors;
        this.pointer;
        this.graphics;

        this.direction = new Phaser.Geom.Point()

        this.grid = new pf.SquareGrid(width, height);

        this.debug = debug;

        this._pointerClick = false;
        this._newPlatformWeight = 0;
    }

    changeNode (position, weight) {
        let node = this.grid.getNode(position);
        if (node.weight == weight) return;

        node.weight = weight;
        // this.input.hitTestPointer(this.pointer) marche seulement avec des gameobject interactifs
        if (weight == -1) this.platforms.create(node.position.x, node.position.y, 'grey')
        if (weight == 0) {
            for (let sprite of this.platforms.getChildren()) {
                if (sprite.x == node.position.x && sprite.y == node.position.y) {
                    sprite.destroy()
                    break;
                }
            }   
        }
    }

    preload () {
        this.load.image('red', '/assets/red.png');
        this.load.image('ground', '/assets/platform.png');
        this.load.image('white', '/assets/white.png');
        this.load.image('black', '/assets/black.png');
        this.load.image('grey', '/assets/grey.png');
        this.load.image('lightgrey', '/assets/lightgrey.png');
    }

    create (data) {
        // Création de la scène
        this.add.image(250, 250, 'lightgrey').setDisplaySize(550, 550);

        this.platforms = this.physics.add.staticGroup();
        this.entities  = this.physics.add.group()

        // On ajoute les plateformes
        this.platforms.create(315, 375, 'grey')
        this.platforms.create(105, 195, 'grey')
        this.platforms.create(135, 195, 'grey')
        this.platforms.create(165, 195, 'grey')
        this.platforms.create(195, 195, 'grey')
        this.platforms.create(225, 195, 'grey')
        this.platforms.create(255, 195, 'grey')
        this.platforms.create(255, 225, 'grey')
        this.platforms.create(75, 225, 'grey')
        this.platforms.create(75, 255, 'grey')
        this.platforms.create(75, 285, 'grey')
        this.platforms.create(75, 315, 'grey')
        this.platforms.create(75, 345, 'grey')
        this.platforms.create(75, 375, 'grey')
        this.platforms.create(15, 195, 'grey')
        this.platforms.create(15, 225, 'grey')
        this.platforms.create(15, 255, 'grey')
        this.platforms.create(15, 285, 'grey')
        this.platforms.create(15, 315, 'grey')
        this.platforms.create(15, 345, 'grey')
        this.platforms.create(15, 375, 'grey')
        this.platforms.create(15, 405, 'grey')
        this.grid.changeNodes(this.platforms.getChildren())

        // Création des entités
        this.player = this.entities.create(105, 405, 'red').setInteractive();
        this.player.setCollideWorldBounds(true);

        let ennemySprite = this.entities.create(165, 135, 'black').setInteractive();
        ennemySprite.displayWidth = 29;
        ennemySprite.scaleY = ennemySprite.scaleX;
        ennemySprite.setCollideWorldBounds(true);

        this.entities.setDepth(1)

        this.graphics = this.add.graphics({ lineStyle: { width: 1, color: 0xaa00aa } });

        // Initialisation des collisions
        this.physics.add.collider(this.entities, this.platforms);
        this.physics.add.collider(this.player, ennemySprite);

        // Evenements clavier/souris
        this.cursors = this.input.keyboard.createCursorKeys();
        this.pointer = this.input.activePointer;

        // Création de la grille et du suivi
        this.ennemy = new Follower(ennemySprite, this.player);

        let grid = this.grid;
        this.input.setDraggable([this.player, ennemySprite]);
        this.player.on('drag', function(pointer, x, y) {
            this.setPosition(x, y)
        })
        ennemySprite.on('drag', function(pointer, x, y) {
            this.setPosition(x, y)
        })
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
        if (this.pointer.isDown && this.input.getDragState(this.pointer) != 4) {
            if (!this._pointerClick) {
                let weight = this.grid.getNode(this.pointer.position).weight;
                if (weight == -1) this._newPlatformWeight = 0;
                if (weight == 0) this._newPlatformWeight = -1;
            }
            this.changeNode(this.pointer.position, this._newPlatformWeight);
            this._pointerClick = true;
        }
        if (this._pointerClick && this.pointer.upTime >= this.pointer.downTime) this._pointerClick = false;

        // Pathfinding
        this.ennemy.pathfinding(this.grid, this.platforms)
        //this.ennemy.move()          

        // Affichage debug
        if (this.debug.active) {
            this.graphics.clear();
            this.ennemy.debug(this.debug, this.graphics) // Affiche la ligne de vision, le chemin, etc.

            // On trace le quadrillage
            this.graphics.lineStyle(1, 0x999999);
            if (this.debug.grid) {
                for (var x = 0; x < this.grid.grid.length; x++) {
                    for (var y = 0; y < this.grid.grid[x].length; y++) {
                        this.graphics.strokeRectShape(this.grid.grid[x][y].rect);
                    }
                }            
            }

            // On met en valeur la maille occupé par le joueur
            this.graphics.lineStyle(1, 0x00aa00);
            if (this.debug.squarePosition) {
                this.graphics.strokeRectShape(this.grid.grid[parseInt(this.player.x/30)][parseInt(this.player.y/30)].rect);          
            }
        }
    }
}

class Follower {
    constructor (sprite, target) {
        this.sprite = sprite;
        this.width  = sprite.displayWidth;
        this.target = target;
        this.path;

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
    pathfinding (grid, platforms) {
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
        if (!collide) this.path = [{position: this.target.getCenter()}];
        else { this.path = pf.AStarSearch(
                grid.nodes[`${parseInt(this.sprite.x/30)*30+15},${parseInt(this.sprite.y/30)*30+15}`],
                grid.nodes[`${parseInt(this.target.x/30)*30+15},${parseInt(this.target.y/30)*30+15}`])

            // On simplifie le chemin en supprimant ceux qui peuvent se prendre en ligne droite
            // --> Si un des deux points est en mouvement, inutile de simplifier plus loins que la première ligne droite
            this.path = this._linearizePathStatic(this.path, platforms)
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
    _linearizePath(path, platforms) {
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
    _linearizePathStatic(path, platforms) {
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

    // Met à jour la position de la mire (avec epaisseur)
    _updateMire(target, start=this.sprite) {
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
        graphics.lineStyle(1, 0xaa0000);
        if (config.path && this.path.length) {
            let debugPath = Array.from(this.path)
            debugPath.unshift({position: this.sprite})
            graphics.strokePoints(debugPath.map(function(x) {return x.position}));
        }
    }
}

/* ========================= CREATION DES CONSTANTES ======================== */
let debug = {
    active: true,
    grid: false,
    path: true,
    mireTarget: false,
    squarePosition: false
}

let config = {
    type: Phaser.AUTO,
    width: 450,
    height: 450,
    physics: {
        default: 'arcade',
    },
    scene: new Main(450, 450, debug)
}
let game = new Phaser.Game(config);