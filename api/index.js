const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const contentDisposition = require('content-disposition');

const app = express();
app.use(cors());
app.use(express.json());

// Cache for storing video info
const videoInfoCache = new Map();

// Get video info endpoint
app.get('/api/info', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Check cache first
        if (videoInfoCache.has(url)) {
            return res.json(videoInfoCache.get(url));
        }

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;
        const thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url;
        
        // Format duration from seconds to MM:SS
        const durationInSeconds = parseInt(videoDetails.lengthSeconds);
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        const duration = `${minutes}.${seconds.toString().padStart(2, '0')} min`;

        const responseData = {
            title: videoDetails.title,
            thumbnail: thumbnail,
            duration: duration,
            formats: info.formats.filter(f => f.hasAudio || f.hasVideo)
        };

        // Cache the info
        videoInfoCache.set(url, responseData);

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching video info:', error);
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
    try {
        const { url, quality } = req.query;
        
        if (!url || !quality) {
            return res.status(400).json({ error: 'YouTube URL and quality are required' });
        }

        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;
        const title = videoDetails.title.replace(/[^\w\s]/gi, ''); // Sanitize title for filename

        // MP3 download (quality is 128 or 320)
        if (quality === '128' || quality === '320') {
            res.setHeader('Content-Disposition', contentDisposition(`${title}.mp3`));
            
            // Convert to MP3 using ffmpeg
            const audioStream = ytdl(url, { quality: 'highestaudio' });
            ffmpeg(audioStream)
                .audioBitrate(quality === '320' ? 320 : 128)
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    res.status(500).end();
                })
                .pipe(res, { end: true });
        } 
        // MP4 download
        else {
            const format = info.formats.find(f => 
                f.qualityLabel === `${quality}p` && f.hasVideo && f.hasAudio
            ) || info.formats.find(f => 
                f.qualityLabel && f.qualityLabel.includes(quality) && f.hasVideo && f.hasAudio
            );

            if (!format) {
                return res.status(400).json({ error: 'Requested quality not available' });
            }

            res.setHeader('Content-Disposition', contentDisposition(`${title}.mp4`));
            
            // Stream the video directly
            ytdl(url, { format: format })
                .on('error', (err) => {
                    console.error('Download error:', err);
                    res.status(500).end();
                })
                .pipe(res);
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to process download' });
    }
});

// Simple frontend for testing
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>YouTube MP3/MP4 Downloader</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
                input, select, button { padding: 10px; margin: 5px 0; }
                .result { margin-top: 20px; display: none; }
                .thumbnail { max-width: 300px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>YouTube MP3/MP4 Downloader</h1>
                <input type="text" id="url" placeholder="Enter YouTube URL" style="width: 100%;" 
                    value="https://youtu.be/PTaYYOKkEgM?si=pPkIqZrRQmHjSiTF">
                <button onclick="getInfo()">Get Info</button>
                
                <div id="result" class="result">
                    <img id="thumbnail" class="thumbnail">
                    <h3 id="title"></h3>
                    <p id="duration"></p>
                    
                    <select id="quality">
                        <option value="128">MP3 128kbps</option>
                        <option value="320">MP3 320kbps</option>
                        <option value="144">144p</option>
                        <option value="240">240p</option>
                        <option value="360">360p</option>
                        <option value="480">480p</option>
                        <option value="720">720p</option>
                        <option value="1080">1080p</option>
                    </select>
                    <button onclick="download()">Download</button>
                </div>
            </div>
            
            <script>
                async function getInfo() {
                    const url = document.getElementById('url').value;
                    const response = await fetch(\`/api/info?url=\${encodeURIComponent(url)}\`);
                    const data = await response.json();
                    
                    if (data.error) {
                        alert(data.error);
                        return;
                    }
                    
                    document.getElementById('thumbnail').src = data.thumbnail;
                    document.getElementById('title').textContent = data.title;
                    document.getElementById('duration').textContent = data.duration;
                    document.getElementById('result').style.display = 'block';
                }
                
                function download() {
                    const url = document.getElementById('url').value;
                    const quality = document.getElementById('quality').value;
                    window.open(\`/api/download?url=\${encodeURIComponent(url)}&quality=\${quality}\`, '_blank');
                }
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;

