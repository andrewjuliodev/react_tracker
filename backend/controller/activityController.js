import activityService from '../services/activityService';
import { formatResponse } from '../utils/responseFormatter';
import { AppError, NotFoundError, ValidationError } from '../utils/errorTypes';
import logger from '../../utils/logger';

// Create logger instance for this module
const controllerLogger = logger.createContextLogger('ActivityController');

/**
 * Controller for handling activity API requests.
 * Handles request processing, input validation,
 * response formatting, and error handling.
 */

/**
 * Gets all activities with optional filtering
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function getActivities(req, res, next) {
  try {
    // Extract filter parameters from query
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      type: req.query.type
    };
    
    // Extract pagination and sorting options
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      sortBy: req.query.sortBy || 'startTime',
      sortOrder: req.query.sortOrder || 'desc'
    };
    
    const activities = await activityService.getActivities(filters, options);
    
    return formatResponse(res, 200, {
      activities,
      count: activities.length,
      filters,
      options
    });
  } catch (error) {
    controllerLogger.error('Error getting activities', error);
    next(error);
  }
}

/**
 * Gets activity by ID
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function getActivityById(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await activityService.getActivityById(id);
    
    return formatResponse(res, 200, { activity });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    controllerLogger.error('Error getting activity by ID', error);
    next(error);
  }
}

/**
 * Creates new activity
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function createActivity(req, res, next) {
  try {
    const activityData = req.body;
    
    // Add user ID from authenticated request
    activityData.userId = req.user.id;
    
    const activity = await activityService.createActivity(activityData);
    
    return formatResponse(res, 201, { 
      activity,
      message: 'Activity created successfully' 
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return formatResponse(res, 400, { 
        error: error.message,
        validationErrors: error.details
      });
    }
    
    controllerLogger.error('Error creating activity', error);
    next(error);
  }
}

/**
 * Updates existing activity
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function updateActivity(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate user can update this activity
    const existingActivity = await activityService.getActivityById(id);
    
    if (existingActivity.userId !== req.user.id) {
      return formatResponse(res, 403, { 
        error: 'You do not have permission to update this activity' 
      });
    }
    
    const updatedActivity = await activityService.updateActivity(id, updates);
    
    return formatResponse(res, 200, { 
      activity: updatedActivity,
      message: 'Activity updated successfully' 
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    if (error instanceof ValidationError) {
      return formatResponse(res, 400, { 
        error: error.message,
        validationErrors: error.details
      });
    }
    
    controllerLogger.error('Error updating activity', error);
    next(error);
  }
}

/**
 * Deletes activity by ID
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function deleteActivity(req, res, next) {
  try {
    const { id } = req.params;
    
    // Validate user can delete this activity
    const existingActivity = await activityService.getActivityById(id);
    
    if (existingActivity.userId !== req.user.id) {
      return formatResponse(res, 403, { 
        error: 'You do not have permission to delete this activity' 
      });
    }
    
    await activityService.deleteActivity(id);
    
    return formatResponse(res, 200, { 
      message: 'Activity deleted successfully' 
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    controllerLogger.error('Error deleting activity', error);
    next(error);
  }
}

/**
 * Gets sensor data for activity
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function getSensorData(req, res, next) {
  try {
    const { id } = req.params;
    
    // Extract filter options
    const options = {
      type: req.query.type,
      startTime: req.query.startTime ? parseInt(req.query.startTime) : undefined,
      endTime: req.query.endTime ? parseInt(req.query.endTime) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    // Validate user can access this activity
    const existingActivity = await activityService.getActivityById(id);
    
    if (existingActivity.userId !== req.user.id) {
      return formatResponse(res, 403, { 
        error: 'You do not have permission to access this activity data' 
      });
    }
    
    const sensorData = await activityService.getSensorData(id, options);
    
    return formatResponse(res, 200, { sensorData });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    controllerLogger.error('Error getting sensor data', error);
    next(error);
  }
}

/**
 * Gets route data for activity
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function getActivityRoute(req, res, next) {
  try {
    const { id } = req.params;
    
    // Validate user can access this activity
    const existingActivity = await activityService.getActivityById(id);
    
    if (existingActivity.userId !== req.user.id) {
      return formatResponse(res, 403, { 
        error: 'You do not have permission to access this activity data' 
      });
    }
    
    const routeData = await activityService.getActivityRoute(id);
    
    return formatResponse(res, 200, { routeData });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    controllerLogger.error('Error getting activity route', error);
    next(error);
  }
}

/**
 * Adds sensor data to an activity
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function addSensorData(req, res, next) {
  try {
    const { id } = req.params;
    const sensorData = req.body.data;
    
    // Validate user can update this activity
    const existingActivity = await activityService.getActivityById(id);
    
    if (existingActivity.userId !== req.user.id) {
      return formatResponse(res, 403, { 
        error: 'You do not have permission to update this activity' 
      });
    }
    
    const result = await activityService.addSensorData(id, sensorData);
    
    return formatResponse(res, 200, { 
      recordsAdded: result.count,
      message: 'Sensor data added successfully' 
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return formatResponse(res, 404, { error: error.message });
    }
    
    if (error instanceof ValidationError) {
      return formatResponse(res, 400, { 
        error: error.message,
        validationErrors: error.details
      });
    }
    
    controllerLogger.error('Error adding sensor data', error);
    next(error);
  }
}

/**
 * Gets activity summary metrics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {Promise<void>} Resolves with response
 */
export async function getActivitySummary(req, res, next) {
  try {
    // Extract parameters from query
    const options = {
      period: req.query.period || 'week', // week, month, year, all
      type: req.query.type, // optional activity type filter
      userId: req.user.id // from authenticated request
    };
    
    const summary = await activityService.getActivitySummary(options);
    
    return formatResponse(res, 200, { summary });
  } catch (error) {
    controllerLogger.error('Error getting activity summary', error);
    next(error);
  }
}