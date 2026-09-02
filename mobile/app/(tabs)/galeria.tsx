import { Images } from 'lucide-react-native';
import { ComingSoon } from '../../src/components/ComingSoon';

export default function GaleriaScreen() {
  return (
    <ComingSoon
      icon={Images}
      title="Galeria em breve"
      description="Os álbuns de fotos do site vão aparecer aqui numa próxima atualização do app."
    />
  );
}
