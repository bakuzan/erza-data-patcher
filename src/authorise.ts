import express from 'express';
import API from '@chris-kode/myanimelist-api-v2';
import pkceChallenge from 'pkce-challenge';
import dotenv from 'dotenv';

import { writeFileAsync, pathFix } from 'medea';

dotenv.config();

const port = 3000;
const app = express();
const pkce = pkceChallenge();

const CODE_CHALLENGE = pkce.code_challenge;
const CLIENT_ID = process.env.MAL_CLIENT_ID;

if (typeof CLIENT_ID !== 'string') {
  console.log('CLIENT_ID is not defined.');
  process.exit(0);
}

const oauth = new API.OAUTH(CLIENT_ID);

app.get('/', (req, res) =>
  res.send(JSON.stringify({ params: req.params, query: req.query }))
);

app.get('/auth', async (req, res) => {
  const urlToRedirect = oauth.urlAuthorize(CODE_CHALLENGE);
  res.redirect(urlToRedirect);
});

app.get('/oauth', async (req, res) => {
  const CODE = req.query.code;

  if (typeof CODE !== 'string') {
    console.log('CODE is not defined.');
    process.exit(0);
  }

  const response = await oauth.accessToken(CODE, CODE_CHALLENGE);
  const data = JSON.stringify(response);

  await writeFileAsync(pathFix(__dirname, './output/tokens.json'), data);

  res.send(data);
});

app.listen(port, () =>
  console.log(`Erza Data Patcher is listening at http://localhost:${port}`)
);
