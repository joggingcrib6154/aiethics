const fs = require('fs');

// Read the minified HTML from build
const minified = fs.readFileSync('build/index.html', 'utf8');

// Extract the script and link tags (get first unique match)
const scriptMatches = minified.matchAll(/<script[^>]*src="([^"]*)"[^>]*><\/script>/g);
const linkMatches = minified.matchAll(/<link[^>]*href="([^"]*\.css)"[^>]*>/g);

// Get first unique script and CSS
const scriptSrc = scriptMatches ? Array.from(scriptMatches)[0]?.[1] || '' : '';
const cssHref = linkMatches ? Array.from(linkMatches)[0]?.[1] || '' : '';

// Create formatted HTML
const formatted = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/aiethics/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
    <link rel="apple-touch-icon" href="/aiethics/logo192.png" />
    <link rel="manifest" href="/aiethics/manifest.json" />
    <title>React App</title>
    <script defer="defer" src="${scriptSrc}"></script>
    <link href="${cssHref}" rel="stylesheet" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`;

fs.writeFileSync('index.html', formatted);
console.log('Formatted index.html created in root');
