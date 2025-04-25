/**
 * SQL schema for sensor_data table
 */

// Sensor Data Table
export const CREATE_SENSOR_DATA_TABLE = `
CREATE TABLE IF NOT EXISTS sensor_data (
  id TEXT PRIMARY KEY,
  activity_id TEXT,
  timestamp INTEGER,
  device_id TEXT,
  data_type TEXT,
  value REAL,
  FOREIGN KEY (activity_id) REFERENCES activities (id)
  ON DELETE CASCADE
);`;

// Indexes
export const CREATE_INDEX_SENSOR_DATA_ACTIVITY_ID = `
CREATE INDEX IF NOT EXISTS idx_sensor_data_activity_id ON sensor_data (activity_id);`;

export const CREATE_INDEX_SENSOR_DATA_TIMESTAMP = `
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data (timestamp);`;

export const CREATE_INDEX_SENSOR_DATA_DEVICE_ID = `
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data (device_id);`;

/**
 * Sensor data types enum
 */
export const SENSOR_DATA_TYPES = {
  HEART_RATE: 'heart_rate',
  POWER: 'power',
  CADENCE: 'cadence',
  PACE: 'pace',
  SPEED: 'speed',
  GROUND_CONTACT_TIME: 'ground_contact_time',
  VERTICAL_OSCILLATION: 'vertical_oscillation',
  STRIDE_LENGTH: 'stride_length',
  VERTICAL_RATIO: 'vertical_ratio',
  LEG_SPRING_STIFFNESS: 'leg_spring_stiffness',
  FORM_POWER: 'form_power',
  AIR_POWER: 'air_power'
};

/**
 * Default sensor data object structure
 */
export const DEFAULT_SENSOR_DATA = {
  id: null,
  activity_id: null,
  timestamp: null,
  device_id: null,
  data_type: null,
  value: 0
};

/**
 * Validates a sensor data object
 * @param {Object} sensorData - Sensor data object to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
export const validateSensorData = (sensorData) => {
  if (!sensorData) return false;
  
  // Required fields
  if (!sensorData.id) return false;
  if (!sensorData.activity_id) return false;
  if (!sensorData.timestamp) return false;
  if (!sensorData.device_id) return false;
  if (!sensorData.data_type) return false;
  
  // Type validation
  if (typeof sensorData.value !== 'number') return false;
  
  // Check if data_type is valid
  const validTypes = Object.values(SENSOR_DATA_TYPES);
  if (!validTypes.includes(sensorData.data_type)) return false;
  
  return true;
};

/**
 * Converts a row from the database to a sensor data object
 * @param {Object} row - Database row
 * @returns {Object} - Sensor data object
 */
export const rowToSensorData = (row) => {
  if (!row) return null;
  
  return {
    id: row.id,
    activity_id: row.activity_id,
    timestamp: row.timestamp,
    device_id: row.device_id,
    data_type: row.data_type,
    value: row.value
  };
};

/**
 * Batch structure for efficient insertion of multiple sensor data points
 * @param {Array} sensorDataPoints - Array of sensor data objects
 * @returns {Object} - Batch structure for database insertion
 */
export const createSensorDataBatch = (sensorDataPoints) => {
  const values = [];
  const placeholders = [];
  
  sensorDataPoints.forEach(point => {
    values.push(
      point.id,
      point.activity_id,
      point.timestamp,
      point.device_id,
      point.data_type,
      point.value
    );
    
    placeholders.push('(?, ?, ?, ?, ?, ?)');
  });
  
  return {
    sql: `INSERT INTO sensor_data (id, activity_id, timestamp, device_id, data_type, value) 
          VALUES ${placeholders.join(', ')}`,
    values
  };
};

/**
 * Data type groups for related metrics
 */
export const DATA_TYPE_GROUPS = {
  BASIC: [
    SENSOR_DATA_TYPES.HEART_RATE,
    SENSOR_DATA_TYPES.POWER,
    SENSOR_DATA_TYPES.CADENCE,
    SENSOR_DATA_TYPES.PACE,
    SENSOR_DATA_TYPES.SPEED
  ],
  RUNNING_FORM: [
    SENSOR_DATA_TYPES.GROUND_CONTACT_TIME,
    SENSOR_DATA_TYPES.VERTICAL_OSCILLATION,
    SENSOR_DATA_TYPES.STRIDE_LENGTH,
    SENSOR_DATA_TYPES.VERTICAL_RATIO
  ],
  POWER_METRICS: [
    SENSOR_DATA_TYPES.POWER,
    SENSOR_DATA_TYPES.FORM_POWER,
    SENSOR_DATA_TYPES.AIR_POWER,
    SENSOR_DATA_TYPES.LEG_SPRING_STIFFNESS
  ]
};