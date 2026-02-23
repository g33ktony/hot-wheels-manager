#!/bin/bash

cd /Users/antonio/Documents/personal_projects/hot-wheels-manager/backend

# Start server in background
npm run dev > /tmp/server_test.log 2>&1 &
SERVER_PID=$!
sleep 8

echo "=== 🧪 Testing Change Password Endpoint ==="
echo ""

# Test 1: Login
echo "Test 1: Login with current password..."
LOGIN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"antonio@hotwheels.com","password":"test"}')

TOKEN=$(echo "$LOGIN" | jq -r '.data.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  kill $SERVER_PID
  exit 1
fi

echo ""
echo "Test 2: Try to change with wrong current password..."
RESULT=$(curl -s -X PATCH http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"currentPassword":"wrong","newPassword":"test123"}')
echo "$RESULT" | jq -r '.message'

echo ""
echo "Test 3: Change password correctly..."
RESULT=$(curl -s -X PATCH http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"currentPassword":"test","newPassword":"test123"}')
echo "$RESULT" | jq -r '.message'

echo ""
echo "Test 4: Login with new password..."
LOGIN2=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"antonio@hotwheels.com","password":"test123"}')
SUCCESS=$(echo "$LOGIN2" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Login with new password: SUCCESS"
else
  echo "❌ Login with new password: FAILED"
fi

echo ""
echo "Test 5: Resetting password back to 'test'..."
TOKEN2=$(echo "$LOGIN2" | jq -r '.data.token')
RESULT=$(curl -s -X PATCH http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"currentPassword":"test123","newPassword":"test"}')
echo "$RESULT" | jq -r '.message'

# Cleanup
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
sleep 2

echo ""
echo "✅ All tests completed!"
