import { Client } from "@colyseus/core";
import { PlayerData } from "../models/PlayerData";
import { BaseRoom } from "../rooms/BaseRoom";
import { Player } from "../schema/PokeWorldState";
import fs from "fs";
import path from "path";

// Cache pour ne pas relire à chaque fois
const mapCache = {};

/**
 * Normalise un nom de map ("BeachRoom", "BeachScene", "beach") => "beach"
 */
function normalizeMapName(name) {
  return name.toLowerCase().replace(/room|scene/gi, '');
}

/**
 * Charge une map TMJ depuis le dossier maps (cache si déjà lue)
 */
function loadMap(mapName) {
  const cleanName = normalizeMapName(mapName);
  if (!mapCache[cleanName]) {
    // Attention, adapte le chemin si besoin !
    const mapPath = path.join(__dirname, "../assets/maps/", `${cleanName}.tmj`);
    if (!fs.existsSync(mapPath)) {
      throw new Error(`[TransitionController] Map manquante: ${mapPath}`);
    }
    mapCache[cleanName] = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  }
  return mapCache[cleanName];
}

/**
 * Récupère un objet dans le layer Worlds selon son nom (ou propriété custom)
 */
function findWorldObject(mapName, objectName) {
  const mapData = loadMap(mapName);
  const worldsLayer = mapData.layers.find(
    l => l.name === "Worlds" && l.type === "objectgroup"
  );
  if (!worldsLayer) return null;
  // Peut adapter ici si tu veux chercher par propriété au lieu de name
  return worldsLayer.objects.find(obj => obj.name === objectName);
}

/**
 * Cherche une propriété personnalisée d'un objet Tiled (array → value)
 */
function getProperty(obj, key) {
  if (!obj.properties) return undefined;
  const prop = obj.properties.find(p => p.name === key);
  return prop?.value;
}

type TransitionData = {
  targetSpawn?: string; // Côté client, tu peux lui envoyer juste le nom de la sortie (ex: "Road_1")
};

export class TransitionController {
  room: BaseRoom;

  constructor(room: BaseRoom) {
    this.room = room;
  }

  async handleTransition(client: Client, data: TransitionData) {
    const player = this.room.state.players.get(client.sessionId) as Player | undefined;

    if (!player || (player as any).isTransitioning) {
      console.warn(`[TransitionController] Transition ignorée : déjà en cours pour ${player?.name}`);
      return;
    }

    (player as any).isTransitioning = true;

    // On récupère l'objet de sortie dans la map actuelle, layer Worlds
    const currentMapName = normalizeMapName(this.room.mapName);
    const exitName = data.targetSpawn;
    const exitObj = findWorldObject(currentMapName, exitName);

    if (!exitObj) {
      console.warn(`[TransitionController] DENIED: sortie '${exitName}' absente de la map '${currentMapName}'`);
      client.send("transitionDenied", { reason: "Sortie introuvable côté serveur" });
      (player as any).isTransitioning = false;
      return;
    }

    // Propriétés custom de l'objet (définies dans Tiled !)
    const targetZone = getProperty(exitObj, "targetZone");
    const targetSpawn = getProperty(exitObj, "targetSpawn");

    if (!targetZone || !targetSpawn) {
      console.warn(`[TransitionController] DENIED: targetZone/targetSpawn manquant sur la sortie '${exitName}'`);
      client.send("transitionDenied", { reason: "Propriétés de transition absentes" });
      (player as any).isTransitioning = false;
      return;
    }

    // On cherche l'objet d'arrivée dans la map cible (targetZone)
    const entryObj = findWorldObject(normalizeMapName(targetZone), targetSpawn);

    if (!entryObj) {
      console.warn(`[TransitionController] DENIED: point d'arrivée '${targetSpawn}' absent de '${targetZone}'`);
      client.send("transitionDenied", { reason: "Entrée introuvable dans la map cible" });
      (player as any).isTransitioning = false;
      return;
    }

    // Utilise les coordonnées exactes du point d'entrée
    const spawnX = entryObj.x;
    const spawnY = entryObj.y;

    // Ici tu peux aussi prendre des propriétés custom sur le point d'entrée (genre direction)

    console.log(`[TransitionController] Transition ${player.name} (${currentMapName}) -> ${targetZone} via '${exitName}' (${spawnX},${spawnY})`);

    this.room.state.players.delete(client.sessionId);
    this.room.movementController?.resetPlayer?.(client.sessionId);

    // Mets à jour la position dans la base Mongo
    await PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnX, lastY: spawnY, lastMap: targetZone } }
    );

    // Envoie au client les infos pour charger la nouvelle zone
    client.send("zoneChanged", {
      targetZone: targetZone,
      fromZone: this.room.mapName,
      spawnX: spawnX,
      spawnY: spawnY,
      entryName: targetSpawn // optionnel pour debug
    });

    console.log(`[TransitionController] Transition terminée pour ${player.name}`);
  }
}