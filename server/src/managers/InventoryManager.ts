import { Inventory, IInventory } from "../models/Inventory";

export class InventoryManager {
  /**
   * Récupère l'inventaire du joueur, le crée s'il n'existe pas.
   */
  static async getInventory(username: string): Promise<IInventory> {
    let inv = await Inventory.findOne({ username });
    if (!inv) {
      inv = await Inventory.create({ username, items: [] });
    }
    return inv;
  }

  /**
   * Ajoute une quantité d'objet à l'inventaire du joueur.
   * Si l'objet existe déjà, on incrémente. Sinon, on l'ajoute.
   */
  static async addItem(username: string, itemId: string, qty: number = 1): Promise<IInventory> {
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    if (item) {
      item.quantity += qty;
    } else {
      inv.items.push({ itemId, quantity: qty });
    }
    await inv.save();
    return inv;
  }

  /**
   * Retire une quantité d'objet. Supprime l'objet si quantité <= 0.
   * Retourne true si succès, false si l'objet n'existait pas ou pas assez.
   */
  static async removeItem(username: string, itemId: string, qty: number = 1): Promise<boolean> {
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    if (!item || item.quantity < qty) {
      return false;
    }
    item.quantity -= qty;
    if (item.quantity <= 0) {
      inv.items = inv.items.filter(i => i.itemId !== itemId);
    }
    await inv.save();
    return true;
  }

  /**
   * Renvoie la quantité d'un objet possédé.
   */
  static async getItemCount(username: string, itemId: string): Promise<number> {
    const inv = await InventoryManager.getInventory(username);
    const item = inv.items.find(i => i.itemId === itemId);
    return item ? item.quantity : 0;
  }

  /**
   * Renvoie l'inventaire complet (liste des items stackés).
   */
  static async getAllItems(username: string): Promise<{ itemId: string; quantity: number }[]> {
    const inv = await InventoryManager.getInventory(username);
    return inv.items.map(i => ({ itemId: i.itemId, quantity: i.quantity }));
  }
}
