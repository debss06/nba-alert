# NBA ALERT — versão gratuita em desenvolvimento

## O que já funciona
- Consulta o placar diário da NBA pela API pública não oficial da ESPN, sem chave.
- Seleciona um jogo e carrega os jogadores do box score.
- Cria várias metas por jogador: pontos, rebotes, assistências, cestas de 3, roubos, tocos e turnovers.
- Atualiza as estatísticas a cada 30 segundos enquanto o site está aberto.
- Mostra o progresso e dispara uma notificação local quando a meta é atingida.
- Salva metas no navegador e tem estrutura PWA para instalar no iPhone.

## Limitações desta versão
- A API da ESPN é não oficial, não tem SLA nem limites publicados e pode mudar.
- Os dados do jogador só ficam disponíveis quando o box score do jogo é publicado.
- As notificações só são verificadas enquanto o site está aberto/ativo. O service worker atual não faz push em segundo plano.
- Metas ficam salvas no armazenamento local daquele navegador/aparelho; não sincronizam entre dispositivos.
- Os arquivos de ícone `icon-192.png` e `icon-512.png` ainda precisam ser adicionados antes da publicação final. O app funciona sem eles, mas o ícone PWA não ficará completo.

## Como testar
1. Extraia o ZIP.
2. Publique os arquivos em uma hospedagem HTTPS estática (por exemplo, GitHub Pages).
3. Abra o endereço no navegador.
4. Escolha um jogo, selecione o jogador e configure a meta.
5. Permita notificações no navegador.

Para iPhone: abra o site no Safari, toque em Compartilhar > Adicionar à Tela de Início. Abra o ícone instalado e permita notificações quando solicitado. Web Push em iOS exige a aplicação adicionada à Tela de Início e suporte de versão do iOS; esta versão ainda usa notificações locais e não oferece push em segundo plano.

## Fonte de dados
ESPN site API (endpoints não documentados):
- https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
- https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=ID_DO_JOGO

Não inclua tokens ou senhas neste projeto. Nesta fase, não há credenciais.
