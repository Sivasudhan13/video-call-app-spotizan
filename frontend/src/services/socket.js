import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  return socketInstance;
}

export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
}
