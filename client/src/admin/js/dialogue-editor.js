// client/src/admin/js/dialogue-editor.js
// Module d'édition des dialogues NPCs basé sur le modèle DialogString
// Mis à jour avec les nouvelles classes CSS

export class DialogueEditorModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.name = 'dialogueEditor';
        this.currentDialogue = null;
        this.currentCategory = 'all';
        this.currentNpc = 'all';
        this.searchTerm = '';
        this.dialogues = [];
        this.npcs = [];
        this.categories = ['greeting', 'ai', 'shop', 'healer', 'quest', 'battle', 'help', 'social', 'system', 'ui', 'error'];
        this.languages = {
            'eng': 'English',
            'fr': 'Français', 
            'es': 'Español',
            'de': 'Deutsch',
            'ja': '日本語',
            'it': 'Italiano',
            'pt': 'Português',
            'ko': '한국어',
            'zh': '中文'
        };
        
        console.log('🗨️ [DialogueEditor] Module initialisé');
    }

    onTabActivated() {
        console.log('🗨️ [DialogueEditor] Onglet activé');
        this.initializeInterface();
        this.loadDialogues();
    }

    initializeInterface() {
        const container = document.getElementById('dialogues');
        if (!container) {
            console.error('🗨️ [DialogueEditor] Container #dialogues non trouvé');
            return;
        }

        container.innerHTML = this.getDialogueEditorHTML();
        this.setupEventListeners();
    }

    getDialogueEditorHTML() {
        return `
            <div class="dialogue-editor-container">
                <!-- Header avec filtres et actions -->
                <div class="dialogue-header">
                    <div class="dialogue-header-controls">
                        <div class="dialogue-filters-group">
                            <div class="dialogue-filter-item">
                                <label for="categoryFilter" class="form-label">📂 Catégorie:</label>
                                <select id="categoryFilter" class="dialogue-form-select">
                                    <option value="all">Toutes les catégories</option>
                                    ${this.categories.map(cat => 
                                        `<option value="${cat}">${this.getCategoryName(cat)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="dialogue-filter-item">
                                <label for="npcFilter" class="form-label">👤 NPC:</label>
                                <select id="npcFilter" class="dialogue-form-select">
                                    <option value="all">Tous les NPCs</option>
                                    <!-- Sera rempli dynamiquement -->
                                </select>
                            </div>
                            
                            <div class="dialogue-filter-item">
                                <label for="dialogueSearch" class="form-label">🔍 Recherche:</label>
                                <input type="text" id="dialogueSearch" class="dialogue-form-input" 
                                       placeholder="Rechercher dans les dialogues...">
                            </div>
                        </div>
                        
                        <div class="dialogue-header-actions">
                            <button class="btn btn-success" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                                <i class="fas fa-plus"></i> Nouveau Dialogue
                            </button>
                            <button class="btn btn-info" onclick="adminPanel.dialogueEditor.loadDialogues()">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                            <button class="btn btn-info" onclick="adminPanel.dialogueEditor.showJSONSelector()">
                            <i class="fas fa-code"></i> JSON
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.dialogueEditor.exportDialogues()">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    
                    <!-- Stats -->
                    <div class="dialogue-zone-stats">
                        <div class="dialogue-stats-row">
                            <div class="dialogue-stat-item">
                                <div class="dialogue-stat-value" id="totalDialogues">0</div>
                                <div class="dialogue-stat-label">Total Dialogues</div>
                            </div>
                            <div class="dialogue-stat-item">
                                <div class="dialogue-stat-value" id="totalNpcs">0</div>
                                <div class="dialogue-stat-label">NPCs Uniques</div>
                            </div>
                            <div class="dialogue-stat-item">
                                <div class="dialogue-stat-value" id="totalCategories">0</div>
                                <div class="dialogue-stat-label">Catégories</div>
                            </div>
                            <div class="dialogue-stat-item">
                                <div class="dialogue-stat-value" id="missingTranslations">0</div>
                                <div class="dialogue-stat-label">Traductions Manquantes</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="dialogue-main-area">
                    <!-- Panel liste des dialogues -->
                    <div class="dialogue-list-panel">
                        <div class="dialogue-list-header">
                            <h3>📝 Dialogues</h3>
                            <div class="dialogue-list-info">
                                <span id="dialoguesCount">0</span> dialogues trouvés
                            </div>
                        </div>
                        
                        <div class="dialogue-list-container" id="dialoguesList">
                            <div class="dialogue-empty-list">
                                <i class="fas fa-comments"></i>
                                <p>Aucun dialogue trouvé</p>
                                <button class="btn btn-primary" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                                    <i class="fas fa-plus"></i> Créer le premier dialogue
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Panel éditeur -->
                    <div class="dialogue-editor-panel">
                        <div class="dialogue-editor-header">
                            <h3 class="dialogue-editor-title" id="editorTitle">✏️ Éditeur de Dialogue</h3>
                            <div class="dialogue-editor-actions" id="editorActions" style="display: none;">
                                <button class="btn btn-success btn-sm" onclick="adminPanel.dialogueEditor.saveDialogue()">
                                    <i class="fas fa-save"></i> Sauvegarder
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="adminPanel.dialogueEditor.duplicateDialogue()">
                                    <i class="fas fa-copy"></i> Dupliquer
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.dialogueEditor.deleteDialogue()">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="adminPanel.dialogueEditor.cancelEdit()">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                            </div>
                        </div>
                        
                        <div class="dialogue-editor-content">
                            <div class="dialogue-no-selection" id="noDialogueSelected">
                                <i class="fas fa-comments"></i>
                                <h3>Aucun dialogue sélectionné</h3>
                                <p>Sélectionnez un dialogue dans la liste ou créez-en un nouveau</p>
                            </div>
                            
                            <div class="dialogue-form-builder" id="dialogueFormBuilder" style="display: none;">
                                <!-- Le formulaire sera généré dynamiquement -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Filtres
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.filterDialogues();
        });

        document.getElementById('npcFilter').addEventListener('change', (e) => {
            this.currentNpc = e.target.value;
            this.filterDialogues();
        });

        document.getElementById('dialogueSearch').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterDialogues();
        });
    }

   async loadDialogues() {
    try {
        console.log('🗨️ [DialogueEditor] Chargement des dialogues...');
        
        // Vérifier l'authentification pour les requêtes sensibles
        if (!this.adminPanel.getAuthToken()) {
            console.warn('⚠️ [DialogueEditor] Pas de token d\'authentification');
            this.adminPanel.showNotification('Session expirée. Veuillez vous reconnecter.', 'warning');
            return;
        }
        
        const response = await this.adminPanel.apiCall('/dialogues', {
            headers: {
                'Authorization': `Bearer ${this.adminPanel.getAuthToken()}`
            }
        });
        
        if (response.success) {
            this.dialogues = response.dialogues || [];
            this.updateNPCFilter();
            this.updateStats();
            this.renderDialoguesList();
            console.log(`✅ [DialogueEditor] ${this.dialogues.length} dialogues chargés`);
        } else {
            throw new Error(response.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur chargement dialogues:', error);
        
        // ✅ GESTION SPÉCIALE DE L'ERREUR 401
        if (error.message.includes('Token requis') || error.message.includes('401')) {
            this.adminPanel.showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            window.location.reload();
            return;
        }
        
        this.adminPanel.showNotification('Erreur lors du chargement des dialogues: ' + error.message, 'error');
        
        // Fallback: essayer de charger via NPCs
        this.loadDialoguesFromNPCs();
    }
}

    async loadDialoguesFromNPCs() {
        try {
            console.log('🗨️ [DialogueEditor] Tentative de chargement via NPCs...');
            
            // Utiliser la route existante pour obtenir les NPCs
            const npcResponse = await this.adminPanel.apiCall('/npcs/stats');
            
            if (npcResponse.success) {
                // Simuler des dialogues de base pour chaque NPC
                this.dialogues = [];
                const mockDialogues = [
                    { category: 'greeting', context: 'welcome' },
                    { category: 'shop', context: 'buy' },
                    { category: 'help', context: 'info' }
                ];

                // Créer des dialogues par défaut (simulation)
                this.dialogues = mockDialogues.map((template, index) => ({
                    dialogId: `npc_${index + 1}.${template.category}.${template.context}`,
                    npcId: `npc_${index + 1}`,
                    category: template.category,
                    context: template.context,
                    eng: `Default ${template.category} dialogue`,
                    fr: `Dialogue ${template.category} par défaut`,
                    priority: 5,
                    isActive: true,
                    variables: [],
                    conditions: [],
                    tags: [template.category],
                    version: '1.0.0',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));

                this.updateNPCFilter();
                this.updateStats();
                this.renderDialoguesList();
                
                this.adminPanel.showNotification('Dialogues simulés chargés. Créez de vrais dialogues via l\'API.', 'warning');
            }
            
        } catch (error) {
            console.error('❌ [DialogueEditor] Erreur fallback:', error);
            this.adminPanel.showNotification('Impossible de charger les dialogues', 'error');
        }
    }

    updateNPCFilter() {
        const npcFilter = document.getElementById('npcFilter');
        if (!npcFilter) return;

        // Extraire les NPCs uniques
        const uniqueNpcs = [...new Set(this.dialogues.map(d => d.npcId).filter(Boolean))];
        
        npcFilter.innerHTML = `
            <option value="all">Tous les NPCs</option>
            ${uniqueNpcs.map(npcId => 
                `<option value="${npcId}">${npcId}</option>`
            ).join('')}
        `;
    }

    updateStats() {
        const totalDialogues = this.dialogues.length;
        const totalNpcs = new Set(this.dialogues.map(d => d.npcId).filter(Boolean)).size;
        const totalCategories = new Set(this.dialogues.map(d => d.category)).size;
        const missingTranslations = this.dialogues.filter(d => !d.fr || d.fr.trim() === '').length;

        document.getElementById('totalDialogues').textContent = totalDialogues;
        document.getElementById('totalNpcs').textContent = totalNpcs;
        document.getElementById('totalCategories').textContent = totalCategories;
        document.getElementById('missingTranslations').textContent = missingTranslations;
    }

    filterDialogues() {
        let filtered = this.dialogues;

        // Filtre par catégorie
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(d => d.category === this.currentCategory);
        }

        // Filtre par NPC
        if (this.currentNpc !== 'all') {
            filtered = filtered.filter(d => d.npcId === this.currentNpc);
        }

        // Filtre par recherche
        if (this.searchTerm.trim()) {
            const search = this.searchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                d.dialogId.toLowerCase().includes(search) ||
                d.eng.toLowerCase().includes(search) ||
                d.fr.toLowerCase().includes(search) ||
                d.npcId.toLowerCase().includes(search)
            );
        }

        this.renderDialoguesList(filtered);
    }

    renderDialoguesList(filteredDialogues = null) {
        const container = document.getElementById('dialoguesList');
        const dialogues = filteredDialogues || this.dialogues;
        
        document.getElementById('dialoguesCount').textContent = dialogues.length;

        if (dialogues.length === 0) {
            container.innerHTML = `
                <div class="dialogue-empty-list">
                    <i class="fas fa-search"></i>
                    <p>${this.searchTerm ? 'Aucun dialogue ne correspond à votre recherche' : 'Aucun dialogue trouvé'}</p>
                    ${!this.searchTerm ? `
                        <button class="btn btn-primary" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                            <i class="fas fa-plus"></i> Créer le premier dialogue
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const dialoguesHTML = dialogues.map(dialogue => `
            <div class="dialogue-list-item ${this.currentDialogue?.dialogId === dialogue.dialogId ? 'selected' : ''}" 
                 onclick="adminPanel.dialogueEditor.selectDialogue('${dialogue.dialogId}')">
                <div class="dialogue-item-icon">
                    ${this.getCategoryIcon(dialogue.category)}
                </div>
                <div class="dialogue-item-info">
                    <div class="dialogue-item-id">${dialogue.dialogId}</div>
                    <div class="dialogue-item-details">
                        <span class="dialogue-category-badge">${dialogue.category}</span>
                        <span class="dialogue-npc-badge">${dialogue.npcId || 'Global'}</span>
                        <span class="dialogue-priority-badge">P${dialogue.priority || 5}</span>
                    </div>
                    <div class="dialogue-item-preview">
                        ${(dialogue.fr || dialogue.eng || '').substring(0, 60)}${(dialogue.fr || dialogue.eng || '').length > 60 ? '...' : ''}
                    </div>
                    <div class="dialogue-item-status">
                        ${dialogue.isActive ? 
                            '<i class="fas fa-check-circle dialogue-status-icon success" title="Actif"></i>' : 
                            '<i class="fas fa-times-circle dialogue-status-icon error" title="Inactif"></i>'
                        }
                        ${!dialogue.fr ? '<i class="fas fa-exclamation-triangle dialogue-status-icon warning" title="Traduction FR manquante"></i>' : ''}
                        ${dialogue.conditions && dialogue.conditions.length > 0 ? '<i class="fas fa-code-branch dialogue-status-icon info" title="Conditions"></i>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = dialoguesHTML;
    }

   selectDialogue(dialogId) {
    console.log(`🗨️ [DialogueEditor] Sélection dialogue: ${dialogId}`);
    
    const dialogue = this.dialogues.find(d => d.dialogId === dialogId);
    if (!dialogue) {
        console.error(`❌ [DialogueEditor] Dialogue non trouvé: ${dialogId}`);
        this.adminPanel.showNotification(`Dialogue ${dialogId} non trouvé`, 'error');
        return;
    }

    // ✅ SUPPRIMER le flag isNew lors de la sélection
    this.currentDialogue = { ...dialogue };
    delete this.currentDialogue.isNew;
    
    this.renderDialoguesList(); // Refresh pour mettre à jour la sélection
    this.loadDialogueEditor();
}

    loadDialogueEditor() {
        if (!this.currentDialogue) return;

        document.getElementById('noDialogueSelected').style.display = 'none';
        document.getElementById('dialogueFormBuilder').style.display = 'block';
        document.getElementById('editorActions').style.display = 'flex';
        document.getElementById('editorTitle').textContent = `✏️ ${this.currentDialogue.dialogId}`;

        this.renderDialogueForm();
    }

   renderDialogueForm() {
    const container = document.getElementById('dialogueFormBuilder');
    const dialogue = this.currentDialogue;

    // [Le HTML du formulaire reste le même...]
    container.innerHTML = `
        <div class="dialogue-form-sections">
            <!-- Section Informations de base -->
            <div class="dialogue-form-section">
                <div class="dialogue-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4 class="dialogue-section-title">📋 Informations de Base</h4>
                    <span class="dialogue-section-toggle">▼</span>
                </div>
                <div class="dialogue-section-content">
                    <div class="dialogue-fields-grid">
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">ID du Dialogue <span class="dialogue-field-required">*</span></label>
                            <input type="text" class="dialogue-form-input" id="dialogId" value="${dialogue.dialogId}" 
                                   placeholder="ex: prof_oak.greeting.welcome">
                            <div class="dialogue-field-help">Format REQUIS: npcId.category.context[.variant]</div>
                        </div>
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">NPC ID <span class="dialogue-field-required">*</span></label>
                            <input type="text" class="dialogue-form-input" id="npcId" value="${dialogue.npcId || ''}" 
                                   placeholder="ex: prof_oak">
                            <div class="dialogue-field-help">Doit correspondre au début de l'ID du dialogue</div>
                        </div>
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">Catégorie <span class="dialogue-field-required">*</span></label>
                            <select class="dialogue-form-select" id="category">
                                ${this.categories.map(cat => 
                                    `<option value="${cat}" ${dialogue.category === cat ? 'selected' : ''}>${this.getCategoryName(cat)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">Contexte <span class="dialogue-field-required">*</span></label>
                            <input type="text" class="dialogue-form-input" id="context" value="${dialogue.context || ''}" 
                                   placeholder="ex: welcome, buy, help">
                            <div class="dialogue-field-help">Utilisé dans l'ID du dialogue</div>
                        </div>
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">Priorité</label>
                            <input type="number" class="dialogue-form-input" id="priority" value="${dialogue.priority || 5}" 
                                   min="1" max="10">
                            <div class="dialogue-field-help">1-10 (10 = priorité maximale)</div>
                        </div>
                        <div class="dialogue-boolean-field">
                            <input type="checkbox" class="dialogue-form-checkbox" id="isActive" ${dialogue.isActive ? 'checked' : ''}>
                            <label class="dialogue-checkbox-label" for="isActive">Dialogue actif</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section Traductions -->
            <div class="dialogue-form-section">
                <div class="dialogue-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4 class="dialogue-section-title">🌍 Traductions</h4>
                    <span class="dialogue-section-toggle">▼</span>
                </div>
                <div class="dialogue-section-content">
                    ${Object.entries(this.languages).map(([code, name]) => `
                        <div class="dialogue-form-field">
                            <label class="dialogue-field-label">
                                ${name} (${code.toUpperCase()}) 
                                ${code === 'eng' || code === 'fr' ? '<span class="dialogue-field-required">*</span>' : ''}
                            </label>
                            <textarea class="dialogue-form-textarea" id="lang_${code}" rows="3" 
                                      placeholder="Texte en ${name}...">${dialogue[code] || ''}</textarea>
                            <div class="dialogue-field-help">
                                Variables: %s (joueur), %t (cible), %custom pour variables personnalisées
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Section Variables -->
            <div class="dialogue-form-section">
                <div class="dialogue-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4 class="dialogue-section-title">🔧 Variables et Conditions</h4>
                    <span class="dialogue-section-toggle">▼</span>
                </div>
                <div class="dialogue-section-content">
                    <div class="dialogue-form-field">
                        <label class="dialogue-field-label">Variables Utilisées</label>
                        <div class="dialogue-array-field" id="variablesContainer">
                            ${(dialogue.variables || []).map((variable, index) => `
                                <div class="dialogue-array-item">
                                    <input type="text" class="dialogue-form-input" value="${variable}" 
                                           onchange="adminPanel.dialogueEditor.updateVariable(${index}, this.value)">
                                    <button type="button" class="btn btn-danger btn-sm dialogue-remove-array-item" 
                                            onclick="adminPanel.dialogueEditor.removeVariable(${index})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                            <button type="button" class="btn btn-primary btn-sm dialogue-add-array-item" 
                                    onclick="adminPanel.dialogueEditor.addVariable()">
                                <i class="fas fa-plus"></i> Ajouter Variable
                            </button>
                        </div>
                        <div class="dialogue-field-help">
                            Variables utilisées dans le texte (ex: playerName, targetName)
                        </div>
                    </div>

                    <div class="dialogue-form-field">
                        <label class="dialogue-field-label">Conditions d'Affichage (JSON)</label>
                        <textarea class="dialogue-form-textarea dialogue-json-editor" id="conditions" rows="4" 
                                  placeholder='[{"type": "level", "operator": ">=", "value": 10}]'>${JSON.stringify(dialogue.conditions || [], null, 2)}</textarea>
                        <div class="dialogue-field-help">
                            Conditions pour afficher ce dialogue (format JSON)
                        </div>
                    </div>

                    <div class="dialogue-form-field">
                        <label class="dialogue-field-label">Tags</label>
                        <input type="text" class="dialogue-form-input" id="tags" 
                               value="${(dialogue.tags || []).join(', ')}" 
                               placeholder="tag1, tag2, tag3">
                        <div class="dialogue-field-help">Tags séparés par des virgules</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ✅ AJOUTER des event listeners pour auto-complétion
    this.setupAutoCompletion();
}

setupAutoCompletion() {
    const dialogIdField = document.getElementById('dialogId');
    const npcIdField = document.getElementById('npcId');
    const categoryField = document.getElementById('category');
    const contextField = document.getElementById('context');

    // Auto-complétion lors de la modification de l'ID du dialogue
    if (dialogIdField) {
        dialogIdField.addEventListener('input', () => {
            const parts = dialogIdField.value.split('.');
            if (parts.length >= 1 && npcIdField && !npcIdField.value.trim()) {
                npcIdField.value = parts[0];
            }
            if (parts.length >= 2 && categoryField) {
                const category = parts[1];
                if (this.categories.includes(category)) {
                    categoryField.value = category;
                }
            }
            if (parts.length >= 3 && contextField && !contextField.value.trim()) {
                contextField.value = parts[2];
            }
        });
    }

    // Reconstruction de l'ID lors de modification des autres champs
    const updateDialogId = () => {
        if (dialogIdField && npcIdField && categoryField && contextField) {
            const npcId = npcIdField.value.trim();
            const category = categoryField.value;
            const context = contextField.value.trim();
            
            if (npcId && category && context) {
                const newId = `${npcId}.${category}.${context}`;
                // Ne pas écraser si l'utilisateur a déjà un variant
                if (!dialogIdField.value.includes(newId)) {
                    dialogIdField.value = newId;
                }
            }
        }
    };

    [npcIdField, categoryField, contextField].forEach(field => {
        if (field) {
            field.addEventListener('blur', updateDialogId);
        }
    });
}
    
  // ✅ CORRECTION: createNewDialogue - utiliser apiCall correctement
async createNewDialogue() {
    console.log('🗨️ [DialogueEditor] Création nouveau dialogue en DB');
    
    try {
        const timestamp = Date.now();
        const defaultData = {
            dialogId: `new_npc.greeting.welcome.${timestamp}`,
            npcId: 'new_npc',
            category: 'greeting',
            context: 'welcome',
            eng: 'Hello! I am a new NPC.',
            fr: 'Bonjour ! Je suis un nouveau PNJ.',
            priority: 5,
            isActive: true,
            variables: [],
            conditions: [],
            tags: ['new'],
            version: '1.0.0'
        };

        // ✅ UTILISER apiCall qui gère l'auth automatiquement
        const response = await this.adminPanel.apiCall('/dialogues', {
            method: 'POST',
            body: JSON.stringify(defaultData)
        });

        if (response.success) {
            this.adminPanel.showNotification('Nouveau dialogue créé en DB', 'success');
            await this.loadDialogues();
            this.selectDialogue(defaultData.dialogId);
        } else {
            throw new Error(response.error || 'Erreur création dialogue');
        }
        
    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur création:', error);
        this.adminPanel.showNotification('Erreur création dialogue: ' + error.message, 'error');
    }
}



   getFormData() {
    const formData = {
        dialogId: document.getElementById('dialogId').value.trim(),
        npcId: document.getElementById('npcId').value.trim(),
        category: document.getElementById('category').value,
        context: document.getElementById('context').value.trim(),
        priority: parseInt(document.getElementById('priority').value) || 5,
        isActive: document.getElementById('isActive').checked,
        variables: [],
        conditions: [],
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
        version: '1.0.0'
    };

    // ✅ AUTO-COMPLÉTER npcId depuis dialogId si vide
    if (!formData.npcId && formData.dialogId) {
        formData.npcId = formData.dialogId.split('.')[0];
        // Mettre à jour le champ dans l'interface
        document.getElementById('npcId').value = formData.npcId;
    }

    // ✅ AUTO-COMPLÉTER context depuis dialogId si vide
    if (!formData.context && formData.dialogId) {
        const parts = formData.dialogId.split('.');
        if (parts.length >= 3) {
            formData.context = parts[2];
            document.getElementById('context').value = formData.context;
        }
    }

    // Récupérer les traductions
    Object.keys(this.languages).forEach(code => {
        const element = document.getElementById(`lang_${code}`);
        if (element) {
            formData[code] = element.value.trim();
        }
    });

    // Récupérer les variables
    document.querySelectorAll('#variablesContainer .dialogue-array-item input').forEach(input => {
        if (input.value.trim()) {
            formData.variables.push(input.value.trim());
        }
    });

    // Récupérer les conditions
    try {
        const conditionsText = document.getElementById('conditions').value.trim();
        if (conditionsText) {
            formData.conditions = JSON.parse(conditionsText);
        }
    } catch (error) {
        console.warn('❌ [DialogueEditor] Conditions JSON invalides:', error);
        formData.conditions = [];
    }

    return formData;
}

    validateDialogue(data) {
    const errors = [];

    // Validation ID du dialogue
    if (!data.dialogId || !data.dialogId.trim()) {
        errors.push('ID du dialogue requis');
    } else {
        // ✅ VALIDATION FORMAT: npcId.category.context[.variant]
        const idParts = data.dialogId.split('.');
        if (idParts.length < 3 || idParts.length > 4) {
            errors.push('Format ID invalide. Utilisez: npcId.category.context[.variant]');
        } else {
            // Vérifier que les parties ne sont pas vides
            if (idParts.some(part => !part.trim())) {
                errors.push('Les parties de l\'ID ne peuvent pas être vides');
            }
            
            // Vérifier que la catégorie est valide
            if (!this.categories.includes(idParts[1])) {
                errors.push(`Catégorie invalide. Utilisez: ${this.categories.join(', ')}`);
            }
        }
    }

    // Validation textes requis
    if (!data.eng || !data.eng.trim()) {
        errors.push('Texte anglais requis');
    }

    if (!data.fr || !data.fr.trim()) {
        errors.push('Texte français requis');
    }

    // Validation catégorie
    if (!data.category) {
        errors.push('Catégorie requise');
    }

    // ✅ VALIDATION NPC ID cohérent avec dialogue ID
    if (data.npcId && data.dialogId) {
        const dialogNpcId = data.dialogId.split('.')[0];
        if (data.npcId !== dialogNpcId) {
            errors.push('Le NPC ID doit correspondre au début de l\'ID du dialogue');
        }
    }

    if (errors.length > 0) {
        this.adminPanel.showNotification('Erreurs de validation:\n• ' + errors.join('\n• '), 'error');
        return false;
    }

    return true;
}

    async saveDialogueToAPI(dialogueData) {
        try {
            // Essayer d'utiliser l'API réelle si elle existe
            const response = await this.adminPanel.apiCall('/dialogues', {
                method: 'POST',
                body: JSON.stringify(dialogueData)
            });
            return response;
        } catch (error) {
            // Fallback: simulation locale
            console.warn('🗨️ [DialogueEditor] API non disponible, simulation locale');
            
            // Mettre à jour ou ajouter dans la liste locale
            const existingIndex = this.dialogues.findIndex(d => d.dialogId === dialogueData.dialogId);
            
            if (existingIndex >= 0) {
                this.dialogues[existingIndex] = { ...dialogueData, updatedAt: new Date().toISOString() };
            } else {
                this.dialogues.push({ ...dialogueData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            }

            return { success: true, message: 'Dialogue sauvegardé localement' };
        }
    }

   // Corrections pour l'authentification dans dialogue-editor.js

// ✅ CORRECTION 1: createNewDialogue avec headers d'authentification
async createNewDialogue() {
    console.log('🗨️ [DialogueEditor] Création nouveau dialogue en DB');
    
    try {
        // Vérifier que l'AdminPanel est authentifié
        if (!this.adminPanel.getAuthToken()) {
            this.adminPanel.showNotification('Vous devez être connecté pour créer un dialogue', 'error');
            return;
        }

        // Générer un ID valide selon le format requis: npcId.category.context[.variant]
        const timestamp = Date.now();
        const defaultData = {
            dialogId: `new_npc.greeting.welcome.${timestamp}`,
            npcId: 'new_npc',
            category: 'greeting',
            context: 'welcome',
            eng: 'Hello! I am a new NPC.',
            fr: 'Bonjour ! Je suis un nouveau PNJ.',
            priority: 5,
            isActive: true,
            variables: [],
            conditions: [],
            tags: ['new'],
            version: '1.0.0'
        };

        console.log('🔑 [DialogueEditor] Envoi avec token:', this.adminPanel.getAuthToken() ? 'Présent' : 'MANQUANT');

        // ✅ CRÉER DIRECTEMENT EN DB VIA API avec authentification
        const response = await this.adminPanel.apiCall('/dialogues', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.adminPanel.getAuthToken()}`
            },
            body: JSON.stringify(defaultData)
        });

        if (response.success) {
            this.adminPanel.showNotification('Nouveau dialogue créé en DB', 'success');
            
            // Recharger la liste depuis la DB
            await this.loadDialogues();
            
            // Sélectionner le nouveau dialogue
            this.selectDialogue(defaultData.dialogId);
            
        } else {
            throw new Error(response.error || 'Erreur création dialogue');
        }
        
    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur création:', error);
        
        // ✅ GESTION SPÉCIALE DE L'ERREUR 401
        if (error.message.includes('Token requis') || error.message.includes('401')) {
            this.adminPanel.showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            // Rediriger vers la page de connexion ou rafraîchir le token
            window.location.reload();
            return;
        }
        
        this.adminPanel.showNotification('Erreur création dialogue: ' + error.message, 'error');
    }
}

// ✅ CORRECTION 2: saveDialogue avec headers d'authentification
async saveDialogue() {
    if (!this.currentDialogue) {
        this.adminPanel.showNotification('Aucun dialogue sélectionné', 'error');
        return;
    }

    try {
        const formData = this.getFormData();
        
        if (!this.validateDialogue(formData)) {
            return;
        }

        const isNewDialogue = this.currentDialogue.isNew || 
                             !this.dialogues.find(d => d.dialogId === this.currentDialogue.dialogId);

        let response;
        
        if (isNewDialogue) {
            response = await this.adminPanel.apiCall('/dialogues', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        } else {
            response = await this.adminPanel.apiCall(`/dialogues/${encodeURIComponent(this.currentDialogue.dialogId)}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        }
        
        if (response.success) {
            this.adminPanel.showNotification(
                isNewDialogue ? 'Dialogue créé avec succès' : 'Dialogue mis à jour avec succès', 
                'success'
            );
            await this.loadDialogues();
            this.selectDialogue(formData.dialogId);
        } else {
            throw new Error(response.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur sauvegarde:', error);
        this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error');
    }
}
// ✅ CORRECTION 3: deleteDialogue avec headers d'authentification
async deleteDialogue() {
    if (!this.currentDialogue) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le dialogue "${this.currentDialogue.dialogId}" ?\n\nCette action est irréversible.`)) {
        return;
    }

    try {
        const response = await this.adminPanel.apiCall(`/dialogues/${encodeURIComponent(this.currentDialogue.dialogId)}`, {
            method: 'DELETE'
        });

        if (response.success) {
            this.adminPanel.showNotification('Dialogue supprimé avec succès', 'success');
            this.currentDialogue = null;
            this.cancelEdit();
            await this.loadDialogues();
        } else {
            throw new Error(response.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur suppression:', error);
        this.adminPanel.showNotification('Erreur suppression: ' + error.message, 'error');
    }
}
// ✅ CORRECTION 4: duplicateDialogue avec headers d'authentification
async duplicateDialogue() {
    if (!this.currentDialogue) return;

    try {
        const timestamp = Date.now();
        const originalId = this.currentDialogue.dialogId;
        const idParts = originalId.split('.');
        
        let newDialogId;
        if (idParts.length >= 3) {
            newDialogId = `${idParts[0]}.${idParts[1]}.${idParts[2]}.copy_${timestamp}`;
        } else {
            newDialogId = `${originalId}_copy_${timestamp}`;
        }

        const duplicateData = {
            ...this.currentDialogue,
            dialogId: newDialogId,
            eng: this.currentDialogue.eng + ' (Copy)',
            fr: this.currentDialogue.fr + ' (Copie)'
        };

        const response = await this.adminPanel.apiCall('/dialogues', {
            method: 'POST',
            body: JSON.stringify(duplicateData)
        });

        if (response.success) {
            this.adminPanel.showNotification('Dialogue dupliqué avec succès', 'success');
            await this.loadDialogues();
            this.selectDialogue(newDialogId);
        } else {
            throw new Error(response.error || 'Erreur duplication');
        }

    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur duplication:', error);
        this.adminPanel.showNotification('Erreur duplication: ' + error.message, 'error');
    }
}

   async deleteDialogue() {
    if (!this.currentDialogue) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le dialogue "${this.currentDialogue.dialogId}" ?\n\nCette action est irréversible.`)) {
        return;
    }

    try {
        // Vérifier l'authentification
        if (!this.adminPanel.getAuthToken()) {
            this.adminPanel.showNotification('Vous devez être connecté pour supprimer', 'error');
            return;
        }

        console.log(`🗑️ [DialogueEditor] Suppression dialogue: ${this.currentDialogue.dialogId}`);
        
        // ✅ SUPPRIMER via API DELETE avec authentification
        const response = await this.adminPanel.apiCall(`/dialogues/${encodeURIComponent(this.currentDialogue.dialogId)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.adminPanel.getAuthToken()}`
            }
        });

        if (response.success) {
            this.adminPanel.showNotification('Dialogue supprimé avec succès', 'success');
            
            // Reset l'éditeur
            this.currentDialogue = null;
            this.cancelEdit();
            
            // ✅ RECHARGER depuis la DB
            await this.loadDialogues();
            
        } else {
            throw new Error(response.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur suppression:', error);
        
        // ✅ GESTION SPÉCIALE DE L'ERREUR 401
        if (error.message.includes('Token requis') || error.message.includes('401')) {
            this.adminPanel.showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            window.location.reload();
            return;
        }
        
        this.adminPanel.showNotification('Erreur suppression: ' + error.message, 'error');
    }
}

    cancelEdit() {
        this.currentDialogue = null;
        document.getElementById('noDialogueSelected').style.display = 'block';
        document.getElementById('dialogueFormBuilder').style.display = 'none';
        document.getElementById('editorActions').style.display = 'none';
        document.getElementById('editorTitle').textContent = '✏️ Éditeur de Dialogue';
        this.renderDialoguesList(); // Refresh pour enlever la sélection
    }

    // Gestion des variables
    addVariable() {
        const container = document.getElementById('variablesContainer');
        const items = container.querySelectorAll('.dialogue-array-item');
        const index = items.length;

        const newItem = document.createElement('div');
        newItem.className = 'dialogue-array-item';
        newItem.innerHTML = `
            <input type="text" class="dialogue-form-input" placeholder="Nom de la variable" 
                   onchange="adminPanel.dialogueEditor.updateVariable(${index}, this.value)">
            <button type="button" class="btn btn-danger btn-sm dialogue-remove-array-item" 
                    onclick="adminPanel.dialogueEditor.removeVariable(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.insertBefore(newItem, container.querySelector('.dialogue-add-array-item'));
    }

    removeVariable(index) {
        const container = document.getElementById('variablesContainer');
        const items = container.querySelectorAll('.dialogue-array-item');
        if (items[index]) {
            items[index].remove();
            // Re-indexer les éléments restants
            this.reindexVariables();
        }
    }

    updateVariable(index, value) {
        // La valeur est automatiquement mise à jour dans l'input
        console.log(`🗨️ [DialogueEditor] Variable ${index} mise à jour: ${value}`);
    }

    reindexVariables() {
        const container = document.getElementById('variablesContainer');
        const items = container.querySelectorAll('.dialogue-array-item');
        
        items.forEach((item, newIndex) => {
            const input = item.querySelector('input');
            const button = item.querySelector('button');
            
            input.setAttribute('onchange', `adminPanel.dialogueEditor.updateVariable(${newIndex}, this.value)`);
            button.setAttribute('onclick', `adminPanel.dialogueEditor.removeVariable(${newIndex})`);
        });
    }

    async exportDialogues() {
        try {
            console.log('🗨️ [DialogueEditor] Export des dialogues...');
            
            // Afficher le loading
            const exportButton = document.querySelector('[onclick="adminPanel.dialogueEditor.exportDialogues()"]');
            const originalHTML = exportButton.innerHTML;
            exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Export...';
            exportButton.disabled = true;
            
            // Préparer les données d'export
            const exportData = {
                exportedAt: new Date().toISOString(),
                exportedBy: 'Admin Panel',
                version: '1.0.0',
                totalDialogues: this.dialogues.length,
                categories: this.categories,
                languages: Object.keys(this.languages),
                statistics: {
                    totalNpcs: new Set(this.dialogues.map(d => d.npcId).filter(Boolean)).size,
                    totalCategories: new Set(this.dialogues.map(d => d.category)).size,
                    missingTranslations: this.dialogues.filter(d => !d.fr || d.fr.trim() === '').length,
                    activeDialogues: this.dialogues.filter(d => d.isActive).length,
                    inactiveDialogues: this.dialogues.filter(d => !d.isActive).length
                },
                dialogues: this.dialogues
            };

            // Créer et télécharger le fichier JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `dialogues_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            // Restaurer le bouton
            exportButton.innerHTML = originalHTML;
            exportButton.disabled = false;
            
            this.adminPanel.showNotification(`${this.dialogues.length} dialogues exportés avec succès`, 'success');
            
        } catch (error) {
            console.error('❌ [DialogueEditor] Erreur export:', error);
            this.adminPanel.showNotification('Erreur lors de l\'export: ' + error.message, 'error');
            
            // Restaurer le bouton en cas d'erreur
            const exportButton = document.querySelector('[onclick="adminPanel.dialogueEditor.exportDialogues()"]');
            if (exportButton) {
                exportButton.innerHTML = '<i class="fas fa-download"></i> Export';
                exportButton.disabled = false;
            }
        }
    }

    // Utilitaires pour l'affichage des messages
    showMessage(message, type = 'info') {
        const container = document.querySelector('.dialogue-editor-content');
        if (!container) return;

        // Supprimer les anciens messages
        container.querySelectorAll('.dialogue-success-message, .dialogue-error-message, .dialogue-warning-message').forEach(msg => {
            msg.remove();
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = `dialogue-${type}-message`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'info-circle';
        
        messageDiv.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
        `;

        container.insertBefore(messageDiv, container.firstChild);

        // Supprimer automatiquement après 5 secondes
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Validation en temps réel
    setupFormValidation() {
        const form = document.getElementById('dialogueFormBuilder');
        if (!form) return;

        // Validation des champs requis
        ['dialogId', 'lang_eng', 'lang_fr', 'category'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });

        // Validation JSON pour les conditions
        const conditionsField = document.getElementById('conditions');
        if (conditionsField) {
            conditionsField.addEventListener('blur', () => this.validateJSON('conditions'));
        }
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.dialogue-form-field');
        
        if (!field.value.trim()) {
            fieldContainer.classList.add('field-error');
            fieldContainer.classList.remove('field-success');
            return false;
        } else {
            fieldContainer.classList.remove('field-error');
            fieldContainer.classList.add('field-success');
            return true;
        }
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.dialogue-form-field');
        fieldContainer.classList.remove('field-error');
    }

    validateJSON(fieldId) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.dialogue-form-field');
        
        if (field.value.trim() === '') {
            fieldContainer.classList.remove('field-error', 'field-success');
            field.classList.remove('dialogue-json-error');
            return true;
        }

        try {
            JSON.parse(field.value);
            fieldContainer.classList.remove('field-error');
            fieldContainer.classList.add('field-success');
            field.classList.remove('dialogue-json-error');
            return true;
        } catch (error) {
            fieldContainer.classList.add('field-error');
            fieldContainer.classList.remove('field-success');
            field.classList.add('dialogue-json-error');
            return false;
        }
    }

    // Recherche avancée avec highlighting
    highlightSearchResults() {
        if (!this.searchTerm) return;

        const items = document.querySelectorAll('.dialogue-list-item');
        items.forEach(item => {
            const searchTerm = this.searchTerm.toLowerCase();
            const dialogId = item.querySelector('.dialogue-item-id').textContent.toLowerCase();
            const preview = item.querySelector('.dialogue-item-preview').textContent.toLowerCase();
            
            if (dialogId.includes(searchTerm) || preview.includes(searchTerm)) {
                item.classList.add('search-highlight');
            } else {
                item.classList.remove('search-highlight');
            }
        });
    }

    // Gestion des raccourcis clavier
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S pour sauvegarder
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentDialogue) {
                    this.saveDialogue();
                }
            }
            
            // Ctrl+N pour nouveau dialogue
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.createNewDialogue();
            }
            
            // Escape pour annuler
            if (e.key === 'Escape') {
                if (this.currentDialogue) {
                    this.cancelEdit();
                }
            }
        });
    }

    // Utilitaires
    getCategoryName(category) {
        const names = {
            'greeting': '👋 Salutations',
            'ai': '🤖 IA Intelligente',
            'shop': '🏪 Boutique',
            'healer': '💊 Soigneur',
            'quest': '⚔️ Quêtes',
            'battle': '⚔️ Combat',
            'help': '❓ Aide',
            'social': '💬 Social',
            'system': '⚙️ Système',
            'ui': '🖥️ Interface',
            'error': '❌ Erreurs'
        };
        return names[category] || category;
    }

    getCategoryIcon(category) {
        const icons = {
            'greeting': '👋',
            'ai': '🤖',
            'shop': '🏪',
            'healer': '💊',
            'quest': '⚔️',
            'battle': '⚔️',
            'help': '❓',
            'social': '💬',
            'system': '⚙️',
            'ui': '🖥️',
            'error': '❌'
        };
        return icons[category] || '💬';
    }

    // Amélioration: Auto-save
    enableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (this.currentDialogue && this.hasUnsavedChanges()) {
                this.autoSaveDialogue();
            }
        }, 30000); // Auto-save toutes les 30 secondes
    }

    hasUnsavedChanges() {
        if (!this.currentDialogue) return false;
        
        const formData = this.getFormData();
        return JSON.stringify(formData) !== JSON.stringify(this.currentDialogue);
    }

    async saveDialogue() {
    if (!this.currentDialogue) {
        this.adminPanel.showNotification('Aucun dialogue sélectionné', 'error');
        return;
    }

    try {
        // Vérifier l'authentification
        if (!this.adminPanel.getAuthToken()) {
            this.adminPanel.showNotification('Vous devez être connecté pour sauvegarder', 'error');
            return;
        }

        console.log(`🗨️ [DialogueEditor] Sauvegarde dialogue: ${this.currentDialogue.dialogId}`);
        
        // Récupérer les données du formulaire
        const formData = this.getFormData();
        
        // ✅ VALIDATION STRICTE pour le format dialogId
        if (!this.validateDialogue(formData)) {
            return;
        }

        // ✅ DÉTERMINER si c'est une création ou mise à jour
        const isNewDialogue = this.currentDialogue.isNew || 
                             !this.dialogues.find(d => d.dialogId === this.currentDialogue.dialogId);

        let response;
        
        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.adminPanel.getAuthToken()}`
        };

        if (isNewDialogue) {
            // ✅ CRÉATION via POST
            console.log('🆕 [DialogueEditor] Création nouveau dialogue');
            response = await this.adminPanel.apiCall('/dialogues', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(formData)
            });
        } else {
            // ✅ MISE À JOUR via PUT
            console.log('📝 [DialogueEditor] Mise à jour dialogue existant');
            response = await this.adminPanel.apiCall(`/dialogues/${encodeURIComponent(this.currentDialogue.dialogId)}`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify(formData)
            });
        }
        
        if (response.success) {
            this.adminPanel.showNotification(
                isNewDialogue ? 'Dialogue créé avec succès' : 'Dialogue mis à jour avec succès', 
                'success'
            );
            
            // ✅ RECHARGER depuis la DB et re-sélectionner
            await this.loadDialogues();
            this.selectDialogue(formData.dialogId);
            
        } else {
            throw new Error(response.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('❌ [DialogueEditor] Erreur sauvegarde:', error);
        
        // ✅ GESTION SPÉCIALE DE L'ERREUR 401
        if (error.message.includes('Token requis') || error.message.includes('401')) {
            this.adminPanel.showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            window.location.reload();
            return;
        }
        
        this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error');
    }
}
    async autoSaveDialogue() {
        try {
            const formData = this.getFormData();
            if (this.validateDialogue(formData)) {
                await this.saveDialogueToAPI(formData);
                this.showMessage('Auto-sauvegarde effectuée', 'info');
            }
        } catch (error) {
            console.warn('❌ [DialogueEditor] Erreur auto-save:', error);
        }
    }

    // Nettoyage
    cleanup() {
        console.log('🗨️ [DialogueEditor] Nettoyage du module');
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // Supprimer les event listeners globaux
        document.removeEventListener('keydown', this.handleKeydown);
        
        this.currentDialogue = null;
        this.dialogues = [];
    }


showJSONSelector() {
    let jsonData;
    
    if (this.currentDialogue) {
        // JSON pour le dialogue sélectionné uniquement
        jsonData = {
            dialogue: this.currentDialogue,
            metadata: {
                dialogueId: this.currentDialogue.dialogId,
                lastModified: new Date().toISOString(),
                category: this.currentDialogue.category,
                npcId: this.currentDialogue.npcId
            }
        };
    } else {
        // Dialogue de base si aucun sélectionné
        jsonData = {
            dialogue: {
                dialogId: "new_dialogue",
                npcId: "",
                category: "greeting",
                context: "default",
                eng: "New dialogue text",
                fr: "Nouveau texte de dialogue",
                priority: 5,
                isActive: true,
                variables: [],
                conditions: [],
                tags: [],
                version: "1.0.0"
            },
            metadata: {
                dialogueId: "new_dialogue",
                lastModified: new Date().toISOString(),
                category: "greeting",
                npcId: ""
            }
        };
    }

    const modal = this.createJSONModal(jsonData);
    document.body.appendChild(modal);
}

createJSONModal(jsonData) {
    const modal = document.createElement('div');
    modal.className = 'dialogue-import-modal';
    modal.innerHTML = `
        <div class="dialogue-import-modal-backdrop"></div>
        <div class="dialogue-import-modal-content">
            <div class="dialogue-import-modal-header">
                <h3>📝 Éditeur JSON des Dialogues</h3>
                <button class="btn-close" onclick="this.closest('.dialogue-import-modal').remove()">×</button>
            </div>
            <div class="dialogue-import-modal-body">
                <div class="dialogue-import-step">
                    <h4>Modifier le JSON des dialogues</h4>
                    <textarea id="dialogueJSONEditor" class="dialogue-json-editor" rows="20" style="width: 100%; font-family: monospace; font-size: 12px;">${JSON.stringify(jsonData, null, 2)}</textarea>
                    <div class="dialogue-field-help" style="margin-top: 10px;">
                        ⚠️ Attention : Modifiez uniquement les données que vous maîtrisez. Une erreur JSON empêchera la sauvegarde.
                    </div>
                </div>
            </div>
            <div class="dialogue-import-actions">
                <button class="btn btn-secondary" onclick="this.closest('.dialogue-import-modal').remove()">
                    <i class="fas fa-times"></i> Annuler
                </button>
                <button class="btn btn-warning" onclick="adminPanel.dialogueEditor.validateJSON()">
                    <i class="fas fa-check"></i> Valider JSON
                </button>
                <button class="btn btn-success" onclick="adminPanel.dialogueEditor.saveFromJSON()">
                    <i class="fas fa-save"></i> Sauvegarder
                </button>
            </div>
        </div>
    `;
    return modal;
}

validateJSON() {
    const textarea = document.getElementById('dialogueJSONEditor');
    try {
        const parsed = JSON.parse(textarea.value);
        textarea.style.borderColor = '#27ae60';
        textarea.style.background = '#f8fff8';
        this.adminPanel.showNotification('JSON valide ✅', 'success');
        return true;
    } catch (error) {
        textarea.style.borderColor = '#e74c3c';
        textarea.style.background = '#fff5f5';
        this.adminPanel.showNotification('Erreur JSON: ' + error.message, 'error');
        return false;
    }
}

async saveFromJSON() {
    if (!this.validateJSON()) return;

    const textarea = document.getElementById('dialogueJSONEditor');
    try {
        const newData = JSON.parse(textarea.value);
        
        if (newData.dialogue) {
            // Remplacer ou ajouter le dialogue
            const dialogueData = newData.dialogue;
            const existingIndex = this.dialogues.findIndex(d => d.dialogId === dialogueData.dialogId);
            
            if (existingIndex >= 0) {
                this.dialogues[existingIndex] = { ...dialogueData, updatedAt: new Date().toISOString() };
            } else {
                this.dialogues.push({ ...dialogueData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            }

            this.currentDialogue = dialogueData;
            this.updateNPCFilter();
            this.updateStats();
            this.renderDialoguesList();
            this.loadDialogueEditor();
            
            this.adminPanel.showNotification(`Dialogue "${dialogueData.dialogId}" sauvegardé depuis JSON`, 'success');
            document.querySelector('.dialogue-import-modal').remove();
        } else {
            throw new Error('Format JSON invalide: propriété "dialogue" manquante');
        }
    } catch (error) {
        this.adminPanel.showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
    }
}

    
    // Initialisation complète avec toutes les améliorations
    initialize() {
        this.setupKeyboardShortcuts();
        this.enableAutoSave();
        
        // Ajouter des observers pour la validation en temps réel
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const formBuilder = document.getElementById('dialogueFormBuilder');
                    if (formBuilder && formBuilder.style.display !== 'none') {
                        this.setupFormValidation();
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observer = observer;
    }
}
