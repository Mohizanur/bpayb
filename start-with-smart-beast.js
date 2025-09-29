/**
 * 🚀 START BOT WITH SMART BEAST MODE
 * 
 * This script starts your bot with Smart Beast Mode enabled
 */

import 'dotenv/config';
import { bot } from './src/bot.js';
import smartBeastMain from './src/utils/smartBeastMain.js';

console.log('🚀 Starting Bot with Smart Beast Mode...\n');

async function startBotWithSmartBeast() {
    try {
        // Initialize Smart Beast Mode
        console.log('📋 Initializing Smart Beast Mode...');
        await smartBeastMain.initializeSmartBeastMode();
        smartBeastMain.registerSmartBeastMode(bot);
        console.log('✅ Smart Beast Mode initialized successfully\n');

        // Auto-enable Smart Beast Mode for production
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Auto-enabling Smart Beast Mode for production...');
            await smartBeastMain.enableSmartBeastMode();
            console.log('✅ Smart Beast Mode enabled for production\n');
        }

        // Start the bot
        console.log('🤖 Starting Telegram bot...');
        await bot.launch();
        console.log('✅ Bot started successfully!\n');

        // Show status
        const status = smartBeastMain.getSmartBeastStatus();
        console.log('📊 Smart Beast Mode Status:');
        console.log(`   Enabled: ${status.enabled ? '🟢 YES' : '🔴 NO'}`);
        console.log(`   Cache Size: ${status.cacheSize}/${status.maxCacheSize}`);
        console.log(`   Memory Usage: ${Math.round(status.memoryUsage.heapUsed / (1024 * 1024))}MB`);
        console.log(`   Uptime: ${Math.round(status.uptime / 60)} minutes\n`);

        console.log('🎯 Bot is ready! Available commands:');
        console.log('   /beast_enable  - Enable Smart Beast Mode');
        console.log('   /beast_disable - Disable Smart Beast Mode');
        console.log('   /beast_status  - Check performance status');
        console.log('   /beast_tips    - Get optimization tips');
        console.log('   /beast_emergency - Emergency shutdown\n');

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🔄 Shutting down gracefully...');
            try {
                await smartBeastMain.disableSmartBeastMode();
                console.log('✅ Smart Beast Mode disabled');
            } catch (error) {
                console.error('❌ Error disabling Smart Beast Mode:', error.message);
            }
            bot.stop('SIGINT');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🔄 Shutting down gracefully...');
            try {
                await smartBeastMain.disableSmartBeastMode();
                console.log('✅ Smart Beast Mode disabled');
            } catch (error) {
                console.error('❌ Error disabling Smart Beast Mode:', error.message);
            }
            bot.stop('SIGTERM');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start bot with Smart Beast Mode:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Start the bot
startBotWithSmartBeast().catch(console.error);
