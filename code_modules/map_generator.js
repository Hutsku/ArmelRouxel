
import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';
//import * as PoissonDiskSampling from '/scripts/poisson-disk-sampling/src/poisson-disk-sampling.js'
//import PM_PRNG from '/scripts/prng-parkmiller-js/pm_prng.js';

const TAU = 2 * Math.PI;

class Grid {
    constructor(height, width) {
        // Taille du cadre de génération
        this.height = height;
        this.width  = width;

        // On définit les differentes maps
        this.elevation = [];
        this.moisture = [];
        this.trees = [];

        // Paramètres inhérent à la construction des maps
        this.redistribution = 1  // Facteur de normalisation de la grille
        this.amp = 0.5 // Coeff d'amplitude de chaque octave

        this.island = false; // Monte le milieu de la carte et abaisse les bords
        this.grand_lac = false; // Monte les bords et abaisse le milieu
        this.archipelagos = false; // Créer de mutliples bandes de terre pas très hautes
        this.landmass = false; // Génère des grosses masses continentales

        this.allow_trees = true;
        this.continuous = true;
        this.temperature = false;
        this.surround_sea = false; // Submerge les bordes de la carte
        this.surround_land = false; // Elève les bords de la carte
        this.terraces = false; // Arrondis les valeurs des gradiant au niveau superieur
        this.terrace_lvl = 10;

        // Définition des niveaux de couleurs (relief)
        this.ICE = [213, 232, 236]
        this.DEEP_OCEAN = [56, 56, 97]
        this.OCEAN = [68, 68, 122]
        this.BEACH = [157, 142, 119]
        this.SWAMP = [67, 86, 75]
        this.DESERT = [205, 196, 126]
        this.GRASSLAND = [109, 136, 68]
        this.FOREST = [103, 148, 89]
        this.ROCK_FIELD = [156, 156, 156]
        this.HILLS_GRASSLAND = [95, 119, 60]
        this.HILLS_FOREST = [77, 112, 67]
        this.MOUNTAIN = [153, 153, 153]
        this.SNOW = [221, 221, 228]
    }

    generate_map(frequence = 4, octaves = 8, redistribution = 1) {
        /*if (this.archipelagos) {
            this.redistribution = 1.7;
            this.elevation = this.generate_map(4, 8, this.island, this.grand_lac);
        }
        else if (this.landmass) {
            this.redistribution = 1.5;
            this.elevation = this.generate_map(2, 8, this.island, this.grand_lac);
        }
        else {
            this.elevation = this.generate_map(4, 8, this.island, this.grand_lac);
        }*/
        
        this.redistribution = redistribution;
        this.elevation = this.get_noise_grid(frequence, octaves, true);
        this.moisture  = this.get_noise_grid(frequence/2, octaves/2)
        if (this.allow_trees) this.trees = this.generate_trees(50)
        console.log('map created')
    }

    noise(simplex, nx, ny) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        return simplex.noise2D(nx, ny) / 2 + 0.5;
    }

    continuous_noise(simplex, nx, ny, coef) {
        /* In "noise parameter space", we need nx and ny to travel the
           same distance. The circle created from nx needs to have
           circumference=1 to match the length=1 line created from ny,
           which means the circle's radius is 1/2π, or 1/tau */
        return simplex.noise3D(coef*Math.cos(TAU * nx) / TAU, coef*Math.sin(TAU * nx) / TAU, coef*ny) / 2 + 0.5;
    }

    get_noise_grid(frequence, octaves, effect = false) {
        // Génère une grille par construction de bruits
        let gradiant;
        let amp_sum = (1 - this.amp**(octaves)) / (1 - this.amp) // Somme des amp (pour la normalisation)

        // On génère les instances de bruit (une differente par octave pour eviter les artefactes)
        let simplex = []
        for (let n=0; n<octaves; n++) {
            simplex[n] = new SimplexNoise();
        }

        let grid = []
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {      
                let nx = x / this.width - 0.5;
                let ny = y / this.height - 0.5;
                let d = 2 * Math.max(Math.abs(nx), Math.abs(ny))

                // Pour chaque octave, on génère un bruit pondéré
                gradiant = 0;
                for (let n=0; n < octaves; n++) {
                    let coef = 2**n * frequence
                    if (this.continuous) gradiant += (this.amp**n) * this.continuous_noise(simplex[n], nx, ny, coef);
                    else gradiant += (this.amp**n) * this.noise(simplex[n], coef * nx, coef * ny);
                }

                // On renormalise le gradiant par la somme des amp -> [0, 1] et on redistribue les valeurs
                gradiant = Math.pow(gradiant / amp_sum, this.redistribution)

                // Post-traitement pour differents schémas de map (effect = false pour l'humidité par exemple)
                if (effect) {
                    if (this.island) gradiant = (1 + gradiant - d) / 2;
                    if (this.grand_lac) gradiant = (1 + d - gradiant) / 2;
                    if (this.surround_sea) {
                        if (d >= 0.7) {
                            gradiant *= (1/(1 - 0.7)) * (0.7 - d) + 1;
                        }
                    }
                    if (this.surround_land) {
                        if (d >= 0.7) {
                            // Algo vaseux
                            gradiant = (2*gradiant + (1/(1 - 0.7)) * (d - 0.7))/2
                            if (gradiant > 1) gradiant = 1;
                        }
                    }
                    if (this.terraces) gradiant = Math.round(gradiant * this.terrace_lvl) / this.terrace_lvl;                    
                }

                grid[y][x] = gradiant;
            }
        }

        return grid;
    }

    generate_trees(frequence) {
        // Plutôt que d'utiliser un bruit à haute fréquence, on utilise des disque de Poisson

        // La densité de génération des arbres est corrélés à l'humidité de la map
        let callback_moisture = this.moisture;
        let callback_elevation = this.elevation;
        var grad = new PoissonDiskSampling({
            shape: [this.height, this.width],
            minDistance: 1,
            maxDistance: 30,
            tries: 20,
            distanceFunction: function (p) {
                let x = Math.round(p[0]), y = Math.round(p[1]);
                let coeff = 1 - callback_elevation[y][x]**3; // On prend en compte l'altitude
                return Math.pow(1 - coeff*callback_moisture[y][x], 4); // value between 0 and 1
            }
        });

        return grad.fill()
    }

    biome(e, m, t) {
        // Renvoit la bonne couleur selon le niveau d'élevation et l'humidité
        let ice_tresh = 0.4;
        if (t > ice_tresh && this.temperature) return this.SNOW;
        if (e < 0.3) {
            return this.DEEP_OCEAN;
        }
        if (e < 0.4) {
            if (t > ice_tresh) return this.ICE;
            return this.OCEAN;
        }

        if (e < 0.45) {
            if (m < 0.5) return this.BEACH;
            return this.SWAMP;
        }

        if (e < 0.6) {
            if (m < 0.4) return this.DESERT;
            if (m < 0.66) return this.GRASSLAND;
            return this.GRASSLAND;
        }
        if (e < 0.7) {
            if (m < 0.33) return this.ROCK_FIELD;
            if (m < 0.66) return this.HILLS_GRASSLAND;
            return this.HILLS_GRASSLAND;
        }

        if (e < 0.77) return this.MOUNTAIN;
        if (e <= 1) return this.SNOW;
    }

    draw(context) {
        // Affiche la map sur le canvas
        let value;
        let temp;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let ny = y / this.height
                temp =  Math.cos(Math.PI*ny)**2 * this.elevation[y][x];
                value = this.biome(this.elevation[y][x], this.moisture[y][x], temp);
                context.fillStyle = `rgba(${value[0]}, ${value[1]}, ${value[2]})`;
                context.fillRect(x, y, 1, 1);
            }
        }

        // On affiche ensuite les arbres selon leurs biomes
        let biome_tree = [this.FOREST, this.HILLS_FOREST, this.GRASSLAND, this.HILLS_GRASSLAND, this.SWAMP, this.MOUNTAIN];
        for (let tree of this.trees) {
            let x = Math.round(tree[0]), y = Math.round(tree[1]);

            // On filtre les zones inadaptés à la formation d'arbre
            if (biome_tree.includes(this.biome(this.elevation[y][x], this.moisture[y][x]))) {
                context.fillStyle = 'rgb(66, 96, 57)';
                    context.fillRect(x, y, 1, 1); 
            } 
        }
    }

    draw_greyscale(context) {
        // Affiche la map sur le canvas
        let value;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                value = this.elevation[y][x] * 255
                context.fillStyle = `rgba(${value}, ${value}, ${value})`;
                    context.fillRect(x, y, 1, 1); 
            }
        }
    }

    draw_trees(context) {
        // Affiche les arbres sur le canvas
        context.fillStyle = 'black';
        context.fillRect(0, 0, this.height, this.width);

        for (let tree of this.trees) {
            context.fillStyle = 'white';
            context.fillRect(tree[0], tree[1], 1, 1);
        }
    }
}

// On met par défaut les valeurs des input
$('#preset').val('normal')
$('input[name="mapType"]#normal').prop('checked', true);
$('input[type="checkbox"]').prop('checked', false)
$('input[type="checkbox"]#trees').prop('checked', true)
changeSlider(4, 8, 1);

// On génère la map par défaut
const grid = new Grid(400, 400)
let canvas1 = document.getElementById("color");
let canvas2 = document.getElementById("grey");
let context1 = canvas1.getContext("2d");
let context2 = canvas2.getContext("2d");

$('.loader-container').removeClass('d-none');
$(window).ready(function(){
    grid.generate_map();
    grid.draw(context1)
    grid.draw_greyscale(context2)
    $('.loader-container').addClass('d-none');
});

/* ========================== EVENEMENT INPUT ============================ */

function changeSlider(freq, oct, dist) {
    // Change la valeur des slide et leur label associé
    $('#freqSlide').val(freq);
    $('#octSlide').val(oct);
    $('#distSlide').val(dist);
    $('#dv1').text(`(${freq})`);
    $('#dv2').text(`(${oct})`);
    $('#dv3').text(`(${dist})`);
}

$('#freqSlide').on('input', function() {
    $('#dv1').text(`(${this.value})`);
});
$('#octSlide').on('input', function() {
    $('#dv2').text(`(${this.value})`);
});
$('#distSlide').on('input', function() {
    grid.redistribution = this.value;
    $('#dv3').text(`(${this.value})`);
});

$('#preset').on('input', function() {
    grid.island = false;
    grid.grand_lac = true;
    $('input[name="mapType"]#normal').prop('checked', true);
    $('input[type="checkbox"]').prop('checked', false)
    $('input[type="checkbox"]#trees').prop('checked', true)
    switch (this.value) {
        case 'normal':
            changeSlider(4, 8, 1);
            break;
        case 'archipelagos':
            changeSlider(4, 8, 1.7);
            break;
        case 'landmass':
            changeSlider(2, 8, 1.5);
            break;
    }
});

$('button.generate').click(function() {
    let frequence = parseInt($('#freqSlide').val());
    let octaves = parseInt($('#octSlide').val());
    let redistribution = $('#distSlide').val();

    grid.allow_trees = parseInt($('#trees:checked').val());
    grid.continuous = parseInt($('#continuous:checked').val());
    grid.temperature = parseInt($('#temp:checked').val());

    let mapType = $('input[name="mapType"]:checked').val();
    grid.island = grid.grand_lac = grid.surround_sea = grid.surround_land = false;
    if (mapType == 'island') grid.island = true;
    if (mapType == 'grand_lac') grid.grand_lac = true;
    if (mapType == 'surround_sea') grid.surround_sea = true;
    if (mapType == 'surround_land') grid.surround_land = true;

    $('.loader-container').removeClass('d-none');
    grid.generate_map(frequence, octaves, redistribution);
    grid.draw(context1);
    grid.draw_greyscale(context2);
    $('.loader-container').addClass('d-none');
})

