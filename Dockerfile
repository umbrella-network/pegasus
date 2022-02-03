FROM node:16-alpine

RUN apk add bash make g++

WORKDIR /app

COPY tsconfig.json ./
COPY package.json ./
COPY newrelic.js ./
COPY src ./src

RUN npm install
RUN mkdir data
RUN mkdir tmp

RUN npm run build
