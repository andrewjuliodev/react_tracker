import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Import activity modules
import ActivityRecorder from './activityRecorder';
import ActivityMetrics from './activityMetrics';

// Import sensor manager
import sensorManager from '../sensors/sensorManager';

// Import database repository
import activityRepository from '../../database/repositories/activityRepository';

// Import utilities and constants
import logger from '../../utils/logger';
import { ACTIVITY_TYPES, ACTIVITY_STATES } from '../../config/constants';

// Activity events
export const ACTIVITY_EVENTS = {
  STATE_CHANGE: 'activityStateChange',
  STARTED: 'activityStarted',
  PAUSED: 'activityPaused',
  RESUMED: 'activityResumed',
  STOPPED: 'activityStopped',
  LAP: 'activityLap',
  METRICS_UPDATED: 'metricsUpdated',
  AUTO_PAUSE: 'activityAutoPaused',
  AUTO_RESUME: 'activityAutoResumed',
  ERROR: 'activityError',
};

// Auto-pause threshold in milliseconds
const AUTO_PAUSE_THRESHOLD_MS = parseInt(process.env.AUTO_PAUSE_THRESHOLD_MS, 10) || 10000;
// Timer update frequency in milliseconds
const TIME_RESOLUTION_MS = parseInt(process.env.TIME_RESOLUTION_MS, 10) || 1000;

/**
 * Core service for managing running activity lifecycle and coordination
 */
class ActivityManager extends EventEmitter {
  constructor() {
    super();
    
    // Activity state
    this.activityState = ACTIVITY_STATES.IDLE;
    this.currentActivity = null;
    
    // Timing
    this.startTime = 0;
    this.pauseTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.lastMotionTime = 0;
    this.autoPauseTimer = null;
    
    // Activity recording
    this.recorder = new ActivityRecorder();
    this.metrics = new ActivityMetrics();
    
    // Settings
    this.enableAutoPause = true;
  }
  
  /**
   * Initializes the activity manager
   * @returns {Promise<boolean>} Success state
   */
  async initialize() {
    try {
      logger.info('Initializing activity manager');
      
      // Initialize recorder
      await this.recorder.initialize();
      
      // Load settings (auto-pause, etc.)
      this._loadSettings();
      
      logger.info('Activity manager initialized');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize activity manager', error);
      throw error;
    }
  }
  
  /**
   * Starts a new activity session
   * @param {Object} options - Activity configuration
   * @returns {Promise<Object>} Created activity session
   * @throws {Error} If starting fails
   */
  async startActivity(options = {}) {
    try {
      // If paused, resume instead
      if (this.activityState === ACTIVITY_STATES.PAUSED) {
        return this.resumeActivity();
      }
      
      // If already active, return current activity
      if (this.activityState === ACTIVITY_STATES.ACTIVE) {
        return this.currentActivity;
      }
      
      logger.info('Starting new activity');
      
      // Create new activity
      const activityId = uuidv4();
      const timestamp = Date.now();
      
      // Default activity options
      const defaultOptions = {
        type: ACTIVITY_TYPES.RUN,
        name: `Run - ${new Date(timestamp).toLocaleString()}`,
        autoLap: true,
      };
      
      // Merge default options with provided options
      const activityOptions = {
        ...defaultOptions,
        ...options,
      };
      
      // Initialize activity data
      this.currentActivity = {
        id: activityId,
        type: activityOptions.type,
        name: activityOptions.name,
        startTime: timestamp,
        endTime: null,
        duration: 0,
        distance: 0,
        laps: [],
        autoLap: activityOptions.autoLap,
        metrics: {},
      };
      
      // Reset timing
      this.startTime = timestamp;
      this.pauseTime = 0;
      this.elapsedTime = 0;
      this.lastMotionTime = timestamp;
      
      // Initialize metrics tracking
      await this.metrics.initialize(activityId);
      
      // Initialize recording
      await this.recorder.initialize(activityId);
      
      // Start sensor data collection
      await sensorManager.startCollection();
      
      // Start recording
      await this.recorder.start();
      
      // Start timer
      this._startTimer();
      
      // Start auto-pause detection if enabled
      if (this.enableAutoPause) {
        this._startAutoPauseDetection();
      }
      
      // Update activity state
      this._setActivityState(ACTIVITY_STATES.ACTIVE);
      
      // Emit started event
      this.emit(ACTIVITY_EVENTS.STARTED, this.currentActivity);
      
      logger.info('Activity started', { activityId });
      
      return this.currentActivity;
    } catch (error) {
      logger.error('Failed to start activity', error);
      
      // Clean up if start failed
      this._cleanupActivity().catch(cleanupError => {
        logger.error('Error during cleanup after failed start', cleanupError);
      });
      
      throw error;
    }
  }
  
  /**
   * Pauses the current activity
   * @returns {Promise<boolean>} Success state
   * @throws {Error} If no active activity
   */
  async pauseActivity() {
    try {
      // Check if there's an active activity
      if (this.activityState !== ACTIVITY_STATES.ACTIVE) {
        throw new Error('No active activity to pause');
      }
      
      logger.info('Pausing activity', { activityId: this.currentActivity.id });
      
      // Record pause time
      this.pauseTime = Date.now();
      
      // Stop timer
      this._stopTimer();
      
      // Stop auto-pause detection
      this._stopAutoPauseDetection();
      
      // Pause recording
      await this.recorder.pause();
      
      // Update activity state
      this._setActivityState(ACTIVITY_STATES.PAUSED);
      
      // Emit paused event
      this.emit(ACTIVITY_EVENTS.PAUSED, this.currentActivity);
      
      return true;
    } catch (error) {
      logger.error('Failed to pause activity', error);
      throw error;
    }
  }
  
  /**
   * Resumes a paused activity
   * @returns {Promise<boolean>} Success state
   * @throws {Error} If activity not in paused state
   */
  async resumeActivity() {
    try {
      // Check if there's a paused activity
      if (this.activityState !== ACTIVITY_STATES.PAUSED) {
        throw new Error('No paused activity to resume');
      }
      
      logger.info('Resuming activity', { activityId: this.currentActivity.id });
      
      // Update start time to account for pause duration
      const pauseDuration = Date.now() - this.pauseTime;
      this.startTime += pauseDuration;
      this.pauseTime = 0;
      this.lastMotionTime = Date.now();
      
      // Resume recording
      await this.recorder.resume();
      
      // Restart timer
      this._startTimer();
      
      // Restart auto-pause detection if enabled
      if (this.enableAutoPause) {
        this._startAutoPauseDetection();
      }
      
      // Update activity state
      this._setActivityState(ACTIVITY_STATES.ACTIVE);
      
      // Emit resumed event
      this.emit(ACTIVITY_EVENTS.RESUMED, this.currentActivity);
      
      return true;
    } catch (error) {
      logger.error('Failed to resume activity', error);
      throw error;
    }
  }
  
  /**
   * Stops and completes the current activity
   * @returns {Promise<Object>} Completed activity data
   * @throws {Error} If stopping fails
   */
  async stopActivity() {
    try {
      // Check if there's an activity to stop
      if (this.activityState !== ACTIVITY_STATES.ACTIVE && 
          this.activityState !== ACTIVITY_STATES.PAUSED) {
        throw new Error('No activity to stop');
      }
      
      logger.info('Stopping activity', { activityId: this.currentActivity.id });
      
      // Update end time and duration
      this.currentActivity.endTime = Date.now();
      this.currentActivity.duration = this.elapsedTime;
      
      // Stop timer
      this._stopTimer();
      
      // Stop auto-pause detection
      this._stopAutoPauseDetection();
      
      // Stop recording
      await this.recorder.stop();
      
      // Finalize metrics
      const finalMetrics = await this.metrics.finalize();
      this.currentActivity.metrics = finalMetrics;
      
      // Update activity with final metrics
      this.currentActivity.distance = finalMetrics.distance || 0;
      this.currentActivity.avgHeartRate = finalMetrics.avgHeartRate || 0;
      this.currentActivity.avgPower = finalMetrics.avgPower || 0;
      this.currentActivity.avgCadence = finalMetrics.avgCadence || 0;
      this.currentActivity.elevationGain = finalMetrics.elevationGain || 0;
      
      // Stop sensor data collection if no other consumer
      await sensorManager.stopCollection();
      
      // Complete activity
      const completedActivity = { ...this.currentActivity };
      
      // Update activity state
      this._setActivityState(ACTIVITY_STATES.IDLE);
      
      // Emit stopped event
      this.emit(ACTIVITY_EVENTS.STOPPED, completedActivity);
      
      // Reset current activity
      this.currentActivity = null;
      
      logger.info('Activity stopped', { 
        activityId: completedActivity.id,
        duration: completedActivity.duration,
        distance: completedActivity.distance
      });
      
      return completedActivity;
    } catch (error) {
      logger.error('Failed to stop activity', error);
      throw error;
    }
  }
  
  /**
   * Adds a lap marker to the current activity
   * @param {Object} options - Lap options (name, notes, etc.)
   * @returns {Object} Lap data
   * @throws {Error} If no active activity
   */
  async addLap(options = {}) {
    try {
      // Check if there's an active activity
      if (this.activityState !== ACTIVITY_STATES.ACTIVE && 
          this.activityState !== ACTIVITY_STATES.PAUSED) {
        throw new Error('No active activity to add lap');
      }
      
      // Get current metrics
      const metrics = await this.metrics.getMetrics();
      
      // Create lap data
      const lap = {
        id: uuidv4(),
        timestamp: Date.now(),
        duration: this.activityState === ACTIVITY_STATES.ACTIVE ? 
          (Date.now() - this.startTime) : this.elapsedTime,
        distance: metrics.distance || 0,
        ...options,
      };
      
      // Add to laps array
      this.currentActivity.laps.push(lap);
      
      // Emit lap event
      this.emit(ACTIVITY_EVENTS.LAP, lap);
      
      logger.info('Lap added to activity', { 
        activityId: this.currentActivity.id,
        lapId: lap.id
      });
      
      return lap;
    } catch (error) {
      logger.error('Failed to add lap', error);
      throw error;
    }
  }
  
  /**
   * Gets the current activity state
   * @returns {Object} Activity state and data
   */
  getActivityState() {
    return {
      state: this.activityState,
      activity: this.currentActivity,
      elapsedTime: this.elapsedTime,
    };
  }
  
  /**
   * Updates elapsed time for the activity
   * @returns {number} Updated elapsed time in seconds
   */
  updateElapsedTime() {
    if (this.activityState === ACTIVITY_STATES.ACTIVE) {
      // Calculate elapsed time based on start time and current time
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    return this.elapsedTime;
  }
  
  /**
   * Subscribes to activity state changes
   * @param {Function} listener - State change callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToStateChanges(listener) {
    this.on(ACTIVITY_EVENTS.STATE_CHANGE, listener);
    
    return () => {
      this.removeListener(ACTIVITY_EVENTS.STATE_CHANGE, listener);
    };
  }
  
  /**
   * Subscribes to activity metrics updates
   * @param {Function} listener - Metrics update callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToMetricsUpdates(listener) {
    this.on(ACTIVITY_EVENTS.METRICS_UPDATED, listener);
    
    return () => {
      this.removeListener(ACTIVITY_EVENTS.METRICS_UPDATED, listener);
    };
  }
  
  /**
   * Starts the elapsed time timer
   * @private
   */
  _startTimer() {
    // Clear any existing timer
    this._stopTimer();
    
    // Start new timer
    this.timerInterval = setInterval(() => {
      this.updateElapsedTime();
      this._updateActivityMetrics();
    }, TIME_RESOLUTION_MS);
  }
  
  /**
   * Stops the elapsed time timer
   * @private
   */
  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  /**
   * Updates activity metrics by querying metrics service
   * @private
   */
  async _updateActivityMetrics() {
    try {
      if (!this.currentActivity || this.activityState !== ACTIVITY_STATES.ACTIVE) {
        return;
      }
      
      // Update metrics
      const metrics = await this.metrics.updateMetrics();
      
      // Update activity data with latest metrics
      this.currentActivity.metrics = metrics;
      this.currentActivity.distance = metrics.distance || 0;
      
      // Auto-lap based on distance if enabled
      if (this.currentActivity.autoLap && metrics.distance) {
        this._checkAutoLap(metrics.distance);
      }
      
      // Update last motion time if moving
      if (metrics.isMoving) {
        this.lastMotionTime = Date.now();
      }
      
      // Emit metrics updated event
      this.emit(ACTIVITY_EVENTS.METRICS_UPDATED, metrics);
    } catch (error) {
      logger.error('Error updating activity metrics', error);
    }
  }
  
  /**
   * Checks if auto-lap should be triggered based on distance
   * @param {number} currentDistance - Current distance in meters
   * @private
   */
  _checkAutoLap(currentDistance) {
    // Get last lap distance
    const lastLapDistance = this.currentActivity.laps.length > 0 
      ? this.currentActivity.laps[this.currentActivity.laps.length - 1].distance
      : 0;
    
    // Check if we've covered a kilometer since last lap
    const lapThreshold = 1000; // 1km in meters
    if (currentDistance - lastLapDistance >= lapThreshold) {
      // Add automatic lap
      this.addLap({ 
        name: `Lap ${this.currentActivity.laps.length + 1}`,
        automatic: true 
      }).catch(error => {
        logger.error('Failed to add auto lap', error);
      });
    }
  }
  
  /**
   * Starts auto-pause detection
   * @private
   */
  _startAutoPauseDetection() {
    // Clear any existing timer
    this._stopAutoPauseDetection();
    
    // Initialize last motion time
    this.lastMotionTime = Date.now();
    
    // Start auto-pause check interval
    this.autoPauseTimer = setInterval(() => {
      this._checkForAutoPause();
    }, 1000); // Check every second
  }
  
  /**
   * Stops auto-pause detection
   * @private
   */
  _stopAutoPauseDetection() {
    if (this.autoPauseTimer) {
      clearInterval(this.autoPauseTimer);
      this.autoPauseTimer = null;
    }
  }
  
  /**
   * Checks if activity should be auto-paused due to inactivity
   * @private
   */
  _checkForAutoPause() {
    try {
      // Only check if activity is active
      if (this.activityState !== ACTIVITY_STATES.ACTIVE) {
        return;
      }
      
      // Calculate time since last motion
      const timeSinceMotion = Date.now() - this.lastMotionTime;
      
      // If inactive for threshold duration, auto-pause
      if (timeSinceMotion >= AUTO_PAUSE_THRESHOLD_MS) {
        logger.info('Auto-pausing activity due to inactivity', {
          activityId: this.currentActivity.id,
          inactiveTime: timeSinceMotion
        });
        
        // Pause activity
        this.pauseActivity().then(() => {
          // Emit auto-pause event
          this.emit(ACTIVITY_EVENTS.AUTO_PAUSE, {
            activityId: this.currentActivity.id,
            pauseTime: Date.now(),
            inactiveTime: timeSinceMotion
          });
        }).catch(error => {
          logger.error('Failed to auto-pause activity', error);
        });
      }
    } catch (error) {
      logger.error('Error in auto-pause detection', error);
    }
  }
  
  /**
   * Updates the activity state and emits state change event
   * @param {string} newState - New activity state
   * @private
   */
  _setActivityState(newState) {
    // Update state
    this.activityState = newState;
    
    // Emit state change event
    this.emit(ACTIVITY_EVENTS.STATE_CHANGE, {
      state: this.activityState,
      activity: this.currentActivity,
      elapsedTime: this.elapsedTime,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Loads settings for activity manager
   * @private
   */
  _loadSettings() {
    // Load settings from storage or use defaults
    // In a real implementation, this would use a settings service
    
    // Auto-pause setting (default to enabled)
    this.enableAutoPause = process.env.ENABLE_AUTO_PAUSE !== 'false';
  }
  
  /**
   * Cleans up resources for current activity
   * @private
   */
  async _cleanupActivity() {
    try {
      // Stop timer
      this._stopTimer();
      
      // Stop auto-pause detection
      this._stopAutoPauseDetection();
      
      // Stop recorder if initialized
      if (this.recorder) {
        await this.recorder.stop().catch(error => {
          logger.error('Error stopping recorder during cleanup', error);
        });
      }
      
      // Stop sensor collection if no other consumer
      await sensorManager.stopCollection().catch(error => {
        logger.error('Error stopping sensor collection during cleanup', error);
      });
      
      // Reset activity state
      this._setActivityState(ACTIVITY_STATES.IDLE);
      
      // Reset current activity
      this.currentActivity = null;
      
      logger.info('Activity resources cleaned up');
    } catch (error) {
      logger.error('Error cleaning up activity resources', error);
      throw error;
    }
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  async cleanup() {
    try {
      // If there's an active or paused activity, stop it
      if (this.activityState === ACTIVITY_STATES.ACTIVE || 
          this.activityState === ACTIVITY_STATES.PAUSED) {
        await this.stopActivity().catch(error => {
          logger.error('Error stopping activity during cleanup', error);
        });
      }
      
      // Clean up recorder and metrics
      if (this.recorder) {
        await this.recorder.cleanup().catch(error => {
          logger.error('Error cleaning up recorder', error);
        });
      }
      
      if (this.metrics) {
        await this.metrics.cleanup().catch(error => {
          logger.error('Error cleaning up metrics', error);
        });
      }
      
      // Remove all listeners
      this.removeAllListeners();
      
      logger.info('Activity manager cleaned up');
    } catch (error) {
      logger.error('Error cleaning up activity manager', error);
      throw error;
    }
  }
}

// Create a singleton instance
const activityManagerInstance = new ActivityManager();

// Export the singleton instance
export default activityManagerInstance;

// Named exports for activity states and types
//export { ACTIVITY_STATES, ACTIVITY_TYPES, ACTIVITY_EVENTS };