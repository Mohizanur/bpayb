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
  },

  // Flat keys for backward compatibility
  welcome_title: {
    en: '🎉 Welcome to BirrPay!',
    am: '🎉 እንኳን ወደ BirrPay በደህና መጡ!'
  },
  welcome_description: {
    en: 'Ethiopia\'s Premier Subscription Hub.\n\nPlease use the button below to subscribe to services.',
    am: 'የኢትዮጵያ ዋና የማስተካል አገልግሎት።\n\nአገልግሎቶችን ለመመዝገብ እባክዎ ከታች ያለውን አዝራር ይጠቀሙ።'
  },
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
  },
  language_settings: {
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
  language_switched_en: {
    en: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.',
    am: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.'
  },
  language_switched_am: {
    en: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።',
    am: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።'
  },
  access_denied: {
    en: '❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.',
    am: '❌ **መዳረሻ ተከልክሏል**\n\nይህ ትዕዛዝ ለተፈቀደላቸው አስተዳደሪዎች ብቻ ነው።'
  },
  admin_dashboard: {
    en: '🌟 **BirrPay Admin Dashboard** 🌟',
    am: '🌟 **የBirrPay አስተዳደሪ ዳሽቦርድ** 🌟'
  },
  welcome_admin: {
    en: '👋 **Welcome back, Administrator!**',
    am: '👋 **እንኳን ደህና መጡ፣ አስተዳደሪ!**'
  },
  real_time_analytics: {
    en: '📊 **Real-Time Analytics**',
    am: '📊 **የቅጽበት ትንተና**'
  },
  total_users: {
    en: '👥 **Users:** {count} total',
    am: '👥 **ተጠቃሚዎች:** {count} ጠቅላላ'
  },
  verified_users: {
    en: '✅ **Verified:** {count} users',
    am: '✅ **ተረጋግጧል:** {count} ተጠቃሚዎች'
  },
  active_subscriptions: {
    en: '📱 **Subscriptions:** {count} active',
    am: '📱 **ምዝገባዎች:** {count} ንቁ'
  },
  total_payments: {
    en: '💳 **Payments:** {count} total',
    am: '💳 **ክፍያዎች:** {count} ጠቅላላ'
  },
  available_services: {
    en: '🛍️ **Services:** {count} available',
    am: '🛍️ **አገልግሎቶች:** {count} ይገኛሉ'
  },
  telegram_admin_panel: {
    en: '📱 **Admin Panel:** Use /admin command in Telegram',
    am: '📱 **አስተዳደር ፓነል:** በTelegram ውስጥ /admin ትዕዛዝ ይጠቀሙ'
  },
  management_center: {
    en: '🔧 **Management Center** - Complete control over your platform',
    am: '🔧 **የአስተዳደር ማዕከል** - በፕላትፎርምዎ ላይ ሙሉ ቁጥጥር'
  },
  users: {
    en: '👥 Users',
    am: '👥 ተጠቃሚዎች'
  },
  subscriptions: {
    en: '📱 Subscriptions',
    am: '📱 ምዝገባዎች'
  },
  manage_services: {
    en: '🛍️ Manage Services',
    am: '🛍️ አገልግሎቶችን ያስተዳድሩ'
  },
  add_service: {
    en: '➕ Add Service',
    am: '➕ አገልግሎት አክል'
  },
  payment_methods: {
    en: '💳 Payments',
    am: '💳 ክፍያዎች'
  },
  performance: {
    en: '📊 Performance',
    am: '📊 አድማስ'
  },
  broadcast_message: {
    en: '📢 Broadcast',
    am: '📢 ድምጽ ማሰራጫ'
  },
  refresh_panel: {
    en: '🔄 Refresh',
    am: '🔄 አድስ'
  },
  error_loading_admin: {
    en: '❌ Error loading admin panel. Please try again.',
    am: '❌ የአስተዳደሪ ፓነል ለመጫን ስህተት። እባክዎ እንደገና ይሞክሩ።'
  },
  error_changing_language: {
    en: '❌ Error changing language',
    am: '❌ ቋንቋ ለመቀየር ስህተት'
  },
  error_language_settings: {
    en: '❌ Error loading language settings',
    am: '❌ የቋንቋ ማስተካከያዎችን ለመጫን ስህተት'
  },
  error_returning_menu: {
    en: '❌ Error returning to menu',
    am: '❌ ወደ ምናሌ ለመመለስ ስህተት'
  },
  error_loading_services: {
    en: '❌ Error loading services',
    am: '❌ አገልግሎቶችን ለመጫን ስህተት'
  },
  error_loading_page: {
    en: '❌ Error loading page',
    am: '❌ ገጽን ለመጫን ስህተት'
  },
  no_services: {
    en: '❌ No services found.',
    am: '❌ ምንም አገልግሎቶች አልተገኙም።'
  },
  back_to_admin: {
    en: '🔙 Back to Admin',
    am: '🔙 ወደ አስተዳደሪ ተመለስ'
  },
  services_title: {
    en: '🛍️ **Service Management**',
    am: '🛍️ **የአገልግሎት አስተዳደር**'
  },
  service_price: {
    en: 'Price: {price}',
    am: 'ዋጋ: {price}'
  },
  service_id: {
    en: 'ID: {id}',
    am: 'መለያ: {id}'
  },
  pagination_info: {
    en: '📄 Page {current} of {total}',
    am: '📄 ገጽ {current} ከ {total}'
  },
  previous_page: {
    en: '⬅️ Previous',
    am: '⬅️ ቀዳሚ'
  },
  next_page: {
    en: 'Next ➡️',
    am: 'ቀጣይ ➡️'
  },

  // Admin buttons and messages
  admin_panel: {
    en: '🔧 Admin Panel',
    am: '🔧 አስተዳደሪ ፓነል'
  },
  cancel: {
    en: '❌ Cancel',
    am: '❌ ሰርዝ'
  },
  confirm: {
    en: '✅ Confirm',
    am: '✅ አረጋግጥ'
  },
  save: {
    en: '💾 Save',
    am: '💾 አስቀምጥ'
  },
  back: {
    en: '🔙 Back',
    am: '🔙 ወደ ኋላ'
  },
  refresh: {
    en: '🔄 Refresh',
    am: '🔄 አድስ'
  },
  try_again: {
    en: '🔄 Try Again',
    am: '🔄 እንደገና ሞክር'
  },
  skip: {
    en: '⏭️ Skip',
    am: '⏭️ አልፋ'
  },
  start: {
    en: '🚀 Start',
    am: '🚀 ጀምር'
  },
  add: {
    en: '➕ Add',
    am: '➕ አክል'
  },
  edit: {
    en: '✏️ Edit',
    am: '✏️ አስተካክል'
  },
  delete: {
    en: '🗑️ Delete',
    am: '🗑️ ሰርዝ'
  },
  view: {
    en: '👁️ View',
    am: '👁️ ተመልከት'
  },
  all: {
    en: '👥 All',
    am: '👥 ሁሉም'
  },
  active: {
    en: '🟢 Active',
    am: '🟢 ንቁ'
  },
  pending: {
    en: '🟡 Pending',
    am: '🟡 በመጠበቅ ላይ'
  },
  banned: {
    en: '🔴 Banned',
    am: '🔴 ተከልክሏል'
  },
  premium: {
    en: '⭐ Premium',
    am: '⭐ ፕሪሚየም'
  },
  custom_requests: {
    en: '🎯 Custom Requests',
    am: '🎯 ራስ ሰር ጥያቄዎች'
  },
  pending_requests: {
    en: '📋 Pending Requests',
    am: '📋 የሚጠበቁ ጥያቄዎች'
  },
  request_history: {
    en: '📊 Request History',
    am: '📊 የጥያቄ ታሪክ'
  },
  add_payment_method: {
    en: '➕ Add Payment Method',
    am: '➕ የክፍያ ዘዴ አክል'
  },
  edit_payment_methods: {
    en: '✏️ Edit Payment Methods',
    am: '✏️ የክፍያ ዘዴዎችን አስተካክል'
  },
  toggle_payment_methods: {
    en: '🔄 Toggle Method Status',
    am: '🔄 የዘዴ ሁኔታ ቀይር'
  },
  back_to_payment_methods: {
    en: '🔙 Back to Payment Methods',
    am: '🔙 ወደ የክፍያ ዘዴዎች ተመለስ'
  },
  back_to_edit_methods: {
    en: '🔙 Back to Edit Methods',
    am: '🔙 ወደ ዘዴዎች አስተካክል ተመለስ'
  },
  back_to_subscriptions: {
    en: '🔙 Back to Subscriptions',
    am: '🔙 ወደ ምዝገባዎች ተመለስ'
  },
  back_to_services: {
    en: '🔙 Back to Services',
    am: '🔙 ወደ አገልግሎቶች ተመለስ'
  },
  back_to_requests: {
    en: '⬅️ Back to Requests',
    am: '⬅️ ወደ ጥያቄዎች ተመለስ'
  },
  back_to_custom_plans: {
    en: '🔙 Back to Custom Plans',
    am: '🔙 ወደ ራስ ሰር ዕቅዶች ተመለስ'
  },
  start_adding_service: {
    en: '🚀 Start Adding Service',
    am: '🚀 አገልግሎት ማክል ጀምር'
  },
  confirm_save: {
    en: '✅ Confirm & Save',
    am: '✅ አረጋግጥ እና አስቀምጥ'
  },
  add_another_service: {
    en: '➕ Add Another Service',
    am: '➕ ሌላ አገልግሎት አክል'
  },
  add_first_service: {
    en: '➕ Add First Service',
    am: '➕ የመጀመሪያ አገልግሎት አክል'
  },
  add_new_service: {
    en: '➕ Add New Service',
    am: '➕ አዲስ አገልግሎት አክል'
  },
  skip_logo: {
    en: '⏭️ Skip Logo',
    am: '⏭️ ስራ አልፋ'
  },
  start_broadcast: {
    en: '📝 Start Broadcast',
    am: '📝 ድምጽ ማሰራጫ ጀምር'
  },
  refresh_stats: {
    en: '🔄 Refresh Stats',
    am: '🔄 ስታትስ አድስ'
  },
  service_analytics: {
    en: '📊 Service Analytics',
    am: '📊 የአገልግሎት ትንተና'
  },
  growth_metrics: {
    en: '📈 Growth Metrics',
    am: '📈 የእድገት መለኪያዎች'
  },
  view_all_requests: {
    en: '📋 View All Requests',
    am: '📋 ሁሉንም ጥያቄዎች ተመልከት'
  },
  main_menu: {
    en: '🏠 Main Menu',
    am: '🏠 ዋና ምናሌ'
  },
  back_to_all_users: {
    en: '🔙 Back to All Users',
    am: '🔙 ወደ ሁሉም ተጠቃሚዎች ተመለስ'
  },
  back_to_admin: {
    en: '🔙 Back to Admin',
    am: '🔙 ወደ አስተዳደሪ ተመለስ'
  },
  back_to_admin_panel: {
    en: '⬅️ Back to Admin',
    am: '⬅️ ወደ አስተዳደሪ ተመለስ'
  },
  web_admin: {
    en: '🌐 Web Admin',
    am: '🌐 ድህረ ገጽ አስተዳደሪ'
  },
  broadcast_message: {
    en: '💬 Broadcast Message',
    am: '💬 ድምጽ ማሰራጫ መልእክት'
  },
  refresh_panel: {
    en: '🔄 Refresh Panel',
    am: '🔄 ፓነል አድስ'
  },
  active_subscriptions: {
    en: '🟢 Active Subscriptions',
    am: '🟢 ንቁ ምዝገባዎች'
  },
  pending_payments: {
    en: '🟡 Pending Payments',
    am: '🟡 የሚጠበቁ ክፍያዎች'
  },
  payment_methods: {
    en: '💳 Payment Methods',
    am: '💳 የክፍያ ዘዴዎች'
  },
  performance: {
    en: '📊 Performance',
    am: '📊 አድማስ'
  },
  users: {
    en: '👥 Users',
    am: '👥 ተጠቃሚዎች'
  },
  subscriptions: {
    en: '📊 Subscriptions',
    am: '📊 ምዝገባዎች'
  },
  manage_services: {
    en: '🛍️ Manage Services',
    am: '🛍️ አገልግሎቶችን ያስተዳድሩ'
  },
  add_service: {
    en: '➕ Add Service',
    am: '➕ አገልግሎት አክል'
  },
  select_services: {
    en: '📱 Select Services',
    am: '📱 አገልግሎቶች ይምረጡ'
  },
  new_subscription: {
    en: '📱 New Subscription',
    am: '📱 አዲስ ምዝገባ'
  },
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
  },
  verify_my_number: {
    en: '📱 Verify My Number',
    am: '📱 ስልክ ቁጥሬን ለማረጋገጥ'
  },
  share_contact: {
    en: '📱 Share Contact',
    am: '📱 እውቂያ ማጋራት'
  },
  type_manually: {
    en: '✍️ Type Manually',
    am: '✍️ በእጅ መፃፍ'
  },
  lets_get_started: {
    en: "🚀 Let's Get Started!",
    am: "🚀 እንጀምር!"
  },
  services: {
    en: '🚀 Services',
    am: '🚀 አገልግሎቶች'
  },
  pricing: {
    en: '💰 Pricing',
    am: '💰 የዋጋ አሰጣጥ'
  },
  payment_methods_menu: {
    en: '💳 Payment Methods',
    am: '💳 የክፍያ ዘዴዎች'
  },
  how_it_works: {
    en: '❓ How It Works',
    am: '❓ እንዴት እንደሚሰራ'
  },
  terms: {
    en: '📜 Terms',
    am: '📜 የአገልግሎት ደረጃዎች'
  },
  about: {
    en: 'ℹ️ About',
    am: 'ℹ️ መረጃ'
  },
  community_tutorial: {
    en: '👥 Community & Tutorial',
    am: '👥 ማህበረሰብ እና ትምህርት'
  },
  // Service subscription translations
  selected: {
    en: 'selected',
    am: 'የተመረጠ'
  },
  choose_subscription_duration: {
    en: 'Please choose your subscription duration:',
    am: 'እባክዎ የምትፈልጉትን የደንበኝነት ምዝገባ ዓይነት ይምረጥ:'
  },
  month: {
    en: 'Month',
    am: 'ወር'
  },
  months: {
    en: 'Months',
    am: 'ወራት'
  },
  year: {
    en: 'Year',
    am: 'አመት'
  },
  birr: {
    en: 'ETB',
    am: 'ብር'
  },
  request_custom_plan: {
    en: '🎯 Request Custom Plan',
    am: '🎯 ብጁ እቅድ ይጠይቁ'
  },
  price: {
    en: 'Price',
    am: 'ዋጋ'
  },
  proceed_with_subscription: {
    en: 'Do you want to proceed with this subscription?',
    am: 'ይህን የደንበኝነት ምዝገባ መግዛት ይፈልጋሉ?'
  },
  yes: {
    en: '✅ Yes',
    am: '✅ አዎ'
  },
  no: {
    en: '❌ No',
    am: '❌ አይ'
  },
  // Additional subscribe handler translations
  service_not_found: {
    en: 'Service not found',
    am: 'አገልግሎት አልተገኘም'
  },
  error_occurred: {
    en: 'An error occurred',
    am: 'ስህተት ተፈጥሯል'
  },
  upload_payment_proof: {
    en: '📤 Upload Payment Proof',
    am: '📤 የክፍያ ማስረጃ አስገባ'
  },
  main_page: {
    en: '🏠 Main Menu',
    am: '🏠 ዋና ገጽ'
  },
  subscription_confirmed: {
    en: '✅ Subscription Confirmed!',
    am: '✅ የደንበኝነት ምዝገባ ተረጋግጧል!'
  },
  payment_instructions: {
    en: 'Please upload a screenshot or photo of your payment proof.',
    am: 'እባክዎ የክፍያዎ ማስረጃ ስክሪንሾት ወይም ፎቶ ይላኩ።'
  },
  payment_instructions_title: {
    en: 'Payment Instructions',
    am: 'የክፍያ መመሪያዎች'
  },
  service: {
    en: 'Service',
    am: 'አገልግሎት'
  },
  duration: {
    en: 'Duration',
    am: 'ቆይታ'
  },
  total_amount: {
    en: 'Total Amount',
    am: 'ጠቅላላ ዋጋ'
  },
  payment_accounts_instruction: {
    en: 'Please make payment to any of the following accounts',
    am: 'ክፍያ ለማድረግ ወደሚከተሉት አካውንቶች ገንዘብ ያስተላልፉ'
  },
  payment_proof_instruction: {
    en: 'After payment, please send a screenshot or receipt as proof.',
    am: 'ክፍያ ካደረጉ በኋላ የክፍያ ማረጋገጫ ስክሪንሾት ወይም ሪሲት ይላኩ።'
  },
  service_start_after_approval: {
    en: 'Your service will start after admin approves your payment.',
    am: 'አስተናጋጁ ክፍያዎን ከፀደቀ በኋላ አገልግሎቱ ይጀምራል።'
  },
  upload_payment_proof_title: {
    en: 'Upload Payment Proof',
    am: 'የክፍያ ማስረጃ ይላኩ'
  },
  upload_payment_proof_instruction: {
    en: 'Please send a screenshot or photo of your payment receipt.',
    am: 'እባክዎ የክፍያ ማስረጃዎን (ስክሪንሾት ወይም ሪሲት) ይላኩ።'
  },
  click_cancel_to_cancel: {
    en: 'Click /cancel to cancel.',
    am: 'ለማሰረዝ /cancel ይጫኑ።'
  },
  no_subscriptions_yet: {
    en: 'You don\'t have any subscriptions yet. To start a new subscription, please select a service:',
    am: 'እስካሁን ምንም ምዝገባዎች የሉዎትም። አዲስ ምዝገባ ለመጀመር እባክዎ አገልግሎቶችን ይምረጡ:'
  },
  select_services: {
    en: '📱 Select Services',
    am: '📱 አገልግሎቶች ይምረጡ'
  },
  pending: {
    en: 'Pending',
    am: 'የሚጠበቅ'
  },
  active: {
    en: 'Active',
    am: 'ንቁ'
  },
  cancelled: {
    en: 'Cancelled',
    am: 'የተሰረዘ'
  },
  rejected: {
    en: 'Rejected',
    am: 'የተቀበለ'
  },
  view_your_subscriptions: {
    en: 'View your subscriptions',
    am: 'የምዝገባዎችዎን ያሳዩ'
  },
  new_subscription: {
    en: '📱 New Subscription',
    am: '📱 አዲስ ምዝገባ'
  },
  refresh: {
    en: '🔄 Refresh',
    am: '🔄 እንደገና ጫን'
  },
  error_loading_subscriptions: {
    en: '❌ Error loading subscriptions. Please try again.',
    am: '❌ ምዝገባዎችን ማሳየት ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
  },
  subscription_not_found: {
    en: 'Subscription not found',
    am: 'ምዝገባ አልተገኘም'
  },
  completed: {
    en: 'Completed',
    am: 'ተሟልቷል'
  },
  failed: {
    en: 'Failed',
    am: 'ውድቅ ሆነ'
  },
  subscription_details: {
    en: 'Subscription Details',
    am: 'የምዝገባ ዝርዝር'
  },
  amount: {
    en: 'Amount',
    am: 'መጠን'
  },
  status: {
    en: 'Status',
    am: 'ሁኔታ'
  },
  payment_status: {
    en: 'Payment Status',
    am: 'የክፍያ ሁኔታ'
  },
  payment_reference: {
    en: 'Payment Reference',
    am: 'የክፍያ ማጣቀሻ'
  },
  not_available: {
    en: 'Not Available',
    am: 'አልተገኘም'
  },
  created: {
    en: 'Created',
    am: 'የተፈጠረበት ቀን'
  },
  rejection_reason: {
    en: 'Rejection Reason',
    am: 'የመቀበል ምክንያት'
  },
  upload_screenshot: {
    en: '📸 Upload Screenshot',
    am: '📸 ስክሪንሾት ያስገቡ'
  },
  cancel_subscription: {
    en: '❌ Cancel Subscription',
    am: '❌ ምዝገባ ያስተሳስሩ'
  },
  subscription_created: {
    en: 'Your subscription has been created successfully!',
    am: 'የደንበኝነት ምዝገባዎ በተሳካም ሁኔታ ተፈጥሯል!'
  },
  // Services handler translations
  no_services_available: {
    en: 'No services are currently available. Please try again later.',
    am: 'ምንም አገልግሎት አልተገኘም። እባክዎ በኋላ ይሞክሩ።'
  },
  back_to_menu: {
    en: '⬅️ Back to Menu',
    am: '⬅️ ወደ ሜኑ ተመለስ'
  },
  view_plans: {
    en: '💳 View Plans',
    am: '💳 እቅዶች ይመልከቱ'
  },
  my_subscriptions: {
    en: '📊 My Subscriptions',
    am: '📊 የእኔ ምዝገባዎች'
  },
  available_services: {
    en: '🎆 **Available Services**\n\nChoose a service to view details and subscribe:',
    am: '🎆 **የሚገኙ አገልግሎቶች**\n\nዝርዝር መረጃ እና መመዝገብ አገልግሎት ይምረጡ:'
  },
  error_occurred: {
    en: 'Sorry, something went wrong.',
    am: 'ይቅርታ፣ አንድ ነገር ተሳሳተ።'
  },
  // Onboarding translations
  browse_services_now: {
    en: '🎯 Browse Services Now',
    am: '🎯 አሁን አገልግሎቶችን ይመልከቱ'
  },
  have_questions: {
    en: '❓ Have Questions?',
    am: '❓ ተጨማሪ ጥያቄዎች'
  },
  get_support: {
    en: '🛠️ Get Support',
    am: '🛠️ ድጋፍ አግኙ'
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
export const getUserLanguage = async (ctx) => {
  try {
    if (!ctx.from || !ctx.from.id) {
      return ctx.from?.language_code === 'am' ? 'am' : 'en';
    }
    
    const { firestore } = await import('./firestore.js');
    const userId = String(ctx.from.id);
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      return ctx.from?.language_code === 'am' ? 'am' : 'en';
    }
    
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    return userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
  } catch (error) {
    console.error('Error getting user language:', error);
    return ctx.from?.language_code === 'am' ? 'am' : 'en';
  }
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
