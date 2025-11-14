const { Driver, Bus } = require('./models');
const mongoose = require('mongoose');

async function fixDriverBusAssignment() {
    try {
        console.log('🔍 Checking driver-bus assignment...');

        // Find driver DRV1001
        const driver = await Driver.findOne({ driverId: 'DRV1001' });
        if (!driver) {
            console.error('❌ Driver DRV1001 not found');
            return;
        }
        console.log('✅ Driver found:', driver.driverId);

        // Find bus BUS001  
        const bus = await Bus.findOne({ busId: 'BUS001' });
        if (!bus) {
            console.error('❌ Bus BUS001 not found');
            return;
        }
        console.log('✅ Bus found:', bus.busId);

        // Check current assignment
        console.log('Current driver.currentBus:', driver.currentBus);
        console.log('Expected bus._id:', bus._id);

        const isCorrect = driver.currentBus && driver.currentBus.toString() === bus._id.toString();
        console.log('Assignment correct:', isCorrect);

        if (!isCorrect) {
            console.log('🔧 Fixing driver-bus assignment...');
            driver.currentBus = bus._id;
            await driver.save();
            console.log('✅ Driver DRV1001 assigned to bus BUS001');
        } else {
            console.log('✅ Assignment already correct');
        }

        // Verify the fix
        const updatedDriver = await Driver.findOne({ driverId: 'DRV1001' }).populate('currentBus');
        console.log('✅ Verification - Driver currentBus:', updatedDriver.currentBus?.busId);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

// Wait a moment for DB connection to be ready
setTimeout(fixDriverBusAssignment, 2000);