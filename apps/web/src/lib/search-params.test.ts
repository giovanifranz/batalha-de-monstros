import { describe, expect, it } from 'vitest';
import { browserParsers, serializeBrowserSearch, validateBrowserSearch } from './search-params.ts';

describe('browserParsers.q', () => {
  it('mantém o termo de busca vindo da URL', () => {
    // Arrange
    const query = 'pikachu';

    // Act
    const term = browserParsers.q.parse(query);

    // Assert
    expect(term).toBe('pikachu');
  });

  it('aceita termo vazio como valor válido', () => {
    // Arrange
    const query = '';

    // Act
    const term = browserParsers.q.parse(query);

    // Assert
    expect(term).toBe('');
  });

  it('não apara os espaços do termo', () => {
    // Arrange
    const query = '  pika  ';

    // Act
    const term = browserParsers.q.parse(query);

    // Assert
    expect(term).toBe('  pika  ');
  });

  it('trata a URL sem termo como busca vazia', () => {
    // Arrange
    const missing = undefined;

    // Act
    const term = browserParsers.q.parseServerSide(missing);

    // Assert
    expect(term).toBe('');
  });
});

describe('browserParsers.page', () => {
  it('converte o número da página vindo da URL', () => {
    // Arrange
    const query = '3';

    // Act
    const page = browserParsers.page.parse(query);

    // Assert
    expect(page).toBe(3);
  });

  it('recusa página com texto no lugar do número', () => {
    // Arrange
    const query = 'abc';

    // Act
    const page = browserParsers.page.parse(query);

    // Assert
    expect(page).toBeNull();
  });

  it('recusa página vazia', () => {
    // Arrange
    const query = '';

    // Act
    const page = browserParsers.page.parse(query);

    // Assert
    expect(page).toBeNull();
  });

  it('trunca a parte decimal da página', () => {
    // Arrange
    const query = '2.7';

    // Act
    const page = browserParsers.page.parse(query);

    // Assert
    expect(page).toBe(2);
  });

  it('cai na primeira página quando o número é inválido', () => {
    // Arrange
    const query = 'abc';

    // Act
    const page = browserParsers.page.parseServerSide(query);

    // Assert
    expect(page).toBe(1);
  });

  it('cai na primeira página quando a URL não traz página', () => {
    // Arrange
    const missing = undefined;

    // Act
    const page = browserParsers.page.parseServerSide(missing);

    // Assert
    expect(page).toBe(1);
  });

  it('cai na primeira página quando a página vem vazia', () => {
    // Arrange
    const query = '';

    // Act
    const page = browserParsers.page.parseServerSide(query);

    // Assert
    expect(page).toBe(1);
  });

  it('entrega zero sem corrigir quando a URL pede página zero', () => {
    // Arrange
    const query = '0';

    // Act
    const page = browserParsers.page.parseServerSide(query);

    // Assert
    expect(page).toBe(0);
  });

  it('entrega o negativo sem corrigir quando a URL pede página negativa', () => {
    // Arrange
    const query = '-5';

    // Act
    const page = browserParsers.page.parseServerSide(query);

    // Assert
    expect(page).toBe(-5);
  });
});

describe('validateBrowserSearch', () => {
  it('devolve objeto vazio quando a URL não traz parâmetro nenhum', () => {
    // Arrange
    const search = {};

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({});
  });

  it('devolve termo e página quando os dois são válidos', () => {
    // Arrange
    const search = { q: 'pikachu', page: 3 };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ q: 'pikachu', page: 3 });
  });

  it('converte para número a página que chega como texto da URL', () => {
    // Arrange
    const search = { page: '3' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 3 });
  });

  it('mantém a página quando ela é igual ao padrão', () => {
    // Arrange
    const search = { page: 1 };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 1 });
  });

  it('descarta toda a busca quando a página é inválida', () => {
    // Arrange
    const search = { q: 'pikachu', page: 'abc' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({});
  });

  it('devolve objeto vazio quando a URL só traz lixo', () => {
    // Arrange
    const search = { nonsense: 'bar', other: '!!' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({});
  });

  it('descarta as chaves que não são termo nem página', () => {
    // Arrange
    const search = { q: 'pikachu', nonsense: 'bar' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ q: 'pikachu' });
  });

  it('aceita página zero sem corrigir', () => {
    // Arrange
    const search = { page: 0 };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 0 });
  });

  it('aceita página negativa sem corrigir', () => {
    // Arrange
    const search = { page: -5 };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: -5 });
  });

  it('lê a página vazia como zero', () => {
    // Arrange
    const search = { page: '' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 0 });
  });

  it('volta para a primeira página quando a página é nula', () => {
    // Arrange
    const search = { page: null };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 1 });
  });

  it('arredonda a página fracionária', () => {
    // Arrange
    const search = { page: 2.7 };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ page: 3 });
  });

  it('mantém a busca vazia declarada na URL', () => {
    // Arrange
    const search = { q: '' };

    // Act
    const result = validateBrowserSearch(search);

    // Assert
    expect(result).toEqual({ q: '' });
  });
});

describe('serializeBrowserSearch', () => {
  it('monta a query com termo e página', () => {
    // Arrange
    const values = { q: 'pikachu', page: 3 };

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('?q=pikachu&page=3');
  });

  it('omite a página quando ela é a primeira, que é o padrão', () => {
    // Arrange
    const values = { q: 'pikachu', page: 1 };

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('?q=pikachu');
  });

  it('omite o termo quando ele está vazio, que é o padrão', () => {
    // Arrange
    const values = { q: '', page: 3 };

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('?page=3');
  });

  it('devolve query vazia quando termo e página são os padrões', () => {
    // Arrange
    const values = { q: '', page: 1 };

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('');
  });

  it('devolve query vazia quando não recebe valor nenhum', () => {
    // Arrange
    const values = {};

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('');
  });

  it('escapa o espaço do termo', () => {
    // Arrange
    const values = { q: 'char x' };

    // Act
    const url = serializeBrowserSearch(values);

    // Assert
    expect(url).toBe('?q=char+x');
  });

  it('acrescenta a query ao caminho recebido', () => {
    // Arrange
    const basePath = '/roster';

    // Act
    const url = serializeBrowserSearch(basePath, { q: 'pika', page: 2 });

    // Assert
    expect(url).toBe('/roster?q=pika&page=2');
  });

  it('sobrescreve a página que já estava no caminho', () => {
    // Arrange
    const basePath = '/roster?page=9';

    // Act
    const url = serializeBrowserSearch(basePath, { page: 2 });

    // Assert
    expect(url).toBe('/roster?page=2');
  });

  it('remove do caminho a página que voltou ao padrão', () => {
    // Arrange
    const basePath = '/roster?page=9';

    // Act
    const url = serializeBrowserSearch(basePath, { page: 1 });

    // Assert
    expect(url).toBe('/roster');
  });

  it('preserva os parâmetros alheios do caminho recebido', () => {
    // Arrange
    const basePath = '/roster?zzz=1';

    // Act
    const url = serializeBrowserSearch(basePath, { q: 'pika' });

    // Assert
    expect(url).toBe('/roster?zzz=1&q=pika');
  });

  it('limpa termo e página quando recebe null', () => {
    // Arrange
    const basePath = '/roster?q=a&page=2';

    // Act
    const url = serializeBrowserSearch(basePath, null);

    // Assert
    expect(url).toBe('/roster');
  });
});
