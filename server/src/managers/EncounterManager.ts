// ===========================================================================================
// 1. CORRECTION server/src/managers/EncounterManager.ts - EXPORTS SIMPLIFIÉS
// ===========================================================================================

// ✅ REMPLACER LES LIGNES 305-306 PAR UNE SEULE LIGNE:
export { ServerEncounterManager as EncounterManager };

// ✅ SUPPRIMER COMPLÈTEMENT:
// export { ServerEncounterManager };
// export type { WildPokemon, EncounterData, EncounterTable };

// ===========================================================================================
// 2. CORRECTION server/src/rooms/WorldRoom.ts - MÉTHODE INEXISTANTE
// ===========================================================================================

// ✅ Dans handleEncounterCheck() ligne 1608, REMPLACER:
// const wildPokemon = await this.encounterManager.checkForEncounter(

// PAR:
const wildPokemon = await this.serverEncounterManager.validateAndGenerateEncounter(
  client.sessionId,
  data.zone,
  data.x,
  data.y,
  timeOfDay as 'day' | 'night',
  weather as 'clear' | 'rain'
);

// ===========================================================================================
// 3. VERSION CORRIGÉE COMPLÈTE DE handleEncounterCheck()
// ===========================================================================================

private async handleEncounterCheck(client: Client, data: {
  zone: string;
  method: 'grass' | 'fishing';
  x: number;
  y: number;
}) {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  console.log(`🌿 Vérification de rencontre: ${data.zone} (${data.method}) à (${data.x}, ${data.y})`);

  // Obtenir les conditions actuelles depuis TimeWeatherService
  const conditions = this.getCurrentTimeInfo();
  const timeOfDay = conditions.isDayTime ? 'day' : 'night';
  const weather = conditions.weather === 'rain' ? 'rain' : 'clear';

  // ✅ UTILISER LA BONNE MÉTHODE validateAndGenerateEncounter
  const wildPokemon = await this.serverEncounterManager.validateAndGenerateEncounter(
    client.sessionId,
    data.zone,
    data.x,
    data.y,
    timeOfDay as 'day' | 'night',
    weather as 'clear' | 'rain'
  );

  if (wildPokemon) {
    console.log(`⚔️ Rencontre déclenchée: ${wildPokemon.pokemonId} niveau ${wildPokemon.level}`);
    
    // Envoyer l'événement de rencontre au client
    client.send("encounterTriggered", {
      wildPokemon: {
        pokemonId: wildPokemon.pokemonId,
        level: wildPokemon.level,
        shiny: wildPokemon.shiny,
        gender: wildPokemon.gender
      },
      location: data.zone,
      method: data.method,
      conditions: {
        timeOfDay,
        weather
      }
    });

    console.log(`📤 Rencontre envoyée à ${client.sessionId}`);
  }
}

// ===========================================================================================
// 4. PROPRIÉTÉS MANQUANTES DANS WorldRoom.ts
// ===========================================================================================

// ✅ Dans la classe WorldRoom, S'ASSURER QUE CES PROPRIÉTÉS SONT DÉCLARÉES:
export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  private npcManagers: Map<string, NpcManager> = new Map();
  private transitionService!: TransitionService;
  private timeWeatherService!: TimeWeatherService;
  private serverEncounterManager!: ServerEncounterManager; // ✅ CETTE LIGNE DOIT EXISTER
  private shopManager!: ShopManager;
  private positionSaver = PositionSaverService.getInstance();
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private teamHandlers!: TeamHandlers;

  // ... reste de la classe
}

// ===========================================================================================
// 5. INITIALISATION DANS setupTimeWeatherCommands()
// ===========================================================================================

// ✅ DANS setupTimeWeatherCommands(), VÉRIFIER CET ORDRE:
private setupTimeWeatherCommands() {
  // Forcer l'heure (pour les tests)
  this.onMessage("setTime", (client, data: { hour: number, minute?: number }) => {
    console.log(`🕐 [ADMIN] ${client.sessionId} force l'heure: ${data.hour}:${data.minute || 0}`);
    
    if (this.timeWeatherService) {
      this.timeWeatherService.forceTime(data.hour, data.minute || 0);
    }
  });

  // ✅ INITIALISER LE SERVER ENCOUNTER MANAGER ICI
  this.serverEncounterManager = new ServerEncounterManager();
  console.log(`✅ ServerEncounterManager initialisé`);
  
  this.onMessage("setWeather", (client, data: { weather: string }) => {
    console.log(`🌦️ [ADMIN] ${client.sessionId} force la météo: ${data.weather}`);
    
    if (this.timeWeatherService) {
      this.timeWeatherService.forceWeather(data.weather);
    }
  });

  // Initialiser le ShopManager
  this.shopManager = new ShopManager();
  console.log(`✅ ShopManager initialisé`);

  // ... reste des handlers
}

// ===========================================================================================
// 6. VERSION FINALE DE EncounterManager.ts (FIN DE FICHIER)
// ===========================================================================================

// ✅ LA FIN DU FICHIER EncounterManager.ts DOIT ÊTRE EXACTEMENT:
  // ✅ Nettoyage périodique
  cleanupCooldowns(): void {
    const now = Date.now();
    const cutoff = now - (this.ENCOUNTER_COOLDOWN * 10);
    
    for (const [playerId, lastTime] of this.playerCooldowns.entries()) {
      if (lastTime < cutoff) {
        this.playerCooldowns.delete(playerId);
      }
    }
  }
}

// ✅ UN SEUL EXPORT - PAS DE CONFLITS
export { ServerEncounterManager as EncounterManager };

// ===========================================================================================
// 7. TEST RAPIDE POUR VÉRIFIER
// ===========================================================================================

/*
✅ VÉRIFICATIONS À FAIRE:

1. Dans EncounterManager.ts:
   - UNE SEULE ligne export à la fin
   - export class ServerEncounterManager { ... } (ligne 47)
   - export { ServerEncounterManager as EncounterManager }; (dernière ligne)

2. Dans WorldRoom.ts:
   - private serverEncounterManager!: ServerEncounterManager; (déclaré)
   - this.serverEncounterManager = new ServerEncounterManager(); (initialisé)
   - this.serverEncounterManager.validateAndGenerateEncounter(...) (utilisé)

3. Compilation:
   - npm run build (doit passer sans erreur)
   - npm run dev (doit démarrer sans erreur)

4. Test en jeu:
   - Marcher sur l'herbe
   - Voir les logs de rencontre dans la console serveur
*/

// ===========================================================================================
// 8. SI PROBLÈME PERSISTE - SOLUTION ALTERNATIVE
// ===========================================================================================

// ✅ SI LES ERREURS PERSISTENT, UTILISER CETTE VERSION ULTRA-SIMPLE:

// Dans EncounterManager.ts, SUPPRIMER tous les exports et ajouter seulement:
export default ServerEncounterManager;

// Dans WorldRoom.ts, CHANGER l'import:
import ServerEncounterManager from "../managers/EncounterManager";

// Dans BattleRoom.ts et battleRoutes.ts, CHANGER l'import:
import ServerEncounterManager from '../managers/EncounterManager';

// Cette approche évite tous les conflits d'exports nommés.
