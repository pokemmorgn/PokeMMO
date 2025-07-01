// client/src/managers/BattleIntegration.js - Intégration complète du système de combat

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleConnection } from '../Battle/BattleConnection.js';
import { PokemonSelectionUI } from '../Battle/PokemonSelectionUI.js';

/**
 * Gestionnaire d'intégration complet du système de combat
 * Version finale avec interface, sélection d'équipe et réseau
 */
export class BattleIntegration {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Composants du système de combat
    this.battleScene = null;
    this.battleManager = null;
    this.battleConnection = null;
    this.pokemonSelectionUI = null;
    
    // État
    this.isInitialized = false;
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    // Références
    this.worldRoom = null;
    this.phaserGame = null;
    
    // Combat en cours
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    console.log('⚔️ [BattleIntegration] Constructeur initialisé (version finale)');
  }

  // === INITIALISATION ===

  /**
   * Initialise le système de combat complet
   */
  async initialize(worldRoom, phaserGame) {
    console.log('🔧 [BattleIntegration] Initialisation du système complet...');
    
    if (!worldRoom || !phaserGame) {
      console.error('❌ [BattleIntegration] WorldRoom ou PhaserGame manquant');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.phaserGame = phaserGame;
    
    try {
      // 1. Créer la BattleConnection
      await this.initializeBattleConnection();
      
      // 2. Créer l'interface de sélection Pokémon
      await this.initializePokemonSelection();
      
      // 3. Créer et initialiser la BattleScene
      await this.initializeBattleScene();
      
      // 4. Setup des événements globaux
      this.setupIntegrationEvents();
      
      // 5. Charger les styles CSS
      this.loadBattleStyles();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système complet initialisé');
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  // === INITIALISATION DES COMPOSANTS ===

  async initializeBattleConnection() {
    console.log('🌐 [BattleIntegration] Initialisation BattleConnection...');
    
    this.battleConnection = new BattleConnection(this.gameManager);
    
    // Créer un mock NetworkManager pour la compatibilité
    const mockNetworkManager = {
      worldRoom: this.worldRoom,
      client: this.worldRoom.connection || this.worldRoom._client || window.client,
      room: this.worldRoom,
      isConnected: true
    };
    
    const success = this.battleConnection.initialize(mockNetworkManager);
    
    if (!success) {
      throw new Error('Échec initialisation BattleConnection');
    }
    
    console.log('✅ [BattleIntegration] BattleConnection initialisée');
  }

  async initializePokemonSelection() {
    console.log('🔄 [BattleIntegration] Initialisation PokemonSelectionUI...');
    
    this.pokemonSelectionUI = new PokemonSelectionUI(
      this.gameManager,
      (selectedPokemon) => this.handlePokemonSelected(selectedPokemon)
    );
    
    this.pokemonSelectionUI.initialize();
    
    console.log('✅ [BattleIntegration] PokemonSelectionUI initialisée');
  }

  async initializeBattleScene() {
    console.log('🎬 [BattleIntegration] Initialisation BattleScene...');
    
    try {
      // Vérifier si BattleScene existe déjà
      let battleSceneExists = false;
      
      if (this.phaserGame?.scene?.manager) {
        const existingScene = this.phaserGame.scene.getScene('BattleScene');
        if (existingScene) {
          this.battleScene = existingScene;
          battleSceneExists = true;
          console.log('✅ [BattleIntegration] BattleScene existante trouvée');
        }
      }
      
      // Créer la BattleScene si nécessaire
      if (!battleSceneExists) {
        this.battleScene = new BattleScene();
        
        if (this.phaserGame.scene && this.phaserGame.scene.add) {
          this.phaserGame.scene.add('BattleScene', this.battleScene, false);
          console.log('✅ [BattleIntegration] BattleScene créée et ajoutée');
        } else {
          console.warn('⚠️ [BattleIntegration] Scene manager non disponible');
        }
      }
      
    } catch (error) {
      console.warn('⚠️ [BattleIntegration] Erreur BattleScene:', error);
      // Continuer même en cas d'erreur pour utiliser l'interface DOM
    }
    
    console.log('✅ [BattleIntegration] BattleScene initialisée');
  }

  // === ÉVÉNEMENTS GLOBAUX ===

  setupIntegrationEvents() {
    if (!this.battleConnection) return;
    
    console.log('🔗 [BattleIntegration] Configuration des événements d\'intégration...');
    
    // === ÉVÉNEMENTS DE RENCONTRE ===
    this.battleConnection.on('wildEncounterStart', (data) => {
      this.handleWildEncounterStart(data);
    });
    
    this.battleConnection.on('battleRoomCreated', (data) => {
      this.handleBattleRoomCreated(data);
    });
    
    this.battleConnection.on('battleRoomConnected', (data) => {
      this.handleBattleRoomConnected(data);
    });
    
    // === ÉVÉNEMENTS DE COMBAT ===
    this.battleConnection.on('battleJoined', (data) => {
      this.handleBattleJoined(data);
    });
    
    this.battleConnection.on('battleStart', (data) => {
      this.handleBattleStart(data);
    });
    
    this.battleConnection.on('battleEnd', (data) => {
      this.handleBattleEnd(data);
    });
    
    this.battleConnection.on('battleLeft', (data) => {
      this.handleBattleLeft(data);
    });
    
    this.battleConnection.on('battleError', (data) => {
      this.handleBattleError(data);
    });
    
    // === ÉVÉNEMENTS RÉSEAU SPÉCIALISÉS ===
    this.battleConnection.on('attackResult', (data) => {
      this.forwardToBattleScene('attackResult', data);
    });
    
    this.battleConnection.on('pokemonFainted', (data) => {
      this.forwardToBattleScene('pokemonFainted', data);
    });
    
    this.battleConnection.on('statusEffectApplied', (data) => {
      this.forwardToBattleScene('statusEffectApplied', data);
    });
    
    this.battleConnection.on('captureShake', (data) => {
      this.forwardToBattleScene('captureShake', data);
    });
    
    this.battleConnection.on('battleStateChange', (data) => {
      this.updateBattleState(data.state);
    });
    
    console.log('✅ [BattleIntegration] Événements d\'intégration configurés');
  }

  // === GESTION DES RENCONTRES ===

  async handleWildEncounterStart(data) {
    console.log('🐾 [BattleIntegration] === DÉBUT RENCONTRE SAUVAGE ===');
    console.log('📊 Data reçue:', data);
    
    if (this.isInBattle || this.isSelectingPokemon) {
      console.warn('⚠️ [BattleIntegration] Combat déjà en cours, ignoré');
      return;
    }
    
    // Stocker les données de combat
    this.currentBattleData = data;
    
    // Marquer comme en cours de sélection
    this.isSelectingPokemon = true;
    
    // Notifier le GameManager
    if (this.gameManager?.onEncounterStart) {
      this.gameManager.onEncounterStart(data);
    }
    
    // Lancer la sélection de Pokémon
    console.log('🔄 [BattleIntegration] Lancement sélection Pokémon...');
    
    try {
      // Vérifier si l'équipe a des Pokémon disponibles
      if (!this.pokemonSelectionUI.hasAvailablePokemon()) {
        console.error('❌ [BattleIntegration] Aucun Pokémon disponible !');
        this.showError('Aucun Pokémon disponible pour le combat !');
        this.cancelBattle();
        return;
      }
      
      // Afficher l'interface de sélection
      this.pokemonSelectionUI.show();
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur sélection Pokémon:', error);
      
      // Fallback : sélection automatique
      console.log('🤖 [BattleIntegration] Sélection automatique fallback...');
      const firstAvailable = this.pokemonSelectionUI.getFirstAvailablePokemon();
      if (firstAvailable) {
        this.handlePokemonSelected(firstAvailable);
      } else {
        this.cancelBattle();
      }
    }
  }

  handlePokemonSelected(selectedPokemon) {
    console.log('🎯 [BattleIntegration] Pokémon sélectionné:', selectedPokemon);
    
    this.isSelectingPokemon = false;
    
    if (!selectedPokemon) {
      console.log('❌ [BattleIntegration] Sélection annulée');
      this.cancelBattle();
      return;
    }
    
    this.selectedPokemon = selectedPokemon;
    
    // Envoyer le choix au serveur
    console.log('📤 [BattleIntegration] Envoi du choix au serveur...');
    
    const success = this.battleConnection.choosePokemon(selectedPokemon.id);
    if (!success) {
      console.error('❌ [BattleIntegration] Échec envoi choix Pokémon');
      this.showError('Erreur de communication avec le serveur');
      this.cancelBattle();
      return;
    }
    
    console.log('✅ [BattleIntegration] Choix envoyé, attente du serveur...');
  }

  // === GESTION DU COMBAT ===

  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] BattleRoom créée:', data.battleRoomId);
    
    // La connexion à la BattleRoom se fait automatiquement via BattleConnection
    this.currentBattleRoomId = data.battleRoomId;
    this.currentBattleType = data.battleType;
  }

  handleBattleRoomConnected(data) {
    console.log('🚪 [BattleIntegration] Connecté à la BattleRoom');
    
    // On est maintenant connecté à la BattleRoom
    // Le combat va commencer une fois que le serveur aura reçu notre choix de Pokémon
  }

  handleBattleJoined(data) {
    console.log('⚔️ [BattleIntegration] Rejoint le combat:', data);
    
    // Marquer comme en combat
    this.isInBattle = true;
    
    // Désactiver le mouvement du joueur
    this.disablePlayerMovement();
  }

  handleBattleStart(data) {
    console.log('🎬 [BattleIntegration] === DÉBUT DU COMBAT ===');
    console.log('📊 Data de combat:', data);
    
    // Lancer l'interface de combat
    this.startBattleInterface(data);
    
    // Notifier le GameManager
    if (this.gameManager?.onBattleStart) {
      this.gameManager.onBattleStart(data);
    }
  }

  startBattleInterface(battleData) {
    console.log('🖥️ [BattleIntegration] Lancement interface de combat...');
    
    try {
      // Essayer d'utiliser la BattleScene Phaser
      if (this.battleScene && this.phaserGame?.scene) {
        console.log('🎬 [BattleIntegration] Utilisation de la BattleScene Phaser');
        
        // Démarrer la BattleScene
        if (this.phaserGame.scene.isActive('BattleScene')) {
          this.phaserGame.scene.bringToTop('BattleScene');
        } else {
          this.phaserGame.scene.start('BattleScene', {
            gameManager: this.gameManager,
            networkHandler: this.battleConnection,
            battleData: battleData,
            selectedPokemon: this.selectedPokemon
          });
        }
        
        // Mettre en pause la scène principale
        if (this.gameManager?.pauseGame) {
          this.gameManager.pauseGame('battle');
        }
        
      } else {
        console.log('🆘 [BattleIntegration] Fallback interface DOM');
        
        // Fallback : créer une interface DOM simple
        this.createFallbackBattleInterface(battleData);
      }
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lancement interface:', error);
      
      // Double fallback
      this.createFallbackBattleInterface(battleData);
    }
  }

  createFallbackBattleInterface(battleData) {
    console.log('🆘 [BattleIntegration] Création interface fallback...');
    
    // Supprimer toute interface existante
    const existingOverlay = document.getElementById('fallback-battle-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Créer une interface basique
    const overlay = document.createElement('div');
    overlay.id = 'fallback-battle-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 7.5%;
      left: 7.5%;
      width: 85%;
      height: 85%;
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Arial', sans-serif;
      color: white;
      text-align: center;
      border-radius: 15px;
      border: 4px solid #FFD700;
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
    `;
    
    const playerPokemon = this.selectedPokemon;
    const opponentPokemon = this.currentBattleData?.pokemon;
    
    overlay.innerHTML = `
      <div style="background: rgba(0,0,0,0.8); padding: 30px; border-radius: 15px; max-width: 600px; width: 90%;">
        <h1 style="color: #FFD700; margin-bottom: 20px; font-size: 2.5em;">⚔️ COMBAT POKÉMON ⚔️</h1>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0;">
          <div style="text-align: left; flex: 1;">
            <h3 style="color: #90EE90; margin-bottom: 10px;">🔹 Votre Pokémon</h3>
            <p style="font-size: 1.2em; font-weight: bold;">${playerPokemon?.name || 'Inconnu'}</p>
            <p style="color: #87CEEB;">Niveau ${playerPokemon?.level || '?'}</p>
            <p style="color: #FFB6C1;">PV: ${playerPokemon?.currentHp || '?'}/${playerPokemon?.maxHp || '?'}</p>
          </div>
          
          <div style="font-size: 3em; margin: 0 20px;">⚡</div>
          
          <div style="text-align: right; flex: 1;">
            <h3 style="color: #FFB6C1; margin-bottom: 10px;">🔸 Adversaire</h3>
            <p style="font-size: 1.2em; font-weight: bold;">${opponentPokemon?.name || 'Pokémon sauvage'}</p>
            <p style="color: #87CEEB;">Niveau ${opponentPokemon?.level || '?'}</p>
            <p style="color: #90EE90;">PV: ${opponentPokemon?.currentHp || '?'}/${opponentPokemon?.maxHp || '?'}</p>
          </div>
        </div>
        
        <div style="margin: 30px 0;">
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin: 10px 0;">
            <p id="battleStatus">🔄 <strong>Combat en cours...</strong></p>
            <p style="color: #FFD700; font-size: 0.9em;">Interface de combat en cours de développement</p>
          </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
          <button id="attackBtn" style="
            background: #DC143C; color: white; border: none; padding: 15px 25px;
            font-size: 1.1em; border-radius: 10px; cursor: pointer; font-weight: bold;
          ">⚔️ Attaquer</button>
          
          <button id="bagBtn" style="
            background: #4169E1; color: white; border: none; padding: 15px 25px;
            font-size: 1.1em; border-radius: 10px; cursor: pointer; font-weight: bold;
          ">🎒 Sac</button>
          
          <button id="runBtn" style="
            background: #696969; color: white; border: none; padding: 15px 25px;
            font-size: 1.1em; border-radius: 10px; cursor: pointer; font-weight: bold;
          ">🏃 Fuir</button>
        </div>
        
        <div style="margin-top: 20px; font-size: 0.9em; color: #DDD;">
          <p>💡 <em>Utilisez les boutons pour jouer ou attendez que le système complet soit prêt</em></p>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(overlay);
    
    // Ajouter les événements des boutons
    this.setupFallbackEvents(overlay);
    
    console.log('✅ [BattleIntegration] Interface fallback créée');
  }

  setupFallbackEvents(overlay) {
    const attackBtn = overlay.querySelector('#attackBtn');
    const bagBtn = overlay.querySelector('#bagBtn');
    const runBtn = overlay.querySelector('#runBtn');
    const statusElement = overlay.querySelector('#battleStatus');
    
    if (attackBtn) {
      attackBtn.addEventListener('click', () => {
        statusElement.textContent = '💥 Attaque lancée !';
        attackBtn.disabled = true;
        
        // Envoyer l'action au serveur
        if (this.battleConnection) {
          this.battleConnection.useMove('tackle'); // Attaque basique
        }
        
        setTimeout(() => {
          attackBtn.disabled = false;
        }, 2000);
      });
    }
    
    if (bagBtn) {
      bagBtn.addEventListener('click', () => {
        statusElement.textContent = '🎒 Utilisation d\'un objet...';
        
        // TODO: Implémenter sélection d'objet
        if (this.battleConnection) {
          this.battleConnection.useItem('potion');
        }
      });
    }
    
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        statusElement.textContent = '🏃 Tentative de fuite...';
        
        if (this.battleConnection) {
          this.battleConnection.attemptRun();
        }
      });
    }
  }

  // === GESTION DE FIN DE COMBAT ===

  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT ===');
    console.log('📊 Résultat:', data);
    
    // Afficher les résultats
    this.showBattleResult(data);
    
    // Programmer la fermeture
    setTimeout(() => {
      this.endBattle(data);
    }, 5000);
  }

  showBattleResult(data) {
    const result = data.result;
    const rewards = data.rewards;
    
    let resultMessage = '';
    let resultColor = '#FFD700';
    
    switch (result) {
      case 'victory':
        resultMessage = '🎉 VICTOIRE ! 🎉';
        resultColor = '#00FF00';
        break;
      case 'defeat':
        resultMessage = '💀 DÉFAITE 💀';
        resultColor = '#FF0000';
        break;
      case 'fled':
        resultMessage = '🏃 FUITE RÉUSSIE 🏃';
        resultColor = '#FFD700';
        break;
      case 'captured':
        resultMessage = '🎯 POKÉMON CAPTURÉ ! 🎯';
        resultColor = '#00FF00';
        break;
      default:
        resultMessage = '⚔️ COMBAT TERMINÉ ⚔️';
    }
    
    // Mettre à jour l'interface existante ou créer un overlay de résultats
    const statusElement = document.querySelector('#battleStatus');
    if (statusElement) {
      statusElement.innerHTML = `<span style="color: ${resultColor}; font-size: 1.2em;">${resultMessage}</span>`;
      
      if (rewards) {
        let rewardsText = '<br><br>🎁 Récompenses:<br>';
        if (rewards.experience > 0) {
          rewardsText += `✨ +${rewards.experience} XP<br>`;
        }
        if (rewards.gold > 0) {
          rewardsText += `💰 +${rewards.gold} Or<br>`;
        }
        statusElement.innerHTML += rewardsText;
      }
    }
    
    // Notifier le GameManager
    if (this.gameManager?.onBattleEnd) {
      this.gameManager.onBattleEnd(data);
    }
  }

  handleBattleLeft(data) {
    console.log('👋 [BattleIntegration] Combat quitté:', data);
    
    this.endBattle(data);
  }

  handleBattleError(data) {
    console.error('❌ [BattleIntegration] Erreur de combat:', data);
    
    this.showError(`Erreur de combat: ${data.message}`);
    
    // Forcer la fin en cas d'erreur critique
    if (data.critical) {
      setTimeout(() => {
        this.endBattle({ reason: 'error', error: data });
      }, 3000);
    }
  }

  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] === NETTOYAGE FIN DE COMBAT ===');
    
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    // Fermer toutes les interfaces
    this.closeAllBattleInterfaces();
    
    // Réactiver le mouvement du joueur
    this.enablePlayerMovement();
    
    // Fermer la BattleScene si active
    if (this.battleScene && this.phaserGame?.scene) {
      try {
        if (this.phaserGame.scene.isActive('BattleScene')) {
          this.phaserGame.scene.sleep('BattleScene');
        }
      } catch (error) {
        console.warn('⚠️ [BattleIntegration] Erreur fermeture BattleScene:', error);
      }
    }
    
    // Reprendre le jeu principal
    if (this.gameManager?.resumeGame) {
      this.gameManager.resumeGame('battle');
    }
    
    // Nettoyer la connexion battle
    if (this.battleConnection) {
      this.battleConnection.leaveBattle();
    }
    
    // Nettoyer les données temporaires
    this.currentBattleData = null;
    this.selectedPokemon = null;
    this.currentBattleRoomId = null;
    this.currentBattleType = null;
    
    console.log('✅ [BattleIntegration] Combat terminé et nettoyé');
  }

  // === UTILITAIRES D'INTERFACE ===

  closeAllBattleInterfaces() {
    // Fermer l'interface de sélection
    if (this.pokemonSelectionUI) {
      this.pokemonSelectionUI.hide();
    }
    
    // Fermer l'interface fallback
    const fallbackOverlay = document.getElementById('fallback-battle-overlay');
    if (fallbackOverlay) {
      fallbackOverlay.remove();
    }
    
    // Fermer l'interface temporaire
    const tempOverlay = document.getElementById('temp-battle-overlay');
    if (tempOverlay) {
      tempOverlay.remove();
    }
  }

  cancelBattle() {
    console.log('❌ [BattleIntegration] Annulation du combat');
    
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    this.closeAllBattleInterfaces();
    this.enablePlayerMovement();
    
    // Notifier le serveur si nécessaire
    if (this.battleConnection && this.currentBattleRoomId) {
      this.battleConnection.leaveBattle('cancelled');
    }
    
    // Nettoyer
    this.currentBattleData = null;
    this.selectedPokemon = null;
    
    console.log('✅ [BattleIntegration] Combat annulé');
  }

  // === GESTION DU MOUVEMENT ===

  disablePlayerMovement() {
    if (this.gameManager && this.gameManager.player) {
      this.gameManager.player.setMovementEnabled(false);
      console.log('🚫 [BattleIntegration] Mouvement désactivé');
    }
  }

  enablePlayerMovement() {
    if (this.gameManager && this.gameManager.player) {
      this.gameManager.player.setMovementEnabled(true);
      console.log('✅ [BattleIntegration] Mouvement réactivé');
    }
  }

  // === FORWARDING D'ÉVÉNEMENTS ===

  forwardToBattleScene(eventType, data) {
    if (this.battleScene && this.battleScene.handleNetworkEvent) {
      this.battleScene.handleNetworkEvent(eventType, data);
    }
  }

  updateBattleState(battleState) {
    if (this.battleScene && this.battleScene.updateBattleState) {
      this.battleScene.updateBattleState(battleState);
    }
  }

  // === STYLES CSS ===

loadBattleStyles() {
  console.log('🎨 [BattleIntegration] Chargement des styles CSS...');
  
  // Vérifier si les styles sont déjà chargés
  if (document.querySelector('#battle-styles')) {
    console.log('✅ [BattleIntegration] Styles déjà chargés');
    return;
  }
  
  // ✅ Votre fichier existant battle.css
  const battleCSS = document.createElement('link');
  battleCSS.id = 'battle-styles';
  battleCSS.rel = 'stylesheet';
  battleCSS.href = '/css/battle.css';
  document.head.appendChild(battleCSS);
  
  // 🆕 Nouveau fichier pour sélection
  const selectionCSS = document.createElement('link');
  selectionCSS.id = 'selection-styles';
  selectionCSS.rel = 'stylesheet';
  selectionCSS.href = '/css/pokemon-selection.css';
  document.head.appendChild(selectionCSS);
  
  // 🆕 Nouveau fichier pour overlay centré
  const centeredCSS = document.createElement('link');
  centeredCSS.id = 'centered-styles';
  centeredCSS.rel = 'stylesheet';
  centeredCSS.href = '/css/battle-centered.css';
  document.head.appendChild(centeredCSS);
  
  console.log('✅ [BattleIntegration] Styles chargés');
}

  // === MÉTHODES PUBLIQUES ===

  /**
   * Démarre un combat sauvage manuellement
   */
  startWildBattle(wildPokemonData) {
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    if (this.isInBattle || this.isSelectingPokemon) {
      console.warn('⚠️ [BattleIntegration] Combat déjà en cours');
      return false;
    }
    
    console.log('🐾 [BattleIntegration] Démarrage combat sauvage manuel...');
    
    // Envoyer la demande via la WorldRoom
    if (this.battleConnection?.worldRoom) {
      const success = this.battleConnection.sendToWorld('startWildBattle', {
        wildPokemon: wildPokemonData.pokemon || wildPokemonData,
        location: wildPokemonData.location || 'manual_test',
        method: wildPokemonData.method || 'manual'
      });
      
      if (success) {
        console.log('✅ [BattleIntegration] Demande de combat envoyée');
        return true;
      }
    }
    
    console.error('❌ [BattleIntegration] Échec envoi demande combat');
    return false;
  }

  /**
   * Quitte le combat actuel
   */
  exitBattle(reason = 'manual') {
    if (!this.isInBattle && !this.isSelectingPokemon) {
      console.warn('⚠️ [BattleIntegration] Pas en combat');
      return false;
    }
    
    console.log(`🚪 [BattleIntegration] Sortie de combat: ${reason}`);
    
    if (this.isSelectingPokemon) {
      // Annuler la sélection
      this.cancelBattle();
    } else if (this.battleConnection) {
      // Quitter le combat actuel
      this.battleConnection.leaveBattle(reason);
    } else {
      // Forcer la fin
      this.endBattle({ reason });
    }
    
    return true;
  }

  /**
   * Teste le système avec un combat factice
   */
  testBattle() {
    console.log('🧪 [BattleIntegration] Test du système complet...');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    const testPokemon = {
      pokemonId: 25,
      level: 8,
      name: 'Pikachu Test',
      shiny: false,
      gender: 'male',
      currentHp: 28,
      maxHp: 28,
      moves: ['thunder_shock', 'growl', 'tail_whip', 'thunder_wave']
    };
    
    return this.startWildBattle({
      pokemon: testPokemon,
      location: 'test_zone',
      method: 'debug_test'
    });
  }

  // === MÉTHODES D'ÉTAT ===

  /**
   * Vérifie si on est en combat
   */
  isCurrentlyInBattle() {
    return this.isInBattle || this.isSelectingPokemon;
  }

  /**
   * Obtient l'état du combat actuel
   */
  getCurrentBattleState() {
    return {
      isInitialized: this.isInitialized,
      isInBattle: this.isInBattle,
      isSelectingPokemon: this.isSelectingPokemon,
      battleRoomId: this.currentBattleRoomId,
      battleType: this.currentBattleType,
      selectedPokemon: this.selectedPokemon,
      battleData: this.currentBattleData,
      connectionStatus: this.battleConnection?.getConnectionStatus()
    };
  }

  // === UTILITAIRES ===

  showError(message) {
    console.error(`❌ [BattleIntegration] ${message}`);
    
    // Afficher l'erreur à l'utilisateur
    if (this.gameManager?.showNotification) {
      this.gameManager.showNotification(message, 'error');
    } else {
      // Fallback : alert simple
      alert(`Erreur de combat: ${message}`);
    }
  }

  /**
   * Vérifie la compatibilité système
   */
  checkCompatibility() {
    const checks = {
      phaserGame: !!this.phaserGame,
      worldRoom: !!this.worldRoom,
      battleConnection: !!this.battleConnection,
      pokemonSelectionUI: !!this.pokemonSelectionUI,
      battleScene: !!this.battleScene,
      gameManager: !!this.gameManager,
      cssLoaded: !!document.querySelector('#battle-styles')
    };
    
    console.log('🔍 [BattleIntegration] Vérification compatibilité:', checks);
    
    return checks;
  }

  /**
   * Debug complet du système
   */
  debug() {
    return {
      isInitialized: this.isInitialized,
      state: this.getCurrentBattleState(),
      compatibility: this.checkCompatibility(),
      networkStatus: this.battleConnection?.debug(),
      hasAvailablePokemon: this.pokemonSelectionUI?.hasAvailablePokemon()
    };
  }

  // === NETTOYAGE ===

  /**
   * Nettoie et détruit le système complet
   */
  async destroy() {
    console.log('💀 [BattleIntegration] Destruction du système complet...');
    
    // Terminer tout combat en cours
    if (this.isCurrentlyInBattle()) {
      await this.exitBattle('destroy');
    }
    
    // Détruire les composants
    if (this.battleConnection) {
      await this.battleConnection.destroy();
      this.battleConnection = null;
    }
    
    if (this.pokemonSelectionUI) {
      this.pokemonSelectionUI.destroy();
      this.pokemonSelectionUI = null;
    }
    
    if (this.battleScene && this.phaserGame?.scene) {
      try {
        this.phaserGame.scene.remove('BattleScene');
      } catch (error) {
        console.warn('⚠️ [BattleIntegration] Erreur suppression BattleScene:', error);
      }
      this.battleScene = null;
    }
    
    // Supprimer les styles CSS
    const styleElements = ['#battle-styles', '#selection-styles', '#centered-styles'];
    styleElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) element.remove();
    });
    
    // Fermer toutes les interfaces
    this.closeAllBattleInterfaces();
    
    // Nettoyer les références
    this.gameManager = null;
    this.worldRoom = null;
    this.phaserGame = null;
    
    // Réinitialiser l'état
    this.isInitialized = false;
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    console.log('✅ [BattleIntegration] Système complet détruit');
  }
}
