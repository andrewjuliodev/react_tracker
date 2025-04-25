/**
 * Utility functions for formatting values for display
 * Handles number and unit formatting, time and duration formatting,
 * pace and distance conversions, and date/timestamp handling
 */

// Display symbols for measurement units
export const UNITS = {
    DISTANCE: {
      METERS: 'm',
      KILOMETERS: 'km',
      MILES: 'mi'
    },
    PACE: {
      MIN_KM: 'min/km',
      MIN_MILE: 'min/mi'
    },
    SPEED: {
      KMH: 'km/h',
      MPH: 'mph',
      MS: 'm/s'
    },
    HEART_RATE: 'bpm',
    POWER: 'W',
    CADENCE: 'spm',
    ELEVATION: 'm',
    TEMPERATURE: '°C',
    VERTICAL_OSCILLATION: 'cm',
    GROUND_CONTACT_TIME: 'ms'
  };
  
  // Standard time display formats
  export const TIME_FORMATS = {
    TIME: 'HH:mm:ss',
    TIME_12H: 'h:mm:ss a',
    DATE: 'YYYY-MM-DD',
    DATE_TIME: 'YYYY-MM-DD HH:mm:ss',
    DATE_TIME_12H: 'YYYY-MM-DD h:mm:ss a',
    DAY_MONTH: 'D MMM',
    MONTH_YEAR: 'MMM YYYY'
  };
  
  // Standard precision by metric type
  export const DECIMAL_PLACES = {
    DISTANCE: 2,
    PACE: 0,
    SPEED: 1,
    POWER: 0,
    HEART_RATE: 0,
    CADENCE: 0,
    ELEVATION: 0,
    TEMPERATURE: 1
  };
  
  /**
   * Formats a number with proper units
   * @param {number} value - Raw value to format
   * @param {string} unit - Unit of measurement
   * @param {number} precision - Decimal places
   * @returns {string} Formatted value with unit
   */
  export function formatValue(value, unit, precision = 2) {
    if (value === undefined || value === null) {
      return '--';
    }
    
    // Handle zero or very small values
    if (Math.abs(value) < 0.0001) {
      return `0 ${unit}`;
    }
  
    const formattedValue = Number(value).toFixed(precision);
    return `${formattedValue} ${unit}`;
  }
  
  /**
   * Formats pace value (min/km)
   * @param {number} paceSeconds - Seconds per kilometer
   * @param {boolean} useImperial - Whether to use miles
   * @returns {string} Formatted pace string (MM:SS)
   */
  export function formatPace(paceSeconds, useImperial = false) {
    if (!paceSeconds || paceSeconds <= 0) {
      return '--:--';
    }
    
    // Convert to min/mile if imperial
    if (useImperial) {
      // 1 mile = 1.60934 kilometers
      paceSeconds = paceSeconds * 1.60934;
    }
    
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    
    const unit = useImperial ? UNITS.PACE.MIN_MILE : UNITS.PACE.MIN_KM;
    return `${minutes}:${seconds.toString().padStart(2, '0')} ${unit}`;
  }
  
  /**
   * Formats duration in seconds
   * @param {number} totalSeconds - Duration in seconds
   * @param {boolean} showHours - Whether to include hours
   * @returns {string} Formatted duration (HH:MM:SS or MM:SS)
   */
  export function formatDuration(totalSeconds, showHours = true) {
    if (totalSeconds === undefined || totalSeconds === null) {
      return showHours ? '--:--:--' : '--:--';
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (showHours || hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  /**
   * Formats distance in meters
   * @param {number} meters - Distance in meters
   * @param {boolean} useImperial - Whether to use miles
   * @returns {string} Formatted distance with unit
   */
  export function formatDistance(meters, useImperial = false) {
    if (meters === undefined || meters === null) {
      return '--';
    }
    
    if (useImperial) {
      // Convert to miles (1 mile = 1609.34 meters)
      const miles = meters / 1609.34;
      
      if (miles < 0.1) {
        // Show yards for short distances
        const yards = Math.round(meters * 1.09361);
        return `${yards} yd`;
      } else {
        return formatValue(miles, UNITS.DISTANCE.MILES, DECIMAL_PLACES.DISTANCE);
      }
    } else {
      // Metric
      if (meters < 1000) {
        return formatValue(meters, UNITS.DISTANCE.METERS, 0);
      } else {
        const kilometers = meters / 1000;
        return formatValue(kilometers, UNITS.DISTANCE.KILOMETERS, DECIMAL_PLACES.DISTANCE);
      }
    }
  }
  
  /**
   * Formats date timestamp
   * @param {number} timestamp - Unix timestamp
   * @param {string} format - Format style
   * @returns {string} Formatted date string
   */
  export function formatDate(timestamp, format = TIME_FORMATS.DATE_TIME) {
    if (!timestamp) {
      return '--';
    }
    
    const date = new Date(timestamp);
    
    // Use 24-hour or 12-hour time based on system preference
    const use24HourFormat = process.env.TIME_FORMAT_24H === 'true';
    
    if (format === TIME_FORMATS.TIME) {
      return use24HourFormat ? 
        formatTimeComponent(date) : 
        formatTimeComponent(date, true);
    }
    
    if (format === TIME_FORMATS.DATE) {
      return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
    }
    
    if (format === TIME_FORMATS.DATE_TIME) {
      return `${formatDate(timestamp, TIME_FORMATS.DATE)} ${formatDate(timestamp, TIME_FORMATS.TIME)}`;
    }
    
    if (format === TIME_FORMATS.DAY_MONTH) {
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
      return `${date.getDate()} ${month}`;
    }
    
    if (format === TIME_FORMATS.MONTH_YEAR) {
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
      return `${month} ${date.getFullYear()}`;
    }
    
    // Default format
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
  
  /**
   * Helper function to format time component
   * @param {Date} date - Date object
   * @param {boolean} use12Hour - Whether to use 12-hour format
   * @returns {string} Formatted time
   * @private
   */
  function formatTimeComponent(date, use12Hour = false) {
    if (use12Hour) {
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())} ${ampm}`;
    } else {
      return `${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
    }
  }
  
  /**
   * Pads single digit with leading zero
   * @param {number} num - Number to pad
   * @returns {string} Padded number
   * @private
   */
  function padZero(num) {
    return num.toString().padStart(2, '0');
  }
  
  /**
   * Formats heart rate value
   * @param {number} bpm - Beats per minute
   * @returns {string} Formatted heart rate with unit
   */
  export function formatHeartRate(bpm) {
    if (bpm === undefined || bpm === null) {
      return '--';
    }
    
    return formatValue(Math.round(bpm), UNITS.HEART_RATE, 0);
  }
  
  /**
   * Formats power value
   * @param {number} watts - Power in watts
   * @returns {string} Formatted power with unit
   */
  export function formatPower(watts) {
    if (watts === undefined || watts === null) {
      return '--';
    }
    
    return formatValue(Math.round(watts), UNITS.POWER, 0);
  }
  
  /**
   * Formats cadence value
   * @param {number} spm - Steps per minute
   * @returns {string} Formatted cadence with unit
   */
  export function formatCadence(spm) {
    if (spm === undefined || spm === null) {
      return '--';
    }
    
    return formatValue(Math.round(spm), UNITS.CADENCE, 0);
  }
  
  /**
   * Formats elevation value
   * @param {number} meters - Elevation in meters
   * @param {boolean} useImperial - Whether to use feet
   * @returns {string} Formatted elevation with unit
   */
  export function formatElevation(meters, useImperial = false) {
    if (meters === undefined || meters === null) {
      return '--';
    }
    
    if (useImperial) {
      // Convert to feet (1 meter = 3.28084 feet)
      const feet = meters * 3.28084;
      return formatValue(Math.round(feet), 'ft', 0);
    } else {
      return formatValue(Math.round(meters), UNITS.ELEVATION, 0);
    }
  }
  
  /**
   * Formats speed value
   * @param {number} metersPerSecond - Speed in m/s
   * @param {boolean} useImperial - Whether to use mph
   * @returns {string} Formatted speed with unit
   */
  export function formatSpeed(metersPerSecond, useImperial = false) {
    if (metersPerSecond === undefined || metersPerSecond === null || metersPerSecond <= 0) {
      return '--';
    }
    
    if (useImperial) {
      // Convert to mph (1 m/s = 2.23694 mph)
      const mph = metersPerSecond * 2.23694;
      return formatValue(mph, UNITS.SPEED.MPH, DECIMAL_PLACES.SPEED);
    } else {
      // Convert to km/h (1 m/s = 3.6 km/h)
      const kmh = metersPerSecond * 3.6;
      return formatValue(kmh, UNITS.SPEED.KMH, DECIMAL_PLACES.SPEED);
    }
  }
  
  /**
   * Formats temperature value
   * @param {number} celsius - Temperature in Celsius
   * @param {boolean} useImperial - Whether to use Fahrenheit
   * @returns {string} Formatted temperature with unit
   */
  export function formatTemperature(celsius, useImperial = false) {
    if (celsius === undefined || celsius === null) {
      return '--';
    }
    
    if (useImperial) {
      // Convert to Fahrenheit (°F = °C × 9/5 + 32)
      const fahrenheit = (celsius * 9/5) + 32;
      return formatValue(fahrenheit, '°F', DECIMAL_PLACES.TEMPERATURE);
    } else {
      return formatValue(celsius, UNITS.TEMPERATURE, DECIMAL_PLACES.TEMPERATURE);
    }
  }