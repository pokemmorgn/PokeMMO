// styles/PokemonWeatherStyles.js - Styles CSS pour Widget Pokémon

export const POKEMON_WEATHER_STYLES = `
  /* === 🎮 BASE WIDGET CONTAINER === */
  .pokemon-weather-widget.ui-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 340px !important;
    height: 140px !important;
    min-width: 340px !important;
    max-width: 340px !important;
    min-height: 140px !important;
    max-height: 140px !important;
    background: transparent;
    border: none;
    border-radius: 0;
    font-family: 'Segoe UI', 'Roboto', sans-serif;
    user-select: none;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    margin-top: 20px;
    margin-right: 220px;
    overflow: hidden;
  }
  
  /* === 🎮 POKÉBALL BACKGROUND === */
  .pokemon-weather-widget .pokeball-background {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    opacity: 0.1;
    z-index: 1;
    animation: pokeball-spin 20s linear infinite;
  }
  
  .pokemon-weather-widget .pokeball-top {
    width: 100%;
    height: 50%;
    background: linear-gradient(to bottom, #ff4444, #cc3333);
    border-radius: 40px 40px 0 0;
    position: relative;
  }
  
  .pokemon-weather-widget .pokeball-bottom {
    width: 100%;
    height: 50%;
    background: linear-gradient(to top, #ffffff, #f0f0f0);
    border-radius: 0 0 40px 40px;
  }
  
  .pokemon-weather-widget .pokeball-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    background: #333;
    border-radius: 50%;
    border: 3px solid #555;
  }
  
  .pokemon-weather-widget .pokeball-button {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
  }
  
  /* === ✨ WEATHER PARTICLES === */
  .pokemon-weather-widget .weather-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 2;
  }
  
  .pokemon-weather-widget .particle {
    position: absolute;
    font-size: 12px;
    opacity: 0.4;
    animation: particle-float 3s ease-in-out infinite;
  }
  
  .pokemon-weather-widget .particle-1 {
    top: 20%;
    left: 15%;
    animation-delay: 0s;
  }
  
  .pokemon-weather-widget .particle-2 {
    top: 60%;
    right: 20%;
    animation-delay: 1s;
  }
  
  .pokemon-weather-widget .particle-3 {
    bottom: 30%;
    left: 70%;
    animation-delay: 2s;
  }
  
  /* === 🌟 GLASSMORPHISM CONTAINER === */
  .pokemon-weather-widget .widget-glass-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #ff9a56 0%, #ffcc33 100%);
    backdrop-filter: blur(15px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    z-index: 3;
    transition: all 0.5s ease;
  }
  
  .pokemon-weather-widget .widget-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 16px;
    gap: 12px;
    z-index: 4;
  }
  
  /* === 📍 HEADER SECTION === */
  .pokemon-weather-widget .header-section {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
  }
  
  .pokemon-weather-widget .zone-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    padding: 4px 12px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .pokemon-weather-widget .zone-icon {
    font-size: 12px;
  }
  
  .pokemon-weather-widget .zone-text {
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  /* === ⏰ MAIN SECTION === */
  .pokemon-weather-widget .main-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
  }
  
  .pokemon-weather-widget .time-section {
    flex: 1;
  }
  
  .pokemon-weather-widget .weather-section {
    flex: 1;
  }
  
  .pokemon-weather-widget .time-display,
  .pokemon-weather-widget .weather-display {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .pokemon-weather-widget .weather-display {
    justify-content: flex-end;
  }
  
  .pokemon-weather-widget .time-icon,
  .pokemon-weather-widget .weather-icon {
    font-size: 28px;
    transition: transform 0.3s ease;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
  }
  
  .pokemon-weather-widget .weather-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pokemon-weather-widget .pokemon-type-icon {
    position: absolute;
    bottom: -5px;
    right: -5px;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    padding: 2px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    animation: pokemon-bounce 2s ease-in-out infinite;
  }
  
  .pokemon-weather-widget .time-text,
  .pokemon-weather-widget .weather-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .pokemon-weather-widget .time-main,
  .pokemon-weather-widget .weather-main {
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  
  .pokemon-weather-widget .time-period,
  .pokemon-weather-widget .weather-temp {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    letter-spacing: 0.25px;
    white-space: nowrap;
  }
  
  /* === 📊 INTENSITY SECTION === */
  .pokemon-weather-widget .intensity-section {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    padding: 6px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .pokemon-weather-widget .intensity-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    min-width: 45px;
  }
  
  .pokemon-weather-widget .intensity-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .pokemon-weather-widget .intensity-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #10b981aa);
    border-radius: 3px;
    transition: all 0.5s ease;
    animation: intensity-pulse 2s ease-in-out infinite;
  }
  
  .pokemon-weather-widget .intensity-value {
    font-size: 10px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    min-width: 25px;
    text-align: right;
  }
  
  /* === 🎮 BONUS SECTION === */
  .pokemon-weather-widget .bonus-section {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    padding: 6px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: bonus-glow 3s ease-in-out infinite;
  }
  
  .pokemon-weather-widget .bonus-icon {
    font-size: 14px;
    animation: bonus-spin 4s linear infinite;
  }
  
  .pokemon-weather-widget .bonus-text {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .pokemon-weather-widget .bonus-type-icon {
    font-size: 14px;
    animation: type-pulse 2s ease-in-out infinite;
  }
  
  /* === 🌟 GLOW EFFECTS === */
  .pokemon-weather-widget .widget-glow {
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    background: radial-gradient(circle at 50% 50%, rgba(255, 154, 86, 0.3) 0%, transparent 70%);
    border-radius: 25px;
    z-index: -1;
    opacity: 0.8;
    transition: all 0.5s ease;
  }
  
  /* === 🌙 THEMES JOUR/NUIT === */
  .pokemon-weather-widget.day-theme .widget-glass-container {
    border: 1px solid rgba(255, 215, 0, 0.4);
    box-shadow: 
      0 8px 32px rgba(255, 215, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }
  
  .pokemon-weather-widget.night-theme .widget-glass-container {
    border: 1px solid rgba(139, 92, 246, 0.4);
    box-shadow: 
      0 8px 32px rgba(139, 92, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  }
  
  .pokemon-weather-widget.day-theme .zone-badge,
  .pokemon-weather-widget.day-theme .intensity-section,
  .pokemon-weather-widget.day-theme .bonus-section {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 215, 0, 0.3);
  }
  
  .pokemon-weather-widget.night-theme .zone-badge,
  .pokemon-weather-widget.night-theme .intensity-section,
  .pokemon-weather-widget.night-theme .bonus-section {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(139, 92, 246, 0.3);
  }
  
  /* === 🌈 GRADIENTS MÉTÉO DYNAMIQUES === */
  .pokemon-weather-widget.weather-clear .widget-glass-container {
    background: linear-gradient(135deg, #ff9a56 0%, #ffcc33 100%) !important;
  }
  
  .pokemon-weather-widget.weather-rain .widget-glass-container {
    background: linear-gradient(135deg, #3b82f6 0%, #64748b 100%) !important;
  }
  
  .pokemon-weather-widget.weather-storm .widget-glass-container {
    background: linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%) !important;
  }
  
  .pokemon-weather-widget.weather-snow .widget-glass-container {
    background: linear-gradient(135deg, #60a5fa 0%, #f8fafc 100%) !important;
  }
  
  .pokemon-weather-widget.weather-fog .widget-glass-container {
    background: linear-gradient(135deg, #9ca3af 0%, #f3f4f6 100%) !important;
  }
  
  .pokemon-weather-widget.weather-cloudy .widget-glass-container {
    background: linear-gradient(135deg, #6b7280 0%, #d1d5db 100%) !important;
  }
  
  /* === 🎭 ÉTATS UI === */
  .pokemon-weather-widget.ui-disabled {
    opacity: 0.4;
    filter: grayscale(80%);
    pointer-events: none;
  }
  
  .pokemon-weather-widget.ui-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-20px) scale(0.9);
  }
  
  .pokemon-weather-widget.ui-fade-in {
    animation: pokemon-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .pokemon-weather-widget.ui-fade-out {
    animation: pokemon-fade-out 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* === ✨ ANIMATIONS POKÉMON === */
  @keyframes pokeball-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes particle-float {
    0%, 100% {
      transform: translateY(0px);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-10px);
      opacity: 0.6;
    }
  }
  
  @keyframes pokemon-bounce {
    0%, 100% {
      transform: scale(1) translateY(0px);
    }
    50% {
      transform: scale(1.1) translateY(-2px);
    }
  }
  
  @keyframes intensity-pulse {
    0%, 100% {
      box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.2);
    }
    50% {
      box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.4);
    }
  }
  
  @keyframes bonus-glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
    }
    50% {
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
    }
  }
  
  @keyframes bonus-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes type-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
  
  @keyframes pokemon-fade-in {
    0% {
      opacity: 0;
      transform: translateY(-30px) scale(0.8) rotateX(20deg);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1) rotateX(0deg);
    }
  }
  
  @keyframes pokemon-fade-out {
    0% {
      opacity: 1;
      transform: translateY(0px) scale(1) rotateX(0deg);
    }
    100% {
      opacity: 0;
      transform: translateY(-20px) scale(0.9) rotateX(-10deg);
    }
  }
  
  /* === 🎮 HOVER EFFECTS === */
  .pokemon-weather-widget:hover {
    transform: translateY(-3px);
  }
  
  .pokemon-weather-widget:hover .widget-glow {
    opacity: 1;
    transform: scale(1.05);
  }
  
  .pokemon-weather-widget:hover .time-icon,
  .pokemon-weather-widget:hover .weather-icon {
    transform: scale(1.1) rotate(5deg);
  }
  
  .pokemon-weather-widget:hover .pokemon-type-icon {
    animation: pokemon-bounce 0.6s ease-in-out infinite;
  }
  
  .pokemon-weather-widget:hover .pokeball-background {
    opacity: 0.2;
    animation-duration: 10s;
  }
  
  .pokemon-weather-widget:hover .particle {
    opacity: 0.7;
    animation-duration: 2s;
  }
  
  .pokemon-weather-widget:hover .bonus-section {
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }
  
  .pokemon-weather-widget:hover .intensity-fill {
    animation-duration: 1s;
  }
  
  /* === 📱 RESPONSIVE === */
  @media (max-width: 800px) {
    .pokemon-weather-widget.ui-icon {
      width: 280px !important;
      height: 120px !important;
      min-width: 280px !important;
      max-width: 280px !important;
      min-height: 120px !important;
      max-height: 120px !important;
    }
    
    .pokemon-weather-widget .widget-content {
      padding: 12px;
      gap: 8px;
    }
    
    .pokemon-weather-widget .time-icon,
    .pokemon-weather-widget .weather-icon {
      font-size: 24px;
    }
    
    .pokemon-weather-widget .pokemon-type-icon {
      font-size: 14px;
    }
    
    .pokemon-weather-widget .time-main,
    .pokemon-weather-widget .weather-main {
      font-size: 14px;
    }
    
    .pokemon-weather-widget .time-period,
    .pokemon-weather-widget .weather-temp {
      font-size: 10px;
    }
    
    .pokemon-weather-widget .zone-text {
      font-size: 11px;
    }
    
    .pokemon-weather-widget .bonus-text {
      font-size: 10px;
    }
    
    .pokemon-weather-widget .intensity-label,
    .pokemon-weather-widget .intensity-value {
      font-size: 9px;
    }
    
    .pokemon-weather-widget .pokeball-background {
      width: 60px;
      height: 60px;
      top: -15px;
      right: -15px;
    }
  }
  
  @media (max-width: 480px) {
    .pokemon-weather-widget.ui-icon {
      width: 240px !important;
      height: 100px !important;
      min-width: 240px !important;
      max-width: 240px !important;
      min-height: 100px !important;
      max-height: 100px !important;
    }
    
    .pokemon-weather-widget .widget-content {
      padding: 10px;
      gap: 6px;
    }
    
    .pokemon-weather-widget .time-icon,
    .pokemon-weather-widget .weather-icon {
      font-size: 20px;
    }
    
    .pokemon-weather-widget .time-main,
    .pokemon-weather-widget .weather-main {
      font-size: 12px;
    }
    
    .pokemon-weather-widget .intensity-section,
    .pokemon-weather-widget .bonus-section {
      padding: 4px 8px;
    }
  }
  
  /* === ⚡ INDICATEUR UIMANAGER === */
  .pokemon-weather-widget[data-positioned-by="uimanager"]::before {
    content: "⚡";
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 14px;
    opacity: 0.8;
    pointer-events: none;
    animation: sparkle 2s ease-in-out infinite;
    z-index: 10;
    background: rgba(255, 215, 0, 0.2);
    border-radius: 50%;
    padding: 2px;
  }
  
  @keyframes sparkle {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.3);
    }
  }
  
  /* === 🌟 EFFETS SPÉCIAUX MÉTÉO === */
  .pokemon-weather-widget.weather-rain .particle {
    color: #3b82f6;
    animation: rain-drop 2s linear infinite;
  }
  
  .pokemon-weather-widget.weather-storm .particle {
    color: #6366f1;
    animation: lightning-flash 1s ease-in-out infinite;
  }
  
  .pokemon-weather-widget.weather-snow .particle {
    color: #60a5fa;
    animation: snow-fall 4s linear infinite;
  }
  
  @keyframes rain-drop {
    0% {
      transform: translateY(-20px);
      opacity: 0;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(20px);
      opacity: 0;
    }
  }
  
  @keyframes lightning-flash {
    0%, 90%, 100% {
      opacity: 0.3;
    }
    5%, 85% {
      opacity: 1;
      text-shadow: 0 0 10px #6366f1;
    }
  }
  
  @keyframes snow-fall {
    0% {
      transform: translateY(-20px) rotate(0deg);
      opacity: 0;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(20px) rotate(360deg);
      opacity: 0;
    }
  }
  
  /* === 🎯 FOCUS & ACCESSIBILITY === */
  .pokemon-weather-widget:focus-within {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
  }
  
  .pokemon-weather-widget button:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
  
  /* === 🌈 COULEURS TYPES POKÉMON === */
  .pokemon-weather-widget .bonus-type-icon.type-fire {
    color: #ff6666;
    text-shadow: 0 0 8px #ff6666;
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-water {
    color: #6666ff;
    text-shadow: 0 0 8px #6666ff;
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-electric {
    color: #ffff66;
    text-shadow: 0 0 8px #ffff66;
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-ice {
    color: #66ffff;
    text-shadow: 0 0 8px #66ffff;
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-ghost {
    color: #9966ff;
    text-shadow: 0 0 8px #9966ff;
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-flying {
    color: #cccccc;
    text-shadow: 0 0 8px #cccccc;
  }
  
  /* === 🎮 GAMING PERFORMANCE OPTIMIZATIONS === */
  .pokemon-weather-widget {
    will-change: transform, opacity;
    backface-visibility: hidden;
    perspective: 1000px;
  }
  
  .pokemon-weather-widget .pokeball-background,
  .pokemon-weather-widget .particle,
  .pokemon-weather-widget .time-icon,
  .pokemon-weather-widget .weather-icon,
  .pokemon-weather-widget .pokemon-type-icon {
    will-change: transform;
    backface-visibility: hidden;
  }
  
  /* === 🌙 DARK MODE OVERRIDES === */
  @media (prefers-color-scheme: dark) {
    .pokemon-weather-widget .widget-glass-container {
      backdrop-filter: blur(20px);
    }
    
    .pokemon-weather-widget .zone-badge,
    .pokemon-weather-widget .intensity-section,
    .pokemon-weather-widget .bonus-section {
      background: rgba(0, 0, 0, 0.5);
    }
  }
  
  /* === 🎊 EASTER EGGS === */
  .pokemon-weather-widget.shiny {
    animation: shiny-sparkle 3s ease-in-out infinite;
  }
  
  @keyframes shiny-sparkle {
    0%, 100% {
      filter: hue-rotate(0deg) brightness(1);
    }
    25% {
      filter: hue-rotate(90deg) brightness(1.2);
    }
    50% {
      filter: hue-rotate(180deg) brightness(1.4);
    }
    75% {
      filter: hue-rotate(270deg) brightness(1.2);
    }
  }
`;

export default POKEMON_WEATHER_STYLES;
