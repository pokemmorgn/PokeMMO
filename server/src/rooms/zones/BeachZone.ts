// ===== server/src/rooms/zones/BeachZone.ts - AVEC QUÊTE D'INTRO =====
import { Client } from "@colyseus/core";
import { IZone } from "./IZone";
import { WorldRoom } from "../WorldRoom";
import { ServiceRegistry } from "../../services/ServiceRegistry";

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

export class BeachZone implements IZone {
  private room: WorldRoom;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🏖️ === BEACH ZONE INIT ===`);
    
    this.setupEvents();
    
    console.log(`✅ BeachZone initialisée`);
  }

  private setupEvents() {
    console.log(`⚡ Setup Beach events...`);
    // TODO: Events spécifiques à la plage (spawns d'objets, météo, etc.)
    console.log(`✅ Beach events configurés`);
  }

  async onPlayerEnter(client: Client) {
    console.log(`🏖️ === PLAYER ENTER BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      return;
    }

    console.log(`👤 ${player.name} entre sur la plage`);

    // ✅ NOUVEAU: Gestion de la quête d'intro automatique
    await this.handleIntroQuest(client, player.name);

    // Envoyer les données de la zone (musique, météo, spawns)
    const zoneData = this.getZoneData();
    client.send("zoneData", {
      zone: "beach",
      ...zoneData
    });

    console.log(`📤 Données Beach envoyées à ${player.name}`);
  }

  // ✅ === GESTION DE LA QUÊTE D'INTRO ===
  private async handleIntroQuest(client: Client, playerName: string) {
    try {
      console.log(`🎬 [BeachZone] Vérification quête d'intro pour ${playerName}`);
      
      // Accéder au QuestManager via ServiceRegistry
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) {
        console.warn(`⚠️ [BeachZone] QuestManager non disponible`);
        return;
      }

      // ID de ta quête d'intro (à créer dans quests.json)
      const introQuestId = "beach_intro_quest";
      
      // Vérifier le statut de la quête d'intro
      const questStatus = await questManager.checkQuestStatus(playerName, introQuestId);
      console.log(`🔍 [BeachZone] Statut quête intro pour ${playerName}: ${questStatus}`);
      
      // Cas 1: Quête disponible → La donner automatiquement
      if (questStatus === 'available') {
        console.log(`🎁 [BeachZone] Attribution quête d'intro à ${playerName}`);
        
        const result = await questManager.giveQuest(playerName, introQuestId);
        
        if (result.success) {
          // Notifier le client qu'il peut déclencher l'intro
          client.send("triggerIntroSequence", {
            questId: introQuestId,
            questName: result.quest?.name,
            message: "Bienvenue dans votre aventure !",
            shouldStartIntro: true
          });
          
          console.log(`✅ [BeachZone] Quête d'intro donnée et intro déclenchée pour ${playerName}`);
        } else {
          console.warn(`⚠️ [BeachZone] Échec attribution quête intro: ${result.message}`);
        }
      }
      
      // Cas 2: Quête active → Vérifier si intro déjà vue
      else if (questStatus === 'active') {
        console.log(`📈 [BeachZone] Quête d'intro déjà active pour ${playerName}`);
        
        // Optionnel: Vérifier si l'intro a déjà été vue
        // (tu peux ajouter une propriété dans les métadonnées de la quête)
        const activeQuests = await questManager.getPlayerActiveQuests(playerName);
        const introQuest = activeQuests.find(q => q.id === introQuestId);
        
        if (introQuest) {
          // Si premier objectif pas encore complété → Relancer l'intro
          const firstStep = introQuest.steps[0];
          const hasSeenIntro = firstStep?.objectives.some((obj: any) => obj.completed);
          
          if (!hasSeenIntro) {
            client.send("triggerIntroSequence", {
              questId: introQuestId,
              questName: introQuest.name,
              message: "Continuons votre aventure !",
              shouldStartIntro: true
            });
            console.log(`🔄 [BeachZone] Intro relancée pour ${playerName} (quête active mais intro non vue)`);
          }
        }
      }
      
      // Cas 3: Quête complétée → Ne rien faire
      else if (questStatus === 'completed') {
        console.log(`✅ [BeachZone] Quête d'intro déjà terminée pour ${playerName}, pas d'intro`);
      }
      
      // Cas 4: Non disponible → Prérequis non remplis
      else {
        console.log(`⚠️ [BeachZone] Quête d'intro non disponible pour ${playerName} (${questStatus})`);
      }
      
    } catch (error) {
      console.error(`❌ [BeachZone] Erreur handleIntroQuest:`, error);
    }
  }

  // ✅ === MÉTHODE POUR PROGRESSION DE LA QUÊTE D'INTRO ===
  async progressIntroQuest(client: Client, step: string) {
    try {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`📈 [BeachZone] Progression quête intro pour ${player.name}: ${step}`);
      
      const questManager = ServiceRegistry.getInstance().getQuestManager();
      if (!questManager) return;

      // Faire progresser selon l'étape
      let progressEvent;
      
      switch (step) {
        case 'intro_watched':
          progressEvent = {
            type: 'reach',
            targetId: 'beach_intro_watched'
          };
          break;
          
        case 'psyduck_talked':
          progressEvent = {
            type: 'talk',
            npcId: 999, // ID fictif pour le Psyduck
            targetId: '999'
          };
          break;
          
        case 'intro_completed':
          progressEvent = {
            type: 'reach',
            targetId: 'intro_sequence_finished'
          };
          break;
          
        default:
          console.warn(`⚠️ [BeachZone] Étape intro inconnue: ${step}`);
          return;
      }
      
      const result = await questManager.progressQuest(player.name, progressEvent);
      
      if (result.success && result.results.length > 0) {
        console.log(`✅ [BeachZone] Progression intro réussie pour ${player.name}`);
        
        // Vérifier si quête terminée
        for (const questResult of result.results) {
          if (questResult.questCompleted) {
            console.log(`🎉 [BeachZone] Quête d'intro terminée pour ${player.name}!`);
            
            // Optionnel: Donner une récompense spéciale
            client.send("introQuestCompleted", {
              message: "Félicitations ! Votre aventure commence vraiment maintenant !",
              reward: "Vous avez débloqué de nouvelles fonctionnalités !"
            });
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ [BeachZone] Erreur progressIntroQuest:`, error);
    }
  }

  onPlayerLeave(client: Client) {
    console.log(`🏖️ === PLAYER LEAVE BEACH ===`);
    console.log(`👤 Client: ${client.sessionId}`);

    const player = this.room.state.players.get(client.sessionId);
    if (player) {
      console.log(`👤 ${player.name} quitte la plage`);
    }

    // Cleanup si nécessaire (effets spéciaux, timers, etc.)
  }

  onNpcInteract(client: Client, npcId: number) {
    console.log(`🏖️ === BEACH NPC INTERACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🤖 NPC ID: ${npcId}`);

    // ✅ LES INTERACTIONS SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    // Cette méthode existe pour l'interface IZone mais délègue au système global
    console.log(`➡️ Délégation de l'interaction NPC ${npcId} au système global`);
  }

  onQuestStart(client: Client, questId: string) {
    console.log(`🏖️ === BEACH QUEST START ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📜 Quest: ${questId}`);

    // ✅ LES QUÊTES SONT GÉRÉES PAR LE SYSTÈME EXISTANT
    console.log(`➡️ Délégation de la quête ${questId} au système global`);
  }

  getZoneData() {
    return {
      // ✅ PLUS BESOIN DE npcs ICI, GÉRÉ PAR WORLDROOM
      objects: [
        { id: 1, type: "seashell", x: 150, y: 250 },
        { id: 2, type: "driftwood", x: 400, y: 180 },
        { id: 3, type: "beach_ball", x: 320, y: 200 }
      ] as ZoneObject[],
      spawns: [
        { name: "fromVillage", x: 52, y: 48 },
        { name: "beachCenter", x: 200, y: 200 },
        { name: "pier", x: 100, y: 150 }
      ] as Spawn[],
      music: "beach_theme",
      weather: "sunny",
      ambientSounds: ["waves", "seagulls"],
      timeOfDay: "day"
    };
  }
}
