import React from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet,
} from 'react-native';

/**
 * Loading indicator component for displaying operation progress
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Indicator size ('small', 'large')
 * @param {string} props.color - Spinner color
 * @param {boolean} props.fullScreen - Whether to overlay entire screen
 * @param {string} props.message - Optional text to display
 * @param {Object} props.style - Additional styles for the container
 * @param {string} props.testID - Test identifier
 */
const LoadingIndicator = ({
  size = 'large',
  color = '#2563EB',
  fullScreen = false,
  message = '',
  style,
  testID,
}) => {
  // If fullScreen, render as an overlay
  if (fullScreen) {
    return (
      <View 
        style={[styles.fullScreenContainer, style]}
        testID={testID}
        accessibilityLabel={message || 'Loading'}
        accessibilityRole="progressbar"
      >
        <View style={styles.loadingBox}>
          <ActivityIndicator size={size} color={color} />
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}
        </View>
      </View>
    );
  }
  
  // Otherwise, render inline
  return (
    <View 
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={message || 'Loading'}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size={size} color={color} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  message: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoadingIndicator;