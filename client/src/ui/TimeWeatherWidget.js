// TimeWeatherWidget.js - VERSION FONCTIONNELLE avec position fixée des Graphics
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
    this.currentWeather = { weather: 'clear', displayName: 'Ciel dégagé' };

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
    this.backgroundArc = this.scene.add.graphics().setScrollFactor(0).setPosition(0, 0).setDepth(-1);

this.backgroundArc.lineStyle(this.config.arcWidth, 0x2C3E50, 0.6);
this.backgroundArc.beginPath();
this.backgroundArc.arc(0, 0, this.config.radius, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false);
this.backgroundArc.strokePath();

this.backgroundArc.lineStyle(this.config.arcWidth - 2, 0x34495E, 0.3);
this.backgroundArc.beginPath();
this.backgroundArc.arc(0, 0, this.config.radius - 2, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false);
this.backgroundArc.strokePath();

    this.container.add(this.backgroundArc);
  }

  createHourMarkers() {
    this.hourMarkers = [];

    for (let hour = 0; hour < 24; hour++) {
      const angle = Phaser.Math.DegToRad(210 + (hour * 5));
      const x = Math.cos(angle) * this.config.radius;
      const y = Math.sin(angle) * this.config.radius;
      const isMainHour = hour % 6 === 0;
      const markerSize = isMainHour ? 3 : 1.5;
      const markerColor = this.getMarkerColor(hour);

      const marker = this.scene.add.circle(x, y, markerSize, markerColor, 0.8)
        .setDepth(1)
        .setScrollFactor(0);
      this.container.add(marker);
      this.hourMarkers.push(marker);

      if (isMainHour) {
        const labelX = Math.cos(angle) * (this.config.radius + 15);
        const labelY = Math.sin(angle) * (this.config.radius + 15);
        const label = this.scene.add.text(labelX, labelY, `${hour}h`, {
          fontSize: '12px',
          fill: '#ECF0F1',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2).setAlpha(0.7).setScrollFactor(0);
        this.container.add(label);
      }
    }
  }

  getMarkerColor(hour) {
    if (hour >= 6 && hour < 12) return 0xF39C12;
    if (hour >= 12 && hour < 18) return 0x3498DB;
    if (hour >= 18 && hour < 21) return 0xE74C3C;
    return 0x9B59B6;
  }

  createClockHand() {
    this.clockHand = this.scene.add.graphics().setScrollFactor(0).setPosition(0, 0).setDepth(3);

    this.clockHand.lineStyle(2, 0xECF0F1, 0.9);
    this.clockHand.beginPath();
    this.clockHand.moveTo(0, 0);
    this.clockHand.lineTo(0, -this.config.radius + 15);
    this.clockHand.strokePath();

    const center = this.scene.add.circle(0, 0, 4, 0xF39C12, 0.9)
      .setStrokeStyle(1, 0xECF0F1, 0.8)
      .setScrollFactor(0)
      .setDepth(4);

    this.container.add(this.clockHand);
    this.container.add(center);
  }

  createTimeText() {
    this.timeText = this.scene.add.text(0, 25, '12:00', {
      fontSize: '20px',
      fill: '#ECF0F1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#2C3E50',
      strokeThickness: 1
    }).setOrigin(0.5).setDepth(5).setScrollFactor(0);

    this.dayNightIndicator = this.scene.add.text(0, 42, '☀️ JOUR', {
      fontSize: '12px',
      fill: '#F39C12',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5).setScrollFactor(0);

    this.container.add(this.timeText);
    this.container.add(this.dayNightIndicator);
  }

  createWeatherDisplay() {
    this.weatherContainer = this.scene.add.container(0, -35).setScrollFactor(0).setDepth(5);

    this.weatherIcon = this.scene.add.text(0, 0, '☀️', {
      fontSize: '28px'
    }).setOrigin(0.5).setScrollFactor(0);

    this.weatherText = this.scene.add.text(0, 20, 'Ciel dégagé', {
      fontSize: '11px',
      fill: '#BDC3C7',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.weatherContainer.add(this.weatherIcon);
    this.weatherContainer.add(this.weatherText);
    this.container.add(this.weatherContainer);
  }

  createVisualEffects() {
    this.glowEffect = this.scene.add.graphics().setScrollFactor(0).setPosition(0, 0).setDepth(-2);

    this.glowEffect.lineStyle(10, 0x3498DB, 0.1);
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, this.config.radius + 8, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    this.glowEffect.strokePath();

    this.container.add(this.glowEffect);

    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.1, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  updateTime(hour, isDayTime) {
    this.currentTime = { hour, isDayTime };
    this.updateDisplay();
  }

  updateWeather(weather, displayName) {
    this.currentWeather = { weather, displayName };
    this.updateDisplay();
  }

  updateDisplay() {
    this.updateClockHand();
    this.updateTimeText();
    this.updateWeatherDisplay();
    this.updateColors();
  }

  updateClockHand() {
    const angle = this.getClockAngle(this.currentTime.hour);
    this.scene.tweens.add({
      targets: this.clockHand,
      rotation: angle,
      duration: this.config.animationSpeed,
      ease: 'Power2.easeInOut'
    });
  }

  getClockAngle(hour) {
    const startAngle = 210;
    const endAngle = 330;
    const totalAngle = endAngle - startAngle;
    const hourAngle = (hour / 24) * totalAngle;
    return Phaser.Math.DegToRad(startAngle + hourAngle);
  }

  updateTimeText() {
    const displayHour = this.currentTime.hour === 0 ? 12 :
      this.currentTime.hour > 12 ? this.currentTime.hour - 12 :
        this.currentTime.hour;
    const period = this.currentTime.hour < 12 ? 'AM' : 'PM';
    const timeString = `${displayHour}:00 ${period}`;

    this.timeText.setText(timeString);
    const dayNightText = this.currentTime.isDayTime ? '☀️ JOUR' : '🌙 NUIT';
    const dayNightColor = this.currentTime.isDayTime ? '#F39C12' : '#9B59B6';

    this.dayNightIndicator.setText(dayNightText);
    this.dayNightIndicator.setFill(dayNightColor);
  }

  updateWeatherDisplay() {
    const iconText = this.weatherIcons[this.currentWeather.weather] || '☀️';
    this.weatherIcon.setText(iconText);
    this.weatherText.setText(this.currentWeather.displayName);

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
    const period = this.getTimePeriod(this.currentTime.hour);
    const colors = this.timeColors[period];

    this.backgroundArc.clear();
    this.backgroundArc.lineStyle(this.config.arcWidth, colors.primary, 0.8);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    this.backgroundArc.strokePath();

    this.backgroundArc.lineStyle(this.config.arcWidth - 2, colors.secondary, 0.4);
    this.backgroundArc.beginPath();
    this.backgroundArc.arc(0, 0, this.config.radius - 2, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    this.backgroundArc.strokePath();

    this.glowEffect.clear();
    this.glowEffect.lineStyle(10, colors.glow, 0.2);
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, this.config.radius + 8, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    this.glowEffect.strokePath();
  }

  getTimePeriod(hour) {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
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
    if (this.container) {
      const centerX = this.scene.scale.width / 2;
      const centerY = this.scene.scale.height / 2;
      this.container.setPosition(centerX, centerY);
    }
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.glowEffect);
    this.scene.tweens.killTweensOf(this.clockHand);
    this.scene.tweens.killTweensOf(this.weatherIcon);
    this.scene.tweens.killTweensOf(this.container);

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.clockContainer = null;
    this.weatherContainer = null;
    this.timeText = null;
    this.weatherText = null;
    this.clockHand = null;
    this.hourMarkers = [];
    this.weatherIcon = null;
    this.backgroundArc = null;
    this.glowEffect = null;
  }
}
