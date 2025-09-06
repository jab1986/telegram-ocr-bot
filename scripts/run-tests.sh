#!/bin/bash

# Comprehensive Test Execution Script
# Runs all test suites with proper configuration and reporting

set -e  # Exit on any error

# Configuration
NODE_ENV=test
TEST_TIMEOUT=30000
COVERAGE_THRESHOLD=80

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check Node.js version
    node_version=$(node --version)
    log "Node.js version: $node_version"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm ci
    fi
    
    success "Dependencies checked"
}

# Function to run linting
run_linting() {
    log "Running code linting..."
    
    if npm run lint > /dev/null 2>&1; then
        success "Linting passed"
    else
        warning "Linting issues found. Running with --fix..."
        npm run lint:fix || true
        
        # Run again to check if issues are fixed
        if npm run lint > /dev/null 2>&1; then
            success "Linting issues fixed"
        else
            error "Linting issues remain - please fix manually"
            return 1
        fi
    fi
}

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local npm_script=$2
    local timeout=${3:-$TEST_TIMEOUT}
    
    log "Running $suite_name tests..."
    
    start_time=$(date +%s)
    
    if timeout $((timeout / 1000))s npm run $npm_script; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        success "$suite_name tests passed (${duration}s)"
        return 0
    else
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        error "$suite_name tests failed (${duration}s)"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    local results_file="test-results.json"
    local report_file="test-report.md"
    
    log "Generating test report..."
    
    cat > "$report_file" << EOF
# Test Execution Report

**Date**: $(date)
**Environment**: $NODE_ENV
**Node Version**: $(node --version)
**Test Timeout**: ${TEST_TIMEOUT}ms

## Test Results Summary

EOF

    # Add individual test results
    for suite in "${test_results[@]}"; do
        IFS='|' read -r name status duration <<< "$suite"
        if [ "$status" = "PASSED" ]; then
            echo "- ✅ **$name**: PASSED (${duration}s)" >> "$report_file"
        else
            echo "- ❌ **$name**: FAILED (${duration}s)" >> "$report_file"
        fi
    done
    
    echo "" >> "$report_file"
    echo "## Coverage Summary" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ -f "coverage/coverage-summary.json" ]; then
        echo "Coverage data available in \`coverage/coverage-summary.json\`" >> "$report_file"
    else
        echo "No coverage data available" >> "$report_file"
    fi
    
    success "Test report generated: $report_file"
}

# Function to check coverage thresholds
check_coverage() {
    if [ ! -f "coverage/coverage-summary.json" ]; then
        warning "No coverage data found"
        return 0
    fi
    
    log "Checking coverage thresholds..."
    
    # Extract coverage percentages (simplified)
    if command -v jq &> /dev/null; then
        total_coverage=$(jq -r '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
        
        if (( $(echo "$total_coverage >= $COVERAGE_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
            success "Coverage threshold met: ${total_coverage}% >= ${COVERAGE_THRESHOLD}%"
        else
            warning "Coverage below threshold: ${total_coverage}% < ${COVERAGE_THRESHOLD}%"
        fi
    else
        warning "jq not installed - cannot parse coverage data"
    fi
}

# Main execution function
main() {
    log "Starting comprehensive test execution..."
    
    # Array to store test results
    declare -a test_results=()
    
    # Set environment variables
    export NODE_ENV=$NODE_ENV
    export TEST_TIMEOUT=$TEST_TIMEOUT
    
    # Check dependencies
    check_dependencies
    
    # Run linting
    if run_linting; then
        test_results+=("Linting|PASSED|0")
    else
        test_results+=("Linting|FAILED|0")
    fi
    
    # Create directories for test artifacts
    mkdir -p coverage logs screenshots
    
    # Run test suites
    local overall_success=true
    
    # Unit tests
    if run_test_suite "Unit" "test:unit" 15000; then
        test_results+=("Unit Tests|PASSED|$(date +%s)")
    else
        test_results+=("Unit Tests|FAILED|$(date +%s)")
        overall_success=false
    fi
    
    # Integration tests
    if run_test_suite "Integration" "test:integration" 30000; then
        test_results+=("Integration Tests|PASSED|$(date +%s)")
    else
        test_results+=("Integration Tests|FAILED|$(date +%s)")
        overall_success=false
    fi
    
    # Performance tests
    if run_test_suite "Performance" "test:performance" 20000; then
        test_results+=("Performance Tests|PASSED|$(date +%s)")
    else
        test_results+=("Performance Tests|FAILED|$(date +%s)")
        # Performance tests failure is not critical
    fi
    
    # Security tests
    if run_test_suite "Security" "test:security" 15000; then
        test_results+=("Security Tests|PASSED|$(date +%s)")
    else
        test_results+=("Security Tests|FAILED|$(date +%s)")
        overall_success=false
    fi
    
    # End-to-end tests
    if run_test_suite "E2E" "test:e2e" 45000; then
        test_results+=("E2E Tests|PASSED|$(date +%s)")
    else
        test_results+=("E2E Tests|FAILED|$(date +%s)")
        overall_success=false
    fi
    
    # Generate coverage report
    log "Generating coverage report..."
    npm run test:coverage > /dev/null 2>&1 || warning "Coverage generation failed"
    
    # Check coverage thresholds
    check_coverage
    
    # Generate final report
    generate_report
    
    # Final status
    echo ""
    log "Test execution completed"
    
    if [ "$overall_success" = true ]; then
        success "All critical tests passed!"
        echo ""
        echo "🎉 Ready for deployment!"
        exit 0
    else
        error "Some critical tests failed!"
        echo ""
        echo "Please review the failures and fix issues before proceeding."
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "unit")
        export NODE_ENV=$NODE_ENV
        run_test_suite "Unit" "test:unit"
        ;;
    "integration")
        export NODE_ENV=$NODE_ENV
        run_test_suite "Integration" "test:integration"
        ;;
    "performance")
        export NODE_ENV=$NODE_ENV
        run_test_suite "Performance" "test:performance"
        ;;
    "security")
        export NODE_ENV=$NODE_ENV
        run_test_suite "Security" "test:security"
        ;;
    "e2e")
        export NODE_ENV=$NODE_ENV
        run_test_suite "E2E" "test:e2e"
        ;;
    "coverage")
        export NODE_ENV=$NODE_ENV
        npm run test:coverage
        check_coverage
        ;;
    "lint")
        run_linting
        ;;
    "all"|*)
        main
        ;;
esac