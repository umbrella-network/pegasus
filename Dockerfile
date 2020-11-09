FROM node:15-alpine
RUN apk add bash
RUN adduser -D runner
RUN mkdir -p /home/runner/app
WORKDIR /home/runner/app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm install -g typescript
RUN chown -R runner:runner /home/runner

USER runner
RUN npm install
RUN npm run build
