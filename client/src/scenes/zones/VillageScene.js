import { BaseZoneScene } from './BaseZoneScene.js';
// ✅ AJUSTER LE CHEMIN selon votre structure de dossiers
import { PsyduckIntroManager } from '../intros/PsyduckIntroManager.js';

export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'village');
    this.transitionCooldowns = {};
    this.psyduckIntroManager = null;
    this.hasPlayedIntro = false;
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    
    console.log(`[VillageScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
    
    // ✅ Setup des listeners serveur en premier
    this.setupServerListeners();
    
    // ✅ VÉRIFIER le contexte d'arrivée
    const initData = this.scene.settings.data || {};
    const fromBeach = initData.fromZone === 'BeachScene' || initData.fromZone === 'beach';
    
    console.log(`[VillageScene] 📊 Contexte:`, {
      fromBeach,
      fromZone: initData.fromZone,
      fromTransition: initData.fromTransition,
      playerPosition: { x: myPlayer.x, y: myPlayer.y }
    });
    
    // ✅ INITIALISER L'INTRO
    this.initializePsyduckIntro();
    
    // Affichage instructions
    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);
    
    // Evénements d'accueil
    this.setupVillageEvents();
    
    // ✅ NOUVEAU: Démarrer l'intro seulement après vérification de la quête
    console.log('[VillageScene] 🎬 Vérification conditions intro...');
    this.checkQuestAndStartIntro();
  }

  // ✅ VERSION SIMPLE: Vérifier la quête avant de démarrer l'intro
  async checkQuestAndStartIntro() {
    console.log('[VillageScene] 🔍 Vérification quête "A Strange New World"...');
    
    // Délai pour laisser le temps aux systèmes de se charger
    this.time.delayedCall(1000, () => {
      this.performSimpleQuestCheck();
    });
  }

  // ✅ MÉTHODE SIMPLE: Vérification directe via le serveur
  performSimpleQuestCheck() {
    if (!this.networkManager?.room) {
      console.warn('[VillageScene] ⚠️ Pas de room - intro par défaut');
      this.startPsyduckIntroIfNeeded();
      return;
    }

    console.log('[VillageScene] 📡 Vérification quête via serveur...');
    
    // Écouter la réponse du serveur (une seule fois)
    this.networkManager.room.onMessage('questCheckResult', (data) => {
      if (data.questId === 'beach_intro_quest') {
        console.log('[VillageScene] 📨 Résultat quête:', data);
        
        if (data.hasQuest || data.completed) {
          console.log('[VillageScene] ✅ Quête beach OK - lancement intro');
          this.startPsyduckIntroIfNeeded();
        } else {
          console.log('[VillageScene] ❌ Pas de quête beach - pas d\'intro');
          this.showNoQuestMessage();
        }
      }
    });
    
    // Demander au serveur
    this.networkManager.room.send('checkPlayerQuest', {
      questId: 'beach_intro_quest'
    });
    
    // Timeout de sécurité
    this.time.delayedCall(3000, () => {
      if (!this.hasPlayedIntro) {
        console.warn('[VillageScene] ⏰ Timeout - intro par défaut');
        this.startPsyduckIntroIfNeeded();
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Afficher message si pas de quête
  showNoQuestMessage() {
    const message = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Vous devez d\'abord terminer votre aventure sur la plage\navant de découvrir les secrets du village...',
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 20, y: 15 },
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Animation d'apparition
    message.setAlpha(0);
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 1000,
      ease: 'Power2'
    });

    // Disparition automatique après 5 secondes
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: message,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          message.destroy();
        }
      });
    });

    console.log('[VillageScene] 💬 Message d\'avertissement affiché');
  }

  // ✅ MÉTHODE EXISTANTE MODIFIÉE: Setup des listeners (optionnel)
  setupServerListeners() {
    if (!this.networkManager?.room) return;
    
    // ✅ NOUVEAU: Écouter les mises à jour de quête
    this.networkManager.room.onMessage('questProgressUpdate', (data) => {
      console.log('[VillageScene] 📈 Mise à jour quête reçue:', data);
      
      // Si la quête beach vient d'être complétée et qu'on n'a pas encore joué l'intro
      if (data.questId === 'beach_intro_quest' && data.completed && !this.hasPlayedIntro) {
        console.log('[VillageScene] 🎉 Quête beach complétée - autorisation intro différée');
        this.time.delayedCall(2000, () => {
          this.startPsyduckIntroIfNeeded();
        });
      }
    });
    
    console.log('[VillageScene] ✅ Connexion au système de quêtes existant');
  }

  // ✅ MÉTHODE EXISTANTE INCHANGÉE: Démarrer l'intro simple (sans dialogue)
  startPsyduckIntroIfNeeded() {
    if (this.shouldPlayPsyduckIntro()) {
      console.log('[VillageScene] 🎬 Démarrage intro Psyduck village SIMPLE...');
      
      // ✅ Délai pour s'assurer que tout est stable
      this.time.delayedCall(2000, () => {
        if (this.psyduckIntroManager && !this.hasPlayedIntro) {
          this.hasPlayedIntro = true;
          
          // ✅ DÉMARRER LA SÉQUENCE SIMPLE (spawn → caméra → monte → disparaît)
          this.psyduckIntroManager.startSimpleVillageIntro(() => {
            console.log('[VillageScene] ✅ Intro Psyduck simple terminée');
            this.onPsyduckIntroComplete();
          });
        }
      });
    } else {
      console.log('[VillageScene] ⏭️ Intro Psyduck non nécessaire');
    }
  }

  // ✅ MÉTHODE EXISTANTE INCHANGÉE: Condition pour jouer l'intro
  shouldPlayPsyduckIntro() {
    // ✅ Vérifier si on a déjà joué l'intro dans cette session
    if (this.hasPlayedIntro) {
      console.log('[VillageScene] ❌ Intro déjà jouée cette session');
      return false;
    }
    
    // ✅ PLUS DE VÉRIFICATION localStorage - TOUJOURS JOUER L'INTRO
    console.log('[VillageScene] ✅ Intro village autorisée');
    return true;
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES...
  hasBeachIntroQuest() {
    try {
      // ✅ Vérifier via le système de quêtes global
      if (window.questSystem) {
        const hasActiveBeachQuest = window.questSystem.hasActiveQuest?.('beach_intro_quest');
        const hasCompletedBeachQuest = window.questSystem.hasCompletedQuest?.('beach_intro_quest');
        
        const hasBeachQuest = hasActiveBeachQuest || hasCompletedBeachQuest;
        console.log('[VillageScene] 🔍 Quête beach:', {
          active: hasActiveBeachQuest,
          completed: hasCompletedBeachQuest,
          hasQuest: hasBeachQuest
        });
        
        return hasBeachQuest;
      }
      
      // ✅ Fallback - retourner false si pas de système
      console.warn('[VillageScene] ⚠️ QuestSystem pas disponible - pas d\'intro');
      return false;
      
    } catch (error) {
      console.error('[VillageScene] ❌ Erreur vérification quête beach:', error);
      return false;
    }
  }

  // ✅ MÉTHODE EXISTANTE INCHANGÉE: Initialiser le manager Psyduck
  initializePsyduckIntro() {
    try {
      console.log('[VillageScene] 🦆 Initialisation intro Psyduck...');
      
      this.psyduckIntroManager = new PsyduckIntroManager(this);
      
      // ✅ POSITIONS CORRECTES pour votre carte village
      this.psyduckIntroManager.setLabAndTeleportPositions(
        896, 528,  // Position devant le lab (spawn Psyduck)
        896, 480   // Position du téléport (un peu plus haut)
      );
      
      console.log('[VillageScene] ✅ Manager Psyduck initialisé - spawn à (896, 528)');
      
    } catch (error) {
      console.error('[VillageScene] ❌ Erreur init Psyduck:', error);
    }
  }

  onPsyduckIntroComplete() {
    console.log('[VillageScene] 🎉 Intro Psyduck simple complétée');
    
    this.hasPlayedIntro = true;
    
    // ✅ PAS DE SAUVEGARDE localStorage - permettre de rejouer
    console.log('[VillageScene] Le joueur peut maintenant jouer normalement');
  }

  setupVillageEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🏘️ Bienvenue à GreenRoot Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nGreenRoot Village\nConnected!');
        console.log("InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x3498db
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
      this.interactWithNPC(npcData.name || 'Villageois');
    });
    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    const dialogues = {
      Maire: "Bienvenue à GreenRoot ! C'est un village paisible.",
      Marchand: "J'ai de super objets à vendre ! Revenez plus tard.",
      Enfant: "J'ai vu des Pokémon près de la forêt !",
      Villageois: "Bonjour ! Belle journée, n'est-ce pas ?",
      Professeur: "Rendez-vous au laboratoire si vous voulez un Pokémon !",
    };
    const message = dialogues[npcName] || 'Bonjour, voyageur !';
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

  create() {
    super.create();
    
    // ✅ TOUCHES DE TEST pour développement
    if (this.input && this.input.keyboard) {
      // Touche Q : Debug statut quête
      this.input.keyboard.on('keydown-Q', () => {
        console.log('[VillageScene] 🔍 Debug quest status...');
        this.debugQuestStatus();
      });
      
      this.input.keyboard.on('keydown-T', () => {
        console.log('[VillageScene] 🧪 Test intro Psyduck SIMPLE...');
        if (this.psyduckIntroManager) {
          this.psyduckIntroManager.testSimpleVillageIntro();
        }
      });

      this.input.keyboard.on('keydown-Y', () => {
        console.log('[VillageScene] 🛑 Arrêt forcé intro Psyduck...');
        if (this.psyduckIntroManager) {
          this.psyduckIntroManager.forceStop();
        }
      });

      this.input.keyboard.on('keydown-U', () => {
        console.log('[VillageScene] 🔍 Debug Psyduck status...');
        if (this.psyduckIntroManager) {
          this.psyduckIntroManager.debugStatus();
        }
      });

      // ✅ NOUVELLE TOUCHE: Reset pour tester à nouveau
      this.input.keyboard.on('keydown-R', () => {
        console.log('[VillageScene] 🔄 Reset intro pour test...');
        this.resetPsyduckIntro();
      });

      // ✅ NOUVELLE TOUCHE: Forcer vérification quête
      this.input.keyboard.on('keydown-C', () => {
        console.log('[VillageScene] 🔍 Force vérification quête...');
        this.checkQuestAndStartIntro();
      });
    }
  }

  // ✅ MÉTHODE EXISTANTE MISE À JOUR: Debug via système existant
  debugQuestStatus() {
    console.log(`🔍 [VillageScene] === DEBUG QUEST STATUS ===`);
    
    // Vérifier le système de quêtes global
    if (window.questSystemGlobal || window.questSystem) {
      const questSystem = window.questSystemGlobal || window.questSystem;
      console.log(`✅ [VillageScene] QuestSystem global disponible`);
      
      // Utiliser les méthodes existantes
      if (typeof questSystem.hasActiveQuest === 'function') {
        const hasBeachActive = questSystem.hasActiveQuest('beach_intro_quest');
        const hasBeachCompleted = questSystem.hasCompletedQuest?.('beach_intro_quest');
        
        console.log(`🏖️ [VillageScene] Quête beach - Active: ${hasBeachActive}, Terminée: ${hasBeachCompleted}`);
      }
      
      // Debug général du système
      if (typeof questSystem.debugQuests === 'function') {
        questSystem.debugQuests();
      }
    } else {
      console.error(`❌ [VillageScene] QuestSystem global MANQUANT`);
      
      // Tester la vérification serveur
      this.performServerQuestCheck();
    }
    
    console.log(`=======================================`);
  }

  resetPsyduckIntro() {
    this.hasPlayedIntro = false;
    this.questSystemReady = false;
    console.log('[VillageScene] 🔄 Intro Psyduck réinitialisée');
  }

  cleanup() {
    this.transitionCooldowns = {};
    
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.destroy();
      this.psyduckIntroManager = null;
    }
    
    console.log("⚙️ cleanup appelé");
    super.cleanup();
  }
}
