// ui.js - CORRECTION de createTeamModuleUnified() pour Singleton

async createTeamModuleUnified() {
  console.log('⚔️ [PokemonUI] Création module Team unifié (singleton-aware)...');
  
  try {
    // ✅ VÉRIFIER SINGLETON AVANT D'IMPORTER
    const { TeamModule, createTeamModule } = await import('./Team/index.js');
    
    let teamModule = TeamModule.getInstance();
    
    if (teamModule && teamModule.uiManagerState.initialized) {
      console.log('♻️ [PokemonUI] Singleton Team trouvé, préparation UIManager...');
      
      // ✅ FERMER L'UI QUI POURRAIT ÊTRE OUVERTE
      teamModule.forceCloseUI();
      
      // ✅ ASSURER QUE L'ICÔNE EST DISPONIBLE POUR UIMANAGER
      const iconReady = teamModule.ensureIconForUIManager();
      
      if (!iconReady) {
        console.warn('⚠️ [PokemonUI] Icône non disponible, recréation...');
        TeamModule.reset(); // Reset singleton
        teamModule = null; // Force recréation
      } else {
        // ✅ CONNECTER À UIMANAGER
        if (this.uiManager && this.uiManager.registerIconPosition) {
          console.log('📍 [PokemonUI] Connexion Team singleton à UIManager...');
          teamModule.connectUIManager(this.uiManager);
        }
        
        // Exposer globalement
        window.teamSystem = teamModule;
        window.teamSystemGlobal = teamModule;
        window.toggleTeam = () => teamModule.toggleTeamUI();
        window.openTeam = () => teamModule.openTeam();
        window.closeTeam = () => teamModule.closeTeam();
        window.forceCloseTeam = () => teamModule.forceCloseUI();
        
        console.log('✅ [PokemonUI] Team singleton connecté à UIManager');
        return teamModule;
      }
    }
    
    // ✅ CRÉER NOUVEAU MODULE SI SINGLETON INEXISTANT OU CASSÉ
    if (!teamModule) {
      console.log('🆕 [PokemonUI] Création nouveau module Team...');
      
      // Créer le module avec les paramètres du jeu
      teamModule = await createTeamModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      // ✅ CONNECTER À UIMANAGER IMMÉDIATEMENT
      if (this.uiManager && this.uiManager.registerIconPosition) {
        console.log('📍 [PokemonUI] Connexion nouveau Team à UIManager...');
        teamModule.connectUIManager(this.uiManager);
      } else {
        console.warn('⚠️ [PokemonUI] Fallback position manuelle');
        setTimeout(() => {
          const teamIcon = document.querySelector('#team-icon');
          if (teamIcon) {
            teamIcon.style.position = 'fixed';
            teamIcon.style.right = '20px';
            teamIcon.style.bottom = '20px';
            teamIcon.style.zIndex = '500';
          }
        }, 100);
      }
      
      // Exposer globalement pour compatibilité
      window.teamSystem = teamModule;
      window.teamSystemGlobal = teamModule;
      window.toggleTeam = () => teamModule.toggleTeamUI();
      window.openTeam = () => teamModule.openTeam();
      window.closeTeam = () => teamModule.closeTeam();
      window.forceCloseTeam = () => teamModule.forceCloseUI();
      
      console.log('✅ [PokemonUI] Nouveau module Team créé et connecté');
    }
    
    return teamModule;
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur création Team unifié:', error);
    
    // Fallback vers module vide en cas d'erreur
    return this.createEmptyWrapper('team');
  }
}
