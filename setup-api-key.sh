#!/bin/bash

# Setup script for Secure Code Assistant API Key
echo "🔧 Secure Code Assistant - API Key Setup"
echo "========================================"

# Check if API key is already set
if [ ! -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "✅ GOOGLE_GENERATIVE_AI_API_KEY is already set: ${GOOGLE_GENERATIVE_AI_API_KEY:0:8}..."
else
    echo "❌ GOOGLE_GENERATIVE_AI_API_KEY is not set"
fi

echo ""
echo "📝 Setup Options:"
echo ""
echo "1. Set for current terminal session:"
echo "   export GOOGLE_GENERATIVE_AI_API_KEY=\"your-api-key-here\""
echo ""
echo "2. Add to your shell profile (~/.zshrc, ~/.bashrc):"
echo "   echo 'export GOOGLE_GENERATIVE_AI_API_KEY=\"your-api-key-here\"' >> ~/.zshrc"
echo "   source ~/.zshrc"
echo ""
echo "3. Create .env file in project root:"
echo "   echo 'GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here' > .env"
echo ""
echo "4. Use VS Code command: 'Configure Gemini API Key'"
echo ""
echo "🔗 Get your free API key from:"
echo "   https://aistudio.google.com/app/apikey"
echo ""

# Function to set API key interactively
read -p "Would you like to set the API key now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Google Gemini API key: " API_KEY
    if [ ! -z "$API_KEY" ]; then
        export GOOGLE_GENERATIVE_AI_API_KEY="$API_KEY"
        echo "✅ API key set for this session!"
        echo ""
        echo "To make it permanent, add this to your ~/.zshrc:"
        echo "export GOOGLE_GENERATIVE_AI_API_KEY=\"$API_KEY\""
        echo ""
        echo "Or create .env file:"
        echo "GOOGLE_GENERATIVE_AI_API_KEY=$API_KEY" > .env
        echo "✅ Created .env file with your API key"
    else
        echo "❌ No API key provided"
    fi
fi

echo ""
echo "🧪 To test your setup:"
echo "1. Restart VS Code"
echo "2. Open the extension"
echo "3. Use command: 'Reload AI Configuration'"
echo ""