import * as ExpoSensors from 'expo-sensors';
import * as Location from 'expo-location';

// Import constants and utilities
import { SENSOR_TYPES } from './sensorManager';
import { requestPermission, checkPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../config/constants';
import logger from '../../utils/logger';

// Default update intervals in milliseconds
const DEFAULT_ACCELEROMETER_INTERVAL = parseInt(process.env.ACCELEROMETER_UPDATE_INTERVAL, 10) || 200;
const DEFAULT_LOCATION_INTERVAL = parseInt(process.env.LOCATION_UPDATE_INTERVAL, 10) || 1000;
const DEFAULT_LOCATION_DISTANCE_FILTER = parseInt(process.env.LOCATION_DISTANCE_FILTER, 10) || 5;

// Default location accuracy
const DEFAULT_LOCATION_ACCURACY = process.env.LOCATION_ACCURACY || 'balanced';

/**
 * Service for accessing and processing built-in phone sensors
 */
class PhoneSensors {
  constructor() {
    // Initialize sensor tracking objects
    this.sensors = {
      accelerometer: {
        active: false,
        subscription: null,
        data: null,
      },
      gyroscope: {
        active: false,
        subscription: null,
        data: null,
      },
      barometer: {
        active: false,
        subscription: null,
        data: null,
      },
    };
    
    // Initialize readings
    this.readings = {};
    
    // Location tracking
    this.locationSubscription = null;
    this.lastLocation = null;
    this.locationSettings = {
      accuracy: this._getLocationAccuracy(DEFAULT_LOCATION_ACCURACY),
      timeInterval: DEFAULT_LOCATION_INTERVAL,
      distanceInterval: DEFAULT_LOCATION_DISTANCE_FILTER,
    };
    
    // Latest sensor values
    this.temperature = null;
  }
  
  /**
   * Initializes phone sensors
   * @returns {Promise<boolean>} Success state of initialization
   * @throws {Error} If sensor access fails
   */
  async initialize() {
    try {
      logger.info('Initializing phone sensors');
      
      // Check sensor availability
      const accelerometerAvailable = await this._checkSensorAvailability('accelerometer');
      const gyroscopeAvailable = await this._checkSensorAvailability('gyroscope');
      const barometerAvailable = await this._checkSensorAvailability('barometer');
      
      // Log available sensors
      logger.info('Phone sensors availability', {
        accelerometer: accelerometerAvailable,
        gyroscope: gyroscopeAvailable,
        barometer: barometerAvailable,
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize phone sensors', error);
      throw error;
    }
  }
  
  /**
   * Starts active data collection
   * @param {Object} options - Collection options
   * @returns {Promise<boolean>} Success state
   */
  async start(options = {}) {
    try {
      logger.info('Starting phone sensors collection');
      
      // Start accelerometer if available
      await this._startAccelerometer(options.accelerometerInterval);
      
      // Start gyroscope if available
      await this._startGyroscope(options.gyroscopeInterval);
      
      // Start barometer if available
      await this._startBarometer(options.barometerInterval);
      
      // Start location tracking if requested
      if (options.trackLocation !== false) {
        await this.startLocationTracking(options.locationOptions);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to start phone sensors', error);
      await this.stop().catch(stopError => {
        logger.error('Error during cleanup after failed start', stopError);
      });
      throw error;
    }
  }
  
  /**
   * Stops active data collection
   * @returns {Promise<void>} Resolves when stopped
   */
  async stop() {
    try {
      logger.info('Stopping phone sensors collection');
      
      // Stop accelerometer
      if (this.sensors.accelerometer.subscription) {
        this.sensors.accelerometer.subscription.remove();
        this.sensors.accelerometer.subscription = null;
        this.sensors.accelerometer.active = false;
      }
      
      // Stop gyroscope
      if (this.sensors.gyroscope.subscription) {
        this.sensors.gyroscope.subscription.remove();
        this.sensors.gyroscope.subscription = null;
        this.sensors.gyroscope.active = false;
      }
      
      // Stop barometer
      if (this.sensors.barometer.subscription) {
        this.sensors.barometer.subscription.remove();
        this.sensors.barometer.subscription = null;
        this.sensors.barometer.active = false;
      }
      
      // Stop location tracking
      await this.stopLocationTracking();
      
      logger.info('Phone sensors stopped');
    } catch (error) {
      logger.error('Error stopping phone sensors', error);
      throw error;
    }
  }
  
  /**
   * Starts location tracking
   * @param {Object} options - Tracking options (accuracy, interval)
   * @returns {Promise<Object>} Location subscription
   * @throws {Error} If location permission denied
   */
  async startLocationTracking(options = {}) {
    try {
      // Check and request location permission
      const hasPermission = await requestPermission(PERMISSIONS.LOCATION.name, true);
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
      
      // Stop any existing subscription
      await this.stopLocationTracking();
      
      // Configure location settings
      this.locationSettings = {
        accuracy: this._getLocationAccuracy(options.accuracy || DEFAULT_LOCATION_ACCURACY),
        timeInterval: options.timeInterval || DEFAULT_LOCATION_INTERVAL,
        distanceInterval: options.distanceInterval || DEFAULT_LOCATION_DISTANCE_FILTER,
      };
      
      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.locationSettings.accuracy,
          timeInterval: this.locationSettings.timeInterval,
          distanceInterval: this.locationSettings.distanceInterval,
        },
        this._handleLocationUpdate.bind(this)
      );
      
      logger.info('Location tracking started', this.locationSettings);
      
      return this.locationSubscription;
    } catch (error) {
      logger.error('Failed to start location tracking', error);
      throw error;
    }
  }
  
  /**
   * Stops location tracking
   * @returns {Promise<void>} Resolves when tracking stops
   */
  async stopLocationTracking() {
    try {
      if (this.locationSubscription) {
        await this.locationSubscription.remove();
        this.locationSubscription = null;
        logger.info('Location tracking stopped');
      }
    } catch (error) {
      logger.error('Error stopping location tracking', error);
      throw error;
    }
  }
  
  /**
   * Gets current location
   * @returns {Promise<Object>} Current position
   */
  async getCurrentLocation() {
    try {
      // Check if we have permission
      const hasPermission = await checkPermission(PERMISSIONS.LOCATION.name);
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: this.locationSettings.accuracy,
      });
      
      // Update last location
      this._handleLocationUpdate(location);
      
      return location;
    } catch (error) {
      logger.error('Error getting current location', error);
      throw error;
    }
  }
  
  /**
   * Gets latest readings from phone sensors
   * @returns {Object} Current sensor readings
   */
  getReadings() {
    const readings = { ...this.readings };
    
    // Only include active sensors
    if (!this.sensors.accelerometer.active) {
      delete readings[SENSOR_TYPES.ACCELEROMETER];
    }
    
    if (!this.sensors.gyroscope.active) {
      delete readings[SENSOR_TYPES.GYROSCOPE];
    }
    
    if (!this.sensors.barometer.active) {
      delete readings[SENSOR_TYPES.ELEVATION];
    }
    
    // Add temperature if available
    if (this.temperature !== null) {
      readings[SENSOR_TYPES.TEMPERATURE] = this.temperature;
    }
    
    return readings;
  }
  
  /**
   * Gets the latest location data
   * @returns {Object|null} Latest location or null if not tracking
   */
  getLocation() {
    return this.lastLocation;
  }
  
  /**
   * Checks if a sensor is available on the device
   * @param {string} sensorName - Name of the sensor to check
   * @returns {Promise<boolean>} Whether sensor is available
   * @private
   */
  async _checkSensorAvailability(sensorName) {
    try {
      switch (sensorName) {
        case 'accelerometer':
          return await ExpoSensors.Accelerometer.isAvailableAsync();
        
        case 'gyroscope':
          return await ExpoSensors.Gyroscope.isAvailableAsync();
        
        case 'barometer':
          return await ExpoSensors.Barometer.isAvailableAsync();
        
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error checking ${sensorName} availability`, error);
      return false;
    }
  }
  
  /**
   * Starts accelerometer data collection
   * @param {number} updateInterval - Milliseconds between readings
   * @private
   */
  async _startAccelerometer(updateInterval = DEFAULT_ACCELEROMETER_INTERVAL) {
    try {
      // Check if accelerometer is available
      const available = await this._checkSensorAvailability('accelerometer');
      
      if (!available) {
        logger.info('Accelerometer not available on this device');
        return false;
      }
      
      // Set update interval
      ExpoSensors.Accelerometer.setUpdateInterval(updateInterval);
      
      // Subscribe to accelerometer updates
      this.sensors.accelerometer.subscription = ExpoSensors.Accelerometer.addListener(data => {
        this.sensors.accelerometer.data = data;
        
        // Process raw data
        const processedData = this._processAccelerometerData(data);
        
        // Update readings
        this.readings[SENSOR_TYPES.ACCELEROMETER] = processedData;
      });
      
      this.sensors.accelerometer.active = true;
      
      logger.info('Accelerometer started', { updateInterval });
      
      return true;
    } catch (error) {
      logger.error('Failed to start accelerometer', error);
      return false;
    }
  }
  
  /**
   * Starts gyroscope data collection
   * @param {number} updateInterval - Milliseconds between readings
   * @private
   */
  async _startGyroscope(updateInterval = DEFAULT_ACCELEROMETER_INTERVAL) {
    try {
      // Check if gyroscope is available
      const available = await this._checkSensorAvailability('gyroscope');
      
      if (!available) {
        logger.info('Gyroscope not available on this device');
        return false;
      }
      
      // Set update interval
      ExpoSensors.Gyroscope.setUpdateInterval(updateInterval);
      
      // Subscribe to gyroscope updates
      this.sensors.gyroscope.subscription = ExpoSensors.Gyroscope.addListener(data => {
        this.sensors.gyroscope.data = data;
        
        // Update readings
        this.readings[SENSOR_TYPES.GYROSCOPE] = data;
      });
      
      this.sensors.gyroscope.active = true;
      
      logger.info('Gyroscope started', { updateInterval });
      
      return true;
    } catch (error) {
      logger.error('Failed to start gyroscope', error);
      return false;
    }
  }
  
  /**
   * Starts barometer data collection
   * @param {number} updateInterval - Milliseconds between readings
   * @private
   */
  async _startBarometer(updateInterval = DEFAULT_ACCELEROMETER_INTERVAL) {
    try {
      // Check if barometer is available
      const available = await this._checkSensorAvailability('barometer');
      
      if (!available) {
        logger.info('Barometer not available on this device');
        return false;
      }
      
      // Set update interval
      ExpoSensors.Barometer.setUpdateInterval(updateInterval);
      
      // Subscribe to barometer updates
      this.sensors.barometer.subscription = ExpoSensors.Barometer.addListener(data => {
        this.sensors.barometer.data = data;
        
        // Calculate elevation from pressure
        const elevation = this._calculateElevation(data.pressure);
        
        // Update readings
        this.readings[SENSOR_TYPES.ELEVATION] = elevation;
      });
      
      this.sensors.barometer.active = true;
      
      logger.info('Barometer started', { updateInterval });
      
      return true;
    } catch (error) {
      logger.error('Failed to start barometer', error);
      return false;
    }
  }
  
  /**
   * Processes raw accelerometer data
   * @param {Object} data - Raw accelerometer readings
   * @returns {Object} Processed metrics
   */
  _processAccelerometerData(data) {
    try {
      const { x, y, z } = data;
      
      // Calculate magnitude (total acceleration)
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      // Process into usable metrics
      return {
        x,
        y,
        z,
        magnitude,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error processing accelerometer data', error);
      return data;
    }
  }
  
  /**
   * Handles location update from subscription
   * @param {Object} location - Location update
   * @private
   */
  _handleLocationUpdate(location) {
    try {
      // Store the location
      this.lastLocation = location;
      
      // Extract relevant data
      const { coords, timestamp } = location;
      const { latitude, longitude, altitude, accuracy, speed, heading } = coords;
      
      // Format location data for readings
      const locationData = {
        latitude,
        longitude,
        altitude: altitude || 0,
        accuracy: accuracy || 0,
        speed: speed || 0,
        heading: heading || 0,
        timestamp,
      };
      
      // Update readings
      this.readings[SENSOR_TYPES.LOCATION] = locationData;
      
      // If we have speed data, update speed reading
      if (speed !== null && speed !== undefined) {
        this.readings[SENSOR_TYPES.SPEED] = speed;
        
        // Calculate pace from speed (if speed is valid)
        if (speed > 0) {
          // Convert m/s to min/km
          const paceSeconds = (1000 / speed); // seconds per kilometer
          this.readings[SENSOR_TYPES.PACE] = paceSeconds / 60; // minutes per kilometer
        }
      }
      
      // If we have altitude, we can use it as a backup for barometer
      if (altitude !== null && altitude !== undefined && !this.sensors.barometer.active) {
        this.readings[SENSOR_TYPES.ELEVATION] = altitude;
      }
    } catch (error) {
      logger.error('Error processing location update', error);
    }
  }
  
  /**
   * Calculates elevation changes from barometer
   * @param {number} pressure - Barometric pressure reading
   * @returns {number} Elevation in meters
   */
  _calculateElevation(pressure) {
    try {
      // Standard atmospheric pressure at sea level in hPa
      const STANDARD_PRESSURE = 1013.25;
      
      // Simple formula to calculate elevation from pressure
      // h = 44330 * (1 - (p/p0)^(1/5.255))
      const elevation = 44330 * (1 - Math.pow(pressure / STANDARD_PRESSURE, 1 / 5.255));
      
      return elevation;
    } catch (error) {
      logger.error('Error calculating elevation from pressure', error);
      return null;
    }
  }
  
  /**
   * Gets current ambient temperature if available
   * @returns {Promise<number>} Temperature in celsius
   */
  async getTemperature() {
    // Note: Expo doesn't provide direct access to temperature sensors
    // This is a placeholder for platform-specific implementations
    return this.temperature;
  }
  
  /**
   * Converts location accuracy string to Expo Location constant
   * @param {string} accuracy - Desired accuracy ('high', 'balanced', 'low')
   * @returns {number} Location accuracy constant
   * @private
   */
  _getLocationAccuracy(accuracy) {
    switch (accuracy?.toLowerCase()) {
      case 'high':
        return Location.Accuracy.High;
      case 'low':
        return Location.Accuracy.Low;
      case 'balanced':
      default:
        return Location.Accuracy.Balanced;
    }
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  async cleanup() {
    await this.stop();
  }
}

export default PhoneSensors;