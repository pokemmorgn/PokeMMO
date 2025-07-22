// client/src/admin/main.js - Mise à jour avec le module MapEditor

// Import CSS (Vite will bundle these)
import './styles/main.css'
import './styles/components.css'
import { MongoDBModule } from './js/mongodb-module.js'

// Import modules
import { AdminPanel } from './js/admin-panel.js'
import { DashboardModule } from './js/dashboard.js'
import { PlayersModule } from './js/players.js'
import { PlayersAdvancedModule } from './js/players-advanced.js'
import { QuestsModule } from './js/quests.js'
import { LogsToolsModule } from './js/logs-tools.js'
import { QuestGeneratorModule } from './js/quest-generator.js'
import { MapEditorModule } from './js/map-editor.js' // ← NOUVEAU MODULE
import { NPCEditorModule } from './js/npc-editor.js'

// Global admin panel instance
let adminPanel

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [Admin] Initializing PokeWorld Admin Panel...')
    
    try {
        // Create main admin panel
        adminPanel = new AdminPanel()
        
        // Load modules (ordre important : PlayersAdvancedModule après PlayersModule)
        adminPanel.loadModules([
            DashboardModule,
            PlayersModule,
            PlayersAdvancedModule,
            QuestsModule,
            LogsToolsModule,
            QuestGeneratorModule,
            MapEditorModule,
            NPCEditorModule// ← AJOUT du nouveau module
        ])
        
        // Export for global access AFTER initialization
        window.adminPanel = adminPanel
        
        // Expose global functions for backwards compatibility
        setupGlobalFunctions()
        
        console.log('✅ [Admin] Admin Panel initialized successfully')
    } catch (error) {
        console.error('❌ [Admin] Failed to initialize:', error)
        showErrorMessage('Erreur d\'initialisation: ' + error.message)
    }
})

// Setup global functions with proper error handling
function setupGlobalFunctions() {
    // Dashboard functions
    window.refreshStats = () => {
        if (!adminPanel?.dashboard) {
            console.error('Dashboard module not loaded')
            return
        }
        adminPanel.dashboard.refreshStats()
    }

    // Players functions
    window.searchPlayers = () => {
        if (!adminPanel?.players) {
            console.error('Players module not loaded')
            return
        }
        adminPanel.players.searchPlayers()
    }

    window.loadAllPlayers = () => {
        if (!adminPanel?.players) {
            console.error('Players module not loaded')
            return
        }
        adminPanel.players.loadAllPlayers()
    }

    window.editPlayer = () => {
        if (!adminPanel?.players) {
            console.error('Players module not loaded')
            return
        }
        adminPanel.players.editPlayer()
    }

    window.cancelEdit = () => {
        if (!adminPanel?.players) {
            console.error('Players module not loaded')
            return
        }
        adminPanel.players.cancelEdit()
    }

    window.resetPlayerData = () => {
        if (!adminPanel?.players) {
            console.error('Players module not loaded')
            return
        }
        adminPanel.players.resetPlayerData()
    }

    // PlayersAdvanced functions
    window.openAdvancedPlayerView = (username) => {
        if (!adminPanel?.playersAdvanced) {
            console.error('PlayersAdvanced module not loaded')
            return
        }
        adminPanel.playersAdvanced.openAdvancedView(username)
    }
// NPCs Editor functions
window.selectZone = (zoneId) => {
    if (!adminPanel?.npcEditor) {
        console.error('NPCEditor module not loaded')
        return
    }
    adminPanel.npcEditor.selectZone(zoneId)
}

window.createNewNPC = () => {
    if (!adminPanel?.npcEditor) {
        console.error('NPCEditor module not loaded')
        return
    }
    adminPanel.npcEditor.createNewNPC()
}

window.saveAllNPCs = () => {
    if (!adminPanel?.npcEditor) {
        console.error('NPCEditor module not loaded')
        return
    }
    adminPanel.npcEditor.saveAllNPCs()
}
    // Quest Generator functions
    window.generateRandomQuest = () => {
        if (!adminPanel?.questGenerator) {
            console.error('QuestGenerator module not loaded')
            return
        }
        adminPanel.questGenerator.generateRandomQuest()
    }

    window.createQuestFromGenerated = () => {
        if (!adminPanel?.questGenerator) {
            console.error('QuestGenerator module not loaded')
            return
        }
        adminPanel.questGenerator.createQuestFromGenerated()
    }

    window.regenerateQuest = () => {
        if (!adminPanel?.questGenerator) {
            console.error('QuestGenerator module not loaded')
            return
        }
        adminPanel.questGenerator.regenerateQuest()
    }
    
    // Quests functions
    window.loadQuests = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.loadQuests()
    }

    window.createNewQuest = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.createNewQuest()
    }

    window.editQuest = (id) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.editQuest(id)
    }

    window.duplicateQuest = (id) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.duplicateQuest(id)
    }

    window.deleteQuest = (id) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.deleteQuest(id)
    }

    window.reloadQuestSystem = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.reloadQuestSystem()
    }

    window.showBackups = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.showBackups()
    }

    window.restoreBackup = (file) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.restoreBackup(file)
    }

    window.addQuestStep = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.addQuestStep()
    }

    window.removeQuestStep = (index) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.removeQuestStep(index)
    }

    window.updateStepData = (index, field, value) => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.updateStepData(index, field, value)
    }

    window.previewQuest = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.previewQuest()
    }

    window.closeQuestEditor = () => {
        if (!adminPanel?.quests) {
            console.error('Quests module not loaded')
            return
        }
        adminPanel.quests.closeQuestEditor()
    }

    // Logs & Tools functions
    window.loadLogs = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.loadLogs()
    }

    window.clearLogs = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.clearLogs()
    }

    window.toggleAutoRefresh = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.toggleAutoRefresh()
    }

    window.executeBulkAction = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.executeBulkAction()
    }

    window.getDBStats = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.getDBStats()
    }

    window.optimizeDB = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.optimizeDB()
    }

    window.backupDB = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.backupDB()
    }

    window.restartGameRooms = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.restartGameRooms()
    }

    window.getActiveConnections = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.getActiveConnections()
    }

    window.emergencyShutdown = () => {
        if (!adminPanel?.logsTools) {
            console.error('LogsTools module not loaded')
            return
        }
        adminPanel.logsTools.emergencyShutdown()
    }

    // ✅ NOUVELLES FONCTIONS POUR LE MODULE MAP EDITOR
    window.loadMapEditor = () => {
        if (!adminPanel?.mapEditor) {
            console.error('MapEditor module not loaded')
            return
        }
        adminPanel.mapEditor.onTabActivated()
    }

    // Modal functions
    window.closeModal = () => {
        if (!adminPanel) {
            console.error('AdminPanel not loaded')
            return
        }
        adminPanel.closeModal()
    }

    console.log('✅ [Admin] Global functions setup completed')
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('❌ [Admin] Global error:', event.error)
    showErrorMessage('Erreur système: ' + event.error?.message)
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ [Admin] Unhandled promise rejection:', event.reason)
    showErrorMessage('Erreur async: ' + event.reason?.message)
})

// ✅ FONCTIONS AVANCÉES POUR LE MODULE MAP EDITOR AVEC ITEMS
window.selectItem = (itemId) => {
    if (!adminPanel?.mapEditor) {
        console.error('MapEditor module not loaded')
        return
    }
    adminPanel.mapEditor.selectItem(itemId)
}

window.filterItems = (searchTerm) => {
    if (!adminPanel?.mapEditor) {
        console.error('MapEditor module not loaded')
        return
    }
    adminPanel.mapEditor.filterItems(searchTerm)
}

// Fonction pour recharger les items
window.reloadItems = () => {
    if (!adminPanel?.mapEditor) {
        console.error('MapEditor module not loaded')
        return
    }
    adminPanel.mapEditor.loadAvailableItems()
}

window.loadMongoDB = () => {
    if (!adminPanel?.mongodb) {
        console.error('MongoDB module not loaded')
        return
    }
    adminPanel.mongodb.onTabActivated()
}
// Helper function to show error messages
function showErrorMessage(message) {
    const notification = document.createElement('div')
    notification.className = 'notification error show'
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.classList.remove('show')
        setTimeout(() => notification.remove(), 300)
    }, 5000)
}
