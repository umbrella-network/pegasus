FROM node:15-alpine

RUN apk add bash python make g++

WORKDIR /app

COPY tsconfig.json ./
COPY package*.json ./
COPY newrelic.js ./

RUN npm install

COPY src ./src

RUN npm run build
