/**
 * Defines constants for all route names in the application to prevent hardcoded strings.
 * 
 * Screen name constants
 * Stack navigator names
 * Route parameter structures
 * Deep link path mapping
 */

/**
 * Individual screen route names
 */
const SCREENS = {
    // Onboarding screens
    WELCOME: 'Welcome',
    DEVICE_CONNECTION: 'DeviceConnection',
    
    // Main app screens
    ACTIVITY_TRACKING: 'ActivityTracking',
    ACTIVITY_SUMMARY: 'ActivitySummary',
    HISTORY: 'History',
    HISTORY_LIST: 'HistoryList',
    SETTINGS: 'Settings',
    SETTINGS_MAIN: 'SettingsMain',
  };
  
  /**
   * Navigator stack names
   */
  const STACKS = {
    ONBOARDING: 'OnboardingStack',
    MAIN: 'MainStack',
    ACTIVITY: 'ActivityStack',
    HISTORY: 'HistoryStack',
    SETTINGS: 'SettingsStack',
  };
  
  /**
   * Tab navigator route names
   */
  const TABS = {
    ACTIVITY: 'ActivityTab',
    HISTORY: 'HistoryTab',
    SETTINGS: 'SettingsTab',
  };
  
  /**
   * Parameter structure for routes
   */
  const PARAMS = {
    ACTIVITY_ID: 'id',
    DEVICE_ID: 'deviceId',
    IS_SETUP: 'isSetup',
    SETTINGS_SECTION: 'section',
  };
  
  /**
   * Creates a deep link path for a given route
   * @param {string} routeName - The route name constant
   * @param {Object} params - Parameters to include in the path
   * @returns {string} Formatted deep link path
   */
  const createDeepLink = (routeName, params = {}) => {
    let path = 'racetracker://';
    
    // Build path based on route name
    switch(routeName) {
      case SCREENS.ACTIVITY_SUMMARY:
        path += `activity/${params[PARAMS.ACTIVITY_ID] || ''}`;
        break;
      case SCREENS.SETTINGS:
        path += `settings/${params[PARAMS.SETTINGS_SECTION] || ''}`;
        break;
      case SCREENS.DEVICE_CONNECTION:
        path += 'devices';
        if (params[PARAMS.DEVICE_ID]) {
          path += `/${params[PARAMS.DEVICE_ID]}`;
        }
        break;
      default:
        path += routeName.toLowerCase();
    }
    
    return path;
  };
  
  /**
   * Deep link path mapping to routes
   */
  const DEEP_LINKS = {
    'activity': SCREENS.ACTIVITY_SUMMARY,
    'settings': SCREENS.SETTINGS,
    'devices': SCREENS.DEVICE_CONNECTION,
  };
  
  /**
   * Route configuration for deep linking
   */
  const DEEP_LINK_CONFIG = {
    screens: {
      [STACKS.MAIN]: {
        screens: {
          [TABS.HISTORY]: {
            screens: {
              [STACKS.HISTORY]: {
                screens: {
                  [SCREENS.ACTIVITY_SUMMARY]: 'activity/:id',
                },
              },
            },
          },
          [TABS.SETTINGS]: {
            screens: {
              [STACKS.SETTINGS]: {
                screens: {
                  [SCREENS.SETTINGS]: 'settings/:section',
                  [SCREENS.DEVICE_CONNECTION]: 'devices/:deviceId?',
                },
              },
            },
          },
        },
      },
    },
  };
  
  // Combine all route constants
  const ROUTES = {
    ...SCREENS,
    STACKS,
    TABS,
    PARAMS,
    DEEP_LINKS,
    DEEP_LINK_CONFIG,
    createDeepLink,
  };
  
  export default ROUTES;