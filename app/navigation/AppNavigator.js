/**
 * Main navigation container that defines the app's routing structure and navigation hierarchy.
 * 
 * Configures stack, tab, and drawer navigators
 * Defines screen transitions and animations
 * Manages authentication flow routing
 * Handles deep linking configuration
 */
import React, { useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// Screens
// Correct screen imports (relative to app/navigation/AppNavigator.js)
import WelcomeScreen from '../screens/WelcomeScreen';  // ✅ Correct path
import DeviceConnectionScreen from '../screens/DeviceConnectionScreen';
import ActivityTrackingScreen from '../screens/ActivityTrackingScreen';
import ActivitySummaryScreen from '../screens/ActivitySummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Navigation utilities
import { navigationRef } from './navigationRef';
import ROUTES from './routes';

// Hooks
//import useAuth from '../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

/**
 * Main tab navigator for the authenticated app experience
 */
const MainTabNavigator = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === ROUTES.ACTIVITY_TRACKING) {
            iconName = focused ? 'ios-pulse' : 'ios-pulse-outline';
          } else if (route.name === ROUTES.HISTORY) {
            iconName = focused ? 'ios-time' : 'ios-time-outline';
          } else if (route.name === ROUTES.SETTINGS) {
            iconName = focused ? 'ios-settings' : 'ios-settings-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        headerShown: false
      })}
    >
      <Tab.Screen 
        name={ROUTES.ACTIVITY_TRACKING} 
        component={ActivityTrackingScreen}
        options={{ tabBarLabel: 'Activity' }}
      />
      <Tab.Screen 
        name={ROUTES.HISTORY} 
        component={HistoryStack}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen 
        name={ROUTES.SETTINGS} 
        component={SettingsStack}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

/**
 * History stack navigator for viewing past activities
 */
const HistoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen
        name={ROUTES.HISTORY_LIST}
        component={HistoryScreen}
        options={{ title: 'Activity History' }}
      />
      <Stack.Screen
        name={ROUTES.ACTIVITY_SUMMARY}
        component={ActivitySummaryScreen}
        options={{ title: 'Activity Details' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Settings stack navigator
 */
const SettingsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen
        name={ROUTES.SETTINGS_MAIN}
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name={ROUTES.DEVICE_CONNECTION}
        component={DeviceConnectionScreen}
        options={{ title: 'Manage Devices' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Onboarding stack navigator for first-time users
 */
const OnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name={ROUTES.WELCOME}
        component={WelcomeScreen}
      />
      <Stack.Screen
        name={ROUTES.DEVICE_CONNECTION}
        component={DeviceConnectionScreen}
      />
    </Stack.Navigator>
  );
};

/**
 * Main app navigator that handles authentication state
 * and shows the appropriate navigator based on user status
 */
const AppNavigator = () => {
  //const { isAuthenticated, isFirstLaunch, isLoading } = useAuth();
  const { theme } = useTheme();
  
  // Handle screen logging if enabled
  useEffect(() => {
    const disableScreenLogging = process.env.DISABLE_SCREEN_LOGGING === 'true';
    
    if (!disableScreenLogging) {
      // Set up screen tracking logic here
    }
  }, []);

  // Show loading screen while authentication state is being determined
  if (isLoading) {
    return null; // Replace with a loading screen component if needed
  }

  /**
   * Conditionally renders authentication flows based on user state
   * @returns {React.ReactElement} The appropriate navigator component
   */
  const renderNavigator = () => {
    // Force onboarding for testing if environment variable is set
    const forceOnboarding = process.env.FORCE_ONBOARDING === 'true';
    
    if (!isAuthenticated || (isFirstLaunch || forceOnboarding)) {
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name={ROUTES.STACKS.ONBOARDING} component={OnboardingStack} />
        </Stack.Navigator>
      );
    }
    
    return (
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: theme.colors.primary,
        }}
      >
        <Drawer.Screen 
          name={ROUTES.STACKS.MAIN}
          component={MainTabNavigator}
          options={{
            title: 'RaceTracker',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="ios-fitness" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    );
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      theme={{
        dark: theme.dark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.notification,
        },
      }}
      linking={{
        prefixes: ['racetracker://'],
        config: {
          screens: {
            [ROUTES.STACKS.MAIN]: {
              screens: {
                [ROUTES.HISTORY]: {
                  screens: {
                    [ROUTES.ACTIVITY_SUMMARY]: 'activity/:id',
                  },
                },
                [ROUTES.SETTINGS]: {
                  screens: {
                    [ROUTES.SETTINGS_MAIN]: 'settings/:section',
                  },
                },
              },
            },
          },
        },
      }}
    >
      {renderNavigator()}
    </NavigationContainer>
  );
};

export default AppNavigator;