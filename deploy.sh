#!/bin/bash

echo "Building Next.js app..."
npm run build

echo ""
echo "Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo ""
echo "Deployment complete!"
echo "Your site will be available at the URL shown above."