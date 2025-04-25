import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as KeepAwake from 'expo-keep-awake';

// Import components
import Header from '../components/common/Header';
import Button from '../components/common/Button';
import MetricGrid from '../components/metrics/MetricGrid';
import MetricCard from '../components/metrics/MetricCard';
import ErrorMessage from '../components/common/ErrorMessage';

// Import hooks, services and utilities
import { useActivity } from '../../hooks/useActivity';
import { useSensorData } from '../../hooks/useSensorData';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { ACTIVITY_STATES, SENSOR_TYPES } from '../../config/constants';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';
import { formatDuration } from '../../utils/formatters';

const ActivityTrackingScreen = ({ navigation }) => {
  // Activity hook
  const { 
    activityState, 
    elapsedTime, 
    activityData, 
    startActivity, 
    pauseActivity, 
    stopActivity 
  } = useActivity();
  
  // Sensor data hook
  const { sensorData, derivedMetrics, isLoading: sensorsLoading } = useSensorData({
    types: [
      SENSOR_TYPES.HEART_RATE,
      SENSOR_TYPES.POWER,
      SENSOR_TYPES.CADENCE,
      SENSOR_TYPES.PACE,
      SENSOR_TYPES.DISTANCE,
    ],
    derived: true,
  });
  
  // Location tracking hook
  const { 
    isTracking: isLocationTracking,
    currentLocation,
    locationHistory,
    error: locationError,
    startTracking,
    stopTracking
  } = useLocationTracking();
  
  // Refs
  const recordingInterval = useRef(null);
  
  // State
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState([]);
  
  // Keep screen awake during activity
  useEffect(() => {
    if (activityState === ACTIVITY_STATES.ACTIVE || activityState === ACTIVITY_STATES.PAUSED) {
      KeepAwake.activateKeepAwake();
    } else {
      KeepAwake.deactivateKeepAwake();
    }
    
    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, [activityState]);
  
  // Set up periodic sensor data recording
  useEffect(() => {
    if (activityState === ACTIVITY_STATES.ACTIVE) {
      // Schedule periodic recording
      recordingInterval.current = setInterval(() => {
        // This would typically be handled by activityRecorder service
        logger.debug('Recording data point', { elapsedTime });
      }, 1000); // Record every second
      
      // Start location tracking if not already tracking
      if (!isLocationTracking) {
        startLocationTracking();
      }
      
      return () => {
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
      };
    } else if (activityState === ACTIVITY_STATES.PAUSED) {
      // Clear interval but keep location tracking
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    } else {
      // Clear interval and stop location tracking
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      
      if (isLocationTracking) {
        stopTracking();
      }
    }
    
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (isLocationTracking) {
        stopTracking();
      }
    };
  }, [activityState, isLocationTracking, elapsedTime]);
  
  // Update metrics when sensor data changes
  useEffect(() => {
    if (sensorData) {
      const currentMetrics = [
        {
          id: 'time',
          label: 'Time',
          value: elapsedTime,
          unit: 'time',
          format: 'duration',
          size: 'large',
          priority: 1,
        },
        {
          id: 'distance',
          label: 'Distance',
          value: derivedMetrics?.distance || sensorData?.distance || 0,
          unit: 'km',
          precision: 2,
          size: 'large',
          priority: 2,
        },
        {
          id: 'pace',
          label: 'Pace',
          value: derivedMetrics?.pace || sensorData?.pace || 0,
          unit: 'min/km',
          format: 'pace',
          size: 'medium',
          priority: 3,
        },
        {
          id: 'heart_rate',
          label: 'Heart Rate',
          value: sensorData?.heart_rate || 0,
          unit: 'bpm',
          precision: 0,
          size: 'medium',
          priority: 4,
        },
        {
          id: 'power',
          label: 'Power',
          value: sensorData?.power || 0,
          unit: 'watts',
          precision: 0,
          size: 'medium',
          priority: 5,
        },
        {
          id: 'cadence',
          label: 'Cadence',
          value: sensorData?.cadence || 0,
          unit: 'spm',
          precision: 0,
          size: 'medium',
          priority: 6,
        },
      ];
      
      setMetrics(currentMetrics);
    }
  }, [sensorData, derivedMetrics, elapsedTime]);
  
  /**
   * Starts or resumes the activity tracking
   * @returns {Promise<void>} Resolves when activity started
   * @throws {Error} If activity start fails
   */
  const handleStartActivity = async () => {
    try {
      setError(null);
      
      // Start location tracking if not already tracking
      if (!isLocationTracking) {
        await startLocationTracking();
      }
      
      // Start or resume activity
      if (activityState === ACTIVITY_STATES.PAUSED) {
        await resumeActivity();
      } else {
        await startNewActivity();
      }
    } catch (error) {
      logger.error('Failed to start activity', error);
      setError('Failed to start activity. Please try again.');
    }
  };
  
  /**
   * Starts location tracking
   * @returns {Promise<boolean>} Success status
   */
  const startLocationTracking = async () => {
    try {
      await startTracking({
        accuracy: 'high',
        timeInterval: 1000,
        distanceInterval: 5,
      });
      return true;
    } catch (error) {
      logger.error('Failed to start location tracking', error);
      throw error;
    }
  };
  
  /**
   * Starts a new activity
   * @returns {Promise<void>}
   */
  const startNewActivity = async () => {
    try {
      await startActivity({
        type: 'run',
        name: `Run - ${new Date().toLocaleDateString()}`,
        autoLap: true,
      });
      
      logger.info('Activity started');
    } catch (error) {
      logger.error('Failed to start new activity', error);
      throw error;
    }
  };
  
  /**
   * Resumes a paused activity
   * @returns {Promise<void>}
   */
  const resumeActivity = async () => {
    try {
      await startActivity();
      logger.info('Activity resumed');
    } catch (error) {
      logger.error('Failed to resume activity', error);
      throw error;
    }
  };
  
  /**
   * Pauses the current activity tracking
   * @returns {Promise<void>} Resolves when activity paused
   */
  const handlePauseActivity = async () => {
    try {
      setError(null);
      await pauseActivity();
      logger.info('Activity paused');
    } catch (error) {
      logger.error('Failed to pause activity', error);
      setError('Failed to pause activity. Please try again.');
    }
  };
  
  /**
   * Stops and completes the current activity
   * @returns {Promise<void>} Resolves when activity stopped
   */
  const handleStopActivity = async () => {
    try {
      // Confirm before stopping
      if (activityState === ACTIVITY_STATES.ACTIVE || activityState === ACTIVITY_STATES.PAUSED) {
        Alert.alert(
          'End Activity',
          'Are you sure you want to end this activity?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'End Activity', 
              style: 'destructive',
              onPress: async () => {
                try {
                  const stoppedActivity = await stopActivity();
                  logger.info('Activity completed', { activityId: stoppedActivity.id });
                  
                  // Navigate to summary screen
                  navigation.navigate(ROUTES.SCREENS.ACTIVITY_SUMMARY, {
                    activityId: stoppedActivity.id,
                  });
                } catch (error) {
                  logger.error('Failed to stop activity', error);
                  setError('Failed to stop activity. Please try again.');
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      logger.error('Error handling stop activity', error);
      setError('An error occurred. Please try again.');
    }
  };
  
  /**
   * Schedules periodic sensor data recording
   * @param {number} intervalMs - Milliseconds between recordings
   * @returns {number} Interval ID for cleanup
   */
  const scheduleDataRecording = (intervalMs = 1000) => {
    return setInterval(() => {
      // This would be implemented in activityRecorder service
      logger.debug('Recording data point');
    }, intervalMs);
  };
  
  // Render metrics grid
  const renderMetricsGrid = () => {
    return (
      <MetricGrid
        metrics={metrics}
        columns={2}
        spacing={8}
      />
    );
  };
  
  // Render action buttons based on activity state
  const renderActionButtons = () => {
    switch (activityState) {
      case ACTIVITY_STATES.IDLE:
        return (
          <Button
            label="Start Activity"
            onPress={handleStartActivity}
            variant="primary"
            icon="play"
            style={styles.actionButton}
          />
        );
      
      case ACTIVITY_STATES.ACTIVE:
        return (
          <View style={styles.buttonRow}>
            <Button
              label="Pause"
              onPress={handlePauseActivity}
              variant="secondary"
              icon="pause"
              style={[styles.actionButton, styles.buttonRowItem]}
            />
            <Button
              label="Stop"
              onPress={handleStopActivity}
              variant="danger"
              icon="stop"
              style={[styles.actionButton, styles.buttonRowItem]}
            />
          </View>
        );
      
      case ACTIVITY_STATES.PAUSED:
        return (
          <View style={styles.buttonRow}>
            <Button
              label="Resume"
              onPress={handleStartActivity}
              variant="primary"
              icon="play"
              style={[styles.actionButton, styles.buttonRowItem]}
            />
            <Button
              label="Stop"
              onPress={handleStopActivity}
              variant="danger"
              icon="stop"
              style={[styles.actionButton, styles.buttonRowItem]}
            />
          </View>
        );
      
      default:
        return null;
    }
  };
  
  // Render elapsed time
  const renderElapsedTime = () => {
    const timeString = formatDuration(elapsedTime, true);
    
    return (
      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>Elapsed Time</Text>
        <Text style={styles.timeValue}>{timeString}</Text>
        
        {activityState === ACTIVITY_STATES.PAUSED && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Render device connection button
  const renderDeviceButton = () => {
    return (
      <TouchableOpacity
        style={styles.deviceButton}
        onPress={() => navigation.navigate(ROUTES.SCREENS.DEVICE_CONNECTION, {
          returnToScreen: ROUTES.SCREENS.ACTIVITY_TRACKING
        })}
      >
        <Ionicons name="bluetooth" size={18} color="#2563EB" />
        <Text style={styles.deviceButtonText}>Devices</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark-content" />
      
      <Header 
        title="Activity" 
        showBack={false}
        rightActions={[
          {
            icon: 'settings-outline',
            onPress: () => navigation.navigate(ROUTES.SCREENS.SETTINGS)
          }
        ]}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Elapsed time */}
        {renderElapsedTime()}
        
        {/* Error message */}
        {error && (
          <ErrorMessage 
            message={error} 
            style={styles.errorContainer} 
          />
        )}
        
        {/* Location error */}
        {locationError && (
          <ErrorMessage 
            message={`Location error: ${locationError}`} 
            style={styles.errorContainer} 
          />
        )}
        
        {/* Metrics grid */}
        <View style={styles.metricsContainer}>
          {renderMetricsGrid()}
        </View>
        
        {/* Connect devices button */}
        {activityState === ACTIVITY_STATES.IDLE && renderDeviceButton()}
      </ScrollView>
      
      {/* Action buttons */}
      <View style={styles.actionContainer}>
        {renderActionButtons()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  pausedBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pausedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  errorContainer: {
    marginBottom: 16,
  },
  metricsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  deviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    marginBottom: 16,
  },
  deviceButtonText: {
    color: '#2563EB',
    fontWeight: '500',
    marginLeft: 6,
    fontSize: 14,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRowItem: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ActivityTrackingScreen;