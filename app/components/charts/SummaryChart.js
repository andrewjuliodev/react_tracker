import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  BarChart,
  PieChart,
  ProgressChart,
  LineChart,
  ContributionGraph,
  StackedBarChart,
  Grid
} from 'react-native-chart-kit';
import { calculatePowerZones, calculateHeartRateZones } from '../../../utils/calculations';
import { formatValue } from '../../../utils/formatters';
import theme from '../../../config/theme';

/**
 * Component for displaying activity summary metrics in chart form.
 * Provides performance summary visualization, multiple chart type support,
 * zone distribution displays, and comparative metric visualization.
 */
const SummaryChart = ({
  data = [],
  chartType = 'bar',
  title = 'Summary',
  metrics = [],
  colors = [],
  width = Dimensions.get('window').width - 40,
  height = 220,
  style
}) => {
  // Format the data based on the chart type
  const formattedData = useMemo(() => {
    return formatDataForChart(data, chartType, metrics, colors);
  }, [data, chartType, metrics, colors]);

  // Handle empty data case
  if (!formattedData || (Array.isArray(formattedData) && formattedData.length === 0)) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Generate the appropriate chart based on the type
  const renderChart = () => {
    // Configuration for all chart types
    const chartConfig = {
      backgroundColor: theme.colors.background,
      backgroundGradientFrom: theme.colors.background,
      backgroundGradientTo: theme.colors.background,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(${hexToRgb(theme.colors.primary)}, ${opacity})`,
      labelColor: () => theme.colors.text,
      style: {
        borderRadius: 16
      },
      propsForBackgroundLines: {
        stroke: theme.colors.border,
        strokeWidth: 1,
        strokeDasharray: ''
      },
      propsForLabels: {
        fontSize: 10
      }
    };

    switch (chartType) {
      case 'pie':
        return (
          <PieChart
            data={formattedData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute={false}
            hasLegend={true}
            center={[width / 4, 0]}
          />
        );

      case 'progress':
        return (
          <ProgressChart
            data={formattedData}
            width={width}
            height={height}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1, index) => {
                const colorArray = colors.length > 0 ? colors : [
                  theme.colors.primary,
                  theme.colors.secondary,
                  theme.colors.accent,
                  theme.colors.success,
                  theme.colors.warning
                ];
                return `rgba(${hexToRgb(colorArray[index % colorArray.length])}, ${opacity})`;
              }
            }}
            strokeWidth={12}
            radius={32}
            hideLegend={false}
          />
        );

      case 'stacked':
        return (
          <StackedBarChart
            data={formattedData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            withHorizontalLabels={true}
            showLegend={true}
            barPercentage={0.65}
          />
        );

      case 'contribution':
        return (
          <ContributionGraph
            values={formattedData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            numDays={30}
            endDate={new Date()}
            tooltipDataAttrs={() => ({})}
            squareSize={12}
          />
        );

      case 'line':
        return (
          <LineChart
            data={formattedData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            bezier
            withInnerLines={true}
            withOuterLines={true}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            fromZero={true}
            yAxisInterval={1}
          />
        );

      case 'bar':
      default:
        return (
          <BarChart
            data={formattedData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            fromZero={true}
            showBarTops={true}
            showValuesOnTopOfBars={true}
            withInnerLines={true}
            yAxisLabel=""
            yAxisSuffix=""
            barPercentage={0.7}
          />
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
    </View>
  );
};

/**
 * Formats data for specific chart type
 * @param {Array} rawData - Raw metric data
 * @param {string} chartType - Type of chart
 * @param {Array} metrics - Metrics to include in chart
 * @param {Array} colors - Color scheme for visualization
 * @returns {Array|Object} Formatted chart data
 */
function formatDataForChart(rawData, chartType, metrics, colors) {
  // Default colors if not provided
  const defaultColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.error,
    theme.colors.info
  ];

  // Use provided colors or defaults
  const chartColors = colors.length > 0 ? colors : defaultColors;

  // If raw data is empty, return empty result
  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    return chartType === 'progress' ? { data: [] } : [];
  }

  // Format based on chart type
  switch (chartType) {
    case 'pie':
      // For pie charts, format as segments
      return formatPieData(rawData, metrics, chartColors);

    case 'progress':
      // For progress charts, format as percentage values
      return formatProgressData(rawData, metrics, chartColors);

    case 'stacked':
      // For stacked bar charts, format as stacked segments
      return formatStackedData(rawData, metrics, chartColors);

    case 'contribution':
      // For contribution graphs, format as date values
      return formatContributionData(rawData);

    case 'line':
    case 'bar':
    default:
      // For line and bar charts, format as datasets
      return formatBarLineData(rawData, metrics, chartColors);
  }
}

/**
 * Creates zone distribution data
 * @param {Array} rawData - Raw time-series data
 * @param {string} metricKey - Metric to analyze
 * @param {Array} zones - Zone boundaries
 * @returns {Array} Zone distribution data
 */
function createZoneDistribution(rawData, metricKey, zones) {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0 || !zones || zones.length === 0) {
    return [];
  }

  // Initialize counters for each zone
  const zoneCounts = zones.map(() => 0);

  // Count occurrences in each zone
  rawData.forEach(dataPoint => {
    const value = dataPoint[metricKey];
    if (value === undefined || value === null) return;

    // Find the zone this value belongs to
    const zoneIndex = zones.findIndex(zone => 
      value >= zone.lower && value <= zone.upper
    );

    if (zoneIndex !== -1) {
      zoneCounts[zoneIndex]++;
    }
  });

  // Calculate percentages
  const total = zoneCounts.reduce((sum, count) => sum + count, 0);
  
  // Create zone distribution data
  return zones.map((zone, index) => ({
    name: zone.name,
    value: zoneCounts[index],
    percentage: total > 0 ? zoneCounts[index] / total : 0,
    color: getZoneColor(index, zones.length)
  }));
}

/**
 * Formats data for pie charts
 * @param {Array|Object} data - Raw data
 * @param {Array} metrics - Metrics to include
 * @param {Array} colors - Color palette
 * @returns {Array} Pie segments
 */
function formatPieData(data, metrics, colors) {
  // Handle special case for heart rate zones
  if (metrics.includes('heartRateZones') && data.heartRate) {
    const maxHr = data.maxHeartRate || 220 - 30; // Estimate if not provided
    const zones = calculateHeartRateZones(maxHr);
    return createZoneDistribution(data.heartRateData || [], 'heartRate', zones)
      .map((zone, index) => ({
        name: zone.name,
        value: Math.max(0.1, zone.percentage * 100), // Ensure minimum visibility
        color: zone.color || colors[index % colors.length],
        legendFontColor: theme.colors.text,
        legendFontSize: 12
      }));
  }

  // Handle special case for power zones
  if (metrics.includes('powerZones') && data.power) {
    const ftp = data.ftp || 250; // Default if not provided
    const zones = calculatePowerZones(ftp);
    return createZoneDistribution(data.powerData || [], 'power', zones)
      .map((zone, index) => ({
        name: zone.name,
        value: Math.max(0.1, zone.percentage * 100), // Ensure minimum visibility
        color: zone.color || colors[index % colors.length],
        legendFontColor: theme.colors.text,
        legendFontSize: 12
      }));
  }

  // Default behavior for generic metrics
  return metrics
    .filter(metric => data[metric] !== undefined)
    .map((metric, index) => ({
      name: formatMetricLabel(metric),
      value: data[metric],
      color: colors[index % colors.length],
      legendFontColor: theme.colors.text,
      legendFontSize: 12
    }));
}

/**
 * Formats data for progress charts
 * @param {Array|Object} data - Raw data
 * @param {Array} metrics - Metrics to include
 * @returns {Object} Progress data
 */
function formatProgressData(data, metrics, colors) {
  // For progress charts, we need values between 0-1
  const progressData = {
    labels: metrics.map(metric => formatMetricLabel(metric)),
    data: metrics.map(metric => {
      // Get the value for this metric
      const value = data[metric];
      
      // If it's a percentage already, ensure it's between 0-1
      if (metric.includes('percentage') || metric.includes('completion')) {
        return Math.min(1, Math.max(0, value / 100));
      }
      
      // Otherwise, normalize based on context
      if (metric === 'heartRate' && data.maxHeartRate) {
        return Math.min(1, Math.max(0, value / data.maxHeartRate));
      }
      
      if (metric === 'power' && data.ftp) {
        return Math.min(1, Math.max(0, value / data.ftp));
      }
      
      // Default normalization (assume 0-1 already)
      return Math.min(1, Math.max(0, value));
    }),
    colors: metrics.map((_, index) => colors[index % colors.length])
  };

  return progressData;
}

/**
 * Formats data for stacked bar charts
 * @param {Array|Object} data - Raw data
 * @param {Array} metrics - Metrics to include
 * @param {Array} colors - Color palette
 * @returns {Object} Stacked bar data
 */
function formatStackedData(data, metrics, colors) {
  // Handle array or single object data
  const dataArray = Array.isArray(data) ? data : [data];
  
  // For time-series data, we can group by time periods
  const labels = dataArray.map((item, index) => 
    item.label || 
    (item.timestamp ? formatTimestamp(item.timestamp) : `Point ${index+1}`)
  );
  
  // Create datasets for each metric
  const datasets = metrics.map((metric, index) => ({
    data: dataArray.map(item => item[metric] || 0),
    color: colors[index % colors.length],
    strokeWidth: 2,
    name: formatMetricLabel(metric)
  }));
  
  return {
    labels,
    legend: metrics.map(formatMetricLabel),
    data: datasets.map(ds => ds.data),
    barColors: datasets.map(ds => ds.color)
  };
}

/**
 * Formats data for contribution graphs
 * @param {Array|Object} data - Raw data
 * @returns {Array} Contribution data
 */
function formatContributionData(data) {
  // Handle array or single object
  if (!Array.isArray(data)) {
    data = [data];
  }
  
  // Filter items with valid date/timestamp
  return data
    .filter(item => item.date || item.timestamp)
    .map(item => {
      // Convert timestamp to date string if needed
      const date = item.date || 
        (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : null);
      
      // Value can be any numeric property
      const value = item.value || item.count || 1;
      
      return { date, count: value };
    });
}

/**
 * Formats data for bar and line charts
 * @param {Array|Object} data - Raw data
 * @param {Array} metrics - Metrics to include
 * @param {Array} colors - Color palette
 * @returns {Object} Bar/Line chart data
 */
function formatBarLineData(data, metrics, colors) {
  // Handle array or single object
  const dataArray = Array.isArray(data) ? data : [data];
  
  // For time-series data, we can use timestamps as labels
  const labels = dataArray.map((item, index) => 
    item.label || 
    (item.timestamp ? formatTimestamp(item.timestamp) : `Point ${index+1}`)
  );
  
  // Create datasets for each metric
  const datasets = metrics.map((metric, index) => ({
    data: dataArray.map(item => item[metric] || 0),
    color: (opacity = 1) => transparentize(colors[index % colors.length], opacity),
    strokeWidth: 2
  }));
  
  return {
    labels,
    datasets,
    legend: metrics.map(formatMetricLabel)
  };
}

/**
 * Gets zone color based on index
 * @param {number} index - Zone index
 * @param {number} totalZones - Total number of zones
 * @returns {string} Color hex code
 */
function getZoneColor(index, totalZones) {
  if (totalZones <= 1) return theme.colors.primary;
  
  // Create color gradient from blue to red
  const hue = 240 - (index / (totalZones - 1)) * 240;
  return `hsl(${hue}, 80%, 50%)`;
}

/**
 * Formats timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Formats metric label for display
 * @param {string} metric - Raw metric key
 * @returns {string} Formatted label
 */
function formatMetricLabel(metric) {
  if (!metric) return '';
  
  // Handle special cases
  switch (metric) {
    case 'hr':
    case 'heartRate':
      return 'Heart Rate';
    case 'pwr':
    case 'power':
      return 'Power';
    case 'cad':
    case 'cadence':
      return 'Cadence';
    case 'pace':
      return 'Pace';
    case 'elevation':
    case 'alt':
      return 'Elevation';
    case 'speed':
      return 'Speed';
    case 'gct':
    case 'groundContactTime':
      return 'GCT';
    case 'vo':
    case 'verticalOscillation':
      return 'Vertical Osc.';
    case 'temp':
    case 'temperature':
      return 'Temperature';
    default:
      // Convert camelCase to Title Case with spaces
      return metric
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
  }
}

/**
 * Helper function to convert hex color to transparent version
 * @param {string} hex - Hex color code
 * @param {number} opacity - Desired opacity
 * @returns {string} RGBA color string
 */
function transparentize(hex, opacity) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb}, ${opacity})`;
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
  title: {
    fontSize: 16,
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
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default SummaryChart;