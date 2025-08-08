// client/src/Battle/KOManager.js - Gestionnaire spécialisé des K.O. Pokémon

export class KOManager {
  constructor(battleScene) {
    this.scene = battleScene;
    this.isProcessingKO = false;
    this.koQueue = [];
    
    // Configuration des timings authentiques
    this.timings = {
      criticalPhase: 1200,    // Flash rouge + vibration
      faintSequence: 1500,    // Chute + rotation
      koMessage: 2500,        // Message officiel
      finalEffects: 500,      // Sons + cleanup
      postKODelay: 1000       // Attente post-KO
    };
  }

  // === GESTION PRINCIPALE ===

  async handlePokemonFainted(data) {
    if (this.isProcessingKO) {
      this.koQueue.push(data);
      return;
    }

    this.isProcessingKO = true;
    
    try {
      await this.executeKOSequence(data);
    } catch (error) {
      console.error('Erreur séquence K.O.:', error);
    } finally {
      this.isProcessingKO = false;
      
      if (this.koQueue.length > 0) {
        const nextKO = this.koQueue.shift();
        this.handlePokemonFainted(nextKO);
      }
    }
  }

  async executeKOSequence(data) {
    const { pokemonName, targetRole } = data;
    const isMyPokemon = targetRole === 'player1';
    const targetSprite = isMyPokemon ? this.scene.playerPokemonSprite : this.scene.opponentPokemonSprite;
    
    if (!targetSprite) return;

    await this.playCriticalPhase(targetSprite);
    await this.playFaintSequence(targetSprite, pokemonName, isMyPokemon);
    await this.showKOMessage(pokemonName, isMyPokemon);
    await this.playFinalEffects(targetSprite);
    
    this.scene.events.emit('koSequenceComplete', { pokemonName, targetRole });
  }

  // === PHASE 1: ÉTAT CRITIQUE ===

  async playCriticalPhase(sprite) {
    return new Promise(resolve => {
      let flashCount = 0;
      const totalFlashes = 6;
      
      const flashLoop = () => {
        if (flashCount >= totalFlashes) {
          sprite.clearTint();
          resolve();
          return;
        }
        
        sprite.setTint(0xff0000);
        
        const originalX = sprite.x;
        this.scene.tweens.add({
          targets: sprite,
          x: originalX + (flashCount % 2 === 0 ? 8 : -8),
          duration: 80,
          ease: 'Power2.easeInOut',
          onComplete: () => {
            sprite.setX(originalX);
            
            setTimeout(() => {
              sprite.clearTint();
              flashCount++;
              setTimeout(flashLoop, 120);
            }, 80);
          }
        });
      };
      
      flashLoop();
    });
  }

  // === PHASE 2: SÉQUENCE DE CHUTE ===

  async playFaintSequence(sprite, pokemonName, isMyPokemon) {
    return new Promise(resolve => {
      const originalY = sprite.y;
      const originalScale = sprite.scaleX;
      const fallDistance = 60;
      
      this.playDistortedCry(pokemonName);
      
      this.scene.tweens.add({
        targets: sprite,
        y: originalY + fallDistance,
        scaleX: originalScale * 0.8,
        scaleY: originalScale * 0.8,
        alpha: 0.3,
        angle: isMyPokemon ? -25 : 25,
        duration: this.timings.faintSequence,
        ease: 'Power2.easeIn',
        onUpdate: (tween) => {
          const progress = tween.progress;
          const grayAmount = progress * 0.7;
          sprite.setTint(Phaser.Display.Color.Interpolate.ColorWithColor(
            { r: 255, g: 255, b: 255, a: 255 },
            { r: 128, g: 128, b: 128, a: 255 },
            100,
            Math.floor(grayAmount * 100)
          ));
        },
        onComplete: () => {
          this.createSpiralEyesEffect(sprite.x, sprite.y);
          resolve();
        }
      });
      
      setTimeout(() => {
        this.createDustCloudEffect(sprite.x, originalY + fallDistance + 20);
      }, 1200);
    });
  }

  // === PHASE 3: MESSAGE K.O. ===

  async showKOMessage(pokemonName, isMyPokemon) {
    const koMessage = isMyPokemon 
      ? `${pokemonName} est K.O. !`
      : `${pokemonName} ennemi est K.O. !`;
    
    this.scene.showNarrativeMessage(koMessage, true);
    
    return new Promise(resolve => {
      setTimeout(resolve, this.timings.koMessage);
    });
  }

  // === PHASE 4: EFFETS FINAUX ===

  async playFinalEffects(sprite) {
    if (this.scene.sound.get('pokemon_faint')) {
      this.scene.sound.play('pokemon_faint', { volume: 0.6 });
    }
    
    setTimeout(() => {
      sprite.setVisible(false);
    }, this.timings.finalEffects);
    
    return Promise.resolve();
  }

  // === EFFETS VISUELS ===

  playDistortedCry(pokemonName) {
    const pokemonId = this.getPokemonIdFromName(pokemonName);
    const cryKey = `cry_${pokemonId}`;
    
    if (this.scene.sound.get(cryKey)) {
      this.scene.sound.play(cryKey, { 
        volume: 0.5, 
        rate: 0.7
      });
    }
  }

  createSpiralEyesEffect(x, y) {
    for (let i = 0; i < 2; i++) {
      const spiral = this.scene.add.text(
        x + (i === 0 ? -20 : 20), 
        y - 30,
        '@',
        {
          fontSize: '24px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: '#666666',
          fontWeight: 'bold'
        }
      );
      
      spiral.setOrigin(0.5);
      spiral.setDepth(100);
      
      this.scene.tweens.add({
        targets: spiral,
        rotation: Math.PI * 6,
        alpha: 0,
        duration: 2000,
        ease: 'Power2.easeOut',
        onComplete: () => spiral.destroy()
      });
    }
  }

  createDustCloudEffect(x, y) {
    const dustCloud = this.scene.add.graphics();
    dustCloud.setPosition(x, y);
    dustCloud.setDepth(30);
    
    dustCloud.fillStyle(0xcccccc, 0.6);
    dustCloud.fillEllipse(0, 0, 40, 20);
    dustCloud.fillEllipse(-15, -5, 25, 15);
    dustCloud.fillEllipse(15, -5, 25, 15);
    
    this.scene.tweens.add({
      targets: dustCloud,
      scaleX: 2.5,
      scaleY: 1.8,
      alpha: 0,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => dustCloud.destroy()
    });
  }

  // === UTILITAIRES ===

  getPokemonIdFromName(name) {
    const nameToId = {
      'Bulbizarre': 1, 'Salamèche': 4, 'Carapuce': 7, 'Pikachu': 25,
      'Bulbasaur': 1, 'Charmander': 4, 'Squirtle': 7
    };
    
    return nameToId[name] || 1;
  }

  // === GESTION FIN DE COMBAT ===

  async handleBattleEnd(data) {
    const { winner, reason, koVictory } = data;
    const isVictory = winner === 'player1';
    
    if (koVictory && isVictory) {
      await this.playVictorySequence(data);
    } else if (winner === 'player2') {
      await this.playDefeatSequence(data);
    } else {
      this.scene.showNarrativeMessage(data.message, true);
    }
    
    setTimeout(() => {
      this.scene.endBattle({ result: winner, reason, koVictory });
    }, isVictory ? 5000 : 3000);
  }

  async playVictorySequence(data) {
    this.scene.showNarrativeMessage(data.message || 'Vous avez gagné !', true);
    
    if (this.scene.sound.get('victory_theme')) {
      this.scene.sound.play('victory_theme', { volume: 0.8 });
    }
    
    this.createVictoryEffect();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (data.rewards || this.scene.currentOpponentPokemon) {
      await this.showBattleRewards(data);
    }
  }

  async playDefeatSequence(data) {
    this.scene.showNarrativeMessage(data.message || 'Tous vos Pokémon sont K.O. !', true);
    
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    overlay.setDepth(1000);
    
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 2000,
      ease: 'Power2.easeIn'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  // === RÉCOMPENSES ===

  async showBattleRewards(data) {
    const rewards = data.rewards || this.calculateBattleRewards();
    
    if (rewards.experience > 0) {
      await this.showExperienceGain(rewards.experience);
    }
    
    if (rewards.money > 0) {
      await this.showMoneyGain(rewards.money);
    }
    
    if (rewards.items && rewards.items.length > 0) {
      await this.showItemsFound(rewards.items);
    }
  }

  async showExperienceGain(expGained) {
    this.scene.showNarrativeMessage(`${this.scene.currentPlayerPokemon.name} gagne ${expGained} points d'expérience !`, true);
    
    if (this.scene.modernHealthBars.player1?.expBar) {
      await this.animateExpGain(expGained);
    }
    
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  async showMoneyGain(moneyGained) {
    this.scene.showNarrativeMessage(`Vous trouvez ${moneyGained} ¥ !`, true);
    this.createCoinRainEffect(moneyGained);
    
    return new Promise(resolve => setTimeout(resolve, 1800));
  }

  createVictoryEffect() {
    const { width, height } = this.scene.cameras.main;
    
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const confetti = this.scene.add.text(
          Math.random() * width, 
          -20, 
          ['✦', '◆', '▲', '●', '★'][Math.floor(Math.random() * 5)], 
          { 
            fontSize: '22px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: ['#87ceeb', '#4a90e2', '#357abd', '#2a3f5f', '#ffffff'][Math.floor(Math.random() * 5)],
            fontWeight: 'bold'
          }
        );
        confetti.setDepth(200);
        
        this.scene.tweens.add({
          targets: confetti,
          y: height + 50,
          x: confetti.x + (Math.random() - 0.5) * 140,
          rotation: Math.PI * 8,
          alpha: 0,
          scaleX: 2.0,
          scaleY: 2.0,
          duration: 4500,
          ease: 'Power2.easeIn',
          onComplete: () => confetti.destroy()
        });
      }, i * 250);
    }
  }

  createCoinRainEffect(amount) {
    const coinCount = Math.min(8, Math.floor(amount / 10));
    
    for (let i = 0; i < coinCount; i++) {
      setTimeout(() => {
        const coin = this.scene.add.text(
          Math.random() * this.scene.cameras.main.width,
          -20,
          '¥',
          {
            fontSize: '28px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: '#ffd700',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }
        );
        
        coin.setDepth(150);
        
        this.scene.tweens.add({
          targets: coin,
          y: this.scene.cameras.main.height + 50,
          rotation: Math.PI * 4,
          duration: 2000 + Math.random() * 1000,
          ease: 'Power2.easeIn',
          onComplete: () => coin.destroy()
        });
      }, i * 200);
    }
  }

  calculateBattleRewards() {
    if (!this.scene.currentOpponentPokemon) {
      return { experience: 0, money: 0, items: [] };
    }
    
    const opponentLevel = this.scene.currentOpponentPokemon.level || 5;
    const playerLevel = this.scene.currentPlayerPokemon?.level || 5;
    
    const levelDiff = Math.max(1, opponentLevel - playerLevel + 5);
    const baseExp = opponentLevel * 15;
    const finalExp = Math.floor(baseExp * (levelDiff / 10));
    
    return {
      experience: finalExp,
      money: Math.floor(opponentLevel * 20 + Math.random() * 50),
      items: Math.random() > 0.8 ? [
        { name: 'Potion', quantity: 1 }
      ] : []
    };
  }

  // === NETTOYAGE ===

  destroy() {
    this.koQueue = [];
    this.isProcessingKO = false;
    this.scene = null;
  }
}
