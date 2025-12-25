/**
 * Backtest Helper Utilities
 *
 * Utility functions for forecast backtesting
 */

const { formatTable, formatSectionHeader, formatKeyValue, formatPercentage, formatNumber } = require('./tableFormatter.cjs');

/**
 * Align forecast and actual data by period
 * Returns array of matched pairs
 */
function alignByPeriod(forecasts, actuals) {
  const pairs = [];

  for (const forecast of forecasts) {
    const actual = actuals.find(a => a.period === forecast.period);
    if (actual) {
      pairs.push({
        period: forecast.period,
        forecast: forecast,
        actual: actual
      });
    }
  }

  return pairs;
}

/**
 * Calculate WAPE (Weighted Absolute Percentage Error)
 */
function calculateWAPE(forecasts, actuals) {
  if (forecasts.length === 0 || forecasts.length !== actuals.length) {
    return null;
  }

  const totalAbsError = forecasts.reduce((sum, f, i) =>
    sum + Math.abs(actuals[i] - f), 0);

  const totalActual = actuals.reduce((sum, a) =>
    sum + Math.abs(a), 0);

  if (totalActual === 0) return null;

  return (totalAbsError / totalActual) * 100;
}

/**
 * Calculate MAE (Mean Absolute Error)
 */
function calculateMAE(forecasts, actuals) {
  if (forecasts.length === 0 || forecasts.length !== actuals.length) {
    return null;
  }

  const absErrors = forecasts.map((f, i) => Math.abs(actuals[i] - f));
  return absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
}

/**
 * Calculate RMSE (Root Mean Squared Error)
 */
function calculateRMSE(forecasts, actuals) {
  if (forecasts.length === 0 || forecasts.length !== actuals.length) {
    return null;
  }

  const squaredErrors = forecasts.map((f, i) => Math.pow(actuals[i] - f, 2));
  const mse = squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length;
  return Math.sqrt(mse);
}

/**
 * Calculate Bias (average forecast - actual)
 */
function calculateBias(forecasts, actuals) {
  if (forecasts.length === 0 || forecasts.length !== actuals.length) {
    return null;
  }

  const errors = forecasts.map((f, i) => f - actuals[i]);
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}

/**
 * Calculate accuracy metrics for a metric
 */
function calculateAccuracyMetrics(pairs, metricName) {
  if (pairs.length === 0) {
    return {
      wape: null,
      mae: null,
      rmse: null,
      bias: null,
      sampleSize: 0
    };
  }

  const forecasts = pairs.map(p => p.forecast[metricName]);
  const actuals = pairs.map(p => p.actual[metricName]);

  return {
    wape: calculateWAPE(forecasts, actuals),
    mae: calculateMAE(forecasts, actuals),
    rmse: calculateRMSE(forecasts, actuals),
    bias: calculateBias(forecasts, actuals),
    sampleSize: pairs.length
  };
}

/**
 * Evaluate scenario calibration
 * Checks if Conservative is truly P10, Base is P50, Optimistic is P90
 */
function evaluateScenarioCalibration(scenarios, actuals, metric) {
  const results = [];

  const expectedPercentiles = {
    conservative: 10,
    base: 50,
    optimistic: 90
  };

  for (const [scenarioName, expectedPercentile] of Object.entries(expectedPercentiles)) {
    const scenarioForecast = scenarios[scenarioName];
    const pairs = alignByPeriod(scenarioForecast, actuals);

    if (pairs.length === 0) {
      continue;
    }

    const belowForecast = pairs.filter(p =>
      p.actual[metric] < p.forecast[metric]
    ).length;

    const actualPercentile = (belowForecast / pairs.length) * 100;
    const calibrationError = Math.abs(actualPercentile - expectedPercentile);

    results.push({
      scenario: scenarioName,
      expectedPercentile: expectedPercentile,
      actualPercentile: actualPercentile,
      calibrationError: calibrationError,
      isWellCalibrated: calibrationError < 15
    });
  }

  return results;
}

/**
 * Aggregate results from multiple backtest periods
 */
function aggregateResults(periodResults) {
  if (periodResults.length === 0) {
    return {
      accuracy: {},
      calibration: [],
      testPeriodsCount: 0
    };
  }

  // Aggregate accuracy by metric
  const metrics = ['ecpm', 'requests', 'revenue', 'fill_rate'];
  const aggregatedAccuracy = {};

  for (const metric of metrics) {
    const allWAPEs = [];
    const allMAEs = [];
    const allRMSEs = [];
    const allBiases = [];
    let totalSamples = 0;

    for (const result of periodResults) {
      if (result.accuracy[metric]) {
        const acc = result.accuracy[metric];
        if (acc.wape !== null) allWAPEs.push(acc.wape);
        if (acc.mae !== null) allMAEs.push(acc.mae);
        if (acc.rmse !== null) allRMSEs.push(acc.rmse);
        if (acc.bias !== null) allBiases.push(acc.bias);
        totalSamples += acc.sampleSize;
      }
    }

    aggregatedAccuracy[metric] = {
      wape: allWAPEs.length > 0 ? average(allWAPEs) : null,
      mae: allMAEs.length > 0 ? average(allMAEs) : null,
      rmse: allRMSEs.length > 0 ? average(allRMSEs) : null,
      bias: allBiases.length > 0 ? average(allBiases) : null,
      sampleSize: totalSamples
    };
  }

  // Aggregate calibration
  const aggregatedCalibration = [];
  const scenarios = ['conservative', 'base', 'optimistic'];

  for (const scenario of scenarios) {
    const calibrations = periodResults
      .flatMap(r => r.calibration)
      .filter(c => c.scenario === scenario);

    if (calibrations.length > 0) {
      aggregatedCalibration.push({
        scenario: scenario,
        expectedPercentile: calibrations[0].expectedPercentile,
        actualPercentile: average(calibrations.map(c => c.actualPercentile)),
        calibrationError: average(calibrations.map(c => c.calibrationError)),
        isWellCalibrated: average(calibrations.map(c => c.calibrationError)) < 15
      });
    }
  }

  return {
    accuracy: aggregatedAccuracy,
    calibration: aggregatedCalibration,
    testPeriodsCount: periodResults.length
  };
}

/**
 * Calculate average
 */
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Print case study report to console
 */
function printCaseStudyReport(caseStudy, aggregate, periodResults) {
  console.log('\n' + '='.repeat(80));
  console.log(`CASE STUDY: ${caseStudy.name}`);
  console.log('='.repeat(80));
  console.log(`Filter: ${JSON.stringify(caseStudy.filters) || 'None (entire portfolio)'}`);
  console.log(`Test Periods: ${aggregate.testPeriodsCount}`);
  console.log(`Total Data Points: ${Object.values(aggregate.accuracy).reduce((sum, acc) => sum + acc.sampleSize, 0)}`);

  console.log(formatSectionHeader('ACCURACY SUMMARY'));

  // Print accuracy for each metric
  const metrics = [
    { key: 'revenue', label: 'Revenue', unit: '$' },
    { key: 'ecpm', label: 'eCPM', unit: '$' },
    { key: 'requests', label: 'Requests', unit: '' },
    { key: 'fill_rate', label: 'Fill Rate', unit: '%' }
  ];

  for (const { key, label, unit } of metrics) {
    const acc = aggregate.accuracy[key];
    if (!acc || acc.wape === null) {
      console.log(`\n${label}: No data available`);
      continue;
    }

    console.log(`\n${label}:`);
    console.log(`  WAPE:  ${formatPercentage(acc.wape)}`);
    console.log(`  MAE:   ${unit}${formatNumber(acc.mae, key === 'ecpm' ? 2 : 0)}`);
    console.log(`  RMSE:  ${unit}${formatNumber(acc.rmse, key === 'ecpm' ? 2 : 0)}`);
    console.log(`  Bias:  ${formatBias(acc.bias, unit)}`);
  }

  console.log(formatSectionHeader('SCENARIO CALIBRATION'));

  for (const cal of aggregate.calibration) {
    const status = cal.isWellCalibrated ? '✓ Well calibrated' : '⚠ Needs calibration';
    console.log(`${capitalize(cal.scenario)} (P${cal.expectedPercentile}): Expected ${cal.expectedPercentile}%, Actual ${cal.actualPercentile.toFixed(1)}% ${status}`);
  }

  console.log('\n✓ Saved to database: kg_backtest_runs');
  console.log('='.repeat(80));
}

/**
 * Print comparative summary across all case studies
 */
function printComparativeSummary(allResults) {
  console.log('\n' + '='.repeat(80));
  console.log('COMPARATIVE SUMMARY - ALL CASE STUDIES');
  console.log('='.repeat(80));

  // Revenue Accuracy Table
  console.log(formatSectionHeader('Revenue Forecast Accuracy (WAPE)'));

  const revenueRows = allResults.map(r => ({
    'Case Study': r.caseStudy.name,
    'WAPE': r.aggregate.accuracy.revenue?.wape ? `${r.aggregate.accuracy.revenue.wape.toFixed(1)}%` : 'N/A',
    'Rating': getRating(r.aggregate.accuracy.revenue?.wape)
  }));

  console.log(formatTable(revenueRows, [
    { key: 'Case Study', header: 'Case Study', width: 30, align: 'left' },
    { key: 'WAPE', header: 'WAPE', width: 10, align: 'right' },
    { key: 'Rating', header: 'Rating', width: 12, align: 'left' }
  ]));

  // eCPM Accuracy Table
  console.log(formatSectionHeader('eCPM Forecast Accuracy (WAPE)'));

  const ecpmRows = allResults.map(r => ({
    'Case Study': r.caseStudy.name,
    'WAPE': r.aggregate.accuracy.ecpm?.wape ? `${r.aggregate.accuracy.ecpm.wape.toFixed(1)}%` : 'N/A',
    'Rating': getRating(r.aggregate.accuracy.ecpm?.wape)
  }));

  console.log(formatTable(ecpmRows, [
    { key: 'Case Study', header: 'Case Study', width: 30, align: 'left' },
    { key: 'WAPE', header: 'WAPE', width: 10, align: 'right' },
    { key: 'Rating', header: 'Rating', width: 12, align: 'left' }
  ]));

  // Key Insights
  console.log(formatSectionHeader('KEY INSIGHTS'));

  const avgWAPE = average(allResults.map(r => r.aggregate.accuracy.revenue?.wape || 0).filter(w => w > 0));
  const bestCase = allResults.reduce((best, r) =>
    (r.aggregate.accuracy.revenue?.wape || Infinity) < (best.aggregate.accuracy.revenue?.wape || Infinity) ? r : best
  );
  const worstCase = allResults.reduce((worst, r) =>
    (r.aggregate.accuracy.revenue?.wape || 0) > (worst.aggregate.accuracy.revenue?.wape || 0) ? r : worst
  );

  console.log(`✓ Average WAPE across all segments: ${avgWAPE.toFixed(1)}%`);
  console.log(`✓ Best performing segment: ${bestCase.caseStudy.name} (${bestCase.aggregate.accuracy.revenue?.wape?.toFixed(1)}% WAPE)`);
  console.log(`⚠ Highest variance segment: ${worstCase.caseStudy.name} (${worstCase.aggregate.accuracy.revenue?.wape?.toFixed(1)}% WAPE)`);

  console.log('\nAll results saved to database for trend monitoring.');
  console.log('='.repeat(80));
}

/**
 * Get rating for WAPE value
 */
function getRating(wape) {
  if (wape === null || wape === undefined) return 'N/A';

  if (wape < 10) return '✓ Excellent';
  if (wape < 15) return '✓ Good';
  if (wape < 25) return '⚠ Acceptable';
  return '✗ Poor';
}

/**
 * Format bias value
 */
function formatBias(bias, unit = '') {
  if (bias === null || bias === undefined) return 'N/A';

  const direction = bias > 0 ? 'over-forecasting' : 'under-forecasting';
  const sign = bias > 0 ? '+' : '';
  return `${sign}${unit}${formatNumber(Math.abs(bias), 2)} (${direction})`;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  alignByPeriod,
  calculateWAPE,
  calculateMAE,
  calculateRMSE,
  calculateBias,
  calculateAccuracyMetrics,
  evaluateScenarioCalibration,
  aggregateResults,
  printCaseStudyReport,
  printComparativeSummary,
  average
};
