import axios from "axios";
import { load } from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL (?url=...)" });

  // Extract YouTube video ID
  const match = url.match(/(?:v=|\/be\/|youtu.be\/)([A-Za-z0-9_-]{11})/);
  if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });
  const videoId = match[1];

  try {
    // Fetch MP3 download options
    const { data: mp3Html } = await axios.get(`https://yt-download.org/api/button/mp3/${videoId}`);
    const $mp3 = load(mp3Html);
    const mp3 = [];
    $mp3("a").each((i, el) => {
      mp3.push({ quality: $mp3(el).text(), url: $mp3(el).attr("href") });
    });

    // Fetch MP4 download options
    const { data: mp4Html } = await axios.get(`https://yt-download.org/api/button/videos/${videoId}`);
    const $mp4 = load(mp4Html);
    const mp4 = [];
    $mp4("a").each((i, el) => {
      mp4.push({ quality: $mp4(el).text(), url: $mp4(el).attr("href") });
    });

    res.json({
      videoId,
      mp3,
      mp4
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch from yt-download.org",
      detail: e.message
    });
  }
}
