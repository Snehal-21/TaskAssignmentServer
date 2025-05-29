import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import './cron/reminder.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('MongoDB Connected');
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}).catch(err => console.error(err));
