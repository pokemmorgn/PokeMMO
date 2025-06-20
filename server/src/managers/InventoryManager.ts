import { Inventory, IInventory } from "../models/Inventory";
import { getItemData, isValidItemId } from "../utils/ItemDB";
import { EventDispatcher } from "../utils/EventDispatcher";

// Type des events de l’inventaire
type InventoryEvents = {
  addItem: { username: string; itemId: string; quantity: number };
  removeItem: { username: string; itemId: string; quantity: number };
  clear: { username: string };
};

// Limite d’items (slots max, façon 1G)
const MAX_INVENTORY_SLOTS = 30;

export class InventoryManager {
  static events = new EventDispatcher<InventoryEvents>();

  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create({ username, items: [] });
    }
    return inv;
  }

  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    if (!isValidItemId(itemId)) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);
    if (qty <= 0) throw new Error(`[InventoryManager] Quantité négative ou nulle interdite`);

    const itemData = getItemData(itemId);
    const inv = await InventoryManager.getInventory(username);

    // Limite de slots
    const hasItem = inv.items.find(i => i.itemId === itemId);
    if (!hasItem && inv.items.length >= MAX_INVENTORY_SLOTS)
      throw new Error(`[InventoryManager] Inventaire plein (${MAX_INVENTORY_SLOTS} slots max)`);

    if (!itemData.stackable) {
      // Non stackable : 1 seul exemplaire possible
      if (hasItem)
        throw new Error(`[InventoryManager] "${itemId}" déjà possédé (objet non stackable)`);
      inv.items.push({ itemId, quantity: 1 });
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId, quantity: 1 });
      return inv;
    } else {
      // Stackable
      if (hasItem) {
        hasItem.quantity += qty;
      } else {
        inv.items.push({ itemId, quantity: qty });
      }
      await inv.save();
      InventoryManager.events.emit("addItem", { username, itemId, quantity: qty });
      return inv;
    }
  }

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
    InventoryManager.events.emit("removeItem", { username, itemId, quantity: qty });
    return true;
  }

  static async getItemCount(username: string, itemId: string): Promise<number> {
    if (!isValidItemId(itemId)) return 0;
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    return item ? item.quantity : 0;
  }

  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number; data: any }[]> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.map(i => ({
      itemId: i.itemId,
      quantity: i.quantity,
      data: getItemData(i.itemId)
    }));
  }

  static async hasFreeSlot(username: string): Promise<boolean> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.length < MAX_INVENTORY_SLOTS;
  }

  static async clear(username: string) {
    const inv = await InventoryManager.getInventory(username);
    inv.items = [];
    await inv.save();
    InventoryManager.events.emit("clear", { username });
  }
}
