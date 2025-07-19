// PokeWorld Admin Panel - Dashboard Module

export class DashboardModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'dashboard'
        this.autoRefreshInterval = null
        
        console.log('📊 [Dashboard] Module initialized')
        this.init()
    }

    init() {
        // Auto-refresh stats every 30 seconds when dashboard is active
        this.setupAutoRefresh()
        
        // Load dashboard on initialization
        this.loadDashboard()
    }

    setupAutoRefresh() {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval)
        }

        // Setup new interval
        this.autoRefreshInterval = setInterval(() => {
            // Only refresh if dashboard tab is active
            if (document.querySelector('[data-tab="dashboard"]')?.classList.contains('active')) {
                this.loadDashboard(true) // true = silent refresh
            }
        }, 30000) // 30 seconds
    }

    async loadDashboard(silent = false) {
        try {
            if (!silent) {
                console.log('📊 [Dashboard] Loading dashboard data...')
            }

            const data = await this.adminPanel.apiCall('/dashboard')
            
            // Update user info
            this.updateUserInfo(data)
            
            // Update server stats
            this.updateServerStats(data.serverStats)
            
            // Update last refresh time
            this.updateLastRefreshTime()
            
            if (!silent) {
                console.log('✅ [Dashboard] Dashboard loaded successfully')
            }

        } catch (error) {
            console.error('❌ [Dashboard] Error loading dashboard:', error)
            
            if (!silent) {
                this.adminPanel.showNotification(
                    'Erreur chargement dashboard: ' + error.message, 
                    'error'
                )
                
                // If authentication error, let the main class handle it
                if (error.message.includes('authentication') || error.message.includes('token')) {
                    throw error
                }
            }
            
            // Show error stats
            this.showErrorStats()
        }
    }

    updateUserInfo(data) {
        // Update current user
        const currentUserElement = document.getElementById('currentUser')
        if (currentUserElement && data.user) {
            currentUserElement.textContent = data.user
        }

        // Update client info
        const clientInfoElement = document.getElementById('clientInfo')
        if (clientInfoElement && data.clientInfo) {
            const { ip, isLocalhost } = data.clientInfo
            clientInfoElement.textContent = `IP: ${ip} ${isLocalhost ? '(localhost)' : ''}`
        }
    }

    updateServerStats(stats) {
        if (!stats) {
            console.warn('⚠️ [Dashboard] No stats data received')
            return
        }

        // Update each stat card
        const statUpdates = {
            'totalPlayers': stats.totalPlayers || 0,
            'activePlayers': stats.activePlayers || 0,
            'developers': stats.developers || 0,
            'totalPokemon': stats.totalPokemon || 0,
            'serverUptime': this.adminPanel.formatUptime(stats.uptime || 0),
            'memoryUsage': stats.memory || 'N/A'
        }

        Object.entries(statUpdates).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId)
            if (element) {
                element.textContent = value
            }
        })

        // Add animation to updated stats
        this.animateStatCards()
    }

    updateLastRefreshTime() {
        const lastUpdateElement = document.getElementById('lastUpdate')
        if (lastUpdateElement) {
            lastUpdateElement.textContent = 
                `Dernière mise à jour: ${new Date().toLocaleTimeString()}`
        }
    }

    showErrorStats() {
        // Show error state in stat cards
        const errorStats = {
            'totalPlayers': 'Erreur',
            'activePlayers': 'Erreur',
            'developers': 'Erreur',
            'totalPokemon': 'Erreur',
            'serverUptime': 'Erreur',
            'memoryUsage': 'Erreur'
        }

        Object.entries(errorStats).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId)
            if (element) {
                element.textContent = value
                element.style.color = '#e74c3c'
            }
        })
    }

    animateStatCards() {
        // Add subtle animation to stat cards when updated
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            setTimeout(() => {
                card.style.transform = 'scale(1.02)'
                setTimeout(() => {
                    card.style.transform = 'scale(1)'
                }, 150)
            }, index * 50) // Stagger animation
        })
    }

    async refreshStats() {
        console.log('🔄 [Dashboard] Manual refresh requested')
        
        // Show loading state
        this.showRefreshLoading(true)
        
        try {
            await this.loadDashboard()
            this.adminPanel.showNotification('Statistiques actualisées', 'success')
        } catch (error) {
            this.adminPanel.showNotification(
                'Erreur actualisation: ' + error.message, 
                'error'
            )
        } finally {
            this.showRefreshLoading(false)
        }
    }

    showRefreshLoading(show) {
        const refreshBtn = document.querySelector('button[onclick="refreshStats()"]')
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i')
            if (show) {
                icon?.classList.add('fa-spin')
                refreshBtn.disabled = true
            } else {
                icon?.classList.remove('fa-spin')
                refreshBtn.disabled = false
            }
        }
    }

    // Get current stats (for other modules)
    getCurrentStats() {
        const stats = {}
        
        const statElements = {
            totalPlayers: document.getElementById('totalPlayers'),
            activePlayers: document.getElementById('activePlayers'),
            developers: document.getElementById('developers'),
            totalPokemon: document.getElementById('totalPokemon')
        }

        Object.entries(statElements).forEach(([key, element]) => {
            if (element) {
                const value = element.textContent
                stats[key] = isNaN(value) ? value : parseInt(value)
            }
        })

        return stats
    }

    // Cleanup when module is destroyed
    cleanup() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval)
            this.autoRefreshInterval = null
        }
        console.log('🧹 [Dashboard] Module cleanup completed')
    }
}

// Export for global access
export default DashboardModule
