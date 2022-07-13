import SimplexNoise from '/scripts/simplex-noise/dist/esm/simplex-noise.js';

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

Math.toRadians = function(degrees){
  if (degrees < 0) {
    degrees += 360;/*from www.java2s.com*/
  }
  return degrees / 180 * Math.PI;
};

// Création des constantes
const TAU = 2 * Math.PI;
const worldWidth = 100, worldDepth = 100;
const noise = new NoiseGenerator(2, 1); // On génère le tableau de gradients
const radius = 100;

let scene, camera, renderer, controls, pointlight, envmaploader;
let geometry, vertices, positions, mesh, axesHelper;
function init() {
    // On créer un la scène, camera et objet de rendu
    scene = new THREE.Scene();
    //scene.background = new THREE.Color('white');
    //scene.fog = new THREE.FogExp2('white', 0.001);

    let canvas = document.getElementById('3D');
    $(canvas).css({'width': '100%', 'height': '100%'});
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvas
    });
    renderer.setSize($(canvas).width(), $(canvas).height());

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Création de la caméra et de ses differents paramètres
    camera = new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,1,1000);
    camera.position.set(0, 0, 500);

    //controls = new THREE.OrbitControls(camera, renderer.domElement);
    //controls.autoRotate = true;
    //controls.autoRotateSpeed = 0.5;
    //controls.enableDamping = true;

    // Image de fond
    /*new THREE.TextureLoader().load("/img/texture.jpg", function(bgTexture) {
        const bgGeometry = new THREE.PlaneGeometry(1500, 800);
        const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.set(0, 0, -120);
        scene.add(bgMesh);       
    });*/

    const bgGeometry = new THREE.PlaneGeometry(1500, 800);
    const bgMesh = new THREE.Mesh(bgGeometry);
    bgMesh.position.set(0, 0, -120);
    scene.add(bgMesh);   


    // Point de lumière
    pointlight = new THREE.PointLight(0xffffff,1);
    pointlight.position.set(300,300,300);
    scene.add(pointlight);

    envmaploader = new THREE.PMREMGenerator(renderer);

    // Charge la map de reflection de la sphère
    new THREE.RGBELoader().load('/img/empty_warehouse_01_1k.hdr', function(hdrmap) {
        let envmap = envmaploader.fromCubemap(hdrmap);
        let texture = new THREE.CanvasTexture(new THREE.FlakesTexture());
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = 10;
        texture.repeat.y = 6;

        const param = {
            clearcoat: 1.0,
            cleacoatRoughness: 0.15,
            //metalness: 1,  
            roughness: 1,   
            transmission: 0,  
            thickness: 1.2,
            //color: 0xffffff,

            //normalMap: texture,
            //normalScale: new THREE.Vector2(0.15, 0.15),  
            //clearcoatNormalMap: texture,

            envMap: envmap.texture,
            envMapIntensity: 1.5
        };

        // On construit le mesh de la sphère
        geometry = new THREE.SphereGeometry(radius, worldWidth - 1, worldDepth - 1);
        let material = new THREE.MeshPhysicalMaterial(param);
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // On extrait les vertices de la sphère repère
        vertices = geometry.getAttribute('position').array; 
        positions = vertices.slice(); // "slice" ici permet de copier l'Array pour s'en servir de référence de positions
    
        animate(1000);
    });

    // On ajoute un repère tri-dimensionel
    axesHelper = new THREE.AxesHelper(30);
    scene.add(axesHelper);
    axesHelper.position.set(280, 100, 100);
}
 
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

// Met à jour la vitesse, fréquence etc. de la sphère via mouvement de la souris
function updateParameter(delta) {
    speed += 0.1 * delta.y * (10**-5);
    if (speed < 0) speed = 0;
    if (speed > 10**-3) speed = 10**-3;

    noise.frequence += 0.01 * delta.x
    if (noise.frequence < 0) noise.frequence = 0;
    if (noise.frequence > 10) noise.frequence = 10;

    $('#dv1').text((speed/10**-5).toFixed(2));
    $('#dv2').text((noise.frequence).toFixed(2));
}

let speed = 20 * (10**-5) // Gère le déroulement du temps (translation dt)
let oldTime = 0;
let lastUpdateTS = 0;
function animate(timeStamp) {
    
    updateVertices(timeStamp*speed);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    // Rotation automatique de la fréquence
    if (autoChangeParam) {
        let evolution = (Math.cos(timeStamp/5000) + 1) * 5
        noise.frequence = evolution
        $('#dv2').text((noise.frequence).toFixed(2));       
    }

    // On met à jour le compteur de fps
    /*console.log(lastUpdateTS)
    if (timeStamp - lastUpdateTS >= 100) {
        let fps = 1 / ((timeStamp - oldTime) / 1000)
        $('#fps').text(fps.toFixed(2));
        lastUpdateTS = timeStamp;   
    }
    oldTime = timeStamp;*/
}
init()

/* ====================== CONTROL BUTTONS =================== */

$('button#autoParam').click(function() {
    if (autoChangeParam) {
        autoChangeParam = false;
        $(this).removeClass('focus');
        $(this).addClass('not-focus');
    } else {
        autoChangeParam = true;
        $(this).addClass('focus');
        $(this).removeClass('not-focus');
    }
})

/* ====================== MOUSE CONTROL ===================== */

let isDraggingLeft, isDraggingRight, isTouchHold;
let autoChangeParam = true;
let previousMousePosition = {x: 0, y: 0};

$(renderer.domElement).mousedown(function(event) {
    switch (event.which) {
        case 1: // left button
            isDraggingLeft = true;
            break;
        case 2: // middle button
            break;
        case 3: // right button
            isDraggingRight = true;

            // On désactive la rotation automatique
            autoChangeParam = false;
            $('button#autoParam').removeClass('focus');
            $('button#autoParam').addClass('not-focus');
            break;
    }
})
.on('touchmove', function(event) {
    // Adapation du "mousemove" de la version pc
    let touch = event.touches[0];
    let deltaMove = {
        x: touch.pageX-previousMousePosition.x,
        y: touch.pageY-previousMousePosition.y
    };

    if (!isTouchHold && mesh) {    
        let deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                Math.toRadians(deltaMove.y * 1),
                Math.toRadians(deltaMove.x * 1),
                0,
                'XYZ'
            ));
        mesh.quaternion.multiplyQuaternions(deltaRotationQuaternion, mesh.quaternion);
        axesHelper.quaternion.multiplyQuaternions(deltaRotationQuaternion, axesHelper.quaternion);
    }

    // Si on reste appuyé tout en bougeant, on simule un clique gauche
    if (isTouchHold && mesh) {    
        updateParameter(deltaMove)
    }

    previousMousePosition = {x: touch.pageX, y: touch.pageY};
})
.on('mousemove', function(event) {
    let deltaMove = {
        x: event.offsetX-previousMousePosition.x,
        y: event.offsetY-previousMousePosition.y
    };

    if (isDraggingLeft && mesh) {    
        let deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                Math.toRadians(deltaMove.y * 1),
                Math.toRadians(deltaMove.x * 1),
                0,
                'XYZ'
            ));
        mesh.quaternion.multiplyQuaternions(deltaRotationQuaternion, mesh.quaternion);
        axesHelper.quaternion.multiplyQuaternions(deltaRotationQuaternion, axesHelper.quaternion);
    }
    if (isDraggingRight && mesh) { 
        updateParameter(deltaMove)
    }

    previousMousePosition = {x: event.offsetX, y: event.offsetY};
});

$(document).on('mouseup', function(event) {
    isDraggingLeft  = false;
    isDraggingRight = false;
    isTouchHold     = false;
});