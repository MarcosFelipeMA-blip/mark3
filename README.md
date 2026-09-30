# mark3: Kit Freela Digital com IA

Produto digital para venda na Kiwify por **R$ 87,90**.

## Entregáveis (`produto/`)
- `Guia-Freela-Digital-com-IA.pdf`: guia de 23 páginas em 10 capítulos, com 60 prompts
- `Planilha-Gestao-do-Freela.xlsx`: precificação, pacotes, CRM e caixa
- `modelos/Modelo-Proposta-Comercial.docx`
- `modelos/Modelo-Contrato-Prestacao-Servicos.docx`

## Vendas (`vendas/`)
- `Kit-Freela-Digital-com-IA.zip`: todos os entregáveis num arquivo só
- `capa.png`: imagem do produto
- `pagina-de-vendas.md`: copy da página de vendas
- `cadastro-kiwify.md`: dados de cadastro, e-mail pós-compra, order bump e prompt para a extensão do Claude

## Fontes (`fonte/`)
Para regenerar os arquivos:
```
NODE_PATH=$(npm root -g) node fonte/render.js   # PDF e capa
python3 fonte/planilha.py                       # planilha (requer openpyxl)
python3 fonte/modelos.py                        # modelos (requer python-docx)
```
