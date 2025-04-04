# Use a Node.js base image
FROM node:18.15-slim as builder

RUN apt-get update -y
RUN apt-get install -y openssl

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json) to the working directory
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Install dependencies including 'devDependencies' for building
RUN npm install --silent

# Copy the rest of your application's source code
COPY . .

# Use Prisma to generate client
RUN npx prisma generate

# Start a new stage to keep the final image small
FROM node:18.15-slim

# Environment variable to set node environment to production
ENV NODE_ENV=production

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Install only production dependencies
RUN npm install --production --silent

# Copy the application source files (JavaScript) from the builder stage
COPY --from=builder /usr/src/app ./

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Use non-root user for better security
RUN chown -R node /usr
USER node

# Expose the port your app runs on
EXPOSE 3677

# Command to run your app
CMD ["node", "index.js"]
