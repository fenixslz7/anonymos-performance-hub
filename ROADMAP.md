# ANONYMOS PERFORMANCE HUB — Plano de implementação

## Objetivo
Transformar o painel React existente em um aplicativo desktop Windows instalável, com recursos nativos reais, telemetria verificável, interface premium animada e ações reversíveis sempre que possível.

**Regra de produto:** nenhuma métrica, otimização, benchmark, limpeza ou ação pode ser simulada. Se o recurso não estiver disponível no ambiente, a interface deve informar isso claramente e nunca apresentar um resultado fictício.

## Estado atual auditado
- A interface atual usa React 19, TanStack Start/Router, Vite e Tailwind.
- As rotas existentes são Dashboard, Monitor, Otimização, Gráficos e Jogos.
- `src/lib/live-charts.tsx` gera séries aleatórias; não é telemetria de hardware.
- Dashboard apresenta GPU, temperatura, limpeza, liberação de memória e encerramento de processos com valores/resultados simulados.
- Monitor usa nomes/PIDs/cargas e especificações estáticas ou aleatórias.
- Árvore de otimização altera apenas estado React; não altera serviços ou configurações do Windows.
- Ajustes gráficos alteram apenas a prévia da imagem; não aplicam configurações ao driver/tela.
- Biblioteca de jogos mostra pontuação fixa e simula inicialização com temporizador.
- Assistente responde por palavras-chave locais; não consulta telemetria real.
- O repositório ainda não contém uma camada Electron/Windows nativa confirmada.

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
- [ ] Fundação desktop Electron e pipeline de empacotamento (scaffold e CI adicionados; build e validação Windows pendentes).
- [ ] Telemetria real.
- [ ] Processos e inicialização.
- [x] Primeira versão da Limpeza Inteligente: varredura e remoção de arquivos temporários com mais de 24 horas nas pastas temporárias do usuário e do Windows, sem apagar pastas ou arquivos pessoais; validação no Windows ainda pendente.
- [ ] Game Booster.
- [ ] Rede e otimizações seguras.
- [ ] Benchmark, diagnóstico e histórico.
- [ ] Testes em Windows e instalador final.

Este documento é o contrato técnico do projeto e deve ser atualizado a cada fase concluída.
