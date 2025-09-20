FROM apify/actor-node-puppeteer-chrome:22

# Copy pre-built files
COPY dist/ ./dist/
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-audit --no-fund

# Set the command to run the actor
CMD ["node", "dist/main.js"]
