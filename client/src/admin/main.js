// PokeWorld Admin Panel - Main Entry Point

// Import CSS (Vite will bundle these)
import './styles/main.css'
import './styles/components.css'

// Import modules
import { AdminPanel } from './js/admin-panel.js'
import { DashboardModule } from './js/dashboard.js'
import { PlayersModule } from './js/players.js'
import { QuestsModule } from './js/quests.js'
import { LogsToolsModule } from './js/logs-tools.js'

// Global admin panel instance
let adminPanel

// Initialize when DOM is ready
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [Admin] Initializing PokeWorld Admin Panel...')
    
    try {
        // Create main admin panel
        adminPanel = new AdminPanel()
        
        // Load modules
        adminPanel.loadModules([
            DashboardModule,
            PlayersModule,
            QuestsModule,
            LogsToolsModule
        ])
        
        // ✅ AJOUTER CETTE LIGNE
        window.adminPanel = adminPanel
        
        console.log('✅ [Admin] Admin Panel initialized successfully')
        console.log('🎯 [Admin] adminPanel exposed to window:', window.adminPanel)
    } catch (error) {
        console.error('❌ [Admin] Failed to initialize:', error)
        showErrorMessage('Erreur d\'initialisation: ' + error.message)
    }
})

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

// Export for global access
window.adminPanel = adminPanel

// Expose global functions for backwards compatibility
window.refreshStats = () => adminPanel?.dashboard?.refreshStats()
window.searchPlayers = () => adminPanel?.players?.searchPlayers()
window.loadAllPlayers = () => adminPanel?.players?.loadAllPlayers()
window.loadQuests = () => adminPanel?.quests?.loadQuests()
window.createNewQuest = () => adminPanel?.quests?.createNewQuest()
window.editQuest = (id) => adminPanel?.quests?.editQuest(id)
window.duplicateQuest = (id) => adminPanel?.quests?.duplicateQuest(id)
window.deleteQuest = (id) => adminPanel?.quests?.deleteQuest(id)
window.reloadQuestSystem = () => adminPanel?.quests?.reloadQuestSystem()
window.showBackups = () => adminPanel?.quests?.showBackups()
window.restoreBackup = (file) => adminPanel?.quests?.restoreBackup(file)
window.addQuestStep = () => adminPanel?.quests?.addQuestStep()
window.removeQuestStep = (index) => adminPanel?.quests?.removeQuestStep(index)
window.updateStepData = (index, field, value) => adminPanel?.quests?.updateStepData(index, field, value)
window.previewQuest = () => adminPanel?.quests?.previewQuest()
window.closeQuestEditor = () => adminPanel?.quests?.closeQuestEditor()
window.editPlayer = () => adminPanel?.players?.editPlayer()
window.cancelEdit = () => adminPanel?.players?.cancelEdit()
window.resetPlayerData = () => adminPanel?.players?.resetPlayerData()
window.closeModal = () => adminPanel?.closeModal()
window.loadLogs = () => adminPanel?.logsTools?.loadLogs()
window.clearLogs = () => adminPanel?.logsTools?.clearLogs()
window.toggleAutoRefresh = () => adminPanel?.logsTools?.toggleAutoRefresh()
window.executeBulkAction = () => adminPanel?.logsTools?.executeBulkAction()
window.getDBStats = () => adminPanel?.logsTools?.getDBStats()
window.optimizeDB = () => adminPanel?.logsTools?.optimizeDB()
window.backupDB = () => adminPanel?.logsTools?.backupDB()
window.restartGameRooms = () => adminPanel?.logsTools?.restartGameRooms()
window.getActiveConnections = () => adminPanel?.logsTools?.getActiveConnections()
window.emergencyShutdown = () => adminPanel?.logsTools?.emergencyShutdown()
