const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// TikTok Search Scraper
app.get('/search', async (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).send({ error: "Missing 'q' parameter" });

    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(`https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`, {
            waitUntil: 'networkidle2',
        });

        const data = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('div[data-e2e="search-video-item"]');
            items.forEach(item => {
                const video = {
                    title: item.querySelector('h3')?.innerText || '',
                    videoUrl: item.querySelector('a')?.href,
                    thumbnail: item.querySelector('img')?.src,
                };
                results.push(video);
            });
            return results;
        });

        await browser.close();
        res.json({ keyword, results: data });
    } catch (err) {
        res.status(500).send({ error: "Scraping failed", details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`TikTok API running at http://localhost:${PORT}`);
});
