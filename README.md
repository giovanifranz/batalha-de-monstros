# Batalha de Monstros

Cadastre monstros, escolha dois, assista à batalha. Roda inteiro no navegador:
**sem backend, sem API, sem variável de ambiente**. O roster mora na memória da
aba e a batalha é uma função pura.

| No ar                                                                       | O que é                                                        |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [app](https://batalhademonstros-app-648jii-3fde04-129-148-25-175.sslip.io/) | O jogo. É aqui que se cadastra monstro e se assiste à batalha. |
| [design system](https://giovanifranz.github.io/batalha-de-monstros/)        | O Storybook, componente por componente. **Não é o app.**       |

## Como rodar

```bash
curl -fsSL https://vite.plus | bash   # instala o Vite+ (o CLI `vp`)
vp install                            # dependências do workspace
vp dev                                # app em http://localhost:5173
```

Quatro coisas que valem saber antes:

- **`vp dev` é o terceiro comando por um motivo.** Ele (e o build) gera
  `apps/web/src/routeTree.gen.ts`, artefato do TanStack Router que está no
  `.gitignore`. Rodar `vp check` antes falha com 9 erros de tipo que descendem
  todos dessa ausência. Depois da primeira geração fica verde.
- **Não use `npm` nem `npx`.** O repositório declara
  `devEngines.packageManager: pnpm` e o npm aborta com `EBADDEVENGINES`.
- **O instalador do Vite+ edita seus arquivos de shell** e pergunta se pode
  gerenciar as versões do Node — aceite, é assim que você recebe o Node 26 que o
  `engines.node` exige. Para instalar fora do padrão, `VP_HOME=/onde/quiser`.
- Na primeira execução o roster é semeado com doze monstros, oito por página.
  São dados normais: podem ser editados, excluídos e restaurados.

## Ferramentas

| Camada           | Escolha                                                               |
| ---------------- | --------------------------------------------------------------------- |
| Toolchain        | **Vite+** (`vp`) — task runner, oxfmt, oxlint, tsgolint e Vitest      |
| Gerenciador      | pnpm 11 via `devEngines`, com catálogo único em `pnpm-workspace.yaml` |
| App              | React 19 + TypeScript 7, React Compiler ligado                        |
| Rotas            | TanStack Router (file-based, `autoCodeSplitting`)                     |
| Estado do roster | TanStack DB — `localOnlyCollectionOptions`, em memória                |
| Estado de fluxo  | XState 5 (batalha e seleção) + `@xstate/store` (tema e velocidade)    |
| Estado na URL    | nuqs, com `validateSearch` do router                                  |
| Formulário       | TanStack Form + zod 4 como Standard Schema                            |
| Estilo           | Tailwind 4 (CSS-first) + shadcn/ui sobre `radix-ui`                   |
| Testes           | Vitest, Playwright, Storybook 10, Stryker, reg-suit                   |
| Análise estática | SonarCloud                                                            |
| Deploy           | Imagem Docker com nginx não-privilegiado                              |

**React Compiler ligado significa zero `useMemo`, `useCallback` ou `memo`.** Onde
a identidade importa, a solução é estrutural — a prop `key`.

## Comandos

| Comando                                   | O que roda                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `vp dev`                                  | O app, via `defaultPackage` do `vite.config.ts` da raiz                  |
| `vp check`                                | Portão único: oxfmt + oxlint + type-check numa passada                   |
| `vp check --fix`                          | O mesmo, corrigindo o que é mecânico                                     |
| `vp test`                                 | 187 unitários — domain (46), infra (40), web (101). **Sem** as stories   |
| `vp run test:stories`                     | 95 stories num Chromium real, com o addon de a11y em `test: 'error'`     |
| `vp run ready`                            | `check` + `test` + `test:stories` + `build`. O comando antes de abrir PR |
| `vp -C apps/web run test:e2e`             | 33 cenários Playwright (BDD, sem rede)                                   |
| `vp -C packages/domain run test:mutation` | Stryker no motor de batalha e no schema (`break: 100`)                   |
| `vp -C packages/infra run test:mutation`  | Stryker na persistência (`break: 100`)                                   |
| `vp run vrt`                              | Regressão visual: 95 PNGs contra a baseline                              |
| `vp run vrt:approve`                      | Grava a captura atual **como** baseline                                  |
| `vp -C packages/ui run storybook`         | Storybook em http://localhost:6006                                       |
| `vp -C apps/web build`                    | Build de produção → `apps/web/dist`                                      |

Duas formas que **não** funcionam:

- `vp run -C apps/web test:e2e` → `-C` é opção global e vem antes do subcomando.
- `vp run web#build` → o build do app é `vp -C apps/web build` ou `vp run -r build`.

`vp test` na raiz varre o workspace como **um** projeto Vitest e não enxerga o
`vitest.config.ts` do `packages/ui`, que é quem declara o projeto de browser. Ler
"os testes passam" só do `vp test` já deixou 13 falhas de contraste passarem.

### Hooks de git

Versionados em `.vite-hooks/`, instalados pelo `vp config` que o `prepare` dispara
em todo `vp install`.

| Hook         | Roda                  |
| ------------ | --------------------- |
| `pre-commit` | `vp staged`           |
| `pre-push`   | `vp check && vp test` |

O `check` do `pre-push` type-checa o `routeTree.gen.ts`, que é gitignored: num
clone que nunca rodou `vp dev` o push falha em erros que não são do seu commit.
Para pular, `VP_GIT_HOOKS=0 git commit`.

## Estrutura

```
apps/
  web/       React + TanStack Router. Rotas, formulário, playback, E2E.
packages/
  domain/    Motor de batalha e schema do monstro. Sem React, sem I/O.
  infra/     Persistência: a coleção do roster e suas operações.
  ui/        Design system. Não conhece rota, rede, storage nem form lib.
```

```
web ──► ui ──► domain
 └────► infra ──► domain
```

**Sem barrel files.** O contrato público de cada pacote é o campo `exports` do
`package.json`, e o import diz de onde a coisa vem (`@arena/domain/battle`). Toda
importação relativa carrega a extensão explícita (`./monster.ts`), porque a
resolução é `nodenext`.

`packages/ui` recebe dado por prop e devolve evento por callback — o teste disso é
que toda story renderiza sem provider nenhum.

## Onde o dado mora

| Onde             | Conteúdo                        | Mecanismo                    |
| ---------------- | ------------------------------- | ---------------------------- |
| memória da aba   | A coleção de monstros           | `localOnlyCollectionOptions` |
| `arena:settings` | Tema e velocidade de reprodução | `persist` do `@xstate/store` |

**O roster é da sessão.** Recarregar recomeça pelos doze exemplos: o que você
cadastrou, editou ou excluiu não sobrevive a um F5. É deliberado — a coleção não
tem storage por baixo, e é isso que tira qualquer teto de tamanho do cadastro. O
tema e a velocidade sobrevivem, porque essas duas ficam no `localStorage`.

Voltar a persistir é trocar `localOnlyCollectionOptions` por outra fábrica de
opções do `@tanstack/db` dentro de `createRosterCollection`. Nenhum consumidor
muda, e a checagem é literal — nenhum arquivo fora dele importa `@tanstack/db`:

```console
$ grep -rln "@tanstack/db" packages/ --include='*.ts'
packages/infra/src/roster/collection.ts
```

## Testes

Cinco camadas, cada uma respondendo a uma pergunta diferente.

| Camada           | Ferramenta             | Pergunta                              | Onde            |
| ---------------- | ---------------------- | ------------------------------------- | --------------- |
| Unitário         | Vitest (node)          | A regra está certa?                   | os três pacotes |
| Mutação          | Stryker (`break: 100`) | O teste morre se a regra mudar?       | domain, infra   |
| Story            | Storybook + a11y       | O componente renderiza e é acessível? | ui              |
| Regressão visual | Playwright + reg-suit  | Mudou pixel que ninguém pediu?        | ui              |
| E2E              | Playwright (BDD)       | O fluxo funciona no navegador?        | web             |

Detalhes que valem a pena:

- **Mutação só em `domain` e `infra`.** Mutante em componente React é equivalente
  demais e lento demais; o que ele mediria já é medido pelas stories e pelo E2E.
- **18 dos 33 cenários E2E são gerados por modelo.** O `getShortestPaths` do
  `@xstate/graph` caminha a máquina de seleção, e duas guardas garantem que todo
  evento tem executor e todo estado alcançável tem asserção.
- **Contraste no `:hover` é medido**, porque o axe nunca passa o mouse:
  `packages/ui/src/testing/contrast.ts` resolve o estado no CSSOM e lê o número de
  um pixel composto num `<canvas>`. O que fica de fora é o anel de foco contra a
  cor adjacente, que é o critério 1.4.11.
- **A persistência roda em node**, sem jsdom e sem browser: a coleção é em
  memória, então o teste não precisa de fake nenhum.

## Integração contínua

Em `.github/workflows/ci.yml`, todos em container:

| Job                        | O que roda                                         | Onde         |
| -------------------------- | -------------------------------------------------- | ------------ |
| `ready`                    | `vp run ready` + a cobertura como artefato         | PR e `main`  |
| `playwright`               | os 33 cenários, com o relatório HTML como artefato | só no PR     |
| `stryker`                  | os dois pacotes com `break: 100`                   | só no PR     |
| `regressão visual`         | os 95 PNGs contra a baseline do cache              | só no PR     |
| `gravar a baseline visual` | recaptura os 95 PNGs e guarda no cache             | só no `main` |
| `sonarqube cloud`          | análise estática e cobertura, com quality gate     | PR e `main`  |
| `publicar o Storybook`     | build com o base do Pages e deploy                 | só no `main` |

**Os três portões que só rodam no PR validam a mesma árvore que o merge produz**,
então repeti-los depois é gastar minuto sem descobrir nada. O que sobra no `main`
é o que não dá para adiantar: a análise da branch padrão, que é a linha de base de
"código novo" da SonarCloud, e a publicação.

### Aprovando uma mudança visual num PR

A baseline vive no cache do Actions e é por sistema **e por arquitetura** — aprovar
localmente não serve, porque a sua captura não é Linux X64.

1. Abra o artefato `visual-report` da execução que reprovou e confira cada
   diferença.
2. Ponha a label **`vrt-approved`** no PR. Isso redispara o CI, porque `labeled`
   está nos `types` do trigger.
3. O job de comparação sai de cena nesse PR, e o merge entra verde. Depois do
   merge, o job `gravar a baseline visual` recaptura no `main` e é essa gravação
   que passa a valer para todo mundo.

Quem põe a label auto-aprova. E a gravação é **só no `main`** por uma restrição do
Actions, não por gosto: cache criado num run de `pull_request` fica no escopo
`refs/pull/<n>/merge` e só volta em re-run do mesmo PR — nenhuma outra branch o lê.
O efeito colateral bom é que abandonar um PR aprovado não deixa resíduo, porque
nada foi gravado fora dele.

## Deploy

O app sai como imagem de container servindo os estáticos por nginx:

```bash
docker build -t arena-web .
docker run --rm -p 8080:8080 arena-web
```

O runtime é `nginxinc/nginx-unprivileged` e roda como uid 101 — nada ali precisa
de root: a porta é 8080, o payload é só-leitura e o log vai para stdout. A porta
vem de `PORT`, para as plataformas que a injetam no ambiente.

O fallback de SPA é `try_files $uri $uri/ /index.html`, com `/assets/` marcado
`immutable` (os nomes têm hash) e o `index.html` com `no-store`.
