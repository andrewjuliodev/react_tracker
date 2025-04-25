import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import App from './App';
import { CONSTANTS } from '../config/constants';
import logger from '../utils/logger';

// Ignore specific warnings that are known issues with dependencies
LogBox.ignoreLogs([
  'Require cycle:',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Main() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState(null);

  // Load any resources or data needed before app startup
  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        logger.info('App initializing');

        // Load fonts, assets, and other resources here
        
        // Initialize services
        // await initializeServices();
        
        // Check and request required permissions
        // await checkPermissions();
        
        // Restore navigation state if present
        // const savedNavState = await loadNavigationState();
        // if (savedNavState) {
        //   setInitialNavigationState(savedNavState);
        // }
      } catch (error) {
        // Log any errors during app initialization
        logger.error('App initialization failed', error);
        console.warn('Error loading app resources:', error);
      } finally {
        // Mark loading as complete and hide splash screen
        setLoadingComplete(true);
        await SplashScreen.hideAsync();
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  // If app is still loading, return empty view
  if (!isLoadingComplete) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <App navigationState={initialNavigationState} />
    </View>
  );
}

// Global error handler for uncaught errors
const handleGlobalError = (error, errorInfo) => {
  logger.error('Uncaught app error', error, { errorInfo });
  
  // Here we could add additional error reporting like crash analytics
  if (CONSTANTS.DEBUG_MODE) {
    console.error('Uncaught error:', error, errorInfo);
  }
  
  // We could show a friendly error UI here for production
};

// Register the global error handler
if (!global.ErrorUtils._globalHandler) {
  global.ErrorUtils.setGlobalHandler(handleGlobalError);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});