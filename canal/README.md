# Canais em T no torno vertical

Demonstração 3D da usinagem de 9 canais em T no diâmetro interno de um anel porta-palhetas (Ø684,5), num torno vertical Mazak, com cabeçote de saída 25×25. Abra `index.html`.

Sequência: bedame reto (abre o canal) → bedame redondo (raio do fundo) → bedame esquerdo (R3 superior) → bedame direito (R3 inferior).
O canal 5 é mostrado em tempo real; os outros 8 em modo acelerado. A peça aparece cortada ao meio, com o perfil do desenho em linha tracejada azul.

- Ferramentas: malhas dos STEP da Sandvik Coromant (suporte 570-40RF-2525N, lâminas C2R-SL40-LK18GB e C2R-SL40-LH23GB, pastilhas C2I-K2N-0600-0008-TM, C2I-K2N-0714-RO, LG123H1-0400-0004-GS e RG123H1-0400-0004-GS).
- Remoção de material: a silhueta real de cada pastilha é varrida ao longo do caminho da ferramenta e subtraída da seção da peça (polygon-clipping).
- Perfil do canal lido do desenho de detalhe; o passo entre canais (46 mm) e a forma externa do anel são estimados.

Gerar de novo: `tools/step_export.cjs` → `tools/silhouettes.py` → `tools/pack_tools.py` (gera `src/toolsdata.js`), depois `npm install && npm run build`.
