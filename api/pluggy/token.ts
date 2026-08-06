import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PluggyClient } from 'pluggy-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Create a connect token (can optionally pass itemId to update a connection)
    const data = await client.createConnectToken();
    
    res.status(200).json({ accessToken: data.accessToken });
  } catch (error: any) {
    console.error('Error creating Pluggy connect token:', error);
    res.status(500).json({ error: error.message || 'Failed to create connect token' });
  }
}
