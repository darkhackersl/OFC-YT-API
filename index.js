const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/download', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl || !videoUrl.includes('tiktok.com')) {
        return res.status(400).json({ error: 'Invalid TikTok URL' });
    }

    try {
        const formData = new URLSearchParams();
        formData.append('id', videoUrl);
        formData.append('locale', 'en');
        
        const response = await axios.post('https://ssstik.io/abc', formData, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0'
            }
        });

        const $ = cheerio.load(response.data);
        const links = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text();
            if (href && text.includes('Download')) {
                links.push({ label: text, url: href });
            }
        });

        if (links.length === 0) throw new Error('No download links found');

        res.json({ original: videoUrl, downloadLinks: links });

    } catch (err) {
        res.status(500).json({ error: 'Failed to get download link', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
