// Английская версия сайта под /en/…
//
// Запрос /en/catalog обрабатывает тот же маршрут, что и /catalog: префикс
// снимается с req.url, а res.render перехватывается — готовый HTML прогоняется
// через services/pageTranslate (перевод фраз с кэшем), внутренние ссылки
// получают /en. res.redirect тоже перехватывается, чтобы после формы под /en
// человек не выпал в русскую версию.
//
// Исключение — /en/news: у новостей английские тексты живут в базе, этот
// раздел смонтирован отдельно (server.js) и префикс у него не снимается;
// переводится только «рамка» страницы, сами новости помечены translate="no".

const { translatePage, translateScript, withEnPrefix, isNoPrefixPath } = require('../services/pageTranslate');

function langMiddleware(req, res, next) {
  req.lang = 'ru';
  if (!/^\/en(?=\/|\?|$)/.test(req.url)) return next();

  const rest = req.url.slice(3) || '/';
  const path = rest.split('?')[0];

  // Скрипты с переведёнными строками: /en/js/<файл>.js
  const jsMatch = /^\/js\/([\w-]+\.js)$/.exec(path);
  if (jsMatch && req.method === 'GET') {
    return translateScript(jsMatch[1])
      .then((out) => {
        if (out == null) return next();
        res.set('Content-Type', 'application/javascript; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(out);
      })
      .catch(next);
  }
  if (path !== '/' && isNoPrefixPath(path)) return next(); // /en/admin, /en/css/… — не существует

  req.lang = 'en';
  res.locals.lang = 'en';
  if (!/^\/news(\/|$)/.test(path)) req.url = rest;

  const render = res.render.bind(res);
  res.render = function (view, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    render(view, options, (err, html) => {
      if (err) return callback ? callback(err) : next(err);
      translatePage(html)
        .catch((e) => { console.error('[lang] перевод страницы не удался:', e.message); return html; })
        .then((out) => (callback ? callback(null, out) : res.send(out)));
    });
  };

  const redirect = res.redirect.bind(res);
  res.redirect = function (a, b) {
    if (typeof a === 'number') return redirect(a, withEnPrefix(b));
    return redirect(withEnPrefix(a));
  };

  next();
}

module.exports = langMiddleware;
