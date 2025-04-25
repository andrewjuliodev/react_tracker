import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import logger from '../../../utils/logger';

/**
 * Component for displaying error messages to the user
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Error message to display
 * @param {string} props.code - Optional error code reference
 * @param {function} props.onRetry - Optional retry handler
 * @param {string} props.severity - Error importance ('info', 'warning', 'error')
 * @param {Object} props.style - Additional styles for the container
 * @param {string} props.testID - Test identifier
 */
const ErrorMessage = ({
  message,
  code,
  onRetry,
  severity = 'error',
  style,
  testID,
}) => {
  // Log error to analytics/monitoring service
  useEffect(() => {
    // Check if error logging is enabled
    if (process.env.ERROR_LOGGING_ENABLED !== 'false') {
      logError(message, code);
    }
  }, [message, code]);
  
  /**
   * Logs error to analytics/monitoring service
   * @param {string} message - Error message
   * @param {string} code - Error code
   */
  const logError = (message, code) => {
    switch (severity) {
      case 'info':
        logger.info('UI Error (Info)', { message, code });
        break;
      case 'warning':
        logger.warn('UI Error (Warning)', { message, code });
        break;
      case 'error':
      default:
        logger.error('UI Error', { message, code });
        break;
    }
  };
  
  // Get styles based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case 'info':
        return {
          container: styles.infoContainer,
          icon: 'information-circle',
          iconColor: '#0EA5E9',
        };
      case 'warning':
        return {
          container: styles.warningContainer,
          icon: 'warning',
          iconColor: '#F59E0B',
        };
      case 'error':
      default:
        return {
          container: styles.errorContainer,
          icon: 'alert-circle',
          iconColor: '#DC2626',
        };
    }
  };
  
  const { container, icon, iconColor } = getSeverityStyles();
  
  return (
    <View 
      style={[styles.container, container, style]}
      testID={testID}
      accessibilityRole="alert"
    >
      <View style={styles.contentRow}>
        <Ionicons name={icon} size={24} color={iconColor} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.message}>{message}</Text>
          {code && <Text style={styles.code}>Code: {code}</Text>}
        </View>
      </View>
      
      {onRetry && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Ionicons name="refresh" size={16} color={iconColor} />
          <Text style={[styles.retryText, { color: iconColor }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
    flexShrink: 1,
  },
  code: {
    fontSize: 12,
    color: '#64748B',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 36,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Severity-specific styles
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  infoContainer: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
});

export default ErrorMessage;