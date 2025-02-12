'use strict';
const debounce = require('./debounce'),
  utils = require('./utils');

function inSelection(state, idx) {
  const [from, to] = [state.cursor.from, state.cursor.pos].sort((a, b) => a - b);
  return from <= idx && idx <= to;
}

function getBlankLines(n) {
  return new Array(n + 1).join('\n');
}

module.exports = class Terminal {

  constructor(term, opts) {
    this.opts = Object.assign({
      status: false,
      selectMarker: '^!',
      alternateScreen: true
    }, opts);
    this.term = term;
    this.viewPort = [];
    if (this.opts.alternateScreen) {
      this.term.fullscreen(true);
    } else {
      this.term(getBlankLines(this.term.height - 1));
    }
    this.term.hideCursor(true);
  }

  addKeyListener(cb) {
    this.term.grabInput();
    this.term.on('key', (key) => {
      cb(this.opts.keyBindings[key], key);
    });
    let oldHeight = this.term.height;
    this.term.on('resize', debounce(() => {
      this.viewPort = [];
      const height = this.term.height;
      if (height > oldHeight) {
        this.term.moveTo(1, height);
        this.term(getBlankLines(height - oldHeight));
        oldHeight = height;
      }
      cb('resize', this.term.height);
    }, 100));
    cb('resize', this.term.height);
  }

  close() {
    if (this.opts.alternateScreen) {
      this.term.fullscreen(false);
    } else {
      this.term.moveTo(1, this.viewPort.length + 1);
      this.term.eraseLine();
    }
    this.term.hideCursor(false);
  }


  _writeLine(line, index) {
    line = utils.trimTo(line, this.term.width);
    if (line[0] === '#' && this.opts.colorBindings)
      line = this.opts.colorBindings["comment"] + line ;
    if (line !== this.viewPort[index]) {
      this._moveTo(index);
      this.term.eraseLine();
      this.term(line);
    }
    this.viewPort[index] = line;
  }

  _moveTo(line) {
    this.term.moveTo(1, line + 1);
  }

  _wrapColors(arr, colors, selected) {
    if (selected && arr[0][0] === "#") return "^!"+arr.join(' ');
    if (!colors[arr[0]]) return arr.join(' ');
    const colorMap = [colors[arr[0]], colors["hash"], colors["message"]];
    if(arr[0] === "pick") arr[0] = arr[0] + "^:  ";
    if(arr[0] === "drop") arr[0] = arr[0] + "^:  ";
    if(arr[0] === "edit") arr[0] = arr[0] + "^:  ";
    if(arr[0] === "fixup") arr[0] = arr[0] + "^: ";

    if (selected) return "^!"+colorMap[0] + arr[0] + '^:' + " " + colorMap[1] + arr[1]  + " " + colorMap[2] + arr[2] + '^:' + " "
    return arr
        .map((txt, idx) => (colorMap[idx] || '') + txt + '^:')
        .join(' ');
  }

  render(state, key, rawKey) {
    const allLines = [];

    state.lines.forEach((line, idx) => {
      const selected = inSelection(state, idx);
      let termStr;
      const message = (line.message || '').replace(/\^/g, '^^');
      if (this.opts.colorBindings) {
        termStr = this._wrapColors([line.action, line.hash, message], this.opts.colorBindings, selected);
        // if(selected)
          // termStr = this._wrapColors([line.action, line.hash, message], this.opts.colorBindings, selected);
          // termStr = "^!"+termStr;
      } else {
        termStr = (selected ? this.opts.selectMarker : '') + [line.action, line.hash, message].filter(line => line).join(' ');
      }
      allLines.push(termStr);
    });
    allLines.push('');
    let emptyLines = 0;
    let extraInfo = state.extraInfo && state.extraInfo(this.opts.keyBindings);
    state.info.forEach((line) => {
      if (line === '#' && extraInfo) {
        emptyLines++;
        if (emptyLines === 2) {
          extraInfo.forEach((line) => {
            allLines.push(line);
          });
        }
      }
      allLines.push(line);
    });
    let offset = 0;
    const pos = Math.max(state.cursor.pos, state.cursor.from) + (this.opts.status ? 1 : 0);
    if (pos >= this.term.height) {
      offset = pos - this.term.height + 1;
    }
    if (this.opts.status) {
      const statusLine = `^+^_Cursor: ${state.cursor.pos} From: ${state.cursor.from} Key: ${key}  Raw key: ${rawKey} Height: ${this.term.height}`;
      allLines.splice(offset, 0, statusLine);
    }
    allLines.slice(offset, this.term.height + offset).forEach((line, index) => {
      this._writeLine(line, index);
    });
    if (key === 'resize') {
      for (let i = this.viewPort.length + 1; i <= this.term.height; i++) {
        this.term.moveTo(1, i);
        this.term.eraseLine();
      }
    }
  }
};
