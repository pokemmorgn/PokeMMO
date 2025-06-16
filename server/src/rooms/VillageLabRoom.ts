import { Room, Client } from “@colyseus/core”;
import { PokeWorldState, Player } from “../schema/PokeWorldState”;
import { PlayerData } from “../models/PlayerData”;

export class VillageLabRoom extends Room<PokeWorldState> {
maxClients = 50; // Plus petit que le village principal

onCreate(options: any) {
this.setState(new PokeWorldState());

```
// Sauvegarde automatique toutes les 30 secondes
this.clock.setInterval(() => {
  this.saveAllPlayers();
  console.log(`[${new Date().toISOString()}] Sauvegarde automatique de tous les joueurs (VillageLab)`);
}, 30000);

this.onMessage("move", (client, data: { x: number, y: number }) => {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    player.x = data.x;
    player.y = data.y;
  }
});

this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
  console.log(`[VillageLabRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

  let spawnX = 300, spawnY = 200; // Position par défaut

  // Configuration des spawns selon la zone de destination
  if (data.targetZone === 'VillageScene') {
    spawnX = 400; // Position de sortie du lab vers le village
    spawnY = 300;
  } else if (data.targetZone === 'ProfessorOffice') {
    spawnX = 150;
    spawnY = 100;
  } else if (data.targetZone === 'LabStorage') {
    spawnX = 200;
    spawnY = 250;
  }

  const player = this.state.players.get(client.sessionId);
  if (player) {
    this.state.players.delete(client.sessionId);
    console.log(`[VillageLabRoom] Joueur ${client.sessionId} supprimé pour transition`);

    // Sauvegarde position + map cible dans la DB
    await PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnX, lastY: spawnY, lastMap: data.targetZone } }
    );
    console.log(`[VillageLabRoom] Sauvegarde position et map (${spawnX}, ${spawnY}) dans ${data.targetZone} pour ${player.name}`);
  }

  client.send("zoneChanged", {
    targetZone: data.targetZone,
    fromZone: "VillageLabScene",
    direction: data.direction,
    spawnX: spawnX,
    spawnY: spawnY
  });

  console.log(`[VillageLabRoom] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
});

// Messages spécifiques au laboratoire
this.onMessage("interactWithProfessor", (client, data) => {
  console.log(`[VillageLabRoom] ${client.sessionId} interagit avec le professeur`);
  client.send("professorDialog", {
    message: "Bonjour ! Bienvenue dans mon laboratoire !",
    options: ["Recevoir un Pokémon", "Informations", "Fermer"]
  });
});

this.onMessage("selectStarter", async (client, data: { pokemon: string }) => {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    console.log(`[VillageLabRoom] ${player.name} sélectionne ${data.pokemon} comme starter`);
    
    // Ici vous pouvez ajouter la logique pour donner le Pokémon au joueur
    client.send("starterReceived", {
      pokemon: data.pokemon,
      message: `Félicitations ! Vous avez reçu ${data.pokemon} !`
    });
  }
});

console.log("[VillageLabRoom] Room créée :", this.roomId);
```

}

async saveAllPlayers() {
try {
for (const [sessionId, player] of this.state.players) {
await PlayerData.updateOne({ username: player.name }, {
$set: { lastX: player.x, lastY: player.y, lastMap: “VillageLab” }
});
}
console.log(`[VillageLabRoom] Sauvegarde automatique : ${this.state.players.size} joueurs`);
} catch (error) {
console.error(”[VillageLabRoom] Erreur sauvegarde automatique:”, error);
}
}

async onJoin(client: Client, options: any) {
const username = options.username || “Anonymous”;

```
// Vérifier si le joueur existe déjà dans cette room
const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
if (existingPlayer) {
  const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
  if (oldSessionId) {
    this.state.players.delete(oldSessionId);
    console.log(`[VillageLabRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
  }
}

let playerData = await PlayerData.findOne({ username });
if (!playerData) {
  playerData = await PlayerData.create({ username, lastX: 300, lastY: 200, lastMap: "VillageLab" });
}

const player = new Player();
player.name = username;

// Gestion des positions de spawn
if (options.spawnX !== undefined && options.spawnY !== undefined) {
  player.x = options.spawnX;
  player.y = options.spawnY;
  console.log(`[VillageLabRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
} else {
  player.x = playerData.lastX;
  player.y = playerData.lastY;
  console.log(`[VillageLabRoom] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
}

player.map = "VillageLab";
this.state.players.set(client.sessionId, player);
console.log(`[VillageLabRoom] ${username} est entré dans le laboratoire avec sessionId: ${client.sessionId}`);

// Message de bienvenue spécifique au lab
client.send("welcomeToLab", {
  message: "Bienvenue dans le laboratoire du Professeur !",
  canReceiveStarter: true // ou logique pour vérifier si le joueur peut recevoir un starter
});
```

}

async onLeave(client: Client) {
const player = this.state.players.get(client.sessionId);
if (player) {
await PlayerData.updateOne({ username: player.name }, {
$set: { lastX: player.x, lastY: player.y, lastMap: player.map }
});
console.log(`[VillageLabRoom] ${player.name} a quitté le laboratoire (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
this.state.players.delete(client.sessionId);
}
}

onDispose() {
console.log(”[VillageLabRoom] Room fermée :”, this.roomId);
// Sauvegarder tous les joueurs avant fermeture
this.saveAllPlayers();
}
}
