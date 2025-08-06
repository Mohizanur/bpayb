// API Base URL
const API_BASE = window.location.origin;

// API Helper Functions
const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return response.json();
  },
  
  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  async put(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Dynamic Time Display
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
    });
    
    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        timeDisplay.textContent = `${timeString} UTC`;
    }
}

// Update time every minute
setInterval(updateTime, 60000);
updateTime(); // Initial call

// User Authentication System
class UserManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('birrpay_user')) || null;
        this.updateUI();
    }

    login(userData) {
        this.currentUser = userData;
        localStorage.setItem('birrpay_user', JSON.stringify(userData));
        this.updateUI();
        showNotification('Login successful!', 'success');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('birrpay_user');
        this.updateUI();
        showNotification('Logged out successfully', 'info');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    updateUI() {
        // Update login buttons
        const loginButtons = document.querySelectorAll('.btn-secondary');
        loginButtons.forEach(btn => {
            if (btn.textContent.includes('Login') || btn.textContent.includes(this.currentUser?.name || '')) {
                if (this.isLoggedIn()) {
                    btn.innerHTML = '<i class="fas fa-user"></i> ' + this.currentUser.name;
                    btn.onclick = () => this.showUserMenu();
                } else {
                    btn.innerHTML = '<i class="fas fa-user"></i> Login';
                    btn.onclick = () => this.showLoginModal();
                }
            }
        });

        // Update Get Started buttons
        const getStartedButtons = document.querySelectorAll('.btn-primary');
        getStartedButtons.forEach(btn => {
            if (btn.textContent.includes('Get Started') || btn.textContent.includes('My Dashboard')) {
                if (this.isLoggedIn()) {
                    btn.textContent = 'My Dashboard';
                    btn.onclick = () => this.showDashboard();
                } else {
                    btn.textContent = 'Get Started';
                    btn.onclick = () => this.showSignupModal();
                }
            }
        });
    }

    showLoginModal() {
        this.createModal('Login to BirrPay', this.createLoginForm());
    }

    showSignupModal() {
        this.createModal('Join BirrPay', this.createSignupForm());
    }

    createLoginForm() {
        return `
            <form id="loginForm" class="auth-form">
                <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="submit" class="btn-primary btn-full">Login</button>
                <p class="auth-switch">Don't have an account? <a href="#" onclick="userManager.showSignupModal()">Sign up</a></p>
            </form>
        `;
    }

    createSignupForm() {
        return `
            <form id="signupForm" class="auth-form">
                <div class="form-group">
                    <label for="signupName">Full Name</label>
                    <input type="text" id="signupName" required>
                </div>
                <div class="form-group">
                    <label for="signupEmail">Email</label>
                    <input type="email" id="signupEmail" required>
                </div>
                <div class="form-group">
                    <label for="signupPhone">Phone Number</label>
                    <input type="tel" id="signupPhone" placeholder="+251..." required>
                </div>
                <div class="form-group">
                    <label for="signupPassword">Password</label>
                    <input type="password" id="signupPassword" required>
                </div>
                <div class="form-group">
                    <label for="signupConfirmPassword">Confirm Password</label>
                    <input type="password" id="signupConfirmPassword" required>
                </div>
                <button type="submit" class="btn-primary btn-full">Create Account</button>
                <p class="auth-switch">Already have an account? <a href="#" onclick="userManager.showLoginModal()">Login</a></p>
            </form>
        `;
    }

    createModal(title, content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        const modal = document.querySelector('.modal-overlay');
        const closeBtn = modal.querySelector('.modal-close');
        
        closeBtn.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Add form handlers
        const loginForm = modal.querySelector('#loginForm');
        const signupForm = modal.querySelector('#signupForm');

        if (loginForm) {
            loginForm.onsubmit = (e) => this.handleLogin(e);
        }
        if (signupForm) {
            signupForm.onsubmit = (e) => this.handleSignup(e);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Simulate authentication
        if (email && password.length >= 6) {
            const userData = {
                id: Date.now(),
                name: email.split('@')[0],
                email: email,
                isPaid: Math.random() > 0.5, // Randomly assign paid status
                subscriptions: [],
                joinDate: new Date().toISOString()
            };

            this.login(userData);
            document.querySelector('.modal-overlay').remove();
        } else {
            showNotification('Invalid credentials. Password must be at least 6 characters.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        const userData = {
            id: Date.now(),
            name: name,
            email: email,
            phone: phone,
            isPaid: false,
            subscriptions: [],
            joinDate: new Date().toISOString()
        };

        this.login(userData);
        document.querySelector('.modal-overlay').remove();
    }

    showUserMenu() {
        const menuHTML = `
            <div class="dropdown-menu">
                <a href="#" onclick="userManager.showDashboard()">Dashboard</a>
                <a href="#" onclick="userManager.showProfile()">Profile</a>
                <a href="#" onclick="userManager.showSubscriptions()">My Subscriptions</a>
                <a href="#" onclick="userManager.logout()">Logout</a>
            </div>
        `;
        // Implementation for dropdown menu
        showNotification('User menu would appear here', 'info');
    }

    showDashboard() {
        this.createModal('My Dashboard', this.createDashboardContent());
    }

    createDashboardContent() {
        const user = this.currentUser;
        return `
            <div class="dashboard">
                <div class="user-info">
                    <h4>Welcome, ${user.name}!</h4>
                    <p>Account Status: ${user.isPaid ? '✅ Premium' : '⚠️ Free'}</p>
                    <p>Member since: ${new Date(user.joinDate).toLocaleDateString()}</p>
                </div>
                <div class="dashboard-stats">
                    <div class="stat-item">
                        <span class="stat-number">${user.subscriptions.length}</span>
                        <span class="stat-label">Active Subscriptions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${user.isPaid ? '✅' : '❌'}</span>
                        <span class="stat-label">Premium Access</span>
                    </div>
                </div>
                ${!user.isPaid ? '<button class="btn-primary" onclick="userManager.upgradeToPremium()">Upgrade to Premium</button>' : ''}
                ${user.isPaid ? '<button class="btn-secondary" onclick="userManager.showUploadModal()">Upload Screenshot</button>' : ''}
            </div>
        `;
    }

    upgradeToPremium() {
        const paymentHTML = `
            <div class="payment-form">
                <h4>Upgrade to Premium</h4>
                <p>Unlock premium features including screenshot uploads and priority support.</p>
                <div class="pricing">
                    <div class="price-option selected" data-price="500">
                        <span class="price">500 ETB</span>
                        <span class="period">Monthly</span>
                    </div>
                    <div class="price-option" data-price="1400">
                        <span class="price">1,400 ETB</span>
                        <span class="period">3 Months</span>
                        <span class="savings">Save 533 ETB</span>
                    </div>
                    <div class="price-option" data-price="2500">
                        <span class="price">2,500 ETB</span>
                        <span class="period">6 Months</span>
                        <span class="savings">Save 1,500 ETB</span>
                    </div>
                </div>
                <button class="btn-primary btn-full" onclick="userManager.processPayment()">Pay Now</button>
            </div>
        `;
        this.createModal('Upgrade to Premium', paymentHTML);
    }

    processPayment() {
        showNotification('Processing payment...', 'info');
        setTimeout(() => {
            this.currentUser.isPaid = true;
            localStorage.setItem('birrpay_user', JSON.stringify(this.currentUser));
            showNotification('Payment successful! You are now a premium member.', 'success');
            document.querySelector('.modal-overlay').remove();
            this.updateUI();
        }, 2000);
    }

    showUploadModal() {
        const uploadHTML = `
            <div class="upload-form">
                <h4>Upload Screenshot</h4>
                <p>Upload screenshots for verification or support purposes.</p>
                <div class="upload-area" id="uploadArea">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Drag & drop files here or click to browse</p>
                    <input type="file" id="fileInput" accept="image/*" multiple style="display: none;">
                </div>
                <div class="upload-info">
                    <small>Supported formats: JPG, PNG, GIF (Max 5MB each)</small>
                </div>
                <div id="uploadedFiles" class="uploaded-files"></div>
                <button class="btn-primary btn-full" onclick="userManager.submitScreenshots()">Submit Screenshots</button>
            </div>
        `;
        this.createModal('Upload Screenshots', uploadHTML);
        this.initializeUpload();
    }

    initializeUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadedFiles = document.getElementById('uploadedFiles');

        uploadArea.onclick = () => fileInput.click();

        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = '#f0f8ff';
        };

        uploadArea.ondragleave = () => {
            uploadArea.style.backgroundColor = '';
        };

        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = '';
            this.handleFiles(e.dataTransfer.files);
        };

        fileInput.onchange = (e) => {
            this.handleFiles(e.target.files);
        };
    }

    handleFiles(files) {
        const uploadedFiles = document.getElementById('uploadedFiles');
        uploadedFiles.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <i class="fas fa-image"></i>
                    <span>${file.name}</span>
                    <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button class="remove-file" onclick="this.parentElement.remove()">×</button>
                `;
                uploadedFiles.appendChild(fileItem);
            } else {
                showNotification(`Invalid file: ${file.name}`, 'error');
            }
        });
    }

    submitScreenshots() {
        const fileItems = document.querySelectorAll('.file-item');
        if (fileItems.length === 0) {
            showNotification('Please select at least one file to upload', 'error');
            return;
        }

        showNotification('Uploading screenshots...', 'info');
        setTimeout(() => {
            showNotification(`Successfully uploaded ${fileItems.length} screenshot(s)`, 'success');
            document.querySelector('.modal-overlay').remove();
        }, 2000);
    }
}

// Initialize user manager
const userManager = new UserManager();

// Service Management System
class ServiceManager {
    constructor() {
        this.services = [
            { id: 'netflix', name: 'Netflix', price: 350, description: 'Stream movies, TV shows and more', logo: 'logos/netflix.png' },
            { id: 'prime', name: 'Amazon Prime', price: 300, description: 'Prime Video, Music and Shopping benefits', logo: 'logos/prime.png' },
            { id: 'spotify', name: 'Spotify Premium', price: 250, description: 'Music streaming without ads', logo: 'logos/spotify.png' },
            { id: 'disney', name: 'Disney+', price: 280, description: 'Disney, Marvel, Star Wars content', logo: 'logos/disney.png' },
            { id: 'hulu', name: 'Hulu', price: 320, description: 'TV shows and movies streaming', logo: 'logos/hulu.png' },
            { id: 'youtube', name: 'YouTube Premium', price: 200, description: 'Ad-free YouTube with offline downloads', logo: 'logos/youtube.png' }
        ];
        this.selectedService = null;
        this.selectedDuration = null;
        this.initializeServiceSelection();
    }

    initializeServiceSelection() {
        // Update service cards with real data
        this.updateServiceCards();
        this.setupServiceInteractions();
    }

    updateServiceCards() {
        const serviceGrid = document.querySelector('.services-grid');
        if (!serviceGrid) return;

        serviceGrid.innerHTML = '';
        this.services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-logo">
                    <img src="${service.logo}" alt="${service.name}" onerror="this.style.display='none'">
                </div>
                <h3>${service.name}</h3>
                <p>${service.description}</p>
                <div class="service-price">${formatETB(service.price)}/month</div>
            `;
            card.onclick = () => this.selectService(service);
            serviceGrid.appendChild(card);
        });
    }

    setupServiceInteractions() {
        // Duration selection
        const durationCards = document.querySelectorAll('.duration-card');
        durationCards.forEach(card => {
            card.onclick = () => this.selectDuration(card);
        });

        // Action buttons
        const startNewBtn = document.querySelector('.action-card .btn-primary');
        const renewBtn = document.querySelector('.action-card .btn-secondary');

        if (startNewBtn) {
            startNewBtn.onclick = () => this.startSubscription();
        }
        if (renewBtn) {
            renewBtn.onclick = () => this.renewSubscription();
        }
    }

    selectService(service) {
        // Remove selection from all cards
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Add selection to clicked card
        event.target.closest('.service-card').classList.add('selected');
        this.selectedService = service;
        this.updateActionButtons();
    }

    selectDuration(card) {
        // Remove selection from all duration cards
        document.querySelectorAll('.duration-card').forEach(c => {
            c.classList.remove('selected');
        });

        // Add selection to clicked card
        card.classList.add('selected');
        
        const period = card.querySelector('h4').textContent;
        const priceText = card.querySelector('p').textContent;
        
        this.selectedDuration = {
            period: period,
            price: priceText,
            months: this.getMonthsFromPeriod(period)
        };
        
        this.updateActionButtons();
    }

    getMonthsFromPeriod(period) {
        const monthMap = {
            '1 Month': 1,
            '3 Months': 3,
            '6 Months': 6,
            '12 Months': 12
        };
        return monthMap[period] || 1;
    }

    updateActionButtons() {
        const startNewBtn = document.querySelector('.action-card .btn-primary');
        const renewBtn = document.querySelector('.action-card .btn-secondary');
        
        if (this.selectedService && this.selectedDuration) {
            const totalPrice = this.selectedService.price * this.selectedDuration.months;
            
            if (startNewBtn) {
                startNewBtn.textContent = `Start ${this.selectedService.name} - ${formatETB(totalPrice)}`;
                startNewBtn.style.opacity = '1';
                startNewBtn.style.pointerEvents = 'auto';
            }
            
            if (renewBtn) {
                renewBtn.textContent = `Renew ${this.selectedService.name} - ${formatETB(totalPrice)}`;
                renewBtn.style.opacity = '1';
                renewBtn.style.pointerEvents = 'auto';
            }
        } else {
            if (startNewBtn) {
                startNewBtn.textContent = 'Select Service & Duration';
                startNewBtn.style.opacity = '0.6';
                startNewBtn.style.pointerEvents = 'none';
            }
            
            if (renewBtn) {
                renewBtn.textContent = 'Select Service & Duration';
                renewBtn.style.opacity = '0.6';
                renewBtn.style.pointerEvents = 'none';
            }
        }
    }

    startSubscription() {
        if (!userManager.isLoggedIn()) {
            showNotification('Please login to start a subscription', 'error');
            userManager.showLoginModal();
            return;
        }

        if (!this.selectedService || !this.selectedDuration) {
            showNotification('Please select a service and duration', 'error');
            return;
        }

        this.showSubscriptionModal('start');
    }

    renewSubscription() {
        if (!userManager.isLoggedIn()) {
            showNotification('Please login to renew a subscription', 'error');
            userManager.showLoginModal();
            return;
        }

        if (!this.selectedService || !this.selectedDuration) {
            showNotification('Please select a service and duration', 'error');
            return;
        }

        this.showSubscriptionModal('renew');
    }

    showSubscriptionModal(type) {
        const totalPrice = this.selectedService.price * this.selectedDuration.months;
        const action = type === 'start' ? 'Start' : 'Renew';
        
        const modalContent = `
            <div class="subscription-modal">
                <h4>${action} Subscription</h4>
                <div class="subscription-details">
                    <div class="service-info">
                        <h5>${this.selectedService.name}</h5>
                        <p>${this.selectedService.description}</p>
                    </div>
                    <div class="pricing-breakdown">
                        <div class="price-row">
                            <span>Service</span>
                            <span>${formatETB(this.selectedService.price)}/month</span>
                        </div>
                        <div class="price-row">
                            <span>Duration</span>
                            <span>${this.selectedDuration.period}</span>
                        </div>
                        <div class="price-row total">
                            <span>Total</span>
                            <span>${formatETB(totalPrice)}</span>
                        </div>
                    </div>
                </div>
                <div class="payment-instructions">
                    <h5>💰 Payment Instructions</h5>
                    <div class="payment-methods">
                        <div class="payment-method">
                            <h6>🏦 Bank Transfer</h6>
                            <p>CBE Bank: 1000123456789<br>
                            Dashen Bank: 2000987654321<br>
                            Abyssinia Bank: 3000555444333</p>
                        </div>
                        <div class="payment-method">
                            <h6>📱 Mobile Banking</h6>
                            <p>TeleBirr: 0912345678<br>
                            CBE Birr: 0987654321</p>
                        </div>
                    </div>
                    <div class="payment-note">
                        <strong>📸 After Payment:</strong>
                        <p>1. Complete your payment using any method above</p>
                        <p>2. Take a screenshot of your payment confirmation</p>
                        <p>3. Upload it to our Telegram bot for verification</p>
                        <p>4. Admin will approve within 24 hours</p>
                    </div>
                </div>
                <button class="btn-primary btn-full" onclick="serviceManager.redirectToTelegram('${type}')">
                    📱 Go to Telegram Bot
                </button>
            </div>
        `;

        userManager.createModal(`${action} ${this.selectedService.name}`, modalContent);
    }

    redirectToTelegram(type) {
        // Store the subscription request locally for reference
        const subscriptionRequest = {
            id: Date.now(),
            service: this.selectedService,
            duration: this.selectedDuration,
            type: type,
            requestDate: new Date().toISOString(),
            status: 'payment_pending',
            totalAmount: this.selectedService.price * this.selectedDuration.months
        };

        // Add to pending subscriptions
        if (!userManager.currentUser.pendingSubscriptions) {
            userManager.currentUser.pendingSubscriptions = [];
        }
        userManager.currentUser.pendingSubscriptions.push(subscriptionRequest);
        localStorage.setItem('birrpay_user', JSON.stringify(userManager.currentUser));

        // Create Telegram bot link with pre-filled message
        const botUsername = '@birrpayofficial'; // Replace with your actual bot username
        const message = `I want to subscribe to ${this.selectedService.name} for ${this.selectedDuration.period}. Total amount: ${formatETB(subscriptionRequest.totalAmount)}`;
        const telegramUrl = `https://t.me/${botUsername.replace('@', '')}?start=${encodeURIComponent(message)}`;

        showNotification('Redirecting to Telegram bot...', 'info');
        
        // Close modal and redirect
        document.querySelector('.modal-overlay').remove();
        
        setTimeout(() => {
            window.open(telegramUrl, '_blank');
            showNotification('Complete your payment and upload screenshot in Telegram!', 'info');
        }, 1000);
    }
}

// Initialize service manager
const serviceManager = new ServiceManager();

// FAQ Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});

// Smooth Scrolling for Navigation Links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Service Selection and Payment Flow
class SubscriptionManager {
    constructor() {
        this.selectedService = null;
        this.selectedDuration = null;
        this.selectedPaymentMethod = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.loadServices();
        this.setupEventListeners();
        this.updateActionButtons();
    }

    async loadServices() {
        try {
            const response = await api.get('/api/services');
            if (response.success) {
                this.services = response.services;
                this.renderServices();
            } else {
                showNotification('Failed to load services', 'error');
            }
        } catch (error) {
            console.error('Error loading services:', error);
            showNotification('Error loading services', 'error');
        }
    }

    renderServices() {
        const servicesGrid = document.querySelector('.services-grid');
        if (!servicesGrid || !this.services) return;

        servicesGrid.innerHTML = '';
        
        this.services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.dataset.serviceId = service.serviceID;
            
            serviceCard.innerHTML = `
                <div class="service-logo">
                    <img src="${service.logoUrl || '/logos/default.png'}" alt="${service.name}">
                </div>
                <h3>${service.name}</h3>
                <p>${service.description}</p>
                <div class="service-price">
                    <span class="price">${formatETB(service.price)}</span>
                    <span class="period">/month</span>
                </div>
                <button class="btn-select-service" data-service-id="${service.serviceID}">
                    Select Service
                </button>
            `;
            
            servicesGrid.appendChild(serviceCard);
        });
    }

    setupEventListeners() {
        // Service selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-select-service')) {
                const serviceId = e.target.dataset.serviceId;
                this.selectService(serviceId);
            }
        });

        // Duration selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('duration-card')) {
                this.selectDuration(e.target.dataset.duration);
            }
        });

        // Payment method selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('payment-method')) {
                this.selectPaymentMethod(e.target.dataset.method);
            }
        });

        // Action buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-proceed-payment') {
                this.proceedToPayment();
            }
            if (e.target.id === 'btn-upload-screenshot') {
                this.uploadScreenshot();
            }
        });
    }

    selectService(serviceId) {
        this.selectedService = this.services.find(s => s.serviceID === serviceId);
        
        // Update UI
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.showDurationOptions();
        this.updateActionButtons();
    }

    showDurationOptions() {
        if (!this.selectedService) return;

        const durationOptions = [
            { id: '1_month', name: '1 Month', multiplier: 1 },
            { id: '3_months', name: '3 Months', multiplier: 2.7 },
            { id: '6_months', name: '6 Months', multiplier: 5.1 },
            { id: '12_months', name: '12 Months', multiplier: 9.6 }
        ];

        const durationContainer = document.querySelector('.duration-options');
        if (!durationContainer) return;

        durationContainer.innerHTML = '';
        
        durationOptions.forEach(duration => {
            const amount = Math.round(this.selectedService.price * duration.multiplier);
            const discount = duration.multiplier > 1 ? 
                ` (${Math.round((1 - duration.multiplier / (duration.id === '3_months' ? 3 : duration.id === '6_months' ? 6 : 12)) * 100)}% off)` : '';

            const durationCard = document.createElement('div');
            durationCard.className = 'duration-card';
            durationCard.dataset.duration = duration.id;
            
            durationCard.innerHTML = `
                <h4>${duration.name}</h4>
                <p class="price">${formatETB(amount)}${discount}</p>
                <p class="description">${duration.id === '1_month' ? 'Standard plan' : 'Save with longer commitment'}</p>
            `;
            
            durationContainer.appendChild(durationCard);
        });
    }

    selectDuration(durationId) {
        this.selectedDuration = durationId;
        
        // Update UI
        document.querySelectorAll('.duration-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-duration="${durationId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.showPaymentMethods();
        this.updateActionButtons();
    }

    async showPaymentMethods() {
        try {
            const response = await api.get('/api/payment-methods');
            if (!response.success) {
                showNotification('Failed to load payment methods', 'error');
                return;
            }

            const paymentMethods = response.paymentMethods;
            const paymentContainer = document.querySelector('.payment-methods');
            if (!paymentContainer) return;

            paymentContainer.innerHTML = '';
            
            Object.values(paymentMethods).forEach(method => {
                const methodCard = document.createElement('div');
                methodCard.className = 'payment-method';
                methodCard.dataset.method = method.id;
                
                methodCard.innerHTML = `
                    <div class="method-icon">
                        <i class="fas fa-${method.id === 'telebirr' ? 'mobile-alt' : 'university'}"></i>
                    </div>
                    <div class="method-info">
                        <h4>${method.name}</h4>
                        <p>${method.description}</p>
                    </div>
                `;
                
                paymentContainer.appendChild(methodCard);
            });
        } catch (error) {
            console.error('Error loading payment methods:', error);
            showNotification('Error loading payment methods', 'error');
        }
    }

    selectPaymentMethod(methodId) {
        this.selectedPaymentMethod = methodId;
        
        // Update UI
        document.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('selected');
        });
        
        const selectedMethod = document.querySelector(`[data-method="${methodId}"]`);
        if (selectedMethod) {
            selectedMethod.classList.add('selected');
        }

        this.updateActionButtons();
    }

    updateActionButtons() {
        const proceedButton = document.getElementById('btn-proceed-payment');
        if (proceedButton) {
            const canProceed = this.selectedService && this.selectedDuration && this.selectedPaymentMethod;
            proceedButton.disabled = !canProceed;
            proceedButton.style.opacity = canProceed ? '1' : '0.5';
        }
    }

    async proceedToPayment() {
        if (!this.selectedService || !this.selectedDuration || !this.selectedPaymentMethod) {
            showNotification('Please select service, duration, and payment method', 'warning');
            return;
        }

        try {
            // Calculate amount
            const response = await api.post('/api/calculate-amount', {
                basePrice: this.selectedService.price,
                duration: this.selectedDuration
            });

            if (!response.success) {
                showNotification('Error calculating amount', 'error');
                return;
            }

            const amount = response.amount;

            // Create subscription
            const subscriptionData = {
                serviceId: this.selectedService.serviceID,
                serviceName: this.selectedService.name,
                duration: this.selectedDuration,
                amount: amount,
                basePrice: this.selectedService.price,
                paymentMethod: this.selectedPaymentMethod
            };

            const subscriptionResponse = await api.post('/api/subscriptions', subscriptionData);
            if (!subscriptionResponse.success) {
                showNotification('Error creating subscription', 'error');
                return;
            }

            // Process payment
            const paymentResponse = await api.post('/api/payments', {
                subscriptionData: {
                    ...subscriptionData,
                    subscriptionId: subscriptionResponse.subscriptionId
                },
                paymentMethod: this.selectedPaymentMethod
            });

            if (!paymentResponse.success) {
                showNotification('Error processing payment', 'error');
                return;
            }

            this.showPaymentInstructions(paymentResponse.payment, subscriptionResponse.subscriptionId);

        } catch (error) {
            console.error('Error in payment process:', error);
            showNotification('Error processing payment', 'error');
        }
    }

    showPaymentInstructions(payment, subscriptionId) {
        const instructionsContainer = document.querySelector('.payment-instructions');
        if (!instructionsContainer) return;

        instructionsContainer.innerHTML = `
            <div class="payment-summary">
                <h3>Payment Instructions</h3>
                <div class="payment-details">
                    <p><strong>Service:</strong> ${this.selectedService.name}</p>
                    <p><strong>Amount:</strong> ${formatETB(payment.paymentReference)}</p>
                    <p><strong>Reference:</strong> ${payment.paymentReference}</p>
                </div>
                <div class="payment-instructions">
                    <h4>How to Pay:</h4>
                    <p>${payment.instructions}</p>
                </div>
                <div class="payment-actions">
                    <button id="btn-upload-screenshot" class="btn-primary">
                        Upload Payment Screenshot
                    </button>
                    <button class="btn-secondary" onclick="window.location.reload()">
                        Start New Subscription
                    </button>
                </div>
            </div>
        `;

        // Store subscription ID for screenshot upload
        this.currentSubscriptionId = subscriptionId;
    }

    async uploadScreenshot() {
        if (!this.currentSubscriptionId) {
            showNotification('No active subscription found', 'error');
            return;
        }

        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // Convert file to base64
                const base64 = await this.fileToBase64(file);
                
                const screenshotData = {
                    url: base64,
                    filename: file.name,
                    size: file.size
                };

                const response = await api.post(`/api/subscriptions/${this.currentSubscriptionId}/screenshot`, screenshotData);
                
                if (response.success) {
                    showNotification('Screenshot uploaded successfully! Our team will verify your payment.', 'success');
                    
                    // Update UI to show success
                    const instructionsContainer = document.querySelector('.payment-instructions');
                    if (instructionsContainer) {
                        instructionsContainer.innerHTML = `
                            <div class="payment-success">
                                <h3>✅ Payment Screenshot Uploaded</h3>
                                <p>Thank you! Our team will verify your payment and activate your subscription.</p>
                                <p>You will receive a confirmation message once verified.</p>
                                <button class="btn-primary" onclick="window.location.reload()">
                                    Start New Subscription
                                </button>
                            </div>
                        `;
                    }
                } else {
                    showNotification('Error uploading screenshot', 'error');
                }
            } catch (error) {
                console.error('Error uploading screenshot:', error);
                showNotification('Error uploading screenshot', 'error');
            }
        };

        input.click();
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

// Initialize subscription manager
let subscriptionManager;

document.addEventListener('DOMContentLoaded', function() {
    subscriptionManager = new SubscriptionManager();
});

// Utility Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);

    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
}

function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Add intersection observer for animations
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .service-card, .step, .action-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add Ethiopian Birr currency formatting
function formatETB(amount) {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Login functionality
function handleLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
    }
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

// Contact form functionality
function handleContactSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
    };

    // Validate form
    if (!contactData.name || !contactData.email || !contactData.message) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }

    if (!isValidEmail(contactData.email)) {
        showNotification('Please enter a valid email address', 'warning');
        return;
    }

    // Send contact message
    api.post('/api/support', contactData)
        .then(response => {
            if (response.success) {
                showNotification('Message sent successfully! We will get back to you soon.', 'success');
                event.target.reset();
            } else {
                showNotification('Error sending message. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error sending contact message:', error);
            showNotification('Error sending message. Please try again.', 'error');
        });
}

// Initialize contact form
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
});
