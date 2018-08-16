const express = require('express');
const path = require('path');
const fs = require('fs');
const jsmediatags = require('jsmediatags');
const router = express.Router();

const media = path.join(__dirname, '../public/media');

router.get('/', function(req, res, next) {
  fs.readdir(media, function(err, data) {
    // ...data
    //for (let i = 0; i < data.length; i++) {
    let image = null;
      jsmediatags.read(`${media}/${data[data.length - 1]}`, {
        onSuccess: function(tag) {
          image = tag.tags.picture;

          const lists = data.map(item => item.slice(0, item.length - 4)); // 去掉 '.mp3' 后缀
          if (!err) {
            res.render('index', {
              title: 'music pulse',
              musicLists: lists,
              image: JSON.stringify(image),
            })
          }

        },
        onError: function(error) {
          console.log(':(', error.type, error.info);
        }
      });
    //}
  })
});

module.exports = router;
