import React from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';

/**
 * Reusable card component providing a container with consistent styling
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.header - Optional card header
 * @param {React.ReactNode} props.footer - Optional card footer
 * @param {number} props.elevation - Shadow depth for visual hierarchy
 * @param {number|Object} props.padding - Internal spacing
 * @param {function} props.onPress - Optional handler for touch events
 * @param {Object} props.style - Additional style for the card container
 * @param {string} props.testID - Test identifier
 */
const Card = ({
  children,
  header,
  footer,
  elevation = 1,
  padding = 16,
  onPress,
  style,
  testID,
}) => {
  // Determine shadow style based on elevation
  const getShadowStyle = () => {
    const shadowStyles = {
      0: styles.noShadow,
      1: styles.lightShadow,
      2: styles.mediumShadow,
      3: styles.heavyShadow,
    };
    
    return shadowStyles[elevation] || styles.lightShadow;
  };
  
  /**
   * Renders optional header section if provided
   * @param {React.ReactNode} header - Header content
   * @returns {React.ReactNode} Formatted header or null
   */
  const renderHeader = () => {
    if (!header) return null;
    
    return (
      <View style={styles.headerContainer}>
        {header}
      </View>
    );
  };
  
  /**
   * Renders optional footer section if provided
   * @param {React.ReactNode} footer - Footer content
   * @returns {React.ReactNode} Formatted footer or null
   */
  const renderFooter = () => {
    if (!footer) return null;
    
    return (
      <View style={styles.footerContainer}>
        {footer}
      </View>
    );
  };
  
  // Calculate padding style
  const getPaddingStyle = () => {
    if (typeof padding === 'object') {
      return {
        paddingTop: padding.top ?? 0,
        paddingRight: padding.right ?? 0,
        paddingBottom: padding.bottom ?? 0,
        paddingLeft: padding.left ?? 0,
      };
    }
    
    return { padding };
  };
  
  // Combine all styles
  const cardStyles = [
    styles.card,
    getShadowStyle(),
    style,
  ];
  
  // Render card with optional touch handler
  const renderCard = () => {
    const content = (
      <>
        {renderHeader()}
        <View style={[styles.contentContainer, getPaddingStyle()]}>
          {children}
        </View>
        {renderFooter()}
      </>
    );
    
    if (onPress) {
      return (
        <TouchableOpacity
          style={cardStyles}
          onPress={onPress}
          activeOpacity={0.8}
          testID={testID}
          accessibilityRole="button"
        >
          {content}
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={cardStyles} testID={testID}>
        {content}
      </View>
    );
  };
  
  return renderCard();
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contentContainer: {
    // Padding is applied dynamically
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  
  // Shadow styles for different elevations
  noShadow: {
    // No shadow
  },
  lightShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mediumShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  heavyShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default Card;