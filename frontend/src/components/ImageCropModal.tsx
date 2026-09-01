import * as Dialog from '@radix-ui/react-dialog';
import { Info, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { getCroppedImageBlob } from '../lib/cropImage';
import type { ImageSpec } from '../lib/imageSpecs';

export function ImageCropModal({
  imageSrc,
  spec,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  spec: ImageSpec;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, spec.outputWidth, spec.outputHeight);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between mb-3">
            <Dialog.Title className="font-medium text-text-main">{spec.label}</Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text-main" onClick={onCancel}>
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="flex items-start gap-2 bg-primary/10 text-primary text-xs rounded-lg px-3 py-2 mb-4">
            <Info size={14} className="mt-0.5 shrink-0" />
            <p>{spec.helpText}</p>
          </div>

          <div className="relative w-full h-72 bg-black/80 rounded-xl overflow-hidden mb-4">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={spec.aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          </div>

          <div className="flex items-center gap-3 mb-5">
            <ZoomIn size={16} className="text-text-muted" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="text-sm rounded-full border border-border px-4 py-2 hover:border-primary transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !croppedAreaPixels}
              className="text-sm rounded-full bg-primary hover:bg-primary-hover text-white px-5 py-2 transition disabled:opacity-60"
            >
              {saving ? 'Processando...' : 'Usar esta imagem'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
