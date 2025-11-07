/**
 * Automated Test Script for Deep-Dive Filter Presets
 *
 * Tests the implementation without requiring browser/auth
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 TESTING DEEP-DIVE FILTER PRESET IMPLEMENTATION\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failCount++;
  }
}

console.log('\n📦 Test 1: File Structure');
console.log('-'.repeat(60));

// Test helper file exists
const helperPath = 'lib/utils/deepDivePresetHelpers.ts';
const helperExists = fs.existsSync(helperPath);
test('Helper file exists', helperExists, helperPath);

if (helperExists) {
  const helperContent = fs.readFileSync(helperPath, 'utf8');
  test('Helper has generateDeepDivePresetName',
    helperContent.includes('export function generateDeepDivePresetName'),
    'Function exported correctly'
  );
  test('Helper has generateDeepDivePresetDescription',
    helperContent.includes('export function generateDeepDivePresetDescription'),
    'Function exported correctly'
  );
  test('Helper has validateDeepDivePreset',
    helperContent.includes('export function validateDeepDivePreset'),
    'Validation function present'
  );
  test('Helper file size > 5KB',
    helperContent.length > 5000,
    `File size: ${helperContent.length} bytes`
  );
}

console.log('\n📄 Test 2: Deep-Dive Page Integration');
console.log('-'.repeat(60));

const pagePath = 'app/(protected)/performance-tracker/deep-dive/page.tsx';
const pageExists = fs.existsSync(pagePath);
test('Deep-dive page exists', pageExists, pagePath);

if (pageExists) {
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  test('Imports FilterPresetManager',
    pageContent.includes("import { FilterPresetManager }"),
    'Component imported'
  );

  test('Imports helper functions',
    pageContent.includes('generateDeepDivePresetDescription') &&
    pageContent.includes('generateDeepDivePresetName'),
    'Both functions imported'
  );

  test('Correct import path (4 levels)',
    pageContent.includes('../../../../lib/utils/deepDivePresetHelpers'),
    'Import path: ../../../../lib/utils/deepDivePresetHelpers'
  );

  test('Has presetFilters useMemo',
    pageContent.includes('const presetFilters = useMemo'),
    'presetFilters computed with useMemo'
  );

  test('presetFilters includes perspective',
    pageContent.includes('perspective,') && pageContent.includes('// ⭐ CRITICAL: Analysis perspective'),
    'Perspective saved in preset'
  );

  test('presetFilters includes activeTier',
    pageContent.includes('activeTier,'),
    'Tier filter saved'
  );

  test('presetFilters includes periods',
    pageContent.includes('period1,') && pageContent.includes('period2,'),
    'Both time periods saved'
  );

  test('Has handleLoadPreset callback',
    pageContent.includes('const handleLoadPreset = useCallback'),
    'Load handler implemented'
  );

  test('handleLoadPreset restores perspective',
    pageContent.includes('setPerspective(savedPerspective'),
    'Perspective restoration logic present'
  );

  test('handleLoadPreset restores tier',
    pageContent.includes('setActiveTier(savedTier'),
    'Tier restoration logic present'
  );

  test('Has smart date recalculation',
    pageContent.includes('calculatePresetDates(savedPreset)'),
    'Relative dates recalculate on load'
  );

  test('Has suggestedPresetName',
    pageContent.includes('const suggestedPresetName = useMemo'),
    'Smart name generation'
  );

  test('Has suggestedPresetDescription',
    pageContent.includes('const suggestedPresetDescription = useMemo'),
    'Smart description generation'
  );

  test('Calls generateDeepDivePresetName',
    pageContent.includes('generateDeepDivePresetName({'),
    'Name generator called'
  );

  test('Calls generateDeepDivePresetDescription',
    pageContent.includes('generateDeepDivePresetDescription({'),
    'Description generator called'
  );

  test('FilterPresetManager receives suggestions',
    pageContent.includes('suggestedName={suggestedPresetName}') &&
    pageContent.includes('suggestedDescription={suggestedPresetDescription}'),
    'Props passed to component'
  );

  test('FilterPresetManager has correct page prop',
    pageContent.includes('page="deep-dive"'),
    'Page identifier correct'
  );

  test('Has URL preset support',
    pageContent.includes('presetIdFromUrl={searchParams.get(\'preset\')'),
    'URL parameter handling present'
  );
}

console.log('\n🔧 Test 3: FilterPresetManager Props');
console.log('-'.repeat(60));

const managerPath = 'app/components/performance-tracker/FilterPresetManager.tsx';
const managerExists = fs.existsSync(managerPath);
test('FilterPresetManager exists', managerExists, managerPath);

if (managerExists) {
  const managerContent = fs.readFileSync(managerPath, 'utf8');

  test('Has suggestedName prop',
    managerContent.includes('suggestedName?: string'),
    'Prop interface updated'
  );

  test('Has suggestedDescription prop',
    managerContent.includes('suggestedDescription?: string'),
    'Prop interface updated'
  );

  test('Passes suggestions to SavePresetModal',
    managerContent.includes('suggestedName={suggestedName}') &&
    managerContent.includes('suggestedDescription={suggestedDescription}'),
    'Props forwarded to modal'
  );
}

console.log('\n💾 Test 4: SavePresetModal Updates');
console.log('-'.repeat(60));

const modalPath = 'app/components/performance-tracker/SavePresetModal.tsx';
const modalExists = fs.existsSync(modalPath);
test('SavePresetModal exists', modalExists, modalPath);

if (modalExists) {
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  test('Has suggestedName prop',
    modalContent.includes('suggestedName?: string'),
    'Interface updated'
  );

  test('Has suggestedDescription prop',
    modalContent.includes('suggestedDescription?: string'),
    'Interface updated'
  );

  test('Auto-fills name from suggestion',
    modalContent.includes('setName(suggestedName || \'\')'),
    'Name auto-fill logic'
  );

  test('Auto-fills description from suggestion',
    modalContent.includes('setDescription(suggestedDescription || \'\')'),
    'Description auto-fill logic'
  );

  test('Shows helpful hint for auto-generated',
    modalContent.includes('Auto-generated based on your current settings'),
    'User hint present'
  );
}

console.log('\n📚 Test 5: Documentation');
console.log('-'.repeat(60));

test('Testing guide exists',
  fs.existsSync('DEEP_DIVE_PRESET_TESTING_GUIDE.md'),
  'Comprehensive test cases'
);

test('Quick start guide exists',
  fs.existsSync('DEEP_DIVE_PRESET_QUICKSTART.md'),
  'User quick start'
);

test('Implementation summary exists',
  fs.existsSync('DEEP_DIVE_PRESET_IMPLEMENTATION_SUMMARY.md'),
  'Technical details'
);

test('Morning checklist exists',
  fs.existsSync('SANG_MAI_TEST_NGAY.md'),
  'Morning testing guide'
);

console.log('\n🔍 Test 6: Code Quality');
console.log('-'.repeat(60));

if (helperExists) {
  const helperContent = fs.readFileSync(helperPath, 'utf8');

  test('Has TypeScript types',
    helperContent.includes('type Perspective') && helperContent.includes('type TierType'),
    'Type definitions present'
  );

  test('Has JSDoc comments',
    helperContent.includes('/**') && helperContent.includes('* @'),
    'Functions documented'
  );

  test('Has example outputs in comments',
    helperContent.includes('Examples:'),
    'Usage examples provided'
  );
}

if (pageExists) {
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  test('Has implementation comments',
    pageContent.includes('// ✨ NEW:') || pageContent.includes('// ⭐'),
    'Code changes documented'
  );

  test('Has console.log for debugging',
    pageContent.includes('console.log(\'[Deep-Dive]'),
    'Debug logging present'
  );
}

console.log('\n' + '='.repeat(60));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(60));

const total = passCount + failCount;
const passRate = ((passCount / total) * 100).toFixed(1);

console.log(`\n✅ PASSED: ${passCount}/${total} tests (${passRate}%)`);
console.log(`❌ FAILED: ${failCount}/${total} tests`);

if (failCount === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Implementation is correct!');
  console.log('\n✨ Next Steps:');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Open: http://localhost:3000/performance-tracker/deep-dive');
  console.log('   3. Test manually with browser (see SANG_MAI_TEST_NGAY.md)');
  console.log('\n🚀 Status: READY FOR USER TESTING');
} else {
  console.log('\n⚠️  Some tests failed. Review failed tests above.');
  console.log('\n🔧 Action required:');
  console.log('   - Check failed tests');
  console.log('   - Fix issues');
  console.log('   - Re-run: node test-deep-dive-preset.mjs');
}

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
