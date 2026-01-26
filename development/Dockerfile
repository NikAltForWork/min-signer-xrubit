FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /var/www/signer

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

RUN npm install -g ts-node

COPY . .

EXPOSE 3000

CMD ["npx", "nodemon", "--exec", "npx ts-node", "server.ts"]
