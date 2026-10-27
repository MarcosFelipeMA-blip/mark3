# Processo de Fabricação — Eixo SAE 4140 (lote de 500 peças)

> Atividade didática. Como ainda não há desenho definitivo do eixo, a geometria da
> seção 2 é uma **proposta de referência**: troque as cotas pelas do desenho final e
> recalcule sobremetais, comprimentos de corte e programas CNC.

---

## 1. Dados de entrada

| Item | Valor |
|---|---|
| Peça | Eixo escalonado com rasgo de chaveta |
| Material | SAE 4140 (Cr-Mo, temperável) |
| Bitola da matéria-prima | Barra redonda Ø30 mm |
| Comprimento da barra | 2.000 mm |
| Comprimento do blank (corte) | 182 mm |
| Peças por barra | 10 |
| Lote | 500 peças |
| Rota | Corte → Torno CNC → Fresadora (chaveta) → Tratamento térmico (terceiro) → Retífica → Inspeção |

---

## 2. Geometria de referência (proposta)

Comprimento acabado **180 mm** (1 mm de faceamento por lado sobre o blank de 182 mm).

```
 Lado A                                                                 Lado B
        Ø25 k6         Ø28 h11 (corpo)                Ø25 k6 + chaveta   Ø20 k6
     ┌─────────┬──────────────────────────────┬──────────────────────┬──────────┐
     │ rolam.  │                              │   ▭▭▭▭ rasgo 8P9 ▭▭  │  rolam.  │
     │         │                              │                      │          │
     └─────────┴──────────────────────────────┴──────────────────────┴──────────┘
     |<- 25 -->|<------------- 70 ----------->|<-------- 50 -------->|<-- 35 -->|
     |<--------------------------------- 180 ------------------------------------>|
   centro DIN 332 B2,5                                                 centro DIN 332 B2,5
```

| Elemento | Dimensão final | Tolerância / acabamento | Acabado em |
|---|---|---|---|
| Assento de rolamento lado A | Ø25 × 25 | k6 (+0,015/+0,002) · Ra 0,4 | Retífica |
| Corpo central | Ø28 × 70 | h11 · Ra 3,2 | Torno |
| Assento do cubo (engrenagem/polia) | Ø25 × 50 | k6 · Ra 0,8 | Retífica |
| Assento de rolamento lado B | Ø20 × 35 | k6 · Ra 0,4 | Retífica |
| Rasgo de chaveta (DIN 6885 A, eixo 22–30) | b = 8 P9 · t1 = 4,0 +0,2 · L = 40 | simetria 0,03 · raio de fundo 0,25–0,4 | Fresadora |
| Canais de alívio de retífica | DIN 509 forma E 0,6 × 0,3 | nos 3 ressaltos dos diâmetros retificados | Torno |
| Chanfros | 1 × 45° nas pontas, 0,5 × 45° nos ressaltos | — | Torno |
| Furos de centro | DIN 332 forma B 2,5 | escareado de proteção | Torno |
| Batimento radial | 0,01 mm nos diâmetros k6 em relação a A-B (centros) | — | Retífica |

O furo de centro **forma B** (com escareado de proteção) é escolhido porque a peça
volta do tratamento térmico e é retificada **entre pontas**: o cone de 60° precisa
estar íntegro.

---

## 3. Matéria-prima e plano de corte

### 3.1 Aproveitamento da barra

| Item | mm |
|---|---|
| Destopo inicial (esquadrejar a ponta da barra) | 5 |
| 10 blanks × 182 | 1.820 |
| 10 cortes × espessura da serra fita (~2 mm) | 20 |
| **Total consumido** | **1.845** |
| Retalho / sobra de fixação | 155 |

Não cabe uma 11ª peça (11 × 184 = 2.024 mm > 2.000 mm). Aproveitamento em massa ≈ 91 %.

### 3.2 Quantidade de compra

| Item | Valor |
|---|---|
| Barras necessárias (500 ÷ 10) | 50 |
| Margem para setup, refugo e 1ª peça (~4 %) | +2 |
| **Barras a comprar** | **52 barras Ø30 × 2.000 mm** |
| Massa linear Ø30 (ρ = 7,85 g/cm³) | 5,55 kg/m |
| Massa por barra | 11,1 kg |
| **Massa total de compra** | **≈ 577 kg** |
| Massa do blank (Ø30 × 182) | 1,01 kg |
| Massa da peça acabada (geometria da seção 2) | ≈ 0,71 kg |
| Cavaco gerado por peça / lote | ≈ 0,30 kg / ≈ 150 kg |

### 3.3 Especificação de compra

- SAE 4140 conforme ABNT NBR NM 87 / SAE J404, com **certificado de qualidade
  (composição química + dureza)** por corrida.
- Condição de fornecimento — depende da decisão do tratamento (ver seção 6):
  - **Recozido / esferoidizado (≈ 180–220 HB)** se o tratamento final for têmpera e
    revenimento da peça inteira. Melhor usinabilidade.
  - **Beneficiado (temperado e revenido, ≈ 28–32 HRC)** se o tratamento final for
    apenas localizado (indução ou nitretação). Elimina um tratamento.
- Barra laminada com tolerância de diâmetro e retilineidade declaradas. Com Ø30 bruto
  e maior diâmetro acabado Ø28, sobra 1 mm por lado — suficiente para remover a
  camada descarbonetada da laminação (tipicamente 0,3–0,5 mm). Se a barra vier com
  ovalização/empeno acima de 0,5 mm, pedir barra **descascada ou trefilada**.

---

## 4. Sobremetal para retífica

Sobremetal deixado no torno sobre os diâmetros k6: **0,4 mm no diâmetro (0,2 mm por lado)**.

Justificativa: eixo curto (L/D ≈ 6), SAE 4140 temperado em óleo deforma pouco;
batimento esperado após o tratamento de 0,05–0,10 mm. O sobremetal precisa cobrir
o empeno **e** a camada oxidada/descarbonetada do forno.

| Diâmetro final | Diâmetro torneado (antes da retífica) | Tolerância no torno |
|---|---|---|
| Ø25 k6 (lado A) | Ø25,40 | ±0,03 |
| Ø25 k6 (cubo) | Ø25,40 | ±0,03 |
| Ø20 k6 (lado B) | Ø20,40 | ±0,03 |
| Ø28 h11 (corpo) | Ø28,00 (acabado no torno) | 0 / −0,13 |

Regra de aceite no recebimento do tratamento: **batimento ≤ 0,15 mm** entre centros.
Acima disso, desempenar a frio em prensa (com revenimento de alívio, se a peça estiver
temperada) antes de retificar; acima de 0,30 mm a peça não "limpa" na retífica.

Os comprimentos (faces e ressaltos) são acabados no torno — a retífica é só cilíndrica.

---

## 5. Roteiro de fabricação

| Op. | Descrição | Máquina | Fixação |
|---|---|---|---|
| 10 | Corte dos blanks Ø30 × 182 | Serra fita automática | Morsa da serra + batente |
| 20 | Torneamento lado A | Torno CNC | Placa 3 castanhas (duras) + contraponto |
| 30 | Torneamento lado B | Torno CNC | Castanhas moles no Ø28 + contraponto |
| 40 | Fresamento do rasgo de chaveta | Fresadora (vertical) | Dispositivo com blocos em V + batente |
| 50 | Rebarbação, limpeza, identificação do lote, inspeção | Bancada | — |
| 60 | Tratamento térmico (terceirizado) | Fornecedor | — |
| 70 | Inspeção de recebimento + lapidação dos centros | Bancada / torno | Entre pontas |
| 80 | Retífica cilíndrica externa (Ø25, Ø25, Ø20) | Retificadora cilíndrica | Entre pontas + arrastador |
| 90 | Inspeção final | Metrologia | — |
| 100 | Proteção (óleo protetivo) e embalagem | Expedição | — |

### Op. 10 — Corte

- Serra fita com lâmina bimetálica 4/6 dentes por polegada (para Ø30 maciço).
- Velocidade da lâmina ~40–60 m/min (aço-liga recozido), com fluido.
- Destopo de 5 mm na primeira ponta de cada barra; batente em 182 mm.
- Tolerância do blank: 182 ±0,5 mm; perpendicularidade do corte ≤ 0,5 mm.
- Marcar o número da corrida do certificado no lote cortado (rastreabilidade).

### Op. 20 — Torno CNC, lado A

Fixação: placa 3 castanhas no bruto Ø30, ~50 mm de pega; batente axial na placa.
Após o furo de centro, encostar o contraponto (balanço ≈ 130 mm).

| Seq. | Operação | Ferramenta | Vc (m/min) | f (mm/rot) | ap (mm) |
|---|---|---|---|---|---|
| 1 | Facear (remover 1 mm) | T01 — CNMG 120408 metal duro classe P25 (PCLNR 2020) | 200 | 0,20 | 0,5 + 0,5 |
| 2 | Furo de centro DIN 332 B2,5 | T05 — broca de centro B2,5 HSS | n = 1.500 rpm | 0,05 | — |
| 3 | Desbaste Ø25,4 × 25 e Ø28 até 95,5 mm da face | T01 — CNMG 120408 | 200 | 0,30 | 1,5–2,0 |
| 4 | Semi-acabamento/acabamento do perfil | T03 — VNMG 160404 P15 (SVJBR) | 240 | 0,12 | 0,2 |
| 5 | Canal de alívio DIN 509 E (Ø24,4) no ressalto Ø25/Ø28 | T07 — bedame 2 mm | 100 | 0,05 | — |

### Op. 30 — Torno CNC, lado B

Fixação: castanhas moles usinadas para o Ø28, com degrau que encosta no ressalto
Ø25/Ø28 do lado A (referência axial → garante o comprimento 155 mm até a face B e
o total de 180 mm). Contraponto no centro após furar.

| Seq. | Operação | Ferramenta | Vc (m/min) | f (mm/rot) | ap (mm) |
|---|---|---|---|---|---|
| 1 | Facear para o comprimento total 180 ±0,1 | T01 | 200 | 0,20 | 0,5 + 0,5 |
| 2 | Furo de centro DIN 332 B2,5 | T05 | n = 1.500 rpm | 0,05 | — |
| 3 | Desbaste Ø20,4 × 35 e Ø25,4 × 50 | T01 | 200 | 0,30 | 1,5–2,0 |
| 4 | Acabamento do perfil + chanfros | T03 | 240 | 0,12 | 0,2 |
| 5 | Canais de alívio Ø19,4 (ressalto Ø20/Ø25) e Ø24,4 (ressalto Ø25/Ø28) | T07 | 100 | 0,05 | — |

Parâmetros para material **recozido (~200 HB)**. Se comprar beneficiado (~30 HRC),
reduzir Vc para ~150 m/min em desbaste e ~180 m/min em acabamento.

### Op. 40 — Fresadora, rasgo de chaveta

- Rasgo fechado (chaveta forma A, extremidades arredondadas) 8 P9 × 40 mm, centrado
  no assento do cubo: começa a 40 mm e termina a 80 mm da face B.
- Dispositivo: dois blocos em V alinhados com a mesa, grampo superior, **batente
  axial na face B** e centragem do eixo da fresa com o eixo da peça (simetria 0,03).
- Ferramenta: fresa de topo para rasgo de chaveta Ø8 metal duro, 2 cortes, tolerância
  e8, raio de canto 0,3 mm (o raio no fundo reduz concentração de tensão e risco de
  trinca na têmpera).
- Parâmetros (metal duro, 4140 recozido): Vc ≈ 80 m/min → n ≈ 3.200 rpm;
  fz = 0,02–0,03 mm → vf ≈ 130–190 mm/min; entrada em rampa ou mergulho com
  f reduzido; profundidade em 2–3 passes.
- Com fresa HSS-Co: Vc ≈ 25 m/min → n ≈ 1.000 rpm, fz ≈ 0,02 mm.
- **Profundidade considerando o sobremetal de retífica:** o rasgo é feito sobre
  Ø25,40, e a retífica vai tirar 0,2 mm do lado oposto. Medir do fundo do rasgo à
  geratriz oposta: **21,10 ±0,05 mm** (resulta em t1 = 4,1 após retificar, centro da
  tolerância 4,0 +0,2).
- Largura controlada com calibrador passa/não-passa 8 P9 (o rasgo não é retificado).
- Rebarbar as bordas do rasgo (rebarba aqui marca o assento do cubo na retífica).

### Op. 50 — Rebarbação, limpeza, identificação

- Rebarbar arestas, lavar e secar (remover óleo de corte — contamina o forno).
- Gravar/etiquetar lote e corrida; separar em cestos com nº de peças conferido.
- Inspeção por amostragem conforme plano de controle (seção 8).

### Op. 60 — Tratamento térmico (terceirizado)

Ver seção 6 para a decisão. Enviar ao fornecedor: desenho com **zonas e dureza
exigidas**, profundidade de camada (se localizado), material + certificado, e pedir
de volta **relatório com dureza e, se aplicável, corpo de prova/corte metalográfico
de 1 peça do lote**.

### Op. 70 — Recebimento após tratamento

- Dureza Rockwell C: 5 peças por lote (nos locais definidos no desenho).
- Batimento entre pontas com relógio comparador: 100 % (critério ≤ 0,15 mm; ver seção 4).
- Inspeção visual / partículas magnéticas por amostragem — trincas no rasgo de chaveta
  e nos cantos de ressalto.
- **Lapidar/retificar os furos de centro** (pedra ou rebolo de centro) — carepa e
  deformação do forno comprometem a retífica entre pontas.
- Jateamento leve, se vier com carepa.

### Op. 80 — Retífica cilíndrica externa entre pontas

- Fixação: entre pontas (ponta fixa de metal duro + contraponto), arrastador no Ø28.
- Rebolo: óxido de alumínio branco, ex. 38A60-K5V (dureza média, grão 60) para peça
  temperada; CBN vitrificado é opção para volume maior.
- Velocidade periférica do rebolo 30–35 m/s; velocidade da peça 15–25 m/min.
- Passadas no diâmetro: desbaste 0,01–0,02 mm; acabamento 0,005 mm;
  **2–3 passes de faiscamento (spark-out)** para Ra 0,4.
- Retificar os três diâmetros na mesma fixação (garante o batimento 0,01 em relação a A-B).
- Fluido abundante. Verificar **queima de retífica** por ataque com nital em amostra
  (manchas escuras = revenimento por superaquecimento → refugo).
- Dressagem do rebolo a cada ~20–30 peças ou quando o Ra subir.

### Op. 90 — Inspeção final

Diâmetros k6 com micrômetro (resolução 0,001) ou calibrador anel/súbito; batimento
entre pontas; rugosímetro em amostra; rasgo com calibrador; dureza conforme recebido.

### Op. 100 — Proteção e embalagem

Óleo protetivo anticorrosivo, separadores para que os assentos retificados não se
toquem, identificação do lote.

---

## 6. Tratamento térmico — peça inteira ou localizado?

| Critério | A) Têmpera e revenimento da peça inteira (beneficiamento) | B) Têmpera total alta dureza | C) Têmpera por indução localizada | D) Nitretação (gasosa/plasma) |
|---|---|---|---|---|
| Dureza típica no 4140 | 28–34 HRC (núcleo e superfície) | 50–55 HRC | Superfície 52–56 HRC, camada 1,0–1,5 mm; núcleo como fornecido | Superfície ~55–60 HRC, camada ~0,3–0,5 mm |
| Resistência ao desgaste nos assentos | Média | Alta | Alta (só onde precisa) | Alta |
| Tenacidade / fadiga | Boa | Baixa, frágil | Muito boa (tensões de compressão na superfície) | Muito boa |
| Risco de trinca no rasgo de chaveta | Baixo | **Alto** | Baixo (rasgo fica fora da zona temperada) | Muito baixo |
| Deformação | Moderada | Alta | Baixa a moderada (localizada) | Muito baixa |
| Sobremetal de retífica | 0,4 mm | 0,4–0,5 mm | 0,3–0,4 mm nas zonas temperadas | 0,05–0,1 mm (ou nenhuma) — **muda o processo** |
| Matéria-prima indicada | Recozida | Recozida | **Beneficiada** (núcleo já tenaz) | Beneficiada |
| Custo / logística | Baixo, fornecedores comuns | Baixo | Médio — precisa indutor/bobina dedicada | Médio-alto, ciclo longo |

**Recomendação para este eixo:**

- Se o eixo é apenas de **transmissão de torque com rolamentos** (caso usual): **opção A**
  — beneficiamento da peça inteira para 28–32 HRC. Processo simples, um único
  tratamento, o rasgo de chaveta não sofre, e a retífica é fácil. Alternativa ainda
  mais simples: comprar o 4140 já beneficiado e eliminar o tratamento — mas isso tira
  a etapa terceirizada que a atividade quer explorar.
- Se houver **desgaste nos assentos** (vedação com retentor girando sobre o eixo, assento
  de rolamento de agulhas sem anel interno, encaixe com montagem/desmontagem frequente):
  **opção C** — comprar 4140 beneficiado e fazer **têmpera por indução só nos assentos
  Ø25 (lado A) e Ø20 (lado B)**, mantendo o rasgo de chaveta e o corpo sem endurecer.
  O desenho deve indicar as zonas, a dureza (ex. 52–56 HRC), a profundidade de camada
  efetiva (ex. 1,0–1,5 mm a 45 HRC) e uma faixa de transição a ≥ 3 mm dos ressaltos.
- **Evitar a opção B** (têmpera total em alta dureza) com rasgo de chaveta: concentra
  tensão, alto risco de trinca e de empeno.

---

## 7. Programas CNC de referência (Fanuc 0i, programação em diâmetro)

Zero-peça na face acabada de cada lado; Z negativo em direção à placa.
**Simular e conferir antes de usar** — os códigos de contraponto (M-codes) variam
por máquina.

### O0020 — Lado A

```
O0020 (EIXO 4140 - OP20 LADO A)
G21 G18 G40 G99
G28 U0 W0
(--- FACEAMENTO ---)
T0101 (CNMG120408 DESBASTE)
G50 S3000
G96 S200 M03
G00 X34.0 Z0.5 M08
G01 X-1.6 F0.2
G00 Z2.0
X34.0
Z0
G01 X-1.6 F0.12
G00 Z2.0
G28 U0 W0
(--- FURO DE CENTRO DIN 332 B2,5 ---)
T0505
G97 S1500 M03
G00 X0 Z3.0
G01 Z-5.5 F0.05 (AJUSTAR ATE O ESCAREADO DE 8 MM)
G04 X0.5
G00 Z5.0
G28 U0 W0
M00 (ENCOSTAR CONTRAPONTO)
(--- DESBASTE ---)
T0101
G50 S3000
G96 S200 M03
G00 X31.0 Z2.0 M08
G71 U2.0 R0.5
G71 P100 Q200 U0.4 W0.1 F0.3
N100 G00 X23.4
G01 Z0
X25.4 Z-1.0
Z-25.0
X27.0
X28.0 Z-25.5
Z-95.5
N200 X31.0
G28 U0 W0
(--- ACABAMENTO ---)
T0303 (VNMG160404 ACABAMENTO)
G50 S3000
G96 S240 M03
G00 X31.0 Z2.0
G42
G70 P100 Q200 F0.12
G40 G00 X40.0
G28 U0 W0
(--- CANAL DE ALIVIO DIN 509 E - REF. ARESTA LADO PLACA ---)
T0707 (BEDAME 2 MM)
G96 S100 M03
G00 X30.0 Z-25.0
G01 X24.4 F0.05
G04 X0.3
G00 X30.0
Z-24.5
G01 X24.4 F0.05
G04 X0.3
G00 X30.0
G28 U0 W0 M09
M30
```

### O0030 — Lado B

```
O0030 (EIXO 4140 - OP30 LADO B)
G21 G18 G40 G99
G28 U0 W0
(--- FACEAMENTO PARA 180 MM ---)
T0101
G50 S3000
G96 S200 M03
G00 X34.0 Z0.5 M08
G01 X-1.6 F0.2
G00 Z2.0
X34.0
Z0
G01 X-1.6 F0.12
G00 Z2.0
G28 U0 W0
(--- FURO DE CENTRO ---)
T0505
G97 S1500 M03
G00 X0 Z3.0
G01 Z-5.5 F0.05
G04 X0.5
G00 Z5.0
G28 U0 W0
M00 (ENCOSTAR CONTRAPONTO)
(--- DESBASTE ---)
T0101
G50 S3000
G96 S200 M03
G00 X31.0 Z2.0 M08
G71 U2.0 R0.5
G71 P300 Q400 U0.4 W0.1 F0.3
N300 G00 X18.4
G01 Z0
X20.4 Z-1.0
Z-35.0
X24.4
X25.4 Z-35.5
Z-85.0
X27.0
X28.0 Z-85.5
N400 X31.0
G28 U0 W0
(--- ACABAMENTO ---)
T0303
G50 S3000
G96 S240 M03
G00 X31.0 Z2.0
G42
G70 P300 Q400 F0.12
G40 G00 X40.0
G28 U0 W0
(--- CANAIS DE ALIVIO ---)
T0707
G96 S100 M03
(CANAL Ø19,4 NO RESSALTO Ø20/Ø25)
G00 X26.0 Z-35.0
G01 X19.4 F0.05
G04 X0.3
G00 X26.0
Z-34.5
G01 X19.4 F0.05
G04 X0.3
G00 X30.0
(CANAL Ø24,4 NO RESSALTO Ø25/Ø28)
Z-85.0
G01 X24.4 F0.05
G04 X0.3
G00 X30.0
Z-84.5
G01 X24.4 F0.05
G04 X0.3
G00 X30.0
G28 U0 W0 M09
M30
```

---

## 8. Plano de controle (resumo)

| Op. | Característica | Especificação | Instrumento | Frequência |
|---|---|---|---|---|
| 10 | Comprimento do blank | 182 ±0,5 | Trena/paquímetro | 1ª peça + 1 a cada barra |
| 20/30 | Diâmetros p/ retífica | Ø25,40 / Ø20,40 ±0,03 | Micrômetro 0–25 / 25–50 | 1ª peça + 1/10 |
| 20/30 | Corpo | Ø28 h11 | Micrômetro | 1ª peça + 1/20 |
| 20/30 | Comprimentos 25 / 70 / 50 / 35 / 180 | ±0,1 | Paquímetro / altura | 1ª peça + 1/20 |
| 20/30 | Furo de centro | DIN 332 B2,5 | Visual + calibrador | 1ª peça + 1/50 |
| 40 | Largura do rasgo | 8 P9 | Calibrador P/NP | 100 % |
| 40 | Profundidade (fundo à geratriz oposta) | 21,10 ±0,05 | Micrômetro de ponta | 1ª peça + 1/10 |
| 40 | Posição/simetria do rasgo | 40–80 da face B · 0,03 | Paquímetro / relógio | 1ª peça + 1/20 |
| 70 | Dureza | Conforme opção da seção 6 | Durômetro Rockwell C | 5 por lote |
| 70 | Batimento após TT | ≤ 0,15 | Relógio entre pontas | 100 % |
| 80 | Diâmetros k6 | Ø25 / Ø20 (+0,015/+0,002) | Micrômetro 0,001 / súbito | 1ª peça + 1/5 |
| 80 | Rugosidade | Ra 0,4 (rolam.) / 0,8 (cubo) | Rugosímetro | 1ª peça + 1/50 |
| 80 | Batimento final | 0,01 | Relógio 0,001 entre pontas | 1/10 |
| 80 | Queima de retífica | Sem manchas | Ataque nital | 1 por troca de rebolo/turno |

---

## 9. Estimativa de tempos (ordem de grandeza)

Valores típicos para planejamento; confirmar com cronometragem do primeiro lote.

| Op. | Tempo/peça (min) | Lote 500 (h) | Observação |
|---|---|---|---|
| 10 Corte | 1,0 | 8,3 | Serra automática corta Ø30 em ~40–60 s |
| 20 Torno lado A | 3,0 | 25,0 | Inclui carga/descarga e contraponto |
| 30 Torno lado B | 3,0 | 25,0 | |
| 40 Fresadora | 2,5 | 20,8 | Dispositivo com batente |
| 50 Rebarbar/lavar | 0,5 | 4,2 | |
| 70 Recebimento + centros | 1,0 | 8,3 | |
| 80 Retífica | 5,0 | 41,7 | 3 diâmetros, entre pontas |
| 90/100 Inspeção e embalagem | 0,5 | 4,2 | |
| **Total interno** | **16,5** | **≈ 137 h** | + setups (~1–2 h por operação) + prazo do terceiro |

---

## 10. Pontos a definir

1. Desenho definitivo (diâmetros, comprimentos, tolerâncias) — a seção 2 é uma proposta.
2. Função dos assentos (rolamento com anel interno? retentor?) → decide entre opções A e C
   da seção 6, e com isso a condição de compra da barra (recozida × beneficiada).
3. Tipo de chaveta (forma A fechada × forma B aberta) e se há rasgo também no lado A.
4. Fornecedor do tratamento térmico: prazo, capacidade de indução, relatório exigido.
