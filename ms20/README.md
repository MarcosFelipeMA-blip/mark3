# Fresa MS20-R016A16-10L em 3D

Apresentação interativa da fresa CoroMill® MS20 MS20-R016A16-10L: abra `index.html` no navegador.

1. **A ferramenta**: cotas do desenho técnico, código decodificado e raio-X da refrigeração interna.
2. **Usinagem**: rebaixo a 90° em aço inox, com cavaco, fluido e dados de corte de exemplo.
3. **Vista explodida**: parafuso 5513 020-90, bit 5680 084-05 e chave de torque 5680 105-02.
4. **Montagem**: troca da pastilha passo a passo.
5. **Explorar**: gire, afaste as peças e clique em cada uma.

Corpo e pastilhas vêm do arquivo STEP oficial (convertido em `src/mesh.js` por `src/step-to-mesh.cjs`) e as cotas do DXF (`src/drawing.svg`). Parafuso, bit e chave são modelados. Depois de editar `src/template.html`, rode `python3 build.py` para gerar o `index.html` autocontido.
