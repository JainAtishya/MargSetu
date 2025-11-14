const { Driver, Bus } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config();

async function testDriverCurrentBus() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('🍃 Connected to MongoDB');

        console.log('🧪 Testing driver currentBus population...');

        // Find the driver with population
        const driver = await Driver.findOne({ driverId: 'DRV1001' })
            .populate('currentBus', 'busId registrationNumber route');

        console.log('🔍 Driver found:', {
            driverId: driver.driverId,
            name: driver.name,
            currentBus: driver.currentBus
        });

        if (driver.currentBus) {
            console.log('✅ currentBus populated:', {
                _id: driver.currentBus._id,
                busId: driver.currentBus.busId,
                registrationNumber: driver.currentBus.registrationNumber
            });
        } else {
            console.log('❌ currentBus not populated');

            // Check raw value
            const driverRaw = await Driver.findOne({ driverId: 'DRV1001' });
            console.log('Raw currentBus value:', driverRaw.currentBus);
        }

        // Also find the bus directly
        const bus = await Bus.findOne({ busId: 'BUS001' });
        console.log('🚌 Bus BUS001 found:', {
            _id: bus._id,
            busId: bus.busId,
            registrationNumber: bus.registrationNumber
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testDriverCurrentBus();