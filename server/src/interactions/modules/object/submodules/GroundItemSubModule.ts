// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// Sous-module pour gérer les objets au sol (Pokéballs, potions, etc.)

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";

/**
 * Sous-module pour les objets ramassables au sol
 * Type: "ground_item"
 * 
 * Gère :
 * - Objets brillants visibles (Pokéballs, potions, etc.)
 * - Vérification si déjà collecté
 * - Ajout automatique à l'inventaire
 * - Gestion du respawn (optionnel)
 */
export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "1.0.0";

  // === MÉTHODES PRINCIPALES ===

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
      this.log('info', `Ramassage objet au sol`, { 
        objectId: objectDef.id, 
        player: player.name,
        itemId: objectDef.itemId 
      });

      // === VALIDATION SPÉCIFIQUE ===
      
      // 1. Vérifier propriétés requises
      const validation = this.validateRequiredProperties(objectDef, ['itemId']);
      if (!validation.valid) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          `Propriétés manquantes: ${validation.missing?.join(', ')}`,
          'MISSING_PROPERTIES'
        );
      }

      // 2. Vérifier si déjà collecté
      if (objectDef.state.collected) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Cet objet a déjà été ramassé.",
          'ALREADY_COLLECTED'
        );
      }

      // 3. Vérifier que l'item existe
      const itemId = objectDef.itemId!;
      if (!itemId) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Objet sans contenu.",
          'NO_ITEM_CONTENT'
        );
      }

      // === TRAITEMENT PRINCIPAL ===

      try {
        // Ajouter à l'inventaire du joueur
        const quantity = this.getProperty(objectDef, 'quantity', 1);
        await InventoryManager.addItem(player.name, itemId, quantity);
        
        this.log('info', `Item ajouté à l'inventaire`, { 
          player: player.name,
          itemId, 
          quantity 
        });

        // === PROGRAMMATION DU RESPAWN (si configuré) ===
        
        const respawnTime = this.getProperty(objectDef, 'respawnTime', 0);
        if (respawnTime > 0) {
          this.scheduleRespawn(objectDef, respawnTime);
          this.log('info', `Respawn programmé`, { 
            objectId: objectDef.id, 
            respawnTime 
          });
        }

        // === SUCCÈS ===
        
        const processingTime = Date.now() - startTime;
        this.updateStats(true, processingTime);

        const rarity = this.getProperty(objectDef, 'rarity', 'common');
        
        return this.createSuccessResult(
          "objectCollected",
          `Vous avez trouvé ${objectDef.name} !`,
          {
            objectId: objectDef.id.toString(),
            objectType: objectDef.type,
            collected: true,
            newState: "collected"
          },
          {
            metadata: {
              itemReceived: {
                itemId,
                quantity,
                rarity
              },
              processingTime,
              timestamp: Date.now()
            }
          }
        );

      } catch (inventoryError) {
        // Erreur d'inventaire (inventaire plein, item invalide, etc.)
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Erreur ajout inventaire', inventoryError);
        
        return this.createErrorResult(
          inventoryError instanceof Error 
            ? inventoryError.message 
            : "Impossible d'ajouter l'objet à l'inventaire",
          'INVENTORY_ERROR'
        );
      }

    } catch (error) {
      // Erreur générale
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement ground_item', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // === VALIDATION SPÉCIFIQUE (optionnelle) ===

  async validateAccess(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // Vérifier les requirements si définis
    if (objectDef.requirements) {
      const req = objectDef.requirements;
      
      // Niveau requis
      if (req.level && player.level < req.level) {
        return {
          valid: false,
          reason: `Niveau ${req.level} requis (vous êtes niveau ${player.level})`
        };
      }
      
      // Badge requis
      if (req.badge) {
        // TODO: Implémenter vérification des badges
        this.log('info', `Badge requis: ${req.badge} (vérification non implémentée)`);
      }
      
      // Item requis en inventaire
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
      
      // Quête requise
      if (req.quest) {
        // TODO: Implémenter vérification des quêtes
        this.log('info', `Quête requise: ${req.quest} (vérification non implémentée)`);
      }
    }
    
    return { valid: true };
  }

  // === HOOK POST-SUCCÈS (optionnel) ===

  async onInteractionSuccess(
    player: Player, 
    objectDef: ObjectDefinition, 
    result: ObjectInteractionResult
  ): Promise<void> {
    
    // Log analytics
    this.log('info', 'Objet collecté avec succès', {
      player: player.name,
      objectId: objectDef.id,
      itemId: objectDef.itemId,
      zone: objectDef.zone
    });
    
    // TODO: Ici on pourrait :
    // - Envoyer des events pour analytics
    // - Déclencher des achievements
    // - Notifier d'autres systèmes
    // - Jouer des sons/effets spéciaux
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  /**
   * Programmer le respawn d'un objet
   */
  private scheduleRespawn(objectDef: ObjectDefinition, respawnTimeMs: number): void {
    setTimeout(() => {
      // Réinitialiser l'état de l'objet
      objectDef.state.collected = false;
      objectDef.state.lastCollectedTime = undefined;
      objectDef.state.collectedBy = [];
      
      this.log('info', `Objet respawné`, { 
        objectId: objectDef.id, 
        zone: objectDef.zone 
      });
      
    }, respawnTimeMs);
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      features: [
        'inventory_integration',
        'respawn_support', 
        'requirements_validation',
        'error_handling'
      ]
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    // Vérifications spécifiques au GroundItem
    const details = {
      ...baseHealth.details,
      inventoryManagerAvailable: !!InventoryManager,
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    return {
      ...baseHealth,
      details
    };
  }

  // === INITIALISATION SPÉCIALISÉE ===

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Vérifier que InventoryManager est disponible
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    this.log('info', 'GroundItemSubModule initialisé avec InventoryManager');
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage GroundItemSubModule');
    
    // Ici on pourrait :
    // - Annuler les timers de respawn en cours
    // - Sauvegarder des états temporaires
    // - Libérer des ressources
    
    await super.cleanup();
  }
}

// ✅ EXEMPLE D'UTILISATION EN COMMENTAIRE POUR RÉFÉRENCE

/*
// Dans Tiled, pour créer un objet au sol :
{
  "id": 1,
  "name": "beach_pokeball_1", 
  "type": "ground_item",
  "x": 400,
  "y": 200,
  "properties": [
    {"name": "type", "value": "ground_item"},
    {"name": "itemId", "value": "poke_ball"},
    {"name": "quantity", "value": 1},
    {"name": "rarity", "value": "common"},
    {"name": "respawnTime", "value": 300000},  // 5 minutes
    {"name": "level", "value": 5}              // Niveau 5 requis
  ]
}

// Côté client (Phaser), pour interagir :
this.socket.emit("objectInteract", { 
  objectId: "1" 
});

// Résultat attendu :
{
  "success": true,
  "type": "objectCollected",
  "message": "Vous avez trouvé Poké Ball !",
  "data": {
    "objectData": {
      "objectId": "1",
      "objectType": "ground_item", 
      "collected": true,
      "newState": "collected"
    },
    "metadata": {
      "itemReceived": {
        "itemId": "poke_ball",
        "quantity": 1,
        "rarity": "common"
      },
      "processingTime": 15,
      "timestamp": 1234567890
    }
  }
}
*/
