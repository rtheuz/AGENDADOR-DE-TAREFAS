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
        // Wait for Google API to be loaded
        this.waitForGoogleAPI().then(() => {
            this.initializeGAPI();
        }).catch(error => {
            console.error('Failed to load Google API:', error);
        });
    }

    waitForGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Check if already loaded and auth2 is ready
            if (typeof gapi !== 'undefined' && typeof gapi.load !== 'undefined' && typeof gapi.auth2 !== 'undefined') {
                resolve();
                return;
            }

            // Check if already loaded but auth2 not ready
            if (typeof gapi !== 'undefined' && typeof gapi.load !== 'undefined') {
                gapi.load('client:auth2', {
                    callback: () => {
                        resolve();
                    },
                    onerror: () => {
                        reject(new Error('Failed to load auth2 module'));
                    },
                    timeout: 10000,
                    ontimeout: () => {
                        reject(new Error('Timeout loading auth2 module'));
                    }
                });
                return;
            }

            // Check if script tag exists
            let script = document.querySelector('script[src*="apis.google.com/js/api.js"]');
            
            if (!script) {
                // Create and load script
                script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    gapi.load('client:auth2', {
                        callback: () => {
                            resolve();
                        },
                        onerror: () => {
                            reject(new Error('Failed to load auth2 module'));
                        },
                        timeout: 10000,
                        ontimeout: () => {
                            reject(new Error('Timeout loading auth2 module'));
                        }
                    });
                };
                script.onerror = () => {
                    reject(new Error('Failed to load Google API script'));
                };
                document.head.appendChild(script);
            } else {
                // Script exists, wait for it to load
                const checkInterval = setInterval(() => {
                    if (typeof gapi !== 'undefined' && typeof gapi.load !== 'undefined') {
                        clearInterval(checkInterval);
                        gapi.load('client:auth2', {
                            callback: () => {
                                resolve();
                            },
                            onerror: () => {
                                reject(new Error('Failed to load auth2 module'));
                            },
                            timeout: 10000,
                            ontimeout: () => {
                                reject(new Error('Timeout loading auth2 module'));
                            }
                        });
                    }
                }, 100);

                // Timeout after 15 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (typeof gapi === 'undefined') {
                        reject(new Error('Google API failed to load within timeout'));
                    }
                }, 15000);
            }
        });
    }

    async initializeGAPI() {
        try {
            // Final check if gapi is loaded
            if (typeof gapi === 'undefined' || typeof gapi.client === 'undefined') {
                console.warn('Google API not loaded yet, retrying...');
                // Retry after a short delay
                setTimeout(() => {
                    this.initializeGAPI();
                }, 500);
                return;
            }

            // Try to load credentials from localStorage first
            const savedApiKey = localStorage.getItem('google_calendar_api_key');
            const savedClientId = localStorage.getItem('google_calendar_client_id');
            
            const apiKey = this.apiKey || savedApiKey || 'AIzaSyDOC4F5cEwCufQOa1GDWzDznL0FRmMQz30';
            const clientId = this.clientId || savedClientId || '700664728932-907a6b6tk5lci7ak391l085dcc5os43m.apps.googleusercontent.com';
            
            // Validate credentials (check if they look like real credentials)
            if (!apiKey || apiKey.length < 20 || !clientId || clientId.length < 20) {
                console.warn('⚠️ Credenciais do Google Calendar inválidas');
                console.warn('📖 Veja GOOGLE_CALENDAR_SETUP.md para instruções');
                return;
            }
            
            console.log('Inicializando Google Calendar API...');
            
            await gapi.client.init({
                apiKey: apiKey,
                clientId: clientId,
                discoveryDocs: this.discoveryDocs,
                scope: this.scope,
                cookiePolicy: 'single_host_origin'
            });

            // Wait a bit for auth2 to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if user is already signed in
            try {
                const authInstance = gapi.auth2.getAuthInstance();
                if (authInstance) {
                    this.isAuthenticated = authInstance.isSignedIn.get();
                    
                    if (this.isAuthenticated) {
                        const user = authInstance.currentUser.get();
                        const authResponse = user.getAuthResponse();
                        this.accessToken = authResponse.access_token;
                        console.log('✓ Google Calendar API initialized - Usuário já autenticado');
                    } else {
                        console.log('✓ Google Calendar API initialized - Pronto para autenticação');
                    }
                } else {
                    console.log('✓ Google Calendar API initialized');
                }
            } catch (authError) {
                console.warn('Auth2 not ready yet:', authError);
                console.log('✓ Google Calendar API initialized (auth2 will be available after first sign-in)');
            }
        } catch (error) {
            console.error('Erro ao inicializar Google API:', error);
            if (error.message) {
                console.error('Detalhes:', error.message);
            }
            if (error.error) {
                console.error('Erro da API:', error.error);
            }
            // Don't throw - allow app to continue without Google Calendar
            console.warn('⚠️ Google Calendar não estará disponível até que o erro seja resolvido');
        }
    }

    async authenticate() {
        try {
            // Check if already authenticated
            if (this.isAuthenticated && this.accessToken) {
                if (window.app) {
                    window.app.showToast('Já conectado ao Google Calendar! 📅', 'info');
                }
                return true;
            }

            // Check if gapi is ready
            if (typeof gapi === 'undefined' || typeof gapi.auth2 === 'undefined') {
                console.error('Google API not ready for authentication');
                if (window.app) {
                    window.app.showToast('Aguarde o carregamento da API do Google', 'warning');
                }
                return false;
            }

            const authInstance = gapi.auth2.getAuthInstance();
            if (!authInstance) {
                console.error('Auth instance not available');
                if (window.app) {
                    window.app.showToast('Erro: API não inicializada. Recarregue a página.', 'error');
                }
                return false;
            }

            const user = await authInstance.signIn({
                prompt: 'select_account'
            });
            
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
            
            let errorMessage = 'Erro ao conectar com Google Calendar';
            if (error.error) {
                if (error.error === 'popup_closed_by_user') {
                    errorMessage = 'Autenticação cancelada';
                } else if (error.error === 'access_denied') {
                    errorMessage = 'Acesso negado. Tente novamente.';
                }
            }
            
            if (window.app) {
                window.app.showToast(errorMessage, 'error');
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
        if (this.apiKey && this.apiKey !== 'AIzaSyDOC4F5cEwCufQOa1GDWzDznL0FRmMQz30') {
            localStorage.setItem('google_calendar_api_key', this.apiKey);
        }
        if (this.clientId && this.clientId !== '700664728932-907a6b6tk5lci7ak391l085dcc5os43m.apps.googleusercontent.com') {
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

// Auto-initialize when DOM is ready and Google API is loaded
function initializeGoogleCalendar() {
    // Wait a bit to ensure Google API script has time to load
    setTimeout(() => {
        if (window.GoogleCalendarIntegration) {
            window.GoogleCalendarIntegration.init();
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGoogleCalendar);
} else {
    initializeGoogleCalendar();
}

