// PokeWorld Admin Panel - Core Class (Version corrigée)

export class AdminPanel {
    constructor() {
        console.log('🚀 [AdminPanel] Initialisation...')
        
        this.token = sessionStorage.getItem('sessionToken')
        console.log('🎫 [AdminPanel] Token trouvé:', this.token ? 'OUI' : 'NON')
        
        if (!this.token) {
            console.log('❌ [AdminPanel] Aucun token, redirection vers /auth')
            window.location.href = '/auth'
            return
        }
        
        console.log('✅ [AdminPanel] Token présent, tentative de connexion...')
        this.currentPlayer = null
        this.currentQuest = null
        this.autoRefreshInterval = null
        this.modules = {}
        
        // Initialize immediately
        this.init()
    }

    async init() {
        try {
            console.log('🔄 [AdminPanel] Chargement initial...')
            this.setupEventListeners()
            console.log('✅ [AdminPanel] Initialisé avec succès')
        } catch (error) {
            console.error('❌ [AdminPanel] Erreur initialisation:', error)
            this.showNotification('Erreur d\'authentification: ' + error.message, 'error')
            setTimeout(() => window.location.href = '/auth', 2000)
        }
    }

   loadModules(moduleClasses) {
    console.log('📦 [AdminPanel] Chargement des modules...')
    
    moduleClasses.forEach(ModuleClass => {
        try {
            const instance = new ModuleClass(this)
            this.modules[instance.name] = instance
            console.log(`✅ [AdminPanel] Module ${instance.name} chargé`)
        } catch (error) {
            console.error(`❌ [AdminPanel] Erreur chargement module:`, error)
        }
    })
    
    // Expose modules for easy access
    this.dashboard = this.modules.dashboard
    this.players = this.modules.players
    this.playersAdvanced = this.modules.playersAdvanced
    this.quests = this.modules.quests
    this.logsTools = this.modules.logsTools
    this.questGenerator = this.modules.questGenerator
    this.mapEditor = this.modules.mapEditor
    this.npcEditor = this.modules.npcEditor
    this.mongodb = this.modules.mongodb  // ← AJOUTER CETTE LIGNE
    this.shopEditor = this.modules.shopEditor  // ← AJOUTER CETTE LIGNE
    this.dialogueEditor = this.modules.dialogueEditor  // ← AJOUTER CETTE LIGNE


    
    console.log('✅ [AdminPanel] Tous les modules chargés:', Object.keys(this.modules))
}

    setupEventListeners() {
        // Navigation par onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab
                this.switchTab(tab)
            })
        })

        // Recherche joueurs
        const playerSearch = document.getElementById('playerSearch')
        if (playerSearch) {
            playerSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.players?.searchPlayers()
                }
            })
        }

        // Formulaire d'édition joueur
        const editForm = document.getElementById('editPlayerForm')
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault()
                this.players?.savePlayerChanges()
            })
        }

        // Formulaire d'édition quête
        const questForm = document.getElementById('questEditorForm')
        if (questForm) {
            questForm.addEventListener('submit', (e) => {
                e.preventDefault()
                this.quests?.saveQuest()
            })
        }

        // Modals - fermeture sur clic extérieur
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal()
                }
            })
        })

        // Raccourcis clavier
        this.setupKeyboardShortcuts()
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+R = Actualiser stats
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault()
                this.dashboard?.refreshStats()
            }
            
            // Ctrl+F = Focus recherche
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault()
                document.getElementById('playerSearch')?.focus()
            }
            
            // Escape = Fermer modal/annuler édition
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    this.closeModal()
                } else if (document.getElementById('editPlayerSection')?.style.display !== 'none') {
                    if (confirm('Annuler les modifications ?')) {
                        this.players?.cancelEdit()
                    }
                }
            }
        })
    }

    switchTab(tabName) {
        console.log(`🔄 [AdminPanel] Changement d'onglet: ${tabName}`)
        
        // Mettre à jour les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName)
        })

        // Mettre à jour les panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabName)
        })

        // Actions spécifiques par onglet
        switch(tabName) {
            case 'dashboard':
                this.dashboard?.loadDashboard()
                break
            case 'players':
                // Le chargement se fait manuellement
                break
            case 'quests':
                // Le chargement se fait manuellement
                break
            case 'maps':
                console.log('🗺️ [AdminPanel] Activating maps tab')
                this.mapEditor?.onTabActivated()
                break
            case 'logs':
                this.logsTools?.loadLogs()
                break
            case 'tools':
                // Pas d'action spécifique
                break
                case 'npcs':
    console.log('👤 [AdminPanel] Activating NPCs tab')
    this.npcEditor?.onTabActivated()
    break
                case 'shops':
    console.log('🏪 [AdminPanel] Activating shops tab')
    this.shopEditor?.onTabActivated()
    break
                case 'mongodb':
    console.log('🗄️ [AdminPanel] Activating MongoDB tab')
    this.mongodb?.onTabActivated()
    break
                        case 'dialogues':  // ← AJOUTER CE CASE
            console.log('🗨️ [AdminPanel] Activating dialogues tab')
            this.dialogueEditor?.onTabActivated()
            break
        }
    }

    async apiCall(endpoint, options = {}) {
        console.log(`📡 [AdminPanel] API Call: ${endpoint}`)
        console.log('🎫 [AdminPanel] Token utilisé:', this.token.substring(0, 20) + '...')
        
        const response = await fetch(`/api/admin${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        })

        console.log(`📡 [AdminPanel] Réponse API: ${response.status} ${response.statusText}`)
        
        if (!response.ok) {
            const error = await response.json()
            console.error('❌ [AdminPanel] Erreur API:', error)
            throw new Error(error.error || 'Erreur API')
        }

        return response.json()
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId)
        if (modal) {
            modal.classList.add('active')
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active')
        })
    }

    // Loading Management
    showLoading(elementId, show) {
        const element = document.getElementById(elementId)
        if (element) {
            element.style.display = show ? 'block' : 'none'
        }
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Supprimer les notifications existantes
        document.querySelectorAll('.notification').forEach(n => n.remove())
        
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            ${message}
        `
        
        document.body.appendChild(notification)
        
        // Afficher
        setTimeout(() => notification.classList.add('show'), 100)
        
        // Masquer après 4 secondes
        setTimeout(() => {
            notification.classList.remove('show')
            setTimeout(() => notification.remove(), 300)
        }, 4000)
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        }
        return icons[type] || 'info-circle'
    }

    // Utility Functions
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        if (days > 0) return `${days}j ${hours}h`
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString()
    }

    formatNumber(number) {
        return (number || 0).toLocaleString()
    }

    // Cleanup on page unload
    cleanup() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval)
        }
        
        // Cleanup modules
        Object.values(this.modules).forEach(module => {
            if (module.cleanup) {
                module.cleanup()
            }
        })
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.adminPanel?.cleanup()
})
