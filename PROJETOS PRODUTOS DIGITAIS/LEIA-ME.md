# Projetos de Produtos Digitais

Pasta para guardar em `D:\PROJETOS CLAUDE\PROJETOS PRODUTOS DIGITAIS`.

## Produtos
| # | Produto | Público | Preço | Status |
|---|---|---|---|---|
| 01 | Salão Cheio com IA | Salões, manicures, cabeleireiras | R$ 47 | ✅ Pronto |
| 02 | Corretor com IA | Corretores de imóveis | R$ 67 | ✅ Pronto |
| 03 | Contas em Dia com IA | Quem quer organizar as contas e sair do rotativo | R$ 27 | ✅ Pronto (com planilha) |

Cada pasta tem:
- `produto.html`: o material que o cliente recebe (fonte editável)
- `*.pdf`: o mesmo material já em PDF, pronto para subir na Kiwify
- `pagina-de-vendas.html`: a página que convence a comprar
- `divulgacao.md`: mensagens, posts e roteiros para vender
- O produto 03 tem também `Planilha-Contas-em-Dia.xlsx`

## Por onde começar
**Comece por um produto só.** Minha sugestão:
- **Corretor com IA**, se você conhece corretores ou tem facilidade de falar com profissionais. É o de preço mais alto, e o corretor paga com mais facilidade.
- **Salão Cheio com IA**, se você conhece donas de salão ou quer vender também os sites do `index.html`.
- **Contas em Dia**, se você prefere vender pelo Instagram ou TikTok para o público geral, em volume.

## Como baixar para o seu computador
1. Abra o repositório `mark3` no GitHub e troque para a branch `claude/wizardly-noether-sah3m7`.
2. Clique em **Code → Download ZIP**.
3. Extraia e copie a pasta `PROJETOS PRODUTOS DIGITAIS` para `D:\PROJETOS CLAUDE\`.

## Antes de vender: coloque seu nome
Os PDFs saem com `[Seu Nome]`. Para trocar:
1. Abra o `produto.html` no Bloco de Notas, aperte **Ctrl+H**, troque `[Seu Nome]` pelo seu nome e salve.
2. Abra o `produto.html` no Google Chrome (dois cliques no arquivo).
3. Aperte **Ctrl+P**, escolha **Salvar como PDF** e, em "Mais configurações", marque **Gráficos de plano de fundo**.
4. Substitua o PDF antigo.

## Como vender na Kiwify
1. Crie a conta em kiwify.com.br (grátis, cobra uma taxa só quando vende).
2. **Produtos → Criar produto**. Suba o PDF (e a planilha, no produto 03).
3. Coloque o preço. A garantia de 7 dias já é obrigatória por lei em compras online.
4. Copie o **link de checkout** e cole em `LINK_CHECKOUT`, no final do `pagina-de-vendas.html`. Troque também o `WHATSAPP`.
5. Publique a página de vendas no GitHub Pages ou, no começo, use só o link da Kiwify.
6. Para o produto 03, dá para configurar um **upsell** na Kiwify: quem compra o 01 ou o 02 recebe a oferta do 03 por R$ 19.

## Antes de divulgar
- **Teste os prompts** no ChatGPT com dados reais. Se algum resultado ficar ruim, me avise que eu ajusto.
- Dê o produto de graça para 3 pessoas do público em troca de depoimento. Coloque os depoimentos na página de vendas.
- Siga o `divulgacao.md`: **10 contatos por dia**.
