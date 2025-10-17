import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  // port: 3306,          // change to 3306 if that's your MySQL port
  user: "root",
  password: "root",
  database: "premove",
  // waitForConnections: true,
  // connectionLimit: 10,   // adjust based on load
  // queueLimit: 0,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connect error:", err);
  } else {
    console.log("✅ MySQL Connected...");
  }
});


export default db
