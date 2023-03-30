const WEBHOOK_URL = "WEBHOOK_URL_AFTER_DEPLOYMENT";

const BOT_TOKEN = 'BOT_TOKEN_GENERATED_BY_BOT_FATHER';
const API_TOKEN = 'API_TOKEN_FROM_OPENAI';

const sheet = SpreadsheetApp.openById("MY_SHEET_ID").getSheetByName("Logs");

const isServiceAvailable = true;
const DEV_CHAT_ID = '1493956826';

const OPENAI_MODELS = ['gpt-3.5-turbo', 'text-davinci-003', 'text-curie-001', 'text-babbage-001', 'text-babbage-001'];

function doPost(e) {
  if (e.postData.type == "application/json") {
    var update = JSON.parse(e.postData.contents);
    if (update) {
      if (new Date().getTime() - new Date(update.message.date * 1000) > 59000) return 1;
      if (isServiceAvailable) {
        if ('/' === update.message.text.charAt(0)) handleCommand(update);
        else handleNonCommand(update);
      } else replyToSender(update.message.from.id, "Service currently unavailable!");
      saveRequest(update);
    }
  }
  return 1;
}

function handleCommand(update) {
  var reply = "Invalid command!";
  if (update.message.text == "/start")
    return replyToSender(update.message.from.id, "Hello there, how can I help you?");
  return replyToMessage(update.message.from.id, reply, update.message.message_id);
}

function handleNonCommand(update) {
  var text = update.message.text;

  var watingMsgResponse = replyToMessage(update.message.from.id, "Please wait...", update.message.message_id);
  var message_id = -1;
  var response = false;
  if (watingMsgResponse && watingMsgResponse.ok) {
    message_id = watingMsgResponse.result.message_id;
    response = fetchFromOpenAi(text);
  }
  if (response) {
    if (response.error == undefined || response.error == null) {
      var reply = response.choices[0].message.content;
      return editBotMessage(update.message.from.id, message_id, reply);
    }
  } else {

  }
  return replyToMessage(update.message.from.id, 'Something went wrong!', update.message.message_id);
}

function getUnixTimestamp() {
  return Math.floor((new Date().getTime()) / 1000).toString();
}

function saveRequest(update) {
  var chat = update.message.chat;

  var date = getCurrentDate();
  var chatId = chat.id;
  var name = chat.first_name + ((chat.last_name) ? " " + chat.last_name : "");
  var username = chat.username;
  var message = update.message.text;
  sheet.appendRow([date, chatId, name, username, message]);

  if (chatId != DEV_CHAT_ID) {
    var reply = name + " used this bot.\n\nName: " + name + "\nChat Id: " + chatId + "\nUsername: " + username + "\nMessage: " + message;
    sendMessageToDeveloper(reply);
  }
}

function test() {
  var result = fetchFromOpenAi('Hey');
  Logger.log(result.choices[0].message.content);
}

function fetchFromOpenAi(message) {
  var payload = {
    "model": OPENAI_MODELS[0],
    'messages': [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "system", "content": "Your name is AskMe." },
      { "role": "system", "content": "Md. Naimur Rahman made you. He is a student of class XII of Notre Dame College, Dhaka. His roll number is 12304096." },
      { "role": "user", "content": message }
    ],
    "max_tokens": 1000
  };
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      "Authorization": `Bearer ${API_TOKEN}`
    },
    'payload': JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);

  if (response.getResponseCode() == 200) {
    return JSON.parse(response.getContentText());
  }
  return false;
}

function editBotMessage(chatId, message_id, message) {
  return requestToBot('editMessageText', {
    'chat_id': chatId,
    'text': message,
    'message_id': message_id
  });
}

function requestToBot(method, data) {
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(data)
  };
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/' + method, options);

  if (response.getResponseCode() == 200) {
    return JSON.parse(response.getContentText());
  }
  return false;
}

function replyToMessage(chatId, text, reply_to_message_id) {
  return requestToBot('sendMessage', {
    'chat_id': chatId,
    'text': text,
    reply_to_message_id
  });
}

function replyToMessageMD(chatId, text, reply_to_message_id) {
  return requestToBot('sendMessage', {
    'chat_id': chatId,
    'text': text,
    reply_to_message_id,
    'parse_mode': 'markdown'
  });
}

function replyToSender(chatId, text) {
  return requestToBot('sendMessage', {
    'chat_id': chatId,
    'text': text
  });
}

function replyToSenderMD(chatId, text) {
  return requestToBot('sendMessage', {
    'chat_id': chatId,
    'text': text,
    'parse_mode': 'markdown'
  });
}

function sendMessage() {
  var chatId = '5701954542';

  var text = ``;
  var response = requestToBot('sendMessage', {
    'chat_id': chatId,
    'text': text
  });

  Logger.log(response);
}

function sendMessageToDeveloper(message) {
  requestToBot('sendMessage', {
    'chat_id': DEV_CHAT_ID,
    'text': message
  });
}

function getCurrentDate() {
  var timeZone = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss");
}

function telegramError() {
  var result = requestToBot('getWebhookInfo', {});
  Logger.log(result);
}

function deleteWebhook() {
  var result = requestToBot('deleteWebhook', {
    drop_pending_updates: true
  });
  Logger.log(result);
}

function setWebhook() {
  var result = requestToBot('setWebhook', {
    url: WEBHOOK_URL,
    drop_pending_updates: true,
    max_connections: 10
  });
  Logger.log(result);
}