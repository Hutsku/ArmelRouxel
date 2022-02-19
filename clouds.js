import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

const TAU = 2 * Math.PI;

class Grid {
    constructor(height, width, frequence=1, octaves=5, size=10) {
        // Taille du cadre de génération
        this.height = height;
        this.width  = width;
        this.size   = size;

        // On définit les differentes maps
        this.simplex = [] // Instance du bruit
        for (let n=0; n<octaves; n++) {
            this.simplex[n] = new SimplexNoise();
        }
        this.frequence = frequence;
        this.octaves = octaves;
        this.continuous = false

        // Paramètres inhérent à la construction des maps
        this.redistribution = 1.5 // Facteur de normalisation de la grille
        this.amp = 0.5 // Coeff d'amplitude de chaque octave
        this.amp_sum = (1 - this.amp**(octaves)) / (1 - this.amp) // Somme des amp (pour la normalisation)
    }

    noise(simplex, nx, ny, nz, coef) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        if (!this.continuous) return simplex.noise3D(coef*nx, coef*ny, coef*nz) / 2 + 0.5;
        return simplex.noise4D(coef*Math.cos(TAU * nx) / TAU, coef*Math.sin(TAU * nx) / TAU, coef*ny, coef*nz) / 2 + 0.5;
    }

    update(context, t) {
        // Génère une grille par construction de bruits
        let value;
        let gradiant;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {      
                let nx = x / this.width - 0.5;
                let ny = y / this.height - 0.5;
                let nz = t;

                // Pour chaque octave, on génère un bruit pondéré
                gradiant = 0;
                for (let n=0; n < this.octaves; n++) {
                    let coef = 2**n * this.frequence
                    gradiant += (this.amp**n) * this.noise(this.simplex[n], nx, ny, nz, coef);
                }

                // On renormalise le gradiant par la somme des amp -> [0, 1] et on redistribue les valeurs
                gradiant = Math.pow(gradiant / this.amp_sum, this.redistribution)

                // On trace le gradiant sur le canvas
                if (gradiant <= 0) context.fillStyle = 'lightblue';
                else {
                   value = gradiant * 255;
                    context.fillStyle = `hsl(${value}, 50%, 50%)`;
                    //context.fillStyle = `rgb(${value}, ${value}, ${value})`; 
                }
                context.fillRect(x*this.size, y*this.size, this.size, this.size);
            }
        }

        for (let x=0; x<canvas2.width; x++) {
            let nx = x / canvas2.width - 0.5
            let y = 0;
            for (let n=0; n < this.octaves; n++) {
                let coef = 2**n * this.frequence;
                y += (this.amp**n) * (this.simplex[0].noise2D(coef*nx, coef*t) / 2 + 0.5)
            } 
            y = Math.pow(y / this.amp_sum, this.redistribution) * 200;
            if (x==0) {
                //let value = this.noise(this.simplex[0], this.frequence*nx, this.frequence*ny);
            }
            context2.fillStyle = 'rgb(0, 0, 0, 1)';
            context2.fillRect(x, y, 1, 1);
        }
    }
}

let canvas = document.getElementById("grey");
let context = canvas.getContext("2d");
let canvas2 = document.getElementById("curve");
let context2 = canvas2.getContext("2d");

let size = 3;
const grid = new Grid(canvas.width/size, canvas.height/size, 1, 5, size=size)

let timer;
let speed = 10 * (10**-5) // Gère le déroulement du temps (translation dy)
function mainLoop(timeStamp){
    //timer = Date.now();
    context2.fillStyle = 'rgb(255, 255, 255, 1)';
    context2.fillRect(0, 0, canvas2.width, canvas2.height);
    grid.update(context, timeStamp*speed);
    //console.log(Date.now() - timer);

    // Keep requesting new frames
    window.requestAnimationFrame(mainLoop);
}
mainLoop()

function changeSlider(res, speed, freq, oct) {
    // Change la valeur des slide et leur label associé
    $('#freqSlide').val(freq);
    $('#octSlide').val(oct);
    $('#resSlide').val(res);
    $('#speedSlide').val(speed);
    $('#dv1').text(`(${res})`);
    $('#dv2').text(`(${freq})`);
    $('#dv3').text(`(${oct})`);
    $('#dv0').text(`(${speed})`);
}

$('#resSlide').on('input', function() {
    grid.size = this.value;
    grid.width = canvas.width/this.value;
    grid.height = canvas.height/this.value;
    $('#dv1').text(`(${this.value})`);
});
$('#speedSlide').on('input', function() {
    speed = this.value * (10**-5);
    $('#dv0').text(`(${this.value})`);
});
$('#freqSlide').on('input', function() {
    grid.frequence = this.value;
    $('#dv2').text(`(${this.value})`);
});
$('#octSlide').on('input', function() {
    grid.octaves = this.value;
    $('#dv3').text(`(${this.value})`);
    for (let n=0; n<this.value; n++) {
        grid.simplex[n] = new SimplexNoise();
    }
    grid.amp_sum = (1 - grid.amp**(this.value)) / (1 - grid.amp)
});
$('#distSlide').on('input', function() {
    grid.redistribution = this.value;
    $('#dv4').text(`(${this.value})`);
});
$('#continuous').on('input', function() {
    grid.continuous = $('#continuous').prop('checked')
});

$('button.reset').click(function() {
    speed = 10 * (10**-5);
    grid.frequence = 1;
    grid.octaves = 5;
    grid.size = 3;
    grid.width = canvas.width/3;
    grid.height = canvas.height/3;
    grid.continuous = false;

    $('#continuous').prop('checked', false)
    changeSlider(3, 10, 1, 5);

    for (let n=0; n<octaves; n++) {
        grid.simplex[n] = new SimplexNoise();
    }
    grid.amp_sum = (1 - grid.amp**(grid.octaves)) / (1 - grid.amp);
})