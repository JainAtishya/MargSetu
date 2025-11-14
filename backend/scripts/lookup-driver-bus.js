#!/usr/bin/env node
// Query the DB for a driver's assigned bus(es)
// Usage: node scripts/lookup-driver-bus.js DRV1001

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Driver, Bus } = require('../models');

const driverIdArg = process.argv[2] || process.env.DRIVER_ID || 'DRV1001';

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Error: MONGODB_URI is not set in backend/.env');
        process.exit(1);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    try {
        console.log(`Looking up assignments for driverId: ${driverIdArg}\n`);

        const driver = await Driver.findOne({ driverId: driverIdArg });
        if (!driver) {
            console.error(`Driver not found: ${driverIdArg}`);
            const sample = await Driver.find({}).limit(5).select('driverId name');
            if (sample.length) {
                console.log('\nHere are some existing drivers you can try:');
                sample.forEach(d => console.log(`  - ${d.driverId} (${d.name})`));
            }
            process.exit(2);
        }

        const buses = await Bus.find({ currentDriver: driver._id })
            .populate('route', 'routeId name')
            .select('busId registrationNumber route');

        console.log(`Driver: ${driver.driverId} (${driver.name})`);
        console.log(`Driver _id: ${driver._id}`);

        if (!buses.length) {
            console.log('\nNo buses currently assigned to this driver (currentDriver).');
            console.log('Note: seed-demo-data.js assigns drivers randomly per bus.');
        } else {
            console.log(`\nAssigned bus count: ${buses.length}`);
            buses.forEach((bus, i) => {
                const routeInfo = bus.route ? `${bus.route.routeId} - ${bus.route.name}` : 'N/A';
                console.log(`  ${i + 1}. BusId: ${bus.busId}, Reg: ${bus.registrationNumber}, Route: ${routeInfo}`);
            });
        }

        console.log('\nRun with a different driverId:');
        console.log('  node scripts/lookup-driver-bus.js DRV1002');
    } catch (err) {
        console.error('Lookup error:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();
