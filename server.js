const path = require('path');
const express = require('express');
const { engine } = require('express-handlebars'); // <— destrukturyzacja engine

const app = express();

// Handlebars z layoutami i partialami silnik 
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir:  path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
}));
app.set('view engine', 'hbs');

// (opcjonalnie) globalne dane
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
});

// 4) Ustawiamy folder publiczny (np. CSS, obrazki)
app.use(express.static(path.join(__dirname, '/public')));

app.use(express.urlencoded({ extended: true }));



// 6) Endpoint dynamiczny – wita użytkownika po imieniu

  app.get('/hello/:name', (req, res) => {
  res.render('hello', { name: req.params.name, year: new Date().getFullYear() });
});


app.get('/', (req, res) => {
  res.render('index', { year: new Date().getFullYear() });
});

app.get('/contact', (req, res) => {
  const { name, message } = req.query; // pobieramy dane z URL-a
  if (name && message) {
    return res.render('contact', { sent: true, name, message });
  }
  res.render('contact'); // pierwszy raz – bez danych
});


 app.post('/contact/send-message', (req, res) => {
  const { author, sender, title, message } = req.body;

  // jeśli czegokolwiek brakuje -> błąd
  if (!author || !sender || !title || !message) {
    return res.render('contact', {
      isError: true,
      author, sender, title, message,
    });
  }

  // wszystko ok -> sukces
  res.render('contact', {
    isSent: true,
    author, sender, title, message,
  });
});



app.post('/contact/send-message', (req, res) => {
  const { author, sender, title, message } = req.body;

  // walidacja – sprawdzamy, czy pola nie są puste
  if (!author || !sender || !title || !message) {
    return res.render('contact', {
      isError: true,
      author,
      sender,
      title,
      message,
    });
  }

  // jeśli wszystko ok
  res.render('contact', {
    isSent: true,
    author,
    sender,
    title,
    message,
  });
});

 app.get('/boom', (_req, _res) => {
  throw new Error('Testowy wybuch 500');
});


app.use((req, res) => {
  res.status(404).render('not-found', { year: new Date().getFullYear() });
});

// 500 – globalny handler błędów
app.use((err, req, res, next) => {
  console.error('❌ APP ERROR:', err);
  res.status(500).render('error', { message: 'Coś poszło nie tak.' }); // error.hbs
});


// 5) Uruchamiamy serwer
app.listen(8000, () => {
  console.log('✅ Server działa na porcie: 8000');
});
