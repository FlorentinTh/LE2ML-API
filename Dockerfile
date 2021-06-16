FROM node:12-slim AS build

WORKDIR /usr/src/app

COPY . .

RUN npm i -g npm@latest --registry=https://registry.npmjs.org

RUN npm install

RUN npm run build

FROM node:12-slim

COPY package*.json .

COPY --from=build /usr/src/app/build .

VOLUME [ "/.certs" ]

VOLUME [ "/log" ]

VOLUME [ "/data" ]

RUN npm i -g npm@latest --registry=https://registry.npmjs.org

RUN npm install --only=prod

EXPOSE 3000

CMD npm run production
