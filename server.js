const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const axios = require('axios');
const SerpApi = require('google-search-results-nodejs');


dotenv.config();
const app = express();
const port = 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.json());

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const { GoogleSearch } = require('google-search-results-nodejs');
const search = new GoogleSearch(process.env.SERPAPI_KEY);

app.post('/search', async (req, res) => {
  const { name } = req.body;

  try {
    // Search Google for LinkedIn profiles
    const params = {
      q: `${name} site:linkedin.com/in/ -inurl:(signup | login)`,
      location: 'United States',
    };

    const searchResults = await new Promise((resolve, reject) => {
      search.json(params, (data) => {
        if (data.error) reject(data.error);
        else resolve(data);
      });
    });

    const profiles = searchResults.organic_results.map(result => ({
      title: result.title,
      link: result.link,
    }));

    // Step 6: AI Agent (basic parsing for now)
    const processedData = profiles.map(profile => {
      return {
        name: profile.title.split('|')[0].trim(),
        linkedin_url: profile.link,
      };
    });

    // Step 7: Append to Google Sheets
    const values = processedData.map(data => [data.name, data.linkedin_url]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:B',
      valueInputOption: 'RAW',
      resource: { values },
    });

    res.json({ message: `Found ${processedData.length} profiles. Data appended to Google Sheet!` });
  } catch (error) {
    res.status(500).json({ message: 'Error: ' + error.message });
  }
});