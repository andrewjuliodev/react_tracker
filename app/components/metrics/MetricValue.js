import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
} from 'react-native';

// Import utilities
import { 
  formatNumber, 
  formatPace, 
  formatDuration, 
  formatDistance, 
  formatHeartRate, 
  formatPower 
} from '../../../utils/formatters';

/**
 * Component for formatting and displaying metric values with appropriate units
 * 
 * @param {Object} props - Component props
 * @param {number|string} props.value - Raw metric value
 * @param {string} props.unit - Measurement unit
 * @param {number} props.precision - Decimal places for display
 * @param {string} props.size - Text size ('small', 'medium', 'large')
 * @param {boolean} props.showUnit - Whether to display the unit
 * @param {string} props.format - Format type (e.g., 'pace', 'duration')
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.valueStyle - Additional styles for the value text
 * @param {Object} props.unitStyle - Additional styles for the unit text
 */
const MetricValue = ({
  value,
  unit = '',
  precision = 1,
  size = 'medium',
  showUnit = true,
  format,
  style,
  valueStyle,
  unitStyle,
}) => {
  /**
   * Formats value with appropriate precision and unit
   * @param {number} value - Raw value to format
   * @param {string} unit - Unit of measurement
   * @param {number} precision - Decimal places to display
   * @returns {string} Formatted value string
   */
  const getFormattedValue = () => {
    // Handle null or undefined values
    if (value === null || value === undefined) {
      return '--';
    }
    
    // Handle different format types
    if (format) {
      switch (format.toLowerCase()) {
        case 'pace':
          return formatPace(value);
        case 'duration':
          return formatDuration(value);
        case 'distance':
          return formatDistance(value);
        case 'heart_rate':
        case 'heartrate':
          return formatHeartRate(value);
        case 'power':
          return formatPower(value);
      }
    }
    
    // Default number formatting with unit
    if (typeof value === 'number') {
      return formatNumber(value, precision);
    }
    
    // Return as is for strings or other types
    return value.toString();
  };
  
  /**
   * Determines if unit should be superscripted
   * @param {string} unit - Unit of measurement
   * @returns {boolean} Whether unit should be superscript
   */
  const shouldSuperscriptUnit = (unit) => {
    // Units that typically use superscript notation
    const superscriptUnits = ['2', '3', '°'];
    
    // Check if unit contains any superscript characters
    return superscriptUnits.some(char => unit.includes(char));
  };
  
  // Get value and unit parts
  const formattedValue = getFormattedValue();
  let displayValue = formattedValue;
  let displayUnit = unit;
  
  // Check if formatted value already includes the unit
  const valueIncludesUnit = 
    format === 'pace' || 
    format === 'distance' || 
    format === 'heart_rate' || 
    format === 'power';
  
  // Split value and unit if necessary
  if (valueIncludesUnit && typeof formattedValue === 'string') {
    // Extract value and unit from formatted string
    // This assumes formatters return values like "5.2 km" or "4:30 min/km"
    const parts = formattedValue.split(' ');
    if (parts.length > 1) {
      displayValue = parts[0];
      displayUnit = parts.slice(1).join(' ');
    }
  }
  
  // Get text size based on size prop
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      case 'medium':
      default:
        return styles.mediumText;
    }
  };
  
  // Get unit size based on value size
  const getUnitSize = () => {
    switch (size) {
      case 'small':
        return styles.smallUnit;
      case 'large':
        return styles.largeUnit;
      case 'medium':
      default:
        return styles.mediumUnit;
    }
  };
  
  const needsSuperscript = shouldSuperscriptUnit(displayUnit);
  
  return (
    <View style={[styles.container, style]}>
      <Text 
        style={[styles.value, getTextSize(), valueStyle]}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {displayValue}
      </Text>
      
      {showUnit && displayUnit && (
        <Text 
          style={[
            styles.unit, 
            getUnitSize(), 
            needsSuperscript && styles.superscript,
            unitStyle
          ]}
          allowFontScaling={false}
        >
          {displayUnit}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'nowrap',
  },
  value: {
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    fontWeight: '600',
    color: '#0F172A',
  },
  unit: {
    marginLeft: 2,
    fontWeight: '400',
    color: '#64748B',
    includeFontPadding: false,
  },
  superscript: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
  },
  
  // Size variations for value
  smallText: {
    fontSize: 18,
    lineHeight: 24,
  },
  mediumText: {
    fontSize: 24,
    lineHeight: 30,
  },
  largeText: {
    fontSize: 36,
    lineHeight: 42,
  },
  
  // Size variations for unit
  smallUnit: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  mediumUnit: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 3,
  },
  largeUnit: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
});

export default MetricValue;