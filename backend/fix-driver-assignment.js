const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const driverSchema = new mongoose.Schema({
    driverId: String,
    name: String,
    phone: String,
    currentBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    isActive: { type: Boolean, default: true }
});

const busSchema = new mongoose.Schema({
    busId: String,
    registrationNumber: String,
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' }
});

const Driver = mongoose.model('Driver', driverSchema);
const Bus = mongoose.model('Bus', busSchema);

async function fixDriverBusAssignment() {
    try {
        console.log('🔍 Finding driver and bus...');

        const driver = await Driver.findOne({ driverId: 'DRV1001' });
        const bus = await Bus.findOne({ busId: 'BUS001' });

        if (!driver) {
            console.error('❌ Driver DRV1001 not found');
            return;
        }

        if (!bus) {
            console.error('❌ Bus BUS001 not found');
            return;
        }

        console.log('✅ Driver found:', driver.driverId);
        console.log('✅ Bus found:', bus.busId);
        console.log('🔧 Current assignment:', driver.currentBus);
        console.log('🎯 Target bus ID:', bus._id);

        // Fix the assignment
        driver.currentBus = bus._id;
        await driver.save();

        console.log('✅ FIXED! Driver DRV1001 assigned to bus BUS001');

        // Verify
        const updated = await Driver.findOne({ driverId: 'DRV1001' }).populate('currentBus');
        console.log('✅ Verification - currentBus:', updated.currentBus?.busId);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}

mongoose.connection.once('open', () => {
    console.log('🍃 Connected to MongoDB');
    fixDriverBusAssignment();
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});