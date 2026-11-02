export const SAVE_ERROR_EVENT = 'zimfinance:save-error';

/**
 * A tela é atualizada antes da gravação terminar, então toda escrita recusada
 * no banco precisa avisar o usuário, ou ele veria um dado que não foi salvo.
 */
export function createSavingFetch(
  baseFetch: typeof fetch,
  onFailure: () => void,
): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const isDataWrite = url.includes('/rest/v1/') && method !== 'GET' && method !== 'HEAD';

    try {
      const response = await baseFetch(input, init);
      if (isDataWrite && !response.ok) {
        console.error('Falha ao salvar:', method, url, response.status);
        onFailure();
      }
      return response;
    } catch (error) {
      if (isDataWrite) {
        console.error('Falha ao salvar:', method, url, error);
        onFailure();
      }
      throw error;
    }
  };
}
