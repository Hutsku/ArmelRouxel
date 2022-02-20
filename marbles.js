import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

class Grid {
    constructor(height, width, frequence, octaves, nb_balls, max_balls=300) {
        // Taille du cadre de génération
        this.height = height;
        this.width  = width;

        // On précharge le nombre de boule max
        this.nb_balls = nb_balls;
        this.balls = [];
        for (let i=0; i<max_balls; i++) {
            this.balls[i] = {
                x: Math.floor(Math.random() * width),
                y: Math.floor(Math.random() * height),
                color: [
                    Math.floor(Math.random() * 255),
                    Math.floor(Math.random() * 255),
                    Math.floor(Math.random() * 255),
                ]
            }
        }

        // On définit les differentes maps
        this.simplex = [] // Instance du bruit
        for (let n=0; n<10; n++) {
            this.simplex[n] = new SimplexNoise();
        }
        this.frequence = frequence;
        this.octaves = octaves;

        // Paramètres inhérent à la construction des maps
        this.redistribution = 1 // Facteur de normalisation de la grille
        this.amp = 0.5 // Coeff d'amplitude de chaque octave
        this.amp_sum = (1 - this.amp**(octaves)) / (1 - this.amp) // Somme des amp (pour la normalisation)
    }

    noise(simplex, nx, ny) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        return simplex.noise2D(nx, ny) / 2 + 0.5;
    }

    update(context, t) {
        // Génère une grille par construction de bruits
        let px, py;
        let ny = t;
        for (let i=0; i<this.nb_balls; i++) {
            let ball = this.balls[i];
            px = 0;
            py = 0;
            for (let n=0; n < this.octaves; n++) {
                let coef = 2**n * this.frequence
                px += (this.amp**n) * this.noise(this.simplex[n], coef*ball.x, coef*ny);
                py += (this.amp**n) * this.noise(this.simplex[n], coef*ball.y, coef*ny);
            }   

            // On renormalise les valeurs
            px = Math.floor(Math.pow(px / this.amp_sum, this.redistribution) * this.width);
            py = Math.floor(Math.pow(py / this.amp_sum, this.redistribution) * this.height);

            // On affiche le cercle sur le canvas
            context.beginPath();
            context.arc(px, py, 5, 0, 2 * Math.PI);
            context.fillStyle = `rgb(${ball.color[0]}, ${ball.color[1]}, ${ball.color[2]}`;
            context.fill();
        }

        for (let x=0; x<this.width; x++) {
            let nx = x / this.width - 0.5
            let y = 0;
            for (let n=0; n < this.octaves; n++) {
                let coef = 2**n * this.frequence;
                y += (this.amp**n) * this.noise(this.simplex[0], coef*nx, coef*ny);
            } 
            y = Math.pow(y / this.amp_sum, this.redistribution) * 200;
            if (x==0) {
                //let value = this.noise(this.simplex[0], this.frequence*nx, this.frequence*ny);
            }
            context2.fillStyle = 'rgb(0, 0, 0, 1)'
            context2.fillRect(x, y, 1, 1);
        }
    }
}

// Ici, plus l'octave est haute plus les billes vont être recentrés et "vibreront" rapidement
// Plus la frequence est élevée, plus les billes bougeront rapidement
const grid = new Grid(400, 400, 3, 1, 100)

let canvas = document.getElementById("grey");
let canvas2 = document.getElementById("curve");
let context = canvas.getContext("2d");
let context2 = canvas2.getContext("2d");

let timer;
let speed = 5 * (10**-5) // Gère le déroulement du temps (translation dy)
function mainLoop(timeStamp){
    //timer = Date.now();
    context.fillStyle = 'rgb(255, 255, 255, 1)';
    context2.fillStyle = 'rgb(255, 255, 255, 1)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context2.fillRect(0, 0, canvas.width, canvas.height);
    grid.update(context, timeStamp*speed);
    //console.log(Date.now() - timer);

    // Keep requesting new frames
    window.requestAnimationFrame(mainLoop);
}
mainLoop()

function changeSlider(speed, freq, oct, balls) {
    // Change la valeur des slide et leur label associé
    $('#speedSlide').val(speed);
    $('#freqSlide').val(freq);
    $('#octSlide').val(oct);
    $('#ballsSlide').val(balls);
    $('#dv1').text(`(${speed})`);
    $('#dv2').text(`(${freq})`);
    $('#dv3').text(`(${oct})`);
    $('#dv4').text(`(${balls})`);
}

changeSlider(5, 5, 1, 100)
$('#speedSlide').on('input', function() {
    speed = this.value * (10**-5);
    $('#dv1').text(`(${this.value})`);
});
$('#freqSlide').on('input', function() {
    grid.frequence = this.value;
    $('#dv2').text(`(${this.value})`);
});
$('#octSlide').on('input', function() {
    grid.octaves = this.value;
    $('#dv3').text(`(${this.value})`);
    grid.amp_sum = (1 - grid.amp**(this.value)) / (1 - grid.amp)
});
$('#ballsSlide').on('input', function() {
    $('#dv4').text(`(${this.value})`);
    grid.nb_balls = this.value;
});

$('button.reset').click(function() {
    speed = 5 * (10**-5);
    grid.frequence = 3;
    grid.octaves = 1;
    changeSlider(5, 5, 1, 100)

    grid.simplex = [new SimplexNoise()];
    grid.amp_sum = 1;

    grid.nb_balls = 100;
})