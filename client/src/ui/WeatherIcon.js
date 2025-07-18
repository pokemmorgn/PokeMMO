// client/src/ui/WeatherIcon.js
// ICÔNE MÉTÉO SIMPLE ET OPTIMISÉ

export class WeatherIcon {
  constructor(scene, x = 50, y = 50) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    
    // Conteneur pour l'icône
    this.container = null;
    this.iconText = null;
    this.background = null;
    
    // État actuel
    this.currentWeather = 'clear';
    this.currentTime = { isDayTime: true };
    
    // Configuration
    this.config = {
      size: 40,
      fontSize: 24,
      backgroundColor: 0x000000,
      backgroundAlpha: 0.3,
      depth: 10000
    };
    
    // Mapping des icônes
    this.weatherIcons = {
      clear: { day: '☀️', night: '🌙' },
      sunny: { day: '☀️', night: '🌙' },
      rain: { day: '🌧️', night: '🌧️' },
      storm: { day: '⛈️', night: '⛈️' },
      snow: { day: '❄️', night: '❄️' },
      fog: { day: '🌫️', night: '🌫️' }
    };
    
    this.createIcon();
    
    console.log(`🌤️ [WeatherIcon] Créé à (${x}, ${y})`);
  }

  // ✅ CRÉER L'ICÔNE UI
  createIcon() {
    // Conteneur principal
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setDepth(this.config.depth);
    this.container.setScrollFactor(0); // Fixe à l'écran
    
    // Background arrondi
    this.background = this.scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
    this.background.fillRoundedRect(
      -this.config.size / 2, 
      -this.config.size / 2, 
      this.config.size, 
      this.config.size, 
      8
    );
    
    // Icône texte (emoji)
    this.iconText = this.scene.add.text(0, 0, '☀️', {
      fontSize: `${this.config.fontSize}px`,
      fill: '#ffffff',
      align: 'center'
    });
    this.iconText.setOrigin(0.5, 0.5);
    
    // Ajouter au conteneur
    this.container.add([this.background, this.iconText]);
    
    // Effet hover optionnel
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.config.size / 2, 
        -this.config.size / 2, 
        this.config.size, 
        this.config.size
      ), 
      Phaser.Geom.Rectangle.Contains
    );
    
    this.container.on('pointerover', () => {
      this.background.clear();
      this.background.fillStyle(this.config.backgroundColor, 0.6);
      this.background.fillRoundedRect(
        -this.config.size / 2, 
        -this.config.size / 2, 
        this.config.size, 
        this.config.size, 
        8
      );
    });
    
    this.container.on('pointerout', () => {
      this.background.clear();
      this.background.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
      this.background.fillRoundedRect(
        -this.config.size / 2, 
        -this.config.size / 2, 
        this.config.size, 
        this.config.size, 
        8
      );
    });
    
    // Mettre à jour l'icône initiale
    this.updateIcon();
  }

  // ✅ METTRE À JOUR L'ICÔNE
  updateIcon() {
    const weatherData = this.weatherIcons[this.currentWeather] || this.weatherIcons.clear;
    const icon = this.currentTime.isDayTime ? weatherData.day : weatherData.night;
    
    if (this.iconText) {
      this.iconText.setText(icon);
      
      // Petite animation de changement
      this.scene.tweens.add({
        targets: this.iconText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
    
    console.log(`🌤️ [WeatherIcon] Mis à jour: ${this.currentWeather} → ${icon}`);
  }

  // ✅ CHANGER LA MÉTÉO
  setWeather(weather) {
    if (this.currentWeather !== weather) {
      this.currentWeather = weather;
      this.updateIcon();
    }
  }

  // ✅ CHANGER LE TEMPS (JOUR/NUIT)
  setTime(isDayTime) {
    if (this.currentTime.isDayTime !== isDayTime) {
      this.currentTime.isDayTime = isDayTime;
      this.updateIcon();
    }
  }

  // ✅ CHANGER LA POSITION
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  // ✅ MONTRER/CACHER
  setVisible(visible) {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }

  // ✅ CHANGER LA TAILLE
  setSize(size) {
    this.config.size = size;
    this.config.fontSize = size * 0.6;
    
    if (this.container) {
      this.destroy();
      this.createIcon();
    }
  }

  // ✅ INTÉGRATION AVEC GLOBALWEATHERMANAGER
  connectToGlobalWeather(globalWeatherManager) {
    // Écouter les changements de météo
    globalWeatherManager.getTimeWeatherManager().onWeatherChange((weather, displayName) => {
      this.setWeather(weather);
    });
    
    // Écouter les changements de temps
    globalWeatherManager.getTimeWeatherManager().onTimeChange((hour, isDayTime) => {
      this.setTime(isDayTime);
    });
    
    // Appliquer l'état actuel
    const currentWeather = globalWeatherManager.getCurrentWeather();
    const currentTime = globalWeatherManager.getCurrentTime();
    
    this.setWeather(currentWeather.weather);
    this.setTime(currentTime.isDayTime);
    
    console.log(`🔗 [WeatherIcon] Connecté au GlobalWeatherManager`);
  }

  // ✅ NETTOYAGE
  destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.iconText = null;
      this.background = null;
    }
    
    console.log(`🧹 [WeatherIcon] Détruit`);
  }
}

// ✅ UTILISATION DANS UNE SCÈNE
/*
// Dans ta scène (ex: GameScene.js)
import { WeatherIcon } from '../ui/WeatherIcon.js';
import { globalWeatherManager } from '../managers/GlobalWeatherManager.js';

export class GameScene extends Phaser.Scene {
  create() {
    // Créer l'icône météo (coin haut-gauche)
    this.weatherIcon = new WeatherIcon(this, 50, 50);
    
    // Connecter au système météo global
    if (globalWeatherManager.isInitialized) {
      this.weatherIcon.connectToGlobalWeather(globalWeatherManager);
    } else {
      // Attendre que le système soit prêt
      setTimeout(() => {
        this.weatherIcon.connectToGlobalWeather(globalWeatherManager);
      }, 1000);
    }
  }
  
  destroy() {
    if (this.weatherIcon) {
      this.weatherIcon.destroy();
    }
  }
}
*/

// ✅ COMMANDES DE TEST
if (typeof window !== 'undefined') {
  window.createWeatherIcon = (scene, x = 50, y = 50) => {
    const icon = new WeatherIcon(scene, x, y);
    console.log('🌤️ Icône météo créée');
    return icon;
  };
  
  window.testWeatherIcon = (scene) => {
    const icon = window.createWeatherIcon(scene, 50, 50);
    
    // Test séquence
    setTimeout(() => icon.setWeather('rain'), 1000);
    setTimeout(() => icon.setWeather('storm'), 2000);
    setTimeout(() => icon.setWeather('snow'), 3000);
    setTimeout(() => icon.setTime(false), 4000); // Nuit
    setTimeout(() => icon.setWeather('clear'), 5000);
    setTimeout(() => icon.setTime(true), 6000); // Jour
    
    console.log('🧪 Test séquence icône météo lancé');
    return icon;
  };
  
  console.log('🎮 Commandes icône météo disponibles:');
  console.log('  - window.createWeatherIcon(scene, x, y)');
  console.log('  - window.testWeatherIcon(scene)');
}
