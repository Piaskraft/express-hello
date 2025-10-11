const path = require('path');
const express = require('express');
const { engine } = require('express-handlebars');

const testimonialsRoutes = require('./routes/testimonials.routes');

const app = express();

/* --- MIDDLEWARE --- */
app.use(express.json());                      // JSON body dla API
app.use(express.urlencoded({ extended: true })); // form-urlencoded dla formularzy
app.use(express.static(path.join(__dirname, 'public')));

/* --- HANDLEBARS --- */
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir:  path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
}));
app.set('view engine', 'hbs');

/* --- GLOBALNE DANE DO WIDOKÓW --- */
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
});

/* --- TRASY WIDOKÓW --- */
app.get('/', (req, res) => res.render('index'));
app.get('/hello/:name', (req, res) => {
  res.render('hello', { name: req.params.name });
});
app.get('/contact', (req, res) => res.render('contact'));

/* --- CONTACT: WALIDACJA (JEDNA definicja!) --- */
app.post('/contact/send-message', (req, res) => {
  const { author, sender, title, message } = req.body;

  if (!author || !sender || !title || !message) {
    return res.render('contact', {
      isError: true,
      author, sender, title, message,
    });
  }

  return res.render('contact', {
    isSent: true,
    author, sender, title, message,
  });
});

/* --- API ROUTER (PO UTWORZENIU app!) --- */
app.use('/api', testimonialsRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

/* --- 404 / 500 --- */
app.use((req, res) => {
  res.status(404).render('not-found');
});
app.use((err, req, res, next) => {
  console.error('❌ APP ERROR:', err);
  res.status(500).render('error', { message: 'Coś poszło nie tak.' });
});

/* --- START --- */
app.listen(8000, () => {
  console.log('✅ Server działa na porcie: 8000');
});
