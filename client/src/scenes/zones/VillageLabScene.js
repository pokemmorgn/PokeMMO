// ===============================================
// VillageLabScene.js - Laboratoire du Professeur avec logique de transition
// ===============================================
import { BaseZoneScene } from ‘./BaseZoneScene.js’;

export class VillageLabScene extends BaseZoneScene {
constructor() {
super(‘VillageLabScene’, ‘VillageLab’);
this.transitionCooldowns = {}; // ✅ Cooldowns par zone de transition
this.professorInteracted = false; // État d’interaction avec le professeur
}

setupZoneTransitions() {
const worldsLayer = this.map.getObjectLayer(‘Worlds’);
if (worldsLayer) {
// Transition de retour vers le village
const villageExit = worldsLayer.objects.find(obj => obj.name === ‘VillageExit’);
if (villageExit) {
this.createTransitionZone(villageExit, ‘VillageScene’, ‘south’);
console.log(`🏘️ Transition vers Village trouvée !`);
}

```
  // Transition vers le bureau du professeur
  const professorOffice = worldsLayer.objects.find(obj => obj.name === 'ProfessorOffice');
  if (professorOffice) {
    this.createTransitionZone(professorOffice, 'ProfessorOfficeScene', 'north');
    console.log(`🧑‍🔬 Transition vers Bureau du Professeur trouvée !`);
  }

  // Transition vers le stockage
  const labStorage = worldsLayer.objects.find(obj => obj.name === 'LabStorage');
  if (labStorage) {
    this.createTransitionZone(labStorage, 'LabStorageScene', 'east');
    console.log(`📦 Transition vers Stockage trouvée !`);
  }

  if (!villageExit && !professorOffice && !labStorage) {
    console.warn(`⚠️ Aucune zone de transition trouvée dans le layer Worlds`);
    // Debug : Lister tous les objets du layer Worlds
    console.log("Objets disponibles dans Worlds:", worldsLayer.objects.map(obj => obj.name));
  }
}
```

}

createTransitionZone(transitionObj, targetScene, direction) {
const transitionZone = this.add.zone(
transitionObj.x + transitionObj.width / 2,
transitionObj.y + transitionObj.height / 2,
transitionObj.width,
transitionObj.height
);

```
this.physics.world.enable(transitionZone);
transitionZone.body.setAllowGravity(false);
transitionZone.body.setImmovable(true);

console.log(`🚪 Zone de transition créée vers ${targetScene} (${direction})`, transitionZone);

// ✅ Attendre que le joueur soit créé puis créer l'overlap UNE SEULE FOIS
let overlapCreated = false;

const checkPlayerInterval = this.time.addEvent({
  delay: 100,
  loop: true,
  callback: () => {
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && !overlapCreated) {
      overlapCreated = true;
      
      this.physics.add.overlap(myPlayer, transitionZone, () => {
        // ✅ Vérifier le cooldown pour éviter les transitions multiples
        const cooldownKey = `${targetScene}_${direction}`;
        if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
          console.log(`[Transition] Cooldown actif ou déjà en transition vers ${targetScene}`);
          return;
        }

        // ✅ Activer le cooldown
        this.transitionCooldowns[cooldownKey] = true;
        console.log(`[Transition] Demande transition vers ${targetScene} (${direction})`);
        
        // ✅ Désactiver temporairement la zone de transition
        transitionZone.body.enable = false;
        
        this.networkManager.requestZoneTransition(targetScene, direction);
        
        // ✅ Réactiver après un délai (au cas où la transition échoue)
        this.time.delayedCall(3000, () => {
          if (this.transitionCooldowns) {
            delete this.transitionCooldowns[cooldownKey];
          }
          if (transitionZone.body) {
            transitionZone.body.enable = true;
          }
        });
      });
      
      checkPlayerInterval.remove();
      console.log(`✅ Overlap créé pour transition vers ${targetScene}`);
    }
  },
});
```

}

positionPlayer(player) {
console.log(“🚨 DEBUT positionPlayer() dans VillageLabScene”);
const initData = this.scene.settings.data;
console.log(“🚨 initData:”, initData);

```
const spawnLayer = this.map.getObjectLayer('SpawnPoint');
if (spawnLayer) {
  let spawnPoint = null;
  
  // Choisir le bon spawn point selon la zone d'origine
  if (initData?.fromZone === 'VillageScene') {
    spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Village');
    if (spawnPoint) {
      player.x = spawnPoint.x + spawnPoint.width / 2;
      player.y = spawnPoint.y + spawnPoint.height / 2;
      console.log(`🏘️ Joueur positionné au SpawnPoint depuis Village: ${player.x}, ${player.y}`);
    }
  } else if (initData?.fromZone === 'ProfessorOfficeScene') {
    spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Office');
    if (spawnPoint) {
      player.x = spawnPoint.x + spawnPoint.width / 2;
      player.y = spawnPoint.y + spawnPoint.height / 2;
      console.log(`🧑‍🔬 Joueur positionné depuis Bureau: ${player.x}, ${player.y}`);
    }
  } else if (initData?.fromZone === 'LabStorageScene') {
    spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Storage');
    if (spawnPoint) {
      player.x = spawnPoint.x + spawnPoint.width / 2;
      player.y = spawnPoint.y + spawnPoint.height / 2;
      console.log(`📦 Joueur positionné depuis Stockage: ${player.x}, ${player.y}`);
    }
  } else {
    // Position par défaut
    spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Laboratory');
    if (spawnPoint) {
      player.x = spawnPoint.x + spawnPoint.width / 2;
      player.y = spawnPoint.y + spawnPoint.height / 2;
      console.log(`🧪 Joueur positionné au SpawnPoint_Laboratory: ${player.x}, ${player.y}`);
    } else {
      player.x = 300;
      player.y = 200;
      console.log(`⚠️ Pas de SpawnPoint_Laboratory trouvé, position par défaut: ${player.x}, ${player.y}`);
    }
  }
} else {
  // Fallback sans layer SpawnPoint
  if (initData?.fromZone === 'VillageScene') {
    player.x = 300;
    player.y = 400;
    console.log(`🏘️ Pas de SpawnLayer, position depuis Village: ${player.x}, ${player.y}`);
  } else if (initData?.fromZone === 'ProfessorOfficeScene') {
    player.x = 150;
    player.y = 200;
    console.log(`🧑‍🔬 Pas de SpawnLayer, position depuis Bureau: ${player.x}, ${player.y}`);
  } else if (initData?.fromZone === 'LabStorageScene') {
    player.x = 200;
    player.y = 300;
    console.log(`📦 Pas de SpawnLayer, position depuis Stockage: ${player.x}, ${player.y}`);
  } else {
    player.x = 300;
    player.y = 200;
    console.log(`🧪 Pas de SpawnLayer, position par défaut: ${player.x}, ${player.y}`);
  }
}

if (player.indicator) {
  player.indicator.x = player.x;
  player.indicator.y = player.y - 32;
}

if (this.networkManager) {
  this.networkManager.sendMove(player.x, player.y);
}
console.log("🚨 FIN positionPlayer()");
```

}

create() {
console.log(“🚨 DEBUT VillageLabScene.create()”);
super.create();

```
this.add
  .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "E" to interact', {
    font: '18px monospace',
    fill: '#000000',
    padding: { x: 20, y: 10 },
    backgroundColor: '#ffffff',
  })
  .setScrollFactor(0)
  .setDepth(30);

this.setupLabEvents();
this.setupNPCs();
this.setupInteractiveObjects();

console.log("🚨 FIN VillageLabScene.create()");
```

}

setupLabEvents() {
this.time.delayedCall(1000, () => {
console.log(“🧪 Bienvenue au Laboratoire Pokémon !”);
if (this.infoText) {
this.infoText.setText(‘PokeWorld MMO\nLaboratoire Pokémon\nConnected!’);
}
});

```
// Écouter les messages spécifiques au laboratoire
if (this.networkManager && this.networkManager.room) {
  this.networkManager.room.onMessage("professorDialog", (data) => {
    this.showProfessorDialog(data);
  });

  this.networkManager.room.onMessage("starterReceived", (data) => {
    this.showStarterReceived(data);
  });

  this.networkManager.room.onMessage("welcomeToLab", (data) => {
    this.showWelcomeMessage(data);
  });
}
```

}

setupNPCs() {
const npcLayer = this.map.getObjectLayer(‘NPCs’);
if (npcLayer) {
npcLayer.objects.forEach(npcObj => {
this.createNPC(npcObj);
});
}
}

setupInteractiveObjects() {
// Configuration des objets interactifs spécifiques au lab
const interactiveLayer = this.map.getObjectLayer(‘Interactive’);
if (interactiveLayer) {
interactiveLayer.objects.forEach(obj => {
this.createInteractiveObject(obj);
});
}

```
// Touches d'interaction
this.input.keyboard.on('keydown-E', () => {
  this.handleInteraction();
});
```

}

createNPC(npcData) {
const npc = this.add.rectangle(
npcData.x + npcData.width / 2,
npcData.y + npcData.height / 2,
npcData.width,
npcData.height,
npcData.name === ‘Professeur’ ? 0x2ecc71 : 0x3498db // Vert pour le professeur
);

```
const npcName = this.add.text(
  npc.x,
  npc.y - 30,
  npcData.name || 'NPC',
  {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: { x: 4, y: 2 },
  }
).setOrigin(0.5);

npc.setInteractive();
npc.on('pointerdown', () => {
  this.interactWithNPC(npcData.name || 'Assistant');
});

// Stocker pour l'interaction avec E
npc.npcData = npcData;
if (!this.npcs) this.npcs = [];
this.npcs.push(npc);

console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`, npc);
```

}

createInteractiveObject(objData) {
const obj = this.add.rectangle(
objData.x + objData.width / 2,
objData.y + objData.height / 2,
objData.width,
objData.height,
0xf39c12 // Orange pour les objets interactifs
);

```
obj.setAlpha(0.5); // Semi-transparent
obj.objData = objData;

if (!this.interactiveObjects) this.interactiveObjects = [];
this.interactiveObjects.push(obj);

console.log(`🔧 Objet interactif créé : ${objData.name}`, obj);
```

}

handleInteraction() {
const myPlayer = this.playerManager.getMyPlayer();
if (!myPlayer) return;

```
// Vérifier interaction avec NPCs
if (this.npcs) {
  for (const npc of this.npcs) {
    const distance = Phaser.Math.Distance.Between(
      myPlayer.x, myPlayer.y,
      npc.x, npc.y
    );
    
    if (distance < 50) { // Distance d'interaction
      this.interactWithNPC(npc.npcData.name);
      return;
    }
  }
}

// Vérifier interaction avec objets
if (this.interactiveObjects) {
  for (const obj of this.interactiveObjects) {
    const distance = Phaser.Math.Distance.Between(
      myPlayer.x, myPlayer.y,
      obj.x, obj.y
    );
    
    if (distance < 50) {
      this.interactWithObject(obj.objData.name);
      return;
    }
  }
}
```

}

interactWithNPC(npcName) {
console.log(`💬 Interaction avec ${npcName}`);

```
if (npcName === 'Professeur') {
  // Envoyer message au serveur pour interaction avec le professeur
  if (this.networkManager && this.networkManager.room) {
    this.networkManager.room.send("interactWithProfessor", {});
  }
} else {
  // Dialogues pour les autres NPCs
  const dialogues = {
    Assistant: "Je m'occupe de l'entretien du laboratoire.",
    Chercheur: "Nous étudions les Pokémon ici. Fascinant !",
    Stagiaire: "J'apprends encore... C'est compliqué !",
  };
  const message = dialogues[npcName] || 'Bonjour ! Je travaille ici.';
  this.showSimpleDialog(npcName, message);
}
```

}

interactWithObject(objName) {
console.log(`🔧 Interaction avec ${objName}`);

```
const interactions = {
  Ordinateur: "L'ordinateur affiche des données sur les Pokémon.",
  Machine: "Cette machine analyse les Pokéball.",
  Bibliothèque: "Des livres sur les Pokémon... Très instructif !",
  Microscope: "Un microscope high-tech pour étudier l'ADN Pokémon.",
};

const message = interactions[objName] || "Vous examinez l'objet.";
this.showSimpleDialog("Système", message);
```

}

showProfessorDialog(data) {
console.log(“🧑‍🔬 Dialog du professeur:”, data);

```
// Créer une interface de dialogue plus complexe
const dialogBg = this.add.rectangle(
  this.cameras.main.centerX,
  this.cameras.main.centerY,
  400,
  200,
  0x000000,
  0.8
).setScrollFactor(0).setDepth(2000);

const dialogText = this.add.text(
  this.cameras.main.centerX,
  this.cameras.main.centerY - 50,
  `Professeur: "${data.message}"`,
  {
    fontSize: '16px',
    fontFamily: 'monospace',
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: 350 }
  }
).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

// Boutons d'options
if (data.options) {
  data.options.forEach((option, index) => {
    const button = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20 + (index * 30),
      `${index + 1}. ${option}`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#00ff00',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    button.setInteractive();
    button.on('pointerdown', () => {
      this.handleProfessorChoice(option);
      dialogBg.destroy();
      dialogText.destroy();
      button.destroy();
    });
  });
}

// Auto-fermeture après 10 secondes
this.time.delayedCall(10000, () => {
  if (dialogBg) dialogBg.destroy();
  if (dialogText) dialogText.destroy();
});
```

}

handleProfessorChoice(choice) {
if (choice === “Recevoir un Pokémon”) {
this.showStarterSelection();
} else if (choice === “Informations”) {
this.showSimpleDialog(“Professeur”, “Je suis le Professeur de ce laboratoire. Je donne leur premier Pokémon aux nouveaux dresseurs !”);
}
}

showStarterSelection() {
const starters = [‘Bulbasaur’, ‘Charmander’, ‘Squirtle’];

```
const selectionBg = this.add.rectangle(
  this.cameras.main.centerX,
  this.cameras.main.centerY,
  500,
  250,
  0x0066cc,
  0.9
).setScrollFactor(0).setDepth(2000);

this.add.text(
  this.cameras.main.centerX,
  this.cameras.main.centerY - 80,
  'Choisissez votre Pokémon de départ:',
  {
    fontSize: '18px',
    fontFamily: 'monospace',
    color: '#ffffff',
    align: 'center'
  }
).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

starters.forEach((pokemon, index) => {
  const button = this.add.text(
    this.cameras.main.centerX,
    this.cameras.main.centerY - 20 + (index * 40),
    pokemon,
    {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 200, 0, 0.8)',
      padding: { x: 15, y: 8 }
    }
  ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

  button.setInteractive();
  button.on('pointerdown', () => {
    if (this.networkManager && this.networkManager.room) {
      this.networkManager.room.send("selectStarter", { pokemon });
    }
    selectionBg.destroy();
    button.destroy();
  });
});
```

}

showStarterReceived(data) {
console.log(“🎉 Starter reçu:”, data);

```
const celebrationText = this.add.text(
  this.cameras.main.centerX,
  this.cameras.main.centerY,
  data.message,
  {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: '#ffff00',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: { x: 20, y: 15 },
    align: 'center'
  }
).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

this.time.delayedCall(4000, () => {
  celebrationText.destroy();
});
```

}

showWelcomeMessage(data) {
if (data.message) {
this.showSimpleDialog(“Laboratoire”, data.message);
}
}

showSimpleDialog(speaker, message) {
const dialogueBox = this.add
.text(
this.cameras.main.centerX,
this.cameras.main.centerY + 100,
`${speaker}: "${message}"`,
{
fontSize: ‘14px’,
fontFamily: ‘monospace’,
color: ‘#ffffff’,
backgroundColor: ‘rgba(0, 0, 0, 0.8)’,
padding: { x: 10, y: 8 },
wordWrap: { width: 350 },
}
)
.setOrigin(0.5)
.setScrollFactor(0)
.setDepth(2000);

```
this.time.delayedCall(3000, () => {
  dialogueBox.destroy();
});
```

}

// ✅ Nettoyage des cooldowns lors de la destruction de la scène
cleanup() {
this.transitionCooldowns = {};
this.npcs = [];
this.interactiveObjects = [];
super.cleanup();
}
}
