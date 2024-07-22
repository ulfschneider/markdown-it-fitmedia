const cheerio = require("cheerio");
const sizeOf = require("image-size");

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
      style += "; ";
    }
    style += `aspect-ratio:${width}/${height};`;
  } else {
    style = `aspect-ratio:${width}/${height};`;
  }
  return style;
}

function fitHtmlElements(md, fitMediaOptions) {
  const blockRenderer = md.renderer.rules.html_block;
  const elementRenderer = function (tokens, idx, options, env, self) {
    try {
      let token = tokens[idx];
      let $ = cheerio.load(token.content);
      let elements = $(fitMediaOptions.fitElements.toString());

      if (elements.length) {
        elements.each(function () {
          let width = parseInt($(this).attr("width"));
          let height = parseInt($(this).attr("height"));
          if (width > 0 && height > 0) {
            let style = $(this).attr("style");
            style = styleAspectRatio(style, width, height);
            style += " width:100%; max-width:100%; height:auto;";
            $(this).attr("style", style);
          }
        });
        return $("body").html();
      }
    } catch (err) {
      console.error(`Failure when fitting media element ${err}`);
    }
  };

  md.renderer.rules.html_block = function (tokens, idx, options, env, self) {
    let html = elementRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return blockRenderer(tokens, idx, options, env, self);
    }
  };
}

function fitHtmlImgs(md, fitMediaOptions) {
  const inlineRenderer = md.renderer.rules.html_inline;
  const blockRenderer = md.renderer.rules.html_block;
  const imgRenderer = function (tokens, idx, options, env, self) {
    try {
      let token = tokens[idx];
      let $ = cheerio.load(token.content);
      let imgs = $("img");
      if (imgs.length) {
        imgs.each(function () {
          if (fitMediaOptions.imgLazyLoad) {
            $(this).attr("loading", "lazy");
          }
          if (
            fitMediaOptions.imgDecoding &&
            fitMediaOptions.imgDecoding != "auto"
          ) {
            $(this).attr("decoding", fitMediaOptions.imgDecoding);
          }
          let src = $(this).attr("src");
          if (src) {
            let dimensions = getDimensions(src, fitMediaOptions);
            const height = dimensions.height;
            const width = dimensions.width;
            if (height > 0 && width > 0) {
              let style = $(this).attr("style");
              style = styleAspectRatio(style, width, height);
              $(this).attr("style", style);
              $(this).attr("width", width);
              $(this).attr("height", height);
            }
          }
        });
        return $("body").html();
      }
    } catch (err) {
      console.error(`Failure when adjusting img ${err}`);
    }
  };

  md.renderer.rules.html_inline = function (tokens, idx, options, env, self) {
    let html = imgRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return inlineRenderer(tokens, idx, options, env, self);
    }
  };
  md.renderer.rules.html_block = function (tokens, idx, options, env, self) {
    let html = imgRenderer(tokens, idx, options, env, self);
    if (html) {
      return html;
    } else {
      return blockRenderer(tokens, idx, options, env, self);
    }
  };
}

function fitMarkdownImgs(md, fitMediaOptions) {
  const attr = function (token, key, value) {
    const idx = token.attrIndex(key);
    if (value == undefined) {
      //returning value
      if (idx >= 0) {
        return token.attrs[idx][1];
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
  };

  let defaultRender = md.renderer.rules.image;
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    try {
      let img = tokens[idx];

      if (fitMediaOptions.imgLazyLoad) {
        attr(img, "loading", "lazy");
      }
      if (
        fitMediaOptions.imgDecoding &&
        fitMediaOptions.imgDecoding != "auto"
      ) {
        attr(img, "decoding", fitMediaOptions.imgDecoding);
      }

      let src = attr(img, "src");
      if (src) {
        let dimensions = getDimensions(src, fitMediaOptions);
        const height = dimensions.height;
        const width = dimensions.width;
        if (height > 0 && width > 0) {
          let style = attr(img, "style");
          style = styleAspectRatio(style, width, height);
          attr(img, "style", style);
          attr(img, "width", width);
          attr(img, "height", height);
        }
      }
    } catch (err) {
      console.error(`Failure when adjusting img ${err}`);
    }

    // pass token to default renderer.
    return defaultRender(tokens, idx, options, env, self);
  };
}

function fitImgs(md, fitMediaOptions) {
  fitHtmlImgs(md, fitMediaOptions);
  fitMarkdownImgs(md, fitMediaOptions);
}

const fitMedia = function (md, fitMediaOptions) {
  fitMediaOptions = Object.assign({}, fitMedia.defaults, fitMediaOptions);
  //backwards compatibility
  fitMediaOptions.imgLazyLoad ??= fitMediaOptions.lazyLoad;
  fitMediaOptions.imgDecoding ??= fitMediaOptions.decoding;
  fitMediaOptions.imgSizeHint ??= fitMediaOptions.sizeHint;
  fitImgs(md, fitMediaOptions);
  fitHtmlElements(md, fitMediaOptions);
};

fitMedia.defaults = {
  imgDir: "",
  imgLazyLoad: true,
  imgDecoding: "auto",
  fitElements: ["iframe", "video"],
};

module.exports = fitMedia;
