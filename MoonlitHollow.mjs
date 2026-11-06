import {LEVELS, WIDTH, HEIGHT} from "./constants.mjs";
import {LevelAmbience} from "./LevelAmbience.mjs";

export class MoonlitHollow extends Phaser.Scene {
    constructor() {
        super("MoonlitHollow");
        // These values are shared across levels and updated as the player progresses.
        this.levelIndex = 0;
        this.score = 0;
        this.lives = 2;
        this.deaths = 0;
        this.totalTimeSeconds = 0;
        this.invulnerableUntil = 0;
        this.finished = false;

        this.ambience = new LevelAmbience(
        document.querySelector("#audioStatus")
        );

        // Browsers may pause audio until the player interacts with the page.
        this.resumeAmbience = () => {
        if (this.ambience.enabled && !this.ambience.isRunning()) {
            this.ambience.start().catch(error => this.ambience.showStartError(error));
        }
    };
    window.addEventListener("pointerdown", this.resumeAmbience, { passive: true });
    window.addEventListener("keydown", this.resumeAmbience);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.resumeAmbience();
    });
    this.ambience.start().catch(error => this.ambience.showStartError(error));
    }

    create() {
        // Connect the game to its HTML status labels and prepare controls and assets.
        this.levelLabel = document.querySelector("#levelDisplay");
        this.soulsLabel = document.querySelector("#collectibleDisplay");
        this.scoreLabel = document.querySelector("#gameScoreDisplay");
        this.livesLabel = document.querySelector("#livesDisplay");
        this.deathsLabel = document.querySelector("#deathDisplay");
        this.levelTimeLabel = document.querySelector("#levelTimeDisplay");
        this.message = document.querySelector("#gameMessage");
        this.game.canvas.tabIndex = 0;
        this.game.canvas.addEventListener("pointerdown", () => this.game.canvas.focus());
        this.createTextures();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("A,D,W");
        this.loadLevel();
        document.querySelector("#restartGame").onclick = () => {
            // Restart all game progress before recreating the first level.
            this.levelIndex = 0;
            this.score = 0;
            this.lives = 2;
            this.deaths = 0;
            this.totalTimeSeconds = 0;
            this.invulnerableUntil = 0;
            this.lastLevelSummary = "";
            this.finished = false;
            this.scene.restart();
        };
    }

    createTextures() {
        // Draw simple game sprites once so each level can reuse them.
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        graphics.fillStyle(0xf3d58b, 1);
        graphics.fillCircle(12, 12, 10);
        graphics.fillStyle(0xfff2c6, 1);
        graphics.fillCircle(12, 12, 6);
        graphics.generateTexture("lost-soul", 24, 24);
        graphics.clear();

        graphics.fillStyle(0xb6ddcf, 1);
        graphics.fillRoundedRect(3, 2, 36, 31, 12);
        graphics.fillStyle(0x18202a, 1);
        graphics.fillCircle(14, 15, 3);
        graphics.fillCircle(28, 15, 3);
        graphics.fillStyle(0xb6ddcf, 1);
        graphics.fillTriangle(3, 27, 13, 25, 6, 35);
        graphics.fillTriangle(21, 30, 31, 25, 28, 35);
        graphics.generateTexture("wandering-spirit", 42, 38);
        graphics.clear();

        graphics.fillStyle(0xd8bf8c, 1);
        graphics.fillRoundedRect(8, 5, 20, 33, 5);
        graphics.fillStyle(0x432f2e, 1);
        graphics.fillCircle(14, 17, 2);
        graphics.fillCircle(22, 17, 2);
        graphics.fillStyle(0xf1ba71, 1);
        graphics.fillCircle(18, 26, 3);
        graphics.fillStyle(0x382b33, 1);
        graphics.fillRect(6, 36, 24, 6);
        graphics.generateTexture("traveller", 36, 44);
        graphics.clear();

        graphics.fillStyle(0xd9a7ff, 0.18);
        graphics.fillEllipse(29, 43, 50, 74);
        graphics.fillStyle(0x9a65c9, 0.9);
        graphics.fillEllipse(29, 43, 35, 62);
        graphics.lineStyle(4, 0xf0d2ff, 0.8);
        graphics.strokeEllipse(29, 43, 35, 62);
        graphics.fillStyle(0x21132e, 1);
        graphics.fillEllipse(29, 46, 21, 46);
        graphics.generateTexture("moon-gate", 58, 86);
        graphics.clear();

        graphics.fillStyle(0x79664e, 1);
        graphics.fillRoundedRect(0, 0, 64, 18, 4);
        graphics.fillStyle(0xc6a775, 0.65);
        graphics.fillRect(4, 2, 56, 3);
        graphics.fillStyle(0x423b43, 1);
        graphics.fillRect(4, 15, 56, 3);
        graphics.generateTexture("stone-platform", 64, 18);
        graphics.destroy();
    }

    loadLevel() {
        // Remove the previous level's objects and physics links before rebuilding.
        if (this.platformCollider) this.physics.world.removeCollider(this.platformCollider);
        if (this.soulCollider) this.physics.world.removeCollider(this.soulCollider);
        if (this.spiritCollider) this.physics.world.removeCollider(this.spiritCollider);
        if (this.gateOverlap) this.physics.world.removeCollider(this.gateOverlap);
        if (this.gateZone) this.gateZone.destroy();
        if (this.platforms) this.platforms.destroy(true);
        if (this.souls) this.souls.destroy(true);
        if (this.spirits) this.spirits.destroy(true);
        if (this.gate) this.gate.destroy();
        if (this.player) this.player.destroy();
        if (this.scenery) this.scenery.destroy();

        const level = LEVELS[this.levelIndex];
        this.ambience.setLevel(this.levelIndex);
        this.remaining = level.souls.length;
        this.finished = false;
        // Match the world and camera bounds to this level's width.
        this.physics.world.setBounds(0, 0, level.width, HEIGHT);
        this.cameras.main.setBounds(0, 0, level.width, HEIGHT);
        this.cameras.main.setBackgroundColor(level.color);
        this.drawScenery(level.width);

        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(level.width / 2, 525, "stone-platform")
            .setDisplaySize(level.width, 90).refreshBody();
        // Build platforms, collectibles, and moving enemies from the level data.
        level.platforms.forEach(([x, y, width]) => {
            const slightlyWiderPlatform = width + 10;
            this.platforms.create(x + width / 2, y + 9, "stone-platform")
                .setDisplaySize(slightlyWiderPlatform, 18).refreshBody();
        });

        this.souls = this.physics.add.staticGroup();
        level.souls.forEach(([x, y]) => this.souls.create(x, y, "lost-soul"));
        this.spirits = this.physics.add.group({ allowGravity: false, immovable: true });
        level.spirits.forEach(([x, y, left, right], index) => {
            const spirit = this.spirits.create(x, y, "wandering-spirit");
            spirit.setData({ left, right });
            spirit.setVelocityX(index % 2 === 0 ? 65 : -65);
            spirit.setDepth(2);
        });

        this.gate = this.add.image(level.width - 72, 452, "moon-gate").setAlpha(0.45);
        this.tweens.add({
            targets: this.gate,
            scale: { from: 0.93, to: 1.05 },
            duration: 900,
            yoyo: true,
            repeat: -1
        });
        this.gateZone = this.add.zone(level.width - 72, 462, 48, 68);
        this.physics.add.existing(this.gateZone, true);

        // Create the player and connect collisions to their game actions.
        this.player = this.physics.add.sprite(70, 445, "traveller");
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(3);
        this.player.body.setSize(22, 36).setOffset(7, 6);
        this.player.setMaxVelocity(260, 700);
        this.player.setGravityY(1100);
        this.platformCollider = this.physics.add.collider(this.player, this.platforms);
        this.soulCollider = this.physics.add.overlap(this.player, this.souls, this.collectSoul, undefined, this);
        this.spiritCollider = this.physics.add.overlap(this.player, this.spirits, this.hitSpirit, undefined, this);
        this.gateOverlap = this.physics.add.overlap(this.player, this.gateZone, () => {
            if (this.remaining === 0) this.advanceLevel();
            else this.setMessage(`The gate is sealed. Find ${this.remaining} more lost soul${this.remaining === 1 ? "" : "s"}.`);
        });

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        // Reset the level timer and refresh the on-screen information.
        this.levelLabel.textContent = `Level ${this.levelIndex + 1} of ${LEVELS.length}: ${level.name}`;
        this.levelStartedAt = this.time.now;
        this.displayedLevelSeconds = 0;
        this.updateHud();
        this.setMessage(this.lastLevelSummary
            ? `${this.lastLevelSummary} Find every lost soul, then step into the moon gate.`
            : "Find every lost soul, then step into the moon gate.");
        this.persistScore();
    }

    drawScenery(width) {
        // Add a moon, stars, distant hills, and grave markers behind the platforms.
        this.scenery = this.add.graphics().setDepth(-1);
        this.scenery.fillStyle(0xf2d9aa, 0.78);
        this.scenery.fillCircle(width - 195, 92, 42);
        this.scenery.fillStyle(0x171a27, 0.48);
        this.scenery.fillCircle(width - 211, 83, 39);
        for (let i = 0; i < width / 90; i += 1) {
            const x = 35 + i * 90;
            const y = 65 + ((i * 47) % 175);
            this.scenery.fillStyle(0xe7e4d3, 0.55);
            this.scenery.fillCircle(x, y, i % 3 === 0 ? 2 : 1);
            this.scenery.fillStyle(0x090c15, 0.48);
            this.scenery.fillTriangle(x - 40, 495, x + 15, 300 + ((i * 31) % 95), x + 75, 495);
            if (i % 3 === 0) {
                this.scenery.fillStyle(0x62626c, 0.6);
                this.scenery.fillRoundedRect(x + 8, 465, 14, 25, 5);
                this.scenery.fillRect(x + 3, 472, 24, 5);
            }
        }
    }

    update() {
        // Phaser calls this repeatedly; handle movement and update enemies and timer.
        if (!this.player || this.finished || !this.player.active) return;
        const left = this.cursors.left.isDown || this.keys.A.isDown;
        const right = this.cursors.right.isDown || this.keys.D.isDown;
        const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
            Phaser.Input.Keyboard.JustDown(this.keys.W);

        if (left === right) this.player.setVelocityX(0);
        else this.player.setVelocityX(left ? -220 : 220);

        if (jump && this.player.body.blocked.down) {
            this.player.setVelocityY(-500);
        }

        this.spirits.getChildren().forEach(spirit => {
            if (spirit.x <= spirit.getData("left")) spirit.setVelocityX(Math.abs(spirit.body.velocity.x));
            if (spirit.x >= spirit.getData("right")) spirit.setVelocityX(-Math.abs(spirit.body.velocity.x));
        });

        const levelSeconds = Math.floor((this.time.now - this.levelStartedAt) / 1000);
        if (levelSeconds !== this.displayedLevelSeconds) {
            this.displayedLevelSeconds = levelSeconds;
            this.updateHud();
        }
    }

    collectSoul(_player, soul) {
        // Remove collected souls, award points, and open the gate when none remain.
        soul.destroy();
        this.remaining -= 1;
        this.score += 100;
        if (this.remaining === 0) this.gate.setAlpha(1);
        this.persistScore();
        this.updateHud();
        this.setMessage(this.remaining === 0
            ? "All souls found! The moon gate is open."
            : `A lost soul found! ${this.remaining} left in this level.`);
    }

    hitSpirit() {
        // Apply damage once per short invulnerability period and reset the player.
        if (this.time.now < this.invulnerableUntil || this.finished) return;
        this.invulnerableUntil = this.time.now + 1300;
        this.lives -= 1;
        this.deaths += 1;
        this.score = Math.max(0, this.score - 50);
        this.updateHud();
        this.persistScore();
        this.player.setPosition(70, 445);
        this.player.setVelocity(0, 0);
        this.player.setTint(0xff7777);
        this.time.delayedCall(900, () => {
            if (this.player?.active) this.player.clearTint();
        });
        if (this.lives <= 0) {
            this.finished = true;
            this.setMessage(`The spirits caught you. Final score: ${this.score}. Restart to try again.`);
            return;
        }
        this.setMessage(`A spirit caught you! ${this.lives} lantern${this.lives === 1 ? "" : "s"} remain.`);
    }

    advanceLevel() {
        // Award a time bonus, then load the next level or finish the game.
        if (this.finished) return;
        const levelTimeSeconds = Math.floor((this.time.now - this.levelStartedAt) / 1000);
        const timeBonus = Math.max(0, 300 - levelTimeSeconds * 5);
        this.totalTimeSeconds += levelTimeSeconds;
        this.score += timeBonus;
        this.lastLevelSummary = `Level complete in ${this.formatTime(levelTimeSeconds)}! +${timeBonus} time bonus.`;
        this.updateHud();

        if (this.levelIndex === LEVELS.length - 1) {
            this.finished = true;
            this.persistScore(true);
            this.setMessage(`You escaped the Haunted Keep! ${this.lastLevelSummary} Final score: ${this.score}. Your score is saved.`);
            return;
        }
        this.levelIndex += 1;
        this.setMessage(`Entering ${LEVELS[this.levelIndex].name}...`);
        this.loadLevel();
    }

    persistScore(completed = false) {
        // Save the current run and update the signed-in user's best score.
        try {
            localStorage.setItem("spookyGameScore", String(this.score));
            localStorage.setItem("spookyGameLevel", String(this.levelIndex + 1));
            localStorage.setItem("spookyGameCompleted", String(completed));
            const currentLevelSeconds = Math.floor((this.time.now - this.levelStartedAt) / 1000);
            localStorage.setItem("spookyGameDeaths", String(this.deaths));
            localStorage.setItem("spookyGameTime", String(this.totalTimeSeconds + (completed ? 0 : currentLevelSeconds)));
            const currentEmail = localStorage.getItem("currentUser");
            const savedUsers = localStorage.getItem("users");
            if (currentEmail && savedUsers) {
                const users = JSON.parse(savedUsers);
                const user = users.find(savedUser => savedUser.email === currentEmail);
                if (user) {
                    user.highScore = Math.max(Number(user.highScore) || 0, this.score);
                    localStorage.setItem("users", JSON.stringify(users));
                }
            }
        } catch (error) {
            this.setMessage(`Could not save your score in this browser: ${error.message}`);
        }
    }

    updateHud() {
        // Keep the labels in the page synchronized with the current game state.
        this.soulsLabel.textContent = `Lost souls: ${LEVELS[this.levelIndex].souls.length - this.remaining} / ${LEVELS[this.levelIndex].souls.length}`;
        this.scoreLabel.textContent = `Score: ${this.score}`;
        this.livesLabel.textContent = `Lanterns: ${this.lives}`;
        this.deathsLabel.textContent = `Deaths: ${this.deaths}`;
        this.levelTimeLabel.textContent = `Level time: ${this.formatTime(Math.floor((this.time.now - this.levelStartedAt) / 1000))}`;
    }

    formatTime(seconds) {
        // Convert a duration in seconds to minutes and zero-padded seconds.
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }

    setMessage(text) {
        this.message.textContent = text;
    }
}
