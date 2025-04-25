import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import components
import Card from '../common/Card';
import MetricValue from './MetricValue';

// Import utilities
import { formatValue } from '../../../utils/formatters';

/**
 * Card component displaying a single sensor metric with value and label
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Name of the metric
 * @param {number} props.value - Current metric value
 * @param {string} props.unit - Unit of measurement
 * @param {number} props.precision - Decimal precision for display
 * @param {string} props.size - Card size ('small', 'medium', 'large')
 * @param {string} props.format - Format type (e.g., 'pace', 'duration')
 * @param {number} props.previousValue - Previous metric for trend indication
 * @param {string} props.icon - Optional Ionicons name
 * @param {boolean} props.highlight - Whether to highlight the card
 * @param {function} props.onPress - Optional handler for card press
 * @param {Object} props.style - Additional styles for the card container
 */
const MetricCard = ({
  label,
  value,
  unit,
  precision = 1,
  size = 'medium',
  format,
  previousValue,
  icon,
  highlight = false,
  onPress,
  style,
}) => {
  // State
  const [trend, setTrend] = useState('stable');
  const valueAnimation = useRef(new Animated.Value(1)).current;
  
  // Update animation when value changes
  useEffect(() => {
    // Determine if value increased or decreased
    if (previousValue !== undefined && previousValue !== value) {
      const newTrend = determineTrend(value, previousValue);
      setTrend(newTrend);
      
      // Animate value change
      valueAnimation.setValue(0.7);
      Animated.spring(valueAnimation, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [value, previousValue]);
  
  /**
   * Formats the raw metric value for display
   * @param {number} value - Raw sensor value
   * @param {string} unit - Unit of measurement
   * @param {number} precision - Decimal places to show
   * @returns {string} Formatted value with unit
   */
  const getFormattedValue = () => {
    // Use the MetricValue component for consistent formatting
    return value;
  };
  
  /**
   * Determines trend direction from current and previous values
   * @param {number} current - Current metric value
   * @param {number} previous - Previous metric value
   * @returns {string} Trend direction ('up', 'down', 'stable')
   */
  const determineTrend = (current, previous) => {
    // For numeric values, compare directly
    if (typeof current === 'number' && typeof previous === 'number') {
      const difference = current - previous;
      const threshold = 0.01 * Math.abs(previous); // 1% change threshold
      
      if (Math.abs(difference) < threshold) {
        return 'stable';
      }
      return difference > 0 ? 'up' : 'down';
    }
    
    // Default to stable if not comparable
    return 'stable';
  };
  
  /**
   * Get trend icon and color
   */
  const getTrendIndicator = () => {
    switch (trend) {
      case 'up':
        return {
          icon: 'arrow-up',
          color: '#16A34A', // Green
        };
      case 'down':
        return {
          icon: 'arrow-down',
          color: '#DC2626', // Red
        };
      case 'stable':
      default:
        return {
          icon: 'remove',
          color: '#94A3B8', // Gray
        };
    }
  };
  
  // Get styles based on card size
  const getCardSize = () => {
    switch (size) {
      case 'small':
        return styles.smallCard;
      case 'large':
        return styles.largeCard;
      case 'medium':
      default:
        return styles.mediumCard;
    }
  };
  
  // Get value size based on card size
  const getValueSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      case 'medium':
      default:
        return 'medium';
    }
  };
  
  // Get trend indicator if previous value exists
  const trendIndicator = previousValue !== undefined ? getTrendIndicator() : null;
  
  // Prepare card content
  const cardContent = (
    <View style={[styles.container, highlight && styles.highlightContainer]}>
      {/* Metric icon if provided */}
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#64748B" />
        </View>
      )}
      
      <View style={styles.content}>
        {/* Metric label */}
        <Text style={styles.label}>{label}</Text>
        
        {/* Metric value with animation */}
        <Animated.View style={{ transform: [{ scale: valueAnimation }] }}>
          <MetricValue
            value={value}
            unit={unit}
            precision={precision}
            size={getValueSize()}
            format={format}
          />
        </Animated.View>
      </View>
      
      {/* Trend indicator if available */}
      {trendIndicator && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trendIndicator.icon} 
            size={16} 
            color={trendIndicator.color} 
          />
        </View>
      )}
    </View>
  );
  
  // Wrap in Card component
  return (
    <Card
      style={[getCardSize(), style]}
      elevation={highlight ? 2 : 1}
      padding={0}
      onPress={onPress}
    >
      {cardContent}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  highlightContainer: {
    backgroundColor: '#F0F9FF',
  },
  iconContainer: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  trendContainer: {
    marginLeft: 8,
    width: 16,
    alignItems: 'center',
  },
  
  // Card size variations
  smallCard: {
    width: '48%',
    marginBottom: 8,
  },
  mediumCard: {
    width: '48%',
    marginBottom: 8,
  },
  largeCard: {
    width: '100%',
    marginBottom: 12,
  },
});

export default MetricCard;