/**
 * Task Scheduler - Main Application (PWA Mobile-First)
 * Complete task management web application with mobile gestures
 */

class TaskScheduler {
    constructor() {
        // Initialize managers
        this.storage = new StorageManager();
        this.notifications = new NotificationManager();
        
        // Application state
        this.tasks = [];
        this.currentView = 'list';
        this.currentTab = 'today'; // Default tab is "Today"
        this.filters = {
            status: 'all',
            priority: 'all',
            category: 'all',
            date: 'today', // Default to today
            search: ''
        };
        this.editingTaskId = null;
        this.deletingTaskId = null;
        this.advancedOptionsVisible = false;

        // Category labels with icons
        this.categoryLabels = {
            work: { emoji: '💼', name: 'Trabalho', color: '#3b82f6' },
            personal: { emoji: '👤', name: 'Pessoal', color: '#a855f7' },
            study: { emoji: '📚', name: 'Estudos', color: '#10b981' },
            health: { emoji: '❤️', name: 'Saúde', color: '#ef4444' },
            shopping: { emoji: '🛒', name: 'Compras', color: '#f59e0b' },
            other: { emoji: '📌', name: 'Outros', color: '#6b7280' }
        };

        // Priority labels
        this.priorityLabels = {
            high: { emoji: '🔴', name: 'Alta' },
            medium: { emoji: '🟡', name: 'Média' },
            low: { emoji: '🟢', name: 'Baixa' }
        };

        // Swipe gesture state
        this.swipeState = {
            startX: 0,
            startY: 0,
            currentX: 0,
            threshold: 80,
            element: null
        };

        // Initialize the app
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Load tasks and settings
        this.tasks = this.storage.getTasks();
        const settings = this.storage.getSettings();
        
        // Cache DOM elements first
        this.cacheElements();
        
        // Apply theme after elements are cached
        this.setTheme(settings.theme);
        this.currentView = settings.viewMode || 'list';
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupMobileEventListeners();
        this.setupSwipeGestures();
        
        // Initialize notifications
        await this.notifications.init();
        this.notifications.startDeadlineChecker(() => this.tasks);
        
        // Initialize push notifications if available
        if (window.pushNotifications) {
            await window.pushNotifications.init();
        }
        
        // Initial render
        this.render();
        this.updateStatistics();
        this.updateBadge();
        this.updateMobileStats();

        // Set default date for new tasks
        this.setDefaultDate();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Main containers
        this.tasksContainer = document.getElementById('tasksContainer');
        this.emptyState = document.getElementById('emptyState');
        
        // Modal elements
        this.taskModal = document.getElementById('taskModal');
        this.deleteModal = document.getElementById('deleteModal');
        this.taskForm = document.getElementById('taskForm');
        this.modalTitle = document.getElementById('modalTitle');
        
        // Form fields
        this.taskIdField = document.getElementById('taskId');
        this.titleField = document.getElementById('taskTitle');
        this.descriptionField = document.getElementById('taskDescription');
        this.dateField = document.getElementById('taskDate');
        this.timeField = document.getElementById('taskTime');
        this.priorityField = document.getElementById('taskPriority');
        this.categoryField = document.getElementById('taskCategory');
        
        // Filter elements (Desktop)
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.priorityFilter = document.getElementById('priorityFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.dateFilter = document.getElementById('dateFilter');
        
        // Mobile filter elements
        this.mobileSearchInput = document.getElementById('mobileSearchInput');
        this.mobileStatusFilter = document.getElementById('mobileStatusFilter');
        this.mobilePriorityFilter = document.getElementById('mobilePriorityFilter');
        this.mobileCategoryFilter = document.getElementById('mobileCategoryFilter');
        
        // View toggle buttons
        this.listViewBtn = document.getElementById('listViewBtn');
        this.cardViewBtn = document.getElementById('cardViewBtn');
        
        // Tab navigation
        this.tabToday = document.getElementById('tabToday');
        this.tabWeek = document.getElementById('tabWeek');
        this.tabAll = document.getElementById('tabAll');
        this.todayBadge = document.getElementById('todayBadge');
        
        // Statistics elements (Desktop)
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.pendingTasksEl = document.getElementById('pendingTasks');
        this.overdueTasksEl = document.getElementById('overdueTasks');
        this.completionRateEl = document.getElementById('completionRate');
        this.progressFillEl = document.getElementById('progressFill');
        this.badgeCountEl = document.getElementById('badgeCount');
        
        // Mobile statistics elements
        this.todayTasksCountEl = document.getElementById('todayTasksCount');
        this.pendingTasksCountEl = document.getElementById('pendingTasksCount');
        this.completedTasksCountEl = document.getElementById('completedTasksCount');
        this.overdueTasksCountEl = document.getElementById('overdueTasksCount');
        
        // Toast container
        this.toastContainer = document.getElementById('toastContainer');
        
        // Buttons
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.toggleDarkModeBtn = document.getElementById('toggleDarkMode');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');
        
        // Mobile menu
        this.menuBtn = document.getElementById('menuBtn');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.menuClose = document.getElementById('menuClose');
        
        // Advanced options
        this.toggleAdvancedBtn = document.getElementById('toggleAdvancedBtn');
        this.advancedOptions = document.getElementById('advancedOptions');
        
        // Quick date buttons
        this.quickDateBtns = document.querySelectorAll('.quick-date-btn');
        
        // Priority and category selectors
        this.priorityOptions = document.querySelectorAll('.priority-option input');
        this.categoryOptions = document.querySelectorAll('.category-option input');
        
        // Pull to refresh
        this.pullToRefresh = document.getElementById('pullToRefresh');
        
        // Mobile export/import buttons
        this.mobileExportBtn = document.getElementById('mobileExportBtn');
        this.mobileImportBtn = document.getElementById('mobileImportBtn');
        
        // Notifications button
        this.enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add task button
        this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
        
        // Modal close buttons
        document.getElementById('closeModal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        
        // Form submission
        this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Desktop filters
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce((e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.render();
            }, 300));
        }
        
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.render();
            });
        }
        
        if (this.priorityFilter) {
            this.priorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.render();
            });
        }
        
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.render();
            });
        }
        
        if (this.dateFilter) {
            this.dateFilter.addEventListener('change', (e) => {
                this.filters.date = e.target.value;
                this.render();
            });
        }
        
        // View toggle
        if (this.listViewBtn) {
            this.listViewBtn.addEventListener('click', () => this.setView('list'));
        }
        if (this.cardViewBtn) {
            this.cardViewBtn.addEventListener('click', () => this.setView('card'));
        }
        
        // Theme toggle
        this.toggleDarkModeBtn.addEventListener('click', () => this.toggleTheme());
        
        // Export/Import
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportTasks());
        }
        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.importFile.click());
        }
        if (this.importFile) {
            this.importFile.addEventListener('change', (e) => this.handleImport(e));
        }
        
        // Task actions delegation
        this.tasksContainer.addEventListener('click', (e) => this.handleTaskAction(e));
        
        // Close modals on overlay click
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) this.closeTaskModal();
        });
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) this.closeDeleteModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Quick date buttons
        this.quickDateBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickDate(btn));
        });
        
        // Toggle advanced options
        if (this.toggleAdvancedBtn) {
            this.toggleAdvancedBtn.addEventListener('click', () => this.toggleAdvancedOptions());
        }
        
        // Priority selector sync
        this.priorityOptions.forEach(input => {
            input.addEventListener('change', () => {
                this.priorityField.value = input.value;
            });
        });
        
        // Category selector sync
        this.categoryOptions.forEach(input => {
            input.addEventListener('change', () => {
                this.categoryField.value = input.value;
            });
        });
    }

    /**
     * Set up mobile-specific event listeners
     */
    setupMobileEventListeners() {
        // Tab navigation
        if (this.tabToday) {
            this.tabToday.addEventListener('click', () => this.setTab('today'));
        }
        if (this.tabWeek) {
            this.tabWeek.addEventListener('click', () => this.setTab('week'));
        }
        if (this.tabAll) {
            this.tabAll.addEventListener('click', () => this.setTab('all'));
        }
        
        // Mobile search
        if (this.mobileSearchInput) {
            this.mobileSearchInput.addEventListener('input', this.debounce((e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.render();
            }, 300));
        }
        
        // Mobile menu
        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', () => this.openMenu());
        }
        if (this.menuClose) {
            this.menuClose.addEventListener('click', () => this.closeMenu());
        }
        if (this.menuOverlay) {
            this.menuOverlay.addEventListener('click', (e) => {
                if (e.target === this.menuOverlay) this.closeMenu();
            });
        }
        
        // Mobile filters
        if (this.mobileStatusFilter) {
            this.mobileStatusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                if (this.statusFilter) this.statusFilter.value = e.target.value;
                this.render();
            });
        }
        if (this.mobilePriorityFilter) {
            this.mobilePriorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                if (this.priorityFilter) this.priorityFilter.value = e.target.value;
                this.render();
            });
        }
        if (this.mobileCategoryFilter) {
            this.mobileCategoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                if (this.categoryFilter) this.categoryFilter.value = e.target.value;
                this.render();
            });
        }
        
        // Mobile export/import
        if (this.mobileExportBtn) {
            this.mobileExportBtn.addEventListener('click', () => {
                this.exportTasks();
                this.closeMenu();
            });
        }
        if (this.mobileImportBtn) {
            this.mobileImportBtn.addEventListener('click', () => {
                this.importFile.click();
                this.closeMenu();
            });
        }
        
        // Enable notifications button
        if (this.enableNotificationsBtn) {
            this.enableNotificationsBtn.addEventListener('click', async () => {
                if (window.pushNotifications) {
                    const result = await window.pushNotifications.requestPermission();
                    if (result.granted) {
                        this.showToast('Notificações ativadas! 🔔', 'success');
                    } else {
                        this.showToast('Não foi possível ativar notificações', 'error');
                    }
                }
                this.closeMenu();
            });
        }
    }

    /**
     * Set up swipe gestures for task items
     */
    setupSwipeGestures() {
        this.tasksContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.tasksContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.tasksContainer.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        this.swipeState.startX = e.touches[0].clientX;
        this.swipeState.startY = e.touches[0].clientY;
        this.swipeState.element = taskItem;
        this.swipeState.currentX = 0;
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.swipeState.element) return;

        const deltaX = e.touches[0].clientX - this.swipeState.startX;
        const deltaY = e.touches[0].clientY - this.swipeState.startY;

        // If vertical scroll is greater, ignore horizontal swipe
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            this.resetSwipe();
            return;
        }

        // Prevent scroll while swiping
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }

        this.swipeState.currentX = deltaX;

        // Apply transform with resistance
        const resistance = 0.5;
        const transform = deltaX * resistance;
        const maxTransform = 100;
        const clampedTransform = Math.max(-maxTransform, Math.min(maxTransform, transform));
        
        this.swipeState.element.style.transform = `translateX(${clampedTransform}px)`;
        this.swipeState.element.style.transition = 'none';

        // Visual feedback
        if (clampedTransform > 30) {
            this.swipeState.element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        } else if (clampedTransform < -30) {
            this.swipeState.element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        if (!this.swipeState.element) return;

        const taskId = this.swipeState.element.dataset.taskId;
        const deltaX = this.swipeState.currentX;

        // Reset styles
        this.swipeState.element.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
        this.swipeState.element.style.transform = '';
        this.swipeState.element.style.backgroundColor = '';

        // Check threshold
        if (deltaX > this.swipeState.threshold) {
            // Swipe right - complete task
            this.vibrate([50]);
            this.toggleTaskComplete(taskId);
        } else if (deltaX < -this.swipeState.threshold) {
            // Swipe left - delete task
            this.vibrate([50, 30, 50]);
            this.openDeleteModal(taskId);
        }

        this.resetSwipe();
    }

    /**
     * Reset swipe state
     */
    resetSwipe() {
        if (this.swipeState.element) {
            this.swipeState.element.style.transform = '';
            this.swipeState.element.style.backgroundColor = '';
        }
        this.swipeState.element = null;
        this.swipeState.startX = 0;
        this.swipeState.startY = 0;
        this.swipeState.currentX = 0;
    }

    /**
     * Vibrate device (haptic feedback)
     */
    vibrate(pattern = [50]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Set active tab and filter accordingly
     */
    setTab(tab) {
        this.currentTab = tab;
        
        // Update tab UI
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }
        
        // Update date filter based on tab
        switch (tab) {
            case 'today':
                this.filters.date = 'today';
                break;
            case 'week':
                this.filters.date = 'week';
                break;
            case 'all':
                this.filters.date = 'all';
                break;
        }
        
        // Sync with desktop filter if exists
        if (this.dateFilter) {
            this.dateFilter.value = this.filters.date;
        }
        
        this.vibrate([30]);
        this.render();
    }

    /**
     * Set default date to today
     */
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        this.dateField.value = today;
        this.dateField.min = today;
    }

    /**
     * Handle quick date button click
     */
    handleQuickDate(btn) {
        const dateType = btn.dataset.date;
        const today = new Date();
        let targetDate;

        switch (dateType) {
            case 'today':
                targetDate = today;
                break;
            case 'tomorrow':
                targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + 1);
                break;
            case 'nextweek':
                targetDate = new Date(today);
                // Find next Monday
                const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
                targetDate.setDate(targetDate.getDate() + daysUntilMonday);
                break;
            default:
                targetDate = today;
        }

        this.dateField.value = targetDate.toISOString().split('T')[0];

        // Update active state
        this.quickDateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.vibrate([30]);
    }

    /**
     * Toggle advanced options visibility
     */
    toggleAdvancedOptions() {
        this.advancedOptionsVisible = !this.advancedOptionsVisible;
        
        if (this.advancedOptions) {
            this.advancedOptions.classList.toggle('hidden', !this.advancedOptionsVisible);
        }
        
        if (this.toggleAdvancedBtn) {
            this.toggleAdvancedBtn.classList.toggle('expanded', this.advancedOptionsVisible);
            const textEl = this.toggleAdvancedBtn.querySelector('.toggle-text');
            if (textEl) {
                textEl.textContent = this.advancedOptionsVisible ? 'Menos opções' : 'Mais opções';
            }
        }
    }

    /**
     * Open mobile menu
     */
    openMenu() {
        if (this.menuOverlay) {
            this.menuOverlay.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    /**
     * Close mobile menu
     */
    closeMenu() {
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Render tasks based on current filters
     */
    render() {
        const filteredTasks = this.filterTasks();
        
        // Group tasks by date
        const groupedTasks = this.groupTasksByDate(filteredTasks);
        
        // Show/hide empty state
        if (filteredTasks.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.renderEmptyState();
        } else {
            this.emptyState.classList.add('hidden');
        }
        
        // Clear existing tasks (except empty state)
        const existingElements = this.tasksContainer.querySelectorAll('.task-item, .task-group');
        existingElements.forEach(el => el.remove());
        
        // Render grouped tasks
        if (this.currentView === 'list' && this.currentTab !== 'all') {
            // Render with date groups
            Object.entries(groupedTasks).forEach(([dateLabel, tasks]) => {
                if (tasks.length === 0) return;
                
                const groupElement = this.createTaskGroup(dateLabel, tasks);
                this.tasksContainer.appendChild(groupElement);
            });
        } else {
            // Render flat list for card view or "all" tab
            const sortedTasks = this.sortTasks(filteredTasks);
            sortedTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                this.tasksContainer.appendChild(taskElement);
            });
        }
        
        // Update view class
        this.tasksContainer.classList.remove('list-view', 'card-view');
        this.tasksContainer.classList.add(`${this.currentView}-view`);
        
        // Update today badge
        this.updateTodayBadge();
    }

    /**
     * Group tasks by date
     */
    groupTasksByDate(tasks) {
        const groups = {
            'Atrasadas': [],
            'Hoje': [],
            'Amanhã': [],
            'Esta Semana': [],
            'Próximas': [],
            'Sem Data': []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const sortedTasks = this.sortTasks(tasks);

        sortedTasks.forEach(task => {
            if (!task.date) {
                groups['Sem Data'].push(task);
                return;
            }

            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);

            if (!task.completed && this.isOverdue(task)) {
                groups['Atrasadas'].push(task);
            } else if (taskDate.getTime() === today.getTime()) {
                groups['Hoje'].push(task);
            } else if (taskDate.getTime() === tomorrow.getTime()) {
                groups['Amanhã'].push(task);
            } else if (taskDate > today && taskDate <= weekEnd) {
                groups['Esta Semana'].push(task);
            } else if (taskDate > weekEnd) {
                groups['Próximas'].push(task);
            }
        });

        return groups;
    }

    /**
     * Create task group element
     */
    createTaskGroup(label, tasks) {
        const group = document.createElement('div');
        group.className = 'task-group';
        
        const header = document.createElement('div');
        header.className = 'task-group-header';
        header.innerHTML = `
            <span class="task-group-title">${label}</span>
            <span class="task-group-count">${tasks.length}</span>
            <span class="task-group-line"></span>
        `;
        
        group.appendChild(header);
        
        tasks.forEach(task => {
            group.appendChild(this.createTaskElement(task));
        });
        
        return group;
    }

    /**
     * Render empty state with appropriate message
     */
    renderEmptyState() {
        const hasFilters = Object.values(this.filters).some(v => v !== 'all' && v !== '' && v !== 'today');
        
        if (this.currentTab === 'today' && !hasFilters) {
            this.emptyState.innerHTML = `
                <span class="empty-icon">🎉</span>
                <h3>Nenhuma tarefa para hoje!</h3>
                <p>Aproveite o dia livre ou adicione uma nova tarefa</p>
            `;
        } else if (hasFilters || this.filters.search) {
            this.emptyState.innerHTML = `
                <span class="empty-icon">🔍</span>
                <h3>Nenhuma tarefa encontrada</h3>
                <p>Tente ajustar os filtros para ver mais resultados</p>
            `;
        } else if (this.tasks.length === 0) {
            this.emptyState.innerHTML = `
                <span class="empty-icon">📝</span>
                <h3>Nenhuma tarefa cadastrada</h3>
                <p>Clique no botão + para adicionar sua primeira tarefa</p>
            `;
        }
    }

    /**
     * Filter tasks based on current filters
     */
    filterTasks() {
        return this.tasks.filter(task => {
            // Status filter
            if (this.filters.status === 'active' && task.completed) return false;
            if (this.filters.status === 'completed' && !task.completed) return false;
            
            // Priority filter
            if (this.filters.priority !== 'all' && task.priority !== this.filters.priority) return false;
            
            // Category filter
            if (this.filters.category !== 'all' && task.category !== this.filters.category) return false;
            
            // Date filter
            if (!this.passesDateFilter(task)) return false;
            
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search;
                const titleMatch = task.title.toLowerCase().includes(searchLower);
                const descMatch = (task.description || '').toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }
            
            return true;
        });
    }

    /**
     * Check if task passes date filter
     */
    passesDateFilter(task) {
        if (this.filters.date === 'all') return true;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // For tasks without date, only show in "all"
        if (!task.date) return false;
        
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        
        switch (this.filters.date) {
            case 'today':
                // Include overdue tasks in "today" view
                return taskDate.getTime() === today.getTime() || 
                       (!task.completed && taskDate < today);
            
            case 'week': {
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return (taskDate >= today && taskDate <= weekEnd) ||
                       (!task.completed && taskDate < today); // Include overdue
            }
            
            case 'month': {
                const monthEnd = new Date(today);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                return (taskDate >= today && taskDate <= monthEnd) ||
                       (!task.completed && taskDate < today);
            }
            
            default:
                return true;
        }
    }

    /**
     * Sort tasks by priority and date
     */
    sortTasks(tasks) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        
        return [...tasks].sort((a, b) => {
            // Completed tasks go to the end
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Overdue tasks first
            const aOverdue = this.isOverdue(a);
            const bOverdue = this.isOverdue(b);
            if (aOverdue !== bOverdue) {
                return aOverdue ? -1 : 1;
            }
            
            // Then by date
            if (a.date && b.date) {
                const dateCompare = new Date(a.date) - new Date(b.date);
                if (dateCompare !== 0) return dateCompare;
            }
            
            // Tasks with dates come before tasks without
            if (a.date && !b.date) return -1;
            if (!a.date && b.date) return 1;
            
            // Then by priority
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            
            // Finally by creation date
            return a.createdAt - b.createdAt;
        });
    }

    /**
     * Create task DOM element
     */
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${this.isOverdue(task) ? 'overdue' : ''}`;
        div.dataset.taskId = task.id;
        
        const category = this.categoryLabels[task.category] || this.categoryLabels.other;
        const priority = this.priorityLabels[task.priority] || this.priorityLabels.medium;
        
        const dateFormatted = task.date ? this.formatDate(task.date) : '';
        const timeFormatted = task.time || '';
        
        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 data-action="toggle" 
                 role="checkbox" 
                 aria-checked="${task.completed}"
                 tabindex="0"
                 aria-label="Marcar como ${task.completed ? 'pendente' : 'concluída'}">
            </div>
            <div class="task-content">
                <div class="task-header">
                    <span class="task-title">${this.escapeHtml(task.title)}</span>
                    ${timeFormatted ? `<span class="task-time">🕐 ${timeFormatted}</span>` : ''}
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="category-tag ${task.category}">${category.emoji} ${category.name}</span>
                    <span class="priority-badge ${task.priority}">${priority.name}</span>
                    ${dateFormatted ? `<span class="task-meta-item date">📅 ${dateFormatted}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" data-action="edit" aria-label="Editar tarefa" title="Editar">✏️</button>
                <button class="task-action-btn delete" data-action="delete" aria-label="Excluir tarefa" title="Excluir">🗑️</button>
            </div>
        `;
        
        return div;
    }

    /**
     * Handle task action clicks
     */
    handleTaskAction(e) {
        const actionElement = e.target.closest('[data-action]');
        if (!actionElement) return;
        
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;
        
        const taskId = taskElement.dataset.taskId;
        const action = actionElement.dataset.action;
        
        this.vibrate([30]);
        
        switch (action) {
            case 'toggle':
                this.toggleTaskComplete(taskId);
                break;
            case 'edit':
                this.openTaskModal(taskId);
                break;
            case 'duplicate':
                this.duplicateTask(taskId);
                break;
            case 'delete':
                this.openDeleteModal(taskId);
                break;
        }
    }

    /**
     * Open task modal for create/edit
     */
    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        
        if (taskId) {
            // Edit mode
            const task = this.storage.getTask(taskId);
            if (!task) return;
            
            this.modalTitle.textContent = 'Editar Tarefa';
            this.taskIdField.value = task.id;
            this.titleField.value = task.title;
            this.descriptionField.value = task.description || '';
            this.dateField.value = task.date || '';
            this.timeField.value = task.time || '';
            this.priorityField.value = task.priority;
            this.categoryField.value = task.category;
            
            // Sync priority selector
            this.priorityOptions.forEach(input => {
                input.checked = input.value === task.priority;
            });
            
            // Sync category selector
            this.categoryOptions.forEach(input => {
                input.checked = input.value === task.category;
            });
            
            // Show advanced options when editing
            if (!this.advancedOptionsVisible) {
                this.toggleAdvancedOptions();
            }
        } else {
            // Create mode
            this.modalTitle.textContent = 'Nova Tarefa';
            this.taskForm.reset();
            this.setDefaultDate();
            
            // Reset selectors
            this.priorityOptions.forEach(input => {
                input.checked = input.value === 'medium';
            });
            this.categoryOptions.forEach(input => {
                input.checked = input.value === 'work';
            });
            
            // Reset quick date buttons
            this.quickDateBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.date === 'today');
            });
            
            // Hide advanced options for new tasks
            if (this.advancedOptionsVisible) {
                this.toggleAdvancedOptions();
            }
        }
        
        this.taskModal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Focus title field after animation
        setTimeout(() => this.titleField.focus(), 300);
    }

    /**
     * Close task modal
     */
    closeTaskModal() {
        this.taskModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.editingTaskId = null;
        this.taskForm.reset();
    }

    /**
     * Handle form submission
     */
    handleFormSubmit(e) {
        e.preventDefault();
        
        const title = this.titleField.value.trim();
        if (!title) {
            this.showToast('Por favor, insira um título para a tarefa', 'error');
            this.titleField.focus();
            return;
        }
        
        // Get values from radio selectors or hidden selects
        let priority = this.priorityField.value;
        let category = this.categoryField.value;
        
        // Check radio buttons if advanced options are visible
        if (this.advancedOptionsVisible) {
            const checkedPriority = document.querySelector('.priority-option input:checked');
            const checkedCategory = document.querySelector('.category-option input:checked');
            if (checkedPriority) priority = checkedPriority.value;
            if (checkedCategory) category = checkedCategory.value;
        }
        
        const taskData = {
            title,
            description: this.descriptionField.value.trim(),
            date: this.dateField.value,
            time: this.timeField.value,
            priority,
            category
        };
        
        if (this.editingTaskId) {
            // Update existing task
            this.storage.updateTask(this.editingTaskId, taskData);
            this.showToast('Tarefa atualizada! ✓', 'success');
        } else {
            // Create new task
            const newTask = this.storage.addTask(taskData);
            
            // Schedule push notification
            if (window.pushNotifications) {
                window.pushNotifications.scheduleTaskNotification(newTask);
            }
            
            this.showToast('Tarefa criada! ✓', 'success');
        }
        
        this.vibrate([50, 30, 50]);
        
        this.tasks = this.storage.getTasks();
        this.render();
        this.updateStatistics();
        this.updateBadge();
        this.updateMobileStats();
        this.closeTaskModal();
    }

    /**
     * Toggle task completion
     */
    toggleTaskComplete(taskId) {
        const task = this.storage.toggleComplete(taskId);
        if (!task) return;
        
        this.tasks = this.storage.getTasks();
        this.render();
        this.updateStatistics();
        this.updateBadge();
        this.updateMobileStats();
        
        if (task.completed) {
            this.showToast('Tarefa concluída! 🎉', 'success');
            this.notifications.clearTaskNotifications(taskId);
            if (window.pushNotifications) {
                window.pushNotifications.clearTaskNotifications(taskId);
            }
        } else {
            this.showToast('Tarefa reaberta', 'info');
        }
    }

    /**
     * Duplicate a task
     */
    duplicateTask(taskId) {
        const newTask = this.storage.duplicateTask(taskId);
        if (!newTask) return;
        
        this.tasks = this.storage.getTasks();
        this.render();
        this.updateStatistics();
        this.updateBadge();
        this.updateMobileStats();
        this.showToast('Tarefa duplicada!', 'success');
    }

    /**
     * Open delete confirmation modal
     */
    openDeleteModal(taskId) {
        this.deletingTaskId = taskId;
        this.deleteModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        this.deleteModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.deletingTaskId = null;
    }

    /**
     * Confirm and execute delete
     */
    confirmDelete() {
        if (!this.deletingTaskId) return;
        
        this.storage.deleteTask(this.deletingTaskId);
        this.notifications.clearTaskNotifications(this.deletingTaskId);
        if (window.pushNotifications) {
            window.pushNotifications.clearTaskNotifications(this.deletingTaskId);
        }
        
        this.tasks = this.storage.getTasks();
        this.render();
        this.updateStatistics();
        this.updateBadge();
        this.updateMobileStats();
        this.closeDeleteModal();
        this.showToast('Tarefa excluída', 'success');
        this.vibrate([50]);
    }

    /**
     * Set view mode
     */
    setView(view) {
        this.currentView = view;
        
        if (this.listViewBtn) {
            this.listViewBtn.classList.toggle('active', view === 'list');
        }
        if (this.cardViewBtn) {
            this.cardViewBtn.classList.toggle('active', view === 'card');
        }
        
        this.tasksContainer.classList.remove('list-view', 'card-view');
        this.tasksContainer.classList.add(`${view}-view`);
        
        // Save preference
        const settings = this.storage.getSettings();
        settings.viewMode = view;
        this.storage.saveSettings(settings);
        
        this.render();
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const stats = this.storage.getStatistics();
        
        if (this.totalTasksEl) this.totalTasksEl.textContent = stats.total;
        if (this.completedTasksEl) this.completedTasksEl.textContent = stats.completed;
        if (this.pendingTasksEl) this.pendingTasksEl.textContent = stats.pending;
        if (this.overdueTasksEl) this.overdueTasksEl.textContent = stats.overdue;
        if (this.completionRateEl) this.completionRateEl.textContent = `${stats.completionRate}%`;
        if (this.progressFillEl) this.progressFillEl.style.width = `${stats.completionRate}%`;
    }

    /**
     * Update mobile statistics
     */
    updateMobileStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.tasks.filter(t => t.date === today && !t.completed);
        const overdueTasks = this.tasks.filter(t => this.isOverdue(t) && !t.completed);
        const pendingTasks = this.tasks.filter(t => !t.completed);
        const completedTasks = this.tasks.filter(t => t.completed);
        
        if (this.todayTasksCountEl) this.todayTasksCountEl.textContent = todayTasks.length;
        if (this.pendingTasksCountEl) this.pendingTasksCountEl.textContent = pendingTasks.length;
        if (this.completedTasksCountEl) this.completedTasksCountEl.textContent = completedTasks.length;
        if (this.overdueTasksCountEl) this.overdueTasksCountEl.textContent = overdueTasks.length;
        
        // Update app badge
        if (window.pushNotifications) {
            window.pushNotifications.updateBadge(pendingTasks.length);
        }
    }

    /**
     * Update pending badge
     */
    updateBadge() {
        const pending = this.tasks.filter(t => !t.completed).length;
        if (this.badgeCountEl) {
            this.badgeCountEl.textContent = pending;
            this.badgeCountEl.style.display = pending > 0 ? 'block' : 'none';
        }
    }

    /**
     * Update today badge in tab navigation
     */
    updateTodayBadge() {
        const today = new Date().toISOString().split('T')[0];
        const todayPending = this.tasks.filter(t => t.date === today && !t.completed).length;
        
        if (this.todayBadge) {
            this.todayBadge.textContent = todayPending;
            this.todayBadge.style.display = todayPending > 0 ? 'block' : 'none';
        }
    }

    /**
     * Toggle dark/light theme
     */
    toggleTheme() {
        const settings = this.storage.getSettings();
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        settings.theme = newTheme;
        this.storage.saveSettings(settings);
        this.vibrate([30]);
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        if (this.toggleDarkModeBtn) {
            const icon = this.toggleDarkModeBtn.querySelector('.icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        }
        
        // Update theme color meta tag
        const themeColor = theme === 'dark' ? '#0f172a' : '#6366f1';
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeColor);
        }
    }

    /**
     * Export tasks to JSON file
     */
    exportTasks() {
        const jsonData = this.storage.exportTasks();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tarefas_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Tarefas exportadas! 📤', 'success');
    }

    /**
     * Handle import file selection
     */
    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = this.storage.importTasks(event.target.result);
            
            if (result.success) {
                this.tasks = this.storage.getTasks();
                this.render();
                this.updateStatistics();
                this.updateBadge();
                this.updateMobileStats();
                this.showToast(result.message, 'success');
            } else {
                this.showToast(result.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showToast('Erro ao ler o arquivo', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        e.target.value = '';
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            if (this.taskModal.classList.contains('active')) {
                this.closeTaskModal();
            } else if (this.deleteModal.classList.contains('active')) {
                this.closeDeleteModal();
            } else if (this.menuOverlay && this.menuOverlay.classList.contains('active')) {
                this.closeMenu();
            }
        }
        
        // N to create new task (when not in modal)
        if (e.key === 'n' && !this.isModalOpen() && !this.isInputFocused()) {
            e.preventDefault();
            this.openTaskModal();
        }
        
        // / to focus search
        if (e.key === '/' && !this.isModalOpen() && !this.isInputFocused()) {
            e.preventDefault();
            const searchEl = this.mobileSearchInput || this.searchInput;
            if (searchEl) searchEl.focus();
        }
    }

    /**
     * Check if any modal is open
     */
    isModalOpen() {
        return this.taskModal.classList.contains('active') || 
               this.deleteModal.classList.contains('active') ||
               (this.menuOverlay && this.menuOverlay.classList.contains('active'));
    }

    /**
     * Check if an input is focused
     */
    isInputFocused() {
        const activeEl = document.activeElement;
        return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    }

    /**
     * Check if task is overdue
     */
    isOverdue(task) {
        if (task.completed || !task.date) return false;
        
        const taskDateTime = new Date(`${task.date}T${task.time || '23:59'}`);
        return taskDateTime < new Date();
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        
        if (dateOnly.getTime() === today.getTime()) {
            return 'Hoje';
        } else if (dateOnly.getTime() === tomorrow.getTime()) {
            return 'Amanhã';
        } else if (dateOnly < today) {
            return 'Atrasada';
        } else {
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short'
            });
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
        this.toastContainer.appendChild(toast);
        
        // Remove toast after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Debounce function for search
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.taskApp = new TaskScheduler();
});
