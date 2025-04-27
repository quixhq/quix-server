import express from 'express'
import http from 'http'
import { Server, Socket } from 'socket.io'

// const app = express();
// const server = http.createServer(app);
const io = new Server(5175, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://slidesyncmobile.web.app',
      'https://yashjawale.github.io',
    ],
  },
})

interface ClientData {
  socketId: string
  displayName: string
  inactive?: boolean
}

interface QuizRoom {
  creator: string
  clients: Record<string, ClientData> // uuid -> ClientData
  questions: any[] // You can define a proper question structure
}

const dummyQuestions = [
  {
    questionId: '1',
    question: 'What is the capital of France?',
    options: [
      { optionId: '1', text: 'Berlin' },
      { optionId: '2', text: 'Madrid' },
      { optionId: '3', text: 'Paris' },
      { optionId: '4', text: 'Rome' },
    ],
    answerKey: ['3'],
  },
  {
    questionId: '2',
    question: 'What is the largest planet in our solar system?',
    options: [
      { optionId: '1', text: 'Earth' },
      { optionId: '2', text: 'Jupiter' },
      { optionId: '3', text: 'Mars' },
      { optionId: '4', text: 'Saturn' },
    ],
    answerKey: ['2'],
  },
  {
    questionId: '3',
    question: 'What is the chemical symbol for gold?',
    options: [
      { optionId: '1', text: 'Au' },
      { optionId: '2', text: 'Ag' },
      { optionId: '3', text: 'Fe' },
      { optionId: '4', text: 'Hg' },
    ],
    answerKey: ['1'],
  },
  {
    questionId: '4',
    question: 'What is the smallest prime number?',
    options: [
      { optionId: '1', text: '0' },
      { optionId: '2', text: '1' },
      { optionId: '3', text: '2' },
      { optionId: '4', text: '3' },
    ],
    answerKey: ['3'],
  },
]

const quizRooms: Record<string, QuizRoom> = {} // sessionId -> QuizRoom
const SESSION_ID = '1234' // TODO: Generate unique session ID
io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`)

  socket.on('ping-creator', () => {
    console.log('🔔 Ping from creator:', socket.id)
  })

  socket.on(
    'launch-quiz',
    ({ sessionId = SESSION_ID }: { sessionId: string }) => {
      quizRooms[sessionId] = {
        creator: socket.id,
        clients: {},
        questions: [dummyQuestions],
      }
      socket.join(sessionId)
      console.log(`Quiz created with sessionId: ${sessionId}`)
      // send sessionId to creator
      socket.emit('launch-quiz-response', {
        status: 'success',
        sessionId,
      })
    }
  )

  socket.on('join-quiz', (sessionId: string) => {
    const uuid = Math.floor(Math.random() * 1000).toString()
    const displayName = 'Guest' + Math.floor(Math.random() * 1000)
    const room = quizRooms[sessionId]
    if (!room) {
      console.error(`Session ${sessionId} not found.`)
      return
    }

    room.clients[uuid] = {
      socketId: socket.id,
      displayName,
    }
    socket.join(sessionId)
    console.log(`Client ${uuid} joined session ${sessionId}`)
    // TODO: Send quiz data to participant device.
    // dummy data
    const quizData = {
      sessionId,
      questions: room.questions,
      clients: Object.values(room.clients).map((client) => ({
        uuid: client.socketId,
        displayName: client.displayName,
      })),
    }
    // once creator accepts the request, send quiz data to client
    socket.emit('join-quiz-response', {
      status: 'accepted',
      quizData,
      uuid,
    })

    console.log('sending user-joined event to creator:', room.creator)
    if (!io.sockets.sockets.has(room.creator)) {
      console.error(
        `❌ Creator socket (${room.creator}) is not connected! Cannot emit user-joined.`
      )
      return
    }
    io.to(room.creator).emit('user-joined', {
      uuid,
      displayName,
      quizData,
    })
  })

  socket.on(
    'next-question-from-creator',
    ({
      sessionId,
      questionId,
      decryptionKey,
    }: {
      sessionId: string
      questionId: string
      decryptionKey: string
    }) => {
      io.to(sessionId).emit('next-question', { questionId, decryptionKey })
    }
  )

  socket.on('submit-answer-from-client', (uuid: string) => {
    const sessionId = SESSION_ID
    const questionId = '1'
    const optionId = '3'
    const room = quizRooms[sessionId]
    console.log('uuid from client:', uuid)
    // validate uuid
    if (!room || !room.clients[uuid]) {
      console.error(`UUID ${uuid} not found in session ${sessionId}.`)
      return
    }

    // send answer to creator
    console.log(
      `UUID ${uuid} submitted answer ${optionId} for question ${questionId}`
    )

    if (room) {
      io.to(room.creator).emit('submit-answer', {
        uuid,
        questionId,
        optionId,
      })
    }
  })

  // get correct answer from creator
  socket.on(
    'correct-answer-from-creator',
    ({
      sessionId = SESSION_ID,
      questionId = '1',
      correctOptionIds = ['3'],
    }: {
      sessionId: string
      questionId: string
      correctOptionIds: string[]
    }) => {
      io.to(sessionId).emit('correct-answer', {
        questionId,
        correctOptionIds,
      })
    }
  )

  socket.on(
    'declare-result-from-creator',
    ({
      sessionId,
      leaderboardData,
    }: {
      sessionId: string
      leaderboardData: any // TODO: Define result data structure
    }) => {
      io.to(sessionId).emit('declare-result', leaderboardData)
    }
  )

  // LATER: after first working prototype.

  // socket.on('synchronisation-from-client', ({ sessionId, uuid }: { sessionId: string; uuid: string }) => {
  //   const room = quizRooms[sessionId];
  //   if (room && room.clients[uuid]) {
  //     room.clients[uuid].socketId = socket.id;
  //     socket.join(sessionId);
  //     console.log(`UUID ${uuid} reconnected to session ${sessionId}`);
  //   }
  // });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`)

    for (const sessionId in quizRooms) {
      const room = quizRooms[sessionId]

      if (room.creator === socket.id) {
        io.to(sessionId).emit('creator-disconnect')
        delete quizRooms[sessionId]
      } else {
        for (const uuid in room.clients) {
          if (room.clients[uuid].socketId === socket.id) {
            room.clients[uuid].inactive = true
            io.to(room.creator).emit('client-disconnect-from-client', { uuid })
            break
          }
        }
      }
    }
  })
})

// server.listen(3000, () => {
//   console.log('Bridge server is running on http://localhost:3000');
// });
