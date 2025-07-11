// Team/TeamIcon.js - Icône Team Optimisée pour UIManager
// 🎯 Crée l'élément DOM, UIManager gère le positionnement automatique
// 📍 Aucun positionnement manuel - 100% compatible UIManager

export class TeamIcon {
  constructor(teamManager) {
    this.teamManager = teamManager;
    
    // === ÉTAT ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    // === CALLBACKS ===
    this.onClick = null; // Appelé au clic (défini par TeamModule)
    
    // === DONNÉES AFFICHÉES ===
    this.displayStats = {
      teamCount: 0,
      aliveCount: 0,
      canBattle: false
    };
    
    // === IMPORTANT: POSITIONNEMENT GÉRÉ PAR UIMANAGER ===
    this.positioningMode = 'uimanager'; // Signale que UIManager gère la position
    
    console.log('🎯 [TeamIcon] Instance créée (positionnement géré par UIManager)');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [TeamIcon] Initialisation sans positionnement manuel...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      
      // === PAS DE POSITIONNEMENT MANUEL ===
      // UIManager s'occupera du positionnement via registerIconPosition()
      
      console.log('✅ [TeamIcon] Initialisé (position sera gérée par UIManager)');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamIcon] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
    // Supprimer l'ancien s'il existe
    const existing = document.querySelector('#team-icon');
    if (existing) {
      existing.remove();
    }
    
    const icon = document.createElement('div');
    icon.id = 'team-icon';
    icon.className = 'team-icon ui-icon';
    
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">⚔️</span>
          <div class="team-counter">
            <span class="team-count">0</span>
            <span class="team-separator">/</span>
            <span class="team-max">6</span>
          </div>
        </div>
        <div class="icon-label">Team</div>
      </div>
      
      <div class="battle-status">
        <div class="status-dot ready"></div>
      </div>
      
      <div class="notification-badge" style="display: none;">
        <span class="notification-text">!</span>
      </div>
    `;
    
    // === IMPORTANT: PAS DE POSITIONNEMENT INITIAL ===
    // On ne définit PAS position, right, bottom, etc.
    // UIManager s'en chargera via registerIconPosition()
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [TeamIcon] Icône créée SANS positionnement (UIManager prendra le relais)');
  }
  
  addStyles() {
    if (document.querySelector('#team-icon-styles')) {
      return; // Styles déjà chargés
    }
    
    const style = document.createElement('style');
    style.id = 'team-icon-styles';
    style.textContent = `
      /* ===== TEAM ICON STYLES (OPTIMISÉS UIMANAGER) ===== */
      .team-icon {
        /* === AUCUN POSITIONNEMENT FIXE ===
         * UIManager gérera position, left, top automatiquement
         * Via registerIconPosition() et positionIcon()
         */
        width: 70px;
        height: 80px;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
        
        /* Style de base pour UIManager */
        display: block;
        box-sizing: border-box;
        
        /* Flexibilité pour positionnement dynamique */
        position: fixed; /* UIManager modifiera left/top */
        
        /* ✅ PRÊT POUR UIMANAGER */
      }
      
      .team-icon:hover {
        transform: scale(1.1);
      }
      
      /* Background principal - thème bleu harmonisé */
      .team-icon .icon-background {
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
      
      .team-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }
      
      /* Contenu de l'icône */
      .team-icon .icon-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
      
      .team-icon .icon-emoji {
        font-size: 20px;
        transition: transform 0.3s ease;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }
      
      .team-icon:hover .icon-emoji {
        transform: scale(1.2);
      }
      
      /* Compteur d'équipe */
      .team-counter {
        display: flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        gap: 1px;
      }
      
      .team-count {
        color: #87ceeb;
        font-size: 13px;
      }
      
      .team-separator {
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
      }
      
      .team-max {
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
      }
      
      /* Label */
      .team-icon .icon-label {
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
      
      /* Statut de combat */
      .battle-status {
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
      
      .status-dot.ready {
        background: #4caf50;
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
      }
      
      .status-dot.not-ready {
        background: #f44336;
        box-shadow: 0 0 6px rgba(244, 67, 54, 0.6);
      }
      
      .status-dot.warning {
        background: #f39c12;
        box-shadow: 0 0 6px rgba(243, 156, 18, 0.6);
        animation: warningBlink 1.5s infinite;
      }
      
      /* Badge de notification */
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
      
      /* ===== ANIMATIONS ===== */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      @keyframes warningBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Team updated animation */
      .team-icon.team-updated .icon-emoji {
        animation: teamBounce 0.6s ease;
      }
      
      @keyframes teamBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.3) rotate(-5deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(1.2) rotate(-2deg); }
      }
      
      /* États du module */
      .team-icon.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }
      
      .team-icon.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(50%);
      }
      
      .team-icon.disabled:hover {
        transform: none !important;
      }
      
      /* Apparition */
      .team-icon.appearing {
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
      
      /* Équipe pleine */
      .team-icon.team-full .icon-background {
        animation: teamFullGlow 1s ease;
      }
      
      @keyframes teamFullGlow {
        0%, 100% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); }
        50% { box-shadow: 0 4px 25px rgba(74, 144, 226, 0.8); }
      }
      
      /* Pokémon KO */
      .team-icon.pokemon-fainted .icon-background {
        animation: faintedFlash 0.8s ease;
      }
      
      @keyframes faintedFlash {
        0%, 100% { background: linear-gradient(145deg, #2a3f5f, #1e2d42); }
        50% { background: linear-gradient(145deg, #9c27b0, #7b1fa2); }
      }
      
      /* ===== RESPONSIVE (TAILLES SEULEMENT) ===== */
      /* UIManager gérera les positions selon breakpoints */
      @media (max-width: 768px) {
        .team-icon {
          width: 60px;
          height: 70px;
        }
        
        .team-icon .icon-background {
          height: 60px;
        }
        
        .team-icon .icon-emoji {
          font-size: 18px;
        }
        
        .team-counter {
          font-size: 10px;
        }
        
        .team-count {
          font-size: 11px;
        }
        
        .team-icon .icon-label {
          font-size: 10px;
        }
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .team-icon {
          width: 65px;
          height: 75px;
        }
        
        .team-icon .icon-background {
          height: 65px;
        }
        
        .team-icon .icon-emoji {
          font-size: 19px;
        }
        
        .team-counter {
          font-size: 11px;
        }
        
        .team-count {
          font-size: 12px;
        }
      }
      
      /* ===== INDICATEUR UIMANAGER ===== */
      .team-icon[data-positioned-by="uimanager"] {
        /* Indicateur visuel que l'icône est gérée par UIManager */
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .team-icon[data-positioned-by="uimanager"]::before {
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
    console.log('🎨 [TeamIcon] Styles ajoutés (optimisés pour UIManager)');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    // Clic principal
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isEnabled) {
        this.showDisabledMessage();
        return;
      }
      
      // Animation de clic
      this.iconElement.classList.add('team-updated');
      setTimeout(() => {
        this.iconElement.classList.remove('team-updated');
      }, 600);
      
      // Appeler le callback
      if (this.onClick) {
        this.onClick();
      }
      
      console.log('🎯 [TeamIcon] Clic détecté');
    });
    
    // Survol
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
    console.log('🎛️ [TeamIcon] Événements configurés');
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateStats(stats) {
    if (!stats || !this.iconElement) return;
    
    console.log('📊 [TeamIcon] Mise à jour stats:', stats);
    
    // Sauvegarder les nouvelles stats
    this.displayStats = {
      teamCount: stats.totalPokemon || 0,
      aliveCount: stats.alivePokemon || 0,
      canBattle: stats.canBattle || false
    };
    
    // Mettre à jour l'affichage
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.iconElement) return;
    
    const { teamCount, aliveCount, canBattle } = this.displayStats;
    
    // Mettre à jour le compteur
    const countElement = this.iconElement.querySelector('.team-count');
    if (countElement) {
      countElement.textContent = teamCount;
    }
    
    // Mettre à jour le statut de combat
    const statusDot = this.iconElement.querySelector('.status-dot');
    if (statusDot) {
      statusDot.classList.remove('ready', 'not-ready', 'warning');
      
      if (!canBattle) {
        statusDot.classList.add('not-ready');
      } else if (aliveCount < teamCount && aliveCount > 0) {
        statusDot.classList.add('warning');
      } else {
        statusDot.classList.add('ready');
      }
    }
    
    // Animations selon l'état
    if (teamCount === 6) {
      this.iconElement.classList.add('team-full');
      setTimeout(() => {
        this.iconElement.classList.remove('team-full');
      }, 1000);
    }
    
    console.log('📊 [TeamIcon] Affichage mis à jour');
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
show() {
  console.log('👁️ [TeamIcon] Affichage (position gérée par UIManager)');
  
  this.isVisible = true;
  
  if (this.iconElement) {
    this.iconElement.classList.remove('hidden');
    this.iconElement.classList.add('appearing');
    
    // ✅ FORCER VISIBILITÉ EXPLICITE
    this.iconElement.style.display = 'block';
    this.iconElement.style.visibility = 'visible';
    this.iconElement.style.opacity = '1';
    
    // Marquer comme géré par UIManager
    this.iconElement.setAttribute('data-positioned-by', 'uimanager');
    
    setTimeout(() => {
      this.iconElement.classList.remove('appearing');
    }, 500);
  }
  
  return true;
}
  
  hide() {
    console.log('👻 [TeamIcon] Masquage');
    
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('hidden');
      this.iconElement.removeAttribute('data-positioned-by');
    }
    
    return true;
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [TeamIcon] setEnabled(${enabled})`);
    
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
  
  // === 💬 FEEDBACK UTILISATEUR ===
  
  showTooltip() {
    const { teamCount, aliveCount, canBattle } = this.displayStats;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'team-tooltip';
    
    // === POSITION TOOLTIP RELATIVE À L'ICÔNE ===
    // Utilise la position actuelle de l'icône (calculée par UIManager)
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
    `;
    
    let statusText = canBattle ? 'Ready for battle' : 'Cannot battle';
    if (aliveCount < teamCount && aliveCount > 0) {
      statusText = 'Some Pokémon fainted';
    }
    
    tooltip.innerHTML = `
      <div><strong>Team: ${teamCount}/6</strong></div>
      <div>Alive: ${aliveCount}</div>
      <div>${statusText}</div>
      <div style="opacity: 0.7; margin-top: 4px;">Click to manage</div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
    
    // Stocker pour pouvoir la supprimer au mouseleave
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
      window.showGameNotification('Team management disabled', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
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
  
  // === 🎭 ANIMATIONS SPÉCIALES ===
  
  animatePokemonAdded() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('team-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('team-updated');
    }, 600);
    
    this.showNotification(true, '+');
    setTimeout(() => {
      this.showNotification(false);
    }, 2000);
  }
  
  animatePokemonFainted() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('pokemon-fainted');
    setTimeout(() => {
      this.iconElement.classList.remove('pokemon-fainted');
    }, 800);
  }
  
  animateTeamHealed() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('team-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('team-updated');
    }, 600);
    
    this.showNotification(true, '💊');
    setTimeout(() => {
      this.showNotification(false);
    }, 1500);
  }
  
  // === 📍 MÉTHODES UIMANAGER (NOUVEAU) ===
  
  /**
   * Méthode appelée par UIManager après positionnement
   */
  onPositioned(position) {
    console.log('📍 [TeamIcon] Position reçue de UIManager:', position);
    
    if (this.iconElement) {
      // Marquer comme positionné par UIManager
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      this.iconElement.setAttribute('data-position', JSON.stringify(position));
      
      // Animation de confirmation
      this.iconElement.style.transform = 'scale(1.05)';
      setTimeout(() => {
        this.iconElement.style.transform = '';
      }, 200);
    }
  }
  
  /**
   * Vérifier si l'icône est bien positionnée par UIManager
   */
  isPositionedByUIManager() {
    return this.iconElement?.getAttribute('data-positioned-by') === 'uimanager';
  }
  
  /**
   * Obtenir la position actuelle calculée par UIManager
   */
  getCurrentPosition() {
    if (!this.iconElement) return null;
    
    const positionData = this.iconElement.getAttribute('data-position');
    if (positionData) {
      try {
        return JSON.parse(positionData);
      } catch (error) {
        console.warn('⚠️ [TeamIcon] Position data invalide');
      }
    }
    
    // Fallback: calculer depuis les styles
    const computed = window.getComputedStyle(this.iconElement);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamIcon] Destruction...');
    
    // Supprimer tooltip si présent
    this.hideTooltip();
    
    // Supprimer l'élément DOM
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    // Reset état
    this.iconElement = null;
    this.onClick = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [TeamIcon] Détruit');
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
      positioningMode: this.positioningMode, // 'uimanager'
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      elementPosition: this.iconElement ? {
        computedLeft: window.getComputedStyle(this.iconElement).left,
        computedTop: window.getComputedStyle(this.iconElement).top,
        offsetLeft: this.iconElement.offsetLeft,
        offsetTop: this.iconElement.offsetTop,
        boundingRect: this.iconElement.getBoundingClientRect()
      } : null
    };
  }
}

export default TeamIcon;

console.log(`
🎯 === TEAM ICON OPTIMISÉ UIMANAGER ===

📍 POSITIONNEMENT:
✅ Aucun positionnement manuel en CSS
✅ position: fixed (UIManager modifie left/top)
✅ positioningMode: 'uimanager'
✅ iconElement exposé pour registerIconPosition()

🎨 STYLES OPTIMISÉS:
✅ Tailles responsive (mobile/tablet/desktop)
✅ Animations et transitions fluides
✅ Indicateur visuel UIManager (data-positioned-by)
✅ Tooltip position relative à l'icône

🔧 NOUVELLES MÉTHODES:
• onPositioned(position) - Callback UIManager
• isPositionedByUIManager() - Vérification
• getCurrentPosition() - Position actuelle

📊 DONNÉES:
• updateStats(stats) - Mise à jour équipe
• displayStats - État local
• Animations contextuelles

🎯 RÉSULTAT:
Position calculée par UIManager:
[📦 Inventory] [📋 Quest] [⚔️ Team]

🔗 INTÉGRATION PARFAITE AVEC UIMANAGER !
`);
