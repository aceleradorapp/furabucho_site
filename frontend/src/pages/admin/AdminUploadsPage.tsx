import { Check, CheckCheck, Download, HardDrive, ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PageLoader } from '../../components/PageLoader';
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
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);

  async function load() {
    const res = await api.get<UploadsResponse>('/admin/uploads');
    setData(res);
    setSelected((prev) => {
      const validNames = new Set(res.files.filter((f) => !f.inUse).map((f) => f.filename));
      return new Set(Array.from(prev).filter((name) => validNames.has(name)));
    });
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(file.filename);
        return next;
      });
    } finally {
      setBusyFile(null);
    }
  }

  function toggleSelect(filename: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === unused.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unused.map((f) => f.filename)));
    }
  }

  async function handleDeleteSelected() {
    const files = unused.filter((f) => selected.has(f.filename));
    if (files.length === 0) return;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const ok = await confirm({
      title: `Excluir ${files.length} arquivo(s)?`,
      description: `Isso libera ${formatBytes(totalSize)} de espaço. Os arquivos são apagados do servidor pra sempre — essa ação não pode ser desfeita.`,
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingBatch(true);
    try {
      const results = await Promise.allSettled(files.map((f) => api.delete(`/admin/uploads/${f.filename}`)));
      const deletedNames = new Set(
        files.filter((_, i) => results[i].status === 'fulfilled').map((f) => f.filename),
      );
      setData((prev) => (prev ? { ...prev, files: prev.files.filter((f) => !deletedNames.has(f.filename)) } : prev));
      setSelected(new Set());
    } finally {
      setDeletingBatch(false);
    }
  }

  const unused = data?.files.filter((f) => !f.inUse) ?? [];
  const inUse = data?.files.filter((f) => f.inUse) ?? [];
  const allSelected = unused.length > 0 && selected.size === unused.length;
  const selectedSize = unused.filter((f) => selected.has(f.filename)).reduce((sum, f) => sum + f.size, 0);

  return (
    <PrivateLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 pb-28">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2 inline-flex items-center gap-2">
          <HardDrive size={22} className="text-primary" /> Arquivos do Servidor
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Imagens enviadas ao site. As com selo <span className="text-amber-600 font-semibold">laranja</span> não
          estão sendo usadas em lugar nenhum e podem ser excluídas com segurança; as com selo{' '}
          <span className="text-green-700 dark:text-green-400 font-semibold">verde</span> (esmaecidas) estão em uso e ficam protegidas.
        </p>

        {!data && <PageLoader />}

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
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-amber-700 mb-1">Não utilizado</p>
              <p className="text-xl font-bold text-amber-700">
                {unused.length} arquivo(s) · {formatBytes(data.unusedSize)}
              </p>
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Não utilizadas ({unused.length})
            </h2>
            {unused.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition"
              >
                <CheckCheck size={14} /> {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
              </button>
            )}
          </div>
          {unused.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-muted">
              <ImageIcon size={28} className="text-border" />
              <p className="text-sm">Nada sobrando por aqui — tudo em uso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {unused.map((file) => {
                const isSelected = selected.has(file.filename);
                return (
                  <div
                    key={file.filename}
                    className={`flex flex-col gap-2 bg-card border-2 rounded-2xl p-3 transition ${
                      isSelected ? 'border-primary ring-1 ring-primary' : 'border-amber-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelect(file.filename)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-card-subtle"
                    >
                      <img
                        src={`${UPLOADS_BASE}/uploads/${file.filename}`}
                        alt={file.filename}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white rounded-full px-2 py-0.5 shadow">
                        Não usada
                      </span>
                      <span
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition ${
                          isSelected ? 'bg-primary border-primary' : 'bg-black/40 border-white/80'
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                      </span>
                    </button>
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
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-4 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-600" /> Em uso ({inUse.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {inUse.map((file) => (
              <div key={file.filename} className="flex flex-col gap-2 bg-card-subtle rounded-2xl p-3 opacity-70">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-card grayscale">
                  <img
                    src={`${UPLOADS_BASE}/uploads/${file.filename}`}
                    alt={file.filename}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-green-700 text-white rounded-full px-2 py-0.5 shadow inline-flex items-center gap-0.5">
                    <Check size={9} strokeWidth={3} /> Em uso
                  </span>
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
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {selected.size} selecionado(s) · {formatBytes(selectedSize)}
            </p>
            <button
              onClick={handleDeleteSelected}
              disabled={deletingBatch}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50"
            >
              <Trash2 size={15} /> {deletingBatch ? 'Excluindo...' : 'Excluir selecionadas'}
            </button>
          </div>
        </div>
      )}
    </PrivateLayout>
  );
}
