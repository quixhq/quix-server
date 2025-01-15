import { Server as SocketServer } from 'socket.io'

const io = new SocketServer(3000, {
  cors: {
    origin: ['http://localhost:5173'],
  },
})

const SessionMap: Record<number, string> = {}

const generateRandomNumber = (digits: number): number => {
  if (digits <= 0) {
    throw new Error('Number of digits must be greater than 0')
  }
  const min = Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  return Math.floor(min + Math.random() * (max - min + 1))
}

const generateNewQuizID = () => {
  let newID: number
  do {
    newID = generateRandomNumber(generateRandomNumber(6))
    console.log(newID)
    console.log(Object.keys(SessionMap).includes(newID.toString()))
  } while (Object.keys(SessionMap).includes(newID.toString()))
  return newID
}

io.on('connection', (socket) => {
  console.log('new connection: ', socket.id)
  socket.on('launch-quiz', (cb) => {
    console.log('launch-quiz')
    const quizID = generateNewQuizID()
    SessionMap[quizID] = socket.id
    console.log('new quiz ID: ', quizID)
  })
  socket.on('disconnecting', (reason, description) => {
    console.log('disconnecting: ', socket.id, reason, description)
    // Clear rooms
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('client-disconnect', socket.id)
      }
    }
  })
  // Disconnection
  socket.on('disconnect', (reason, description) => {
    console.log('disconnect: ', reason, description)
  })
})
