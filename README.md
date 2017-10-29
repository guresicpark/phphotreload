# phphotreload

## Getting started
`git clone https://github.com/guresicpark/phphotreload`

### Start phphotreload nodejs server
Go to phphotreload server `cd /nodejs_server` and type `npm install`. You can start the server it with `npm start`. If it fails to start because node js is missing, you can execute in your bash: `sudo ln -s /usr/bin/nodejs /usr/bin/node` and you can try again `npm start`.

But before you start the server you have to update `/nodejs_server/config.yml` configuration file to match your project sources:
```yaml
# config.yml
"C:/your_local_repository/your_php_project/src/": # what folder to watch for local file changes
  latency: 400 # how long to wait to reload tab after a file has changed 
  updatealltabs: false # update all tabs related to this local folder
  ignorepaths: 
    - "C:/your_local_repository/your_php_project/src/generated" # please do not watch this folder for local file changes
    - "C:/your_local_repository/your_php_project/src/out"
    - "C:/your_local_repository/your_php_project/src/img"
  extensions: # files with this extensions should be watched
    - php
    - js
    - html
  domains: # associated domains for your local project folder; wildcard patterns are allowed like test*.mypage.com
    - "mypage.com"
    - "mobile.mypage.org"
  ignoreurls: # what urls should be ignored; wildcard patterns are allowed like http://mypage2.com/admin/*/sub
    - "http://mypage2.com/admin"
    - "http://mypage2.com/backend"
  clearpaths: [] # clear files in this folder locally before tab reload begins
  clearurls: # or use a php script to clear your temp files
    - "http://mypage.com/clearcache.php"
# next entry...
```

### Install phphotreload Chrome plugin
In Chrome browser enable developers mode (in Chrome's extensions tab) and open/load folder `/chrome_extension` as an Chrome extension. There should appear a yellow round icon on the Chrome extension bar, that turns green when connected to node js server.

Congratulations, you installed phphotreload!
