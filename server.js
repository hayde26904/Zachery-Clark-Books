const path = require('path');
const express = require('express');
const booksData = require('./data/books.json');

const app = express();
const port = process.env.PORT || 3000;

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

app.get('/', (req, res) => {
  const initialSlideIndex = getStartSlideIndex(req.query, books);
  res.render('index', { books, initialSlideIndex });
});

books.forEach((book) => {
  app.get(`/books/${book.slug}`, (req, res) => {
    res.render('book', { book });
  });
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
