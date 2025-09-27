# How to Configure Gemini API Key

## Step 1: Get Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Step 2: Configure in VS Code
1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "Secure Assistant"
3. Find "Secure Assistant: Gemini Api Key"
4. Paste your API key

## Step 3: Alternative - Environment Variable
You can also set the API key as an environment variable:
```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
```

## Test the Extension
1. Open the test-security.js file
2. Save the file (Cmd/Ctrl + S)
3. Check the Problems panel for security issues
4. Hover over highlighted issues for explanations
5. Use Cmd/Ctrl + . on issues for quick fixes