import bleManager from '../ble/bleManager';
import { SERVICE_UUIDS, CHARACTERISTIC_UUIDS } from '../ble/bleConstants';
import { SENSOR_TYPES } from './sensorTypes';
import logger from '../../utils/logger';
import { calculateLegSpringStiffness, calculateTSS } from '../../utils/calculations';

/**
 * Service for processing running power sensor data from Stryd Pod device
 */
class PowerSensor {
  constructor() {
    this.device = null;
    this.readings = {
      power: 0,
      cadence: 0,
      strideLength: 0,
      verticalOscillation: 0,
      groundContactTime: 0,
      formPower: 0,
      legSpringStiffness: 0,
      efficiency: 0
    };
    this.subscriptions = [];
    this.cumulativeData = {
      distance: 0,
      steps: 0,
      tss: 0,
      lastUpdateTime: 0
    };
    this.isActive = false;
    this.deviceType = null;
    this.runnerWeight = parseFloat(process.env.RUNNER_WEIGHT_KG || '70');
    this.runnerFTP = parseFloat(process.env.RUNNER_FTP || '250');
  }

  /**
   * Initializes power sensor connection
   * @param {Object} device - Connected BLE device
   * @returns {Promise<boolean>} Success state
   * @throws {Error} If initialization fails
   */
  async initialize(device) {
    try {
      this.device = device;
      
      // Identify device type based on services
      this.deviceType = this._identifyDeviceType(device);
      
      if (!this.deviceType) {
        throw new Error('Unsupported power sensor device');
      }
      
      logger.info(`Power sensor initialized: ${this.deviceType}`, { deviceId: device.id });
      return true;
    } catch (error) {
      logger.error('Failed to initialize power sensor', error);
      throw error;
    }
  }

  /**
   * Starts data collection from power meter
   * @returns {Promise<boolean>} Success state
   */
  async startDataCollection() {
    if (!this.device) {
      throw new Error('Power sensor not initialized');
    }
    
    try {
      if (this.isActive) {
        return true; // Already collecting
      }
      
      // Subscribe to power measurement
      const powerSub = await bleManager.subscribeToCharacteristic(
        this.device.id,
        SERVICE_UUIDS.RUNNING_POWER,
        CHARACTERISTIC_UUIDS.POWER_MEASUREMENT,
        this._handlePowerData.bind(this)
      );
      
      this.subscriptions.push(powerSub);
      
      // Subscribe to running dynamics if available
      if (this._hasRunningDynamics()) {
        const dynamicsSub = await bleManager.subscribeToCharacteristic(
          this.device.id,
          SERVICE_UUIDS.RUNNING_DYNAMICS,
          CHARACTERISTIC_UUIDS.RUNNING_DYNAMICS_MEASUREMENT,
          this._handleRunningDynamicsData.bind(this)
        );
        
        this.subscriptions.push(dynamicsSub);
      }
      
      this.isActive = true;
      this.cumulativeData.lastUpdateTime = Date.now();
      
      logger.info('Power sensor data collection started', { deviceId: this.device.id });
      return true;
    } catch (error) {
      logger.error('Failed to start power sensor data collection', error);
      await this.stopDataCollection();
      throw error;
    }
  }

  /**
   * Stops data collection and cleans up
   * @returns {Promise<void>} Resolves when stopped
   */
  async stopDataCollection() {
    if (!this.isActive) {
      return;
    }
    
    try {
      // Clean up all subscriptions
      for (const subscription of this.subscriptions) {
        await subscription.remove();
      }
      
      this.subscriptions = [];
      this.isActive = false;
      
      logger.info('Power sensor data collection stopped', { deviceId: this.device?.id });
    } catch (error) {
      logger.error('Error stopping power sensor data collection', error);
    }
  }

  /**
   * Gets current sensor readings
   * @returns {Object} Current power and running dynamics data
   */
  getReadings() {
    return { ...this.readings };
  }

  /**
   * Gets cumulative metrics for the session
   * @returns {Object} Cumulative metrics (distance, TSS)
   */
  getCumulativeMetrics() {
    return { ...this.cumulativeData };
  }

  /**
   * Processes power measurement data
   * @param {ArrayBuffer} data - Raw characteristic value
   * @returns {Object} Processed power metrics
   * @private
   */
  _handlePowerData(data) {
    try {
      // Parse ArrayBuffer to DataView
      const dataView = new DataView(data);
      
      // Extract power (Stryd format - typically first 2 bytes)
      const power = dataView.getUint16(0, true); // little-endian
      
      // Some devices include cadence in the same characteristic
      let cadence = 0;
      if (dataView.byteLength >= 4) {
        cadence = dataView.getUint16(2, true);
      }
      
      // Update readings
      this.readings.power = power;
      
      if (cadence > 0) {
        this.readings.cadence = cadence;
      }
      
      // Update cumulative metrics
      this._updateCumulativeMetrics(power);
      
      return this.readings;
    } catch (error) {
      logger.error('Error parsing power data', error);
      return this.readings;
    }
  }

  /**
   * Processes running dynamics data
   * @param {ArrayBuffer} data - Raw characteristic value
   * @returns {Object} Processed running form metrics
   * @private
   */
  _handleRunningDynamicsData(data) {
    try {
      const dataView = new DataView(data);
      
      // Parse according to Stryd data format
      // Format may vary by device model
      
      // Example format (positions vary by device model):
      // Byte 0-1: Ground contact time in ms
      // Byte 2-3: Stride length in cm
      // Byte 4-5: Vertical oscillation in cm (x10)
      // Byte 6-7: Form power in watts
      
      // Extract values based on the device type
      let offset = 0;
      
      // Ground contact time
      const groundContactTime = dataView.getUint16(offset, true);
      offset += 2;
      
      // Stride length
      const strideLength = dataView.getUint16(offset, true) / 10; // convert to cm
      offset += 2;
      
      // Vertical oscillation
      const verticalOscillation = this._calculateVerticalOscillation(
        dataView.getUint16(offset, true)
      );
      offset += 2;
      
      // Form power
      const formPower = dataView.getUint16(offset, true);
      
      // Update readings
      this.readings.groundContactTime = groundContactTime;
      this.readings.strideLength = strideLength;
      this.readings.verticalOscillation = verticalOscillation;
      this.readings.formPower = formPower;
      
      // Calculate leg spring stiffness
      this.readings.legSpringStiffness = this._calculateLegSpringStiffness(
        verticalOscillation,
        groundContactTime,
        this.runnerWeight
      );
      
      // Calculate efficiency (power/form power ratio)
      if (formPower > 0 && this.readings.power > 0) {
        this.readings.efficiency = this.readings.power / formPower;
      }
      
      return this.readings;
    } catch (error) {
      logger.error('Error parsing running dynamics data', error);
      return this.readings;
    }
  }

  /**
   * Updates cumulative metrics based on power
   * @param {number} power - Current power in watts
   * @private
   */
  _updateCumulativeMetrics(power) {
    const now = Date.now();
    const elapsed = (now - this.cumulativeData.lastUpdateTime) / 1000; // in seconds
    
    if (elapsed > 0 && this.cumulativeData.lastUpdateTime > 0) {
      // Update Training Stress Score
      this.cumulativeData.tss = this._updateTSS(power, elapsed);
      
      // If we have cadence and stride length, update distance
      if (this.readings.cadence > 0 && this.readings.strideLength > 0) {
        // cadence is steps/min, strideLength is cm, elapsed is seconds
        const stepsInPeriod = (this.readings.cadence / 60) * elapsed;
        const distanceInPeriod = (stepsInPeriod * this.readings.strideLength) / 100; // to meters
        
        this.cumulativeData.steps += stepsInPeriod;
        this.cumulativeData.distance += distanceInPeriod;
      }
    }
    
    this.cumulativeData.lastUpdateTime = now;
  }

  /**
   * Updates Training Stress Score based on power
   * @param {number} power - Current power in watts
   * @param {number} duration - Duration in seconds
   * @returns {number} Updated TSS
   * @private
   */
  _updateTSS(power, duration) {
    return calculateTSS(power, duration, this.runnerFTP, this.cumulativeData.tss);
  }

  /**
   * Calculates vertical oscillation from raw data
   * @param {number} rawValue - Encoded oscillation value
   * @returns {number} Vertical oscillation in centimeters
   * @private
   */
  _calculateVerticalOscillation(rawValue) {
    // Typically encoded as raw value * 10
    return rawValue / 10;
  }

  /**
   * Calculates leg spring stiffness
   * @param {number} verticalOscillation - Oscillation in cm
   * @param {number} groundContactTime - GCT in ms
   * @param {number} weight - Runner weight in kg
   * @returns {number} LSS value
   * @private
   */
  _calculateLegSpringStiffness(verticalOscillation, groundContactTime, weight) {
    return calculateLegSpringStiffness(verticalOscillation, groundContactTime, weight);
  }

  /**
   * Identifies device type based on services
   * @param {Object} device - Device with discovered services
   * @returns {string} Device type identifier
   * @private
   */
  _identifyDeviceType(device) {
    // Check if device has Stryd-specific services
    const hasStrydServices = device.services?.some(
      service => service.uuid === SERVICE_UUIDS.RUNNING_POWER
    );
    
    if (hasStrydServices) {
      return 'STRYD_POD';
    }
    
    // Check for generic running power service
    const hasRunningPower = device.services?.some(
      service => service.uuid === SERVICE_UUIDS.RUNNING_POWER
    );
    
    if (hasRunningPower) {
      return 'GENERIC_POWER_SENSOR';
    }
    
    return null;
  }

  /**
   * Checks if device has running dynamics capability
   * @returns {boolean} Whether running dynamics are available
   * @private
   */
  _hasRunningDynamics() {
    if (!this.device || !this.device.services) {
      return false;
    }
    
    return this.device.services.some(
      service => service.uuid === SERVICE_UUIDS.RUNNING_DYNAMICS
    );
  }
}

export default new PowerSensor();