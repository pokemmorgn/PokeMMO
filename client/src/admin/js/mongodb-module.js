// client/src/admin/js/mongodb-module.js
export class MongoDBModule {
    constructor(adminPanel) {
        this.adminPanel = adminPanel
        this.name = 'mongodb'
        this.currentCollection = null
        this.currentDatabase = null
        this.databases = []
        this.collections = []
        this.currentPage = 0
        this.pageSize = 20
        this.currentQuery = {}
        this.selectedDocument = null
    }

    async onTabActivated() {
        console.log('🗄️ [MongoDB] Module activé')
        await this.initializeMongoDBPanel()
    }

    async initializeMongoDBPanel() {
        try {
            await this.loadDatabases()
            this.renderMongoDBPanel()
        } catch (error) {
            console.error('❌ [MongoDB] Erreur initialisation:', error)
            this.adminPanel.showNotification('Erreur de connexion MongoDB: ' + error.message, 'error')
        }
    }

    async loadDatabases() {
        try {
            const data = await this.adminPanel.apiCall('/mongodb/databases')
            this.databases = data.databases || []
            console.log('✅ [MongoDB] Bases de données chargées:', this.databases.length)
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement databases:', error)
            throw error
        }
    }

    async loadCollections(dbName) {
        try {
            const data = await this.adminPanel.apiCall(`/mongodb/collections/${dbName}`)
            this.collections = data.collections || []
            this.currentDatabase = dbName
            console.log(`✅ [MongoDB] Collections de ${dbName} chargées:`, this.collections.length)
            this.updateCollectionsList()
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement collections:', error)
            this.adminPanel.showNotification('Erreur chargement collections: ' + error.message, 'error')
        }
    }

    async loadDocuments(collectionName, page = 0, query = {}) {
        try {
            this.adminPanel.showLoading('documentsLoading', true)
            
            const data = await this.adminPanel.apiCall('/mongodb/documents', {
                method: 'POST',
                body: JSON.stringify({
                    database: this.currentDatabase,
                    collection: collectionName,
                    query: query,
                    page: page,
                    limit: this.pageSize
                })
            })

            this.currentCollection = collectionName
            this.currentPage = page
            this.currentQuery = query
            
            this.renderDocuments(data.documents || [], data.total || 0)
            console.log(`✅ [MongoDB] Documents de ${collectionName} chargés:`, data.documents?.length)
        } catch (error) {
            console.error('❌ [MongoDB] Erreur chargement documents:', error)
            this.adminPanel.showNotification('Erreur chargement documents: ' + error.message, 'error')
        } finally {
            this.adminPanel.showLoading('documentsLoading', false)
        }
    }

    async saveDocument(documentId, documentData) {
        try {
            await this.adminPanel.apiCall('/mongodb/document', {
                method: 'PUT',
                body: JSON.stringify({
                    database: this.currentDatabase,
                    collection: this.currentCollection,
                    id: documentId,
                    data: documentData
                })
            })

            this.adminPanel.showNotification('Document sauvegardé avec succès', 'success')
            this.loadDocuments(this.currentCollection, this.currentPage, this.currentQuery)
        } catch (error) {
            console.error('❌ [MongoDB] Erreur sauvegarde:', error)
            this.adminPanel.showNotification('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    async deleteDocument(documentId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

        try {
            await this.adminPanel.apiCall('/mongodb/document', {
                method: 'DELETE',
                body: JSON.stringify({
                    database: this.currentDatabase,
                    collection: this.currentCollection,
                    id: documentId
                })
            })

            this.adminPanel.showNotification('Document supprimé avec succès', 'success')
            this.loadDocuments(this.currentCollection, this.currentPage, this.currentQuery)
        } catch (error) {
            console.error('❌ [MongoDB] Erreur suppression:', error)
            this.adminPanel.showNotification('Erreur suppression: ' + error.message, 'error')
        }
    }

    renderMongoDBPanel() {
        const container = document.getElementById('mongodb')
        if (!container) return

        container.innerHTML = `
            <div class="mongodb-container">
                <!-- Header -->
                <div class="mongodb-header">
                    <h2 style="margin-bottom: 25px; color: #2c3e50;">
                        <i class="fas fa-database"></i> Explorateur MongoDB
                    </h2>
                    
                    <div class="mongodb-navigation">
                        <div class="nav-section">
                            <label class="form-label">Base de données:</label>
                            <select id="databaseSelect" class="form-select" style="min-width: 200px;">
                                <option value="">Sélectionnez une base...</option>
                                ${this.databases.map(db => 
                                    `<option value="${db}" ${db === this.currentDatabase ? 'selected' : ''}>${db}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="nav-section" id="collectionsSection" style="display: ${this.currentDatabase ? 'block' : 'none'};">
                            <label class="form-label">Collection:</label>
                            <select id="collectionSelect" class="form-select" style="min-width: 200px;">
                                <option value="">Sélectionnez une collection...</option>
                            </select>
                        </div>
                        
                        <div class="nav-actions">
                            <button class="btn btn-primary" onclick="adminPanel.mongodb.refreshData()">
                                <i class="fas fa-sync-alt"></i> Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Query Section -->
                <div class="mongodb-query-section" id="querySection" style="display: ${this.currentCollection ? 'block' : 'none'};">
                    <div class="query-header">
                        <h3>Requête MongoDB</h3>
                        <div class="query-actions">
                            <button class="btn btn-success" onclick="adminPanel.mongodb.executeQuery()">
                                <i class="fas fa-play"></i> Exécuter
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.mongodb.clearQuery()">
                                <i class="fas fa-times"></i> Effacer
                            </button>
                        </div>
                    </div>
                    
                    <div class="query-builder">
                        <textarea id="mongoQuery" class="form-textarea json-editor" rows="4" 
                                  placeholder='{"username": "john", "level": {"$gte": 5}}'>{}</textarea>
                        <div class="query-help">
                            <small>Syntaxe MongoDB JSON. Exemple: {"level": {"$gte": 10}, "isActive": true}</small>
                        </div>
                    </div>
                </div>

                <!-- Results Section -->
                <div class="mongodb-results" id="resultsSection" style="display: ${this.currentCollection ? 'block' : 'none'};">
                    <div class="results-header">
                        <h3>Documents <span id="resultsCount" class="badge badge-primary">0</span></h3>
                        <div class="results-actions">
                            <button class="btn btn-success" onclick="adminPanel.mongodb.createDocument()">
                                <i class="fas fa-plus"></i> Nouveau
                            </button>
                            <div class="pagination-controls">
                                <button id="prevPage" class="btn btn-secondary btn-sm" onclick="adminPanel.mongodb.previousPage()">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span id="pageInfo">Page 1</span>
                                <button id="nextPage" class="btn btn-secondary btn-sm" onclick="adminPanel.mongodb.nextPage()">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="documents-container" id="documentsContainer">
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            Sélectionnez une collection pour voir les documents
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div class="loading" id="documentsLoading" style="display: none;">
                    <div class="spinner"></div>
                    Chargement des documents...
                </div>
            </div>
        `

        this.setupEventListeners()
        if (this.currentDatabase) {
            this.loadCollections(this.currentDatabase)
        }
    }

    setupEventListeners() {
        // Database selection
        const dbSelect = document.getElementById('databaseSelect')
        if (dbSelect) {
            dbSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadCollections(e.target.value)
                } else {
                    this.collections = []
                    this.currentDatabase = null
                    this.updateCollectionsList()
                }
                this.updateVisibility()
            })
        }

        // Collection selection
        const collSelect = document.getElementById('collectionSelect')
        if (collSelect) {
            collSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadDocuments(e.target.value)
                }
                this.updateVisibility()
            })
        }
    }

    updateCollectionsList() {
        const collSelect = document.getElementById('collectionSelect')
        if (!collSelect) return

        collSelect.innerHTML = '<option value="">Sélectionnez une collection...</option>' +
            this.collections.map(coll => 
                `<option value="${coll}" ${coll === this.currentCollection ? 'selected' : ''}>${coll}</option>`
            ).join('')
    }

    updateVisibility() {
        const collectionsSection = document.getElementById('collectionsSection')
        const querySection = document.getElementById('querySection')
        const resultsSection = document.getElementById('resultsSection')

        if (collectionsSection) {
            collectionsSection.style.display = this.currentDatabase ? 'block' : 'none'
        }
        if (querySection) {
            querySection.style.display = this.currentCollection ? 'block' : 'none'
        }
        if (resultsSection) {
            resultsSection.style.display = this.currentCollection ? 'block' : 'none'
        }
    }

    renderDocuments(documents, total) {
        const container = document.getElementById('documentsContainer')
        const countBadge = document.getElementById('resultsCount')
        const pageInfo = document.getElementById('pageInfo')

        if (countBadge) countBadge.textContent = total
        if (pageInfo) {
            const currentPage = this.currentPage + 1
            const totalPages = Math.ceil(total / this.pageSize)
            pageInfo.textContent = `Page ${currentPage} / ${totalPages}`
        }

        if (!container) return

        if (documents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-database" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Aucun document trouvé</p>
                </div>
            `
            return
        }

        container.innerHTML = `
            <div class="documents-table">
                ${documents.map((doc, index) => `
                    <div class="document-card">
                        <div class="document-header">
                            <div class="document-id">
                                <strong>ID:</strong> ${doc._id}
                            </div>
                            <div class="document-actions">
                                <button class="btn btn-info btn-sm" onclick="adminPanel.mongodb.editDocument('${doc._id}')">
                                    <i class="fas fa-edit"></i> Éditer
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.mongodb.deleteDocument('${doc._id}')">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                        <div class="document-content">
                            <pre><code>${JSON.stringify(doc, null, 2)}</code></pre>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    }

    // Public methods for global access
    async refreshData() {
        if (this.currentCollection) {
            await this.loadDocuments(this.currentCollection, this.currentPage, this.currentQuery)
        } else if (this.currentDatabase) {
            await this.loadCollections(this.currentDatabase)
        } else {
            await this.loadDatabases()
            this.renderMongoDBPanel()
        }
    }

    executeQuery() {
        const queryText = document.getElementById('mongoQuery')?.value || '{}'
        try {
            const query = JSON.parse(queryText)
            this.loadDocuments(this.currentCollection, 0, query)
        } catch (error) {
            this.adminPanel.showNotification('Requête JSON invalide: ' + error.message, 'error')
        }
    }

    clearQuery() {
        const queryText = document.getElementById('mongoQuery')
        if (queryText) {
            queryText.value = '{}'
            this.loadDocuments(this.currentCollection, 0, {})
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.loadDocuments(this.currentCollection, this.currentPage - 1, this.currentQuery)
        }
    }

    nextPage() {
        this.loadDocuments(this.currentCollection, this.currentPage + 1, this.currentQuery)
    }

    editDocument(documentId) {
        console.log('🔧 [MongoDB] Édition document:', documentId)
        // TODO: Implémenter l'éditeur de document
        this.adminPanel.showNotification('Éditeur de document en développement', 'info')
    }

    createDocument() {
        console.log('➕ [MongoDB] Création nouveau document')
        // TODO: Implémenter la création de document
        this.adminPanel.showNotification('Création de document en développement', 'info')
    }

    cleanup() {
        // Cleanup if needed
        console.log('🧹 [MongoDB] Module cleanup')
    }
}
