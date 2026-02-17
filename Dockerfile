FROM node:20.19.0

# Install qpdf
RUN apt-get update && apt-get install -y qpdf && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma schema BEFORE install (important)
COPY prisma ./prisma

# Install dependencies (postinstall will now find schema)
RUN npm install

# Copy remaining source files
COPY . .

EXPOSE 8080

CMD ["npm", "start"]