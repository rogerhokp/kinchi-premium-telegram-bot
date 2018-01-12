const request = require('request');


const sendMessage = (token, chatId, message) => {
  const baseUrl = `https://api.telegram.org/bot${token}`;
  request.post(`${baseUrl}/sendMessage`, {
    form: {
      chat_id: chatId,
      text: message
    }
  })
};

const getKorbitDate = (symbol, pair) => new Promise((resolve, reject) => {
  request.get(`https://api.korbit.co.kr/v1/ticker?currency_pair=${pair}`, (err, resp, body) => {
    if (err) {
      reject(err);
      return;
    }
    const price = JSON.parse(body).last;
    resolve({
      symbol,
      priceInUsd: price / 1068
    });
  });
});

const getTickersData = (cb) => {
  request.get('https://api.coinmarketcap.com/v1/ticker/?convert=HKD&limit=3',
    (err, resp, body) => {
      const data = JSON.parse(body);
      cb(data.map(d => ({
        'symbol': d.symbol,
        'name': d.name,
        'priceInUsd': d.price_usd,
        'priceInHkd': d.price_hkd
      })));
    }
  );
}

const getTickerDate = (usertext, symbol, cb) => {
  request.get('https://api.coinmarketcap.com/v1/ticker/' + symbol + '/?convert=HKD',
    (err, resp, body) => {
      if (err) {
        throw err;
      }
      var pct = parseFloat(usertext.split(' ')[1]);
      const data = JSON.parse(body);
      var name = data[0].name;
      var priceInUsd = data[0].price_usd;
      var priceInHkd = data[0].price_hkd;
      var priceInUsdTxt = priceInUsd;
      var priceInHkdTxt = priceInHkd;
      var pctTxt = '';
      if (pct) {
        priceInUsd = priceInUsd * (1 + (pct / 100));
        priceInUsdTxt = `${priceInUsd} (+${priceInUsd * (pct / 100)})`;

        priceInHkd = priceInHkd * (1 + (pct / 100));
        priceInHkdTxt = `${priceInHkd} (+${priceInHkd * (pct / 100)})`;

        pctTxt = `Fee: ${pct}%`;
      }
      cb({
        name,
        pct,
        pctTxt,
        priceInHkd,
        priceInHkdTxt,
        priceInUsd,
        priceInUsdTxt
      });
    });
};

module.exports = (context, cb) => {
  console.log('context',context);
  // sendMessage(token, chat, 'hihih');
  // cb(null, { status: 'no message' });
  // return;

  const token = context.data.token;
  const message = context.data.message || context.data.edited_message;

  if (!message || !message.text) {
    console.error('unknown request', context.data);
    cb(null, { status: 'no message' });
    return;
  }
  const usertext = message.text.trim();
  const chat = message.chat.id;


  if (!usertext) {
    cb(null, { status: 'ok' });
    return;
  } else {
    try {
      if (usertext.indexOf(`/eth`) >= 0) {

        getTickerDate(usertext, 'ethereum', (data) => {
          const name = data.name;
          const priceInUsdTxt = data.priceInUsdTxt;
          const priceInHkdTxt = data.priceInHkdTxt;
          const pctTxt = data.pctTxt;
          sendMessage(token, chat, 
`${name}
  USD$: ${priceInUsdTxt}
  HKD$: ${priceInHkdTxt}
  ${pctTxt}`
        );
          cb(null, { status: 'ok' });
        });

      } else if (usertext === '/kp' || usertext.indexOf(`/kp@`) === 0 ) {
        getTickersData((data) => {
          const ps = data.map(d => {
            return getKorbitDate(d.symbol, `${d.symbol.toLowerCase()}_krw`);
          });

          Promise.all(ps).then((krData) => {
            var korbitUsdPriceMap = {};
            krData.forEach(krd => {
              korbitUsdPriceMap[krd.symbol] = krd.priceInUsd;
            });

            const msg = data.reduce((txt, d) => {
              const krPrice = korbitUsdPriceMap[d.symbol];
              const glPrice = d.priceInUsd;
              const diff = (krPrice - glPrice);
              const pct = diff / glPrice * 100;
              return txt += 
` 
  ${d.name} 
      USD$ ${glPrice} <-> ${krPrice.toFixed(2)} / ${diff.toFixed(2)} (${pct.toFixed(2)}%)`;
            }, `Kimchi Premium`);


            sendMessage(token, chat, msg);
            cb(null, { status: 'ok' });
          }).catch(e => {
            console.error('error', e);
            sendMessage(token, chat, JSON.stringify(e));
            cb(null, { status: 'ok' });
          });



        });
      } else {
        // sendMessage(token, chat, '/kp or /eth');
        cb(null, { status: 'error' });
      }


    } catch (e) {
      console.error('error', e);
      sendMessage(token, chat, 'Error');
      cb(null, { status: 'error' });
    }



  }


};

