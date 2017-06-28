#!/bin/sh
ELECTRON_RUN_AS_NODE=1 \
ELECTRON_NO_ATTACH_CONSOLE=1 \
ATOM_ASKPASS_QUERY="$@" \
exec "$ATOM_ELECTRON_PATH" <<JavaScript
const question = process.env.ATOM_ASKPASS_QUERY;
const socketPath = process.env.ATOM_ASKPASS_SOCKET_PATH;
const net = require('net');
const socket = net.connect(socketPath, () => {
  let responseJSON = '';
  socket.on('data', data => responseJSON += data.toString('utf8'));
  socket.on('end', () => {
    const response = JSON.parse(responseJSON);
    if (response == null) {
      console.error('Cancelled');
      process.exit(1);
    }
    console.log(response);
  });
  socket.write(question + '\u0000', 'utf8');
});
JavaScript
