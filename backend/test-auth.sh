#!/bin/bash

echo "🧪 Testing Authentication API"
echo "=============================="
echo ""

# Test registration
echo "1️⃣ Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "displayName": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq .

# Extract tokens
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken')

# Test login
echo -e "\n2️⃣ Testing user login..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }' | jq .

# Test health endpoint
echo -e "\n3️⃣ Testing health endpoint..."
curl -s http://localhost:3001/health | jq .

echo -e "\n✅ Authentication tests complete!"
