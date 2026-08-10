# Batalha de Monstros — Documento de Design

Um card game de turnos que roda inteiro no navegador. O jogador cadastra
monstros, escolhe dois, e assiste ao duelo se resolver sozinho até o vencedor
aparecer. Não há backend, não há API externa, não há variável de ambiente.

Este documento descreve o sistema como ele foi desenhado: o modelo de domínio, o
algoritmo de batalha, onde as fronteiras de pacote caem e por quê, como o dado é
persistido, o que cada camada de teste responde e o que a acessibilidade cobre.

**Stack:** Node 26, Vite+ (`vp`), React 19 + React Compiler, TypeScript, TanStack
Router / Form / DB, nuqs, XState 5 + `@xstate/store`, Zod 4, Tailwind CSS 4,
shadcn/ui, Storybook, Playwright, Stryker, reg-suit.

**Modo de jogo:** um só — cadastra, escolhe dois, assiste, vê o resultado.

---

## Índice

1. [O modelo de domínio](#1-o-modelo-de-domínio)
2. [O algoritmo de batalha](#2-o-algoritmo-de-batalha)
3. [Fronteiras de pacote](#3-fronteiras-de-pacote)
4. [Persistência](#4-persistência)
5. [Estado da aplicação](#5-estado-da-aplicação)
6. [Design system e tema](#6-design-system-e-tema)
7. [Acessibilidade](#7-acessibilidade)
8. [Estratégia de testes](#8-estratégia-de-testes)
9. [O portão único e a integração contínua](#9-o-portão-único-e-a-integração-contínua)
10. [Deploy](#10-deploy)
11. [Limites declarados](#11-limites-declarados)

---

## 1. O modelo de domínio

Um monstro são seis campos e um id:

```ts
export type Monster = {
  id: string;
  name: string;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  imageUrl: string;
};
```

Nada de tipo elemental, nada de habilidade, nada de nível. A escolha é
deliberada: o jogo inteiro é decidido por quatro números, então tudo o que não
entra na conta é enfeite que o jogador teria de aprender a ignorar. Um monstro é
um ponto num espaço de quatro dimensões, e cadastrar é escolher onde ficar nesse
espaço.

### A regra de balanceamento

O cadastro impõe, além dos seis campos:

- `attack` 1–100, `defense` 0–100, `speed` 0–100, `hp` 100–300;
- **`attack + defense + speed + ⌊hp/3⌋ ≤ 250`.**

**Esta é a decisão de design que faz o cadastro ser uma escolha e não um
formulário.** Sem o teto, nada impede cadastrar um monstro no máximo de tudo;
todo jogador cadastra esse monstro; e a batalha entre dois monstros perfeitos é
sempre a mesma batalha. Com o teto, cada ponto de ataque é um ponto de defesa ou
de velocidade que não foi comprado, e o jogo passa a ter estratégias distintas —
o rápido que ataca primeiro e o tanque que sobrevive à primeira investida são
construções diferentes, e nenhuma domina a outra por construção.

O `hp` entra dividido por três porque um ponto de vida vale menos que um ponto
de ataque: contra um atacante de 50, cada 3 de vida compram aproximadamente o
mesmo que 1 de ataque compra em dano por golpe. A divisão inteira (`⌊⌋`) faz o
teto ser exato e testável em vez de aproximado.

O orçamento de 250 sai de uma conta simples: um monstro no meio da faixa em tudo
(50/50/50, hp 200) gasta `50 + 50 + 50 + 66 = 216`, o que deixa folga real para
especializar sem que a especialização máxima seja gratuita. Um monstro no teto
de três stats (100/100/100) já estouraria sozinho, antes mesmo do `hp`.

As duas constantes são exportadas:

```ts
export const STAT_LIMITS = {
  attack: { min: 1, max: 100 },
  defense: { min: 0, max: 100 },
  speed: { min: 0, max: 100 },
  hp: { min: 100, max: 300 },
} as const;

export const ATTRIBUTE_BUDGET = 250;
```

Elas são exportadas porque o formulário as consome: os `min`/`max` dos inputs, o
medidor de pontos e o botão de sortear atributos leem os mesmos números em vez
de repeti-los. Um limite que aparece em quatro lugares diverge em três.

O `attack` tem mínimo 1 e não 0 — um monstro que não ataca nunca vence e a
batalha só termina pelo dano do outro. Defesa e velocidade podem ser 0: são
escolhas válidas de construção.

### Um schema, e ele é o do domínio

```ts
export const monsterFormSchema = z.object({ … }).refine(
  (data) => data.attack + data.defense + data.speed + Math.floor(data.hp / 3) <= ATTRIBUTE_BUDGET,
  { message: 'A soma dos atributos não pode ultrapassar 250 pontos' },
);

export const monsterSchema = monsterFormSchema.extend({ id: z.string() });
```

O formulário valida com `monsterFormSchema`; a coleção persistida valida com
`monsterSchema`, que é o mesmo mais o `id`. **Não há um segundo schema em
lugar nenhum** — nem JSON Schema de banco, nem tipo de documento derivado, nem
asserção de equivalência para manter em dia. É o que apaga, por construção, a
classe de bug em que o piso de `hp` diverge entre duas declarações do mesmo dado.

Os números são `z.number()` e não `z.coerce.number()`: o TanStack Form usa o tipo
de **entrada** do Standard Schema, e `coerce` tem entrada `unknown`, o que
destrói a inferência de `defaultValues`. O input converte com `valueAsNumber`
antes do `handleChange`; campo vazio vira `NaN`, que o `z.number()` rejeita com a
mensagem certa.

As mensagens de erro são conteúdo, não decoração — cada uma é asserida por teste,
não só a falha. Um schema testado por "rejeita?" passa com a mensagem apagada.

### Erros

`MonsterNotFoundError` é o único erro de domínio. Ele existe para que a UI reaja
a "esse monstro não existe" sem saber de onde veio a ausência — chave que sumiu
do storage, link colado à mão com um id inventado, aba que apagou o monstro
enquanto a outra o abria.

---

## 2. O algoritmo de batalha

As regras do jogo, todas em `packages/domain/src/battle.ts`, em funções puras que
não conhecem React, storage nem rota:

1. **Quem tem mais velocidade ataca primeiro.**
2. **Empate de velocidade resolve pelo maior ataque.**
3. **`dano = ataque − defesa`; se `ataque ≤ defesa`, o dano é 1.**
4. **`hp = hp − dano`** a cada golpe.
5. **Vence quem zerar o HP do adversário primeiro.**

E uma sexta, que as cinco acima não decidem e que o jogo precisa decidir:

6. **Empate de velocidade _e_ de ataque começa pelo Lutador 1** (lado esquerdo).

A sexta existe porque o resultado tem de ser determinístico. Dois monstros
idênticos podem lutar — inclusive o mesmo monstro contra si próprio — e sortear a
iniciativa faria a mesma tela produzir resultados diferentes a cada recarga, o
que quebraria tanto o teste quanto a expectativa do jogador de que a batalha é
uma consequência dos atributos.

### O motor indexa por lado, nunca por id

```ts
export type Side = 'left' | 'right';
```

O log de batalha é indexado por `'left' | 'right'`, e nunca por `monster.id`.
Duas razões, e a segunda é a que importa:

- **Espelhamento funciona.** O mesmo monstro dos dois lados não colide numa
  chave, porque a chave não é o id.
- **O log é autossuficiente.** Quem reproduz a batalha não precisa carregar os
  monstros junto: `BattleResult` carrega `startHp` de cada lado, e o HP de
  qualquer frame sai só do log. É o que permite a máquina de reprodução ser
  ignorante do domínio.

### Dano

```ts
export const MIN_DAMAGE = 1;

export function calculateDamage(attack: number, defense: number): number {
  return attack > defense ? attack - defense : MIN_DAMAGE;
}
```

A condição compara **ataque e defesa**, e não o dano bruto com o piso. As duas
perguntas coincidem hoje só porque o piso vale 1; escrever a regra literalmente
mantém o código correto se o piso mudar, e faz o caso de fronteira
(`ataque = defesa + 1`, dano bruto exatamente 1) ser distinguível por teste do
caso em que o piso entrou.

O piso de 1 não é enfeite: **é ele que garante que toda batalha termina.** Sem
ele, dois monstros com defesa maior que o ataque do outro trocariam golpes de
dano zero para sempre. Com ele, cada turno tira pelo menos 1 de HP, então o
duelo dura no máximo `left.hp + right.hp` turnos. Para dois monstros válidos pelo
schema o pior caso é exatamente 599: HP 300 dos dois lados, o perdedor levando
300 golpes e o vencedor 299.

`MAX_TURNS = 20_000` existe mesmo assim, como rede de segurança para uma chamada
direta da função com valores fora do schema (HP acima de 10 000 dos dois lados
alcança o limite de verdade). É código defensivo por construção, e está marcado
como tal para o teste de mutação em vez de coberto por um teste artificial.

### Iniciativa

```ts
export function resolveFirstAttacker(left: Monster, right: Monster): Side {
  if (left.speed !== right.speed) return left.speed > right.speed ? 'left' : 'right';
  if (left.attack !== right.attack) return left.attack > right.attack ? 'left' : 'right';
  return 'left';
}
```

Três ramos, na ordem das regras 1, 2 e 6. A guarda de desigualdade antes da
comparação é o que torna cada ramo alcançável isoladamente por teste.

### A batalha inteira, de uma vez

`simulateBattle(left, right)` roda o duelo completo e devolve o log fechado
**antes de qualquer pixel aparecer na tela**:

```ts
export type BattleTurn = {
  index: number;
  /** Round do jogo: dois turnos por round. */
  round: number;
  attacker: Side;
  defender: Side;
  damage: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  /** true quando ataque <= defesa e o dano caiu no piso de 1. */
  isChip: boolean;
};

export type BattleResult = {
  first: Side;
  winner: Side;
  loser: Side;
  turns: BattleTurn[];
  rounds: number;
  totalDamage: Record<Side, number>;
  startHp: Record<Side, number>;
};
```

Isso não é uma otimização; é o que separa o jogo da animação. A animação
reproduz um log que já está fechado, então:

- **pular para o fim é trivial** — não há nada a recalcular, só um índice a
  saltar;
- **mudar a velocidade de reprodução não pode mudar o vencedor**, porque o
  vencedor foi decidido antes de a reprodução começar;
- **o resultado é testável sem tempo.** O motor é uma função pura e os testes
  dele não esperam nenhum timer.

**`turn` e `round` são coisas diferentes.** Um _turn_ é um golpe; um _round_ são
os dois golpes, um de cada lado. O log guarda os dois porque a UI mostra rounds
("Round 3") e a máquina avança por turnos.

**Dano bruto e HP removido divergem de propósito** no golpe final. O HP é
limitado a zero (`Math.max(0, …)`), mas o campo `damage` do turno guarda o valor
cru — é o que a caixa de texto anuncia. Já `totalDamage` acumula o HP
**realmente removido**, porque um total de dano que soma overkill não é uma
estatística, é um número inflado.

`hpAfterTurns(result, startHp, appliedTurns)` reconstrói o HP de qualquer frame a
partir do log. É a única coisa que a camada de reprodução precisa saber de
aritmética.

---

## 3. Fronteiras de pacote

Quatro pacotes, com o grafo de dependências que o task runner usa para ordenar as
tarefas:

```
apps/
  web/            Rotas, formulário, máquinas de reprodução, E2E.
packages/
  domain/         Motor de batalha e modelo do monstro. Sem React, sem I/O.
  infra/          Persistência: a coleção do roster e suas quatro operações.
  ui/             Design system. Não conhece rota, rede, storage nem form lib.
```

```
web ──► ui ──► domain
 └────► infra ──► domain
```

As fronteiras caem onde caem por um critério só: **o que muda por motivos
diferentes fica em lugares diferentes.**

- **`domain` não importa nada além do zod.** As regras do jogo mudam quando o
  jogo muda de regra, e por nenhum outro motivo — nem por troca de framework, nem
  por troca de storage, nem por redesenho de tela. Ser TypeScript puro não é
  purismo: é o que permite o motor ser testado por mutação com limiar de 100%,
  que é uma métrica cara demais para código que também faz I/O.

- **`ui` recebe dado por prop e emite evento por callback.** Nenhum componente
  conhece rota, rede, storage ou biblioteca de formulário. O teste real dessa
  fronteira não é uma regra de lint: é que **toda story renderiza sem provider
  nenhum**. No dia em que um componente precisar de um contexto para aparecer no
  Storybook, a fronteira já foi rompida. Por isso o componente `form` do shadcn
  (acoplado ao React Hook Form) não é instalado; no lugar entra um `Field`
  agnóstico que recebe rótulo, erro e `children`.

- **`infra` é livre de React.** Tudo que ele importa vem de **`@tanstack/db`**,
  nunca de `@tanstack/react-db`. É o que permite os testes de persistência
  rodarem em ambiente Node, sem jsdom e sem browser — e é uma restrição fácil de
  verificar por import.

- **`web` é o único que sabe que existe uma tela.** Rotas, formulário,
  reprodução, e o único lugar onde o `localStorage` real e o `window` real são
  passados para a infra.

### Sem barrel files

Nenhum `index.ts` reexportando o pacote. Cada módulo é importado pelo caminho:
`@arena/domain/battle`, `@arena/ui/battle/FighterCard`. Barrels criam ciclos de
import, atrapalham tree-shaking e escondem o grafo real de dependências.

O contrato público de cada pacote é o campo `exports` do `package.json` —
explícito, greppável e impossível de furar por acidente. Toda importação relativa
carrega a extensão do arquivo (`./monster.ts`), porque a resolução é `nodenext`.

Exportar o `.ts` direto, sem build intermediário, é possível porque todo
consumidor passa pelo Vite. Um pacote publicável precisaria de um passo de
empacotamento; aqui seria cerimônia sem ganho.

### Catálogo de versões

Toda dependência entra como `catalog:`, com a versão declarada uma única vez em
`pnpm-workspace.yaml`. Quatro pacotes que declaram React em três versões
ligeiramente diferentes é um bug esperando um horário ruim.

---

## 4. Persistência

O roster é uma **coleção do TanStack DB sobre o `localStorage`**:

```ts
export function createRosterCollection({
  storage = window.localStorage,
  storageEventApi = window,
}: RosterCollectionOptions = {}) {
  return createCollection(
    localStorageCollectionOptions({
      storageKey: 'arena:roster',
      getKey: (monster) => monster.id,
      schema: monsterSchema,
      storage,
      storageEventApi,
    }),
  );
}
```

O `localStorageCollectionOptions` entrega as três coisas que este app precisa —
persistência, consulta reativa e sincronização entre abas — e vem **dentro do
`@tanstack/db`**, que já é dependência do `useLiveQuery`. Custo marginal em
bytes: zero.

### O seam trocável é um parâmetro, não uma classe

`storage` e `storageEventApi` entram por parâmetro, com default para o
`localStorage` e o `window` reais:

- **o navegador não passa nada** e recebe os objetos reais;
- **os testes passam um fake em memória.**

São **duas implementações reais, e as duas rodam em todo `vp test`**. É a
diferença entre "a implementação é trocável" ser uma afirmação do README e ser um
fato que a suíte executa a cada rodada. Trocar para `sessionStorage`, para um
storage criptografado ou para um mock é passar outro objeto com a forma da
`Storage` API; nenhum outro arquivo muda.

A verificação é literal: um `grep` por `window.localStorage` em `packages/`
devolve **uma linha**, que é o default do parâmetro acima.

O teste de sincronização entre abas usa o mesmo seam de forma mais interessante:
dois fakes compartilhando o mesmo `storageEventApi`, escrita num, leitura no
outro — a funcionalidade de duas abas provada sem abrir duas abas.

### Por que NÃO há classe abstrata de repositório

A tentação é envolver a coleção numa porta:
`interface MonsterRepository { list(): Promise<Monster[]> }`. Não há.

Uma abstração de repositório é honesta quando a assinatura descreve o meio por
inteiro. Um cliente HTTP é assim: `get(request, schema) → Promise<Output>` não
esconde nada de relevante sobre HTTP, e uma classe abstrata ali ganharia algo
real — fixar o pipeline e deixar buracos para o adapter preencher.

**Persistência via TanStack DB não é assim.** O caminho de leitura é

```ts
useLiveQuery((q) => q.from({ monster: roster }))
```

— **um handle reativo, não uma chamada.** Uma interface que devolve
`Promise<Monster[]>` joga fora exatamente a razão de adotar TanStack DB: a
reatividade. E expor a coleção _através_ da porta faz da porta um wrapper de uma
propriedade. Nos dois casos a interface paga o preço de uma indireção sem comprar
nada, e código que ninguém importa por um motivo real é código morto que todo
review vai marcar.

**A metade valiosa da ideia sobrevive sem classe nenhuma: a tradução de erro de
infra para erro de domínio.** `findMonster` transforma `undefined` em
`MonsterNotFoundError`; `removeMonster` transforma o `DeleteKeyNotFoundError` da
biblioteca no mesmo erro de domínio. Nenhum erro de biblioteca chega à UI, que é
o que a porta existiria para garantir — e são quatro funções livres num módulo,
não uma hierarquia.

A regra geral, para quando a pergunta reaparecer: **abstraia o que tem uma forma
fechada; não abstraia o que tem uma forma reativa.**

### A criação é síncrona, e isso remove um problema inteiro

`localStorage` é uma API síncrona, então não há banco assíncrono para esperar:
nada de top-level `await` no entry, nada de shell de carregamento, nada de
primeira frame em branco.

O único `await` da aplicação é um `preload()` antes do primeiro render, e ele
existe só para que a primeira frame já saia com o roster no grid em vez de
mostrar o estado vazio por um tick. Uma falha ao semear **não impede o app de
subir** — um roster vazio com um botão de restaurar é melhor que uma tela branca.

`preload()` também é load-bearing dentro da infra, e por um motivo menos óbvio:
`roster.size` é leitura síncrona do estado em memória, então uma coleção nova
sobre um storage já populado lê `0` e semearia por cima do que existe. Toda
operação que decide algo a partir do estado atual chama `preload()` antes.

### Escritas em fila, e o que acontece quando uma falha

Duas escritas sem `await` entre si correm juntas, e a biblioteca aplica a mutação
ao cache dela **antes** de salvar. Se a primeira falha ao gravar, o cache fica
sujo, e a segunda grava o resíduo — ressuscitando uma mutação já relatada como
erro a quem chamou. Por isso as mutações passam por uma fila por coleção.

Quando uma escrita falha, `cleanup() + preload()` descarta o resíduo antes de
relançar o erro. É o único par público que faz isso sem recriar a coleção. O
efeito colateral está registrado no código: a resincronização reemite um evento
de mudança para **cada** linha, não só para a que falhou. O estado final está
correto; o que quebraria é código que dependa da identidade do evento.

### Onde o dado mora

Duas chaves no `localStorage`:

| Chave            | Conteúdo                                     | Mecanismo                                         |
| ---------------- | -------------------------------------------- | ------------------------------------------------- |
| `arena:roster`   | A coleção de monstros                        | `localStorageCollectionOptions` do `@tanstack/db` |
| `arena:settings` | Tema e velocidade de reprodução              | `persist` do `@xstate/store`                      |

Mesmo mecanismo de armazenamento, chaves separadas, e a divisão é por natureza do
dado: uma coleção consultada reativamente contra dois escalares lidos na
inicialização. Uma coleção do TanStack DB para guardar duas preferências seria
maquinário sem trabalho.

Sincronização entre abas vem de graça pelo evento `storage` nativo: duas abas
abertas, cadastre numa e o monstro aparece na outra sem recarregar.

### O teto de ~5 MB

`localStorage` é síncrono e limitado a cerca de 5 MB por origem. Um roster
digitado à mão não chega perto — a semente inteira, com arte, ocupa poucos KB,
porque a arte dela é `data:image/svg+xml` de algumas centenas de bytes.

Mas `imageUrl` é texto livre, e **um `data:` URI colado pode ocupar centenas de
KB sozinho**. Colar alguns estoura a cota no meio de um insert.

Não há limite de tamanho no schema, e isso é uma decisão consciente: recusar uma
URL legítima comprida seria pior que o problema que resolveria. O que existe é
tratamento — uma escrita que estoura a cota falha com mensagem na tela, não com
tela branca, e o roster continua íntegro. O reconhecimento do erro percorre a
cadeia de `cause` e aceita os dois nomes que os navegadores usam
(`QuotaExceededError` e `NS_ERROR_DOM_QUOTA_REACHED`).

Se o teto incomodar, a correção é uma linha: um `.max(N)` no `imageUrl` do
`monsterFormSchema`.

### O que não entra

- **`@tanstack/react-query`.** Sem rede, sobrariam um `QueryClientProvider` sem
  queries e um contexto de router que ninguém lê. O **mecanismo** de contexto do
  router fica, tipado `{ roster: RosterCollection }` — mantemos o mecanismo, não
  a biblioteca.
- **`@tanstack/query-db-collection`.** É para coleção alimentada por `queryFn` e
  gravada por handler contra uma API. Sem backend, seria reimplementar
  persistência à mão dentro de handlers, com o TanStack Query no meio sem fazer
  nada.
- **Um banco embarcado com migração versionada (RxDB e parentes).** Avaliado a
  fundo, com um spike medido no repositório em vez de lido na documentação, e
  descartado por quatro razões concretas: **+280,7 kB crus / +82,6 kB gzip** para
  guardar seis números por monstro; um `devMode` que lança `DVM1` com qualquer
  storage cujo nome não comece com `validate-` (o do Dexie se chama `'dexie'`, ou
  seja, ligar o dev-mode mata o app na entrada); um dev-mode que injeta um iframe
  1×1 apontando para o site do projeto, com o guard de localhost comentado na
  fonte publicada; e um pin de versão exato entre três pacotes, que transforma
  todo bump em coordenação de três. Além disso, o JSON Schema do banco seria um
  **segundo** schema para o mesmo dado, ao lado do zod do domínio — e a única
  coisa que a migração versionada compraria seria inútil aqui, porque o schema do
  banco não carregaria o teto de balanceamento, que é justamente a regra que
  muda.

---

## 5. Estado da aplicação

**XState para fluxo, `@xstate/store` para dado.** A regra prática: se a pergunta
"que estados isso pode ter?" tem resposta interessante, é máquina; se a resposta
é "sempre o mesmo, só muda o conteúdo", é store.

### A máquina de seleção

Escolher os dois lutadores **é** uma máquina: `empty → partial → ready`.

```ts
type Context = {
  left: Monster | null;
  right: Monster | null;
  activeSlot: Side;
};
```

Os eventos (`fighter.picked`, `sides.swapped`, `selection.cleared`) mudam o
contexto na raiz, e transições `always` com guardas reconciliam o modo. O botão
"Lutar!" não depende de `Boolean(left && right)` recalculado na view: depende de
`snapshot.matches('ready')`. **O estado vira a fonte, não uma conta refeita a
cada render.**

O contexto guarda o `Monster` inteiro e não só o id, porque o monstro escolhido
pode sair da página atual do grid quando o jogador busca ou pagina.

`togglePick` usa `produce` do immer, e é o caso em que o immer ganha de verdade:
`draft[draft.activeSlot] = monster` resolve num lugar só o que a versão imutável
precisaria escrever em três ramos, porque o índice é dinâmico. Nas atualizações
de um campo escalar (`advanceTurn`, `setSpeed`) o `assign` direto já é a forma
mínima, e envolver isso num `produce` acrescenta uma closure e uma cópia
estrutural para não simplificar nada.

Efeito colateral bem-vindo: o immer congela o resultado, então os `Monster`
guardados no contexto ficam imutáveis de fato.

### A máquina de reprodução

A batalha na tela é uma máquina finita com transições por tempo:

```
intro ──after(intro)──► battling ─────────────────────────► finished (final)
  │                       ├─ announcing ──after(announce)──► impacting
  │                       └─ impacting ──after(impact)──┬─[hasNextTurn]─► announcing
  │                                                     └─[senão]───────► finished
  └────────────────── battle.skip ─────────────────────────────────────►┘
```

Ela **não decide nada** sobre o jogo. Dano, iniciativa e vencedor já estão no
`BattleResult`; a única coisa que a máquina avança é o relógio. Os `after` do
XState substituem o hook de timer inteiro que um `useReducer` + `setTimeout`
exigiria, e as `tags` substituem os booleanos derivados que a view teria de
manter.

Três detalhes que a forma da máquina resolve:

- **A velocidade é lida na entrada do estado.** Trocar de 1x para 4x no meio de
  uma batida só vale da próxima — o `speed.changed` é uma transição **interna**
  (sem `target`), então nenhum estado é reentrado e os `after` já agendados
  continuam valendo.
- **`finished` é final da raiz**, o que **para** o ator. Como o controle de
  velocidade continua clicável depois do fim, o envio passa por um helper que
  checa `status === 'active'` antes de mandar o evento.
- **`jumpToLastTurn` na entrada de `finished`** é idempotente na chegada natural
  e essencial vindo do `battle.skip`. Um caminho só para o estado final.

O HP mostrado sai de um seletor sobre o snapshot, não de um estado paralelo: no
`announcing` o golpe está no ar e o HP ainda não caiu; no `impacting` ele já
caiu. Um único lugar decide isso.

### Estado de URL

Busca e paginação vivem na URL, e **os parsers do nuqs são a fonte única**. O
`validateSearch` do router é derivado deles por `createStandardSchemaV1` — uma
definição, dois consumidores. Sem o segundo, o TanStack Router descarta os params
que o nuqs acabou de escrever e a URL "esquece" a busca.

O `validateSearch` é deliberadamente **tolerante**: no modo estrito um `?page=abc`
viraria issue, o router a transformaria em exceção da rota, e a tela inteira daria
lugar ao `errorComponent`. Devolver `{}` descarta os params e a página cai no
default — um param malformado colado na barra de endereço não deve ser uma tela
de erro.

### React Compiler

Ligado, o que significa **zero `useMemo`, `useCallback` ou `memo`** escritos à
mão. O compilador memoiza automaticamente e memoização manual vira ruído que
pode atrapalhar a análise dele.

**A exceção que importa:** o compilador é uma _otimização_, não uma _garantia de
identidade_. Onde a identidade importa, a solução é estrutural, não memoizada — a
arena é remontada por uma prop `key` derivada dos ids dos lutadores e de um
contador de execuções, e não por um efeito que observa mudança de dependência.

---

## 6. Design system e tema

O tema **Retro Arcade** governa o app inteiro: neon rosa (`--primary`), ciano
(`--secondary`), laranja (`--accent`), cantos de 4px, tudo em tokens `oklch`.

Duas camadas de design, **não duas identidades**. A arena acrescenta por cima uma
camada escopada em `.arena`, e a regra prática é: **a fonte pixel
(`Press Start 2P`) só aparece dentro de `.arena` e no wordmark.** Ela carrega a
identidade retrô sem sequestrar a legibilidade de um formulário de seis campos.

**Nenhuma pixelização em CSS.** `image-rendering: pixelated` faria sentido para
sprites 64×64; com `imageUrl` arbitrário — fotos, arte em alta resolução — a regra
destruiria a imagem que o jogador escolheu.

**As cores de HP saem da paleta do tema.** Verde/amarelo/vermelho é o clássico do
gênero, mas o Retro Arcade não tem verde, e introduzir um só para a barra de HP
criaria uma cor que não pertence a lugar nenhum. A escala é ciano
(`--secondary`) → laranja (`--accent`) → vermelho (`--destructive`), e a troca
por verde é uma linha, marcada no CSS.

**A arena é carta contra carta**, no espírito dos duelos de card game: duas
molduras se encarando com um `VS` no meio, coluna única abaixo de `sm`. Cada
carta é moldura com glow ao atacar → banner de nome → arte `aspect-[4/3]` com
`onError` para um SVG inline → linha de HP (`HP` + barra + `{hp}/{max}` em
`tabular-nums`) → rodapé com os três números (`ATK · DEF · SPD`) em numeral puro.

Números e não barras no rodapé, e isso é uma escolha: uma barra ali competiria
visualmente com a barra de HP logo acima, que é a única cuja variação o jogador
precisa acompanhar durante o duelo.

O placeholder de imagem quebrada é **SVG inline**, não um arquivo — `packages/ui`
não pode depender de nada em `apps/web/public` sem furar a fronteira do pacote.

---

## 7. Acessibilidade

### As decisões de marcação

- **Só a caixa de texto da batalha tem `aria-live`.** Mais nenhum elemento da
  arena. Se a barra de HP, o painel de vitória e a caixa de texto anunciassem
  juntos, o leitor de tela leria a mesma jogada três vezes.
- **Cartas selecionáveis são botões de verdade**: `role="button"`, `tabIndex`,
  `aria-pressed`, e Enter/Espaço fazem o que o clique faz.
- **O painel de resultado é uma `region` nomeada**, o que dá a ele um destino de
  navegação por landmark e um seletor estável para o E2E.
- **A barra de HP expõe `aria-valuenow`.** É o número, não a largura em pixels, e
  é por isso que o teste pode assertar o HP enquanto a barra ainda anima.
- **`prefers-reduced-motion` desliga as animações por CSS**, e a batalha continua
  avançando e terminando — os `after` da máquina são independentes de CSS. Uma
  animação desligada não pode virar um jogo que não termina.

### O contraste é medido, não presumido

A acessibilidade é verificada em **dois** lugares automáticos e um terceiro que
os dois primeiros não alcançam.

1. **O addon do Storybook roda o axe depois de cada `play`**, com
   `a11y: { test: 'error' }` — uma violação reprova a story.
2. **Em desenvolvimento, o axe roda contra o app de verdade** e escreve as
   violações no console. Ele cobre o que nenhuma story renderiza: rotas inteiras,
   o formulário com vários campos em erro ao mesmo tempo, o diálogo por cima do
   grid. É `axe-core` direto e não o adaptador de React, que depende de
   `ReactDOM.findDOMNode` (removido no React 19) e roda uma única análise contra
   um `#root` ainda vazio.
3. **O contraste no `:hover` é medido explicitamente**, porque **o axe nunca passa
   o mouse.**

O terceiro é o interessante. O método:

- **O hover é _resolvido_ no CSSOM, não simulado.** Um `userEvent` sintético não
  faz `elemento.matches(':hover')` virar `true`, então uma story que "hoverasse"
  mediria o estado de repouso e passaria sempre. O helper varre as folhas de
  estilo, encontra as regras cujo seletor contém o pseudo, remove **só o pseudo
  não escapado** (o nome de um utilitário composto do Tailwind carrega o pseudo
  escapado dentro de si) e testa o seletor restante contra o elemento.
- **Quem vence é a última regra na ordem do documento**, porque todos os
  seletores do Tailwind têm a mesma especificidade.
- **A cor é composta num `<canvas>` 1×1.** O `fillStyle` aceita qualquer sintaxe
  do CSS (`oklch()`, `color-mix()`) e o `source-over` é a mesma composição que o
  navegador faz para um fundo translúcido. A pilha de fundos sobe pelos
  ancestrais até o primeiro fundo opaco.
- **O alfa é lido do pixel, não por regex.** Num tema `oklch` o valor computado
  sai como `oklab(… / 0.2)`, e uma regex de `rgba()` leria alfa 1.
- **Um valor declarado é resolvido contra o próprio elemento.** `var(--destructive)`
  passado cru ao canvas é ignorado em silêncio e a medição sairia 1.00 em vez de
  falhar alto; a sonda é filha do elemento para as custom properties herdadas
  resolverem com os valores de lá.
- **Um seletor que o `matches` recusa lança**, e não é engolido. Uma regra
  descartada em silêncio é uma medição otimista, que é pior que nenhuma medição.

Foi assim que um botão em **3,74:1** apareceu enquanto a suíte inteira reportava
verde.

**A armadilha medida, para não custar duas vezes:** subir a opacidade de um tint
translúcido para melhorar o contraste **piora**. Medido no mesmo botão: `/10` dá
**3,79**, `/30` dá **2,93**. O tint é mais escuro que o fundo mas mais claro que
o texto, então mais tint aproxima os dois. O conserto é escurecer o texto.

### A fronteira dessa cobertura, declarada

O helper mede **texto contra fundo**, em repouso e em `:hover`. A varredura
completa das variantes de estado do pacote:

- **`:active` — 1 variante**, e é uma transformação (`translate-y-px`). Nenhuma
  variante `active:` muda cor. Não há o que medir.
- **`:focus-visible` — 9 variantes**, todas de anel e borda
  (`ring-ring/50`, `border-ring`, `ring-destructive/40`, …). **Zero `bg-*` e zero
  `text-*`**: o contraste do _texto_ não muda no foco. O que fica sem medição é o
  contraste do **anel** contra a cor adjacente (WCAG 1.4.11, 3:1) — outro
  critério, que um helper de texto-contra-fundo não expressa sem virar outra
  ferramenta.
- **`:disabled` — 5 variantes**, das quais três mudam o que é pintado
  (`opacity-50` e dois fundos). A WCAG 1.4.3 **isenta explicitamente componentes
  inativos** de requisito de contraste, então não há critério a medir.

Conclusão: a lacuna real é o anel de foco, e ela é uma medição diferente, não um
parâmetro a mais no helper existente. Está declarada em vez de fechada.

---

## 8. Estratégia de testes

Cinco camadas, cada uma respondendo a uma pergunta que nenhuma outra responde.

| Camada           | Ferramenta             | Pergunta que responde                        | Onde                     |
| ---------------- | ---------------------- | -------------------------------------------- | ------------------------ |
| Unitário (AAA)   | Vitest                 | A regra está implementada certo?             | `domain`, `infra`, `web` |
| Mutação          | Stryker                | O teste **reclamaria** se a regra mudasse?   | `domain`, `infra`        |
| Componente       | Storybook + addon a11y | Renderiza e é acessível em todos os estados? | `ui`                     |
| Regressão visual | Playwright + reg-suit  | Algum pixel mudou sem ninguém pedir?         | `ui`                     |
| E2E (BDD)        | Playwright             | O usuário consegue completar o fluxo?        | `apps/web`               |

### Unitário: AAA, e não como enfeite

Todo teste unitário é **Arrange, Act, Assert**, com os três blocos marcados por
comentário e separados por linha em branco. A separação força três coisas
verificáveis num review:

- **Um `Act` por teste.** Se aparece um segundo, o teste está verificando duas
  coisas e deve virar dois testes. É a regra mais fácil de fiscalizar num diff.
- **Nada de asserção no meio do `Arrange`.** Se a montagem precisa ser
  verificada, ela é complexa demais e pede uma factory.
- **O `Act` isola a chamada sob teste.** Guardar o retorno numa variável
  (`const damage = calculateDamage(...)`) em vez de embutir na asserção deixa
  óbvio, ao ler, o que é entrada, o que é execução e o que é expectativa.

Isso custa duas linhas num teste de três, e é exatamente por isso que vale
escrever explícito: o padrão só serve se for uniforme. O nome do teste descreve o
comportamento em português, não o método —
`'usa dano mínimo quando o ataque é igual à defesa'`, nunca
`'testa calculateDamage'`.

### Mutação: só onde a especificação é fechada

Cobertura de linha mede que a linha executou. **Mutação mede que algum teste
reclamaria se a linha mudasse.** Para um motor de batalha cujas regras são cinco
frases fechadas, é a métrica certa: se o Stryker troca `>` por `>=` em
`resolveFirstAttacker` e nenhum teste fica vermelho, a regra do desempate não
está de fato coberta.

**O escopo é deliberadamente estreito: `domain` e `infra`, com `break: 100`.**

- **`packages/ui` fica de fora.** Mutação em componente React é lenta e de
  retorno baixo — o mutante costuma ser equivalente ou irrelevante para quem usa.
  Quem cobre a UI é o Storybook, o E2E e a regressão visual.
- **`apps/web` fica de fora.** Sua lógica interessante são as duas máquinas, e o
  comportamento delas já é observado ponta a ponta, inclusive pelos caminhos
  gerados por modelo.
- **`domain` e `infra` ficam dentro, no teto.** Os dois são pequenos, puros e
  fechados. Num alvo desses, um limiar abaixo de 100 é um convite a deixar
  mutante sobrevivendo "por enquanto".

**Nem todo mutante sobrevivente é teste faltando**, e essa é a linha que separa
mutação bem usada de mutação como jogo de números. Guarda defensiva e código
inalcançável por construção — a rede de `MAX_TURNS`, um `>` que sob a guarda
anterior é equivalente a `>=`, um erro de biblioteca que o fake de storage não
consegue provocar — são silenciados **explicitamente, com o motivo escrito ao
lado**, o que tira o mutante do denominador em vez de escondê-lo no numerador com
um teste artificial.

O runner precisa de um detalhe de ambiente: o Vitest vem embutido no `vp`, não
como dependência direta, e o runner do Stryker declara `vitest` como peer sem
empacotar o próprio. Por isso os pacotes que rodam mutação declaram `vitest`
explicitamente, na versão exata que o `vp` embute — duas versões na árvore fazem
o Stryker rodar contra um Vitest diferente do `vp test`, e os resultados divergem
de um jeito difícil de diagnosticar.

### Componente: Storybook como verificação, não como vitrine

Cada componente tem stories cobrindo os estados que ele pode assumir, e as
stories rodam num Chromium real com o addon de a11y em `test: 'error'`.

A suíte de stories **não** roda no `vp test` da raiz, e isso é uma armadilha da
ferramenta que vale escrever: `vp test` varre o workspace como **um** projeto
Vitest ancorado na raiz e não enxerga o `vitest.config.ts` do `packages/ui`, que
é justamente quem declara o projeto de browser. Ela tem nome próprio
(`test:stories`) e entra no `ready` — o único comando que promete "está tudo
pronto".

Ela ficou fora do `vp test` **de propósito**: precisa de um Chromium do
Playwright instalado, e um `vp test` que não passa num clone novo é um `vp test`
que as pessoas param de rodar.

### E2E: BDD, sem rede, e uma parte gerada por modelo

- **`test.step('Dado …' / 'Quando …' / 'Então …')` em vez de arquivos
  `.feature`.** Gherkin exige um passo de geração e uma camada de step
  definitions — indireção que só se paga quando gente não-técnica escreve os
  cenários. O `test.step` entrega a mesma leitura, aparece nomeado no relatório
  HTML e no trace viewer, e não adiciona build nenhum.
- **Arquivos `*.e2e.ts`, nunca `*.spec.ts`.** O padrão de inclusão do Vitest é
  `**/*.{test,spec}.?(c|m)[jt]s?(x)`: um `.spec.ts` de Playwright seria coletado
  pelo Vitest e quebraria com erro obscuro. A extensão diferente resolve o
  conflito na origem.
- **Zero requisições de rede.** A semente entra por `page.addInitScript`,
  gravando a chave do roster antes de qualquer script da página, e a arte é
  `data:image/svg+xml`. O Playwright dá um contexto de browser novo por teste,
  então o storage já é isolado.
- **Mas o cenário de cadastro dirige a UI de verdade.** Ele é o único que **não
  pode** semear pelo storage: cadastrar é justamente o que aquele teste existe
  para provar, e fingi-lo seria trapaça.
- **Uma boa parte dos cenários é gerada por modelo.** `getShortestPaths` do
  `@xstate/graph` percorre a máquina de seleção e produz um caminho por estado
  alcançável; mais dois testes falham se algum estado ou algum evento do modelo
  ficar sem asserção na suíte. **Caminho que ninguém pensou em escrever ainda é
  testado.**

Duas escolhas de biblioteca, pelo mesmo motivo: **`@xstate/graph` e não
`@xstate/test`; `produce` do immer e não `@xstate/immer`.** Os dois descartados
declaram peer `xstate: ^4` e são v4-only — instalar qualquer um deles falha na
resolução de peers ou arrasta um XState 4 paralelo.

O alvo do teste por modelo é a máquina de **seleção**, não a de reprodução: a de
reprodução avança por tempo, e travessia de grafo não modela passagem de tempo
bem. A de seleção é puramente orientada a evento — é onde o modelo rende.

Os números esperados de cada duelo são derivados dos stats reais pelo algoritmo,
com a derivação escrita no comentário ao lado da fixture. O par principal é
escolhido para exercitar **as duas** regras de dano no mesmo duelo e ainda caber
no timeout. Há também um duelo com os lados trocados, e não por simetria: sem um
duelo em que a iniciativa **e** a vitória caem na direita, um painel de resultado
que sempre coroasse o Lutador 1 deixaria a suíte inteira verde.

### Regressão visual

A quarta camada existe para uma pergunta que nenhuma outra faz: _mudou algum
pixel que ninguém pediu para mudar?_ O axe diz que o contraste passa, a story diz
que o componente renderiza, e os dois continuam verdes com um `padding` errado.

O fluxo é: construir o Storybook → servir o build num servidor estático efêmero →
percorrer o índice de stories num Chromium do Playwright gravando um PNG por
story → o reg-suit compara imagem a imagem contra a baseline e escreve um
relatório com esperado, obtido e diferença lado a lado.

Quem dirige o navegador é o **Playwright**, e não um capturador dedicado: é o
único navegador cuja versão já está no lockfile, e são dele as opções que tornam
uma foto reprodutível.

**Um único pixel visivelmente diferente reprova** — `thresholdRate` e
`thresholdPixel` são zero, então não existe "mudou pouco, deixa passar" por área.
O que existe é um **piso de cor**: `matchingThreshold: 0.05`, metade do padrão da
biblioteca de comparação.

Esse piso não é folga; é a correção de um fato medido. Duas capturas seguidas da
mesma página **não** saem byte a byte iguais: a carta derrotada — a única com
`filter: grayscale` sobre um elemento transformado — sai com até 7/255 de
diferença por canal dentro da própria moldura, sempre, invisível a olho nu. Sem o
piso, o portão reprovaria essa imagem sem nada ter mudado, e **um portão que
mente é um portão que se desliga.**

O preço é medido, não estimado. Deslocar a luminância do `--primary` em **+3,4%**
não é notado; em **+8,4%** treze stories reprovam. Mudanças de geometria não têm
essa folga: `px-2` → `px-2.5` num badge, dois pixels de cada lado, reprova as
cinco stories que desenham um badge.

O que reduz o ruído até caber sob o piso vem de cinco lugares:

- **Não há rede.** A arte é `data:image/svg+xml` inline e as fontes entram no
  bundle do Storybook. Nada chega tarde, nada chega diferente.
- **A animação é congelada no frame que interessa.** `animations: 'disabled'` do
  `page.screenshot` leva toda animação **finita** ao último frame e cancela a
  **infinita** no primeiro. A carta derrotada aparece caída — é para isso que o
  keyframe dela tem `forwards` — e o balanço ocioso da arena aparece parado,
  sempre no mesmo ponto. Apagar as animações por CSS, o outro caminho possível,
  fotografaria a carta derrotada ainda **em pé**: esconderia justamente o estado
  que a story existe para mostrar.
- **O cursor de texto não entra na foto** (`caret: 'hide'`). Sem isso, a story que
  digita num campo sai com o cursor piscando em metade das capturas.
- **A foto só é tirada depois do `play`.** A captura espera o evento
  `storyFinished` do próprio Storybook, emitido **depois** da função `play`, e
  então espera `document.fonts.ready`. Fotografar antes pegaria a story a meio
  caminho da interação que ela encena, ou o texto medido com a fonte errada.
- **Rasterização travada:** `--force-color-profile=srgb` (senão a mesma cor sai
  com bytes diferentes em monitores diferentes), `--disable-lcd-text`
  (antialiasing em escala de cinza, que não depende da ordem RGB do painel),
  `--font-render-hinting=none` e `deviceScaleFactor: 1` (numa tela HiDPI a mesma
  página sairia com o dobro de pixels).

**A baseline não é versionada**, e não por peso. Os mesmos PNGs, capturados do
**mesmo** build do Storybook com o **mesmo** binário do Chromium, saem diferentes
em sistemas operacionais diferentes: **70 de 90** mudam entre macOS e Linux, e 3
de 90 mudam entre Linux arm64 e x86-64 — já descontado o piso de cor. A
rasterização de fonte é do sistema, não do navegador. Uma baseline versionada
valeria só na máquina que a gerou, e o CI reprovaria dezenas de imagens para
sempre. Então cada ambiente guarda a sua: localmente num diretório ignorado pelo
git, e no CI no cache do GitHub Actions, com sistema e arquitetura na chave e
gravado só pela branch padrão. Nenhum bucket, nenhuma conta de nuvem.

Duas fronteiras, para não serem descobertas do jeito difícil:

- **Um tema por story.** O preview roda em escuro; as stories que precisam do
  claro declaram `globals: { theme: 'light' }`. A captura respeita esse `globals`,
  mas não fotografa a mesma story nos dois temas.
- **Story nova não reprova.** Ela entra no relatório como "nova" e passa a valer
  como baseline na aprovação seguinte — não há contra o que compará-la.

### O que não é testado, e por quê

- **Mutação em componente React**: mutante equivalente demais, lento demais.
- **E2E contra rede real**: não existe rede real. O E2E existe para o fluxo.
- **Migração de dado já gravado**: o carregamento inicial da coleção só confere
  que o JSON é serializável, nunca roda o `monsterSchema`. Um monstro salvo sob
  uma regra antiga volta como está. Está anotado no código e listado nos limites.

---

## 9. O portão único e a integração contínua

**`vp check` é o portão único**: format (oxfmt) + lint (oxlint) + type-check
(tsgolint) numa passada. Não há ESLint nem Prettier instalados — seria desfazer a
razão de usar um toolchain unificado, e manter quatro configurações em acordo é
um trabalho que ninguém escolhe fazer.

`vp run ready` encadeia `vp check` → unitários → stories → build, na ordem do
grafo de dependências. É o comando antes de abrir PR.

Fora do `ready` ficam as suítes que exigem browser ou levam minutos: o Playwright
e os dois Strykers. Elas rodam no CI, em jobs próprios.

O CI tem quatro jobs de teste em paralelo (`ready`, `e2e`, `mutation`, `visual`)
e um de publicação que declara `needs` dos quatro e uma condição de branch.
**Deploy verde a partir de build vermelho é pior que deploy nenhum**, e um PR não
publica.

Cinco coisas que o workflow resolve e que um clone novo não resolve sozinho:

- **Instalar o `vp`**, que é um CLI global e não sai do `node_modules`. Com `CI`
  no ambiente o instalador não pergunta nada e liga o gerenciador de Node dele —
  é ele quem entrega o Node do `engines.node`. Por isso **não há `setup-node`** no
  workflow: seria uma segunda fonte de verdade para a versão do Node, e a que
  perde. A versão do `vp` não é "a mais nova que houver": o passo lê a versão do
  catálogo, exporta e depois **confere** que o binário instalado bate.
- **Instalar o Chromium do Playwright.** Sem isso a suíte de stories, o E2E e a
  regressão visual falham num ambiente limpo.
- **Gerar a árvore de rotas antes do `ready`.** O `routeTree.gen.ts` é artefato
  do TanStack Router e está no `.gitignore`; num clone recém-feito ele não existe
  e o `vp check` falha com erros de tipo que descendem todos dessa ausência. Não
  é defeito de código; é a ordem.
- **Guardar a baseline visual entre execuções**, pelo cache do Actions:
  `restore-keys` casa por prefixo e devolve a entrada mais recente, e só a branch
  padrão grava — assim todo PR compara com o último estado aprovado da branch
  padrão, e não consigo mesmo. Na primeiríssima execução não existe baseline; o
  job emite um aviso explícito dizendo que passou sem comparar nada, porque um
  verde silencioso ali seria indistinguível de um verde de verdade.
- **Não rodar tudo duas vezes.** `on: push` restrito à branch padrão; as demais
  entram pelo `pull_request`. Com `push: ['**']` **e** `pull_request`, um PR
  aberto de uma branch do próprio repositório dispara os dois eventos com refs
  diferentes, o que dá dois grupos de `concurrency` e o dobro de jobs por push,
  nenhum cancelando o outro.

---

## 10. Deploy

**Dois destinos, conteúdos diferentes.** O GitHub Pages publica o **Storybook** —
a biblioteca de componentes, estado por estado, que não é o app. A Vercel publica
o **app**.

### Pages — o Storybook

Automático, pelo job de publicação. Um repositório tem **um** site do Pages, e
ele é do Storybook.

**O prefixo do site (`base`) é a única coisa que pode dar errado aqui**, e ela
falha em silêncio: um `base` errado publica uma página que abre com todo asset em
404. Por isso ele não é digitado em lugar nenhum — sai do output da própria
action de configuração do Pages, que a API calcula:

| Tipo de site                         | `base_path` | `base` do Storybook |
| ------------------------------------ | ----------- | ------------------- |
| Project page (`user.github.io/repo`) | `/repo`     | `/repo/`            |
| User/org page ou domínio próprio     | `` (vazio)  | `/`                 |

Duas armadilhas pagas, para não custarem de novo:

- **`base` no `vite.config.ts` do `packages/ui` não teria efeito.** O builder do
  Storybook fixa `base: './'` na config comum dele e a mescla por cima da do
  usuário. O único ponto que fala por último é o `viteFinal` do
  `.storybook/main.ts`.
- **O build do Storybook é uma _tarefa_, não um script do `package.json`.**
  Tarefa é o único caminho que aceita `env`, e sem `env` a variável **não chega**:
  tarefa roda em ambiente limpo. Medido: pelo script, a variável de base era
  ignorada e o build saía com base `/`, sem uma palavra de aviso. Declarar no
  `env` também põe a variável na impressão digital do cache, então um artefato
  construído com outro base não é restaurado por engano.

O roteamento do Storybook é por query param, não por caminho, então não há rota a
reescrever e **nenhum `404.html` é necessário**.

### Vercel — o app

O roteamento do app é client-side, então **a reescrita para o `index.html` não é
opcional**: servindo o `dist` sem ela, `/` responde 200 e as demais rotas
respondem 404.

O caminho recomendado é **construir localmente e publicar pronto**
(`vercel build` + `deploy --prebuilt`). A saída é estática pura — zero funções —
então não há runtime de Node do lado da plataforma para satisfazer.

Construir _na_ Vercel não sobe, e o motivo é aritmético: a imagem de build da
Vercel oferece Node 20, 22 e 24, o repositório declara `engines.node >= 26`, e a
resolução acontece ao preparar o container — **antes** do `installCommand`, o que
significa que o `vp`, que traria o próprio Node, nunca chega a ser instalado.

Alargar a faixa resolve e não é de graça, porque o `vp` pega a **LTS mais nova**
que satisfaz, não a mais nova:

| `engines.node` | Node que o `vp` entrega |
| -------------- | ----------------------- |
| `>=26`         | 26.7.0                  |
| `>=22`         | **24.19.0**             |

Como toda faixa que a Vercel resolve precisa incluir a 24 ou menos, **não existe
faixa que mantenha a 26 aqui e satisfaça a Vercel ao mesmo tempo.** Alargar é
aceitar rodar o projeto na 24 nos dois lugares — e é por isso que o caminho
pré-construído é o recomendado, e por que `engines.node` fica como está.

---

## 11. Limites declarados

Nenhum destes é surpresa; todos estão anotados no código também.

- **O guarda de contraste cobre `:hover` e só `:hover`.** A lacuna real é o anel
  de foco, e ela é uma medição diferente (não-texto, contra a cor adjacente).
  Está declarada em [Acessibilidade](#7-acessibilidade), com a varredura completa
  das variantes de estado que sustenta a conclusão.
- **Dado gravado por uma versão anterior não é validado na leitura.** O
  carregamento inicial confere só que o JSON é serializável. Uma linha em formato
  antigo volta com campos `undefined` enquanto o TypeScript continua achando que
  é um `Monster` completo.
- **Uma escrita que falha faz a coleção resincronizar inteira.** O estado final
  está correto; o que quebra é código que dependa da identidade do evento de
  mudança.
- **~5 MB de `localStorage`**, e `imageUrl` é texto livre. O tratamento existe; o
  limite continua sendo do navegador.
- **Construir o app _na_ Vercel exigiria baixar o Node do projeto para a 24.**
- **A regressão visual tem um piso de cor de ~5% de luminância**, e cada ambiente
  carrega a própria baseline.
- **`vp run <tarefa>` roda em ambiente limpo.** Uma variável de ambiente que a
  tarefa precise tem de estar declarada no `env` dela, ou não chega — em
  silêncio, sem erro. Só o build do Storybook depende disso hoje, e ele já
  declara; a armadilha fica registrada porque a próxima tarefa que precisar de uma
  variável vai encontrá-la.
