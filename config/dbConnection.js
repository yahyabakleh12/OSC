const mysql = require('mysql2/promise');
const connection = require('./db_config');

const pool = mysql.createPool({
  host: connection.connection.host,
  user: connection.connection.user,
  password: connection.connection.password,
  database: connection.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;


// exports.connectDB = () =>{
//   console.log(connection.connection);
//   return mysql.createConnection(connection.connection);
// };


// basic connection
// const mysql = require('mysql2');

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'OnStreetOSPCloud'
// });

// // Connect
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting: ' + err.stack);
//     return;
//   }
//   console.log('Connected as ID ' + connection.threadId);
// });

// module.exports = connection;