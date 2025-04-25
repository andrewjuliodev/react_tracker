import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import components
import MetricGrid from './MetricGrid';
import Card from '../common/Card';

// Import hooks and utilities
import { useBleConnection } from '../../../hooks/useBleConnection';

/**
 * Component for grouping and displaying metrics from a specific device
 * 
 * @param {Object} props - Component props
 * @param {Object} props.device - BLE device information
 * @param {Array} props.metrics - Metrics from this specific device
 * @param {boolean} props.expanded - Whether metric group is expanded
 * @param {boolean} props.showDeviceInfo - Whether to show device details
 * @param {Object} props.style - Additional styles for the container
 * @param {function} props.onDevicePress - Optional handler for device header press
 * @param {function} props.onMetricPress - Optional handler for metric press
 */
const DeviceMetrics = ({
  device,
  metrics = [],
  expanded: defaultExpanded = true,
  showDeviceInfo = true,
  style,
  onDevicePress,
  onMetricPress,
}) => {
  // State
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // BLE connection hook
  const { getConnectionStatus } = useBleConnection();
  
  // Check if device is connected
  const isConnected = useMemo(() => {
    if (!device) return false;
    return getConnectionStatus(device.id);
  }, [device, getConnectionStatus]);
  
  /**
   * Filters metrics relevant to this device
   * @param {Object} device - Device information
   * @param {Array} allMetrics - All available metrics
   * @returns {Array} Device-specific metrics
   */
  const getDeviceMetrics = useMemo(() => {
    if (!device || !metrics?.length) return [];
    
    // Only include metrics with matching device ID or device type
    return metrics.filter(metric => 
      (metric.deviceId && metric.deviceId === device.id) ||
      (metric.deviceType && metric.deviceType === device.type)
    );
  }, [device, metrics]);
  
  /**
   * Toggles expanded state of the device metric group
   * @returns {void}
   */
  const toggleExpanded = () => {
    setExpanded(!expanded);
    
    // Call external handler if provided
    if (onDevicePress) {
      onDevicePress(device, !expanded);
    }
  };
  
  /**
   * Gets device type display name
   */
  const getDeviceTypeName = () => {
    if (!device) return 'Unknown Device';
    
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
          return 'Bluetooth Device';
      }
    }
    
    // Detect from device name
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
  
  /**
   * Get icon for device type
   */
  const getDeviceIcon = () => {
    if (!device) return 'bluetooth-outline';
    
    if (device.type) {
      switch(device.type.toLowerCase()) {
        case 'heart_rate':
          return 'heart-outline';
        case 'power':
          return 'flash-outline';
        case 'foot_pod':
          return 'footsteps-outline';
        case 'cadence':
          return 'speedometer-outline';
        default:
          return 'bluetooth-outline';
      }
    }
    
    // Detect from device name
    const name = device.name?.toLowerCase() || '';
    if (name.includes('hrm') || name.includes('heart')) {
      return 'heart-outline';
    } else if (name.includes('stryd') || name.includes('power')) {
      return 'flash-outline';
    } else if (name.includes('foot') || name.includes('pod')) {
      return 'footsteps-outline';
    } else if (name.includes('cadence')) {
      return 'speedometer-outline';
    }
    
    return 'bluetooth-outline';
  };
  
  // If no device or no metrics, don't render
  if (!device || getDeviceMetrics.length === 0) {
    return null;
  }
  
  return (
    <Card style={[styles.container, style]} elevation={1} padding={0}>
      {/* Device Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[
            styles.deviceIcon,
            isConnected ? styles.deviceConnected : styles.deviceDisconnected
          ]}>
            <Ionicons 
              name={getDeviceIcon()} 
              size={18} 
              color={isConnected ? '#16A34A' : '#94A3B8'} 
            />
          </View>
          
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {device.name || 'Unknown Device'}
            </Text>
            {showDeviceInfo && (
              <Text style={styles.deviceType}>
                {getDeviceTypeName()}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {isConnected ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <View style={styles.disconnectedBadge}>
              <Text style={styles.disconnectedText}>Disconnected</Text>
            </View>
          )}
          
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color="#64748B" 
            style={styles.expandIcon}
          />
        </View>
      </TouchableOpacity>
      
      {/* Metric Content */}
      {expanded && (
        <View style={styles.content}>
          <MetricGrid 
            metrics={getDeviceMetrics}
            columns={2}
            spacing={8}
            onMetricPress={onMetricPress}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: expanded => expanded ? 1 : 0,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deviceConnected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  deviceDisconnected: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  deviceType: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  connectedText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '500',
  },
  disconnectedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  disconnectedText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  expandIcon: {
    marginLeft: 4,
  },
  content: {
    padding: 8,
  },
});

export default DeviceMetrics;