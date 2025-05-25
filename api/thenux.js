import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export default async function handler(req, res) {
  const { url, format = "bestaudio[ext=mp3]/bestaudio/best" } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL (?url=...)" });

  try {
    // yt-dlp must be installed on your server/VPS (not supported on Vercel/Lambda)
    // Command: yt-dlp -j --no-warnings -f FORMAT --no-playlist "URL"
    const { stdout } = await execAsync(
      `yt-dlp -j --no-warnings -f "${format}" --no-playlist "${url}"`
    );
    const info = JSON.parse(stdout);

    // Extract best audio/mp3/video URL
    let download = null;
    if (info.url) download = info.url;
    else if (info.formats && info.formats[0] && info.formats[0].url) download = info.formats[0].url;

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      webpage_url: info.webpage_url,
      ext: info.ext,
      format: info.format,
      download
    });
  } catch (e) {
    res.status(500).json({
      error: "yt-dlp failed",
      detail: e.message,
      stderr: e.stderr
    });
  }
}
