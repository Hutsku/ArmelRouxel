import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

const TAU = 2 * Math.PI;

// Création des constantes
const worldWidth = 100, worldDepth = 100;

// On créer un la scène, camera et objet de rendu
const scene = new THREE.Scene();
scene.background = new THREE.Color('white');
scene.fog = new THREE.FogExp2('white', 0.007);

// On paramètre la taille du canvas
let canvas = document.getElementById('3D');
$(canvas).css({'width': '100%', 'height': '400px'});
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas
});
renderer.setPixelRatio(canvas.devicePixelRatio);
renderer.setSize($(canvas).width(), $(canvas).height());

// On paramètre les différentes camera et leur ratio
const camera = new THREE.PerspectiveCamera( 75, $(canvas).width() / $(canvas).height(), 0.1, 1000 );
const controls = new THREE.OrbitControls( camera, renderer.domElement );
//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 0, 200);
controls.update();

class NoiseGenerator {
    constructor(frequence=1, octaves=1) {
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

    noise(simplex, nx, ny, nz, coef, t) {
        // Génère un bruit à partir du simplex (et normalisé [-1, 1] -> [0, 1])
        return simplex.noise4D(coef*nx, coef*ny, coef*nz, t);
    }

    getGradient(x, y, z, radius, t) {
        // Renvoit le gradient calculé en 1 seul point     
        let nx = x / radius - 0.5;
        let ny = y / radius - 0.5;
        let nz = z / radius - 0.5;

        // Pour chaque octave, on génère un bruit pondéré
        let gradient = 0;
        for (let n = 0; n < this.octaves; n++) {
            let coef = 2**n * this.frequence
            gradient += (this.amp**n) * this.noise(this.simplex[n], nx, ny, nz, coef, t);
        }

        // On renormalise le gradiant par la somme des amp -> [0, 1] et on redistribue les valeurs
        return Math.pow(gradient / this.amp_sum, this.redistribution);
    }
}

// On génère le tableau de gradients
const noise = new NoiseGenerator(1, 1);

// On génère une sphère qui servira de repère de point
const radius = 100;
const geometry = new THREE.SphereGeometry(radius, worldWidth - 1, worldDepth - 1);
const vertices = geometry.getAttribute('position').array;

// "slice" ici permet de copier l'Array pour s'en servir de référence de positions
const positions = vertices.slice();

// Avec cette boucle, on parcours les gradients et on modifie les vertex en fonction.
function updateVertices(t=0) {
    let gradient, gradient2, theta, phi, new_radius;
    for (let j = 0; j < positions.length; j += 3) {
        theta = Math.acos(positions[j+2] / radius);
        phi = Math.atan2(positions[j+1], positions[j]);

        gradient = noise.getGradient(positions[j], positions[j+1], positions[j+2], radius, t);
        new_radius = (gradient*20 + radius)

        vertices[j] = Math.sin(theta) * Math.cos(phi) * new_radius;
        vertices[j+1] = Math.sin(theta) * Math.sin(phi) * new_radius;
        vertices[j+2] = Math.cos(theta) * new_radius;
    }
    geometry.getAttribute('position').needsUpdate = true
}

// On créer un mesh 
const material = new THREE.MeshBasicMaterial({color: '#404040'});
material.wireframe = true;

// On applique la géometrie et le mesh
updateVertices();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const axesHelper = new THREE.AxesHelper(200);
scene.add( axesHelper );

let speed = 50 * (10**-5) // Gère le déroulement du temps (translation dt)
function animate(timeStamp) {
    controls.update();
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

changeSlider(50, 1, 1)
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
    speed = 50 * (10**-5);
    noise.frequence = 1;
    noise.octaves = 1;
    changeSlider(50, 1, 1)

    noise.amp_sum = 1;
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