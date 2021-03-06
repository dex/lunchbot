# LunchBot
Lunch bot based on Microsoft Bot Framework and LUIS

## Requirements
  * Account of [Microsoft Bot Framework](https://dev.botframework.com/)
  * Account of [LUIS](https://www.luis.ai/)
  * Google API key
  * OpenWeatherMap API key

## Supported intents
Currently, we support `Help`, `Setup`, `Weather` and `Lunch` intents. Please add those intents to you [LUIS](https://www.luis.ai/) model and train the model with utterances.

## Environment Variables
The following environment variables must be set correctly.
  * `MICROSOFT_APP_ID` and `MICROSOFT_APP_PASSWD` are used for [Microsoft Bot Framework](https://dev.botframework.com/).
  * `LUIS_URL` is the URL of your published [LUIS](https://www.luis.ai/) application.
  * `GOOGLE_PLACES_API_KEY` is the application key used for [Google Places Web Service API](https://developers.google.com/places/web-service/).
  * `OPENWEATHERMAP_KEY` is the application key used for [OpenWeatherMap API](http://openweathermap.org/api).

Suggest deploying your app to [Azure](https://azure.microsoft.com/), it provides free subscription.

## Demo channels
|Channel|Link|
|-------|----|
|Skype|[![Skype](https://dev.botframework.com/Client/Images/Add-To-Skype-Buttons.png)](https://join.skype.com/bot/02e45d25-e8bb-4d53-88a5-aa9ac58cf8ab)|
|Facebook|[![Facebook](https://facebook.botframework.com/Content/MessageUs.png)](https://www.messenger.com/t/587502338111802)|

### Screenshots
<img src="https://dl.dropboxusercontent.com/u/871027/lunchbot_skype.png" alt="Skype" height="400" width="225">
<img src="https://dl.dropboxusercontent.com/u/871027/lunchbot_facebook.png" alt="Facebook" height="400" width="225">
