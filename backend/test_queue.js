const http = require('http');

http.get('http://localhost:3000/api/patients/getQueueStatus/69bce0fc0a5687744b90b46b', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
