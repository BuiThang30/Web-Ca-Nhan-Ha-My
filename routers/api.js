const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_COST = 684000 * 30; // 20,520,000 VND
const BASE_MENU = [
    { name: 'Rice (Gạo)', unit: 'kg', baseQty: 105 },
    { name: 'Soup powder (Bột canh)', unit: 'kg', baseQty: 3 },
    { name: 'Cooking oil (Dầu ăn)', unit: 'liters', baseQty: 3 },
    { name: 'Fish sauce (Nước mắm)', unit: 'liters', baseQty: 4.5 },
    { name: 'Green onions (Hành lá)', unit: 'kg', baseQty: 6 },
    { name: 'Pork shoulder (Thịt mông sấn)', unit: 'kg', baseQty: 21 },
    { name: 'Lean pork (Thịt nạc)', unit: 'kg', baseQty: 39 },
    { name: 'Chayote (Su su)', unit: 'kg', baseQty: 90 },
    { name: 'Carrot (Cà rốt)', unit: 'kg', baseQty: 18 },
    { name: 'Banana (Chuối tiêu)', unit: 'kg', baseQty: 114 },
    { name: 'Duck egg (Trứng vịt)', unit: 'pcs', baseQty: 600 },
    { name: 'Katuk (Rau ngót)', unit: 'kg', baseQty: 15 }
];

router.get('/stock', (req, res) => {
  res.json({
    items: [
      { name: 'Rice (Gạo)', in_stock: 450, unit: 'kg', daily_use: 15, lasts_until: '2026-11-09', days_left: 30 },
      { name: 'Duck egg (Trứng vịt)', in_stock: 300, unit: 'pcs', daily_use: 30, lasts_until: '2026-10-20', days_left: 10 },
      { name: 'Lean pork (Thịt nạc)', in_stock: 40, unit: 'kg', daily_use: 5, lasts_until: '2026-10-18', days_left: 8 },
      { name: 'Cooking oil (Dầu ăn)', in_stock: 10, unit: 'liters', daily_use: 0.5, lasts_until: '2026-10-30', days_left: 20 },
      { name: 'Banana (Chuối tiêu)', in_stock: 50, unit: 'kg', daily_use: 10, lasts_until: '2026-10-15', days_left: 5 },
      { name: 'Milk (Sữa)', in_stock: 120, unit: 'cartons', daily_use: 60, lasts_until: '2026-10-12', days_left: 2 }
    ],
    all_until: { date: '2026-10-12', days_left: 2 }
  });
});

router.get('/needs', (req, res) => {
  res.json({
    items: [
        { priority: 1, name: 'Milk (Sữa)', days_left: 2, suggested: 500, unit: 'cartons' },
        { priority: 2, name: 'Banana (Chuối tiêu)', days_left: 5, suggested: 100, unit: 'kg' },
        { priority: 3, name: 'Lean pork (Thịt nạc)', days_left: 8, suggested: 50, unit: 'kg' }
    ],
    updated: new Date().toISOString().split('T')[0],
    top: ['Milk', 'Banana', 'Pork']
  });
});

router.get('/forecast', (req, res) => {
  res.json({
    food: 'milk and bananas', run_out: '2026-10-12', extra_vnd: 15000000, month: 'November'
  });
});

router.get('/estimate', (req, res) => {
  const amount = Number(req.query.amount) || 0;
  const group = req.query.group || 'all';
  
  if (amount <= 0) return res.json({ amount: 0, items: [], days: 0 });

  const ratio = amount / BASE_COST;
  let estimatedItems = BASE_MENU.map(item => ({
      name: item.name, unit: item.unit, qty: item.baseQty * ratio
  }));

  if (group === 'A') {
      estimatedItems.find(i => i.name.includes('Rice')).qty *= 1.2;
      estimatedItems.find(i => i.name.includes('Lean pork')).qty *= 1.3;
  } else if (group === 'B') {
      estimatedItems.find(i => i.name.includes('Lean pork')).qty *= 1.2;
      estimatedItems.push({ name: 'Milk/Nuts', unit: 'cartons', qty: 100 * ratio });
  } else if (group === 'D') {
      estimatedItems.find(i => i.name.includes('Rice')).qty *= 0.8;
      estimatedItems.find(i => i.name.includes('Cooking oil')).qty *= 0.5;
      estimatedItems.find(i => i.name.includes('Pork shoulder')).qty *= 0.5;
  }

  res.json({
    amount: amount,
    items: estimatedItems.filter(i => i.qty >= 0.1),
    group_name: group === 'all' ? 'Entire Village' : `Group ${group.toUpperCase()}`,
    children: group === 'all' ? 120 : 30,
    days: Math.max(1, Math.floor(amount / 684000))
  });
});

router.post('/donations/financial', (req, res) => {
  const { amount, group } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount is required' });
  const groupName = group || 'all';
  
  db.run(`INSERT INTO financial_donations (amount, group_name) VALUES (?, ?)`, [Number(amount), groupName], function (err) {
      if (err) return res.status(500).json({ error: 'Server error' });
      
      const ratio = Number(amount) / BASE_COST;
      let estimatedItems = BASE_MENU.map(item => ({ name: item.name, unit: item.unit, qty: item.baseQty * ratio }));
      estimatedItems = estimatedItems.filter(i => i.qty >= 0.1);

      res.json({
        id: this.lastID,
        estimate: {
          amount: Number(amount),
          items: estimatedItems,
          group_name: groupName === 'all' ? 'Entire Village' : `Group ${groupName.toUpperCase()}`,
          children: groupName === 'all' ? 120 : 30,
          days: Math.max(1, Math.floor(amount / 684000))
        }
      });
  });
});

router.post('/donations/supplies', (req, res) => {
  const { items, details, dropoff, email } = req.body;
  db.run(`INSERT INTO supply_donations (items, details, dropoff, email) VALUES (?, ?, ?, ?)`, [items, details, dropoff, email], function (err) {
      res.json({ id: this.lastID });
  });
});

module.exports = router;