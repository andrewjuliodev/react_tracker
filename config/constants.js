// Import environment variables if needed
// import { EXPO_DEBUG_MODE, NODE_ENV } from '@env';

// Determine current environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Application constants
export const CONSTANTS = {
  // App information
  APP_NAME: 'RaceTracker',
  APP_VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  
  // Environment settings
  DEBUG_MODE: isDevelopment || process.env.EXPO_DEBUG_MODE === 'true',
  APP_ENV: process.env.APP_ENV || 'dev',
  
  // Feature flags
  FEATURES: {
    ENABLE_CLOUD_SYNC: false,
    ENABLE_SOCIAL_SHARING: false,
    ENABLE_ADVANCED_METRICS: true,
  },
};

// API configuration
export const API = {
  BASE_URL: process.env.API_URL || 'http://localhost:3000',
  VERSION: 'v1',
  TIMEOUT_MS: parseInt(process.env.API_TIMEOUT, 10) || 5000,
  RETRY_ATTEMPTS: 3,
  ENDPOINTS: {
    ACTIVITIES: '/activities',
    DEVICES: '/devices',
    SETTINGS: '/settings',
  },
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@RaceTracker:authToken',
  USER_SETTINGS: '@RaceTracker:userSettings',
  NAVIGATION_STATE: '@RaceTracker:navigationState',
  PAIRED_DEVICES: '@RaceTracker:pairedDevices',
  FIRST_LAUNCH: '@RaceTracker:firstLaunch',
  STORAGE_VERSION: '@RaceTracker:storageVersion',
};

// Timeout and interval values
export const TIMEOUT_MS = {
  BLE_SCAN: 10000,
  BLE_CONNECTION: 10000,
  API_REQUEST: 5000,
  LOCATION_UPDATE: 1000,
  SENSOR_UPDATE: 500,
  ACTIVITY_AUTO_PAUSE: 10000,
  DATA_REFRESH: parseInt(process.env.DATA_REFRESH_INTERVAL, 10) || 30000,
};

// Permission types required by the app
export const PERMISSIONS = {
  LOCATION: {
    name: 'location',
    rationale: 'Location permission is needed to track your running route and provide accurate distance measurements.',
  },
  BLUETOOTH: {
    name: 'bluetooth',
    rationale: 'Bluetooth permission is needed to connect to your heart rate monitor and other fitness devices.',
  },
  BACKGROUND_LOCATION: {
    name: 'background-location',
    rationale: 'Background location permission is needed to continue tracking your run when the app is not in the foreground.',
  },
  SENSORS: {
    name: 'sensors',
    rationale: 'Sensor access is needed to measure your movement during activities.',
  },
};

// Activity types
export const ACTIVITY_TYPES = {
  RUN: 'run',
  TRAIL_RUN: 'trail_run',
  TREADMILL: 'treadmill',
  RACE: 'race',
  INTERVAL: 'interval',
  OTHER: 'other',
};

// Activity states
export const ACTIVITY_STATES = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

// Sensor data types
export const SENSOR_TYPES = {
  HEART_RATE: 'heart_rate',
  POWER: 'power',
  CADENCE: 'cadence',
  STRIDE_LENGTH: 'stride_length',
  GROUND_CONTACT_TIME: 'ground_contact_time',
  VERTICAL_OSCILLATION: 'vertical_oscillation',
  LOCATION: 'location',
  SPEED: 'speed',
  DISTANCE: 'distance',
  ELEVATION: 'elevation',
  PACE: 'pace',
};

// Units of measurement
export const UNITS = {
  DISTANCE: {
    METRIC: 'km',
    IMPERIAL: 'mi',
  },
  SPEED: {
    METRIC: 'km/h',
    IMPERIAL: 'mph',
  },
  PACE: {
    METRIC: 'min/km',
    IMPERIAL: 'min/mi',
  },
  ELEVATION: {
    METRIC: 'm',
    IMPERIAL: 'ft',
  },
  HEART_RATE: 'bpm',
  POWER: 'watts',
  CADENCE: 'spm',
  STRIDE_LENGTH: 'cm',
  GROUND_CONTACT_TIME: 'ms',
  VERTICAL_OSCILLATION: 'cm',
};

// Default pagination settings
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// Exported constants object for import simplicity
export default {
  CONSTANTS,
  API,
  STORAGE_KEYS,
  TIMEOUT_MS,
  PERMISSIONS,
  ACTIVITY_TYPES,
  ACTIVITY_STATES,
  SENSOR_TYPES,
  UNITS,
  PAGINATION,
};