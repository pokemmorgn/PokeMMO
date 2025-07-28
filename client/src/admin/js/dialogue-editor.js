// client/src/admin/js/dialogue-editor.js
// Module d'édition des dialogues NPCs basé sur le modèle DialogString

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
                    <div class="header-controls">
                        <div class="filters-group">
                            <div class="filter-item">
                                <label for="categoryFilter" class="form-label">📂 Catégorie:</label>
                                <select id="categoryFilter" class="form-select">
                                    <option value="all">Toutes les catégories</option>
                                    ${this.categories.map(cat => 
                                        `<option value="${cat}">${this.getCategoryName(cat)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="filter-item">
                                <label for="npcFilter" class="form-label">👤 NPC:</label>
                                <select id="npcFilter" class="form-select">
                                    <option value="all">Tous les NPCs</option>
                                    <!-- Sera rempli dynamiquement -->
                                </select>
                            </div>
                            
                            <div class="filter-item">
                                <label for="dialogueSearch" class="form-label">🔍 Recherche:</label>
                                <input type="text" id="dialogueSearch" class="form-input" 
                                       placeholder="Rechercher dans les dialogues...">
                            </div>
                        </div>
                        
                        <div class="header-actions">
                            <button class="btn btn-success" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                                <i class="fas fa-plus"></i> Nouveau Dialogue
                            </button>
                            <button class="btn btn-info" onclick="adminPanel.dialogueEditor.loadDialogues()">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.dialogueEditor.exportDialogues()">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    
                    <!-- Stats -->
                    <div class="dialogue-stats">
                        <div class="stats-row">
                            <div class="stat-item">
                                <div class="stat-value" id="totalDialogues">0</div>
                                <div class="stat-label">Total Dialogues</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="totalNpcs">0</div>
                                <div class="stat-label">NPCs Uniques</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="totalCategories">0</div>
                                <div class="stat-label">Catégories</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="missingTranslations">0</div>
                                <div class="stat-label">Traductions Manquantes</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone principale -->
                <div class="dialogue-main-area">
                    <!-- Panel liste des dialogues -->
                    <div class="dialogues-list-panel">
                        <div class="list-header">
                            <h3>📝 Dialogues</h3>
                            <div class="list-info">
                                <span id="dialoguesCount">0</span> dialogues trouvés
                            </div>
                        </div>
                        
                        <div class="dialogues-list" id="dialoguesList">
                            <div class="empty-list">
                                <div style="text-align: center; padding: 40px 20px; color: #6c757d;">
                                    <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                                    <p>Aucun dialogue trouvé</p>
                                    <button class="btn btn-primary" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                                        <i class="fas fa-plus"></i> Créer le premier dialogue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel éditeur -->
                    <div class="dialogue-editor-panel">
                        <div class="editor-header">
                            <h3 id="editorTitle">✏️ Éditeur de Dialogue</h3>
                            <div class="editor-actions" id="editorActions" style="display: none;">
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
                        
                        <div class="editor-content">
                            <div class="no-selection" id="noDialogueSelected">
                                <div style="text-align: center; color: #95a5a6;">
                                    <i class="fas fa-comments" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                                    <h3>Aucun dialogue sélectionné</h3>
                                    <p>Sélectionnez un dialogue dans la liste ou créez-en un nouveau</p>
                                </div>
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
            
            const response = await this.adminPanel.apiCall('/dialogues');
            
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
                <div class="empty-list">
                    <div style="text-align: center; padding: 40px 20px; color: #6c757d;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>${this.searchTerm ? 'Aucun dialogue ne correspond à votre recherche' : 'Aucun dialogue trouvé'}</p>
                        ${!this.searchTerm ? `
                            <button class="btn btn-primary" onclick="adminPanel.dialogueEditor.createNewDialogue()">
                                <i class="fas fa-plus"></i> Créer le premier dialogue
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            return;
        }

        const dialoguesHTML = dialogues.map(dialogue => `
            <div class="dialogue-item ${this.currentDialogue?.dialogId === dialogue.dialogId ? 'selected' : ''}" 
                 onclick="adminPanel.dialogueEditor.selectDialogue('${dialogue.dialogId}')">
                <div class="dialogue-icon">
                    ${this.getCategoryIcon(dialogue.category)}
                </div>
                <div class="dialogue-info">
                    <div class="dialogue-id">${dialogue.dialogId}</div>
                    <div class="dialogue-details">
                        <span class="dialogue-category">${dialogue.category}</span>
                        <span class="dialogue-npc">${dialogue.npcId || 'Global'}</span>
                        <span class="dialogue-priority">P${dialogue.priority || 5}</span>
                    </div>
                    <div class="dialogue-preview">
                        ${(dialogue.fr || dialogue.eng || '').substring(0, 60)}${(dialogue.fr || dialogue.eng || '').length > 60 ? '...' : ''}
                    </div>
                    <div class="dialogue-status">
                        ${dialogue.isActive ? 
                            '<i class="fas fa-check-circle status-icon success" title="Actif"></i>' : 
                            '<i class="fas fa-times-circle status-icon error" title="Inactif"></i>'
                        }
                        ${!dialogue.fr ? '<i class="fas fa-exclamation-triangle status-icon warning" title="Traduction FR manquante"></i>' : ''}
                        ${dialogue.conditions && dialogue.conditions.length > 0 ? '<i class="fas fa-code-branch status-icon" title="Conditions"></i>' : ''}
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
            return;
        }

        this.currentDialogue = dialogue;
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

        container.innerHTML = `
            <div class="dialogue-form-sections">
                <!-- Section Informations de base -->
                <div class="dialogue-form-section">
                    <div class="section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                        <h4>📋 Informations de Base</h4>
                        <span class="section-toggle">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="fields-grid">
                            <div class="form-field">
                                <label class="field-label">ID du Dialogue <span class="required">*</span></label>
                                <input type="text" class="form-input" id="dialogId" value="${dialogue.dialogId}" readonly>
                                <div class="field-help">Format: npcId.category.context[.variant]</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">NPC ID</label>
                                <input type="text" class="form-input" id="npcId" value="${dialogue.npcId || ''}" 
                                       placeholder="ex: professor_oak">
                            </div>
                            <div class="form-field">
                                <label class="field-label">Catégorie <span class="required">*</span></label>
                                <select class="form-select" id="category">
                                    ${this.categories.map(cat => 
                                        `<option value="${cat}" ${dialogue.category === cat ? 'selected' : ''}>${this.getCategoryName(cat)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Contexte</label>
                                <input type="text" class="form-input" id="context" value="${dialogue.context || ''}" 
                                       placeholder="ex: welcome, buy, help">
                            </div>
                            <div class="form-field">
                                <label class="field-label">Priorité</label>
                                <input type="number" class="form-input" id="priority" value="${dialogue.priority || 5}" 
                                       min="1" max="10">
                                <div class="field-help">1-10 (10 = priorité maximale)</div>
                            </div>
                            <div class="boolean-field">
                                <input type="checkbox" class="form-checkbox" id="isActive" ${dialogue.isActive ? 'checked' : ''}>
                                <label class="checkbox-label" for="isActive">Dialogue actif</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section Traductions -->
                <div class="dialogue-form-section">
                    <div class="section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                        <h4>🌍 Traductions</h4>
                        <span class="section-toggle">▼</span>
                    </div>
                    <div class="section-content">
                        ${Object.entries(this.languages).map(([code, name]) => `
                            <div class="form-field">
                                <label class="field-label">
                                    ${name} (${code.toUpperCase()}) 
                                    ${code === 'eng' || code === 'fr' ? '<span class="required">*</span>' : ''}
                                </label>
                                <textarea class="form-textarea" id="lang_${code}" rows="3" 
                                          placeholder="Texte en ${name}...">${dialogue[code] || ''}</textarea>
                                <div class="field-help">
                                    Variables: %s (joueur), %t (cible), %custom pour variables personnalisées
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Section Variables -->
                <div class="dialogue-form-section">
                    <div class="section-header" onclick="this.parentElement.classList.toggle('collapsed')">
                        <h4>🔧 Variables et Conditions</h4>
                        <span class="section-toggle">▼</span>
                    </div>
                    <div class="section-content">
                        <div class="form-field">
                            <label class="field-label">Variables Utilisées</label>
                            <div class="array-field" id="variablesContainer">
                                ${(dialogue.variables || []).map((variable, index) => `
                                    <div class="array-item">
                                        <input type="text" class="form-input" value="${variable}" 
                                               onchange="adminPanel.dialogueEditor.updateVariable(${index}, this.value)">
                                        <button type="button" class="btn btn-danger btn-sm remove-array-item" 
                                                onclick="adminPanel.dialogueEditor.removeVariable(${index})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                `).join('')}
                                <button type="button" class="btn btn-primary btn-sm add-array-item" 
                                        onclick="adminPanel.dialogueEditor.addVariable()">
                                    <i class="fas fa-plus"></i> Ajouter Variable
                                </button>
                            </div>
                            <div class="field-help">
                                Variables utilisées dans le texte (ex: playerName, targetName)
                            </div>
                        </div>

                        <div class="form-field">
                            <label class="field-label">Conditions d'Affichage (JSON)</label>
                            <textarea class="form-textarea json-editor" id="conditions" rows="4" 
                                      placeholder='[{"type": "level", "operator": ">=", "value": 10}]'>${JSON.stringify(dialogue.conditions || [], null, 2)}</textarea>
                            <div class="field-help">
                                Conditions pour afficher ce dialogue (format JSON)
                            </div>
                        </div>

                        <div class="form-field">
                            <label class="field-label">Tags</label>
                            <input type="text" class="form-input" id="tags" 
                                   value="${(dialogue.tags || []).join(', ')}" 
                                   placeholder="tag1, tag2, tag3">
                            <div class="field-help">Tags séparés par des virgules</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Activer/désactiver les sections
        container.querySelectorAll('.section-header').forEach(header => {
            header.style.cursor = 'pointer';
        });
    }

    async createNewDialogue() {
        console.log('🗨️ [DialogueEditor] Création nouveau dialogue');
        
        const newDialogue = {
            dialogId: `new_dialogue_${Date.now()}`,
            npcId: '',
            category: 'greeting',
            context: 'default',
            eng: 'New dialogue text',
            fr: 'Nouveau texte de dialogue',
            priority: 5,
            isActive: true,
            variables: [],
            conditions: [],
            tags: [],
            version: '1.0.0'
        };

        this.currentDialogue = newDialogue;
        this.loadDialogueEditor();
        
        // Scroll vers l'éditeur
        document.getElementById('dialogueFormBuilder').scrollIntoView({ behavior: 'smooth' });
    }

    async saveDialogue() {
        if (!this.currentDialogue) return;

        try {
            console.log('🗨️ [DialogueEditor] Sauvegarde dialogue...');
            
            // Récupérer les données du formulaire
            const formData = this.getFormData();
            
            // Validation
            if (!this.validateDialogue(formData)) {
                return;
            }

            // Sauvegarder (simulé pour l'instant)
            const response = await this.saveDialogueToAPI(formData);
            
            if (response.success) {
                this.adminPanel.showNotification('Dialogue sauvegardé avec succès', 'success');
                await this.loadDialogues(); // Recharger la liste
                this.selectDialogue(formData.dialogId); // Re-sélectionner
            } else {
                throw new Error(response.error || 'Erreur inconnue');
            }
            
        } catch (error) {
            console.error('❌ [DialogueEditor] Erreur sauvegarde:', error);
            this.adminPanel.showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    }

    getFormData() {
        const formData = {
            dialogId: document.getElementById('dialogId').value,
            npcId: document.getElementById('npcId').value,
            category: document.getElementById('category').value,
            context: document.getElementById('context').value,
            priority: parseInt(document.getElementById('priority').value) || 5,
            isActive: document.getElementById('isActive').checked,
            variables: [],
            conditions: [],
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
            version: '1.0.0'
        };

        // Récupérer les traductions
        Object.keys(this.languages).forEach(code => {
            const element = document.getElementById(`lang_${code}`);
            if (element) {
                formData[code] = element.value;
            }
        });

        // Récupérer les variables
        document.querySelectorAll('#variablesContainer .array-item input').forEach(input => {
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
        }

        return formData;
    }

    validateDialogue(data) {
        const errors = [];

        if (!data.dialogId || !data.dialogId.trim()) {
            errors.push('ID du dialogue requis');
        }

        if (!data.eng || !data.eng.trim()) {
            errors.push('Texte anglais requis');
        }

        if (!data.fr || !data.fr.trim()) {
            errors.push('Texte français requis');
        }

        if (!data.category) {
            errors.push('Catégorie requise');
        }

        if (errors.length > 0) {
            this.adminPanel.showNotification('Erreurs de validation:\n' + errors.join('\n'), 'error');
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

    async duplicateDialogue() {
        if (!this.currentDialogue) return;

        const duplicate = {
            ...this.currentDialogue,
            dialogId: `${this.currentDialogue.dialogId}_copy_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.currentDialogue = duplicate;
        this.loadDialogueEditor();
        
        this.adminPanel.showNotification('Dialogue dupliqué. N\'oubliez pas de le sauvegarder!', 'info');
    }

    async deleteDialogue() {
        if (!this.currentDialogue) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer le dialogue "${this.currentDialogue.dialogId}" ?\n\nCette action est irréversible.`)) {
            return;
        }

        try {
            console.log(`🗨️ [DialogueEditor] Suppression dialogue: ${this.currentDialogue.dialogId}`);
            
            // Essayer l'API réelle
            const response = await this.adminPanel.apiCall(`/dialogues/${this.currentDialogue.dialogId}`, {
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
            // Fallback: suppression locale
            console.warn('🗨️ [DialogueEditor] API non disponible, suppression locale');
            
            const index = this.dialogues.findIndex(d => d.dialogId === this.currentDialogue.dialogId);
            if (index >= 0) {
                this.dialogues.splice(index, 1);
                this.currentDialogue = null;
                this.cancelEdit();
                this.renderDialoguesList();
                this.updateStats();
                this.adminPanel.showNotification('Dialogue supprimé localement', 'success');
            }
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
        const items = container.querySelectorAll('.array-item');
        const index = items.length;

        const newItem = document.createElement('div');
        newItem.className = 'array-item';
        newItem.innerHTML = `
            <input type="text" class="form-input" placeholder="Nom de la variable" 
                   onchange="adminPanel.dialogueEditor.updateVariable(${index}, this.value)">
            <button type="button" class="btn btn-danger btn-sm remove-array-item" 
                    onclick="adminPanel.dialogueEditor.removeVariable(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.insertBefore(newItem, container.querySelector('.add-array-item'));
    }

    removeVariable(index) {
        const container = document.getElementById('variablesContainer');
        const items = container.querySelectorAll('.array-item');
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
        const items = container.querySelectorAll('.array-item');
        
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
            
            // Préparer les données d'export
            const exportData = {
                exportedAt: new Date().toISOString(),
                exportedBy: 'Admin Panel',
                version: '1.0.0',
                totalDialogues: this.dialogues.length,
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
            
            this.adminPanel.showNotification(`${this.dialogues.length} dialogues exportés avec succès`, 'success');
            
        } catch (error) {
            console.error('❌ [DialogueEditor] Erreur export:', error);
            this.adminPanel.showNotification('Erreur lors de l\'export: ' + error.message, 'error');
        }
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

    // Nettoyage
    cleanup() {
        console.log('🗨️ [DialogueEditor] Nettoyage du module');
        this.currentDialogue = null;
        this.dialogues = [];
    }
}
