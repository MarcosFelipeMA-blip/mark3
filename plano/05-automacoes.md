# Prompt 5 — Caçador de Automação Lucrativa

**Negócio:** assinatura Kit Corretor IA. **Clientes chegam** pelo Instagram e
pela isca. **Vendo** por sequência de e-mail e página de vendas. **Entrego**
pela página no Notion, liberada pela plataforma de pagamento.

## Mapa de tarefas repetitivas

| Etapa | Tarefa | Classificação |
|---|---|---|
| Aquisição | Criar Reels e posts | Automatizar agora (gerados com o próprio kit + agendamento) |
| Aquisição | Responder comentários pedindo a isca | Automatizar agora (ManyChat) |
| Aquisição | Responder cada DM manualmente | **Eliminar** (substituir por respostas prontas e FAQ) |
| Vendas | Mandar link de compra | Automatizar agora (sequência de e-mail) |
| Vendas | Chamadas de venda individuais | **Eliminar** (ticket baixo não paga a chamada) |
| Onboarding | Liberar acesso | Automatizar agora (webhook do checkout) |
| Onboarding | Explicar como usar | Automatizar agora (vídeo de 5 min + e-mail) |
| Entrega | Criar o kit do mês | Automatizar depois (IA gera rascunho; **revisão humana mantida**) |
| Entrega | Avisar que o kit saiu | Automatizar agora (e-mail agendado todo dia 1º) |
| Suporte | Dúvidas sobre acesso | Automatizar agora (FAQ + resposta automática) |
| Suporte | Dúvidas sobre mercado ou casos específicos | Manter humano (e levar para a aula mensal do Premium) |
| Retenção | Pesquisa de cancelamento | Automatizar agora (formulário no fluxo de cancelamento) |
| Retenção | Ligar para quem cancela | **Eliminar** |
| Financeiro | Cobrança e cartão recusado | Automatizar agora (a plataforma faz as novas tentativas) |
| Financeiro | Nota fiscal | Automatizar depois (emissor integrado ao checkout, quando houver CNPJ/MEI) |
| Financeiro | Relatório de receita | Automatizar depois (planilha puxando dados da plataforma) |

## Impacto estimado

| Mudança | Tempo economizado/semana | Custo | Velocidade | Risco |
|---|---|---|---|---|
| Eliminar DMs e chamadas | 3–5 h | Zero | Resposta instantânea | Perder algum lead complexo |
| ManyChat + e-mails | 2–3 h | Plano gratuito no início | Lead recebe tudo em segundos | Falha de integração silenciosa |
| Kit gerado com IA | 4–6 h por mês | ~R$ 100/mês de IA | Kit pronto em 1 dia | Qualidade cair sem revisão |

## As 5 automações de maior impacto

1. **Comentário → isca → lista**
   - **Gatilho:** comentário "ANÚNCIO" no post ou Reel.
   - **Entrada:** usuário do Instagram.
   - **Processamento:** o ManyChat envia a DM com o formulário.
   - **Saída:** lead com e-mail e WhatsApp na ferramenta de e-mail, com a tag "isca-anúncio".
   - **Falha humana:** DM bloqueada ou limite da Meta; revisar uma vez por semana.
2. **Compra → acesso → onboarding**
   - **Gatilho:** pagamento aprovado.
   - **Entrada:** nome, e-mail e plano.
   - **Processamento:** o webhook da Kiwify dispara o e-mail de boas-vindas com o link e aplica a tag "assinante".
   - **Saída:** acesso liberado e início da sequência de onboarding.
   - **Falha humana:** e-mail digitado errado, resolvido pelo suporte.
3. **Fábrica do kit mensal**
   - **Gatilho:** dia 20 de cada mês.
   - **Entrada:** calendário de datas do mês seguinte + notícias do mercado + feedback dos assinantes.
   - **Processamento:** um roteiro de prompts no Claude gera 30 posts, 10 prompts novos e 5 scripts; os textos são aplicados em lote nos templates do Canva.
   - **Saída:** rascunho do kit.
   - **Falha humana:** **revisão obrigatória** de fatos (juros, regras de financiamento) e do tom.
4. **Liberação do kit todo dia 1º**
   - **Gatilho:** data.
   - **Entrada:** página do kit.
   - **Processamento:** e-mail agendado para quem tem a tag "assinante".
   - **Saída:** assinantes avisados.
   - **Falha humana:** kit não revisado a tempo; atrasar em vez de publicar sem revisão.
5. **Cancelamento → pesquisa → recuperação**
   - **Gatilho:** pedido de cancelamento ou cartão recusado.
   - **Entrada:** motivo.
   - **Processamento:** formulário de motivo e, se o motivo for "caro", oferta de pausa de 1 mês ou do plano anual.
   - **Saída:** dado de cancelamento registrado e parte dos cancelamentos revertida.
   - **Falha humana:** padrão novo de reclamação; ler os motivos uma vez por mês.

## Regra aplicada

DMs manuais, chamadas de venda e ligações de retenção foram **eliminadas** antes
de pensar em automatizá-las.
