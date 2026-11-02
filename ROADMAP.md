# ANONYMOS PERFORMANCE HUB — Plano de implementação

## Objetivo
Transformar o painel React existente em um aplicativo desktop Windows instalável, com recursos nativos reais, telemetria verificável, interface premium animada e ações reversíveis sempre que possível.

**Regra de produto:** nenhuma métrica, otimização, benchmark, limpeza ou ação pode ser simulada. Se o recurso não estiver disponível no ambiente, a interface deve informar isso claramente e nunca apresentar um resultado fictício.

**Diretriz visual obrigatória:** toda área deve ter imagens/ícones próprios, animações suaves e controles realmente interativos. A biblioteca de jogos deve exibir identidade visual individual (incluindo FiveM, Fortnite e Counter-Strike 2); o acesso à Internet deve ter ícone animado e clicável, sem fingir estado de conexão; o dashboard deve incluir a colmeia hexagonal interativa alimentada por telemetria real. Não usar cartões genéricos com apenas o nome do módulo.

## Estado atual auditado
- A interface usa React 19, TanStack Start/Router, Vite e Tailwind; o desktop usa Electron com preload e IPC limitado.
- Rotas atuais: Dashboard, Monitor, Otimização, Gráficos, Jogos, Internet e Limpeza.
- Dashboard e Monitor consultam leituras nativas de CPU, RAM, GPU identificada/VRAM reportada, discos, Windows e processos; gráficos de histórico usam amostras coletadas, não séries aleatórias.
- Uso/temperatura de GPU ainda não estão disponíveis pela coleta atual; CPU por processo também não é apresentada como percentual instantâneo.
- Otimização aplica de verdade somente os planos de energia Equilibrado/Alto desempenho via powercfg, após confirmação. Outros ramos são informativos e não fingem alterar o Windows.
- Gráficos mantém perfis visuais independentes por jogo nesta sessão e aplica os sliders apenas à imagem de prévia; não altera o driver, monitor ou jogo.
- Game Center oferece cartões visuais de FiveM, GTA V, Fortnite, Counter-Strike 2 e Valorant e permite localizar manualmente um executável; ainda não detecta bibliotecas de jogos automaticamente nem aplica boost.
- Assistente local consulta snapshot real de CPU/RAM/GPU/discos quando disponível e responde por regras locais; não é um modelo de IA conectado nem executa alterações.
- Internet mede latência/perda de pacotes, adaptadores, DNS e velocidade por transferência real. Não garante redução de ping.
- Limpeza Inteligente analisa e remove apenas arquivos temporários permitidos com mais de 24 horas, mediante seleção/confirmação; validação final no computador do usuário continua pendente.

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
- [x] Primeira camada visual de jogos: cartões individuais com símbolos FiveM, Fortnite e Counter-Strike 2 e seleção de jogo.
- [x] Colmeia hexagonal interativa no dashboard ligada aos valores reais de CPU, RAM, GPU e discos; rede direciona ao diagnóstico dedicado.
- [x] Ícone de Internet interativo na navegação, com animação de foco/seleção; a animação não representa um teste de conectividade.
- [ ] Fundação desktop Electron e pipeline de empacotamento (scaffold e CI adicionados; build e validação Windows pendentes).
- [ ] Telemetria real.
- [ ] Processos e inicialização.
- [x] Primeira versão da Limpeza Inteligente: varredura e remoção de arquivos temporários com mais de 24 horas nas pastas temporárias do usuário e do Windows, sem apagar pastas ou arquivos pessoais; validação no Windows ainda pendente.
- [ ] Game Booster.
- [ ] Rede e otimizações seguras.
- [ ] Benchmark, diagnóstico e histórico.
- [ ] Testes em Windows e instalador final.

Este documento é o contrato técnico do projeto e deve ser atualizado a cada fase concluída.
