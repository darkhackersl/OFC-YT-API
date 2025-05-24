const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto('https://ytmp3.at/', { waitUntil: 'networkidle2' });

    // Type the YouTube URL
    await page.type('input[type="search"]', url);
    await page.keyboard.press('Enter');

    // Wait for data to load
    await page.waitForSelector('h3', { timeout: 20000 });

    // Extract details
    const data = await page.evaluate(() => {
      const title = document.querySelector('h3')?.innerText;
      const duration = document.querySelector('p.text-left.text-gray-100')?.innerText;
      const img = document.querySelector('img[alt="image"]')?.src;
      const selectOptions = Array.from(document.querySelectorAll('#quality option')).map(o => ({
        value: o.value,
        label: o.textContent
      }));
      return { title, duration, img, qualities: selectOptions };
    });

    await browser.close();
    res.status(200).json({ success: true, ...data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
