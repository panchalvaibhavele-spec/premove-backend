import mysql from "mysql2";

const db = mysql.createPool({

//     DB_HOST=srv917.hstgr.io
// DB_PORT=3306
// DB_USER=u874477730_unitedgulf
// DB_PASS=O$y2W$=[6!N#
// DB_NAME=u874477730_unitedgulf

  host: "13.49.243.156",
  port: 3306,          // change to 3306 if that's your MySQL port
  user: "eleuser",
  password: "EleRoot@123",
  database: "premove",

  // host: "srv917.hstgr.io",
  // port: 3306,          // change to 3306 if that's your MySQL port
  // user: "u874477730_unitedgulf",
  // password: "O$y2W$=[6!N#",
  // database: "u874477730_unitedgulf",
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







// db.js
// import mysql from "mysql2";
// import dotenv from "dotenv";

// dotenv.config(); // ✅ Load environment variables from .env file

// // ✅ Create MySQL connection pool
// const db = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// // ✅ Check connection
// db.getConnection((err, connection) => {
//   if (err) {
//     console.error("❌ Database connection failed:", err.message);
//   } else {
//     console.log("✅ MySQL Connected Successfully!");
//     connection.release(); // release back to pool
//   }
// });

// export default db;
