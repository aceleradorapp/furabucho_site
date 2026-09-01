import { useRef, useState, type ReactNode } from 'react';
import type { ImageSpec } from '../lib/imageSpecs';
import { ImageCropModal } from './ImageCropModal';

export function ImageUploadButton({
  spec,
  buttonLabel,
  onUpload,
  className,
}: {
  spec: ImageSpec;
  buttonLabel: ReactNode;
  onUpload: (blob: Blob) => Promise<void>;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileSelected(file: File) {
    const reader = new FileReader();
    reader.onload = () => setRawImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleConfirmCrop(blob: Blob) {
    setRawImageSrc(null);
    setUploading(true);
    try {
      await onUpload(blob);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={className ?? 'text-sm rounded-full border border-border px-4 py-1.5 hover:border-primary transition disabled:opacity-60'}
      >
        {uploading ? 'Enviando...' : buttonLabel}
      </button>

      {rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          spec={spec}
          onCancel={() => setRawImageSrc(null)}
          onConfirm={handleConfirmCrop}
        />
      )}
    </>
  );
}
