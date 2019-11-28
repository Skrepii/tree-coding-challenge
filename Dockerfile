FROM node:12

WORKDIR /app
COPY . /app
RUN npm install
RUN ["chmod", "+x", "startServer.sh"]

ENTRYPOINT ["./startServer.sh"]