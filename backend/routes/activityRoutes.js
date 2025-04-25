import express from 'express';
import * as activityController from '../controllers/activityController';
import * as validationMiddleware from '../middleware/validation';
import * as authMiddleware from '../middleware/auth';

/**
 * Express router defining activity-related API endpoints.
 * Provides route path definitions, controller method mapping,
 * request validation, and authentication middleware attachment.
 */
const router = express.Router();

// Base path for activity routes
const BASE_PATH = '';

/**
 * @route   GET /api/v1/activities
 * @desc    Get all activities with optional filtering
 * @access  Private
 */
router.get(
  BASE_PATH,
  authMiddleware.authenticate,
  validationMiddleware.validateQueryParams(['startDate', 'endDate', 'type', 'limit', 'offset']),
  activityController.getActivities
);

/**
 * @route   GET /api/v1/activities/:id
 * @desc    Get activity by ID
 * @access  Private
 */
router.get(
  `${BASE_PATH}/:id`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  activityController.getActivityById
);

/**
 * @route   POST /api/v1/activities
 * @desc    Create a new activity
 * @access  Private
 */
router.post(
  BASE_PATH,
  authMiddleware.authenticate,
  validationMiddleware.validateActivity,
  activityController.createActivity
);

/**
 * @route   PUT /api/v1/activities/:id
 * @desc    Update an existing activity
 * @access  Private
 */
router.put(
  `${BASE_PATH}/:id`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  validationMiddleware.validateActivityUpdate,
  activityController.updateActivity
);

/**
 * @route   DELETE /api/v1/activities/:id
 * @desc    Delete an activity
 * @access  Private
 */
router.delete(
  `${BASE_PATH}/:id`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  activityController.deleteActivity
);

/**
 * @route   GET /api/v1/activities/:id/sensor-data
 * @desc    Get sensor data for an activity
 * @access  Private
 */
router.get(
  `${BASE_PATH}/:id/sensor-data`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  validationMiddleware.validateQueryParams(['type', 'startTime', 'endTime', 'limit']),
  activityController.getSensorData
);

/**
 * @route   GET /api/v1/activities/:id/route
 * @desc    Get route data for an activity
 * @access  Private
 */
router.get(
  `${BASE_PATH}/:id/route`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  activityController.getActivityRoute
);

/**
 * @route   POST /api/v1/activities/:id/sensor-data
 * @desc    Add sensor data to an activity
 * @access  Private
 */
router.post(
  `${BASE_PATH}/:id/sensor-data`,
  authMiddleware.authenticate,
  validationMiddleware.validateParams(['id']),
  validationMiddleware.validateSensorData,
  activityController.addSensorData
);

/**
 * @route   GET /api/v1/activities/summary
 * @desc    Get activity summary metrics
 * @access  Private
 */
router.get(
  `${BASE_PATH}/summary`,
  authMiddleware.authenticate,
  validationMiddleware.validateQueryParams(['period', 'type']),
  activityController.getActivitySummary
);

export default router;