import { Schema, model, Document } from "mongoose";

export interface IInventoryItem {
  itemId: string;     // ex: "poke_ball", "potion"
  quantity: number;
}

export interface IInventory extends Document {
  username: string;
  items: IInventoryItem[];
  medicine: IInventoryItem[];
  balls: IInventoryItem[];
  berries: IInventoryItem[];
  key_items: IInventoryItem[];
  tms: IInventoryItem[];
  battle_items: IInventoryItem[];
  valuables: IInventoryItem[];
  held_items: IInventoryItem[];
  [pocket: string]: any;
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
