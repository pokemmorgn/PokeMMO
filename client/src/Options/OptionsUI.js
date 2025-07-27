// Options/OptionsUI.js - Interface du menu d'options
// 🎛️ Menu d'options avec audio + langue + thème
// ⌨️ Ouverture/fermeture avec Échap

export class OptionsUI {
  constructor(optionsManager, options = {}) {
    this.optionsManager = optionsManager;
    this.options = {
      closeOnEscape: true,
      saveOnClose: true,
      ...options
    };
    
    // === ÉTAT UI ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    
    // === DONNÉES ===
    this.currentSettings = {
      audio: {
        musicVolume: 0.8,
        soundVolume: 0.8,
        muted: false
      },
      language: {
        mode: 'auto',
        selected: 'auto',
        detected: 'en',
        available: ['en', 'fr', 'es', 'de', 'it', 'pt']
      },
      display: {
        theme: 'dark'
      }
    };
    
    // === CALLBACKS ===
    this.onClose = options.onClose || (() => {});
    this.onSettingsApply = options.onSettingsApply || (() => {});
    this.onLanguageTest = options.onLanguageTest || (() => {});
    
    // === CONTRÔLES ===
    this.isDirty = false; // Paramètres modifiés
    this.controls = new Map(); // Références aux contrôles
    
    console.log('🎛️ [OptionsUI] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [OptionsUI] Initialisation...');
      
      this.addStyles();
      this.createInterface();
      this.setupEventListeners();
      
      console.log('✅ [OptionsUI] Interface prête');
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsUI] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 STYLES ===
  
  addStyles() {
    if (document.querySelector('#options-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'options-ui-styles';
    style.textContent = `
      /* ===== OPTIONS UI STYLES ===== */
      
      .options-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
        font-family: 'Segoe UI', 'Arial', sans-serif;
        color: white;
        opacity: 0;
        pointer-events: none;
      }
      
      .options-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      .options-container {
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: linear-gradient(145deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
        border: 3px solid #3b82f6;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 
          0 25px 80px rgba(0, 0, 0, 0.8),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 40px rgba(59, 130, 246, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .options-overlay.visible .options-container {
        transform: scale(1);
      }
      
      /* Header */
      .options-header {
        background: linear-gradient(145deg, #1e40af, #3b82f6);
        border-bottom: 3px solid #1e3a8a;
        padding: 20px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .options-title {
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 1px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .options-close-btn {
        background: linear-gradient(145deg, #dc2626, #b91c1c);
        border: 2px solid #ef4444;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 4px 12px rgba(220, 38, 38, 0.4),
          inset 0 2px 0 rgba(255, 255, 255, 0.3);
      }
      
      .options-close-btn:hover {
        background: linear-gradient(145deg, #ef4444, #dc2626);
        transform: scale(1.1);
      }
      
      /* Content */
      .options-content {
        padding: 25px;
        max-height: 50vh;
        overflow-y: auto;
        background: linear-gradient(145deg, #0f172a, #1e293b);
      }
      
      .options-section {
        margin-bottom: 30px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #60a5fa;
        margin: 0 0 15px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .setting-row:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .setting-label {
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .setting-description {
        font-size: 12px;
        color: #94a3b8;
        font-weight: normal;
      }
      
      .setting-control {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 200px;
      }
      
      /* Audio Controls */
      .volume-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 120px;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.2);
        outline: none;
        cursor: pointer;
      }
      
      .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(145deg, #3b82f6, #2563eb);
        border: 2px solid #60a5fa;
        cursor: pointer;
      }
      
      .volume-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(145deg, #3b82f6, #2563eb);
        border: 2px solid #60a5fa;
        cursor: pointer;
        border: none;
      }
      
      .volume-value {
        font-size: 12px;
        color: #94a3b8;
        font-family: 'Courier New', monospace;
        min-width: 30px;
        text-align: center;
      }
      
      .mute-toggle {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #6b7280;
        color: #9ca3af;
        width: 35px;
        height: 35px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .mute-toggle.muted {
        background: linear-gradient(145deg, #dc2626, #b91c1c);
        border-color: #ef4444;
        color: white;
      }
      
      .mute-toggle:hover {
        border-color: #9ca3af;
        transform: scale(1.05);
      }
      
      /* Language Controls */
      .language-mode-toggle {
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        border: 2px solid #4b5563;
        overflow: hidden;
      }
      
      .mode-option {
        padding: 8px 16px;
        background: transparent;
        border: none;
        color: #9ca3af;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
      }
      
      .mode-option.active {
        background: linear-gradient(145deg, #3b82f6, #2563eb);
        color: white;
      }
      
      .language-select {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #4b5563;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        min-width: 140px;
      }
      
      .language-select:focus {
        outline: none;
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
      }
      
      .language-select option {
        background: #1e293b;
        color: white;
      }
      
      .language-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .detected-language {
        font-size: 11px;
        color: #10b981;
        font-weight: 600;
        margin-left: 8px;
      }
      
      .test-language-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #6b7280;
        color: #9ca3af;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .test-language-btn:hover {
        border-color: #60a5fa;
        color: white;
        background: rgba(96, 165, 250, 0.2);
      }
      
      /* Theme Controls */
      .theme-select {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #4b5563;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        min-width: 120px;
      }
      
      .theme-select:focus {
        outline: none;
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
      }
      
      .theme-select option {
        background: #1e293b;
        color: white;
      }
      
      /* Footer */
      .options-footer {
        background: linear-gradient(145deg, #1e40af, #3b82f6);
        border-top: 2px solid #60a5fa;
        padding: 20px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
      }
      
      .footer-info {
        font-size: 11px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .dirty-indicator {
        color: #fbbf24;
        font-weight: 600;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      .footer-actions {
        display: flex;
        gap: 12px;
      }
      
      .options-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .btn-cancel {
        background: linear-gradient(145deg, #6b7280, #4b5563);
        color: #e5e7eb;
        border: 1px solid #9ca3af;
      }
      
      .btn-cancel:hover {
        background: linear-gradient(145deg, #9ca3af, #6b7280);
        transform: translateY(-1px);
      }
      
      .btn-reset {
        background: linear-gradient(145deg, #f59e0b, #d97706);
        color: white;
        border: 1px solid #fbbf24;
      }
      
      .btn-reset:hover {
        background: linear-gradient(145deg, #fbbf24, #f59e0b);
        transform: translateY(-1px);
      }
      
      .btn-save {
        background: linear-gradient(145deg, #10b981, #059669);
        color: white;
        border: 1px solid #34d399;
      }
      
      .btn-save:hover {
        background: linear-gradient(145deg, #34d399, #10b981);
        transform: translateY(-1px);
      }
      
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .options-container {
          width: 95%;
          margin: 10px;
        }
        
        .options-content {
          padding: 15px;
        }
        
        .setting-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        
        .setting-control {
          width: 100%;
          justify-content: flex-end;
        }
        
        .footer-actions {
          flex-direction: column;
          width: 100%;
        }
        
        .options-btn {
          width: 100%;
        }
      }
      
      /* Animations */
      @keyframes optionsSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .options-overlay.visible .options-container {
        animation: optionsSlideIn 0.3s ease-out;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [OptionsUI] Styles ajoutés');
  }
  
  // === 🏗️ CRÉATION INTERFACE ===
  
  createInterface() {
    // Supprimer overlay existant
    const existing = document.querySelector('#options-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'options-overlay';
    overlay.className = 'options-overlay';
    
    overlay.innerHTML = `
      <div class="options-container">
        <!-- Header -->
        <div class="options-header">
          <h2 class="options-title">
            ⚙️ Options
          </h2>
          <button class="options-close-btn" id="options-close">✕</button>
        </div>
        
        <!-- Content -->
        <div class="options-content">
          <!-- Audio Section -->
          <div class="options-section">
            <h3 class="section-title">🔊 Audio</h3>
            
            <div class="setting-row">
              <div class="setting-label">
                Volume Musique
                <span class="setting-description">Contrôle le volume de la musique de fond</span>
              </div>
              <div class="setting-control">
                <input type="range" class="volume-slider" id="music-volume" 
                       min="0" max="100" value="80" step="5">
                <span class="volume-value" id="music-volume-value">80%</span>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                Volume Sons
                <span class="setting-description">Contrôle le volume des effets sonores</span>
              </div>
              <div class="setting-control">
                <input type="range" class="volume-slider" id="sound-volume" 
                       min="0" max="100" value="80" step="5">
                <span class="volume-value" id="sound-volume-value">80%</span>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                Mode Silencieux
                <span class="setting-description">Couper tout l'audio</span>
              </div>
              <div class="setting-control">
                <button class="mute-toggle" id="mute-toggle" title="Activer/désactiver le son">
                  🔊
                </button>
              </div>
            </div>
          </div>
          
          <!-- Language Section -->
          <div class="options-section">
            <h3 class="section-title">🌍 Langue</h3>
            
            <div class="setting-row">
              <div class="setting-label">
                Mode de Langue
                <span class="setting-description">Automatique ou sélection manuelle</span>
              </div>
              <div class="setting-control">
                <div class="language-mode-toggle">
                  <button class="mode-option active" data-mode="auto">Auto</button>
                  <button class="mode-option" data-mode="manual">Manuel</button>
                </div>
                <span class="detected-language" id="detected-language">Détecté: Français</span>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">
                Langue Sélectionnée
                <span class="setting-description">Choisir la langue d'affichage</span>
              </div>
              <div class="setting-control">
                <select class="language-select" id="language-select" disabled>
                  <option value="auto">🌍 Automatique</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="pt">🇵🇹 Português</option>
                </select>
                <button class="test-language-btn" id="test-language">Test</button>
              </div>
            </div>
          </div>
          
          <!-- Display Section -->
          <div class="options-section">
            <h3 class="section-title">🎨 Affichage</h3>
            
            <div class="setting-row">
              <div class="setting-label">
                Thème
                <span class="setting-description">Style visuel de l'interface</span>
              </div>
              <div class="setting-control">
                <select class="theme-select" id="theme-select">
                  <option value="dark">🌙 Sombre</option>
                  <option value="light">☀️ Clair</option>
                  <option value="auto">🔄 Auto</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="options-footer">
          <div class="footer-info">
            <span id="save-status">💾 Sauvegardé automatiquement</span>
            <span class="dirty-indicator" id="dirty-indicator" style="display: none;">● Modifications non sauvegardées</span>
          </div>
          <div class="footer-actions">
            <button class="options-btn btn-cancel" id="btn-cancel">Annuler</button>
            <button class="options-btn btn-reset" id="btn-reset">Reset</button>
            <button class="options-btn btn-save" id="btn-save">Sauvegarder</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    // Stocker références contrôles
    this.controls.set('musicVolume', overlay.querySelector('#music-volume'));
    this.controls.set('soundVolume', overlay.querySelector('#sound-volume'));
    this.controls.set('muteToggle', overlay.querySelector('#mute-toggle'));
    this.controls.set('languageMode', overlay.querySelectorAll('.mode-option'));
    this.controls.set('languageSelect', overlay.querySelector('#language-select'));
    this.controls.set('themeSelect', overlay.querySelector('#theme-select'));
    
    console.log('🏗️ [OptionsUI] Interface créée');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Fermeture
    this.overlayElement.querySelector('#options-close').addEventListener('click', () => {
      this.hide();
    });
    
    this.overlayElement.querySelector('#btn-cancel').addEventListener('click', () => {
      this.cancelChanges();
    });
    
    // Sauvegarde
    this.overlayElement.querySelector('#btn-save').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Reset
    this.overlayElement.querySelector('#btn-reset').addEventListener('click', () => {
      this.resetToDefaults();
    });
    
    // Audio controls
    this.setupAudioControls();
    
    // Language controls
    this.setupLanguageControls();
    
    // Theme controls
    this.setupThemeControls();
    
    // Clavier
    this.setupKeyboardEvents();
    
    console.log('🎛️ [OptionsUI] Événements configurés');
  }
  
  setupAudioControls() {
    const musicSlider = this.controls.get('musicVolume');
    const soundSlider = this.controls.get('soundVolume');
    const muteToggle = this.controls.get('muteToggle');
    
    // Music volume
    musicSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.overlayElement.querySelector('#music-volume-value').textContent = `${value}%`;
      this.updateSetting(['audio', 'musicVolume'], value / 100);
    });
    
    // Sound volume
    soundSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.overlayElement.querySelector('#sound-volume-value').textContent = `${value}%`;
      this.updateSetting(['audio', 'soundVolume'], value / 100);
    });
    
    // Mute toggle
    muteToggle.addEventListener('click', () => {
      const currentMuted = this.currentSettings.audio.muted;
      const newMuted = !currentMuted;
      
      this.updateSetting(['audio', 'muted'], newMuted);
      this.updateMuteButton(newMuted);
    });
  }
  
  setupLanguageControls() {
    const modeButtons = this.controls.get('languageMode');
    const languageSelect = this.controls.get('languageSelect');
    const testButton = this.overlayElement.querySelector('#test-language');
    
    // Mode toggle
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        
        // Update UI
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Enable/disable select
        languageSelect.disabled = (mode === 'auto');
        
        this.updateSetting(['language', 'mode'], mode);
      });
    });
    
    // Language select
    languageSelect.addEventListener('change', (e) => {
      this.updateSetting(['language', 'selected'], e.target.value);
    });
    
    // Test button
    testButton.addEventListener('click', () => {
      const currentLang = languageSelect.value;
      this.onLanguageTest(currentLang);
    });
  }
  
  setupThemeControls() {
    const themeSelect = this.controls.get('themeSelect');
    
    themeSelect.addEventListener('change', (e) => {
      this.updateSetting(['display', 'theme'], e.target.value);
    });
  }
  
  setupKeyboardEvents() {
    if (!this.options.closeOnEscape) return;
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    });
  }
  
  // === 📊 GESTION PARAMÈTRES ===
  
  setCurrentSettings(settings) {
    this.currentSettings = { ...this.currentSettings, ...settings };
    this.updateUIFromSettings();
    this.isDirty = false;
    this.updateDirtyIndicator();
    
    console.log('📊 [OptionsUI] Paramètres mis à jour:', this.currentSettings);
  }
  
  updateUIFromSettings() {
    if (!this.overlayElement) return;
    
    // Audio
    const { audio, language, display } = this.currentSettings;
    
    this.controls.get('musicVolume').value = Math.round(audio.musicVolume * 100);
    this.overlayElement.querySelector('#music-volume-value').textContent = `${Math.round(audio.musicVolume * 100)}%`;
    
    this.controls.get('soundVolume').value = Math.round(audio.soundVolume * 100);
    this.overlayElement.querySelector('#sound-volume-value').textContent = `${Math.round(audio.soundVolume * 100)}%`;
    
    this.updateMuteButton(audio.muted);
    
    // Language
    const modeButtons = this.controls.get('languageMode');
    modeButtons.forEach(btn => {
      if (btn.dataset.mode === language.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    const languageSelect = this.controls.get('languageSelect');
    languageSelect.disabled = (language.mode === 'auto');
    languageSelect.value = language.mode === 'auto' ? 'auto' : language.selected;
    
    // Update detected language display
    const detectedDisplay = this.overlayElement.querySelector('#detected-language');
    const languageNames = {
      'en': 'English',
      'fr': 'Français',
      'es': 'Español',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português'
    };
    detectedDisplay.textContent = `Détecté: ${languageNames[language.detected] || language.detected}`;
    
    // Theme
    this.controls.get('themeSelect').value = display.theme;
  }
  
  updateSetting(path, value) {
    // Mise à jour profonde
    let current = this.currentSettings;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    this.isDirty = true;
    this.updateDirtyIndicator();
    
    console.log(`🔧 [OptionsUI] Paramètre modifié: ${path.join('.')} = ${value}`);
  }
  
  updateMuteButton(muted) {
    const muteToggle = this.controls.get('muteToggle');
    
    if (muted) {
      muteToggle.classList.add('muted');
      muteToggle.textContent = '🔇';
      muteToggle.title = 'Activer le son';
    } else {
      muteToggle.classList.remove('muted');
      muteToggle.textContent = '🔊';
      muteToggle.title = 'Désactiver le son';
    }
  }
  
  updateDirtyIndicator() {
    const indicator = this.overlayElement?.querySelector('#dirty-indicator');
    const saveBtn = this.overlayElement?.querySelector('#btn-save');
    
    if (indicator && saveBtn) {
      if (this.isDirty) {
        indicator.style.display = 'inline';
        saveBtn.disabled = false;
      } else {
        indicator.style.display = 'none';
        saveBtn.disabled = true;
      }
    }
  }
  
  // === 🎬 ACTIONS ===
  
  saveSettings() {
    console.log('💾 [OptionsUI] Sauvegarde paramètres...');
    
    this.onSettingsApply(this.currentSettings);
    this.isDirty = false;
    this.updateDirtyIndicator();
    
    // Feedback visuel
    const saveStatus = this.overlayElement.querySelector('#save-status');
    saveStatus.textContent = '✅ Paramètres sauvegardés !';
    saveStatus.style.color = '#10b981';
    
    setTimeout(() => {
      saveStatus.textContent = '💾 Sauvegardé automatiquement';
      saveStatus.style.color = '';
    }, 2000);
  }
  
  cancelChanges() {
    console.log('🚫 [OptionsUI] Annulation modifications...');
    
    // Recharger les paramètres depuis le manager
    if (this.optionsManager && this.optionsManager.getSettings) {
      const originalSettings = this.optionsManager.getSettings();
      this.setCurrentSettings(originalSettings);
    }
    
    this.hide();
  }
  
  resetToDefaults() {
    console.log('🔄 [OptionsUI] Reset paramètres par défaut...');
    
    const defaultSettings = {
      audio: {
        musicVolume: 0.8,
        soundVolume: 0.8,
        muted: false
      },
      language: {
        mode: 'auto',
        selected: 'auto',
        detected: this.currentSettings.language.detected,
        available: this.currentSettings.language.available
      },
      display: {
        theme: 'dark'
      }
    };
    
    this.setCurrentSettings(defaultSettings);
    this.isDirty = true;
    this.updateDirtyIndicator();
  }
  
  // === 🔧 CONTRÔLES UI ===
  
  show() {
    if (!this.isEnabled) return false;
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.add('visible');
    }
    
    console.log('✅ [OptionsUI] Interface affichée');
    return true;
  }
  
  hide() {
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
    }
    
    // Auto-save si activé
    if (this.options.saveOnClose && this.isDirty) {
      this.saveSettings();
    }
    
    this.onClose();
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
  
  // === 🔗 CONNEXIONS ===
  
  setManager(optionsManager) {
    this.optionsManager = optionsManager;
  }
  
  updateLanguageDisplay() {
    this.updateUIFromSettings();
  }
  
  updateAllDisplays() {
    this.updateUIFromSettings();
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsUI] Destruction...');
    
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.remove();
    }
    
    // Supprimer styles
    const styles = document.querySelector('#options-ui-styles');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.controls.clear();
    this.optionsManager = null;
    
    console.log('✅ [OptionsUI] Détruit');
  }
}

export default OptionsUI;
