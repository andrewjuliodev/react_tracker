// Import BLE utilities
import bleManager from '../ble/bleManager';
import { 
  SERVICE_UUIDS, 
  CHARACTERISTIC_UUIDS,
  DEVICE_TYPES
} from '../ble/bleConstants';

// Import sensor types
import { SENSOR_TYPES } from './sensorManager';

// Import logger
import logger from '../../utils/logger';

/**
 * Service for processing heart rate sensor data from HRM Pro+ device
 */
class HeartRateSensor {
  constructor() {
    // Connected device reference
    this.device = null;
    
    // Device information
    this.deviceType = null;
    
    // Latest readings
    this.readings = {};
    
    // Track subscriptions for cleanup
    this.subscriptions = [];
    
    // Cumulative metrics
    this.cumulativeData = {
      steps: 0,
      distance: 0,
      lastStepCount: 0,
    };
  }
  
  /**
   * Initializes heart rate sensor connection
   * @param {Object} device - Connected BLE device
   * @returns {Promise<boolean>} Success state
   * @throws {Error} If initialization fails
   */
  async initialize(device) {
    try {
      logger.info(`Initializing heart rate sensor for device: ${device.id}`);
      
      // Store device reference
      this.device = device;
      
      // Determine device type (specific HRM model)
      this.deviceType = this._determineDeviceType(device);
      
      logger.info(`Initialized heart rate sensor: ${this.deviceType}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize heart rate sensor', error);
      throw error;
    }
  }
  
  /**
   * Starts data collection from heart rate monitor
   * @returns {Promise<boolean>} Success state
   */
  async start() {
    try {
      // Validate device is connected and initialized
      if (!this.device) {
        throw new Error('No heart rate device connected');
      }
      
      logger.info(`Starting heart rate sensor for device: ${this.device.id}`);
      
      // Subscribe to heart rate measurement characteristic
      const heartRateSubscription = await this._subscribeToHeartRate();
      if (heartRateSubscription) {
        this.subscriptions.push(heartRateSubscription);
      }
      
      // Subscribe to running dynamics if available (for HRM Pro)
      if (this.deviceType === 'HRM_PRO' || this.deviceType === 'HRM_PRO_PLUS') {
        const runningDynamicsSubscription = await this._subscribeToRunningDynamics();
        if (runningDynamicsSubscription) {
          this.subscriptions.push(runningDynamicsSubscription);
        }
      }
      
      // Read battery level if available
      await this._readBatteryLevel();
      
      return true;
    } catch (error) {
      logger.error('Failed to start heart rate sensor', error);
      
      // Clean up any subscriptions on failure
      this.stop().catch(stopError => {
        logger.error('Error stopping heart rate sensor after start failure', stopError);
      });
      
      throw error;
    }
  }
  
  /**
   * Stops data collection and cleans up
   * @returns {Promise<void>} Resolves when stopped
   */
  async stop() {
    try {
      logger.info('Stopping heart rate sensor');
      
      // Remove all subscriptions
      for (const subscription of this.subscriptions) {
        subscription.remove();
      }
      
      // Clear subscriptions array
      this.subscriptions = [];
      
      logger.info('Heart rate sensor stopped');
    } catch (error) {
      logger.error('Error stopping heart rate sensor', error);
      throw error;
    }
  }
  
  /**
   * Gets latest readings from the heart rate sensor
   * @returns {Object} Current sensor readings
   */
  getReadings() {
    return { ...this.readings };
  }
  
  /**
   * Subscribes to heart rate measurement characteristic
   * @returns {Promise<Object>} Subscription object
   * @private
   */
  async _subscribeToHeartRate() {
    try {
      // Check if heart rate service is available
      const deviceHasService = await this._deviceHasService(SERVICE_UUIDS.HEART_RATE);
      if (!deviceHasService) {
        logger.warn('Heart rate service not found on device');
        return null;
      }
      
      // Subscribe to heart rate measurement characteristic
      const subscription = await bleManager.subscribeToCharacteristic(
        this.device.id,
        SERVICE_UUIDS.HEART_RATE,
        CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT,
        this._handleHeartRateData.bind(this)
      );
      
      logger.info('Subscribed to heart rate measurements');
      
      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to heart rate characteristic', error);
      return null;
    }
  }
  
  /**
   * Subscribes to running dynamics characteristic
   * @returns {Promise<Object>} Subscription object
   * @private
   */
  async _subscribeToRunningDynamics() {
    try {
      // This is a simplified implementation
      // Real implementation would use the actual Garmin Running Dynamics service
      // We'll use the Running Speed and Cadence service as an example
      
      // Check if running dynamics service is available
      const deviceHasService = await this._deviceHasService(SERVICE_UUIDS.RUNNING_SPEED_CADENCE);
      if (!deviceHasService) {
        logger.info('Running dynamics service not found on device');
        return null;
      }
      
      // Subscribe to running dynamics characteristic
      const subscription = await bleManager.subscribeToCharacteristic(
        this.device.id,
        SERVICE_UUIDS.RUNNING_SPEED_CADENCE,
        CHARACTERISTIC_UUIDS.RSC_MEASUREMENT,
        this._handleRunningDynamicsData.bind(this)
      );
      
      logger.info('Subscribed to running dynamics measurements');
      
      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to running dynamics characteristic', error);
      return null;
    }
  }
  
  /**
   * Reads battery level from device
   * @returns {Promise<number>} Battery level percentage (0-100)
   * @private
   */
  async _readBatteryLevel() {
    try {
      // Check if battery service is available
      const deviceHasService = await this._deviceHasService(SERVICE_UUIDS.BATTERY_SERVICE);
      if (!deviceHasService) {
        logger.info('Battery service not found on device');
        return null;
      }
      
      // Read battery level characteristic
      const batteryData = await bleManager.readCharacteristic(
        this.device.id,
        SERVICE_UUIDS.BATTERY_SERVICE,
        CHARACTERISTIC_UUIDS.BATTERY_LEVEL
      );
      
      if (batteryData) {
        // Parse battery level data (typically a single byte representing percentage)
        const batteryLevel = this._parseBatteryLevel(batteryData);
        logger.info(`Device battery level: ${batteryLevel}%`);
        return batteryLevel;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to read battery level', error);
      return null;
    }
  }
  
  /**
   * Processes heart rate measurement data
   * @param {ArrayBuffer} data - Raw characteristic value
   * @returns {Object} Processed heart rate metrics
   * @private
   */
  _handleHeartRateData(data) {
    try {
      // Parse the heart rate data from raw bytes
      const heartRate = this._parseHeartRateValue(data);
      
      // Update readings
      this.readings[SENSOR_TYPES.HEART_RATE] = heartRate;
      
      return heartRate;
    } catch (error) {
      logger.error('Error processing heart rate data', error);
      return null;
    }
  }
  
  /**
   * Processes running dynamics data
   * @param {ArrayBuffer} data - Raw characteristic value
   * @returns {Object} Processed cadence and step metrics
   * @private
   */
  _handleRunningDynamicsData(data) {
    try {
      // Parse running dynamics data
      const { cadence, steps, strideLength } = this._parseRunningDynamicsData(data);
      
      // Update cadence reading
      if (cadence !== null && cadence !== undefined) {
        this.readings[SENSOR_TYPES.CADENCE] = cadence;
      }
      
      // Update stride length reading
      if (strideLength !== null && strideLength !== undefined) {
        this.readings[SENSOR_TYPES.STRIDE_LENGTH] = strideLength;
      }
      
      // Update step count and calculate distance
      if (steps !== null && steps !== undefined) {
        // Calculate step delta
        const previousSteps = this.cumulativeData.lastStepCount;
        const stepDelta = (steps >= previousSteps) ? (steps - previousSteps) : steps;
        
        // Update cumulative steps
        this.cumulativeData.steps += stepDelta;
        this.cumulativeData.lastStepCount = steps;
        
        // Calculate distance from steps and stride length (if available)
        if (strideLength) {
          const distanceDelta = (stepDelta * strideLength) / 100; // convert from cm to meters
          this.cumulativeData.distance += distanceDelta;
          
          // Update distance reading (in meters)
          this.readings[SENSOR_TYPES.DISTANCE] = this.cumulativeData.distance;
        }
      }
      
      // Calculate pace if we have cadence and stride length
      if (cadence && strideLength) {
        const pace = this._calculatePace(cadence, strideLength);
        this.readings[SENSOR_TYPES.PACE] = pace;
      }
      
      return { cadence, steps, strideLength };
    } catch (error) {
      logger.error('Error processing running dynamics data', error);
      return null;
    }
  }
  
  /**
   * Calculates pace from cadence and stride data
   * @param {number} cadence - Steps per minute
   * @param {number} strideLength - Stride length in centimeters
   * @returns {number} Pace in minutes per kilometer
   * @private
   */
  _calculatePace(cadence, strideLength) {
    try {
      // Skip calculation if inputs are invalid
      if (!cadence || !strideLength || cadence <= 0 || strideLength <= 0) {
        return 0;
      }
      
      // Calculate speed in meters per minute
      // cadence = steps per minute
      // strideLength = centimeters per step
      const speedMpm = (cadence * strideLength) / 100;
      
      // Convert to minutes per kilometer
      const pace = 1000 / speedMpm;
      
      return pace;
    } catch (error) {
      logger.error('Error calculating pace', error);
      return 0;
    }
  }
  
  /**
   * Updates accumulated distance based on steps
   * @param {number} steps - New step count
   * @returns {number} Updated distance in kilometers
   * @private
   */
  _updateDistance(steps) {
    try {
      // Get current values
      const previousSteps = this.cumulativeData.lastStepCount;
      const currentDistance = this.cumulativeData.distance;
      
      // Calculate step delta
      const stepDelta = (steps >= previousSteps) ? (steps - previousSteps) : steps;
      
      // Update cumulative steps
      this.cumulativeData.lastStepCount = steps;
      
      // Use stride length to calculate distance increment
      const strideLength = this.readings[SENSOR_TYPES.STRIDE_LENGTH] || 80; // default to 80cm if not known
      
      // Calculate distance increment
      const distanceIncrementMeters = (stepDelta * strideLength) / 100; // convert from cm to meters
      const newDistance = currentDistance + distanceIncrementMeters;
      
      // Update cumulative distance
      this.cumulativeData.distance = newDistance;
      
      return newDistance;
    } catch (error) {
      logger.error('Error updating distance', error);
      return this.cumulativeData.distance;
    }
  }
  
  /**
   * Parses heart rate value from characteristic data
   * @param {string} data - Base64 encoded characteristic value
   * @returns {number} Heart rate in beats per minute
   * @private
   */
  _parseHeartRateValue(data) {
    try {
      // Decode the base64 data
      const bytes = this._decodeBase64(data);
      
      // Check if data is available
      if (!bytes || bytes.length < 2) {
        logger.warn('Invalid heart rate data format');
        return 0;
      }
      
      // First byte contains flags
      const flags = bytes[0];
      
      // Check format: bit 0 indicates heart rate format
      // 0 = uint8, 1 = uint16
      const isUint16 = (flags & 0x01) === 1;
      
      // Extract heart rate value based on format
      let heartRate;
      if (isUint16) {
        // Heart rate is 16-bit uint (bytes 1-2)
        heartRate = (bytes[2] << 8) + bytes[1];
      } else {
        // Heart rate is 8-bit uint (byte 1)
        heartRate = bytes[1];
      }
      
      return heartRate;
    } catch (error) {
      logger.error('Error parsing heart rate data', error);
      return 0;
    }
  }
  
  /**
   * Parses running dynamics data
   * @param {string} data - Base64 encoded characteristic value
   * @returns {Object} Parsed running dynamics data
   * @private
   */
  _parseRunningDynamicsData(data) {
    try {
      // This is a simplified implementation
      // Real implementation would decode according to the specific format of the device
      
      // Decode the base64 data
      const bytes = this._decodeBase64(data);
      
      // Check if data is available
      if (!bytes || bytes.length < 4) {
        logger.warn('Invalid running dynamics data format');
        return { cadence: null, steps: null, strideLength: null };
      }
      
      // Simplified parsing - actual HRM Pro data would have a more complex format
      // This is just an example implementation
      
      // Parse cadence (steps per minute)
      // Assuming cadence is a uint16 at bytes 0-1
      const cadence = (bytes[1] << 8) + bytes[0];
      
      // Parse total steps
      // Assuming steps is a uint32 at bytes 2-5
      const steps = (bytes[5] << 24) + (bytes[4] << 16) + (bytes[3] << 8) + bytes[2];
      
      // Parse stride length in cm
      // Assuming stride length is a uint16 at bytes 6-7
      const strideLength = bytes.length >= 8 ? (bytes[7] << 8) + bytes[6] : 80; // Default to 80cm
      
      return { cadence, steps, strideLength };
    } catch (error) {
      logger.error('Error parsing running dynamics data', error);
      return { cadence: null, steps: null, strideLength: null };
    }
  }
  
  /**
   * Parses battery level data
   * @param {string} data - Base64 encoded characteristic value
   * @returns {number} Battery level percentage (0-100)
   * @private
   */
  _parseBatteryLevel(data) {
    try {
      // Decode the base64 data
      const bytes = this._decodeBase64(data);
      
      // Battery level is a single byte representing percentage
      if (bytes && bytes.length > 0) {
        return bytes[0];
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing battery level data', error);
      return null;
    }
  }
  
  /**
   * Decodes base64 data to byte array
   * @param {string} base64 - Base64 encoded data
   * @returns {Uint8Array} Decoded bytes
   * @private
   */
  _decodeBase64(base64) {
    try {
      // Convert base64 to byte array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      logger.error('Error decoding base64 data', error);
      return new Uint8Array(0);
    }
  }
  
  /**
   * Determines specific device type from device information
   * @param {Object} device - Connected BLE device
   * @returns {string} Specific device type identifier
   * @private
   */
  _determineDeviceType(device) {
    if (!device) return 'UNKNOWN';
    
    // Check device name for HRM Pro or Pro+
    const name = (device.name || '').toUpperCase();
    
    if (name.includes('HRM PRO+') || name.includes('HRM PRO PLUS')) {
      return 'HRM_PRO_PLUS';
    } else if (name.includes('HRM PRO')) {
      return 'HRM_PRO';
    } else if (name.includes('HRM') || name.includes('HEART RATE')) {
      return 'GENERIC_HRM';
    }
    
    return 'UNKNOWN_HRM';
  }
  
  /**
   * Checks if device supports a specific service
   * @param {string} serviceUuid - Service UUID to check
   * @returns {Promise<boolean>} Whether service is supported
   * @private
   */
  async _deviceHasService(serviceUuid) {
    try {
      if (!this.device || !this.device.discoveredServices) {
        return false;
      }
      
      return this.device.discoveredServices.some(service => 
        service.uuid.toLowerCase() === serviceUuid.toLowerCase()
      );
    } catch (error) {
      logger.error('Error checking device services', error);
      return false;
    }
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  async cleanup() {
    await this.stop();
    this.device = null;
    this.readings = {};
    this.cumulativeData = {
      steps: 0,
      distance: 0,
      lastStepCount: 0,
    };
  }
}

export default HeartRateSensor;