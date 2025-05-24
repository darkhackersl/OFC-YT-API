const express = require('express');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const cors = require('cors');

const app = express();
app.use(cors());

module.exports = app;

app.get('/', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = ytdl.getURLVideoID(url);
    const info = await ytdl.getInfo(url);
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');

    const response = {
      title: info.videoDetails.title,
      duration: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
      thumbnail: thumbnail,
      audioFormats: audioFormats.map(format => ({
        itag: format.itag,
        quality: format.audioBitrate ? `${format.audioBitrate}kbps` : 'unknown',
        container: format.container
      })),
      videoFormats: videoFormats.map(format => ({
        itag: format.itag,
        quality: format.qualityLabel || 'unknown',
        container: format.container
      }))
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}.${remainingSeconds < 10 ? '0' : ''}${remainingSeconds} min`;
}
