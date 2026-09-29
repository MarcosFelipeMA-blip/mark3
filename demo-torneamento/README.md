# Bancada Virtual de Torneamento

Demonstração 3D dos ensaios do Projeto Integrador (UniSENAI) *Estudo experimental da influência da rotação e avanço na vibração e rugosidade no torneamento de alumínio*.

Abra `index.html` no navegador (precisa de internet para carregar o three.js e as fontes).

## O que mostra

- **Torno em 3D** com placa de 3 castanhas, tarugo de alumínio e a montagem real da ferramenta: suporte **DWLNR 2525M 06** + pastilha **WNMG 06 04 12-WMX 4405**, com a geometria do STEP exportado do Tool Assembly Builder da Sandvik Coromant. O passe cilíndrico externo é animado: rotação, avanço em direção à placa, redução de Ø por 2·ap, marcas de avanço e cavacos. A ferramenta pode ficar na torre traseira (invertida, como nos tornos CNC) ou na dianteira.
- **Sinal de vibração** (aceleração no suporte) e **espectro FFT**, com a frequência de rotação e o modo do suporte (~1,45 kHz). Quando há chatter, o pico do suporte domina.
- **Perfil de rugosidade** com passo = fn e forma do raio de ponta rε = 1,2 mm, calculando a Ra do perfil.
- **Matriz L9 de Taguchi** (9 ensaios × 2 repetições) com vc, vf, Ra teórica `Ra = fn²/(18√3·rε)` e campos para digitar a **Ra medida** e a **vibração medida**.
- **Efeitos principais** (média da resposta em cada nível de n, fn e ap), usando os dados medidos quando a tabela estiver completa.

Enquanto os ensaios não forem feitos, vibração e "Ra estimada" vêm de um **modelo ilustrativo** e aparecem com esse rótulo na página. Os níveis dos fatores (padrão: n = 1000/1500/2000 rpm, fn = 0,10/0,20/0,30 mm/rot, ap = 0,5/1,0/1,5 mm) e o Ø do tarugo podem ser editados na página. Os valores ficam salvos no navegador.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página final (gerada) |
| `src/template.html` | Código-fonte da página |
| `modelo/*.stp` | Montagem original (STEP, Sandvik Coromant) |
| `modelo/mesh.json` | Malha triangular extraída do STEP |
| `tools/step_para_malha.py` | Conversão STEP → JSON (`pip install cadquery-ocp`) |
| `tools/build.py` | Injeta a malha no template e gera `index.html` |

Para regenerar após editar o template: `python tools/build.py`.
