# ANONYMOS PERFORMANCE HUB — Plano de implementação

## Objetivo
Transformar o painel React existente em um aplicativo desktop Windows instalável, com recursos nativos reais, telemetria verificável, interface premium animada e ações reversíveis sempre que possível.

**Regra de produto:** nenhuma métrica, otimização, benchmark, limpeza ou ação pode ser simulada. Se o recurso não estiver disponível no ambiente, a interface deve informar isso claramente e nunca apresentar um resultado fictício.

**Diretriz visual obrigatória:** toda área deve ter imagens/ícones próprios, animações suaves e controles realmente interativos. A biblioteca de jogos deve exibir identidade visual individual (incluindo FiveM, Fortnite e Counter-Strike 2); o acesso à Internet deve ter ícone animado e clicável, sem fingir estado de conexão; o dashboard deve incluir a colmeia hexagonal interativa alimentada por telemetria real. Não usar cartões genéricos com apenas o nome do módulo.

## Estado atual auditado
- A interface usa React 19, TanStack Start/Router, Vite e Tailwind; o desktop usa Electron com preload e IPC limitado.
- Rotas atuais: Dashboard, Monitor, Otimização, Gráficos, Jogos, Internet, Limpeza, Inicialização e Histórico.
- Dashboard e Monitor consultam leituras nativas de CPU, RAM, GPU identificada/VRAM reportada, discos, Windows e processos; gráficos de histórico usam amostras coletadas, não séries aleatórias.
- Uso, temperatura e VRAM dedicada são consultados via NVIDIA SMI quando o driver NVIDIA disponibiliza o utilitário; em AMD/Intel ou sem esse utilitário, os campos permanecem N/D. CPU por processo é tempo acumulado, não percentual instantâneo.
- Otimização aplica de verdade somente os planos de energia Equilibrado/Alto desempenho via powercfg, após confirmação. Outros ramos são informativos e não fingem alterar o Windows.
- Gráficos mantém perfis visuais independentes por jogo nesta sessão e aplica os sliders apenas à imagem de prévia; não altera o driver, monitor ou jogo.
- Game Center oferece cartões visuais com ícones próprios para FiveM, GTA V, Fortnite, Counter-Strike 2, Valorant e Minecraft; procura executáveis em diretórios comuns Steam/Epic/Riot/FiveM e o Minecraft Launcher em locais comuns, além de permitir seleção manual. O Modo de Jogo troca temporariamente para um plano de alto desempenho, salva o plano original e o restaura ao fechar o app ou manualmente; não altera FPS, serviços ou prioridade de processo.
- Assistente local consulta snapshot real de CPU/RAM/GPU/discos quando disponível e responde por regras locais; não é um modelo de IA conectado nem executa alterações.
- Perfis Gráficos por jogo são persistidos no armazenamento local do navegador; sliders alteram a prévia, não o driver nem o jogo.
- Internet mede latência/perda de pacotes, adaptadores, DNS e velocidade por transferência real. Não garante redução de ping.
- Limpeza Inteligente analisa e remove apenas arquivos temporários permitidos com mais de 24 horas, mediante seleção/confirmação; validação final no computador do usuário continua pendente.
- Inicialização lista entradas de HKCU Run e da pasta Inicializar do usuário; desativação guarda backup local e oferece restauração. Não altera entradas de outros usuários, serviços ou tarefas agendadas.
- Gerenciador de processos agora pode encerrar processos selecionados após confirmação, com bloqueio de processos críticos e conferência de PID/nome/hora de início.
- Histórico local registra operações de limpeza, inicialização, encerramento de processo, inicialização de jogos, planos de energia e Modo de Jogo.

## Arquitetura-alvo
- **Interface:** manter React/TypeScript e o design ANONYMOS (preto/grafite, roxo e azul elétrico), animações suaves, estados acessíveis e layout responsivo.
- **Desktop:** Electron com processo principal isolado, preload mínimo e IPC tipado; renderer sem Node.js e sem acesso irrestrito ao sistema.
- **Serviços Windows:** módulos pequenos em TypeScript/Node e PowerShell assinado/validado quando necessário, com allowlist de operações e validação rigorosa de argumentos.
- **Segurança:** nunca executar comandos arbitrários vindos da interface; nunca concatenar entrada do usuário em comandos; registrar ações; exigir confirmação para alterações administrativas; não desativar Defender/firewall/Windows Update ou serviços críticos como otimização genérica.
- **Permissões:** solicitar elevação somente para a ação que realmente exigir; o aplicativo deve continuar útil sem administrador.
- **Reversibilidade:** registrar estado anterior, criar ponto de restauração quando aplicável, oferecer desfazer e explicar limitações.
- **Integridade dos dados:** mostrar indisponibilidade em vez de inventar valores. Separar métricas medidas, estimadas e indisponíveis.
- **Privacidade:** telemetria local por padrão; não enviar inventário/processos para terceiros sem consentimento explícito.

## Módulos planejados

### 1. Plataforma desktop e diagnóstico
- Empacotamento Windows x64, instalador e atualização/versionamento.
- Verificação de versão do Windows, permissões, dependências e integridade.
- Logs técnicos exportáveis, sem segredos ou dados pessoais desnecessários.

### 2. Monitoramento real
- CPU: utilização, frequência e núcleos quando suportados.
- RAM: total, usada, disponível e memória por processo.
- GPU: fabricante/modelo, utilização, memória e temperatura apenas quando o driver/API suportar.
- Discos: espaço, atividade e saúde somente por interfaces confiáveis disponíveis.
- Rede: tráfego, adaptadores e latência.
- Atualização periódica com indicação de horário/fonte; sensores indisponíveis aparecem como indisponíveis.
- Lista de processos real com PID, CPU e memória; encerrar processo somente após confirmação e com proteção para processos críticos.

### 3. Limpeza inteligente
- Analisar primeiro e apresentar categorias, caminhos, quantidade e espaço recuperável.
- Permitir seleção e prévia; excluir apenas caches/temporários seguros e explicitamente selecionados.
- Nunca apagar Documentos, Downloads, fotos, projetos, saves ou dados pessoais.
- Ignorar arquivos em uso e registrar falhas; não prometer espaço antes da conclusão.

### 4. Inicialização e processos
- Listar entradas reais de inicialização e origem.
- Ativar/desativar entradas sem apagar arquivos.
- Exibir impacto como estimativa identificada, não como medição inventada.
- Permitir restaurar a configuração anterior.

### 5. Game Booster
- Detectar instalações e executáveis com consentimento.
- Perfis por jogo (incluindo FiveM/GTA V) com ações seguras e explicadas.
- Encerrar apenas aplicativos selecionados pelo usuário; nunca processos essenciais.
- Aplicar temporariamente ajustes reversíveis e restaurar ao fechar o jogo.
- Sem prometer FPS fixo; benchmark antes/depois com metodologia e condições registradas.

### 6. Rede
- Teste de latência, jitter e perda de pacotes para destinos configuráveis.
- Diagnóstico de DNS/adaptador e opções de DNS com confirmação e restauração.
- Não alegar redução de ping garantida.

### 7. Otimização do Windows
- Catálogo de ajustes individualizados com descrição, risco, requisitos, estado atual e reversão.
- Nada de desligar Defender, firewall, atualizações ou serviços essenciais como preset de desempenho.
- Alterações administrativas somente sob demanda, após confirmação e backup do estado.

### 8. Gráficos e benchmark
- Separar prévia visual de ajustes reais suportados por APIs/drivers.
- Não alegar controle de saturação/driver quando não houver API compatível.
- Benchmark repetível, sem pontuação fictícia; salvar resultados e condições de teste.

### 9. Diagnóstico e segurança
- Diagnóstico de gargalos baseado em dados observados e regras explicáveis.
- Histórico de ações, exportação de relatório e restauração.
- Ponto de restauração do Windows quando suportado e autorizado; nunca substituir backup pessoal.

### 10. ANONYMOS AI
- Respostas fundamentadas em dados reais disponíveis e documentação local.
- Indicar claramente quando é uma recomendação heurística e não um diagnóstico.
- Não executar ações sem confirmação explícita do usuário.

## Fases de entrega
1. **Fundação desktop:** revisar build/SSR atual, definir estratégia compatível com TanStack Start, Electron, preload seguro, IPC tipado, modo desenvolvimento e empacotamento Windows.
2. **Telemetria real:** implementar e testar adaptadores de CPU/RAM/disco/rede e detecção de hardware; substituir séries aleatórias e valores fixos.
3. **Processos e inicialização:** inventário real, controles seguros e histórico.
4. **Limpeza:** análise, seleção, execução controlada, relatório e testes de proteção.
5. **Game Booster:** perfis reais, detecção de jogos, ajustes reversíveis e restauração.
6. **Rede e otimizações:** diagnóstico e catálogo seguro de ajustes.
7. **Benchmark, gráficos e IA:** apenas capacidades verificáveis, com limitações explícitas.
8. **Qualidade e release:** testes unitários/integrados, build, assinatura quando disponível, instalador, atualização e documentação.

## Critérios obrigatórios de conclusão
- Cada botão executa a ação documentada ou fica explicitamente desabilitado com o motivo.
- Nenhuma métrica ou resultado fictício.
- Confirmação antes de ações destrutivas/administrativas.
- Registro de sucesso, falha e motivo; possibilidade de desfazer quando tecnicamente possível.
- Testes para caminhos normais, falhas, permissões negadas e cancelamento.
- Build e instalador verificados em Windows antes de declarar o recurso pronto.

## Estado
- Scaffold Electron inicial adicionado em `electron/main.cjs` e `electron/preload.cjs`, com `contextIsolation`, `sandbox`, `nodeIntegration: false` e IPC limitado a controles da janela/informações do app.
- `vite.config.ts` direciona Nitro para `node-server` para permitir hospedar SSR localmente no desktop.
- `package.json` recebeu scripts de desenvolvimento desktop e empacotamento NSIS x64.
- **Ainda não concluído:** dependências/lockfile precisam ser instalados e sincronizados; build, inicialização do servidor empacotado e instalador precisam ser testados em Windows. Não declarar a fase pronta antes desses testes.
- Os controles minimizar/maximizar/fechar da janela agora usam a API segura do preload no desktop; ficam ocultos no preview web.
- Foi adicionado pipeline Windows para instalar dependências, executar testes e gerar o instalador como artefato do GitHub Actions. A execução real do pipeline ainda precisa ser observada após o push.
- [x] Auditoria inicial das rotas e componentes atuais.
- [x] Biblioteca visual de jogos com ícones de FiveM, GTA V/Rockstar, Fortnite, Counter-Strike 2, Valorant e Minecraft (SVG local original do bloco de grama), seleção de jogo e fallback durante carregamento das imagens.
- [x] Colmeia hexagonal interativa no dashboard ligada aos valores reais de CPU, RAM, GPU e discos; rede direciona ao diagnóstico dedicado.
- [x] Ícone de Internet interativo na navegação, com animação de foco/seleção; a animação não representa um teste de conectividade.
- [x] Scaffold desktop Electron, preload isolado, IPC allowlist e pipeline de instalador Windows; a execução automatizada gera instalador como artefato. Teste físico de instalação/uso ainda pendente.
- [x] Telemetria base CPU/RAM/GPU detectada/armazenamento/OS/processos; sensores NVIDIA SMI opcionais adicionados para uso, temperatura e VRAM.
- [x] Gerenciador de processos com encerramento confirmado, validação de PID/nome/início e bloqueio de processos críticos.
- [x] Gerenciador de inicialização do usuário (HKCU Run e pasta Inicializar) com backup local e restauração.
- [x] Primeira versão da Limpeza Inteligente: temporários com mais de 24 horas nas pastas do usuário e Windows, sem apagar pastas ou arquivos pessoais; validação no PC do usuário pendente.
- [x] Modo de Jogo temporário por plano de energia, com plano original salvo, restauração manual e tentativa de restauração ao sair/iniciar o app. Não altera prioridade do jogo nem promete FPS.
- [x] Detecção de jogos em diretórios comuns Steam/Epic/Riot/FiveM e inicialização manual ou detectada; bibliotecas fora dos locais conhecidos ainda podem exigir seleção manual.
- [x] Rede: ping/perda, DNS/adaptadores e teste de transferência Cloudflare; não garante redução de ping.
- [x] Perfis gráficos por jogo persistidos localmente, com prévia visual. Aplicação ao driver/monitor/jogo ainda depende de API do fabricante.
- [x] Histórico local das principais ações.
- [ ] Benchmark real de FPS dentro dos jogos e telemetria GPU AMD/Intel; dependem de integração específica e validação.
- [ ] Teste físico de instalação, execução, permissões e reversão em um PC Windows de usuário.

Este documento é o contrato técnico do projeto e deve ser atualizado a cada fase concluída.


## Módulo Minecraft 1.8.9 — Private Server Lab
- [x] Adicionada rota externa `/minecraft` com identidade visual ANONYMOS e navegação dedicada.
- [x] Painel com conexão autenticada ao companion plugin, estado confirmado pelo servidor e controle de alcance de 3.1 a 6.0 blocos.
- [x] Companion plugin para Spigot/Paper 1.8.8 API com ProtocolLib 4.8.0; intercepta ataques somente quando o modo privado está ativo, valida distância e linha de visão no servidor e persiste as configurações.
- [x] API HTTP com token Bearer, bind padrão em loopback e documentação para uso em LAN privada.
- [x] Workflow GitHub Actions para compilar o JAR Java 8 e publicar artefato após build bem-sucedido.
- [ ] Confirmar build do plugin e testar em servidor Spigot/Paper 1.8.8 real com dois jogadores; compatibilidade deve ser validada no ambiente exato.
- [ ] Testar build/typecheck da interface Electron após a inclusão da rota.
- [ ] ESP e Auto Clicker permanecem pendentes de integração específica do cliente Minecraft 1.8.9; a interface os identifica claramente como não disponíveis, sem simular funcionamento.
