import { Inventory, IInventory } from "../models/Inventory";
import { ITEMS } from "../utils/ItemDB";

export class InventoryManager {
  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create({ username, items: [] });
    }
    return inv;
  }

  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    // ----- CHECK: l'item existe-t-il dans la db ?
    const itemData = ITEMS[itemId];
    if (!itemData) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);

    const inv = await InventoryManager.getInventory(username);

    // ----- CHECK: stackable ou pas
    if (itemData.stackable) {
      const item = inv.items.find(i => i.itemId === itemId);
      if (item) {
        item.quantity += qty;
      } else {
        inv.items.push({ itemId, quantity: qty });
      }
    } else {
      // Non stackable : on ajoute une instance à chaque fois (ou refuser si déjà possédé)
      const already = inv.items.find(i => i.itemId === itemId);
      if (already) throw new Error(`[InventoryManager] "${itemId}" déjà possédé (non stackable)`);
      inv.items.push({ itemId, quantity: 1 });
    }

    await inv.save();
    return inv;
  }

  static async removeItem(username: string, itemId: string, qty: number = 1): Promise<boolean> {
    // ----- CHECK: l'item existe-t-il dans la db ?
    const itemData = ITEMS[itemId];
    if (!itemData) throw new Error(`[InventoryManager] Item "${itemId}" inconnu !`);

    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    if (!item || item.quantity < qty) return false;

    item.quantity -= qty;
    if (item.quantity <= 0) {
      inv.items = inv.items.filter(i => i.itemId !== itemId);
    }
    await inv.save();
    return true;
  }

  static async getItemCount(username: string, itemId: string): Promise<number> {
    // Optionnel : check existence dans ITEMS
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    return item ? item.quantity : 0;
  }

  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number }[]> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.map(i => ({ itemId: i.itemId, quantity: i.quantity }));
  }
}
