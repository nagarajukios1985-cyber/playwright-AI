#!/bin/bash
# Setup script for Playwright AI Agent

# Add Node to PATH if needed
if [[ ":$PATH:" != *":/opt/homebrew/bin:"* ]]; then
    echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
fi

echo "✅ Setup complete!"
echo ""
echo "To run the agent:"
echo "  cd /Users/nagaraju.kankanala/Documents/playwright-AI"
echo "  /opt/homebrew/bin/node agent.js"
echo ""
echo "Or after restarting terminal:"
echo "  node agent.js"
