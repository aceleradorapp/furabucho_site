import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { authRouter } from './routes/auth.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOADS_DIR ?? 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

const port = Number(process.env.PORT) || 4321;
app.listen(port, () => console.log(`Fura-Bucho API rodando em http://localhost:${port}`));
