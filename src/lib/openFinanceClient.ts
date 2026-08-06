import { supabase } from './supabaseClient';
import { BankConnection, OpenFinanceTransaction } from '../types';

export const openFinanceClient = {
  // Busca conexões ativas do usuário no Supabase
  async getConnections(userId: string): Promise<BankConnection[]> {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
      
    if (error) {
      console.error('Erro ao buscar conexões:', error);
      return [];
    }
    return data || [];
  },

  // Busca o connectToken na Vercel Serverless Function
  async getConnectToken(): Promise<string | null> {
    try {
      const res = await fetch('/api/pluggy/token');
      if (!res.ok) throw new Error('Falha ao obter connect token');
      const data = await res.json();
      return data.accessToken;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  // Salva a nova conexão após o sucesso no widget da Pluggy
  async saveConnection(userId: string, provider: string, providerItemId: string): Promise<BankConnection | null> {
    const { data, error } = await supabase
      .from('bank_connections')
      .insert({
        user_id: userId,
        provider,
        provider_item_id: providerItemId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar conexão:', error);
      return null;
    }
    
    return data;
  },

  // Desconecta a conta bancária
  async disconnectBank(connectionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bank_connections')
      .update({ status: 'disconnected' })
      .eq('id', connectionId);
      
    return !error;
  },

  // Busca transações reais via Pluggy na Vercel
  async fetchRecentTransactions(userId: string, connection: BankConnection): Promise<OpenFinanceTransaction[]> {
    if (!connection.provider_item_id) return [];

    try {
      // 1. Busca transações da API (Vercel)
      const res = await fetch(`/api/pluggy/transactions?itemId=${connection.provider_item_id}`);
      if (!res.ok) throw new Error('Erro ao buscar transações da Pluggy');
      const realTxs: OpenFinanceTransaction[] = await res.json();

      // 2. Pega os IDs importados para filtrar
      const { data: imported } = await supabase
        .from('imported_transactions')
        .select('external_transaction_id')
        .eq('user_id', userId);
        
      const importedIds = new Set(imported?.map(t => t.external_transaction_id) || []);

      // 3. Retorna transações marcando as importadas
      return realTxs.map(tx => ({
        ...tx,
        imported: importedIds.has(tx.external_transaction_id)
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Salva log de importação no Supabase
  async markAsImported(userId: string, connectionId: string, tx: OpenFinanceTransaction): Promise<boolean> {
    const { error } = await supabase
      .from('imported_transactions')
      .insert({
        external_transaction_id: tx.external_transaction_id,
        user_id: userId,
        bank_connection_id: connectionId,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type
      });
      
    if (error) {
      console.error('Erro ao salvar log de importação:', error);
      return false;
    }
    return true;
  }
};
