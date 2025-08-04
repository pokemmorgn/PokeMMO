// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// VERSION SIMPLIFIÉE : RAMASSAGE SIMPLE AVEC VALIDATION ItemService

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData, ObjectStateEntry } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";

// ✅ IMPORT SIMPLIFIÉ : Juste pour validation
import { ItemService } from "../../../../services/ItemService";

// ✅ IMPORT QuestManager pour progression automatique
import { QuestManager } from "../../../../managers/QuestManager";

export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "4.0.0"; // ✨ Version avec validation ItemService

  // ✅ Instance QuestManager
  private questManager: QuestManager | null = null;

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'ground_item';
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `🎯 Ramassage objet avec validation ItemService`, { 
        objectId: objectDef.id, 
        player: player.name,
        itemId: objectDef.itemId,
        zone: objectDef.zone
      });

      const itemId = objectDef.itemId;
      
      if (!itemId) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Objet sans itemId', { objectId: objectDef.id });
        return this.createErrorResult("Objet mal configuré.", 'INVALID_OBJECT');
      }

      // ✅ ÉTAPE 1 : VÉRIFIER QUE L'ITEM EXISTE DANS ItemService
      const itemExists = await ItemService.itemExists(itemId);
      if (!itemExists) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Item non trouvé dans ItemService', { itemId, objectId: objectDef.id });
        return this.createErrorResult("Cet objet n'existe pas.", 'INVALID_ITEM');
      }

      // ✅ ÉTAPE 2 : RÉCUPÉRER LES DONNÉES JOUEUR
      const playerDataDoc = await PlayerData.findOne({ username: player.name });
      if (!playerDataDoc) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Joueur non trouvé en base', { player: player.name });
        return this.createErrorResult("Données joueur non trouvées.", 'PLAYER_NOT_FOUND');
      }

      const playerData = playerDataDoc as IPlayerData;

      // ✅ ÉTAPE 3 : VÉRIFIER COOLDOWN (bypass en mode dev)
      const { getServerConfig } = require('../../../../config/serverConfig');
      const serverConfig = getServerConfig();

      if (serverConfig.bypassObjectCooldowns) {
        this.log('info', '🛠️ Mode dev: Bypass cooldown objet', {
          objectId: objectDef.id,
          player: player.name,
          zone: objectDef.zone
        });
      } else {
        const canCollect = playerData.canCollectObject(objectDef.id, objectDef.zone);
        
        if (!canCollect) {
          const cooldownInfo = playerData.getObjectCooldownInfo(objectDef.id, objectDef.zone);
          const hoursRemaining = Math.ceil(cooldownInfo.cooldownRemaining / (1000 * 60 * 60));
          const minutesRemaining = Math.ceil((cooldownInfo.cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60));
          
          const processingTime = Date.now() - startTime;
          this.updateStats(false, processingTime);
          
          const timeText = hoursRemaining > 0 
            ? `${hoursRemaining}h ${minutesRemaining}min`
            : `${minutesRemaining}min`;
          
          return this.createErrorResult(
            `Cooldown actif. Disponible dans ${timeText}.`,
            'COOLDOWN_ACTIVE'
          );
        }
      }

      // ✅ ÉTAPE 4 : AJOUTER L'ITEM À L'INVENTAIRE (PAS D'UTILISATION AUTO)
      try {
        const quantity = objectDef.quantity || 1;
        await InventoryManager.addItem(player.name, itemId, quantity);
        
        this.log('info', `✅ Item ajouté à l'inventaire`, { 
          player: player.name,
          itemId, 
          quantity
        });

      } catch (inventoryError) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Erreur ajout inventaire', {
          error: inventoryError,
          itemId,
          player: player.name
        });
        
        return this.createErrorResult(
          inventoryError instanceof Error 
            ? inventoryError.message 
            : "Impossible d'ajouter l'objet à l'inventaire",
          'INVENTORY_ERROR'
        );
      }

      // ✅ ÉTAPE 5 : PROGRESSION AUTOMATIQUE DES QUÊTES
      await this.progressPlayerQuests(player.name, itemId);

      // ✅ ÉTAPE 6 : ENREGISTRER LE COOLDOWN
      const cooldownHours = this.getProperty(objectDef, 'cooldownHours', 24);

      if (!serverConfig.bypassObjectCooldowns) {
        await playerData.recordObjectCollection(objectDef.id, objectDef.zone, cooldownHours);
        
        this.log('info', `🕒 Cooldown enregistré`, {
          objectId: objectDef.id,
          zone: objectDef.zone,
          player: player.name,
          cooldownHours
        });
      }

      // ✅ ÉTAPE 7 : CONSTRUIRE LE RÉSULTAT FINAL
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      // Récupérer les données de l'item pour affichage
      let itemData: any = null;
      try {
        itemData = await ItemService.getItemById(itemId);
      } catch (error) {
        this.log('warn', 'Erreur récupération données item', { itemId, error });
      }
      
      return this.createSuccessResult(
        "objectCollected",
        `${itemData?.name || itemId} ajouté à l'inventaire !`,
        {
          objectId: objectDef.id.toString(),
          objectType: objectDef.type,
          collected: !serverConfig.bypassObjectCooldowns,
          newState: serverConfig.bypassObjectCooldowns ? "available" : "collected"
        },
        {
          metadata: {
            itemReceived: {
              itemId,
              quantity: objectDef.quantity || 1,
              name: itemData?.name || itemId,
              category: itemData?.category || 'unknown',
              addedToInventory: true
            },
            
            cooldown: {
              duration: cooldownHours,
              nextAvailable: Date.now() + cooldownHours * 60 * 60 * 1000,
              storedInMongoDB: !serverConfig.bypassObjectCooldowns
            },
            
            processingTime,
            timestamp: Date.now(),
            
            // Indicateur progression quest
            questProgression: {
              attempted: true,
              questManagerAvailable: !!this.questManager
            }
          }
        }
      );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', '❌ Erreur traitement ground_item', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // ✅ MÉTHODE : Progression automatique des quêtes
  private async progressPlayerQuests(playerName: string, itemId: string): Promise<void> {
    try {
      if (!this.questManager) {
        this.log('info', 'QuestManager non disponible pour progression automatique', {
          player: playerName,
          itemId
        });
        return;
      }

      // 🚀 Progression automatique : 'collect' + itemId
      await this.questManager.asPlayerQuestWith(playerName, 'collect', itemId);
      
      this.log('info', '🎯 Progression quest tentée', {
        player: playerName,
        action: 'collect',
        targetId: itemId
      });

    } catch (questError) {
      // 🔇 Erreur silencieuse - ne pas interrompre la collecte d'objet
      this.log('warn', 'Erreur progression quest (non bloquante)', {
        error: questError,
        player: playerName,
        itemId
      });
    }
  }

  // ✅ MÉTHODE : Initialisation QuestManager
  private async initializeQuestManager(): Promise<void> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { QuestManager } = await import('../../../../managers/QuestManager');
      
      // Utiliser l'instance singleton ou créer une nouvelle instance
      this.questManager = new QuestManager();
      
      // Attendre que le QuestManager soit initialisé
      await this.questManager.initialize();
      
      // Vérifier que les quêtes sont chargées
      const loaded = await this.questManager.waitForLoad(5000); // 5s timeout
      
      if (loaded) {
        this.log('info', '🎯 QuestManager initialisé avec succès pour GroundItem', {
          questsLoaded: true
        });
      } else {
        this.log('warn', '⚠️ QuestManager chargement incomplet', {
          questsLoaded: false
        });
        this.questManager = null; // Désactiver si pas prêt
      }

    } catch (error) {
      this.log('warn', 'Impossible d\'initialiser QuestManager (non bloquant)', {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      this.questManager = null;
    }
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  async validateAccess(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }> {
    
    if (objectDef.requirements) {
      const req = objectDef.requirements;
      
      if (req.level && player.level < req.level) {
        return {
          valid: false,
          reason: `Niveau ${req.level} requis (vous êtes niveau ${player.level})`
        };
      }
      
      if (req.item) {
        try {
          const hasItem = await InventoryManager.getItemCount(player.name, req.item);
          if (hasItem <= 0) {
            return {
              valid: false,
              reason: `Objet requis: ${req.item}`
            };
          }
        } catch (error) {
          this.log('error', 'Erreur vérification item requis', error);
          return {
            valid: false,
            reason: `Impossible de vérifier les prérequis`
          };
        }
      }
    }
    
    return { valid: true };
  }

  async onInteractionSuccess(
    player: Player, 
    objectDef: ObjectDefinition, 
    result: ObjectInteractionResult
  ): Promise<void> {
    
    const metadata = result.data?.metadata;
    
    this.log('info', '🎉 Objet collecté avec succès', {
      player: player.name,
      objectId: objectDef.id,
      itemId: objectDef.itemId,
      cooldownHours: metadata?.cooldown?.duration,
      zone: objectDef.zone,
      questProgressionAttempted: metadata?.questProgression?.attempted,
      questManagerReady: metadata?.questProgression?.questManagerAvailable
    });
  }

  // === MÉTHODES DE GESTION COOLDOWN ===

  async checkPlayerCooldown(
    playerName: string, 
    objectId: number, 
    zone: string
  ): Promise<{
    canCollect: boolean;
    cooldownRemaining: number;
    nextAvailableTime?: number;
    lastCollectedTime?: number;
  }> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc) {
        return { canCollect: true, cooldownRemaining: 0 };
      }
      
      const playerData = playerDataDoc as IPlayerData;
      return playerData.getObjectCooldownInfo(objectId, zone);
    } catch (error) {
      this.log('error', 'Erreur vérification cooldown', { error, playerName, objectId, zone });
      return { canCollect: true, cooldownRemaining: 0 };
    }
  }

  async resetPlayerCooldown(
    playerName: string, 
    objectId: number, 
    zone: string
  ): Promise<boolean> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc) {
        this.log('warn', 'Joueur non trouvé pour reset cooldown', { playerName });
        return false;
      }
      
      const playerData = playerDataDoc as IPlayerData;
      
      const initialLength = playerData.objectStates.length;
      
      const indicesToRemove: number[] = [];
      playerData.objectStates.forEach((state: ObjectStateEntry, index: number) => {
        if (state.objectId === objectId && state.zone === zone) {
          indicesToRemove.push(index);
        }
      });
      
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        playerData.objectStates.splice(indicesToRemove[i], 1);
      }
      
      if (playerData.objectStates.length !== initialLength) {
        await playerData.save();
        this.log('info', 'Cooldown réinitialisé', { playerName, objectId, zone });
        return true;
      }
      
      this.log('info', 'Aucun cooldown à réinitialiser', { playerName, objectId, zone });
      return false;
      
    } catch (error) {
      this.log('error', 'Erreur reset cooldown', { error, playerName, objectId, zone });
      return false;
    }
  }

  async getPlayerCooldowns(playerName: string): Promise<Array<{
    objectId: number;
    zone: string;
    hoursRemaining: number;
    nextAvailable: Date;
  }>> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc || !playerDataDoc.objectStates.length) {
        return [];
      }
      
      const playerData = playerDataDoc as IPlayerData;
      const now = Date.now();
      
      return playerData.objectStates
        .filter((state: ObjectStateEntry) => state.nextAvailableTime > now)
        .map((state: ObjectStateEntry) => ({
          objectId: state.objectId,
          zone: state.zone,
          hoursRemaining: Math.ceil((state.nextAvailableTime - now) / (1000 * 60 * 60)),
          nextAvailable: new Date(state.nextAvailableTime)
        }));
        
    } catch (error) {
      this.log('error', 'Erreur récupération cooldowns', { error, playerName });
      return [];
    }
  }

  async cleanupAllExpiredCooldowns(): Promise<{
    playersProcessed: number;
    cooldownsRemoved: number;
    errors: number;
  }> {
    let playersProcessed = 0;
    let cooldownsRemoved = 0;
    let errors = 0;
    
    try {
      const batchSize = 100;
      let skip = 0;
      
      while (true) {
        const players = await PlayerData.find({
          'objectStates.0': { $exists: true }
        })
        .skip(skip)
        .limit(batchSize)
        .exec();
        
        if (players.length === 0) break;
        
        for (const playerDoc of players) {
          try {
            const player = playerDoc as IPlayerData;
            const initialCount = player.objectStates.length;
            await player.cleanupExpiredCooldowns();
            const finalCount = player.objectStates.length;
            
            cooldownsRemoved += initialCount - finalCount;
            playersProcessed++;
            
          } catch (playerError) {
            this.log('error', 'Erreur nettoyage joueur', { 
              error: playerError, 
              player: playerDoc.username 
            });
            errors++;
          }
        }
        
        skip += batchSize;
      }
      
      this.log('info', 'Nettoyage cooldowns terminé', {
        playersProcessed,
        cooldownsRemoved,
        errors
      });
      
    } catch (error) {
      this.log('error', 'Erreur nettoyage global cooldowns', error);
      errors++;
    }
    
    return { playersProcessed, cooldownsRemoved, errors };
  }

  // === STATISTIQUES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      version: this.version,
      features: [
        'itemservice_validation', // ✅ Validation via ItemService
        'inventory_integration',
        'mongodb_cooldowns',
        'per_player_cooldowns',
        'configurable_cooldown_duration',
        'requirements_validation',
        'admin_cooldown_management',
        'automatic_quest_progression'
      ],
      integrations: {
        itemService: true, // ✅ Pour validation
        inventoryManager: true,
        questManager: !!this.questManager,
        playerData: true
      },
      storageMethod: 'mongodb_player_document',
      approach: 'simple_pickup_with_itemservice_validation' // ✅ Approche simplifiée
    };
  }

  getHealth() {
    const baseHealth = super.getHealth();
    
    let itemServiceHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let questHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // ✅ Test ItemService
    try {
      if (!ItemService) {
        itemServiceHealth = 'critical';
      }
    } catch (error) {
      itemServiceHealth = 'critical';
    }

    // Health check QuestManager
    if (!this.questManager) {
      questHealth = 'warning'; // Non critique car non bloquant
    }
    
    const details = {
      ...baseHealth.details,
      // Services existants
      inventoryManagerAvailable: !!InventoryManager,
      playerDataModelAvailable: !!PlayerData,
      
      // ✅ Service ItemService
      itemServiceAvailable: !!ItemService,
      itemServiceHealth,
      
      // Quest system
      questManagerAvailable: !!this.questManager,
      questHealth,
      
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, itemServiceHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, itemServiceHealth, questHealth].includes('warning') 
          ? 'warning' 
          : 'healthy';
    
    return {
      ...baseHealth,
      status: globalHealth,
      details
    };
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // ✅ Vérifier ItemService
    if (!ItemService) {
      throw new Error('ItemService non disponible');
    }
    
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }

    // Initialisation QuestManager (non bloquante)
    await this.initializeQuestManager();
    
    this.log('info', 'GroundItemSubModule avec ItemService initialisé', {
      // Services existants
      inventoryManagerReady: !!InventoryManager,
      playerDataModelReady: !!PlayerData,
      
      // ✅ Service ItemService
      itemServiceReady: !!ItemService,
      
      // Quest system
      questManagerReady: !!this.questManager,
      
      storageMethod: 'mongodb',
      approach: 'simple_pickup_with_itemservice_validation',
      version: this.version
    });
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage GroundItemSubModule avec ItemService');
    
    try {
      const cleanupResult = await this.cleanupAllExpiredCooldowns();
      this.log('info', 'Nettoyage final cooldowns', cleanupResult);
    } catch (error) {
      this.log('warn', 'Erreur nettoyage final cooldowns', error);
    }

    // Cleanup QuestManager
    if (this.questManager) {
      try {
        this.questManager.cleanup();
        this.questManager = null;
        this.log('info', 'QuestManager nettoyé');
      } catch (error) {
        this.log('warn', 'Erreur nettoyage QuestManager', error);
      }
    }
    
    await super.cleanup();
  }
}
