/*-----------------------------------------------------------------------------
 A bot for lunch decision.

   Author: Dex Chen (chienhua@gmail.com)

 vim: sw=4
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
var places = new GooglePlaces(process.env.GOOGLE_PLACES_API_KEY, process.env.GOOGLE_PLACES_OUTPUT_FORMAT || "json");


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
];

var price_str = ['免費', '便宜', '適中', '昂貴', '非常昂貴'];

function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
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
	.text(
	    '建議今天吃『'+place.name+'』<br/>'+
	    '評價: '+ratingToStars(place.rating)+'<br/>'+
	    '價位: '+(price_str[place.price_level]||'未知')+'<br/>'+
	    '地址: '+place.vicinity+'<br/>'+
	    '電話: '+place.formatted_phone_number
	)
	.images([
	    builder.CardImage.create(session, googleStaticMapImage(loc.lat, loc.lng))
	])
	.buttons([
	    builder.CardAction.dialogAction(session, 'reviews', place.place_id, '查看評論'),
	    builder.CardAction.openUrl(session, place.url, '開啟 Google Map')
	]) ;
}

function sendRandomPlaceInfoCard (session, results) {
    var idx = randomIntInc(0, results.length-1);
    var parameters = {
	placeid: results[idx].place_id,
	language: "zh-TW"
    }
    places.placeDetailsRequest(parameters, function (error, response) {
	var msg = new builder.Message(session)
	    .textFormat(builder.TextFormat.xml)
	    .attachments([newPlaceInfoCard(session, response.result)]);
	session.send(msg);
    });
}

var myLuisURL= process.env.LUIS_URL;
var recognizer = new builder.LuisRecognizer(myLuisURL);

bot.dialog('/', new builder.IntentDialog({recognizers:[recognizer]})
    .matches(/^lunch/i, '/lunch')
    .matches('Lunch', '/lunch')
    .matches('Hello', '/hello')
    .matches('Chinese', '/chinese')
    .onDefault(builder.DialogAction.send("I'm sorry. I didn't understand.")));

bot.dialog('/lunch', function (session, args) {
    var nearby = builder.EntityRecognizer.findEntity(args.entities, 'nearby');
    if (nearby) {
	session.beginDialog('/lunchNearby');
    } else {
	sendRandomPlaceInfoCard(session, favorites);
    }
    session.endDialog();
});

bot.dialog('/lunchNearby', function (session) {
    var parameters = {
	location: [25.0783711, 121.5714316],
	types: "food|restaurant",
	language: "zh-TW"
    };
    places.radarSearch(parameters, function (error, response) {
        if (error) throw error;
	sendRandomPlaceInfoCard(session, response.results);
    });
    session.endDialog();
});

bot.dialog('/hello', function (session) {
    session.endDialog('Hi 您好 :)');
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
	places.placeDetailsRequest(parameters, function (error, response) {
	    var place = response.result;
	    var reviews = place.reviews;
	    var msg;
	    if (reviews) {
		var reviewCards = [];
		reviews.forEach(function (review) {
		    reviewCards.push(new builder.ThumbnailCard(session)
			.text('評價: '+ratingToStars(review.rating)+'<br/><br/>'+
			    '〝'+review.text+'“ -- <i>'+review.author_name+'</i>')
			.images([
			    //builder.CardImage.create(session, 'https:'+review.profile_photo_url)
			])
		    );
		});
		msg = new builder.Message(session)
		    .textFormat(builder.TextFormat.xml)
		    .attachmentLayout(builder.AttachmentLayout.carousel)
		    .attachments(reviewCards);
	    } else {
		msg = "尚無評論";
	    }
	    //console.log(JSON.stringify(msg.toMessage()));
	    session.send(msg);
	});
	session.endDialog();
    }
]);
bot.beginDialogAction('reviews', '/reviews');
