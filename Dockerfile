FROM apify/actor-node-puppeteer-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . ./

# Build TypeScript
RUN npm run build

# Set the command to run the actor
CMD ["node", "dist/main.js"]
