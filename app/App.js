import React, { useEffect, useState, useRef } from 'react';
import { AppState, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import context providers
import { AppProvider } from '../context/AppContext';
import { BleProvider } from '../context/BleContext';
import { ActivityProvider } from '../context/ActivityContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// Import navigation and theme
import AppNavigator from '../navigation/AppNavigator';
import { navigationRef } from '../navigation/navigationRef';
import theme from '../config/theme';

// Import utilities
import logger from '../utils/logger';

const AppContent = ({ isAuthenticated, isFirstLaunch }) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer 
        ref={navigationRef}
        onStateChange={(state) => {
          // saveNavigationState(state);
        }}
      >
        <SafeAreaView style={styles.container}>
          <AppNavigator 
            isAuthenticated={isAuthenticated} 
            isFirstLaunch={isFirstLaunch}
          />
        </SafeAreaView>
      </NavigationContainer>
    </>
  );
};

export default function App({ navigationState }) {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    initializeApp();
    return () => subscription.remove();
  }, []);

  const initializeApp = async () => {
    try {
      logger.info('App started');
      // const firstLaunch = await checkFirstLaunch();
      // setIsFirstLaunch(firstLaunch);
      // const authStatus = await checkAuthStatus();
      // setIsAuthenticated(authStatus);
    } catch (error) {
      logger.error('App initialization error', error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    logger.debug(`App state changed: ${appState.current} -> ${nextAppState}`);
    if (
      appState.current.match(/inactive|background/) && 
      nextAppState === 'active'
    ) {
      logger.info('App has come to the foreground');
    } else if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      logger.info('App has gone to the background');
    }
    appState.current = nextAppState;
    setAppStateVisible(nextAppState);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider initialTheme={theme}>
          <AppProvider>
            <BleProvider>
              <SettingsProvider>
                <ActivityProvider>
                  <AppContent 
                    isAuthenticated={isAuthenticated} 
                    isFirstLaunch={isFirstLaunch}
                  />
                </ActivityProvider>
              </SettingsProvider>
            </BleProvider>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
