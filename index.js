import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import flash from 'express-flash';
import session from 'express-session';
import moment from 'moment';
import * as userFunctions from './functions/userFunctions.js';
import * as expenseFunctions from './functions/expenseFunctions.js';
import * as receiptFunctions from './functions/receiptFunctions.js';

// Storing the Salt
const SALT = process.env.MY_ENV_VAR;
// set the way we will connect to the server
const { Pool } = pg;
let poolConfig;
if (process.env.DATABASE_URL) {
  // pg will take in the entire value and use it to connect
  poolConfig = {
    connectionString: process.env.DATABASE,
  };
}
else {
  poolConfig = {
    user: process.env.USER,
    host: 'localhost',
    database: 'expense-express',
    port: 5432, // Postgres server always runs on this port
  };
}
// Create a new instance of Pool object
const pool = new Pool(poolConfig);
// start express and create an express app
const app = express();
// adding moment to ejs
app.locals.moment = moment;
// setting the port number
const PORT = process.env.PORT || 3004;
// overiding post to allow ?method = put or delete
app.use(methodOverride('_method'));
// allow the use of `the folder public
app.use(express.static('public/cssFiles'));
app.use(express.static('public'));
app.use(express.static('public/uploads'));
app.use(express.static('public/js'));
// set the view engine to ejs
app.set('view engine', 'ejs');
// accepting request to form the data
app.use(express.urlencoded({ extended: false }));
// middleware that allows cookies to be parsed
app.use(cookieParser());
// use to flash message back
app.use(session({
  /* the longer key it is the more random it is, the more secure it is.
  The key we want to keep secret, encrypt the information we store in the session */
  secret: 'secret',
  // If nothing is changed, we will not resave
  resave: false,
  // Do we want to save session details if there is no value placed in the session
  saveUninitialized: false,
}));
app.use(flash());

/* ======= ROOT ROUTE ===== */
app.get('/', (req, res) => {
  res.render('index');
});

/* ======= ROUTES  FOR USERS ===== */
app.get('/errorpage', (req, res) => res.render('errorPage'));
app.get('/signup', (req, res) => res.render('register'));
app.post('/signup', (req, res) => userFunctions.userSignUp(req, res));
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => userFunctions.userLogin(req, res));
app.delete('/logout', (req, res) => userFunctions.userLogout(req, res));

/* ======= ROUTES FOR EXPENSE ===== */
app.get('/dashboard', (req, res) => expenseFunctions.dashboard(req, res));
app.get('/expense/:id', (req, res) => expenseFunctions.showExpense(req, res));
app.delete('/expense/:id/delete', (req, res) => expenseFunctions.deleteExpense(req, res));
app.get('/expense/:id/edit', (req, res) => expenseFunctions.editExpense(req, res));
app.put('/expense/:id/edit', (req, res) => expenseFunctions.updateEdit(req, res));
app.get('/expense', (req, res) => expenseFunctions.newExpense(req, res));
app.post('/expense', (req, res) => expenseFunctions.createNewExpense(req, res));

/* ======= ROUTES  FOR RECEIPT UPLOAD ===== */
app.get('/upload', (req, res) => receiptFunctions.newReceipt(req, res));
app.post('/upload', (req, res) => receiptFunctions.createNewReceipt(req, res));

// app.get('*', (req, res) => {
//   res.render('errorPage');
// });
app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
