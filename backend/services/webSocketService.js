const Bus = require('../models/Bus');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.activeBuses = new Map(); // Store active bus connections
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('WebSocket connection established:', socket.id);

      // Handle bus location updates
      socket.on('bus-location-update', async (data) => {
        try {
          const { busId, location, timestamp, speed = 0, heading = 0 } = data;

          // Resolve bus by busId (string code) first
          const bus = await Bus.findOne({ busId: busId }) || await Bus.findById(busId);
          if (!bus) {
            console.warn(`Bus not found for id ${busId} in bus-location-update`);
            return;
          }

          // Update bus location in database using GeoJSON Point shape
          bus.currentLocation = {
            coordinates: {
              type: 'Point',
              coordinates: [location.lng ?? location.longitude, location.lat ?? location.latitude]
            },
            lastUpdated: timestamp ? new Date(timestamp) : new Date(),
            speed,
            heading
          };
          await bus.save();

          // Broadcast to passengers tracking this bus
          socket.to(`bus-${bus.busId || busId}`).emit('location-update', {
            busId,
            location,
            timestamp: timestamp || new Date().toISOString()
          });

          console.log(`Location updated for bus ${busId}`);
        } catch (error) {
          console.error('Error updating bus location:', error);
          socket.emit('error', { message: 'Failed to update location' });
        }
      });

      // Handle passenger joining bus tracking
      socket.on('track-bus', (busId) => {
        socket.join(`bus-${busId}`);
        console.log(`Passenger joined tracking for bus ${busId}`);

        // Send initial bus data
        this.sendBusData(socket, busId);
      });

      // Handle passenger stopping bus tracking
      socket.on('stop-tracking', (busId) => {
        socket.leave(`bus-${busId}`);
        console.log(`Passenger stopped tracking bus ${busId}`);
      });

      // Handle bus driver connection
      socket.on('bus-driver-connect', (busId) => {
        socket.join(`driver-${busId}`);
        this.activeBuses.set(busId, socket.id);
        console.log(`Bus driver connected for bus ${busId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('WebSocket disconnected:', socket.id);

        // Remove from active buses if it was a driver
        for (const [busId, socketId] of this.activeBuses.entries()) {
          if (socketId === socket.id) {
            this.activeBuses.delete(busId);
            console.log(`Bus driver disconnected for bus ${busId}`);
            break;
          }
        }
      });
    });
  }

  async sendBusData(socket, busId) {
    try {
      const bus = await Bus.findById(busId)
        .populate('route')
        .populate('driver');

      if (bus) {
        socket.emit('bus-data', {
          busId: bus._id,
          busNumber: bus.busNumber,
          currentLocation: bus.currentLocation,
          route: bus.route,
          driver: bus.driver,
          lastUpdated: bus.lastUpdated
        });
      }
    } catch (error) {
      console.error('Error sending bus data:', error);
      socket.emit('error', { message: 'Failed to get bus data' });
    }
  }

  // Broadcast emergency alert to all connected passengers
  broadcastEmergency(busId, alertData) {
    this.io.to(`bus-${busId}`).emit('emergency-alert', {
      busId,
      ...alertData,
      timestamp: new Date()
    });
  }

  // Send route update to passengers
  broadcastRouteUpdate(busId, routeData) {
    this.io.to(`bus-${busId}`).emit('route-update', {
      busId,
      ...routeData,
      timestamp: new Date()
    });
  }

  // Get active bus count
  getActiveBusCount() {
    return this.activeBuses.size;
  }

  // Check if bus is active
  isBusActive(busId) {
    return this.activeBuses.has(busId);
  }
}

module.exports = WebSocketService;