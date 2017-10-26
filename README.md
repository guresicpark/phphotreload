# phphotreload

## Getting started
`git clone https://github.com/guresicpark/phphotreload`

### Start phphotreload nodejs server
Go to phphotreload server `cd /nodejs_server` and type `npm install`. After that you can start it with `npm start`.

If it fails to start because of missing node, try: `sudo ln -s /usr/bin/nodejs /usr/bin/node`.

But before you start you have to configure `/nodejs_server/config.yml` file:
```yaml
"C:/your_local_repository/your_php_project/src/": # what folder to watch for local file changes
  latency: 400 # how long to wait to reload tab after a file has changed 
  updatealltabs: false # update all tabs related to this local folder
  ignorepaths: 
    - "C:/your_local_repository/your_php_project/src/generated" # this folder please do not watch for local file changes
  extensions: # files with this extensions should be watched
    - php
    - js
    - html
  domains: # associated domains for your local project folder; glob patterns are allowed like test*.mypage.com
    - "mypage.com"
    - "mobile.mypage.org"
  ignoreurls: # what urls should be ignored; glob patterns are allowed like http://mypage2.com/admin/*/sub or http://mypage2.com/admin/**/sub
    - "http://mypage2.com/admin"
  clearpaths: [] # clear files in this folder locally before tab reload begins
  clearurls: # or use a php script to clear your temp files
    - "http://mypage.com/clearcache.php"
"C:/your_local_repository/your_php_project2/source/":
  latency: 600
  updatealltabs: true
  ignorepaths: 
    - "C:/your_local_repository/your_php_project2/source/generated"
  extensions:
    - php
    - js
  domains:
    - "mypage2.com"
    - "mobile.mypage2.org"
  ignoreurls:
    - "http://mypage2.com/admin"
  clearpaths: []
  clearurls:
    - "http://mypage2.com/clearmytempfiles.php"
```

### Install phphotreload Chrome Plugin
Now open Chrome Browser and enable developers mode in Chrome's extensions tab. Then open/load folder `/chrome_extension` as an Chrome extension. Then there should appear a yellow round icon on your browser bar.

This extension should connect immediatley to phphotreload server and the circle should turn green.

Congratulations, you installed phphotreload!
