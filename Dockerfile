# Use the official Node.js 18 LTS image as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk --no-cache add python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Set environment variables (these should be provided at runtime)
ENV NODE_ENV=production
ENV PORT=10000

# Command to run the application
CMD ["node", "complete-admin-bot.js"]
