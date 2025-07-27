// Options/OptionsIcon.js - Icône Options alignée sur QuestIcon/TeamIcon
// 🎯 MÊME ARCHITECTURE que les autres icônes
// 📍 POSITION: Haut-droite (vs bas-droite pour les autres)

export class OptionsIcon {
  constructor(optionsManager) {
    this.optionsManager = optionsManager;
    
    // === ÉTAT IDENTIQUE ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    // === CALLBACKS ===
    this.onClick = null;
    
    // === DONNÉES AFFICHÉES ===
    this.displayStats = {
      volume: 50,
      isMuted: false,
      currentLanguage: 'en',
      languageFlag: '🇺🇸'
    };
    
    // === CONFIGURATION UIMANAGER ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    console.log('⚙️ [OptionsIcon] Instance créée - Configuration UIManager uniforme');
  }
  
  // === 🚀 INITIALISATION IDENTIQUE ===
  
  init() {
    try {
      console.log('🚀 [OptionsIcon] Initialisation...');
      
      this.addStyles();
      this.createIcon();
      this.setupEventListeners();
      
      console.log('✅ [OptionsIcon] Initialisé - UIManager gérera la position');
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsIcon] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
    // Supprimer ancien
    const existing = document.querySelector('#options-icon');
    if (existing) existing.remove();
    
    const icon = document.createElement('div');
    icon.id = 'options-icon';
    icon.className = 'options-icon ui-icon'; // ✅ MÊME CLASSE que les autres
    
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">⚙️</span>
          <div class="options-info">
            <span class="volume-indicator">🔊</span>
            <span class="language-indicator">🇺🇸</span>
          </div>
        </div>
        <div class="icon-label">Options</div>
      </div>
      
      <div class="options-status">
        <div class="status-dot active"></div>
      </div>
      
      <div class="notification-badge" style="display: none;">
        <span class="notification-text">!</span>
      </div>
    `;
    
    // ✅ AUCUNE POSITION CSS - UIManager contrôle tout
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [OptionsIcon] Icône créée SANS positionnement manuel');
  }
  
  // === 🎨 STYLES ALIGNÉS AVEC LES AUTRES ===
  
  addStyles() {
    if (document.querySelector('#options-icon-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'options-icon-styles';
    style.textContent = `
      /* ===== OPTIONS ICON - MÊME PATTERN QUE LES AUTRES ===== */
      .options-icon {
        /* ✅ AUCUNE POSITION CSS - UIManager contrôle tout */
        width: 70px !important;
        height: 80px !important;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
        display: block;
        box-sizing: border-box;
      }

      .options-icon:hover {
        transform: scale(1.1);
      }

      /* Background principal - IDENTIQUE aux autres */
      .options-icon .icon-background {
        width: 100%;
        height: 70px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 2px solid #4a90e2;
        border-radius: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        position: relative;
        transition: all 0.3s ease;
        overflow: hidden;
      }

      .options-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }

      /* Contenu icône */
      .options-icon .icon-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .options-icon .icon-emoji {
        font-size: 22px;
        transition: transform 0.3s ease;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }

      .options-icon:hover .icon-emoji {
        transform: scale(1.2) rotate(30deg);
      }

      /* Indicateurs options */
      .options-icon .options-info {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        margin-top: 2px;
      }

      .options-icon .volume-indicator {
        font-size: 10px;
        transition: all 0.3s ease;
      }

      .options-icon .language-indicator {
        font-size: 9px;
        transition: all 0.3s ease;
      }

      .options-icon:hover .volume-indicator,
      .options-icon:hover .language-indicator {
        transform: scale(1.2);
      }

      /* Label - IDENTIQUE */
      .options-icon .icon-label {
        font-size: 11px;
        color: #87ceeb;
        font-weight: 600;
        text-align: center;
        padding: 4px 0;
        background: rgba(74, 144, 226, 0.2);
        width: 100%;
        border-radius: 0 0 13px 13px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      /* Status dot - IDENTIQUE */
      .options-icon .options-status {
        position: absolute;
        top: -3px;
        left: -3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .options-icon .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transition: background-color 0.3s ease;
      }

      .options-icon .status-dot.active {
        background: #4caf50;
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
      }

      .options-icon .status-dot.muted {
        background: #f44336;
        box-shadow: 0 0 6px rgba(244, 67, 54, 0.6);
        animation: mutedBlink 1.5s infinite;
      }

      .options-icon .status-dot.warning {
        background: #ff9800;
        animation: warningBlink 1.5s infinite;
      }

      /* Badge notification - IDENTIQUE */
      .options-icon .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        background: #ff4757;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        animation: pulse 2s infinite;
      }

      .options-icon .notification-text {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }

      /* ===== ANIMATIONS IDENTIQUES ===== */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      @keyframes mutedBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes warningBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .options-icon.options-updated .icon-emoji {
        animation: optionsBounce 0.6s ease;
      }

      @keyframes optionsBounce {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.3) rotate(15deg); }
        50% { transform: scale(1.1) rotate(-10deg); }
        75% { transform: scale(1.2) rotate(5deg); }
      }

      /* États UIManager - IDENTIQUES */
      .options-icon.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-20px);
      }

      .options-icon.ui-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(50%);
      }

      .options-icon.ui-disabled:hover {
        transform: none !important;
      }

      /* Animations */
      .options-icon.appearing {
        animation: iconAppear 0.5s ease;
      }

      @keyframes iconAppear {
        from {
          opacity: 0;
          transform: translateY(-50px) scale(0.5);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .options-icon.volume-changed .icon-background {
        animation: volumeFlash 0.8s ease;
      }

      @keyframes volumeFlash {
        0%, 100% { background: linear-gradient(145deg, #2a3f5f, #1e2d42); }
        50% { background: linear-gradient(145deg, #4a90e2, #357abd); }
      }

      .options-icon.language-changed .icon-background {
        animation: languageSwap 1s ease;
      }

      @keyframes languageSwap {
        0%, 100% { background: linear-gradient(145deg, #2a3f5f, #1e2d42); }
        50% { background: linear-gradient(145deg, #6a4c93, #5a3d7a); }
      }

      /* Responsive - IDENTIQUE */
      @media (max-width: 768px) {
        .options-icon {
          width: 60px !important;
          height: 70px !important;
        }
        
        .options-icon .icon-background {
          height: 60px;
        }
        
        .options-icon .icon-emoji {
          font-size: 20px;
        }
      }
      
      /* Indicateur UIManager */
      .options-icon[data-positioned-by="uimanager"]::after {
        content: "📍";
        position: absolute;
        top: -10px;
        left: -10px;
        font-size: 8px;
        opacity: 0.7;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [OptionsIcon] Styles appliqués');
  }
  
  // === 🎛️ ÉVÉNEMENTS IDENTIQUES ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isEnabled) {
        this.showDisabledMessage();
        return;
      }
      
      // Animation feedback
      this.iconElement.classList.add('options-updated');
      setTimeout(() => {
        this.iconElement.classList.remove('options-updated');
      }, 600);
      
      if (this.onClick) {
        this.onClick();
      }
      
      console.log('⚙️ [OptionsIcon] Clic traité');
    });
    
    // Tooltip
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
    console.log('🎛️ [OptionsIcon] Événements configurés');
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateStats(stats) {
    if (!stats || !this.iconElement) return;
    
    console.log('📊 [OptionsIcon] Mise à jour stats:', stats);
    
    this.displayStats = {
      volume: stats.volume || 50,
      isMuted: stats.isMuted || false,
      currentLanguage: stats.currentLanguage || 'en',
      languageFlag: stats.languageFlag || '🇺🇸'
    };
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.iconElement) return;
    
    const { volume, isMuted, languageFlag } = this.displayStats;
    
    // Indicateur volume
    const volumeElement = this.iconElement.querySelector('.volume-indicator');
    if (volumeElement) {
      if (isMuted) {
        volumeElement.textContent = '🔇';
      } else if (volume === 0) {
        volumeElement.textContent = '🔇';
      } else if (volume < 30) {
        volumeElement.textContent = '🔈';
      } else if (volume < 70) {
        volumeElement.textContent = '🔉';
      } else {
        volumeElement.textContent = '🔊';
      }
    }
    
    // Indicateur langue
    const languageElement = this.iconElement.querySelector('.language-indicator');
    if (languageElement) {
      languageElement.textContent = languageFlag;
    }
    
    // Status dot
    const statusDot = this.iconElement.querySelector('.status-dot');
    if (statusDot) {
      statusDot.classList.remove('active', 'muted', 'warning');
      
      if (isMuted) {
        statusDot.classList.add('muted');
      } else if (volume === 0) {
        statusDot.classList.add('warning');
      } else {
        statusDot.classList.add('active');
      }
    }
    
    console.log('📊 [OptionsIcon] Affichage mis à jour');
  }
  
  // === 🎛️ CONTRÔLES UI MANAGER - IDENTIQUES ===
  
  show() {
    console.log('👁️ [OptionsIcon] Affichage via UIManager');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('ui-hidden', 'hidden');
      this.iconElement.classList.add('ui-fade-in');
      
      // ✅ FORCER AFFICHAGE sans toucher à la position
      this.iconElement.style.display = 'block';
      this.iconElement.style.visibility = 'visible';
      this.iconElement.style.opacity = '1';
      
      setTimeout(() => {
        this.iconElement.classList.remove('ui-fade-in');
      }, 300);
    }
    
    return true;
  }
  
  hide() {
    console.log('👻 [OptionsIcon] Masquage');
    
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('ui-fade-out');
      
      setTimeout(() => {
        this.iconElement.classList.add('ui-hidden');
        this.iconElement.classList.remove('ui-fade-out');
      }, 200);
    }
    
    return true;
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [OptionsIcon] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('ui-disabled', 'disabled');
      } else {
        this.iconElement.classList.add('ui-disabled');
      }
    }
    
    return true;
  }
  
  // === 📍 MÉTHODES UIMANAGER IDENTIQUES ===
  
  onPositioned(position) {
    console.log('📍 [OptionsIcon] Position reçue de UIManager:', position);
    
    if (this.iconElement) {
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      this.iconElement.setAttribute('data-position', JSON.stringify(position));
      console.log('✅ [OptionsIcon] Position UIManager confirmée');
    }
  }
  
  isPositionedByUIManager() {
    return this.iconElement?.getAttribute('data-positioned-by') === 'uimanager';
  }
  
  getCurrentPosition() {
    if (!this.iconElement) return null;
    
    const positionData = this.iconElement.getAttribute('data-position');
    if (positionData) {
      try {
        return JSON.parse(positionData);
      } catch (error) {
        console.warn('⚠️ [OptionsIcon] Position data invalide');
      }
    }
    
    const computed = window.getComputedStyle(this.iconElement);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }
  
  // === 💬 TOOLTIP ===
  
  showTooltip() {
    const { volume, isMuted, currentLanguage } = this.displayStats;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'options-tooltip';
    
    const iconRect = this.iconElement.getBoundingClientRect();
    
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - iconRect.top + 10}px;
      right: ${window.innerWidth - iconRect.right}px;
      background: rgba(42, 63, 95, 0.95);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      border: 1px solid #4a90e2;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      white-space: nowrap;
      font-family: Arial, sans-serif;
    `;
    
    const volumeText = isMuted ? 'Muted' : `Volume: ${volume}%`;
    const languageInfo = this.optionsManager?.getLanguageInfo(currentLanguage);
    const languageText = languageInfo ? 
      `${languageInfo.flag} ${languageInfo.name}` : 
      `Language: ${currentLanguage}`;
    
    tooltip.innerHTML = `
      <div><strong>Options & Settings</strong></div>
      <div>🔊 ${volumeText}</div>
      <div>🌐 ${languageText}</div>
      <div style="opacity: 0.7; margin-top: 4px;">Click to configure</div>
    `;
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
    
    this.currentTooltip = tooltip;
  }
  
  hideTooltip() {
    if (this.currentTooltip && this.currentTooltip.parentNode) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }
  
  showDisabledMessage() {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Options disabled', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎭 ANIMATIONS SPÉCIFIQUES ===
  
  animateVolumeChange() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('volume-changed');
    setTimeout(() => {
      this.iconElement.classList.remove('volume-changed');
    }, 800);
    
    this.showNotification(true, '🔊');
    setTimeout(() => {
      this.showNotification(false);
    }, 1500);
  }
  
  animateLanguageChange() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('language-changed');
    setTimeout(() => {
      this.iconElement.classList.remove('language-changed');
    }, 1000);
    
    this.showNotification(true, '🌐');
    setTimeout(() => {
      this.showNotification(false);
    }, 2000);
  }
  
  animateSettingsUpdate() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('options-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('options-updated');
    }, 600);
  }
  
  showNotification(show = true, text = '!') {
    const badge = this.iconElement?.querySelector('.notification-badge');
    if (!badge) return;
    
    if (show) {
      badge.style.display = 'flex';
      badge.querySelector('.notification-text').textContent = text;
    } else {
      badge.style.display = 'none';
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsIcon] Destruction...');
    
    this.hideTooltip();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    this.iconElement = null;
    this.onClick = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [OptionsIcon] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.iconElement,
      elementInDOM: this.iconElement ? document.contains(this.iconElement) : false,
      displayStats: this.displayStats,
      hasOnClick: !!this.onClick,
      positioningMode: this.positioningMode,
      uiManagerControlled: this.uiManagerControlled,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      elementStyles: this.iconElement ? {
        position: this.iconElement.style.position,
        left: this.iconElement.style.left,
        top: this.iconElement.style.top,
        right: this.iconElement.style.right,
        bottom: this.iconElement.style.bottom,
        zIndex: this.iconElement.style.zIndex,
        display: this.iconElement.style.display,
        visibility: this.iconElement.style.visibility,
        opacity: this.iconElement.style.opacity
      } : null,
      boundingRect: this.iconElement ? this.iconElement.getBoundingClientRect() : null
    };
  }
}

export default OptionsIcon;

console.log(`
⚙️ === OPTIONS ICON - ALIGNÉ SUR LES AUTRES ===

✅ ARCHITECTURE IDENTIQUE:
• Même structure que QuestIcon/TeamIcon
• UIManager: positioningMode + uiManagerControlled
• Méthodes show/hide/setEnabled uniformes
• onPositioned() pour UIManager

🎨 DESIGN COHÉRENT:
• 70px × 80px (tailles identiques)
• Style background + hover identiques
• Status dot + notification badge
• Animations harmonisées

⚙️ SPÉCIFICITÉS OPTIONS:
• Icône ⚙️ avec rotation au hover
• Indicateurs: 🔊 volume + 🇺🇸 langue
• Status: active/muted/warning
• Animations: volume/language change

📍 POSITION UIMANAGER:
• Configuration anchor: 'top-right'
• Sera dans le groupe 'ui-options'
• UIManager contrôle 100% la position

🎯 FONCTIONNALITÉS:
• updateStats() avec volume + langue
• Tooltip avec infos complètes
• onClick pour ouvrir options UI
• Animations spécifiques options

✅ OPTIONS ICON 100% ALIGNÉ !
`);
