const net = require('net');

const client = new net.Socket();
client.setTimeout(5000);

client.connect(3306, 'coolstaffagency.com', function() {
    console.log('Port 3306 is OPEN');
    client.destroy();
});

client.on('error', function(err) {
    console.log('Port 3306 is CLOSED or UNREACHABLE:', err.message);
});

client.on('timeout', function() {
    console.log('Port 3306 connection TIMED OUT');
    client.destroy();
});
