import { useState, useEffect, useCallback, useRef } from 'react';

// Import sensor manager and types
import sensorManager, { SENSOR_TYPES, SENSOR_EVENTS } from '../services/sensors/sensorManager';

// Import calculation utilities
import { calculateMovingAverage } from '../utils/calculations';

// Import logger
import logger from '../utils/logger';

/**
 * Custom hook for accessing and using sensor data in components
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.types - Sensor types to include
 * @param {boolean} options.derived - Whether to calculate derived metrics
 * @returns {Object} Sensor data and helper functions
 */
export const useSensorData = (options = {}) => {
  // Extract options with defaults
  const {
    types = null, // If null, include all sensor types
    derived = false, // Whether to calculate derived metrics
  } = options;
  
  // State for sensor data
  const [sensorData, setSensorData] = useState({});
  const [derivedMetrics, setDerivedMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Store metric history for calculations
  const metricHistory = useRef(new Map());
  
  // Set up sensor data subscription
  useEffect(() => {
    // Reset state when options change
    setSensorData({});
    setDerivedMetrics({});
    setIsLoading(true);
    setError(null);
    
    // Initialize history map
    metricHistory.current = new Map();
    
    // Function to handle sensor data updates
    const handleSensorUpdate = (data) => {
      if (!isMounted.current) return;
      
      try {
        // Filter data by requested types if specified
        let filteredData = data;
        if (types && Array.isArray(types)) {
          filteredData = {};
          types.forEach(type => {
            if (data[type] !== undefined) {
              filteredData[type] = data[type];
            }
          });
        }
        
        // Update sensor data
        setSensorData(filteredData);
        
        // Update metric history
        Object.entries(filteredData).forEach(([key, value]) => {
          if (!metricHistory.current.has(key)) {
            metricHistory.current.set(key, []);
          }
          
          const history = metricHistory.current.get(key);
          history.push({ value, timestamp: Date.now() });
          
          // Limit history size to prevent memory issues
          const MAX_HISTORY_SIZE = 60; // About 30 seconds at 500ms updates
          if (history.length > MAX_HISTORY_SIZE) {
            history.shift();
          }
        });
        
        // Calculate derived metrics if requested
        if (derived) {
          const metrics = calculateDerivedMetrics(filteredData);
          setDerivedMetrics(metrics);
        }
        
        // Update loading state
        setIsLoading(false);
      } catch (error) {
        logger.error('Error processing sensor data in hook', error);
        if (isMounted.current) {
          setError('Failed to process sensor data');
        }
      }
    };
    
    // Subscribe to sensor data updates
    const unsubscribe = sensorManager.subscribe(handleSensorUpdate);
    
    // Handle initial data request
    setIsLoading(true);
    
    // Get initial data
    const initialData = sensorManager.getReadings(types);
    handleSensorUpdate(initialData);
    
    // Clean up subscription when component unmounts
    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [types, derived]);
  
  /**
   * Gets the latest data for a specific metric
   * @param {string} metricKey - Metric identifier
   * @returns {any} Current value for the metric
   */
  const getMetricValue = useCallback((metricKey) => {
    // Check derived metrics first
    if (derivedMetrics[metricKey] !== undefined) {
      return derivedMetrics[metricKey];
    }
    
    // Then check sensor data
    return sensorData[metricKey];
  }, [sensorData, derivedMetrics]);
  
  /**
   * Calculates a moving average for a metric
   * @param {string} metricKey - Metric identifier
   * @param {number} window - Number of samples to average
   * @returns {number} Calculated average
   */
  const getMetricAverage = useCallback((metricKey, window = 5) => {
    // Get history for the metric
    const history = metricHistory.current.get(metricKey);
    if (!history || history.length === 0) {
      return null;
    }
    
    // Extract values
    const values = history.map(item => item.value);
    
    // Calculate moving average
    return calculateMovingAverage(values, Math.min(window, values.length));
  }, []);
  
  /**
   * Calculates derived metrics from raw sensor data
   * @param {Object} rawData - Current sensor readings
   * @returns {Object} Derived metrics
   */
  const calculateDerivedMetrics = (rawData) => {
    try {
      const derivedMetrics = {};
      
      // Skip if no data
      if (!rawData || Object.keys(rawData).length === 0) {
        return derivedMetrics;
      }
      
      // Calculate power-to-weight ratio if power available
      if (rawData[SENSOR_TYPES.POWER] !== undefined) {
        // Hardcoded weight for now - in a real app, this would come from user profile
        const weight = 70; // kg
        const power = rawData[SENSOR_TYPES.POWER];
        
        if (power > 0 && weight > 0) {
          derivedMetrics.powerToWeight = power / weight;
        }
      }
      
      // Calculate efficiency index if power and pace available
      if (rawData[SENSOR_TYPES.POWER] !== undefined && 
          rawData[SENSOR_TYPES.PACE] !== undefined) {
        
        const power = rawData[SENSOR_TYPES.POWER];
        const pace = rawData[SENSOR_TYPES.PACE]; // minutes per km
        
        if (power > 0 && pace > 0) {
          // Convert pace to m/s for calculation
          const speed = 1000 / (pace * 60);
          
          // Efficiency = speed / power (higher is better)
          // Multiply by 100 to get a more readable number
          derivedMetrics.efficiency = (speed / power) * 100;
        }
      }
      
      // Calculate run effectiveness if vertical oscillation and stride length available
      if (rawData[SENSOR_TYPES.VERTICAL_OSCILLATION] !== undefined && 
          rawData[SENSOR_TYPES.STRIDE_LENGTH] !== undefined) {
        
        const verticalOscillation = rawData[SENSOR_TYPES.VERTICAL_OSCILLATION];
        const strideLength = rawData[SENSOR_TYPES.STRIDE_LENGTH];
        
        if (verticalOscillation > 0 && strideLength > 0) {
          // Calculate ratio: vertical oscillation (cm) / stride length (cm)
          // Lower ratio is better (less bounce per distance)
          derivedMetrics.verticalRatio = (verticalOscillation / strideLength) * 100;
        }
      }
      
      // Forward estimated distance if available
      if (rawData[SENSOR_TYPES.DISTANCE] !== undefined) {
        derivedMetrics.distance = rawData[SENSOR_TYPES.DISTANCE];
      }
      
      return derivedMetrics;
    } catch (error) {
      logger.error('Error calculating derived metrics', error);
      return {};
    }
  };
  
  // Return sensor data and helper functions
  return {
    sensorData,
    derivedMetrics,
    isLoading,
    error,
    getMetricValue,
    getMetricAverage,
  };
};

export default useSensorData;