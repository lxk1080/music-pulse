const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const media = path.join(__dirname, '../public/media');

router.get('/', function(req, res, next) {
  fs.readdir(media, function(err, data) {
    const lists = data.map(item => item.slice(0, item.length - 4)); // 去掉 '.mp3' 后缀
    if (!err) {
      res.render('index', {
        title: 'music pulse',
        musicLists: lists,
      })
    }
  })
});

module.exports = router;
