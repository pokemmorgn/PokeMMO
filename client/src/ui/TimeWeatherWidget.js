// client/src/ui/TimeWeatherWidget.js
// WIDGET TEMPS/MÉTÉO - ARC DE CERCLE MMO STYLE

export class TimeWeatherWidget {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.clockContainer = null;
    this.weatherContainer = null;
    this.timeText = null;
    this.weatherText = null;
    this.clockHand = null;
    this.hourMarkers = [];
    this.weatherIcon = null;
    this.backgroundArc = null;
    this.glowEffect = null;
    
    // État actuel
    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Ciel dégagé' };
    
    // Configuration
    this.config = {
      x: 0, // Position X (sera centrée)
      y: 60, // Position Y depuis le haut
      radius: 120, // Rayon de l'arc
      arcWidth: 8, // Épaisseur de l'arc
      depth: 1000, // Profondeur d'affichage
      animationSpeed: 2000, // Vitesse d'animation en ms
      glowIntensity: 0.3, // Intensité du glow
      fadeDistance: 200 // Distance pour le fade
    };
    
    // Couleurs selon l'heure
    this.timeColors = {
      dawn: { primary: 0xFF8C42, secondary: 0xFFB347, glow: 0xFF6B1A },
      day: { primary: 0x4A90E2, secondary: 0x87CEEB, glow: 0x1E6091 },
      dusk: { primary: 0xFF6B6B, secondary: 0xFF8E53, glow: 0xD63031 },
      night: { primary: 0x2C3E50, secondary: 0x34495E, glow: 0x1A252F }
    };
    
    // Icônes météo (caractères Unicode)
    this.weatherIcons = {
      clear: '☀️',
      rain: '🌧️',
      storm: '⛈️',
      snow: '❄️',
      fog: '🌫️',
      cloudy: '☁️'
    };
    
    console.log('🕐 [TimeWeatherWidget] Widget créé');
  }

  create() {
    console.log('🎨 [TimeWeatherWidget] Création du widget...');
    
    // Container principal
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(this.config.depth);
    
    // Positionner au centre horizontal
    const camera = this.scene.cameras.main;
    this.container.setPosition(camera.centerX, this.config.y);
    
    // Créer l'arc de fond
    this.createBackgroundArc();
    
    // Créer les marqueurs d'heures
    this.createHourMarkers();
    
    // Créer l'aiguille
    this.createClockHand();
    
    // Créer le texte de l'heure
    this.createTimeText();
    
    // Créer l'affichage météo
    this.createWeatherDisplay();
    
    // Créer les effets visuels
    this.createVisualEffects();
    
    // Mise à jour initiale
    this.updateDisplay();
    
    console.log('✅ [TimeWeatherWidget] Widget créé avec succès');
  }

  createBackgroundArc() {
    // Arc de fond principal
    this.backgroundArc = this.scene.add.graphics();
    this.backgroundArc.setDepth(-1);
    
    // Arc externe (fond)
    this.backgroundArc.lineStyle(this.config.arcWidth, 0x2C3E50, 0.6);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius, 
      Phaser.Math.DegToRad(210), // Début à 210°
      Phaser.Math.DegToRad(330), // Fin à 330°
      false);
    this.backgroundArc.strokePath();
    
    // Arc interne (glow)
    this.backgroundArc.lineStyle(this.config.arcWidth - 2, 0x34495E, 0.3);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius - 2, 
      Phaser.Math.DegToRad(210), 
      Phaser.Math.DegToRad(330), 
      false);
    this.backgroundArc.strokePath();
    
    this.container.add(this.backgroundArc);
  }

  createHourMarkers() {
    this.hourMarkers = [];
    
    // Créer 24 marqueurs pour les heures
    for (let hour = 0; hour < 24; hour++) {
      const angle = Phaser.Math.DegToRad(210 + (hour * 5)); // 120° / 24 heures = 5° par heure
      
      // Position du marqueur
      const x = Math.cos(angle) * this.config.radius;
      const y = Math.sin(angle) * this.config.radius;
      
      // Taille du marqueur (plus gros pour les heures importantes)
      const isMainHour = hour % 6 === 0; // 0h, 6h, 12h, 18h
      const markerSize = isMainHour ? 4 : 2;
      const markerColor = this.getMarkerColor(hour);
      
      // Créer le marqueur
      const marker = this.scene.add.circle(x, y, markerSize, markerColor, 0.8);
      marker.setDepth(1);
      
      // Ajouter un label pour les heures principales
      if (isMainHour) {
        const labelX = Math.cos(angle) * (this.config.radius + 20);
        const labelY = Math.sin(angle) * (this.config.radius + 20);
        
        const label = this.scene.add.text(labelX, labelY, `${hour}h`, {
          fontSize: '14px',
          fill: '#ECF0F1',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold'
        });
        label.setOrigin(0.5, 0.5);
        label.setDepth(2);
        label.setAlpha(0.7);
        
        this.container.add(label);
      }
      
      this.hourMarkers.push(marker);
      this.container.add(marker);
    }
  }

  getMarkerColor(hour) {
    if (hour >= 6 && hour < 12) return 0xF39C12; // Matin - Orange
    if (hour >= 12 && hour < 18) return 0x3498DB; // Après-midi - Bleu
    if (hour >= 18 && hour < 21) return 0xE74C3C; // Soirée - Rouge
    return 0x9B59B6; // Nuit - Violet
  }

  createClockHand() {
    // Aiguille principale
    this.clockHand = this.scene.add.graphics();
    this.clockHand.setDepth(3);
    
    // Style de l'aiguille
    this.clockHand.lineStyle(3, 0xECF0F1, 0.9);
    this.clockHand.beginPath();
    this.clockHand.moveTo(0, 0);
    this.clockHand.lineTo(0, -this.config.radius + 10);
    this.clockHand.strokePath();
    
    // Centre de l'aiguille
    const center = this.scene.add.circle(0, 0, 6, 0xF39C12, 0.9);
    center.setDepth(4);
    center.setStrokeStyle(2, 0xECF0F1, 0.8);
    
    this.container.add(this.clockHand);
    this.container.add(center);
  }

  createTimeText() {
    // Texte de l'heure principale
    this.timeText = this.scene.add.text(0, 30, '12:00', {
      fontSize: '24px',
      fill: '#ECF0F1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2C3E50',
      strokeThickness: 2
    });
    this.timeText.setOrigin(0.5, 0.5);
    this.timeText.setDepth(5);
    
    // Indicateur jour/nuit
    this.dayNightIndicator = this.scene.add.text(0, 50, '☀️ JOUR', {
      fontSize: '14px',
      fill: '#F39C12',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    this.dayNightIndicator.setOrigin(0.5, 0.5);
    this.dayNightIndicator.setDepth(5);
    
    this.container.add(this.timeText);
    this.container.add(this.dayNightIndicator);
  }

  createWeatherDisplay() {
    // Container météo
    this.weatherContainer = this.scene.add.container(0, -40);
    this.weatherContainer.setDepth(5);
    
    // Icône météo
    this.weatherIcon = this.scene.add.text(0, 0, '☀️', {
      fontSize: '32px'
    });
    this.weatherIcon.setOrigin(0.5, 0.5);
    
    // Texte météo
    this.weatherText = this.scene.add.text(0, 25, 'Ciel dégagé', {
      fontSize: '12px',
      fill: '#BDC3C7',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    this.weatherText.setOrigin(0.5, 0.5);
    
    this.weatherContainer.add(this.weatherIcon);
    this.weatherContainer.add(this.weatherText);
    this.container.add(this.weatherContainer);
  }

  createVisualEffects() {
    // Effet de glow autour du widget
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(-2);
    
    // Glow externe
    this.glowEffect.lineStyle(12, 0x3498DB, 0.1);
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, this.config.radius + 10, 
      Phaser.Math.DegToRad(210), 
      Phaser.Math.DegToRad(330), 
      false);
    this.glowEffect.strokePath();
    
    this.container.add(this.glowEffect);
    
    // Animation du glow
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.1, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // =====================================
  // MÉTHODES DE MISE À JOUR
  // =====================================

  updateTime(hour, isDayTime) {
    console.log(`🕐 [TimeWeatherWidget] Mise à jour temps: ${hour}h ${isDayTime ? 'JOUR' : 'NUIT'}`);
    
    this.currentTime = { hour, isDayTime };
    this.updateDisplay();
  }

  updateWeather(weather, displayName) {
    console.log(`🌤️ [TimeWeatherWidget] Mise à jour météo: ${displayName}`);
    
    this.currentWeather = { weather, displayName };
    this.updateDisplay();
  }

  updateDisplay() {
    // Mettre à jour l'aiguille
    this.updateClockHand();
    
    // Mettre à jour le texte
    this.updateTimeText();
    
    // Mettre à jour la météo
    this.updateWeatherDisplay();
    
    // Mettre à jour les couleurs
    this.updateColors();
  }

  updateClockHand() {
    // Calculer l'angle de l'aiguille
    const angle = this.getClockAngle(this.currentTime.hour);
    
    // Animer l'aiguille
    this.scene.tweens.add({
      targets: this.clockHand,
      rotation: angle,
      duration: this.config.animationSpeed,
      ease: 'Power2.easeInOut'
    });
  }

  getClockAngle(hour) {
    // Convertir l'heure en angle sur l'arc (210° à 330°)
    const startAngle = 210;
    const endAngle = 330;
    const totalAngle = endAngle - startAngle; // 120°
    
    // Calculer l'angle pour cette heure
    const hourAngle = (hour / 24) * totalAngle;
    return Phaser.Math.DegToRad(startAngle + hourAngle);
  }

  updateTimeText() {
    // Format de l'heure
    const displayHour = this.currentTime.hour === 0 ? 12 : 
                       this.currentTime.hour > 12 ? this.currentTime.hour - 12 : 
                       this.currentTime.hour;
    const period = this.currentTime.hour < 12 ? 'AM' : 'PM';
    const timeString = `${displayHour}:00 ${period}`;
    
    // Mettre à jour le texte
    this.timeText.setText(timeString);
    
    // Mettre à jour l'indicateur jour/nuit
    const dayNightText = this.currentTime.isDayTime ? '☀️ JOUR' : '🌙 NUIT';
    const dayNightColor = this.currentTime.isDayTime ? '#F39C12' : '#9B59B6';
    
    this.dayNightIndicator.setText(dayNightText);
    this.dayNightIndicator.setFill(dayNightColor);
  }

  updateWeatherDisplay() {
    // Icône météo
    const iconText = this.weatherIcons[this.currentWeather.weather] || '☀️';
    this.weatherIcon.setText(iconText);
    
    // Texte météo
    this.weatherText.setText(this.currentWeather.displayName);
    
    // Animation de l'icône
    this.scene.tweens.add({
      targets: this.weatherIcon,
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut'
    });
  }

  updateColors() {
    // Déterminer la période de la journée
    const period = this.getTimePeriod(this.currentTime.hour);
    const colors = this.timeColors[period];
    
    // Mettre à jour les couleurs de l'arc
    this.backgroundArc.clear();
    
    // Arc principal avec la nouvelle couleur
    this.backgroundArc.lineStyle(this.config.arcWidth, colors.primary, 0.8);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius, 
      Phaser.Math.DegToRad(210), 
      Phaser.Math.DegToRad(330), 
      false);
    this.backgroundArc.strokePath();
    
    // Arc de glow
    this.backgroundArc.lineStyle(this.config.arcWidth - 2, colors.secondary, 0.4);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius - 2, 
      Phaser.Math.DegToRad(210), 
      Phaser.Math.DegToRad(330), 
      false);
    this.backgroundArc.strokePath();
    
    // Mettre à jour le glow
    this.glowEffect.clear();
    this.glowEffect.lineStyle(12, colors.glow, 0.2);
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, this.config.radius + 10, 
      Phaser.Math.DegToRad(210), 
      Phaser.Math.DegToRad(330), 
      false);
    this.glowEffect.strokePath();
  }

  getTimePeriod(hour) {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
  }

  // =====================================
  // MÉTHODES DE GESTION
  // =====================================

  setPosition(x, y) {
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  setVisible(visible) {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }

  setAlpha(alpha) {
    if (this.container) {
      this.container.setAlpha(alpha);
    }
  }

  // Animation d'apparition
  fadeIn(duration = 1000) {
    if (this.container) {
      this.container.setAlpha(0);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration: duration,
        ease: 'Power2.easeOut'
      });
    }
  }

  // Animation de disparition
  fadeOut(duration = 1000) {
    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: duration,
        ease: 'Power2.easeIn'
      });
    }
  }

  // Adapter à la taille de l'écran
  onResize() {
    if (this.container) {
      const camera = this.scene.cameras.main;
      this.container.setPosition(camera.centerX, this.config.y);
    }
  }

  debug() {
    console.log('🔍 [TimeWeatherWidget] === DEBUG WIDGET ===');
    console.log('📊 Position:', this.container?.x, this.container?.y);
    console.log('🕐 Temps actuel:', this.currentTime);
    console.log('🌤️ Météo actuelle:', this.currentWeather);
    console.log('👁️ Visible:', this.container?.visible);
    console.log('🎨 Alpha:', this.container?.alpha);
  }

  destroy() {
    console.log('🧹 [TimeWeatherWidget] Destruction du widget...');
    
    // Arrêter toutes les animations
    this.scene.tweens.killTweensOf(this.glowEffect);
    this.scene.tweens.killTweensOf(this.clockHand);
    this.scene.tweens.killTweensOf(this.weatherIcon);
    this.scene.tweens.killTweensOf(this.container);
    
    // Détruire le container (détruit automatiquement tous les enfants)
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    // Nettoyer les références
    this.clockContainer = null;
    this.weatherContainer = null;
    this.timeText = null;
    this.weatherText = null;
    this.clockHand = null;
    this.hourMarkers = [];
    this.weatherIcon = null;
    this.backgroundArc = null;
    this.glowEffect = null;
    
    console.log('✅ [TimeWeatherWidget] Widget détruit');
  }
}

// =====================================
// INTÉGRATION AVEC LES SCÈNES
// =====================================

// Mixin pour ajouter le widget à une scène
export const TimeWeatherWidgetMixin = {
  createTimeWeatherWidget() {
    console.log('🎨 [Scene] Création du widget temps/météo...');
    
    // Créer le widget
    this.timeWeatherWidget = new TimeWeatherWidget(this);
    this.timeWeatherWidget.create();
    
    // Connecter aux événements de redimensionnement
    this.scale.on('resize', () => {
      this.timeWeatherWidget.onResize();
    });
    
    // Apparition en fade
    this.timeWeatherWidget.fadeIn();
    
    console.log('✅ [Scene] Widget temps/météo créé');
  },

  updateTimeWeatherWidget(timeData, weatherData) {
    if (this.timeWeatherWidget) {
      if (timeData) {
        this.timeWeatherWidget.updateTime(timeData.hour, timeData.isDayTime);
      }
      if (weatherData) {
        this.timeWeatherWidget.updateWeather(weatherData.weather, weatherData.displayName);
      }
    }
  },

  destroyTimeWeatherWidget() {
    if (this.timeWeatherWidget) {
      this.timeWeatherWidget.destroy();
      this.timeWeatherWidget = null;
    }
  }
};

console.log('✅ [TimeWeatherWidget] Classe chargée');
console.log('📖 Utilisation: const widget = new TimeWeatherWidget(scene); widget.create();');
