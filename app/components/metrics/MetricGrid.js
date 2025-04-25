import React, { useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions,
  Text,
  ScrollView,
} from 'react-native';

// Import components
import MetricCard from './MetricCard';

// Get screen dimensions for responsive calculations
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Responsive grid layout for organizing multiple metric cards
 * 
 * @param {Object} props - Component props
 * @param {Array} props.metrics - Collection of metric data to display
 * @param {number} props.columns - Grid columns (responsive default)
 * @param {string} props.groupBy - Optional grouping property
 * @param {number} props.spacing - Gap between cards
 * @param {Object} props.style - Additional styles for the container
 * @param {function} props.onMetricPress - Optional handler for metric card press
 */
const MetricGrid = ({
  metrics = [],
  columns,
  groupBy,
  spacing = 8,
  style,
  onMetricPress,
}) => {
  /**
   * Determines optimal column count based on screen width
   * @param {number} width - Available screen width
   * @returns {number} Number of columns to use
   */
  const getColumnCount = (width) => {
    if (columns) return columns;
    
    // Responsive column count based on screen width
    if (width < 320) return 1;
    if (width < 480) return 2;
    return 3;
  };
  
  // Calculate responsive grid properties
  const columnCount = getColumnCount(SCREEN_WIDTH);
  const gridGap = spacing;
  
  /**
   * Groups metrics by specified property
   * @param {Array} metrics - List of metric objects
   * @param {string} property - Property to group by
   * @returns {Object} Grouped metrics by property value
   */
  const groupMetrics = (metrics, property) => {
    if (!property || !metrics?.length) return { ungrouped: metrics };
    
    return metrics.reduce((groups, metric) => {
      const groupKey = metric[property] || 'ungrouped';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(metric);
      return groups;
    }, {});
  };
  
  // Sort metrics by priority if it exists
  const sortedMetrics = useMemo(() => {
    if (!metrics?.length) return [];
    
    return [...metrics].sort((a, b) => {
      // Sort by priority if available
      if (a.priority !== undefined && b.priority !== undefined) {
        return a.priority - b.priority;
      }
      // Fall back to original order
      return 0;
    });
  }, [metrics]);
  
  // Group metrics if groupBy property is provided
  const groupedMetrics = useMemo(() => {
    return groupBy ? groupMetrics(sortedMetrics, groupBy) : { ungrouped: sortedMetrics };
  }, [sortedMetrics, groupBy]);
  
  /**
   * Renders a group of related metrics
   * @param {Array} metrics - Metrics in the group
   * @param {string} groupName - Name of the group
   * @returns {React.ReactNode} Rendered group with header
   */
  const renderGroup = (metrics, groupName) => {
    if (!metrics || !metrics.length) return null;
    
    // Don't show group header for ungrouped metrics
    const showHeader = groupName !== 'ungrouped';
    
    return (
      <View style={styles.group} key={groupName}>
        {showHeader && (
          <Text style={styles.groupTitle}>
            {formatGroupName(groupName)}
          </Text>
        )}
        
        <View style={[
          styles.gridContainer, 
          { gap: gridGap }
        ]}>
          {metrics.map((metric, index) => renderMetricCard(metric, index))}
        </View>
      </View>
    );
  };
  
  /**
   * Formats group name for display
   */
  const formatGroupName = (name) => {
    if (!name || name === 'ungrouped') return '';
    
    // Convert camelCase or snake_case to Title Case
    return name
      .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };
  
  /**
   * Renders a metric card
   */
  const renderMetricCard = (metric, index) => {
    if (!metric) return null;
    
    // Calculate card width based on column count, size, and spacing
    const calculatedWidth = `${100 / columnCount - 2}%`;
    
    // Adjust size property based on column count and metric's size property
    const adjustedSize = columnCount === 1 ? 'large' : metric.size || 'medium';
    
    // If metric has 'large' size and not in single column layout, 
    // make it span full width
    const cardStyle = adjustedSize === 'large' && columnCount > 1
      ? { width: '100%' }
      : { width: calculatedWidth };
    
    return (
      <MetricCard
        key={`metric-${metric.id || index}`}
        label={metric.label}
        value={metric.value}
        unit={metric.unit}
        precision={metric.precision}
        size={adjustedSize}
        format={metric.format}
        previousValue={metric.previousValue}
        icon={metric.icon}
        highlight={metric.highlight}
        onPress={onMetricPress ? () => onMetricPress(metric) : undefined}
        style={cardStyle}
      />
    );
  };
  
  // If no metrics, return empty container
  if (!metrics || metrics.length === 0) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, style]}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(groupedMetrics).map(([groupName, groupMetrics]) => 
        renderGroup(groupMetrics, groupName)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default MetricGrid;