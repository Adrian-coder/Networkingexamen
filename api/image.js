const fs = require('fs');
const path = require('path');
const { isAuthorized } = require('../lib/auth');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, max-age=600');
  if (!isAuthorized(req)) return res.status(401).end();
  const id = path.basename(String((req.query || {}).id || ''));
  if (!/^q\d{3}_\d+\.(png|jpe?g)$/i.test(id)) return res.status(400).end();
  const p = path.join(process.cwd(), 'data', 'images', id);
  if (!fs.existsSync(p)) return res.status(404).end();
  const ext = path.extname(id).toLowerCase();
  res.setHeader('Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg');
  return res.status(200).send(fs.readFileSync(p));
};
