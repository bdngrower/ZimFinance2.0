# 🧠 Contexto do Projeto: ZimFinance 2.0

Este documento serve como uma "memória viva" do projeto, detalhando o que foi feito, por que foi feito e como o sistema está estruturado. Ideal para contextualizar novos desenvolvedores ou assistentes de IA em conversas futuras.

## 📋 Resumo Geral
O ZimFinance 2.0 nasceu da necessidade de modernizar um controle financeiro que antes era feito em Excel (`FINANÇAS.xlsx`). O objetivo era criar uma aplicação Web (React) que fosse visualmente impactante, rápida e que permitisse o controle de gastos divididos por datas de recebimento (Pagamento dia 05 e Adiantamento dia 20).

## 🛠️ Evolução do Desenvolvimento

### 1. Fundação e Design System
- **Tecnologia**: Vite + React + Tailwind.
- **Estética**: Dark mode, Glassmorphism, Neon accents (Emerald/Indigo/Amber).
- **Estrutura**: Sidebar lateral fixa, Header com navegação temporal e Main content com scroll interno.

### 2. Base de Dados (Supabase)
- **Tabelas**:
  - `months`: Armazena cabeçalhos mensais e rendimentos (Pagamento, Vale, Férias, 13º).
  - `items`: Despesas e Cartões vinculados a um mês. Possui colunas `is_recurring`, `recurring_group_id` e `is_paid`.
  - `card_expenses`: Despesas individuais aninhadas a um item do tipo "cartão". Possui colunas `is_recurring`, `recurring_group_id` e `is_paid`.
  - `expense_shares`: Vínculos de compartilhamento granular entre usuários.
- **Lógica**: Uso de `user_id` em todas as tabelas para multi-tenancy via RLS.

### 3. Funcionalidades de Destaque e Decisões Técnicas

#### A. Gestão de Cartões
- **Estrutura**: O Cartão tem um valor **Base** (manual) e uma lista de **Sub-despesas**.
- **Cálculo**: `Total Exibido = Valor Base + Soma das Sub-despesas`.

#### B. Confirmação de Pagamento ("PG")
- **Implementação**: Coluna `is_paid` em `items` e `card_expenses`.
- **UI**: Botão "PG" com alternância de estado e alteração da cor do texto (verde e riscado quando pago).

#### C. Otimização UX Mobile
- **Implementação**: Ícones de ação (Recorrência, Compartilhar, Editar, Excluir) sempre visíveis em telas sensíveis ao toque (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).

#### D. Maiores Gastos (Mensal, Acumulado e Anual)
- **Implementação**: Visualização tripla de gastos no Dashboard principal por alternadores (`Mês`, `Até Hoje`, `Anual`). Legendas e tooltip com métrica acumulada até o mês vigente e projeção de 12 meses.

#### E. Sistema de Compartilhamento
- **Implementação**: Compartilhamento granular de itens e despesas de cartão com outros usuários via e-mail e Supabase Database Triggers.

---
*Documento atualizado pela Antigravity em 06 de Agosto de 2026.*
