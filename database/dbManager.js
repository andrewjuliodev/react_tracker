import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';
import * as activitySchema from './schemas/activitySchema';
import * as sensorDataSchema from './schemas/sensorDataSchema';
import { logger } from '../utils/logger';

class DbManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database connection
   * @returns {Promise<void>}
   */
  async init() {
    try {
      if (this.isInitialized) {
        return;
      }

      this.db = SQLite.openDatabase('racetracker.db');
      
      // Run migrations
      await this.migrate();
      
      this.isInitialized = true;
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', error);
      Alert.alert(
        'Database Error',
        'Could not initialize the database. Please restart the app.'
      );
      throw error;
    }
  }

  /**
   * Run database migrations
   * @returns {Promise<void>}
   */
  async migrate() {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Create activities table
          tx.executeSql(activitySchema.CREATE_ACTIVITIES_TABLE);
          
          // Create sensor_data table
          tx.executeSql(sensorDataSchema.CREATE_SENSOR_DATA_TABLE);
          
          // Create locations table
          tx.executeSql(activitySchema.CREATE_LOCATIONS_TABLE);
          
          // Create devices table
          tx.executeSql(activitySchema.CREATE_DEVICES_TABLE);
          
          // Create indexes
          tx.executeSql(sensorDataSchema.CREATE_INDEX_SENSOR_DATA_ACTIVITY_ID);
          tx.executeSql(sensorDataSchema.CREATE_INDEX_SENSOR_DATA_TIMESTAMP);
          tx.executeSql(sensorDataSchema.CREATE_INDEX_SENSOR_DATA_DEVICE_ID);
          tx.executeSql(activitySchema.CREATE_INDEX_LOCATIONS_ACTIVITY_ID);
          tx.executeSql(activitySchema.CREATE_INDEX_LOCATIONS_TIMESTAMP);
          tx.executeSql(activitySchema.CREATE_INDEX_ACTIVITIES_START_TIME);
        },
        error => {
          logger.error('Database migration failed', error);
          reject(error);
        },
        () => {
          logger.info('Database migration completed successfully');
          resolve();
        }
      );
    });
  }

  /**
   * Execute a SQL transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>}
   */
  async executeTransaction(callback) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          callback(tx);
        },
        error => {
          logger.error('Transaction failed', error);
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Execute a SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>}
   */
  async executeQuery(query, params = []) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, result) => {
            resolve(result);
          },
          (_, error) => {
            logger.error(`Query failed: ${query}`, error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }
}

// Singleton instance
const dbManager = new DbManager();

export default dbManager;