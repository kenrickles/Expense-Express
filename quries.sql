SELECT expenses.date, expenses.amount, expenses.name, categories.name AS categories_name FROM expenses INNER JOIN categories ON expenses.categories_id = categories.id WHERE expenses.user_id = 1;

SELECT expenses.date, expenses.amount, expenses.name, expenses.message, categories.name AS categories_name, receipts.imgurl AS receipt_imagelink, receipts."vendor name" AS receipt_vendor, receipts."item name" AS item_name  FROM expenses 
INNER JOIN categories 
ON expenses.categories_id = categories.id 
LEFT JOIN receipts 
ON expenses.receipt_id = receipts.id 
WHERE expenses.user_id = 7
AND expenses.id = 1;



INSERT INTO expenses (date, name, amount, categories_id, user_id, message) VALUES('2020/12/1', 'Lunch', 200, 2, 7, 'This was a good lunch');