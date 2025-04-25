import { v4 as uuidv4 } from 'uuid';
import dbManager from '../dbManager';
import * as activitySchema from '../schemas/activitySchema';
import { logger } from '../../utils/logger';

/**
 * Activity Repository - Handles database operations for activities
 */
class ActivityRepository {
  /**
   * Create a new activity
   * @param {Object} activity - Activity data
   * @returns {Promise<Object>} - Created activity
   */
  async createActivity(activity) {
    try {
      const newActivity = {
        ...activitySchema.DEFAULT_ACTIVITY,
        ...activity,
        id: activity.id || uuidv4(),
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      if (!activitySchema.validateActivity(newActivity)) {
        throw new Error('Invalid activity data');
      }
      
      const params = activitySchema.activityToParams(newActivity);
      const keys = Object.keys(params);
      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');
      const values = Object.values(params);
      
      const query = `INSERT INTO activities (${columns}) VALUES (${placeholders})`;
      await dbManager.executeQuery(query, values);
      
      return newActivity;
    } catch (error) {
      logger.error('Failed to create activity', error);
      throw error;
    }
  }
  
  /**
   * Get activity by id
   * @param {string} id - Activity id
   * @returns {Promise<Object|null>} - Activity or null if not found
   */
  async getActivityById(id) {
    try {
      const query = 'SELECT * FROM activities WHERE id = ?';
      const result = await dbManager.executeQuery(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows.item(0);
      return activitySchema.rowToActivity(row);
    } catch (error) {
      logger.error(`Failed to get activity by id: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Get all activities with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of activities
   */
  async getActivities(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'start_time',
        sortOrder = 'DESC',
        type,
        startDate,
        endDate
      } = options;
      
      let query = 'SELECT * FROM activities';
      const params = [];
      const conditions = [];
      
      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }
      
      if (startDate) {
        conditions.push('start_time >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        conditions.push('start_time <= ?');
        params.push(endDate);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const result = await dbManager.executeQuery(query, params);
      const activities = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        activities.push(activitySchema.rowToActivity(row));
      }
      
      return activities;
    } catch (error) {
      logger.error('Failed to get activities', error);
      throw error;
    }
  }
  
  /**
   * Update an activity
   * @param {string} id - Activity id
   * @param {Object} updates - Activity data to update
   * @returns {Promise<Object>} - Updated activity
   */
  async updateActivity(id, updates) {
    try {
      const currentActivity = await this.getActivityById(id);
      
      if (!currentActivity) {
        throw new Error(`Activity with id ${id} not found`);
      }
      
      const updatedActivity = {
        ...currentActivity,
        ...updates,
        updated_at: Date.now()
      };
      
      if (!activitySchema.validateActivity(updatedActivity)) {
        throw new Error('Invalid activity data');
      }
      
      const params = activitySchema.activityToParams(updatedActivity);
      const setClause = Object.keys(params)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = [...Object.values(params), id];
      
      const query = `UPDATE activities SET ${setClause} WHERE id = ?`;
      await dbManager.executeQuery(query, values);
      
      return updatedActivity;
    } catch (error) {
      logger.error(`Failed to update activity: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Delete an activity
   * @param {string} id - Activity id
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteActivity(id) {
    try {
      const query = 'DELETE FROM activities WHERE id = ?';
      const result = await dbManager.executeQuery(query, [id]);
      
      return result.rowsAffected > 0;
    } catch (error) {
      logger.error(`Failed to delete activity: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Get activity statistics
   * @returns {Promise<Object>} - Activity statistics
   */
  async getActivityStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as totalActivities,
          SUM(distance) as totalDistance,
          SUM(duration) as totalDuration,
          AVG(avg_heart_rate) as avgHeartRate,
          AVG(avg_power) as avgPower,
          MAX(distance) as longestDistance,
          MAX(duration) as longestDuration
        FROM activities
      `;
      
      const result = await dbManager.executeQuery(query);
      
      if (result.rows.length === 0) {
        return {
          totalActivities: 0,
          totalDistance: 0,
          totalDuration: 0,
          avgHeartRate: 0,
          avgPower: 0,
          longestDistance: 0,
          longestDuration: 0
        };
      }
      
      const row = result.rows.item(0);
      
      return {
        totalActivities: row.totalActivities || 0,
        totalDistance: row.totalDistance || 0,
        totalDuration: row.totalDuration || 0,
        avgHeartRate: row.avgHeartRate || 0,
        avgPower: row.avgPower || 0,
        longestDistance: row.longestDistance || 0,
        longestDuration: row.longestDuration || 0
      };
    } catch (error) {
      logger.error('Failed to get activity statistics', error);
      throw error;
    }
  }
  
  /**
   * Add location data to an activity
   * @param {string} activityId - Activity id
   * @param {Array} locations - Array of location objects
   * @returns {Promise<boolean>} - True if successful
   */
  async addLocations(activityId, locations) {
    try {
      if (!locations || locations.length === 0) {
        return true;
      }
      
      // Start a transaction
      await dbManager.executeTransaction(tx => {
        const baseQuery = 'INSERT INTO locations (id, activity_id, timestamp, latitude, longitude, altitude, accuracy) VALUES ';
        const chunkSize = 50; // Insert in chunks to avoid SQLite limits
        
        // Process locations in chunks
        for (let i = 0; i < locations.length; i += chunkSize) {
          const chunk = locations.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values = [];
          
          chunk.forEach(location => {
            values.push(
              location.id || uuidv4(),
              activityId,
              location.timestamp,
              location.latitude,
              location.longitude,
              location.altitude || 0,
              location.accuracy || 0
            );
          });
          
          tx.executeSql(baseQuery + placeholders, values);
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to add locations for activity: ${activityId}`, error);
      throw error;
    }
  }
  
  /**
   * Get locations for an activity
   * @param {string} activityId - Activity id
   * @returns {Promise<Array>} - Array of location objects
   */
  async getLocations(activityId) {
    try {
      const query = 'SELECT * FROM locations WHERE activity_id = ? ORDER BY timestamp ASC';
      const result = await dbManager.executeQuery(query, [activityId]);
      
      const locations = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        locations.push({
          id: row.id,
          activity_id: row.activity_id,
          timestamp: row.timestamp,
          latitude: row.latitude,
          longitude: row.longitude,
          altitude: row.altitude,
          accuracy: row.accuracy
        });
      }
      
      return locations;
    } catch (error) {
      logger.error(`Failed to get locations for activity: ${activityId}`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const activityRepository = new ActivityRepository();
export default activityRepository;