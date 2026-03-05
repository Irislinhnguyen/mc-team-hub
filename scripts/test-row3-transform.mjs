// Test transformer logic for row 3
function transformRow_CS(row, userId) {
  const COLUMN_MAPPING_CS = {
    0: { field: 'key', type: 'string', required: true },
    1: { field: 'classification', type: 'string' },
    2: { field: 'poc', type: 'string', required: true },
    3: { field: 'team', type: 'string' },
    4: { field: 'ma_mi', type: 'string' },
    5: { field: 'pid', type: 'string' },
    6: { field: 'publisher', type: 'string', required: true },
    7: { field: 'mid', type: 'string' },
    8: { field: 'domain', type: 'string' },
    9: { field: 'zid', type: 'string' }
  };

  const pipeline = { user_id: userId };

  // Apply column mappings
  for (const [colIndex, config] of Object.entries(COLUMN_MAPPING_CS)) {
    const value = row[parseInt(colIndex)];
    const fieldName = config.field;

    pipeline[fieldName] = value ? value.toString().trim() : null;
  }

  // Fallback logic
  if (!pipeline.publisher || pipeline.publisher.trim() === '') {
    console.log('  → Publisher empty, using domain fallback');
    pipeline.publisher = pipeline.domain || 'Unknown Publisher';
  }

  if (!pipeline.poc || pipeline.poc.trim() === '') {
    pipeline.poc = 'Unknown';
  }

  return pipeline;
}

// Row 3 data from SEA_CS
const row3 = [
  'New Unit (Slot exists)212830teachmelife.netPropose to activate Video bannerVideo / Wipe',
  'New Unit (Slot exists)',
  'ngantt',
  '',
  '',
  '35929',
  '',  // Publisher EMPTY
  '212830',
  'teachmelife.net',
  'testing to see'
];

console.log('================================================================================');
console.log('TESTING TRANSFORMER FOR ROW 3 (SEA_CS)');
console.log('================================================================================\n');

const pipeline = transformRow_CS(row3, 'test-user');

console.log('Transformed Pipeline:');
console.log('  Key:        "' + pipeline.key + '"');
console.log('  Publisher:  "' + pipeline.publisher + '"');
console.log('  Domain:     "' + pipeline.domain + '"');
console.log('  ZID:        "' + pipeline.zid + '"');
console.log('  POC:        "' + pipeline.poc + '"');
console.log('');
console.log('✅ Transformer should create this pipeline!');
console.log('   Expected in database: publisher="teachmelife.net", zid="testing to see"');
