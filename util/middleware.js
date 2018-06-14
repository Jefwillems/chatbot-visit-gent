const idMiddleWare = (req, res, next) => {
  if (!req.query.id) return res.json({ error: 'id url was not specified' });
  req.poi_id = req.query.id;
  return next();
};

const langMiddleWare = (req, res, next) => {
  const message = req.body.incoming_message;
  if (!message) return res.json({ error: 'something went wrong' });
  switch (message.toLowerCase()) {
    case 'nederlands':
      req.loc = 'nl';
      break;
    case 'english':
      req.loc = 'en';
      break;
    case 'français' || 'francais':
      req.loc = 'fr';
      break;
    case 'deutsch':
      req.loc = 'de';
      break;
    case 'español' || 'espanol':
      req.loc = 'es';
      break;
    default:
      req.loc = 'en';
      req.error = 'Language was not found, defaulting to English';
      break;
  }
  return next();
};

const typeMiddleware = (req, res, next) => {
  const qResult = req.body.queryResult;
  console.log(JSON.stringify(req.body));
  if (qResult) {
    switch (qResult.action) {
      case 'get_location_action':
        req.type = 'location';
        break;
      case 'get_all_squares':
        req.type = 'all_squares';
        break;
      case 'toiletten.search':
        req.type = 'toiletten.search';
        break;
      default:
        req.type = 'None';
        break;
    }
    return next();
  }
  return next(new Error('No queryResult provided.'));
};

module.exports = {
  idMiddleWare,
  langMiddleWare,
  typeMiddleware,
};
