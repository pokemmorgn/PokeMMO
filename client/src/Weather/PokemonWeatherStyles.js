// styles/PokemonWeatherStyles.js - Style UNIFIÉ avec dimensions correctes
// 🎯 Palette cohérente avec Pokedex/Quest/Team + effets météo subtils + STANDALONE WIDGET

export const POKEMON_WEATHER_STYLES = `
  /* === 🛡️ PROTECTION CONTRE UIMANAGER === */
  .ui-standalone-widget {
    /* FORCER nos dimensions contre UIManager - AUGMENTÉES */
    width: 340px !important;
    height: 140px !important;
    min-width: 340px !important;
    max-width: 340px !important;
    min-height: 140px !important;
    max-height: 140px !important;
  }
  
  /* === 🎮 BASE WIDGET CONTAINER - DIMENSIONS CORRIGÉES === */
  .pokemon-weather-widget.ui-standalone-widget {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 340px !important;         /* Augmenté de 300px à 340px */
    height: 140px !important;        /* Augmenté de 100px à 140px */
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
    overflow: visible !important;    /* CRUCIAL: Pas de troncature */
  }
  
  /* === 🌟 GLASSMORPHISM UNIFIÉ - BASE BLEU COMME LES AUTRES INTERFACES === */
  .pokemon-weather-widget .widget-glass-container {
    position: relative;
    width: 100%;
    height: 100%;
    /* BASE UNIFORME - même gradient que Pokedex/Quest/Team */
    background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
    backdrop-filter: blur(15px);
    border-radius: 20px;
    border: 2px solid #4a90e2; /* Même bleu que les autres interfaces */
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 20px rgba(74, 144, 226, 0.3); /* Glow bleu unifié */
    z-index: 3;
    transition: all 0.5s ease;
  }
  
  /* === ⚡ EFFETS MÉTÉO SUBTILS - ACCENTS SUR LA BASE UNIFORME === */
  
  /* Soleil - Accent doré subtil */
  .pokemon-weather-widget.weather-clear .widget-glass-container {
    border-color: #4a90e2; /* Base bleu conservée */
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 25px rgba(255, 215, 0, 0.4), /* Glow doré subtil */
      inset 0 0 30px rgba(255, 215, 0, 0.1); /* Lueur interne dorée légère */
  }
  
  /* Pluie - Accent bleu plus intense */
  .pokemon-weather-widget.weather-rain .widget-glass-container {
    border-color: #4a90e2;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 25px rgba(59, 130, 246, 0.5), /* Glow bleu plus intense */
      inset 0 0 30px rgba(59, 130, 246, 0.15);
  }
  
  /* Orage - Accent violet électrique */
  .pokemon-weather-widget.weather-storm .widget-glass-container {
    border-color: #4a90e2;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 25px rgba(139, 92, 246, 0.4), /* Glow violet */
      inset 0 0 30px rgba(139, 92, 246, 0.1);
    animation: lightning-glow 2s ease-in-out infinite;
  }
  
  /* Neige - Accent cyan glacé */
  .pokemon-weather-widget.weather-snow .widget-glass-container {
    border-color: #4a90e2;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.3), /* Plus de blanc pour l'effet neige */
      0 0 25px rgba(96, 165, 250, 0.4), /* Glow cyan */
      inset 0 0 30px rgba(96, 165, 250, 0.1);
  }
  
  /* Brouillard - Accent gris subtil */
  .pokemon-weather-widget.weather-fog .widget-glass-container {
    border-color: #4a90e2;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 25px rgba(156, 163, 175, 0.3), /* Glow gris */
      inset 0 0 30px rgba(156, 163, 175, 0.05);
  }
  
  /* Nuageux - Accent gris-bleu */
  .pokemon-weather-widget.weather-cloudy .widget-glass-container {
    border-color: #4a90e2;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 25px rgba(107, 114, 128, 0.3), /* Glow gris-bleu */
      inset 0 0 30px rgba(107, 114, 128, 0.08);
  }
  
  @keyframes lightning-glow {
    0%, 90%, 100% { 
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 0 25px rgba(139, 92, 246, 0.4),
        inset 0 0 30px rgba(139, 92, 246, 0.1);
    }
    5%, 85% { 
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 0 40px rgba(139, 92, 246, 0.8), /* Flash plus intense */
        inset 0 0 50px rgba(139, 92, 246, 0.2);
    }
  }
  
  /* === 📍 COMPOSANTS UNIFIÉS - ESPACEMENT NORMAL === */
  .pokemon-weather-widget .widget-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 16px;                    /* Restauré à 16px pour plus d'espace */
    gap: 12px;                        /* Restauré à 12px pour plus d'espace */
    z-index: 4;
    color: #ffffff; /* Blanc unifié */
  }
  
  .pokemon-weather-widget .zone-badge,
  .pokemon-weather-widget .intensity-section,
  .pokemon-weather-widget .bonus-section {
    background: rgba(255, 255, 255, 0.05) !important; /* Même transparence que Pokedex */
    backdrop-filter: blur(10px);
    border: 1px solid rgba(74, 144, 226, 0.3) !important; /* Bordures bleu unifiées */
    border-radius: 12px;              /* Restauré à 12px */
    padding: 6px 12px;               /* Restauré à padding normal */
    transition: all 0.3s ease;
  }
  
  .pokemon-weather-widget .zone-badge:hover,
  .pokemon-weather-widget .intensity-section:hover,
  .pokemon-weather-widget .bonus-section:hover {
    background: rgba(74, 144, 226, 0.15) !important; /* Hover unifié */
    border-color: rgba(74, 144, 226, 0.5) !important;
    transform: translateY(-1px);
  }
  
  /* === ⏰ SECTIONS PRINCIPALES - ESPACEMENT NORMAL === */
  .pokemon-weather-widget .header-section {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;              /* Restauré à 4px */
  }
  
  .pokemon-weather-widget .zone-icon {
    font-size: 12px;                 /* Restauré à 12px */
    color: #87ceeb; /* Même cyan que les titres des autres interfaces */
  }
  
  .pokemon-weather-widget .zone-text {
    font-size: 12px;                 /* Restauré à 12px */
    font-weight: 600;
    color: #87ceeb; /* Cyan unifié */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .pokemon-weather-widget .main-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    gap: 12px;                        /* Restauré à 12px */
  }
  
  .pokemon-weather-widget .time-section,
  .pokemon-weather-widget .weather-section {
    flex: 1;
    min-width: 0;                    /* Permet la compression du contenu */
  }
  
  .pokemon-weather-widget .time-display,
  .pokemon-weather-widget .weather-display {
    display: flex;
    align-items: center;
    gap: 12px;                        /* Restauré à 12px */
  }
  
  .pokemon-weather-widget .weather-display {
    justify-content: flex-end;
  }
  
  /* === 🌟 ICÔNES MÉTÉO AVEC ACCENTS SUBTILS - TAILLE NORMALE === */
  .pokemon-weather-widget .time-icon,
  .pokemon-weather-widget .weather-icon {
    font-size: 28px;                 /* Restauré à 28px */
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 8px rgba(135, 206, 235, 0.4)); /* Glow cyan subtil */
  }
  
  /* Accents météo sur les icônes */
  .pokemon-weather-widget.weather-clear .weather-icon {
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
  }
  
  .pokemon-weather-widget.weather-rain .weather-icon {
    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.6));
  }
  
  .pokemon-weather-widget.weather-storm .weather-icon {
    filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
    animation: lightning-icon-flash 2s ease-in-out infinite;
  }
  
  .pokemon-weather-widget.weather-snow .weather-icon {
    filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.6));
  }
  
  @keyframes lightning-icon-flash {
    0%, 90%, 100% { 
      filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
    }
    5%, 85% { 
      filter: drop-shadow(0 0 20px rgba(139, 92, 246, 1));
    }
  }
  
  .pokemon-weather-widget .weather-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pokemon-weather-widget .pokemon-type-icon {
    position: absolute;
    bottom: -5px;                    /* Restauré à -5px */
    right: -5px;                     /* Restauré à -5px */
    font-size: 16px;                 /* Restauré à 16px */
    background: rgba(42, 63, 95, 0.9); /* Background unifié */
    border-radius: 50%;
    padding: 2px;                    /* Restauré à 2px */
    border: 1px solid rgba(74, 144, 226, 0.5); /* Bordure bleu */
    animation: pokemon-bounce 2s ease-in-out infinite;
  }
  
  /* === 💬 TEXTES UNIFIÉS - TAILLE NORMALE === */
  .pokemon-weather-widget .time-text,
  .pokemon-weather-widget .weather-text {
    display: flex;
    flex-direction: column;
    gap: 2px;                        /* Restauré à 2px */
    min-width: 0;                    /* Permet la compression */
  }
  
  .pokemon-weather-widget .time-main,
  .pokemon-weather-widget .weather-main {
    font-size: 16px;                 /* Restauré à 16px */
    font-weight: 700;
    color: #ffffff; /* Blanc unifié */
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;                /* Ajout pour éviter débordement */
    text-overflow: ellipsis;         /* Ajout pour tronquer proprement */
  }
  
  .pokemon-weather-widget .time-period,
  .pokemon-weather-widget .weather-temp {
    font-size: 11px;                 /* Restauré à 11px */
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    letter-spacing: 0.25px;
    white-space: nowrap;
  }
  
  /* === 📊 BARRE D'INTENSITÉ UNIFIÉE === */
  .pokemon-weather-widget .intensity-label {
    font-size: 9px;                  /* Réduit de 10px à 9px */
    font-weight: 600;
    color: #87ceeb; /* Cyan unifié */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    min-width: 40px;                 /* Réduit de 45px à 40px */
  }
  
  .pokemon-weather-widget .intensity-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid rgba(74, 144, 226, 0.3); /* Bordure bleu */
  }
  
  .pokemon-weather-widget .intensity-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90e2, #87ceeb); /* Gradient bleu unifié */
    border-radius: 3px;
    transition: all 0.5s ease;
    animation: intensity-pulse 2s ease-in-out infinite;
  }
  
  .pokemon-weather-widget .intensity-value {
    font-size: 9px;                  /* Réduit de 10px à 9px */
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    min-width: 20px;                 /* Réduit de 25px à 20px */
    text-align: right;
  }
  
  /* === 🎮 BONUS SECTION UNIFIÉE - TAILLE NORMALE === */
  .pokemon-weather-widget .bonus-icon {
    font-size: 14px;                 /* Restauré à 14px */
    color: #87ceeb; /* Cyan unifié */
    animation: bonus-spin 4s linear infinite;
  }
  
  .pokemon-weather-widget .bonus-text {
    flex: 1;
    font-size: 11px;                 /* Restauré à 11px */
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;             /* Empêche le retour à la ligne */
    overflow: hidden;                /* Cache le débordement */
    text-overflow: ellipsis;         /* Ajoute "..." si trop long */
  }
  
  .pokemon-weather-widget .bonus-type-icon {
    font-size: 14px;                 /* Restauré à 14px */
    animation: type-pulse 2s ease-in-out infinite;
  }
  
  /* Couleurs type Pokémon adaptées à la palette uniforme */
  .pokemon-weather-widget .bonus-type-icon.type-fire {
    color: #ffb347; /* Doré adouci */
    text-shadow: 0 0 8px rgba(255, 179, 71, 0.6);
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-water {
    color: #87ceeb; /* Cyan unifié */
    text-shadow: 0 0 8px rgba(135, 206, 235, 0.6);
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-electric {
    color: #ddd700; /* Jaune adouci */
    text-shadow: 0 0 8px rgba(221, 215, 0, 0.6);
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-ice {
    color: #b3e5fc; /* Bleu glacé adouci */
    text-shadow: 0 0 8px rgba(179, 229, 252, 0.6);
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-ghost {
    color: #b39ddb; /* Violet adouci */
    text-shadow: 0 0 8px rgba(179, 157, 219, 0.6);
  }
  
  .pokemon-weather-widget .bonus-type-icon.type-flying {
    color: #e0e0e0; /* Gris adouci */
    text-shadow: 0 0 8px rgba(224, 224, 224, 0.6);
  }
  
  /* === ✨ PARTICULES MÉTÉO SUBTILES === */
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
    font-size: 12px;                 /* Restauré à 12px */
    opacity: 0.3; /* Plus subtiles */
    animation: particle-float 3s ease-in-out infinite;
  }
  
  /* Particules avec couleurs adaptées */
  .pokemon-weather-widget.weather-clear .particle {
    color: #ffb347; /* Doré adouci */
    animation: sparkle-float 2s ease-in-out infinite;
  }
  
  .pokemon-weather-widget.weather-rain .particle {
    color: #87ceeb; /* Cyan unifié */
    animation: rain-drop 2s linear infinite;
  }
  
  .pokemon-weather-widget.weather-storm .particle {
    color: #b39ddb; /* Violet adouci */
    animation: lightning-flash 1s ease-in-out infinite;
  }
  
  .pokemon-weather-widget.weather-snow .particle {
    color: #b3e5fc; /* Bleu glacé */
    animation: snow-fall 4s linear infinite;
  }
  
  .pokemon-weather-widget.weather-fog .particle {
    color: #e0e0e0; /* Gris adouci */
    animation: fog-drift 6s ease-in-out infinite;
    opacity: 0.2; /* Plus subtil pour le brouillard */
  }
  
  .pokemon-weather-widget.weather-cloudy .particle {
    color: #cfd8dc; /* Gris-bleu adouci */
    animation: cloud-drift 4s ease-in-out infinite;
  }
  
  /* === 🌙 THÈMES JOUR/NUIT ADAPTÉS === */
  .pokemon-weather-widget.day-theme .zone-badge,
  .pokemon-weather-widget.day-theme .intensity-section,
  .pokemon-weather-widget.day-theme .bonus-section {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(74, 144, 226, 0.4) !important;
  }
  
  .pokemon-weather-widget.night-theme .zone-badge,
  .pokemon-weather-widget.night-theme .intensity-section,
  .pokemon-weather-widget.night-theme .bonus-section {
    background: rgba(0, 0, 0, 0.3) !important;
    border-color: rgba(74, 144, 226, 0.5) !important;
  }
  
  /* === 🎭 ÉTATS UI UNIFIÉS === */
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
  
  /* === ✨ ANIMATIONS CONSERVÉES === */
  @keyframes particle-float {
    0%, 100% { transform: translateY(0px); opacity: 0.2; }
    50% { transform: translateY(-10px); opacity: 0.4; }
  }
  
  @keyframes sparkle-float {
    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
    50% { transform: translateY(-15px) scale(1.2); opacity: 0.6; }
  }
  
  @keyframes rain-drop {
    0% { transform: translateY(-20px); opacity: 0; }
    50% { opacity: 0.4; }
    100% { transform: translateY(20px); opacity: 0; }
  }
  
  @keyframes lightning-flash {
    0%, 90%, 100% { opacity: 0.2; }
    5%, 85% { opacity: 0.8; text-shadow: 0 0 10px #b39ddb; }
  }
  
  @keyframes snow-fall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
    50% { opacity: 0.4; }
    100% { transform: translateY(20px) rotate(360deg); opacity: 0; }
  }
  
  @keyframes fog-drift {
    0%, 100% { transform: translateX(0px); opacity: 0.1; }
    50% { transform: translateX(30px); opacity: 0.3; }
  }
  
  @keyframes cloud-drift {
    0%, 100% { transform: translateX(0px) translateY(0px); opacity: 0.2; }
    50% { transform: translateX(20px) translateY(-5px); opacity: 0.4; }
  }
  
  @keyframes pokemon-bounce {
    0%, 100% { transform: scale(1) translateY(0px); }
    50% { transform: scale(1.1) translateY(-2px); }
  }
  
  @keyframes intensity-pulse {
    0%, 100% { box-shadow: inset 0 0 5px rgba(74, 144, 226, 0.2); }
    50% { box-shadow: inset 0 0 10px rgba(74, 144, 226, 0.4); }
  }
  
  @keyframes bonus-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes type-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
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
  
  /* === 🎮 HOVER EFFECTS SUBTILS === */
  .pokemon-weather-widget:hover {
    transform: translateY(-2px); /* Plus subtil */
  }
  
  .pokemon-weather-widget:hover .widget-glass-container {
    border-color: #87ceeb; /* Cyan au hover */
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 0 30px rgba(135, 206, 235, 0.4); /* Glow cyan au hover */
  }
  
  .pokemon-weather-widget:hover .time-icon,
  .pokemon-weather-widget:hover .weather-icon {
    transform: scale(1.05) rotate(3deg); /* Plus subtil */
  }
  
  .pokemon-weather-widget:hover .particle {
    opacity: 0.5; /* Plus visible au hover */
    animation-duration: 2s;
  }
  
  /* === 📱 RESPONSIVE DIMENSIONS NORMALES === */
  @media (max-width: 800px) {
    .pokemon-weather-widget.ui-standalone-widget {
      width: 320px !important;        /* Réduit proportionnellement */
      height: 120px !important;       /* Réduit proportionnellement */
      min-width: 320px !important;
      max-width: 320px !important;
      min-height: 120px !important;
      max-height: 120px !important;
    }
    
    .ui-standalone-widget {
      width: 320px !important;
      height: 120px !important;
      min-width: 320px !important;
      max-width: 320px !important;
      min-height: 120px !important;
      max-height: 120px !important;
    }
    
    .pokemon-weather-widget.ui-standalone-widget:not(.ui-icon) {
      width: 320px !important;
      height: 120px !important;
      min-width: 320px !important;
      max-width: 320px !important;
      min-height: 120px !important;
      max-height: 120px !important;
    }
    
    .pokemon-weather-widget .widget-content {
      padding: 12px;                  /* Réduit sur mobile */
      gap: 8px;                      /* Réduit sur mobile */
    }
    
    .pokemon-weather-widget .time-icon,
    .pokemon-weather-widget .weather-icon {
      font-size: 24px;               /* Réduit sur mobile */
    }
    
    .pokemon-weather-widget .time-main,
    .pokemon-weather-widget .weather-main {
      font-size: 14px;               /* Réduit sur mobile */
    }
    
    .pokemon-weather-widget .zone-text,
    .pokemon-weather-widget .bonus-text {
      font-size: 10px;                /* Réduit sur mobile */
    }
  }
  
  /* === ⚡ INDICATEUR UIMANAGER CONSERVÉ === */
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
    background: rgba(74, 144, 226, 0.3); /* Bleu unifié */
    border-radius: 50%;
    padding: 2px;
    border: 1px solid rgba(135, 206, 235, 0.5);
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  
  /* === 🎯 ACCESSIBILITY CONSERVÉE === */
  .pokemon-weather-widget:focus-within {
    outline: 2px solid rgba(135, 206, 235, 0.5);
    outline-offset: 4px;
  }
  
  /* === 🎊 EASTER EGG SHINY ADAPTÉ === */
  .pokemon-weather-widget.shiny {
    animation: shiny-sparkle-unified 3s ease-in-out infinite;
  }
  
  @keyframes shiny-sparkle-unified {
    0%, 100% {
      filter: hue-rotate(0deg) brightness(1);
      border-color: #4a90e2;
    }
    25% {
      filter: hue-rotate(30deg) brightness(1.1);
      border-color: #87ceeb;
    }
    50% {
      filter: hue-rotate(60deg) brightness(1.2);
      border-color: #b39ddb;
    }
    75% {
      filter: hue-rotate(30deg) brightness(1.1);
      border-color: #87ceeb;
    }
  }
  
  /* === 🛡️ PROTECTION CONTRE CSS UIMANAGER === */
  .pokemon-weather-widget.ui-standalone-widget:not(.ui-icon) {
    /* S'assurer qu'aucune règle UIManager ne s'applique */
    width: 340px !important;
    height: 140px !important;
    min-width: 340px !important;
    max-width: 340px !important;
    min-height: 140px !important;
    max-height: 140px !important;
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 1000 !important;
    overflow: visible !important;    /* CRUCIAL: Permettre débordement */
  }
  
  /* Annuler toute règle .ui-icon si appliquée par erreur */
  .pokemon-weather-widget.ui-standalone-widget.ui-icon {
    width: 340px !important;
    height: 140px !important;
    min-width: 340px !important;
    max-width: 340px !important;
    min-height: 140px !important;
    max-height: 140px !important;
  }
  
  /* === 🌈 OPTIMIZATIONS PERFORMANCE === */
  .pokemon-weather-widget {
    will-change: transform, opacity;
    backface-visibility: hidden;
    perspective: 1000px;
  }
  
  .pokemon-weather-widget .particle,
  .pokemon-weather-widget .time-icon,
  .pokemon-weather-widget .weather-icon,
  .pokemon-weather-widget .pokemon-type-icon {
    will-change: transform;
    backface-visibility: hidden;
  }
`;

export default POKEMON_WEATHER_STYLES;
