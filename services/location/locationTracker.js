import * as Location from 'expo-location';
import { calculateDistance } from '../../utils/calculations';
import { requestPermission, PERMISSIONS } from '../../utils/permissions';
import logger from '../../utils/logger';

/**
 * Service for tracking device location during activities.
 * Provides GPS position tracking, route path recording,
 * location data filtering, and distance and elevation calculation.
 */
class LocationTracker {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.locationHistory = [];
    this.lastLocation = null;
    this.settings = {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5, // meters
      timeInterval: 1000, // milliseconds
      showsBackgroundLocationIndicator: true
    };
    
    // Create a logger instance for this module
    this.logger = logger.createContextLogger('LocationTracker');
  }

  /**
   * Initializes location services
   * @returns {Promise<boolean>} Success state
   * @throws {Error} If location services unavailable
   */
  async initialize() {
    try {
      // Request location permission
      const hasPermission = await requestPermission(PERMISSIONS.LOCATION);
      
      if (!hasPermission) {
        this.logger.warn('Location permission denied');
        return false;
      }
      
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      
      if (!enabled) {
        this.logger.warn('Location services are disabled');
        return false;
      }
      
      // Get location accuracy setting from environment
      const accuracyLevel = process.env.LOCATION_ACCURACY || 'high';
      
      // Map string to Location.Accuracy enum
      switch (accuracyLevel.toLowerCase()) {
        case 'low':
          this.settings.accuracy = Location.Accuracy.Low;
          break;
        case 'balanced':
          this.settings.accuracy = Location.Accuracy.Balanced;
          break;
        case 'high':
        default:
          this.settings.accuracy = Location.Accuracy.High;
          break;
      }
      
      // Get distance filter from environment
      if (process.env.LOCATION_DISTANCE_FILTER) {
        this.settings.distanceInterval = parseInt(process.env.LOCATION_DISTANCE_FILTER);
      }
      
      // Get time interval from environment
      if (process.env.LOCATION_UPDATE_INTERVAL) {
        this.settings.timeInterval = parseInt(process.env.LOCATION_UPDATE_INTERVAL);
      }
      
      this.logger.info('Location tracker initialized successfully', this.settings);
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize location tracker', error);
      throw error;
    }
  }

  /**
   * Starts location tracking
   * @param {Object} options - Tracking options
   * @returns {Promise<boolean>} Success state
   */
  async startTracking(options = {}) {
    try {
      if (this.isTracking) {
        this.logger.info('Location tracking already active');
        return true;
      }
      
      // Merge provided options with default settings
      const trackingOptions = {
        ...this.settings,
        ...options
      };
      
      // Request background permission if tracking in background
      if (options.trackInBackground) {
        const hasBackgroundPermission = await requestPermission(PERMISSIONS.LOCATION_BACKGROUND);
        if (!hasBackgroundPermission) {
          this.logger.warn('Background location permission denied');
        }
      }
      
      // Configure foreground service notification for Android
      const foregroundService = options.trackInBackground ? {
        notificationTitle: 'Location Tracking',
        notificationBody: 'Tracking your route in background',
        notificationColor: '#2563EB'
      } : undefined;
      
      // Start location updates
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: trackingOptions.accuracy,
          distanceInterval: trackingOptions.distanceInterval,
          timeInterval: trackingOptions.timeInterval,
          showsBackgroundLocationIndicator: trackingOptions.showsBackgroundLocationIndicator,
          foregroundService
        },
        this._processLocationUpdate.bind(this)
      );
      
      this.isTracking = true;
      this.logger.info('Location tracking started', trackingOptions);
      return true;
    } catch (error) {
      this.logger.error('Failed to start location tracking', error);
      return false;
    }
  }

  /**
   * Stops location tracking
   * @returns {Promise<void>} Resolves when stopped
   */
  async stopTracking() {
    try {
      if (!this.isTracking || !this.watchId) {
        return;
      }
      
      // Stop watch position
      this.watchId.remove();
      this.watchId = null;
      this.isTracking = false;
      
      this.logger.info('Location tracking stopped', {
        locationCount: this.locationHistory.length
      });
    } catch (error) {
      this.logger.error('Error stopping location tracking', error);
    }
  }

  /**
   * Processes incoming location updates
   * @param {Object} location - Location update
   * @returns {Object} Processed location data
   * @private
   */
  _processLocationUpdate(location) {
    try {
      // Validate location data
      if (!location || !location.coords) {
        this.logger.warn('Received invalid location update');
        return null;
      }
      
      // Filter location for accuracy
      if (!this._filterLocation(location)) {
        return null;
      }
      
      // Format location object
      const processedLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp
      };
      
      // Calculate distance from previous point
      if (this.lastLocation) {
        processedLocation.distanceFromLast = this._calculateDistance(
          processedLocation,
          this.lastLocation
        );
        
        // Calculate elevation change
        if (processedLocation.altitude !== null && this.lastLocation.altitude !== null) {
          processedLocation.elevationChange = processedLocation.altitude - this.lastLocation.altitude;
        }
      } else {
        processedLocation.distanceFromLast = 0;
        processedLocation.elevationChange = 0;
      }
      
      // Store location in history
      this.locationHistory.push(processedLocation);
      this.lastLocation = processedLocation;
      
      return processedLocation;
    } catch (error) {
      this.logger.error('Error processing location update', error);
      return null;
    }
  }

  /**
   * Filters location for accuracy
   * @param {Object} location - Location update
   * @returns {boolean} Whether location passes filter
   * @private
   */
  _filterLocation(location) {
    // Skip locations with poor accuracy
    const ACCURACY_THRESHOLD = 30; // meters
    if (location.coords.accuracy > ACCURACY_THRESHOLD) {
      this.logger.debug('Filtered out low accuracy location', {
        accuracy: location.coords.accuracy
      });
      return false;
    }
    
    // Skip if altitude accuracy is too low (when available)
    if (location.coords.altitudeAccuracy !== null && location.coords.altitudeAccuracy > 15) {
      this.logger.debug('Filtered out low altitude accuracy', {
        altitudeAccuracy: location.coords.altitudeAccuracy
      });
      // Still return true as we want to keep the location, just note the poor altitude
    }
    
    // Skip if movement is impossibly fast (likely GPS error)
    if (this.lastLocation && location.coords.speed > 12.5) { // > 45 km/h for running app
      const distance = calculateDistance(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: this.lastLocation.latitude, longitude: this.lastLocation.longitude }
      );
      
      const timeDiff = (location.timestamp - this.lastLocation.timestamp) / 1000;
      const calculatedSpeed = timeDiff > 0 ? distance / timeDiff : 0;
      
      // If calculated speed is significantly different from reported speed, filter it out
      if (Math.abs(calculatedSpeed - location.coords.speed) > 5) {
        this.logger.debug('Filtered out erroneous speed', {
          reportedSpeed: location.coords.speed,
          calculatedSpeed
        });
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculates distance from previous point
   * @param {Object} currentLocation - Current position
   * @param {Object} previousLocation - Previous position
   * @returns {number} Distance in meters
   * @private
   */
  _calculateDistance(currentLocation, previousLocation) {
    return calculateDistance(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: previousLocation.latitude, longitude: previousLocation.longitude }
    );
  }

  /**
   * Gets complete location history
   * @returns {Array} Recorded location points
   */
  getLocationHistory() {
    return [...this.locationHistory];
  }

  /**
   * Gets current location
   * @returns {Promise<Object>} Current position
   */
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: this.settings.accuracy
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
    } catch (error) {
      this.logger.error('Error getting current location', error);
      throw error;
    }
  }

  /**
   * Clears location history
   * @returns {void}
   */
  clearLocationHistory() {
    this.locationHistory = [];
    this.lastLocation = null;
    this.logger.info('Location history cleared');
  }

  /**
   * Gets total distance traveled
   * @returns {number} Total distance in meters
   */
  getTotalDistance() {
    if (this.locationHistory.length < 2) {
      return 0;
    }
    
    // Sum all point-to-point distances
    return this.locationHistory.reduce((total, point, index) => {
      if (index === 0) return 0;
      return total + (point.distanceFromLast || 0);
    }, 0);
  }

  /**
   * Gets elevation statistics
   * @returns {Object} Elevation statistics
   */
  getElevationStats() {
    if (this.locationHistory.length === 0) {
      return { gain: 0, loss: 0, min: 0, max: 0, current: 0 };
    }
    
    // Extract valid altitude readings
    const altitudes = this.locationHistory
      .map(point => point.altitude)
      .filter(alt => alt !== null && alt !== undefined);
    
    if (altitudes.length === 0) {
      return { gain: 0, loss: 0, min: 0, max: 0, current: 0 };
    }
    
    // Calculate stats
    const min = Math.min(...altitudes);
    const max = Math.max(...altitudes);
    const current = altitudes[altitudes.length - 1];
    
    // Calculate total gain and loss
    let gain = 0;
    let loss = 0;
    
    this.locationHistory.forEach((point, index) => {
      if (index === 0 || !point.elevationChange) return;
      if (point.elevationChange > 0) {
        gain += point.elevationChange;
      } else {
        loss += Math.abs(point.elevationChange);
      }
    });
    
    return { gain, loss, min, max, current };
  }
}

export default new LocationTracker();