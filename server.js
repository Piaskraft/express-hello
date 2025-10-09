// 1) Importujemy paczki
const express = require('express');
const path = require('path');
const hbs = require('express-handlebars');

// 2) Tworzymy aplikację Express
const app = express();

// 3) Rejestrujemy silnik szablonów Handlebars
app.engine('hbs', hbs({ extname: '.hbs' }));
app.set('view engine', 'hbs');

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

app.post('/contact', (req, res) => {
  const { name, message } = req.body;

  // prosta walidacja
  if (!name || !message) {
    return res.render('contact', {
      error: 'Proszę uzupełnić oba pola.',
      name,
      message,
    });
  }

  // jeśli wszystko ok
  res.render('contact', { sent: true, name, message });
});


app.use((req, res) => {
  res.status(404).render('not-found', { year: new Date().getFullYear() });
});




// 5) Uruchamiamy serwer
app.listen(8000, () => {
  console.log('✅ Server działa na porcie: 8000');
});
