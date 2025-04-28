const fs = require('fs');

const config = {
  BACKEND_URL: process.env.BACKEND_URL || 'https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/api',
  API_KEY: process.env.API_KEY || 'ef306472fbed4ca9835115255241412'
};

fs.writeFileSync(
  './src/assets/config.json',
  JSON.stringify(config, null, 2)
);