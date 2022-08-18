
// ============================================= INITALIZATION ============================================

let date = new Date()
let date_string = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()+2}:${date.getMinutes()}:${date.getSeconds()}`
console.log(`==================== ${date_string} ====================`)
console.log('Initalisation du site web ...')
var fs     = require('fs');

// On importe tout les modules necessaires
console.log('Importation des modules ...');
const path     = require('path');
var express    = require('express');
var session    = require('express-session');
var bodyParser = require("body-parser");

var app;
var urlencodedParser;
function app_init () {
    // init app et configure les cookies de session
    app = express();
    urlencodedParser = bodyParser.urlencoded({ extended: false });

    app.use(express.static(__dirname + '/public'));
    app.use('/scripts', express.static(__dirname + '/node_modules/'));
    app.use('/modules', express.static(__dirname + '/code_modules/'));
    app.use('/static', express.static(__dirname + '/public'));
    app.use('/', express.static(__dirname));
    app.set('view engine', 'ejs');  

    console.log("> Création de l'app et cookies de session configurés.");
};

// ---------------------- LAUNCH INIT -------------------
// init the other functionnality
app_init();

// ================================================ ROUTES ===============================================

console.log('Création des routes POST et GET')
app.get('/', function(req, res) {
    // Renvoit par défaut vers la page principale
    res.render('mainpage.ejs');
    //res.redirect('/blogs');
})

// ------------------ BLOGS PROGRAMATION -------------------

.get('/blogs', function(req, res) {
    res.render('blogs/mainpage.ejs');
})
.get('/blogs/noise', function(req, res) {
    res.render('blogs/noise_exp.ejs');
})
.get('/blogs/pathfinding1', function(req, res) {
    res.render('blogs/pathfinding1.ejs');
})

.get('/demo/map_generator', function(req, res) {
    res.render('blogs/map_generator.ejs');
})
.get('/demo/marbles', function(req, res) {
    res.render('blogs/marbles.ejs');
})
.get('/demo/clouds', function(req, res) {
    res.render('blogs/clouds.ejs');
})
.get('/demo/waves', function(req, res) {
    res.render('blogs/wireframe_waves.ejs');
})
.get('/demo/blob', function(req, res) {
    res.render('blogs/blob.ejs');
})
.get('/demo/2d', function(req, res) {
    res.render('blogs/2d.ejs');
})

// ------------------ MUSIQUE ------------------------------

.get('/music', function(req, res) {
    let gallery_qk = fs.readdirSync('./public/img/quiet_kid');
    let gallery_alo = fs.readdirSync('./public/img/another_light_out');
    res.render('music/mainpage.ejs', {
        session: req.session,
        gallery_qk: gallery_qk,
        gallery_alo: gallery_alo
    });
})
.get('/music/demo', function(req, res) {
    //let gallery = fs.readdirSync('./public/img/demo');
    res.render('music/demo.ejs', {
        session: req.session,
    });
})
.get('/music/quiet_kid', function(req, res) {
    let gallery = fs.readdirSync('./public/img/quiet_kid');
    res.render('music/quiet_kid.ejs', {
        session: req.session,
        gallery: gallery
    });
})
.get('/music/makingof_quiet_kid', function(req, res) {
    res.render('music/makingof_qk.ejs', {
        session: req.session,
    });
})
.get('/music/another_light_out', function(req, res) {
    let gallery = fs.readdirSync('./public/img/another_light_out');
    res.render('music/another_light_out.ejs', {
        session: req.session,
        gallery: gallery
    });
})
.get('/music/makingof_reach_that_light_out', function(req, res) {
    res.render('music/makingof_rtl.ejs', {
        session: req.session,
    });
})
.get('/music/reach_that_light', function(req, res) {
    let gallery = fs.readdirSync('./public/img/reach_that_light');
    res.render('music/reach_that_light.ejs', {
        session: req.session,
        gallery: gallery
    });
})

.get('/test-dev', function (req, res) {
    sendEmail('subscribe', 'arouxel@outlook.fr', {name: 'armel'});
    res.redirect('back');
});

// ========================================================================================================

app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});

// On ouvre le serveur sur le port 8080
console.log('Ouverture du serveur sur le port 8081')
app.listen(8081, 'localhost');