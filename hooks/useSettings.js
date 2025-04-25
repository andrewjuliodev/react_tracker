import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';

/**
 * Hook to access and manage application settings
 * 
 * @returns {Object} Settings context with helper functions
 * - settings: Current settings state object
 * - updateSetting: Function to update a specific setting
 * - resetSettings: Function to reset all settings to defaults
 * - markFirstLaunchComplete: Function to mark onboarding as complete
 * - importSettings: Function to bulk import settings
 * - getDisplayValue: Helper to get formatted display value for a setting
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  const { settings, updateSetting, resetSettings, markFirstLaunchComplete, importSettings } = context;
  
  /**
   * Get display-friendly value for a setting based on its key
   * 
   * @param {string} key - The setting key
   * @returns {string} Formatted display value
   */
  const getDisplayValue = (key) => {
    if (key === undefined) return '';
    
    const value = settings[key];
    
    // Format based on setting type
    switch (key) {
      case 'metricUnits':
        return value ? 'Metric (km, kg)' : 'Imperial (mi, lb)';
      
      case 'recordingInterval':
        return `${value} ms`;
      
      case 'gpsAccuracyLevel':
        return value.charAt(0).toUpperCase() + value.slice(1);
      
      case 'autoSaveThreshold':
        return `${value} min`;
      
      case 'dataRetentionPeriod':
        if (value === 0) return 'Forever';
        return `${value} days`;
      
      case 'heartRateMax':
      case 'heartRateMin':
        return `${value} bpm`;
      
      case 'paceMax':
      case 'paceMin':
        const unit = settings.metricUnits ? 'min/km' : 'min/mi';
        return `${value} ${unit}`;
      
      // Boolean values
      case 'useBiometricAuth':
      case 'enableNotifications':
      case 'enableBackgroundTracking':
      case 'saveActivityAutomatically':
      case 'showHeartRate':
      case 'showPace':
      case 'showCadence':
      case 'showPower':
      case 'showGroundContactTime':
      case 'showVerticalOscillation':
      case 'heartRateAlerts':
      case 'paceAlerts':
        return value ? 'Enabled' : 'Disabled';
      
      default:
        // Handle different types of values
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        } else if (value === null || value === undefined) {
          return 'Not set';
        } else {
          return String(value);
        }
    }
  };
  
  /**
   * Check if a feature is enabled based on settings
   * 
   * @param {string} feature - Feature identifier
   * @returns {boolean} Whether feature is enabled
   */
  const isFeatureEnabled = (feature) => {
    switch (feature) {
      case 'biometricAuth':
        return settings.useBiometricAuth;
      
      case 'backgroundTracking':
        return settings.enableBackgroundTracking;
      
      case 'notifications':
        return settings.enableNotifications;
      
      case 'autoSave':
        return settings.saveActivityAutomatically;
      
      case 'heartRateAlerts':
        return settings.heartRateAlerts && settings.showHeartRate;
      
      case 'paceAlerts':
        return settings.paceAlerts && settings.showPace;
      
      default:
        return false;
    }
  };
  
  /**
   * Get unit system (metric or imperial) for a specific measurement type
   * 
   * @param {string} measurementType - Type of measurement (distance, weight, etc.)
   * @returns {string} Unit string for the measurement
   */
  const getUnitSystem = (measurementType) => {
    const isMetric = settings.metricUnits;
    
    switch (measurementType) {
      case 'distance':
        return isMetric ? 'km' : 'mi';
      
      case 'smallDistance':
        return isMetric ? 'm' : 'ft';
      
      case 'pace':
        return isMetric ? 'min/km' : 'min/mi';
      
      case 'speed':
        return isMetric ? 'km/h' : 'mph';
      
      case 'weight':
        return isMetric ? 'kg' : 'lb';
      
      case 'temperature':
        return isMetric ? '°C' : '°F';
      
      case 'elevation':
        return isMetric ? 'm' : 'ft';
      
      default:
        return '';
    }
  };
  
  /**
   * Convert a value between metric and imperial units
   * 
   * @param {number} value - Value to convert
   * @param {string} type - Type of measurement to convert
   * @param {boolean} toMetric - Whether to convert to metric (true) or imperial (false)
   * @returns {number} Converted value
   */
  const convertUnit = (value, type, toMetric) => {
    if (value === null || value === undefined) return value;
    
    // Convert based on direction and type
    switch (type) {
      case 'distance': // km <-> miles
        return toMetric ? value * 1.60934 : value / 1.60934;
      
      case 'smallDistance': // m <-> feet
        return toMetric ? value * 0.3048 : value / 0.3048;
      
      case 'weight': // kg <-> pounds
        return toMetric ? value * 0.453592 : value / 0.453592;
      
      case 'temperature': // C <-> F
        if (toMetric) {
          return (value - 32) * 5/9;
        } else {
          return (value * 9/5) + 32;
        }
      
      case 'pace': // min/km <-> min/mile
        if (value === 0) return 0;
        return toMetric ? value / 1.60934 : value * 1.60934;
      
      case 'speed': // km/h <-> mph
        return toMetric ? value * 1.60934 : value / 1.60934;
      
      default:
        return value;
    }
  };
  
  /**
   * Format a value based on its type with appropriate units
   * 
   * @param {number} value - Value to format
   * @param {string} type - Type of measurement
   * @returns {string} Formatted value with units
   */
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '';
    
    const unit = getUnitSystem(type);
    
    switch (type) {
      case 'distance':
        return `${value.toFixed(2)} ${unit}`;
      
      case 'smallDistance':
        return `${Math.round(value)} ${unit}`;
      
      case 'pace':
        // Format as minutes:seconds
        const minutes = Math.floor(value);
        const seconds = Math.round((value - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} ${unit}`;
      
      case 'speed':
        return `${value.toFixed(1)} ${unit}`;
      
      case 'weight':
        return `${value.toFixed(1)} ${unit}`;
      
      case 'temperature':
        return `${Math.round(value)}${unit}`;
      
      case 'heartRate':
        return `${Math.round(value)} bpm`;
      
      case 'cadence':
        return `${Math.round(value)} spm`;
      
      case 'power':
        return `${Math.round(value)} W`;
      
      case 'groundContactTime':
        return `${Math.round(value)} ms`;
      
      case 'verticalOscillation':
        const smallDistUnit = getUnitSystem('smallDistance');
        return `${value.toFixed(1)} ${smallDistUnit}`;
      
      default:
        return `${value}`;
    }
  };
  
  return {
    settings,
    updateSetting,
    resetSettings,
    markFirstLaunchComplete,
    importSettings,
    getDisplayValue,
    isFeatureEnabled,
    getUnitSystem,
    convertUnit,
    formatValue,
  };
};