import mysql from "mysql2";

const db = mysql.createPool({

//     DB_HOST=srv917.hstgr.io
// DB_PORT=3306
// DB_USER=u874477730_unitedgulf
// DB_PASS=O$y2W$=[6!N#
// DB_NAME=u874477730_unitedgulf

  host: "srv917.hstgr.io",
  port: 3306,          // change to 3306 if that's your MySQL port
  user: "u874477730_unitedgulf",
  password: "O$y2W$=[6!N#",
  database: "u874477730_unitedgulf",
  // waitForConnections: true,
  // connectionLimit: 10,   // adjust based on load
  // queueLimit: 0,
});

db.getConnection((err) => {
  if (err) {
    console.error("❌ Database connect error:", err);
  } else {
    console.log("✅ MySQL Connected...");
  }
});


export default db
