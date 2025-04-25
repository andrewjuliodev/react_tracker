import React, { createContext, useReducer, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bleManager from '../services/ble/bleManager';

// Initial state for the BLE context
const initialState = {
  devices: [],            // List of discovered devices
  connectedDevices: [],   // List of currently connected devices
  pairedDevices: [],      // List of previously paired devices
  isScanning: false,      // Whether device scanning is in progress
  connectionStatus: {},   // Connection status of devices by ID
  error: null,            // Any BLE-related errors
  deviceData: {},         // Real-time data from connected devices
};

// Action types for the reducer
const BLE_ACTIONS = {
  START_SCAN: 'START_SCAN',
  STOP_SCAN: 'STOP_SCAN',
  DEVICE_DISCOVERED: 'DEVICE_DISCOVERED',
  DEVICE_CONNECTED: 'DEVICE_CONNECTED',
  DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
  UPDATE_DEVICE_DATA: 'UPDATE_DEVICE_DATA',
  SET_PAIRED_DEVICES: 'SET_PAIRED_DEVICES',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
};

// Reducer function for BLE state
function bleReducer(state, action) {
  switch (action.type) {
    case BLE_ACTIONS.START_SCAN:
      return {
        ...state,
        isScanning: true,
        error: null,
      };
    case BLE_ACTIONS.STOP_SCAN:
      return {
        ...state,
        isScanning: false,
      };
    case BLE_ACTIONS.DEVICE_DISCOVERED:
      // Avoid duplicates in devices list
      if (state.devices.some(device => device.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        devices: [...state.devices, action.payload],
      };
    case BLE_ACTIONS.DEVICE_CONNECTED:
      return {
        ...state,
        connectedDevices: [...state.connectedDevices.filter(device => device.id !== action.payload.id), action.payload],
        connectionStatus: {
          ...state.connectionStatus,
          [action.payload.id]: 'connected',
        },
        error: null,
      };
    case BLE_ACTIONS.DEVICE_DISCONNECTED:
      return {
        ...state,
        connectedDevices: state.connectedDevices.filter(device => device.id !== action.payload.id),
        connectionStatus: {
          ...state.connectionStatus,
          [action.payload.id]: 'disconnected',
        },
      };
    case BLE_ACTIONS.UPDATE_DEVICE_DATA:
      return {
        ...state,
        deviceData: {
          ...state.deviceData,
          [action.payload.deviceId]: {
            ...(state.deviceData[action.payload.deviceId] || {}),
            [action.payload.dataType]: action.payload.value,
            lastUpdated: new Date().getTime(),
          },
        },
      };
    case BLE_ACTIONS.SET_PAIRED_DEVICES:
      return {
        ...state,
        pairedDevices: action.payload,
      };
    case BLE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case BLE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case BLE_ACTIONS.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          [action.payload.deviceId]: action.payload.status,
        },
      };
    default:
      return state;
  }
}

// Create context
const BleContext = createContext();

export const BleProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bleReducer, initialState);

  // Load paired devices from persistent storage on mount
  useEffect(() => {
    const loadPairedDevices = async () => {
      try {
        const storedPairedDevices = await AsyncStorage.getItem('pairedDevices');
        if (storedPairedDevices) {
          dispatch({
            type: BLE_ACTIONS.SET_PAIRED_DEVICES,
            payload: JSON.parse(storedPairedDevices),
          });
        }
      } catch (error) {
        console.error('Error loading paired devices:', error);
        dispatch({
          type: BLE_ACTIONS.SET_ERROR,
          payload: 'Failed to load paired devices',
        });
      }
    };

    loadPairedDevices();

    // Set up BLE manager
    bleManager.setup();

    // Clean up BLE manager on unmount
    return () => {
      bleManager.cleanup();
    };
  }, []);

  // Save paired devices to persistent storage whenever they change
  useEffect(() => {
    const savePairedDevices = async () => {
      try {
        await AsyncStorage.setItem('pairedDevices', JSON.stringify(state.pairedDevices));
      } catch (error) {
        console.error('Error saving paired devices:', error);
      }
    };

    if (state.pairedDevices.length > 0) {
      savePairedDevices();
    }
  }, [state.pairedDevices]);

  // Start scanning for BLE devices
  const startScan = async () => {
    try {
      dispatch({ type: BLE_ACTIONS.START_SCAN });
      await bleManager.startScan((device) => {
        dispatch({
          type: BLE_ACTIONS.DEVICE_DISCOVERED,
          payload: device,
        });
      });
    } catch (error) {
      console.error('Error starting BLE scan:', error);
      dispatch({
        type: BLE_ACTIONS.SET_ERROR,
        payload: 'Failed to start scanning for devices',
      });
      dispatch({ type: BLE_ACTIONS.STOP_SCAN });
    }
  };

  // Stop scanning for BLE devices
  const stopScan = () => {
    bleManager.stopScan();
    dispatch({ type: BLE_ACTIONS.STOP_SCAN });
  };

  // Connect to a BLE device
  const connectToDevice = async (deviceId) => {
    try {
      dispatch({
        type: BLE_ACTIONS.SET_CONNECTION_STATUS,
        payload: { deviceId, status: 'connecting' },
      });

      const device = await bleManager.connectToDevice(deviceId);
      
      dispatch({
        type: BLE_ACTIONS.DEVICE_CONNECTED,
        payload: device,
      });

      // Add to paired devices if not already there
      if (!state.pairedDevices.some(d => d.id === device.id)) {
        dispatch({
          type: BLE_ACTIONS.SET_PAIRED_DEVICES,
          payload: [...state.pairedDevices, device],
        });
      }

      // Set up data listeners
      bleManager.monitorDevice(deviceId, (deviceId, dataType, value) => {
        dispatch({
          type: BLE_ACTIONS.UPDATE_DEVICE_DATA,
          payload: { deviceId, dataType, value },
        });
      });

      return device;
    } catch (error) {
      console.error(`Error connecting to device ${deviceId}:`, error);
      dispatch({
        type: BLE_ACTIONS.SET_ERROR,
        payload: `Failed to connect to device: ${error.message}`,
      });
      dispatch({
        type: BLE_ACTIONS.SET_CONNECTION_STATUS,
        payload: { deviceId, status: 'error' },
      });
      throw error;
    }
  };

  // Disconnect from a BLE device
  const disconnectDevice = async (deviceId) => {
    try {
      await bleManager.disconnectDevice(deviceId);
      dispatch({
        type: BLE_ACTIONS.DEVICE_DISCONNECTED,
        payload: { id: deviceId },
      });
    } catch (error) {
      console.error(`Error disconnecting from device ${deviceId}:`, error);
      dispatch({
        type: BLE_ACTIONS.SET_ERROR,
        payload: `Failed to disconnect from device: ${error.message}`,
      });
      throw error;
    }
  };

  // Forget (unpair) a device
  const forgetDevice = async (deviceId) => {
    try {
      // If connected, disconnect first
      if (state.connectedDevices.some(device => device.id === deviceId)) {
        await disconnectDevice(deviceId);
      }
      
      // Remove from paired devices
      const updatedPairedDevices = state.pairedDevices.filter(device => device.id !== deviceId);
      
      dispatch({
        type: BLE_ACTIONS.SET_PAIRED_DEVICES,
        payload: updatedPairedDevices,
      });
      
      return true;
    } catch (error) {
      console.error(`Error forgetting device ${deviceId}:`, error);
      dispatch({
        type: BLE_ACTIONS.SET_ERROR,
        payload: `Failed to forget device: ${error.message}`,
      });
      return false;
    }
  };

  // Clear any BLE errors
  const clearError = () => {
    dispatch({ type: BLE_ACTIONS.CLEAR_ERROR });
  };

  // The value to be provided to consumers of this context
  const value = {
    state,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    forgetDevice,
    clearError,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};

// Custom hook for using BLE context
export const useBle = () => {
  const context = useContext(BleContext);
  if (context === undefined) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
};

export default BleContext;