import { createRosterCollection } from '@arena/infra/roster/collection';

/**
 * A instância única do roster. ESTE MÓDULO NÃO PODE ENTRAR NO GRAFO DE IMPORTS
 * DE UM COMPONENTE: a linha abaixo lê `window` na avaliação do módulo, então
 * quem o importar explode em node e, sob jsdom, constrói uma SEGUNDA coleção
 * sobre o localStorage real. O único importador é o `main.tsx`, que passa a
 * instância adiante pelo `context` do router.
 */
export const roster = createRosterCollection();
