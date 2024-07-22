A markdown-it plugin to set aspect-ratio of responsive images, make images lazy loading, and to make videos responsive. The original idea goes back to [FitVids.js](http://fitvidsjs.com) and the [evolutionary improvements](https://daverupert.com/2023/10/fitvids-has-a-web-component-now/) that were possible because browsers improved.

## Images

Responsive images can create cumulative layout shifts (CLS) when loaded, because it´s difficult to get their height correct when their width is flexible. Check "[Setting Height And Width On Images Is Important Again](https://www.smashingmagazine.com/2020/03/setting-height-width-images-important-again/)" to get a comprehensive view about the problem. The CSS property `aspect-ratio` has now a global availability of 94.32 % and will help solving the CLS problem for responsive images.

The markdown-it-fitmedia plugin will analyze each of your referenced images, determine its dimensions, and set (or expand) the html `style` attribute of the image with the `aspect-ratio` property based on the dimensions of the image. By default, the plugin will also add the `loading="lazy"` html attribute to your images and will set the html attributers `width` and `height` with the correct image dimensions to give the browser a hint of the image size.

Example:

```md
![Image of Spitfire tool](/img/spitfire/spitfire.jpg)
```

will become

```html
<img
  alt="Image of Spitfire tool"
  src="/img/spitfire/spitfire.jpg"
  loading="lazy"
  style="aspect-ratio:750/388;"
  width="750"
  height="388"
/>
```

Also, html in your markdown, like for example

```html
<figure>
  <img alt="" src="/img/spitfire/spitfire.jpg" />
  <figcaption>Image of Spitfire tool</figcaption>
</figure>
```

will be transformed into

```html
<figure>
  <img
    alt=""
    src="/img/spitfire/spitfire.jpg"
    loading="lazy"
    style="aspect-ratio:750/388;"
    width="750"
    height="388"
  />
  <figcaption>Image of Spitfire tool</figcaption>
</figure>
```

## Fitting media

Embedded videos and iframes are not automatically responsive or fluid. They come with a fixed setting for width and height. To make them responsive while keeping aspect ratio, markdown-it-fitmedia will set set (or expand) the `style` attribute of these elements with the `aspect-ratio` property, based on the given width and height. Also added to the `style` will be `width:100%; max-width:100%; height:auto;`.

The clever padding solution that has been used in the passed, as described by Thierry Koblentz in [<cite>Creating Intrinsic Ratios for Video</cite>](https://alistapart.com/article/creating-intrinsic-ratios-for-video/), is no longer required, because browsers improved over time and do support the `aspect-ratio` now well.

> [!IMPORTANT]
> The fitting of media, like described here, can only be performed for elements that have the html attributes `width` and `height` set!

For example, this

```html
<iframe
  src="https://player.vimeo.com/video/304626830"
  width="600"
  height="338"
></iframe>
```

will become

```html
<iframe
  src="https://player.vimeo.com/video/304626830"
  style="aspect-ratio:600/338; width:100%; max-width:100%; height:auto;"
  width="600"
  height="338"
>
</iframe>
```

## Usage

```js
var markdownIt = require("markdown-it");
var markdownItFitMedia = require("markdown-it-fitmedia");

markdownIt({
  html: true,
}).use(markdownItFitMedia, {
  //default options, you can omit these
  imgDir: "",
  imgLazyLoad: true,
  imgDecoding: "auto",
  fitElements: ["iframe", "video"],
});
```

## Configuration

- `imgDir`, default is `''`: Define the directory where images are stored. The given string will be prepended to the `src` path of the images you are using in your markdown to load and analyze an image for dimension detection. Example use case: I´m using this plugin during buildtime for my 11ty powered blog. There I have a source directory and a destination directory for the created site. The source directory is `/content` and images are stored in `/content/img`. During buildtime the images are getting copied into the destination location, where the `/content` part of the path will be removed, so that the resulting images can be referenced in the html with `/img/…`. However, markdow-it-fitmedia needs to access the images in the source directory, therefore, in this case, I´m configuring `imgDir: './content'`.
- `imgLazyLoad` or `lazyLoad`, default is `true`: When `true`, images will receive the html attribute-setting of `loading="lazy"`.
- `imgDecoding` or `decoding`, default is `'auto'`: If other than `auto`, will set the value of the `decoding` html attribute with that value.
- `fitElements`, default is `['iframe', 'video']`: Define the html tags to be fitted (you do not need to have `img` in this list, because images are fitted anyway)
