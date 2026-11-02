# Anonymos Performance Hub

Criar o painel ANONYMOS PERFORMANCE baseado nas telas do vídeo em anexo (arquivos principais) e na imagem complementar.

Módulos essenciais:
1. Dashboard Principal (time_04.jpg): Interface dark moderna estilo aplicativo desktop gamer, com header com controles de janela, banner 'Bem-vindo de volta, Anonymos' com arte estilizada e botão 'Mais Produtos', card de telemetria em tempo real GPUSENSE com gráfico de linha dinâmica, e cards laterais de ação com 1 clique: 'Modo Limpeza' (Varredura de processos), 'Liberar Memória' (Compressão) e 'Segundo Plano' (Parar agora), com estados interativos e feedback visual ao executar.
2. Monitor em Colmeia / Hexagonal Grid (time_07.jpg): Tela 'Tudo em tempo real' com uma matriz hexagonal (favo de mel) interativa representando os processos e threads do sistema, com cores dinâmicas por status e tooltip detalhado ao passar o mouse (nome do processo, % CPU, MB de RAM, PID), além de cards flutuantes laterais com gráfico de linha de Uso de CPU em tempo real, especificações do sistema e barra segmentada de memória RAM.
3. Árvore de Otimização (time_19.jpg): Mindmap com o núcleo Anonymos conectado a serviços do Windows (Telemetria, Windows Defender, Xbox Game Bar, Windows Update, Apps pré-instalados) com switches interativos para desativar processos desnecessários.
4. Ajustes Gráficos & Vibrance: Controles de saturação, contraste, brilho e presets de perfis gamer.
5. Assistente Anonymos IA: Drawer lateral retrátil com orbe luminoso animado e chat interativo para tirar dúvidas e sugerir melhorias de FPS.
6. Biblioteca de jogos inspirada na referência complementar (Fortnite, FiveM, CS2, Valorant) com score de boost e botão de inicialização otimizada.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d479fe3-6f43-4cf1-9a43-37140107fd94).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Windows desktop (Electron)

A fundação inicial do Electron está em desenvolvimento. O painel web atual usa TanStack Start com SSR; por isso, a versão desktop executa um servidor Node local empacotado e abre a interface em uma janela Electron isolada.

### Pré-requisitos

- Windows 10/11 x64 para gerar e validar o instalador.
- Node.js compatível com as versões de Vite/TanStack do projeto e npm.

### Desenvolvimento desktop

```sh
npm install
npm run dev:desktop
```

### Gerar instalador NSIS x64

```sh
npm install
npm run build:desktop
```

O instalador será gerado na pasta `release/`. A geração e o funcionamento do instalador ainda precisam ser validados em Windows antes de qualquer release ser considerada pronta.

### Segurança do desktop

O renderer não recebe acesso direto ao Node.js. O preload expõe somente controles de janela e informações básicas do aplicativo por IPC; operações de sistema devem ser implementadas no processo principal por APIs específicas e allowlist, nunca por comandos arbitrários enviados pela interface.

Consulte [ROADMAP.md](./ROADMAP.md) para o estado real das fases e pendências.
