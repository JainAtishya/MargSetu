const cron = require('node-cron');
const { checkIdleBuses } = require('../controllers/alertController');

class AlertSchedulerService {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  // Start all scheduled alert jobs
  start() {
    if (this.isRunning) {
      console.log('⚠️ Alert scheduler is already running');
      return;
    }

    console.log('🚀 Starting Alert Scheduler Service...');

    // Check for idle buses every 5 minutes
    const idleBusJob = cron.schedule('*/5 * * * *', async () => {
      console.log('⏰ Running idle bus check...');
      try {
        await checkIdleBuses();
      } catch (error) {
        console.error('❌ Error in idle bus check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Check for stale location data every 10 minutes
    const staleDataJob = cron.schedule('*/10 * * * *', async () => {
      console.log('⏰ Checking for stale location data...');
      try {
        await this.checkStaleLocationData();
      } catch (error) {
        console.error('❌ Error in stale data check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Auto-escalate unacknowledged critical alerts every 2 minutes
    const escalationJob = cron.schedule('*/2 * * * *', async () => {
      try {
        await this.escalateUnacknowledgedAlerts();
      } catch (error) {
        console.error('❌ Error in alert escalation:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Cleanup old alerts daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running daily alert cleanup...');
      try {
        await this.cleanupOldAlerts();
      } catch (error) {
        console.error('❌ Error in alert cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Start all jobs
    idleBusJob.start();
    staleDataJob.start();
    escalationJob.start();
    cleanupJob.start();

    this.jobs = [
      { name: 'idleBusCheck', job: idleBusJob, interval: '5 minutes' },
      { name: 'staleDataCheck', job: staleDataJob, interval: '10 minutes' },
      { name: 'alertEscalation', job: escalationJob, interval: '2 minutes' },
      { name: 'alertCleanup', job: cleanupJob, interval: 'daily at 2 AM' }
    ];

    this.isRunning = true;

    console.log('✅ Alert Scheduler Service started successfully');
    console.log('📋 Active jobs:');
    this.jobs.forEach(job => {
      console.log(`   - ${job.name}: every ${job.interval}`);
    });
  }

  // Stop all scheduled jobs
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Alert scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Alert Scheduler Service...');

    this.jobs.forEach(job => {
      job.job.stop();
      job.job.destroy();
    });

    this.jobs = [];
    this.isRunning = false;

    console.log('✅ Alert Scheduler Service stopped');
  }

  // Check for buses with stale location data
  async checkStaleLocationData() {
    try {
      const { Bus, Location, Alert } = require('../models');
      
      const activeBuses = await Bus.find({
        isActive: true,
        status: 'active',
        operationalStatus: 'running',
        currentDriver: { $ne: null }
      }).populate('currentDriver', 'driverId name');

      const staleThresholdMinutes = 15;
      const currentTime = new Date();

      for (const bus of activeBuses) {
        const latestLocation = await Location.getLatestForBus(bus._id);
        
        if (!latestLocation) {
          // No location data at all
          await this.createStaleDataAlert(bus, 'No location data available', 'no_data');
          continue;
        }

        const ageMinutes = Math.floor((currentTime - latestLocation.createdAt) / (1000 * 60));
        
        if (ageMinutes >= staleThresholdMinutes) {
          // Check if we already have an active stale data alert
          const existingAlert = await Alert.findOne({
            bus: bus._id,
            type: 'route_deviation', // Using route_deviation type for stale data
            status: { $in: ['active', 'acknowledged'] },
            'metadata.alertSubType': 'stale_data',
            createdAt: { $gte: new Date(currentTime - 60 * 60 * 1000) } // Within last hour
          });

          if (!existingAlert) {
            await this.createStaleDataAlert(
              bus, 
              `Location data is ${ageMinutes} minutes old. Driver may be offline.`,
              'stale_data'
            );
          }
        }
      }

    } catch (error) {
      console.error('Error checking stale location data:', error);
    }
  }

  // Create alert for stale location data
  async createStaleDataAlert(bus, description, subType) {
    try {
      const { Alert } = require('../models');

      const alert = new Alert({
        type: 'route_deviation',
        severity: 'medium',
        title: `📡 Communication Lost - ${bus.busId}`,
        description: `${description}\n\nBus: ${bus.busId} (${bus.registrationNumber})\nDriver: ${bus.currentDriver?.name || 'Unknown'}\nStatus: ${bus.operationalStatus}`,
        bus: bus._id,
        driver: bus.currentDriver?._id,
        route: bus.route,
        location: {
          coordinates: bus.currentLocation.coordinates
        },
        priority: 5,
        metadata: {
          alertSubType: subType,
          lastCommunication: bus.currentLocation.lastUpdated
        },
        tags: ['communication', 'monitoring', 'automated']
      });

      await alert.save();
      console.log(`📡 Created stale data alert for bus ${bus.busId}: ${alert.alertId}`);

    } catch (error) {
      console.error('Error creating stale data alert:', error);
    }
  }

  // Auto-escalate unacknowledged critical alerts
  async escalateUnacknowledgedAlerts() {
    try {
      const { Alert } = require('../models');
      
      const currentTime = new Date();
      const escalationThreshold = 5; // 5 minutes

      const unacknowledgedCriticalAlerts = await Alert.find({
        severity: 'critical',
        status: 'active',
        createdAt: { $lte: new Date(currentTime - escalationThreshold * 60 * 1000) },
        escalationLevel: { $lt: 3 } // Don't escalate beyond level 3
      });

      for (const alert of unacknowledgedCriticalAlerts) {
        await alert.escalate();
        
        // Send escalation notification
        const io = require('../server').io;
        if (io) {
          io.to('authority-dashboard').emit('alertEscalated', {
            alertId: alert.alertId,
            escalationLevel: alert.escalationLevel,
            type: alert.type,
            severity: alert.severity,
            ageMinutes: alert.ageInMinutes,
            message: `ESCALATED: Alert ${alert.alertId} requires immediate attention`
          });
        }

        console.log(`🔼 Escalated alert ${alert.alertId} to level ${alert.escalationLevel}`);
      }

    } catch (error) {
      console.error('Error escalating alerts:', error);
    }
  }

  // Cleanup old resolved alerts
  async cleanupOldAlerts() {
    try {
      const { Alert } = require('../models');
      
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 30); // 30 days old

      // Delete old resolved alerts
      const deleteResult = await Alert.deleteMany({
        status: 'resolved',
        'resolvedBy.resolvedAt': { $lte: cleanupDate }
      });

      console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} old resolved alerts`);

      // Archive old dismissed alerts (mark as archived instead of deleting)
      const archiveResult = await Alert.updateMany({
        status: 'dismissed',
        createdAt: { $lte: cleanupDate }
      }, {
        $set: { archived: true }
      });

      console.log(`📦 Archived ${archiveResult.modifiedCount} old dismissed alerts`);

    } catch (error) {
      console.error('Error cleaning up alerts:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.length,
      jobs: this.jobs.map(job => ({
        name: job.name,
        interval: job.interval,
        running: job.job.running || false
      }))
    };
  }

  // Manual trigger for testing
  async triggerManualCheck(checkType = 'all') {
    console.log(`🔧 Manual trigger: ${checkType}`);
    
    try {
      switch (checkType) {
        case 'idle':
          await checkIdleBuses();
          break;
        case 'stale':
          await this.checkStaleLocationData();
          break;
        case 'escalation':
          await this.escalateUnacknowledgedAlerts();
          break;
        case 'cleanup':
          await this.cleanupOldAlerts();
          break;
        case 'all':
        default:
          await checkIdleBuses();
          await this.checkStaleLocationData();
          await this.escalateUnacknowledgedAlerts();
          break;
      }
      console.log(`✅ Manual trigger completed: ${checkType}`);
    } catch (error) {
      console.error(`❌ Error in manual trigger (${checkType}):`, error);
      throw error;
    }
  }
}

// Create singleton instance
const alertScheduler = new AlertSchedulerService();

module.exports = alertScheduler;