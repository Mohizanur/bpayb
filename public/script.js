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

// Service Selection Functionality
document.addEventListener('DOMContentLoaded', function() {
    const serviceCards = document.querySelectorAll('.service-card');
    const durationCards = document.querySelectorAll('.duration-card');
    let selectedService = null;
    let selectedDuration = null;
    
    // Service card selection
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all service cards
            serviceCards.forEach(c => c.classList.remove('selected'));
            
            // Add active class to clicked card
            this.classList.add('selected');
            selectedService = this.querySelector('h3').textContent;
            
            updateActionButtons();
        });
    });
    
    // Duration card selection
    durationCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all duration cards
            durationCards.forEach(c => c.classList.remove('selected'));
            
            // Add active class to clicked card
            this.classList.add('selected');
            selectedDuration = {
                period: this.querySelector('h4').textContent,
                price: this.querySelector('p').textContent
            };
            
            updateActionButtons();
        });
    });
    
    function updateActionButtons() {
        const startNewBtn = document.querySelector('.action-card .btn-primary');
        const renewBtn = document.querySelector('.action-card .btn-secondary');
        
        if (selectedService && selectedDuration) {
            startNewBtn.textContent = `Start ${selectedService} - ${selectedDuration.price}`;
            renewBtn.textContent = `Renew ${selectedService} - ${selectedDuration.price}`;
        }
    }
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
            
            // Simulate form submission
            showNotification('Thank you for your message! We will get back to you soon.', 'success');
            this.reset();
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

// Add loading animation for buttons
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Don't add loading to navigation buttons
            if (this.closest('.nav-actions') || this.getAttribute('href')) {
                return;
            }
            
            const originalText = this.textContent;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Simulate processing time
            setTimeout(() => {
                this.disabled = false;
                this.textContent = originalText;
            }, 2000);
        });
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
});
