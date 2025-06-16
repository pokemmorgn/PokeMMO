// src/game/PlayerManager.js - Version BoyWalk CORRIGÉE

export class PlayerManager {
constructor(scene) {
this.scene = scene;
this.players = new Map();
this.mySessionId = null;
this.isDestroyed = false;
this.animsCreated = false;
console.log(“PlayerManager initialisé pour”, scene.scene.key);
}

setMySessionId(sessionId) {
this.mySessionId = sessionId;
console.log(“Mon sessionId défini :”, sessionId);
}

getMyPlayer() {
if (this.isDestroyed) return null;
const player = this.players.get(this.mySessionId);
return player || null;
}

createPlayer(sessionId, x, y) {
if (this.isDestroyed) {
console.warn(“PlayerManager détruit, création de joueur ignorée”);
return null;
}

```
// -- SPRITESHEET CHECK --
if (!this.scene.textures.exists('BoyWalk')) {
  console.error("❌ Spritesheet 'BoyWalk' introuvable !");
  // Placeholder rouge
  const graphics = this.scene.add.graphics();
  graphics.fillStyle(0xff0000);
  graphics.fillRect(0, 0, 16, 16);
  graphics.generateTexture('player_placeholder', 16, 16);
  graphics.destroy();
  const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1);
  player.setDepth(5);
  this.players.set(sessionId, player);
  return player;
}

// -- CRÉATION DES ANIMATIONS (1x au premier appel) --
if (!this.animsCreated) {
  this.createAnimations();
  this.animsCreated = true;
}

// -- SPRITE CREATION --
const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 0).setOrigin(0.5, 1);

// Configuration de la hitbox CORRIGÉE pour sprite 16x16
player.setOrigin(0.5, 1); // Centre bas, les pieds posés au sol
player.setScale(2); // Agrandir le sprite pour qu'il soit plus visible

// Hitbox ajustée pour un sprite 16x16 pixels
player.body.setSize(12, 8);   // Hitbox 12x8 px (plus petite que le sprite)
player.body.setOffset(2, 8);  // Décale la hitbox au niveau des pieds

// Animation par défaut
if (this.scene.anims.exists('idle_down')) {
  player.play('idle_down');
}
player.lastDirection = 'down';
player.isMoving = false;
player.sessionId = sessionId;

// Indicateur pour ton joueur
if (sessionId === this.mySessionId) {
  const indicator = this.scene.add.circle(0, -20, 3, 0x00ff00);
  indicator.setDepth(1001);
  indicator.setStrokeStyle(1, 0x004400);
  player.indicator = indicator;
  console.log("👤 Mon joueur créé avec spritesheet BoyWalk");
} else {
  console.log("👥 Autre joueur créé :", sessionId);
}

this.players.set(sessionId, player);
return player;
```

}

// – ANIMATIONS BOYWALK CORRIGÉES –
createAnimations() {
const anims = this.scene.anims;

```
// Vérifier d'abord le nombre de frames disponibles
const texture = this.scene.textures.get('BoyWalk');
const frameCount = texture.frameTotal;
console.log(`🎞️ Frames disponibles dans BoyWalk: ${frameCount}`);

// Animations de marche (en supposant 4 frames par direction)
if (!anims.exists('walk_down')) {
  anims.create({
    key: 'walk_down',
    frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1
  });
}

if (!anims.exists('walk_left')) {
  anims.create({
    key: 'walk_left',
    frames: anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }),
    frameRate: 8,
    repeat: -1
  });
}

if (!anims.exists('walk_right')) {
  anims.create({
    key: 'walk_right',
    frames: anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }),
    frameRate: 8,
    repeat: -1
  });
}

if (!anims.exists('walk_up')) {
  anims.create({
    key: 'walk_up',
    frames: anims.generateFrameNumbers('BoyWalk', { start: 12, end: 15 }),
    frameRate: 8,
    repeat: -1
  });
}

// Animations idle (première frame de chaque direction)
if (!anims.exists('idle_down')) {
  anims.create({
    key: 'idle_down',
    frames: [{ key: 'BoyWalk', frame: 0 }],
    frameRate: 1,
    repeat: 0
  });
}

if (!anims.exists('idle_left')) {
  anims.create({
    key: 'idle_left',
    frames: [{ key: 'BoyWalk', frame: 4 }],
    frameRate: 1,
    repeat: 0
  });
}

if (!anims.exists('idle_right')) {
  anims.create({
    key: 'idle_right',
    frames: [{ key: 'BoyWalk', frame: 8 }],
    frameRate: 1,
    repeat: 0
  });
}

if (!anims.exists('idle_up')) {
  anims.create({
    key: 'idle_up',
    frames: [{ key: 'BoyWalk', frame: 12 }],
    frameRate: 1,
    repeat: 0
  });
}

console.log("🎞️ Animations BoyWalk créées !");
```

}

updatePlayers(state) {
if (this.isDestroyed) {
console.warn(“PlayerManager détruit, updatePlayers ignoré”);
return;
}
if (!this.scene || !this.scene.scene.isActive()) {
console.warn(“Scène inactive, updatePlayers ignoré”);
return;
}
if (this.scene.networkManager && this.scene.networkManager.isTransitioning) {
console.log(“NetworkManager en transition, updatePlayers ignoré”);
return;
}
if (!state.players) {
console.warn(“❌ Pas de données players dans le state”);
return;
}
if (this.updateTimeout) clearTimeout(this.updateTimeout);
this.updateTimeout = setTimeout(() => {
this.performUpdate(state);
}, 16);
}

performUpdate(state) {
if (this.isDestroyed || !this.scene?.scene?.isActive()) return;

```
// Supprimer les joueurs déconnectés
const currentSessionIds = new Set();
state.players.forEach((playerState, sessionId) => {
  currentSessionIds.add(sessionId);
});

const playersToCheck = new Map(this.players);
playersToCheck.forEach((player, sessionId) => {
  if (!currentSessionIds.has(sessionId)) {
    this.removePlayer(sessionId);
  }
});

// Mettre à jour ou créer les joueurs
state.players.forEach((playerState, sessionId) => {
  if (this.isDestroyed || !this.scene?.scene?.isActive()) return;
  
  let player = this.players.get(sessionId);
  if (!player) {
    player = this.createPlayer(sessionId, playerState.x, playerState.y);
  } else {
    if (!this.scene.children.exists(player)) {
      this.players.delete(sessionId);
      player = this.createPlayer(sessionId, playerState.x, playerState.y);
      return;
    }
    
    if (sessionId === this.mySessionId) {
      // Pour mon joueur, ne pas corriger la position brutalement
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        playerState.x, playerState.y
      );
      if (distance > 50) {
        player.x = playerState.x;
        player.y = playerState.y;
      }
    } else {
      // Pour les autres joueurs, interpoler la position
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        playerState.x, playerState.y
      );
      
      if (distance > 3) {
        // Calculer la direction AVANT de bouger
        const direction = this.calculateDirection(player.x, player.y, playerState.x, playerState.y);
        
        if (this.scene.tweens && !player.isBeingTweened) {
          player.isBeingTweened = true;
          this.scene.tweens.add({
            targets: player,
            x: playerState.x,
            y: playerState.y,
            duration: 100,
            ease: 'Linear',
            onComplete: () => {
              if (player && !this.isDestroyed) {
                player.isBeingTweened = false;
                this.playIdleAnimation(player);
              }
            }
          });
        } else {
          player.x = playerState.x;
          player.y = playerState.y;
        }
        
        // Jouer l'animation de marche
        this.playWalkAnimation(player, direction);
        player.isMoving = true;
      } else {
        // Pas de mouvement, rester idle
        player.x = playerState.x;
        player.y = playerState.y;
        if (player.isMoving) {
          this.playIdleAnimation(player);
          player.isMoving = false;
        }
      }
    }
    
    // Mettre à jour l'indicateur
    if (player.indicator && !this.isDestroyed) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 20; // Ajusté pour le scale 2
    }
  }
});
```

}

calculateDirection(fromX, fromY, toX, toY) {
const deltaX = toX - fromX;
const deltaY = toY - fromY;

```
if (Math.abs(deltaX) > Math.abs(deltaY)) {
  return deltaX > 0 ? 'right' : 'left';
} else {
  return deltaY > 0 ? 'down' : 'up';
}
```

}

playWalkAnimation(player, direction) {
if (this.isDestroyed || !player || !player.scene || !direction) return;
if (!player.scene.children.exists(player)) return;

```
let animKey = '';
if (['left', 'right', 'up', 'down'].includes(direction)) {
  animKey = `walk_${direction}`;
} else {
  animKey = `idle_down`;
}

if (!player.scene.anims.exists(animKey)) {
  console.warn(`Animation ${animKey} n'existe pas`);
  player.setFrame(0);
  return;
}

try {
  // Ne jouer l'animation que si elle n'est pas déjà en cours
  if (!player.anims.isPlaying || player.anims.currentAnim.key !== animKey) {
    player.play(animKey, true);
  }
  player.lastDirection = direction;
} catch (error) {
  console.error("Erreur lors de la lecture de l'animation:", error);
  player.setFrame(0);
}
```

}

playIdleAnimation(player) {
if (this.isDestroyed || !player || !player.scene) return;
if (!player.scene.children.exists(player)) return;

```
try {
  // Idle direction basée sur la dernière direction
  const last = player.lastDirection || 'down';
  const idleKey = `idle_${last}`;
  
  if (player.scene.anims.exists(idleKey)) {
    if (!player.anims.isPlaying || player.anims.currentAnim.key !== idleKey) {
      player.play(idleKey);
    }
  } else {
    console.warn(`Animation idle ${idleKey} n'existe pas`);
    player.setFrame(0);
  }
} catch (error) {
  console.error("Erreur lors de la lecture de l'animation idle:", error);
  player.setFrame(0);
}
```

}

removePlayer(sessionId) {
if (this.isDestroyed) return;
const player = this.players.get(sessionId);
if (player) {
if (player.indicator) {
try { player.indicator.destroy(); } catch (e) {}
}
if (player.body && player.body.destroy) {
try { player.body.destroy(); } catch (e) {}
}
try { player.destroy(); } catch (e) {}
this.players.delete(sessionId);
}
}

clearAllPlayers() {
if (this.isDestroyed) return;
if (this.updateTimeout) {
clearTimeout(this.updateTimeout);
this.updateTimeout = null;
}
const playersToRemove = Array.from(this.players.keys());
playersToRemove.forEach(sessionId => this.removePlayer(sessionId));
this.players.clear();
this.mySessionId = null;
}

playPlayerAnimation(sessionId, animationKey) {
if (this.isDestroyed) return;
const player = this.players.get(sessionId);
if (player && this.scene.anims.exists(animationKey)) {
try {
player.play(animationKey, true);
} catch (error) {
console.error(“Erreur animation:”, error);
}
}
}

getAllPlayers() {
return this.isDestroyed ? [] : Array.from(this.players.values());
}

getPlayerCount() {
return this.isDestroyed ? 0 : this.players.size;
}

getPlayerInfo(sessionId) {
if (this.isDestroyed) return null;
const player = this.players.get(sessionId);
if (player) {
return {
x: player.x,
y: player.y,
direction: player.lastDirection,
isMoving: player.isMoving,
isMyPlayer: sessionId === this.mySessionId
};
}
return null;
}

destroy() {
this.isDestroyed = true;
this.clearAllPlayers();
if (this.updateTimeout) {
clearTimeout(this.updateTimeout);
this.updateTimeout = null;
}
}
}