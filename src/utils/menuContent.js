import { getBackToMenuButton } from "./navigation.js";

export const getMainMenuContent = (lang = 'en', isNewUser = false, isAdmin = false) => {
  // Welcome message parts
  const welcomeTitle = lang === "am" 
    ? "🎉 እንኳን ወደ BirrPay ደህና መጡ!"
    : "🎉 Welcome to BirrPay!";
  
  const welcomeSubtitle = lang === "am"
    ? "🌟 **የኢትዮጵያ #1 የሳብስክሪፕሽን ፕላትፎርም**"
    : "🌟 **Ethiopia's #1 Subscription Platform**";

  // Main content
  const mainContent = isNewUser
    ? lang === 'am'
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 **እንኳን ደስ አለዎት!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay ኢትዮጵያ ውስጥ ሁሉንም ዲጂታል ሳብስክሪፕሽኖችዎን በአንድ ደህንነቱ የተጠበቀ ቦታ የሚያስተዳድሩበት ቦታ ነው።`
      : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 **Getting Started**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay is Ethiopia's premier platform for managing all your digital subscriptions in one secure place.`
    : '';

  // Features list
  const features = lang === 'am'
    ? `✨ **ምን ማድረግ ይችላሉ:**
• Netflix, Amazon Prime, Spotify እና ሌሎችንም ያግኙ\n• በብር በቀላሉ ይክፈሉ\n• ሁሉንም ሳብስክሪፕሽኖችዎን በአንድ ቦታ ያስተዳድሩ\n• 24/7 የደንበኞች ድጋፍ ያግኙ`
    : `✨ **What You Can Do:**
• Access Netflix, Amazon Prime, Spotify, and more\n• Pay easily using Ethiopian Birr\n• Manage all subscriptions from one place\n• Get 24/7 customer support`;

  // Footer
  const footer = lang === 'am'
    ? "🔒 **100% ደህንነቱ የተጠበቀ** | 🇪🇹 **የአካባቢ ድጋፍ** | ⚡ **ፈጣን እና ቀላል**"
    : "🔒 **100% Secure** | 🇪🇹 **Local Support** | ⚡ **Fast & Easy**";

  // Combine all parts
  const message = [
    welcomeTitle,
    '',
    welcomeSubtitle,
    '',
    mainContent,
    '',
    features,
    '',
    footer
  ].filter(Boolean).join('\n');

  // Menu buttons
  const menuButtons = [
    [
      { 
        text: lang === "am" ? (isNewUser ? "🚀 እንጀምር!" : "🚀 አገልግሎቶች") : (isNewUser ? "🚀 Let's Get Started!" : "🚀 Services"),
        callback_data: isNewUser ? "start_onboarding" : "services"
      },
      { 
        text: lang === "am" ? "💰 የዋጋ አሰጣጥ" : "💰 Pricing",
        callback_data: "pricing"
      }
    ],
    [
      { 
        text: lang === "am" ? "💳 የክፍያ ዘዴዎች" : "💳 Payment Methods",
        callback_data: "payment_methods"
      },
      { 
        text: lang === "am" ? "⭐ የእኔ ምዝገባዎች" : "⭐ My Subscriptions",
        callback_data: "my_subs"
      }
    ],
    [
      { 
        text: lang === "am" ? "❓ እንዴት እንደሚሰራ" : "❓ How It Works",
        callback_data: "how_to_use"
      },
      { 
        text: lang === "am" ? "📜 የአገልግሎት ደረጃዎች" : "📜 Terms",
        callback_data: "terms"
      }
    ],
    [
      { 
        text: lang === "am" ? "💬 ድጋፍ" : "💬 Support",
        callback_data: "support"
      },
      { 
        text: lang === "am" ? "ℹ️ መረጃ" : "ℹ️ About",
        callback_data: "about"
      }
    ],
    [
      { 
        text: lang === "am" ? "👥 ማህበረሰብ እና ትምህርት" : "👥 Community & Tutorial",
        url: "https://t.me/birrpayofficial"
      }
    ],
    [
      { 
        text: lang === "am" ? "🌐 ቋንቋ" : "🌐 Language",
        callback_data: "change_language"
      },
      { 
        text: lang === "am" ? "🔔 ማሳወቂያዎች" : "🔔 Notifications",
        callback_data: "notifications"
      }
    ]
  ];

  // Add admin button only for admins
  if (isAdmin) {
    menuButtons.push([
      { 
        text: lang === "am" ? "🔧 አስተዳደሪ ፓነል" : "🔧 Admin Panel",
        callback_data: "admin"
      }
    ]);
  }

  return {
    message,
    keyboard: menuButtons
  };
};