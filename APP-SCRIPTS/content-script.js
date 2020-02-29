// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly'
/*
import ChromeReload from 'chromereload';
new ChromeReload({
    host: '127.0.0.1',
    port: 35729,
    reconnectTime: 3000 /!* ms *!/
});

*/

/** Globals */
global._ = global._lodash = require('lodash');
global.jQuery = global.$ = require('jquery');
global.cheerio = require('cheerio');
// global.axios = require('axios');
global.checkedImageUrls = [];
global.checkedNonImageUrls = [];
global.docCookies = '';
// import "babel-polyfill";

const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;






var ImageRepository = {

    urlHash: btoa(window.location.href),
    urls: [],
    clear: function () {
        window.checkedImages = [];
        this.urls = [];
        chrome.storage.local.set({
            [this.urlHash]: []
        });
    },


    addImage: function (image) {

        console.info("ImageRepository::addImage called", image, this.isImage(image), this.contains(image.src));

        if (this.isImage(image) && !this.contains(image.src)) {


            window.checkedImages.push(image);
            this.urls.push(image.src);

            console.info("ImageRepository::Add", image);
            console.info("this.urls", this.urls);

            let uniqueStorageItem = {
                [this.urlHash]: this.urls
            };

            chrome.storage.local.set(uniqueStorageItem);
            console.log("setting", uniqueStorageItem);

        }
    },

    add: function (url) {

        if (this.urls.indexOf(url) > -1) {
            return;
        }

        this.urls.push(url);

        // console.info("ImageRepository::Addurls", url);
        // console.info("this.urls", this.urls);

        let uniqueStorageItem = {
            [this.urlHash]: _lodash.compact(this.urls)
        };

        chrome.storage.local.set(uniqueStorageItem);
        console.log("setting", uniqueStorageItem);

    },

    find: function (src) {
        return _lodash.find(window.checkedImages, {src: src}) || false;
    },

    contains: function (image_src) {
        return this.find(image_src) !== false;
    },

    all: function () {
        return _lodash.uniqBy(window.checkedImages, 'src');
    },

    allUrls: function () {
        return _lodash.compact(_lodash.uniq(this.urls));
    },

    count: function () {
        return this.all().length || 0;
    },

    isImage: function (i) {

        return i.hasOwnProperty('src');
        // return i instanceof HTMLImageElement;
    },

};


const linkSignature = function (url) {

    // remove any query ?id=rrrr

    // console.log("url", {ddd: url});

    // parse the url here
    return /^(https?):\/\//i.test(url.href || "");
};


const extractUrlFromText = function (subject) {

    let myregexp = /\b(?:(?:https?):\/\/)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/i;
    let match = myregexp.exec(subject);

    if (Array.isArray(match)) {
        return match[0];
    }

    return null;
};

/**** Extract Images */
const getValidImages = function (isCheerio, currentUrl) {


    if (!currentUrl) {
        currentUrl = window.location; // used to resolve urls
    }

    var sources = $("a, img, div, li");

    let ch = cheerio.load(document.body.innerHTML);
    console.log("cheerio, $", Object.prototype.toString.call(ch), Object.prototype.toString.call($), {ch: ch});

    let selector = "div[style*='background'], li[style*='background']";
    let test = ch(selector);
    test = $(selector);

    isCheerio = false;

    // console.log("test:", test.length, $(selector).length);

    let background_urls = _lodash.map(test, (element) => {

        /*   console.log("element is: ", Object.prototype.toString.call(element));
        console.log("element is: ", typeof element);
        console.log("element contains: ", Object.keys(element));
        console.log("element contains: ", element.hasOwnProperty('attribs'));
        console.log("element contains: ", {value: element});*/

        let background_url = null;
        let attributeValue = '';

        if (isCheerio) {
            if (element.hasOwnProperty('attribs')) {
                attributeValue = element.attribs.style || '';
            }
        } else {
            if (element.hasAttribute('style')) {
                attributeValue = element.getAttribute('style') || '';
            }
        }

        background_url = extractUrlFromText(attributeValue);
        if (background_url) {
            return background_url;
        }

    });


    console.log("background_urls", background_urls);


    return [];

    // console.log("Object.prototype()", Object.prototype.toString.call(sources));

    let mapped = _lodash.map(sources, function (domObject) {

        console.log("domObject is: ", Object.prototype.toString.call(sources));
        console.log("domObject contains: ", {value: domObject});

        let url;

        if (domObject.hasAttribute('href')) {
            // url = (object.origin + object.pathname ) || object.getAttribute("href");
            url = domObject.getAttribute("href");
        }

        if (domObject.hasAttribute('src')) {
            url = domObject.currentSrc || domObject.getAttribute("src");
        }


        if (domObject.tagName.toLowerCase() === "div" || domObject.tagName.toLowerCase() === "li") {

            let bgImage = domObject.style.backgroundImage || domObject.style.background || "---";


            let myregexp = /url\(["'']?([^"']+)["'']?\)/im;
            let match = myregexp.exec(bgImage);
            if (match != null) {
                url = match[1].trim();
            }


        }


        // console.log("wi", window.location);
        // convert so i can resolve relative urls.
        if (url) {
            url = new URL(url, window.location);

            // send to generic signature. Allow user to overide this.
            if (linkSignature(url)) {
                return url;
            }


        }


        return false;
        // return _lodash.pick(object, ['id', 'name']);
    });


    return _lodash.compact(_lodash.uniqBy(mapped, 'href'));

};


var Extractors = {

    load(useCheerio, html, currentUrl) {

        if (!currentUrl) {
            currentUrl = window.location.href; // used to resolve urls
        }

        // var sources = $("a, img, div, li");

        var isCheerio = false;
        var $root;

        if (useCheerio && typeof html === 'string') {
            $root = cheerio.load(html);
            isCheerio = true;
        } else {
            $root = $;
        }

        console.warn("Is Cheerio?", isCheerio);
// console.log("cheerio, $", Object.prototype.toString.call(ch), Object.prototype.toString.call($), { ch: ch });
        return {
            $root: $root,
            isCheerio: isCheerio,
            base: currentUrl
        };

    },

    extractCurrentLinks() {
        return _lodash.compact(_lodash.uniqBy(_lodash.each(document.links, x => {
            return this.asUrl(x.href);
        }), 'href'));

    },

    extractPotentialImageSources(useCheerio, html, currentUrl, onlyValidImageExtensions = false) {

        let all = {
            backgroundImageUrls: this.getBackgroundImageUrls(useCheerio, html, currentUrl),
            links: this.getLinks(useCheerio, html, currentUrl, onlyValidImageExtensions),
            srcs: this.getImageUrls(useCheerio, html, currentUrl)
        };

        let values = _lodash.concat(all.backgroundImageUrls, all.links, all.srcs);
        values = _lodash.compact(_lodash.uniqBy(values, 'href'));

        values = values.map(o => new URL(o.href));
        console.log("values", values);

        return values;

    },


    getLinks(useCheerio, html, currentUrl, onlyValidImageExtensions = false) {

        var load = this.load(useCheerio, html, currentUrl);

        var isCheerio = load.isCheerio;
        var $root = load.$root;


        let selector = "a[href]";

        if (onlyValidImageExtensions === true) {
            selector = "a[href*='.png'], a[href*='.jpg'], a[href*='.gif'], a[href*='.jpeg'], a[href*='.webp']"
        }


        let results = $root(selector);

        return _lodash.map(results, (element) => {


            let validChilds = $root(element).find('div, img, li, ul');
            // console.log("validChilds", validChilds.length || "NOTHING !!!!");
            if (!validChilds || !validChilds.length) {
                return;
            }


            let url = '';
            if (isCheerio) {
                if (element.hasOwnProperty('attribs')) {


                    url = element.attribs.href || null;
                }
            } else {
                if (element.hasAttribute('href')) {


                    url = element.getAttribute('href') || null;
                }
            }


            if (url) {
                return this.asUrl(url, load.base);
            }

        });

    },

    getImageUrls(useCheerio, html, currentUrl) {


        var load = this.load(useCheerio, html, currentUrl);

        var isCheerio = load.isCheerio;
        var $root = load.$root;

        let selector = "img[src]";
        let results = $root(selector);

        return _lodash.map(results, (element) => {
            let url = '';
            if (isCheerio) {
                if (element.hasOwnProperty('attribs')) {
                    url = element.attribs.src || null;
                }
            } else {
                if (element.hasAttribute('src')) {
                    url = element.getAttribute('src') || null;
                }
            }

            if (url) {
                return this.asUrl(url, load.base);
            }

        });

    },

    getBackgroundImageUrls(useCheerio, html, currentUrl) {

        let load = this.load(useCheerio, html, currentUrl);

        var isCheerio = load.isCheerio;
        var $root = load.$root;


        let selector = "div[style*='background'], li[style*='background']";
        let results = $root(selector);

        let background_urls = _lodash.map(results, (element) => {

            let attributeValue = '';

            if (isCheerio) {
                if (element.hasOwnProperty('attribs')) {
                    attributeValue = element.attribs.style || '';
                }
            } else {
                if (element.hasAttribute('style')) {
                    attributeValue = element.getAttribute('style') || '';
                }
            }

            let background_url = this.extract_absolute_url_from_text(attributeValue);


            if (background_url) {
                return this.asUrl(background_url);
            }

        });

        return background_urls;

    },

    asUrl(url, base) {

        if (/javascript:/i.test(url)) {
            return null;
        }


        try {
            return new URL(url, base);
        } catch (e) {

        }

        return null;
    },

    isImageUrl(url) {
        return /\.(?:jpg|png|gif|jpeg|webm)/im.test(url.pathname || url);
    },

    /*** Helpers */
    extract_absolute_url_from_text(subject) {

        let myregexp = /\b(?:(?:https?):\/\/)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/i;
        let match = myregexp.exec(subject);

        if (Array.isArray(match)) {
            return match[0];
        }

        return null;
    },
};


const downloadImage = function (imageUrl) {
    return new Promise(function (resolve, reject) {

        var img = new Image();

        img.addEventListener('load', () => {
            resolve(img);
        });

        img.addEventListener('error', () => {
            resolve(null);
        });

        img.src = imageUrl;
    });
};

const isWithinDimensions = function (image, minHeight, minWidth) {

    if (!image) {
        return false;
    }

    let h = image.naturalHeight || image.height;
    let w = image.naturalWidth || image.width;

    return ( (h >= minHeight) || ( w >= minWidth)) || false;
};


const downloadUrl = function (imageUrl) {

    return new Promise(function (resolve, reject) {

        // var obj = new HTMLObjectElement();
        // var objw = new HTMLObjectElement();

        if (!imageUrl) {
            resolve(null);
        }

        if (!imageUrl.host) {
            imageUrl = new URL(imageUrl, window.location.href);
        }

        let sandbox = 'allow-scripts';
        if (imageUrl.host === window.location.host) {
            sandbox = sandbox + ' allow-same-origin';
        }

        // https://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/#play-in-your-sandbox
        var obj = document.createElement('iframe');

        console.log("sandbox", sandbox);

        obj.sandbox = sandbox;
        obj.width = 0;
        obj.height = 0;

        obj.addEventListener('load', () => {

            try {
                if (!obj || !obj.contentDocument) {
                    console.log("Error-contentDocument-->", imageUrl);
                    resolve(null);
                }

                resolve(obj.contentDocument.body.innerHTML || null);
                // resolve(obj.contentDocument.images || null);
                // resolve(obj.contentDocument.links || null);

            } catch (e) {
                resolve(null);
            }

            /* console.log('obj', obj.contentDocument.body.innerHTML);
             console.log('obj.images', obj.contentDocument.images);
             console.log('obj.links', obj.contentDocument.links);*/

        });

        obj.addEventListener('error', () => {
            resolve(null);
        });

        obj.src = imageUrl.href;

        document.body.appendChild(obj);


    });
};

const downloadUrlImages = function (imageUrl) {


    return new Promise((resolve, reject) => {

        // var obj = new HTMLObjectElement();
        // var objw = new HTMLObjectElement();

        if (!imageUrl) {
            resolve(null);
        }

        if (!imageUrl.host) {
            imageUrl = new URL(imageUrl, window.location.href);
        }

        let sandbox = 'allow-scripts';
        if (imageUrl.host === window.location.host) {
            sandbox = sandbox + ' allow-same-origin';
        }

        // https://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/#play-in-your-sandbox
        var obj = document.createElement('iframe');

        // console.log("sandbox", sandbox);

        obj.sandbox = sandbox;
        obj.width = 0;
        obj.height = 0;

        obj.addEventListener('load', () => {

            try {
                if (!obj || !obj.contentDocument) {
                    // console.log("Error-contentDocument-->", imageUrl);
                    resolve(null);
                }


                let data = obj.contentDocument || null;

                // console.log("received", data);
                document.body.removeChild(obj);

                resolve(data);
                // resolve(obj.contentDocument.links || null);

            } catch (e) {
                console.log("e", e);
                document.body.removeChild(obj);
                resolve(null);
            }

            /* console.log('obj', obj.contentDocument.body.innerHTML);
             console.log('obj.images', obj.contentDocument.images);
             console.log('obj.links', obj.contentDocument.links);*/

        });

        obj.addEventListener('error', () => {
            document.body.removeChild(obj);
            resolve(null);
        });

        obj.src = imageUrl.href;

        // console.log("appendChildFrame", imageUrl.href);
        document.body.appendChild(obj);


    });
};


function poolRequests(urlBatches, contentDocumentHandler) {

    let currentBatch = urlBatches.shift();

    let promiseGenerator = function* (currentBatch) {
        for (let url of currentBatch) {
            yield downloadUrlImages(url);
        }
    };

    Promise.all(promiseGenerator(currentBatch)).then(responses => {

        // for (let images of responses) {
        //     if (images) {
        //         for (let img of images) {
        //             if (isWithinDimensions(img, MIN_HEIGHT, MIN_WIDTH)) {
        //
        //                 ImageRepository.add(img.src);
        //             }
        //         }
        //     }
        // }

        for (let response of responses) {
            contentDocumentHandler(response);
        }


        if (urlBatches.length > 0) {
            poolRequests(urlBatches, contentDocumentHandler);
        } else {
            // clean up.
            // console.profileEnd();
        }
    });
}

function poolRequests2(urlBatches) {

    console.profile('poolRequests - regular version');
    let currentBatch = urlBatches.shift();
    let urlBatchPromises = [];

    _lodash.each(currentBatch, (url) => {
        urlBatchPromises.push(downloadUrlImages(url));
    });

    Promise.all(urlBatchPromises).then(responses => {
        _lodash.each(responses, (images) => {
            if (images) {
                _lodash.each(images, (img) => {
                    if (isWithinDimensions(img, MIN_HEIGHT, MIN_WIDTH)) {
                        console.info("Sliding Image >>.. ", img.src);
                        ImageRepository.add(img.src);
                    }
                });
            }
        });
        if (urlBatches.length > 0) {
            poolRequests(urlBatches);
        } else {
            // clean up.
            console.profileEnd();
        }
    });
}

// todo - run extract basic on load. but only use it to fill potential image #... ImageRepository.allUrls + potentialImageSources


/**
 *@returns {array.URL}
 */
const getPotentialImageSources = function () {

    let potentialImageSources = [];
    let links = Extractors.extractCurrentLinks();

    potentialImageSources = Extractors.extractPotentialImageSources(false, null, window.location);

    links.forEach((link) => {
        potentialImageSources.push(new URL(link.href));
    });

    console.log("potentialImageSources", potentialImageSources.length);
    let previously_scraped_urls = ImageRepository.allUrls();

    return potentialImageSources.filter((x) => {
        return previously_scraped_urls.indexOf(x.href) < 0
    });

};

if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function (callback, type, quality) {

            var binStr = atob(this.toDataURL(type, quality).split(',')[1]),
                len = binStr.length,
                arr = new Uint8Array(len);

            for (var i = 0; i < len; i++) {
                arr[i] = binStr.charCodeAt(i);
            }

            callback(new Blob([arr], {type: type || 'image/png'}));
        }
    });
}

const imgToBlobUrl = function (img) {

    let canvas = document.createElement('canvas');
    let mimeType = 'image/png';
    let ctx = canvas.getContext('2d');
    // match size of image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    img.crossOrigin = "Anonymous";
    console.log("img", {img: img});
    // Copy the image contents to the canvas
    ctx.drawImage(img, 0, 0);


    let binStr = atob(canvas.toDataURL(mimeType, 1).split(',')[1]),
        len = binStr.length,
        arr = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }

    let blob = new Blob([arr], {type: type || 'image/png'});

    let objectURl = URL.createObjectURL(blob);

    console.log("objectURl", objectURl);

    // image/png', 1.0
};

const isGoogleImages = function () {
    return hostHas("google.com");
};

const hostHas = function (str) {
    return window.location.hostname.indexOf(str) > -1;
};

const urlHas = function (hostNeedle, pathNeedle) {
    return `${window.location.hostname}`.indexOf(hostNeedle) > -1 && `${window.location.pathname}`.indexOf(pathNeedle) > -1;
};


const extractImages = function (useSpider, runDownloadModule) {

    // useSpider = false;
    if (useSpider === true) {
        console.warn("Starting deep search...", useSpider);
    }
    // useSpider = false;
    let potentialImageSources = getPotentialImageSources();
    let [untested_image_urls, untested_regular_urls] = _lodash.partition(potentialImageSources, o => Extractors.isImageUrl(o));

    console.log("untested_image_urls", untested_image_urls.length);
    console.log("untested_regular_urls", untested_regular_urls.length);


    untested_regular_urls = _lodash.uniqBy(untested_regular_urls, 'href');

    let sources_counter = untested_image_urls.length || 0;

    /*** Level #1 Links */
    if (hostHas('google.com')) {

        untested_regular_urls = [];
        untested_image_urls = [];
        // skip the downloads and send to player immediately.
        [...document.links]
            .filter(link => (link.pathname === '/imgres' ))
            .forEach(link => {
                let url = new URL(link.href || '');
                if (url && url.searchParams.has('imgurl')) {
                    untested_image_urls.push(url.searchParams.get('imgurl'));
                }
            });

    }


    // Level #2
    if (urlHas('pornhub.com', 'album')) {
        useSpider = true;
        untested_image_urls = [];
        untested_regular_urls = untested_regular_urls.filter(url => url.pathname.indexOf('photo') > -1);
    } else if (hostHas('pornhub.com')) {
        useSpider = true;
        untested_image_urls = [];
        untested_regular_urls = untested_regular_urls.filter(url => url.pathname.indexOf('album') > -1);
    }

    if (runDownloadModule) {
        downloadImages(untested_image_urls, untested_regular_urls, useSpider);
    } else {
        return untested_image_urls.length || 0;

    }

};


const downloadImages = function (untested_image_urls, untested_regular_urls, useSpider) {


    if (hostHas('google.com')) {

        useSpider = false;
        /*** Image Links Level 1. */
        _lodash.each(untested_image_urls, (url) => {
            ImageRepository.add(url);
        });

        return;

    }


    /*** Image Links Level 1. */
    _lodash.each(untested_image_urls, (url) => {
        downloadImage(url.href).then((validImage) => {
            if (isWithinDimensions(validImage, MIN_HEIGHT, MIN_WIDTH)) {
                ImageRepository.add(validImage.src);
            }
        });
    });


    if (useSpider) {
        untested_regular_urls = _lodash.compact(_lodash.uniqBy(untested_regular_urls, 'href'));
        // untested_regular_urls = untested_regular_urls.slice(0, 10);


        console.warn("nonImageUrlsToDownload", untested_regular_urls.length);
        let urlBatches = _lodash.chunk(untested_regular_urls, 5);


        let PornHub_ContentDocumentHandler = function (doc) {

            // check if level 1 or 2....


            console.log("PornHub_ContentDocumentHandler");
            if (!doc || !doc.images) {
                return;
            }

            let root = doc.getElementById('photoImageSection');

            if (!root) {
                console.warn("#photoImageSection missing", doc);
                return;
            }

            let imgs = doc.getElementById('photoImageSection').querySelectorAll('img');


            return [...imgs]
                .map(o => {
                    if (o.src.indexOf('pics/albums') > -1) {
                        console.info("Sliding Pornhub Image >>.. ", o.currentSrc || o.src);
                        ImageRepository.add(o.currentSrc || o.src);
                        return o.currentSrc || o.src;
                    }
                });
        };


        let GoogleContentDocumentHandler = function (doc) {


        };

        let RegularContentDocumentHandler = function (doc) {

            if (!doc || !doc.images) {
                return;
            }

            return [...doc.images]
                .map(o => {
                    if (isWithinDimensions(o, MIN_HEIGHT, MIN_WIDTH)) {
                        console.info("Sliding Image >>.. ", o.currentSrc || o.src);
                        ImageRepository.add(o.currentSrc || o.src);
                        return o.currentSrc || o.src;
                    }
                });

            // return a list
        };

        if (isGoogleImages()) {
            console.log("poolRequests isGoogleImages");
            poolRequests(urlBatches, GoogleContentDocumentHandler);

        } else if (hostHas('pornhub.com')) {
            console.log("poolRequests pornhub");
            poolRequests(urlBatches, PornHub_ContentDocumentHandler);
        } else {
            console.log("poolRequests Regular");
            poolRequests(urlBatches, RegularContentDocumentHandler);
        }

    }


};

//
// var PoolPromises = {
//
//     let urlBatches = _lodash.chunk(nonImageUrlsToDownload, 5);
//     poolRequests(urlBatches);
//
//     poolRequests(urlBatches) {
//
//         let currentBatch = urlBatches.shift();
//         let urlBatchPromises = [];
//
//         _lodash.each(currentBatch, (url) => {
//             console.log("Downloading:", url);
//             urlBatchPromises.push(downloadUrlImages(url));
//         });
//
//         Promise.all(urlBatchPromises).then(responses => {
//             // console.log("responses", responses);
//
//             _lodash.each(responses, (images) => {
//                 if (images) {
//                     // response => images[]
//                     _lodash.each(images, (img) => {
//                         if (isWithinDimensions(img, MIN_HEIGHT, MIN_WIDTH)) {
//                             console.info("Sliding Image >>.. ", img.src);
//                             ImageRepository.add(img.src);
//                         }
//                     });
//                 }
//             });
//
//
//             if (urlBatches.length > 0) {
//                 poolRequests(urlBatches);
//             }
//
//         });
//
//
//     },
//
//
// };



const openSlider = function () {
    // Build a special url to identify the storage item the slider needs to peruse.
    let url_hash = btoa(window.location.href);
    let urls = ImageRepository.allUrls();
    let uniqueStorageItem = {
        [url_hash]: urls
    };


    chrome.storage.local.set(uniqueStorageItem);

    var url = chrome.runtime.getURL('resources/sliders/slide-template-1.html').toString() + '#' + url_hash;
    $("<a>").attr("href", url).attr("target", "_blank_" + url_hash)[0].click();
};


$(document).ready(function () {

    /*** Watch for changes to the document and fire a method. */

    let watcher = function (mutations) {

        let counter = extractImages(false, false);

        c.sendMessage('background:main', {
            msg: counter
        }).then((response) => {
            console.log(response);
        });
    };

    var throttled = _lodash.throttle(watcher, 2000, {'trailing': true, 'leading': false});
    var mutationObserver = new MutationObserver(throttled);
    mutationObserver.observe(document.documentElement, {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: false
    });

    // global.docCookies = document.cookie;


});


/* ---------------------------------------------- */
/* Init connections in desired extension part     */
/* (BACKGROUND, CONTENT_SCRIPT, POPUP, DEVTOOL)   */
/* ---------------------------------------------- */
const Messenger = require('chrome-ext-messenger');
let messenger = new Messenger();

let messageHandler = (msg, from, sender, sendResponse) => {

    console.log(
        "msg, from, sender, sendResponse",
        msg, from, sender, sendResponse
    );

    if (msg.cmd === 'clear') {
        ImageRepository.clear();
        location.reload();
    }

    if (msg.cmd === 'scrape-basic') {
        extractImages(false, true);
        openSlider();
    }

    if (msg.cmd === 'scrape-deep') {
        extractImages(true, true);
        openSlider();
    }

    if (msg.cmd === 'popup-loaded') {
        sendResponse({
            url: window.location,
            allowDeep: false,
            btnText: "Read Pornhub Gallery",
        });
    }

    if (msg.cmd === 'setTransitionDuration') {
        // msg.value
        chrome.storage.local.set({
            'faTransitionDuration': parseInt(msg.value) || 1500
        });

        console.log("setTransitionDuration", msg);

    }





};


chrome.runtime.onMessage.addListener(
     (request, sender, sendResponse) => {

        console.log("request", request);
        if(request.cmd){
            if (request.cmd === "scrape-basic"){
                extractImages(false, true);
                openSlider();
            }

            if (request.cmd === "scrape-deep"){
                extractImages(true, true);
                openSlider();
            }

            if (request.cmd === "update-height"){
                // todo - update
            }

            if (request.cmd === "update-width"){
                // todo - update
            }

        }


    }
);

var c = messenger.initConnection('main', messageHandler);





// WEBPACK FOOTER //
// ./app/scripts/contentscript.js