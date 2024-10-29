# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code
COPY . .

# Build the Vite project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the Vite preview server
CMD ["npm", "run", "preview"]