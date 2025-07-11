// Team/TeamIcon.js - Icône Team Simplifiée
// 🎯 Affiche l'icône cliquable bottom-right

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
    
    console.log('🎯 [TeamIcon] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [TeamIcon] Initialisation...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      this.positionIcon();
      
      console.log('✅ [TeamIcon] Initialisé');
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
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [TeamIcon] Icône créée');
  }
  
  addStyles() {
    if (document.querySelector('#team-icon-styles')) {
      return; // Styles déjà chargés
    }
    
    const style = document.createElement('style');
    style.id = 'team-icon-styles';
    style.textContent = `
      /* ===== TEAM ICON STYLES ===== */
      .team-icon {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 70px;
        height: 80px;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
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
      
      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .team-icon {
          bottom: 15px;
          right: 15px;
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
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamIcon] Styles ajoutés');
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
  
  // === 📍 POSITIONNEMENT ===
  
  positionIcon() {
    if (!this.iconElement) return;
    
    // Position de base
    let rightPosition = 20;
    const spacing = 10;
    const iconWidth = 70;
    
    // Détecter les autres icônes pour ajuster la position
    const otherIcons = [
      document.querySelector('#inventory-icon'),
      document.querySelector('#quest-icon')
    ].filter(icon => icon && icon.style.display !== 'none');
    
    // Calculer position selon les autres icônes
    rightPosition = 20 + (otherIcons.length * (iconWidth + spacing));
    
    this.iconElement.style.right = `${rightPosition}px`;
    
    console.log(`📍 [TeamIcon] Positionné à ${rightPosition}px du bord`);
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
    console.log('👁️ [TeamIcon] Affichage');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('hidden');
      this.iconElement.classList.add('appearing');
      
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
    tooltip.style.cssText = `
      position: fixed;
      bottom: 110px;
      right: 20px;
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
      position: this.iconElement ? {
        right: this.iconElement.style.right,
        bottom: this.iconElement.style.bottom
      } : null
    };
  }
}

export default TeamIcon;

console.log(`
🎯 === TEAM ICON SIMPLIFIÉ ===

✅ RESPONSABILITÉS:
- Affichage icône bottom-right
- Indicateurs visuels (compteur, statut)
- Gestion clic et hover
- Animations feedback

🎨 DESIGN:
- Thème bleu harmonisé avec inventaire
- Compteur équipe (0/6)
- Statut combat (vert/rouge/orange)
- Notifications badge
- Tooltip informatif

🎛️ API UIMANAGER:
- show() → affiche icône
- hide() → cache icône  
- setEnabled(bool) → active/désactive

📊 DONNÉES:
- updateStats(stats) → met à jour affichage
- teamCount, aliveCount, canBattle

🎭 ANIMATIONS:
- Clic → teamBounce
- Équipe pleine → teamFullGlow
- Pokémon KO → faintedFlash
- Soins → notification temporaire

🔗 CALLBACK:
- onClick() → défini par TeamModule
- Déclenche ouverture TeamUI

📱 RESPONSIVE:
- Mobile: 60x70px
- Tablet: 65x75px  
- Desktop: 70x80px

🎯 SIMPLE ET ÉLÉGANT !
`);
