// server/src/managers/ZoneManager.ts - VERSION MONGODB HYBRIDE (Non-bloquante)

import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { IZone } from "../rooms/zones/IZone";
import { BeachZone } from "../rooms/zones/BeachZone";
import { VillageZone } from "../rooms/zones/VillageZone";
import { VillageLabZone } from "../rooms/zones/VillageLabZone";
import { Villagehouse1 } from "../rooms/zones/Villagehouse1";

// Zones Village supplémentaires
import { VillageFloristZone } from "../rooms/zones/VillageFloristZone";
import { VillageHouse2Zone } from "../rooms/zones/VillageHouse2Zone";
import { VillageWindmillZone } from "../rooms/zones/VillageWindmillZone";

// Zones Lavandia
import { LavandiaAnalysisZone } from "../rooms/zones/LavandiaAnalysisZone";
import { LavandiaBossRoomZone } from "../rooms/zones/LavandiaBossRoomZone";
import { LavandiaCelebiTempleZone } from "../rooms/zones/LavandiaCelebiTempleZone";
import { LavandiaEquipmentZone } from "../rooms/zones/LavandiaEquipmentZone";
import { LavandiaFurnitureZone } from "../rooms/zones/LavandiaFurnitureZone";
import { LavandiaHealingCenterZone } from "../rooms/zones/LavandiaHealingCenterZone";
import { LavandiaHouse1Zone } from "../rooms/zones/LavandiaHouse1Zone";
import { LavandiaHouse2Zone } from "../rooms/zones/LavandiaHouse2Zone";
import { LavandiaHouse3Zone } from "../rooms/zones/LavandiaHouse3Zone";
import { LavandiaHouse4Zone } from "../rooms/zones/LavandiaHouse4Zone";
import { LavandiaHouse5Zone } from "../rooms/zones/LavandiaHouse5Zone";
import { LavandiaHouse6Zone } from "../rooms/zones/LavandiaHouse6Zone";
import { LavandiaHouse7Zone } from "../rooms/zones/LavandiaHouse7Zone";
import { LavandiaHouse8Zone } from "../rooms/zones/LavandiaHouse8Zone";
import { LavandiaHouse9Zone } from "../rooms/zones/LavandiaHouse9Zone";
import { LavandiaResearchLabZone } from "../rooms/zones/LavandiaResearchLabZone";

// Zones Nocther Cave
import { NoctherbCave1Zone } from "../rooms/zones/NoctherbCave1Zone";
import { NoctherbCave2Zone } from "../rooms/zones/NoctherbCave2Zone";
import { NoctherbCave2BisZone } from "../rooms/zones/NoctherbCave2BisZone";

// Zones Nocther Cave
import { WraithmoorZone } from "../rooms/zones/WraithmoorZone";
import { WraithmoorCimeteryZone } from "../rooms/zones/WraithmoorCimeteryZone";
import { WraithmoorManor1Zone } from "../rooms/zones/WraithmoorManor1Zone";

// Zones Road
import { Road1Zone } from "../rooms/zones/Road1Zone";
import { Road1HouseZone } from "../rooms/zones/Road1HouseZone";
import { Road2Zone } from "../rooms/zones/Road2Zone";
import { Road3Zone } from "../rooms/zones/Road3Zone";

import { Player } from "../schema/PokeWorldState";

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager";
import { InteractionManager } from "./InteractionManager";
import { QuestProgressEvent } from "../types/QuestTypes";
import { SpectatorManager } from "../battle/modules/broadcast/SpectatorManager";

// COLLISION MANAGER
import { CollisionManager } from "./CollisionManager";

export class ZoneManager {
  private zones = new Map<string, IZone>();
  private collisions = new Map<string, CollisionManager>();

  private room: WorldRoom;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private interactionManager: InteractionManager;
  private spectatorManager: SpectatorManager;

  // ✅ NOUVEAUX FLAGS D'ÉTAT
  private questManagerReady: boolean = false;
  private isInitializingQuests: boolean = false;
  private questInitializationPromise: Promise<void> | null = null;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);
    
    // ✅ ÉTAPE 1: Initialisation SYNCHRONE instantanée
    this.initializeManagersSync();
    this.loadAllZones();
    
    // ✅ ÉTAPE 2: Lancer l'initialisation asynchrone EN ARRIÈRE-PLAN
    console.log(`🔄 [ZoneManager] Lancement chargement quêtes en arrière-plan...`);
    this.initializeQuestManagerAsync()
      .then(() => {
        console.log(`✅ [ZoneManager] QuestManager chargé en arrière-plan !`);
        
        // ✅ NOTIFICATION AUTOMATIQUE : Mettre à jour tous les clients connectés
        console.log(`📡 [ZoneManager] Notification des ${this.room.clients.length} clients connectés...`);
        this.room.clients.forEach(client => {
          const player = this.room.state.players.get(client.sessionId);
          if (player) {
            console.log(`📤 [ZoneManager] Envoi quest statuses à ${player.name} dans ${player.currentZone}`);
            this.sendQuestStatusesForZone(client, player.currentZone);
          }
        });
        
        console.log(`🎉 [ZoneManager] Tous les clients notifiés des quêtes !`);
      })
      .catch(error => {
        console.error(`❌ [ZoneManager] Erreur chargement quêtes en arrière-plan:`, error);
        
        // ✅ MÊME EN CAS D'ERREUR : Notifier que le système est prêt (mode fallback)
        console.log(`⚠️ [ZoneManager] Notification clients : système prêt en mode fallback`);
      });
  }

  // ✅ NOUVELLE MÉTHODE : Initialisation synchrone (instantanée)
  private initializeManagersSync() {
    try {
      // ✅ MODIFICATION CRITIQUE : QuestManager sans paramètre (nouveau système)
      this.questManager = new QuestManager(); // Pas de paramètre !
      console.log(`✅ QuestManager créé (pas encore initialisé)`);
      
      // ✅ RESTE IDENTIQUE : ShopManager et autres services
      this.shopManager = new ShopManager(`../data/shops/shops.json`, `../data/items/items.json`);
      console.log(`✅ ShopManager initialisé`);
      
      this.spectatorManager = new SpectatorManager();
      console.log(`✅ SpectatorManager initialisé`);
      
      this.interactionManager = new InteractionManager(
        this.room.getNpcManager.bind(this.room),
        this.questManager,
        this.shopManager,
        this.room.starterHandlers,
        this.spectatorManager
      );
      console.log(`✅ InteractionManager initialisé avec QuestManager non-prêt`);
      
    } catch (error) {
      console.error(`❌ Erreur initializeManagersSync:`, error);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Chargement asynchrone en arrière-plan
  private async initializeQuestManagerAsync(): Promise<void> {
    // Éviter les initialisations multiples
    if (this.questManagerReady) {
      console.log(`♻️ [ZoneManager] QuestManager déjà prêt`);
      return;
    }
    
    if (this.isInitializingQuests) {
      console.log(`⏳ [ZoneManager] Initialisation quêtes en cours, attente...`);
      if (this.questInitializationPromise) {
        await this.questInitializationPromise;
      }
      return;
    }
    
    this.isInitializingQuests = true;
    console.log(`🔄 [ZoneManager] Démarrage initialisation QuestManager asynchrone...`);
    
    // Créer la promesse d'initialisation
    this.questInitializationPromise = this.performQuestInitialization();
    
    try {
      await this.questInitializationPromise;
      this.questManagerReady = true;
      console.log(`✅ [ZoneManager] QuestManager initialisé avec succès`, {
        totalQuests: this.questManager.getSystemStats().totalQuests
      });
    } catch (error) {
      console.log(`❌ [ZoneManager] Erreur lors de l'initialisation QuestManager:`, error);
      throw error;
    } finally {
      this.isInitializingQuests = false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Logique d'initialisation des quêtes
  private async performQuestInitialization(): Promise<void> {
    try {
      console.log(`🔍 [ZoneManager] Chargement quêtes depuis MongoDB...`);
      
      // ✅ ÉTAPE 1: Initialiser le QuestManager
      await this.questManager.initialize();
      
      // ✅ ÉTAPE 2: Attendre que le chargement soit complet
      console.log(`⏳ [ZoneManager] Attente chargement complet...`);
      const loaded = await this.questManager.waitForLoad(15000); // 15s timeout

      if (!loaded) {
        console.error(`❌ [ZoneManager] Timeout lors du chargement des quêtes !`);
        // Continuer quand même, mais en mode fallback
      }
      
      // ✅ ÉTAPE 3: Vérification finale et debug
      const stats = this.questManager.getSystemStats();
      console.log(`✅ [ZoneManager] QuestManager initialisé:`, {
        totalQuests: stats.totalQuests,
        initialized: stats.initialized,
        sources: stats.sources,
        hotReload: stats.hotReload
      });
      
      // Debug système pour validation
      this.questManager.debugSystem();
      
      // ✅ NOUVEAU: Connecter Hot Reload au broadcast client
      if (stats.hotReload && stats.hotReload.active) {
        console.log(`📡 [ZoneManager] Configuration broadcast Hot Reload quêtes...`);
        
        this.questManager.onQuestChange((event, questData) => {
          console.log(`🔥 [ZoneManager] Changement quête détecté: ${event}`, questData ? {
            id: questData.id,
            name: questData.name
          } : 'Pas de données');
          
          // ✅ BROADCAST à tous les clients connectés
          this.room.broadcast("questHotReload", {
            event: event,
            questData: questData ? {
              id: questData.id,
              name: questData.name,
              category: questData.category
            } : null,
            timestamp: Date.now()
          });
          
          console.log(`📡 [ZoneManager] Hot Reload quêtes broadcasté à ${this.room.clients.length} clients`);
        });
        
        console.log(`✅ [ZoneManager] Hot Reload quêtes broadcast configuré !`);
      } else {
        console.log(`⚠️ [ZoneManager] Hot Reload quêtes non actif`);
      }
      
    } catch (error) {
      console.error(`❌ [ZoneManager] Erreur performQuestInitialization:`, error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier si le QuestManager est prêt
  private async waitForQuestManager(timeoutMs: number = 10000): Promise<boolean> {
    if (this.questManagerReady) {
      return true;
    }
    
    const startTime = Date.now();
    console.log(`⏳ [ZoneManager] Attente QuestManager (timeout: ${timeoutMs}ms)...`);
    
    // ✅ ÉTAPE 1: S'assurer que l'initialisation est lancée
    if (!this.questManagerReady && !this.isInitializingQuests) {
      console.log(`🚀 [ZoneManager] Lancement initialisation QuestManager...`);
      this.initializeQuestManagerAsync().catch(error => {
        console.error(`❌ [ZoneManager] Erreur initialisation:`, error);
      });
    }
    
    // ✅ ÉTAPE 2: Attendre que l'initialisation se termine
    while (!this.questManagerReady && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loadTime = Date.now() - startTime;
    
    if (this.questManagerReady) {
      console.log(`✅ [ZoneManager] QuestManager prêt en ${loadTime}ms`);
    } else {
      console.log(`⚠️ [ZoneManager] Timeout QuestManager après ${timeoutMs}ms`);
    }
    
    return this.questManagerReady;
  }

  // ✅ TOUTES LES MÉTHODES EXISTANTES AVEC VÉRIFICATIONS AJOUTÉES
  
  private loadAllZones() {
    console.log(`🏗️ Chargement des zones...`);
    
    // Zones existantes
    this.loadZone('beach', new BeachZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour beach");
    this.collisions.set('beach', new CollisionManager("beach.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('village', new VillageZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour village");
    this.collisions.set('village', new CollisionManager("village.tmj"));
this.connectNpcCollisions('beach');

    this.loadZone('villagewindmill', new VillageZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour village");
    this.collisions.set('villagewindmill', new CollisionManager("villagewindmill.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('villagelab', new VillageLabZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villagelab");
    this.collisions.set('villagelab', new CollisionManager("villagelab.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('villagehouse1', new Villagehouse1(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villagehouse1");
    this.collisions.set('villagehouse1', new CollisionManager("villagehouse1.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('villageflorist', new VillageFloristZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villageflorist");
    this.collisions.set('villageflorist', new CollisionManager("villageflorist.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('villagehouse2', new VillageHouse2Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villagehouse2");
    this.collisions.set('villagehouse2', new CollisionManager("villagehouse2.tmj"));
    this.connectNpcCollisions('beach');

    // Zones Lavandia
    this.loadZone('lavandiaanalysis', new LavandiaAnalysisZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour analysis");
    this.collisions.set('lavandiaanalysis', new CollisionManager("lavandiaanalysis.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiabossroom', new LavandiaBossRoomZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour bossroom");
    this.collisions.set('lavandiabossroom', new CollisionManager("lavandiabossroom.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiacelebitemple', new LavandiaCelebiTempleZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour celebitemple");
    this.collisions.set('lavandiacelebitemple', new CollisionManager("lavandiacelebitemple.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiaequipment', new LavandiaEquipmentZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour equipment");
    this.collisions.set('lavandiaequipment', new CollisionManager("lavandiaequipment.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiafurniture', new LavandiaFurnitureZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour furniture");
    this.collisions.set('lavandiafurniture', new CollisionManager("lavandiafurniture.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahealingcenter', new LavandiaHealingCenterZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour healingcenter");
    this.collisions.set('lavandiahealingcenter', new CollisionManager("lavandiahealingcenter.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse1', new LavandiaHouse1Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house1");
    this.collisions.set('lavandiahouse1', new CollisionManager("lavandiahouse1.tmj"));
    
    this.loadZone('lavandiahouse2', new LavandiaHouse2Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house2");
    this.collisions.set('lavandiahouse2', new CollisionManager("lavandiahouse2.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse3', new LavandiaHouse3Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house3");
    this.collisions.set('lavandiahouse3', new CollisionManager("lavandiahouse3.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse4', new LavandiaHouse4Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house4");
    this.collisions.set('lavandiahouse4', new CollisionManager("lavandiahouse4.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse5', new LavandiaHouse5Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house5");
    this.collisions.set('lavandiahouse5', new CollisionManager("lavandiahouse5.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse6', new LavandiaHouse6Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house6");
    this.collisions.set('lavandiahouse6', new CollisionManager("lavandiahouse6.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse7', new LavandiaHouse7Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house7");
    this.collisions.set('lavandiahouse7', new CollisionManager("lavandiahouse7.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse8', new LavandiaHouse8Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house8");
    this.collisions.set('lavandiahouse8', new CollisionManager("lavandiahouse8.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiahouse9', new LavandiaHouse9Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour house9");
    this.collisions.set('lavandiahouse9', new CollisionManager("lavandiahouse9.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('lavandiaresearchlab', new LavandiaResearchLabZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour researchlab");
    this.collisions.set('lavandiaresearchlab', new CollisionManager("lavandiaresearchlab.tmj"));
    this.connectNpcCollisions('beach');

    // Zones Nocther Cave
    this.loadZone('noctherbcave1', new NoctherbCave1Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour noctherbcave1");
    this.collisions.set('noctherbcave1', new CollisionManager("noctherbcave1.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('noctherbcave2', new NoctherbCave2Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour noctherbcave2");
    this.collisions.set('noctherbcave2', new CollisionManager("noctherbcave2.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('noctherbcave2bis', new NoctherbCave2BisZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour noctherbcave2bis");
    this.collisions.set('noctherbcave2bis', new CollisionManager("noctherbcave2bis.tmj"));
this.connectNpcCollisions('beach');

    this.loadZone('wraithmoor', new WraithmoorZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour wraithmoor");
    this.collisions.set('wraithmoor', new CollisionManager("wraithmoor.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('wraithmoorcimetery', new WraithmoorCimeteryZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour wraithmoorcimetery");
    this.collisions.set('wraithmoorcimetery', new CollisionManager("wraithmoorcimetery.tmj"));
    
    this.loadZone('wraithmoormanor1', new WraithmoorManor1Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour wraithmoormanor1");
    this.collisions.set('wraithmoormanor1', new CollisionManager("wraithmoormanor1.tmj"));
    this.connectNpcCollisions('beach');

    // Zones Road
    this.loadZone('road1', new Road1Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour road1");
    this.collisions.set('road1', new CollisionManager("road1.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('road1house', new Road1HouseZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour road1house");
    this.collisions.set('road1house', new CollisionManager("road1house.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('road2', new Road2Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour road2");
    this.collisions.set('road2', new CollisionManager("road2.tmj"));
    this.connectNpcCollisions('beach');

    this.loadZone('road3', new Road3Zone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour road3");
    this.collisions.set('road3', new CollisionManager("road3.tmj"));
    this.connectNpcCollisions('beach');

    console.log(`✅ ${this.zones.size} zones chargées:`, Array.from(this.zones.keys()));
    console.log(`✅ Collisions chargées pour :`, Array.from(this.collisions.keys()));
  }

  private loadZone(zoneName: string, zone: IZone) {
    console.log(`📦 Chargement zone: ${zoneName}`);
    this.zones.set(zoneName, zone);
    console.log(`✅ Zone ${zoneName} chargée`);
  }

  // ACCESSEUR COLLISION
  getCollisionManager(zoneName: string): CollisionManager | undefined {
    return this.collisions.get(zoneName);
  }

  // ======================= MÉTHODES AVEC VÉRIFICATIONS =======================

  async handleZoneTransition(client: Client, data: any) {
    console.log(`🌀 === ZONE TRANSITION HANDLER ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📍 Data:`, data);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("transitionResult", { success: false, reason: "Player not found" });
      return;
    }

    const fromZone = player.currentZone;
    const toZone = data.targetZone;

    console.log(`🔄 Transition: ${fromZone} → ${toZone}`);

    const targetZone = this.zones.get(toZone);
    if (!targetZone) {
      console.error(`❌ Zone de destination inconnue: ${toZone}`);
      client.send("transitionResult", { success: false, reason: "Zone not found" });
      return;
    }

    try {
      if (fromZone && fromZone !== toZone) {
        console.log(`📤 Sortie de zone: ${fromZone}`);
        this.onPlayerLeaveZone(client, fromZone);
      }

      player.currentZone = toZone;
      player.map = toZone;
      if (data.spawnX !== undefined) player.x = data.spawnX;
      if (data.spawnY !== undefined) player.y = data.spawnY;

      console.log(`📍 Position mise à jour: (${player.x}, ${player.y}) dans ${toZone}`);

      console.log(`📥 Entrée dans zone: ${toZone}`);
      await this.onPlayerJoinZone(client, toZone);

      client.send("transitionResult", { 
        success: true, 
        currentZone: toZone,
        position: { x: player.x, y: player.y }
      });

      console.log(`✅ Transition réussie: ${player.name} est maintenant dans ${toZone}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la transition:`, error);
      client.send("transitionResult", { success: false, reason: "Transition failed" });
    }
  }

  async onPlayerJoinZone(client: Client, zoneName: string) {
    console.log(`📥 === PLAYER JOIN ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      await zone.onPlayerEnter(client);
      await this.room.onPlayerJoinZone(client, zoneName);
      
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        console.log(`🎯 [ZoneManager] Programmation quest statuses pour ${player.name}`);
        
        // ✅ NOUVEAU: Vérifier si QuestManager est prêt avant d'envoyer
        if (this.questManagerReady) {
          console.log(`✅ [ZoneManager] QuestManager prêt, envoi immédiat`);
          setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 1000);
          setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 3000);
          setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 5000);
        } else {
          console.log(`⏳ [ZoneManager] QuestManager pas encore prêt, programmation différée`);
          // Attendre que le QuestManager soit prêt
          this.waitForQuestManager(5000).then(ready => {
            if (ready) {
              console.log(`✅ [ZoneManager] QuestManager maintenant prêt, envoi quest statuses`);
              this.sendQuestStatusesForZone(client, zoneName);
            } else {
              console.log(`⚠️ [ZoneManager] QuestManager toujours pas prêt après timeout`);
            }
          });
        }
      }
      
      console.log(`✅ Player entered zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  onPlayerLeaveZone(client: Client, zoneName: string) {
    console.log(`📤 === PLAYER LEAVE ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      zone.onPlayerLeave(client);
      console.log(`✅ Player left zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  async handleNpcInteraction(client: Client, npcId: number) {
    console.log(`💬 === NPC INTERACTION (DÉLÉGATION AVEC SHOP) ===`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Joueur non trouvé"
      });
      return;
    }

    // ✅ NOUVEAU: Vérifier si QuestManager est prêt
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] QuestManager pas encore prêt pour interaction NPC ${npcId}`);
      client.send("npcInteractionResult", {
        type: "info",
        message: "Système de quêtes en cours d'initialisation, veuillez patienter..."
      });
      return;
    }

    try {
      const result = await this.interactionManager.handleNpcInteraction(player, npcId);
      console.log(`📤 Envoi résultat interaction:`, result.type);
      client.send("npcInteractionResult", result);
      if (result.questProgress && result.questProgress.length > 0) {
        client.send("questProgressUpdate", result.questProgress);
        await this.sendQuestStatusesForZone(client, player.currentZone);
      }
    } catch (error) {
      console.error(`❌ Erreur interaction NPC ${npcId}:`, error);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Erreur lors de l'interaction avec le NPC"
      });
    }
  }

  async handleShopTransaction(client: Client, data: {
    shopId: string;
    action: 'buy' | 'sell';
    itemId: string;
    quantity: number;
  }) {
    console.log(`🛒 === SHOP TRANSACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📦 Data:`, data);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("shopTransactionResult", {
        success: false,
        message: "Joueur non trouvé"
      });
      return;
    }

    try {
      const result = await this.interactionManager.handleShopTransaction(
        player,
        data.shopId,
        data.action,
        data.itemId,
        data.quantity
      );
      console.log(`📤 Résultat transaction shop:`, result.success ? 'SUCCESS' : 'FAILED');
      client.send("shopTransactionResult", result);
      if (result.success) {
        console.log(`💰 Transaction réussie: ${data.action} ${data.quantity}x ${data.itemId}`);
        if (result.newGold !== undefined) {
          player.gold = result.newGold;
          console.log(`💰 Nouvel or du joueur: ${player.gold}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur transaction shop:`, error);
      client.send("shopTransactionResult", {
        success: false,
        message: "Erreur lors de la transaction"
      });
    }
  }

  async handleQuestStart(client: Client, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    console.log(`🎯 === QUEST START (DÉLÉGATION) ===`);
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      return {
        success: false,
        message: "Joueur non trouvé"
      };
    }

    // ✅ NOUVEAU: Vérifier si QuestManager est prêt
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] QuestManager pas encore prêt pour démarrer quête ${questId}`);
      return {
        success: false,
        message: "Système de quêtes en cours d'initialisation, veuillez patienter..."
      };
    }

    try {
      const quest = await this.questManager.startQuest(player.name, questId);
      if (quest) {
        await this.sendQuestStatusesForZone(client, player.currentZone);
        this.broadcastToZone(player.currentZone, "questUpdate", {
          player: player.name,
          action: "started",
          questId: questId
        });
        return {
          success: true,
          quest: quest,
          message: `Quête "${quest.name}" démarrée !`
        };
      } else {
        return {
          success: false,
          message: "Impossible de démarrer cette quête"
        };
      }
    } catch (error) {
      console.error(`❌ Erreur démarrage quête ${questId}:`, error);
      return {
        success: false,
        message: "Erreur lors du démarrage de la quête"
      };
    }
  }

  // ✅ MÉTHODES AVEC FALLBACK SI QUESTMANAGER PAS PRÊT

  async getActiveQuests(username: string): Promise<any[]> {
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] getActiveQuests: QuestManager pas encore prêt`);
      return [];
    }
    
    try {
      return await this.questManager.getActiveQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getActiveQuests:`, error);
      return [];
    }
  }

  async getAvailableQuests(username: string): Promise<any[]> {
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] getAvailableQuests: QuestManager pas encore prêt`);
      return [];
    }
    
    try {
      return await this.questManager.getAvailableQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getAvailableQuests:`, error);
      return [];
    }
  }

  async updateQuestProgress(username: string, event: QuestProgressEvent): Promise<any[]> {
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] updateQuestProgress: QuestManager pas encore prêt`);
      return [];
    }
    
    try {
      return await this.questManager.updateQuestProgress(username, event);
    } catch (error) {
      console.error(`❌ Erreur updateQuestProgress:`, error);
      return [];
    }
  }

  private async sendQuestStatusesForZone(client: Client, zoneName: string) {
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) return;
    
    // ✅ NOUVEAU: Vérifier si QuestManager est prêt
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] sendQuestStatusesForZone: QuestManager pas encore prêt pour ${player.name}`);
      return;
    }
    
    try {
      const questStatuses = await this.interactionManager.getQuestStatuses(player.name);
      if (questStatuses.length > 0) {
        client.send("questStatuses", { questStatuses });
        console.log(`📊 Statuts de quête envoyés pour ${zoneName}: ${questStatuses.length}`);
      }
    } catch (error) {
      console.error(`❌ Erreur sendQuestStatusesForZone:`, error);
    }
  }

  getPlayersInZone(zoneName: string): Player[] {
    const playersInZone = Array.from(this.room.state.players.values())
      .filter((player: Player) => player.currentZone === zoneName);
    console.log(`📊 Players in zone ${zoneName}: ${playersInZone.length}`);
    return playersInZone;
  }

  broadcastToZone(zoneName: string, message: string, data: any) {
    console.log(`📡 Broadcasting to zone ${zoneName}: ${message}`);
    const clientsInZone = this.room.clients.filter(client => {
      const player = this.room.state.players.get(client.sessionId) as Player;
      return player && player.currentZone === zoneName;
    });
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    console.log(`📤 Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }

  async getQuestStatuses(username: string): Promise<any[]> {
    if (!this.questManagerReady) {
      console.log(`⏳ [ZoneManager] getQuestStatuses: QuestManager pas encore prêt`);
      return [];
    }
    
    try {
      return await this.interactionManager.getQuestStatuses(username);
    } catch (error) {
      console.error(`❌ Erreur getQuestStatuses:`, error);
      return [];
    }
  }

  // ✅ ACCESSEURS PUBLICS

  getQuestManager(): QuestManager {
    return this.questManager;
  }

  getSpectatorManager(): SpectatorManager {
    return this.spectatorManager;
  }
  
  getShopManager(): ShopManager {
    return this.shopManager;
  }
  
  getInteractionManager(): InteractionManager {
    return this.interactionManager;
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier l'état du système
  isQuestSystemReady(): boolean {
    return this.questManagerReady;
  }

  // ✅ NOUVELLE MÉTHODE : Obtenir les stats du système
  getSystemStats() {
    return {
      questManagerReady: this.questManagerReady,
      isInitializingQuests: this.isInitializingQuests,
      questStats: this.questManagerReady ? this.questManager.getSystemStats() : null,
      zonesLoaded: this.zones.size,
      collisionsLoaded: this.collisions.size
    };
  }

  // ✅ MÉTHODE DE DEBUG
  debugSystem(): void {
    console.log(`🔍 [ZoneManager] === DEBUG SYSTÈME ===`);
    const stats = this.getSystemStats();
    console.log(`📊 Stats ZoneManager:`, JSON.stringify(stats, null, 2));
    
    if (this.questManagerReady) {
      this.questManager.debugSystem();
    } else {
      console.log(`⏳ [ZoneManager] QuestManager pas encore prêt pour debug`);
    }
  }
  private connectNpcCollisions(zoneName: string): void {
  const collisionManager = this.collisions.get(zoneName);
  if (!collisionManager) {
    console.warn(`⚠️ [ZoneManager] Pas de CollisionManager pour ${zoneName}`);
    return;
  }

  const npcManager = this.room.getNpcManager(zoneName);
  if (npcManager) {
    npcManager.setCollisionManager(collisionManager);
    console.log(`🔗 [ZoneManager] CollisionManager connecté au NPCManager pour ${zoneName}`);
  } else {
    console.warn(`⚠️ [ZoneManager] NPCManager non trouvé pour ${zoneName}`);
  }
}
}
