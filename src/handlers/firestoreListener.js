import { firestore } from "../utils/firestore.js";

export default function firestoreListener(bot) {
  try {
    if (process.env.ENABLE_FIRESTORE_LISTENER !== 'true') {
      console.log("Firestore listener disabled (set ENABLE_FIRESTORE_LISTENER=true to enable)");
      return;
    }
    firestore.collection("subscriptions").onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          try {
            if (change.type === "modified") {
              const data = change.doc.data();
              if (data.status === "active" && !data.notified) {
                // Notify user
                const userId = data.telegramUserID;
                const service = data.serviceID;
                const nextBillingDate = data.nextBillingDate || "-";
                // Fetch user language
                const userDoc = await firestore
                  .collection("users")
                  .doc(String(userId))
                  .get();
                const lang =
                  userDoc.exists && userDoc.data().language === "am"
                    ? "am"
                    : "en";
                const msg = bot.context.i18n.approved[lang]
                  .replace("{service}", service)
                  .replace("{date}", nextBillingDate);
                await bot.telegram.sendMessage(userId, msg);
                // Mark as notified
                await firestore
                  .collection("subscriptions")
                  .doc(change.doc.id)
                  .update({ notified: true });
              }
            }
          } catch (error) {
            console.error("Error in firestore listener change:", error);
          }
        });
      },
      (error) => {
        console.error("Error in firestore listener:", error);
      }
    );
  } catch (error) {
    console.error("Error setting up firestore listener:", error);
  }
}
