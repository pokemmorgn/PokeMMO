// client/src/managers/BattleIntegration.js - Intégration du système de combat

import { BattleScene } from '../scenes/BattleScene.js';
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleConnection } from '../Battle/BattleConnection.js';

/**
 * Gestionnaire d'intégration du système de combat avec le jeu principal
 */
export class BattleIntegration {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Composants du système de combat
    this.battleScene = null;
    this.battleManager = null;
    this.battleConnection = null;
    
    // État
    this.isInitialized = false;
    this.isInBattle = false;
    
    // Références
    this.worldRoom = null;
    this.phaserGame = null;
    
    // ✅ NOUVEAU: Variables pour tracking BattleRoom
    this.currentBattleRoomId = null;
    this.currentBattleType = null;
    this.currentBattlePhase = 'waiting';
    
    console.log('⚔️ [BattleIntegration] Constructeur initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise le système de combat
   */
  async initialize(worldRoom, phaserGame) {
    console.log('🔧 [BattleIntegration] Initialisation du système de combat...');
    
    if (!worldRoom || !phaserGame) {
      console.error('❌ [BattleIntegration] WorldRoom ou PhaserGame manquant');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.phaserGame = phaserGame;
    
    try {
      // 1. Créer la BattleConnection
      this.battleConnection = new BattleConnection(this.gameManager);
      
      // 2. ✅ CORRECTION: Créer un mock NetworkManager pour BattleConnection
      const mockNetworkManager = {
        worldRoom: worldRoom,
        client: worldRoom.connection || worldRoom._client,
        room: worldRoom,
        isConnected: true
      };
      
      const connectionSuccess = this.battleConnection.initialize(mockNetworkManager);
      
      if (!connectionSuccess) {
        console.error('❌ [BattleIntegration] Échec initialisation BattleConnection');
        return false;
      }
      
      // 3. ✅ CORRECTION: Vérifier que la BattleScene existe dans Phaser (PROTÉGÉ)
      let battleSceneExists = false;
      
      try {
        // ✅ NOUVELLE PROTECTION: Vérifier d'abord que scene.manager existe
        if (!phaserGame.scene || !phaserGame.scene.manager) {
          console.warn('⚠️ [BattleIntegration] Phaser scene manager pas prêt');
          throw new Error('Scene manager non disponible');
        }
        
        const existingScene = phaserGame.scene.getScene('BattleScene');
        if (existingScene) {
          console.log('✅ [BattleIntegration] BattleScene trouvée dans Phaser');
          this.battleScene = existingScene;
          battleSceneExists = true;
        }
      } catch (sceneCheckError) {
        console.log('ℹ️ [BattleIntegration] BattleScene pas accessible:', sceneCheckError.message);
        battleSceneExists = false;
      }
      
      // 4. Si pas trouvée, créer et ajouter la BattleScene
      if (!battleSceneExists) {
        console.log('🏗️ [BattleIntegration] Création de la BattleScene...');
        
        // ✅ CORRECTION: Import dynamique si BattleScene pas disponible
        if (typeof BattleScene === 'undefined') {
          console.log('⚠️ [BattleIntegration] BattleScene non importée, création basique...');
          
          // Créer une BattleScene basique temporaire
          this.battleScene = {
            scene: { key: 'BattleScene' },
            battleManager: null,
            isActive: false,
            endBattle: () => console.log('🏁 Combat terminé'),
            showBattleInterface: () => console.log('🖥️ Interface de combat'),
            create: () => {},
            init: (data) => {
              console.log('🎬 BattleScene initialisée avec:', data);
              this.battleManager = data.battleManager || null;
            }
          };
        } else {
          this.battleScene = new BattleScene();
        }
        
        try {
          // ✅ PROTECTION: Vérifier que le scene manager est prêt avant d'ajouter
          if (phaserGame.scene && phaserGame.scene.add) {
            phaserGame.scene.add('BattleScene', this.battleScene, false);
            console.log('✅ [BattleIntegration] BattleScene ajoutée à Phaser');
          } else {
            console.warn('⚠️ [BattleIntegration] Scene manager pas prêt pour ajout');
          }
        } catch (addError) {
          console.warn('⚠️ [BattleIntegration] Erreur ajout BattleScene:', addError);
          // Continuer quand même
        }
      }
      
      // 5. Setup des événements
      this.setupBattleEvents();
      
      this.isInitialized = true;
      console.log('✅ [BattleIntegration] Système de combat initialisé');
      return true;
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  // === CONFIGURATION DES ÉVÉNEMENTS ===

  setupBattleEvents() {
    if (!this.battleConnection) return;
    
    console.log('🔗 [BattleIntegration] Configuration des événements...');
    
    // Événements de la BattleConnection
    this.battleConnection.on('wildEncounterStart', (data) => {
      this.handleEncounterStart(data);
    });
    
    this.battleConnection.on('battleRoomCreated', (data) => {
      this.handleBattleRoomCreated(data);
    });
    
    this.battleConnection.on('battleRoomConnected', (data) => {
      this.handleBattleRoomJoined(data);
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
    
    // ✅ NOUVEAU: Événements pour les phases de combat
    this.battleConnection.on('phaseChange', (data) => {
      this.handlePhaseChange(data);
    });
    
    this.battleConnection.on('battleJoined', (data) => {
      this.handleBattleJoined(data);
    });
    
    this.battleConnection.on('battleMessage', (data) => {
      this.handleBattleMessage(data);
    });
    
    // Événements du GameManager (si disponibles)
    if (this.gameManager) {
      // Écouter les rencontres sauvages depuis le GameManager
      this.gameManager.on?.('wildEncounter', (data) => {
        this.handleWildEncounterFromGame(data);
      });
      
      // Écouter les changements d'état du joueur
      this.gameManager.on?.('playerStateChange', (data) => {
        this.handlePlayerStateChange(data);
      });
    }
    
    console.log('✅ [BattleIntegration] Événements configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  handleEncounterStart(data) {
    console.log('🐾 [BattleIntegration] Début de rencontre:', data);

    if (this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Déjà en combat, ignoré');
      return;
    }

    // Marquer comme en combat
    this.isInBattle = true;

    // Notifier le GameManager s'il a un callback
    if (this.gameManager?.onBattleStart) {
      this.gameManager.onBattleStart(data);
    }

    // === ✅ CORRECTION: LANCER LA SCÈNE DE COMBAT IMMÉDIATEMENT ===
    console.log('🎬 [BattleIntegration] === LANCEMENT BATTLESCENE ===');
    console.log('🎮 PhaserGame disponible:', !!this.phaserGame);
    
    // ✅ PROTECTION: Vérifier que le scene manager existe (version sécurisée)
    try {
      if (this.phaserGame?.scene?.manager?.keys) {
        const sceneKeys = Object.keys(this.phaserGame.scene.manager.keys);
        console.log('📊 Scènes Phaser disponibles:', sceneKeys);
        
        // Vérifier si BattleScene existe
        const hasBattleScene = sceneKeys.includes('BattleScene');
        console.log(`🎬 BattleScene existe: ${hasBattleScene}`);
        
      } else {
        console.warn('⚠️ [BattleIntegration] Scene manager Phaser pas encore prêt');
      }
    } catch (sceneError) {
      console.warn('⚠️ [BattleIntegration] Erreur accès scene manager:', sceneError.message);
      console.log('🆘 [BattleIntegration] Passage en mode fallback DOM forcé');
    }
    
    try {
      // ✅ TEMPORAIRE: Toujours utiliser l'interface temporaire pour l'instant
      console.log('🎬 [BattleIntegration] Utilisation interface temporaire (développement)');
      this.createTemporaryBattleInterface(data);
      return;

    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur lancement BattleScene:', error);
      
      // ✅ FALLBACK: Interface DOM temporaire
      this.createTemporaryBattleInterface(data);
    }

    console.log('✅ [BattleIntegration] handleEncounterStart terminé');
  }

  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleIntegration] BattleRoom créée:', data.battleRoomId);
    
    // ✅ CORRECTION: Stocker les infos directement
    this.currentBattleRoomId = data.battleRoomId;
    this.currentBattleType = data.battleType;
    
    // ✅ NOUVEAU: Mettre à jour l'interface temporaire si elle existe
    this.updateTemporaryInterfaceStatus(data.battleRoomId, 'BattleRoom créée');
    
    // Rejoindre automatiquement la BattleRoom
    if (this.battleConnection) {
      console.log('🚪 [BattleIntegration] Tentative de rejoindre BattleRoom...');
      // ✅ CORRECTION: Utiliser la méthode correcte
      this.battleConnection.connectToBattleRoom?.(data.battleRoomId);
    }
    
    console.log('✅ [BattleIntegration] BattleRoom created handler terminé');
  }

  handleBattleRoomJoined(data) {
    console.log('🚪 [BattleIntegration] BattleRoom rejointe:', data);
    
    // ✅ NOUVEAU: Mettre à jour l'interface
    this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, 'Connecté à la BattleRoom');
    
    // Maintenant on peut vraiment commencer le combat
    if (this.battleScene && this.battleScene.battleManager) {
      // Le BattleManager va recevoir les événements via la BattleConnection
      console.log('✅ [BattleIntegration] Prêt pour le combat');
    }
  }

  // ✅ NOUVEAU: Handler pour battleJoined
  handleBattleJoined(data) {
    console.log('⚔️ [BattleIntegration] Combat effectivement rejoint:', data);
    
    // Mettre à jour l'interface avec l'ID de combat réel
    this.updateTemporaryInterfaceRoomId(data.battleId || data.battleRoomId);
    this.updateTemporaryInterfaceStatus(data.battleId, 'Combat rejoint !');
  }

  // ✅ NOUVEAU: Handler pour les changements de phase
  handlePhaseChange(data) {
    console.log('🔄 [BattleIntegration] Phase changée:', data.phase);
    
    this.currentBattlePhase = data.phase;
    
    // Mettre à jour l'interface selon la phase
    let statusText = 'Phase inconnue';
    
    switch (data.phase) {
      case 'waiting':
        statusText = 'En attente...';
        break;
      case 'intro':
        statusText = 'Préparation combat...';
        break;
      case 'team_selection':
        statusText = 'Sélection équipe...';
        break;
      case 'battle':
        statusText = 'Combat en cours !';
        break;
      case 'ended':
        statusText = 'Combat terminé';
        break;
      default:
        statusText = `Phase: ${data.phase}`;
    }
    
    this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, statusText);
  }

  // ✅ NOUVEAU: Handler pour les messages de combat
  handleBattleMessage(data) {
    console.log('💬 [BattleIntegration] Message combat:', data.message);
    
    // Mettre à jour l'interface avec le dernier message
    this.updateTemporaryInterfaceMessage(data.message);
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleIntegration] Combat effectivement commencé:', data);
    
    this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, 'Combat démarré !');
    
    // S'assurer que l'interface est visible
    if (this.battleScene) {
      this.battleScene.showBattleInterface();
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleIntegration] Fin de combat:', data);
    
    this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, 'Combat terminé');
    
    // Programmer la fin du combat
    setTimeout(() => {
      this.endBattle(data);
    }, 3000); // 3 secondes pour voir les résultats
  }

  handleBattleLeft(data) {
    console.log('👋 [BattleIntegration] Combat quitté:', data);
    
    this.endBattle(data);
  }

  handleBattleError(data) {
    console.error('❌ [BattleIntegration] Erreur de combat:', data);
    
    this.updateTemporaryInterfaceStatus('ERREUR', `Erreur: ${data.message}`);
    
    // Afficher l'erreur à l'utilisateur
    if (this.gameManager?.showError) {
      this.gameManager.showError(`Erreur de combat: ${data.message}`);
    }
    
    // Forcer la fin du combat en cas d'erreur critique
    if (data.critical) {
      this.endBattle({ reason: 'error', error: data });
    }
  }

  handleWildEncounterFromGame(data) {
    console.log('🎮 [BattleIntegration] Rencontre depuis le jeu:', data);
    
    // Si le système de combat est prêt, démarrer
    if (this.isInitialized && !this.isInBattle) {
      // Cette rencontre vient probablement d'un grass patch ou autre trigger
      // On peut démarrer le processus de combat
      this.startWildBattle(data);
    }
  }

  handlePlayerStateChange(data) {
    // Réagir aux changements d'état du joueur
    if (data.inBattle !== undefined && data.inBattle !== this.isInBattle) {
      this.isInBattle = data.inBattle;
      
      if (!this.isInBattle && this.battleScene) {
        // Le joueur n'est plus en combat, nettoyer
        this.endBattle({ reason: 'state_change' });
      }
    }
  }

  // === ✅ INTERFACE DOM TEMPORAIRE AMÉLIORÉE ===

  /**
   * Crée une interface de combat temporaire en DOM si la BattleScene échoue
   */
  createTemporaryBattleInterface(data) {
    console.log('🆘 [BattleIntegration] Création interface temporaire DOM...');

    // ✅ Gestion améliorée du Room ID pour le debug
    const debugRoomId = this.currentBattleRoomId || 
                       this.battleConnection?.currentBattleRoomId || 
                       this.battleConnection?.battleRoomId || 
                       'En cours...';

    // ✅ Créer un overlay DOM simple
    const overlay = document.createElement('div');
    overlay.id = 'temp-battle-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Courier New', monospace;
      color: white;
      text-align: center;
    `;

    // ✅ Contenu de l'interface
    overlay.innerHTML = `
      <div style="background: rgba(0,0,0,0.8); padding: 30px; border-radius: 15px; border: 3px solid #gold;">
        <h1 style="color: #FFD700; margin-bottom: 20px; font-size: 2.5em;">⚔️ COMBAT POKÉMON ⚔️</h1>
        
        <div style="margin: 20px 0; font-size: 1.5em;">
          <p>🐾 Un ${data.pokemon?.name || 'Pokémon'} sauvage apparaît !</p>
          <p style="color: #90EE90;">Niveau ${data.pokemon?.level || '?'}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin: 10px 0;">
            <p>🔄 <strong>Connexion au système de combat...</strong></p>
            <p style="color: #FFD700;">BattleRoom ID: <span id="battle-room-id">${debugRoomId}</span></p>
            <p style="color: #87CEEB; font-size: 0.9em;">Status: <span id="battle-status">Connexion...</span></p>
            <p style="color: #DDD; font-size: 0.8em; margin-top: 10px;">Message: <span id="battle-message">Initialisation...</span></p>
          </div>
        </div>
        
        <div style="margin-top: 30px;">
          <button id="temp-battle-exit" style="
            background: #DC143C;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.2em;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.3s;
          ">🚪 Quitter le Combat</button>
        </div>
        
        <div style="margin-top: 20px; font-size: 0.9em; color: #DDD;">
          <p>💡 <em>Interface temporaire - Le système de combat est en cours de développement</em></p>
        </div>
      </div>
    `;

    // ✅ Ajouter au DOM
    document.body.appendChild(overlay);

    // ✅ Gérer le bouton de sortie
    const exitButton = overlay.querySelector('#temp-battle-exit');
    exitButton.addEventListener('click', () => {
      console.log('🚪 [BattleIntegration] Sortie du combat temporaire');
      this.exitBattle('manual');
      overlay.remove();
    });

    // ✅ Hover effect sur le bouton
    exitButton.addEventListener('mouseenter', () => {
      exitButton.style.background = '#FF6347';
    });
    exitButton.addEventListener('mouseleave', () => {
      exitButton.style.background = '#DC143C';
    });

    // ✅ Auto-fermeture après 60 secondes (augmenté pour le debug)
    setTimeout(() => {
      if (overlay.parentNode) {
        console.log('⏰ [BattleIntegration] Auto-fermeture interface temporaire');
        this.exitBattle('timeout');
        overlay.remove();
      }
    }, 60000);

    console.log('✅ [BattleIntegration] Interface temporaire créée');
  }

  // ✅ NOUVELLES MÉTHODES: Mise à jour interface temporaire

  updateTemporaryInterfaceRoomId(roomId) {
    const element = document.getElementById('battle-room-id');
    if (element && roomId) {
      element.textContent = roomId;
      console.log(`🔄 [BattleIntegration] Room ID mis à jour: ${roomId}`);
    }
  }

  updateTemporaryInterfaceStatus(roomId, status) {
    const statusElement = document.getElementById('battle-status');
    if (statusElement) {
      statusElement.textContent = status;
      console.log(`🔄 [BattleIntegration] Status mis à jour: ${status}`);
    }
    
    // Mettre à jour aussi le room ID si fourni
    if (roomId) {
      this.updateTemporaryInterfaceRoomId(roomId);
    }
  }

  updateTemporaryInterfaceMessage(message) {
    const messageElement = document.getElementById('battle-message');
    if (messageElement) {
      messageElement.textContent = message;
      console.log(`💬 [BattleIntegration] Message mis à jour: ${message}`);
    }
  }

  // === GESTION DE LA BATTLESCENE ===

  startBattleScene(data) {
    if (!this.battleScene || !this.phaserGame) {
      console.error('❌ [BattleIntegration] BattleScene ou PhaserGame manquant');
      return;
    }
    
    console.log('🎬 [BattleIntegration] Démarrage BattleScene...');
    
    try {
      // ✅ PROTECTION: Vérifier que scene est disponible
      if (!this.phaserGame.scene) {
        console.error('❌ [BattleIntegration] Phaser scene manager indisponible');
        return;
      }
      
      // Réveiller ou démarrer la BattleScene
      if (this.phaserGame.scene.isActive('BattleScene')) {
        this.phaserGame.scene.bringToTop('BattleScene');
      } else {
        this.phaserGame.scene.start('BattleScene', {
          gameManager: this.gameManager,
          networkHandler: this.battleConnection,
          encounterData: data
        });
      }
      
      // Mettre en pause la scène principale (optionnel)
      if (this.gameManager?.pauseGame) {
        this.gameManager.pauseGame('battle');
      }
      
      console.log('✅ [BattleIntegration] BattleScene démarrée');
      
    } catch (error) {
      console.error('❌ [BattleIntegration] Erreur démarrage BattleScene:', error);
    }
  }

  endBattle(data = {}) {
    console.log('🏁 [BattleIntegration] Fin du combat:', data);
    
    this.isInBattle = false;
    this.currentBattleRoomId = null;
    this.currentBattleType = null;
    this.currentBattlePhase = 'waiting';
    
    // ✅ Fermer l'interface temporaire si elle existe
    const tempOverlay = document.getElementById('temp-battle-overlay');
    if (tempOverlay) {
      console.log('🧹 [BattleIntegration] Suppression interface temporaire');
      tempOverlay.remove();
    }
    
    // Fermer la BattleScene
    if (this.battleScene) {
      this.battleScene.endBattle();
      
      // Remettre la scène en sommeil
      try {
        if (this.phaserGame?.scene?.isActive('BattleScene')) {
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
    
    // Notifier le GameManager
    if (this.gameManager?.onBattleEnd) {
      this.gameManager.onBattleEnd(data);
    }
    
    console.log('✅ [BattleIntegration] Combat terminé et nettoyé');
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
    
    if (this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Déjà en combat');
      return false;
    }
    
    console.log('🐾 [BattleIntegration] Démarrage combat sauvage manuel...');
    
    // Envoyer la demande via la WorldRoom
    if (this.battleConnection?.worldRoom) {
      this.battleConnection.sendToWorld('startWildBattle', {
        wildPokemon: wildPokemonData.pokemon || wildPokemonData,
        location: wildPokemonData.location || 'unknown',
        method: wildPokemonData.method || 'manual'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Quitte le combat actuel
   */
  exitBattle(reason = 'manual') {
    if (!this.isInBattle) {
      console.warn('⚠️ [BattleIntegration] Pas en combat');
      return false;
    }
    
    console.log(`🚪 [BattleIntegration] Sortie de combat: ${reason}`);
    
    if (this.battleConnection) {
      this.battleConnection.leaveBattle(reason);
    } else {
      // Forcer la fin si pas de connexion
      this.endBattle({ reason });
    }
    
    return true;
  }

  /**
   * Vérifie si on est en combat
   */
  isCurrentlyInBattle() {
    return this.isInBattle && this.battleConnection?.isConnected;
  }

  /**
   * Obtient l'état du combat actuel
   */
  getCurrentBattleState() {
    if (!this.isInBattle || !this.battleConnection) {
      return null;
    }
    
    return {
      inBattle: this.isInBattle,
      connected: this.battleConnection.isConnected,
      battleRoomId: this.currentBattleRoomId,
      battleType: this.currentBattleType,
      phase: this.currentBattlePhase,
      battleState: this.battleConnection.battleState
    };
  }

  /**
   * Envoie une action de combat
   */
  sendBattleAction(actionType, data = {}) {
    if (!this.isInBattle || !this.battleConnection) {
      console.error('❌ [BattleIntegration] Pas en combat ou pas connecté');
      return false;
    }
    
    return this.battleConnection.performBattleAction(actionType, data);
  }

  // === MÉTHODES D'INTÉGRATION AVEC LE GAMEMANAGER ===

  /**
   * Connecte le système aux événements du GameManager
   */
  connectToGameManager(gameManager) {
    this.gameManager = gameManager;
    
    // Si le GameManager a des méthodes spécifiques pour le combat
    if (gameManager.registerBattleSystem) {
      gameManager.registerBattleSystem(this);
    }
    
    // Ajouter notre système comme handler des rencontres
    if (gameManager.setEncounterHandler) {
      gameManager.setEncounterHandler((data) => {
        return this.handleWildEncounterFromGame(data);
      });
    }
    
    console.log('🔗 [BattleIntegration] Connecté au GameManager');
  }

  /**
   * Vérifie la compatibilité avec le système existant
   */
  checkCompatibility() {
    const checks = {
      phaserGame: !!this.phaserGame,
      worldRoom: !!this.worldRoom,
      battleConnection: !!this.battleConnection,
      battleScene: !!this.battleScene,
      gameManager: !!this.gameManager
    };
    
    console.log('🔍 [BattleIntegration] Vérification compatibilité:', checks);
    
    return Object.values(checks).every(check => check);
  }

  // === DEBUG ===

  /**
   * Méthodes de debug pour tester le système
   */
  debug() {
    return {
      isInitialized: this.isInitialized,
      isInBattle: this.isInBattle,
      currentBattleRoomId: this.currentBattleRoomId,
      currentBattleType: this.currentBattleType,
      currentBattlePhase: this.currentBattlePhase,
      compatibility: this.checkCompatibility(),
      connectionStatus: this.battleConnection?.getConnectionStatus(),
      battleState: this.getCurrentBattleState()
    };
  }

  /**
   * Test manuel d'un combat
   */
  testBattle() {
    console.log('🧪 [BattleIntegration] Test de combat...');
    
    if (!this.isInitialized) {
      console.error('❌ [BattleIntegration] Système non initialisé');
      return false;
    }
    
    const testPokemon = {
      pokemonId: 25, // Pikachu
      level: 5,
      name: 'Pikachu',
      shiny: false,
      gender: 'male',
      hp: 20,
      maxHp: 20,
      moves: ['thunder_shock', 'growl', 'tail_whip', 'thunder_wave']
    };
    
    console.log('🎮 [BattleIntegration] Simulation encounter start...');
    
    // ✅ Simuler directement un encounter start pour tester l'interface
    this.handleEncounterStart({
      type: 'wild',
      pokemon: testPokemon,
      location: 'test_area',
      method: 'manual_test',
      message: `Un ${testPokemon.name} sauvage apparaît !`
    });
    
    return true;
  }

  /**
   * Test de l'interface temporaire uniquement
   */
  testTemporaryInterface() {
    console.log('🧪 [BattleIntegration] Test interface temporaire...');
    
    const testData = {
      pokemon: {
        name: 'Pikachu Test',
        level: 10
      }
    };
    
    this.createTemporaryBattleInterface(testData);
    
    return true;
  }

  /**
   * Test de mise à jour des éléments d'interface
   */
  testInterfaceUpdates() {
    console.log('🧪 [BattleIntegration] Test mise à jour interface...');
    
    // Simuler une progression de combat
    setTimeout(() => this.updateTemporaryInterfaceRoomId('test-room-123'), 1000);
    setTimeout(() => this.updateTemporaryInterfaceStatus('test-room-123', 'BattleRoom créée'), 2000);
    setTimeout(() => this.updateTemporaryInterfaceStatus('test-room-123', 'Connecté'), 3000);
    setTimeout(() => this.updateTemporaryInterfaceMessage('Un Pikachu sauvage apparaît !'), 4000);
    setTimeout(() => this.updateTemporaryInterfaceStatus('test-room-123', 'Sélection équipe...'), 5000);
    setTimeout(() => this.updateTemporaryInterfaceStatus('test-room-123', 'Combat en cours !'), 6000);
    
    return true;
  }

  /**
   * Méthode de debug pour voir l'état complet
   */
  debugFullState() {
    console.log('🔍 [BattleIntegration] === ÉTAT COMPLET ===');
    console.log('📊 État général:', {
      isInitialized: this.isInitialized,
      isInBattle: this.isInBattle,
      currentBattleRoomId: this.currentBattleRoomId,
      currentBattleType: this.currentBattleType,
      currentBattlePhase: this.currentBattlePhase
    });
    
    console.log('🔗 Connexions:', {
      hasWorldRoom: !!this.worldRoom,
      hasPhaserGame: !!this.phaserGame,
      hasBattleConnection: !!this.battleConnection,
      hasBattleScene: !!this.battleScene,
      hasGameManager: !!this.gameManager
    });
    
    if (this.battleConnection) {
      console.log('📡 BattleConnection:', {
        isConnected: this.battleConnection.isConnected,
        currentBattleRoomId: this.battleConnection.currentBattleRoomId,
        hasNetworkHandler: !!this.battleConnection.networkHandler
      });
    }
    
    console.log('🖥️ Interface:', {
      hasTemporaryOverlay: !!document.getElementById('temp-battle-overlay'),
      battleRoomIdElement: !!document.getElementById('battle-room-id'),
      battleStatusElement: !!document.getElementById('battle-status'),
      battleMessageElement: !!document.getElementById('battle-message')
    });
    
    return this.debug();
  }

  // === UTILITAIRES ===

  /**
   * Supprime l'interface temporaire si elle existe
   */
  removeTemporaryInterface() {
    const overlay = document.getElementById('temp-battle-overlay');
    if (overlay) {
      overlay.remove();
      console.log('🧹 [BattleIntegration] Interface temporaire supprimée manuellement');
      return true;
    }
    return false;
  }

  /**
   * Vérifie si l'interface temporaire est active
   */
  hasTemporaryInterface() {
    return !!document.getElementById('temp-battle-overlay');
  }

  /**
   * Force la mise à jour de l'interface avec les données actuelles
   */
  refreshTemporaryInterface() {
    if (this.hasTemporaryInterface()) {
      this.updateTemporaryInterfaceRoomId(this.currentBattleRoomId || 'Non défini');
      
      let statusText = 'État inconnu';
      switch (this.currentBattlePhase) {
        case 'waiting': statusText = 'En attente...'; break;
        case 'intro': statusText = 'Préparation...'; break;
        case 'team_selection': statusText = 'Sélection équipe...'; break;
        case 'battle': statusText = 'Combat en cours !'; break;
        case 'ended': statusText = 'Combat terminé'; break;
        default: statusText = `Phase: ${this.currentBattlePhase}`;
      }
      
      this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, statusText);
      
      console.log('🔄 [BattleIntegration] Interface temporaire rafraîchie');
    }
  }

  // === GESTION DES ÉVÉNEMENTS AVANCÉS ===

  /**
   * Handler pour les événements de connexion/déconnexion
   */
  handleConnectionEvents() {
    if (this.battleConnection) {
      this.battleConnection.on('connected', () => {
        console.log('🔗 [BattleIntegration] BattleConnection établie');
        this.updateTemporaryInterfaceStatus(this.currentBattleRoomId, 'Connexion établie');
      });
      
      this.battleConnection.on('disconnected', (reason) => {
        console.log('🔌 [BattleIntegration] BattleConnection fermée:', reason);
        this.updateTemporaryInterfaceStatus('DÉCONNECTÉ', `Connexion fermée: ${reason}`);
        
        // Auto-fermer l'interface après 5 secondes
        setTimeout(() => {
          this.endBattle({ reason: 'disconnected' });
        }, 5000);
      });
      
      this.battleConnection.on('error', (error) => {
        console.error('❌ [BattleIntegration] Erreur BattleConnection:', error);
        this.updateTemporaryInterfaceStatus('ERREUR', `Erreur: ${error.message}`);
      });
    }
  }

  // === NETTOYAGE ===

  /**
   * Nettoie et détruit le système de combat
   */
  async destroy() {
    console.log('💀 [BattleIntegration] Destruction du système...');
    
    // Terminer tout combat en cours
    if (this.isInBattle) {
      await this.exitBattle('destroy');
    }
    
    // Supprimer l'interface temporaire
    this.removeTemporaryInterface();
    
    // Nettoyer la BattleConnection
    if (this.battleConnection) {
      await this.battleConnection.destroy();
      this.battleConnection = null;
    }
    
    // Nettoyer la BattleScene
    if (this.battleScene && this.phaserGame) {
      try {
        if (this.phaserGame.scene) {
          this.phaserGame.scene.remove('BattleScene');
        }
      } catch (error) {
        console.warn('⚠️ [BattleIntegration] Erreur suppression BattleScene:', error);
      }
      this.battleScene = null;
    }
    
    // Nettoyer les références
    this.gameManager = null;
    this.worldRoom = null;
    this.phaserGame = null;
    
    // Reset des variables d'état
    this.isInitialized = false;
    this.isInBattle = false;
    this.currentBattleRoomId = null;
    this.currentBattleType = null;
    this.currentBattlePhase = 'waiting';
    
    console.log('✅ [BattleIntegration] Système détruit');
  }
}

// === EXPORTS ET MÉTHODES GLOBALES ===

// Fonction globale pour les tests (accessible via window.testBattle)
if (typeof window !== 'undefined') {
  window.BattleIntegration = BattleIntegration;
  
  // Helper pour les tests rapides
  window.testBattleIntegration = function() {
    if (window.gameManager?.battleIntegration) {
      return window.gameManager.battleIntegration.testBattle();
    } else {
      console.warn('⚠️ BattleIntegration non disponible dans window.gameManager');
      return false;
    }
  };
  
  // Helper pour debug l'état
  window.debugBattleIntegration = function() {
    if (window.gameManager?.battleIntegration) {
      return window.gameManager.battleIntegration.debugFullState();
    } else {
      console.warn('⚠️ BattleIntegration non disponible dans window.gameManager');
      return null;
    }
  };
  
  // Helper pour forcer la fermeture
  window.closeBattleInterface = function() {
    if (window.gameManager?.battleIntegration) {
      return window.gameManager.battleIntegration.removeTemporaryInterface();
    } else {
      const overlay = document.getElementById('temp-battle-overlay');
      if (overlay) {
        overlay.remove();
        return true;
      }
      return false;
    }
  };
}
