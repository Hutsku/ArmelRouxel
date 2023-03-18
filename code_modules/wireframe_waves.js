import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

// Création des constantes
const worldWidth = 100, worldDepth = 100;

// On créer un la scène, camera et objet de rendu
const scene = new THREE.Scene();
scene.background = new THREE.Color('white');
scene.fog = new THREE.FogExp2( 'white', 0.002 );


// On paramètre le rendu selon la taille du canvas
let canvas = document.getElementById('3D');
$(canvas).css({'width': '100%', 'height': '400px'});
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas
});
renderer.setPixelRatio(canvas.devicePixelRatio);
renderer.setSize($(canvas).width(), $(canvas).height());

// On paramètre les cameras et leur ratio
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const controls = new OrbitControls( camera, renderer.domElement );
//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 20, 400);
//camera.rotation.x = -Math.PI / 3;
//controls.update();

class NoiseGenerator {
    constructor(frequence=1, octaves=5) {
        // On définit les differentes maps
        this.simplex = [] // Instance du bruit
        for (let n=0; n<20; n++) {
            this.simplex[n] = new SimplexNoise();
        }
        this.frequence = frequence;
        this.octaves = octaves;

        // Paramètres inhérent à la construction des maps
        this.redistribution = 1 // Facteur de normalisation de la grille
        this.amp = 0.5 // Coeff d'amplitude de chaque octave
        this.amp_sum = (1 - this.amp**(octaves)) / (1 - this.amp) // Somme des amp (pour la normalisation)
    }

    noise(simplex, nx, ny, nz, coef) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        return simplex.noise3D(coef*nx, coef*ny, coef*nz) / 2 + 0.5;
    }

    getArray(width, height, t) {
        // Génère une grille par construction de bruits
        let data = new Float32Array(width * height);

        for (let y = 0, i = 0; y < height; y++) {
            for (let x = 0; x < width; x++, i++) {      
                let nx = x / width - 0.5;
                let ny = y / height - 0.5;

                // Pour chaque octave, on génère un bruit pondéré
                let gradient = 0;
                for (let n = 0; n < this.octaves; n++) {
                    let coef = 2**n * this.frequence
                    gradient += (this.amp**n) * this.noise(this.simplex[n], nx, ny, t, coef);
                }

                // On renormalise le gradiant par la somme des amp -> [0, 1] et on redistribue les valeurs
                data[i] = Math.pow(gradient / this.amp_sum, this.redistribution)
            }
        }
        return data
    }
}

// On génère le tableau de gradients
const noise = new NoiseGenerator(3, 3);

// On génère la grille plane qui sert de support au bruit
const geometry = new THREE.PlaneGeometry(2000, 2000, worldWidth - 1, worldDepth - 1);
geometry.rotateX(-Math.PI / 2);
geometry.attributes.position.usage = THREE.DynamicDrawUsage;
const vertices = geometry.attributes.position.array;

// Avec cette boucle, on parcours les gradients et on modifie les vertex en fonction.
function updateVertices(t=0) {
    let gradient = noise.getArray(worldWidth, worldDepth, t);
    for (let i = 0, j = 0; i < vertices.length; i ++, j += 3) {
        vertices[j+1] = gradient[i] * 100;
    }
    geometry.attributes.position.needsUpdate = true
}

// On créer un mesh 
const material = new THREE.MeshBasicMaterial({color: '#404040'});
material.wireframe = true;

// On applique la géometrie et le mesh
updateVertices();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

let speed = 5 * (10**-5) // Gère le déroulement du temps (translation dy)
function animate(timeStamp) {
    //controls.update();
    updateVertices(timeStamp*speed);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate(1000);

/* =========================== EVENT JS CLIENT ============================== */

function changeSlider(speed, freq, oct) {
    // Change la valeur des slide et leur label associé
    $('#speedSlide').val(speed);
    $('#freqSlide').val(freq);
    $('#octSlide').val(oct);
    $('#dv1').text(`(${speed})`);
    $('#dv2').text(`(${freq})`);
    $('#dv3').text(`(${oct})`);
}

changeSlider(5, 3, 3)
$('#speedSlide').on('input', function() {
    speed = this.value * (10**-5);
    $('#dv1').text(`(${this.value})`);
});
$('#freqSlide').on('input', function() {
    noise.frequence = this.value;
    $('#dv2').text(`(${this.value})`);
});
$('#octSlide').on('input', function() {
    noise.octaves = this.value;
    $('#dv3').text(`(${this.value})`);
    noise.amp_sum = (1 - noise.amp**(this.value)) / (1 - noise.amp)
});

$('button.reset').click(function() {
    speed = 5 * (10**-5);
    noise.frequence = 3;
    noise.octaves = 3;
    changeSlider(5, 3, 3)

    noise.amp_sum = (1 - noise.amp**(3)) / (1 - noise.amp);
})

// Fullscreen button
let fullscreen = false;
$('.fullscreen-button').click(function() {
    fullscreen = !fullscreen;
    if (fullscreen) {
        $('#3D').addClass('fullscreen');
        $('.slideContainer').addClass('fullscreen');
        $('.fullscreen-button').addClass('fullscreen');
        $('.textContent').addClass('d-none');
        console.log(window.innerWidth, window.innerHeight)
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    else {
        $('#3D').removeClass('fullscreen');
        $('.slideContainer').removeClass('fullscreen');
        $('.fullscreen-button').removeClass('fullscreen');
        $('.textContent').removeClass('d-none');
        $(canvas).css({'width': '100%', 'height': '400px'});
        renderer.setSize($(canvas).width(), $(canvas).height());
        camera.aspect = $(canvas).width() / $(canvas).height();
        camera.updateProjectionMatrix();
    }
})