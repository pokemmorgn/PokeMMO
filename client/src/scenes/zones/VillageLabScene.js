// ===============================================
// VillageLabScene.js - Version AVEC StarterSelector pour InteractionManager
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { integrateStarterSelectorToScene } from '../../components/StarterSelector.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
    this.starterSelector = null;
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageLabScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions
    this.add.text(16, 16, 'Laboratoire Pokémon\nFlèches pour se déplacer\nAppuyez sur "E" près de la table starter', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil
    this.setupLabEvents();
    
    // ✅ NOUVEAU: Setup du StarterSelector
    this.setupStarterSelector();
    
    // ✅ NOUVEAU: Créer les NPCs depuis la map
    this.setupNPCs();
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageLabScene] Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
      }
    });
  }

  // ✅ NOUVEAU: Setup du StarterSelector
  setupStarterSelector() {
    console.log("[VillageLabScene] Setup StarterSelector...");
    
    try {
      // Intégrer le StarterSelector
      this.starterSelector = integrateStarterSelectorToScene(this, this.networkManager);
      console.log("✅ [VillageLabScene] StarterSelector intégré");
      
    } catch (error) {
      console.error("❌ [VillageLabScene] Erreur setup StarterSelector:", error);
    }
  }

  // ✅ NOUVEAU: Créer les NPCs depuis la map
  setupNPCs() {
    console.log("[VillageLabScene] ⚙️ setupNPCs appelé");
    
    if (!this.npcManager) {
      console.error("[VillageLabScene] ❌ NpcManager manquant!");
      return;
    }

    const npcLayer = this.map.getObjectLayer('NPCs');
    if (!npcLayer) {
      console.warn("[VillageLabScene] ⚠️ Layer 'NPCs' non trouvé");
      return;
    }

    console.log(`[VillageLabScene] Layer NPCs trouvé avec ${npcLayer.objects.length} objet(s)`);

    // Créer les NPCs depuis les objets de la map
    const npcsToCreate = [];
    
    npcLayer.objects.forEach(npcObj => {
      console.log(`[VillageLabScene] Traitement objet: ${npcObj.name}`, npcObj);
      
      // Convertir les propriétés Tiled en format simple
      const properties = {};
      if (npcObj.properties) {
        npcObj.properties.forEach(prop => {
          properties[prop.name] = prop.value;
        });
      }

      const npcData = {
        id: npcObj.id,
        name: npcObj.name || 'NPC',
        x: npcObj.x + (npcObj.width || 32) / 2,
        y: npcObj.y + (npcObj.height || 32) / 2,
        sprite: npcObj.name || 'defaultNpc',
        properties: properties
      };

      npcsToCreate.push(npcData);
      console.log(`[VillageLabScene] 👤 NPC préparé: ${npcData.name}`, npcData);
    });

    // Créer tous les NPCs
    if (npcsToCreate.length > 0) {
      console.log(`[VillageLabScene] 🚀 Création de ${npcsToCreate.length} NPC(s)...`);
      this.npcManager.spawnNpcs(npcsToCreate);
      console.log(`[VillageLabScene] ✅ NPCs créés avec succès`);
    } else {
      console.log(`[VillageLabScene] ℹ️ Aucun NPC à créer`);
    }
  }

  cleanup() {
    console.log("[VillageLabScene] cleanup appelé");
    
    // Nettoyer le starter selector
    if (this.starterSelector) {
      if (typeof this.starterSelector.destroy === 'function') {
        this.starterSelector.destroy();
      }
      this.starterSelector = null;
    }
    
    this.transitionCooldowns = {};
    super.cleanup();
  }
}

console.log("✅ VillageLabScene chargée avec StarterSelector et création NPCs");
