# 🧠 Contexto do Projeto: ZimFinance 2.0

Este documento serve como uma "memória viva" do projeto, detalhando o que foi feito, por que foi feito e como o sistema está estruturado. Ideal para contextualizar novos desenvolvedores ou assistentes de IA em conversas futuras.

## 📋 Resumo Geral
O ZimFinance 2.0 nasceu da necessidade de modernizar um controle financeiro que antes era feito em Excel (`FINANÇAS.xlsx`). O objetivo era criar uma aplicação Web (React) que fosse visualmente impactante, rápida e que permitisse o controle de gastos divididos por datas de recebimento (Pagamento dia 05 e Adiantamento dia 20).

## 🛠️ Evolução do Desenvolvimento

### 1. Fundação e Design System
- **Tecnologia**: Vite + React + Tailwind.
- **Estética**: Dark mode, Glassmorphism, Neon accents (Emerald/Indigo).
- **Estrutura**: Sidebar lateral fixa, Header com navegação temporal e Main content com scroll interno.

### 2. Base de Dados (Supabase)
- **Tabelas**:
  - `months`: Armazena cabeçalhos mensais e rendimentos (Pagamento, Vale, Férias, 13º).
  - `items`: Despesas e Cartões vinculados a um mês.
  - `card_expenses`: Despesas individuais aninhadas a um item do tipo "cartão".
- **Lógica**: Uso de `user_id` em todas as tabelas para multi-tenancy via RLS.

### 3. Funcionalidades de Destaque e Decisões Técnicas

#### A. Gestão de Cartões (O "Pulo do Gato")
- **Problema**: O usuário queria colocar um valor total no cartão, mas também listar compras individuais.
- **Solução**: Implementamos uma estrutura onde o Cartão tem um valor **Base** (manual) e uma lista de **Sub-despesas**.
- **Cálculo**: `Total Exibido = Valor Base + Soma das Sub-despesas`. Isso permite que o usuário mantenha o controle de gastos fixos do cartão e adicione as variáveis dinamicamente.

#### B. Navegação Temporal
- **Problema**: A mudança de mês por setas era lenta para longos períodos.
- **Solução**: Criamos um seletor em Grid (popup) que permite pular para qualquer mês do ano com um clique.

#### C. Dashboard e Projeção
- **Decisão**: O dashboard anual agora calcula a **Projeção de Saldo** (Receita Total Anual - Gasto Total Anual), dando uma visão clara de quanto sobrará ao final do ciclo.

#### D. Correção de Encoding
- **Incidente**: Durante o desenvolvimento, o salvamento via terminal corrompeu caracteres especiais (acentuação).
- **Correção**: O arquivo foi sanitizado e re-salvo em **UTF-8**, garantindo que "13º Salário", "Cartões" e outros termos apareçam corretamente em qualquer plataforma (Vercel, Local, etc).

## 💡 Informações Importantes para Futuras Conversas

- **Acentuação**: Sempre salvar arquivos em UTF-8. Se usar scripts de substituição, garantir que o encoding seja preservado.
- **RLS**: Nunca remova o filtro de `user_id` nas queries do Supabase.
- **Estado Local**: O `App.tsx` utiliza `useMemo` pesado para calcular totais em tempo real. Qualquer mudança na estrutura dos `items` ou `cardExpenses` deve ser refletida nas dependências desses `useMemo`.

---
*Documento gerado pela Antigravity em Maio de 2026.*
