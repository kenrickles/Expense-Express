import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import flash from 'express-flash';
import session from 'express-session';
import moment from 'moment';
import multer from 'multer';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

// Storing the Salt
const SALT = process.env.MY_ENV_VAR;
// set the way we will connect to the server
const { Pool } = pg;
let poolConfig;
if (process.env.ENV === 'PRODUCTION') {
  poolConfig = {
    user: 'postgres',
    // set DB_PASSWORD as an environment variable for security.
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: 'expense-express',
    port: 5432,
  };
} else {
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
const PORT = 3004 || process.env.MY_ENV_VAR;

// overiding post to allow ?method = put or delete
app.use(methodOverride('_method'));

// allow the use of `the folder public
app.use(express.static('public/cssFiles'));
app.use(express.static('public'));
app.use(express.static('public/uploads'));

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
// set storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
// helper function to check file type
const checkFileType = (file, cb) => {
  // allowed extensions
  const fileTypes = /jpeg|jpg|png|gif/;
  // check extension
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // check mimetype
  const mimetype = fileTypes.test(file.mimetype);
  // check file type
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
};
// initialize upload variable
const upload = multer({
  storage,
  limits: { fileSize: 10000000 },
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
}).single('myImage');
// OCR helper function
const ocr = (req, res, receiptID) => {
  const data = new FormData();
  console.log(req.file.id);
  data.append('file', fs.createReadStream(`public/uploads/${req.file.filename}`));
  const config = {
    method: 'post',
    url: 'https://api.taggun.io/api/receipt/v1/verbose/file',
    headers: {
      'Content-Type': 'multipart/form-data',
      apikey: '69f116403a5911ebafc7c5a18819396c',
      ...data.getHeaders(),
    },
    data,
  };
  axios(config)
    .then((response) => {
      const { userId } = req.cookies;
      const date = response.data.date.data;
      const vendor = response.data.merchantName.data;
      const amount = response.data.totalAmount.data;
      const ocrData = [{ date }, { vendor }, { amount }];
      const categoriesQuery = 'SELECT * FROM categories';
      pool
        .query(categoriesQuery)
        .then((result) => {
          console.log(receiptID);
          res.render('newExpenseOCR', { ocrData, categories: result.rows, receiptID });
        })
        .catch((error) => console.log(error.stack));
    }); };
/* ======= ROUTES ===== */
app.get('/ocr', (req, res) => {
  res.render('post');
});
app.post('/ocr', (req, res) => {
  ocr(req, res);
});
// Render user mainpage after login
app.get('/dashboard', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
    return;
  }
  // selecting the data to into table
  const allExpenseQuery = `SELECT expenses.id, expenses.date, expenses.amount, expenses.name,expenses.vendor, categories.name AS categories_name FROM expenses INNER JOIN categories ON expenses.categories_id = categories.id WHERE expenses.user_id = ${req.cookies.userId}`;

  // select the data
  pool
    .query(allExpenseQuery)
    .then((result) => {
      const expenses = result.rows;
      const expenseData = { expenses };
      res.render('dashboard', expenseData);
    })
    .catch((error) => console.log(error.stack));
});

app.get('/expense/:id', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  const { id } = req.params;
  const sqlExpenseQuery = `SELECT expenses.id, expenses.date, expenses.amount, expenses.name, expenses.message, expenses.vendor, categories.name AS categories_name, receipts.imgurl AS receipt_imagelink FROM expenses 
  INNER JOIN categories 
  ON expenses.categories_id = categories.id 
  LEFT JOIN receipts 
  ON expenses.receipt_id = receipts.id 
  WHERE expenses.user_id = ${req.cookies.userId}
  AND 
  expenses.id = ${id}`;
  pool
    .query(sqlExpenseQuery)
    .then((result) => {
      const expense = result.rows;
      const expenseData = { expense };
      res.render('expense', expenseData);
    })
    .catch((error) => console.log(error.stack));
});
// delete expense route
app.delete('/expense/:id/delete', (req, res) => {
  // storing the id from user request
  const { id } = req.params;
  // delete query
  const deleteSQL = (`DELETE FROM expenses where expenses.id=${id}`);
  // query to delete from table
  pool
    .query(deleteSQL)
    .then(() => {
      // redirect back to dashboard
      res.redirect('/dashboard');
    })
    .catch((error) => console.log(error.stack));
});

// file upload
app.get('/upload', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  const expId = req.query.expenseId;
  res.render('fileupload', { expId });
});
app.post('/upload', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  upload(req, res, (error) => {
    const expId = req.body.expenseId;
    console.log(expId, 'hi');
    if (error) {
      res.render('fileUpload', { msg: error });
    } else if (req.file === undefined) {
      res.render('fileUpload', { msg: 'Error: No File Selected!' });
    } else if (expId !== 'undefined') {
      const inputValue = [`/uploads/${req.file.filename}`];
      const uploadQuery = 'INSERT INTO receipts (imgurl) VALUES ($1) RETURNING *;';
      pool
        .query(uploadQuery, inputValue)
        .then((result) => {
          const receiptIDValue = [result.rows[0].id];
          console.log(receiptIDValue);
          const receiptIDQuery = `UPDATE expenses SET receipt_id = ($1) WHERE id = ${expId};`;
          pool
            .query(receiptIDQuery, receiptIDValue)
            .catch(((err2) => console.log(err2.stack)));
          res.redirect(`/expense/${expId}`);
        }).catch((err) => console.log(err.stack));
    } else if (expId === 'undefined') {
      const inputValue = [`/uploads/${req.file.filename}`];
      const uploadQuery = 'INSERT INTO receipts (imgurl) VALUES ($1) RETURNING *;';
      pool
        .query(uploadQuery, inputValue)
        .then((result) => {
          const receiptIDValue = result.rows[0];
          console.log(receiptIDValue, 'receipt id');
          ocr(req, res, receiptIDValue);
        });
    }
  });
});

app.get('/expense/:id/edit', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  const { id } = req.params;
  const sqlExpenseQuery = `SELECT expenses.id, expenses.date, expenses.amount, expenses.name, expenses.message, expenses.vendor, categories.name AS categories_name, receipts.imgurl AS receipt_imagelink FROM expenses 
  INNER JOIN categories 
  ON expenses.categories_id = categories.id 
  LEFT JOIN receipts 
  ON expenses.receipt_id = receipts.id 
  WHERE expenses.user_id = ${req.cookies.userId}
  AND 
  expenses.id = ${id}`;
  pool
    .query(sqlExpenseQuery)
    .then((result) => {
      const expense = result.rows;
      const expenseData = { expense };
      res.render('editExpense', expenseData);
    })
    .catch((error) => console.log(error.stack));
});
app.put('/expense/:id/edit', (req, res) => {
  const { id } = req.params;
  const {
    amount, expenseName, message, vendor,
  } = req.body;
  console.log(JSON.parse(JSON.stringify(req.body)));
  const updatedValues = [amount, expenseName, message, vendor];
  const updateExpenseQuery = `UPDATE expenses SET amount = $1, name = $2, message = $3, vendor = $4 WHERE id=${id}`;
  pool
    .query(updateExpenseQuery, updatedValues)
    .then((result) => {
      res.redirect(`/expense/${id}`);
    })
    .catch((error) => console.log(error.stack));
});

app.get('/expense', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  const categoriesQuery = 'SELECT * FROM categories';
  pool
    .query(categoriesQuery)
    .then((result) => {
      const expenseData = { categories: result.rows };
      res.render('newExpense', expenseData);
    });
});

app.post('/expense', (req, res) => {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  console.log(req.body);
  const { userId } = req.cookies;
  const {
    // eslint-disable-next-line camelcase
    date, expenseName, categories_id, amount, vendor, message, receiptId,
  } = req.body;
  // eslint-disable-next-line camelcase
  const inputValue = [date, expenseName, amount, vendor, categories_id, userId, message, receiptId];
  console.log(inputValue);
  const addIntoExpenseSQL = 'INSERT INTO expenses (date, name, amount, vendor, categories_id, user_id, message, receipt_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
  pool
    .query(addIntoExpenseSQL, inputValue)
    .then((result) => {
      res.redirect(`/expense/${result.rows[0].id}`);
    })
    .catch((error) => console.log(error.stack));
});
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/errorpage', (req, res) => {
  res.render('errorPage');
});
// Render a form for user sign up
app.get('/signup', (req, res) => {
  res.render('register');
});
app.post('/signup', (req, res) => {
  const {
    name, email, password, password2,
  } = req.body;
  const errors = [];
  // validation for all fields being filled up
  if (!name || !email || !password || !password2) {
    errors.push({ message: 'Please enter all fields' });
  }
  // password character at least 6 validation
  if (password.length < 6) {
    errors.push({ message: 'Password Should be at least 6 characters' });
  }
  // making sure password matches
  if (password !== password2) {
    errors.push({ message: 'Passwords do not match' });
  }
  // if there are are errors, use flash to display errors.
  if (errors.length > 0) {
    res.render('register', { errors });
  } else {
    // form validation has passed
    // initialise the SHA object
    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    // input the password from the request to the SHA object
    shaObj.update(req.body.password);
    // get the hashed password as output from the SHA object
    const hashedPassword = shaObj.getHash('HEX');

    console.log(hashedPassword);
    // store the hashed password in our DB

    pool.query(
      `SELECT * FROM users
      WHERE email = $1`, [email], (error, result) => {
        if (error) {
          throw error;
        }
        console.log(result.rows);
        // validation to see if email has been registered
        if (result.rows.length > 0) {
          errors.push({ message: 'Email already registered' });
          res.render('register', { errors });
        } else {
          // insert into database
          pool.query(
            `INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, password`, [name, email, hashedPassword], (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash('success_msg', 'You are now registered. Please log in');
              res.redirect('/login');
            },
          );
        }
      },

    );
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const values = [req.body.email];
  pool.query('SELECT * from users WHERE email=$1', values, (error, result) => {
    // return if there is a query error
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    const errors = [];
    // we didnt find a user with that email
    if (result.rows.length === 0) {
      // the error for incorrect email and incorrect password are the same for security reasons.
      // This is to prevent detection of whether a user has an account for a given service.
      errors.push({ message: 'Incorrect Credentials' });
      res.render('login', { errors });
      return;
    }
    const user = result.rows[0];
    // create new SHA object for user id
    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    shaObj.update(req.body.password);
    // generate a hashed password
    const hashedPassword = shaObj.getHash('HEX');
    if (user.password !== hashedPassword) {
      errors.push({ message: 'Incorrect Credentials' });
      res.render('login', { errors });
      return;
    } if (user.password === hashedPassword) {
      // SHA object for user id
      const shaObjUserId = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
      // create an unhashed cookie string based on user ID and salt
      const unhasedUseridString = `${user.id}-${SALT}`;
      console.log('unhashed cookie string:', unhasedUseridString);
      // input the unhashed cookie string to the SHA object
      shaObjUserId.update(unhasedUseridString);
      // generate a hashed cookie string using SHA object
      const hashedUserIdCookieString = shaObjUserId.getHash('HEX');
      // set the loggedInHash and userId cookies in the response
      res.cookie('loggedInHash', hashedUserIdCookieString);
      res.cookie('userId', user.id);
    }
    // The user's password hash matches that in the DB and we authenticate the user.
    res.cookie('loggedIn', true);
    // redirect
    res.redirect('/dashboard');
  }); });

app.delete('/logout', (req, res) => {
  console.log('request to logout came in');
  // clear all the cookies
  res.clearCookie('userId');
  res.clearCookie('loggedInHash');
  res.clearCookie('loggedIn');
  // redirect to login page
  res.redirect('/login');
});

// app.get('*', (req, res) => {
//   res.render('errorPage');
// });
app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
