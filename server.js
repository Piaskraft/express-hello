// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const { engine } = require('express-handlebars');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

// --- Twoje routery API ---
const seatsRoutes = require('./routes/seats.routes');
const testimonialsRoutes = require('./routes/testimonials.routes');

const app = express();
const PORT = Number(process.env.PORT || 8000);

// ===== 1) KONFIG BAZOWY (BASE_URL + CALLBACK) =====
const BASE_URL =
  (process.env.BASE_URL && process.env.BASE_URL.replace(/\/+$/, '')) ||
  `http://localhost:${PORT}`; // np. http://localhost:8000

const CALLBACK_URL = `${BASE_URL}/auth/google/callback`;



// Prosty sanity-check ENV:
['SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].forEach((k) => {
  if (!process.env[k]) console.warn(`⚠️ Brakuje ${k} w .env — logowanie może nie zadziałać`);
});
console.log('[ENV] BASE_URL =', BASE_URL);
console.log('[ENV] CALLBACK_URL =', CALLBACK_URL);
console.log('[ENV] GOOGLE_CLIENT_ID =', process.env.GOOGLE_CLIENT_ID);

// ===== 2) MIDDLEWARE KOLEJNOŚĆ =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Jeśli kiedyś będzie https za proxy (np. Heroku/Nginx)
if (BASE_URL.startsWith('https://')) app.set('trust proxy', 1);

// Sesja (nazwane ciasteczko + maxAge)
const COOKIE_NAME = 'sid';
app.use(
  session({
    name: COOKIE_NAME,
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: BASE_URL.startsWith('https://'), // na https = true; lokalnie http = false
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user || null;   // dla {{#if user}} w HBS
  next();
});

// ===== 3) PASSPORT + STRATEGIA GOOGLE =====
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      // Diagnostyka
      console.log('✅ verify(): profile.id=', profile?.id, 'email=', profile?.emails?.[0]?.value);
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value || null,
        photo: profile.photos?.[0]?.value || null,
      };
      return done(null, user);
    }
  )
);

// Logger po passport.session – czy mamy req.user
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} | user=`, req.user?.email || null);
  next();
});

// ===== 4) VIEW ENGINE =====
app.set('views', path.join(__dirname, 'views'));
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
  })
);
app.set('view engine', 'hbs');

app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
});

// ===== 5) WIDOKI =====
app.get('/', (req, res) => res.render('index'));
app.get('/hello/:name', (req, res) => res.render('hello', { name: req.params.name }));
app.get('/contact', (req, res) => res.render('contact'));

// CONTACT: WALIDACJA
app.post('/contact/send-message', (req, res) => {
  const { author, sender, title, message } = req.body;
  if (!author || !sender || !title || !message) {
    return res.render('contact', { isError: true, author, sender, title, message });
  }
  return res.render('contact', { isSent: true, author, sender, title, message });
});

// ===== 6) API =====
app.use('/api', seatsRoutes);
app.use('/api', testimonialsRoutes);

// ===== 7) OAUTH GOOGLE =====
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  })
);

// Callback – custom, z pełną diagnostyką
app.get('/auth/google/callback', (req, res, next) => {
  console.log('➡️  /auth/google/callback HIT, query =', req.query);
  passport.authenticate('google', (err, user) => {
    if (err) {
      console.error('Auth error:', err);
      return res.redirect('/login-failed');
    }
    if (!user) {
      console.warn('Auth: brak usera w callbacku');
      return res.redirect('/login-failed');
    }
    req.logIn(user, (err2) => {
      if (err2) {
        console.error('Login error:', err2);
        return res.redirect('/login-failed');
      }
      console.log('✅ Zalogowano jako:', user.email);
      return res.redirect('/me');
    });
  })(req, res, next);
});

app.get('/login-failed', (req, res) =>
  res.status(401).render('error', { message: 'Logowanie nieudane' })
);

// ===== 8) AUTORYZACJA & ME =====
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return req.accepts('json')
    ? res.status(401).json({ authenticated: false })
    : res.redirect('/login-failed');
};
app.get('/private', ensureAuth, (req, res) => {
  res.render('private', { title: 'Strefa prywatna' });
});

app.get('/me', ensureAuth, (req, res) => {
  res.json(req.user);
});

// ===== 9) LOGOUT (Passport 0.6+ + czyszczenie cookie) =====
app.get('/logout', (req, res) => {
  const doDestroy = () => {
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie(COOKIE_NAME, { path: '/' });
        return res.redirect('/');
      });
    } else {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.redirect('/');
    }
  };

  if (typeof req.logout === 'function') {
    try {
      req.logout(() => doDestroy());
    } catch (e) {
      doDestroy(); // w razie starszej, synchronicznej implementacji
    }
  } else {
    doDestroy();
  }
});

// ===== 10) Fallbacki =====
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
app.use((req, res) => res.status(404).render('not-found'));

app.use((err, req, res, next) => {
  console.error('❌ APP ERROR:', err);
  res.status(500).render('error', { message: 'Coś poszło nie tak.' });
});

// ===== 11) START =====
app.listen(PORT, () => {
  console.log('✅ Server działa na porcie:', PORT);
  console.log('🔗 Wejdź w:', `${BASE_URL}/auth/google`);
});
