export class ItemEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.name = 'itemEditor';
        
        // État du module
        this.items = [];
        this.filteredItems = [];
        this.selectedItemId = null;
        this.currentItem = null;
        this.unsavedChanges = false;
        
        // Filtres et pagination
        this.currentFilters = {
            search: '',
            category: 'all',
            generation: 'all',
            rarity: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.totalPages = 1;
        this.serverSideFiltering = false;
        
        // Cache pour les statistiques
        this.stats = null;
        
        console.log('✅ [ItemEditor] Module initialisé');
    }

    // ===== LIFECYCLE METHODS =====

    async onTabActivated() {
        console.log('📦 [ItemEditor] Activation de l\'onglet Items');
        
        try {
            // Attendre que le DOM soit prêt
            await this.waitForDOM();
            
            // Charger les statistiques d'abord pour les filtres
            await this.loadStats();
            
            // Initialiser les dropdowns avec les vraies valeurs
            this.initializeDropdowns();
            
            // Charger les items
            await this.loadItems();
            
            // Configurer les event listeners
            this.setupEventListeners();
            
            // Mettre à jour l'interface
            this.updateUI();
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur activation:', error);
            this.adminPanel.showNotification('Erreur lors du chargement des items', 'error');
        }
    }
    
    async waitForDOM() {
        return new Promise((resolve) => {
            const checkDOM = () => {
                const itemsList = document.getElementById('itemsList');
                const itemForm = document.getElementById('itemEditorForm');
                
                if (itemsList && itemForm) {
                    console.log('✅ [ItemEditor] DOM prêt');
                    resolve();
                } else {
                    console.log('⏳ [ItemEditor] Attente DOM...');
                    setTimeout(checkDOM, 100);
                }
            };
            checkDOM();
        });
    }

    setupEventListeners() {
        console.log('🔧 [ItemEditor] Configuration des event listeners');
        
        // Recherche en temps réel avec debounce
        const searchInput = document.getElementById('itemSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.currentPage = 1; // Reset à la première page
                    this.filterItems();
                }, 300); // Debounce de 300ms
            });
        }
        
        // Filtres de catégorie
        const categoryFilter = document.getElementById('itemCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                console.log('🔄 [ItemEditor] Changement catégorie:', e.target.value);
                this.currentFilters.category = e.target.value;
                this.currentPage = 1;
                this.filterItems();
            });
        }
        
        // Filtres de génération
        const generationFilter = document.getElementById('itemGenerationFilter');
        if (generationFilter) {
            generationFilter.addEventListener('change', (e) => {
                console.log('🔄 [ItemEditor] Changement génération:', e.target.value);
                this.currentFilters.generation = e.target.value;
                this.currentPage = 1;
                this.filterItems();
            });
        }
        
        // Filtres de rareté
        const rarityFilter = document.getElementById('itemRarityFilter');
        if (rarityFilter) {
            rarityFilter.addEventListener('change', (e) => {
                console.log('🔄 [ItemEditor] Changement rareté:', e.target.value);
                this.currentFilters.rarity = e.target.value;
                this.currentPage = 1;
                this.filterItems();
            });
        }
        
        // Formulaire d'édition
        const itemForm = document.getElementById('itemEditorForm');
        if (itemForm) {
            itemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveItem();
            });
            
            // Détection des changements avec debounce
            let changeTimeout;
            itemForm.addEventListener('input', () => {
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(() => {
                    this.unsavedChanges = true;
                    this.updateSaveButton();
                }, 100);
            });
        }
        
        // Gestion des raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's' && this.selectedItemId) {
                e.preventDefault();
                this.saveItem();
            }
            
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    this.adminPanel.closeModal();
                } else if (this.selectedItemId && this.unsavedChanges) {
                    if (confirm('Annuler les modifications non sauvegardées ?')) {
                        this.cancelEdit();
                    }
                }
            }
        });
    }

    // ===== CHARGEMENT DES DONNÉES =====

    async loadStats() {
        console.log('📊 [ItemEditor] Chargement statistiques...');
        
        try {
            const response = await this.adminPanel.apiCall('/items/stats');
            
            if (response.success) {
                this.stats = response.stats;
                console.log('✅ [ItemEditor] Statistiques chargées:', this.stats);
            } else {
                throw new Error(response.error || 'Erreur chargement statistiques');
            }
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur statistiques:', error);
            this.stats = { total: 0, active: 0 };
        }
    }

    initializeDropdowns() {
        console.log('🎛️ [ItemEditor] Initialisation des dropdowns');
        
        // Initialiser le dropdown de catégorie
        const categoryFilter = document.getElementById('itemCategoryFilter');
        if (categoryFilter && this.stats) {
            const currentValue = categoryFilter.value;
            
            // Vider et recréer les options
            categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>';
            
            // Trier les catégories par nom pour un affichage cohérent
            const sortedCategories = Object.entries(this.stats.byCategory || {})
                .sort(([a], [b]) => this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)));
            
            sortedCategories.forEach(([category, count]) => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = `${this.formatCategoryName(category)} (${count})`;
                categoryFilter.appendChild(option);
            });
            
            // Restaurer la valeur
            categoryFilter.value = currentValue;
            
            console.log(`✅ [ItemEditor] ${sortedCategories.length} catégories ajoutées au dropdown`);
        }
        // Initialiser le dropdown de génération
        const generationFilter = document.getElementById('itemGenerationFilter');
        if (generationFilter && this.stats) {
            const currentValue = generationFilter.value;
            
            generationFilter.innerHTML = '<option value="all">Toutes les générations</option>';
            
            // Trier les générations par ordre numérique
            const sortedGenerations = Object.entries(this.stats.byGeneration || {})
                .sort(([a], [b]) => {
                    const genA = parseInt(a.replace('gen_', ''));
                    const genB = parseInt(b.replace('gen_', ''));
                    return genA - genB;
                });
            
            sortedGenerations.forEach(([genKey, count]) => {
                const genNumber = genKey.replace('gen_', '');
                const option = document.createElement('option');
                option.value = genNumber;
                option.textContent = `Génération ${genNumber} (${count})`;
                generationFilter.appendChild(option);
            });
            
            generationFilter.value = currentValue;
        }
        
        // Initialiser le dropdown de rareté
        const rarityFilter = document.getElementById('itemRarityFilter');
        if (rarityFilter && this.stats) {
            const currentValue = rarityFilter.value;
            
            rarityFilter.innerHTML = '<option value="all">Toutes les raretés</option>';
            
            // Ordre spécifique pour les raretés
            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
            const sortedRarities = Object.entries(this.stats.byRarity || {})
                .sort(([a], [b]) => {
                    const indexA = rarityOrder.indexOf(a);
                    const indexB = rarityOrder.indexOf(b);
                    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                });
            
            sortedRarities.forEach(([rarity, count]) => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = `${this.formatRarityName(rarity)} (${count})`;
                rarityFilter.appendChild(option);
            });
            
            rarityFilter.value = currentValue;
        }
        
        // Mettre à jour l'affichage du total
        const totalDisplay = document.querySelector('.item-editor__stats-total');
        if (totalDisplay && this.stats) {
            totalDisplay.textContent = `${this.stats.active} items actifs sur ${this.stats.total} total`;
        }
    }

    async loadItems() {
        console.log('📦 [ItemEditor] Chargement des items...');
        
        const loadingElement = document.getElementById('itemsLoading');
        const listElement = document.getElementById('itemsList');
        
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            // Pour les filtres de recherche, on utilise l'API search
            if (this.currentFilters.search && this.currentFilters.search.trim().length >= 2) {
                await this.performAdvancedSearch();
                return;
            }
            
            // Charger TOUS les items d'un coup pour la pagination côté client
            // Ne plus utiliser les filtres de catégorie côté serveur
            const params = new URLSearchParams({
                page: 1,
                limit: 100 // Charger plus d'items d'un coup
            });
            
            console.log(`📦 [ItemEditor] Requête API avec params:`, params.toString());
            
            // Appel API sans filtres pour avoir TOUS les items
            const response = await this.adminPanel.apiCall(`/items/list?${params.toString()}`);
            
            if (response.success) {
                this.items = response.items || [];
                this.totalItems = response.total || 0;
                this.serverSideFiltering = false;
                
                // Si on a moins d'items que le total, il faut charger le reste
                if (this.items.length < this.totalItems) {
                    console.log(`📦 [ItemEditor] Chargement des items restants... (${this.items.length}/${this.totalItems})`);
                    await this.loadAllItems();
                } else {
                    // Appliquer les filtres côté client
                    this.applyClientSideFilters();
                }
                
                console.log(`✅ [ItemEditor] ${this.items.length} items chargés (${this.totalItems} total)`);
                this.updateItemsList();
                this.updatePagination();
            } else {
                throw new Error(response.error || 'Erreur chargement items');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur chargement:', error);
            this.adminPanel.showNotification('Erreur lors du chargement des items: ' + error.message, 'error');
            
            if (listElement) {
                listElement.innerHTML = `
                    <div class="item-editor__error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erreur lors du chargement des items
                        <button onclick="window.itemEditorRefresh()" class="item-editor__error-retry">
                            <i class="fas fa-redo"></i> Réessayer
                        </button>
                    </div>
                `;
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // Nouvelle méthode pour charger TOUS les items
    async loadAllItems() {
        try {
            const remainingPages = Math.ceil(this.totalItems / 100);
            const allItems = [...this.items];
            
            // Charger toutes les pages restantes
            for (let page = 2; page <= remainingPages; page++) {
                const params = new URLSearchParams({
                    page: page,
                    limit: 100
                });
                
                const response = await this.adminPanel.apiCall(`/items/list?${params.toString()}`);
                
                if (response.success && response.items) {
                    allItems.push(...response.items);
                    console.log(`📦 [ItemEditor] Page ${page}/${remainingPages} chargée (${allItems.length} items total)`);
                }
            }
            
            this.items = allItems;
            this.applyClientSideFilters();
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur chargement complet:', error);
            // Continuer avec les items déjà chargés
            this.applyClientSideFilters();
        }
    }

    // ===== FILTRAGE ET RECHERCHE =====

    async filterItems() {
        console.log('🔍 [ItemEditor] Filtrage des items:', this.currentFilters);
        
        // Reset à la première page quand on filtre
        this.currentPage = 1;
        
        // Si on a une recherche textuelle, utiliser l'API
        if (this.currentFilters.search && this.currentFilters.search.trim().length >= 2) {
            await this.performAdvancedSearch();
        } else {
            // Sinon appliquer les filtres côté client
            this.applyClientSideFilters();
            this.updateItemsList();
            this.updatePagination();
        }
    }
    
    async performAdvancedSearch() {
        console.log('🔍 [ItemEditor] Recherche avancée...');
        
        try {
            const searchData = {
                query: this.currentFilters.search,
                category: this.currentFilters.category !== 'all' ? this.currentFilters.category : undefined,
                generation: this.currentFilters.generation !== 'all' ? this.currentFilters.generation : undefined,
                rarity: this.currentFilters.rarity !== 'all' ? this.currentFilters.rarity : undefined,
                limit: this.itemsPerPage * 3 // Charger plus d'items pour une meilleure recherche
            };
            
            const response = await this.adminPanel.apiCall('/items/search', {
                method: 'POST',
                body: JSON.stringify(searchData)
            });
            
            if (response.success) {
                this.filteredItems = response.results || [];
                this.totalItems = response.total || 0;
                this.currentPage = 1;
                
                console.log(`✅ [ItemEditor] Recherche: ${this.filteredItems.length} résultats`);
                this.updateItemsList();
                this.updatePagination();
            } else {
                throw new Error(response.error || 'Erreur recherche');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur recherche:', error);
            this.adminPanel.showNotification('Erreur lors de la recherche: ' + error.message, 'error');
        }
    }
    
    applyClientSideFilters() {
        this.filteredItems = this.items.filter(item => {
            // Filtre par catégorie
            if (this.currentFilters.category !== 'all' && item.category !== this.currentFilters.category) {
                return false;
            }
            
            // Filtre par génération
            if (this.currentFilters.generation !== 'all' && item.generation !== parseInt(this.currentFilters.generation)) {
                return false;
            }
            
            // Filtre par rareté
            if (this.currentFilters.rarity !== 'all' && item.rarity !== this.currentFilters.rarity) {
                return false;
            }
            
            return true;
        });
        
        console.log(`🔍 [ItemEditor] Filtrage client: ${this.filteredItems.length} items sur ${this.items.length} (catégorie: ${this.currentFilters.category}, gen: ${this.currentFilters.generation}, rareté: ${this.currentFilters.rarity})`);
    }

    // ===== MISE À JOUR DE L'INTERFACE =====

    // Méthode utilitaire pour vérifier les filtres actifs
    hasActiveFilters() {
        return this.currentFilters.search !== '' ||
               this.currentFilters.category !== 'all' ||
               this.currentFilters.generation !== 'all' ||
               this.currentFilters.rarity !== 'all';
    }

    updateItemsList() {
        const listElement = document.getElementById('itemsList');
        if (!listElement) {
            console.error('❌ [ItemEditor] Element itemsList non trouvé');
            return;
        }
        
        const itemsToShow = this.serverSideFiltering ? this.filteredItems : this.getPaginatedItems();
        
        if (itemsToShow.length === 0) {
            listElement.innerHTML = `
                <div class="item-editor__empty-state" style="padding: 2rem; text-align: center;">
                    <div class="item-editor__empty-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-search"></i>
                    </div>
                    <h4 class="item-editor__empty-title">Aucun item trouvé</h4>
                    <p class="item-editor__empty-subtitle">
                        ${this.currentFilters.search ? 'Essayez de modifier votre recherche.' : 'Essayez de modifier vos critères de filtrage.'}
                    </p>
                    ${this.hasActiveFilters() ? 
                        '<button onclick="window.itemEditorClearFilters()" class="item-editor__clear-filters-btn">Effacer les filtres</button>' : ''}
                    <button onclick="window.itemEditorRefresh()" class="item-editor__refresh-btn">
                        <i class="fas fa-sync"></i> Actualiser
                    </button>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = itemsToShow.map(item => `
            <div class="item-editor__item-card ${this.selectedItemId === item.itemId ? 'item-editor__item-card--selected' : ''}"
                 onclick="window.itemEditorSelectItem('${item.itemId}')">
                <div class="item-editor__item-sprite">
                    ${item.sprite ? `<img src="${item.sprite}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` : ''}
                    <i class="fas fa-cube" ${item.sprite ? 'style="display:none"' : ''}></i>
                </div>
                <div class="item-editor__item-info">
                    <div class="item-editor__item-name" title="${this.escapeHtml(item.name)}">
                        ${this.escapeHtml(item.name)}
                    </div>
                    <div class="item-editor__item-meta">
                        <span class="item-editor__item-category">${this.formatCategoryName(item.category)}</span>
                        ${item.price ? `<span class="item-editor__item-price">${item.price}₽</span>` : ''}
                        <span class="item-editor__item-gen">Gen ${item.generation}</span>
                        <span class="item-editor__item-rarity item-editor__rarity--${item.rarity}">${this.formatRarityName(item.rarity)}</span>
                    </div>
                    <div class="item-editor__item-extras">
                        ${item.effectCount > 0 ? `<span class="item-editor__item-effects"><i class="fas fa-magic"></i> ${item.effectCount}</span>` : ''}
                        ${item.obtainMethodCount > 0 ? `<span class="item-editor__item-methods"><i class="fas fa-map-marker-alt"></i> ${item.obtainMethodCount}</span>` : ''}
                        ${!item.isActive ? '<span class="item-editor__item-inactive"><i class="fas fa-eye-slash"></i> Inactif</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    getPaginatedItems() {
        if (this.serverSideFiltering) return this.filteredItems;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredItems.slice(startIndex, endIndex);
    }

    updatePagination() {
        const itemsCount = this.serverSideFiltering ? this.filteredItems.length : this.filteredItems.length;
        const totalPages = this.serverSideFiltering ? 1 : Math.ceil(this.filteredItems.length / this.itemsPerPage);
        
        // Info pagination
        const infoElement = document.getElementById('itemsPaginationInfo');
        if (infoElement) {
            if (this.serverSideFiltering) {
                infoElement.textContent = `${itemsCount} résultats trouvés`;
            } else {
                const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
                const endItem = Math.min(startItem + this.itemsPerPage - 1, this.filteredItems.length);
                infoElement.textContent = `${startItem}-${endItem} sur ${this.filteredItems.length} items`;
            }
        }
        
        // Contrôles pagination
        const pageInfoElement = document.getElementById('itemsPageInfo');
        const prevBtn = document.getElementById('itemsPrevBtn');
        const nextBtn = document.getElementById('itemsNextBtn');
        
        if (pageInfoElement) {
            pageInfoElement.textContent = this.serverSideFiltering ? `Résultats` : `${this.currentPage} / ${totalPages}`;
        }
        
        if (prevBtn) {
            const canGoPrev = !this.serverSideFiltering && this.currentPage > 1;
            prevBtn.disabled = !canGoPrev;
            prevBtn.classList.toggle('item-editor__page-btn--disabled', !canGoPrev);
        }
        
        if (nextBtn) {
            const canGoNext = !this.serverSideFiltering && this.currentPage < totalPages;
            nextBtn.disabled = !canGoNext;
            nextBtn.classList.toggle('item-editor__page-btn--disabled', !canGoNext);
        }
    }

    updateUI() {
        if (this.selectedItemId) {
            this.showItemEditor();
        } else {
            this.showEmptyState();
        }
    }

    showEmptyState() {
        const emptyElement = document.getElementById('itemEditorEmpty');
        const formElement = document.getElementById('itemEditorForm');
        const actionsElement = document.getElementById('itemEditorActions');
        const titleElement = document.getElementById('itemEditorTitle');
        
        if (emptyElement) emptyElement.style.display = 'flex';
        if (formElement) formElement.style.display = 'none';
        if (actionsElement) actionsElement.style.display = 'none';
        if (titleElement) {
            titleElement.innerHTML = '<i class="fas fa-cube"></i> Sélectionnez un item';
        }
    }

    showItemEditor() {
        const emptyElement = document.getElementById('itemEditorEmpty');
        const formElement = document.getElementById('itemEditorForm');
        const actionsElement = document.getElementById('itemEditorActions');
        const titleElement = document.getElementById('itemEditorTitle');
        
        if (emptyElement) emptyElement.style.display = 'none';
        if (formElement) formElement.style.display = 'block';
        if (actionsElement) actionsElement.style.display = 'flex';
        
        if (titleElement && this.currentItem) {
            titleElement.innerHTML = `<i class="fas fa-cube"></i> ${this.escapeHtml(this.currentItem.name)} 
                <span class="item-editor__title-id">(${this.currentItem.itemId})</span>`;
        }
        
        // Initialiser les sections après affichage du formulaire
        if (window.initItemEditorSections) {
            setTimeout(() => window.initItemEditorSections(), 100);
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveItemBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.unsavedChanges;
            saveBtn.innerHTML = this.unsavedChanges 
                ? '<i class="fas fa-save"></i> Enregistrer *'
                : '<i class="fas fa-save"></i> Enregistrer';
            saveBtn.classList.toggle('item-editor__btn--modified', this.unsavedChanges);
        }
    }

    // ===== SÉLECTION ET ÉDITION D'ITEMS =====

    async selectItem(itemId) {
        console.log(`📦 [ItemEditor] Sélection item: ${itemId}`);
        
        // Vérifier les changements non sauvegardés
        if (this.unsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
                return;
            }
        }
        
        try {
            // Charger les détails de l'item
            const response = await this.adminPanel.apiCall(`/items/details/${itemId}`);
            
            if (response.success) {
                this.selectedItemId = itemId;
                this.currentItem = response.item;
                this.unsavedChanges = false;
                
                this.populateForm(this.currentItem);
                this.updateUI();
                this.updateSaveButton();
                this.updateItemsList(); // Pour mettre à jour la sélection visuelle
                
                console.log(`✅ [ItemEditor] Item ${itemId} sélectionné`);
            } else {
                throw new Error(response.error || 'Erreur chargement détails item');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur sélection item:', error);
            this.adminPanel.showNotification('Erreur lors du chargement de l\'item: ' + error.message, 'error');
        }
    }

    populateForm(item) {
        console.log('📝 [ItemEditor] Remplissage du formulaire pour:', item.itemId);
        
        // Informations de base
        this.setFormValue('itemId', item.itemId);
        this.setFormValue('itemName', item.name);
        this.setFormValue('itemDescription', item.description);
        this.setFormValue('itemCategory', item.category);
        this.setFormValue('itemGeneration', item.generation);
        this.setFormValue('itemRarity', item.rarity);
        this.setFormValue('itemSprite', item.sprite);
        this.setFormValue('itemTags', Array.isArray(item.tags) ? item.tags.join(', ') : '');
        
        // Économie
        this.setFormValue('itemPrice', item.price);
        this.setFormValue('itemSellPrice', item.sellPrice);
        this.setFormValue('itemStackable', item.stackable, 'checkbox');
        this.setFormValue('itemConsumable', item.consumable, 'checkbox');
        
        // Restrictions
        const restrictions = item.usageRestrictions || {};
        this.setFormValue('itemBattleOnly', restrictions.battleOnly, 'checkbox');
        this.setFormValue('itemFieldOnly', restrictions.fieldOnly, 'checkbox');
        this.setFormValue('itemLevelRequirement', restrictions.levelRequirement);
        this.setFormValue('itemLocationRestrictions', 
            Array.isArray(restrictions.locations) ? restrictions.locations.join(', ') : '');
        
        // Métadonnées
        this.setFormValue('itemVersion', item.version);
        this.setFormValue('itemSourceFile', item.sourceFile);
        this.setFormValue('itemIsActive', item.isActive, 'checkbox');
        
        // Effets et méthodes d'obtention
        this.populateEffects(item.effects || []);
        this.populateObtainMethods(item.obtainMethods || []);
    }

    setFormValue(fieldId, value, type = 'text') {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`⚠️ [ItemEditor] Champ ${fieldId} non trouvé`);
            return;
        }
        
        if (type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value || '';
        }
    }

    populateEffects(effects) {
        const container = document.getElementById('itemEffectsList');
        if (!container) {
            console.warn('⚠️ [ItemEditor] Container itemEffectsList non trouvé');
            return;
        }
        
        if (effects.length === 0) {
            container.innerHTML = `
                <div class="item-editor__empty-state" style="padding: 2rem;">
                    <div class="item-editor__empty-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-magic"></i>
                    </div>
                    <p class="item-editor__empty-subtitle">
                        Aucun effet défini pour cet item.
                    </p>
                    <button type="button" class="item-editor__add-btn" onclick="window.itemEditorAddEffect()">
                        <i class="fas fa-plus"></i> Ajouter un effet
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = effects.map((effect, index) => `
            <div class="item-editor__effect-item" data-index="${index}">
                <div class="item-editor__effect-header">
                    <div class="item-editor__effect-title">
                        <i class="fas fa-magic"></i>
                        <span class="item-editor__effect-name">
                            ${this.escapeHtml(effect.name || effect.id)}
                        </span>
                        <span class="item-editor__effect-trigger">${effect.trigger}</span>
                    </div>
                    <div class="item-editor__effect-actions">
                        <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorEditEffect(${index})" title="Éditer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorDuplicateEffect(${index})" title="Dupliquer">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button type="button" class="item-editor__effect-btn item-editor__effect-btn--danger" onclick="window.itemEditorRemoveEffect(${index})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="item-editor__effect-details">
                    ${effect.description ? `<p class="item-editor__effect-description">${this.escapeHtml(effect.description)}</p>` : ''}
                    <div class="item-editor__effect-stats">
                        <span class="item-editor__effect-stat">
                            <i class="fas fa-bolt"></i> Actions: ${effect.actions?.length || 0}
                        </span>
                        ${effect.conditions?.length > 0 ? `<span class="item-editor__effect-stat">
                            <i class="fas fa-filter"></i> Conditions: ${effect.conditions.length}
                        </span>` : ''}
                        ${effect.priority ? `<span class="item-editor__effect-stat">
                            <i class="fas fa-sort-numeric-up"></i> Priorité: ${effect.priority}
                        </span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Ajouter le bouton d'ajout
        container.innerHTML += `
            <div class="item-editor__add-section">
                <button type="button" class="item-editor__add-btn" onclick="window.itemEditorAddEffect()">
                    <i class="fas fa-plus"></i> Ajouter un effet
                </button>
            </div>
        `;
    }

    populateObtainMethods(methods) {
        const container = document.getElementById('itemObtainMethodsList');
        if (!container) {
            console.warn('⚠️ [ItemEditor] Container itemObtainMethodsList non trouvé');
            return;
        }
        
        if (methods.length === 0) {
            container.innerHTML = `
                <div class="item-editor__empty-state" style="padding: 2rem;">
                    <div class="item-editor__empty-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <p class="item-editor__empty-subtitle">
                        Aucune méthode d'obtention définie.
                    </p>
                    <button type="button" class="item-editor__add-btn" onclick="window.itemEditorAddObtainMethod()">
                        <i class="fas fa-plus"></i> Ajouter une méthode
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = methods.map((method, index) => `
            <div class="item-editor__method-item" data-index="${index}">
                <div class="item-editor__method-header">
                    <div class="item-editor__method-title">
                        <i class="fas fa-${this.getMethodIcon(method.method)}"></i>
                        <span class="item-editor__method-name">
                            ${this.formatMethodName(method.method)}
                        </span>
                        ${method.location ? `<span class="item-editor__method-location">${this.escapeHtml(method.location)}</span>` : ''}
                    </div>
                    <div class="item-editor__method-actions">
                        <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorEditObtainMethod(${index})" title="Éditer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorDuplicateObtainMethod(${index})" title="Dupliquer">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button type="button" class="item-editor__effect-btn item-editor__effect-btn--danger" onclick="window.itemEditorRemoveObtainMethod(${index})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="item-editor__method-details">
                    <div class="item-editor__method-stats">
                        ${method.chance ? `<span class="item-editor__method-stat">
                            <i class="fas fa-dice"></i> Chance: ${method.chance}%
                        </span>` : ''}
                        ${method.cost ? `<span class="item-editor__method-stat">
                            <i class="fas fa-coins"></i> Coût: ${method.cost} ${method.currency || 'money'}
                        </span>` : ''}
                        ${method.npc ? `<span class="item-editor__method-stat">
                            <i class="fas fa-user"></i> NPC: ${this.escapeHtml(method.npc)}
                        </span>` : ''}
                        ${method.requirements ? `<span class="item-editor__method-stat">
                            <i class="fas fa-key"></i> Prérequis
                        </span>` : ''}
                    </div>
                    ${method.notes ? `<p class="item-editor__method-notes">${this.escapeHtml(method.notes)}</p>` : ''}
                </div>
            </div>
        `).join('');
        
        // Ajouter le bouton d'ajout
        container.innerHTML += `
            <div class="item-editor__add-section">
                <button type="button" class="item-editor__add-btn" onclick="window.itemEditorAddObtainMethod()">
                    <i class="fas fa-plus"></i> Ajouter une méthode
                </button>
            </div>
        `;
    }

    // ===== ACTIONS CRUD =====

    async createNewItem() {
        console.log('📦 [ItemEditor] Création nouvel item');
        
        // Vérifier les changements non sauvegardés
        if (this.unsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
                return;
            }
        }
        
        // Créer un nouvel item avec des valeurs par défaut
        this.selectedItemId = 'new';
        this.currentItem = {
            itemId: '',
            name: '',
            description: '',
            category: 'battle_items',
            generation: 1,
            rarity: 'common',
            sprite: '',
            tags: [],
            price: null,
            sellPrice: null,
            stackable: true,
            consumable: true,
            effects: [],
            obtainMethods: [{ method: 'shop' }],
            usageRestrictions: {},
            isActive: true,
            version: '2.0.0',
            sourceFile: 'admin_editor'
        };
        
        this.unsavedChanges = false;
        this.populateForm(this.currentItem);
        this.updateUI();
        this.updateSaveButton();
        
        // Focus sur le champ ID
        setTimeout(() => {
            const idField = document.getElementById('itemId');
            if (idField) idField.focus();
        }, 100);
    }

    async saveItem() {
        console.log('💾 [ItemEditor] Sauvegarde item');
        
        if (!this.validateForm()) {
            return;
        }
        
        const saveBtn = document.getElementById('saveItemBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
        }
        
        try {
            const formData = this.gatherFormData();
            
            let response;
            if (this.selectedItemId === 'new') {
                // Créer un nouvel item
                response = await this.adminPanel.apiCall('/items', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            } else {
                // Mettre à jour l'item existant
                response = await this.adminPanel.apiCall(`/items/${this.selectedItemId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            }
            
            if (response.success) {
                this.unsavedChanges = false;
                this.updateSaveButton();
                
                this.adminPanel.showNotification(
                    this.selectedItemId === 'new' ? 'Item créé avec succès' : 'Item mis à jour avec succès',
                    'success'
                );
                
                // Recharger la liste et les stats
                await Promise.all([
                    this.loadItems(),
                    this.loadStats()
                ]);
                
                // Réinitialiser les dropdowns avec les nouvelles stats
                this.initializeDropdowns();
                
                // Sélectionner l'item sauvegardé
                if (this.selectedItemId === 'new') {
                    this.selectedItemId = formData.itemId;
                    await this.selectItem(formData.itemId);
                }
                
                console.log(`✅ [ItemEditor] Item ${this.selectedItemId} sauvegardé`);
                
            } else {
                throw new Error(response.error || 'Erreur sauvegarde');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur sauvegarde:', error);
            this.adminPanel.showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                this.updateSaveButton();
            }
        }
    }

    validateForm() {
        const errors = [];
        
        // Validation ID
        const itemId = document.getElementById('itemId')?.value.trim();
        if (!itemId) {
            errors.push('L\'ID de l\'item est requis');
        } else if (!/^[a-z0-9_-]+$/.test(itemId)) {
            errors.push('L\'ID ne doit contenir que des lettres minuscules, chiffres, tirets et underscores');
        } else if (itemId.length < 2 || itemId.length > 50) {
            errors.push('L\'ID doit faire entre 2 et 50 caractères');
        }
        
        // Validation nom
        const name = document.getElementById('itemName')?.value.trim();
        if (!name) {
            errors.push('Le nom de l\'item est requis');
        } else if (name.length < 2 || name.length > 100) {
            errors.push('Le nom doit faire entre 2 et 100 caractères');
        }
        
        // Validation description
        const description = document.getElementById('itemDescription')?.value.trim();
        if (!description || description.length < 10) {
            errors.push('La description doit faire au moins 10 caractères');
        } else if (description.length > 1000) {
            errors.push('La description ne peut pas dépasser 1000 caractères');
        }
        
        // Validation catégorie
        const category = document.getElementById('itemCategory')?.value;
        if (!category) {
            errors.push('La catégorie est requise');
        }
        
        // Validation génération
        const generation = parseInt(document.getElementById('itemGeneration')?.value);
        if (!generation || generation < 1 || generation > 9) {
            errors.push('La génération doit être entre 1 et 9');
        }
        
        // Validation prix
        const price = document.getElementById('itemPrice')?.value;
        const sellPrice = document.getElementById('itemSellPrice')?.value;
        if (price && sellPrice && parseInt(sellPrice) > parseInt(price)) {
            errors.push('Le prix de vente ne peut pas être supérieur au prix d\'achat');
        }
        
        if (errors.length > 0) {
            this.adminPanel.showNotification('Erreurs de validation:\n• ' + errors.join('\n• '), 'error');
            
            // Focus sur le premier champ en erreur
            const firstErrorField = this.getFirstErrorField(errors[0]);
            if (firstErrorField) {
                firstErrorField.focus();
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            return false;
        }
        
        return true;
    }
    
    getFirstErrorField(errorMessage) {
        if (errorMessage.includes('ID')) return document.getElementById('itemId');
        if (errorMessage.includes('nom')) return document.getElementById('itemName');
        if (errorMessage.includes('description')) return document.getElementById('itemDescription');
        if (errorMessage.includes('catégorie')) return document.getElementById('itemCategory');
        if (errorMessage.includes('génération')) return document.getElementById('itemGeneration');
        if (errorMessage.includes('prix')) return document.getElementById('itemPrice');
        return null;
    }

    gatherFormData() {
        const tags = document.getElementById('itemTags')?.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0) || [];
        
        const locationRestrictions = document.getElementById('itemLocationRestrictions')?.value
            .split(',')
            .map(loc => loc.trim())
            .filter(loc => loc.length > 0) || [];
        
        return {
            itemId: document.getElementById('itemId')?.value.trim(),
            name: document.getElementById('itemName')?.value.trim(),
            description: document.getElementById('itemDescription')?.value.trim(),
            category: document.getElementById('itemCategory')?.value,
            generation: parseInt(document.getElementById('itemGeneration')?.value) || 1,
            rarity: document.getElementById('itemRarity')?.value || 'common',
            sprite: document.getElementById('itemSprite')?.value.trim(),
            tags: tags,
            price: this.parseNumber(document.getElementById('itemPrice')?.value),
            sellPrice: this.parseNumber(document.getElementById('itemSellPrice')?.value),
            stackable: document.getElementById('itemStackable')?.checked,
            consumable: document.getElementById('itemConsumable')?.checked,
            effects: this.currentItem?.effects || [],
            obtainMethods: this.currentItem?.obtainMethods || [{ method: 'shop' }],
            usageRestrictions: {
                battleOnly: document.getElementById('itemBattleOnly')?.checked,
                fieldOnly: document.getElementById('itemFieldOnly')?.checked,
                levelRequirement: this.parseNumber(document.getElementById('itemLevelRequirement')?.value),
                locations: locationRestrictions.length > 0 ? locationRestrictions : undefined
            },
            version: document.getElementById('itemVersion')?.value || '2.0.0',
            sourceFile: document.getElementById('itemSourceFile')?.value.trim() || 'admin_editor',
            isActive: document.getElementById('itemIsActive')?.checked !== false // Par défaut true
        };
    }

    async duplicateItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification('Sélectionnez un item à dupliquer', 'warning');
            return;
        }
        
        console.log(`📋 [ItemEditor] Duplication item: ${this.selectedItemId}`);
        
        try {
            const response = await this.adminPanel.apiCall(`/items/${this.selectedItemId}/duplicate`, {
                method: 'POST'
            });
            
            if (response.success) {
                this.adminPanel.showNotification('Item dupliqué avec succès', 'success');
                
                // Recharger la liste et les stats
                await Promise.all([
                    this.loadItems(),
                    this.loadStats()
                ]);
                this.initializeDropdowns();
                
                // Sélectionner l'item dupliqué
                if (response.newItemId) {
                    await this.selectItem(response.newItemId);
                }
            } else {
                throw new Error(response.error || 'Erreur duplication');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur duplication:', error);
            this.adminPanel.showNotification('Erreur lors de la duplication: ' + error.message, 'error');
        }
    }

    async deleteItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification('Sélectionnez un item à supprimer', 'warning');
            return;
        }
        
        const itemName = this.currentItem?.name || this.selectedItemId;
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'item "${itemName}" ?\n\nCette action désactivera l'item mais ne le supprimera pas définitivement.`)) {
            return;
        }
        
        console.log(`🗑️ [ItemEditor] Suppression item: ${this.selectedItemId}`);
        
        try {
            const response = await this.adminPanel.apiCall(`/items/${this.selectedItemId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.adminPanel.showNotification('Item désactivé avec succès', 'success');
                
                // Reset l'éditeur
                this.selectedItemId = null;
                this.currentItem = null;
                this.unsavedChanges = false;
                
                // Recharger la liste et les stats
                await Promise.all([
                    this.loadItems(),
                    this.loadStats()
                ]);
                this.initializeDropdowns();
                this.updateUI();
            } else {
                throw new Error(response.error || 'Erreur suppression');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur suppression:', error);
            this.adminPanel.showNotification('Erreur lors de la suppression: ' + error.message, 'error');
        }
    }

    cancelEdit() {
        if (this.selectedItemId === 'new') {
            // Annuler la création
            this.selectedItemId = null;
            this.currentItem = null;
        } else if (this.currentItem) {
            // Restaurer les données originales
            this.populateForm(this.currentItem);
        }
        
        this.unsavedChanges = false;
        this.updateSaveButton();
        this.updateUI();
    }

    // ===== GESTION DES EFFETS =====
    
    addEffect() {
        if (!this.currentItem) {
            this.adminPanel.showNotification('Sélectionnez d\'abord un item', 'warning');
            return;
        }
        
        const newEffect = {
            id: `effect_${Date.now()}`,
            name: 'Nouvel effet',
            trigger: 'on_use',
            actions: [],
            conditions: []
        };
        
        if (!this.currentItem.effects) {
            this.currentItem.effects = [];
        }
        
        this.currentItem.effects.push(newEffect);
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        // Ouvrir immédiatement l'éditeur d'effet
        setTimeout(() => {
            this.editEffect(this.currentItem.effects.length - 1);
        }, 100);
    }
    
    editEffect(index) {
        if (!this.currentItem?.effects || !this.currentItem.effects[index]) {
            this.adminPanel.showNotification('Effet non trouvé', 'error');
            return;
        }
        
        const effect = this.currentItem.effects[index];
        console.log(`🎭 [ItemEditor] Édition effet ${index}:`, effect);
        
        // TODO: Ouvrir la modal d'édition d'effet
        this.showEffectEditor(effect, index);
    }
    
    duplicateEffect(index) {
        if (!this.currentItem?.effects || !this.currentItem.effects[index]) {
            this.adminPanel.showNotification('Effet non trouvé', 'error');
            return;
        }
        
        const originalEffect = this.currentItem.effects[index];
        const duplicatedEffect = JSON.parse(JSON.stringify(originalEffect));
        duplicatedEffect.id = `effect_${Date.now()}`;
        duplicatedEffect.name = `${duplicatedEffect.name} (Copie)`;
        
        this.currentItem.effects.splice(index + 1, 0, duplicatedEffect);
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Effet dupliqué', 'success');
    }
    
    removeEffect(index) {
        if (!this.currentItem?.effects || !this.currentItem.effects[index]) {
            this.adminPanel.showNotification('Effet non trouvé', 'error');
            return;
        }
        
        const effect = this.currentItem.effects[index];
        if (!confirm(`Supprimer l'effet "${effect.name || effect.id}" ?`)) {
            return;
        }
        
        this.currentItem.effects.splice(index, 1);
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Effet supprimé', 'success');
    }
    
    showEffectEditor(effect, index) {
        // Créer le contenu de la modal d'édition d'effet
        const modalContent = this.createEffectEditorModal(effect, index);
        
        // Utiliser le système de modal de l'admin panel
        this.adminPanel.showModal({
            title: `Éditer l'effet: ${effect.name || effect.id}`,
            content: modalContent,
            size: 'large',
            onSave: () => this.saveEffectFromModal(effect, index),
            onCancel: () => this.adminPanel.closeModal()
        });
    }
    
    createEffectEditorModal(effect, index) {
        return `
            <div class="effect-editor">
                <form id="effectEditorForm" class="effect-editor__form">
                    <div class="effect-editor__section">
                        <h4>Informations générales</h4>
                        <div class="effect-editor__row">
                            <div class="effect-editor__field">
                                <label>ID de l'effet</label>
                                <input type="text" id="effectId" value="${effect.id || ''}" required>
                            </div>
                            <div class="effect-editor__field">
                                <label>Nom</label>
                                <input type="text" id="effectName" value="${effect.name || ''}" required>
                            </div>
                        </div>
                        <div class="effect-editor__field">
                            <label>Description</label>
                            <textarea id="effectDescription" placeholder="Description de l'effet...">${effect.description || ''}</textarea>
                        </div>
                        <div class="effect-editor__row">
                            <div class="effect-editor__field">
                                <label>Déclencheur</label>
                                <select id="effectTrigger" required>
                                    ${this.generateTriggerOptions(effect.trigger)}
                                </select>
                            </div>
                            <div class="effect-editor__field">
                                <label>Priorité</label>
                                <input type="number" id="effectPriority" value="${effect.priority || 0}" min="0" max="999">
                            </div>
                        </div>
                    </div>
                    
                    <div class="effect-editor__section">
                        <h4>Actions <span class="effect-editor__count">(${effect.actions?.length || 0})</span></h4>
                        <div id="effectActionsList">
                            ${this.generateActionsEditor(effect.actions || [])}
                        </div>
                        <button type="button" class="effect-editor__add-btn" onclick="window.addEffectAction()">
                            <i class="fas fa-plus"></i> Ajouter une action
                        </button>
                    </div>
                    
                    <div class="effect-editor__section">
                        <h4>Conditions <span class="effect-editor__count">(${effect.conditions?.length || 0})</span></h4>
                        <div id="effectConditionsList">
                            ${this.generateConditionsEditor(effect.conditions || [])}
                        </div>
                        <button type="button" class="effect-editor__add-btn" onclick="window.addEffectCondition()">
                            <i class="fas fa-plus"></i> Ajouter une condition
                        </button>
                    </div>
                    
                    <div class="effect-editor__section">
                        <h4>Options avancées</h4>
                        <div class="effect-editor__row">
                            <label class="effect-editor__checkbox">
                                <input type="checkbox" id="effectStackable" ${effect.stackable ? 'checked' : ''}>
                                Cumulable
                            </label>
                            <label class="effect-editor__checkbox">
                                <input type="checkbox" id="effectRemovable" ${effect.removable !== false ? 'checked' : ''}>
                                Supprimable
                            </label>
                            <label class="effect-editor__checkbox">
                                <input type="checkbox" id="effectTemporary" ${effect.temporary ? 'checked' : ''}>
                                Temporaire
                            </label>
                        </div>
                        <div class="effect-editor__row">
                            <div class="effect-editor__field">
                                <label>Durée (tours)</label>
                                <input type="number" id="effectDuration" value="${effect.duration || ''}" min="1">
                            </div>
                            <div class="effect-editor__field">
                                <label>Cooldown (tours)</label>
                                <input type="number" id="effectCooldown" value="${effect.cooldown_turns || ''}" min="1">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    // ===== GESTION DES MÉTHODES D'OBTENTION =====
    
    addObtainMethod() {
        if (!this.currentItem) {
            this.adminPanel.showNotification('Sélectionnez d\'abord un item', 'warning');
            return;
        }
        
        const newMethod = {
            method: 'shop',
            location: '',
            cost: null,
            currency: 'money',
            chance: null
        };
        
        if (!this.currentItem.obtainMethods) {
            this.currentItem.obtainMethods = [];
        }
        
        this.currentItem.obtainMethods.push(newMethod);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        // Ouvrir immédiatement l'éditeur
        setTimeout(() => {
            this.editObtainMethod(this.currentItem.obtainMethods.length - 1);
        }, 100);
    }
    
    editObtainMethod(index) {
        if (!this.currentItem?.obtainMethods || !this.currentItem.obtainMethods[index]) {
            this.adminPanel.showNotification('Méthode non trouvée', 'error');
            return;
        }
        
        const method = this.currentItem.obtainMethods[index];
        console.log(`📍 [ItemEditor] Édition méthode ${index}:`, method);
        
        this.showObtainMethodEditor(method, index);
    }
    
    duplicateObtainMethod(index) {
        if (!this.currentItem?.obtainMethods || !this.currentItem.obtainMethods[index]) {
            this.adminPanel.showNotification('Méthode non trouvée', 'error');
            return;
        }
        
        const originalMethod = JSON.parse(JSON.stringify(this.currentItem.obtainMethods[index]));
        this.currentItem.obtainMethods.splice(index + 1, 0, originalMethod);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Méthode dupliquée', 'success');
    }
    
    removeObtainMethod(index) {
        if (!this.currentItem?.obtainMethods || !this.currentItem.obtainMethods[index]) {
            this.adminPanel.showNotification('Méthode non trouvée', 'error');
            return;
        }
        
        const method = this.currentItem.obtainMethods[index];
        if (!confirm(`Supprimer la méthode "${this.formatMethodName(method.method)}" ?`)) {
            return;
        }
        
        this.currentItem.obtainMethods.splice(index, 1);
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Méthode supprimée', 'success');
    }
    
    showObtainMethodEditor(method, index) {
        const modalContent = this.createObtainMethodEditorModal(method, index);
        
        this.adminPanel.showModal({
            title: `Éditer la méthode: ${this.formatMethodName(method.method)}`,
            content: modalContent,
            size: 'medium',
            onSave: () => this.saveObtainMethodFromModal(method, index),
            onCancel: () => this.adminPanel.closeModal()
        });
    }
    
    createObtainMethodEditorModal(method, index) {
        return `
            <div class="method-editor">
                <form id="obtainMethodEditorForm" class="method-editor__form">
                    <div class="method-editor__field">
                        <label>Méthode d'obtention</label>
                        <select id="methodType" required onchange="window.updateMethodFields(this.value)">
                            ${this.generateMethodOptions(method.method)}
                        </select>
                    </div>
                    
                    <div class="method-editor__field">
                        <label>Lieu/Location</label>
                        <input type="text" id="methodLocation" value="${method.location || ''}" placeholder="Ex: Poké Mart, Route 1, etc.">
                    </div>
                    
                    <div class="method-editor__row">
                        <div class="method-editor__field">
                            <label>Coût</label>
                            <input type="number" id="methodCost" value="${method.cost || ''}" min="0">
                        </div>
                        <div class="method-editor__field">
                            <label>Devise</label>
                            <select id="methodCurrency">
                                <option value="money" ${method.currency === 'money' ? 'selected' : ''}>Argent (₽)</option>
                                <option value="bp" ${method.currency === 'bp' ? 'selected' : ''}>Battle Points</option>
                                <option value="coins" ${method.currency === 'coins' ? 'selected' : ''}>Jetons</option>
                                <option value="tokens" ${method.currency === 'tokens' ? 'selected' : ''}>Tokens</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="method-editor__field">
                        <label>Chance d'obtention (%)</label>
                        <input type="number" id="methodChance" value="${method.chance || ''}" min="1" max="100" placeholder="Optionnel - pour les drops aléatoires">
                    </div>
                    
                    <div class="method-editor__field">
                        <label>NPC/Vendeur</label>
                        <input type="text" id="methodNpc" value="${method.npc || ''}" placeholder="Ex: Infirmière Joëlle, Marchand, etc.">
                    </div>
                    
                    <div class="method-editor__field">
                        <label>Prérequis</label>
                        <textarea id="methodRequirements" placeholder="Ex: Badge requis, niveau minimum, etc.">${method.requirements || ''}</textarea>
                    </div>
                    
                    <div class="method-editor__field">
                        <label>Notes</label>
                        <textarea id="methodNotes" placeholder="Notes additionnelles sur cette méthode d'obtention">${method.notes || ''}</textarea>
                    </div>
                </form>
            </div>
        `;
    }

    // ===== PAGINATION =====

    previousPage() {
        if (this.currentPage <= 1) return;
        
        this.currentPage--;
        console.log(`⬅️ [ItemEditor] Page précédente: ${this.currentPage}`);
        
        // Pagination côté client uniquement maintenant
        this.updateItemsList();
        this.updatePagination();
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
            
        if (this.currentPage >= totalPages) return;
        
        this.currentPage++;
        console.log(`➡️ [ItemEditor] Page suivante: ${this.currentPage}`);
        
        // Pagination côté client uniquement maintenant
        this.updateItemsList();
        this.updatePagination();
    }

    // ===== ACTIONS RAPIDES =====

    async refreshItems() {
        console.log('🔄 [ItemEditor] Actualisation items');
        
        try {
            await Promise.all([
                this.loadItems(),
                this.loadStats()
            ]);
            
            this.initializeDropdowns();
            this.adminPanel.showNotification('Liste des items actualisée', 'info');
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur refresh:', error);
            this.adminPanel.showNotification('Erreur lors de l\'actualisation', 'error');
        }
    }

    async exportItems() {
        console.log('📤 [ItemEditor] Export items');
        
        try {
            const response = await this.adminPanel.apiCall('/items/export/all');
            
            if (response.success) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `items_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.adminPanel.showNotification('Export terminé', 'success');
            } else {
                throw new Error(response.error || 'Erreur export');
            }
            
        } catch (error) {
            console.error('❌ [ItemEditor] Erreur export:', error);
            this.adminPanel.showNotification('Erreur lors de l\'export: ' + error.message, 'error');
        }
    }

    async importItems() {
        console.log('📥 [ItemEditor] Import items');
        
        // Créer un input file temporaire
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Vérifier le format des données
                let itemsData = data;
                if (data.items) itemsData = data.items; // Format avec métadonnées
                if (!itemsData || typeof itemsData !== 'object') {
                    throw new Error('Format de fichier invalide');
                }
                
                const itemCount = Object.keys(itemsData).length;
                if (!confirm(`Importer ${itemCount} items depuis ${file.name} ?\n\nCette action peut écraser des items existants.`)) {
                    return;
                }
                
                const response = await this.adminPanel.apiCall('/items/import', {
                    method: 'POST',
                    body: JSON.stringify({ items: itemsData, overwrite: true })
                });
                
                if (response.success) {
                    this.adminPanel.showNotification(`Import réussi: ${response.imported} items importés`, 'success');
                    
                    // Recharger les données
                    await Promise.all([
                        this.loadItems(),
                        this.loadStats()
                    ]);
                    this.initializeDropdowns();
                    
                    if (response.errors > 0) {
                        console.warn('Import errors:', response.errorDetails);
                        this.adminPanel.showNotification(`Attention: ${response.errors} erreurs lors de l'import`, 'warning');
                    }
                } else {
                    throw new Error(response.error || 'Erreur import');
                }
                
            } catch (error) {
                console.error('❌ [ItemEditor] Erreur import:', error);
                this.adminPanel.showNotification('Erreur lors de l\'import: ' + error.message, 'error');
            }
        };
        
        input.click();
    }

    clearFilters() {
        console.log('🧹 [ItemEditor] Effacement des filtres');
        
        // Reset des filtres
        this.currentFilters = {
            search: '',
            category: 'all',
            generation: 'all',
            rarity: 'all'
        };
        this.currentPage = 1;
        this.serverSideFiltering = false;
        
        // Reset des champs du formulaire
        const searchInput = document.getElementById('itemSearch');
        const categoryFilter = document.getElementById('itemCategoryFilter');
        const generationFilter = document.getElementById('itemGenerationFilter');
        const rarityFilter = document.getElementById('itemRarityFilter');
        
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (generationFilter) generationFilter.value = 'all';
        if (rarityFilter) rarityFilter.value = 'all';
        
        // Recharger les items
        this.loadItems();
    }

    // ===== MÉTHODES D'ÉDITION MODALE =====

    saveEffectFromModal(effect, index) {
        const form = document.getElementById('effectEditorForm');
        if (!form) return false;
        
        // Récupérer les données du formulaire
        const formData = new FormData(form);
        const updatedEffect = {
            ...effect,
            id: document.getElementById('effectId')?.value || effect.id,
            name: document.getElementById('effectName')?.value || effect.name,
            description: document.getElementById('effectDescription')?.value || '',
            trigger: document.getElementById('effectTrigger')?.value || effect.trigger,
            priority: parseInt(document.getElementById('effectPriority')?.value) || 0,
            stackable: document.getElementById('effectStackable')?.checked || false,
            removable: document.getElementById('effectRemovable')?.checked !== false,
            temporary: document.getElementById('effectTemporary')?.checked || false,
            duration: parseInt(document.getElementById('effectDuration')?.value) || undefined,
            cooldown_turns: parseInt(document.getElementById('effectCooldown')?.value) || undefined
        };
        
        // Valider les données
        if (!updatedEffect.id || !updatedEffect.name || !updatedEffect.trigger) {
            this.adminPanel.showNotification('Veuillez remplir tous les champs requis', 'error');
            return false;
        }
        
        // Mettre à jour l'effet
        this.currentItem.effects[index] = updatedEffect;
        this.populateEffects(this.currentItem.effects);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Effet mis à jour', 'success');
        this.adminPanel.closeModal();
        return true;
    }

    saveObtainMethodFromModal(method, index) {
        // Récupérer les données du formulaire
        const updatedMethod = {
            method: document.getElementById('methodType')?.value || 'shop',
            location: document.getElementById('methodLocation')?.value || '',
            cost: this.parseNumber(document.getElementById('methodCost')?.value),
            currency: document.getElementById('methodCurrency')?.value || 'money',
            chance: this.parseNumber(document.getElementById('methodChance')?.value),
            npc: document.getElementById('methodNpc')?.value || '',
            requirements: document.getElementById('methodRequirements')?.value || '',
            notes: document.getElementById('methodNotes')?.value || ''
        };
        
        // Nettoyer les champs vides
        Object.keys(updatedMethod).forEach(key => {
            if (updatedMethod[key] === '' || updatedMethod[key] === null) {
                delete updatedMethod[key];
            }
        });
        
        // Mettre à jour la méthode
        this.currentItem.obtainMethods[index] = updatedMethod;
        this.populateObtainMethods(this.currentItem.obtainMethods);
        this.unsavedChanges = true;
        this.updateSaveButton();
        
        this.adminPanel.showNotification('Méthode mise à jour', 'success');
        this.adminPanel.closeModal();
        return true;
    }

    // ===== GÉNÉRATEURS D'OPTIONS =====

    generateTriggerOptions(selectedTrigger) {
        const triggers = [
            { value: 'on_use', label: 'À l\'utilisation' },
            { value: 'on_use_in_battle', label: 'Utilisation en combat' },
            { value: 'on_use_on_pokemon', label: 'Utilisation sur Pokémon' },
            { value: 'on_use_in_field', label: 'Utilisation hors combat' },
            { value: 'turn_start', label: 'Début de tour' },
            { value: 'turn_end', label: 'Fin de tour' },
            { value: 'on_switch_in', label: 'Entrée en jeu' },
            { value: 'when_hit', label: 'Quand touché' },
            { value: 'when_damaged', label: 'Quand blessé' },
            { value: 'on_critical', label: 'Coup critique' },
            { value: 'on_level_up', label: 'Montée de niveau' },
            { value: 'on_evolution', label: 'Évolution' },
            { value: 'continuous', label: 'Continu' },
            { value: 'passive', label: 'Passif' }
        ];
        
        return triggers.map(trigger => 
            `<option value="${trigger.value}" ${trigger.value === selectedTrigger ? 'selected' : ''}>${trigger.label}</option>`
        ).join('');
    }

    generateMethodOptions(selectedMethod) {
        const methods = [
            { value: 'shop', label: 'Magasin' },
            { value: 'wild_drop', label: 'Drop sauvage' },
            { value: 'trainer_reward', label: 'Récompense dresseur' },
            { value: 'gift', label: 'Cadeau' },
            { value: 'found_item', label: 'Objet trouvé' },
            { value: 'mining', label: 'Minage' },
            { value: 'fishing', label: 'Pêche' },
            { value: 'berry_tree', label: 'Arbre à baies' },
            { value: 'pickup', label: 'Ramassage' },
            { value: 'thief', label: 'Vol' },
            { value: 'contest_prize', label: 'Prix de concours' },
            { value: 'battle_facility', label: 'Facilité de combat' },
            { value: 'daily_gift', label: 'Cadeau quotidien' },
            { value: 'quest_reward', label: 'Récompense de quête' },
            { value: 'event', label: 'Événement' }
        ];
        
        return methods.map(method => 
            `<option value="${method.value}" ${method.value === selectedMethod ? 'selected' : ''}>${method.label}</option>`
        ).join('');
    }

    generateActionsEditor(actions) {
        if (!actions || actions.length === 0) {
            return `<div class="effect-editor__empty">Aucune action définie</div>`;
        }
        
        return actions.map((action, index) => `
            <div class="effect-editor__action-item">
                <div class="effect-editor__action-header">
                    <span class="effect-editor__action-type">${action.type}</span>
                    <div class="effect-editor__action-controls">
                        <button type="button" onclick="window.editEffectAction(${index})">Éditer</button>
                        <button type="button" onclick="window.removeEffectAction(${index})">Supprimer</button>
                    </div>
                </div>
                <div class="effect-editor__action-details">
                    ${action.target ? `Cible: ${action.target}` : ''}
                    ${action.value ? `Valeur: ${action.value}` : ''}
                </div>
            </div>
        `).join('');
    }

    generateConditionsEditor(conditions) {
        if (!conditions || conditions.length === 0) {
            return `<div class="effect-editor__empty">Aucune condition définie</div>`;
        }
        
        return conditions.map((condition, index) => `
            <div class="effect-editor__condition-item">
                <div class="effect-editor__condition-header">
                    <span class="effect-editor__condition-type">${condition.type}</span>
                    <div class="effect-editor__condition-controls">
                        <button type="button" onclick="window.editEffectCondition(${index})">Éditer</button>
                        <button type="button" onclick="window.removeEffectCondition(${index})">Supprimer</button>
                    </div>
                </div>
                <div class="effect-editor__condition-details">
                    ${condition.operator ? `${condition.operator}` : ''}
                    ${condition.value ? `${condition.value}` : ''}
                </div>
            </div>
        `).join('');
    }

    // ===== UTILITAIRES DE FORMATAGE =====

    formatCategoryName(category) {
        const names = {
            'medicine': 'Médicaments',
            'pokeballs': 'Poké Balls',
            'battle_items': 'Objets de combat',
            'key_items': 'Objets importants',
            'berries': 'Baies',
            'machines': 'Machines (TM/HM)',
            'evolution_items': 'Objets d\'évolution',
            'held_items': 'Objets tenus',
            'z_crystals': 'Cristaux Z',
            'dynamax_crystals': 'Cristaux Dynamax',
            'tera_shards': 'Téraclats',
            'poke_toys': 'Jouets Pokémon',
            'ingredients': 'Ingrédients',
            'treasure': 'Trésors',
            'fossil': 'Fossiles',
            'flutes': 'Flûtes',
            'mail': 'Courrier',
            'exp_items': 'Objets d\'expérience'
        };
        return names[category] || category;
    }

    formatRarityName(rarity) {
        const names = {
            'common': 'Commun',
            'uncommon': 'Peu commun',
            'rare': 'Rare',
            'epic': 'Épique',
            'legendary': 'Légendaire',
            'mythical': 'Mythique'
        };
        return names[rarity] || rarity;
    }

    formatMethodName(method) {
        const names = {
            'shop': 'Magasin',
            'wild_drop': 'Drop sauvage',
            'trainer_reward': 'Récompense dresseur',
            'gift': 'Cadeau',
            'found_item': 'Objet trouvé',
            'mining': 'Minage',
            'fishing': 'Pêche',
            'berry_tree': 'Arbre à baies',
            'pickup': 'Ramassage',
            'thief': 'Vol',
            'contest_prize': 'Prix de concours',
            'battle_facility': 'Facilité de combat',
            'daily_gift': 'Cadeau quotidien',
            'quest_reward': 'Récompense de quête',
            'event': 'Événement'
        };
        return names[method] || method;
    }

    getMethodIcon(method) {
        const icons = {
            'shop': 'shopping-cart',
            'wild_drop': 'paw',
            'trainer_reward': 'trophy',
            'gift': 'gift',
            'found_item': 'search',
            'mining': 'gem',
            'fishing': 'fish',
            'berry_tree': 'tree',
            'pickup': 'hand-paper',
            'thief': 'mask',
            'contest_prize': 'award',
            'battle_facility': 'sword',
            'daily_gift': 'calendar-day',
            'quest_reward': 'tasks',
            'event': 'star'
        };
        return icons[method] || 'question';
    }

    // ===== UTILITAIRES =====

    parseNumber(value) {
        if (!value || value.trim() === '') return null;
        const num = parseInt(value);
        return isNaN(num) ? null : num;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        console.log('🧹 [ItemEditor] Cleanup module');
        
        // Nettoyer les event listeners si nécessaire
        document.removeEventListener('keydown', this.keyboardHandler);
    }
}

// ===== FONCTIONS GLOBALES POUR L'INTERFACE =====

window.itemEditorSelectItem = (itemId) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.selectItem(itemId);
    } else {
        console.error('❌ ItemEditor non disponible');
    }
};

window.itemEditorCreateNew = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.createNewItem();
    }
};

window.itemEditorSave = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.saveItem();
    }
};

window.itemEditorDuplicate = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.duplicateItem();
    }
};

window.itemEditorDelete = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.deleteItem();
    }
};

window.itemEditorCancel = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.cancelEdit();
    }
};

window.itemEditorRefresh = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.refreshItems();
    }
};

window.itemEditorExport = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.exportItems();
    }
};

window.itemEditorImport = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.importItems();
    }
};

window.itemEditorClearFilters = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.clearFilters();
    }
};

window.itemEditorPreviousPage = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.previousPage();
    }
};

window.itemEditorNextPage = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.nextPage();
    }
};

// Fonctions pour les effets
window.itemEditorAddEffect = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.addEffect();
    }
};

window.itemEditorEditEffect = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.editEffect(index);
    }
};

window.itemEditorDuplicateEffect = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.duplicateEffect(index);
    }
};

window.itemEditorRemoveEffect = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.removeEffect(index);
    }
};

// Fonctions pour les méthodes d'obtention
window.itemEditorAddObtainMethod = () => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.addObtainMethod();
    }
};

window.itemEditorEditObtainMethod = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.editObtainMethod(index);
    }
};

window.itemEditorDuplicateObtainMethod = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.duplicateObtainMethod(index);
    }
};

window.itemEditorRemoveObtainMethod = (index) => {
    if (window.adminPanel?.itemEditor) {
        window.adminPanel.itemEditor.removeObtainMethod(index);
    }
};

// Fonctions pour l'édition d'actions et conditions d'effets
window.addEffectAction = () => {
    console.log('➕ Ajouter une action - À implémenter');
};

window.editEffectAction = (index) => {
    console.log(`✏️ Éditer action ${index} - À implémenter`);
};

window.removeEffectAction = (index) => {
    console.log(`❌ Supprimer action ${index} - À implémenter`);
};

window.addEffectCondition = () => {
    console.log('➕ Ajouter une condition - À implémenter');
};

window.editEffectCondition = (index) => {
    console.log(`✏️ Éditer condition ${index} - À implémenter`);
};

window.removeEffectCondition = (index) => {
    console.log(`❌ Supprimer condition ${index} - À implémenter`);
};

window.updateMethodFields = (methodType) => {
    console.log('🔄 Mise à jour des champs selon le type:', methodType);
    // À implémenter selon le type de méthode sélectionné
};
