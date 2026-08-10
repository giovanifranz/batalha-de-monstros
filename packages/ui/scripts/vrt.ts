/**
 * Regressão visual da biblioteca de componentes.
 *
 *   vp run vrt           compara a captura atual com a baseline
 *   vp run vrt:approve   grava a captura atual COMO baseline
 *
 * O fluxo é: servir o Storybook já construído → fotografar cada story num
 * Chromium → o reg-suit compara imagem a imagem contra a baseline e escreve o
 * relatório em `.vrt/report/index.html`.
 *
 * Quem dirige o navegador é o Playwright, o mesmo que já roda a suíte de
 * stories e o E2E: é o único navegador cuja versão está no lockfile, e as
 * opções que tornam uma foto reprodutível (`animations`, `caret`,
 * `deviceScaleFactor`) são dele.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const packageRoot = path.resolve(import.meta.dirname, '..');
const storybookDir = path.join(packageRoot, 'storybook-static');
const vrtDir = path.join(packageRoot, '.vrt');
const actualDir = path.join(vrtDir, 'actual');
const baselineDir = path.join(vrtDir, 'baseline');
const reportDir = path.join(vrtDir, 'report');

/** Largura fixa. A altura é a da página inteira, então nada é cortado embaixo. */
const VIEWPORT = { width: 800, height: 600 };

/** Teto por story. Uma página que nunca sinaliza pronto tem de falhar, não travar. */
const STORY_TIMEOUT_MS = 30_000;

/**
 * Argumentos do Chromium que tiram do caminho o que renderiza diferente em cada
 * máquina:
 *
 * - `--force-color-profile=srgb` desliga a conversão para o perfil de cor do
 *   monitor. Sem ele, a mesma cor sai com bytes diferentes em telas diferentes.
 * - `--disable-lcd-text` troca antialiasing subpixel por escala de cinza, que
 *   não depende da ordem RGB do painel.
 * - `--font-render-hinting=none` tira o hinting, que varia com a configuração
 *   de fontes do sistema.
 * - `--hide-scrollbars` mantém a barra de rolagem fora da imagem.
 */
const CHROMIUM_ARGS = [
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--font-render-hinting=none',
  '--hide-scrollbars',
];

const CONTENT_TYPES = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

type StoryEntry = { readonly id: string; readonly title: string; readonly name: string };

/**
 * Só `type: 'story'`. O índice do Storybook também lista páginas de docs, que
 * não são componentes e não têm o que ser comparado.
 */
function readStories(): StoryEntry[] {
  const index = JSON.parse(readFileSync(path.join(storybookDir, 'index.json'), 'utf8')) as {
    entries: Record<string, { type: string; id: string; title: string; name: string }>;
  };

  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story')
    .map(({ id, title, name }) => ({ id, title, name }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** `Batalha/BattleStage` + `Hp Cheio` → `Batalha/BattleStage/Hp Cheio.png`. */
function fileFor(entry: StoryEntry): string {
  const safe = (segment: string) => segment.replace(/[<>:"\\|?*]/g, '-').trim();
  const dir = entry.title.split('/').map(safe).join(path.sep);
  return path.join(actualDir, dir, `${safe(entry.name)}.png`);
}

function isRegularFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * Servidor estático mínimo para `storybook-static`. É necessário porque o build
 * do Storybook referencia os assets a partir da raiz do site (`/assets/...`), e
 * `file://` não resolve esse caminho.
 */
function serveStorybook(): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const relative = requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath;
    const base = path.resolve(storybookDir);
    const file = path.resolve(base, `.${path.posix.normalize(`/${relative}`)}`);

    // `base + path.sep` e não `base`: um `startsWith` cru aceitaria um diretório
    // IRMÃO cujo nome começa igual (`storybook-static-outro`). E `isFile` e não
    // `existsSync`: um diretório existe, passa a guarda, e o `createReadStream`
    // sobre ele emite `EISDIR` — sem listener, isso derruba a execução inteira.
    if (!file.startsWith(base + path.sep) || !isRegularFile(file)) {
      response.writeHead(404).end('not found');
      return;
    }

    response.writeHead(200, {
      'content-type': CONTENT_TYPES.get(path.extname(file)) ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('o servidor do Storybook não abriu uma porta TCP'));
        return;
      }
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: packageRoot, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (status) => {
      if (status === 0) resolve();
      else reject(new Error(`\`${path.basename(command)}\` saiu com status ${String(status)}`));
    });
  });
}

async function countPngs(directory: string): Promise<number> {
  if (!existsSync(directory)) return 0;
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.png')).length;
}

/**
 * `storyFinished` é emitido DEPOIS do `play`, então esperar por ele é o que
 * garante que uma story interativa seja fotografada no estado que ela encena, e
 * não a meio caminho. O canal do Storybook só existe depois que o preview
 * carrega, daí a espera ativa curta.
 */
async function waitForStory(page: Page, id: string): Promise<void> {
  await page.waitForFunction(
    (storyId) => (window as unknown as { __VRT_FINISHED__?: string }).__VRT_FINISHED__ === storyId,
    id,
    { timeout: STORY_TIMEOUT_MS },
  );

  // Texto medido com a fonte errada muda de largura quando a certa chega.
  await page.evaluate(() => document.fonts.ready);
}

async function capture(): Promise<number> {
  const iframe = path.join(storybookDir, 'iframe.html');
  if (!existsSync(path.join(storybookDir, 'index.json')) || !existsSync(iframe)) {
    throw new Error(
      'storybook-static/index.json não existe — rode `vp run build-storybook` antes desta tarefa',
    );
  }

  // O servidor abaixo entrega `storybook-static` na RAIZ do site. Um build feito
  // com `STORYBOOK_BASE_PATH` (o do GitHub Pages) referencia `/<repo>/assets/…`,
  // e aí todo asset daria 404 — 90 PNGs em branco em vez de um erro.
  if (!readFileSync(iframe, 'utf8').includes('"/assets/')) {
    throw new Error(
      'o build do Storybook não referencia `/assets/` — refaça sem `STORYBOOK_BASE_PATH`',
    );
  }

  const stories = readStories();
  await rm(actualDir, { recursive: true, force: true });
  await mkdir(actualDir, { recursive: true });

  const { server, origin } = await serveStorybook();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });

    await context.addInitScript(() => {
      const attach = () => {
        const channel = (window as unknown as { __STORYBOOK_ADDONS_CHANNEL__?: unknown })
          .__STORYBOOK_ADDONS_CHANNEL__;
        if (channel === undefined) return false;

        (channel as { on: (event: string, fn: (payload: { storyId: string }) => void) => void }).on(
          'storyFinished',
          ({ storyId }) => {
            (window as unknown as { __VRT_FINISHED__?: string }).__VRT_FINISHED__ = storyId;
          },
        );
        return true;
      };

      if (!attach()) {
        const timer = setInterval(() => {
          if (attach()) clearInterval(timer);
        }, 10);
      }
    });

    const page = await context.newPage();
    for (const story of stories) {
      // Uma recarga por story: o estado de uma não vaza para a seguinte.
      await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, {
        waitUntil: 'load',
      });
      await waitForStory(page, story.id);

      const file = fileFor(story);
      await mkdir(path.dirname(file), { recursive: true });
      await page.screenshot({
        path: file,
        fullPage: true,
        // `animations: 'disabled'` leva toda animação FINITA ao frame final e
        // cancela a infinita no frame inicial. É o que faz a carta derrotada
        // aparecer caída (o `defeat-drop` existe para deixar esse estado
        // aplicado) e o balanço ocioso da arena aparecer parado, sempre no mesmo
        // ponto. `caret: 'hide'` tira o cursor de texto, que pisca e apareceria
        // em metade das fotos de campo preenchido.
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
      });
    }

    await context.close();
  } finally {
    await browser.close();
    server.closeAllConnections();
    server.close();
  }

  const captured = await countPngs(actualDir);
  if (captured !== stories.length) {
    throw new Error(
      `captura incompleta: ${String(captured)} PNGs para ${String(stories.length)} stories`,
    );
  }
  return captured;
}

async function approve(): Promise<void> {
  await rm(baselineDir, { recursive: true, force: true });
  await cp(actualDir, baselineDir, { recursive: true });
  console.log(`baseline gravada: ${String(await countPngs(baselineDir))} PNGs em ${baselineDir}`);
}

async function compare(): Promise<void> {
  // Primeira execução: não existe contra o que comparar, então esta captura VIRA
  // a baseline. Passar em silêncio aqui seria indistinguível de passar de
  // verdade — daí a mensagem, que o CI também repete como aviso.
  if ((await countPngs(baselineDir)) === 0) {
    console.log('sem baseline anterior: esta captura passa a ser a baseline; nada foi comparado.');
    await approve();
    return;
  }

  // O reg-suit lê o esperado de `<workingDir>/expected` e nunca apaga esse
  // diretório, então copiar a baseline para lá é tudo que um plugin de
  // publicação faria — e este projeto não guarda snapshot em nuvem nenhuma.
  await rm(reportDir, { recursive: true, force: true });
  await mkdir(reportDir, { recursive: true });
  await cp(baselineDir, path.join(reportDir, 'expected'), { recursive: true });

  await run(path.join(packageRoot, 'node_modules/.bin/reg-suit'), ['run']);

  // `reg-suit run` SEMPRE sai com status 0, inclusive com diferenças: ele foi
  // desenhado para reportar o resultado por um plugin de notificação. O portão
  // é este bloco, lendo o relatório que ele acabou de escrever.
  const outcome = JSON.parse(readFileSync(path.join(reportDir, 'out.json'), 'utf8')) as {
    failedItems: string[];
    newItems: string[];
    deletedItems: string[];
    passedItems: string[];
  };

  const report = path.join(reportDir, 'index.html');
  console.log(
    `iguais: ${String(outcome.passedItems.length)} · mudaram: ${String(outcome.failedItems.length)} · novas: ${String(outcome.newItems.length)} · removidas: ${String(outcome.deletedItems.length)}`,
  );

  if (outcome.failedItems.length > 0) {
    for (const item of outcome.failedItems) console.log(`  ✗ ${item}`);
    throw new Error(
      `regressão visual em ${String(outcome.failedItems.length)} story(ies). Relatório: ${report}`,
    );
  }

  // Story nova não reprova (não há contra o que compará-la) e story removida
  // também não (o desenho não mudou, o inventário mudou). Só que a baseline
  // precisa acompanhar as duas, senão a diferença reaparece em toda execução.
  for (const item of outcome.newItems) console.log(`  + ${item} (nova)`);
  for (const item of outcome.deletedItems) console.log(`  - ${item} (removida)`);
  if (outcome.newItems.length > 0 || outcome.deletedItems.length > 0) await approve();

  console.log(`relatório: ${report}`);
}

const captured = await capture();
console.log(`capturadas ${String(captured)} stories`);

if (process.argv.includes('--approve')) {
  await approve();
} else {
  await compare();
}
