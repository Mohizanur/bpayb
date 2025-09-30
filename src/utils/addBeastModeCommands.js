// 🔥 ADD BEAST MODE COMMANDS TO BOT
// This module adds performance monitoring commands to the existing bot
// Called automatically when bot starts in BEAST MODE

import registerBeastModeCommands from "../handlers/beastModeCommands.js";

// Add BEAST MODE commands to bot instance
export async function addBeastModeCommands(bot) {
  try {
    // Check if bot has admin handler registered
    if (!bot || typeof bot.command !== "function") {
      console.warn("⚠️ Bot not ready for BEAST MODE commands");
      return false;
    }

    // Get admin check function from bot context
    // We'll create a simple admin check that works with the bot
    const isAuthorizedAdmin = async (ctx) => {
      try {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (!adminId) return false;
        return String(ctx.from?.id) === String(adminId);
      } catch {
        return false;
      }
    };

    // Register BEAST MODE commands
    registerBeastModeCommands(bot, isAuthorizedAdmin);

    console.log("🔥 BEAST MODE commands added to bot");
    return true;
  } catch (error) {
    console.error("❌ Failed to add BEAST MODE commands:", error);
    return false;
  }
}

export default addBeastModeCommands;
