import { EventEmitter } from 'events';
import { Platform } from 'react-native';

// Import constants and utilities
import { 
  SERVICE_UUIDS, 
  DEVICE_PROFILES, 
  BLE_EVENTS, 
  SCAN_OPTIONS,
  DEVICE_TYPES
} from './bleConstants';
import logger from '../../utils/logger';

// Default scan duration in milliseconds
const DEFAULT_SCAN_DURATION = parseInt(process.env.SCAN_DURATION_MS, 10) || 10000;
const DEBUG_MODE = process.env.BLE_DEBUG_MODE === 'true';

/**
 * Service for scanning and discovering BLE devices
 */
class DeviceScanner extends EventEmitter {
  constructor(manager) {
    super();
    this.manager = manager;
    this.scanOptions = { ...SCAN_OPTIONS };
    this.discoveredDevices = new Map();
    this.scanTimeout = null;
    this.isScanning = false;
    this.scanPromiseResolvers = new Map();
  }
  
  /**
   * Starts scanning for BLE devices
   * @param {Object} options - Scanning options (duration, filters)
   * @returns {Promise<void>} Resolves when scanning starts
   * @throws {Error} If scanning cannot start
   */
  async startScan(options = {}) {
    try {
      // Don't start a new scan if one is already in progress
      if (this.isScanning) {
        throw new Error('A scan is already in progress');
      }
      
      // Reset discovered devices
      this.discoveredDevices.clear();
      
      // Merge default and provided options
      const scanOptions = {
        ...this.scanOptions,
        ...options,
      };
      
      // Extract duration from options or use default
      const scanDuration = scanOptions.duration || DEFAULT_SCAN_DURATION;
      
      // Create a promise that will resolve when scanning completes
      return new Promise(async (resolve, reject) => {
        try {
          // Generate an ID for this scan operation
          const scanId = Date.now().toString();
          
          // Store the resolver function to be called when scan completes
          this.scanPromiseResolvers.set(scanId, { resolve, reject });
          
          // Start the BLE scan
          this.manager.startDeviceScan(
            scanOptions.serviceUUIDs,
            { 
              allowDuplicates: scanOptions.allowDuplicates || false,
              scanMode: this._getPlatformScanMode(scanOptions.scanMode),
            },
            this._handleScanResult.bind(this)
          );
          
          this.isScanning = true;
          this.emit(BLE_EVENTS.SCAN_STARTED);
          
          // Log scan start
          logger.info('BLE scan started', { 
            duration: scanDuration,
            filters: scanOptions.serviceUUIDs ? scanOptions.serviceUUIDs.length : 'none'
          });
          
          // Set timeout to stop scanning after duration
          this.scanTimeout = setTimeout(() => {
            this.stopScan(scanId);
          }, scanDuration);
        } catch (error) {
          // Clean up in case of error
          this.scanPromiseResolvers.delete(scanId);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Failed to start BLE scan', error);
      throw error;
    }
  }
  
  /**
   * Stops the current scan operation
   * @param {string} scanId - Optional ID of the scan to resolve
   * @returns {Promise<void>} Resolves when scanning stops
   */
  async stopScan(scanId = null) {
    try {
      // Only stop if actually scanning
      if (!this.isScanning) {
        return;
      }
      
      // Cancel timeout if it exists
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      
      // Stop the BLE scan
      this.manager.stopDeviceScan();
      this.isScanning = false;
      
      // Log scan stop
      logger.info('BLE scan stopped', { 
        devicesFound: this.discoveredDevices.size,
      });
      
      // Convert discovered devices map to array
      const devices = Array.from(this.discoveredDevices.values());
      
      // Emit scan stopped event
      this.emit(BLE_EVENTS.SCAN_STOPPED, devices);
      
      // If a specific scan ID was provided, resolve that promise
      if (scanId && this.scanPromiseResolvers.has(scanId)) {
        const { resolve } = this.scanPromiseResolvers.get(scanId);
        resolve(devices);
        this.scanPromiseResolvers.delete(scanId);
      } 
      // Otherwise resolve all pending scan promises
      else if (!scanId) {
        for (const [id, { resolve }] of this.scanPromiseResolvers.entries()) {
          resolve(devices);
          this.scanPromiseResolvers.delete(id);
        }
      }
    } catch (error) {
      logger.error('Error stopping BLE scan', error);
      
      // Resolve any pending scan promises with error
      for (const [id, { reject }] of this.scanPromiseResolvers.entries()) {
        reject(error);
        this.scanPromiseResolvers.delete(id);
      }
    }
  }
  
  /**
   * Processes discovered device
   * @param {Object} device - BLE device object
   * @returns {Object} Processed device with metadata
   */
  _processDevice(device) {
    if (!device) return null;
    
    try {
      // Extract device information
      const {
        id,
        name,
        rssi,
        manufacturerData,
        serviceUUIDs,
        serviceData,
        localName,
      } = device;
      
      // Check if device already discovered
      if (this.discoveredDevices.has(id)) {
        // Update existing device with new information
        const existingDevice = this.discoveredDevices.get(id);
        
        // Update signal strength if it changed
        if (rssi && rssi !== existingDevice.rssi) {
          existingDevice.rssi = rssi;
        }
        
        // Update name if it's now available
        if (name && !existingDevice.name) {
          existingDevice.name = name;
        }
        
        // Add new service UUIDs if discovered
        if (serviceUUIDs && serviceUUIDs.length > 0) {
          if (!existingDevice.serviceUUIDs) {
            existingDevice.serviceUUIDs = [];
          }
          
          serviceUUIDs.forEach(uuid => {
            if (!existingDevice.serviceUUIDs.includes(uuid)) {
              existingDevice.serviceUUIDs.push(uuid);
            }
          });
        }
        
        // Update device type if we can now determine it
        if (!existingDevice.type) {
          existingDevice.type = this._determineDeviceType(existingDevice);
        }
        
        return existingDevice;
      }
      
      // Create new device object with additional metadata
      const processedDevice = {
        id,
        name: name || localName || 'Unknown Device',
        rssi: rssi || -100, // Default to weak signal if not provided
        manufacturer: this._parseManufacturerData(manufacturerData),
        serviceUUIDs: serviceUUIDs || [],
        lastSeen: Date.now(),
        address: device.id,
      };
      
      // Try to determine the device type
      processedDevice.type = this._determineDeviceType(processedDevice);
      
      // Add to discovered devices map
      this.discoveredDevices.set(id, processedDevice);
      
      return processedDevice;
    } catch (error) {
      logger.error('Error processing discovered device', error, {
        deviceId: device?.id || 'unknown'
      });
      return null;
    }
  }
  
  /**
   * Handles incoming scan result
   * @param {Error} error - Error object if scan failed
   * @param {Object} device - Discovered BLE device
   * @private
   */
  _handleScanResult(error, device) {
    // Handle scan errors
    if (error) {
      logger.error('BLE scan error', error);
      this.emit(BLE_EVENTS.SCAN_ERROR, error);
      return;
    }
    
    // Ignore null devices
    if (!device) return;
    
    // Process the device
    const processedDevice = this._processDevice(device);
    if (!processedDevice) return;
    
    // Apply filters if needed
    const scanOptions = this.scanOptions;
    if (scanOptions.filters && !this._deviceMatchesFilters(processedDevice, scanOptions.filters)) {
      if (DEBUG_MODE) {
        logger.debug(`Device ${processedDevice.id} filtered out`, { 
          name: processedDevice.name, 
          type: processedDevice.type 
        });
      }
      return;
    }
    
    // Emit discovery event
    this.emit(BLE_EVENTS.DEVICE_DISCOVERED, processedDevice);
    
    if (DEBUG_MODE) {
      logger.debug(`Device discovered: ${processedDevice.name || processedDevice.id}`, { 
        type: processedDevice.type,
        rssi: processedDevice.rssi,
        services: processedDevice.serviceUUIDs?.length || 0
      });
    }
  }
  
  /**
   * Checks if device matches filter criteria
   * @param {Object} device - BLE device object
   * @param {Object} filters - Filter criteria
   * @returns {boolean} Whether device matches filters
   */
  _deviceMatchesFilters(device, filters) {
    // Apply name filter
    if (filters.namePrefix && device.name) {
      const matchesName = device.name.toLowerCase().includes(filters.namePrefix.toLowerCase());
      if (!matchesName) return false;
    }
    
    // Apply service UUIDs filter
    if (filters.serviceUUIDs && filters.serviceUUIDs.length > 0 && device.serviceUUIDs) {
      const hasAnyService = filters.serviceUUIDs.some(uuid => 
        device.serviceUUIDs.includes(uuid)
      );
      if (!hasAnyService) return false;
    }
    
    // Apply manufacturerData filter
    if (filters.manufacturerData && device.manufacturer) {
      const matchesManufacturer = 
        device.manufacturer.id === filters.manufacturerData.id;
      if (!matchesManufacturer) return false;
    }
    
    // Apply RSSI filter
    if (filters.rssi && device.rssi) {
      const signalStrong = device.rssi >= filters.rssi;
      if (!signalStrong) return false;
    }
    
    // All filters passed
    return true;
  }
  
  /**
   * Determines device type based on services and name
   * @param {Object} device - Processed device object
   * @returns {string} Device type identifier
   */
  _determineDeviceType(device) {
    // Check for service UUIDs first
    if (device.serviceUUIDs && device.serviceUUIDs.length > 0) {
      // Heart rate monitor
      if (device.serviceUUIDs.includes(SERVICE_UUIDS.HEART_RATE)) {
        return DEVICE_TYPES.HEART_RATE;
      }
      
      // Cycling power meter
      if (device.serviceUUIDs.includes(SERVICE_UUIDS.CYCLING_POWER)) {
        return DEVICE_TYPES.POWER;
      }
      
      // Running speed and cadence
      if (device.serviceUUIDs.includes(SERVICE_UUIDS.RUNNING_SPEED_CADENCE)) {
        return DEVICE_TYPES.FOOT_POD;
      }
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
    
    // Unknown device type
    return DEVICE_TYPES.UNKNOWN;
  }
  
  /**
   * Parses manufacturer data to extract company identifier
   * @param {string} data - Manufacturer data as base64 string
   * @returns {Object} Parsed manufacturer data
   */
  _parseManufacturerData(data) {
    if (!data) {
      return { id: null, data: null };
    }
    
    try {
      // This is a simplified implementation
      // A real implementation would decode the base64 string and extract
      // the manufacturer ID from the first two bytes
      return {
        id: 'unknown',
        data: data,
      };
    } catch (error) {
      logger.debug('Error parsing manufacturer data', error);
      return { id: null, data: null };
    }
  }
  
  /**
   * Converts scan mode to platform-specific value
   * @param {string} scanMode - Desired scan mode
   * @returns {any} Platform-specific scan mode value
   */
  _getPlatformScanMode(scanMode) {
    // Platform-specific scan modes
    if (Platform.OS === 'android') {
      switch (scanMode) {
        case 'lowPower':
          return 0; // ScanSettings.SCAN_MODE_LOW_POWER
        case 'balanced':
          return 1; // ScanSettings.SCAN_MODE_BALANCED
        case 'lowLatency':
          return 2; // ScanSettings.SCAN_MODE_LOW_LATENCY
        default:
          return 1; // Balanced as default
      }
    }
    
    // iOS doesn't have scan modes
    return null;
  }
  
  /**
   * Adds listener for scan results
   * @param {Function} listener - Callback for device discovery
   * @returns {Function} Function to remove listener
   */
  addDiscoveryListener(listener) {
    this.on(BLE_EVENTS.DEVICE_DISCOVERED, listener);
    return () => {
      this.removeListener(BLE_EVENTS.DEVICE_DISCOVERED, listener);
    };
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  cleanup() {
    // Stop any ongoing scan
    if (this.isScanning) {
      this.stopScan().catch(error => {
        logger.error('Error stopping scan during cleanup', error);
      });
    }
    
    // Clear timeouts
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    
    // Clear discovered devices
    this.discoveredDevices.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

export default DeviceScanner;