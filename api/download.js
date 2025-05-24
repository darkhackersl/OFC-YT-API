import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const { url, quality } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing YouTube URL' });

  try {
    // Step 1: Load ytmp3 page with the URL
    const searchPage = await fetch(`https://ytmp3.at/api/button/mp3/${encodeURIComponent(url)}`);
    const html = await searchPage.text();

    // Step 2: Parse with JSDOM
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const title = doc.querySelector('h3')?.textContent || 'N/A';
    const duration = doc.querySelector('p')?.textContent || 'N/A';
    const image = doc.querySelector('img')?.src || '';
    const options = [...doc.querySelectorAll('select option')].map(opt => ({
      quality: opt.value,
      label: opt.textContent
    }));

    // Try to get the download URL
    const downloadBtn = doc.querySelector('.download a');
    const downloadUrl = downloadBtn?.href || '';

    res.status(200).json({
      title,
      duration,
      image,
      availableQualities: options,
      selectedQuality: quality || 'default',
      downloadUrl,
      success: true
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch', details: err.message });
  }
}

