const { google } = require('googleapis');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function test() {
    console.log("Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log("Spreadsheet ID:", process.env.GOOGLE_SHEETS_SPREADSHEET_ID);

    try {
        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        console.log("Calling sheets API...");
        const res = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID });
        console.log('SUCCESS, connected to:', res.data.properties.title);
    } catch (e) {
        console.error('ERROR CONNECTING:', e.message);
    }
}

test();
