// TimeWeatherWidget.js - VERSION AVEC BARRE HORIZONTALE À LA PLACE DE L'ARC
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

    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Clear skies' };

    this.config = {
      x: 0,
      y: 80,
      radius: 100,
      arcWidth: 6,
      depth: 1000,
      animationSpeed: 2000,
      glowIntensity: 0.3,
      fadeDistance: 200
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
  }

  create() {
    this.container = this.scene.add.container(0, 0).setDepth(this.config.depth).setScrollFactor(0);
    const centerX = this.scene.scale.width / 2;
    this.container.setPosition(centerX, this.config.y);

    this.createBackgroundArc();
    this.createHourMarkers();
    this.createClockHand();
    this.createTimeText();
    this.createWeatherDisplay();
    this.createVisualEffects();
    this.updateDisplay();
  }

  createBackgroundArc() {
    const barWidth = this.config.radius * 2;
    const barHeight = this.config.arcWidth;

    this.backgroundArc = this.scene.add.graphics().setScrollFactor(0).setPosition(-this.config.radius, 0).setDepth(-1);

    // Couche principale
    this.backgroundArc.fillStyle(0x2C3E50, 0.6);
    this.backgroundArc.fillRect(0, -barHeight / 2, barWidth, barHeight);

    // Couche secondaire
    this.backgroundArc.fillStyle(0x34495E, 0.3);
    this.backgroundArc.fillRect(2, -barHeight / 4, barWidth - 4, barHeight / 2);

    this.container.add(this.backgroundArc);
  }

  updateColors() {
    const period = this.getTimePeriod(this.currentTime.hour);
    const colors = this.timeColors[period];

    const barWidth = this.config.radius * 2;
    const barHeight = this.config.arcWidth;

    this.backgroundArc.clear();
    this.backgroundArc.fillStyle(colors.primary, 0.8);
    this.backgroundArc.fillRect(0, -barHeight / 2, barWidth, barHeight);

    this.backgroundArc.fillStyle(colors.secondary, 0.4);
    this.backgroundArc.fillRect(2, -barHeight / 4, barWidth - 4, barHeight / 2);

    this.glowEffect.clear();
    this.glowEffect.fillStyle(colors.glow, 0.1);
    this.glowEffect.fillCircle(0, 0, this.config.radius + 8);
  }

  // Les autres méthodes de ta classe restent inchangées
  // ...
}
