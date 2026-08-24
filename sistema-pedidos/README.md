# Sistema de Pedidos — Drogaria Rocha

Sistema interno e responsivo para registrar produtos que precisam ser pedidos e acompanhar o fluxo **Para pedir → Pedido → Recebido**.

## Recursos

- acesso de funcionários pelo Supabase Auth;
- cadastro com produto, quantidade, prioridade, fornecedor e observação;
- filtros por etapa, prioridade e busca;
- registro de quem anotou, pediu e recebeu;
- layout adaptado para celular e computador;
- PWA instalável;
- dados compartilhados e protegidos por RLS.

## Configuração

O banco utiliza o projeto Supabase já conectado à Drogaria Rocha. O arquivo `supabase.sql` documenta a estrutura e as políticas necessárias. Cadastre cada funcionário em **Authentication → Users** usando e-mail e senha.

Para publicar de forma estática, use esta pasta como diretório raiz no serviço de hospedagem.
