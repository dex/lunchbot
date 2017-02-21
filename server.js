/*-----------------------------------------------------------------------------
  A bot for lunch decision.

  Author: Dex Chen (chienhua@gmail.com)

  -----------------------------------------------------------------------------*/

// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var GooglePlaces = require('googleplaces');
var weather = require('openweather-apis');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
bot.set('persistConversationData', true);
server.post('/api/messages', connector.listen());

// Google Places service
var places = new GooglePlaces(process.env.GOOGLE_PLACES_API_KEY, process.env.GOOGLE_PLACES_OUTPUT_FORMAT || "json");

// LUIS service
var myLuisURL= process.env.LUIS_URL;
var recognizer = new builder.LuisRecognizer(myLuisURL);

// OpenWeatherMap servic
weather.setLang('zh_tw');
weather.setUnits('metric');
weather.setAPPID(process.env.OPENWEATHERMAP_KEY);

//=========================================================
// Activity Events
//=========================================================

bot.on('conversationUpdate', function (message) {
    // Check for group conversations
    if (message.address.conversation.isGroup) {
        // Send a hello message when bot is added
        if (message.membersAdded) {
            message.membersAdded.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Hello everyone!");
                    bot.send(reply);
                }
            });
        }

        // Send a goodbye message when bot is removed
        if (message.membersRemoved) {
            message.membersRemoved.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Goodbye");
                    bot.send(reply);
                }
            });
        }
    }
});

bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
            .address(message.address)
            .text("Hello %s... Thanks for adding me. Say 'hello' to see some great demos.", name || 'there');
        bot.send(reply);
    } else {
        // delete their data
    }
});

bot.on('deleteUserData', function (message) {
    // User asked to delete their data
});


//=========================================================
// Bots Middleware
//=========================================================

builder.Middleware.convertSkypeGroupMessages = function() {
    return {
        botbuilder: function (session, next) {
            var message = session.message;
            var address = message.address;
            //console.log(JSON.stringify(address));
            if (address.channelId === "skype" && address.conversation.isGroup) {
                if (message.entities.length > 0) {
                    var content = message.text;
                    message.entities.forEach((entity) => {
                        if (entity.type == "mention") {
                            content = message.text.replace(entity.text, '');
                        }
                    });
                    session.message.text = content.trim();
                }
            }
            next();
        }
    }
};

// convert skype group messages till better times
bot.use(builder.Middleware.convertSkypeGroupMessages());

builder.Middleware.convertFacebookPlaceMessages = function() {
    return {
        botbuilder: function (session, next) {
            var message = session.message;
            var address = message.address;
            if (address.channelId === "facebook") {
                if (message.entities.length > 0) {
                    message.entities.forEach((entity) => {
                        if (entity.type == "Place" && entity.geo && entity.geo.type == "GeoCoordinates") {
                            console.log('geo => %j', entity.geo);
                        }
                    });
                }
            }
            next();
        }
    }
};
//bot.use(builder.Middleware.convertFacebookPlaceMessages());

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 12.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('favorites', '/favorites', { matches: /^(lunch|favorites)/i });
bot.beginDialogAction('setup', '/setLocation', { matches: /^setup/i });
bot.beginDialogAction('suggest', '/suggest', { matches: /^suggest/i });
bot.beginDialogAction('weather', '/weather', { matches: /^weather/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Default values
//=========================================================

var favorites = [
    { place_id:'ChIJZYEp0G6sQjQR36eMZVvdz7s' }, // '排骨飯'
    { place_id:'ChIJTStVq46sQjQRzbIyp3EQa3Q' }, // '周胖子'
    { place_id:'ChIJF22dNnusQjQRLAH1mPaURcQ' }, // '東葉豬腳(港漧)'
    { place_id:'ChIJzRrJaW-sQjQRR5bO8cu1CZc' }, // '濟州豆腐鍋之家'
    { place_id:'ChIJt_iri2WsQjQRPBGHT3nuFtc' }, // '溫州大餛飩'
    { place_id:'ChIJjUwXm26sQjQR7m5vw-drWx8' }, // '小廚櫃'
    { place_id:'ChIJE_PiNHusQjQRmDvK62M_SHk' }, // '阿婧姑麻油雞(港漧)'
    { place_id:'ChIJkc-rNXusQjQRaahdgDUtq-A' }, // '秋家麵疙瘩(港漧)'
    { place_id:'ChIJgcjK7WWsQjQR-YUHbPvHkOk' }, // '江記'
    { place_id:'ChIJ6cR16mWsQjQRqrfDjuRRkic' }, // '麗山餃子館'
    { place_id:'ChIJM_CA62WsQjQRcCzjcrYMI-4' }, // '越南美食'
    { place_id:'ChIJhTzhxm-sQjQRPc_xAdkk3_k' }, // '洲子美食街'
    { place_id:'ChIJPYTgGWWsQjQRPJOWXnjc0b0' }, // '自由廣場'
    { place_id:'ChIJhbuP82WsQjQRDHnYL4faQKc' }, // '珍寶廚房'
    { place_id:'ChIJgaDTXm-sQjQRGb56sBcdikY' }, // '成都抄手'
    { place_id:'ChIJH0yo1m_QDRQRLdX5iHYlgaE' }, // '山西刀切麵'
    { place_id:'ChIJiaCFXm-sQjQRSC34Zi-f6V8' }, // '客家魷魚羹'
];

var priceStr = ['免費', '便宜', '適中', '昂貴', '非常昂貴'];

var defaultReviewerPhoto = '//ssl.gstatic.com/images/branding/product/2x/avatar_square_blue_512dp.png'

//=========================================================
// Helper functions
//=========================================================

function randomIntInc(min, max) {
    var min = Math.ceil(min);
    var max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function googleStaticMapImage (lat, lng) {
    return "https://maps.google.com/maps/api/staticmap?markers="+lat+","+lng+"&size=400x400&zoom=19"
}

function ratingToStars (rating) {
    if (!rating) {
        return '未知';
    }
    rating = Math.round(rating);
    return '★'.repeat(rating)+'☆'.repeat(5-rating);
}

function newPlaceInfoCard (session, place) {
    var loc = place.geometry.location;
    return new builder.HeroCard(session)
        .title(place.name)
        .subtitle('評價: '+ratingToStars(place.rating))
        .text(
            '價位: '+(priceStr[place.price_level]||'未知')+'\n'+
            '地址: '+place.vicinity+'\n'+
            '電話: '+place.formatted_phone_number
        )
        .images([
            builder.CardImage.create(session, googleStaticMapImage(loc.lat, loc.lng))
        ])
        .buttons([
            builder.CardAction.dialogAction(session, 'reviews', place.place_id, '查看評論'),
            builder.CardAction.openUrl(session, place.url, '開啟 Google Map'),
            builder.CardAction.dialogAction(session, 'suggest', '', '下一家')
        ]) ;
}

function sendRandomPlaceInfoCard (session, results) {
    var idx = randomIntInc(0, results.length-1);
    var parameters = {
        placeid: results[idx].place_id,
        language: "zh-TW"
    }
    session.sendTyping();
    places.placeDetailsRequest(parameters, function (error, response) {
        if (error) throw error;
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([newPlaceInfoCard(session, response.result)]);
        session.endDialog(msg);
    });
}

function isSessionInSetup (session) {
    var dialogStack = session.dialogStack();
    builder.Session.popDialogStackEntry(dialogStack);
    if (builder.Session.findDialogStackEntry(dialogStack, "*:/setLocation") >= 0) {
        return true;
    } else {
        return false;
    }
}

function getCoordinates(session) {
    var address = session.message.address;
    if (address.conversation.isGroup) {
        return session.conversationData.coordinates;
    } else {
        return session.userData.coordinates;
    }
}

function setCoordinates(session, coordinates) {
    var address = session.message.address;
    if (address.conversation.isGroup) {
        session.conversationData.coordinates = coordinates;
    } else {
        session.userData.coordinates = coordinates;
    }
}

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', new builder.IntentDialog({recognizers:[recognizer]})
    .matches('Lunch', '/suggest')
    .matches('Hello', '/hello')
    .matches('Chinese', '/chinese')
    .matches('Setup', '/setLocation')
    .matches('Weather', '/weather')
    .matches('Help', '/help')
    .onDefault(function (session) {
        session.endDialog("I'm sorry. I didn't understand, please type 'help' for detailed usage.");
    }));

bot.dialog('/favorites', function (session, args) {
    sendRandomPlaceInfoCard(session, favorites);
});

bot.dialog('/suggest', [
    function (session, args, next) {
        var coordinates = getCoordinates(session);
        if (!coordinates) {
            session.beginDialog('/setLocation');
        } else {
            next({ response: coordinates });
        }
    },
    function (session, results) {
        if (results.response) {
            var parameters = {
                location: results.response,
                types: "restaurant",
                language: "zh-TW"
            };
            session.sendTyping();
            places.radarSearch(parameters, function (error, response) {
                if (error) throw error;
                sendRandomPlaceInfoCard(session, response.results);
            });
        } else {
            session.endDialog();
        }
    }
]);

bot.dialog('/hello', function (session) {
    session.send('Hi 您好 :)');
    session.replaceDialog('/help');
});

bot.dialog('/chinese', function (session) {
    session.endDialog('只是略懂');
});

bot.dialog('/reviews', [
    function (session, args) {
        var parameters = {
            placeid: args.data,
            language: "zh-TW"
        };
        session.sendTyping();
        places.placeDetailsRequest(parameters, function (error, response) {
            var place = response.result;
            var reviews = place.reviews;
            var msg;
            if (reviews) {
                var reviewCards = [];
                reviews.forEach(function (review) {
                    var photo = [];
                    if (!review.profile_photo_url) {
                        review.profile_photo_url = defaultReviewerPhoto;
                    }
                    photo.push(builder.CardImage.create(session,'https:'+review.profile_photo_url));
                    reviewCards.push(new builder.ThumbnailCard(session)
                        .title('評價: '+ratingToStars(review.rating))
                        .subtitle(review.author_name)
                        .text(review.text)
                        .images(photo)
                        .tap(builder.CardAction.openUrl(session, review.author_url))
                    );
                });
                msg = new builder.Message(session)
                    .textFormat(builder.TextFormat.xml)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(reviewCards);
            } else {
                msg = "尚無評論";
            }
            //console.log('reviews => %j', msg.toMessage());
            session.endDialog(msg);
        });
    }
]);
bot.beginDialogAction('reviews', '/reviews');

bot.dialog('/setLocation', [
    function (session, args) {
        if (isSessionInSetup(session)) {
            session.send("請先完成設置")
                .endDialogWithResult({});
        } else if (session.message.source == 'facebook') {
            session.beginDialog('/setLocation/facebook');
        } else {
            session.beginDialog('/setLocation/default');
        }
    },
    function (session, results) {
        if (results.response) {
            setCoordinates(session, results.response);
        }
        session.send('設置'+ (results.response ? '完成' : '失敗'))
            .endDialogWithResult(results);
    }
]);

bot.dialog('/setLocation/facebook', [
    function (session , args, next) {
        var replyMessage = new builder.Message(session)
            .text("請輸入您的位置");
        replyMessage.sourceEvent({
            facebook: {
                quick_replies: [{ content_type:"location" }]
            }
        });
        builder.Prompts.text(session, replyMessage);
    },
    function (session, results) {
        var message = session.message;
        var coordinates;
        if (message.entities && message.entities.length > 0) {
            message.entities.forEach(function (entity) {
                if (entity.type == "Place" && entity.geo) {
                    coordinates = [entity.geo.latitude, entity.geo.longitude];
                }
            });
        }
        session.endDialogWithResult({ response: coordinates });
    }
]);

bot.dialog('/setLocation/default', [
    function (session, args, next) {
        builder.Prompts.text(session, "請輸入您的位置");
    },
    function (session, results, next) {
        var parameters = {
            query: results.response+"",
            language: "zh-TW"
        };
        places.textSearch(parameters, function (error, response) {
            if (error) throw error;
            if (response.results.length > 0) {
                var place = response.results[0];  // always pick the first one
                var loc = place.geometry.location;
                session.dialogData.coordinates = [loc.lat, loc.lng];
                var msg = new builder.Message(session)
                    .textFormat(builder.TextFormat.xml)
                    .attachments([
                        new builder.HeroCard(session)
                        .text("是在這個位置嗎？(y/n)")
                        .images([
                            builder.CardImage.create(session, googleStaticMapImage(loc.lat, loc.lng))
                        ])
                    ]);
                builder.Prompts.confirm(session, msg);
            } else {
                session.send("無法定位你所輸入的位置")
                    .endDialogWithResult({});
            }
        });
    },
    function (session, results) {
        if (results.response) {
            session.endDialogWithResult({ response: session.dialogData.coordinates });
        } else {
            session.send("請提供更精確的位置")
                .endDialogWithResult({});
        }
    }
]);

bot.dialog('/weather', [
    function (session, args, next) {
        var coordinates = getCoordinates(session);
        if (!coordinates) {
            session.beginDialog('/setLocation');
        } else {
            next({ response: coordinates });
        }
    },
    function (session, results) {
        if (results.response) {
            weather.setCoordinate(results.response[0], results.response[1]);
            weather.getAllWeather(function (err, res) {
                if (err) {
                    session.endDialog('無法取得天氣資訊');
                } else {
                    var msg = new builder.Message(session)
                        .textFormat(builder.TextFormat.xml)
                        .attachments([
                            new builder.ThumbnailCard(session)
                            .title(res.weather[0].description+'')
                            .subtitle(res.name)
                            .text(
                                '氣溫: '+res.main.temp+' ℃\n'+
                                '最高溫: '+res.main.temp_max+' ℃\n'+
                                '最低溫: '+res.main.temp_min+' ℃\n'+
                                '溼度: '+res.main.humidity
                            )
                            .images([
                                builder.CardImage.create(session, 'https://openweathermap.org/img/w/'+res.weather[0].icon+'.png')
                            ])
                        ]);
                    session.endDialog(msg);
                }
            });
        } else {
            session.endDialog();
        }
    }
]);

bot.dialog('/help', function(session) {
    session.endDialog("這是一個推薦用餐地點的機器人，目前支援下列指令:\n\n"+
        "  'suggest' 或 '吃什麼' -- 推薦用餐地點\n\n"+
        "  'setup' 或 '設置', -- 設定您目前位置\n\n"+
        "  'help' 或 '求助' -- 顯示本訊息");
});
/* vim: set et sw=4: */
