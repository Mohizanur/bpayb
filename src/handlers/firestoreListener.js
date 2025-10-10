import { firestore } from "../utils/firestore.js";

export default function firestoreListener(bot) {
  try {
    // ⚠️ NOTE: This polling listener is REDUNDANT and wastes database reads!
    // Notifications are already sent via verifyPayment() in paymentVerification.js
    // when admin approves payments. This was causing excessive quota usage.
    // 
    // Keep this disabled unless you need backup notification system.
    // Set ENABLE_FIRESTORE_LISTENER=true ONLY if verifyPayment notifications fail.
    
    if (process.env.ENABLE_FIRESTORE_LISTENER !== 'true') {
      console.log("✅ Firestore polling listener disabled (quota optimization)");
      console.log("💡 Notifications are sent via verifyPayment() when admin approves payments");
      return;
    }
    
    // Use a polling approach instead of onSnapshot for better compatibility
    console.log("⚠️ Firestore listener enabled - this may increase database reads");
    console.log("🔄 Setting up Firestore listener (polling mode)...");
    
    // Check for new subscriptions every 30 seconds
    setInterval(async () => {
      try {
        const subscriptionsSnapshot = await firestore.collection("subscriptions").get();
        
        for (const doc of subscriptionsSnapshot.docs) {
          const data = doc.data();
          
          // Check for newly activated subscriptions that haven't been notified
          if (data.status === "active" && !data.notified) {
            try {
              const userId = data.telegramUserID || data.userId;
              const service = data.serviceID || data.serviceName || "Unknown Service";
              const nextBillingDate = data.nextBillingDate || "-";
              
              // Validate userId exists
              if (!userId) {
                console.log(`⚠️ Skipping notification for subscription ${doc.id}: No user ID found`);
                continue;
              }
              
              // Fetch user language
              const userDoc = await firestore
                .collection("users")
                .doc(String(userId))
                .get();
              
              const lang = userDoc.exists && userDoc.data().language === "am" ? "am" : "en";
              
              // Create notification message
              const msg = lang === "am" 
                ? `✅ የ${service} አገልግሎትዎ ተጽዕኖ አድርጎታል!\n\n📅 ቀጣይ ክፍያ: ${nextBillingDate}`
                : `✅ Your ${service} subscription has been activated!\n\n📅 Next billing: ${nextBillingDate}`;
              
              // Send notification
              await bot.telegram.sendMessage(userId, msg);
              
              // Mark as notified
              await firestore
                .collection("subscriptions")
                .doc(doc.id)
                .update({ notified: true });
                
              console.log(`📧 Notification sent to user ${userId} for ${service}`);
            } catch (error) {
              console.error(`Error sending notification for subscription ${doc.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error in Firestore listener polling:", error);
      }
    }, 30000); // Check every 30 seconds
    
    console.log("✅ Firestore listener started (polling mode)");
  } catch (error) {
    console.error("Error setting up firestore listener:", error);
  }
}
