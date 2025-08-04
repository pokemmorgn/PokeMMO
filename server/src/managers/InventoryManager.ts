import { Inventory, IInventory, IInventoryItem } from "../models/Inventory";
import { getItemData, isValidItemId, getItemPocket } from "../utils/ItemDB";
import { EventDispatcher } from "../utils/EventDispatcher";

// ✅ NOUVEAUX IMPORTS - Intégration MongoDB
import { ItemService } from "../services/ItemService";
import { ItemData } from "../models/ItemData";

// Type des events d'inventaire
type InventoryEvents = {
  addItem: { username: string; itemId: string; quantity: number };
  removeItem: { username: string; itemId: string; quantity: number };
  clear: { username: string };
};

// Liste de toutes les poches gérées
const ALL_POCKETS = [
  "items", "medicine", "balls", "berries", "key_items",
  "tms", "battle_items", "valuables", "held_items"
] as const;
type PocketName = typeof ALL_POCKETS[number];

// Limite de slots PAR POCHE
const MAX_SLOTS_PER_POCKET = 30;

// Helper pour accéder/créer la bonne poche
function getPocketList(inv: IInventory, pocket: string) {
  if (!inv[pocket]) inv[pocket] = [];
  return inv[pocket] as IInventoryItem[];
}

// ✅ NOUVELLE FONCTION : Mappage MongoDB category vers poche legacy
function getCategoryToPocket(category: string): string {
  const categoryToPocketMap: { [key: string]: string } = {
    'medicine': 'medicine',
    'pokeballs': 'balls', 
    'battle_items': 'battle_items',
    'key_items': 'key_items',
    'berries': 'berries',
    'machines': 'tms',
    'evolution_items': 'items',
    'held_items': 'held_items',
    'z_crystals': 'key_items',
    'dynamax_crystals': 'key_items',
    'tera_shards': 'items',
    'poke_toys': 'items',
    'ingredients': 'items',
    'treasure': 'valuables',
    'fossil': 'key_items',
    'flutes': 'key_items',
    'mail': 'key_items',
    'exp_items': 'items'
  };
  
  return categoryToPocketMap[category] || 'items';
}

// Correction automatique des poches lors du chargement d'inventaire
async function fixInventoryPockets(inv: IInventory): Promise<boolean> {
  let changed = false;
  // Pour chaque poche…
  for (const pocket of ALL_POCKETS) {
    const list = getPocketList(inv, pocket);
    // On copie pour pouvoir boucler même si on modifie
    for (let idx = list.length - 1; idx >= 0; idx--) {
      const i = list[idx];
      
      // ✅ VALIDATION HYBRIDE : Legacy + MongoDB
      const validation = await InventoryManager.validateItemExistsHybrid(i.itemId);
      
      // Si l'item n'existe plus, supprime-le
      if (!validation.valid) {
        console.warn(`📦 [InventoryManager] Item supprimé (inexistant): ${i.itemId}`);
        list.splice(idx, 1);
        changed = true;
        continue;
      }
      
      // ✅ UTILISER LA BONNE POCHE (Legacy ou MongoDB)
      let correctPocket: string;
      
      if (validation.source === 'legacy') {
        correctPocket = getItemPocket(i.itemId);
      } else {
        // MongoDB - mapper category vers poche
        correctPocket = getCategoryToPocket(validation.itemData?.category || 'items');
      }
      
      // Si l'item est dans la mauvaise poche : déplace-le
      if (correctPocket !== pocket) {
        console.log(`📦 [InventoryManager] Déplacement ${i.itemId}: ${pocket} → ${correctPocket} (source: ${validation.source})`);
        
        // Ajoute ou fusionne dans la bonne poche
        const dest = getPocketList(inv, correctPocket);
        const existing = dest.find(x => x.itemId === i.itemId);
        if (existing) existing.quantity += i.quantity;
        else dest.push({ itemId: i.itemId, quantity: i.quantity });
        // Supprime de la poche d'origine
        list.splice(idx, 1);
        changed = true;
      }
    }
  }
  // Enlève toutes les valeurs undefined/null sur les poches
  for (const pocket of ALL_POCKETS) {
    if (!Array.isArray(inv[pocket])) inv[pocket] = [];
  }
  if (changed) await inv.save();
  return changed;
}

export class InventoryManager {
  static events = new EventDispatcher<InventoryEvents>();

  // ✅ NOUVELLE MÉTHODE : Normalisation d'ID d'item
  private static normalizeItemId(itemId: string): string {
    if (!itemId) return itemId;
    
    return itemId
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // ✅ NOUVELLE MÉTHODE : Validation hybride Legacy + MongoDB
  static async validateItemExistsHybrid(itemId: string): Promise<{
    valid: boolean;
    actualItemId?: string;
    itemData?: any;
    source: 'legacy' | 'mongodb' | 'not_found';
    isPocketCorrect?: boolean;
  }> {
    try {
      // 1. Essayer d'abord le système legacy (pour rétrocompatibilité)
      if (isValidItemId(itemId)) {
        const legacyData = getItemData(itemId);
        return { 
          valid: true, 
          actualItemId: itemId, 
          itemData: legacyData,
          source: 'legacy',
          isPocketCorrect: true
        };
      }

      // 2. Essayer avec ItemService MongoDB (recherche exacte)
      try {
        const mongoItemData = await ItemService.getItemById(itemId);
        if (mongoItemData) {
          return { 
            valid: true, 
            actualItemId: itemId, 
            itemData: mongoItemData,
            source: 'mongodb' 
          };
        }
      } catch (mongoError) {
        console.warn(`📦 [InventoryManager] Erreur MongoDB pour ${itemId}:`, mongoError);
      }

      // 3. Normaliser et réessayer
      const normalizedId = this.normalizeItemId(itemId);
      if (normalizedId !== itemId) {
        try {
          const normalizedItemData = await ItemService.getItemById(normalizedId);
          if (normalizedItemData) {
            console.log(`📦 [InventoryManager] Item trouvé avec ID normalisé: ${itemId} → ${normalizedId}`);
            return { 
              valid: true, 
              actualItemId: normalizedId, 
              itemData: normalizedItemData,
              source: 'mongodb' 
            };
          }
        } catch (normalizedError) {
          // Continue vers recherche case-insensitive
        }
      }

      // 4. Recherche case-insensitive MongoDB
      try {
        const item = await ItemData.findOne({ 
          itemId: { $regex: new RegExp(`^${itemId}$`, 'i') }, 
          isActive: true 
        });
        
        if (item) {
          console.log(`📦 [InventoryManager] Item trouvé (case-insensitive): ${itemId} → ${item.itemId}`);
          return { 
            valid: true, 
            actualItemId: item.itemId, 
            itemData: item,
            source: 'mongodb' 
          };
        }
      } catch (searchError) {
        console.warn('Erreur recherche case-insensitive InventoryManager:', searchError);
      }

      return { valid: false, source: 'not_found' };

    } catch (error) {
      console.error(`❌ [InventoryManager] Erreur validation item ${itemId}:`, error);
      return { valid: false, source: 'not_found' };
    }
  }

  // ✅ NOUVELLE MÉTHODE : Récupère les données d'item (hybride)
  static async getItemDataHybrid(itemId: string): Promise<{
    data: any;
    source: 'legacy' | 'mongodb';
    pocket: string;
    stackable: boolean;
  } | null> {
    const validation = await this.validateItemExistsHybrid(itemId);
    
    if (!validation.valid || !validation.itemData) {
      return null;
    }

    if (validation.source === 'legacy') {
      return {
        data: validation.itemData,
        source: 'legacy',
        pocket: getItemPocket(itemId),
        stackable: validation.itemData.stackable !== false
      };
    } else {
      // MongoDB
      return {
        data: validation.itemData,
        source: 'mongodb',
        pocket: getCategoryToPocket(validation.itemData.category),
        stackable: validation.itemData.stackable !== false
      };
    }
  }

  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create(Object.fromEntries([
        ["username", username],
        ...ALL_POCKETS.map<[string, IInventoryItem[]]>(pocket => [pocket, [] as IInventoryItem[]])
      ]));
    } else {
      // ✅ Vérifie et corrige les poches au chargement (avec support MongoDB)
      await fixInventoryPockets(inv);
    }
    return inv;
  }

  // ✅ MÉTHODE PRINCIPALE MODIFIÉE : addItem avec support MongoDB
  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    console.log(`📦 [InventoryManager] Ajout item: ${username} - ${itemId} x${qty}`);

    // ✅ VALIDATION HYBRIDE
    const validation = await this.validateItemExistsHybrid(itemId);
    
    if (!validation.valid) {
      throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    }

    // ✅ UTILISER L'ID RÉEL TROUVÉ
    const actualItemId = validation.actualItemId!;
    const itemDataInfo = await this.getItemDataHybrid(actualItemId);
    
    if (!itemDataInfo) {
      throw new Error(`[InventoryManager] Impossible de récupérer les données pour "${actualItemId}"`);
    }

    if (actualItemId !== itemId) {
      console.log(`📦 [InventoryManager] ID normalisé: ${itemId} → ${actualItemId} (source: ${validation.source})`);
    }

    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const pocket = itemDataInfo.pocket;
    const stackable = itemDataInfo.stackable;
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);

    const hasItem = list.find((i: IInventoryItem) => i.itemId === actualItemId);

    if (!hasItem && list.length >= MAX_SLOTS_PER_POCKET)
      throw new Error(`[InventoryManager] Poche "${pocket}" pleine (${MAX_SLOTS_PER_POCKET} slots max)`);

    if (!stackable) {
      if (hasItem)
        throw new Error(`[InventoryManager] "${actualItemId}" déjà possédé (objet non stackable)`);
      list.push({ itemId: actualItemId, quantity: 1 });
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId: actualItemId, quantity: 1 });
      
      console.log(`✅ [InventoryManager] Item non-stackable ajouté: ${actualItemId} (source: ${validation.source})`);
      return inv;
    } else {
      if (hasItem) {
        hasItem.quantity += qty;
        console.log(`✅ [InventoryManager] Quantité augmentée: ${actualItemId} (${hasItem.quantity}) (source: ${validation.source})`);
      } else {
        list.push({ itemId: actualItemId, quantity: qty });
        console.log(`✅ [InventoryManager] Nouvel item ajouté: ${actualItemId} x${qty} (source: ${validation.source})`);
      }
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId: actualItemId, quantity: qty });
      return inv;
    }
  }

  // ✅ MÉTHODE MODIFIÉE : removeItem avec support MongoDB
  static async removeItem(username: string, itemId: string, qty: number = 1): Promise<boolean> {
    const validation = await this.validateItemExistsHybrid(itemId);
    
    if (!validation.valid) {
      throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    }

    const actualItemId = validation.actualItemId!;
    const itemDataInfo = await this.getItemDataHybrid(actualItemId);
    
    if (!itemDataInfo) {
      throw new Error(`[InventoryManager] Impossible de récupérer les données pour "${actualItemId}"`);
    }

    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const pocket = itemDataInfo.pocket;
    const stackable = itemDataInfo.stackable;
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    const item = list.find((i: IInventoryItem) => i.itemId === actualItemId);

    if (!item) return false;
    if (!stackable && qty > 1)
      throw new Error(`[InventoryManager] Impossible de retirer plusieurs exemplaires d'un non-stackable`);
    if (item.quantity < qty) return false;

    item.quantity -= qty;
    if (item.quantity <= 0) {
      const idx = list.findIndex((i: IInventoryItem) => i.itemId === actualItemId);
      if (idx >= 0) list.splice(idx, 1);
    }
    await inv.save();
    InventoryManager.events.emit("removeItem", { username, itemId: actualItemId, quantity: qty });
    
    console.log(`✅ [InventoryManager] Item retiré: ${actualItemId} x${qty} (source: ${validation.source})`);
    return true;
  }

  // ✅ MÉTHODE MODIFIÉE : getItemCount avec support MongoDB
  static async getItemCount(username: string, itemId: string): Promise<number> {
    const validation = await this.validateItemExistsHybrid(itemId);
    
    if (!validation.valid) return 0;

    const actualItemId = validation.actualItemId!;
    const itemDataInfo = await this.getItemDataHybrid(actualItemId);
    
    if (!itemDataInfo) return 0;

    const pocket = itemDataInfo.pocket;
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    const item = list.find((i: IInventoryItem) => i.itemId === actualItemId);
    return item ? item.quantity : 0;
  }

  // ✅ MÉTHODE MODIFIÉE : getAllItems avec support MongoDB
  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number; data: any; pocket: string; source: string }[]> {
    const inv = await InventoryManager.getInventory(username);
    const result: { itemId: string; quantity: number; data: any; pocket: string; source: string }[] = [];
    
    for (const pocket of ALL_POCKETS) {
      const list = getPocketList(inv, pocket);
      for (const i of list) {
        const itemDataInfo = await this.getItemDataHybrid(i.itemId);
        if (itemDataInfo) {
          result.push({ 
            itemId: i.itemId, 
            quantity: i.quantity, 
            data: itemDataInfo.data, 
            pocket: itemDataInfo.pocket,
            source: itemDataInfo.source
          });
        }
      }
    }
    return result;
  }

  // ✅ MÉTHODE MODIFIÉE : getItemsByPocket avec support MongoDB
  static async getItemsByPocket(username: string, pocket: string): Promise<{ itemId: string; quantity: number; data: any; source: string }[]> {
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    const result: { itemId: string; quantity: number; data: any; source: string }[] = [];
    
    for (const i of list) {
      const itemDataInfo = await this.getItemDataHybrid(i.itemId);
      if (itemDataInfo) {
        result.push({
          itemId: i.itemId,
          quantity: i.quantity,
          data: itemDataInfo.data,
          source: itemDataInfo.source
        });
      }
    }
    
    return result;
  }

  // ✅ MÉTHODE MODIFIÉE : getAllItemsGroupedByPocket avec support MongoDB
  static async getAllItemsGroupedByPocket(username: string): Promise<Record<string, { itemId: string; quantity: number; data: any; source: string }[]>> {
    const inv = await InventoryManager.getInventory(username);
    const grouped: Record<string, { itemId: string; quantity: number; data: any; source: string }[]> = {};
    
    for (const pocket of ALL_POCKETS) {
      const list = getPocketList(inv, pocket);
      grouped[pocket] = [];
      
      for (const i of list) {
        const itemDataInfo = await this.getItemDataHybrid(i.itemId);
        if (itemDataInfo) {
          grouped[pocket].push({
            itemId: i.itemId,
            quantity: i.quantity,
            data: itemDataInfo.data,
            source: itemDataInfo.source
          });
        }
      }
    }
    return grouped;
  }

  // Vérifie si une poche a un slot libre
  static async hasFreeSlot(username: string, pocket: string): Promise<boolean> {
    const inv = await InventoryManager.getInventory(username);
    const list = getPocketList(inv, pocket);
    return list.length < MAX_SLOTS_PER_POCKET;
  }

  // Vide toutes les poches
  static async clear(username: string) {
    const inv = await InventoryManager.getInventory(username);
    for (const pocket of ALL_POCKETS) {
      inv[pocket] = [];
    }
    await inv.save();
    InventoryManager.events.emit("clear", { username });
  }

  // Sauvegarde/export inventaire complet (sans _id, ni __v)
  static async exportInventory(username: string): Promise<any> {
    const inv = await InventoryManager.getInventory(username);
    const raw: { [key: string]: any } = {};
    for (const pocket of ALL_POCKETS) {
      raw[pocket] = inv[pocket]?.map((i: IInventoryItem) => ({ itemId: i.itemId, quantity: i.quantity })) || [];
    }
    raw["username"] = username;
    return raw;
  }

  // Restaure un inventaire (remplace tout !)
  static async importInventory(username: string, data: any) {
    let inv = await Inventory.findOne({ username });
    if (!inv) inv = await Inventory.create({ username });
    for (const pocket of ALL_POCKETS) {
      inv[pocket] = (data[pocket] || []).map((i: { itemId: string; quantity: number }) => ({ itemId: i.itemId, quantity: i.quantity }));
    }
    await fixInventoryPockets(inv); // ✅ Corrige après import (avec support MongoDB)
    await inv.save();
  }

  // ✅ MÉTHODE MODIFIÉE : canUseItem avec support MongoDB
  static async canUseItem(username: string, itemId: string, context: "battle" | "field"): Promise<boolean> {
    const validation = await this.validateItemExistsHybrid(itemId);
    
    if (!validation.valid) return false;

    const actualItemId = validation.actualItemId!;
    const itemDataInfo = await this.getItemDataHybrid(actualItemId);
    
    if (!itemDataInfo) return false;

    const qty = await InventoryManager.getItemCount(username, actualItemId);
    if (qty <= 0) return false;

    if (validation.source === 'legacy') {
      // Utiliser l'ancien système
      if (context === "battle" && !itemDataInfo.data.usable_in_battle) return false;
      if (context === "field" && !itemDataInfo.data.usable_in_field) return false;
    } else {
      // MongoDB - utiliser usageRestrictions
      const restrictions = itemDataInfo.data.usageRestrictions || {};
      if (context === "battle" && restrictions.fieldOnly) return false;
      if (context === "field" && restrictions.battleOnly) return false;
    }

    return true;
  }

  // ✅ NOUVELLES MÉTHODES DE DIAGNOSTIC
  
  /**
   * Diagnostique l'état de l'inventaire (Legacy vs MongoDB)
   */
  static async diagnoseInventoryItems(username: string): Promise<{
    total_items: number;
    legacy_items: number;
    mongodb_items: number;
    unknown_items: number;
    items_by_source: { legacy: string[]; mongodb: string[]; unknown: string[] };
    pocket_distribution: Record<string, number>;
  }> {
    const inv = await this.getInventory(username);
    const diagnosis = {
      total_items: 0,
      legacy_items: 0,
      mongodb_items: 0,
      unknown_items: 0,
      items_by_source: { legacy: [] as string[], mongodb: [] as string[], unknown: [] as string[] },
      pocket_distribution: {} as Record<string, number>
    };

    for (const pocket of ALL_POCKETS) {
      const list = getPocketList(inv, pocket);
      diagnosis.pocket_distribution[pocket] = list.length;
      
      for (const item of list) {
        diagnosis.total_items++;
        
        const validation = await this.validateItemExistsHybrid(item.itemId);
        
        if (!validation.valid) {
          diagnosis.unknown_items++;
          diagnosis.items_by_source.unknown.push(item.itemId);
        } else if (validation.source === 'legacy') {
          diagnosis.legacy_items++;
          diagnosis.items_by_source.legacy.push(item.itemId);
        } else {
          diagnosis.mongodb_items++;
          diagnosis.items_by_source.mongodb.push(item.itemId);
        }
      }
    }

    return diagnosis;
  }

  /**
   * Répare les incohérences d'inventaire
   */
  static async repairInventory(username: string, options: {
    removeUnknownItems?: boolean;
    fixPockets?: boolean;
    normalizeItemIds?: boolean;
  } = {}): Promise<{
    items_removed: number;
    items_moved: number;
    items_normalized: number;
    errors: string[];
  }> {
    const result = {
      items_removed: 0,
      items_moved: 0,
      items_normalized: 0,
      errors: [] as string[]
    };

    try {
      const inv = await this.getInventory(username);
      
      for (const pocket of ALL_POCKETS) {
        const list = getPocketList(inv, pocket);
        
        for (let i = list.length - 1; i >= 0; i--) {
          const item = list[i];
          const validation = await this.validateItemExistsHybrid(item.itemId);
          
          if (!validation.valid) {
            if (options.removeUnknownItems) {
              list.splice(i, 1);
              result.items_removed++;
              console.log(`🗑️ [Repair] Item inconnu supprimé: ${item.itemId}`);
            }
            continue;
          }

          // Normalisation d'ID
          if (options.normalizeItemIds && validation.actualItemId !== item.itemId) {
            item.itemId = validation.actualItemId!;
            result.items_normalized++;
            console.log(`🔧 [Repair] ID normalisé: ${item.itemId} → ${validation.actualItemId}`);
          }

          // Correction de poche
          if (options.fixPockets) {
            const itemDataInfo = await this.getItemDataHybrid(validation.actualItemId!);
            if (itemDataInfo && itemDataInfo.pocket !== pocket) {
              // Déplacer vers la bonne poche
              const targetList = getPocketList(inv, itemDataInfo.pocket);
              const existing = targetList.find(x => x.itemId === validation.actualItemId);
              
              if (existing) {
                existing.quantity += item.quantity;
              } else {
                targetList.push({ itemId: validation.actualItemId!, quantity: item.quantity });
              }
              
              list.splice(i, 1);
              result.items_moved++;
              console.log(`📦 [Repair] Item déplacé: ${validation.actualItemId} (${pocket} → ${itemDataInfo.pocket})`);
            }
          }
        }
      }

      await inv.save();
      console.log(`✅ [Repair] Inventaire réparé pour ${username}:`, result);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
    }

    return result;
  }

  /**
   * ✅ NOUVELLE : Statistiques globales du système d'inventaire
   */
  static async getSystemStats(): Promise<{
    total_inventories: number;
    items_by_source: { legacy: number; mongodb: number; unknown: number };
    most_common_items: Array<{ itemId: string; count: number; source: string }>;
    pocket_usage: Record<string, number>;
    system_health: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const inventories = await Inventory.find({});
      const stats = {
        total_inventories: inventories.length,
        items_by_source: { legacy: 0, mongodb: 0, unknown: 0 },
        most_common_items: [] as Array<{ itemId: string; count: number; source: string }>,
        pocket_usage: {} as Record<string, number>,
        system_health: 'healthy' as 'healthy' | 'warning' | 'critical'
      };

      const itemCounts: Map<string, { count: number; source: string }> = new Map();

      for (const pocket of ALL_POCKETS) {
        stats.pocket_usage[pocket] = 0;
      }

      for (const inv of inventories) {
        for (const pocket of ALL_POCKETS) {
          const list = getPocketList(inv, pocket);
          stats.pocket_usage[pocket] += list.length;

          for (const item of list) {
            const validation = await this.validateItemExistsHybrid(item.itemId);
            
            if (!validation.valid) {
              stats.items_by_source.unknown++;
            } else if (validation.source === 'legacy') {
              stats.items_by_source.legacy++;
            } else {
              stats.items_by_source.mongodb++;
            }

            // Compter les occurrences
            const current = itemCounts.get(item.itemId) || { count: 0, source: validation.source || 'unknown' };
            current.count += item.quantity;
            itemCounts.set(item.itemId, current);
          }
        }
      }

      // Top items
      stats.most_common_items = Array.from(itemCounts.entries())
        .map(([itemId, data]) => ({ itemId, count: data.count, source: data.source }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Health check
      const unknownRatio = stats.items_by_source.unknown / 
        (stats.items_by_source.legacy + stats.items_by_source.mongodb + stats.items_by_source.unknown);
      
      if (unknownRatio > 0.1) stats.system_health = 'critical';
      else if (unknownRatio > 0.05) stats.system_health = 'warning';

      console.log('📊 [InventoryManager] Statistiques système:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [InventoryManager] Erreur calcul statistiques:', error);
      return {
        total_inventories: 0,
        items_by_source: { legacy: 0, mongodb: 0, unknown: 0 },
        most_common_items: [],
        pocket_usage: {},
        system_health: 'critical'
      };
    }
  }
}
