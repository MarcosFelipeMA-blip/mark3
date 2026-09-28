# Redutor NMRV 063 em 3D

Redutor coroa e rosca sem fim NMRV 063, i = 30:1, interativo no navegador: abra `index.html`.

- **Desmontagem** passo a passo (15 peças), com ficha de cada uma. Clique duplo tira ou recoloca uma peça.
- **Vista explodida** com controle deslizante.
- **Vistas** 3D, frontal, lateral e superior. A frontal e a lateral mostram as cotas do catálogo (E, H, R, I, C, A, G, G1, L, K, ØN).
- **Cortes** A-A (plano do engrenamento), B-B (eixo da coroa) e ¼, com as faces cortadas hachuradas e o óleo visível.
- **Funcionando**: o sem-fim gira e a coroa acompanha na relação exata de 30:1.

Medidas externas e desempenho vêm do catálogo geral JADD (NMRV 063). Dentes, rolamentos e retentores são representativos.
A carcaça é feita com operações booleanas (three-bvh-csg). Para gerar o `index.html` autocontido:

    npm install && npm run build
