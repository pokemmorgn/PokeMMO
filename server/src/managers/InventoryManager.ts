import { Inventory, IInventory } from "../models/Inventory";
import { getItemData, isValidItemId } from "../utils/ItemDB";

// À ajuster si tu veux une limite (ex: 20 slots max comme la 1G)
const MAX_INVENTORY_SLOTS = 100;

export class InventoryManager {
  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create({ username, items: [] });
    }
    return inv;
  }

  /**
   * Ajoute une quantité d’un objet, en validant TOUT
   */
  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    if (!isValidItemId(itemId)) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const itemData = getItemData(itemId);
    const inv = await InventoryManager.getInventory(username);

    // Slots max
    const hasItem = inv.items.find(i => i.itemId === itemId);
    if (!hasItem && inv.items.length >= MAX_INVENTORY_SLOTS)
      throw new Error(`[InventoryManager] Inventaire plein (${MAX_INVENTORY_SLOTS} slots max)`);

    if (!itemData.stackable) {
      // Pas de stack, 1 seul exemplaire max
      if (hasItem)
        throw new Error(`[InventoryManager] "${itemId}" déjà possédé (objet non stackable)`);
      inv.items.push({ itemId, quantity: 1 });
    } else {
      // Stackable
      if (hasItem) {
        hasItem.quantity += qty;
      } else {
        inv.items.push({ itemId, quantity: qty });
      }
    }
    await inv.save();
    return inv;
  }

  /**
   * Retire une quantité d’objet (check tout)
   */
  static async removeItem(username: string, itemId: string, qty: number = 1): Promise<boolean> {
    if (!isValidItemId(itemId)) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const itemData = getItemData(itemId);
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);

    if (!item) return false;
    if (!itemData.stackable && qty > 1)
      throw new Error(`[InventoryManager] Impossible de retirer plusieurs exemplaires d’un non-stackable`);
    if (item.quantity < qty) return false;

    item.quantity -= qty;
    if (item.quantity <= 0) {
      inv.items = inv.items.filter(i => i.itemId !== itemId);
    }
    await inv.save();
    return true;
  }

  /**
   * Vérifie la quantité d’un objet possédé
   */
  static async getItemCount(username: string, itemId: string): Promise<number> {
    if (!isValidItemId(itemId)) return 0;
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    return item ? item.quantity : 0;
  }

  /**
   * Retourne l’inventaire du joueur, avec données objets enrichies
   */
  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number; data: any }[]> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.map(i => ({
      itemId: i.itemId,
      quantity: i.quantity,
      data: getItemData(i.itemId)
    }));
  }

  /**
   * Renvoie un slot libre ? (pour gestion shop)
   */
  static async hasFreeSlot(username: string): Promise<boolean> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.length < MAX_INVENTORY_SLOTS;
  }

  /**
   * Vide l’inventaire (debug / reset)
   */
  static async clear(username: string) {
    const inv = await InventoryManager.getInventory(username);
    inv.items = [];
    await inv.save();
  }
}
