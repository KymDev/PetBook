# 📱 Tutorial: Como Gerar uma Nova Versão do App (Android)

Para que o sistema de atualização automática que instalamos funcione, você precisa seguir estes passos sempre que quiser lançar uma nova versão do seu APK.

## 1. Atualizar a Versão no Código (Importante!)

Antes de abrir o Android Studio, você deve atualizar a versão no arquivo de configuração do Android para que o app saiba que é uma versão nova.

1.  No seu projeto, navegue até: `android/app/build.gradle`
2.  Procure pelo bloco `defaultConfig`
3.  Atualize os dois campos:
    *   `versionCode`: Aumente sempre em +1 (ex: de `1` para `2`). É um número inteiro usado pelo sistema.
    *   `versionName`: O nome da versão que o usuário vê (ex: de `"1.0.0"` para `"1.0.1"`).

```gradle
defaultConfig {
    applicationId "com.petbook.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2 // <--- Aumente aqui
    versionName "1.0.1" // <--- Atualize aqui (deve ser igual ao version.json)
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
}
```

## 2. Preparar o Frontend (Web)

Sempre que fizer mudanças no código React/Vite, você precisa gerar a build web antes de sincronizar com o Android:

1.  No terminal da raiz do projeto, execute:
    ```bash
    npm run build
    # ou
    pnpm build
    ```
2.  Sincronize os arquivos com o Capacitor:
    ```bash
    npx cap copy android
    ```

## 3. Gerar o APK no Android Studio

1.  Abra o **Android Studio**.
2.  Vá no menu superior: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3.  O Android Studio vai processar. Quando terminar, aparecerá um balão no canto inferior direito com o link **"locate"**. Clique nele para abrir a pasta com o seu novo `app-debug.apk` ou `app-release.apk`.

## 4. Lançar a Atualização

1.  Renomeie o arquivo gerado para `app-release.apk` (ou o nome que você usa no link de download).
2.  Suba o novo APK para o seu servidor/hospedagem.
3.  **MUITO IMPORTANTE:** Abra o arquivo `public/version.json` no seu servidor e mude o `latestVersion` para o mesmo número que você colocou no `versionName` (ex: `"1.0.1"`).

---

### 💡 Dica Profissional
Se você quiser que a atualização seja **obrigatória**, você pode diminuir o `minVersion` no arquivo `version.json` para um número maior que a versão atual do usuário, mas por enquanto o sistema apenas avisará que existe uma "Nova Versão Disponível".
