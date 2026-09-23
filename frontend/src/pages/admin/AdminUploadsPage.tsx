import { Download, HardDrive, ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';

interface UploadFile {
  filename: string;
  size: number;
  modifiedAt: string;
  inUse: boolean;
  usedBy: string[];
}

interface UploadsResponse {
  files: UploadFile[];
  totalSize: number;
  unusedSize: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminUploadsPage() {
  const confirm = useConfirm();
  const [data, setData] = useState<UploadsResponse | null>(null);
  const [showInUse, setShowInUse] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);

  async function load() {
    const res = await api.get<UploadsResponse>('/admin/uploads');
    setData(res);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDownload(file: UploadFile) {
    setBusyFile(file.filename);
    try {
      const res = await fetch(`${UPLOADS_BASE}/uploads/${file.filename}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setBusyFile(null);
    }
  }

  async function handleDelete(file: UploadFile) {
    const ok = await confirm({
      title: `Excluir esse arquivo?`,
      description: `"${file.filename}" (${formatBytes(file.size)}) será apagado do servidor pra sempre. Essa ação não pode ser desfeita.`,
      variant: 'danger',
    });
    if (!ok) return;

    setBusyFile(file.filename);
    try {
      await api.delete(`/admin/uploads/${file.filename}`);
      setData((prev) => (prev ? { ...prev, files: prev.files.filter((f) => f.filename !== file.filename) } : prev));
    } finally {
      setBusyFile(null);
    }
  }

  const unused = data?.files.filter((f) => !f.inUse) ?? [];
  const inUse = data?.files.filter((f) => f.inUse) ?? [];

  return (
    <PrivateLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2 inline-flex items-center gap-2">
          <HardDrive size={22} className="text-primary" /> Arquivos do Servidor
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Imagens enviadas ao site, separadas entre as que estão em uso e as que sobraram e podem ser excluídas.
        </p>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-text-muted mb-1">Total de arquivos</p>
              <p className="text-xl font-bold text-text-main">{data.files.length}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-text-muted mb-1">Espaço total</p>
              <p className="text-xl font-bold text-text-main">{formatBytes(data.totalSize)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-amber-700 mb-1">Não utilizado</p>
              <p className="text-xl font-bold text-amber-700">
                {unused.length} arquivo(s) · {formatBytes(data.unusedSize)}
              </p>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
            Não utilizadas ({unused.length})
          </h2>
          {unused.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-muted">
              <ImageIcon size={28} className="text-border" />
              <p className="text-sm">Nada sobrando por aqui — tudo em uso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {unused.map((file) => (
                <div
                  key={file.filename}
                  className="flex flex-col gap-2 bg-card border border-amber-200 rounded-2xl p-3"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-card-subtle">
                    <img
                      src={`${UPLOADS_BASE}/uploads/${file.filename}`}
                      alt={file.filename}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-text-muted text-center">{formatBytes(file.size)}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={busyFile === file.filename}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-border hover:border-primary hover:text-primary text-text-muted text-xs font-medium px-2 py-1.5 transition disabled:opacity-50"
                    >
                      <Download size={12} /> Baixar
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={busyFile === file.filename}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-2 py-1.5 transition disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowInUse((s) => !s)}
            className="text-sm text-text-muted hover:text-text-main transition mb-4"
          >
            {showInUse ? 'Ocultar' : 'Mostrar'} arquivos em uso ({inUse.length})
          </button>
          {showInUse && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {inUse.map((file) => (
                <div key={file.filename} className="flex flex-col gap-2 bg-card-subtle rounded-2xl p-3">
                  <div className="aspect-square rounded-xl overflow-hidden bg-card">
                    <img
                      src={`${UPLOADS_BASE}/uploads/${file.filename}`}
                      alt={file.filename}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-text-muted text-center">{formatBytes(file.size)}</p>
                  <p className="text-[11px] text-text-muted text-center leading-tight">{file.usedBy.join(', ')}</p>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={busyFile === file.filename}
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-border hover:border-primary hover:text-primary text-text-muted text-xs font-medium px-2 py-1.5 transition disabled:opacity-50"
                  >
                    <Download size={12} /> Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
}
