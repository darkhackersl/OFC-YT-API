import axios from "axios";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL parameter ?url=" });
  }

  try {
    // 1. Get CDN
    const cdnRes = await axios.get("https://media.savetube.me/api/random-cdn");
    const cdn = cdnRes.data?.cdn;
    if (!cdn) throw new Error("Failed to get CDN");

    // 2. Get video info and available formats
    const infoRes = await axios.post(
      `${cdn}/v2/info`,
      { url },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://ytmp3.at/"
        }
      }
    );
    const info = infoRes.data;

    // Find the MP3 128k format (or the first audio format)
    let audioObj = null;
    if (Array.isArray(info?.formats)) {
      audioObj = info.formats.find(
        f =>
          (f.type === "audio" || f.mime_type?.includes("audio")) &&
          (f.quality === "128" || f.quality === "128kbps" || f.quality === "MP3 128kbps")
      ) || info.formats.find(f => f.type === "audio" || f.mime_type?.includes("audio"));
    }
    if (!audioObj || !audioObj.key) {
      return res.status(404).json({ error: "No MP3 format found", formats: info?.formats });
    }

    // 3. Request download link
    const downloadRes = await axios.post(
      `${cdn}/download`,
      {
        downloadType: "audio",
        quality: audioObj.quality,
        key: audioObj.key
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "*/*",
          "Referer": "https://ytmp3.at/"
        }
      }
    );

    let downloadUrl = null;
    if (typeof downloadRes.data === "object" && downloadRes.data.url) {
      downloadUrl = downloadRes.data.url;
    } else if (typeof downloadRes.data === "string") {
      // Sometimes the raw URL is returned as base64 or plain string
      downloadUrl = downloadRes.data;
    }

    res.json({
      title: info.title,
      thumbnail: info.thumbnail || info.thumb,
      duration: info.duration,
      quality: audioObj.quality,
      download: downloadUrl,
      key: audioObj.key,
      info: info // For debugging, remove in prod
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch or parse SaveTube API",
      detail: e.message,
      response: e.response?.data,
      status: e.response?.status
    });
  }
}
