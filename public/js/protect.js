// Лёгкая защита контента от простого копирования (не абсолютная — таких не бывает).
// Блокируем контекстное меню и перетаскивание на изображениях; текст остаётся выделяемым.
document.addEventListener('contextmenu', function (e) {
  if (e.target.closest('img, video')) e.preventDefault();
});
document.addEventListener('dragstart', function (e) {
  if (e.target.closest('img')) e.preventDefault();
});
