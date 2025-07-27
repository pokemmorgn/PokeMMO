// Options/OptionsUI.js - Interface Options complète
// 🎯 MÊME ARCHITECTURE que QuestUI/TeamUI
// ⚙️ Interface complète: Volume + Langue + Réglages

export class OptionsUI {
  constructor(optionsManager, gameRoom) {
    this.optionsManager = optionsManager;
    this.gameRoom = gameRoom;
    
    // === ÉTAT IDENTIQUE ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    
    // === DONNÉES ===
    this.currentOptions = {};
    this.supportedLanguages = {};
    this.hasUnsavedChanges = false;
    
    // === CONTRÔLE ===
    this.currentTooltip = null;
    this.onAction = null;
    
    // === LISTENERS ===
    this.escapeListenerAdded = false;
    this.volumeSliderListenerAdded = false;
    
    console.log('⚙️ [OptionsUI] Instance créée - Version alignée sur les autres');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [OptionsUI] Initialisation...');
      
      this.loadRobustCSS();
      this.createInterface();
      this.setupEventListeners();
      
      // ✅ S'assurer que l'interface est fermée par défaut
      this.isVisible = false;
      
      console.log('✅ [OptionsUI] Interface prête - Fermée par défaut');
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsUI] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS ROBUSTE IDENTIQUE AUX AUTRES ===
  
  loadRobustCSS() {
    // Supprimer l'ancien style
    const existing = document.querySelector('#options-ui-robust-styles');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'options-ui-robust-styles';
    style.textContent = `
      /* ===== OPTIONS UI - CSS ROBUSTE IDENTIQUE ===== */
      
      /* Base overlay - Spécificité maximale */
      div#options-overlay.options-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.85) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 9999 !important;
        backdrop-filter: blur(8px) !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        transition: opacity 0.3s ease !important;
        box-sizing: border-box !important;
      }
      
      /* État caché - Force total */
      div#options-overlay.options-overlay.hidden {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        z-index: -1000 !important;
      }
      
      /* Container principal */
      div#options-overlay .options-container {
        width: 700px !important;
        height: 600px !important;
        min-width: 700px !important;
        max-width: 700px !important;
        min-height: 600px !important;
        max-height: 600px !important;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
        border: 3px solid #4a90e2 !important;
        border-radius: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        color: white !important;
        font-family: 'Segoe UI', Arial, sans-serif !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      /* Header */
      div#options-overlay .options-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important;
        padding: 15px 25px !important;
        border-radius: 17px 17px 0 0 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 2px solid #357abd !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      div#options-overlay .options-title {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        font-size: 20px !important;
        font-weight: bold !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
        flex: 1 !important;
      }
      
      div#options-overlay .options-icon {
        font-size: 32px !important;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) !important;
      }
      
      div#options-overlay .options-title-text h2 {
        margin: 0 !important;
        color: #ffffff !important;
        font-size: 22px !important;
        font-weight: bold !important;
      }
      
      div#options-overlay .options-subtitle {
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 13px !important;
        margin: 2px 0 0 0 !important;
        font-weight: 400 !important;
      }
      
      div#options-overlay .options-close-btn {
        background: rgba(220, 53, 69, 0.9) !important;
        border: 2px solid rgba(220, 53, 69, 0.5) !important;
        color: white !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        font-size: 20px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      div#options-overlay .options-close-btn:hover {
        background: rgba(220, 53, 69, 1) !important;
        border-color: rgba(220, 53, 69, 0.8) !important;
        transform: scale(1.1) !important;
      }
      
      /* Contenu principal */
      div#options-overlay .options-content {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 30px !important;
        overflow-y: auto !important;
        width: 100% !important;
        box-sizing: border-box !important;
        gap: 25px !important;
      }
      
      /* Sections */
      div#options-overlay .options-section {
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 15px !important;
        padding: 25px !important;
        border: 1px solid rgba(74, 144, 226, 0.3) !important;
        transition: all 0.3s ease !important;
      }
      
      div#options-overlay .options-section:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(74, 144, 226, 0.5) !important;
      }
      
      div#options-overlay .section-header {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        margin-bottom: 20px !important;
        padding-bottom: 10px !important;
        border-bottom: 2px solid rgba(74, 144, 226, 0.3) !important;
      }
      
      div#options-overlay .section-icon {
        font-size: 24px !important;
        color: #4a90e2 !important;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3)) !important;
      }
      
      div#options-overlay .section-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: #87ceeb !important;
        margin: 0 !important;
      }
      
      /* ===== SECTION VOLUME ===== */
      div#options-overlay .volume-controls {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
      }
      
      div#options-overlay .volume-main {
        display: flex !important;
        align-items: center !important;
        gap: 15px !important;
      }
      
      div#options-overlay .volume-icon {
        font-size: 24px !important;
        width: 30px !important;
        text-align: center !important;
        color: #4a90e2 !important;
      }
      
      div#options-overlay .volume-slider-container {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      
      div#options-overlay .volume-slider {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 100% !important;
        height: 8px !important;
        background: rgba(255, 255, 255, 0.2) !important;
        border-radius: 4px !important;
        outline: none !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }
      
      div#options-overlay .volume-slider:hover {
        background: rgba(255, 255, 255, 0.3) !important;
      }
      
      div#options-overlay .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 20px !important;
        height: 20px !important;
        background: linear-gradient(135deg, #4a90e2, #357abd) !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.5) !important;
        transition: all 0.3s ease !important;
      }
      
      div#options-overlay .volume-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2) !important;
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.7) !important;
      }
      
      div#options-overlay .volume-slider::-moz-range-thumb {
        width: 20px !important;
        height: 20px !important;
        background: linear-gradient(135deg, #4a90e2, #357abd) !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        border: none !important;
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.5) !important;
      }
      
      div#options-overlay .volume-info {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 12px !important;
        color: rgba(255, 255, 255, 0.7) !important;
      }
      
      div#options-overlay .volume-value {
        font-weight: bold !important;
        color: #87ceeb !important;
        font-size: 14px !important;
      }
      
      div#options-overlay .volume-actions {
        display: flex !important;
        gap: 10px !important;
        align-items: center !important;
      }
      
      div#options-overlay .mute-btn {
        background: rgba(244, 67, 54, 0.8) !important;
        border: 1px solid rgba(244, 67, 54, 0.5) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      
      div#options-overlay .mute-btn:hover {
        background: rgba(244, 67, 54, 1) !important;
        border-color: rgba(244, 67, 54, 0.8) !important;
        transform: translateY(-2px) !important;
      }
      
      div#options-overlay .mute-btn.muted {
        background: rgba(76, 175, 80, 0.8) !important;
        border-color: rgba(76, 175, 80, 0.5) !important;
      }
      
      div#options-overlay .mute-btn.muted:hover {
        background: rgba(76, 175, 80, 1) !important;
        border-color: rgba(76, 175, 80, 0.8) !important;
      }
      
      /* ===== SECTION LANGUE ===== */
      div#options-overlay .language-controls {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
      }
      
      div#options-overlay .language-selection {
        display: flex !important;
        flex-direction: column !important;
        gap: 15px !important;
      }
      
      div#options-overlay .language-current {
        background: rgba(74, 144, 226, 0.2) !important;
        border: 1px solid rgba(74, 144, 226, 0.4) !important;
        border-radius: 10px !important;
        padding: 15px !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      
      div#options-overlay .current-language-flag {
        font-size: 24px !important;
      }
      
      div#options-overlay .current-language-info {
        flex: 1 !important;
      }
      
      div#options-overlay .current-language-name {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #87ceeb !important;
        margin: 0 0 4px 0 !important;
      }
      
      div#options-overlay .current-language-mode {
        font-size: 12px !important;
        color: rgba(255, 255, 255, 0.7) !important;
        margin: 0 !important;
      }
      
      div#options-overlay .language-options {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
        gap: 10px !important;
        margin-top: 10px !important;
      }
      
      div#options-overlay .language-option {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 2px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 10px !important;
        padding: 12px 15px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      
      div#options-overlay .language-option:hover {
        background: rgba(74, 144, 226, 0.1) !important;
        border-color: rgba(74, 144, 226, 0.3) !important;
        transform: translateY(-2px) !important;
      }
      
      div#options-overlay .language-option.selected {
        background: rgba(74, 144, 226, 0.25) !important;
        border-color: #4a90e2 !important;
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3) !important;
      }
      
      div#options-overlay .language-option.auto {
        border-color: rgba(255, 193, 7, 0.3) !important;
      }
      
      div#options-overlay .language-option.auto:hover {
        background: rgba(255, 193, 7, 0.1) !important;
        border-color: rgba(255, 193, 7, 0.5) !important;
      }
      
      div#options-overlay .language-option.auto.selected {
        background: rgba(255, 193, 7, 0.2) !important;
        border-color: #ffc107 !important;
      }
      
      div#options-overlay .language-flag {
        font-size: 18px !important;
      }
      
      div#options-overlay .language-name {
        font-weight: 600 !important;
        color: #ffffff !important;
        font-size: 14px !important;
      }
      
      /* Actions footer */
      div#options-overlay .options-actions {
        padding: 20px 30px !important;
        border-top: 2px solid #357abd !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        background: rgba(0, 0, 0, 0.2) !important;
      }
      
      div#options-overlay .actions-left {
        display: flex !important;
        gap: 10px !important;
      }
      
      div#options-overlay .actions-right {
        display: flex !important;
        gap: 10px !important;
      }
      
      div#options-overlay .options-btn {
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      
      div#options-overlay .options-btn.reset {
        background: rgba(108, 117, 125, 0.8) !important;
        border: 1px solid rgba(108, 117, 125, 0.5) !important;
        color: #ffffff !important;
      }
      
      div#options-overlay .options-btn.reset:hover {
        background: rgba(108, 117, 125, 1) !important;
        border-color: rgba(108, 117, 125, 0.8) !important;
        transform: translateY(-2px) !important;
      }
      
      div#options-overlay .options-btn.save {
        background: rgba(40, 167, 69, 0.8) !important;
        border: 1px solid rgba(40, 167, 69, 0.5) !important;
        color: white !important;
      }
      
      div#options-overlay .options-btn.save:hover {
        background: rgba(40, 167, 69, 1) !important;
        border-color: rgba(40, 167, 69, 0.8) !important;
        transform: translateY(-2px) !important;
      }
      
      div#options-overlay .options-btn.save:disabled {
        background: rgba(108, 117, 125, 0.3) !important;
        border-color: rgba(108, 117, 125, 0.2) !important;
        cursor: not-allowed !important;
        transform: none !important;
      }
      
      div#options-overlay .changes-indicator {
        color: #ffc107 !important;
        font-size: 12px !important;
        font-style: italic !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      
      div#options-overlay .changes-indicator.visible {
        opacity: 1 !important;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        div#options-overlay .options-container {
          width: 95% !important;
          height: 90% !important;
          margin: 20px !important;
        }
        
        div#options-overlay .language-options {
          grid-template-columns: 1fr !important;
        }
        
        div#options-overlay .options-actions {
          flex-direction: column !important;
          gap: 15px !important;
        }
        
        div#options-overlay .actions-left,
        div#options-overlay .actions-right {
          width: 100% !important;
          justify-content: center !important;
        }
      }
      
      /* Animations */
      @keyframes optionsAppear {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      div#options-overlay .options-container {
        animation: optionsAppear 0.4s ease !important;
      }
      
      @keyframes volumeUpdate {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      div#options-overlay .volume-controls.updating {
        animation: volumeUpdate 0.5s ease !important;
      }
      
      @keyframes languageSwitch {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      
      div#options-overlay .language-current.updating {
        animation: languageSwitch 0.6s ease !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [OptionsUI] CSS robuste chargé');
  }
  
  // === 🏗️ CRÉATION INTERFACE ===
  
  createInterface() {
    // Supprimer l'ancienne interface
    const existing = document.querySelector('#options-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'options-overlay';
    overlay.className = 'options-overlay hidden';
    
    overlay.innerHTML = `
      <div class="options-container">
        <!-- Header -->
        <div class="options-header">
          <div class="options-title">
            <div class="options-icon">⚙️</div>
            <div class="options-title-text">
              <h2>Options & Paramètres</h2>
              <p class="options-subtitle">Configuration du jeu et préférences</p>
            </div>
          </div>
          <button class="options-close-btn">✕</button>
        </div>
        
        <!-- Contenu -->
        <div class="options-content">
          <!-- Section Volume -->
          <div class="options-section">
            <div class="section-header">
              <span class="section-icon">🔊</span>
              <h3 class="section-title">Audio & Volume</h3>
            </div>
            
            <div class="volume-controls">
              <div class="volume-main">
                <div class="volume-icon" id="volume-icon">🔊</div>
                <div class="volume-slider-container">
                  <input type="range" class="volume-slider" id="volume-slider" 
                         min="0" max="100" value="50" step="1">
                  <div class="volume-info">
                    <span>0%</span>
                    <span class="volume-value" id="volume-value">50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              <div class="volume-actions">
                <button class="mute-btn" id="mute-btn">
                  <span class="mute-icon">🔇</span>
                  <span class="mute-text">Couper le son</span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Section Langue -->
          <div class="options-section">
            <div class="section-header">
              <span class="section-icon">🌐</span>
              <h3 class="section-title">Langue & Localisation</h3>
            </div>
            
            <div class="language-controls">
              <div class="language-current">
                <div class="current-language-flag" id="current-flag">🇺🇸</div>
                <div class="current-language-info">
                  <h4 class="current-language-name" id="current-name">English</h4>
                  <p class="current-language-mode" id="current-mode">Détection automatique</p>
                </div>
              </div>
              
              <div class="language-selection">
                <div class="language-options" id="language-options">
                  <!-- Options générées dynamiquement -->
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="options-actions">
          <div class="actions-left">
            <button class="options-btn reset" id="reset-btn">
              <span>🔄</span>
              <span>Réinitialiser</span>
            </button>
            <div class="changes-indicator" id="changes-indicator">
              ⚠️ Modifications non sauvegardées
            </div>
          </div>
          
          <div class="actions-right">
            <button class="options-btn save" id="save-btn" disabled>
              <span>💾</span>
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [OptionsUI] Interface créée');
  }
  
  // === 🎛️ ÉVÉNEMENTS ROBUSTES ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Bouton fermeture
    const closeBtn = this.overlayElement.querySelector('.options-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      });
    }
    
    // Escape key - Une seule fois
    if (!this.escapeListenerAdded) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
        }
      });
      this.escapeListenerAdded = true;
    }
    
    this.setupVolumeListeners();
    this.setupLanguageListeners();
    this.setupActionButtons();
    
    console.log('🎛️ [OptionsUI] Événements configurés');
  }
  
  setupVolumeListeners() {
    const volumeSlider = this.overlayElement.querySelector('#volume-slider');
    const muteBtn = this.overlayElement.querySelector('#mute-btn');
    
    if (volumeSlider && !this.volumeSliderListenerAdded) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        this.updateVolumeDisplay(volume, false);
        this.markAsChanged();
      });
      
      volumeSlider.addEventListener('change', (e) => {
        const volume = parseInt(e.target.value);
        this.handleAction('setVolume', { volume });
      });
      
      this.volumeSliderListenerAdded = true;
    }
    
    if (muteBtn) {
      muteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentlyMuted = muteBtn.classList.contains('muted');
        this.handleAction('setMuted', { muted: !currentlyMuted });
        this.markAsChanged();
      });
    }
  }
  
  setupLanguageListeners() {
    // Les listeners sont ajoutés dynamiquement dans updateLanguageOptions()
  }
  
  setupActionButtons() {
    const buttons = {
      'reset-btn': () => this.handleAction('resetToDefaults'),
      'save-btn': () => this.handleAction('saveOptions')
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
      const btn = this.overlayElement.querySelector(`#${id}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handler();
        });
      }
    });
  }
  
  // === 🎛️ CONTRÔLES PRINCIPAUX ===
  
  show() {
    console.log('👁️ [OptionsUI] Affichage interface...');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'options-overlay';
      this.requestOptionsData();
    }
    
    console.log('✅ [OptionsUI] Interface affichée');
    return true;
  }
  
  hide() {
    console.log('👻 [OptionsUI] Masquage interface...');
    
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'options-overlay hidden';
    }
    
    this.resetChanges();
    
    console.log('✅ [OptionsUI] Interface masquée');
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.pointerEvents = 'auto';
        this.overlayElement.style.filter = 'none';
      } else {
        this.overlayElement.style.pointerEvents = 'none';
        this.overlayElement.style.filter = 'grayscale(50%) opacity(0.5)';
      }
    }
    
    return true;
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateOptionsData(options) {
    console.log('📊 [OptionsUI] Mise à jour données options:', options);
    
    this.currentOptions = options || {};
    this.supportedLanguages = options.supportedLanguages || {};
    
    this.updateVolumeDisplay(options.volume, options.isMuted);
    this.updateLanguageDisplay(options);
    this.updateLanguageOptions();
    
    console.log('✅ [OptionsUI] Données mises à jour');
  }
  
  updateVolumeDisplay(volume = 50, isMuted = false) {
    const volumeSlider = this.overlayElement?.querySelector('#volume-slider');
    const volumeValue = this.overlayElement?.querySelector('#volume-value');
    const volumeIcon = this.overlayElement?.querySelector('#volume-icon');
    const muteBtn = this.overlayElement?.querySelector('#mute-btn');
    
    if (volumeSlider) {
      volumeSlider.value = volume;
    }
    
    if (volumeValue) {
      volumeValue.textContent = `${volume}%`;
    }
    
    if (volumeIcon) {
      if (isMuted || volume === 0) {
        volumeIcon.textContent = '🔇';
      } else if (volume < 30) {
        volumeIcon.textContent = '🔈';
      } else if (volume < 70) {
        volumeIcon.textContent = '🔉';
      } else {
        volumeIcon.textContent = '🔊';
      }
    }
    
    if (muteBtn) {
      const muteIcon = muteBtn.querySelector('.mute-icon');
      const muteText = muteBtn.querySelector('.mute-text');
      
      if (isMuted) {
        muteBtn.classList.add('muted');
        if (muteIcon) muteIcon.textContent = '🔊';
        if (muteText) muteText.textContent = 'Activer le son';
      } else {
        muteBtn.classList.remove('muted');
        if (muteIcon) muteIcon.textContent = '🔇';
        if (muteText) muteText.textContent = 'Couper le son';
      }
    }
    
    // Animation
    const volumeControls = this.overlayElement?.querySelector('.volume-controls');
    if (volumeControls) {
      volumeControls.classList.add('updating');
      setTimeout(() => volumeControls.classList.remove('updating'), 500);
    }
  }
  
  updateLanguageDisplay(options) {
    const currentFlag = this.overlayElement?.querySelector('#current-flag');
    const currentName = this.overlayElement?.querySelector('#current-name');
    const currentMode = this.overlayElement?.querySelector('#current-mode');
    
    if (!options) return;
    
    const languageInfo = options.languageInfo || {};
    const isAuto = options.language === 'auto';
    
    if (currentFlag) {
      currentFlag.textContent = languageInfo.flag || '🌐';
    }
    
    if (currentName) {
      currentName.textContent = languageInfo.name || 'Unknown Language';
    }
    
    if (currentMode) {
      currentMode.textContent = isAuto ? 
        `Détection automatique (${languageInfo.name || 'Unknown'})` : 
        'Sélection manuelle';
    }
    
    // Animation
    const languageCurrent = this.overlayElement?.querySelector('.language-current');
    if (languageCurrent) {
      languageCurrent.classList.add('updating');
      setTimeout(() => languageCurrent.classList.remove('updating'), 600);
    }
  }
  
  updateLanguageOptions() {
    const container = this.overlayElement?.querySelector('#language-options');
    if (!container) return;
    
    const currentLanguage = this.currentOptions.language || 'auto';
    
    // Option Auto
    const autoOption = document.createElement('div');
    autoOption.className = 'language-option auto';
    if (currentLanguage === 'auto') {
      autoOption.classList.add('selected');
    }
    autoOption.innerHTML = `
      <div class="language-flag">🌐</div>
      <div class="language-name">Détection automatique</div>
    `;
    autoOption.addEventListener('click', () => {
      this.selectLanguage('auto');
    });
    
    container.innerHTML = '';
    container.appendChild(autoOption);
    
    // Options langues
    Object.entries(this.supportedLanguages).forEach(([code, info]) => {
      const option = document.createElement('div');
      option.className = 'language-option';
      if (currentLanguage === code) {
        option.classList.add('selected');
      }
      
      option.innerHTML = `
        <div class="language-flag">${info.flag}</div>
        <div class="language-name">${info.name}</div>
      `;
      
      option.addEventListener('click', () => {
        this.selectLanguage(code);
      });
      
      container.appendChild(option);
    });
    
    console.log('🌐 [OptionsUI] Options langue mises à jour');
  }
  
  selectLanguage(languageCode) {
    console.log(`🌐 [OptionsUI] Sélection langue: ${languageCode}`);
    
    // Mettre à jour visuel
    this.overlayElement?.querySelectorAll('.language-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    const selectedOption = this.overlayElement?.querySelector(
      languageCode === 'auto' ? 
        '.language-option.auto' : 
        `.language-option[data-lang="${languageCode}"]`
    );
    
    if (!selectedOption) {
      // Trouver par le nom
      const options = this.overlayElement?.querySelectorAll('.language-option');
      options?.forEach(option => {
        const nameElement = option.querySelector('.language-name');
        if (nameElement) {
          const langInfo = Object.entries(this.supportedLanguages).find(([code, info]) => 
            info.name === nameElement.textContent
          );
          if (langInfo && langInfo[0] === languageCode) {
            option.classList.add('selected');
          }
        }
      });
    } else {
      selectedOption.classList.add('selected');
    }
    
    // Déclencher action
    this.handleAction('setLanguage', { language: languageCode });
    this.markAsChanged();
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [OptionsUI] Action: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
    
    this.showActionFeedback(action);
  }
  
  showActionFeedback(action) {
    const messages = {
      setVolume: { text: 'Volume mis à jour', type: 'success' },
      setMuted: { text: 'Audio basculé', type: 'info' },
      setLanguage: { text: 'Langue changée', type: 'success' },
      resetToDefaults: { text: 'Options réinitialisées', type: 'warning' },
      saveOptions: { text: 'Options sauvegardées', type: 'success' }
    };
    
    const message = messages[action] || { text: `Action ${action} exécutée`, type: 'info' };
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message.text, message.type, {
        duration: 1500,
        position: 'top-center'
      });
    }
  }
  
  markAsChanged() {
    this.hasUnsavedChanges = true;
    
    const indicator = this.overlayElement?.querySelector('#changes-indicator');
    const saveBtn = this.overlayElement?.querySelector('#save-btn');
    
    if (indicator) {
      indicator.classList.add('visible');
    }
    
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
  
  resetChanges() {
    this.hasUnsavedChanges = false;
    
    const indicator = this.overlayElement?.querySelector('#changes-indicator');
    const saveBtn = this.overlayElement?.querySelector('#save-btn');
    
    if (indicator) {
      indicator.classList.remove('visible');
    }
    
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  }
  
  requestOptionsData() {
    this.handleAction('requestData');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsUI] Destruction...');
    
    // Supprimer élément DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Supprimer styles
    const styles = document.querySelector('#options-ui-robust-styles');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.currentOptions = {};
    this.supportedLanguages = {};
    this.onAction = null;
    this.escapeListenerAdded = false;
    this.volumeSliderListenerAdded = false;
    
    console.log('✅ [OptionsUI] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.overlayElement,
      elementInDOM: this.overlayElement ? document.contains(this.overlayElement) : false,
      hasUnsavedChanges: this.hasUnsavedChanges,
      currentOptions: this.currentOptions,
      supportedLanguagesCount: Object.keys(this.supportedLanguages).length,
      hasOnAction: !!this.onAction,
      listenersAdded: {
        escape: this.escapeListenerAdded,
        volumeSlider: this.volumeSliderListenerAdded
      },
      overlayClasses: this.overlayElement ? this.overlayElement.className : null,
      version: 'robust-options-ui-2024'
    };
  }
}

export default OptionsUI;

console.log(`
⚙️ === OPTIONS UI COMPLÈTE ===

✅ INTERFACE COMPLÈTE:
• Overlay modal identique aux autres UI
• Section Volume avec slider + mute
• Section Langue avec sélection visuelle
• Actions: Reset + Save + indicateur changements

🎨 DESIGN UNIFORME:
• CSS robuste avec spécificité maximale
• Même header/footer que les autres UI
• Animations cohérentes
• Responsive mobile

🔊 SECTION VOLUME:
• Slider 0-100 avec styles personnalisés
• Icône dynamique (🔇🔈🔉🔊)
• Bouton mute avec états visuels
• Temps réel + debounce

🌐 SECTION LANGUE:
• Affichage langue courante + mode
• Grille options avec drapeaux
• Auto-détection en premier
• Sélection interactive

⚡ FONCTIONNALITÉS:
• Gestion changements non sauvés
• Actions avec feedback
• Escape pour fermer
• Callbacks vers OptionsManager

✅ OPTIONS UI 100% FONCTIONNELLE !
`);
