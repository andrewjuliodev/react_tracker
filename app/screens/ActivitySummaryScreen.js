import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  Alert,
  Share,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Import components
import Header from '../components/common/Header';
import Button from '../components/common/Button';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';
import RouteMap from '../components/maps/RouteMap';
import SummaryChart from '../components/charts/SummaryChart';
import MetricCard from '../components/metrics/MetricCard';

// Import hooks, services and utilities
import { useActivity } from '../../hooks/useActivity';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';
import { formatDate, formatDuration, formatDistance, formatPace } from '../../utils/formatters';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Tab names for summary sections
const SUMMARY_TABS = {
  OVERVIEW: 'Overview',
  METRICS: 'Metrics',
  CHARTS: 'Charts',
  ZONES: 'Zones',
};

const ActivitySummaryScreen = ({ route, navigation }) => {
  // Get activity ID from route params
  const { activityId } = route.params || {};
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [summaryMetrics, setSummaryMetrics] = useState({});
  const [selectedTab, setSelectedTab] = useState(SUMMARY_TABS.OVERVIEW);
  const [mapVisible, setMapVisible] = useState(true);
  
  // Activity hook for accessing stored activities
  const { getActivity, saveActivity, discardActivity } = useActivity();
  
  // Load activity data when component mounts
  useEffect(() => {
    if (activityId) {
      loadActivityData(activityId);
    } else {
      setError('No activity ID provided');
      setLoading(false);
    }
  }, [activityId]);
  
  /**
   * Loads completed activity data from storage
   * @param {string} activityId - ID of the completed activity
   * @returns {Promise<Object>} Activity data with metrics
   * @throws {Error} If loading fails
   */
  const loadActivityData = async (activityId) => {
    try {
      setLoading(true);
      
      // Get activity from storage
      const activity = await getActivity(activityId);
      if (!activity) {
        throw new Error(`Activity with ID ${activityId} not found`);
      }
      
      setActivityData(activity);
      
      // Calculate summary metrics
      const metrics = calculateSummaryMetrics(activity);
      setSummaryMetrics(metrics);
      
      logger.info('Activity data loaded', { activityId });
    } catch (error) {
      logger.error('Error loading activity data', error);
      setError(`Failed to load activity data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Calculates summary metrics from raw activity data
   * @param {Object} activityData - Complete activity data
   * @returns {Object} Aggregated metrics and statistics
   */
  const calculateSummaryMetrics = (activity) => {
    // This would be implemented fully in the activitySummary service
    // Here we're using the data directly from the activity object
    
    const duration = activity.duration || 0; // seconds
    const distance = activity.distance || 0; // meters
    const avgHeartRate = activity.avgHeartRate || 0; // bpm
    const maxHeartRate = activity.maxHeartRate || 0; // bpm
    const avgPower = activity.avgPower || 0; // watts
    const maxPower = activity.maxPower || 0; // watts
    const avgCadence = activity.avgCadence || 0; // spm
    const elevGain = activity.elevationGain || 0; // meters
    const elevLoss = activity.elevationLoss || 0; // meters
    
    // Calculate pace (min/km) from duration and distance
    const pace = distance > 0 ? (duration / 60) / (distance / 1000) : 0;
    
    return {
      duration,
      distance,
      pace,
      avgHeartRate,
      maxHeartRate,
      avgPower,
      maxPower,
      avgCadence,
      elevGain,
      elevLoss,
      startTime: activity.startTime,
    };
  };
  
  /**
   * Handles saving or discarding the activity
   * @param {boolean} save - Whether to save or discard
   * @returns {Promise<void>} Resolves when operation complete
   */
  const handleSaveActivity = async (save) => {
    try {
      if (save) {
        // Save activity
        await saveActivity(activityId);
        navigation.replace(ROUTES.SCREENS.HISTORY);
      } else {
        // Confirm before discarding
        Alert.alert(
          'Discard Activity',
          'Are you sure you want to discard this activity? This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive',
              onPress: async () => {
                await discardActivity(activityId);
                navigation.replace(ROUTES.SCREENS.ACTIVITY_TRACKING);
              }
            }
          ]
        );
      }
    } catch (error) {
      logger.error('Error saving/discarding activity', error);
      Alert.alert('Error', 'Failed to process activity. Please try again.');
    }
  };
  
  /**
   * Shares activity summary with external apps
   * @returns {Promise<void>} Resolves when sharing complete
   */
  const handleShareActivity = async () => {
    try {
      if (!activityData) return;
      
      const duration = formatDuration(summaryMetrics.duration || 0);
      const distance = formatDistance(summaryMetrics.distance || 0);
      const pace = formatPace(summaryMetrics.pace || 0);
      const date = formatDate(summaryMetrics.startTime || Date.now());
      
      const message = 
        `My Run (${date})\n\n` +
        `🕒 Duration: ${duration}\n` +
        `📏 Distance: ${distance}\n` +
        `⚡ Pace: ${pace}\n` +
        `❤️ Heart Rate: ${Math.round(summaryMetrics.avgHeartRate || 0)} bpm\n` +
        `⚡ Power: ${Math.round(summaryMetrics.avgPower || 0)} watts\n\n` +
        `Tracked with RaceTracker`;
        
      await Share.share({
        message,
        title: 'My Run Activity',
      });
    } catch (error) {
      logger.error('Error sharing activity', error);
      Alert.alert('Error', 'Failed to share activity. Please try again.');
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingIndicator size="large" message="Loading activity data..." />
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header 
          title="Activity Summary" 
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} />
          <Button 
            label="Go Back" 
            onPress={() => navigation.goBack()} 
            variant="primary"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  // Render main content
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark-content" />
      
      <Header 
        title="Activity Summary" 
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'share-outline',
            onPress: handleShareActivity
          }
        ]}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Activity Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {activityData?.name || 'Activity Summary'}
          </Text>
          <Text style={styles.date}>
            {formatDate(summaryMetrics.startTime || Date.now())}
          </Text>
        </View>
        
        {/* Map Section */}
        {mapVisible && (
          <View style={styles.mapContainer}>
            <RouteMap 
              routeCoordinates={activityData?.route || []}
              style={styles.map}
            />
            <TouchableOpacity 
              style={styles.mapToggle}
              onPress={() => setMapVisible(false)}
            >
              <Ionicons name="chevron-up" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Map Hidden Toggle */}
        {!mapVisible && (
          <TouchableOpacity 
            style={styles.showMapButton}
            onPress={() => setMapVisible(true)}
          >
            <Ionicons name="map-outline" size={20} color="#2563EB" />
            <Text style={styles.showMapText}>Show Map</Text>
          </TouchableOpacity>
        )}
        
        {/* Key Metrics Summary */}
        <View style={styles.keyMetricsContainer}>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {formatDistance(summaryMetrics.distance || 0)}
              </Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {formatDuration(summaryMetrics.duration || 0, false)}
              </Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {formatPace(summaryMetrics.pace || 0)}
              </Text>
              <Text style={styles.metricLabel}>Avg Pace</Text>
            </View>
          </View>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {Object.values(SUMMARY_TABS).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                selectedTab === tab && styles.activeTab
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text 
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
      
      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          label="Save Activity"
          onPress={() => handleSaveActivity(true)}
          variant="primary"
          style={styles.button}
        />
        <Button
          label="Discard"
          onPress={() => handleSaveActivity(false)}
          variant="danger"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
  
  // Helper function to render tab content based on selected tab
  function renderTabContent() {
    switch (selectedTab) {
      case SUMMARY_TABS.OVERVIEW:
        return renderOverviewTab();
      
      case SUMMARY_TABS.METRICS:
        return renderMetricsTab();
      
      case SUMMARY_TABS.CHARTS:
        return renderChartsTab();
      
      case SUMMARY_TABS.ZONES:
        return renderZonesTab();
      
      default:
        return renderOverviewTab();
    }
  }
  
  // Render overview tab
  function renderOverviewTab() {
    return (
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        
        <View style={styles.metricsGrid}>
          <MetricCard 
            label="Heart Rate" 
            value={Math.round(summaryMetrics.avgHeartRate || 0)} 
            unit="bpm"
            icon="heart"
          />
          <MetricCard 
            label="Power" 
            value={Math.round(summaryMetrics.avgPower || 0)} 
            unit="watts"
            icon="flash"
          />
          <MetricCard 
            label="Cadence" 
            value={Math.round(summaryMetrics.avgCadence || 0)} 
            unit="spm"
            icon="speedometer"
          />
          <MetricCard 
            label="Elevation Gain" 
            value={Math.round(summaryMetrics.elevGain || 0)} 
            unit="m"
            icon="trending-up"
          />
        </View>
        
        <Text style={styles.sectionTitle}>Split Times</Text>
        {renderSplits()}
      </View>
    );
  }
  
  // Render more detailed metrics
  function renderMetricsTab() {
    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Detailed Metrics</Text>
        
        <View style={styles.metricsList}>
          {/* Heart Rate Metrics */}
          <View style={styles.metricGroup}>
            <Text style={styles.metricGroupTitle}>Heart Rate</Text>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Average</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.avgHeartRate || 0)} bpm
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Maximum</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.maxHeartRate || 0)} bpm
              </Text>
            </View>
          </View>
          
          {/* Power Metrics */}
          <View style={styles.metricGroup}>
            <Text style={styles.metricGroupTitle}>Power</Text>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Average</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.avgPower || 0)} watts
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Maximum</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.maxPower || 0)} watts
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Power/Weight</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round((summaryMetrics.avgPower || 0) / 70 * 100) / 100} w/kg
              </Text>
            </View>
          </View>
          
          {/* Pace & Speed Metrics */}
          <View style={styles.metricGroup}>
            <Text style={styles.metricGroupTitle}>Pace & Speed</Text>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Average Pace</Text>
              <Text style={styles.metricDetailValue}>
                {formatPace(summaryMetrics.pace || 0)}
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Best Pace</Text>
              <Text style={styles.metricDetailValue}>
                {formatPace((summaryMetrics.pace || 0) * 0.9)}
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Average Speed</Text>
                              <Text style={styles.metricDetailValue}>
                {Math.round((summaryMetrics.distance / 1000) / (summaryMetrics.duration / 3600) * 10) / 10} km/h
              </Text>
            </View>
          </View>
          
          {/* Cadence Metrics */}
          <View style={styles.metricGroup}>
            <Text style={styles.metricGroupTitle}>Cadence</Text>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Average</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.avgCadence || 0)} spm
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Maximum</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round((summaryMetrics.avgCadence || 0) * 1.1)} spm
              </Text>
            </View>
          </View>
          
          {/* Elevation Metrics */}
          <View style={styles.metricGroup}>
            <Text style={styles.metricGroupTitle}>Elevation</Text>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Total Gain</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.elevGain || 0)} m
              </Text>
            </View>
            <View style={styles.metricDetailRow}>
              <Text style={styles.metricDetailLabel}>Total Loss</Text>
              <Text style={styles.metricDetailValue}>
                {Math.round(summaryMetrics.elevLoss || 0)} m
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  // Render charts tab
  function renderChartsTab() {
    return (
      <View style={styles.chartsContainer}>
        <Text style={styles.sectionTitle}>Performance Charts</Text>
        
        {/* Heart Rate Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Heart Rate</Text>
          <SummaryChart 
            data={activityData?.heartRateData || []}
            chartType="area"
            metrics={['heart_rate']}
            style={styles.chart}
          />
        </View>
        
        {/* Power Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Power</Text>
          <SummaryChart 
            data={activityData?.powerData || []}
            chartType="area"
            metrics={['power']}
            style={styles.chart}
          />
        </View>
        
        {/* Pace Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Pace</Text>
          <SummaryChart 
            data={activityData?.paceData || []}
            chartType="line"
            metrics={['pace']}
            style={styles.chart}
          />
        </View>
        
        {/* Elevation Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Elevation</Text>
          <SummaryChart 
            data={activityData?.elevationData || []}
            chartType="area"
            metrics={['elevation']}
            style={styles.chart}
          />
        </View>
      </View>
    );
  }
  
  // Render zones tab
  function renderZonesTab() {
    return (
      <View style={styles.zonesContainer}>
        <Text style={styles.sectionTitle}>Training Zones</Text>
        
        {/* Heart Rate Zones */}
        <View style={styles.zoneCard}>
          <Text style={styles.zoneTitle}>Heart Rate Zones</Text>
          <SummaryChart 
            data={calculateZones(activityData?.heartRateData, 'heart_rate')}
            chartType="pie"
            style={styles.zoneChart}
          />
        </View>
        
        {/* Power Zones */}
        <View style={styles.zoneCard}>
          <Text style={styles.zoneTitle}>Power Zones</Text>
          <SummaryChart 
            data={calculateZones(activityData?.powerData, 'power')}
            chartType="pie"
            style={styles.zoneChart}
          />
        </View>
        
        {/* Zone Distribution */}
        <View style={styles.zoneTable}>
          <View style={styles.zoneTableHeader}>
            <Text style={[styles.zoneTableCell, styles.zoneTableHeaderText]}>Zone</Text>
            <Text style={[styles.zoneTableCell, styles.zoneTableHeaderText]}>Time</Text>
            <Text style={[styles.zoneTableCell, styles.zoneTableHeaderText]}>% of Total</Text>
          </View>
          
          {/* Placeholder zone data */}
          {[1, 2, 3, 4, 5].map(zone => (
            <View key={zone} style={styles.zoneTableRow}>
              <Text style={styles.zoneTableCell}>Zone {zone}</Text>
              <Text style={styles.zoneTableCell}>{Math.round(Math.random() * 15)} min</Text>
              <Text style={styles.zoneTableCell}>{Math.round(Math.random() * 100)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  
  // Helper function to render splits
  function renderSplits() {
    // Generate mock splits for demo purposes
    const mockSplits = [];
    const totalDistance = summaryMetrics.distance || 0;
    const totalDuration = summaryMetrics.duration || 0;
    
    if (totalDistance > 0 && totalDuration > 0) {
      const avgPacePerKm = totalDuration / (totalDistance / 1000);
      
      // Generate kilometer splits
      const kmCount = Math.floor(totalDistance / 1000);
      
      for (let i = 0; i < Math.min(kmCount, 10); i++) {
        // Add some random variation to the pace
        const variation = 0.9 + (Math.random() * 0.2);
        const splitPace = avgPacePerKm * variation;
        
        mockSplits.push({
          distance: (i + 1) * 1000,
          duration: splitPace,
          pace: splitPace / 60,
        });
      }
    }
    
    if (mockSplits.length === 0) {
      return (
        <View style={styles.noSplitsContainer}>
          <Text style={styles.noSplitsText}>No split data available</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.splitsContainer}>
        <View style={styles.splitHeader}>
          <Text style={[styles.splitCell, styles.splitHeaderText]}>KM</Text>
          <Text style={[styles.splitCell, styles.splitHeaderText]}>Split</Text>
          <Text style={[styles.splitCell, styles.splitHeaderText]}>Pace</Text>
        </View>
        
        {mockSplits.map((split, index) => (
          <View key={index} style={styles.splitRow}>
            <Text style={styles.splitCell}>{index + 1}</Text>
            <Text style={styles.splitCell}>{formatDuration(split.duration)}</Text>
            <Text style={styles.splitCell}>{formatPace(split.pace)}</Text>
          </View>
        ))}
      </View>
    );
  }
  
  // Helper function to calculate zones from data
  function calculateZones(data = [], metricType = 'heart_rate') {
    // This would come from the activitySummary service in a real implementation
    // Just return placeholder data for now
    return [
      { name: 'Zone 1', value: 15 },
      { name: 'Zone 2', value: 35 },
      { name: 'Zone 3', value: 30 },
      { name: 'Zone 4', value: 15 },
      { name: 'Zone 5', value: 5 },
    ];
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorButton: {
    marginTop: 20,
    minWidth: 120,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#64748B',
  },
  mapContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapToggle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    margin: 16,
  },
  showMapText: {
    color: '#2563EB',
    marginLeft: 4,
    fontWeight: '500',
  },
  keyMetricsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Overview Tab Styles
  overviewContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  splitsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  splitHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitHeaderText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  splitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitCell: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  noSplitsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  noSplitsText: {
    color: '#64748B',
    fontSize: 16,
  },
  
  // Metrics Tab Styles
  metricsContainer: {
    padding: 16,
  },
  metricsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metricGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  metricDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricDetailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  metricDetailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  
  // Charts Tab Styles
  chartsContainer: {
    padding: 16,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  chart: {
    height: 200,
    width: '100%',
  },
  
  // Zones Tab Styles
  zonesContainer: {
    padding: 16,
  },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  zoneChart: {
    height: 180,
    width: '100%',
  },
  zoneTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  zoneTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  zoneTableHeaderText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  zoneTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  zoneTableCell: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  
  // Bottom buttons
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ActivitySummaryScreen;