// client/src/components/MobileInteractButton.js
export class MobileInteractButton {
  constructor(scene) {
    this.scene = scene;
    this.button = null;
    this.isVisible = false;
    this.currentTarget = null;
    this.isMobile = this.detectMobile();
    
    this.createButton();
    this.setupEvents();
    
    console.log(`📱 Mobile Interact Button initialized (Mobile: ${this.isMobile})`);
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  createButton() {
    // Créer le bouton DOM
    this.button = document.createElement('div');
    this.button.className = 'mobile-interact-btn';
    this.button.innerHTML = '💬'; // Emoji par défaut
    this.button.id = 'mobile-interact-button';
    
    // Style de base (complété par le CSS)
    this.button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(145deg, rgba(100, 166, 255, 0.9), rgba(74, 144, 226, 0.9));
      border: 3px solid rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      cursor: pointer;
      user-select: none;
      z-index: 2001;
      transition: all 0.2s ease;
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
      font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    `;

    document.body.appendChild(this.button);
  }

  setupEvents() {
    // Interaction tactile
    this.button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onInteract();
    });

    // Interaction souris (pour les tests desktop)
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.onInteract();
    });

    // Animation de feedback tactile
    this.button.addEventListener('touchstart', () => {
      this.button.style.transform = 'scale(0.95)';
    });

    this.button.addEventListener('touchend', () => {
      if (this.isVisible) {
        this.button.style.transform = 'scale(1)';
      }
    });
  }

  onInteract() {
    if (!this.currentTarget) return;

    // Vibration tactile si supportée
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Animation de feedback
    this.button.style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (this.isVisible) {
        this.button.style.transform = 'scale(1)';
      }
    }, 100);

    // Déclencher l'interaction selon le type de cible
    switch (this.currentTarget.type) {
      case 'npc':
        this.interactWithNPC(this.currentTarget.data);
        break;
      case 'object':
        this.interactWithObject(this.currentTarget.data);
        break;
      case 'zone':
        this.interactWithZone(this.currentTarget.data);
        break;
      default:
        console.warn('Type d\'interaction inconnu:', this.currentTarget.type);
    }
  }

  interactWithNPC(npcData) {
    if (this.scene.networkManager) {
      this.scene.networkManager.sendNpcInteract(npcData.id);
      console.log(`📱 Interaction mobile avec NPC: ${npcData.name}`);
    }
  }

  interactWithObject(objectData) {
    // Envoyer l'interaction d'objet au serveur
    if (this.scene.networkManager) {
      this.scene.networkManager.sendMessage('objectInteract', {
        objectId: objectData.id,
        objectType: objectData.type
      });
      console.log(`📱 Interaction mobile avec objet: ${objectData.name}`);
    }
  }

  interactWithZone(zoneData) {
    // Déclencher la transition de zone
    if (this.scene.networkManager) {
      this.scene.networkManager.requestZoneTransition(zoneData.targetZone);
      console.log(`📱 Transition mobile vers: ${zoneData.targetZone}`);
    }
  }

  // Afficher le bouton avec une cible spécifique
  show(target) {
    if (!this.isMobile && !this.forceShow) return;

    this.currentTarget = target;
    this.isVisible = true;
    
    // Mettre à jour l'apparence selon le type
    this.updateAppearance(target.type);
    
    // Animation d'apparition
    this.button.style.pointerEvents = 'auto';
    this.button.style.opacity = '1';
    this.button.style.transform = 'scale(1)';
    this.button.classList.add('show');

    // Animation de pulsation pour attirer l'attention
    this.button.classList.add('pulse');

    console.log(`📱 Bouton d'interaction affiché pour: ${target.type}`);
  }

  // Masquer le bouton
  hide() {
    this.isVisible = false;
    this.currentTarget = null;
    
    // Animation de disparition
    this.button.style.opacity = '0';
    this.button.style.transform = 'scale(0.8)';
    this.button.style.pointerEvents = 'none';
    this.button.classList.remove('show', 'pulse');

    console.log('📱 Bouton d\'interaction masqué');
  }

  // Mettre à jour l'apparence selon le type d'interaction
  updateAppearance(type) {
    const appearances = {
      npc: {
        emoji: '💬',
        color: 'linear-gradient(145deg, rgba(100, 166, 255, 0.9), rgba(74, 144, 226, 0.9))',
        borderColor: 'rgba(255, 255, 255, 0.8)'
      },
      object: {
        emoji: '🔍',
        color: 'linear-gradient(145deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.9))',
        borderColor: 'rgba(255, 255, 255, 0.8)'
      },
      zone: {
        emoji: '🚪',
        color: 'linear-gradient(145deg, rgba(40, 167, 69, 0.9), rgba(34, 139, 34, 0.9))',
        borderColor: 'rgba(255, 255, 255, 0.8)'
      },
      shop: {
        emoji: '🛒',
        color: 'linear-gradient(145deg, rgba(220, 53, 69, 0.9), rgba(185, 28, 28, 0.9))',
        borderColor: 'rgba(255, 255, 255, 0.8)'
      },
      heal: {
        emoji: '❤️',
        color: 'linear-gradient(145deg, rgba(220, 53, 69, 0.9), rgba(185, 28, 28, 0.9))',
        borderColor: 'rgba(255, 255, 255, 0.8)'
      }
    };

    const appearance = appearances[type] || appearances.npc;
    
    this.button.innerHTML = appearance.emoji;
    this.button.style.background = appearance.color;
    this.button.style.borderColor = appearance.borderColor;
  }

  // Vérifier et mettre à jour les interactions disponibles
  update() {
    if (!this.isMobile && !this.forceShow) return;

    const player = this.scene.playerManager?.getMyPlayer();
    if (!player) return;

    // Vérifier les NPCs proches
    if (this.scene.npcManager) {
      const closestNPC = this.scene.npcManager.getClosestNpc(player.x, player.y, 64);
      if (closestNPC) {
        this.show({
          type: 'npc',
          data: closestNPC
        });
        return;
      }
    }

    // Vérifier les objets interactifs proches
    const interactiveObjects = this.findNearbyInteractiveObjects(player);
    if (interactiveObjects.length > 0) {
      this.show({
        type: 'object',
        data: interactiveObjects[0] // Prendre le plus proche
      });
      return;
    }

    // Vérifier les zones de transition proches
    const transitionZones = this.findNearbyTransitionZones(player);
    if (transitionZones.length > 0) {
      this.show({
        type: 'zone',
        data: transitionZones[0]
      });
      return;
    }

    // Aucune interaction disponible
    if (this.isVisible) {
      this.hide();
    }
  }

  findNearbyInteractiveObjects(player) {
    // Chercher des objets interactifs dans la map
    const interactiveObjects = [];
    
    if (this.scene.map) {
      const objectLayers = this.scene.map.getObjectLayer('Interactive');
      if (objectLayers) {
        objectLayers.objects.forEach(obj => {
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            obj.x + (obj.width || 0) / 2,
            obj.y + (obj.height || 0) / 2
          );
          
          if (distance <= 64) { // Rayon d'interaction
            interactiveObjects.push({
              id: obj.id,
              name: obj.name,
              type: obj.type || 'generic',
              distance: distance
            });
          }
        });
      }
    }
    
    return interactiveObjects.sort((a, b) => a.distance - b.distance);
  }

  findNearbyTransitionZones(player) {
    // Chercher des zones de transition proches
    const transitionZones = [];
    
    if (this.scene.map) {
      const worldsLayer = this.scene.map.getObjectLayer('Worlds');
      if (worldsLayer) {
        worldsLayer.objects.forEach(obj => {
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            obj.x + (obj.width || 0) / 2,
            obj.y + (obj.height || 0) / 2
          );
          
          if (distance <= 80) { // Rayon d'interaction plus large pour les zones
            const targetZoneProp = obj.properties?.find(p => p.name === 'targetZone');
            if (targetZoneProp) {
              transitionZones.push({
                id: obj.id,
                name: obj.name,
                targetZone: targetZoneProp.value,
                distance: distance
              });
            }
          }
        });
      }
    }
    
    return transitionZones.sort((a, b) => a.distance - b.distance);
  }

  // Forcer l'affichage même sur desktop (pour les tests)
  setForceShow(force) {
    this.forceShow = force;
    if (!force && !this.isMobile) {
      this.hide();
    }
  }

  // Repositionner le bouton (utile pour les changements d'orientation)
  reposition() {
    if (!this.isMobile) return;

    // Ajuster la position selon l'orientation
    if (window.orientation === 90 || window.orientation === -90) {
      // Mode paysage
      this.button.style.bottom = '15px';
      this.button.style.right = '15px';
    } else {
      // Mode portrait
      this.button.style.bottom = '20px';
      this.button.style.right = '20px';
    }

    // Gérer les zones de sécurité (encoche iPhone)
    if (CSS.supports('padding: max(0px)')) {
      this.button.style.bottom = 'max(20px, env(safe-area-inset-bottom))';
      this.button.style.right = 'max(20px, env(safe-area-inset-right))';
    }
  }

  // Changer temporairement l'apparence (feedback visuel)
  flash(type = 'success') {
    const originalColor = this.button.style.background;
    const originalBorder = this.button.style.borderColor;
    
    const flashColors = {
      success: {
        background: 'linear-gradient(145deg, rgba(40, 167, 69, 0.9), rgba(34, 139, 34, 0.9))',
        border: 'rgba(255, 255, 255, 1)'
      },
      error: {
        background: 'linear-gradient(145deg, rgba(220, 53, 69, 0.9), rgba(185, 28, 28, 0.9))',
        border: 'rgba(255, 255, 255, 1)'
      },
      warning: {
        background: 'linear-gradient(145deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.9))',
        border: 'rgba(255, 255, 255, 1)'
      }
    };

    const flashColor = flashColors[type] || flashColors.success;
    
    // Appliquer la couleur de flash
    this.button.style.background = flashColor.background;
    this.button.style.borderColor = flashColor.border;
    this.button.style.transform = 'scale(1.1)';
    
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate(type === 'error' ? [100, 50, 100] : 100);
    }
    
    // Retour à la normale
    setTimeout(() => {
      this.button.style.background = originalColor;
      this.button.style.borderColor = originalBorder;
      this.button.style.transform = this.isVisible ? 'scale(1)' : 'scale(0.8)';
    }, 200);
  }

  // Afficher un tooltip temporaire
  showTooltip(text, duration = 2000) {
    // Créer le tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'mobile-interact-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-family: Arial, sans-serif;
      white-space: nowrap;
      z-index: 2002;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
      max-width: 200px;
    `;

    document.body.appendChild(tooltip);

    // Animation d'apparition
    setTimeout(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    }, 10);

    // Suppression automatique
    setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 300);
    }, duration);
  }

  // Méthodes utilitaires
  isActive() {
    return this.isVisible;
  }

  getCurrentTarget() {
    return this.currentTarget;
  }

  // Nettoyage
  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    
    this.button = null;
    this.currentTarget = null;
    this.isVisible = false;
    
    console.log('📱 Mobile Interact Button destroyed');
  }
}

// Fonction utilitaire pour ajouter le CSS si nécessaire
export function ensureMobileInteractCSS() {
  if (document.querySelector('#mobile-interact-styles')) return;

  const style = document.createElement('style');
  style.id = 'mobile-interact-styles';
  style.textContent = `
    @keyframes mobileBtnPulse {
      0%, 100% { 
        transform: scale(1);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(100, 166, 255, 0.7);
      }
      50% { 
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 0 10px rgba(100, 166, 255, 0);
      }
    }

    .mobile-interact-btn.pulse {
      animation: mobileBtnPulse 1.5s ease-in-out infinite;
    }

    .mobile-interact-btn:active {
      transform: scale(0.95) !important;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
    }

    .mobile-interact-tooltip {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
    }

    /* Responsive positioning */
    @media screen and (max-width: 480px) {
      .mobile-interact-btn {
        width: 55px !important;
        height: 55px !important;
        font-size: 22px !important;
      }
    }

    @media screen and (orientation: landscape) and (max-height: 500px) {
      .mobile-interact-btn {
        bottom: 10px !important;
        width: 50px !important;
        height: 50px !important;
        font-size: 20px !important;
      }
      
      .mobile-interact-tooltip {
        bottom: 70px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
}
