# PCP – Gestão de Estoques: exercício resolvido (slides 60–61)

**Enunciado:** calcule os parâmetros de gestão de estoque pelos dois métodos
(Quantidade Fixa de Encomenda e Período Fixo de Encomenda) para os dados abaixo.

| Parâmetro | Valor |
|---|---|
| Custo de frete por encomenda (Ce) | R$ 15,00 |
| Custo de manter 1 unidade por dia (I) | R$ 0,15 |
| Demanda média diária (D) | 75 un. |
| Demanda máxima / mínima diária | 100 / 51 un. |
| Tempo médio de reposição (TR) | 1,7 dia |
| Tempo de reposição máximo / mínimo | 2 / 1 dia |
| Nível de serviço desejado (o mesmo da aula) | 95% |

> TR médio de 1,7 dia com TR de 1 ou 2 dias significa: entrega em **1 dia em 30%** das vezes
> e em **2 dias em 70%** das vezes (1 × 0,3 + 2 × 0,7 = 1,7).

---

## Método 1 – Ponto de Pedido / Quantidade Fixa de Encomenda

### Passo 1 – Lote Econômico (Q0)

Mesma conta da aula (slides 35–41), trocando os números:

- Custo mensal de armazenar = (Q / 2) × 0,15 × 30 = **2,25 × Q**
- Custo mensal de encomendar = (75 × 30 / Q) × 15 = **33.750 / Q**
- Derivando o custo total e igualando a zero: 2,25 = 33.750 / Q² → Q² = 15.000

Ou direto pela fórmula geral:

```
Q0 = √(2 × D × Ce / I) = √(2 × 75 × 15 / 0,15) = √15.000 = 122,5  →  Q0 ≈ 122 cocos
```

(Custo mensal total com Q0: 2,25 × 122,5 + 33.750 / 122,5 ≈ R$ 551,00.)

### Passo 2 – Demanda no tempo de reposição

Demanda média no TR = 75 × 1,7 = **127,5 cocos**

A aba **Planilha1** da planilha do professor já traz 100 sorteios da demanda no TR
(TR sorteado + demanda de cada dia). Agrupando em classes de 10, igual ao slide 45:

| Demanda no TR | Freq. | Prob. | Freq. acum. | Prob. acum. |
|---|---|---|---|---|
| 51 a 60 | 11 | 11% | 11 | 11% |
| 61 a 70 | 8 | 8% | 19 | 19% |
| 71 a 80 | 5 | 5% | 24 | 24% |
| 81 a 90 | 12 | 12% | 36 | 36% |
| 91 a 100 | 13 | 13% | 49 | 49% |
| 101 a 110 | 1 | 1% | 50 | 50% |
| 111 a 120 | 3 | 3% | 53 | 53% |
| 121 a 130 | 10 | 10% | 63 | 63% |
| 131 a 140 | 8 | 8% | 71 | 71% |
| 141 a 150 | 5 | 5% | 76 | 76% |
| 151 a 160 | 10 | 10% | 86 | 86% |
| 161 a 170 | 6 | 6% | 92 | 92% |
| **171 a 180** | 3 | 3% | 95 | **95%** |
| 181 a 190 | 4 | 4% | 99 | 99% |
| 191 a 200 | 1 | 1% | 100 | 100% |

### Passo 3 – Ponto de Pedido e Estoque de Segurança

Ponto de pedido = limite superior da primeira classe cuja probabilidade acumulada atinge o nível de serviço.
ES = PP − 127,5. Custo mensal do ES = ES × 0,15 × 30.

| Nível de serviço | Ponto de Pedido | Estoque de Segurança | Custo mensal do ES |
|---|---|---|---|
| 100% | 200 | 72,5 | R$ 326,25 |
| **95%** | **180** | **52,5** | **R$ 236,25** |
| 90% | 170 | 42,5 | R$ 191,25 |

### ✅ Resposta – Método 1

**Sempre que o estoque providenciado (saldo físico + compras a receber) chegar a 180 cocos,
encomendar 122 cocos.** Estoque de segurança ≈ 52 cocos.

---

## Método 2 – Estoque Máximo / Período Fixo de Encomenda

### Passo 1 – Período ótimo de encomenda (slide 52)

```
T = Q0 / demanda média diária = 122,5 / 75 = 1,63  →  T = 2 dias
```

### Passo 2 – Tempo de cobertura (slide 54)

Tempo de cobertura = T + TR = 2 + (1 ou 2) = **3 dias (30%) ou 4 dias (70%)**

Cobertura média = 2 + 1,7 = 3,7 dias → demanda média na cobertura = 75 × 3,7 = **277,5 cocos**

### Passo 3 – Demanda no tempo de cobertura

Mesmo procedimento do slide 55: sorteia o TR (1 ou 2), calcula a cobertura (3 ou 4 dias),
sorteia a demanda de cada dia (51 a 100) e soma. Com 100 sorteios (estão na planilha anexa):

| Demanda na cobertura | Freq. | Prob. acum. |
|---|---|---|
| 171 a 180 | 1 | 1% |
| 181 a 190 | 1 | 2% |
| 191 a 200 | 3 | 5% |
| 201 a 210 | 7 | 12% |
| 211 a 220 | 2 | 14% |
| 221 a 230 | 5 | 19% |
| 231 a 240 | 7 | 26% |
| 241 a 250 | 3 | 29% |
| 251 a 260 | 2 | 31% |
| 261 a 270 | 4 | 35% |
| 271 a 280 | 9 | 44% |
| 281 a 290 | 5 | 49% |
| 291 a 300 | 8 | 57% |
| 301 a 310 | 7 | 64% |
| 311 a 320 | 10 | 74% |
| 321 a 330 | 12 | 86% |
| 331 a 340 | 8 | 94% |
| **341 a 350** | 4 | **98%** |
| 351 a 360 | 1 | 99% |
| 361 a 370 | 0 | 99% |
| 371 a 380 | 1 | 100% |

### Passo 4 – Estoque Máximo e Estoque de Segurança

ES = Estoque máximo − 277,5. Custo mensal do ES = ES × 0,15 × 30.

| Nível de serviço | Estoque Máximo | Estoque de Segurança | Custo mensal do ES |
|---|---|---|---|
| 100% | 380 | 102,5 | R$ 461,25 |
| **95%** | **350** | **72,5** | **R$ 326,25** |
| 90% | 340 | 62,5 | R$ 281,25 |

### ✅ Resposta – Método 2

**A cada 2 dias, encomendar: 350 − saldo físico − compras a receber.**
Estoque de segurança ≈ 72 cocos.

---

## Resumo

| | Método 1 – Qtde fixa | Método 2 – Período fixo |
|---|---|---|
| Parâmetro 1 | Lote econômico **Q0 = 122** | Período **T = 2 dias** |
| Parâmetro 2 | Ponto de pedido **PP = 180** | Estoque máximo **EM = 350** |
| Estoque de segurança (95%) | 52,5 | 72,5 |
| Custo mensal do ES | R$ 236,25 | R$ 326,25 |

O período fixo precisa de mais estoque de segurança porque tem de cobrir a incerteza de um
intervalo maior (T + TR, em vez de só TR). É o mesmo resultado da aula: 30 contra 38 cocos.

**Conferência teórica:** calculando a distribuição exata (demanda uniforme de 51 a 100, TR
1 dia 30% / 2 dias 70%), o percentil de 95% dá PP ≈ 182 e EM ≈ 345, bem perto dos 180 e 350
obtidos por sorteio. Como são números sorteados, sua turma pode achar valores um pouco
diferentes (±10).
