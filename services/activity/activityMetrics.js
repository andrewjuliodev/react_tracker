// Import sensor manager
import sensorManager, { SENSOR_TYPES } from '../sensors/sensorManager';

// Import utilities
import { 
  calculateMovingAverage,
  calculatePowerZones,
  calculateHeartRateZones 
} from '../../utils/calculations';
import { 
  formatDuration, 
  formatDistance, 
  formatPace 
} from '../../utils/formatters';
import logger from '../../utils/logger';

// Constants
const ATHLETE_FTP = parseInt(process.env.ATHLETE_FTP, 10) || 250; // Functional threshold power
const METRIC_HISTORY_SIZE = parseInt(process.env.METRIC_HISTORY_SIZE, 10) || 60; // Data points to keep for trends

/**
 * Service for calculating real-time and cumulative activity metrics
 */
class ActivityMetrics {
  constructor() {
    // Activity identifier
    this.activityId = null;
    
    // Real-time metrics
    this.realtimeMetrics = {};
    
    // Cumulative metrics
    this.cumulativeMetrics = {
      distance: 0,
      totalAscent: 0,
      totalDescent: 0,
      avgHeartRate: 0,
      maxHeartRate: 0,
      avgPower: 0,
      maxPower: 0,
      avgCadence: 0,
      maxCadence: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      calories: 0,
      tss: 0,
    };
    
    // Metric history for trends and averages
    this.metricHistory = new Map();
    
    // Sample count for averages
    this.sampleCount = 0;
    
    // Previous values for calculations
    this.previousValues = {};
    
    // Sensor data subscription
    this.sensorSubscription = null;
  }
  
  /**
   * Initializes metrics tracking for activity
   * @param {string} activityId - Activity identifier
   * @returns {Promise<boolean>} Success state
   */
  async initialize(activityId) {
    try {
      logger.info(`Initializing activity metrics for activity: ${activityId}`);
      
      // Store activity ID
      this.activityId = activityId;
      
      // Reset metrics
      this.resetMetrics();
      
      // Subscribe to sensor data updates
      this.sensorSubscription = sensorManager.subscribe(data => {
        this._processSensorData(data);
      });
      
      // Get initial data
      await this.updateMetrics();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize activity metrics', error);
      throw error;
    }
  }
  
  /**
   * Resets all metrics to initial values
   */
  resetMetrics() {
    // Reset real-time metrics
    this.realtimeMetrics = {};
    
    // Reset cumulative metrics
    this.cumulativeMetrics = {
      distance: 0,
      totalAscent: 0,
      totalDescent: 0,
      avgHeartRate: 0,
      maxHeartRate: 0,
      avgPower: 0,
      maxPower: 0,
      avgCadence: 0,
      maxCadence: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      calories: 0,
      tss: 0,
    };
    
    // Reset metric history
    this.metricHistory = new Map();
    
    // Reset sample count
    this.sampleCount = 0;
    
    // Reset previous values
    this.previousValues = {};
  }
  
  /**
   * Updates metrics with latest sensor data
   * @returns {Promise<Object>} Updated metrics
   */
  async updateMetrics() {
    try {
      // Get latest sensor data
      const sensorData = sensorManager.getReadings();
      
      // Update metrics with sensor data
      this._processSensorData(sensorData);
      
      // Generate complete metrics object
      const metrics = this._generateMetricsObject();
      
      return metrics;
    } catch (error) {
      logger.error('Error updating metrics', error);
      return this._generateMetricsObject();
    }
  }
  
  /**
   * Processes sensor data updates
   * @param {Object} data - Sensor data
   * @private
   */
  _processSensorData(data) {
    try {
      // Skip if no data
      if (!data || Object.keys(data).length === 0) {
        return;
      }
      
      // Update real-time metrics
      Object.entries(data).forEach(([key, value]) => {
        // Store current value
        this.realtimeMetrics[key] = value;
        
        // Update metric history
        if (!this.metricHistory.has(key)) {
          this.metricHistory.set(key, []);
        }
        
        const history = this.metricHistory.get(key);
        history.push({ value, timestamp: Date.now() });
        
        // Limit history size
        if (history.length > METRIC_HISTORY_SIZE) {
          history.shift();
        }
      });
      
      // Update cumulative metrics
      this._updateCumulativeMetrics(data);
      
      // Update previous values
      Object.entries(data).forEach(([key, value]) => {
        this.previousValues[key] = value;
      });
      
      // Increment sample count
      this.sampleCount++;
    } catch (error) {
      logger.error('Error processing sensor data for metrics', error);
    }
  }
  
  /**
   * Updates cumulative metrics with new sensor data
   * @param {Object} data - New sensor readings
   * @private
   */
  _updateCumulativeMetrics(data) {
    try {
      // Update heart rate metrics
      if (data[SENSOR_TYPES.HEART_RATE] !== undefined) {
        const heartRate = data[SENSOR_TYPES.HEART_RATE];
        
        // Update max heart rate
        if (heartRate > this.cumulativeMetrics.maxHeartRate) {
          this.cumulativeMetrics.maxHeartRate = heartRate;
        }
        
        // Update average heart rate
        this.cumulativeMetrics.avgHeartRate = this._calculateRunningAverage(
          this.cumulativeMetrics.avgHeartRate, 
          heartRate, 
          this.sampleCount
        );
      }
      
      // Update power metrics
      if (data[SENSOR_TYPES.POWER] !== undefined) {
        const power = data[SENSOR_TYPES.POWER];
        
        // Update max power
        if (power > this.cumulativeMetrics.maxPower) {
          this.cumulativeMetrics.maxPower = power;
        }
        
        // Update average power
        this.cumulativeMetrics.avgPower = this._calculateRunningAverage(
          this.cumulativeMetrics.avgPower, 
          power, 
          this.sampleCount
        );
        
        // Update TSS if we have FTP
        if (ATHLETE_FTP > 0) {
          // Simple TSS calculation, would be more complex in real implementation
          const intensity = power / ATHLETE_FTP;
          const timeFactor = 1 / 3600; // Assuming sample is 1 second
          
          // TSS = (seconds × NP × IF) ÷ (FTP × 3600) × 100
          const tssDelta = (power * intensity * timeFactor) * 100;
          this.cumulativeMetrics.tss += tssDelta;
        }
        
        // Update calories (simplified calculation)
        // Roughly 3.6 calories per minute per kg at 1 watt
        const weight = 70; // Default weight in kg
        const calorieRate = power * 3.6 / 60; // per second
        this.cumulativeMetrics.calories += calorieRate / 60; // Assuming 1 second sample
      }
      
      // Update cadence metrics
      if (data[SENSOR_TYPES.CADENCE] !== undefined) {
        const cadence = data[SENSOR_TYPES.CADENCE];
        
        // Update max cadence
        if (cadence > this.cumulativeMetrics.maxCadence) {
          this.cumulativeMetrics.maxCadence = cadence;
        }
        
        // Update average cadence
        this.cumulativeMetrics.avgCadence = this._calculateRunningAverage(
          this.cumulativeMetrics.avgCadence, 
          cadence, 
          this.sampleCount
        );
      }
      
      // Update speed metrics
      if (data[SENSOR_TYPES.SPEED] !== undefined) {
        const speed = data[SENSOR_TYPES.SPEED];
        
        // Update max speed
        if (speed > this.cumulativeMetrics.maxSpeed) {
          this.cumulativeMetrics.maxSpeed = speed;
        }
        
        // Update average speed
        this.cumulativeMetrics.avgSpeed = this._calculateRunningAverage(
          this.cumulativeMetrics.avgSpeed, 
          speed, 
          this.sampleCount
        );
      }
      
      // Update distance
      if (data[SENSOR_TYPES.DISTANCE] !== undefined) {
        // Distance comes as cumulative value, so just use the latest
        this.cumulativeMetrics.distance = data[SENSOR_TYPES.DISTANCE];
      } else if (data[SENSOR_TYPES.SPEED] !== undefined) {
        // If no direct distance but we have speed, estimate distance increment
        const speed = data[SENSOR_TYPES.SPEED]; // meters per second
        const timeIncrement = 1; // Assume 1 second between samples
        
        // Increment distance by speed * time
        this.cumulativeMetrics.distance += speed * timeIncrement;
      }
      
      // Update elevation metrics
      if (data[SENSOR_TYPES.ELEVATION] !== undefined) {
        const elevation = data[SENSOR_TYPES.ELEVATION];
        const prevElevation = this.previousValues[SENSOR_TYPES.ELEVATION];
        
        // If we have previous elevation, calculate change
        if (prevElevation !== undefined) {
          const elevationChange = elevation - prevElevation;
          
          // Add to total ascent/descent
          if (elevationChange > 0.5) { // 0.5m threshold to filter noise
            this.cumulativeMetrics.totalAscent += elevationChange;
          } else if (elevationChange < -0.5) {
            this.cumulativeMetrics.totalDescent += Math.abs(elevationChange);
          }
        }
      }
    } catch (error) {
      logger.error('Error updating cumulative metrics', error);
    }
  }
  
  /**
   * Calculates running average for metrics
   * @param {number} currentAverage - Current average value
   * @param {number} newValue - New value to incorporate
   * @param {number} sampleCount - Number of samples so far
   * @returns {number} Updated average
   * @private
   */
  _calculateRunningAverage(currentAverage, newValue, sampleCount) {
    // If first sample, just return the value
    if (sampleCount === 0) {
      return newValue;
    }
    
    // Calculate running average
    // newAvg = oldAvg + (newValue - oldAvg) / (sampleCount + 1)
    return currentAverage + (newValue - currentAverage) / (sampleCount + 1);
  }
  
  /**
   * Generates complete metrics object with real-time and cumulative metrics
   * @returns {Object} Combined metrics object
   * @private
   */
  _generateMetricsObject() {
    try {
      // Start with real-time metrics
      const metrics = { ...this.realtimeMetrics };
      
      // Add cumulative metrics
      Object.entries(this.cumulativeMetrics).forEach(([key, value]) => {
        // Only add if not null/undefined and not already set
        if (value !== null && value !== undefined && metrics[key] === undefined) {
          metrics[key] = value;
        }
      });
      
      // Calculate derived metrics
      this._addDerivedMetrics(metrics);
      
      // Add formatted values
      this._addFormattedValues(metrics);
      
      return metrics;
    } catch (error) {
      logger.error('Error generating metrics object', error);
      return { ...this.realtimeMetrics };
    }
  }
  
  /**
   * Adds derived metrics based on raw values
   * @param {Object} metrics - Metrics object to enhance
   * @private
   */
  _addDerivedMetrics(metrics) {
    try {
      // Calculate heart rate zones if we have heart rate
      if (metrics.avgHeartRate) {
        metrics.heartRateZones = calculateHeartRateZones(metrics.maxHeartRate || 190);
      }
      
      // Calculate power zones if we have power
      if (metrics.avgPower && ATHLETE_FTP) {
        metrics.powerZones = calculatePowerZones(ATHLETE_FTP);
      }
      
      // Calculate power-to-weight ratio if we have power
      if (metrics.avgPower) {
        // Hardcoded weight for now - in a real app, this would come from user profile
        const weight = 70; // kg
        metrics.powerToWeight = metrics.avgPower / weight;
      }
      
      // Calculate pace if not already present
      if (!metrics[SENSOR_TYPES.PACE] && metrics[SENSOR_TYPES.SPEED]) {
        const speed = metrics[SENSOR_TYPES.SPEED]; // meters per second
        
        if (speed > 0) {
          // Convert speed to pace (minutes per kilometer)
          // pace = (1 / speed) * (1000 / 60)
          metrics[SENSOR_TYPES.PACE] = (1000 / 60) / speed;
        }
      }
      
      // Determine if currently moving
      metrics.isMoving = this._determineIfMoving(metrics);
    } catch (error) {
      logger.error('Error adding derived metrics', error);
    }
  }
  
  /**
   * Adds formatted values for display
   * @param {Object} metrics - Metrics object to enhance
   * @private
   */
  _addFormattedValues(metrics) {
    try {
      // Add formatted distance
      if (metrics.distance !== undefined) {
        metrics.formattedDistance = formatDistance(metrics.distance);
      }
      
      // Add formatted pace
      if (metrics[SENSOR_TYPES.PACE] !== undefined) {
        metrics.formattedPace = formatPace(metrics[SENSOR_TYPES.PACE]);
      }
      
      // Add formatted duration (placeholder - actual duration comes from activity manager)
      metrics.formattedDuration = '00:00:00';
    } catch (error) {
      logger.error('Error adding formatted values', error);
    }
  }
  
  /**
   * Determines if activity is currently moving
   * @param {Object} metrics - Current metrics
   * @returns {boolean} Whether activity appears to be moving
   * @private
   */
  _determineIfMoving(metrics) {
    // Check speed if available
    if (metrics[SENSOR_TYPES.SPEED] !== undefined) {
      // Consider moving if speed above threshold
      const speed = metrics[SENSOR_TYPES.SPEED];
      return speed > 0.5; // 0.5 m/s = 1.8 km/h
    }
    
    // Check cadence if available
    if (metrics[SENSOR_TYPES.CADENCE] !== undefined) {
      // Consider moving if cadence above threshold
      const cadence = metrics[SENSOR_TYPES.CADENCE];
      return cadence > 40; // 40 steps/min
    }
    
    // Default - assume moving if we have any recent metrics
    return this.sampleCount > 0 && Object.keys(this.realtimeMetrics).length > 0;
  }
  
  /**
   * Gets trend for a specific metric
   * @param {string} metricKey - Metric identifier
   * @param {number} samples - Samples to analyze
   * @returns {Object} Trend information
   */
  getTrend(metricKey, samples = 10) {
    try {
      // Get history for the metric
      const history = this.metricHistory.get(metricKey);
      if (!history || history.length < 2) {
        return { direction: 'stable', change: 0, value: this.realtimeMetrics[metricKey] };
      }
      
      // Get sample size (limited by available history)
      const sampleSize = Math.min(samples, history.length);
      
      // Get current and previous values
      const currentValue = history[history.length - 1].value;
      const previousValue = history[history.length - sampleSize].value;
      
      // Calculate change
      const change = currentValue - previousValue;
      const percentChange = previousValue !== 0 ? (change / previousValue) * 100 : 0;
      
      // Determine trend direction
      let direction = 'stable';
      if (Math.abs(percentChange) < 1) {
        direction = 'stable';
      } else if (percentChange > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }
      
      return {
        direction,
        change,
        percentChange,
        value: currentValue,
      };
    } catch (error) {
      logger.error(`Error calculating trend for ${metricKey}`, error);
      return { direction: 'stable', change: 0, value: this.realtimeMetrics[metricKey] };
    }
  }
  
  /**
   * Gets current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return this._generateMetricsObject();
  }
  
  /**
   * Finalizes metrics for completed activity
   * @returns {Promise<Object>} Complete activity metrics
   */
  async finalize() {
    try {
      logger.info('Finalizing activity metrics');
      
      // Get final metrics
      const finalMetrics = this._generateMetricsObject();
      
      // Add any additional calculated metrics for final summary
      
      // Calculate intensity from heart rate if available
      if (finalMetrics.avgHeartRate && finalMetrics.maxHeartRate) {
        finalMetrics.intensity = finalMetrics.avgHeartRate / finalMetrics.maxHeartRate;
      }
      
      return finalMetrics;
    } catch (error) {
      logger.error('Error finalizing metrics', error);
      return this._generateMetricsObject();
    }
  }
  
  /**
   * Cleans up resources and subscriptions
   */
  async cleanup() {
    try {
      // Unsubscribe from sensor updates
      if (this.sensorSubscription) {
        this.sensorSubscription();
        this.sensorSubscription = null;
      }
      
      // Reset metrics
      this.resetMetrics();
      
      // Clear activity ID
      this.activityId = null;
      
      logger.info('Activity metrics cleaned up');
    } catch (error) {
      logger.error('Error cleaning up activity metrics', error);
      throw error;
    }
  }
}

export default ActivityMetrics;