import { useState, useEffect, useCallback } from 'react';
import bleManager from '../services/ble/bleManager';
import deviceScanner from '../services/ble/deviceScanner';
import deviceConnection from '../services/ble/deviceConnection';
import logger from '../utils/logger';

/**
 * Custom hook for BLE connection management in components
 * @param {Object} options - Configuration options
 * @returns {Object} BLE connection methods and state
 */
const useBleConnection = (options = {}) => {
  // State for connected devices
  const [connectedDevices, setConnectedDevices] = useState([]);
  // State for scanning status
  const [isScanning, setIsScanning] = useState(false);
  // State for discovered devices
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  // State for connection in progress
  const [connecting, setConnecting] = useState(false);
  // State for any errors
  const [error, setError] = useState(null);

  // Initialize BLE on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeBle = async () => {
      try {
        // Initialize BLE manager
        const initialized = await bleManager.initialize();
        
        if (!initialized) {
          throw new Error('Failed to initialize BLE');
        }
        
        // Check if BLE is enabled
        const enabled = await bleManager.checkBleEnabled();
        
        if (!enabled && options.autoEnableBle) {
          await bleManager.requestBleEnable();
        }
        
        // Get already connected devices
        if (isMounted) {
          const devices = Array.from(bleManager.devices.values());
          setConnectedDevices(devices);
          logger.info('BLE initialized with existing devices', { count: devices.length });
        }
      } catch (err) {
        if (isMounted) {
          logger.error('BLE initialization error', err);
          setError(err.message);
        }
      }
    };

    initializeBle();

    // Subscribe to connection state changes
    const handleDeviceConnected = (device) => {
      if (isMounted) {
        logger.info('Device connected', { deviceId: device.id, name: device.name });
        setConnectedDevices(prev => {
          // Avoid duplicates
          const existing = prev.findIndex(d => d.id === device.id);
          if (existing >= 0) {
            return prev.map(d => d.id === device.id ? device : d);
          }
          return [...prev, device];
        });
        setError(null);
      }
    };

    const handleDeviceDisconnected = (deviceId) => {
      if (isMounted) {
        logger.info('Device disconnected', { deviceId });
        setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
      }
    };

    // Subscribe to BLE events
    const connectedSub = bleManager.eventEmitter.addListener(
      'deviceConnected', 
      handleDeviceConnected
    );
    
    const disconnectedSub = bleManager.eventEmitter.addListener(
      'deviceDisconnected',
      handleDeviceDisconnected
    );

    // Cleanup subscriptions on unmount
    return () => {
      isMounted = false;
      connectedSub.remove();
      disconnectedSub.remove();
      logger.debug('BLE connection hook cleanup');
    };
  }, [options.autoEnableBle]);

  // Handle scan results
  useEffect(() => {
    const scanResultListener = (device) => {
      logger.debug('Device discovered', { deviceId: device.id, name: device.name });
      setDiscoveredDevices(prev => {
        // Update or add the device
        const existing = prev.findIndex(d => d.id === device.id);
        if (existing >= 0) {
          return prev.map(d => d.id === device.id ? device : d);
        }
        return [...prev, device];
      });
    };

    // Add listener for scan results
    const removeListener = deviceScanner.addListener(scanResultListener);
    
    // Cleanup listener on unmount
    return () => {
      removeListener();
    };
  }, []);

  /**
   * Initiates device scanning
   * @param {Object} options - Scan configuration options
   * @returns {Promise<Array>} Discovered devices
   */
  const startScan = useCallback(async (scanOptions = {}) => {
    setError(null);
    
    try {
      // If already scanning, stop first
      if (isScanning) {
        await stopScan();
      }
      
      setIsScanning(true);
      setDiscoveredDevices([]);
      
      // Ensure BLE is enabled
      const bleEnabled = await bleManager.checkBleEnabled();
      if (!bleEnabled) {
        const enabled = await bleManager.requestBleEnable();
        if (!enabled) {
          throw new Error('Bluetooth is not enabled');
        }
      }
      
      // Start scanning
      await deviceScanner.startScan(scanOptions);
      logger.info('BLE scan started', scanOptions);
      
      return discoveredDevices;
    } catch (err) {
      logger.error('BLE scan error', err);
      setError(err.message);
      throw err;
    }
  }, [isScanning, discoveredDevices]);

  /**
   * Stops the current scanning operation
   * @returns {Promise<void>}
   */
  const stopScan = useCallback(async () => {
    if (!isScanning) return;
    
    try {
      await deviceScanner.stopScan();
      logger.info('BLE scan stopped');
    } catch (err) {
      logger.error('Error stopping BLE scan', err);
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  /**
   * Connects to a specific device
   * @param {string} deviceId - Device identifier
   * @param {boolean} autoReconnect - Whether to auto reconnect on disconnect
   * @returns {Promise<Object>} Connected device
   * @throws {Error} If connection fails
   */
  const connectToDevice = useCallback(async (deviceId, autoReconnect = true) => {
    setError(null);
    setConnecting(true);
    
    try {
      logger.info('Connecting to device', { deviceId, autoReconnect });
      const device = await deviceConnection.connect(deviceId, autoReconnect);
      return device;
    } catch (err) {
      logger.error('BLE connection error', { deviceId, error: err.message });
      setError(err.message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  /**
   * Disconnects from a specific device
   * @param {string} deviceId - Device identifier
   * @returns {Promise<boolean>} Success state
   */
  const disconnectDevice = useCallback(async (deviceId) => {
    setError(null);
    
    try {
      logger.info('Disconnecting device', { deviceId });
      return await deviceConnection.disconnect(deviceId);
    } catch (err) {
      logger.error('BLE disconnection error', { deviceId, error: err.message });
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Retrieves the connection status for a device
   * @param {string} deviceId - Device identifier
   * @returns {boolean} Whether device is connected
   */
  const isDeviceConnected = useCallback((deviceId) => {
    return connectedDevices.some(device => device.id === deviceId);
  }, [connectedDevices]);

  /**
   * Gets a connected device by ID
   * @param {string} deviceId - Device identifier
   * @returns {Object|null} Connected device or null if not found
   */
  const getConnectedDevice = useCallback((deviceId) => {
    return connectedDevices.find(device => device.id === deviceId) || null;
  }, [connectedDevices]);

  /**
   * Reads a characteristic value from a device
   * @param {string} deviceId - Device identifier
   * @param {string} serviceUUID - Service UUID
   * @param {string} characteristicUUID - Characteristic UUID
   * @returns {Promise<any>} Characteristic value
   */
  const readCharacteristic = useCallback(async (deviceId, serviceUUID, characteristicUUID) => {
    setError(null);
    
    try {
      return await bleManager.readCharacteristic(deviceId, serviceUUID, characteristicUUID);
    } catch (err) {
      logger.error('BLE read characteristic error', { 
        deviceId, 
        serviceUUID, 
        characteristicUUID, 
        error: err.message 
      });
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Subscribes to characteristic notifications
   * @param {string} deviceId - Device identifier
   * @param {string} serviceUUID - Service UUID
   * @param {string} characteristicUUID - Characteristic UUID
   * @param {Function} listener - Notification callback
   * @returns {Promise<Object>} Subscription object for cleanup
   */
  const subscribeToCharacteristic = useCallback(async (deviceId, serviceUUID, characteristicUUID, listener) => {
    setError(null);
    
    try {
      logger.info('Subscribing to characteristic', { 
        deviceId, 
        serviceUUID, 
        characteristicUUID 
      });
      return await bleManager.subscribeToCharacteristic(
        deviceId, 
        serviceUUID, 
        characteristicUUID, 
        listener
      );
    } catch (err) {
      logger.error('BLE subscription error', { 
        deviceId, 
        serviceUUID, 
        characteristicUUID, 
        error: err.message 
      });
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    // State
    connectedDevices,
    isScanning,
    discoveredDevices,
    connecting,
    error,
    
    // Methods
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    isDeviceConnected,
    getConnectedDevice,
    readCharacteristic,
    subscribeToCharacteristic
  };
};

export default useBleConnection;