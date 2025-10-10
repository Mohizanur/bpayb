import cron from 'node-cron';
import { checkExpirationReminders } from './expirationReminder.js';

/**
 * Scheduler for automated tasks
 * DISABLED BY DEFAULT - Set ENABLE_EXPIRATION_REMINDERS=true to enable
 * 
 * Note: Expiration reminders are resource-intensive and optional
 * They read all active subscriptions to check for expiring ones
 * Only enable if you need automated expiration notifications
 */

let schedulerRunning = false;

// Schedule expiration checks to run daily at 9:00 AM
export const startScheduler = () => {
  // Check if expiration reminders are enabled
  if (process.env.ENABLE_EXPIRATION_REMINDERS !== 'true') {
    console.log('⏭️  Expiration reminder scheduler DISABLED (quota optimization)');
    console.log('💡 Set ENABLE_EXPIRATION_REMINDERS=true to enable if needed');
    return;
  }

  if (schedulerRunning) {
    console.log('⚠️ Scheduler already running');
    return;
  }

  console.log('🕐 Starting BirrPay scheduler...');
  
  // Daily expiration check at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled expiration check...');
    try {
      const result = await checkExpirationReminders();
      console.log(`✅ Scheduled expiration check completed:`, result);
    } catch (error) {
      console.error('❌ Error in scheduled expiration check:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Addis_Ababa" // Ethiopian timezone
  });

  // Additional check at 6:00 PM for urgent reminders (1 day left)
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Running evening expiration check for urgent reminders...');
    try {
      const result = await checkExpirationReminders();
      console.log(`✅ Evening expiration check completed:`, result);
    } catch (error) {
      console.error('❌ Error in evening expiration check:', error);
    }
  }, {
    scheduled: true,
    timezone: "Africa/Addis_Ababa"
  });

  // Test run on startup (after 30 seconds)
  setTimeout(async () => {
    console.log('🧪 Running initial expiration check...');
    try {
      const result = await checkExpirationReminders();
      console.log(`✅ Initial expiration check completed:`, result);
    } catch (error) {
      console.error('❌ Error in initial expiration check:', error);
    }
  }, 30000);

  schedulerRunning = true;
  console.log('✅ BirrPay scheduler started successfully');
  console.log('📅 Daily checks scheduled at 9:00 AM and 6:00 PM (Ethiopian time)');
};

// Stop the scheduler
export const stopScheduler = () => {
  if (!schedulerRunning) {
    console.log('⚠️ Scheduler not running');
    return;
  }

  cron.destroy();
  schedulerRunning = false;
  console.log('🛑 BirrPay scheduler stopped');
};

// Get scheduler status
export const getSchedulerStatus = () => {
  return {
    running: schedulerRunning,
    timezone: 'Africa/Addis_Ababa',
    schedules: [
      { time: '9:00 AM', description: 'Daily expiration check' },
      { time: '6:00 PM', description: 'Evening urgent reminders' }
    ]
  };
};
