import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root",
  database: process.env.DB_NAME || "premove",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
  queueLimit: 0,
});

db.on('connection', (connection) => {
  connection.query(
    "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))",
    (err) => {
      if (err) console.error("❌ Failed to set sql_mode for connection:", err);
    }
  );
});

function testConnection() {
  db.getConnection((err, conn) => {
    if (err) {
      console.error("❌ Database connect error:", err);
    } else {
      console.log("✅ MySQL Connected...");
      if (conn) conn.release();
    }
  });
}
testConnection();

export default db;
