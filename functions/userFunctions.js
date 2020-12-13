import pg from 'pg';
import jsSHA from 'jssha';

// storing the SALT
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

export function userLogin(req, res) {
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
  });
}

export function userSignUp(req, res) {
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
}

export function userLogout(req, res) {
  console.log('request to logout came in');
  // clear all the cookies
  res.clearCookie('userId');
  res.clearCookie('loggedInHash');
  res.clearCookie('loggedIn');
  // redirect to login page
  res.redirect('/login');
}
