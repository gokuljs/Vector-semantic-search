FROM node:21-alpine3.18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install 
RUN npm install typescript -g
COPY . .
RUN rm -rf dist
RUN tsc
CMD ["npm","run","dev"]