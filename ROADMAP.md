# 🗺️ Roadmap Atualizado - ZimFinance 2.0

Este documento descreve o estado atual da plataforma, os marcos já alcançados e o plano estratégico de desenvolvimento do **ZimFinance**.

---

## ✅ Fase 1: Fundação, Core e Autenticação (Concluído)
- [x] Configuração da stack React + Vite + Supabase + TailwindCSS.
- [x] Sistema de Autenticação com Supabase Auth (E-mail / Senha, sessões persistentes e rotas protegidas).
- [x] Lançamento de despesas separadas por fonte de recebimento (Pagamento dia 05 e Adiantamento dia 20).
- [x] Dashboard financeiro inicial com visão anual e mensal.
- [x] Identidade visual premium em Dark Mode com Glassmorphism, accents Emerald/Indigo e tipografia moderna.

---

## ✅ Fase 2: Gestão Avançada de Cartões e Recorrência (Concluído)
- [x] **Sub-compras de Cartão**: Possibilidade de declarar um cartão e incluir itens/compras individuais com soma automática ao valor total.
- [x] **Despesas Recorrentes**: Modal de recorrência contínua ou com prazo limite em meses específicos.
- [x] **Seletor Temporal em Grid**: Modal expansível para pular rapidamente para qualquer mês do ano vigentes.
- [x] **Projeção Anual**: Cálculo em tempo real da Projeção de Saldo Acumulado Anual (Receita Anual - Gasto Anual).

---

## ✅ Fase 3: Recursos Colaborativos e UX Mobile (Concluído - Agosto 2026)
- [x] **Compartilhamento Granular**: Dividir contas específicas e cartões com outros usuários com convites e notificações.
- [x] **Sincronização de Exclusão RLS**: Exclusão vinculada por triggers no Supabase (`expense_shares`).
- [x] **Otimização Touch / Mobile**: Ícones de ação (Editar, Recorrência, Compartilhar, Excluir) sempre visíveis em telas sensíveis ao toque sem depender de hover.
- [x] **Confirmação de Pagamento (PG)**: Botão de alternância e indicador de pagamento ("PG") com destaque em verde e texto riscado/destacado.
- [x] **Métricas de Maiores Gastos (Mensal, Acumulado e Anual)**: Gráfico de pizza e lista detalhada com alternadores (`Mês`, `Até Hoje`, `Anual`).

---

## 🚀 Fase 4: Categorização e Inteligência Financeira (Próximo Passo)
- [ ] **Categorização por Tags/Ícones**: Atribuir categorias às contas (ex: Moradia, Alimentação, Lazer, Saúde, Transporte) para detalhar os gráficos.
- [ ] **Limites e Metas de Orçamento**: Definir teto de gastos por categoria no mês e receber alertas visuais quando o limite for atingido.
- [ ] **Filtros e Busca Avançada**: Campo de pesquisa rápida por nome de gasto ou valor nos lançamentos.

---

## 🏗️ Fase 5: Relatórios, Exportação e Integrações (Médio Prazo)
- [ ] **Exportação de Dados**: Geração de relatórios executivos em PDF e planilha Excel dos fechamentos mensais e anuais.
- [ ] **Comparativo Mês a Mês**: Gráfico de evolução de gastos por categoria comparando o mês atual com os meses anteriores.
- [ ] **Análise Preditiva e Sugestões**: Estimativa de saldo futuro baseada na média histórica e recorrências ativas.

---

## 🔮 Fase 6: Expansão Mobile Nativa & Open Banking (Longo Prazo)
- [ ] **PWA / App Nativo**: Transformação da aplicação em PWA instalável com suporte a notificações push nativas de vencimento.
- [ ] **Multi-Moeda e Câmbio**: Suporte a conversão automática para transações internacionais (USD, EUR).
- [ ] **Integração Open Finance**: Leitura automatizada de extratos bancários e faturas de cartão de crédito.

---

*Última atualização: Agosto de 2026.*
