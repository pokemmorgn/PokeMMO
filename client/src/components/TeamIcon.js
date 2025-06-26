// client/src/components/TeamIcon.js - Version harmonisée avec les autres icônes

export class TeamIcon {
  constructor(teamUI) {
    this.teamUI = teamUI;
    this.iconElement = null;
    this.teamCount = 0;
    this.aliveCount = 0;
    this.canBattle = false;
    
    this.init();
  }

  init() {
    this.createIcon();
    this.setupEventListeners();
    console.log('⚔️ Team icon created');
  }

  createIcon() {
    const icon = document.createElement('div');
    icon.id = 'team-icon';
    icon.className = 'ui-icon team-icon';
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">⚔️</span>
          <div class="team-indicator">
            <span class="team-count">0</span>
            <span class="team-separator">/</span>
            <span class="team-max">6</span>
          </div>
        </div>
        <div class="icon-label">Team</div>
      </div>
      <div class="icon-notification" id="team-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
      <div class="team-status-indicator" id="team-status">
        <div class="status-dot ready"></div>
      </div>
    `;

    // Ajouter au body - la position sera calculée dynamiquement
    document.body.appendChild(icon);
    this.iconElement = icon;

    this.addStyles();
    this.checkAndAdjustPosition();
  }

  addStyles() {
    if (document.querySelector('#team-icon-styles')) return;

    const style = document.createElement('style');
    style.id = 'team-icon-styles';
    style.textContent = `
      /* ===== TEAM ICON STYLES - HARMONISÉ AVEC LES AUTRES ICÔNES ===== */
      .team-icon {
        position: fixed;
        bottom: 20px;
        right: 100px; /* Position par défaut, sera ajustée dynamiquement */
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

      /* ✅ COULEURS IDENTIQUES À L'INVENTAIRE - Thème bleu */
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

      .team-indicator {
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

      /* ✅ LABEL IDENTIQUE À L'INVENTAIRE */
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

      /* ✅ NOTIFICATION IDENTIQUE AUX AUTRES */
      .team-icon .icon-notification {
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

      .team-icon .notification-count {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }

      /* ✅ INDICATEUR DE STATUT - COULEURS HARMONISÉES */
      .team-status-indicator {
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

      /* ===== ANIMATIONS HARMONISÉES ===== */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      @keyframes warningBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Team update animation */
      .team-icon.team-updated .icon-emoji {
        animation: teamBounce 0.6s ease;
      }

      @keyframes teamBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.3) rotate(-5deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(1.2) rotate(-2deg); }
      }

      /* Pokémon fainted animation */
      .team-icon.pokemon-fainted .icon-background {
        animation: faintedFlash 0.8s ease;
      }

      @keyframes faintedFlash {
        0%, 100% { background: linear-gradient(145deg, #2a3f5f, #1e2d42); }
        50% { background: linear-gradient(145deg, #9c27b0, #7b1fa2); }
      }

      /* Team full animation */
      .team-icon.team-full .icon-background {
        animation: teamFullGlow 1s ease;
      }

      @keyframes teamFullGlow {
        0%, 100% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); }
        50% { box-shadow: 0 4px 25px rgba(74, 144, 226, 0.8); }
      }

      /* ===== RESPONSIVE DESIGN HARMONISÉ ===== */
      @media (max-width: 768px) {
        .team-icon {
          bottom: 15px;
          width: 60px;
          height: 70px;
        }

        .team-icon .icon-background {
          height: 60px;
        }

        .team-icon .icon-emoji {
          font-size: 18px;
        }

        .team-indicator {
          font-size: 10px;
        }

        .team-count {
          font-size: 11px;
        }

        .team-icon .icon-label {
          font-size: 10px;
        }
      }

      /* ===== ÉTATS SPÉCIAUX HARMONISÉS ===== */
      .team-icon.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .team-icon.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }

      /* Appear animation harmonisée */
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

      /* Low health warning */
      .team-icon.low-health .icon-background::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, transparent, rgba(74, 144, 226, 0.3), transparent);
        border-radius: 17px;
        opacity: 0;
        animation: healthWarning 2s infinite;
      }

      @keyframes healthWarning {
        0%, 90% { opacity: 0; }
        45% { opacity: 1; }
      }

      /* In battle mode */
      .team-icon.in-battle .icon-background {
        background: linear-gradient(145deg, #8e44ad, #7d3c98);
        border-color: #9b59b6;
        animation: battlePulse 1.5s infinite;
      }

      @keyframes battlePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .team-icon.in-battle .icon-emoji {
        animation: battleRotate 2s linear infinite;
      }

      @keyframes battleRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    this.iconElement.addEventListener('click', () => {
      this.handleClick();
    });

    // Animation au clic
    this.iconElement.addEventListener('click', () => {
      this.iconElement.classList.add('team-updated');
      setTimeout(() => {
        this.iconElement.classList.remove('team-updated');
      }, 600);
    });

    // Raccourci clavier (T pour Team)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canOpenTeam()) {
        e.preventDefault();
        e.stopPropagation();
        console.log('⚔️ Touche T pressée - ouverture équipe');
        this.handleClick();
      }
    });

    // Observer les changements d'autres icônes pour ajuster la position
    this.startPositionObserver();

    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
      this.adjustPosition();
    });
  }

  handleClick() {
    if (!this.canOpenTeam()) {
      this.showCannotOpenMessage();
      return;
    }

    if (this.teamUI) {
      this.teamUI.toggle();
    }
  }

  canOpenTeam() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    const shopOpen = document.querySelector('#shop-overlay') && !document.querySelector('#shop-overlay').classList.contains('hidden');
    
    return !questDialogOpen && !chatOpen && !starterHudOpen && !dialogueOpen && !inventoryOpen && !shopOpen;
  }

  showCannotOpenMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      bottom: 110px;
      right: 50%;
      transform: translateX(50%);
      background: rgba(74, 144, 226, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      animation: fadeInOut 2s ease;
      pointer-events: none;
    `;
    message.textContent = 'Cannot open team right now';

    document.body.appendChild(message);

    if (!document.querySelector('#team-icon-animations')) {
      const style = document.createElement('style');
      style.id = 'team-icon-animations';
      style.textContent = `
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateX(50%) translateY(10px); }
          20%, 80% { opacity: 1; transform: translateX(50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 2000);
  }

  // ✅ SYSTÈME DE POSITIONNEMENT AMÉLIORÉ - ESPACEMENT TRÈS RÉDUIT
  adjustPosition() {
    const inventoryIcon = document.querySelector('#inventory-icon');
    const questIcon = document.querySelector('#quest-icon');
    
    const baseRight = 20;
    const iconWidth = 70;
    const spacing = 10; // ✅ Espacement réduit à 10px seulement !
    
    let rightPosition = baseRight;
    let iconsCount = 0;

    // Compter les icônes présentes et calculer la position
    if (inventoryIcon) iconsCount++;
    if (questIcon) iconsCount++;

    // Positionner l'icône team à gauche des autres
    rightPosition = baseRight + (iconsCount * (iconWidth + spacing));
    
    this.iconElement.style.right = `${rightPosition}px`;
    
    console.log(`⚔️ Team icon positioned: ${rightPosition}px (${iconsCount} autres icônes détectées)`);
  }

  startPositionObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldReposition = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && // Element node
              (node.id === 'inventory-icon' || node.id === 'quest-icon')) {
            shouldReposition = true;
            console.log(`⚔️ Detected new icon: ${node.id}`);
          }
        });
        
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1 && // Element node
              (node.id === 'inventory-icon' || node.id === 'quest-icon')) {
            shouldReposition = true;
            console.log(`⚔️ Detected removed icon: ${node.id}`);
          }
        });
      });

      if (shouldReposition) {
        // Délai pour laisser les autres icônes se positionner
        setTimeout(() => {
          this.adjustPosition();
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.positionObserver = observer;
  }

  stopPositionObserver() {
    if (this.positionObserver) {
      this.positionObserver.disconnect();
      this.positionObserver = null;
    }
  }

  // ✅ VÉRIFICATION ET AJUSTEMENT DE POSITION
  checkAndAdjustPosition() {
    setTimeout(() => {
      this.adjustPosition();
    }, 100);
  }

  show() {
    this.iconElement.classList.remove('hidden');
    this.iconElement.classList.add('appearing');
    setTimeout(() => {
      this.iconElement.classList.remove('appearing');
    }, 500);
    
    // Ajuster la position après apparition
    this.checkAndAdjustPosition();
  }

  hide() {
    this.iconElement.classList.add('hidden');
  }

  // Méthodes publiques pour la gestion de l'état
  updateTeamStats(stats) {
    this.teamCount = stats.totalPokemon || 0;
    this.aliveCount = stats.alivePokemon || 0;
    this.canBattle = stats.canBattle || false;

    // Mettre à jour l'affichage du compteur
    this.iconElement.querySelector('.team-count').textContent = this.teamCount;

    // Mettre à jour le statut
    this.updateBattleStatus();

    // Animations selon l'état
    if (this.teamCount === 6) {
      this.iconElement.classList.add('team-full');
      setTimeout(() => {
        this.iconElement.classList.remove('team-full');
      }, 1000);
    }

    if (this.aliveCount < this.teamCount && this.aliveCount > 0) {
      this.iconElement.classList.add('low-health');
    } else {
      this.iconElement.classList.remove('low-health');
    }
  }

  updateBattleStatus() {
    const statusDot = this.iconElement.querySelector('.status-dot');
    
    statusDot.classList.remove('ready', 'not-ready', 'warning');
    
    if (!this.canBattle) {
      statusDot.classList.add('not-ready');
    } else if (this.aliveCount < this.teamCount) {
      statusDot.classList.add('warning');
    } else {
      statusDot.classList.add('ready');
    }
  }

  onPokemonAdded(pokemon) {
    this.iconElement.classList.add('team-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('team-updated');
    }, 600);

    // Brève animation avec l'icône du Pokémon
    this.setTemporaryIcon(this.getPokemonIcon(pokemon.pokemonId), 1500);
  }

  onPokemonRemoved() {
    this.iconElement.classList.add('team-updated');
    setTimeout(() => {
      this.iconElement.classList.remove('team-updated');
    }, 600);
  }

  onPokemonFainted() {
    this.iconElement.classList.add('pokemon-fainted');
    setTimeout(() => {
      this.iconElement.classList.remove('pokemon-fainted');
    }, 800);
  }

  onBattleStart() {
    this.iconElement.classList.add('in-battle');
  }

  onBattleEnd() {
    this.iconElement.classList.remove('in-battle');
  }

  getPokemonIcon(pokemonId) {
    const iconMap = {
      1: '🌱', 2: '🌿', 3: '🌺',
      4: '🦎', 5: '🔥', 6: '🐉',
      7: '🐢', 8: '💧', 9: '🌊',
      25: '⚡', 26: '⚡'
    };
    return iconMap[pokemonId] || '⚔️';
  }

  setTemporaryIcon(emoji, duration = 2000) {
    const iconEmoji = this.iconElement.querySelector('.icon-emoji');
    const originalEmoji = iconEmoji.textContent;
    
    iconEmoji.textContent = emoji;
    iconEmoji.style.animation = 'pulse 0.5s ease';
    
    setTimeout(() => {
      iconEmoji.textContent = originalEmoji;
      iconEmoji.style.animation = '';
    }, duration);
  }

  setEnabled(enabled) {
    this.iconElement.classList.toggle('disabled', !enabled);
  }

  showNotification(show = true) {
    const notification = this.iconElement.querySelector('#team-notification');
    notification.style.display = show ? 'flex' : 'none';
  }

  updateNotificationCount(count) {
    const notification = this.iconElement.querySelector('#team-notification');
    const countElement = notification.querySelector('.notification-count');
    
    if (count > 0) {
      countElement.textContent = count > 9 ? '!' : count.toString();
      notification.style.display = 'flex';
    } else {
      notification.style.display = 'none';
    }
  }

  setPosition(bottom, right) {
    this.iconElement.style.bottom = `${bottom}px`;
    this.iconElement.style.right = `${right}px`;
  }

  // Intégration avec le système d'équipe
  onTeamUpdate(updateData) {
    switch (updateData.type) {
      case 'add':
        this.onPokemonAdded(updateData.pokemon);
        break;
      case 'remove':
        this.onPokemonRemoved();
        break;
      case 'fainted':
        this.onPokemonFainted();
        break;
      case 'healed':
        this.iconElement.classList.add('team-updated');
        setTimeout(() => {
          this.iconElement.classList.remove('team-updated');
        }, 600);
        break;
    }
  }

  destroy() {
    this.stopPositionObserver();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.remove();
    }
    console.log('⚔️ Team icon removed');
  }
}
