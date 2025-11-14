const { calculateDistance } = require('../utils/helpers');

class ETACalculationService {
  constructor() {
    // Traffic factors for different times of day
    this.trafficFactors = {
      peak: 1.5,      // 7-10 AM, 5-8 PM
      normal: 1.0,    // Regular hours
      light: 0.8      // Late night/early morning
    };

    // Speed factors for different road types
    this.roadFactors = {
      highway: 1.2,
      main_road: 1.0,
      local_road: 0.7,
      congested: 0.5
    };

    // Default speeds (km/h)
    this.defaultSpeeds = {
      city: 25,
      suburban: 35,
      highway: 50
    };
  }

  // Get current traffic factor based on time
  getCurrentTrafficFactor() {
    const now = new Date();
    const hour = now.getHours();

    // Peak hours: 7-10 AM and 5-8 PM
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      return this.trafficFactors.peak;
    }
    
    // Light traffic: 10 PM to 6 AM
    if (hour >= 22 || hour <= 6) {
      return this.trafficFactors.light;
    }

    // Normal traffic
    return this.trafficFactors.normal;
  }

  // Calculate ETA for a specific stop
  calculateETAToStop(currentLocation, targetStop, averageSpeed = null, route = null) {
    try {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        targetStop.coordinates.latitude,
        targetStop.coordinates.longitude
      );

      // Determine speed to use
      let speed = averageSpeed || currentLocation.speed || this.defaultSpeeds.city;
      
      // Apply traffic factor
      const trafficFactor = this.getCurrentTrafficFactor();
      speed = speed / trafficFactor;

      // Apply road factor (if route information is available)
      if (route && route.roadType) {
        const roadFactor = this.roadFactors[route.roadType] || 1.0;
        speed = speed * roadFactor;
      }

      // Ensure minimum speed
      speed = Math.max(speed, 10); // Minimum 10 km/h

      // Calculate time in minutes
      const timeHours = distance / speed;
      const timeMinutes = timeHours * 60;

      // Add buffer time for stops (2 minutes per intermediate stop)
      const bufferTime = targetStop.order > 1 ? 2 * (targetStop.order - 1) : 0;

      return {
        distance: Math.round(distance * 1000), // in meters
        estimatedTime: Math.round(timeMinutes + bufferTime),
        estimatedArrival: new Date(Date.now() + (timeMinutes + bufferTime) * 60000),
        confidence: this.calculateConfidence(currentLocation, distance, speed),
        factors: {
          traffic: trafficFactor,
          road: route?.roadType ? this.roadFactors[route.roadType] || 1.0 : 1.0,
          bufferTime
        }
      };

    } catch (error) {
      console.error('ETA calculation error:', error);
      return null;
    }
  }

  // Calculate ETA for all upcoming stops
  calculateRouteETA(currentLocation, route, currentStopOrder = 0) {
    try {
      if (!route || !route.stops || route.stops.length === 0) {
        return null;
      }

      const upcomingStops = route.stops
        .filter(stop => stop.order > currentStopOrder)
        .sort((a, b) => a.order - b.order);

      if (upcomingStops.length === 0) {
        return {
          nextStop: null,
          allStops: [],
          totalTime: 0,
          endTime: null
        };
      }

      const results = [];
      let cumulativeTime = 0;
      let currentPos = currentLocation;

      for (let i = 0; i < upcomingStops.length; i++) {
        const stop = upcomingStops[i];
        const eta = this.calculateETAToStop(currentPos, stop, null, route);

        if (eta) {
          cumulativeTime += eta.estimatedTime;
          
          results.push({
            stopId: stop._id,
            stopName: stop.name,
            stopOrder: stop.order,
            coordinates: stop.coordinates,
            distance: eta.distance,
            estimatedTime: eta.estimatedTime,
            cumulativeTime,
            estimatedArrival: new Date(Date.now() + cumulativeTime * 60000),
            confidence: eta.confidence
          });

          // Update current position for next calculation
          currentPos = {
            latitude: stop.coordinates.latitude,
            longitude: stop.coordinates.longitude,
            speed: currentLocation.speed
          };
        }
      }

      return {
        nextStop: results[0] || null,
        allStops: results,
        totalTime: cumulativeTime,
        endTime: cumulativeTime > 0 ? new Date(Date.now() + cumulativeTime * 60000) : null,
        calculatedAt: new Date()
      };

    } catch (error) {
      console.error('Route ETA calculation error:', error);
      return null;
    }
  }

  // Calculate confidence score based on various factors
  calculateConfidence(currentLocation, distance, speed) {
    let confidence = 0.7; // Base confidence

    // Distance factor - closer distances are more accurate
    if (distance < 1) confidence += 0.2;      // < 1km
    else if (distance < 5) confidence += 0.1; // < 5km
    else if (distance > 20) confidence -= 0.2; // > 20km

    // Speed factor - reasonable speeds increase confidence
    if (speed >= 15 && speed <= 60) confidence += 0.1;
    else if (speed < 5 || speed > 80) confidence -= 0.1;

    // Location accuracy factor
    if (currentLocation.accuracy && currentLocation.accuracy < 20) {
      confidence += 0.1;
    } else if (currentLocation.accuracy && currentLocation.accuracy > 100) {
      confidence -= 0.1;
    }

    // Time of day factor - rush hours are less predictable
    const trafficFactor = this.getCurrentTrafficFactor();
    if (trafficFactor === this.trafficFactors.peak) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Enhanced ETA with historical data (if available)
  async calculateETAWithHistory(currentLocation, route, currentStopOrder, historicalData = null) {
    const basicETA = this.calculateRouteETA(currentLocation, route, currentStopOrder);

    if (!basicETA || !historicalData) {
      return basicETA;
    }

    try {
      // Apply historical adjustments
      if (historicalData.averageSpeed) {
        const adjustmentFactor = historicalData.averageSpeed / (currentLocation.speed || this.defaultSpeeds.city);
        
        if (basicETA.allStops) {
          basicETA.allStops.forEach(stop => {
            stop.estimatedTime = Math.round(stop.estimatedTime * adjustmentFactor);
            stop.estimatedArrival = new Date(Date.now() + stop.cumulativeTime * 60000);
          });
        }
      }

      // Adjust confidence based on historical accuracy
      if (historicalData.accuracy) {
        const accuracyBonus = Math.min(0.2, historicalData.accuracy / 100);
        if (basicETA.allStops) {
          basicETA.allStops.forEach(stop => {
            stop.confidence = Math.min(1.0, stop.confidence + accuracyBonus);
          });
        }
      }

      basicETA.enhancedWithHistory = true;
      basicETA.historicalFactor = historicalData;

    } catch (error) {
      console.error('Historical ETA adjustment error:', error);
    }

    return basicETA;
  }

  // Get delay prediction
  getPredictedDelay(scheduledArrival, estimatedArrival) {
    const delayMinutes = Math.round((estimatedArrival - scheduledArrival) / (1000 * 60));
    
    return {
      delayMinutes,
      status: delayMinutes <= 2 ? 'on_time' : 
              delayMinutes <= 5 ? 'slightly_delayed' :
              delayMinutes <= 15 ? 'delayed' : 'severely_delayed',
      severity: delayMinutes <= 2 ? 'low' :
                delayMinutes <= 15 ? 'medium' : 'high'
    };
  }

  // Calculate route completion percentage
  calculateRouteProgress(currentStopOrder, totalStops) {
    if (totalStops === 0) return 0;
    return Math.round((currentStopOrder / totalStops) * 100);
  }

  // Get estimated fuel consumption (basic calculation)
  estimateFuelConsumption(distance, averageSpeed, fuelType = 'diesel') {
    const fuelEfficiency = {
      diesel: 8,    // km/liter
      cng: 6,       // km/kg
      electric: 4,  // km/kWh
      hybrid: 12    // km/liter
    };

    const efficiency = fuelEfficiency[fuelType] || fuelEfficiency.diesel;
    const consumption = distance / efficiency;

    return {
      consumption: Math.round(consumption * 100) / 100,
      unit: fuelType === 'cng' ? 'kg' : fuelType === 'electric' ? 'kWh' : 'L',
      estimatedCost: this.calculateFuelCost(consumption, fuelType)
    };
  }

  // Calculate fuel cost (basic estimation)
  calculateFuelCost(consumption, fuelType) {
    const fuelPrices = {
      diesel: 90,   // INR per liter
      cng: 70,      // INR per kg
      electric: 8,  // INR per kWh
      hybrid: 90    // INR per liter
    };

    const price = fuelPrices[fuelType] || fuelPrices.diesel;
    return Math.round(consumption * price * 100) / 100;
  }
}

module.exports = ETACalculationService;