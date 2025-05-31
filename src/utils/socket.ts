import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin // Use the current origin
  : 'http://localhost:3000';

console.log('Initializing socket connection to:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['polling', 'websocket'], // Try polling first
  forceNew: true,
  autoConnect: true,
  withCredentials: true
});

// Connection lifecycle debugging
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', {
    message: error.message,
    context: {
      url: SOCKET_URL,
      transport: socket.io.engine.transport.name,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      readyState: socket.io.engine.readyState
    }
  });
});

socket.on('connect', () => {
  console.log('Socket connected successfully:', {
    id: socket.id,
    transport: socket.io.engine.transport.name,
    url: SOCKET_URL,
    protocol: window.location.protocol,
    hostname: window.location.hostname
  });
});

socket.on('error', (error) => {
  console.error('Socket general error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', {
    reason,
    wasConnected: socket.connected,
    transport: socket.io?.engine?.transport?.name,
    readyState: socket.io?.engine?.readyState
  });
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Socket reconnected:', {
    attemptNumber,
    transport: socket.io.engine.transport.name
  });
});

socket.on('reconnect_error', (error) => {
  console.error('Socket reconnection error:', {
    message: error.message,
    transport: socket.io?.engine?.transport?.name
  });
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Socket reconnection attempt:', {
    attemptNumber,
    transport: socket.io?.engine?.transport?.name
  });
});

socket.io.on('packet', (packet) => {
  console.log('Socket packet:', {
    type: packet.type,
    data: packet.data
  });
});

export default socket; 