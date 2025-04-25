/**
 * useActivity.js
 * Custom hook for managing activity state and operations
 */

import { useContext, useCallback } from 'react';
import { ActivityContext } from '../context/ActivityContext';
import { useBleConnection } from './useBleConnection';
import { useLocationTracking } from './useLocationTracking';
import { generateActivitySummary } from '../services/activity/activitySummary';
import { activityRepository } from '../database/repositories/activityRepository';
import { sensorRepository } from '../database/repositories/sensorRepository';
import { mmkvStorage } from '../database/cache/mmkvStorage';
import { generateUUID } from '../utils/formatters';
import { useTimer } from './useTimer';

/**
 * Hook to manage activity tracking state and operations
 * @returns {Object} Activity state and methods
 */
const useActivity = () => {
  const { 
    state: { 
      isActive,
      isPaused,
      currentActivity,
      currentMetrics,
      error 
    }, 
    dispatch 
  } = useContext(ActivityContext);
  
  const { connectedDevices } = useBleConnection();
  const { 
    currentLocation, 
    startLocationTracking, 
    stopLocationTracking,
    locationHistory 
  } = useLocationTracking();
  
  const { 
    time: elapsedTime, 
    start: startTimer, 
    stop: stopTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer 
  } = useTimer();
  
  /**
   * Starts a new activity tracking session
   * @param {string} activityName - Optional name for the activity
   * @param {string} activityType - Type of activity (default: 'run')
   */
  const startActivity = useCallback(async (activityName = '', activityType = 'run') => {
    try {
      // Check if an activity is already in progress
      if (isActive) {
        throw new Error('An activity is already in progress');
      }
      
      // Check if we have connected devices
      if (connectedDevices.length === 0) {
        console.warn('No connected devices found. Starting activity with only phone sensors.');
      }
      
      // Generate a new activity ID
      const activityId = generateUUID();
      const startTime = Date.now();
      
      // Create activity object
      const newActivity = {
        id: activityId,
        name: activityName || `Activity ${new Date(startTime).toLocaleDateString()}`,
        type: activityType,
        startTime,
        deviceIds: connectedDevices.map(device => device.id),
        sensorData: [],
        locationData: []
      };
      
      // Start location tracking
      await startLocationTracking();
      
      // Start timer
      startTimer();
      
      // Save activity to cache
      mmkvStorage.set(`activity.current`, JSON.stringify(newActivity));
      
      // Update context
      dispatch({
        type: 'START_ACTIVITY',
        payload: newActivity
      });
      
      // Return the activity ID
      return activityId;
    } catch (error) {
      console.error('Failed to start activity:', error);
      dispatch({
        type: 'ACTIVITY_ERROR',
        payload: error.message
      });
      return null;
    }
  }, [isActive, connectedDevices, dispatch, startLocationTracking, startTimer]);
  
  /**
   * Pauses the current activity
   */
  const pauseActivity = useCallback(() => {
    if (!isActive || isPaused) {
      return;
    }
    
    pauseTimer();
    
    dispatch({
      type: 'PAUSE_ACTIVITY'
    });
    
    // Optional: Reduce sensor data collection frequency during pause
    
  }, [isActive, isPaused, pauseTimer, dispatch]);
  
  /**
   * Resumes a paused activity
   */
  const resumeActivity = useCallback(() => {
    if (!isActive || !isPaused) {
      return;
    }
    
    resumeTimer();
    
    dispatch({
      type: 'RESUME_ACTIVITY'
    });
    
    // Optional: Restore normal sensor data collection frequency
    
  }, [isActive, isPaused, resumeTimer, dispatch]);
  
  /**
   * Stops and saves the current activity
   * @returns {Object} The saved activity summary
   */
  const stopActivity = useCallback(async () => {
    try {
      if (!isActive) {
        throw new Error('No activity in progress');
      }
      
      // Stop timer
      stopTimer();
      
      // Stop location tracking
      await stopLocationTracking();
      
      // Get the last recorded metrics
      const endTime = Date.now();
      
      // Update the activity with end time and location data
      const completedActivity = {
        ...currentActivity,
        endTime,
        duration: endTime - currentActivity.startTime,
        locationData: locationHistory
      };
      
      // Generate activity summary
      const activitySummary = generateActivitySummary(completedActivity);
      
      // Save activity to database
      await activityRepository.saveActivity(activitySummary);
      
      // Save sensor data
      if (completedActivity.sensorData.length > 0) {
        await sensorRepository.saveSensorData(completedActivity.id, completedActivity.sensorData);
      }
      
      // Clear activity from cache
      mmkvStorage.delete('activity.current');
      
      // Reset the context
      dispatch({
        type: 'STOP_ACTIVITY',
        payload: activitySummary
      });
      
      // Reset the timer
      resetTimer();
      
      return activitySummary;
    } catch (error) {
      console.error('Failed to stop activity:', error);
      dispatch({
        type: 'ACTIVITY_ERROR',
        payload: error.message
      });
      return null;
    }
  }, [isActive, currentActivity, stopTimer, stopLocationTracking, locationHistory, dispatch, resetTimer]);
  
  /**
   * Discards the current activity without saving
   */
  const discardActivity = useCallback(() => {
    if (!isActive) {
      return;
    }
    
    // Stop timer
    stopTimer();
    resetTimer();
    
    // Stop location tracking
    stopLocationTracking();
    
    // Clear activity from cache
    mmkvStorage.delete('activity.current');
    
    // Reset the context
    dispatch({
      type: 'DISCARD_ACTIVITY'
    });
    
  }, [isActive, stopTimer, resetTimer, stopLocationTracking, dispatch]);
  
  /**
   * Updates current activity with new sensor data
   * @param {Object} data - Sensor data to add
   */
  const updateActivityWithSensorData = useCallback((data) => {
    if (!isActive || isPaused) {
      return;
    }
    
    dispatch({
      type: 'UPDATE_SENSOR_DATA',
      payload: data
    });
    
    // Also update metrics based on new sensor data
    updateCurrentMetrics();
    
  }, [isActive, isPaused, dispatch]);
  
  /**
   * Updates current metrics based on accumulated data
   */
  const updateCurrentMetrics = useCallback(() => {
    if (!isActive) {
      return;
    }
    
    // Calculate current metrics based on sensor and location data
    // This is a simplified implementation
    
    const distance = locationHistory.length > 0 
      ? calculateDistanceFromLocations(locationHistory)
      : 0;
    
    const currentTime = elapsedTime / 1000; // Convert ms to seconds
    
    // Extract the latest sensor values
    const latestHeartRate = getLatestSensorValue('heart_rate') || 0;
    const latestPower = getLatestSensorValue('power') || 0;
    const latestCadence = getLatestSensorValue('cadence') || 0;
    
    // Calculate pace (time per kilometer)
    const pace = distance > 0 ? (currentTime / distance) * 1000 : 0;
    
    const metrics = {
      distance,
      pace,
      elapsedTime: currentTime,
      heartRate: latestHeartRate,
      power: latestPower,
      cadence: latestCadence
    };
    
    dispatch({
      type: 'UPDATE_METRICS',
      payload: metrics
    });
    
  }, [isActive, locationHistory, elapsedTime, dispatch]);
  
  /**
   * Gets the latest value for a specific sensor type
   * @param {string} sensorType - Type of sensor data
   * @returns {number|null} Latest value or null if not available
   */
  const getLatestSensorValue = useCallback((sensorType) => {
    if (!currentActivity || !currentActivity.sensorData) {
      return null;
    }
    
    const sensorData = currentActivity.sensorData
      .filter(data => data.dataType === sensorType)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return sensorData.length > 0 ? sensorData[0].value : null;
  }, [currentActivity]);
  
  /**
   * Calculates distance from location data points
   * @param {Array} locations - Array of location data points
   * @returns {number} Total distance in meters
   */
  const calculateDistanceFromLocations = (locations) => {
    if (!locations || locations.length < 2) {
      return 0;
    }
    
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      totalDistance += calculateDistanceBetweenPoints(
        locations[i-1].latitude, 
        locations[i-1].longitude,
        locations[i].latitude, 
        locations[i].longitude
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
   * Retrieves an activity by ID
   * @param {string} activityId - ID of the activity to retrieve
   * @returns {Promise<Object>} The activity data
   */
  const getActivityById = useCallback(async (activityId) => {
    try {
      return await activityRepository.getActivityById(activityId);
    } catch (error) {
      console.error(`Failed to get activity ${activityId}:`, error);
      return null;
    }
  }, []);
  
  /**
   * Retrieves all saved activities
   * @returns {Promise<Array>} Array of activity data
   */
  const getAllActivities = useCallback(async () => {
    try {
      return await activityRepository.getAllActivities();
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }, []);
  
  return {
    // State
    isActive,
    isPaused,
    currentActivity,
    currentMetrics,
    error,
    elapsedTime,
    
    // Methods
    startActivity,
    pauseActivity,
    resumeActivity,
    stopActivity,
    discardActivity,
    updateActivityWithSensorData,
    getActivityById,
    getAllActivities
  };
};

export { useActivity };