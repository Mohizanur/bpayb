import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadI18n, getUserLang } from '../src/utils/i18n.js';
import { loadServices } from '../src/utils/loadServices.js';

describe('Bot Functionality', () => {
  describe('Internationalization (i18n)', () => {
    it('should load i18n messages', async () => {
      const i18n = await loadI18n();
      
      assert.strictEqual(typeof i18n, 'object');
      assert.strictEqual(typeof i18n.hero_title, 'object');
      assert.strictEqual(typeof i18n.hero_title.en, 'string');
      assert.strictEqual(typeof i18n.hero_title.am, 'string');
      
      // Check that we have both English and Amharic translations
      assert.strictEqual(i18n.hero_title.en.length > 0, true);
      assert.strictEqual(i18n.hero_title.am.length > 0, true);
    });

    it('should get user language with fallback', async () => {
      // Mock context objects
      const englishCtx = { from: { language_code: 'en' } };
      const amharicCtx = { from: { language_code: 'am' } };
      const unknownCtx = { from: { language_code: 'fr' } };
      const noLangCtx = { from: {} };

      const englishLang = await getUserLang(englishCtx);
      const amharicLang = await getUserLang(amharicCtx);
      const unknownLang = await getUserLang(unknownCtx);
      const noLang = await getUserLang(noLangCtx);

      assert.strictEqual(englishLang, 'en');
      assert.strictEqual(amharicLang, 'am');
      assert.strictEqual(unknownLang, 'en'); // Fallback to English
      assert.strictEqual(noLang, 'en'); // Fallback to English
    });
  });

  describe('Services Loading', () => {
    it('should load services from JSON', async () => {
      const services = await loadServices();
      
      assert.strictEqual(Array.isArray(services), true);
      assert.strictEqual(services.length > 0, true);
      
      // Check service structure
      const service = services[0];
      assert.strictEqual(typeof service.serviceID, 'string');
      assert.strictEqual(typeof service.name, 'string');
      assert.strictEqual(typeof service.price, 'number');
      assert.strictEqual(typeof service.description, 'string');
      assert.strictEqual(typeof service.logoUrl, 'string');
      
      // Check that we have the expected services
      const serviceNames = services.map(s => s.name);
      assert.strictEqual(serviceNames.includes('Netflix'), true);
      assert.strictEqual(serviceNames.includes('Amazon Prime'), true);
      assert.strictEqual(serviceNames.includes('Spotify Premium'), true);
    });

    it('should have valid price values', async () => {
      const services = await loadServices();
      
      services.forEach(service => {
        assert.strictEqual(typeof service.price, 'number');
        assert.strictEqual(service.price > 0, true);
        assert.strictEqual(service.price < 1000, true); // Reasonable price range
      });
    });

    it('should have valid logo paths', async () => {
      const services = await loadServices();
      
      services.forEach(service => {
        assert.strictEqual(typeof service.logoUrl, 'string');
        assert.strictEqual(service.logoUrl.startsWith('/'), true);
        assert.strictEqual(service.logoUrl.includes('logos/'), true);
      });
    });
  });

  describe('Bot Message Formatting', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (amount) => `${amount} ETB`;
      
      assert.strictEqual(formatCurrency(350), '350 ETB');
      assert.strictEqual(formatCurrency(1000), '1000 ETB');
      assert.strictEqual(formatCurrency(0), '0 ETB');
    });

    it('should format subscription duration', () => {
      const formatDuration = (months) => {
        if (months === 1) return '1 month';
        return `${months} months`;
      };
      
      assert.strictEqual(formatDuration(1), '1 month');
      assert.strictEqual(formatDuration(3), '3 months');
      assert.strictEqual(formatDuration(12), '12 months');
    });

    it('should create service selection keyboard', async () => {
      const services = await loadServices();
      
      // Simulate keyboard creation
      const keyboard = services.map(service => [{
        text: `${service.name} - ${service.price} ETB`,
        callback_data: `service_${service.serviceID}`
      }]);
      
      assert.strictEqual(Array.isArray(keyboard), true);
      assert.strictEqual(keyboard.length > 0, true);
      
      // Check keyboard button structure
      const button = keyboard[0][0];
      assert.strictEqual(typeof button.text, 'string');
      assert.strictEqual(typeof button.callback_data, 'string');
      assert.strictEqual(button.callback_data.startsWith('service_'), true);
    });
  });

  describe('User Session Management', () => {
    it('should create user session object', () => {
      const createUserSession = (userId) => ({
        userId,
        currentStep: 'start',
        selectedService: null,
        selectedDuration: null,
        paymentMethod: null,
        createdAt: new Date()
      });
      
      const session = createUserSession('123456');
      
      assert.strictEqual(session.userId, '123456');
      assert.strictEqual(session.currentStep, 'start');
      assert.strictEqual(session.selectedService, null);
      assert.strictEqual(session.selectedDuration, null);
      assert.strictEqual(session.paymentMethod, null);
      assert.strictEqual(session.createdAt instanceof Date, true);
    });

    it('should validate phone number format', () => {
      const validatePhone = (phone) => {
        const phoneRegex = /^\+251[0-9]{9}$/;
        return phoneRegex.test(phone);
      };
      
      assert.strictEqual(validatePhone('+251912345678'), true);
      assert.strictEqual(validatePhone('+251987654321'), true);
      assert.strictEqual(validatePhone('251912345678'), false); // Missing +
      assert.strictEqual(validatePhone('+25191234567'), false); // Too short
      assert.strictEqual(validatePhone('+2519123456789'), false); // Too long
      assert.strictEqual(validatePhone('+1234567890'), false); // Wrong country code
    });

    it('should validate email format', () => {
      const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };
      
      assert.strictEqual(validateEmail('test@example.com'), true);
      assert.strictEqual(validateEmail('user.name@domain.co.uk'), true);
      assert.strictEqual(validateEmail('invalid.email'), false);
      assert.strictEqual(validateEmail('@domain.com'), false);
      assert.strictEqual(validateEmail('user@'), false);
    });
  });

  describe('Payment Processing', () => {
    it('should calculate subscription total', () => {
      const calculateTotal = (price, duration, discount = 0) => {
        const subtotal = price * duration;
        const discountAmount = subtotal * (discount / 100);
        return subtotal - discountAmount;
      };
      
      assert.strictEqual(calculateTotal(350, 1), 350);
      assert.strictEqual(calculateTotal(350, 3), 1050);
      assert.strictEqual(calculateTotal(350, 12), 4200);
      assert.strictEqual(calculateTotal(350, 3, 10), 945); // 10% discount
    });

    it('should generate payment reference', () => {
      const generateReference = (userId, serviceId) => {
        const timestamp = Date.now();
        return `BP_${userId}_${serviceId}_${timestamp}`.substring(0, 20);
      };
      
      const ref = generateReference('123456', 'netflix');
      
      assert.strictEqual(typeof ref, 'string');
      assert.strictEqual(ref.startsWith('BP_'), true);
      assert.strictEqual(ref.includes('123456'), true);
      assert.strictEqual(ref.includes('netflix'), true);
      assert.strictEqual(ref.length <= 20, true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      const getUserDisplayName = (user) => {
        if (!user) return 'Unknown User';
        return user.first_name || user.username || 'User';
      };
      
      assert.strictEqual(getUserDisplayName(null), 'Unknown User');
      assert.strictEqual(getUserDisplayName(undefined), 'Unknown User');
      assert.strictEqual(getUserDisplayName({}), 'User');
      assert.strictEqual(getUserDisplayName({ first_name: 'John' }), 'John');
      assert.strictEqual(getUserDisplayName({ username: 'john_doe' }), 'john_doe');
      assert.strictEqual(getUserDisplayName({ first_name: 'John', username: 'john_doe' }), 'John');
    });

    it('should handle API errors gracefully', async () => {
      const safeApiCall = async (apiFunction) => {
        try {
          return await apiFunction();
        } catch (error) {
          console.error('API Error:', error.message);
          return { success: false, error: error.message };
        }
      };
      
      const failingApi = async () => {
        throw new Error('Network error');
      };
      
      const result = await safeApiCall(failingApi);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Network error');
    });
  });
});