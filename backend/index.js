require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health check route — just to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ message: 'Merit backend is running' });
});

const shops = require('./shops.json');
const { runProfileAgent } = require('./agents/profileAgent');

// Test route: run Agent 1 on a specific shop by ID
app.get('/api/test/profile/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const result = await runProfileAgent(shop);
    res.json({ shop: shop.name, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const { runClusterAgent } = require('./agents/clusterAgent');

app.get('/api/test/cluster/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const result = await runClusterAgent(shop, shops);
    res.json({ shop: shop.name, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const { runFinancingAgent } = require('./agents/financingAgent');

app.get('/api/test/financing/:shopId', async (req, res) => {
  const shop = shops.find(s => s.shop_id === req.params.shopId);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    const profileResult = await runProfileAgent(shop);
    const clusterResult = profileResult.trust_score <= 30
      ? await runClusterAgent(shop, shops)
      : null;
    const financingResult = await runFinancingAgent(shop, profileResult, clusterResult);

    res.json({ shop: shop.name, profileResult, clusterResult, financingResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Merit backend running on http://localhost:${PORT}`);
});