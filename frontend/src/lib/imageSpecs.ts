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
  caricature: {
    aspect: 1,
    label: 'Caricatura',
    helpText: 'Formato quadrado. Recomendado: 400×400px (mínimo).',
    outputWidth: 480,
    outputHeight: 480,
  },
  announcement: {
    aspect: 9 / 16,
    label: 'Imagem da novidade',
    helpText: 'Formato retrato (9:16), igual à tela de um celular. Recomendado: 1080×1920px ou mais.',
    outputWidth: 1080,
    outputHeight: 1920,
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
    aspect: 21 / 9,
    label: 'Banner do carrossel',
    helpText: 'Formato panorâmico (21:9), o mesmo usado no carrossel da home. Recomendado: 1680×720px ou mais.',
    outputWidth: 1680,
    outputHeight: 720,
  },
};
