import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban,
  BadgeCheck,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldAlert,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { PostComposerModal } from '../components/PostComposerModal';
import { PrivateLayout } from '../components/PrivateLayout';
import { UPLOADS_BASE } from '../lib/config';

interface PostUser {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

interface PostComment {
  id: number;
  text: string;
  user: PostUser;
}

interface FeedPost {
  id: number;
  mediaType: 'image' | 'video' | 'text';
  imageUrl: string | null;
  caption: string | null;
  blocked: boolean;
  createdAt: string;
  author: {
    id: number;
    name: string;
    avatarUrl: string | null;
    nickname: string | null;
    isPontaFirme: boolean;
    isVeterano: boolean;
    role: string;
  };
  likeCount: number;
  likedByMe: boolean;
  likedBy: PostUser[];
  comments: PostComment[];
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function AuthorName({ author }: { author: FeedPost['author'] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {author.nickname || author.name}
      {author.isPontaFirme && <BadgeCheck size={14} className="text-primary shrink-0" />}
    </span>
  );
}

function likedByText(likedBy: PostUser[]) {
  const names = likedBy.map((u) => u.nickname || u.name);
  if (names.length === 1) return `Curtido por ${names[0]}`;
  if (names.length === 2) return `Curtido por ${names[0]} e ${names[1]}`;
  if (names.length === 3) return `Curtido por ${names[0]}, ${names[1]} e ${names[2]}`;
  return `Curtido por ${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}

function LikedByLine({ likedBy }: { likedBy: PostUser[] }) {
  if (likedBy.length === 0) return null;
  const preview = likedBy.slice(0, 3);

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex -space-x-2">
        {preview.map((u) => (
          <span key={u.id} className="rounded-full ring-2 ring-card">
            <Avatar name={u.nickname || u.name} avatarUrl={u.avatarUrl} size={18} />
          </span>
        ))}
      </div>
      <span className="text-xs text-text-muted">{likedByText(likedBy)}</span>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-card-subtle" />
        <div className="flex-1">
          <div className="h-3 w-28 bg-card-subtle rounded mb-1.5" />
          <div className="h-2.5 w-16 bg-card-subtle rounded" />
        </div>
      </div>
      <div className="w-full aspect-square bg-card-subtle" />
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="h-4 w-24 bg-card-subtle rounded" />
        <div className="h-3 w-full bg-card-subtle rounded" />
        <div className="h-3 w-2/3 bg-card-subtle rounded" />
      </div>
    </div>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();
  const [postDestacado, setPostDestacado] = useState<number | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [burstOn, setBurstOn] = useState<Record<number, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  async function load() {
    const data = await api.get<FeedPost[]>('/posts');
    setPosts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Um aviso do sino chega como /feed#post-123. Só dá pra rolar depois que as publicações
  // carregaram, por isso o efeito também depende de `posts`. O destaque é temporário: serve pra
  // pessoa achar a publicação com o olho, não pra ficar marcada.
  useEffect(() => {
    const alvo = location.hash.match(/^#post-(\d+)$/);
    if (!alvo || posts.length === 0) return;

    const id = Number(alvo[1]);
    const el = document.getElementById(`post-${id}`);
    // A publicação pode não estar aqui: foi apagada, ou bloqueada e some pra quem não modera.
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPostDestacado(id);
    const timer = setTimeout(() => setPostDestacado(null), 2500);
    return () => clearTimeout(timer);
  }, [location.hash, posts]);

  const postsToday = user ? posts.filter((p) => p.author.id === user.id && isToday(p.createdAt)).length : 0;
  const dailyLimit = user?.dailyPostLimit ?? 0;
  const limitReached = dailyLimit > 0 && postsToday >= dailyLimit;

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

  async function handleToggleBlock(post: FeedPost) {
    await api.patch(`/posts/${post.id}/block`, { blocked: !post.blocked });
    await load();
  }

  async function handleDeletePost(postId: number) {
    if (!(await confirm({ title: 'Excluir esta postagem definitivamente?', variant: 'danger' }))) return;
    await api.delete(`/posts/${postId}`);
    await load();
  }

  async function handleDeleteComment(commentId: number) {
    if (!(await confirm({ title: 'Apagar este comentário?', variant: 'danger' }))) return;
    await api.delete(`/posts/comments/${commentId}`);
    await load();
  }

  return (
    <PrivateLayout>
      <div className="max-w-xl mx-auto py-6 px-2 sm:px-4">
        {user?.permissions['feed.create'] && (
          <>
            <button
              onClick={() => !limitReached && setComposerOpen(true)}
              disabled={limitReached}
              className={`w-full flex items-center gap-3 bg-card rounded-2xl border border-border px-4 py-3 mb-1.5 text-left transition ${
                limitReached ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              <Avatar name={user.name} avatarUrl={user.avatarUrl} size={38} role={user.role} isPontaFirme={user.isPontaFirme} isVeterano={user.isVeterano} />
              <span className="text-sm text-text-muted flex-1">
                {limitReached ? `Limite de ${dailyLimit} publicações por dia atingido` : 'No que você está pensando?'}
              </span>
              {!limitReached && (
                <>
                  <ImageIcon size={19} className="text-green-600 shrink-0" />
                  <Video size={19} className="text-purple-600 shrink-0" />
                </>
              )}
            </button>
            {dailyLimit > 0 && (
              <p className="text-xs text-text-muted mb-5 px-1">
                {limitReached
                  ? 'Volte amanhã para publicar de novo.'
                  : `${postsToday}/${dailyLimit} publicações hoje`}
              </p>
            )}
            {dailyLimit === 0 && <div className="mb-5" />}
          </>
        )}

        <div className="flex flex-col gap-4">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}

          {!loading &&
            posts.map((post) => {
              const visibleComments = expandedComments[post.id] ? post.comments : post.comments.slice(-2);
              const hiddenCount = post.comments.length - visibleComments.length;
              const isAuthor = post.author.id === user?.id;
              const canModerate = !!user?.permissions['feed.moderate'];

              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className={`bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow scroll-mt-20 ${
                    post.blocked ? 'border-red-300' : 'border-border'
                  } ${postDestacado === post.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card-subtle' : ''}`}
                >
                  <header className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={post.author.name} avatarUrl={post.author.avatarUrl} size={32} role={post.author.role} isPontaFirme={post.author.isPontaFirme} isVeterano={post.author.isVeterano} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-main truncate">
                          <AuthorName author={post.author} />
                        </p>
                        <p className="text-xs text-text-muted">{timeAgo(post.createdAt)}</p>
                      </div>
                      {post.blocked && (
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full ml-1 shrink-0">
                          bloqueado
                        </span>
                      )}
                    </div>

                    {(isAuthor || canModerate) && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            className="p-1.5 rounded-full hover:bg-card-subtle text-text-muted shrink-0"
                            aria-label="Opções da publicação"
                          >
                            {canModerate ? <ShieldAlert size={18} /> : <MoreHorizontal size={18} />}
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            className="bg-card rounded-xl shadow-2xl border border-border py-2 min-w-[180px] z-40"
                          >
                            {canModerate && (
                              <DropdownMenu.Item
                                onSelect={() => handleToggleBlock(post)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none cursor-pointer"
                              >
                                <Ban size={16} /> {post.blocked ? 'Desbloquear' : 'Bloquear'}
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item
                              onSelect={() => handleDeletePost(post.id)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-card-subtle outline-none cursor-pointer"
                            >
                              <Trash2 size={16} /> {isAuthor && !canModerate ? 'Apagar minha publicação' : 'Excluir'}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                  </header>

                  {post.mediaType === 'text' ? (
                    <div
                      className="relative bg-gradient-to-br from-[#FF5E14] to-[#B83700] text-white px-8 py-14 flex items-center justify-center text-center min-h-[200px]"
                      onDoubleClick={() => handleLike(post)}
                    >
                      <p className="text-xl sm:text-2xl font-semibold leading-snug max-w-md whitespace-pre-line">
                        {post.caption}
                      </p>
                      <LikeBurst show={!!burstOn[post.id]} />
                    </div>
                  ) : post.mediaType === 'video' ? (
                    <video
                      src={`${UPLOADS_BASE}${post.imageUrl}`}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[560px] bg-black"
                    />
                  ) : (
                    <div className="relative" onDoubleClick={() => handleLike(post)}>
                      <img
                        src={`${UPLOADS_BASE}${post.imageUrl}`}
                        alt={post.caption ?? ''}
                        className="w-full aspect-square object-cover"
                      />
                      <LikeBurst show={!!burstOn[post.id]} />
                    </div>
                  )}

                  <div className="px-4 py-3">
                    <div className="flex items-center gap-4 mb-2">
                      <motion.button
                        whileTap={{ scale: 1.3 }}
                        onClick={() => handleLike(post)}
                        className="flex items-center gap-1.5"
                        aria-label="Curtir"
                      >
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

                    <LikedByLine likedBy={post.likedBy} />

                    {post.mediaType !== 'text' && post.caption && (
                      <p className="text-sm text-text-main mb-2">
                        <span className="font-medium mr-1.5">
                          <AuthorName author={post.author} />
                        </span>
                        {post.caption}
                      </p>
                    )}

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => setExpandedComments((prev) => ({ ...prev, [post.id]: true }))}
                        className="text-sm text-text-muted mb-1.5 hover:underline"
                      >
                        Ver todos os {post.comments.length} comentários
                      </button>
                    )}

                    {visibleComments.length > 0 && (
                      <div className="flex flex-col gap-2 mb-2">
                        {visibleComments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 group">
                            <Avatar name={c.user.nickname || c.user.name} avatarUrl={c.user.avatarUrl} size={24} />
                            <p className="text-sm leading-snug flex-1">
                              <span className="font-medium text-text-main">{c.user.nickname || c.user.name}</span>{' '}
                              <span className="text-text-muted">{c.text}</span>
                            </p>
                            {(c.user.id === user?.id || canModerate) && (
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="shrink-0 p-1 -m-1 text-text-muted/50 hover:text-red-600 transition"
                                aria-label="Apagar comentário"
                                title="Apagar comentário"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
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
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentDrafts[post.id]?.trim()}
                        className="text-primary disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label="Enviar comentário"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

          {!loading && posts.length === 0 && (
            <div className="text-center text-text-muted py-16 flex flex-col items-center gap-2">
              <ImageIcon size={36} className="text-border" />
              <p>Nenhuma postagem ainda.</p>
              {user?.permissions['feed.create'] && <p className="text-sm">Que tal ser o primeiro a publicar algo?</p>}
            </div>
          )}
        </div>
      </div>

      {user?.permissions['feed.create'] && (
        <PostComposerModal open={composerOpen} onOpenChange={setComposerOpen} onPublished={load} />
      )}
    </PrivateLayout>
  );
}

function LikeBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
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
  );
}
