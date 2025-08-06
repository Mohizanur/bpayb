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

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Basic validation
            if (!name || !email || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Process form submission
            this.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            this.querySelector('button[type="submit"]').disabled = true;
            
            setTimeout(() => {
                // Simulate sending to server
                const contactData = {
                    name: name,
                    email: email,
                    message: message,
                    timestamp: new Date().toISOString()
                };
                
                // Store in localStorage for demo
                const contacts = JSON.parse(localStorage.getItem('birrpay_contacts') || '[]');
                contacts.push(contactData);
                localStorage.setItem('birrpay_contacts', JSON.stringify(contacts));
                
                showNotification('Thank you for your message! We will get back to you soon.', 'success');
                this.reset();
                this.querySelector('button[type="submit"]').innerHTML = 'Send Message';
                this.querySelector('button[type="submit"]').disabled = false;
            }, 2000);
        });
    }
});

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Mobile Menu Toggle (if needed for responsive design)
document.addEventListener('DOMContentLoaded', function() {
    // Add mobile menu functionality if nav becomes too crowded on small screens
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            // Scrolling down
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            navbar.style.transform = 'translateY(0)';
        }
        lastScrollY = window.scrollY;
    });
});

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
        minimumFractionDigits: 0
    }).format(amount);
}

// Update pricing display with proper formatting
document.addEventListener('DOMContentLoaded', function() {
    const priceElements = document.querySelectorAll('.duration-card p');
    
    priceElements.forEach(el => {
        const priceText = el.textContent;
        const priceMatch = priceText.match(/(\d+)/);
        
        if (priceMatch) {
            const amount = parseInt(priceMatch[1]);
            el.textContent = formatETB(amount);
        }
    });
});

// Add search functionality for services
document.addEventListener('DOMContentLoaded', function() {
    // Create search input
    const servicesHeader = document.querySelector('.services-header');
    if (servicesHeader) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.style.cssText = `
            margin: 1rem 0;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
        `;
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search services...';
        searchInput.className = 'service-search';
        searchInput.style.cssText = `
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        `;
        
        searchContainer.appendChild(searchInput);
        servicesHeader.appendChild(searchContainer);
        
        // Search functionality
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const serviceCards = document.querySelectorAll('.service-card');
            
            serviceCards.forEach(card => {
                const serviceName = card.querySelector('h3').textContent.toLowerCase();
                const serviceDesc = card.querySelector('p').textContent.toLowerCase();
                
                if (serviceName.includes(searchTerm) || serviceDesc.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
        
        searchInput.addEventListener('focus', function() {
            this.style.borderColor = '#4CAF50';
        });
        
        searchInput.addEventListener('blur', function() {
            this.style.borderColor = '#e0e0e0';
        });
    }
});
