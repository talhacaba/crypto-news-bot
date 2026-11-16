import 'dotenv/config';
import mysql from 'mysql2/promise';
import Parser from 'rss-parser';

// MySQL Bağlantı Havuzu
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

// RSS Ayrıştırıcı
const parser = new Parser({
  headers: { 'User-Agent': 'Qcryp-Standalone-NewsBot/1.0' },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

// Kripto Haber Kaynakları
const RSS_FEEDS = [
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
];

const SUPPORTED_LANGS = ['tr', 'en', 'bs', 'de', 'es', 'ja', 'ko', 'ru'];

let cachedModel = process.env.GROQ_MODEL || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Groq hesabındaki yüksek limitli aktif metin modelini bulur
async function resolveGroqModel(apiKey) {
  if (cachedModel) return cachedModel;

  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`Groq model listesi alınamadı (${res.status})`);
  }

  const json = await res.json();
  const models = (json.data || [])
    .map((m) => m.id)
    .filter(
      (id) =>
        !id.includes('whisper') &&
        !id.includes('guard') &&
        !id.includes('tts') &&
        !id.includes('vision') &&
        !id.includes('safeguard')
    );

  // Ücretsiz katmanda yüksek token limitine sahip modeller önceliklidir
  const preferredOrder = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b',
    'llama-3.1-70b',
    'llama',
    'gemma',
    'qwen',
  ];

  for (const prefix of preferredOrder) {
    const found = models.find((id) => id.toLowerCase().includes(prefix));
    if (found) {
      cachedModel = found;
      console.log(`🧠 Seçilen aktif Groq modeli: ${cachedModel}`);
      return cachedModel;
    }
  }

  if (models.length > 0) {
    cachedModel = models[0];
    console.log(`🧠 Seçilen aktif Groq modeli: ${cachedModel}`);
    return cachedModel;
  }

  throw new Error('Groq hesabında kullanılabilir aktif metin modeli bulunamadı.');
}

function extractImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;

  const html = item['content:encoded'] || item.content || '';
  const match = html.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : '';
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateWithGroq(rawTitle, rawBody, attempt = 1) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY .env dosyasında bulunamadı!');
  }

  const model = await resolveGroqModel(apiKey);

  // Çıktı token limitini aşmamak için özlü ve net JSON talimatı
  const prompt = `Translate and summarize this crypto news into 8 languages: tr, en, bs, de, es, ja, ko, ru.
For EACH language key, return:
- "title": Clear headline (max 140 chars)
- "summary": 1-2 short sentences (max 220 chars)
- "content": 2 concise, informative paragraphs (approx 80-110 words total)

Return ONLY valid JSON with all 8 keys ("tr","en","bs","de","es","ja","ko","ru").

Title: ${rawTitle}
Text: ${rawBody.slice(0, 2500)}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Output strictly valid JSON with all 8 requested language keys.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  // 429 Rate Limit gelirse belirtilen saniye kadar bekleyip tekrar dener
  if (response.status === 429 && attempt <= 3) {
    const errText = await response.text();
    const waitMatch = errText.match(/try again in ([0-9.]+)s/i);
    const waitSeconds = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 2 : 35;

    console.warn(`⏳ Groq hız sınırına takıldı, ${waitSeconds} sn beklenip tekrar denenecek...`);
    await sleep(waitSeconds * 1000);
    return translateWithGroq(rawTitle, rawBody, attempt + 1);
  }

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404) cachedModel = '';
    throw new Error(`Groq API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const contentStr = data.choices?.[0]?.message?.content;
  if (!contentStr) return null;

  const parsed = JSON.parse(contentStr);

  for (const lang of SUPPORTED_LANGS) {
    if (!parsed[lang]?.title || !parsed[lang]?.content) {
      console.warn(`⚠️ '${lang}' dili eksik döndü, haber atlanıyor.`);
      return null;
    }
  }

  return parsed;
}

let isRunning = false;

async function scanAndPublish() {
  if (isRunning) return;
  isRunning = true;

  const now = new Date().toLocaleTimeString('tr-TR');
  console.log(`\n[${now}] 🔍 RSS kaynakları taranıyor...`);

  try {
    for (const feedSource of RSS_FEEDS) {
      try {
        const feed = await parser.parseURL(feedSource.url);
        // Her kaynaktan en güncel 2 haberi kontrol et
        const latestItems = (feed.items || []).slice(0, 2);

        for (const item of latestItems) {
          const sourceUrl = (item.link || '').trim();
          const rawTitle = stripHtml(item.title);
          const rawBody = stripHtml(
            item['content:encoded'] || item.contentSnippet || item.content
          );

          if (!sourceUrl || !rawTitle) continue;

          // Mükerrer haber kontrolü
          const [existing] = await pool.execute(
            'SELECT id FROM news WHERE source_url = ? LIMIT 1',
            [sourceUrl]
          );
          if (existing.length > 0) continue;

          console.log(`🆕 Yeni haber bulundu [${feedSource.name}]: ${rawTitle}`);

          const translations = await translateWithGroq(rawTitle, rawBody || rawTitle);
          if (!translations) continue;

          const imageUrl = extractImageUrl(item);

          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();

            const [newsRes] = await conn.execute(
              'INSERT INTO news (image_url, source, source_url) VALUES (?, ?, ?)',
              [imageUrl, feedSource.name, sourceUrl]
            );
            const newsId = newsRes.insertId;

            for (const lang of SUPPORTED_LANGS) {
              const t = translations[lang];
              await conn.execute(
                `INSERT INTO news_translations (news_id, lang, title, summary, content)
                 VALUES (?, ?, ?, ?, ?)`,
                [newsId, lang, t.title, t.summary || '', t.content]
              );
            }

            await conn.commit();
            console.log(`✅ 8 dilde yayınlandı -> ${translations.tr.title}`);
          } catch (dbErr) {
            await conn.rollback();
            console.error('❌ DB kayıt hatası:', dbErr.message);
          } finally {
            conn.release();
          }

          // Dakikalık token kotasının dolmaması için haberler arası 20 saniye bekle
          await sleep(20_000);
        }
      } catch (feedErr) {
        console.error(`⚠️ RSS Hatası (${feedSource.name}):`, feedErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Genel tarama hatası:', err.message);
  } finally {
    isRunning = false;
  }
}

const intervalMinutes = Number(process.env.CHECK_INTERVAL_MINUTES) || 15;
console.log(`🤖 Qcryp Bağımsız Haber Botu başlatıldı! (Periyot: ${intervalMinutes} dk)`);

scanAndPublish();
setInterval(scanAndPublish, intervalMinutes * 60 * 1000);
