import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '../../navigation/navigationRef';

/**
 * Consistent header component for screen navigation and actions
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Screen title to display
 * @param {boolean} props.showBack - Whether to show back button
 * @param {function} props.onBackPress - Custom back button handler (defaults to navigationRef.goBack)
 * @param {Array} props.rightActions - Optional action buttons for right side
 * @param {boolean} props.transparent - Whether header has background
 * @param {Object} props.style - Additional styles for the header container
 * @param {Object} props.titleStyle - Additional styles for the title text
 */
const Header = ({
  title,
  showBack = false,
  onBackPress,
  rightActions = [],
  transparent = false,
  style,
  titleStyle,
}) => {
  // Get safe area insets for proper positioning
  const insets = useSafeAreaInsets();
  
  /**
   * Handles back button press
   * @returns {void}
   */
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      goBack();
    }
  };
  
  /**
   * Renders optional right-side action buttons
   * @param {Array} actions - Action button definitions
   * @returns {React.ReactNode} Action buttons or null
   */
  const renderRightActions = () => {
    if (!rightActions || rightActions.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.rightActionsContainer}>
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={`action-${index}`}
            style={styles.actionButton}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityLabel={action.label || `Action ${index + 1}`}
          >
            {action.icon && (
              <Ionicons
                name={action.icon}
                size={24}
                color={action.color || '#0F172A'}
                style={action.disabled ? styles.disabledIcon : null}
              />
            )}
            {action.label && (
              <Text 
                style={[
                  styles.actionText,
                  action.disabled && styles.disabledText,
                  action.textStyle,
                ]}
              >
                {action.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? 0 : 8 },
        transparent ? styles.transparentContainer : styles.solidContainer,
        style,
      ]}
    >
      <StatusBar
        barStyle={transparent ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      
      <View style={styles.contentContainer}>
        {/* Left side - Back button or empty space */}
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={transparent ? '#FFFFFF' : '#0F172A'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
        </View>
        
        {/* Center - Title */}
        <View style={styles.titleContainer}>
          <Text 
            style={[
              styles.title,
              transparent && styles.transparentTitle,
              titleStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        
        {/* Right side - Action buttons */}
        <View style={styles.rightContainer}>
          {renderRightActions()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 8,
    position: 'relative',
    zIndex: 10,
  },
  solidContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  transparentTitle: {
    color: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 28,
    height: 28,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#2563EB',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default Header;