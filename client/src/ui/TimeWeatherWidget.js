// TimeWeatherWidget.js - VERSION BARRE HORIZONTALE, PRÊT À COMMIT
export class TimeWeatherWidget {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.hourMarkers = [];
    this.weatherIcon = null;
    this.weatherText = null;
    this.timeMarker = null;

    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Clear skies' };

    this.config = {
      x: 0,
      y: 80,
      width: 380,   // largeur totale de la barre
      barHeight: 28,
      markerHeight: 36,
      markerWidth: 6,
      depth: 1000,
    };

    this.timeColors = {
      dawn: { primary: 0xFF8C42, secondary: 0xFFB347, glow: 0xFF6B1A },
      day: { primary: 0x4A90E2, secondary: 0x87CEEB, glow: 0x1E6091 },
      dusk: { primary: 0xFF6B6B, secondary: 0xFF8E53, glow: 0xD63031 },
      night: { primary: 0x2C3E50, secondary: 0x34495E, glow: 0x1A252F }
    };

    this.weatherIcons = {
      clear: '☀️',
      rain: '🌧️',
      storm: '⛈️',
      snow: '❄️',
      fog: '🌫️',
      cloudy: '☁️'
    };

    this.englishHourLabels = [
      'Midn', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
      'Noon', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
    ];
  }

  create() {
    // Container principal
    this.container = this.scene.add.container(0, 0).setDepth(this.config.depth).setScrollFactor(0);

    // Positionner au centre horizontal de l'écran
    this.updatePosition();

    // Création de la barre principale horizontale
    this.createTimeBar();

    // Marqueurs d'heure (et labels anglais en-dessous)
    this.createHourMarkers();

    // Marqueur mobile (heure actuelle)
    this.createTimeMarker();

    // Météo à côté (ou dessous)
    this.createWeatherDisplay();

    // Initial update
    this.updateDisplay();
  }

  updatePosition() {
    // Centrer horizontalement, Y paramétrable
    const centerX = this.scene.scale.width / 2;
    this.container.setPosition(centerX, this.config.y);
  }

createTimeBar() {
  if (this.timeBar) this.timeBar.destroy();

  // Couleur dynamique selon période
  const period = this.getTimePeriod(this.currentTime.hour);
  const color = this.timeColors[period].primary;

  // Augmente la hauteur et opacité pour test
  const barY = 18; // décale la barre pour éviter d'être à 0
  this.timeBar = this.scene.add.graphics();
  this.timeBar.setScrollFactor(0);
  this.timeBar.setDepth(1);

  // Fond visible
  this.timeBar.fillStyle(color, 0.5); // opacité augmentée
  this.timeBar.fillRoundedRect(-this.config.width / 2, barY, this.config.width, 28, 10);

  // Bordure contrastée
  this.timeBar.lineStyle(3, 0xffffff, 0.8);
  this.timeBar.strokeRoundedRect(-this.config.width / 2, barY, this.config.width, 28, 10);

  this.container.add(this.timeBar);
}

  createHourMarkers() {
    // Efface existants
    this.hourMarkers.forEach(marker => marker.destroy());
    this.hourMarkers = [];
    if (this.hourLabels) {
      this.hourLabels.forEach(lbl => lbl.destroy());
    }
    this.hourLabels = [];

    // Un marqueur toutes les 2h avec label, petit trait sinon
    for (let hour = 0; hour < 24; hour++) {
      const pos = -this.config.width/2 + (hour/23)*this.config.width;
      const isMajor = (hour % 3 === 0); // toutes les 3h plus grand

      // Trait
      const marker = this.scene.add.rectangle(pos, this.config.barHeight / 2, isMajor ? 3 : 1.5, isMajor ? 18 : 10, 0xFFFFFF, isMajor ? 0.7 : 0.38)
        .setOrigin(0.5, 0);
      marker.setScrollFactor(0);
      marker.setDepth(2);
      this.container.add(marker);
      this.hourMarkers.push(marker);

      // Label anglais (sous la barre)
      if (isMajor) {
        const lbl = this.scene.add.text(
          pos, this.config.barHeight + 8, this.englishHourLabels[hour],
          { fontSize: '11px', fill: '#e6eaf2', fontFamily: 'Arial, sans-serif', fontStyle: 'bold' }
        ).setOrigin(0.5, 0).setAlpha(0.8).setScrollFactor(0).setDepth(2);
        this.container.add(lbl);
        this.hourLabels.push(lbl);
      }
    }
  }

  createTimeMarker() {
    // Efface ancien
    if (this.timeMarker) this.timeMarker.destroy();

    // Position initiale
    const pos = -this.config.width / 2 + (this.currentTime.hour / 23) * this.config.width;

    this.timeMarker = this.scene.add.triangle(
      pos, -7,
      0, 0,
      10, 0,
      5, 16,
      0xFFD700, 0.88
    );
    this.timeMarker.setOrigin(0.5, 1);
    this.timeMarker.setDepth(5);
    this.timeMarker.setScrollFactor(0);

    this.container.add(this.timeMarker);

    // Heure textuelle au-dessus
    if (this.markerLabel) this.markerLabel.destroy();
    this.markerLabel = this.scene.add.text(pos, -20, this.getFormattedHourLabel(), {
      fontSize: '15px',
      fill: '#fff9c2',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#444', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(5).setScrollFactor(0);

    this.container.add(this.markerLabel);
  }

  updateTimeMarker() {
    // Calcul position
    const pos = -this.config.width / 2 + (this.currentTime.hour / 23) * this.config.width;
    this.timeMarker.setPosition(pos, -7);
    this.markerLabel.setPosition(pos, -20);
    this.markerLabel.setText(this.getFormattedHourLabel());
  }

  getFormattedHourLabel() {
    let h = this.currentTime.hour;
    let ampm = h < 12 ? 'am' : 'pm';
    let hourDisp = h === 0 ? 12 : h > 12 ? h - 12 : h;
    if (h === 12) ampm = 'pm';
    if (h === 0) ampm = 'am';
    return `${hourDisp}:00 ${ampm}`;
  }

  createWeatherDisplay() {
    if (this.weatherIcon) this.weatherIcon.destroy();
    if (this.weatherText) this.weatherText.destroy();

    // Icône météo
    this.weatherIcon = this.scene.add.text(
      this.config.width / 2 + 28, this.config.barHeight / 2,
      this.weatherIcons[this.currentWeather.weather] || '☀️',
      { fontSize: '26px', fontFamily: 'Arial' }
    ).setOrigin(0.5, 0.5).setDepth(10).setScrollFactor(0);

    // Texte météo sous l'icône
    this.weatherText = this.scene.add.text(
      this.config.width / 2 + 28, this.config.barHeight / 2 + 20,
      this.currentWeather.displayName,
      { fontSize: '11px', fill: '#BDC3C7', fontFamily: 'Arial, sans-serif', fontStyle: 'bold' }
    ).setOrigin(0.5, 0).setDepth(10).setScrollFactor(0);

    this.container.add(this.weatherIcon);
    this.container.add(this.weatherText);
  }

  updateWeatherDisplay() {
    this.weatherIcon.setText(this.weatherIcons[this.currentWeather.weather] || '☀️');
    this.weatherText.setText(this.currentWeather.displayName);
  }

  getTimePeriod(hour) {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
  }

  updateTime(hour, isDayTime) {
    this.currentTime = { hour, isDayTime };
    this.createTimeBar(); // Rafraîchir couleur selon période
    this.updateTimeMarker();
    this.updateDisplay();
  }

  updateWeather(weather, displayName) {
    this.currentWeather = { weather, displayName };
    this.updateWeatherDisplay();
  }

  updateDisplay() {
    this.updateTimeMarker();
    this.updateWeatherDisplay();
  }

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

  onResize() {
    this.updatePosition();
    // La barre et tous les éléments restent centrés
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.hourMarkers = [];
    if (this.weatherIcon) this.weatherIcon.destroy();
    if (this.weatherText) this.weatherText.destroy();
    if (this.timeMarker) this.timeMarker.destroy();
    if (this.markerLabel) this.markerLabel.destroy();
  }
}

console.log('[TimeWeatherWidget] Widget chargé (barre horizontale, météo à droite)');
