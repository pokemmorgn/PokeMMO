// Pokedex/PokedexIcon.js - Icône Pokédx Compatible UIManager
// 🎯 Crée juste l'élément DOM, UIManager calcule la position
// 📱 Style nostalgique mais moderne - première génération

import { POKEDEX_ICON_STYLES } from './PokedexIconCSS.js';

export class PokedexIcon {
  constructor(pokedexUI) {
    this.pokedexUI = pokedexUI;
    
    // === ÉTAT ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    // === CALLBACKS ===
    this.onClick = null; // Appelé au clic (défini par PokedexModule)
    
    // === DONNÉES AFFICHÉES ===
    this.displayData = {
      hasNotification: false,
      notificationCount: 0,
      canOpen: true,
      totalSeen: 0,
      totalCaught: 0,
      completionPercentage: 0
    };
    
    // === IMPORTANT: POSITIONNEMENT GÉRÉ PAR UIMANAGER ===
    this.positioningMode = 'uimanager'; // Signale que UIManager gère la position
    
    console.log('📱 [PokedexIcon] Instance créée (positionnement géré par UIManager)');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [PokedexIcon] Initialisation sans positionnement manuel...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      
      // 🆕 AFFICHER L'ICÔNE PAR DÉFAUT
      this.show();
      
      console.log('✅ [PokedexIcon] Initialisé ET affiché (position sera gérée par UIManager)');
      return this;
      
    } catch (error) {
      console.error('❌ [PokedexIcon] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
    // Supprimer l'ancien s'il existe
    const existing = document.querySelector('#pokedex-icon');
    if (existing) {
      existing.remove();
    }
    
    const icon = document.createElement('div');
    icon.id = 'pokedex-icon';
    icon.className = 'pokedex-icon ui-icon';
    
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-screen">
          <div class="screen-border">
            <div class="screen-content">
              <div class="pokedex-logo">
                <span class="logo-text">POKé</span>
                <span class="logo-dex">DEX</span>
              </div>
              <div class="completion-display">
                <span class="completion-text">${this.displayData.completionPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="icon-controls">
          <div class="control-button red" title="Pokédex National"></div>
          <div class="control-button blue" title="Recherche"></div>
          <div class="control-button green" title="Favoris"></div>
        </div>
        
        <div class="icon-label">Pokédex</div>
      </div>
      
      <div class="icon-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
      
      <div class="completion-ring">
        <svg class="ring-svg" viewBox="0 0 36 36">
          <path class="ring-bg" d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path class="ring-progress" d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
            style="stroke-dasharray: ${this.displayData.completionPercentage}, 100"
          />
        </svg>
      </div>
    `;
    
    // === IMPORTANT: PAS DE POSITIONNEMENT INITIAL ===
    // On ne définit PAS position, right, bottom, etc.
    // UIManager s'en chargera
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [PokedexIcon] Icône créée SANS positionnement (UIManager prendra le relais)');
  }
  
  addStyles() {
    if (document.querySelector('#pokedex-icon-styles')) {
      return; // Styles déjà chargés
    }
    
    const style = document.createElement('style');
    style.id = 'pokedex-icon-styles';
    style.textContent = POKEDEX_ICON_STYLES;
    
    document.head.appendChild(style);
    console.log('🎨 [PokedexIcon] Styles modulaires appliqués');
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
      
      // Animation de clic - style Pokédex qui s'ouvre
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 800);
      
      // Son d'ouverture du Pokédx (optionnel)
      this.playOpenSound();
      
      // Appeler le callback
      if (this.onClick) {
        this.onClick();
      } else if (this.pokedexUI) {
        // Fallback vers pokedexUI directement
        this.pokedexUI.toggle();
      }
      
      console.log('📱 [PokedexIcon] Clic détecté');
    });
    
    // Clic sur les boutons de contrôle
    const redButton = this.iconElement.querySelector('.control-button.red');
    const blueButton = this.iconElement.querySelector('.control-button.blue');
    const greenButton = this.iconElement.querySelector('.control-button.green');
    
    if (redButton) {
      redButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onControlButtonClick('national');
      });
    }
    
    if (blueButton) {
      blueButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onControlButtonClick('search');
      });
    }
    
    if (greenButton) {
      greenButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onControlButtonClick('favorites');
      });
    }
    
    // Survol pour feedback
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
        this.iconElement.classList.add('hover-glow');
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
      this.iconElement.classList.remove('hover-glow');
    });
    
    console.log('🎛️ [PokedexIcon] Événements configurés');
  }
  
  onControlButtonClick(action) {
    // Animation du bouton
    const button = this.iconElement.querySelector(`.control-button.${action === 'national' ? 'red' : action === 'search' ? 'blue' : 'green'}`);
    if (button) {
      button.classList.add('pressed');
      setTimeout(() => {
        button.classList.remove('pressed');
      }, 150);
    }
    
    // Actions rapides
    switch (action) {
      case 'national':
        if (this.pokedexUI) {
          this.pokedexUI.openToView('national');
        }
        break;
      case 'search':
        if (this.pokedexUI) {
          this.pokedexUI.openToView('search');
        }
        break;
      case 'favorites':
        if (this.pokedexUI) {
          this.pokedexUI.openToView('favorites');
        }
        break;
    }
    
    console.log(`🎮 [PokedexIcon] Action rapide: ${action}`);
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateNotification(show = true, count = 0) {
    if (!this.iconElement) return;
    
    console.log(`📊 [PokedexIcon] Mise à jour notification: ${show}, count: ${count}`);
    
    this.displayData.hasNotification = show;
    this.displayData.notificationCount = count;
    
    const notification = this.iconElement.querySelector('.icon-notification');
    const countElement = this.iconElement.querySelector('.notification-count');
    
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
  
  updateProgress(data) {
    if (!this.iconElement) return;
    
    const { totalSeen = 0, totalCaught = 0, seenPercentage = 0, caughtPercentage = 0 } = data;
    
    this.displayData.totalSeen = totalSeen;
    this.displayData.totalCaught = totalCaught;
    this.displayData.completionPercentage = Math.round(caughtPercentage);
    
    // Mettre à jour l'affichage du pourcentage
    const completionText = this.iconElement.querySelector('.completion-text');
    if (completionText) {
      completionText.textContent = `${this.displayData.completionPercentage}%`;
    }
    
    // Mettre à jour l'anneau de progression
    const ringProgress = this.iconElement.querySelector('.ring-progress');
    if (ringProgress) {
      ringProgress.style.strokeDasharray = `${this.displayData.completionPercentage}, 100`;
    }
    
    // Animation de mise à jour
    this.iconElement.classList.add('data-update');
    setTimeout(() => {
      this.iconElement.classList.remove('data-update');
    }, 600);
    
    console.log(`📊 [PokedexIcon] Progression mise à jour: ${totalCaught}/${totalSeen} (${this.displayData.completionPercentage}%)`);
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [PokedexIcon] Affichage (position gérée par UIManager)');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('ui-hidden', 'hidden');
      this.iconElement.classList.add('ui-fade-in');
      
      // 🆕 FORCER DISPLAY BLOCK
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
    console.log('👻 [PokedexIcon] Masquage');
    
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
    console.log(`🔧 [PokedexIcon] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    this.displayData.canOpen = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('ui-disabled', 'disabled');
        this.iconElement.classList.add('ui-pulse');
        setTimeout(() => {
          this.iconElement.classList.remove('ui-pulse');
        }, 150);
      } else {
        this.iconElement.classList.add('ui-disabled');
      }
    }
    
    return true;
  }
  
  // === 💬 FEEDBACK UTILISATEUR ===
  
  showTooltip() {
    if (!this.iconElement) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'pokedex-tooltip';
    
    // === POSITION TOOLTIP RELATIVE À L'ICÔNE ===
    const iconRect = this.iconElement.getBoundingClientRect();
    
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - iconRect.top + 10}px;
      right: ${window.innerWidth - iconRect.right}px;
      background: linear-gradient(145deg, #1e3a8a, #1e40af);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 12px;
      z-index: 501;
      border: 2px solid #3b82f6;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
      pointer-events: none;
      white-space: nowrap;
      font-family: 'Courier New', monospace;
    `;
    
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="font-size: 16px;">📱</div>
        <div>
          <div><strong>POKÉDEX NATIONAL</strong></div>
          <div style="opacity: 0.8; margin-top: 2px;">VU: ${this.displayData.totalSeen} | CAPTURÉ: ${this.displayData.totalCaught}</div>
          <div style="opacity: 0.7; margin-top: 4px; font-size: 10px;">Clic pour ouvrir • Boutons pour actions rapides</div>
        </div>
      </div>
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
      window.showGameNotification('Pokédx désactivé', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎭 ANIMATIONS SPÉCIALES ===
  
  animateNewDiscovery() {
    if (!this.iconElement) return;
    
    // Animation d'ouverture + glow spécial
    this.iconElement.classList.add('new-discovery');
    setTimeout(() => {
      this.iconElement.classList.remove('new-discovery');
    }, 2000);
    
    // Notification temporaire
    this.updateNotification(true, 'NEW');
    setTimeout(() => {
      this.updateNotification(false);
    }, 3000);
    
    console.log('✨ [PokedexIcon] Animation nouvelle découverte');
  }
  
  animateCapture() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('capture-success');
    setTimeout(() => {
      this.iconElement.classList.remove('capture-success');
    }, 1000);
    
    console.log('🎯 [PokedexIcon] Animation capture');
  }
  
  animateMilestone(percentage) {
    if (!this.iconElement) return;
    
    // Animation spéciale pour les jalons importants (25%, 50%, 75%, 100%)
    this.iconElement.classList.add('milestone-reached');
    setTimeout(() => {
      this.iconElement.classList.remove('milestone-reached');
    }, 1500);
    
    // Affichage temporaire du pourcentage
    const completionText = this.iconElement.querySelector('.completion-text');
    if (completionText) {
      const originalText = completionText.textContent;
      completionText.textContent = `${percentage}%!`;
      completionText.style.color = '#fbbf24';
      
      setTimeout(() => {
        completionText.textContent = originalText;
        completionText.style.color = '';
      }, 2000);
    }
    
    console.log(`🏆 [PokedexIcon] Animation jalon: ${percentage}%`);
  }
  
  // === 🎮 MÉTHODES PUBLIQUES POUR INTÉGRATION ===
  
  // Gérer les notifications de découverte
  showDiscoveryNotification(pokemonData) {
    this.animateNewDiscovery();
    
    // Mettre à jour temporairement l'écran avec l'info du Pokémon
    const logoText = this.iconElement.querySelector('.logo-text');
    const logoDex = this.iconElement.querySelector('.logo-dex');
    
    if (logoText && logoDex) {
      logoText.textContent = '#' + pokemonData.id.toString().padStart(3, '0');
      logoDex.textContent = pokemonData.name?.toUpperCase() || 'NEW';
      
      setTimeout(() => {
        logoText.textContent = 'POKé';
        logoDex.textContent = 'DEX';
      }, 3000);
    }
  }
  
  // Gérer les notifications de capture
  showCaptureNotification(pokemonData) {
    this.animateCapture();
    
    if (pokemonData.isShiny) {
      // Animation spéciale pour les shiny
      this.iconElement.classList.add('shiny-capture');
      setTimeout(() => {
        this.iconElement.classList.remove('shiny-capture');
      }, 2000);
    }
  }
  
  // Effet pour les streaks
  showStreakEffect(streakCount) {
    this.iconElement.style.setProperty('--streak-count', streakCount);
    this.iconElement.classList.add('streak-active');
    
    setTimeout(() => {
      this.iconElement.classList.remove('streak-active');
    }, 5000);
  }
  
  // Sons du Pokédx (optionnels)
  playOpenSound() {
    try {
      // Son nostalgique d'ouverture du Pokédx
      if (window.audioManager && window.audioManager.playSound) {
        window.audioManager.playSound('pokedex_open', { volume: 0.3 });
      }
    } catch (error) {
      // Pas grave si le son ne fonctionne pas
    }
  }
  
  playDiscoverySound() {
    try {
      if (window.audioManager && window.audioManager.playSound) {
        window.audioManager.playSound('pokedex_discovery', { volume: 0.5 });
      }
    } catch (error) {
      // Pas grave
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [PokedexIcon] Destruction...');
    
    // Supprimer tooltip si présent
    this.hideTooltip();
    
    // Supprimer l'élément DOM
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    // Reset état
    this.iconElement = null;
    this.onClick = null;
    this.pokedexUI = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [PokedexIcon] Détruit');
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
      hasPokedexUI: !!this.pokedexUI,
      positioningMode: this.positioningMode, // 'uimanager'
      elementPosition: this.iconElement ? {
        position: this.iconElement.style.position,
        left: this.iconElement.style.left,
        top: this.iconElement.style.top,
        right: this.iconElement.style.right,
        bottom: this.iconElement.style.bottom,
        transform: this.iconElement.style.transform
      } : null
    };
  }
}

export default PokedexIcon;

console.log(`
📱 === POKÉDEX ICON STYLE NOSTALGIQUE ===

✨ DESIGN INSPIRÉ 1ÈRE GÉNÉRATION:
- Écran LCD avec bordure classique
- Boutons de contrôle colorés (rouge/bleu/vert)
- Anneau de progression circulaire
- Police style "digital"
- Sons nostalgiques

🎮 FONCTIONNALITÉS MODERNES:
- Affichage progression en temps réel
- Notifications de découverte/capture
- Actions rapides via boutons
- Animations fluides
- Tooltips informatifs

📍 INTÉGRATION UIMANAGER:
- Positionnement géré par UIManager
- Compatible avec BaseModule
- Pas de position fixe
- Responsive automatique

🎯 INTERACTIONS:
- Clic principal: ouvre le Pokédx
- Bouton rouge: vue nationale
- Bouton bleu: recherche
- Bouton vert: favoris
- Hover: tooltip avec stats

✅ PRÊT POUR L'AVENTURE !
`);
