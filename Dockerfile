FROM node:20.19.0

RUN apt-get update && apt-get install -y qpdf && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend deps
COPY package*.json ./
RUN npm install

# Install frontend deps separately
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend

# Copy all source
COPY . .

# Build frontend
RUN npm --prefix frontend run build
RUN rm -rf public && cp -r frontend/dist public

# Generate Prisma client
RUN npx prisma generate

EXPOSE 8080

CMD ["node", "src/index.js"]