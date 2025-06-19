// client/src/scenes/zones/VillageScene.js - Exemple d'intégration du système de quêtes

import { BaseZoneScene } from "./BaseZoneScene.js";
import { QuestSystem } from "../../game/QuestSystem.js";

export class VillageScene extends BaseZoneScene {
  constructor() {
    super("VillageScene");
    this.mapName = "village";
  }

  create(data) {
    // Appel du create parent
    super.create(data);

    // === INITIALISATION DU SYSTÈME DE QUÊTES ===
    if (this.room && !this.questSystem) {
      this.questSystem = new QuestSystem(this, this.room);
      console.log("🎯 Système de quêtes initialisé pour VillageScene");
    }

    // === CONTRÔLES SPÉCIFIQUES AUX QUÊTES ===
    this.setupQuestControls();

    // === ZONES DE PROGRESSION AUTOMATIQUE ===
    this.setupQuestZones();

    // === OBJETS COLLECTIBLES (exemple) ===
    this.setupCollectibleItems();
  }

  setupQuestControls() {
    // Raccourci Q pour ouvrir le journal des quêtes
    this.input.keyboard.on('keydown-Q', () => {
      if (this.questSystem && this.questSystem.canPlayerInteract()) {
        this.questSystem.toggleQuestJournal();
      }
    });

    // Interaction avec NPCs (touche E)
    this.input.keyboard.on('keydown-E', () => {
      if (!this.questSystem || !this.questSystem.canPlayerInteract()) return;

      const closestNpc = this.npcManager.getClosestNpc(
        this.player.x, 
        this.player.y, 
        64
      );

      if (closestNpc) {
        console.log(`🗣️ Interaction avec ${closestNpc.name}`);
        this.room.send("npcInteract", { npcId: closestNpc.id });
      }
    });
  }

  setupQuestZones() {
    // Créer des zones invisibles pour déclencher des progressions de quête
    
    // Zone "centre du village"
    const villageCenterZone = this.add.rectangle(400, 300, 100, 100, 0x00ff00, 0);
    villageCenterZone.setInteractive();
    villageCenterZone.on('pointerover', () => {
      if (this.questSystem) {
        this.questSystem.triggerReachEvent('village_center', 400, 300, 'village');
      }
    });

    // Zone "fontaine du village"
    const fountainZone = this.add.rectangle(200, 200, 80, 80, 0x0000ff, 0);
    fountainZone.setInteractive();
    fountainZone.on('pointerover', () => {
      if (this.questSystem) {
        this.questSystem.triggerReachEvent('village_fountain', 200, 200, 'village');
      }
    });

    console.log("🗺️ Zones de progression de quête configurées");
  }

  setupCollectibleItems() {
    // Exemple : créer des baies Oran collectibles
    const berrySpawns = [
      { x: 150, y: 400 },
      { x: 650, y: 450 },
      { x: 300, y: 150 },
      { x: 550, y: 200 }
    ];

    this.collectibleBerries = this.physics.add.group();

    berrySpawns.forEach(spawn => {
      const berry = this.physics.add.sprite(spawn.x, spawn.y, 'oran_berry');
      if (!this.textures.exists('oran_berry')) {
        // Créer un placeholder si la texture n'existe pas
        const graphics = this.add.graphics();
        graphics.fillStyle(0xff6600);
        graphics.fillCircle(8, 8, 6);
        graphics.generateTexture('oran_berry', 16, 16);
        graphics.destroy();
        berry.setTexture('oran_berry');
      }
      
      berry.setScale(0.8);
      berry.setInteractive();
      berry.body.setSize(16, 16);
      
      // Animation de flottement
      this.tweens.add({
        targets: berry,
        y: spawn.y - 5,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Collection au contact
      berry.on('pointerdown', () => {
        this.collectBerry(berry);
      });

      this.collectibleBerries.add(berry);
    });

    // Collision joueur-baies
    if (this.player) {
      this.physics.add.overlap(this.player, this.collectibleBerries, (player, berry) => {
        this.collectBerry(berry);
      });
    }
  }

  collectBerry(berry) {
    // Effet visuel de collection
    this.tweens.add({
      targets: berry,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        berry.destroy();
      }
    });

    // Effet de particules
    this.createCollectionEffect(berry.x, berry.y);

    // Notification
    this.showFloatingText(berry.x, berry.y, '+1 Baie Oran', 0x00ff00);

    // Déclencher la progression de quête
    if (this.questSystem) {
      this.questSystem.triggerCollectEvent('oran_berry', 1);
    }

    console.log("🍇 Baie Oran collectée");
  }

  createCollectionEffect(x, y) {
    // Créer un effet de particules simple
    const particles = [];
    
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(x, y, 2, 0xffff00);
      particles.push(particle);
      
      const angle = (i / 8) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  showFloatingText(x, y, text, color = 0xffffff) {
    const floatingText = this.add.text(x, y, text, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 2
    });
    
    floatingText.setOrigin(0.5);
    floatingText.setDepth(100);
    
    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }

  // === GESTION DES COMBATS POKÉMON ===

  onPokemonDefeat(pokemonId) {
    // Méthode à appeler après un combat gagné
    if (this.questSystem) {
      this.questSystem.triggerDefeatEvent(pokemonId);
    }
    
    console.log(`⚔️ Pokémon vaincu: ${pokemonId}`);
  }

  // === OVERRIDE DES MÉTHODES DE CONTRÔLE ===

  setupControls() {
    // Appel de la méthode parent
    super.setupControls();

    // Modifier les contrôles pour tenir compte des quêtes
    const originalUpdate = this.update;
    this.update = (...args) => {
      // Vérifier si on peut bouger (pas de dialog de quête ouvert)
      if (this.questSystem && !this.questSystem.canPlayerInteract()) {
        return; // Bloquer les mouvements
      }
      
      // Appeler l'update normal
      if (originalUpdate) {
        originalUpdate.apply(this, args);
      }
    };
  }

  // === MISE À JOUR DE LA DÉTECTION NPC ===

  update() {
    super.update();

    // Mettre à jour la surbrillance des NPCs proches
    if (this.npcManager && this.player && this.questSystem && this.questSystem.canPlayerInteract()) {
      this.npcManager.highlightClosestNpc(this.player.x, this.player.y, 64);
    }

    // Vérifier les zones de quête
    this.checkQuestZoneProgress();
  }

  checkQuestZoneProgress() {
    if (!this.player || !this.questSystem) return;

    // Cette méthode peut être utilisée pour vérifier la progression basée sur la position
    // Par exemple, déclencher des événements quand le joueur entre dans certaines zones
    
    const playerX = this.player.x;
    const playerY = this.player.y;

    // Exemple : détecter si le joueur est dans la zone du centre du village
    if (playerX > 350 && playerX < 450 && playerY > 250 && playerY < 350) {
      if (!this.hasTriggeredVillageCenter) {
        this.questSystem.triggerReachEvent('village_center', playerX, playerY, 'village');
        this.hasTriggeredVillageCenter = true;
        
        // Reset après quelques secondes pour permettre de retrigguer
        this.time.delayedCall(5000, () => {
          this.hasTriggeredVillageCenter = false;
        });
      }
    }
  }

  // === NETTOYAGE ===

  shutdown() {
    super.shutdown();
    
    // Nettoyage du système de quêtes
    if (this.questSystem) {
      this.questSystem.closeQuestJournal();
    }
  }
}
