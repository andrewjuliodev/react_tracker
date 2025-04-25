import Activity from '../models/Activity';
import logger from '../../utils/logger';
import { 
  AppError, 
  NotFoundError, 
  ValidationError, 
  DatabaseError 
} from '../utils/errorTypes';
import { validateActivity } from '../../utils/validation';

// Create logger instance for this module
const serviceLogger = logger.createContextLogger('ActivityService');

/**
 * Service layer for activity business logic.
 * Handles data processing and transformation, business rule implementation,
 * cross-cutting concerns, and error validation and handling.
 */

/**
 * Gets all activities with filtering options
 * @param {Object} filters - Search criteria
 * @param {Object} options - Pagination and sorting
 * @returns {Promise<Array>} Matching activities
 * @throws {AppError} If retrieval fails
 */
export async function getActivities(filters = {}, options = {}) {
  try {
    // Parse date filters if provided
    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate).getTime();
    }
    
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate).getTime();
    }
    
    // Set default options
    const defaultOptions = {
      limit: 20,
      offset: 0,
      sortBy: 'startTime',
      sortOrder: 'desc'
    };
    
    // Merge provided options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options
    };
    
    // Validate sort options
    const validSortFields = ['startTime', 'endTime', 'distance', 'duration', 'type', 'createdAt'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(mergedOptions.sortBy)) {
      mergedOptions.sortBy = defaultOptions.sortBy;
    }
    
    if (!validSortOrders.includes(mergedOptions.sortOrder)) {
      mergedOptions.sortOrder = defaultOptions.sortOrder;
    }
    
    // Get activities from model
    const activities = await Activity.findByFilters(filters, mergedOptions);
    
    // Process activities - remove sensitive data, add derived properties
    return activities.map(activity => {
      // Calculate additional metrics or transform data if needed
      return {
        ...activity,
        // Add computed properties here if needed
      };
    });
  } catch (error) {
    serviceLogger.error('Error getting activities', error);
    throw new AppError('Failed to retrieve activities', { cause: error });
  }
}

/**
 * Gets activity by ID
 * @param {string} id - Activity identifier
 * @returns {Promise<Object>} Activity data
 * @throws {NotFoundError} If activity not found
 */
export async function getActivityById(id) {
  try {
    const activity = await Activity.findById(id);
    
    if (!activity) {
      throw new NotFoundError(`Activity with ID ${id} not found`);
    }
    
    return activity;
  } catch (error) {
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    serviceLogger.error(`Error getting activity by ID: ${id}`, error);
    throw new AppError(`Failed to retrieve activity with ID ${id}`, { cause: error });
  }
}

/**
 * Creates new activity
 * @param {Object} activityData - Activity information
 * @returns {Promise<Object>} Created activity
 * @throws {ValidationError} If data invalid
 */
export async function createActivity(activityData) {
  try {
    // Validate activity data
    const validatedData = validateActivityData(activityData);
    
    // Create timestamp for creation
    validatedData.createdAt = Date.now();
    validatedData.updatedAt = Date.now();
    
    // Create activity in the database
    const activity = await Activity.create(validatedData);
    
    serviceLogger.info('Activity created', { activityId: activity.id });
    return activity;
  } catch (error) {
    // Re-throw ValidationError
    if (error instanceof ValidationError) {
      throw error;
    }
    
    serviceLogger.error('Error creating activity', error);
    throw new AppError('Failed to create activity', { cause: error });
  }
}

/**
 * Updates activity by ID
 * @param {string} id - Activity identifier
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated activity
 * @throws {NotFoundError} If activity not found
 * @throws {ValidationError} If updates invalid
 */
export async function updateActivity(id, updates) {
  try {
    // Check if activity exists
    const existingActivity = await Activity.findById(id);
    
    if (!existingActivity) {
      throw new NotFoundError(`Activity with ID ${id} not found`);
    }
    
    // Validate update fields
    const validatedUpdates = validateActivityUpdates(updates);
    
    // Set updated timestamp
    validatedUpdates.updatedAt = Date.now();
    
    // Update activity in the database
    const updatedActivity = await Activity.update(id, validatedUpdates);
    
    serviceLogger.info('Activity updated', { activityId: id });
    return updatedActivity;
  } catch (error) {
    // Re-throw specific errors
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    serviceLogger.error(`Error updating activity with ID: ${id}`, error);
    throw new AppError(`Failed to update activity with ID ${id}`, { cause: error });
  }
}

/**
 * Deletes activity by ID
 * @param {string} id - Activity identifier
 * @returns {Promise<boolean>} Success state
 * @throws {NotFoundError} If activity not found
 */
export async function deleteActivity(id) {
  try {
    // Check if activity exists
    const existingActivity = await Activity.findById(id);
    
    if (!existingActivity) {
      throw new NotFoundError(`Activity with ID ${id} not found`);
    }
    
    // Delete activity from the database
    const result = await Activity.delete(id);
    
    serviceLogger.info('Activity deleted', { activityId: id });
    return result;
  } catch (error) {
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    serviceLogger.error(`Error deleting activity with ID: ${id}`, error);
    throw new AppError(`Failed to delete activity with ID ${id}`, { cause: error });
  }
}

/**
 * Gets sensor data for activity
 * @param {string} activityId - Activity identifier
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Sensor readings
 * @throws {NotFoundError} If activity not found
 */
export async function getSensorData(activityId, options = {}) {
  try {
    // Check if activity exists
    const existingActivity = await Activity.findById(activityId);
    
    if (!existingActivity) {
      throw new NotFoundError(`Activity with ID ${activityId} not found`);
    }
    
    // Get sensor data from the model
    const sensorData = await Activity.getSensorData(activityId, options);
    
    return sensorData;
  } catch (error) {
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    serviceLogger.error(`Error getting sensor data for activity ID: ${activityId}`, error);
    throw new AppError(`Failed to retrieve sensor data for activity ID ${activityId}`, { cause: error });
  }
}

/**
 * Gets route data for activity
 * @param {string} activityId - Activity identifier
 * @returns {Promise<Array>} Route location data
 * @throws {NotFoundError} If activity not found
 */
export async function getActivityRoute(activityId) {
  try {
    // Check if activity exists
    const existingActivity = await Activity.findById(activityId);
    
    if (!existingActivity) {
      throw new NotFoundError(`Activity with ID ${activityId} not found`);
    }
    
    // Get route data from the model
    const routeData = await Activity.getRouteData(activityId);
    
    return routeData;
  } catch (error) {
    // Re-throw NotFoundError
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    serviceLogger.error(`Error getting route data for activity ID: ${activityId}`, error);
    throw new AppError(`Failed to retrieve route data for activity ID ${activityId}`, { cause: error });
  }
}

/**
 * Adds sensor data to activity
 * @param {string} activityId - Activity identifier
 * @param {Array} sensorData - Sensor readings to add
 * @returns {Promise<Object>} Result with count of added records
 * @throws {NotFoundError} If activity not found
 * @throws {ValidationError} If sensor data invalid
 */
export async function addSensorData(activityId, sensorData) {
  try {
    // Check if activity exists
    const existingActivity = await Activity.findById(activityId);
    
    if (!existingActivity) {
      throw new NotFoundError(`Activity with ID ${activityId} not found`);
    }
    
    // Validate sensor data
    if (!Array.isArray(sensorData)) {
      throw new ValidationError('Sensor data must be an array');
    }
    
    // Validate each sensor data item
    const validatedData = validateSensorData(sensorData, activityId);
    
    // Add sensor data to the database
    const result = await Activity.addSensorData(activityId, validatedData);
    
    serviceLogger.info('Sensor data added', { 
      activityId, 
      recordCount: validatedData.length 
    });
    
    return { count: validatedData.length };
  } catch (error) {
    // Re-throw specific errors
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    serviceLogger.error(`Error adding sensor data for activity ID: ${activityId}`, error);
    throw new AppError(`Failed to add sensor data for activity ID ${activityId}`, { cause: error });
  }
}

/**
 * Gets activity summary metrics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Summary statistics
 */
export async function getActivitySummary(options) {
  try {
    const { period, type, userId } = options;
    
    // Calculate date range based on period
    const dateRange = calculateDateRange(period);
    
    // Build filters
    const filters = {
      userId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };
    
    // Add activity type filter if provided
    if (type) {
      filters.type = type;
    }
    
    // Get activities within the date range
    const activities = await Activity.findByFilters(filters, { 
      limit: 1000,  // High limit to get all activities in range
      sortBy: 'startTime',
      sortOrder: 'asc'
    });
    
    // Calculate summary metrics
    const summary = calculateSummaryMetrics(activities);
    
    return {
      period,
      dateRange,
      type: type || 'all',
      ...summary
    };
  } catch (error) {
    serviceLogger.error('Error getting activity summary', error);
    throw new AppError('Failed to generate activity summary', { cause: error });
  }
}

/**
 * Validates activity data
 * @param {Object} data - Activity data to validate
 * @returns {Object} Validated data
 * @throws {ValidationError} If validation fails
 * @private
 */
function validateActivityData(data) {
  // Required fields
  const requiredFields = ['type', 'startTime', 'userId'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  // Validate activity type
  const validActivityTypes = ['running', 'cycling', 'walking', 'hiking', 'swimming', 'other'];
  if (!validActivityTypes.includes(data.type)) {
    throw new ValidationError(`Invalid activity type: ${data.type}`);
  }
  
  // Validate timestamps
  if (isNaN(Date.parse(new Date(data.startTime)))) {
    throw new ValidationError('Invalid startTime format');
  }
  
  if (data.endTime && isNaN(Date.parse(new Date(data.endTime)))) {
    throw new ValidationError('Invalid endTime format');
  }
  
  // If both start and end times are provided, validate order
  if (data.startTime && data.endTime) {
    const startTime = new Date(data.startTime).getTime();
    const endTime = new Date(data.endTime).getTime();
    
    if (endTime <= startTime) {
      throw new ValidationError('endTime must be after startTime');
    }
  }
  
  // Validate numeric fields
  const numericFields = ['distance', 'duration', 'avgHeartRate', 'avgPower', 'avgPace', 'elevationGain'];
  
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number' || isNaN(data[field])) {
        throw new ValidationError(`Field ${field} must be a number`);
      }
      
      if (data[field] < 0) {
        throw new ValidationError(`Field ${field} cannot be negative`);
      }
    }
  }
  
  // Return validated and sanitized data
  return {
    type: data.type,
    name: data.name || `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Activity`,
    startTime: new Date(data.startTime).getTime(),
    endTime: data.endTime ? new Date(data.endTime).getTime() : null,
    duration: data.duration || null,
    distance: data.distance || null,
    avgHeartRate: data.avgHeartRate || null,
    avgPower: data.avgPower || null,
    avgPace: data.avgPace || null,
    elevationGain: data.elevationGain || null,
    deviceIds: data.deviceIds || null,
    notes: data.notes || null,
    userId: data.userId
  };
}

/**
 * Validates activity update fields
 * @param {Object} updates - Fields to update
 * @returns {Object} Validated updates
 * @throws {ValidationError} If validation fails
 * @private
 */
function validateActivityUpdates(updates) {
  // Create a new object for validated updates
  const validatedUpdates = {};
  
  // Check for any invalid fields
  const allowedFields = [
    'name', 'type', 'startTime', 'endTime', 'duration', 'distance',
    'avgHeartRate', 'avgPower', 'avgPace', 'elevationGain', 'deviceIds', 'notes'
  ];
  
  for (const field in updates) {
    if (!allowedFields.includes(field)) {
      throw new ValidationError(`Invalid update field: ${field}`);
    }
  }
  
  // Validate fields that are present in the updates
  if (updates.type !== undefined) {
    const validActivityTypes = ['running', 'cycling', 'walking', 'hiking', 'swimming', 'other'];
    if (!validActivityTypes.includes(updates.type)) {
      throw new ValidationError(`Invalid activity type: ${updates.type}`);
    }
    validatedUpdates.type = updates.type;
  }
  
  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.trim() === '') {
      throw new ValidationError('Name cannot be empty');
    }
    validatedUpdates.name = updates.name.trim();
  }
  
  if (updates.startTime !== undefined) {
    if (isNaN(Date.parse(new Date(updates.startTime)))) {
      throw new ValidationError('Invalid startTime format');
    }
    validatedUpdates.startTime = new Date(updates.startTime).getTime();
  }
  
  if (updates.endTime !== undefined) {
    if (updates.endTime === null) {
      validatedUpdates.endTime = null;
    } else {
      if (isNaN(Date.parse(new Date(updates.endTime)))) {
        throw new ValidationError('Invalid endTime format');
      }
      validatedUpdates.endTime = new Date(updates.endTime).getTime();
    }
  }
  
  // If both start and end times are being updated, validate order
  if (validatedUpdates.startTime !== undefined && validatedUpdates.endTime !== undefined) {
    if (validatedUpdates.endTime <= validatedUpdates.startTime) {
      throw new ValidationError('endTime must be after startTime');
    }
  }
  
  // Validate numeric fields
  const numericFields = ['distance', 'duration', 'avgHeartRate', 'avgPower', 'avgPace', 'elevationGain'];
  
  for (const field of numericFields) {
    if (updates[field] !== undefined) {
      if (updates[field] === null) {
        validatedUpdates[field] = null;
      } else {
        if (typeof updates[field] !== 'number' || isNaN(updates[field])) {
          throw new ValidationError(`Field ${field} must be a number`);
        }
        
        if (updates[field] < 0) {
          throw new ValidationError(`Field ${field} cannot be negative`);
        }
        
        validatedUpdates[field] = updates[field];
      }
    }
  }
  
  // Handle other fields
  if (updates.notes !== undefined) {
    validatedUpdates.notes = updates.notes;
  }
  
  if (updates.deviceIds !== undefined) {
    if (updates.deviceIds !== null && !Array.isArray(updates.deviceIds)) {
      throw new ValidationError('deviceIds must be an array');
    }
    validatedUpdates.deviceIds = updates.deviceIds;
  }
  
  return validatedUpdates;
}

/**
 * Validates sensor data array
 * @param {Array} data - Sensor readings
 * @param {string} activityId - Activity ID
 * @returns {Array} Validated sensor data
 * @throws {ValidationError} If validation fails
 * @private
 */
function validateSensorData(data, activityId) {
  if (!Array.isArray(data)) {
    throw new ValidationError('Sensor data must be an array');
  }
  
  // Valid sensor data types
  const validDataTypes = [
    'heartRate', 'power', 'cadence', 'pace', 'speed', 
    'elevation', 'temperature', 'groundContactTime', 'verticalOscillation'
  ];
  
  return data.map((item, index) => {
    // Validate required fields
    if (!item.timestamp) {
      throw new ValidationError(`Missing timestamp in sensor data at index ${index}`);
    }
    
    if (!item.dataType) {
      throw new ValidationError(`Missing dataType in sensor data at index ${index}`);
    }
    
    if (item.value === undefined || item.value === null) {
      throw new ValidationError(`Missing value in sensor data at index ${index}`);
    }
    
    // Validate timestamp
    const timestamp = Number(item.timestamp);
    if (isNaN(timestamp)) {
      throw new ValidationError(`Invalid timestamp format at index ${index}`);
    }
    
    // Validate data type
    if (!validDataTypes.includes(item.dataType)) {
      throw new ValidationError(`Invalid dataType at index ${index}: ${item.dataType}`);
    }
    
    // Validate value
    if (typeof item.value !== 'number' || isNaN(item.value)) {
      throw new ValidationError(`Value must be a number at index ${index}`);
    }
    
    // Return validated data
    return {
      activityId,
      timestamp,
      dataType: item.dataType,
      value: item.value,
      deviceId: item.deviceId || null
    };
  });
}

/**
 * Calculates date range based on period
 * @param {string} period - Time period (day, week, month, year, all)
 * @returns {Object} Start and end dates
 * @private
 */
function calculateDateRange(period) {
  const now = new Date();
  let startDate, endDate = now.getTime();
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
      break;
    case 'week':
      // Start from this week's Monday
      const dayOfWeek = now.getDay() || 7; // Adjust Sunday to be 7
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0).getTime();
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0).getTime();
      break;
    case 'all':
    default:
      startDate = 0; // Beginning of time
      break;
  }
  
  return { startDate, endDate };
}

/**
 * Calculates summary metrics from activities
 * @param {Array} activities - List of activities
 * @returns {Object} Summary metrics
 * @private
 */
function calculateSummaryMetrics(activities) {
  if (!activities || activities.length === 0) {
    return {
      totalActivities: 0,
      totalDistance: 0,
      totalDuration: 0,
      avgHeartRate: 0,
      avgPower: 0,
      totalElevationGain: 0,
      activityTypes: {}
    };
  }
  
  // Initialize summary
  const summary = {
    totalActivities: activities.length,
    totalDistance: 0,
    totalDuration: 0,
    avgHeartRate: 0,
    avgPower: 0,
    totalElevationGain: 0,
    activityTypes: {}
  };
  
  // Count activity types
  const activityTypes = {};
  
  // Calculate totals and averages
  let heartRateSum = 0;
  let heartRateCount = 0;
  let powerSum = 0;
  let powerCount = 0;
  
  activities.forEach(activity => {
    // Count activity types
    const type = activity.type || 'unknown';
    activityTypes[type] = (activityTypes[type] || 0) + 1;
    
    // Sum up metrics
    summary.totalDistance += activity.distance || 0;
    summary.totalDuration += activity.duration || 0;
    summary.totalElevationGain += activity.elevationGain || 0;
    
    // Calculate weighted averages for heart rate and power
    if (activity.avgHeartRate) {
      heartRateSum += activity.avgHeartRate * (activity.duration || 1);
      heartRateCount += (activity.duration || 1);
    }
    
    if (activity.avgPower) {
      powerSum += activity.avgPower * (activity.duration || 1);
      powerCount += (activity.duration || 1);
    }
  });
  
  // Calculate averages
  summary.avgHeartRate = heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : 0;
  summary.avgPower = powerCount > 0 ? Math.round(powerSum / powerCount) : 0;
  summary.activityTypes = activityTypes;
  
  return summary;
}

export default {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getSensorData,
  getActivityRoute,
  addSensorData,
  getActivitySummary
};