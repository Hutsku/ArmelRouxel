// Calcul l'égalité de position de deux points
function equalPoints (a, b) {
    return (a.x.toFixed() == b.x.toFixed() && a.y.toFixed() == b.y.toFixed())
}

// Fonction heuristique qui renvoit simplement la distance entre 2 points
function heuristic(a, b) {
    // Renvoit l'interpolation (par défaut la distance propre) des deux points
    return Math.sqrt(((a.x - b.x)/30)**2 + ((a.y - b.y)/30)**2)
    // Manhattan distance on a square grid
    //return Math.abs(a.x - b.x)/30 + Math.abs(a.y - b.y)/30
}

/* =============================== Classes de Pathfinding ================================= */

// Création d'un quadrillage avec le système de connection de noeud
class SquareGrid {
    constructor (width, height, size=30) {
        this.width = parseInt(width / size);
        this.height = parseInt(height / size);
        this.size = size;

        this.nodes = this._buildNodes();
        this.grid = this._buildGrid();
    }

    // Renvoit le noeud le plus proche correspondant à la position donnée
    getNode (position) {
        let posX = parseInt(position.x/this.size)*this.size + this.size/2;
        let posY = parseInt(position.y/this.size)*this.size + this.size/2;
        return this.nodes[`${posX},${posY}`]
    }

    // Renvoit la position du noeud correspondant à la position donnée
    getNodePosition(position) {
        let posX = parseInt(position.x/this.size)*this.size + this.size/2;
        let posY = parseInt(position.y/this.size)*this.size + this.size/2;
        return {x: posX, y: posY}
    }

    // Change le poid des noeuds correspondant au tableau de gameobject donné
    changeNodes(array, weight=-1) {
        for (let sprite of array) {
            this.nodes[`${sprite.x},${sprite.y}`].weight = weight;
        }
    }

    _buildNodes () {
        // Création des noeuds du quadrillage (sans inter-connection)
        let nodes = {}
        for (let x=0; x<this.width; x++) {
            for (let y=0; y<this.height; y++) {
                let posX = x*this.size+this.size/2;
                let posY = y*this.size+this.size/2;
                nodes[`${posX},${posY}`] = new Node(posX, posY, 1);
            }
        }       

        // Création des connection sur un schéma quadrillé
        for (let x=0; x<this.width; x++) {
            for (let y=0; y<this.height; y++) {
                let posX = x*this.size+this.size/2;
                let posY = y*this.size+this.size/2;
                if (x > 0) nodes[`${posX},${posY}`].addNeighbor(nodes[`${posX-this.size},${posY}`])
                if (x < this.width-1) nodes[`${posX},${posY}`].addNeighbor(nodes[`${posX+this.size},${posY}`])
                if (y > 0) nodes[`${posX},${posY}`].addNeighbor(nodes[`${posX},${posY-this.size}`])
                if (y < this.width-1) nodes[`${posX},${posY}`].addNeighbor(nodes[`${posX},${posY+this.size}`])
            }
        }   
        return nodes  
    }

    _buildGrid () {
        // Création du maillage (fusion polygone + noeuds)
        let grid = []
        for (let x=0; x<this.width; x++) {
            grid[x] = []
            for (let y=0; y<this.height; y++) {
                let rect = new Phaser.Geom.Rectangle(x*this.size, y*this.size, this.size, this.size);
                let posX = x*this.size+this.size/2;
                let posY = y*this.size+this.size/2;

                grid[x].push({
                    rect: rect,
                    node: this.nodes[`${posX},${posY}`]
                });
            }
        }    
        return grid 
    }
}

// Objet Noeud qui regroupe toutes les propriétés propres au noeud ainsi que ses connections
class Node {
    constructor (x, y, weight=0, neighbors=[]) {
        this.id        = `${x},${y}`;
        this.position  = new Phaser.Geom.Point(x, y); // Dans l'optique d'un maillage spacial
        this.weight    = weight;    // -1 pour un obstacle infranchissable, sinon de 0 à +00
        this.neighbors = neighbors; // Liste des autres noeuds connectés à ce noeud
    }

    // On ajoute le noeud connecté à ce noeud
    addNeighbor (node) {
        if (!this.neighbors.includes(node)) this.neighbors.push(node)
    }

    // On ajoute des noeuds connectés à ce noeud
    addNeighbors (nodes) {
        for (node of nodes) {
            if (!this.neighbors.includes(node)) this.neighbors.push(node)
        }
    }
}

// PriorityQueue class
class PriorityQueue {

    // An array is used to implement priority
    constructor() {
        this.items = [];
    }

    // enqueue function to add element to the queue as per priority
    // element -> {**, priority: x}
    enqueue(element) {
        // creating object from queue element
        let contain = false;

        // iterating through the entire item array to add element at the correct location of the Queue
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > element.priority) {
                // Once the correct location is found it is enqueued
                this.items.splice(i, 0, element);
                contain = true;
                break;
            }
        }

        // if the element have the highest priority it is added at the end of the queue
        if (!contain) this.items.push(element);
    }

    // dequeue method to remove element from the queue
    dequeue() {
        // return the dequeued element and remove it. if the queue is empty returns Underflow
        if (this.isEmpty()) return "Underflow";
        return this.items.shift();
    }

    // front function
    front() {
        // returns the highest priority element in the Priority queue without removing it.
        if (this.isEmpty()) return "No elements in Queue";
        return this.items[0];
    }

    // rear function
    rear() {
        // returns the lowest priority element of the queue
        if (this.isEmpty()) return "No elements in Queue";
        return this.items[this.items.length - 1];
    }

    // isEmpty function
    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }

    // Renvoit un tableau contenant les éléments de la queue, sans ordre de priorité
    intoArray() {
        return this.items;
    }
}

// Méthode de recherche A*
function AStarSearch(start, goal, isGradual, stepLimit=-1) {
    if (!start || !goal) return {queue: [], path: []};
    
    // On initialise la queue avec le point de départ
    let queue = new PriorityQueue();
    queue.enqueue({node: start, path: [], priority: 0});
    let cost_total = {[start.id]: 0};
    
    // On va parcourir tous les points voisins pour y trouver le chemin le plus court
    let iter = 0;
    while (!queue.isEmpty() && iter <= 500) {
        let current = queue.dequeue(); // On commence par le chemin le plus court
        current.path.push(current.node); // On y ajoute le point actuel

        // Si le point est l'objectif alors on renvoit le chemin
        if (current.node == goal) return {queue: queue.intoArray(), path: current.path};

        // On parcours tous les points voisins
        for (let node of current.node.neighbors) {
            if (!node) continue;
            let cost = node.weight + cost_total[current.node.id];
            if ((cost_total[node.id] == undefined || cost < cost_total[node.id]) && node.weight >= 0) {
                queue.enqueue({
                    node: node, 
                    path: Array.from(current.path), 
                    priority: cost + heuristic(goal.position, node.position) // L'heuristic prend en compte la distance spaciale
                });
                cost_total[node.id] = cost;
            }
        }

        // Arrête les itération si on dépasse la limite du pas
        if (isGradual && (iter >= stepLimit) && stepLimit != -1) return {queue: queue.intoArray(), path: []};
        iter++;
    }
    return {queue: [], path: []};
}

// Méthode de recherche Greedy Best-First
function GreedyBestFirstSearch(start, goal, isGradual, stepLimit=-1) {
    if (!start || !goal) return {queue: [], path: []};
    
    // On initialise la queue avec le point de départ
    let queue = new PriorityQueue();
    queue.enqueue({node: start, path: [], priority: 0});
    let cost_total = {[start.id]: 0};
    
    // On va parcourir tous les points voisins pour y trouver le chemin le plus court
    let iter = 0;
    while (!queue.isEmpty() && iter <= 500) {
        let current = queue.dequeue(); // On commence par le chemin le plus court
        current.path.push(current.node); // On y ajoute le point actuel

        // Si le point est l'objectif alors on renvoit le chemin
        if (current.node == goal) return {queue: queue.intoArray(), path: current.path};

        // On parcours tous les points voisins
        for (let node of current.node.neighbors) {
            if (!node) continue;
            let cost = node.weight + cost_total[current.node.id];
            if ((cost_total[node.id] == undefined || cost < cost_total[node.id]) && node.weight >= 0) {
                queue.enqueue({
                    node: node, 
                    path: Array.from(current.path), 
                    priority: heuristic(goal.position, node.position) // L'heuristic prend en compte la distance spaciale
                });
                cost_total[node.id] = cost;
            }
        }

        // Arrête les itération si on dépasse la limite du pas
        if (isGradual && (iter >= stepLimit) && stepLimit != -1) return {queue: queue.intoArray(), path: []};
        iter++;
    }
    return {queue: [], path: []};
}

// Méthode de recherche Dijkstra
function DijkstraSearch(start, goal, isGradual, stepLimit=-1) {
    if (!start || !goal) return {queue: [], path: []};

    // On initialise la queue avec le point de départ
    let queue = new PriorityQueue();
    queue.enqueue({node: start, path: [], priority: 0});
    let cost_total = {[start.id]: 0};
    
    // On va parcourir tous les points voisins pour y trouver le chemin le plus court
    let iter = 0;
    while (!queue.isEmpty() && iter <= 500) {
        let current = queue.dequeue(); // On commence par le chemin le plus court
        current.path.push(current.node); // On y ajoute le point actuel

        // Si le point est l'objectif alors on renvoit le chemin
        if (current.node == goal) return {queue: queue.intoArray(), path: current.path};

        // On parcours tous les points voisins
        for (let node of current.node.neighbors) {
            if (!node) continue;
            let cost = node.weight + cost_total[current.node.id];
            if ((cost_total[node.id] == undefined || cost < cost_total[node.id]) && node.weight >= 0) {
                queue.enqueue({
                    node: node, 
                    path: Array.from(current.path), 
                    priority: cost
                });
                cost_total[node.id] = cost;
            }
        }

        // Arrête les itération si on dépasse la limite du pas
        if (isGradual && (iter >= stepLimit) && stepLimit != -1) return {queue: queue.intoArray(), path: []};
        iter++;
    }
    return {queue: [], path: []};
}

// Méthode de recherche Breadth-first 
function BreadthFirstSearch(start, goal, isGradual, stepLimit=-1) {
    if (!start || !goal) return {queue: [], path: []};

    // On initalise un simple tableau d'attente
    let queue = [{node: start, path: []}];
    let passedNodes = [start.id]; // Historique de passage pour eviter de retourner en arrière
    
    let iter = 0;
    while (queue.length && iter <= 500) {
        let current = queue.shift();
        current.path.push(current.node);

        // Si le point est l'objectif alors on renvoit le chemin
        if (current.node == goal) return {queue: queue, path: current.path};

        // On parcours tous les points voisins
        for (let node of current.node.neighbors) {
            if (!node) continue;
            if (!passedNodes.includes(node.id) && node.weight >= 0) {
                // On ajoute le noeud à la liste des chemins
                queue.push({node: node, path: Array.from(current.path)});
                passedNodes.push(node.id);
            }
        }

        // Arrête les itération si on dépasse la limite du pas
        if (isGradual && (iter >= stepLimit) && stepLimit != -1) return {queue: queue, path: []};
        iter++;
    }
    return {queue: [], path: []};
}

export {SquareGrid, BreadthFirstSearch, DijkstraSearch, GreedyBestFirstSearch, AStarSearch};
