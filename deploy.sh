#!/bin/bash

# Local Business Data Extractor - Deployment Script
# Created by Manoj Dhiman (https://manojdhiman.me/)
# This script builds and deploys the Apify Actor

echo "🚀 Building Local Business Data Extractor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Apify CLI is installed
if ! command -v apify &> /dev/null; then
    echo "❌ Apify CLI is not installed. Installing..."
    npm install -g @apify/cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check for TypeScript errors."
    exit 1
fi

# Deploy to Apify
echo "🚀 Deploying to Apify..."
apify push

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed to Apify!"
    echo "🌐 You can now run the actor from the Apify platform."
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
