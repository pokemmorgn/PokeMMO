// client/src/Battle/ExperienceUI.js - VERSION CORRIGÉE avec système de traductions
// 🎮 Interface d'expérience qui apparaît après les combats
// ✨ Animations fluides et effets visuels
// 🌐 NOUVEAU: Support complet système de traductions

import { getLocalizationManager, getPokemonNameT, battleT } from '../managers/LocalizationManager.js';

export class ExperienceUI {
  constructor(scene) {
    this.scene = scene;
    
    // État
    this.isVisible = false;
    this.isAnimating = false;
    this.currentQueue = [];
    
    // 🌐 NOUVEAU: Gestionnaire de traductions
    this.localizationManager = getLocalizationManager();
    
    // 🔥 NOUVEAU: Données pokémon courantes pour re-traduction
    this.currentPokemonData = null;
    this.currentExperienceData = null;
    
    // 🎧 NOUVEAU: Listeners pour changements de langue
    this.languageUnsubscribe = null;
    this.localizationUnsubscribe = null;
    
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
    
    console.log('🎮 [ExperienceUI] Instance créée avec support traductions + listeners');
    
    // 🎧 Configurer les listeners au constructeur
    this.setupLanguageListeners();
  }
  
  // === 🎧 GESTION LISTENERS LANGUE ===
  
  /**
   * 🎧 Configurer les listeners pour les changements de langue
   */
  setupLanguageListeners() {
    try {
      // 1. Écouter OptionsManager si disponible
      if (window.optionsSystem && window.optionsSystem.addLanguageListener) {
        console.log('🎧 [ExperienceUI] Écoute OptionsManager...');
        
        this.languageUnsubscribe = window.optionsSystem.addLanguageListener((newLang, oldLang) => {
          console.log(`🌐 [ExperienceUI] Changement langue OptionsManager: ${oldLang} → ${newLang}`);
          this.onLanguageChanged(newLang, oldLang);
        });
        
        console.log('✅ [ExperienceUI] Listener OptionsManager configuré');
      }
      
      // 2. Écouter LocalizationManager
      if (this.localizationManager && typeof this.localizationManager.addLanguageListener === 'function') {
        console.log('🎧 [ExperienceUI] Écoute LocalizationManager...');
        
        this.localizationUnsubscribe = this.localizationManager.addLanguageListener((newLang, oldLang) => {
          console.log(`🌐 [ExperienceUI] Changement langue LocalizationManager: ${oldLang} → ${newLang}`);
          this.onLanguageChanged(newLang, oldLang);
        });
        
        console.log('✅ [ExperienceUI] Listener LocalizationManager configuré');
      }
      
      // 3. Écouter événements window globaux
      this.setupGlobalLanguageEvents();
      
    } catch (error) {
      console.warn('⚠️ [ExperienceUI] Erreur setup listeners langue:', error);
    }
  }
  
  /**
   * 🎧 Configurer les événements globaux de langue
   */
  setupGlobalLanguageEvents() {
    // Événement custom pour changements de langue
    this.handleLanguageChanged = (event) => {
      const newLang = event.detail?.newLanguage || event.detail?.language;
      if (newLang) {
        console.log(`🌐 [ExperienceUI] Changement langue global: ${newLang}`);
        this.onLanguageChanged(newLang);
      }
    };
    
    // Événement modules localization mis à jour
    this.handleModulesUpdated = (event) => {
      const detail = event.detail || {};
      if (detail.newModules && (detail.newModules.includes('battle') || detail.newModules.includes('pokemon'))) {
        console.log('🔄 [ExperienceUI] Modules battle mis à jour, refresh traductions');
        this.refreshCurrentTranslations();
      }
    };
    
    window.addEventListener('languageChanged', this.handleLanguageChanged);
    window.addEventListener('localizationModulesUpdated', this.handleModulesUpdated);
    
    console.log('🎧 [ExperienceUI] Événements globaux configurés');
  }
  
  /**
   * 🎧 Gestionnaire principal de changement de langue
   * @param {string} newLang - Nouvelle langue
   * @param {string} oldLang - Ancienne langue (optionnel)
   */
  onLanguageChanged(newLang, oldLang = null) {
    try {
      console.log(`🌐 [ExperienceUI] === CHANGEMENT LANGUE: ${oldLang || '?'} → ${newLang} ===`);
      
      // Pré-charger les traductions pokémon pour la nouvelle langue
      this.preloadPokemonTranslations(newLang);
      
      // Mettre à jour les textes affichés si UI visible
      if (this.isVisible && this.container && this.container.visible) {
        console.log('🔄 [ExperienceUI] UI visible - mise à jour traductions...');
        this.refreshCurrentTranslations();
      }
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur changement langue:', error);
    }
  }
  
  /**
   * 🔄 Rafraîchir les traductions courantes
   */
  refreshCurrentTranslations() {
    if (!this.currentPokemonData || !this.currentExperienceData) {
      console.log('ℹ️ [ExperienceUI] Pas de données courantes à rafraîchir');
      return;
    }
    
    try {
      console.log('🔄 [ExperienceUI] Rafraîchissement traductions avec données courantes...');
      
      const pokemon = this.currentPokemonData;
      const experience = this.currentExperienceData;
      const levelData = this.currentExperienceData.progression?.level || {};
      
      // Re-calculer les traductions
      const displayName = this.getPokemonDisplayName(pokemon);
      const expText = this.getExpGainedText(experience.gained || 0, pokemon); // 🔥 Passer pokemon aussi
      const levelText = this.getLevelText(levelData.current || 1);
      
      // Mettre à jour l'UI si existante
      if (this.pokemonNameText) {
        this.pokemonNameText.setText(displayName.toUpperCase());
        console.log(`🔄 [ExperienceUI] Nom mis à jour: ${displayName}`);
      }
      
      if (this.expGainedText) {
        this.expGainedText.setText(expText);
        console.log(`🔄 [ExperienceUI] EXP mis à jour: ${expText}`);
      }
      
      if (this.levelText) {
        this.levelText.setText(levelText);
        console.log(`🔄 [ExperienceUI] Niveau mis à jour: ${levelText}`);
      }
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur rafraîchissement traductions:', error);
    }
  }
  
  /**
   * 🔄 Pré-charger les traductions pokémon pour une langue
   * @param {string} lang - Code langue
   */
  async preloadPokemonTranslations(lang) {
    try {
      if (this.localizationManager && this.localizationManager.loadPokemonForLanguage) {
        console.log(`📥 [ExperienceUI] Pré-chargement pokémon pour ${lang}...`);
        
        const success = await this.localizationManager.loadPokemonForLanguage(lang);
        if (success) {
          console.log(`✅ [ExperienceUI] Pokémon ${lang} pré-chargés`);
        } else {
          console.warn(`⚠️ [ExperienceUI] Échec pré-chargement pokémon ${lang}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [ExperienceUI] Erreur pré-chargement pokémon:', error);
    }
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
  
  // === 🌐 NOUVELLES MÉTHODES DE TRADUCTION ===
  
  /**
   * 🌐 Obtenir le nom traduit d'un Pokémon
   * @param {Object} pokemon - Données pokémon du serveur
   * @returns {string} Nom traduit
   */
  getPokemonDisplayName(pokemon) {
    try {
      // 1. Essayer avec l'ID si disponible
      if (pokemon.id) {
        const translatedName = getPokemonNameT(pokemon.id);
        if (translatedName && translatedName !== `Pokémon #${pokemon.id}`) {
          console.log(`🌐 [ExperienceUI] Nom traduit via ID ${pokemon.id}: ${translatedName}`);
          return translatedName;
        }
      }
      
      // 2. Essayer avec le nom si c'est un ID numérique
      if (pokemon.name && /^\d+$/.test(pokemon.name)) {
        const translatedName = getPokemonNameT(pokemon.name);
        if (translatedName && translatedName !== `Pokémon #${pokemon.name}`) {
          console.log(`🌐 [ExperienceUI] Nom traduit via name-ID ${pokemon.name}: ${translatedName}`);
          return translatedName;
        }
      }
      
      // 3. Essayer d'extraire l'ID depuis "POKEMON #7"
      if (pokemon.name && pokemon.name.includes('#')) {
        const idMatch = pokemon.name.match(/#(\d+)/);
        if (idMatch) {
          const id = idMatch[1];
          const translatedName = getPokemonNameT(id);
          if (translatedName && translatedName !== `Pokémon #${id}`) {
            console.log(`🌐 [ExperienceUI] Nom traduit via extraction ID ${id}: ${translatedName}`);
            return translatedName;
          }
        }
      }
      
      // 4. Fallback: utiliser le nom du serveur si pas de #
      if (pokemon.name && !pokemon.name.includes('#')) {
        console.log(`🌐 [ExperienceUI] Utilisation nom serveur: ${pokemon.name}`);
        return pokemon.name;
      }
      
      // 5. Dernier fallback
      const fallbackName = battleT('messages.pokemon_unknown', {}, 'Pokémon inconnu');
      console.warn(`⚠️ [ExperienceUI] Aucune traduction trouvée pour:`, pokemon);
      return fallbackName;
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur traduction nom pokémon:', error);
      return pokemon.name || 'Pokémon';
    }
  }
  
  /**
   * 🌐 Obtenir le texte d'expérience traduit
   * @param {number} expGained - XP gagnée
   * @param {Object} pokemon - Données pokémon pour le nom
   * @returns {string} Texte traduit
   */
  getExpGainedText(expGained, pokemon = null) {
    try {
      // Si on a les données pokémon, utiliser la traduction complète
      if (pokemon) {
        const pokemonName = this.getPokemonDisplayName(pokemon);
        
        // Utiliser la traduction avec variables pokémon + exp
        const message = battleT('messages.exp_gained', { 
          pokemon: pokemonName, 
          exp: expGained 
        });
        
        // Si trouvé, retourner
        if (message !== 'battle.ui.messages.exp_gained') {
          return message;
        }
      }
      
      // Fallback : juste "+XXX EXP!" sans nom pokémon
      const simpleMessage = battleT('messages.exp_points_gained', { exp: expGained });
      if (simpleMessage !== 'battle.ui.messages.exp_points_gained') {
        return simpleMessage;
      }
      
      // Dernier fallback manuel
      return `+${expGained} EXP!`;
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur traduction XP:', error);
      return `+${expGained} EXP!`;
    }
  }
  
  /**
   * 🌐 Obtenir le texte de niveau traduit
   * @param {number} level - Niveau
   * @returns {string} Texte traduit
   */
  getLevelText(level) {
    try {
      // Utiliser le format de niveau depuis battle UI
      const levelFormat = battleT('health.level_format', { level });
      
      // Si pas trouvé, utiliser format par défaut
      if (levelFormat === 'battle.ui.health.level_format') {
        return `Niveau ${level}`;
      }
      
      return levelFormat;
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur traduction niveau:', error);
      return `Niveau ${level}`;
    }
  }
  
  /**
   * 🌐 Obtenir le texte de level up traduit
   * @param {number} newLevel - Nouveau niveau
   * @returns {string} Texte traduit
   */
  getLevelUpText(newLevel) {
    try {
      // Utiliser la traduction avec variable
      const message = battleT('messages.level_up', { level: newLevel });
      
      // Si pas trouvé, fallback manuel
      if (message === 'battle.ui.messages.level_up') {
        return `Niveau ${newLevel} atteint !`;
      }
      
      return message;
      
    } catch (error) {
      console.error('❌ [ExperienceUI] Erreur traduction level up:', error);
      return `Niveau ${newLevel} atteint !`;
    }
  }
  
  // === AFFICHAGE PUBLIC (MODIFIÉ) ===
  
  /**
   * Afficher les gains d'expérience
   * @param {Object} data - Données d'expérience depuis le serveur (nouveau format)
   */
  async showExperienceGain(data) {
    console.log('📈 [ExperienceUI] Affichage gain XP avec traductions:', data);
    
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
    console.log('🎮 [ExperienceUI] === SÉQUENCE XP AVEC TRADUCTIONS ===');
    console.log('📊 Données complètes:', data);
    
    // 🔥 NOUVEAU: Stocker les données courantes pour re-traduction
    this.currentPokemonData = data.pokemon || {};
    this.currentExperienceData = data;
    
    // 🆕 ADAPTATION AU NOUVEAU FORMAT
    const pokemon = data.pokemon || {};
    const experience = data.experience || {};
    const progression = data.progression || {};
    const levelData = progression.level || {};
    
    console.log('🐾 Pokémon brut:', {
      name: pokemon.name,
      id: pokemon.id,
      niveau: levelData.current
    });
    
    // 🌐 NOUVEAU: Utiliser les traductions
    const displayName = this.getPokemonDisplayName(pokemon);
    const expText = this.getExpGainedText(experience.gained || 0, pokemon); // 🔥 Passer pokemon aussi
    const levelText = this.getLevelText(levelData.current || 1);
    
    console.log('🌐 Traductions appliquées:', {
      displayName,
      expText,
      levelText
    });
    
    // Mettre à jour les textes AVEC TRADUCTIONS
    this.pokemonNameText.setText(displayName.toUpperCase());
    this.expGainedText.setText(expText);
    this.levelText.setText(levelText);
    
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
    
    // 🔥 NOUVEAU: Nettoyer les données courantes après animation
    setTimeout(() => {
      this.currentPokemonData = null;
      this.currentExperienceData = null;
    }, 1000);
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
  
  // 🆕 NOUVELLE MÉTHODE : Animation avec level up (MODIFIÉ AVEC TRADUCTIONS)
  async animateLevelUpSequence(data) {
    console.log('🆙 [ExperienceUI] Animation avec level up');
    
    const levelData = data.progression.level;
    const levelUp = data.levelUp;
    const pokemon = data.pokemon || {};
    
    // Remplir jusqu'à 100% du niveau actuel
    await this.animateExpBarFill(levelData.progressBefore, 1.0);
    
    // Animation level up AVEC TRADUCTIONS
    const newLevel = levelData.current + 1;
    await this.animateLevelUp(newLevel, pokemon);
    
    // Si plusieurs niveaux gagnés
    if (levelUp.levelsGained > 1) {
      for (let i = 1; i < levelUp.levelsGained; i++) {
        await this.animateExpBarFill(0, 1.0);
        await this.animateLevelUp(levelData.current + i + 1, pokemon);
      }
    }
    
    // Position finale dans le nouveau niveau AVEC TRADUCTIONS
    const finalLevel = levelData.current + levelUp.levelsGained;
    const finalLevelText = this.getLevelText(finalLevel);
    this.levelText.setText(finalLevelText);
    
    const finalProgress = levelData.progressAfter || 0;
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
  
  // === ANIMATIONS (MODIFIÉ) ===
  
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
  
  // 🌐 MODIFIÉ: Animation level up avec traductions
  animateLevelUp(newLevel, pokemon = {}) {
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
      
      // 🌐 Animation du texte niveau AVEC TRADUCTIONS
      const levelText = this.getLevelText(newLevel);
      this.levelText.setText(levelText);
      
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
  
  // === 🌐 NOUVELLES MÉTHODES DE MISE À JOUR ===
  
  /**
   * 🌐 Mettre à jour la langue (appelée par des systèmes externes)
   */
  updateLanguage() {
    console.log('🌐 [ExperienceUI] updateLanguage() appelée');
    
    // Pré-charger les traductions pokémon si nécessaire
    const manager = this.localizationManager;
    if (manager && manager.getCurrentLanguage) {
      const currentLang = manager.getCurrentLanguage();
      this.preloadPokemonTranslations(currentLang);
    }
    
    // Rafraîchir si des données courantes existent
    this.refreshCurrentTranslations();
  }
  
  /**
   * 🎧 Méthode d'écoute pour l'event dispatcher
   */
  onLocalizationUpdated(detail) {
    console.log('🔄 [ExperienceUI] LocalizationManager mis à jour:', detail);
    
    if (detail.newModules && detail.newModules.includes('battle')) {
      console.log('🔄 [ExperienceUI] Module battle mis à jour - refresh traductions');
      this.refreshCurrentTranslations();
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
    
    // 🎧 NOUVEAU: Nettoyer les listeners de langue
    console.log('🧹 [ExperienceUI] Nettoyage listeners langue...');
    
    try {
      // 1. Nettoyer listener OptionsManager
      if (this.languageUnsubscribe && typeof this.languageUnsubscribe === 'function') {
        this.languageUnsubscribe();
        console.log('🧹 [ExperienceUI] Listener OptionsManager supprimé');
      }
      
      // 2. Nettoyer listener LocalizationManager
      if (this.localizationUnsubscribe && typeof this.localizationUnsubscribe === 'function') {
        this.localizationUnsubscribe();
        console.log('🧹 [ExperienceUI] Listener LocalizationManager supprimé');
      }
      
      // 3. Nettoyer événements globaux
      if (this.handleLanguageChanged) {
        window.removeEventListener('languageChanged', this.handleLanguageChanged);
      }
      
      if (this.handleModulesUpdated) {
        window.removeEventListener('localizationModulesUpdated', this.handleModulesUpdated);
      }
      
      console.log('🧹 [ExperienceUI] Événements globaux nettoyés');
      
    } catch (error) {
      console.warn('⚠️ [ExperienceUI] Erreur nettoyage listeners:', error);
    }
    
    // Nettoyer les données courantes
    this.currentPokemonData = null;
    this.currentExperienceData = null;
    this.languageUnsubscribe = null;
    this.localizationUnsubscribe = null;
    this.handleLanguageChanged = null;
    this.handleModulesUpdated = null;
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    this.currentQueue = [];
    console.log('🗑️ [ExperienceUI] Détruit avec nettoyage complet listeners');
  }
}
