import { describe, expect, it, vi } from 'vitest';
import { createSavingFetch } from './saveErrors';

const url = 'https://x.supabase.co/rest/v1/items';
const respond = (status: number) => vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch;

describe('createSavingFetch', () => {
  it('avisa quando uma escrita é recusada', async () => {
    const onFailure = vi.fn();
    await createSavingFetch(respond(403), onFailure)(url, { method: 'POST' });
    expect(onFailure).toHaveBeenCalledOnce();
  });
  it('avisa quando a rede falha e mantém o erro', async () => {
    const onFailure = vi.fn();
    const failing = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    await expect(createSavingFetch(failing, onFailure)(url, { method: 'PATCH' })).rejects.toThrow('offline');
    expect(onFailure).toHaveBeenCalledOnce();
  });
  it('ignora sucesso, leituras e autenticação', async () => {
    const onFailure = vi.fn();
    await createSavingFetch(respond(201), onFailure)(url, { method: 'POST' });
    await createSavingFetch(respond(406), onFailure)(url, { method: 'GET' });
    await createSavingFetch(respond(400), onFailure)('https://x.supabase.co/auth/v1/token', { method: 'POST' });
    expect(onFailure).not.toHaveBeenCalled();
  });
});
