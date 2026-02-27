#!/bin/bash

# Viaggio Ferry - Trip API - cURL Examples
# Use these commands to test the Trip API directly from the command line

# ============================================================
# SETUP - Set these variables before running the commands
# ============================================================

# Your API base URL
BASE_URL="http://localhost:5000/api"

# Your JWT authentication token
TOKEN="your_jwt_token_here"

# IDs from your database (update these)
SHIP_ID="507f1f77bcf86cd799439012"
DEPARTURE_PORT_ID="507f1f77bcf86cd799439013"
ARRIVAL_PORT_ID="507f1f77bcf86cd799439014"
PROMOTION_ID="507f1f77bcf86cd799439015"
TRIP_ID="507f1f77bcf86cd799439011"

# ============================================================
# 1. LIST TRIPS - Basic
# ============================================================
# Get all trips with default pagination (page 1, limit 10)

curl -X GET "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 2. LIST TRIPS - With Pagination
# ============================================================
# Get page 2 with 5 trips per page

curl -X GET "${BASE_URL}/trips?page=2&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 3. LIST TRIPS - Search by Trip Name
# ============================================================
# Search for trips containing "Dubai"

curl -X GET "${BASE_URL}/trips?search=Dubai" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 4. LIST TRIPS - Filter by Status
# ============================================================
# Get all OPEN trips

curl -X GET "${BASE_URL}/trips?status=OPEN" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 5. LIST TRIPS - Complex Filtering
# ============================================================
# Get SCHEDULED trips from a specific ship and departure port

curl -X GET "${BASE_URL}/trips?status=SCHEDULED&ship=${SHIP_ID}&departurePort=${DEPARTURE_PORT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 6. GET TRIP DETAILS
# ============================================================
# Get full details of a specific trip

curl -X GET "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 7. GET TRIP AVAILABILITY
# ============================================================
# Check remaining seats/spots for passengers, cargo, vehicles

curl -X GET "${BASE_URL}/trips/${TRIP_ID}/availability" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# 8. CREATE TRIP - Minimal
# ============================================================
# Create a trip with only required fields

curl -X POST "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Dubai to Muscat",
    "tripCode": "DXB-MSC-002",
    "ship": "'${SHIP_ID}'",
    "departurePort": "'${DEPARTURE_PORT_ID}'",
    "arrivalPort": "'${ARRIVAL_PORT_ID}'",
    "departureDateTime": "2024-03-20T10:00:00Z",
    "arrivalDateTime": "2024-03-20T14:30:00Z"
  }'

echo -e "\n\n"

# ============================================================
# 9. CREATE TRIP - Full Details with Booking Windows
# ============================================================
# Create a trip with all optional fields

curl -X POST "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Dubai to Muscat Express",
    "tripCode": "DXB-MSC-EXPRESS-001",
    "ship": "'${SHIP_ID}'",
    "departurePort": "'${DEPARTURE_PORT_ID}'",
    "arrivalPort": "'${ARRIVAL_PORT_ID}'",
    "departureDateTime": "2024-03-25T10:00:00Z",
    "arrivalDateTime": "2024-03-25T14:30:00Z",
    "status": "SCHEDULED",
    "bookingOpeningDate": "2024-02-25T00:00:00Z",
    "bookingClosingDate": "2024-03-25T08:00:00Z",
    "checkInOpeningDate": "2024-03-25T07:00:00Z",
    "checkInClosingDate": "2024-03-25T09:30:00Z",
    "boardingClosingDate": "2024-03-25T09:45:00Z",
    "promotion": "'${PROMOTION_ID}'",
    "remarks": "Peak season trip - expect full capacity"
  }'

echo -e "\n\n"

# ============================================================
# 10. UPDATE TRIP - Change Status
# ============================================================
# Update trip status from SCHEDULED to OPEN

curl -X PUT "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "OPEN"
  }'

echo -e "\n\n"

# ============================================================
# 11. UPDATE TRIP - Change Multiple Fields
# ============================================================
# Update trip name, status, and remarks

curl -X PUT "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Dubai to Muscat Express - Updated",
    "status": "OPEN",
    "remarks": "Updated with revised capacity information"
  }'

echo -e "\n\n"

# ============================================================
# 12. UPDATE TRIP - Change Booking Window
# ============================================================
# Update booking dates

curl -X PUT "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingClosingDate": "2024-03-25T10:00:00Z",
    "checkInClosingDate": "2024-03-25T10:00:00Z"
  }'

echo -e "\n\n"

# ============================================================
# 13. UPDATE TRIP - Close Bookings
# ============================================================
# Update trip status to CLOSED

curl -X PUT "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLOSED"
  }'

echo -e "\n\n"

# ============================================================
# 14. UPDATE TRIP - Mark Complete
# ============================================================
# Update trip status to COMPLETED

curl -X PUT "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'

echo -e "\n\n"

# ============================================================
# 15. DELETE TRIP - Soft Delete
# ============================================================
# Delete (soft delete) a trip

curl -X DELETE "${BASE_URL}/trips/${TRIP_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# ERROR TESTING - Invalid Trip Code (Duplicate)
# ============================================================
# Try to create a trip with a duplicate code (should fail)

curl -X POST "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Duplicate Test",
    "tripCode": "DXB-MSC-002",
    "ship": "'${SHIP_ID}'",
    "departurePort": "'${DEPARTURE_PORT_ID}'",
    "arrivalPort": "'${ARRIVAL_PORT_ID}'",
    "departureDateTime": "2024-03-30T10:00:00Z",
    "arrivalDateTime": "2024-03-30T14:30:00Z"
  }'

echo -e "\n\n"

# ============================================================
# ERROR TESTING - Invalid Dates
# ============================================================
# Try to create a trip with arrival before departure (should fail)

curl -X POST "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Invalid Date Test",
    "tripCode": "DXB-MSC-INVALID",
    "ship": "'${SHIP_ID}'",
    "departurePort": "'${DEPARTURE_PORT_ID}'",
    "arrivalPort": "'${ARRIVAL_PORT_ID}'",
    "departureDateTime": "2024-03-30T14:30:00Z",
    "arrivalDateTime": "2024-03-30T10:00:00Z"
  }'

echo -e "\n\n"

# ============================================================
# ERROR TESTING - Invalid Ship ID
# ============================================================
# Try to create a trip with non-existent ship (should fail)

curl -X POST "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Invalid Ship Test",
    "tripCode": "DXB-MSC-INVALID-SHIP",
    "ship": "000000000000000000000000",
    "departurePort": "'${DEPARTURE_PORT_ID}'",
    "arrivalPort": "'${ARRIVAL_PORT_ID}'",
    "departureDateTime": "2024-03-30T10:00:00Z",
    "arrivalDateTime": "2024-03-30T14:30:00Z"
  }'

echo -e "\n\n"

# ============================================================
# ERROR TESTING - Invalid Authorization Token
# ============================================================
# Try to access with invalid token (should fail)

curl -X GET "${BASE_URL}/trips" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================================
# ADDITIONAL EXAMPLES
# ============================================================

# Save response to file
curl -X GET "${BASE_URL}/trips?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -o trips_list.json

# Pretty print JSON response (with jq installed)
curl -s -X GET "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

# Get only trip names (with jq installed)
curl -s -X GET "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.data.trips[] | {tripName, tripCode, status}'

# Count total trips
curl -s -X GET "${BASE_URL}/trips" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.data.pagination.total'

# ============================================================
# NOTES
# ============================================================
# 1. Update TOKEN, SHIP_ID, and other IDs with actual values
# 2. Date format: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
# 3. All responses include success, message, and data fields
# 4. Pagination max limit is 100
# 5. Deleted trips are soft deleted (not permanently removed)
# 6. All operations are company-isolated (multi-tenancy)
# ============================================================
