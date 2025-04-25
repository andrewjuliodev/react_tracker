/**
 * SQL schema for activities table and related tables
 */

// Activities Table
export const CREATE_ACTIVITIES_TABLE = `
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  start_time INTEGER,
  end_time INTEGER,
  duration INTEGER,
  distance REAL,
  avg_heart_rate REAL,
  avg_power REAL,
  avg_pace REAL,
  elevation_gain REAL,
  tss REAL,
  device_ids TEXT,
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER
);`;

// Locations Table
export const CREATE_LOCATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  activity_id TEXT,
  timestamp INTEGER,
  latitude REAL,
  longitude REAL,
  altitude REAL,
  accuracy REAL,
  FOREIGN KEY (activity_id) REFERENCES activities (id)
  ON DELETE CASCADE
);`;

// Devices Table
export const CREATE_DEVICES_TABLE = `
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  type TEXT,
  last_connected INTEGER,
  is_paired INTEGER,
  services TEXT,
  created_at INTEGER,
  updated_at INTEGER
);`;

// Indexes
export const CREATE_INDEX_LOCATIONS_ACTIVITY_ID = `
CREATE INDEX IF NOT EXISTS idx_locations_activity_id ON locations (activity_id);`;

export const CREATE_INDEX_LOCATIONS_TIMESTAMP = `
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations (timestamp);`;

export const CREATE_INDEX_ACTIVITIES_START_TIME = `
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities (start_time);`;

/**
 * Default activity object structure
 */
export const DEFAULT_ACTIVITY = {
  id: null,
  name: '',
  type: 'RUN',
  start_time: null,
  end_time: null,
  duration: 0,
  distance: 0,
  avg_heart_rate: 0,
  avg_power: 0,
  avg_pace: 0,
  elevation_gain: 0,
  tss: 0,
  device_ids: '',
  notes: '',
  created_at: null,
  updated_at: null
};

/**
 * Validates an activity object
 * @param {Object} activity - Activity object to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
export const validateActivity = (activity) => {
  if (!activity) return false;
  
  // Required fields
  if (!activity.id) return false;
  if (!activity.start_time) return false;
  
  // Type validation
  if (typeof activity.distance !== 'number') return false;
  if (typeof activity.duration !== 'number') return false;
  
  // Range validation for numeric fields
  if (activity.avg_heart_rate < 0) return false;
  if (activity.avg_power < 0) return false;
  if (activity.distance < 0) return false;
  
  return true;
};

/**
 * Converts a row from the database to an activity object
 * @param {Object} row - Database row
 * @returns {Object} - Activity object
 */
export const rowToActivity = (row) => {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    start_time: row.start_time,
    end_time: row.end_time,
    duration: row.duration,
    distance: row.distance,
    avg_heart_rate: row.avg_heart_rate,
    avg_power: row.avg_power,
    avg_pace: row.avg_pace,
    elevation_gain: row.elevation_gain,
    tss: row.tss,
    device_ids: row.device_ids ? row.device_ids.split(',') : [],
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

/**
 * Converts an activity object to database parameters
 * @param {Object} activity - Activity object
 * @returns {Object} - Database parameters
 */
export const activityToParams = (activity) => {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    start_time: activity.start_time,
    end_time: activity.end_time,
    duration: activity.duration,
    distance: activity.distance,
    avg_heart_rate: activity.avg_heart_rate,
    avg_power: activity.avg_power,
    avg_pace: activity.avg_pace,
    elevation_gain: activity.elevation_gain,
    tss: activity.tss,
    device_ids: Array.isArray(activity.device_ids) ? activity.device_ids.join(',') : activity.device_ids,
    notes: activity.notes,
    created_at: activity.created_at || Date.now(),
    updated_at: activity.updated_at || Date.now()
  };
};