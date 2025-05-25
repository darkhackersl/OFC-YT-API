import axios from "axios";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL (?url=...)" });

  try {
    // 1. Get video info from yt1s.com
    const infoRes = await axios.post(
      "https://yt1s.com/api/ajaxSearch/index",
      new URLSearchParams({ q: url, vt: "home" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Origin": "https://yt1s.com",
          "Referer": "https://yt1s.com/en279",
          "User-Agent": "Mozilla/5.0"
        }
      }
    );
    const info = infoRes.data;

    if (!info.vid || !info.links || !info.links.mp3 || !info.links.mp3["128"]) {
      return res.status(400).json({ error: "Failed to extract video info or MP3 link", info });
    }

    // 2. Convert to MP3 (128kbps)
    const convRes = await axios.post(
      "https://yt1s.com/api/ajaxConvert/convert",
      new URLSearchParams({
        vid: info.vid,
        k: info.links.mp3["128"].k
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Origin": "https://yt1s.com",
          "Referer": "https://yt1s.com/en279",
          "User-Agent": "Mozilla/5.0"
        }
      }
    );
    const conv = convRes.data;

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.time,
      mp3: {
        quality: "128kbps",
        download: conv.dlink
      }
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch from yt1s.com",
      detail: e.message,
      response: e.response?.data
    });
  }
}
