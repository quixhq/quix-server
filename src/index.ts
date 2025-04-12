import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

// const app = express();
// const server = http.createServer(app);
const io = new Server(5173, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://slidesyncmobile.web.app",
			'https://yashjawale.github.io'
    ],
  },
})

interface ClientData {
  socketId: string;
  displayName: string;
  inactive?: boolean;
}

interface QuizRoom {
  creator: string;
  clients: Record<string, ClientData>; // uuid -> ClientData
  questions: any[]; // You can define a proper question structure
}

const quizRooms: Record<string, QuizRoom> = {}; // sessionId -> QuizRoom

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('launch-quiz', ({ sessionId }: { sessionId: string }) => {
    quizRooms[sessionId] = {
      creator: socket.id,
      clients: {},
      questions: [],
    };
    socket.join(sessionId);
    console.log(`Quiz created with sessionId: ${sessionId}`);
  });

  socket.on('join-quiz', ({ sessionId, uuid, displayName }: { sessionId: string; uuid: string; displayName: string }) => {
    const room = quizRooms[sessionId];
    if (!room) return;

    room.clients[uuid] = {
      socketId: socket.id,
      displayName,
    };
    socket.join(sessionId);
		// TODO: Send quiz data to participant device.
    io.to(room.creator).emit('join-request-from-client', { uuid, displayName });
  });

  socket.on('next-question-from-creator', ({
    sessionId,
    questionId,
    decryptionKey,
  }: {
    sessionId: string;
    questionId: string;
    decryptionKey: string;
  }) => {
    io.to(sessionId).emit('next-question', { questionId, decryptionKey });
  });

  socket.on('submit-answer-from-client', ({
    sessionId,
    uuid,
    questionId,
    optionId,
  }: {
    sessionId: string;
    uuid: string;
    questionId: string;
    optionId: string;
  }) => {
    const room = quizRooms[sessionId];
    if (room) {
      io.to(room.creator).emit('submit-answer', { uuid, questionId, optionId });
    }
  });

  socket.on('declare-result-from-creator', ({
    sessionId,
    leaderboardData,
  }: {
    sessionId: string;
    leaderboardData: any; // TODO: Define result data structure
  }) => {
    io.to(sessionId).emit('declare-result', leaderboardData);
  });


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
    console.log(`Socket disconnected: ${socket.id}`);

    for (const sessionId in quizRooms) {
      const room = quizRooms[sessionId];

      if (room.creator === socket.id) {
        io.to(sessionId).emit('creator-disconnect');
        delete quizRooms[sessionId];
      } else {
        for (const uuid in room.clients) {
          if (room.clients[uuid].socketId === socket.id) {
            room.clients[uuid].inactive = true;
            io.to(room.creator).emit('client-disconnect-from-client', { uuid });
            break;
          }
        }
      }
    }
  });
});

// server.listen(3000, () => {
//   console.log('Bridge server is running on http://localhost:3000');
// });
