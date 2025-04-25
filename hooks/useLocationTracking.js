import { useState, useEffect, useCallback } from 'react';
import locationTracker from '../services/location/locationTracker';
import { requestPermission, PERMISSIONS } from '../utils/permissions';
import logger from '../utils/logger';

/**
 * Custom React hook for location tracking in components.
 * Provides location tracking state access, position update subscription,
 * route data access, and location permission management.
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Location state and controls
 */
const useLocationTracking = (options = {}) => {
  // State for tracking status
  const [isTracking, setIsTracking] = useState(false);
  // State for current location
  const [currentLocation, setCurrentLocation] = useState(null);
  // State for location history
  const [locationHistory, setLocationHistory] = useState([]);
  // State for any errors
  const [error, setError] = useState(null);
  // State for permission status
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  // State for total distance
  const [distance, setDistance] = useState(0);
  // State for elevation data
  const [elevation, setElevation] = useState({ gain: 0, loss: 0, min: 0, max: 0, current: 0 });
  
  // Logger instance
  const moduleLogger = logger.createContextLogger('useLocationTracking');
  
  // Initialize location tracker on mount
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        // Check location permission
        const hasPermission = await requestPermission(PERMISSIONS.LOCATION, false);
        
        if (isMounted) {
          setPermissionStatus(hasPermission ? 'granted' : 'denied');
        }
        
        // Initialize location tracker
        if (hasPermission) {
          const success = await locationTracker.initialize();
          if (!success && isMounted) {
            setError('Failed to initialize location services');
          }
        }
      } catch (err) {
        if (isMounted) {
          moduleLogger.error('Location initialization error', err);
          setError(err.message);
        }
      }
    };
    
    init();
    
    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Update state when new locations are tracked
  useEffect(() => {
    // Set polling interval to update location history from the tracker
    const pollInterval = setInterval(() => {
      if (!isTracking) return;
      
      // Get latest data from tracker
      const history = locationTracker.getLocationHistory();
      const totalDistance = locationTracker.getTotalDistance();
      const elevationStats = locationTracker.getElevationStats();
      
      // Update state with latest values
      setLocationHistory(history);
      setDistance(totalDistance);
      setElevation(elevationStats);
      
      // Set current location to the most recent point
      if (history.length > 0) {
        setCurrentLocation(history[history.length - 1]);
      }
    }, 1000); // Poll every second
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [isTracking]);
  
  /**
   * Starts location tracking
   * @param {Object} trackingOptions - Tracking configuration
   * @returns {Promise<boolean>} Success state
   */
  const startTracking = useCallback(async (trackingOptions = {}) => {
    try {
      setError(null);
      
      // Request permission if needed
      const hasPermission = await requestPermission(PERMISSIONS.LOCATION);
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
      
      if (!hasPermission) {
        setError('Location permission required');
        return false;
      }
      
      // Merge default options with provided options
      const mergedOptions = {
        trackInBackground: false,
        ...trackingOptions
      };
      
      // Request background permission if needed
      if (mergedOptions.trackInBackground) {
        const hasBackgroundPermission = await requestPermission(PERMISSIONS.LOCATION_BACKGROUND);
        if (!hasBackgroundPermission) {
          moduleLogger.warn('Background location permission denied');
          // Continue anyway, will only track in foreground
        }
      }
      
      // Start tracking
      const success = await locationTracker.startTracking(mergedOptions);
      
      if (success) {
        setIsTracking(true);
        moduleLogger.info('Location tracking started');
      } else {
        setError('Failed to start location tracking');
      }
      
      return success;
    } catch (err) {
      moduleLogger.error('Error starting location tracking', err);
      setError(err.message);
      return false;
    }
  }, []);
  
  /**
   * Stops active location tracking
   * @returns {Promise<void>} Resolves when stopped
   */
  const stopTracking = useCallback(async () => {
    try {
      await locationTracker.stopTracking();
      setIsTracking(false);
      moduleLogger.info('Location tracking stopped');
    } catch (err) {
      moduleLogger.error('Error stopping location tracking', err);
      setError(err.message);
    }
  }, []);
  
  /**
   * Requests location permission if needed
   * @returns {Promise<boolean>} Whether permission granted
   */
  const requestLocationPermission = useCallback(async () => {
    try {
      const hasPermission = await requestPermission(PERMISSIONS.LOCATION);
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
      return hasPermission;
    } catch (err) {
      moduleLogger.error('Error requesting location permission', err);
      setError(err.message);
      return false;
    }
  }, []);
  
  /**
   * Gets current location once (not continuous tracking)
   * @returns {Promise<Object>} Current location
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      
      // Request permission if needed
      const hasPermission = await requestPermission(PERMISSIONS.LOCATION);
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
      
      if (!hasPermission) {
        setError('Location permission required');
        return null;
      }
      
      // Get current location
      const location = await locationTracker.getCurrentLocation();
      setCurrentLocation(location);
      return location;
    } catch (err) {
      moduleLogger.error('Error getting current location', err);
      setError(err.message);
      return null;
    }
  }, []);
  
  /**
   * Clears the location history
   */
  const clearLocationHistory = useCallback(() => {
    locationTracker.clearLocationHistory();
    setLocationHistory([]);
    setDistance(0);
    setElevation({ gain: 0, loss: 0, min: 0, max: 0, current: 0 });
    moduleLogger.info('Location history cleared');
  }, []);
  
  /**
   * Gets current distance traveled
   * @returns {number} Total distance in meters
   */
  const getDistance = useCallback(() => {
    return distance;
  }, [distance]);
  
  /**
   * Gets elevation data for route
   * @returns {Object} Elevation statistics
   */
  const getElevationData = useCallback(() => {
    return elevation;
  }, [elevation]);
  
  return {
    // State
    isTracking,
    currentLocation,
    locationHistory,
    error,
    permissionStatus,
    distance,
    elevation,
    
    // Methods
    startTracking,
    stopTracking,
    requestLocationPermission,
    getCurrentLocation,
    clearLocationHistory,
    getDistance,
    getElevationData
  };
};

export default useLocationTracking;