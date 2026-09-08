const db = require('../db');

// Магазин открыт, когда убрано предупреждение о подготовке к запуску
// (настройка shop_prelaunch_notice в /admin/settings) и заданы ключи эквайринга.
// Пока он закрыт, оформление заказа недоступно: иначе человек оставляет
// настоящий заказ и попадает на тестовую страницу оплаты.
function shopClosedNotice() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'shop_prelaunch_notice'").get();
  const notice = row ? String(row.value || '').trim() : '';
  const hasKeys = Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
  if (!notice && hasKeys) return '';
  return notice || 'Приём заказов откроется после подключения оплаты.';
}

module.exports = { shopClosedNotice };
