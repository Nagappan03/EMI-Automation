FROM node:20.19.0

# Install qpdf
RUN apt-get update && apt-get install -y qpdf && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything first (including prisma)
COPY . .

# Install dependencies
RUN npm install

# Explicitly generate Prisma client
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "start"]