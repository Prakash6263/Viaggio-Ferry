/**
 * Utility function to generate temporary passwords for users
 */

const crypto = require("crypto")

/**
 * Generate a random temporary password
 * Format: 2 uppercase + 2 lowercase + 2 numbers + 2 special characters
 * Ensures password meets common security requirements
 *
 * @returns {string} A secure temporary password
 */
const generateTemporaryPassword = () => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "!@#$%^&*"

  // Generate at least 1 character from each required set
  const chars = []
  chars.push(uppercase[Math.floor(Math.random() * uppercase.length)])
  chars.push(uppercase[Math.floor(Math.random() * uppercase.length)])
  chars.push(lowercase[Math.floor(Math.random() * lowercase.length)])
  chars.push(lowercase[Math.floor(Math.random() * lowercase.length)])
  chars.push(numbers[Math.floor(Math.random() * numbers.length)])
  chars.push(numbers[Math.floor(Math.random() * numbers.length)])
  chars.push(special[Math.floor(Math.random() * special.length)])
  chars.push(special[Math.floor(Math.random() * special.length)])

  // Shuffle the array
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join("")
}

module.exports = {
  generateTemporaryPassword,
}
