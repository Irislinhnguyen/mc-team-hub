# Scripts Directory

This directory contains active utility scripts for data synchronization, analysis, and maintenance tasks.

---

## Active Scripts

### Pipeline/Data Sync

**Production sync scripts:**
- `sync-all-pipelines-auto.cjs` - Auto sync pipelines from Google Sheets
- `sync-all-pipelines-now.cjs` - Manual sync trigger for all pipelines
- `import-pipeline-from-sheets.cjs` - Import pipeline data from Google Sheets
- `backfill-pipelines-to-sheets.cjs` - Backfill pipeline data to sheets
- `retry-failed-pipelines.cjs` - Retry failed sync operations

### Analysis & Reporting

**Netlink inventory analysis:**
- `analyze-netlink-missing-domains.ts` - Compare netlink inventory and identify missing domains
- `compare-netlink-inventory.ts` - Full inventory comparison between systems
- `simple-inventory-compare.cjs` - Quick comparison tool for inventories

### Cache Management

**Metadata caching:**
- `seed-publisher-cache.cjs` - Seed publisher metadata cache for performance
- `clear-pipeline-impact-cache.cjs` - Clear pipeline impact calculation cache

### Utilities

**Data validation:**
- `check-pub-data-latest.cjs` - Verify latest publisher data is available
- `check-pipeline-status.cjs` - Check pipeline sync status and health
- `check-sheet-headers.cjs` - Validate Google Sheets headers match schema
- `find-missing-from-inventory.cjs` - Find items missing from inventory

### Setup/Migration

**Database setup:**
- `create-pipeline-statuses-table.cjs` - Initialize pipeline status lookup table

---

## Usage Guidelines

### Running Scripts

Most scripts can be run directly with Node.js:

```bash
# For .cjs files
node scripts/script-name.cjs

# For .ts files
npx tsx scripts/script-name.ts
```

### Environment Requirements

Scripts typically require:
- `.env` file with proper configuration (see `.env.example`)
- `service-account.json` for Google Sheets/BigQuery access (local development)
- Supabase credentials for database operations

### Common Patterns

**Sync scripts** typically:
1. Fetch data from Google Sheets
2. Transform/validate the data
3. Upsert to Supabase database
4. Log results and errors

**Analysis scripts** typically:
1. Query multiple data sources
2. Compare and identify discrepancies
3. Generate reports or CSV outputs

**Cache scripts** typically:
1. Seed or clear cached metadata
2. Improve query performance
3. Reduce API calls to external services

---

## Development Notes

### Adding New Scripts

When adding a new production script:
1. Use descriptive names (e.g., `sync-xyz.cjs`, `check-abc.cjs`)
2. Add JSDoc comments at the top explaining purpose
3. Include error handling and logging
4. Update this README with the script description

### One-time Scripts

For debugging, testing, or one-time data migrations:
- Use the pattern `test-*.cjs` or `debug-*.cjs`
- These are NOT tracked in git (see `.gitignore`)
- Document significant findings in relevant markdown files

### Archived Scripts

Many test and debug scripts were removed during cleanup (2026-01):
- ~180+ test/debug scripts removed
- Available in git history if needed: `git log --all -- scripts/`
- Backup branch: `backup/before-cleanup`

---

## Security Notes

⚠️ **Never commit sensitive data:**
- Service account files (`.json`)
- API keys or credentials
- Real customer data

✅ **Best practices:**
- Use environment variables for secrets
- Test with sample data when possible
- Add sensitive patterns to `.gitignore`

---

## Troubleshooting

### Common Issues

**Script can't find service account:**
```bash
# Ensure service-account.json exists in root
ls service-account.json

# Or set GOOGLE_APPLICATION_CREDENTIALS_JSON in .env
```

**Supabase connection errors:**
```bash
# Check .env has correct credentials
grep SUPABASE .env

# Verify you're using the right project URL
```

**Google Sheets quota exceeded:**
- Scripts use exponential backoff by default
- Consider batching requests
- Check quota at: https://console.cloud.google.com/apis/dashboard

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review pipeline sync logs for failures
- Check cache freshness with `check-pub-data-latest.cjs`
- Validate sheet headers match schema

**Monthly:**
- Compare netlink inventory
- Review and archive old logs
- Update dependencies if needed

### Monitoring

Key metrics to watch:
- Pipeline sync success rate
- Cache hit/miss ratios
- API quota usage
- Database query performance

---

## Related Documentation

- **Setup Guide**: See `SETUP_CHECKLIST.md` for initial setup
- **Architecture**: See `docs/` folder for system architecture
- **API Documentation**: See `EMAIL_SETUP_GUIDE.md` for API patterns

---

## Support

For questions or issues:
1. Check script comments and error messages
2. Review related documentation
3. Check git history for recent changes
4. Contact the development team

---

*Last updated: 2026-01*
*Scripts count: ~15 active production scripts*
