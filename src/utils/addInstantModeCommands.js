// ⚡ INSTANT MODE COMMAND REGISTRATION
// Helper to register INSTANT MODE commands with the bot

import { registerInstantModeCommands } from "../handlers/instantModeCommands.js";

/**
 * Add INSTANT MODE commands to the bot
 * @param {Telegraf} bot - The Telegraf bot instance
 */
export default async function addInstantModeCommands(bot) {
  try {
    console.log("⚡ Adding INSTANT MODE commands to bot...");

    await registerInstantModeCommands(bot);

    console.log("✅ INSTANT MODE commands added successfully");
    console.log("   Available commands:");
    console.log("   • /instant - Overall instant performance");
    console.log("   • /speed - Speed analysis");
    console.log("   • /load - Load capacity analysis");
    console.log("   • /realtime - Real-time sync status");
  } catch (error) {
    console.error("❌ Failed to add INSTANT MODE commands:", error);
    throw error;
  }
}
