# Projetos de Produtos Digitais

Pasta para guardar em `D:\PROJETOS CLAUDE\PROJETOS PRODUTOS DIGITAIS`.

## Os 3 kits
| # | Produto | Público | Preço | O cliente recebe |
|---|---|---|---|---|
| 01 | **Salão Cheio com IA** | Salões, manicures, cabeleireiras | R$ 67 | E-book (17 págs.) + 50 prompts + 7 planilhas + Comece Aqui |
| 02 | **Corretor com IA** | Corretores e imobiliárias | R$ 97 (equipes: 5 por R$ 347) | E-book (19 págs.) + 50 prompts + 8 planilhas + Comece Aqui |
| 03 | **Contas em Dia com IA** | Quem quer organizar as contas | R$ 37 | E-book (19 págs.) + 40 prompts + 8 planilhas + Comece Aqui |

## Os ZIPs
A pasta `ZIPS/` tem um arquivo por produto. Cada ZIP contém:
- `PRODUTO - entregar ao cliente/`: os 4 arquivos que você sobe na Kiwify
- `VENDAS - para voce/`: amostra grátis, página de vendas, textos da Kiwify e plano de divulgação
- `fontes/`: os textos editáveis
- `LEIA-ME.md`: instruções do produto

## Por onde começar
**Um produto por vez.** Sugestão de ordem:
1. **Corretor com IA:** maior preço, público que compra ferramenta de trabalho e possibilidade de vender para equipes.
2. **Salão Cheio com IA:** público enorme e combina com a venda de sites (`index.html` na raiz do repositório).
3. **Contas em Dia com IA:** produto de volume, depende de conteúdo diário no TikTok e Reels.

## Passo a passo para colocar à venda
1. Descompacte o ZIP do produto.
2. Troque `[Seu Nome]` e `[seu número]` (me mande seu nome e WhatsApp que eu gero os PDFs de novo já preenchidos).
3. Crie a conta na **Kiwify** (grátis) e cadastre o produto com os textos de `textos-kiwify.md`.
4. Suba os 4 arquivos da pasta `PRODUTO - entregar ao cliente`.
5. Cole o link de pagamento e o seu WhatsApp no final do `pagina-de-vendas.html`.
6. Siga o `divulgacao.md`: amostra grátis → teste → oferta.

## Para gerar tudo de novo (depois de editar os textos)
Na pasta `_ferramentas`: `python3 build.py` (precisa de Python com `markdown` e `openpyxl`, e Node com Playwright). Ou me peça que eu gero.
