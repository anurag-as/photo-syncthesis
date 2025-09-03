#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}          Running All Unit Tests            ${NC}"
echo -e "${YELLOW}============================================${NC}"

# Record start time
START_TIME=$(date +%s)

# Run Jest tests with coverage
echo -e "\n${YELLOW}Running Jest tests with coverage...${NC}"
npm run test:coverage

# Capture the exit code
TEST_EXIT_CODE=$?

# Run linting
echo -e "\n${YELLOW}Running ESLint...${NC}"
npm run lint

# Capture the lint exit code
LINT_EXIT_CODE=$?

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
MINUTES=$((EXECUTION_TIME / 60))
SECONDS=$((EXECUTION_TIME % 60))

# Print execution time
echo -e "\n${YELLOW}============================================${NC}"
echo -e "${YELLOW}          Test Execution Summary           ${NC}"
echo -e "${YELLOW}============================================${NC}"

echo -e "Execution time: ${MINUTES}m ${SECONDS}s"

# Print result summary
if [ $TEST_EXIT_CODE -eq 0 ] && [ $LINT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests and linting passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Tests or linting failed!${NC}"

    if [ $TEST_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}  - Jest tests failed with exit code: ${TEST_EXIT_CODE}${NC}"
    fi

    if [ $LINT_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}  - ESLint failed with exit code: ${LINT_EXIT_CODE}${NC}"
    fi

    exit 1
fi
