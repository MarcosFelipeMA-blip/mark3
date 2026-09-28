# Meu Primeiro Bebê — kit digital

Guia de organização para pais de primeira viagem: enxoval, orçamento, casa, mala da maternidade, guia do pai, primeiros 30 dias, documentos e direitos. As partes de saúde foram resumidas a partir de livros-texto de medicina e documentos oficiais (lista completa na página "Fontes consultadas" do guia).

## Arquivos prontos (`dist/`)

| Arquivo | Para quê |
|---|---|
| `meu-primeiro-bebe-A4.pdf` | Versão para computador/impressão (A4) |
| `meu-primeiro-bebe-celular.pdf` | Versão vertical para ler no celular |
| `meu-primeiro-bebe.html` | Versão interativa para celular: tocar em um item marca o checklist, e o navegador lembra o que já foi marcado. Funciona offline (as fontes estão embutidas) |
| `planilha-meu-primeiro-bebe.xlsx` | Planilha com fórmulas: resumo financeiro, enxoval (lista pré-preenchida), calculadora de fraldas, gastos da gestação, chá de bebê |

## Conteúdo

- **10 módulos:** Começou a jornada · Planner da gestação (com exames, vacinas, movimentos e sinais de alerta) · Enxoval inteligente (🟢🟡🔵🔴 + "antes de comprar" + "não compre antes de pesquisar") · Planilha · Como economizar · Mala + checklist 48h · Preparando a casa · Guia do pai · Primeiros 30 dias (+ diário de mamadas/fraldas) · Cronograma + documentos e direitos
- **Parte especial de saúde:** sono seguro, amamentação, testes e vacinas do recém-nascido, sinais de perigo no bebê, pós-parto e saúde emocional
- **10 bônus:** chá de bebê, fraldas, perguntas para consultas, cartões, primeiras vezes + fotos, contatos, planner do casal, Operação Bebê a Caminho, guia de geladeira com sinais de alerta, visita à maternidade

## Como editar e gerar de novo

O texto fica em `src/` (um arquivo HTML por parte, na ordem do nome). Depois de editar:

```bash
node build.mjs      # gera dist/meu-primeiro-bebe.html e os dois PDFs (usa Playwright/Chromium)
python3 planilha.py # gera dist/planilha-meu-primeiro-bebe.xlsx (precisa de openpyxl)
```

## Antes de vender

- **Revisão profissional:** peça a um(a) obstetra/enfermeira obstetra e a um(a) pediatra para revisar a Parte Especial e as caixas "O que dizem as fontes". Isso também vira argumento de venda ("revisado por…").
- **Datas que mudam:** calendário de vacinas e licença-paternidade (Lei 15.371/2026: 10 dias em 2027, 15 em 2028, 20 em 2029) — revise o material a cada ano.
- **Posicionamento:** vender como organização e preparação, nunca como substituto de consulta ou promessa de resultado de saúde.
- As fontes foram **resumidas com palavras próprias**; não copie trechos dos livros para o material (direitos autorais).
