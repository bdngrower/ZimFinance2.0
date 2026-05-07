import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getInitializedData } from '../src/csvParser';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Fetching initial data...');
  const appData = getInitializedData();

  for (const year of [2024, 2025, 2026]) {
    const yearData = appData[year];
    if (!yearData) continue;

    for (const month of yearData) {
      console.log(`Seeding ${month.monthName} ${year}...`);
      
      // Insert Month
      const { error: monthError } = await supabase.from('months').upsert({
        id: month.id,
        year: month.year,
        month_name: month.monthName,
        income_pagamento: month.income.pagamento,
        income_vale: month.income.vale,
        income_ferias: month.income.ferias,
        income_decimo_terceiro: month.income.decimoTerceiro
      });

      if (monthError) {
        console.error('Error inserting month:', monthError);
        continue;
      }

      // Insert Expenses
      for (const exp of month.expenses) {
        await supabase.from('items').upsert({
          id: exp.id,
          month_id: month.id,
          type: 'expense',
          name: exp.name,
          pagamento: exp.pagamento,
          vale: exp.vale
        });
      }

      // Insert Cards
      for (const card of month.cards) {
        await supabase.from('items').upsert({
          id: card.id,
          month_id: month.id,
          type: 'card',
          name: card.name,
          pagamento: card.pagamento,
          vale: card.vale
        });
      }
    }
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
