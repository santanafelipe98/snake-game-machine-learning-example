# Snake Game e Machine Learning

Clássico jogo da cobra desenvolvido em Vanilla JS. A ideia do projeto é aplicar Machine Learning para controlar a cobra usando posições da cabeça.

O jogo permite alternar o controle entre teclado e webcam.

- A - Esquerda
- D - Direita
- W - Cima
- S - Baixo

Veja a demonstração [aqui](https://santanafelipe98.github.io/snake-game-machine-learning-example).

![Snake Game](https://i.imgur.com/nMMXlYK.png)

## Stack

- Javascript
- CSS
- HTML
- Tensorflow.js

## Treinamento e Modelo

O modelo foi treinado com imagens próprias (obtidas da webcam) usando a ferramenta [Teachable Machine](https://teachablemachine.withgoogle.com/) - que após o treino, já fornece o código base para integração com páginas web.

A lógica de controle foi construída com base na direção da cabeça, exemplo: cabeça direcionada para a esquerda é entendido como um input para a esquerda - a mesma lógica é aplicada para as outras 3 direções (cima, direita e baixo).