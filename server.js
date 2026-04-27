const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { dbGet, dbRun, dbGetAll } = require('./database');
const { getSubscribers, createSubscribersSpreadsheet } = require('./subscribers-spreadsheet-maker');
const booksData = require('./data/books.json');
const swagPreviewData = require('./data/swag-preview.json');
const { create } = require('domain');
const { get } = require('http');

const app = express();
const port = process.env.PORT || 3000;
const databaseDir = path.join(__dirname, 'database');
const databasePath = path.join(databaseDir, 'newsletter.sqlite');
const databaseInitScriptPath = path.join(databaseDir, 'init.sql');

const newsletterPassword = process.env.NEWSLETTER_PASSWORD

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20 // much tighter
});

if (!newsletterPassword) {
  console.warn('Warning: NEWSLETTER_PASSWORD environment variable is not set. Newsletter admin access will be unprotected.');
}

function initializeDatabase() {
  fs.mkdirSync(databaseDir, { recursive: true });

  return new Promise((resolve, reject) => {
    fs.readFile(databaseInitScriptPath, 'utf8', (readError, sqlScript) => {
      if (readError) {
        reject(readError);
        return;
      }

      const db = new sqlite3.Database(databasePath, (openError) => {
        if (openError) {
          reject(openError);
          return;
        }

        db.exec(sqlScript, (execError) => {
          if (execError) {
            db.close(() => reject(execError));
            return;
          }

          db.close((closeError) => {
            if (closeError) {
              reject(closeError);
              return;
            }

            resolve();
          });
        });
      });
    });
  });
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildBooksWithSlugs(rawBooks) {
  const slugCounts = new Map();
  const booksArray = Array.isArray(rawBooks)
    ? rawBooks
    : Object.values(rawBooks || {});

  return booksArray.map((book) => {
    const baseSlug = slugify(book.title) || 'book';
    const currentCount = slugCounts.get(baseSlug) || 0;
    const nextCount = currentCount + 1;

    slugCounts.set(baseSlug, nextCount);

    return {
      ...book,
      slug: currentCount === 0 ? baseSlug : `${baseSlug}-${nextCount}`
    };
  });
}

const books = buildBooksWithSlugs(booksData);

function getStartSlideIndex(query, allBooks) {
  if (!Array.isArray(allBooks) || allBooks.length === 0) {
    return 0;
  }

  const novelParam = typeof query?.novel === 'string' ? query.novel.trim() : '';
  if (novelParam) {
    const matchedIndex = allBooks.findIndex((book) => book.slug === novelParam);
    if (matchedIndex >= 0) {
      return matchedIndex;
    }
  }

  const slideParam = typeof query?.slide === 'string' ? Number.parseInt(query.slide, 10) : NaN;
  if (Number.isFinite(slideParam)) {
    const zeroBasedIndex = slideParam > 0 ? slideParam - 1 : slideParam;
    return Math.min(Math.max(zeroBasedIndex, 0), allBooks.length - 1);
  }

  return 0;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(globalLimiter);

app.get('/', (req, res) => {
  const initialSlideIndex = getStartSlideIndex(req.query, books);
  res.render('index', { books, initialSlideIndex, swagPreview: swagPreviewData });
});

books.forEach((book) => {
  app.get(`/books/${book.slug}`, (req, res) => {
    res.render('book', { book });
  });
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/static', express.static(path.join(__dirname, 'static')));
// Middleware to parse form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/subscribe', authLimiter, async (req, res) => {

  if (req.body['honey-pot']) {
    console.warn('Bot submission detected. Form data:', req.body);
    res.status(400).json({ error: 'Bot submission detected. If you are not a bot, please try submitting the form again.' });
    return;
  }

  const email = req.body.email?.trim();

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const token = crypto.randomBytes(16).toString('hex');
  try {
    await dbRun("INSERT INTO subscribers (email, token) VALUES (?, ?)", [email, token]);
    res.json({ success: true, message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Error occurred while processing subscription request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request. Please try again later.' });
  }
});

app.get('/unsubscribe/:token', authLimiter, async (req, res) => {
  const token = req.params.token;
  try {
    const subscriber = await dbGet("SELECT * FROM subscribers WHERE token = ?", [token]);
    if (!subscriber) {
      res.status(404).send('Invalid unsubscribe link. No subscriber found for the provided token.');
      return;
    }
    await dbRun("DELETE FROM subscribers WHERE token = ?", [token]);
    res.send('You have been unsubscribed from the newsletter.');
  } catch (error) {
    console.error('Error occurred while processing unsubscribe request:', error);
    res.status(500).send('An error occurred while processing your request. Please try again later.');
  }
});


app.get('/newsletter-admin', (req, res) => {
  res.render('newsletter-authorize');
});

app.post('/subscribers-file', authLimiter, async (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (!newsletterPassword || authHeader !== `Bearer ${newsletterPassword}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="subscribers.xlsx"');

  const host = req.get('origin') || `${req.protocol}://${req.get('host')}`;

  const subscribers = await getSubscribers(host);
  const spreadsheetBuffer = createSubscribersSpreadsheet(subscribers);

  res.send(spreadsheetBuffer);

});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}
startServer();
