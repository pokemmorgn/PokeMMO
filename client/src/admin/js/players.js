// PokeWorld Admin Panel - Players Module

export class PlayersModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'players'
        this.currentPlayer = null
        
        console.log('👥 [Players] Module initialized')
    }

    async loadAllPlayers() {
        console.log('👥 [Players] Loading all players...')
        this.adminPanel.showLoading('playersLoading', true)
        
        try {
            const data = await this.adminPanel.apiCall('/players?limit=100')
            this.displayPlayers(data.players)
            this.adminPanel.showNotification(`${data.players.length} joueurs chargés`, 'success')
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement joueurs: ' + error.message, 'error')
        } finally {
            this.adminPanel.showLoading('playersLoading', false)
        }
    }

    async searchPlayers() {
        const searchInput = document.getElementById('playerSearch')
        const search = searchInput?.value.trim()
        
        if (!search || search.length < 2) {
            this.adminPanel.showNotification('Entrez au moins 2 caractères', 'warning')
            return
        }

        console.log(`👥 [Players] Searching for: ${search}`)
        this.adminPanel.showLoading('playersLoading', true)
        
        try {
            const data = await this.adminPanel.apiCall(`/players?search=${encodeURIComponent(search)}`)
            this.displayPlayers(data.players)
            
            if (data.players.length === 0) {
                this.adminPanel.showNotification('Aucun joueur trouvé', 'info')
            } else {
                this.adminPanel.showNotification(`${data.players.length} joueur(s) trouvé(s)`, 'success')
            }
        } catch (error) {
            this.adminPanel.showNotification('Erreur recherche: ' + error.message, 'error')
        } finally {
            this.adminPanel.showLoading('playersLoading', false)
        }
    }

    displayPlayers(players) {
        const tbody = document.getElementById('playersTableBody')
        if (!tbody) return
        
        if (players.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        Aucun joueur trouvé
                    </td>
                </tr>
            `
            return
        }

        tbody.innerHTML = players.map(player => `
            <tr>
                <td><strong>${player.username}</strong></td>
                <td>${player.email || 'N/A'}</td>
                <td>${player.level || 1}</td>
                <td>${this.adminPanel.formatNumber(player.gold || 0)}</td>
                <td>${this.adminPanel.formatDate(player.lastLogin)}</td>
                <td>
                    <span class="badge ${player.isActive ? 'online' : 'offline'}">
                        ${player.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    ${player.isDev ? '<span class="badge dev">Dev</span>' : ''}
                    ${player.isBanned ? '<span class="badge offline">Banni</span>' : ''}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="adminPanel.players.viewPlayer('${player.username}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="adminPanel.players.quickEdit('${player.username}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('')
    }

    async viewPlayer(username) {
        console.log(`👥 [Players] Viewing player: ${username}`)
        
        try {
            const data = await this.adminPanel.apiCall(`/players/${username}`)
            
            const modalContent = document.getElementById('playerModalContent')
            if (modalContent) {
                modalContent.innerHTML = this.generatePlayerDetailsHTML(data.player, data.stats)
            }

            this.currentPlayer = data.player
            this.adminPanel.showModal('playerModal')
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement détails: ' + error.message, 'error')
        }
    }

    generatePlayerDetailsHTML(player, stats) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <h4>Informations Générales</h4>
                    <p><strong>Username:</strong> ${player.username}</p>
                    <p><strong>Email:</strong> ${player.email || 'N/A'}</p>
                    <p><strong>Niveau:</strong> ${player.level || 1}</p>
                    <p><strong>Gold:</strong> ${this.adminPanel.formatNumber(player.gold || 0)}</p>
                    <p><strong>Créé le:</strong> ${new Date(player.createdAt).toLocaleDateString()}</p>
                    <p><strong>Dernière connexion:</strong> ${this.adminPanel.formatDate(player.lastLogin)}</p>
                </div>
                <div>
                    <h4>Position</h4>
                    <p><strong>Carte:</strong> ${player.lastMap || 'N/A'}</p>
                    <p><strong>Position:</strong> (${player.lastX || 0}, ${player.lastY || 0})</p>
                    <p><strong>Temps de jeu:</strong> ${player.totalPlaytime || 0} minutes</p>
                </div>
                <div>
                    <h4>Statistiques</h4>
                    <p><strong>Pokémon:</strong> ${stats?.totalPokemon || 0}</p>
                    <p><strong>Quêtes actives:</strong> ${stats?.activeQuests || 0}</p>
                    <p><strong>Quêtes terminées:</strong> ${stats?.completedQuests || 0}</p>
                </div>
                <div>
                    <h4>Statut</h4>
                    <p><strong>Actif:</strong> ${player.isActive ? '✅' : '❌'}</p>
                    <p><strong>Développeur:</strong> ${player.isDev ? '✅' : '❌'}</p>
                    <p><strong>Banni:</strong> ${player.isBanned ? '❌' : '✅'}</p>
                    <p><strong>Wallet:</strong> ${player.walletAddress ? '🔗' : '❌'}</p>
                </div>
            </div>
        `
    }

    quickEdit(username) {
        this.viewPlayer(username).then(() => {
            this.adminPanel.closeModal()
            this.editPlayer()
        })
    }

    editPlayer() {
        if (!this.currentPlayer) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        console.log(`✏️ [Players] Editing player: ${this.currentPlayer.username}`)

        // Switch to edit tab
        this.adminPanel.switchTab('edit')

        // Fill the form
        this.fillEditForm(this.currentPlayer)

        // Show edit section
        const editSection = document.getElementById('editPlayerSection')
        const noPlayerSection = document.getElementById('noPlayerSelected')
        
        if (editSection) editSection.style.display = 'block'
        if (noPlayerSection) noPlayerSection.style.display = 'none'
    }

    fillEditForm(player) {
        const formFields = {
            'editPlayerName': player.username,
            'editGold': player.gold || 0,
            'editLevel': player.level || 1,
            'editExperience': player.experience || 0,
            'editX': player.lastX || 0,
            'editY': player.lastY || 0,
            'editMap': player.lastMap || 'beach',
            'editIsDev': player.isDev || false,
            'editIsActive': player.isActive || false,
            'editIsBanned': player.isBanned || false
        }

        Object.entries(formFields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId)
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value
                } else if (fieldId === 'editPlayerName') {
                    element.textContent = value
                } else {
                    element.value = value
                }
            }
        })
    }

    async savePlayerChanges() {
        if (!this.currentPlayer) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        console.log(`💾 [Players] Saving changes for: ${this.currentPlayer.username}`)

        try {
            const updates = this.collectFormData()
            
            await this.adminPanel.apiCall(`/players/${this.currentPlayer.username}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })

            this.adminPanel.showNotification('Joueur modifié avec succès', 'success')
            this.cancelEdit()
            
            // Refresh player list if visible
            this.refreshPlayerListIfVisible()
        } catch (error) {
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    collectFormData() {
        return {
            gold: parseInt(document.getElementById('editGold')?.value || 0),
            level: parseInt(document.getElementById('editLevel')?.value || 1),
            experience: parseInt(document.getElementById('editExperience')?.value || 0),
            lastX: parseInt(document.getElementById('editX')?.value || 0),
            lastY: parseInt(document.getElementById('editY')?.value || 0),
            lastMap: document.getElementById('editMap')?.value || 'beach',
            isDev: document.getElementById('editIsDev')?.checked || false,
            isActive: document.getElementById('editIsActive')?.checked || false,
            isBanned: document.getElementById('editIsBanned')?.checked || false
        }
    }

    cancelEdit() {
        console.log('❌ [Players] Cancelling edit')
        
        this.currentPlayer = null
        this.adminPanel.currentPlayer = null
        
        const editSection = document.getElementById('editPlayerSection')
        const noPlayerSection = document.getElementById('noPlayerSelected')
        
        if (editSection) editSection.style.display = 'none'
        if (noPlayerSection) noPlayerSection.style.display = 'block'
    }

    resetPlayerData() {
        if (!this.currentPlayer) return

        if (confirm(`Êtes-vous sûr de vouloir reset les données de ${this.currentPlayer.username} ?`)) {
            // Reset to default values
            const defaultValues = {
                'editGold': 1000,
                'editLevel': 1,
                'editExperience': 0,
                'editX': 360,
                'editY': 120,
                'editMap': 'beach'
            }

            Object.entries(defaultValues).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId)
                if (element) {
                    element.value = value
                }
            })
            
            this.adminPanel.showNotification('Formulaire reseté - Cliquez sur Sauvegarder pour appliquer', 'warning')
        }
    }

    refreshPlayerListIfVisible() {
        // Check if players tab is active and has data
        const playersTab = document.querySelector('[data-tab="players"]')
        const playersTable = document.getElementById('playersTableBody')
        
        if (playersTab?.classList.contains('active') && 
            playersTable?.children.length > 0 && 
            !playersTable.textContent.includes('Cliquez sur')) {
            // Refresh the list
            this.loadAllPlayers()
        }
    }

    // Cleanup
    cleanup() {
        this.currentPlayer = null
        console.log('🧹 [Players] Module cleanup completed')
    }
}

// Export for global access
export default PlayersModule
