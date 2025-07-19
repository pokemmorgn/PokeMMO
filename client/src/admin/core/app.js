/**
 * Application principale de l'Admin Panel
 * Gère l'authentification, la navigation et le chargement des modules
 */
class AdminApp {
    constructor() {
        console.log('🚀 [AdminApp] Initialisation...');
        
        this.token = sessionStorage.getItem('sessionToken');
        this.currentModule = null;
        this.loadedModules = new Map();
        this.userInfo = null;
        
        // Instances des composants
        this.api = new AdminAPI(this.token);
        this.notifications = new NotificationManager();
        this.modal = new ModalManager();
        
        if (!this.token) {
            console.log('❌ [AdminApp] Aucun token, redirection vers /auth');
            window.location.href = '/auth';
            return;
        }
        
        this.init();
    }

    async init() {
        try {
            console.log('🔄 [AdminApp] Vérification de l\'authentification...');
            
            // Vérifier l'authentification
            await this.verifyAuth();
            
            // Setup des event listeners
            this.setupEventListeners();
            
            // Charger le module par défaut (dashboard)
            await this.loadModule('dashboard');
            
            console.log('✅ [AdminApp] Application initialisée avec succès');
        } catch (error) {
            console.error('❌ [AdminApp] Erreur initialisation:', error);
            this.notifications.error('Erreur d\'authentification: ' + error.message);
            setTimeout(() => window.location.href = '/auth', 2000);
        }
    }

    async verifyAuth() {
        try {
            const response = await this.api.call('/verify');
            this.userInfo = response;
            
            // Mettre à jour l'interface
            document.getElementById('currentUser').textContent = response.user;
            document.getElementById('clientInfo').textContent = 
                `IP: ${response.clientInfo.ip} ${response.clientInfo.isLocalhost ? '(localhost)' : ''}`;
                
        } catch (error) {
            throw new Error('Token invalide ou expiré');
        }
    }

    setupEventListeners() {
        // Navigation par onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const moduleName = btn.dataset.module;
                
                if (btn.classList.contains('loading')) return;
                
                await this.loadModule(moduleName);
            });
        });

        // Gestion des raccourcis clavier
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Prévenir la fermeture accidentelle
        window.addEventListener('beforeunload', (e) => {
            if (this.currentModule && this.currentModule.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Des modifications non sauvegardées seront perdues.';
                return e.returnValue;
            }
        });
    }

    async loadModule(moduleName) {
        console.log(`📦 [AdminApp] Chargement du module: ${moduleName}`);
        
        try {
            // Afficher le loader
            this.showGlobalLoading(true);
            
            // Mettre à jour la navigation
            this.updateNavigation(moduleName);
            
            // Décharger le module actuel si nécessaire
            if (this.currentModule && this.currentModule.deactivate) {
                await this.currentModule.deactivate();
            }
            
            // Charger le module s'il n'est pas déjà en cache
            if (!this.loadedModules.has(moduleName)) {
                const ModuleClass = await this.importModule(moduleName);
                const moduleInstance = new ModuleClass(this.api, this.notifications, this.modal);
                this.loadedModules.set(moduleName, moduleInstance);
            }
            
            // Activer le module
            this.currentModule = this.loadedModules.get(moduleName);
            await this.currentModule.activate();
            
            console.log(`✅ [AdminApp] Module ${moduleName} chargé avec succès`);
            
        } catch (error) {
            console.error(`❌ [AdminApp] Erreur chargement module ${moduleName}:`, error);
            this.notifications.error(`Erreur de chargement du module ${moduleName}: ${error.message}`);
        } finally {
            this.showGlobalLoading(false);
        }
    }

    async importModule(moduleName) {
        // Mapping des modules
        const moduleMap = {
            'dashboard': () => import('../modules/dashboard.js').then(m => m.DashboardModule),
            'players': () => import('../modules/players.js').then(m => m.PlayersModule),
            'quests': () => import('../modules/quests.js').then(m => m.QuestsModule),
            'logs': () => import('../modules/logs.js').then(m => m.LogsModule),
            'tools': () => import('../modules/tools.js').then(m => m.ToolsModule)
        };

        if (!moduleMap[moduleName]) {
            throw new Error(`Module ${moduleName} introuvable`);
        }

        return await moduleMap[moduleName]();
    }

    updateNavigation(activeModule) {
        // Mettre à jour les boutons de navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.module === activeModule;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('loading', false);
        });
        
        // Marquer le bouton actuel comme loading temporairement
        const activeBtn = document.querySelector(`[data-module="${activeModule}"]`);
        if (activeBtn) {
            activeBtn.classList.add('loading');
        }
    }

    showGlobalLoading(show) {
        const loader = document.getElementById('global-loading');
        loader.style.display = show ? 'flex' : 'none';
        
        // Retirer le loading du bouton après affichage
        if (!show) {
            setTimeout(() => {
                document.querySelectorAll('.tab-btn.loading').forEach(btn => {
                    btn.classList.remove('loading');
                });
            }, 100);
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl + 1-5 pour navigation rapide
        if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const modules = ['dashboard', 'players', 'quests', 'logs', 'tools'];
            const moduleIndex = parseInt(e.key) - 1;
            if (modules[moduleIndex]) {
                this.loadModule(modules[moduleIndex]);
            }
        }
        
        // Ctrl + R pour actualiser le module actuel
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            if (this.currentModule && this.currentModule.refresh) {
                this.currentModule.refresh();
            }
        }
        
        // Escape pour fermer modals
        if (e.key === 'Escape') {
            this.modal.closeAll();
        }
    }

    // Méthodes utilitaires pour les modules
    getMainContent() {
        return document.getElementById('main-content');
    }

    getCurrentUser() {
        return this.userInfo;
    }

    // Auto-refresh périodique pour certains modules
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentModule && this.currentModule.autoRefresh) {
                this.currentModule.autoRefresh();
            }
        }, 30000); // 30 secondes
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    // Nettoyage lors de la fermeture
    destroy() {
        this.stopAutoRefresh();
        
        // Décharger tous les modules
        this.loadedModules.forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });
        
        this.loadedModules.clear();
        this.currentModule = null;
    }
}

// Export pour les builds
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminApp;
} else {
    window.AdminApp = AdminApp;
}
