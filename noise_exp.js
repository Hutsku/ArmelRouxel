import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

class Sinus {
    constructor(height, width, frequence, octaves) {
        // Taille du cadre de génération
        this.height = height;
        this.width  = width;

        // On définit les differents paramètres
        this.sin = [] // tableau de décalage aléatoire pour donner plus de valeurs aux octaves
        for (let n=0; n<octaves; n++) {
            this.sin[n] = Math.random()*100;
        }
        this.frequence = frequence;
        this.octaves = octaves;

        // Paramètres inhérent à la construction des maps
        this.redistribution = 1 // Facteur de normalisation de la grille
        this.flat = 0.7 // Coef d'amplitude global entre 0  et 1
        this.amp = 0.5 // Coeff d'amplitude de chaque octave
        this.amp_sum = (1 - this.amp**(octaves)) / (1 - this.amp) // Somme des amp (pour la normalisation)
    }    

    noise(nx) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        return (this.flat * Math.sin(nx)) / 2 + 0.5;
    }

    update(canvas) {
        // Met à jour le canvas en paramètre
        let width = canvas.width;
        let height = canvas.height;
        let context = canvas.getContext("2d");
        context.fillStyle = 'rgb(255, 255, 255, 1)';
        context.fillRect(0, 0, width, height);

        for (let x=0; x < width; x++) {
            let nx = x / width - 0.5
            let y = 0;
            for (let n=0; n < this.octaves; n++) {
                let coef = 2**n * this.frequence;
                y += (this.amp**n) * this.noise(coef*nx + this.sin[n]);
            } 
            y = (y / this.amp_sum) * (height);
            context.fillStyle = 'rgb(0, 0, 0, 1)'
            context.fillRect(x, y, 1, 1);
        }
    }
}

class Grid {
    constructor(height, width, frequence, octaves) {
        // Taille du cadre de génération
        this.height = height;
        this.width  = width;

        // On définit les differentes maps
        this.simplex = [] // Instance du bruit
        for (let n=0; n<octaves; n++) {
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

    update(canvas) {
        // Met à jour le canvas en paramètre
        let width = canvas.width;
        let height = canvas.height;
        let context = canvas.getContext("2d");
        context.fillStyle = 'rgb(255, 255, 255, 1)';
        context.fillRect(0, 0, width, height);

        let value;
        let gradiant;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {      
                let nx = x / this.width - 0.5;
                let ny = y / this.height - 0.5;

                // Pour chaque octave, on génère un bruit pondéré
                gradiant = 0;
                for (let n=0; n < this.octaves; n++) {
                    let coef = 2**n * this.frequence
                    gradiant += (this.amp**n) * this.noise(this.simplex[n], coef*nx, coef*ny);
                }

                // On renormalise le gradiant par la somme des amp -> [0, 1] et on redistribue les valeurs
                gradiant = Math.pow(gradiant / this.amp_sum, this.redistribution)

                // On trace le gradiant sur le canvas
                value = gradiant * 255;
                context.fillStyle = `rgb(${value}, ${value}, ${value})`; 
                context.fillRect(x, y, 1, 1);
            }
        }
    }
}

// Ici, plus l'octave est haute plus les billes vont être recentrés et "vibreront" rapidement
// Plus la frequence est élevée, plus les billes bougeront rapidement
const sinus1 = new Sinus(400, 150, 10, 1)
const sinus2 = new Sinus(400, 150, 10, 1)
const perlin1 = new Grid(400, 400, 1, 1)
const perlin2 = new Grid(400, 400, 3, 1)

let sin1 = document.getElementById("sin1");
let sin2 = document.getElementById("sin2");
let perl1 = document.getElementById("perl1");
let perl2 = document.getElementById("perl2");
let context = sin1.getContext("2d");
let context2 = sin2.getContext("2d");
let context3 = perl1.getContext("2d");
let context4 = perl2.getContext("2d");

sinus1.update(sin1);
sinus2.update(sin2);
for (let n=0; n<20; n++) {
    sinus2.sin[n] = Math.random()*100;
}
perlin1.update(perl1)
perlin2.update(perl2)
for (let n=0; n<20; n++) {
    perlin2.simplex[n] = new SimplexNoise();
}

// Met la position des slides par défaut
$('#ampSlide').val(50);
$('#freqSlide1').val(5);
$('#freqSlide2').val(3);
$('#freqSlide3').val(3);
$('#octSlide1').val(1);
$('#octSlide2').val(1);

$('#ampSlide').on('input', function() {
    sinus1.flat = this.value / 100;
    sinus1.update(sin1);
});
$('#freqSlide1').on('input', function() {
    sinus1.frequence = this.value;
    sinus1.update(sin1);
});
$('#freqSlide2').on('input', function() {
    perlin1.frequence = this.value;
    perlin1.update(perl1);
});
$('#freqSlide3').on('input', function() {
    perlin2.frequence = this.value;
    perlin2.update(perl2);
});
$('#octSlide1').on('input', function() {
    sinus2.octaves = this.value;
    $('#o1').text(`(${this.value})`);
    sinus2.amp_sum = (1 - sinus2.amp**(this.value)) / (1 - sinus2.amp)
    sinus2.update(sin2);
});
$('#octSlide2').on('input', function() {
    perlin2.octaves = this.value;
    $('#o2').text(`(${this.value})`);
    perlin2.amp_sum = (1 - perlin2.amp**(this.value)) / (1 - perlin2.amp)
    perlin2.update(perl2);
});