/**
 * Цена так, как её читает покупатель.
 *
 * Ноль — не цена, а «бесплатно»: «0 ₽» в каталоге выглядит опечаткой
 * в прайсе, а не подарком, и первым делом вызывает недоверие.
 *
 * Разряды разделяем неразрывным пробелом (его ставит toLocaleString),
 * чтобы «2 900 ₽» не переносилось по строкам в узкой карточке.
 */
function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value == null ? '' : value);
  if (n === 0) return 'Бесплатно';

  // Копейки показываем, только когда они есть: у нас цены круглые,
  // и «2 900,00 ₽» выглядел бы бухгалтерией, а не ценником.
  const withKopecks = Math.round(n * 100) % 100 !== 0;
  const body = n.toLocaleString('ru-RU', {
    minimumFractionDigits: withKopecks ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${body} ₽`;
}

/**
 * Цена товара на витрине.
 *
 * Ноль у вещи, которую делают под заказ, — это не «бесплатно», а «цены пока
 * нет»: она считается под конкретный тираж, размер или материал. Показываем
 * «Под заказ» и уводим человека в переписку, а не в корзину. У цифрового
 * товара ноль по-прежнему значит «бесплатно» — файл действительно отдаётся даром.
 */
function isMadeToOrder(product) {
  return Boolean(product) && Number(product.is_digital) !== 1 && Number(product.price) === 0;
}

function priceLabel(product) {
  if (isMadeToOrder(product)) return 'Под заказ';
  return formatPrice(product ? product.price : 0);
}

module.exports = { formatPrice, priceLabel, isMadeToOrder };
