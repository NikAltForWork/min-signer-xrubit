FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /var/www/signer

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
