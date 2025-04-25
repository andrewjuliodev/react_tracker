/**
 * activitySummary.js
 * Processes raw activity data to calculate summary metrics and statistics
 * for post-activity display and analysis.
 */

import { calculatePace, calculateAvgHeartRate, calculateTSS } from '../utils/calculations';
import { formatDistance, formatDuration } from '../utils/formatters';

/**
 * Processes the complete activity data to generate a comprehensive summary
 * @param {Object} activityData - The complete activity data including sensor readings
 * @returns {Object} The processed activity summary with calculated metrics
 */
const generateActivitySummary = (activityData) => {
  if (!activityData || !activityData.id) {
    throw new Error('Invalid activity data provided');
  }

  const { sensorData, locationData, startTime, endTime } = activityData;
  const duration = endTime - startTime;
  
  // Extract relevant sensor data
  const heartRateData = sensorData.filter(data => data.dataType === 'heart_rate');
  const powerData = sensorData.filter(data => data.dataType === 'power');
  const cadenceData = sensorData.filter(data => data.dataType === 'cadence');
  
  // Calculate distance from location data
  const distance = calculateTotalDistance(locationData);
  
  // Calculate metrics
  const avgHeartRate = calculateAvgHeartRate(heartRateData);
  const avgPower = calculateAverage(powerData.map(d => d.value));
  const avgCadence = calculateAverage(cadenceData.map(d => d.value));
  const avgPace = calculatePace(distance, duration);
  const elevationGain = calculateElevationGain(locationData);
  const tss = calculateTSS(powerData, duration);
  
  // Create summary object
  const summary = {
    id: activityData.id,
    name: activityData.name || `Activity ${new Date(startTime).toLocaleDateString()}`,
    type: activityData.type || 'run',
    startTime,
    endTime,
    duration,
    distance,
    formattedDistance: formatDistance(distance),
    formattedDuration: formatDuration(duration),
    avgHeartRate,
    maxHeartRate: heartRateData.length ? Math.max(...heartRateData.map(d => d.value)) : 0,
    avgPower,
    maxPower: powerData.length ? Math.max(...powerData.map(d => d.value)) : 0,
    avgCadence,
    avgPace,
    elevationGain,
    tss,
  };
  
  // Add advanced metrics if data is available
  if (sensorData.some(data => data.dataType === 'ground_contact_time')) {
    summary.avgGroundContactTime = calculateAverageForType(sensorData, 'ground_contact_time');
  }
  
  if (sensorData.some(data => data.dataType === 'vertical_oscillation')) {
    summary.avgVerticalOscillation = calculateAverageForType(sensorData, 'vertical_oscillation');
  }
  
  if (sensorData.some(data => data.dataType === 'leg_spring_stiffness')) {
    summary.avgLegSpringStiffness = calculateAverageForType(sensorData, 'leg_spring_stiffness');
  }
  
  return summary;
};

/**
 * Calculates the total distance from location data points
 * @param {Array} locationData - Array of location data points
 * @returns {number} Total distance in meters
 */
const calculateTotalDistance = (locationData) => {
  if (!locationData || locationData.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  for (let i = 1; i < locationData.length; i++) {
    totalDistance += calculateDistanceBetweenPoints(
      locationData[i-1].latitude, 
      locationData[i-1].longitude,
      locationData[i].latitude, 
      locationData[i].longitude
    );
  }
  
  return totalDistance;
};

/**
 * Calculates distance between two geographic coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const calculateDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Calculates elevation gain from location data
 * @param {Array} locationData - Array of location data points with altitude
 * @returns {number} Total elevation gain in meters
 */
const calculateElevationGain = (locationData) => {
  if (!locationData || locationData.length < 2) {
    return 0;
  }
  
  let gain = 0;
  for (let i = 1; i < locationData.length; i++) {
    const elevationDiff = locationData[i].altitude - locationData[i-1].altitude;
    // Only count positive elevation changes (gains)
    if (elevationDiff > 0) {
      gain += elevationDiff;
    }
  }
  
  return gain;
};

/**
 * Calculates average from an array of numeric values
 * @param {Array} values - Array of numeric values
 * @returns {number} Average value
 */
const calculateAverage = (values) => {
  if (!values || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

/**
 * Calculates average for a specific sensor data type
 * @param {Array} sensorData - Array of sensor data points
 * @param {string} dataType - Type of sensor data to average
 * @returns {number} Average value for the specified data type
 */
const calculateAverageForType = (sensorData, dataType) => {
  const relevantData = sensorData.filter(data => data.dataType === dataType);
  return calculateAverage(relevantData.map(d => d.value));
};

/**
 * Groups activity data by time intervals for charting
 * @param {Array} sensorData - Array of sensor data points
 * @param {string} dataType - Type of sensor data to group
 * @param {number} intervalSeconds - Interval size in seconds
 * @returns {Array} Grouped data for charting
 */
const groupDataForCharts = (sensorData, dataType, intervalSeconds = 60) => {
  if (!sensorData || sensorData.length === 0) {
    return [];
  }
  
  const relevantData = sensorData.filter(data => data.dataType === dataType);
  if (relevantData.length === 0) {
    return [];
  }
  
  const startTime = relevantData[0].timestamp;
  const groups = {};
  
  relevantData.forEach(data => {
    const timeOffset = Math.floor((data.timestamp - startTime) / (intervalSeconds * 1000));
    if (!groups[timeOffset]) {
      groups[timeOffset] = [];
    }
    groups[timeOffset].push(data.value);
  });
  
  return Object.keys(groups).map(key => {
    const values = groups[key];
    return {
      timeOffset: parseInt(key) * intervalSeconds,
      value: calculateAverage(values)
    };
  }).sort((a, b) => a.timeOffset - b.timeOffset);
};

/**
 * Creates pace zones distribution for the activity
 * @param {Array} locationData - Array of location data points
 * @param {number} intervalDistance - Distance interval in meters
 * @returns {Object} Pace zones distribution
 */
const calculatePaceDistribution = (locationData, intervalDistance = 1000) => {
  if (!locationData || locationData.length < 2) {
    return {};
  }
  
  // Implementation would calculate pace for each segment and count distribution
  // Complex implementation omitted for brevity
  
  return {
    // Example response structure
    // '<5:00': 10, // percentage of distance at this pace
    // '5:00-5:30': 25,
    // '5:30-6:00': 40,
    // '6:00-6:30': 20,
    // '>6:30': 5
  };
};

export {
  generateActivitySummary,
  calculateTotalDistance,
  calculateElevationGain,
  groupDataForCharts,
  calculatePaceDistribution
};