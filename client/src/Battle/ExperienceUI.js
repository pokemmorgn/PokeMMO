// client/src/Battle/ExperienceUI.js - Version CORRIGÉE pour nouveau format serveur
// 🎮 Interface d'expérience qui apparaît après les combats
// ✨ Animations fluides et effets visuels

export class ExperienceUI {
  constructor(scene) {
    this.scene = scene;
    
    // État
    this.isVisible = false;
    this.isAnimating = false;
    this.currentQueue = [];
    
    // Éléments Phaser
    this.container = null;
    this.backgroundPanel = null;
    this.pokemonNameText = null;
    this.expGainedText = null;
    this.expBar = null;
    this.levelText = null;
    this.particleEmitters = [];
    
    // Configuration
    this.config = {
      width: 400,
      height: 120,
      animationDuration: 800,
      expFillDuration: 1200,
      levelUpDuration: 1000,
      showDuration: 3000
    };
    
    console.log('🎮 [ExperienceUI] Instance créée');
  }
  
  // === INITIALISATION ===
  
  initialize() {
    if (this.container) {
      console.log('⚠️ [ExperienceUI] Déjà initialisé');
      return;
    }
    
    console.log('🔧 [ExperienceUI] Initialisation...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Container principal (hors écran au début)
    this.container = this.scene.add.container(width / 2, height + 100);
    this.container.setDepth(300); // Au-dessus de tout
    this.container.setVisible(false);
    
    this.createBackground();
    this.createTexts();
    this.createExpBar();
    
    console.log('✅ [ExperienceUI] Initialisé');
  }
  
  createBackground() {
    const { width, height } = this.config;
    
    // Panel principal avec style Pokémon
    this.backgroundPanel = this.scene.add.graphics();
    
    // Fond avec gradient
    this.backgroundPanel.fillGradientStyle(0x1a237e, 0x1a237e, 0x0d47a1, 0x0d47a1);
    this.backgroundPanel.fillRoundedRect(-width/2, -height/2, width, height, 15);
    
    // Bordure dorée
    this.backgroundPanel.lineStyle(3, 0xFFD700, 1);
    this.backgroundPanel.strokeRoundedRect(-width/2, -height/2, width, height, 15);
    
    // Bordure intérieure
    this.backgroundPanel.lineStyle(2, 0x64B5F6, 0.8);
    this.backgroundPanel.strokeRoundedRect(-width/2 + 3, -height/2 + 3, width - 6, height - 6, 12);
    
    // Effet de brillance en haut
    this.backgroundPanel.fillStyle(0xffffff, 0.1);
    this.backgroundPanel.fillRoundedRect(-width/2 + 5, -height/2 + 5, width - 10, height/3, 10);
    
    this.container.add(this.backgroundPanel);
  }
  
  createTexts() {
    // Nom du Pokémon
    this.pokemonNameText = this.scene.add.text(0, -35, '', {
      fontSize: '18px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold',
      align: 'center'
    });
    this.pokemonNameText.setOrigin(0.5);
    
    // XP gagnée
    this.expGainedText = this.scene.add.text(0, -10, '', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#FFD700',
      fontWeight: 'bold',
      align: 'center'
    });
    this.expGainedText.setOrigin(0.5);
    
    // Niveau
    this.levelText = this.scene.add.text(0, 35, '', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#81C784',
      fontWeight: 'bold',
      align: 'center'
    });
    this.levelText.setOrigin(0.5);
    
    this.container.add([this.pokemonNameText, this.expGainedText, this.levelText]);
  }
  
  createExpBar() {
    const barWidth = 300;
    const barHeight = 12;
    
    // Container pour la barre XP
    this.expBar = {
      container: this.scene.add.container(0, 15),
      background: this.scene.add.graphics(),
      fill: this.scene.add.graphics(),
      width: barWidth,
      height: barHeight,
      currentPercent: 0
    };
    
    // Background de la barre
    this.expBar.background.fillStyle(0x000000, 0.6);
    this.expBar.background.fillRoundedRect(-barWidth/2, -barHeight/2, barWidth, barHeight, 6);
    this.expBar.background.lineStyle(2, 0x424242, 1);
    this.expBar.background.strokeRoundedRect(-barWidth/2, -barHeight/2, barWidth, barHeight, 6);
    
    this.expBar.container.add([this.expBar.background, this.expBar.fill]);
    this.container.add(this.expBar.container);
  }
  
  // === AFFICHAGE PUBLIC ===
  
  /**
   * Afficher les gains d'expérience
   * @param {Object} data - Données d'expérience depuis le serveur (nouveau format)
   */
  async showExperienceGain(data) {
    console.log('📈 [ExperienceUI] Affichage gain XP:', data);
    
    if (this.isAnimating) {
      console.log('⏳ [ExperienceUI] Ajout à la queue');
      this.currentQueue.push(data);
      return;
    }
    
    if (!this.container) {
      this.initialize();
    }
    
    this.isAnimating = true;
    
    try {
      await this.playExperienceSequence(data);
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur séquence XP:', error);
    } finally {
      this.isAnimating = false;
      this.processQueue();
    }
  }
  
  async playExperienceSequence(data) {
    console.log('🎮 [ExperienceUI] === SÉQUENCE XP (NOUVEAU FORMAT) ===');
    console.log('📊 Données complètes:', data);
    
    // 🆕 ADAPTATION AU NOUVEAU FORMAT
    const pokemon = data.pokemon || {};
    const experience = data.experience || {};
    const progression = data.progression || {};
    const levelData = progression.level || {};
    
    console.log('🐾 Pokémon:', {
      name: pokemon.name,
      niveau: levelData.current
    });
    
    console.log('💰 Expérience:', {
      gained: experience.gained,
      expInLevel: `${levelData.expInLevelBefore} → ${levelData.expInLevelAfter}`,
      expNeeded: levelData.expNeededForLevel,
      progress: `${(levelData.progressBefore * 100).toFixed(2)}% → ${(levelData.progressAfter * 100).toFixed(2)}%`
    });
    
    // Mettre à jour les textes
    this.pokemonNameText.setText(pokemon.name?.toUpperCase() || 'POKÉMON');
    this.expGainedText.setText(`+${experience.gained || 0} EXP!`);
    this.levelText.setText(`Niveau ${levelData.current || '?'}`);
    
    // Animation d'entrée
    await this.animateEntry();
    
    // 🆕 ANIMATION XP AVEC NOUVEAU FORMAT
    if (data.levelUp?.hasLeveledUp) {
      await this.animateLevelUpSequence(data);
    } else {
      await this.animateSimpleProgression(levelData);
    }
    
    // Animation de sortie
    await this.animateExit();
  }
  
  // 🆕 NOUVELLE MÉTHODE : Animation progression simple (pas de level up)
  async animateSimpleProgression(levelData) {
    console.log('📊 [ExperienceUI] Animation progression simple');
    
    const fromPercent = levelData.progressBefore || 0;
    const toPercent = levelData.progressAfter || 0;
    
    console.log(`📈 [ExperienceUI] XP: ${levelData.expInLevelBefore}/${levelData.expNeededForLevel} → ${levelData.expInLevelAfter}/${levelData.expNeededForLevel}`);
    console.log(`📊 [ExperienceUI] Progress: ${(fromPercent * 100).toFixed(2)}% → ${(toPercent * 100).toFixed(2)}%`);
    
    await this.animateExpBarFill(fromPercent, toPercent);
  }
  
  // 🆕 NOUVELLE MÉTHODE : Animation avec level up
  async animateLevelUpSequence(data) {
    console.log('🆙 [ExperienceUI] Animation avec level up');
    
    const levelData = data.progression.level;
    const levelUp = data.levelUp;
    
    // Remplir jusqu'à 100% du niveau actuel
    await this.animateExpBarFill(levelData.progressBefore, 1.0);
    
    // Animation level up
    await this.animateLevelUp(levelData.current + 1);
    
    // Si plusieurs niveaux gagnés
    if (levelUp.levelsGained > 1) {
      for (let i = 1; i < levelUp.levelsGained; i++) {
        await this.animateExpBarFill(0, 1.0);
        await this.animateLevelUp(levelData.current + i + 1);
      }
    }
    
    // Position finale dans le nouveau niveau
    const finalProgress = levelData.progressAfter || 0;
    this.levelText.setText(`Niveau ${levelData.current + levelUp.levelsGained}`);
    await this.animateExpBarFill(0, finalProgress);
  }
  
  animateExpBarFill(fromPercent, toPercent) {
    return new Promise((resolve) => {
      console.log(`📊 [ExperienceUI] Animation XP: ${(fromPercent * 100).toFixed(2)}% → ${(toPercent * 100).toFixed(2)}%`);
      
      // Mettre la barre à la position de départ
      this.updateExpBarVisual(fromPercent);
      this.expBar.currentPercent = fromPercent;
      
      this.scene.tweens.add({
        targets: { value: fromPercent },
        value: toPercent,
        duration: this.config.expFillDuration,
        ease: 'Power2.easeOut',
        onUpdate: (tween) => {
          const percent = tween.targets[0].value;
          this.updateExpBarVisual(percent);
        },
        onComplete: () => {
          this.expBar.currentPercent = toPercent;
          console.log(`✅ [ExperienceUI] Animation terminée à ${(toPercent * 100).toFixed(2)}%`);
          resolve();
        }
      });
    });
  }
  
  updateExpBarVisual(percentage) {
    const { width, height } = this.expBar;
    const fillWidth = Math.max(0, width * percentage);
    
    this.expBar.fill.clear();
    
    if (fillWidth > 0) {
      // Gradient bleu XP
      this.expBar.fill.fillGradientStyle(0x42A5F5, 0x42A5F5, 0x1976D2, 0x1976D2);
      this.expBar.fill.fillRoundedRect(-width/2, -height/2, fillWidth, height, 6);
      
      // Brillance
      this.expBar.fill.fillStyle(0xffffff, 0.3);
      this.expBar.fill.fillRoundedRect(-width/2, -height/2, Math.max(0, fillWidth), height/3, 4);
    }
  }
  
  // === ANIMATIONS ===
  
  animateEntry() {
    return new Promise((resolve) => {
      const { height } = this.scene.cameras.main;
      
      this.container.setVisible(true);
      this.container.y = height + 100;
      this.container.setAlpha(0);
      this.container.setScale(0.8);
      
      // Slide depuis le bas
      this.scene.tweens.add({
        targets: this.container,
        y: height - 150,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: this.config.animationDuration,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Effet d'apparition avec particules
          this.createEntryParticles();
          resolve();
        }
      });
    });
  }
  
  animateLevelUp(newLevel) {
    return new Promise((resolve) => {
      console.log('🆙 [ExperienceUI] Animation Level Up:', newLevel);
      
      // Flash doré
      const flash = this.scene.add.graphics();
      flash.fillStyle(0xFFD700, 0.8);
      flash.fillCircle(0, 0, 250);
      flash.setDepth(290);
      this.container.add(flash);
      
      // Animation du flash
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: this.config.levelUpDuration,
        ease: 'Power2.easeOut',
        onComplete: () => {
          flash.destroy();
        }
      });
      
      // Animation du texte niveau
      this.levelText.setText(`Niveau ${newLevel}`);
      this.scene.tweens.add({
        targets: this.levelText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        yoyo: true,
        ease: 'Power2.easeOut'
      });
      
      // Particules level up
      this.createLevelUpParticles();
      
      // Reset barre XP
      this.expBar.currentPercent = 0;
      this.updateExpBarVisual(0);
      
      setTimeout(resolve, this.config.levelUpDuration);
    });
  }
  
  animateExit() {
    return new Promise((resolve) => {
      const { height } = this.scene.cameras.main;
      
      setTimeout(() => {
        this.scene.tweens.add({
          targets: this.container,
          y: height + 100,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: this.config.animationDuration,
          ease: 'Back.easeIn',
          onComplete: () => {
            this.container.setVisible(false);
            this.isVisible = false;
            resolve();
          }
        });
      }, this.config.showDuration);
    });
  }
  
  // === EFFETS VISUELS ===
  
  createEntryParticles() {
    // Particules d'apparition bleues
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const particle = this.scene.add.text(
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 80,
          '✦',
          {
            fontSize: '16px',
            color: '#64B5F6'
          }
        );
        
        this.container.add(particle);
        
        this.scene.tweens.add({
          targets: particle,
          alpha: 0,
          y: particle.y - 40,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 1500,
          ease: 'Power2.easeOut',
          onComplete: () => particle.destroy()
        });
      }, i * 100);
    }
  }
  
  createLevelUpParticles() {
    // Particules level up dorées
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 60;
      
      const particle = this.scene.add.text(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        '★',
        {
          fontSize: '20px',
          color: '#FFD700'
        }
      );
      
      this.container.add(particle);
      
      this.scene.tweens.add({
        targets: particle,
        alpha: 0,
        x: particle.x * 2,
        y: particle.y * 2,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 1200,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  // === GESTION FILE D'ATTENTE ===
  
  processQueue() {
    if (this.currentQueue.length > 0) {
      const nextData = this.currentQueue.shift();
      setTimeout(() => {
        this.showExperienceGain(nextData);
      }, 500);
    }
  }
  
  // === CONTRÔLES PUBLICS ===
  
  isReady() {
    return this.container !== null;
  }
  
  forceHide() {
    if (this.container) {
      this.container.setVisible(false);
      this.isVisible = false;
      this.isAnimating = false;
    }
  }
  
  destroy() {
    this.forceHide();
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    this.currentQueue = [];
    console.log('🗑️ [ExperienceUI] Détruit');
  }
}
