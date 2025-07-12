// Pokedex/PokedexIconCSS.js - Styles pour l'icône Pokédx
// 🎨 Style nostalgique inspiré des Pokédx première génération

export const POKEDEX_ICON_STYLES = `
  /* ===== POKÉDEX ICON STYLES ===== */
  .pokedex-icon {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 80px;
    height: 90px;
    cursor: pointer;
    z-index: 500;
    transition: all 0.3s ease;
    user-select: none;
  }

  .pokedex-icon:hover {
    transform: scale(1.05);
  }

  .pokedex-icon .icon-background {
    width: 100%;
    height: 80px;
    background: linear-gradient(145deg, #1e3a8a, #1e40af);
    border: 3px solid #3b82f6;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 
      0 4px 15px rgba(59, 130, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .pokedex-icon:hover .icon-background {
    background: linear-gradient(145deg, #1e40af, #2563eb);
    border-color: #60a5fa;
    box-shadow: 
      0 6px 20px rgba(59, 130, 246, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  /* ===== ÉCRAN LCD STYLE VINTAGE ===== */
  .pokedex-icon .icon-screen {
    flex: 1;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pokedex-icon .screen-border {
    width: 100%;
    height: 100%;
    background: #0f172a;
    border: 2px solid #334155;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 
      inset 0 0 10px rgba(0, 0, 0, 0.5),
      inset 0 2px 0 rgba(255, 255, 255, 0.1);
  }

  .pokedex-icon .screen-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 2px currentColor;
  }

  .pokedex-icon .pokedex-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }

  .pokedex-icon .logo-text {
    color: #10b981;
    font-size: 8px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .pokedex-icon .logo-dex {
    color: #f59e0b;
    font-size: 8px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .pokedex-icon .completion-display {
    margin-top: 2px;
  }

  .pokedex-icon .completion-text {
    color: #60a5fa;
    font-size: 7px;
    font-weight: bold;
  }

  /* ===== BOUTONS DE CONTRÔLE ===== */
  .pokedex-icon .icon-controls {
    height: 16px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0 0 9px 9px;
  }

  .pokedex-icon .control-button {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .pokedex-icon .control-button:hover {
    transform: scale(1.2);
    box-shadow: 
      0 2px 6px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 0 8px currentColor;
  }

  .pokedex-icon .control-button.pressed {
    transform: scale(0.9);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 4px currentColor;
  }

  .pokedex-icon .control-button.red {
    background: linear-gradient(145deg, #ef4444, #dc2626);
    color: #ef4444;
  }

  .pokedex-icon .control-button.blue {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    color: #3b82f6;
  }

  .pokedex-icon .control-button.green {
    background: linear-gradient(145deg, #10b981, #059669);
    color: #10b981;
  }

  /* ===== LABEL ===== */
  .pokedex-icon .icon-label {
    font-size: 10px;
    color: #e2e8f0;
    font-weight: 600;
    text-align: center;
    padding: 4px 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    font-family: 'Segoe UI', Arial, sans-serif;
  }

  /* ===== NOTIFICATION ===== */
  .pokedex-icon .icon-notification {
    position: absolute;
    top: -5px;
    right: -5px;
    width: 20px;
    height: 20px;
    background: linear-gradient(145deg, #ef4444, #dc2626);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    animation: pokedexPulse 2s infinite;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
  }

  .pokedex-icon .notification-count {
    color: white;
    font-size: 9px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  /* ===== ANNEAU DE PROGRESSION ===== */
  .pokedex-icon .completion-ring {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: 6px;
    pointer-events: none;
  }

  .pokedex-icon .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .pokedx-icon .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 1;
  }

  .pokedex-icon .ring-progress {
    fill: none;
    stroke: #10b981;
    stroke-width: 1.5;
    stroke-linecap: round;
    transition: stroke-dasharray 0.6s ease;
    filter: drop-shadow(0 0 2px #10b981);
  }

  /* ===== ANIMATIONS ===== */
  @keyframes pokedexPulse {
    0%, 100% { 
      transform: scale(1); 
      opacity: 1;
    }
    50% { 
      transform: scale(1.1); 
      opacity: 0.8;
    }
  }

  @keyframes pokedexGlow {
    0%, 100% { 
      box-shadow: 
        0 4px 15px rgba(59, 130, 246, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    50% { 
      box-shadow: 
        0 8px 30px rgba(59, 130, 246, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 0 20px rgba(59, 130, 246, 0.4);
    }
  }

  @keyframes screenFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  /* ===== ÉTAT HOVER ===== */
  .pokedex-icon.hover-glow .icon-background {
    animation: pokedexGlow 2s infinite;
  }

  .pokedex-icon.hover-glow .screen-border {
    animation: screenFlicker 3s infinite;
  }

  /* ===== ANIMATION D'OUVERTURE ===== */
  .pokedex-icon.opening .icon-background {
    animation: pokedexOpen 0.8s ease;
  }

  .pokedex-icon.opening .screen-border {
    animation: screenBoot 0.8s ease;
  }

  @keyframes pokedexOpen {
    0% { transform: scale(1) rotateY(0deg); }
    25% { transform: scale(1.1) rotateY(-5deg); }
    50% { transform: scale(1.05) rotateY(5deg); }
    75% { transform: scale(1.08) rotateY(-2deg); }
    100% { transform: scale(1) rotateY(0deg); }
  }

  @keyframes screenBoot {
    0% { 
      background: #0f172a;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
    30% { 
      background: #1e293b;
      box-shadow: 
        inset 0 0 15px rgba(16, 185, 129, 0.3),
        0 0 10px rgba(16, 185, 129, 0.2);
    }
    60% { 
      background: #0f172a;
      box-shadow: 
        inset 0 0 20px rgba(16, 185, 129, 0.5),
        0 0 15px rgba(16, 185, 129, 0.4);
    }
    100% { 
      background: #0f172a;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
  }

  /* ===== ANIMATION NOUVELLE DÉCOUVERTE ===== */
  .pokedex-icon.new-discovery .icon-background {
    animation: discoveryGlow 2s ease;
  }

  .pokedex-icon.new-discovery .ring-progress {
    stroke: #f59e0b;
    filter: drop-shadow(0 0 4px #f59e0b);
    animation: ringGlow 2s ease;
  }

  @keyframes discoveryGlow {
    0%, 100% { 
      box-shadow: 
        0 4px 15px rgba(59, 130, 246, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    50% { 
      box-shadow: 
        0 8px 40px rgba(245, 158, 11, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        0 0 25px rgba(245, 158, 11, 0.6);
    }
  }

  @keyframes ringGlow {
    0%, 100% { 
      stroke: #10b981;
      filter: drop-shadow(0 0 2px #10b981);
    }
    50% { 
      stroke: #f59e0b;
      filter: drop-shadow(0 0 6px #f59e0b);
    }
  }

  /* ===== ANIMATION CAPTURE ===== */
  .pokedex-icon.capture-success .icon-background {
    animation: captureFlash 1s ease;
  }

  @keyframes captureFlash {
    0%, 100% { 
      background: linear-gradient(145deg, #1e3a8a, #1e40af);
    }
    25% { 
      background: linear-gradient(145deg, #059669, #10b981);
    }
    50% { 
      background: linear-gradient(145deg, #1e3a8a, #1e40af);
    }
    75% { 
      background: linear-gradient(145deg, #059669, #10b981);
    }
  }

  /* ===== ANIMATION SHINY ===== */
  .pokedex-icon.shiny-capture .icon-background {
    animation: shinySparkle 2s ease;
  }

  @keyframes shinySparkle {
    0%, 100% { 
      box-shadow: 
        0 4px 15px rgba(59, 130, 246, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    25% { 
      box-shadow: 
        0 8px 30px rgba(236, 72, 153, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 0 20px rgba(236, 72, 153, 0.6);
    }
    50% { 
      box-shadow: 
        0 8px 30px rgba(245, 158, 11, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 0 20px rgba(245, 158, 11, 0.6);
    }
    75% { 
      box-shadow: 
        0 8px 30px rgba(16, 185, 129, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 0 20px rgba(16, 185, 129, 0.6);
    }
  }

  /* ===== ANIMATION JALON ===== */
  .pokedex-icon.milestone-reached {
    animation: milestoneAchieved 1.5s ease;
  }

  @keyframes milestoneAchieved {
    0%, 100% { 
      transform: scale(1);
      filter: none;
    }
    25% { 
      transform: scale(1.15);
      filter: brightness(1.5) saturate(1.5);
    }
    50% { 
      transform: scale(1.1);
      filter: brightness(1.3) saturate(1.3);
    }
    75% { 
      transform: scale(1.12);
      filter: brightness(1.4) saturate(1.4);
    }
  }

  /* ===== ANIMATION STREAK ===== */
  .pokedex-icon.streak-active .ring-progress {
    animation: streakPulse 1s infinite;
  }

  @keyframes streakPulse {
    0%, 100% { 
      stroke-width: 1.5;
      filter: drop-shadow(0 0 2px #10b981);
    }
    50% { 
      stroke-width: 2;
      filter: drop-shadow(0 0 6px #10b981);
    }
  }

  /* ===== ANIMATION MISE À JOUR DONNÉES ===== */
  .pokedex-icon.data-update .completion-text {
    animation: dataRefresh 0.6s ease;
  }

  @keyframes dataRefresh {
    0%, 100% { 
      color: #60a5fa;
      transform: scale(1);
    }
    50% { 
      color: #10b981;
      transform: scale(1.2);
    }
  }

  /* ===== ÉTATS UIMANAGER ===== */
  .pokedex-icon.ui-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(20px) scale(0.8);
  }

  .pokedex-icon.ui-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(60%);
  }

  .pokedx-icon.ui-disabled:hover {
    transform: none !important;
  }

  .pokedex-icon.ui-disabled .control-button {
    pointer-events: none;
    opacity: 0.5;
  }

  /* ===== ANIMATIONS UIMANAGER ===== */
  .pokedex-icon.ui-fade-in {
    animation: uiFadeIn 0.3s ease-out forwards;
  }

  .pokedex-icon.ui-fade-out {
    animation: uiFadeOut 0.2s ease-in forwards;
  }

  .pokedex-icon.ui-pulse {
    animation: uiPulse 0.15s ease-out;
  }

  @keyframes uiFadeIn {
    from { 
      opacity: 0; 
      transform: translateY(20px) scale(0.8); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }

  @keyframes uiFadeOut {
    from { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
    to { 
      opacity: 0; 
      transform: translateY(20px) scale(0.8); 
    }
  }

  @keyframes uiPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .pokedex-icon {
      bottom: 15px;
      right: 15px;
      width: 70px;
      height: 80px;
    }

    .pokedex-icon .icon-background {
      height: 70px;
    }

    .pokedex-icon .logo-text,
    .pokedex-icon .logo-dex {
      font-size: 7px;
    }

    .pokedex-icon .completion-text {
      font-size: 6px;
    }

    .pokedex-icon .control-button {
      width: 7px;
      height: 7px;
    }

    .pokedex-icon .icon-label {
      font-size: 9px;
    }
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .pokedex-icon {
      width: 75px;
      height: 85px;
    }

    .pokedex-icon .icon-background {
      height: 75px;
    }
  }

  /* ===== GROUPEMENT AVEC AUTRES ICÔNES ===== */
  .ui-icons-group .pokedex-icon {
    position: relative;
    bottom: auto;
    right: auto;
    margin: 0;
  }

  /* ===== ACCESSIBILITÉ ===== */
  .pokedex-icon:focus {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }

  .pokedex-icon .control-button:focus {
    outline: 1px solid rgba(255, 255, 255, 0.5);
    outline-offset: 1px;
  }

  /* ===== EFFET NOSTALGIQUE SUPPLÉMENTAIRE ===== */
  .pokedx-icon .screen-border::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(16, 185, 129, 0.1) 50%,
      transparent 100%
    );
    animation: scanLine 3s linear infinite;
    pointer-events: none;
  }

  @keyframes scanLine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* ===== EFFET BRILLANCE ===== */
  .pokedex-icon .icon-background::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.6s;
    border-radius: inherit;
  }

  .pokedex-icon:hover .icon-background::before {
    left: 100%;
  }
`;

export default POKEDEX_ICON_STYLES;

console.log('🎨 [PokedexIconCSS] Styles nostalgiques et modernes chargés');
