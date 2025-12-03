/**
 * Google Calendar Integration
 * Sincroniza tarefas com Google Calendar
 */

class GoogleCalendarIntegration {
    constructor() {
        this.isAuthenticated = false;
        this.accessToken = null;
        this.clientId = null;
        this.apiKey = null;
        this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
        this.scope = 'https://www.googleapis.com/auth/calendar.events';
        
        // Load saved credentials
        this.loadCredentials();
    }

    init() {
        // Check if Google API is loaded
        if (typeof gapi === 'undefined') {
            this.loadGoogleAPI();
        } else {
            this.initializeGAPI();
        }
    }

    loadGoogleAPI() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            script.onload = () => {
                gapi.load('client:auth2', () => {
                    this.initializeGAPI();
                });
            };
        };
        document.head.appendChild(script);
    }

    async initializeGAPI() {
        try {
            // Try to load credentials from localStorage first
            const savedApiKey = localStorage.getItem('google_calendar_api_key');
            const savedClientId = localStorage.getItem('google_calendar_client_id');
            
            const apiKey = this.apiKey || savedApiKey || 'YOUR_API_KEY';
            const clientId = this.clientId || savedClientId || 'YOUR_CLIENT_ID';
            
            // Show warning if using default values
            if (apiKey === 'YOUR_API_KEY' || clientId === 'YOUR_CLIENT_ID') {
                console.warn('⚠️ Configure suas credenciais do Google Calendar em js/google-calendar.js');
                console.warn('📖 Veja GOOGLE_CALENDAR_SETUP.md para instruções');
                return;
            }
            
            await gapi.client.init({
                apiKey: apiKey,
                clientId: clientId,
                discoveryDocs: this.discoveryDocs,
                scope: this.scope
            });

            // Check if user is already signed in
            const authInstance = gapi.auth2.getAuthInstance();
            this.isAuthenticated = authInstance.isSignedIn.get();
            
            if (this.isAuthenticated) {
                this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
            }

            console.log('✓ Google Calendar API initialized');
        } catch (error) {
            console.error('Error initializing Google API:', error);
        }
    }

    async authenticate() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            
            this.isAuthenticated = true;
            this.accessToken = user.getAuthResponse().access_token;
            
            // Save credentials
            this.saveCredentials();
            
            if (window.app) {
                window.app.showToast('Conectado ao Google Calendar! 📅', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Error authenticating:', error);
            if (window.app) {
                window.app.showToast('Erro ao conectar com Google Calendar', 'error');
            }
            return false;
        }
    }

    async signOut() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            
            this.isAuthenticated = false;
            this.accessToken = null;
            
            // Clear saved credentials
            localStorage.removeItem('google_calendar_credentials');
            
            if (window.app) {
                window.app.showToast('Desconectado do Google Calendar', 'info');
            }
            
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    }

    async createEvent(task) {
        if (!this.isAuthenticated) {
            const authenticated = await this.authenticate();
            if (!authenticated) return null;
        }

        try {
            const startDateTime = this.getTaskDateTime(task);
            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour duration

            const event = {
                summary: task.title,
                description: task.description || '',
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                reminders: {
                    useDefault: false,
                    overrides: this.getReminders(task)
                },
                colorId: this.getColorId(task.priority),
                extendedProperties: {
                    private: {
                        taskId: task.id,
                        source: 'TaskScheduler'
                    }
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            console.log('✓ Event created in Google Calendar:', response.result.id);
            
            if (window.app) {
                window.app.showToast('Tarefa adicionada ao Google Calendar! 📅', 'success');
            }

            return response.result;
        } catch (error) {
            console.error('Error creating event:', error);
            if (window.app) {
                window.app.showToast('Erro ao criar evento no Google Calendar', 'error');
            }
            return null;
        }
    }

    async updateEvent(task, googleEventId) {
        if (!this.isAuthenticated) {
            const authenticated = await this.authenticate();
            if (!authenticated) return null;
        }

        try {
            const startDateTime = this.getTaskDateTime(task);
            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1);

            const event = {
                summary: task.title,
                description: task.description || '',
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                reminders: {
                    useDefault: false,
                    overrides: this.getReminders(task)
                },
                colorId: this.getColorId(task.priority)
            };

            const response = await gapi.client.calendar.events.update({
                calendarId: 'primary',
                eventId: googleEventId,
                resource: event
            });

            console.log('✓ Event updated in Google Calendar');
            
            if (window.app) {
                window.app.showToast('Tarefa atualizada no Google Calendar! 📅', 'success');
            }

            return response.result;
        } catch (error) {
            console.error('Error updating event:', error);
            if (window.app) {
                window.app.showToast('Erro ao atualizar evento no Google Calendar', 'error');
            }
            return null;
        }
    }

    async deleteEvent(googleEventId) {
        if (!this.isAuthenticated) return false;

        try {
            await gapi.client.calendar.events.delete({
                calendarId: 'primary',
                eventId: googleEventId
            });

            console.log('✓ Event deleted from Google Calendar');
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    }

    async syncTasksToCalendar(tasks) {
        if (!this.isAuthenticated) {
            const authenticated = await this.authenticate();
            if (!authenticated) return;
        }

        let synced = 0;
        let errors = 0;

        for (const task of tasks) {
            if (task.completed) continue; // Skip completed tasks

            try {
                // Check if task already has a Google Calendar event ID
                if (task.googleEventId) {
                    await this.updateEvent(task, task.googleEventId);
                } else {
                    const event = await this.createEvent(task);
                    if (event) {
                        task.googleEventId = event.id;
                        synced++;
                    } else {
                        errors++;
                    }
                }
            } catch (error) {
                console.error('Error syncing task:', task.title, error);
                errors++;
            }
        }

        if (window.app) {
            window.app.saveTasks();
            window.app.showToast(
                `${synced} tarefa(s) sincronizada(s) com Google Calendar${errors > 0 ? ` (${errors} erro(s))` : ''}`,
                errors > 0 ? 'warning' : 'success'
            );
        }
    }

    getTaskDateTime(task) {
        const dateTime = new Date(task.date);

        if (task.time) {
            const [hours, minutes] = task.time.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            dateTime.setHours(9, 0, 0, 0); // Default 9 AM
        }

        return dateTime;
    }

    getReminders(task) {
        const reminders = [];
        
        if (task.reminder && task.reminder !== 'none') {
            const minutes = parseInt(task.reminder);
            reminders.push({
                method: 'popup',
                minutes: minutes
            });
        }

        // Always add a default reminder 10 minutes before
        reminders.push({
            method: 'popup',
            minutes: 10
        });

        return reminders;
    }

    getColorId(priority) {
        const colorMap = {
            high: '11',    // Red
            medium: '5',   // Yellow
            low: '10'      // Green
        };
        return colorMap[priority] || '9'; // Default: Blue
    }

    saveCredentials() {
        const credentials = {
            isAuthenticated: this.isAuthenticated,
            accessToken: this.accessToken
        };
        localStorage.setItem('google_calendar_credentials', JSON.stringify(credentials));
        
        // Also save API key and Client ID if provided
        if (this.apiKey && this.apiKey !== 'YOUR_API_KEY') {
            localStorage.setItem('google_calendar_api_key', this.apiKey);
        }
        if (this.clientId && this.clientId !== 'YOUR_CLIENT_ID') {
            localStorage.setItem('google_calendar_client_id', this.clientId);
        }
    }

    loadCredentials() {
        try {
            const saved = localStorage.getItem('google_calendar_credentials');
            if (saved) {
                const credentials = JSON.parse(saved);
                this.isAuthenticated = credentials.isAuthenticated || false;
                this.accessToken = credentials.accessToken || null;
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
        }
    }

    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            hasToken: !!this.accessToken
        };
    }
}

// Initialize and expose globally
window.GoogleCalendarIntegration = new GoogleCalendarIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.GoogleCalendarIntegration.init();
    });
} else {
    window.GoogleCalendarIntegration.init();
}

