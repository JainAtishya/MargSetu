// Consolidated passenger app API endpoint
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { action } = req.query;
    
    console.log('🚌 Passenger API request:', { action, query: req.query, method: req.method });
    
    switch (action) {
      case 'search':
        return handleBusSearch(req, res);
      case 'nearby':
        return handleNearbyBuses(req, res);
      case 'stations':
        return handleStations(req, res);
      case 'timetable':
        return handleTimetable(req, res);
      case 'bus-details':
        return handleBusDetails(req, res);
      case 'bus-location':
        return handleBusLocation(req, res);
      default:
        return res.status(400).json({ 
          error: 'Invalid action. Supported: search, nearby, stations, timetable, bus-details, bus-location' 
        });
    }
    
  } catch (error) {
    console.error('Passenger API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Handle bus search
async function handleBusSearch(req, res) {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ 
      error: 'Missing required parameters: from and to' 
    });
  }
  
  const mockBuses = [
    {
      busId: "BUS001",
      busNumber: "MH-01-5678", 
      route: `${from} - ${to}`,
      driverName: "Rajesh Kumar",
      driverPhone: "+919876543210",
      capacity: 40,
      currentPassengers: 12,
      status: "ACTIVE",
      currentLocation: {
        latitude: 19.0760,
        longitude: 72.8777,
        timestamp: new Date().toISOString(),
        address: "Mumbai Central Station"
      },
      estimatedArrival: "25 minutes",
      fare: 350,
      amenities: ["AC", "WiFi", "GPS Tracking", "USB Charging"]
    },
    {
      busId: "BUS002", 
      busNumber: "MH-02-9012",
      route: `${from} - ${to}`,
      driverName: "Amit Singh",
      driverPhone: "+919876543211",
      capacity: 35,
      currentPassengers: 28,
      status: "ACTIVE",
      currentLocation: {
        latitude: 19.0400,
        longitude: 72.9200,
        timestamp: new Date().toISOString(),
        address: "Thane Junction"
      },
      estimatedArrival: "15 minutes",
      fare: 300,
      amenities: ["Non-AC", "GPS Tracking"]
    },
    {
      busId: "BUS003",
      busNumber: "MH-03-3456",
      route: `${from} - ${to}`,
      driverName: "Priya Sharma",
      driverPhone: "+919876543212",
      capacity: 45,
      currentPassengers: 20,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.9900,
        longitude: 73.1200,
        timestamp: new Date().toISOString(),
        address: "Kalyan"
      },
      estimatedArrival: "30 minutes",
      fare: 380,
      amenities: ["Sleeper AC", "WiFi", "GPS Tracking", "Entertainment"]
    },
    {
      busId: "BUS004",
      busNumber: "MH-04-7890",
      route: `${from} - ${to}`,
      driverName: "Vikram Patil",
      driverPhone: "+919876543213",
      capacity: 50,
      currentPassengers: 5,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.8500,
        longitude: 73.3000,
        timestamp: new Date().toISOString(),
        address: "Lonavala"
      },
      estimatedArrival: "45 minutes",
      fare: 420,
      amenities: ["Volvo AC", "WiFi", "GPS Tracking", "Meal Service"]
    },
    {
      busId: "BUS005",
      busNumber: "MH-05-1234",
      route: `${from} - ${to}`,
      driverName: "Sunita Desai",
      driverPhone: "+919876543214",
      capacity: 40,
      currentPassengers: 32,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.7500,
        longitude: 73.4500,
        timestamp: new Date().toISOString(),
        address: "Khandala Hills"
      },
      estimatedArrival: "20 minutes",
      fare: 280,
      amenities: ["Semi-Sleeper", "GPS Tracking"]
    },
    {
      busId: "BUS006",
      busNumber: "MH-06-5678",
      route: `${from} - ${to}`,
      driverName: "Manoj Yadav",
      driverPhone: "+919876543215",
      capacity: 38,
      currentPassengers: 15,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.6500,
        longitude: 73.6000,
        timestamp: new Date().toISOString(),
        address: "Talegaon"
      },
      estimatedArrival: "35 minutes",
      fare: 320,
      amenities: ["AC", "WiFi", "GPS Tracking"]
    },
    {
      busId: "BUS007",
      busNumber: "MH-07-9876",
      route: `${from} - ${to}`,
      driverName: "Kavita Joshi",
      driverPhone: "+919876543216",
      capacity: 42,
      currentPassengers: 8,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.5800,
        longitude: 73.7200,
        timestamp: new Date().toISOString(),
        address: "Pimpri-Chinchwad"
      },
      estimatedArrival: "40 minutes",
      fare: 365,
      amenities: ["Premium AC", "WiFi", "GPS Tracking", "Recliner Seats"]
    },
    {
      busId: "BUS008",
      busNumber: "MH-08-4321",
      route: `${from} - ${to}`,
      driverName: "Ravi Bhosale",
      driverPhone: "+919876543217",
      capacity: 36,
      currentPassengers: 22,
      status: "ACTIVE",
      currentLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        timestamp: new Date().toISOString(),
        address: "Pune Station"
      },
      estimatedArrival: "50 minutes",  
      fare: 340,
      amenities: ["AC", "GPS Tracking", "Reading Lights"]
    }
  ];
  
  return res.status(200).json({
    success: true,
    message: `Found ${mockBuses.length} buses for route ${from} to ${to}`,
    buses: mockBuses,
    data: mockBuses
  });
}

// Handle nearby buses
async function handleNearbyBuses(req, res) {
  let latitude, longitude, radius;
  
  if (req.method === 'GET') {
    latitude = parseFloat(req.query.latitude);
    longitude = parseFloat(req.query.longitude);
    radius = parseFloat(req.query.radius) || 5.0;
  } else {
    const body = req.body;
    latitude = parseFloat(body.latitude);
    longitude = parseFloat(body.longitude);
    radius = parseFloat(body.radius) || 5.0;
  }
  
  if (!latitude || !longitude) {
    return res.status(400).json({ 
      error: 'Missing required parameters: latitude and longitude' 
    });
  }
  
  const mockBuses = [
    {
      busId: "BUS001",
      busNumber: "PB-01-5678",
      distance: 2.3,
      route: "Rajpura - Chandigarh",
      status: "ACTIVE",
      estimatedArrival: "8 minutes"
    },
    {
      busId: "BUS002",
      busNumber: "PB-02-9012", 
      distance: 1.8,
      route: "Zirakpur - Mohali",
      status: "ACTIVE",
      estimatedArrival: "12 minutes"
    }
  ];
  
  return res.status(200).json({
    success: true,
    message: `Found ${mockBuses.length} buses within ${radius}km`,
    data: mockBuses
  });
}

// Handle stations
async function handleStations(req, res) {
  const stations = [
    {
      stationId: "RAJPURA",
      name: "Rajpura Bus Stand",
      location: { latitude: 30.4787, longitude: 76.5951 },
      city: "Rajpura",
      facilities: ["Waiting Area", "Ticket Counter", "Restrooms"]
    },
    {
      stationId: "ZIRAKPUR",
      name: "Zirakpur Terminal", 
      location: { latitude: 30.6421, longitude: 76.8175 },
      city: "Zirakpur",
      facilities: ["Waiting Area", "Food Court", "Parking"]
    },
    {
      stationId: "CHANDIGARH",
      name: "Chandigarh ISBT Sector 17",
      location: { latitude: 30.7333, longitude: 76.7794 },
      city: "Chandigarh", 
      facilities: ["Waiting Area", "Food Court", "ATM", "WiFi"]
    }
  ];
  
  return res.status(200).json({
    success: true,
    data: stations
  });
}

// Handle timetable
async function handleTimetable(req, res) {
  const mockTimetable = [
    {
      busId: "BUS001",
      route: "Rajpura - Chandigarh",
      schedule: [
        { station: "Rajpura", departureTime: "08:00 AM" },
        { station: "Chandigarh", arrivalTime: "09:30 AM" }
      ],
      frequency: "Every 30 minutes"
    }
  ];
  
  return res.status(200).json({
    success: true,
    data: mockTimetable
  });
}

// Handle bus details
async function handleBusDetails(req, res) {
  const { busId } = req.query;
  
  if (!busId) {
    return res.status(400).json({ error: 'Missing busId parameter' });
  }
  
  // Get bus location based on busId
  const busLocations = {
    "BUS001": { lat: 19.0760, lng: 72.8777, address: "Mumbai Central Station" },
    "BUS002": { lat: 19.0400, lng: 72.9200, address: "Thane Junction" },
    "BUS003": { lat: 18.9900, lng: 73.1200, address: "Kalyan" },
    "BUS004": { lat: 18.8500, lng: 73.3000, address: "Lonavala" },
    "BUS005": { lat: 18.7500, lng: 73.4500, address: "Khandala Hills" },
    "BUS006": { lat: 18.6500, lng: 73.6000, address: "Talegaon" },
    "BUS007": { lat: 18.5800, lng: 73.7200, address: "Pimpri-Chinchwad" },
    "BUS008": { lat: 18.5204, lng: 73.8567, address: "Pune Station" }
  };
  
  const location = busLocations[busId] || busLocations["BUS001"];
  
  const busDetails = {
    busId: busId,
    busNumber: `MH-${busId.slice(-2)}-${Math.floor(Math.random() * 9000) + 1000}`,
    route: "Mumbai - Pune", 
    driverName: busId === "BUS001" ? "Rajesh Kumar" : 
                busId === "BUS002" ? "Amit Singh" :
                busId === "BUS003" ? "Priya Sharma" :
                "Suresh Patil",
    driverPhone: `+9198765432${busId.slice(-2)}`,
    capacity: 40,
    currentPassengers: Math.floor(Math.random() * 35) + 5,
    status: "ACTIVE",
    currentLocation: {
      latitude: location.lat,
      longitude: location.lng,
      timestamp: new Date().toISOString(),
      address: location.address
    },
    fare: 350,
    estimatedArrival: `${Math.floor(Math.random() * 45) + 15} minutes`,
    amenities: ["AC", "WiFi", "GPS Tracking", "USB Charging"]
  };
  
  return res.status(200).json({
    success: true,
    data: busDetails
  });
}

// Handle bus location
async function handleBusLocation(req, res) {
  const { busId } = req.query;
  
  if (!busId) {
    return res.status(400).json({ error: 'Missing busId parameter' });
  }
  
  // Get bus location based on busId for Mumbai-Pune route
  const busLocations = {
    "BUS001": { lat: 19.0760, lng: 72.8777, address: "Mumbai Central Station" },
    "BUS002": { lat: 19.0400, lng: 72.9200, address: "Thane Junction" },
    "BUS003": { lat: 18.9900, lng: 73.1200, address: "Kalyan" },
    "BUS004": { lat: 18.8500, lng: 73.3000, address: "Lonavala" },
    "BUS005": { lat: 18.7500, lng: 73.4500, address: "Khandala Hills" },
    "BUS006": { lat: 18.6500, lng: 73.6000, address: "Talegaon" },
    "BUS007": { lat: 18.5800, lng: 73.7200, address: "Pimpri-Chinchwad" },
    "BUS008": { lat: 18.5204, lng: 73.8567, address: "Pune Station" }
  };
  
  const baseLocation = busLocations[busId] || busLocations["BUS001"];
  
  const location = {
    busId: busId,
    busNumber: `MH-${busId.slice(-2)}-${Math.floor(Math.random() * 9000) + 1000}`,
    currentLocation: {
      latitude: baseLocation.lat + (Math.random() - 0.5) * 0.01,
      longitude: baseLocation.lng + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString(),
      address: baseLocation.address,
      speed: Math.floor(Math.random() * 40) + 10,
      heading: Math.floor(Math.random() * 360)
    },
    route: "Mumbai - Pune",
    status: "ACTIVE"
  };
  
  return res.status(200).json({
    success: true,
    data: location
  });
}