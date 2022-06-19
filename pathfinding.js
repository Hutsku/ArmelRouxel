// Création d'un quadrillage de points
class SquareGrid {
    constructor (width, height, size=30) {
        this.walls = [
            new Phaser.Geom.Point(315, 375),
            new Phaser.Geom.Point(105, 195),
            new Phaser.Geom.Point(135, 195),
            new Phaser.Geom.Point(165, 195),
            new Phaser.Geom.Point(195, 195),
            new Phaser.Geom.Point(225, 195),
            new Phaser.Geom.Point(255, 195),
            new Phaser.Geom.Point(75, 225),
            new Phaser.Geom.Point(255, 225)

        ];
        this.width = parseInt(width / size);
        this.height = parseInt(height / size);
        this.size = size;

        this.grid = this._buildGrid();
    }

    _buildGrid () {
        // Construction de la grille et des points
        let grid = []
        for (let x=0; x<this.width; x++) {
            grid[x] = []
            for (let y=0; y<this.height; y++) {
                let rect = new Phaser.Geom.Rectangle(x*this.size, y*this.size, this.size, this.size);
                let cost = 1;
                for (let point of this.walls) {
                    if (Phaser.Geom.Rectangle.ContainsPoint(rect, point)) {
                        cost = -1;
                        break;
                    }
                }

                grid[x].push({
                    id: `${x}${y}`,
                    rect: rect,
                    node: Phaser.Geom.Rectangle.GetCenter(rect),
                    cost: cost
                });
            }
        }    
        return grid 
    }

    neighbors (node) {
        let x = parseInt(node.x/this.size);
        let y = parseInt(node.y/this.size);
        let result = []
        if (x > 0) {
            result.push(this.grid[x-1][y])
            //if (y > 0) result.push(this.grid[x-1][y-1])
            //if (y < this.height-1) result.push(this.grid[x-1][y+1])
        }
        if (x < this.width-1) {
            //if (y > 0) result.push(this.grid[x+1][y-1])
            //if (y < this.height-1) result.push(this.grid[x+1][y+1])
            result.push(this.grid[x+1][y])
        }
        if (y > 0) result.push(this.grid[x][y-1])
        if (y < this.width-1) result.push(this.grid[x][y+1])

        //if ((x + y) % 2 == 0) result.reverse()

        return result
    }
}

// PriorityQueue class
class PriorityQueue {

    // An array is used to implement priority
    constructor() {
        this.items = [];
    }

    // enqueue function to add element to the queue as per priority
    enqueue(element, priority) {
        // creating object from queue element
        var contain = false;

        // iterating through the entire item array to add element at the correct location of the Queue
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i][1] > priority) {
                // Once the correct location is found it is enqueued
                this.items.splice(i, 0, [element, priority]);
                contain = true;
                break;
            }
        }

        // if the element have the highest priority it is added at the end of the queue
        if (!contain) this.items.push([element, priority]);
    }

    // dequeue method to remove element from the queue
    dequeue() {
        // return the dequeued element and remove it. if the queue is empty returns Underflow
        if (this.isEmpty()) return "Underflow";
        return this.items.shift()[0];
    }

    // front function
    front() {
        // returns the highest priority element in the Priority queue without removing it.
        if (this.isEmpty()) return "No elements in Queue";
        return this.items[0][0];
    }

    // rear function
    rear() {
        // returns the lowest priority element of the queue
        if (this.isEmpty()) return "No elements in Queue";
        return this.items[this.items.length - 1][0];
    }

    // isEmpty function
    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }
}

// Fonction heuristique qui renvoit simplement la distance entre 2 points
function heuristic(a, b) {
    // Renvoit l'interpolation (par défaut la distance propre) des deux points
    return Math.sqrt(((a.x - b.x)/30)**2 + ((a.y - b.y)/30)**2)
    // Manhattan distance on a square grid
    //return Math.abs(a.x - b.x)/30 + Math.abs(a.y - b.y)/30
}

// Méthode de recherche A*
function AStarSearch(grid, start, goal) {
    let startId = `${parseInt(start.x/30)}${parseInt(start.y/30)}`;
    let queue = new PriorityQueue();
    queue.enqueue({id: startId, node: start, path: []}, 0)
    let cost_total= {}
    cost_total[startId] = 0
    
    let iter = 0;
    while (!queue.isEmpty() && iter <= 500) {
        let current = queue.dequeue();
        current.path.push(current.node);

        // Si le point est l'objectif alors on renvoit le chemin
        if (Phaser.Geom.Point.Equals(current.node, goal)) {
            return current.path;
        }

        for (let tile of grid.neighbors(current.node)) {
            let node = tile.node;
            let cost = tile.cost + cost_total[current.id];
            if ((cost_total[tile.id] == undefined || cost < cost_total[tile.id]) && tile.cost >= 0) {
                let priority = cost + heuristic(goal, tile.node)
                queue.enqueue({id: tile.id, node: tile.node, path: Array.from(current.path)}, priority);
                cost_total[tile.id] = cost;
            }
        }
        iter += 1
    }
}

// Méthode de recherche Dijkstra
function DijkstraSearch(grid, start, goal) {
    let startId = `${parseInt(start.x/30)}${parseInt(start.y/30)}`;
    let queue = new PriorityQueue();
    queue.enqueue({id: startId, node: start, path: []}, 0)
    let cost_total= {}
    cost_total[startId] = 0
    
    let iter = 0;
    while (!queue.isEmpty() && iter <= 500) {
        let current = queue.dequeue();
        current.path.push(current.node);

        // Si le point est l'objectif alors on renvoit le chemin
        if (Phaser.Geom.Point.Equals(current.node, goal)) {
            return current.path;
        }

        for (let tile of grid.neighbors(current.node)) {
            let node = tile.node;
            // Coup par défaut du point * coup selon la distance au point voisin + coup selon la distance à l'objectif
            let cost = tile.cost + cost_total[current.id] //+ heuristic(goal, node);
            if ((cost_total[tile.id] == undefined || cost < cost_total[tile.id]) && tile.cost >= 0) {
                queue.enqueue({id: tile.id, node: tile.node, path: Array.from(current.path)}, cost);
                cost_total[tile.id] = cost;
            }
        }
        iter += 1
    }
}

// Méthode de recherche Breadth-first 
function BreadthFirstSearch(grid, start, goal) {
    let startId = `${parseInt(start.x/30)}${parseInt(start.y/30)}`;
    let queue = [{id: startId, node: start, path: []}];
    let passedNodes = [startId];
    
    let iter = 0;
    while (queue.length && iter <= 500) {
        let current = queue.shift();
        current.path.push(current.node);

        // Si le point est l'objectif alors on renvoit le chemin
        if (Phaser.Geom.Point.Equals(current.node, goal)) {
            return current.path;
        }

        for (let tile of grid.neighbors(current.node)) {
            let node = tile.node;
            if (!passedNodes.includes(tile.id) && tile.cost >= 0) {
                queue.push({id: tile.id, node: tile.node, path: Array.from(current.path)});
                passedNodes.push(tile.id);
            }
        }
        iter += 1
    }
}

export {SquareGrid, BreadthFirstSearch, DijkstraSearch, AStarSearch};
