import { EventEmitter } from 'events';
import { Platform } from 'react-native';

// Import constants and utilities
import { 
  SERVICE_UUIDS, 
  DEVICE_PROFILES, 
  BLE_EVENTS, 
  ERROR_CODES,
  DEVICE_TYPES
} from './bleConstants';
import logger from '../../utils/logger';

// Maximum reconnection attempts
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.MAX_RECONNECT_ATTEMPTS, 10) || 5;
// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = parseInt(process.env.CONNECTION_TIMEOUT_MS, 10) || 10000;
const DEBUG_MODE = process.env.BLE_DEBUG_MODE === 'true';

/**
 * Service for establishing and managing connections to BLE devices
 */
class DeviceConnection extends EventEmitter {
  constructor(manager) {
    super();
    this.manager = manager;
    this.connections = new Map(); // Active device connections
    this.pendingConnections = new Map(); // Connection attempts in progress
    this.reconnectAttempts = new Map(); // Reconnection attempt counts
    this.connectionTimeouts = new Map(); // Timeout IDs for connection attempts
    this.deviceProfiles = DEVICE_PROFILES;
  }
  
  /**
   * Connects to a BLE device
   * @param {string} deviceId - Device identifier
   * @param {boolean} autoReconnect - Whether to auto reconnect on disconnect
   * @returns {Promise<Object>} Connected device
   * @throws {Error} If connection fails
   */
  async connect(deviceId, autoReconnect = true) {
    try {
      // Check if device is already connected
      if (this.connections.has(deviceId)) {
        return this.connections.get(deviceId);
      }
      
      // Check if connection attempt is already in progress
      if (this.pendingConnections.has(deviceId)) {
        return this.pendingConnections.get(deviceId);
      }
      
      logger.info(`Connecting to device: ${deviceId}`);
      
      // Create connection promise
      const connectionPromise = new Promise(async (resolve, reject) => {
        try {
          // Set connection timeout
          const timeoutId = setTimeout(() => {
            this._handleConnectionTimeout(deviceId, reject);
          }, CONNECTION_TIMEOUT);
          this.connectionTimeouts.set(deviceId, timeoutId);
          
          // Connect to device
          const device = await this.manager.connectToDevice(deviceId, {
            autoConnect: Platform.OS === 'android' ? true : false,
            timeout: CONNECTION_TIMEOUT,
          });
          
          // Clear timeout since connection succeeded
          this._clearConnectionTimeout(deviceId);
          
          if (DEBUG_MODE) {
            logger.debug(`Connected to device: ${deviceId}`, {
              name: device.name,
              rssi: device.rssi
            });
          }
          
          // Discover services and characteristics
          const deviceWithServices = await this.discoverServices(device);
          
          // Store connection
          this.connections.set(deviceId, deviceWithServices);
          
          // Set up disconnect listener
          this._setupDisconnectListener(deviceWithServices, autoReconnect);
          
          // Reset reconnect attempts for successful connection
          this.reconnectAttempts.delete(deviceId);
          
          // Emit connected event
          this.emit(BLE_EVENTS.DEVICE_CONNECTED, deviceWithServices);
          
          // Resolve with connected device
          resolve(deviceWithServices);
        } catch (error) {
          // Clear any pending timeout
          this._clearConnectionTimeout(deviceId);
          
          logger.error(`Connection to device ${deviceId} failed`, error);
          reject(new Error(`Connection failed: ${error.message}`));
        } finally {
          // Remove from pending connections
          this.pendingConnections.delete(deviceId);
        }
      });
      
      // Store pending connection
      this.pendingConnections.set(deviceId, connectionPromise);
      
      return connectionPromise;
    } catch (error) {
      logger.error(`Error initiating connection to device ${deviceId}`, error);
      throw error;
    }
  }
  
  /**
   * Discovers services and characteristics for a device
   * @param {Object} device - Connected device object
   * @returns {Promise<Object>} Device with discovered services
   * @throws {Error} If discovery fails
   */
  async discoverServices(device) {
    try {
      // Log discovery attempt
      if (DEBUG_MODE) {
        logger.debug(`Discovering services for device: ${device.id}`);
      }
      
      // Ensure device is connected before discovering
      const isConnected = await device.isConnected();
      if (!isConnected) {
        throw new Error('Device disconnected before service discovery');
      }
      
      // Discover all services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      
      // Get all services
      const services = await device.services();
      
      // Store services on the device object
      device.discoveredServices = services.map(service => ({
        uuid: service.uuid,
        isPrimary: service.isPrimary,
      }));
      
      // Identify device type based on services
      device.type = this._identifyDeviceType(device);
      
      if (DEBUG_MODE) {
        logger.debug(`Discovered ${services.length} services for device: ${device.id}`);
      }
      
      return device;
    } catch (error) {
      logger.error(`Service discovery failed for device: ${device.id}`, error);
      throw new Error(`Service discovery failed: ${error.message}`);
    }
  }
  
  /**
   * Disconnects from a device
   * @param {string} deviceId - Device identifier
   * @returns {Promise<boolean>} Success state
   */
  async disconnect(deviceId) {
    try {
      // Check if device is connected
      if (!this.connections.has(deviceId)) {
        logger.warn(`Attempted to disconnect non-connected device: ${deviceId}`);
        return false;
      }
      
      // Get device
      const device = this.connections.get(deviceId);
      
      // Remove disconnect listener to prevent auto-reconnect
      device.removeAllListeners('disconnected');
      
      // Cancel any pending reconnection attempts
      this.reconnectAttempts.delete(deviceId);
      
      // Disconnect from device
      await device.cancelConnection();
      
      // Remove from connections
      this.connections.delete(deviceId);
      
      // Emit disconnect event
      this.emit(BLE_EVENTS.DEVICE_DISCONNECTED, deviceId);
      
      logger.info(`Disconnected from device: ${deviceId}`);
      return true;
    } catch (error) {
      logger.error(`Error disconnecting from device ${deviceId}`, error);
      return false;
    }
  }
  
  /**
   * Handles unexpected disconnection
   * @param {string} deviceId - Device identifier
   * @returns {Promise<boolean>} Whether reconnection was attempted
   */
  async _handleDisconnection(deviceId) {
    try {
      // Check if device was connected
      if (!this.connections.has(deviceId)) {
        return false;
      }
      
      // Get device info before removing from connections
      const device = this.connections.get(deviceId);
      
      // Remove from active connections
      this.connections.delete(deviceId);
      
      // Emit disconnected event
      this.emit(BLE_EVENTS.DEVICE_DISCONNECTED, deviceId);
      
      // Check if we should attempt to reconnect
      const attemptCount = this.reconnectAttempts.get(deviceId) || 0;
      
      if (attemptCount < MAX_RECONNECT_ATTEMPTS) {
        // Increment attempt counter
        this.reconnectAttempts.set(deviceId, attemptCount + 1);
        
        logger.info(`Attempting to reconnect to device: ${deviceId} (Attempt ${attemptCount + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        // Wait briefly before reconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Attempt to reconnect
        this.connect(deviceId, true).catch(error => {
          logger.error(`Reconnection attempt failed for device: ${deviceId}`, error);
        });
        
        return true;
      } else {
        logger.warn(`Maximum reconnection attempts reached for device: ${deviceId}`);
        this.reconnectAttempts.delete(deviceId);
        return false;
      }
    } catch (error) {
      logger.error(`Error handling disconnection for device ${deviceId}`, error);
      return false;
    }
  }
  
  /**
   * Sets up disconnection listener for a device
   * @param {Object} device - Connected device
   * @param {boolean} autoReconnect - Whether to attempt reconnection on disconnect
   * @private
   */
  _setupDisconnectListener(device, autoReconnect) {
    // Remove any existing listener
    device.removeAllListeners('disconnected');
    
    // Add disconnect listener
    device.once('disconnected', (error) => {
      const deviceId = device.id;
      
      if (error) {
        logger.warn(`Device ${deviceId} disconnected with error:`, error);
      } else {
        logger.info(`Device ${deviceId} disconnected`);
      }
      
      // Handle disconnect and attempt reconnection if enabled
      if (autoReconnect) {
        this._handleDisconnection(deviceId);
      } else {
        // Just remove from connections without reconnecting
        this.connections.delete(deviceId);
        this.emit(BLE_EVENTS.DEVICE_DISCONNECTED, deviceId);
      }
    });
  }
  
  /**
   * Handles connection timeout
   * @param {string} deviceId - Device identifier
   * @param {Function} rejectFn - Promise rejection function
   * @private
   */
  _handleConnectionTimeout(deviceId, rejectFn) {
    logger.warn(`Connection to device ${deviceId} timed out after ${CONNECTION_TIMEOUT}ms`);
    
    // Clear timeout entry
    this.connectionTimeouts.delete(deviceId);
    
    // Cancel any pending connection
    try {
      this.manager.cancelDeviceConnection(deviceId);
    } catch (error) {
      // Ignore errors from cancellation
    }
    
    // Reject the promise
    rejectFn(new Error(`Connection timed out after ${CONNECTION_TIMEOUT}ms`));
  }
  
  /**
   * Clears connection timeout
   * @param {string} deviceId - Device identifier
   * @private
   */
  _clearConnectionTimeout(deviceId) {
    const timeoutId = this.connectionTimeouts.get(deviceId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete(deviceId);
    }
  }
  
  /**
   * Identifies device type based on services
   * @param {Object} device - Device with discovered services
   * @returns {string} Device type identifier
   */
  _identifyDeviceType(device) {
    // Check if device has services
    if (!device.discoveredServices || device.discoveredServices.length === 0) {
      return DEVICE_TYPES.UNKNOWN;
    }
    
    const serviceUUIDs = device.discoveredServices.map(service => service.uuid);
    
    // Check for heart rate service
    if (serviceUUIDs.includes(SERVICE_UUIDS.HEART_RATE)) {
      return DEVICE_TYPES.HEART_RATE;
    }
    
    // Check for cycling power service (used by some running power meters)
    if (serviceUUIDs.includes(SERVICE_UUIDS.CYCLING_POWER)) {
      return DEVICE_TYPES.POWER;
    }
    
    // Check for running speed and cadence service
    if (serviceUUIDs.includes(SERVICE_UUIDS.RUNNING_SPEED_CADENCE)) {
      return DEVICE_TYPES.FOOT_POD;
    }
    
    // Check device name as fallback
    const name = (device.name || '').toLowerCase();
    
    if (name.includes('hrm') || name.includes('heart')) {
      return DEVICE_TYPES.HEART_RATE;
    }
    
    if (name.includes('stryd') || name.includes('power')) {
      return DEVICE_TYPES.POWER;
    }
    
    if (name.includes('foot') || name.includes('pod') || name.includes('run')) {
      return DEVICE_TYPES.FOOT_POD;
    }
    
    if (name.includes('cadence')) {
      return DEVICE_TYPES.CADENCE;
    }
    
    return DEVICE_TYPES.UNKNOWN;
  }
  
  /**
   * Gets all connected devices
   * @returns {Array} Currently connected devices
   */
  getConnectedDevices() {
    return Array.from(this.connections.values());
  }
  
  /**
   * Checks if a device is connected
   * @param {string} deviceId - Device identifier
   * @returns {boolean} Connection status
   */
  isDeviceConnected(deviceId) {
    return this.connections.has(deviceId);
  }
  
  /**
   * Clean up all connections and listeners
   */
  cleanup() {
    // Disconnect all devices
    const disconnectPromises = Array.from(this.connections.keys()).map(deviceId => 
      this.disconnect(deviceId).catch(error => {
        logger.error(`Error disconnecting device ${deviceId} during cleanup`, error);
      })
    );
    
    // Clear all timeouts
    for (const timeoutId of this.connectionTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    // Clear all maps
    this.connections.clear();
    this.pendingConnections.clear();
    this.reconnectAttempts.clear();
    this.connectionTimeouts.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

export default DeviceConnection;