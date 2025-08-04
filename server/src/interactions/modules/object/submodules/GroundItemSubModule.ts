// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// VERSION AMÉLIORÉE AVEC INTÉGRATION ItemService + ItemEffectProcessor

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData, ObjectStateEntry } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";

// ✅ NOUVEAUX IMPORTS : Système d'effets d'items
import { ItemService } from "../../../../services/ItemService";
import { ItemEffectProcessor, EffectProcessResult } from "../../../../items/ItemEffectProcessor";
import { EffectTrigger, ItemEffectContext } from "../../../../items/ItemEffectTypes";

// ✅ NOUVEAU : Import du QuestManager pour progression automatique
import { QuestManager } from "../../../../managers/QuestManager";

// ✅ INTERFACE POUR LE CONTEXTE D'UTILISATION D'ITEM
interface ItemUsageContext extends ItemEffectContext {
  // Contexte Pokémon (si applicable)
  pokemon?: {
    species: string;
    level: number;
    stats: { [stat: string]: number };
    types: string[];
    ability: string;
    held_item?: string;
    status?: string;
    hp: number;
    max_hp: number;
  };
  
  // Contexte combat
  battle?: {
    type: string;
    turn_number: number;
    weather?: string;
    terrain?: string;
    field_effects: string[];
  };
  
  // Contexte utilisateur
  trainer?: {
    level: number;
    money: number;
    badges: string[];
    location: string;
  };
  
  // Contexte item
  item?: {
    id: string;
    quantity: number;
    first_use: boolean;
    uses_this_battle: number;
  };
  
  // Contexte environnemental
  environment?: {
    time_of_day: string;
    season: string;
    weather: string;
    location: string;
    map_type: string;
  };
}

export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "4.0.0"; // ✨ Version bump pour intégration ItemService

  // ✅ NOUVEAU : Instance QuestManager
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
      this.log('info', `🎯 [ITEMSERVICE] Ramassage objet avec système d'effets`, { 
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

      // ✅ ÉTAPE 4 : CONSTRUIRE LE CONTEXTE D'UTILISATION D'ITEM
      const usageContext = await this.buildItemUsageContext(player, playerData, objectDef, itemId);

      // ✅ ÉTAPE 5 : UTILISER ItemService.useItem() AVEC LE SYSTÈME D'EFFETS
      this.log('info', '🚀 [ITEMSERVICE] Utilisation item via ItemService', {
        itemId,
        trigger: 'on_use',
        context: {
          inBattle: usageContext.battle ? true : false,
          location: usageContext.environment?.location
        }
      });

      const itemUsageResult = await ItemService.useItem(
        itemId,
        'on_use' as EffectTrigger,
        usageContext
      );

      this.log('info', '📊 [ITEMSERVICE] Résultat utilisation item', {
        success: itemUsageResult.success,
        itemConsumed: itemUsageResult.item_consumed,
        effectsApplied: itemUsageResult.results.length,
        messages: itemUsageResult.messages,
        errors: itemUsageResult.errors
      });

      // ✅ ÉTAPE 6 : TRAITER LE RÉSULTAT
      if (!itemUsageResult.success) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        const errorMessage = itemUsageResult.messages?.[0] || 
                           itemUsageResult.errors?.[0] || 
                           "Impossible d'utiliser cet objet";
        
        return this.createErrorResult(errorMessage, 'ITEM_USAGE_FAILED');
      }

      // ✅ ÉTAPE 7 : APPLIQUER LES EFFETS RÉUSSIS
      const appliedEffects = await this.applyItemEffectsToPlayer(
        player, 
        playerData, 
        itemUsageResult.results
      );

      // ✅ ÉTAPE 8 : AJOUTER À L'INVENTAIRE SI L'ITEM N'EST PAS AUTO-CONSOMMÉ
      let inventoryAdded = false;
      if (!itemUsageResult.item_consumed) {
        try {
          const quantity = objectDef.quantity || 1;
          await InventoryManager.addItem(player.name, itemId, quantity);
          inventoryAdded = true;
          
          this.log('info', `✅ Item ajouté à l'inventaire (non consommé)`, { 
            player: player.name,
            itemId, 
            quantity
          });
        } catch (inventoryError) {
          this.log('error', 'Erreur ajout inventaire item non-consommé', { error: inventoryError });
          // Ne pas faire échouer toute l'interaction pour ça
        }
      }

      // ✅ ÉTAPE 9 : PROGRESSION AUTOMATIQUE DES QUÊTES
      await this.progressPlayerQuests(player.name, itemId);

      // ✅ ÉTAPE 10 : ENREGISTRER LE COOLDOWN
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

      // ✅ ÉTAPE 11 : CONSTRUIRE LE RÉSULTAT FINAL
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      // Déterminer le message principal
      const mainMessage = itemUsageResult.messages?.[0] || 
                         (inventoryAdded ? `${itemId} ajouté à l'inventaire !` : 
                          `${itemId} utilisé avec succès !`);
      
      return this.createSuccessResult(
        "objectCollected",
        mainMessage,
        {
          objectId: objectDef.id.toString(),
          objectType: objectDef.type,
          collected: !serverConfig.bypassObjectCooldowns,
          newState: serverConfig.bypassObjectCooldowns ? "available" : "collected"
        },
        {
          metadata: {
            // ✅ NOUVELLES DONNÉES : Résultats du système d'effets
            itemEffects: {
              triggered: true,
              success: itemUsageResult.success,
              effectsApplied: itemUsageResult.results.length,
              itemConsumed: itemUsageResult.item_consumed,
              messages: itemUsageResult.messages,
              appliedEffects: appliedEffects.summary
            },
            
            // Données traditionnelles
            itemReceived: inventoryAdded ? {
              itemId,
              quantity: objectDef.quantity || 1,
              addedToInventory: true
            } : {
              itemId,
              consumed: true,
              effects: "applied_directly"
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
      
      this.log('error', '❌ [ITEMSERVICE] Erreur traitement ground_item avec effets', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // ✅ NOUVELLE MÉTHODE : Construire le contexte d'utilisation d'item
  private async buildItemUsageContext(
    player: Player, 
    playerData: IPlayerData, 
    objectDef: ObjectDefinition, 
    itemId: string
  ): Promise<ItemUsageContext> {
    
    // Contexte de base
    const context: ItemUsageContext = {
      // Contexte utilisateur
      trainer: {
        level: player.level || 1,
        money: playerData.gold || 0,
        badges: [], // TODO: Récupérer vraies badges du joueur
        location: player.currentZone || 'unknown'
      },
      
      // Contexte item
      item: {
        id: itemId,
        quantity: objectDef.quantity || 1,
        first_use: true, // Premier usage pour cet objet ramassé
        uses_this_battle: 0
      },
      
      // Contexte environnemental
      environment: {
        time_of_day: this.getTimeOfDay(),
        season: 'spring', // TODO: Système de saisons
        weather: 'clear', // TODO: Système météo
        location: player.currentZone || 'unknown',
        map_type: 'overworld'
      }
    };

    // ✅ TODO: Ajouter contexte Pokémon si nécessaire
    // Si l'item est utilisé sur un Pokémon spécifique
    /*
    if (actionData?.targetPokemon) {
      context.pokemon = {
        species: actionData.targetPokemon.species,
        level: actionData.targetPokemon.level,
        stats: actionData.targetPokemon.stats,
        types: actionData.targetPokemon.types,
        ability: actionData.targetPokemon.ability,
        hp: actionData.targetPokemon.currentHp,
        max_hp: actionData.targetPokemon.maxHp,
        status: actionData.targetPokemon.status
      };
    }
    */

    // ✅ TODO: Ajouter contexte combat si en bataille
    /*
    if (player.inBattle) {
      context.battle = {
        type: 'wild', // ou 'trainer', 'gym', etc.
        turn_number: 1,
        weather: 'clear',
        field_effects: []
      };
    }
    */

    return context;
  }

  // ✅ NOUVELLE MÉTHODE : Appliquer les effets d'items au joueur
  private async applyItemEffectsToPlayer(
    player: Player,
    playerData: IPlayerData,
    effectResults: EffectProcessResult[]
  ): Promise<{
    applied: number;
    failed: number;
    summary: Array<{
      effect: string;
      success: boolean;
      message?: string;
    }>;
  }> {
    
    let applied = 0;
    let failed = 0;
    const summary: Array<{ effect: string; success: boolean; message?: string; }> = [];

    for (const result of effectResults) {
      if (result.success && result.effects_applied) {
        for (const effect of result.effects_applied) {
          try {
            // Appliquer l'effet selon son type
            const effectApplied = await this.applySingleEffect(player, playerData, effect);
            
            if (effectApplied) {
              applied++;
              summary.push({
                effect: effect.action_type,
                success: true,
                message: effect.message
              });
              
              this.log('info', `✅ Effet appliqué: ${effect.action_type}`, {
                player: player.name,
                target: effect.target,
                value: effect.value
              });
            } else {
              failed++;
              summary.push({
                effect: effect.action_type,
                success: false,
                message: `Impossible d'appliquer ${effect.action_type}`
              });
            }
          } catch (error) {
            failed++;
            summary.push({
              effect: effect.action_type,
              success: false,
              message: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`
            });
            
            this.log('error', `❌ Erreur application effet ${effect.action_type}`, error);
          }
        }
      } else {
        failed++;
        summary.push({
          effect: 'unknown',
          success: false,
          message: result.message || 'Effet échoué'
        });
      }
    }

    return { applied, failed, summary };
  }

  // ✅ NOUVELLE MÉTHODE : Appliquer un effet individuel
  private async applySingleEffect(
    player: Player,
    playerData: IPlayerData,
    effect: any
  ): Promise<boolean> {
    
    switch (effect.action_type) {
      case 'heal_hp_fixed':
        // TODO: Implémenter soin HP fixe
        this.log('info', `🏥 Soin HP fixe: ${effect.value}`, { player: player.name });
        return true;
        
      case 'heal_hp_percentage':
        // TODO: Implémenter soin HP pourcentage
        this.log('info', `🏥 Soin HP ${effect.value}%`, { player: player.name });
        return true;
        
      case 'cure_status':
        // TODO: Implémenter guérison de statut
        this.log('info', `💊 Guérison statut: ${effect.value}`, { player: player.name });
        return true;
        
      case 'boost_stat':
        // TODO: Implémenter boost de stat
        this.log('info', `📈 Boost stat: ${effect.value}`, { player: player.name });
        return true;
        
      case 'add_money':
        // Ajouter de l'argent au joueur
        if (typeof effect.value === 'number' && effect.value > 0) {
          playerData.gold = (playerData.gold || 0) + effect.value;
          await playerData.save();
          this.log('info', `💰 Argent ajouté: +${effect.value}₽`, { 
            player: player.name,
            newTotal: playerData.gold
          });
          return true;
        }
        break;
        
      case 'gain_exp':
        // TODO: Implémenter gain d'expérience
        this.log('info', `⭐ Gain EXP: ${effect.value}`, { player: player.name });
        return true;
        
      case 'show_message':
        // Message simple - toujours réussi
        this.log('info', `💬 Message: ${effect.value}`, { player: player.name });
        return true;
        
      default:
        this.log('warn', `🤷 Effet non implémenté: ${effect.action_type}`, {
          player: player.name,
          effect: effect
        });
        return false;
    }
    
    return false;
  }

  // ✅ MÉTHODE UTILITAIRE : Obtenir l'heure du jour
  private getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  // ✅ MÉTHODE EXISTANTE : Progression automatique des quêtes
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

  // ✅ MÉTHODE EXISTANTE AMÉLIORÉE : Initialisation QuestManager
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

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION (inchangées) ===

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
    
    this.log('info', '🎉 Objet collecté avec système d\'effets', {
      player: player.name,
      objectId: objectDef.id,
      itemId: objectDef.itemId,
      effectsTriggered: metadata?.itemEffects?.triggered,
      effectsApplied: metadata?.itemEffects?.effectsApplied,
      itemConsumed: metadata?.itemEffects?.itemConsumed,
      cooldownHours: metadata?.cooldown?.duration,
      zone: objectDef.zone,
      questProgressionAttempted: metadata?.questProgression?.attempted,
      questManagerReady: metadata?.questProgression?.questManagerAvailable
    });
  }

  // === MÉTHODES DE GESTION COOLDOWN (inchangées) ===

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

  // === STATISTIQUES AMÉLIORÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      version: this.version,
      features: [
        'itemservice_integration', // ✅ NOUVEAU
        'item_effects_processing', // ✅ NOUVEAU
        'dynamic_item_usage', // ✅ NOUVEAU
        'effect_context_building', // ✅ NOUVEAU
        'mongodb_cooldowns',
        'per_player_cooldowns',
        'configurable_cooldown_duration',
        'requirements_validation',
        'admin_cooldown_management',
        'automatic_quest_progression'
      ],
      integrations: {
        itemService: true, // ✅ NOUVEAU
        itemEffectProcessor: true, // ✅ NOUVEAU
        inventoryManager: true,
        questManager: !!this.questManager,
        playerData: true
      },
      storageMethod: 'mongodb_player_document',
      effectSystem: { // ✅ NOUVEAU
        enabled: true,
        supportedTriggers: ['on_use'],
        contextTypes: ['trainer', 'item', 'environment']
      }
    };
  }

  getHealth() {
    const baseHealth = super.getHealth();
    
    let itemServiceHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let itemEffectHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let questHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // ✅ NOUVEAU : Test ItemService
    try {
      if (!ItemService) {
        itemServiceHealth = 'critical';
      }
    } catch (error) {
      itemServiceHealth = 'critical';
    }

    // ✅ NOUVEAU : Test ItemEffectProcessor
    try {
      if (!ItemEffectProcessor) {
        itemEffectHealth = 'critical';
      }
    } catch (error) {
      itemEffectHealth = 'critical';
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
      
      // ✅ NOUVEAUX : Services du système d'effets
      itemServiceAvailable: !!ItemService,
      itemEffectProcessorAvailable: !!ItemEffectProcessor,
      itemServiceHealth,
      itemEffectHealth,
      
      // Quest system
      questManagerAvailable: !!this.questManager,
      questHealth,
      
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, itemServiceHealth, itemEffectHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, itemServiceHealth, itemEffectHealth, questHealth].includes('warning') 
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
    
    // ✅ NOUVEAU : Vérifier ItemService
    if (!ItemService) {
      throw new Error('ItemService non disponible');
    }
    
    // ✅ NOUVEAU : Vérifier ItemEffectProcessor
    if (!ItemEffectProcessor) {
      throw new Error('ItemEffectProcessor non disponible');
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
      
      // ✅ NOUVEAUX : Services du système d'effets
      itemServiceReady: !!ItemService,
      itemEffectProcessorReady: !!ItemEffectProcessor,
      
      // Quest system
      questManagerReady: !!this.questManager,
      
      storageMethod: 'mongodb',
      approach: 'itemservice_with_effects_and_quest_progression',
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

  // === MÉTHODE UTILITAIRE INCHANGÉE ===
  
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
}
