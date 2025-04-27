// database/cache/mmkvStorage.js
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Track all keys for clearAll functionality
const KEY_TRACKER = '@racetracker:keys';

/**
 * High-performance secure storage using Expo SecureStore
 */
class SecureStorage {
  constructor() {
    this.sensitiveKeys = new Set([
      'user.credentials',
      'user.token',
      'sensor.heart_rate',
    ]);
    this.cacheSize = 0;
    this.MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Get all stored keys
   */
  async _getAllKeys() {
    try {
      const keysJson = await SecureStore.getItemAsync(KEY_TRACKER);
      return keysJson ? JSON.parse(keysJson) : [];
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }

  /**
   * Update key tracker
   */
  async _updateKeys(keys) {
    try {
      await SecureStore.setItemAsync(KEY_TRACKER, JSON.stringify(keys));
    } catch (error) {
      console.error('Error updating keys:', error);
    }
  }

  /**
   * Store a value with optional TTL
   */
  async set(key, value, options = {}) {
    try {
      // Get current keys
      const keys = await this._getAllKeys();
      
      // Store metadata
      const metaData = {
        createdAt: Date.now(),
        lastAccess: Date.now(),
        ttl: options.ttl || null,
      };
      
      await SecureStore.setItemAsync(
        `${key}:meta`, 
        JSON.stringify(metaData)
      );

      // Store the actual value
      const valueToStore = 
        typeof value === 'string' ? value : JSON.stringify(value);

      await SecureStore.setItemAsync(key, valueToStore);

      // Update key tracker if new key
      if (!keys.includes(key)) {
        keys.push(key);
        await this._updateKeys(keys);
      }

      // Update cache size estimate
      this.cacheSize += (key.length + valueToStore.length) * 2;
    } catch (error) {
      console.error('SecureStore set error:', error);
    }
  }

  /**
   * Retrieve a value
   */
  async get(key) {
    try {
      // Get metadata first
      const metaData = await SecureStore.getItemAsync(`${key}:meta`);
      if (!metaData) return null;

      const { createdAt, ttl } = JSON.parse(metaData);
      
      // Check if expired
      if (ttl && Date.now() > createdAt + ttl) {
        await this.remove(key);
        return null;
      }
      
      // Update last access time
      const updatedMeta = {
        ...JSON.parse(metaData),
        lastAccess: Date.now(),
      };
      await SecureStore.setItemAsync(
        `${key}:meta`, 
        JSON.stringify(updatedMeta)
      );
      
      // Get value
      const rawValue = await SecureStore.getItemAsync(key);
      if (!rawValue) return null;
      
      // Try to parse as JSON
      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    } catch (error) {
      console.error('SecureStore get error:', error);
      return null;
    }
  }

  /**
   * Remove a value
   */
  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      await SecureStore.deleteItemAsync(`${key}:meta`);
      
      // Update key tracker
      const keys = await this._getAllKeys();
      const updatedKeys = keys.filter(k => k !== key);
      await this._updateKeys(updatedKeys);
    } catch (error) {
      console.error('SecureStore delete error:', error);
    }
  }

  /**
   * Clear all values with prefix
   */
  async clearByPrefix(prefix) {
    try {
      const keys = await this._getAllKeys();
      const matchingKeys = keys.filter(k => k.startsWith(prefix));
      
      for (const key of matchingKeys) {
        await this.remove(key);
      }
    } catch (error) {
      console.error('SecureStore clearByPrefix error:', error);
    }
  }

  /**
   * Clear all values (SecureStore doesn't have native clearAll)
   */
  async clearAll() {
    try {
      const keys = await this._getAllKeys();
      
      for (const key of keys) {
        await this.remove(key);
      }
      
      // Clear the key tracker itself
      await SecureStore.deleteItemAsync(KEY_TRACKER);
    } catch (error) {
      console.error('SecureStore clearAll error:', error);
    }
  }

  /**
   * Get all keys matching prefix
   */
  async getKeysByPrefix(prefix) {
    try {
      const keys = await this._getAllKeys();
      return keys.filter(key => 
        key.startsWith(prefix) && 
        !key.includes(':meta')
      );
    } catch (error) {
      console.error('SecureStore getKeys error:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new SecureStorage();