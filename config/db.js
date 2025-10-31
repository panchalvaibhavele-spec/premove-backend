import mysql from "mysql2";

const db = mysql.createPool({
  host: "13.49.243.156",
  port: 3306,
  user: "eleuser",
  password: "EleRoot@123",
  database: "myappdb",
  // host: "localhost",
  // // port: 3306,
  // user: "root",
  // password: "root",
  // database: "premove",
  // waitForConnections: true,
  // connectionLimit: 10,
  // queueLimit: 0,
});

// ✅ Automatically set session sql_mode for every new connection
db.on('connection', (connection) => {
  connection.query(
    "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))",
    (err) => {
      if (err) console.error("❌ Failed to set sql_mode for connection:", err);
    }
  );
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
