#!/bin/bash

# Autonomous refactoring script for analytics pages
# This script will run multiple iterations to handle token limits

echo "=== Starting autonomous analytics refactoring ==="
echo "Pages to refactor: Business Health, Profit Projections, New Sales, Daily Ops Publisher"
echo ""

# Run 5 iterations to handle token limits
for i in {1..5}; do
  echo "=== Iteration $i of 5 ==="
  echo "Starting at: $(date)"

  claude --continue "continue with the refactoring task" \
    --dangerously-skip-permissions \
    --max-turns 50 \
    --output-format json > "refactor-log-$i.json"

  exit_code=$?
  echo "Exit code: $exit_code"

  # Check if successful
  if [ $exit_code -eq 0 ]; then
    echo "Iteration $i completed successfully"
  else
    echo "Warning: Iteration $i had exit code $exit_code"
  fi

  echo "Completed at: $(date)"
  echo ""

  # Small delay between iterations
  sleep 5
done

echo "=== All iterations complete! ==="
echo "Check the following files for results:"
echo "  - refactor-log-1.json through refactor-log-5.json"
echo ""
echo "Next steps for morning:"
echo "  1. Review the refactor-log-*.json files"
echo "  2. Check git status to see what changed"
echo "  3. Run 'npm run build' to verify everything works"
echo "  4. Test the refactored pages in browser"
