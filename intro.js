import {SwitchToStateFromURLHash} from "./spa.js";
window.onhashchange = SwitchToStateFromURLHash;
window.location.hash = "Menu";

var c = document.getElementById('intro');
var ctx = c.getContext('2d');
var x = c.width = window.innerWidth;
var y = c.height = window.innerHeight;

window.addEventListener("resize", ()=>{
    x = c.width = window.innerWidth;
    y = c.height = window.innerHeight;
})

var nStar = Math.round((x + y)/5);
var randomSize = Math.floor((Math.random()*2)+1);

var stars = [];
function createStars() {
    'use strict';
    stars = [];
    for(var i=0; i<=nStar; i++) {
        stars.push({
            x: Math.random() * x,
            y: Math.random() * y,
            o: Math.random(),
            r: Math.random(),
            s: 0.02,
        })
        if(randomSize>.1) {
            ctx.shadowBlur = Math.floor((Math.random()*15));
            ctx.shadowColor = "white";
        }
    }
}

function drawing() {
    'use strict';
    requestAnimationFrame(drawing);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for(var i=0; i<=nStar; i++) {
        var e = stars[i];
        if (e.o > 1 || e.o < 0) {
            e.s = -e.s;
        }
        e.o += e.s;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2, false);
        ctx.strokeStyle = 'rgba(255, 255, 255, '+e.o+')';
        ctx.stroke();
    }
}

export var startGame = function() {
    console.log('start game');
    // var gameCanvas = document.getElementById('gameCanvas');
    // var menu = document.getElementById('menuWrapper');
    // var gameMenu = document.getElementById('gameMenu');
    //
    // gameCanvas.style.display = "block";
    // gameMenu.style.display = "flex";
    // c.hidden = true;
    // menu.hidden = true;
    window.location.hash = "Start";
}


export function backToMenu() {
    // var gameCanvas = document.getElementById('gameCanvas');
    // var menu = document.getElementById('menuWrapper');
    // var gameMenu = document.getElementById('gameMenu');
    //
    // gameCanvas.style.display = "none";
    // gameMenu.style.display = "none";
    // c.hidden = false;
    // menu.hidden = false;
}


function createMenu() {
    var startButton = document.getElementById('startButton');
    var recordsButton = document.getElementById('recordsButton');
    var recordsBackButton = document.getElementById('recordsBackButton');
    startButton.addEventListener('click', startGame);
    recordsButton.addEventListener('click', goToRecordsMenu);
    recordsBackButton.addEventListener('click', goToMenu);

}

function goToRecordsMenu(){
    console.log('go to menu')
    window.location.hash = 'Records';
}

export function goToMenu(){
    window.location.hash = 'Menu';
}

window.onload = function () {
    createStars();
    drawing();
    createMenu();
};
