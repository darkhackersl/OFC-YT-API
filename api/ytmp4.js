import axios from "axios";
import cheerio from "cheerio";

export default async function handler(req, res) {
  const { url, quality = "360" } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL parameter ?url=" });
  }

  try {
    // Fetch CSRF token
    const { data: homeHtml } = await axios.get("https://ytmp3.at/");
    const $ = cheerio.load(homeHtml);
    const csrf = $('input[name="token"]').val();

    // Request video details
    const { data: resultHtml } = await axios.post(
      "https://ytmp3.at/api/ajaxSearch",
      new URLSearchParams({
        query: url,
        token: csrf
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": "https://ytmp3.at/"
        }
      }
    );

    const $$ = cheerio.load(resultHtml.result || resultHtml.html || resultHtml);
    const image = $$("img").attr("src");
    const title = $$("h3").text();
    const duration = $$("p").first().text();
    const qualities = [];
    $$('select#quality option').each((_, el) => {
      qualities.push({ value: $$(el).attr("value"), label: $$(el).text() });
    });

    // Find YouTube ID
    const v_id = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
    if (!v_id) {
      return res.status(400).json({ error: "Invalid or missing YouTube video ID in URL" });
    }

    // Find the selected quality or fallback
    const selectedQuality = qualities.find(q => q.value === quality) ? quality : "360";

    const { data: convertHtml } = await axios.post(
      "https://ytmp3.at/api/ajaxConvert",
      new URLSearchParams({
        v_id,
        ftype: "mp4",
        fquality: selectedQuality,
        token: csrf
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": "https://ytmp3.at/"
        }
      }
    );

    const $$$ = cheerio.load(convertHtml.result || convertHtml.html || convertHtml);
    const downloadLink = $$$('a[download]').attr("href");

    res.json({
      type: "mp4",
      title,
      image,
      duration,
      qualities,
      selectedQuality,
      download: downloadLink ? (downloadLink.startsWith("http") ? downloadLink : "https://ytmp3.at" + downloadLink) : null
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch or parse ytmp3.at", detail: e.message });
  }
}
