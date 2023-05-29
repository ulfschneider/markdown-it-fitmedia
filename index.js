const cheerio = require('cheerio');
const sizeOf = require('image-size');

function getDimensions(src, fitMediaOptions) {
  if (fitMediaOptions.imgDir) {
    return sizeOf(`${fitMediaOptions.imgDir}${src}`);
  } else {
    return sizeOf(src);
  }
}

function styleAspectRatio(style, width, height) {
  if (style && !/aspect-ratio/i.test(style)) {
    if (!/;\s*$/.test(style)) {
      style += '; ';
    }
    style += `aspect-ratio:${width}/${height};`;
  } else {
    style = `aspect-ratio:${width}/${height};`;
  }
  return style;
}


function wrapHtmlElements(md, fitMediaOptions) {
  const blockRenderer = md.renderer.rules.html_block;
  const wrapRenderer = function(tokens, idx, options, env, self) {
    try {
      let token = tokens[idx];
      let $ = cheerio.load(token.content);
      let elements = $(fitMediaOptions.fitWrapElements.toString());

      if (elements.length) {
        elements.each(function() {

          let width = parseInt($(this).attr('width'));
          let height = parseInt($(this).attr('height'));
          if (width > 0 && height > 0) {
            $(this).removeAttr('height');
            $(this).removeAttr('width');

            let style = $(this).attr('style');
            if (style) {
              if (!/;\s*$/.test(style)) {
                style += '; ';
              }
              style += 'position:absolute; top:0; left:0; width:100%; height:100%;';
            } else {
              style = 'position:absolute; top:0; left:0; width:100%; height:100%;';
            }
            $(this).attr('style', style);

            const padding = height / width * 100 + '%';
            let wrapperStyle = `position:relative; height:0; padding-bottom:${padding};`;
            if (fitMediaOptions.aspectRatio) {
              wrapperStyle = styleAspectRatio(wrapperStyle, width, height);
            }
            const fitWrapper = $(`<div class="fit-media" style="${wrapperStyle}"></div>`);
            $(this).wrap(fitWrapper);
          }
        });
        return $('body').html();
      }
    } catch (err) {
      console.error(`Failure when fit-wrapping element ${err}`);
    }
  }


  md.renderer.rules.html_block = function(tokens, idx, options, env, self) {
    let html = wrapRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return blockRenderer(tokens, idx, options, env, self);
    }
  }

}


function adjustHtmlImgs(md, fitMediaOptions) {

  const inlineRenderer = md.renderer.rules.html_inline;
  const blockRenderer = md.renderer.rules.html_block;
  const imgRenderer = function(tokens, idx, options, env, self) {
    try {
      let token = tokens[idx];
      let $ = cheerio.load(token.content);
      let imgs = $('img');
      if (imgs.length) {
        imgs.each(function() {
          if (fitMediaOptions.lazyLoad) {
            $(this).attr('loading', 'lazy');
          }
          if (fitMediaOptions.decoding) {
            $(this).attr('decoding', fitMediaOptions.decoding);
          }
          let src = $(this).attr('src');
          if (src) {
            let dimensions = getDimensions(src, fitMediaOptions);
            const height = dimensions.height;
            const width = dimensions.width;
            if (height > 0 && width > 0) {
              if (fitMediaOptions.aspectRatio) {
                let style = $(this).attr('style');
                style = styleAspectRatio(style, width, height);
                $(this).attr('style', style);
              }
              if (fitMediaOptions.imgSizeHint) {
                $(this).attr('width', width);
                $(this).attr('height', height);
              }
            }
          }

        });
        return $('body').html();
      }
    } catch (err) {
      console.error(`Failure when adjusting img ${err}`);
    }
  }

  md.renderer.rules.html_inline = function(tokens, idx, options, env, self) {
    let html = imgRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return inlineRenderer(tokens, idx, options, env, self);
    }
  }
  md.renderer.rules.html_block = function(tokens, idx, options, env, self) {
    let html = imgRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return blockRenderer(tokens, idx, options, env, self);
    }
  }

}


function adjustMarkdownImgs(md, fitMediaOptions) {
  const attr = function(token, key, value) {
    const idx = token.attrIndex(key);
    if (value == undefined) {
      //returning value
      if (idx >= 0) {
        return token.attrs[idx][1]
      } else {
        return null;
      }
    } else {
      //setting value
      if (idx < 0) {
        //new attribute
        token.attrPush([key, value]);
      } else {
        //change existing attribute
        token.attrs[idx][1] = value;
      }
    }
  }

  let defaultRender = md.renderer.rules.image;
  md.renderer.rules.image = function(tokens, idx, options, env, self) {

    try {
      let img = tokens[idx];

      if (fitMediaOptions.lazyLoad) {
        attr(img, 'loading', 'lazy');
      }
      if (fitMediaOptions.decoding) {
        attr(img, 'decoding', fitMediaOptions.decoding);
      }

      let src = attr(img, 'src');
      if (src) {
        let dimensions = getDimensions(src, fitMediaOptions);
        const height = dimensions.height;
        const width = dimensions.width;
        if (height > 0 && width > 0) {
          if (fitMediaOptions.aspectRatio) {
            let style = attr(img, 'style');
            style = styleAspectRatio(style, width, height);
            attr(img, 'style', style);
          }
          if (fitMediaOptions.imgSizeHint) {
            attr(img, 'width', width);
            attr(img, 'height', height);
          }
        }
      }

    } catch (err) {
      console.error(`Failure when adjusting img ${err}`);
    }

    // pass token to default renderer.
    return defaultRender(tokens, idx, options, env, self);
  }
}


function fitWrap(md, fitMediaOptions) {
  wrapHtmlElements(md, fitMediaOptions);
}

function fitImg(md, fitMediaOptions) {
  adjustHtmlImgs(md, fitMediaOptions);
  adjustMarkdownImgs(md, fitMediaOptions);
}


const fitMedia = function(md, fitMediaOptions) {

  fitMediaOptions = Object.assign({}, fitMedia.defaults, fitMediaOptions);
  fitImg(md, fitMediaOptions);
  fitWrap(md, fitMediaOptions);
}

fitMedia.defaults = {
  imgDir: '',
  lazyLoad: true,
  aspectRatio: true,
  imgSizeHint: true,
  decoding: 'auto',
  fitWrapElements: ['iframe', 'video']
}

module.exports = fitMedia;
