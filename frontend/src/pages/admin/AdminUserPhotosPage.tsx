import { Download, ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Avatar } from '../../components/Avatar';
import { PageLoader } from '../../components/PageLoader';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';

interface MemberUser {
  id: number;
  name: string;
  nickname: string | null;
  username: string;
  avatarUrl: string | null;
}

function extensionFromUrl(url: string) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1] : 'jpg';
}

export function AdminUserPhotosPage() {
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MemberUser[]>('/admin/users').then(setUsers).finally(() => setLoading(false));
  }, []);

  async function handleDownload(u: MemberUser) {
    if (!u.avatarUrl) return;
    setDownloadingId(u.id);
    try {
      const fullUrl = `${UPLOADS_BASE}${u.avatarUrl}`;
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${u.username}-foto-perfil.${extensionFromUrl(u.avatarUrl)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloadingId(null);
    }
  }

  const withPhoto = users.filter((u) => u.avatarUrl);
  const withoutPhoto = users.filter((u) => !u.avatarUrl);

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Fotos de Perfil</h1>
        <p className="text-sm text-text-muted mb-6">
          Veja e baixe a foto de perfil de cada membro cadastrado no sistema.
        </p>

        {loading ? (
          <PageLoader />
        ) : withPhoto.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <ImageIcon size={32} className="text-border" />
            <p className="text-sm">Nenhum membro com foto de perfil ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {withPhoto.map((u) => (
              <div key={u.id} className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4">
                <Avatar name={u.name} avatarUrl={u.avatarUrl} size={72} />
                <p className="text-sm font-medium text-text-main text-center truncate w-full">{u.nickname || u.name}</p>
                <button
                  onClick={() => handleDownload(u)}
                  disabled={downloadingId === u.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border hover:border-primary hover:text-primary text-text-muted text-xs font-medium px-3 py-1.5 transition disabled:opacity-50"
                >
                  <Download size={13} /> {downloadingId === u.id ? 'Baixando...' : 'Baixar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {withoutPhoto.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Sem foto de perfil ({withoutPhoto.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {withoutPhoto.map((u) => (
                <div key={u.id} className="flex items-center gap-2 bg-card-subtle rounded-full pl-1 pr-3 py-1">
                  <Avatar name={u.name} avatarUrl={null} size={28} />
                  <span className="text-xs text-text-muted">{u.nickname || u.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
