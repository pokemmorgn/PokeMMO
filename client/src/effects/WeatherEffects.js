// client/src/effects/WeatherEffects.js
// Système d'effets météo optimisé avec textures tiled et variations

export class WeatherEffects {
  constructor(scene) {
    this.scene = scene;
    this.effects = {
      rain: null,
      snow: null,
      fog: null
    };
    this.isActive = false;
    this.currentWeather = 'clear';
    
    // ✅ Configuration optimisée pour performance
    this.rainConfig = {
      intensity: 1.0,           // Intensité globale (0.1 à 2.0)
      baseSpeed: 800,           // Vitesse de base (ms pour traverser l'écran)
      windStrength: 0.3,        // Force du vent (0 à 1)
      dropAlpha: 0.6,           // Transparence des gouttes
      layerDepth: 9999,         // Z-index
      
      // ✅ NOUVEAU: Variations automatiques
      enableVariations: true,
      variationInterval: 3000,  // Change toutes les 3 secondes
      
      // ✅ Pattern de textures multiples
      patterns: ['light', 'medium', 'heavy', 'diagonal']
    };
    
    // ✅ Variations temporelles
    this.rainVariation = {
      currentPattern: 'medium',
      currentIntensity: 1.0,
      timer: null,
      windDirection: 1
    };
    
    console.log(`🌦️ [WeatherEffects] Initialisé optimisé pour ${scene.scene.key}`);
  }

  // ✅ CRÉATION DES TEXTURES VARIÉES
  createRainTextures() {
    console.log(`🎨 [WeatherEffects] Création textures pluie variées...`);
    
    // ✅ PATTERN 1: Pluie légère
    this.createRainPattern('rainLight', {
      dropCount: 6,
      dropLength: [4, 6],
      dropWidth: 1,
      angle: [80, 85],
      color: 0x4FC3F7,
      alpha: 0.4
    });
    
    // ✅ PATTERN 2: Pluie moyenne  
    this.createRainPattern('rainMedium', {
      dropCount: 10,
      dropLength: [6, 10],
      dropWidth: 1,
      angle: [75, 85],
      color: 0x2196F3,
      alpha: 0.6
    });
    
    // ✅ PATTERN 3: Pluie forte
    this.createRainPattern('rainHeavy', {
      dropCount: 15,
      dropLength: [8, 14],
      dropWidth: [1, 2],
      angle: [70, 80],
      color: 0x1976D2,
      alpha: 0.8
    });
    
    // ✅ PATTERN 4: Pluie diagonale (vent fort)
    this.createRainPattern('rainDiagonal', {
      dropCount: 12,
      dropLength: [6, 12],
      dropWidth: 1,
      angle: [45, 65],
      color: 0x2196F3,
      alpha: 0.7
    });
    
    console.log(`✅ [WeatherEffects] 4 patterns de pluie créés`);
  }

  // ✅ Créer un pattern de pluie spécifique
  createRainPattern(textureName, config) {
    if (this.scene.textures.exists(textureName)) {
      return; // Déjà créé
    }
    
    const graphics = this.scene.add.graphics();
    
    for (let i = 0; i < config.dropCount; i++) {
      // ✅ Position aléatoire dans le pattern 128x128
      const x = Phaser.Math.Between(10, 118);
      const y = Phaser.Math.Between(10, 118);
      
      // ✅ Propriétés variables selon config
      const length = Array.isArray(config.dropLength) 
        ? Phaser.Math.Between(config.dropLength[0], config.dropLength[1])
        : config.dropLength;
        
      const width = Array.isArray(config.dropWidth)
        ? Phaser.Math.Between(config.dropWidth[0], config.dropWidth[1])
        : config.dropWidth;
        
      const angle = Array.isArray(config.angle)
        ? Phaser.Math.Between(config.angle[0], config.angle[1])
        : config.angle;
      
      // ✅ Dessiner la goutte avec variation
      graphics.lineStyle(width, config.color, config.alpha);
      
      const angleRad = Phaser.Math.DegToRad(angle);
      const endX = x + Math.cos(angleRad) * length;
      const endY = y + Math.sin(angleRad) * length;
      
      graphics.moveTo(x, y);
      graphics.lineTo(endX, endY);
    }
    
    graphics.strokePath();
    
    // ✅ Générer texture 128x128 pour plus de variation
    graphics.generateTexture(textureName, 128, 128);
    graphics.destroy();
  }

  // ✅ EFFET DE PLUIE OPTIMISÉ AVEC VARIATIONS
  createOptimizedRainEffect() {
    if (this.effects.rain) {
      this.destroyRainEffect();
    }

    console.log(`🌧️ [WeatherEffects] Création pluie optimisée avec variations...`);

    // ✅ S'assurer que les textures existent
    if (!this.scene.textures.exists('rainMedium')) {
      this.createRainTextures();
    }

    // ✅ Conteneur pour multiples couches
    this.effects.rain = this.scene.add.container(0, 0);
    this.effects.rain.setDepth(this.rainConfig.layerDepth);
    
    // ✅ COUCHE 1: Pluie principale (toujours visible)
    this.rainLayer1 = this.scene.add.tileSprite(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      'rainMedium'
    );
    this.rainLayer1.setOrigin(0, 0);
    this.rainLayer1.setAlpha(this.rainConfig.dropAlpha);
    this.rainLayer1.setScrollFactor(0);
    
    // ✅ COUCHE 2: Pluie secondaire (varie)
    this.rainLayer2 = this.scene.add.tileSprite(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      'rainLight'
    );
    this.rainLayer2.setOrigin(0, 0);
    this.rainLayer2.setAlpha(this.rainConfig.dropAlpha * 0.5);
    this.rainLayer2.setScrollFactor(0);
    
    // ✅ Ajouter au conteneur
    this.effects.rain.add([this.rainLayer1, this.rainLayer2]);
    
    // ✅ Démarrer animations
    this.startRainAnimations();
    
    // ✅ Démarrer variations automatiques
    if (this.rainConfig.enableVariations) {
      this.startRainVariations();
    }
    
    console.log(`✅ [WeatherEffects] Pluie optimisée active (2 couches)`);
  }

  // ✅ Animations des couches de pluie
  startRainAnimations() {
    const baseSpeed = this.rainConfig.baseSpeed * (2 - this.rainConfig.intensity);
    
    // ✅ ANIMATION COUCHE 1: Vitesse normale
    this.rainTween1 = this.scene.tweens.add({
      targets: this.rainLayer1,
      tilePositionY: this.rainLayer1.height,
      duration: baseSpeed,
      repeat: -1,
      ease: 'Linear'
    });
    
    // ✅ ANIMATION COUCHE 2: Vitesse légèrement différente pour effet parallax
    this.rainTween2 = this.scene.tweens.add({
      targets: this.rainLayer2,
      tilePositionY: this.rainLayer2.height,
      duration: baseSpeed * 1.3, // Plus lent
      repeat: -1,
      ease: 'Linear'
    });
    
    // ✅ EFFET DE VENT (optionnel)
    if (this.rainConfig.windStrength > 0) {
      this.windTween = this.scene.tweens.add({
        targets: [this.rainLayer1, this.rainLayer2],
        tilePositionX: 100 * this.rainConfig.windStrength,
        duration: 4000,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // ✅ VARIATIONS AUTOMATIQUES
  startRainVariations() {
    if (this.rainVariation.timer) {
      this.rainVariation.timer.destroy();
    }
    
    this.rainVariation.timer = this.scene.time.addEvent({
      delay: this.rainConfig.variationInterval,
      callback: this.applyRainVariation,
      callbackScope: this,
      loop: true
    });
    
    console.log(`🔄 [WeatherEffects] Variations automatiques activées`);
  }

  // ✅ Appliquer une variation de pluie
  applyRainVariation() {
    if (!this.effects.rain || !this.rainLayer1 || !this.rainLayer2) return;
    
    // ✅ Choisir un nouveau pattern aléatoire
    const patterns = ['rainLight', 'rainMedium', 'rainHeavy', 'rainDiagonal'];
    const newPattern = Phaser.Utils.Array.GetRandom(patterns);
    
    // ✅ Varier l'intensité légèrement
    const intensityVariation = Phaser.Math.FloatBetween(0.7, 1.3);
    const newAlpha = this.rainConfig.dropAlpha * intensityVariation;
    
    console.log(`🌧️ [WeatherEffects] Variation: ${newPattern}, intensité: ${intensityVariation.toFixed(2)}`);
    
    // ✅ TRANSITION DOUCE vers nouveau pattern
    this.scene.tweens.add({
      targets: this.rainLayer2,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        // Changer la texture
        this.rainLayer2.setTexture(newPattern);
        
        // Revenir visible
        this.scene.tweens.add({
          targets: this.rainLayer2,
          alpha: newAlpha * 0.5,
          duration: 500
        });
      }
    });
    
    // ✅ Varier légèrement la couche principale aussi
    this.scene.tweens.add({
      targets: this.rainLayer1,
      alpha: newAlpha,
      duration: 1000,
      ease: 'Sine.easeInOut'
    });
    
    // ✅ Changer direction du vent occasionnellement
    if (Math.random() < 0.3 && this.windTween) {
      this.rainVariation.windDirection *= -1;
      
      this.scene.tweens.add({
        targets: [this.rainLayer1, this.rainLayer2],
        tilePositionX: 100 * this.rainConfig.windStrength * this.rainVariation.windDirection,
        duration: 2000,
        ease: 'Power2.easeInOut'
      });
    }
  }

  // ✅ EFFET DE NEIGE OPTIMISÉ
  createOptimizedSnowEffect() {
    if (this.effects.snow) {
      this.destroySnowEffect();
    }

    console.log(`❄️ [WeatherEffects] Création neige optimisée...`);
    
    // ✅ Créer texture de neige si nécessaire
    if (!this.scene.textures.exists('snowPattern')) {
      this.createSnowTexture();
    }

    this.effects.snow = this.scene.add.tileSprite(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      'snowPattern'
    );
    
    this.effects.snow.setOrigin(0, 0);
    this.effects.snow.setAlpha(0.8);
    this.effects.snow.setDepth(this.rainConfig.layerDepth);
    this.effects.snow.setScrollFactor(0);

    // ✅ Animation plus lente pour la neige
    this.scene.tweens.add({
      targets: this.effects.snow,
      tilePositionY: this.effects.snow.height,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });
    
    // ✅ Léger mouvement horizontal
    this.scene.tweens.add({
      targets: this.effects.snow,
      tilePositionX: 50,
      duration: 8000,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  // ✅ Créer texture de neige
  createSnowTexture() {
    const graphics = this.scene.add.graphics();
    
    // ✅ Flocons de différentes tailles
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(5, 123);
      const y = Phaser.Math.Between(5, 123);
      const size = Phaser.Math.Between(1, 4);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9);
      
      graphics.fillStyle(0xFFFFFF, alpha);
      graphics.fillCircle(x, y, size);
      
      // ✅ Quelques flocons en étoile
      if (Math.random() < 0.3) {
        graphics.lineStyle(1, 0xFFFFFF, alpha);
        graphics.moveTo(x - size, y);
        graphics.lineTo(x + size, y);
        graphics.moveTo(x, y - size);
        graphics.lineTo(x, y + size);
        graphics.strokePath();
      }
    }
    
    graphics.generateTexture('snowPattern', 128, 128);
    graphics.destroy();
  }

  // ✅ CONTRÔLE PRINCIPAL (API PUBLIQUE)
  setWeather(weatherType, force = false) {
    if (this.currentWeather === weatherType && !force) {
      return;
    }

    console.log(`🌤️ [WeatherEffects] Changement météo optimisé: ${this.currentWeather} → ${weatherType}`);
    
    this.stopAllEffects();
    this.currentWeather = weatherType;
    
    switch (weatherType) {
      case 'rain':
        this.createOptimizedRainEffect();
        break;
        
      case 'storm':
        this.rainConfig.intensity = 1.5;
        this.rainConfig.windStrength = 0.8;
        this.createOptimizedRainEffect();
        this.addThunderEffect();
        break;
        
      case 'snow':
        this.createOptimizedSnowEffect();
        break;
        
      case 'fog':
        this.createFogEffect();
        break;
        
      case 'clear':
      case 'sunny':
      default:
        // Pas d'effet
        this.rainConfig.intensity = 1.0;
        this.rainConfig.windStrength = 0.3;
        break;
    }
    
    this.isActive = weatherType !== 'clear' && weatherType !== 'sunny';
  }

  // ✅ CONTRÔLE D'INTENSITÉ EN TEMPS RÉEL
  setRainIntensity(intensity) {
    this.rainConfig.intensity = Math.max(0.1, Math.min(2.0, intensity));
    
    if (this.rainLayer1 && this.rainLayer2) {
      const alpha = this.rainConfig.dropAlpha * this.rainConfig.intensity;
      
      this.scene.tweens.add({
        targets: this.rainLayer1,
        alpha: alpha,
        duration: 1000
      });
      
      this.scene.tweens.add({
        targets: this.rainLayer2,
        alpha: alpha * 0.5,
        duration: 1000
      });
      
      console.log(`💧 [WeatherEffects] Intensité pluie: ${intensity}`);
    }
  }

  // ✅ CONTRÔLE DU VENT
  setWindStrength(strength) {
    this.rainConfig.windStrength = Math.max(0, Math.min(1, strength));
    
    if (this.windTween) {
      this.windTween.destroy();
    }
    
    if (this.rainLayer1 && this.rainLayer2 && strength > 0) {
      this.windTween = this.scene.tweens.add({
        targets: [this.rainLayer1, this.rainLayer2],
        tilePositionX: 100 * strength,
        duration: 4000,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      
      console.log(`💨 [WeatherEffects] Force vent: ${strength}`);
    }
  }

  // ✅ EFFET TONNERRE AMÉLIORÉ
  addThunderEffect() {
    if (this.thunderTimer) {
      this.thunderTimer.destroy();
    }

    this.thunderTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(8000, 20000),
      callback: () => {
        // ✅ Flash plus réaliste avec plusieurs éclairs
        this.createLightningFlash();
        
        // ✅ Son avec délai (écho)
        this.scene.time.delayedCall(Phaser.Math.Between(100, 800), () => {
          if (this.scene.sound && this.scene.sound.sounds.find(s => s.key === 'thunder')) {
            this.scene.sound.play('thunder', { 
              volume: Phaser.Math.FloatBetween(0.2, 0.5) 
            });
          }
        });
        
        console.log(`⚡ [WeatherEffects] Tonnerre avec éclairs`);
      },
      loop: true
    });
  }

  // ✅ Éclair réaliste multi-flash
  createLightningFlash() {
    const camera = this.scene.cameras.main;
    
    // ✅ FLASH 1: Principal
    const flash1 = this.scene.add.rectangle(
      camera.centerX, camera.centerY,
      camera.width, camera.height,
      0xFFFFFF, 0.9
    );
    flash1.setDepth(this.rainConfig.layerDepth + 1);
    flash1.setScrollFactor(0);
    
    this.scene.tweens.add({
      targets: flash1,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        flash1.destroy();
        
        // ✅ FLASH 2: Plus faible, plus long (30% de chance)
        if (Math.random() < 0.3) {
          this.scene.time.delayedCall(150, () => {
            const flash2 = this.scene.add.rectangle(
              camera.centerX, camera.centerY,
              camera.width, camera.height,
              0xCCCCFF, 0.4
            );
            flash2.setDepth(this.rainConfig.layerDepth + 1);
            flash2.setScrollFactor(0);
            
            this.scene.tweens.add({
              targets: flash2,
              alpha: 0,
              duration: 300,
              onComplete: () => flash2.destroy()
            });
          });
        }
      }
    });
  }

  // ✅ EFFET BROUILLARD (inchangé mais optimisé)
  createFogEffect() {
    console.log(`🌫️ [WeatherEffects] Création brouillard...`);
    
    if (this.effects.fog) {
      this.destroyFogEffect();
    }

    this.effects.fog = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0xCCCCCC,
      0.25
    );
    
    this.effects.fog.setDepth(this.rainConfig.layerDepth - 1);
    this.effects.fog.setScrollFactor(0);
    
    this.scene.tweens.add({
      targets: this.effects.fog,
      alpha: { from: 0.25, to: 0.4 },
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ✅ GESTION ENVIRONNEMENT
  setEnvironmentType(environmentType) {
    console.log(`🏠 [WeatherEffects] Environnement: ${environmentType}`);
    
    if (environmentType === 'indoor' || environmentType === 'cave') {
      this.stopAllEffects();
      this.isActive = false;
    } else if (environmentType === 'outdoor') {
      if (this.currentWeather !== 'clear' && this.currentWeather !== 'sunny') {
        this.setWeather(this.currentWeather, true);
      }
    }
  }

  // ✅ NETTOYAGE OPTIMISÉ
  stopAllEffects() {
    this.destroyRainEffect();
    this.destroySnowEffect();
    this.destroyFogEffect();
    
    if (this.thunderTimer) {
      this.thunderTimer.destroy();
      this.thunderTimer = null;
    }
    
    if (this.rainVariation.timer) {
      this.rainVariation.timer.destroy();
      this.rainVariation.timer = null;
    }
  }

  destroyRainEffect() {
    if (this.rainTween1) {
      this.rainTween1.destroy();
      this.rainTween1 = null;
    }
    
    if (this.rainTween2) {
      this.rainTween2.destroy();
      this.rainTween2 = null;
    }
    
    if (this.windTween) {
      this.windTween.destroy();
      this.windTween = null;
    }
    
    if (this.effects.rain) {
      this.effects.rain.destroy();
      this.effects.rain = null;
    }
    
    this.rainLayer1 = null;
    this.rainLayer2 = null;
  }

  destroySnowEffect() {
    if (this.effects.snow) {
      this.effects.snow.destroy();
      this.effects.snow = null;
    }
  }

  destroyFogEffect() {
    if (this.effects.fog) {
      this.effects.fog.destroy();
      this.effects.fog = null;
    }
  }

  // ✅ API DE DEBUG ET TEST
  debug() {
    console.log(`🔍 [WeatherEffects] === DEBUG OPTIMISÉ ===`);
    console.log(`🌤️ Météo: ${this.currentWeather}`);
    console.log(`🎬 Actif: ${this.isActive}`);
    console.log(`💧 Intensité: ${this.rainConfig.intensity}`);
    console.log(`💨 Vent: ${this.rainConfig.windStrength}`);
    console.log(`🔄 Variations: ${this.rainConfig.enableVariations}`);
    console.log(`🌧️ Pluie: ${!!this.effects.rain} (2 couches)`);
    console.log(`❄️ Neige: ${!!this.effects.snow}`);
    console.log(`🌫️ Brouillard: ${!!this.effects.fog}`);
  }

  // ✅ Tests de performance
  testPerformance() {
    console.log(`🧪 [WeatherEffects] Test performance...`);
    
    const startTime = performance.now();
    this.setWeather('rain');
    
    this.scene.time.delayedCall(5000, () => {
      const endTime = performance.now();
      const avgFPS = this.scene.sys.game.loop.actualFps;
      
      console.log(`📊 Performance (5s de pluie):`);
      console.log(`  - Temps init: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`  - FPS moyen: ${avgFPS.toFixed(1)}`);
      console.log(`  - Objets GPU: 2 TileSprites vs 200 Graphics`);
      
      this.setWeather('clear');
    });
  }

  destroy() {
    console.log(`🧹 [WeatherEffects] Destruction optimisée...`);
    
    this.stopAllEffects();
    this.scene = null;
    this.effects = null;
    this.rainConfig = null;
    this.rainVariation = null;
    
    console.log(`✅ [WeatherEffects] Détruit (optimisé)`);
  }
}

// ✅ COMMANDES DE TEST OPTIMISÉES
if (typeof window !== 'undefined') {
  window.testOptimizedRain = (scene) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setWeather('rain');
      console.log('🌧️ Pluie optimisée avec variations');
    }
  };
  
  window.testStormOptimized = (scene) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setWeather('storm');
      console.log('⛈️ Orage optimisé avec éclairs multiples');
    }
  };
  
  window.setRainIntensity = (scene, intensity) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setRainIntensity(intensity);
      console.log(`💧 Intensité pluie: ${intensity}`);
    }
  };
  
  window.setWindStrength = (scene, strength) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setWindStrength(strength);
      console.log(`💨 Force vent: ${strength}`);
    }
  };
  
  console.log(`🎮 Commandes optimisées disponibles:`);
  console.log(`  - window.testOptimizedRain(scene)`);
  console.log(`  - window.testStormOptimized(scene)`);
  console.log(`  - window.setRainIntensity(scene, 0.5)`);
  console.log(`  - window.setWindStrength(scene, 0.8)`);
}
