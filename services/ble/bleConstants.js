/**
 * Constants and configurations for BLE operations
 */

// Standard BLE service UUIDs
export const SERVICE_UUIDS = {
    // Generic services
    GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
    GENERIC_ATTRIBUTE: '00001801-0000-1000-8000-00805f9b34fb',
    DEVICE_INFORMATION: '0000180a-0000-1000-8000-00805f9b34fb',
    BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
    
    // Heart rate service
    HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
    
    // Running and cycling services
    RUNNING_SPEED_CADENCE: '00001814-0000-1000-8000-00805f9b34fb',
    CYCLING_SPEED_CADENCE: '00001816-0000-1000-8000-00805f9b34fb',
    CYCLING_POWER: '00001818-0000-1000-8000-00805f9b34fb',
    
    // Custom service for Stryd power meter
    STRYD_SERVICE: 'feee-0000-1000-8000-00805f9b34fb',
  };
  
  // Characteristic UUIDs
  export const CHARACTERISTIC_UUIDS = {
    // Generic characteristics
    DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
    APPEARANCE: '00002a01-0000-1000-8000-00805f9b34fb',
    FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
    HARDWARE_REVISION: '00002a27-0000-1000-8000-00805f9b34fb',
    MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
    BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
    
    // Heart rate characteristics
    HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
    BODY_SENSOR_LOCATION: '00002a38-0000-1000-8000-00805f9b34fb',
    
    // Running speed and cadence characteristics
    RSC_MEASUREMENT: '00002a53-0000-1000-8000-00805f9b34fb',
    RSC_FEATURE: '00002a54-0000-1000-8000-00805f9b34fb',
    
    // Cycling power characteristics
    CYCLING_POWER_MEASUREMENT: '00002a63-0000-1000-8000-00805f9b34fb',
    CYCLING_POWER_FEATURE: '00002a65-0000-1000-8000-00805f9b34fb',
    
    // Stryd-specific characteristics (fictional for this example)
    STRYD_POWER_MEASUREMENT: 'feee1001-0000-1000-8000-00805f9b34fb',
    STRYD_METRICS: 'feee1002-0000-1000-8000-00805f9b34fb',
  };
  
  // BLE events for event emitter
  export const BLE_EVENTS = {
    // State events
    STATE_CHANGE: 'bleStateChange',
    READY: 'bleReady',
    POWERED_OFF: 'blePoweredOff',
    ENABLE_REQUEST: 'bleEnableRequest',
    
    // Scan events
    SCAN_STARTED: 'bleScanStarted',
    SCAN_STOPPED: 'bleScanStopped',
    SCAN_ERROR: 'bleScanError',
    DEVICE_DISCOVERED: 'bleDeviceDiscovered',
    
    // Connection events
    DEVICE_CONNECTED: 'bleDeviceConnected',
    DEVICE_DISCONNECTED: 'bleDeviceDisconnected',
    CONNECTION_ERROR: 'bleConnectionError',
    
    // Characteristic events
    CHARACTERISTIC_VALUE_CHANGED: 'bleCharacteristicChanged',
    CHARACTERISTIC_READ: 'bleCharacteristicRead',
    CHARACTERISTIC_WRITE: 'bleCharacteristicWrite',
  };
  
  // Device types
  export const DEVICE_TYPES = {
    HEART_RATE: 'heart_rate',
    POWER: 'power',
    FOOT_POD: 'foot_pod',
    CADENCE: 'cadence',
    UNKNOWN: 'unknown',
  };
  
  // Known device profiles
  export const DEVICE_PROFILES = {
    // Garmin HRM Pro+ profile
    HRM_PRO_PLUS: {
      name: 'HRM Pro+',
      manufacturer: 'Garmin',
      type: DEVICE_TYPES.HEART_RATE,
      services: [
        SERVICE_UUIDS.HEART_RATE,
        SERVICE_UUIDS.DEVICE_INFORMATION,
        SERVICE_UUIDS.BATTERY_SERVICE,
      ],
      characteristics: {
        heartRate: CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT,
        location: CHARACTERISTIC_UUIDS.BODY_SENSOR_LOCATION,
        battery: CHARACTERISTIC_UUIDS.BATTERY_LEVEL,
      },
      namePattern: /HRM.*Pro/i,
    },
    
    // Stryd power meter profile
    STRYD: {
      name: 'Stryd',
      manufacturer: 'Stryd',
      type: DEVICE_TYPES.POWER,
      services: [
        SERVICE_UUIDS.CYCLING_POWER, // Stryd uses the cycling power service
        SERVICE_UUIDS.RUNNING_SPEED_CADENCE,
        SERVICE_UUIDS.DEVICE_INFORMATION,
        SERVICE_UUIDS.STRYD_SERVICE, // Custom service
      ],
      characteristics: {
        power: CHARACTERISTIC_UUIDS.CYCLING_POWER_MEASUREMENT,
        cadence: CHARACTERISTIC_UUIDS.RSC_MEASUREMENT,
        strydMetrics: CHARACTERISTIC_UUIDS.STRYD_METRICS,
      },
      namePattern: /Stryd/i,
    },
    
    // Generic heart rate monitor profile
    GENERIC_HRM: {
      name: 'Heart Rate Monitor',
      type: DEVICE_TYPES.HEART_RATE,
      services: [
        SERVICE_UUIDS.HEART_RATE,
      ],
      characteristics: {
        heartRate: CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT,
      },
    },
    
    // Generic foot pod profile
    GENERIC_FOOT_POD: {
      name: 'Foot Pod',
      type: DEVICE_TYPES.FOOT_POD,
      services: [
        SERVICE_UUIDS.RUNNING_SPEED_CADENCE,
      ],
      characteristics: {
        speedCadence: CHARACTERISTIC_UUIDS.RSC_MEASUREMENT,
      },
    },
  };
  
  // Default scanning options
  export const SCAN_OPTIONS = {
    // Service UUIDs to filter by (empty array = scan for all devices)
    serviceUUIDs: [],
    
    // Whether to allow duplicate readings (generally set to false to save battery)
    allowDuplicates: false,
    
    // Scan duration in milliseconds
    duration: 10000,
    
    // Android scan mode: 'lowPower', 'balanced', 'lowLatency'
    scanMode: 'balanced',
    
    // Optional filters
    filters: {
      // Filter by RSSI signal strength (-100 to 0, higher is stronger)
      rssi: -80,
    },
  };
  
  // Error codes
  export const ERROR_CODES = {
    BLE_NOT_SUPPORTED: 'BLE_NOT_SUPPORTED',
    BLE_NOT_ENABLED: 'BLE_NOT_ENABLED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    SCAN_FAILED: 'SCAN_FAILED',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
    SERVICE_DISCOVERY_FAILED: 'SERVICE_DISCOVERY_FAILED',
    DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
    CHARACTERISTIC_READ_FAILED: 'CHARACTERISTIC_READ_FAILED',
    CHARACTERISTIC_WRITE_FAILED: 'CHARACTERISTIC_WRITE_FAILED',
    CHARACTERISTIC_NOTIFY_FAILED: 'CHARACTERISTIC_NOTIFY_FAILED',
  };
  
  // Export all constants together for convenience
  export default {
    SERVICE_UUIDS,
    CHARACTERISTIC_UUIDS,
    BLE_EVENTS,
    DEVICE_TYPES,
    DEVICE_PROFILES,
    SCAN_OPTIONS,
    ERROR_CODES,
  };