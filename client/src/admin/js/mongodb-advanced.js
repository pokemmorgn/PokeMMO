// client/src/admin/js/mongodb-advanced.js - Fonctionnalités avancées MongoDB
export class MongoDBAdvanced {
    constructor(mongoModule) {
        this.mongo = mongoModule
        this.adminPanel = mongoModule.adminPanel
        this.queryBuilder = null
        this.documentEditor = null
        this.statsCache = new Map()
        console.log('🚀 [MongoDB Advanced] Module initialisé')
    }

    // =============================================================================
    // QUERY BUILDER AVANCÉ
    // =============================================================================
    
    showQueryBuilder() {
        console.log('🔍 [MongoDB] Ouverture Query Builder avancé')
        
        const modal = this.createModal('Query Builder', 'mongodb-query-builder-modal', `
            <div class="mongodb-query-builder">
                <!-- Tabs pour différents types de requêtes -->
                <div class="mongodb-query-tabs">
                    <button class="mongodb-tab-btn active" data-tab="find" onclick="this.parentNode.parentNode.querySelector('.mongodb-advanced').switchQueryTab('find')">
                        <i class="fas fa-search"></i> Find
                    </button>
                    <button class="mongodb-tab-btn" data-tab="aggregate" onclick="this.parentNode.parentNode.querySelector('.mongodb-advanced').switchQueryTab('aggregate')">
                        <i class="fas fa-layer-group"></i> Aggregate
                    </button>
                    <button class="mongodb-tab-btn" data-tab="update" onclick="this.parentNode.parentNode.querySelector('.mongodb-advanced').switchQueryTab('update')">
                        <i class="fas fa-edit"></i> Update
                    </button>
                    <button class="mongodb-tab-btn" data-tab="delete" onclick="this.parentNode.parentNode.querySelector('.mongodb-advanced').switchQueryTab('delete')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>

                <!-- Contenu des tabs -->
                <div class="mongodb-query-content">
                    <!-- Tab FIND -->
                    <div class="mongodb-query-tab" id="tab-find">
                        <div class="mongodb-query-section">
                            <label>Filter:</label>
                            <div class="mongodb-code-editor">
                                <textarea class="mongodb-query-textarea" id="findFilter" placeholder='{ "status": "active" }'>{}</textarea>
                            </div>
                        </div>
                        
                        <div class="mongodb-query-section">
                            <label>Projection (optional):</label>
                            <div class="mongodb-code-editor">
                                <textarea class="mongodb-query-textarea" id="findProjection" placeholder='{ "name": 1, "email": 1, "_id": 0 }'></textarea>
                            </div>
                        </div>
                        
                        <div class="mongodb-query-options">
                            <div class="mongodb-option-group">
                                <label>Sort:</label>
                                <input type="text" id="findSort" placeholder='{ "createdAt": -1 }' class="mongodb-input-sm">
                            </div>
                            <div class="mongodb-option-group">
                                <label>Limit:</label>
                                <input type="number" id="findLimit" value="25" class="mongodb-input-sm">
                            </div>
                            <div class="mongodb-option-group">
                                <label>Skip:</label>
                                <input type="number" id="findSkip" value="0" class="mongodb-input-sm">
                            </div>
                        </div>
                        
                        <!-- Suggestions de requêtes -->
                        <div class="mongodb-query-suggestions">
                            <h4>Exemples de requêtes :</h4>
                            <div class="mongodb-suggestion-buttons">
                                <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadQuerySuggestion('find', 'all')">
                                    Tous les documents
                                </button>
                                <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadQuerySuggestion('find', 'recent')">
                                    Documents récents
                                </button>
                                <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadQuerySuggestion('find', 'text')">
                                    Recherche texte
                                </button>
                                <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadQuerySuggestion('find', 'range')">
                                    Plage de dates
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tab AGGREGATE -->
                    <div class="mongodb-query-tab" id="tab-aggregate" style="display: none;">
                        <div class="mongodb-pipeline-builder">
                            <div class="mongodb-pipeline-header">
                                <h4>Pipeline d'agrégation</h4>
                                <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').addPipelineStage()">
                                    <i class="fas fa-plus"></i> Ajouter étape
                                </button>
                            </div>
                            
                            <div class="mongodb-pipeline-stages" id="pipelineStages">
                                <!-- Les étapes seront ajoutées dynamiquement -->
                            </div>
                            
                            <div class="mongodb-aggregate-suggestions">
                                <h4>Pipelines courants :</h4>
                                <div class="mongodb-suggestion-buttons">
                                    <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadAggregateSuggestion('group')">
                                        Groupement par champ
                                    </button>
                                    <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadAggregateSuggestion('stats')">
                                        Statistiques
                                    </button>
                                    <button class="mongodb-suggestion-btn" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').loadAggregateSuggestion('lookup')">
                                        Join collections
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab UPDATE -->
                    <div class="mongodb-query-tab" id="tab-update" style="display: none;">
                        <div class="mongodb-query-section">
                            <label>Filter (quels documents modifier):</label>
                            <div class="mongodb-code-editor">
                                <textarea class="mongodb-query-textarea" id="updateFilter" placeholder='{ "_id": ObjectId("...") }'>{}</textarea>
                            </div>
                        </div>
                        
                        <div class="mongodb-query-section">
                            <label>Update (modifications à appliquer):</label>
                            <div class="mongodb-code-editor">
                                <textarea class="mongodb-query-textarea" id="updateData" placeholder='{ "$set": { "status": "updated" } }'></textarea>
                            </div>
                        </div>
                        
                        <div class="mongodb-update-options">
                            <label class="mongodb-checkbox">
                                <input type="checkbox" id="updateMulti">
                                Mettre à jour plusieurs documents
                            </label>
                            <label class="mongodb-checkbox">
                                <input type="checkbox" id="updateUpsert">
                                Créer si n'existe pas (upsert)
                            </label>
                        </div>
                    </div>

                    <!-- Tab DELETE -->
                    <div class="mongodb-query-tab" id="tab-delete" style="display: none;">
                        <div class="mongodb-query-section">
                            <label>Filter (quels documents supprimer):</label>
                            <div class="mongodb-code-editor">
                                <textarea class="mongodb-query-textarea" id="deleteFilter" placeholder='{ "status": "inactive" }'></textarea>
                            </div>
                        </div>
                        
                        <div class="mongodb-delete-options">
                            <label class="mongodb-checkbox">
                                <input type="checkbox" id="deleteMulti">
                                Supprimer plusieurs documents
                            </label>
                            <div class="mongodb-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                Attention : Cette opération est irréversible !
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preview de la requête -->
                <div class="mongodb-query-preview">
                    <h4>Aperçu de la requête :</h4>
                    <pre id="queryPreview" class="mongodb-code-preview">Sélectionnez un type de requête...</pre>
                </div>

                <!-- Boutons d'action -->
                <div class="mongodb-modal-actions">
                    <button class="mongodb-btn mongodb-btn-secondary" onclick="this.closest('.mongodb-modal').remove()">
                        Annuler
                    </button>
                    <button class="mongodb-btn mongodb-btn-primary" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').executeQuery()">
                        <i class="fas fa-play"></i> Exécuter
                    </button>
                    <button class="mongodb-btn mongodb-btn-success" onclick="this.closest('.mongodb-query-builder').querySelector('.mongodb-advanced').saveQuery()">
                        <i class="fas fa-save"></i> Sauvegarder
                    </button>
                </div>
            </div>
        `)

        // Ajouter une référence à la classe advanced
        modal.querySelector('.mongodb-query-builder').mongoAdvanced = this

        // Initialiser la première étape d'agrégation
        this.addPipelineStage()
        this.updateQueryPreview()
    }

    switchQueryTab(tabName) {
        // Masquer tous les tabs
        document.querySelectorAll('.mongodb-query-tab').forEach(tab => {
            tab.style.display = 'none'
        })
        
        // Désactiver tous les boutons
        document.querySelectorAll('.mongodb-tab-btn').forEach(btn => {
            btn.classList.remove('active')
        })
        
        // Activer le tab sélectionné
        document.getElementById(`tab-${tabName}`).style.display = 'block'
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active')
        
        this.updateQueryPreview()
    }

    addPipelineStage() {
        const container = document.getElementById('pipelineStages')
        const stageCount = container.children.length
        
        const stageElement = document.createElement('div')
        stageElement.className = 'mongodb-pipeline-stage'
        stageElement.innerHTML = `
            <div class="mongodb-stage-header">
                <span class="mongodb-stage-number">${stageCount + 1}</span>
                <select class="mongodb-stage-type" onchange="this.closest('.mongodb-pipeline-stage').querySelector('.mongodb-advanced').updateStageTemplate(this)">
                    <option value="">Sélectionner une étape...</option>
                    <option value="$match">$match - Filtrer</option>
                    <option value="$group">$group - Grouper</option>
                    <option value="$sort">$sort - Trier</option>
                    <option value="$project">$project - Projeter</option>
                    <option value="$limit">$limit - Limiter</option>
                    <option value="$skip">$skip - Ignorer</option>
                    <option value="$lookup">$lookup - Joindre</option>
                    <option value="$unwind">$unwind - Dérouler</option>
                </select>
                <button class="mongodb-btn-icon mongodb-remove-stage" onclick="this.closest('.mongodb-pipeline-stage').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mongodb-stage-content">
                <textarea class="mongodb-stage-textarea" placeholder="Configurez cette étape...">{}</textarea>
            </div>
        `
        
        // Ajouter référence à la classe advanced
        stageElement.mongoAdvanced = this
        
        container.appendChild(stageElement)
    }

    updateStageTemplate(select) {
        const textarea = select.closest('.mongodb-pipeline-stage').querySelector('.mongodb-stage-textarea')
        const templates = {
            '$match': '{\n  "status": "active"\n}',
            '$group': '{\n  "_id": "$category",\n  "count": { "$sum": 1 },\n  "avgPrice": { "$avg": "$price" }\n}',
            '$sort': '{\n  "createdAt": -1\n}',
            '$project': '{\n  "name": 1,\n  "email": 1,\n  "fullName": { "$concat": ["$firstName", " ", "$lastName"] }\n}',
            '$limit': '10',
            '$skip': '5',
            '$lookup': '{\n  "from": "categories",\n  "localField": "categoryId",\n  "foreignField": "_id",\n  "as": "category"\n}',
            '$unwind': '"$tags"'
        }
        
        textarea.value = templates[select.value] || '{}'
        this.updateQueryPreview()
    }

    loadQuerySuggestion(type, suggestion) {
        const suggestions = {
            find: {
                all: { filter: '{}', projection: '', sort: '', limit: 25 },
                recent: { 
                    filter: '{\n  "createdAt": {\n    "$gte": new Date(Date.now() - 7*24*60*60*1000)\n  }\n}',
                    sort: '{ "createdAt": -1 }',
                    limit: 50
                },
                text: { 
                    filter: '{\n  "$text": {\n    "$search": "mot-clé"\n  }\n}',
                    projection: '{ "score": { "$meta": "textScore" } }',
                    sort: '{ "score": { "$meta": "textScore" } }'
                },
                range: { 
                    filter: '{\n  "price": {\n    "$gte": 10,\n    "$lte": 100\n  }\n}',
                    sort: '{ "price": 1 }'
                }
            }
        }
        
        const sug = suggestions[type][suggestion]
        if (sug) {
            document.getElementById('findFilter').value = sug.filter || '{}'
            document.getElementById('findProjection').value = sug.projection || ''
            document.getElementById('findSort').value = sug.sort || ''
            document.getElementById('findLimit').value = sug.limit || 25
            this.updateQueryPreview()
        }
    }

    loadAggregateSuggestion(type) {
        const container = document.getElementById('pipelineStages')
        container.innerHTML = '' // Clear existing stages
        
        const pipelines = {
            group: [
                { type: '$group', code: '{\n  "_id": "$status",\n  "count": { "$sum": 1 }\n}' }
            ],
            stats: [
                { type: '$group', code: '{\n  "_id": null,\n  "total": { "$sum": 1 },\n  "avgPrice": { "$avg": "$price" },\n  "maxPrice": { "$max": "$price" },\n  "minPrice": { "$min": "$price" }\n}' }
            ],
            lookup: [
                { type: '$lookup', code: '{\n  "from": "categories",\n  "localField": "categoryId",\n  "foreignField": "_id",\n  "as": "category"\n}' },
                { type: '$unwind', code: '"$category"' }
            ]
        }
        
        const pipeline = pipelines[type] || []
        pipeline.forEach(stage => {
            this.addPipelineStage()
            const lastStage = container.lastElementChild
            lastStage.querySelector('.mongodb-stage-type').value = stage.type
            lastStage.querySelector('.mongodb-stage-textarea').value = stage.code
        })
        
        this.updateQueryPreview()
    }

    updateQueryPreview() {
        const preview = document.getElementById('queryPreview')
        const activeTab = document.querySelector('.mongodb-tab-btn.active')?.dataset.tab
        
        let query = ''
        
        switch (activeTab) {
            case 'find':
                const filter = document.getElementById('findFilter')?.value || '{}'
                const projection = document.getElementById('findProjection')?.value
                const sort = document.getElementById('findSort')?.value
                const limit = document.getElementById('findLimit')?.value
                
                query = `db.${this.mongo.currentCollection}.find(\n  ${filter}`
                if (projection) query += `,\n  ${projection}`
                query += '\n)'
                if (sort) query += `.sort(${sort})`
                if (limit) query += `.limit(${limit})`
                break
                
            case 'aggregate':
                const stages = Array.from(document.querySelectorAll('.mongodb-stage-textarea'))
                    .map(textarea => textarea.value)
                    .filter(stage => stage.trim() !== '{}' && stage.trim() !== '')
                
                if (stages.length > 0) {
                    query = `db.${this.mongo.currentCollection}.aggregate([\n`
                    stages.forEach((stage, index) => {
                        const stageType = document.querySelectorAll('.mongodb-stage-type')[index]?.value || '$match'
                        query += `  { "${stageType}": ${stage} }`
                        if (index < stages.length - 1) query += ','
                        query += '\n'
                    })
                    query += '])'
                } else {
                    query = 'Ajoutez des étapes au pipeline...'
                }
                break
                
            case 'update':
                const updateFilter = document.getElementById('updateFilter')?.value || '{}'
                const updateData = document.getElementById('updateData')?.value || '{}'
                const multi = document.getElementById('updateMulti')?.checked
                
                query = `db.${this.mongo.currentCollection}.update${multi ? 'Many' : 'One'}(\n  ${updateFilter},\n  ${updateData}\n)`
                break
                
            case 'delete':
                const deleteFilter = document.getElementById('deleteFilter')?.value || '{}'
                const deleteMulti = document.getElementById('deleteMulti')?.checked
                
                query = `db.${this.mongo.currentCollection}.delete${deleteMulti ? 'Many' : 'One'}(\n  ${deleteFilter}\n)`
                break
                
            default:
                query = 'Sélectionnez un type de requête...'
        }
        
        if (preview) preview.textContent = query
    }

    async executeQuery() {
        const activeTab = document.querySelector('.mongodb-tab-btn.active')?.dataset.tab
        
        try {
            let result
            
            switch (activeTab) {
                case 'find':
                    result = await this.executeFindQuery()
                    break
                case 'aggregate':
                    result = await this.executeAggregateQuery()
                    break
                case 'update':
                    result = await this.executeUpdateQuery()
                    break
                case 'delete':
                    result = await this.executeDeleteQuery()
                    break
                default:
                    throw new Error('Type de requête non supporté')
            }
            
            this.showQueryResult(result)
            
        } catch (error) {
            this.adminPanel.showNotification('Erreur exécution requête: ' + error.message, 'error')
        }
    }

    async executeFindQuery() {
        const filter = JSON.parse(document.getElementById('findFilter').value || '{}')
        const projectionStr = document.getElementById('findProjection').value.trim()
        const projection = projectionStr ? JSON.parse(projectionStr) : null
        const sortStr = document.getElementById('findSort').value.trim()
        const sort = sortStr ? JSON.parse(sortStr) : null
        const limit = parseInt(document.getElementById('findLimit').value) || 25
        const skip = parseInt(document.getElementById('findSkip').value) || 0
        
        const queryData = {
            database: this.mongo.currentDatabase,
            collection: this.mongo.currentCollection,
            query: filter,
            projection: projection,
            sort: sort,
            limit: limit,
            skip: skip
        }
        
        const response = await this.adminPanel.apiCall('/mongodb/query', {
            method: 'POST',
            body: JSON.stringify(queryData)
        })
        
        if (response.success) {
            // Fermer le modal et afficher les résultats dans la vue principale
            document.querySelector('.mongodb-modal').remove()
            this.mongo.currentQuery = filter
            this.mongo.currentPage = Math.floor(skip / this.mongo.pageSize)
            this.mongo.renderDocuments(response.documents, response.total)
            this.mongo.updatePagination(response.total)
            
            return { type: 'find', count: response.documents.length, total: response.total }
        } else {
            throw new Error(response.message || 'Erreur lors de l\'exécution de la requête')
        }
    }

    async executeAggregateQuery() {
        const stages = []
        const stageElements = document.querySelectorAll('.mongodb-pipeline-stage')
        
        stageElements.forEach(element => {
            const type = element.querySelector('.mongodb-stage-type').value
            const content = element.querySelector('.mongodb-stage-textarea').value.trim()
            
            if (type && content && content !== '{}') {
                const stage = {}
                stage[type] = JSON.parse(content)
                stages.push(stage)
            }
        })
        
        if (stages.length === 0) {
            throw new Error('Le pipeline d\'agrégation est vide')
        }
        
        const response = await this.adminPanel.apiCall('/mongodb/aggregate', {
            method: 'POST',
            body: JSON.stringify({
                database: this.mongo.currentDatabase,
                collection: this.mongo.currentCollection,
                pipeline: stages
            })
        })
        
        if (response.success) {
            this.showAggregateResults(response.results)
            return { type: 'aggregate', count: response.results.length }
        } else {
            throw new Error(response.message || 'Erreur lors de l\'agrégation')
        }
    }

    async executeUpdateQuery() {
        const filter = JSON.parse(document.getElementById('updateFilter').value || '{}')
        const update = JSON.parse(document.getElementById('updateData').value || '{}')
        const multi = document.getElementById('updateMulti').checked
        const upsert = document.getElementById('updateUpsert').checked
        
        const response = await this.adminPanel.apiCall('/mongodb/update', {
            method: 'POST',
            body: JSON.stringify({
                database: this.mongo.currentDatabase,
                collection: this.mongo.currentCollection,
                filter: filter,
                update: update,
                multi: multi,
                upsert: upsert
            })
        })
        
        if (response.success) {
            document.querySelector('.mongodb-modal').remove()
            this.mongo.loadDocuments(this.mongo.currentQuery) // Refresh
            this.adminPanel.showNotification(`${response.modifiedCount} document(s) modifié(s)`, 'success')
            
            return { type: 'update', modified: response.modifiedCount }
        } else {
            throw new Error(response.message || 'Erreur lors de la mise à jour')
        }
    }

    async executeDeleteQuery() {
        const filter = JSON.parse(document.getElementById('deleteFilter').value || '{}')
        const multi = document.getElementById('deleteMulti').checked
        
        // Confirmation avant suppression
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${multi ? 'les documents' : 'le document'} correspondant(s) ?`)) {
            return
        }
        
        const response = await this.adminPanel.apiCall('/mongodb/delete', {
            method: 'POST',
            body: JSON.stringify({
                database: this.mongo.currentDatabase,
                collection: this.mongo.currentCollection,
                filter: filter,
                multi: multi
            })
        })
        
        if (response.success) {
            document.querySelector('.mongodb-modal').remove()
            this.mongo.loadDocuments(this.mongo.currentQuery) // Refresh
            this.adminPanel.showNotification(`${response.deletedCount} document(s) supprimé(s)`, 'success')
            
            return { type: 'delete', deleted: response.deletedCount }
        } else {
            throw new Error(response.message || 'Erreur lors de la suppression')
        }
    }

    showAggregateResults(results) {
        const modal = this.createModal('Résultats de l\'agrégation', 'mongodb-aggregate-results', `
            <div class="mongodb-results-container">
                <div class="mongodb-results-header">
                    <span class="mongodb-results-count">${results.length} résultat(s)</span>
                    <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-modal').querySelector('.mongodb-advanced').exportResults()">
                        <i class="fas fa-download"></i> Exporter
                    </button>
                </div>
                <div class="mongodb-results-content">
                    <pre class="mongodb-results-json">${JSON.stringify(results, null, 2)}</pre>
                </div>
            </div>
        `)
        
        modal.querySelector('.mongodb-aggregate-results').mongoAdvanced = this
    }

    showQueryResult(result) {
        let message = ''
        switch (result.type) {
            case 'find':
                message = `Requête exécutée: ${result.count} documents trouvés sur ${result.total}`
                break
            case 'aggregate':
                message = `Agrégation exécutée: ${result.count} résultats`
                break
            case 'update':
                message = `${result.modified} document(s) modifié(s)`
                break
            case 'delete':
                message = `${result.deleted} document(s) supprimé(s)`
                break
        }
        
        this.adminPanel.showNotification(message, 'success')
    }

    saveQuery() {
        // Pour l'instant, sauvegarder en localStorage
        const activeTab = document.querySelector('.mongodb-tab-btn.active')?.dataset.tab
        const queryName = prompt('Nom de la requête :')
        
        if (!queryName) return
        
        const queryData = {
            name: queryName,
            type: activeTab,
            database: this.mongo.currentDatabase,
            collection: this.mongo.currentCollection,
            created: new Date().toISOString()
        }
        
        // Sauvegarder selon le type
        switch (activeTab) {
            case 'find':
                queryData.filter = document.getElementById('findFilter').value
                queryData.projection = document.getElementById('findProjection').value
                queryData.sort = document.getElementById('findSort').value
                queryData.limit = document.getElementById('findLimit').value
                break
            case 'aggregate':
                queryData.pipeline = Array.from(document.querySelectorAll('.mongodb-pipeline-stage')).map(stage => ({
                    type: stage.querySelector('.mongodb-stage-type').value,
                    content: stage.querySelector('.mongodb-stage-textarea').value
                }))
                break
        }
        
        // Sauvegarder en localStorage
        const savedQueries = JSON.parse(localStorage.getItem('mongodb_saved_queries') || '[]')
        savedQueries.push(queryData)
        localStorage.setItem('mongodb_saved_queries', JSON.stringify(savedQueries))
        
        this.adminPanel.showNotification(`Requête "${queryName}" sauvegardée`, 'success')
    }

    // =============================================================================
    // ÉDITEUR DE DOCUMENTS
    // =============================================================================
    
    createDocument() {
        console.log('📝 [MongoDB] Création nouveau document')
        
        const modal = this.createModal('Créer un document', 'mongodb-document-editor', `
            <div class="mongodb-document-form">
                <div class="mongodb-editor-toolbar">
                    <div class="mongodb-editor-modes">
                        <button class="mongodb-mode-btn active" data-mode="form" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').switchEditorMode('form')">
                            <i class="fas fa-edit"></i> Formulaire
                        </button>
                        <button class="mongodb-mode-btn" data-mode="json" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').switchEditorMode('json')">
                            <i class="fas fa-code"></i> JSON
                        </button>
                    </div>
                    <div class="mongodb-editor-actions">
                        <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').loadDocumentTemplate()">
                            <i class="fas fa-magic"></i> Template
                        </button>
                        <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').validateDocument()">
                            <i class="fas fa-check"></i> Valider
                        </button>
                    </div>
                </div>

                <!-- Mode formulaire -->
                <div class="mongodb-form-mode" id="formMode">
                    <div class="mongodb-form-fields" id="documentFields">
                        <div class="mongodb-field-group">
                            <button class="mongodb-btn mongodb-btn-success mongodb-add-field" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').addDocumentField()">
                                <i class="fas fa-plus"></i> Ajouter un champ
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Mode JSON -->
                <div class="mongodb-json-mode" id="jsonMode" style="display: none;">
                    <div class="mongodb-json-editor">
                        <textarea class="mongodb-json-textarea" id="documentJSON" placeholder="Entrez le JSON du document...">{
  "_id": null,
  "name": "",
  "email": "",
  "createdAt": new Date(),
  "status": "active"
}</textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div class="mongodb-modal-actions">
                    <button class="mongodb-btn mongodb-btn-secondary" onclick="this.closest('.mongodb-modal').remove()">
                        Annuler
                    </button>
                    <button class="mongodb-btn mongodb-btn-success" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').saveDocument()">
                        <i class="fas fa-save"></i> Créer le document
                    </button>
                </div>
            </div>
        `)
        
        modal.querySelector('.mongodb-document-editor').mongoAdvanced = this
        this.addDocumentField() // Ajouter un premier champ
    }

    editDocument(documentId) {
        console.log(`✏️ [MongoDB] Édition document: ${documentId}`)
        
        // D'abord récupérer le document
        this.loadDocumentForEdit(documentId)
    }

async loadDocumentForEdit(documentId) {
    try {
        // ✅ CORRECTION: Utiliser la nouvelle route GET au lieu de POST
        const response = await this.adminPanel.apiCall(`/mongodb/document/${this.mongo.currentDatabase}/${this.mongo.currentCollection}/${documentId}`)
        
        if (response.success && response.document) {
            this.showDocumentEditor(response.document, true)
        } else {
            throw new Error('Document non trouvé')
        }
    } catch (error) {
        this.adminPanel.showNotification('Erreur chargement document: ' + error.message, 'error')
    }
}

    showDocumentEditor(document = null, isEdit = false) {
        const title = isEdit ? 'Modifier le document' : 'Créer un document'
        
        const modal = this.createModal(title, 'mongodb-document-editor', `
            <div class="mongodb-document-form">
                <div class="mongodb-editor-toolbar">
                    <div class="mongodb-editor-modes">
                        <button class="mongodb-mode-btn active" data-mode="form" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').switchEditorMode('form')">
                            <i class="fas fa-edit"></i> Formulaire
                        </button>
                        <button class="mongodb-mode-btn" data-mode="json" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').switchEditorMode('json')">
                            <i class="fas fa-code"></i> JSON
                        </button>
                    </div>
                    <div class="mongodb-editor-actions">
                        ${!isEdit ? `<button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').loadDocumentTemplate()">
                            <i class="fas fa-magic"></i> Template
                        </button>` : ''}
                        <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').validateDocument()">
                            <i class="fas fa-check"></i> Valider
                        </button>
                    </div>
                </div>

                <!-- Mode formulaire -->
                <div class="mongodb-form-mode" id="formMode">
                    <div class="mongodb-form-fields" id="documentFields">
                        ${!isEdit ? `<div class="mongodb-field-group">
                            <button class="mongodb-btn mongodb-btn-success mongodb-add-field" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').addDocumentField()">
                                <i class="fas fa-plus"></i> Ajouter un champ
                            </button>
                        </div>` : ''}
                    </div>
                </div>

                <!-- Mode JSON -->
                <div class="mongodb-json-mode" id="jsonMode" style="display: none;">
                    <div class="mongodb-json-editor">
                        <textarea class="mongodb-json-textarea" id="documentJSON" placeholder="Entrez le JSON du document...">${document ? JSON.stringify(document, null, 2) : `{
  "_id": null,
  "name": "",
  "email": "",
  "createdAt": new Date(),
  "status": "active"
}`}</textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div class="mongodb-modal-actions">
                    <button class="mongodb-btn mongodb-btn-secondary" onclick="this.closest('.mongodb-modal').remove()">
                        Annuler
                    </button>
                    <button class="mongodb-btn mongodb-btn-success" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').saveDocument(${isEdit})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Mettre à jour' : 'Créer le document'}
                    </button>
                </div>
            </div>
        `)
        
        const editor = modal.querySelector('.mongodb-document-editor')
        editor.mongoAdvanced = this
        editor.originalDocument = document
        
        if (isEdit && document) {
            this.populateFormFromDocument(document)
        } else {
            this.addDocumentField() // Ajouter un premier champ pour la création
        }
    }

    populateFormFromDocument(document) {
        const fieldsContainer = document.getElementById('documentFields')
        fieldsContainer.innerHTML = ''
        
        Object.entries(document).forEach(([key, value]) => {
            this.addDocumentField(key, value, this.detectFieldType(value))
        })
        
        // Ajouter le bouton pour ajouter des champs
        const addButton = document.createElement('div')
        addButton.className = 'mongodb-field-group'
        addButton.innerHTML = `
            <button class="mongodb-btn mongodb-btn-success mongodb-add-field" onclick="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').addDocumentField()">
                <i class="fas fa-plus"></i> Ajouter un champ
            </button>
        `
        fieldsContainer.appendChild(addButton)
    }

    addDocumentField(key = '', value = '', type = 'string') {
        const container = document.getElementById('documentFields')
        const addButton = container.querySelector('.mongodb-add-field')?.parentElement
        
        const fieldDiv = document.createElement('div')
        fieldDiv.className = 'mongodb-document-field'
        
        const fieldId = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        
        fieldDiv.innerHTML = `
            <div class="mongodb-field-header">
                <input type="text" class="mongodb-field-name" placeholder="Nom du champ" value="${key}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()">
                <select class="mongodb-field-type" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').changeFieldType(this)">
                    <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                    <option value="date" ${type === 'date' ? 'selected' : ''}>Date</option>
                    <option value="array" ${type === 'array' ? 'selected' : ''}>Array</option>
                    <option value="object" ${type === 'object' ? 'selected' : ''}>Object</option>
                    <option value="objectid" ${type === 'objectid' ? 'selected' : ''}>ObjectId</option>
                </select>
                <button class="mongodb-btn-icon mongodb-remove-field" onclick="this.closest('.mongodb-document-field').remove(); this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mongodb-field-content" id="${fieldId}">
                ${this.renderFieldInput(type, value, fieldId)}
            </div>
        `
        
        if (addButton) {
            container.insertBefore(fieldDiv, addButton)
        } else {
            container.appendChild(fieldDiv)
        }
        
        this.updateDocumentJSON()
    }

    renderFieldInput(type, value, fieldId) {
        switch (type) {
            case 'string':
                return `<input type="text" class="mongodb-field-input" value="${value || ''}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()" placeholder="Valeur texte">`
            case 'number':
                return `<input type="number" class="mongodb-field-input" value="${value || 0}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()" placeholder="Valeur numérique">`
            case 'boolean':
                return `
                    <select class="mongodb-field-input" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()">
                        <option value="true" ${value === true ? 'selected' : ''}>true</option>
                        <option value="false" ${value === false ? 'selected' : ''}>false</option>
                    </select>
                `
            case 'date':
                const dateValue = value ? (value instanceof Date ? value.toISOString().slice(0, 16) : new Date(value).toISOString().slice(0, 16)) : ''
                return `<input type="datetime-local" class="mongodb-field-input" value="${dateValue}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()">`
            case 'array':
                return `
                    <div class="mongodb-array-editor">
                        <textarea class="mongodb-field-input mongodb-array-textarea" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()" placeholder='["item1", "item2", "item3"]'>${JSON.stringify(value || [], null, 2)}</textarea>
                        <small>Format JSON array</small>
                    </div>
                `
            case 'object':
                return `
                    <div class="mongodb-object-editor">
                        <textarea class="mongodb-field-input mongodb-object-textarea" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()" placeholder='{"key": "value"}'>${JSON.stringify(value || {}, null, 2)}</textarea>
                        <small>Format JSON object</small>
                    </div>
                `
            case 'objectid':
                return `<input type="text" class="mongodb-field-input" value="${value || ''}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()" placeholder="ObjectId (laisser vide pour auto-génération)">`
            default:
                return `<input type="text" class="mongodb-field-input" value="${value || ''}" onchange="this.closest('.mongodb-document-editor').querySelector('.mongodb-advanced').updateDocumentJSON()">`
        }
    }

    changeFieldType(select) {
        const fieldContent = select.closest('.mongodb-document-field').querySelector('.mongodb-field-content')
        const currentValue = this.getFieldValue(fieldContent)
        
        fieldContent.innerHTML = this.renderFieldInput(select.value, currentValue, fieldContent.id)
        this.updateDocumentJSON()
    }

    getFieldValue(fieldContent) {
        const input = fieldContent.querySelector('.mongodb-field-input')
        if (!input) return ''
        
        if (input.type === 'checkbox') return input.checked
        if (input.tagName === 'SELECT') return input.value === 'true'
        if (input.classList.contains('mongodb-array-textarea') || input.classList.contains('mongodb-object-textarea')) {
            try {
                return JSON.parse(input.value || '{}')
            } catch {
                return input.value
            }
        }
        
        return input.value
    }

    detectFieldType(value) {
        if (value === null || value === undefined) return 'string'
        if (typeof value === 'boolean') return 'boolean'
        if (typeof value === 'number') return 'number'
        if (Array.isArray(value)) return 'array'
        if (value instanceof Date) return 'date'
        if (typeof value === 'object') return 'object'
        if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) return 'objectid'
        return 'string'
    }

    switchEditorMode(mode) {
        if (mode === 'json') {
            // Mettre à jour le JSON avant de switcher
            this.updateDocumentJSON()
            document.getElementById('formMode').style.display = 'none'
            document.getElementById('jsonMode').style.display = 'block'
        } else {
            // Mettre à jour le formulaire depuis le JSON
            this.updateFormFromJSON()
            document.getElementById('formMode').style.display = 'block'
            document.getElementById('jsonMode').style.display = 'none'
        }
        
        // Mettre à jour les boutons
        document.querySelectorAll('.mongodb-mode-btn').forEach(btn => btn.classList.remove('active'))
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active')
    }

    updateDocumentJSON() {
        const fields = document.querySelectorAll('.mongodb-document-field')
        const document = {}
        
        fields.forEach(field => {
            const nameInput = field.querySelector('.mongodb-field-name')
            const typeSelect = field.querySelector('.mongodb-field-type')
            const content = field.querySelector('.mongodb-field-content')
            
            if (nameInput && nameInput.value.trim()) {
                const fieldName = nameInput.value.trim()
                const fieldType = typeSelect.value
                const fieldValue = this.getFieldValue(content)
                
                // Convertir la valeur selon le type
                switch (fieldType) {
                    case 'number':
                        document[fieldName] = parseFloat(fieldValue) || 0
                        break
                    case 'boolean':
                        document[fieldName] = fieldValue === 'true' || fieldValue === true
                        break
                    case 'date':
                        document[fieldName] = fieldValue ? new Date(fieldValue) : new Date()
                        break
                    case 'array':
                    case 'object':
                        try {
                            document[fieldName] = JSON.parse(fieldValue || (fieldType === 'array' ? '[]' : '{}'))
                        } catch {
                            document[fieldName] = fieldType === 'array' ? [] : {}
                        }
                        break
                    case 'objectid':
                        document[fieldName] = fieldValue || null
                        break
                    default:
                        document[fieldName] = fieldValue || ''
                }
            }
        })
        
        const jsonTextarea = document.getElementById('documentJSON')
        if (jsonTextarea) {
            jsonTextarea.value = JSON.stringify(document, null, 2)
        }
    }

    updateFormFromJSON() {
        try {
            const jsonValue = document.getElementById('documentJSON').value
            const document = JSON.parse(jsonValue)
            
            // Recréer le formulaire
            this.populateFormFromDocument(document)
        } catch (error) {
            this.adminPanel.showNotification('JSON invalide: ' + error.message, 'error')
        }
    }

    validateDocument() {
        try {
            const jsonValue = document.getElementById('documentJSON').value
            const document = JSON.parse(jsonValue)
            
            // Validations basiques
            const errors = []
            
            // Vérifier que ce n'est pas un objet vide
            if (Object.keys(document).length === 0) {
                errors.push('Le document ne peut pas être vide')
            }
            
            // Vérifier les types MongoDB valides
            this.validateMongoTypes(document, '', errors)
            
            if (errors.length > 0) {
                this.adminPanel.showNotification('Erreurs de validation:\n' + errors.join('\n'), 'error')
                return false
            } else {
                this.adminPanel.showNotification('Document valide ✓', 'success')
                return true
            }
        } catch (error) {
            this.adminPanel.showNotification('JSON invalide: ' + error.message, 'error')
            return false
        }
    }

    validateMongoTypes(obj, path, errors) {
        for (const [key, value] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${key}` : key
            
            if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                this.validateMongoTypes(value, fullPath, errors)
            }
            
            // Vérifications spécifiques
            if (key === '_id' && value !== null && typeof value === 'string' && !value.match(/^[0-9a-fA-F]{24}$/)) {
                errors.push(`${fullPath}: ObjectId invalide (doit être 24 caractères hexadécimaux)`)
            }
        }
    }

    async saveDocument(isEdit = false) {
        if (!this.validateDocument()) return
        
        try {
            const jsonValue = document.getElementById('documentJSON').value
            const document = JSON.parse(jsonValue)
            
            const endpoint = isEdit ? '/mongodb/update-document' : '/mongodb/create-document'
            const response = await this.adminPanel.apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    database: this.mongo.currentDatabase,
                    collection: this.mongo.currentCollection,
                    document: document,
                    originalId: isEdit ? document._id : null
                })
            })
            
            if (response.success) {
                document.querySelector('.mongodb-modal').remove()
                this.mongo.loadDocuments(this.mongo.currentQuery) // Refresh
                
                const message = isEdit ? 'Document mis à jour avec succès' : 'Document créé avec succès'
                this.adminPanel.showNotification(message, 'success')
            } else {
                throw new Error(response.message || 'Erreur lors de la sauvegarde')
            }
        } catch (error) {
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    loadDocumentTemplate() {
        const templates = {
            'Utilisateur': {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                active: true,
                roles: ['user'],
                profile: {
                    avatar: 'avatar.jpg',
                    bio: 'Description de l\'utilisateur'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            },
            'Produit': {
                name: 'Nom du produit',
                description: 'Description du produit',
                price: 29.99,
                category: 'Category Name',
                tags: ['tag1', 'tag2'],
                inStock: true,
                specifications: {
                    weight: '1kg',
                    dimensions: '10x10x10cm'
                },
                createdAt: new Date()
            },
            'Commande': {
                orderId: 'ORD-' + Date.now(),
                customerId: null,
                items: [
                    {
                        productId: null,
                        quantity: 1,
                        price: 29.99
                    }
                ],
                total: 29.99,
                status: 'pending',
                shippingAddress: {
                    street: '',
                    city: '',
                    zipCode: '',
                    country: ''
                },
                createdAt: new Date()
            }
        }
        
        const templateName = prompt('Choisir un template:\n- Utilisateur\n- Produit\n- Commande\n\nOu entrez "custom" pour un template vide')
        
        if (templates[templateName]) {
            document.getElementById('documentJSON').value = JSON.stringify(templates[templateName], null, 2)
            this.updateFormFromJSON()
        } else if (templateName === 'custom') {
            document.getElementById('documentJSON').value = '{\n  \n}'
            this.updateFormFromJSON()
        }
    }

    // =============================================================================
    // SUPPRESSION DE DOCUMENTS
    // =============================================================================
    
    async deleteDocument(documentId) {
        console.log(`🗑️ [MongoDB] Suppression document: ${documentId}`)
        
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) {
            return
        }
        
        try {
            const response = await this.adminPanel.apiCall('/mongodb/delete-document', {
                method: 'POST',
                body: JSON.stringify({
                    database: this.mongo.currentDatabase,
                    collection: this.mongo.currentCollection,
                    id: documentId
                })
            })
            
            if (response.success) {
                this.mongo.loadDocuments(this.mongo.currentQuery) // Refresh
                this.adminPanel.showNotification('Document supprimé avec succès', 'success')
            } else {
                throw new Error(response.message || 'Erreur lors de la suppression')
            }
        } catch (error) {
            this.adminPanel.showNotification('Erreur suppression: ' + error.message, 'error')
        }
    }

    // =============================================================================
    // INSPECTION DE DOCUMENTS
    // =============================================================================
    
async inspectDocument(documentId) {
    console.log(`🔍 [MongoDB] Inspection document: ${documentId}`)
    
    try {
        // ✅ CORRECTION: Utiliser la nouvelle route GET au lieu de POST
        const response = await this.adminPanel.apiCall(`/mongodb/document/${this.mongo.currentDatabase}/${this.mongo.currentCollection}/${documentId}`)
        
        if (response.success && response.document) {
            this.showDocumentInspector(response.document)
        } else {
            throw new Error('Document non trouvé')
        }
    } catch (error) {
        this.adminPanel.showNotification('Erreur inspection: ' + error.message, 'error')
    }
}

    showDocumentInspector(document) {
        const modal = this.createModal('Inspection du document', 'mongodb-document-inspector', `
            <div class="mongodb-inspector-container">
                <!-- Tabs d'inspection -->
                <div class="mongodb-inspector-tabs">
                    <button class="mongodb-tab-btn active" data-tab="overview" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').switchInspectorTab('overview')">
                        <i class="fas fa-eye"></i> Vue d'ensemble
                    </button>
                    <button class="mongodb-tab-btn" data-tab="raw" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').switchInspectorTab('raw')">
                        <i class="fas fa-code"></i> JSON Brut
                    </button>
                    <button class="mongodb-tab-btn" data-tab="schema" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').switchInspectorTab('schema')">
                        <i class="fas fa-sitemap"></i> Schéma
                    </button>
                </div>

                <!-- Contenu de l'inspection -->
                <div class="mongodb-inspector-content">
                    <!-- Vue d'ensemble -->
                    <div class="mongodb-inspector-tab" id="inspector-overview">
                        <div class="mongodb-document-overview">
                            <div class="mongodb-overview-stats">
                                <div class="mongodb-stat-item">
                                    <span class="mongodb-stat-label">ID:</span>
                                    <code class="mongodb-stat-value">${document._id}</code>
                                </div>
                                <div class="mongodb-stat-item">
                                    <span class="mongodb-stat-label">Champs:</span>
                                    <span class="mongodb-stat-value">${Object.keys(document).length}</span>
                                </div>
                                <div class="mongodb-stat-item">
                                    <span class="mongodb-stat-label">Taille:</span>
                                    <span class="mongodb-stat-value">~${(JSON.stringify(document).length / 1024).toFixed(2)} KB</span>
                                </div>
                            </div>
                            
                            <div class="mongodb-document-tree">
                                ${this.renderDocumentTree(document)}
                            </div>
                        </div>
                    </div>

                    <!-- JSON Brut -->
                    <div class="mongodb-inspector-tab" id="inspector-raw" style="display: none;">
                        <div class="mongodb-json-viewer">
                            <div class="mongodb-json-actions">
                                <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').copyToClipboard()">
                                    <i class="fas fa-copy"></i> Copier
                                </button>
                                <button class="mongodb-btn mongodb-btn-sm" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').downloadJSON()">
                                    <i class="fas fa-download"></i> Télécharger
                                </button>
                            </div>
                            <pre class="mongodb-json-display" id="rawJSON">${JSON.stringify(document, null, 2)}</pre>
                        </div>
                    </div>

                    <!-- Schéma -->
                    <div class="mongodb-inspector-tab" id="inspector-schema" style="display: none;">
                        <div class="mongodb-schema-analysis">
                            ${this.analyzeDocumentSchema(document)}
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="mongodb-modal-actions">
                    <button class="mongodb-btn mongodb-btn-secondary" onclick="this.closest('.mongodb-modal').remove()">
                        Fermer
                    </button>
                    <button class="mongodb-btn mongodb-btn-primary" onclick="this.closest('.mongodb-document-inspector').querySelector('.mongodb-advanced').editFromInspector()">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                </div>
            </div>
        `)
        
        const inspector = modal.querySelector('.mongodb-document-inspector')
        inspector.mongoAdvanced = this
        inspector.currentDocument = document
    }

    switchInspectorTab(tab) {
        document.querySelectorAll('.mongodb-inspector-tab').forEach(t => t.style.display = 'none')
        document.querySelectorAll('.mongodb-inspector-tabs .mongodb-tab-btn').forEach(b => b.classList.remove('active'))
        
        document.getElementById(`inspector-${tab}`).style.display = 'block'
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active')
    }

    renderDocumentTree(obj, level = 0) {
        let html = '<div class="mongodb-tree-container">'
        
        for (const [key, value] of Object.entries(obj)) {
            const type = this.getValueType(value)
            const indent = '  '.repeat(level)
            
            html += `<div class="mongodb-tree-item" style="padding-left: ${level * 20}px;">`
            html += `<span class="mongodb-tree-key">${key}</span>`
            html += `<span class="mongodb-tree-type">${type}</span>`
            
            if (value === null || value === undefined) {
                html += `<span class="mongodb-tree-value null">null</span>`
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                html += `<span class="mongodb-tree-value object">{${Object.keys(value).length} keys}</span>`
                html += `<div class="mongodb-tree-children">${this.renderDocumentTree(value, level + 1)}</div>`
            } else if (Array.isArray(value)) {
                html += `<span class="mongodb-tree-value array">[${value.length} items]</span>`
                if (value.length > 0 && level < 3) {
                    html += '<div class="mongodb-tree-children">'
                    value.slice(0, 5).forEach((item, index) => {
                        html += `<div class="mongodb-tree-item" style="padding-left: ${(level + 1) * 20}px;">`
                        html += `<span class="mongodb-tree-key">[${index}]</span>`
                        html += `<span class="mongodb-tree-type">${this.getValueType(item)}</span>`
                        html += `<span class="mongodb-tree-value">${this.formatTreeValue(item)}</span>`
                        html += '</div>'
                    })
                    if (value.length > 5) {
                        html += `<div class="mongodb-tree-item" style="padding-left: ${(level + 1) * 20}px; opacity: 0.6;">... ${value.length - 5} more items</div>`
                    }
                    html += '</div>'
                }
            } else {
                html += `<span class="mongodb-tree-value ${type}">${this.formatTreeValue(value)}</span>`
            }
            
            html += '</div>'
        }
        
        html += '</div>'
        return html
    }

    getValueType(value) {
        if (value === null) return 'null'
        if (Array.isArray(value)) return 'array'
        if (value instanceof Date) return 'date'
        if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) return 'objectid'
        return typeof value
    }

    formatTreeValue(value) {
        if (value === null || value === undefined) return 'null'
        if (typeof value === 'string') {
            return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`
        }
        if (typeof value === 'boolean') return String(value)
        if (typeof value === 'number') return String(value)
        if (value instanceof Date) return value.toISOString()
        if (typeof value === 'object') return '{...}'
        return String(value)
    }

    analyzeDocumentSchema(document) {
        const schema = this.extractSchema(document)
        
        let html = '<div class="mongodb-schema-tree">'
        html += '<h4>Structure du document :</h4>'
        
        for (const [field, info] of Object.entries(schema)) {
            html += `
                <div class="mongodb-schema-field">
                    <div class="mongodb-schema-field-header">
                        <span class="mongodb-schema-field-name">${field}</span>
                        <span class="mongodb-schema-field-type">${info.type}</span>
                        ${info.required ? '<span class="mongodb-schema-required">Required</span>' : ''}
                    </div>
                    ${info.description ? `<div class="mongodb-schema-description">${info.description}</div>` : ''}
                    ${info.examples ? `<div class="mongodb-schema-examples">Exemples: ${info.examples.join(', ')}</div>` : ''}
                </div>
            `
        }
        
        html += '</div>'
        return html
    }

    extractSchema(obj, prefix = '') {
        const schema = {}
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key
            const type = this.getValueType(value)
            
            schema[fullKey] = {
                type: type,
                required: value !== null && value !== undefined,
                description: this.getFieldDescription(key, type, value),
                examples: this.getFieldExamples(key, type, value)
            }
            
            // Analyser récursivement les objets imbriqués (mais pas trop profond)
            if (type === 'object' && prefix.split('.').length < 2) {
                Object.assign(schema, this.extractSchema(value, fullKey))
            }
        }
        
        return schema
    }

    getFieldDescription(key, type, value) {
        const descriptions = {
            '_id': 'Identifiant unique du document',
            'createdAt': 'Date de création',
            'updatedAt': 'Date de dernière modification',
            'email': 'Adresse email',
            'name': 'Nom',
            'status': 'Statut du document',
            'price': 'Prix',
            'description': 'Description'
        }
        
        return descriptions[key] || `Champ de type ${type}`
    }

    getFieldExamples(key, type, value) {
        if (type === 'string') return [String(value)]
        if (type === 'number') return [String(value)]
        if (type === 'boolean') return ['true', 'false']
        if (type === 'date') return [new Date().toISOString()]
        if (type === 'objectid') return ['507f1f77bcf86cd799439011']
        return []
    }

    copyToClipboard() {
        const jsonText = document.getElementById('rawJSON').textContent
        navigator.clipboard.writeText(jsonText).then(() => {
            this.adminPanel.showNotification('JSON copié dans le presse-papiers', 'success')
        }).catch(() => {
            this.adminPanel.showNotification('Erreur lors de la copie', 'error')
        })
    }

    downloadJSON() {
        const inspector = document.querySelector('.mongodb-document-inspector')
        const document = inspector.currentDocument
        
        const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `document_${document._id}.json`
        a.click()
        
        URL.revokeObjectURL(url)
        this.adminPanel.showNotification('Document téléchargé', 'success')
    }

    editFromInspector() {
        const inspector = document.querySelector('.mongodb-document-inspector')
        const document = inspector.currentDocument
        
        inspector.closest('.mongodb-modal').remove()
        this.showDocumentEditor(document, true)
    }

    // =============================================================================
    // STATISTIQUES ET INFORMATIONS
    // =============================================================================
    
    async showDatabaseStats() {
        console.log('📊 [MongoDB] Affichage statistiques DB')
        
        try {
            const response = await this.adminPanel.apiCall('/mongodb/database-stats', {
                method: 'POST',
                body: JSON.stringify({
                    database: this.mongo.currentDatabase
                })
            })
            
            if (response.success) {
                this.displayDatabaseStats(response.stats)
            } else {
                throw new Error('Erreur récupération stats')
            }
        } catch (error) {
            this.adminPanel.showNotification('Erreur stats DB: ' + error.message, 'error')
        }
    }

    displayDatabaseStats(stats) {
        const modal = this.createModal('Statistiques de la base de données', 'mongodb-database-stats', `
            <div class="mongodb-stats-dashboard">
                <!-- Vue d'ensemble -->
                <div class="mongodb-stats-overview">
                    <div class="mongodb-stats-cards">
                        <div class="mongodb-stat-card">
                            <div class="mongodb-stat-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="mongodb-stat-content">
                                <div class="mongodb-stat-number">${stats.collections || 0}</div>
                                <div class="mongodb-stat-label">Collections</div>
                            </div>
                        </div>
                        
                        <div class="mongodb-stat-card">
                            <div class="mongodb-stat-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="mongodb-stat-content">
                                <div class="mongodb-stat-number">${(stats.totalDocuments || 0).toLocaleString()}</div>
                                <div class="mongodb-stat-label">Documents</div>
                            </div>
                        </div>
                        
                        <div class="mongodb-stat-card">
                            <div class="mongodb-stat-icon">
                                <i class="fas fa-hdd"></i>
                            </div>
                            <div class="mongodb-stat-content">
                                <div class="mongodb-stat-number">${this.formatBytes(stats.totalSize || 0)}</div>
                                <div class="mongodb-stat-label">Taille totale</div>
                            </div>
                        </div>
                        
                        <div class="mongodb-stat-card">
                            <div class="mongodb-stat-icon">
                                <i class="fas fa-list"></i>
                            </div>
                            <div class="mongodb-stat-content">
                                <div class="mongodb-stat-number">${stats.totalIndexes || 0}</div>
                                <div class="mongodb-stat-label">Index</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Détail par collection -->
                <div class="mongodb-collections-detail">
                    <h4>Détail par collection :</h4>
                    <div class="mongodb-collections-table">
                        <table class="mongodb-stats-table">
                            <thead>
                                <tr>
                                    <th>Collection</th>
                                    <th>Documents</th>
                                    <th>Taille</th>
                                    <th>Index</th>
                                    <th>Taille moyenne</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(stats.collectionStats || []).map(coll => `
                                    <tr>
                                        <td><strong>${coll.name}</strong></td>
                                        <td>${coll.documents.toLocaleString()}</td>
                                        <td>${this.formatBytes(coll.size)}</td>
                                        <td>${coll.indexes}</td>
                                        <td>${this.formatBytes(coll.avgDocSize)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Graphiques (placeholder) -->
                <div class="mongodb-stats-charts">
                    <div class="mongodb-chart-container">
                        <h4>Distribution des documents par collection</h4>
                        <canvas id="documentsChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `)
        
        // Optionnel : créer des graphiques simples
        this.createStatsCharts(stats)
    }

    createStatsCharts(stats) {
        // Graphique simple avec canvas (sans bibliothèque externe)
        const canvas = document.getElementById('documentsChart')
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const collections = stats.collectionStats || []
        
        if (collections.length === 0) return
        
        // Graphique en barres simple
        const maxDocs = Math.max(...collections.map(c => c.documents))
        const barHeight = 30
        const barSpacing = 10
        const maxBarWidth = 300
        
        ctx.fillStyle = '#4CAF50'
        ctx.font = '12px Arial'
        
        collections.forEach((coll, index) => {
            const y = index * (barHeight + barSpacing) + 20
            const barWidth = (coll.documents / maxDocs) * maxBarWidth
            
            // Barre
            ctx.fillRect(50, y, barWidth, barHeight)
            
            // Label
            ctx.fillStyle = '#333'
            ctx.fillText(coll.name, 5, y + 20)
            ctx.fillText(coll.documents.toLocaleString(), barWidth + 55, y + 20)
            ctx.fillStyle = '#4CAF50'
        })
    }

    async showServerInfo() {
        console.log('🖥️ [MongoDB] Affichage info serveur')
        
        try {
            const response = await this.adminPanel.apiCall('/mongodb/server-info')
            
            if (response.success) {
                this.displayServerInfo(response.info)
            } else {
                throw new Error('Erreur récupération info serveur')
            }
        } catch (error) {
            this.adminPanel.showNotification('Erreur info serveur: ' + error.message, 'error')
        }
    }

    displayServerInfo(info) {
        const modal = this.createModal('Informations du serveur MongoDB', 'mongodb-server-info', `
            <div class="mongodb-server-dashboard">
                <!-- Informations générales -->
                <div class="mongodb-server-general">
                    <h4>Serveur MongoDB</h4>
                    <div class="mongodb-info-grid">
                        <div class="mongodb-info-item">
                            <strong>Version:</strong> ${info.version || 'N/A'}
                        </div>
                        <div class="mongodb-info-item">
                            <strong>Host:</strong> ${info.host || 'localhost:27017'}
                        </div>
                        <div class="mongodb-info-item">
                            <strong>Uptime:</strong> ${this.formatUptime(info.uptime || 0)}
                        </div>
                        <div class="mongodb-info-item">
                            <strong>Connexions:</strong> ${info.connections || 'N/A'}
                        </div>
                    </div>
                </div>

                <!-- Métriques de performance -->
                <div class="mongodb-server-metrics">
                    <h4>Métriques</h4>
                    <div class="mongodb-metrics-grid">
                        <div class="mongodb-metric-card">
                            <div class="mongodb-metric-value">${info.operationsPerSecond || 0}</div>
                            <div class="mongodb-metric-label">Opérations/sec</div>
                        </div>
                        <div class="mongodb-metric-card">
                            <div class="mongodb-metric-value">${this.formatBytes(info.memoryUsage || 0)}</div>
                            <div class="mongodb-metric-label">Mémoire utilisée</div>
                        </div>
                        <div class="mongodb-metric-card">
                            <div class="mongodb-metric-value">${info.activeConnections || 0}</div>
                            <div class="mongodb-metric-label">Connexions actives</div>
                        </div>
                    </div>
                </div>

                <!-- Configuration -->
                <div class="mongodb-server-config">
                    <h4>Configuration</h4>
                    <div class="mongodb-config-list">
                        <div class="mongodb-config-item">
                            <strong>Storage Engine:</strong> ${info.storageEngine || 'WiredTiger'}
                        </div>
                        <div class="mongodb-config-item">
                            <strong>Journaling:</strong> ${info.journaling ? 'Activé' : 'Désactivé'}
                        </div>
                        <div class="mongodb-config-item">
                            <strong>Authentication:</strong> ${info.authentication ? 'Activé' : 'Désactivé'}
                        </div>
                        <div class="mongodb-config-item">
                            <strong>SSL:</strong> ${info.ssl ? 'Activé' : 'Désactivé'}
                        </div>
                    </div>
                </div>
            </div>
        `)
    }

    // =============================================================================
    // UTILITAIRES
    // =============================================================================
    
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B'
        
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    formatUptime(seconds) {
        if (!seconds) return '0s'
        
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        if (days > 0) return `${days}j ${hours}h ${minutes}m`
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    createModal(title, className, content) {
        // Supprimer les modals existants
        document.querySelectorAll('.mongodb-modal').forEach(modal => modal.remove())
        
        const modal = document.createElement('div')
        modal.className = `mongodb-modal ${className}`
        modal.innerHTML = `
            <div class="mongodb-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="mongodb-modal-content">
                <div class="mongodb-modal-header">
                    <h3 class="mongodb-modal-title">${title}</h3>
                    <button class="mongodb-modal-close" onclick="this.closest('.mongodb-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mongodb-modal-body">
                    ${content}
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
        
        // Animation d'entrée
        setTimeout(() => modal.classList.add('mongodb-modal-show'), 10)
        
        return modal
    }

    exportResults() {
        // Placeholder pour l'export
        this.adminPanel.showNotification('Export en développement', 'info')
    }

    // =============================================================================
    // MÉTHODES PUBLIQUES POUR INTÉGRATION
    // =============================================================================
    
    // Méthodes appelées depuis le module principal
    refreshDatabases() {
        return this.mongo.loadDatabases()
    }

    createDocument() {
        if (!this.mongo.currentCollection || !this.mongo.currentDatabase) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une base de données et une collection', 'warning')
            return
        }
        this.showDocumentEditor()
    }

    inspectDocument(id) {
        if (!this.mongo.currentCollection || !this.mongo.currentDatabase) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une base de données et une collection', 'warning')
            return
        }
        this.inspectDocument(id)
    }

    showQueryBuilder() {
        if (!this.mongo.currentCollection || !this.mongo.currentDatabase) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une base de données et une collection', 'warning')
            return
        }
        this.showQueryBuilder()
    }

    showDatabaseStats() {
        if (!this.mongo.currentDatabase) {
            this.adminPanel.showNotification('Sélectionnez d\'abord une base de données', 'warning')
            return
        }
        this.showDatabaseStats()
    }

    showServerInfo() {
        this.showServerInfo()
    }

    cleanup() {
        // Nettoyer les modals et événements
        document.querySelectorAll('.mongodb-modal').forEach(modal => modal.remove())
        this.statsCache.clear()
        console.log('🧹 [MongoDB Advanced] Cleanup effectué')
    }
}
