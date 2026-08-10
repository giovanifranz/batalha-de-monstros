# Batalha de Monstros

Cadastre monstros, escolha dois, assista à batalha e veja o resultado. Roda
inteiro no navegador: **não há backend, não há API, não há variável de
ambiente**. O roster mora no `localStorage` e a batalha é uma função pura.

O jogo tem três movimentos — cadastrar um monstro, montar uma batalha entre
dois, ver o resultado aparecer sozinho ao fim — e um algoritmo de cinco regras
por baixo. Este README diz onde cada uma delas está no código e como cada uma é
provada.

## O que está publicado onde

Antes de clicar em qualquer link: **os dois destinos publicam coisas
diferentes.**

| Destino          | O que é                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub Pages** | O **Storybook** — a biblioteca de componentes, estado por estado. **Não é o app.** Não dá para cadastrar um monstro nem assistir a uma batalha ali. |
| **Container**    | O **app rodando** — é onde o jogo acontece de verdade. Publicado à parte, por imagem Docker; veja [Deploy](#deploy).                                |
| **Local**        | O caminho garantido para ver o jogo inteiro: os três comandos de [Como rodar](#como-rodar), sem `.env` e sem backend.                               |

O CI publica o Storybook automaticamente; o app sai como imagem de container, e
a seção de deploy explica como.

---

## Como rodar

```bash
curl -fsSL https://vite.plus | bash   # instala o Vite+ (o CLI `vp`)
vp install                            # instala as dependências do workspace
vp dev                                # sobe o app em http://localhost:5173
```

Só isso. Sem `.env`, sem banco, sem serviço para subir junto.

Estes três comandos foram verificados num clone limpo, nesta ordem, com o Vite+
instalado do zero. O que a verificação mostrou e vale saber antes:

- **O instalador do Vite+ pergunta** se ele pode gerenciar as versões do Node.
  Aceite (é o padrão): é assim que você recebe o Node 26 que o `engines.node`
  exige, sem `nvm`. Em ambiente não-interativo (CI, devcontainer) ele decide
  sozinho e não pergunta nada. Para responder antes,
  `VP_NODE_MANAGER=yes curl -fsSL https://vite.plus | bash`.
- **O instalador edita seus arquivos de shell** (`~/.zshenv`, `~/.zshrc`, os
  equivalentes de bash/fish/nushell), acrescentando uma linha que carrega
  `$HOME/.vite-plus/env`. Ele avisa no fim, mas depois do fato. Para instalar
  fora do caminho padrão, `VP_HOME=/onde/você/quiser`.
- **`vp dev` é o terceiro comando por um motivo.** Ele — e também o build — gera
  `apps/web/src/routeTree.gen.ts`, que é um artefato do TanStack
  Router e por isso está no `.gitignore`. Num clone recém-feito o arquivo não
  existe, e rodar `vp check` **antes** de `vp dev` falha com 9 erros de tipo que
  descendem todos dessa ausência. Não é um defeito de código; é a ordem. Depois
  da primeira geração, `vp check` fica verde e continua verde.
- **Não use `npm` nem `npx`.** O repositório declara
  `devEngines.packageManager: pnpm` e o npm aborta com `EBADDEVENGINES`.
- Se você já tem Node 26 e prefere o `nvm`, `nvm use` lê o `.nvmrc`. O `vp`
  continua sendo obrigatório — ele é o task runner, o linter, o formatador, o
  type-checker e o runner de testes.

Na primeira execução o roster é semeado com quatro monstros (Ignaruk, Petragon,
Umbrafel, Zefirion) para que a tela inicial não seja um estado vazio. Eles são
dados normais: podem ser excluídos, e o estado vazio traz um botão para
restaurá-los.

---

## Comandos

Cada linha diz o que o comando **realmente** cobre, porque a divisão entre eles
não é óbvia e já custou caro uma vez (veja a seção seguinte).

| Comando                                   | O que roda                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `vp dev`                                  | O app (`apps/web`), via `defaultPackage` do `vite.config.ts` da raiz.                                                  |
| `vp check`                                | O portão único: oxfmt + oxlint + type-check numa passada só.                                                           |
| `vp check --fix`                          | O mesmo, corrigindo formatação e ordem de chaves de `package.json`.                                                    |
| `vp test`                                 | 94 testes unitários — `packages/domain` (42), `packages/infra` (22), `apps/web` (30). **Não** roda a suíte de stories. |
| `vp run test:stories`                     | 90 testes de story do `packages/ui` num Chromium real, com o addon de a11y em `test: 'error'`.                         |
| `vp run ready`                            | `vp check` + `vp test` + `vp run test:stories` + `vp run -r build`, nessa ordem.                                       |
| `vp -C apps/web run test:e2e`             | 33 cenários Playwright (BDD, sem rede).                                                                                |
| `vp -C apps/web run test:e2e:ui`          | Os mesmos, no modo UI, para depurar passo a passo.                                                                     |
| `vp -C packages/domain run test:mutation` | Stryker sobre o motor de batalha e o schema (`break: 100`).                                                            |
| `vp -C packages/infra run test:mutation`  | Stryker sobre a camada de persistência (`break: 100`).                                                                 |
| `vp -C packages/ui run storybook`         | Storybook do design system em http://localhost:6006.                                                                   |
| `vp run vrt`                              | Regressão visual: 90 PNGs do Storybook comparados pixel a pixel com a baseline.                                        |
| `vp run vrt:approve`                      | Grava a captura atual **como** baseline. É o passo depois de uma mudança visual intencional.                           |
| `vp run build-storybook`                  | Build estático do Storybook → `packages/ui/storybook-static`. É o que o CI publica.                                    |
| `vp -C apps/web build`                    | Build de produção do app → `apps/web/dist`.                                                                            |
| `vp run -r build`                         | O mesmo, pelo task runner, respeitando o grafo de dependências. É a última etapa do `ready`.                           |
| `vp -C apps/web preview`                  | Serve o `dist` com fallback de SPA, para conferir o build.                                                             |

Duas formas que **não** funcionam, para não serem redescobertas:

- `vp run -C apps/web test:e2e` → `Task "-C" not found`. O `-C <dir>` é opção
  **global** e vem antes do subcomando: `vp -C apps/web run test:e2e`.
- `vp run web#build` e `vp run -t web#build` → `Task "web#build" not found`. O
  build do app é `vp -C apps/web build` (o subcomando embutido) ou
  `vp run -r build` (a tarefa).

### Por que `vp test` não roda tudo

`vp test` na raiz varre o workspace como **um** projeto Vitest ancorado na raiz.
Ele não enxerga o `vitest.config.ts` do `packages/ui`, que é justamente quem
declara o projeto de browser. Rodar só `vp test` e ler "os testes passam" já
deixou 13 falhas de contraste passarem despercebidas por um bom tempo.

A suíte de stories ficou fora do `vp test` **de propósito**: ela precisa de um
Chromium do Playwright instalado, e um `vp test` que não passa num clone novo é
um `vp test` que as pessoas param de rodar. Por isso ela tem nome próprio
(`test:stories`) e entra no `ready` — o único comando que promete "está tudo
pronto". Antes de abrir PR, o comando é `vp run ready`.

`ready` começa pelo `vp check`, então ele herda a ordem descrita em
[Como rodar](#como-rodar): num clone que nunca rodou `vp dev` nem
`vp -C apps/web build`, o `routeTree.gen.ts` ainda não existe e o `check` falha
antes de chegar aos testes. É a razão de o workflow de CI gerar a árvore de
rotas antes de chamar o `ready`.

Fora do `ready` ficam as duas suítes que exigem browser ou levam mais tempo: o
Playwright e os dois Strykers. Elas rodam no CI (veja
[Integração contínua](#integração-contínua)).

---

## O jogo, item a item

| Funcionalidade ou regra                                                      | Onde está                                                                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cadastrar monstro com `name`, `attack`, `defense`, `speed`, `hp`, `imageUrl` | Rota `/monsters/new` (`apps/web/src/routes/monsters.new.tsx` + `components/MonsterForm.tsx`)                           |
| Criar uma batalha entre dois monstros                                        | Rota `/battle` (`apps/web/src/routes/battle.index.tsx`), dois slots                                                    |
| Ver o resultado automaticamente ao fim da batalha                            | `VictoryPanel` em `apps/web/src/components/VictoryPanel.tsx`, aberto pela máquina ao chegar em `finished` — sem clique |
| Maior velocidade ataca primeiro                                              | `resolveFirstAttacker`, `packages/domain/src/battle.ts`                                                                |
| Empate de velocidade resolve pelo maior ataque                               | `resolveFirstAttacker`, mesmo arquivo                                                                                  |
| `damage = attack - defense`, mínimo 1                                        | `calculateDamage`, mesmo arquivo                                                                                       |
| `hp = hp - damage`                                                           | `simulateBattle`, mesmo arquivo                                                                                        |
| Todos os rounds calculados de uma vez                                        | `simulateBattle` roda inteiro **antes** do primeiro frame; a UI só reproduz o log                                      |
| Vence quem zerou o HP do inimigo primeiro                                    | `simulateBattle` — o vencedor é o atacante do último turno                                                             |
| React + TypeScript                                                           | React 19 + TypeScript 7                                                                                                |
| Sem backend                                                                  | Zero `fetch`, zero `XMLHttpRequest`, zero WebSocket no código da aplicação                                             |

---

## O algoritmo de batalha

As cinco regras vivem num arquivo só, `packages/domain/src/battle.ts`, em
funções puras que não conhecem React, storage nem rota.

```ts
// dano = ataque - defesa; se ataque <= defesa, dano = 1
return attack > defense ? attack - defense : MIN_DAMAGE;
```

A condição é `attack > defense`, e não `raw > MIN_DAMAGE`: são perguntas
diferentes que hoje coincidem só porque o piso vale 1. Escrever a regra
literalmente mantém o código correto se o piso mudar.

**Todos os rounds de uma vez.** `simulateBattle(left, right)` devolve o
`BattleResult` completo — todos os turnos, o HP antes e depois de cada golpe, o
vencedor — antes de qualquer coisa aparecer na tela. A animação é um
`battle.machine.ts` (XState) reproduzindo um log já fechado; pular a animação
não muda o resultado porque não há nada a recalcular.

**Duas decisões que as cinco regras não cobrem**, tomadas para o resultado ser
determinístico:

- Empate de velocidade **e** de ataque → começa o Lutador 1 (lado esquerdo).
- O dano é limitado a zerar o HP (`Math.max(0, ...)`), mas o `damage` do turno
  guarda o valor bruto: num golpe de overkill os dois divergem de propósito, e o
  total de dano conta o HP realmente removido.

### Como as regras são provadas

`vp -C packages/domain run test:mutation`

| Medida                          | Valor                                               |
| ------------------------------- | --------------------------------------------------- |
| Testes unitários de `battle.ts` | 24 (mais 15 do schema e 3 dos erros = 42 no pacote) |
| Mutantes gerados em `battle.ts` | 79                                                  |
| Sobreviventes                   | 0                                                   |
| Score de mutação do pacote      | **100,00%** (`break: 100` no `stryker.config.mjs`)  |

Cobertura de linha diz que a linha rodou. Score de mutação diz que **algum teste
reclamaria se a regra mudasse** — o Stryker troca `>` por `<`, `-` por `+`,
apaga o piso de dano, e cada uma dessas versões erradas precisa fazer um teste
falhar. As poucas exceções legítimas (um mutante equivalente em
`resolveFirstAttacker`, o guard de `MAX_TURNS` que nenhum monstro válido
alcança) estão marcadas com `// Stryker disable` **e o motivo escrito ao lado**,
o que tira o mutante do denominador em vez de escondê-lo no numerador.

`packages/infra` roda sob a mesma regra e também está em 100,00% (40 mutantes).

---

## A regra de balanceamento

O cadastro impõe, além dos seis campos:

- `attack` 1–100, `defense` 0–100, `speed` 0–100, `hp` 100–300;
- **`attack + defense + speed + ⌊hp/3⌋ ≤ 250`.**

É a decisão de design que faz o cadastro ser uma escolha e não um formulário.
Sem o teto nada impede cadastrar um monstro no máximo de tudo, todo mundo
cadastra esse, e a batalha entre dois monstros perfeitos é sempre a mesma. Com
ele, ataque comprado é defesa não comprada, e o `hp` entra dividido por três
porque um ponto de vida vale menos que um ponto de ataque. As duas constantes
são exportadas de
`packages/domain/src/monster.ts` (`STAT_LIMITS`, `ATTRIBUTE_BUDGET`) e usadas
direto pelo formulário — os `min`/`max` dos inputs, o medidor de pontos e o
botão "Sortear atributos" leem os mesmos números, em vez de repeti-los.

Quem preferir jogar sem orçamento de pontos: apague o `.refine(...)` de
`monsterFormSchema` e alargue `STAT_LIMITS`. Os testes do schema falham (é o
objetivo deles), o motor de batalha não muda.

---

## Onde o dado mora

Tudo no `localStorage` do navegador, em duas chaves:

| Chave            | Conteúdo                                                   | Mecanismo                                         |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `arena:roster`   | A coleção de monstros                                      | `localStorageCollectionOptions` do `@tanstack/db` |
| `arena:settings` | Duas preferências escalares: tema e velocidade de playback | `persist` do `@xstate/store`                      |

A coleção e as duas preferências escalares vivem no **mesmo mecanismo de
armazenamento, em chaves separadas** — é divisão por natureza do dado (uma
coleção consultada reativamente contra dois escalares lidos na inicialização),
não deriva.

- **Limpar os dados do site apaga o roster.** Não há backup e não há exportação.
- **Nada sai do navegador.** Não há requisição de rede no código da aplicação. A
  única exceção é o `image_url` que _você_ digita: o navegador vai buscar aquela
  imagem, como faria com qualquer `<img>`.
- **Sincroniza entre abas.** Duas abas abertas: cadastre numa e ela aparece na
  outra sem recarregar. É o evento `storage` nativo, de graça.

### O teto de ~5 MB

`localStorage` é síncrono e limitado a cerca de 5 MB por origem. Um roster
digitado à mão não chega perto — a semente inteira, com arte, ocupa poucos KB.
Mas `image_url` é texto livre, e **um `data:` URI colado pode ocupar centenas de
KB sozinho**. Colar alguns estoura a cota.

Não há limite de tamanho no schema, e isso é uma decisão consciente: recusar uma
URL legítima comprida seria pior que o problema. O que existe é tratamento: uma
escrita que estoura a cota falha com mensagem na tela, não com tela branca
(`apps/web/src/lib/storage-error.ts`, 5 testes), e o roster continua íntegro —
a coleção resincroniza com o storage real antes de relançar, para que a próxima
escrita bem-sucedida não arraste o resíduo da que falhou.

Se isso incomodar, a correção é uma linha em `monsterFormSchema`: um
`.max(N)` no `imageUrl`.

---

## Trocando o armazenamento

Trocar o armazenamento sem tocar em mais nada não é aqui uma promessa ilustrada
por um bloco de código de exemplo: **as duas implementações existem e as duas
rodam em todo `vp test`.**

O seam é um **parâmetro**, não uma classe:

```ts
// packages/infra/src/roster/collection.ts
export function createRosterCollection({
  storage = window.localStorage,
  storageEventApi = window,
}: RosterCollectionOptions = {}) { … }
```

- O navegador não passa nada e recebe o `localStorage` e o `window` reais
  (`apps/web/src/db/roster.ts`).
- Os testes passam um fake em memória (`packages/infra/src/roster/collection.test.ts`,
  22 testes) — é por isso que a camada de persistência roda em ambiente Node,
  sem jsdom e sem browser.

Trocar para `sessionStorage`, para um storage criptografado ou para um mock de
teste é passar outro objeto com a forma da `Storage` API. Nenhum outro arquivo
muda, e a checagem é literal:

```console
$ grep -rn "window.localStorage" packages/ --include='*.ts' --include='*.tsx'
packages/infra/src/roster/collection.ts:47:  storage = window.localStorage,
```

Uma linha, que é o default do parâmetro acima. (Um `grep` por `localStorage`
solto devolve quatro linhas do mesmo arquivo, mas três delas são o nome
`localStorageCollectionOptions` — o import, um comentário e a chamada. O
acoplamento real ao objeto do navegador é a linha 47 e só ela.)

O teste de sincronização entre abas usa isso de forma mais interessante ainda:
dois fakes compartilhando o mesmo `storageEventApi`, escrita num, leitura no
outro — a funcionalidade de duas abas provada sem abrir duas abas.

---

## Estrutura do monorepo

```
apps/
  web/            React + TanStack Router. Rotas, formulário, playback, E2E.
packages/
  domain/         Motor de batalha e schema do monstro. Sem React, sem I/O.
  infra/          Persistência: a coleção do roster e suas quatro operações.
  ui/             Design system. Não conhece rota, rede, storage nem form lib.
```

```
web ──► ui ──► domain
 └────► infra ──► domain
```

`packages/ui` recebe dado por prop e devolve evento por callback. O teste real
disso é que toda story renderiza sem provider nenhum.

**Não há barrel files.** Nenhum `index.ts` reexportando o pacote: o contrato
público de cada um é o campo `exports` do `package.json`, e o import diz de
onde a coisa vem (`@arena/domain/battle`, `@arena/ui/battle/FighterCard`). Toda
importação relativa carrega a extensão explícita do arquivo (`./monster.ts`),
porque a resolução é `nodenext`.

Toda dependência entra como `catalog:`, com a versão declarada uma única vez em
`pnpm-workspace.yaml`.

---

## Decisões e trade-offs

- **Vite+ em vez de Turborepo + ESLint + Prettier + tsc.** Um CLI cobre task
  runner, lint, format, type-check e testes. `vp check` é uma passada só, e não
  há quatro configurações para manter em acordo. Custo: `vp` é global e precisa
  ser instalado; e é isso que complica o deploy (veja [Deploy](#deploy)).
- **O motor indexa por lado (`left`/`right`), não por id.** A batalha não precisa
  saber quem são os monstros para reproduzir o log; `BattleResult` carrega
  `startHp` e é autossuficiente.
- **TanStack DB com `localStorageCollectionOptions`** — seção própria acima.
- **A criação da coleção é síncrona.** `localStorage` é síncrono, então não há
  banco assíncrono para esperar: nada de top-level await, nada de shell de
  carregamento, nada de primeira frame em branco. O único `await` da aplicação é
  um `preload()` no `main.tsx`, e ele existe para a primeira frame já sair com o
  roster no grid.
- **XState para fluxo, `@xstate/store` para dado.** A máquina de batalha e a de
  seleção têm estados; tema e velocidade são dois escalares e não merecem uma
  máquina. Cuidado registrado: o `@xstate/store` v4 **substitui o contexto
  inteiro** no retorno do handler — todo handler espalha `...context`.
- **`@xstate/graph`, não `@xstate/test`; `produce` do immer, não
  `@xstate/immer`.** Os dois últimos declaram peer `xstate: ^4`, são v4-only.
- **nuqs _e_ `validateSearch`.** Uma definição de parsers, dois consumidores
  (`apps/web/src/search-params.ts`). Sem o segundo, o router descarta os params
  que o nuqs acabou de escrever e a URL "esquece" a busca. O `validateSearch` é
  deliberadamente tolerante: `?page=abc` devolve a página 1, não uma tela de erro.
- **React Compiler ligado: zero `useMemo`, `useCallback` ou `memo`.** Ele é uma
  otimização, não uma garantia de identidade — onde a identidade importa, a
  solução é estrutural: a prop `key` que reinicia a arena
  (`key={JSON.stringify([left.id, right.id, runId])}`).
- **A fonte pixel (`Press Start 2P`) é escopada à arena e ao wordmark.** Ela
  carrega a identidade retrô sem sequestrar a legibilidade do formulário.
- **Nenhuma pixelização em CSS.** `image-rendering: pixelated` fazia sentido com
  sprites 64×64; com `image_url` arbitrário ele destruiria a imagem do usuário.
- **Mutação roda em `domain` e `infra`, não em `ui` nem em `apps/web`.** Mutante
  em componente React é equivalente demais e lento demais; o que ele mediria já
  é medido pelas stories e pelo E2E.

---

## Estratégia de testes

Cinco camadas, cada uma respondendo a uma pergunta diferente. Nenhuma substitui
a outra.

| Camada           | Ferramenta             | Pergunta que responde                        | Onde                     | Quantos |
| ---------------- | ---------------------- | -------------------------------------------- | ------------------------ | ------- |
| Unitário (AAA)   | Vitest                 | A regra está implementada certo?             | `domain`, `infra`, `web` | 94      |
| Mutação          | Stryker                | O teste **reclamaria** se a regra mudasse?   | `domain`, `infra`        | 100,00% |
| Componente       | Storybook + addon a11y | Renderiza e é acessível em todos os estados? | `ui`                     | 90      |
| Regressão visual | Playwright + reg-suit  | Algum pixel mudou sem ninguém pedir?         | `ui`                     | 90 PNGs |
| E2E (BDD)        | Playwright             | O usuário consegue completar o fluxo?        | `apps/web`               | 33      |

```bash
vp test                                     # 94 unitários
vp run test:stories                         # 90 stories, Chromium real
vp run vrt                                  # 90 PNGs contra a baseline
vp -C apps/web run test:e2e                 # 33 cenários
vp -C packages/domain run test:mutation     # 100,00%
vp -C packages/infra  run test:mutation     # 100,00%
```

Todo teste unitário é AAA — `// Arrange`, `// Act`, `// Assert`, com **um único
Act** — e o nome descreve o comportamento em português
(`'usa dano mínimo quando o ataque é igual à defesa'`). Todo cenário E2E é uma
sequência de `test.step('Dado …' / 'Quando …' / 'Então …')`, o que faz o trace
do Playwright virar a narrativa do teste.

Detalhes que valem a pena saber:

- **O E2E não faz uma única requisição de rede.** A semente entra por
  `page.addInitScript` gravando `arena:roster` antes de qualquer script da
  página, e a arte é `data:image/svg+xml`. Mas **o cenário de cadastro dirige a
  UI de verdade** com um helper `registrarMonstro(page, dados)` — cadastrar é
  justamente o que aquele teste existe para provar, e fingi-lo seria trapaça.
- **20 dos 33 cenários são gerados por modelo.** `getShortestPaths` do
  `@xstate/graph` percorre a `battleSetupMachine` e produz um caminho por estado
  alcançável; mais dois testes falham se algum estado ou algum evento do modelo
  ficar sem asserção na suíte. Caminho que ninguém pensou em escrever ainda é
  testado. Os outros 11 são escritos à mão (cadastro, roster, batalha).
- **A acessibilidade é medida em dois lugares.** O addon do Storybook roda o axe
  depois de cada `play`, em `test: 'error'`; e em desenvolvimento o `vp dev` roda
  o axe **contra o app de verdade** e escreve as violações no console
  (`apps/web/src/lib/dev-axe.ts`), cobrindo o que nenhuma story renderiza —
  rotas inteiras, o formulário com vários campos em erro, o diálogo por cima do
  grid.
- **Contraste no `:hover` é medido explicitamente**, porque o axe nunca passa o
  mouse: `packages/ui/src/testing/contrast.ts` resolve o estado no CSSOM e lê o
  número de um pixel composto num `<canvas>`. Foi assim que um botão em 3,74:1
  apareceu enquanto a suíte inteira reportava verde. Veja as
  [limitações conhecidas](#limitações-conhecidas) — a cobertura desse guarda tem
  fronteira, e ela está escrita.

### Regressão visual

A quarta camada existe para uma pergunta que nenhuma das outras faz: _mudou
algum pixel que ninguém pediu para mudar?_ O axe diz que o contraste passa, a
story diz que o componente renderiza, e os dois continuam verdes com um
`padding` errado.

```bash
vp run vrt          # captura e compara; um pixel diferente reprova
vp run vrt:approve  # promove a captura atual a baseline
```

O `vrt` constrói o Storybook, serve o build num servidor estático efêmero,
percorre o índice de stories num Chromium do Playwright gravando um PNG por
story (90 hoje), e o **reg-suit** compara imagem a imagem contra a baseline,
escrevendo `packages/ui/.vrt/report/index.html` — uma página com esperado,
obtido e diferença lado a lado. `vrt:approve` é o passo depois de conferir que a
mudança visual era a pretendida.

**Um único pixel visivelmente diferente reprova** — `thresholdRate` e
`thresholdPixel` são zero, então não existe "mudou pouco, deixa passar" por
área. O que existe é um piso de cor: `matchingThreshold: 0.05` no
`regconfig.json`, metade do padrão da própria biblioteca de comparação.

Ele existe porque duas capturas seguidas da mesma página **não** saem byte a
byte iguais. A carta derrotada — a única com `filter: grayscale` sobre um
elemento transformado — sai com até 7/255 de diferença por canal dentro da
própria moldura, sempre, invisível a olho nu. Sem esse piso o portão reprovava
essa imagem sem nada ter mudado, e um portão que mente é um portão que se
desliga. Com ele, dez execuções seguidas sem alterar nada dão dez verdes.

O preço está medido, não estimado. Deslocar a luminância do `--primary` em
**+3,4%** não é notado; em **+8,4%** treze stories reprovam. Mudanças de
geometria não têm essa folga: `px-2` → `px-2.5` num badge, dois pixels de cada
lado, reprova as cinco stories que desenham um badge.

O que reduz esse ruído até o ponto de caber sob o piso vem de cinco lugares:

- **Não há rede.** A arte dos monstros é `data:image/svg+xml` inline e as fontes
  entram no bundle do Storybook. Nada chega tarde, nada chega diferente.
- **A animação é congelada no frame que interessa.** `animations: 'disabled'`
  do `page.screenshot` leva toda animação **finita** ao último frame e cancela a
  **infinita** no primeiro. A carta derrotada aparece caída — é para isso que o
  `defeat-drop` existe, com `forwards` — e o balanço ocioso da arena aparece
  parado, sempre no mesmo ponto. Apagar as animações por CSS, o outro caminho
  possível, fotografaria a carta derrotada ainda em pé: esconderia justamente o
  estado que a story existe para mostrar.
- **O cursor de texto não entra na foto.** `caret: 'hide'`. Sem isso, a story
  que digita num campo sai com o cursor piscando em metade das capturas — a
  diferença aparecia e sumia sozinha.
- **A foto só é tirada depois do `play`.** A captura espera o evento
  `storyFinished` do próprio Storybook, que é emitido **depois** da função
  `play`, e então espera `document.fonts.ready`. Fotografar antes pegaria a
  story a meio caminho da interação que ela encena, ou o texto medido com a
  fonte errada.
- **Rasterização travada.** `--force-color-profile=srgb` (senão a mesma cor sai
  com bytes diferentes em monitores diferentes), `--disable-lcd-text`
  (antialiasing em escala de cinza, que não depende da ordem RGB do painel),
  `--font-render-hinting=none` e `deviceScaleFactor: 1` (numa tela HiDPI a mesma
  página sairia com o dobro de pixels).

**A baseline não é versionada.** Não é uma questão de peso: são 90 PNGs, 888 KB
no total. É que os mesmos 90 PNGs, capturados do **mesmo** build do Storybook
com o **mesmo** binário do Chromium, saem diferentes em sistemas operacionais
diferentes: **70 dos 90** mudam entre macOS e Linux, e 3 dos 90 mudam entre
Linux arm64 e Linux x86-64 — já descontado o piso de cor acima. A rasterização
de fonte é do sistema, não do navegador. Uma baseline versionada valeria só na
máquina que a gerou, e o CI reprovaria dezenas de imagens para sempre. Então
cada ambiente guarda a sua: localmente em `packages/ui/.vrt/baseline` (ignorado
pelo git), e no CI no cache do GitHub Actions, com sistema e arquitetura na
chave e gravado só pela branch padrão. Nenhum bucket, nenhuma conta de nuvem.

Duas fronteiras, para não serem descobertas do jeito difícil:

- **Um tema por story.** O preview roda em escuro; as stories que precisam do
  claro declaram `globals: { theme: 'light' }`. A captura respeita esse
  `globals`, mas não fotografa a mesma story nos dois temas.
- **Story nova não reprova.** Ela entra no relatório como "nova" e passa a valer
  como baseline no `vrt:approve` seguinte — não há contra o que compará-la.

### O que não é testado, e por quê

- **Mutação em componente React**: mutante equivalente demais, lento demais.
- **E2E contra rede real**: não existe rede real. O E2E existe para o fluxo.
- **Migração de dado já gravado**: o carregamento inicial da coleção só confere
  que o JSON é serializável, nunca roda o `monsterSchema`. Um monstro salvo sob
  uma regra antiga volta como está. Está anotado em `collection.ts` e listado
  nas limitações abaixo.

---

## Integração contínua

`.github/workflows/ci.yml`. Quatro jobs de teste em paralelo e um de publicação
que só roda depois deles:

| Job        | O que roda                                                        | Quando                                |
| ---------- | ----------------------------------------------------------------- | ------------------------------------- |
| `ready`    | `vp run ready` (check + 94 unitários + 90 stories + build)        | todo push/PR                          |
| `e2e`      | os 33 cenários Playwright, com o relatório HTML como artefato     | todo push/PR                          |
| `mutation` | os dois Strykers, com os relatórios como artefato                 | todo push/PR                          |
| `visual`   | `vp run vrt` — 90 PNGs contra a baseline, relatório como artefato | todo push/PR                          |
| `publish`  | build do Storybook + upload para o GitHub Pages                   | só `main`, e só se os quatro passarem |

O `publish` declara `needs: [ready, e2e, mutation, visual]` e uma condição de
branch. Deploy verde a partir de build vermelho é pior que deploy nenhum, e um
PR não publica.

Cinco coisas que o workflow resolve e que um clone novo não resolve sozinho:

- **Ter o `vp` e o Node certos.** Todo job roda **dentro** da imagem oficial
  `ghcr.io/voidzero-dev/vite-plus`, que já traz o CLI e provisiona o Node lendo o
  `engines.node` da raiz. Por isso não há `setup-node` no workflow: seria uma
  segunda fonte de verdade para a versão do Node, e a que perde. A imagem roda
  como o usuário não-root `vp` e o runner cria o diretório de trabalho como root,
  daí o `options: --user root` em cada `container:`.

  A tag é **fixa** (`:0.2.8`), e não `latest`: o pacote `vite-plus` que o
  `vp install` põe no workspace é o companion local desse mesmo CLI, e os dois
  precisam bater. Com `latest`, o par se desfaria sozinho no dia em que saísse
  uma versão nova, sem ninguém mudar uma linha do repositório — uma build que
  quebra por conta própria, num dia qualquer. **Ao subir a tag, suba junto o
  `vite-plus` do catálogo em `pnpm-workspace.yaml`**; são três lugares (a tag no
  `ci.yml`, a do `Dockerfile` e o catálogo) e o repositório não tem como
  confrontá-los sozinho.

- **Instalar o Chromium do Playwright**, com
  `vp -C <pacote> exec playwright install --with-deps chromium`. Sem esse passo
  a suíte de stories e o E2E falham num ambiente limpo, e essa era exatamente a
  lacuna: as três suítes mais caras rodavam só quando alguém digitava o comando.
- **Gerar a árvore de rotas antes do `ready`**, pelo motivo descrito em
  [Como rodar](#como-rodar). Descoberto justamente clonando o repositório num
  diretório vazio: sem esse passo o job morreria na primeira execução.
- **Guardar a baseline visual entre execuções.** Ela não é versionada (o porquê
  está em [Regressão visual](#regressão-visual)), então quem a carrega de uma
  execução para a outra é o cache do GitHub Actions: `restore-keys` casa por
  prefixo e devolve a entrada mais recente, e só a branch padrão grava — assim
  todo PR compara com o último estado aprovado de `main`, e não consigo mesmo.
  Na primeiríssima execução não existe baseline; o job emite um `::warning::`
  dizendo que passou sem comparar nada, porque um verde silencioso ali seria
  indistinguível de um verde de verdade.
- **Não rodar tudo duas vezes.** `on: push` está restrito a `main`; as demais
  branches entram pelo `pull_request`. Com `push: ['**']` **e** `pull_request`,
  um PR aberto de uma branch do próprio repositório dispara os dois eventos com
  refs diferentes, o que dá dois grupos de `concurrency` e o dobro de jobs por
  push, nenhum cancelando o outro.

**Este workflow rodou uma vez, e morreu antes de testar coisa alguma.** Os
quatro jobs pararam no mesmo passo, o que instalava o `vp` por `curl | bash`:
`vp --version | head -n1` fechava o cano na primeira das 17 linhas de saída, o
binário (que é Rust, e Rust ignora SIGPIPE em vez de morrer quieto) entrava em
pânico com `Broken pipe (os error 32)` e saía com 134 — que o `pipefail` do
shell promovia a código do passo. Esse passo não existe mais: quem entrega o
`vp` agora é a imagem.

O que continua **não verificado** é a montagem do runner com `container:` — o
`--user root`, o `--with-deps` e as actions do Pages rodando dentro da imagem.
Os comandos em si são os mesmos verificados à mão neste ambiente.

---

## Deploy

Dois destinos, conteúdos diferentes — veja
[O que está publicado onde](#o-que-está-publicado-onde) antes de clicar em
qualquer link.

### GitHub Pages — o Storybook

Automático, pelo job `publish` do CI: build do Storybook e upload pelas actions
oficiais do Pages (`configure-pages`, `upload-pages-artifact`, `deploy-pages`),
com `pages: write` / `id-token: write` e um `environment: github-pages`. Nada de
empurrar uma branch `gh-pages` à mão.

Um repositório tem **um** site do Pages, e ele é do Storybook. O app não entra
nesse artefato: ele sai como imagem de container, abaixo.

**O prefixo do site (`base`) é a única coisa que pode dar errado aqui**, e ela
falha em silêncio: um `base` errado publica uma página que abre com todo asset
em 404. Por isso ele não é digitado em lugar nenhum — sai do output `base_path`
do `actions/configure-pages`, que a própria API do Pages calcula:

| Tipo de site                         | `base_path` | `base` do Storybook |
| ------------------------------------ | ----------- | ------------------- |
| Project page (`user.github.io/repo`) | `/repo`     | `/repo/`            |
| User/org page ou domínio próprio     | `` (vazio)  | `/`                 |

Localmente o default é `/`, que é o que o `storybook dev` e o build local
servem. Para reproduzir o caso de project page na máquina:

```bash
STORYBOOK_BASE_PATH=/meu-repo vp run build-storybook
```

Duas armadilhas já pagas, para não custarem de novo:

- **`base` no `vite.config.ts` do `packages/ui` não teria efeito.** O builder do
  Storybook fixa `base: './'` na config comum dele e a mescla por cima da do
  usuário. O único ponto que fala por último é o `viteFinal` do
  `.storybook/main.ts` — é lá que o `base` é resolvido.
- **O build do Storybook é uma TAREFA do `vite.config.ts` da raiz, não um script
  do `package.json`.** Tarefa é o único caminho que aceita `env`, e sem `env` a
  variável **não chega**: tarefa do Vite Task roda em ambiente limpo (só `PATH`,
  `HOME`, `CI` e afins). Medido: pelo script,
  `STORYBOOK_BASE_PATH=/repo vp run build-storybook` produzia um build com base
  `/`, sem uma palavra de aviso. Declarar no `env` também põe a variável na
  impressão digital do cache, então um artefato construído com outro base não é
  restaurado por engano.

O job ainda confere o resultado antes de publicar: se o `iframe.html` não
referenciar `<base>/assets/`, ele falha em vez de publicar uma página quebrada.

**Verificado**, não assumido. O build saído de um clone limpo com
`STORYBOOK_BASE_PATH=/meu-repo` foi servido sob esse prefixo por um servidor que
reproduz as regras do Pages (arquivo real primeiro, diretório → `index.html`):
`/meu-repo/`, `/meu-repo/iframe.html` e `/meu-repo/index.json` respondem 200, e
`/` e `/assets/` respondem 404 — ou seja, nada escapou do prefixo. Um **deep
link para uma story específica**
(`/meu-repo/?path=/story/monster-monstercard--arte-quebrada`) foi aberto num
navegador de verdade: a story certa selecionada e renderizada, o iframe de
preview em `/meu-repo/iframe.html?id=…`, e **nenhum dos 37 recursos carregados
(9 do manager + 28 do preview) com status ≥ 400 nem fora do prefixo**.

O roteamento do Storybook é por query param, não por caminho, então não há rota
a reescrever e **nenhum `404.html` é necessário** — o que também significa que
nada aqui depende do truque de fallback que um SPA precisaria no Pages.

### Docker — o app

O `Dockerfile` na raiz, em dois estágios:

```bash
docker build -t arena-web .
docker run --rm -p 8080:8080 arena-web
```

O estágio de build é a imagem oficial `ghcr.io/voidzero-dev/vite-plus`, que já
traz o `vp` e provisiona o Node pelo `engines.node`. **É o que faz a versão do
Node ser decidida dentro do container**, e não pela imagem de build de uma
plataforma — e é a razão de o container ser o caminho de deploy daqui: a
`engines.node` deste repositório é `>= 26`, e plataformas de build costumam
oferecer 20/22/24, resolvendo isso **antes** de qualquer comando de instalação
rodar, quando o `vp` que traria o Node certo ainda nem existe. O estágio final é
um `nginx:1-alpine` com os estáticos e nada mais — sem Node, sem `vp`, sem
`node_modules`.

O `docker/nginx.conf.template` existe por uma razão só, e ela não é opcional: o
roteamento do app é client-side. Sem `try_files $uri $uri/ /index.html`, `/`
responde 200 e `/battle` e `/monsters/new` respondem **404** — servir o `dist`
com um estático qualquer não basta. `/assets/` sai com `immutable` (os nomes têm
hash) e o `index.html` com `no-store` (é ele que aponta para o hash da vez). A
porta vem de `PORT` (padrão 8080), para as plataformas que a injetam no
ambiente.

Verificado com a imagem construída localmente: `/`, `/battle` e `/monsters/new`
respondem 200; `/assets/nao-existe.js` responde 404 em vez de cair no fallback;
o app renderiza sem erro de console.

---

## Limitações conhecidas

Nenhuma destas é surpresa; todas estão anotadas no código também.

- **O guarda de contraste cobre `:hover` e só `:hover`.** O `textContrast()` de
  `packages/ui/src/testing/contrast.ts` aceita literalmente `pseudo?: ':hover'`.
  A varredura completa das variantes de estado do pacote, com a contagem de
  ocorrências, é a base do que vem a seguir:
  - **`:active` — 1 variante**, `active:not-aria-[haspopup]:translate-y-px`. É
    uma **transformação**. Nenhuma variante `active:` muda cor. Não há o que
    medir.
  - **`:focus-visible` — 9 variantes**: `ring-ring/50` (×4), `border-ring` (×4),
    `ring-destructive/40` (×2), `ring-destructive/20` (×2), `ring-[3px]` (×2),
    `ring-3` (×2), `border-destructive/40`, `z-10`. **Zero `bg-*` e zero
    `text-*`** — o contraste do **texto** não muda no foco. O que fica sem
    medição é o contraste do **anel de foco** contra a cor adjacente
    (WCAG 1.4.11, 3:1), que é outro critério e que este helper, por medir texto
    contra fundo, não consegue expressar sem virar outra ferramenta.
  - **`:disabled` — 5 variantes**: `opacity-50` (×4), `pointer-events-none`
    (×3), `cursor-not-allowed` (×2), `bg-input/50` e `dark:disabled:bg-input/80`
    (as duas em `input.tsx`), mais `group-data-[disabled=true]:opacity-50` e
    `:pointer-events-none` em `label.tsx`. Três delas mudam de fato o que é
    pintado — a opacidade e os dois fundos —, mas a **WCAG 1.4.3 isenta
    explicitamente componentes inativos** de requisito de contraste, então não
    há critério a medir.

  Conclusão: a lacuna real é o anel de foco, e ela é uma medição diferente
  (não-texto, contra a cor adjacente), não um parâmetro a mais no helper
  existente. Não foi fechada.

- **Dado gravado por uma versão anterior não é validado na leitura.** O
  carregamento inicial da coleção confere só que o JSON é serializável. Uma
  linha em formato antigo volta com campos `undefined` enquanto o TypeScript
  continua achando que é um `Monster` completo. Anotado em `collection.ts`.
- **Uma escrita que falha faz a coleção resincronizar inteira.** O
  `cleanup() + preload()` reemite um evento de mudança para cada linha, não só
  para a que falhou. O estado final está correto; o que quebra é código que
  dependa da identidade do evento. Anotado em `collection.ts`.
- **~5 MB de `localStorage`**, e `image_url` é texto livre. Veja
  [O teto de ~5 MB](#o-teto-de-5-mb).
- **A imagem publica estáticos, e só.** Não há preview por PR, CDN, domínio nem
  TLS configurados aqui: o `Dockerfile` entrega um nginx servindo o `dist` numa
  porta, e o resto é de quem hospeda. Veja [Docker — o app](#docker--o-app).
- **O workflow de CI em container nunca rodou.** A execução anterior morreu no
  passo que instalava o `vp`, antes de qualquer teste; a montagem atual só é
  exercitada no primeiro push. Veja
  [Integração contínua](#integração-contínua).
- **A regressão visual tem um piso de cor de ~5% de luminância**, e cada
  ambiente carrega a própria baseline. Os dois números e o porquê estão em
  [Regressão visual](#regressão-visual).
- **`vp run <tarefa>` roda em ambiente limpo.** Uma variável de ambiente que a
  tarefa precise tem de estar declarada no `env` dela, ou ela não chega — em
  silêncio, sem erro. Só o build do Storybook depende disso hoje, e ele já
  declara; a armadilha fica registrada porque a próxima tarefa que precisar de
  uma variável vai encontrá-la.

---

## Documentos do projeto

- `docs/plans/2026-08-08-batalha-de-monstros.md` — o documento de design: o
  modelo de domínio, o algoritmo de batalha, as fronteiras de pacote, a
  persistência, a acessibilidade e a estratégia de testes, com o porquê de cada
  escolha.
- `AGENTS.md` — como o Vite+ é usado neste repositório.
