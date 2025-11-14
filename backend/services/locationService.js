const axios = require('axios');

class LocationService {
  constructor() {
    // Configure multiple geocoding services for reliability
    this.services = {
      nominatim: 'https://nominatim.openstreetmap.org/reverse',
      opencage: 'https://api.opencagedata.com/geocode/v1/json',
      google: 'https://maps.googleapis.com/maps/api/geocode/json'
    };
    
    // Cache for frequently requested locations
    this.addressCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // Convert coordinates to human-readable address
  async coordinatesToAddress(latitude, longitude) {
    try {
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      
      // Check cache first
      if (this.addressCache.has(cacheKey)) {
        const cached = this.addressCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.address;
        }
      }

      let address = null;

      // Try OpenStreetMap Nominatim (free, no API key required)
      address = await this.tryNominatim(latitude, longitude);
      
      if (!address) {
        // Fallback to OpenCage (if API key available)
        address = await this.tryOpenCage(latitude, longitude);
      }

      if (!address) {
        // Fallback to Google Maps (if API key available)
        address = await this.tryGoogleMaps(latitude, longitude);
      }

      // If all services fail, create a basic address
      if (!address) {
        address = this.createFallbackAddress(latitude, longitude);
      }

      // Cache the result
      this.addressCache.set(cacheKey, {
        address,
        timestamp: Date.now()
      });

      return address;
    } catch (error) {
      console.error('Error converting coordinates to address:', error.message);
      return this.createFallbackAddress(latitude, longitude);
    }
  }

  // OpenStreetMap Nominatim (Free service)
  async tryNominatim(latitude, longitude) {
    try {
      const response = await axios.get(this.services.nominatim, {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 18,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'MargSetu-Transport-App'
        },
        timeout: 5000
      });

      if (response.data && response.data.display_name) {
        return this.formatNominatimAddress(response.data);
      }
      
      return null;
    } catch (error) {
      console.log('Nominatim geocoding failed:', error.message);
      return null;
    }
  }

  // OpenCage Geocoding API (requires API key)
  async tryOpenCage(latitude, longitude) {
    try {
      const apiKey = process.env.OPENCAGE_API_KEY;
      if (!apiKey) return null;

      const response = await axios.get(this.services.opencage, {
        params: {
          key: apiKey,
          q: `${latitude},${longitude}`,
          pretty: 1,
          no_annotations: 1
        },
        timeout: 5000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        return this.formatOpenCageAddress(response.data.results[0]);
      }
      
      return null;
    } catch (error) {
      console.log('OpenCage geocoding failed:', error.message);
      return null;
    }
  }

  // Google Maps Geocoding API (requires API key)
  async tryGoogleMaps(latitude, longitude) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return null;

      const response = await axios.get(this.services.google, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: apiKey,
          result_type: 'street_address|route|locality'
        },
        timeout: 5000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        return this.formatGoogleAddress(response.data.results[0]);
      }
      
      return null;
    } catch (error) {
      console.log('Google Maps geocoding failed:', error.message);
      return null;
    }
  }

  // Format Nominatim response
  formatNominatimAddress(data) {
    const address = data.address || {};
    const parts = [];

    // Add road/street
    if (address.road) {
      parts.push(address.road);
    } else if (address.highway) {
      parts.push(address.highway);
    }

    // Add locality
    if (address.suburb) {
      parts.push(address.suburb);
    } else if (address.neighbourhood) {
      parts.push(address.neighbourhood);
    }

    // Add city
    if (address.city) {
      parts.push(address.city);
    } else if (address.town) {
      parts.push(address.town);
    } else if (address.village) {
      parts.push(address.village);
    }

    // Add state
    if (address.state) {
      parts.push(address.state);
    }

    const formatted = parts.slice(0, 3).join(', ');
    return formatted || data.display_name?.split(',').slice(0, 3).join(', ') || 'Unknown Location';
  }

  // Format OpenCage response
  formatOpenCageAddress(result) {
    const components = result.components || {};
    const parts = [];

    if (components.road) parts.push(components.road);
    if (components.suburb || components.neighbourhood) {
      parts.push(components.suburb || components.neighbourhood);
    }
    if (components.city || components.town) {
      parts.push(components.city || components.town);
    }

    return parts.slice(0, 3).join(', ') || result.formatted?.split(',').slice(0, 3).join(', ') || 'Unknown Location';
  }

  // Format Google Maps response
  formatGoogleAddress(result) {
    const addressComponents = result.address_components || [];
    const parts = [];

    // Extract relevant components
    const route = addressComponents.find(c => c.types.includes('route'));
    const locality = addressComponents.find(c => c.types.includes('locality'));
    const sublocality = addressComponents.find(c => c.types.includes('sublocality'));

    if (route) parts.push(route.short_name);
    if (sublocality) parts.push(sublocality.short_name);
    if (locality) parts.push(locality.short_name);

    return parts.slice(0, 3).join(', ') || result.formatted_address?.split(',').slice(0, 3).join(', ') || 'Unknown Location';
  }

  // Create fallback address when all services fail
  createFallbackAddress(latitude, longitude) {
    // Create a basic descriptive address based on coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Basic region detection for India (can be expanded)
    let region = 'Unknown Area';
    
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
      // Rough coordinates for different regions of India
      if (lat >= 25 && lng >= 85) region = 'Northeast India';
      else if (lat >= 20 && lng >= 75) region = 'Central India';
      else if (lat >= 15 && lng >= 70) region = 'Western India';
      else if (lat >= 10 && lng >= 75) region = 'Southern India';
      else if (lat >= 25 && lng >= 70) region = 'Northern India';
      else region = 'India';
    }

    return `Near ${lat.toFixed(3)}, ${lng.toFixed(3)} (${region})`;
  }

  // Get nearby landmarks or points of interest
  async getNearbyLandmarks(latitude, longitude, radius = 1000) {
    try {
      const response = await axios.get(this.services.nominatim, {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 16,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'MargSetu-Transport-App'
        },
        timeout: 5000
      });

      // Extract notable landmarks from the response
      if (response.data && response.data.address) {
        const landmarks = [];
        const address = response.data.address;
        
        if (address.amenity) landmarks.push(address.amenity);
        if (address.shop) landmarks.push(address.shop);
        if (address.tourism) landmarks.push(address.tourism);
        
        return landmarks.length > 0 ? landmarks.join(', ') : null;
      }
      
      return null;
    } catch (error) {
      console.log('Error getting landmarks:', error.message);
      return null;
    }
  }

  // Format location for SMS response
  async formatLocationForSMS(latitude, longitude, includeCoordinates = false) {
    try {
      const address = await this.coordinatesToAddress(latitude, longitude);
      const landmarks = await this.getNearbyLandmarks(latitude, longitude);
      
      let formatted = `📍 ${address}`;
      
      if (landmarks) {
        formatted += `\n🏢 Near: ${landmarks}`;
      }
      
      if (includeCoordinates) {
        formatted += `\n🗺️ Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      return formatted;
    } catch (error) {
      console.error('Error formatting location for SMS:', error.message);
      return `📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  // Clear cache
  clearCache() {
    this.addressCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.addressCache.size,
      maxAge: this.cacheTimeout,
      entries: Array.from(this.addressCache.entries()).map(([key, value]) => ({
        coordinates: key,
        address: value.address,
        age: Date.now() - value.timestamp
      }))
    };
  }
}

// Export singleton instance
const locationService = new LocationService();

module.exports = {
  LocationService,
  locationService
};