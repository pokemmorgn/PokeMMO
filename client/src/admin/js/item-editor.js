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
        
        console.log('✅ [ItemEditor] Module initialisé');
    }

    // ===== LIFECYCLE METHODS =====

    async onTabActivated() {
        console.log('📦 [ItemEditor] Activation de l\'onglet Items');
        
        try {
            // Attendre que le DOM soit prêt
            await this.waitForDOM();
            
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
        
        // Recherche en temps réel
        const searchInput = document.getElementById('itemSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.filterItems();
            });
        }
        
        // Filtres de catégorie
        const categoryFilter = document.getElementById('itemCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.filterItems();
            });
        }
        
        // Filtres de génération
        const generationFilter = document.getElementById('itemGenerationFilter');
        if (generationFilter) {
            generationFilter.addEventListener('change', (e) => {
                this.currentFilters.generation = e.target.value;
                this.filterItems();
            });
        }
        
        // Filtres de rareté
        const rarityFilter = document.getElementById('itemRarityFilter');
        if (rarityFilter) {
            rarityFilter.addEventListener('change', (e) => {
                this.currentFilters.rarity = e.target.value;
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
            
            // Détection des changements
            itemForm.addEventListener('input', () => {
                this.unsavedChanges = true;
                this.updateSaveButton();
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

    async loadItems() {
        console.log('📦 [ItemEditor] Chargement des items...');
        
        const loadingElement = document.getElementById('itemsLoading');
        const listElement = document.getElementById('itemsList');
        
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            // CORRECTION: Utiliser la bonne route API
            const response = await this.adminPanel.apiCall('/api/admin/items/list', {
                method: 'GET'
            });
            
            if (response.success) {
                this.items = response.items || [];
                this.totalItems = response.total || 0;
                this.filteredItems = [...this.items];
                
                console.log(`✅ [ItemEditor] ${this.items.length} items chargés`);
                this.updateItemsList();
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
                    </div>
                `;
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // ===== FILTRAGE ET RECHERCHE =====

    filterItems() {
        console.log('🔍 [ItemEditor] Filtrage des items:', this.currentFilters);
        
        this.filteredItems = this.items.filter(item => {
            // Filtre par recherche textuelle
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.itemId.toLowerCase().includes(searchTerm) ||
                    item.description.toLowerCase().includes(searchTerm) ||
                    (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
                
                if (!matchesSearch) return false;
            }
            
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
        
        this.currentPage = 1; // Reset à la première page
        this.updateItemsList();
        this.updatePagination();
    }

    // ===== MISE À JOUR DE L'INTERFACE =====

    updateItemsList() {
        const listElement = document.getElementById('itemsList');
        if (!listElement) {
            console.error('❌ [ItemEditor] Element itemsList non trouvé');
            return;
        }
        
        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredItems.slice(startIndex, endIndex);
        
        if (pageItems.length === 0) {
            listElement.innerHTML = `
                <div class="item-editor__empty-state" style="padding: 2rem; text-align: center;">
                    <div class="item-editor__empty-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-search"></i>
                    </div>
                    <h4 class="item-editor__empty-title">Aucun item trouvé</h4>
                    <p class="item-editor__empty-subtitle">
                        Essayez de modifier vos critères de recherche.
                    </p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = pageItems.map(item => `
            <div class="item-editor__item-card ${this.selectedItemId === item.itemId ? 'item-editor__item-card--selected' : ''}"
                 onclick="window.itemEditorSelectItem('${item.itemId}')">
                <div class="item-editor__item-sprite">
                    <i class="fas fa-cube"></i>
                </div>
                <div class="item-editor__item-info">
                    <div class="item-editor__item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-editor__item-meta">
                        <span class="item-editor__item-category">${item.category}</span>
                        ${item.price ? `<span class="item-editor__item-price">${item.price}₽</span>` : ''}
                        <span>Gen ${item.generation}</span>
                        <span>${item.rarity}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(startItem + this.itemsPerPage - 1, this.filteredItems.length);
        
        // Info pagination
        const infoElement = document.getElementById('itemsPaginationInfo');
        if (infoElement) {
            infoElement.textContent = `${startItem}-${endItem} sur ${this.filteredItems.length} items`;
        }
        
        // Contrôles pagination
        const pageInfoElement = document.getElementById('itemsPageInfo');
        const prevBtn = document.getElementById('itemsPrevBtn');
        const nextBtn = document.getElementById('itemsNextBtn');
        
        if (pageInfoElement) {
            pageInfoElement.textContent = `${this.currentPage} / ${totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.classList.toggle('item-editor__page-btn--disabled', this.currentPage <= 1);
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.classList.toggle('item-editor__page-btn--disabled', this.currentPage >= totalPages);
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
            titleElement.innerHTML = `<i class="fas fa-cube"></i> ${this.escapeHtml(this.currentItem.name)}`;
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveItemBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.unsavedChanges;
            saveBtn.innerHTML = this.unsavedChanges 
                ? '<i class="fas fa-save"></i> Enregistrer *'
                : '<i class="fas fa-save"></i> Enregistrer';
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
            const response = await this.adminPanel.apiCall(`/api/admin/items/details/${itemId}`);
            
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
                </div>
            `;
            return;
        }
        
        container.innerHTML = effects.map((effect, index) => `
            <div class="item-editor__effect-item">
                <div class="item-editor__effect-info">
                    <div class="item-editor__effect-name">
                        ${this.escapeHtml(effect.name || effect.id)}
                    </div>
                    <div class="item-editor__effect-description">
                        Trigger: ${effect.trigger} | Actions: ${effect.actions?.length || 0}
                        ${effect.description ? ' | ' + this.escapeHtml(effect.description) : ''}
                    </div>
                </div>
                <div class="item-editor__effect-actions">
                    <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorEditEffect(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorRemoveEffect(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
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
                </div>
            `;
            return;
        }
        
        container.innerHTML = methods.map((method, index) => `
            <div class="item-editor__effect-item">
                <div class="item-editor__effect-info">
                    <div class="item-editor__effect-name">
                        ${this.escapeHtml(method.method)} ${method.location ? `- ${this.escapeHtml(method.location)}` : ''}
                    </div>
                    <div class="item-editor__effect-description">
                        ${method.chance ? `Chance: ${method.chance}%` : ''}
                        ${method.cost ? ` | Coût: ${method.cost} ${method.currency || 'money'}` : ''}
                        ${method.npc ? ` | NPC: ${method.npc}` : ''}
                    </div>
                </div>
                <div class="item-editor__effect-actions">
                    <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorEditObtainMethod(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="item-editor__effect-btn" onclick="window.itemEditorRemoveObtainMethod(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
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
                response = await this.adminPanel.apiCall('/api/admin/items', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            } else {
                // Mettre à jour l'item existant
                response = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}`, {
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
                
                // Recharger la liste
                await this.loadItems();
                
                // Sélectionner l'item sauvegardé
                if (this.selectedItemId === 'new') {
                    this.selectedItemId = formData.itemId;
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
        }
        
        // Validation nom
        const name = document.getElementById('itemName')?.value.trim();
        if (!name) {
            errors.push('Le nom de l\'item est requis');
        }
        
        // Validation description
        const description = document.getElementById('itemDescription')?.value.trim();
        if (!description || description.length < 10) {
            errors.push('La description doit faire au moins 10 caractères');
        }
        
        // Validation catégorie
        const category = document.getElementById('itemCategory')?.value;
        if (!category) {
            errors.push('La catégorie est requise');
        }
        
        if (errors.length > 0) {
            this.adminPanel.showNotification('Erreurs de validation:\n• ' + errors.join('\n• '), 'error');
            return false;
        }
        
        return true;
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
            isActive: document.getElementById('itemIsActive')?.checked
        };
    }

    async duplicateItem() {
        if (!this.selectedItemId || this.selectedItemId === 'new') {
            this.adminPanel.showNotification('Sélectionnez un item à dupliquer', 'warning');
            return;
        }
        
        console.log(`📋 [ItemEditor] Duplication item: ${this.selectedItemId}`);
        
        try {
            const response = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}/duplicate`, {
                method: 'POST'
            });
            
            if (response.success) {
                this.adminPanel.showNotification('Item dupliqué avec succès', 'success');
                await this.loadItems();
                
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
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'item "${this.currentItem?.name}" ?\n\nCette action ne peut pas être annulée.`)) {
            return;
        }
        
        console.log(`🗑️ [ItemEditor] Suppression item: ${this.selectedItemId}`);
        
        try {
            const response = await this.adminPanel.apiCall(`/api/admin/items/${this.selectedItemId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.adminPanel.showNotification('Item supprimé avec succès', 'success');
                
                // Reset l'éditeur
                this.selectedItemId = null;
                this.currentItem = null;
                this.unsavedChanges = false;
                
                await this.loadItems();
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

    // ===== PAGINATION =====

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateItemsList();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateItemsList();
        }
    }

    // ===== ACTIONS RAPIDES =====

    async refreshItems() {
        console.log('🔄 [ItemEditor] Actualisation items');
        await this.loadItems();
        this.adminPanel.showNotification('Liste des items actualisée', 'info');
    }

    async exportItems() {
        console.log('📤 [ItemEditor] Export items');
        
        try {
            const response = await this.adminPanel.apiCall('/api/admin/items/export/all');
            
            if (response.success) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `items_export_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
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
        // Nettoyage si nécessaire
        console.log('🧹 [ItemEditor] Cleanup module');
    }
}

// ===== FONCTIONS GLOBALES POUR L'INTERFACE =====

// ✅ CORRECTION: Utiliser une référence globale sécurisée
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

// Fonctions pour les effets et méthodes d'obtention
window.itemEditorAddEffect = () => {
    console.log('🎭 [ItemEditor] Ajout effet - À implémenter');
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};

window.itemEditorEditEffect = (index) => {
    console.log(`🎭 [ItemEditor] Édition effet ${index} - À implémenter`);
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};

window.itemEditorRemoveEffect = (index) => {
    console.log(`🗑️ [ItemEditor] Suppression effet ${index} - À implémenter`);
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};

window.itemEditorAddObtainMethod = () => {
    console.log('📍 [ItemEditor] Ajout méthode obtention - À implémenter');
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};

window.itemEditorEditObtainMethod = (index) => {
    console.log(`📍 [ItemEditor] Édition méthode ${index} - À implémenter`);
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};

window.itemEditorRemoveObtainMethod = (index) => {
    console.log(`🗑️ [ItemEditor] Suppression méthode ${index} - À implémenter`);
    if (window.adminPanel) {
        window.adminPanel.showNotification('Fonction en développement', 'info');
    }
};
