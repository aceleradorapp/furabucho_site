import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MessageCircle, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { PrivateLayout } from '../components/PrivateLayout';

interface PostComment {
  id: number;
  text: string;
  user: { id: number; name: string };
}

interface FeedPost {
  id: number;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  author: { id: number; name: string; avatarUrl: string | null };
  likeCount: number;
  likedByMe: boolean;
  comments: PostComment[];
}

const UPLOADS_BASE = 'http://localhost:4321';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [caption, setCaption] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [burstOn, setBurstOn] = useState<Record<number, boolean>>({});

  async function load() {
    const data = await api.get<FeedPost[]>('/posts');
    setPosts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreatePost(file: File) {
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption);
    await api.post('/posts', form);
    setCaption('');
    setComposerOpen(false);
    await load();
  }

  async function handleLike(post: FeedPost) {
    if (!post.likedByMe) {
      setBurstOn((prev) => ({ ...prev, [post.id]: true }));
      setTimeout(() => setBurstOn((prev) => ({ ...prev, [post.id]: false })), 700);
    }
    await api.post(`/posts/${post.id}/like`);
    await load();
  }

  async function handleComment(postId: number) {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    await api.post(`/posts/${postId}/comments`, { text });
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    await load();
  }

  return (
    <PrivateLayout>
      <div className="max-w-xl mx-auto py-6 px-2 sm:px-4">
        <AnimatePresence>
          {composerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-2xl border border-border p-4">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva uma legenda..."
                  rows={2}
                  className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary mb-3 text-sm"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCreatePost(e.target.files[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm rounded-full bg-primary hover:bg-primary-hover text-white px-4 py-2 transition"
                >
                  <Plus size={16} /> Escolher foto e publicar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <article key={post.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <header className="flex items-center gap-2 px-4 py-3">
                <Avatar name={post.author.name} avatarUrl={post.author.avatarUrl} size={32} />
                <div>
                  <p className="text-sm font-medium text-text-main">{post.author.name}</p>
                  <p className="text-xs text-text-muted">{timeAgo(post.createdAt)}</p>
                </div>
              </header>

              <div className="relative" onDoubleClick={() => handleLike(post)}>
                <img
                  src={`${UPLOADS_BASE}${post.imageUrl}`}
                  alt={post.caption ?? ''}
                  className="w-full aspect-square object-cover"
                />
                <AnimatePresence>
                  {burstOn[post.id] && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <Heart size={90} className="text-white drop-shadow-lg" fill="currentColor" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-4 py-3">
                <div className="flex items-center gap-4 mb-2">
                  <motion.button whileTap={{ scale: 1.3 }} onClick={() => handleLike(post)} className="flex items-center gap-1.5">
                    <Heart
                      size={22}
                      className={post.likedByMe ? 'text-primary' : 'text-text-main'}
                      fill={post.likedByMe ? 'currentColor' : 'none'}
                    />
                    <span className="text-sm text-text-main">{post.likeCount}</span>
                  </motion.button>
                  <span className="flex items-center gap-1.5 text-text-main">
                    <MessageCircle size={22} />
                    <span className="text-sm">{post.comments.length}</span>
                  </span>
                </div>

                {post.caption && (
                  <p className="text-sm text-text-main mb-2">
                    <span className="font-medium mr-1.5">{post.author.name}</span>
                    {post.caption}
                  </p>
                )}

                {post.comments.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {post.comments.map((c) => (
                      <p key={c.id} className="text-sm">
                        <span className="font-medium text-text-main">{c.user.name}</span>{' '}
                        <span className="text-text-muted">{c.text}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <input
                    value={commentDrafts[post.id] ?? ''}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                    placeholder="Comente..."
                    className="flex-1 text-sm outline-none py-1.5"
                  />
                  <button onClick={() => handleComment(post.id)} className="text-primary" aria-label="Enviar comentário">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {posts.length === 0 && (
            <div className="text-center text-text-muted py-16">
              <p>Nenhuma postagem ainda.</p>
            </div>
          )}
        </div>
      </div>

      {user?.permissions.canManagePosts && !composerOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setComposerOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-5 md:right-10 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center z-20"
          aria-label="Nova postagem"
        >
          <Plus size={26} />
        </motion.button>
      )}
    </PrivateLayout>
  );
}
