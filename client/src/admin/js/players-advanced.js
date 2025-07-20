// client/src/admin/js/players-advanced.js
// Extension du module Players pour la gestion avancée (équipes, inventaires, Pokédex)

export class PlayersAdvancedModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'playersAdvanced'
        this.currentPlayerData = null
        this.currentAdvancedTab = 'team'
        
        console.log('🎮 [PlayersAdvanced] Module d\'extension initialisé')
        this.init()
    }

    init() {
        // Étendre le module players existant après initialisation
        setTimeout(() => this.extendPlayersModule(), 3000)
    }

    extendPlayersModule() {
        console.log('🔧 [PlayersAdvanced] Extension du module players...')
        
        // Ajouter des boutons avancés dans la table existante
        this.addAdvancedButtons()
        
        // Créer le modal avancé
        this.createAdvancedModal()
        
        // Injecter les styles
        this.injectAdvancedStyles()
        
        console.log('✅ [PlayersAdvanced] Extension terminée')
    }

    addAdvancedButtons() {
        // Observer les changements de la table des joueurs pour ajouter nos boutons
        const tableBody = document.getElementById('playersTableBody')
        if (!tableBody) return

        // Utiliser MutationObserver pour détecter les changements
        const observer = new MutationObserver(() => {
            this.enhancePlayerRows()
        })

        observer.observe(tableBody, { childList: true, subtree: true })
        
        // Améliorer les lignes existantes
        this.enhancePlayerRows()
    }

    enhancePlayerRows() {
        const rows = document.querySelectorAll('#playersTableBody tr')
        rows.forEach(row => {
            if (row.querySelector('.advanced-btn')) return // Déjà amélioré
            
            const actionCell = row.querySelector('.action-buttons')
            if (actionCell && !row.textContent.includes('Cliquez sur')) {
                const username = row.querySelector('strong')?.textContent
                if (username) {
                    const advancedBtn = document.createElement('button')
                    advancedBtn.className = 'btn btn-info btn-sm advanced-btn'
                    advancedBtn.innerHTML = '<i class="fas fa-cogs"></i>'
                    advancedBtn.title = 'Gestion Avancée'
                    advancedBtn.onclick = () => this.openAdvancedView(username)
                    
                    actionCell.appendChild(advancedBtn)
                }
            }
        })
    }

    async openAdvancedView(username) {
        console.log(`🎮 [PlayersAdvanced] Ouverture vue avancée pour: ${username}`)
        
        try {
            // Charger toutes les données du joueur
            await this.loadPlayerAdvancedData(username)
            
            // Ouvrir le modal avancé
            this.showAdvancedModal()
            
        } catch (error) {
            this.adminPanel.showNotification('Erreur chargement données avancées: ' + error.message, 'error')
        }
    }

    async loadPlayerAdvancedData(username) {
        console.log(`📊 [PlayersAdvanced] Chargement des données pour: ${username}`)
        
        try {
            // Paralléliser les requêtes pour de meilleures performances
            const [teamData, inventoryData, pokedexData, playerStats] = await Promise.allSettled([
                this.adminPanel.apiCall(`/players/${username}/team`),
                this.adminPanel.apiCall(`/players/${username}/inventory`),
                this.adminPanel.apiCall(`/players/${username}/pokedex`),
                this.adminPanel.apiCall(`/players/${username}/stats`)
            ])

            this.currentPlayerData = {
                username,
                team: teamData.status === 'fulfilled' ? teamData.value : null,
                inventory: inventoryData.status === 'fulfilled' ? inventoryData.value : null,
                pokedex: pokedexData.status === 'fulfilled' ? pokedexData.value : null,
                stats: playerStats.status === 'fulfilled' ? playerStats.value : null
            }

            console.log('✅ [PlayersAdvanced] Données chargées:', this.currentPlayerData)
            
        } catch (error) {
            console.error('❌ [PlayersAdvanced] Erreur chargement:', error)
            throw error
        }
    }

    showAdvancedModal() {
        const modal = document.getElementById('advancedPlayerModal')
        if (!modal) {
            console.error('Modal avancé non trouvé')
            return
        }

        // Mettre à jour le titre
        const title = modal.querySelector('#advancedPlayerTitle')
        if (title) {
            title.textContent = `Gestion Avancée - ${this.currentPlayerData.username}`
        }

        // Charger le contenu par défaut (équipe)
        this.switchAdvancedTab('team')
        
        // Afficher le modal
        modal.classList.add('active')
    }

    switchAdvancedTab(tabName) {
        console.log(`🔄 [PlayersAdvanced] Changement d'onglet: ${tabName}`)
        
        this.currentAdvancedTab = tabName
        
        // Mettre à jour les boutons d'onglets
        document.querySelectorAll('.advanced-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName)
        })

        // Masquer tous les contenus
        document.querySelectorAll('.advanced-tab-content').forEach(content => {
            content.style.display = 'none'
        })

        // Afficher le contenu sélectionné
        const activeContent = document.getElementById(`advanced-${tabName}`)
        if (activeContent) {
            activeContent.style.display = 'block'
            
            // Charger le contenu spécifique
            this.loadTabContent(tabName)
        }
    }

    loadTabContent(tabName) {
        switch(tabName) {
            case 'team':
                this.renderTeamContent()
                break
            case 'inventory':
                this.renderInventoryContent()
                break
            case 'pokedex':
                this.renderPokedexContent()
                break
            case 'stats':
                this.renderStatsContent()
                break
        }
    }

    renderTeamContent() {
        const container = document.getElementById('advanced-team')
        if (!container) return

        const teamData = this.currentPlayerData?.team
        
        if (!teamData || !teamData.pokemon || teamData.pokemon.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #6c757d;">
                    <i class="fas fa-paw" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h4>Aucun Pokémon dans l'équipe</h4>
                    <p>Ce joueur n'a pas encore de Pokémon dans son équipe.</p>
                    <button class="btn btn-primary" onclick="adminPanel.playersAdvanced.addPokemonToTeam()">
                        <i class="fas fa-plus"></i> Ajouter un Pokémon
                    </button>
                </div>
            `
            return
        }

        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: between; align-items: center;">
                <h4 style="margin: 0; color: #2c3e50;">
                    <i class="fas fa-users"></i> Équipe Pokémon (${teamData.pokemon.length}/6)
                </h4>
                <div>
                    <button class="btn btn-success btn-sm" onclick="adminPanel.playersAdvanced.addPokemonToTeam()">
                        <i class="fas fa-plus"></i> Ajouter
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="adminPanel.playersAdvanced.healAllPokemon()">
                        <i class="fas fa-heart"></i> Soigner Tous
                    </button>
                </div>
            </div>
            
            <div class="team-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${teamData.pokemon.map((pokemon, index) => this.renderPokemonCard(pokemon, index)).join('')}
            </div>
        `
    }

    renderPokemonCard(pokemon, index) {
        const isActive = this.currentPlayerData.team.activePokemon === index
        const hpPercentage = (pokemon.currentHp / pokemon.maxHp) * 100
        const hpColor = hpPercentage > 50 ? '#28a745' : hpPercentage > 25 ? '#ffc107' : '#dc3545'
        
        return `
            <div class="pokemon-card" style="
                border: 3px solid ${isActive ? '#007bff' : '#dee2e6'};
                border-radius: 15px;
                padding: 20px;
                background: ${isActive ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' : 'white'};
                position: relative;
                transition: all 0.3s;
            ">
                ${isActive ? '<div style="position: absolute; top: 10px; right: 10px; background: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">ACTIF</div>' : ''}
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <h5 style="margin: 0; color: #2c3e50;">
                        ${pokemon.nickname || `Pokémon #${pokemon.pokemonId}`}
                        ${pokemon.isShiny ? '✨' : ''}
                    </h5>
                    <div style="color: #6c757d; font-size: 0.9rem;">
                        Niveau ${pokemon.level} • ${pokemon.gender} • ${pokemon.nature}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>HP:</span>
                        <span>${pokemon.currentHp}/${pokemon.maxHp}</span>
                    </div>
                    <div style="background: #e9ecef; border-radius: 10px; height: 8px; overflow: hidden;">
                        <div style="background: ${hpColor}; height: 100%; width: ${hpPercentage}%; transition: all 0.3s;"></div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
                        <div>ATT: ${pokemon.stats.attack}</div>
                        <div>DEF: ${pokemon.stats.defense}</div>
                        <div>SP.ATT: ${pokemon.stats.specialAttack}</div>
                        <div>SP.DEF: ${pokemon.stats.specialDefense}</div>
                        <div colspan="2">SPEED: ${pokemon.stats.speed}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #495057;">Attaques:</strong>
                    <div style="margin-top: 5px;">
                        ${pokemon.moves.map(move => `
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 2px;">
                                <span>${move.moveId}</span>
                                <span style="color: ${move.currentPp === 0 ? '#dc3545' : '#6c757d'};">
                                    ${move.currentPp}/${move.maxPp} PP
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn btn-primary btn-sm" onclick="adminPanel.playersAdvanced.editPokemon('${pokemon.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!isActive ? `<button class="btn btn-success btn-sm" onclick="adminPanel.playersAdvanced.setActivePokemon(${index})">
                        <i class="fas fa-star"></i>
                    </button>` : ''}
                    <button class="btn btn-warning btn-sm" onclick="adminPanel.playersAdvanced.healPokemon('${pokemon.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.playersAdvanced.removePokemon('${pokemon.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
    }

    renderInventoryContent() {
        const container = document.getElementById('advanced-inventory')
        if (!container) return

        const inventoryData = this.currentPlayerData?.inventory
        
        if (!inventoryData) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #6c757d;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h4>Inventaire vide</h4>
                    <p>Aucun objet dans l'inventaire de ce joueur.</p>
                    <button class="btn btn-primary" onclick="adminPanel.playersAdvanced.addItemToInventory()">
                        <i class="fas fa-plus"></i> Ajouter un Objet
                    </button>
                </div>
            `
            return
        }

        // Créer les onglets d'inventaire
        const categories = ['items', 'medicine', 'balls', 'berries', 'key_items', 'tms', 'battle_items', 'valuables', 'held_items']
        
        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; color: #2c3e50;">
                    <i class="fas fa-backpack"></i> Inventaire
                </h4>
                <button class="btn btn-success btn-sm" onclick="adminPanel.playersAdvanced.addItemToInventory()">
                    <i class="fas fa-plus"></i> Ajouter Objet
                </button>
            </div>
            
            <div class="inventory-tabs" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                ${categories.map(cat => `
                    <button class="btn btn-outline-primary btn-sm inventory-cat-btn ${cat === 'items' ? 'active' : ''}" 
                            data-category="${cat}" 
                            onclick="adminPanel.playersAdvanced.switchInventoryCategory('${cat}')">
                        ${this.getCategoryIcon(cat)} ${this.getCategoryName(cat)}
                        <span class="badge badge-light">${inventoryData[cat]?.length || 0}</span>
                    </button>
                `).join('')}
            </div>
            
            <div id="inventory-content" style="min-height: 300px;">
                ${this.renderInventoryCategory('items', inventoryData.items || [])}
            </div>
        `
    }

    switchInventoryCategory(category) {
        // Mettre à jour les boutons
        document.querySelectorAll('.inventory-cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category)
        })
        
        // Mettre à jour le contenu
        const inventoryData = this.currentPlayerData?.inventory
        const items = inventoryData?.[category] || []
        
        const container = document.getElementById('inventory-content')
        if (container) {
            container.innerHTML = this.renderInventoryCategory(category, items)
        }
    }

    renderInventoryCategory(category, items) {
        if (items.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Aucun objet dans cette catégorie</p>
                </div>
            `
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                ${items.map(item => `
                    <div style="border: 1px solid #dee2e6; border-radius: 10px; padding: 15px; background: white;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #2c3e50;">${this.formatItemName(item.itemId)}</strong>
                            <span style="background: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                                ×${item.quantity}
                            </span>
                        </div>
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn btn-primary btn-sm" onclick="adminPanel.playersAdvanced.editItemQuantity('${category}', '${item.itemId}', ${item.quantity})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="adminPanel.playersAdvanced.removeItem('${category}', '${item.itemId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    }

    renderPokedexContent() {
        const container = document.getElementById('advanced-pokedex')
        if (!container) return

        const pokedexData = this.currentPlayerData?.pokedex
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0; color: #2c3e50;">
                    <i class="fas fa-book"></i> Pokédex
                </h4>
                <p style="color: #6c757d; margin-top: 5px;">
                    Vus: ${pokedexData?.totalSeen || 0} | Capturés: ${pokedexData?.totalCaught || 0} | 
                    Complétion: ${pokedexData?.caughtPercentage || 0}%
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fas fa-construction" style="font-size: 3rem; color: #ffc107; margin-bottom: 15px;"></i>
                <h5>Gestion Pokédex - En Développement</h5>
                <p>L'interface de gestion du Pokédex sera disponible dans une prochaine mise à jour.</p>
            </div>
        `
    }

    renderStatsContent() {
        const container = document.getElementById('advanced-stats')
        if (!container) return

        const statsData = this.currentPlayerData?.stats
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0; color: #2c3e50;">
                    <i class="fas fa-chart-bar"></i> Statistiques Détaillées
                </h4>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fas fa-chart-line" style="font-size: 3rem; color: #17a2b8; margin-bottom: 15px;"></i>
                <h5>Statistiques Avancées - En Développement</h5>
                <p>Les statistiques détaillées seront disponibles dans une prochaine mise à jour.</p>
            </div>
        `
    }

    // Méthodes d'action pour l'équipe
    async editPokemon(pokemonId) {
        console.log(`✏️ [PlayersAdvanced] Édition Pokémon: ${pokemonId}`)
        
        if (!this.currentPlayerData) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        const pokemon = this.currentPlayerData.team.pokemon.find(p => p.id === pokemonId)
        if (!pokemon) {
            this.adminPanel.showNotification('Pokémon non trouvé', 'error')
            return
        }

        // Créer un modal d'édition simple
        const newNickname = prompt(`Nouveau surnom pour ${pokemon.nickname || `Pokémon #${pokemon.pokemonId}`}:`, pokemon.nickname || '')
        if (newNickname === null) return // Annulé

        const newLevel = prompt(`Nouveau niveau (1-100):`, pokemon.level.toString())
        if (newLevel === null) return // Annulé

        const level = parseInt(newLevel)
        if (isNaN(level) || level < 1 || level > 100) {
            this.adminPanel.showNotification('Niveau invalide (1-100)', 'error')
            return
        }

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/pokemon/${pokemonId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    nickname: newNickname.trim() || undefined,
                    level: level
                })
            })

            this.adminPanel.showNotification('Pokémon modifié avec succès', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async healPokemon(pokemonId) {
        console.log(`💚 [PlayersAdvanced] Soin Pokémon: ${pokemonId}`)
        
        if (!this.currentPlayerData) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/pokemon/${pokemonId}/heal`, {
                method: 'POST'
            })

            this.adminPanel.showNotification('Pokémon soigné', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async removePokemon(pokemonId) {
        if (!this.currentPlayerData) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        const pokemon = this.currentPlayerData.team.pokemon.find(p => p.id === pokemonId)
        if (!pokemon) {
            this.adminPanel.showNotification('Pokémon non trouvé', 'error')
            return
        }

        if (!confirm(`Retirer ${pokemon.nickname || `Pokémon #${pokemon.pokemonId}`} de l'équipe ?`)) {
            return
        }

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/team/${pokemonId}`, {
                method: 'DELETE'
            })

            this.adminPanel.showNotification('Pokémon retiré de l\'équipe', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    // Méthodes pour l'inventaire
    async addItemToInventory() {
        if (!this.currentPlayerData) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        const itemId = prompt('ID de l\'objet à ajouter:')
        if (!itemId) return

        const category = prompt('Catégorie (items, medicine, balls, berries, key_items, tms, battle_items, valuables, held_items):')
        if (!category) return

        const quantity = prompt('Quantité:', '1')
        if (!quantity) return

        const qty = parseInt(quantity)
        if (isNaN(qty) || qty < 1) {
            this.adminPanel.showNotification('Quantité invalide', 'error')
            return
        }

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/inventory/add`, {
                method: 'POST',
                body: JSON.stringify({
                    category: category,
                    itemId: itemId,
                    quantity: qty
                })
            })

            this.adminPanel.showNotification('Objet ajouté à l\'inventaire', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderInventoryContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async editItemQuantity(category, itemId, currentQuantity) {
        if (!this.currentPlayerData) return

        const newQuantity = prompt(`Nouvelle quantité pour ${this.formatItemName(itemId)}:`, currentQuantity.toString())
        if (newQuantity === null) return

        const qty = parseInt(newQuantity)
        if (isNaN(qty) || qty < 0) {
            this.adminPanel.showNotification('Quantité invalide', 'error')
            return
        }

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/inventory/${category}/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: qty })
            })

            this.adminPanel.showNotification('Quantité modifiée', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderInventoryContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async removeItem(category, itemId) {
        if (!confirm(`Supprimer ${this.formatItemName(itemId)} ?`)) return

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/inventory/${category}/${itemId}`, {
                method: 'DELETE'
            })

            this.adminPanel.showNotification('Objet supprimé', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderInventoryContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async addPokemonToTeam() {
        const pokemonId = prompt('ID du Pokémon à ajouter (1-151):')
        if (!pokemonId || isNaN(pokemonId)) return

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/team/add`, {
                method: 'POST',
                body: JSON.stringify({ pokemonId: parseInt(pokemonId) })
            })

            this.adminPanel.showNotification('Pokémon ajouté à l\'équipe', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async healAllPokemon() {
        if (!confirm('Soigner tous les Pokémon de l\'équipe ?')) return

        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/team/heal-all`, {
                method: 'POST'
            })

            this.adminPanel.showNotification('Tous les Pokémon ont été soignés', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    async setActivePokemon(index) {
        try {
            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/team/set-active`, {
                method: 'POST',
                body: JSON.stringify({ index })
            })

            this.adminPanel.showNotification('Pokémon actif modifié', 'success')
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderTeamContent()
        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        }
    }

    // Méthodes utilitaires
    getCategoryIcon(category) {
        const icons = {
            items: '🎒', medicine: '💊', balls: '⚽', berries: '🍓',
            key_items: '🗝️', tms: '💿', battle_items: '⚔️', 
            valuables: '💎', held_items: '🎭'
        }
        return icons[category] || '📦'
    }

    getCategoryName(category) {
        const names = {
            items: 'Objets', medicine: 'Médecine', balls: 'Poké Balls', berries: 'Baies',
            key_items: 'Objets Clés', tms: 'CTs', battle_items: 'Combat', 
            valuables: 'Objets de Valeur', held_items: 'Objets Tenus'
        }
        return names[category] || category
    }

    formatItemName(itemId) {
        return itemId.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }

    injectAdvancedStyles() {
        if (document.getElementById('advanced-player-styles')) return

        const styles = document.createElement('style')
        styles.id = 'advanced-player-styles'
        styles.textContent = `
            .advanced-modal .modal-content {
                max-width: 95vw !important;
                max-height: 95vh !important;
                width: 1200px !important;
            }
            
            .advanced-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 25px;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 10px;
                flex-wrap: wrap;
            }
            
            .advanced-tab-btn {
                padding: 12px 20px;
                border: none;
                background: #f8f9fa;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 600;
                color: #495057;
                border: 2px solid transparent;
            }
            
            .advanced-tab-btn.active {
                background: #007bff;
                color: white;
                border-color: #0056b3;
            }
            
            .advanced-tab-btn:hover:not(.active) {
                background: #e9ecef;
                border-color: #007bff;
            }
            
            .advanced-tab-content {
                display: none;
                min-height: 400px;
            }
            
            .advanced-tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .team-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .pokemon-card {
                transition: transform 0.3s, box-shadow 0.3s;
            }
            
            .pokemon-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            }
            
            .inventory-cat-btn.active {
                background: #007bff !important;
                color: white !important;
                border-color: #0056b3 !important;
            }
            
            .inventory-cat-btn .badge {
                background: rgba(255,255,255,0.2) !important;
                color: inherit !important;
            }
        `
        document.head.appendChild(styles)
    }

    createAdvancedModal() {
        // Vérifier si le modal existe déjà
        if (document.getElementById('advancedPlayerModal')) return

        const modal = document.createElement('div')
        modal.className = 'modal advanced-modal'
        modal.id = 'advancedPlayerModal'
        modal.innerHTML = `
            <div class="modal-content">
                <h3 id="advancedPlayerTitle" style="margin-bottom: 20px; color: #2c3e50;">
                    <i class="fas fa-user-cog"></i> Gestion Avancée
                </h3>
                
                <div class="advanced-tabs">
                    <button class="advanced-tab-btn active" data-tab="team" onclick="adminPanel.playersAdvanced.switchAdvancedTab('team')">
                        <i class="fas fa-users"></i> Équipe
                    </button>
                    <button class="advanced-tab-btn" data-tab="inventory" onclick="adminPanel.playersAdvanced.switchAdvancedTab('inventory')">
                        <i class="fas fa-backpack"></i> Inventaire
                    </button>
                    <button class="advanced-tab-btn" data-tab="pokedex" onclick="adminPanel.playersAdvanced.switchAdvancedTab('pokedex')">
                        <i class="fas fa-book"></i> Pokédex
                    </button>
                    <button class="advanced-tab-btn" data-tab="stats" onclick="adminPanel.playersAdvanced.switchAdvancedTab('stats')">
                        <i class="fas fa-chart-bar"></i> Statistiques
                    </button>
                </div>
                
                <div class="advanced-tab-content active" id="advanced-team">
                    <!-- Contenu équipe -->
                </div>
                
                <div class="advanced-tab-content" id="advanced-inventory">
                    <!-- Contenu inventaire -->
                </div>
                
                <div class="advanced-tab-content" id="advanced-pokedex">
                    <!-- Contenu pokédex -->
                </div>
                
                <div class="advanced-tab-content" id="advanced-stats">
                    <!-- Contenu statistiques -->
                </div>
                
                <div style="margin-top: 25px; text-align: right;">
                    <button class="btn btn-secondary" onclick="adminPanel.closeModal()">
                        <i class="fas fa-times"></i> Fermer
                    </button>
                </div>
            </div>
        `

        // Fermeture sur clic extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.adminPanel.closeModal()
            }
        })

        document.body.appendChild(modal)
    }

    // Cleanup
    cleanup() {
        this.currentPlayerData = null
        
        // Supprimer les styles injectés
        const styles = document.getElementById('advanced-player-styles')
        if (styles) styles.remove()
        
        // Supprimer le modal
        const modal = document.getElementById('advancedPlayerModal')
        if (modal) modal.remove()
        
        console.log('🧹 [PlayersAdvanced] Module cleanup completed')
    }
}

export default PlayersAdvancedModule
