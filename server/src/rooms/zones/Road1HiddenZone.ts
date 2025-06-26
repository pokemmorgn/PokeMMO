// ===== server/src/rooms/zones/Road1HiddenZone.ts =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";

interface NPC {
  id: number;
  name: string;
  x: number;
  y: number;
  sprite: string;
  dialogue: string[];
}

interface ZoneObject {
  id: number;
  type: string;
  x: number;
  y: number;
}

interface Spawn {
  name: string;
  x: number;
  y: number;
}

export class Road1HiddenZone implements IZone {
  private room: WorldRoom;
  private npcs: NPC[] = [];
  private mysteriousEvents: boolean = true;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🔮 === ROAD 1 HIDDEN ZONE INIT ===`);
    
    this.setupNPCs();
    this.setupEvents();
    this.setupMysteriousElements();
    
    console.log(`✅ Road1HiddenZone initialisée`);
  }

  private setupNPCs() {
    console.log(`🧙 Setup Road 1 Hidden NPCs...`);
    
    this.npcs = [
      {
        id: 1,
        name: "Sage Mystérieux",
        x: 200,
        y: 150,
        sprite: "sage",
        dialogue: [
          "Peu de dresseurs trouvent cet endroit secret...",
          "Cette zone recèle des mystères anciens.",
          "Les énergies ici sont... particulières."
        ]
      },
      {
        id: 2,
        name: "Oracle des Ombres",
        x: 350,
        y: 280,
        sprite: "oracle",
        dialogue: [
          "Je vois... vous cherchez la vérité cachée.",
          "Les mystères de cette zone ne sont pas pour tous.",
          "Votre destin est lié à cet endroit mystique."
        ]
      },
      {
        id: 3,
        name: "Alchimiste Reclus",
        x: 480,
        y: 200,
        sprite: "alchemist",
        dialogue: [
          "Ici, je crée des objets rares et puissants.",
          "Les ingrédients de cette zone sont uniques.",
          "Mes expériences nécessitent le plus grand secret."
        ]
      }
    ];

    console.log(`✅ ${this.npcs.length} NPCs Road 1 Hidden configurés`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Road 1 Hidden events...`);
    
    // Événements mystérieux périodiques
    if (this.mysteriousEvents) {
      setInterval(() => {
        this.triggerMysteriousEvent();
      }, 30000); // Toutes les 30 secondes
    }
    
    console.log(`✅ Road 1 Hidden events configurés`);
  }

  private setupMysteriousElements() {
    console.log(`✨ Setup éléments mystérieux...`);
    
    // Configuration des objets mystiques
    const mysticalObjects = [
      { id: 1, type: "crystal", x: 100, y: 100 },
      { id: 2, type: "ancient_rune", x: 400, y: 150 },
      { id: 3, type: "energy_portal", x: 300, y: 320 }
    ];
    
    console.log(`🔮 ${mysticalObjects.length} objets mystiques placés`);
  }

  private triggerMysteriousEvent() {
    console.log(`✨ Événement mystérieux déclenché dans Road 1 Hidden`);
    
    // Diffuser l'événement à tous les joueurs présents
    this.room.clients.forEach(client => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && player.currentZone === "road1hidden") {
        client.send("mysteriousEvent", {
          type: "energy_surge",
          message: "Une énergie mystérieuse parcourt la zone...",
          effect: "sparkles"
        });
      }
    });
  }

  async onPlayerEnter(client: Client) {
    console.log(`🔮 === PLAYER ENTER ROAD 1 HIDDEN ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} découvre la zone cachée de la route 1`);

    // Message spécial pour découverte de zone cachée
    client.send("specialMessage", {
      type: "discovery",
      title: "Zone Secrète Découverte !",
      message: "Vous avez trouvé un lieu mystérieux...",
      color: "#9370DB"
    });

    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "road1hidden",
      ...zoneData
    });

    client.send("npcList", this.npcs);

    // Effet d'entrée mystérieux
    client.send("mysteriousEvent", {
      type: "entrance_effect",
      message: "Les énergies mystiques vous accueillent...",
      effect: "purple_mist"
    });

    console.log(`📤 Données Road 1 Hidden envoyées à ${player.name}`);
  }

  onPlayerLeave(client: Client) {
    console.log(`🔮 === PLAYER LEAVE ROAD 1 HIDDEN ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la zone cachée de la route 1`);
      
      // Message de départ mystérieux
      client.send("specialMessage", {
        type: "farewell",
        message: "Les mystères de cette zone resteront gravés en vous...",
        color: "#8A2BE2"
      });
    }
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🔮 === ROAD 1 HIDDEN NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🧙 NPC ID: ${npcId}`);

    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) {
      console.error(`❌ NPC not found: ${npcId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Être mystérieux introuvable"
      });
      return;
    }

    console.log(`💬 Interaction mystique avec: ${npc.name}`);

    // Interaction spéciale pour zone cachée
    client.send("npcInteractionResult", {
      type: "mystical_dialogue",
      npcId: npcId,
      npcName: npc.name,
      lines: npc.dialogue,
      effects: ["purple_glow", "mystical_particles"]
    });

    // Chance d'obtenir un objet rare
    if (Math.random() < 0.1) { // 10% de chance
      client.send("itemReceived", {
        type: "mystical_essence",
        name: "Essence Mystique",
        description: "Une essence rare imprégnée d'énergie mystérieuse",
        rarity: "legendary"
      });
      console.log(`🎁 Essence mystique obtenue par ${client.sessionId}`);
    }

    console.log(`✅ Dialogue mystique envoyé pour ${npc.name}`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🔮 === ROAD 1 HIDDEN QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // Quêtes spéciales pour zone cachée
    const hiddenQuests = [
      "mystical_research",
      "ancient_secrets",
      "energy_collection"
    ];

    if (hiddenQuests.includes(questId)) {
      client.send("questStartResult", {
        success: true,
        questId: questId,
        title: this.getQuestTitle(questId),
        description: this.getQuestDescription(questId),
        type: "mystical"
      });
    } else {
      client.send("questStartResult", {
        success: false,
        message: "Cette quête ne peut être commencée dans cette zone mystérieuse"
      });
    }
  }

  private getQuestTitle(questId: string): string {
    const titles: { [key: string]: string } = {
      "mystical_research": "Recherches Mystiques",
      "ancient_secrets": "Secrets Anciens", 
      "energy_collection": "Collection d'Énergie"
    };
    return titles[questId] || "Quête Inconnue";
  }

  private getQuestDescription(questId: string): string {
    const descriptions: { [key: string]: string } = {
      "mystical_research": "Aidez l'Alchimiste dans ses recherches mystérieuses",
      "ancient_secrets": "Découvrez les secrets cachés de cette zone",
      "energy_collection": "Collectez les énergies mystiques dispersées"
    };
    return descriptions[questId] || "Description manquante";
  }

  getZoneData() {
    return {
      npcs: this.npcs,
      objects: [
        { id: 1, type: "crystal", x: 100, y: 100 },
        { id: 2, type: "ancient_rune", x: 400, y: 150 },
        { id: 3, type: "energy_portal", x: 300, y: 320 }
      ] as ZoneObject[],
      spawns: [
        { name: "mystical_entrance", x: 250, y: 350 }
      ] as Spawn[],
      music: "mystical_theme",
      weather: "mystical_fog",
      ambiance: "mysterious",
      lighting: "dim_purple"
    };
  }

  // Méthode pour interactions spéciales avec objets mystiques
  onObjectInteract(client: Client, objectId: number) {
    console.log(`🔮 Interaction avec objet mystique: ${objectId}`);
    
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    switch (objectId) {
      case 1: // Crystal
        client.send("mysteriousEvent", {
          type: "crystal_resonance",
          message: "Le cristal résonne avec votre énergie...",
          effect: "crystal_glow"
        });
        break;
        
      case 2: // Ancient Rune
        client.send("mysteriousEvent", {
          type: "rune_activation",
          message: "Des symboles anciens s'illuminent...",
          effect: "rune_symbols"
        });
        break;
        
      case 3: // Energy Portal
        client.send("mysteriousEvent", {
          type: "portal_energy",
          message: "Le portail pulse d'une énergie inconnue...",
          effect: "portal_swirl"
        });
        break;
    }
  }
}
