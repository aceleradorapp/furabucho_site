import { MessageSquare, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PrivateLayout } from '../../components/PrivateLayout';

interface PioneiroComment {
  id: number;
  text: string;
  createdAt: string;
  pioneiro: { id: number; name: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AdminPioneiroCommentsPage() {
  const confirm = useConfirm();
  const [comments, setComments] = useState<PioneiroComment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api.get<PioneiroComment[]>('/admin/pioneiros/comments');
    setComments(data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const byPioneiro = useMemo(() => {
    const map = new Map<number, { name: string; comments: PioneiroComment[] }>();
    for (const comment of comments) {
      const entry = map.get(comment.pioneiro.id) ?? { name: comment.pioneiro.name, comments: [] };
      entry.comments.push(comment);
      map.set(comment.pioneiro.id, entry);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ pioneiroId: id, ...data }))
      .sort((a, b) => new Date(b.comments[0].createdAt).getTime() - new Date(a.comments[0].createdAt).getTime());
  }, [comments]);

  async function handleDelete(comment: PioneiroComment) {
    const ok = await confirm({
      title: 'Excluir este comentário?',
      description: 'Isso remove o comentário definitivamente. Os pontos já ganhos pela pessoa não são afetados.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/admin/pioneiros/comments/${comment.id}`);
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
  }

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">
          Comentários do Programa Pioneiros
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Só admin e ajudante veem tudo aqui — cada pessoa só vê os próprios comentários na área dela. Remova o que
          for ofensivo ou inadequado; o resto fica guardado pra usarmos mais pra frente.
        </p>

        {loading ? (
          <p className="text-sm text-text-muted">Carregando...</p>
        ) : byPioneiro.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <MessageSquare size={32} className="text-border" />
            <p className="text-sm">Nenhum comentário enviado ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {byPioneiro.map(({ pioneiroId, name, comments: pioneiroComments }) => (
              <div key={pioneiroId} className="border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 bg-card-subtle px-4 py-3 border-b border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserRound size={15} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-text-main">{name}</p>
                  <span className="text-xs text-text-muted">
                    {pioneiroComments.length} comentário{pioneiroComments.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-border">
                  {pioneiroComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-main leading-relaxed">{comment.text}</p>
                        <p className="text-xs text-text-muted mt-1">{formatDate(comment.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(comment)}
                        className="shrink-0 text-text-muted hover:text-red-600 transition p-1.5"
                        aria-label="Excluir comentário"
                        title="Excluir comentário"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
