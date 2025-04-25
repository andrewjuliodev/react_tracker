import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Alert, Linking, Platform } from 'react-native';
import logger from './logger';
import { BleManager } from 'react-native-ble-plx';

// Permission types for consistent usage
export const PERMISSIONS = {
  LOCATION_FOREGROUND: 'LOCATION_FOREGROUND',
  LOCATION_BACKGROUND: 'LOCATION_BACKGROUND',
  CAMERA: 'CAMERA',
  MEDIA: 'MEDIA',
  BLUETOOTH_SCAN: 'BLUETOOTH_SCAN',
  BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT'
};

// Check if BLE is supported
export const isBleSupported = async () => {
  try {
    const manager = new BleManager();
    const supported = await manager.state();
    manager.destroy();
    return supported === 'PoweredOn';
  } catch (error) {
    logger.error('BLE support check failed', error);
    return false;
  }
};

// Get current permission status
export const getPermissionStatus = async (permissionType) => {
  try {
    switch (permissionType) {
      case PERMISSIONS.LOCATION_FOREGROUND:
        return await Location.getForegroundPermissionsAsync();
      case PERMISSIONS.LOCATION_BACKGROUND:
        return await Location.getBackgroundPermissionsAsync();
      case PERMISSIONS.CAMERA:
        return await Camera.getCameraPermissionsAsync();
      case PERMISSIONS.MEDIA:
        return await ImagePicker.getMediaLibraryPermissionsAsync();
      case PERMISSIONS.BLUETOOTH_SCAN:
      case PERMISSIONS.BLUETOOTH_CONNECT:
        // For Android 12+, we need to check Bluetooth permissions separately
        // On iOS, Bluetooth permissions are handled by the system
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          // This is a placeholder - you'll need to use a native module or library 
          // that supports checking Android 12+ Bluetooth permissions
          // For example, you could use 'react-native-permissions'
          logger.info('Checking Bluetooth permissions for Android 12+');
          return { status: 'unknown' };
        }
        return { status: 'granted' }; // Default to granted for older Android and iOS
      default:
        throw new Error(`Unknown permission type: ${permissionType}`);
    }
  } catch (error) {
    logger.error(`Error checking permission status for ${permissionType}`, error);
    return { status: 'unknown', canAskAgain: true };
  }
};

// Unified permission request function
export const requestPermission = async (permissionType) => {
  try {
    switch (permissionType) {
      case PERMISSIONS.LOCATION_FOREGROUND:
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        return foregroundStatus === 'granted';
      
      case PERMISSIONS.LOCATION_BACKGROUND:
        // Need to request foreground permission first
        const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
        if (foreStatus !== 'granted') {
          return false;
        }
        // Then request background permission
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        return backgroundStatus === 'granted';
      
      case PERMISSIONS.CAMERA:
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        return cameraStatus === 'granted';
      
      case PERMISSIONS.MEDIA:
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return mediaStatus === 'granted';
      
      case PERMISSIONS.BLUETOOTH_SCAN:
      case PERMISSIONS.BLUETOOTH_CONNECT:
        // For Android 12+, we need to request Bluetooth permissions explicitly
        // On iOS, Bluetooth permissions are handled by the system when you try to use BLE
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          // This is a placeholder - you'll need to use a native module or library
          // that supports requesting Android 12+ Bluetooth permissions
          logger.info('Requesting Bluetooth permissions for Android 12+');
          // Example implementation would go here if using a library like 'react-native-permissions'
          return true; // Placeholder return
        }
        return true; // Default to true for older Android and iOS
      
      default:
        throw new Error(`Unknown permission type: ${permissionType}`);
    }
  } catch (error) {
    logger.error(`Permission request error for ${permissionType}`, error);
    return false;
  }
};

// Request all permissions needed for activity tracking
export const requestActivityTrackingPermissions = async () => {
  const locationPermission = await requestPermission(PERMISSIONS.LOCATION_FOREGROUND);
  const backgroundLocationPermission = await requestPermission(PERMISSIONS.LOCATION_BACKGROUND);
  
  // For Android, check Bluetooth permissions on Android 12+
  let bluetoothPermissions = true;
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const bluetoothScan = await requestPermission(PERMISSIONS.BLUETOOTH_SCAN);
    const bluetoothConnect = await requestPermission(PERMISSIONS.BLUETOOTH_CONNECT);
    bluetoothPermissions = bluetoothScan && bluetoothConnect;
  }
  
  return {
    allGranted: locationPermission && backgroundLocationPermission && bluetoothPermissions,
    locationPermission,
    backgroundLocationPermission,
    bluetoothPermissions
  };
};

// Helper to open settings
export const openSettings = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
    return true;
  } catch (error) {
    logger.error('Failed to open settings', error);
    return false;
  }
};

// Get a human-readable name for a permission
export const getPermissionName = (permissionType) => {
  const permissionNames = {
    [PERMISSIONS.LOCATION_FOREGROUND]: 'Location',
    [PERMISSIONS.LOCATION_BACKGROUND]: 'Background Location',
    [PERMISSIONS.CAMERA]: 'Camera',
    [PERMISSIONS.MEDIA]: 'Photo Library',
    [PERMISSIONS.BLUETOOTH_SCAN]: 'Bluetooth Scanning',
    [PERMISSIONS.BLUETOOTH_CONNECT]: 'Bluetooth Connection'
  };
  
  return permissionNames[permissionType] || 'Unknown Permission';
};

// Check if permission was denied permanently and show alert
export const showPermissionAlert = (permissionType) => {
  const permissionName = getPermissionName(permissionType);
  
  Alert.alert(
    'Permission Required',
    `${permissionName} permission is required for tracking your running activity. Please enable it in your device settings.`,
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Open Settings', onPress: openSettings }
    ]
  );
};

// Check all required permissions for a feature and handle results
export const checkAndRequestPermissions = async (requiredPermissions, featureName) => {
  const results = {};
  let allGranted = true;
  
  for (const permission of requiredPermissions) {
    // First check current status
    const { status, canAskAgain } = await getPermissionStatus(permission);
    
    if (status === 'granted') {
      results[permission] = true;
      continue;
    }
    
    // If we can ask for permission, do so
    if (canAskAgain) {
      const granted = await requestPermission(permission);
      results[permission] = granted;
      if (!granted) allGranted = false;
    } else {
      // If we can't ask again, show settings alert
      results[permission] = false;
      allGranted = false;
      showPermissionAlert(permission);
      break; // Exit the loop as we're showing an alert
    }
  }
  
  // If some permissions were denied but we can still show UI
  if (!allGranted) {
    logger.warn(`Not all permissions granted for ${featureName}`);
  }
  
  return {
    allGranted,
    results
  };
};

// Check required permissions for different features
export const checkPermissionsForFeature = async (feature) => {
  switch (feature) {
    case 'activity_tracking':
      return checkAndRequestPermissions(
        [PERMISSIONS.LOCATION_FOREGROUND, PERMISSIONS.LOCATION_BACKGROUND],
        'Activity Tracking'
      );
    case 'device_connection':
      // For BLE devices
      return checkAndRequestPermissions(
        [PERMISSIONS.BLUETOOTH_SCAN, PERMISSIONS.BLUETOOTH_CONNECT, PERMISSIONS.LOCATION_FOREGROUND],
        'Device Connection'
      );
    case 'photo_capture':
      return checkAndRequestPermissions(
        [PERMISSIONS.CAMERA],
        'Photo Capture'
      );
    case 'route_sharing':
      return checkAndRequestPermissions(
        [PERMISSIONS.MEDIA, PERMISSIONS.LOCATION_FOREGROUND],
        'Route Sharing'
      );
    default:
      logger.error(`Unknown feature: ${feature}`);
      return { allGranted: false };
  }
};

export default {
  PERMISSIONS,
  requestPermission,
  getPermissionStatus,
  openSettings,
  showPermissionAlert,
  checkAndRequestPermissions,
  checkPermissionsForFeature,
  requestActivityTrackingPermissions,
  isBleSupported,
  getPermissionName
};