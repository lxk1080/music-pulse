/**
 * window.AudioContext -- audio上下文对象，类似于canvas中的getContext()
 * 属性：
 * 1. destination: 所有音频输出聚集地，所有的AudioNode都直接或间接的连接到这里
 * 2. currentTime: AudioContext从创建开始到当前的时间
 * 方法：
 * 1. decodeAudioData(arraybuffer, success, error): 异步解码包含在arraybuffer中的音频数据
 * 2. createBufferSource(): 创建对象，表示内存中的一段音频资源
 *    属性：
 *    1. buffer：要播放的音频数据，子属性：duration：音频资源的时长
 *    2. loop：是否循环
 *    3. onended：播放结束后回调
 *    方法：
 *    1. start/noteOn(when = ac.currentTime, offset = 0, duration = buffer.duration - offset)
 *       参数：何时开始播放、从音频的第几秒开始播放、播放几秒
 *    2. stop/noteOff(when = ac.currentTime)
 *       参数：何时停止播放，注意：停止播放后，原本的 bufferSource 将不再可用，也就是说不能再调用 start 方法
 * 3. createGain()/createGainNode(): 创建改变音频音量的对象，通过改变其 gain 属性下的 value 属性控制音量
 * 4. createAnalyser(): 音频分析对象，能实时的分析音频的频域和时域信息，不会对音频流做任何处理
 *    属性：
 *    1. fftSize：设置大小，用于分析得到频域
 *    2. frequencyBinCount：fft值的一半，实时得到的音频频域的数据个数
 *    方法：
 *    1. getByteFrequencyData(Uint8Array)：复制音频当前的频域数据(数量是frequencyBinCount)到 Uint8Array(8位无符号整型类型化数组)中
 */

function $(domEl) {
  return document.querySelectorAll(domEl);
}

function random(m, n) {
  return Math.floor(Math.random() * (n - m + 1) + m);
}

class Player {
  constructor({currentSong, volume, imageItem}) {
    this.currentSong = currentSong;
    this.volume = volume;
    this.imageItem = imageItem;
    this.source = null;
    this.ac = null;
    this.gainNode = null;
    this.analyser = null;
    this.size = 128; // frequencyBinCount的大小
    this.count = 0; // 解决 load 或 decodeAudioData 未完成时，快速切歌的情况
  }

  setSource(source) {
    this.source = source;
  }

  getSource() {
    return this.source;
  }

  setVolume(value) {
    if (!this.gainNode) return;
    this.gainNode.gain.value = value;
  }

  createAc() {
    // audio上下文对象，类似于canvas中的getContext()
    this.ac = new (window.AudioContext || window.webkitAudioContext)();
  }

  createGainNode(volume) {
    // 创建可以控制音量的对象
    this.gainNode = this.ac[this.ac.createGain ? 'createGain' : 'createGainNode']();
    // 初始化音量
    this.gainNode.gain.value = volume;
    // 连接到音频输出点
    this.gainNode.connect(this.ac.destination);
  }

  createAnalyser() {
    // 创建音频分析对象
    this.analyser = this.ac.createAnalyser();
    this.analyser.fftSize = this.size * 2;
    this.analyser.connect(this.gainNode);
  }

  async playSong(songName) {
    const self = this;

    // 如果在load或decodeAudioData未完成时切歌( n 是局部变量，this.count 是全局的)， n !== this.count
    const n = ++self.count;

    // 播放下一首之前，停止当前播放
    const source = this.getSource();
    source && source[source.stop ? 'stop' : 'noteOff']();

    // 从后台获得歌曲arraybuffer数据
    const url = `/media/${songName}.mp3`;
    const songData = await this.load(url);
    const image = await this.getPicture(songName);

    // 在songData未获得时，可能切歌了，这里判断
    if (n !== self.count) return;

    // arraybuffer解码，参数：arraybuffer、解码成功、解码失败
    self.ac.decodeAudioData(songData, function(buffer) {
      // 在解码未完成时，可能切歌了，这里判断
      if (n !== self.count) return;

      // 创建音频资源对象
      const bufferSource = self.ac.createBufferSource();
      // 得到音频数据
      bufferSource.buffer = buffer;
      // 连接到gainNode，由于gainNode已经连接到了音频输出点，所以bufferSource就不需要再次连接了
      bufferSource.connect(self.analyser);
      // 开始播放
      bufferSource[bufferSource.start ? 'start' : 'noteOn'](0); // 当前时间+0秒后播放

      // 显示封面
      self.showImage(image);

      // 记录当前的source
      self.setSource(bufferSource);

    }, function(err) {
      console.log('decode_error:', err);
    });

    // 可有可无
    return songName;
  }

  load(url) {
    return new Promise((resolve) => {
      xhr.abort();
      xhr.open('GET', url);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.send();
    })
  }

  getPicture(songName) {
    return new Promise((resolve) => {
      xhr.open('GET', `/picture?songName=${songName}`);
      xhr.responseType = 'json';
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.send();
    })
  }

  showImage(image) {
    let base64String = '';
    for (let i = 0; i < image.data.length; i++) {
      base64String += String.fromCharCode(image.data[i]);
    }
    this.imageItem.src = `data:${image.format};base64,${window.btoa(base64String)}`;
    this.imageItem.style.display = 'block';
  }

  visualizer(canvas) {
    const self = this;
    // 创建一个长度为 self.analyser.frequencyBinCount 的 Uint8Array 数组，初始时数组的每个元素都为 0
    const uint8array = new Uint8Array(self.analyser.frequencyBinCount);
    const requestAnimateFrame = requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame;

    function data() {
      // 复制音频当前的频域数据到 uint8array 数组中
      self.analyser.getByteFrequencyData(uint8array);
      // ...
      // console.log(uint8array.length);
      canvas.draw(uint8array);
      requestAnimateFrame(data);
    }
    data();
  }
}

class Canvas {
  constructor({el, width, height, size}) {
    this.el = el;
    this.type = 'column';
    this.caps = new Array(size).fill(0); // 存储每个柱形小帽的高度
    this.dots = []; // type为dot时，每个dot的信息
    this.dotsMode = 'x'; // dot运动模式
    this.size = size; // frequencyBinCount的大小
    this.width = this.el.width = width;
    this.height = this.el.height = height;
    this.ctx = this.el.getContext('2d');

    this.initEvent();
    this.setColumn();
  }

  initEvent() {
    const self = this;
    self.el.addEventListener('click', function() {
      if (self.type !== 'dot') return;
      self.dotsMode = self.dotsMode === 'x' ? 'xy' : 'x';
    })
  }

  setType(type) {
    this.type = type;

    switch (type) {
      case 'column':
        this.setColumn();
        break;
      case 'dot':
        this.createDots();
        break;
    }
  }

  resize({width, height}) {
    this.width = this.el.width = width;
    this.height = this.el.height = height;

    switch (type) {
      case 'column':
        this.setColumn();
        break;
      case 'dot':
        this.createDots();
        break;
    }
  }

  setColumn() {
    const line = this.ctx.createLinearGradient(0, 0, 0, this.height);
    line.addColorStop(0, 'red');
    line.addColorStop(0.5, 'yellow');
    line.addColorStop(1, 'green');
    this.ctx.fillStyle = line;
  }

  createDots() {
    this.dots = [];

    for (let i = 0; i < this.size; i++) {
      const x = random(0, this.width);
      const y = random(0, this.height);
      const dx = random(1, 4);
      const dy = random(1, 4);
      const color = `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, ${random(0, 10)/10})`;

      this.dots.push({x, y, dx, dy, color});
    }
  }

  draw(arr) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.type === 'column') {
      this.drawColumn(arr);

    } else if (this.type === 'dot') {
      this.drawDot(arr);

    } else if (this.type === 'circle') {
      this.drawCircle(arr);

    }
  }

  drawColumn(arr) {
    const ctx = this.ctx;
    const caps = this.caps;
    const len = arr.length;
    const w = parseInt(this.width / len);
    const dw = w * 0.8;
    const capH = dw * 0.6;
    for (let i = 0; i < arr.length; i++) {
      const h = arr[i] / 256 * this.height;
      // 绘制柱状图
      ctx.fillRect(w * i, this.height, dw, -h);
      // 绘制柱状图上面的小帽
      ctx.fillRect(w * i, this.height - caps[i], dw, -capH);
      caps[i] = caps[i] - 5;
      if (caps[i] < 0) {
        caps[i] = 0;
      }
      if (h > 0 && caps[i] < h + 40) {
        caps[i] = h + 40;
      }
      if (caps[i] > this.height) {
        caps[i] = this.height - capH;
      }
    }
  }

  drawDot(arr) {
    const ctx = this.ctx;
    const len = arr.length;
    const measure = Math.min(50, (this.height > this.width ? this.width : this.height) / 10);

    for (let i = 0; i < len; i++) {
      const dot = this.dots[i];
      const {x, y, color} = dot;
      const r = arr[i] / 256 * measure;

      const radial = ctx.createRadialGradient(x, y, 0, x, y, r);
      radial.addColorStop(0, '#ffffff');
      radial.addColorStop(1, color);
      ctx.fillStyle = radial;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 360 * Math.PI / 180, false);
      ctx.closePath();

      ctx.fill();

      // 让 dot 动起来，通过 r 的大小改变运动速度，判断边界，改变其运动方向
      // 速度控制
      dot.dx = dot.dx > 0 ? (r === 0 ? 1 : r/5) : (r === 0 ? -1 : -r/5);
      dot.dy = dot.dy > 0 ? (r === 0 ? 1 : r/5) : (r === 0 ? -1 : -r/5);

      if (this.dotsMode === 'xy') {
        // 1. x,y轴同时运动，并且反弹
        if (x >= this.width || x <= 0) {
          dot.dx = -dot.dx;
        }
        if (y >= this.height || y <= 0) {
          dot.dy = -dot.dy;
        }
        dot.x += dot.dx;
        dot.y += dot.dy;
      } else if (this.dotsMode === 'x') {
        // 2. 仅x轴运动，不反弹
        dot.x += dot.dx;
        dot.x = dot.x > this.width ? 0 : dot.x;
        if (dot.x < 0) {
          dot.dx = -dot.dx;
        }
      }
    }
  }

  drawCircle(arr) {
    const ctx = this.ctx;
    const len = arr.length;
    const deg = Math.PI/180;

    const x = this.width / 2;
    const y = this.height / 2;
    const baseR = 100;
    const minR = 200;

    const angle = 360 / len;
    const size = 6;

    for (let i = 0; i < len; i++) {
      const r = minR + baseR * arr[i] / 256;
      // const color = `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 1)`;

      // 画线
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, i * angle * deg, i * angle * deg, false);
      ctx.closePath();
      // ctx.strokeStyle = color;
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = size;
      ctx.stroke();

      // 以点的形式展现
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r - size, i * angle * deg - 0.01, i * angle * deg + 0.01, false); // 0.01是根据angle的大小计算而来
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 画一个圆盖住不要的线，使中间透明，以放置圆形唱片
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out'; // 全局合成操作, 仅仅显示老图像与新图像没有重叠的部分
    ctx.arc(x, y, minR - size, 0, 360 * deg, false);
    ctx.fill();
    ctx.restore();
  }
}

// ... the logic code starts ...

const xhr = new XMLHttpRequest();
const musicItems = $(".item");
const volumeItem = $('.volume')[0];
const right = $('.right')[0];
const canvasItem = $('.canvas')[0];
const backImgItem = $('.back-img')[0];
const types = $('.type-wrapper li');

const player = new Player({
  currentSong: null,
  volume: volumeItem.value,
  imageItem: backImgItem,
});

const canvas = new Canvas({
  el: canvasItem,
  width: right.clientWidth,
  height: right.clientHeight,
  size: player.size,
});

// 改变canvas样式
for (let i = 0; i < types.length; i++) {
  types[i].addEventListener('click', function() {
    for (let j = 0; j < types.length; j++) {
      types[j].className = '';
    }
    this.className = 'actived';

    canvas.setType(this.dataset.type);
  })
}

// 点击歌曲播放
for (let i = 0; i < musicItems.length; i++) {
  musicItems[i].addEventListener('click', function() {
    for (let j = 0; j < musicItems.length; j++) {
      musicItems[j].className = 'item';
    }
    this.className = 'item actived';

    // 这里，如果用户还没有和页面交互就初始化了一个AudioContext，是不会play的，所以初始化时机写在点击事件里
    if (!player.ac) {
      player.createAc();
      player.createGainNode(volumeItem.value);
      player.createAnalyser();
      player.visualizer(canvas);
    }

    player.playSong(this.title).then((songName) => {
      console.log('当前歌曲:', songName);
    });
  });
}

// 调节音量
['mousemove', 'change'].map((event) => {
  volumeItem.addEventListener(event, function() {
    player.setVolume(this.value);
  });
});

// resize时重置canvas画布的大小
window.addEventListener('resize', function() {
  canvas.resize({
    width: right.clientWidth,
    height: right.clientHeight,
  });
});
