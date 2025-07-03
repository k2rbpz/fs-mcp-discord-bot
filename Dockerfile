FROM node:20-slim
WORKDIR /usr/src/app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 8080
ENV PORT 8080
CMD ["pnpm", "run", "start"]