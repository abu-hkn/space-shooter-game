// Space Shooter Game - Main Game Logic
// ====================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game States
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

// Game Variables
let gameState = GAME_STATE.MENU;
let score = 0;
let lives = 3;
let wave = 1;
let waveEnemyCount = 5 + (wave - 1) * 3;
let enemiesDefeated = 0;
let isBossWave = false;
let gameSpeed = 1;

// Input Handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
        if (gameState === GAME_STATE.PLAYING) {
            gameState = GAME_STATE.PAUSED;
            showPauseScreen();
        } else if (gameState === GAME_STATE.PAUSED) {
            gameState = GAME_STATE.PLAYING;
            hidePauseScreen();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Player Ship
class Player {
    constructor() {
        this.x = canvas.width / 2 - 20;
        this.y = canvas.height - 60;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.shootCooldown = 0;
        this.shootDelay = 8;
        this.powerUpActive = null;
        this.powerUpTimer = 0;
    }

    update() {
        // Movement
        if (keys['ArrowLeft'] || keys['a']) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (keys['ArrowRight'] || keys['d']) {
            this.x = Math.min(canvas.width - this.width, this.x + this.speed);
        }
        if (keys['ArrowUp'] || keys['w']) {
            this.y = Math.max(0, this.y - this.speed);
        }
        if (keys['ArrowDown'] || keys['s']) {
            this.y = Math.min(canvas.height - this.height, this.y + this.speed);
        }

        // Shooting
        if (keys[' '] && gameState === GAME_STATE.PLAYING) {
            this.shoot();
        }

        // Cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // Power-up timer
        if (this.powerUpActive && this.powerUpTimer > 0) {
            this.powerUpTimer--;
        } else if (this.powerUpTimer <= 0) {
            this.powerUpActive = null;
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            if (this.powerUpActive === 'triple') {
                // Triple shot
                bullets.push(new Bullet(this.x + 10, this.y, 0, -7));
                bullets.push(new Bullet(this.x + this.width - 10, this.y, 0, -7));
                bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -7));
            } else if (this.powerUpActive === 'rapid') {
                // Rapid fire
                bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -7));
                this.shootDelay = 3;
                this.shootCooldown = this.shootDelay;
                return;
            } else {
                // Normal shot
                bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -7));
            }

            this.shootCooldown = this.shootDelay;
        }
    }

    draw() {
        // Ship body
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width - 8, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width / 2, this.y + 15);
        ctx.lineTo(this.x + 8, this.y + this.height - 5);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Glow effect
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Engine flame
        ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
        ctx.fillRect(this.x + 8, this.y + this.height - 3, this.width - 16, 5);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.fillRect(this.x + 10, this.y + this.height - 2, this.width - 20, 2);

        // Health bar
        this.drawHealthBar();

        // Power-up indicator
        if (this.powerUpActive) {
            ctx.fillStyle = this.powerUpActive === 'triple' ? '#ffff00' : '#00ffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.powerUpActive.toUpperCase(), this.x + this.width / 2, this.y - 10);
        }
    }

    drawHealthBar() {
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 10;

        // Background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        ctx.fillStyle = this.health > 50 ? '#00ff88' : this.health > 25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);

        // Border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            return false; // Dead
        }
        return true; // Still alive
    }

    activatePowerUp(type) {
        this.powerUpActive = type;
        this.powerUpTimer = 300; // 5 seconds at 60 FPS
        if (type === 'rapid') {
            this.shootDelay = 3;
        } else {
            this.shootDelay = 8;
        }
    }

    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
}

// Bullet
class Bullet {
    constructor(x, y, velocityX = 0, velocityY = -7) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.damage = 10;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw() {
        // Bullet glow
        ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
        ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        // Inner bright part
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x + 1, this.y + 2, this.width - 2, this.height - 4);
    }

    isOffScreen() {
        return this.y < 0 || this.y > canvas.height || this.x < 0 || this.x > canvas.width;
    }
}

// Enemy
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.health = 25;
        this.maxHealth = 25;
        this.type = type;
        this.speed = 2 + Math.random();
        this.shootCooldown = Math.random() * 60 + 30;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.movePattern = 'sine';
        this.moveCounter = 0;

        if (type === 'fighter') {
            this.speed = 3;
            this.health = 40;
            this.maxHealth = 40;
        } else if (type === 'tank') {
            this.speed = 1;
            this.health = 60;
            this.maxHealth = 60;
            this.width = 40;
            this.height = 40;
        }
    }

    update() {
        // Movement pattern
        this.moveCounter++;
        
        if (this.movePattern === 'sine') {
            this.x += Math.sin(this.moveCounter * 0.05) * 0.5;
        } else if (this.movePattern === 'zigzag') {
            this.x += this.direction;
            if (this.x < 50 || this.x > canvas.width - 50) {
                this.direction *= -1;
            }
        }

        this.y += this.speed;
        this.shootCooldown--;

        // Shoot towards player
        if (this.shootCooldown <= 0 && this.y > 50) {
            this.shoot();
            this.shootCooldown = 60 + Math.random() * 40;
        }
    }

    shoot() {
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const dy = player.y + player.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const vx = (dx / distance) * 3;
        const vy = (dy / distance) * 3;
        
        enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, vx, vy));
    }

    draw() {
        // Enemy color based on type
        let color = '#ff4444';
        if (this.type === 'fighter') color = '#ff6600';
        if (this.type === 'tank') color = '#ff0000';

        // Main body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.strokeStyle = `rgba(255, 68, 68, 0.5)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 8, this.y + 8, 5, 5);
        ctx.fillRect(this.x + 17, this.y + 8, 5, 5);

        // Health bar
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(this.x, this.y - 8, this.width, 3);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x, this.y - 8, this.width * (this.health / this.maxHealth), 3);
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }

    isOffScreen() {
        return this.y > canvas.height;
    }
}

// Boss Enemy
class Boss {
    constructor() {
        this.x = canvas.width / 2 - 40;
        this.y = 50;
        this.width = 80;
        this.height = 80;
        this.health = 500;
        this.maxHealth = 500;
        this.speed = 1.5;
        this.shootCooldown = 0;
        this.shootDelay = 20;
        this.moveCounter = 0;
        this.pattern = 'circle';
        this.patternCounter = 0;
    }

    update() {
        // Movement pattern
        this.moveCounter++;
        const centerX = canvas.width / 2;
        
        if (this.pattern === 'circle') {
            const radius = 150;
            this.x = centerX + Math.cos(this.moveCounter * 0.02) * radius - this.width / 2;
            this.y = 50 + Math.sin(this.moveCounter * 0.02) * 50;
        } else if (this.pattern === 'zigzag') {
            this.x = centerX + Math.sin(this.moveCounter * 0.05) * 200 - this.width / 2;
            this.y = 50 + (this.moveCounter * 0.5) % 150;
        }

        // Boundary checking
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));

        // Shooting pattern - multiple directions
        this.shootCooldown--;
        if (this.shootCooldown <= 0) {
            this.shootPattern();
            this.shootCooldown = this.shootDelay;
        }

        // Change pattern every 300 frames
        this.patternCounter++;
        if (this.patternCounter > 300) {
            this.pattern = this.pattern === 'circle' ? 'zigzag' : 'circle';
            this.patternCounter = 0;
        }
    }

    shootPattern() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Circular spray
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const vx = Math.cos(angle) * 4;
            const vy = Math.sin(angle) * 4;
            enemyBullets.push(new EnemyBullet(centerX, centerY, vx, vy));
        }
    }

    draw() {
        // Boss glow effect
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 20;

        // Main body
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Inner core
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 15, this.y + 15, this.width - 30, this.height - 30);

        // Pulsing center
        const pulse = Math.sin(Date.now() * 0.01) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 35 + pulse, this.y + 35 + pulse, 10, 10);

        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Health bar
        const barHeight = 8;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(this.x, this.y - barHeight - 5, this.width, barHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - barHeight - 5, this.width * (this.health / this.maxHealth), barHeight);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y - barHeight - 5, this.width, barHeight);

        // Boss label
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 15);
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

// Enemy Bullet
class EnemyBullet {
    constructor(x, y, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 6;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.damage = 10;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw() {
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = 'rgba(255, 68, 68, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    isOffScreen() {
        return this.y < 0 || this.y > canvas.height || this.x < 0 || this.x > canvas.width;
    }
}

// Power-up
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type; // 'triple', 'rapid', 'heal'
        this.rotation = 0;
    }

    update() {
        this.y += 2;
        this.rotation += 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        let color = '#ffff00';
        if (this.type === 'triple') color = '#ffff00';
        if (this.type === 'rapid') color = '#00ffff';
        if (this.type === 'heal') color = '#00ff88';

        // Star shape
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * 10;
            const y = Math.sin(angle) * 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Glow
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    isOffScreen() {
        return this.y > canvas.height;
    }
}

// Explosion particle
class Particle {
    constructor(x, y, color = '#ff4444') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 30;
        this.maxLife = 30;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

// Game arrays
let bullets = [];
let enemies = [];
let enemyBullets = [];
let powerUps = [];
let particles = [];
let player = new Player();
let boss = null;

// Wave management
function spawnWave() {
    enemies = [];
    enemiesDefeated = 0;

    if (wave % 5 === 0) {
        // Boss wave
        isBossWave = true;
        boss = new Boss();
    } else {
        isBossWave = false;
        waveEnemyCount = 5 + (wave - 1) * 3;

        for (let i = 0; i < waveEnemyCount; i++) {
            const x = Math.random() * (canvas.width - 30);
            const y = -30 - i * 80;
            
            let enemyType = 'basic';
            if (wave > 3 && Math.random() > 0.7) {
                enemyType = 'fighter';
            } else if (wave > 5 && Math.random() > 0.8) {
                enemyType = 'tank';
            }

            enemies.push(new Enemy(x, y, enemyType));
        }
    }
}

// Update game
function update() {
    if (gameState !== GAME_STATE.PLAYING) return;

    player.update();

    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.update();
        return !bullet.isOffScreen();
    });

    // Update enemies
    if (!isBossWave) {
        enemies = enemies.filter(enemy => {
            enemy.update();
            return !enemy.isOffScreen();
        });

        // Check collision: player bullets vs enemies
        bullets.forEach(bullet => {
            enemies.forEach(enemy => {
                if (collision(bullet, enemy)) {
                    if (enemy.takeDamage(bullet.damage)) {
                        // Enemy defeated
                        score += 100;
                        enemiesDefeated++;
                        
                        // Particles
                        for (let i = 0; i < 8; i++) {
                            particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff4444'));
                        }

                        // Random power-up drop
                        if (Math.random() < 0.15) {
                            const types = ['triple', 'rapid', 'heal'];
                            const type = types[Math.floor(Math.random() * types.length)];
                            powerUps.push(new PowerUp(enemy.x, enemy.y, type));
                        }

                        enemies.splice(enemies.indexOf(enemy), 1);
                    }
                    bullets.splice(bullets.indexOf(bullet), 1);
                }
            });
        });

        // Check if wave cleared
        if (enemiesDefeated >= waveEnemyCount && enemies.length === 0) {
            wave++;
            spawnWave();
        }
    } else {
        // Boss wave
        if (boss) {
            boss.update();

            // Check collision: player bullets vs boss
            bullets = bullets.filter(bullet => {
                let hit = false;
                if (collision(bullet, boss)) {
                    if (boss.takeDamage(bullet.damage)) {
                        // Boss defeated
                        score += 5000;
                        gameState = GAME_STATE.VICTORY;
                        showVictoryScreen();
                    } else {
                        // Particles
                        for (let i = 0; i < 5; i++) {
                            particles.push(new Particle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ffaa00'));
                        }
                    }
                    hit = true;
                }
                return !hit;
            });
        }
    }

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        
        // Check collision with player
        if (collision(bullet, player)) {
            if (!player.takeDamage(bullet.damage)) {
                lives--;
                updateHUD();
                if (lives <= 0) {
                    gameState = GAME_STATE.GAME_OVER;
                    showGameOverScreen();
                } else {
                  