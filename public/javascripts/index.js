function $(domEl) {
  return document.querySelectorAll(domEl);
}

const items = $('.item');

for (let i = 0; i < items.length; i++) {
  items[i].addEventListener('click', function() {
    for (let j = 0; j < items.length; j++) {
      items[j].className = 'item';
    }
    this.className = 'item actived';

    load(`/media/${this.title}.mp3`);
  });
}

// ...
const ac = new (window.AudioContext || window.webkitAudioContext)();
const xhr = new XMLHttpRequest();

function load(url) {
  xhr.open('GET', url);
  xhr.responseType = 'arrayBuffer';
  xhr.onload = function() {
    // ...
    console.log(xhr);

    ac.decodeAudioData(xhr.response, function(buffer) {
      const bufferSource = ac.createBufferSource();
      bufferSource.buffer = buffer;
      bufferSource.connect(ac.destination);
      bufferSource[bufferSource.start ? 'start' : 'noteOn'](0);
    }, function(err) {
      console.log(err);
    });
  }
  xhr.send();
}

