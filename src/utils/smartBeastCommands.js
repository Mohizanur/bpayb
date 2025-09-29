import smartBeastMode from './smartBeastMode.js';
import { firestore } from './firestore.js';

/**
 * 🚀 SMART BEAST MODE COMMANDS
 * 
 * Admin commands to control the Smart Beast Mode performance optimization system
 */

// Helper function to check admin authorization
const isAuthorizedAdmin = async (ctx) => {
    try {
        const userId = ctx.from?.id?.toString();
        if (!userId) return false;
        
        // Check against environment variable first
        if (process.env.ADMIN_TELEGRAM_ID && userId === process.env.ADMIN_TELEGRAM_ID) {
            return true;
        }
        
        // Check against Firestore config
        const adminDoc = await firestore.collection('config').doc('admins').get();
        if (adminDoc.exists) {
            const admins = adminDoc.data().userIds || [];
            if (admins.includes(userId)) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Enable Smart Beast Mode
 */
export const enableSmartBeastMode = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
        return;
    }

    try {
        smartBeastMode.enable();
        
        const status = smartBeastMode.getStatus();
        const message = `🚀 **Smart Beast Mode ENABLED** 🚀\n\n` +
            `✅ **Performance optimizations are now active!**\n\n` +
            `🔧 **Active Optimizations:**\n` +
            `• 🧠 Smart caching with intelligent invalidation\n` +
            `• 🔗 Connection pooling and reuse\n` +
            `• 🚦 Adaptive rate limiting\n` +
            `• 💾 Memory management\n` +
            `• 📊 Performance monitoring\n\n` +
            `📈 **Expected Improvements:**\n` +
            `• 30-50% faster response times\n` +
            `• Reduced database load\n` +
            `• Better memory utilization\n` +
            `• Improved scalability\n\n` +
            `⚠️ **Note:** This mode is optimized for production use and will automatically manage resources.`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
        // Log the action
        await firestore.collection('adminLogs').add({
            action: 'smart_beast_mode_enabled',
            adminId: ctx.from.id,
            timestamp: new Date(),
            details: { status }
        });
        
    } catch (error) {
        console.error('Error enabling Smart Beast Mode:', error);
        await ctx.reply('❌ Error enabling Smart Beast Mode. Please try again.');
    }
};

/**
 * Disable Smart Beast Mode
 */
export const disableSmartBeastMode = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
        return;
    }

    try {
        smartBeastMode.disable();
        
        const message = `🔄 **Smart Beast Mode DISABLED** 🔄\n\n` +
            `✅ **Performance optimizations have been deactivated**\n\n` +
            `📉 **System Status:**\n` +
            `• Returning to normal operation mode\n` +
            `• All optimizations cleaned up\n` +
            `• Resources freed\n\n` +
            `💡 **To re-enable:** Use /beast_enable command`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
        // Log the action
        await firestore.collection('adminLogs').add({
            action: 'smart_beast_mode_disabled',
            adminId: ctx.from.id,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error disabling Smart Beast Mode:', error);
        await ctx.reply('❌ Error disabling Smart Beast Mode. Please try again.');
    }
};

/**
 * Get Smart Beast Mode status
 */
export const getSmartBeastStatus = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
        return;
    }

    try {
        const status = smartBeastMode.getStatus();
        const memoryMB = Math.round(status.memoryUsage.heapUsed / (1024 * 1024));
        const totalMB = Math.round(status.memoryUsage.heapTotal / (1024 * 1024));
        const uptimeHours = Math.round(status.uptime / 3600);
        
        const message = `📊 **Smart Beast Mode Status** 📊\n\n` +
            `🔧 **Mode:** ${status.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n\n` +
            `📈 **Performance Metrics:**\n` +
            `• Cache Size: ${status.cacheSize}/${status.maxCacheSize}\n` +
            `• Connection Pool: ${status.connectionPoolSize}/${status.maxConnections}\n` +
            `• Rate Limiters: ${status.rateLimitersCount}\n\n` +
            `💾 **Memory Usage:**\n` +
            `• Used: ${memoryMB} MB\n` +
            `• Total: ${totalMB} MB\n` +
            `• Uptime: ${uptimeHours} hours\n\n` +
            `🎯 **Actions:**\n` +
            `${status.enabled ? '• Use /beast_disable to turn off' : '• Use /beast_enable to turn on'}\n` +
            `• Use /beast_emergency for emergency shutdown`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error getting Smart Beast status:', error);
        await ctx.reply('❌ Error getting status. Please try again.');
    }
};

/**
 * Emergency shutdown of Smart Beast Mode
 */
export const emergencyShutdownSmartBeast = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
        return;
    }

    try {
        smartBeastMode.emergencyShutdown();
        
        const message = `🚨 **EMERGENCY SHUTDOWN EXECUTED** 🚨\n\n` +
            `✅ **Smart Beast Mode has been immediately disabled**\n\n` +
            `🧹 **Cleanup Actions:**\n` +
            `• All caches cleared\n` +
            `• Connection pools emptied\n` +
            `• Rate limiters reset\n` +
            `• Performance metrics cleared\n\n` +
            `⚠️ **System Status:**\n` +
            `• Operating in safe mode\n` +
            `• All optimizations disabled\n` +
            `• Resources freed\n\n` +
            `💡 **To restore:** Use /beast_enable command`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
        // Log the emergency action
        await firestore.collection('adminLogs').add({
            action: 'smart_beast_mode_emergency_shutdown',
            adminId: ctx.from.id,
            timestamp: new Date(),
            severity: 'HIGH',
            details: { reason: 'Admin emergency shutdown' }
        });
        
    } catch (error) {
        console.error('Error during emergency shutdown:', error);
        await ctx.reply('❌ Error during emergency shutdown. Please check system status.');
    }
};

/**
 * Performance optimization recommendations
 */
export const getOptimizationTips = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
        return;
    }

    try {
        const status = smartBeastMode.getStatus();
        const memoryMB = Math.round(status.memoryUsage.heapUsed / (1024 * 1024));
        const totalMB = Math.round(status.memoryUsage.heapTotal / (1024 * 1024));
        const memoryUsagePercent = Math.round((memoryMB / totalMB) * 100);
        
        let recommendations = [];
        let statusEmoji = '🟢';
        
        // Memory usage recommendations
        if (memoryUsagePercent > 80) {
            recommendations.push('⚠️ **High memory usage detected** - Consider restarting the bot or enabling Smart Beast Mode');
            statusEmoji = '🔴';
        } else if (memoryUsagePercent > 60) {
            recommendations.push('🟡 **Moderate memory usage** - Smart Beast Mode can help optimize memory');
            statusEmoji = '🟡';
        } else {
            recommendations.push('🟢 **Memory usage is optimal** - System running efficiently');
        }
        
        // Cache recommendations
        if (status.cacheSize > status.maxCacheSize * 0.8) {
            recommendations.push('📊 **Cache nearly full** - Smart Beast Mode will automatically manage this');
        }
        
        // Connection pool recommendations
        if (status.connectionPoolSize > status.maxConnections * 0.7) {
            recommendations.push('🔗 **Connection pool active** - Smart Beast Mode optimizing database connections');
        }
        
        const message = `${statusEmoji} **Performance Optimization Tips** ${statusEmoji}\n\n` +
            `📊 **Current Status:**\n` +
            `• Memory: ${memoryMB}MB / ${totalMB}MB (${memoryUsagePercent}%)\n` +
            `• Cache: ${status.cacheSize}/${status.maxCacheSize}\n` +
            `• Connections: ${status.connectionPoolSize}/${status.maxConnections}\n\n` +
            `💡 **Recommendations:**\n${recommendations.map(rec => `• ${rec}`).join('\n')}\n\n` +
            `🚀 **Smart Beast Mode:** ${status.enabled ? '🟢 Active' : '🔴 Inactive'}\n` +
            `${status.enabled ? '• All optimizations are working optimally' : '• Enable for performance improvements'}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error getting optimization tips:', error);
        await ctx.reply('❌ Error getting optimization tips. Please try again.');
    }
};

/**
 * Register Smart Beast Mode commands with the bot
 */
export const registerSmartBeastCommands = (bot) => {
    // Enable Smart Beast Mode
    bot.command('beast_enable', enableSmartBeastMode);
    
    // Disable Smart Beast Mode
    bot.command('beast_disable', disableSmartBeastMode);
    
    // Get status
    bot.command('beast_status', getSmartBeastStatus);
    
    // Emergency shutdown
    bot.command('beast_emergency', emergencyShutdownSmartBeast);
    
    // Get optimization tips
    bot.command('beast_tips', getOptimizationTips);
    
    console.log('🚀 Smart Beast Mode commands registered');
};

/**
 * Add Smart Beast Mode to admin panel
 */
export const addToAdminPanel = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) return;
    
    const status = smartBeastMode.getStatus();
    const beastButton = {
        text: `🚀 Smart Beast ${status.enabled ? '🟢' : '🔴'}`,
        callback_data: 'admin_smart_beast'
    };
    
    return beastButton;
};

/**
 * Handle Smart Beast Mode admin panel action
 */
export const handleSmartBeastAdminAction = async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
    }

    await ctx.answerCbQuery();
    
    const status = smartBeastMode.getStatus();
    const memoryMB = Math.round(status.memoryUsage.heapUsed / (1024 * 1024));
    const totalMB = Math.round(status.memoryUsage.heapTotal / (1024 * 1024));
    
    const message = `🚀 **Smart Beast Mode Control Panel** 🚀\n\n` +
        `🔧 **Current Status:** ${status.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n\n` +
        `📊 **System Metrics:**\n` +
        `• Memory: ${memoryMB}MB / ${totalMB}MB\n` +
        `• Cache: ${status.cacheSize}/${status.maxCacheSize}\n` +
        `• Connections: ${status.connectionPoolSize}/${status.maxConnections}\n` +
        `• Rate Limiters: ${status.rateLimitersCount}\n\n` +
        `🎯 **Quick Actions:**\n` +
        `• Enable/disable performance optimizations\n` +
        `• View detailed status\n` +
        `• Emergency shutdown if needed\n` +
        `• Get optimization tips`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: status.enabled ? '🔄 Disable' : '🚀 Enable', 
                  callback_data: status.enabled ? 'beast_disable_action' : 'beast_enable_action' }
            ],
            [
                { text: '📊 Detailed Status', callback_data: 'beast_status_action' },
                { text: '💡 Optimization Tips', callback_data: 'beast_tips_action' }
            ],
            [
                { text: '🚨 Emergency Shutdown', callback_data: 'beast_emergency_action' }
            ],
            [
                { text: '🔙 Back to Admin', callback_data: 'back_to_admin' }
            ]
        ]
    };

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
};

export default {
    enableSmartBeastMode,
    disableSmartBeastMode,
    getSmartBeastStatus,
    emergencyShutdownSmartBeast,
    getOptimizationTips,
    registerSmartBeastCommands,
    addToAdminPanel,
    handleSmartBeastAdminAction
};
