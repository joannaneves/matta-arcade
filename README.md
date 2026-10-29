# Matta: ao vivo no caos

Um jogo de sobrevivência em arena, criado por Joanna para o streamer Matta. Explore uma floresta sombria inspirada em mapas de MOBA, ataque automaticamente e escolha melhorias ao coletar XP.

**Jogue localmente:** abra `index.html` em um navegador moderno. Não há build, instalação ou dependências.

O jogo usa o retrato e a folha de emotes enviados pelo criador. A trilha “Ela Partiu” (Lofi remix) toca em loop a 12% de volume depois de iniciar a partida e pode ser silenciada. Os clipes do painel “Sons do chat” só tocam quando alguém aperta um botão; eles podem conter linguagem adulta.

## Controles

- **WASD** ou **setas:** mover o personagem.
- **Celular:** use os botões direcionais na barra abaixo do jogo.
- Explore o mapa verde contínuo: a câmera acompanha o Matta e não há bordas para bloquear o caminho.
- Mova o personagem com **WASD**, **setas** ou os botões direcionais no celular.
- Os ataques automáticos miram o inimigo mais próximo.
- Orbes, espinhos perfurantes, brasas explosivas e ondas de choque alternam para manter o combate variado.
- Inimigos derrubados deixam cristais de XP. Cada nível oferece três melhorias para escolher.
- A horda ganha vida e pressão conforme os níveis avançam; corredores, tanques, brutamontes e chefes mudam o ritmo da luta.
- Chefes aparecem periodicamente; sobreviva às ondas e tente bater seu recorde de tempo e abates.

Os emotes aparecem nos rostos dos monstros e nos cristais de experiência. A foto do Matta aparece no personagem jogável, equipado como aventureiro. O cenário sombrio tem grama, trilhas de pedra, trechos de rio, arbustos e rochas, inspirado em mapas de MOBA. O botão Compartilhar usa a função nativa do dispositivo ou copia o link.

## Publicação

O site é estático e não precisa de etapa de build. O workflow em `.github/workflows/deploy.yml` publica o conteúdo da raiz no GitHub Pages a cada atualização da branch `main`.

Na primeira publicação, selecione **GitHub Actions** em **Settings → Pages → Build and deployment → Source**. Depois disso, os próximos envios para `main` atualizam o site automaticamente.

## Créditos

Projeto independente feito por fã; não afiliado, patrocinado ou endossado pelo streamer, Twitch ou Riot Games. Os links sociais apontam para os perfis compartilhados pelo criador do jogo. A foto, os emotes e os clipes de chat foram fornecidos pelo criador. A trilha é o arquivo fornecido pelo criador, identificado como “Tim Maia - Ela Partiu (Lofi remix) - GabrielMzero”.

