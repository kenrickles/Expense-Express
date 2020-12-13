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

export function dashboard(req, res) {
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
}

export function showExpense(req, res) {
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
}

export function deleteExpense(req, res) {
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
}

export function editExpense(req, res) {
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
}

export function updateEdit(req, res) {
  const { id } = req.params;
  const {
    amount, expenseName, message, vendor,
  } = req.body;
  const updatedValues = [amount, expenseName, message, vendor];
  const updateExpenseQuery = `UPDATE expenses SET amount = $1, name = $2, message = $3, vendor = $4 WHERE id=${id}`;
  pool
    .query(updateExpenseQuery, updatedValues)
    .then((result) => {
      res.redirect(`/expense/${id}`);
    })
    .catch((error) => console.log(error.stack));
}

export function newExpense(req, res) {
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
}

export function createNewExpense(req, res) {
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
}
