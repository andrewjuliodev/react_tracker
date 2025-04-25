import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Import components
import Header from '../components/common/Header';
import Button from '../components/common/Button';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';

// Import hooks, services and utilities
import { useSettings } from '../../hooks/useSettings';
import { useBleConnection } from '../../hooks/useBleConnection';
import { UNITS } from '../../config/constants';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';

const SettingsScreen = ({ navigation }) => {
  // Settings hook
  const { 
    settings, 
    setSetting, 
    resetSettings, 
    isLoading: settingsLoading 
  } = useSettings();
  
  // BLE hook for connected devices
  const { connectedDevices, disconnectFromDevice } = useBleConnection();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageInfo, setStorageInfo] = useState({
    activitiesCount: 0,
    storageUsed: '0 MB',
  });
  
  // Load settings when component mounts
  useEffect(() => {
    loadStorageInfo();
  }, []);
  
  // Update loading state based on settings loading
  useEffect(() => {
    setLoading(settingsLoading);
  }, [settingsLoading]);
  
  /**
   * Updates a user setting value
   * @param {string} key - Setting key to update
   * @param {any} value - New setting value
   * @returns {Promise<void>} Resolves when setting saved
   */
  const updateSetting = async (key, value) => {
    try {
      await setSetting(key, value);
    } catch (error) {
      logger.error('Error updating setting', error, { key, value });
      setError(`Failed to update ${key}. Please try again.`);
    }
  };
  
  /**
   * Gets app storage usage information
   */
  const loadStorageInfo = async () => {
    try {
      // This would be replaced with actual implementation
      // to get storage information from the database
      
      // Mock data for now
      setStorageInfo({
        activitiesCount: 12,
        storageUsed: '24.8 MB',
      });
    } catch (error) {
      logger.error('Error getting storage info', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Navigates to device management screen
   */
  const navigateToDeviceManagement = () => {
    navigation.navigate(ROUTES.SCREENS.DEVICE_CONNECTION, {
      returnToScreen: ROUTES.SCREENS.SETTINGS
    });
  };
  
  /**
   * Clears application storage with confirmation
   * @param {string} dataType - Type of data to clear ('activities', 'all')
   * @returns {Promise<boolean>} True if clear successful
   */
  const handleClearData = (dataType) => {
    const isAllData = dataType === 'all';
    
    Alert.alert(
      isAllData ? 'Reset All Data' : 'Clear Activity History',
      isAllData 
        ? 'Are you sure you want to reset all data? This will delete all activities and reset all settings.'
        : 'Are you sure you want to delete all activity history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isAllData ? 'Reset All' : 'Clear History', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (isAllData) {
                // Reset all settings and clear data
                await resetSettings();
                
                // Navigate back to welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: ROUTES.SCREENS.WELCOME }],
                });
              } else {
                // Just clear activity history
                // Implementation would go here
                
                // Update storage info
                loadStorageInfo();
              }
              
              logger.info(`Data cleared: ${dataType}`);
            } catch (error) {
              logger.error('Error clearing data', error);
              setError('Failed to clear data. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  /**
   * Toggles theme between light, dark, and system modes
   * @returns {void}
   */
  const toggleTheme = () => {
    const currentTheme = settings.theme || 'system';
    const themeOrder = ['system', 'light', 'dark'];
    const nextThemeIndex = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextThemeIndex];
    
    updateSetting('theme', nextTheme);
  };
  
  /**
   * Handles disconnecting from a BLE device
   * @param {string} deviceId - Device identifier
   */
  const handleDisconnectDevice = (deviceId) => {
    Alert.alert(
      'Disconnect Device',
      'Are you sure you want to disconnect this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          onPress: async () => {
            try {
              await disconnectFromDevice(deviceId);
            } catch (error) {
              logger.error('Error disconnecting device', error);
              Alert.alert('Error', 'Failed to disconnect device. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Render settings groups
  const renderGeneralSettings = () => {
    const isMetric = settings.useMetricUnits !== false; // Default to metric
    const is24Hour = settings.use24HourTime !== false; // Default to 24-hour
    const currentTheme = settings.theme || 'system';
    
    return (
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>General</Text>
        
        {/* Units Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="compass-outline" size={20} color="#64748B" />
            <Text style={styles.settingLabel}>Units</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingToggle}
            onPress={() => updateSetting('useMetricUnits', !isMetric)}
          >
            <Text style={styles.settingValue}>
              {isMetric ? 'Metric (km)' : 'Imperial (mi)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* Time Format Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="time-outline" size={20} color="#64748B" />
            <Text style={styles.settingLabel}>Time Format</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingToggle}
            onPress={() => updateSetting('use24HourTime', !is24Hour)}
          >
            <Text style={styles.settingValue}>
              {is24Hour ? '24-hour' : '12-hour'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* Theme Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="contrast-outline" size={20} color="#64748B" />
            <Text style={styles.settingLabel}>Theme</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingToggle}
            onPress={toggleTheme}
          >
            <Text style={styles.settingValue}>
              {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* Auto-Pause Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="pause-circle-outline" size={20} color="#64748B" />
            <Text style={styles.settingLabel}>Auto-Pause</Text>
          </View>
          
          <Switch
            value={settings.enableAutoPause !== false} // Default to true
            onValueChange={(value) => updateSetting('enableAutoPause', value)}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={settings.enableAutoPause !== false ? '#2563EB' : '#F1F5F9'}
          />
        </View>
        
        {/* Voice Feedback Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="volume-medium-outline" size={20} color="#64748B" />
            <Text style={styles.settingLabel}>Voice Feedback</Text>
          </View>
          
          <Switch
            value={settings.enableVoiceFeedback === true} // Default to false
            onValueChange={(value) => updateSetting('enableVoiceFeedback', value)}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={settings.enableVoiceFeedback === true ? '#2563EB' : '#F1F5F9'}
          />
        </View>
      </View>
    );
  };
  
  const renderDeviceSettings = () => {
    return (
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>Devices</Text>
        
        {/* Connected Devices */}
        {connectedDevices.length > 0 ? (
          connectedDevices.map(device => (
            <View key={device.id} style={styles.deviceItem}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                <Text style={styles.deviceType}>{getDeviceType(device)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.deviceAction}
                onPress={() => handleDisconnectDevice(device.id)}
              >
                <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noDevicesText}>No devices connected</Text>
        )}
        
        {/* Connect Devices Button */}
        <Button
          label="Manage Devices"
          onPress={navigateToDeviceManagement}
          variant="secondary"
          style={styles.deviceButton}
        />
      </View>
    );
  };
  
  const renderDataSettings = () => {
    return (
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>Data Management</Text>
        
        {/* Storage Info */}
        <View style={styles.storageInfoContainer}>
          <View style={styles.storageInfoItem}>
            <Text style={styles.storageInfoLabel}>Activities</Text>
            <Text style={styles.storageInfoValue}>{storageInfo.activitiesCount}</Text>
          </View>
          
          <View style={styles.storageInfoDivider} />
          
          <View style={styles.storageInfoItem}>
            <Text style={styles.storageInfoLabel}>Storage Used</Text>
            <Text style={styles.storageInfoValue}>{storageInfo.storageUsed}</Text>
          </View>
        </View>
        
        {/* Clear Data Buttons */}
        <View style={styles.dataButtonsContainer}>
          <Button
            label="Clear Activity History"
            onPress={() => handleClearData('activities')}
            variant="secondary"
            style={styles.dataButton}
          />
          
          <Button
            label="Reset All Data"
            onPress={() => handleClearData('all')}
            variant="danger"
            style={styles.dataButton}
          />
        </View>
      </View>
    );
  };
  
  const renderAboutSection = () => {
    return (
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>About</Text>
        
        <View style={styles.aboutContainer}>
          <Text style={styles.appName}>RaceTracker</Text>
          <Text style={styles.appVersion}>
            Version {Constants.manifest.version || '1.0.0'}
          </Text>
          <Text style={styles.appDescription}>
            A comprehensive running activity tracking application
          </Text>
        </View>
      </View>
    );
  };
  
  // Helper to get device type
  const getDeviceType = (device) => {
    if (device.type) {
      switch(device.type.toLowerCase()) {
        case 'heart_rate':
          return 'Heart Rate Monitor';
        case 'power':
          return 'Power Meter';
        case 'foot_pod':
          return 'Foot Pod';
        case 'cadence':
          return 'Cadence Sensor';
        default:
          return 'Unknown Type';
      }
    }
    
    // Check device name for hints
    const name = device.name?.toLowerCase() || '';
    if (name.includes('hrm') || name.includes('heart')) {
      return 'Heart Rate Monitor';
    } else if (name.includes('stryd') || name.includes('power')) {
      return 'Power Meter';
    } else if (name.includes('foot') || name.includes('pod')) {
      return 'Foot Pod';
    } else if (name.includes('cadence')) {
      return 'Cadence Sensor';
    }
    
    return 'Bluetooth Device';
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Header title="Settings" showBack={false} />
        <LoadingIndicator size="large" message="Loading settings..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" showBack={false} />
      
      <ScrollView style={styles.scrollContainer}>
        {/* Error Message */}
        {error && (
          <ErrorMessage 
            message={error} 
            style={styles.errorContainer} 
          />
        )}
        
        {/* General Settings */}
        {renderGeneralSettings()}
        
        {/* Device Settings */}
        {renderDeviceSettings()}
        
        {/* Data Management */}
        {renderDataSettings()}
        
        {/* About Section */}
        {renderAboutSection()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    margin: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  settingGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#0F172A',
    marginLeft: 12,
  },
  settingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#64748B',
    marginRight: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 14,
    color: '#64748B',
  },
  deviceAction: {
    padding: 8,
  },
  noDevicesText: {
    fontSize: 16,
    color: '#64748B',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  deviceButton: {
    marginTop: 16,
  },
  storageInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 16,
  },
  storageInfoItem: {
    alignItems: 'center',
  },
  storageInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  storageInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  storageInfoDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
  },
  dataButtonsContainer: {
    marginTop: 8,
  },
  dataButton: {
    marginBottom: 12,
  },
  aboutContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
});

export default SettingsScreen;