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

  return rawBooks.map((book) => {
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index', { books });
});

books.forEach((book) => {
  app.get(`/books/${book.slug}`, (req, res) => {
    res.render('book', { book });
  });
});

app.use(express.static(__dirname, { index: false }));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
