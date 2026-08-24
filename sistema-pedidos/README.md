# Sistema de Pedidos — Drogaria Rocha

Sistema interno e responsivo para registrar produtos que precisam ser pedidos e acompanhar o fluxo **Para pedir → Pedido → Recebido**.

## Recursos

- acesso direto com identificação de Ricardo, Farmacêutica, Jonas ou Nilza;
- cadastro com produto, quantidade, prioridade, fornecedor e observação;
- classificação obrigatória por Eurofarma, Teuto, Biosintética, Prati-Donaduzzi ou Diversos;
- filtros por etapa, prioridade e busca;
- registro de quem anotou, pediu e recebeu;
- layout adaptado para celular e computador;
- PWA instalável;
- dados compartilhados com regras de acesso RLS.

## Configuração

O banco utiliza o projeto Supabase já conectado à Drogaria Rocha. O arquivo `supabase.sql` documenta a estrutura e as políticas necessárias. Não é necessário cadastrar e-mails.

Para publicar de forma estática, use esta pasta como diretório raiz no serviço de hospedagem.
