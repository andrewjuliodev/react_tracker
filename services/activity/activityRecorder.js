// Import sensor manager
import sensorManager from '../sensors/sensorManager';

// Import database repositories
import sensorRepository from '../../database/repositories/sensorRepository';
import mmkvStorage from '../../database/cache/mmkvStorage';

// Import utilities and constants
import logger from '../../utils/logger';

// Default recording frequency in milliseconds
const DEFAULT_RECORDING_FREQUENCY = parseInt(process.env.RECORDING_FREQUENCY_MS, 10) || 1000;
// Default buffer size
const DEFAULT_BUFFER_SIZE = parseInt(process.env.BUFFER_SIZE, 10) || 10;

/**
 * Service for recording sensor data during activity sessions
 */
class ActivityRecorder {
  constructor() {
    // Activity identifier
    this.activityId = null;
    
    // Recording state
    this.isRecording = false;
    this.isPaused = false;
    
    // Recording configuration
    this.recordingFrequency = DEFAULT_RECORDING_FREQUENCY;
    this.bufferSize = DEFAULT_BUFFER_SIZE;
    
    // Recording interval reference
    this.recordingInterval = null;
    
    // Data buffer for batch inserts
    this.dataBuffer = [];
    
    // Sensor data subscription
    this.sensorSubscription = null;
    
    // Timestamp of last recording
    this.lastRecordingTime = 0;
  }
  
  /**
   * Initializes activity recording
   * @param {string} activityId - Current activity identifier
   * @returns {Promise<boolean>} Success state
   */
  async initialize(activityId) {
    try {
      logger.info(`Initializing activity recorder for activity: ${activityId}`);
      
      // Store activity ID
      this.activityId = activityId;
      
      // Reset state
      this.isRecording = false;
      this.isPaused = false;
      this.dataBuffer = [];
      this.lastRecordingTime = 0;
      
      // Clear any existing recording interval
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize activity recorder', error);
      throw error;
    }
  }
  
  /**
   * Starts data recording
   * @param {Object} options - Recording configuration
   * @returns {Promise<boolean>} Success state
   */
  async start(options = {}) {
    try {
      // Check if already recording
      if (this.isRecording) {
        logger.warn('Recorder is already active');
        return true;
      }
      
      // Check if activity ID is set
      if (!this.activityId) {
        throw new Error('Activity ID not set. Call initialize() first.');
      }
      
      logger.info(`Starting data recording for activity: ${this.activityId}`);
      
      // Set recording options
      this.recordingFrequency = options.frequency || DEFAULT_RECORDING_FREQUENCY;
      this.bufferSize = options.bufferSize || DEFAULT_BUFFER_SIZE;
      
      // Subscribe to sensor data updates
      this.sensorSubscription = sensorManager.subscribe(data => {
        // Store latest data in cache for quick access
        mmkvStorage.setObject(`activity_${this.activityId}_latest_data`, data);
      });
      
      // Set recording state
      this.isRecording = true;
      this.isPaused = false;
      this.lastRecordingTime = Date.now();
      
      // Start recording interval
      this.recordingInterval = setInterval(async () => {
        if (!this.isPaused) {
          await this._recordDataPoint();
        }
      }, this.recordingFrequency);
      
      logger.info('Data recording started');
      
      return true;
    } catch (error) {
      logger.error('Failed to start recording', error);
      
      // Clean up on failure
      await this.stop().catch(stopError => {
        logger.error('Error stopping recorder after start failure', stopError);
      });
      
      throw error;
    }
  }
  
  /**
   * Pauses active recording
   * @returns {Promise<void>} Resolves when paused
   */
  async pause() {
    try {
      // Check if recording and not already paused
      if (!this.isRecording || this.isPaused) {
        return;
      }
      
      logger.info('Pausing data recording');
      
      // Set paused state
      this.isPaused = true;
      
      // Flush buffer to ensure data is saved
      await this.flushBuffer();
      
      logger.info('Data recording paused');
    } catch (error) {
      logger.error('Failed to pause recording', error);
      throw error;
    }
  }
  
  /**
   * Resumes paused recording
   * @returns {Promise<boolean>} Success state
   */
  async resume() {
    try {
      // Check if recording and paused
      if (!this.isRecording || !this.isPaused) {
        return false;
      }
      
      logger.info('Resuming data recording');
      
      // Unpause recording
      this.isPaused = false;
      this.lastRecordingTime = Date.now();
      
      // Record initial data point on resume
      await this._recordDataPoint();
      
      logger.info('Data recording resumed');
      
      return true;
    } catch (error) {
      logger.error('Failed to resume recording', error);
      throw error;
    }
  }
  
  /**
   * Stops recording and finalizes data
   * @returns {Promise<boolean>} Success state
   */
  async stop() {
    try {
      // Check if recording
      if (!this.isRecording) {
        return true;
      }
      
      logger.info('Stopping data recording');
      
      // Clear recording interval
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
      
      // Unsubscribe from sensor data
      if (this.sensorSubscription) {
        this.sensorSubscription();
        this.sensorSubscription = null;
      }
      
      // Flush any remaining buffer data
      await this.flushBuffer();
      
      // Clear activity state
      this.isRecording = false;
      this.isPaused = false;
      
      logger.info('Data recording stopped');
      
      return true;
    } catch (error) {
      logger.error('Failed to stop recording', error);
      throw error;
    }
  }
  
  /**
   * Records current sensor data snapshot
   * @returns {Promise<Array>} Recorded data points
   * @private
   */
  async _recordDataPoint() {
    try {
      // Get current sensor data
      const sensorData = sensorManager.getReadings();
      
      // Skip if no data
      if (!sensorData || Object.keys(sensorData).length === 0) {
        return [];
      }
      
      // Get current timestamp
      const timestamp = this._getSynchronizedTimestamp();
      
      // Create data points for each sensor type
      const dataPoints = Object.entries(sensorData).map(([type, value]) => ({
        activityId: this.activityId,
        timestamp,
        type,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
      }));
      
      // Add to buffer
      this.dataBuffer.push(...dataPoints);
      
      // Update last recording time
      this.lastRecordingTime = timestamp;
      
      // Flush buffer if it reaches threshold size
      if (this.dataBuffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }
      
      return dataPoints;
    } catch (error) {
      logger.error('Error recording data point', error);
      return [];
    }
  }
  
  /**
   * Flushes buffered data to storage
   * @returns {Promise<boolean>} Success state
   */
  async flushBuffer() {
    try {
      // Skip if no data in buffer
      if (this.dataBuffer.length === 0) {
        return true;
      }
      
      // Get data to flush
      const dataToFlush = [...this.dataBuffer];
      
      // Clear buffer before database operation
      this.dataBuffer = [];
      
      // Store data in database
      await sensorRepository.addReadings(dataToFlush, true);
      
      return true;
    } catch (error) {
      logger.error('Failed to flush data buffer', error);
      
      // Put data back in buffer to try again later
      // This could potentially lead to duplicates, but better than losing data
      this.dataBuffer = [...this.dataBuffer, ...this.dataBuffer];
      
      throw error;
    }
  }
  
  /**
   * Gets timestamp synchronized across all data points
   * @returns {number} Current timestamp in milliseconds
   */
  _getSynchronizedTimestamp() {
    // For simplicity, just use current time
    // In a real application, this might synchronize across devices or with a server
    return Date.now();
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  async cleanup() {
    try {
      // Stop recording if active
      if (this.isRecording) {
        await this.stop();
      }
      
      // Clear activity ID
      this.activityId = null;
      
      // Clear data buffer
      this.dataBuffer = [];
      
      logger.info('Activity recorder cleaned up');
    } catch (error) {
      logger.error('Error cleaning up activity recorder', error);
      throw error;
    }
  }
}

export default ActivityRecorder;