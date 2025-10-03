// 🚀 QUOTA MANAGEMENT COMMANDS - Real-time Firestore quota monitoring
// Production commands for monitoring and managing Firestore quotas

import { performance } from 'perf_hooks';

// Import quota system (with fallback for development)
let realTimeFirestore, firestoreQuotaManager;
try {
  const realtimeModule = await import('../utils/realtimeFirestore.js');
  const quotaModule = await import('../utils/firestoreQuotaManager.js');
  realTimeFirestore = realtimeModule.default;
  firestoreQuotaManager = quotaModule.default;
} catch (error) {
  console.warn('Quota system not available:', error.message);
}

// Admin user IDs (replace with your admin IDs)
const ADMIN_IDS = [
  '123456789', // Replace with actual admin Telegram IDs
  '987654321'
];

// Check if user is admin
const isAdmin = (ctx) => {
  return ADMIN_IDS.includes(String(ctx.from?.id));
};

// Format numbers for display
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Format percentage
const formatPercentage = (num) => {
  return num.toFixed(1) + '%';
};

// Format time duration
const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Get status emoji
const getStatusEmoji = (status) => {
  switch (status) {
    case 'OPTIMAL': return '🟢';
    case 'WARNING': return '🟡';
    case 'EMERGENCY': return '🔴';
    default: return '⚪';
  }
};

export const registerQuotaCommands = (bot) => {
  
  // /quota - Main quota status command
  bot.command('quota', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const startTime = performance.now();
      const quotaStatus = realTimeFirestore.getQuotaStatus();
      const responseTime = performance.now() - startTime;

      const statusEmoji = getStatusEmoji(quotaStatus.status);
      
      const message = `
${statusEmoji} **FIRESTORE QUOTA STATUS**

📊 **Daily Usage**
• Reads: ${formatNumber(quotaStatus.reads.used)}/${formatNumber(quotaStatus.reads.limit)} (${formatPercentage(quotaStatus.reads.percentage)})
• Writes: ${formatNumber(quotaStatus.writes.used)}/${formatNumber(quotaStatus.writes.limit)} (${formatPercentage(quotaStatus.writes.percentage)})
• Remaining Reads: ${formatNumber(quotaStatus.reads.remaining)}
• Remaining Writes: ${formatNumber(quotaStatus.writes.remaining)}

⚡ **Real-time Rate**
• Reads/sec: ${quotaStatus.reads.perSecond}
• Writes/sec: ${quotaStatus.writes.perSecond}

🚀 **Cache Performance**
• Hit Rate: ${formatPercentage(quotaStatus.cache.hitRate)}
• Cache Hits: ${formatNumber(quotaStatus.cache.hits)}
• Cache Misses: ${formatNumber(quotaStatus.cache.misses)}
• Cache Size: ${formatNumber(quotaStatus.cache.size)}

📈 **Efficiency**
• Quota Efficiency: ${formatPercentage(quotaStatus.efficiency.quotaEfficiency)}
• Quota Savings: ${formatNumber(quotaStatus.efficiency.quotaSavings)}
• Avg Response: ${quotaStatus.efficiency.averageResponseTime.toFixed(2)}ms

🎯 **Status**: ${quotaStatus.status}
⏱️ **Response Time**: ${responseTime.toFixed(2)}ms
      `.trim();

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quota command:', error);
      await ctx.reply('❌ Error retrieving quota status');
    }
  });

  // /quotareport - Detailed quota report
  bot.command('quotareport', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const report = await realTimeFirestore.getQuotaReport();
      const stats = realTimeFirestore.getStats();
      
      let message = `
📋 **DETAILED QUOTA REPORT**

📊 **Quota Analysis**
• Read Usage: ${formatPercentage(report.quota.reads.percentage)}
• Write Usage: ${formatPercentage(report.quota.writes.percentage)}
• Cache Hit Rate: ${formatPercentage(report.quota.cache.hitRate)}
• System Status: ${getStatusEmoji(report.quota.status)} ${report.quota.status}

🚀 **Performance Metrics**
• Total Operations: ${formatNumber(report.performance.totalOperations)}
• Avg Response Time: ${report.performance.averageResponseTime.toFixed(2)}ms
• Cache Hit Rate: ${formatPercentage(report.performance.cacheHitRate)}

📡 **Real-time Stats**
• Active Listeners: ${report.realtime.activeListeners}
• Real-time Updates: ${formatNumber(report.realtime.realtimeUpdates)}
• Data Cache Size: ${formatNumber(report.realtime.dataSize)}

⏰ **System Info**
• Uptime: ${formatDuration(stats.uptime)}
• Total Reads: ${formatNumber(stats.totalReads)}
• Total Writes: ${formatNumber(stats.totalWrites)}
• Total Queries: ${formatNumber(stats.totalQueries)}
      `.trim();

      if (report.recommendations.length > 0) {
        message += '\n\n💡 **Recommendations**\n';
        report.recommendations.forEach((rec, index) => {
          message += `${index + 1}. ${rec}\n`;
        });
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quotareport command:', error);
      await ctx.reply('❌ Error generating quota report');
    }
  });

  // /quotahealth - Health check
  bot.command('quotahealth', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const isHealthy = realTimeFirestore.isHealthy();
      const quotaStatus = realTimeFirestore.getQuotaStatus();
      const stats = realTimeFirestore.getStats();
      
      const healthEmoji = isHealthy ? '✅' : '❌';
      const statusEmoji = getStatusEmoji(quotaStatus.status);
      
      const message = `
${healthEmoji} **SYSTEM HEALTH CHECK**

🎯 **Overall Health**: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
${statusEmoji} **Quota Status**: ${quotaStatus.status}

📊 **Health Indicators**
• Quota Compliance: ${quotaStatus.reads.percentage < 95 && quotaStatus.writes.percentage < 95 ? '✅' : '❌'}
• Cache Performance: ${quotaStatus.cache.hitRate > 70 ? '✅' : '❌'} (${formatPercentage(quotaStatus.cache.hitRate)})
• Response Time: ${quotaStatus.efficiency.averageResponseTime < 200 ? '✅' : '❌'} (${quotaStatus.efficiency.averageResponseTime.toFixed(2)}ms)
• Listener Count: ${stats.activeListeners < 100 ? '✅' : '❌'} (${stats.activeListeners}/100)

⚡ **Current Load**
• Reads/sec: ${quotaStatus.reads.perSecond}/1000
• Writes/sec: ${quotaStatus.writes.perSecond}/500
• Active Operations: ${formatNumber(stats.totalReads + stats.totalWrites + stats.totalQueries)}

🔄 **System Uptime**: ${formatDuration(stats.uptime)}
      `.trim();

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quotahealth command:', error);
      await ctx.reply('❌ Error checking system health');
    }
  });

  // /quotacache - Cache management
  bot.command('quotacache', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const quotaStatus = realTimeFirestore.getQuotaStatus();
      
      const message = `
🚀 **CACHE PERFORMANCE**

📊 **Cache Statistics**
• Hit Rate: ${formatPercentage(quotaStatus.cache.hitRate)}
• Total Hits: ${formatNumber(quotaStatus.cache.hits)}
• Total Misses: ${formatNumber(quotaStatus.cache.misses)}
• Cache Size: ${formatNumber(quotaStatus.cache.size)} entries

💾 **Cache Efficiency**
• Quota Savings: ${formatNumber(quotaStatus.efficiency.quotaSavings)} operations
• Efficiency Rate: ${formatPercentage(quotaStatus.efficiency.quotaEfficiency)}

🎯 **Performance Impact**
• Cached Operations: Instant response
• Firestore Operations: ${quotaStatus.efficiency.averageResponseTime.toFixed(2)}ms avg
• Total Quota Saved: ${formatPercentage((quotaStatus.efficiency.quotaSavings / (quotaStatus.reads.used + quotaStatus.writes.used + quotaStatus.efficiency.quotaSavings)) * 100)}

📈 **Recommendations**
${quotaStatus.cache.hitRate > 80 ? '✅ Excellent cache performance' : '⚠️ Consider optimizing cache strategy'}
${quotaStatus.cache.size > 5000 ? '⚠️ Large cache size - monitor memory usage' : '✅ Cache size is optimal'}
      `.trim();

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quotacache command:', error);
      await ctx.reply('❌ Error retrieving cache status');
    }
  });

  // /clearcache - Clear cache (admin only)
  bot.command('clearcache', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const result = await realTimeFirestore.clearCache();
      
      await ctx.reply(`
✅ **CACHE CLEARED**

🗑️ Cache has been successfully cleared
⏰ Timestamp: ${new Date(result.timestamp).toLocaleString()}

⚠️ **Note**: Next operations will be slower as cache rebuilds
📈 Cache performance will improve over time
      `.trim(), { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /clearcache command:', error);
      await ctx.reply('❌ Error clearing cache');
    }
  });

  // /quotaalert - Set quota alerts
  bot.command('quotaalert', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const quotaStatus = realTimeFirestore.getQuotaStatus();
      
      // Check if any alerts should be triggered
      const alerts = [];
      
      if (quotaStatus.reads.percentage > 90) {
        alerts.push(`🚨 CRITICAL: Read quota at ${formatPercentage(quotaStatus.reads.percentage)}`);
      } else if (quotaStatus.reads.percentage > 80) {
        alerts.push(`⚠️ WARNING: Read quota at ${formatPercentage(quotaStatus.reads.percentage)}`);
      }
      
      if (quotaStatus.writes.percentage > 90) {
        alerts.push(`🚨 CRITICAL: Write quota at ${formatPercentage(quotaStatus.writes.percentage)}`);
      } else if (quotaStatus.writes.percentage > 80) {
        alerts.push(`⚠️ WARNING: Write quota at ${formatPercentage(quotaStatus.writes.percentage)}`);
      }
      
      if (quotaStatus.cache.hitRate < 60) {
        alerts.push(`📉 LOW PERFORMANCE: Cache hit rate at ${formatPercentage(quotaStatus.cache.hitRate)}`);
      }
      
      let message = '🔔 **QUOTA ALERTS**\n\n';
      
      if (alerts.length === 0) {
        message += '✅ No active alerts\n';
        message += `🟢 System operating normally\n`;
        message += `📊 Read quota: ${formatPercentage(quotaStatus.reads.percentage)}\n`;
        message += `📊 Write quota: ${formatPercentage(quotaStatus.writes.percentage)}\n`;
        message += `🚀 Cache hit rate: ${formatPercentage(quotaStatus.cache.hitRate)}`;
      } else {
        alerts.forEach(alert => {
          message += `${alert}\n`;
        });
        
        message += '\n💡 **Recommended Actions**\n';
        if (quotaStatus.reads.percentage > 80) {
          message += '• Increase cache TTL\n';
          message += '• Reduce query frequency\n';
        }
        if (quotaStatus.writes.percentage > 80) {
          message += '• Enable batch writing\n';
          message += '• Reduce update frequency\n';
        }
        if (quotaStatus.cache.hitRate < 60) {
          message += '• Optimize cache strategy\n';
          message += '• Review cache keys\n';
        }
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quotaalert command:', error);
      await ctx.reply('❌ Error checking quota alerts');
    }
  });

  // /quotastats - Detailed statistics
  bot.command('quotastats', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('❌ Access denied. Admin only command.');
      return;
    }

    if (!realTimeFirestore) {
      await ctx.reply('❌ Quota system not available');
      return;
    }

    try {
      const stats = realTimeFirestore.getStats();
      const quotaStatus = realTimeFirestore.getQuotaStatus();
      
      // Calculate projections
      const uptimeHours = stats.uptime / (1000 * 60 * 60);
      const dailyReadProjection = Math.round((quotaStatus.reads.used / uptimeHours) * 24);
      const dailyWriteProjection = Math.round((quotaStatus.writes.used / uptimeHours) * 24);
      
      const message = `
📈 **DETAILED STATISTICS**

⏰ **System Runtime**
• Uptime: ${formatDuration(stats.uptime)}
• Total Operations: ${formatNumber(stats.totalReads + stats.totalWrites + stats.totalQueries)}

📊 **Operation Breakdown**
• Total Reads: ${formatNumber(stats.totalReads)}
• Total Writes: ${formatNumber(stats.totalWrites)}
• Total Queries: ${formatNumber(stats.totalQueries)}
• Cache Hits: ${formatNumber(stats.cacheHits)}
• Real-time Updates: ${formatNumber(stats.realTimeUpdates)}

🎯 **Performance Metrics**
• Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms
• Operations/Hour: ${formatNumber(Math.round((stats.totalReads + stats.totalWrites + stats.totalQueries) / uptimeHours))}
• Cache Hit Rate: ${formatPercentage((stats.cacheHits / (stats.totalReads + stats.totalQueries)) * 100)}

📈 **Daily Projections**
• Projected Reads: ${formatNumber(dailyReadProjection)}/50K (${formatPercentage((dailyReadProjection / 50000) * 100)})
• Projected Writes: ${formatNumber(dailyWriteProjection)}/20K (${formatPercentage((dailyWriteProjection / 20000) * 100)})

🎯 **Efficiency Score**
${dailyReadProjection < 40000 && dailyWriteProjection < 16000 ? '✅' : '⚠️'} Quota Usage: ${dailyReadProjection < 40000 && dailyWriteProjection < 16000 ? 'EFFICIENT' : 'HIGH'}
${quotaStatus.cache.hitRate > 70 ? '✅' : '⚠️'} Cache Performance: ${quotaStatus.cache.hitRate > 70 ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}
${stats.averageResponseTime < 100 ? '✅' : '⚠️'} Response Time: ${stats.averageResponseTime < 100 ? 'FAST' : 'SLOW'}
      `.trim();

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error in /quotastats command:', error);
      await ctx.reply('❌ Error retrieving statistics');
    }
  });

  console.log('✅ Quota management commands registered');
};
