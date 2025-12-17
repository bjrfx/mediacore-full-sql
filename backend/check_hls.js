const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkHLS() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Get all HLS media
  const [rows] = await connection.execute(
    'SELECT id, title, type, file_path, hls_playlist_url, is_hls, file_size FROM media WHERE is_hls = 1 ORDER BY created_at DESC LIMIT 5'
  );

  console.log('HLS Media in Database:');
  console.log(JSON.stringify(rows, null, 2));

  await connection.end();
}

checkHLS().catch(console.error);
