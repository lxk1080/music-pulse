const express = require('express');
const path = require('path');
const fs = require('fs');
const jsmediatags = require('jsmediatags');
const router = express.Router();

const media = path.join(__dirname, '../public/media');

router.get('/', function (req, res) {
  fs.readdir(media, function (err, data) {
    if (!err) {
      const lists = data.map(item => item.slice(0, item.length - 4)); // 去掉 '.mp3' 后缀

      res.render('index', {
        title: 'music pulse',
        musicLists: lists,
      })
    }
  })
});

router.get('/picture', function (req, res) {
  jsmediatags.read(`${media}/${req.query.songName}.mp3`, {
    onSuccess: function (tag) {
      res.send(tag.tags.picture);
    },
    onError: function (error) {
      console.log(':(', error.type, error.info);
    }
  });
});

module.exports = router;
