// client/src/effects/WeatherEffects.js
// VERSION ULTRA-OPTIMISÉE - PERFORMANCE MAXIMALE

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
    
    // ✅ CONFIGURATION MINIMALISTE
    this.rainConfig = {
      intensity: 1.0,
      baseSpeed: 1000,
      layerDepth: 9999,
      dropAlpha: 0.7
    };
    
    console.log(`🌦️ [WeatherEffects] Initialisé ULTRA-OPTIMISÉ pour ${scene.scene.key}`);
  }

  // ✅ TEXTURE MINIMALISTE 32x32 - PLUIE DE TRAVERS
  createOptimalRainTexture() {
    if (this.scene.textures.exists('rainOptimal')) {
      return;
    }
    
    console.log(`🎨 [WeatherEffects] Création texture pluie optimale 32x32 (de travers)...`);
    
    const graphics = this.scene.add.graphics();
    
    // ✅ Seulement 8 gouttes dans un pattern 32x32
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(2, 26);
      const y = Phaser.Math.Between(2, 26);
      const length = Phaser.Math.Between(4, 8);
      
      // ✅ Couleur simple et fixe
      graphics.lineStyle(1, 0x87CEEB, 0.8); // Bleu ciel simple
      
      // ✅ ANGLE DE TRAVERS - 75° pour effet naturel
      const angle = Phaser.Math.DegToRad(75);
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      
      graphics.moveTo(x, y);
      graphics.lineTo(endX, endY);
    }
    
    graphics.strokePath();
    graphics.generateTexture('rainOptimal', 32, 32);
    graphics.destroy();
    
    console.log(`✅ [WeatherEffects] Texture pluie optimale créée (de travers)`);
  }

  // ✅ PLUIE ULTRA-PERFORMANTE - 1 OBJET + 1 TWEEN + EFFET VENT LÉGER
  createOptimizedRainEffect() {
    if (this.effects.rain) {
      this.destroyRainEffect();
    }

    console.log(`🌧️ [WeatherEffects] Création pluie ULTRA-OPTIMISÉE (de travers)...`);

    // ✅ Créer texture si nécessaire
    this.createOptimalRainTexture();

    // ✅ UNE SEULE TileSprite
    this.effects.rain = this.scene.add.tileSprite(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      'rainOptimal'
    );
    
    this.effects.rain.setOrigin(0, 0);
    this.effects.rain.setAlpha(this.rainConfig.dropAlpha);
    this.effects.rain.setDepth(this.rainConfig.layerDepth);
    this.effects.rain.setScrollFactor(0);
    
    // ✅ TWEEN VERTICAL
    this.rainTween = this.scene.tweens.add({
      targets: this.effects.rain,
      tilePositionY: this.effects.rain.height,
      duration: this.rainConfig.baseSpeed / this.rainConfig.intensity,
      repeat: -1,
      ease: 'Linear'
    });
    
    // ✅ EFFET VENT LÉGER - juste horizontal, pas de yoyo
    this.windTween = this.scene.tweens.add({
      targets: this.effects.rain,
      tilePositionX: 80, // Déplacement horizontal léger
      duration: this.rainConfig.baseSpeed / this.rainConfig.intensity,
      repeat: -1,
      ease: 'Linear'
    });
    
    console.log(`✅ [WeatherEffects] Pluie ultra-optimisée active (1 objet, 2 tweens simples)`);
  }

  // ✅ NEIGE OPTIMISÉE
  createOptimizedSnowEffect() {
    if (this.effects.snow) {
      this.destroySnowEffect();
    }

    console.log(`❄️ [WeatherEffects] Création neige optimisée...`);
    
    if (!this.scene.textures.exists('snowOptimal')) {
      this.createOptimalSnowTexture();
    }

    this.effects.snow = this.scene.add.tileSprite(
      0, 0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      'snowOptimal'
    );
    
    this.effects.snow.setOrigin(0, 0);
    this.effects.snow.setAlpha(0.6);
    this.effects.snow.setDepth(this.rainConfig.layerDepth);
    this.effects.snow.setScrollFactor(0);

    // ✅ Animation simple
    this.snowTween = this.scene.tweens.add({
      targets: this.effects.snow,
      tilePositionY: this.effects.snow.height,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    });
  }

  // ✅ TEXTURE NEIGE SIMPLE 32x32
  createOptimalSnowTexture() {
    const graphics = this.scene.add.graphics();
    
    // ✅ Moins de flocons pour optimiser
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(2, 30);
      const y = Phaser.Math.Between(2, 30);
      const size = Phaser.Math.Between(1, 2);
      
      graphics.fillStyle(0xFFFFFF, 0.7);
      graphics.fillCircle(x, y, size);
    }
    
    graphics.generateTexture('snowOptimal', 32, 32);
    graphics.destroy();
  }

  // ✅ CONTRÔLE PRINCIPAL SIMPLIFIÉ
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
        this.rainConfig.intensity = 1.3;
        this.createOptimizedRainEffect();
        this.addSimpleThunderEffect();
        break;
        
      case 'snow':
        this.createOptimizedSnowEffect();
        break;
        
      case 'fog':
        this.createSimpleFogEffect();
        break;
        
      case 'clear':
      case 'sunny':
      default:
        this.rainConfig.intensity = 1.0;
        break;
    }
    
    this.isActive = weatherType !== 'clear' && weatherType !== 'sunny';
  }

  // ✅ TONNERRE SIMPLE - PAS D'ÉCLAIRS MULTIPLES
  addSimpleThunderEffect() {
    this.thunderTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(10000, 20000),
      callback: () => {
        // ✅ Flash simple et rapide
        const camera = this.scene.cameras.main;
        const flash = this.scene.add.rectangle(
          camera.centerX, camera.centerY,
          camera.width, camera.height,
          0xFFFFFF, 0.6
        );
        flash.setDepth(this.rainConfig.layerDepth + 1);
        flash.setScrollFactor(0);
        
        // ✅ Disparition rapide
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 80,
          onComplete: () => flash.destroy()
        });
        
        // ✅ Son optionnel
        if (this.scene.sound && this.scene.sound.sounds.find(s => s.key === 'thunder')) {
          this.scene.sound.play('thunder', { volume: 0.3 });
        }
      },
      loop: true
    });
  }

  // ✅ BROUILLARD SIMPLE
  createSimpleFogEffect() {
    console.log(`🌫️ [WeatherEffects] Création brouillard simple...`);
    
    if (this.effects.fog) {
      this.destroyFogEffect();
    }

    this.effects.fog = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0xCCCCCC,
      0.15
    );
    
    this.effects.fog.setDepth(this.rainConfig.layerDepth - 1);
    this.effects.fog.setScrollFactor(0);
    
    // ✅ Animation simple sans yoyo
    this.scene.tweens.add({
      targets: this.effects.fog,
      alpha: { from: 0.15, to: 0.25 },
      duration: 6000,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  // ✅ CONTRÔLE D'INTENSITÉ SIMPLIFIÉ
  setRainIntensity(intensity) {
    this.rainConfig.intensity = Math.max(0.1, Math.min(2.0, intensity));
    
    if (this.effects.rain && this.rainTween) {
      // ✅ Juste changer la vitesse du tween existant
      this.rainTween.updateTo('duration', this.rainConfig.baseSpeed / this.rainConfig.intensity);
      
      console.log(`💧 [WeatherEffects] Intensité pluie: ${intensity}`);
    }
  }

  // ✅ GESTION ENVIRONNEMENT SIMPLIFIÉE
  setEnvironmentType(environmentType) {
    console.log(`🏠 [WeatherEffects] Environnement: ${environmentType}`);
    
    if (environmentType === 'indoor' || environmentType === 'cave') {
      this.stopAllEffects();
      this.isActive = false;
    }
  }

  // ✅ NETTOYAGE ULTRA-SIMPLE
  stopAllEffects() {
    this.destroyRainEffect();
    this.destroySnowEffect();
    this.destroyFogEffect();
    
    if (this.thunderTimer) {
      this.thunderTimer.destroy();
      this.thunderTimer = null;
    }
  }

  destroyRainEffect() {
    if (this.rainTween) {
      this.rainTween.destroy();
      this.rainTween = null;
    }
    
    if (this.windTween) {
      this.windTween.destroy();
      this.windTween = null;
    }
    
    if (this.effects.rain) {
      this.effects.rain.destroy();
      this.effects.rain = null;
    }
  }

  destroySnowEffect() {
    if (this.snowTween) {
      this.snowTween.destroy();
      this.snowTween = null;
    }
    
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

  // ✅ DEBUG SIMPLIFIÉ
  debug() {
    console.log(`🔍 [WeatherEffects] === DEBUG ULTRA-OPTIMISÉ ===`);
    console.log(`🌤️ Météo: ${this.currentWeather}`);
    console.log(`🎬 Actif: ${this.isActive}`);
    console.log(`💧 Intensité: ${this.rainConfig.intensity}`);
    console.log(`🌧️ Pluie: ${!!this.effects.rain} (1 objet)`);
    console.log(`❄️ Neige: ${!!this.effects.snow}`);
    console.log(`🌫️ Brouillard: ${!!this.effects.fog}`);
    console.log(`📊 Objets GPU actifs: ${Object.values(this.effects).filter(e => e !== null).length}`);
  }

  destroy() {
    console.log(`🧹 [WeatherEffects] Destruction ultra-optimisée...`);
    
    this.stopAllEffects();
    this.scene = null;
    this.effects = null;
    this.rainConfig = null;
    
    console.log(`✅ [WeatherEffects] Détruit (ultra-optimisé)`);
  }
}

// ✅ COMMANDES DE TEST OPTIMISÉES
if (typeof window !== 'undefined') {
  window.testOptimalRain = (scene) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setWeather('rain');
      console.log('🌧️ Pluie ultra-optimisée');
    }
  };
  
  window.testOptimalStorm = (scene) => {
    if (scene?.weatherEffects) {
      scene.weatherEffects.setWeather('storm');
      console.log('⛈️ Orage ultra-optimisé');
    }
  };
  
  console.log(`🎮 Commandes ultra-optimisées:`);
  console.log(`  - window.testOptimalRain(scene)`);
  console.log(`  - window.testOptimalStorm(scene)`);
}
