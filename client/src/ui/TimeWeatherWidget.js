// TimeWeatherWidget.js - VERSION BARRE HORIZONTALE AVEC AM/PM

export class TimeWeatherWidget {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.hourMarkers = [];
    this.timeCursor = null;
    this.weatherIcon = null;
    this.weatherText = null;
    this.currentTime = { hour: 12, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Clear skies' };

    this.config = {
      y: 50,
      width: 400,
      height: 10,
      depth: 1000,
      padding: 10
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
    const { width, height, padding } = this.config;
    const screenWidth = this.scene.scale.width;

    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(this.config.depth);
    const startX = screenWidth / 2 - width / 2;
    this.container.setPosition(startX, this.config.y);

    const bar = this.scene.add.rectangle(0, 0, width, height, 0x2C3E50)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.container.add(bar);

    for (let h = 0; h < 24; h++) {
      const x = (h / 23) * width;
      const isMajor = h % 6 === 0;
      const color = isMajor ? 0xECF0F1 : 0x7F8C8D;
      const size = isMajor ? 8 : 4;

      const marker = this.scene.add.circle(x, 0, size / 2, color)
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.container.add(marker);
      this.hourMarkers.push(marker);

      if (isMajor) {
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const period = h < 12 ? 'AM' : 'PM';
        const label = this.scene.add.text(x, 14, `${displayHour}${period}`, {
          fontSize: '10px',
          color: '#ffffff',
          fontFamily: 'Arial'
        }).setOrigin(0.5, 0).setScrollFactor(0);
        this.container.add(label);
      }
    }

    this.timeCursor = this.scene.add.triangle(0, -10, 0, 0, 8, 10, -8, 10, 0xF39C12)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);
    this.container.add(this.timeCursor);

    this.weatherIcon = this.scene.add.text(width + padding, -10, '☀️', {
      fontSize: '20px'
    }).setOrigin(0, 0.5).setScrollFactor(0);
    this.weatherText = this.scene.add.text(width + padding + 28, -10, 'Clear skies', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.container.add(this.weatherIcon);
    this.container.add(this.weatherText);

    this.updateDisplay();
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
    this.updateCursor();
    this.updateWeatherDisplay();
  }

  updateCursor() {
    const x = (this.currentTime.hour / 23) * this.config.width;
    this.scene.tweens.add({
      targets: this.timeCursor,
      x: x,
      duration: 300,
      ease: 'Sine.easeInOut'
    });
  }

  updateWeatherDisplay() {
    const icon = this.weatherIcons[this.currentWeather.weather] || '☀️';
    this.weatherIcon.setText(icon);
    this.weatherText.setText(this.currentWeather.displayName);
  }

  setPosition(x, y) {
    if (this.container) this.container.setPosition(x, y);
  }

  setVisible(visible) {
    if (this.container) this.container.setVisible(visible);
  }

  setAlpha(alpha) {
    if (this.container) this.container.setAlpha(alpha);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.container);
    if (this.container) this.container.destroy();
    this.container = null;
  }
}
