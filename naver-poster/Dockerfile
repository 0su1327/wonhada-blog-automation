FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .
COPY login-capture.js .

EXPOSE 4000
CMD ["node", "server.js"]
