import { BleManager as RNBleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';

// Import device management modules
import DeviceScanner from './deviceScanner';
import DeviceConnection from './deviceConnection';

// Import constants and utilities
import { SERVICE_UUIDS, DEVICE_PROFILES, BLE_EVENTS, ERROR_CODES } from './bleConstants';
import { requestPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../config/constants';
import logger from '../../utils/logger';

// BLE reconnection configuration
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.BLE_RECONNECT_ATTEMPTS, 10) || 3;
const DEBUG_MODE = process.env.BLE_DEBUG_MODE === 'true';

/**
 * Core BLE service for managing Bluetooth connections and communication
 */
class BleManager {
  constructor() {
    this.manager = null;
    this.devices = new Map(); // Connected devices by ID
    this.isScanning = false;
    this.eventEmitter = new EventEmitter();
    this.deviceScanner = null;
    this.deviceConnection = null;
    this.isInitialized = false;
    
    // Store promises for cleanup
    this._scanPromises = new Map();
    this._connectionPromises = new Map();
    
    // Initialize on construction
    this.init();
  }
  
  /**
   * Initializes the BLE manager
   * @returns {Promise<boolean>} Success state of initialization
   * @throws {Error} If BLE initialization fails
   */
  async init() {
    try {
      if (this.isInitialized) return true;
      
      logger.info('Initializing BLE Manager');
      
      // Create BLE manager instance
      this.manager = new RNBleManager();
      
      // Initialize device scanner and connection manager
      this.deviceScanner = new DeviceScanner(this.manager);
      this.deviceConnection = new DeviceConnection(this.manager);
      
      // Set up event listeners
      this._setupEventListeners();
      
      this.isInitialized = true;
      logger.info('BLE Manager initialized successfully');
      
      // Enable Bluetooth if needed
      await this.enableBluetooth();
      
      return true;
    } catch (error) {
      logger.error('BLE Manager initialization failed', error);
      throw new Error(`Failed to initialize BLE: ${error.message}`);
    }
  }
  
  /**
   * Sets up event listeners for BLE state changes
   * @private
   */
  _setupEventListeners() {
    // State change event (powered on/off)
    this.manager.onStateChange((state) => {
      if (DEBUG_MODE) {
        logger.debug(`BLE state changed: ${state}`);
      }
      
      this.eventEmitter.emit(BLE_EVENTS.STATE_CHANGE, state);
      
      if (state === 'PoweredOn') {
        this.eventEmitter.emit(BLE_EVENTS.READY);
      } else if (state === 'PoweredOff') {
        this.eventEmitter.emit(BLE_EVENTS.POWERED_OFF);
      }
    }, true); // Start with subscription
    
    // Forward device connection events
    this.deviceConnection.on(BLE_EVENTS.DEVICE_CONNECTED, (device) => {
      this.devices.set(device.id, device);
      this.eventEmitter.emit(BLE_EVENTS.DEVICE_CONNECTED, device);
    });
    
    this.deviceConnection.on(BLE_EVENTS.DEVICE_DISCONNECTED, (deviceId) => {
      this.devices.delete(deviceId);
      this.eventEmitter.emit(BLE_EVENTS.DEVICE_DISCONNECTED, deviceId);
    });
    
    // Forward device discovery events
    this.deviceScanner.on(BLE_EVENTS.DEVICE_DISCOVERED, (device) => {
      this.eventEmitter.emit(BLE_EVENTS.DEVICE_DISCOVERED, device);
    });
    
    this.deviceScanner.on(BLE_EVENTS.SCAN_STARTED, () => {
      this.isScanning = true;
      this.eventEmitter.emit(BLE_EVENTS.SCAN_STARTED);
    });
    
    this.deviceScanner.on(BLE_EVENTS.SCAN_STOPPED, () => {
      this.isScanning = false;
      this.eventEmitter.emit(BLE_EVENTS.SCAN_STOPPED);
    });
  }
  
  /**
   * Checks if BLE is enabled and requests enabling if needed
   * @returns {Promise<boolean>} Whether BLE is enabled
   */
  async enableBluetooth() {
    try {
      // Check if bluetooth permission is granted
      const hasPermission = await this._checkAndRequestPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permission denied');
      }
      
      // Check current state
      const state = await this.manager.state();
      
      if (state === 'PoweredOn') {
        return true;
      }
      
      if (state === 'PoweredOff') {
        // On Android, we can request to enable Bluetooth
        if (Platform.OS === 'android') {
          try {
            await this.manager.enable();
            return true;
          } catch (enableError) {
            logger.warn('User declined to enable Bluetooth', enableError);
            return false;
          }
        } else {
          // On iOS, we can only prompt the user to enable it manually
          logger.warn('Bluetooth is powered off. Please enable it in settings.');
          this.eventEmitter.emit(BLE_EVENTS.ENABLE_REQUEST);
          return false;
        }
      }
      
      // Other states (Unsupported, Unauthorized, Resetting, Unknown)
      logger.warn(`Bluetooth is in state: ${state}`);
      return false;
    } catch (error) {
      logger.error('Error enabling Bluetooth', error);
      return false;
    }
  }
  
  /**
   * Checks for and requests necessary BLE permissions
   * @private
   * @returns {Promise<boolean>} Whether permissions are granted
   */
  async _checkAndRequestPermissions() {
    try {
      // Request location permission (required for BLE scanning on Android)
      const locationPermission = await requestPermission(PERMISSIONS.LOCATION.name, true);
      
      // Request Bluetooth permission
      const bluetoothPermission = await requestPermission(PERMISSIONS.BLUETOOTH.name, true);
      
      return locationPermission && bluetoothPermission;
    } catch (error) {
      logger.error('Error checking/requesting BLE permissions', error);
      return false;
    }
  }
  
  /**
   * Scans for available BLE devices
   * @param {Object} options - Scanning options (duration, filters)
   * @returns {Promise<Array>} Discovered devices
   * @throws {Error} If scanning fails
   */
  async scanForDevices(options = {}) {
    try {
      // Check and request permissions if needed
      const hasPermission = await this._checkAndRequestPermissions();
      if (!hasPermission) {
        throw new Error('Insufficient permissions for BLE scanning');
      }
      
      // Check if BLE is enabled
      const enabled = await this.enableBluetooth();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }
      
      // Generate a unique ID for this scan operation
      const scanId = Date.now().toString();
      
      // Create a promise to track this scan operation
      const scanPromise = this.deviceScanner.startScan(options);
      this._scanPromises.set(scanId, scanPromise);
      
      // Clean up on completion
      scanPromise.finally(() => {
        this._scanPromises.delete(scanId);
      });
      
      // Wait for scan to complete and return results
      const devices = await scanPromise;
      return devices;
    } catch (error) {
      logger.error('Error scanning for BLE devices', error);
      throw new Error(`BLE scan failed: ${error.message}`);
    }
  }
  
  /**
   * Stops any active scanning operation
   * @returns {Promise<void>}
   */
  async stopScan() {
    try {
      await this.deviceScanner.stopScan();
    } catch (error) {
      logger.error('Error stopping BLE scan', error);
    }
  }
  
  /**
   * Connects to a BLE device
   * @param {string} deviceId - Device identifier
   * @returns {Promise<Object>} Connected device object
   * @throws {Error} If connection fails
   */
  async connectToDevice(deviceId) {
    try {
      // Check if already connected
      if (this.devices.has(deviceId)) {
        return this.devices.get(deviceId);
      }
      
      // Check if BLE is enabled
      const enabled = await this.enableBluetooth();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }
      
      // Generate a unique ID for this connection operation
      const connectionId = `${deviceId}-${Date.now()}`;
      
      // Create a promise to track this connection operation
      const connectionPromise = this.deviceConnection.connect(deviceId);
      this._connectionPromises.set(connectionId, connectionPromise);
      
      // Clean up on completion
      connectionPromise.finally(() => {
        this._connectionPromises.delete(connectionId);
      });
      
      // Wait for connection and return device
      const device = await connectionPromise;
      this.devices.set(deviceId, device);
      
      return device;
    } catch (error) {
      logger.error(`Error connecting to device ${deviceId}`, error);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }
  
  /**
   * Disconnects from a BLE device
   * @param {string} deviceId - Device identifier
   * @returns {Promise<boolean>} Success state of disconnection
   */
  async disconnectFromDevice(deviceId) {
    try {
      const success = await this.deviceConnection.disconnect(deviceId);
      
      if (success) {
        this.devices.delete(deviceId);
      }
      
      return success;
    } catch (error) {
      logger.error(`Error disconnecting from device ${deviceId}`, error);
      return false;
    }
  }
  
  /**
   * Reads characteristic value from device
   * @param {string} deviceId - Device identifier
   * @param {string} serviceUUID - Service UUID
   * @param {string} characteristicUUID - Characteristic UUID
   * @returns {Promise<any>} Characteristic value
   * @throws {Error} If read fails
   */
  async readCharacteristic(deviceId, serviceUUID, characteristicUUID) {
    try {
      // Check if device is connected
      if (!this.devices.has(deviceId)) {
        throw new Error('Device not connected');
      }
      
      // Get device
      const device = this.devices.get(deviceId);
      
      // Read characteristic
      const characteristic = await device.readCharacteristicForService(
        serviceUUID,
        characteristicUUID
      );
      
      return characteristic.value;
    } catch (error) {
      logger.error('Error reading characteristic', error);
      throw new Error(`Failed to read characteristic: ${error.message}`);
    }
  }
  
  /**
   * Writes value to a characteristic
   * @param {string} deviceId - Device identifier
   * @param {string} serviceUUID - Service UUID
   * @param {string} characteristicUUID - Characteristic UUID
   * @param {string} value - Base64 encoded value to write
   * @param {boolean} withResponse - Whether to wait for response
   * @returns {Promise<void>} Resolves when write completes
   * @throws {Error} If write fails
   */
  async writeCharacteristic(
    deviceId, 
    serviceUUID, 
    characteristicUUID, 
    value, 
    withResponse = true
  ) {
    try {
      // Check if device is connected
      if (!this.devices.has(deviceId)) {
        throw new Error('Device not connected');
      }
      
      // Get device
      const device = this.devices.get(deviceId);
      
      // Write to characteristic
      if (withResponse) {
        await device.writeCharacteristicWithResponseForService(
          serviceUUID,
          characteristicUUID,
          value
        );
      } else {
        await device.writeCharacteristicWithoutResponseForService(
          serviceUUID,
          characteristicUUID,
          value
        );
      }
    } catch (error) {
      logger.error('Error writing to characteristic', error);
      throw new Error(`Failed to write to characteristic: ${error.message}`);
    }
  }
  
  /**
   * Subscribes to characteristic notifications
   * @param {string} deviceId - Device identifier
   * @param {string} serviceUUID - Service UUID
   * @param {string} characteristicUUID - Characteristic UUID
   * @param {Function} listener - Notification callback
   * @returns {Object} Subscription object for cleanup
   * @throws {Error} If subscription fails
   */
  async subscribeToCharacteristic(
    deviceId,
    serviceUUID,
    characteristicUUID,
    listener
  ) {
    try {
      // Check if device is connected
      if (!this.devices.has(deviceId)) {
        throw new Error('Device not connected');
      }
      
      // Get device
      const device = this.devices.get(deviceId);
      
      // Monitor characteristic
      const subscription = device.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            logger.error('Characteristic notification error', error);
            return;
          }
          
          if (characteristic && characteristic.value) {
            listener(characteristic.value, characteristic);
          }
        }
      );
      
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to characteristic', error);
      throw new Error(`Failed to subscribe to characteristic: ${error.message}`);
    }
  }
  
  /**
   * Gets a list of currently connected devices
   * @returns {Array} Connected device objects
   */
  getConnectedDevices() {
    return Array.from(this.devices.values());
  }
  
  /**
   * Checks if a specific device is connected
   * @param {string} deviceId - Device identifier to check
   * @returns {boolean} Whether device is connected
   */
  isDeviceConnected(deviceId) {
    return this.devices.has(deviceId);
  }
  
  /**
   * Adds an event listener for BLE events
   * @param {string} event - Event type from BLE_EVENTS
   * @param {Function} listener - Event handler function
   * @returns {Function} Function to remove listener
   */
  addEventListener(event, listener) {
    this.eventEmitter.on(event, listener);
    
    // Return function to remove this listener
    return () => {
      this.eventEmitter.removeListener(event, listener);
    };
  }
  
  /**
   * Cleans up resources and listeners
   */
  cleanup() {
    // Stop scanning if active
    if (this.isScanning) {
      this.stopScan().catch(error => {
        logger.error('Error stopping scan during cleanup', error);
      });
    }
    
    // Disconnect all devices
    const disconnectPromises = Array.from(this.devices.keys()).map(deviceId => 
      this.disconnectFromDevice(deviceId)
    );
    
    // Cancel any pending operations
    this._scanPromises.forEach((promise, id) => {
      this._scanPromises.delete(id);
    });
    
    this._connectionPromises.forEach((promise, id) => {
      this._connectionPromises.delete(id);
    });
    
    // Clean up event emitter
    this.eventEmitter.removeAllListeners();
    
    // Destroy BLE manager
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
    
    this.isInitialized = false;
    
    logger.info('BLE Manager cleaned up');
  }
}

// Create a singleton instance
const bleManagerInstance = new BleManager();

// Export the singleton instance
export default bleManagerInstance;

// Named exports for constants and types
export { BLE_EVENTS, SERVICE_UUIDS, DEVICE_PROFILES, ERROR_CODES };