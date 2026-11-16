// ==========================================
// GALACTIC ASSAULT - SCRIPT PRINCIPAL
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de Interface
const mainMenu = document.getElementById('main-menu');
const instructionsScreen = document.getElementById('instructions-screen');
const settingsScreen = document.getElementById('settings-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');
const hud = document.getElementById('hud');

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const stageEl = document.getElementById('stage');
const livesEl = document.getElementById('lives');
const energyFill = document.getElementById('energy-fill');
const finalScoreEl = document.getElementById('final-score');
const victoryScoreEl = document.getElementById('victory-score');

// Botões
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('instructions-btn').addEventListener('click', () => toggleScreen(instructionsScreen, true));
document.getElementById('settings-btn').addEventListener('click', () => toggleScreen(settingsScreen, true));
document.getElementById('back-to-menu-1').addEventListener('click', () => toggleScreen(instructionsScreen, false));
document.getElementById('back-to-menu-2').addEventListener('click', () => toggleScreen(settingsScreen, false));
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('quit-btn').addEventListener('click', returnToMenu);
document.getElementById('restart-gameover-btn').addEventListener('click', startGame);
document.getElementById('menu-gameover-btn').addEventListener('click', returnToMenu);
document.getElementById('restart-victory-btn').addEventListener('click', startGame);
document.getElementById('menu-victory-btn').addEventListener('click', returnToMenu);

const volumeSlider = document.getElementById('volume-slider');
const toggleAudioBtn = document.getElementById('toggle-audio');

volumeSlider.addEventListener('input', (e) => {
    masterVolume = parseFloat(e.target.value);
    if (masterVolume > 0) audioEnabled = true;
    updateAudioButton();
});

toggleAudioBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    updateAudioButton();
});

function updateAudioButton() {
    if (audioEnabled) {
        toggleAudioBtn.textContent = "Áudio: Atativado";
        toggleAudioBtn.classList.add('toggle-on');
    } else {
        toggleAudioBtn.textContent = "Áudio: Desativado";
        toggleAudioBtn.classList.remove('toggle-on');
    }
}

// ==========================================
// SISTEMA DE ÁUDIO (Web Audio API)
// ==========================================
let audioCtx = null;
let masterVolume = 0.5;
let audioEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'shoot') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gainNode.gain.setValueAtTime(0.2 * masterVolume, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'explosion') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
            gainNode.gain.setValueAtTime(0.4 * masterVolume, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'powerup') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
            gainNode.gain.setValueAtTime(0.3 * masterVolume, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'hit') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.1);
            gainNode.gain.setValueAtTime(0.3 * masterVolume, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        // Ignora erros de áudio se o navegador bloquear autoplay
    }
}

// ==========================================
// ESTADO DO JOGO E VARIÁVEIS GLOBAIS
// ==========================================
let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, VICTORY
let score = 0;
let highscore = localStorage.getItem('galactic_highscore') || 0;
let stage = 1;
let lives = 3;
let energy = 100;

let keys = {};
let player, enemies, bullets, enemyBullets, particles, powerUps, boss;
let waveTimer = 0;
let enemiesDefeatedInStage = 0;
let stageSpawnCount = 15;
let stars = [];

highscoreEl.textContent = highscore;

// Controles de Teclado
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        togglePause();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function toggleScreen(screen, show) {
    if (show) {
        screen.classList.remove('hidden');
    } else {
        screen.classList.add('hidden');
    }
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        toggleScreen(pauseScreen, true);
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        toggleScreen(pauseScreen, false);
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function returnToMenu() {
    gameState = 'MENU';
    toggleScreen(pauseScreen, false);
    toggleScreen(gameoverScreen, false);
    toggleScreen(victoryScreen, false);
    toggleScreen(hud, false);
    toggleScreen(mainMenu, true);
}

// ==========================================
// INICIALIZAÇÃO DE OBJETOS
// ==========================================
function startGame() {
    initAudio();
    toggleScreen(mainMenu, false);
    toggleScreen(instructionsScreen, false);
    toggleScreen(settingsScreen, false);
    toggleScreen(pauseScreen, false);
    toggleScreen(gameoverScreen, false);
    toggleScreen(victoryScreen, false);
    toggleScreen(hud, true);

    score = 0;
    stage = 1;
    lives = 3;
    energy = 100;
    enemiesDefeatedInStage = 0;
    waveTimer = 0;
    boss = null;

    player = {
        x: canvas.width / 2 - 20,
        y: canvas.height - 80,
        width: 40,
        height: 40,
        speed: 5,
        weaponLevel: 1, // 1: Simples, 2: Duplo, 3: Triplo, 4: Mísseis
        shield: false,
        shieldTimer: 0,
        invulnerable: 0,
        shootCooldown: 0
    };

    enemies = [];
    bullets = [];
    enemyBullets = [];
    particles = [];
    powerUps = [];

    initStars();

    gameState = 'PLAYING';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 0.5
        });
    }
}

// ==========================================
// LOOP PRINCIPAL DO JOGO
// ==========================================
let lastTime = 0;

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// ATUALIZAÇÃO DA LÓGICA
// ==========================================
function update(dt) {
    // Movimento do Fundo (Estrelas)
    stars.forEach(star => {
        star.y += star.speed * (stage * 0.5 + 1);
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    // Movimentação do Jogador
    let currentSpeed = player.speed;
    if (keys['ShiftLeft'] || keys['ShiftRight']) currentSpeed *= 0.5; // Precisão

    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) {
        player.x -= currentSpeed;
    }
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.width) {
        player.x += currentSpeed;
    }
    if ((keys['ArrowUp'] || keys['KeyW']) && player.y > 50) {
        player.y -= currentSpeed;
    }
    if ((keys['ArrowDown'] || keys['KeyS']) && player.y < canvas.height - player.height - 10) {
        player.y += currentSpeed;
    }

    // Cooldown de Disparo do Jogador
    if (player.shootCooldown > 0) player.shootCooldown -= dt;

    if (keys['Space'] && player.shootCooldown <= 0) {
        shootPlayerBullets();
        player.shootCooldown = 0.15;
    }

    // Habilidade Especial / Bomba (Tecla X)
    if (keys['KeyX'] && energy >= 100) {
        activateSpecialBomb();
    }

    // Invulnerabilidade e Escudo
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.shield) {
        player.shieldTimer -= dt;
        if (player.shieldTimer <= 0) player.shield = false;
    }

    // Sistema de Ondas e Spawns de Inimigos
    if (!boss) {
        waveTimer += dt;
        if (waveTimer > 1.5 && enemies.length < 8 && enemiesDefeatedInStage < stageSpawnCount) {
            spawnEnemy();
            waveTimer = 0;
        }

        // Checar fim da fase para invocar Chefe
        if (enemiesDefeatedInStage >= stageSpawnCount && enemies.length === 0) {
            spawnBoss();
        }
    }

    // Atualizar Inimigos
    enemies.forEach(enemy => {
        enemy.update(player);
    });

    // Atualizar Chefe
    if (boss) {
        boss.update();
    }

    // Atualizar Tiros do Jogador
    bullets.forEach((bullet, index) => {
        bullet.y += bullet.vy;
        bullet.x += bullet.vx || 0;
        if (bullet.y < -20 || bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(index, 1);
        }
    });

    // Atualizar Tiros dos Inimigos
    enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.vy;
        bullet.x += bullet.vx;
        if (bullet.y > canvas.height + 20 || bullet.y < -20 || bullet.x < -20 || bullet.x > canvas.width + 20) {
            enemyBullets.splice(index, 1);
        }
    });

    // Atualizar Power-ups
    powerUps.forEach((p, index) => {
        p.y += 2;
        if (p.y > canvas.height) {
            powerUps.splice(index, 1);
        }
        // Colisão com Jogador
        if (checkCollision(player, p)) {
            playSound('powerup');
            applyPowerUp(p.type);
            powerUps.splice(index, 1);
        }
    });

    // Atualizar Partículas
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(index, 1);
        }
    });

    // Detecção de Colisões: Tiros do Jogador vs Inimigos / Chefe
    bullets.forEach((bullet, bIndex) => {
        // Checar Chefe
        if (boss && checkCollision(bullet, boss)) {
            boss.hp -= bullet.damage;
            bullets.splice(bIndex, 1);
            createParticles(bullet.x, bullet.y, '#00f3ff', 5);
            playSound('hit');

            if (boss.hp <= 0) {
                destroyBoss();
            }
            return;
        }

        // Checar Inimigos Comuns
        enemies.forEach((enemy, eIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.hp -= bullet.damage;
                bullets.splice(bIndex, 1);
                createParticles(bullet.x, bullet.y, '#ff007f', 5);
                playSound('hit');

                if (enemy.hp <= 0) {
                    destroyEnemy(eIndex);
                }
            }
        });
    });

    // Detecção de Colisões: Tiros Inimigos vs Jogador
    if (player.invulnerable <= 0 && !player.shield) {
        enemyBullets.forEach((bullet, index) => {
            if (checkCollision(bullet, player)) {
                enemyBullets.splice(index, 1);
                damagePlayer();
            }
        });

        enemies.forEach((enemy, index) => {
            if (checkCollision(enemy, player)) {
                enemies.splice(index, 1);
                damagePlayer();
            }
        });

        if (boss && checkCollision(boss, player)) {
            damagePlayer();
        }
    }

    // Atualizar HUD na Tela
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    stageEl.textContent = stage;
    energyFill.style.width = energy + '%';
}

// ==========================================
// CLASSE E TIPOS DE INIMIGOS
// ==========================================
class Enemy {
    constructor(type) {
        this.type = type;
        this.width = 35;
        this.height = 35;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -40;
        this.shootTimer = Math.random() * 2;

        switch (type) {
            case 'common':
                this.hp = 1;
                this.speed = 2;
                this.scoreValue = 100;
                this.color = '#ff3366';
                break;
            case 'fast':
                this.width = 25;
                this.height = 25;
                this.hp = 1;
                this.speed = 4.5;
                this.scoreValue = 150;
                this.color = '#ffff33';
                break;
            case 'shooter':
                this.hp = 2;
                this.speed = 1.5;
                this.scoreValue = 200;
                this.color = '#ff9900';
                break;
            case 'tank':
                this.width = 50;
                this.height = 50;
                this.hp = 5;
                this.speed = 1;
                this.scoreValue = 400;
                this.color = '#9933ff';
                break;
            case 'chaser':
                this.hp = 2;
                this.speed = 2;
                this.scoreValue = 250;
                this.color = '#00ffcc';
                break;
        }
    }

    update(playerRef) {
        if (this.type === 'chaser') {
            if (this.x < playerRef.x) this.x += 1.2;
            if (this.x > playerRef.x) this.x -= 1.2;
            this.y += this.speed;
        } else {
            this.y += this.speed;
        }

        // Comportamento de tiro
        if (this.type === 'shooter' || this.type === 'tank') {
            this.shootTimer += 0.016;
            if (this.shootTimer > 2) {
                enemyBullets.push({
                    x: this.x + this.width / 2 - 3,
                    y: this.y + this.height,
                    width: 6,
                    height: 12,
                    vx: 0,
                    vy: 4
                });
                this.shootTimer = 0;
            }
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

function spawnEnemy() {
    let types = ['common', 'common', 'fast'];
    if (stage >= 2) types.push('shooter');
    if (stage >= 3) types.push('chaser');
    if (stage >= 4) types.push('tank');

    let chosenType = types[Math.floor(Math.random() * types.length)];
    enemies.push(new Enemy(chosenType));
}

// ==========================================
// CHEFES DE FASE
// ==========================================
class Boss {
    constructor(stageNum) {
        this.x = canvas.width / 2 - 60;
        this.y = -120;
        this.width = 120;
        this.height = 80;
        this.maxHp = 50 + stageNum * 30;
        this.hp = this.maxHp;
        this.speedX = 2;
        this.targetY = 80;
        this.shootTimer = 0;
        this.stageNum = stageNum;
    }

    update() {
        if (this.y < this.targetY) {
            this.y += 1;
            return;
        }

        this.x += this.speedX;
        if (this.x <= 20 || this.x >= canvas.width - this.width - 20) {
            this.speedX *= -1;
        }

        this.shootTimer += 0.016;
        if (this.shootTimer > 1.2) {
            // Padrão triplo de tiros do chefe
            for (let i = -1; i <= 1; i++) {
                enemyBullets.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height,
                    width: 8,
                    height: 14,
                    vx: i * 2,
                    vy: 3.5
                });
            }
            this.shootTimer = 0;
        }
    }

    draw() {
        // Desenhar Chefe
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        // Barra de Vida do Chefe
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(canvas.width / 2 - 150, 20, 300, 15);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(canvas.width / 2 - 150, 20, (this.hp / this.maxHp) * 300, 15);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(canvas.width / 2 - 150, 20, 300, 15);
    }
}

function spawnBoss() {
    boss = new Boss(stage);
}

function destroyBoss() {
    createParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ff0055', 50);
    playSound('explosion');
    score += 2000;
    boss = null;
    enemiesDefeatedInStage = 0;

    if (stage < 5) {
        stage++;
        stageSpawnCount += 5;
    } else {
        triggerVictory();
    }
}

function destroyEnemy(index) {
    let enemy = enemies[index];
    createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 15);
    playSound('explosion');
    score += enemy.scoreValue;
    energy = Math.min(100, energy + 5);

    // Chance de soltar Power-up (25%)
    if (Math.random() < 0.25) {
        let pTypes = ['double', 'triple', 'shield', 'missile'];
        let pType = pTypes[Math.floor(Math.random() * pTypes.length)];
        powerUps.push({
            x: enemy.x + enemy.width / 2 - 10,
            y: enemy.y,
            width: 20,
            height: 20,
            type: pType
        });
    }

    enemies.splice(index, 1);
    enemiesDefeatedInStage++;
}

// ==========================================
// DISPAROS E ARMAS DO JOGADOR
// ==========================================
function shootPlayerBullets() {
    playSound('shoot');
    let dmg = 1;

    if (player.weaponLevel === 1) {
        bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 16, vy: -10, damage: dmg });
    } else if (player.weaponLevel === 2) {
        bullets.push({ x: player.x + 5, y: player.y, width: 6, height: 16, vy: -10, damage: dmg });
        bullets.push({ x: player.x + player.width - 11, y: player.y, width: 6, height: 16, vy: -10, damage: dmg });
    } else if (player.weaponLevel === 3) {
        bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 16, vy: -10, damage: dmg });
        bullets.push({ x: player.x, y: player.y + 10, width: 6, height: 14, vy: -10, vx: -1, damage: dmg });
        bullets.push({ x: player.x + player.width - 6, y: player.y + 10, width: 6, height: 14, vy: -10, vx: 1, damage: dmg });
    } else if (player.weaponLevel >= 4) {
        bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 8, height: 18, vy: -12, damage: 2 });
        bullets.push({ x: player.x, y: player.y + 5, width: 6, height: 14, vy: -10, vx: -2, damage: 1 });
        bullets.push({ x: player.x + player.width - 6, y: player.y + 5, width: 6, height: 14, vy: -10, vx: 2, damage: 1 });
    }
}

// ==========================================
// POWER-UPS E BOMBA ESPECIAL
// ==========================================
function applyPowerUp(type) {
    if (type === 'double') player.weaponLevel = 2;
    if (type === 'triple') player.weaponLevel = 3;
    if (type === 'missile') player.weaponLevel = 4;
    if (type === 'shield') {
        player.shield = true;
        player.shieldTimer = 10; // 10 segundos de escudo
    }
}

function activateSpecialBomb() {
    energy = 0;
    playSound('explosion');
    createParticles(canvas.width / 2, canvas.height / 2, '#00f3ff', 100);

    // Destruir todos os inimigos comuns na tela
    enemies.forEach(e => {
        score += e.scoreValue;
    });
    enemies = [];
    enemyBullets = [];

    if (boss) {
        boss.hp -= 30;
        if (boss.hp <= 0) destroyBoss();
    }
}

// ==========================================
// DANO E GAME OVER
// ==========================================
function damagePlayer() {
    if (player.shield) {
        player.shield = false;
        return;
    }
    lives--;
    player.invulnerable = 2; // 2 segundos de invulnerabilidade
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff3333', 25);
    playSound('hit');

    if (lives <= 0) {
        triggerGameOver();
    }
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    toggleScreen(hud, false);
    finalScoreEl.textContent = score;
    toggleScreen(gameoverScreen, true);

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('galactic_highscore', highscore);
        highscoreEl.textContent = highscore;
    }
}

function triggerVictory() {
    gameState = 'VICTORY';
    toggleScreen(hud, false);
    victoryScoreEl.textContent = score;
    toggleScreen(victoryScreen, true);

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('galactic_highscore', highscore);
        highscoreEl.textContent = highscore;
    }
}

// ==========================================
// SISTEMA DE PARTÍCULAS
// ==========================================
function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 1,
            color: color,
            life: Math.random() * 0.5 + 0.3
        });
    }
}

// ==========================================
// DETECÇÃO DE COLISÃO (AABB)
// ==========================================
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// ==========================================
// RENDERIZAÇÃO (CANVAS)
// ==========================================
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Renderizar Fundo / Estrelas
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;

    // Renderizar Partículas
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // Renderizar Power-ups
    powerUps.forEach(p => {
        ctx.fillStyle = '#33ff66';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#33ff66';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;
    });

    // Renderizar Tiros do Jogador
    ctx.fillStyle = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // Renderizar Tiros dos Inimigos
    ctx.fillStyle = '#ff3366';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff3366';
    enemyBullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    ctx.shadowBlur = 0;

    // Renderizar Inimigos
    enemies.forEach(e => e.draw());

    // Renderizar Chefe
    if (boss) boss.draw();

    // Renderizar Jogador
    if (player.invulnerable <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';

        // Desenho estilizado da nave (forma triangular)
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.closePath();
        ctx.fill();

        // Propulsor
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(player.x + player.width / 2 - 4, player.y + player.height, 8, 8);

        // Escudo Ativo
        if (player.shield) {
            ctx.strokeStyle = '#33ccff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
    }
}