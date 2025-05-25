import axios from "axios";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL parameter ?url=" });
  }

  try {
    // 1. Get CDN
    const cdnRes = await axios.get("https://media.savetube.me/api/random-cdn");
    const cdn = cdnRes.data?.cdn || "https://cdn306.savetube.su";

    // 2. Get video info
    const infoRes = await axios.post(
      `${cdn}/v2/info`,
      { url },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      }
    );

    const data = infoRes.data;
    if (!data || !data.title) {
      return res.status(500).json({ error: "Failed to retrieve video info", raw: data });
    }

    // Gather audio and video download links
    // Depending on the API response format, adjust as needed
    const mp3 = [];
    const mp4 = [];
    if (Array.isArray(data?.formats)) {
      for (const f of data.formats) {
        if (f.type === "audio" || f.mime_type?.includes("audio")) {
          mp3.push({
            label: f.quality || f.qualityLabel || f.mime_type,
            url: f.url || f.download
          });
        }
        if (f.type === "video" || f.mime_type?.includes("video")) {
          mp4.push({
            label: f.quality || f.qualityLabel || f.mime_type,
            url: f.url || f.download
          });
        }
      }
    }

    res.json({
      title: data.title,
      duration: data.duration,
      thumbnail: data.thumbnail || data.thumb || "",
      audio: mp3,
      video: mp4
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch or parse savetube API",
      detail: e.message,
      response: e.response?.data,
      status: e.response?.status
    });
  }
}
