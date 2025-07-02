// client/src/scenes/BattleScene.js - Version overlay 80% avec monde visible en arrière-plan
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleUI } from '../Battle/BattleUI.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers
    this.battleManager = null;
    this.battleUI = null;
    this.gameManager = null;
    this.networkHandler = null;
    
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    
    // ✅ NOUVEAU: Overlay centré 80% avec monde visible
    this.battleOverlay = null;
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('⚔️ [BattleScene] Constructeur initialisé (version overlay 80%)');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('🔧 [BattleScene] Init avec data:', data);
    
    // Récupérer les managers
    this.gameManager = data.gameManager || this.scene.get('GameScene')?.gameManager;
    this.networkHandler = data.networkHandler || this.scene.get('GameScene')?.networkHandler;
    
    if (!this.gameManager || !this.networkHandler) {
      console.error('❌ [BattleScene] Managers manquants dans init');
      return;
    }
    
    console.log('✅ [BattleScene] Managers récupérés');
  }

  preload() {
    console.log('📁 [BattleScene] Préchargement...');
    
    // ✅ S'assurer que le background de combat est chargé
    if (!this.textures.exists('battlebg01')) {
      console.log('📥 [BattleScene] Chargement background de combat...');
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // ✅ ORDRE CORRIGÉ:
      // 1. Initialiser le BattleManager
      this.battleManager = new BattleManager();
      
      if (!this.gameManager || !this.networkHandler) {
        console.error('❌ [BattleScene] Impossible de créer sans managers');
        return;
      }
      
      this.battleManager.initialize(this.gameManager, this.networkHandler);
      
      // 2. Créer l'interface Phaser (dans l'overlay seulement pour les effets)
      this.battleUI = new BattleUI(this, this.battleManager);
      this.battleUI.initialize();

      // 3. Créer l'overlay centré 80% avec monde visible
      this.createCenteredBattleOverlay();
      
      // 4. Setup des événements
      this.setupBattleEvents();
      
      // La scène est créée mais pas visible
      this.isActive = true;
      this.isVisible = false;
      
      console.log('✅ [BattleScene] Scène créée avec overlay 80%');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === CRÉATION DE L'OVERLAY CENTRÉ 80% ===

  createCenteredBattleOverlay() {
    console.log('🖥️ [BattleScene] Création de l\'overlay centré 80%...');
    
    // ✅ NOUVEAU: Overlay centré 80% avec monde visible derrière
    this.battleOverlay = document.createElement('div');
    this.battleOverlay.className = 'battle-overlay centered-overlay pokemon-battle-ui';
    this.battleOverlay.id = 'battleOverlay';
    
    // ✅ Styles pour overlay 80% centré
    this.battleOverlay.style.cssText = `
      position: fixed;
      top: 10%;
      left: 10%;
      width: 80%;
      height: 80%;
      z-index: 5000;
      border-radius: 20px;
      box-shadow: 
        0 0 40px rgba(0, 0, 0, 0.8),
        inset 0 0 30px rgba(255, 255, 255, 0.1);
      border: 4px solid #FFCB05;
      overflow: hidden;
      display: none;
      flex-direction: column;
      backdrop-filter: blur(2px);
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(0, 0, 0, 0.1) 100%
      );
    `;
    
    // Structure HTML complète avec interface de combat style Pokémon
    this.battleOverlay.innerHTML = `
      <!-- Header avec titre et contrôles -->
      <div class="battle-header">
        <div class="battle-info">
          <h2 class="battle-title" id="battleTitle">Combat Pokémon</h2>
          <div class="battle-turn-info">
            <span class="turn-indicator" id="turnIndicator">En attente...</span>
          </div>
        </div>
        <div class="battle-controls">
          <button class="battle-btn" id="battleMenuBtn" title="Menu">⚙️</button>
          <button class="battle-btn" id="battleExitBtn" title="Quitter">❌</button>
        </div>
      </div>
      
      <!-- Champ de bataille transparent pour voir le monde -->
      <div class="battle-field transparent-field">
        <!-- Background Phaser rendu ici -->
        <div id="battleBackground" class="phaser-background"></div>
        
        <!-- Barres de vie des Pokémon (style Pokémon authentique) -->
        <div class="pokemon-health-bar opponent glass-effect" id="opponentHealthBar" style="display: none;">
          <div class="pokemon-name">
            <span id="opponentName">Pokémon</span>
            <span class="pokemon-level" id="opponentLevel">Lv.?</span>
          </div>
          <div class="health-bar-container">
            <div class="health-bar-bg"></div>
            <div class="health-bar high" id="opponentHealthBarFill"></div>
          </div>
          <div class="status-indicator" id="opponentStatus"></div>
        </div>
        
        <div class="pokemon-health-bar player glass-effect" id="playerHealthBar" style="display: none;">
          <div class="pokemon-name">
            <span id="playerName">Votre Pokémon</span>
            <span class="pokemon-level" id="playerLevel">Lv.?</span>
          </div>
          <div class="health-bar-container">
            <div class="health-bar-bg"></div>
            <div class="health-bar high" id="playerHealthBarFill"></div>
          </div>
          <div class="health-text" id="playerHealthText">??/??</div>
          <div class="status-indicator" id="playerStatus"></div>
          <div class="exp-bar-container">
            <div class="exp-bar" id="playerExpBar"></div>
          </div>
        </div>
        
        <!-- Zone des sprites Pokémon (Phaser rendu ici) -->
        <div id="pokemonField" class="pokemon-sprites-area">
          <!-- Les sprites Pokémon seront affichés par BattleUI -->
        </div>
        
        <!-- Zone des effets de combat -->
        <div id="battleEffects" class="battle-effects-layer">
          <!-- Effets visuels temporaires -->
        </div>
      </div>
      
      <!-- Interface de combat (log + actions) avec effet de verre -->
      <div class="battle-interface glass-effect">
        <div class="battle-log-section">
          <div class="battle-log glass-inner" id="battleLog">
            <div class="battle-log-message">Combat en cours d'initialisation...</div>
          </div>
        </div>
        
        <div class="battle-actions-section">
          <div class="battle-actions-grid" id="battleActions">
            <button class="action-button fight glass-button" data-action="fight" disabled>
              <div class="action-icon">⚔️</div>
              <div class="action-text">Attaque</div>
            </button>
            <button class="action-button bag glass-button" data-action="bag" disabled>
              <div class="action-icon">🎒</div>
              <div class="action-text">Sac</div>
            </button>
            <button class="action-button pokemon glass-button" data-action="pokemon" disabled>
              <div class="action-icon">🔄</div>
              <div class="action-text">Pokémon</div>
            </button>
            <button class="action-button run glass-button" data-action="run" disabled>
              <div class="action-icon">🏃</div>
              <div class="action-text">Fuir</div>
            </button>
          </div>
          
          <!-- Indicateur de tour stylisé -->
          <div class="turn-indicator-section">
            <div class="turn-indicator-bar glass-inner" id="turnIndicatorBar">
              <span class="turn-text" id="turnText">En attente...</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sous-menus avec effet de verre -->
      <div class="battle-submenu glass-effect hidden" id="movesSubmenu">
        <div class="submenu-header glass-inner">
          <h3 class="submenu-title">Choisissez une attaque</h3>
          <button class="submenu-close glass-button" id="closeMovesSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div class="moves-grid" id="movesGrid">
            <!-- Attaques seront injectées ici -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu glass-effect hidden" id="itemsSubmenu">
        <div class="submenu-header glass-inner">
          <h3 class="submenu-title">Choisissez un objet</h3>
          <button class="submenu-close glass-button" id="closeItemsSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div id="itemsList">
            <!-- Objets seront injectés ici -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu glass-effect hidden" id="pokemonSubmenu">
        <div class="submenu-header glass-inner">
          <h3 class="submenu-title">Choisissez un Pokémon</h3>
          <button class="submenu-close glass-button" id="closePokemonSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div id="pokemonList">
            <!-- Pokémon seront injectés ici -->
          </div>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(this.battleOverlay);
    
    // Ajouter les styles spécifiques pour l'overlay 80%
    this.addOverlay80Styles();
    
    // Setup des événements DOM
    this.setupDOMEvents();
    
    console.log('✅ [BattleScene] Overlay centré 80% créé');
  }

  addOverlay80Styles() {
    if (document.querySelector('#battle-overlay-80-styles')) return;

    const style = document.createElement('style');
    style.id = 'battle-overlay-80-styles';
    style.textContent = `
      /* === STYLES POUR OVERLAY 80% AVEC MONDE VISIBLE === */
      
      .pokemon-battle-ui {
        font-family: 'Arial', sans-serif;
        user-select: none;
        animation: overlayAppear 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
      }
      
      @keyframes overlayAppear {
        0% {
          opacity: 0;
          transform: scale(0.85) translateY(-30px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      /* === EFFETS DE VERRE === */
      .glass-effect {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .glass-inner {
        backdrop-filter: blur(5px);
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .glass-button {
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 203, 5, 0.8);
        transition: all 0.3s ease;
      }
      
      .glass-button:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 203, 5, 1);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(255, 203, 5, 0.3);
      }
      
      /* === HEADER === */
      .battle-header {
        height: 12%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 25px;
        background: linear-gradient(135deg, rgba(255, 203, 5, 0.9), rgba(255, 165, 0, 0.8));
        border-bottom: 2px solid #FFD700;
        border-radius: 16px 16px 0 0;
      }
      
      .battle-title {
        color: #000;
        font-size: 24px;
        font-weight: bold;
        margin: 0;
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
      }
      
      .battle-controls {
        display: flex;
        gap: 10px;
      }
      
      .battle-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .battle-btn:hover {
        background: rgba(0, 0, 0, 0.9);
        transform: scale(1.1);
      }
      
      /* === CHAMP DE BATAILLE TRANSPARENT === */
      .battle-field.transparent-field {
        height: 58%;
        position: relative;
        /* Transparence pour voir le monde derrière */
        background: radial-gradient(
          ellipse 300px 80px at 25% 85%, 
          rgba(34, 139, 34, 0.15) 0%, 
          transparent 100%
        ),
        radial-gradient(
          ellipse 240px 60px at 75% 45%, 
          rgba(50, 205, 50, 0.15) 0%, 
          transparent 100%
        );
      }
      
      .phaser-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .pokemon-sprites-area {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .battle-effects-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      }
      
      /* === BARRES DE VIE STYLE POKÉMON === */
      .pokemon-health-bar {
        position: absolute;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
        min-width: 220px;
        z-index: 50;
      }
      
      .pokemon-health-bar.opponent {
        top: 8%;
        left: 4%;
      }
      
      .pokemon-health-bar.player {
        bottom: 30%;
        right: 4%;
      }
      
      .pokemon-name {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .pokemon-name span {
        color: #000;
        font-weight: bold;
        font-size: 14px;
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
      }
      
      .pokemon-level {
        color: #666;
        font-size: 12px;
      }
      
      .health-bar-container {
        position: relative;
        height: 8px;
        margin: 6px 0;
      }
      
      .health-bar-bg {
        position: absolute;
        width: 100%;
        height: 100%;
        background: #333;
        border-radius: 4px;
        border: 1px solid #000;
      }
      
      .health-bar {
        position: absolute;
        height: 100%;
        border-radius: 4px;
        transition: width 0.8s ease, background-color 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      
      .health-bar.high {
        background: linear-gradient(90deg, #00FF00, #32CD32);
      }
      
      .health-bar.medium {
        background: linear-gradient(90deg, #FFFF00, #FFD700);
      }
      
      .health-bar.low {
        background: linear-gradient(90deg, #FF0000, #FF4500);
        animation: lowHpBlink 1s infinite;
      }
      
      @keyframes lowHpBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      .health-text {
        color: #000;
        font-size: 11px;
        font-weight: bold;
        text-align: right;
        margin-top: 4px;
        text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
      }
      
      .status-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 16px;
      }
      
      .exp-bar-container {
        height: 4px;
        background: #333;
        border-radius: 2px;
        margin-top: 6px;
        border: 1px solid #000;
      }
      
      .exp-bar {
        height: 100%;
        background: linear-gradient(90deg, #00BFFF, #1E90FF);
        border-radius: 2px;
        width: 60%;
        transition: width 0.8s ease;
      }
      
      /* === INTERFACE DE COMBAT === */
      .battle-interface {
        height: 30%;
        display: flex;
        flex-direction: column;
        border-radius: 0 0 16px 16px;
        border-top: 2px solid #FFD700;
      }
      
      .battle-log-section {
        flex: 1;
        padding: 12px 16px;
        display: flex;
        align-items: center;
      }
      
      .battle-log {
        width: 100%;
        height: 50px;
        overflow-y: auto;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        line-height: 1.3;
        color: #FFF;
      }
      
      .battle-log::-webkit-scrollbar {
        width: 4px;
      }
      
      .battle-log::-webkit-scrollbar-thumb {
        background: #FFD700;
        border-radius: 2px;
      }
      
      .battle-log-message {
        margin: 2px 0;
        animation: messageSlideIn 0.3s ease-out;
      }
      
      @keyframes messageSlideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .battle-actions-section {
        padding: 12px 16px;
      }
      
      .battle-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .action-button {
        height: 50px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      
      .action-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .action-button:hover::before {
        left: 100%;
      }
      
      .action-button .action-icon {
        margin-right: 6px;
        font-size: 18px;
      }
      
      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: rgba(100, 100, 100, 0.6) !important;
      }
      
      /* Couleurs des boutons d'action */
      .action-button.fight {
        background: linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.9));
      }
      
      .action-button.bag {
        background: linear-gradient(135deg, rgba(5, 150, 105, 0.9), rgba(4, 120, 87, 0.9));
      }
      
      .action-button.pokemon {
        background: linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(220, 38, 38, 0.9));
      }
      
      .action-button.run {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(109, 40, 217, 0.9));
      }
      
      .turn-indicator-section {
        text-align: center;
      }
      
      .turn-indicator-bar {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
      }
      
      .turn-text {
        color: #FFD700;
      }
      
      /* === SOUS-MENUS === */
      .battle-submenu {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 70%;
        border-radius: 0 0 16px 16px;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
        transform: translateY(100%);
      }
      
      .battle-submenu:not(.hidden) {
        transform: translateY(0);
      }
      
      .submenu-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 203, 5, 0.3);
        border-radius: 8px;
        margin: 8px;
      }
      
      .submenu-title {
        color: #FFD700;
        font-size: 16px;
        margin: 0;
        font-weight: bold;
      }
      
      .submenu-close {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .submenu-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
      }
      
      .moves-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .move-button {
        padding: 12px;
        border-radius: 8px;
        color: white;
        font-size: 13px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8));
      }
      
      .move-button:hover {
        transform: scale(1.05);
        background: linear-gradient(135deg, rgba(96, 165, 250, 0.9), rgba(59, 130, 246, 0.9));
      }
      
      .move-name {
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .move-info {
        font-size: 11px;
        opacity: 0.8;
      }
      
      #itemsList {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .item-button {
        padding: 12px;
        border-radius: 8px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8));
      }
      
      .item-button:hover {
        transform: scale(1.05);
        background: linear-gradient(135deg, rgba(52, 211, 153, 0.9), rgba(16, 185, 129, 0.9));
      }
      
      #pokemonList {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .pokemon-button {
        padding: 12px;
        border-radius: 8px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.8), rgba(234, 88, 12, 0.8));
      }
      
      .pokemon-button:hover {
        transform: scale(1.02);
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.9), rgba(249, 115, 22, 0.9));
      }
      
      .pokemon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: rgba(100, 100, 100, 0.6) !important;
      }
      
      /* === RESPONSIVE === */
      @media (max-width: 1024px) {
        .pokemon-battle-ui {
          top: 5% !important;
          left: 5% !important;
          width: 90% !important;
          height: 90% !important;
        }
      }
      
      @media (max-width: 768px) {
        .pokemon-battle-ui {
          top: 2% !important;
          left: 2% !important;
          width: 96% !important;
          height: 96% !important;
        }
        
        .battle-actions-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        
        .action-button {
          height: 45px;
          font-size: 12px;
        }
        
        .pokemon-health-bar {
          min-width: 180px;
          padding: 8px 12px;
        }
        
        .battle-title {
          font-size: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // === ÉVÉNEMENTS DOM ===

  setupDOMEvents() {
    console.log('🔗 [BattleScene] Configuration des événements DOM...');
    
    // Boutons d'action principaux
    const actionButtons = this.battleOverlay.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleActionClick(action);
      });
    });
    
    // Boutons de contrôle
    const menuBtn = this.battleOverlay.querySelector('#battleMenuBtn');
    const exitBtn = this.battleOverlay.querySelector('#battleExitBtn');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.toggleBattleMenu());
    }
    
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.attemptExitBattle());
    }
    
    // Boutons de fermeture des sous-menus
    const closeButtons = this.battleOverlay.querySelectorAll('.submenu-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.hideAllSubmenus();
      });
    });
    
    console.log('✅ [BattleScene] Événements DOM configurés');
  }

  // === ÉVÉNEMENTS DE COMBAT ===

  setupBattleEvents() {
    if (!this.battleManager) return;
    
    console.log('⚔️ [BattleScene] Configuration des événements de combat...');
    
    // Événements du BattleManager
    this.battleManager.on('encounterStart', (data) => {
      this.handleEncounterStart(data);
    });
    
    this.battleManager.on('battleStart', (data) => {
      this.handleBattleStart(data);
    });
    
    this.battleManager.on('turnChange', (data) => {
      this.handleTurnChange(data);
    });
    
    this.battleManager.on('messageAdded', (data) => {
      this.addBattleLogMessage(data.message);
    });
    
    this.battleManager.on('battleEnd', (data) => {
      this.handleBattleEnd(data);
    });
    
    this.battleManager.on('actionSelected', (data) => {
      this.handleActionSelected(data);
    });
    
    this.battleManager.on('submenuShown', (data) => {
      this.showSubmenu(data.type);
    });
    
    this.battleManager.on('submenuHidden', () => {
      this.hideAllSubmenus();
    });
    
    console.log('✅ [BattleScene] Événements de combat configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  handleEncounterStart(data) {
    console.log('🐾 [BattleScene] Début de rencontre:', data);
    
    // Afficher l'interface de combat avec effet d'apparition
    this.showBattleInterface();
    
    // Mettre à jour les informations
    this.addBattleLogMessage(`Un ${data.pokemon?.name || 'Pokémon'} sauvage apparaît !`);
    
    // Stocker les données du Pokémon adversaire
    this.currentOpponentPokemon = data.pokemon;
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleScene] Début de combat:', data);
    
    // Stocker les données des Pokémon
    this.currentPlayerPokemon = data.player1Pokemon;
    this.currentOpponentPokemon = data.player2Pokemon;
    
    // ✅ Afficher les Pokémon dans l'interface Phaser (dans l'overlay)
    if (this.battleUI) {
      this.battleUI.displayPokemon(this.currentPlayerPokemon, this.currentOpponentPokemon);
    }
    
    // Mettre à jour les barres de vie DOM
    this.updatePlayerHealthBar(this.currentPlayerPokemon);
    this.updateOpponentHealthBar(this.currentOpponentPokemon);
    
    // Mettre à jour le tour
    this.updateTurnIndicator(data.currentTurn);
    
    // Activer les boutons d'action
    this.enableActionButtons();
    
    this.addBattleLogMessage('Le combat commence !');
  }

  handleTurnChange(data) {
    console.log('🔄 [BattleScene] Changement de tour:', data);
    
    this.updateTurnIndicator(data.currentTurn);
    this.hideAllSubmenus();
    
    // Réactiver les boutons si c'est notre tour
    if (data.currentTurn === 'player1') {
      this.enableActionButtons();
      this.addBattleLogMessage('C\'est votre tour !');
    } else {
      this.disableActionButtons();
      this.addBattleLogMessage('Tour de l\'adversaire...');
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleScene] Fin de combat:', data);
    
    const resultMessage = this.getEndMessage(data.result);
    this.addBattleLogMessage(resultMessage);
    this.disableActionButtons();
    
    // Afficher les récompenses si disponibles
    if (data.rewards) {
      this.showRewards(data.rewards);
    }
    
    // Programmer la fermeture avec effet
    setTimeout(() => {
      this.hideBattleInterface();
    }, 5000);
  }

  handleActionSelected(data) {
    console.log('🎯 [BattleScene] Action sélectionnée:', data);
    
    // Désactiver temporairement les boutons
    this.disableActionButtons();
  }

  // === MISE À JOUR DES BARRES DE VIE (DOM) ===

  updatePlayerHealthBar(pokemonData) {
    if (!pokemonData) return;
    
    const healthBar = this.battleOverlay.querySelector('#playerHealthBar');
    const nameElement = this.battleOverlay.querySelector('#playerName');
    const levelElement = this.battleOverlay.querySelector('#playerLevel');
    const healthFill = this.battleOverlay.querySelector('#playerHealthBarFill');
    const healthText = this.battleOverlay.querySelector('#playerHealthText');
    const statusElement = this.battleOverlay.querySelector('#playerStatus');
    
    if (healthBar) healthBar.style.display = 'block';
    if (nameElement) nameElement.textContent = pokemonData.name || 'Votre Pokémon';
    if (levelElement) levelElement.textContent = `Lv.${pokemonData.level || 1}`;
    if (healthText) healthText.textContent = `${pokemonData.currentHp || 0}/${pokemonData.maxHp || 1}`;
    
    // Barre de vie avec animation
    if (healthFill && pokemonData.maxHp > 0) {
      const hpPercent = (pokemonData.currentHp / pokemonData.maxHp) * 100;
      
      // Animation de la barre
      healthFill.style.width = `${hpPercent}%`;
      
      // Couleur selon les HP
      healthFill.className = 'health-bar';
      if (hpPercent > 50) {
        healthFill.classList.add('high');
      } else if (hpPercent > 20) {
        healthFill.classList.add('medium');
      } else {
        healthFill.classList.add('low');
      }
    }
    
    // Statut
    if (statusElement) {
      const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
      statusElement.textContent = statusEmoji;
    }
  }

  updateOpponentHealthBar(pokemonData) {
    if (!pokemonData) return;
    
    const healthBar = this.battleOverlay.querySelector('#opponentHealthBar');
    const nameElement = this.battleOverlay.querySelector('#opponentName');
    const levelElement = this.battleOverlay.querySelector('#opponentLevel');
    const healthFill = this.battleOverlay.querySelector('#opponentHealthBarFill');
    const statusElement = this.battleOverlay.querySelector('#opponentStatus');
    
    if (healthBar) healthBar.style.display = 'block';
    if (nameElement) nameElement.textContent = pokemonData.name || 'Pokémon';
    if (levelElement) levelElement.textContent = `Lv.${pokemonData.level || 1}`;
    
    // Barre de vie avec animation
    if (healthFill && pokemonData.maxHp > 0) {
      const hpPercent = (pokemonData.currentHp / pokemonData.maxHp) * 100;
      
      // Animation de la barre
      healthFill.style.width = `${hpPercent}%`;
      
      // Couleur selon les HP
      healthFill.className = 'health-bar';
      if (hpPercent > 50) {
        healthFill.classList.add('high');
      } else if (hpPercent > 20) {
        healthFill.classList.add('medium');
      } else {
        healthFill.classList.add('low');
      }
    }
    
    // Statut
    if (statusElement) {
      const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
      statusElement.textContent = statusEmoji;
    }
  }

  // === GESTION DES ACTIONS ===

  handleActionClick(action) {
    if (!this.battleManager) {
      console.warn('⚠️ [BattleScene] BattleManager non disponible');
      return;
    }
    
    if (!this.battleManager.canSelectAction()) {
      console.warn('⚠️ [BattleScene] Impossible de sélectionner une action maintenant');
      this.addBattleLogMessage('Vous ne pouvez pas agir maintenant !');
      return;
    }
    
    console.log(`🎮 [BattleScene] Action cliquée: ${action}`);
    
    const success = this.battleManager.selectAction(action);
    if (!success) {
      console.warn(`⚠️ [BattleScene] Échec de sélection de l'action: ${action}`);
      this.addBattleLogMessage(`Impossible d'utiliser ${action} !`);
    }
  }

  // === GESTION DES SOUS-MENUS ===

  showSubmenu(type) {
    console.log(`📋 [BattleScene] Affichage sous-menu: ${type}`);
    
    // Cacher tous les sous-menus d'abord
    this.hideAllSubmenus();
    
    const submenu = this.battleOverlay?.querySelector(`#${type}Submenu`);
    if (submenu) {
      submenu.classList.remove('hidden');
      
      // Remplir le contenu selon le type
      switch (type) {
        case 'moves':
          this.populateMovesSubmenu();
          break;
        case 'items':
          this.populateItemsSubmenu();
          break;
        case 'pokemon':
          this.populatePokemonSubmenu();
          break;
      }
    }
  }

  hideAllSubmenus() {
    const submenus = this.battleOverlay?.querySelectorAll('.battle-submenu');
    submenus?.forEach(submenu => {
      submenu.classList.add('hidden');
    });
  }

  populateMovesSubmenu() {
    console.log('💥 [BattleScene] Population des attaques...');
    
    const movesGrid = this.battleOverlay?.querySelector('#movesGrid');
    if (!movesGrid) return;
    
    // Récupérer les attaques du Pokémon actuel
    const playerPokemon = this.currentPlayerPokemon;
    if (!playerPokemon || !playerPokemon.moves) {
      movesGrid.innerHTML = '<p style="text-align: center; color: #AAA;">Aucune attaque disponible</p>';
      return;
    }
    
    // Générer les boutons d'attaque
    const movesHTML = playerPokemon.moves.map(moveId => `
      <button class="move-button glass-button" data-move-id="${moveId}">
        <div class="move-name">${this.getMoveName(moveId)}</div>
        <div class="move-info">PP: ${this.getMovePP(moveId)}</div>
      </button>
    `).join('');
    
    movesGrid.innerHTML = movesHTML;
    
    // Ajouter les événements
    const moveButtons = movesGrid.querySelectorAll('.move-button');
    moveButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const moveId = e.currentTarget.dataset.moveId;
        this.selectMove(moveId);
      });
    });
  }

  populateItemsSubmenu() {
    console.log('🎒 [BattleScene] Population des objets...');
    
    const itemsList = this.battleOverlay?.querySelector('#itemsList');
    if (!itemsList) return;
    
    // TODO: Récupérer l'inventaire réel du joueur
    // Pour l'instant, objets de base
    const items = [
      { id: 'poke_ball', name: 'Poké Ball', count: 5 },
      { id: 'great_ball', name: 'Super Ball', count: 2 },
      { id: 'potion', name: 'Potion', count: 3 },
      { id: 'super_potion', name: 'Super Potion', count: 1 }
    ];
    
    const itemsHTML = items.map(item => `
      <button class="item-button glass-button" data-item-id="${item.id}">
        <span class="item-name">${item.name}</span>
        <span class="item-count">×${item.count}</span>
      </button>
    `).join('');
    
    itemsList.innerHTML = itemsHTML;
    
    // Ajouter les événements
    const itemButtons = itemsList.querySelectorAll('.item-button');
    itemButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const itemId = e.currentTarget.dataset.itemId;
        this.selectItem(itemId);
      });
    });
  }

  populatePokemonSubmenu() {
    console.log('🔄 [BattleScene] Population des Pokémon...');
    
    const pokemonList = this.battleOverlay?.querySelector('#pokemonList');
    if (!pokemonList) return;
    
    // TODO: Récupérer l'équipe réelle du joueur
    // Pour l'instant, équipe de base
    const team = [
      { id: '1', name: 'Bulbasaur', level: 5, hp: 20, maxHp: 20, status: 'normal' },
      { id: '2', name: 'Charmander', level: 5, hp: 15, maxHp: 19, status: 'normal' },
      { id: '3', name: 'Squirtle', level: 4, hp: 0, maxHp: 18, status: 'ko' }
    ];
    
    const pokemonHTML = team.map(pokemon => `
      <button class="pokemon-button glass-button ${pokemon.hp <= 0 ? 'fainted' : ''}" 
              data-pokemon-id="${pokemon.id}"
              ${pokemon.hp <= 0 ? 'disabled' : ''}>
        <div class="pokemon-info">
          <div class="pokemon-name">${pokemon.name} Niv.${pokemon.level}</div>
          <div class="pokemon-hp">PV: ${pokemon.hp}/${pokemon.maxHp}</div>
          <div class="pokemon-status">${pokemon.status === 'ko' ? 'KO' : this.getStatusText(pokemon.status)}</div>
        </div>
      </button>
    `).join('');
    
    pokemonList.innerHTML = pokemonHTML;
    
    // Ajouter les événements
    const pokemonButtons = pokemonList.querySelectorAll('.pokemon-button:not([disabled])');
    pokemonButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const pokemonId = e.currentTarget.dataset.pokemonId;
        this.selectPokemon(pokemonId);
      });
    });
  }

  // === SÉLECTION D'ACTIONS ===

  selectMove(moveId) {
    console.log(`💥 [BattleScene] Attaque sélectionnée: ${moveId}`);
    
    if (this.battleManager) {
      this.battleManager.selectMove(moveId);
    }
    
    this.addBattleLogMessage(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} utilise ${this.getMoveName(moveId)} !`);
    this.hideAllSubmenus();
  }

  selectItem(itemId) {
    console.log(`🎒 [BattleScene] Objet sélectionné: ${itemId}`);
    
    if (this.battleManager) {
      this.battleManager.useItem(itemId);
    }
    
    this.addBattleLogMessage(`Vous utilisez ${this.getItemName(itemId)} !`);
    this.hideAllSubmenus();
  }

  selectPokemon(pokemonId) {
    console.log(`🔄 [BattleScene] Pokémon sélectionné: ${pokemonId}`);
    
    // TODO: Implémenter changement de Pokémon
    this.addBattleLogMessage(`Changement de Pokémon en cours de développement...`);
    this.hideAllSubmenus();
  }

  // === GESTION DE L'INTERFACE ===

  showBattleInterface() {
    console.log('🖥️ [BattleScene] Affichage interface de combat overlay 80%');
    
    // ✅ NE PAS bloquer le mouvement - laisser le monde visible
    // if (this.gameManager?.player?.setMovementEnabled) {
    //   this.gameManager.player.setMovementEnabled(false);
    // }
    
    // Afficher l'overlay avec effet d'apparition
    if (this.battleOverlay) {
      this.battleOverlay.style.display = 'flex';
      this.battleOverlay.classList.add('active');
      this.isVisible = true;
      
      // Faire passer la scène en premier plan
      if (this.scene && this.scene.bringToTop) {
        this.scene.bringToTop();
      }
    }
    
    // Afficher l'interface Phaser dans l'overlay
    if (this.battleUI) {
      this.battleUI.show();
    }
  }

  hideBattleInterface() {
    console.log('🖥️ [BattleScene] Masquage interface de combat');
    
    // Cacher l'overlay avec effet de sortie
    if (this.battleOverlay) {
      this.battleOverlay.classList.remove('active');
      
      setTimeout(() => {
        this.battleOverlay.style.display = 'none';
      }, 600); // Attendre la fin de l'animation
      
      this.isVisible = false;
    }
    
    // Cacher l'interface Phaser
    if (this.battleUI) {
      this.battleUI.hide();
    }
    
    // ✅ Réactiver le mouvement
    if (this.gameManager?.player?.setMovementEnabled) {
      this.gameManager.player.setMovementEnabled(true);
    }
    
    // Revenir à la scène principale
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  updateTurnIndicator(currentTurn) {
    const turnText = this.battleOverlay?.querySelector('#turnText');
    const turnBar = this.battleOverlay?.querySelector('#turnIndicatorBar');
    
    if (turnText && turnBar) {
      if (currentTurn === 'player1') {
        turnText.textContent = '🟢 Votre tour';
        turnBar.style.background = 'rgba(34, 197, 94, 0.8)';
      } else {
        turnText.textContent = '🔴 Tour adversaire';
        turnBar.style.background = 'rgba(239, 68, 68, 0.8)';
      }
    }
  }

  enableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = false;
    });
  }

  disableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = true;
    });
  }

  addBattleLogMessage(message) {
    const battleLog = this.battleOverlay?.querySelector('#battleLog');
    if (!battleLog) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'battle-log-message';
    messageElement.textContent = message;
    
    battleLog.appendChild(messageElement);
    
    // Faire défiler vers le bas
    battleLog.scrollTop = battleLog.scrollHeight;
    
    // Limiter le nombre de messages (garder les 10 derniers)
    const messages = battleLog.querySelectorAll('.battle-log-message');
    if (messages.length > 10) {
      messages[0].remove();
    }
  }

  showRewards(rewards) {
    console.log('🎁 [BattleScene] Affichage des récompenses:', rewards);
    
    if (rewards.experience > 0) {
      this.addBattleLogMessage(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} gagne ${rewards.experience} points d'expérience !`);
    }
    
    if (rewards.gold > 0) {
      this.addBattleLogMessage(`Vous trouvez ${rewards.gold} pièces d'or !`);
    }
    
    if (rewards.pokemonCaught) {
      this.addBattleLogMessage(`${rewards.pokemonCaught.name} a été capturé avec succès !`);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  getMoveName(moveId) {
    const moveNames = {
      'tackle': 'Charge',
      'growl': 'Grondement', 
      'vine_whip': 'Fouet Lianes',
      'ember': 'Flammèche',
      'water_gun': 'Pistolet à O',
      'thunder_shock': 'Éclair',
      'scratch': 'Griffe',
      'tail_whip': 'Mimi-Queue',
      'bubble': 'Écume',
      'withdraw': 'Repli'
    };
    
    return moveNames[moveId] || moveId.replace('_', ' ');
  }

  getMovePP(moveId) {
    const movePP = {
      'tackle': '35/35',
      'growl': '40/40',
      'vine_whip': '25/25',
      'ember': '25/25',
      'water_gun': '25/25',
      'thunder_shock': '30/30'
    };
    
    return movePP[moveId] || '??/??';
  }

  getItemName(itemId) {
    const itemNames = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'potion': 'Potion',
      'super_potion': 'Super Potion'
    };
    
    return itemNames[itemId] || itemId.replace('_', ' ');
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'normal': '',
      'poison': '💜',
      'burn': '🔥', 
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵'
    };
    
    return statusEmojis[status] || '';
  }

  getStatusText(status) {
    const statusTexts = {
      'normal': 'Normal',
      'poison': 'Empoisonné',
      'burn': 'Brûlé', 
      'paralysis': 'Paralysé',
      'sleep': 'Endormi',
      'freeze': 'Gelé',
      'confusion': 'Confus'
    };
    
    return statusTexts[status] || status || 'Normal';
  }

  getEndMessage(result) {
    switch (result) {
      case 'victory':
        return 'Victoire ! Vous avez remporté le combat !';
      case 'defeat':
        return 'Défaite... Vos Pokémon sont tous KO.';
      case 'fled':
        return 'Vous avez pris la fuite !';
      case 'captured':
        return 'Pokémon capturé avec succès !';
      case 'draw':
        return 'Match nul !';
      default:
        return 'Combat terminé.';
    }
  }

  toggleBattleMenu() {
    console.log('📋 [BattleScene] Toggle menu de combat');
    this.addBattleLogMessage('Menu de combat en cours de développement...');
  }

  attemptExitBattle() {
    console.log('🚪 [BattleScene] Tentative de sortie de combat');
    
    if (this.battleManager && this.battleManager.isActive) {
      // Tenter de fuir
      const success = this.battleManager.attemptRun();
      if (!success) {
        this.addBattleLogMessage('Impossible de fuir !');
      }
    } else {
      // Fermer directement
      this.hideBattleInterface();
    }
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Lance un combat sauvage
   */
  startWildBattle(wildPokemon, location) {
    console.log('🐾 [BattleScene] Lancement combat sauvage:', wildPokemon);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller la scène si elle dort
    if (this.scene && !this.scene.isActive()) {
      this.scene.wake();
    }
  }

  /**
   * Ferme le combat et revient au jeu normal
   */
  endBattle() {
    console.log('🏁 [BattleScene] Fin de combat');
    
    this.hideBattleInterface();
    
    if (this.battleManager) {
      this.battleManager.endBattle();
    }
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // Reset de l'interface Phaser
    if (this.battleUI) {
      this.battleUI.reset();
    }
  }

  /**
   * Vérifie si le combat est actif
   */
  isBattleActive() {
    return this.isVisible && this.battleManager?.isActive;
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleScene] Destruction de la scène...');
    
    // Supprimer l'overlay DOM
    if (this.battleOverlay && this.battleOverlay.parentNode) {
      this.battleOverlay.parentNode.removeChild(this.battleOverlay);
      this.battleOverlay = null;
    }
    
    // Supprimer les styles CSS
    const styles = document.querySelector('#battle-overlay-80-styles');
    if (styles) {
      styles.remove();
    }
    
    // Nettoyer les managers
    if (this.battleUI) {
      this.battleUI.destroy();
      this.battleUI = null;
    }
    
    if (this.battleManager) {
      this.battleManager = null;
    }
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // Appeler le destroy parent
    super.destroy();
    
    console.log('✅ [BattleScene] Scène détruite');
  }
}
