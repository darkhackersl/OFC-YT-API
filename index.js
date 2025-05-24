const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.get('/api/ytmp3', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await axios.get(`https://ytmp3.at/api/v1/convert?url=${url}`);
    const $ = cheerio.load(response.data);
    const videoDetails = {
      title: $('h3.text-left.mt-2.text-white.font-[500].text-[16px].sm:text-[22px]').text(),
      image: $('img').attr('src'),
      duration: $('p.text-left.text-gray-100').text(),
    };

    const qualities = [];
    $('select#quality option').each((index, element) => {
      qualities.push({ value: $(element).val(), text: $(element).text() });
    });

    res.json({ videoDetails, qualities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

app.get('/api/ytmp3/download', async (req, res) => {
  const url = req.query.url;
  const quality = req.query.quality;
  const type = req.query.type; // add type parameter (mp3 or mp4)
  if (!url || !quality || !type) {
    return res.status(400).json({ error: 'URL, quality, and type are required' });
  }

  try {
    const response = await axios.get(`https://ytmp3.at/api/v1/convert?url=${url}&quality=${quality}`);
    const $ = cheerio.load(response.data);
    let downloadLink;
    if (type === 'mp3') {
      downloadLink = $('a.download.btn.text-left.w-40.bg-green-600.hover:bg-green-500.border-green-500[href*=".mp3"]').attr('href');
    } else if (type === 'mp4') {
      downloadLink = $('a.download.btn.text-left.w-40.bg-green-600.hover:bg-green-500.border-green-500[href*=".mp4"]').attr('href');
    } else {
      return res.status(400).json({ error: 'Invalid type. Only mp3 and mp4 are supported.' });
    }

    res.json({ downloadLink });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
