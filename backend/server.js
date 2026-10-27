import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 characters');
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' || name.trim().length < 2 ||
      name.trim().length > 100 ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 8 || password.length > 72
    ) {
      return res.status(400).json({
        error: 'Enter a valid name and email, and a password of 8–72 characters'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'customer')`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      role: 'customer'
    };

    res.status(201).json({
      message: 'Account created successfully',
      token: createToken(user),
      user
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Could not create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 255 || password.length > 72
    ) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM users WHERE email = ? LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    const user = rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      message: 'Login successful',
      token: createToken(publicUser),
      user: publicUser
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Could not log in' });
  }
});

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Account is unavailable' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cravematch',
  waitForConnections: true,
  connectionLimit: 10
});

const asFood = row => ({...row, price: Number(row.price), rating: Number(row.rating),
  portion_grams: Number(row.portion_grams), review_count: Number(row.review_count),
  quality_approved: Boolean(row.quality_approved), is_available: Boolean(row.is_available),
  is_surplus: Boolean(row.is_surplus), surplus_quantity: Number(row.surplus_quantity || 0)});

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ok:true, message:'CraveMatch API and database connected'}); }
  catch (e) { res.status(500).json({ok:false, error:'Database connection failed', detail:e.message}); }
});

app.get('/api/foods', async (req,res) => {
  try {
    const q = (req.query.q || '').trim();
    const [rows] = await pool.query(
      `SELECT * FROM food_items WHERE is_available=1 AND
       (?='' OR name LIKE ? OR category LIKE ? OR description LIKE ? OR cravings LIKE ?)
       ORDER BY rating DESC`, [q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);
    res.json(rows.map(asFood));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/recommendations', async (req,res) => {
  try {
    const mood = String(req.query.mood || '').toLowerCase();
    const budget = Math.max(0, Number(req.query.budget || 0));
    const q = String(req.query.q || '').toLowerCase();
    const userId = String(req.query.userId || 'demo-user');
    const [foods] = await pool.query('SELECT * FROM food_items WHERE is_available=1 AND quality_approved=1');
    const [history] = await pool.query(
      `SELECT oi.food_id, COUNT(*) AS ordered_count FROM order_items oi
       JOIN orders o ON o.id=oi.order_id WHERE o.user_id=? GROUP BY oi.food_id`, [userId]);
    const [rated] = await pool.query('SELECT food_id, AVG(rating) AS personal_rating, COUNT(*) AS n FROM ratings WHERE user_id=? GROUP BY food_id', [userId]);
    const historyMap = new Map(history.map(x=>[Number(x.food_id), Number(x.ordered_count)]));
    const ratingMap = new Map(rated.map(x=>[Number(x.food_id), {rating:Number(x.personal_rating), n:Number(x.n)}]));
    const ranked = foods.map(raw => {
      const f = asFood(raw);
      const tags = (f.cravings || '').toLowerCase().split(',').map(x=>x.trim());
      const text = `${f.name} ${f.category} ${f.description} ${f.cravings}`.toLowerCase();
      const searchMatch = q && text.includes(q) ? 3 : 0;
      const moodMatch = mood && tags.some(t=>t.includes(mood)) ? 3 : 0;
      const orders = historyMap.get(f.id) || 0;
      const personal = ratingMap.get(f.id);
      const personalScore = Math.min(orders,3)*0.4 + (personal ? (personal.rating-3)*0.7 : 0);
      const budgetScore = budget > 0 && f.price <= budget ? 1 : 0;
      const ratingScore = (f.rating/5)*2 + Math.min(f.review_count,100)/100;
      const score = searchMatch + moodMatch + personalScore + budgetScore + ratingScore;
      return {...f, score: Number(score.toFixed(2)), price_per_100g: Number((f.price/f.portion_grams*100).toFixed(2)),
        recommendation_reasons: [
          moodMatch ? `Matches your ${mood} craving` : null,
          searchMatch ? 'Related to your search' : null,
          orders ? 'Based on your order history' : null,
          personal ? 'Uses your previous ratings' : null,
          budgetScore ? 'Within your budget' : null,
          !moodMatch && !searchMatch && !orders && !personal ? 'Popular, highly rated option' : null
        ].filter(Boolean)};
    }).filter(f => budget <= 0 || f.price <= budget)
      .sort((a,b)=>b.score-a.score);
    res.json(ranked);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/foods/:id/quality', async (req,res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.id,f.name,f.rating,f.review_count,f.quality_approved,f.quality_status,
       AVG(CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.rating END) AS recent_rating
       FROM food_items f LEFT JOIN ratings r ON r.food_id=f.id
       WHERE f.id=? GROUP BY f.id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({error:'Food not found'});
    res.json(rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/ratings', async (req,res) => {
  try {
    const {userId='demo-user', foodId, rating, review=''} = req.body;
    if (!foodId || !Number.isInteger(Number(rating)) || Number(rating)<1 || Number(rating)>5)
      return res.status(400).json({error:'foodId and rating from 1 to 5 are required'});
    await pool.query('INSERT INTO ratings(user_id,food_id,rating,review) VALUES(?,?,?,?)',[userId,foodId,rating,review]);
    const [[stats]] = await pool.query('SELECT AVG(rating) rating, COUNT(*) n FROM ratings WHERE food_id=?',[foodId]);
    await pool.query('UPDATE food_items SET rating=?, review_count=review_count+1 WHERE id=?',[stats.rating,foodId]);
    res.status(201).json({message:'Rating saved', rating:Number(stats.rating), review_count:Number(stats.n)});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/orders', async (req,res) => {
  const conn = await pool.getConnection();
  try {
    const {userId='demo-user', customerName='Demo User', budget=0, items=[]} = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({error:'Cart is empty'});
    await conn.beginTransaction();
    let subtotal = 0, checked = [];
    for (const item of items) {
      const qty = Math.floor(Number(item.quantity));
      if (!Number.isInteger(qty) || qty<1 || qty>50) throw new Error('Invalid quantity');
      const [rows] = await conn.query('SELECT id,name,price,is_available,quality_approved FROM food_items WHERE id=? FOR UPDATE',[item.foodId]);
      if (!rows.length || !rows[0].is_available) throw new Error('A selected dish is unavailable');
      if (!rows[0].quality_approved) throw new Error(`${rows[0].name} does not meet current quality eligibility`);
      const f=rows[0]; subtotal += Number(f.price)*qty; checked.push({foodId:f.id,name:f.name,price:Number(f.price),quantity:qty});
    }
    const deliveryFee = subtotal >= 199 ? 0 : 20;
    const total = Number((subtotal+deliveryFee).toFixed(2));
    if (Number(budget)>0 && total>Number(budget)) throw new Error(`Total ₹${total.toFixed(2)} exceeds your budget ₹${Number(budget).toFixed(2)}. Try Smart Swap.`);
    const [result] = await conn.query(
      'INSERT INTO orders(user_id,customer_name,budget,subtotal,delivery_fee,total) VALUES(?,?,?,?,?,?)',
      [userId,customerName,Number(budget),subtotal,deliveryFee,total]);
    for (const f of checked) await conn.query(
      'INSERT INTO order_items(order_id,food_id,food_name,quantity,unit_price) VALUES(?,?,?,?,?)',
      [result.insertId,f.foodId,f.name,f.quantity,f.price]);
    await conn.commit();
    res.status(201).json({message:'Order placed successfully',orderId:result.insertId,subtotal,deliveryFee,total,status:'Placed'});
  } catch(e) {
    await conn.rollback();
    res.status(400).json({error:e.message});
  } finally { conn.release(); }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT food_id, food_name, quantity, unit_price
         FROM order_items WHERE order_id = ?`,
        [order.id]
      );

      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Order history error:', error.message);
    res.status(500).json({ error: 'Could not load order history' });
  }
});

app.get('/api/surplus-meals', async (_req,res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM food_items WHERE is_available=1 AND is_surplus=1 AND surplus_quantity>0
      AND (collection_deadline IS NULL OR collection_deadline>NOW()) ORDER BY price ASC`);
    res.json(rows.map(asFood));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.listen(Number(process.env.PORT || 5000), () => console.log(`CraveMatch API running on port ${process.env.PORT || 5000}`));
