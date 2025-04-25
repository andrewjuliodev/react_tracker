import dbManager from '../database/dbManager';
import logger from '../../utils/logger';
import { NotFoundError, DatabaseError, ValidationError } from '../utils/errorTypes';
import { v4 as uuidv4 } from 'uuid';

// Create logger instance for this module
const modelLogger = logger.createContextLogger('ActivityModel');

/**
 * Activity data model for database operations.
 * Provides data structure definition, CRUD operations,
 * query methods, and data validation.
 */
class Activity {
  // Database table name
  static tableName = 'activities';
  
  // Database connection
  static db = null;
  
  /**
   * Initializes the database connection
   * @private
   */
  static async _initDb() {
    if (!this.db) {
      try {
        this.db = await dbManager.getConnection();
        modelLogger.info('Database connection initialized for Activity model');
      } catch (error) {
        modelLogger.error('Failed to initialize database connection', error);
        throw new DatabaseError('Database connection failed', { cause: error });
      }
    }
    return this.db;
  }
  
  /**
   * Creates new activity record
   * @param {Object} data - Activity information
   * @returns {Promise<Object>} Created activity
   * @throws {DatabaseError} If creation fails
   */
  static async create(data) {
    try {
      await this._initDb();
      
      // Generate ID if not provided
      const id = data.id || uuidv4();
      
      // Prepare data for insertion
      const insertData = {
        id,
        name: data.name || 'Activity',
        type: data.type,
        start_time: data.startTime,
        end_time: data.endTime,
        duration: data.duration,
        distance: data.distance,
        avg_heart_rate: data.avgHeartRate,
        avg_power: data.avgPower,
        avg_pace: data.avgPace,
        elevation_gain: data.elevationGain,
        device_ids: data.deviceIds ? JSON.stringify(data.deviceIds) : null,
        notes: data.notes,
        user_id: data.userId,
        created_at: data.createdAt || Date.now(),
        updated_at: data.updatedAt || Date.now()
      };
      
      // Convert fields to SQLite format
      const columns = Object.keys(insertData).join(', ');
      const placeholders = Object.keys(insertData)
        .map(() => '?')
        .join(', ');
      const values = Object.values(insertData);
      
      // Construct and execute query
      const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      await this.db.executeSql(query, values);
      
      // Return the created activity
      return this.findById(id);
    } catch (error) {
      modelLogger.error('Failed to create activity', error);
      throw new DatabaseError('Failed to create activity record', { cause: error });
    }
  }
  
  /**
   * Finds activity by ID
   * @param {string} id - Activity identifier
   * @returns {Promise<Object>} Activity record
   * @throws {NotFoundError} If activity not found
   */
  static async findById(id) {
    try {
      await this._initDb();
      
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const [results] = await this.db.executeSql(query, [id]);
      
      if (results.rows.length === 0) {
        throw new NotFoundError(`Activity with ID ${id} not found`);
      }
      
      // Convert SQLite result to Activity object
      return this._formatActivityData(results.rows.item(0));
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      modelLogger.error(`Failed to find activity with ID ${id}`, error);
      throw new DatabaseError('Database query failed', { cause: error });
    }
  }
  
  /**
   * Finds activities by criteria
   * @param {Object} filters - Search criteria
   * @param {Object} options - Sort and pagination
   * @returns {Promise<Array>} Matching activities
   * @throws {DatabaseError} If query fails
   */
  static async findByFilters(filters = {}, options = {}) {
    try {
      await this._initDb();
      
      // Build query parts
      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const queryParams = [];
      
      // Apply filters
      if (filters.userId) {
        query += ' AND user_id = ?';
        queryParams.push(filters.userId);
      }
      
      if (filters.type) {
        query += ' AND type = ?';
        queryParams.push(filters.type);
      }
      
      if (filters.startDate) {
        query += ' AND start_time >= ?';
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND start_time <= ?';
        queryParams.push(filters.endDate);
      }
      
      // Apply sorting
      const validSortFields = {
        'startTime': 'start_time',
        'endTime': 'end_time',
        'duration': 'duration',
        'distance': 'distance',
        'type': 'type',
        'createdAt': 'created_at'
      };
      
      const sortBy = validSortFields[options.sortBy] || 'start_time';
      const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY ${sortBy} ${sortOrder}`;
      
      // Apply pagination
      if (options.limit) {
        query += ' LIMIT ?';
        queryParams.push(options.limit);
        
        if (options.offset) {
          query += ' OFFSET ?';
          queryParams.push(options.offset);
        }
      }
      
      // Execute query
      const [results] = await this.db.executeSql(query, queryParams);
      
      // Convert SQLite result to Activity objects
      const activities = [];
      for (let i = 0; i < results.rows.length; i++) {
        activities.push(this._formatActivityData(results.rows.item(i)));
      }
      
      return activities;
    } catch (error) {
      modelLogger.error('Failed to find activities by filters', error);
      throw new DatabaseError('Database query failed', { cause: error });
    }
  }
  
  /**
   * Updates activity record
   * @param {string} id - Activity identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated activity
   * @throws {NotFoundError} If activity not found
   * @throws {DatabaseError} If update fails
   */
  static async update(id, updates) {
    try {
      await this._initDb();
      
      // Check if activity exists
      await this.findById(id);
      
      // Prepare data for update
      const updateData = {};
      
      // Map JavaScript property names to database column names
      const fieldMapping = {
        name: 'name',
        type: 'type',
        startTime: 'start_time',
        endTime: 'end_time',
        duration: 'duration',
        distance: 'distance',
        avgHeartRate: 'avg_heart_rate',
        avgPower: 'avg_power',
        avgPace: 'avg_pace',
        elevationGain: 'elevation_gain',
        deviceIds: 'device_ids',
        notes: 'notes',
        updatedAt: 'updated_at'
      };
      
      // Process each update field
      for (const [key, value] of Object.entries(updates)) {
        const dbField = fieldMapping[key];
        
        if (dbField) {
          // Handle special cases
          if (key === 'deviceIds' && value !== null) {
            updateData[dbField] = JSON.stringify(value);
          } else {
            updateData[dbField] = value;
          }
        }
      }
      
      // If no valid fields to update
      if (Object.keys(updateData).length === 0) {
        return this.findById(id);
      }
      
      // Convert to SQL format
      const setClauses = Object.keys(updateData)
        .map(column => `${column} = ?`)
        .join(', ');
      
      const values = [...Object.values(updateData), id];
      
      // Construct and execute query
      const query = `UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`;
      await this.db.executeSql(query, values);
      
      // Return the updated activity
      return this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      modelLogger.error(`Failed to update activity with ID ${id}`, error);
      throw new DatabaseError('Failed to update activity record', { cause: error });
    }
  }
  
  /**
   * Deletes activity record
   * @param {string} id - Activity identifier
   * @returns {Promise<boolean>} Success state
   * @throws {NotFoundError} If activity not found
   * @throws {DatabaseError} If deletion fails
   */
  static async delete(id) {
    try {
      await this._initDb();
      
      // Check if activity exists
      await this.findById(id);
      
      // Delete associated sensor data first (cascade would handle this normally)
      const sensorDataTable = 'sensor_data';
      const deleteDataQuery = `DELETE FROM ${sensorDataTable} WHERE activity_id = ?`;
      await this.db.executeSql(deleteDataQuery, [id]);
      
      // Delete associated route data
      const locationDataTable = 'locations';
      const deleteLocationsQuery = `DELETE FROM ${locationDataTable} WHERE activity_id = ?`;
      await this.db.executeSql(deleteLocationsQuery, [id]);
      
      // Delete the activity
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      await this.db.executeSql(query, [id]);
      
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      modelLogger.error(`Failed to delete activity with ID ${id}`, error);
      throw new DatabaseError('Failed to delete activity record', { cause: error });
    }
  }
  
  /**
   * Gets sensor data for activity
   * @param {string} activityId - Activity identifier
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Sensor readings
   * @throws {DatabaseError} If query fails
   */
  static async getSensorData(activityId, options = {}) {
    try {
      await this._initDb();
      
      // Build query parts
      let query = 'SELECT * FROM sensor_data WHERE activity_id = ?';
      const queryParams = [activityId];
      
      // Apply filters
      if (options.type) {
        query += ' AND data_type = ?';
        queryParams.push(options.type);
      }
      
      if (options.startTime) {
        query += ' AND timestamp >= ?';
        queryParams.push(options.startTime);
      }
      
      if (options.endTime) {
        query += ' AND timestamp <= ?';
        queryParams.push(options.endTime);
      }
      
      // Order by timestamp
      query += ' ORDER BY timestamp ASC';
      
      // Apply limit
      if (options.limit) {
        query += ' LIMIT ?';
        queryParams.push(options.limit);
      }
      
      // Execute query
      const [results] = await this.db.executeSql(query, queryParams);
      
      // Convert SQLite result to sensor data objects
      const sensorData = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        sensorData.push({
          id: row.id,
          activityId: row.activity_id,
          timestamp: row.timestamp,
          dataType: row.data_type,
          value: row.value,
          deviceId: row.device_id
        });
      }
      
      return sensorData;
    } catch (error) {
      modelLogger.error(`Failed to get sensor data for activity ID ${activityId}`, error);
      throw new DatabaseError('Failed to retrieve sensor data', { cause: error });
    }
  }
  
  /**
   * Gets route data for activity
   * @param {string} activityId - Activity identifier
   * @returns {Promise<Array>} Route location data
   * @throws {DatabaseError} If query fails
   */
  static async getRouteData(activityId) {
    try {
      await this._initDb();
      
      // Query for route points
      const query = 'SELECT * FROM locations WHERE activity_id = ? ORDER BY timestamp ASC';
      const [results] = await this.db.executeSql(query, [activityId]);
      
      // Convert SQLite result to location objects
      const routeData = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        routeData.push({
          id: row.id,
          activityId: row.activity_id,
          timestamp: row.timestamp,
          latitude: row.latitude,
          longitude: row.longitude,
          altitude: row.altitude,
          accuracy: row.accuracy
        });
      }
      
      return routeData;
    } catch (error) {
      modelLogger.error(`Failed to get route data for activity ID ${activityId}`, error);
      throw new DatabaseError('Failed to retrieve route data', { cause: error });
    }
  }
  
  /**
   * Adds sensor data to activity
   * @param {string} activityId - Activity identifier
   * @param {Array} sensorData - Sensor readings
   * @returns {Promise<boolean>} Success state
   * @throws {DatabaseError} If insertion fails
   */
  static async addSensorData(activityId, sensorData) {
    try {
      await this._initDb();
      
      // Begin transaction
      await this.db.transaction(async (tx) => {
        // Prepare insertion statement
        const query = `
          INSERT INTO sensor_data (
            id, activity_id, timestamp, data_type, value, device_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // Insert each sensor data point
        for (const data of sensorData) {
          const id = uuidv4();
          await tx.executeSql(query, [
            id,
            activityId,
            data.timestamp,
            data.dataType,
            data.value,
            data.deviceId
          ]);
        }
      });
      
      return true;
    } catch (error) {
      modelLogger.error(`Failed to add sensor data for activity ID ${activityId}`, error);
      throw new DatabaseError('Failed to insert sensor data', { cause: error });
    }
  }
  
  /**
   * Formats database row to activity object
   * @param {Object} row - Database result row
   * @returns {Object} Formatted activity object
   * @private
   */
  static _formatActivityData(row) {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      startTime: row.start_time,
      endTime: row.end_time || null,
      duration: row.duration || null,
      distance: row.distance || null,
      avgHeartRate: row.avg_heart_rate || null,
      avgPower: row.avg_power || null,
      avgPace: row.avg_pace || null,
      elevationGain: row.elevation_gain || null,
      deviceIds: row.device_ids ? JSON.parse(row.device_ids) : null,
      notes: row.notes || null,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default Activity;