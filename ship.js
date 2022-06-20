"use strict";
import {goToMenu} from "./intro.js";
import {Records} from "./records.js";

// -------Необходимые константы для игры и механики------ //
const fps = 30; // кадры в секунду
const friction = 0.7; // коэффициент трения (0 = нет трения, 1 = макс)
const shipSize = 30; // высота корабля в пикселях
const shipThrust = 5; // ускорение корабля
const turnSpeed = 360; // скорость поворота корабля в градусах
const shipExplodeDur = 0.3; // продолжительность взрыва корабля в секундах
const shipInvDur = 3; // продолжительность неуязвимости корабля в секундах
const shipBlinkDur = 0.1; // продолжительность мигания корабля в секундах

const lazerMax = 10; // макс кол-во выстрелов на экране
const lazerSpd = 500; // скорость выстрела пикс/сек
const lazerDist = 0.6; // максимальный трек пульки от ширины экрана
const LazerExplodeDur = 0.1; // продолжительность взврыва

const asteroidNum = 3; // изначальное кол-во астероидов
const asteroidSize = 100; // начальный размер астероида
const asteroidSpeed = 50; // максимальное стартовое значение скорости астероида
const asteroidVert = 10; // среднее кол-во вершин на астеройде
const asteroidJag = 0.4; // зубчатость астероида (0 = нет, 1 = макс)

// Вспомогательные
const ShowCentreDot = false; // показать или скрыть центр корабля
const ShowBounding = false; // показать границы столкновения
const TextFadeTime = 2.5; // время затухания текста в сек
const TextSize = 24; // Размер текста
const gameLives = 3; // житухи
const pointsBig = 20 // очки за большой астероид
const pointsMid = 50 // очки за средний астероид
const pointsSm = 100 // очки за маленький астероид
const saveKey = "record" // ключ для сохранеия в localStor
const soundOn = true;


var canv, ctx, wc, hc, timer, paused;

// Настройка звуковых эффектов
var effLazer = new Sound("sounds/lazer.m4a", 5, 0.5);
var effExplode = new Sound("sounds/explode.m4a");
var effHit = new Sound("sounds/hit.m4a", 5);
var effThrust = new Sound("sounds/thrust.m4a");


//Настройка игровых параметров

var level, asteroids, text, textAlpha, lives, score, records;

var ship = {
    dead: true
}
// Настройки обработчиков событий

document.addEventListener("keydown", function(EO) {
    EO = EO || window.event;
    EO.preventDefault();

    if (ship.dead) {
        return;
    } else {
        if (EO.key === "ArrowLeft") {
            ship.rot = turnSpeed / 180 * Math.PI / fps;
        }
        if (EO.key === "ArrowUp") {
            ship.thrusting = true;
        }
        if (EO.key === "ArrowRight") {
            ship.rot = -turnSpeed / 180 * Math.PI / fps;
        }
        if (EO.key === " ") {
            shootLazer();
        }
    }
});

document.addEventListener("keyup", function(EO) {
    EO = EO || window.event;
    EO.preventDefault();

    if (ship.dead) {
        return;
    } else {
        if (EO.key === "ArrowLeft") {
            ship.rot = 0;
        }
        if (EO.key === "ArrowUp") {
            ship.thrusting = false;
        }
        if (EO.key === "ArrowRight") {
            ship.rot = 0;
        }
        if (EO.key === " ") {
            ship.canShoot = true;
        }
    }
});

document.getElementById('pause').addEventListener('click', pause);
document.getElementById('gameMenuButton').addEventListener('click', goBack);

// анимация



function createAsteroids() {
    asteroids = [];
    var x, y;
    for (var i = 0; i < asteroidNum + level; i++) {
        // рандомное расположение атероидов не касаясь корабля
        do {
            x = Math.floor(Math.random() * canv.width);
            y = Math.floor(Math.random() * canv.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < asteroidSize * 2 + ship.r);
        asteroids.push(newAsteroid(x, y, Math.ceil(asteroidSize / 2)));
    }
}

function destroyAsteroid(index) {
    var x = asteroids[index].x;
    var y = asteroids[index].y;
    var r = asteroids[index].r;

    // разделить астеройд на два
    if (r == Math.ceil(asteroidSize / 2)) { // большой
        asteroids.push(newAsteroid(x, y, Math.ceil(asteroidSize / 4)));
        asteroids.push(newAsteroid(x, y, Math.ceil(asteroidSize / 4)));
        score += pointsBig;
    } else if (r == Math.ceil(asteroidSize / 4)) { // средний
        asteroids.push(newAsteroid(x, y, Math.ceil(asteroidSize / 8)));
        asteroids.push(newAsteroid(x, y, Math.ceil(asteroidSize / 8)));
        score += pointsMid;
    } else {
        score += pointsSm;
    }

    // проверяем рекорды
    if (score > records) {
        records = score;
        localStorage.setItem(saveKey, records);
    }

    // уничтожить астиероид
    asteroids.splice(index, 1);
    effHit.play();

    // новый уровень когда все астероиды уничтожены
    if (asteroids.length == 0) {
        level++;
        newLewel();
    }
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawShip(x, y, a, color = "white") {
    ctx.strokeStyle = color;
    ctx.lineWidth = shipSize / 20;
    ctx.beginPath();
    ctx.moveTo( // нос корабля
        x + 4 / 3 * ship.r * Math.cos(a),
        y - 4 / 3 * ship.r * Math.sin(a)
    );
    ctx.lineTo( // левая грань корабля
        x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
        y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
    );
    ctx.lineTo( // задняя грань корабля
        x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
        y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
    );
    ctx.closePath();
    ctx.stroke();
}

function explodeShip() {
    ship.explodeTime = Math.ceil(shipExplodeDur * fps);
    effExplode.play();
}

function gameOver() {
    ship.dead = true;
    document.getElementById('title').innerHTML = "GAME OVER";
    clearInterval(timer);
    saveScore();
    // backToMenu();
    goToMenu();
}

export function isPlaying() {
    return !ship.dead;
}

function saveScore() {
    var userName = prompt("Введите ваше имя.");
    if (userName) {
        Records.saveRecord(userName, score);
    }
}

function newAsteroid(x, y, r) {
    var lvlMult = 1 + 0.1 * level;
    var asteroids = {
        a: Math.random() * Math.PI * 2,
        offs: [],
        r: r,
        vert: Math.floor(Math.random() * (asteroidVert + 1) + asteroidVert / 2),
        x: x,
        y: y,
        xv: Math.random() * asteroidSpeed * lvlMult / fps * (Math.random() < 0.5 ? 1 : -1),
        yv: Math.random() * asteroidSpeed * lvlMult / fps * (Math.random() < 0.5 ? 1 : -1)
    };

    // заполняем массив смещений
    for (var i = 0; i < asteroids.vert; i++) {
        asteroids.offs.push(Math.random() * asteroidJag * 2 + 1 - asteroidJag);
    }

    return asteroids;
}

export function start() {
    canv = document.getElementById("gameCanvas");
    console.log("start", canv);
    ctx = canv.getContext("2d");
    wc = canv.width = window.innerWidth;
    hc = canv.height = window.innerHeight;
    newGame();
}

function pause() {
    if (paused) {
        paused = false;
        document.getElementById('pause').innerText = 'PAUSE';
        timer = setInterval(update, 1000 / fps);
    } else {
        paused = true;
        clearInterval(timer);
        document.getElementById('pause').innerText = 'RESUME';
    }
}

export function confirmGoBack() {
    console.log("confirm go back");
    if (score > 0) {
       return  confirm('ВНИМАНИЕ! Текущий прогресс игры будет потерян. Вы уверены? ')
    }
    return true;
}

function goBack() {
    goToMenu();
}

export function stopGame() {
    ship.dead = true;
    clearInterval(timer);
}

function newGame() {
    level = 0;
    lives = gameLives;
    score = 0;
    ship = newShip();
    // получить лучший счет из локального хранилища
    var scoreStr = localStorage.getItem(saveKey);
    if (scoreStr == null) {
        records = 0;
    } else {
        records = parseInt(scoreStr);
    }

    newLewel();
    timer = setInterval(update, 1000 / fps);
}

function newLewel() {
    text = "Уровень " + (level + 1);
    textAlpha = 1.0;
    createAsteroids();
}

function newShip() {
    return {
        x: canv.width / 2,
        y: canv.height / 2,
        r: shipSize / 2,
        a: 90 / 180 * Math.PI, // переводим в радианы
        blinkNum: Math.ceil(shipInvDur / shipBlinkDur),
        blinkTime: Math.ceil(shipBlinkDur * fps),
        canShoot: true,
        dead: false,
        explodeTime: 0,
        lazers: [],
        rot: 0,
        thrusting: false,
        thrust: {
            x: 0,
            y: 0
        }
    }
}

function shootLazer() {
    // создаем пульку
    if (ship.canShoot && ship.lazers.length < lazerMax) {
        ship.lazers.push({ // высрел сделаем из носа корабля (скопируем координаты из "Рисуем корабль" )
            x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
            y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
            xv: lazerSpd * Math.cos(ship.a) / fps, // скорость
            yv: -lazerSpd * Math.sin(ship.a) / fps,
            dist: 0,
            explodeTime: 0,

        });
        effLazer.play();
    }
    // остановить дальнейшую стрельбу
    ship.canShoot = false;

}

function Sound(src, maxStreams = 1, vol = 1.0) { // 1 по умолчанию
    this.streamNum = 0;
    this.streams = [];
    for (var i = 0; i < maxStreams; i++) {
        this.streams.push(new Audio(src));
        this.streams[i].volume = vol;
    }

    this.play = function() {
        if (soundOn) {
            this.streamNum = (this.streamNum + 1) % maxStreams;
            this.streams[this.streamNum].play();
        }
    }
    this.stop = function() {
        this.streams[this.streamNum].pause();
        this.streams[this.streamNum].currentTime = 0;
    }
}

function update() {

    var blinkOn = ship.blinkNum % 2 == 0;
    var exploding = ship.explodeTime > 0;

    // рисуем фон космоса

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canv.width, canv.height);

    // тяга корабля
    if (ship.thrusting && !ship.dead) {
        ship.thrust.x += shipThrust * Math.cos(ship.a) / fps;
        ship.thrust.y -= shipThrust * Math.sin(ship.a) / fps;
        effThrust.play();

        // рисуем тягу корабля (след сзади)
        if (!exploding && blinkOn) {
            ctx.fillStyle = "red";
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = shipSize / 10;
            ctx.beginPath();
            ctx.moveTo( // лево
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
            );
            ctx.lineTo( // центр (позади корабля)
                ship.x - ship.r * 6 / 3 * Math.cos(ship.a),
                ship.y + ship.r * 6 / 3 * Math.sin(ship.a)
            );
            ctx.lineTo( // право
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    } else {
        // применяем коэф трения для замедления если нет тяги///торможение
        ship.thrust.x -= friction * ship.thrust.x / fps;
        ship.thrust.y -= friction * ship.thrust.y / fps;
        effThrust.stop();
    }

    // Рисуем корабль
    if (!exploding) {
        if (blinkOn && !ship.dead) {
            drawShip(ship.x, ship.y, ship.a);
        }

        // обработка мигания корабля
        if (ship.blinkNum > 0) {

            // уменьшаем время мигания
            ship.blinkTime--;

            // уменьшаем число миганий
            if (ship.blinkTime == 0) {
                ship.blinkTime = Math.ceil(shipBlinkDur * fps);
                ship.blinkNum--;
            }
        }

    } else {
        //рисуем взрыв
        ctx.fillStyle = "darkred";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
        ctx.fill();
    }
    //рисуем зону соприкоснеовения вокруг корябля (потом уберем)
    if (ShowBounding) {
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    // Рисуем астероиды
    var a, r, x, y, offs, vert;
    for (var i = 0; i < asteroids.length; i++) {
        ctx.strokeStyle = "slategrey";
        ctx.lineWidth = shipSize / 20;

        // свойства астероида
        a = asteroids[i].a;
        r = asteroids[i].r;
        x = asteroids[i].x;
        y = asteroids[i].y;
        offs = asteroids[i].offs;
        vert = asteroids[i].vert;

        // Рисуем путь
        ctx.beginPath();
        ctx.moveTo(
            x + r * offs[0] * Math.cos(a),
            y + r * offs[0] * Math.sin(a)
        );

        // форма астероида
        for (var j = 1; j < vert; j++) {
            ctx.lineTo(
                x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
                y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
            );
        }
        ctx.closePath();
        ctx.stroke();

        //рисуем зону соприкоснеовения вокруг астеройдов (потом уберем)
        if (ShowBounding) {
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2, false);
            ctx.stroke();
        }
    }

    // centre dot
    if (ShowCentreDot) {
        ctx.fillStyle = "red";
        ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
    }

    // рисуем выстрелы
    for (var i = 0; i < ship.lazers.length; i++) {
        if (ship.lazers[i].explodeTime == 0) {
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lazers[i].x, ship.lazers[i].y, shipSize / 15, 0, Math.PI * 2, false);
            ctx.fill();
        } else {
            // рисуем взрыв
            ctx.fillStyle = "orangered";
            ctx.beginPath();
            ctx.arc(ship.lazers[i].x, ship.lazers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lazers[i].x, ship.lazers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "pink";
            ctx.beginPath();
            ctx.arc(ship.lazers[i].x, ship.lazers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    // рисуем текст игры (уровни)
    if (textAlpha >= 0) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha +")";
        ctx.font = "small-caps " + TextSize + "px dejavu sans mono";
        ctx.fillText(text, canv.width / 2, canv.height * 0.75);
        textAlpha -= (1.0 / TextFadeTime / fps);
    } else { // продолжить игру через некотрое время - лучше сделать по кнопке вообще
        if (ship.dead) {
            // stopGame();
        }
    }

    // рисуем жизни
    var lifeColor;
    for (var l = 0; l < lives; l++) {
        lifeColor = exploding && l == lives -1 ? "red" : "white";
        drawShip(shipSize + l * shipSize * 1.2, shipSize, 0.5 * Math.PI, lifeColor);
    }

    //рисуем счет игры
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = TextSize + "px dejavu sans mono";
    ctx.fillText("SCORE: " + score, canv.width - shipSize / 2, shipSize);

    //рисуем рекорд
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = TextSize + "px dejavu sans mono";
    ctx.fillText("BEST " + records, (canv.width - shipSize / 2) -190, shipSize);

    // Обнаружение попадания пульки в астероид
    var ax, ay, ar, lx, ly;
    for (var i = asteroids.length - 1; i >= 0; i--) {

        // захватываем свойсва астеройда
        ax = asteroids[i].x;
        ay = asteroids[i].y;
        ar = asteroids[i].r;

        //цикл
        for (var j = ship.lazers.length - 1; j >= 0; j--) {

            // захватываем свойсва выстрелов
            lx = ship.lazers[j].x;
            ly = ship.lazers[j].y;

            // обнаружение попадания
            if (ship.lazers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {

                // уничтожение астеройда и появление взрыва
                destroyAsteroid(i);
                ship.lazers[j].explodeTime = Math.ceil(LazerExplodeDur * fps);
                break;
            }
        }
    }

    //проверяем на столкновение с астеройдом
    if (!exploding) {
        if (ship.blinkNum == 0 && !ship.dead) {
            for (var i = 0; i < asteroids.length; i++) {
                if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
                    explodeShip();
                    destroyAsteroid(i);
                    break;
                }
            }
        }

        // поворот корабля
        ship.a += ship.rot;

        // движение корабля
        ship.x += ship.thrust.x;
        ship.y += ship.thrust.y;
    } else {
        ship.explodeTime--;

        // обновить корабль после взврыва
        if (ship.explodeTime == 0) {
            lives--;
            if (lives == 0) {
                gameOver();
            } else {
                ship = newShip();
            }
        }
    }

    // если корабль зашел за край экрана
    if (ship.x < 0 - ship.r) {
        ship.x = canv.width + ship.r;
    } else if (ship.x > canv.width + ship.r) {
        ship.x = 0 - ship.r;
    }
    if (ship.y < 0 - ship.r) {
        ship.y = canv.height + ship.r;
    } else if (ship.y > canv.height + ship.r) {
        ship.y = 0 - ship.r;
    }

    // Перемещение выстрелов
    for (var i = ship.lazers.length - 1; i >= 0; i--) {

        //проверяем пройденный путь
        if (ship.lazers[i].dist > lazerDist * canv.width) {
            ship.lazers.splice(i, 1);
            continue;
        }

        //управление взврывом
        if (ship.lazers[i].explodeTime > 0) {
            ship.lazers[i].explodeTime--;

            if (ship.lazers[i].explodeTime == 0) {
                ship.lazers.splice(i, 1);
                continue;
            }

        } else {
            // движение пульки
            ship.lazers[i].x += ship.lazers[i].xv;
            ship.lazers[i].y += ship.lazers[i].yv;

            // посчитаем пройденный путь пульки по теореме пифагора (идею посмотрел в аналог игре)
            ship.lazers[i].dist += Math.sqrt(Math.pow(ship.lazers[i].xv, 2) + Math.pow(ship.lazers[i].yv, 2));
        }

        // если за край экрана
        if (ship.lazers[i].x < 0) {
            ship.lazers[i].x = canv.width;
        } else if (ship.lazers[i].x > canv.width) {
            ship.lazers[i].x  = 0;
        }
        if (ship.lazers[i].y < 0) {
            ship.lazers[i].y = canv.height;
        } else if (ship.lazers[i].y > canv.height) {
            ship.lazers[i].y  = 0;
        }
    }

    // перемещение астероида
    for (var i = 0; i < asteroids.length; i++) {
        asteroids[i].x += asteroids[i].xv;
        asteroids[i].y += asteroids[i].yv;

        // обрабатываем края экрана чтоб астероид не улетел
        if (asteroids[i].x < 0 - asteroids[i].r) {
            asteroids[i].x = canv.width + asteroids[i].r;
        } else if (asteroids[i].x > canv.width + asteroids[i].r) {
            asteroids[i].x = 0 - asteroids[i].r
        }
        if (asteroids[i].y < 0 - asteroids[i].r) {
            asteroids[i].y = canv.height + asteroids[i].r;
        } else if (asteroids[i].y > canv.height + asteroids[i].r) {
            asteroids[i].y = 0 - asteroids[i].r
        }
    }
}


// window.addEventListener("resize", ()=>{
//     wc = canv.width = window.innerWidth;
//     hc = canv.height = window.innerHeight;
// })



////////////////////////////////////////////////////
// var screenW,
//     screenH,
//     stars = [];


// const numStars = 2000;

// // Создаем звезды
// for (let i = 0; i < numStars; i++) {
//     let x = Math.round(Math.random() * wc);
//     let y = Math.round(Math.random() * hc);
//     let length = 1 + Math.random() * 2;
//     let opacity = Math.random();

//     // Создание экземпляра звезды
//     let star = new Star(x, y, length, opacity);
//     stars.push(star);
// }
// setInterval(animate, 1000 / fps);

// // ============ Слой настройки компонентов ==============
//     /**
//      * Star
//      *
//      * @param int x
//      * @param int y
//      * @param int length
//      * @param float opacity
//      */

//     // Звездный конструктор
//     function Star(x, y, length, opacity) {
//         this.x = parseInt(x);
//         this.y = parseInt(y);
//         this.length = parseInt(length);
//         this.opacity = opacity;
//         this.factor = 1;
//         this.increment = Math.random() * 0.03;
//     }

//     // Метод прототипа объекта
//     /**
//            * Нарисуйте звезды
//      *
//      * @param ctx
//      */
//     Star.prototype.draw = function (ctx) {
//         ctx.rotate(Math.PI * 1 / 10);

//         //save the ctx
//         ctx.save();
//         //move into the middle of the canvas,just make room
//         ctx.translate(this.x, this.y);
//         //change the opacity
//         if (this.opacity > 1) {
//             this.factor = -1;
//         } else if (this.opacity <= 0) {
//             this.factor = 1;

//             // Обновляем положение звезд один раз
//             this.x = Math.round(Math.random() * wc);
//             this.y = Math.round(Math.random() * hc);
//         }

//         // Фактор управляет направлением, появляется или исчезает, каждый раз, когда вы перерисовываете, прозрачность звезд меняется
//         this.opacity += this.increment * this.factor;

//         ctx.beginPath();
//         // Рисуем линию
//         for (var i = 5; i > 0; i--) {
//             ctx.lineTo(0, this.length);
//             ctx.translate(0, this.length);
//             ctx.rotate(Math.PI * 2 / 10);
//             ctx.lineTo(0, -this.length);
//             ctx.translate(0, -this.length);
//             ctx.rotate(-(Math.PI * 6 / 10));
//         }

//         ctx.lineTo(0, this.length);
//         ctx.closePath();

//         ctx.fillStyle = 'rgba(255,255,200, ' + this.opacity + ')';
//         ctx.shadowBlur = 5;
//         ctx.shadowColor = '#ffff33';
//         ctx.fill();

//         ctx.restore();
//     }

//     //Функция звездной вспышки

//    function animate() {
//        ctx.clearRect(0, 0, screenW, screenH);
//        for (let i = 0; i < stars.length; i++) {
//         stars[i].draw(ctx);

//   }
// }
