import mysql from "mysql2";

const db = mysql.createPool({
  host: "srv917.hstgr.io",
  port: 3306,
  user: "u874477730_unitedgulf",
  password: "O$y2W$=[6!N#",
  database: "u874477730_unitedgulf",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connect error:", err); // full error object
  } else {
    console.log("✅ MySQL Pool Connected...");
    connection.release();
  }
});

export default db;
