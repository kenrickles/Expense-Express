CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(37) UNIQUE,
  "password" VARCHAR(37),
  "name" TEXT,
  "email" TEXT UNIQUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "expenses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INT,
  "categories_id" INT,
  "date" DATE NOT NULL,
  "amount" numeric(10,2),
  "message" VARCHAR(255),
  "receipt_id" INT,
  "name" text,
  "vendor" text,
);

CREATE TABLE "receipts" (
  "id" SERIAL PRIMARY KEY,
  "imgurl" TEXT,
);

CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT
);


