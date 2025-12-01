/**
 * TaskScheduler Pro - Professional Task Management System
 * Enterprise-grade task and event management with Mobile-First Design
 */

class TaskSchedulerPro {
    constructor() {
        this.tasks = [];
        this.currentView = 'today';
        this.currentCategory = null;
        this.currentSort = 'priority';
        this.editingTaskId = null;
        this.calendarDate = new Date();
        
        // Mobile specific properties
        this.isMobile = window.matchMedia('(max-width: 768px)').matches;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isPulling = false;
        this.swipingTaskId = null;

        this.init();
    }

    // ==================== INITIALIZATION ====================
    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.setupMobileEventListeners();
        this.setupTheme();
        this.renderCalendar();
        this.renderTasks();
        this.updateAllStats();
        this.setDefaultDate();
        this.startAutoRefresh();
        this.detectMobileDevice();

        // Initialize notifications
        if (window.NotificationManager) {
            window.NotificationManager.init();
        }

        console.log('✓ TaskScheduler Pro initialized');
        console.log('✓ Mobile mode:', this.isMobile);
    }

    // ==================== MOBILE DEVICE DETECTION ====================
    detectMobileDevice() {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleChange = (e) => {
            this.isMobile = e.matches;
            document.body.classList.toggle('is-mobile', this.isMobile);
        };
        
        handleChange(mediaQuery);
        mediaQuery.addEventListener('change', handleChange);
    }

    // ==================== MOBILE EVENT LISTENERS ====================
    setupMobileEventListeners() {
        // Mobile Menu Button (Hamburger)
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileSidebarOverlay');

        if (mobileMenuBtn && sidebar && overlay) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });

            overlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Mobile Search
        const mobileSearchBtn = document.getElementById('mobileSearchBtn');
        const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
        const mobileSearchBack = document.getElementById('mobileSearchBack');
        const mobileSearchInput = document.getElementById('mobileSearchInput');

        if (mobileSearchBtn && mobileSearchOverlay) {
            mobileSearchBtn.addEventListener('click', () => {
                this.openMobileSearch();
            });

            mobileSearchBack?.addEventListener('click', () => {
                this.closeMobileSearch();
            });

            mobileSearchInput?.addEventListener('input', (e) => {
                this.handleMobileSearch(e.target.value);
            });
        }

        // Bottom Navigation
        document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
                this.updateBottomNavActive(item.dataset.view);
            });
        });

        document.getElementById('bottomNavAdd')?.addEventListener('click', () => {
            this.openTaskModal();
            this.triggerHapticFeedback();
        });

        document.getElementById('bottomNavMenu')?.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        // Pull to Refresh
        this.setupPullToRefresh();

        // Swipe Gestures for Tasks
        this.setupSwipeGestures();

        // Bottom Sheet Drag
        this.setupBottomSheetDrag();

        // Handle viewport resize
        window.addEventListener('resize', () => {
            this.isMobile = window.matchMedia('(max-width: 768px)').matches;
        });
    }

    // ==================== MOBILE SIDEBAR ====================
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileSidebarOverlay');
        const menuBtn = document.getElementById('mobileMenuBtn');

        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('active');
        menuBtn?.classList.toggle('active');
        
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = sidebar?.classList.contains('open') ? 'hidden' : '';
        
        this.triggerHapticFeedback();
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileSidebarOverlay');
        const menuBtn = document.getElementById('mobileMenuBtn');

        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
        menuBtn?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== MOBILE SEARCH ====================
    openMobileSearch() {
        const overlay = document.getElementById('mobileSearchOverlay');
        const input = document.getElementById('mobileSearchInput');
        
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            input?.focus();
        }, 100);
    }

    closeMobileSearch() {
        const overlay = document.getElementById('mobileSearchOverlay');
        const input = document.getElementById('mobileSearchInput');
        
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
        
        if (input) input.value = '';
        this.renderTasks();
    }

    handleMobileSearch(query) {
        const resultsContainer = document.getElementById('mobileSearchResults');
        if (!resultsContainer) return;

        if (!query.trim()) {
            resultsContainer.innerHTML = '<p class="mobile-search-hint">Digite para buscar tarefas...</p>';
            return;
        }

        const searchLower = query.toLowerCase();
        const results = this.tasks.filter(task =>
            task.title.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower)
        );

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="mobile-search-hint">Nenhuma tarefa encontrada</p>';
            return;
        }

        // Clear container and add results with proper event listeners
        resultsContainer.innerHTML = '';
        results.forEach(task => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'mobile-search-result';
            resultDiv.innerHTML = `
                <div class="mobile-search-result-title">${this.escapeHtml(task.title)}</div>
                <div class="mobile-search-result-meta">${this.escapeHtml(this.formatDate(task.date))}</div>
            `;
            resultDiv.addEventListener('click', () => {
                this.openTaskModal(task.id);
                this.closeMobileSearch();
            });
            resultsContainer.appendChild(resultDiv);
        });
    }

    // ==================== BOTTOM NAVIGATION ====================
    updateBottomNavActive(view) {
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`.bottom-nav-item[data-view="${view}"]`);
        activeItem?.classList.add('active');
    }

    updateBottomNavBadges() {
        const todayCount = this.tasks.filter(task => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const taskDate = this.parseLocalDate(task.date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime() && !task.completed;
        }).length;

        const badge = document.getElementById('bottomNavTodayBadge');
        if (badge) {
            badge.textContent = todayCount > 0 ? todayCount : '';
        }
    }

    // ==================== PULL TO REFRESH ====================
    setupPullToRefresh() {
        if (!this.isMobile) return;

        const mainContent = document.querySelector('.main-content');
        const pullIndicator = document.getElementById('pullToRefresh');
        
        if (!mainContent || !pullIndicator) return;

        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        mainContent.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        mainContent.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0 && diff < 100 && window.scrollY === 0) {
                pullIndicator.style.display = 'flex';
                pullIndicator.style.transform = `translateY(${Math.min(diff - 60, 0)}px)`;
            }
        }, { passive: true });

        mainContent.addEventListener('touchend', () => {
            if (currentY - startY > 60 && window.scrollY === 0) {
                pullIndicator.classList.add('active');
                this.triggerHapticFeedback();
                
                // Simulate refresh
                setTimeout(() => {
                    this.renderTasks();
                    this.updateAllStats();
                    pullIndicator.classList.remove('active');
                    pullIndicator.style.display = 'none';
                    pullIndicator.style.transform = '';
                    this.showToast('Atualizado!', 'success');
                }, 800);
            } else {
                pullIndicator.style.display = 'none';
                pullIndicator.style.transform = '';
            }
            
            isPulling = false;
            startY = 0;
            currentY = 0;
        });
    }

    // ==================== SWIPE GESTURES ====================
    setupSwipeGestures() {
        // Swipe gestures will be handled per task card after rendering
    }

    addSwipeToCard(cardElement, taskId) {
        if (!this.isMobile) return;

        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        cardElement.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
            this.swipingTaskId = taskId;
        }, { passive: true });

        cardElement.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;

            // Only allow horizontal swipe if not scrolling
            if (Math.abs(diff) > 10) {
                cardElement.style.transform = `translateX(${diff * 0.3}px)`;
                cardElement.classList.add('swiping');
            }
        }, { passive: true });

        cardElement.addEventListener('touchend', () => {
            const diff = currentX - startX;

            if (diff > 80) {
                // Swipe right - complete task
                this.toggleTaskComplete(taskId);
                this.triggerHapticFeedback();
            } else if (diff < -80) {
                // Swipe left - delete task
                this.deleteTaskPrompt(taskId);
                this.triggerHapticFeedback();
            }

            cardElement.style.transform = '';
            cardElement.classList.remove('swiping');
            isSwiping = false;
            startX = 0;
            currentX = 0;
            this.swipingTaskId = null;
        });
    }

    // ==================== BOTTOM SHEET DRAG ====================
    setupBottomSheetDrag() {
        const modals = document.querySelectorAll('.modal.bottom-sheet, .modal.action-sheet');
        
        modals.forEach(modal => {
            const handle = modal.querySelector('.bottom-sheet-handle');
            if (!handle) return;

            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            handle.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
            }, { passive: true });

            modal.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                
                currentY = e.touches[0].clientY;
                const diff = currentY - startY;

                if (diff > 0) {
                    modal.style.transform = `translateY(${diff}px)`;
                }
            }, { passive: true });

            modal.addEventListener('touchend', () => {
                const diff = currentY - startY;

                if (diff > 100) {
                    // Close modal
                    const overlay = modal.closest('.modal-overlay');
                    overlay?.classList.remove('active');
                    this.closeTaskModal();
                    this.closeDeleteModal();
                }

                modal.style.transform = '';
                isDragging = false;
                startY = 0;
                currentY = 0;
            });
        });
    }

    // ==================== HAPTIC FEEDBACK ====================
    triggerHapticFeedback() {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
        } catch (error) {
            // Vibrate API may fail on some devices - fail silently
            console.debug('Haptic feedback not available:', error);
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Header Actions
        document.getElementById('quickAddBtn')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('fabBtn')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openTaskModal());

        document.getElementById('headerSearch')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('notificationBtn')?.addEventListener('click', () => this.handleNotificationClick());

        // Navigation
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });

        document.querySelectorAll('.nav-item[data-category]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByCategory(item.dataset.category);
            });
        });

        // Filters & Views
        document.getElementById('priorityFilter')?.addEventListener('change', (e) => {
            this.filterByPriority(e.target.value);
        });

        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTasks();
        });

        document.getElementById('listViewBtn')?.addEventListener('click', () => this.setView('list'));
        document.getElementById('gridViewBtn')?.addEventListener('click', () => this.setView('grid'));

        // Task Modal
        document.getElementById('closeTaskModal')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelTask')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('taskModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeTaskModal();
        });

        document.getElementById('taskForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Quick Date Buttons
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickDate(btn));
        });

        // Advanced Options Toggle - NA FUNÇÃO setupEventListeners()
        const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
        if (toggleAdvancedBtn) {
            toggleAdvancedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const options = document.getElementById('advancedOptions');
                const icon = document.getElementById('toggleIcon');
                const btn = e.currentTarget;

                if (options && icon) {
                    options.classList.toggle('hidden');
                    btn.classList.toggle('active');
                    icon.textContent = options.classList.contains('hidden') ? '▼' : '▲';

                    console.log('Advanced options toggled:', !options.classList.contains('hidden'));
                }
            });
        }

        // Delete Modal
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());
        document.getElementById('deleteModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });

        // Calendar Navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth')?.addEventListener('click', () => this.changeMonth(1));
        document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());

        // Quick Actions
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportTasks());
        document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importTasks(e.target.files[0]));
        document.getElementById('enableNotifications')?.addEventListener('click', () => this.enableNotifications());
        document.getElementById('clearCompleted')?.addEventListener('click', () => this.clearCompletedTasks());

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // ==================== STORAGE ====================
    loadTasks() {
        try {
            const saved = localStorage.getItem('taskscheduler_pro_tasks');
            this.tasks = saved ? JSON.parse(saved) : this.getDefaultTasks();
            console.log(`✓ Loaded ${this.tasks.length} tasks`);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = this.getDefaultTasks();
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('taskscheduler_pro_tasks', JSON.stringify(this.tasks));
            console.log(`✓ Saved ${this.tasks.length} tasks`);
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showToast('Erro ao salvar tarefas', 'error');
        }
    }

    getDefaultTasks() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return [
            {
                id: Date.now().toString(),
                title: 'Bem-vindo ao TaskScheduler Pro! ',
                description: 'Este é um exemplo de tarefa.  Clique para editar ou marcar como concluída.',
                date: this.formatDateInput(today),
                time: '09:00',
                priority: 'high',
                category: 'personal',
                completed: false,
                reminder: '30',
                createdAt: new Date().toISOString()
            },
            {
                id: (Date.now() + 1).toString(),
                title: 'Organizar tarefas da semana',
                description: 'Revisar e planejar todas as atividades importantes.',
                date: this.formatDateInput(tomorrow),
                time: '10:00',
                priority: 'medium',
                category: 'work',
                completed: false,
                reminder: '60',
                createdAt: new Date().toISOString()
            }
        ];
    }

    // ==================== THEME ====================
    setupTheme() {
        const saved = localStorage.getItem('taskscheduler_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskscheduler_theme', newTheme);
        this.updateThemeIcon(newTheme);
        this.showToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
    }

    updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // ==================== VIEWS ====================
    switchView(view) {
        this.currentView = view;
        this.currentCategory = null;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

        // Update page header
        const headers = {
            today: { icon: '📅', title: 'Hoje', subtitle: 'Suas tarefas para hoje' },
            week: { icon: '📆', title: 'Esta Semana', subtitle: 'Planejamento semanal' },
            upcoming: { icon: '🔜', title: 'Próximas', subtitle: 'Tarefas futuras' },
            all: { icon: '📋', title: 'Todas as Tarefas', subtitle: 'Visão completa' },
            completed: { icon: '✅', title: 'Concluídas', subtitle: 'Tarefas finalizadas' }
        };

        const header = headers[view];
        document.getElementById('pageIcon').textContent = header.icon;
        document.getElementById('pageTitle').textContent = header.title;
        document.getElementById('pageSubtitle').textContent = header.subtitle;

        // Update bottom navigation active state (mobile)
        this.updateBottomNavActive(view);
        
        // Close mobile sidebar if open
        this.closeMobileSidebar();

        this.renderTasks();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.currentView = null;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-category="${category}"]`)?.classList.add('active');

        // Close mobile sidebar if open
        this.closeMobileSidebar();

        // Update page header
        const categories = {
            work: { icon: '💼', title: 'Trabalho', subtitle: 'Tarefas profissionais' },
            personal: { icon: '👤', title: 'Pessoal', subtitle: 'Atividades pessoais' },
            study: { icon: '📚', title: 'Estudos', subtitle: 'Aprendizado e educação' },
            health: { icon: '❤️', title: 'Saúde', subtitle: 'Bem-estar e saúde' },
            shopping: { icon: '🛒', title: 'Compras', subtitle: 'Lista de compras' }
        };

        const cat = categories[category];
        document.getElementById('pageIcon').textContent = cat.icon;
        document.getElementById('pageTitle').textContent = cat.title;
        document.getElementById('pageSubtitle').textContent = cat.subtitle;

        this.renderTasks();
    }

    filterByPriority(priority) {
        // Implement priority filtering
        this.renderTasks();
    }

    setView(viewType) {
        const container = document.getElementById('tasksContainer');
        const listBtn = document.getElementById('listViewBtn');
        const gridBtn = document.getElementById('gridViewBtn');

        if (viewType === 'grid') {
            container.classList.add('grid-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            container.classList.remove('grid-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
    }

    // ==================== TASK RENDERING ====================
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');

        let filtered = this.getFilteredTasks();
        filtered = this.sortTasks(filtered);

        if (filtered.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        const grouped = this.groupTasks(filtered);
        let html = '';

        Object.entries(grouped).forEach(([groupName, tasks]) => {
            html += this.renderTaskGroup(groupName, tasks);
        });

        container.innerHTML = html;

        // Add swipe gestures to cards on mobile
        if (this.isMobile) {
            document.querySelectorAll('.task-card').forEach(card => {
                const taskId = card.dataset.taskId;
                if (taskId) {
                    this.addSwipeToCard(card, taskId);
                }
            });
        }
    }

    getFilteredTasks() {
        let filtered = [... this.tasks];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter by view
        if (this.currentView === 'today') {
            filtered = filtered.filter(task => {
                const taskDate = this.parseLocalDate(task.date);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime();
            });
        } else if (this.currentView === 'week') {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            weekEnd.setHours(23, 59, 59, 999);

            filtered = filtered.filter(task => {
                const taskDate = this.parseLocalDate(task.date);
                return taskDate >= today && taskDate <= weekEnd;
            });
        } else if (this.currentView === 'upcoming') {
            filtered = filtered.filter(task => {
                const taskDate = this.parseLocalDate(task.date);
                return taskDate > today && !task.completed;
            });
        } else if (this.currentView === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        // Filter by category
        if (this.currentCategory) {
            filtered = filtered.filter(task => task.category === this.currentCategory);
        }

        // Filter by priority
        const priorityFilter = document.getElementById('priorityFilter')?.value;
        if (priorityFilter && priorityFilter !== 'all') {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }

        return filtered;
    }

    sortTasks(tasks) {
        const sortBy = this.currentSort;

        return tasks.sort((a, b) => {
            if (sortBy === 'priority') {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return new Date(a.date) - new Date(b.date);
            } else if (sortBy === 'date') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'category') {
                return a.category.localeCompare(b.category);
            }
            return 0;
        });
    }

    groupTasks(tasks) {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            const taskDate = this.parseLocalDate(task.date);
            taskDate.setHours(0, 0, 0, 0);

            let groupKey;
            const diffDays = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                groupKey = '⚠️ Atrasadas';
            } else if (diffDays === 0) {
                groupKey = '📅 Hoje';
            } else if (diffDays === 1) {
                groupKey = '📆 Amanhã';
            } else if (diffDays <= 7) {
                groupKey = `📋 ${this.formatDate(task.date)}`;
            } else {
                groupKey = `🗓️ ${this.formatDate(task.date)}`;
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(task);
        });

        // Sort groups
        const sortedGroups = {};
        const order = ['⚠️ Atrasadas', '📅 Hoje', '📆 Amanhã'];

        order.forEach(key => {
            if (groups[key]) sortedGroups[key] = groups[key];
        });

        Object.keys(groups).sort().forEach(key => {
            if (!order.includes(key)) {
                sortedGroups[key] = groups[key];
            }
        });

        return sortedGroups;
    }

    renderTaskGroup(groupName, tasks) {
        return `
            <div class="task-group">
                <div class="task-group-header">
                    <h3 class="task-group-title">
                        <span class="task-group-icon">${groupName.split(' ')[0]}</span>
                        <span>${groupName.split(' ').slice(1).join(' ')}</span>
                    </h3>
                    <span class="task-group-count">${tasks.length}</span>
                </div>
                <div class="task-list">
                    ${tasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
            </div>
        `;
    }

    renderTaskCard(task) {
        const isOverdue = this.isTaskOverdue(task);
        const categoryIcons = {
            work: '💼', personal: '👤', study: '📚',
            health: '❤️', shopping: '🛒', other: '📌'
        };
        const priorityLabels = {
            high: '🔴 Alta', medium: '🟡 Média', low: '🟢 Baixa'
        };

        // Garantir que completed é boolean
        const isCompleted = task.completed === true;

        return `
        <div class="task-card priority-${task.priority} ${isCompleted ? 'completed' : ''} ${isOverdue && !isCompleted ? 'overdue' : ''}" 
             data-task-id="${task.id}">
            <div class="task-card-inner">
                <div class="task-checkbox-wrapper">
                    <button type="button" 
                            class="task-checkbox ${isCompleted ? 'checked' : ''}" 
                            onclick="event.stopPropagation(); app.toggleTaskComplete('${task.id}');"
                            title="${isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}"
                            aria-label="${isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}">
                        ${isCompleted ? '<span class="check-icon">✓</span>' : ''}
                    </button>
                </div>
                
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    
                    <div class="task-meta">
                        ${isCompleted ? '<span class="task-badge completed-badge">✓ Concluída</span>' : ''}
                        <span class="task-badge">
                            🕐 ${this.formatDate(task.date)}${task.time ? ` às ${task.time}` : ''}
                        </span>
                        <span class="task-badge priority-${task.priority}">
                            ${priorityLabels[task.priority]}
                        </span>
                        <span class="task-badge category">
                            ${categoryIcons[task.category]} ${this.getCategoryName(task.category)}
                        </span>
                        ${isOverdue && !isCompleted ? '<span class="task-badge overdue">⚠️ Atrasada</span>' : ''}
                        ${task.reminder && task.reminder !== 'none' ? '<span class="task-badge">🔔 Lembrete</span>' : ''}
                    </div>
                </div>
                
                <div class="task-actions">
                    <button type="button" class="task-action-btn" onclick="event.stopPropagation(); app.openTaskModal('${task.id}');" title="Editar tarefa">
                        <span>✏️</span>
                    </button>
                    <button type="button" class="task-action-btn delete" onclick="event.stopPropagation(); app.deleteTaskPrompt('${task.id}');" title="Excluir tarefa">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    }

    // ==================== TASK OPERATIONS ====================
    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const saveText = document.getElementById('saveTaskText');
        const form = document.getElementById('taskForm');

        form.reset();
        document.getElementById('advancedOptions').classList.add('hidden');
        document.getElementById('toggleIcon').textContent = '▼';

        // Reset quick date buttons - FIX: Remove espaço antes do ponto
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const todayBtn = document.querySelector('.quick-date-btn[data-date="today"]');
        if (todayBtn) todayBtn.classList.add('active');

        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                title.textContent = 'Editar Tarefa';
                saveText.textContent = 'Salvar Alterações';

                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskDate').value = task.date;
                document.getElementById('taskTime').value = task.time || '';
                document.getElementById('taskReminder').value = task.reminder || 'none';

                document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;
                document.querySelector(`input[name="category"][value="${task.category}"]`).checked = true;

                document.getElementById('advancedOptions').classList.remove('hidden');
                document.getElementById('toggleIcon').textContent = '▲';
            }
        } else {
            title.textContent = 'Nova Tarefa';
            saveText.textContent = 'Criar Tarefa';
            document.querySelector('input[name="priority"][value="medium"]').checked = true;
            document.querySelector('input[name="category"][value="work"]').checked = true;
            this.setDefaultDate();
        }

        modal.classList.add('active');
        setTimeout(() => document.getElementById('taskTitle')?.focus(), 100);
    }

    closeTaskModal() {
        document.getElementById('taskModal')?.classList.remove('active');
        this.editingTaskId = null;
    }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const date = document.getElementById('taskDate').value;
        const time = document.getElementById('taskTime').value;
        const priority = document.querySelector('input[name="priority"]:checked').value;
        const category = document.querySelector('input[name="category"]:checked').value;
        const reminder = document.getElementById('taskReminder').value;
        const taskId = document.getElementById('taskId').value;

        if (!title) {
            this.showToast('Por favor, insira um título para a tarefa', 'error');
            return;
        }

        if (!date) {
            this.showToast('Por favor, selecione uma data', 'error');
            return;
        }

        const task = {
            id: taskId || Date.now().toString(),
            title,
            description,
            date,
            time,
            priority,
            category,
            reminder,
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (taskId) {
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                task.completed = this.tasks[index].completed;
                task.createdAt = this.tasks[index].createdAt;
                this.tasks[index] = task;
                this.showToast('Tarefa atualizada com sucesso!  ✓', 'success');
            }
        } else {
            this.tasks.push(task);
            this.showToast('Tarefa criada com sucesso!  🎉', 'success');

            // Schedule notification
            if (window.NotificationManager && reminder !== 'none') {
                window.NotificationManager.scheduleNotification(task);
            }
        }

        this.saveTasks();
        this.renderTasks();
        this.updateAllStats();
        this.renderCalendar();
        this.renderUpcomingEvents();
        this.closeTaskModal();
    }

    toggleTaskComplete(taskId) {
        console.log('Toggling task:', taskId);

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }

        // Toggle completed state
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;

        console.log('Task completed:', task.completed);

        // Save immediately
        this.saveTasks();

        // Update the card in DOM
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (card) {
            const checkbox = card.querySelector('.task-checkbox');

            if (task.completed) {
                checkbox.classList.add('checked');
                checkbox.innerHTML = '<span class="check-icon">✓</span>';
                card.classList.add('completed');
            } else {
                checkbox.classList.remove('checked');
                checkbox.innerHTML = '';
                card.classList.remove('completed');
            }
        }

        // Update stats
        this.updateAllStats();

        // Show toast
        const message = task.completed ?
            `✓ "${task.title}" concluída! ` :
            `Tarefa "${task.title}" reativada`;

        this.showToast(message, task.completed ? 'success' : 'info');

        // Re-render to update grouping
        setTimeout(() => {
            this.renderTasks();
        }, 300);
    }

    deleteTaskPrompt(taskId) {
        this.editingTaskId = taskId;
        document.getElementById('deleteModal')?.classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal')?.classList.remove('active');
        this.editingTaskId = null;
    }

    confirmDelete() {
        if (this.editingTaskId) {
            const task = this.tasks.find(t => t.id === this.editingTaskId);
            this.tasks = this.tasks.filter(t => t.id !== this.editingTaskId);

            this.saveTasks();
            this.renderTasks();
            this.updateAllStats();
            this.renderCalendar();
            this.closeDeleteModal();

            this.showToast(`Tarefa "${task?.title}" excluída`, 'info');
        }
    }

    // ==================== STATISTICS ====================
    updateAllStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = this.tasks.filter(t => !t.completed).length;
        const overdue = this.tasks.filter(t => this.isTaskOverdue(t)).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTasks = this.tasks.filter(task => {
            const taskDate = this.parseLocalDate(task.date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime();
        });

        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);

        const weekTasks = this.tasks.filter(task => {
            const taskDate = this.parseLocalDate(task.date);
            return taskDate >= today && taskDate <= weekEnd;
        });

        const upcomingTasks = this.tasks.filter(task => {
            const taskDate = this.parseLocalDate(task.date);
            return taskDate > today && !task.completed;
        });

        // Update stats
        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('overdueTasks').textContent = overdue;

        // Update counts
        document.getElementById('todayCount').textContent = todayTasks.length;
        document.getElementById('weekCount').textContent = weekTasks.length;
        document.getElementById('upcomingCount').textContent = upcomingTasks.length;
        document.getElementById('allCount').textContent = total;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('notificationBadge').textContent = pending;

        // Update category counts
        ['work', 'personal', 'study', 'health', 'shopping'].forEach(cat => {
            const count = this.tasks.filter(t => t.category === cat && !t.completed).length;
            document.getElementById(`${cat}Count`).textContent = count;
        });

        // Update progress
        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        document.getElementById('progressValue').textContent = `${progressPercent}%`;

        const circle = document.getElementById('progressCircle');
        if (circle) {
            const radius = 52;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (progressPercent / 100) * circumference;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }

        // Update bottom nav badges (mobile)
        this.updateBottomNavBadges();
    }

    // ==================== CALENDAR ====================
    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        // Update month label
        const monthLabel = document.getElementById('calendarMonth');
        if (monthLabel) {
            monthLabel.textContent = this.calendarDate.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
            });
        }

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const daysInPrevMonth = prevLastDay.getDate();

        let html = '';

        // Day labels
        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayLabels.forEach(label => {
            html += `<div class="calendar-day-label">${label}</div>`;
        });

        // Previous month days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        // Current month days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0);

            const isToday = currentDate.getTime() === today.getTime();
            const hasTasks = this.tasks.some(task => {
                const taskDate = this.parseLocalDate(task.date);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === currentDate.getTime();
            });

            const classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (hasTasks) classes.push('has-tasks');

            html += `<div class="${classes.join(' ')}" data-date="${this.formatDateInput(currentDate)}">${day}</div>`;
        }

        // Next month days
        const remainingDays = 42 - (firstDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        grid.innerHTML = html;

        // Add click events to calendar days
        grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const date = dayEl.dataset.date;
                if (date) {
                    this.filterByDate(date);
                }
            });
        });
    }


    changeMonth(delta) {
        this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
        this.renderCalendar();
    }

    goToToday() {
        this.calendarDate = new Date();
        this.renderCalendar();
        this.switchView('today');
    }

    filterByDate(date) {
        // Implement date filtering
        console.log('Filter by date:', date);
    }

    // ==================== UPCOMING EVENTS ====================
    renderUpcomingEvents() {
        const container = document.getElementById('upcomingEvents');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = this.tasks
            .filter(task => {
                const taskDate = this.parseLocalDate(task.date);
                return taskDate >= today && !task.completed && task.time;
            })
            .sort((a, b) => {
                const dateA = this.parseLocalDate(a.date);
                const dateB = this.parseLocalDate(b.date);

                if (a.time && b.time) {
                    const [hoursA, minutesA] = a.time.split(':').map(Number);
                    const [hoursB, minutesB] = b.time.split(':').map(Number);
                    dateA.setHours(hoursA, minutesA);
                    dateB.setHours(hoursB, minutesB);
                }

                return dateA - dateB;
            })
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: var(--text-sm); text-align: center; padding: var(--space-4);">Nenhum evento próximo</p>';
            return;
        }

        const html = upcoming.map(task => `
        <div style="padding: var(--space-3); border-left: 3px solid var(--primary-500); background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-2); cursor: pointer;" onclick="app.openTaskModal('${task.id}')">
            <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold); margin-bottom: var(--space-1);">${this.escapeHtml(task.title)}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                ${this.formatDate(task.date)} às ${task.time}
            </div>
        </div>
    `).join('');

        container.innerHTML = html;
    }


    // ==================== SEARCH ====================
    handleSearch(query) {
        if (!query.trim()) {
            this.renderTasks();
            return;
        }

        const searchLower = query.toLowerCase();
        const results = this.tasks.filter(task =>
            task.title.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower)
        );

        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');

        if (results.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        const html = this.renderTaskGroup(`🔍 Resultados da busca (${results.length})`, results);
        container.innerHTML = html;
    }

    // ==================== QUICK ACTIONS ====================
    handleQuickDate(btn) {
        document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const dateType = btn.dataset.date;
        const date = new Date();

        if (dateType === 'tomorrow') {
            date.setDate(date.getDate() + 1);
        } else if (dateType === 'nextweek') {
            date.setDate(date.getDate() + 7);
        }

        document.getElementById('taskDate').value = this.formatDateInput(date);

        console.log('Quick date set:', dateType, this.formatDateInput(date));
    }

    setDefaultDate() {
        const today = new Date();
        document.getElementById('taskDate').value = this.formatDateInput(today);
    }

    exportTasks() {
        const data = {
            version: '3.0',
            exportDate: new Date().toISOString(),
            tasks: this.tasks
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskscheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.showToast('Tarefas exportadas com sucesso!  📤', 'success');
    }

    importTasks(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const tasks = data.tasks || data;

                if (!Array.isArray(tasks)) {
                    throw new Error('Formato inválido');
                }

                this.tasks = tasks;
                this.saveTasks();
                this.renderTasks();
                this.updateAllStats();
                this.renderCalendar();
                this.renderUpcomingEvents();

                this.showToast(`${tasks.length} tarefas importadas com sucesso! 📥`, 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Erro ao importar arquivo.  Verifique o formato.', 'error');
            }
        };
        reader.readAsText(file);
    }

    enableNotifications() {
        if (window.NotificationManager) {
            window.NotificationManager.requestPermission();
        } else {
            this.showToast('Notificações não disponíveis neste navegador', 'error');
        }
    }

    clearCompletedTasks() {
        const completedCount = this.tasks.filter(t => t.completed).length;

        if (completedCount === 0) {
            this.showToast('Nenhuma tarefa concluída para limpar', 'info');
            return;
        }

        if (confirm(`Deseja excluir ${completedCount} tarefa(s) concluída(s)?`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.renderTasks();
            this.updateAllStats();
            this.showToast(`${completedCount} tarefa(s) removida(s) 🗑️`, 'success');
        }
    }

    handleNotificationClick() {
        this.switchView('today');
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N: New task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openTaskModal();
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            this.closeTaskModal();
            this.closeDeleteModal();
        }

        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('headerSearch')?.focus();
        }
    }

    // ==================== UTILITIES ====================
    isTaskOverdue(task) {
        if (task.completed) return false;

        const now = new Date();
        const taskDate = this.parseLocalDate(task.date);

        if (task.time) {
            const [hours, minutes] = task.time.split(':');
            taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            taskDate.setHours(23, 59, 59, 999);
        }

        return taskDate < now;
    }
    // ==================== DATE UTILITIES - CORRIGIDO ====================

    formatDateInput(date) {
        // Garantir que a data seja local, não UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDate(dateStr) {
        // Parse manual para evitar timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Month is 0-indexed

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    // Função auxiliar para criar data local
    parseLocalDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    getCategoryName(category) {
        const names = {
            work: 'Trabalho',
            personal: 'Pessoal',
            study: 'Estudos',
            health: 'Saúde',
            shopping: 'Compras',
            other: 'Outros'
        };
        return names[category] || category;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startAutoRefresh() {
        // Update stats every minute
        setInterval(() => {
            this.updateAllStats();
            this.renderUpcomingEvents();
        }, 60000);
    }

    // ==================== TOAST NOTIFICATIONS ====================
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Atenção',
            info: 'Informação'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// ==================== INITIALIZE ====================
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TaskSchedulerPro();
});