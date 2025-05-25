import axios from "axios";
import { load } from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL (?url=...)" });

  try {
    // Step 1: Fetch SaveFrom main page to get cookies & initial params (simulate browser)
    const mainPage = await axios.get("https://en.savefrom.net/1-youtube-video-downloader-4/");
    const cookies = mainPage.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";

    // Step 2: Call SaveFrom AJAX endpoint (undocumented, subject to change!)
    const resp = await axios.post(
      "https://worker.sf-tools.com/savefrom.php",
      new URLSearchParams({
        sf_url: url,
        sf_submit: "",
        new: 2,
        lang: "en",
        app: "",
        country: "us",
        os: "Windows",
        browser: "Chrome"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Cookie": cookies,
          "Origin": "https://en.savefrom.net",
          "Referer": "https://en.savefrom.net/1-youtube-video-downloader-4/",
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    // Step 3: Parse response for download links and meta
    const html = resp.data;
    const $ = load(html);
    const result = [];

    $("a.link-download").each((i, el) => {
      const quality = $(el).find(".title").text().trim() || "unknown";
      const type = $(el).find(".format").text().trim();
      const downloadUrl = $(el).attr("href");
      if (downloadUrl) {
        result.push({ quality, type, url: downloadUrl });
      }
    });

    // Prefer lowest quality
    const lowQuality = result[result.length - 1] || result[0];

    // Extract meta: title, thumbnail, duration (if present)
    const title = $(".info-box .title").text().trim() ||
                  $("meta[property='og:title']").attr("content") ||
                  "";
    const thumbnail = $(".info-box img").attr("src") ||
                      $("meta[property='og:image']").attr("content") ||
                      "";
    let duration = "";
    // Sometimes duration is within the .info-box or nearby
    $(".info-box .duration, .info-box .length").each((i, el) => {
      const text = $(el).text().trim();
      if (text && !duration) duration = text;
    });

    if (!lowQuality) {
      return res.status(404).json({ error: "No download links found", debug: html });
    }

    res.json({
      video: url,
      title,
      thumbnail,
      duration,
      lowQuality
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch from savefrom.net",
      detail: e.message
    });
  }
}
