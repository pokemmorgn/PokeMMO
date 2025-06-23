// client/src/game/DayNightWeatherManager.js
export class DayNightWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { name: 'clear', displayName: 'Clair' };
    
    // Couches de rendu
    this.dayNightOverlay = null;
    this.weatherOverlay = null;
    this.weatherParticles = null;
    
    // État
    this.isInitialized = false;
    
    console.log('[DayNightWeatherManager] Initialisé pour', scene.scene.key);
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('[DayNightWeatherManager] Initialisation des overlays...');
    
    this.createDayNightOverlay();
    this.createWeatherOverlay();
    
    this.isInitialized = true;
    
    // Demander l'état initial au serveur
    this.requestCurrentTimeAndWeather();
  }

  createDayNightOverlay() {
    // Créer une couche semi-transparente pour l'effet jour/nuit
    this.dayNightOverlay = this.scene.add.rectangle(
      0, 0,
      this.scene.game.config.width * 2,
      this.scene.game.config.height * 2,
      0x000066,
      0
    );
    
    this.dayNightOverlay.setOrigin(0, 0);
    this.dayNightOverlay.setDepth(1000); // Au-dessus de tout
    this.dayNightOverlay.setScrollFactor(0); // Fixe par rapport à la caméra
    
    console.log('[DayNightWeatherManager] Overlay jour/nuit créé');
  }

  createWeatherOverlay() {
    // Créer une couche pour les effets météo
    this.weatherOverlay = this.scene.add.container(0, 0);
    this.weatherOverlay.setDepth(999);
    this.weatherOverlay.setScrollFactor(0);
    
    console.log('[DayNightWeatherManager] Overlay météo créé');
  }

  requestCurrentTimeAndWeather() {
    if (this.scene.gameClient) {
      this.scene.gameClient.send("getTime");
      this.scene.gameClient.send("getWeather");
    }
  }

  updateTime(timeData) {
    console.log('[DayNightWeatherManager] Mise à jour temps:', timeData);
    
    this.currentTime = {
      hour: timeData.gameHour,
      isDayTime: timeData.isDayTime
    };
    
    this.applyDayNightEffect();
    
    // Notifier d'autres systèmes si nécessaire
    this.scene.events.emit('timeChanged', this.currentTime);
  }

  updateWeather(weatherData) {
    console.log('[DayNightWeatherManager] Mise à jour météo:', weatherData);
    
    this.currentWeather = {
      name: weatherData.weather,
      displayName: weatherData.displayName
    };
    
    this.applyWeatherEffect();
    
    // Notifier d'autres systèmes si nécessaire
    this.scene.events.emit('weatherChanged', this.currentWeather);
  }

  applyDayNightEffect() {
    if (!this.dayNightOverlay) return;
    
    const { hour, isDayTime } = this.currentTime;
    
    let alpha = 0;
    let tint = 0x000066; // Bleu nuit par défaut
    
    if (!isDayTime) {
      // Nuit (19h-6h) - plus sombre
      if (hour >= 22 || hour <= 4) {
        alpha = 0.8; // Nuit profonde
        tint = 0x000044;
      } else if (hour >= 19 || hour <= 6) {
        alpha = 0.6; // Crépuscule/aube
        tint = 0x330066;
      }
    } else {
      // Jour (7h-18h) - clair
      if (hour >= 8 && hour <= 17) {
        alpha = 0; // Plein jour
      } else {
        alpha = 0.2; // Lever/coucher du soleil
        tint = 0xFF6600;
      }
    }
    
    // Appliquer l'effet avec une transition douce
    this.scene.tweens.add({
      targets: this.dayNightOverlay,
      alpha: alpha,
      duration: 2000,
      ease: 'Sine.easeInOut'
    });
    
    this.dayNightOverlay.setFillStyle(tint);
    
    console.log(`[DayNightWeatherManager] Effet jour/nuit: heure=${hour}, alpha=${alpha}`);
  }

  applyWeatherEffect() {
    if (!this.weatherOverlay) return;
    
    // Nettoyer les particules existantes
    this.clearWeatherParticles();
    
    const weather = this.currentWeather.name;
    
    switch (weather) {
      case 'rain':
        this.createRainEffect();
        break;
      case 'snow':
        this.createSnowEffect();
        break;
      case 'fog':
        this.createFogEffect();
        break;
      case 'storm':
        this.createStormEffect();
        break;
      case 'clear':
      default:
        // Pas d'effet pour temps clair
        break;
    }
    
    console.log(`[DayNightWeatherManager] Effet météo appliqué: ${weather}`);
  }

  createRainEffect() {
    // Créer des lignes de pluie avec des rectangles
    const rainDrops = [];
    const numDrops = 100;
    
    for (let i = 0; i < numDrops; i++) {
      const rainDrop = this.scene.add.rectangle(
        Phaser.Math.Between(-100, this.scene.game.config.width + 100),
        Phaser.Math.Between(-200, -50),
        1, // largeur
        Phaser.Math.Between(10, 20), // hauteur variable
        0x87CEEB, // couleur bleu ciel
        Phaser.Math.FloatBetween(0.3, 0.7) // transparence
      );
      
      rainDrop.setDepth(998);
      rainDrop.setScrollFactor(0.1);
      
      // Animation de chute
      this.scene.tweens.add({
        targets: rainDrop,
        y: rainDrop.y + this.scene.game.config.height + 100,
        x: rainDrop.x - Phaser.Math.Between(20, 50), // effet diagonal
        duration: Phaser.Math.Between(1000, 2000),
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => {
          // Repositionner en haut
          rainDrop.y = Phaser.Math.Between(-200, -50);
          rainDrop.x = Phaser.Math.Between(-100, this.scene.game.config.width + 100);
        }
      });
      
      rainDrops.push(rainDrop);
      this.weatherOverlay.add(rainDrop);
    }
    
    this.weatherParticles = { drops: rainDrops };
    console.log('[DayNightWeatherManager] Pluie créée avec', numDrops, 'gouttes');
  }

  createSnowEffect() {
    // Créer des flocons de neige avec des cercles
    const snowFlakes = [];
    const numFlakes = 50;
    
    for (let i = 0; i < numFlakes; i++) {
      const snowFlake = this.scene.add.circle(
        Phaser.Math.Between(-50, this.scene.game.config.width + 50),
        Phaser.Math.Between(-100, -20),
        Phaser.Math.Between(2, 5), // rayon variable
        0xFFFFFF, // blanc
        Phaser.Math.FloatBetween(0.5, 0.9) // transparence
      );
      
      snowFlake.setDepth(998);
      snowFlake.setScrollFactor(0.05);
      
      // Animation de chute douce
      this.scene.tweens.add({
        targets: snowFlake,
        y: snowFlake.y + this.scene.game.config.height + 50,
        x: snowFlake.x + Phaser.Math.Between(-20, 20), // oscillation
        duration: Phaser.Math.Between(3000, 6000),
        ease: 'Sine.easeInOut',
        repeat: -1,
        onRepeat: () => {
          snowFlake.y = Phaser.Math.Between(-100, -20);
          snowFlake.x = Phaser.Math.Between(-50, this.scene.game.config.width + 50);
        }
      });
      
      snowFlakes.push(snowFlake);
      this.weatherOverlay.add(snowFlake);
    }
    
    this.weatherParticles = { flakes: snowFlakes };
    console.log('[DayNightWeatherManager] Neige créée avec', numFlakes, 'flocons');
  }

  createFogEffect() {
    // Créer un effet de brouillard
    const fogOverlay = this.scene.add.rectangle(
      0, 0,
      this.scene.game.config.width * 2,
      this.scene.game.config.height * 2,
      0xCCCCCC,
      0.3
    );
    
    fogOverlay.setOrigin(0, 0);
    fogOverlay.setScrollFactor(0);
    
    this.weatherOverlay.add(fogOverlay);
    this.weatherParticles = fogOverlay;
  }

  createStormEffect() {
    // Combiner pluie + éclairs
    this.createRainEffect();
    
    // Ajouter des éclairs occasionnels
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(3000, 8000),
      callback: () => {
        this.createLightningFlash();
      },
      loop: true
    });
  }

  createLightningFlash() {
    const flash = this.scene.add.rectangle(
      0, 0,
      this.scene.game.config.width * 2,
      this.scene.game.config.height * 2,
      0xFFFFFF,
      0
    );
    
    flash.setOrigin(0, 0);
    flash.setDepth(1001); // Au-dessus de tout
    flash.setScrollFactor(0);
    
    // Animation d'éclair
    this.scene.tweens.add({
      targets: flash,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      repeat: Phaser.Math.Between(1, 3),
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  clearWeatherParticles() {
    if (this.weatherParticles) {
      // Nettoyer les gouttes de pluie
      if (this.weatherParticles.drops) {
        this.weatherParticles.drops.forEach(drop => {
          if (drop && drop.destroy) {
            drop.destroy();
          }
        });
      }
      
      // Nettoyer les flocons de neige
      if (this.weatherParticles.flakes) {
        this.weatherParticles.flakes.forEach(flake => {
          if (flake && flake.destroy) {
            flake.destroy();
          }
        });
      }
      
      // Nettoyer les autres types (fog, particules, etc.)
      if (this.weatherParticles.destroy) {
        this.weatherParticles.destroy();
      }
      
      this.weatherParticles = null;
    }
    
    // Nettoyer le container
    if (this.weatherOverlay) {
      this.weatherOverlay.removeAll(true);
    }
  }

  // Méthodes publiques pour récupérer l'état actuel
  getCurrentTime() {
    return this.currentTime;
  }

  getCurrentWeather() {
    return this.currentWeather;
  }

  isNightTime() {
    return !this.currentTime.isDayTime;
  }

  isDayTime() {
    return this.currentTime.isDayTime;
  }

  // Nettoyage
  destroy() {
    console.log('[DayNightWeatherManager] Nettoyage...');
    
    this.clearWeatherParticles();
    
    if (this.dayNightOverlay) {
      this.dayNightOverlay.destroy();
      this.dayNightOverlay = null;
    }
    
    if (this.weatherOverlay) {
      this.weatherOverlay.destroy();
      this.weatherOverlay = null;
    }
    
    this.isInitialized = false;
  }

  // Méthodes pour les encounters (utilisées par d'autres systèmes)
  getEncounterModifiers() {
    return {
      timeOfDay: this.currentTime.isDayTime ? 'day' : 'night',
      weather: this.currentWeather.name
    };
  }
}