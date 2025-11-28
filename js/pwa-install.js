/**
 * PWA Install Manager for Task Scheduler
 * Handles app installation prompts and platform-specific instructions
 */

class PWAInstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.platform = this.detectPlatform();
        this.installBanner = null;
        
        this.init();
    }

    /**
     * Initialize PWA install manager
     */
    init() {
        // Check if already installed
        this.checkIfInstalled();
        
        // Listen for beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            this.isInstalled = true;
            this.hideInstallBanner();
            this.deferredPrompt = null;
            
            // Show success message
            this.showInstallSuccess();
        });

        // Register service worker
        this.registerServiceWorker();
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service Worker not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateAvailable();
                    }
                });
            });
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    }

    /**
     * Detect user platform
     */
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/iphone|ipad|ipod/.test(userAgent)) {
            return 'ios';
        } else if (/android/.test(userAgent)) {
            return 'android';
        } else if (/windows/.test(userAgent)) {
            return 'windows';
        } else if (/macintosh|mac os x/.test(userAgent)) {
            return 'macos';
        }
        
        return 'other';
    }

    /**
     * Check if app is installed
     */
    checkIfInstalled() {
        // Check display mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            return true;
        }

        // Check iOS Safari
        if (window.navigator.standalone === true) {
            this.isInstalled = true;
            return true;
        }

        // Check if install prompt was dismissed recently
        const dismissedAt = localStorage.getItem('pwa_install_dismissed');
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceDismissed < 7) {
                return true; // Don't show banner for 7 days after dismissal
            }
        }

        return false;
    }

    /**
     * Show install banner
     */
    showInstallBanner() {
        if (this.isInstalled || this.installBanner) return;

        // Don't show if dismissed recently
        if (this.checkIfInstalled()) return;

        this.installBanner = document.createElement('div');
        this.installBanner.className = 'pwa-install-banner';
        this.installBanner.innerHTML = `
            <div class="pwa-install-content">
                <div class="pwa-install-icon">📱</div>
                <div class="pwa-install-text">
                    <strong>Instalar App</strong>
                    <span>Adicione à tela inicial para acesso rápido</span>
                </div>
            </div>
            <div class="pwa-install-actions">
                <button class="pwa-install-btn" id="pwaInstallBtn">Instalar</button>
                <button class="pwa-dismiss-btn" id="pwaDismissBtn">×</button>
            </div>
        `;

        document.body.appendChild(this.installBanner);

        // Add event listeners
        document.getElementById('pwaInstallBtn').addEventListener('click', () => {
            this.promptInstall();
        });

        document.getElementById('pwaDismissBtn').addEventListener('click', () => {
            this.dismissBanner();
        });

        // Animate in
        requestAnimationFrame(() => {
            this.installBanner.classList.add('show');
        });
    }

    /**
     * Hide install banner
     */
    hideInstallBanner() {
        if (this.installBanner) {
            this.installBanner.classList.remove('show');
            setTimeout(() => {
                if (this.installBanner && this.installBanner.parentNode) {
                    this.installBanner.parentNode.removeChild(this.installBanner);
                }
                this.installBanner = null;
            }, 300);
        }
    }

    /**
     * Dismiss banner and remember
     */
    dismissBanner() {
        localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
        this.hideInstallBanner();
    }

    /**
     * Prompt installation
     */
    async promptInstall() {
        if (this.deferredPrompt) {
            // Show native install prompt
            this.deferredPrompt.prompt();
            
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log('[PWA] Install prompt outcome:', outcome);
            
            this.deferredPrompt = null;
            this.hideInstallBanner();
        } else if (this.platform === 'ios') {
            // Show iOS instructions
            this.showIOSInstructions();
        } else {
            // Show generic instructions
            this.showGenericInstructions();
        }
    }

    /**
     * Show iOS installation instructions
     */
    showIOSInstructions() {
        const modal = this.createInstructionsModal({
            title: 'Instalar no iPhone/iPad',
            steps: [
                { icon: '📤', text: 'Toque no botão Compartilhar na barra inferior' },
                { icon: '⬇️', text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
                { icon: '➕', text: 'Toque em "Adicionar" no canto superior direito' }
            ],
            image: null
        });
        
        document.body.appendChild(modal);
    }

    /**
     * Show Android installation instructions
     */
    showAndroidInstructions() {
        const modal = this.createInstructionsModal({
            title: 'Instalar no Android',
            steps: [
                { icon: '⋮', text: 'Toque no menu (três pontos) no canto superior' },
                { icon: '📲', text: 'Selecione "Adicionar à tela inicial" ou "Instalar app"' },
                { icon: '✓', text: 'Confirme a instalação' }
            ]
        });
        
        document.body.appendChild(modal);
    }

    /**
     * Show generic installation instructions
     */
    showGenericInstructions() {
        const modal = this.createInstructionsModal({
            title: 'Instalar Aplicativo',
            steps: [
                { icon: '🔧', text: 'Acesse o menu do seu navegador' },
                { icon: '📲', text: 'Procure por "Instalar" ou "Adicionar à tela inicial"' },
                { icon: '✓', text: 'Confirme a instalação' }
            ]
        });
        
        document.body.appendChild(modal);
    }

    /**
     * Create instructions modal
     */
    createInstructionsModal({ title, steps }) {
        const modal = document.createElement('div');
        modal.className = 'pwa-instructions-modal';
        modal.innerHTML = `
            <div class="pwa-instructions-overlay"></div>
            <div class="pwa-instructions-content">
                <button class="pwa-instructions-close" aria-label="Fechar">×</button>
                <h2>${title}</h2>
                <div class="pwa-instructions-steps">
                    ${steps.map((step, index) => `
                        <div class="pwa-instruction-step">
                            <span class="step-number">${index + 1}</span>
                            <span class="step-icon">${step.icon}</span>
                            <span class="step-text">${step.text}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="pwa-instructions-ok">Entendi</button>
            </div>
        `;

        // Close handlers
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.pwa-instructions-close').addEventListener('click', closeModal);
        modal.querySelector('.pwa-instructions-overlay').addEventListener('click', closeModal);
        modal.querySelector('.pwa-instructions-ok').addEventListener('click', closeModal);

        // Show animation
        requestAnimationFrame(() => modal.classList.add('show'));

        return modal;
    }

    /**
     * Show install success message
     */
    showInstallSuccess() {
        // Use toast if available
        if (window.taskApp && window.taskApp.showToast) {
            window.taskApp.showToast('App instalado com sucesso! 🎉', 'success');
        }
    }

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        const banner = document.createElement('div');
        banner.className = 'pwa-update-banner';
        banner.innerHTML = `
            <span>🔄 Nova versão disponível!</span>
            <button id="pwaUpdateBtn">Atualizar</button>
        `;

        document.body.appendChild(banner);
        requestAnimationFrame(() => banner.classList.add('show'));

        document.getElementById('pwaUpdateBtn').addEventListener('click', () => {
            // Send message to service worker to skip waiting
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        });
    }

    /**
     * Check if app can be installed
     */
    canInstall() {
        return this.deferredPrompt !== null || this.platform === 'ios';
    }
}

// Initialize and export
window.PWAInstallManager = PWAInstallManager;
window.pwaInstall = new PWAInstallManager();
