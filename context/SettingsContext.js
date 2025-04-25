import React, { createContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mmkvStorage } from '../database/cache/mmkvStorage';

// Define the initial state for settings
const initialState = {
  // User preferences
  useBiometricAuth: false,
  enableNotifications: true,
  enableBackgroundTracking: true,
  saveActivityAutomatically: true,
  metricUnits: true, // true for metric (km), false for imperial (miles)
  
  // Display preferences
  showHeartRate: true,
  showPace: true,
  showCadence: true,
  showPower: false,
  showGroundContactTime: false,
  showVerticalOscillation: false,
  
  // Data collection preferences
  recordingInterval: 500, // in milliseconds
  gpsAccuracyLevel: 'high', // 'high', 'medium', 'low'
  autoSaveThreshold: 5, // in minutes
  
  // Alerts and notifications
  heartRateAlerts: false,
  heartRateMax: 180,
  heartRateMin: 120,
  paceAlerts: false,
  paceMax: 5.5, // in min/km or min/mile based on metricUnits
  paceMin: 4.0,
  
  // Data management
  dataRetentionPeriod: 365, // in days, 0 means indefinitely
  
  // App configuration
  appVersion: '1.0.0',
  isFirstLaunch: true,
  lastUpdated: null,
};

// Define the action types
const ACTION_TYPES = {
  UPDATE_SETTING: 'UPDATE_SETTING',
  RESET_SETTINGS: 'RESET_SETTINGS',
  IMPORT_SETTINGS: 'IMPORT_SETTINGS',
  MARK_FIRST_LAUNCH_COMPLETE: 'MARK_FIRST_LAUNCH_COMPLETE',
};

// Define the reducer function
const settingsReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_SETTING:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
        lastUpdated: new Date().toISOString(),
      };
    case ACTION_TYPES.RESET_SETTINGS:
      return {
        ...initialState,
        isFirstLaunch: false,
        appVersion: state.appVersion,
        lastUpdated: new Date().toISOString(),
      };
    case ACTION_TYPES.IMPORT_SETTINGS:
      return {
        ...state,
        ...action.payload,
        lastUpdated: new Date().toISOString(),
      };
    case ACTION_TYPES.MARK_FIRST_LAUNCH_COMPLETE:
      return {
        ...state,
        isFirstLaunch: false,
        lastUpdated: new Date().toISOString(),
      };
    default:
      return state;
  }
};

// Create the context
export const SettingsContext = createContext();

// Create the provider component
export const SettingsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  // Load settings from storage when the component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to get from MMKV first (faster)
        let settings = mmkvStorage.getString('app.settings');
        
        // If not in MMKV, try AsyncStorage
        if (!settings) {
          settings = await AsyncStorage.getItem('app.settings');
        }
        
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          dispatch({
            type: ACTION_TYPES.IMPORT_SETTINGS,
            payload: parsedSettings,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settingsString = JSON.stringify(state);
        
        // Save to MMKV for quick access
        mmkvStorage.set('app.settings', settingsString);
        
        // Also save to AsyncStorage for persistence
        await AsyncStorage.setItem('app.settings', settingsString);
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };

    // Don't save settings on initial load
    if (state.lastUpdated) {
      saveSettings();
    }
  }, [state]);

  // Define the update function
  const updateSetting = (key, value) => {
    dispatch({
      type: ACTION_TYPES.UPDATE_SETTING,
      payload: { key, value },
    });
  };

  // Define the reset function
  const resetSettings = () => {
    dispatch({ type: ACTION_TYPES.RESET_SETTINGS });
  };

  // Mark first launch complete
  const markFirstLaunchComplete = () => {
    dispatch({ type: ACTION_TYPES.MARK_FIRST_LAUNCH_COMPLETE });
  };

  // Import settings
  const importSettings = (settings) => {
    dispatch({
      type: ACTION_TYPES.IMPORT_SETTINGS,
      payload: settings,
    });
  };

  // Create the context value object
  const contextValue = {
    settings: state,
    updateSetting,
    resetSettings,
    markFirstLaunchComplete,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};