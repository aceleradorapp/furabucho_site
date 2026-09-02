import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { authRouter } from './routes/auth.routes';
import { usersRouter } from './routes/users.routes';
import { settingsRouter } from './routes/settings.routes';
import { bannersRouter } from './routes/banners.routes';
import { postsRouter } from './routes/posts.routes';
import { rolesRouter } from './routes/roles.routes';
import { profileRouter } from './routes/profile.routes';
import { galleryRouter } from './routes/gallery.routes';
import { announcementsRouter } from './routes/announcements.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOADS_DIR ?? 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/admin/roles', rolesRouter);
app.use('/api/profile', profileRouter);
app.use('/api/galleries', galleryRouter);
app.use('/api/announcements', announcementsRouter);

app.use((err: { code?: string; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande' });
  }
  if (err.message?.startsWith('Formato não suportado') || err.message === 'Formato de imagem não suportado') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

const port = Number(process.env.PORT) || 4321;
app.listen(port, () => console.log(`Fura-Bucho API rodando em http://localhost:${port}`));
