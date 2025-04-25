import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import components
import Button from '../components/common/Button';
import Header from '../components/common/Header';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';

// Import hooks, services and utilities
import { useBleConnection } from '../../hooks/useBleConnection';
import { TIMEOUT_MS } from '../../config/constants';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';

const DeviceConnectionScreen = ({ navigation, route }) => {
  // Extract params
  const { returnToScreen, showSkip = true } = route.params || {};
  
  // State
  const [scanningState, setScanningState] = useState('idle'); // 'idle', 'scanning', 'complete'
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [error, setError] = useState(null);
  
  // BLE hook
  const { 
    discoveredDevices, 
    connectedDevices, 
    isScanning, 
    startScan, 
    stopScan, 
    connectToDevice, 
    disconnectFromDevice, 
    getConnectionStatus 
  } = useBleConnection();
  
  // Handle device selection
  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };
  
  // Start scanning when screen mounts
  useEffect(() => {
    initiateDeviceScan();
    
    // Cleanup on unmount
    return () => {
      if (isScanning) {
        stopScan();
      }
    };
  }, []);
  
  /**
   * Initiates BLE device scanning process
   * @returns {Promise<void>} Resolves when scanning completes
   * @throws {Error} If scanning fails or permissions not granted
   */
  const initiateDeviceScan = async () => {
    try {
      setError(null);
      setScanningState('scanning');
      
      logger.info('Starting BLE device scan');
      
      // Start scan with timeout
      await startScan({
        timeout: TIMEOUT_MS.BLE_SCAN,
        allowDuplicates: false,
      });
      
      setScanningState('complete');
      logger.info('BLE scan completed', { deviceCount: discoveredDevices.length });
    } catch (error) {
      logger.error('BLE scan failed', error);
      setError('Failed to scan for devices. Please check Bluetooth permissions and try again.');
      setScanningState('idle');
    }
  };
  
  /**
   * Attempts to connect to selected devices
   * @param {Array} deviceIds - IDs of devices to connect
   * @returns {Promise<boolean>} True if all connections successful
   */
  const connectToSelectedDevices = async () => {
    if (selectedDevices.length === 0) {
      Alert.alert('No Devices Selected', 'Please select at least one device to connect.');
      return false;
    }
    
    try {
      setScanningState('connecting');
      setError(null);
      
      logger.info('Connecting to selected devices', { devices: selectedDevices });
      
      // Connect to each selected device
      const connectionPromises = selectedDevices.map(async (deviceId) => {
        try {
          const device = discoveredDevices.find(d => d.id === deviceId);
          if (device) {
            await connectToDevice(deviceId);
            return { deviceId, success: true };
          }
          return { deviceId, success: false, error: 'Device not found' };
        } catch (error) {
          logger.error(`Failed to connect to device ${deviceId}`, error);
          return { deviceId, success: false, error: error.message };
        }
      });
      
      const results = await Promise.all(connectionPromises);
      const failedConnections = results.filter(r => !r.success);
      
      // Check for connection failures
      if (failedConnections.length > 0) {
        const deviceNames = failedConnections.map(fc => {
          const device = discoveredDevices.find(d => d.id === fc.deviceId);
          return device ? device.name || fc.deviceId : fc.deviceId;
        });
        
        if (failedConnections.length < selectedDevices.length) {
          // Some connections succeeded
          Alert.alert(
            'Partial Connection',
            `Connected successfully to some devices, but failed to connect to: ${deviceNames.join(', ')}.`,
            [{ text: 'Continue Anyway', onPress: () => navigateNext() }]
          );
          return true;
        } else {
          // All connections failed
          throw new Error(`Failed to connect to devices: ${deviceNames.join(', ')}`);
        }
      }
      
      logger.info('Successfully connected to all selected devices');
      return true;
    } catch (error) {
      logger.error('Device connection failed', error);
      setError(`Connection failed: ${error.message}`);
      setScanningState('complete');
      return false;
    }
  };
  
  /**
   * Navigates to next screen when device setup complete
   * @param {boolean} skip - Whether to skip device connection
   */
  const navigateNext = useCallback(() => {
    const nextScreen = returnToScreen || ROUTES.SCREENS.ACTIVITY_TRACKING;
    
    if (returnToScreen) {
      navigation.navigate(nextScreen);
    } else {
      navigation.replace(nextScreen);
    }
  }, [navigation, returnToScreen]);
  
  /**
   * Handle continue button press
   */
  const handleContinue = async () => {
    if (selectedDevices.length === 0) {
      // No devices selected, confirm skipping
      Alert.alert(
        'Skip Device Setup',
        'Are you sure you want to continue without connecting any devices? You can connect devices later in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: navigateNext }
        ]
      );
    } else {
      // Connect to selected devices then navigate
      const success = await connectToSelectedDevices();
      if (success) {
        navigateNext();
      }
    }
  };
  
  // Render device item
  const renderDeviceItem = ({ item }) => {
    const isSelected = selectedDevices.includes(item.id);
    const isConnected = connectedDevices.some(device => device.id === item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          isSelected && styles.deviceItemSelected,
          isConnected && styles.deviceItemConnected
        ]}
        onPress={() => toggleDeviceSelection(item.id)}
        disabled={isConnected}
      >
        <View style={styles.deviceIcon}>
          <Ionicons
            name={getDeviceIconName(item.type)}
            size={24}
            color={isSelected || isConnected ? '#fff' : '#2563EB'}
          />
        </View>
        
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceId}>{item.id}</Text>
          <Text style={styles.deviceType}>
            {getDeviceTypeLabel(item)}
          </Text>
        </View>
        
        <View style={styles.deviceStatus}>
          {isConnected ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isSelected ? '#16A34A' : '#94A3B8'}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Helper to get device icon based on type
  const getDeviceIconName = (type) => {
    switch(type?.toLowerCase()) {
      case 'heart_rate':
        return 'heart';
      case 'power':
        return 'flash';
      case 'foot_pod':
        return 'footsteps';
      case 'cadence':
        return 'speedometer';
      default:
        return 'bluetooth';
    }
  };
  
  // Helper to get human-readable device type
  const getDeviceTypeLabel = (device) => {
    // Try to identify device type from services or name
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
    
    return 'Unknown Type';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Connect Devices" 
        showBack={returnToScreen !== undefined}
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.contentContainer}>
        {/* Instructions */}
        <Text style={styles.instructions}>
          Connect your Bluetooth sensors to track detailed metrics during your activity.
        </Text>
        
        {/* Error message */}
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={initiateDeviceScan}
            style={styles.errorContainer}
          />
        )}
        
        {/* Device list */}
        <View style={styles.deviceListContainer}>
          <View style={styles.deviceListHeader}>
            <Text style={styles.deviceListTitle}>Available Devices</Text>
            {scanningState === 'complete' && (
              <TouchableOpacity 
                onPress={initiateDeviceScan}
                style={styles.refreshButton}
              >
                <Ionicons name="refresh" size={20} color="#2563EB" />
                <Text style={styles.refreshText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {scanningState === 'scanning' ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator size="large" message="Scanning for devices..." />
            </View>
          ) : discoveredDevices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bluetooth-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No devices found</Text>
              <Text style={styles.emptySubtext}>
                Make sure your devices are powered on and in pairing mode
              </Text>
              <Button 
                label="Scan Again" 
                onPress={initiateDeviceScan} 
                variant="primary"
                style={styles.scanButton}
              />
            </View>
          ) : (
            <FlatList
              data={discoveredDevices}
              renderItem={renderDeviceItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </View>
      
      {/* Bottom buttons */}
      <View style={styles.buttonContainer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          variant="primary"
          style={styles.button}
          loading={scanningState === 'connecting'}
        />
        
        {showSkip && scanningState !== 'connecting' && (
          <Button
            label="Skip"
            onPress={navigateNext}
            variant="secondary"
            style={styles.button}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  instructions: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorContainer: {
    marginBottom: 16,
  },
  deviceListContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    color: '#2563EB',
    marginLeft: 4,
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  deviceItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  deviceItemConnected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 14,
    color: '#475569',
  },
  deviceStatus: {
    marginLeft: 8,
  },
  connectedBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  scanButton: {
    minWidth: 140,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    marginBottom: 12,
  },
});

export default DeviceConnectionScreen;