/**
 * Notification Manager Pro
 * Advanced notification and reminder system
 */

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.scheduledNotifications = new Map();
        this.notificationQueue = [];
    }

    init() {
        this.checkPermission();
        this.startNotificationChecker();
        console.log('✓ Notification Manager initialized');
    }

    checkPermission() {
        if (! ('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }
        
        this.permission = Notification.permission;
        return this.permission === 'granted';
    }

    async requestPermission() {
        if (! ('Notification' in window)) {
            if (window.app) {
                window.app.showToast('Notificações não suportadas neste navegador', 'error');
            }
            return false;
        }

        if (this.permission === 'granted') {
            if (window.app) {
                window.app.showToast('Notificações já estão ativadas!  ✓', 'success');
            }
            this.showWelcomeNotification();
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                if (window. app) {
                    window. app.showToast('Notificações ativadas com sucesso! 🔔', 'success');
                }
                this.showWelcomeNotification();
                return true;
            } else {
                if (window.app) {
                    window.app.showToast('Permissão de notificação negada', 'warning');
                }
                return false;
            }
        } catch (error) {
            console. error('Error requesting permission:', error);
            return false;
        }
    }

    showWelcomeNotification() {
        this.showNotification(
            'TaskScheduler Pro',
            'Notificações ativadas!  Você receberá lembretes sobre suas tarefas.',
            { tag: 'welcome', icon: '/icons/icon-192x192.png' }
        );
    }

    showNotification(title, body, options = {}) {
        if (!this.checkPermission()) {
            console.log('Notification permission not granted');
            return;
        }

        const defaultOptions = {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            vibrate: [200, 100, 200],
            timestamp: Date.now(),
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            notification.onclick = () => {
                window.focus();
                notification.close();
                
                if (options.data?. taskId && window.app) {
                    window.app.openTaskModal(options.data.taskId);
                }
            };

            setTimeout(() => notification.close(), 6000);

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    scheduleNotification(task) {
        if (!task.date || task.reminder === 'none') return;

        const taskDateTime = this.getTaskDateTime(task);
        const now = new Date();
        const reminderMinutes = parseInt(task.reminder) || 30;
        
        const notificationTime = new Date(taskDateTime.getTime() - reminderMinutes * 60 * 1000);

        if (notificationTime > now) {
            const timeUntil = notificationTime.getTime() - now.getTime();

            // Cancel existing notification for this task
            this.cancelNotification(task.id);

            // Schedule notification in main thread (for when app is open)
            const timeoutId = setTimeout(() => {
                this.showNotification(
                    '⏰ Lembrete de Tarefa',
                    `${task.title} em ${reminderMinutes} minutos!`,
                    {
                        tag: `reminder-${task.id}`,
                        data: { taskId: task.id },
                        requireInteraction: true
                    }
                );
            }, timeUntil);

            this.scheduledNotifications.set(task.id, {
                timeoutId,
                notificationTime: notificationTime.toISOString(),
                taskTitle: task.title
            });

            // Schedule notification in Service Worker (works even when app is closed)
            this.scheduleNotificationInServiceWorker(task, notificationTime, reminderMinutes);

            console.log(`✓ Notification scheduled for ${task.title} at ${notificationTime.toLocaleString()}`);
        }
    }

    async scheduleNotificationInServiceWorker(task, notificationTime, reminderMinutes) {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Send message to service worker to schedule notification
            registration.active?.postMessage({
                type: 'SCHEDULE_NOTIFICATION',
                data: {
                    taskId: task.id,
                    title: task.title,
                    notificationTime: notificationTime.toISOString(),
                    reminderMinutes: reminderMinutes,
                    taskDateTime: this.getTaskDateTime(task).toISOString()
                }
            });

            // Also save to IndexedDB for persistence
            await this.saveNotificationToIndexedDB({
                taskId: task.id,
                title: task.title,
                notificationTime: notificationTime.toISOString(),
                reminderMinutes: reminderMinutes,
                taskDateTime: this.getTaskDateTime(task).toISOString()
            });
        } catch (error) {
            console.error('Error scheduling notification in service worker:', error);
        }
    }

    async saveNotificationToIndexedDB(notificationData) {
        if (!('indexedDB' in window)) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TaskSchedulerDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['notifications'], 'readwrite');
                const store = transaction.objectStore('notifications');
                
                // Delete old notification for this task if exists
                store.delete(notificationData.taskId);
                
                // Add new notification
                store.add(notificationData);
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('notifications')) {
                    const store = db.createObjectStore('notifications', { keyPath: 'taskId' });
                    store.createIndex('notificationTime', 'notificationTime', { unique: false });
                }
            };
        });
    }

    cancelNotification(taskId) {
        const scheduled = this.scheduledNotifications. get(taskId);
        if (scheduled) {
            clearTimeout(scheduled.timeoutId);
            this.scheduledNotifications. delete(taskId);
            console.log(`✓ Notification cancelled for task ${taskId}`);
        }
    }

    getTaskDateTime(task) {
        const dateTime = new Date(task.date);

        if (task.time) {
            const [hours, minutes] = task.time.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            dateTime. setHours(9, 0, 0, 0);
        }

        return dateTime;
    }

    startNotificationChecker() {
        // Check every 5 minutes
        setInterval(() => {
            this.checkPendingNotifications();
        }, 5 * 60 * 1000);

        // Initial check
        setTimeout(() => this.checkPendingNotifications(), 5000);
    }

    checkPendingNotifications() {
        if (! this.checkPermission() || !window.app) return;

        const tasks = window.app.tasks;
        const now = new Date();

        tasks.forEach(task => {
            if (task.completed || ! task.time) return;

            const taskDateTime = this.getTaskDateTime(task);
            const timeDiff = taskDateTime.getTime() - now. getTime();
            const minutesUntil = Math.floor(timeDiff / 60000);

            // Notify at specific intervals
            if ([60, 30, 15, 5].includes(minutesUntil)) {
                this.showNotification(
                    '⏰ Lembrete',
                    `${task.title} em ${minutesUntil} minutos`,
                    {
                        tag: `reminder-${task.id}-${minutesUntil}`,
                        data: { taskId: task.id },
                        requireInteraction: minutesUntil <= 15
                    }
                );
            }

            // Overdue notification
            if (timeDiff < 0 && timeDiff > -3600000) { // Within 1 hour overdue
                const minutesOverdue = Math.abs(minutesUntil);
                if (minutesOverdue % 15 === 0) {
                    this.showNotification(
                        '⚠️ Tarefa Atrasada',
                        `${task.title} está ${minutesOverdue} minutos atrasada`,
                        {
                            tag: `overdue-${task.id}`,
                            data: { taskId: task.id },
                            requireInteraction: true
                        }
                    );
                }
            }
        });
    }

    scheduleDailySummary() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        const timeUntil = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            this.sendDailySummary();
            this.scheduleDailySummary(); // Reschedule
        }, timeUntil);
    }

    sendDailySummary() {
        if (!this.checkPermission() || !window.app) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTasks = window.app. tasks.filter(task => {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime() && !task.completed;
        });

        if (todayTasks.length > 0) {
            this.showNotification(
                '📋 Resumo do Dia',
                `Você tem ${todayTasks.length} tarefa(s) para hoje! `,
                { tag: 'daily-summary' }
            );
        }
    }
}

// Initialize and expose globally
window.NotificationManager = new NotificationManager();