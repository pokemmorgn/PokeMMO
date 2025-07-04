// client/src/managers/BattleIntegration.js - MISE À JOUR avec BattleUITransition
// ✅ AJOUT: Intégration complète du gestionnaire de transition UI

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleConnection } from '../Battle/BattleConnection.js';
import { PokemonSelectionUI } from '../Battle/PokemonSelectionUI.js';
import { BattleUITransition } from '../Battle/BattleUITransition.js'; // ✅ NOUVEAU

/**
 * Gestionnaire d'intégration complet du système de combat
 * ✅ NOUVEAU: Intégration avec BattleUITransition pour gestion UI fluide
 */
export class BattleIntegration {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Composants du système de combat
    this.battleScene = null;
    this.battleManager = null;
    this.battleConnection = null;
    this.pokemonSelectionUI = null;
    this.battleUITransition = null; // ✅ NOUVEAU
    
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
    this.pokemonChoiceSent = false;
    
    console.log('⚔️ [BattleIntegration] Constructeur initialisé (avec UI transition)');
  }

  // === INITIALISATION MISE À JOUR ===

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
      
      // ✅ 4. NOUVEAU: Créer le gestionnaire de transition UI
      await this.initializeBattleUITransition();
      
      // 5. Setup des événements globaux
      this.setupIntegrationEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système complet initialisé avec UI Transition');
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation du gestionnaire de transition UI
  async initializeBattleUITransition() {
    console.log('🎨 [BattleIntegration] Initialisation BattleUITransition...');
    
    // Récupérer le UIManager depuis le système UI Pokémon
    const uiManager = window.pokemonUISystem?.uiManager || window.uiManager;
    
    if (!uiManager) {
      console.warn('⚠️ [BattleIntegration] UIManager non trouvé - transition UI limitée');
    }
    
    // Créer le gestionnaire de transition
    this.battleUITransition = new BattleUITransition(uiManager, this.gameManager);
    
    // Écouter l'événement de fin de transition UI
    window.addEventListener('battleUITransitionComplete', (event) => {
      console.log('🎬 [BattleIntegration] Transition UI terminée:', event.detail);
      this.onUITransitionComplete(event.detail);
    });
    
    console.log('✅ [BattleIntegration] BattleUITransition initialisée');
  }

  // === INITIALISATION DES AUTRES COMPOSANTS (INCHANGÉE) ===

  async initializeBattleConnection() {
    console.log('🌐 [BattleIntegration] Initialisation BattleConnection...');
    
    this.battleConnection = new BattleConnection(this.gameManager);
    
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
    let battleSceneExists = false;
    if (this.phaserGame?.scene?.getScene) {
      const existingScene = this.phaserGame.scene.getScene('BattleScene');
      if (existingScene) {
        this.battleScene = existingScene;
        battleSceneExists = true;
        console.log('✅ [BattleIntegration] BattleScene déjà présente');
      }
    }
    if (!battleSceneExists) {
      this.battleScene = new BattleScene();
      if (!this.phaserGame.scene.keys['BattleScene']) {
        this.phaserGame.scene.add('BattleScene', this.battleScene, false);
        console.log('✅ [BattleIntegration] BattleScene ajoutée dynamiquement');
      } else {
        console.log('ℹ️ [BattleIntegration] BattleScene déjà enregistrée');
      }
    }
    
    // ✅ AJOUT: Démarrer BattleScene immédiatement
    if (!this.phaserGame.scene.isActive('BattleScene')) {
      console.log('🚀 [BattleIntegration] Démarrage BattleScene...');
      this.phaserGame.scene.start('BattleScene', {
        battleNetworkHandler: this.battleConnection.networkHandler,
        gameManager: this.gameManager
      });
      console.log('✅ [BattleIntegration] BattleScene démarrée et prête');
    }
    
  } catch (error) {
    console.warn('⚠️ [BattleIntegration] Erreur BattleScene:', error);
  }
  console.log('✅ [BattleIntegration] BattleScene initialisée et active');
}

  // === ÉVÉNEMENTS GLOBAUX MISE À JOUR ===

  setupIntegrationEvents() {
    if (!this.battleConnection) return;
    
    console.log('🔗 [BattleIntegration] Configuration des événements d\'intégration...');
    
    // === ÉVÉNEMENTS DE RENCONTRE MISE À JOUR ===
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
    
    this.battleConnection.on('phaseChange', (data) => {
      this.handlePhaseChange(data);
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

  // === GESTION DES RENCONTRES MISE À JOUR ===

  async handleWildEncounterStart(data) {
    console.log('🐾 [BattleIntegration] === DÉBUT RENCONTRE SAUVAGE AVEC UI ===');
    console.log('📊 Data reçue:', data);
    
    if (this.isInBattle || this.isSelectingPokemon) {
      console.warn('⚠️ [BattleIntegration] Combat déjà en cours, ignoré');
      return;
    }
    
    // ✅ ÉTAPE 1: LANCER LA TRANSITION UI IMMÉDIATEMENT
    console.log('🎬 [BattleIntegration] Lancement transition UI...');
    
    if (this.battleUITransition) {
      const transitionSuccess = await this.battleUITransition.startBattleTransition({
        pokemon: data.pokemon || data.wildPokemon,
        location: data.location,
        method: data.method
      });
      
      if (!transitionSuccess) {
        console.error('❌ [BattleIntegration] Échec transition UI');
        this.showError('Erreur lors de la préparation du combat');
        return;
      }
      
      console.log('✅ [BattleIntegration] Transition UI réussie');
    } else {
      console.warn('⚠️ [BattleIntegration] BattleUITransition non disponible');
    }
    
    // Stocker les données de combat
    this.currentBattleData = data;
    
    // Notifier le GameManager
    if (this.gameManager?.onEncounterStart) {
      this.gameManager.onEncounterStart(data);
    }
    
    // ✅ ÉTAPE 2: Préparation du Pokémon (après transition UI)
    console.log('🤖 [BattleIntegration] Préparation du premier Pokémon...');
    
    try {
      const firstAvailable = this.getFirstAvailablePokemon();
      
      if (!firstAvailable) {
        console.error('❌ [BattleIntegration] Aucun Pokémon disponible !');
        this.showError('Aucun Pokémon disponible pour le combat !');
        await this.cancelBattle();
        return;
      }
      
      this.selectedPokemon = firstAvailable;
      console.log(`✅ [BattleIntegration] Pokémon préparé: ${firstAvailable.name}`);
      
      // Marquer comme en cours
      this.isInBattle = true;
      
      console.log('⏳ [BattleIntegration] Attente création BattleRoom...');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur préparation:', error);
      await this.cancelBattle();
    }
  }

  // ✅ NOUVEAU CALLBACK: Appelé quand la transition UI est terminée
  onUITransitionComplete(transitionData) {
    console.log('🎬 [BattleIntegration] Transition UI terminée:', transitionData);
    
    // L'UI est maintenant en mode battle, on peut procéder au combat
    // La suite du processus continue avec les autres handlers
  }

  // === GESTION DU COMBAT (INCHANGÉE MAIS AVEC LOGS) ===

  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] BattleRoom créée:', data.battleRoomId);
    
    this.currentBattleRoomId = data.battleRoomId;
    this.currentBattleType = data.battleType;
  }

  handleBattleRoomConnected(data) {
    console.log('🚪 [BattleIntegration] Connecté à la BattleRoom');
    
    if (this.selectedPokemon && !this.pokemonChoiceSent) {
      console.log('📤 [BattleIntegration] Envoi du choix de Pokémon à la BattleRoom...');
      
      const success = this.battleConnection.choosePokemon(this.selectedPokemon.id);
      if (success) {
        this.pokemonChoiceSent = true;
        console.log(`✅ [BattleIntegration] Choix envoyé: ${this.selectedPokemon.name}`);
      } else {
        console.error('❌ [BattleIntegration] Échec envoi choix Pokémon');
        this.showError('Erreur de communication avec le serveur');
        this.cancelBattle();
      }
    }
  }

  handleBattleJoined(data) {
    console.log('⚔️ [BattleIntegration] Rejoint le combat:', data);
    
    this.isInBattle = true;
    
    console.log('🖥️ [BattleIntegration] Déclenchement interface après battleJoined...');
    
    const battleData = {
      battleId: data.battleId,
      battleType: data.battleType,
      yourRole: data.yourRole,
      playerPokemon: this.selectedPokemon,
      opponentPokemon: this.currentBattleData?.pokemon
    };
    
    this.startBattleInterface(battleData);
  }

  handlePhaseChange(data) {
    console.log('🔄 [BattleIntegration] Changement de phase:', data.phase);
    
    switch (data.phase) {
      case 'team_selection':
        console.log('🔄 [BattleIntegration] Phase sélection équipe');
        
        if (this.selectedPokemon && !this.pokemonChoiceSent) {
          console.log('📤 [BattleIntegration] Envoi tardif du choix de Pokémon...');
          
          const success = this.battleConnection.choosePokemon(this.selectedPokemon.id);
          if (success) {
            this.pokemonChoiceSent = true;
            console.log(`✅ [BattleIntegration] Choix tardif envoyé: ${this.selectedPokemon.name}`);
          }
        }
        break;
        
      case 'battle':
        console.log('⚔️ [BattleIntegration] Phase de combat');
        
        if (!this.isBattleInterfaceActive()) {
          const battleData = {
            phase: 'battle',
            playerPokemon: this.selectedPokemon,
            opponentPokemon: this.currentBattleData?.pokemon
          };
          this.startBattleInterface(battleData);
        }
        break;
    }
  }

  isBattleInterfaceActive() {
    if (this.phaserGame?.scene?.isActive('BattleScene')) {
      return true;
    }
    
    const fallbackOverlay = document.getElementById('fallback-battle-overlay');
    if (fallbackOverlay && fallbackOverlay.style.display !== 'none') {
      return true;
    }
    
    return false;
  }

  // === INTERFACE DE COMBAT (LÉGÈREMENT MISE À JOUR) ===

  startBattleInterface(battleData) {
    console.log('🖥️ [BattleIntegration] === LANCEMENT INTERFACE DE COMBAT ===');
    console.log('📊 Données:', battleData);
    console.log('🎮 PhaserGame disponible:', !!this.phaserGame);
    console.log('🎬 BattleScene disponible:', !!this.battleScene);
    
    try {
      if (this.battleScene && this.phaserGame?.scene) {
        console.log('🎬 [BattleIntegration] Utilisation BattleScene Phaser...');
        
        const sceneExists = this.phaserGame.scene.getScene('BattleScene');
        console.log('🔍 BattleScene existe dans manager:', !!sceneExists);
        
        if (sceneExists) {
          if (this.phaserGame.scene.isActive('BattleScene')) {
            console.log('🔄 BattleScene déjà active, mise au premier plan...');
            this.phaserGame.scene.bringToTop('BattleScene');
          } else {
            console.log('🚀 Démarrage de la BattleScene...');
const startData = {
  gameManager: this.gameManager,
  networkHandler: this.battleConnection,
  battleData: battleData,
  selectedPokemon: this.selectedPokemon,
  // Prends en priorité le champ currentZone, sinon fallback sur location, sinon 'unknown'
  currentZone: (battleData && (battleData.currentZone || battleData.location)) || this.currentZone || 'unknown'
};


console.log('[LOG BATTLE] Données transmises à BattleScene :', startData);

this.phaserGame.scene.start('BattleScene', startData);

          }
          
          if (this.gameManager?.pauseGame) {
            this.gameManager.pauseGame('battle');
          }
          
          console.log('✅ [BattleIntegration] BattleScene lancée avec succès');
          return;
          
        } else {
          console.warn('⚠️ [BattleIntegration] BattleScene non trouvée dans le manager');
        }
      } else {
        console.warn('⚠️ [BattleIntegration] BattleScene ou PhaserGame non disponible');
      }
      
      console.log('🆘 [BattleIntegration] Passage en fallback interface DOM...');
      this.createFallbackBattleInterface(battleData);
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lancement interface:', error);
      console.log('🆘 [BattleIntegration] Fallback forcé après erreur...');
      this.createFallbackBattleInterface(battleData);
    }
  }

  createFallbackBattleInterface(battleData) {
    console.log('🆘 [BattleIntegration] Création interface fallback...');
    
    const existingOverlay = document.getElementById('fallback-battle-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
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
            <p style="color: #FFD700; font-size: 0.9em;">Interface complète en cours de développement</p>
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
          <p>💡 <em>Interface temporaire - l'UI complète va être ajoutée</em></p>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
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
        
        if (this.battleConnection) {
          this.battleConnection.useMove('tackle');
        }
        
        setTimeout(() => {
          attackBtn.disabled = false;
        }, 2000);
      });
    }
    
    if (bagBtn) {
      bagBtn.addEventListener('click', () => {
        statusElement.textContent = '🎒 Utilisation d\'un objet...';
        
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

  // === GESTION DE FIN DE COMBAT MISE À JOUR ===

  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] === FIN DE COMBAT AVEC UI ===');
    console.log('📊 Résultat:', data);
    
    this.showBattleResult(data);
    
    // ✅ PROGRAMMER LA TRANSITION UI DE RETOUR
    setTimeout(() => {
      this.endBattle(data);
    }, 5000);
  }

  handleBattleLeft(data) {
    console.log('👋 [BattleIntegration] Combat quitté:', data);
    this.endBattle(data);
  }

  handleBattleError(data) {
    console.error('❌ [BattleIntegration] Erreur de combat:', data);
    
    this.showError(`Erreur de combat: ${data.message}`);
    
    if (data.critical) {
      setTimeout(() => {
        this.endBattle({ reason: 'error', error: data });
      }, 3000);
    }
  }

  // ✅ MÉTHODE MISE À JOUR: Fin de combat avec transition UI
  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] === NETTOYAGE FIN DE COMBAT AVEC UI ===');
    
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    // ✅ ÉTAPE 1: Lancer la transition UI de retour
    if (this.battleUITransition && this.battleUITransition.isBattleActive()) {
      console.log('🎬 [BattleIntegration] Lancement transition UI retour...');
      
      this.battleUITransition.endBattleTransition({
        result: data.result || 'ended',
        rewards: data.rewards,
        reason: data.reason
      }).then(success => {
        if (success) {
          console.log('✅ [BattleIntegration] Transition UI retour réussie');
        } else {
          console.warn('⚠️ [BattleIntegration] Problème transition UI retour');
        }
      });
    }
    
    // ÉTAPE 2: Fermer toutes les interfaces de combat
    this.closeAllBattleInterfaces();
    
    // ÉTAPE 3: Fermer la BattleScene si active
    if (this.battleScene && this.phaserGame?.scene) {
      try {
        if (this.phaserGame.scene.isActive('BattleScene')) {
          this.phaserGame.scene.sleep('BattleScene');
        }
      } catch (error) {
        console.warn('⚠️ [BattleIntegration] Erreur fermeture BattleScene:', error);
      }
    }
    
    // ÉTAPE 4: Reprendre le jeu principal
    if (this.gameManager?.resumeGame) {
      this.gameManager.resumeGame('battle');
    }
    
    // ÉTAPE 5: Nettoyer la connexion battle
    if (this.battleConnection) {
      this.battleConnection.leaveBattle();
    }
    
    // ÉTAPE 6: Nettoyer les données temporaires
    this.currentBattleData = null;
    this.selectedPokemon = null;
    this.pokemonChoiceSent = false;
    this.currentBattleRoomId = null;
    this.currentBattleType = null;
    
    console.log('✅ [BattleIntegration] Combat terminé et nettoyé avec UI');
  }

  // ✅ MÉTHODE MISE À JOUR: Annulation avec transition UI
  async cancelBattle() {
    console.log('❌ [BattleIntegration] Annulation du combat avec UI');
    
    this.isInBattle = false;
    this.isSelectingPokemon = false;
    
    // ✅ Annuler la transition UI si en cours
    if (this.battleUITransition) {
      if (this.battleUITransition.isCurrentlyTransitioning()) {
        console.log('🔄 [BattleIntegration] Annulation transition UI en cours...');
        await this.battleUITransition.cancelTransition();
      } else if (this.battleUITransition.isBattleActive()) {
        console.log('🔄 [BattleIntegration] Retour UI depuis annulation...');
        await this.battleUITransition.endBattleTransition({
          result: 'cancelled',
          reason: 'manual_cancel'
        });
      }
    }
    
    this.closeAllBattleInterfaces();
    
    if (this.battleConnection && this.currentBattleRoomId) {
      this.battleConnection.leaveBattle('cancelled');
    }
    
    // Nettoyer
    this.currentBattleData = null;
    this.selectedPokemon = null;
    this.pokemonChoiceSent = false;
    
    console.log('✅ [BattleIntegration] Combat annulé avec UI');
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

  // === GESTION DU MOUVEMENT (INCHANGÉE) ===

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

  // === MÉTHODES UTILITAIRES ===

  getFirstAvailablePokemon() {
    // TODO: Récupérer l'équipe réelle du joueur depuis le GameManager
    // Pour l'instant, équipe de test
    const playerTeam = [
      {
        id: 'pokemon_1',
        pokemonId: 1,
        name: 'Bulbasaur',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        types: ['grass', 'poison'],
        moves: ['tackle', 'growl', 'vine_whip'],
        statusCondition: 'normal',
        available: true
      },
      {
        id: 'pokemon_2',
        pokemonId: 4,
        name: 'Charmander',
        level: 6,
        currentHp: 21,
        maxHp: 21,
        types: ['fire'],
        moves: ['scratch', 'growl', 'ember'],
        statusCondition: 'normal',
        available: true
      },
      {
        id: 'pokemon_3',
        pokemonId: 7,
        name: 'Squirtle',
        level: 5,
        currentHp: 0,
        maxHp: 19,
        types: ['water'],
        moves: ['tackle', 'tail_whip', 'bubble'],
        statusCondition: 'ko',
        available: false
      }
    ];
    
    return playerTeam.find(pokemon => 
      pokemon.available && pokemon.currentHp > 0
    ) || null;
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

  showError(message) {
    console.error(`❌ [BattleIntegration] ${message}`);
    
    // Afficher l'erreur à l'utilisateur
    if (this.gameManager?.showNotification) {
      this.gameManager.showNotification(message, 'error');
    } else if (window.showGameNotification) {
      window.showGameNotification(message, 'error', {
        duration: 5000,
        position: 'top-center'
      });
    } else {
      // Fallback : alert simple
      alert(`Erreur de combat: ${message}`);
    }
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
      this.cancelBattle();
    } else if (this.battleConnection) {
      this.battleConnection.leaveBattle(reason);
    } else {
      this.endBattle({ reason });
    }
    
    return true;
  }

  /**
   * Affiche l'interface de sélection pour changer de Pokémon pendant le combat
   */
  showPokemonSelectionForSwitch() {
    if (!this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Pas en combat - impossible de changer');
      return false;
    }
    
    if (this.isSelectingPokemon) {
      console.warn('⚠️ [BattleIntegration] Sélection déjà en cours');
      return false;
    }
    
    console.log('🔄 [BattleIntegration] Affichage sélection pour changement...');
    
    this.isSelectingPokemon = true;
    
    // Configurer le callback pour changement
    this.pokemonSelectionUI.onPokemonSelected = (selectedPokemon) => {
      this.handlePokemonSelected(selectedPokemon);
    };
    
    // Afficher l'interface
    this.pokemonSelectionUI.show();
    
    return true;
  }

  handlePokemonSelected(selectedPokemon) {
    console.log('🔄 [BattleIntegration] Pokémon sélectionné pour changement:', selectedPokemon);
    
    this.isSelectingPokemon = false;
    
    if (!selectedPokemon) {
      console.log('❌ [BattleIntegration] Changement annulé');
      return;
    }
    
    if (this.battleConnection && this.isInBattle) {
      console.log('🔄 [BattleIntegration] Envoi changement de Pokémon...');
      this.battleConnection.switchPokemon(selectedPokemon.id);
    }
  }

  testBattle() {
    console.log('🧪 [BattleIntegration] Test du système complet avec UI...');
    
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
      connectionStatus: this.battleConnection?.getConnectionStatus(),
      uiTransitionActive: this.battleUITransition?.isBattleActive() || false,
      uiTransitioning: this.battleUITransition?.isCurrentlyTransitioning() || false
    };
  }

  // === UTILITAIRES ===

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
      battleUITransition: !!this.battleUITransition,
      uiManager: !!(window.pokemonUISystem?.uiManager || window.uiManager),
      cssLoaded: !!document.querySelector('#battle-styles')
    };
    
    console.log('🔍 [BattleIntegration] Vérification compatibilité:', checks);
    
    return checks;
  }

  /**
   * Debug complet du système avec UI
   */
  debug() {
    return {
      isInitialized: this.isInitialized,
      state: this.getCurrentBattleState(),
      compatibility: this.checkCompatibility(),
      networkStatus: this.battleConnection?.debug(),
      hasAvailablePokemon: this.pokemonSelectionUI?.hasAvailablePokemon(),
      uiTransition: this.battleUITransition ? {
        active: this.battleUITransition.isBattleActive(),
        transitioning: this.battleUITransition.isCurrentlyTransitioning(),
        state: this.battleUITransition.getCurrentUIState()
      } : null
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
    
    // ✅ Détruire le gestionnaire de transition UI
    if (this.battleUITransition) {
      this.battleUITransition.destroy();
      this.battleUITransition = null;
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
    
    console.log('✅ [BattleIntegration] Système complet détruit avec UI');
  }
}
