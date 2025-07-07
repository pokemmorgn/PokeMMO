// ===== PROBLÈME IDENTIFIÉ =====
// Dans TeamUIIntegration.js ligne ~77-85, la factory function est incorrecte :

// ❌ PROBLÈME - Factory définie mais jamais utilisée :
await this.uiManager.registerModule('teamUI', {
  factory: async (...args) => {
    console.log('🏭 Creating TeamUI instance...');
    
    // ❌ BUG : Cette factory function est enregistrée mais jamais appelée !
    this.teamUI = new TeamUI(this.gameRoom);
    await this.waitForInitialization();
    
    console.log('✅ TeamUI instance created and initialized');
    return this.teamUI;
  },
  // ... config
});

// ===== SOLUTION 1 : CORRIGER LA FACTORY FUNCTION =====

// ✅ FIX : Dans client/src/components/TeamUIIntegration.js
// Remplacer la méthode registerModule de teamUI par :

await this.uiManager.registerModule('teamUI', {
  // ✅ FACTORY CORRIGÉE - Stocker la factory correctement
  factory: async (...args) => {
    console.log('🏭 [UIManager] Creating TeamUI instance via factory...');
    
    // ✅ Créer l'instance TeamUI
    const teamUIInstance = new TeamUI(this.gameRoom);
    
    // ✅ Attendre l'initialisation complète
    await this.waitForInitialization(teamUIInstance);
    
    // ✅ Stocker la référence dans l'intégration
    this.teamUI = teamUIInstance;
    
    console.log('✅ [UIManager] TeamUI instance created and initialized');
    return teamUIInstance;
  },

  dependencies: [],
  
  defaultState: {
    visible: false,
    enabled: true,
    initialized: false
  },

  priority: 50,

  layout: {
    type: 'overlay',
    position: 'center',
    anchor: 'center',
    offset: { x: 0, y: 0 },
    zIndex: 1000,
    order: 0,
    spacing: 0,
    responsive: true
  },

  // ... reste de la config inchangée
});

// ===== SOLUTION 2 : CORRIGER waitForInitialization =====

// ✅ FIX : Mettre à jour la méthode waitForInitialization
async waitForInitialization(teamUIInstance = null) {
  const instance = teamUIInstance || this.teamUI;
  
  if (instance && instance.isVisible !== undefined) {
    // L'instance est déjà initialisée
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TeamUI initialization timeout'));
    }, 10000); // 10 secondes de timeout

    let checkCount = 0;
    const maxChecks = 100;
    
    const checkInitialization = () => {
      checkCount++;
      
      // Vérifier si l'instance est prête (indicateur : méthodes show/hide existent)
      if (instance && typeof instance.show === 'function' && typeof instance.hide === 'function') {
        clearTimeout(timeout);
        console.log(`✅ [UIManager] TeamUI initialisé après ${checkCount} vérifications`);
        resolve();
      } else if (checkCount >= maxChecks) {
        clearTimeout(timeout);
        reject(new Error(`TeamUI initialization failed after ${maxChecks} checks`));
      } else {
        setTimeout(checkInitialization, 100);
      }
    };

    checkInitialization();
  });
}

// ===== SOLUTION 3 : CORRIGER L'INITIALISATION =====

// ✅ FIX : Dans la méthode initialize() de TeamUIIntegration
async initialize() {
  if (!this.initialized) {
    throw new Error('TeamUI modules not registered. Call register() first.');
  }

  try {
    console.log('🚀 Initializing TeamUI modules...');

    // ✅ ÉTAPE 1 : Initialiser TeamUI via UIManager
    console.log('🎯 [UIManager] Initializing teamUI module...');
    const teamUIInstance = await this.uiManager.initializeModule('teamUI');
    
    if (!teamUIInstance) {
      throw new Error('Failed to initialize TeamUI instance via UIManager');
    }
    
    console.log('✅ [UIManager] TeamUI instance created:', !!teamUIInstance);

    // ✅ ÉTAPE 2 : Initialiser TeamIcon (qui dépend de TeamUI)
    console.log('🎯 [UIManager] Initializing teamIcon module...');
    const teamIconInstance = await this.uiManager.initializeModule('teamIcon');
    
    if (!teamIconInstance) {
      throw new Error('Failed to initialize TeamIcon instance via UIManager');
    }
    
    console.log('✅ [UIManager] TeamIcon instance created:', !!teamIconInstance);

    // ✅ ÉTAPE 3 : Configuration post-initialisation
    await this.setupPostInitialization();

    console.log('✅ TeamUI modules initialized successfully via UIManager');
    return { teamUI: teamUIInstance, teamIcon: teamIconInstance };

  } catch (error) {
    console.error('❌ Failed to initialize TeamUI modules:', error);
    throw error;
  }
}

// ===== SOLUTION 4 : DEBUGGING =====

// ✅ Ajouter une méthode de debug pour vérifier l'état
debugTeamUIRegistration() {
  console.log('🔍 === DEBUG TEAM UI REGISTRATION ===');
  
  const teamUIModule = this.uiManager.getModule('teamUI');
  const teamIconModule = this.uiManager.getModule('teamIcon');
  
  console.log('📊 TeamUI Module:', {
    registered: !!teamUIModule,
    hasFactory: !!(teamUIModule?.factory),
    factoryType: typeof teamUIModule?.factory,
    instance: !!teamUIModule?.instance,
    state: this.uiManager.getModuleState('teamUI')
  });
  
  console.log('📊 TeamIcon Module:', {
    registered: !!teamIconModule,
    hasFactory: !!(teamIconModule?.factory),
    factoryType: typeof teamIconModule?.factory,
    instance: !!teamIconModule?.instance,
    state: this.uiManager.getModuleState('teamIcon')
  });
  
  console.log('📊 Integration State:', {
    initialized: this.initialized,
    teamUIRef: !!this.teamUI,
    teamIconRef: !!this.teamIcon
  });
}

// ===== UTILISATION =====

// ✅ Pour tester la correction dans la console :
window.debugTeamUIInit = function() {
  if (window.teamUIIntegration) {
    window.teamUIIntegration.debugTeamUIRegistration();
  } else {
    console.error('❌ TeamUIIntegration non disponible');
  }
};

// ✅ Pour forcer la réinitialisation :
window.forceTeamUIInit = async function() {
  if (window.teamUIIntegration && window.pokemonUISystem) {
    try {
      console.log('🔄 Force réinitialisation TeamUI...');
      
      // Nettoyer l'ancien
      if (window.teamUIIntegration.teamUI) {
        window.teamUIIntegration.teamUI.destroy?.();
      }
      
      // Réinitialiser
      const result = await window.teamUIIntegration.initialize();
      console.log('✅ TeamUI réinitialisé:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur réinitialisation:', error);
      return null;
    }
  } else {
    console.error('❌ Prérequis manquants pour réinitialisation');
    return null;
  }
};

console.log('🔧 === CORRECTIONS TEAM UI INTEGRATION ===');
console.log('1. ✅ Factory function corrigée');
console.log('2. ✅ Méthode waitForInitialization améliorée');
console.log('3. ✅ Initialisation via UIManager corrigée'); 
console.log('4. ✅ Méthodes de debug ajoutées');
console.log('');
console.log('🧪 UTILISATION:');
console.log('• window.debugTeamUIInit() - Debug registration');
console.log('• window.forceTeamUIInit() - Force réinit');
console.log('• Dans TeamUIIntegration.js, appliquer les corrections ci-dessus');
