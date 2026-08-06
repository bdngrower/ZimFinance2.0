import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PluggyClient, Transaction } from 'pluggy-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId } = req.query;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid itemId parameter' });
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing Pluggy credentials in Vercel environment' });
  }

  try {
    const client = new PluggyClient({
      clientId,
      clientSecret,
    });

    // We can fetch transactions for all accounts associated with this itemId
    // Pluggy lets us fetch transactions by accountId, so we first need to fetch accounts for the itemId
    const accountsResponse = await client.fetchAccounts(itemId);
    
    let allTransactions: any[] = [];

    // For simplicity, we just fetch from the first few accounts or all accounts
    for (const account of accountsResponse.results) {
      // Fetch recent transactions (last 30 days or so, or by default just the latest)
      const transactionsResponse = await client.fetchTransactions(account.id);
      
      const mappedTxs = transactionsResponse.results.map((tx: Transaction) => ({
        id: '', // Will be filled internally by ZimFinance logic if needed
        external_transaction_id: tx.id,
        date: tx.date.split('T')[0], // YYYY-MM-DD
        description: tx.description,
        amount: Math.abs(tx.amount), // Always positive, type defines income/expense
        type: tx.amount < 0 ? 'expense' : 'income'
      }));

      allTransactions = [...allTransactions, ...mappedTxs];
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json(allTransactions);
  } catch (error: any) {
    console.error('Error fetching Pluggy transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
}
