const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

const app = express();
const port = process.env.PORT || 3000;

const visitedUrls = new Set();
const productPatterns = [/\/product\//, /\/item\//, /\/p\//];
let crawlingResults = {};

const isProductUrl = (url) => productPatterns.some((pattern) => pattern.test(url));

const fetchPage = async (url) => {
  try {
    const response = await axios.get(url);
    return cheerio.load(response.data);
  } catch {
    return null;
  }
};

const crawl = async (url, baseUrl, productUrls) => {
  if (visitedUrls.has(url)) return;
  visitedUrls.add(url);

  const $ = await fetchPage(url);
  if (!$) return;

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const fullUrl = new URL(href, baseUrl).toString();

    if (isProductUrl(fullUrl)) {
      productUrls.add(fullUrl);
    } else if (!visitedUrls.has(fullUrl) && fullUrl.startsWith(baseUrl)) {
      crawl(fullUrl, baseUrl, productUrls);
    }
  });
};

app.use(express.json());

app.post("/start-crawl", async (req, res) => {
  const { domains } = req.body;
  if (!domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: "Invalid input. Provide an array of domains." });
  }

  crawlingResults = {};
  for (const domain of domains) {
    const productUrls = new Set();
    visitedUrls.clear();
    await crawl(domain, domain, productUrls);
    crawlingResults[domain] = Array.from(productUrls);
  }

  res.json({ message: "Crawling completed", results: crawlingResults });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
