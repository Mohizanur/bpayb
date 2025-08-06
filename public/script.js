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

// Service data
const services = [
    {
        id: 'netflix',
        name: 'Netflix',
        price: 350,
        description: 'Stream movies, TV shows and more',
        logo: '/logos/netflix.png'
    },
    {
        id: 'prime',
        name: 'Amazon Prime',
        price: 300,
        description: 'Prime Video, Music and Shopping benefits',
        logo: '/logos/prime.png'
    },
    {
        id: 'spotify',
        name: 'Spotify Premium',
        price: 250,
        description: 'Music streaming without ads',
        logo: '/logos/spotify.png'
    },
    {
        id: 'disney',
        name: 'Disney+',
        price: 280,
        description: 'Disney, Marvel, Star Wars content',
        logo: '/logos/disney.png'
    },
    {
        id: 'hulu',
        name: 'Hulu',
        price: 320,
        description: 'TV shows and movies streaming',
        logo: '/logos/hulu.png'
    },
    {
        id: 'youtube',
        name: 'YouTube Premium',
        price: 200,
        description: 'Ad-free YouTube with offline downloads',
        logo: '/logos/youtube.png'
    }
];

// Duration options
const durations = [
    { id: '1month', name: '1 Month', multiplier: 1 },
    { id: '3months', name: '3 Months', multiplier: 3 },
    { id: '6months', name: '6 Months', multiplier: 6 },
    { id: '12months', name: '12 Months', multiplier: 12 }
];

// Payment methods
const paymentMethods = [
    { id: 'cbe', name: 'Commercial Bank of Ethiopia', account: '1000123456789' },
    { id: 'telebirr', name: 'Telebirr', account: '+251912345678' },
    { id: 'amole', name: 'Amole', account: '+251912345678' }
];

// Global state
let selectedService = null;
let selectedDuration = null;
let selectedPaymentMethod = null;
let currentStep = 'services';

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

// Service Selection Functionality
document.addEventListener('DOMContentLoaded', function() {
    const serviceCards = document.querySelectorAll('.service-card');
    const durationCards = document.querySelectorAll('.duration-card');
    const paymentCards = document.querySelectorAll('.payment-method-card');
    
    // Service card selection
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all service cards
            serviceCards.forEach(c => c.classList.remove('selected'));
            
            // Add active class to clicked card
            this.classList.add('selected');
            selectedService = services.find(s => s.name === this.querySelector('h3').textContent);
            
            showDurationSelection();
        });
    });
    
    // Duration card selection
    durationCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all duration cards
            durationCards.forEach(c => c.classList.remove('selected'));
            
            // Add active class to clicked card
            this.classList.add('selected');
            const durationName = this.querySelector('h4').textContent;
            selectedDuration = durations.find(d => d.name === durationName);
            
            showPaymentSelection();
        });
    });
    
    // Payment method selection
    paymentCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all payment cards
            paymentCards.forEach(c => c.classList.remove('selected'));
            
            // Add active class to clicked card
            this.classList.add('selected');
            const methodName = this.querySelector('h4').textContent;
            selectedPaymentMethod = paymentMethods.find(p => p.name === methodName);
            
            showPaymentInstructions();
        });
    });
});

// Show duration selection
function showDurationSelection() {
    if (!selectedService) return;
    
    const durationSection = document.querySelector('.duration-selection');
    if (durationSection) {
        durationSection.style.display = 'block';
        durationSection.scrollIntoView({ behavior: 'smooth' });
        
        // Update duration cards with prices
        const durationCards = durationSection.querySelectorAll('.duration-card');
        durationCards.forEach((card, index) => {
            const duration = durations[index];
            const price = selectedService.price * duration.multiplier;
            const priceElement = card.querySelector('p');
            if (priceElement) {
                priceElement.textContent = formatETB(price);
            }
        });
    }
}

// Show payment selection
function showPaymentSelection() {
    if (!selectedService || !selectedDuration) return;
    
    const paymentSection = document.querySelector('.payment-selection');
    if (paymentSection) {
        paymentSection.style.display = 'block';
        paymentSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show payment instructions
function showPaymentInstructions() {
    if (!selectedService || !selectedDuration || !selectedPaymentMethod) return;
    
    const totalPrice = selectedService.price * selectedDuration.multiplier;
    const reference = generateReference();
    
    const instructionsSection = document.querySelector('.payment-instructions');
    if (instructionsSection) {
        instructionsSection.style.display = 'block';
        instructionsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Update payment details
        const serviceName = instructionsSection.querySelector('.service-name');
        const durationText = instructionsSection.querySelector('.duration-text');
        const priceText = instructionsSection.querySelector('.price-text');
        const referenceText = instructionsSection.querySelector('.reference-text');
        const accountInfo = instructionsSection.querySelector('.account-info');
        
        if (serviceName) serviceName.textContent = selectedService.name;
        if (durationText) durationText.textContent = selectedDuration.name;
        if (priceText) priceText.textContent = formatETB(totalPrice);
        if (referenceText) referenceText.textContent = reference;
        if (accountInfo) accountInfo.textContent = selectedPaymentMethod.account;
        
        // Show screenshot upload section
        const screenshotSection = document.querySelector('.screenshot-upload');
        if (screenshotSection) {
            screenshotSection.style.display = 'block';
        }
    }
}

// Generate unique reference number
function generateReference() {
    return 'BP' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Handle screenshot upload
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.querySelector('#screenshot-upload');
    const uploadButton = document.querySelector('#upload-button');
    const previewContainer = document.querySelector('#screenshot-preview');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select an image file (JPEG, PNG)', 'error');
                    return;
                }
                
                // Validate file size (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('File size must be less than 10MB', 'error');
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewContainer) {
                        previewContainer.innerHTML = `
                            <img src="${e.target.result}" alt="Screenshot preview" style="max-width: 200px; max-height: 200px;">
                            <p>${file.name}</p>
                        `;
                        previewContainer.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (uploadButton) {
        uploadButton.addEventListener('click', function() {
            const file = fileInput?.files[0];
            if (!file) {
                showNotification('Please select a screenshot first', 'error');
                return;
            }
            
            // Simulate upload
            uploadButton.textContent = 'Uploading...';
            uploadButton.disabled = true;
            
            setTimeout(() => {
                showNotification('Screenshot uploaded successfully! We will review your payment shortly.', 'success');
                uploadButton.textContent = 'Upload Complete';
                
                // Show next steps
                const nextSteps = document.querySelector('.next-steps');
                if (nextSteps) {
                    nextSteps.style.display = 'block';
                }
            }, 2000);
        });
    }
});

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('#contact-form');
    const loginForm = document.querySelector('#login-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            if (!name || !email || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate form submission
            showNotification('Message sent successfully! We will get back to you soon.', 'success');
            this.reset();
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const email = formData.get('email');
            const password = formData.get('password');
            
            if (!email || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate login
            showNotification('Login successful! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        });
    }
});

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#48bb78';
            break;
        case 'error':
            notification.style.backgroundColor = '#f56565';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ed8936';
            break;
        default:
            notification.style.backgroundColor = '#4299e1';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

function formatETB(amount) {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB'
    }).format(amount);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('BirrPay Web Application initialized');
    
    // Add loading states to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('btn-primary') || this.classList.contains('btn-secondary')) {
                const originalText = this.textContent;
                this.textContent = 'Loading...';
                this.disabled = true;
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });
    
    // Add hover effects to service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
    });
});
