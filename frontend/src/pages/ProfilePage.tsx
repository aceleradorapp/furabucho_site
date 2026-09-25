import { Anchor, Award, Cake, Heart, ImageIcon, MessageCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { PrivateLayout } from '../components/PrivateLayout';
import { IMAGE_SPECS } from '../lib/imageSpecs';

interface Resumo {
  publicacoes: number;
  curtidasRecebidas: number;
  comentariosRecebidos: number;
  curtidasDadas: number;
  comentariosFeitos: number;
  nickname: string | null;
  membroDesde: string | null;
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function mesEAno(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function diaEMes(iso: string | null | undefined) {
  if (!iso) return null;
  // A data vem como AAAA-MM-DD. Montar com new Date(iso) puxa pro fuso UTC e pode voltar um
  // dia; por isso quebramos a string na mão.
  const [, mes, dia] = iso.slice(0, 10).split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${Number(dia)} de ${nomes[Number(mes) - 1]}`;
}

function Numero({ icone: Icone, valor, rotulo }: { icone: typeof Heart; valor: number; rotulo: string }) {
  return (
    <div className="flex-1 min-w-[88px] bg-card border border-border rounded-xl px-3 py-3 text-center">
      <Icone size={17} className="mx-auto text-primary mb-1.5" />
      <p className="text-xl font-bold text-text-main leading-none">{valor}</p>
      <p className="text-[11px] text-text-muted mt-1 leading-tight">{rotulo}</p>
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [birthDate, setBirthDate] = useState(toDateInputValue(user?.birthDate));
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Resumo>('/profile/resumo').then(setResumo).catch(() => setResumo(null));
  }, []);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch('/profile', { name, birthDate: birthDate || null });
      await refreshUser();
      setMessage('Perfil atualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'avatar.jpg');
    await api.post('/profile/avatar', form);
    await refreshUser();
  }

  const selos = [
    user.role === 'admin' && { icone: ShieldCheck, texto: 'Administrador', cor: 'text-primary bg-primary/10' },
    user.isVeterano && { icone: Award, texto: 'Veterano', cor: 'text-amber-700 dark:text-amber-400 bg-amber-500/15' },
    user.isPontaFirme && { icone: Anchor, texto: 'Ponta Firme', cor: 'text-[#B45309] dark:text-[#F59E0B] bg-[#F59E0B]/15' },
  ].filter(Boolean) as { icone: typeof Heart; texto: string; cor: string }[];

  const desde = mesEAno(resumo?.membroDesde ?? null);
  const aniversario = diaEMes(user.birthDate);

  return (
    <PrivateLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        {/* Cabeçalho de identidade: quem é a pessoa aqui dentro, antes de qualquer formulário. */}
        <section className="bg-card border border-border rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size={76}
              role={user.role}
              isPontaFirme={user.isPontaFirme}
              isVeterano={user.isVeterano}
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-display uppercase tracking-wide text-xl text-text-main leading-tight truncate">
                {resumo?.nickname || user.name}
              </h1>
              {resumo?.nickname && <p className="text-sm text-text-muted truncate">{user.name}</p>}
              <p className="text-xs text-text-muted mt-1">{user.roleLabel}</p>
            </div>
          </div>

          {selos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {selos.map((s) => (
                <span
                  key={s.texto}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cor}`}
                >
                  <s.icone size={13} /> {s.texto}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-text-muted">
            {desde && <span>Na turma desde {desde}</span>}
            {aniversario && (
              <span className="inline-flex items-center gap-1">
                <Cake size={13} /> {aniversario}
              </span>
            )}
          </div>

          <div className="mt-4">
            <ImageUploadButton spec={IMAGE_SPECS.avatar} buttonLabel="Trocar foto" onUpload={handleAvatarUpload} />
          </div>
        </section>

        {resumo && (
          <section className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Sua participação</h2>
            <div className="flex gap-2">
              <Numero icone={ImageIcon} valor={resumo.publicacoes} rotulo="publicações" />
              <Numero icone={Heart} valor={resumo.curtidasRecebidas} rotulo="curtidas recebidas" />
              <Numero icone={MessageCircle} valor={resumo.comentariosRecebidos} rotulo="comentários recebidos" />
            </div>
            {resumo.publicacoes === 0 && (
              <p className="text-xs text-text-muted mt-2">
                Você ainda não publicou nada. Uma foto antiga já serve — é assim que a turma começa a conversar.
              </p>
            )}
          </section>
        )}

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-4">Seus dados</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-text-muted">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm text-text-muted">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
              />
              <p className="text-xs text-text-muted mt-1">
                Usaremos para avisar a galera nos aniversários do mês. Só o dia e mês são exibidos publicamente.
              </p>
            </div>

            <div>
              <label className="text-sm text-text-muted">E-mail</label>
              <input
                value={user.email ?? 'Não cadastrado'}
                disabled
                className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 bg-card-subtle text-text-muted"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="self-start rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </section>
      </div>
    </PrivateLayout>
  );
}
