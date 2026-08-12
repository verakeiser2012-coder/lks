require('dotenv').config();
require('./init');
const bcrypt = require('bcryptjs');
const db = require('./index');
const { slugify } = require('../utils/slugify');

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`Админ "${username}" уже существует — пропускаю.`);
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Создан админ: ${username} / (пароль из .env)`);
}

function seedSettings() {
  const defaults = {
    site_name: process.env.SITE_NAME || 'Мой магазин',
    phone: '+7 (900) 000-00-00',
    email: 'shop@example.com',
    address: 'г. Москва',
    vk_url: '',
    telegram_url: '',
    whatsapp_url: '',
    instagram_url: '',
    about_text: 'Расскажите здесь о себе или о вашей компании.',
  };
  const insert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
  );
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
  console.log('Настройки по умолчанию проверены/добавлены.');
}

function seedCategoriesAndProducts() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count > 0) {
    console.log('Товары уже есть в базе — пропускаю добавление тестовых.');
    return;
  }

  const categories = ['Новинки', 'Хиты продаж', 'Аксессуары'];
  const catInsert = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  const catIds = categories.map((name) => {
    const slug = slugify(name);
    const info = catInsert.run(name, slug);
    return info.lastInsertRowid;
  });

  const products = [
    { name: 'Товар №1', price: 1500, category: catIds[0], stock: 10, desc: 'Описание товара №1.' },
    { name: 'Товар №2', price: 2300, category: catIds[1], stock: 5, desc: 'Описание товара №2.' },
    { name: 'Товар №3', price: 990, category: catIds[2], stock: 20, desc: 'Описание товара №3.' },
  ];

  const prodInsert = db.prepare(`
    INSERT INTO products (name, slug, description, price, category_id, image, stock, is_active)
    VALUES (?, ?, ?, ?, ?, '', ?, 1)
  `);
  for (const p of products) {
    const slug = slugify(p.name);
    prodInsert.run(p.name, slug, p.desc, p.price, p.category, p.stock);
  }
  console.log('Добавлены тестовые категории и товары.');
}

seedAdmin();
seedSettings();
seedCategoriesAndProducts();
console.log('Готово.');
