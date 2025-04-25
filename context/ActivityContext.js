import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import activityManager from '../services/activity/activityManager';
import activityRecorder from '../services/activity/activityRecorder';
import activityMetrics from '../services/activity/activityMetrics';
import { useBle } from './BleContext';

// Initial state for the activity context
const initialState = {
  isRecording: false,           // Whether an activity is currently being recorded
  isPaused: false,              // Whether the current activity is paused
  currentActivity: null,        // Current activity being recorded
  currentMetrics: {},           // Current real-time metrics
  activityHistory: [],          // List of past activities
  elapsedTime: 0,               // Elapsed time in seconds of current activity
  distance: 0,                  // Distance covered in current activity (meters)
  currentLocations: [],         // GPS coordinates collected during current activity
  error: null,                  // Any activity-related errors
  selectedActivityId: null,     // Activity selected for viewing details
};

// Action types for the reducer
const ACTIVITY_ACTIONS = {
  START_RECORDING: 'START_RECORDING',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  RESUME_RECORDING: 'RESUME_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  UPDATE_METRICS: 'UPDATE_METRICS',
  ADD_LOCATION: 'ADD_LOCATION',
  UPDATE_ELAPSED_TIME: 'UPDATE_ELAPSED_TIME',
  UPDATE_DISTANCE: 'UPDATE_DISTANCE',
  LOAD_ACTIVITY_HISTORY: 'LOAD_ACTIVITY_HISTORY',
  ADD_TO_HISTORY: 'ADD_TO_HISTORY',
  SELECT_ACTIVITY: 'SELECT_ACTIVITY',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET_CURRENT_ACTIVITY: 'RESET_CURRENT_ACTIVITY',
};

// Reducer function for Activity state
function activityReducer(state, action) {
  switch (action.type) {
    case ACTIVITY_ACTIONS.START_RECORDING:
      return {
        ...state,
        isRecording: true,
        isPaused: false,
        currentActivity: action.payload,
        elapsedTime: 0,
        distance: 0,
        currentLocations: [],
        currentMetrics: {},
        error: null,
      };
    case ACTIVITY_ACTIONS.PAUSE_RECORDING:
      return {
        ...state,
        isPaused: true,
      };
    case ACTIVITY_ACTIONS.RESUME_RECORDING:
      return {
        ...state,
        isPaused: false,
      };
    case ACTIVITY_ACTIONS.STOP_RECORDING:
      return {
        ...state,
        isRecording: false,
        isPaused: false,
      };
    case ACTIVITY_ACTIONS.UPDATE_METRICS:
      return {
        ...state,
        currentMetrics: {
          ...state.currentMetrics,
          ...action.payload,
        },
      };
    case ACTIVITY_ACTIONS.ADD_LOCATION:
      return {
        ...state,
        currentLocations: [...state.currentLocations, action.payload],
      };
    case ACTIVITY_ACTIONS.UPDATE_ELAPSED_TIME:
      return {
        ...state,
        elapsedTime: action.payload,
      };
    case ACTIVITY_ACTIONS.UPDATE_DISTANCE:
      return {
        ...state,
        distance: action.payload,
      };
    case ACTIVITY_ACTIONS.LOAD_ACTIVITY_HISTORY:
      return {
        ...state,
        activityHistory: action.payload,
      };
    case ACTIVITY_ACTIONS.ADD_TO_HISTORY:
      return {
        ...state,
        activityHistory: [action.payload, ...state.activityHistory],
      };
    case ACTIVITY_ACTIONS.SELECT_ACTIVITY:
      return {
        ...state,
        selectedActivityId: action.payload,
      };
    case ACTIVITY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case ACTIVITY_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case ACTIVITY_ACTIONS.RESET_CURRENT_ACTIVITY:
      return {
        ...state,
        currentActivity: null,
        isRecording: false,
        isPaused: false,
        elapsedTime: 0,
        distance: 0,
        currentLocations: [],
        currentMetrics: {},
      };
    default:
      return state;
  }
}

// Create context
const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(activityReducer, initialState);
  const { state: bleState } = useBle();

  // Load activity history on mount
  useEffect(() => {
    const loadActivityHistory = async () => {
      try {
        const history = await activityManager.getActivityHistory();
        dispatch({
          type: ACTIVITY_ACTIONS.LOAD_ACTIVITY_HISTORY,
          payload: history,
        });
      } catch (error) {
        console.error('Error loading activity history:', error);
        dispatch({
          type: ACTIVITY_ACTIONS.SET_ERROR,
          payload: 'Failed to load activity history',
        });
      }
    };

    loadActivityHistory();
  }, []);

  // Handle app state changes to manage recording sessions properly
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (state.isRecording && !state.isPaused && nextAppState !== 'active') {
        // App going to background while recording - pause recording
        pauseRecording();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [state.isRecording, state.isPaused]);

  // Update metrics from BLE devices
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      // Process BLE device data into activity metrics
      const metrics = activityMetrics.processDeviceData(bleState.deviceData);
      
      if (Object.keys(metrics).length > 0) {
        dispatch({
          type: ACTIVITY_ACTIONS.UPDATE_METRICS,
          payload: metrics,
        });
      }
    }
  }, [bleState.deviceData, state.isRecording, state.isPaused]);

  // Start recording a new activity
  const startRecording = async (activityType = 'run') => {
    try {
      const newActivity = {
        id: uuidv4(),
        type: activityType,
        startTime: new Date().toISOString(),
        endTime: null,
        connectedDevices: bleState.connectedDevices.map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
        })),
      };

      dispatch({
        type: ACTIVITY_ACTIONS.START_RECORDING,
        payload: newActivity,
      });

      // Start the recording process in the activity recorder service
      await activityRecorder.startRecording(newActivity.id);

      // Start location tracking
      activityManager.startLocationTracking((location) => {
        dispatch({
          type: ACTIVITY_ACTIONS.ADD_LOCATION,
          payload: location,
        });
        
        // Update distance based on new location
        if (state.currentLocations.length > 0) {
          const newDistance = activityMetrics.calculateDistance(
            state.currentLocations, 
            location
          );
          
          dispatch({
            type: ACTIVITY_ACTIONS.UPDATE_DISTANCE,
            payload: state.distance + newDistance,
          });
        }
      });

      // Start elapsed time tracking
      const timeInterval = setInterval(() => {
        if (state.isRecording && !state.isPaused) {
          dispatch({
            type: ACTIVITY_ACTIONS.UPDATE_ELAPSED_TIME,
            payload: state.elapsedTime + 1,
          });
        }
      }, 1000);

      return newActivity;
    } catch (error) {
      console.error('Error starting activity recording:', error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to start activity recording',
      });
      return null;
    }
  };

  // Pause the current recording
  const pauseRecording = async () => {
    try {
      if (!state.isRecording || state.isPaused) return;

      dispatch({
        type: ACTIVITY_ACTIONS.PAUSE_RECORDING,
      });

      await activityRecorder.pauseRecording();
      activityManager.pauseLocationTracking();

      return true;
    } catch (error) {
      console.error('Error pausing activity recording:', error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to pause activity recording',
      });
      return false;
    }
  };

  // Resume the current recording
  const resumeRecording = async () => {
    try {
      if (!state.isRecording || !state.isPaused) return;

      dispatch({
        type: ACTIVITY_ACTIONS.RESUME_RECORDING,
      });

      await activityRecorder.resumeRecording();
      activityManager.resumeLocationTracking();

      return true;
    } catch (error) {
      console.error('Error resuming activity recording:', error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to resume activity recording',
      });
      return false;
    }
  };

  // Stop and save the current recording
  const stopRecording = async () => {
    try {
      if (!state.isRecording) return null;

      // Update the activity with end time and final metrics
      const endTime = new Date().toISOString();
      const completedActivity = {
        ...state.currentActivity,
        endTime,
        duration: state.elapsedTime,
        distance: state.distance,
        metrics: state.currentMetrics,
        locations: state.currentLocations,
      };

      // Stop all recording processes
      await activityRecorder.stopRecording();
      activityManager.stopLocationTracking();

      // Save the activity to storage
      await activityManager.saveActivity(completedActivity);

      // Update state
      dispatch({
        type: ACTIVITY_ACTIONS.STOP_RECORDING,
      });
      
      dispatch({
        type: ACTIVITY_ACTIONS.ADD_TO_HISTORY,
        payload: completedActivity,
      });

      // Reset current activity state
      dispatch({
        type: ACTIVITY_ACTIONS.RESET_CURRENT_ACTIVITY,
      });

      return completedActivity;
    } catch (error) {
      console.error('Error stopping activity recording:', error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to stop and save activity recording',
      });
      return null;
    }
  };

  // Discard the current recording
  const discardRecording = async () => {
    try {
      if (!state.isRecording) return;

      // Stop all recording processes
      await activityRecorder.stopRecording(true); // true for discard
      activityManager.stopLocationTracking();

      // Reset current activity state
      dispatch({
        type: ACTIVITY_ACTIONS.RESET_CURRENT_ACTIVITY,
      });

      return true;
    } catch (error) {
      console.error('Error discarding activity recording:', error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to discard activity recording',
      });
      return false;
    }
  };

  // Load activity details by ID
  const loadActivityById = async (activityId) => {
    try {
      const activity = await activityManager.getActivityById(activityId);
      
      if (activity) {
        dispatch({
          type: ACTIVITY_ACTIONS.SELECT_ACTIVITY,
          payload: activityId,
        });
        return activity;
      } else {
        dispatch({
          type: ACTIVITY_ACTIONS.SET_ERROR,
          payload: 'Activity not found',
        });
        return null;
      }
    } catch (error) {
      console.error(`Error loading activity ${activityId}:`, error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to load activity details',
      });
      return null;
    }
  };

  // Delete activity by ID
  const deleteActivity = async (activityId) => {
    try {
      await activityManager.deleteActivity(activityId);
      
      // Update activity history after deletion
      const updatedHistory = state.activityHistory.filter(
        activity => activity.id !== activityId
      );
      
      dispatch({
        type: ACTIVITY_ACTIONS.LOAD_ACTIVITY_HISTORY,
        payload: updatedHistory,
      });
      
      // If the deleted activity was selected, clear selection
      if (state.selectedActivityId === activityId) {
        dispatch({
          type: ACTIVITY_ACTIONS.SELECT_ACTIVITY,
          payload: null,
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting activity ${activityId}:`, error);
      dispatch({
        type: ACTIVITY_ACTIONS.SET_ERROR,
        payload: 'Failed to delete activity',
      });
      return false;
    }
  };

  // Clear any activity errors
  const clearError = () => {
    dispatch({ type: ACTIVITY_ACTIONS.CLEAR_ERROR });
  };

  // The value to be provided to consumers of this context
  const value = {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    loadActivityById,
    deleteActivity,
    clearError,
  };

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};

// Custom hook for using Activity context
export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

export default ActivityContext;