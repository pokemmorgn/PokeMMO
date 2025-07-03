// client/src/managers/HealthBarManager.js - Système de barres de vie stylisées

export class HealthBarManager {
  constructor(scene) {
    this.scene = scene;
    
    // Barres de vie
    this.playerHealthBar = null;
    this.opponentHealthBar = null;
    
    // Configuration des couleurs authentiques
    this.healthColors = {
      high: 0x00FF00,     // Vert (>50% HP)
      medium: 0xFFFF00,   // Jaune (20-50% HP)  
      low: 0xFF0000,      // Rouge (<20% HP)
      exp: 0x0080FF,      // Bleu pour EXP
      border: 0xFFD700,   // Bordure dorée
      background: 0x2C2C2C // Fond gris foncé
    };
    
    // Émojis de statut
    this.statusEmojis = {
      normal: '',
      poison: '💜',
      burn: '🔥',
      paralysis: '⚡',
      sleep: '💤',
      freeze: '❄️'
    };
    
    // Positions des barres de vie authentiques
    this.healthBarPositions = {
      opponent: { x: 0.05, y: 0.10 },    // 5% gauche, 10% haut
      player: { x: 0.55, y: 0.70 }       // 55% gauche, 70% haut
    };
    
    console.log('🩺 [HealthBarManager] Initialisé pour la scène:', scene.scene.key);
  }

  // === CRÉATION DES BARRES DE VIE ===

  /**
   * Créer les barres de vie authentiques style Pokémon
   */
  createHealthBars() {
    console.log('🩺 [HealthBarManager] Création barres de vie stylisées...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Calculer positions absolues
    const opponentBarPos = {
      x: width * this.healthBarPositions.opponent.x,
      y: height * this.healthBarPositions.opponent.y
    };
    
    const playerBarPos = {
      x: width * this.healthBarPositions.player.x,
      y: height * this.healthBarPositions.player.y
    };
    
    // Créer barre adversaire (sans HP numérique ni EXP)
    this.opponentHealthBar = this.createHealthBarGroup(
      opponentBarPos.x, 
      opponentBarPos.y, 
      'opponent'
    );
    
    // Créer barre joueur (avec HP numérique et EXP)
    this.playerHealthBar = this.createHealthBarGroup(
      playerBarPos.x, 
      playerBarPos.y, 
      'player'
    );
    
    // Masquer initialement
    this.opponentHealthBar.container.setVisible(false);
    this.playerHealthBar.container.setVisible(false);
    
    console.log('✅ [HealthBarManager] Barres créées:', {
      opponent: opponentBarPos,
      player: playerBarPos
    });
  }

  /**
   * Créer un groupe de barre de vie stylisée
   */
  createHealthBarGroup(x, y, type) {
    console.log(`🎨 [HealthBarManager] Création barre ${type} à (${x}, ${y})`);
    
    const isPlayer = type === 'player';
    const barWidth = 300;
    const barHeight = 85;
    
    // Container principal
    const container = this.scene.add.container(x, y);
    container.setDepth(100);
    
    // Fond avec bordure dorée authentique
    const background = this.scene.add.graphics();
    background.fillStyle(this.healthColors.background, 0.9);
    background.lineStyle(4, this.healthColors.border, 1);
    
    // Fond principal
    background.fillRoundedRect(-5, -5, barWidth + 10, barHeight + 10, 8);
    background.strokeRoundedRect(-5, -5, barWidth + 10, barHeight + 10, 8);
    
    // Fond interne
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(0, 0, barWidth, barHeight, 5);
    
    container.add(background);
    
    // Nom du Pokémon (style authentique)
    const nameText = this.scene.add.text(10, 8, 'POKÉMON', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    container.add(nameText);
    
    // Niveau
    const levelText = this.scene.add.text(barWidth - 60, 8, 'Niv.50', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFF99',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    container.add(levelText);
    
    // Label HP
    const hpLabel = this.scene.add.text(10, 30, 'HP', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFA500',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    container.add(hpLabel);
    
    // Conteneur barre HP
    const hpBarBg = this.scene.add.graphics();
    hpBarBg.fillStyle(0x330000, 0.8);
    hpBarBg.fillRoundedRect(35, 28, 200, 12, 3);
    hpBarBg.lineStyle(1, 0x666666);
    hpBarBg.strokeRoundedRect(35, 28, 200, 12, 3);
    container.add(hpBarBg);
    
    // Barre HP colorée (dynamique)
    const hpBarFill = this.scene.add.graphics();
    container.add(hpBarFill);
    
    // Texte HP numérique (joueur uniquement)
    let hpText = null;
    if (isPlayer) {
      hpText = this.scene.add.text(245, 30, '18/18', {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      });
      container.add(hpText);
    }
    
    // Barre d'expérience (joueur uniquement)
    let expBar = null;
    if (isPlayer) {
      // Label EXP
      const expLabel = this.scene.add.text(10, 50, 'EXP', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#80C0FF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      });
      container.add(expLabel);
      
      // Fond barre EXP
      const expBarBg = this.scene.add.graphics();
      expBarBg.fillStyle(0x000033, 0.8);
      expBarBg.fillRoundedRect(35, 48, 200, 8, 2);
      expBarBg.lineStyle(1, 0x4080FF);
      expBarBg.strokeRoundedRect(35, 48, 200, 8, 2);
      container.add(expBarBg);
      
      // Barre EXP bleue
      expBar = this.scene.add.graphics();
      container.add(expBar);
    }
    
    // Icône de statut
    const statusIcon = this.scene.add.text(barWidth - 25, 50, '', {
      fontSize: '16px'
    });
    container.add(statusIcon);
    
    const healthBarGroup = {
      container,
      background,
      nameText,
      levelText,
      hpLabel,
      hpBarBg,
      hpBarFill,
      hpText,
      expBar,
      statusIcon,
      type
    };
    
    console.log(`✅ [HealthBarManager] Barre ${type} créée avec ${isPlayer ? 'EXP' : 'sans EXP'}`);
    return healthBarGroup;
  }

  // === MISE À JOUR DES BARRES ===

  /**
   * Mettre à jour la barre de vie du joueur
   */
  updatePlayerHealthBar(pokemonData) {
    if (!this.playerHealthBar || !pokemonData) return;
    
    console.log('🩺 [HealthBarManager] MAJ barre joueur:', pokemonData);
    
    const { nameText, levelText, hpBarFill, hpText, expBar, statusIcon } = this.playerHealthBar;
    
    // Mettre à jour nom et niveau
    nameText.setText(pokemonData.name?.toUpperCase() || 'POKÉMON');
    levelText.setText(`Niv.${pokemonData.level || '?'}`);
    
    // Calculer pourcentage HP
    const currentHp = pokemonData.currentHp || 0;
    const maxHp = pokemonData.maxHp || 1;
    const hpPercentage = Math.max(0, Math.min(1, currentHp / maxHp));
    
    // Couleur dynamique selon HP
    let hpColor = this.healthColors.high;
    if (hpPercentage <= 0.2) {
      hpColor = this.healthColors.low;
    } else if (hpPercentage <= 0.5) {
      hpColor = this.healthColors.medium;
    }
    
    // Animation fluide de la barre HP
    this.updateHealthBarFill(hpBarFill, hpPercentage, hpColor);
    
    // Texte HP numérique
    if (hpText) {
      hpText.setText(`${currentHp}/${maxHp}`);
      hpText.setColor(hpPercentage <= 0.2 ? '#FF6666' : '#FFFFFF');
    }
    
    // Barre d'expérience
    if (expBar && pokemonData.currentExp !== undefined && pokemonData.expToNext !== undefined) {
      const expPercentage = Math.max(0, Math.min(1, pokemonData.currentExp / pokemonData.expToNext));
      this.updateExpBar(expBar, expPercentage);
    }
    
    // Icône de statut
    const statusCondition = pokemonData.statusCondition || 'normal';
    const statusEmoji = this.statusEmojis[statusCondition] || '';
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    this.playerHealthBar.container.setVisible(true);
    
    // Animation d'entrée si première fois
    if (!this.playerHealthBar.container.getData('initialized')) {
      this.animateHealthBarEntry(this.playerHealthBar.container, 'right');
      this.playerHealthBar.container.setData('initialized', true);
    }
    
    console.log(`✅ [HealthBarManager] Barre joueur: ${currentHp}/${maxHp} (${Math.round(hpPercentage*100)}%)`);
  }

  /**
   * Mettre à jour la barre de vie de l'adversaire
   */
  updateOpponentHealthBar(pokemonData) {
    if (!this.opponentHealthBar || !pokemonData) return;
    
    console.log('🩺 [HealthBarManager] MAJ barre adversaire:', pokemonData);
    
    const { nameText, levelText, hpBarFill, statusIcon } = this.opponentHealthBar;
    
    // Mettre à jour nom et niveau
    nameText.setText(pokemonData.name?.toUpperCase() || 'POKÉMON');
    levelText.setText(`Niv.${pokemonData.level || '?'}`);
    
    // Calculer pourcentage HP
    const currentHp = pokemonData.currentHp || 0;
    const maxHp = pokemonData.maxHp || 1;
    const hpPercentage = Math.max(0, Math.min(1, currentHp / maxHp));
    
    // Couleur dynamique selon HP
    let hpColor = this.healthColors.high;
    if (hpPercentage <= 0.2) {
      hpColor = this.healthColors.low;
    } else if (hpPercentage <= 0.5) {
      hpColor = this.healthColors.medium;
    }
    
    // Animation fluide de la barre HP
    this.updateHealthBarFill(hpBarFill, hpPercentage, hpColor);
    
    // Icône de statut
    const statusCondition = pokemonData.statusCondition || 'normal';
    const statusEmoji = this.statusEmojis[statusCondition] || '';
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    this.opponentHealthBar.container.setVisible(true);
    
    // Animation d'entrée si première fois
    if (!this.opponentHealthBar.container.getData('initialized')) {
      this.animateHealthBarEntry(this.opponentHealthBar.container, 'left');
      this.opponentHealthBar.container.setData('initialized', true);
    }
    
    console.log(`✅ [HealthBarManager] Barre adversaire: ${Math.round(hpPercentage*100)}% HP`);
  }

  // === UTILITAIRES DE MISE À JOUR ===

  /**
   * Mettre à jour le remplissage d'une barre HP
   */
  updateHealthBarFill(hpBarFill, percentage, color) {
    hpBarFill.clear();
    hpBarFill.fillStyle(color, 0.9);
    
    const barWidth = 200 * percentage;
    if (barWidth > 0) {
      hpBarFill.fillRoundedRect(37, 30, barWidth, 8, 2);
      
      // Effet de brillance
      hpBarFill.fillStyle(color, 0.6);
      hpBarFill.fillRoundedRect(37, 30, barWidth, 3, 1);
    }
  }

  /**
   * Mettre à jour la barre d'expérience
   */
  updateExpBar(expBar, percentage) {
    expBar.clear();
    expBar.fillStyle(this.healthColors.exp, 0.8);
    
    const expWidth = 200 * percentage;
    if (expWidth > 0) {
      expBar.fillRoundedRect(37, 50, expWidth, 4, 1);
      
      // Effet de brillance EXP
      expBar.fillStyle(this.healthColors.exp, 0.5);
      expBar.fillRoundedRect(37, 50, expWidth, 2, 1);
    }
  }

  // === ANIMATIONS ===

  /**
   * Animation d'entrée des barres de vie
   */
  animateHealthBarEntry(container, direction) {
    if (!container) return;
    
    const originalX = container.x;
    const originalY = container.y;
    
    // Position de départ hors écran
    const startX = direction === 'left' ? -400 : this.scene.cameras.main.width + 400;
    container.setPosition(startX, originalY);
    container.setAlpha(0);
    
    // Animation d'entrée élégante
    this.scene.tweens.add({
      targets: container,
      x: originalX,
      alpha: 1,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Petit rebond final
        this.scene.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 200,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  /**
   * Animation de dégâts sur barre HP
   */
  animateHealthBarDamage(healthBarGroup, fromHp, toHp, maxHp) {
    if (!healthBarGroup || !healthBarGroup.hpBarFill) return;
    
    const fromPercentage = Math.max(0, Math.min(1, fromHp / maxHp));
    const toPercentage = Math.max(0, Math.min(1, toHp / maxHp));
    
    console.log(`💥 [HealthBarManager] Animation dégâts: ${fromHp}→${toHp} (${Math.round(fromPercentage*100)}%→${Math.round(toPercentage*100)}%)`);
    
    // Animation progressive de la barre
    this.scene.tweens.addCounter({
      from: fromPercentage,
      to: toPercentage,
      duration: 1000,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const currentPercentage = tween.getValue();
        
        // Recalculer couleur
        let hpColor = this.healthColors.high;
        if (currentPercentage <= 0.2) {
          hpColor = this.healthColors.low;
        } else if (currentPercentage <= 0.5) {
          hpColor = this.healthColors.medium;
        }
        
        // Redessiner barre
        this.updateHealthBarFill(healthBarGroup.hpBarFill, currentPercentage, hpColor);
      },
      onComplete: () => {
        // Mettre à jour texte HP final si joueur
        if (healthBarGroup.hpText) {
          healthBarGroup.hpText.setText(`${toHp}/${maxHp}`);
          healthBarGroup.hpText.setColor(toPercentage <= 0.2 ? '#FF6666' : '#FFFFFF');
        }
      }
    });
  }

  /**
   * Animation barre d'expérience
   */
  animateExperienceGain(fromExp, toExp, maxExp) {
    if (!this.playerHealthBar?.expBar) return;
    
    console.log(`✨ [HealthBarManager] Animation EXP: ${fromExp}→${toExp}/${maxExp}`);
    
    this.scene.tweens.addCounter({
      from: fromExp / maxExp,
      to: toExp / maxExp,
      duration: 1500,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const currentPercentage = tween.getValue();
        this.updateExpBar(this.playerHealthBar.expBar, currentPercentage);
      }
    });
  }

  // === ACTIONS DE COMBAT ===

  /**
   * Simuler des dégâts sur le joueur
   */
  simulatePlayerDamage(damage, currentPokemon) {
    if (!currentPokemon || !this.playerHealthBar) {
      console.warn('⚠️ [HealthBarManager] Pas de Pokémon joueur pour simuler dégâts');
      return;
    }
    
    const fromHp = currentPokemon.currentHp;
    const toHp = Math.max(0, fromHp - damage);
    
    console.log(`💥 [HealthBarManager] Dégâts joueur: ${damage} (${fromHp}→${toHp})`);
    
    // Mettre à jour données
    currentPokemon.currentHp = toHp;
    
    // Animation des dégâts
    this.animateHealthBarDamage(
      this.playerHealthBar,
      fromHp,
      toHp,
      currentPokemon.maxHp
    );
    
    return toHp;
  }

  /**
   * Simuler des dégâts sur l'adversaire
   */
  simulateOpponentDamage(damage, currentPokemon) {
    if (!currentPokemon || !this.opponentHealthBar) {
      console.warn('⚠️ [HealthBarManager] Pas de Pokémon adversaire pour simuler dégâts');
      return;
    }
    
    const fromHp = currentPokemon.currentHp;
    const toHp = Math.max(0, fromHp - damage);
    
    console.log(`💥 [HealthBarManager] Dégâts adversaire: ${damage} (${fromHp}→${toHp})`);
    
    // Mettre à jour données
    currentPokemon.currentHp = toHp;
    
    // Animation des dégâts
    this.animateHealthBarDamage(
      this.opponentHealthBar,
      fromHp,
      toHp,
      currentPokemon.maxHp
    );
    
    return toHp;
  }

  /**
   * Ajouter de l'expérience
   */
  addExperience(expGained, currentPokemon) {
    if (!currentPokemon || !this.playerHealthBar?.expBar) {
      console.warn('⚠️ [HealthBarManager] Pas de Pokémon joueur pour ajouter EXP');
      return;
    }
    
    const fromExp = currentPokemon.currentExp;
    const toExp = Math.min(currentPokemon.expToNext, fromExp + expGained);
    
    console.log(`✨ [HealthBarManager] Gain EXP: +${expGained} (${fromExp}→${toExp})`);
    
    // Mettre à jour données
    currentPokemon.currentExp = toExp;
    
    // Animation de la barre EXP
    this.animateExperienceGain(fromExp, toExp, currentPokemon.expToNext);
    
    return toExp;
  }

  /**
   * Changer le statut d'un Pokémon
   */
  changeStatus(pokemonType, newStatus, currentPokemon) {
    const healthBar = pokemonType === 'player' ? this.playerHealthBar : this.opponentHealthBar;
    
    if (!currentPokemon || !healthBar) {
      console.warn(`⚠️ [HealthBarManager] Impossible de changer statut ${pokemonType}`);
      return;
    }
    
    console.log(`🔮 [HealthBarManager] Statut ${pokemonType}: ${currentPokemon.statusCondition}→${newStatus}`);
    
    currentPokemon.statusCondition = newStatus;
    const statusEmoji = this.statusEmojis[newStatus] || '';
    healthBar.statusIcon.setText(statusEmoji);
    
    // Animation de changement de statut
    this.scene.tweens.add({
      targets: healthBar.statusIcon,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut'
    });
    
    return newStatus;
  }

  // === GESTION DE L'ÉTAT ===

  /**
   * Afficher les barres
   */
  showHealthBars() {
    if (this.playerHealthBar) {
      this.playerHealthBar.container.setVisible(true);
    }
    if (this.opponentHealthBar) {
      this.opponentHealthBar.container.setVisible(true);
    }
    console.log('👁️ [HealthBarManager] Barres affichées');
  }

  /**
   * Masquer les barres
   */
  hideHealthBars() {
    if (this.playerHealthBar) {
      this.playerHealthBar.container.setVisible(false);
    }
    if (this.opponentHealthBar) {
      this.opponentHealthBar.container.setVisible(false);
    }
    console.log('🙈 [HealthBarManager] Barres masquées');
  }

  /**
   * Nettoyer les barres de vie
   */
  clearHealthBars() {
    console.log('🧹 [HealthBarManager] Nettoyage barres de vie...');
    
    if (this.playerHealthBar) {
      this.playerHealthBar.container.setVisible(false);
      this.playerHealthBar.container.setData('initialized', false);
    }
    
    if (this.opponentHealthBar) {
      this.opponentHealthBar.container.setVisible(false);
      this.opponentHealthBar.container.setData('initialized', false);
    }
    
    console.log('✅ [HealthBarManager] Barres nettoyées');
  }

  /**
   * Détruire le manager et ses ressources
   */
  destroy() {
    console.log('💀 [HealthBarManager] Destruction...');
    
    if (this.playerHealthBar) {
      this.playerHealthBar.container.destroy();
      this.playerHealthBar = null;
    }
    
    if (this.opponentHealthBar) {
      this.opponentHealthBar.container.destroy();
      this.opponentHealthBar = null;
    }
    
    this.scene = null;
    
    console.log('✅ [HealthBarManager] Détruit');
  }

  // === DEBUG ===

  /**
   * Debug des barres de vie
   */
  debugHealthBars() {
    console.log('🔍 [HealthBarManager] === DEBUG BARRES DE VIE ===');
    
    if (this.playerHealthBar) {
      console.log('👤 Barre joueur:', {
        visible: this.playerHealthBar.container.visible,
        position: `${this.playerHealthBar.container.x}, ${this.playerHealthBar.container.y}`,
        initialized: this.playerHealthBar.container.getData('initialized')
      });
    } else {
      console.log('👤 Barre joueur: Non créée');
    }
    
    if (this.opponentHealthBar) {
      console.log('👹 Barre adversaire:', {
        visible: this.opponentHealthBar.container.visible,
        position: `${this.opponentHealthBar.container.x}, ${this.opponentHealthBar.container.y}`,
        initialized: this.opponentHealthBar.container.getData('initialized')
      });
    } else {
      console.log('👹 Barre adversaire: Non créée');
    }
    
    console.log('🔍 === FIN DEBUG BARRES ===');
  }
}

console.log('✅ [HealthBarManager] Module chargé - Système de barres de vie stylisées modulaire');
