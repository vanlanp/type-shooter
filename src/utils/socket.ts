import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin // Use the same origin in production
  : 'http://localhost:3000'; // Use localhost in development

export const socket = io(SOCKET_URL);

export default socket; 