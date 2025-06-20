// ===== server/src/rooms/zones/IZone.ts =====
import { Client } from "@colyseus/core";

export interface IZone {
  onPlayerEnter(client: Client): Promise<void>;
  onPlayerLeave(client: Client): void;
  onNpcInteract(client: Client, npcId: number): void;
  onQuestStart(client: Client, questId: string): void;
  getZoneData(): any;
}
