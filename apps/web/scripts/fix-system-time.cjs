#!/usr/bin/env node
/**
 * System Time Checker for BigQuery JWT Authentication
 *
 * This script helps diagnose and fix system clock skew issues
 * that cause "invalid_grant: Invalid JWT Signature" errors
 * when connecting to Google Cloud services.
 *
 * Usage:
 *   node apps/web/scripts/fix-system-time.cjs
 *   node apps/web/scripts/fix-system-time.cjs --fix
 */

const { execSync } = require('child_process');

const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + ANSI.reset);
}

function exec(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    return null;
  }
}

function getCurrentTime() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    iso: now.toISOString(),
    timestamp: now.getTime(),
  };
}

function getNtpTime() {
  // Try to get time from NTP server
  const output = exec('sntp -sS time.apple.com 2>&1', true);
  if (output) {
    return output;
  }
  return null;
}

function checkClockSkew() {
  log(ANSI.blue, '═══════════════════════════════════════════════════════════');
  log(ANSI.bold, 'System Time Checker for BigQuery JWT Authentication');
  log(ANSI.blue, '═══════════════════════════════════════════════════════════\n');

  const local = getCurrentTime();
  log(ANSI.yellow, '📅 Current Local System Time:');
  log(ANSI.reset, `   Date: ${local.iso}`);
  log(ANSI.reset, `   Year: ${local.year}`);
  log(ANSI.reset, `   Unix Timestamp: ${local.timestamp}\n`);

  const expectedYear = 2025; // Adjust as needed
  const skew = local.year - expectedYear;

  if (skew > 0) {
    log(ANSI.red, '❌ CLOCK SKEW DETECTED!');
    log(ANSI.red, `   Your system is ${skew} year(s) AHEAD of expected time.`);
    log(ANSI.red, `   Expected year: ${expectedYear}, Actual year: ${local.year}\n`);

    log(ANSI.yellow, '⚠️  This causes Google Cloud to reject JWT authentication with:');
    log(ANSI.yellow, '   "invalid_grant: Invalid JWT Signature" error\n');

    log(ANSI.bold, '🔧 FIX OPTIONS:\n');

    log(ANSI.green, '1. Automatic (requires sudo password):');
    log(ANSI.reset, '   sudo sntp -sS time.apple.com');
    log(ANSI.reset, '   # or');
    log(ANSI.reset, '   sudo ntpdate -u time.apple.com\n');

    log(ANSI.green, '2. Manual (macOS System Settings):');
    log(ANSI.reset, '   System Settings → General → Date & Time');
    log(ANSI.reset, '   Uncheck "Set time automatically", fix date, then re-enable\n');

    log(ANSI.green, '3. Manual (command line):');
    log(ANSI.reset, `   sudo date -u "${new Date().toISOString().replace('T', ' ').split('.')[0]}"\n`);

    return false;
  } else if (skew < 0) {
    log(ANSI.yellow, '⚠️  Your system clock is behind, but this is usually OK.');
    log(ANSI.yellow, `   ${Math.abs(skew)} year(s) behind expected time.\n`);
  } else {
    log(ANSI.green, '✅ System time appears correct!\n');
  }

  return true;
}

function fixSystemTime() {
  log(ANSI.yellow, '\n🔧 Attempting to fix system time...');
  log(ANSI.reset, 'Running: sudo sntp -sS time.apple.com\n');

  try {
    execSync('sudo sntp -sS time.apple.com', { stdio: 'inherit' });
    log(ANSI.green, '\n✅ Time sync completed!');
    log(ANSI.reset, 'Please restart your dev server: pnpm dev\n');
  } catch (error) {
    log(ANSI.red, '\n❌ Failed to sync time. You may need to:');
    log(ANSI.reset, '1. Enter your sudo password when prompted');
    log(ANSI.reset, '2. Use manual fix option 2 or 3 above\n');
  }
}

// Main
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

checkClockSkew();

if (shouldFix) {
  fixSystemTime();
} else {
  log(ANSI.blue, '═══════════════════════════════════════════════════════════');
  log(ANSI.bold, 'To automatically fix time, run:');
  log(ANSI.reset, '  node apps/web/scripts/fix-system-time.cjs --fix');
  log(ANSI.blue, '═══════════════════════════════════════════════════════════\n');
}
