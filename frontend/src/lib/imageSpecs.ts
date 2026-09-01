export interface ImageSpec {
  aspect: number;
  label: string;
  helpText: string;
  outputWidth: number;
  outputHeight: number;
}

export const IMAGE_SPECS: Record<string, ImageSpec> = {
  avatar: {
    aspect: 1,
    label: 'Foto de perfil',
    helpText: 'Formato quadrado. Recomendado: 400×400px (mínimo). A imagem é cortada e redimensionada automaticamente.',
    outputWidth: 480,
    outputHeight: 480,
  },
  logo: {
    aspect: 1,
    label: 'Logo do site',
    helpText: 'Formato quadrado, fundo simples funciona melhor. Recomendado: 240×240px (mínimo).',
    outputWidth: 240,
    outputHeight: 240,
  },
  hero: {
    aspect: 16 / 9,
    label: 'Imagem do Hero',
    helpText: 'Imagem larga (16:9). Recomendado: 1600×900px ou mais, para não perder qualidade no banner principal.',
    outputWidth: 1600,
    outputHeight: 900,
  },
  banner: {
    aspect: 16 / 6,
    label: 'Banner do carrossel',
    helpText: 'Formato bem panorâmico (16:6). Recomendado: 1600×600px ou mais.',
    outputWidth: 1600,
    outputHeight: 600,
  },
};
