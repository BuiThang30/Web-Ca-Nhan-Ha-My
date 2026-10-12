const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

// Khởi tạo DB (bỏ qua console verbose để tránh log rác)
const db = new Database(dbPath);
console.log('Đã kết nối với SQLite database bằng better-sqlite3.');

// Khởi tạo bảng đồng bộ
db.exec(`
    CREATE TABLE IF NOT EXISTS financial_donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        group_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supply_donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        items TEXT NOT NULL,
        details TEXT,
        dropoff TEXT,
        email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        age REAL NOT NULL, 
        height REAL NOT NULL, 
        weight REAL NOT NULL, 
        gender TEXT NOT NULL, 
        group_class TEXT
    );
`);

module.exports = db;