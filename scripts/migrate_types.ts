import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
  console.log('Migrating items...');
  const { data: items, error } = await supabase.from('items').select('*');
  if (error) throw error;

  for (const item of items) {
    let newType = item.type;
    const pag = Number(item.pagamento) || 0;
    const val = Number(item.vale) || 0;

    if (pag > 0 && val > 0) {
      // Split into two
      console.log(`Splitting ${item.name}...`);
      await supabase.from('items').update({
        type: item.type + '_pagamento',
        vale: 0
      }).eq('id', item.id);

      await supabase.from('items').insert({
        id: Math.random().toString(36).substr(2, 9),
        month_id: item.month_id,
        user_id: item.user_id,
        type: item.type + '_vale',
        name: item.name,
        pagamento: 0,
        vale: val
      });
    } else if (val > 0) {
      newType = item.type + '_vale';
      await supabase.from('items').update({ type: newType }).eq('id', item.id);
    } else {
      newType = item.type + '_pagamento';
      await supabase.from('items').update({ type: newType }).eq('id', item.id);
    }
  }

  console.log('Done!');
}

migrate().catch(console.error);
