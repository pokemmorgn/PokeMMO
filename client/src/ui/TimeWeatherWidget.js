// TimeWeatherWidget.js - Widget compact heure/météo pour HUD (coin écran)

export class TimeWeatherWidget {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.timeText = null;
    this.weatherIcon = null;
    this.weatherText = null;

    this.currentTime = { hour: 12, minute: 0, isDayTime: true };
    this.currentWeather = { weather: 'clear', displayName: 'Clear' };

    this.config = {
      x: scene.scale.width - 168, // Coin supérieur droit (modifiable)
      y: 20,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontColor: '#ECF0F1',
      fontStroke: '#222',
      fontStrokeThickness: 2,
      weatherFontSize: 22,
      weatherIconGap: 12,
      containerPadding: 10,
      depth: 2000
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
    // Container principal
    this.container = this.scene.add.container(this.config.x, this.config.y);
    this.container.setDepth(this.config.depth);
    this.container.setScrollFactor(0);

    // Rectangle de fond léger pour la lisibilité (optionnel, désactive en mettant alpha à 0)
    const bg = this.scene.add.rectangle(0, 0, 155, 38, 0x21292b, 0.68)
      .setOrigin(0)
      .setStrokeStyle(1, 0x444a52, 0.6)
      .setScrollFactor(0)
      .setDepth(-1);
    this.container.add(bg);

    // Heure numérique
    this.timeText = this.scene.add.text(
      this.config.containerPadding,
      this.config.containerPadding,
      this.formatTime(this.currentTime.hour, this.currentTime.minute),
      {
        fontSize: `${this.config.fontSize}px`,
        fill: this.config.fontColor,
        fontFamily: this.config.fontFamily,
        stroke: this.config.fontStroke,
        strokeThickness: this.config.fontStrokeThickness
      }
    ).setOrigin(0, 0).setScrollFactor(0);

    // Icône météo
    this.weatherIcon = this.scene.add.text(
      this.config.containerPadding + 62, // position à droite de l'heure
      this.config.containerPadding - 2,
      this.weatherIcons[this.currentWeather.weather] || '☀️',
      {
        fontSize: `${this.config.weatherFontSize}px`
      }
    ).setOrigin(0, 0).setScrollFactor(0);

    // Texte météo
    this.weatherText = this.scene.add.text(
      this.config.containerPadding + 92,
      this.config.containerPadding + 1,
      this.currentWeather.displayName,
      {
        fontSize: '13px',
        fill: '#b8d8f7',
        fontFamily: this.config.fontFamily
      }
    ).setOrigin(0, 0).setScrollFactor(0);

    this.container.add([this.timeText, this.weatherIcon, this.weatherText]);
  }

  // Heure au format anglais (ex: 3:00 PM)
  formatTime(hour, minute = 0) {
    const isAM = hour < 12;
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const period = isAM ? 'AM' : 'PM';
    const min = minute.toString().padStart(2, '0');
    return `${displayHour}:${min} ${period}`;
  }

  // Mise à jour de l'heure (hour: int [0-23], minute: int [0-59])
  updateTime(hour, minute = 0) {
    this.currentTime.hour = hour;
    this.currentTime.minute = minute;
    if (this.timeText) {
      this.timeText.setText(this.formatTime(hour, minute));
    }
  }

  // Mise à jour de la météo (weather: 'clear', 'rain', ... ; displayName: string anglais)
  updateWeather(weather, displayName) {
    this.currentWeather.weather = weather;
    this.currentWeather.displayName = displayName;
    if (this.weatherIcon) {
      this.weatherIcon.setText(this.weatherIcons[weather] || '☀️');
    }
    if (this.weatherText) {
      this.weatherText.setText(displayName);
    }
  }

  // Pour déplacer le widget si tu veux un autre coin de l'écran
  setPosition(x, y) {
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  // Redimensionne et replace si l'écran change de taille
  onResize() {
    this.setPosition(this.scene.scale.width - 168, 20);
  }

  setVisible(visible) {
    if (this.container) this.container.setVisible(visible);
  }

  destroy() {
    if (this.container) this.container.destroy();
    this.container = null;
    this.timeText = null;
    this.weatherIcon = null;
    this.weatherText = null;
  }
}
