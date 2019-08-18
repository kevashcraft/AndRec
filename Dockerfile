FROM node:12.8.1-buster-slim as builder

RUN npm i -g @vue/cli

RUN mkdir -p /app
WORKDIR /app

COPY app/package.json ./
COPY app/package-lock.json ./
RUN npm ci

COPY app/babel.config.js .
COPY app/vue.config.js .
COPY app/public public
COPY app/src src

CMD ["npm", "run", "serve"]
