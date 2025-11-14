# Setup Database for Driver App Testing

## Quick Start
To populate your MongoDB with sample drivers and buses for testing the Kotlin driver app:

```bash
cd Backend
node seed-database.js
```

## What This Creates

### 🛤️ Sample Routes
- **ROUTE001**: Central Station to Airport (3 stops)
- **ROUTE002**: University to Business District (3 stops)

### 🚌 Sample Buses  
- **BUS001**: MH12AB1234 (Ashok Leyland Viking, 40 seats)
- **BUS002**: MH12CD5678 (Tata Starbus, 35 seats)  
- **BUS003**: MH12EF9012 (Mahindra Tourister, 50 seats)
- **BUS004**: MH12GH3456 (Force Traveller, 45 seats)
- **BUS005**: MH12IJ7890 (Eicher Skyline Pro, 30 seats)

### 👨‍✈️ Sample Drivers
- **DRV0001**: Rajesh Kumar (9876543210) → Assigned to BUS001
- **DRV0002**: Amit Sharma (9876543212) → Assigned to BUS002  
- **DRV0003**: Vikram Singh (9876543214) → Assigned to BUS003
- **DRV0004**: Suresh Patil (9876543216) → Assigned to BUS004
- **DRV0005**: Mohammed Khan (9876543218) → Assigned to BUS005

## 🔑 Login Credentials for Testing

All drivers use the same password for testing:

| Driver ID | Password | Assigned Bus | Driver Name |
|-----------|----------|--------------|-------------|
| DRV0001   | driver123| BUS001       | Rajesh Kumar|
| DRV0002   | driver123| BUS002       | Amit Sharma |
| DRV0003   | driver123| BUS003       | Vikram Singh|
| DRV0004   | driver123| BUS004       | Suresh Patil|
| DRV0005   | driver123| BUS005       | Mohammed Khan|

## 📱 For Your Kotlin Driver App

Your friend can now test the driver app login functionality:

1. **Choose any driver**: Use DRV0001, DRV0002, DRV0003, DRV0004, or DRV0005
2. **Enter password**: driver123
3. **Bus assignment**: Each driver is automatically assigned to a specific bus
4. **Test login**: The app should successfully authenticate and show driver details

### Example Login Test:
```
Driver ID: DRV0001
Password: driver123
```

This will authenticate Rajesh Kumar and show his assignment to BUS001 (MH12AB1234).

## ⚠️ Important Notes

- **Clears existing data**: The seed script will remove all existing drivers, buses, and routes
- **Development only**: These are test credentials - change for production
- **MongoDB connection**: Ensure your MongoDB Atlas connection is working
- **Environment setup**: Make sure your `.env` file has the correct MONGODB_URI

## 🔄 Re-running the Seed

You can run the seed script multiple times. Each time it will:
1. Clear all existing driver, bus, and route data
2. Create fresh sample data
3. Show a summary of what was created

## 🐛 Troubleshooting

If the seed fails:
1. Check your MongoDB connection string in `.env`
2. Ensure MongoDB Atlas is accessible
3. Verify the Driver, Bus, and Route models exist
4. Check console output for specific error messages

Now your friend's Kotlin driver app should be able to successfully authenticate drivers!