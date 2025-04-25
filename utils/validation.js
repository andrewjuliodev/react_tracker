/**
 * Utility functions for validating data inputs
 * Provides input validation rules, data type checking, value range validation, and schema validation
 */

// Standard validation patterns
export const VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME: /^[a-zA-Z0-9\s\-'\.]{2,50}$/,
    PASSWORD: /^.{8,}$/,
    NUMERIC: /^[0-9]+$/,
    ALPHA_NUMERIC: /^[a-zA-Z0-9]+$/,
    URL: /^(http|https):\/\/[^ "]+$/,
    DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
    TIME_24H: /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/
  };
  
  // Supported data types
  export const DATA_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    OBJECT: 'object',
    ARRAY: 'array',
    DATE: 'date',
    NULL: 'null',
    UNDEFINED: 'undefined'
  };
  
  // Error message templates
  export const VALIDATION_ERRORS = {
    REQUIRED: 'This field is required',
    TYPE: 'Invalid data type',
    FORMAT: 'Invalid format',
    MIN_LENGTH: 'Input is too short',
    MAX_LENGTH: 'Input is too long',
    MIN_VALUE: 'Value is too small',
    MAX_VALUE: 'Value is too large',
    PATTERN: 'Input does not match the required pattern',
    EMAIL: 'Invalid email address',
    DATE: 'Invalid date format',
    SCHEMA: 'Object does not match schema'
  };
  
  /**
   * Validates string value
   * @param {string} value - String to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  export function validateString(value, options = {}) {
    const {
      required = false,
      minLength,
      maxLength,
      pattern,
      trim = true
    } = options;
  
    // Create result object
    const result = {
      valid: true,
      errors: []
    };
  
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (required) {
        result.valid = false;
        result.errors.push(VALIDATION_ERRORS.REQUIRED);
      }
      return result;
    }
  
    // Check type
    if (typeof value !== 'string') {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.TYPE);
      return result;
    }
  
    // Apply trimming if needed
    const processedValue = trim ? value.trim() : value;
  
    // Check for empty if required
    if (required && processedValue === '') {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.REQUIRED);
      return result;
    }
  
    // Skip further validation if empty and not required
    if (processedValue === '' && !required) {
      return result;
    }
  
    // Check min length
    if (minLength !== undefined && processedValue.length < minLength) {
      result.valid = false;
      result.errors.push(`${VALIDATION_ERRORS.MIN_LENGTH} (min: ${minLength})`);
    }
  
    // Check max length
    if (maxLength !== undefined && processedValue.length > maxLength) {
      result.valid = false;
      result.errors.push(`${VALIDATION_ERRORS.MAX_LENGTH} (max: ${maxLength})`);
    }
  
    // Check pattern
    if (pattern !== undefined) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!regex.test(processedValue)) {
        result.valid = false;
        result.errors.push(VALIDATION_ERRORS.PATTERN);
      }
    }
  
    return result;
  }
  
  /**
   * Validates numeric value
   * @param {number} value - Number to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  export function validateNumeric(value, options = {}) {
    const {
      required = false,
      min,
      max,
      integer = false
    } = options;
  
    // Create result object
    const result = {
      valid: true,
      errors: []
    };
  
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (required) {
        result.valid = false;
        result.errors.push(VALIDATION_ERRORS.REQUIRED);
      }
      return result;
    }
  
    // Convert string to number if needed
    let numValue = value;
    if (typeof value === 'string') {
      numValue = parseFloat(value);
    }
  
    // Check type
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.TYPE);
      return result;
    }
  
    // Check if integer required
    if (integer && !Number.isInteger(numValue)) {
      result.valid = false;
      result.errors.push('Value must be an integer');
    }
  
    // Check min value
    if (min !== undefined && numValue < min) {
      result.valid = false;
      result.errors.push(`${VALIDATION_ERRORS.MIN_VALUE} (min: ${min})`);
    }
  
    // Check max value
    if (max !== undefined && numValue > max) {
      result.valid = false;
      result.errors.push(`${VALIDATION_ERRORS.MAX_VALUE} (max: ${max})`);
    }
  
    return result;
  }
  
  /**
   * Validates object against schema
   * @param {Object} data - Object to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  export function validateObject(data, schema) {
    // Create result object
    const result = {
      valid: true,
      errors: [],
      fieldErrors: {}
    };
  
    // Handle null/undefined
    if (data === null || data === undefined) {
      if (schema.required) {
        result.valid = false;
        result.errors.push(VALIDATION_ERRORS.REQUIRED);
      }
      return result;
    }
  
    // Check type
    if (typeof data !== 'object' || Array.isArray(data)) {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.TYPE);
      return result;
    }
  
    // Validate each field against schema
    Object.keys(schema.properties || {}).forEach(field => {
      const fieldSchema = schema.properties[field];
      const fieldValue = data[field];
  
      // Check if required
      if (fieldSchema.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        result.valid = false;
        if (!result.fieldErrors[field]) {
          result.fieldErrors[field] = [];
        }
        result.fieldErrors[field].push(VALIDATION_ERRORS.REQUIRED);
      }
  
      // Skip validation if field is undefined/null and not required
      if ((fieldValue === undefined || fieldValue === null) && !fieldSchema.required) {
        return;
      }
  
      // Validate by type
      if (fieldValue !== undefined && fieldValue !== null) {
        let fieldResult;
  
        switch (fieldSchema.type) {
          case DATA_TYPES.STRING:
            fieldResult = validateString(fieldValue, fieldSchema);
            break;
          case DATA_TYPES.NUMBER:
            fieldResult = validateNumeric(fieldValue, fieldSchema);
            break;
          case DATA_TYPES.OBJECT:
            if (fieldSchema.properties) {
              fieldResult = validateObject(fieldValue, fieldSchema);
            } else {
              fieldResult = { valid: typeof fieldValue === 'object' && !Array.isArray(fieldValue), errors: [] };
            }
            break;
          case DATA_TYPES.ARRAY:
            fieldResult = validateArray(fieldValue, fieldSchema);
            break;
          case DATA_TYPES.DATE:
            fieldResult = validateDate(fieldValue);
            break;
          case DATA_TYPES.BOOLEAN:
            fieldResult = { valid: typeof fieldValue === 'boolean', errors: [] };
            break;
          default:
            fieldResult = { valid: true, errors: [] };
        }
  
        // Add field errors
        if (!fieldResult.valid) {
          result.valid = false;
          result.fieldErrors[field] = fieldResult.errors;
        }
      }
    });
  
    // Extra fields check (if strict validation enabled)
    if (process.env.STRICT_VALIDATION === 'true' && schema.additionalProperties === false) {
      const schemaFields = Object.keys(schema.properties || {});
      const extraFields = Object.keys(data).filter(field => !schemaFields.includes(field));
  
      if (extraFields.length > 0) {
        result.valid = false;
        result.errors.push(`Object contains extra fields: ${extraFields.join(', ')}`);
      }
    }
  
    return result;
  }
  
  /**
   * Validates array
   * @param {Array} data - Array to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  export function validateArray(data, schema) {
    const result = {
      valid: true,
      errors: []
    };
  
    // Handle null/undefined
    if (data === null || data === undefined) {
      if (schema.required) {
        result.valid = false;
        result.errors.push(VALIDATION_ERRORS.REQUIRED);
      }
      return result;
    }
  
    // Check type
    if (!Array.isArray(data)) {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.TYPE);
      return result;
    }
  
    // Check min items
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      result.valid = false;
      result.errors.push(`Array must contain at least ${schema.minItems} items`);
    }
  
    // Check max items
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      result.valid = false;
      result.errors.push(`Array cannot contain more than ${schema.maxItems} items`);
    }
  
    // Validate items if schema.items is provided
    if (schema.items && data.length > 0) {
      data.forEach((item, index) => {
        let itemResult;
  
        switch (schema.items.type) {
          case DATA_TYPES.STRING:
            itemResult = validateString(item, schema.items);
            break;
          case DATA_TYPES.NUMBER:
            itemResult = validateNumeric(item, schema.items);
            break;
          case DATA_TYPES.OBJECT:
            if (schema.items.properties) {
              itemResult = validateObject(item, schema.items);
            } else {
              itemResult = { valid: typeof item === 'object' && !Array.isArray(item), errors: [] };
            }
            break;
          case DATA_TYPES.ARRAY:
            itemResult = validateArray(item, schema.items);
            break;
          case DATA_TYPES.DATE:
            itemResult = validateDate(item);
            break;
          case DATA_TYPES.BOOLEAN:
            itemResult = { valid: typeof item === 'boolean', errors: [] };
            break;
          default:
            itemResult = { valid: true, errors: [] };
        }
  
        // Add item errors
        if (!itemResult.valid) {
          result.valid = false;
          result.errors.push(`Item at index ${index} is invalid: ${itemResult.errors.join(', ')}`);
        }
      });
    }
  
    return result;
  }
  
  /**
   * Sanitizes string input
   * @param {string} value - String to sanitize
   * @returns {string} Sanitized string
   */
  export function sanitizeString(value) {
    if (value === null || value === undefined) {
      return '';
    }
  
    if (typeof value !== 'string') {
      return String(value);
    }
  
    // Trim whitespace
    let sanitized = value.trim();
  
    // Replace HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  
    return sanitized;
  }
  
  /**
   * Validates email address
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  export function validateEmail(email) {
    if (!email) return false;
    return VALIDATION_RULES.EMAIL.test(String(email).toLowerCase());
  }
  
  /**
   * Validates date value
   * @param {string|number|Date} date - Date to validate
   * @returns {Object} Validation result
   */
  export function validateDate(date) {
    const result = {
      valid: true,
      errors: []
    };
  
    // Handle null/undefined
    if (date === null || date === undefined) {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.REQUIRED);
      return result;
    }
  
    let dateObj;
  
    // Convert to Date object
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Try parsing from ISO string
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      // Assume timestamp
      dateObj = new Date(date);
    } else {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.TYPE);
      return result;
    }
  
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      result.valid = false;
      result.errors.push(VALIDATION_ERRORS.DATE);
    }
  
    return result;
  }
  
  export default {
    validateString,
    validateNumeric,
    validateObject,
    validateArray,
    sanitizeString,
    validateEmail,
    validateDate,
    VALIDATION_RULES,
    DATA_TYPES,
    VALIDATION_ERRORS
  };