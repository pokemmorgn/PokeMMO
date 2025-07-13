// server/src/rewards/ItemReward.ts

import { InventoryManager } from '../managers/InventoryManager';
import { getItemData, isValidItemId } from '../utils/ItemDB';
import { 
  ItemReward as ItemRewardType, 
  ProcessedReward, 
  RewardNotification 
} from './types/RewardTypes';

export class ItemReward {

  /**
   * 🎒 Distribue un objet à un joueur en utilisant l'InventoryManager existant
   */
  async giveItem(playerId: string, reward: ItemRewardType): Promise<ProcessedReward> {
    console.log(`🎒 [ItemReward] Distribution objet pour ${playerId}: ${reward.quantity}x ${reward.itemId}`);

    try {
      // Valider l'objet avec le système existant
      if (!isValidItemId(reward.itemId)) {
        return {
          type: 'item',
          success: false,
          error: `Objet inconnu: ${reward.itemId}`
        };
      }

      if (reward.quantity <= 0) {
        return {
          type: 'item',
          success: false,
          error: 'Quantité invalide'
        };
      }

      const itemData = getItemData(reward.itemId);
      const oldQuantity = await InventoryManager.getItemCount(playerId, reward.itemId);

      // Utiliser l'InventoryManager pour ajouter l'objet
      await InventoryManager.addItem(playerId, reward.itemId, reward.quantity);

      const newQuantity = await InventoryManager.getItemCount(playerId, reward.itemId);
      const actualQuantityAdded = newQuantity - oldQuantity;

      // Générer les notifications
      const notifications: RewardNotification[] = [
        {
          type: 'item',
          message: this.generateItemNotification(reward.itemId, actualQuantityAdded, itemData),
          priority: this.getItemPriority(reward.itemId, itemData),
          data: {
            itemId: reward.itemId,
            quantityAdded: actualQuantityAdded,
            newQuantity,
            itemName: this.getItemDisplayName(reward.itemId),
            rarity: this.getItemRarity(itemData)
          }
        }
      ];

      // Notification spéciale pour objets rares
      if (this.isRareItem(itemData)) {
        notifications.push({
          type: 'item',
          message: `Félicitations ! Vous avez obtenu un objet rare : ${this.getItemDisplayName(reward.itemId)} !`,
          priority: 'high',
          data: {
            itemId: reward.itemId,
            rare: true
          }
        });
      }

      console.log(`✅ [ItemReward] ${playerId}: +${actualQuantityAdded}x ${reward.itemId}`);

      return {
        type: 'item',
        success: true,
        finalAmount: actualQuantityAdded,
        data: {
          itemId: reward.itemId,
          quantity: actualQuantityAdded,
          oldQuantity,
          newQuantity,
          itemName: this.getItemDisplayName(reward.itemId),
          notifications
        }
      };

    } catch (error) {
      console.error('❌ [ItemReward] Erreur distribution objet:', error);
      return {
        type: 'item',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🗑️ Retire un objet de l'inventaire d'un joueur
   */
  async removeItem(
    playerId: string, 
    itemId: string, 
    quantity: number
  ): Promise<{
    success: boolean;
    error?: string;
    removedQuantity?: number;
    newQuantity?: number;
  }> {
    console.log(`🗑️ [ItemReward] Retrait objet ${playerId}: ${quantity}x ${itemId}`);

    try {
      if (!isValidItemId(itemId)) {
        return {
          success: false,
          error: `Objet inconnu: ${itemId}`
        };
      }

      const oldQuantity = await InventoryManager.getItemCount(playerId, itemId);
      
      if (oldQuantity < quantity) {
        return {
          success: false,
          error: 'Quantité insuffisante',
          removedQuantity: 0,
          newQuantity: oldQuantity
        };
      }

      // Utiliser l'InventoryManager pour retirer l'objet
      const success = await InventoryManager.removeItem(playerId, itemId, quantity);
      
      if (!success) {
        return {
          success: false,
          error: 'Échec du retrait',
          removedQuantity: 0,
          newQuantity: oldQuantity
        };
      }

      const newQuantity = await InventoryManager.getItemCount(playerId, itemId);

      console.log(`✅ [ItemReward] Retrait ${playerId}: -${quantity}x ${itemId}, reste: ${newQuantity}`);

      return {
        success: true,
        removedQuantity: quantity,
        newQuantity
      };

    } catch (error) {
      console.error('❌ [ItemReward] Erreur retrait objet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // === MÉTHODES PRIVÉES ===

  private generateItemNotification(itemId: string, quantity: number, itemData: any): string {
    const itemName = this.getItemDisplayName(itemId);
    
    if (quantity === 1) {
      return `Vous obtenez ${itemName} !`;
    } else {
      return `Vous obtenez ${quantity}x ${itemName} !`;
    }
  }

  private getItemDisplayName(itemId: string): string {
    // Mapping des noms d'affichage français
    const displayNames: Record<string, string> = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'safari_ball': 'Safari Ball',
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'max_potion': 'Potion Max',
      'full_restore': 'Guérison Totale',
      'revive': 'Rappel',
      'max_revive': 'Rappel Max',
      'antidote': 'Antidote',
      'parlyz_heal': 'Anti-Para',
      'awakening': 'Réveil',
      'burn_heal': 'Anti-Brûle',
      'ice_heal': 'Antigel',
      'full_heal': 'Guérison',
      'escape_rope': 'Corde Sortie',
      'repel': 'Repousse',
      'super_repel': 'Super Repousse',
      'max_repel': 'Max Repousse',
      'bike_voucher': 'Bon Vélo',
      'bicycle': 'Vélo',
      'town_map': 'Carte',
      'itemfinder': 'Cherch\'Objet',
      'old_rod': 'Canne à Pêche',
      'good_rod': 'Super Canne',
      'super_rod': 'Méga Canne',
      'exp_share': 'Multi Exp',
      'coin_case': 'Boîte Jetons'
    };

    return displayNames[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getItemPriority(itemId: string, itemData: any): 'low' | 'medium' | 'high' {
    if (this.isRareItem(itemData)) {
      return 'high';
    }

    if (itemData.type === 'key_item' || itemData.pocket === 'key_items') {
      return 'high';
    }

    if (['master_ball', 'max_revive', 'full_restore'].includes(itemId)) {
      return 'high';
    }

    return 'medium';
  }

  private isRareItem(itemData: any): boolean {
    if (!itemData) return false;

    return (
      itemData.type === 'key_item' ||
      itemData.pocket === 'key_items' ||
      itemData.price === null || // Items qu'on ne peut pas acheter
      itemData.price > 5000 ||
      ['master_ball', 'max_revive', 'full_restore'].includes(itemData.id)
    );
  }

  private getItemRarity(itemData: any): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (!itemData) return 'common';

    if (itemData.type === 'key_item') return 'legendary';
    if (itemData.id === 'master_ball') return 'epic';
    if (itemData.price === null) return 'rare';
    if (itemData.price > 2000) return 'uncommon';
    
    return 'common';
  }

  // === MÉTHODES UTILITAIRES PUBLIQUES ===

  /**
   * 📋 Vérifie si un joueur possède un objet en quantité suffisante
   */
  async hasItem(playerId: string, itemId: string, requiredQuantity: number = 1): Promise<boolean> {
    try {
      const currentQuantity = await InventoryManager.getItemCount(playerId, itemId);
      return currentQuantity >= requiredQuantity;
    } catch (error) {
      console.error('❌ [ItemReward] Erreur vérification objet:', error);
      return false;
    }
  }

  /**
   * 🔍 Obtient la quantité d'un objet dans l'inventaire
   */
  async getItemCount(playerId: string, itemId: string): Promise<number> {
    try {
      return await InventoryManager.getItemCount(playerId, itemId);
    } catch (error) {
      console.error('❌ [ItemReward] Erreur comptage objet:', error);
      return 0;
    }
  }

  /**
   * 📦 Obtient l'inventaire complet d'un joueur
   */
  async getPlayerInventory(playerId: string): Promise<any | null> {
    try {
      return await InventoryManager.getInventory(playerId);
    } catch (error) {
      console.error('❌ [ItemReward] Erreur récupération inventaire:', error);
      return null;
    }
  }

  /**
   * 🎁 Distribue plusieurs objets en une fois
   */
  async giveMultipleItems(
    playerId: string, 
    items: Array<{
      itemId: string;
      quantity: number;
    }>
  ): Promise<{
    success: boolean;
    error?: string;
    results: Array<{
      itemId: string;
      success: boolean;
      quantityAdded: number;
      error?: string;
    }>;
    totalItemsAdded: number;
  }> {
    console.log(`🎁 [ItemReward] Distribution multiple pour ${playerId}: ${items.length} types d'objets`);

    const results: Array<{
      itemId: string;
      success: boolean;
      quantityAdded: number;
      error?: string;
    }> = [];

    let totalItemsAdded = 0;
    let hasError = false;

    try {
      for (const item of items) {
        const result = await this.giveItem(playerId, {
          type: 'item',
          itemId: item.itemId,
          quantity: item.quantity
        });

        results.push({
          itemId: item.itemId,
          success: result.success,
          quantityAdded: result.finalAmount || 0,
          error: result.error
        });

        if (result.success) {
          totalItemsAdded += result.finalAmount || 0;
        } else {
          hasError = true;
        }
      }

      return {
        success: !hasError,
        error: hasError ? 'Certains objets n\'ont pas pu être distribués' : undefined,
        results,
        totalItemsAdded
      };

    } catch (error) {
      console.error('❌ [ItemReward] Erreur distribution multiple:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        results,
        totalItemsAdded: 0
      };
    }
  }

  /**
   * 🛒 Vérifie si un joueur peut utiliser un objet dans un contexte donné
   */
  async canUseItem(playerId: string, itemId: string, context: 'battle' | 'field'): Promise<boolean> {
    try {
      return await InventoryManager.canUseItem(playerId, itemId, context);
    } catch (error) {
      console.error('❌ [ItemReward] Erreur vérification usage objet:', error);
      return false;
    }
  }

  /**
   * 📊 Obtient des statistiques sur l'inventaire d'un joueur
   */
  async getInventoryStats(playerId: string): Promise<{
    totalItems: number;
    totalUniqueItems: number;
    itemsByPocket: Record<string, number>;
    rareItemsCount: number;
    keyItemsCount: number;
  }> {
    try {
      const allItems = await InventoryManager.getAllItems(playerId);
      
      const stats = {
        totalItems: 0,
        totalUniqueItems: allItems.length,
        itemsByPocket: {} as Record<string, number>,
        rareItemsCount: 0,
        keyItemsCount: 0
      };

      for (const item of allItems) {
        stats.totalItems += item.quantity;
        
        if (!stats.itemsByPocket[item.pocket]) {
          stats.itemsByPocket[item.pocket] = 0;
        }
        stats.itemsByPocket[item.pocket] += item.quantity;

        if (this.isRareItem(item.data)) {
          stats.rareItemsCount += item.quantity;
        }

        if (item.pocket === 'key_items') {
          stats.keyItemsCount += item.quantity;
        }
      }

      return stats;

    } catch (error) {
      console.error('❌ [ItemReward] Erreur stats inventaire:', error);
      return {
        totalItems: 0,
        totalUniqueItems: 0,
        itemsByPocket: {},
        rareItemsCount: 0,
        keyItemsCount: 0
      };
    }
  }

  /**
   * 🔄 Transfère un objet entre joueurs (pour échanges)
   */
  async transferItem(
    fromPlayerId: string,
    toPlayerId: string,
    itemId: string,
    quantity: number,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
    fromNewQuantity?: number;
    toNewQuantity?: number;
  }> {
    console.log(`🔄 [ItemReward] Transfert ${fromPlayerId} -> ${toPlayerId}: ${quantity}x ${itemId} (${reason || 'Non spécifié'})`);

    try {
      // Vérifier que l'expéditeur a assez d'objets
      const fromQuantity = await this.getItemCount(fromPlayerId, itemId);
      if (fromQuantity < quantity) {
        return {
          success: false,
          error: 'Quantité insuffisante chez l\'expéditeur'
        };
      }

      // Retirer de l'expéditeur
      const removeResult = await this.removeItem(fromPlayerId, itemId, quantity);
      if (!removeResult.success) {
        return {
          success: false,
          error: removeResult.error || 'Échec du retrait'
        };
      }

      // Donner au destinataire
      const giveResult = await this.giveItem(toPlayerId, {
        type: 'item',
        itemId,
        quantity
      });

      if (!giveResult.success) {
        // Rembourser l'expéditeur en cas d'échec
        await this.giveItem(fromPlayerId, {
          type: 'item',
          itemId,
          quantity
        });

        return {
          success: false,
          error: giveResult.error || 'Échec du don au destinataire'
        };
      }

      const finalFromQuantity = await this.getItemCount(fromPlayerId, itemId);
      const finalToQuantity = await this.getItemCount(toPlayerId, itemId);

      console.log(`✅ [ItemReward] Transfert réussi: ${fromPlayerId}(${fromQuantity}->${finalFromQuantity}) -> ${toPlayerId}(${finalToQuantity})`);

      return {
        success: true,
        fromNewQuantity: finalFromQuantity,
        toNewQuantity: finalToQuantity
      };

    } catch (error) {
      console.error('❌ [ItemReward] Erreur transfert objet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}
