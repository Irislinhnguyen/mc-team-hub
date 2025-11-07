#!/bin/bash

# Test Template Scenarios
# Uses the new /api/test/templates endpoint

API_URL="http://localhost:3002/api/test/templates"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo "═══════════════════════════════════════════════════════════════"
echo "Testing Analytics Templates - 5 Real Sales Scenarios"
echo "═══════════════════════════════════════════════════════════════"
echo ""

test_scenario() {
  local num=$1
  local name=$2
  local template_id=$3
  local params=$4

  echo -e "${YELLOW}[Scenario $num]${RESET} $name"
  echo "Template: $template_id"

  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"templateId\": \"$template_id\", \"params\": $params}")

  # Check if successful
  if echo "$response" | grep -q '"status":"success"'; then
    row_count=$(echo "$response" | grep -o '"rowCount":[0-9]*' | head -1 | cut -d':' -f2)
    exec_time=$(echo "$response" | grep -o '"executionTimeMs":[0-9]*' | head -1 | cut -d':' -f2)

    echo -e "${GREEN}✅ SUCCESS${RESET}"
    echo "   Rows: $row_count | Time: ${exec_time}ms"

    # Show sample data
    echo "   Sample data:"
    echo "$response" | grep -o '"sampleData":\[[^]]*\]' | head -c 200
    echo ""
  else
    error=$(echo "$response" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${RED}❌ FAILED${RESET}"
    echo "   Error: $error"
  fi
  echo ""
}

# Run 5 scenarios
test_scenario 1 "Daily vs 30-Day Average" "team_daily_vs_30d" \
  '{"team":"All Teams","metric":"revenue","drill_down":"none"}'

test_scenario 2 "Top 20 Publishers" "top_publishers_by_metric" \
  '{"metric":"revenue","limit":"20","period":"this month"}'

test_scenario 3 "Churn Risk Detection" "churn_risk_detector" \
  '{"risk_threshold":"50","min_historical_revenue":"5000"}'

test_scenario 4 "Ad Format Trending" "adformat_growth_decline" \
  '{"metric":"revenue","compare_to":"last month"}'

test_scenario 5 "Team Performance" "team_prediction_breakdown" \
  '{"metric":"revenue","days_back":"30"}'

echo "═══════════════════════════════════════════════════════════════"
echo "Test execution completed!"
echo "═══════════════════════════════════════════════════════════════"
