// Quest/QuestIcon.js - VERSION AVEC LOCALIZATIONMANAGER
// 🎯 Icône quest simple et efficace + Traductions temps réel via LocalizationManager

import { t } from '../managers/LocalizationManager.js';

export class QuestIcon {
  constructor(questManager, optionsManager = null) {
    this.questManager = questManager;
    this.optionsManager = optionsManager; // 🔥 Pour écouter changements langue
    
    // === ÉTAT SIMPLE ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    this.onClick = null;
    
    // === DONNÉES AFFICHÉES ===
    this.displayStats = {
      questCount: 0,
      newQuests: 0,
      readyToComplete: 0,
      hasActiveQuests: false
    };
    
    // 🔥 Cleanup function pour event dispatcher
    this.cleanupLanguageListener = null;
    
    console.log('📖 [QuestIcon] Instance créée avec LocalizationManager');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestIcon] Initialisation...');
      
      this.addStyles();
      this.createIcon();
      this.setupEventListeners();
      
      // 🔥 Setup Event Dispatcher pour langue
      this.setupLanguageListener();
      
      // 🔥 Appliquer langue initiale
      this.updateLanguageTexts();
      
      this.forceDisplay();
      
      console.log('✅ [QuestIcon] Initialisé avec support multilingue');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestIcon] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🌐 GESTION LANGUE ===
  
  /**
   * Setup du listener pour changements de langue
   */
  setupLanguageListener() {
    if (!this.optionsManager || typeof this.optionsManager.addLanguageListener !== 'function') {
      console.warn('⚠️ [QuestIcon] OptionsManager non disponible pour traductions');
      return;
    }
    
    // 🔥 S'abonner aux changements de langue
    this.cleanupLanguageListener = this.optionsManager.addLanguageListener((newLang, oldLang) => {
      console.log(`🌐 [QuestIcon] Changement langue: ${oldLang} → ${newLang}`);
      this.updateLanguageTexts();
    });
    
    console.log('📡 [QuestIcon] Listener langue configuré');
  }
  
  /**
   * Mettre à jour tous les textes traduits
   */
  updateLanguageTexts() {
    if (!this.iconElement) return;
    
    console.log(`🔄 [QuestIcon] Mise à jour textes`);
    
    try {
      // 1. Label principal
      const labelElement = this.iconElement.querySelector('.icon-label');
      if (labelElement) {
        labelElement.textContent = t('quest.label');
        
        // 🔥 Animation optionnelle lors du changement
        labelElement.classList.add('language-updating');
        setTimeout(() => {
          labelElement.classList.remove('language-updating');
        }, 400);
      }
      
      // 2. Tooltip sera mis à jour lors du prochain hover
      // (on ne peut pas mettre à jour un tooltip invisible)
      
      console.log(`✅ [QuestIcon] Textes mis à jour`);
      
    } catch (error) {
      console.error('❌ [QuestIcon] Erreur mise à jour langue:', error);
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
    // Supprimer ancien
    const existing = document.querySelector('#quest-icon');
    if (existing) existing.remove();
    
    const icon = document.createElement('div');
    icon.id = 'quest-icon';
    icon.className = 'quest-icon ui-icon';
    
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">📖</span>
          <div class="quest-counter">
            <span class="quest-count">0</span>
          </div>
        </div>
        <div class="icon-label">${t('quest.label')}</div>
      </div>
      
      
      <div class="notification-badge" style="display: none;">
        <span class="notification-text">!</span>
      </div>
    `;
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [QuestIcon] Icône créée avec textes traduits');
  }
  
  forceDisplay() {
      // ✅ NOUVEAU : Vérifier si on est en battle
      if (window.pokemonUISystem?.currentGameState === 'battle' || 
          window.uiManager?.currentGameState === 'battle') {
        console.log('🥊 [QuestIcon] Mode battle détecté - pas de forceDisplay');
        return; // Ne rien faire en battle
      }
    if (!this.iconElement) return;
    
    // ✅ Styles essentiels pour visibilité (OK)
    this.iconElement.style.display = 'block';
    this.iconElement.style.visibility = 'visible';
    this.iconElement.style.opacity = '1';
    this.iconElement.style.pointerEvents = 'auto';
    this.iconElement.style.zIndex = '1000';
    
    // 🔥 FIX PRINCIPAL: Respecter la position UIManager
    const positionedBy = this.iconElement.getAttribute('data-positioned-by');
    
    if (positionedBy && (positionedBy.includes('uimanager') || positionedBy.includes('manual-fix'))) {
      console.log('✅ [QuestIcon] Position UIManager respectée - pas d\'écrasement');
      // Ne pas toucher à la position !
      return;
    }
    
    // ✅ Position de secours UNIQUEMENT si aucune position n'existe
    if (!this.iconElement.style.left && !this.iconElement.style.right) {
      console.log('⚠️ [QuestIcon] Position de secours appliquée');
      this.iconElement.style.position = 'fixed';
      this.iconElement.style.right = '20px';
      this.iconElement.style.bottom = '20px';
    } else {
      console.log('ℹ️ [QuestIcon] Position existante conservée');
    }
    
    console.log('✅ [QuestIcon] forceDisplay() sans écrasement position');
  }
  
  // === 🎨 STYLES OPTIMISÉS ===
  
  addStyles() {
    if (document.querySelector('#quest-icon-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-icon-styles';
    style.textContent = `
      /* ===== QUEST ICON STYLES OPTIMISÉS ===== */
      #quest-icon.quest-icon {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 65px !important;
        height: 75px !important;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
        user-select: none;
        /* ✅ FIX: NE PAS forcer position - laisser UIManager gérer */
      }
      
      #quest-icon.quest-icon:hover {
        transform: scale(1.1);
      }
      
      /* Background principal */
      #quest-icon .icon-background {
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
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      #quest-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }
      
      /* Contenu icône */
      #quest-icon .icon-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
      
      #quest-icon .icon-emoji {
        font-size: 22px;
        transition: transform 0.3s ease;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }
      
      #quest-icon:hover .icon-emoji {
        transform: scale(1.2);
      }
      
      /* Compteur */
      #quest-icon .quest-counter {
        display: flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      #quest-icon .quest-count {
        color: #87ceeb;
        font-size: 13px;
        min-width: 16px;
        text-align: center;
      }
      
      /* Label */
      #quest-icon .icon-label {
        font-size: 11px;
        color: #87ceeb;
        font-weight: 600;
        text-align: center;
        padding: 4px 0;
        background: rgba(74, 144, 226, 0.2);
        width: 100%;
        border-radius: 0 0 13px 13px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease; /* 🔥 Smooth transitions pour changements langue */
      }
      
      /* 🔥 Animation changement langue */
      #quest-icon .icon-label.language-updating {
        animation: languageUpdate 0.4s ease;
      }
      
      @keyframes languageUpdate {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      /* Statut */
      #quest-icon .quest-status {
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
      
      #quest-icon .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transition: background-color 0.3s ease;
      }
      
      #quest-icon .status-dot.active {
        background: #4caf50;
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
      }
      
      #quest-icon .status-dot.inactive {
        background: #666;
      }
      
      #quest-icon .status-dot.new-quest {
        background: #ff9800;
        animation: newQuestBlink 1.5s infinite;
      }
      
      #quest-icon .status-dot.ready-complete {
        background: #2196f3;
        animation: readyBlink 1.5s infinite;
      }
      
      /* Badge notification */
      #quest-icon .notification-badge {
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
      
      #quest-icon .notification-text {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }
      
      /* Animations essentielles */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      @keyframes newQuestBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes readyBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      #quest-icon.quest-updated .icon-emoji {
        animation: questBounce 0.6s ease;
      }
      
      @keyframes questBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      
      /* États */
      #quest-icon.disabled {
        opacity: 0.5 !important;
        cursor: not-allowed;
      }
      
      #quest-icon.has-active-quests .icon-background {
        animation: activeQuestsGlow 3s ease infinite;
      }
      
      @keyframes activeQuestsGlow {
        0%, 100% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); }
        50% { box-shadow: 0 4px 25px rgba(74, 144, 226, 0.6); }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        #quest-icon {
          width: 60px !important;
          height: 70px !important;
        }
        
        #quest-icon .icon-background {
          height: 60px;
        }
        
        #quest-icon .icon-emoji {
          font-size: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [QuestIcon] Styles optimisés ajoutés');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
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
      this.iconElement.classList.add('quest-updated');
      setTimeout(() => {
        this.iconElement.classList.remove('quest-updated');
      }, 600);
      
      if (this.onClick) {
        this.onClick();
      }
      
      console.log('📖 [QuestIcon] Clic traité');
    });
    
    // Tooltip simple
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
    console.log('🎛️ [QuestIcon] Événements configurés');
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateStats(stats) {
    if (!stats || !this.iconElement) return;
    
    this.displayStats = {
      questCount: stats.totalActive || 0,
      newQuests: stats.newQuests || 0,
      readyToComplete: stats.readyToComplete || 0,
      hasActiveQuests: (stats.totalActive || 0) > 0
    };
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.iconElement) return;
    
    const { questCount, newQuests, readyToComplete, hasActiveQuests } = this.displayStats;
    
    // Compteur
    const countElement = this.iconElement.querySelector('.quest-count');
    if (countElement) {
      countElement.textContent = questCount;
    }
    
    // Status dot
    const statusDot = this.iconElement.querySelector('.status-dot');
    if (statusDot) {
      statusDot.classList.remove('active', 'inactive', 'new-quest', 'ready-complete');
      
      if (newQuests > 0) {
        statusDot.classList.add('new-quest');
      } else if (readyToComplete > 0) {
        statusDot.classList.add('ready-complete');
      } else if (hasActiveQuests) {
        statusDot.classList.add('active');
      } else {
        statusDot.classList.add('inactive');
      }
    }
    
    // État global
    this.iconElement.classList.toggle('has-active-quests', hasActiveQuests);
    
    console.log('📊 [QuestIcon] Affichage mis à jour');
  }
  
  // === 🎛️ CONTRÔLES UI ===
  
  show() {
    this.isVisible = true;
    this.forceDisplay();
    return true;
  }
  
  hide() {
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('hidden');
    }
    
    return true;
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('disabled');
        this.forceDisplay();
      } else {
        this.iconElement.classList.add('disabled');
      }
    }
    
    return true;
  }
  
  // === 💬 TOOLTIP TRADUIT ===
  
  showTooltip() {
    const { questCount, newQuests, readyToComplete, hasActiveQuests } = this.displayStats;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'quest-tooltip';
    
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
      z-index: 1001;
      border: 1px solid #4a90e2;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      white-space: nowrap;
      font-family: Arial, sans-serif;
    `;
    
    // 🔥 Textes traduits via LocalizationManager
    let statusText = hasActiveQuests ? t('quest.tooltip_status_active') : t('quest.tooltip_status_none');
    if (newQuests > 0) {
      statusText = `${newQuests} ${t('quest.tooltip_status_new')}`;
    } else if (readyToComplete > 0) {
      statusText = `${readyToComplete} ${t('quest.tooltip_status_ready')}`;
    }
    
    tooltip.innerHTML = `
      <div><strong>${t('quest.tooltip_title')}: ${questCount}</strong></div>
      <div>${statusText}</div>
      <div style="opacity: 0.7; margin-top: 4px;">${t('quest.tooltip_action')}</div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Auto-suppression
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
      // 🔥 Message traduit via LocalizationManager
      const message = t('quest.disabled_message');
      
      window.showGameNotification(message, 'warning', {
        duration: 2000
      });
    }
  }
  
  // === 🎭 ANIMATIONS ===
  
  animateNewQuest() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('quest-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('quest-updated');
    }, 600);
    
    this.showNotification(true, '+');
    setTimeout(() => {
      this.showNotification(false);
    }, 2000);
  }
  
  animateQuestCompleted() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('quest-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('quest-updated');
    }, 600);
    
    this.showNotification(true, '✓');
    setTimeout(() => {
      this.showNotification(false);
    }, 1500);
  }
  
  animateQuestProgress() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('quest-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('quest-updated');
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
  
  // === 📍 MÉTHODES UIMANAGER AMÉLIORÉES ===
  
  onPositioned(position) {
    console.log('📍 [QuestIcon] Position reçue de UIManager:', position);
    
    if (this.iconElement) {
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      
      // ✅ DEBUG: Vérifier la position appliquée
      const rect = this.iconElement.getBoundingClientRect();
      console.log(`📐 [QuestIcon] Position finale: x=${rect.left}, y=${rect.top}, right=${rect.right}, bottom=${rect.bottom}`);
      
      // ✅ S'assurer que les styles de position forcée sont supprimés
      if (this.iconElement.style.position === 'fixed' && 
          this.iconElement.style.right === '20px' && 
          this.iconElement.style.bottom === '20px') {
        console.log('🔧 [QuestIcon] Suppression position de secours au profit de UIManager');
        this.iconElement.style.position = '';
        this.iconElement.style.right = '';
        this.iconElement.style.bottom = '';
      }
    }
  }
  
  // === 🐛 DEBUG - Méthode pour vérifier le positionnement ===
  
  debugPosition() {
    if (!this.iconElement) {
      console.log('❌ [QuestIcon] Pas d\'élément pour debug');
      return;
    }
    
    const rect = this.iconElement.getBoundingClientRect();
    const styles = window.getComputedStyle(this.iconElement);
    
    console.log('🔍 [QuestIcon] Debug position:', {
      positionedBy: this.iconElement.getAttribute('data-positioned-by'),
      boundingRect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      computedStyles: {
        position: styles.position,
        left: styles.left,
        right: styles.right,
        top: styles.top,
        bottom: styles.bottom,
        zIndex: styles.zIndex
      },
      inlineStyles: {
        position: this.iconElement.style.position,
        left: this.iconElement.style.left,
        right: this.iconElement.style.right,
        top: this.iconElement.style.top,
        bottom: this.iconElement.style.bottom
      }
    });
  }
  
  // === 🌐 DEBUG TRADUCTIONS ===
  
  debugTranslations() {
    console.log('🌐 [QuestIcon] Debug traductions:', {
      hasOptionsManager: !!this.optionsManager,
      hasLanguageListener: !!this.cleanupLanguageListener,
      sampleTexts: {
        label: t('quest.label'),
        tooltip_title: t('quest.tooltip_title'),
        tooltip_action: t('quest.tooltip_action'),
        disabled_message: t('quest.disabled_message')
      }
    });
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestIcon] Destruction...');
    
    // 🔥 Cleanup Event Dispatcher
    if (this.cleanupLanguageListener) {
      console.log('🧹 [QuestIcon] Suppression listener langue');
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    this.hideTooltip();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    // Reset références
    this.iconElement = null;
    this.onClick = null;
    this.optionsManager = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [QuestIcon] Détruit avec cleanup complet');
  }
}

export default QuestIcon;
