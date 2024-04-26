FROM node:20.12.2

RUN set -eux ; \
  apt-get update ; apt-get upgrade -y

RUN set -eux ; \
  apt-get update ; apt-get install -y \
  wget

WORKDIR /app

RUN mkdir tmp

COPY app/package*.json .
RUN npm install

COPY app .

EXPOSE 3001
ENTRYPOINT [ "/app/entrypoint.sh", "start" ]
