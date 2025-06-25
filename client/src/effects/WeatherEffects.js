// client/src/effects/WeatherEffects.js
// Système d'effets météo avec pluie

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
    
    // Configuration de la pluie
    this.rainConfig = {
      dropCount: 200,           // Nombre de gouttes
      dropSpeed: 300,           // Vitesse de chute
      dropAngle: 15,            // Angle en degrés (diagonale)
      dropLength: 8,            // Longueur des traits
      dropWidth: 1,             // Largeur des traits
      windEffect: 50,           // Effet de vent horizontal
      dropColor: 0x4FC3F7,      // Couleur bleu clair
      dropAlpha: 0.7,           // Transparence
      layerDepth: 9999          // Z-index pour être au-dessus
    };
    
    console.log(`🌦️ [WeatherEffects] Initialisé pour ${scene.scene.key}`);
  }

  // ✅ MÉTHODE PRINCIPALE: Créer l'effet de pluie
  createRainEffect() {
    if (this.effects.rain) {
      this.destroyRainEffect();
    }

    console.log(`🌧️ [WeatherEffects] Création effet pluie...`);

    // Conteneur pour les gouttes
    this.effects.rain = this.scene.add.container(0, 0);
    this.effects.rain.setDepth(this.rainConfig.layerDepth);
    
    // Créer les gouttes individuelles
    this.rainDrops = [];
    
    const camera = this.scene.cameras.main;
    const screenWidth = camera.width;
    const screenHeight = camera.height;
    
    for (let i = 0; i < this.rainConfig.dropCount; i++) {
      this.createRainDrop(screenWidth, screenHeight);
    }
    
    // Animation continue
    this.startRainAnimation();
    
    console.log(`✅ [WeatherEffects] ${this.rainConfig.dropCount} gouttes créées`);
  }

  // ✅ Créer une goutte de pluie individuelle
  createRainDrop(screenWidth, screenHeight) {
    const graphics = this.scene.add.graphics();
    
    // Position initiale aléatoire
    const startX = Phaser.Math.Between(-100, screenWidth + 100);
    const startY = Phaser.Math.Between(-100, -50);
    
    // Calculer les coordonnées de fin du trait selon l'angle
    const angleRad = Phaser.Math.DegToRad(this.rainConfig.dropAngle);
    const endX = startX + Math.cos(angleRad) * this.rainConfig.dropLength;
    const endY = startY + Math.sin(angleRad) * this.rainConfig.dropLength;
    
    // Dessiner le trait de pluie
    graphics.lineStyle(this.rainConfig.dropWidth, this.rainConfig.dropColor, this.rainConfig.dropAlpha);
    graphics.moveTo(0, 0);
    graphics.lineTo(
      this.rainConfig.dropLength * Math.cos(angleRad),
      this.rainConfig.dropLength * Math.sin(angleRad)
    );
    graphics.strokePath();
    
    // Position et rotation
    graphics.x = startX;
    graphics.y = startY;
    graphics.rotation = angleRad;
    
    // Propriétés de mouvement
    graphics.speedY = Phaser.Math.Between(this.rainConfig.dropSpeed * 0.8, this.rainConfig.dropSpeed * 1.2);
    graphics.speedX = Phaser.Math.Between(-this.rainConfig.windEffect, this.rainConfig.windEffect);
    
    // Ajouter au conteneur
    this.effects.rain.add(graphics);
    this.rainDrops.push(graphics);
    
    return graphics;
  }

  // ✅ Animation continue de la pluie
  startRainAnimation() {
    if (this.rainAnimation) {
      this.rainAnimation.destroy();
    }

    this.rainAnimation = this.scene.time.addEvent({
      delay: 16, // ~60 FPS
      callback: this.updateRainDrops,
      callbackScope: this,
      loop: true
    });
  }

  // ✅ Mise à jour des gouttes
  updateRainDrops() {
    if (!this.effects.rain || !this.rainDrops) return;

    const camera = this.scene.cameras.main;
    const screenWidth = camera.width;
    const screenHeight = camera.height;
    
    this.rainDrops.forEach(drop => {
      // Mouvement de la goutte
      drop.y += drop.speedY * 0.016; // Delta time approximatif
      drop.x += drop.speedX * 0.016;
      
      // Réinitialiser si elle sort de l'écran
      if (drop.y > screenHeight + 50) {
        drop.x = Phaser.Math.Between(-100, screenWidth + 100);
        drop.y = Phaser.Math.Between(-100, -50);
      }
      
      // Réinitialiser si elle sort horizontalement
      if (drop.x < -150 || drop.x > screenWidth + 150) {
        drop.x = Phaser.Math.Between(-100, screenWidth + 100);
        drop.y = Phaser.Math.Between(-100, -50);
      }
    });
  }

  // ✅ AUTRES EFFETS MÉTÉO

  createSnowEffect() {
    console.log(`❄️ [WeatherEffects] Création effet neige...`);
    
    if (this.effects.snow) {
      this.destroySnowEffect();
    }

    // Configuration neige
    const snowConfig = {
      flakeCount: 100,
      fallSpeed: 50,
      maxSize: 4,
      color: 0xFFFFFF
    };

    this.effects.snow = this.scene.add.container(0, 0);
    this.effects.snow.setDepth(this.rainConfig.layerDepth);
    
    this.snowFlakes = [];
    const camera = this.scene.cameras.main;
    
    for (let i = 0; i < snowConfig.flakeCount; i++) {
      const flake = this.scene.add.circle(
        Phaser.Math.Between(0, camera.width),
        Phaser.Math.Between(-100, camera.height),
        Phaser.Math.Between(1, snowConfig.maxSize),
        snowConfig.color,
        0.8
      );
      
      flake.speedY = Phaser.Math.Between(snowConfig.fallSpeed * 0.5, snowConfig.fallSpeed);
      flake.speedX = Phaser.Math.Between(-20, 20);
      
      this.effects.snow.add(flake);
      this.snowFlakes.push(flake);
    }

    this.startSnowAnimation();
  }

  startSnowAnimation() {
    if (this.snowAnimation) {
      this.snowAnimation.destroy();
    }

    this.snowAnimation = this.scene.time.addEvent({
      delay: 32,
      callback: () => {
        if (!this.snowFlakes) return;
        
        const camera = this.scene.cameras.main;
        
        this.snowFlakes.forEach(flake => {
          flake.y += flake.speedY * 0.032;
          flake.x += flake.speedX * 0.032;
          
          if (flake.y > camera.height + 50) {
            flake.y = -50;
            flake.x = Phaser.Math.Between(0, camera.width);
          }
        });
      },
      loop: true
    });
  }

  createFogEffect() {
    console.log(`🌫️ [WeatherEffects] Création effet brouillard...`);
    
    if (this.effects.fog) {
      this.destroyFogEffect();
    }

    // Overlay semi-transparent pour le brouillard
    this.effects.fog = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0xCCCCCC,
      0.3
    );
    
    this.effects.fog.setDepth(this.rainConfig.layerDepth - 1);
    this.effects.fog.setScrollFactor(0);
    
    // Animation de pulsation
    this.scene.tweens.add({
      targets: this.effects.fog,
      alpha: { from: 0.3, to: 0.5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ✅ MÉTHODES DE CONTRÔLE

  setWeather(weatherType, force = false) {
    if (this.currentWeather === weatherType && !force) {
      return; // Déjà actif
    }

    console.log(`🌤️ [WeatherEffects] Changement météo: ${this.currentWeather} → ${weatherType}`);
    
    // Arrêter l'effet actuel
    this.stopAllEffects();
    
    this.currentWeather = weatherType;
    
    // Démarrer le nouvel effet
    switch (weatherType) {
      case 'rain':
        this.createRainEffect();
        break;
        
      case 'storm':
        this.createRainEffect();
        this.addThunderEffect();
        break;
        
      case 'snow':
        this.createSnowEffect();
        break;
        
      case 'fog':
        this.createFogEffect();
        break;
        
      case 'clear':
      case 'sunny':
      default:
        // Pas d'effet
        break;
    }
    
    this.isActive = weatherType !== 'clear' && weatherType !== 'sunny';
  }

  // ✅ Effet tonnerre pour les orages
  addThunderEffect() {
    if (this.thunderTimer) {
      this.thunderTimer.destroy();
    }

    this.thunderTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(5000, 15000),
      callback: () => {
        // Flash blanc
        const flash = this.scene.add.rectangle(
          this.scene.cameras.main.centerX,
          this.scene.cameras.main.centerY,
          this.scene.cameras.main.width,
          this.scene.cameras.main.height,
          0xFFFFFF,
          0.8
        );
        
        flash.setDepth(this.rainConfig.layerDepth + 1);
        flash.setScrollFactor(0);
        
        // Animation du flash
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            flash.destroy();
          }
        });
        
        // Son du tonnerre (si disponible)
        if (this.scene.sound && this.scene.sound.sounds.find(s => s.key === 'thunder')) {
          this.scene.sound.play('thunder', { volume: 0.3 });
        }
        
        console.log(`⚡ [WeatherEffects] Flash de tonnerre`);
      },
      loop: true
    });
  }

  // ✅ MÉTHODES DE NETTOYAGE

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
    if (this.effects.rain) {
      this.effects.rain.destroy();
      this.effects.rain = null;
    }
    
    if (this.rainAnimation) {
      this.rainAnimation.destroy();
      this.rainAnimation = null;
    }
    
    this.rainDrops = null;
  }

  destroySnowEffect() {
    if (this.effects.snow) {
      this.effects.snow.destroy();
      this.effects.snow = null;
    }
    
    if (this.snowAnimation) {
      this.snowAnimation.destroy();
      this.snowAnimation = null;
    }
    
    this.snowFlakes = null;
  }

  destroyFogEffect() {
    if (this.effects.fog) {
      this.effects.fog.destroy();
      this.effects.fog = null;
    }
  }

  // ✅ CONFIGURATION ET DEBUG

  updateRainIntensity(intensity) {
    // intensity: 0.1 (léger) à 2.0 (très fort)
    this.rainConfig.dropCount = Math.floor(200 * intensity);
    this.rainConfig.dropSpeed = Math.floor(300 * intensity);
    this.rainConfig.windEffect = Math.floor(50 * intensity);
    
    if (this.currentWeather === 'rain' || this.currentWeather === 'storm') {
      this.setWeather(this.currentWeather, true); // Force refresh
    }
  }

  setRainAngle(angle) {
    this.rainConfig.dropAngle = angle;
    
    if (this.currentWeather === 'rain' || this.currentWeather === 'storm') {
      this.setWeather(this.currentWeather, true);
    }
  }

  getCurrentWeather() {
    return this.currentWeather;
  }

  isWeatherActive() {
    return this.isActive;
  }

  // ✅ GESTION DES ZONES (indoor/outdoor)
  setEnvironmentType(environmentType) {
    console.log(`🏠 [WeatherEffects] Environnement: ${environmentType}`);
    
    if (environmentType === 'indoor' || environmentType === 'cave') {
      // Désactiver tous les effets météo en intérieur
      this.stopAllEffects();
      this.isActive = false;
    } else if (environmentType === 'outdoor') {
      // Réactiver la météo si on était dehors
      if (this.currentWeather !== 'clear' && this.currentWeather !== 'sunny') {
        this.setWeather(this.currentWeather, true);
      }
    }
  }

  // ✅ DEBUG ET TESTS

  debug() {
    console.log(`🔍 [WeatherEffects] === DEBUG ===`);
    console.log(`🌤️ Météo actuelle: ${this.currentWeather}`);
    console.log(`🎬 Actif: ${this.isActive}`);
    console.log(`🌧️ Pluie: ${!!this.effects.rain} (${this.rainDrops?.length || 0} gouttes)`);
    console.log(`❄️ Neige: ${!!this.effects.snow} (${this.snowFlakes?.length || 0} flocons)`);
    console.log(`🌫️ Brouillard: ${!!this.effects.fog}`);
    console.log(`⚡ Tonnerre: ${!!this.thunderTimer}`);
    console.log(`⚙️ Config pluie:`, this.rainConfig);
  }

  testWeatherCycle() {
    console.log(`🧪 [WeatherEffects] Test cycle météo...`);
    
    const weathers = ['clear', 'rain', 'storm', 'snow', 'fog'];
    let currentIndex = 0;
    
    const cycleWeather = () => {
      this.setWeather(weathers[currentIndex]);
      currentIndex = (currentIndex + 1) % weathers.length;
      
      if (currentIndex === 0) {
        console.log(`✅ [WeatherEffects] Cycle test terminé`);
        return;
      }
      
      setTimeout(cycleWeather, 3000); // 3 secondes par météo
    };
    
    cycleWeather();
  }

  destroy() {
    console.log(`🧹 [WeatherEffects] Destruction...`);
    
    this.stopAllEffects();
    
    this.scene = null;
    this.effects = null;
    this.rainConfig = null;
    
    console.log(`✅ [WeatherEffects] Détruit`);
  }
}

// ✅ COMMANDES DE TEST POUR LA CONSOLE
if (typeof window !== 'undefined') {
  window.testRain = (scene) => {
    if (scene && scene.weatherEffects) {
      scene.weatherEffects.setWeather('rain');
      console.log('🌧️ Test pluie activé');
    }
  };
  
  window.testStorm = (scene) => {
    if (scene && scene.weatherEffects) {
      scene.weatherEffects.setWeather('storm');
      console.log('⛈️ Test orage activé');
    }
  };
  
  window.clearWeather = (scene) => {
    if (scene && scene.weatherEffects) {
      scene.weatherEffects.setWeather('clear');
      console.log('☀️ Météo claire');
    }
  };
  
  console.log(`🎮 Commandes test météo disponibles:`);
  console.log(`  - window.testRain(scene)`);
  console.log(`  - window.testStorm(scene)`);
  console.log(`  - window.clearWeather(scene)`);
}
