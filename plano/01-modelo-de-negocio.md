# Prompt 1 — Arquiteto de Renda Recorrente

Premissas: ver [README](../README.md#premissas-ajuste-se-alguma-estiver-errada-porque-isso-muda-o-plano).

## Os 10 modelos

Legenda: esforço e margem em Baixo / Médio / Alto.

| # | Modelo | Ativo central | Cliente | Problema | Receita | Automatizável | Esforço inicial | Manutenção | Margem | Principal risco |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Assinatura "Kit mensal" de IA para corretores** | Biblioteca de prompts + templates de posts e mensagens | Corretor autônomo | Precisa postar, anunciar e responder leads toda semana e não tem tempo | Mensalidade | Produção com IA, entrega pela plataforma, cobrança | Baixo | Médio (kit novo todo mês) | Alta | Cancelamento após 2–3 meses se o kit ficar repetitivo |
| 2 | **Micro-SaaS gerador de anúncios e posts de imóveis** | Software com IA | Corretor e imobiliária pequena | Escrever descrição de imóvel e legenda leva tempo | Mensalidade | Quase tudo | Alto | Baixo/Médio | Alta (custo de API baixo por uso) | Construir antes de validar; concorrência de ChatGPT "grátis" |
| 3 | Pack de templates Canva/Notion (compra única) | Templates | Corretor | Visual amador | Venda avulsa | Entrega | Baixo | Baixo | Alta | Não é recorrente; exige tráfego contínuo |
| 4 | Newsletter paga "IA no mercado imobiliário" | Conteúdo | Corretor e gestor | Não sabe como usar IA | Mensalidade | Parcial | Baixo | Alto (escrever toda semana) | Alta | Depende de você escrever sempre |
| 5 | Comunidade paga (Telegram/Discord) | Comunidade | Corretor | Isolamento, falta de método | Mensalidade | Pouco | Médio | Alto (moderar, animar) | Alta | Depende da sua presença diária |
| 6 | Curso curto gravado "IA para corretores" | Aulas gravadas | Corretor iniciante | Não sabe usar IA | Venda única | Entrega | Médio | Baixo | Alta | Envelhece rápido; sem recorrência |
| 7 | Agente de WhatsApp para imobiliárias (setup + mensalidade) | Automação | Imobiliária | Lead sem resposta rápida | Setup + mensalidade | Parcial | Alto | Médio/Alto (suporte técnico) | Média | Cada cliente vira projeto sob medida |
| 8 | Licença B2B (white-label do kit para imobiliárias) | Biblioteca do modelo 1 | Imobiliária com equipe | Padronizar marketing da equipe | Mensalidade por equipe | Alta | Baixo (reaproveita o 1) | Baixo | Alta | Ciclo de venda B2B mais longo |
| 9 | Venda de listas/bases de leads | Dados | Corretor | Falta de leads | Venda avulsa | Alta | Médio | Médio | Alta | **LGPD**: risco jurídico sério |
| 10 | Agência de conteúdo com IA | Seu tempo | Corretor | Não quer produzir nada | Mensalidade | Pouco | Baixo | Alto | Média | É serviço disfarçado; escala com horas |

## Filtro aplicado

- **Eliminados por depender da sua presença em cada entrega:** 5 (comunidade), 7 (projeto sob medida) e 10 (agência).
- **Eliminado por risco:** 9 (LGPD).
- **Penalizados por não serem recorrentes:** 3 e 6. Viram peças da escada de receita ([Prompt 6](06-escada-de-receita.md)), não o negócio principal.
- **Penalizado por depender de você escrever sempre:** 4.

## Top 3

| Ranking | Modelo | Recorrência | Margem | Simplicidade | Escala |
|---|---|---|---|---|---|
| 1º | **1 — Assinatura Kit mensal** | Alta | Alta | Alta | Média |
| 2º | 2 — Micro-SaaS gerador | Alta | Alta | Baixa | Alta |
| 3º | 8 — Licença B2B para imobiliárias | Alta | Alta | Média | Alta |

Os três usam **o mesmo ativo**: a biblioteca de prompts e templates para o mercado
imobiliário. O modelo 1 cria o ativo. O 2 o transforma em software. O 3 o vende
por equipe.

## Qual testar primeiro

**Modelo 1, a assinatura do Kit mensal.** Pode ser vendido em 7 dias, custa quase
nada para produzir com IA e serve de pesquisa para o micro-SaaS: o que os
assinantes mais usam no kit é exatamente o que o software deve automatizar.

## Evidência exigida antes de investir mais

| Antes de... | Precisa existir |
|---|---|
| Produzir o kit completo | 10 pré-vendas pagas em 30 conversas com corretores |
| Investir em anúncios | Custo por assinante menor que 1 mensalidade e meia |
| Construir o micro-SaaS | 40+ assinantes, cancelamento mensal abaixo de 10% no 2º mês e pelo menos 3 prompts usados toda semana pela maioria |
| Vender B2B | 3 imobiliárias pedindo acesso para a equipe |

**Critério de troca de nicho:** menos de 5 pré-vendas depois de 30 conversas. Nesse
caso, o mesmo formato vai para o nicho reserva, **clínicas de estética e
profissionais de saúde autônomos**, que têm a mesma dor de conteúdo mensal e
atendimento via WhatsApp.
