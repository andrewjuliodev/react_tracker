import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  SafeAreaView, 
  StatusBar, 
  ScrollView,
  Alert
} from 'react-native';
import Constants from 'expo-constants';

// Import components
import Button from '../components/common/Button';
import Header from '../components/common/Header';
import LoadingIndicator from '../components/common/LoadingIndicator';

// Import utilities and hooks
import { requestPermission, checkPermission } from '../../utils/permissions';
import { PERMISSIONS } from '../../config/constants';
import { STORAGE_KEYS } from '../../config/constants';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';

// Import hooks
import { useSettings } from '../../hooks/useSettings';

const WelcomeScreen = ({ navigation }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState({
    location: false,
    bluetooth: false,
  });
  
  // Get settings hook
  const { setSetting } = useSettings();
  
  // Check permissions on mount
  useEffect(() => {
    const checkInitialPermissions = async () => {
      try {
        setLoading(true);
        
        // Check location permission
        const locationPermission = await checkPermission(PERMISSIONS.LOCATION.name);
        
        // Check Bluetooth permission
        const bluetoothPermission = await checkPermission(PERMISSIONS.BLUETOOTH.name);
        
        setPermissionsGranted({
          location: locationPermission,
          bluetooth: bluetoothPermission
        });
        
        logger.info('Initial permission check complete', { locationPermission, bluetoothPermission });
      } catch (error) {
        logger.error('Error checking permissions', error);
      } finally {
        setLoading(false);
      }
    };

    checkInitialPermissions();
  }, []);

  /**
   * Requests necessary app permissions
   * @returns {Promise<boolean>} Resolves to true if all permissions granted
   * @throws {Error} If permission request fails
   */
  const requestPermissions = async () => {
    try {
      setLoading(true);
      
      // Request location permission
      const locationGranted = await requestPermission(
        PERMISSIONS.LOCATION.name, 
        true
      );
      
      // Request Bluetooth permission
      const bluetoothGranted = await requestPermission(
        PERMISSIONS.BLUETOOTH.name, 
        true
      );
      
      setPermissionsGranted({
        location: locationGranted,
        bluetooth: bluetoothGranted
      });
      
      const allGranted = locationGranted && bluetoothGranted;
      
      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'Some permissions were denied. The app may not function correctly without these permissions.',
          [{ text: 'OK' }]
        );
      }
      
      logger.info('Permission request complete', { locationGranted, bluetoothGranted });
      
      return allGranted;
    } catch (error) {
      logger.error('Error requesting permissions', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles navigation to next screen based on user selection
   * @param {boolean} skipDeviceSetup - Whether to skip BLE device setup
   */
  const handleContinue = async (skipDeviceSetup = false) => {
    try {
      // Request permissions if not granted
      if (!permissionsGranted.location || !permissionsGranted.bluetooth) {
        const granted = await requestPermissions();
        if (!granted) return;
      }
      
      // Mark onboarding as complete
      await completeOnboarding();
      
      // Navigate to device setup or main app
      if (skipDeviceSetup) {
        navigation.replace(ROUTES.SCREENS.ACTIVITY_TRACKING);
      } else {
        navigation.navigate(ROUTES.SCREENS.DEVICE_CONNECTION);
      }
    } catch (error) {
      logger.error('Error during welcome flow', error);
      Alert.alert('Error', 'There was an error setting up the app. Please try again.');
    }
  };

  /**
   * Marks onboarding as complete in settings
   * @returns {Promise<void>} Resolves when setting is saved
   */
  const completeOnboarding = async () => {
    try {
      await setSetting(STORAGE_KEYS.FIRST_LAUNCH, false);
      logger.info('Onboarding marked as complete');
    } catch (error) {
      logger.error('Error saving onboarding status', error);
      throw error;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingIndicator size="large" message="Setting up..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Header title="Welcome" showBack={false} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>RaceTracker</Text>
          <Text style={styles.subtitle}>Track your runs with precision</Text>
          
          <View style={styles.featureContainer}>
            <Text style={styles.featureTitle}>Key Features:</Text>
            <Text style={styles.featureItem}>• Connect with Bluetooth devices</Text>
            <Text style={styles.featureItem}>• Track runs with GPS</Text>
            <Text style={styles.featureItem}>• Monitor heart rate, pace, and power</Text>
            <Text style={styles.featureItem}>• Review detailed performance metrics</Text>
            <Text style={styles.featureItem}>• Analyze your training history</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            label="Set Up Devices"
            onPress={() => handleContinue(false)}
            variant="primary"
            style={styles.button}
          />
          <Button
            label="Skip for Now"
            onPress={() => handleContinue(true)}
            variant="secondary"
            style={styles.button}
          />
        </View>
        
        <Text style={styles.versionText}>
          Version {Constants.manifest.version || '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 30,
    textAlign: 'center',
  },
  featureContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0F172A',
  },
  featureItem: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 10,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginBottom: 20,
  },
});

export default WelcomeScreen;