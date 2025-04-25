import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Import components
import Header from '../components/common/Header';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';

// Import hooks, services and utilities
import { useActivity } from '../../hooks/useActivity';
import ROUTES from '../../navigation/routes';
import logger from '../../utils/logger';
import { formatDate, formatDuration, formatDistance, formatPace } from '../../utils/formatters';

const HistoryScreen = ({ navigation }) => {
  // State
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCriteria, setFilterCriteria] = useState({});
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [refreshing, setRefreshing] = useState(false);
  
  // Activity hook for accessing stored activities
  const { getAllActivities, deleteActivity } = useActivity();
  
  // Load activities when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [filterCriteria, sortOrder])
  );
  
  /**
   * Loads activity history from storage
   * @param {Object} filters - Optional filter criteria
   * @returns {Promise<Array>} List of activity records
   * @throws {Error} If loading fails
   */
  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get activities from storage
      const activityList = await getAllActivities(filterCriteria);
      
      // Sort activities
      const sortedActivities = sortActivities(activityList, sortOrder);
      
      setActivities(sortedActivities);
      logger.info('Activities loaded', { count: sortedActivities.length });
    } catch (error) {
      logger.error('Error loading activities', error);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  /**
   * Sorts activities by date
   * @param {Array} activities - Activity list to sort
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted activities
   */
  const sortActivities = (activities, order) => {
    return [...activities].sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      
      return order === 'desc' 
        ? dateB.getTime() - dateA.getTime() 
        : dateA.getTime() - dateB.getTime();
    });
  };
  
  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };
  
  /**
   * Navigates to detail view for an activity
   * @param {string} activityId - ID of the selected activity
   */
  const navigateToActivityDetails = (activityId) => {
    navigation.navigate(ROUTES.SCREENS.ACTIVITY_SUMMARY, {
      activityId,
    });
  };
  
  /**
   * Handles activity deletion with confirmation
   * @param {string} activityId - ID of activity to delete
   * @returns {Promise<boolean>} True if deletion successful
   */
  const handleDeleteActivity = (activityId, activityName) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${activityName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivity(activityId);
              
              // Update activities list
              setActivities(activities.filter(a => a.id !== activityId));
              
              logger.info('Activity deleted', { activityId });
            } catch (error) {
              logger.error('Error deleting activity', error);
              Alert.alert('Error', 'Failed to delete activity. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  /**
   * Updates filter criteria for activity list
   * @param {Object} newFilters - Updated filter settings
   */
  const updateFilters = (newFilters) => {
    setFilterCriteria(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  };
  
  /**
   * Toggles sort order between ascending and descending
   */
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };
  
  /**
   * Opens filter modal
   */
  const openFilterModal = () => {
    // This would open a modal with filter options
    Alert.alert(
      'Filters',
      'Filter functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };
  
  // Render activity item
  const renderActivityItem = ({ item }) => {
    // Calculate activity metrics
    const distance = item.distance || 0;
    const duration = item.duration || 0;
    const pace = distance > 0 ? duration / (distance / 1000) : 0;
    
    return (
      <Card style={styles.activityCard}>
        <TouchableOpacity
          style={styles.activityContent}
          onPress={() => navigateToActivityDetails(item.id)}
        >
          {/* Activity Icon */}
          <View style={styles.activityIcon}>
            <Ionicons 
              name={getActivityIcon(item.type)} 
              size={24} 
              color="#2563EB" 
            />
          </View>
          
          {/* Activity Details */}
          <View style={styles.activityDetails}>
            <Text style={styles.activityName}>
              {item.name || 'Unnamed Activity'}
            </Text>
            <Text style={styles.activityDate}>
              {formatDate(item.startTime)}
            </Text>
            
            {/* Activity Stats */}
            <View style={styles.activityStats}>
              <View style={styles.activityStat}>
                <Ionicons name="stopwatch-outline" size={16} color="#64748B" />
                <Text style={styles.activityStatText}>
                  {formatDuration(duration)}
                </Text>
              </View>
              
              <View style={styles.activityStat}>
                <Ionicons name="map-outline" size={16} color="#64748B" />
                <Text style={styles.activityStatText}>
                  {formatDistance(distance)}
                </Text>
              </View>
              
              <View style={styles.activityStat}>
                <Ionicons name="speedometer-outline" size={16} color="#64748B" />
                <Text style={styles.activityStatText}>
                  {formatPace(pace / 60)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Delete Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteActivity(item.id, item.name || 'Unnamed Activity')}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Card>
    );
  };
  
  // Helper to get activity icon based on type
  const getActivityIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'run':
        return 'walk-outline';
      case 'trail_run':
        return 'trail-sign-outline';
      case 'treadmill':
        return 'fitness-outline';
      case 'race':
        return 'flag-outline';
      case 'interval':
        return 'pulse-outline';
      default:
        return 'fitness-outline';
    }
  };
  
  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="fitness-outline" size={64} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Activities Yet</Text>
        <Text style={styles.emptyText}>
          Start tracking your runs to see them here
        </Text>
        <Button
          label="Start Activity"
          onPress={() => navigation.navigate(ROUTES.SCREENS.ACTIVITY_TRACKING)}
          variant="primary"
          style={styles.emptyButton}
        />
      </View>
    );
  };
  
  // Render header with filter/sort options
  const renderListHeader = () => {
    if (activities.length === 0) return null;
    
    return (
      <View style={styles.listHeader}>
        <Text style={styles.listCount}>
          {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
        </Text>
        
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.listAction}
            onPress={toggleSortOrder}
          >
            <Ionicons 
              name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} 
              size={16} 
              color="#64748B" 
            />
            <Text style={styles.listActionText}>
              {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.listAction}
            onPress={openFilterModal}
          >
            <Ionicons name="filter-outline" size={16} color="#64748B" />
            <Text style={styles.listActionText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Activity History" 
        showBack={false}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingIndicator size="large" message="Loading activities..." />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ErrorMessage 
            message={error} 
            onRetry={loadActivities}
          />
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  listActions: {
    flexDirection: 'row',
  },
  listAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  listActionText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  activityCard: {
    marginBottom: 12,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  activityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  activityStatText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 140,
  },
});

export default HistoryScreen;