import { Schema, model, Document } from "mongoose";

export interface IInventoryItem {
  itemId: string;     // ex: "poke_ball", "potion"
  quantity: number;
}

export interface IInventory extends Document {
  username: string;
  items: IInventoryItem[];
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
});

const InventorySchema = new Schema<IInventory>({
  username: { type: String, required: true, unique: true },
  items: { type: [InventoryItemSchema], default: [] },
});

export const Inventory = model<IInventory>("Inventory", InventorySchema);
