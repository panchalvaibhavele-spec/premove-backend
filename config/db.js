import mysql from "mysql2";

// Create a connection pool (recommended for production)
const db = mysql.createPool({
  host: "srv917.hstgr.io",
  port: 3306,
  user: "u874477730_unitedgulf",
  password: "O$y2W$=[6!N#",
  database: "u874477730_unitedgulf",
  waitForConnections: true,
  connectionLimit: 10,   // adjust if needed
  queueLimit: 0,
});

// ✅ Test database connection once when server starts
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connect error:", err.message);
  } else {
    console.log("✅ MySQL Pool Connected...");
    connection.release(); // release connection back to pool
  }
});

export default db;
