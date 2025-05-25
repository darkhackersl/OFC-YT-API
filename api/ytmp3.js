import axios from "axios";

// Browser-like headers for SaveTube API (required for access)
function getBrowserHeaders() {
  return {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-GB,en;q=0.9,si-LK;q=0.8,si;q=0.7,en-US;q=0.6,hi;q=0.5",
    "Origin": "https://ytmp3.at",
    "Referer": "https://ytmp3.at/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "priority": "u=1, i",
    "Content-Type": "application/json"
  };
}

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL parameter ?url=" });
  }

  try {
    // 1. Get CDN
    const cdnRes = await axios.get("https://media.savetube.me/api/random-cdn", {
      headers: getBrowserHeaders()
    });
    const cdn = cdnRes.data?.cdn;
    if (!cdn) throw new Error("Failed to get CDN");

    // 2. Get video info using SaveTube API
    const infoRes = await axios.post(
      `${cdn}/v2/info`,
      { url },
      { headers: getBrowserHeaders() }
    );
    const info = infoRes.data;

    // 3. Find the best available MP3 (audio) format
    let audioObj = null;
    if (Array.isArray(info?.formats)) {
      audioObj =
        info.formats.find(
          f =>
            (f.type === "audio" || (f.mime_type && f.mime_type.includes("audio"))) &&
            (f.quality === "128" || f.quality === "128kbps" || f.quality === "MP3 128kbps")
        ) ||
        info.formats.find(f => f.type === "audio" || (f.mime_type && f.mime_type.includes("audio")));
    }
    if (!audioObj || !audioObj.key) {
      return res.status(404).json({ error: "No MP3 format found", formats: info?.formats });
    }

    // 4. Request download link for MP3
    const downloadRes = await axios.post(
      `${cdn.replace(/\/v2\/info$/, "")}/download`,
      {
        downloadType: "audio",
        quality: audioObj.quality,
        key: audioObj.key
      },
      { headers: getBrowserHeaders() }
    );

    let downloadUrl = null;
    if (typeof downloadRes.data === "object" && downloadRes.data.url) {
      downloadUrl = downloadRes.data.url;
    } else if (typeof downloadRes.data === "string") {
      downloadUrl = downloadRes.data;
    }

    res.json({
      title: info.title,
      thumbnail: info.thumbnail || info.thumb,
      duration: info.duration,
      quality: audioObj.quality,
      download: downloadUrl
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
