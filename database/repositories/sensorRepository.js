// database/repositories/sensorRepository.js

import { Database } from '../dbManager';
import { generateUUID } from '../../utils/formatters';

class SensorRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Saves a batch of sensor data records to the database
   * @param {Array} sensorData - Array of sensor data objects
   * @returns {Promise<boolean>} - Success status
   */
  async saveBatchSensorData(sensorData) {
    if (!sensorData || !sensorData.length) {
      return false;
    }

    try {
      await this.database.transaction(async (tx) => {
        const statement = `INSERT INTO sensor_data (
          id, activity_id, timestamp, device_id, data_type, value
        ) VALUES (?, ?, ?, ?, ?, ?)`;

        for (const data of sensorData) {
          const params = [
            data.id || generateUUID(),
            data.activity_id,
            data.timestamp,
            data.device_id,
            data.data_type,
            data.value
          ];
          await tx.executeSql(statement, params);
        }
      });
      return true;
    } catch (error) {
      console.error('Error saving batch sensor data:', error);
      return false;
    }
  }

  /**
   * Retrieves sensor data for a specific activity
   * @param {string} activityId - The ID of the activity
   * @param {string} dataType - Optional sensor data type filter
   * @returns {Promise<Array>} - Array of sensor data records
   */
  async getSensorDataByActivity(activityId, dataType = null) {
    try {
      let query = 'SELECT * FROM sensor_data WHERE activity_id = ?';
      const params = [activityId];

      if (dataType) {
        query += ' AND data_type = ?';
        params.push(dataType);
      }

      query += ' ORDER BY timestamp ASC';

      const [results] = await this.database.executeSql(query, params);
      return results.rows.raw();
    } catch (error) {
      console.error('Error retrieving sensor data:', error);
      return [];
    }
  }

  /**
   * Retrieves the latest sensor data for each data type
   * @param {string} activityId - The ID of the activity
   * @returns {Promise<Object>} - Object with data types as keys and latest values
   */
  async getLatestSensorData(activityId) {
    try {
      const query = `
        SELECT sd1.* 
        FROM sensor_data sd1
        JOIN (
          SELECT data_type, MAX(timestamp) as max_timestamp
          FROM sensor_data
          WHERE activity_id = ?
          GROUP BY data_type
        ) sd2 
        ON sd1.data_type = sd2.data_type AND sd1.timestamp = sd2.max_timestamp
        WHERE sd1.activity_id = ?
      `;
      
      const [results] = await this.database.executeSql(query, [activityId, activityId]);
      
      // Transform into object with data types as keys
      const latestData = {};
      const rows = results.rows.raw();
      
      rows.forEach(row => {
        latestData[row.data_type] = row.value;
      });
      
      return latestData;
    } catch (error) {
      console.error('Error retrieving latest sensor data:', error);
      return {};
    }
  }

  /**
   * Deletes sensor data for a specific activity
   * @param {string} activityId - The ID of the activity
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSensorDataByActivity(activityId) {
    try {
      await this.database.executeSql(
        'DELETE FROM sensor_data WHERE activity_id = ?',
        [activityId]
      );
      return true;
    } catch (error) {
      console.error('Error deleting sensor data:', error);
      return false;
    }
  }

  /**
   * Gets average value for a specific data type during an activity
   * @param {string} activityId - The ID of the activity
   * @param {string} dataType - The sensor data type
   * @returns {Promise<number>} - Average value or null
   */
  async getAverageValue(activityId, dataType) {
    try {
      const query = `
        SELECT AVG(value) as average
        FROM sensor_data
        WHERE activity_id = ? AND data_type = ?
      `;
      
      const [results] = await this.database.executeSql(query, [activityId, dataType]);
      
      if (results.rows.length > 0) {
        return results.rows.item(0).average;
      }
      return null;
    } catch (error) {
      console.error('Error calculating average value:', error);
      return null;
    }
  }

  /**
   * Gets maximum value for a specific data type during an activity
   * @param {string} activityId - The ID of the activity
   * @param {string} dataType - The sensor data type
   * @returns {Promise<number>} - Maximum value or null
   */
  async getMaxValue(activityId, dataType) {
    try {
      const query = `
        SELECT MAX(value) as maximum
        FROM sensor_data
        WHERE activity_id = ? AND data_type = ?
      `;
      
      const [results] = await this.database.executeSql(query, [activityId, dataType]);
      
      if (results.rows.length > 0) {
        return results.rows.item(0).maximum;
      }
      return null;
    } catch (error) {
      console.error('Error calculating maximum value:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new SensorRepository(Database);