import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  LineChart,
  AreaChart,
  BarChart,
  Grid,
  XAxis,
  YAxis
} from 'react-native-chart-kit';
import { formatValue } from '../../../utils/formatters';
import theme from '../../../config/theme';

/**
 * Component for displaying time-series metric data in chart form.
 * Provides time-series data visualization, real-time metric charting,
 * customizable chart types, and interactive data exploration.
 */
const MetricChart = ({
  data = [],
  metricKey = 'value',
  metricLabel = 'Value',
  unit = '',
  chartType = 'line',
  height = 200,
  width = Dimensions.get('window').width - 40,
  color = theme.colors.primary,
  showGrid = true,
  showLabels = true,
  showAxis = true,
  showDots = false,
  fillOpacity = 0.2,
  smoothing = true,
  onDataPointClick,
  style
}) => {
  // Format data for chart consumption
  const chartData = useMemo(() => {
    return formatDataForChart(data, metricKey);
  }, [data, metricKey]);

  // Calculate Y-axis domain
  const domain = useMemo(() => {
    return determineDomain(chartData, metricKey);
  }, [chartData, metricKey]);

  // If no data, show placeholder message
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Ensure minimum of 2 data points
  if (data.length === 1) {
    data = [...data, { ...data[0], timestamp: data[0].timestamp + 1000 }];
  }

  // Set chart dimensions
  const chartHeight = height - (showAxis ? 40 : 0);
  const chartWidth = width - (showAxis ? 40 : 0);

  // Configure the desired chart type
  const renderChart = () => {
    // Shared props for all chart types
    const chartProps = {
      data: {
        labels: chartData.map(item => formatXAxisLabel(item.timestamp)),
        datasets: [
          {
            data: chartData.map(item => item[metricKey] || 0),
            color: (opacity = 1) => color,
            strokeWidth: 2
          }
        ]
      },
      width: chartWidth,
      height: chartHeight,
      yAxisLabel: '',
      yAxisSuffix: unit,
      fromZero: domain.min <= 0,
      withInnerLines: showGrid,
      withOuterLines: showGrid,
      withHorizontalLabels: showLabels,
      withVerticalLabels: showLabels,
      withDots: showDots,
      bezier: smoothing,
      style: {
        margin: 0,
        padding: 0
      },
      chartConfig: {
        backgroundColor: theme.colors.background,
        backgroundGradientFrom: theme.colors.background,
        backgroundGradientTo: theme.colors.background,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(${hexToRgb(color)}, ${opacity})`,
        labelColor: () => theme.colors.text,
        propsForDots: {
          r: '4',
          stroke: color,
          strokeWidth: '1'
        },
        propsForBackgroundLines: {
          stroke: theme.colors.border,
          strokeOpacity: 0.5,
          strokeDasharray: ''
        },
        fillShadowGradient: color,
        fillShadowGradientOpacity: fillOpacity
      },
      onDataPointClick: onDataPointClick
    };

    // Render appropriate chart type
    switch (chartType) {
      case 'area':
        return <AreaChart {...chartProps} />;
      case 'bar':
        return <BarChart {...chartProps} />;
      case 'line':
      default:
        return <LineChart {...chartProps} />;
    }
  };

  // Conditional rendering for axes
  if (!showAxis) {
    return (
      <View style={[styles.container, style]}>
        {renderChart()}
      </View>
    );
  }

  // Full chart with axes
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.titleText}>{metricLabel}</Text>
      <View style={styles.chartContainer}>
        {/* Y-Axis */}
        <YAxis
          data={chartData.map(item => item[metricKey] || 0)}
          contentInset={{ top: 10, bottom: 10 }}
          svg={{ fill: theme.colors.text, fontSize: 10 }}
          numberOfTicks={5}
          min={domain.min}
          max={domain.max}
          formatLabel={value => formatYAxisLabel(value, unit)}
          style={styles.yAxis}
        />
        
        {/* Main Chart */}
        <View style={styles.chart}>
          {renderChart()}
          
          {/* X-Axis rendered separately for better control */}
          <XAxis
            data={chartData}
            formatLabel={(_, index) => formatXAxisLabel(chartData[index]?.timestamp)}
            contentInset={{ left: 10, right: 10 }}
            svg={{ fill: theme.colors.text, fontSize: 10 }}
            style={styles.xAxis}
          />
        </View>
      </View>
    </View>
  );
};

/**
 * Formats data for chart consumption
 * @param {Array} rawData - Raw time-series data
 * @param {string} metricKey - Data property to extract
 * @returns {Array} Formatted chart data
 */
function formatDataForChart(rawData, metricKey) {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  // Sort by timestamp if available
  const sortedData = [...rawData].sort((a, b) => {
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  // Limit number of data points if too many
  const MAX_DATA_POINTS = parseInt(process.env.CHART_DATA_POINTS) || 60;
  
  if (sortedData.length > MAX_DATA_POINTS) {
    // Sample data points evenly
    const result = [];
    const step = Math.floor(sortedData.length / MAX_DATA_POINTS);
    
    for (let i = 0; i < MAX_DATA_POINTS - 1; i++) {
      result.push(sortedData[i * step]);
    }
    
    // Always include the last point
    result.push(sortedData[sortedData.length - 1]);
    
    return result;
  }

  return sortedData;
}

/**
 * Determines appropriate Y-axis domain
 * @param {Array} data - Chart data points
 * @param {string} metricKey - Value property
 * @returns {Array} Min and max boundaries
 */
function determineDomain(data, metricKey) {
  if (!data || data.length === 0) {
    return { min: 0, max: 10 };
  }

  // Extract metric values
  const values = data.map(item => item[metricKey] || 0).filter(v => v !== null);

  if (values.length === 0) {
    return { min: 0, max: 10 };
  }

  // Calculate min and max
  let min = Math.min(...values);
  let max = Math.max(...values);

  // Ensure range is not too small
  const range = max - min;
  const minRange = max * 0.1; // At least 10% of max value
  
  if (range < minRange) {
    min = Math.max(0, min - minRange / 2);
    max = max + minRange / 2;
  }

  // Add padding
  const padding = (max - min) * 0.1;
  min = Math.max(0, min - padding);
  max = max + padding;

  return { min, max };
}

/**
 * Formats X-axis time labels
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
function formatXAxisLabel(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  
  // Format as HH:MM
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Formats Y-axis value labels
 * @param {number} value - Raw metric value
 * @param {string} unit - Unit of measurement
 * @returns {string} Formatted value
 */
function formatYAxisLabel(value, unit) {
  // Simplify label based on magnitude
  if (value >= 1000) {
    return `${Math.round(value/1000)}k`;
  }
  
  if (value % 1 === 0) {
    return value.toString();
  }
  
  return value.toFixed(1);
}

/**
 * Helper function to convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {string} RGB values as comma-separated string
 */
function hexToRgb(hex) {
  // Default to primary color if invalid
  if (!hex || typeof hex !== 'string') {
    hex = theme.colors.primary;
  }
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-character hex to 6-character
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 30
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  yAxis: {
    width: 30,
    marginRight: 10
  },
  chart: {
    flex: 1
  },
  xAxis: {
    marginTop: 10,
    height: 30
  }
});

export default MetricChart;