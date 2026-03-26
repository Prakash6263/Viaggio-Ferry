/**
 * MongoDB Error Handler Utility
 * Converts raw MongoDB errors to user-friendly messages
 */

/**
 * Check if error is MongoDB duplicate key error (E11000)
 * @param {Error} err - MongoDB error object
 * @returns {Boolean}
 */
const isDuplicateKeyError = (err) => {
  return err.code === 11000 || err.code === 11001
}

/**
 * Extract duplicate field names from MongoDB error (handles composite keys)
 * @param {Error} err - MongoDB error object
 * @returns {Array} - Array of field names that constitute the duplicate
 */
const getDuplicateFields = (err) => {
  if (!err.keyPattern) return ["unknown"]
  
  const fields = Object.keys(err.keyPattern)
  return fields.length > 0 ? fields : ["unknown"]
}

/**
 * Get duplicate key values from error
 * @param {Error} err - MongoDB error object
 * @returns {Object} - Object with field names and their duplicate values
 */
const getDuplicateKeyValues = (err) => {
  if (!err.keyValue) return {}
  
  // Convert ObjectIds to strings for display
  const values = {}
  for (const [key, value] of Object.entries(err.keyValue)) {
    values[key] = value && value.toString ? value.toString() : value
  }
  
  return values
}

/**
 * Create user-friendly field names mapping
 * @param {Array} fields - Technical field names
 * @returns {String} - Human readable field combination
 */
const formatFieldNames = (fields) => {
  const fieldMap = {
    priceList: "Price List",
    passengerType: "Passenger Type",
    ticketType: "Ticket Type",
    cabin: "Cabin",
    originPort: "Origin Port",
    destinationPort: "Destination Port",
    visaType: "Visa Type",
    taxBase: "Tax Base",
    currency: "Currency",
    name: "Name",
    email: "Email",
    code: "Code",
  }

  const humanNames = fields.map(f => fieldMap[f] || f)
  
  if (humanNames.length === 1) {
    return humanNames[0]
  } else if (humanNames.length === 2) {
    return `${humanNames[0]} and ${humanNames[1]}`
  } else {
    return humanNames.slice(0, -1).join(", ") + ", and " + humanNames[humanNames.length - 1]
  }
}

/**
 * Get user-friendly message for duplicate key error
 * @param {Error} err - MongoDB error object
 * @param {String} entityName - Name of entity (e.g., "Price Detail", "Partner")
 * @returns {Object} - { status, message, fields }
 */
const handleDuplicateKeyError = (err, entityName = "Record") => {
  const fields = getDuplicateFields(err)
  const fieldNames = formatFieldNames(fields)

  let message = ""
  if (fields.length === 1) {
    message = `A ${entityName} with this ${fieldNames} already exists.`
  } else {
    message = `A ${entityName} with this combination of ${fieldNames} already exists.`
  }

  return {
    status: 409, // Conflict
    code: "DUPLICATE_KEY_ERROR",
    message: message,
    details: {
      duplicateFields: fields,
      suggestion: `Please use different values for ${fieldNames.toLowerCase()} or modify the existing ${entityName.toLowerCase()}.`,
    },
  }
}

/**
 * Validate MongoDB error and return formatted response
 * @param {Error} err - Error object
 * @param {String} entityName - Name of entity for user message
 * @returns {Object|null} - Formatted error object or null if not a duplicate key error
 */
const formatMongoDBError = (err, entityName = "Record") => {
  if (isDuplicateKeyError(err)) {
    return handleDuplicateKeyError(err, entityName)
  }
  
  return null
}

module.exports = {
  isDuplicateKeyError,
  getDuplicateFields,
  getDuplicateKeyValues,
  formatFieldNames,
  handleDuplicateKeyError,
  formatMongoDBError,
}
