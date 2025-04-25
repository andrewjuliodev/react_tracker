import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable button component with consistent styling and behavior
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Button text
 * @param {function} props.onPress - Function to call when button is pressed
 * @param {string} props.variant - Button style variant (primary, secondary, outline, danger)
 * @param {boolean} props.disabled - Whether button is interactive
 * @param {boolean} props.loading - Shows loading indicator instead of label
 * @param {string} props.icon - Optional Ionicons icon name
 * @param {Object} props.style - Additional style for the button container
 * @param {Object} props.textStyle - Additional style for the button text
 * @param {string} props.testID - Test identifier
 */
const Button = ({ 
  label, 
  onPress, 
  variant = 'primary', 
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}) => {
  // Track press state for visual feedback
  const [pressed, setPressed] = useState(false);
  
  // Handle press event with loading state check
  const handlePress = (event) => {
    if (disabled || loading) return;
    onPress?.(event);
  };
  
  /**
   * Generates button styles based on variant and state
   * @param {string} variant - Button style variant
   * @param {boolean} disabled - Whether button is disabled
   * @param {boolean} pressed - Whether button is currently pressed
   * @returns {Object} Style object for the button
   */
  const getButtonStyles = () => {
    // Base styles
    const baseStyles = [
      styles.button,
      style,
    ];
    
    // Apply variant styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryButton);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryButton);
        break;
      case 'outline':
        baseStyles.push(styles.outlineButton);
        break;
      case 'danger':
        baseStyles.push(styles.dangerButton);
        break;
      default:
        baseStyles.push(styles.primaryButton);
    }
    
    // Apply state styles
    if (disabled) {
      baseStyles.push(styles.disabledButton);
    } else if (pressed) {
      baseStyles.push(styles.pressedButton);
      
      // Apply variant-specific pressed styles
      switch (variant) {
        case 'primary':
          baseStyles.push(styles.primaryPressedButton);
          break;
        case 'secondary':
          baseStyles.push(styles.secondaryPressedButton);
          break;
        case 'outline':
          baseStyles.push(styles.outlinePressedButton);
          break;
        case 'danger':
          baseStyles.push(styles.dangerPressedButton);
          break;
      }
    }
    
    return baseStyles;
  };
  
  /**
   * Get text styles based on variant and state
   */
  const getTextStyles = () => {
    // Base styles
    const baseStyles = [
      styles.text,
      textStyle,
    ];
    
    // Apply variant styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryText);
        break;
      case 'outline':
        baseStyles.push(styles.outlineText);
        break;
      case 'danger':
        baseStyles.push(styles.dangerText);
        break;
      default:
        baseStyles.push(styles.primaryText);
    }
    
    // Apply state styles
    if (disabled) {
      baseStyles.push(styles.disabledText);
    } else if (pressed) {
      baseStyles.push(styles.pressedText);
    }
    
    return baseStyles;
  };
  
  // Get icon color based on variant and state
  const getIconColor = () => {
    if (disabled) {
      return '#A1A1AA';  // Disabled color
    }
    
    switch (variant) {
      case 'primary':
        return '#FFFFFF';  // White for primary
      case 'danger':
        return '#FFFFFF';  // White for danger
      case 'secondary':
        return pressed ? '#FFFFFF' : '#2563EB';  // Blue or white when pressed
      case 'outline':
        return pressed ? '#FFFFFF' : '#2563EB';  // Blue or white when pressed
      default:
        return '#FFFFFF';  // Default white
    }
  };
  
  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#2563EB' : '#FFFFFF'} 
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={getIconColor()}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyles()}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Variant Styles - Button
  primaryButton: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  
  // Variant Styles - Text
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#2563EB',
  },
  outlineText: {
    color: '#2563EB',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  
  // State Styles - Button
  disabledButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  pressedButton: {
    opacity: 0.9,
  },
  primaryPressedButton: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  secondaryPressedButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  outlinePressedButton: {
    backgroundColor: '#2563EB',
  },
  dangerPressedButton: {
    backgroundColor: '#B91C1C',
    borderColor: '#B91C1C',
  },
  
  // State Styles - Text
  disabledText: {
    color: '#94A3B8',
  },
  pressedText: {
    color: '#FFFFFF',
  },
});

export default Button;