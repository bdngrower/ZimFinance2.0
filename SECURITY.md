# 🔒 Segurança e Privacidade

A segurança dos dados financeiros é a nossa prioridade máxima. O ZimFinance 2.0 foi construído seguindo as melhores práticas de proteção de dados.

## 🛠️ Arquitetura de Segurança

### 1. Autenticação (Supabase Auth)
- Utilizamos o Supabase para gerenciar identidades de forma segura.
- As senhas são criptografadas e nunca armazenadas em texto puro.
- Sessões JWT (JSON Web Tokens) são usadas para validar todas as requisições ao banco de dados.

### 2. Row Level Security (RLS)
- O PostgreSQL do Supabase possui políticas de **RLS ativas em todas as tabelas**.
- **Isolamento de Dados**: Por padrão, um usuário autenticado só pode visualizar linhas que pertençam ao seu `user_id`.
- **Políticas de Compartilhamento**: Implementamos exceções controladas via RLS na tabela `expense_shares`, permitindo que destinatários visualizem convites específicos e excluam registros vinculados.
- **Triggers de Sistema**: Usamos funções com `SECURITY DEFINER` para permitir a sincronização de exclusão entre contas de forma segura e controlada pelo sistema.

### 3. Proteção de Variáveis de Ambiente
- Chaves sensíveis (como segredos do banco de dados) são mantidas no lado do servidor ou injetadas via Vercel no momento do deploy.
- O arquivo `.env` nunca deve ser versionado no GitHub.

## 🛡️ Melhores Práticas Recomendadas

- **Senhas Fortes**: Recomendamos o uso de senhas complexas e únicas para o ZimFinance.
- **Logout**: Sempre encerre sua sessão ao utilizar o sistema em computadores públicos ou compartilhados.
- **Não compartilhe sua conta**: O sistema foi desenhado para uso individual por conta de e-mail.

## 🚨 Reportando Vulnerabilidades

Se você encontrar qualquer falha de segurança ou comportamento inesperado que possa comprometer dados, por favor, entre em contato diretamente com o desenvolvedor responsável ou através do GitHub Issues de forma privada.

---
*Este sistema é mantido e atualizado regularmente para mitigar novos riscos de segurança.*
