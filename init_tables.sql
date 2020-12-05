CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(37) UNIQUE,
  "password" VARCHAR(37),
  "name" TEXT,
  "email" TEXT UNIQUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

WITH new_expense as (
INSERT INTO categories (name)
)
INSERT INTO expenses (date, name, amount,) VALUES()

CREATE TABLE "expenses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INT,
  "categories_id" INT,
  "date" DATE NOT NULL,
  "amount" INT,
  "message" VARCHAR(255),
  "receipt_id" INT
);

CREATE TABLE "receipts" (
  "id" SERIAL PRIMARY KEY,
  "imgurl" TEXT,
  "vendor name" TEXT,
  "item name" TEXT
);

CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT
);


