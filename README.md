# Crypto News Bot

**Automated cryptocurrency news collection, AI translation, and MySQL publishing.**

A lightweight cryptocurrency news automation bot built with Node.js and Groq AI.

The bot collects news from cryptocurrency websites using RSS feeds and APIs, translates articles into 8 languages with Groq AI, and automatically saves them to a MySQL database.

Designed for developers building cryptocurrency applications, news platforms, and multilingual content systems.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-ESM-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-AI%20Powered-F55036?style=flat-square" />
  <img src="https://img.shields.io/badge/Languages-8-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Process%20Manager-PM2-2B037A?style=flat-square" />
</p>

---

## Features

- **Multi-Source Collection** – Fetch cryptocurrency news from RSS feeds and APIs.
- **AI-Powered Translation** – Translate articles automatically using Groq AI.
- **8 Language Support** – Publish news in multiple languages.
- **MySQL Integration** – Store original and translated articles in MySQL.
- **Duplicate Prevention** – Avoid processing previously collected news.
- **Automatic Scheduling** – Run the collection process every 2 hours by default.
- **Daily Publishing Limit** – Add up to 5 news articles per day by default.
- **Customizable Settings** – Adjust publishing limits and collection intervals.
- **PM2 Support** – Keep the bot running in the background and monitor its logs.

## Supported Languages

The bot supports automatic news translation into the following 8 languages:

| Language | Code |
|:--|:--:|
| Bosnian | `bs` |
| German | `de` |
| English | `en` |
| Spanish | `es` |
| Japanese | `ja` |
| Korean | `ko` |
| Russian | `ru` |
| Turkish | `tr` |

## How It Works

```text
       CRYPTO NEWS WEBSITES
                 |
                 v
          RSS FEEDS / APIs
                 |
                 v
          NEWS COLLECTION
                 |
                 v
          DUPLICATE CHECK
                 |
                 v
              GROQ AI
                 |
                 v
       8-LANGUAGE TRANSLATION
                 |
                 v
           MYSQL DATABASE
                 |
                 v
        APPLICATION / WEBSITE
```

The entire process runs automatically without requiring manual news collection or translation.

## Default Configuration

| Setting | Default Value |
|:--|:--|
| Daily News Limit | 5 Articles |
| Collection Interval | 2 Hours |
| Translation Provider | Groq AI |
| Supported Languages | 8 |
| Database | MySQL |
| News Sources | RSS & APIs |
| Process Manager | PM2 |

**Customization:** Both the daily article limit and collection interval can be changed according to your requirements.

## Project Structure

The project consists of three main files:

```text
crypto-news-bot/
│
├── .env
├── bot.mjs
└── package.json
```

| File | Description |
|:--|:--|
| `.env` | API keys, database credentials, and configuration |
| `bot.mjs` | Main automation and news processing logic |
| `package.json` | Project dependencies and package configuration |

## Requirements

Before running the bot, make sure you have:

- Node.js installed
- npm installed
- MySQL Server
- Groq API Key
- PM2

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/talhacaba/crypto-news-bot.git

cd crypto-news-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Configure your `.env` file with your API credentials and MySQL connection details.

Keep your credentials private. Never upload your `.env` file to a public repository.

### 4. Install PM2 Globally

Open PowerShell and run:

```powershell
npm install -g pm2
```

### 5. Start the Bot

After installing PM2, navigate to the project directory and run:

```powershell
pm2 start bot.mjs --name "botr"
```

The bot will now run in the background under PM2.

### 6. Monitor Logs and Status

To check whether the bot is running and view its console output:

```powershell
pm2 logs botr
```

To check the current process status:

```powershell
pm2 status
```

To restart the bot:

```powershell
pm2 restart botr
```

To stop the bot:

```powershell
pm2 stop botr
```

To remove the bot from PM2:

```powershell
pm2 delete botr
```

## Configuration & Customization

The automation settings can be adjusted to fit different publishing requirements.

You can customize:

- Maximum daily news articles
- News collection interval
- RSS feed sources
- External news APIs
- Supported translation languages
- Groq AI model settings
- MySQL database connection

For example, the default configuration can be changed from 5 articles per day to 10, 20, or more, depending on your needs.

## Groq AI

Groq is used as the AI translation engine.

You can obtain your API key from:

[Groq Console](https://console.groq.com/keys)

Make sure your API key is configured correctly before starting the bot.

## Database

All collected articles and their translated versions are stored in MySQL.

The database can be connected to any compatible backend, website, or mobile application to display multilingual cryptocurrency news.

## Security

- Never share your `.env` credentials.
- Do not commit API keys to GitHub.
- Use a dedicated MySQL database user.
- Protect your database credentials.
- Respect the API limits and content policies of your news providers.

## Disclaimer

This project is developed for cryptocurrency news aggregation and automated translation.

It does not provide financial advice, investment recommendations, or trading signals.

Users are responsible for complying with the terms of service and copyright policies of the news sources they use.

## Contributing

Suggestions, bug reports, and improvements are welcome.

Feel free to open an issue or submit a pull request.

## License

MIT License.

See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built for the cryptocurrency development community.
</p>
