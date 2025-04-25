/**
 * Utility functions for performance and sensor calculations
 * Provides performance metric calculations, statistical operations,
 * distance and route calculations, and sport-specific formulas
 */

// Physical and mathematical constants
export const CONSTANTS = {
    EARTH_RADIUS: 6371000, // Earth radius in meters
    GRAVITY: 9.80665, // Gravitational acceleration in m/s²
    PI: Math.PI,
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI
  };
  
  // Named calculation formulas
  export const FORMULAS = {
    HAVERSINE: 'haversine',
    PACE_FROM_SPEED: 'pace_from_speed',
    SPEED_FROM_PACE: 'speed_from_pace',
    CALORIES_RUNNING: 'calories_running',
    NORMALIZED_POWER: 'normalized_power',
    TRAINING_STRESS_SCORE: 'training_stress_score'
  };
  
  // Unit conversion multipliers
  export const CONVERSION_FACTORS = {
    METERS_TO_KM: 0.001,
    METERS_TO_MILES: 0.000621371,
    KM_TO_MILES: 0.621371,
    MILES_TO_KM: 1.60934,
    MPS_TO_KMH: 3.6,
    MPS_TO_MPH: 2.23694,
    MPS_TO_PACE: 16.6667, // m/s to min/km (1000/60)
    KMH_TO_MPS: 0.277778,
    MPH_TO_MPS: 0.44704
  };
  
  /**
   * Calculates moving average
   * @param {Array} values - Data points
   * @param {number} window - Window size
   * @returns {number} Calculated average
   */
  export function calculateMovingAverage(values, window = 5) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
    
    // If fewer values than window, use all values
    const effectiveWindow = Math.min(window, values.length);
    const recentValues = values.slice(-effectiveWindow);
    
    // Calculate sum
    const sum = recentValues.reduce((total, value) => total + value, 0);
    
    // Return the average
    return sum / effectiveWindow;
  }
  
  /**
   * Calculates distance between GPS points
   * @param {Object} point1 - First GPS coordinate
   * @param {Object} point2 - Second GPS coordinate
   * @returns {number} Distance in meters
   */
  export function calculateDistance(point1, point2) {
    if (!point1 || !point2 || 
        !point1.latitude || !point1.longitude || 
        !point2.latitude || !point2.longitude) {
      return 0;
    }
    
    // Convert latitude and longitude from degrees to radians
    const lat1 = point1.latitude * CONSTANTS.DEG_TO_RAD;
    const lon1 = point1.longitude * CONSTANTS.DEG_TO_RAD;
    const lat2 = point2.latitude * CONSTANTS.DEG_TO_RAD;
    const lon2 = point2.longitude * CONSTANTS.DEG_TO_RAD;
    
    // Haversine formula
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = CONSTANTS.EARTH_RADIUS * c;
    
    return distance;
  }
  
  /**
   * Calculates pace from speed
   * @param {number} speedMps - Speed in meters per second
   * @returns {number} Pace in seconds per kilometer
   */
  export function calculatePace(speedMps) {
    if (!speedMps || speedMps <= 0) {
      return 0;
    }
    
    // Convert m/s to seconds per kilometer
    return 1000 / speedMps;
  }
  
  /**
   * Calculates speed from pace
   * @param {number} paceSecs - Pace in seconds per kilometer
   * @returns {number} Speed in meters per second
   */
  export function calculateSpeed(paceSecs) {
    if (!paceSecs || paceSecs <= 0) {
      return 0;
    }
    
    // Convert seconds per kilometer to m/s
    return 1000 / paceSecs;
  }
  
  /**
   * Calculates power zones
   * @param {number} ftp - Functional threshold power
   * @returns {Array} Power zone boundaries
   */
  export function calculatePowerZones(ftp) {
    if (!ftp || ftp <= 0) {
      return [];
    }
    
    // Standard power zones based on % of FTP
    return [
      { zone: 1, name: 'Recovery', lower: 0, upper: Math.round(0.55 * ftp) },
      { zone: 2, name: 'Endurance', lower: Math.round(0.55 * ftp) + 1, upper: Math.round(0.75 * ftp) },
      { zone: 3, name: 'Tempo', lower: Math.round(0.75 * ftp) + 1, upper: Math.round(0.90 * ftp) },
      { zone: 4, name: 'Threshold', lower: Math.round(0.90 * ftp) + 1, upper: Math.round(1.05 * ftp) },
      { zone: 5, name: 'VO2 Max', lower: Math.round(1.05 * ftp) + 1, upper: Math.round(1.20 * ftp) },
      { zone: 6, name: 'Anaerobic', lower: Math.round(1.20 * ftp) + 1, upper: Math.round(1.50 * ftp) },
      { zone: 7, name: 'Sprint', lower: Math.round(1.50 * ftp) + 1, upper: Infinity }
    ];
  }
  
  /**
   * Calculates heart rate zones
   * @param {number} maxHr - Maximum heart rate
   * @returns {Array} Heart rate zone boundaries
   */
  export function calculateHeartRateZones(maxHr) {
    if (!maxHr || maxHr <= 0) {
      return [];
    }
    
    // Standard heart rate zones based on % of max HR
    return [
      { zone: 1, name: 'Very Light', lower: 0, upper: Math.round(0.60 * maxHr) },
      { zone: 2, name: 'Light', lower: Math.round(0.60 * maxHr) + 1, upper: Math.round(0.70 * maxHr) },
      { zone: 3, name: 'Moderate', lower: Math.round(0.70 * maxHr) + 1, upper: Math.round(0.80 * maxHr) },
      { zone: 4, name: 'Hard', lower: Math.round(0.80 * maxHr) + 1, upper: Math.round(0.90 * maxHr) },
      { zone: 5, name: 'Maximum', lower: Math.round(0.90 * maxHr) + 1, upper: Infinity }
    ];
  }
  
  /**
   * Calculates elevation gain/loss
   * @param {Array} elevationPoints - Elevation readings
   * @returns {Object} Total gain and loss
   */
  export function calculateElevation(elevationPoints) {
    if (!Array.isArray(elevationPoints) || elevationPoints.length < 2) {
      return { gain: 0, loss: 0 };
    }
    
    let gain = 0;
    let loss = 0;
    
    // Calculate cumulative elevation changes
    for (let i = 1; i < elevationPoints.length; i++) {
      const current = elevationPoints[i];
      const previous = elevationPoints[i-1];
      
      // Skip invalid readings
      if (current === null || previous === null) {
        continue;
      }
      
      const diff = current - previous;
      
      // Filter out small changes (noise)
      const ELEVATION_THRESHOLD = 0.3; // meters
      
      if (diff > ELEVATION_THRESHOLD) {
        gain += diff;
      } else if (diff < -ELEVATION_THRESHOLD) {
        loss += Math.abs(diff);
      }
    }
    
    return { gain, loss };
  }
  
  /**
   * Calculates Training Stress Score
   * @param {number} normPower - Normalized power
   * @param {number} duration - Duration in seconds
   * @param {number} ftp - Functional threshold power
   * @param {number} currentTSS - Current TSS value (optional)
   * @returns {number} TSS value
   */
  export function calculateTSS(normPower, duration, ftp, currentTSS = 0) {
    if (!normPower || !duration || !ftp || normPower <= 0 || duration <= 0 || ftp <= 0) {
      return currentTSS;
    }
    
    const intensityFactor = normPower / ftp;
    const hourDuration = duration / 3600; // convert seconds to hours
    
    const tss = (intensityFactor * intensityFactor) * hourDuration * 100;
    return currentTSS + tss;
  }
  
  /**
   * Calculates normalized power from a series of power readings
   * @param {Array} powerReadings - Array of power values
   * @returns {number} Normalized power
   */
  export function calculateNormalizedPower(powerReadings) {
    if (!Array.isArray(powerReadings) || powerReadings.length < 30) {
      return 0;
    }
    
    // Step 1: Calculate 30-second moving average
    const window = 30;
    const movingAverages = [];
    
    for (let i = 0; i <= powerReadings.length - window; i++) {
      const slice = powerReadings.slice(i, i + window);
      const average = slice.reduce((sum, value) => sum + value, 0) / window;
      movingAverages.push(average);
    }
    
    // Step 2: Raise each average to the 4th power
    const fourthPower = movingAverages.map(value => Math.pow(value, 4));
    
    // Step 3: Calculate the average of the 4th power values
    const averageFourthPower = fourthPower.reduce((sum, value) => sum + value, 0) / fourthPower.length;
    
    // Step 4: Take the 4th root of the average
    return Math.pow(averageFourthPower, 0.25);
  }
  
  /**
   * Calculates vertical oscillation ratio
   * @param {number} oscillation - Vertical oscillation in cm
   * @param {number} strideLength - Stride length in cm
   * @returns {number} Vertical ratio percentage
   */
  export function calculateVerticalRatio(oscillation, strideLength) {
    if (!oscillation || !strideLength || oscillation <= 0 || strideLength <= 0) {
      return 0;
    }
    
    return (oscillation / strideLength) * 100;
  }
  
  /**
   * Calculates leg spring stiffness
   * @param {number} verticalOscillation - Vertical oscillation in cm
   * @param {number} groundContactTime - Ground contact time in ms
   * @param {number} weight - Runner weight in kg
   * @returns {number} Leg spring stiffness value
   */
  export function calculateLegSpringStiffness(verticalOscillation, groundContactTime, weight) {
    if (!verticalOscillation || !groundContactTime || !weight || 
        verticalOscillation <= 0 || groundContactTime <= 0 || weight <= 0) {
      return 0;
    }
    
    // Convert vertical oscillation from cm to m
    const oscillationMeters = verticalOscillation / 100;
    
    // Convert ground contact time from ms to s
    const contactSeconds = groundContactTime / 1000;
    
    // Calculate leg spring stiffness (kN/m)
    // Formula: kleg = (mass * π) / (tc * (tf + tc))
    // where tf is flight time, estimated as: tf = 2 * (oscillation / g)^0.5 - tc
    
    const gravityAccel = CONSTANTS.GRAVITY;
    const flightTime = 2 * Math.sqrt(oscillationMeters / gravityAccel) - contactSeconds;
    
    if (flightTime <= 0 || contactSeconds <= 0) {
      return 0;
    }
    
    const kleg = (weight * Math.PI) / (contactSeconds * (flightTime + contactSeconds));
    
    // Return value in kN/m
    return kleg;
  }
  
  /**
   * Smooths GPS track using a simple algorithm
   * @param {Array} points - Array of GPS coordinates
   * @param {number} tolerance - Distance tolerance in meters
   * @returns {Array} Filtered GPS points
   */
  export function smoothGpsTrack(points, tolerance = 5) {
    if (!Array.isArray(points) || points.length <= 2) {
      return points;
    }
    
    const result = [points[0]];
    let lastPoint = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const distance = calculateDistance(lastPoint, point);
      
      // Keep point if it's far enough from the last kept point
      if (distance >= tolerance) {
        result.push(point);
        lastPoint = point;
      }
    }
    
    // Always include the last point
    if (points.length > 1) {
      result.push(points[points.length - 1]);
    }
    
    return result;
  }
  
  /**
   * Estimates calories burned during running
   * @param {number} weight - Runner weight in kg
   * @param {number} distance - Distance in meters
   * @param {number} duration - Duration in seconds
   * @returns {number} Estimated calories burned
   */
  export function calculateCaloriesBurned(weight, distance, duration) {
    if (!weight || !distance || !duration || weight <= 0 || distance <= 0 || duration <= 0) {
      return 0;
    }
    
    // Convert distance to kilometers
    const distanceKm = distance / 1000;
    
    // Convert duration to hours
    const durationHours = duration / 3600;
    
    // Calculate pace in min/km
    const paceMinKm = (durationHours * 60) / distanceKm;
    
    // Estimate MET based on pace
    let met = 0;
    if (paceMinKm < 4) {
      met = 23.0; // Very fast running (< 4:00 min/km)
    } else if (paceMinKm < 5) {
      met = 19.0; // Fast running (4:00-5:00 min/km)
    } else if (paceMinKm < 6) {
      met = 14.5; // Medium-fast running (5:00-6:00 min/km)
    } else if (paceMinKm < 8) {
      met = 11.5; // Jogging (6:00-8:00 min/km)
    } else if (paceMinKm < 10) {
      met = 8.3;  // Slow jogging (8:00-10:00 min/km)
    } else {
      met = 6.0;  // Fast walking (> 10:00 min/km)
    }
    
    // Calculate calories: MET * weight * duration in hours
    return met * weight * durationHours;
  }
  
  export default {
    calculateMovingAverage,
    calculateDistance,
    calculatePace,
    calculateSpeed,
    calculatePowerZones,
    calculateHeartRateZones,
    calculateElevation,
    calculateTSS,
    calculateNormalizedPower,
    calculateVerticalRatio,
    calculateLegSpringStiffness,
    smoothGpsTrack,
    calculateCaloriesBurned,
    CONSTANTS,
    FORMULAS,
    CONVERSION_FACTORS
  };