// client/src/admin/js/players-advanced.js
// Extension du module Players pour la gestion avancée (équipes, inventaires, Pokédex)
// VERSION COMPLÈTE avec autocomplétion des items

export class PlayersAdvancedModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'playersAdvanced'
        this.currentPlayerData = null
        this.currentAdvancedTab = 'team'
        this.itemsCache = null // Cache pour les items
        this.itemsLoaded = false
        this.selectedItemId = null // Item sélectionné pour ajout
            // ✅ AJOUTER CES 3 LIGNES :
    this.pokemonCache = null
    this.pokemonLoaded = false
    this.selectedPokemonId = null
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

    // ✅ NOUVELLE MÉTHODE: Charger les items depuis l'API
    async loadItemsFromAPI() {
        if (this.itemsLoaded && this.itemsCache) {
            console.log('📦 [PlayersAdvanced] Items déjà en cache')
            return this.itemsCache
        }

        try {
            console.log('📦 [PlayersAdvanced] Chargement des items depuis l\'API...')
            this.adminPanel.showLoading('itemsLoading', true)
            
            // Utiliser la route existante qui retourne les items formatés
            const itemsData = await this.adminPanel.apiCall('/items')
            
            // itemsData est déjà un objet { itemId: {...}, itemId2: {...} }
            this.itemsCache = itemsData
            this.itemsLoaded = true
            
            console.log(`✅ [PlayersAdvanced] ${Object.keys(itemsData).length} items chargés`)
            return itemsData
            
        } catch (error) {
            console.error('❌ [PlayersAdvanced] Erreur chargement items:', error)
            this.adminPanel.showNotification('Erreur chargement items: ' + error.message, 'error')
            return {}
        } finally {
            this.adminPanel.showLoading('itemsLoading', false)
        }
    }

    // ✅ NOUVELLE MÉTHODE: Charger les Pokémon depuis l'API
async loadPokemonFromAPI() {
    if (this.pokemonLoaded && this.pokemonCache) {
        console.log('🦄 [PlayersAdvanced] Pokémon déjà en cache')
        return this.pokemonCache
    }

    try {
        console.log('🦄 [PlayersAdvanced] Chargement des Pokémon depuis l\'API...')
        this.adminPanel.showLoading('pokemonLoading', true)
        
        // Utiliser la route pour récupérer tous les Pokémon
        const pokemonData = await this.adminPanel.apiCall('/pokemon/all')
        
        this.pokemonCache = pokemonData
        this.pokemonLoaded = true
        
        console.log(`✅ [PlayersAdvanced] ${pokemonData.length} Pokémon chargés`)
        return pokemonData
        
    } catch (error) {
        console.error('❌ [PlayersAdvanced] Erreur chargement Pokémon:', error)
        this.adminPanel.showNotification('Erreur chargement Pokémon: ' + error.message, 'error')
        return []
    } finally {
        this.adminPanel.showLoading('pokemonLoading', false)
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
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
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
                        <div style="grid-column: span 2; text-align: center;">SPEED: ${pokemon.stats.speed}</div>
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

    // ✅ MÉTHODE AMÉLIORÉE: Interface d'ajout d'item avec autocomplétion
    async addItemToInventory() {
        if (!this.currentPlayerData) {
            this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
            return
        }

        // Charger les items si pas encore fait
        const items = await this.loadItemsFromAPI()
        if (!items || Object.keys(items).length === 0) {
            this.adminPanel.showNotification('Impossible de charger la liste des items', 'error')
            return
        }

        // Créer le modal d'ajout d'item avec autocomplétion
        this.showAddItemModal(items)
    }

    // ✅ NOUVELLE MÉTHODE: Créer le modal d'ajout d'item
    showAddItemModal(items) {
        // Supprimer le modal existant s'il y en a un
        const existingModal = document.getElementById('addItemModal')
        if (existingModal) {
            existingModal.remove()
        }

        // Créer le modal
        const modal = document.createElement('div')
        modal.className = 'modal'
        modal.id = 'addItemModal'
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3 style="margin-bottom: 25px; color: #2c3e50;">
                    <i class="fas fa-plus-circle"></i> Ajouter un Objet à l'Inventaire
                    <span style="font-size: 0.8rem; color: #6c757d; font-weight: normal;">
                        - ${this.currentPlayerData.username}
                    </span>
                </h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                        <i class="fas fa-search"></i> Rechercher un objet:
                    </label>
                    <div style="position: relative;">
                        <input type="text" 
                               id="itemSearchInput" 
                               placeholder="Tapez pour rechercher un objet..."
                               style="width: 100%; padding: 12px 40px 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;"
                               autocomplete="off">
                        <i class="fas fa-search" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #6c757d;"></i>
                        
                        <!-- Liste d'autocomplétion -->
                        <div id="itemSuggestions" style="
                            position: absolute;
                            top: 100%;
                            left: 0;
                            right: 0;
                            background: white;
                            border: 2px solid #e9ecef;
                            border-top: none;
                            border-radius: 0 0 8px 8px;
                            max-height: 300px;
                            overflow-y: auto;
                            z-index: 1000;
                            display: none;
                        "></div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                        <i class="fas fa-tag"></i> Catégorie:
                    </label>
                    <select id="itemCategory" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                        <option value="items">📦 Objets</option>
                        <option value="medicine">💊 Médecine</option>
                        <option value="balls">⚽ Poké Balls</option>
                        <option value="berries">🍓 Baies</option>
                        <option value="key_items">🗝️ Objets Clés</option>
                        <option value="tms">💿 CTs</option>
                        <option value="battle_items">⚔️ Combat</option>
                        <option value="valuables">💎 Objets de Valeur</option>
                        <option value="held_items">🎭 Objets Tenus</option>
                    </select>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                        <i class="fas fa-sort-numeric-up"></i> Quantité:
                    </label>
                    <input type="number" 
                           id="itemQuantity" 
                           value="1" 
                           min="1" 
                           max="999"
                           style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                </div>

                <!-- Prévisualisation de l'objet sélectionné -->
                <div id="itemPreview" style="
                    background: #f8f9fa; 
                    border: 2px solid #e9ecef; 
                    border-radius: 8px; 
                    padding: 15px; 
                    margin-bottom: 25px;
                    display: none;
                ">
                    <h5 style="margin: 0 0 10px 0; color: #2c3e50;">Objet sélectionné:</h5>
                    <div id="itemPreviewContent"></div>
                </div>

                <div style="text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="adminPanel.playersAdvanced.closeAddItemModal()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="btn btn-success" onclick="adminPanel.playersAdvanced.confirmAddItem()">
                        <i class="fas fa-plus"></i> Ajouter à l'Inventaire
                    </button>
                </div>
            </div>
        `

        // Fermeture sur clic extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeAddItemModal()
            }
        })

        document.body.appendChild(modal)
        modal.classList.add('active')

        // Initialiser l'autocomplétion
        this.initializeItemAutocomplete(items)

        // Focus sur le champ de recherche
        setTimeout(() => {
            document.getElementById('itemSearchInput')?.focus()
        }, 100)
    }

    // ✅ NOUVELLE MÉTHODE: Initialiser l'autocomplétion
    initializeItemAutocomplete(items) {
        const input = document.getElementById('itemSearchInput')
        const suggestions = document.getElementById('itemSuggestions')
        const preview = document.getElementById('itemPreview')
        
        if (!input || !suggestions) return

        let currentFocus = -1

        // Convertir l'objet items en array pour la recherche
        const itemsArray = Object.entries(items).map(([itemId, itemData]) => ({
            itemId,
            ...itemData
        }))

        // Fonction de recherche
        const searchItems = (query) => {
            if (query.length < 2) {
                suggestions.style.display = 'none'
                currentFocus = -1
                return
            }

            const matches = itemsArray.filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.itemId.toLowerCase().includes(query.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(query.toLowerCase())) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
            ).slice(0, 10) // Limiter à 10 résultats

            if (matches.length === 0) {
                suggestions.innerHTML = `
                    <div style="padding: 15px; text-align: center; color: #6c757d;">
                        <i class="fas fa-search"></i> Aucun objet trouvé pour "${query}"
                    </div>
                `
                suggestions.style.display = 'block'
                return
            }

            suggestions.innerHTML = matches.map((item, index) => `
                <div class="item-suggestion" 
                     data-item-id="${item.itemId}"
                     data-index="${index}"
                     style="
                        padding: 12px 16px; 
                        border-bottom: 1px solid #f0f0f0; 
                        cursor: pointer;
                        transition: background-color 0.2s;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                     "
                     onmouseenter="this.style.backgroundColor='#f8f9fa'"
                     onmouseleave="this.style.backgroundColor='white'">
                    <div>
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                            ${item.name}
                        </div>
                        <div style="font-size: 0.85rem; color: #6c757d;">
                            ID: ${item.itemId} • ${item.category || 'Objet'}
                            ${item.price ? ` • ${item.price}₽` : ''}
                        </div>
                    </div>
                    <div style="color: #007bff;">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                </div>
            `).join('')

            suggestions.style.display = 'block'
            currentFocus = -1
        }

        // Fonction de sélection d'item
        const selectItem = (itemId) => {
            const item = items[itemId]
            if (!item) return

            this.selectedItemId = itemId
            input.value = item.name
            suggestions.style.display = 'none'
            
            // Afficher la prévisualisation
            this.showItemPreview(item, itemId)
            
            // Suggérer une catégorie appropriée
            this.suggestCategory(item)
        }

        // Événements
        input.addEventListener('input', (e) => {
            this.selectedItemId = null
            preview.style.display = 'none'
            searchItems(e.target.value.trim())
        })

        input.addEventListener('keydown', (e) => {
            const suggestionItems = suggestions.querySelectorAll('.item-suggestion')
            
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                currentFocus = Math.min(currentFocus + 1, suggestionItems.length - 1)
                this.updateSuggestionFocus(suggestionItems, currentFocus)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                currentFocus = Math.max(currentFocus - 1, -1)
                this.updateSuggestionFocus(suggestionItems, currentFocus)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (currentFocus >= 0 && suggestionItems[currentFocus]) {
                    const itemId = suggestionItems[currentFocus].dataset.itemId
                    selectItem(itemId)
                }
            } else if (e.key === 'Escape') {
                suggestions.style.display = 'none'
                currentFocus = -1
            }
        })

        // Clic sur une suggestion
        suggestions.addEventListener('click', (e) => {
            const suggestion = e.target.closest('.item-suggestion')
            if (suggestion) {
                const itemId = suggestion.dataset.itemId
                selectItem(itemId)
            }
        })

        // Fermer les suggestions en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none'
                currentFocus = -1
            }
        })
    }

    // ✅ NOUVELLE MÉTHODE: Mettre à jour le focus des suggestions
    updateSuggestionFocus(suggestions, focusIndex) {
        suggestions.forEach((suggestion, index) => {
            if (index === focusIndex) {
                suggestion.style.backgroundColor = '#007bff'
                suggestion.style.color = 'white'
            } else {
                suggestion.style.backgroundColor = 'white'
                suggestion.style.color = 'inherit'
            }
        })
    }

    // ✅ NOUVELLE MÉTHODE: Afficher la prévisualisation de l'item
    showItemPreview(item, itemId) {
        const preview = document.getElementById('itemPreview')
        const previewContent = document.getElementById('itemPreviewContent')
        
        if (!preview || !previewContent) return

        previewContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h6 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.1rem;">
                        ${item.name}
                    </h6>
                    <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 0.9rem;">
                        ${item.description || 'Aucune description disponible'}
                    </p>
                    <div style="display: flex; gap: 15px; font-size: 0.85rem;">
                        <span><strong>ID:</strong> ${itemId}</span>
                        <span><strong>Catégorie:</strong> ${item.category || 'Objet'}</span>
                        ${item.price ? `<span><strong>Prix:</strong> ${item.price}₽</span>` : ''}
                        ${item.rarity ? `<span><strong>Rareté:</strong> ${item.rarity}</span>` : ''}
                    </div>
                </div>
                ${item.sprite ? `
                    <div style="margin-left: 15px;">
                        <img src="/assets/items/${item.sprite}" 
                             alt="${item.name}" 
                             style="width: 48px; height: 48px; object-fit: contain;"
                             onerror="this.style.display='none'">
                    </div>
                ` : ''}
            </div>
        `
        
        preview.style.display = 'block'
    }

    // ✅ NOUVELLE MÉTHODE: Suggérer une catégorie appropriée
    suggestCategory(item) {
        const categorySelect = document.getElementById('itemCategory')
        if (!categorySelect || !item.category) return

        // Mapping des catégories d'items vers les catégories d'inventaire
        const categoryMapping = {
            'medicine': 'medicine',
            'pokeball': 'balls',
            'berry': 'berries',
            'key': 'key_items',
            'tm': 'tms',
            'battle': 'battle_items',
            'valuable': 'valuables',
            'held': 'held_items'
        }

        const suggestedCategory = categoryMapping[item.category.toLowerCase()] || 'items'
        
        // Mettre à jour la sélection si l'option existe
        const option = categorySelect.querySelector(`option[value="${suggestedCategory}"]`)
        if (option) {
            categorySelect.value = suggestedCategory
            // Effet visuel pour indiquer la suggestion
            categorySelect.style.borderColor = '#28a745'
            setTimeout(() => {
                categorySelect.style.borderColor = '#e9ecef'
            }, 1000)
        }
    }

    // ✅ NOUVELLE MÉTHODE: Confirmer l'ajout de l'item
    async confirmAddItem() {
        const itemInput = document.getElementById('itemSearchInput')
        const categorySelect = document.getElementById('itemCategory')
        const quantityInput = document.getElementById('itemQuantity')

        if (!this.selectedItemId) {
            this.adminPanel.showNotification('Veuillez sélectionner un objet valide', 'warning')
            itemInput?.focus()
            return
        }

        const category = categorySelect?.value
        const quantity = parseInt(quantityInput?.value || '1')

        if (!category) {
            this.adminPanel.showNotification('Veuillez sélectionner une catégorie', 'warning')
            categorySelect?.focus()
            return
        }

        if (isNaN(quantity) || quantity < 1) {
            this.adminPanel.showNotification('Quantité invalide (minimum 1)', 'warning')
            quantityInput?.focus()
            return
        }

        try {
            // Afficher un loading
            const confirmBtn = document.querySelector('#addItemModal .btn-success')
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...'
                confirmBtn.disabled = true
            }

            await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/inventory/add`, {
                method: 'POST',
                body: JSON.stringify({
                    category: category,
                    itemId: this.selectedItemId,
                    quantity: quantity
                })
            })

            this.adminPanel.showNotification(`${quantity}x ${this.itemsCache[this.selectedItemId]?.name} ajouté à l'inventaire`, 'success')
            
            // Fermer le modal
            this.closeAddItemModal()
            
            // Recharger les données et l'affichage
            await this.loadPlayerAdvancedData(this.currentPlayerData.username)
            this.renderInventoryContent()

        } catch (error) {
            this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
            
            // Restaurer le bouton
            const confirmBtn = document.querySelector('#addItemModal .btn-success')
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter à l\'Inventaire'
                confirmBtn.disabled = false
            }
        }
    }

    // ✅ NOUVELLE MÉTHODE: Fermer le modal d'ajout
    closeAddItemModal() {
        const modal = document.getElementById('addItemModal')
        if (modal) {
            modal.classList.remove('active')
            setTimeout(() => modal.remove(), 300)
        }
        this.selectedItemId = null
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

    // ✅ MÉTHODE COMPLÈTEMENT NOUVELLE: Interface d'ajout de Pokémon avec autocomplétion
async addPokemonToTeam() {
    if (!this.currentPlayerData) {
        this.adminPanel.showNotification('Aucun joueur sélectionné', 'error')
        return
    }

    // Vérifier le nombre de Pokémon dans l'équipe
    const currentTeamSize = this.currentPlayerData.team?.pokemon?.length || 0
    if (currentTeamSize >= 6) {
        this.adminPanel.showNotification('L\'équipe est déjà complète (6/6)', 'warning')
        return
    }

    // Charger les Pokémon si pas encore fait
    const pokemon = await this.loadPokemonFromAPI()
    if (!pokemon || pokemon.length === 0) {
        this.adminPanel.showNotification('Impossible de charger la liste des Pokémon', 'error')
        return
    }

    // Créer le modal d'ajout de Pokémon avec autocomplétion
    this.showAddPokemonModal(pokemon)
}

    // ✅ NOUVELLE MÉTHODE: Créer le modal d'ajout de Pokémon
showAddPokemonModal(pokemonList) {
    // Supprimer le modal existant s'il y en a un
    const existingModal = document.getElementById('addPokemonModal')
    if (existingModal) {
        existingModal.remove()
    }

    // Créer le modal
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.id = 'addPokemonModal'
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <h3 style="margin-bottom: 25px; color: #2c3e50;">
                <i class="fas fa-plus-circle"></i> Ajouter un Pokémon à l'Équipe
                <span style="font-size: 0.8rem; color: #6c757d; font-weight: normal;">
                    - ${this.currentPlayerData.username}
                </span>
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <!-- Colonne gauche: Sélection du Pokémon -->
                <div>
                    <h5 style="margin-bottom: 15px; color: #495057;">
                        <i class="fas fa-search"></i> Sélection du Pokémon
                    </h5>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            Rechercher un Pokémon:
                        </label>
                        <div style="position: relative;">
                            <input type="text" 
                                   id="pokemonSearchInput" 
                                   placeholder="Tapez pour rechercher un Pokémon..."
                                   style="width: 100%; padding: 12px 40px 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;"
                                   autocomplete="off">
                            <i class="fas fa-search" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #6c757d;"></i>
                            
                            <!-- Liste d'autocomplétion -->
                            <div id="pokemonSuggestions" style="
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                background: white;
                                border: 2px solid #e9ecef;
                                border-top: none;
                                border-radius: 0 0 8px 8px;
                                max-height: 300px;
                                overflow-y: auto;
                                z-index: 1000;
                                display: none;
                            "></div>
                        </div>
                    </div>

                    <!-- Prévisualisation du Pokémon sélectionné -->
                    <div id="pokemonPreview" style="
                        background: #f8f9fa; 
                        border: 2px solid #e9ecef; 
                        border-radius: 8px; 
                        padding: 15px; 
                        display: none;
                    ">
                        <h6 style="margin: 0 0 10px 0; color: #2c3e50;">Pokémon sélectionné:</h6>
                        <div id="pokemonPreviewContent"></div>
                    </div>
                </div>

                <!-- Colonne droite: Configuration -->
                <div>
                    <h5 style="margin-bottom: 15px; color: #495057;">
                        <i class="fas fa-cogs"></i> Configuration
                    </h5>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-chart-line"></i> Niveau:
                        </label>
                        <input type="number" 
                               id="pokemonLevel" 
                               value="5" 
                               min="1" 
                               max="100"
                               style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-signature"></i> Surnom (optionnel):
                        </label>
                        <input type="text" 
                               id="pokemonNickname" 
                               placeholder="Surnom personnalisé..."
                               maxlength="12"
                               style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-venus-mars"></i> Genre:
                        </label>
                        <select id="pokemonGender" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                            <option value="male">♂ Mâle</option>
                            <option value="female">♀ Femelle</option>
                            <option value="genderless">⚪ Sans Genre</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-brain"></i> Nature:
                        </label>
                        <select id="pokemonNature" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                            <option value="hardy">Hardy (Neutre)</option>
                            <option value="lonely">Lonely (+Att, -Def)</option>
                            <option value="brave">Brave (+Att, -Vit)</option>
                            <option value="adamant">Adamant (+Att, -AttSp)</option>
                            <option value="naughty">Naughty (+Att, -DefSp)</option>
                            <option value="bold">Bold (+Def, -Att)</option>
                            <option value="docile">Docile (Neutre)</option>
                            <option value="relaxed">Relaxed (+Def, -Vit)</option>
                            <option value="impish">Impish (+Def, -AttSp)</option>
                            <option value="lax">Lax (+Def, -DefSp)</option>
                            <option value="timid">Timid (+Vit, -Att)</option>
                            <option value="hasty">Hasty (+Vit, -Def)</option>
                            <option value="serious">Serious (Neutre)</option>
                            <option value="jolly">Jolly (+Vit, -AttSp)</option>
                            <option value="naive">Naive (+Vit, -DefSp)</option>
                            <option value="modest">Modest (+AttSp, -Att)</option>
                            <option value="mild">Mild (+AttSp, -Def)</option>
                            <option value="quiet">Quiet (+AttSp, -Vit)</option>
                            <option value="bashful">Bashful (Neutre)</option>
                            <option value="rash">Rash (+AttSp, -DefSp)</option>
                            <option value="calm">Calm (+DefSp, -Att)</option>
                            <option value="gentle">Gentle (+DefSp, -Def)</option>
                            <option value="sassy">Sassy (+DefSp, -Vit)</option>
                            <option value="careful">Careful (+DefSp, -AttSp)</option>
                            <option value="quirky">Quirky (Neutre)</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                                <i class="fas fa-sparkles"></i> Shiny:
                            </label>
                            <select id="pokemonShiny" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                                <option value="false">Normal</option>
                                <option value="true">✨ Shiny</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                                <i class="fas fa-star"></i> Position:
                            </label>
                            <select id="pokemonPosition" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                                <option value="auto">Position Automatique</option>
                                <option value="0">Position 1</option>
                                <option value="1">Position 2</option>
                                <option value="2">Position 3</option>
                                <option value="3">Position 4</option>
                                <option value="4">Position 5</option>
                                <option value="5">Position 6</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section avancée (collapsible) -->
            <div style="margin-bottom: 25px;">
                <button type="button" 
                        id="toggleAdvancedOptions" 
                        onclick="adminPanel.playersAdvanced.toggleAdvancedPokemonOptions()"
                        style="background: none; border: none; color: #007bff; font-weight: 600; padding: 0; cursor: pointer;">
                    <i class="fas fa-chevron-down" id="advancedToggleIcon"></i> Options Avancées
                </button>
                
                <div id="advancedPokemonOptions" style="display: none; margin-top: 15px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">HP IV:</label>
                            <input type="number" id="ivHp" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">ATT IV:</label>
                            <input type="number" id="ivAttack" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">DEF IV:</label>
                            <input type="number" id="ivDefense" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">SPA IV:</label>
                            <input type="number" id="ivSpecialAttack" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">SPD IV:</label>
                            <input type="number" id="ivSpecialDefense" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 600;">SPE IV:</label>
                            <input type="number" id="ivSpeed" value="31" min="0" max="31" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <button type="button" onclick="adminPanel.playersAdvanced.randomizeIVs()" class="btn btn-outline-secondary btn-sm">
                            <i class="fas fa-dice"></i> IVs Aléatoires
                        </button>
                        <button type="button" onclick="adminPanel.playersAdvanced.perfectIVs()" class="btn btn-outline-success btn-sm">
                            <i class="fas fa-star"></i> IVs Parfaits
                        </button>
                        <button type="button" onclick="adminPanel.playersAdvanced.zeroIVs()" class="btn btn-outline-warning btn-sm">
                            <i class="fas fa-minus"></i> IVs Minimaux
                        </button>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-fist-raised"></i> Capacité:
                        </label>
                        <select id="pokemonAbility" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;">
                            <option value="auto">Capacité Automatique</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
                            <i class="fas fa-gamepad"></i> Attaques Personnalisées:
                        </label>
                        <textarea id="pokemonMoves" 
                                  placeholder="Tapez les IDs des attaques séparées par des virgules (ex: tackle,growl,vine_whip,sleep_powder)&#10;Laissez vide pour les attaques par défaut du niveau"
                                  rows="3"
                                  style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
                        <small style="color: #6c757d; font-size: 0.85rem;">
                            Maximum 4 attaques. Si vide, les attaques seront générées automatiquement selon le niveau.
                        </small>
                    </div>
                </div>
            </div>

            <div style="text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="adminPanel.playersAdvanced.closeAddPokemonModal()">
                    <i class="fas fa-times"></i> Annuler
                </button>
                <button class="btn btn-success" onclick="adminPanel.playersAdvanced.confirmAddPokemon()">
                    <i class="fas fa-plus"></i> Ajouter à l'Équipe
                </button>
            </div>
        </div>
    `
    
    preview.style.display = 'block'
}

    // ✅ NOUVELLE MÉTHODE: Configurer les options selon le Pokémon
configurePokemonOptions(pokemon) {
    // Configurer le genre selon le ratio
    const genderSelect = document.getElementById('pokemonGender')
    if (genderSelect && pokemon.genderRatio) {
        if (pokemon.genderRatio.genderless) {
            genderSelect.value = 'genderless'
            genderSelect.disabled = true
        } else {
            genderSelect.disabled = false
            // Choisir le genre le plus probable
            if (pokemon.genderRatio.male > pokemon.genderRatio.female) {
                genderSelect.value = 'male'
            } else if (pokemon.genderRatio.female > pokemon.genderRatio.male) {
                genderSelect.value = 'female'
            } else {
                genderSelect.value = 'male' // Par défaut si égal
            }
        }
    }

    // Configurer les capacités
    const abilitySelect = document.getElementById('pokemonAbility')
    if (abilitySelect && pokemon.abilities) {
        abilitySelect.innerHTML = '<option value="auto">Capacité Automatique</option>'
        
        pokemon.abilities.forEach(ability => {
            const option = document.createElement('option')
            option.value = ability
            option.textContent = this.formatAbilityName(ability)
            abilitySelect.appendChild(option)
        })

        if (pokemon.hiddenAbility) {
            const option = document.createElement('option')
            option.value = pokemon.hiddenAbility
            option.textContent = `${this.formatAbilityName(pokemon.hiddenAbility)} (Cachée)`
            abilitySelect.appendChild(option)
        }
    }
}

// ✅ NOUVELLE MÉTHODE: Initialiser l'autocomplétion Pokémon
initializePokemonAutocomplete(pokemonList) {
    const input = document.getElementById('pokemonSearchInput')
    const suggestions = document.getElementById('pokemonSuggestions')
    const preview = document.getElementById('pokemonPreview')
    
    if (!input || !suggestions) return

    let currentFocus = -1

    // Fonction de recherche
    const searchPokemon = (query) => {
        if (query.length < 2) {
            suggestions.style.display = 'none'
            currentFocus = -1
            return
        }

        const matches = pokemonList.filter(pokemon => 
            pokemon.nameKey.toLowerCase().includes(query.toLowerCase()) ||
            pokemon.nationalDex.toString().includes(query) ||
            (pokemon.species && pokemon.species.toLowerCase().includes(query.toLowerCase())) ||
            (pokemon.types && pokemon.types.some(type => type.toLowerCase().includes(query.toLowerCase())))
        ).slice(0, 10) // Limiter à 10 résultats

        if (matches.length === 0) {
            suggestions.innerHTML = `
                <div style="padding: 15px; text-align: center; color: #6c757d;">
                    <i class="fas fa-search"></i> Aucun Pokémon trouvé pour "${query}"
                </div>
            `
            suggestions.style.display = 'block'
            return
        }

        suggestions.innerHTML = matches.map((pokemon, index) => `
            <div class="pokemon-suggestion" 
                 data-pokemon-id="${pokemon.nationalDex}"
                 data-index="${index}"
                 style="
                    padding: 12px 16px; 
                    border-bottom: 1px solid #f0f0f0; 
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                 "
                 onmouseenter="this.style.backgroundColor='#f8f9fa'"
                 onmouseleave="this.style.backgroundColor='white'">
                <div>
                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                        #${pokemon.nationalDex.toString().padStart(3, '0')} ${this.formatPokemonName(pokemon.nameKey)}
                    </div>
                    <div style="font-size: 0.85rem; color: #6c757d;">
                        ${pokemon.types.join(' / ')} • Génération ${pokemon.generation}
                        ${pokemon.species ? ` • ${pokemon.species}` : ''}
                    </div>
                </div>
                <div style="color: #007bff;">
                    <i class="fas fa-plus-circle"></i>
                </div>
            </div>
        `).join('')

        suggestions.style.display = 'block'
        currentFocus = -1
    }

    // Fonction de sélection de Pokémon
    const selectPokemon = (pokemonId) => {
        const pokemon = pokemonList.find(p => p.nationalDex === parseInt(pokemonId))
        if (!pokemon) return

        this.selectedPokemonId = pokemonId
        input.value = `#${pokemonId.toString().padStart(3, '0')} ${this.formatPokemonName(pokemon.nameKey)}`
        suggestions.style.display = 'none'
        
        // Afficher la prévisualisation
        this.showPokemonPreview(pokemon)
        
        // Configurer les options selon le Pokémon
        this.configurePokemonOptions(pokemon)
    }

    // Événements
    input.addEventListener('input', (e) => {
        this.selectedPokemonId = null
        preview.style.display = 'none'
        searchPokemon(e.target.value.trim())
    })

    input.addEventListener('keydown', (e) => {
        const suggestionItems = suggestions.querySelectorAll('.pokemon-suggestion')
        
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            currentFocus = Math.min(currentFocus + 1, suggestionItems.length - 1)
            this.updateSuggestionFocus(suggestionItems, currentFocus)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            currentFocus = Math.max(currentFocus - 1, -1)
            this.updateSuggestionFocus(suggestionItems, currentFocus)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (currentFocus >= 0 && suggestionItems[currentFocus]) {
                const pokemonId = suggestionItems[currentFocus].dataset.pokemonId
                selectPokemon(pokemonId)
            }
        } else if (e.key === 'Escape') {
            suggestions.style.display = 'none'
            currentFocus = -1
        }
    })

    // Clic sur une suggestion
    suggestions.addEventListener('click', (e) => {
        const suggestion = e.target.closest('.pokemon-suggestion')
        if (suggestion) {
            const pokemonId = suggestion.dataset.pokemonId
            selectPokemon(pokemonId)
        }
    })

    // Fermer les suggestions en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none'
            currentFocus = -1
        }
    })
}

    // ✅ NOUVELLE MÉTHODE: Afficher la prévisualisation du Pokémon
showPokemonPreview(pokemon) {
    const preview = document.getElementById('pokemonPreview')
    const previewContent = document.getElementById('pokemonPreviewContent')
    
    if (!preview || !previewContent) return

    const typeColors = {
        'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030',
        'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0',
        'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820',
        'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848',
        'Steel': '#B8B8D0', 'Fairy': '#EE99AC'
    }

    previewContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
                <h6 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.1rem;">
                    #${pokemon.nationalDex.toString().padStart(3, '0')} ${this.formatPokemonName(pokemon.nameKey)}
                </h6>
                <div style="margin-bottom: 10px;">
                    ${pokemon.types.map(type => `
                        <span style="
                            background: ${typeColors[type] || '#68727D'}; 
                            color: white; 
                            padding: 4px 8px; 
                            border-radius: 12px; 
                            font-size: 0.8rem; 
                            margin-right: 5px;
                            font-weight: bold;
                        ">${type}</span>
                    `).join('')}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 0.85rem; margin-bottom: 10px;">
                    <span><strong>HP:</strong> ${pokemon.baseStats.hp}</span>
                    <span><strong>ATT:</strong> ${pokemon.baseStats.attack}</span>
                    <span><strong>DEF:</strong> ${pokemon.baseStats.defense}</span>
                    <span><strong>SPA:</strong> ${pokemon.baseStats.specialAttack}</span>
                    <span><strong>SPD:</strong> ${pokemon.baseStats.specialDefense}</span>
                    <span><strong>SPE:</strong> ${pokemon.baseStats.speed}</span>
                </div>
                <div style="font-size: 0.85rem; color: #6c757d;">
                    <div><strong>Capacités:</strong> ${pokemon.abilities.join(', ')}</div>
                    ${pokemon.hiddenAbility ? `<div><strong>Capacité Cachée:</strong> ${pokemon.hiddenAbility}</div>` : ''}
                    <div><strong>Taille:</strong> ${pokemon.height}m • <strong>Poids:</strong> ${pokemon.weight}kg</div>
                </div>
            </div>
            ${pokemon.sprite ? `
                <div style="margin-left: 15px;">
                    <img src="${pokemon.sprite}" 
                         alt="${this.formatPokemonName(pokemon.nameKey)}" 
                         style="width: 64px; height: 64px; object-fit: contain;"
                         onerror="this.style.display='none'">
                </div>
            ` : ''}
        </div>
    `
    
    // ✅ CETTE LIGNE MANQUAIT !
    preview.style.display = 'block'
}
    
    // ✅ NOUVELLE MÉTHODE: Toggle des options avancées
toggleAdvancedPokemonOptions() {
    const options = document.getElementById('advancedPokemonOptions')
    const icon = document.getElementById('advancedToggleIcon')
    
    if (options.style.display === 'none') {
        options.style.display = 'block'
        icon.className = 'fas fa-chevron-up'
    } else {
        options.style.display = 'none'
        icon.className = 'fas fa-chevron-down'
    }
}

// ✅ NOUVELLE MÉTHODE: Randomiser les IVs
randomizeIVs() {
    const ivFields = ['ivHp', 'ivAttack', 'ivDefense', 'ivSpecialAttack', 'ivSpecialDefense', 'ivSpeed']
    ivFields.forEach(fieldId => {
        const field = document.getElementById(fieldId)
        if (field) {
            field.value = Math.floor(Math.random() * 32) // 0-31
        }
    })
}

// ✅ NOUVELLE MÉTHODE: IVs parfaits
perfectIVs() {
    const ivFields = ['ivHp', 'ivAttack', 'ivDefense', 'ivSpecialAttack', 'ivSpecialDefense', 'ivSpeed']
    ivFields.forEach(fieldId => {
        const field = document.getElementById(fieldId)
        if (field) {
            field.value = 31
        }
    })
}

// ✅ NOUVELLE MÉTHODE: IVs minimaux
zeroIVs() {
    const ivFields = ['ivHp', 'ivAttack', 'ivDefense', 'ivSpecialAttack', 'ivSpecialDefense', 'ivSpeed']
    ivFields.forEach(fieldId => {
        const field = document.getElementById(fieldId)
        if (field) {
            field.value = 0
        }
    })
}

    // ✅ NOUVELLE MÉTHODE: Confirmer l'ajout du Pokémon
async confirmAddPokemon() {
    if (!this.selectedPokemonId) {
        this.adminPanel.showNotification('Veuillez sélectionner un Pokémon valide', 'warning')
        document.getElementById('pokemonSearchInput')?.focus()
        return
    }

    // Récupérer tous les paramètres
    const level = parseInt(document.getElementById('pokemonLevel')?.value || '5')
    const nickname = document.getElementById('pokemonNickname')?.value.trim() || null
    const gender = document.getElementById('pokemonGender')?.value || 'male'
    const nature = document.getElementById('pokemonNature')?.value || 'hardy'
    const isShiny = document.getElementById('pokemonShiny')?.value === 'true'
    const position = document.getElementById('pokemonPosition')?.value
    const ability = document.getElementById('pokemonAbility')?.value
    const customMoves = document.getElementById('pokemonMoves')?.value.trim()

    // Récupérer les IVs des options avancées
    const ivs = {
        hp: parseInt(document.getElementById('ivHp')?.value || '31'),
        attack: parseInt(document.getElementById('ivAttack')?.value || '31'),
        defense: parseInt(document.getElementById('ivDefense')?.value || '31'),
        specialAttack: parseInt(document.getElementById('ivSpecialAttack')?.value || '31'),
        specialDefense: parseInt(document.getElementById('ivSpecialDefense')?.value || '31'),
        speed: parseInt(document.getElementById('ivSpeed')?.value || '31')
    }

    // Validation
    if (isNaN(level) || level < 1 || level > 100) {
        this.adminPanel.showNotification('Niveau invalide (1-100)', 'warning')
        document.getElementById('pokemonLevel')?.focus()
        return
    }

    if (nickname && nickname.length > 12) {
        this.adminPanel.showNotification('Le surnom ne peut pas dépasser 12 caractères', 'warning')
        document.getElementById('pokemonNickname')?.focus()
        return
    }

    // Préparer les données
    const pokemonData = {
        pokemonId: parseInt(this.selectedPokemonId),
        level: level,
        nickname: nickname,
        gender: gender,
        nature: nature,
        isShiny: isShiny,
        ability: ability === 'auto' ? null : ability,
        ivs: ivs,
        position: position === 'auto' ? null : parseInt(position)
    }

    // Ajouter les attaques personnalisées si spécifiées
    if (customMoves) {
        const moves = customMoves.split(',').map(m => m.trim()).filter(m => m.length > 0)
        if (moves.length > 4) {
            this.adminPanel.showNotification('Maximum 4 attaques autorisées', 'warning')
            document.getElementById('pokemonMoves')?.focus()
            return
        }
        pokemonData.customMoves = moves
    }

    try {
        // Afficher un loading
        const confirmBtn = document.querySelector('#addPokemonModal .btn-success')
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...'
            confirmBtn.disabled = true
        }

        await this.adminPanel.apiCall(`/players/${this.currentPlayerData.username}/team/add`, {
            method: 'POST',
            body: JSON.stringify(pokemonData)
        })

        const pokemonName = this.pokemonCache?.find(p => p.nationalDex === parseInt(this.selectedPokemonId))?.nameKey || `Pokémon #${this.selectedPokemonId}`
        this.adminPanel.showNotification(`${this.formatPokemonName(pokemonName)} ajouté à l'équipe`, 'success')
        
        // Fermer le modal
        this.closeAddPokemonModal()
        
        // Recharger les données et l'affichage
        await this.loadPlayerAdvancedData(this.currentPlayerData.username)
        this.renderTeamContent()

    } catch (error) {
        this.adminPanel.showNotification('Erreur: ' + error.message, 'error')
        
        // Restaurer le bouton
        const confirmBtn = document.querySelector('#addPokemonModal .btn-success')
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter à l\'Équipe'
            confirmBtn.disabled = false
        }
    }
}

    // ✅ NOUVELLE MÉTHODE: Formater le nom d'un Pokémon
formatPokemonName(nameKey) {
    // Extraire le nom depuis la clé de localisation
    if (nameKey.startsWith('pokemon.name.')) {
        return nameKey.replace('pokemon.name.', '').split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }
    return nameKey
}

// ✅ NOUVELLE MÉTHODE: Formater le nom d'une capacité
formatAbilityName(abilityId) {
    return abilityId.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
}

    
    
    // ✅ NOUVELLE MÉTHODE: Fermer le modal d'ajout de Pokémon
closeAddPokemonModal() {
    const modal = document.getElementById('addPokemonModal')
    if (modal) {
        modal.classList.remove('active')
        setTimeout(() => modal.remove(), 300)
    }
    this.selectedPokemonId = null
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
            
            /* Styles pour l'autocomplétion */
            .item-suggestion:hover {
                background: #f8f9fa !important;
            }
            
            .item-suggestion.focused {
                background: #007bff !important;
                color: white !important;
            }
            
            #itemSuggestions {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            #itemPreview {
                animation: slideDown 0.3s ease;
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            /* ✅ AJOUTER CES STYLES POUR POKÉMON : */
        
        /* Styles pour les modals de Pokémon */
        #addPokemonModal .modal-content {
            max-width: 800px !important;
        }
        
        /* Styles pour les options avancées */
        #advancedPokemonOptions {
            border-left: 4px solid #007bff;
        }
        
        /* Styles pour les suggestions de Pokémon */
        .pokemon-suggestion:hover {
            background: #f8f9fa !important;
        }
        
        .pokemon-suggestion.focused {
            background: #007bff !important;
            color: white !important;
        }
        
        #pokemonSuggestions {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        #pokemonPreview {
            animation: slideDown 0.3s ease;
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
        this.itemsCache = null
        this.itemsLoaded = false
        this.selectedItemId = null
        
        // Supprimer les styles injectés
        const styles = document.getElementById('advanced-player-styles')
        if (styles) styles.remove()
        
        // Supprimer le modal principal
        const modal = document.getElementById('advancedPlayerModal')
        if (modal) modal.remove()
        
        // Supprimer le modal d'ajout d'item s'il existe
        const addItemModal = document.getElementById('addItemModal')
        if (addItemModal) addItemModal.remove()
            // ✅ AJOUTER CETTE LIGNE :
    const addPokemonModal = document.getElementById('addPokemonModal')
    if (addPokemonModal) addPokemonModal.remove()
        console.log('🧹 [PlayersAdvanced] Module cleanup completed')
    }
}

export default PlayersAdvancedModule
