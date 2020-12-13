import pg from 'pg';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import FormData from 'form-data';

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
const ocrAPI = (req, res, receiptID) => {
  const data = new FormData();
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
          res.render('newExpenseOCR', { ocrData, categories: result.rows, receiptID });
        })
        .catch((error) => console.log(error.stack));
    }); };

export function newReceipt(req, res) {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  const expId = req.query.expenseId;
  res.render('fileUpload', { expId });
}
export function createNewReceipt(req, res) {
  if (req.cookies.loggedIn === undefined) {
    res.redirect('errorPage');
  }
  upload(req, res, (error) => {
    const expId = req.body.expenseId;
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
          ocrAPI(req, res, receiptIDValue);
        });
    }
  });
}
