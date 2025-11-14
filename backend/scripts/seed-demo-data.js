#!/usr/bin/env node
/*
  Seed demo data: 10 routes (e.g., Mumbai↔Pune variants) and 10 buses per route
  Creates: Authority, Drivers, Stations, Routes, Buses
*/
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Authority = require('../models/Authority');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const Route = require('../models/Route');
const Bus = require('../models/Bus');

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  try {
    console.log('🌱 Seeding demo data...');

    // 1) Ensure Authority exists
    let authority = await Authority.findOne({
      $or: [
        { username: 'admin' },
        { email: 'admin@margsetu.com' },
        { email: 'admin@margsetu.local' }
      ]
    });
    if (!authority) {
      authority = await Authority.create({
        username: 'admin',
        email: 'admin@margsetu.com',
        password: 'admin123',
        role: 'admin',
        name: 'City Authority',
        phone: '9876543210',
        permissions: ['system_admin', 'manage_buses', 'manage_drivers', 'view_buses', 'view_alerts']
      });
      console.log('✅ Created Authority admin');
    }

    // 2) Create Stations for Mumbai, Pune, and 8 others
    const cityDefs = [
      { name: 'Mumbai Central', lng: 72.8777, lat: 19.0760 },
      { name: 'Pune Railway Station', lng: 73.8740, lat: 18.5290 },
      { name: 'Nashik Road', lng: 73.7898, lat: 19.9975 },
      { name: 'Aurangabad', lng: 75.3433, lat: 19.8762 },
      { name: 'Thane', lng: 72.9781, lat: 19.2183 },
      { name: 'Lonavala', lng: 73.4050, lat: 18.7481 },
      { name: 'Kalyan', lng: 73.1305, lat: 19.2403 },
      { name: 'Panvel', lng: 73.1156, lat: 18.9894 },
      { name: 'Dadar', lng: 72.8420, lat: 19.0183 },
      { name: 'Shivajinagar', lng: 73.8521, lat: 18.5309 }
    ];

    const stations = [];
    for (const c of cityDefs) {
      let st = await Station.findOne({ name: c.name });
      if (!st) {
        st = await Station.create({
          name: c.name,
          authority: authority._id,
          location: { type: 'Point', coordinates: [c.lng, c.lat], address: c.name },
          facilities: ['waiting-area', 'shelter'],
          status: 'active',
          platformCount: rand(1, 5)
        });
        console.log(`✅ Station: ${c.name}`);
      }
      stations.push(st);
    }

    // helper: make route
    async function ensureRoute(routeId, name, startName, endName) {
      const start = stations.find(s => s.name === startName);
      const end = stations.find(s => s.name === endName);
      let r = await Route.findOne({ routeId });
      if (!r) {
        r = await Route.create({
          routeId,
          name,
          description: `${startName} to ${endName} corridor`,
          startPoint: startName,
          endPoint: endName,
          stops: [
            { name: startName, coordinates: { latitude: start.latitude, longitude: start.longitude }, order: 1, estimatedTime: 0, fare: 0 },
            { name: 'Lonavala', coordinates: { latitude: 18.7481, longitude: 73.4050 }, order: 2, estimatedTime: 120, fare: 150 },
            { name: endName, coordinates: { latitude: end.latitude, longitude: end.longitude }, order: 3, estimatedTime: 210, fare: 300 }
          ],
          totalDistance: 150,
          estimatedDuration: 210,
          operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          baseFare: 100,
          fareStructure: 'distance-based',
          isActive: true
        });
        console.log(`✅ Route: ${routeId} ${name}`);
      }
      return r;
    }

    // 3) Create 10 routes (mix centered on Mumbai↔Pune plus nearby cities)
    const routePairs = [
      ['R001', 'Mumbai Central - Pune Express', 'Mumbai Central', 'Pune Railway Station'],
      ['R002', 'Pune - Mumbai Express', 'Pune Railway Station', 'Mumbai Central'],
      ['R003', 'Mumbai - Nashik', 'Mumbai Central', 'Nashik Road'],
      ['R004', 'Nashik - Mumbai', 'Nashik Road', 'Mumbai Central'],
      ['R005', 'Pune - Aurangabad', 'Pune Railway Station', 'Aurangabad'],
      ['R006', 'Aurangabad - Pune', 'Aurangabad', 'Pune Railway Station'],
      ['R007', 'Thane - Panvel', 'Thane', 'Panvel'],
      ['R008', 'Panvel - Thane', 'Panvel', 'Thane'],
      ['R009', 'Dadar - Shivajinagar', 'Dadar', 'Shivajinagar'],
      ['R010', 'Shivajinagar - Dadar', 'Shivajinagar', 'Dadar']
    ];

    const routes = [];
    for (const [rid, name, s, e] of routePairs) {
      routes.push(await ensureRoute(rid, name, s, e));
    }

    // 4) Ensure 100 drivers (10 per route)
    const drivers = [];
    for (let i = 1; i <= 100; i++) {
      const drvId = `DRV${String(1000 + i)}`;
      const drvEmail = `driver${i}@margsetu.com`;
      const drvPhone = `9${String(100000000 + i).slice(0, 9)}`; // 10 digits starting with 9
      let d = await Driver.findOne({
        $or: [
          { driverId: drvId },
          { email: drvEmail },
          { phone: drvPhone }
        ]
      });
      if (!d) {
        d = await Driver.create({
          driverId: drvId,
          name: `Driver ${i}`,
          phone: drvPhone,
          email: drvEmail,
          password: 'pass1234',
          licenseNumber: `MH${String(100000 + i)}`,
          address: 'City Address'
        });
        console.log(`✅ Driver ${drvId}`);
      }
      drivers.push(d);
    }

    // 5) Create 10 buses per route (100 total)
    // Assign exactly one unique driver per bus in deterministic order
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let driverIndex = 0; // deterministic 1:1 mapping across all buses
    for (let rIndex = 0; rIndex < routes.length; rIndex++) {
      const route = routes[rIndex];
      for (let j = 1; j <= 10; j++) {
        const busId = `BUS${String(rIndex * 10 + j).padStart(3, '0')}`;
        let bus = await Bus.findOne({ busId });

        // Pick the next driver deterministically
        const assignedDriver = drivers[driverIndex % drivers.length];
        driverIndex++;

        if (!bus) {
          const reg = `MH${String(rand(10, 99))}${alpha[rand(0, 25)]}${alpha[rand(0, 25)]}${String(rand(1000, 9999))}`;
          bus = await Bus.create({
            busId,
            registrationNumber: reg,
            route: route._id,
            currentDriver: assignedDriver._id,
            capacity: randomChoice([35, 40, 45]),
            model: randomChoice(['Eicher Starline', 'Tata Starbus', 'Ashok Leyland Cheetah']),
            manufacturer: randomChoice(['Eicher', 'Tata', 'Ashok Leyland']),
            yearOfManufacture: randomChoice([2018, 2019, 2020, 2021, 2022, 2023]),
            fuelType: randomChoice(['diesel', 'cng']),
            status: 'active',
            operationalStatus: 'running',
            currentLocation: {
              coordinates: { type: 'Point', coordinates: [73.8740 + Math.random() * 0.1, 18.5290 + Math.random() * 0.1] },
              lastUpdated: new Date(),
              speed: rand(10, 50),
              heading: rand(0, 360)
            },
            maintenance: { lastService: new Date(), mileage: rand(10000, 120000) },
            emergencyFeatures: { panicButton: true, gpsTracker: true }
          });
          console.log(`✅ Bus ${bus.busId} (${bus.registrationNumber}) on ${route.name}`);
        } else {
          // Ensure deterministic assignment even for existing bus
          bus.currentDriver = assignedDriver._id;
          await bus.save();
        }

        // Backfill the driver's currentBus to match the assignment
        if (!assignedDriver.currentBus || String(assignedDriver.currentBus) !== String(bus._id)) {
          assignedDriver.currentBus = bus._id;
          await assignedDriver.save();
        }
      }
    }

    console.log('✅ Seeding complete');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
})();
