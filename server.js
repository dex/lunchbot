/*-----------------------------------------------------------------------------
 A bot for lunch decision.

   Author: Dex Chen (chienhua@gmail.com)
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var GooglePlaces = require('googleplaces');

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
server.post('/api/messages', connector.listen());

// Google Places service
var places = new GooglePlaces(process.env.GOOGLE_PLACES_API_KEY, process.env.GOOGLE_PLACES_OUTPUT_FORMAT);


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

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 12.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
//bot.beginDialogAction('lunch', '/lunch', { matches: /^lunch/i });

//=========================================================
// Bots Dialogs
//=========================================================

var stores = [ 
    { name:'排骨飯', latitude:25.082071, longitude:121.571479 },
//    '周胖子', 
//    '青葉豬腳(港漧)', 
//    '濟州豆腐鍋之家',
//    '溫州大餛飩',
//    '小廚櫃',
//    '阿婧姑麻油雞(港漧)',
//    '秋家麵疙瘩(港漧)',
//    '洲子美食街',
//    '自由廣場',
//    '麗山餃子館',
//    '越南美食'
];

var price_str = ['免費', '便宜', '適中', '昂貴', '非常昂貴'];

function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

var myLuisURL= process.env.LUIS_URL;
var recognizer = new builder.LuisRecognizer(myLuisURL);

bot.dialog('/', new builder.IntentDialog({recognizers:[recognizer]})
    .matches(/^lunch/i, '/lunch')
    .matches('Lunch', '/lunch')
    .matches('Hello', '/hello')
    .matches('Chinese', '/chinese')
    .onDefault(builder.DialogAction.send("I'm sorry. I didn't understand.")));

bot.dialog('/lunch', function (session) {
    var parameters = {
	location: [25.0783711, 121.5714316],
	types: "food|restaurant",
	language: "zh-TW"
    };
    places.radarSearch(parameters, function (error, response) {
        if (error) throw error;
	var results = response.results;
	var idx = randomIntInc(0, results.length-1);
	var parameters = {
	    placeid: results[idx].place_id,
	    language: "zh-TW"
	}
	places.placeDetailsRequest(parameters, function (error, response) {
	    var target = response.result;
	    var loc = target.geometry.location;
	    var msg = new builder.Message(session)
		.textFormat(builder.TextFormat.xml)
		.attachments([
		    new builder.HeroCard(session)
		    .text(
			'建議今天吃『'+target.name+'』<br/>'+
			'評價: '+(target.rating||'未知')+' 顆星<br/>'+
			'價位: '+(price_str[target.price_level]||'未知')+'<br/>'+
			'地址: '+target.vicinity+'<br/>'+
			'電話: '+target.formatted_phone_number
		    )
		    .images([
			builder.CardImage.create(session, "http://maps.google.com/maps/api/staticmap?markers="+loc.lat+","+loc.lng+"&size=400x400&zoom=19")
		    ])
		]);
	    session.send(msg);
	});
    });
    session.endDialog();
});

bot.dialog('/lunch-old', function (session) {
    var idx = randomIntInc(0, stores.length-1);
    var msg = new builder.Message(session)
	.textFormat(builder.TextFormat.xml)
	.attachments([
	    new builder.HeroCard(session)
	    .text('建議今天吃'+stores[idx].name+'')
	    .images([
		builder.CardImage.create(session, "http://maps.google.com/maps/api/staticmap?markers="+stores[idx].latitude+","+stores[idx].longitude+"&size=400x400&zoom=19")
	    ])
	]);
    session.endDialog(msg);
});

bot.dialog('/hello', function (session) {
    session.endDialog('Hi 您好 :)');
});

bot.dialog('/chinese', function (session) {
    session.endDialog('只是略懂');
});
