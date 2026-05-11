# ZimFinance 2.0 💰

ZimFinance 2.0 é um dashboard financeiro moderno, premium e ultra-rápido, desenvolvido para oferecer controle total sobre despesas, receitas e projeções anuais. Com uma interface inspirada em design de alto nível (Glassmorphism, Dark Mode), o sistema permite uma gestão granular de gastos, especialmente focada em cartões de crédito e fluxos de caixa mensais (Pagamento vs. Adiantamento).

![ZimFinance Logo](/public/Logo.png)

## 🚀 Funcionalidades Principais

- **Dashboard Inteligente**: Visualização rápida de Receitas, Gastos e Saldo (Total, Pagamento e Adiantamento).
- **Lançamentos Detalhados**: Organização de despesas por categoria de recebimento (Dia 05 e Dia 20).
- **Gestão Granular de Cartões**: Adicione compras individuais em cada cartão. O sistema calcula o total automaticamente somando a base fixa e as despesas variáveis.
- **Compartilhamento de Despesas**: Divida despesas com outros usuários com sincronização automática de exclusão.
- **Visão Anual**: Gráficos comparativos de receitas vs. despesas com projeção de saldo para o ano todo.
- **Seletor de Mês Calendário**: Navegação fluida entre meses através de um seletor em grade.
- **Segurança com Supabase**: Autenticação robusta e persistência de dados em tempo real com políticas de segurança (RLS).
- **Design Premium**: Interface dark mode, animações suaves e tipografia moderna.

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (Lucide React para ícones)
- **Backend/Database**: Supabase (PostgreSQL + Auth)
- **Gráficos**: Recharts
- **Deploy**: Vercel

## 📦 Instalação e Execução

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/bdngrower/ZimFinance2.0.git
   cd ZimFinance2.0
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=seu_url
   VITE_SUPABASE_ANON_KEY=sua_key
   ```

4. **Rodar Localmente**:
   ```bash
   npm run dev
   ```

## 🔒 Segurança

O projeto utiliza **Row Level Security (RLS)** no Supabase, garantindo que cada usuário visualize e edite apenas seus próprios dados financeiros.

---
Desenvolvido por **Antigravity (AI)** para **Cristian Santana Zimermann**.
