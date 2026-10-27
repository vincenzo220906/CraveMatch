CREATE DATABASE IF NOT EXISTS cravematch;
USE cravematch;

CREATE TABLE IF NOT EXISTS food_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  portion_grams INT NOT NULL DEFAULT 250,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  review_count INT NOT NULL DEFAULT 0,
  quality_approved TINYINT(1) NOT NULL DEFAULT 1,
  quality_status VARCHAR(40) NOT NULL DEFAULT 'Demo verified',
  description TEXT,
  cravings VARCHAR(255) NOT NULL DEFAULT '',
  image_url TEXT,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  is_surplus TINYINT(1) NOT NULL DEFAULT 0,
  surplus_quantity INT NOT NULL DEFAULT 0,
  collection_deadline DATETIME NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(120) NOT NULL DEFAULT 'Demo User',
  budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Placed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  food_id INT NOT NULL,
  food_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  food_id INT NOT NULL,
  rating TINYINT NOT NULL,
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating BETWEEN 1 AND 5)
);

INSERT INTO food_items
(name, category, price, portion_grams, rating, review_count, quality_approved, quality_status, description, cravings, image_url, is_available, is_surplus, surplus_quantity, collection_deadline)
SELECT * FROM (
 SELECT 'Paneer Biryani','Rice',120,400,4.7,86,1,'Demo verified','Fragrant rice with paneer and spices','spicy,comforting,savory','https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800',1,0,0,NULL
 UNION ALL SELECT 'Veg Fried Rice','Rice',90,350,4.4,53,1,'Demo verified','Vegetable fried rice','savory,comforting,quick','https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',1,0,0,NULL
 UNION ALL SELECT 'Masala Dosa','South Indian',70,300,4.6,102,1,'Demo verified','Crispy dosa with potato masala','crispy,comforting,savory','https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800',1,0,0,NULL
 UNION ALL SELECT 'Chilli Paneer','Starter',110,250,4.5,68,1,'Demo verified','Spicy paneer with peppers','spicy,crispy,savory','https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800',1,0,0,NULL
 UNION ALL SELECT 'Gulab Jamun','Dessert',50,180,4.8,140,1,'Demo verified','Soft syrup-soaked dessert','sweet,comforting','https://images.unsplash.com/photo-1666190092159-3c7a4a8a1f7d?w=800',1,1,8,DATE_ADD(NOW(), INTERVAL 3 HOUR)
 UNION ALL SELECT 'Veg Thali','Meals',100,500,4.5,74,1,'Demo verified','Balanced meal with rice and sides','comforting,savory,healthy','https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',1,0,0,NULL
 UNION ALL SELECT 'Crispy Potato Bites','Snack',65,220,4.2,31,1,'Demo verified','Crunchy seasoned potato bites','crispy,spicy','https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800',1,1,5,DATE_ADD(NOW(), INTERVAL 2 HOUR)
 UNION ALL SELECT 'Chocolate Brownie','Dessert',80,160,4.6,95,1,'Demo verified','Rich chocolate brownie','sweet,chocolate,comforting','https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800',1,0,0,NULL
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM food_items LIMIT 1);
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'restaurant', 'admin')
        NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
