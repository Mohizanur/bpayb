import smartBeastMode from './smartBeastMode.js';
import smartBeastCommands from './smartBeastCommands.js';
import smartBeastIntegration from './smartBeastIntegration.js';
import { firestore } from './firestore.js';

/**
 * 🚀 SMART BEAST MODE MAIN INTEGRATION
 * 
 * This file serves as the main entry point for integrating Smart Beast Mode
 * with your existing bot system
 */

/**
 * Initialize Smart Beast Mode system
 */
export const initializeSmartBeastMode = async () => {
    try {
        console.log('🚀 Initializing Smart Beast Mode system...');
        
        // Check if Smart Beast Mode should be auto-enabled
        await checkAutoEnableConfig();
        
        // Initialize integration components
        await smartBeastIntegration.smartBeastDB.initialize();
        
        console.log('✅ Smart Beast Mode system initialized successfully');
        
        // Log system status
        const status = smartBeastMode.getStatus();
        console.log(`📊 System Status: ${status.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`);
        console.log(`💾 Memory: ${Math.round(status.memoryUsage.heapUsed / (1024 * 1024))}MB / ${Math.round(status.memoryUsage.heapTotal / (1024 * 1024))}MB`);
        
    } catch (error) {
        console.error('❌ Error initializing Smart Beast Mode:', error);
    }
};

/**
 * Check if Smart Beast Mode should be auto-enabled
 */
const checkAutoEnableConfig = async () => {
    try {
        const configDoc = await firestore.collection('config').doc('smartBeast').get();
        
        if (configDoc.exists) {
            const config = configDoc.data();
            
            if (config.autoEnable && !smartBeastMode.isEnabled) {
                console.log('🔄 Auto-enabling Smart Beast Mode from config...');
                smartBeastMode.enable();
                
                // Update config with last enabled timestamp
                await firestore.collection('config').doc('smartBeast').update({
                    lastEnabled: new Date(),
                    enabledBy: 'auto'
                });
            }
        } else {
            // Create default config if it doesn't exist
            await firestore.collection('config').doc('smartBeast').set({
                autoEnable: false,
                maxCacheSize: 1000,
                maxConnections: 50,
                performanceThreshold: 1000, // ms
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('📝 Created default Smart Beast Mode config');
        }
    } catch (error) {
        console.warn('⚠️ Could not check Smart Beast config:', error.message);
    }
};

/**
 * Register Smart Beast Mode with the bot
 */
export const registerSmartBeastMode = (bot) => {
    try {
        // Register commands
        smartBeastCommands.registerSmartBeastCommands(bot);
        
        // Register admin panel integration
        registerAdminPanelIntegration(bot);
        
        console.log('✅ Smart Beast Mode registered with bot successfully');
        
    } catch (error) {
        console.error('❌ Error registering Smart Beast Mode:', error);
    }
};

/**
 * Register admin panel integration
 */
const registerAdminPanelIntegration = (bot) => {
    // Handle Smart Beast Mode admin panel actions
    bot.action('admin_smart_beast', async (ctx) => {
        await smartBeastCommands.handleSmartBeastAdminAction(ctx);
    });
    
    // Handle Smart Beast Mode action buttons
    bot.action('beast_enable_action', async (ctx) => {
        await smartBeastCommands.enableSmartBeastMode(ctx);
        // Refresh the admin panel
        setTimeout(async () => {
            await smartBeastCommands.handleSmartBeastAdminAction(ctx);
        }, 1000);
    });
    
    bot.action('beast_disable_action', async (ctx) => {
        await smartBeastCommands.disableSmartBeastMode(ctx);
        // Refresh the admin panel
        setTimeout(async () => {
            await smartBeastCommands.handleSmartBeastAdminAction(ctx);
        }, 1000);
    });
    
    bot.action('beast_status_action', async (ctx) => {
        await smartBeastCommands.getSmartBeastStatus(ctx);
    });
    
    bot.action('beast_tips_action', async (ctx) => {
        await smartBeastCommands.getOptimizationTips(ctx);
    });
    
    bot.action('beast_emergency_action', async (ctx) => {
        await smartBeastCommands.emergencyShutdownSmartBeast(ctx);
    });
    
    console.log('✅ Smart Beast Mode admin panel integration registered');
};

/**
 * Add Smart Beast Mode to admin panel
 */
export const addSmartBeastToAdminPanel = async (ctx) => {
    try {
        return await smartBeastCommands.addToAdminPanel(ctx);
    } catch (error) {
        console.error('Error adding Smart Beast to admin panel:', error);
        return null;
    }
};

/**
 * Get Smart Beast Mode status for monitoring
 */
export const getSmartBeastStatus = () => {
    return smartBeastMode.getStatus();
};

/**
 * Enable Smart Beast Mode programmatically
 */
export const enableSmartBeastMode = async () => {
    try {
        smartBeastMode.enable();
        
        // Update config
        await firestore.collection('config').doc('smartBeast').update({
            lastEnabled: new Date(),
            enabledBy: 'programmatic',
            updatedAt: new Date()
        });
        
        console.log('✅ Smart Beast Mode enabled programmatically');
        return true;
    } catch (error) {
        console.error('❌ Error enabling Smart Beast Mode programmatically:', error);
        return false;
    }
};

/**
 * Disable Smart Beast Mode programmatically
 */
export const disableSmartBeastMode = async () => {
    try {
        smartBeastMode.disable();
        
        // Update config
        await firestore.collection('config').doc('smartBeast').update({
            lastDisabled: new Date(),
            disabledBy: 'programmatic',
            updatedAt: new Date()
        });
        
        console.log('✅ Smart Beast Mode disabled programmatically');
        return true;
    } catch (error) {
        console.error('❌ Error disabling Smart Beast Mode programmatically:', error);
        return false;
    }
};

/**
 * Emergency shutdown
 */
export const emergencyShutdown = async () => {
    try {
        smartBeastMode.emergencyShutdown();
        
        // Update config
        await firestore.collection('config').doc('smartBeast').update({
            lastEmergencyShutdown: new Date(),
            emergencyShutdownBy: 'system',
            updatedAt: new Date()
        });
        
        console.log('🚨 Smart Beast Mode emergency shutdown executed');
        return true;
    } catch (error) {
        console.error('❌ Error during emergency shutdown:', error);
        return false;
    }
};

/**
 * Performance monitoring integration
 */
export const recordOperationPerformance = (operation, duration, success) => {
    try {
        smartBeastIntegration.smartBeastMonitor.recordOperation(operation, duration, success);
    } catch (error) {
        console.warn('⚠️ Could not record operation performance:', error.message);
    }
};

/**
 * Get performance recommendations
 */
export const getPerformanceRecommendations = () => {
    try {
        const status = smartBeastMode.getStatus();
        const memoryMB = Math.round(status.memoryUsage.heapUsed / (1024 * 1024));
        const totalMB = Math.round(status.memoryUsage.heapTotal / (1024 * 1024));
        const memoryUsagePercent = Math.round((memoryMB / totalMB) * 100);
        
        const recommendations = [];
        
        if (memoryUsagePercent > 80) {
            recommendations.push({
                type: 'warning',
                message: 'High memory usage detected',
                action: 'Consider restarting the bot or enabling Smart Beast Mode',
                priority: 'high'
            });
        } else if (memoryUsagePercent > 60) {
            recommendations.push({
                type: 'info',
                message: 'Moderate memory usage',
                action: 'Smart Beast Mode can help optimize memory',
                priority: 'medium'
            });
        }
        
        if (status.cacheSize > status.maxCacheSize * 0.8) {
            recommendations.push({
                type: 'info',
                message: 'Cache nearly full',
                action: 'Smart Beast Mode will automatically manage this',
                priority: 'low'
            });
        }
        
        return {
            memoryUsage: memoryUsagePercent,
            recommendations,
            smartBeastEnabled: status.enabled
        };
    } catch (error) {
        console.error('Error getting performance recommendations:', error);
        return { error: 'Could not get recommendations' };
    }
};

/**
 * Health check for Smart Beast Mode
 */
export const healthCheck = async () => {
    try {
        const status = smartBeastMode.getStatus();
        const recommendations = getPerformanceRecommendations();
        
        return {
            healthy: true,
            timestamp: new Date(),
            status,
            recommendations,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    } catch (error) {
        return {
            healthy: false,
            timestamp: new Date(),
            error: error.message,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    }
};

// Auto-initialize when module is imported
if (typeof window === 'undefined') { // Node.js environment
    initializeSmartBeastMode().catch(console.error);
}

export default {
    initializeSmartBeastMode,
    registerSmartBeastMode,
    addSmartBeastToAdminPanel,
    getSmartBeastStatus,
    enableSmartBeastMode,
    disableSmartBeastMode,
    emergencyShutdown,
    recordOperationPerformance,
    getPerformanceRecommendations,
    healthCheck
};
