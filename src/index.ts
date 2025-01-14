import { Server as SocketServer } from 'socket.io'

const io = new SocketServer(3000, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://slidesyncmobile.web.app',
    ],
  },
})

io.on('connection', (socket) => {
  console.log('a user connected')
  socket.on('disconnect', () => {
    console.log('a user disconnected')
  })
})
