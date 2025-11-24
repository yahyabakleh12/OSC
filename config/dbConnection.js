var connection = require('./db_config');
const mysql = require('mysql2/promise');
async function connectDB() {
  return await mysql.createConnection({
    host: connection.connection.host,
    user: connection.connection.user,
    password: connection.connection.password,
    database: connection.database,
  });
}

module.exports = connectDB;


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