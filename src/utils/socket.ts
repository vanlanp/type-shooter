import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD 
  ? `${window.location.protocol}//${window.location.host}` // Use the full URL in production
  : 'http://localhost:3000'; // Use localhost in development

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  forceNew: true,
  autoConnect: true
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Socket reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Socket reconnection error:', error);
});

export default socket; 