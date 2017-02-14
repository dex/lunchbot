/*-----------------------------------------------------------------------------
 A bot for lunch decision.

   Author: Dex Chen (chienhua@gmail.com)
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');

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
            let message = session.message;
            let address = message.address;
            if (address.channelId === "skype" && address.conversation.isGroup) {
                if (message.entities.length > 0) {
                    let content = message.text;
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
    '排骨飯', 
    '周胖子', 
    '青葉豬腳(港漧)', 
    '濟州豆腐鍋之家',
    '溫州大餛飩',
    '小廚櫃',
    '阿婧姑麻油雞(港漧)',
    '秋家麵疙瘩(港漧)',
    '洲子美食街',
    '自由廣場',
    '麗山餃子館',
    '越南美食'
];

function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

var myLuisURL= process.env.LUIS_URL;
var recognizer = new builder.LuisRecognizer(myLuisURL);

bot.dialog('/', new builder.IntentDialog({recognizers:[recognizer]})
    .matches(/^lunch/i, '/lunch')
    .matches('Lunch', '/lunch')
    .matches('Hello', '/hello')
    .onDefault(builder.DialogAction.send("I'm sorry. I didn't understand.")));

bot.dialog('/lunch', function (session) {
    var idx = randomIntInc(0, stores.length-1);
    session.endDialog('建議今天吃%s', stores[idx]);
});

bot.dialog('/hello', function (session) {
    session.endDialog('Hi 您好 :)');
});
