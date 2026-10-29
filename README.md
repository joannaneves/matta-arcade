# Matta: ao vivo no caos

Um mini arcade de navegador feito como homenagem de fã ao streamer Matta. Desvie dos obstáculos, pegue hype e atravesse três fases inspiradas em LoL, economia e debates ao vivo.

**Jogue localmente:** abra `index.html` em um navegador moderno. Não há build, instalação ou dependências.

O jogo usa o retrato e a folha de emotes enviados pelo criador. Os dois clipes de áudio ficam disponíveis no painel “Sons do chat” e só tocam quando alguém aperta um dos botões; os arquivos podem conter linguagem adulta.

## Controles

- **WASD** ou **setas:** mover o personagem.
- **Celular:** use os botões direcionais na barra abaixo do jogo.
- **✦ Hype:** vale 10 pontos; sobreviver também aumenta o placar.
- **Obstáculos:** três colisões encerram a rodada.

O recorde fica salvo localmente no navegador. O botão Compartilhar usa a função nativa do dispositivo ou copia o link. Os emotes aparecem como itens coletáveis, e a foto do Matta vira o personagem jogável.

## Publicação

O site é estático e não precisa de etapa de build. O workflow em `.github/workflows/deploy.yml` publica o conteúdo da raiz no GitHub Pages a cada atualização da branch `main`.

Na primeira publicação, selecione **GitHub Actions** em **Settings → Pages → Build and deployment → Source**. Depois disso, os próximos envios para `main` atualizam o site automaticamente.

## Créditos

Projeto independente feito por fã; não afiliado, patrocinado ou endossado pelo streamer, Twitch ou Riot Games. Os links sociais apontam para os perfis compartilhados pelo criador do jogo. A foto, os emotes e os clipes de áudio foram fornecidos pelo criador deste jogo.

