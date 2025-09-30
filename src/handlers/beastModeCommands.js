// 🔥 BEAST MODE MONITORING COMMANDS
// Performance monitoring commands for admin users
// /stats, /quota, /memory, /cache commands

import { beastModeOptimizer } from "../utils/beastModeOptimizer.js";
import { beastModeIntegration } from "../utils/beastModeIntegration.js";

// Register BEAST MODE commands
export function registerBeastModeCommands(bot, isAuthorizedAdmin) {
  // /stats - Overall performance metrics
  bot.command("stats", async (ctx) => {
    try {
      // Check admin access
      const isAdmin = await isAuthorizedAdmin(ctx);
      if (!isAdmin) {
        return ctx.reply("⛔ This command is for administrators only.");
      }

      const stats = beastModeIntegration.getStatsForCommand();

      const message = `
🔥 **BEAST MODE PERFORMANCE STATS**

📊 **Status**: ${stats.status}
**Health Score**: ${stats.score}

⚡ **Performance**
• Total Requests: ${stats.performance.requests}
• Cache Hit Rate: ${stats.performance.cacheHitRate}
• Uptime: ${stats.performance.uptime}

🧠 **Cache Status**
• Overall Hit Rate: ${stats.cache.hitRate}
• Total Items: ${stats.cache.totalItems}
• Instant Layer: ${stats.cache.layers.instant}
• User Layer: ${stats.cache.layers.user}
• Service Layer: ${stats.cache.layers.service}
• Stats Layer: ${stats.cache.layers.stats}
• Session Layer: ${stats.cache.layers.session}
• Rate Limit Layer: ${stats.cache.layers.rateLimit}

🛡️ **Quota Protection**
• Mode: ${stats.quota.mode}
• Usage: ${stats.quota.usage}

💾 **Memory**
• Current: ${stats.memory.current}
• Usage: ${stats.memory.percentage}

🚀 **Capacity**: 5,000 concurrent users
🧟 **Zombie Mode**: IMMORTAL
`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ /stats command error:", error);
      await ctx.reply("⚠️ Error fetching stats. Please try again.");
    }
  });

  // /quota - Quota protection status
  bot.command("quota", async (ctx) => {
    try {
      const isAdmin = await isAuthorizedAdmin(ctx);
      if (!isAdmin) {
        return ctx.reply("⛔ This command is for administrators only.");
      }

      const stats = beastModeOptimizer.getComprehensiveStats();
      const quota = stats.quota;

      const message = `
🛡️ **QUOTA PROTECTION STATUS**

**Current Mode**: ${quota.mode}
**Description**: ${quota.description}
**Cache TTL**: ${quota.cacheTTL}

📊 **Daily Usage**
• Reads: ${quota.quota.reads} / ${quota.limits.reads}
• Writes: ${quota.quota.writes} / ${quota.limits.writes}
• Deletes: ${quota.quota.deletes} / ${quota.limits.deletes}

**Overall Usage**: ${quota.usage}

🎯 **Protection Modes**
• **NORMAL** (0-70%): Full functionality, 5min cache
• **CONSERVATIVE** (70-80%): Reduced queries, 10min cache
• **AGGRESSIVE** (80-90%): Minimal DB access, 30min cache
• **EMERGENCY** (90-95%): Cache-only, 1hr cache

✅ **Status**: ${quota.usage < "70%" ? "HEALTHY" : quota.usage < "80%" ? "ELEVATED" : quota.usage < "90%" ? "HIGH" : "CRITICAL"}
`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ /quota command error:", error);
      await ctx.reply("⚠️ Error fetching quota status. Please try again.");
    }
  });

  // /memory - Memory health status
  bot.command("memory", async (ctx) => {
    try {
      const isAdmin = await isAuthorizedAdmin(ctx);
      if (!isAdmin) {
        return ctx.reply("⛔ This command is for administrators only.");
      }

      const stats = beastModeOptimizer.getComprehensiveStats();
      const memory = stats.memory;

      const status =
        parseFloat(memory.percentage) > 85
          ? "CRITICAL"
          : parseFloat(memory.percentage) > 80
            ? "HIGH"
            : parseFloat(memory.percentage) > 70
              ? "ELEVATED"
              : "HEALTHY";

      const message = `
💾 **MEMORY HEALTH STATUS**

**Status**: ${status}

📊 **Current Usage**
• Heap Used: ${memory.current}
• Heap Total: ${memory.total}
• RSS: ${memory.rss}
• Percentage: ${memory.percentage}

⚙️ **Configuration**
• Max Memory: ${memory.max}
• Cleanup Threshold: ${memory.threshold}

🧹 **Auto-Cleanup**
• Triggers at 85% usage
• Forced GC every 5 minutes
• Automatic cache eviction

${parseFloat(memory.percentage) > 80 ? "⚠️ **Warning**: Memory usage high, auto-cleanup active" : "✅ **Memory health is good**"}
`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ /memory command error:", error);
      await ctx.reply("⚠️ Error fetching memory status. Please try again.");
    }
  });

  // /cache - Cache statistics
  bot.command("cache", async (ctx) => {
    try {
      const isAdmin = await isAuthorizedAdmin(ctx);
      if (!isAdmin) {
        return ctx.reply("⛔ This command is for administrators only.");
      }

      const stats = beastModeOptimizer.getComprehensiveStats();
      const cache = stats.cache;

      const message = `
🧠 **CACHE SYSTEM STATUS**

**Overall Hit Rate**: ${cache.hitRate}
**Total Items**: ${cache.totalSize}

📊 **Layer Statistics**
• Instant Hits: ${cache.instantHits}
• User Hits: ${cache.userHits}
• Service Hits: ${cache.serviceHits}
• Stats Hits: ${cache.statsHits}
• Session Hits: ${cache.sessionHits}
• Rate Limit Hits: ${cache.rateLimitHits}
• Cache Misses: ${cache.misses}

🔢 **Layer Sizes**
• Instant Layer: ${cache.layers.instant} / 1,000
• User Layer: ${cache.layers.user} / 10,000
• Service Layer: ${cache.layers.service} / 5,000
• Stats Layer: ${cache.layers.stats} / 10,000
• Session Layer: ${cache.layers.session} / 50,000
• Rate Limit Layer: ${cache.layers.rateLimit} / 50,000

📈 **Performance**
• Total Sets: ${cache.sets}
• Total Evictions: ${cache.evictions}
• Auto-Cleanup: Every 30 seconds

${parseFloat(cache.hitRate) > 80 ? "✅ **Cache performance excellent**" : parseFloat(cache.hitRate) > 70 ? "⚠️ **Cache performance good**" : "🚨 **Cache performance needs attention**"}
`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ /cache command error:", error);
      await ctx.reply("⚠️ Error fetching cache status. Please try again.");
    }
  });

  console.log("✅ BEAST MODE commands registered:");
  console.log("   /stats - Performance metrics");
  console.log("   /quota - Quota protection status");
  console.log("   /memory - Memory health");
  console.log("   /cache - Cache statistics");
}

export default registerBeastModeCommands;
