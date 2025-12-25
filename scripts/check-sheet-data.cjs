const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1dSG654pi7dMkguMj637etfJ_ipT38Do7tdcDLb-p3mg',
    range: 'SEA_Sales!A1:E10',
    valueRenderOption: 'UNFORMATTED_VALUE'
  })

  console.log('First 10 rows (columns A-E) from SEA_Sales:')
  console.log('='.repeat(80))
  res.data.values.forEach((row, i) => {
    console.log(`Row ${i+1}:`, JSON.stringify(row))
  })
}

main().catch(console.error)
