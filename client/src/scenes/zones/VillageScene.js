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
    
    // ✅ INITIALISER L'INTRO PSYDUCK (sans dialogue)
    this.initializePsyduckIntro();
    
    // Affichage instructions (exemple)
    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);
    
    // Evénements d'accueil custom
    this.setupVillageEvents();
    
    // ✅ DÉMARRER L'INTRO PSYDUCK SIMPLE (sans dialogue)
    this.startPsyduckIntroIfNeeded();
  }

  // ✅ NOUVELLE MÉTHODE: Initialiser le manager Psyduck
  initializePsyduckIntro() {
    try {
      console.log('[VillageScene] 🦆 Initialisation intro Psyduck...');
      
      this.psyduckIntroManager = new PsyduckIntroManager(this);
      
      // ✅ Configurer les positions selon votre carte village
      // À adapter selon les coordonnées réelles de votre laboratoire et téléport
      this.psyduckIntroManager.setLabAndTeleportPositions(
        400, 250,  // Position devant le lab (x, y) - À ADAPTER
        400, 180   // Position du téléport (x, y) - À ADAPTER
      );
      
      console.log('[VillageScene] ✅ Manager Psyduck initialisé');
      
    } catch (error) {
      console.error('[VillageScene] ❌ Erreur init Psyduck:', error);
    }
  }

  // ✅ MÉTHODE SIMPLIFIÉE: Démarrer l'intro simple (sans dialogue)
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

  shouldPlayPsyduckIntro() {
    // ✅ Pour le moment, toujours jouer (vous pouvez modifier cette logique)
    if (this.hasPlayedIntro) {
      return false;
    }
    
    // ✅ Vérifier localStorage pour éviter de rejouer
    if (typeof window !== 'undefined') {
      const hasSeenVillageIntro = window.localStorage?.getItem('hasSeenVillageIntro');
      if (hasSeenVillageIntro === 'true') {
        return false;
      }
    }
    
    return true; // Jouer l'intro
  }

  onPsyduckIntroComplete() {
    console.log('[VillageScene] 🎉 Intro Psyduck simple complétée');
    
    this.hasPlayedIntro = true;
    
    // ✅ Sauvegarder pour éviter de rejouer
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('hasSeenVillageIntro', 'true');
    }
    
    // ✅ PAS de message de bienvenue - juste un log
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
    }
  }

  resetPsyduckIntro() {
    this.hasPlayedIntro = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('hasSeenVillageIntro');
    }
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
