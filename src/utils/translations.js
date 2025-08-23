// Comprehensive translations for BirrPay Bot
const translations = {
  // Phone verification messages
  phone_verification: {
    required: {
      en: '📱 Phone Verification Required\n\nTo use BirrPay services, you need to verify your phone number.\n\nPlease verify your phone number by clicking the button below.',
      am: '📱 የተልፍዎን መረጃ አስፈላጊ\n\nየBirrPay አገልግሎቶችን ለመጠቀም የተልፍዎን መረጃ አስፈላጊ።\n\nእባክዎ ከታች ያለውን ቁልፍ በመጫን የስልክ ቁጥርዎን ያረጋግጡ።'
    },
    verify_button: {
      en: '📱 Verify My Number',
      am: '📱 ስልክ ቁጥሬን ለማረጋገጥ'
    },
    request_contact: {
      en: '📱 Phone Verification\n\nPlease tap the button below to share your contact for verification.\n\nNote: This is only used to verify your phone number.',
      am: '📱 የተልፍዎን ማረጋገጫ\n\nእባክዎ የተልፍዎን መረጃ ለማረጋገጥ ከታች ያለውን ቁልፍ በመጫን እውቂያዎን ያጋሩ።\n\nአስፈላጊ: ይህ የሚያስፈልገው የእርስዎን ስልክ ቁጥር ለማረጋገጥ ብቻ ነው።'
    },
    share_contact: {
      en: '📱 Share Contact',
      am: '📱 እውቂያ ማጋራት'
    },
    manual_input: {
      en: '✍️ Type Manually',
      am: '✍️ በእጅ መፃፍ'
    },
    manual_prompt: {
      en: '📱 Please enter your phone number (+1234567890):',
      am: '📱 እባክዎ የስልክ ቁጥርዎን ያስገቡ (+1234567890):'
    },
    invalid_format: {
      en: '⚠️ Please use a valid phone number format (+1234567890)',
      am: '⚠️ እባክዎ ትክክለኛ የስልክ ቁጥር ይጠቀሙ (+1234567890)'
    },
    verified_success: {
      en: '✅ Your phone number has been verified! You can now use our services.',
      am: '✅ የስልክ ቁጥርዎ ተረጋግጧል! አሁን አገልግሎቶችን መጠቀም ይችላሉ።'
    },
    back_button: {
      en: '🔙 Back',
      am: '🔙 ወደ ኋላ'
    }
  },

  // Welcome messages
  welcome: {
    title: {
      en: '🎉 Welcome to BirrPay!',
      am: '🎉 እንኳን ወደ BirrPay በደህና መጡ!'
    },
    subtitle: {
      en: '🌟 **Ethiopia\'s #1 Subscription Platform**',
      am: '🌟 **የኢትዮጵያ #1 የሳብስክሪፕሽን ፕላትፎርም**'
    },
    description: {
      en: 'Ethiopia\'s Premier Subscription Hub.\n\nPlease use the button below to subscribe to services.',
      am: 'የኢትዮጵያ ዋና የማስተካል አገልግሎት።\n\nአገልግሎቶችን ለመመዝገብ እባክዎ ከታች ያለውን አዝራር ይጠቀሙ።'
    },
    verified_welcome: {
      en: '✅ **Phone Number Verified!**\n\n{phone} has been successfully verified. You can now use all BirrPay services.\n\n✨ **What You Can Do:**\n• Access Netflix, Amazon Prime, Spotify, and more\n• Pay easily using Ethiopian Birr\n• Manage all subscriptions from one place\n• Get 24/7 customer support\n\n🔒 **100% Secure** | 🇪🇹 **Local Support** | ⚡ **Fast & Easy**',
      am: '✅ **ስልክ ቁጥርዎ ተረጋግጧል!**\n\n{phone} በተሳካ ሁኔታ ተረጋግጧል። አሁን የBirrPay አገልግሎቶችን መጠቀም ይችላሉ።\n\n✨ **ምን ማድረግ ይችላሉ:**\n• Netflix, Amazon Prime, Spotify እና ሌሎችንም ያግኙ\n• በብር በቀላሉ ይክፈሉ\n• ሁሉንም ሳብስክሪፕሽኖችዎን በአንድ ቦታ ያስተዳድሩ\n• 24/7 የደንበኞች ድጋፍ ያግኙ\n\n🔒 **100% ደህንነቱ የተጠበቀ** | 🇪🇹 **የአካባቢ ድጋፍ** | ⚡ **ፈጣን እና ቀላል**'
    }
  },

  // Menu buttons
  menu: {
    view_services: {
      en: '🛍️ View Services',
      am: '🛍️ አገልግሎቶችን ይመልከቱ'
    },
    my_subscriptions: {
      en: '📊 My Subscriptions',
      am: '📊 የእኔ መዋቅሮች'
    },
    help: {
      en: '❓ Help',
      am: '❓ እርዳታ'
    },
    support: {
      en: '📞 Support',
      am: '📞 ድጋፍ'
    },
    language: {
      en: '🌐 Language',
      am: '🌐 ቋንቋ'
    },
    back_to_menu: {
      en: '🏠 Back to Menu',
      am: '🏠 ወደ ምናሌ ተመለስ'
    }
  },

  // Language settings
  language: {
    settings_title: {
      en: '🌐 **Language Settings**\n\nCurrent language: {current}\n\nPlease select your preferred language:',
      am: '🌐 **የቋንቋ ማስተካከያ**\n\nአሁን ያለው ቋንቋዎ: {current}\n\nእባክዎ የሚፈልጉትን ቋንቋ ይምረጡ:'
    },
    english: {
      en: '🇺🇸 English',
      am: '🇺🇸 English'
    },
    amharic: {
      en: '🇪🇹 Amharic',
      am: '🇪🇹 አማርኛ'
    },
    switched_en: {
      en: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.',
      am: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.'
    },
    switched_am: {
      en: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።',
      am: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።'
    }
  },

  // Admin messages
  admin: {
    access_denied: {
      en: '❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.',
      am: '❌ **መዳረሻ ተከልክሏል**\n\nይህ ትዕዛዝ ለተፈቀደላቸው አስተዳደሪዎች ብቻ ነው።'
    },
    dashboard_title: {
      en: '🌟 **BirrPay Admin Dashboard** 🌟',
      am: '🌟 **የBirrPay አስተዳደሪ ዳሽቦርድ** 🌟'
    },
    welcome_admin: {
      en: '👋 **Welcome back, Administrator!**',
      am: '👋 **እንኳን ደህና መጡ፣ አስተዳደሪ!**'
    },
    analytics_title: {
      en: '📊 **Real-Time Analytics**',
      am: '📊 **የቅጽበት ትንተና**'
    },
    users_total: {
      en: '👥 **Users:** {count} total',
      am: '👥 **ተጠቃሚዎች:** {count} ጠቅላላ'
    },
    users_verified: {
      en: '✅ **Verified:** {count} users',
      am: '✅ **ተረጋግጧል:** {count} ተጠቃሚዎች'
    },
    subscriptions: {
      en: '📱 **Subscriptions:** {count} active',
      am: '📱 **ምዝገባዎች:** {count} ንቁ'
    },
    payments: {
      en: '💳 **Payments:** {count} total',
      am: '💳 **ክፍያዎች:** {count} ጠቅላላ'
    },
    services: {
      en: '🛍️ **Services:** {count} available',
      am: '🛍️ **አገልግሎቶች:** {count} ይገኛሉ'
    }
  },

  // Error messages
  errors: {
    generic: {
      en: '❌ An error occurred. Please try again.',
      am: '❌ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
    },
    verification_failed: {
      en: '❌ Error occurred during verification. Please try again.',
      am: '❌ በማረጋገጫ ሂደት ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
    },
    language_change_failed: {
      en: '❌ Error changing language',
      am: '❌ ቋንቋ ለመቀየር ስህተት'
    },
    admin_panel_error: {
      en: '❌ Error loading admin panel. Please try again.',
      am: '❌ የአስተዳደሪ ፓነል ለመጫን ስህተት። እባክዎ እንደገና ይሞክሩ።'
    }
  },

  // Success messages
  success: {
    language_updated: {
      en: '✅ Language updated successfully!',
      am: '✅ ቋንቋ በተሳካ ሁኔታ ተሻሽሏል!'
    },
    phone_verified: {
      en: '✅ Phone number verified successfully!',
      am: '✅ የስልክ ቁጥር በተሳካ ሁኔታ ተረጋግጧል!'
    }
  }
};

// Helper function to get translation
export const t = (key, language = 'en') => {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key; // Return the key if translation not found
    }
  }
  
  if (typeof value === 'string') {
    return value;
  } else if (value && value[language]) {
    return value[language];
  } else if (value && value.en) {
    return value.en; // Fallback to English
  }
  
  return key; // Return the key if no translation found
};

// Helper function to get user language
export const getUserLanguage = (ctx) => {
  // This should be called after user data is loaded
  // For now, return default language
  return ctx.userLang || 'en';
};

// Helper function to format translation with variables
export const tf = (key, language = 'en', variables = {}) => {
  let text = t(key, language);
  
  // Replace variables in the format {variable}
  for (const [varName, varValue] of Object.entries(variables)) {
    text = text.replace(new RegExp(`{${varName}}`, 'g'), varValue);
  }
  
  return text;
};

export default translations;
