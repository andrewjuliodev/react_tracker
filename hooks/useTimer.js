import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { logger } from '../utils/logger';

/**
 * Custom hook for timer functionality in activity tracking
 * @param {Object} options - Timer configuration options
 * @param {boolean} options.autoStart - Whether timer should start automatically
 * @param {number} options.initialTime - Starting time in milliseconds
 * @param {Function} options.onTick - Callback called on each timer tick
 * @returns {Object} Timer controls and state
 */
const useTimer = ({ 
  autoStart = false, 
  initialTime = 0,
  onTick = null 
} = {}) => {
  // State for tracking elapsed time in milliseconds
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  // State for tracking if timer is currently running
  const [isRunning, setIsRunning] = useState(autoStart);
  // State for tracking if timer has ever been started
  const [hasStarted, setHasStarted] = useState(false);

  // Refs for tracking start time and tracking timer intervals
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);

  // Cleanup function to clear timer interval
  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Function to start the timer
  const start = useCallback(() => {
    if (isRunning) return;

    logger.info('Starting timer');
    setIsRunning(true);
    setHasStarted(true);
    
    // Note the start time or resume from current elapsed time
    const now = Date.now();
    startTimeRef.current = now - elapsedTime;
    lastTickRef.current = now;
    
    // Start the interval timer with 100ms precision
    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const newElapsedTime = currentTime - startTimeRef.current;
      setElapsedTime(newElapsedTime);
      
      // Call onTick callback if provided
      if (onTick) {
        onTick(newElapsedTime);
      }
      
      lastTickRef.current = currentTime;
    }, 100);
  }, [isRunning, elapsedTime, onTick]);

  // Function to pause the timer
  const pause = useCallback(() => {
    if (!isRunning) return;
    
    logger.info('Pausing timer');
    setIsRunning(false);
    cleanupTimer();
  }, [isRunning, cleanupTimer]);

  // Function to stop the timer
  const stop = useCallback(() => {
    logger.info('Stopping timer');
    setIsRunning(false);
    cleanupTimer();
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [cleanupTimer]);

  // Function to reset the timer
  const reset = useCallback(() => {
    logger.info('Resetting timer');
    setElapsedTime(initialTime);
    startTimeRef.current = null;
    
    if (isRunning) {
      cleanupTimer();
      start();
    }
  }, [isRunning, initialTime, cleanupTimer, start]);

  // Handle app going to background and coming back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      // If app is coming back to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isRunning) {
          // Calculate elapsed time while in background
          const now = Date.now();
          const timeSinceLastTick = now - lastTickRef.current;
          
          // If significant time passed in background, update elapsed time
          if (timeSinceLastTick > 1000) {
            const newElapsedTime = now - startTimeRef.current;
            setElapsedTime(newElapsedTime);
            lastTickRef.current = now;
            
            logger.info(`Timer adjusted after background: ${timeSinceLastTick}ms passed`);
          }
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => cleanupTimer();
  }, [cleanupTimer]);

  // Auto start timer if configured
  useEffect(() => {
    if (autoStart) {
      start();
    }
    
    return () => cleanupTimer();
  }, [autoStart, start, cleanupTimer]);

  // Utility function to format time as HH:MM:SS
  const formatTime = (ms) => {
    // Calculate hours, minutes, seconds from milliseconds
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Format with leading zeros
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    
    // Return formatted time string
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  // Return timer controls and state
  return {
    elapsedTime,
    isRunning,
    hasStarted,
    start,
    pause,
    stop,
    reset,
    formattedTime: formatTime(elapsedTime)
  };
};

export default useTimer;