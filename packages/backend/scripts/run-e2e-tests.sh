#!/bin/bash

# E2E Test Runner Script
# This script helps run E2E tests with proper setup

set -e

echo "🧪 OpenData API E2E Test Runner"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase is running
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check Supabase status
echo -e "${YELLOW}📊 Checking Supabase status...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}🚀 Starting Supabase...${NC}"
    supabase start
    sleep 5
fi

# Create .env.test if it doesn't exist
if [ ! -f ".env.test" ]; then
    echo -e "${YELLOW}📝 Creating .env.test from template...${NC}"
    if [ -f ".env.test.example" ]; then
        cp .env.test.example .env.test
        echo -e "${GREEN}✅ Created .env.test - Please update with your Supabase credentials${NC}"
        echo "Run 'supabase status' to get your local credentials"
        exit 1
    else
        echo -e "${RED}❌ .env.test.example not found${NC}"
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env.test" ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
fi

# Create test data directory
mkdir -p test-data/secure

# Run migrations if needed
echo -e "${YELLOW}🔧 Running database migrations...${NC}"
supabase db push

# Clear test data
echo -e "${YELLOW}🧹 Clearing test data...${NC}"
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function clearTestData() {
    try {
        // Delete test users
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUsers = users?.users?.filter(u => u.email?.startsWith('test-')) || [];
        
        for (const user of testUsers) {
            await supabase.auth.admin.deleteUser(user.id);
        }
        
        console.log(\`Cleared \${testUsers.length} test users\`);
    } catch (error) {
        console.error('Error clearing test data:', error.message);
    }
}

clearTestData();
"

# Run E2E tests
echo -e "${YELLOW}🏃 Running E2E tests...${NC}"
echo ""

# Check if specific test file was provided
if [ $# -eq 0 ]; then
    # Run all E2E tests
    npm run test:e2e
else
    # Run specific test file
    npm run test:e2e -- "$@"
fi

# Clean up test data directory
echo ""
echo -e "${YELLOW}🧹 Cleaning up test data...${NC}"
rm -rf test-data

echo -e "${GREEN}✅ E2E tests completed!${NC}"