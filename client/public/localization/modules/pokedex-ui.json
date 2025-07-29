// Pokedex/PokedexIcon.js - STYLE HARMONISÉ avec Team/Quest + TRADUCTIONS TEMPS RÉEL
// 🎯 Design cohérent et moderne - même template que les autres icônes
// 🌐 Support complet des traductions temps réel

import { t } from '../managers/LocalizationManager.js';

export class PokedexIcon {
  constructor(pokedexUI, optionsManager = null) {
    this.pokedexUI = pokedexUI;
    this.optionsManager = optionsManager;  // ← NOUVEAU
    this.cleanupLanguageListener = null;   // ← NOUVEAU
    
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    this.onClick = null;
    
    this.displayData = {
      totalSeen: 0,
      totalCaught: 0,
      completionPercentage: 0,
      hasNotification: false,
      notificationCount: 0
    };
    
    this.positioningMode = 'uimanager';
    
    console.log('📱 [PokedexIcon] Instance créée (style harmonisé + traductions)');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [PokedexIcon] Initialisation style harmonisé...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      this.setupLanguageSupport();  // ← NOUVEAU
      this.show();
      
      console.log('✅ [PokedexIcon] Initialisé avec style cohérent + traductions');
      return this;
      
    } catch (error) {
      console.error('❌ [PokedexIcon] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🌐 SUPPORT LANGUE ===
  
  setupLanguageSupport() {
    if (this.optionsManager?.addLanguageListener) {
      this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
        console.log('🌐 [PokedexIcon] Changement de langue détecté');
        this.updateLanguage();
      });
      console.log('🔗 [PokedexIcon] Listener langue configuré');
    } else {
      console.warn('⚠️ [PokedexIcon] OptionsManager non disponible pour les traductions');
    }
    
    // Mise à jour initiale
    this.updateLanguage();
  }
  
  updateLanguage() {
    if (!this.iconElement) return;
    
    try {
      // Mettre à jour le label de l'icône
      const labelElement = this.iconElement.querySelector('.icon-label');
      if (labelElement) {
        labelElement.textContent = t('pokedex.label');
      }
      
      // Mettre à jour le tooltip (sera actualisé au prochain hover)
      // Le tooltip est généré dynamiquement dans showTooltip()
      
      console.log('🔄 [PokedexIcon] Langue mise à jour');
      
    } catch (error) {
      console.error('❌ [PokedexIcon] Erreur mise à jour langue:', error);
    }
  }
  
  // === 🎨 CRÉATION INTERFACE HARMONISÉE ===
  
  createIcon() {
    const existing = document.querySelector('#pokedex-icon');
    if (existing) {
      existing.remove();
    }
    
    const icon = document.createElement('div');
    icon.id = 'pokedex-icon';
    icon.className = 'pokedex-icon ui-icon';
    
    // === TEMPLATE COHÉRENT AVEC TEAM/QUEST ===
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">📱</span>
          <div class="pokedex-counter">
            <span class="completion-rate">0%</span>
          </div>
        </div>
        <div class="icon-label">${t('pokedex.label')}</div>
      </div>
      
      <div class="completion-status">
        <div class="status-dot inactive"></div>
      </div>
      
      <div class="notification-badge" style="display: none;">
        <span class="notification-text">!</span>
      </div>
    `;
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [PokedexIcon] Icône créée avec template harmonisé + traductions');
  }
  
  addStyles() {
    if (document.querySelector('#pokedex-icon-harmonized-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'pokedex-icon-harmonized-styles';
    style.textContent = `
      /* ===== POKÉDX ICON - STYLE HARMONISÉ ===== */
      .pokedex-icon {
        /* === MÊME TAILLE QUE TEAM/QUEST === */
        width: 70px !important;
        height: 80px !important;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
        position: fixed;
        display: block;
        box-sizing: border-box;
      }
      
      .pokedex-icon:hover {
        transform: scale(1.1);
      }
      
      /* === MÊME STYLE BACKGROUND QUE TEAM/QUEST === */
      .pokedex-icon .icon-background {
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
      
      .pokedex-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }
      
      /* === MÊME CONTENU QUE TEAM/QUEST === */
      .pokedex-icon .icon-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
      
      .pokedex-icon .icon-emoji {
        font-size: 20px;
        transition: transform 0.3s ease;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }
      
      .pokedex-icon:hover .icon-emoji {
        transform: scale(1.2);
      }
      
      /* === COMPTEUR COHÉRENT === */
      .pokedex-counter {
        display: flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        gap: 1px;
      }
      
      .completion-rate {
        color: #87ceeb;
        font-size: 13px;
        min-width: 16px;
        text-align: center;
      }
      
      /* === MÊME LABEL QUE TEAM/QUEST === */
      .pokedex-icon .icon-label {
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
      
      /* === MÊME STATUT QUE TEAM/QUEST === */
      .completion-status {
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
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transition: background-color 0.3s ease;
      }
      
      .status-dot.active {
        background: #4caf50;
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
      }
      
      .status-dot.inactive {
        background: #666;
        box-shadow: 0 0 6px rgba(102, 102, 102, 0.6);
      }
      
      .status-dot.discovering {
        background: #ff9800;
        box-shadow: 0 0 6px rgba(255, 152, 0, 0.6);
        animation: discoveryBlink 1.5s infinite;
      }
      
      .status-dot.completed {
        background: #2196f3;
        box-shadow: 0 0 6px rgba(33, 150, 243, 0.6);
        animation: completedBlink 1.5s infinite;
      }
      
      /* === MÊME NOTIFICATION QUE TEAM/QUEST === */
      .notification-badge {
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
      
      .notification-text {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }
      
      /* === MÊMES ANIMATIONS === */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      @keyframes discoveryBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes completedBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      /* === ANIMATIONS CONTEXTUELLES === */
      .pokedex-icon.pokemon-discovered .icon-emoji {
        animation: discoveryBounce 0.6s ease;
      }
      
      @keyframes discoveryBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.3) rotate(-5deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(1.2) rotate(-2deg); }
      }
      
      .pokedex-icon.pokemon-caught .icon-emoji {
        animation: captureBounce 0.8s ease;
      }
      
      @keyframes captureBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.4) rotate(-10deg); }
        50% { transform: scale(1.2) rotate(10deg); }
        75% { transform: scale(1.3) rotate(-5deg); }
      }
      
      .pokedex-icon.milestone-reached {
        animation: milestoneGlow 1s ease;
      }
      
      @keyframes milestoneGlow {
        0%, 100% { 
          transform: scale(1);
          filter: none;
        }
        50% { 
          transform: scale(1.15);
          filter: brightness(1.4) saturate(1.4);
        }
      }
      
      /* === MÊMES ÉTATS QUE TEAM/QUEST === */
      .pokedex-icon.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }
      
      .pokedex-icon.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(50%);
      }
      
      .pokedex-icon.disabled:hover {
        transform: none !important;
      }
      
      .pokedex-icon.appearing {
        animation: iconAppear 0.5s ease;
      }
      
      @keyframes iconAppear {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.5);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      /* === RESPONSIVE COHÉRENT === */
      @media (max-width: 768px) {
        .pokedex-icon {
          width: 60px !important;
          height: 70px !important;
        }
        
        .pokedex-icon .icon-background {
          height: 60px;
        }
        
        .pokedex-icon .icon-emoji {
          font-size: 18px;
        }
        
        .completion-rate {
          font-size: 11px;
        }
        
        .pokedex-icon .icon-label {
          font-size: 10px;
        }
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .pokedex-icon {
          width: 65px !important;
          height: 75px !important;
        }
        
        .pokedex-icon .icon-background {
          height: 65px;
        }
        
        .pokedex-icon .icon-emoji {
          font-size: 19px;
        }
        
        .completion-rate {
          font-size: 12px;
        }
      }
      
      /* === INDICATEUR UIMANAGER === */
      .pokedex-icon[data-positioned-by="uimanager"] {
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .pokedex-icon[data-positioned-by="uimanager"]::before {
        content: "📍";
        position: absolute;
        top: -2px;
        right: -2px;
        font-size: 8px;
        opacity: 0.5;
        z-index: 1000;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [PokedexIcon] Styles harmonisés appliqués');
  }
  
  // === 🎛️ ÉVÉNEMENTS (IDENTIQUES) ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isEnabled) {
        this.showDisabledMessage();
        return;
      }
      
      this.iconElement.classList.add('pokemon-discovered');
      setTimeout(() => {
        this.iconElement.classList.remove('pokemon-discovered');
      }, 600);
      
      if (this.onClick) {
        this.onClick();
      }
      
      console.log('📱 [PokedexIcon] Clic détecté');
    });
    
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
          console.log('🎛️ [PokedexIcon] Événements configurés');
  }
  
  // === 📊 MISE À JOUR DONNÉES SIMPLIFIÉE ===
  
  updateProgress(data) {
    if (!this.iconElement) return;
    
    console.log('📊 [PokedxIcon] Mise à jour progression:', data);
    
    const { totalSeen = 0, totalCaught = 0, caughtPercentage = 0 } = data;
    
    this.displayData.totalSeen = totalSeen;
    this.displayData.totalCaught = totalCaught;
    this.displayData.completionPercentage = Math.round(caughtPercentage);
    
    // Mettre à jour l'affichage du pourcentage
    const completionRate = this.iconElement.querySelector('.completion-rate');
    if (completionRate) {
      completionRate.textContent = `${this.displayData.completionPercentage}%`;
    }
    
    // Mettre à jour le statut
    const statusDot = this.iconElement.querySelector('.status-dot');
    if (statusDot) {
      statusDot.classList.remove('active', 'inactive', 'discovering', 'completed');
      
      if (this.displayData.completionPercentage >= 100) {
        statusDot.classList.add('completed');
      } else if (this.displayData.completionPercentage >= 50) {
        statusDot.classList.add('active');
      } else if (totalSeen > 0) {
        statusDot.classList.add('discovering');
      } else {
        statusDot.classList.add('inactive');
      }
    }
    
    // Animation de mise à jour
    this.iconElement.classList.add('pokemon-discovered');
    setTimeout(() => {
      this.iconElement.classList.remove('pokemon-discovered');
    }, 600);
    
    console.log(`📊 [PokedexIcon] Progression: ${totalCaught}/${totalSeen} (${this.displayData.completionPercentage}%)`);
  }
  
  updateNotification(show = true, count = 0) {
    if (!this.iconElement) return;
    
    this.displayData.hasNotification = show;
    this.displayData.notificationCount = count;
    
    const notification = this.iconElement.querySelector('.notification-badge');
    const countElement = this.iconElement.querySelector('.notification-text');
    
    if (show && count > 0) {
      notification.style.display = 'flex';
      countElement.textContent = count > 9 ? '9+' : count.toString();
    } else if (show) {
      notification.style.display = 'flex';
      countElement.textContent = '!';
    } else {
      notification.style.display = 'none';
    }
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER (IDENTIQUES) ===
  
  show() {
    console.log('👁️ [PokedexIcon] Affichage (harmonisé)');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('hidden');
      this.iconElement.classList.add('appearing');
      
      this.iconElement.style.display = 'block';
      this.iconElement.style.visibility = 'visible';
      this.iconElement.style.opacity = '1';
      
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      
      setTimeout(() => {
        this.iconElement.classList.remove('appearing');
      }, 500);
    }
    
    return true;
  }
  
  hide() {
    console.log('👻 [PokedexIcon] Masquage');
    
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('hidden');
      this.iconElement.removeAttribute('data-positioned-by');
    }
    
    return true;
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [PokedexIcon] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('disabled');
      } else {
        this.iconElement.classList.add('disabled');
      }
    }
    
    return true;
  }
  
  // === 💬 TOOLTIP COHÉRENT AVEC TRADUCTIONS ===
  
  showTooltip() {
    const { totalSeen, totalCaught, completionPercentage } = this.displayData;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'pokedx-tooltip';
    
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
    
    // ✅ UTILISER LES TRADUCTIONS DANS LE TOOLTIP
    tooltip.innerHTML = `
      <div><strong>${t('pokedex.tooltip_title')}: ${completionPercentage}%</strong></div>
      <div>${t('pokedex.ui.progress.seen')}: ${totalSeen} | ${t('pokedex.ui.progress.caught')}: ${totalCaught}</div>
      <div style="opacity: 0.7; margin-top: 4px;">${t('pokedex.tooltip_action')}</div>
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
      window.showGameNotification(t('pokedex.disabled_message'), 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎭 ANIMATIONS SIMPLIFIÉES ===
  
  animateNewDiscovery() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('pokemon-discovered');
    setTimeout(() => {
      this.iconElement.classList.remove('pokemon-discovered');
    }, 600);
    
    this.updateNotification(true, '+');
    setTimeout(() => {
      this.updateNotification(false);
    }, 2000);
  }
  
  animateCapture() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('pokemon-caught');
    setTimeout(() => {
      this.iconElement.classList.remove('pokemon-caught');
    }, 800);
  }
  
  animateMilestone(percentage) {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('milestone-reached');
    setTimeout(() => {
      this.iconElement.classList.remove('milestone-reached');
    }, 1000);
    
    const completionRate = this.iconElement.querySelector('.completion-rate');
    if (completionRate) {
      const originalText = completionRate.textContent;
      completionRate.textContent = `${percentage}%!`;
      completionRate.style.color = '#fbbf24';
      
      setTimeout(() => {
        completionRate.textContent = originalText;
        completionRate.style.color = '';
      }, 1500);
    }
  }
  
  // === 📍 MÉTHODES UIMANAGER ===
  
  onPositioned(position) {
    console.log('📍 [PokedexIcon] Position reçue:', position);
    
    if (this.iconElement) {
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      this.iconElement.setAttribute('data-position', JSON.stringify(position));
      
      this.iconElement.style.transform = 'scale(1.05)';
      setTimeout(() => {
        this.iconElement.style.transform = '';
      }, 200);
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
        console.warn('⚠️ [PokedexIcon] Position data invalide');
      }
    }
    
    const computed = window.getComputedStyle(this.iconElement);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [PokedexIcon] Destruction...');
    
    // ✅ NETTOYER LISTENER LANGUE
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
      console.log('🌐 [PokedexIcon] Listener langue nettoyé');
    }
    
    this.hideTooltip();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    this.iconElement = null;
    this.onClick = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.optionsManager = null;  // ← NOUVEAU
    
    console.log('✅ [PokedexIcon] Détruit avec nettoyage traductions');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.iconElement,
      elementInDOM: this.iconElement ? document.contains(this.iconElement) : false,
      displayData: this.displayData,
      hasOnClick: !!this.onClick,
      positioningMode: this.positioningMode,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      styleHarmonized: true,
      version: 'harmonized-2024',
      // ✅ NOUVELLES INFOS DEBUG TRADUCTIONS
      hasOptionsManager: !!this.optionsManager,
      hasLanguageListener: !!this.cleanupLanguageListener,
      currentLanguage: this.optionsManager ? 
        (typeof window.GetPlayerCurrentLanguage === 'function' ? window.GetPlayerCurrentLanguage() : 'unknown') : 
        'no-options-manager',
      translationsSupported: true
    };
  }
}

export default PokedexIcon;

console.log(`
📱 === POKÉDEX ICON HARMONISÉ + TRADUCTIONS ===

🎯 STYLE COHÉRENT:
✅ Même taille que Team/Quest (70x80)
✅ Même background et bordures
✅ Même emoji + compteur simple
✅ Même couleurs et dégradés
✅ Même label et positionnement

🌐 TRADUCTIONS TEMPS RÉEL:
✅ Import t() depuis LocalizationManager
✅ Support optionsManager dans constructeur
✅ setupLanguageSupport() pour écouter changements
✅ updateLanguage() pour mettre à jour textes
✅ Nettoyage automatique du listener
✅ Tooltip avec traductions

🔄 CHANGEMENTS APPLIQUÉS:
• Suppression écran LCD complexe
• Suppression boutons colorés
• Suppression anneau de progression
• Suppression design "Game Boy"
• Template uniforme avec autres icônes
• Support complet traductions temps réel

📊 AFFICHAGE SIMPLIFIÉ:
• Emoji 📱 (moderne et clair)
• Pourcentage de complétion (0-100%)
• Statut dot (inactive/discovering/active/completed)
• Tooltip informatif cohérent AVEC TRADUCTIONS

🎨 MÊME DESIGN QUE TEAM/QUEST:
• Background bleu dégradé identique
• Bordures et ombres identiques
• Animations et transitions identiques
• États hover/disabled identiques
• Responsive breakpoints identiques

🌐 TRADUCTIONS SUPPORTÉES:
• Label icône: t('pokedex.label')
• Tooltip titre: t('pokedex.tooltip_title')
• Progress labels: t('pokedex.ui.progress.seen/caught')
• Action: t('pokedex.tooltip_action')
• Message désactivé: t('pokedex.disabled_message')

✅ POKÉDEX MAINTENANT COHÉRENT + MULTILINGUE !
`);
