/**
 * Composant de tableaux avancés pour l'Admin Panel
 * Gère l'affichage, le tri, la pagination et les actions
 */
class DataTable {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            columns: [],
            data: [],
            pagination: true,
            pageSize: 20,
            sortable: true,
            searchable: false,
            actions: [],
            selectable: false,
            responsive: true,
            emptyMessage: 'Aucune donnée disponible',
            loadingMessage: 'Chargement...',
            ...options
        };
        
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filteredData = [];
        this.selectedRows = new Set();
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Container not found for DataTable');
            return;
        }
        
        this.injectStyles();
        this.createTable();
        this.bindEvents();
        this.render();
    }

    injectStyles() {
        if (document.getElementById('datatable-styles')) return;

        const styles = `
            .datatable-container {
                position: relative;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .datatable-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e9ecef;
                background: #f8f9fa;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
            }

            .datatable-search {
                position: relative;
                min-width: 250px;
            }

            .datatable-search input {
                width: 100%;
                padding: 8px 12px 8px 36px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 14px;
            }

            .datatable-search .search-icon {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #6c757d;
                font-size: 14px;
            }

            .datatable-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .datatable-wrapper {
                overflow-x: auto;
                max-height: 600px;
                overflow-y: auto;
            }

            .datatable {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }

            .datatable th,
            .datatable td {
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid #e9ecef;
                font-size: 14px;
            }

            .datatable th {
                background: #f8f9fa;
                font-weight: 600;
                color: #495057;
                position: sticky;
                top: 0;
                z-index: 10;
                white-space: nowrap;
            }

            .datatable th.sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
                padding-right: 30px;
            }

            .datatable th.sortable:hover {
                background: #e9ecef;
            }

            .datatable th.sortable::after {
                content: '';
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 4px solid #ced4da;
                opacity: 0.5;
            }

            .datatable th.sortable.asc::after {
                border-bottom: 4px solid #495057;
                border-top: none;
                opacity: 1;
            }

            .datatable th.sortable.desc::after {
                border-top: 4px solid #495057;
                border-bottom: none;
                opacity: 1;
            }

            .datatable tr:hover {
                background: #f8f9fa;
            }

            .datatable tr.selected {
                background: #e3f2fd;
            }

            .datatable-checkbox {
                width: 40px;
                text-align: center;
            }

            .datatable-actions-cell {
                white-space: nowrap;
            }

            .datatable-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                margin-right: 4px;
                transition: all 0.2s ease;
            }

            .datatable-btn.primary {
                background: #007bff;
                color: white;
            }

            .datatable-btn.primary:hover {
                background: #0056b3;
            }

            .datatable-btn.success {
                background: #28a745;
                color: white;
            }

            .datatable-btn.warning {
                background: #ffc107;
                color: #212529;
            }

            .datatable-btn.danger {
                background: #dc3545;
                color: white;
            }

            .datatable-btn.secondary {
                background: #6c757d;
                color: white;
            }

            .datatable-pagination {
                padding: 16px 20px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
            }

            .datatable-pagination-info {
                color: #6c757d;
                font-size: 14px;
            }

            .datatable-pagination-controls {
                display: flex;
                gap: 4px;
                align-items: center;
            }

            .datatable-pagination-btn {
                padding: 6px 12px;
                border: 1px solid #ced4da;
                background: white;
                cursor: pointer;
                font-size: 14px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .datatable-pagination-btn:hover:not(:disabled) {
                background: #e9ecef;
            }

            .datatable-pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .datatable-pagination-btn.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }

            .datatable-empty {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
                font-style: italic;
            }

            .datatable-loading {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }

            .datatable-loading .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }

            .badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .badge.success { background: #d4edda; color: #155724; }
            .badge.danger { background: #f8d7da; color: #721c24; }
            .badge.warning { background: #fff3cd; color: #856404; }
            .badge.info { background: #d1ecf1; color: #0c5460; }
            .badge.secondary { background: #e2e3e5; color: #383d41; }

            @media (max-width: 768px) {
                .datatable-header {
                    flex-direction: column;
                    align-items: stretch;
                }

                .datatable-search {
                    min-width: auto;
                }

                .datatable th,
                .datatable td {
                    padding: 8px 12px;
                    font-size: 13px;
                }

                .datatable-actions-cell .datatable-btn {
                    padding: 4px 8px;
                    font-size: 11px;
                }
            }
        `;

        const styleSheet = AdminHelpers.dom.createElement('style', {
            id: 'datatable-styles'
        }, styles);
        
        document.head.appendChild(styleSheet);
    }

    createTable() {
        // Container principal
        this.tableContainer = AdminHelpers.dom.createElement('div', {
            className: 'datatable-container'
        });

        // Header avec recherche et actions
        if (this.options.searchable || this.options.actions.length > 0) {
            this.createHeader();
        }

        // Wrapper pour le tableau
        this.tableWrapper = AdminHelpers.dom.createElement('div', {
            className: 'datatable-wrapper'
        });

        // Table
        this.table = AdminHelpers.dom.createElement('table', {
            className: 'datatable'
        });

        this.tableWrapper.appendChild(this.table);
        this.tableContainer.appendChild(this.tableWrapper);

        // Pagination
        if (this.options.pagination) {
            this.createPagination();
        }

        // Ajouter au container
        this.container.appendChild(this.tableContainer);
    }

    createHeader() {
        this.header = AdminHelpers.dom.createElement('div', {
            className: 'datatable-header'
        });

        // Recherche
        if (this.options.searchable) {
            const searchContainer = AdminHelpers.dom.createElement('div', {
                className: 'datatable-search'
            });

            const searchIcon = AdminHelpers.dom.createElement('i', {
                className: 'fas fa-search search-icon'
            });

            this.searchInput = AdminHelpers.dom.createElement('input', {
                type: 'text',
                placeholder: 'Rechercher...',
                className: 'datatable-search-input'
            });

            searchContainer.appendChild(searchIcon);
            searchContainer.appendChild(this.searchInput);
            this.header.appendChild(searchContainer);
        }

        // Actions globales
        if (this.options.actions.length > 0) {
            const actionsContainer = AdminHelpers.dom.createElement('div', {
                className: 'datatable-actions'
            });

            this.options.actions.forEach(action => {
                const btn = AdminHelpers.dom.createElement('button', {
                    className: `datatable-btn ${action.className || 'primary'}`,
                    onclick: action.onClick
                },
