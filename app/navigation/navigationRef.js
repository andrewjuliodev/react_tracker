/**
 * Provides a way to access the navigation object outside of React components.
 * 
 * Creates a navigation reference
 * Exposes methods for programmatic navigation
 * Enables navigation from non-component code
 */
import { createRef } from 'react';              // ← your snippet import
import { StackActions, CommonActions } from '@react-navigation/native';
import ROUTES from './routes';

/**
 * Create a navigation reference that can be used outside of React components
 */
export const navigationRef = createRef();       // ← your snippet code

/**
 * Navigate to a route from outside of components
 */
export const navigate = (name, params) => {     // ← your snippet code
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  } else {
    console.warn('Navigation is not ready yet');
  }
};

/**
 * Reset navigation stack
 */
export const reset = (state) => {               // ← your snippet code
  if (navigationRef.current) {
    navigationRef.current.reset(state);
  } else {
    console.warn('Navigation is not ready yet');
  }
};

/**
 * Go back
 */
export const goBack = () => {                   // ← your snippet code
  if (navigationRef.current && navigationRef.current.canGoBack()) {
    navigationRef.current.goBack();
  } else {
    console.warn('Cannot go back or navigation is not ready');
  }
};

/**
 * Indicates if navigation is initialized
 */
let isNavigationReady = false;

/**
 * Current active route reference
 */
let currentRoute = null;

/**
 * Sets the navigation as ready and tracks the current route
 */
export const onNavigationReady = () => {
  isNavigationReady = true;
  
  // Set up route tracking
  const state = navigationRef.current?.getRootState();
  if (state) {
    const route = state.routes[state.index];
    currentRoute = { name: route.name, params: route.params };
  }
};

/**
 * Gets the current route information
 * @returns {Object|null} Current route with name and params
 */
export const getCurrentRoute = () => {
  if (!isNavigationReady || !navigationRef.current) {
    return null;
  }
  
  const state = navigationRef.current.getRootState();
  if (state) {
    const route = state.routes[state.index];
    return { name: route.name, params: route.params };
  }
  
  return currentRoute;
};

/**
 * Navigates to a specified screen
 * @param {string} name - The route name
 * @param {Object} params - Optional parameters to pass to the route
 * @throws {Error} If navigation is not yet initialized
 */
export const navigateAdvanced = (name, params) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. Navigation request queued.');
    
    // Queue navigation for when it becomes available
    const checkAndNavigate = setInterval(() => {
      if (isNavigationReady && navigationRef.current) {
        clearInterval(checkAndNavigate);
        navigationRef.current.navigate(name, params);
      }
    }, 100);
    
    // Clear interval after 5 seconds to prevent memory leaks
    setTimeout(() => clearInterval(checkAndNavigate), 5000);
    return;
  }
  
  navigationRef.current.navigate(name, params);
};

/**
 * Resets the navigation state to a given route (advanced)
 * @param {string} name - The route name to reset to
 * @param {Object} params - Optional parameters for the route
 */
export const resetAdvanced = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. Reset request queued.');
    
    // Queue reset for when navigation becomes available
    const checkAndReset = setInterval(() => {
      if (isNavigationReady && navigationRef.current) {
        clearInterval(checkAndReset);
        performReset(name, params);
      }
    }, 100);
    
    // Clear interval after 5 seconds to prevent memory leaks
    setTimeout(() => clearInterval(checkAndReset), 5000);
    return;
  }
  
  performReset(name, params);
};

const performReset = (name, params) => {
  navigationRef.current.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name, params }],
    })
  );
};

/**
 * Replaces the current screen with a new one
 */
export const replace = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. Replace request queued.');
    return;
  }
  
  navigationRef.current.dispatch(StackActions.replace(name, params));
};

/**
 * Pushes a new screen onto the stack
 */
export const push = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. Push request queued.');
    return;
  }
  
  navigationRef.current.dispatch(StackActions.push(name, params));
};

/**
 * Pops a specified number of screens from the stack
 */
export const pop = (count = 1) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. Pop request queued.');
    return;
  }
  
  navigationRef.current.dispatch(StackActions.pop(count));
};

/**
 * Pops to the top screen of the stack
 */
export const popToTop = () => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready yet. PopToTop request queued.');
    return;
  }
  
  navigationRef.current.dispatch(StackActions.popToTop());
};

/**
 * Convenience navigators for your app
 */
export const navigateToActivityTracking = () => {
  navigate(ROUTES.ACTIVITY_TRACKING);
};

export const navigateToActivitySummary = (activityId) => {
  navigate(ROUTES.ACTIVITY_SUMMARY, { id: activityId });
};

export const navigateToDeviceConnection = (isSetup = false) => {
  navigate(ROUTES.DEVICE_CONNECTION, { isSetup });
};

export const navigateToSettings = (section) => {
  navigate(ROUTES.SETTINGS, { section });
};

/**
 * Default export is the raw navigationRef
 */
export default navigationRef;
