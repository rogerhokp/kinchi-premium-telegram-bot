#Kimchi Premium telegram bot

- Upload to WebTask
    - `create wt create ./src/bot.js --secret token={botApiToken}`
- set telegram bot webhook
    - curl -X POST -H "Content-Type: multipart/form-data" -F "url={webTaskUrl}" 'https://api.telegram.org/bot{botApiToken}/setWebhook'

