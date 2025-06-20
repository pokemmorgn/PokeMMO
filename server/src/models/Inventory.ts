import { Schema, model, Document } from "mongoose";

export interface IInventoryItem {
  itemId: string;     // ex: "poke_ball", "potion"
  quantity: number;
}

export interface IInventory extends Document {
  username: string;
  items: IInventoryItem[];         // Objets généraux/utilitaires/PP+, Repousse, Corde Sortie, etc.
  medicine: IInventoryItem[];      // Soins purs (Potions, Rappel, etc.)
  balls: IInventoryItem[];         // Poké Balls
  berries: IInventoryItem[];       // Baies
  key_items: IInventoryItem[];     // Objets clés/scénario (Vélo, Flûte, Fossile…)
  tms: IInventoryItem[];           // CT/CS
  battle_items: IInventoryItem[];  // X Attaque, X Défense, Poudre Soin, etc.
  valuables: IInventoryItem[];     // Objets à vendre (Pépite, Perle…)
  held_items: IInventoryItem[];    // Objets à tenir (Scope Lens, Restes…)
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
});

const InventorySchema = new Schema<IInventory>({
  username: { type: String, required: true, unique: true },
  items: { type: [InventoryItemSchema], default: [] },
  medicine: { type: [InventoryItemSchema], default: [] },
  balls: { type: [InventoryItemSchema], default: [] },
  berries: { type: [InventoryItemSchema], default: [] },
  key_items: { type: [InventoryItemSchema], default: [] },
  tms: { type: [InventoryItemSchema], default: [] },
  battle_items: { type: [InventoryItemSchema], default: [] },
  valuables: { type: [InventoryItemSchema], default: [] },
  held_items: { type: [InventoryItemSchema], default: [] }
});

export const Inventory = model<IInventory>("Inventory", InventorySchema);
