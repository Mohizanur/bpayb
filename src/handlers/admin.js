import { firestore } from "../utils/firestore.js";

export default function adminHandler(bot) {
  // Admin commands - only accessible to ADMIN_TELEGRAM_ID
  const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

  // Check if user is admin
  function isAdmin(ctx) {
    return ctx.from.id.toString() === ADMIN_ID;
  }

  // Admin command to view pending subscriptions
  bot.command("admin_pending", async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.reply("❌ Access denied. Admin only.");
        return;
      }

      const pendingSubs = await firestore
        .collection("subscriptions")
        .where("status", "==", "pending")
        .get();

      if (pendingSubs.empty) {
        await ctx.reply("✅ No pending subscriptions.");
        return;
      }

      let message = "📋 **Pending Subscriptions:**\n\n";
      const keyboard = [];

      pendingSubs.forEach((doc) => {
        const data = doc.data();
        message += `• ${data.serviceID} by User ${data.telegramUserID}\n`;
        keyboard.push([
          {
            text: `✅ Approve ${data.serviceID}`,
            callback_data: `admin_approve_${doc.id}`,
          },
        ]);
      });

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("Error in admin_pending handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Admin command to view support messages
  bot.command("admin_support", async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.reply("❌ Access denied. Admin only.");
        return;
      }

      const supportMessages = await firestore
        .collection("supportMessages")
        .where("handled", "==", false)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      if (supportMessages.empty) {
        await ctx.reply("✅ No unhandled support messages.");
        return;
      }

      let message = "📧 **Unhandled Support Messages:**\n\n";
      const keyboard = [];

      supportMessages.forEach((doc) => {
        const data = doc.data();
        message += `From User ${data.telegramUserID}:\n${data.messageText}\n\n`;
        keyboard.push([
          {
            text: `✅ Mark as handled`,
            callback_data: `admin_handled_${doc.id}`,
          },
        ]);
      });

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("Error in admin_support handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Admin command to view all active subscriptions
  bot.command("admin_active", async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.reply("❌ Access denied. Admin only.");
        return;
      }

      const activeSubs = await firestore
        .collection("subscriptions")
        .where("status", "==", "active")
        .get();

      if (activeSubs.empty) {
        await ctx.reply("✅ No active subscriptions.");
        return;
      }

      let message = "📊 **Active Subscriptions:**\n\n";
      activeSubs.forEach((doc) => {
        const data = doc.data();
        message += `• ${data.serviceID} - User ${data.telegramUserID}\n`;
      });

      await ctx.reply(message, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error in admin_active handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle admin approval
  bot.action(/admin_approve_(.+)/, async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      const subId = ctx.match[1];
      const subDoc = await firestore
        .collection("subscriptions")
        .doc(subId)
        .get();

      if (!subDoc.exists) {
        await ctx.answerCbQuery("❌ Subscription not found.");
        return;
      }

      const subData = subDoc.data();

      // Set next billing date to 30 days from now
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      await firestore
        .collection("subscriptions")
        .doc(subId)
        .update({
          status: "active",
          nextBillingDate: nextBillingDate.toISOString().split("T")[0],
          approvedBy: ctx.from.id,
          approvedAt: new Date(),
        });

      // Notify user
      const userLang = await getUserLang({
        from: { id: subData.telegramUserID },
      });
      const serviceName = subData.serviceID;
      const msg = ctx.i18n.approved[userLang]
        .replace("{service}", serviceName)
        .replace("{date}", nextBillingDate.toISOString().split("T")[0]);

      try {
        await bot.telegram.sendMessage(subData.telegramUserID, msg, {
          parse_mode: "MarkdownV2",
        });
      } catch (error) {
        console.log("Could not notify user:", error);
      }

      await ctx.answerCbQuery("✅ Subscription approved!");
      await ctx.editMessageText("✅ Subscription approved and user notified.");
    } catch (error) {
      console.error("Error in admin_approve action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle marking support as handled
  bot.action(/admin_handled_(.+)/, async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      const msgId = ctx.match[1];
      await firestore.collection("supportMessages").doc(msgId).update({
        handled: true,
        handledBy: ctx.from.id,
        handledAt: new Date(),
      });

      await ctx.answerCbQuery("✅ Marked as handled!");
      await ctx.editMessageText("✅ Support message marked as handled.");
    } catch (error) {
      console.error("Error in admin_handled action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle admin cancellation
  bot.action(/admin_cancel_(.+)/, async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      const subId = ctx.match[1];
      const subDoc = await firestore
        .collection("subscriptions")
        .doc(subId)
        .get();

      if (!subDoc.exists) {
        await ctx.answerCbQuery("❌ Subscription not found.");
        return;
      }

      const subData = subDoc.data();

      await firestore.collection("subscriptions").doc(subId).update({
        status: "cancelled",
        cancelledBy: ctx.from.id,
        cancelledAt: new Date(),
      });

      // Notify user
      try {
        await bot.telegram.sendMessage(
          subData.telegramUserID,
          "❌ Your subscription has been cancelled by admin.",
          { parse_mode: "MarkdownV2" }
        );
      } catch (error) {
        console.log("Could not notify user:", error);
      }

      await ctx.answerCbQuery("✅ Subscription cancelled!");
      await ctx.editMessageText("✅ Subscription cancelled and user notified.");
    } catch (error) {
      console.error("Error in admin_cancel action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Admin help command
  bot.command("admin_help", async (ctx) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.reply("❌ Access denied. Admin only.");
        return;
      }

      const helpText = `🔧 **Admin Commands:**

/admin_pending - View pending subscriptions
/admin_support - View unhandled support messages  
/admin_active - View active subscriptions
/admin_help - Show this help

**Admin ID:** ${ADMIN_ID}`;

      await ctx.reply(helpText, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error in admin_help handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}

// Helper function to get user language (import from i18n.js)
async function getUserLang(ctx) {
  const userDoc = await firestore
    .collection("users")
    .doc(String(ctx.from.id))
    .get();
  if (userDoc.exists) return userDoc.data().language;
  if (ctx.from.language_code === "am") return "am";
  return "en";
}
