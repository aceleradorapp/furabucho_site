# App Casca (WebView) — Fura-Bucho

> Ver [docs/ROADMAP_PWA_E_APP_CASCA.md](../docs/ROADMAP_PWA_E_APP_CASCA.md) (Opção B) para o
> roadmap completo.

Projeto **novo e separado** do `mobile/` (que é o app nativo em Expo/React Native, com telas
próprias). Aqui a ideia é um app bem leve que só abre `https://friendsface.com.br` em tela cheia
dentro de uma WebView nativa, usando [Capacitor](https://capacitorjs.com/), pra existir
oficialmente na Google Play e na App Store.

## Status atual (2026-09-17)

- ✅ Projeto Capacitor inicializado (`appId: com.furabucho.webapp`), configurado pra carregar a
  URL do site ao vivo (`capacitor.config.json` → `server.url`), sem empacotar HTML local.
- ✅ Plataforma **Android** adicionada (`android/`), com ícone e splash screen já gerados a
  partir da logo real do site, fundo escuro (`#0A0A0C`) igual à marca.
- ✅ O projeto Gradle resolve as dependências normalmente (testado com `./gradlew assembleDebug`).
- ❌ **Falta o Android SDK** nesta máquina pra gerar um APK de verdade — o build para no passo
  de compilação porque não encontra `ANDROID_HOME`. Precisa instalar o **Android Studio** (que já
  vem com o SDK) pra continuar. Depois disso, `cd android && ./gradlew assembleDebug` deve gerar
  um APK de debug instalável direto num celular Android pra teste.
- ⏳ **iOS ainda não iniciado** — precisa de um Mac (físico ou serviço de Mac na nuvem) com Xcode
  pra rodar `npx cap add ios` e gerar o build.

## Comandos úteis

```bash
# depois de qualquer mudança no capacitor.config.json
npx cap sync android

# regenerar ícone/splash se a logo mudar (fonte em assets/icon.png)
npx capacitor-assets generate --android --iconBackgroundColor '#0A0A0C' --iconBackgroundColorDark '#0A0A0C' --splashBackgroundColor '#0A0A0C' --splashBackgroundColorDark '#0A0A0C' --logoSplashScale 0.3

# build de debug (precisa do Android SDK instalado)
cd android && ./gradlew assembleDebug
```

## Próximos passos

1. Instalar o Android Studio nesta máquina (ou noutra) pra ter o Android SDK.
2. Gerar um APK de debug e testar num celular Android real — conferir upload de foto, login,
   navegação e o botão "voltar" do Android dentro da WebView.
3. Decidir sobre a conta de desenvolvedor Google Play (~US$ 25, pagamento único) pra publicar.
4. Resolver a parte iOS (precisa de Mac) quando fizer sentido.
