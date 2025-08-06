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
