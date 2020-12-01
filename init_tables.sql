CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(37) UNIQUE,
  "password" VARCHAR(37),
  "name" TEXT,
  "email" TEXT UNIQUE,
  "created_at" DATE NOT NULL
);

CREATE TABLE "expenses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INT,
  "category_id" INT,
  "date" DATE NOT NULL,
  "amount" INT,
  "Message" VARCHAR(255),
  "receipt_id" INT
);

CREATE TABLE "receipts" (
  "id" SERIAL PRIMARY KEY,
  "imgurl" TEXT,
  "vendor name" TEXT,
  "item name" TEXT
);

CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT
);


