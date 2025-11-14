const Bus = require('../models/Bus');

class BusLocationService {
  constructor() {
    this.simulationInterval = null;
    this.isSimulating = false;
    this.simulationSpeed = 30000; // 30 seconds default
  }

  // Start location simulation for prototype testing
  startSimulation(intervalSeconds = 30) {
    if (this.isSimulating) {
      console.log('Bus location simulation already running');
      return;
    }

    this.simulationSpeed = intervalSeconds * 1000;
    this.isSimulating = true;

    console.log(`🚌 Starting bus location simulation (updating every ${intervalSeconds} seconds)`);

    this.simulationInterval = setInterval(async () => {
      try {
        await this.updateAllBusLocations();
      } catch (error) {
        console.error('Error in bus location simulation:', error);
      }
    }, this.simulationSpeed);
  }

  // Stop location simulation
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.isSimulating = false;
      console.log('🛑 Bus location simulation stopped');
    }
  }

  // Update locations for all active buses
  async updateAllBusLocations() {
    try {
      const buses = await Bus.find({ status: 'active' }).populate('route');
      
      for (const bus of buses) {
        await this.simulateMovement(bus);
      }

      console.log(`📍 Updated locations for ${buses.length} active buses`);
    } catch (error) {
      console.error('Error updating bus locations:', error);
    }
  }

  // Simulate movement for a single bus
  async simulateMovement(bus) {
    try {
      if (!bus.currentLocation || !bus.route) {
        return;
      }

      // Simple simulation: move slightly along the route
      const currentLat = bus.currentLocation.lat;
      const currentLng = bus.currentLocation.lng;

      // Generate small random movement (simulating bus movement)
      const latOffset = (Math.random() - 0.5) * 0.001; // ~100 meters
      const lngOffset = (Math.random() - 0.5) * 0.001;

      const newLocation = {
        lat: currentLat + latOffset,
        lng: currentLng + lngOffset
      };

      // Update bus location in database
      await Bus.findByIdAndUpdate(bus._id, {
        currentLocation: newLocation,
        lastUpdated: new Date()
      });

      // Emit location update via WebSocket (if available)
      if (global.io) {
        global.io.to(`bus-${bus._id}`).emit('location-update', {
          busId: bus._id,
          location: newLocation,
          timestamp: new Date(),
          busNumber: bus.busNumber
        });
      }

    } catch (error) {
      console.error(`Error simulating movement for bus ${bus._id}:`, error);
    }
  }

  // Update real bus location (for actual GPS data)
  async updateBusLocation(busId, location, timestamp = new Date()) {
    try {
      const bus = await Bus.findByIdAndUpdate(busId, {
        currentLocation: {
          lat: location.lat,
          lng: location.lng
        },
        lastUpdated: timestamp
      }, { new: true });

      if (!bus) {
        throw new Error('Bus not found');
      }

      // Emit real-time update
      if (global.io) {
        global.io.to(`bus-${busId}`).emit('location-update', {
          busId: bus._id,
          location: location,
          timestamp: timestamp,
          busNumber: bus.busNumber
        });
      }

      return bus;
    } catch (error) {
      console.error('Error updating real bus location:', error);
      throw error;
    }
  }

  // Get current location of a bus
  async getBusLocation(busId) {
    try {
      const bus = await Bus.findById(busId, 'currentLocation lastUpdated busNumber');
      return bus;
    } catch (error) {
      console.error('Error getting bus location:', error);
      throw error;
    }
  }

  // Get locations of all buses on a route
  async getBusesOnRoute(routeId) {
    try {
      const buses = await Bus.find({ route: routeId }, 'currentLocation lastUpdated busNumber status')
        .populate('route', 'name startLocation endLocation');
      return buses;
    } catch (error) {
      console.error('Error getting buses on route:', error);
      throw error;
    }
  }

  // Calculate estimated time of arrival (basic implementation)
  calculateETA(bus, destinationStop) {
    // This is a simplified ETA calculation
    // In a real implementation, you'd use proper routing and traffic data
    
    if (!bus.currentLocation || !destinationStop.location) {
      return null;
    }

    const distance = this.calculateDistance(
      bus.currentLocation,
      destinationStop.location
    );

    // Assume average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const etaMinutes = (distance / averageSpeed) * 60;

    return {
      eta: new Date(Date.now() + etaMinutes * 60 * 1000),
      distanceKm: distance,
      estimatedMinutes: Math.round(etaMinutes)
    };
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get simulation status
  getStatus() {
    return {
      isSimulating: this.isSimulating,
      simulationSpeed: this.simulationSpeed,
      intervalId: this.simulationInterval ? 'active' : 'inactive'
    };
  }
}

// Export singleton instance
module.exports = new BusLocationService();