# Use the official Node.js 20 image as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install dependencies first to leverage Docker cache
COPY package*.json ./

# Install dependencies with clean install
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Set environment variables (these should be provided at runtime)
ENV NODE_ENV=production
ENV PORT=10000

# Command to run the application
CMD ["node", "src/index.js"]
