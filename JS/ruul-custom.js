function initToolbar(window, target) {

    var global = this;
    var document = window.document;
    var byId = document.getElementById.bind(document);
    
    
    // Converter
    
    function Converter(diagonal_in) {
    
        var self = {};
    
        var width_px  = window.screen.width;
        var height_px = window.screen.height;
        var diagonal_px = Math.sqrt(width_px*width_px + height_px*height_px);
        var in_per_px = diagonal_in / diagonal_px;
    
        self.from_px = {
            px: function (px) {
                return Math.round(px);
            },
            in: function (px) {
                return (px * in_per_px).toFixed(2);
            },
            cm: function (px) {
                return (px * in_per_px * 2.54).toFixed(2);
            }
        };
        self.to_px = {
            px: function (px) {
                return Math.round(px);
            },
            in: function (inch) {
                return Math.round(inch / in_per_px);
            },
            cm: function (cm) {
                return Math.round((cm / 2.54) / in_per_px);
            }
        };
        self.setDiagonal = function(diagonal_in) {
          in_per_px = diagonal_in / diagonal_px;
        }
        return self;
    }
    
    var converter = Converter(byId('diagonal').value);
    
    chrome.runtime.sendMessage({
            name: 'getOption', 
            key:  'diagonal'
        }, function (diagonal) {
            byId('diagonal').value = diagonal;
            converter.setDiagonal(diagonal);
        }
    );
    
    // Console
    
    byId('diagonal').oninput = function () {
        converter.setDiagonal(this.value);
        update_console();
        chrome.runtime.sendMessage({
            name: 'setOption', 
            key:  'diagonal',
            value: this.value
        });
    }
    
    document.onwheel = function (e) {
        if (e.target.type == 'number')
            e.target.focus();
    }
    
    var unit = 'px';
    var units = ['px', 'in', 'cm'];
    var steps = { px: 1, in: 0.01, cm: 0.01 }
    
    byId('unit').onclick =  function() {
        units.push(units.shift());
        unit = units[0];
        byId('unit').textContent = unit;
        byId('rulerWidth').step  = steps[unit];
        byId('rulerHeight').step = steps[unit];
        byId('rulerLeft').step   = steps[unit];
        byId('rulerTop').step    = steps[unit];
        update_console();
    }
    
    
    byId('rulerWidth').oninput = 
    byId('rulerHeight').oninput =
    byId('rulerLeft').oninput =
    byId('rulerTop').oninput = function (e) {
        var attr = e.target.id.replace('ruler', '').toLowerCase();
        var value = +e.target.value;
        if (attr == 'left') value += top.pageXOffset;
        if (attr == 'top')  value += top.pageYOffset + getBarHeight();
        target.style[attr] = converter.to_px[unit](value) + 'px';
    }
    
    function update_console() {
        var rect = target.getBoundingClientRect();
        byId('rulerWidth').value  = converter.from_px[unit](rect.width);
        byId('rulerHeight').value = converter.from_px[unit](rect.height);
        byId('rulerLeft').value   = converter.from_px[unit](rect.left); // top.pageXOffset
        byId('rulerTop').value    = converter.from_px[unit](rect.top - getBarHeight()); // top.pageYOffset
    }
    
    function getBarHeight() {
        var ruulbar = global.document.getElementById('ruulbar');
        return ruulbar ? ruulbar.offsetHeight*zoom : 0;
    }
    
    global.document.onscroll = update_console;
    
    update_console()
    
    global.update_console = update_console;
    
    } // end of init()
    
    
    //////////////////////////////////////////
    
    // Insert console frame
    function ruulCustom(message) {
        var isOurMessage = (message && 
                           (message.ruulCustom || message.ruulRemove));
        if (!isOurMessage) 
          return;
    
        var toolbar = document.getElementById('ruulbar')
        if (toolbar) toolbar.parentNode.removeChild(toolbar);
        var custom = document.getElementById('ruul-custom')
        if (custom) custom.parentNode.removeChild(custom);
        document.body.style.marginTop = '';
        if (custom && custom.drag) custom.drag.destroy();
        
        // stop here if there was an old instance 
        // that we've just removed
        if (toolbar || custom || message.ruulRemove) {
            return;
        }
    
        // create new toolbar and box if we got this far
    
        var ruulbar = document.createElement('iframe');
        ruulbar.id = "ruulbar";
        ruulbar.scrolling = "NO";
    
        var ruulBarCss = chrome.extension.getURL('ruulBar.css');
        var html = '<head><link rel="stylesheet" type="text/css" href="'+ ruulBarCss +'"></head>';
        html += '<body>'
        html += '<div id="dimensions2" style="display: inline-block;">'
        html += '<span id="unit">px</span>';
        html += '<label><b>Width</b><input id="rulerWidth" type="number" min="0" step="1" value="813" size="5"  pattern="\d+" /></label>';
        html += '<label><b>Height</b><input id="rulerHeight" type="number" min="0" step="1" value="488" size="5"  pattern="\d+" /></label>'
        html += '<label><b>Left</b><input id="rulerLeft" type="number" min="0" step="1" value="250" size="5"  pattern="\d+" /></label>';
        html += '<label><b>Top</b><input id="rulerTop" type="number" min="0" step="1" value="1173" size="5" pattern="\d+" /></label>';
        html += '</div>'
        html += '<label style="float: right;"><span>Display size?</span> <div id="diagonal-wrapper"><input id="diagonal" value="27"></div></label>';
        html += '</body>';
    
        // add toolbar to document
        document.documentElement.appendChild(ruulbar);
        var ruulbarDocument = ruulbar.contentDocument;
    
        // add stlye
        var ruulStyle = document.getElementById('ruulstyle');
        if (ruulStyle) {
            var css = ruulbarDocument.createElement('style');
            css.innerHTML = document.getElementById('ruulstyle').innerHTML;
            ruulbarDocument.head.appendChild(css);
        }
    
    
        // add content
        ruulbarDocument.body.innerHTML = html;
        function adjustPushDownForZoom() {
            window.zoom = window.getComputedStyle(ruulbar).zoom; // global
            document.body.style.marginTop = (84 * zoom) + 'px';
        }
    
        function adjustToolbarForZoom() {
            if (window.devicePixelRatio < 2) 
                var browserZoom = 1 / window.devicePixelRatio
            else // retina
                var browserZoom = 2 / window.devicePixelRatio;
            ruulbar.style.zoom = browserZoom;
            ruulbarDocument.documentElement.style.zoom = browserZoom;
        }
    
        function onResize() {
            adjustPushDownForZoom();
        }
    
        window.onresize = onResize;
        onResize();
    
        var ruulBox = document.createElement('div');
        ruulBox.className = 'ruul-box';
        ruulBox.id = 'ruul-custom';
        ruulBox.innerHTML = 
        '<div class="ruul-box-controls">' + 
          '<div class="ruul-edge ruul-box-top-edge resizer"></div>' + 
          '<div class="ruul-edge ruul-box-bottom-edge resizer"></div>' + 
          '<div class="ruul-edge ruul-box-left-edge resizer"></div>' + 
          '<div class="ruul-edge ruul-box-right-edge resizer"></div>' + 
          '<div class="ruul-corner ruul-box-top-left-corner resizer"></div>' + 
          '<div class="ruul-corner ruul-box-top-right-corner resizer"></div>' + 
          '<div class="ruul-corner ruul-box-bottom-right-corner resizer"></div>' + 
          '<div class="ruul-corner ruul-box-bottom-left-corner resizer"></div>' + 
        '</div>';
        ruulBox.style.top = (window.pageYOffset + 150) + 'px';
        document.documentElement.appendChild(ruulBox);
    
        var root = document.getElementById('ruul-custom')
        root.drag = Draggable(root);
        root.resize = Resizable(root);
        root.resize.onResizeStart = function() {
            root.drag.cancel();
        }  
    
        initToolbar(ruulbar.contentWindow, root);
    };
    
    chrome.runtime.onMessage.addListener(ruulCustom);
    
    //////////////////////////////////////////
    
    
    function Resizable(target) {
    
        var offsetX, offsetY, clientX, clientY, startPageX, startPageY;
        var style = target.style;
        var top, left, width, height;
        var is_mouse_down = false;
        var did_scroll = false;
    
        var self = {};
    
        function onMouseDown(e) {
            target.style.zIndex = 999999//++stored.ruulzIndex;
            is_mouse_down = true;
            window.addEventListener("mousemove", saveMouseCoordinates, false)
            window.addEventListener("mouseup", onMouseUp, false);
            window.addEventListener("scroll", saveScroll, false);
            var rect = target.getBoundingClientRect();
            scrollX = window.pageXOffset;
            scrollY = window.pageYOffset;
            width  = rect.width;
            height = rect.height;
            top  = rect.top  + scrollY;
            left = rect.left + scrollX;
            offsetX = e.pageX - left; 
            offsetY = e.pageY - top;
            startPageX = e.pageX;
            startPageY = e.pageY;
            e.preventDefault(); // prevent text selection
            saveMouseCoordinates(e);
            requestAnimationFrame(update);
            if (e.target.classList.contains('resizer') &&
                typeof self.onResizeStart == 'function') {
              self.onResizeStart(startPageX, startPageY);
            }
        }
    
        function onMouseUp(e) {
            is_mouse_down = false;
            saveMouseCoordinates(e);
            update(e);
            window.removeEventListener("mousemove", saveMouseCoordinates, false);
            window.removeEventListener("mouseup", onMouseUp, false);
            window.removeEventListener("scroll", saveScroll, false);
        }
    
        function saveMouseCoordinates(e) {
            clientX = e.clientX;
            clientY = e.clientY;
        }
    
        function saveScroll(e) {
            did_scroll = true;
        }
    
        function update(e) {
            if (did_scroll && is_mouse_down) {
                did_scroll = false; 
                scrollX = window.pageXOffset;
                scrollY = window.pageYOffset;
            }
    
            var deltaX = (clientX + scrollX) - startPageX;
            var deltaY = (clientY + scrollY) - startPageY;
    
            if (offsetX <= 40+3 && offsetY <= 40+3) {
                // top left
                style.left   = (left   + deltaX) + 'px';
                style.top    = (top    + deltaY) + 'px';
                style.width  = (width  - deltaX) + 'px';
                style.height = (height - deltaY) + 'px';
            }
            else if (width - offsetX <= 40+3 && offsetY <= 40+3) {
                // top right
                style.top    = (top    + deltaY) + 'px';
                style.width  = (width  + deltaX) + 'px';
                style.height = (height - deltaY) + 'px';
            }
            else if (offsetX <= 40+3 && height - offsetY <= 40+3) {
                // bottom left
                style.left   = (left   + deltaX) + 'px';
                style.width  = (width  - deltaX) + 'px';
                style.height = (height + deltaY) + 'px';
            }
            else if (width - offsetX <= 40+3 && height - offsetY <= 40+3) {
                // bottom right
                style.width  = (width  + deltaX) + 'px';
                style.height = (height + deltaY) + 'px';
            }
            else if (offsetY <= 12) {
                // top edge
                style.top = (top + deltaY) + 'px';
                style.height = (height - deltaY) + 'px';
            }
            else if (height - offsetY <= 12) {
                // bottom edge
                style.height = (height + deltaY) + 'px';
            }
            else if (offsetX <= 12) {
                // left edge
                style.left = (left + deltaX) + 'px';
                style.width  = (width  - deltaX) + 'px';
            }
            else if (width - offsetX <= 12) {
                // right edge
                style.width = (width + deltaX) + 'px';
            }
    
            update_console();
    
            if (is_mouse_down) 
                requestAnimationFrame(update);
            else if (typeof self.onResizeEnd == 'function') 
                self.onResizeEnd(clientX + offsetX, clientY + offsetY);
        }
    
    
    
        style.cursor = "move"; // pointer
        target.addEventListener("mousedown", onMouseDown, false);
    
        return self;
    }
    
    
    // Draggable
    
    function Draggable(target) {
    
        var offsetX, offsetY, clientX, clientY, scrollX, scrollY;
        var style = target.style;
        var is_suspended = false;
        var is_mouse_down = false;
        var did_scroll = false;
    
        var self = {};
    
        function onMouseDown(e) {
            target.style.zIndex = 100//++stored.ruulzIndex;
            is_mouse_down = true;
            window.addEventListener("mousemove", saveMouseCoordinates, false)
            window.addEventListener("mouseup", onMouseUp, false);
            window.addEventListener("scroll", saveScroll, false)
            var rect = target.getBoundingClientRect();
            scrollX = window.pageXOffset;
            scrollY = window.pageYOffset;
            offsetX = e.pageX - (rect.left + scrollX);
            offsetY = e.pageY - (rect.top  + scrollY);
            e.preventDefault(); // prevent text selection
            saveMouseCoordinates(e);
            requestAnimationFrame(update);
        }
    
        function onMouseUp(e) {
            if (e) {
                saveMouseCoordinates(e);
                update(e);
            }
            is_mouse_down = false;
            window.removeEventListener("mousemove", saveMouseCoordinates, false);
            window.removeEventListener("mouseup", onMouseUp, false);
            window.removeEventListener("scroll", saveScroll, false);
        }
    
        function saveMouseCoordinates(e) {
            clientX = e.clientX;
            clientY = e.clientY;
        }
    
        function fireDragEnd(x, y) {
            if (typeof self.onDragEnd == 'function') 
                self.onDragEnd(x, y);
        }
    
        function update(e) {
            if (did_scroll && is_mouse_down) {
                did_scroll = false; 
                scrollX = window.pageXOffset;
                scrollY = window.pageYOffset;
            }
            style.left = (clientX - offsetX + scrollX) + 'px';
            style.top  = (clientY - offsetY + scrollY) + 'px';
            if (is_mouse_down) requestAnimationFrame(update);
            else fireDragEnd(clientX + offsetX, clientY + offsetY);
        }
    
        function saveScroll(e) {
            did_scroll = true;
        }
    
        function onKeyDown(e) {
            if (/input|textarea/i.test(e.target.nodeName))
                return;
            var rect = target.getBoundingClientRect();
            if (e.keyCode == 37) // left
                style.left = (rect.left - 1) + 'px';
            if (e.keyCode == 38) // up
                style.top  = (rect.top  - 1) + 'px';
            if (e.keyCode == 39) // right
                style.left = (rect.left + 1) + 'px';
            if (e.keyCode == 40) // down
                style.top  = (rect.top  + 1) + 'px';
            if (e.keyCode >= 37 && e.keyCode <= 40 )
                e.preventDefault();
            update_console();
        }
    
        function destroy() {
            style.display = "none";
            document.removeEventListener("keydown", onKeyDown, false);
        }
    
        style.cursor = "move"; // pointer
        target.addEventListener("mousedown", onMouseDown, false);
        document.addEventListener("keydown", onKeyDown, false);
    
        self.cancel = onMouseUp;
        self.destroy = destroy;
    
        return self;
    }
    