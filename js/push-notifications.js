/**
 * Push Notifications Manager for Task Scheduler PWA
 * Handles push notifications, permission requests, and scheduled notifications
 */

class PushNotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.scheduledNotifications = new Map();
        this.settings = this.loadSettings();
    }

    /**
     * Load notification settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('taskScheduler_notificationSettings');
            return saved ? JSON.parse(saved) : this.getDefaultSettings();
        } catch {
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default notification settings
     */
    getDefaultSettings() {
        return {
            enabled: true,
            sound: true,
            vibration: true,
            morningReminder: true,
            morningReminderTime: '08:00',
            deadlineReminder: true,
            deadlineReminderMinutes: 30,
            overdueNotification: true
        };
    }

    /**
     * Save notification settings
     */
    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('taskScheduler_notificationSettings', JSON.stringify(this.settings));
    }

    /**
     * Initialize push notifications
     */
    async init() {
        if (!this.isSupported) {
            console.log('[PushNotifications] Not supported in this browser');
            return false;
        }

        // Check if already permitted
        if (this.permission === 'granted') {
            this.setupScheduledNotifications();
            return true;
        }

        return false;
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!this.isSupported) {
            return { granted: false, reason: 'not_supported' };
        }

        if (this.permission === 'denied') {
            return { granted: false, reason: 'denied' };
        }

        if (this.permission === 'granted') {
            return { granted: true };
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;

            if (result === 'granted') {
                this.setupScheduledNotifications();
                this.showWelcomeNotification();
                return { granted: true };
            }

            return { granted: false, reason: result };
        } catch (error) {
            console.error('[PushNotifications] Permission request failed:', error);
            return { granted: false, reason: 'error' };
        }
    }

    /**
     * Show welcome notification
     */
    showWelcomeNotification() {
        this.show('🎉 Notificações Ativadas!', {
            body: 'Você receberá lembretes das suas tarefas.',
            tag: 'welcome'
        });
    }

    /**
     * Show a notification
     */
    show(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted' || !this.settings.enabled) {
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: options.tag || `notification-${Date.now()}`,
            requireInteraction: options.requireInteraction || false,
            silent: !this.settings.sound,
            vibrate: this.settings.vibration ? [100, 50, 100] : undefined,
            data: options.data || {}
        };

        try {
            const notification = new Notification(title, { ...defaultOptions, ...options });

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (options.onClick) {
                    options.onClick();
                }
            };

            // Auto close after 8 seconds
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 8000);
            }

            // Haptic feedback if supported
            if (this.settings.vibration && 'vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }

            return notification;
        } catch (error) {
            console.error('[PushNotifications] Failed to show notification:', error);
            return null;
        }
    }

    /**
     * Schedule notification for a task
     */
    scheduleTaskNotification(task) {
        if (!task.date || task.completed) return;

        const taskDateTime = this.getTaskDateTime(task);
        if (!taskDateTime || taskDateTime <= new Date()) return;

        // Clear any existing scheduled notifications for this task
        this.clearTaskNotifications(task.id);

        // Schedule reminder before deadline
        if (this.settings.deadlineReminder) {
            const reminderTime = new Date(taskDateTime.getTime() - this.settings.deadlineReminderMinutes * 60000);
            
            if (reminderTime > new Date()) {
                const timeoutId = setTimeout(() => {
                    this.notifyUpcomingTask(task, this.settings.deadlineReminderMinutes);
                }, reminderTime.getTime() - Date.now());
                
                this.scheduledNotifications.set(`${task.id}_reminder`, timeoutId);
            }
        }

        // Schedule deadline notification
        const deadlineTimeoutId = setTimeout(() => {
            this.notifyTaskDeadline(task);
        }, taskDateTime.getTime() - Date.now());
        
        this.scheduledNotifications.set(`${task.id}_deadline`, deadlineTimeoutId);
    }

    /**
     * Get task datetime
     */
    getTaskDateTime(task) {
        if (!task.date) return null;
        const timeStr = task.time || '23:59';
        try {
            return new Date(`${task.date}T${timeStr}`);
        } catch {
            return null;
        }
    }

    /**
     * Notify about upcoming task
     */
    notifyUpcomingTask(task, minutesBefore) {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
        const categoryEmoji = {
            work: '💼', personal: '👤', study: '📚',
            health: '❤️', shopping: '🛒', other: '📌'
        };

        this.show(`⏰ Tarefa em ${minutesBefore} minutos`, {
            body: `${priorityEmoji[task.priority] || ''} ${task.title}`,
            tag: `upcoming_${task.id}`,
            requireInteraction: true,
            data: { taskId: task.id, type: 'upcoming' }
        });
    }

    /**
     * Notify about task deadline
     */
    notifyTaskDeadline(task) {
        this.show('⚠️ Hora da Tarefa!', {
            body: task.title,
            tag: `deadline_${task.id}`,
            requireInteraction: true,
            data: { taskId: task.id, type: 'deadline' }
        });
    }

    /**
     * Notify about overdue task
     */
    notifyOverdueTask(task) {
        if (!this.settings.overdueNotification) return;

        this.show('❌ Tarefa Atrasada!', {
            body: task.title,
            tag: `overdue_${task.id}`,
            data: { taskId: task.id, type: 'overdue' }
        });
    }

    /**
     * Clear scheduled notifications for a task
     */
    clearTaskNotifications(taskId) {
        const keys = [`${taskId}_reminder`, `${taskId}_deadline`];
        keys.forEach(key => {
            const timeoutId = this.scheduledNotifications.get(key);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.scheduledNotifications.delete(key);
            }
        });
    }

    /**
     * Setup scheduled notifications (morning reminder, etc.)
     */
    setupScheduledNotifications() {
        // Schedule morning reminder
        if (this.settings.morningReminder) {
            this.scheduleMorningReminder();
        }

        // Check for overdue tasks every hour
        setInterval(() => {
            this.checkOverdueTasks();
        }, 3600000); // 1 hour
    }

    /**
     * Schedule morning reminder
     */
    scheduleMorningReminder() {
        const now = new Date();
        const [hours, minutes] = this.settings.morningReminderTime.split(':').map(Number);
        
        let reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }

        const timeout = reminderTime.getTime() - now.getTime();
        
        setTimeout(() => {
            this.showMorningSummary();
            // Reschedule for next day
            this.scheduleMorningReminder();
        }, timeout);
    }

    /**
     * Show morning summary notification
     */
    showMorningSummary() {
        const tasks = this.getTodaysTasks();
        if (tasks.length === 0) return;

        const pendingCount = tasks.filter(t => !t.completed).length;
        
        if (pendingCount > 0) {
            this.show('☀️ Bom Dia!', {
                body: `Você tem ${pendingCount} tarefa${pendingCount > 1 ? 's' : ''} para hoje.`,
                tag: 'morning_summary',
                requireInteraction: true
            });
        }
    }

    /**
     * Get today's tasks from storage
     */
    getTodaysTasks() {
        try {
            const tasksJson = localStorage.getItem('taskScheduler_tasks');
            if (!tasksJson) return [];

            const tasks = JSON.parse(tasksJson);
            const today = new Date().toISOString().split('T')[0];
            
            return tasks.filter(task => task.date === today);
        } catch {
            return [];
        }
    }

    /**
     * Check for overdue tasks and notify
     */
    checkOverdueTasks() {
        if (!this.settings.overdueNotification) return;

        try {
            const tasksJson = localStorage.getItem('taskScheduler_tasks');
            if (!tasksJson) return;

            const tasks = JSON.parse(tasksJson);
            const now = new Date();

            tasks.forEach(task => {
                if (task.completed || !task.date) return;

                const taskDateTime = this.getTaskDateTime(task);
                if (!taskDateTime) return;

                // If overdue and not already notified
                if (taskDateTime < now) {
                    const notifiedKey = `overdue_notified_${task.id}`;
                    const lastNotified = localStorage.getItem(notifiedKey);
                    const lastNotifiedDate = lastNotified ? new Date(lastNotified) : null;
                    
                    // Only notify once per day
                    if (!lastNotifiedDate || (now - lastNotifiedDate) > 86400000) {
                        this.notifyOverdueTask(task);
                        localStorage.setItem(notifiedKey, now.toISOString());
                    }
                }
            });
        } catch (error) {
            console.error('[PushNotifications] Error checking overdue tasks:', error);
        }
    }

    /**
     * Update app badge with pending count
     */
    async updateBadge(count) {
        if ('setAppBadge' in navigator) {
            try {
                if (count > 0) {
                    await navigator.setAppBadge(count);
                } else {
                    await navigator.clearAppBadge();
                }
            } catch (error) {
                console.error('[PushNotifications] Badge update failed:', error);
            }
        }
    }

    /**
     * Trigger haptic feedback
     */
    vibrate(pattern = [50]) {
        if (this.settings.vibration && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Check if notifications are enabled and permitted
     */
    isEnabled() {
        return this.isSupported && 
               this.permission === 'granted' && 
               this.settings.enabled;
    }
}

// Initialize and export
window.PushNotificationManager = PushNotificationManager;
window.pushNotifications = new PushNotificationManager();
