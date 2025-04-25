import { createRef } from 'react';
import { CommonActions, StackActions } from '@react-navigation/native';
import ROUTES from './routes';

/**
 * Navigation reference that allows navigation from outside React components.
 * This is particularly useful for services that need to navigate.
 */
export const navigationRef = createRef();

/**
 * Flag to track if the navigation is ready/initialized
 */
let isNavigationReady = false;

/**
 * Reference to the current active route
 */
let currentRoute = null;

/**
 * Sets the navigation as ready
 */
export const setNavigationReady = () => {
  isNavigationReady = true;
};

/**
 * Navigates to a specified screen
 * @param {string} name - The route name
 * @param {Object} params - Optional parameters to pass to the route
 * @throws {Error} If navigation is not yet initialized
 */
export const navigate = (name, params) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot navigate to:', name);
    return;
  }

  navigationRef.current.navigate(name, params);
};

/**
 * Goes back to the previous screen
 * @returns {boolean} True if successful, false if at the top of the stack
 */
export const goBack = () => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot go back.');
    return false;
  }

  if (navigationRef.current.canGoBack()) {
    navigationRef.current.goBack();
    return true;
  }
  
  return false;
};

/**
 * Resets the navigation state to a given route
 * @param {string} name - The route name to reset to
 * @param {Object} params - Optional parameters for the route
 */
export const reset = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot reset to:', name);
    return;
  }

  navigationRef.current.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name, params }],
    })
  );
};

/**
 * Replaces the current screen with a new one
 * @param {string} name - The route name to replace with
 * @param {Object} params - Optional parameters for the route
 */
export const replace = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot replace with:', name);
    return;
  }

  navigationRef.current.dispatch(
    StackActions.replace(name, params)
  );
};

/**
 * Pushes a new screen onto the stack
 * @param {string} name - The route name to push
 * @param {Object} params - Optional parameters for the route
 */
export const push = (name, params = {}) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot push:', name);
    return;
  }

  navigationRef.current.dispatch(
    StackActions.push(name, params)
  );
};

/**
 * Pops the top n screens from the stack
 * @param {number} count - Number of screens to pop (default: 1)
 */
export const pop = (count = 1) => {
  if (!isNavigationReady || !navigationRef.current) {
    console.warn('Navigation is not ready. Cannot pop.');
    return;
  }

  navigationRef.current.dispatch(
    StackActions.pop(count)
  );
};

/**
 * Navigates to the activity tracking screen
 */
export const navigateToActivityTracking = () => {
  navigate(ROUTES.SCREENS.ACTIVITY_TRACKING);
};

/**
 * Navigates to the activity summary screen with activity data
 * @param {string} activityId - The ID of the activity to display
 */
export const navigateToActivitySummary = (activityId) => {
  navigate(ROUTES.SCREENS.ACTIVITY_SUMMARY, { activityId });
};

/**
 * Navigates to the device connection screen
 * @param {Object} options - Optional configuration for the connection screen
 */
export const navigateToDeviceConnection = (options = {}) => {
  navigate(ROUTES.SCREENS.DEVICE_CONNECTION, options);
};

/**
 * Navigates to the history screen
 * @param {Object} filters - Optional filters to apply to the history list
 */
export const navigateToHistory = (filters = {}) => {
  navigate(ROUTES.SCREENS.HISTORY, { filters });
};

/**
 * Gets the current route name
 * @returns {string|null} The current route name or null if not available
 */
export const getCurrentRouteName = () => {
  if (!navigationRef.current) {
    return null;
  }
  
  return navigationRef.current.getCurrentRoute()?.name || null;
};

/**
 * Updates the reference to the current route
 * @param {Object} route - The current route object
 */
export const updateCurrentRoute = (route) => {
  currentRoute = route;
};

/**
 * Gets the current route parameters
 * @returns {Object|null} The current route parameters or null if not available
 */
export const getCurrentRouteParams = () => {
  if (!navigationRef.current) {
    return null;
  }
  
  return navigationRef.current.getCurrentRoute()?.params || null;
};

export default {
  navigationRef,
  navigate,
  goBack,
  reset,
  replace,
  push,
  pop,
  navigateToActivityTracking,
  navigateToActivitySummary,
  navigateToDeviceConnection,
  navigateToHistory,
  getCurrentRouteName,
  getCurrentRouteParams,
  updateCurrentRoute,
};