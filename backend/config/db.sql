CREATE DATABASE receipt_analyzer;
USE receipt_analyzer;

-- Create tables for storing receipt data
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    store_location VARCHAR(255),
    receipt_date DATE,
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipt_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id INT,
    name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    category_id INT,
    category_name VARCHAR(50),
    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    color_code VARCHAR(7) DEFAULT '#CCCCCC'
);

-- Prepopulate categories
INSERT INTO categories (category_id, category_name, color_code) VALUES
(1, 'Groceries & Snacks', '#4CAF50'),
(2, 'Beverages', '#2196F3'),
(3, 'Household Items', '#F44336'),
(4, 'Food & Dining', '#FF9800'),
(5, 'Household Items', '#9C27B0'),
(6, 'Health & Beauty', '#E91E63'),
(7, 'Office Supplies', '#607D8B'),
(8, 'Entertainment', '#673AB7'),
(9, 'Transportation', '#795548'),
(10, 'Services', '#009688'),
(11, 'Others', '#9E9E9E');