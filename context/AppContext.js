// context/AppContext.js

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import logger from '../utils/logger';

// Initial state
const initialState = {
  isLoading: true,
  isOnboarded: false,
  lastScreen: null,
  error: null,
  appVersion: '1.0.0',
  isFirstLaunch: true,
  needsPermissions: {
    location: true,
    bluetooth: true,
    notifications: true,
  },
  deviceInfo: {
    deviceId: null,
    manufacturer: null,
    model: null,
    osVersion: null,
  },
  networkStatus: {
    isConnected: false,
    type: null,
  },
};

// Action types
const APP_ACTIONS = {
  INITIALIZE_SUCCESS: 'APP/INITIALIZE_SUCCESS',
  SET_ONBOARDED: 'APP/SET_ONBOARDED',
  SET_LAST_SCREEN: 'APP/SET_LAST_SCREEN',
  SET_ERROR: 'APP/SET_ERROR',
  CLEAR_ERROR: 'APP/CLEAR_ERROR',
  SET_NETWORK_STATUS: 'APP/SET_NETWORK_STATUS',
  SET_PERMISSION_STATUS: 'APP/SET_PERMISSION_STATUS',
  SET_DEVICE_INFO: 'APP/SET_DEVICE_INFO',
  SET_IS_FIRST_LAUNCH: 'APP/SET_IS_FIRST_LAUNCH',
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case APP_ACTIONS.INITIALIZE_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isLoading: false,
      };
    case APP_ACTIONS.SET_ONBOARDED:
      return {
        ...state,
        isOnboarded: action.payload,
      };
    case APP_ACTIONS.SET_LAST_SCREEN:
      return {
        ...state,
        lastScreen: action.payload,
      };
    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case APP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case APP_ACTIONS.SET_NETWORK_STATUS:
      return {
        ...state,
        networkStatus: action.payload,
      };
    case APP_ACTIONS.SET_PERMISSION_STATUS:
      return {
        ...state,
        needsPermissions: {
          ...state.needsPermissions,
          [action.payload.permission]: action.payload.status,
        },
      };
    case APP_ACTIONS.SET_DEVICE_INFO:
      return {
        ...state,
        deviceInfo: {
          ...state.deviceInfo,
          ...action.payload,
        },
      };
    case APP_ACTIONS.SET_IS_FIRST_LAUNCH:
      return {
        ...state,
        isFirstLaunch: action.payload,
      };
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize the app state from storage
  useEffect(() => {
    const initializeAppState = async () => {
      try {
        // Load persisted state from AsyncStorage
        const persistedState = await AsyncStorage.getItem('app_state');
        
        if (persistedState) {
          const parsedState = JSON.parse(persistedState);
          
          // Determine if this is the first launch of this version
          const isFirstLaunch = parsedState.appVersion !== initialState.appVersion;
          
          dispatch({
            type: APP_ACTIONS.INITIALIZE_SUCCESS,
            payload: {
              ...parsedState,
              isFirstLaunch,
              isLoading: false,
            },
          });
        } else {
          // No stored state, this is definitely first launch
          dispatch({
            type: APP_ACTIONS.INITIALIZE_SUCCESS,
            payload: {
              ...initialState,
              isLoading: false,
            },
          });
        }
      } catch (error) {
        logger.error('Failed to initialize app state', error);
        
        dispatch({
          type: APP_ACTIONS.SET_ERROR,
          payload: 'Failed to initialize application state.',
        });
        
        dispatch({
          type: APP_ACTIONS.INITIALIZE_SUCCESS,
          payload: {
            isLoading: false,
          },
        });
      }
    };

    initializeAppState();
  }, []);

  // Persist state changes to AsyncStorage
  useEffect(() => {
    const persistState = async () => {
      try {
        if (!state.isLoading) {
          // Only persist specific properties we want to keep between sessions
          const stateToPersist = {
            isOnboarded: state.isOnboarded,
            lastScreen: state.lastScreen,
            appVersion: state.appVersion,
            deviceInfo: state.deviceInfo,
            needsPermissions: state.needsPermissions,
          };
          
          await AsyncStorage.setItem('app_state', JSON.stringify(stateToPersist));
        }
      } catch (error) {
        logger.error('Failed to persist app state', error);
      }
    };

    persistState();
  }, [state.isOnboarded, state.lastScreen, state.appVersion, state.deviceInfo, state.needsPermissions]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // App came to foreground, potentially check for updates or refresh data
      } else if (nextAppState === 'background') {
        // App went to background, ensure state is persisted
        const persistState = async () => {
          try {
            const stateToPersist = {
              isOnboarded: state.isOnboarded,
              lastScreen: state.lastScreen,
              appVersion: state.appVersion,
              deviceInfo: state.deviceInfo,
              needsPermissions: state.needsPermissions,
            };
            
            await AsyncStorage.setItem('app_state', JSON.stringify(stateToPersist));
          } catch (error) {
            logger.error('Failed to persist app state on background', error);
          }
        };
        
        persistState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state]);

  // Action creators
  const setOnboarded = (isOnboarded) => {
    dispatch({
      type: APP_ACTIONS.SET_ONBOARDED,
      payload: isOnboarded,
    });
  };

  const setLastScreen = (screenName) => {
    dispatch({
      type: APP_ACTIONS.SET_LAST_SCREEN,
      payload: screenName,
    });
  };

  const setError = (errorMessage) => {
    dispatch({
      type: APP_ACTIONS.SET_ERROR,
      payload: errorMessage,
    });
  };

  const clearError = () => {
    dispatch({
      type: APP_ACTIONS.CLEAR_ERROR,
    });
  };

  const setNetworkStatus = (status) => {
    dispatch({
      type: APP_ACTIONS.SET_NETWORK_STATUS,
      payload: status,
    });
  };

  const setPermissionStatus = (permission, status) => {
    dispatch({
      type: APP_ACTIONS.SET_PERMISSION_STATUS,
      payload: { permission, status },
    });
  };

  const setDeviceInfo = (info) => {
    dispatch({
      type: APP_ACTIONS.SET_DEVICE_INFO,
      payload: info,
    });
  };

  const setIsFirstLaunch = (isFirst) => {
    dispatch({
      type: APP_ACTIONS.SET_IS_FIRST_LAUNCH,
      payload: isFirst,
    });
  };

  // Context value
  const value = {
    ...state,
    setOnboarded,
    setLastScreen,
    setError,
    clearError,
    setNetworkStatus,
    setPermissionStatus,
    setDeviceInfo,
    setIsFirstLaunch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook for using the app context
export const useAppContext = () => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
};

export default AppContext;