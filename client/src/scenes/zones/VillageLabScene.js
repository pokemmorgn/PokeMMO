// ===============================================
// VillageLabScene.js - Version complète corrigée sans blocage
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { integrateStarterSelectorToScene } from '../../components/StarterSelector.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
    this.starterSelector = null;
    this.starterTableZones = []; // Zones de détection pour la table starter
    this.serverSyncEnabled = true; // Activer la synchronisation serveur
    
    // ✅ FIX: Initialiser l'état du starter selector par défaut
    this.isStarterSelectionActive = () => false;
    this.starterSelectorVisible = false;
  }

  // ✅ Position par défaut pour VillageLabScene
  getDefaultSpawnPosition(fromZone) {
    switch(fromZone) {
      case 'VillageScene':
        return { x: 50, y: 100 }; // Entrée depuis le village
      default:
        return { x: 50, y: 100 }; // Position par défaut
    }
  }

  // ✅ Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    console.log(`[VillageLabScene] Joueur positionné à (${player.x}, ${player.y})`);
  }

  create() {
    console.log("🚨 DEBUT VillageLabScene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "T" to test StarterSelector\nPress "E" near starter table\nPress "F" to force starter test\nPress "S" to sync with server\nPress "U" to force unblock', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);

    console.log("⚙️ Setup lab events...");
    this.setupLabEvents();

    console.log("⚙️ Setup NPCs...");
    this.setupNPCs();
    
    console.log("⚙️ Setup StarterSelector...");
    this.setupStarterSelector();

    // ✅ FIX: Ajouter une touche de déblocage d'urgence
    this.input.keyboard.on('keydown-U', () => {
      console.log("🚨 DÉBLOCAGE D'URGENCE ACTIVÉ");
      this.forceUnblock();
    });

    console.log("🚨 FIN VillageLabScene.create()");
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🧪 Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
        console.log("InfoText mise à jour");
      }
    });

    // Gestion des messages serveur (dialogues, starter...)
    if (this.networkManager?.room) {
      this.networkManager.room.onMessage('professorDialog', (data) => this.showProfessorDialog(data));
      this.networkManager.room.onMessage('starterReceived', (data) => this.showStarterReceived(data));
      this.networkManager.room.onMessage('welcomeToLab', (data) => this.showWelcomeMessage(data));
      this.networkManager.room.onMessage("requestStarterSelection", (data) => {
        console.log("📥 [VillageLabScene] Demande de sélection starter du serveur");
        this.showStarterSelection(data.availableStarters);
      });
      this.networkManager.room.onMessage("starterSelected", (data) => {
        console.log("✅ [VillageLabScene] Starter confirmé:", data);
        this.onStarterConfirmed(data);
      });

      // Handler pour la réponse d'éligibilité
      this.networkManager.room.onMessage("starterEligibility", (data) => {
        console.log("📥 [VillageLabScene] === RÉPONSE ÉLIGIBILITÉ REÇUE ===");
        console.log("📊 Données reçues:", data);
        
        if (data.eligible) {
          console.log("✅ [VillageLabScene] Joueur éligible - Affichage sélection");
          this.showStarterSelection();
        } else {
          console.log("❌ [VillageLabScene] Joueur non éligible:", data.reason);
          console.log("📍 Debug position:", data.playerPosition);
          console.log("🏢 Table configurée:", data.tablePosition);
          
          let message = data.message || "Vous ne pouvez pas choisir de starter.";
          
          // Ajouter des infos de debug si disponibles
          if (data.debugInfo) {
            message += `\nDébug: ${data.debugInfo.tablesConfigured} tables configurées`;
          }
          
          this.showSimpleDialog("Professeur", message);
        }
      });

      // ✅ NOUVEAUX HANDLERS pour la synchronisation serveur
      this.networkManager.room.onMessage("starterTablePositionSynced", (data) => {
        console.log("✅ [VillageLabScene] Position synchronisée avec serveur:", data);
        
        if (data.success) {
          this.showSafeMessage(`Table starter configurée dans ${data.zone}`, 'success');
        }
      });

      this.networkManager.room.onMessage("starterProximityResult", (data) => {
        console.log("📊 [VillageLabScene] Résultat test proximité:", data);
        
        if (data.near) {
          console.log("✅ [VillageLabScene] Serveur confirme: Joueur proche");
          this.showSafeMessage("Serveur: Joueur détecté proche de la table", 'success');
        } else {
          console.warn("⚠️ [VillageLabScene] Serveur: Joueur non détecté proche");
          this.showSafeMessage("Serveur: Joueur trop loin de la table", 'warning');
          console.log("📍 Position joueur:", data.position);
          console.log("📍 Position table serveur:", data.tablePosition);
        }
      });
    }
  }

  setupStarterSelector() {
    try {
      // Intégrer le StarterSelector à cette scène
      this.starterSelector = integrateStarterSelectorToScene(this, this.networkManager);
      
      console.log("✅ [VillageLabScene] StarterSelector intégré");
      
      // ✅ FIX: S'assurer que la méthode isStarterSelectionActive est définie
      if (this.starterSelector && typeof this.starterSelector.isActive === 'function') {
        this.isStarterSelectionActive = () => this.starterSelector.isActive();
      } else {
        console.warn("⚠️ [VillageLabScene] StarterSelector.isActive() non disponible, utilisation par défaut");
        this.isStarterSelectionActive = () => this.starterSelectorVisible;
      }
      
      // Ajouter les triggers
      this.addStarterTrigger();
      
    } catch (error) {
      console.error("❌ [VillageLabScene] Erreur intégration StarterSelector:", error);
      // ✅ FIX: En cas d'erreur, s'assurer qu'on a une fonction par défaut
      this.isStarterSelectionActive = () => false;
    }
  }

  // ✅ Configuration des triggers avec détection automatique et debug amélioré
  addStarterTrigger() {
    console.log("🎯 [VillageLabScene] Configuration triggers starter...");
    
    // Charger les zones de starter table depuis la carte
    this.loadStarterTableZones();
    
    // ✅ TRIGGER: Touche T pour test (toujours disponible)
    this.input.keyboard.on('keydown-T', () => {
      console.log("🧪 [TEST] Touche T - Test StarterSelector");
      this.showStarterSelection();
    });

    // ✅ TRIGGER: Touche F pour forcer le test (bypass proximité)
    this.input.keyboard.on('keydown-F', () => {
      console.log("🔧 [FORCE] Touche F - Test forcé avec bypass");
      this.triggerStarterSelection();
    });

    // ✅ NOUVEAU TRIGGER: Touche S pour synchroniser avec serveur
    this.input.keyboard.on('keydown-S', () => {
      console.log("📡 [SYNC] Touche S - Synchronisation avec serveur");
      this.syncWithServer();
    });

    // ✅ TRIGGER: Touche E pour interaction avec table starter
    this.input.keyboard.on('keydown-E', () => {
      console.log("🎯 [E] === INTERACTION E DÉCLENCHÉE ===");
      
      console.log("🎯 [E] Vérification proximité...");
      
      if (this.isPlayerNearStarterTable()) {
        console.log("✅ [E] Joueur proche - Déclenchement");
        this.triggerStarterSelection();
      } else {
        console.log("❌ [E] Joueur trop loin");
        
        // Afficher la position et les zones pour debug
        if (this.player) {
          console.log(`👤 Position actuelle: (${this.player.x}, ${this.player.y})`);
        }
        
        if (this.starterTableZones.length > 0) {
          console.log("🏢 Tables disponibles:");
          this.starterTableZones.forEach((zone, i) => {
            const player = this.playerManager?.getMyPlayer();
            const distance = player ? Phaser.Math.Distance.Between(
              player.x, player.y,
              zone.centerX, zone.centerY
            ) : -1;
            console.log(`  ${i}: ${zone.name} à (${zone.centerX}, ${zone.centerY}) - Distance: ${Math.round(distance)}px`);
          });
        } else {
          console.log("❌ Aucune table starter détectée!");
        }
        
        this.showSafeMessage("Approchez-vous de la table du professeur.");
      }
    });

    console.log("✅ [VillageLabScene] Triggers starter configurés");
  }

  // ✅ Charger les zones depuis la carte Tiled - VERSION AVEC SYNCHRONISATION
  loadStarterTableZones() {
    console.log("📍 [StarterTable] Recherche des zones starter table...");
    
    this.starterTableZones = []; // Reset
    
    if (!this.map) {
      console.error("❌ [StarterTable] Carte non chargée");
      return;
    }

    let foundZones = 0;
    
    // ✅ FIX: Utiliser getObjectLayer() pour les objectgroups
    const worldsObjectLayer = this.map.getObjectLayer('Worlds');
    
    if (worldsObjectLayer && worldsObjectLayer.objects) {
      console.log(`🔍 [StarterTable] ObjectLayer "Worlds" trouvé avec ${worldsObjectLayer.objects.length} objets`);
      
      worldsObjectLayer.objects.forEach((obj, index) => {
        console.log(`🔍 [StarterTable] Objet ${index}:`, {
          name: obj.name,
          type: obj.type,
          properties: obj.properties,
          x: obj.x,
          y: obj.y
        });
        
        if (this.hasStarterTableProperty(obj)) {
          const zone = {
            x: obj.x,
            y: obj.y,
            width: obj.width || 32,
            height: obj.height || 32,
            centerX: obj.x + (obj.width || 32) / 2,
            centerY: obj.y + (obj.height || 32) / 2,
            name: obj.name || 'StarterTable',
            // ✅ AJOUT: Rayon de détection identique au serveur
            radius: Math.max(obj.width || 32, obj.height || 32) + 60
          };
          
          this.starterTableZones.push(zone);
          foundZones++;
          console.log(`✅ [StarterTable] Zone starter détectée:`, zone);
          this.createStarterTableIndicator(zone);
          
          // ✅ NOUVEAU: Synchroniser automatiquement avec le serveur
          if (this.serverSyncEnabled) {
            this.syncStarterTableWithServer(zone);
          }
        }
      });
    } else {
      console.warn("⚠️ [StarterTable] Layer 'Worlds' non trouvé");
    }
    
    console.log(`📊 [StarterTable] Total zones starter trouvées: ${foundZones}`);
    
    if (foundZones === 0) {
      console.warn("⚠️ [StarterTable] Aucune zone starter table trouvée!");
    }
  }

  // ✅ NOUVELLE MÉTHODE: Synchroniser avec le serveur
  syncStarterTableWithServer(zone) {
    // Vérifier qu'on a un NetworkManager et une room
    if (!this.networkManager?.room) {
      console.warn("⚠️ [StarterTable] NetworkManager non disponible pour sync");
      return;
    }
    
    // Obtenir le nom de la zone actuelle
    const currentZone = this.scene?.key || 'villagelab';
    
    console.log(`📡 [StarterTable] Synchronisation avec serveur pour zone: ${currentZone}`);
    
    // Envoyer la position au serveur
    this.networkManager.room.send("syncStarterTablePosition", {
      zone: currentZone,
      centerX: zone.centerX,
      centerY: zone.centerY,
      radius: zone.radius,
      source: "client_detection",
      timestamp: Date.now()
    });
  }

  // ✅ NOUVELLE MÉTHODE: Synchronisation manuelle avec serveur
  syncWithServer() {
    console.log("📡 [StarterTable] Synchronisation manuelle avec serveur...");
    
    if (this.starterTableZones.length === 0) {
      console.warn("⚠️ [StarterTable] Aucune zone à synchroniser");
      this.showSafeMessage("Aucune table starter détectée à synchroniser", 'warning');
      return;
    }
    
    // Synchroniser toutes les zones
    this.starterTableZones.forEach(zone => {
      this.syncStarterTableWithServer(zone);
    });
    
    // Test de proximité après synchronisation
    setTimeout(() => {
      if (this.networkManager?.room) {
        this.networkManager.room.send("testStarterProximity");
      }
    }, 1000);
    
    this.showSafeMessage("Synchronisation en cours...", 'info');
  }

  // ✅ NOUVELLE MÉTHODE: Test complet client-serveur
  async testClientServerSync() {
    console.log("🧪 [StarterTable] Test synchronisation client-serveur...");
    
    if (!this.networkManager?.room) {
      console.error("❌ [StarterTable] NetworkManager non disponible");
      return;
    }
    
    // 1. Envoyer les positions détectées côté client
    this.starterTableZones.forEach(zone => {
      this.syncStarterTableWithServer(zone);
    });
    
    // 2. Attendre un peu puis tester la proximité
    setTimeout(() => {
      this.networkManager.room.send("testStarterProximity");
    }, 2000);
    
    this.showSafeMessage("Test de synchronisation démarré...", 'info');
  }

  // ✅ Vérifier si un objet a la propriété startertable
  hasStarterTableProperty(obj) {
    // Vérifier les propriétés custom de Tiled
    if (obj.properties) {
      // Tiled peut stocker les propriétés de différentes façons
      if (Array.isArray(obj.properties)) {
        // Format tableau (Tiled récent)
        const starterProp = obj.properties.find(prop => 
          prop.name === 'startertable' || prop.name === 'starterTable'
        );
        if (starterProp && (starterProp.value === true || starterProp.value === 'true')) {
          console.log(`🎯 [StarterTable] Propriété trouvée (array):`, starterProp);
          return true;
        }
      } else if (typeof obj.properties === 'object') {
        // Format objet (Tiled ancien)
        if (obj.properties.startertable === true || 
            obj.properties.startertable === 'true' ||
            obj.properties.starterTable === true || 
            obj.properties.starterTable === 'true') {
          console.log(`🎯 [StarterTable] Propriété trouvée (object):`, obj.properties);
          return true;
        }
      }
    }
    
    // Fallback: Vérifier le nom ou type
    if (obj.name && obj.name.toLowerCase().includes('starter')) {
      console.log(`🎯 [StarterTable] Détecté par nom: ${obj.name}`);
      return true;
    }
    
    if (obj.type && obj.type.toLowerCase().includes('starter')) {
      console.log(`🎯 [StarterTable] Détecté par type: ${obj.type}`);
      return true;
    }
    
    return false;
  }

  // ✅ Créer un indicateur visuel pour debug
  createStarterTableIndicator(zone) {
    // Rectangle de debug (semi-transparent)
    const indicator = this.add.rectangle(
      zone.centerX,
      zone.centerY,
      zone.width,
      zone.height,
      0x00ff00,
      0.3
    );
    indicator.setDepth(5);
    
    // Cercle de rayon de détection
    const radiusCircle = this.add.graphics();
    radiusCircle.lineStyle(2, 0x00ff00, 0.5);
    radiusCircle.strokeCircle(zone.centerX, zone.centerY, zone.radius);
    radiusCircle.setDepth(4);
    
    // Texte indicatif
    const label = this.add.text(
      zone.centerX,
      zone.centerY - zone.height / 2 - 10,
      `STARTER TABLE\n[E] pour interagir\n[F] pour forcer\n[S] pour sync\nRayon: ${zone.radius}px`,
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 150, 0, 0.8)',
        padding: { x: 4, y: 2 },
        align: 'center'
      }
    );
    label.setOrigin(0.5).setDepth(6);
    
    console.log(`🎨 [StarterTable] Indicateur visuel créé à (${zone.centerX}, ${zone.centerY}) r=${zone.radius}`);
  }

  // ✅ Vérifier si le joueur est près d'une starter table AVEC FIX PLAYER
  isPlayerNearStarterTable() {
    console.log("🔍 [CLIENT] === VÉRIFICATION PROXIMITÉ TABLE ===");
    
    // ✅ FIX: Récupérer le joueur depuis PlayerManager
    const player = this.playerManager?.getMyPlayer();
    
    if (!player || !this.starterTableZones || this.starterTableZones.length === 0) {
      console.log("❌ [CLIENT] Pas de joueur ou pas de zones starter");
      console.log("  - player:", !!player);
      console.log("  - this.starterTableZones:", this.starterTableZones);
      return false;
    }
    
    const playerX = player.x;
    const playerY = player.y;
    
    console.log(`👤 [CLIENT] Position joueur: (${playerX}, ${playerY})`);
    console.log(`📊 [CLIENT] Nombre de zones starter: ${this.starterTableZones.length}`);
    
    for (const zone of this.starterTableZones) {
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        zone.centerX, zone.centerY
      );
      
      console.log(`📏 [CLIENT] Zone ${zone.name}:`);
      console.log(`  - Centre: (${zone.centerX}, ${zone.centerY})`);
      console.log(`  - Distance: ${Math.round(distance)}px`);
      console.log(`  - Seuil: ${zone.radius}px`);
      console.log(`  - Proche: ${distance <= zone.radius ? 'OUI' : 'NON'}`);
      
      if (distance <= zone.radius) {
        console.log(`✅ [CLIENT] JOUEUR PROCHE de ${zone.name}!`);
        return true;
      }
    }
    
    console.log(`❌ [CLIENT] JOUEUR TROP LOIN de toutes les tables`);
    return false;
  }

  // ✅ Déclencher la sélection starter avec debug amélioré
  triggerStarterSelection() {
    console.log("🎯 [CLIENT] === DÉCLENCHEMENT SÉLECTION STARTER ===");
    
    // Vérifier NetworkManager
    if (!this.networkManager) {
      console.error("❌ [CLIENT] NetworkManager indisponible!");
      this.showSafeMessage("Erreur réseau - NetworkManager manquant");
      return;
    }
    
    if (!this.networkManager.room) {
      console.error("❌ [CLIENT] Room non connectée!");
      this.showSafeMessage("Erreur réseau - Room non connectée");
      return;
    }
    
    console.log("✅ [CLIENT] NetworkManager OK, envoi de la demande...");
    console.log("📤 [CLIENT] Envoi checkStarterEligibility...");
    
    try {
      this.networkManager.room.send("checkStarterEligibility");
      console.log("✅ [CLIENT] Message checkStarterEligibility envoyé!");
      
      // Debug: Afficher l'état de la connexion
      console.log("🔗 [CLIENT] État Room:", {
        id: this.networkManager.room.id,
        sessionId: this.networkManager.room.sessionId,
        state: this.networkManager.room.state
      });
      
    } catch (error) {
      console.error("❌ [CLIENT] Erreur envoi message:", error);
      this.showSafeMessage("Erreur lors de l'envoi de la demande");
    }
  }

  // ✅ Afficher un message sans boucle infinie - VERSION AMÉLIORÉE
  showSafeMessage(message, type = 'info') {
    console.log(`💬 [VillageLabScene] ${message}`);
    
    // Couleurs selon le type
    const colors = {
      info: { bg: 'rgba(0, 100, 200, 0.8)', text: '#ffffff' },
      success: { bg: 'rgba(0, 150, 0, 0.8)', text: '#ffffff' },
      warning: { bg: 'rgba(255, 165, 0, 0.8)', text: '#000000' },
      error: { bg: 'rgba(200, 0, 0, 0.8)', text: '#ffffff' }
    };
    
    const color = colors[type] || colors.info;
    
    // Créer un dialogue simple sans passer par le système de notifications
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      message,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: color.text,
        backgroundColor: color.bg,
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
    });
  }

  setupNPCs() {
    console.log("⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => {
        this.createNPC(npcObj);
      });
    } else {
      console.warn("⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`Création NPC: ${npcData.name || 'Sans nom'}`);
    const color = npcData.name === 'Professeur' ? 0x2ecc71 : 0x3498db;
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      color
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Assistant');
    });

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    if (npcName === 'Professeur') {
      // ✅ Interaction avec Professeur = demande d'éligibilité starter au serveur
      this.triggerStarterSelection();
    } else {
      const messages = {
        Assistant: 'Je m\'occupe de l\'entretien du laboratoire.',
        Chercheur: 'Nous étudions les Pokémon ici. Fascinant !',
        Stagiaire: 'J\'apprends encore... C\'est compliqué !',
      };
      const message = messages[npcName] || 'Bonjour ! Je travaille ici.';
      this.showSimpleDialog(npcName, message);
    }
  }

  showProfessorStarterDialog() {
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      'Professeur: "Bienvenue ! Choisissez votre premier Pokémon !"',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    // Afficher la sélection après 2 secondes
    this.time.delayedCall(2000, () => {
      dialogueBox.destroy();
      this.showStarterSelection();
    });
  }

  showSimpleDialog(npcName, message) {
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`💬 Dialogue avec ${npcName} détruit`);
    });
  }

  // === Gestion du dialogue professeur & starter via serveur ===

  showProfessorDialog(data) {
    const dialogBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Professeur: "${data.message}"`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 350 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    this.time.delayedCall(6000, () => dialogBox.destroy());
  }

  showStarterReceived(data) {
    const msg = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      data.message,
      {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 20, y: 15 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(4000, () => msg.destroy());
  }

  showWelcomeMessage(data) {
    if (data.message) {
      const box = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        `Laboratoire: "${data.message}"`,
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 10, y: 8 },
          wordWrap: { width: 350 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

      this.time.delayedCall(3000, () => box.destroy());
    }
  }

  // ✅ Actions après confirmation du starter
  onStarterConfirmed(data) {
    console.log("🎉 [VillageLabScene] Actions après sélection du starter:", data);
    
    // Marquer que la sélection n'est plus active
    this.starterSelectorVisible = false;
    
    // Dialogue de félicitations
    const congratsBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Félicitations ! Vous avez choisi ${data.starterName || data.starterId} !`,
      {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#00ff00',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: { x: 20, y: 15 },
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);

    // Animation de célébration
    this.tweens.add({
      targets: congratsBox,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: 2
    });

    // Supprimer après 5 secondes
    this.time.delayedCall(5000, () => {
      congratsBox.destroy();
    });
  }

  // ✅ Méthode pour afficher la sélection de starter
  showStarterSelection(availableStarters = null) {
    console.log("🎯 [VillageLabScene] Affichage sélection starter");
    
    // Marquer que la sélection est active
    this.starterSelectorVisible = true;
    
    // Si on a un StarterSelector intégré, l'utiliser
    if (this.starterSelector && typeof this.starterSelector.show === 'function') {
      this.starterSelector.show(availableStarters);
    } else {
      console.warn("⚠️ [VillageLabScene] StarterSelector non disponible");
      this.showSafeMessage("StarterSelector non disponible", 'error');
    }
  }

  // ✅ Test manuel
  testStarterSelection() {
    console.log("🧪 [VillageLabScene] Test manuel du StarterSelector");
    this.showStarterSelection();
  }

  // ✅ NOUVELLE MÉTHODE: Déblocage d'urgence
  forceUnblock() {
    console.log("🚨 [VillageLabScene] DÉBLOCAGE D'URGENCE ACTIVÉ");
    
    // 1. Réinitialiser l'état du starter selector
    this.starterSelectorVisible = false;
    this.isStarterSelectionActive = () => false;
    
    // 2. Fermer le starter selector s'il est ouvert
    if (this.starterSelector) {
      if (typeof this.starterSelector.close === 'function') {
        this.starterSelector.close();
      }
      if (typeof this.starterSelector.hide === 'function') {
        this.starterSelector.hide();
      }
      // Reset de la visibilité
      if (this.starterSelector.visible !== undefined) {
        this.starterSelector.visible = false;
      }
    }
    
    // 3. Réactiver les mouvements du joueur
    if (this.playerManager) {
      if (typeof this.playerManager.setMovementEnabled === 'function') {
        this.playerManager.setMovementEnabled(true);
      }
      // Fallback: essayer de réactiver directement
      if (this.playerManager.movementEnabled !== undefined) {
        this.playerManager.movementEnabled = true;
      }
    }
    
    // 4. Réactiver les inputs de la scène
    if (this.input && this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
    
    // 5. S'assurer que les physics sont actives
    if (this.physics && this.physics.world) {
      this.physics.world.resume();
    }
    
    // 6. Nettoyer les éventuels overlays bloquants
    this.children.list.forEach(child => {
      if (child.getData && child.getData('isStarterOverlay')) {
        child.destroy();
      }
    });
    
    console.log("✅ [VillageLabScene] Déblocage terminé");
    this.showSafeMessage("Laboratoire débloqué avec succès!", 'success');
  }

  // ✅ Méthode pour vérifier l'état du starter selector
  checkStarterSelectorState() {
    console.log("🔍 [VillageLabScene] État StarterSelector:", {
      exists: !!this.starterSelector,
      isActive: this.isStarterSelectionActive ? this.isStarterSelectionActive() : 'fonction non définie',
      visible: this.starterSelector ? this.starterSelector.visible : 'N/A',
      starterSelectorVisible: this.starterSelectorVisible
    });
    
    return {
      exists: !!this.starterSelector,
      isActive: this.isStarterSelectionActive(),
      visible: this.starterSelectorVisible
    };
  }

  // ✅ FIX PRINCIPAL: Méthode update() sécurisée
  update() {
    // ✅ TOUJOURS appeler super.update() en premier pour maintenir le système de base
    super.update();
    
    // ✅ Logique additionnelle seulement si nécessaire
    // Pas de blocage possible ici car super.update() est déjà appelé
    
    // Debug occasionnel (optionnel)
    if (this.time.now % 5000 < 16) { // Toutes les 5 secondes environ
      const state = this.checkStarterSelectorState();
      if (state.isActive) {
        console.log("🔄 [VillageLabScene] StarterSelector actif détecté");
      }
    }
  }

  // ✅ CLEAN UP
  cleanup() {
    console.log("⚙️ [VillageLabScene] Nettoyage en cours...");
    
    // Nettoyer le StarterSelector
    if (this.starterSelector) {
      if (typeof this.starterSelector.destroy === 'function') {
        this.starterSelector.destroy();
      }
      this.starterSelector = null;
    }

    // Nettoyer les zones starter
    this.starterTableZones = [];
    
    // Reset des états
    this.starterSelectorVisible = false;
    this.isStarterSelectionActive = () => false;

    this.transitionCooldowns = {};
    console.log("✅ [VillageLabScene] Nettoyage terminé");
    super.cleanup();
  }

  destroy() {
    console.log("🗑️ [VillageLabScene] Destruction en cours...");
    
    // Nettoyer le StarterSelector au destroy aussi
    if (this.starterSelector) {
      if (typeof this.starterSelector.destroy === 'function') {
        this.starterSelector.destroy();
      }
      this.starterSelector = null;
    }

    // Nettoyer les zones starter
    this.starterTableZones = [];
    
    // Reset des états
    this.starterSelectorVisible = false;
    this.isStarterSelectionActive = () => false;

    console.log("✅ [VillageLabScene] Destruction terminée");
    super.destroy();
  }
}

// ✅ FONCTIONS UTILITAIRES GLOBALES POUR TESTER
window.testLabStarter = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.testStarterSelection) {
    labScene.testStarterSelection();
  } else {
    console.warn("❌ VillageLabScene non trouvée ou pas de méthode test");
  }
};

window.getLabScene = () => {
  return window.game?.scene?.getScene('VillageLabScene');
};

// ✅ FONCTION DEBUG POUR TESTER LA DÉTECTION
window.debugStarterTable = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene) {
    console.log("🔍 Debug StarterTable zones:", labScene.starterTableZones);
    console.log("🎯 Joueur près d'une table:", labScene.isPlayerNearStarterTable());
    if (labScene.map) {
      console.log("🗺️ Layers disponibles:", labScene.map.layers.map(l => `${l.name} (${l.type})`));
    }
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

// ✅ FONCTION POUR FORCER LA POSITION DU JOUEUR (debug)
window.movePlayerToTable = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.playerManager && labScene.starterTableZones.length > 0) {
    const player = labScene.playerManager.getMyPlayer();
    const table = labScene.starterTableZones[0];
    
    if (player && table) {
      player.x = table.centerX;
      player.y = table.centerY;
      console.log(`🎯 Joueur déplacé à (${table.centerX}, ${table.centerY})`);
    } else {
      console.warn("❌ Joueur ou table non trouvé");
    }
  } else {
    console.warn("❌ Impossible de déplacer le joueur");
  }
};

// ✅ NOUVELLES FONCTIONS DE TEST ET SYNCHRONISATION
window.testStarterTableSync = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.testClientServerSync) {
    labScene.testClientServerSync();
  } else {
    console.warn("❌ VillageLabScene non trouvée ou pas de méthode testClientServerSync");
  }
};

window.syncStarterTables = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.syncWithServer) {
    labScene.syncWithServer();
  } else {
    console.warn("❌ VillageLabScene non trouvée ou pas de méthode syncWithServer");
  }
};

// ✅ FONCTION POUR TESTER LA PROXIMITÉ SERVEUR
window.testServerProximity = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.networkManager?.room) {
    console.log("🧪 Test proximité serveur...");
    labScene.networkManager.room.send("testStarterProximity");
  } else {
    console.warn("❌ Impossible de tester la proximité serveur");
  }
};

// ✅ NOUVELLE FONCTION: Déblocage d'urgence
window.forceUnblockLab = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.forceUnblock) {
    labScene.forceUnblock();
  } else {
    console.warn("❌ VillageLabScene non trouvée ou pas de méthode forceUnblock");
  }
};

// ✅ FONCTION DEBUG COMPLÈTE
window.debugStarterSystem = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (!labScene) {
    console.warn("❌ VillageLabScene non trouvée");
    return;
  }
  
  console.log("🔍 === DEBUG COMPLET SYSTÈME STARTER ===");
  console.log("📊 Zones détectées côté client:", labScene.starterTableZones.length);
  
  labScene.starterTableZones.forEach((zone, i) => {
    console.log(`  Zone ${i}:`, zone);
  });
  
  const player = labScene.playerManager?.getMyPlayer();
  if (player) {
    console.log("👤 Position joueur:", { x: player.x, y: player.y });
    console.log("🎯 Proximité client:", labScene.isPlayerNearStarterTable());
  }
  
  console.log("🔗 NetworkManager:", !!labScene.networkManager);
  console.log("🏠 Room:", !!labScene.networkManager?.room);
  
  // État du StarterSelector
  labScene.checkStarterSelectorState();
  
  // Test serveur si disponible
  if (labScene.networkManager?.room) {
    console.log("🧪 Test proximité serveur...");
    labScene.networkManager.room.send("testStarterProximity");
  }
};

// ✅ FONCTION POUR FORCER UNE POSITION DE TABLE
window.forceTablePosition = (x, y, radius = 100) => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene && labScene.networkManager?.room) {
    console.log(`🔧 Force position table: (${x}, ${y}) r=${radius}`);
    
    labScene.networkManager.room.send("syncStarterTablePosition", {
      zone: 'villagelab',
      centerX: x,
      centerY: y,
      radius: radius,
      source: "manual_override"
    });
  } else {
    console.warn("❌ Impossible de forcer la position");
  }
};

// ✅ NOUVELLE FONCTION: Redémarrer la scène
window.restartLabScene = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene) {
    console.log("🔄 Redémarrage de VillageLabScene...");
    labScene.scene.restart();
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

// ✅ NOUVELLE FONCTION: Retour au village
window.backToVillage = () => {
  const labScene = window.game?.scene?.getScene('VillageLabScene');
  if (labScene) {
    console.log("🏠 Retour au village...");
    labScene.scene.start('VillageScene');
  } else {
    console.warn("❌ VillageLabScene non trouvée");
  }
};

// ✅ AFFICHAGE DES COMMANDES DISPONIBLES
console.log("🎯 === COMMANDES STARTER DISPONIBLES ===");
console.log("📋 Commandes de base :");
console.log("  • window.testLabStarter() - Test sélection starter");
console.log("  • window.debugStarterTable() - Debug zones détectées");
console.log("  • window.movePlayerToTable() - Déplacer joueur à la table");
console.log("");
console.log("📋 Commandes de synchronisation :");
console.log("  • window.testStarterTableSync() - Test sync client-serveur");
console.log("  • window.syncStarterTables() - Synchroniser avec serveur");
console.log("  • window.testServerProximity() - Test proximité serveur");
console.log("  • window.debugStarterSystem() - Debug complet du système");
console.log("");
console.log("📋 Commandes de déblocage :");
console.log("  • window.forceUnblockLab() - DÉBLOCAGE D'URGENCE");
console.log("  • window.restartLabScene() - Redémarrer la scène");
console.log("  • window.backToVillage() - Retour au village");
console.log("");
console.log("📋 Commandes avancées :");
console.log("  • window.forceTablePosition(x, y, radius) - Forcer position table");
console.log("  • window.getLabScene() - Récupérer la scène laboratoire");
console.log("");
console.log("🎮 Touches en jeu :");
console.log("  • [T] - Test StarterSelector");
console.log("  • [F] - Test forcé (bypass proximité)");
console.log("  • [S] - Synchroniser avec serveur");
console.log("  • [E] - Interagir avec table starter");
console.log("  • [U] - DÉBLOCAGE D'URGENCE");
console.log("==================================");
