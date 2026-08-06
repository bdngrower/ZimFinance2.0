import { supabase } from './supabaseClient';
import { BankConnection, OpenFinanceTransaction } from '../types';

// Simulador de Open Finance para ZimFinance
// Em produção, isso integraria com a API da Pluggy.ai ou Belvo

const MOCK_TRANSACTIONS: OpenFinanceTransaction[] = [
  {
    id: '',
    external_transaction_id: 'tx_123abc',
    date: new Date().toISOString().split('T')[0],
    description: 'Pix Enviado - Mercado Livre',
    amount: 149.90,
    type: 'expense'
  },
  {
    id: '',
    external_transaction_id: 'tx_456def',
    date: new Date().toISOString().split('T')[0],
    description: 'Compra Débito - Padaria Central',
    amount: 35.50,
    type: 'expense'
  },
  {
    id: '',
    external_transaction_id: 'tx_789ghi',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // ontem
    description: 'Pix Recebido - João da Silva',
    amount: 250.00,
    type: 'income'
  },
  {
    id: '',
    external_transaction_id: 'tx_012jkl',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    description: 'Compra Crédito - Netflix',
    amount: 55.90,
    type: 'expense'
  }
];

export const openFinanceClient = {
  // Busca conexões ativas do usuário
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

  // Simula o fluxo de conexão (widget)
  async connectBank(userId: string, provider: string): Promise<BankConnection | null> {
    // Em prod, abre o widget e aguarda sucesso. Aqui vamos apenas criar no DB.
    const { data, error } = await supabase
      .from('bank_connections')
      .insert({
        user_id: userId,
        provider,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao conectar banco:', error);
      return null;
    }
    
    return data;
  },

  // Desconecta
  async disconnectBank(connectionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bank_connections')
      .update({ status: 'disconnected' })
      .eq('id', connectionId);
      
    return !error;
  },

  // Busca transações bancárias não importadas
  async fetchRecentTransactions(userId: string, connectionId: string): Promise<OpenFinanceTransaction[]> {
    // 1. Pega os IDs importados para filtrar
    const { data: imported } = await supabase
      .from('imported_transactions')
      .select('external_transaction_id')
      .eq('user_id', userId);
      
    const importedIds = new Set(imported?.map(t => t.external_transaction_id) || []);

    // 2. Retorna transações mockadas marcando as que já foram importadas
    return MOCK_TRANSACTIONS.map(tx => ({
      ...tx,
      imported: importedIds.has(tx.external_transaction_id)
    }));
  },

  // Importa uma transação para o ZimFinance (marca no log)
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
