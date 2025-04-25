import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import WelcomeScreen from '../app/screens/WelcomeScreen';
import DeviceConnectionScreen from '../app/screens/DeviceConnectionScreen';
import ActivityTrackingScreen from '../app/screens/ActivityTrackingScreen';
import ActivitySummaryScreen from '../app/screens/ActivitySummaryScreen';
import HistoryScreen from '../app/screens/HistoryScreen';
import SettingsScreen from '../app/screens/SettingsScreen';

// Import routes
import ROUTES from './routes';

// Import logger
import logger from '../utils/logger';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Create the bottom tab navigator for the main app screens
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          // Set icon based on route name
          if (route.name === ROUTES.SCREENS.ACTIVITY_TRACKING) {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === ROUTES.SCREENS.HISTORY) {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === ROUTES.SCREENS.SETTINGS) {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          // Return the icon component
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name={ROUTES.SCREENS.ACTIVITY_TRACKING} 
        component={ActivityTrackingScreen} 
        options={{ 
          title: 'Activity',
        }}
      />
      <Tab.Screen 
        name={ROUTES.SCREENS.HISTORY} 
        component={HistoryScreen} 
        options={{ 
          title: 'History',
        }}
      />
      <Tab.Screen 
        name={ROUTES.SCREENS.SETTINGS} 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Create the onboarding stack for first-time users
const OnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen 
        name={ROUTES.SCREENS.WELCOME} 
        component={WelcomeScreen} 
      />
      <Stack.Screen 
        name={ROUTES.SCREENS.DEVICE_CONNECTION} 
        component={DeviceConnectionScreen} 
      />
      <Stack.Screen 
        name={ROUTES.SCREENS.ACTIVITY_TRACKING} 
        component={ActivityTrackingScreen} 
      />
    </Stack.Navigator>
  );
};

// Create the main app stack
const MainAppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen 
        name={ROUTES.STACKS.MAIN_TAB} 
        component={MainTabNavigator} 
      />
      <Stack.Screen 
        name={ROUTES.SCREENS.ACTIVITY_SUMMARY} 
        component={ActivitySummaryScreen} 
        options={{
          headerShown: true,
          title: 'Activity Summary',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name={ROUTES.SCREENS.DEVICE_CONNECTION} 
        component={DeviceConnectionScreen} 
        options={{
          headerShown: true,
          title: 'Connect Devices',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

// Main app navigator component
const AppNavigator = ({ isAuthenticated, isFirstLaunch }) => {
  // Log navigation state for debugging
  if (!process.env.DISABLE_SCREEN_LOGGING) {
    logger.debug(`Navigation state: authenticated=${isAuthenticated}, firstLaunch=${isFirstLaunch}`);
  }

  // Determine which navigator to show based on onboarding and auth state
  const renderNavigator = () => {
    // Show onboarding for first-time users
    if (isFirstLaunch || process.env.FORCE_ONBOARDING === 'true') {
      return <OnboardingStack />;
    }
    
    // Show main app if authenticated
    if (isAuthenticated) {
      return <MainAppStack />;
    }
    
    // Default to onboarding if not authenticated (placeholder for future auth flow)
    return <OnboardingStack />;
  };

  return <View style={styles.container}>{renderNavigator()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppNavigator;