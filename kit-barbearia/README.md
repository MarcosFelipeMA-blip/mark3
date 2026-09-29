# Kit 30 Dias de Posts para Barbearias

Produto digital pronto para vender no Brasil e na Europa (Portugal, Irlanda, Espanha),
com material de divulgação incluído.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `01-amostra-gratis.md` | Os 5 posts que você dá de graça para quem comentar "KIT" |
| `02-kit-30-dias.md` | **O produto pago**: calendário de 30 dias + legendas + 10 prompts de IA |
| `03-roteiros-reels-divulgacao.md` | 5 Reels para o SEU perfil vender o kit |
| `04-mensagens-prontas.md` | Automação ManyChat, abordagem direta, grupos e objeções |
| `05-pagina-de-vendas.md` | Texto para colar na Hotmart/Kiwify |
| `imagens/` | 5 posts em 1080×1350 (formato do feed) |
| `templates/posts.html` | Fonte das imagens: edite os textos e rode `render.js` |

## O que só você pode fazer (em ordem)

**Dia 1 — Montar a base (2 horas)**
1. Criar um Instagram novo só para isso, ex.: `@kitbarbearia` ou `@postsparabarbeiro`.
2. Criar conta na **Hotmart** (hotmart.com) ou **Kiwify** (kiwify.com.br). Precisa de CPF e conta bancária.
3. Converter `02-kit-30-dias.md` em PDF (cole no Google Docs → Arquivo → Baixar → PDF).
4. Subir no Google Drive: o PDF + a pasta `imagens/`. Crie uma pasta separada só com a amostra grátis.

**Dia 2 — Deixar os templates editáveis no Canva**
5. No Canva, crie 5 designs de 1080×1350 recriando as imagens de `imagens/`.
   Depois use **Compartilhar → Link de modelo** e coloque esses links no PDF.
   É isso que o cliente edita. (Canva gratuito serve.)

**Dia 3 — Validar antes de cadastrar o produto**
6. Instalar o **ManyChat** (manychat.com), conectar o Instagram e configurar a palavra `KIT` (instruções em `04-mensagens-prontas.md`).
7. Postar os Reels 1 e 4 de `03-roteiros-reels-divulgacao.md`.
8. Mandar a abordagem direta para 20 barbearias.

**Dias 4 a 10 — Medir**
9. Postar 1 Reels por dia e mandar 20 mensagens diretas por dia.
10. **Meta de validação: 20 a 30 pedidos da amostra em 7 dias.**
    - Bateu: cadastre o produto na Hotmart/Kiwify com o texto de `05-pagina-de-vendas.md` e mande a DM 2 para todo mundo.
    - Não bateu: mude o gancho dos vídeos ou o nicho (salão, estética, personal). O resto do material se adapta.

## Preço

- Brasil: **R$ 47** (teste também R$ 37 e R$ 67)
- Europa: **€ 15**
- Serviço feito sob medida (para quem pedir): a partir de **R$ 300/mês** ou **€ 150/mês**

## Regras para não se queimar

- Não compre seguidores e não mande a mesma mensagem copiada em massa. O Instagram bloqueia a conta.
- Não invente depoimento nem número de resultado. Use só o que for real.
- Só divulgue em grupos que permitem.
- Na Hotmart/Kiwify, a nota fiscal e os impostos passam a ser sua responsabilidade quando as vendas crescerem. Quando começar a vender todo mês, abra um MEI.

## Regerar as imagens

```bash
NODE_PATH=$(npm root -g) node templates/render.js
```
