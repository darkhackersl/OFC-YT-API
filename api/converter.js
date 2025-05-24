const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');

const app = express();
app.use(cors());

module.exports = app;

app.get('/', async (req, res) => {
  try {
    const url = req.query.url;
    const type = req.query.type || 'mp3';
    const quality = req.query.quality || 'highest';

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = ytdl.getURLVideoID(url);
    const info = await ytdl.getInfo(url);

    res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.${type}"`);

    if (type === 'mp3') {
      // Audio conversion
      const audioStream = ytdl(url, { quality: 'highestaudio' });
      const ffmpegCommand = ffmpeg(audioStream)
        .audioBitrate(quality === 'highest' ? 320 : parseInt(quality))
        .format('mp3')
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          res.status(500).end();
        });

      ffmpegCommand.pipe(res, { end: true });
    } else {
      // Video download
      const videoFormat = ytdl.chooseFormat(info.formats, {
        quality: quality === 'highest' ? 'highestvideo' : quality + 'p',
        filter: 'videoandaudio'
      });

      if (!videoFormat) {
        return res.status(400).json({ error: 'Requested quality not available' });
      }

      ytdl(url, { format: videoFormat })
        .on('error', (err) => {
          console.error('YTDL error:', err);
          res.status(500).end();
        })
        .pipe(res);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Conversion failed' });
  }
});
