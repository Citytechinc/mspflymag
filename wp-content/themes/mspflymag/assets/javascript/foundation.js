'use strict';

window.whatInput = function () {

  'use strict';

  /*
    ---------------
    variables
    ---------------
  */

  // array of actively pressed keys

  var activeKeys = [];

  // cache document.body
  var body;

  // boolean: true if touch buffer timer is running
  var buffer = false;

  // the last used input type
  var currentInput = null;

  // `input` types that don't accept text
  var nonTypingInputs = ['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit'];

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  var mouseWheel = detectWheel();

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  var ignoreMap = [16, // shift
  17, // control
  18, // alt
  91, // Windows key / left Apple cmd
  93 // Windows menu / right Apple cmd
  ];

  // mapping of events to input types
  var inputMap = {
    'keydown': 'keyboard',
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  };

  // add correct mouse wheel event mapping to `inputMap`
  inputMap[detectWheel()] = 'mouse';

  // array of all used input types
  var inputTypes = [];

  // mapping of key codes to a common name
  var keyMap = {
    9: 'tab',
    13: 'enter',
    16: 'shift',
    27: 'esc',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };

  // map of IE 10 pointer events
  var pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  // touch buffer timer
  var timer;

  /*
    ---------------
    functions
    ---------------
  */

  // allows events that are also triggered to be filtered out for `touchstart`
  function eventBuffer() {
    clearTimer();
    setInput(event);

    buffer = true;
    timer = window.setTimeout(function () {
      buffer = false;
    }, 650);
  }

  function bufferedEvent(event) {
    if (!buffer) setInput(event);
  }

  function unBufferedEvent(event) {
    clearTimer();
    setInput(event);
  }

  function clearTimer() {
    window.clearTimeout(timer);
  }

  function setInput(event) {
    var eventKey = key(event);
    var value = inputMap[event.type];
    if (value === 'pointer') value = pointerType(event);

    // don't do anything if the value matches the input type already set
    if (currentInput !== value) {
      var eventTarget = target(event);
      var eventTargetNode = eventTarget.nodeName.toLowerCase();
      var eventTargetType = eventTargetNode === 'input' ? eventTarget.getAttribute('type') : null;

      if ( // only if the user flag to allow typing in form fields isn't set
      !body.hasAttribute('data-whatinput-formtyping') &&

      // only if currentInput has a value
      currentInput &&

      // only if the input is `keyboard`
      value === 'keyboard' &&

      // not if the key is `TAB`
      keyMap[eventKey] !== 'tab' && (

      // only if the target is a form input that accepts text
      eventTargetNode === 'textarea' || eventTargetNode === 'select' || eventTargetNode === 'input' && nonTypingInputs.indexOf(eventTargetType) < 0) ||
      // ignore modifier keys
      ignoreMap.indexOf(eventKey) > -1) {
        // ignore keyboard typing
      } else {
        switchInput(value);
      }
    }

    if (value === 'keyboard') logKeys(eventKey);
  }

  function switchInput(string) {
    currentInput = string;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }

  function key(event) {
    return event.keyCode ? event.keyCode : event.which;
  }

  function target(event) {
    return event.target || event.srcElement;
  }

  function pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType];
    } else {
      return event.pointerType === 'pen' ? 'touch' : event.pointerType; // treat pen like touch
    }
  }

  // keyboard logging
  function logKeys(eventKey) {
    if (activeKeys.indexOf(keyMap[eventKey]) === -1 && keyMap[eventKey]) activeKeys.push(keyMap[eventKey]);
  }

  function unLogKeys(event) {
    var eventKey = key(event);
    var arrayPos = activeKeys.indexOf(keyMap[eventKey]);

    if (arrayPos !== -1) activeKeys.splice(arrayPos, 1);
  }

  function bindEvents() {
    body = document.body;

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      body.addEventListener('pointerdown', bufferedEvent);
      body.addEventListener('pointermove', bufferedEvent);
    } else if (window.MSPointerEvent) {
      body.addEventListener('MSPointerDown', bufferedEvent);
      body.addEventListener('MSPointerMove', bufferedEvent);
    } else {

      // mouse events
      body.addEventListener('mousedown', bufferedEvent);
      body.addEventListener('mousemove', bufferedEvent);

      // touch events
      if ('ontouchstart' in window) {
        body.addEventListener('touchstart', eventBuffer);
      }
    }

    // mouse wheel
    body.addEventListener(mouseWheel, bufferedEvent);

    // keyboard events
    body.addEventListener('keydown', unBufferedEvent);
    body.addEventListener('keyup', unBufferedEvent);
    document.addEventListener('keyup', unLogKeys);
  }

  /*
    ---------------
    utilities
    ---------------
  */

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  function detectWheel() {
    return mouseWheel = 'onwheel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"

    document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
    'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
  }

  /*
    ---------------
    init
     don't start script unless browser cuts the mustard,
    also passes if polyfills are used
    ---------------
  */

  if ('addEventListener' in window && Array.prototype.indexOf) {

    // if the dom is already ready already (script was placed at bottom of <body>)
    if (document.body) {
      bindEvents();

      // otherwise wait for the dom to load (script was placed in the <head>)
    } else {
      document.addEventListener('DOMContentLoaded', bindEvents);
    }
  }

  /*
    ---------------
    api
    ---------------
  */

  return {

    // returns string: the current input type
    ask: function () {
      return currentInput;
    },

    // returns array: currently pressed keys
    keys: function () {
      return activeKeys;
    },

    // returns array: all the detected input types
    types: function () {
      return inputTypes;
    },

    // accepts string: manually set the input type
    set: switchInput
  };
}();
;'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.2.2';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if (/true/.test(str)) return true;else if (/false/.test(str)) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();
      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;
      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    function move(ts) {
      if (!start) start = window.performance.now();
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('a:first').attr('tabindex', 0);

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-expanded': false,
            'aria-label': $item.children('a:first').text()
          });

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'aria-hidden': true,
            'role': 'menu'
          });
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var items = menu.find('li').removeAttr('tabindex'),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('*').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        cb();
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      if (this.complete) {
        singleImageLoaded();
      } else if (typeof this.naturalWidth !== 'undefined' && this.naturalWidth > 0) {
        singleImageLoaded();
      } else {
        $(this).one('load', function () {
          singleImageLoaded();
        });
      }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    triggers($(this), 'toggle');
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).load(function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);
      //trigger the event handler for the element depending on type
      switch ($target.attr("data-events")) {

        case "resize":
          $target.triggerHandler('resizeme.zf.trigger', [$target]);
          break;

        case "scroll":
          $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          break;

        // case "mutate" :
        // console.log('mutate', $target);
        // $target.triggerHandler('mutate.zf.trigger');
        //
        // //make sure we don't get stuck in an infinite loop from sloppy codeing
        // if ($target.index('[data-mutate]') == $("[data-mutate]").length-1) {
        //   domMutationObserver();
        // }
        // break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, (or coming soon mutation) add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: false, characterData: false, subtree: false, attributeFilter: ["data-events"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  var Abide = function () {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Abide(element) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Abide);

      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */


    _createClass(Abide, [{
      key: '_init',
      value: function _init() {
        this.$inputs = this.$element.find('input, textarea, select');

        this._events();
      }

      /**
       * Initializes events for Abide.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        this.$element.off('.abide').on('reset.zf.abide', function () {
          _this2.resetForm();
        }).on('submit.zf.abide', function () {
          return _this2.validateForm();
        });

        if (this.options.validateOn === 'fieldChange') {
          this.$inputs.off('change.zf.abide').on('change.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.liveValidate) {
          this.$inputs.off('input.zf.abide').on('input.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }
      }

      /**
       * Calls necessary functions to update Abide upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        this._init();
      }

      /**
       * Checks whether or not a form element has the required attribute and if it's checked or not
       * @param {Object} element - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'requiredCheck',
      value: function requiredCheck($el) {
        if (!$el.attr('required')) return true;

        var isGood = true;

        switch ($el[0].type) {
          case 'checkbox':
            isGood = $el[0].checked;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            var opt = $el.find('option:selected');
            if (!opt.length || !opt.val()) isGood = false;
            break;

          default:
            if (!$el.val() || !$el.val().length) isGood = false;
        }

        return isGood;
      }

      /**
       * Based on $el, get the first element with selector in this order:
       * 1. The element's direct sibling('s).
       * 3. The element's parent's children.
       *
       * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
       *
       * @param {Object} $el - jQuery object to use as reference to find the form error selector.
       * @returns {Object} jQuery object with the selector.
       */

    }, {
      key: 'findFormError',
      value: function findFormError($el) {
        var $error = $el.siblings(this.options.formErrorSelector);

        if (!$error.length) {
          $error = $el.parent().find(this.options.formErrorSelector);
        }

        return $error;
      }

      /**
       * Get the first element in this order:
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findLabel',
      value: function findLabel($el) {
        var id = $el[0].id;
        var $label = this.$element.find('label[for="' + id + '"]');

        if (!$label.length) {
          return $el.closest('label');
        }

        return $label;
      }

      /**
       * Get the set of labels associated with a set of radio els in this order
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findRadioLabels',
      value: function findRadioLabels($els) {
        var _this3 = this;

        var labels = $els.map(function (i, el) {
          var id = el.id;
          var $label = _this3.$element.find('label[for="' + id + '"]');

          if (!$label.length) {
            $label = $(el).closest('label');
          }
          return $label[0];
        });

        return $(labels);
      }

      /**
       * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
       * @param {Object} $el - jQuery object to add the class to
       */

    }, {
      key: 'addErrorClasses',
      value: function addErrorClasses($el) {
        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.addClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.addClass(this.options.formErrorClass);
        }

        $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
      }

      /**
       * Remove CSS error classes etc from an entire radio button group
       * @param {String} groupName - A string that specifies the name of a radio button group
       *
       */

    }, {
      key: 'removeRadioErrorClasses',
      value: function removeRadioErrorClasses(groupName) {
        var $els = this.$element.find(':radio[name="' + groupName + '"]');
        var $labels = this.findRadioLabels($els);
        var $formErrors = this.findFormError($els);

        if ($labels.length) {
          $labels.removeClass(this.options.labelErrorClass);
        }

        if ($formErrors.length) {
          $formErrors.removeClass(this.options.formErrorClass);
        }

        $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Removes CSS error class as specified by the Abide settings from the label, input, and the form
       * @param {Object} $el - jQuery object to remove the class from
       */

    }, {
      key: 'removeErrorClasses',
      value: function removeErrorClasses($el) {
        // radios need to clear all of the els
        if ($el[0].type == 'radio') {
          return this.removeRadioErrorClasses($el.attr('name'));
        }

        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.removeClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.removeClass(this.options.formErrorClass);
        }

        $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Goes through a form to find inputs and proceeds to validate them in ways specific to their type
       * @fires Abide#invalid
       * @fires Abide#valid
       * @param {Object} element - jQuery object to validate, should be an HTML input
       * @returns {Boolean} goodToGo - If the input is valid or not.
       */

    }, {
      key: 'validateInput',
      value: function validateInput($el) {
        var clearRequire = this.requiredCheck($el),
            validated = false,
            customValidator = true,
            validator = $el.attr('data-validator'),
            equalTo = true;

        // don't validate ignored inputs or hidden inputs
        if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]')) {
          return true;
        }

        switch ($el[0].type) {
          case 'radio':
            validated = this.validateRadio($el.attr('name'));
            break;

          case 'checkbox':
            validated = clearRequire;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            validated = clearRequire;
            break;

          default:
            validated = this.validateText($el);
        }

        if (validator) {
          customValidator = this.matchValidation($el, validator, $el.attr('required'));
        }

        if ($el.attr('data-equalto')) {
          equalTo = this.options.validators.equalTo($el);
        }

        var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
        var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

        this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

        /**
         * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
         * Trigger includes the DOM element of the input.
         * @event Abide#valid
         * @event Abide#invalid
         */
        $el.trigger(message, [$el]);

        return goodToGo;
      }

      /**
       * Goes through a form and if there are any invalid inputs, it will display the form error element
       * @returns {Boolean} noError - true if no errors were detected...
       * @fires Abide#formvalid
       * @fires Abide#forminvalid
       */

    }, {
      key: 'validateForm',
      value: function validateForm() {
        var acc = [];
        var _this = this;

        this.$inputs.each(function () {
          acc.push(_this.validateInput($(this)));
        });

        var noError = acc.indexOf(false) === -1;

        this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

        /**
         * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
         * Trigger includes the element of the form.
         * @event Abide#formvalid
         * @event Abide#forminvalid
         */
        this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

        return noError;
      }

      /**
       * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
       * @param {Object} $el - jQuery object to validate, should be a text input HTML element
       * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
       * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
       */

    }, {
      key: 'validateText',
      value: function validateText($el, pattern) {
        // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
        pattern = pattern || $el.attr('pattern') || $el.attr('type');
        var inputText = $el.val();
        var valid = false;

        if (inputText.length) {
          // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
          if (this.options.patterns.hasOwnProperty(pattern)) {
            valid = this.options.patterns[pattern].test(inputText);
          }
          // If the pattern name isn't also the type attribute of the field, then test it as a regexp
          else if (pattern !== $el.attr('type')) {
              valid = new RegExp(pattern).test(inputText);
            } else {
              valid = true;
            }
        }
        // An empty field is valid if it's not required
        else if (!$el.prop('required')) {
            valid = true;
          }

        return valid;
      }

      /**
       * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
       * @param {String} groupName - A string that specifies the name of a radio button group
       * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
       */

    }, {
      key: 'validateRadio',
      value: function validateRadio(groupName) {
        // If at least one radio in the group has the `required` attribute, the group is considered required
        // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
        var $group = this.$element.find(':radio[name="' + groupName + '"]');
        var valid = false,
            required = false;

        // For the group to be required, at least one radio needs to be required
        $group.each(function (i, e) {
          if ($(e).attr('required')) {
            required = true;
          }
        });
        if (!required) valid = true;

        if (!valid) {
          // For the group to be valid, at least one radio needs to be checked
          $group.each(function (i, e) {
            if ($(e).prop('checked')) {
              valid = true;
            }
          });
        };

        return valid;
      }

      /**
       * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
       * @param {Object} $el - jQuery input element.
       * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
       * @param {Boolean} required - self explanatory?
       * @returns {Boolean} - true if validations passed.
       */

    }, {
      key: 'matchValidation',
      value: function matchValidation($el, validators, required) {
        var _this4 = this;

        required = required ? true : false;

        var clear = validators.split(' ').map(function (v) {
          return _this4.options.validators[v]($el, required, $el.parent());
        });
        return clear.indexOf(false) === -1;
      }

      /**
       * Resets form inputs and styles
       * @fires Abide#formreset
       */

    }, {
      key: 'resetForm',
      value: function resetForm() {
        var $form = this.$element,
            opts = this.options;

        $('.' + opts.labelErrorClass, $form).not('small').removeClass(opts.labelErrorClass);
        $('.' + opts.inputErrorClass, $form).not('small').removeClass(opts.inputErrorClass);
        $(opts.formErrorSelector + '.' + opts.formErrorClass).removeClass(opts.formErrorClass);
        $form.find('[data-abide-error]').css('display', 'none');
        $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
        $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        /**
         * Fires when the form has been reset.
         * @event Abide#formreset
         */
        $form.trigger('formreset.zf.abide', [$form]);
      }

      /**
       * Destroys an instance of Abide.
       * Removes error styles and classes from elements, without resetting their values.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        var _this = this;
        this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

        this.$inputs.off('.abide').each(function () {
          _this.removeErrorClasses($(this));
        });

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Abide;
  }();

  /**
   * Default settings for plugin
   */


  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @example 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @example 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @example 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @example '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @example 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @example false
     */
    liveValidate: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $('#' + el.attr('data-equalto')).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  var Accordion = function () {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    function Accordion(element, options) {
      _classCallCheck(this, Accordion);

      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */


    _createClass(Accordion, [{
      key: '_init',
      value: function _init() {
        this.$element.attr('role', 'tablist');
        this.$tabs = this.$element.children('li, [data-accordion-item]');

        this.$tabs.each(function (idx, el) {
          var $el = $(el),
              $content = $el.children('[data-tab-content]'),
              id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
              linkId = el.id || id + '-label';

          $el.find('a:first').attr({
            'aria-controls': id,
            'role': 'tab',
            'id': linkId,
            'aria-expanded': false,
            'aria-selected': false
          });

          $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
        });
        var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
        if ($initActive.length) {
          this.down($initActive, true);
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the accordion.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$tabs.each(function () {
          var $elem = $(this);
          var $tabContent = $elem.children('[data-tab-content]');
          if ($tabContent.length) {
            $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
              // $(this).children('a').on('click.zf.accordion', function(e) {
              e.preventDefault();
              if ($elem.hasClass('is-active')) {
                if (_this.options.allowAllClosed || $elem.siblings().hasClass('is-active')) {
                  _this.up($tabContent);
                }
              } else {
                _this.down($tabContent);
              }
            }).on('keydown.zf.accordion', function (e) {
              Foundation.Keyboard.handleKey(e, 'Accordion', {
                toggle: function () {
                  _this.toggle($tabContent);
                },
                next: function () {
                  var $a = $elem.next().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                previous: function () {
                  var $a = $elem.prev().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                handled: function () {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            });
          }
        });
      }

      /**
       * Toggles the selected content pane's open/close state.
       * @param {jQuery} $target - jQuery object of the pane to toggle.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if ($target.parent().hasClass('is-active')) {
          if (this.options.allowAllClosed || $target.parent().siblings().hasClass('is-active')) {
            this.up($target);
          } else {
            return;
          }
        } else {
          this.down($target);
        }
      }

      /**
       * Opens the accordion tab defined by `$target`.
       * @param {jQuery} $target - Accordion pane to open.
       * @param {Boolean} firstTime - flag to determine if reflow should happen.
       * @fires Accordion#down
       * @function
       */

    }, {
      key: 'down',
      value: function down($target, firstTime) {
        var _this2 = this;

        if (!this.options.multiExpand && !firstTime) {
          var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
          if ($currentActive.length) {
            this.up($currentActive);
          }
        }

        $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

        $target.slideDown(this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done opening.
           * @event Accordion#down
           */
          _this2.$element.trigger('down.zf.accordion', [$target]);
        });

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': true,
          'aria-selected': true
        });
      }

      /**
       * Closes the tab defined by `$target`.
       * @param {jQuery} $target - Accordion tab to close.
       * @fires Accordion#up
       * @function
       */

    }, {
      key: 'up',
      value: function up($target) {
        var $aunts = $target.parent().siblings(),
            _this = this;
        var canClose = this.options.multiExpand ? $aunts.hasClass('is-active') : $target.parent().hasClass('is-active');

        if (!this.options.allowAllClosed && !canClose) {
          return;
        }

        // Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done collapsing up.
           * @event Accordion#up
           */
          _this.$element.trigger('up.zf.accordion', [$target]);
        });
        // });

        $target.attr('aria-hidden', true).parent().removeClass('is-active');

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': false,
          'aria-selected': false
        });
      }

      /**
       * Destroys an instance of an accordion.
       * @fires Accordion#destroyed
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
        this.$element.find('a').off('.zf.accordion');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Accordion;
  }();

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @example false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @example false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var AccordionMenu = function () {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function AccordionMenu(element, options) {
      _classCallCheck(this, AccordionMenu);

      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */


    _createClass(AccordionMenu, [{
      key: '_init',
      value: function _init() {
        this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
        this.$element.attr({
          'role': 'tablist',
          'aria-multiselectable': this.options.multiOpen
        });

        this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
        this.$menuLinks.each(function () {
          var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
              $elem = $(this),
              $sub = $elem.children('[data-submenu]'),
              subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
              isActive = $sub.hasClass('is-active');
          $elem.attr({
            'aria-controls': subId,
            'aria-expanded': isActive,
            'role': 'tab',
            'id': linkId
          });
          $sub.attr({
            'aria-labelledby': linkId,
            'aria-hidden': !isActive,
            'role': 'tabpanel',
            'id': subId
          });
        });
        var initPanes = this.$element.find('.is-active');
        if (initPanes.length) {
          var _this = this;
          initPanes.each(function () {
            _this.down($(this));
          });
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the menu.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$element.find('li').each(function () {
          var $submenu = $(this).children('[data-submenu]');

          if ($submenu.length) {
            $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
              e.preventDefault();

              _this.toggle($submenu);
            });
          }
        }).on('keydown.zf.accordionmenu', function (e) {
          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement,
              $target = $element.children('[data-submenu]');

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

              if ($(this).children('[data-submenu]:visible').length) {
                // has open sub menu
                $nextElement = $element.find('li:first-child').find('a').first();
              }
              if ($(this).is(':first-child')) {
                // is first element of sub menu
                $prevElement = $element.parents('li').first().find('a').first();
              } else if ($prevElement.children('[data-submenu]:visible').length) {
                // if previous element has open sub menu
                $prevElement = $prevElement.find('li:last-child').find('a').first();
              }
              if ($(this).is(':last-child')) {
                // is last element of sub menu
                $nextElement = $element.parents('li').first().next('li').find('a').first();
              }

              return;
            }
          });
          Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
            open: function () {
              if ($target.is(':hidden')) {
                _this.down($target);
                $target.find('li').first().find('a').first().focus();
              }
            },
            close: function () {
              if ($target.length && !$target.is(':hidden')) {
                // close active sub of this item
                _this.up($target);
              } else if ($element.parent('[data-submenu]').length) {
                // close currently open sub
                _this.up($element.parent('[data-submenu]'));
                $element.parents('li').first().find('a').first().focus();
              }
            },
            up: function () {
              $prevElement.attr('tabindex', -1).focus();
              return true;
            },
            down: function () {
              $nextElement.attr('tabindex', -1).focus();
              return true;
            },
            toggle: function () {
              if ($element.children('[data-submenu]').length) {
                _this.toggle($element.children('[data-submenu]'));
              }
            },
            closeAll: function () {
              _this.hideAll();
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); //.attr('tabindex', 0);
      }

      /**
       * Closes all panes of the menu.
       * @function
       */

    }, {
      key: 'hideAll',
      value: function hideAll() {
        this.$element.find('[data-submenu]').slideUp(this.options.slideSpeed);
      }

      /**
       * Toggles the open/close state of a submenu.
       * @function
       * @param {jQuery} $target - the submenu to toggle
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if (!$target.is(':animated')) {
          if (!$target.is(':hidden')) {
            this.up($target);
          } else {
            this.down($target);
          }
        }
      }

      /**
       * Opens the sub-menu defined by `$target`.
       * @param {jQuery} $target - Sub-menu to open.
       * @fires AccordionMenu#down
       */

    }, {
      key: 'down',
      value: function down($target) {
        var _this = this;

        if (!this.options.multiOpen) {
          this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
        }

        $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

        //Foundation.Move(this.options.slideSpeed, $target, function() {
        $target.slideDown(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done opening.
           * @event AccordionMenu#down
           */
          _this.$element.trigger('down.zf.accordionMenu', [$target]);
        });
        //});
      }

      /**
       * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
       * @param {jQuery} $target - Sub-menu to close.
       * @fires AccordionMenu#up
       */

    }, {
      key: 'up',
      value: function up($target) {
        var _this = this;
        //Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done collapsing up.
           * @event AccordionMenu#up
           */
          _this.$element.trigger('up.zf.accordionMenu', [$target]);
        });
        //});

        var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

        $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
      }

      /**
       * Destroys an instance of accordion menu.
       * @fires AccordionMenu#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-submenu]').slideDown(0).css('display', '');
        this.$element.find('a').off('click.zf.accordionMenu');

        Foundation.Nest.Burn(this.$element, 'accordion');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return AccordionMenu;
  }();

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @example true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var Drilldown = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Drilldown(element, options) {
      _classCallCheck(this, Drilldown);

      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */


    _createClass(Drilldown, [{
      key: '_init',
      value: function _init() {
        this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
        this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
        this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');

        this._prepareMenu();

        this._keyboardEvents();
      }

      /**
       * prepares drilldown menu by setting attributes to links and elements
       * sets a min height to prevent content jumping
       * wraps the element if not already wrapped
       * @private
       * @function
       */

    }, {
      key: '_prepareMenu',
      value: function _prepareMenu() {
        var _this = this;
        // if(!this.options.holdOpen){
        //   this._menuLinkEvents();
        // }
        this.$submenuAnchors.each(function () {
          var $link = $(this);
          var $sub = $link.parent();
          if (_this.options.parentLink) {
            $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
          }
          $link.data('savedHref', $link.attr('href')).removeAttr('href');
          $link.children('[data-submenu]').attr({
            'aria-hidden': true,
            'tabindex': 0,
            'role': 'menu'
          });
          _this._events($link);
        });
        this.$submenus.each(function () {
          var $menu = $(this),
              $back = $menu.find('.js-drilldown-back');
          if (!$back.length) {
            $menu.prepend(_this.options.backButton);
          }
          _this._back($menu);
        });
        if (!this.$element.parent().hasClass('is-drilldown')) {
          this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
          this.$wrapper = this.$element.wrap(this.$wrapper).parent().css(this._getMaxDims());
        }
      }

      /**
       * Adds event handlers to elements in the menu.
       * @function
       * @private
       * @param {jQuery} $elem - the current menu item to add handlers to.
       */

    }, {
      key: '_events',
      value: function _events($elem) {
        var _this = this;

        $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }

          // if(e.target !== e.currentTarget.firstElementChild){
          //   return false;
          // }
          _this._show($elem.parent('li'));

          if (_this.options.closeOnClick) {
            var $body = $('body');
            $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
              if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
                return;
              }
              e.preventDefault();
              _this._hideAll();
              $body.off('.zf.drilldown');
            });
          }
        });
      }

      /**
       * Adds keydown event listener to `li`'s in the menu.
       * @private
       */

    }, {
      key: '_keyboardEvents',
      value: function _keyboardEvents() {
        var _this = this;

        this.$menuItems.add(this.$element.find('.js-drilldown-back > a')).on('keydown.zf.drilldown', function (e) {

          var $element = $(this),
              $elements = $element.parent('li').parent('ul').children('li').children('a'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'Drilldown', {
            next: function () {
              if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            previous: function () {
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            close: function () {
              _this._back();
              //_this.$menuItems.first().focus(); // focus to first element
            },
            open: function () {
              if (!$element.is(_this.$menuItems)) {
                // not menu item means back button
                _this._hide($element.parent('li').parent('ul'));
                $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                  setTimeout(function () {
                    $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                  }, 1);
                });
              } else if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
              }
              return true;
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); // end keyboardAccess
      }

      /**
       * Closes all open elements, and returns to root menu.
       * @function
       * @fires Drilldown#closed
       */

    }, {
      key: '_hideAll',
      value: function _hideAll() {
        var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
        $elem.one(Foundation.transitionend($elem), function (e) {
          $elem.removeClass('is-active is-closing');
        });
        /**
         * Fires when the menu is fully closed.
         * @event Drilldown#closed
         */
        this.$element.trigger('closed.zf.drilldown');
      }

      /**
       * Adds event listener for each `back` button, and closes open menus.
       * @function
       * @fires Drilldown#back
       * @param {jQuery} $elem - the current sub-menu to add `back` event.
       */

    }, {
      key: '_back',
      value: function _back($elem) {
        var _this = this;
        $elem.off('click.zf.drilldown');
        $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
          e.stopImmediatePropagation();
          // console.log('mouseup on back');
          _this._hide($elem);
        });
      }

      /**
       * Adds event listener to menu items w/o submenus to close open menus on click.
       * @function
       * @private
       */

    }, {
      key: '_menuLinkEvents',
      value: function _menuLinkEvents() {
        var _this = this;
        this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          // e.stopImmediatePropagation();
          setTimeout(function () {
            _this._hideAll();
          }, 0);
        });
      }

      /**
       * Opens a submenu.
       * @function
       * @fires Drilldown#open
       * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
       */

    }, {
      key: '_show',
      value: function _show($elem) {
        $elem.children('[data-submenu]').addClass('is-active');
        /**
         * Fires when the submenu has opened.
         * @event Drilldown#open
         */
        this.$element.trigger('open.zf.drilldown', [$elem]);
      }
    }, {
      key: '_hide',


      /**
       * Hides a submenu
       * @function
       * @fires Drilldown#hide
       * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
       */
      value: function _hide($elem) {
        var _this = this;
        $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
          $elem.removeClass('is-active is-closing');
          $elem.blur();
        });
        /**
         * Fires when the submenu has closed.
         * @event Drilldown#hide
         */
        $elem.trigger('hide.zf.drilldown', [$elem]);
      }

      /**
       * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
       * Prevents content jumping.
       * @function
       * @private
       */

    }, {
      key: '_getMaxDims',
      value: function _getMaxDims() {
        var max = 0,
            result = {};
        this.$submenus.add(this.$element).each(function () {
          var numOfElems = $(this).children('li').length;
          max = numOfElems > max ? numOfElems : max;
        });

        result['min-height'] = max * this.$menuItems[0].getBoundingClientRect().height + 'px';
        result['max-width'] = this.$element[0].getBoundingClientRect().width + 'px';

        return result;
      }

      /**
       * Destroys the Drilldown Menu
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._hideAll();
        Foundation.Nest.Burn(this.$element, 'drilldown');
        this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
        this.$submenuAnchors.each(function () {
          $(this).off('.zf.drilldown');
        });
        this.$element.find('a').each(function () {
          var $link = $(this);
          if ($link.data('savedHref')) {
            $link.attr('href', $link.data('savedHref')).removeData('savedHref');
          } else {
            return;
          }
        });
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Drilldown;
  }();

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\li><\a>Back<\/a><\/li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\div class="is-drilldown"><\/div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @example false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @example false
     */
    closeOnClick: false
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Dropdown = function () {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Dropdown(element, options) {
      _classCallCheck(this, Dropdown);

      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */


    _createClass(Dropdown, [{
      key: '_init',
      value: function _init() {
        var $id = this.$element.attr('id');

        this.$anchor = $('[data-toggle="' + $id + '"]') || $('[data-open="' + $id + '"]');
        this.$anchor.attr({
          'aria-controls': $id,
          'data-is-focus': false,
          'data-yeti-box': $id,
          'aria-haspopup': true,
          'aria-expanded': false

        });

        this.options.positionClass = this.getPositionClass();
        this.counter = 4;
        this.usedPositions = [];
        this.$element.attr({
          'aria-hidden': 'true',
          'data-yeti-box': $id,
          'data-resize': $id,
          'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
        });
        this._events();
      }

      /**
       * Helper function to determine current orientation of dropdown pane.
       * @function
       * @returns {String} position - string value of a position class.
       */

    }, {
      key: 'getPositionClass',
      value: function getPositionClass() {
        var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
        verticalPosition = verticalPosition ? verticalPosition[0] : '';
        var horizontalPosition = /float-(\S+)\s/.exec(this.$anchor[0].className);
        horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
        var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;
        return position;
      }

      /**
       * Adjusts the dropdown panes orientation by adding/removing positioning classes.
       * @function
       * @private
       * @param {String} position - position class to remove.
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');
        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.$element.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.$element.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.$element.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * Sets the position and orientation of the dropdown pane, checks for collisions.
       * Recursively calls itself if a collision is detected, with a new position class.
       * @function
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        if (this.$anchor.attr('aria-expanded') === 'false') {
          return false;
        }
        var position = this.getPositionClass(),
            $eleDims = Foundation.Box.GetDimensions(this.$element),
            $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
            _this = this,
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

        if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element)) {
          this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $eleDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          this.classChanged = true;
          return false;
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.$element, false, true) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * Adds event listeners to the element utilizing the triggers utility library.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': this._setPosition.bind(this)
        });

        if (this.options.hover) {
          this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.open();
              _this.$anchor.data('hover', true);
            }, _this.options.hoverDelay);
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
          if (this.options.hoverPane) {
            this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
              clearTimeout(_this.timeout);
            }).on('mouseleave.zf.dropdown', function () {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.close();
                _this.$anchor.data('hover', false);
              }, _this.options.hoverDelay);
            });
          }
        }
        this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

          var $target = $(this),
              visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

          Foundation.Keyboard.handleKey(e, 'Dropdown', {
            tab_forward: function () {
              if (_this.$element.find(':focus').is(visibleFocusableElements.eq(-1))) {
                // left modal downwards, setting focus to first element
                if (_this.options.trapFocus) {
                  // if focus shall be trapped
                  visibleFocusableElements.eq(0).focus();
                  e.preventDefault();
                } else {
                  // if focus is not trapped, close dropdown on focus out
                  _this.close();
                }
              }
            },
            tab_backward: function () {
              if (_this.$element.find(':focus').is(visibleFocusableElements.eq(0)) || _this.$element.is(':focus')) {
                // left modal upwards, setting focus to last element
                if (_this.options.trapFocus) {
                  // if focus shall be trapped
                  visibleFocusableElements.eq(-1).focus();
                  e.preventDefault();
                } else {
                  // if focus is not trapped, close dropdown on focus out
                  _this.close();
                }
              }
            },
            open: function () {
              if ($target.is(_this.$anchor)) {
                _this.open();
                _this.$element.attr('tabindex', -1).focus();
                e.preventDefault();
              }
            },
            close: function () {
              _this.close();
              _this.$anchor.focus();
            }
          });
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body).not(this.$element),
            _this = this;
        $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
          if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
            return;
          }
          if (_this.$element.find(e.target).length) {
            return;
          }
          _this.close();
          $body.off('click.zf.dropdown');
        });
      }

      /**
       * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
       * @function
       * @fires Dropdown#closeme
       * @fires Dropdown#show
       */

    }, {
      key: 'open',
      value: function open() {
        // var _this = this;
        /**
         * Fires to close other open dropdowns
         * @event Dropdown#closeme
         */
        this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
        this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
        // this.$element/*.show()*/;
        this._setPosition();
        this.$element.addClass('is-open').attr({ 'aria-hidden': false });

        if (this.options.autoFocus) {
          var $focusable = Foundation.Keyboard.findFocusable(this.$element);
          if ($focusable.length) {
            $focusable.eq(0).focus();
          }
        }

        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }

        /**
         * Fires once the dropdown is visible.
         * @event Dropdown#show
         */
        this.$element.trigger('show.zf.dropdown', [this.$element]);
      }

      /**
       * Closes the open dropdown pane.
       * @function
       * @fires Dropdown#hide
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.$element.hasClass('is-open')) {
          return false;
        }
        this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

        this.$anchor.removeClass('hover').attr('aria-expanded', false);

        if (this.classChanged) {
          var curPositionClass = this.getPositionClass();
          if (curPositionClass) {
            this.$element.removeClass(curPositionClass);
          }
          this.$element.addClass(this.options.positionClass)
          /*.hide()*/.css({ height: '', width: '' });
          this.classChanged = false;
          this.counter = 4;
          this.usedPositions.length = 0;
        }
        this.$element.trigger('hide.zf.dropdown', [this.$element]);
      }

      /**
       * Toggles the dropdown pane's visibility.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.$element.hasClass('is-open')) {
          if (this.$anchor.data('hover')) return;
          this.close();
        } else {
          this.open();
        }
      }

      /**
       * Destroys the dropdown.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger').hide();
        this.$anchor.off('.zf.dropdown');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Dropdown;
  }();

  Dropdown.defaults = {
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @example false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @example true
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @example false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @example true
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @example false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_events',

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function (e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($elem.children('.is-dropdown-submenu'));
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          } else {
            return;
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout(_this.delay);
              _this.delay = setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime);
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function () {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function () {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function () {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function () {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function () {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function () {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this.$element.hasClass(_this.options.verticalClass)) {
              // vertical menu
              if (_this.options.alignment === 'left') {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              } else {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              }
            } else {
              // horizontal menu
              $.extend(functions, {
                next: nextSibling,
                previous: prevSibling,
                down: openSub,
                up: closeSub
              });
            }
          } else {
            // not tabs -> one sub
            if (_this.options.alignment === 'left') {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').attr({ 'aria-hidden': false }).parent('li.is-dropdown-submenu-parent').addClass('is-active').attr({ 'aria-expanded': true });
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'aria-expanded': false,
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').attr({
            'aria-hidden': true
          }).removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   */

  var Equalizer = function () {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Equalizer(element, options) {
      _classCallCheck(this, Equalizer);

      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Equalizer, [{
      key: '_init',
      value: function _init() {
        var eqId = this.$element.attr('data-equalizer') || '';
        var $watched = this.$element.find('[data-equalizer-watch="' + eqId + '"]');

        this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
        this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));

        this.hasNested = this.$element.find('[data-equalizer]').length > 0;
        this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
        this.isOn = false;
        this._bindHandler = {
          onResizeMeBound: this._onResizeMe.bind(this),
          onPostEqualizedBound: this._onPostEqualized.bind(this)
        };

        var imgs = this.$element.find('img');
        var tooSmall;
        if (this.options.equalizeOn) {
          tooSmall = this._checkMQ();
          $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
        } else {
          this._events();
        }
        if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
          if (imgs.length) {
            Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
          } else {
            this._reflow();
          }
        }
      }

      /**
       * Removes event listeners if the breakpoint is too small.
       * @private
       */

    }, {
      key: '_pauseEvents',
      value: function _pauseEvents() {
        this.isOn = false;
        this.$element.off({
          '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
          'resizeme.zf.trigger': this._bindHandler.onResizeMeBound
        });
      }

      /**
       * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
       * @private
       */

    }, {
      key: '_onResizeMe',
      value: function _onResizeMe(e) {
        this._reflow();
      }

      /**
       * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
       * @private
       */

    }, {
      key: '_onPostEqualized',
      value: function _onPostEqualized(e) {
        if (e.target !== this.$element[0]) {
          this._reflow();
        }
      }

      /**
       * Initializes events for Equalizer.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this._pauseEvents();
        if (this.hasNested) {
          this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
        } else {
          this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
        }
        this.isOn = true;
      }

      /**
       * Checks the current breakpoint to the minimum required size.
       * @private
       */

    }, {
      key: '_checkMQ',
      value: function _checkMQ() {
        var tooSmall = !Foundation.MediaQuery.atLeast(this.options.equalizeOn);
        if (tooSmall) {
          if (this.isOn) {
            this._pauseEvents();
            this.$watched.css('height', 'auto');
          }
        } else {
          if (!this.isOn) {
            this._events();
          }
        }
        return tooSmall;
      }

      /**
       * A noop version for the plugin
       * @private
       */

    }, {
      key: '_killswitch',
      value: function _killswitch() {
        return;
      }

      /**
       * Calls necessary functions to update Equalizer upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        if (!this.options.equalizeOnStack) {
          if (this._isStacked()) {
            this.$watched.css('height', 'auto');
            return false;
          }
        }
        if (this.options.equalizeByRow) {
          this.getHeightsByRow(this.applyHeightByRow.bind(this));
        } else {
          this.getHeights(this.applyHeight.bind(this));
        }
      }

      /**
       * Manually determines if the first 2 elements are *NOT* stacked.
       * @private
       */

    }, {
      key: '_isStacked',
      value: function _isStacked() {
        return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} heights - An array of heights of children within Equalizer container
       */

    }, {
      key: 'getHeights',
      value: function getHeights(cb) {
        var heights = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          heights.push(this.$watched[i].offsetHeight);
        }
        cb(heights);
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       */

    }, {
      key: 'getHeightsByRow',
      value: function getHeightsByRow(cb) {
        var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
            groups = [],
            group = 0;
        //group by Row
        groups[group] = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          //maybe could use this.$watched[i].offsetTop
          var elOffsetTop = $(this.$watched[i]).offset().top;
          if (elOffsetTop != lastElTopOffset) {
            group++;
            groups[group] = [];
            lastElTopOffset = elOffsetTop;
          }
          groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
        }

        for (var j = 0, ln = groups.length; j < ln; j++) {
          var heights = $(groups[j]).map(function () {
            return this[1];
          }).get();
          var max = Math.max.apply(null, heights);
          groups[j].push(max);
        }
        cb(groups);
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest
       * @param {array} heights - An array of heights of children within Equalizer container
       * @fires Equalizer#preequalized
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeight',
      value: function applyHeight(heights) {
        var max = Math.max.apply(null, heights);
        /**
         * Fires before the heights are applied
         * @event Equalizer#preequalized
         */
        this.$element.trigger('preequalized.zf.equalizer');

        this.$watched.css('height', max);

        /**
         * Fires when the heights have been applied
         * @event Equalizer#postequalized
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
       * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       * @fires Equalizer#preequalized
       * @fires Equalizer#preequalizedRow
       * @fires Equalizer#postequalizedRow
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeightByRow',
      value: function applyHeightByRow(groups) {
        /**
         * Fires before the heights are applied
         */
        this.$element.trigger('preequalized.zf.equalizer');
        for (var i = 0, len = groups.length; i < len; i++) {
          var groupsILength = groups[i].length,
              max = groups[i][groupsILength - 1];
          if (groupsILength <= 2) {
            $(groups[i][0][0]).css({ 'height': 'auto' });
            continue;
          }
          /**
            * Fires before the heights per row are applied
            * @event Equalizer#preequalizedRow
            */
          this.$element.trigger('preequalizedrow.zf.equalizer');
          for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
            $(groups[i][j][0]).css({ 'height': max });
          }
          /**
            * Fires when the heights per row have been applied
            * @event Equalizer#postequalizedRow
            */
          this.$element.trigger('postequalizedrow.zf.equalizer');
        }
        /**
         * Fires when the heights have been applied
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Destroys an instance of Equalizer.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._pauseEvents();
        this.$watched.css('height', 'auto');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Equalizer;
  }();

  /**
   * Default settings for plugin
   */


  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @example true
     */
    equalizeOnStack: true,
    /**
     * Enable height equalization row by row.
     * @option
     * @example false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @example 'medium'
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  var Interchange = function () {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Interchange(element, options) {
      _classCallCheck(this, Interchange);

      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */


    _createClass(Interchange, [{
      key: '_init',
      value: function _init() {
        this._addBreakpoints();
        this._generateRules();
        this._reflow();
      }

      /**
       * Initializes events for Interchange.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        $(window).on('resize.zf.interchange', Foundation.util.throttle(this._reflow.bind(this), 50));
      }

      /**
       * Calls necessary functions to update Interchange upon DOM change
       * @function
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        var match;

        // Iterate through each rule, but only save the last match
        for (var i in this.rules) {
          if (this.rules.hasOwnProperty(i)) {
            var rule = this.rules[i];

            if (window.matchMedia(rule.query).matches) {
              match = rule;
            }
          }
        }

        if (match) {
          this.replace(match.path);
        }
      }

      /**
       * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
       * @function
       * @private
       */

    }, {
      key: '_addBreakpoints',
      value: function _addBreakpoints() {
        for (var i in Foundation.MediaQuery.queries) {
          if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
            var query = Foundation.MediaQuery.queries[i];
            Interchange.SPECIAL_QUERIES[query.name] = query.value;
          }
        }
      }

      /**
       * Checks the Interchange element for the provided media query + content pairings
       * @function
       * @private
       * @param {Object} element - jQuery object that is an Interchange instance
       * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
       */

    }, {
      key: '_generateRules',
      value: function _generateRules(element) {
        var rulesList = [];
        var rules;

        if (this.options.rules) {
          rules = this.options.rules;
        } else {
          rules = this.$element.data('interchange').match(/\[.*?\]/g);
        }

        for (var i in rules) {
          if (rules.hasOwnProperty(i)) {
            var rule = rules[i].slice(1, -1).split(', ');
            var path = rule.slice(0, -1).join('');
            var query = rule[rule.length - 1];

            if (Interchange.SPECIAL_QUERIES[query]) {
              query = Interchange.SPECIAL_QUERIES[query];
            }

            rulesList.push({
              path: path,
              query: query
            });
          }
        }

        this.rules = rulesList;
      }

      /**
       * Update the `src` property of an image, or change the HTML of a container, to the specified path.
       * @function
       * @param {String} path - Path to the image or HTML partial.
       * @fires Interchange#replaced
       */

    }, {
      key: 'replace',
      value: function replace(path) {
        if (this.currentPath === path) return;

        var _this = this,
            trigger = 'replaced.zf.interchange';

        // Replacing images
        if (this.$element[0].nodeName === 'IMG') {
          this.$element.attr('src', path).load(function () {
            _this.currentPath = path;
          }).trigger(trigger);
        }
        // Replacing background images
        else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
            this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
          }
          // Replacing HTML
          else {
              $.get(path, function (response) {
                _this.$element.html(response).trigger(trigger);
                $(response).foundation();
                _this.currentPath = path;
              });
            }

        /**
         * Fires when content in an Interchange element is done being loaded.
         * @event Interchange#replaced
         */
        // this.$element.trigger('replaced.zf.interchange');
      }

      /**
       * Destroys an instance of interchange.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        //TODO this.
      }
    }]);

    return Interchange;
  }();

  /**
   * Default settings for plugin
   */


  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  var Magellan = function () {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Magellan(element, options) {
      _classCallCheck(this, Magellan);

      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Magellan, [{
      key: '_init',
      value: function _init() {
        var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
        var _this = this;
        this.$targets = $('[data-magellan-target]');
        this.$links = this.$element.find('a');
        this.$element.attr({
          'data-resize': id,
          'data-scroll': id,
          'id': id
        });
        this.$active = $();
        this.scrollPos = parseInt(window.pageYOffset, 10);

        this._events();
      }

      /**
       * Calculates an array of pixel values that are the demarcation lines between locations on the page.
       * Can be invoked if new elements are added or the size of a location changes.
       * @function
       */

    }, {
      key: 'calcPoints',
      value: function calcPoints() {
        var _this = this,
            body = document.body,
            html = document.documentElement;

        this.points = [];
        this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
        this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

        this.$targets.each(function () {
          var $tar = $(this),
              pt = Math.round($tar.offset().top - _this.options.threshold);
          $tar.targetPoint = pt;
          _this.points.push(pt);
        });
      }

      /**
       * Initializes events for Magellan.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            $body = $('html, body'),
            opts = {
          duration: _this.options.animationDuration,
          easing: _this.options.animationEasing
        };
        $(window).one('load', function () {
          if (_this.options.deepLinking) {
            if (location.hash) {
              _this.scrollToLoc(location.hash);
            }
          }
          _this.calcPoints();
          _this._updateActive();
        });

        this.$element.on({
          'resizeme.zf.trigger': this.reflow.bind(this),
          'scrollme.zf.trigger': this._updateActive.bind(this)
        }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
          e.preventDefault();
          var arrival = this.getAttribute('href');
          _this.scrollToLoc(arrival);
        });
      }

      /**
       * Function to scroll to a given location on the page.
       * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
       * @function
       */

    }, {
      key: 'scrollToLoc',
      value: function scrollToLoc(loc) {
        var scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

        $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing);
      }

      /**
       * Calls necessary functions to update Magellan upon DOM change
       * @function
       */

    }, {
      key: 'reflow',
      value: function reflow() {
        this.calcPoints();
        this._updateActive();
      }

      /**
       * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
       * @private
       * @function
       * @fires Magellan#update
       */

    }, {
      key: '_updateActive',
      value: function _updateActive() /*evt, elem, scrollPos*/{
        var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
            curIdx;

        if (winPos + this.winHeight === this.docHeight) {
          curIdx = this.points.length - 1;
        } else if (winPos < this.points[0]) {
          curIdx = 0;
        } else {
          var isDown = this.scrollPos < winPos,
              _this = this,
              curVisible = this.points.filter(function (p, i) {
            return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
          });
          curIdx = curVisible.length ? curVisible.length - 1 : 0;
        }

        this.$active.removeClass(this.options.activeClass);
        this.$active = this.$links.eq(curIdx).addClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.scrollPos = winPos;
        /**
         * Fires when magellan is finished updating to the new active element.
         * @event Magellan#update
         */
        this.$element.trigger('update.zf.magellan', [this.$active]);
      }

      /**
       * Destroys an instance of Magellan and resets the url of the window.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger .zf.magellan').find('.' + this.options.activeClass).removeClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          window.location.hash.replace(hash, '');
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Magellan;
  }();

  /**
   * Default settings for plugin
   */


  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations.
     * @option
     * @example 'ease-in-out'
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @example 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @example 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @example true
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @example 25
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  var Orbit = function () {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    function Orbit(element, options) {
      _classCallCheck(this, Orbit);

      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */


    _createClass(Orbit, [{
      key: '_init',
      value: function _init() {
        this.$wrapper = this.$element.find('.' + this.options.containerClass);
        this.$slides = this.$element.find('.' + this.options.slideClass);
        var $images = this.$element.find('img'),
            initActive = this.$slides.filter('.is-active');

        if (!initActive.length) {
          this.$slides.eq(0).addClass('is-active');
        }

        if (!this.options.useMUI) {
          this.$slides.addClass('no-motionui');
        }

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
        } else {
          this._prepareForOrbit(); //hehe
        }

        if (this.options.bullets) {
          this._loadBullets();
        }

        this._events();

        if (this.options.autoPlay && this.$slides.length > 1) {
          this.geoSync();
        }

        if (this.options.accessible) {
          // allow wrapper to be focusable to enable arrow navigation
          this.$wrapper.attr('tabindex', 0);
        }
      }

      /**
      * Creates a jQuery collection of bullets, if they are being used.
      * @function
      * @private
      */

    }, {
      key: '_loadBullets',
      value: function _loadBullets() {
        this.$bullets = this.$element.find('.' + this.options.boxOfBullets).find('button');
      }

      /**
      * Sets a `timer` object on the orbit, and starts the counter for the next slide.
      * @function
      */

    }, {
      key: 'geoSync',
      value: function geoSync() {
        var _this = this;
        this.timer = new Foundation.Timer(this.$element, {
          duration: this.options.timerDelay,
          infinite: false
        }, function () {
          _this.changeSlide(true);
        });
        this.timer.start();
      }

      /**
      * Sets wrapper and slide heights for the orbit.
      * @function
      * @private
      */

    }, {
      key: '_prepareForOrbit',
      value: function _prepareForOrbit() {
        var _this = this;
        this._setWrapperHeight(function (max) {
          _this._setSlideHeight(max);
        });
      }

      /**
      * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
      * @function
      * @private
      * @param {Function} cb - a callback function to fire when complete.
      */

    }, {
      key: '_setWrapperHeight',
      value: function _setWrapperHeight(cb) {
        //rewrite this to `for` loop
        var max = 0,
            temp,
            counter = 0;

        this.$slides.each(function () {
          temp = this.getBoundingClientRect().height;
          $(this).attr('data-slide', counter);

          if (counter) {
            //if not the first slide, set css position and display property
            $(this).css({ 'position': 'relative', 'display': 'none' });
          }
          max = temp > max ? temp : max;
          counter++;
        });

        if (counter === this.$slides.length) {
          this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
          cb(max); //fire callback with max height dimension.
        }
      }

      /**
      * Sets the max-height of each slide.
      * @function
      * @private
      */

    }, {
      key: '_setSlideHeight',
      value: function _setSlideHeight(height) {
        this.$slides.each(function () {
          $(this).css('max-height', height);
        });
      }

      /**
      * Adds event listeners to basically everything within the element.
      * @function
      * @private
      */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        //***************************************
        //**Now using custom event - thanks to:**
        //**      Yohai Ararat of Toronto      **
        //***************************************
        if (this.$slides.length > 1) {

          if (this.options.swipe) {
            this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(true);
            }).on('swiperight.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(false);
            });
          }
          //***************************************

          if (this.options.autoPlay) {
            this.$slides.on('click.zf.orbit', function () {
              _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
              _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
            });

            if (this.options.pauseOnHover) {
              this.$element.on('mouseenter.zf.orbit', function () {
                _this.timer.pause();
              }).on('mouseleave.zf.orbit', function () {
                if (!_this.$element.data('clickedOn')) {
                  _this.timer.start();
                }
              });
            }
          }

          if (this.options.navButtons) {
            var $controls = this.$element.find('.' + this.options.nextClass + ', .' + this.options.prevClass);
            $controls.attr('tabindex', 0)
            //also need to handle enter/return and spacebar key presses
            .on('click.zf.orbit touchend.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide($(this).hasClass(_this.options.nextClass));
            });
          }

          if (this.options.bullets) {
            this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
              if (/is-active/g.test(this.className)) {
                return false;
              } //if this is active, kick out of function.
              var idx = $(this).data('slide'),
                  ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                  $slide = _this.$slides.eq(idx);

              _this.changeSlide(ltr, $slide, idx);
            });
          }

          this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
            // handle keyboard event with keyboard util
            Foundation.Keyboard.handleKey(e, 'Orbit', {
              next: function () {
                _this.changeSlide(true);
              },
              previous: function () {
                _this.changeSlide(false);
              },
              handled: function () {
                // if bullet is focused, make sure focus moves
                if ($(e.target).is(_this.$bullets)) {
                  _this.$bullets.filter('.is-active').focus();
                }
              }
            });
          });
        }
      }

      /**
      * Changes the current slide to a new one.
      * @function
      * @param {Boolean} isLTR - flag if the slide should move left to right.
      * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
      * @param {Number} idx - the index of the new slide in its collection, if one chosen.
      * @fires Orbit#slidechange
      */

    }, {
      key: 'changeSlide',
      value: function changeSlide(isLTR, chosenSlide, idx) {
        var $curSlide = this.$slides.filter('.is-active').eq(0);

        if (/mui/g.test($curSlide[0].className)) {
          return false;
        } //if the slide is currently animating, kick out of the function

        var $firstSlide = this.$slides.first(),
            $lastSlide = this.$slides.last(),
            dirIn = isLTR ? 'Right' : 'Left',
            dirOut = isLTR ? 'Left' : 'Right',
            _this = this,
            $newSlide;

        if (!chosenSlide) {
          //most of the time, this will be auto played or clicked from the navButtons.
          $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
          this.options.infiniteWrap ? $curSlide.next('.' + this.options.slideClass).length ? $curSlide.next('.' + this.options.slideClass) : $firstSlide : $curSlide.next('.' + this.options.slideClass) : //pick next slide if moving left to right
          this.options.infiniteWrap ? $curSlide.prev('.' + this.options.slideClass).length ? $curSlide.prev('.' + this.options.slideClass) : $lastSlide : $curSlide.prev('.' + this.options.slideClass); //pick prev slide if moving right to left
        } else {
          $newSlide = chosenSlide;
        }

        if ($newSlide.length) {
          if (this.options.bullets) {
            idx = idx || this.$slides.index($newSlide); //grab index to update bullets
            this._updateBullets(idx);
          }

          if (this.options.useMUI) {
            Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options['animInFrom' + dirIn], function () {
              $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
            });

            Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options['animOutTo' + dirOut], function () {
              $curSlide.removeAttr('aria-live');
              if (_this.options.autoPlay && !_this.timer.isPaused) {
                _this.timer.restart();
              }
              //do stuff?
            });
          } else {
            $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
            $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
            if (this.options.autoPlay && !this.timer.isPaused) {
              this.timer.restart();
            }
          }
          /**
          * Triggers when the slide has finished animating in.
          * @event Orbit#slidechange
          */
          this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
        }
      }

      /**
      * Updates the active state of the bullets, if displayed.
      * @function
      * @private
      * @param {Number} idx - the index of the current slide.
      */

    }, {
      key: '_updateBullets',
      value: function _updateBullets(idx) {
        var $oldBullet = this.$element.find('.' + this.options.boxOfBullets).find('.is-active').removeClass('is-active').blur(),
            span = $oldBullet.find('span:last').detach(),
            $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
      }

      /**
      * Destroys the carousel and hides the element.
      * @function
      */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Orbit;
  }();

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
    * @example true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
    * @example true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
    * @example true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
    * @example 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
    * @example true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
    * @example true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
    * @example true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
    * @example true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
    * @example 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
    * @example 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
    * @example 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
    * @example 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
    * @example 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
    * @example true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.accordionMenu
   * @requires foundation.util.drilldown
   * @requires foundation.util.dropdown-menu
   */

  var ResponsiveMenu = function () {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveMenu(element, options) {
      _classCallCheck(this, ResponsiveMenu);

      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveMenu, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
        // $(window).on('resize.zf.ResponsiveMenu', function() {
        //   _this._checkMediaQueries();
        // });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) this.currentPlugin.destroy();
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveMenu');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveMenu;
  }();

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]');

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$targetMenu.toggle(0);

          /**
           * Fires when the element attached to the tab bar toggles.
           * @event ResponsiveToggle#toggled
           */
          this.$element.trigger('toggled.zf.responsiveToggle');
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @example 'medium'
     */
    hideFor: 'medium'
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($('body'));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay(id) {
        var $overlay = $('<div></div>').addClass('reveal-overlay').appendTo('body');
        return $overlay;
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          var _this;

          (function () {
            var afterAnimationFocus = function () {
              _this.$element.attr({
                'aria-hidden': false,
                'tabindex': -1
              }).focus();
              console.log('focus');
            };

            _this = _this3;

            if (_this3.options.overlay) {
              Foundation.Motion.animateIn(_this3.$overlay, 'fade-in');
            }
            Foundation.Motion.animateIn(_this3.$element, _this3.options.animationIn, function () {
              _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
              afterAnimationFocus();
            });
          })();
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        if (this.isMobile) {
          this.originalScrollPos = window.pageYOffset;
          $('html, body').addClass('is-reveal-open');
        } else {
          $('body').addClass('is-reveal-open');
        }

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            tab_forward: function () {
              if (_this.$element.find(':focus').is(_this.focusableElements.eq(-1))) {
                // left modal downwards, setting focus to first element
                _this.focusableElements.eq(0).focus();
                return true;
              }
              if (_this.focusableElements.length === 0) {
                // no focusable elements inside the modal at all, prevent tabbing in general
                return true;
              }
            },
            tab_backward: function () {
              if (_this.$element.find(':focus').is(_this.focusableElements.eq(0)) || _this.$element.is(':focus')) {
                // left modal upwards, setting focus to last element
                _this.focusableElements.eq(-1).focus();
                return true;
              }
              if (_this.focusableElements.length === 0) {
                // no focusable elements inside the modal at all, prevent tabbing in general
                return true;
              }
            },
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {
            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }

            this.$element.hide(this.options.hideDelay);
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            $('html, body').removeClass('is-reveal-open');
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            $('body').removeClass('is-reveal-open');
          }

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState("", document.title, window.location.pathname);
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($('body')); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-in-left'
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-out-right'
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @example true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @example false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @example auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @example auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @example false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @example 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @example true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @example false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @example false
     */
    deepLink: false
  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var Sticky = function () {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    function Sticky(element, options) {
      _classCallCheck(this, Sticky);

      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */


    _createClass(Sticky, [{
      key: '_init',
      value: function _init() {
        var $parent = this.$element.parent('[data-sticky-container]'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
            _this = this;

        if (!$parent.length) {
          this.wasWrapped = true;
        }
        this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
        this.$container.addClass(this.options.containerClass);

        this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

        this.scrollCount = this.options.checkEvery;
        this.isStuck = false;
        $(window).one('load.zf.sticky', function () {
          if (_this.options.anchor !== '') {
            _this.$anchor = $('#' + _this.options.anchor);
          } else {
            _this._parsePoints();
          }

          _this._setSizes(function () {
            _this._calc(false);
          });
          _this._events(id.split('-').reverse().join('-'));
        });
      }

      /**
       * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
       * @function
       * @private
       */

    }, {
      key: '_parsePoints',
      value: function _parsePoints() {
        var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
            btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
            pts = [top, btm],
            breaks = {};
        for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
          var pt;
          if (typeof pts[i] === 'number') {
            pt = pts[i];
          } else {
            var place = pts[i].split(':'),
                anchor = $('#' + place[0]);

            pt = anchor.offset().top;
            if (place[1] && place[1].toLowerCase() === 'bottom') {
              pt += anchor[0].getBoundingClientRect().height;
            }
          }
          breaks[i] = pt;
        }

        this.points = breaks;
        return;
      }

      /**
       * Adds event handlers for the scrolling element.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_events',
      value: function _events(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;
        if (this.isOn) {
          return;
        }
        if (this.canStick) {
          this.isOn = true;
          $(window).off(scrollListener).on(scrollListener, function (e) {
            if (_this.scrollCount === 0) {
              _this.scrollCount = _this.options.checkEvery;
              _this._setSizes(function () {
                _this._calc(false, window.pageYOffset);
              });
            } else {
              _this.scrollCount--;
              _this._calc(false, window.pageYOffset);
            }
          });
        }

        this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
          _this._setSizes(function () {
            _this._calc(false);
            if (_this.canStick) {
              if (!_this.isOn) {
                _this._events(id);
              }
            } else if (_this.isOn) {
              _this._pauseListeners(scrollListener);
            }
          });
        });
      }

      /**
       * Removes event handlers for scroll and change events on anchor.
       * @fires Sticky#pause
       * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
       */

    }, {
      key: '_pauseListeners',
      value: function _pauseListeners(scrollListener) {
        this.isOn = false;
        $(window).off(scrollListener);

        /**
         * Fires when the plugin is paused due to resize event shrinking the view.
         * @event Sticky#pause
         * @private
         */
        this.$element.trigger('pause.zf.sticky');
      }

      /**
       * Called on every `scroll` event and on `_init`
       * fires functions based on booleans and cached values
       * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
       * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
       */

    }, {
      key: '_calc',
      value: function _calc(checkSizes, scroll) {
        if (checkSizes) {
          this._setSizes();
        }

        if (!this.canStick) {
          if (this.isStuck) {
            this._removeSticky(true);
          }
          return false;
        }

        if (!scroll) {
          scroll = window.pageYOffset;
        }

        if (scroll >= this.topPoint) {
          if (scroll <= this.bottomPoint) {
            if (!this.isStuck) {
              this._setSticky();
            }
          } else {
            if (this.isStuck) {
              this._removeSticky(false);
            }
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(true);
          }
        }
      }

      /**
       * Causes the $element to become stuck.
       * Adds `position: fixed;`, and helper classes.
       * @fires Sticky#stuckto
       * @function
       * @private
       */

    }, {
      key: '_setSticky',
      value: function _setSticky() {
        var _this = this,
            stickTo = this.options.stickTo,
            mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
            notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
            css = {};

        css[mrgn] = this.options[mrgn] + 'em';
        css[stickTo] = 0;
        css[notStuckTo] = 'auto';
        css['left'] = this.$container.offset().left + parseInt(window.getComputedStyle(this.$container[0])["padding-left"], 10);
        this.isStuck = true;
        this.$element.removeClass('is-anchored is-at-' + notStuckTo).addClass('is-stuck is-at-' + stickTo).css(css)
        /**
         * Fires when the $element has become `position: fixed;`
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
         * @event Sticky#stuckto
         */
        .trigger('sticky.zf.stuckto:' + stickTo);
        this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
          _this._setSizes();
        });
      }

      /**
       * Causes the $element to become unstuck.
       * Removes `position: fixed;`, and helper classes.
       * Adds other helper classes.
       * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
       * @fires Sticky#unstuckfrom
       * @private
       */

    }, {
      key: '_removeSticky',
      value: function _removeSticky(isTop) {
        var stickTo = this.options.stickTo,
            stickToTop = stickTo === 'top',
            css = {},
            anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
            mrgn = stickToTop ? 'marginTop' : 'marginBottom',
            notStuckTo = stickToTop ? 'bottom' : 'top',
            topOrBottom = isTop ? 'top' : 'bottom';

        css[mrgn] = 0;

        css['bottom'] = 'auto';
        if (isTop) {
          css['top'] = 0;
        } else {
          css['top'] = anchorPt;
        }

        css['left'] = '';
        this.isStuck = false;
        this.$element.removeClass('is-stuck is-at-' + stickTo).addClass('is-anchored is-at-' + topOrBottom).css(css)
        /**
         * Fires when the $element has become anchored.
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
         * @event Sticky#unstuckfrom
         */
        .trigger('sticky.zf.unstuckfrom:' + topOrBottom);
      }

      /**
       * Sets the $element and $container sizes for plugin.
       * Calls `_setBreakPoints`.
       * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
       * @private
       */

    }, {
      key: '_setSizes',
      value: function _setSizes(cb) {
        this.canStick = Foundation.MediaQuery.atLeast(this.options.stickyOn);
        if (!this.canStick) {
          cb();
        }
        var _this = this,
            newElemWidth = this.$container[0].getBoundingClientRect().width,
            comp = window.getComputedStyle(this.$container[0]),
            pdng = parseInt(comp['padding-right'], 10);

        if (this.$anchor && this.$anchor.length) {
          this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
        } else {
          this._parsePoints();
        }

        this.$element.css({
          'max-width': newElemWidth - pdng + 'px'
        });

        var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
        if (this.$element.css("display") == "none") {
          newContainerHeight = 0;
        }
        this.containerHeight = newContainerHeight;
        this.$container.css({
          height: newContainerHeight
        });
        this.elemHeight = newContainerHeight;

        if (this.isStuck) {
          this.$element.css({ "left": this.$container.offset().left + parseInt(comp['padding-left'], 10) });
        }

        this._setBreakPoints(newContainerHeight, function () {
          if (cb) {
            cb();
          }
        });
      }

      /**
       * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
       * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
       * @param {Function} cb - optional callback function to be called on completion.
       * @private
       */

    }, {
      key: '_setBreakPoints',
      value: function _setBreakPoints(elemHeight, cb) {
        if (!this.canStick) {
          if (cb) {
            cb();
          } else {
            return false;
          }
        }
        var mTop = emCalc(this.options.marginTop),
            mBtm = emCalc(this.options.marginBottom),
            topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
            bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

        // topPoint = this.$anchor.offset().top || this.points[0],
        // bottomPoint = topPoint + this.anchorHeight || this.points[1],
        winHeight = window.innerHeight;

        if (this.options.stickTo === 'top') {
          topPoint -= mTop;
          bottomPoint -= elemHeight + mTop;
        } else if (this.options.stickTo === 'bottom') {
          topPoint -= winHeight - (elemHeight + mBtm);
          bottomPoint -= winHeight - mBtm;
        } else {
          //this would be the stickTo: both option... tricky
        }

        this.topPoint = topPoint;
        this.bottomPoint = bottomPoint;

        if (cb) {
          cb();
        }
      }

      /**
       * Destroys the current sticky element.
       * Resets the element to the top position first.
       * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._removeSticky(true);

        this.$element.removeClass(this.options.stickyClass + ' is-anchored is-at-top').css({
          height: '',
          top: '',
          bottom: '',
          'max-width': ''
        }).off('resizeme.zf.trigger');
        if (this.$anchor && this.$anchor.length) {
          this.$anchor.off('change.zf.sticky');
        }
        $(window).off(this.scrollListener);

        if (this.wasWrapped) {
          this.$element.unwrap();
        } else {
          this.$container.removeClass(this.options.containerClass).css({
            height: ''
          });
        }
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Sticky;
  }();

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @example '&lt;div data-sticky-container class="small-6 columns"&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to.
     * @option
     * @example 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @example 'exampleId'
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @example 'exampleId:top'
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @example 'exampleId:bottom'
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @example 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @example 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @example 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @example 50
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  var Tabs = function () {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Tabs(element, options) {
      _classCallCheck(this, Tabs);

      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */


    _createClass(Tabs, [{
      key: '_init',
      value: function _init() {
        var _this = this;

        this.$tabTitles = this.$element.find('.' + this.options.linkClass);
        this.$tabContent = $('[data-tabs-content="' + this.$element[0].id + '"]');

        this.$tabTitles.each(function () {
          var $elem = $(this),
              $link = $elem.find('a'),
              isActive = $elem.hasClass('is-active'),
              hash = $link[0].hash.slice(1),
              linkId = $link[0].id ? $link[0].id : hash + '-label',
              $tabContent = $('#' + hash);

          $elem.attr({ 'role': 'presentation' });

          $link.attr({
            'role': 'tab',
            'aria-controls': hash,
            'aria-selected': isActive,
            'id': linkId
          });

          $tabContent.attr({
            'role': 'tabpanel',
            'aria-hidden': !isActive,
            'aria-labelledby': linkId
          });

          if (isActive && _this.options.autoFocus) {
            $link.focus();
          }
        });

        if (this.options.matchHeight) {
          var $images = this.$tabContent.find('img');

          if ($images.length) {
            Foundation.onImagesLoaded($images, this._setHeight.bind(this));
          } else {
            this._setHeight();
          }
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._addKeyHandler();
        this._addClickHandler();
        this._setHeightMqHandler = null;

        if (this.options.matchHeight) {
          this._setHeightMqHandler = this._setHeight.bind(this);

          $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      /**
       * Adds click handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addClickHandler',
      value: function _addClickHandler() {
        var _this = this;

        this.$element.off('click.zf.tabs').on('click.zf.tabs', '.' + this.options.linkClass, function (e) {
          e.preventDefault();
          e.stopPropagation();
          if ($(this).hasClass('is-active')) {
            return;
          }
          _this._handleTabChange($(this));
        });
      }

      /**
       * Adds keyboard event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addKeyHandler',
      value: function _addKeyHandler() {
        var _this = this;
        var $firstTab = _this.$element.find('li:first-of-type');
        var $lastTab = _this.$element.find('li:last-of-type');

        this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
          if (e.which === 9) return;

          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              if (_this.options.wrapOnKeys) {
                $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
                $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
              } else {
                $prevElement = $elements.eq(Math.max(0, i - 1));
                $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              }
              return;
            }
          });

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Tabs', {
            open: function () {
              $element.find('[role="tab"]').focus();
              _this._handleTabChange($element);
            },
            previous: function () {
              $prevElement.find('[role="tab"]').focus();
              _this._handleTabChange($prevElement);
            },
            next: function () {
              $nextElement.find('[role="tab"]').focus();
              _this._handleTabChange($nextElement);
            },
            handled: function () {
              e.stopPropagation();
              e.preventDefault();
            }
          });
        });
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to open.
       * @fires Tabs#change
       * @function
       */

    }, {
      key: '_handleTabChange',
      value: function _handleTabChange($target) {
        var $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash),
            $oldTab = this.$element.find('.' + this.options.linkClass + '.is-active').removeClass('is-active').find('[role="tab"]').attr({ 'aria-selected': 'false' });

        $('#' + $oldTab.attr('aria-controls')).removeClass('is-active').attr({ 'aria-hidden': 'true' });

        $target.addClass('is-active');

        $tabLink.attr({ 'aria-selected': 'true' });

        $targetContent.addClass('is-active').attr({ 'aria-hidden': 'false' });

        /**
         * Fires when the plugin has successfully changed tabs.
         * @event Tabs#change
         */
        this.$element.trigger('change.zf.tabs', [$target]);
      }

      /**
       * Public method for selecting a content pane to display.
       * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
       * @function
       */

    }, {
      key: 'selectTab',
      value: function selectTab(elem) {
        var idStr;

        if (typeof elem === 'object') {
          idStr = elem[0].id;
        } else {
          idStr = elem;
        }

        if (idStr.indexOf('#') < 0) {
          idStr = '#' + idStr;
        }

        var $target = this.$tabTitles.find('[href="' + idStr + '"]').parent('.' + this.options.linkClass);

        this._handleTabChange($target);
      }
    }, {
      key: '_setHeight',

      /**
       * Sets the height of each panel to the height of the tallest panel.
       * If enabled in options, gets called on media query change.
       * If loading content via external source, can be called directly or with _reflow.
       * @function
       * @private
       */
      value: function _setHeight() {
        var max = 0;
        this.$tabContent.find('.' + this.options.panelClass).css('height', '').each(function () {
          var panel = $(this),
              isActive = panel.hasClass('is-active');

          if (!isActive) {
            panel.css({ 'visibility': 'hidden', 'display': 'block' });
          }

          var temp = this.getBoundingClientRect().height;

          if (!isActive) {
            panel.css({
              'visibility': '',
              'display': ''
            });
          }

          max = temp > max ? temp : max;
        }).css('height', max + 'px');
      }

      /**
       * Destroys an instance of an tabs.
       * @fires Tabs#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('.' + this.options.linkClass).off('.zf.tabs').hide().end().find('.' + this.options.panelClass).hide();

        if (this.options.matchHeight) {
          if (this._setHeightMqHandler != null) {
            $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
          }
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tabs;
  }();

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * @option
     * @example false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @example true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @example false
     */
    matchHeight: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @example 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the content containers.
     * @option
     * @example 'tabs-panel'
     */
    panelClass: 'tabs-panel'
  };

  function checkClass($elem) {
    return $elem.hasClass('is-active');
  }

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  var Toggler = function () {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Toggler(element, options) {
      _classCallCheck(this, Toggler);

      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */


    _createClass(Toggler, [{
      key: '_init',
      value: function _init() {
        var input;
        // Parse animation classes if they were set
        if (this.options.animate) {
          input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }
        // Otherwise, parse toggle class
        else {
            input = this.$element.data('toggler');
            // Allow for a . at the beginning of the string
            this.className = input[0] === '.' ? input.slice(1) : input;
          }

        // Add ARIA attributes to triggers
        var id = this.$element[0].id;
        $('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-controls', id);
        // If the target is hidden, add aria-hidden
        this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
      }

      /**
       * Initializes events for the toggle trigger.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
      }

      /**
       * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
       * @function
       * @fires Toggler#on
       * @fires Toggler#off
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
      }
    }, {
      key: '_toggleClass',
      value: function _toggleClass() {
        this.$element.toggleClass(this.className);

        var isOn = this.$element.hasClass(this.className);
        if (isOn) {
          /**
           * Fires if the target element has the class after a toggle.
           * @event Toggler#on
           */
          this.$element.trigger('on.zf.toggler');
        } else {
          /**
           * Fires if the target element does not have the class after a toggle.
           * @event Toggler#off
           */
          this.$element.trigger('off.zf.toggler');
        }

        this._updateARIA(isOn);
      }
    }, {
      key: '_toggleAnimate',
      value: function _toggleAnimate() {
        var _this = this;

        if (this.$element.is(':hidden')) {
          Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
            _this._updateARIA(true);
            this.trigger('on.zf.toggler');
          });
        } else {
          Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
            _this._updateARIA(false);
            this.trigger('off.zf.toggler');
          });
        }
      }
    }, {
      key: '_updateARIA',
      value: function _updateARIA(isOn) {
        this.$element.attr('aria-expanded', isOn ? true : false);
      }

      /**
       * Destroys the instance of Toggler on the element.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.toggler');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Toggler;
  }();

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Tooltip = function () {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    function Tooltip(element, options) {
      _classCallCheck(this, Tooltip);

      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */


    _createClass(Tooltip, [{
      key: '_init',
      value: function _init() {
        var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

        this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
        this.options.tipText = this.options.tipText || this.$element.attr('title');
        this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

        this.template.appendTo(document.body).text(this.options.tipText).hide();

        this.$element.attr({
          'title': '',
          'aria-describedby': elemId,
          'data-yeti-box': elemId,
          'data-toggle': elemId,
          'data-resize': elemId
        }).addClass(this.triggerClass);

        //helper variables to track movement on collisions
        this.usedPositions = [];
        this.counter = 4;
        this.classChanged = false;

        this._events();
      }

      /**
       * Grabs the current positioning class, if present, and returns the value or an empty string.
       * @private
       */

    }, {
      key: '_getPositionClass',
      value: function _getPositionClass(element) {
        if (!element) {
          return '';
        }
        // var position = element.attr('class').match(/top|left|right/g);
        var position = element[0].className.match(/\b(top|left|right)\b/g);
        position = position ? position[0] : '';
        return position;
      }
    }, {
      key: '_buildTemplate',

      /**
       * builds the tooltip element, adds attributes, and returns the template.
       * @private
       */
      value: function _buildTemplate(id) {
        var templateClasses = (this.options.tooltipClass + ' ' + this.options.positionClass + ' ' + this.options.templateClasses).trim();
        var $template = $('<div></div>').addClass(templateClasses).attr({
          'role': 'tooltip',
          'aria-hidden': true,
          'data-is-active': false,
          'data-is-focus': false,
          'id': id
        });
        return $template;
      }

      /**
       * Function that gets called if a collision event is detected.
       * @param {String} position - positioning class to try
       * @private
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');

        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.template.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.template.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.template.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
       * if the tooltip is larger than the screen width, default to full width - any user selected margin
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        var position = this._getPositionClass(this.template),
            $tipDims = Foundation.Box.GetDimensions(this.template),
            $anchorDims = Foundation.Box.GetDimensions(this.$element),
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
            _this = this;

        if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
          this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          return false;
        }

        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * reveals the tooltip, and fires an event to close any other open tooltips on the page
       * @fires Tooltip#closeme
       * @fires Tooltip#show
       * @function
       */

    }, {
      key: 'show',
      value: function show() {
        if (this.options.showOn !== 'all' && !Foundation.MediaQuery.atLeast(this.options.showOn)) {
          // console.error('The screen is too small to display this tooltip');
          return false;
        }

        var _this = this;
        this.template.css('visibility', 'hidden').show();
        this._setPosition();

        /**
         * Fires to close all other open tooltips on the page
         * @event Closeme#tooltip
         */
        this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

        this.template.attr({
          'data-is-active': true,
          'aria-hidden': false
        });
        _this.isActive = true;
        // console.log(this.template);
        this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
          //maybe do stuff?
        });
        /**
         * Fires when the tooltip is shown
         * @event Tooltip#show
         */
        this.$element.trigger('show.zf.tooltip');
      }

      /**
       * Hides the current tooltip, and resets the positioning class if it was changed due to collision
       * @fires Tooltip#hide
       * @function
       */

    }, {
      key: 'hide',
      value: function hide() {
        // console.log('hiding', this.$element.data('yeti-box'));
        var _this = this;
        this.template.stop().attr({
          'aria-hidden': true,
          'data-is-active': false
        }).fadeOut(this.options.fadeOutDuration, function () {
          _this.isActive = false;
          _this.isClick = false;
          if (_this.classChanged) {
            _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

            _this.usedPositions = [];
            _this.counter = 4;
            _this.classChanged = false;
          }
        });
        /**
         * fires when the tooltip is hidden
         * @event Tooltip#hide
         */
        this.$element.trigger('hide.zf.tooltip');
      }

      /**
       * adds event listeners for the tooltip and its anchor
       * TODO combine some of the listeners like focus and mouseenter, etc.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        var $template = this.template;
        var isFocus = false;

        if (!this.options.disableHover) {

          this.$element.on('mouseenter.zf.tooltip', function (e) {
            if (!_this.isActive) {
              _this.timeout = setTimeout(function () {
                _this.show();
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.tooltip', function (e) {
            clearTimeout(_this.timeout);
            if (!isFocus || _this.isClick && !_this.options.clickOpen) {
              _this.hide();
            }
          });
        }

        if (this.options.clickOpen) {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            if (_this.isClick) {
              //_this.hide();
              // _this.isClick = false;
            } else {
              _this.isClick = true;
              if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
                _this.show();
              }
            }
          });
        } else {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            _this.isClick = true;
          });
        }

        if (!this.options.disableForTouch) {
          this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
            _this.isActive ? _this.hide() : _this.show();
          });
        }

        this.$element.on({
          // 'toggle.zf.trigger': this.toggle.bind(this),
          // 'close.zf.trigger': this.hide.bind(this)
          'close.zf.trigger': this.hide.bind(this)
        });

        this.$element.on('focus.zf.tooltip', function (e) {
          isFocus = true;
          if (_this.isClick) {
            // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
            // a real focus, otherwise on hover and come back we get bad behavior
            if (!_this.options.clickOpen) {
              isFocus = false;
            }
            return false;
          } else {
            _this.show();
          }
        }).on('focusout.zf.tooltip', function (e) {
          isFocus = false;
          _this.isClick = false;
          _this.hide();
        }).on('resizeme.zf.trigger', function () {
          if (_this.isActive) {
            _this._setPosition();
          }
        });
      }

      /**
       * adds a toggle method, in addition to the static show() & hide() functions
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.hide();
        } else {
          this.show();
        }
      }

      /**
       * Destroys an instance of tooltip, removes template element from the view.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tootip')
        //  .removeClass('has-tip')
        .removeAttr('aria-describedby').removeAttr('data-yeti-box').removeAttr('data-toggle').removeAttr('data-resize');

        this.template.remove();

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tooltip;
  }();

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @example 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @example 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @example 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @example 'my-cool-tip-class'
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @example 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @example 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @example 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @example '&lt;div class="tooltip"&gt;&lt;/div&gt;'
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @example 'Some cool space fact here.'
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @example true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @example 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @example 12
     */
    hOffset: 12
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;"use strict";

var objectFitImages = function () {
  "use strict";
  var e = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";var t = /(object-fit|object-position)\s*:\s*([^;$"'\s]+)/g;var i = "object-fit" in document.createElement("i").style;var n = false;function r(e) {
    var i = getComputedStyle(e).fontFamily;var n;var r = {};while ((n = t.exec(i)) !== null) {
      r[n[1]] = n[2];
    }return r;
  }function o(t, i) {
    var n = r(t);if (!n["object-fit"] || n["object-fit"] === "fill") {
      return;
    }i = i || t.currentSrc || t.src;if (t.srcset) {
      t.srcset = "";
    }if (!t[e]) {
      t.src = e;a(t);
    }t[e] = t[e] || { s: i };t.style.backgroundImage = "url(" + i + ")";t.style.backgroundPosition = n["object-position"] || "center";t.style.backgroundRepeat = "no-repeat";if (n["object-fit"].indexOf("scale-down") < 0) {
      t.style.backgroundSize = n["object-fit"].replace("none", "auto");
    } else {
      if (!t[e].i) {
        t[e].i = new Image();t[e].i.src = i;
      }(function o() {
        if (t[e].i.naturalWidth) {
          if (t[e].i.naturalWidth > t.width || t[e].i.naturalHeight > t.height) {
            t.style.backgroundSize = "contain";
          } else {
            t.style.backgroundSize = "auto";
          }return;
        }setTimeout(o, 100);
      })();
    }
  }function a(t) {
    var i = { get: function () {
        return t[e].s;
      }, set: function (i) {
        delete t[e].i;return o(t, i);
      } };Object.defineProperty(t, "src", i);Object.defineProperty(t, "currentSrc", { get: i.get });
  }function c(e) {
    window.addEventListener("resize", f.bind(null, e));
  }function u(e) {
    if (e.target.tagName === "IMG") {
      o(e.target);
    }
  }function f(e, t) {
    if (i) {
      return false;
    }var r = !n && !e;t = t || {};e = e || "img";if (typeof e === "string") {
      e = document.querySelectorAll("img");
    } else if (!e.length) {
      e = [e];
    }for (var a = 0; a < e.length; a++) {
      o(e[a]);
    }if (r) {
      document.body.addEventListener("load", u, true);n = true;e = "img";
    }if (t.watchMQ) {
      c(e);
    }
  }return f;
}();
;"use strict";

/*! jQuery Validation Plugin - v1.15.1 - 7/22/2016
 * http://jqueryvalidation.org/
 * Copyright (c) 2016 Jörn Zaefferer; Licensed MIT */
!function (a) {
  "function" == typeof define && define.amd ? define(["jquery"], a) : "object" == typeof module && module.exports ? module.exports = a(require("jquery")) : a(jQuery);
}(function (a) {
  a.extend(a.fn, { validate: function (b) {
      if (!this.length) return void (b && b.debug && window.console && console.warn("Nothing selected, can't validate, returning nothing."));var c = a.data(this[0], "validator");return c ? c : (this.attr("novalidate", "novalidate"), c = new a.validator(b, this[0]), a.data(this[0], "validator", c), c.settings.onsubmit && (this.on("click.validate", ":submit", function (b) {
        c.settings.submitHandler && (c.submitButton = b.target), a(this).hasClass("cancel") && (c.cancelSubmit = !0), void 0 !== a(this).attr("formnovalidate") && (c.cancelSubmit = !0);
      }), this.on("submit.validate", function (b) {
        function d() {
          var d, e;return !c.settings.submitHandler || (c.submitButton && (d = a("<input type='hidden'/>").attr("name", c.submitButton.name).val(a(c.submitButton).val()).appendTo(c.currentForm)), e = c.settings.submitHandler.call(c, c.currentForm, b), c.submitButton && d.remove(), void 0 !== e && e);
        }return c.settings.debug && b.preventDefault(), c.cancelSubmit ? (c.cancelSubmit = !1, d()) : c.form() ? c.pendingRequest ? (c.formSubmitted = !0, !1) : d() : (c.focusInvalid(), !1);
      })), c);
    }, valid: function () {
      var b, c, d;return a(this[0]).is("form") ? b = this.validate().form() : (d = [], b = !0, c = a(this[0].form).validate(), this.each(function () {
        b = c.element(this) && b, b || (d = d.concat(c.errorList));
      }), c.errorList = d), b;
    }, rules: function (b, c) {
      var d,
          e,
          f,
          g,
          h,
          i,
          j = this[0];if (null != j && null != j.form) {
        if (b) switch (d = a.data(j.form, "validator").settings, e = d.rules, f = a.validator.staticRules(j), b) {case "add":
            a.extend(f, a.validator.normalizeRule(c)), delete f.messages, e[j.name] = f, c.messages && (d.messages[j.name] = a.extend(d.messages[j.name], c.messages));break;case "remove":
            return c ? (i = {}, a.each(c.split(/\s/), function (b, c) {
              i[c] = f[c], delete f[c], "required" === c && a(j).removeAttr("aria-required");
            }), i) : (delete e[j.name], f);}return g = a.validator.normalizeRules(a.extend({}, a.validator.classRules(j), a.validator.attributeRules(j), a.validator.dataRules(j), a.validator.staticRules(j)), j), g.required && (h = g.required, delete g.required, g = a.extend({ required: h }, g), a(j).attr("aria-required", "true")), g.remote && (h = g.remote, delete g.remote, g = a.extend(g, { remote: h })), g;
      }
    } }), a.extend(a.expr[":"], { blank: function (b) {
      return !a.trim("" + a(b).val());
    }, filled: function (b) {
      var c = a(b).val();return null !== c && !!a.trim("" + c);
    }, unchecked: function (b) {
      return !a(b).prop("checked");
    } }), a.validator = function (b, c) {
    this.settings = a.extend(!0, {}, a.validator.defaults, b), this.currentForm = c, this.init();
  }, a.validator.format = function (b, c) {
    return 1 === arguments.length ? function () {
      var c = a.makeArray(arguments);return c.unshift(b), a.validator.format.apply(this, c);
    } : void 0 === c ? b : (arguments.length > 2 && c.constructor !== Array && (c = a.makeArray(arguments).slice(1)), c.constructor !== Array && (c = [c]), a.each(c, function (a, c) {
      b = b.replace(new RegExp("\\{" + a + "\\}", "g"), function () {
        return c;
      });
    }), b);
  }, a.extend(a.validator, { defaults: { messages: {}, groups: {}, rules: {}, errorClass: "error", pendingClass: "pending", validClass: "valid", errorElement: "label", focusCleanup: !1, focusInvalid: !0, errorContainer: a([]), errorLabelContainer: a([]), onsubmit: !0, ignore: ":hidden", ignoreTitle: !1, onfocusin: function (a) {
        this.lastActive = a, this.settings.focusCleanup && (this.settings.unhighlight && this.settings.unhighlight.call(this, a, this.settings.errorClass, this.settings.validClass), this.hideThese(this.errorsFor(a)));
      }, onfocusout: function (a) {
        this.checkable(a) || !(a.name in this.submitted) && this.optional(a) || this.element(a);
      }, onkeyup: function (b, c) {
        var d = [16, 17, 18, 20, 35, 36, 37, 38, 39, 40, 45, 144, 225];9 === c.which && "" === this.elementValue(b) || a.inArray(c.keyCode, d) !== -1 || (b.name in this.submitted || b.name in this.invalid) && this.element(b);
      }, onclick: function (a) {
        a.name in this.submitted ? this.element(a) : a.parentNode.name in this.submitted && this.element(a.parentNode);
      }, highlight: function (b, c, d) {
        "radio" === b.type ? this.findByName(b.name).addClass(c).removeClass(d) : a(b).addClass(c).removeClass(d);
      }, unhighlight: function (b, c, d) {
        "radio" === b.type ? this.findByName(b.name).removeClass(c).addClass(d) : a(b).removeClass(c).addClass(d);
      } }, setDefaults: function (b) {
      a.extend(a.validator.defaults, b);
    }, messages: { required: "This field is required.", remote: "Please fix this field.", email: "Please enter a valid email address.", url: "Please enter a valid URL.", date: "Please enter a valid date.", dateISO: "Please enter a valid date (ISO).", number: "Please enter a valid number.", digits: "Please enter only digits.", equalTo: "Please enter the same value again.", maxlength: a.validator.format("Please enter no more than {0} characters."), minlength: a.validator.format("Please enter at least {0} characters."), rangelength: a.validator.format("Please enter a value between {0} and {1} characters long."), range: a.validator.format("Please enter a value between {0} and {1}."), max: a.validator.format("Please enter a value less than or equal to {0}."), min: a.validator.format("Please enter a value greater than or equal to {0}."), step: a.validator.format("Please enter a multiple of {0}.") }, autoCreateRanges: !1, prototype: { init: function () {
        function b(b) {
          !this.form && this.hasAttribute("contenteditable") && (this.form = a(this).closest("form")[0]);var c = a.data(this.form, "validator"),
              d = "on" + b.type.replace(/^validate/, ""),
              e = c.settings;e[d] && !a(this).is(e.ignore) && e[d].call(c, this, b);
        }this.labelContainer = a(this.settings.errorLabelContainer), this.errorContext = this.labelContainer.length && this.labelContainer || a(this.currentForm), this.containers = a(this.settings.errorContainer).add(this.settings.errorLabelContainer), this.submitted = {}, this.valueCache = {}, this.pendingRequest = 0, this.pending = {}, this.invalid = {}, this.reset();var c,
            d = this.groups = {};a.each(this.settings.groups, function (b, c) {
          "string" == typeof c && (c = c.split(/\s/)), a.each(c, function (a, c) {
            d[c] = b;
          });
        }), c = this.settings.rules, a.each(c, function (b, d) {
          c[b] = a.validator.normalizeRule(d);
        }), a(this.currentForm).on("focusin.validate focusout.validate keyup.validate", ":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], [type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], [type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], [type='radio'], [type='checkbox'], [contenteditable]", b).on("click.validate", "select, option, [type='radio'], [type='checkbox']", b), this.settings.invalidHandler && a(this.currentForm).on("invalid-form.validate", this.settings.invalidHandler), a(this.currentForm).find("[required], [data-rule-required], .required").attr("aria-required", "true");
      }, form: function () {
        return this.checkForm(), a.extend(this.submitted, this.errorMap), this.invalid = a.extend({}, this.errorMap), this.valid() || a(this.currentForm).triggerHandler("invalid-form", [this]), this.showErrors(), this.valid();
      }, checkForm: function () {
        this.prepareForm();for (var a = 0, b = this.currentElements = this.elements(); b[a]; a++) {
          this.check(b[a]);
        }return this.valid();
      }, element: function (b) {
        var c,
            d,
            e = this.clean(b),
            f = this.validationTargetFor(e),
            g = this,
            h = !0;return void 0 === f ? delete this.invalid[e.name] : (this.prepareElement(f), this.currentElements = a(f), d = this.groups[f.name], d && a.each(this.groups, function (a, b) {
          b === d && a !== f.name && (e = g.validationTargetFor(g.clean(g.findByName(a))), e && e.name in g.invalid && (g.currentElements.push(e), h = g.check(e) && h));
        }), c = this.check(f) !== !1, h = h && c, c ? this.invalid[f.name] = !1 : this.invalid[f.name] = !0, this.numberOfInvalids() || (this.toHide = this.toHide.add(this.containers)), this.showErrors(), a(b).attr("aria-invalid", !c)), h;
      }, showErrors: function (b) {
        if (b) {
          var c = this;a.extend(this.errorMap, b), this.errorList = a.map(this.errorMap, function (a, b) {
            return { message: a, element: c.findByName(b)[0] };
          }), this.successList = a.grep(this.successList, function (a) {
            return !(a.name in b);
          });
        }this.settings.showErrors ? this.settings.showErrors.call(this, this.errorMap, this.errorList) : this.defaultShowErrors();
      }, resetForm: function () {
        a.fn.resetForm && a(this.currentForm).resetForm(), this.invalid = {}, this.submitted = {}, this.prepareForm(), this.hideErrors();var b = this.elements().removeData("previousValue").removeAttr("aria-invalid");this.resetElements(b);
      }, resetElements: function (a) {
        var b;if (this.settings.unhighlight) for (b = 0; a[b]; b++) {
          this.settings.unhighlight.call(this, a[b], this.settings.errorClass, ""), this.findByName(a[b].name).removeClass(this.settings.validClass);
        } else a.removeClass(this.settings.errorClass).removeClass(this.settings.validClass);
      }, numberOfInvalids: function () {
        return this.objectLength(this.invalid);
      }, objectLength: function (a) {
        var b,
            c = 0;for (b in a) {
          a[b] && c++;
        }return c;
      }, hideErrors: function () {
        this.hideThese(this.toHide);
      }, hideThese: function (a) {
        a.not(this.containers).text(""), this.addWrapper(a).hide();
      }, valid: function () {
        return 0 === this.size();
      }, size: function () {
        return this.errorList.length;
      }, focusInvalid: function () {
        if (this.settings.focusInvalid) try {
          a(this.findLastActive() || this.errorList.length && this.errorList[0].element || []).filter(":visible").focus().trigger("focusin");
        } catch (a) {}
      }, findLastActive: function () {
        var b = this.lastActive;return b && 1 === a.grep(this.errorList, function (a) {
          return a.element.name === b.name;
        }).length && b;
      }, elements: function () {
        var b = this,
            c = {};return a(this.currentForm).find("input, select, textarea, [contenteditable]").not(":submit, :reset, :image, :disabled").not(this.settings.ignore).filter(function () {
          var d = this.name || a(this).attr("name");return !d && b.settings.debug && window.console && console.error("%o has no name assigned", this), this.hasAttribute("contenteditable") && (this.form = a(this).closest("form")[0]), !(d in c || !b.objectLength(a(this).rules())) && (c[d] = !0, !0);
        });
      }, clean: function (b) {
        return a(b)[0];
      }, errors: function () {
        var b = this.settings.errorClass.split(" ").join(".");return a(this.settings.errorElement + "." + b, this.errorContext);
      }, resetInternals: function () {
        this.successList = [], this.errorList = [], this.errorMap = {}, this.toShow = a([]), this.toHide = a([]);
      }, reset: function () {
        this.resetInternals(), this.currentElements = a([]);
      }, prepareForm: function () {
        this.reset(), this.toHide = this.errors().add(this.containers);
      }, prepareElement: function (a) {
        this.reset(), this.toHide = this.errorsFor(a);
      }, elementValue: function (b) {
        var c,
            d,
            e = a(b),
            f = b.type;return "radio" === f || "checkbox" === f ? this.findByName(b.name).filter(":checked").val() : "number" === f && "undefined" != typeof b.validity ? b.validity.badInput ? "NaN" : e.val() : (c = b.hasAttribute("contenteditable") ? e.text() : e.val(), "file" === f ? "C:\\fakepath\\" === c.substr(0, 12) ? c.substr(12) : (d = c.lastIndexOf("/"), d >= 0 ? c.substr(d + 1) : (d = c.lastIndexOf("\\"), d >= 0 ? c.substr(d + 1) : c)) : "string" == typeof c ? c.replace(/\r/g, "") : c);
      }, check: function (b) {
        b = this.validationTargetFor(this.clean(b));var c,
            d,
            e,
            f = a(b).rules(),
            g = a.map(f, function (a, b) {
          return b;
        }).length,
            h = !1,
            i = this.elementValue(b);if ("function" == typeof f.normalizer) {
          if (i = f.normalizer.call(b, i), "string" != typeof i) throw new TypeError("The normalizer should return a string value.");delete f.normalizer;
        }for (d in f) {
          e = { method: d, parameters: f[d] };try {
            if (c = a.validator.methods[d].call(this, i, b, e.parameters), "dependency-mismatch" === c && 1 === g) {
              h = !0;continue;
            }if (h = !1, "pending" === c) return void (this.toHide = this.toHide.not(this.errorsFor(b)));if (!c) return this.formatAndAdd(b, e), !1;
          } catch (a) {
            throw this.settings.debug && window.console && console.log("Exception occurred when checking element " + b.id + ", check the '" + e.method + "' method.", a), a instanceof TypeError && (a.message += ".  Exception occurred when checking element " + b.id + ", check the '" + e.method + "' method."), a;
          }
        }if (!h) return this.objectLength(f) && this.successList.push(b), !0;
      }, customDataMessage: function (b, c) {
        return a(b).data("msg" + c.charAt(0).toUpperCase() + c.substring(1).toLowerCase()) || a(b).data("msg");
      }, customMessage: function (a, b) {
        var c = this.settings.messages[a];return c && (c.constructor === String ? c : c[b]);
      }, findDefined: function () {
        for (var a = 0; a < arguments.length; a++) {
          if (void 0 !== arguments[a]) return arguments[a];
        }
      }, defaultMessage: function (b, c) {
        "string" == typeof c && (c = { method: c });var d = this.findDefined(this.customMessage(b.name, c.method), this.customDataMessage(b, c.method), !this.settings.ignoreTitle && b.title || void 0, a.validator.messages[c.method], "<strong>Warning: No message defined for " + b.name + "</strong>"),
            e = /\$?\{(\d+)\}/g;return "function" == typeof d ? d = d.call(this, c.parameters, b) : e.test(d) && (d = a.validator.format(d.replace(e, "{$1}"), c.parameters)), d;
      }, formatAndAdd: function (a, b) {
        var c = this.defaultMessage(a, b);this.errorList.push({ message: c, element: a, method: b.method }), this.errorMap[a.name] = c, this.submitted[a.name] = c;
      }, addWrapper: function (a) {
        return this.settings.wrapper && (a = a.add(a.parent(this.settings.wrapper))), a;
      }, defaultShowErrors: function () {
        var a, b, c;for (a = 0; this.errorList[a]; a++) {
          c = this.errorList[a], this.settings.highlight && this.settings.highlight.call(this, c.element, this.settings.errorClass, this.settings.validClass), this.showLabel(c.element, c.message);
        }if (this.errorList.length && (this.toShow = this.toShow.add(this.containers)), this.settings.success) for (a = 0; this.successList[a]; a++) {
          this.showLabel(this.successList[a]);
        }if (this.settings.unhighlight) for (a = 0, b = this.validElements(); b[a]; a++) {
          this.settings.unhighlight.call(this, b[a], this.settings.errorClass, this.settings.validClass);
        }this.toHide = this.toHide.not(this.toShow), this.hideErrors(), this.addWrapper(this.toShow).show();
      }, validElements: function () {
        return this.currentElements.not(this.invalidElements());
      }, invalidElements: function () {
        return a(this.errorList).map(function () {
          return this.element;
        });
      }, showLabel: function (b, c) {
        var d,
            e,
            f,
            g,
            h = this.errorsFor(b),
            i = this.idOrName(b),
            j = a(b).attr("aria-describedby");h.length ? (h.removeClass(this.settings.validClass).addClass(this.settings.errorClass), h.html(c)) : (h = a("<" + this.settings.errorElement + ">").attr("id", i + "-error").addClass(this.settings.errorClass).html(c || ""), d = h, this.settings.wrapper && (d = h.hide().show().wrap("<" + this.settings.wrapper + "/>").parent()), this.labelContainer.length ? this.labelContainer.append(d) : this.settings.errorPlacement ? this.settings.errorPlacement.call(this, d, a(b)) : d.insertAfter(b), h.is("label") ? h.attr("for", i) : 0 === h.parents("label[for='" + this.escapeCssMeta(i) + "']").length && (f = h.attr("id"), j ? j.match(new RegExp("\\b" + this.escapeCssMeta(f) + "\\b")) || (j += " " + f) : j = f, a(b).attr("aria-describedby", j), e = this.groups[b.name], e && (g = this, a.each(g.groups, function (b, c) {
          c === e && a("[name='" + g.escapeCssMeta(b) + "']", g.currentForm).attr("aria-describedby", h.attr("id"));
        })))), !c && this.settings.success && (h.text(""), "string" == typeof this.settings.success ? h.addClass(this.settings.success) : this.settings.success(h, b)), this.toShow = this.toShow.add(h);
      }, errorsFor: function (b) {
        var c = this.escapeCssMeta(this.idOrName(b)),
            d = a(b).attr("aria-describedby"),
            e = "label[for='" + c + "'], label[for='" + c + "'] *";return d && (e = e + ", #" + this.escapeCssMeta(d).replace(/\s+/g, ", #")), this.errors().filter(e);
      }, escapeCssMeta: function (a) {
        return a.replace(/([\\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, "\\$1");
      }, idOrName: function (a) {
        return this.groups[a.name] || (this.checkable(a) ? a.name : a.id || a.name);
      }, validationTargetFor: function (b) {
        return this.checkable(b) && (b = this.findByName(b.name)), a(b).not(this.settings.ignore)[0];
      }, checkable: function (a) {
        return (/radio|checkbox/i.test(a.type)
        );
      }, findByName: function (b) {
        return a(this.currentForm).find("[name='" + this.escapeCssMeta(b) + "']");
      }, getLength: function (b, c) {
        switch (c.nodeName.toLowerCase()) {case "select":
            return a("option:selected", c).length;case "input":
            if (this.checkable(c)) return this.findByName(c.name).filter(":checked").length;}return b.length;
      }, depend: function (a, b) {
        return !this.dependTypes[typeof a] || this.dependTypes[typeof a](a, b);
      }, dependTypes: { boolean: function (a) {
          return a;
        }, string: function (b, c) {
          return !!a(b, c.form).length;
        }, function: function (a, b) {
          return a(b);
        } }, optional: function (b) {
        var c = this.elementValue(b);return !a.validator.methods.required.call(this, c, b) && "dependency-mismatch";
      }, startRequest: function (b) {
        this.pending[b.name] || (this.pendingRequest++, a(b).addClass(this.settings.pendingClass), this.pending[b.name] = !0);
      }, stopRequest: function (b, c) {
        this.pendingRequest--, this.pendingRequest < 0 && (this.pendingRequest = 0), delete this.pending[b.name], a(b).removeClass(this.settings.pendingClass), c && 0 === this.pendingRequest && this.formSubmitted && this.form() ? (a(this.currentForm).submit(), this.formSubmitted = !1) : !c && 0 === this.pendingRequest && this.formSubmitted && (a(this.currentForm).triggerHandler("invalid-form", [this]), this.formSubmitted = !1);
      }, previousValue: function (b, c) {
        return c = "string" == typeof c && c || "remote", a.data(b, "previousValue") || a.data(b, "previousValue", { old: null, valid: !0, message: this.defaultMessage(b, { method: c }) });
      }, destroy: function () {
        this.resetForm(), a(this.currentForm).off(".validate").removeData("validator").find(".validate-equalTo-blur").off(".validate-equalTo").removeClass("validate-equalTo-blur");
      } }, classRuleSettings: { required: { required: !0 }, email: { email: !0 }, url: { url: !0 }, date: { date: !0 }, dateISO: { dateISO: !0 }, number: { number: !0 }, digits: { digits: !0 }, creditcard: { creditcard: !0 } }, addClassRules: function (b, c) {
      b.constructor === String ? this.classRuleSettings[b] = c : a.extend(this.classRuleSettings, b);
    }, classRules: function (b) {
      var c = {},
          d = a(b).attr("class");return d && a.each(d.split(" "), function () {
        this in a.validator.classRuleSettings && a.extend(c, a.validator.classRuleSettings[this]);
      }), c;
    }, normalizeAttributeRule: function (a, b, c, d) {
      /min|max|step/.test(c) && (null === b || /number|range|text/.test(b)) && (d = Number(d), isNaN(d) && (d = void 0)), d || 0 === d ? a[c] = d : b === c && "range" !== b && (a[c] = !0);
    }, attributeRules: function (b) {
      var c,
          d,
          e = {},
          f = a(b),
          g = b.getAttribute("type");for (c in a.validator.methods) {
        "required" === c ? (d = b.getAttribute(c), "" === d && (d = !0), d = !!d) : d = f.attr(c), this.normalizeAttributeRule(e, g, c, d);
      }return e.maxlength && /-1|2147483647|524288/.test(e.maxlength) && delete e.maxlength, e;
    }, dataRules: function (b) {
      var c,
          d,
          e = {},
          f = a(b),
          g = b.getAttribute("type");for (c in a.validator.methods) {
        d = f.data("rule" + c.charAt(0).toUpperCase() + c.substring(1).toLowerCase()), this.normalizeAttributeRule(e, g, c, d);
      }return e;
    }, staticRules: function (b) {
      var c = {},
          d = a.data(b.form, "validator");return d.settings.rules && (c = a.validator.normalizeRule(d.settings.rules[b.name]) || {}), c;
    }, normalizeRules: function (b, c) {
      return a.each(b, function (d, e) {
        if (e === !1) return void delete b[d];if (e.param || e.depends) {
          var f = !0;switch (typeof e.depends) {case "string":
              f = !!a(e.depends, c.form).length;break;case "function":
              f = e.depends.call(c, c);}f ? b[d] = void 0 === e.param || e.param : (a.data(c.form, "validator").resetElements(a(c)), delete b[d]);
        }
      }), a.each(b, function (d, e) {
        b[d] = a.isFunction(e) && "normalizer" !== d ? e(c) : e;
      }), a.each(["minlength", "maxlength"], function () {
        b[this] && (b[this] = Number(b[this]));
      }), a.each(["rangelength", "range"], function () {
        var c;b[this] && (a.isArray(b[this]) ? b[this] = [Number(b[this][0]), Number(b[this][1])] : "string" == typeof b[this] && (c = b[this].replace(/[\[\]]/g, "").split(/[\s,]+/), b[this] = [Number(c[0]), Number(c[1])]));
      }), a.validator.autoCreateRanges && (null != b.min && null != b.max && (b.range = [b.min, b.max], delete b.min, delete b.max), null != b.minlength && null != b.maxlength && (b.rangelength = [b.minlength, b.maxlength], delete b.minlength, delete b.maxlength)), b;
    }, normalizeRule: function (b) {
      if ("string" == typeof b) {
        var c = {};a.each(b.split(/\s/), function () {
          c[this] = !0;
        }), b = c;
      }return b;
    }, addMethod: function (b, c, d) {
      a.validator.methods[b] = c, a.validator.messages[b] = void 0 !== d ? d : a.validator.messages[b], c.length < 3 && a.validator.addClassRules(b, a.validator.normalizeRule(b));
    }, methods: { required: function (b, c, d) {
        if (!this.depend(d, c)) return "dependency-mismatch";if ("select" === c.nodeName.toLowerCase()) {
          var e = a(c).val();return e && e.length > 0;
        }return this.checkable(c) ? this.getLength(b, c) > 0 : b.length > 0;
      }, email: function (a, b) {
        return this.optional(b) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(a);
      }, url: function (a, b) {
        return this.optional(b) || /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(a);
      }, date: function (a, b) {
        return this.optional(b) || !/Invalid|NaN/.test(new Date(a).toString());
      }, dateISO: function (a, b) {
        return this.optional(b) || /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(a);
      }, number: function (a, b) {
        return this.optional(b) || /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(a);
      }, digits: function (a, b) {
        return this.optional(b) || /^\d+$/.test(a);
      }, minlength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(b, c);return this.optional(c) || e >= d;
      }, maxlength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(b, c);return this.optional(c) || e <= d;
      }, rangelength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(b, c);return this.optional(c) || e >= d[0] && e <= d[1];
      }, min: function (a, b, c) {
        return this.optional(b) || a >= c;
      }, max: function (a, b, c) {
        return this.optional(b) || a <= c;
      }, range: function (a, b, c) {
        return this.optional(b) || a >= c[0] && a <= c[1];
      }, step: function (b, c, d) {
        var e,
            f = a(c).attr("type"),
            g = "Step attribute on input type " + f + " is not supported.",
            h = ["text", "number", "range"],
            i = new RegExp("\\b" + f + "\\b"),
            j = f && !i.test(h.join()),
            k = function (a) {
          var b = ("" + a).match(/(?:\.(\d+))?$/);return b && b[1] ? b[1].length : 0;
        },
            l = function (a) {
          return Math.round(a * Math.pow(10, e));
        },
            m = !0;if (j) throw new Error(g);return e = k(d), (k(b) > e || l(b) % l(d) !== 0) && (m = !1), this.optional(c) || m;
      }, equalTo: function (b, c, d) {
        var e = a(d);return this.settings.onfocusout && e.not(".validate-equalTo-blur").length && e.addClass("validate-equalTo-blur").on("blur.validate-equalTo", function () {
          a(c).valid();
        }), b === e.val();
      }, remote: function (b, c, d, e) {
        if (this.optional(c)) return "dependency-mismatch";e = "string" == typeof e && e || "remote";var f,
            g,
            h,
            i = this.previousValue(c, e);return this.settings.messages[c.name] || (this.settings.messages[c.name] = {}), i.originalMessage = i.originalMessage || this.settings.messages[c.name][e], this.settings.messages[c.name][e] = i.message, d = "string" == typeof d && { url: d } || d, h = a.param(a.extend({ data: b }, d.data)), i.old === h ? i.valid : (i.old = h, f = this, this.startRequest(c), g = {}, g[c.name] = b, a.ajax(a.extend(!0, { mode: "abort", port: "validate" + c.name, dataType: "json", data: g, context: f.currentForm, success: function (a) {
            var d,
                g,
                h,
                j = a === !0 || "true" === a;f.settings.messages[c.name][e] = i.originalMessage, j ? (h = f.formSubmitted, f.resetInternals(), f.toHide = f.errorsFor(c), f.formSubmitted = h, f.successList.push(c), f.invalid[c.name] = !1, f.showErrors()) : (d = {}, g = a || f.defaultMessage(c, { method: e, parameters: b }), d[c.name] = i.message = g, f.invalid[c.name] = !0, f.showErrors(d)), i.valid = j, f.stopRequest(c, j);
          } }, d)), "pending");
      } } });var b,
      c = {};a.ajaxPrefilter ? a.ajaxPrefilter(function (a, b, d) {
    var e = a.port;"abort" === a.mode && (c[e] && c[e].abort(), c[e] = d);
  }) : (b = a.ajax, a.ajax = function (d) {
    var e = ("mode" in d ? d : a.ajaxSettings).mode,
        f = ("port" in d ? d : a.ajaxSettings).port;return "abort" === e ? (c[f] && c[f].abort(), c[f] = b.apply(this, arguments), c[f]) : b.apply(this, arguments);
  });
});
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;'use strict';

jQuery('iframe[src*="youtube.com"]').wrap("<div class='flex-video widescreen'/>");
jQuery('iframe[src*="vimeo.com"]').wrap("<div class='flex-video widescreen vimeo'/>");
;"use strict";

jQuery(document).foundation();
;'use strict';

/*!-------------------------------------------------------
 * Instant Comment Validation - v1.0 - 30/6/2014
 * http://wordpress.org/plugins/instant-comment-validation/
 * Copyright (c) 2014 Mrinal Kanti Roy; License: GPLv2 or later
---------------------------------------------------------*/
jQuery.validator.addMethod("better_email", function (value, element) {
	// a better (but not 100% perfect) email validation
	return this.optional(element) || /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value);
}, 'Please enter a valid email address.');

jQuery(document).ready(function ($) {
	$('#commentform').validate({
		rules: {
			author: {
				required: true,
				minlength: 2
			},
			email: {
				required: true,
				email: true
			},
			comment: {
				required: true,
				minlength: 2
			}
		},
		messages: {
			author: "Please enter your name",
			email: "Please enter a valid email address",
			comment: "Please type your comment"
		},
		errorElement: "div",
		errorPlacement: function (error, element) {
			element.after(error);
		}
	});
});
;'use strict';

jQuery(function ($) {
    Foundation.reInit('equalizer');
    if ($('#content-grid-container').length) {
        //are we even on a page with infinite scroll?
        //hide existing pager
        $(".pagination-centered").hide();
        $('#content-grid-container').append('<span class="load-more"></span>');
        //$( '#content-grid-container' ).foundation(); //initialize equalizer the first time

        //Reinitialize equalizer on every ajax call
        $(document).ajaxComplete(function () {
            Foundation.reInit('equalizer'); //http://foundation.zurb.com/forum/posts/39363-reflow-equaliser
        });

        var button = $('#content-grid-container .load-more');
        var page = 2;
        var loading = false;
        var allDone = false;
        var scrollHandling = {
            allow: true,
            reallow: function () {
                scrollHandling.allow = true;
            },
            delay: 400 //(milliseconds) adjust to the highest acceptable value
        };

        $(window).scroll(function () {
            if (!loading && scrollHandling.allow) {
                if (allDone) {
                    return;
                }
                scrollHandling.allow = false;
                setTimeout(scrollHandling.reallow, scrollHandling.delay);
                var offset = $(button).offset().top - $(window).scrollTop();
                if (4000 > offset) {
                    loading = true;
                    var data = {
                        action: 'be_ajax_load_more',
                        nonce: beloadmore.nonce,
                        page: page,
                        query: beloadmore.query
                    };
                    $.post(beloadmore.url, data, function (res) {
                        if (res.success) {
                            $('.content-grid-container').append(res.data);
                            $('.content-grid-container').append(button);
                            page = page + 1;
                            loading = false;
                            if (!res.data) {
                                allDone = true;
                            }
                        } else {
                            //console.log(res);
                        }
                    }).fail(function (xhr, textStatus, e) {
                        //console.log(xhr.responseText);
                    });
                }
            }
        });
    }
});
;"use strict";

/* General site-wide scripts for MSP Fly Mag */

$('.mc_input').attr("placeholder", "Enter your email address");

//Some pages don't get equalized, so make sure they do
Foundation.reInit('equalizer');

//Activate polyfill for Object Fit on IE/Edge
objectFitImages();

//if(window.location.href.indexOf("#mc_signup") > -1) {
//	setTimeout(function(){ 
//		var shareContainer = $('#share-follow');
//		var sharePosition = shareContainer.offset().top;
//		$("html, body").animate({ scrollTop: sharePosition-40}, 500);
//	 }, 500);
//}

//Hide mobile topbar logo until we scroll down page
$(window).scroll(function () {
  //console.log($('.title-bar-title').offset().top);
  if ($('.title-bar-title').offset().top > 148) {
    $('.home .mobile-logo').removeClass('hide');
  } else {
    $('.home .mobile-logo').addClass('hide');
  }
});
;'use strict';

if ($('.photo-carousel-slides').length) {
  $('.photo-carousel-slides').slick({
    slide: 'li',
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
    asNavFor: '.photo-carousel-controls'
  });

  $('.photo-carousel-controls').slick({
    slide: 'li',
    slidesToShow: 7,
    slidesToScroll: 1,
    asNavFor: '.photo-carousel-slides',
    arrows: false,
    dots: false,
    centerMode: false,
    focusOnSelect: true
  });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub3JiaXQuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlLmpzIiwiZm91bmRhdGlvbi5yZXZlYWwuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsIm9maS5icm93c2VyLmpzIiwianF1ZXJ5LnZhbGlkYXRlLm1pbi5qcyIsIm1vdGlvbi11aS5qcyIsImZsZXgtdmlkZW8uanMiLCJpbml0LWZvdW5kYXRpb24uanMiLCJpbnN0YW50LWNvbW1lbnQtdmFsaWRhdGlvbi5qcyIsImxvYWQtbW9yZS5qcyIsIm1zcGZseS5qcyIsInBob3RvLWNhcm91c2VsLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIndoYXRJbnB1dCIsImFjdGl2ZUtleXMiLCJib2R5IiwiYnVmZmVyIiwiY3VycmVudElucHV0Iiwibm9uVHlwaW5nSW5wdXRzIiwibW91c2VXaGVlbCIsImRldGVjdFdoZWVsIiwiaWdub3JlTWFwIiwiaW5wdXRNYXAiLCJpbnB1dFR5cGVzIiwia2V5TWFwIiwicG9pbnRlck1hcCIsInRpbWVyIiwiZXZlbnRCdWZmZXIiLCJjbGVhclRpbWVyIiwic2V0SW5wdXQiLCJldmVudCIsInNldFRpbWVvdXQiLCJidWZmZXJlZEV2ZW50IiwidW5CdWZmZXJlZEV2ZW50IiwiY2xlYXJUaW1lb3V0IiwiZXZlbnRLZXkiLCJrZXkiLCJ2YWx1ZSIsInR5cGUiLCJwb2ludGVyVHlwZSIsImV2ZW50VGFyZ2V0IiwidGFyZ2V0IiwiZXZlbnRUYXJnZXROb2RlIiwibm9kZU5hbWUiLCJ0b0xvd2VyQ2FzZSIsImV2ZW50VGFyZ2V0VHlwZSIsImdldEF0dHJpYnV0ZSIsImhhc0F0dHJpYnV0ZSIsImluZGV4T2YiLCJzd2l0Y2hJbnB1dCIsImxvZ0tleXMiLCJzdHJpbmciLCJzZXRBdHRyaWJ1dGUiLCJwdXNoIiwia2V5Q29kZSIsIndoaWNoIiwic3JjRWxlbWVudCIsInVuTG9nS2V5cyIsImFycmF5UG9zIiwic3BsaWNlIiwiYmluZEV2ZW50cyIsImRvY3VtZW50IiwiUG9pbnRlckV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsIk1TUG9pbnRlckV2ZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubW91c2V3aGVlbCIsInVuZGVmaW5lZCIsIkFycmF5IiwicHJvdG90eXBlIiwiYXNrIiwia2V5cyIsInR5cGVzIiwic2V0IiwiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwidW5yZWdpc3RlclBsdWdpbiIsInJlbW92ZUF0dHIiLCJyZW1vdmVEYXRhIiwicHJvcCIsInJlSW5pdCIsInBsdWdpbnMiLCJpc0pRIiwiZWFjaCIsIl9pbml0IiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0IiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJlbmQiLCJ0Iiwic3R5bGUiLCJ0cmlnZ2VySGFuZGxlciIsInV0aWwiLCJ0aHJvdHRsZSIsImZ1bmMiLCJkZWxheSIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiY2FsbCIsInBsdWdDbGFzcyIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwia2NzIiwiayIsImtjIiwiZGVmYXVsdFF1ZXJpZXMiLCJsYW5kc2NhcGUiLCJwb3J0cmFpdCIsInJldGluYSIsInF1ZXJpZXMiLCJjdXJyZW50Iiwic2VsZiIsImV4dHJhY3RlZFN0eWxlcyIsImNzcyIsIm5hbWVkUXVlcmllcyIsInBhcnNlU3R5bGVUb09iamVjdCIsImhhc093blByb3BlcnR5IiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwib24iLCJuZXdTaXplIiwiY3VycmVudFNpemUiLCJzdHlsZU1lZGlhIiwibWVkaWEiLCJzY3JpcHQiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsImluZm8iLCJpZCIsImluc2VydEJlZm9yZSIsImdldENvbXB1dGVkU3R5bGUiLCJjdXJyZW50U3R5bGUiLCJtYXRjaE1lZGl1bSIsInRleHQiLCJzdHlsZVNoZWV0IiwiY3NzVGV4dCIsInRleHRDb250ZW50Iiwic3R5bGVPYmplY3QiLCJyZWR1Y2UiLCJyZXQiLCJwYXJhbSIsInBhcnRzIiwidmFsIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiaXNBcnJheSIsImluaXRDbGFzc2VzIiwiYWN0aXZlQ2xhc3NlcyIsIk1vdGlvbiIsImFuaW1hdGVJbiIsImFuaW1hdGlvbiIsImNiIiwiYW5pbWF0ZSIsImFuaW1hdGVPdXQiLCJNb3ZlIiwiZHVyYXRpb24iLCJhbmltIiwicHJvZyIsIm1vdmUiLCJ0cyIsImlzSW4iLCJlcSIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwibmF0dXJhbFdpZHRoIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsInByZXZlbnREZWZhdWx0IiwibW92ZVRocmVzaG9sZCIsInRpbWVUaHJlc2hvbGQiLCJzdGFydFBvc1giLCJzdGFydFBvc1kiLCJzdGFydFRpbWUiLCJlbGFwc2VkVGltZSIsImlzTW92aW5nIiwib25Ub3VjaEVuZCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvblRvdWNoTW92ZSIsIngiLCJ0b3VjaGVzIiwicGFnZVgiLCJ5IiwicGFnZVkiLCJkeCIsImR5IiwiZGlyIiwiYWJzIiwib25Ub3VjaFN0YXJ0IiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwibG9hZCIsImNoZWNrTGlzdGVuZXJzIiwiZXZlbnRzTGlzdGVuZXIiLCJyZXNpemVMaXN0ZW5lciIsInNjcm9sbExpc3RlbmVyIiwiY2xvc2VtZUxpc3RlbmVyIiwieWV0aUJveGVzIiwicGx1Z05hbWVzIiwibGlzdGVuZXJzIiwiam9pbiIsIm9mZiIsInBsdWdpbklkIiwibm90IiwiZGVib3VuY2UiLCIkbm9kZXMiLCJub2RlcyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uIiwibXV0YXRpb25SZWNvcmRzTGlzdCIsIiR0YXJnZXQiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJBYmlkZSIsImRlZmF1bHRzIiwiJGlucHV0cyIsIl9ldmVudHMiLCJyZXNldEZvcm0iLCJ2YWxpZGF0ZUZvcm0iLCJ2YWxpZGF0ZU9uIiwidmFsaWRhdGVJbnB1dCIsImxpdmVWYWxpZGF0ZSIsImlzR29vZCIsImNoZWNrZWQiLCIkZXJyb3IiLCJzaWJsaW5ncyIsImZvcm1FcnJvclNlbGVjdG9yIiwiJGxhYmVsIiwiY2xvc2VzdCIsIiRlbHMiLCJsYWJlbHMiLCJmaW5kTGFiZWwiLCIkZm9ybUVycm9yIiwiZmluZEZvcm1FcnJvciIsImxhYmVsRXJyb3JDbGFzcyIsImZvcm1FcnJvckNsYXNzIiwiaW5wdXRFcnJvckNsYXNzIiwiZ3JvdXBOYW1lIiwiJGxhYmVscyIsImZpbmRSYWRpb0xhYmVscyIsIiRmb3JtRXJyb3JzIiwicmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMiLCJjbGVhclJlcXVpcmUiLCJyZXF1aXJlZENoZWNrIiwidmFsaWRhdGVkIiwiY3VzdG9tVmFsaWRhdG9yIiwidmFsaWRhdG9yIiwiZXF1YWxUbyIsInZhbGlkYXRlUmFkaW8iLCJ2YWxpZGF0ZVRleHQiLCJtYXRjaFZhbGlkYXRpb24iLCJ2YWxpZGF0b3JzIiwiZ29vZFRvR28iLCJtZXNzYWdlIiwiYWNjIiwibm9FcnJvciIsInBhdHRlcm4iLCJpbnB1dFRleHQiLCJ2YWxpZCIsInBhdHRlcm5zIiwiUmVnRXhwIiwiJGdyb3VwIiwicmVxdWlyZWQiLCJjbGVhciIsInYiLCIkZm9ybSIsInJlbW92ZUVycm9yQ2xhc3NlcyIsImFscGhhIiwiYWxwaGFfbnVtZXJpYyIsImludGVnZXIiLCJudW1iZXIiLCJjYXJkIiwiY3Z2IiwiZW1haWwiLCJ1cmwiLCJkb21haW4iLCJkYXRldGltZSIsImRhdGUiLCJ0aW1lIiwiZGF0ZUlTTyIsIm1vbnRoX2RheV95ZWFyIiwiZGF5X21vbnRoX3llYXIiLCJjb2xvciIsIkFjY29yZGlvbiIsIiR0YWJzIiwiaWR4IiwiJGNvbnRlbnQiLCJsaW5rSWQiLCIkaW5pdEFjdGl2ZSIsImRvd24iLCIkdGFiQ29udGVudCIsImhhc0NsYXNzIiwiYWxsb3dBbGxDbG9zZWQiLCJ1cCIsInRvZ2dsZSIsIm5leHQiLCIkYSIsImZvY3VzIiwibXVsdGlFeHBhbmQiLCJwcmV2aW91cyIsInByZXYiLCJmaXJzdFRpbWUiLCIkY3VycmVudEFjdGl2ZSIsInNsaWRlRG93biIsInNsaWRlU3BlZWQiLCIkYXVudHMiLCJjYW5DbG9zZSIsInNsaWRlVXAiLCJzdG9wIiwiQWNjb3JkaW9uTWVudSIsIm11bHRpT3BlbiIsIiRtZW51TGlua3MiLCJzdWJJZCIsImlzQWN0aXZlIiwiaW5pdFBhbmVzIiwiJHN1Ym1lbnUiLCIkZWxlbWVudHMiLCIkcHJldkVsZW1lbnQiLCIkbmV4dEVsZW1lbnQiLCJtaW4iLCJwYXJlbnRzIiwib3BlbiIsImNsb3NlIiwiY2xvc2VBbGwiLCJoaWRlQWxsIiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwicGFyZW50c1VudGlsIiwiYWRkIiwiJG1lbnVzIiwiRHJpbGxkb3duIiwiJHN1Ym1lbnVBbmNob3JzIiwiJHN1Ym1lbnVzIiwiJG1lbnVJdGVtcyIsIl9wcmVwYXJlTWVudSIsIl9rZXlib2FyZEV2ZW50cyIsIiRsaW5rIiwicGFyZW50TGluayIsImNsb25lIiwicHJlcGVuZFRvIiwid3JhcCIsIiRtZW51IiwiJGJhY2siLCJwcmVwZW5kIiwiYmFja0J1dHRvbiIsIl9iYWNrIiwiJHdyYXBwZXIiLCJ3cmFwcGVyIiwiX2dldE1heERpbXMiLCJfc2hvdyIsImNsb3NlT25DbGljayIsIiRib2R5IiwiY29udGFpbnMiLCJfaGlkZUFsbCIsIl9oaWRlIiwiYmx1ciIsInJlc3VsdCIsIm51bU9mRWxlbXMiLCJ1bndyYXAiLCJyZW1vdmUiLCJEcm9wZG93biIsIiRpZCIsIiRhbmNob3IiLCJwb3NpdGlvbkNsYXNzIiwiZ2V0UG9zaXRpb25DbGFzcyIsImNvdW50ZXIiLCJ1c2VkUG9zaXRpb25zIiwidmVydGljYWxQb3NpdGlvbiIsIm1hdGNoIiwiaG9yaXpvbnRhbFBvc2l0aW9uIiwiY2xhc3NDaGFuZ2VkIiwiZGlyZWN0aW9uIiwiX3JlcG9zaXRpb24iLCJfc2V0UG9zaXRpb24iLCJob3ZlciIsInRpbWVvdXQiLCJob3ZlckRlbGF5IiwiaG92ZXJQYW5lIiwidmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzIiwidGFiX2ZvcndhcmQiLCJ0cmFwRm9jdXMiLCJ0YWJfYmFja3dhcmQiLCJhdXRvRm9jdXMiLCIkZm9jdXNhYmxlIiwiX2FkZEJvZHlIYW5kbGVyIiwiY3VyUG9zaXRpb25DbGFzcyIsIkRyb3Bkb3duTWVudSIsInN1YnMiLCJ2ZXJ0aWNhbENsYXNzIiwicmlnaHRDbGFzcyIsImFsaWdubWVudCIsImNoYW5nZWQiLCJoYXNUb3VjaCIsIm9udG91Y2hzdGFydCIsInBhckNsYXNzIiwiaGFuZGxlQ2xpY2tGbiIsImhhc1N1YiIsImhhc0NsaWNrZWQiLCJjbGlja09wZW4iLCJmb3JjZUZvbGxvdyIsImRpc2FibGVIb3ZlciIsImF1dG9jbG9zZSIsImNsb3NpbmdUaW1lIiwiaXNUYWIiLCJpbmRleCIsIm5leHRTaWJsaW5nIiwicHJldlNpYmxpbmciLCJvcGVuU3ViIiwiY2xvc2VTdWIiLCIkc2licyIsIm9sZENsYXNzIiwiJHBhcmVudExpIiwiJHRvQ2xvc2UiLCJzb21ldGhpbmdUb0Nsb3NlIiwiRXF1YWxpemVyIiwiZXFJZCIsIiR3YXRjaGVkIiwiaGFzTmVzdGVkIiwiaXNOZXN0ZWQiLCJpc09uIiwiX2JpbmRIYW5kbGVyIiwib25SZXNpemVNZUJvdW5kIiwiX29uUmVzaXplTWUiLCJvblBvc3RFcXVhbGl6ZWRCb3VuZCIsIl9vblBvc3RFcXVhbGl6ZWQiLCJpbWdzIiwidG9vU21hbGwiLCJlcXVhbGl6ZU9uIiwiX2NoZWNrTVEiLCJfcmVmbG93IiwiX3BhdXNlRXZlbnRzIiwiZXF1YWxpemVPblN0YWNrIiwiX2lzU3RhY2tlZCIsImVxdWFsaXplQnlSb3ciLCJnZXRIZWlnaHRzQnlSb3ciLCJhcHBseUhlaWdodEJ5Um93IiwiZ2V0SGVpZ2h0cyIsImFwcGx5SGVpZ2h0IiwiaGVpZ2h0cyIsImxlbiIsIm9mZnNldEhlaWdodCIsImxhc3RFbFRvcE9mZnNldCIsImdyb3VwcyIsImdyb3VwIiwiZWxPZmZzZXRUb3AiLCJqIiwibG4iLCJncm91cHNJTGVuZ3RoIiwibGVuSiIsIkludGVyY2hhbmdlIiwicnVsZXMiLCJjdXJyZW50UGF0aCIsIl9hZGRCcmVha3BvaW50cyIsIl9nZW5lcmF0ZVJ1bGVzIiwicnVsZSIsInBhdGgiLCJTUEVDSUFMX1FVRVJJRVMiLCJydWxlc0xpc3QiLCJyZXNwb25zZSIsImh0bWwiLCJNYWdlbGxhbiIsIiR0YXJnZXRzIiwiJGxpbmtzIiwiJGFjdGl2ZSIsInNjcm9sbFBvcyIsInBhcnNlSW50IiwicG9pbnRzIiwid2luSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJkb2NIZWlnaHQiLCJzY3JvbGxIZWlnaHQiLCIkdGFyIiwicHQiLCJ0aHJlc2hvbGQiLCJ0YXJnZXRQb2ludCIsImFuaW1hdGlvbkR1cmF0aW9uIiwiZWFzaW5nIiwiYW5pbWF0aW9uRWFzaW5nIiwiZGVlcExpbmtpbmciLCJsb2NhdGlvbiIsImhhc2giLCJzY3JvbGxUb0xvYyIsImNhbGNQb2ludHMiLCJfdXBkYXRlQWN0aXZlIiwiYXJyaXZhbCIsImxvYyIsImJhck9mZnNldCIsInNjcm9sbFRvcCIsIndpblBvcyIsImN1cklkeCIsImlzRG93biIsImN1clZpc2libGUiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiT3JiaXQiLCJjb250YWluZXJDbGFzcyIsIiRzbGlkZXMiLCJzbGlkZUNsYXNzIiwiJGltYWdlcyIsImluaXRBY3RpdmUiLCJ1c2VNVUkiLCJfcHJlcGFyZUZvck9yYml0IiwiYnVsbGV0cyIsIl9sb2FkQnVsbGV0cyIsImF1dG9QbGF5IiwiZ2VvU3luYyIsImFjY2Vzc2libGUiLCIkYnVsbGV0cyIsImJveE9mQnVsbGV0cyIsInRpbWVyRGVsYXkiLCJjaGFuZ2VTbGlkZSIsIl9zZXRXcmFwcGVySGVpZ2h0IiwiX3NldFNsaWRlSGVpZ2h0IiwidGVtcCIsInBhdXNlT25Ib3ZlciIsIm5hdkJ1dHRvbnMiLCIkY29udHJvbHMiLCJuZXh0Q2xhc3MiLCJwcmV2Q2xhc3MiLCIkc2xpZGUiLCJpc0xUUiIsImNob3NlblNsaWRlIiwiJGN1clNsaWRlIiwiJGZpcnN0U2xpZGUiLCIkbGFzdFNsaWRlIiwibGFzdCIsImRpckluIiwiZGlyT3V0IiwiJG5ld1NsaWRlIiwiaW5maW5pdGVXcmFwIiwiX3VwZGF0ZUJ1bGxldHMiLCIkb2xkQnVsbGV0Iiwic3BhbiIsImRldGFjaCIsIiRuZXdCdWxsZXQiLCJhcHBlbmQiLCJhbmltSW5Gcm9tUmlnaHQiLCJhbmltT3V0VG9SaWdodCIsImFuaW1JbkZyb21MZWZ0IiwiYW5pbU91dFRvTGVmdCIsIlJlc3BvbnNpdmVNZW51IiwiY3VycmVudE1xIiwiY3VycmVudFBsdWdpbiIsInJ1bGVzVHJlZSIsInJ1bGVTaXplIiwicnVsZVBsdWdpbiIsIk1lbnVQbHVnaW5zIiwiaXNFbXB0eU9iamVjdCIsIl9jaGVja01lZGlhUXVlcmllcyIsIm1hdGNoZWRNcSIsImNzc0NsYXNzIiwiZGVzdHJveSIsImRyb3Bkb3duIiwiZHJpbGxkb3duIiwiYWNjb3JkaW9uIiwiUmVzcG9uc2l2ZVRvZ2dsZSIsInRhcmdldElEIiwiJHRhcmdldE1lbnUiLCIkdG9nZ2xlciIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJSZXZlYWwiLCJjYWNoZWQiLCJtcSIsImlzTW9iaWxlIiwibW9iaWxlU25pZmYiLCJmdWxsU2NyZWVuIiwib3ZlcmxheSIsIiRvdmVybGF5IiwiX21ha2VPdmVybGF5IiwiZGVlcExpbmsiLCJvdXRlcldpZHRoIiwib3V0ZXJIZWlnaHQiLCJtYXJnaW4iLCJfdXBkYXRlUG9zaXRpb24iLCJfaGFuZGxlU3RhdGUiLCJtdWx0aXBsZU9wZW5lZCIsImFuaW1hdGlvbkluIiwiYWZ0ZXJBbmltYXRpb25Gb2N1cyIsImxvZyIsImZvY3VzYWJsZUVsZW1lbnRzIiwic2hvd0RlbGF5Iiwib3JpZ2luYWxTY3JvbGxQb3MiLCJfZXh0cmFIYW5kbGVycyIsImNsb3NlT25Fc2MiLCJhbmltYXRpb25PdXQiLCJmaW5pc2hVcCIsImhpZGVEZWxheSIsInJlc2V0T25DbG9zZSIsInJlcGxhY2VTdGF0ZSIsInRpdGxlIiwicGF0aG5hbWUiLCJidG1PZmZzZXRQY3QiLCJpUGhvbmVTbmlmZiIsImFuZHJvaWRTbmlmZiIsIlN0aWNreSIsIiRwYXJlbnQiLCJ3YXNXcmFwcGVkIiwiJGNvbnRhaW5lciIsImNvbnRhaW5lciIsIndyYXBJbm5lciIsInN0aWNreUNsYXNzIiwic2Nyb2xsQ291bnQiLCJjaGVja0V2ZXJ5IiwiaXNTdHVjayIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsIl9jYWxjIiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwic2Nyb2xsIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJlbGVtSGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiY29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIiRmaXJzdFRhYiIsIiRsYXN0VGFiIiwid3JhcE9uS2V5cyIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCIkb2xkVGFiIiwiaWRTdHIiLCJwYW5lbENsYXNzIiwicGFuZWwiLCJjaGVja0NsYXNzIiwiVG9nZ2xlciIsImlucHV0IiwidG9nZ2xlQ2xhc3MiLCJfdXBkYXRlQVJJQSIsIlRvb2x0aXAiLCJpc0NsaWNrIiwiZWxlbUlkIiwiX2dldFBvc2l0aW9uQ2xhc3MiLCJ0aXBUZXh0IiwidGVtcGxhdGUiLCJfYnVpbGRUZW1wbGF0ZSIsInRyaWdnZXJDbGFzcyIsInRlbXBsYXRlQ2xhc3NlcyIsInRvb2x0aXBDbGFzcyIsIiR0ZW1wbGF0ZSIsIiR0aXBEaW1zIiwic2hvd09uIiwiZmFkZUluIiwiZmFkZUluRHVyYXRpb24iLCJmYWRlT3V0RHVyYXRpb24iLCJpc0ZvY3VzIiwiZGlzYWJsZUZvclRvdWNoIiwidG91Y2hDbG9zZVRleHQiLCJvYmplY3RGaXRJbWFnZXMiLCJuIiwiciIsImZvbnRGYW1pbHkiLCJvIiwiY3VycmVudFNyYyIsInNyYyIsInNyY3NldCIsImEiLCJzIiwiYmFja2dyb3VuZEltYWdlIiwiYmFja2dyb3VuZFBvc2l0aW9uIiwiYmFja2dyb3VuZFJlcGVhdCIsImJhY2tncm91bmRTaXplIiwiSW1hZ2UiLCJuYXR1cmFsSGVpZ2h0IiwiZGVmaW5lUHJvcGVydHkiLCJjIiwiZiIsInUiLCJ0YWdOYW1lIiwid2F0Y2hNUSIsImRlZmluZSIsImFtZCIsIm1vZHVsZSIsImV4cG9ydHMiLCJyZXF1aXJlIiwidmFsaWRhdGUiLCJiIiwiZGVidWciLCJzZXR0aW5ncyIsIm9uc3VibWl0Iiwic3VibWl0SGFuZGxlciIsInN1Ym1pdEJ1dHRvbiIsImNhbmNlbFN1Ym1pdCIsImQiLCJjdXJyZW50Rm9ybSIsImZvcm0iLCJwZW5kaW5nUmVxdWVzdCIsImZvcm1TdWJtaXR0ZWQiLCJmb2N1c0ludmFsaWQiLCJlcnJvckxpc3QiLCJnIiwiaCIsInN0YXRpY1J1bGVzIiwibm9ybWFsaXplUnVsZSIsIm1lc3NhZ2VzIiwibm9ybWFsaXplUnVsZXMiLCJjbGFzc1J1bGVzIiwiYXR0cmlidXRlUnVsZXMiLCJkYXRhUnVsZXMiLCJyZW1vdGUiLCJleHByIiwiYmxhbmsiLCJmaWxsZWQiLCJ1bmNoZWNrZWQiLCJmb3JtYXQiLCJtYWtlQXJyYXkiLCJ1bnNoaWZ0IiwiZXJyb3JDbGFzcyIsInBlbmRpbmdDbGFzcyIsInZhbGlkQ2xhc3MiLCJlcnJvckVsZW1lbnQiLCJmb2N1c0NsZWFudXAiLCJlcnJvckNvbnRhaW5lciIsImVycm9yTGFiZWxDb250YWluZXIiLCJpZ25vcmUiLCJpZ25vcmVUaXRsZSIsIm9uZm9jdXNpbiIsImxhc3RBY3RpdmUiLCJ1bmhpZ2hsaWdodCIsImhpZGVUaGVzZSIsImVycm9yc0ZvciIsIm9uZm9jdXNvdXQiLCJjaGVja2FibGUiLCJzdWJtaXR0ZWQiLCJvcHRpb25hbCIsIm9ua2V5dXAiLCJlbGVtZW50VmFsdWUiLCJpbkFycmF5IiwiaW52YWxpZCIsIm9uY2xpY2siLCJoaWdobGlnaHQiLCJmaW5kQnlOYW1lIiwic2V0RGVmYXVsdHMiLCJkaWdpdHMiLCJtYXhsZW5ndGgiLCJtaW5sZW5ndGgiLCJyYW5nZWxlbmd0aCIsInJhbmdlIiwic3RlcCIsImF1dG9DcmVhdGVSYW5nZXMiLCJsYWJlbENvbnRhaW5lciIsImVycm9yQ29udGV4dCIsImNvbnRhaW5lcnMiLCJ2YWx1ZUNhY2hlIiwicGVuZGluZyIsImludmFsaWRIYW5kbGVyIiwiY2hlY2tGb3JtIiwiZXJyb3JNYXAiLCJzaG93RXJyb3JzIiwicHJlcGFyZUZvcm0iLCJjdXJyZW50RWxlbWVudHMiLCJlbGVtZW50cyIsImNoZWNrIiwiY2xlYW4iLCJ2YWxpZGF0aW9uVGFyZ2V0Rm9yIiwicHJlcGFyZUVsZW1lbnQiLCJudW1iZXJPZkludmFsaWRzIiwidG9IaWRlIiwic3VjY2Vzc0xpc3QiLCJncmVwIiwiZGVmYXVsdFNob3dFcnJvcnMiLCJoaWRlRXJyb3JzIiwicmVzZXRFbGVtZW50cyIsIm9iamVjdExlbmd0aCIsImFkZFdyYXBwZXIiLCJmaW5kTGFzdEFjdGl2ZSIsImVycm9ycyIsInJlc2V0SW50ZXJuYWxzIiwidG9TaG93IiwidmFsaWRpdHkiLCJiYWRJbnB1dCIsInN1YnN0ciIsImxhc3RJbmRleE9mIiwibm9ybWFsaXplciIsInBhcmFtZXRlcnMiLCJtZXRob2RzIiwiZm9ybWF0QW5kQWRkIiwiY3VzdG9tRGF0YU1lc3NhZ2UiLCJjaGFyQXQiLCJzdWJzdHJpbmciLCJjdXN0b21NZXNzYWdlIiwiZmluZERlZmluZWQiLCJkZWZhdWx0TWVzc2FnZSIsInNob3dMYWJlbCIsInN1Y2Nlc3MiLCJ2YWxpZEVsZW1lbnRzIiwiaW52YWxpZEVsZW1lbnRzIiwiaWRPck5hbWUiLCJlcnJvclBsYWNlbWVudCIsImluc2VydEFmdGVyIiwiZXNjYXBlQ3NzTWV0YSIsImdldExlbmd0aCIsImRlcGVuZCIsImRlcGVuZFR5cGVzIiwiYm9vbGVhbiIsImZ1bmN0aW9uIiwic3RhcnRSZXF1ZXN0Iiwic3RvcFJlcXVlc3QiLCJzdWJtaXQiLCJwcmV2aW91c1ZhbHVlIiwib2xkIiwiY2xhc3NSdWxlU2V0dGluZ3MiLCJjcmVkaXRjYXJkIiwiYWRkQ2xhc3NSdWxlcyIsIm5vcm1hbGl6ZUF0dHJpYnV0ZVJ1bGUiLCJOdW1iZXIiLCJkZXBlbmRzIiwiaXNGdW5jdGlvbiIsImFkZE1ldGhvZCIsImwiLCJtIiwib3JpZ2luYWxNZXNzYWdlIiwiYWpheCIsIm1vZGUiLCJwb3J0IiwiZGF0YVR5cGUiLCJhamF4UHJlZmlsdGVyIiwiYWJvcnQiLCJhamF4U2V0dGluZ3MiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwicmVhZHkiLCJhdXRob3IiLCJjb21tZW50IiwiYWZ0ZXIiLCJhamF4Q29tcGxldGUiLCJidXR0b24iLCJwYWdlIiwibG9hZGluZyIsImFsbERvbmUiLCJzY3JvbGxIYW5kbGluZyIsImFsbG93IiwicmVhbGxvdyIsImFjdGlvbiIsIm5vbmNlIiwiYmVsb2FkbW9yZSIsInBvc3QiLCJyZXMiLCJmYWlsIiwieGhyIiwidGV4dFN0YXR1cyIsInNsaWNrIiwic2xpZGUiLCJzbGlkZXNUb1Nob3ciLCJzbGlkZXNUb1Njcm9sbCIsImFycm93cyIsImZhZGUiLCJhc05hdkZvciIsImRvdHMiLCJjZW50ZXJNb2RlIiwiZm9jdXNPblNlbGVjdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsT0FBT0MsU0FBUCxHQUFvQixZQUFXOztBQUU3Qjs7QUFFQTs7Ozs7O0FBTUE7O0FBQ0EsTUFBSUMsYUFBYSxFQUFqQjs7QUFFQTtBQUNBLE1BQUlDLElBQUo7O0FBRUE7QUFDQSxNQUFJQyxTQUFTLEtBQWI7O0FBRUE7QUFDQSxNQUFJQyxlQUFlLElBQW5COztBQUVBO0FBQ0EsTUFBSUMsa0JBQWtCLENBQ3BCLFFBRG9CLEVBRXBCLFVBRm9CLEVBR3BCLE1BSG9CLEVBSXBCLE9BSm9CLEVBS3BCLE9BTG9CLEVBTXBCLE9BTm9CLEVBT3BCLFFBUG9CLENBQXRCOztBQVVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhQyxhQUFqQjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsWUFBWSxDQUNkLEVBRGMsRUFDVjtBQUNKLElBRmMsRUFFVjtBQUNKLElBSGMsRUFHVjtBQUNKLElBSmMsRUFJVjtBQUNKLElBTGMsQ0FLVjtBQUxVLEdBQWhCOztBQVFBO0FBQ0EsTUFBSUMsV0FBVztBQUNiLGVBQVcsVUFERTtBQUViLGFBQVMsVUFGSTtBQUdiLGlCQUFhLE9BSEE7QUFJYixpQkFBYSxPQUpBO0FBS2IscUJBQWlCLFNBTEo7QUFNYixxQkFBaUIsU0FOSjtBQU9iLG1CQUFlLFNBUEY7QUFRYixtQkFBZSxTQVJGO0FBU2Isa0JBQWM7QUFURCxHQUFmOztBQVlBO0FBQ0FBLFdBQVNGLGFBQVQsSUFBMEIsT0FBMUI7O0FBRUE7QUFDQSxNQUFJRyxhQUFhLEVBQWpCOztBQUVBO0FBQ0EsTUFBSUMsU0FBUztBQUNYLE9BQUcsS0FEUTtBQUVYLFFBQUksT0FGTztBQUdYLFFBQUksT0FITztBQUlYLFFBQUksS0FKTztBQUtYLFFBQUksT0FMTztBQU1YLFFBQUksTUFOTztBQU9YLFFBQUksSUFQTztBQVFYLFFBQUksT0FSTztBQVNYLFFBQUk7QUFUTyxHQUFiOztBQVlBO0FBQ0EsTUFBSUMsYUFBYTtBQUNmLE9BQUcsT0FEWTtBQUVmLE9BQUcsT0FGWSxFQUVIO0FBQ1osT0FBRztBQUhZLEdBQWpCOztBQU1BO0FBQ0EsTUFBSUMsS0FBSjs7QUFHQTs7Ozs7O0FBTUE7QUFDQSxXQUFTQyxXQUFULEdBQXVCO0FBQ3JCQztBQUNBQyxhQUFTQyxLQUFUOztBQUVBZCxhQUFTLElBQVQ7QUFDQVUsWUFBUWQsT0FBT21CLFVBQVAsQ0FBa0IsWUFBVztBQUNuQ2YsZUFBUyxLQUFUO0FBQ0QsS0FGTyxFQUVMLEdBRkssQ0FBUjtBQUdEOztBQUVELFdBQVNnQixhQUFULENBQXVCRixLQUF2QixFQUE4QjtBQUM1QixRQUFJLENBQUNkLE1BQUwsRUFBYWEsU0FBU0MsS0FBVDtBQUNkOztBQUVELFdBQVNHLGVBQVQsQ0FBeUJILEtBQXpCLEVBQWdDO0FBQzlCRjtBQUNBQyxhQUFTQyxLQUFUO0FBQ0Q7O0FBRUQsV0FBU0YsVUFBVCxHQUFzQjtBQUNwQmhCLFdBQU9zQixZQUFQLENBQW9CUixLQUFwQjtBQUNEOztBQUVELFdBQVNHLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQ3ZCLFFBQUlLLFdBQVdDLElBQUlOLEtBQUosQ0FBZjtBQUNBLFFBQUlPLFFBQVFmLFNBQVNRLE1BQU1RLElBQWYsQ0FBWjtBQUNBLFFBQUlELFVBQVUsU0FBZCxFQUF5QkEsUUFBUUUsWUFBWVQsS0FBWixDQUFSOztBQUV6QjtBQUNBLFFBQUliLGlCQUFpQm9CLEtBQXJCLEVBQTRCO0FBQzFCLFVBQUlHLGNBQWNDLE9BQU9YLEtBQVAsQ0FBbEI7QUFDQSxVQUFJWSxrQkFBa0JGLFlBQVlHLFFBQVosQ0FBcUJDLFdBQXJCLEVBQXRCO0FBQ0EsVUFBSUMsa0JBQW1CSCxvQkFBb0IsT0FBckIsR0FBZ0NGLFlBQVlNLFlBQVosQ0FBeUIsTUFBekIsQ0FBaEMsR0FBbUUsSUFBekY7O0FBRUEsVUFDRSxDQUFDO0FBQ0QsT0FBQy9CLEtBQUtnQyxZQUFMLENBQWtCLDJCQUFsQixDQUFEOztBQUVBO0FBQ0E5QixrQkFIQTs7QUFLQTtBQUNBb0IsZ0JBQVUsVUFOVjs7QUFRQTtBQUNBYixhQUFPVyxRQUFQLE1BQXFCLEtBVHJCOztBQVdBO0FBRUdPLDBCQUFvQixVQUFwQixJQUNBQSxvQkFBb0IsUUFEcEIsSUFFQ0Esb0JBQW9CLE9BQXBCLElBQStCeEIsZ0JBQWdCOEIsT0FBaEIsQ0FBd0JILGVBQXhCLElBQTJDLENBZjlFLENBREE7QUFrQkU7QUFDQXhCLGdCQUFVMkIsT0FBVixDQUFrQmIsUUFBbEIsSUFBOEIsQ0FBQyxDQXBCbkMsRUFzQkU7QUFDQTtBQUNELE9BeEJELE1Bd0JPO0FBQ0xjLG9CQUFZWixLQUFaO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJQSxVQUFVLFVBQWQsRUFBMEJhLFFBQVFmLFFBQVI7QUFDM0I7O0FBRUQsV0FBU2MsV0FBVCxDQUFxQkUsTUFBckIsRUFBNkI7QUFDM0JsQyxtQkFBZWtDLE1BQWY7QUFDQXBDLFNBQUtxQyxZQUFMLENBQWtCLGdCQUFsQixFQUFvQ25DLFlBQXBDOztBQUVBLFFBQUlNLFdBQVd5QixPQUFYLENBQW1CL0IsWUFBbkIsTUFBcUMsQ0FBQyxDQUExQyxFQUE2Q00sV0FBVzhCLElBQVgsQ0FBZ0JwQyxZQUFoQjtBQUM5Qzs7QUFFRCxXQUFTbUIsR0FBVCxDQUFhTixLQUFiLEVBQW9CO0FBQ2xCLFdBQVFBLE1BQU13QixPQUFQLEdBQWtCeEIsTUFBTXdCLE9BQXhCLEdBQWtDeEIsTUFBTXlCLEtBQS9DO0FBQ0Q7O0FBRUQsV0FBU2QsTUFBVCxDQUFnQlgsS0FBaEIsRUFBdUI7QUFDckIsV0FBT0EsTUFBTVcsTUFBTixJQUFnQlgsTUFBTTBCLFVBQTdCO0FBQ0Q7O0FBRUQsV0FBU2pCLFdBQVQsQ0FBcUJULEtBQXJCLEVBQTRCO0FBQzFCLFFBQUksT0FBT0EsTUFBTVMsV0FBYixLQUE2QixRQUFqQyxFQUEyQztBQUN6QyxhQUFPZCxXQUFXSyxNQUFNUyxXQUFqQixDQUFQO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsYUFBUVQsTUFBTVMsV0FBTixLQUFzQixLQUF2QixHQUFnQyxPQUFoQyxHQUEwQ1QsTUFBTVMsV0FBdkQsQ0FESyxDQUMrRDtBQUNyRTtBQUNGOztBQUVEO0FBQ0EsV0FBU1csT0FBVCxDQUFpQmYsUUFBakIsRUFBMkI7QUFDekIsUUFBSXJCLFdBQVdrQyxPQUFYLENBQW1CeEIsT0FBT1csUUFBUCxDQUFuQixNQUF5QyxDQUFDLENBQTFDLElBQStDWCxPQUFPVyxRQUFQLENBQW5ELEVBQXFFckIsV0FBV3VDLElBQVgsQ0FBZ0I3QixPQUFPVyxRQUFQLENBQWhCO0FBQ3RFOztBQUVELFdBQVNzQixTQUFULENBQW1CM0IsS0FBbkIsRUFBMEI7QUFDeEIsUUFBSUssV0FBV0MsSUFBSU4sS0FBSixDQUFmO0FBQ0EsUUFBSTRCLFdBQVc1QyxXQUFXa0MsT0FBWCxDQUFtQnhCLE9BQU9XLFFBQVAsQ0FBbkIsQ0FBZjs7QUFFQSxRQUFJdUIsYUFBYSxDQUFDLENBQWxCLEVBQXFCNUMsV0FBVzZDLE1BQVgsQ0FBa0JELFFBQWxCLEVBQTRCLENBQTVCO0FBQ3RCOztBQUVELFdBQVNFLFVBQVQsR0FBc0I7QUFDcEI3QyxXQUFPOEMsU0FBUzlDLElBQWhCOztBQUVBO0FBQ0EsUUFBSUgsT0FBT2tELFlBQVgsRUFBeUI7QUFDdkIvQyxXQUFLZ0QsZ0JBQUwsQ0FBc0IsYUFBdEIsRUFBcUMvQixhQUFyQztBQUNBakIsV0FBS2dELGdCQUFMLENBQXNCLGFBQXRCLEVBQXFDL0IsYUFBckM7QUFDRCxLQUhELE1BR08sSUFBSXBCLE9BQU9vRCxjQUFYLEVBQTJCO0FBQ2hDakQsV0FBS2dELGdCQUFMLENBQXNCLGVBQXRCLEVBQXVDL0IsYUFBdkM7QUFDQWpCLFdBQUtnRCxnQkFBTCxDQUFzQixlQUF0QixFQUF1Qy9CLGFBQXZDO0FBQ0QsS0FITSxNQUdBOztBQUVMO0FBQ0FqQixXQUFLZ0QsZ0JBQUwsQ0FBc0IsV0FBdEIsRUFBbUMvQixhQUFuQztBQUNBakIsV0FBS2dELGdCQUFMLENBQXNCLFdBQXRCLEVBQW1DL0IsYUFBbkM7O0FBRUE7QUFDQSxVQUFJLGtCQUFrQnBCLE1BQXRCLEVBQThCO0FBQzVCRyxhQUFLZ0QsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0NwQyxXQUFwQztBQUNEO0FBQ0Y7O0FBRUQ7QUFDQVosU0FBS2dELGdCQUFMLENBQXNCNUMsVUFBdEIsRUFBa0NhLGFBQWxDOztBQUVBO0FBQ0FqQixTQUFLZ0QsZ0JBQUwsQ0FBc0IsU0FBdEIsRUFBaUM5QixlQUFqQztBQUNBbEIsU0FBS2dELGdCQUFMLENBQXNCLE9BQXRCLEVBQStCOUIsZUFBL0I7QUFDQTRCLGFBQVNFLGdCQUFULENBQTBCLE9BQTFCLEVBQW1DTixTQUFuQztBQUNEOztBQUdEOzs7Ozs7QUFNQTtBQUNBO0FBQ0EsV0FBU3JDLFdBQVQsR0FBdUI7QUFDckIsV0FBT0QsYUFBYSxhQUFhMEMsU0FBU0ksYUFBVCxDQUF1QixLQUF2QixDQUFiLEdBQ2xCLE9BRGtCLEdBQ1I7O0FBRVZKLGFBQVNLLFlBQVQsS0FBMEJDLFNBQTFCLEdBQ0UsWUFERixHQUNpQjtBQUNmLG9CQUxKLENBRHFCLENBTUM7QUFDdkI7O0FBR0Q7Ozs7Ozs7O0FBU0EsTUFDRSxzQkFBc0J2RCxNQUF0QixJQUNBd0QsTUFBTUMsU0FBTixDQUFnQnJCLE9BRmxCLEVBR0U7O0FBRUE7QUFDQSxRQUFJYSxTQUFTOUMsSUFBYixFQUFtQjtBQUNqQjZDOztBQUVGO0FBQ0MsS0FKRCxNQUlPO0FBQ0xDLGVBQVNFLGdCQUFULENBQTBCLGtCQUExQixFQUE4Q0gsVUFBOUM7QUFDRDtBQUNGOztBQUdEOzs7Ozs7QUFNQSxTQUFPOztBQUVMO0FBQ0FVLFNBQUssWUFBVztBQUFFLGFBQU9yRCxZQUFQO0FBQXNCLEtBSG5DOztBQUtMO0FBQ0FzRCxVQUFNLFlBQVc7QUFBRSxhQUFPekQsVUFBUDtBQUFvQixLQU5sQzs7QUFRTDtBQUNBMEQsV0FBTyxZQUFXO0FBQUUsYUFBT2pELFVBQVA7QUFBb0IsS0FUbkM7O0FBV0w7QUFDQWtELFNBQUt4QjtBQVpBLEdBQVA7QUFlRCxDQXRTbUIsRUFBcEI7OztBQ0FBLENBQUMsVUFBU3lCLENBQVQsRUFBWTs7QUFFYjs7QUFFQSxNQUFJQyxxQkFBcUIsT0FBekI7O0FBRUE7QUFDQTtBQUNBLE1BQUlDLGFBQWE7QUFDZkMsYUFBU0Ysa0JBRE07O0FBR2Y7OztBQUdBRyxjQUFVLEVBTks7O0FBUWY7OztBQUdBQyxZQUFRLEVBWE87O0FBYWY7OztBQUdBQyxTQUFLLFlBQVU7QUFDYixhQUFPTixFQUFFLE1BQUYsRUFBVU8sSUFBVixDQUFlLEtBQWYsTUFBMEIsS0FBakM7QUFDRCxLQWxCYztBQW1CZjs7OztBQUlBQyxZQUFRLFVBQVNBLE1BQVQsRUFBaUJDLElBQWpCLEVBQXVCO0FBQzdCO0FBQ0E7QUFDQSxVQUFJQyxZQUFhRCxRQUFRRSxhQUFhSCxNQUFiLENBQXpCO0FBQ0E7QUFDQTtBQUNBLFVBQUlJLFdBQVlDLFVBQVVILFNBQVYsQ0FBaEI7O0FBRUE7QUFDQSxXQUFLTixRQUFMLENBQWNRLFFBQWQsSUFBMEIsS0FBS0YsU0FBTCxJQUFrQkYsTUFBNUM7QUFDRCxLQWpDYztBQWtDZjs7Ozs7Ozs7O0FBU0FNLG9CQUFnQixVQUFTTixNQUFULEVBQWlCQyxJQUFqQixFQUFzQjtBQUNwQyxVQUFJTSxhQUFhTixPQUFPSSxVQUFVSixJQUFWLENBQVAsR0FBeUJFLGFBQWFILE9BQU9RLFdBQXBCLEVBQWlDOUMsV0FBakMsRUFBMUM7QUFDQXNDLGFBQU9TLElBQVAsR0FBYyxLQUFLQyxXQUFMLENBQWlCLENBQWpCLEVBQW9CSCxVQUFwQixDQUFkOztBQUVBLFVBQUcsQ0FBQ1AsT0FBT1csUUFBUCxDQUFnQlosSUFBaEIsV0FBNkJRLFVBQTdCLENBQUosRUFBK0M7QUFBRVAsZUFBT1csUUFBUCxDQUFnQlosSUFBaEIsV0FBNkJRLFVBQTdCLEVBQTJDUCxPQUFPUyxJQUFsRDtBQUEwRDtBQUMzRyxVQUFHLENBQUNULE9BQU9XLFFBQVAsQ0FBZ0JDLElBQWhCLENBQXFCLFVBQXJCLENBQUosRUFBcUM7QUFBRVosZUFBT1csUUFBUCxDQUFnQkMsSUFBaEIsQ0FBcUIsVUFBckIsRUFBaUNaLE1BQWpDO0FBQTJDO0FBQzVFOzs7O0FBSU5BLGFBQU9XLFFBQVAsQ0FBZ0JFLE9BQWhCLGNBQW1DTixVQUFuQzs7QUFFQSxXQUFLVixNQUFMLENBQVkxQixJQUFaLENBQWlCNkIsT0FBT1MsSUFBeEI7O0FBRUE7QUFDRCxLQTFEYztBQTJEZjs7Ozs7Ozs7QUFRQUssc0JBQWtCLFVBQVNkLE1BQVQsRUFBZ0I7QUFDaEMsVUFBSU8sYUFBYUYsVUFBVUYsYUFBYUgsT0FBT1csUUFBUCxDQUFnQkMsSUFBaEIsQ0FBcUIsVUFBckIsRUFBaUNKLFdBQTlDLENBQVYsQ0FBakI7O0FBRUEsV0FBS1gsTUFBTCxDQUFZcEIsTUFBWixDQUFtQixLQUFLb0IsTUFBTCxDQUFZL0IsT0FBWixDQUFvQmtDLE9BQU9TLElBQTNCLENBQW5CLEVBQXFELENBQXJEO0FBQ0FULGFBQU9XLFFBQVAsQ0FBZ0JJLFVBQWhCLFdBQW1DUixVQUFuQyxFQUFpRFMsVUFBakQsQ0FBNEQsVUFBNUQ7QUFDTTs7OztBQUROLE9BS09ILE9BTFAsbUJBSytCTixVQUwvQjtBQU1BLFdBQUksSUFBSVUsSUFBUixJQUFnQmpCLE1BQWhCLEVBQXVCO0FBQ3JCQSxlQUFPaUIsSUFBUCxJQUFlLElBQWYsQ0FEcUIsQ0FDRDtBQUNyQjtBQUNEO0FBQ0QsS0FqRmM7O0FBbUZmOzs7Ozs7QUFNQ0MsWUFBUSxVQUFTQyxPQUFULEVBQWlCO0FBQ3ZCLFVBQUlDLE9BQU9ELG1CQUFtQjNCLENBQTlCO0FBQ0EsVUFBRztBQUNELFlBQUc0QixJQUFILEVBQVE7QUFDTkQsa0JBQVFFLElBQVIsQ0FBYSxZQUFVO0FBQ3JCN0IsY0FBRSxJQUFGLEVBQVFvQixJQUFSLENBQWEsVUFBYixFQUF5QlUsS0FBekI7QUFDRCxXQUZEO0FBR0QsU0FKRCxNQUlLO0FBQ0gsY0FBSWxFLE9BQU8sT0FBTytELE9BQWxCO0FBQUEsY0FDQUksUUFBUSxJQURSO0FBQUEsY0FFQUMsTUFBTTtBQUNKLHNCQUFVLFVBQVNDLElBQVQsRUFBYztBQUN0QkEsbUJBQUtDLE9BQUwsQ0FBYSxVQUFTQyxDQUFULEVBQVc7QUFDdEJBLG9CQUFJdEIsVUFBVXNCLENBQVYsQ0FBSjtBQUNBbkMsa0JBQUUsV0FBVW1DLENBQVYsR0FBYSxHQUFmLEVBQW9CQyxVQUFwQixDQUErQixPQUEvQjtBQUNELGVBSEQ7QUFJRCxhQU5HO0FBT0osc0JBQVUsWUFBVTtBQUNsQlQsd0JBQVVkLFVBQVVjLE9BQVYsQ0FBVjtBQUNBM0IsZ0JBQUUsV0FBVTJCLE9BQVYsR0FBbUIsR0FBckIsRUFBMEJTLFVBQTFCLENBQXFDLE9BQXJDO0FBQ0QsYUFWRztBQVdKLHlCQUFhLFlBQVU7QUFDckIsbUJBQUssUUFBTCxFQUFlQyxPQUFPeEMsSUFBUCxDQUFZa0MsTUFBTTNCLFFBQWxCLENBQWY7QUFDRDtBQWJHLFdBRk47QUFpQkE0QixjQUFJcEUsSUFBSixFQUFVK0QsT0FBVjtBQUNEO0FBQ0YsT0F6QkQsQ0F5QkMsT0FBTVcsR0FBTixFQUFVO0FBQ1RDLGdCQUFRQyxLQUFSLENBQWNGLEdBQWQ7QUFDRCxPQTNCRCxTQTJCUTtBQUNOLGVBQU9YLE9BQVA7QUFDRDtBQUNGLEtBekhhOztBQTJIZjs7Ozs7Ozs7QUFRQVQsaUJBQWEsVUFBU3VCLE1BQVQsRUFBaUJDLFNBQWpCLEVBQTJCO0FBQ3RDRCxlQUFTQSxVQUFVLENBQW5CO0FBQ0EsYUFBT0UsS0FBS0MsS0FBTCxDQUFZRCxLQUFLRSxHQUFMLENBQVMsRUFBVCxFQUFhSixTQUFTLENBQXRCLElBQTJCRSxLQUFLRyxNQUFMLEtBQWdCSCxLQUFLRSxHQUFMLENBQVMsRUFBVCxFQUFhSixNQUFiLENBQXZELEVBQThFTSxRQUE5RSxDQUF1RixFQUF2RixFQUEyRkMsS0FBM0YsQ0FBaUcsQ0FBakcsS0FBdUdOLGtCQUFnQkEsU0FBaEIsR0FBOEIsRUFBckksQ0FBUDtBQUNELEtBdEljO0FBdUlmOzs7OztBQUtBTyxZQUFRLFVBQVNDLElBQVQsRUFBZXZCLE9BQWYsRUFBd0I7O0FBRTlCO0FBQ0EsVUFBSSxPQUFPQSxPQUFQLEtBQW1CLFdBQXZCLEVBQW9DO0FBQ2xDQSxrQkFBVVUsT0FBT3hDLElBQVAsQ0FBWSxLQUFLTyxRQUFqQixDQUFWO0FBQ0Q7QUFDRDtBQUhBLFdBSUssSUFBSSxPQUFPdUIsT0FBUCxLQUFtQixRQUF2QixFQUFpQztBQUNwQ0Esb0JBQVUsQ0FBQ0EsT0FBRCxDQUFWO0FBQ0Q7O0FBRUQsVUFBSUksUUFBUSxJQUFaOztBQUVBO0FBQ0EvQixRQUFFNkIsSUFBRixDQUFPRixPQUFQLEVBQWdCLFVBQVN3QixDQUFULEVBQVkxQyxJQUFaLEVBQWtCO0FBQ2hDO0FBQ0EsWUFBSUQsU0FBU3VCLE1BQU0zQixRQUFOLENBQWVLLElBQWYsQ0FBYjs7QUFFQTtBQUNBLFlBQUkyQyxRQUFRcEQsRUFBRWtELElBQUYsRUFBUUcsSUFBUixDQUFhLFdBQVM1QyxJQUFULEdBQWMsR0FBM0IsRUFBZ0M2QyxPQUFoQyxDQUF3QyxXQUFTN0MsSUFBVCxHQUFjLEdBQXRELENBQVo7O0FBRUE7QUFDQTJDLGNBQU12QixJQUFOLENBQVcsWUFBVztBQUNwQixjQUFJMEIsTUFBTXZELEVBQUUsSUFBRixDQUFWO0FBQUEsY0FDSXdELE9BQU8sRUFEWDtBQUVBO0FBQ0EsY0FBSUQsSUFBSW5DLElBQUosQ0FBUyxVQUFULENBQUosRUFBMEI7QUFDeEJtQixvQkFBUWtCLElBQVIsQ0FBYSx5QkFBdUJoRCxJQUF2QixHQUE0QixzREFBekM7QUFDQTtBQUNEOztBQUVELGNBQUc4QyxJQUFJaEQsSUFBSixDQUFTLGNBQVQsQ0FBSCxFQUE0QjtBQUMxQixnQkFBSW1ELFFBQVFILElBQUloRCxJQUFKLENBQVMsY0FBVCxFQUF5Qm9ELEtBQXpCLENBQStCLEdBQS9CLEVBQW9DekIsT0FBcEMsQ0FBNEMsVUFBUzBCLENBQVQsRUFBWVQsQ0FBWixFQUFjO0FBQ3BFLGtCQUFJVSxNQUFNRCxFQUFFRCxLQUFGLENBQVEsR0FBUixFQUFhRyxHQUFiLENBQWlCLFVBQVNDLEVBQVQsRUFBWTtBQUFFLHVCQUFPQSxHQUFHQyxJQUFILEVBQVA7QUFBbUIsZUFBbEQsQ0FBVjtBQUNBLGtCQUFHSCxJQUFJLENBQUosQ0FBSCxFQUFXTCxLQUFLSyxJQUFJLENBQUosQ0FBTCxJQUFlSSxXQUFXSixJQUFJLENBQUosQ0FBWCxDQUFmO0FBQ1osYUFIVyxDQUFaO0FBSUQ7QUFDRCxjQUFHO0FBQ0ROLGdCQUFJbkMsSUFBSixDQUFTLFVBQVQsRUFBcUIsSUFBSVosTUFBSixDQUFXUixFQUFFLElBQUYsQ0FBWCxFQUFvQndELElBQXBCLENBQXJCO0FBQ0QsV0FGRCxDQUVDLE9BQU1VLEVBQU4sRUFBUztBQUNSM0Isb0JBQVFDLEtBQVIsQ0FBYzBCLEVBQWQ7QUFDRCxXQUpELFNBSVE7QUFDTjtBQUNEO0FBQ0YsU0F0QkQ7QUF1QkQsT0EvQkQ7QUFnQ0QsS0ExTGM7QUEyTGZDLGVBQVd4RCxZQTNMSTtBQTRMZnlELG1CQUFlLFVBQVNoQixLQUFULEVBQWU7QUFDNUIsVUFBSWlCLGNBQWM7QUFDaEIsc0JBQWMsZUFERTtBQUVoQiw0QkFBb0IscUJBRko7QUFHaEIseUJBQWlCLGVBSEQ7QUFJaEIsdUJBQWU7QUFKQyxPQUFsQjtBQU1BLFVBQUluQixPQUFPL0QsU0FBU0ksYUFBVCxDQUF1QixLQUF2QixDQUFYO0FBQUEsVUFDSStFLEdBREo7O0FBR0EsV0FBSyxJQUFJQyxDQUFULElBQWNGLFdBQWQsRUFBMEI7QUFDeEIsWUFBSSxPQUFPbkIsS0FBS3NCLEtBQUwsQ0FBV0QsQ0FBWCxDQUFQLEtBQXlCLFdBQTdCLEVBQXlDO0FBQ3ZDRCxnQkFBTUQsWUFBWUUsQ0FBWixDQUFOO0FBQ0Q7QUFDRjtBQUNELFVBQUdELEdBQUgsRUFBTztBQUNMLGVBQU9BLEdBQVA7QUFDRCxPQUZELE1BRUs7QUFDSEEsY0FBTWpILFdBQVcsWUFBVTtBQUN6QitGLGdCQUFNcUIsY0FBTixDQUFxQixlQUFyQixFQUFzQyxDQUFDckIsS0FBRCxDQUF0QztBQUNELFNBRkssRUFFSCxDQUZHLENBQU47QUFHQSxlQUFPLGVBQVA7QUFDRDtBQUNGO0FBbk5jLEdBQWpCOztBQXNOQWxELGFBQVd3RSxJQUFYLEdBQWtCO0FBQ2hCOzs7Ozs7O0FBT0FDLGNBQVUsVUFBVUMsSUFBVixFQUFnQkMsS0FBaEIsRUFBdUI7QUFDL0IsVUFBSTdILFFBQVEsSUFBWjs7QUFFQSxhQUFPLFlBQVk7QUFDakIsWUFBSThILFVBQVUsSUFBZDtBQUFBLFlBQW9CQyxPQUFPQyxTQUEzQjs7QUFFQSxZQUFJaEksVUFBVSxJQUFkLEVBQW9CO0FBQ2xCQSxrQkFBUUssV0FBVyxZQUFZO0FBQzdCdUgsaUJBQUtLLEtBQUwsQ0FBV0gsT0FBWCxFQUFvQkMsSUFBcEI7QUFDQS9ILG9CQUFRLElBQVI7QUFDRCxXQUhPLEVBR0w2SCxLQUhLLENBQVI7QUFJRDtBQUNGLE9BVEQ7QUFVRDtBQXJCZSxHQUFsQjs7QUF3QkE7QUFDQTtBQUNBOzs7O0FBSUEsTUFBSXpDLGFBQWEsVUFBUzhDLE1BQVQsRUFBaUI7QUFDaEMsUUFBSXRILE9BQU8sT0FBT3NILE1BQWxCO0FBQUEsUUFDSUMsUUFBUW5GLEVBQUUsb0JBQUYsQ0FEWjtBQUFBLFFBRUlvRixRQUFRcEYsRUFBRSxRQUFGLENBRlo7O0FBSUEsUUFBRyxDQUFDbUYsTUFBTTFDLE1BQVYsRUFBaUI7QUFDZnpDLFFBQUUsOEJBQUYsRUFBa0NxRixRQUFsQyxDQUEyQ2xHLFNBQVNtRyxJQUFwRDtBQUNEO0FBQ0QsUUFBR0YsTUFBTTNDLE1BQVQsRUFBZ0I7QUFDZDJDLFlBQU1HLFdBQU4sQ0FBa0IsT0FBbEI7QUFDRDs7QUFFRCxRQUFHM0gsU0FBUyxXQUFaLEVBQXdCO0FBQUM7QUFDdkJzQyxpQkFBV3NGLFVBQVgsQ0FBc0IxRCxLQUF0QjtBQUNBNUIsaUJBQVcrQyxNQUFYLENBQWtCLElBQWxCO0FBQ0QsS0FIRCxNQUdNLElBQUdyRixTQUFTLFFBQVosRUFBcUI7QUFBQztBQUMxQixVQUFJbUgsT0FBT3JGLE1BQU1DLFNBQU4sQ0FBZ0JxRCxLQUFoQixDQUFzQnlDLElBQXRCLENBQTJCVCxTQUEzQixFQUFzQyxDQUF0QyxDQUFYLENBRHlCLENBQzJCO0FBQ3BELFVBQUlVLFlBQVksS0FBS3RFLElBQUwsQ0FBVSxVQUFWLENBQWhCLENBRnlCLENBRWE7O0FBRXRDLFVBQUdzRSxjQUFjakcsU0FBZCxJQUEyQmlHLFVBQVVSLE1BQVYsTUFBc0J6RixTQUFwRCxFQUE4RDtBQUFDO0FBQzdELFlBQUcsS0FBS2dELE1BQUwsS0FBZ0IsQ0FBbkIsRUFBcUI7QUFBQztBQUNsQmlELG9CQUFVUixNQUFWLEVBQWtCRCxLQUFsQixDQUF3QlMsU0FBeEIsRUFBbUNYLElBQW5DO0FBQ0gsU0FGRCxNQUVLO0FBQ0gsZUFBS2xELElBQUwsQ0FBVSxVQUFTc0IsQ0FBVCxFQUFZWSxFQUFaLEVBQWU7QUFBQztBQUN4QjJCLHNCQUFVUixNQUFWLEVBQWtCRCxLQUFsQixDQUF3QmpGLEVBQUUrRCxFQUFGLEVBQU0zQyxJQUFOLENBQVcsVUFBWCxDQUF4QixFQUFnRDJELElBQWhEO0FBQ0QsV0FGRDtBQUdEO0FBQ0YsT0FSRCxNQVFLO0FBQUM7QUFDSixjQUFNLElBQUlZLGNBQUosQ0FBbUIsbUJBQW1CVCxNQUFuQixHQUE0QixtQ0FBNUIsSUFBbUVRLFlBQVkvRSxhQUFhK0UsU0FBYixDQUFaLEdBQXNDLGNBQXpHLElBQTJILEdBQTlJLENBQU47QUFDRDtBQUNGLEtBZkssTUFlRDtBQUFDO0FBQ0osWUFBTSxJQUFJRSxTQUFKLG9CQUE4QmhJLElBQTlCLGtHQUFOO0FBQ0Q7QUFDRCxXQUFPLElBQVA7QUFDRCxHQWxDRDs7QUFvQ0ExQixTQUFPZ0UsVUFBUCxHQUFvQkEsVUFBcEI7QUFDQUYsSUFBRTZGLEVBQUYsQ0FBS3pELFVBQUwsR0FBa0JBLFVBQWxCOztBQUVBO0FBQ0EsR0FBQyxZQUFXO0FBQ1YsUUFBSSxDQUFDMEQsS0FBS0MsR0FBTixJQUFhLENBQUM3SixPQUFPNEosSUFBUCxDQUFZQyxHQUE5QixFQUNFN0osT0FBTzRKLElBQVAsQ0FBWUMsR0FBWixHQUFrQkQsS0FBS0MsR0FBTCxHQUFXLFlBQVc7QUFBRSxhQUFPLElBQUlELElBQUosR0FBV0UsT0FBWCxFQUFQO0FBQThCLEtBQXhFOztBQUVGLFFBQUlDLFVBQVUsQ0FBQyxRQUFELEVBQVcsS0FBWCxDQUFkO0FBQ0EsU0FBSyxJQUFJOUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJOEMsUUFBUXhELE1BQVosSUFBc0IsQ0FBQ3ZHLE9BQU9nSyxxQkFBOUMsRUFBcUUsRUFBRS9DLENBQXZFLEVBQTBFO0FBQ3RFLFVBQUlnRCxLQUFLRixRQUFROUMsQ0FBUixDQUFUO0FBQ0FqSCxhQUFPZ0sscUJBQVAsR0FBK0JoSyxPQUFPaUssS0FBRyx1QkFBVixDQUEvQjtBQUNBakssYUFBT2tLLG9CQUFQLEdBQStCbEssT0FBT2lLLEtBQUcsc0JBQVYsS0FDRGpLLE9BQU9pSyxLQUFHLDZCQUFWLENBRDlCO0FBRUg7QUFDRCxRQUFJLHVCQUF1QkUsSUFBdkIsQ0FBNEJuSyxPQUFPb0ssU0FBUCxDQUFpQkMsU0FBN0MsS0FDQyxDQUFDckssT0FBT2dLLHFCQURULElBQ2tDLENBQUNoSyxPQUFPa0ssb0JBRDlDLEVBQ29FO0FBQ2xFLFVBQUlJLFdBQVcsQ0FBZjtBQUNBdEssYUFBT2dLLHFCQUFQLEdBQStCLFVBQVNPLFFBQVQsRUFBbUI7QUFDOUMsWUFBSVYsTUFBTUQsS0FBS0MsR0FBTCxFQUFWO0FBQ0EsWUFBSVcsV0FBVy9ELEtBQUtnRSxHQUFMLENBQVNILFdBQVcsRUFBcEIsRUFBd0JULEdBQXhCLENBQWY7QUFDQSxlQUFPMUksV0FBVyxZQUFXO0FBQUVvSixtQkFBU0QsV0FBV0UsUUFBcEI7QUFBZ0MsU0FBeEQsRUFDV0EsV0FBV1gsR0FEdEIsQ0FBUDtBQUVILE9BTEQ7QUFNQTdKLGFBQU9rSyxvQkFBUCxHQUE4QjVJLFlBQTlCO0FBQ0Q7QUFDRDs7O0FBR0EsUUFBRyxDQUFDdEIsT0FBTzBLLFdBQVIsSUFBdUIsQ0FBQzFLLE9BQU8wSyxXQUFQLENBQW1CYixHQUE5QyxFQUFrRDtBQUNoRDdKLGFBQU8wSyxXQUFQLEdBQXFCO0FBQ25CQyxlQUFPZixLQUFLQyxHQUFMLEVBRFk7QUFFbkJBLGFBQUssWUFBVTtBQUFFLGlCQUFPRCxLQUFLQyxHQUFMLEtBQWEsS0FBS2MsS0FBekI7QUFBaUM7QUFGL0IsT0FBckI7QUFJRDtBQUNGLEdBL0JEO0FBZ0NBLE1BQUksQ0FBQ0MsU0FBU25ILFNBQVQsQ0FBbUJvSCxJQUF4QixFQUE4QjtBQUM1QkQsYUFBU25ILFNBQVQsQ0FBbUJvSCxJQUFuQixHQUEwQixVQUFTQyxLQUFULEVBQWdCO0FBQ3hDLFVBQUksT0FBTyxJQUFQLEtBQWdCLFVBQXBCLEVBQWdDO0FBQzlCO0FBQ0E7QUFDQSxjQUFNLElBQUlwQixTQUFKLENBQWMsc0VBQWQsQ0FBTjtBQUNEOztBQUVELFVBQUlxQixRQUFVdkgsTUFBTUMsU0FBTixDQUFnQnFELEtBQWhCLENBQXNCeUMsSUFBdEIsQ0FBMkJULFNBQTNCLEVBQXNDLENBQXRDLENBQWQ7QUFBQSxVQUNJa0MsVUFBVSxJQURkO0FBQUEsVUFFSUMsT0FBVSxZQUFXLENBQUUsQ0FGM0I7QUFBQSxVQUdJQyxTQUFVLFlBQVc7QUFDbkIsZUFBT0YsUUFBUWpDLEtBQVIsQ0FBYyxnQkFBZ0JrQyxJQUFoQixHQUNaLElBRFksR0FFWkgsS0FGRixFQUdBQyxNQUFNSSxNQUFOLENBQWEzSCxNQUFNQyxTQUFOLENBQWdCcUQsS0FBaEIsQ0FBc0J5QyxJQUF0QixDQUEyQlQsU0FBM0IsQ0FBYixDQUhBLENBQVA7QUFJRCxPQVJMOztBQVVBLFVBQUksS0FBS3JGLFNBQVQsRUFBb0I7QUFDbEI7QUFDQXdILGFBQUt4SCxTQUFMLEdBQWlCLEtBQUtBLFNBQXRCO0FBQ0Q7QUFDRHlILGFBQU96SCxTQUFQLEdBQW1CLElBQUl3SCxJQUFKLEVBQW5COztBQUVBLGFBQU9DLE1BQVA7QUFDRCxLQXhCRDtBQXlCRDtBQUNEO0FBQ0EsV0FBU3pHLFlBQVQsQ0FBc0JrRixFQUF0QixFQUEwQjtBQUN4QixRQUFJaUIsU0FBU25ILFNBQVQsQ0FBbUJjLElBQW5CLEtBQTRCaEIsU0FBaEMsRUFBMkM7QUFDekMsVUFBSTZILGdCQUFnQix3QkFBcEI7QUFDQSxVQUFJQyxVQUFXRCxhQUFELENBQWdCRSxJQUFoQixDQUFzQjNCLEVBQUQsQ0FBSzlDLFFBQUwsRUFBckIsQ0FBZDtBQUNBLGFBQVF3RSxXQUFXQSxRQUFROUUsTUFBUixHQUFpQixDQUE3QixHQUFrQzhFLFFBQVEsQ0FBUixFQUFXdkQsSUFBWCxFQUFsQyxHQUFzRCxFQUE3RDtBQUNELEtBSkQsTUFLSyxJQUFJNkIsR0FBR2xHLFNBQUgsS0FBaUJGLFNBQXJCLEVBQWdDO0FBQ25DLGFBQU9vRyxHQUFHN0UsV0FBSCxDQUFlUCxJQUF0QjtBQUNELEtBRkksTUFHQTtBQUNILGFBQU9vRixHQUFHbEcsU0FBSCxDQUFhcUIsV0FBYixDQUF5QlAsSUFBaEM7QUFDRDtBQUNGO0FBQ0QsV0FBU3dELFVBQVQsQ0FBb0J3RCxHQUFwQixFQUF3QjtBQUN0QixRQUFHLE9BQU9wQixJQUFQLENBQVlvQixHQUFaLENBQUgsRUFBcUIsT0FBTyxJQUFQLENBQXJCLEtBQ0ssSUFBRyxRQUFRcEIsSUFBUixDQUFhb0IsR0FBYixDQUFILEVBQXNCLE9BQU8sS0FBUCxDQUF0QixLQUNBLElBQUcsQ0FBQ0MsTUFBTUQsTUFBTSxDQUFaLENBQUosRUFBb0IsT0FBT0UsV0FBV0YsR0FBWCxDQUFQO0FBQ3pCLFdBQU9BLEdBQVA7QUFDRDtBQUNEO0FBQ0E7QUFDQSxXQUFTNUcsU0FBVCxDQUFtQjRHLEdBQW5CLEVBQXdCO0FBQ3RCLFdBQU9BLElBQUlHLE9BQUosQ0FBWSxpQkFBWixFQUErQixPQUEvQixFQUF3QzFKLFdBQXhDLEVBQVA7QUFDRDtBQUVBLENBelhBLENBeVhDMkosTUF6WEQsQ0FBRDtDQ0FBOztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYkUsYUFBVzRILEdBQVgsR0FBaUI7QUFDZkMsc0JBQWtCQSxnQkFESDtBQUVmQyxtQkFBZUEsYUFGQTtBQUdmQyxnQkFBWUE7QUFIRyxHQUFqQjs7QUFNQTs7Ozs7Ozs7OztBQVVBLFdBQVNGLGdCQUFULENBQTBCRyxPQUExQixFQUFtQ0MsTUFBbkMsRUFBMkNDLE1BQTNDLEVBQW1EQyxNQUFuRCxFQUEyRDtBQUN6RCxRQUFJQyxVQUFVTixjQUFjRSxPQUFkLENBQWQ7QUFBQSxRQUNJSyxHQURKO0FBQUEsUUFDU0MsTUFEVDtBQUFBLFFBQ2lCQyxJQURqQjtBQUFBLFFBQ3VCQyxLQUR2Qjs7QUFHQSxRQUFJUCxNQUFKLEVBQVk7QUFDVixVQUFJUSxVQUFVWCxjQUFjRyxNQUFkLENBQWQ7O0FBRUFLLGVBQVVGLFFBQVFNLE1BQVIsQ0FBZUwsR0FBZixHQUFxQkQsUUFBUU8sTUFBN0IsSUFBdUNGLFFBQVFFLE1BQVIsR0FBaUJGLFFBQVFDLE1BQVIsQ0FBZUwsR0FBakY7QUFDQUEsWUFBVUQsUUFBUU0sTUFBUixDQUFlTCxHQUFmLElBQXNCSSxRQUFRQyxNQUFSLENBQWVMLEdBQS9DO0FBQ0FFLGFBQVVILFFBQVFNLE1BQVIsQ0FBZUgsSUFBZixJQUF1QkUsUUFBUUMsTUFBUixDQUFlSCxJQUFoRDtBQUNBQyxjQUFVSixRQUFRTSxNQUFSLENBQWVILElBQWYsR0FBc0JILFFBQVFRLEtBQTlCLElBQXVDSCxRQUFRRyxLQUFSLEdBQWdCSCxRQUFRQyxNQUFSLENBQWVILElBQWhGO0FBQ0QsS0FQRCxNQVFLO0FBQ0hELGVBQVVGLFFBQVFNLE1BQVIsQ0FBZUwsR0FBZixHQUFxQkQsUUFBUU8sTUFBN0IsSUFBdUNQLFFBQVFTLFVBQVIsQ0FBbUJGLE1BQW5CLEdBQTRCUCxRQUFRUyxVQUFSLENBQW1CSCxNQUFuQixDQUEwQkwsR0FBdkc7QUFDQUEsWUFBVUQsUUFBUU0sTUFBUixDQUFlTCxHQUFmLElBQXNCRCxRQUFRUyxVQUFSLENBQW1CSCxNQUFuQixDQUEwQkwsR0FBMUQ7QUFDQUUsYUFBVUgsUUFBUU0sTUFBUixDQUFlSCxJQUFmLElBQXVCSCxRQUFRUyxVQUFSLENBQW1CSCxNQUFuQixDQUEwQkgsSUFBM0Q7QUFDQUMsY0FBVUosUUFBUU0sTUFBUixDQUFlSCxJQUFmLEdBQXNCSCxRQUFRUSxLQUE5QixJQUF1Q1IsUUFBUVMsVUFBUixDQUFtQkQsS0FBcEU7QUFDRDs7QUFFRCxRQUFJRSxVQUFVLENBQUNSLE1BQUQsRUFBU0QsR0FBVCxFQUFjRSxJQUFkLEVBQW9CQyxLQUFwQixDQUFkOztBQUVBLFFBQUlOLE1BQUosRUFBWTtBQUNWLGFBQU9LLFNBQVNDLEtBQVQsS0FBbUIsSUFBMUI7QUFDRDs7QUFFRCxRQUFJTCxNQUFKLEVBQVk7QUFDVixhQUFPRSxRQUFRQyxNQUFSLEtBQW1CLElBQTFCO0FBQ0Q7O0FBRUQsV0FBT1EsUUFBUTFLLE9BQVIsQ0FBZ0IsS0FBaEIsTUFBMkIsQ0FBQyxDQUFuQztBQUNEOztBQUVEOzs7Ozs7O0FBT0EsV0FBUzBKLGFBQVQsQ0FBdUI5RSxJQUF2QixFQUE2Qm1ELElBQTdCLEVBQWtDO0FBQ2hDbkQsV0FBT0EsS0FBS1QsTUFBTCxHQUFjUyxLQUFLLENBQUwsQ0FBZCxHQUF3QkEsSUFBL0I7O0FBRUEsUUFBSUEsU0FBU2hILE1BQVQsSUFBbUJnSCxTQUFTL0QsUUFBaEMsRUFBMEM7QUFDeEMsWUFBTSxJQUFJOEosS0FBSixDQUFVLDhDQUFWLENBQU47QUFDRDs7QUFFRCxRQUFJQyxPQUFPaEcsS0FBS2lHLHFCQUFMLEVBQVg7QUFBQSxRQUNJQyxVQUFVbEcsS0FBS21HLFVBQUwsQ0FBZ0JGLHFCQUFoQixFQURkO0FBQUEsUUFFSUcsVUFBVW5LLFNBQVM5QyxJQUFULENBQWM4TSxxQkFBZCxFQUZkO0FBQUEsUUFHSUksT0FBT3JOLE9BQU9zTixXQUhsQjtBQUFBLFFBSUlDLE9BQU92TixPQUFPd04sV0FKbEI7O0FBTUEsV0FBTztBQUNMWixhQUFPSSxLQUFLSixLQURQO0FBRUxELGNBQVFLLEtBQUtMLE1BRlI7QUFHTEQsY0FBUTtBQUNOTCxhQUFLVyxLQUFLWCxHQUFMLEdBQVdnQixJQURWO0FBRU5kLGNBQU1TLEtBQUtULElBQUwsR0FBWWdCO0FBRlosT0FISDtBQU9MRSxrQkFBWTtBQUNWYixlQUFPTSxRQUFRTixLQURMO0FBRVZELGdCQUFRTyxRQUFRUCxNQUZOO0FBR1ZELGdCQUFRO0FBQ05MLGVBQUthLFFBQVFiLEdBQVIsR0FBY2dCLElBRGI7QUFFTmQsZ0JBQU1XLFFBQVFYLElBQVIsR0FBZWdCO0FBRmY7QUFIRSxPQVBQO0FBZUxWLGtCQUFZO0FBQ1ZELGVBQU9RLFFBQVFSLEtBREw7QUFFVkQsZ0JBQVFTLFFBQVFULE1BRk47QUFHVkQsZ0JBQVE7QUFDTkwsZUFBS2dCLElBREM7QUFFTmQsZ0JBQU1nQjtBQUZBO0FBSEU7QUFmUCxLQUFQO0FBd0JEOztBQUVEOzs7Ozs7Ozs7Ozs7QUFZQSxXQUFTeEIsVUFBVCxDQUFvQkMsT0FBcEIsRUFBNkIwQixNQUE3QixFQUFxQ0MsUUFBckMsRUFBK0NDLE9BQS9DLEVBQXdEQyxPQUF4RCxFQUFpRUMsVUFBakUsRUFBNkU7QUFDM0UsUUFBSUMsV0FBV2pDLGNBQWNFLE9BQWQsQ0FBZjtBQUFBLFFBQ0lnQyxjQUFjTixTQUFTNUIsY0FBYzRCLE1BQWQsQ0FBVCxHQUFpQyxJQURuRDs7QUFHQSxZQUFRQyxRQUFSO0FBQ0UsV0FBSyxLQUFMO0FBQ0UsZUFBTztBQUNMcEIsZ0JBQU92SSxXQUFXSSxHQUFYLEtBQW1CNEosWUFBWXRCLE1BQVosQ0FBbUJILElBQW5CLEdBQTBCd0IsU0FBU25CLEtBQW5DLEdBQTJDb0IsWUFBWXBCLEtBQTFFLEdBQWtGb0IsWUFBWXRCLE1BQVosQ0FBbUJILElBRHZHO0FBRUxGLGVBQUsyQixZQUFZdEIsTUFBWixDQUFtQkwsR0FBbkIsSUFBMEIwQixTQUFTcEIsTUFBVCxHQUFrQmlCLE9BQTVDO0FBRkEsU0FBUDtBQUlBO0FBQ0YsV0FBSyxNQUFMO0FBQ0UsZUFBTztBQUNMckIsZ0JBQU15QixZQUFZdEIsTUFBWixDQUFtQkgsSUFBbkIsSUFBMkJ3QixTQUFTbkIsS0FBVCxHQUFpQmlCLE9BQTVDLENBREQ7QUFFTHhCLGVBQUsyQixZQUFZdEIsTUFBWixDQUFtQkw7QUFGbkIsU0FBUDtBQUlBO0FBQ0YsV0FBSyxPQUFMO0FBQ0UsZUFBTztBQUNMRSxnQkFBTXlCLFlBQVl0QixNQUFaLENBQW1CSCxJQUFuQixHQUEwQnlCLFlBQVlwQixLQUF0QyxHQUE4Q2lCLE9BRC9DO0FBRUx4QixlQUFLMkIsWUFBWXRCLE1BQVosQ0FBbUJMO0FBRm5CLFNBQVA7QUFJQTtBQUNGLFdBQUssWUFBTDtBQUNFLGVBQU87QUFDTEUsZ0JBQU95QixZQUFZdEIsTUFBWixDQUFtQkgsSUFBbkIsR0FBMkJ5QixZQUFZcEIsS0FBWixHQUFvQixDQUFoRCxHQUF1RG1CLFNBQVNuQixLQUFULEdBQWlCLENBRHpFO0FBRUxQLGVBQUsyQixZQUFZdEIsTUFBWixDQUFtQkwsR0FBbkIsSUFBMEIwQixTQUFTcEIsTUFBVCxHQUFrQmlCLE9BQTVDO0FBRkEsU0FBUDtBQUlBO0FBQ0YsV0FBSyxlQUFMO0FBQ0UsZUFBTztBQUNMckIsZ0JBQU11QixhQUFhRCxPQUFiLEdBQXlCRyxZQUFZdEIsTUFBWixDQUFtQkgsSUFBbkIsR0FBMkJ5QixZQUFZcEIsS0FBWixHQUFvQixDQUFoRCxHQUF1RG1CLFNBQVNuQixLQUFULEdBQWlCLENBRGpHO0FBRUxQLGVBQUsyQixZQUFZdEIsTUFBWixDQUFtQkwsR0FBbkIsR0FBeUIyQixZQUFZckIsTUFBckMsR0FBOENpQjtBQUY5QyxTQUFQO0FBSUE7QUFDRixXQUFLLGFBQUw7QUFDRSxlQUFPO0FBQ0xyQixnQkFBTXlCLFlBQVl0QixNQUFaLENBQW1CSCxJQUFuQixJQUEyQndCLFNBQVNuQixLQUFULEdBQWlCaUIsT0FBNUMsQ0FERDtBQUVMeEIsZUFBTTJCLFlBQVl0QixNQUFaLENBQW1CTCxHQUFuQixHQUEwQjJCLFlBQVlyQixNQUFaLEdBQXFCLENBQWhELEdBQXVEb0IsU0FBU3BCLE1BQVQsR0FBa0I7QUFGekUsU0FBUDtBQUlBO0FBQ0YsV0FBSyxjQUFMO0FBQ0UsZUFBTztBQUNMSixnQkFBTXlCLFlBQVl0QixNQUFaLENBQW1CSCxJQUFuQixHQUEwQnlCLFlBQVlwQixLQUF0QyxHQUE4Q2lCLE9BQTlDLEdBQXdELENBRHpEO0FBRUx4QixlQUFNMkIsWUFBWXRCLE1BQVosQ0FBbUJMLEdBQW5CLEdBQTBCMkIsWUFBWXJCLE1BQVosR0FBcUIsQ0FBaEQsR0FBdURvQixTQUFTcEIsTUFBVCxHQUFrQjtBQUZ6RSxTQUFQO0FBSUE7QUFDRixXQUFLLFFBQUw7QUFDRSxlQUFPO0FBQ0xKLGdCQUFPd0IsU0FBU2xCLFVBQVQsQ0FBb0JILE1BQXBCLENBQTJCSCxJQUEzQixHQUFtQ3dCLFNBQVNsQixVQUFULENBQW9CRCxLQUFwQixHQUE0QixDQUFoRSxHQUF1RW1CLFNBQVNuQixLQUFULEdBQWlCLENBRHpGO0FBRUxQLGVBQU0wQixTQUFTbEIsVUFBVCxDQUFvQkgsTUFBcEIsQ0FBMkJMLEdBQTNCLEdBQWtDMEIsU0FBU2xCLFVBQVQsQ0FBb0JGLE1BQXBCLEdBQTZCLENBQWhFLEdBQXVFb0IsU0FBU3BCLE1BQVQsR0FBa0I7QUFGekYsU0FBUDtBQUlBO0FBQ0YsV0FBSyxRQUFMO0FBQ0UsZUFBTztBQUNMSixnQkFBTSxDQUFDd0IsU0FBU2xCLFVBQVQsQ0FBb0JELEtBQXBCLEdBQTRCbUIsU0FBU25CLEtBQXRDLElBQStDLENBRGhEO0FBRUxQLGVBQUswQixTQUFTbEIsVUFBVCxDQUFvQkgsTUFBcEIsQ0FBMkJMLEdBQTNCLEdBQWlDdUI7QUFGakMsU0FBUDtBQUlGLFdBQUssYUFBTDtBQUNFLGVBQU87QUFDTHJCLGdCQUFNd0IsU0FBU2xCLFVBQVQsQ0FBb0JILE1BQXBCLENBQTJCSCxJQUQ1QjtBQUVMRixlQUFLMEIsU0FBU2xCLFVBQVQsQ0FBb0JILE1BQXBCLENBQTJCTDtBQUYzQixTQUFQO0FBSUE7QUFDRixXQUFLLGFBQUw7QUFDRSxlQUFPO0FBQ0xFLGdCQUFNeUIsWUFBWXRCLE1BQVosQ0FBbUJILElBQW5CLElBQTJCd0IsU0FBU25CLEtBQVQsR0FBaUJpQixPQUE1QyxDQUREO0FBRUx4QixlQUFLMkIsWUFBWXRCLE1BQVosQ0FBbUJMLEdBQW5CLEdBQXlCMkIsWUFBWXJCO0FBRnJDLFNBQVA7QUFJQTtBQUNGLFdBQUssY0FBTDtBQUNFLGVBQU87QUFDTEosZ0JBQU15QixZQUFZdEIsTUFBWixDQUFtQkgsSUFBbkIsR0FBMEJ5QixZQUFZcEIsS0FBdEMsR0FBOENpQixPQUE5QyxHQUF3REUsU0FBU25CLEtBRGxFO0FBRUxQLGVBQUsyQixZQUFZdEIsTUFBWixDQUFtQkwsR0FBbkIsR0FBeUIyQixZQUFZckI7QUFGckMsU0FBUDtBQUlBO0FBQ0Y7QUFDRSxlQUFPO0FBQ0xKLGdCQUFPdkksV0FBV0ksR0FBWCxLQUFtQjRKLFlBQVl0QixNQUFaLENBQW1CSCxJQUFuQixHQUEwQndCLFNBQVNuQixLQUFuQyxHQUEyQ29CLFlBQVlwQixLQUExRSxHQUFrRm9CLFlBQVl0QixNQUFaLENBQW1CSCxJQUR2RztBQUVMRixlQUFLMkIsWUFBWXRCLE1BQVosQ0FBbUJMLEdBQW5CLEdBQXlCMkIsWUFBWXJCLE1BQXJDLEdBQThDaUI7QUFGOUMsU0FBUDtBQXpFSjtBQThFRDtBQUVBLENBaE1BLENBZ01DakMsTUFoTUQsQ0FBRDtDQ0ZBOzs7Ozs7OztBQVFBOztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYixNQUFNbUssV0FBVztBQUNmLE9BQUcsS0FEWTtBQUVmLFFBQUksT0FGVztBQUdmLFFBQUksUUFIVztBQUlmLFFBQUksT0FKVztBQUtmLFFBQUksWUFMVztBQU1mLFFBQUksVUFOVztBQU9mLFFBQUksYUFQVztBQVFmLFFBQUk7QUFSVyxHQUFqQjs7QUFXQSxNQUFJQyxXQUFXLEVBQWY7O0FBRUEsTUFBSUMsV0FBVztBQUNieEssVUFBTXlLLFlBQVlILFFBQVosQ0FETzs7QUFHYjs7Ozs7O0FBTUFJLFlBVGEsWUFTSm5OLEtBVEksRUFTRztBQUNkLFVBQUlNLE1BQU15TSxTQUFTL00sTUFBTXlCLEtBQU4sSUFBZXpCLE1BQU13QixPQUE5QixLQUEwQzRMLE9BQU9DLFlBQVAsQ0FBb0JyTixNQUFNeUIsS0FBMUIsRUFBaUM2TCxXQUFqQyxFQUFwRDtBQUNBLFVBQUl0TixNQUFNdU4sUUFBVixFQUFvQmpOLGlCQUFlQSxHQUFmO0FBQ3BCLFVBQUlOLE1BQU13TixPQUFWLEVBQW1CbE4sZ0JBQWNBLEdBQWQ7QUFDbkIsVUFBSU4sTUFBTXlOLE1BQVYsRUFBa0JuTixlQUFhQSxHQUFiO0FBQ2xCLGFBQU9BLEdBQVA7QUFDRCxLQWZZOzs7QUFpQmI7Ozs7OztBQU1Bb04sYUF2QmEsWUF1QkgxTixLQXZCRyxFQXVCSTJOLFNBdkJKLEVBdUJlQyxTQXZCZixFQXVCMEI7QUFDckMsVUFBSUMsY0FBY2IsU0FBU1csU0FBVCxDQUFsQjtBQUFBLFVBQ0VuTSxVQUFVLEtBQUsyTCxRQUFMLENBQWNuTixLQUFkLENBRFo7QUFBQSxVQUVFOE4sSUFGRjtBQUFBLFVBR0VDLE9BSEY7QUFBQSxVQUlFdEYsRUFKRjs7QUFNQSxVQUFJLENBQUNvRixXQUFMLEVBQWtCLE9BQU8xSSxRQUFRa0IsSUFBUixDQUFhLHdCQUFiLENBQVA7O0FBRWxCLFVBQUksT0FBT3dILFlBQVlHLEdBQW5CLEtBQTJCLFdBQS9CLEVBQTRDO0FBQUU7QUFDMUNGLGVBQU9ELFdBQVAsQ0FEd0MsQ0FDcEI7QUFDdkIsT0FGRCxNQUVPO0FBQUU7QUFDTCxZQUFJL0ssV0FBV0ksR0FBWCxFQUFKLEVBQXNCNEssT0FBT2xMLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFhSixZQUFZRyxHQUF6QixFQUE4QkgsWUFBWTNLLEdBQTFDLENBQVAsQ0FBdEIsS0FFSzRLLE9BQU9sTCxFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYUosWUFBWTNLLEdBQXpCLEVBQThCMkssWUFBWUcsR0FBMUMsQ0FBUDtBQUNSO0FBQ0RELGdCQUFVRCxLQUFLdE0sT0FBTCxDQUFWOztBQUVBaUgsV0FBS21GLFVBQVVHLE9BQVYsQ0FBTDtBQUNBLFVBQUl0RixNQUFNLE9BQU9BLEVBQVAsS0FBYyxVQUF4QixFQUFvQztBQUFFO0FBQ3BDLFlBQUl5RixjQUFjekYsR0FBR1osS0FBSCxFQUFsQjtBQUNBLFlBQUkrRixVQUFVTyxPQUFWLElBQXFCLE9BQU9QLFVBQVVPLE9BQWpCLEtBQTZCLFVBQXRELEVBQWtFO0FBQUU7QUFDaEVQLG9CQUFVTyxPQUFWLENBQWtCRCxXQUFsQjtBQUNIO0FBQ0YsT0FMRCxNQUtPO0FBQ0wsWUFBSU4sVUFBVVEsU0FBVixJQUF1QixPQUFPUixVQUFVUSxTQUFqQixLQUErQixVQUExRCxFQUFzRTtBQUFFO0FBQ3BFUixvQkFBVVEsU0FBVjtBQUNIO0FBQ0Y7QUFDRixLQXBEWTs7O0FBc0RiOzs7OztBQUtBQyxpQkEzRGEsWUEyREN0SyxRQTNERCxFQTJEVztBQUN0QixhQUFPQSxTQUFTa0MsSUFBVCxDQUFjLDhLQUFkLEVBQThMcUksTUFBOUwsQ0FBcU0sWUFBVztBQUNyTixZQUFJLENBQUMxTCxFQUFFLElBQUYsRUFBUTJMLEVBQVIsQ0FBVyxVQUFYLENBQUQsSUFBMkIzTCxFQUFFLElBQUYsRUFBUU8sSUFBUixDQUFhLFVBQWIsSUFBMkIsQ0FBMUQsRUFBNkQ7QUFBRSxpQkFBTyxLQUFQO0FBQWUsU0FEdUksQ0FDdEk7QUFDL0UsZUFBTyxJQUFQO0FBQ0QsT0FITSxDQUFQO0FBSUQsS0FoRVk7OztBQWtFYjs7Ozs7O0FBTUFxTCxZQXhFYSxZQXdFSkMsYUF4RUksRUF3RVdYLElBeEVYLEVBd0VpQjtBQUM1QmQsZUFBU3lCLGFBQVQsSUFBMEJYLElBQTFCO0FBQ0Q7QUExRVksR0FBZjs7QUE2RUE7Ozs7QUFJQSxXQUFTWixXQUFULENBQXFCd0IsR0FBckIsRUFBMEI7QUFDeEIsUUFBSUMsSUFBSSxFQUFSO0FBQ0EsU0FBSyxJQUFJQyxFQUFULElBQWVGLEdBQWY7QUFBb0JDLFFBQUVELElBQUlFLEVBQUosQ0FBRixJQUFhRixJQUFJRSxFQUFKLENBQWI7QUFBcEIsS0FDQSxPQUFPRCxDQUFQO0FBQ0Q7O0FBRUQ3TCxhQUFXbUssUUFBWCxHQUFzQkEsUUFBdEI7QUFFQyxDQXhHQSxDQXdHQ3hDLE1BeEdELENBQUQ7Q0NWQTs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7QUFDQSxNQUFNaU0saUJBQWlCO0FBQ3JCLGVBQVksYUFEUztBQUVyQkMsZUFBWSwwQ0FGUztBQUdyQkMsY0FBVyx5Q0FIVTtBQUlyQkMsWUFBUyx5REFDUCxtREFETyxHQUVQLG1EQUZPLEdBR1AsOENBSE8sR0FJUCwyQ0FKTyxHQUtQO0FBVG1CLEdBQXZCOztBQVlBLE1BQUk1RyxhQUFhO0FBQ2Y2RyxhQUFTLEVBRE07O0FBR2ZDLGFBQVMsRUFITTs7QUFLZjs7Ozs7QUFLQXhLLFNBVmUsY0FVUDtBQUNOLFVBQUl5SyxPQUFPLElBQVg7QUFDQSxVQUFJQyxrQkFBa0J4TSxFQUFFLGdCQUFGLEVBQW9CeU0sR0FBcEIsQ0FBd0IsYUFBeEIsQ0FBdEI7QUFDQSxVQUFJQyxZQUFKOztBQUVBQSxxQkFBZUMsbUJBQW1CSCxlQUFuQixDQUFmOztBQUVBLFdBQUssSUFBSTlPLEdBQVQsSUFBZ0JnUCxZQUFoQixFQUE4QjtBQUM1QixZQUFHQSxhQUFhRSxjQUFiLENBQTRCbFAsR0FBNUIsQ0FBSCxFQUFxQztBQUNuQzZPLGVBQUtGLE9BQUwsQ0FBYTFOLElBQWIsQ0FBa0I7QUFDaEI4QixrQkFBTS9DLEdBRFU7QUFFaEJDLG9EQUFzQytPLGFBQWFoUCxHQUFiLENBQXRDO0FBRmdCLFdBQWxCO0FBSUQ7QUFDRjs7QUFFRCxXQUFLNE8sT0FBTCxHQUFlLEtBQUtPLGVBQUwsRUFBZjs7QUFFQSxXQUFLQyxRQUFMO0FBQ0QsS0E3QmM7OztBQStCZjs7Ozs7O0FBTUFDLFdBckNlLFlBcUNQQyxJQXJDTyxFQXFDRDtBQUNaLFVBQUlDLFFBQVEsS0FBS0MsR0FBTCxDQUFTRixJQUFULENBQVo7O0FBRUEsVUFBSUMsS0FBSixFQUFXO0FBQ1QsZUFBTy9RLE9BQU9pUixVQUFQLENBQWtCRixLQUFsQixFQUF5QkcsT0FBaEM7QUFDRDs7QUFFRCxhQUFPLEtBQVA7QUFDRCxLQTdDYzs7O0FBK0NmOzs7Ozs7QUFNQUYsT0FyRGUsWUFxRFhGLElBckRXLEVBcURMO0FBQ1IsV0FBSyxJQUFJN0osQ0FBVCxJQUFjLEtBQUtrSixPQUFuQixFQUE0QjtBQUMxQixZQUFHLEtBQUtBLE9BQUwsQ0FBYU8sY0FBYixDQUE0QnpKLENBQTVCLENBQUgsRUFBbUM7QUFDakMsY0FBSThKLFFBQVEsS0FBS1osT0FBTCxDQUFhbEosQ0FBYixDQUFaO0FBQ0EsY0FBSTZKLFNBQVNDLE1BQU14TSxJQUFuQixFQUF5QixPQUFPd00sTUFBTXRQLEtBQWI7QUFDMUI7QUFDRjs7QUFFRCxhQUFPLElBQVA7QUFDRCxLQTlEYzs7O0FBZ0VmOzs7Ozs7QUFNQWtQLG1CQXRFZSxjQXNFRztBQUNoQixVQUFJUSxPQUFKOztBQUVBLFdBQUssSUFBSWxLLElBQUksQ0FBYixFQUFnQkEsSUFBSSxLQUFLa0osT0FBTCxDQUFhNUosTUFBakMsRUFBeUNVLEdBQXpDLEVBQThDO0FBQzVDLFlBQUk4SixRQUFRLEtBQUtaLE9BQUwsQ0FBYWxKLENBQWIsQ0FBWjs7QUFFQSxZQUFJakgsT0FBT2lSLFVBQVAsQ0FBa0JGLE1BQU10UCxLQUF4QixFQUErQnlQLE9BQW5DLEVBQTRDO0FBQzFDQyxvQkFBVUosS0FBVjtBQUNEO0FBQ0Y7O0FBRUQsVUFBSSxPQUFPSSxPQUFQLEtBQW1CLFFBQXZCLEVBQWlDO0FBQy9CLGVBQU9BLFFBQVE1TSxJQUFmO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsZUFBTzRNLE9BQVA7QUFDRDtBQUNGLEtBdEZjOzs7QUF3RmY7Ozs7O0FBS0FQLFlBN0ZlLGNBNkZKO0FBQUE7O0FBQ1Q5TSxRQUFFOUQsTUFBRixFQUFVb1IsRUFBVixDQUFhLHNCQUFiLEVBQXFDLFlBQU07QUFDekMsWUFBSUMsVUFBVSxNQUFLVixlQUFMLEVBQWQ7QUFBQSxZQUFzQ1csY0FBYyxNQUFLbEIsT0FBekQ7O0FBRUEsWUFBSWlCLFlBQVlDLFdBQWhCLEVBQTZCO0FBQzNCO0FBQ0EsZ0JBQUtsQixPQUFMLEdBQWVpQixPQUFmOztBQUVBO0FBQ0F2TixZQUFFOUQsTUFBRixFQUFVbUYsT0FBVixDQUFrQix1QkFBbEIsRUFBMkMsQ0FBQ2tNLE9BQUQsRUFBVUMsV0FBVixDQUEzQztBQUNEO0FBQ0YsT0FWRDtBQVdEO0FBekdjLEdBQWpCOztBQTRHQXROLGFBQVdzRixVQUFYLEdBQXdCQSxVQUF4Qjs7QUFFQTtBQUNBO0FBQ0F0SixTQUFPaVIsVUFBUCxLQUFzQmpSLE9BQU9pUixVQUFQLEdBQW9CLFlBQVc7QUFDbkQ7O0FBRUE7O0FBQ0EsUUFBSU0sYUFBY3ZSLE9BQU91UixVQUFQLElBQXFCdlIsT0FBT3dSLEtBQTlDOztBQUVBO0FBQ0EsUUFBSSxDQUFDRCxVQUFMLEVBQWlCO0FBQ2YsVUFBSWpKLFFBQVVyRixTQUFTSSxhQUFULENBQXVCLE9BQXZCLENBQWQ7QUFBQSxVQUNBb08sU0FBY3hPLFNBQVN5TyxvQkFBVCxDQUE4QixRQUE5QixFQUF3QyxDQUF4QyxDQURkO0FBQUEsVUFFQUMsT0FBYyxJQUZkOztBQUlBckosWUFBTTVHLElBQU4sR0FBYyxVQUFkO0FBQ0E0RyxZQUFNc0osRUFBTixHQUFjLG1CQUFkOztBQUVBSCxhQUFPdEUsVUFBUCxDQUFrQjBFLFlBQWxCLENBQStCdkosS0FBL0IsRUFBc0NtSixNQUF0Qzs7QUFFQTtBQUNBRSxhQUFRLHNCQUFzQjNSLE1BQXZCLElBQWtDQSxPQUFPOFIsZ0JBQVAsQ0FBd0J4SixLQUF4QixFQUErQixJQUEvQixDQUFsQyxJQUEwRUEsTUFBTXlKLFlBQXZGOztBQUVBUixtQkFBYTtBQUNYUyxtQkFEVyxZQUNDUixLQURELEVBQ1E7QUFDakIsY0FBSVMsbUJBQWlCVCxLQUFqQiwyQ0FBSjs7QUFFQTtBQUNBLGNBQUlsSixNQUFNNEosVUFBVixFQUFzQjtBQUNwQjVKLGtCQUFNNEosVUFBTixDQUFpQkMsT0FBakIsR0FBMkJGLElBQTNCO0FBQ0QsV0FGRCxNQUVPO0FBQ0wzSixrQkFBTThKLFdBQU4sR0FBb0JILElBQXBCO0FBQ0Q7O0FBRUQ7QUFDQSxpQkFBT04sS0FBSy9FLEtBQUwsS0FBZSxLQUF0QjtBQUNEO0FBYlUsT0FBYjtBQWVEOztBQUVELFdBQU8sVUFBUzRFLEtBQVQsRUFBZ0I7QUFDckIsYUFBTztBQUNMTixpQkFBU0ssV0FBV1MsV0FBWCxDQUF1QlIsU0FBUyxLQUFoQyxDQURKO0FBRUxBLGVBQU9BLFNBQVM7QUFGWCxPQUFQO0FBSUQsS0FMRDtBQU1ELEdBM0N5QyxFQUExQzs7QUE2Q0E7QUFDQSxXQUFTZixrQkFBVCxDQUE0QmxGLEdBQTVCLEVBQWlDO0FBQy9CLFFBQUk4RyxjQUFjLEVBQWxCOztBQUVBLFFBQUksT0FBTzlHLEdBQVAsS0FBZSxRQUFuQixFQUE2QjtBQUMzQixhQUFPOEcsV0FBUDtBQUNEOztBQUVEOUcsVUFBTUEsSUFBSXpELElBQUosR0FBV2hCLEtBQVgsQ0FBaUIsQ0FBakIsRUFBb0IsQ0FBQyxDQUFyQixDQUFOLENBUCtCLENBT0E7O0FBRS9CLFFBQUksQ0FBQ3lFLEdBQUwsRUFBVTtBQUNSLGFBQU84RyxXQUFQO0FBQ0Q7O0FBRURBLGtCQUFjOUcsSUFBSTlELEtBQUosQ0FBVSxHQUFWLEVBQWU2SyxNQUFmLENBQXNCLFVBQVNDLEdBQVQsRUFBY0MsS0FBZCxFQUFxQjtBQUN2RCxVQUFJQyxRQUFRRCxNQUFNOUcsT0FBTixDQUFjLEtBQWQsRUFBcUIsR0FBckIsRUFBMEJqRSxLQUExQixDQUFnQyxHQUFoQyxDQUFaO0FBQ0EsVUFBSWpHLE1BQU1pUixNQUFNLENBQU4sQ0FBVjtBQUNBLFVBQUlDLE1BQU1ELE1BQU0sQ0FBTixDQUFWO0FBQ0FqUixZQUFNbVIsbUJBQW1CblIsR0FBbkIsQ0FBTjs7QUFFQTtBQUNBO0FBQ0FrUixZQUFNQSxRQUFRblAsU0FBUixHQUFvQixJQUFwQixHQUEyQm9QLG1CQUFtQkQsR0FBbkIsQ0FBakM7O0FBRUEsVUFBSSxDQUFDSCxJQUFJN0IsY0FBSixDQUFtQmxQLEdBQW5CLENBQUwsRUFBOEI7QUFDNUIrUSxZQUFJL1EsR0FBSixJQUFXa1IsR0FBWDtBQUNELE9BRkQsTUFFTyxJQUFJbFAsTUFBTW9QLE9BQU4sQ0FBY0wsSUFBSS9RLEdBQUosQ0FBZCxDQUFKLEVBQTZCO0FBQ2xDK1EsWUFBSS9RLEdBQUosRUFBU2lCLElBQVQsQ0FBY2lRLEdBQWQ7QUFDRCxPQUZNLE1BRUE7QUFDTEgsWUFBSS9RLEdBQUosSUFBVyxDQUFDK1EsSUFBSS9RLEdBQUosQ0FBRCxFQUFXa1IsR0FBWCxDQUFYO0FBQ0Q7QUFDRCxhQUFPSCxHQUFQO0FBQ0QsS0FsQmEsRUFrQlgsRUFsQlcsQ0FBZDs7QUFvQkEsV0FBT0YsV0FBUDtBQUNEOztBQUVEck8sYUFBV3NGLFVBQVgsR0FBd0JBLFVBQXhCO0FBRUMsQ0FuTkEsQ0FtTkNxQyxNQW5ORCxDQUFEO0NDRkE7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7OztBQUtBLE1BQU0rTyxjQUFnQixDQUFDLFdBQUQsRUFBYyxXQUFkLENBQXRCO0FBQ0EsTUFBTUMsZ0JBQWdCLENBQUMsa0JBQUQsRUFBcUIsa0JBQXJCLENBQXRCOztBQUVBLE1BQU1DLFNBQVM7QUFDYkMsZUFBVyxVQUFTaEgsT0FBVCxFQUFrQmlILFNBQWxCLEVBQTZCQyxFQUE3QixFQUFpQztBQUMxQ0MsY0FBUSxJQUFSLEVBQWNuSCxPQUFkLEVBQXVCaUgsU0FBdkIsRUFBa0NDLEVBQWxDO0FBQ0QsS0FIWTs7QUFLYkUsZ0JBQVksVUFBU3BILE9BQVQsRUFBa0JpSCxTQUFsQixFQUE2QkMsRUFBN0IsRUFBaUM7QUFDM0NDLGNBQVEsS0FBUixFQUFlbkgsT0FBZixFQUF3QmlILFNBQXhCLEVBQW1DQyxFQUFuQztBQUNEO0FBUFksR0FBZjs7QUFVQSxXQUFTRyxJQUFULENBQWNDLFFBQWQsRUFBd0J0TSxJQUF4QixFQUE4QjJDLEVBQTlCLEVBQWlDO0FBQy9CLFFBQUk0SixJQUFKO0FBQUEsUUFBVUMsSUFBVjtBQUFBLFFBQWdCN0ksUUFBUSxJQUF4QjtBQUNBOztBQUVBLGFBQVM4SSxJQUFULENBQWNDLEVBQWQsRUFBaUI7QUFDZixVQUFHLENBQUMvSSxLQUFKLEVBQVdBLFFBQVEzSyxPQUFPMEssV0FBUCxDQUFtQmIsR0FBbkIsRUFBUjtBQUNYO0FBQ0EySixhQUFPRSxLQUFLL0ksS0FBWjtBQUNBaEIsU0FBR1osS0FBSCxDQUFTL0IsSUFBVDs7QUFFQSxVQUFHd00sT0FBT0YsUUFBVixFQUFtQjtBQUFFQyxlQUFPdlQsT0FBT2dLLHFCQUFQLENBQTZCeUosSUFBN0IsRUFBbUN6TSxJQUFuQyxDQUFQO0FBQWtELE9BQXZFLE1BQ0k7QUFDRmhILGVBQU9rSyxvQkFBUCxDQUE0QnFKLElBQTVCO0FBQ0F2TSxhQUFLN0IsT0FBTCxDQUFhLHFCQUFiLEVBQW9DLENBQUM2QixJQUFELENBQXBDLEVBQTRDdUIsY0FBNUMsQ0FBMkQscUJBQTNELEVBQWtGLENBQUN2QixJQUFELENBQWxGO0FBQ0Q7QUFDRjtBQUNEdU0sV0FBT3ZULE9BQU9nSyxxQkFBUCxDQUE2QnlKLElBQTdCLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7O0FBU0EsV0FBU04sT0FBVCxDQUFpQlEsSUFBakIsRUFBdUIzSCxPQUF2QixFQUFnQ2lILFNBQWhDLEVBQTJDQyxFQUEzQyxFQUErQztBQUM3Q2xILGNBQVVsSSxFQUFFa0ksT0FBRixFQUFXNEgsRUFBWCxDQUFjLENBQWQsQ0FBVjs7QUFFQSxRQUFJLENBQUM1SCxRQUFRekYsTUFBYixFQUFxQjs7QUFFckIsUUFBSXNOLFlBQVlGLE9BQU9kLFlBQVksQ0FBWixDQUFQLEdBQXdCQSxZQUFZLENBQVosQ0FBeEM7QUFDQSxRQUFJaUIsY0FBY0gsT0FBT2IsY0FBYyxDQUFkLENBQVAsR0FBMEJBLGNBQWMsQ0FBZCxDQUE1Qzs7QUFFQTtBQUNBaUI7O0FBRUEvSCxZQUNHZ0ksUUFESCxDQUNZZixTQURaLEVBRUcxQyxHQUZILENBRU8sWUFGUCxFQUVxQixNQUZyQjs7QUFJQXZHLDBCQUFzQixZQUFNO0FBQzFCZ0MsY0FBUWdJLFFBQVIsQ0FBaUJILFNBQWpCO0FBQ0EsVUFBSUYsSUFBSixFQUFVM0gsUUFBUWlJLElBQVI7QUFDWCxLQUhEOztBQUtBO0FBQ0FqSywwQkFBc0IsWUFBTTtBQUMxQmdDLGNBQVEsQ0FBUixFQUFXa0ksV0FBWDtBQUNBbEksY0FDR3VFLEdBREgsQ0FDTyxZQURQLEVBQ3FCLEVBRHJCLEVBRUd5RCxRQUZILENBRVlGLFdBRlo7QUFHRCxLQUxEOztBQU9BO0FBQ0E5SCxZQUFRbUksR0FBUixDQUFZblEsV0FBV2tFLGFBQVgsQ0FBeUI4RCxPQUF6QixDQUFaLEVBQStDb0ksTUFBL0M7O0FBRUE7QUFDQSxhQUFTQSxNQUFULEdBQWtCO0FBQ2hCLFVBQUksQ0FBQ1QsSUFBTCxFQUFXM0gsUUFBUXFJLElBQVI7QUFDWE47QUFDQSxVQUFJYixFQUFKLEVBQVFBLEdBQUduSyxLQUFILENBQVNpRCxPQUFUO0FBQ1Q7O0FBRUQ7QUFDQSxhQUFTK0gsS0FBVCxHQUFpQjtBQUNmL0gsY0FBUSxDQUFSLEVBQVcxRCxLQUFYLENBQWlCZ00sa0JBQWpCLEdBQXNDLENBQXRDO0FBQ0F0SSxjQUFRM0MsV0FBUixDQUF1QndLLFNBQXZCLFNBQW9DQyxXQUFwQyxTQUFtRGIsU0FBbkQ7QUFDRDtBQUNGOztBQUVEalAsYUFBV3FQLElBQVgsR0FBa0JBLElBQWxCO0FBQ0FyUCxhQUFXK08sTUFBWCxHQUFvQkEsTUFBcEI7QUFFQyxDQWhHQSxDQWdHQ3BILE1BaEdELENBQUQ7Q0NGQTs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWIsTUFBTXlRLE9BQU87QUFDWEMsV0FEVyxZQUNIQyxJQURHLEVBQ2dCO0FBQUEsVUFBYi9TLElBQWEsdUVBQU4sSUFBTTs7QUFDekIrUyxXQUFLcFEsSUFBTCxDQUFVLE1BQVYsRUFBa0IsU0FBbEI7O0FBRUEsVUFBSXFRLFFBQVFELEtBQUt0TixJQUFMLENBQVUsSUFBVixFQUFnQjlDLElBQWhCLENBQXFCLEVBQUMsUUFBUSxVQUFULEVBQXJCLENBQVo7QUFBQSxVQUNJc1EsdUJBQXFCalQsSUFBckIsYUFESjtBQUFBLFVBRUlrVCxlQUFrQkQsWUFBbEIsVUFGSjtBQUFBLFVBR0lFLHNCQUFvQm5ULElBQXBCLG9CQUhKOztBQUtBK1MsV0FBS3ROLElBQUwsQ0FBVSxTQUFWLEVBQXFCOUMsSUFBckIsQ0FBMEIsVUFBMUIsRUFBc0MsQ0FBdEM7O0FBRUFxUSxZQUFNL08sSUFBTixDQUFXLFlBQVc7QUFDcEIsWUFBSW1QLFFBQVFoUixFQUFFLElBQUYsQ0FBWjtBQUFBLFlBQ0lpUixPQUFPRCxNQUFNRSxRQUFOLENBQWUsSUFBZixDQURYOztBQUdBLFlBQUlELEtBQUt4TyxNQUFULEVBQWlCO0FBQ2Z1TyxnQkFDR2QsUUFESCxDQUNZYSxXQURaLEVBRUd4USxJQUZILENBRVE7QUFDSiw2QkFBaUIsSUFEYjtBQUVKLDZCQUFpQixLQUZiO0FBR0osMEJBQWN5USxNQUFNRSxRQUFOLENBQWUsU0FBZixFQUEwQi9DLElBQTFCO0FBSFYsV0FGUjs7QUFRQThDLGVBQ0dmLFFBREgsY0FDdUJXLFlBRHZCLEVBRUd0USxJQUZILENBRVE7QUFDSiw0QkFBZ0IsRUFEWjtBQUVKLDJCQUFlLElBRlg7QUFHSixvQkFBUTtBQUhKLFdBRlI7QUFPRDs7QUFFRCxZQUFJeVEsTUFBTTdJLE1BQU4sQ0FBYSxnQkFBYixFQUErQjFGLE1BQW5DLEVBQTJDO0FBQ3pDdU8sZ0JBQU1kLFFBQU4sc0JBQWtDWSxZQUFsQztBQUNEO0FBQ0YsT0F6QkQ7O0FBMkJBO0FBQ0QsS0F2Q1U7QUF5Q1hLLFFBekNXLFlBeUNOUixJQXpDTSxFQXlDQS9TLElBekNBLEVBeUNNO0FBQ2YsVUFBSWdULFFBQVFELEtBQUt0TixJQUFMLENBQVUsSUFBVixFQUFnQjlCLFVBQWhCLENBQTJCLFVBQTNCLENBQVo7QUFBQSxVQUNJc1AsdUJBQXFCalQsSUFBckIsYUFESjtBQUFBLFVBRUlrVCxlQUFrQkQsWUFBbEIsVUFGSjtBQUFBLFVBR0lFLHNCQUFvQm5ULElBQXBCLG9CQUhKOztBQUtBK1MsV0FDR3ROLElBREgsQ0FDUSxHQURSLEVBRUdrQyxXQUZILENBRWtCc0wsWUFGbEIsU0FFa0NDLFlBRmxDLFNBRWtEQyxXQUZsRCx5Q0FHR3hQLFVBSEgsQ0FHYyxjQUhkLEVBRzhCa0wsR0FIOUIsQ0FHa0MsU0FIbEMsRUFHNkMsRUFIN0M7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNEO0FBbEVVLEdBQWI7O0FBcUVBdk0sYUFBV3VRLElBQVgsR0FBa0JBLElBQWxCO0FBRUMsQ0F6RUEsQ0F5RUM1SSxNQXpFRCxDQUFEO0NDRkE7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViLFdBQVNvUixLQUFULENBQWVsTyxJQUFmLEVBQXFCbU8sT0FBckIsRUFBOEJqQyxFQUE5QixFQUFrQztBQUNoQyxRQUFJck4sUUFBUSxJQUFaO0FBQUEsUUFDSXlOLFdBQVc2QixRQUFRN0IsUUFEdkI7QUFBQSxRQUNnQztBQUM1QjhCLGdCQUFZalAsT0FBT3hDLElBQVAsQ0FBWXFELEtBQUs5QixJQUFMLEVBQVosRUFBeUIsQ0FBekIsS0FBK0IsT0FGL0M7QUFBQSxRQUdJbVEsU0FBUyxDQUFDLENBSGQ7QUFBQSxRQUlJMUssS0FKSjtBQUFBLFFBS0k3SixLQUxKOztBQU9BLFNBQUt3VSxRQUFMLEdBQWdCLEtBQWhCOztBQUVBLFNBQUtDLE9BQUwsR0FBZSxZQUFXO0FBQ3hCRixlQUFTLENBQUMsQ0FBVjtBQUNBL1QsbUJBQWFSLEtBQWI7QUFDQSxXQUFLNkosS0FBTDtBQUNELEtBSkQ7O0FBTUEsU0FBS0EsS0FBTCxHQUFhLFlBQVc7QUFDdEIsV0FBSzJLLFFBQUwsR0FBZ0IsS0FBaEI7QUFDQTtBQUNBaFUsbUJBQWFSLEtBQWI7QUFDQXVVLGVBQVNBLFVBQVUsQ0FBVixHQUFjL0IsUUFBZCxHQUF5QitCLE1BQWxDO0FBQ0FyTyxXQUFLOUIsSUFBTCxDQUFVLFFBQVYsRUFBb0IsS0FBcEI7QUFDQXlGLGNBQVFmLEtBQUtDLEdBQUwsRUFBUjtBQUNBL0ksY0FBUUssV0FBVyxZQUFVO0FBQzNCLFlBQUdnVSxRQUFRSyxRQUFYLEVBQW9CO0FBQ2xCM1AsZ0JBQU0wUCxPQUFOLEdBRGtCLENBQ0Y7QUFDakI7QUFDRHJDO0FBQ0QsT0FMTyxFQUtMbUMsTUFMSyxDQUFSO0FBTUFyTyxXQUFLN0IsT0FBTCxvQkFBOEJpUSxTQUE5QjtBQUNELEtBZEQ7O0FBZ0JBLFNBQUtLLEtBQUwsR0FBYSxZQUFXO0FBQ3RCLFdBQUtILFFBQUwsR0FBZ0IsSUFBaEI7QUFDQTtBQUNBaFUsbUJBQWFSLEtBQWI7QUFDQWtHLFdBQUs5QixJQUFMLENBQVUsUUFBVixFQUFvQixJQUFwQjtBQUNBLFVBQUlrRCxNQUFNd0IsS0FBS0MsR0FBTCxFQUFWO0FBQ0F3TCxlQUFTQSxVQUFVak4sTUFBTXVDLEtBQWhCLENBQVQ7QUFDQTNELFdBQUs3QixPQUFMLHFCQUErQmlRLFNBQS9CO0FBQ0QsS0FSRDtBQVNEOztBQUVEOzs7OztBQUtBLFdBQVNNLGNBQVQsQ0FBd0JDLE1BQXhCLEVBQWdDcEwsUUFBaEMsRUFBeUM7QUFDdkMsUUFBSThGLE9BQU8sSUFBWDtBQUFBLFFBQ0l1RixXQUFXRCxPQUFPcFAsTUFEdEI7O0FBR0EsUUFBSXFQLGFBQWEsQ0FBakIsRUFBb0I7QUFDbEJyTDtBQUNEOztBQUVEb0wsV0FBT2hRLElBQVAsQ0FBWSxZQUFXO0FBQ3JCLFVBQUksS0FBS2tRLFFBQVQsRUFBbUI7QUFDakJDO0FBQ0QsT0FGRCxNQUdLLElBQUksT0FBTyxLQUFLQyxZQUFaLEtBQTZCLFdBQTdCLElBQTRDLEtBQUtBLFlBQUwsR0FBb0IsQ0FBcEUsRUFBdUU7QUFDMUVEO0FBQ0QsT0FGSSxNQUdBO0FBQ0hoUyxVQUFFLElBQUYsRUFBUXFRLEdBQVIsQ0FBWSxNQUFaLEVBQW9CLFlBQVc7QUFDN0IyQjtBQUNELFNBRkQ7QUFHRDtBQUNGLEtBWkQ7O0FBY0EsYUFBU0EsaUJBQVQsR0FBNkI7QUFDM0JGO0FBQ0EsVUFBSUEsYUFBYSxDQUFqQixFQUFvQjtBQUNsQnJMO0FBQ0Q7QUFDRjtBQUNGOztBQUVEdkcsYUFBV2tSLEtBQVgsR0FBbUJBLEtBQW5CO0FBQ0FsUixhQUFXMFIsY0FBWCxHQUE0QkEsY0FBNUI7QUFFQyxDQW5GQSxDQW1GQy9KLE1BbkZELENBQUQ7OztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUVYQSxHQUFFa1MsU0FBRixHQUFjO0FBQ1ovUixXQUFTLE9BREc7QUFFWmdTLFdBQVMsa0JBQWtCaFQsU0FBU2lULGVBRnhCO0FBR1pDLGtCQUFnQixLQUhKO0FBSVpDLGlCQUFlLEVBSkg7QUFLWkMsaUJBQWU7QUFMSCxFQUFkOztBQVFBLEtBQU1DLFNBQU47QUFBQSxLQUNNQyxTQUROO0FBQUEsS0FFTUMsU0FGTjtBQUFBLEtBR01DLFdBSE47QUFBQSxLQUlNQyxXQUFXLEtBSmpCOztBQU1BLFVBQVNDLFVBQVQsR0FBc0I7QUFDcEI7QUFDQSxPQUFLQyxtQkFBTCxDQUF5QixXQUF6QixFQUFzQ0MsV0FBdEM7QUFDQSxPQUFLRCxtQkFBTCxDQUF5QixVQUF6QixFQUFxQ0QsVUFBckM7QUFDQUQsYUFBVyxLQUFYO0FBQ0Q7O0FBRUQsVUFBU0csV0FBVCxDQUFxQm5QLENBQXJCLEVBQXdCO0FBQ3RCLE1BQUk1RCxFQUFFa1MsU0FBRixDQUFZRyxjQUFoQixFQUFnQztBQUFFek8sS0FBRXlPLGNBQUY7QUFBcUI7QUFDdkQsTUFBR08sUUFBSCxFQUFhO0FBQ1gsT0FBSUksSUFBSXBQLEVBQUVxUCxPQUFGLENBQVUsQ0FBVixFQUFhQyxLQUFyQjtBQUNBLE9BQUlDLElBQUl2UCxFQUFFcVAsT0FBRixDQUFVLENBQVYsRUFBYUcsS0FBckI7QUFDQSxPQUFJQyxLQUFLYixZQUFZUSxDQUFyQjtBQUNBLE9BQUlNLEtBQUtiLFlBQVlVLENBQXJCO0FBQ0EsT0FBSUksR0FBSjtBQUNBWixpQkFBYyxJQUFJN00sSUFBSixHQUFXRSxPQUFYLEtBQXVCME0sU0FBckM7QUFDQSxPQUFHL1AsS0FBSzZRLEdBQUwsQ0FBU0gsRUFBVCxLQUFnQnJULEVBQUVrUyxTQUFGLENBQVlJLGFBQTVCLElBQTZDSyxlQUFlM1MsRUFBRWtTLFNBQUYsQ0FBWUssYUFBM0UsRUFBMEY7QUFDeEZnQixVQUFNRixLQUFLLENBQUwsR0FBUyxNQUFULEdBQWtCLE9BQXhCO0FBQ0Q7QUFDRDtBQUNBO0FBQ0E7QUFDQSxPQUFHRSxHQUFILEVBQVE7QUFDTjNQLE1BQUV5TyxjQUFGO0FBQ0FRLGVBQVdwTixJQUFYLENBQWdCLElBQWhCO0FBQ0F6RixNQUFFLElBQUYsRUFBUXFCLE9BQVIsQ0FBZ0IsT0FBaEIsRUFBeUJrUyxHQUF6QixFQUE4QmxTLE9BQTlCLFdBQThDa1MsR0FBOUM7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsVUFBU0UsWUFBVCxDQUFzQjdQLENBQXRCLEVBQXlCO0FBQ3ZCLE1BQUlBLEVBQUVxUCxPQUFGLENBQVV4USxNQUFWLElBQW9CLENBQXhCLEVBQTJCO0FBQ3pCK1AsZUFBWTVPLEVBQUVxUCxPQUFGLENBQVUsQ0FBVixFQUFhQyxLQUF6QjtBQUNBVCxlQUFZN08sRUFBRXFQLE9BQUYsQ0FBVSxDQUFWLEVBQWFHLEtBQXpCO0FBQ0FSLGNBQVcsSUFBWDtBQUNBRixlQUFZLElBQUk1TSxJQUFKLEdBQVdFLE9BQVgsRUFBWjtBQUNBLFFBQUszRyxnQkFBTCxDQUFzQixXQUF0QixFQUFtQzBULFdBQW5DLEVBQWdELEtBQWhEO0FBQ0EsUUFBSzFULGdCQUFMLENBQXNCLFVBQXRCLEVBQWtDd1QsVUFBbEMsRUFBOEMsS0FBOUM7QUFDRDtBQUNGOztBQUVELFVBQVNhLElBQVQsR0FBZ0I7QUFDZCxPQUFLclUsZ0JBQUwsSUFBeUIsS0FBS0EsZ0JBQUwsQ0FBc0IsWUFBdEIsRUFBb0NvVSxZQUFwQyxFQUFrRCxLQUFsRCxDQUF6QjtBQUNEOztBQUVELFVBQVNFLFFBQVQsR0FBb0I7QUFDbEIsT0FBS2IsbUJBQUwsQ0FBeUIsWUFBekIsRUFBdUNXLFlBQXZDO0FBQ0Q7O0FBRUR6VCxHQUFFNUMsS0FBRixDQUFRd1csT0FBUixDQUFnQkMsS0FBaEIsR0FBd0IsRUFBRUMsT0FBT0osSUFBVCxFQUF4Qjs7QUFFQTFULEdBQUU2QixJQUFGLENBQU8sQ0FBQyxNQUFELEVBQVMsSUFBVCxFQUFlLE1BQWYsRUFBdUIsT0FBdkIsQ0FBUCxFQUF3QyxZQUFZO0FBQ2xEN0IsSUFBRTVDLEtBQUYsQ0FBUXdXLE9BQVIsV0FBd0IsSUFBeEIsSUFBa0MsRUFBRUUsT0FBTyxZQUFVO0FBQ25EOVQsTUFBRSxJQUFGLEVBQVFzTixFQUFSLENBQVcsT0FBWCxFQUFvQnROLEVBQUUrVCxJQUF0QjtBQUNELElBRmlDLEVBQWxDO0FBR0QsRUFKRDtBQUtELENBeEVELEVBd0VHbE0sTUF4RUg7QUF5RUE7OztBQUdBLENBQUMsVUFBUzdILENBQVQsRUFBVztBQUNWQSxHQUFFNkYsRUFBRixDQUFLbU8sUUFBTCxHQUFnQixZQUFVO0FBQ3hCLE9BQUtuUyxJQUFMLENBQVUsVUFBU3NCLENBQVQsRUFBV1ksRUFBWCxFQUFjO0FBQ3RCL0QsS0FBRStELEVBQUYsRUFBTWdELElBQU4sQ0FBVywyQ0FBWCxFQUF1RCxZQUFVO0FBQy9EO0FBQ0E7QUFDQWtOLGdCQUFZN1csS0FBWjtBQUNELElBSkQ7QUFLRCxHQU5EOztBQVFBLE1BQUk2VyxjQUFjLFVBQVM3VyxLQUFULEVBQWU7QUFDL0IsT0FBSTZWLFVBQVU3VixNQUFNOFcsY0FBcEI7QUFBQSxPQUNJQyxRQUFRbEIsUUFBUSxDQUFSLENBRFo7QUFBQSxPQUVJbUIsYUFBYTtBQUNYQyxnQkFBWSxXQUREO0FBRVhDLGVBQVcsV0FGQTtBQUdYQyxjQUFVO0FBSEMsSUFGakI7QUFBQSxPQU9JM1csT0FBT3dXLFdBQVdoWCxNQUFNUSxJQUFqQixDQVBYO0FBQUEsT0FRSTRXLGNBUko7O0FBV0EsT0FBRyxnQkFBZ0J0WSxNQUFoQixJQUEwQixPQUFPQSxPQUFPdVksVUFBZCxLQUE2QixVQUExRCxFQUFzRTtBQUNwRUQscUJBQWlCLElBQUl0WSxPQUFPdVksVUFBWCxDQUFzQjdXLElBQXRCLEVBQTRCO0FBQzNDLGdCQUFXLElBRGdDO0FBRTNDLG1CQUFjLElBRjZCO0FBRzNDLGdCQUFXdVcsTUFBTU8sT0FIMEI7QUFJM0MsZ0JBQVdQLE1BQU1RLE9BSjBCO0FBSzNDLGdCQUFXUixNQUFNUyxPQUwwQjtBQU0zQyxnQkFBV1QsTUFBTVU7QUFOMEIsS0FBNUIsQ0FBakI7QUFRRCxJQVRELE1BU087QUFDTEwscUJBQWlCclYsU0FBUzJWLFdBQVQsQ0FBcUIsWUFBckIsQ0FBakI7QUFDQU4sbUJBQWVPLGNBQWYsQ0FBOEJuWCxJQUE5QixFQUFvQyxJQUFwQyxFQUEwQyxJQUExQyxFQUFnRDFCLE1BQWhELEVBQXdELENBQXhELEVBQTJEaVksTUFBTU8sT0FBakUsRUFBMEVQLE1BQU1RLE9BQWhGLEVBQXlGUixNQUFNUyxPQUEvRixFQUF3R1QsTUFBTVUsT0FBOUcsRUFBdUgsS0FBdkgsRUFBOEgsS0FBOUgsRUFBcUksS0FBckksRUFBNEksS0FBNUksRUFBbUosQ0FBbkosQ0FBb0osUUFBcEosRUFBOEosSUFBOUo7QUFDRDtBQUNEVixTQUFNcFcsTUFBTixDQUFhaVgsYUFBYixDQUEyQlIsY0FBM0I7QUFDRCxHQTFCRDtBQTJCRCxFQXBDRDtBQXFDRCxDQXRDQSxDQXNDQzNNLE1BdENELENBQUQ7O0FBeUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQy9IQTs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWIsTUFBTWlWLG1CQUFvQixZQUFZO0FBQ3BDLFFBQUlDLFdBQVcsQ0FBQyxRQUFELEVBQVcsS0FBWCxFQUFrQixHQUFsQixFQUF1QixJQUF2QixFQUE2QixFQUE3QixDQUFmO0FBQ0EsU0FBSyxJQUFJL1IsSUFBRSxDQUFYLEVBQWNBLElBQUkrUixTQUFTelMsTUFBM0IsRUFBbUNVLEdBQW5DLEVBQXdDO0FBQ3RDLFVBQU8rUixTQUFTL1IsQ0FBVCxDQUFILHlCQUFvQ2pILE1BQXhDLEVBQWdEO0FBQzlDLGVBQU9BLE9BQVVnWixTQUFTL1IsQ0FBVCxDQUFWLHNCQUFQO0FBQ0Q7QUFDRjtBQUNELFdBQU8sS0FBUDtBQUNELEdBUnlCLEVBQTFCOztBQVVBLE1BQU1nUyxXQUFXLFVBQUNwUixFQUFELEVBQUtuRyxJQUFMLEVBQWM7QUFDN0JtRyxPQUFHM0MsSUFBSCxDQUFReEQsSUFBUixFQUFjK0YsS0FBZCxDQUFvQixHQUFwQixFQUF5QnpCLE9BQXpCLENBQWlDLGNBQU07QUFDckNsQyxjQUFNOE4sRUFBTixFQUFhbFEsU0FBUyxPQUFULEdBQW1CLFNBQW5CLEdBQStCLGdCQUE1QyxFQUFpRUEsSUFBakUsa0JBQW9GLENBQUNtRyxFQUFELENBQXBGO0FBQ0QsS0FGRDtBQUdELEdBSkQ7QUFLQTtBQUNBL0QsSUFBRWIsUUFBRixFQUFZbU8sRUFBWixDQUFlLGtCQUFmLEVBQW1DLGFBQW5DLEVBQWtELFlBQVc7QUFDM0Q2SCxhQUFTblYsRUFBRSxJQUFGLENBQVQsRUFBa0IsTUFBbEI7QUFDRCxHQUZEOztBQUlBO0FBQ0E7QUFDQUEsSUFBRWIsUUFBRixFQUFZbU8sRUFBWixDQUFlLGtCQUFmLEVBQW1DLGNBQW5DLEVBQW1ELFlBQVc7QUFDNUQsUUFBSVEsS0FBSzlOLEVBQUUsSUFBRixFQUFRb0IsSUFBUixDQUFhLE9BQWIsQ0FBVDtBQUNBLFFBQUkwTSxFQUFKLEVBQVE7QUFDTnFILGVBQVNuVixFQUFFLElBQUYsQ0FBVCxFQUFrQixPQUFsQjtBQUNELEtBRkQsTUFHSztBQUNIQSxRQUFFLElBQUYsRUFBUXFCLE9BQVIsQ0FBZ0Isa0JBQWhCO0FBQ0Q7QUFDRixHQVJEOztBQVVBO0FBQ0FyQixJQUFFYixRQUFGLEVBQVltTyxFQUFaLENBQWUsa0JBQWYsRUFBbUMsZUFBbkMsRUFBb0QsWUFBVztBQUM3RDZILGFBQVNuVixFQUFFLElBQUYsQ0FBVCxFQUFrQixRQUFsQjtBQUNELEdBRkQ7O0FBSUE7QUFDQUEsSUFBRWIsUUFBRixFQUFZbU8sRUFBWixDQUFlLGtCQUFmLEVBQW1DLGlCQUFuQyxFQUFzRCxVQUFTMUosQ0FBVCxFQUFXO0FBQy9EQSxNQUFFd1IsZUFBRjtBQUNBLFFBQUlqRyxZQUFZblAsRUFBRSxJQUFGLEVBQVFvQixJQUFSLENBQWEsVUFBYixDQUFoQjs7QUFFQSxRQUFHK04sY0FBYyxFQUFqQixFQUFvQjtBQUNsQmpQLGlCQUFXK08sTUFBWCxDQUFrQkssVUFBbEIsQ0FBNkJ0UCxFQUFFLElBQUYsQ0FBN0IsRUFBc0NtUCxTQUF0QyxFQUFpRCxZQUFXO0FBQzFEblAsVUFBRSxJQUFGLEVBQVFxQixPQUFSLENBQWdCLFdBQWhCO0FBQ0QsT0FGRDtBQUdELEtBSkQsTUFJSztBQUNIckIsUUFBRSxJQUFGLEVBQVFxVixPQUFSLEdBQWtCaFUsT0FBbEIsQ0FBMEIsV0FBMUI7QUFDRDtBQUNGLEdBWEQ7O0FBYUFyQixJQUFFYixRQUFGLEVBQVltTyxFQUFaLENBQWUsa0NBQWYsRUFBbUQscUJBQW5ELEVBQTBFLFlBQVc7QUFDbkYsUUFBSVEsS0FBSzlOLEVBQUUsSUFBRixFQUFRb0IsSUFBUixDQUFhLGNBQWIsQ0FBVDtBQUNBcEIsWUFBTThOLEVBQU4sRUFBWXJKLGNBQVosQ0FBMkIsbUJBQTNCLEVBQWdELENBQUN6RSxFQUFFLElBQUYsQ0FBRCxDQUFoRDtBQUNELEdBSEQ7O0FBS0E7Ozs7O0FBS0FBLElBQUU5RCxNQUFGLEVBQVVvWixJQUFWLENBQWUsWUFBTTtBQUNuQkM7QUFDRCxHQUZEOztBQUlBLFdBQVNBLGNBQVQsR0FBMEI7QUFDeEJDO0FBQ0FDO0FBQ0FDO0FBQ0FDO0FBQ0Q7O0FBRUQ7QUFDQSxXQUFTQSxlQUFULENBQXlCNVUsVUFBekIsRUFBcUM7QUFDbkMsUUFBSTZVLFlBQVk1VixFQUFFLGlCQUFGLENBQWhCO0FBQUEsUUFDSTZWLFlBQVksQ0FBQyxVQUFELEVBQWEsU0FBYixFQUF3QixRQUF4QixDQURoQjs7QUFHQSxRQUFHOVUsVUFBSCxFQUFjO0FBQ1osVUFBRyxPQUFPQSxVQUFQLEtBQXNCLFFBQXpCLEVBQWtDO0FBQ2hDOFUsa0JBQVVsWCxJQUFWLENBQWVvQyxVQUFmO0FBQ0QsT0FGRCxNQUVNLElBQUcsT0FBT0EsVUFBUCxLQUFzQixRQUF0QixJQUFrQyxPQUFPQSxXQUFXLENBQVgsQ0FBUCxLQUF5QixRQUE5RCxFQUF1RTtBQUMzRThVLGtCQUFVeE8sTUFBVixDQUFpQnRHLFVBQWpCO0FBQ0QsT0FGSyxNQUVEO0FBQ0h3QixnQkFBUUMsS0FBUixDQUFjLDhCQUFkO0FBQ0Q7QUFDRjtBQUNELFFBQUdvVCxVQUFVblQsTUFBYixFQUFvQjtBQUNsQixVQUFJcVQsWUFBWUQsVUFBVS9SLEdBQVYsQ0FBYyxVQUFDckQsSUFBRCxFQUFVO0FBQ3RDLCtCQUFxQkEsSUFBckI7QUFDRCxPQUZlLEVBRWJzVixJQUZhLENBRVIsR0FGUSxDQUFoQjs7QUFJQS9WLFFBQUU5RCxNQUFGLEVBQVU4WixHQUFWLENBQWNGLFNBQWQsRUFBeUJ4SSxFQUF6QixDQUE0QndJLFNBQTVCLEVBQXVDLFVBQVNsUyxDQUFULEVBQVlxUyxRQUFaLEVBQXFCO0FBQzFELFlBQUl6VixTQUFTb0QsRUFBRWxCLFNBQUYsQ0FBWWlCLEtBQVosQ0FBa0IsR0FBbEIsRUFBdUIsQ0FBdkIsQ0FBYjtBQUNBLFlBQUloQyxVQUFVM0IsYUFBV1EsTUFBWCxRQUFzQjBWLEdBQXRCLHNCQUE2Q0QsUUFBN0MsUUFBZDs7QUFFQXRVLGdCQUFRRSxJQUFSLENBQWEsWUFBVTtBQUNyQixjQUFJRSxRQUFRL0IsRUFBRSxJQUFGLENBQVo7O0FBRUErQixnQkFBTTBDLGNBQU4sQ0FBcUIsa0JBQXJCLEVBQXlDLENBQUMxQyxLQUFELENBQXpDO0FBQ0QsU0FKRDtBQUtELE9BVEQ7QUFVRDtBQUNGOztBQUVELFdBQVMwVCxjQUFULENBQXdCVSxRQUF4QixFQUFpQztBQUMvQixRQUFJblosY0FBSjtBQUFBLFFBQ0lvWixTQUFTcFcsRUFBRSxlQUFGLENBRGI7QUFFQSxRQUFHb1csT0FBTzNULE1BQVYsRUFBaUI7QUFDZnpDLFFBQUU5RCxNQUFGLEVBQVU4WixHQUFWLENBQWMsbUJBQWQsRUFDQzFJLEVBREQsQ0FDSSxtQkFESixFQUN5QixVQUFTMUosQ0FBVCxFQUFZO0FBQ25DLFlBQUk1RyxLQUFKLEVBQVc7QUFBRVEsdUJBQWFSLEtBQWI7QUFBc0I7O0FBRW5DQSxnQkFBUUssV0FBVyxZQUFVOztBQUUzQixjQUFHLENBQUM0WCxnQkFBSixFQUFxQjtBQUFDO0FBQ3BCbUIsbUJBQU92VSxJQUFQLENBQVksWUFBVTtBQUNwQjdCLGdCQUFFLElBQUYsRUFBUXlFLGNBQVIsQ0FBdUIscUJBQXZCO0FBQ0QsYUFGRDtBQUdEO0FBQ0Q7QUFDQTJSLGlCQUFPN1YsSUFBUCxDQUFZLGFBQVosRUFBMkIsUUFBM0I7QUFDRCxTQVRPLEVBU0w0VixZQUFZLEVBVFAsQ0FBUixDQUhtQyxDQVloQjtBQUNwQixPQWREO0FBZUQ7QUFDRjs7QUFFRCxXQUFTVCxjQUFULENBQXdCUyxRQUF4QixFQUFpQztBQUMvQixRQUFJblosY0FBSjtBQUFBLFFBQ0lvWixTQUFTcFcsRUFBRSxlQUFGLENBRGI7QUFFQSxRQUFHb1csT0FBTzNULE1BQVYsRUFBaUI7QUFDZnpDLFFBQUU5RCxNQUFGLEVBQVU4WixHQUFWLENBQWMsbUJBQWQsRUFDQzFJLEVBREQsQ0FDSSxtQkFESixFQUN5QixVQUFTMUosQ0FBVCxFQUFXO0FBQ2xDLFlBQUc1RyxLQUFILEVBQVM7QUFBRVEsdUJBQWFSLEtBQWI7QUFBc0I7O0FBRWpDQSxnQkFBUUssV0FBVyxZQUFVOztBQUUzQixjQUFHLENBQUM0WCxnQkFBSixFQUFxQjtBQUFDO0FBQ3BCbUIsbUJBQU92VSxJQUFQLENBQVksWUFBVTtBQUNwQjdCLGdCQUFFLElBQUYsRUFBUXlFLGNBQVIsQ0FBdUIscUJBQXZCO0FBQ0QsYUFGRDtBQUdEO0FBQ0Q7QUFDQTJSLGlCQUFPN1YsSUFBUCxDQUFZLGFBQVosRUFBMkIsUUFBM0I7QUFDRCxTQVRPLEVBU0w0VixZQUFZLEVBVFAsQ0FBUixDQUhrQyxDQVlmO0FBQ3BCLE9BZEQ7QUFlRDtBQUNGOztBQUVELFdBQVNYLGNBQVQsR0FBMEI7QUFDeEIsUUFBRyxDQUFDUCxnQkFBSixFQUFxQjtBQUFFLGFBQU8sS0FBUDtBQUFlO0FBQ3RDLFFBQUlvQixRQUFRbFgsU0FBU21YLGdCQUFULENBQTBCLDZDQUExQixDQUFaOztBQUVBO0FBQ0EsUUFBSUMsNEJBQTRCLFVBQVNDLG1CQUFULEVBQThCO0FBQzVELFVBQUlDLFVBQVV6VyxFQUFFd1csb0JBQW9CLENBQXBCLEVBQXVCelksTUFBekIsQ0FBZDtBQUNBO0FBQ0EsY0FBUTBZLFFBQVFsVyxJQUFSLENBQWEsYUFBYixDQUFSOztBQUVFLGFBQUssUUFBTDtBQUNBa1csa0JBQVFoUyxjQUFSLENBQXVCLHFCQUF2QixFQUE4QyxDQUFDZ1MsT0FBRCxDQUE5QztBQUNBOztBQUVBLGFBQUssUUFBTDtBQUNBQSxrQkFBUWhTLGNBQVIsQ0FBdUIscUJBQXZCLEVBQThDLENBQUNnUyxPQUFELEVBQVV2YSxPQUFPc04sV0FBakIsQ0FBOUM7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxpQkFBTyxLQUFQO0FBQ0E7QUF0QkY7QUF3QkQsS0EzQkQ7O0FBNkJBLFFBQUc2TSxNQUFNNVQsTUFBVCxFQUFnQjtBQUNkO0FBQ0EsV0FBSyxJQUFJVSxJQUFJLENBQWIsRUFBZ0JBLEtBQUtrVCxNQUFNNVQsTUFBTixHQUFhLENBQWxDLEVBQXFDVSxHQUFyQyxFQUEwQztBQUN4QyxZQUFJdVQsa0JBQWtCLElBQUl6QixnQkFBSixDQUFxQnNCLHlCQUFyQixDQUF0QjtBQUNBRyx3QkFBZ0JDLE9BQWhCLENBQXdCTixNQUFNbFQsQ0FBTixDQUF4QixFQUFrQyxFQUFFeVQsWUFBWSxJQUFkLEVBQW9CQyxXQUFXLEtBQS9CLEVBQXNDQyxlQUFlLEtBQXJELEVBQTREQyxTQUFRLEtBQXBFLEVBQTJFQyxpQkFBZ0IsQ0FBQyxhQUFELENBQTNGLEVBQWxDO0FBQ0Q7QUFDRjtBQUNGOztBQUVEOztBQUVBO0FBQ0E7QUFDQTlXLGFBQVcrVyxRQUFYLEdBQXNCMUIsY0FBdEI7QUFDQTtBQUNBO0FBRUMsQ0F6TUEsQ0F5TUMxTixNQXpNRCxDQUFEOztBQTJNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtDQzlPQTs7Ozs7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7OztBQUZhLE1BT1BrWCxLQVBPO0FBUVg7Ozs7Ozs7QUFPQSxtQkFBWWhQLE9BQVosRUFBbUM7QUFBQSxVQUFkbUosT0FBYyx1RUFBSixFQUFJOztBQUFBOztBQUNqQyxXQUFLbFEsUUFBTCxHQUFnQitHLE9BQWhCO0FBQ0EsV0FBS21KLE9BQUwsR0FBZ0JyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYTZMLE1BQU1DLFFBQW5CLEVBQTZCLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBN0IsRUFBbURpUSxPQUFuRCxDQUFoQjs7QUFFQSxXQUFLdlAsS0FBTDs7QUFFQTVCLGlCQUFXWSxjQUFYLENBQTBCLElBQTFCLEVBQWdDLE9BQWhDO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhCVztBQUFBO0FBQUEsOEJBNEJIO0FBQ04sYUFBS3NXLE9BQUwsR0FBZSxLQUFLalcsUUFBTCxDQUFja0MsSUFBZCxDQUFtQix5QkFBbkIsQ0FBZjs7QUFFQSxhQUFLZ1UsT0FBTDtBQUNEOztBQUVEOzs7OztBQWxDVztBQUFBO0FBQUEsZ0NBc0NEO0FBQUE7O0FBQ1IsYUFBS2xXLFFBQUwsQ0FBYzZVLEdBQWQsQ0FBa0IsUUFBbEIsRUFDRzFJLEVBREgsQ0FDTSxnQkFETixFQUN3QixZQUFNO0FBQzFCLGlCQUFLZ0ssU0FBTDtBQUNELFNBSEgsRUFJR2hLLEVBSkgsQ0FJTSxpQkFKTixFQUl5QixZQUFNO0FBQzNCLGlCQUFPLE9BQUtpSyxZQUFMLEVBQVA7QUFDRCxTQU5IOztBQVFBLFlBQUksS0FBS2xHLE9BQUwsQ0FBYW1HLFVBQWIsS0FBNEIsYUFBaEMsRUFBK0M7QUFDN0MsZUFBS0osT0FBTCxDQUNHcEIsR0FESCxDQUNPLGlCQURQLEVBRUcxSSxFQUZILENBRU0saUJBRk4sRUFFeUIsVUFBQzFKLENBQUQsRUFBTztBQUM1QixtQkFBSzZULGFBQUwsQ0FBbUJ6WCxFQUFFNEQsRUFBRTdGLE1BQUosQ0FBbkI7QUFDRCxXQUpIO0FBS0Q7O0FBRUQsWUFBSSxLQUFLc1QsT0FBTCxDQUFhcUcsWUFBakIsRUFBK0I7QUFDN0IsZUFBS04sT0FBTCxDQUNHcEIsR0FESCxDQUNPLGdCQURQLEVBRUcxSSxFQUZILENBRU0sZ0JBRk4sRUFFd0IsVUFBQzFKLENBQUQsRUFBTztBQUMzQixtQkFBSzZULGFBQUwsQ0FBbUJ6WCxFQUFFNEQsRUFBRTdGLE1BQUosQ0FBbkI7QUFDRCxXQUpIO0FBS0Q7QUFDRjs7QUFFRDs7Ozs7QUFoRVc7QUFBQTtBQUFBLGdDQW9FRDtBQUNSLGFBQUsrRCxLQUFMO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhFVztBQUFBO0FBQUEsb0NBNkVHeUIsR0E3RUgsRUE2RVE7QUFDakIsWUFBSSxDQUFDQSxJQUFJaEQsSUFBSixDQUFTLFVBQVQsQ0FBTCxFQUEyQixPQUFPLElBQVA7O0FBRTNCLFlBQUlvWCxTQUFTLElBQWI7O0FBRUEsZ0JBQVFwVSxJQUFJLENBQUosRUFBTzNGLElBQWY7QUFDRSxlQUFLLFVBQUw7QUFDRStaLHFCQUFTcFUsSUFBSSxDQUFKLEVBQU9xVSxPQUFoQjtBQUNBOztBQUVGLGVBQUssUUFBTDtBQUNBLGVBQUssWUFBTDtBQUNBLGVBQUssaUJBQUw7QUFDRSxnQkFBSS9ULE1BQU1OLElBQUlGLElBQUosQ0FBUyxpQkFBVCxDQUFWO0FBQ0EsZ0JBQUksQ0FBQ1EsSUFBSXBCLE1BQUwsSUFBZSxDQUFDb0IsSUFBSStLLEdBQUosRUFBcEIsRUFBK0IrSSxTQUFTLEtBQVQ7QUFDL0I7O0FBRUY7QUFDRSxnQkFBRyxDQUFDcFUsSUFBSXFMLEdBQUosRUFBRCxJQUFjLENBQUNyTCxJQUFJcUwsR0FBSixHQUFVbk0sTUFBNUIsRUFBb0NrVixTQUFTLEtBQVQ7QUFieEM7O0FBZ0JBLGVBQU9BLE1BQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7QUFyR1c7QUFBQTtBQUFBLG9DQStHR3BVLEdBL0dILEVBK0dRO0FBQ2pCLFlBQUlzVSxTQUFTdFUsSUFBSXVVLFFBQUosQ0FBYSxLQUFLekcsT0FBTCxDQUFhMEcsaUJBQTFCLENBQWI7O0FBRUEsWUFBSSxDQUFDRixPQUFPcFYsTUFBWixFQUFvQjtBQUNsQm9WLG1CQUFTdFUsSUFBSTRFLE1BQUosR0FBYTlFLElBQWIsQ0FBa0IsS0FBS2dPLE9BQUwsQ0FBYTBHLGlCQUEvQixDQUFUO0FBQ0Q7O0FBRUQsZUFBT0YsTUFBUDtBQUNEOztBQUVEOzs7Ozs7Ozs7QUF6SFc7QUFBQTtBQUFBLGdDQWlJRHRVLEdBaklDLEVBaUlJO0FBQ2IsWUFBSXVLLEtBQUt2SyxJQUFJLENBQUosRUFBT3VLLEVBQWhCO0FBQ0EsWUFBSWtLLFNBQVMsS0FBSzdXLFFBQUwsQ0FBY2tDLElBQWQsaUJBQWlDeUssRUFBakMsUUFBYjs7QUFFQSxZQUFJLENBQUNrSyxPQUFPdlYsTUFBWixFQUFvQjtBQUNsQixpQkFBT2MsSUFBSTBVLE9BQUosQ0FBWSxPQUFaLENBQVA7QUFDRDs7QUFFRCxlQUFPRCxNQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7OztBQTVJVztBQUFBO0FBQUEsc0NBb0pLRSxJQXBKTCxFQW9KVztBQUFBOztBQUNwQixZQUFJQyxTQUFTRCxLQUFLcFUsR0FBTCxDQUFTLFVBQUNYLENBQUQsRUFBSVksRUFBSixFQUFXO0FBQy9CLGNBQUkrSixLQUFLL0osR0FBRytKLEVBQVo7QUFDQSxjQUFJa0ssU0FBUyxPQUFLN1csUUFBTCxDQUFja0MsSUFBZCxpQkFBaUN5SyxFQUFqQyxRQUFiOztBQUVBLGNBQUksQ0FBQ2tLLE9BQU92VixNQUFaLEVBQW9CO0FBQ2xCdVYscUJBQVNoWSxFQUFFK0QsRUFBRixFQUFNa1UsT0FBTixDQUFjLE9BQWQsQ0FBVDtBQUNEO0FBQ0QsaUJBQU9ELE9BQU8sQ0FBUCxDQUFQO0FBQ0QsU0FSWSxDQUFiOztBQVVBLGVBQU9oWSxFQUFFbVksTUFBRixDQUFQO0FBQ0Q7O0FBRUQ7Ozs7O0FBbEtXO0FBQUE7QUFBQSxzQ0FzS0s1VSxHQXRLTCxFQXNLVTtBQUNuQixZQUFJeVUsU0FBUyxLQUFLSSxTQUFMLENBQWU3VSxHQUFmLENBQWI7QUFDQSxZQUFJOFUsYUFBYSxLQUFLQyxhQUFMLENBQW1CL1UsR0FBbkIsQ0FBakI7O0FBRUEsWUFBSXlVLE9BQU92VixNQUFYLEVBQW1CO0FBQ2pCdVYsaUJBQU85SCxRQUFQLENBQWdCLEtBQUttQixPQUFMLENBQWFrSCxlQUE3QjtBQUNEOztBQUVELFlBQUlGLFdBQVc1VixNQUFmLEVBQXVCO0FBQ3JCNFYscUJBQVduSSxRQUFYLENBQW9CLEtBQUttQixPQUFMLENBQWFtSCxjQUFqQztBQUNEOztBQUVEalYsWUFBSTJNLFFBQUosQ0FBYSxLQUFLbUIsT0FBTCxDQUFhb0gsZUFBMUIsRUFBMkNsWSxJQUEzQyxDQUFnRCxjQUFoRCxFQUFnRSxFQUFoRTtBQUNEOztBQUVEOzs7Ozs7QUFyTFc7QUFBQTtBQUFBLDhDQTJMYW1ZLFNBM0xiLEVBMkx3QjtBQUNqQyxZQUFJUixPQUFPLEtBQUsvVyxRQUFMLENBQWNrQyxJQUFkLG1CQUFtQ3FWLFNBQW5DLFFBQVg7QUFDQSxZQUFJQyxVQUFVLEtBQUtDLGVBQUwsQ0FBcUJWLElBQXJCLENBQWQ7QUFDQSxZQUFJVyxjQUFjLEtBQUtQLGFBQUwsQ0FBbUJKLElBQW5CLENBQWxCOztBQUVBLFlBQUlTLFFBQVFsVyxNQUFaLEVBQW9CO0FBQ2xCa1csa0JBQVFwVCxXQUFSLENBQW9CLEtBQUs4TCxPQUFMLENBQWFrSCxlQUFqQztBQUNEOztBQUVELFlBQUlNLFlBQVlwVyxNQUFoQixFQUF3QjtBQUN0Qm9XLHNCQUFZdFQsV0FBWixDQUF3QixLQUFLOEwsT0FBTCxDQUFhbUgsY0FBckM7QUFDRDs7QUFFRE4sYUFBSzNTLFdBQUwsQ0FBaUIsS0FBSzhMLE9BQUwsQ0FBYW9ILGVBQTlCLEVBQStDbFgsVUFBL0MsQ0FBMEQsY0FBMUQ7QUFFRDs7QUFFRDs7Ozs7QUE1TVc7QUFBQTtBQUFBLHlDQWdOUWdDLEdBaE5SLEVBZ05hO0FBQ3RCO0FBQ0EsWUFBR0EsSUFBSSxDQUFKLEVBQU8zRixJQUFQLElBQWUsT0FBbEIsRUFBMkI7QUFDekIsaUJBQU8sS0FBS2tiLHVCQUFMLENBQTZCdlYsSUFBSWhELElBQUosQ0FBUyxNQUFULENBQTdCLENBQVA7QUFDRDs7QUFFRCxZQUFJeVgsU0FBUyxLQUFLSSxTQUFMLENBQWU3VSxHQUFmLENBQWI7QUFDQSxZQUFJOFUsYUFBYSxLQUFLQyxhQUFMLENBQW1CL1UsR0FBbkIsQ0FBakI7O0FBRUEsWUFBSXlVLE9BQU92VixNQUFYLEVBQW1CO0FBQ2pCdVYsaUJBQU96UyxXQUFQLENBQW1CLEtBQUs4TCxPQUFMLENBQWFrSCxlQUFoQztBQUNEOztBQUVELFlBQUlGLFdBQVc1VixNQUFmLEVBQXVCO0FBQ3JCNFYscUJBQVc5UyxXQUFYLENBQXVCLEtBQUs4TCxPQUFMLENBQWFtSCxjQUFwQztBQUNEOztBQUVEalYsWUFBSWdDLFdBQUosQ0FBZ0IsS0FBSzhMLE9BQUwsQ0FBYW9ILGVBQTdCLEVBQThDbFgsVUFBOUMsQ0FBeUQsY0FBekQ7QUFDRDs7QUFFRDs7Ozs7Ozs7QUFwT1c7QUFBQTtBQUFBLG9DQTJPR2dDLEdBM09ILEVBMk9RO0FBQ2pCLFlBQUl3VixlQUFlLEtBQUtDLGFBQUwsQ0FBbUJ6VixHQUFuQixDQUFuQjtBQUFBLFlBQ0kwVixZQUFZLEtBRGhCO0FBQUEsWUFFSUMsa0JBQWtCLElBRnRCO0FBQUEsWUFHSUMsWUFBWTVWLElBQUloRCxJQUFKLENBQVMsZ0JBQVQsQ0FIaEI7QUFBQSxZQUlJNlksVUFBVSxJQUpkOztBQU1BO0FBQ0EsWUFBSTdWLElBQUlvSSxFQUFKLENBQU8scUJBQVAsS0FBaUNwSSxJQUFJb0ksRUFBSixDQUFPLGlCQUFQLENBQXJDLEVBQWdFO0FBQzlELGlCQUFPLElBQVA7QUFDRDs7QUFFRCxnQkFBUXBJLElBQUksQ0FBSixFQUFPM0YsSUFBZjtBQUNFLGVBQUssT0FBTDtBQUNFcWIsd0JBQVksS0FBS0ksYUFBTCxDQUFtQjlWLElBQUloRCxJQUFKLENBQVMsTUFBVCxDQUFuQixDQUFaO0FBQ0E7O0FBRUYsZUFBSyxVQUFMO0FBQ0UwWSx3QkFBWUYsWUFBWjtBQUNBOztBQUVGLGVBQUssUUFBTDtBQUNBLGVBQUssWUFBTDtBQUNBLGVBQUssaUJBQUw7QUFDRUUsd0JBQVlGLFlBQVo7QUFDQTs7QUFFRjtBQUNFRSx3QkFBWSxLQUFLSyxZQUFMLENBQWtCL1YsR0FBbEIsQ0FBWjtBQWhCSjs7QUFtQkEsWUFBSTRWLFNBQUosRUFBZTtBQUNiRCw0QkFBa0IsS0FBS0ssZUFBTCxDQUFxQmhXLEdBQXJCLEVBQTBCNFYsU0FBMUIsRUFBcUM1VixJQUFJaEQsSUFBSixDQUFTLFVBQVQsQ0FBckMsQ0FBbEI7QUFDRDs7QUFFRCxZQUFJZ0QsSUFBSWhELElBQUosQ0FBUyxjQUFULENBQUosRUFBOEI7QUFDNUI2WSxvQkFBVSxLQUFLL0gsT0FBTCxDQUFhbUksVUFBYixDQUF3QkosT0FBeEIsQ0FBZ0M3VixHQUFoQyxDQUFWO0FBQ0Q7O0FBR0QsWUFBSWtXLFdBQVcsQ0FBQ1YsWUFBRCxFQUFlRSxTQUFmLEVBQTBCQyxlQUExQixFQUEyQ0UsT0FBM0MsRUFBb0Q5YSxPQUFwRCxDQUE0RCxLQUE1RCxNQUF1RSxDQUFDLENBQXZGO0FBQ0EsWUFBSW9iLFVBQVUsQ0FBQ0QsV0FBVyxPQUFYLEdBQXFCLFNBQXRCLElBQW1DLFdBQWpEOztBQUVBLGFBQUtBLFdBQVcsb0JBQVgsR0FBa0MsaUJBQXZDLEVBQTBEbFcsR0FBMUQ7O0FBRUE7Ozs7OztBQU1BQSxZQUFJbEMsT0FBSixDQUFZcVksT0FBWixFQUFxQixDQUFDblcsR0FBRCxDQUFyQjs7QUFFQSxlQUFPa1csUUFBUDtBQUNEOztBQUVEOzs7Ozs7O0FBblNXO0FBQUE7QUFBQSxxQ0F5U0k7QUFDYixZQUFJRSxNQUFNLEVBQVY7QUFDQSxZQUFJNVgsUUFBUSxJQUFaOztBQUVBLGFBQUtxVixPQUFMLENBQWF2VixJQUFiLENBQWtCLFlBQVc7QUFDM0I4WCxjQUFJaGIsSUFBSixDQUFTb0QsTUFBTTBWLGFBQU4sQ0FBb0J6WCxFQUFFLElBQUYsQ0FBcEIsQ0FBVDtBQUNELFNBRkQ7O0FBSUEsWUFBSTRaLFVBQVVELElBQUlyYixPQUFKLENBQVksS0FBWixNQUF1QixDQUFDLENBQXRDOztBQUVBLGFBQUs2QyxRQUFMLENBQWNrQyxJQUFkLENBQW1CLG9CQUFuQixFQUF5Q29KLEdBQXpDLENBQTZDLFNBQTdDLEVBQXlEbU4sVUFBVSxNQUFWLEdBQW1CLE9BQTVFOztBQUVBOzs7Ozs7QUFNQSxhQUFLelksUUFBTCxDQUFjRSxPQUFkLENBQXNCLENBQUN1WSxVQUFVLFdBQVYsR0FBd0IsYUFBekIsSUFBMEMsV0FBaEUsRUFBNkUsQ0FBQyxLQUFLelksUUFBTixDQUE3RTs7QUFFQSxlQUFPeVksT0FBUDtBQUNEOztBQUVEOzs7Ozs7O0FBaFVXO0FBQUE7QUFBQSxtQ0FzVUVyVyxHQXRVRixFQXNVT3NXLE9BdFVQLEVBc1VnQjtBQUN6QjtBQUNBQSxrQkFBV0EsV0FBV3RXLElBQUloRCxJQUFKLENBQVMsU0FBVCxDQUFYLElBQWtDZ0QsSUFBSWhELElBQUosQ0FBUyxNQUFULENBQTdDO0FBQ0EsWUFBSXVaLFlBQVl2VyxJQUFJcUwsR0FBSixFQUFoQjtBQUNBLFlBQUltTCxRQUFRLEtBQVo7O0FBRUEsWUFBSUQsVUFBVXJYLE1BQWQsRUFBc0I7QUFDcEI7QUFDQSxjQUFJLEtBQUs0TyxPQUFMLENBQWEySSxRQUFiLENBQXNCcE4sY0FBdEIsQ0FBcUNpTixPQUFyQyxDQUFKLEVBQW1EO0FBQ2pERSxvQkFBUSxLQUFLMUksT0FBTCxDQUFhMkksUUFBYixDQUFzQkgsT0FBdEIsRUFBK0J4VCxJQUEvQixDQUFvQ3lULFNBQXBDLENBQVI7QUFDRDtBQUNEO0FBSEEsZUFJSyxJQUFJRCxZQUFZdFcsSUFBSWhELElBQUosQ0FBUyxNQUFULENBQWhCLEVBQWtDO0FBQ3JDd1osc0JBQVEsSUFBSUUsTUFBSixDQUFXSixPQUFYLEVBQW9CeFQsSUFBcEIsQ0FBeUJ5VCxTQUF6QixDQUFSO0FBQ0QsYUFGSSxNQUdBO0FBQ0hDLHNCQUFRLElBQVI7QUFDRDtBQUNGO0FBQ0Q7QUFiQSxhQWNLLElBQUksQ0FBQ3hXLElBQUk5QixJQUFKLENBQVMsVUFBVCxDQUFMLEVBQTJCO0FBQzlCc1ksb0JBQVEsSUFBUjtBQUNEOztBQUVELGVBQU9BLEtBQVA7QUFDQTs7QUFFRjs7Ozs7O0FBaldXO0FBQUE7QUFBQSxvQ0FzV0dyQixTQXRXSCxFQXNXYztBQUN2QjtBQUNBO0FBQ0EsWUFBSXdCLFNBQVMsS0FBSy9ZLFFBQUwsQ0FBY2tDLElBQWQsbUJBQW1DcVYsU0FBbkMsUUFBYjtBQUNBLFlBQUlxQixRQUFRLEtBQVo7QUFBQSxZQUFtQkksV0FBVyxLQUE5Qjs7QUFFQTtBQUNBRCxlQUFPclksSUFBUCxDQUFZLFVBQUNzQixDQUFELEVBQUlTLENBQUosRUFBVTtBQUNwQixjQUFJNUQsRUFBRTRELENBQUYsRUFBS3JELElBQUwsQ0FBVSxVQUFWLENBQUosRUFBMkI7QUFDekI0Wix1QkFBVyxJQUFYO0FBQ0Q7QUFDRixTQUpEO0FBS0EsWUFBRyxDQUFDQSxRQUFKLEVBQWNKLFFBQU0sSUFBTjs7QUFFZCxZQUFJLENBQUNBLEtBQUwsRUFBWTtBQUNWO0FBQ0FHLGlCQUFPclksSUFBUCxDQUFZLFVBQUNzQixDQUFELEVBQUlTLENBQUosRUFBVTtBQUNwQixnQkFBSTVELEVBQUU0RCxDQUFGLEVBQUtuQyxJQUFMLENBQVUsU0FBVixDQUFKLEVBQTBCO0FBQ3hCc1ksc0JBQVEsSUFBUjtBQUNEO0FBQ0YsV0FKRDtBQUtEOztBQUVELGVBQU9BLEtBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7QUFoWVc7QUFBQTtBQUFBLHNDQXVZS3hXLEdBdllMLEVBdVlVaVcsVUF2WVYsRUF1WXNCVyxRQXZZdEIsRUF1WWdDO0FBQUE7O0FBQ3pDQSxtQkFBV0EsV0FBVyxJQUFYLEdBQWtCLEtBQTdCOztBQUVBLFlBQUlDLFFBQVFaLFdBQVc3VixLQUFYLENBQWlCLEdBQWpCLEVBQXNCRyxHQUF0QixDQUEwQixVQUFDdVcsQ0FBRCxFQUFPO0FBQzNDLGlCQUFPLE9BQUtoSixPQUFMLENBQWFtSSxVQUFiLENBQXdCYSxDQUF4QixFQUEyQjlXLEdBQTNCLEVBQWdDNFcsUUFBaEMsRUFBMEM1VyxJQUFJNEUsTUFBSixFQUExQyxDQUFQO0FBQ0QsU0FGVyxDQUFaO0FBR0EsZUFBT2lTLE1BQU05YixPQUFOLENBQWMsS0FBZCxNQUF5QixDQUFDLENBQWpDO0FBQ0Q7O0FBRUQ7Ozs7O0FBaFpXO0FBQUE7QUFBQSxrQ0FvWkM7QUFDVixZQUFJZ2MsUUFBUSxLQUFLblosUUFBakI7QUFBQSxZQUNJcUMsT0FBTyxLQUFLNk4sT0FEaEI7O0FBR0FyUixnQkFBTXdELEtBQUsrVSxlQUFYLEVBQThCK0IsS0FBOUIsRUFBcUNwRSxHQUFyQyxDQUF5QyxPQUF6QyxFQUFrRDNRLFdBQWxELENBQThEL0IsS0FBSytVLGVBQW5FO0FBQ0F2WSxnQkFBTXdELEtBQUtpVixlQUFYLEVBQThCNkIsS0FBOUIsRUFBcUNwRSxHQUFyQyxDQUF5QyxPQUF6QyxFQUFrRDNRLFdBQWxELENBQThEL0IsS0FBS2lWLGVBQW5FO0FBQ0F6WSxVQUFLd0QsS0FBS3VVLGlCQUFWLFNBQStCdlUsS0FBS2dWLGNBQXBDLEVBQXNEalQsV0FBdEQsQ0FBa0UvQixLQUFLZ1YsY0FBdkU7QUFDQThCLGNBQU1qWCxJQUFOLENBQVcsb0JBQVgsRUFBaUNvSixHQUFqQyxDQUFxQyxTQUFyQyxFQUFnRCxNQUFoRDtBQUNBek0sVUFBRSxRQUFGLEVBQVlzYSxLQUFaLEVBQW1CcEUsR0FBbkIsQ0FBdUIsMkVBQXZCLEVBQW9HdEgsR0FBcEcsQ0FBd0csRUFBeEcsRUFBNEdyTixVQUE1RyxDQUF1SCxjQUF2SDtBQUNBdkIsVUFBRSxjQUFGLEVBQWtCc2EsS0FBbEIsRUFBeUJwRSxHQUF6QixDQUE2QixxQkFBN0IsRUFBb0R6VSxJQUFwRCxDQUF5RCxTQUF6RCxFQUFtRSxLQUFuRSxFQUEwRUYsVUFBMUUsQ0FBcUYsY0FBckY7QUFDQXZCLFVBQUUsaUJBQUYsRUFBcUJzYSxLQUFyQixFQUE0QnBFLEdBQTVCLENBQWdDLHFCQUFoQyxFQUF1RHpVLElBQXZELENBQTRELFNBQTVELEVBQXNFLEtBQXRFLEVBQTZFRixVQUE3RSxDQUF3RixjQUF4RjtBQUNBOzs7O0FBSUErWSxjQUFNalosT0FBTixDQUFjLG9CQUFkLEVBQW9DLENBQUNpWixLQUFELENBQXBDO0FBQ0Q7O0FBRUQ7Ozs7O0FBdGFXO0FBQUE7QUFBQSxnQ0EwYUQ7QUFDUixZQUFJdlksUUFBUSxJQUFaO0FBQ0EsYUFBS1osUUFBTCxDQUNHNlUsR0FESCxDQUNPLFFBRFAsRUFFRzNTLElBRkgsQ0FFUSxvQkFGUixFQUdLb0osR0FITCxDQUdTLFNBSFQsRUFHb0IsTUFIcEI7O0FBS0EsYUFBSzJLLE9BQUwsQ0FDR3BCLEdBREgsQ0FDTyxRQURQLEVBRUduVSxJQUZILENBRVEsWUFBVztBQUNmRSxnQkFBTXdZLGtCQUFOLENBQXlCdmEsRUFBRSxJQUFGLENBQXpCO0FBQ0QsU0FKSDs7QUFNQUUsbUJBQVdvQixnQkFBWCxDQUE0QixJQUE1QjtBQUNEO0FBeGJVOztBQUFBO0FBQUE7O0FBMmJiOzs7OztBQUdBNFYsUUFBTUMsUUFBTixHQUFpQjtBQUNmOzs7Ozs7QUFNQUssZ0JBQVksYUFQRzs7QUFTZjs7Ozs7QUFLQWUscUJBQWlCLGtCQWRGOztBQWdCZjs7Ozs7QUFLQUUscUJBQWlCLGtCQXJCRjs7QUF1QmY7Ozs7O0FBS0FWLHVCQUFtQixhQTVCSjs7QUE4QmY7Ozs7O0FBS0FTLG9CQUFnQixZQW5DRDs7QUFxQ2Y7Ozs7O0FBS0FkLGtCQUFjLEtBMUNDOztBQTRDZnNDLGNBQVU7QUFDUlEsYUFBUSxhQURBO0FBRVJDLHFCQUFnQixnQkFGUjtBQUdSQyxlQUFVLFlBSEY7QUFJUkMsY0FBUywwQkFKRDs7QUFNUjtBQUNBQyxZQUFPLHVKQVBDO0FBUVJDLFdBQU0sZ0JBUkU7O0FBVVI7QUFDQUMsYUFBUSx1SUFYQTs7QUFhUkMsV0FBTSxvdENBYkU7QUFjUjtBQUNBQyxjQUFTLGtFQWZEOztBQWlCUkMsZ0JBQVcsb0hBakJIO0FBa0JSO0FBQ0FDLFlBQU8sZ0lBbkJDO0FBb0JSO0FBQ0FDLFlBQU8sMENBckJDO0FBc0JSQyxlQUFVLG1DQXRCRjtBQXVCUjtBQUNBQyxzQkFBaUIsOERBeEJUO0FBeUJSO0FBQ0FDLHNCQUFpQiw4REExQlQ7O0FBNEJSO0FBQ0FDLGFBQVE7QUE3QkEsS0E1Q0s7O0FBNEVmOzs7Ozs7OztBQVFBL0IsZ0JBQVk7QUFDVkosZUFBUyxVQUFVclYsRUFBVixFQUFjb1csUUFBZCxFQUF3QmhTLE1BQXhCLEVBQWdDO0FBQ3ZDLGVBQU9uSSxRQUFNK0QsR0FBR3hELElBQUgsQ0FBUSxjQUFSLENBQU4sRUFBaUNxTyxHQUFqQyxPQUEyQzdLLEdBQUc2SyxHQUFILEVBQWxEO0FBQ0Q7QUFIUztBQXBGRyxHQUFqQjs7QUEyRkE7QUFDQTFPLGFBQVdNLE1BQVgsQ0FBa0IwVyxLQUFsQixFQUF5QixPQUF6QjtBQUVDLENBNWhCQSxDQTRoQkNyUCxNQTVoQkQsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7Ozs7QUFGYSxNQVNQd2IsU0FUTztBQVVYOzs7Ozs7O0FBT0EsdUJBQVl0VCxPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYW1RLFVBQVVyRSxRQUF2QixFQUFpQyxLQUFLaFcsUUFBTCxDQUFjQyxJQUFkLEVBQWpDLEVBQXVEaVEsT0FBdkQsQ0FBZjs7QUFFQSxXQUFLdlAsS0FBTDs7QUFFQTVCLGlCQUFXWSxjQUFYLENBQTBCLElBQTFCLEVBQWdDLFdBQWhDO0FBQ0FaLGlCQUFXbUssUUFBWCxDQUFvQnVCLFFBQXBCLENBQTZCLFdBQTdCLEVBQTBDO0FBQ3hDLGlCQUFTLFFBRCtCO0FBRXhDLGlCQUFTLFFBRitCO0FBR3hDLHNCQUFjLE1BSDBCO0FBSXhDLG9CQUFZO0FBSjRCLE9BQTFDO0FBTUQ7O0FBRUQ7Ozs7OztBQWhDVztBQUFBO0FBQUEsOEJBb0NIO0FBQ04sYUFBS3pLLFFBQUwsQ0FBY1osSUFBZCxDQUFtQixNQUFuQixFQUEyQixTQUEzQjtBQUNBLGFBQUtrYixLQUFMLEdBQWEsS0FBS3RhLFFBQUwsQ0FBYytQLFFBQWQsQ0FBdUIsMkJBQXZCLENBQWI7O0FBRUEsYUFBS3VLLEtBQUwsQ0FBVzVaLElBQVgsQ0FBZ0IsVUFBUzZaLEdBQVQsRUFBYzNYLEVBQWQsRUFBa0I7QUFDaEMsY0FBSVIsTUFBTXZELEVBQUUrRCxFQUFGLENBQVY7QUFBQSxjQUNJNFgsV0FBV3BZLElBQUkyTixRQUFKLENBQWEsb0JBQWIsQ0FEZjtBQUFBLGNBRUlwRCxLQUFLNk4sU0FBUyxDQUFULEVBQVk3TixFQUFaLElBQWtCNU4sV0FBV2dCLFdBQVgsQ0FBdUIsQ0FBdkIsRUFBMEIsV0FBMUIsQ0FGM0I7QUFBQSxjQUdJMGEsU0FBUzdYLEdBQUcrSixFQUFILElBQVlBLEVBQVosV0FIYjs7QUFLQXZLLGNBQUlGLElBQUosQ0FBUyxTQUFULEVBQW9COUMsSUFBcEIsQ0FBeUI7QUFDdkIsNkJBQWlCdU4sRUFETTtBQUV2QixvQkFBUSxLQUZlO0FBR3ZCLGtCQUFNOE4sTUFIaUI7QUFJdkIsNkJBQWlCLEtBSk07QUFLdkIsNkJBQWlCO0FBTE0sV0FBekI7O0FBUUFELG1CQUFTcGIsSUFBVCxDQUFjLEVBQUMsUUFBUSxVQUFULEVBQXFCLG1CQUFtQnFiLE1BQXhDLEVBQWdELGVBQWUsSUFBL0QsRUFBcUUsTUFBTTlOLEVBQTNFLEVBQWQ7QUFDRCxTQWZEO0FBZ0JBLFlBQUkrTixjQUFjLEtBQUsxYSxRQUFMLENBQWNrQyxJQUFkLENBQW1CLFlBQW5CLEVBQWlDNk4sUUFBakMsQ0FBMEMsb0JBQTFDLENBQWxCO0FBQ0EsWUFBRzJLLFlBQVlwWixNQUFmLEVBQXNCO0FBQ3BCLGVBQUtxWixJQUFMLENBQVVELFdBQVYsRUFBdUIsSUFBdkI7QUFDRDtBQUNELGFBQUt4RSxPQUFMO0FBQ0Q7O0FBRUQ7Ozs7O0FBL0RXO0FBQUE7QUFBQSxnQ0FtRUQ7QUFDUixZQUFJdFYsUUFBUSxJQUFaOztBQUVBLGFBQUswWixLQUFMLENBQVc1WixJQUFYLENBQWdCLFlBQVc7QUFDekIsY0FBSXVCLFFBQVFwRCxFQUFFLElBQUYsQ0FBWjtBQUNBLGNBQUkrYixjQUFjM1ksTUFBTThOLFFBQU4sQ0FBZSxvQkFBZixDQUFsQjtBQUNBLGNBQUk2SyxZQUFZdFosTUFBaEIsRUFBd0I7QUFDdEJXLGtCQUFNOE4sUUFBTixDQUFlLEdBQWYsRUFBb0I4RSxHQUFwQixDQUF3Qix5Q0FBeEIsRUFDUTFJLEVBRFIsQ0FDVyxvQkFEWCxFQUNpQyxVQUFTMUosQ0FBVCxFQUFZO0FBQzdDO0FBQ0VBLGdCQUFFeU8sY0FBRjtBQUNBLGtCQUFJalAsTUFBTTRZLFFBQU4sQ0FBZSxXQUFmLENBQUosRUFBaUM7QUFDL0Isb0JBQUdqYSxNQUFNc1AsT0FBTixDQUFjNEssY0FBZCxJQUFnQzdZLE1BQU0wVSxRQUFOLEdBQWlCa0UsUUFBakIsQ0FBMEIsV0FBMUIsQ0FBbkMsRUFBMEU7QUFDeEVqYSx3QkFBTW1hLEVBQU4sQ0FBU0gsV0FBVDtBQUNEO0FBQ0YsZUFKRCxNQUtLO0FBQ0hoYSxzQkFBTStaLElBQU4sQ0FBV0MsV0FBWDtBQUNEO0FBQ0YsYUFaRCxFQVlHek8sRUFaSCxDQVlNLHNCQVpOLEVBWThCLFVBQVMxSixDQUFULEVBQVc7QUFDdkMxRCx5QkFBV21LLFFBQVgsQ0FBb0JTLFNBQXBCLENBQThCbEgsQ0FBOUIsRUFBaUMsV0FBakMsRUFBOEM7QUFDNUN1WSx3QkFBUSxZQUFXO0FBQ2pCcGEsd0JBQU1vYSxNQUFOLENBQWFKLFdBQWI7QUFDRCxpQkFIMkM7QUFJNUNLLHNCQUFNLFlBQVc7QUFDZixzQkFBSUMsS0FBS2paLE1BQU1nWixJQUFOLEdBQWEvWSxJQUFiLENBQWtCLEdBQWxCLEVBQXVCaVosS0FBdkIsRUFBVDtBQUNBLHNCQUFJLENBQUN2YSxNQUFNc1AsT0FBTixDQUFja0wsV0FBbkIsRUFBZ0M7QUFDOUJGLHVCQUFHaGIsT0FBSCxDQUFXLG9CQUFYO0FBQ0Q7QUFDRixpQkFUMkM7QUFVNUNtYiwwQkFBVSxZQUFXO0FBQ25CLHNCQUFJSCxLQUFLalosTUFBTXFaLElBQU4sR0FBYXBaLElBQWIsQ0FBa0IsR0FBbEIsRUFBdUJpWixLQUF2QixFQUFUO0FBQ0Esc0JBQUksQ0FBQ3ZhLE1BQU1zUCxPQUFOLENBQWNrTCxXQUFuQixFQUFnQztBQUM5QkYsdUJBQUdoYixPQUFILENBQVcsb0JBQVg7QUFDRDtBQUNGLGlCQWYyQztBQWdCNUNrSyx5QkFBUyxZQUFXO0FBQ2xCM0gsb0JBQUV5TyxjQUFGO0FBQ0F6TyxvQkFBRXdSLGVBQUY7QUFDRDtBQW5CMkMsZUFBOUM7QUFxQkQsYUFsQ0Q7QUFtQ0Q7QUFDRixTQXhDRDtBQXlDRDs7QUFFRDs7Ozs7O0FBakhXO0FBQUE7QUFBQSw2QkFzSEpxQixPQXRISSxFQXNISztBQUNkLFlBQUdBLFFBQVF0TyxNQUFSLEdBQWlCNlQsUUFBakIsQ0FBMEIsV0FBMUIsQ0FBSCxFQUEyQztBQUN6QyxjQUFHLEtBQUszSyxPQUFMLENBQWE0SyxjQUFiLElBQStCeEYsUUFBUXRPLE1BQVIsR0FBaUIyUCxRQUFqQixHQUE0QmtFLFFBQTVCLENBQXFDLFdBQXJDLENBQWxDLEVBQW9GO0FBQ2xGLGlCQUFLRSxFQUFMLENBQVF6RixPQUFSO0FBQ0QsV0FGRCxNQUVPO0FBQUU7QUFBUztBQUNuQixTQUpELE1BSU87QUFDTCxlQUFLcUYsSUFBTCxDQUFVckYsT0FBVjtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7Ozs7O0FBaElXO0FBQUE7QUFBQSwyQkF1SU5BLE9BdklNLEVBdUlHaUcsU0F2SUgsRUF1SWM7QUFBQTs7QUFDdkIsWUFBSSxDQUFDLEtBQUtyTCxPQUFMLENBQWFrTCxXQUFkLElBQTZCLENBQUNHLFNBQWxDLEVBQTZDO0FBQzNDLGNBQUlDLGlCQUFpQixLQUFLeGIsUUFBTCxDQUFjK1AsUUFBZCxDQUF1QixZQUF2QixFQUFxQ0EsUUFBckMsQ0FBOEMsb0JBQTlDLENBQXJCO0FBQ0EsY0FBR3lMLGVBQWVsYSxNQUFsQixFQUF5QjtBQUN2QixpQkFBS3laLEVBQUwsQ0FBUVMsY0FBUjtBQUNEO0FBQ0Y7O0FBRURsRyxnQkFDR2xXLElBREgsQ0FDUSxhQURSLEVBQ3VCLEtBRHZCLEVBRUc0SCxNQUZILENBRVUsb0JBRlYsRUFHRzdFLE9BSEgsR0FJRzZFLE1BSkgsR0FJWStILFFBSlosQ0FJcUIsV0FKckI7O0FBTUF1RyxnQkFBUW1HLFNBQVIsQ0FBa0IsS0FBS3ZMLE9BQUwsQ0FBYXdMLFVBQS9CLEVBQTJDLFlBQU07QUFDL0M7Ozs7QUFJQSxpQkFBSzFiLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixtQkFBdEIsRUFBMkMsQ0FBQ29WLE9BQUQsQ0FBM0M7QUFDRCxTQU5EOztBQVFBelcsZ0JBQU15VyxRQUFRbFcsSUFBUixDQUFhLGlCQUFiLENBQU4sRUFBeUNBLElBQXpDLENBQThDO0FBQzVDLDJCQUFpQixJQUQyQjtBQUU1QywyQkFBaUI7QUFGMkIsU0FBOUM7QUFJRDs7QUFFRDs7Ozs7OztBQW5LVztBQUFBO0FBQUEseUJBeUtSa1csT0F6S1EsRUF5S0M7QUFDVixZQUFJcUcsU0FBU3JHLFFBQVF0TyxNQUFSLEdBQWlCMlAsUUFBakIsRUFBYjtBQUFBLFlBQ0kvVixRQUFRLElBRFo7QUFFQSxZQUFJZ2IsV0FBVyxLQUFLMUwsT0FBTCxDQUFha0wsV0FBYixHQUEyQk8sT0FBT2QsUUFBUCxDQUFnQixXQUFoQixDQUEzQixHQUEwRHZGLFFBQVF0TyxNQUFSLEdBQWlCNlQsUUFBakIsQ0FBMEIsV0FBMUIsQ0FBekU7O0FBRUEsWUFBRyxDQUFDLEtBQUszSyxPQUFMLENBQWE0SyxjQUFkLElBQWdDLENBQUNjLFFBQXBDLEVBQThDO0FBQzVDO0FBQ0Q7O0FBRUQ7QUFDRXRHLGdCQUFRdUcsT0FBUixDQUFnQmpiLE1BQU1zUCxPQUFOLENBQWN3TCxVQUE5QixFQUEwQyxZQUFZO0FBQ3BEOzs7O0FBSUE5YSxnQkFBTVosUUFBTixDQUFlRSxPQUFmLENBQXVCLGlCQUF2QixFQUEwQyxDQUFDb1YsT0FBRCxDQUExQztBQUNELFNBTkQ7QUFPRjs7QUFFQUEsZ0JBQVFsVyxJQUFSLENBQWEsYUFBYixFQUE0QixJQUE1QixFQUNRNEgsTUFEUixHQUNpQjVDLFdBRGpCLENBQzZCLFdBRDdCOztBQUdBdkYsZ0JBQU15VyxRQUFRbFcsSUFBUixDQUFhLGlCQUFiLENBQU4sRUFBeUNBLElBQXpDLENBQThDO0FBQzdDLDJCQUFpQixLQUQ0QjtBQUU3QywyQkFBaUI7QUFGNEIsU0FBOUM7QUFJRDs7QUFFRDs7Ozs7O0FBck1XO0FBQUE7QUFBQSxnQ0EwTUQ7QUFDUixhQUFLWSxRQUFMLENBQWNrQyxJQUFkLENBQW1CLG9CQUFuQixFQUF5QzRaLElBQXpDLENBQThDLElBQTlDLEVBQW9ERCxPQUFwRCxDQUE0RCxDQUE1RCxFQUErRHZRLEdBQS9ELENBQW1FLFNBQW5FLEVBQThFLEVBQTlFO0FBQ0EsYUFBS3RMLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsR0FBbkIsRUFBd0IyUyxHQUF4QixDQUE0QixlQUE1Qjs7QUFFQTlWLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQS9NVTs7QUFBQTtBQUFBOztBQWtOYmthLFlBQVVyRSxRQUFWLEdBQXFCO0FBQ25COzs7OztBQUtBMEYsZ0JBQVksR0FOTztBQU9uQjs7Ozs7QUFLQU4saUJBQWEsS0FaTTtBQWFuQjs7Ozs7QUFLQU4sb0JBQWdCO0FBbEJHLEdBQXJCOztBQXFCQTtBQUNBL2IsYUFBV00sTUFBWCxDQUFrQmdiLFNBQWxCLEVBQTZCLFdBQTdCO0FBRUMsQ0ExT0EsQ0EwT0MzVCxNQTFPRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7Ozs7QUFGYSxNQVVQa2QsYUFWTztBQVdYOzs7Ozs7O0FBT0EsMkJBQVloVixPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYTZSLGNBQWMvRixRQUEzQixFQUFxQyxLQUFLaFcsUUFBTCxDQUFjQyxJQUFkLEVBQXJDLEVBQTJEaVEsT0FBM0QsQ0FBZjs7QUFFQW5SLGlCQUFXdVEsSUFBWCxDQUFnQkMsT0FBaEIsQ0FBd0IsS0FBS3ZQLFFBQTdCLEVBQXVDLFdBQXZDOztBQUVBLFdBQUtXLEtBQUw7O0FBRUE1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxlQUFoQztBQUNBWixpQkFBV21LLFFBQVgsQ0FBb0J1QixRQUFwQixDQUE2QixlQUE3QixFQUE4QztBQUM1QyxpQkFBUyxRQURtQztBQUU1QyxpQkFBUyxRQUZtQztBQUc1Qyx1QkFBZSxNQUg2QjtBQUk1QyxvQkFBWSxJQUpnQztBQUs1QyxzQkFBYyxNQUw4QjtBQU01QyxzQkFBYyxPQU44QjtBQU81QyxrQkFBVSxVQVBrQztBQVE1QyxlQUFPLE1BUnFDO0FBUzVDLHFCQUFhO0FBVCtCLE9BQTlDO0FBV0Q7O0FBSUQ7Ozs7OztBQTFDVztBQUFBO0FBQUEsOEJBOENIO0FBQ04sYUFBS3pLLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsZ0JBQW5CLEVBQXFDNlMsR0FBckMsQ0FBeUMsWUFBekMsRUFBdUQ4RyxPQUF2RCxDQUErRCxDQUEvRCxFQURNLENBQzREO0FBQ2xFLGFBQUs3YixRQUFMLENBQWNaLElBQWQsQ0FBbUI7QUFDakIsa0JBQVEsU0FEUztBQUVqQixrQ0FBd0IsS0FBSzhRLE9BQUwsQ0FBYThMO0FBRnBCLFNBQW5COztBQUtBLGFBQUtDLFVBQUwsR0FBa0IsS0FBS2pjLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsOEJBQW5CLENBQWxCO0FBQ0EsYUFBSytaLFVBQUwsQ0FBZ0J2YixJQUFoQixDQUFxQixZQUFVO0FBQzdCLGNBQUkrWixTQUFTLEtBQUs5TixFQUFMLElBQVc1TixXQUFXZ0IsV0FBWCxDQUF1QixDQUF2QixFQUEwQixlQUExQixDQUF4QjtBQUFBLGNBQ0lrQyxRQUFRcEQsRUFBRSxJQUFGLENBRFo7QUFBQSxjQUVJaVIsT0FBTzdOLE1BQU04TixRQUFOLENBQWUsZ0JBQWYsQ0FGWDtBQUFBLGNBR0ltTSxRQUFRcE0sS0FBSyxDQUFMLEVBQVFuRCxFQUFSLElBQWM1TixXQUFXZ0IsV0FBWCxDQUF1QixDQUF2QixFQUEwQixVQUExQixDQUgxQjtBQUFBLGNBSUlvYyxXQUFXck0sS0FBSytLLFFBQUwsQ0FBYyxXQUFkLENBSmY7QUFLQTVZLGdCQUFNN0MsSUFBTixDQUFXO0FBQ1QsNkJBQWlCOGMsS0FEUjtBQUVULDZCQUFpQkMsUUFGUjtBQUdULG9CQUFRLEtBSEM7QUFJVCxrQkFBTTFCO0FBSkcsV0FBWDtBQU1BM0ssZUFBSzFRLElBQUwsQ0FBVTtBQUNSLCtCQUFtQnFiLE1BRFg7QUFFUiwyQkFBZSxDQUFDMEIsUUFGUjtBQUdSLG9CQUFRLFVBSEE7QUFJUixrQkFBTUQ7QUFKRSxXQUFWO0FBTUQsU0FsQkQ7QUFtQkEsWUFBSUUsWUFBWSxLQUFLcGMsUUFBTCxDQUFja0MsSUFBZCxDQUFtQixZQUFuQixDQUFoQjtBQUNBLFlBQUdrYSxVQUFVOWEsTUFBYixFQUFvQjtBQUNsQixjQUFJVixRQUFRLElBQVo7QUFDQXdiLG9CQUFVMWIsSUFBVixDQUFlLFlBQVU7QUFDdkJFLGtCQUFNK1osSUFBTixDQUFXOWIsRUFBRSxJQUFGLENBQVg7QUFDRCxXQUZEO0FBR0Q7QUFDRCxhQUFLcVgsT0FBTDtBQUNEOztBQUVEOzs7OztBQW5GVztBQUFBO0FBQUEsZ0NBdUZEO0FBQ1IsWUFBSXRWLFFBQVEsSUFBWjs7QUFFQSxhQUFLWixRQUFMLENBQWNrQyxJQUFkLENBQW1CLElBQW5CLEVBQXlCeEIsSUFBekIsQ0FBOEIsWUFBVztBQUN2QyxjQUFJMmIsV0FBV3hkLEVBQUUsSUFBRixFQUFRa1IsUUFBUixDQUFpQixnQkFBakIsQ0FBZjs7QUFFQSxjQUFJc00sU0FBUy9hLE1BQWIsRUFBcUI7QUFDbkJ6QyxjQUFFLElBQUYsRUFBUWtSLFFBQVIsQ0FBaUIsR0FBakIsRUFBc0I4RSxHQUF0QixDQUEwQix3QkFBMUIsRUFBb0QxSSxFQUFwRCxDQUF1RCx3QkFBdkQsRUFBaUYsVUFBUzFKLENBQVQsRUFBWTtBQUMzRkEsZ0JBQUV5TyxjQUFGOztBQUVBdFEsb0JBQU1vYSxNQUFOLENBQWFxQixRQUFiO0FBQ0QsYUFKRDtBQUtEO0FBQ0YsU0FWRCxFQVVHbFEsRUFWSCxDQVVNLDBCQVZOLEVBVWtDLFVBQVMxSixDQUFULEVBQVc7QUFDM0MsY0FBSXpDLFdBQVduQixFQUFFLElBQUYsQ0FBZjtBQUFBLGNBQ0l5ZCxZQUFZdGMsU0FBU2dILE1BQVQsQ0FBZ0IsSUFBaEIsRUFBc0IrSSxRQUF0QixDQUErQixJQUEvQixDQURoQjtBQUFBLGNBRUl3TSxZQUZKO0FBQUEsY0FHSUMsWUFISjtBQUFBLGNBSUlsSCxVQUFVdFYsU0FBUytQLFFBQVQsQ0FBa0IsZ0JBQWxCLENBSmQ7O0FBTUF1TSxvQkFBVTViLElBQVYsQ0FBZSxVQUFTc0IsQ0FBVCxFQUFZO0FBQ3pCLGdCQUFJbkQsRUFBRSxJQUFGLEVBQVEyTCxFQUFSLENBQVd4SyxRQUFYLENBQUosRUFBMEI7QUFDeEJ1Yyw2QkFBZUQsVUFBVTNOLEVBQVYsQ0FBYW5OLEtBQUtnRSxHQUFMLENBQVMsQ0FBVCxFQUFZeEQsSUFBRSxDQUFkLENBQWIsRUFBK0JFLElBQS9CLENBQW9DLEdBQXBDLEVBQXlDOFEsS0FBekMsRUFBZjtBQUNBd0osNkJBQWVGLFVBQVUzTixFQUFWLENBQWFuTixLQUFLaWIsR0FBTCxDQUFTemEsSUFBRSxDQUFYLEVBQWNzYSxVQUFVaGIsTUFBVixHQUFpQixDQUEvQixDQUFiLEVBQWdEWSxJQUFoRCxDQUFxRCxHQUFyRCxFQUEwRDhRLEtBQTFELEVBQWY7O0FBRUEsa0JBQUluVSxFQUFFLElBQUYsRUFBUWtSLFFBQVIsQ0FBaUIsd0JBQWpCLEVBQTJDek8sTUFBL0MsRUFBdUQ7QUFBRTtBQUN2RGtiLCtCQUFleGMsU0FBU2tDLElBQVQsQ0FBYyxnQkFBZCxFQUFnQ0EsSUFBaEMsQ0FBcUMsR0FBckMsRUFBMEM4USxLQUExQyxFQUFmO0FBQ0Q7QUFDRCxrQkFBSW5VLEVBQUUsSUFBRixFQUFRMkwsRUFBUixDQUFXLGNBQVgsQ0FBSixFQUFnQztBQUFFO0FBQ2hDK1IsK0JBQWV2YyxTQUFTMGMsT0FBVCxDQUFpQixJQUFqQixFQUF1QjFKLEtBQXZCLEdBQStCOVEsSUFBL0IsQ0FBb0MsR0FBcEMsRUFBeUM4USxLQUF6QyxFQUFmO0FBQ0QsZUFGRCxNQUVPLElBQUl1SixhQUFheE0sUUFBYixDQUFzQix3QkFBdEIsRUFBZ0R6TyxNQUFwRCxFQUE0RDtBQUFFO0FBQ25FaWIsK0JBQWVBLGFBQWFyYSxJQUFiLENBQWtCLGVBQWxCLEVBQW1DQSxJQUFuQyxDQUF3QyxHQUF4QyxFQUE2QzhRLEtBQTdDLEVBQWY7QUFDRDtBQUNELGtCQUFJblUsRUFBRSxJQUFGLEVBQVEyTCxFQUFSLENBQVcsYUFBWCxDQUFKLEVBQStCO0FBQUU7QUFDL0JnUywrQkFBZXhjLFNBQVMwYyxPQUFULENBQWlCLElBQWpCLEVBQXVCMUosS0FBdkIsR0FBK0JpSSxJQUEvQixDQUFvQyxJQUFwQyxFQUEwQy9ZLElBQTFDLENBQStDLEdBQS9DLEVBQW9EOFEsS0FBcEQsRUFBZjtBQUNEOztBQUVEO0FBQ0Q7QUFDRixXQW5CRDtBQW9CQWpVLHFCQUFXbUssUUFBWCxDQUFvQlMsU0FBcEIsQ0FBOEJsSCxDQUE5QixFQUFpQyxlQUFqQyxFQUFrRDtBQUNoRGthLGtCQUFNLFlBQVc7QUFDZixrQkFBSXJILFFBQVE5SyxFQUFSLENBQVcsU0FBWCxDQUFKLEVBQTJCO0FBQ3pCNUosc0JBQU0rWixJQUFOLENBQVdyRixPQUFYO0FBQ0FBLHdCQUFRcFQsSUFBUixDQUFhLElBQWIsRUFBbUI4USxLQUFuQixHQUEyQjlRLElBQTNCLENBQWdDLEdBQWhDLEVBQXFDOFEsS0FBckMsR0FBNkNtSSxLQUE3QztBQUNEO0FBQ0YsYUFOK0M7QUFPaER5QixtQkFBTyxZQUFXO0FBQ2hCLGtCQUFJdEgsUUFBUWhVLE1BQVIsSUFBa0IsQ0FBQ2dVLFFBQVE5SyxFQUFSLENBQVcsU0FBWCxDQUF2QixFQUE4QztBQUFFO0FBQzlDNUosc0JBQU1tYSxFQUFOLENBQVN6RixPQUFUO0FBQ0QsZUFGRCxNQUVPLElBQUl0VixTQUFTZ0gsTUFBVCxDQUFnQixnQkFBaEIsRUFBa0MxRixNQUF0QyxFQUE4QztBQUFFO0FBQ3JEVixzQkFBTW1hLEVBQU4sQ0FBUy9hLFNBQVNnSCxNQUFULENBQWdCLGdCQUFoQixDQUFUO0FBQ0FoSCx5QkFBUzBjLE9BQVQsQ0FBaUIsSUFBakIsRUFBdUIxSixLQUF2QixHQUErQjlRLElBQS9CLENBQW9DLEdBQXBDLEVBQXlDOFEsS0FBekMsR0FBaURtSSxLQUFqRDtBQUNEO0FBQ0YsYUFkK0M7QUFlaERKLGdCQUFJLFlBQVc7QUFDYndCLDJCQUFhbmQsSUFBYixDQUFrQixVQUFsQixFQUE4QixDQUFDLENBQS9CLEVBQWtDK2IsS0FBbEM7QUFDQSxxQkFBTyxJQUFQO0FBQ0QsYUFsQitDO0FBbUJoRFIsa0JBQU0sWUFBVztBQUNmNkIsMkJBQWFwZCxJQUFiLENBQWtCLFVBQWxCLEVBQThCLENBQUMsQ0FBL0IsRUFBa0MrYixLQUFsQztBQUNBLHFCQUFPLElBQVA7QUFDRCxhQXRCK0M7QUF1QmhESCxvQkFBUSxZQUFXO0FBQ2pCLGtCQUFJaGIsU0FBUytQLFFBQVQsQ0FBa0IsZ0JBQWxCLEVBQW9Dek8sTUFBeEMsRUFBZ0Q7QUFDOUNWLHNCQUFNb2EsTUFBTixDQUFhaGIsU0FBUytQLFFBQVQsQ0FBa0IsZ0JBQWxCLENBQWI7QUFDRDtBQUNGLGFBM0IrQztBQTRCaEQ4TSxzQkFBVSxZQUFXO0FBQ25CamMsb0JBQU1rYyxPQUFOO0FBQ0QsYUE5QitDO0FBK0JoRDFTLHFCQUFTLFVBQVM4RyxjQUFULEVBQXlCO0FBQ2hDLGtCQUFJQSxjQUFKLEVBQW9CO0FBQ2xCek8sa0JBQUV5TyxjQUFGO0FBQ0Q7QUFDRHpPLGdCQUFFc2Esd0JBQUY7QUFDRDtBQXBDK0MsV0FBbEQ7QUFzQ0QsU0EzRUQsRUFIUSxDQThFTDtBQUNKOztBQUVEOzs7OztBQXhLVztBQUFBO0FBQUEsZ0NBNEtEO0FBQ1IsYUFBSy9jLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsZ0JBQW5CLEVBQXFDMlosT0FBckMsQ0FBNkMsS0FBSzNMLE9BQUwsQ0FBYXdMLFVBQTFEO0FBQ0Q7O0FBRUQ7Ozs7OztBQWhMVztBQUFBO0FBQUEsNkJBcUxKcEcsT0FyTEksRUFxTEk7QUFDYixZQUFHLENBQUNBLFFBQVE5SyxFQUFSLENBQVcsV0FBWCxDQUFKLEVBQTZCO0FBQzNCLGNBQUksQ0FBQzhLLFFBQVE5SyxFQUFSLENBQVcsU0FBWCxDQUFMLEVBQTRCO0FBQzFCLGlCQUFLdVEsRUFBTCxDQUFRekYsT0FBUjtBQUNELFdBRkQsTUFHSztBQUNILGlCQUFLcUYsSUFBTCxDQUFVckYsT0FBVjtBQUNEO0FBQ0Y7QUFDRjs7QUFFRDs7Ozs7O0FBaE1XO0FBQUE7QUFBQSwyQkFxTU5BLE9Bck1NLEVBcU1HO0FBQ1osWUFBSTFVLFFBQVEsSUFBWjs7QUFFQSxZQUFHLENBQUMsS0FBS3NQLE9BQUwsQ0FBYThMLFNBQWpCLEVBQTRCO0FBQzFCLGVBQUtqQixFQUFMLENBQVEsS0FBSy9hLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsWUFBbkIsRUFBaUM2UyxHQUFqQyxDQUFxQ08sUUFBUTBILFlBQVIsQ0FBcUIsS0FBS2hkLFFBQTFCLEVBQW9DaWQsR0FBcEMsQ0FBd0MzSCxPQUF4QyxDQUFyQyxDQUFSO0FBQ0Q7O0FBRURBLGdCQUFRdkcsUUFBUixDQUFpQixXQUFqQixFQUE4QjNQLElBQTlCLENBQW1DLEVBQUMsZUFBZSxLQUFoQixFQUFuQyxFQUNHNEgsTUFESCxDQUNVLDhCQURWLEVBQzBDNUgsSUFEMUMsQ0FDK0MsRUFBQyxpQkFBaUIsSUFBbEIsRUFEL0M7O0FBR0U7QUFDRWtXLGdCQUFRbUcsU0FBUixDQUFrQjdhLE1BQU1zUCxPQUFOLENBQWN3TCxVQUFoQyxFQUE0QyxZQUFZO0FBQ3REOzs7O0FBSUE5YSxnQkFBTVosUUFBTixDQUFlRSxPQUFmLENBQXVCLHVCQUF2QixFQUFnRCxDQUFDb1YsT0FBRCxDQUFoRDtBQUNELFNBTkQ7QUFPRjtBQUNIOztBQUVEOzs7Ozs7QUExTlc7QUFBQTtBQUFBLHlCQStOUkEsT0EvTlEsRUErTkM7QUFDVixZQUFJMVUsUUFBUSxJQUFaO0FBQ0E7QUFDRTBVLGdCQUFRdUcsT0FBUixDQUFnQmpiLE1BQU1zUCxPQUFOLENBQWN3TCxVQUE5QixFQUEwQyxZQUFZO0FBQ3BEOzs7O0FBSUE5YSxnQkFBTVosUUFBTixDQUFlRSxPQUFmLENBQXVCLHFCQUF2QixFQUE4QyxDQUFDb1YsT0FBRCxDQUE5QztBQUNELFNBTkQ7QUFPRjs7QUFFQSxZQUFJNEgsU0FBUzVILFFBQVFwVCxJQUFSLENBQWEsZ0JBQWIsRUFBK0IyWixPQUEvQixDQUF1QyxDQUF2QyxFQUEwQzFaLE9BQTFDLEdBQW9EL0MsSUFBcEQsQ0FBeUQsYUFBekQsRUFBd0UsSUFBeEUsQ0FBYjs7QUFFQThkLGVBQU9sVyxNQUFQLENBQWMsOEJBQWQsRUFBOEM1SCxJQUE5QyxDQUFtRCxlQUFuRCxFQUFvRSxLQUFwRTtBQUNEOztBQUVEOzs7OztBQWhQVztBQUFBO0FBQUEsZ0NBb1BEO0FBQ1IsYUFBS1ksUUFBTCxDQUFja0MsSUFBZCxDQUFtQixnQkFBbkIsRUFBcUN1WixTQUFyQyxDQUErQyxDQUEvQyxFQUFrRG5RLEdBQWxELENBQXNELFNBQXRELEVBQWlFLEVBQWpFO0FBQ0EsYUFBS3RMLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsR0FBbkIsRUFBd0IyUyxHQUF4QixDQUE0Qix3QkFBNUI7O0FBRUE5VixtQkFBV3VRLElBQVgsQ0FBZ0JVLElBQWhCLENBQXFCLEtBQUtoUSxRQUExQixFQUFvQyxXQUFwQztBQUNBakIsbUJBQVdvQixnQkFBWCxDQUE0QixJQUE1QjtBQUNEO0FBMVBVOztBQUFBO0FBQUE7O0FBNlBiNGIsZ0JBQWMvRixRQUFkLEdBQXlCO0FBQ3ZCOzs7OztBQUtBMEYsZ0JBQVksR0FOVztBQU92Qjs7Ozs7QUFLQU0sZUFBVztBQVpZLEdBQXpCOztBQWVBO0FBQ0FqZCxhQUFXTSxNQUFYLENBQWtCMGMsYUFBbEIsRUFBaUMsZUFBakM7QUFFQyxDQS9RQSxDQStRQ3JWLE1BL1FELENBQUQ7Q0NGQTs7Ozs7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7Ozs7OztBQUZhLE1BVVBzZSxTQVZPO0FBV1g7Ozs7OztBQU1BLHVCQUFZcFcsT0FBWixFQUFxQm1KLE9BQXJCLEVBQThCO0FBQUE7O0FBQzVCLFdBQUtsUSxRQUFMLEdBQWdCK0csT0FBaEI7QUFDQSxXQUFLbUosT0FBTCxHQUFlclIsRUFBRXFMLE1BQUYsQ0FBUyxFQUFULEVBQWFpVCxVQUFVbkgsUUFBdkIsRUFBaUMsS0FBS2hXLFFBQUwsQ0FBY0MsSUFBZCxFQUFqQyxFQUF1RGlRLE9BQXZELENBQWY7O0FBRUFuUixpQkFBV3VRLElBQVgsQ0FBZ0JDLE9BQWhCLENBQXdCLEtBQUt2UCxRQUE3QixFQUF1QyxXQUF2Qzs7QUFFQSxXQUFLVyxLQUFMOztBQUVBNUIsaUJBQVdZLGNBQVgsQ0FBMEIsSUFBMUIsRUFBZ0MsV0FBaEM7QUFDQVosaUJBQVdtSyxRQUFYLENBQW9CdUIsUUFBcEIsQ0FBNkIsV0FBN0IsRUFBMEM7QUFDeEMsaUJBQVMsTUFEK0I7QUFFeEMsaUJBQVMsTUFGK0I7QUFHeEMsdUJBQWUsTUFIeUI7QUFJeEMsb0JBQVksSUFKNEI7QUFLeEMsc0JBQWMsTUFMMEI7QUFNeEMsc0JBQWMsVUFOMEI7QUFPeEMsa0JBQVUsT0FQOEI7QUFReEMsZUFBTyxNQVJpQztBQVN4QyxxQkFBYTtBQVQyQixPQUExQztBQVdEOztBQUVEOzs7Ozs7QUF2Q1c7QUFBQTtBQUFBLDhCQTJDSDtBQUNOLGFBQUsyUyxlQUFMLEdBQXVCLEtBQUtwZCxRQUFMLENBQWNrQyxJQUFkLENBQW1CLGdDQUFuQixFQUFxRDZOLFFBQXJELENBQThELEdBQTlELENBQXZCO0FBQ0EsYUFBS3NOLFNBQUwsR0FBaUIsS0FBS0QsZUFBTCxDQUFxQnBXLE1BQXJCLENBQTRCLElBQTVCLEVBQWtDK0ksUUFBbEMsQ0FBMkMsZ0JBQTNDLENBQWpCO0FBQ0EsYUFBS3VOLFVBQUwsR0FBa0IsS0FBS3RkLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsSUFBbkIsRUFBeUI2UyxHQUF6QixDQUE2QixvQkFBN0IsRUFBbUQzVixJQUFuRCxDQUF3RCxNQUF4RCxFQUFnRSxVQUFoRSxFQUE0RThDLElBQTVFLENBQWlGLEdBQWpGLENBQWxCOztBQUVBLGFBQUtxYixZQUFMOztBQUVBLGFBQUtDLGVBQUw7QUFDRDs7QUFFRDs7Ozs7Ozs7QUFyRFc7QUFBQTtBQUFBLHFDQTRESTtBQUNiLFlBQUk1YyxRQUFRLElBQVo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLd2MsZUFBTCxDQUFxQjFjLElBQXJCLENBQTBCLFlBQVU7QUFDbEMsY0FBSStjLFFBQVE1ZSxFQUFFLElBQUYsQ0FBWjtBQUNBLGNBQUlpUixPQUFPMk4sTUFBTXpXLE1BQU4sRUFBWDtBQUNBLGNBQUdwRyxNQUFNc1AsT0FBTixDQUFjd04sVUFBakIsRUFBNEI7QUFDMUJELGtCQUFNRSxLQUFOLEdBQWNDLFNBQWQsQ0FBd0I5TixLQUFLQyxRQUFMLENBQWMsZ0JBQWQsQ0FBeEIsRUFBeUQ4TixJQUF6RCxDQUE4RCxxR0FBOUQ7QUFDRDtBQUNESixnQkFBTXhkLElBQU4sQ0FBVyxXQUFYLEVBQXdCd2QsTUFBTXJlLElBQU4sQ0FBVyxNQUFYLENBQXhCLEVBQTRDZ0IsVUFBNUMsQ0FBdUQsTUFBdkQ7QUFDQXFkLGdCQUFNMU4sUUFBTixDQUFlLGdCQUFmLEVBQ0szUSxJQURMLENBQ1U7QUFDSiwyQkFBZSxJQURYO0FBRUosd0JBQVksQ0FGUjtBQUdKLG9CQUFRO0FBSEosV0FEVjtBQU1Bd0IsZ0JBQU1zVixPQUFOLENBQWN1SCxLQUFkO0FBQ0QsU0FkRDtBQWVBLGFBQUtKLFNBQUwsQ0FBZTNjLElBQWYsQ0FBb0IsWUFBVTtBQUM1QixjQUFJb2QsUUFBUWpmLEVBQUUsSUFBRixDQUFaO0FBQUEsY0FDSWtmLFFBQVFELE1BQU01YixJQUFOLENBQVcsb0JBQVgsQ0FEWjtBQUVBLGNBQUcsQ0FBQzZiLE1BQU16YyxNQUFWLEVBQWlCO0FBQ2Z3YyxrQkFBTUUsT0FBTixDQUFjcGQsTUFBTXNQLE9BQU4sQ0FBYytOLFVBQTVCO0FBQ0Q7QUFDRHJkLGdCQUFNc2QsS0FBTixDQUFZSixLQUFaO0FBQ0QsU0FQRDtBQVFBLFlBQUcsQ0FBQyxLQUFLOWQsUUFBTCxDQUFjZ0gsTUFBZCxHQUF1QjZULFFBQXZCLENBQWdDLGNBQWhDLENBQUosRUFBb0Q7QUFDbEQsZUFBS3NELFFBQUwsR0FBZ0J0ZixFQUFFLEtBQUtxUixPQUFMLENBQWFrTyxPQUFmLEVBQXdCclAsUUFBeEIsQ0FBaUMsY0FBakMsQ0FBaEI7QUFDQSxlQUFLb1AsUUFBTCxHQUFnQixLQUFLbmUsUUFBTCxDQUFjNmQsSUFBZCxDQUFtQixLQUFLTSxRQUF4QixFQUFrQ25YLE1BQWxDLEdBQTJDc0UsR0FBM0MsQ0FBK0MsS0FBSytTLFdBQUwsRUFBL0MsQ0FBaEI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7O0FBOUZXO0FBQUE7QUFBQSw4QkFvR0hwYyxLQXBHRyxFQW9HSTtBQUNiLFlBQUlyQixRQUFRLElBQVo7O0FBRUFxQixjQUFNNFMsR0FBTixDQUFVLG9CQUFWLEVBQ0MxSSxFQURELENBQ0ksb0JBREosRUFDMEIsVUFBUzFKLENBQVQsRUFBVztBQUNuQyxjQUFHNUQsRUFBRTRELEVBQUU3RixNQUFKLEVBQVlvZ0IsWUFBWixDQUF5QixJQUF6QixFQUErQixJQUEvQixFQUFxQ25DLFFBQXJDLENBQThDLDZCQUE5QyxDQUFILEVBQWdGO0FBQzlFcFksY0FBRXNhLHdCQUFGO0FBQ0F0YSxjQUFFeU8sY0FBRjtBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBdFEsZ0JBQU0wZCxLQUFOLENBQVlyYyxNQUFNK0UsTUFBTixDQUFhLElBQWIsQ0FBWjs7QUFFQSxjQUFHcEcsTUFBTXNQLE9BQU4sQ0FBY3FPLFlBQWpCLEVBQThCO0FBQzVCLGdCQUFJQyxRQUFRM2YsRUFBRSxNQUFGLENBQVo7QUFDQTJmLGtCQUFNM0osR0FBTixDQUFVLGVBQVYsRUFBMkIxSSxFQUEzQixDQUE4QixvQkFBOUIsRUFBb0QsVUFBUzFKLENBQVQsRUFBVztBQUM3RCxrQkFBSUEsRUFBRTdGLE1BQUYsS0FBYWdFLE1BQU1aLFFBQU4sQ0FBZSxDQUFmLENBQWIsSUFBa0NuQixFQUFFNGYsUUFBRixDQUFXN2QsTUFBTVosUUFBTixDQUFlLENBQWYsQ0FBWCxFQUE4QnlDLEVBQUU3RixNQUFoQyxDQUF0QyxFQUErRTtBQUFFO0FBQVM7QUFDMUY2RixnQkFBRXlPLGNBQUY7QUFDQXRRLG9CQUFNOGQsUUFBTjtBQUNBRixvQkFBTTNKLEdBQU4sQ0FBVSxlQUFWO0FBQ0QsYUFMRDtBQU1EO0FBQ0YsU0FyQkQ7QUFzQkQ7O0FBRUQ7Ozs7O0FBL0hXO0FBQUE7QUFBQSx3Q0FtSU87QUFDaEIsWUFBSWpVLFFBQVEsSUFBWjs7QUFFQSxhQUFLMGMsVUFBTCxDQUFnQkwsR0FBaEIsQ0FBb0IsS0FBS2pkLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsd0JBQW5CLENBQXBCLEVBQWtFaUssRUFBbEUsQ0FBcUUsc0JBQXJFLEVBQTZGLFVBQVMxSixDQUFULEVBQVc7O0FBRXRHLGNBQUl6QyxXQUFXbkIsRUFBRSxJQUFGLENBQWY7QUFBQSxjQUNJeWQsWUFBWXRjLFNBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCQSxNQUF0QixDQUE2QixJQUE3QixFQUFtQytJLFFBQW5DLENBQTRDLElBQTVDLEVBQWtEQSxRQUFsRCxDQUEyRCxHQUEzRCxDQURoQjtBQUFBLGNBRUl3TSxZQUZKO0FBQUEsY0FHSUMsWUFISjs7QUFLQUYsb0JBQVU1YixJQUFWLENBQWUsVUFBU3NCLENBQVQsRUFBWTtBQUN6QixnQkFBSW5ELEVBQUUsSUFBRixFQUFRMkwsRUFBUixDQUFXeEssUUFBWCxDQUFKLEVBQTBCO0FBQ3hCdWMsNkJBQWVELFVBQVUzTixFQUFWLENBQWFuTixLQUFLZ0UsR0FBTCxDQUFTLENBQVQsRUFBWXhELElBQUUsQ0FBZCxDQUFiLENBQWY7QUFDQXdhLDZCQUFlRixVQUFVM04sRUFBVixDQUFhbk4sS0FBS2liLEdBQUwsQ0FBU3phLElBQUUsQ0FBWCxFQUFjc2EsVUFBVWhiLE1BQVYsR0FBaUIsQ0FBL0IsQ0FBYixDQUFmO0FBQ0E7QUFDRDtBQUNGLFdBTkQ7O0FBUUF2QyxxQkFBV21LLFFBQVgsQ0FBb0JTLFNBQXBCLENBQThCbEgsQ0FBOUIsRUFBaUMsV0FBakMsRUFBOEM7QUFDNUN3WSxrQkFBTSxZQUFXO0FBQ2Ysa0JBQUlqYixTQUFTd0ssRUFBVCxDQUFZNUosTUFBTXdjLGVBQWxCLENBQUosRUFBd0M7QUFDdEN4YyxzQkFBTTBkLEtBQU4sQ0FBWXRlLFNBQVNnSCxNQUFULENBQWdCLElBQWhCLENBQVo7QUFDQWhILHlCQUFTZ0gsTUFBVCxDQUFnQixJQUFoQixFQUFzQmtJLEdBQXRCLENBQTBCblEsV0FBV2tFLGFBQVgsQ0FBeUJqRCxRQUF6QixDQUExQixFQUE4RCxZQUFVO0FBQ3RFQSwyQkFBU2dILE1BQVQsQ0FBZ0IsSUFBaEIsRUFBc0I5RSxJQUF0QixDQUEyQixTQUEzQixFQUFzQ3FJLE1BQXRDLENBQTZDM0osTUFBTTBjLFVBQW5ELEVBQStEdEssS0FBL0QsR0FBdUVtSSxLQUF2RTtBQUNELGlCQUZEO0FBR0EsdUJBQU8sSUFBUDtBQUNEO0FBQ0YsYUFUMkM7QUFVNUNFLHNCQUFVLFlBQVc7QUFDbkJ6YSxvQkFBTStkLEtBQU4sQ0FBWTNlLFNBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCQSxNQUF0QixDQUE2QixJQUE3QixDQUFaO0FBQ0FoSCx1QkFBU2dILE1BQVQsQ0FBZ0IsSUFBaEIsRUFBc0JBLE1BQXRCLENBQTZCLElBQTdCLEVBQW1Da0ksR0FBbkMsQ0FBdUNuUSxXQUFXa0UsYUFBWCxDQUF5QmpELFFBQXpCLENBQXZDLEVBQTJFLFlBQVU7QUFDbkY5RCwyQkFBVyxZQUFXO0FBQ3BCOEQsMkJBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCQSxNQUF0QixDQUE2QixJQUE3QixFQUFtQ0EsTUFBbkMsQ0FBMEMsSUFBMUMsRUFBZ0QrSSxRQUFoRCxDQUF5RCxHQUF6RCxFQUE4RGlELEtBQTlELEdBQXNFbUksS0FBdEU7QUFDRCxpQkFGRCxFQUVHLENBRkg7QUFHRCxlQUpEO0FBS0EscUJBQU8sSUFBUDtBQUNELGFBbEIyQztBQW1CNUNKLGdCQUFJLFlBQVc7QUFDYndCLDJCQUFhcEIsS0FBYjtBQUNBLHFCQUFPLElBQVA7QUFDRCxhQXRCMkM7QUF1QjVDUixrQkFBTSxZQUFXO0FBQ2Y2QiwyQkFBYXJCLEtBQWI7QUFDQSxxQkFBTyxJQUFQO0FBQ0QsYUExQjJDO0FBMkI1Q3lCLG1CQUFPLFlBQVc7QUFDaEJoYyxvQkFBTXNkLEtBQU47QUFDQTtBQUNELGFBOUIyQztBQStCNUN2QixrQkFBTSxZQUFXO0FBQ2Ysa0JBQUksQ0FBQzNjLFNBQVN3SyxFQUFULENBQVk1SixNQUFNMGMsVUFBbEIsQ0FBTCxFQUFvQztBQUFFO0FBQ3BDMWMsc0JBQU0rZCxLQUFOLENBQVkzZSxTQUFTZ0gsTUFBVCxDQUFnQixJQUFoQixFQUFzQkEsTUFBdEIsQ0FBNkIsSUFBN0IsQ0FBWjtBQUNBaEgseUJBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCQSxNQUF0QixDQUE2QixJQUE3QixFQUFtQ2tJLEdBQW5DLENBQXVDblEsV0FBV2tFLGFBQVgsQ0FBeUJqRCxRQUF6QixDQUF2QyxFQUEyRSxZQUFVO0FBQ25GOUQsNkJBQVcsWUFBVztBQUNwQjhELDZCQUFTZ0gsTUFBVCxDQUFnQixJQUFoQixFQUFzQkEsTUFBdEIsQ0FBNkIsSUFBN0IsRUFBbUNBLE1BQW5DLENBQTBDLElBQTFDLEVBQWdEK0ksUUFBaEQsQ0FBeUQsR0FBekQsRUFBOERpRCxLQUE5RCxHQUFzRW1JLEtBQXRFO0FBQ0QsbUJBRkQsRUFFRyxDQUZIO0FBR0QsaUJBSkQ7QUFLRCxlQVBELE1BT08sSUFBSW5iLFNBQVN3SyxFQUFULENBQVk1SixNQUFNd2MsZUFBbEIsQ0FBSixFQUF3QztBQUM3Q3hjLHNCQUFNMGQsS0FBTixDQUFZdGUsU0FBU2dILE1BQVQsQ0FBZ0IsSUFBaEIsQ0FBWjtBQUNBaEgseUJBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCa0ksR0FBdEIsQ0FBMEJuUSxXQUFXa0UsYUFBWCxDQUF5QmpELFFBQXpCLENBQTFCLEVBQThELFlBQVU7QUFDdEVBLDJCQUFTZ0gsTUFBVCxDQUFnQixJQUFoQixFQUFzQjlFLElBQXRCLENBQTJCLFNBQTNCLEVBQXNDcUksTUFBdEMsQ0FBNkMzSixNQUFNMGMsVUFBbkQsRUFBK0R0SyxLQUEvRCxHQUF1RW1JLEtBQXZFO0FBQ0QsaUJBRkQ7QUFHRDtBQUNELHFCQUFPLElBQVA7QUFDRCxhQTlDMkM7QUErQzVDL1EscUJBQVMsVUFBUzhHLGNBQVQsRUFBeUI7QUFDaEMsa0JBQUlBLGNBQUosRUFBb0I7QUFDbEJ6TyxrQkFBRXlPLGNBQUY7QUFDRDtBQUNEek8sZ0JBQUVzYSx3QkFBRjtBQUNEO0FBcEQyQyxXQUE5QztBQXNERCxTQXJFRCxFQUhnQixDQXdFWjtBQUNMOztBQUVEOzs7Ozs7QUE5TVc7QUFBQTtBQUFBLGlDQW1OQTtBQUNULFlBQUk5YSxRQUFRLEtBQUtqQyxRQUFMLENBQWNrQyxJQUFkLENBQW1CLGlDQUFuQixFQUFzRDZNLFFBQXRELENBQStELFlBQS9ELENBQVo7QUFDQTlNLGNBQU1pTixHQUFOLENBQVVuUSxXQUFXa0UsYUFBWCxDQUF5QmhCLEtBQXpCLENBQVYsRUFBMkMsVUFBU1EsQ0FBVCxFQUFXO0FBQ3BEUixnQkFBTW1DLFdBQU4sQ0FBa0Isc0JBQWxCO0FBQ0QsU0FGRDtBQUdJOzs7O0FBSUosYUFBS3BFLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixxQkFBdEI7QUFDRDs7QUFFRDs7Ozs7OztBQS9OVztBQUFBO0FBQUEsNEJBcU9MK0IsS0FyT0ssRUFxT0U7QUFDWCxZQUFJckIsUUFBUSxJQUFaO0FBQ0FxQixjQUFNNFMsR0FBTixDQUFVLG9CQUFWO0FBQ0E1UyxjQUFNOE4sUUFBTixDQUFlLG9CQUFmLEVBQ0c1RCxFQURILENBQ00sb0JBRE4sRUFDNEIsVUFBUzFKLENBQVQsRUFBVztBQUNuQ0EsWUFBRXNhLHdCQUFGO0FBQ0E7QUFDQW5jLGdCQUFNK2QsS0FBTixDQUFZMWMsS0FBWjtBQUNELFNBTEg7QUFNRDs7QUFFRDs7Ozs7O0FBaFBXO0FBQUE7QUFBQSx3Q0FxUE87QUFDaEIsWUFBSXJCLFFBQVEsSUFBWjtBQUNBLGFBQUswYyxVQUFMLENBQWdCdkksR0FBaEIsQ0FBb0IsOEJBQXBCLEVBQ0tGLEdBREwsQ0FDUyxvQkFEVCxFQUVLMUksRUFGTCxDQUVRLG9CQUZSLEVBRThCLFVBQVMxSixDQUFULEVBQVc7QUFDbkM7QUFDQXZHLHFCQUFXLFlBQVU7QUFDbkIwRSxrQkFBTThkLFFBQU47QUFDRCxXQUZELEVBRUcsQ0FGSDtBQUdILFNBUEg7QUFRRDs7QUFFRDs7Ozs7OztBQWpRVztBQUFBO0FBQUEsNEJBdVFMemMsS0F2UUssRUF1UUU7QUFDWEEsY0FBTThOLFFBQU4sQ0FBZSxnQkFBZixFQUFpQ2hCLFFBQWpDLENBQTBDLFdBQTFDO0FBQ0E7Ozs7QUFJQSxhQUFLL08sUUFBTCxDQUFjRSxPQUFkLENBQXNCLG1CQUF0QixFQUEyQyxDQUFDK0IsS0FBRCxDQUEzQztBQUNEO0FBOVFVO0FBQUE7OztBQWdSWDs7Ozs7O0FBaFJXLDRCQXNSTEEsS0F0UkssRUFzUkU7QUFDWCxZQUFJckIsUUFBUSxJQUFaO0FBQ0FxQixjQUFNOE0sUUFBTixDQUFlLFlBQWYsRUFDTUcsR0FETixDQUNVblEsV0FBV2tFLGFBQVgsQ0FBeUJoQixLQUF6QixDQURWLEVBQzJDLFlBQVU7QUFDOUNBLGdCQUFNbUMsV0FBTixDQUFrQixzQkFBbEI7QUFDQW5DLGdCQUFNMmMsSUFBTjtBQUNELFNBSk47QUFLQTs7OztBQUlBM2MsY0FBTS9CLE9BQU4sQ0FBYyxtQkFBZCxFQUFtQyxDQUFDK0IsS0FBRCxDQUFuQztBQUNEOztBQUVEOzs7Ozs7O0FBcFNXO0FBQUE7QUFBQSxvQ0EwU0c7QUFDWixZQUFJdUQsTUFBTSxDQUFWO0FBQUEsWUFBYXFaLFNBQVMsRUFBdEI7QUFDQSxhQUFLeEIsU0FBTCxDQUFlSixHQUFmLENBQW1CLEtBQUtqZCxRQUF4QixFQUFrQ1UsSUFBbEMsQ0FBdUMsWUFBVTtBQUMvQyxjQUFJb2UsYUFBYWpnQixFQUFFLElBQUYsRUFBUWtSLFFBQVIsQ0FBaUIsSUFBakIsRUFBdUJ6TyxNQUF4QztBQUNBa0UsZ0JBQU1zWixhQUFhdFosR0FBYixHQUFtQnNaLFVBQW5CLEdBQWdDdFosR0FBdEM7QUFDRCxTQUhEOztBQUtBcVosZUFBTyxZQUFQLElBQTBCclosTUFBTSxLQUFLOFgsVUFBTCxDQUFnQixDQUFoQixFQUFtQnRWLHFCQUFuQixHQUEyQ04sTUFBM0U7QUFDQW1YLGVBQU8sV0FBUCxJQUF5QixLQUFLN2UsUUFBTCxDQUFjLENBQWQsRUFBaUJnSSxxQkFBakIsR0FBeUNMLEtBQWxFOztBQUVBLGVBQU9rWCxNQUFQO0FBQ0Q7O0FBRUQ7Ozs7O0FBdlRXO0FBQUE7QUFBQSxnQ0EyVEQ7QUFDUixhQUFLSCxRQUFMO0FBQ0EzZixtQkFBV3VRLElBQVgsQ0FBZ0JVLElBQWhCLENBQXFCLEtBQUtoUSxRQUExQixFQUFvQyxXQUFwQztBQUNBLGFBQUtBLFFBQUwsQ0FBYytlLE1BQWQsR0FDYzdjLElBRGQsQ0FDbUIsNkNBRG5CLEVBQ2tFOGMsTUFEbEUsR0FFYzdiLEdBRmQsR0FFb0JqQixJQUZwQixDQUV5QixnREFGekIsRUFFMkVrQyxXQUYzRSxDQUV1RiwyQ0FGdkYsRUFHY2pCLEdBSGQsR0FHb0JqQixJQUhwQixDQUd5QixnQkFIekIsRUFHMkM5QixVQUgzQyxDQUdzRCwyQkFIdEQ7QUFJQSxhQUFLZ2QsZUFBTCxDQUFxQjFjLElBQXJCLENBQTBCLFlBQVc7QUFDbkM3QixZQUFFLElBQUYsRUFBUWdXLEdBQVIsQ0FBWSxlQUFaO0FBQ0QsU0FGRDtBQUdBLGFBQUs3VSxRQUFMLENBQWNrQyxJQUFkLENBQW1CLEdBQW5CLEVBQXdCeEIsSUFBeEIsQ0FBNkIsWUFBVTtBQUNyQyxjQUFJK2MsUUFBUTVlLEVBQUUsSUFBRixDQUFaO0FBQ0EsY0FBRzRlLE1BQU14ZCxJQUFOLENBQVcsV0FBWCxDQUFILEVBQTJCO0FBQ3pCd2Qsa0JBQU1yZSxJQUFOLENBQVcsTUFBWCxFQUFtQnFlLE1BQU14ZCxJQUFOLENBQVcsV0FBWCxDQUFuQixFQUE0Q0ksVUFBNUMsQ0FBdUQsV0FBdkQ7QUFDRCxXQUZELE1BRUs7QUFBRTtBQUFTO0FBQ2pCLFNBTEQ7QUFNQXRCLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQTVVVTs7QUFBQTtBQUFBOztBQStVYmdkLFlBQVVuSCxRQUFWLEdBQXFCO0FBQ25COzs7OztBQUtBaUksZ0JBQVksNkRBTk87QUFPbkI7Ozs7O0FBS0FHLGFBQVMsYUFaVTtBQWFuQjs7Ozs7QUFLQVYsZ0JBQVksS0FsQk87QUFtQm5COzs7OztBQUtBYSxrQkFBYztBQUNkO0FBekJtQixHQUFyQjs7QUE0QkE7QUFDQXhmLGFBQVdNLE1BQVgsQ0FBa0I4ZCxTQUFsQixFQUE2QixXQUE3QjtBQUVDLENBOVdBLENBOFdDelcsTUE5V0QsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7Ozs7O0FBRmEsTUFVUG9nQixRQVZPO0FBV1g7Ozs7Ozs7QUFPQSxzQkFBWWxZLE9BQVosRUFBcUJtSixPQUFyQixFQUE4QjtBQUFBOztBQUM1QixXQUFLbFEsUUFBTCxHQUFnQitHLE9BQWhCO0FBQ0EsV0FBS21KLE9BQUwsR0FBZXJSLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFhK1UsU0FBU2pKLFFBQXRCLEVBQWdDLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBaEMsRUFBc0RpUSxPQUF0RCxDQUFmO0FBQ0EsV0FBS3ZQLEtBQUw7O0FBRUE1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxVQUFoQztBQUNBWixpQkFBV21LLFFBQVgsQ0FBb0J1QixRQUFwQixDQUE2QixVQUE3QixFQUF5QztBQUN2QyxpQkFBUyxNQUQ4QjtBQUV2QyxpQkFBUyxNQUY4QjtBQUd2QyxrQkFBVSxPQUg2QjtBQUl2QyxlQUFPLGFBSmdDO0FBS3ZDLHFCQUFhO0FBTDBCLE9BQXpDO0FBT0Q7O0FBRUQ7Ozs7Ozs7QUFqQ1c7QUFBQTtBQUFBLDhCQXNDSDtBQUNOLFlBQUl5VSxNQUFNLEtBQUtsZixRQUFMLENBQWNaLElBQWQsQ0FBbUIsSUFBbkIsQ0FBVjs7QUFFQSxhQUFLK2YsT0FBTCxHQUFldGdCLHFCQUFtQnFnQixHQUFuQixZQUErQnJnQixtQkFBaUJxZ0IsR0FBakIsUUFBOUM7QUFDQSxhQUFLQyxPQUFMLENBQWEvZixJQUFiLENBQWtCO0FBQ2hCLDJCQUFpQjhmLEdBREQ7QUFFaEIsMkJBQWlCLEtBRkQ7QUFHaEIsMkJBQWlCQSxHQUhEO0FBSWhCLDJCQUFpQixJQUpEO0FBS2hCLDJCQUFpQjs7QUFMRCxTQUFsQjs7QUFTQSxhQUFLaFAsT0FBTCxDQUFha1AsYUFBYixHQUE2QixLQUFLQyxnQkFBTCxFQUE3QjtBQUNBLGFBQUtDLE9BQUwsR0FBZSxDQUFmO0FBQ0EsYUFBS0MsYUFBTCxHQUFxQixFQUFyQjtBQUNBLGFBQUt2ZixRQUFMLENBQWNaLElBQWQsQ0FBbUI7QUFDakIseUJBQWUsTUFERTtBQUVqQiwyQkFBaUI4ZixHQUZBO0FBR2pCLHlCQUFlQSxHQUhFO0FBSWpCLDZCQUFtQixLQUFLQyxPQUFMLENBQWEsQ0FBYixFQUFnQnhTLEVBQWhCLElBQXNCNU4sV0FBV2dCLFdBQVgsQ0FBdUIsQ0FBdkIsRUFBMEIsV0FBMUI7QUFKeEIsU0FBbkI7QUFNQSxhQUFLbVcsT0FBTDtBQUNEOztBQUVEOzs7Ozs7QUEvRFc7QUFBQTtBQUFBLHlDQW9FUTtBQUNqQixZQUFJc0osbUJBQW1CLEtBQUt4ZixRQUFMLENBQWMsQ0FBZCxFQUFpQlQsU0FBakIsQ0FBMkJrZ0IsS0FBM0IsQ0FBaUMsMEJBQWpDLENBQXZCO0FBQ0lELDJCQUFtQkEsbUJBQW1CQSxpQkFBaUIsQ0FBakIsQ0FBbkIsR0FBeUMsRUFBNUQ7QUFDSixZQUFJRSxxQkFBcUIsZ0JBQWdCclosSUFBaEIsQ0FBcUIsS0FBSzhZLE9BQUwsQ0FBYSxDQUFiLEVBQWdCNWYsU0FBckMsQ0FBekI7QUFDSW1nQiw2QkFBcUJBLHFCQUFxQkEsbUJBQW1CLENBQW5CLENBQXJCLEdBQTZDLEVBQWxFO0FBQ0osWUFBSWhYLFdBQVdnWCxxQkFBcUJBLHFCQUFxQixHQUFyQixHQUEyQkYsZ0JBQWhELEdBQW1FQSxnQkFBbEY7QUFDQSxlQUFPOVcsUUFBUDtBQUNEOztBQUVEOzs7Ozs7O0FBN0VXO0FBQUE7QUFBQSxrQ0FtRkNBLFFBbkZELEVBbUZXO0FBQ3BCLGFBQUs2VyxhQUFMLENBQW1CL2hCLElBQW5CLENBQXdCa0wsV0FBV0EsUUFBWCxHQUFzQixRQUE5QztBQUNBO0FBQ0EsWUFBRyxDQUFDQSxRQUFELElBQWMsS0FBSzZXLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsS0FBM0IsSUFBb0MsQ0FBckQsRUFBd0Q7QUFDdEQsZUFBSzZDLFFBQUwsQ0FBYytPLFFBQWQsQ0FBdUIsS0FBdkI7QUFDRCxTQUZELE1BRU0sSUFBR3JHLGFBQWEsS0FBYixJQUF1QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixRQUEzQixJQUF1QyxDQUFqRSxFQUFvRTtBQUN4RSxlQUFLNkMsUUFBTCxDQUFjb0UsV0FBZCxDQUEwQnNFLFFBQTFCO0FBQ0QsU0FGSyxNQUVBLElBQUdBLGFBQWEsTUFBYixJQUF3QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixPQUEzQixJQUFzQyxDQUFqRSxFQUFvRTtBQUN4RSxlQUFLNkMsUUFBTCxDQUFjb0UsV0FBZCxDQUEwQnNFLFFBQTFCLEVBQ0txRyxRQURMLENBQ2MsT0FEZDtBQUVELFNBSEssTUFHQSxJQUFHckcsYUFBYSxPQUFiLElBQXlCLEtBQUs2VyxhQUFMLENBQW1CcGlCLE9BQW5CLENBQTJCLE1BQTNCLElBQXFDLENBQWpFLEVBQW9FO0FBQ3hFLGVBQUs2QyxRQUFMLENBQWNvRSxXQUFkLENBQTBCc0UsUUFBMUIsRUFDS3FHLFFBREwsQ0FDYyxNQURkO0FBRUQ7O0FBRUQ7QUFMTSxhQU1ELElBQUcsQ0FBQ3JHLFFBQUQsSUFBYyxLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixLQUEzQixJQUFvQyxDQUFDLENBQW5ELElBQTBELEtBQUtvaUIsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixNQUEzQixJQUFxQyxDQUFsRyxFQUFxRztBQUN4RyxpQkFBSzZDLFFBQUwsQ0FBYytPLFFBQWQsQ0FBdUIsTUFBdkI7QUFDRCxXQUZJLE1BRUMsSUFBR3JHLGFBQWEsS0FBYixJQUF1QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixRQUEzQixJQUF1QyxDQUFDLENBQS9ELElBQXNFLEtBQUtvaUIsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixNQUEzQixJQUFxQyxDQUE5RyxFQUFpSDtBQUNySCxpQkFBSzZDLFFBQUwsQ0FBY29FLFdBQWQsQ0FBMEJzRSxRQUExQixFQUNLcUcsUUFETCxDQUNjLE1BRGQ7QUFFRCxXQUhLLE1BR0EsSUFBR3JHLGFBQWEsTUFBYixJQUF3QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixPQUEzQixJQUFzQyxDQUFDLENBQS9ELElBQXNFLEtBQUtvaUIsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixRQUEzQixJQUF1QyxDQUFoSCxFQUFtSDtBQUN2SCxpQkFBSzZDLFFBQUwsQ0FBY29FLFdBQWQsQ0FBMEJzRSxRQUExQjtBQUNELFdBRkssTUFFQSxJQUFHQSxhQUFhLE9BQWIsSUFBeUIsS0FBSzZXLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsTUFBM0IsSUFBcUMsQ0FBQyxDQUEvRCxJQUFzRSxLQUFLb2lCLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsUUFBM0IsSUFBdUMsQ0FBaEgsRUFBbUg7QUFDdkgsaUJBQUs2QyxRQUFMLENBQWNvRSxXQUFkLENBQTBCc0UsUUFBMUI7QUFDRDtBQUNEO0FBSE0sZUFJRjtBQUNGLG1CQUFLMUksUUFBTCxDQUFjb0UsV0FBZCxDQUEwQnNFLFFBQTFCO0FBQ0Q7QUFDRCxhQUFLaVgsWUFBTCxHQUFvQixJQUFwQjtBQUNBLGFBQUtMLE9BQUw7QUFDRDs7QUFFRDs7Ozs7OztBQXJIVztBQUFBO0FBQUEscUNBMkhJO0FBQ2IsWUFBRyxLQUFLSCxPQUFMLENBQWEvZixJQUFiLENBQWtCLGVBQWxCLE1BQXVDLE9BQTFDLEVBQWtEO0FBQUUsaUJBQU8sS0FBUDtBQUFlO0FBQ25FLFlBQUlzSixXQUFXLEtBQUsyVyxnQkFBTCxFQUFmO0FBQUEsWUFDSXZXLFdBQVcvSixXQUFXNEgsR0FBWCxDQUFlRSxhQUFmLENBQTZCLEtBQUs3RyxRQUFsQyxDQURmO0FBQUEsWUFFSStJLGNBQWNoSyxXQUFXNEgsR0FBWCxDQUFlRSxhQUFmLENBQTZCLEtBQUtzWSxPQUFsQyxDQUZsQjtBQUFBLFlBR0l2ZSxRQUFRLElBSFo7QUFBQSxZQUlJZ2YsWUFBYWxYLGFBQWEsTUFBYixHQUFzQixNQUF0QixHQUFpQ0EsYUFBYSxPQUFkLEdBQXlCLE1BQXpCLEdBQWtDLEtBSm5GO0FBQUEsWUFLSTZFLFFBQVNxUyxjQUFjLEtBQWYsR0FBd0IsUUFBeEIsR0FBbUMsT0FML0M7QUFBQSxZQU1JblksU0FBVThGLFVBQVUsUUFBWCxHQUF1QixLQUFLMkMsT0FBTCxDQUFhdkgsT0FBcEMsR0FBOEMsS0FBS3VILE9BQUwsQ0FBYXRILE9BTnhFOztBQVVBLFlBQUlFLFNBQVNuQixLQUFULElBQWtCbUIsU0FBU2xCLFVBQVQsQ0FBb0JELEtBQXZDLElBQWtELENBQUMsS0FBSzJYLE9BQU4sSUFBaUIsQ0FBQ3ZnQixXQUFXNEgsR0FBWCxDQUFlQyxnQkFBZixDQUFnQyxLQUFLNUcsUUFBckMsQ0FBdkUsRUFBdUg7QUFDckgsZUFBS0EsUUFBTCxDQUFjeUgsTUFBZCxDQUFxQjFJLFdBQVc0SCxHQUFYLENBQWVHLFVBQWYsQ0FBMEIsS0FBSzlHLFFBQS9CLEVBQXlDLEtBQUttZixPQUE5QyxFQUF1RCxlQUF2RCxFQUF3RSxLQUFLalAsT0FBTCxDQUFhdkgsT0FBckYsRUFBOEYsS0FBS3VILE9BQUwsQ0FBYXRILE9BQTNHLEVBQW9ILElBQXBILENBQXJCLEVBQWdKMEMsR0FBaEosQ0FBb0o7QUFDbEoscUJBQVN4QyxTQUFTbEIsVUFBVCxDQUFvQkQsS0FBcEIsR0FBNkIsS0FBS3VJLE9BQUwsQ0FBYXRILE9BQWIsR0FBdUIsQ0FEcUY7QUFFbEosc0JBQVU7QUFGd0ksV0FBcEo7QUFJQSxlQUFLK1csWUFBTCxHQUFvQixJQUFwQjtBQUNBLGlCQUFPLEtBQVA7QUFDRDs7QUFFRCxhQUFLM2YsUUFBTCxDQUFjeUgsTUFBZCxDQUFxQjFJLFdBQVc0SCxHQUFYLENBQWVHLFVBQWYsQ0FBMEIsS0FBSzlHLFFBQS9CLEVBQXlDLEtBQUttZixPQUE5QyxFQUF1RHpXLFFBQXZELEVBQWlFLEtBQUt3SCxPQUFMLENBQWF2SCxPQUE5RSxFQUF1RixLQUFLdUgsT0FBTCxDQUFhdEgsT0FBcEcsQ0FBckI7O0FBRUEsZUFBTSxDQUFDN0osV0FBVzRILEdBQVgsQ0FBZUMsZ0JBQWYsQ0FBZ0MsS0FBSzVHLFFBQXJDLEVBQStDLEtBQS9DLEVBQXNELElBQXRELENBQUQsSUFBZ0UsS0FBS3NmLE9BQTNFLEVBQW1GO0FBQ2pGLGVBQUtPLFdBQUwsQ0FBaUJuWCxRQUFqQjtBQUNBLGVBQUtvWCxZQUFMO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7O0FBeEpXO0FBQUE7QUFBQSxnQ0E2SkQ7QUFDUixZQUFJbGYsUUFBUSxJQUFaO0FBQ0EsYUFBS1osUUFBTCxDQUFjbU0sRUFBZCxDQUFpQjtBQUNmLDZCQUFtQixLQUFLd1EsSUFBTCxDQUFVL1csSUFBVixDQUFlLElBQWYsQ0FESjtBQUVmLDhCQUFvQixLQUFLZ1gsS0FBTCxDQUFXaFgsSUFBWCxDQUFnQixJQUFoQixDQUZMO0FBR2YsK0JBQXFCLEtBQUtvVixNQUFMLENBQVlwVixJQUFaLENBQWlCLElBQWpCLENBSE47QUFJZixpQ0FBdUIsS0FBS2thLFlBQUwsQ0FBa0JsYSxJQUFsQixDQUF1QixJQUF2QjtBQUpSLFNBQWpCOztBQU9BLFlBQUcsS0FBS3NLLE9BQUwsQ0FBYTZQLEtBQWhCLEVBQXNCO0FBQ3BCLGVBQUtaLE9BQUwsQ0FBYXRLLEdBQWIsQ0FBaUIsK0NBQWpCLEVBQ0sxSSxFQURMLENBQ1Esd0JBRFIsRUFDa0MsWUFBVTtBQUN0QzlQLHlCQUFhdUUsTUFBTW9mLE9BQW5CO0FBQ0FwZixrQkFBTW9mLE9BQU4sR0FBZ0I5akIsV0FBVyxZQUFVO0FBQ25DMEUsb0JBQU0rYixJQUFOO0FBQ0EvYixvQkFBTXVlLE9BQU4sQ0FBY2xmLElBQWQsQ0FBbUIsT0FBbkIsRUFBNEIsSUFBNUI7QUFDRCxhQUhlLEVBR2JXLE1BQU1zUCxPQUFOLENBQWMrUCxVQUhELENBQWhCO0FBSUQsV0FQTCxFQU9POVQsRUFQUCxDQU9VLHdCQVBWLEVBT29DLFlBQVU7QUFDeEM5UCx5QkFBYXVFLE1BQU1vZixPQUFuQjtBQUNBcGYsa0JBQU1vZixPQUFOLEdBQWdCOWpCLFdBQVcsWUFBVTtBQUNuQzBFLG9CQUFNZ2MsS0FBTjtBQUNBaGMsb0JBQU11ZSxPQUFOLENBQWNsZixJQUFkLENBQW1CLE9BQW5CLEVBQTRCLEtBQTVCO0FBQ0QsYUFIZSxFQUdiVyxNQUFNc1AsT0FBTixDQUFjK1AsVUFIRCxDQUFoQjtBQUlELFdBYkw7QUFjQSxjQUFHLEtBQUsvUCxPQUFMLENBQWFnUSxTQUFoQixFQUEwQjtBQUN4QixpQkFBS2xnQixRQUFMLENBQWM2VSxHQUFkLENBQWtCLCtDQUFsQixFQUNLMUksRUFETCxDQUNRLHdCQURSLEVBQ2tDLFlBQVU7QUFDdEM5UCwyQkFBYXVFLE1BQU1vZixPQUFuQjtBQUNELGFBSEwsRUFHTzdULEVBSFAsQ0FHVSx3QkFIVixFQUdvQyxZQUFVO0FBQ3hDOVAsMkJBQWF1RSxNQUFNb2YsT0FBbkI7QUFDQXBmLG9CQUFNb2YsT0FBTixHQUFnQjlqQixXQUFXLFlBQVU7QUFDbkMwRSxzQkFBTWdjLEtBQU47QUFDQWhjLHNCQUFNdWUsT0FBTixDQUFjbGYsSUFBZCxDQUFtQixPQUFuQixFQUE0QixLQUE1QjtBQUNELGVBSGUsRUFHYlcsTUFBTXNQLE9BQU4sQ0FBYytQLFVBSEQsQ0FBaEI7QUFJRCxhQVRMO0FBVUQ7QUFDRjtBQUNELGFBQUtkLE9BQUwsQ0FBYWxDLEdBQWIsQ0FBaUIsS0FBS2pkLFFBQXRCLEVBQWdDbU0sRUFBaEMsQ0FBbUMscUJBQW5DLEVBQTBELFVBQVMxSixDQUFULEVBQVk7O0FBRXBFLGNBQUk2UyxVQUFVelcsRUFBRSxJQUFGLENBQWQ7QUFBQSxjQUNFc2hCLDJCQUEyQnBoQixXQUFXbUssUUFBWCxDQUFvQm9CLGFBQXBCLENBQWtDMUosTUFBTVosUUFBeEMsQ0FEN0I7O0FBR0FqQixxQkFBV21LLFFBQVgsQ0FBb0JTLFNBQXBCLENBQThCbEgsQ0FBOUIsRUFBaUMsVUFBakMsRUFBNkM7QUFDM0MyZCx5QkFBYSxZQUFXO0FBQ3RCLGtCQUFJeGYsTUFBTVosUUFBTixDQUFla0MsSUFBZixDQUFvQixRQUFwQixFQUE4QnNJLEVBQTlCLENBQWlDMlYseUJBQXlCeFIsRUFBekIsQ0FBNEIsQ0FBQyxDQUE3QixDQUFqQyxDQUFKLEVBQXVFO0FBQUU7QUFDdkUsb0JBQUkvTixNQUFNc1AsT0FBTixDQUFjbVEsU0FBbEIsRUFBNkI7QUFBRTtBQUM3QkYsMkNBQXlCeFIsRUFBekIsQ0FBNEIsQ0FBNUIsRUFBK0J3TSxLQUEvQjtBQUNBMVksb0JBQUV5TyxjQUFGO0FBQ0QsaUJBSEQsTUFHTztBQUFFO0FBQ1B0USx3QkFBTWdjLEtBQU47QUFDRDtBQUNGO0FBQ0YsYUFWMEM7QUFXM0MwRCwwQkFBYyxZQUFXO0FBQ3ZCLGtCQUFJMWYsTUFBTVosUUFBTixDQUFla0MsSUFBZixDQUFvQixRQUFwQixFQUE4QnNJLEVBQTlCLENBQWlDMlYseUJBQXlCeFIsRUFBekIsQ0FBNEIsQ0FBNUIsQ0FBakMsS0FBb0UvTixNQUFNWixRQUFOLENBQWV3SyxFQUFmLENBQWtCLFFBQWxCLENBQXhFLEVBQXFHO0FBQUU7QUFDckcsb0JBQUk1SixNQUFNc1AsT0FBTixDQUFjbVEsU0FBbEIsRUFBNkI7QUFBRTtBQUM3QkYsMkNBQXlCeFIsRUFBekIsQ0FBNEIsQ0FBQyxDQUE3QixFQUFnQ3dNLEtBQWhDO0FBQ0ExWSxvQkFBRXlPLGNBQUY7QUFDRCxpQkFIRCxNQUdPO0FBQUU7QUFDUHRRLHdCQUFNZ2MsS0FBTjtBQUNEO0FBQ0Y7QUFDRixhQXBCMEM7QUFxQjNDRCxrQkFBTSxZQUFXO0FBQ2Ysa0JBQUlySCxRQUFROUssRUFBUixDQUFXNUosTUFBTXVlLE9BQWpCLENBQUosRUFBK0I7QUFDN0J2ZSxzQkFBTStiLElBQU47QUFDQS9iLHNCQUFNWixRQUFOLENBQWVaLElBQWYsQ0FBb0IsVUFBcEIsRUFBZ0MsQ0FBQyxDQUFqQyxFQUFvQytiLEtBQXBDO0FBQ0ExWSxrQkFBRXlPLGNBQUY7QUFDRDtBQUNGLGFBM0IwQztBQTRCM0MwTCxtQkFBTyxZQUFXO0FBQ2hCaGMsb0JBQU1nYyxLQUFOO0FBQ0FoYyxvQkFBTXVlLE9BQU4sQ0FBY2hFLEtBQWQ7QUFDRDtBQS9CMEMsV0FBN0M7QUFpQ0QsU0F0Q0Q7QUF1Q0Q7O0FBRUQ7Ozs7OztBQTNPVztBQUFBO0FBQUEsd0NBZ1BPO0FBQ2YsWUFBSXFELFFBQVEzZixFQUFFYixTQUFTOUMsSUFBWCxFQUFpQjZaLEdBQWpCLENBQXFCLEtBQUsvVSxRQUExQixDQUFaO0FBQUEsWUFDSVksUUFBUSxJQURaO0FBRUE0ZCxjQUFNM0osR0FBTixDQUFVLG1CQUFWLEVBQ00xSSxFQUROLENBQ1MsbUJBRFQsRUFDOEIsVUFBUzFKLENBQVQsRUFBVztBQUNsQyxjQUFHN0IsTUFBTXVlLE9BQU4sQ0FBYzNVLEVBQWQsQ0FBaUIvSCxFQUFFN0YsTUFBbkIsS0FBOEJnRSxNQUFNdWUsT0FBTixDQUFjamQsSUFBZCxDQUFtQk8sRUFBRTdGLE1BQXJCLEVBQTZCMEUsTUFBOUQsRUFBc0U7QUFDcEU7QUFDRDtBQUNELGNBQUdWLE1BQU1aLFFBQU4sQ0FBZWtDLElBQWYsQ0FBb0JPLEVBQUU3RixNQUF0QixFQUE4QjBFLE1BQWpDLEVBQXlDO0FBQ3ZDO0FBQ0Q7QUFDRFYsZ0JBQU1nYyxLQUFOO0FBQ0E0QixnQkFBTTNKLEdBQU4sQ0FBVSxtQkFBVjtBQUNELFNBVk47QUFXRjs7QUFFRDs7Ozs7OztBQWhRVztBQUFBO0FBQUEsNkJBc1FKO0FBQ0w7QUFDQTs7OztBQUlBLGFBQUs3VSxRQUFMLENBQWNFLE9BQWQsQ0FBc0IscUJBQXRCLEVBQTZDLEtBQUtGLFFBQUwsQ0FBY1osSUFBZCxDQUFtQixJQUFuQixDQUE3QztBQUNBLGFBQUsrZixPQUFMLENBQWFwUSxRQUFiLENBQXNCLE9BQXRCLEVBQ0szUCxJQURMLENBQ1UsRUFBQyxpQkFBaUIsSUFBbEIsRUFEVjtBQUVBO0FBQ0EsYUFBSzBnQixZQUFMO0FBQ0EsYUFBSzlmLFFBQUwsQ0FBYytPLFFBQWQsQ0FBdUIsU0FBdkIsRUFDSzNQLElBREwsQ0FDVSxFQUFDLGVBQWUsS0FBaEIsRUFEVjs7QUFHQSxZQUFHLEtBQUs4USxPQUFMLENBQWFxUSxTQUFoQixFQUEwQjtBQUN4QixjQUFJQyxhQUFhemhCLFdBQVdtSyxRQUFYLENBQW9Cb0IsYUFBcEIsQ0FBa0MsS0FBS3RLLFFBQXZDLENBQWpCO0FBQ0EsY0FBR3dnQixXQUFXbGYsTUFBZCxFQUFxQjtBQUNuQmtmLHVCQUFXN1IsRUFBWCxDQUFjLENBQWQsRUFBaUJ3TSxLQUFqQjtBQUNEO0FBQ0Y7O0FBRUQsWUFBRyxLQUFLakwsT0FBTCxDQUFhcU8sWUFBaEIsRUFBNkI7QUFBRSxlQUFLa0MsZUFBTDtBQUF5Qjs7QUFFeEQ7Ozs7QUFJQSxhQUFLemdCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixrQkFBdEIsRUFBMEMsQ0FBQyxLQUFLRixRQUFOLENBQTFDO0FBQ0Q7O0FBRUQ7Ozs7OztBQXBTVztBQUFBO0FBQUEsOEJBeVNIO0FBQ04sWUFBRyxDQUFDLEtBQUtBLFFBQUwsQ0FBYzZhLFFBQWQsQ0FBdUIsU0FBdkIsQ0FBSixFQUFzQztBQUNwQyxpQkFBTyxLQUFQO0FBQ0Q7QUFDRCxhQUFLN2EsUUFBTCxDQUFjb0UsV0FBZCxDQUEwQixTQUExQixFQUNLaEYsSUFETCxDQUNVLEVBQUMsZUFBZSxJQUFoQixFQURWOztBQUdBLGFBQUsrZixPQUFMLENBQWEvYSxXQUFiLENBQXlCLE9BQXpCLEVBQ0toRixJQURMLENBQ1UsZUFEVixFQUMyQixLQUQzQjs7QUFHQSxZQUFHLEtBQUt1Z0IsWUFBUixFQUFxQjtBQUNuQixjQUFJZSxtQkFBbUIsS0FBS3JCLGdCQUFMLEVBQXZCO0FBQ0EsY0FBR3FCLGdCQUFILEVBQW9CO0FBQ2xCLGlCQUFLMWdCLFFBQUwsQ0FBY29FLFdBQWQsQ0FBMEJzYyxnQkFBMUI7QUFDRDtBQUNELGVBQUsxZ0IsUUFBTCxDQUFjK08sUUFBZCxDQUF1QixLQUFLbUIsT0FBTCxDQUFha1AsYUFBcEM7QUFDSSxxQkFESixDQUNnQjlULEdBRGhCLENBQ29CLEVBQUM1RCxRQUFRLEVBQVQsRUFBYUMsT0FBTyxFQUFwQixFQURwQjtBQUVBLGVBQUtnWSxZQUFMLEdBQW9CLEtBQXBCO0FBQ0EsZUFBS0wsT0FBTCxHQUFlLENBQWY7QUFDQSxlQUFLQyxhQUFMLENBQW1CamUsTUFBbkIsR0FBNEIsQ0FBNUI7QUFDRDtBQUNELGFBQUt0QixRQUFMLENBQWNFLE9BQWQsQ0FBc0Isa0JBQXRCLEVBQTBDLENBQUMsS0FBS0YsUUFBTixDQUExQztBQUNEOztBQUVEOzs7OztBQWpVVztBQUFBO0FBQUEsK0JBcVVGO0FBQ1AsWUFBRyxLQUFLQSxRQUFMLENBQWM2YSxRQUFkLENBQXVCLFNBQXZCLENBQUgsRUFBcUM7QUFDbkMsY0FBRyxLQUFLc0UsT0FBTCxDQUFhbGYsSUFBYixDQUFrQixPQUFsQixDQUFILEVBQStCO0FBQy9CLGVBQUsyYyxLQUFMO0FBQ0QsU0FIRCxNQUdLO0FBQ0gsZUFBS0QsSUFBTDtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7O0FBOVVXO0FBQUE7QUFBQSxnQ0FrVkQ7QUFDUixhQUFLM2MsUUFBTCxDQUFjNlUsR0FBZCxDQUFrQixhQUFsQixFQUFpQ3pGLElBQWpDO0FBQ0EsYUFBSytQLE9BQUwsQ0FBYXRLLEdBQWIsQ0FBaUIsY0FBakI7O0FBRUE5VixtQkFBV29CLGdCQUFYLENBQTRCLElBQTVCO0FBQ0Q7QUF2VlU7O0FBQUE7QUFBQTs7QUEwVmI4ZSxXQUFTakosUUFBVCxHQUFvQjtBQUNsQjs7Ozs7QUFLQWlLLGdCQUFZLEdBTk07QUFPbEI7Ozs7O0FBS0FGLFdBQU8sS0FaVztBQWFsQjs7Ozs7QUFLQUcsZUFBVyxLQWxCTztBQW1CbEI7Ozs7O0FBS0F2WCxhQUFTLENBeEJTO0FBeUJsQjs7Ozs7QUFLQUMsYUFBUyxDQTlCUztBQStCbEI7Ozs7O0FBS0F3VyxtQkFBZSxFQXBDRztBQXFDbEI7Ozs7O0FBS0FpQixlQUFXLEtBMUNPO0FBMkNsQjs7Ozs7QUFLQUUsZUFBVyxLQWhETztBQWlEbEI7Ozs7O0FBS0FoQyxrQkFBYztBQXRESSxHQUFwQjs7QUF5REE7QUFDQXhmLGFBQVdNLE1BQVgsQ0FBa0I0ZixRQUFsQixFQUE0QixVQUE1QjtBQUVDLENBdFpBLENBc1pDdlksTUF0WkQsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7Ozs7O0FBRmEsTUFVUDhoQixZQVZPO0FBV1g7Ozs7Ozs7QUFPQSwwQkFBWTVaLE9BQVosRUFBcUJtSixPQUFyQixFQUE4QjtBQUFBOztBQUM1QixXQUFLbFEsUUFBTCxHQUFnQitHLE9BQWhCO0FBQ0EsV0FBS21KLE9BQUwsR0FBZXJSLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFheVcsYUFBYTNLLFFBQTFCLEVBQW9DLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBcEMsRUFBMERpUSxPQUExRCxDQUFmOztBQUVBblIsaUJBQVd1USxJQUFYLENBQWdCQyxPQUFoQixDQUF3QixLQUFLdlAsUUFBN0IsRUFBdUMsVUFBdkM7QUFDQSxXQUFLVyxLQUFMOztBQUVBNUIsaUJBQVdZLGNBQVgsQ0FBMEIsSUFBMUIsRUFBZ0MsY0FBaEM7QUFDQVosaUJBQVdtSyxRQUFYLENBQW9CdUIsUUFBcEIsQ0FBNkIsY0FBN0IsRUFBNkM7QUFDM0MsaUJBQVMsTUFEa0M7QUFFM0MsaUJBQVMsTUFGa0M7QUFHM0MsdUJBQWUsTUFINEI7QUFJM0Msb0JBQVksSUFKK0I7QUFLM0Msc0JBQWMsTUFMNkI7QUFNM0Msc0JBQWMsVUFONkI7QUFPM0Msa0JBQVU7QUFQaUMsT0FBN0M7QUFTRDs7QUFFRDs7Ozs7OztBQXJDVztBQUFBO0FBQUEsOEJBMENIO0FBQ04sWUFBSW1XLE9BQU8sS0FBSzVnQixRQUFMLENBQWNrQyxJQUFkLENBQW1CLCtCQUFuQixDQUFYO0FBQ0EsYUFBS2xDLFFBQUwsQ0FBYytQLFFBQWQsQ0FBdUIsNkJBQXZCLEVBQXNEQSxRQUF0RCxDQUErRCxzQkFBL0QsRUFBdUZoQixRQUF2RixDQUFnRyxXQUFoRzs7QUFFQSxhQUFLdU8sVUFBTCxHQUFrQixLQUFLdGQsUUFBTCxDQUFja0MsSUFBZCxDQUFtQixtQkFBbkIsQ0FBbEI7QUFDQSxhQUFLb1ksS0FBTCxHQUFhLEtBQUt0YSxRQUFMLENBQWMrUCxRQUFkLENBQXVCLG1CQUF2QixDQUFiO0FBQ0EsYUFBS3VLLEtBQUwsQ0FBV3BZLElBQVgsQ0FBZ0Isd0JBQWhCLEVBQTBDNk0sUUFBMUMsQ0FBbUQsS0FBS21CLE9BQUwsQ0FBYTJRLGFBQWhFOztBQUVBLFlBQUksS0FBSzdnQixRQUFMLENBQWM2YSxRQUFkLENBQXVCLEtBQUszSyxPQUFMLENBQWE0USxVQUFwQyxLQUFtRCxLQUFLNVEsT0FBTCxDQUFhNlEsU0FBYixLQUEyQixPQUE5RSxJQUF5RmhpQixXQUFXSSxHQUFYLEVBQXpGLElBQTZHLEtBQUthLFFBQUwsQ0FBYzBjLE9BQWQsQ0FBc0IsZ0JBQXRCLEVBQXdDbFMsRUFBeEMsQ0FBMkMsR0FBM0MsQ0FBakgsRUFBa0s7QUFDaEssZUFBSzBGLE9BQUwsQ0FBYTZRLFNBQWIsR0FBeUIsT0FBekI7QUFDQUgsZUFBSzdSLFFBQUwsQ0FBYyxZQUFkO0FBQ0QsU0FIRCxNQUdPO0FBQ0w2UixlQUFLN1IsUUFBTCxDQUFjLGFBQWQ7QUFDRDtBQUNELGFBQUtpUyxPQUFMLEdBQWUsS0FBZjtBQUNBLGFBQUs5SyxPQUFMO0FBQ0Q7QUExRFU7QUFBQTs7QUEyRFg7Ozs7O0FBM0RXLGdDQWdFRDtBQUNSLFlBQUl0VixRQUFRLElBQVo7QUFBQSxZQUNJcWdCLFdBQVcsa0JBQWtCbG1CLE1BQWxCLElBQTZCLE9BQU9BLE9BQU9tbUIsWUFBZCxLQUErQixXQUQzRTtBQUFBLFlBRUlDLFdBQVcsNEJBRmY7O0FBSUE7QUFDQSxZQUFJQyxnQkFBZ0IsVUFBUzNlLENBQVQsRUFBWTtBQUM5QixjQUFJUixRQUFRcEQsRUFBRTRELEVBQUU3RixNQUFKLEVBQVlvZ0IsWUFBWixDQUF5QixJQUF6QixRQUFtQ21FLFFBQW5DLENBQVo7QUFBQSxjQUNJRSxTQUFTcGYsTUFBTTRZLFFBQU4sQ0FBZXNHLFFBQWYsQ0FEYjtBQUFBLGNBRUlHLGFBQWFyZixNQUFNN0MsSUFBTixDQUFXLGVBQVgsTUFBZ0MsTUFGakQ7QUFBQSxjQUdJMFEsT0FBTzdOLE1BQU04TixRQUFOLENBQWUsc0JBQWYsQ0FIWDs7QUFLQSxjQUFJc1IsTUFBSixFQUFZO0FBQ1YsZ0JBQUlDLFVBQUosRUFBZ0I7QUFDZCxrQkFBSSxDQUFDMWdCLE1BQU1zUCxPQUFOLENBQWNxTyxZQUFmLElBQWdDLENBQUMzZCxNQUFNc1AsT0FBTixDQUFjcVIsU0FBZixJQUE0QixDQUFDTixRQUE3RCxJQUEyRXJnQixNQUFNc1AsT0FBTixDQUFjc1IsV0FBZCxJQUE2QlAsUUFBNUcsRUFBdUg7QUFBRTtBQUFTLGVBQWxJLE1BQ0s7QUFDSHhlLGtCQUFFc2Esd0JBQUY7QUFDQXRhLGtCQUFFeU8sY0FBRjtBQUNBdFEsc0JBQU0rZCxLQUFOLENBQVkxYyxLQUFaO0FBQ0Q7QUFDRixhQVBELE1BT087QUFDTFEsZ0JBQUV5TyxjQUFGO0FBQ0F6TyxnQkFBRXNhLHdCQUFGO0FBQ0FuYyxvQkFBTTBkLEtBQU4sQ0FBWXJjLE1BQU04TixRQUFOLENBQWUsc0JBQWYsQ0FBWjtBQUNBOU4sb0JBQU1nYixHQUFOLENBQVVoYixNQUFNK2EsWUFBTixDQUFtQnBjLE1BQU1aLFFBQXpCLFFBQXVDbWhCLFFBQXZDLENBQVYsRUFBOEQvaEIsSUFBOUQsQ0FBbUUsZUFBbkUsRUFBb0YsSUFBcEY7QUFDRDtBQUNGLFdBZEQsTUFjTztBQUFFO0FBQVM7QUFDbkIsU0FyQkQ7O0FBdUJBLFlBQUksS0FBSzhRLE9BQUwsQ0FBYXFSLFNBQWIsSUFBMEJOLFFBQTlCLEVBQXdDO0FBQ3RDLGVBQUszRCxVQUFMLENBQWdCblIsRUFBaEIsQ0FBbUIsa0RBQW5CLEVBQXVFaVYsYUFBdkU7QUFDRDs7QUFFRCxZQUFJLENBQUMsS0FBS2xSLE9BQUwsQ0FBYXVSLFlBQWxCLEVBQWdDO0FBQzlCLGVBQUtuRSxVQUFMLENBQWdCblIsRUFBaEIsQ0FBbUIsNEJBQW5CLEVBQWlELFVBQVMxSixDQUFULEVBQVk7QUFDM0QsZ0JBQUlSLFFBQVFwRCxFQUFFLElBQUYsQ0FBWjtBQUFBLGdCQUNJd2lCLFNBQVNwZixNQUFNNFksUUFBTixDQUFlc0csUUFBZixDQURiOztBQUdBLGdCQUFJRSxNQUFKLEVBQVk7QUFDVmhsQiwyQkFBYXVFLE1BQU04QyxLQUFuQjtBQUNBOUMsb0JBQU04QyxLQUFOLEdBQWN4SCxXQUFXLFlBQVc7QUFDbEMwRSxzQkFBTTBkLEtBQU4sQ0FBWXJjLE1BQU04TixRQUFOLENBQWUsc0JBQWYsQ0FBWjtBQUNELGVBRmEsRUFFWG5QLE1BQU1zUCxPQUFOLENBQWMrUCxVQUZILENBQWQ7QUFHRDtBQUNGLFdBVkQsRUFVRzlULEVBVkgsQ0FVTSw0QkFWTixFQVVvQyxVQUFTMUosQ0FBVCxFQUFZO0FBQzlDLGdCQUFJUixRQUFRcEQsRUFBRSxJQUFGLENBQVo7QUFBQSxnQkFDSXdpQixTQUFTcGYsTUFBTTRZLFFBQU4sQ0FBZXNHLFFBQWYsQ0FEYjtBQUVBLGdCQUFJRSxVQUFVemdCLE1BQU1zUCxPQUFOLENBQWN3UixTQUE1QixFQUF1QztBQUNyQyxrQkFBSXpmLE1BQU03QyxJQUFOLENBQVcsZUFBWCxNQUFnQyxNQUFoQyxJQUEwQ3dCLE1BQU1zUCxPQUFOLENBQWNxUixTQUE1RCxFQUF1RTtBQUFFLHVCQUFPLEtBQVA7QUFBZTs7QUFFeEZsbEIsMkJBQWF1RSxNQUFNOEMsS0FBbkI7QUFDQTlDLG9CQUFNOEMsS0FBTixHQUFjeEgsV0FBVyxZQUFXO0FBQ2xDMEUsc0JBQU0rZCxLQUFOLENBQVkxYyxLQUFaO0FBQ0QsZUFGYSxFQUVYckIsTUFBTXNQLE9BQU4sQ0FBY3lSLFdBRkgsQ0FBZDtBQUdEO0FBQ0YsV0FyQkQ7QUFzQkQ7QUFDRCxhQUFLckUsVUFBTCxDQUFnQm5SLEVBQWhCLENBQW1CLHlCQUFuQixFQUE4QyxVQUFTMUosQ0FBVCxFQUFZO0FBQ3hELGNBQUl6QyxXQUFXbkIsRUFBRTRELEVBQUU3RixNQUFKLEVBQVlvZ0IsWUFBWixDQUF5QixJQUF6QixFQUErQixtQkFBL0IsQ0FBZjtBQUFBLGNBQ0k0RSxRQUFRaGhCLE1BQU0wWixLQUFOLENBQVl1SCxLQUFaLENBQWtCN2hCLFFBQWxCLElBQThCLENBQUMsQ0FEM0M7QUFBQSxjQUVJc2MsWUFBWXNGLFFBQVFoaEIsTUFBTTBaLEtBQWQsR0FBc0J0YSxTQUFTMlcsUUFBVCxDQUFrQixJQUFsQixFQUF3QnNHLEdBQXhCLENBQTRCamQsUUFBNUIsQ0FGdEM7QUFBQSxjQUdJdWMsWUFISjtBQUFBLGNBSUlDLFlBSko7O0FBTUFGLG9CQUFVNWIsSUFBVixDQUFlLFVBQVNzQixDQUFULEVBQVk7QUFDekIsZ0JBQUluRCxFQUFFLElBQUYsRUFBUTJMLEVBQVIsQ0FBV3hLLFFBQVgsQ0FBSixFQUEwQjtBQUN4QnVjLDZCQUFlRCxVQUFVM04sRUFBVixDQUFhM00sSUFBRSxDQUFmLENBQWY7QUFDQXdhLDZCQUFlRixVQUFVM04sRUFBVixDQUFhM00sSUFBRSxDQUFmLENBQWY7QUFDQTtBQUNEO0FBQ0YsV0FORDs7QUFRQSxjQUFJOGYsY0FBYyxZQUFXO0FBQzNCLGdCQUFJLENBQUM5aEIsU0FBU3dLLEVBQVQsQ0FBWSxhQUFaLENBQUwsRUFBaUM7QUFDL0JnUywyQkFBYXpNLFFBQWIsQ0FBc0IsU0FBdEIsRUFBaUNvTCxLQUFqQztBQUNBMVksZ0JBQUV5TyxjQUFGO0FBQ0Q7QUFDRixXQUxEO0FBQUEsY0FLRzZRLGNBQWMsWUFBVztBQUMxQnhGLHlCQUFheE0sUUFBYixDQUFzQixTQUF0QixFQUFpQ29MLEtBQWpDO0FBQ0ExWSxjQUFFeU8sY0FBRjtBQUNELFdBUkQ7QUFBQSxjQVFHOFEsVUFBVSxZQUFXO0FBQ3RCLGdCQUFJbFMsT0FBTzlQLFNBQVMrUCxRQUFULENBQWtCLHdCQUFsQixDQUFYO0FBQ0EsZ0JBQUlELEtBQUt4TyxNQUFULEVBQWlCO0FBQ2ZWLG9CQUFNMGQsS0FBTixDQUFZeE8sSUFBWjtBQUNBOVAsdUJBQVNrQyxJQUFULENBQWMsY0FBZCxFQUE4QmlaLEtBQTlCO0FBQ0ExWSxnQkFBRXlPLGNBQUY7QUFDRCxhQUpELE1BSU87QUFBRTtBQUFTO0FBQ25CLFdBZkQ7QUFBQSxjQWVHK1EsV0FBVyxZQUFXO0FBQ3ZCO0FBQ0EsZ0JBQUlyRixRQUFRNWMsU0FBU2dILE1BQVQsQ0FBZ0IsSUFBaEIsRUFBc0JBLE1BQXRCLENBQTZCLElBQTdCLENBQVo7QUFDQTRWLGtCQUFNN00sUUFBTixDQUFlLFNBQWYsRUFBMEJvTCxLQUExQjtBQUNBdmEsa0JBQU0rZCxLQUFOLENBQVkvQixLQUFaO0FBQ0FuYSxjQUFFeU8sY0FBRjtBQUNBO0FBQ0QsV0F0QkQ7QUF1QkEsY0FBSXJILFlBQVk7QUFDZDhTLGtCQUFNcUYsT0FEUTtBQUVkcEYsbUJBQU8sWUFBVztBQUNoQmhjLG9CQUFNK2QsS0FBTixDQUFZL2QsTUFBTVosUUFBbEI7QUFDQVksb0JBQU0wYyxVQUFOLENBQWlCcGIsSUFBakIsQ0FBc0IsU0FBdEIsRUFBaUNpWixLQUFqQyxHQUZnQixDQUUwQjtBQUMxQzFZLGdCQUFFeU8sY0FBRjtBQUNELGFBTmE7QUFPZDlHLHFCQUFTLFlBQVc7QUFDbEIzSCxnQkFBRXNhLHdCQUFGO0FBQ0Q7QUFUYSxXQUFoQjs7QUFZQSxjQUFJNkUsS0FBSixFQUFXO0FBQ1QsZ0JBQUloaEIsTUFBTVosUUFBTixDQUFlNmEsUUFBZixDQUF3QmphLE1BQU1zUCxPQUFOLENBQWMyUSxhQUF0QyxDQUFKLEVBQTBEO0FBQUU7QUFDMUQsa0JBQUlqZ0IsTUFBTXNQLE9BQU4sQ0FBYzZRLFNBQWQsS0FBNEIsTUFBaEMsRUFBd0M7QUFBRTtBQUN4Q2xpQixrQkFBRXFMLE1BQUYsQ0FBU0wsU0FBVCxFQUFvQjtBQUNsQjhRLHdCQUFNbUgsV0FEWTtBQUVsQi9HLHNCQUFJZ0gsV0FGYztBQUdsQjlHLHdCQUFNK0csT0FIWTtBQUlsQjNHLDRCQUFVNEc7QUFKUSxpQkFBcEI7QUFNRCxlQVBELE1BT087QUFBRTtBQUNQcGpCLGtCQUFFcUwsTUFBRixDQUFTTCxTQUFULEVBQW9CO0FBQ2xCOFEsd0JBQU1tSCxXQURZO0FBRWxCL0csc0JBQUlnSCxXQUZjO0FBR2xCOUcsd0JBQU1nSCxRQUhZO0FBSWxCNUcsNEJBQVUyRztBQUpRLGlCQUFwQjtBQU1EO0FBQ0YsYUFoQkQsTUFnQk87QUFBRTtBQUNQbmpCLGdCQUFFcUwsTUFBRixDQUFTTCxTQUFULEVBQW9CO0FBQ2xCb1Isc0JBQU02RyxXQURZO0FBRWxCekcsMEJBQVUwRyxXQUZRO0FBR2xCcEgsc0JBQU1xSCxPQUhZO0FBSWxCakgsb0JBQUlrSDtBQUpjLGVBQXBCO0FBTUQ7QUFDRixXQXpCRCxNQXlCTztBQUFFO0FBQ1AsZ0JBQUlyaEIsTUFBTXNQLE9BQU4sQ0FBYzZRLFNBQWQsS0FBNEIsTUFBaEMsRUFBd0M7QUFBRTtBQUN4Q2xpQixnQkFBRXFMLE1BQUYsQ0FBU0wsU0FBVCxFQUFvQjtBQUNsQm9SLHNCQUFNK0csT0FEWTtBQUVsQjNHLDBCQUFVNEcsUUFGUTtBQUdsQnRILHNCQUFNbUgsV0FIWTtBQUlsQi9HLG9CQUFJZ0g7QUFKYyxlQUFwQjtBQU1ELGFBUEQsTUFPTztBQUFFO0FBQ1BsakIsZ0JBQUVxTCxNQUFGLENBQVNMLFNBQVQsRUFBb0I7QUFDbEJvUixzQkFBTWdILFFBRFk7QUFFbEI1RywwQkFBVTJHLE9BRlE7QUFHbEJySCxzQkFBTW1ILFdBSFk7QUFJbEIvRyxvQkFBSWdIO0FBSmMsZUFBcEI7QUFNRDtBQUNGO0FBQ0RoakIscUJBQVdtSyxRQUFYLENBQW9CUyxTQUFwQixDQUE4QmxILENBQTlCLEVBQWlDLGNBQWpDLEVBQWlEb0gsU0FBakQ7QUFFRCxTQTlGRDtBQStGRDs7QUFFRDs7Ozs7O0FBMU5XO0FBQUE7QUFBQSx3Q0ErTk87QUFDaEIsWUFBSTJVLFFBQVEzZixFQUFFYixTQUFTOUMsSUFBWCxDQUFaO0FBQUEsWUFDSTBGLFFBQVEsSUFEWjtBQUVBNGQsY0FBTTNKLEdBQU4sQ0FBVSxrREFBVixFQUNNMUksRUFETixDQUNTLGtEQURULEVBQzZELFVBQVMxSixDQUFULEVBQVk7QUFDbEUsY0FBSWdiLFFBQVE3YyxNQUFNWixRQUFOLENBQWVrQyxJQUFmLENBQW9CTyxFQUFFN0YsTUFBdEIsQ0FBWjtBQUNBLGNBQUk2Z0IsTUFBTW5jLE1BQVYsRUFBa0I7QUFBRTtBQUFTOztBQUU3QlYsZ0JBQU0rZCxLQUFOO0FBQ0FILGdCQUFNM0osR0FBTixDQUFVLGtEQUFWO0FBQ0QsU0FQTjtBQVFEOztBQUVEOzs7Ozs7OztBQTVPVztBQUFBO0FBQUEsNEJBbVBML0UsSUFuUEssRUFtUEM7QUFDVixZQUFJeUssTUFBTSxLQUFLRCxLQUFMLENBQVd1SCxLQUFYLENBQWlCLEtBQUt2SCxLQUFMLENBQVcvUCxNQUFYLENBQWtCLFVBQVN2SSxDQUFULEVBQVlZLEVBQVosRUFBZ0I7QUFDM0QsaUJBQU8vRCxFQUFFK0QsRUFBRixFQUFNVixJQUFOLENBQVc0TixJQUFYLEVBQWlCeE8sTUFBakIsR0FBMEIsQ0FBakM7QUFDRCxTQUYwQixDQUFqQixDQUFWO0FBR0EsWUFBSTRnQixRQUFRcFMsS0FBSzlJLE1BQUwsQ0FBWSwrQkFBWixFQUE2QzJQLFFBQTdDLENBQXNELCtCQUF0RCxDQUFaO0FBQ0EsYUFBS2dJLEtBQUwsQ0FBV3VELEtBQVgsRUFBa0IzSCxHQUFsQjtBQUNBekssYUFBS3hFLEdBQUwsQ0FBUyxZQUFULEVBQXVCLFFBQXZCLEVBQWlDeUQsUUFBakMsQ0FBMEMsb0JBQTFDLEVBQWdFM1AsSUFBaEUsQ0FBcUUsRUFBQyxlQUFlLEtBQWhCLEVBQXJFLEVBQ0s0SCxNQURMLENBQ1ksK0JBRFosRUFDNkMrSCxRQUQ3QyxDQUNzRCxXQUR0RCxFQUVLM1AsSUFGTCxDQUVVLEVBQUMsaUJBQWlCLElBQWxCLEVBRlY7QUFHQSxZQUFJNlosUUFBUWxhLFdBQVc0SCxHQUFYLENBQWVDLGdCQUFmLENBQWdDa0osSUFBaEMsRUFBc0MsSUFBdEMsRUFBNEMsSUFBNUMsQ0FBWjtBQUNBLFlBQUksQ0FBQ21KLEtBQUwsRUFBWTtBQUNWLGNBQUlrSixXQUFXLEtBQUtqUyxPQUFMLENBQWE2USxTQUFiLEtBQTJCLE1BQTNCLEdBQW9DLFFBQXBDLEdBQStDLE9BQTlEO0FBQUEsY0FDSXFCLFlBQVl0UyxLQUFLOUksTUFBTCxDQUFZLDZCQUFaLENBRGhCO0FBRUFvYixvQkFBVWhlLFdBQVYsV0FBOEIrZCxRQUE5QixFQUEwQ3BULFFBQTFDLFlBQTRELEtBQUttQixPQUFMLENBQWE2USxTQUF6RTtBQUNBOUgsa0JBQVFsYSxXQUFXNEgsR0FBWCxDQUFlQyxnQkFBZixDQUFnQ2tKLElBQWhDLEVBQXNDLElBQXRDLEVBQTRDLElBQTVDLENBQVI7QUFDQSxjQUFJLENBQUNtSixLQUFMLEVBQVk7QUFDVm1KLHNCQUFVaGUsV0FBVixZQUErQixLQUFLOEwsT0FBTCxDQUFhNlEsU0FBNUMsRUFBeURoUyxRQUF6RCxDQUFrRSxhQUFsRTtBQUNEO0FBQ0QsZUFBS2lTLE9BQUwsR0FBZSxJQUFmO0FBQ0Q7QUFDRGxSLGFBQUt4RSxHQUFMLENBQVMsWUFBVCxFQUF1QixFQUF2QjtBQUNBLFlBQUksS0FBSzRFLE9BQUwsQ0FBYXFPLFlBQWpCLEVBQStCO0FBQUUsZUFBS2tDLGVBQUw7QUFBeUI7QUFDMUQ7Ozs7QUFJQSxhQUFLemdCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixzQkFBdEIsRUFBOEMsQ0FBQzRQLElBQUQsQ0FBOUM7QUFDRDs7QUFFRDs7Ozs7Ozs7QUFoUlc7QUFBQTtBQUFBLDRCQXVSTDdOLEtBdlJLLEVBdVJFc1ksR0F2UkYsRUF1Uk87QUFDaEIsWUFBSThILFFBQUo7QUFDQSxZQUFJcGdCLFNBQVNBLE1BQU1YLE1BQW5CLEVBQTJCO0FBQ3pCK2dCLHFCQUFXcGdCLEtBQVg7QUFDRCxTQUZELE1BRU8sSUFBSXNZLFFBQVFqYyxTQUFaLEVBQXVCO0FBQzVCK2pCLHFCQUFXLEtBQUsvSCxLQUFMLENBQVd2RixHQUFYLENBQWUsVUFBUy9TLENBQVQsRUFBWVksRUFBWixFQUFnQjtBQUN4QyxtQkFBT1osTUFBTXVZLEdBQWI7QUFDRCxXQUZVLENBQVg7QUFHRCxTQUpNLE1BS0Y7QUFDSDhILHFCQUFXLEtBQUtyaUIsUUFBaEI7QUFDRDtBQUNELFlBQUlzaUIsbUJBQW1CRCxTQUFTeEgsUUFBVCxDQUFrQixXQUFsQixLQUFrQ3dILFNBQVNuZ0IsSUFBVCxDQUFjLFlBQWQsRUFBNEJaLE1BQTVCLEdBQXFDLENBQTlGOztBQUVBLFlBQUlnaEIsZ0JBQUosRUFBc0I7QUFDcEJELG1CQUFTbmdCLElBQVQsQ0FBYyxjQUFkLEVBQThCK2EsR0FBOUIsQ0FBa0NvRixRQUFsQyxFQUE0Q2pqQixJQUE1QyxDQUFpRDtBQUMvQyw2QkFBaUIsS0FEOEI7QUFFL0MsNkJBQWlCO0FBRjhCLFdBQWpELEVBR0dnRixXQUhILENBR2UsV0FIZjs7QUFLQWllLG1CQUFTbmdCLElBQVQsQ0FBYyx1QkFBZCxFQUF1QzlDLElBQXZDLENBQTRDO0FBQzFDLDJCQUFlO0FBRDJCLFdBQTVDLEVBRUdnRixXQUZILENBRWUsb0JBRmY7O0FBSUEsY0FBSSxLQUFLNGMsT0FBTCxJQUFnQnFCLFNBQVNuZ0IsSUFBVCxDQUFjLGFBQWQsRUFBNkJaLE1BQWpELEVBQXlEO0FBQ3ZELGdCQUFJNmdCLFdBQVcsS0FBS2pTLE9BQUwsQ0FBYTZRLFNBQWIsS0FBMkIsTUFBM0IsR0FBb0MsT0FBcEMsR0FBOEMsTUFBN0Q7QUFDQXNCLHFCQUFTbmdCLElBQVQsQ0FBYywrQkFBZCxFQUErQythLEdBQS9DLENBQW1Eb0YsUUFBbkQsRUFDU2plLFdBRFQsd0JBQzBDLEtBQUs4TCxPQUFMLENBQWE2USxTQUR2RCxFQUVTaFMsUUFGVCxZQUUyQm9ULFFBRjNCO0FBR0EsaUJBQUtuQixPQUFMLEdBQWUsS0FBZjtBQUNEO0FBQ0Q7Ozs7QUFJQSxlQUFLaGhCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixzQkFBdEIsRUFBOEMsQ0FBQ21pQixRQUFELENBQTlDO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7QUE5VFc7QUFBQTtBQUFBLGdDQWtVRDtBQUNSLGFBQUsvRSxVQUFMLENBQWdCekksR0FBaEIsQ0FBb0Isa0JBQXBCLEVBQXdDelUsVUFBeEMsQ0FBbUQsZUFBbkQsRUFDS2dFLFdBREwsQ0FDaUIsK0VBRGpCO0FBRUF2RixVQUFFYixTQUFTOUMsSUFBWCxFQUFpQjJaLEdBQWpCLENBQXFCLGtCQUFyQjtBQUNBOVYsbUJBQVd1USxJQUFYLENBQWdCVSxJQUFoQixDQUFxQixLQUFLaFEsUUFBMUIsRUFBb0MsVUFBcEM7QUFDQWpCLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQXhVVTs7QUFBQTtBQUFBOztBQTJVYjs7Ozs7QUFHQXdnQixlQUFhM0ssUUFBYixHQUF3QjtBQUN0Qjs7Ozs7QUFLQXlMLGtCQUFjLEtBTlE7QUFPdEI7Ozs7O0FBS0FDLGVBQVcsSUFaVztBQWF0Qjs7Ozs7QUFLQXpCLGdCQUFZLEVBbEJVO0FBbUJ0Qjs7Ozs7QUFLQXNCLGVBQVcsS0F4Qlc7QUF5QnRCOzs7Ozs7QUFNQUksaUJBQWEsR0EvQlM7QUFnQ3RCOzs7OztBQUtBWixlQUFXLE1BckNXO0FBc0N0Qjs7Ozs7QUFLQXhDLGtCQUFjLElBM0NRO0FBNEN0Qjs7Ozs7QUFLQXNDLG1CQUFlLFVBakRPO0FBa0R0Qjs7Ozs7QUFLQUMsZ0JBQVksYUF2RFU7QUF3RHRCOzs7OztBQUtBVSxpQkFBYTtBQTdEUyxHQUF4Qjs7QUFnRUE7QUFDQXppQixhQUFXTSxNQUFYLENBQWtCc2hCLFlBQWxCLEVBQWdDLGNBQWhDO0FBRUMsQ0FqWkEsQ0FpWkNqYSxNQWpaRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7QUFGYSxNQU9QMGpCLFNBUE87QUFRWDs7Ozs7OztBQU9BLHVCQUFZeGIsT0FBWixFQUFxQm1KLE9BQXJCLEVBQTZCO0FBQUE7O0FBQzNCLFdBQUtsUSxRQUFMLEdBQWdCK0csT0FBaEI7QUFDQSxXQUFLbUosT0FBTCxHQUFnQnJSLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFhcVksVUFBVXZNLFFBQXZCLEVBQWlDLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBakMsRUFBdURpUSxPQUF2RCxDQUFoQjs7QUFFQSxXQUFLdlAsS0FBTDs7QUFFQTVCLGlCQUFXWSxjQUFYLENBQTBCLElBQTFCLEVBQWdDLFdBQWhDO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhCVztBQUFBO0FBQUEsOEJBNEJIO0FBQ04sWUFBSTZpQixPQUFPLEtBQUt4aUIsUUFBTCxDQUFjWixJQUFkLENBQW1CLGdCQUFuQixLQUF3QyxFQUFuRDtBQUNBLFlBQUlxakIsV0FBVyxLQUFLemlCLFFBQUwsQ0FBY2tDLElBQWQsNkJBQTZDc2dCLElBQTdDLFFBQWY7O0FBRUEsYUFBS0MsUUFBTCxHQUFnQkEsU0FBU25oQixNQUFULEdBQWtCbWhCLFFBQWxCLEdBQTZCLEtBQUt6aUIsUUFBTCxDQUFja0MsSUFBZCxDQUFtQix3QkFBbkIsQ0FBN0M7QUFDQSxhQUFLbEMsUUFBTCxDQUFjWixJQUFkLENBQW1CLGFBQW5CLEVBQW1Db2pCLFFBQVF6akIsV0FBV2dCLFdBQVgsQ0FBdUIsQ0FBdkIsRUFBMEIsSUFBMUIsQ0FBM0M7O0FBRUEsYUFBSzJpQixTQUFMLEdBQWlCLEtBQUsxaUIsUUFBTCxDQUFja0MsSUFBZCxDQUFtQixrQkFBbkIsRUFBdUNaLE1BQXZDLEdBQWdELENBQWpFO0FBQ0EsYUFBS3FoQixRQUFMLEdBQWdCLEtBQUszaUIsUUFBTCxDQUFjZ2QsWUFBZCxDQUEyQmhmLFNBQVM5QyxJQUFwQyxFQUEwQyxrQkFBMUMsRUFBOERvRyxNQUE5RCxHQUF1RSxDQUF2RjtBQUNBLGFBQUtzaEIsSUFBTCxHQUFZLEtBQVo7QUFDQSxhQUFLQyxZQUFMLEdBQW9CO0FBQ2xCQywyQkFBaUIsS0FBS0MsV0FBTCxDQUFpQm5kLElBQWpCLENBQXNCLElBQXRCLENBREM7QUFFbEJvZCxnQ0FBc0IsS0FBS0MsZ0JBQUwsQ0FBc0JyZCxJQUF0QixDQUEyQixJQUEzQjtBQUZKLFNBQXBCOztBQUtBLFlBQUlzZCxPQUFPLEtBQUtsakIsUUFBTCxDQUFja0MsSUFBZCxDQUFtQixLQUFuQixDQUFYO0FBQ0EsWUFBSWloQixRQUFKO0FBQ0EsWUFBRyxLQUFLalQsT0FBTCxDQUFha1QsVUFBaEIsRUFBMkI7QUFDekJELHFCQUFXLEtBQUtFLFFBQUwsRUFBWDtBQUNBeGtCLFlBQUU5RCxNQUFGLEVBQVVvUixFQUFWLENBQWEsdUJBQWIsRUFBc0MsS0FBS2tYLFFBQUwsQ0FBY3pkLElBQWQsQ0FBbUIsSUFBbkIsQ0FBdEM7QUFDRCxTQUhELE1BR0s7QUFDSCxlQUFLc1EsT0FBTDtBQUNEO0FBQ0QsWUFBSWlOLGFBQWE3a0IsU0FBYixJQUEwQjZrQixhQUFhLEtBQXhDLElBQWtEQSxhQUFhN2tCLFNBQWxFLEVBQTRFO0FBQzFFLGNBQUc0a0IsS0FBSzVoQixNQUFSLEVBQWU7QUFDYnZDLHVCQUFXMFIsY0FBWCxDQUEwQnlTLElBQTFCLEVBQWdDLEtBQUtJLE9BQUwsQ0FBYTFkLElBQWIsQ0FBa0IsSUFBbEIsQ0FBaEM7QUFDRCxXQUZELE1BRUs7QUFDSCxpQkFBSzBkLE9BQUw7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQ7Ozs7O0FBNURXO0FBQUE7QUFBQSxxQ0FnRUk7QUFDYixhQUFLVixJQUFMLEdBQVksS0FBWjtBQUNBLGFBQUs1aUIsUUFBTCxDQUFjNlUsR0FBZCxDQUFrQjtBQUNoQiwyQkFBaUIsS0FBS2dPLFlBQUwsQ0FBa0JHLG9CQURuQjtBQUVoQixpQ0FBdUIsS0FBS0gsWUFBTCxDQUFrQkM7QUFGekIsU0FBbEI7QUFJRDs7QUFFRDs7Ozs7QUF4RVc7QUFBQTtBQUFBLGtDQTRFQ3JnQixDQTVFRCxFQTRFSTtBQUNiLGFBQUs2Z0IsT0FBTDtBQUNEOztBQUVEOzs7OztBQWhGVztBQUFBO0FBQUEsdUNBb0ZNN2dCLENBcEZOLEVBb0ZTO0FBQ2xCLFlBQUdBLEVBQUU3RixNQUFGLEtBQWEsS0FBS29ELFFBQUwsQ0FBYyxDQUFkLENBQWhCLEVBQWlDO0FBQUUsZUFBS3NqQixPQUFMO0FBQWlCO0FBQ3JEOztBQUVEOzs7OztBQXhGVztBQUFBO0FBQUEsZ0NBNEZEO0FBQ1IsWUFBSTFpQixRQUFRLElBQVo7QUFDQSxhQUFLMmlCLFlBQUw7QUFDQSxZQUFHLEtBQUtiLFNBQVIsRUFBa0I7QUFDaEIsZUFBSzFpQixRQUFMLENBQWNtTSxFQUFkLENBQWlCLDRCQUFqQixFQUErQyxLQUFLMFcsWUFBTCxDQUFrQkcsb0JBQWpFO0FBQ0QsU0FGRCxNQUVLO0FBQ0gsZUFBS2hqQixRQUFMLENBQWNtTSxFQUFkLENBQWlCLHFCQUFqQixFQUF3QyxLQUFLMFcsWUFBTCxDQUFrQkMsZUFBMUQ7QUFDRDtBQUNELGFBQUtGLElBQUwsR0FBWSxJQUFaO0FBQ0Q7O0FBRUQ7Ozs7O0FBdkdXO0FBQUE7QUFBQSxpQ0EyR0E7QUFDVCxZQUFJTyxXQUFXLENBQUNwa0IsV0FBV3NGLFVBQVgsQ0FBc0J1SCxPQUF0QixDQUE4QixLQUFLc0UsT0FBTCxDQUFha1QsVUFBM0MsQ0FBaEI7QUFDQSxZQUFHRCxRQUFILEVBQVk7QUFDVixjQUFHLEtBQUtQLElBQVIsRUFBYTtBQUNYLGlCQUFLVyxZQUFMO0FBQ0EsaUJBQUtkLFFBQUwsQ0FBY25YLEdBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsTUFBNUI7QUFDRDtBQUNGLFNBTEQsTUFLSztBQUNILGNBQUcsQ0FBQyxLQUFLc1gsSUFBVCxFQUFjO0FBQ1osaUJBQUsxTSxPQUFMO0FBQ0Q7QUFDRjtBQUNELGVBQU9pTixRQUFQO0FBQ0Q7O0FBRUQ7Ozs7O0FBMUhXO0FBQUE7QUFBQSxvQ0E4SEc7QUFDWjtBQUNEOztBQUVEOzs7OztBQWxJVztBQUFBO0FBQUEsZ0NBc0lEO0FBQ1IsWUFBRyxDQUFDLEtBQUtqVCxPQUFMLENBQWFzVCxlQUFqQixFQUFpQztBQUMvQixjQUFHLEtBQUtDLFVBQUwsRUFBSCxFQUFxQjtBQUNuQixpQkFBS2hCLFFBQUwsQ0FBY25YLEdBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsTUFBNUI7QUFDQSxtQkFBTyxLQUFQO0FBQ0Q7QUFDRjtBQUNELFlBQUksS0FBSzRFLE9BQUwsQ0FBYXdULGFBQWpCLEVBQWdDO0FBQzlCLGVBQUtDLGVBQUwsQ0FBcUIsS0FBS0MsZ0JBQUwsQ0FBc0JoZSxJQUF0QixDQUEyQixJQUEzQixDQUFyQjtBQUNELFNBRkQsTUFFSztBQUNILGVBQUtpZSxVQUFMLENBQWdCLEtBQUtDLFdBQUwsQ0FBaUJsZSxJQUFqQixDQUFzQixJQUF0QixDQUFoQjtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7O0FBcEpXO0FBQUE7QUFBQSxtQ0F3SkU7QUFDWCxlQUFPLEtBQUs2YyxRQUFMLENBQWMsQ0FBZCxFQUFpQnphLHFCQUFqQixHQUF5Q1osR0FBekMsS0FBaUQsS0FBS3FiLFFBQUwsQ0FBYyxDQUFkLEVBQWlCemEscUJBQWpCLEdBQXlDWixHQUFqRztBQUNEOztBQUVEOzs7Ozs7QUE1Slc7QUFBQTtBQUFBLGlDQWlLQTZHLEVBaktBLEVBaUtJO0FBQ2IsWUFBSThWLFVBQVUsRUFBZDtBQUNBLGFBQUksSUFBSS9oQixJQUFJLENBQVIsRUFBV2dpQixNQUFNLEtBQUt2QixRQUFMLENBQWNuaEIsTUFBbkMsRUFBMkNVLElBQUlnaUIsR0FBL0MsRUFBb0RoaUIsR0FBcEQsRUFBd0Q7QUFDdEQsZUFBS3lnQixRQUFMLENBQWN6Z0IsQ0FBZCxFQUFpQnFCLEtBQWpCLENBQXVCcUUsTUFBdkIsR0FBZ0MsTUFBaEM7QUFDQXFjLGtCQUFRdm1CLElBQVIsQ0FBYSxLQUFLaWxCLFFBQUwsQ0FBY3pnQixDQUFkLEVBQWlCaWlCLFlBQTlCO0FBQ0Q7QUFDRGhXLFdBQUc4VixPQUFIO0FBQ0Q7O0FBRUQ7Ozs7OztBQTFLVztBQUFBO0FBQUEsc0NBK0tLOVYsRUEvS0wsRUErS1M7QUFDbEIsWUFBSWlXLGtCQUFtQixLQUFLekIsUUFBTCxDQUFjbmhCLE1BQWQsR0FBdUIsS0FBS21oQixRQUFMLENBQWN6UCxLQUFkLEdBQXNCdkwsTUFBdEIsR0FBK0JMLEdBQXRELEdBQTRELENBQW5GO0FBQUEsWUFDSStjLFNBQVMsRUFEYjtBQUFBLFlBRUlDLFFBQVEsQ0FGWjtBQUdBO0FBQ0FELGVBQU9DLEtBQVAsSUFBZ0IsRUFBaEI7QUFDQSxhQUFJLElBQUlwaUIsSUFBSSxDQUFSLEVBQVdnaUIsTUFBTSxLQUFLdkIsUUFBTCxDQUFjbmhCLE1BQW5DLEVBQTJDVSxJQUFJZ2lCLEdBQS9DLEVBQW9EaGlCLEdBQXBELEVBQXdEO0FBQ3RELGVBQUt5Z0IsUUFBTCxDQUFjemdCLENBQWQsRUFBaUJxQixLQUFqQixDQUF1QnFFLE1BQXZCLEdBQWdDLE1BQWhDO0FBQ0E7QUFDQSxjQUFJMmMsY0FBY3hsQixFQUFFLEtBQUs0akIsUUFBTCxDQUFjemdCLENBQWQsQ0FBRixFQUFvQnlGLE1BQXBCLEdBQTZCTCxHQUEvQztBQUNBLGNBQUlpZCxlQUFhSCxlQUFqQixFQUFrQztBQUNoQ0U7QUFDQUQsbUJBQU9DLEtBQVAsSUFBZ0IsRUFBaEI7QUFDQUYsOEJBQWdCRyxXQUFoQjtBQUNEO0FBQ0RGLGlCQUFPQyxLQUFQLEVBQWM1bUIsSUFBZCxDQUFtQixDQUFDLEtBQUtpbEIsUUFBTCxDQUFjemdCLENBQWQsQ0FBRCxFQUFrQixLQUFLeWdCLFFBQUwsQ0FBY3pnQixDQUFkLEVBQWlCaWlCLFlBQW5DLENBQW5CO0FBQ0Q7O0FBRUQsYUFBSyxJQUFJSyxJQUFJLENBQVIsRUFBV0MsS0FBS0osT0FBTzdpQixNQUE1QixFQUFvQ2dqQixJQUFJQyxFQUF4QyxFQUE0Q0QsR0FBNUMsRUFBaUQ7QUFDL0MsY0FBSVAsVUFBVWxsQixFQUFFc2xCLE9BQU9HLENBQVAsQ0FBRixFQUFhM2hCLEdBQWIsQ0FBaUIsWUFBVTtBQUFFLG1CQUFPLEtBQUssQ0FBTCxDQUFQO0FBQWlCLFdBQTlDLEVBQWdEb0osR0FBaEQsRUFBZDtBQUNBLGNBQUl2RyxNQUFjaEUsS0FBS2dFLEdBQUwsQ0FBUzFCLEtBQVQsQ0FBZSxJQUFmLEVBQXFCaWdCLE9BQXJCLENBQWxCO0FBQ0FJLGlCQUFPRyxDQUFQLEVBQVU5bUIsSUFBVixDQUFlZ0ksR0FBZjtBQUNEO0FBQ0R5SSxXQUFHa1csTUFBSDtBQUNEOztBQUVEOzs7Ozs7O0FBek1XO0FBQUE7QUFBQSxrQ0ErTUNKLE9BL01ELEVBK01VO0FBQ25CLFlBQUl2ZSxNQUFNaEUsS0FBS2dFLEdBQUwsQ0FBUzFCLEtBQVQsQ0FBZSxJQUFmLEVBQXFCaWdCLE9BQXJCLENBQVY7QUFDQTs7OztBQUlBLGFBQUsvakIsUUFBTCxDQUFjRSxPQUFkLENBQXNCLDJCQUF0Qjs7QUFFQSxhQUFLdWlCLFFBQUwsQ0FBY25YLEdBQWQsQ0FBa0IsUUFBbEIsRUFBNEI5RixHQUE1Qjs7QUFFQTs7OztBQUlDLGFBQUt4RixRQUFMLENBQWNFLE9BQWQsQ0FBc0IsNEJBQXRCO0FBQ0Y7O0FBRUQ7Ozs7Ozs7OztBQWhPVztBQUFBO0FBQUEsdUNBd09NaWtCLE1BeE9OLEVBd09jO0FBQ3ZCOzs7QUFHQSxhQUFLbmtCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQiwyQkFBdEI7QUFDQSxhQUFLLElBQUk4QixJQUFJLENBQVIsRUFBV2dpQixNQUFNRyxPQUFPN2lCLE1BQTdCLEVBQXFDVSxJQUFJZ2lCLEdBQXpDLEVBQStDaGlCLEdBQS9DLEVBQW9EO0FBQ2xELGNBQUl3aUIsZ0JBQWdCTCxPQUFPbmlCLENBQVAsRUFBVVYsTUFBOUI7QUFBQSxjQUNJa0UsTUFBTTJlLE9BQU9uaUIsQ0FBUCxFQUFVd2lCLGdCQUFnQixDQUExQixDQURWO0FBRUEsY0FBSUEsaUJBQWUsQ0FBbkIsRUFBc0I7QUFDcEIzbEIsY0FBRXNsQixPQUFPbmlCLENBQVAsRUFBVSxDQUFWLEVBQWEsQ0FBYixDQUFGLEVBQW1Cc0osR0FBbkIsQ0FBdUIsRUFBQyxVQUFTLE1BQVYsRUFBdkI7QUFDQTtBQUNEO0FBQ0Q7Ozs7QUFJQSxlQUFLdEwsUUFBTCxDQUFjRSxPQUFkLENBQXNCLDhCQUF0QjtBQUNBLGVBQUssSUFBSW9rQixJQUFJLENBQVIsRUFBV0csT0FBUUQsZ0JBQWMsQ0FBdEMsRUFBMENGLElBQUlHLElBQTlDLEVBQXFESCxHQUFyRCxFQUEwRDtBQUN4RHpsQixjQUFFc2xCLE9BQU9uaUIsQ0FBUCxFQUFVc2lCLENBQVYsRUFBYSxDQUFiLENBQUYsRUFBbUJoWixHQUFuQixDQUF1QixFQUFDLFVBQVM5RixHQUFWLEVBQXZCO0FBQ0Q7QUFDRDs7OztBQUlBLGVBQUt4RixRQUFMLENBQWNFLE9BQWQsQ0FBc0IsK0JBQXRCO0FBQ0Q7QUFDRDs7O0FBR0MsYUFBS0YsUUFBTCxDQUFjRSxPQUFkLENBQXNCLDRCQUF0QjtBQUNGOztBQUVEOzs7OztBQXhRVztBQUFBO0FBQUEsZ0NBNFFEO0FBQ1IsYUFBS3FqQixZQUFMO0FBQ0EsYUFBS2QsUUFBTCxDQUFjblgsR0FBZCxDQUFrQixRQUFsQixFQUE0QixNQUE1Qjs7QUFFQXZNLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQWpSVTs7QUFBQTtBQUFBOztBQW9SYjs7Ozs7QUFHQW9pQixZQUFVdk0sUUFBVixHQUFxQjtBQUNuQjs7Ozs7QUFLQXdOLHFCQUFpQixJQU5FO0FBT25COzs7OztBQUtBRSxtQkFBZSxLQVpJO0FBYW5COzs7OztBQUtBTixnQkFBWTtBQWxCTyxHQUFyQjs7QUFxQkE7QUFDQXJrQixhQUFXTSxNQUFYLENBQWtCa2pCLFNBQWxCLEVBQTZCLFdBQTdCO0FBRUMsQ0EvU0EsQ0ErU0M3YixNQS9TRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7OztBQUZhLE1BU1A2bEIsV0FUTztBQVVYOzs7Ozs7O0FBT0EseUJBQVkzZCxPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYXdhLFlBQVkxTyxRQUF6QixFQUFtQzlGLE9BQW5DLENBQWY7QUFDQSxXQUFLeVUsS0FBTCxHQUFhLEVBQWI7QUFDQSxXQUFLQyxXQUFMLEdBQW1CLEVBQW5COztBQUVBLFdBQUtqa0IsS0FBTDtBQUNBLFdBQUt1VixPQUFMOztBQUVBblgsaUJBQVdZLGNBQVgsQ0FBMEIsSUFBMUIsRUFBZ0MsYUFBaEM7QUFDRDs7QUFFRDs7Ozs7OztBQTdCVztBQUFBO0FBQUEsOEJBa0NIO0FBQ04sYUFBS2tsQixlQUFMO0FBQ0EsYUFBS0MsY0FBTDtBQUNBLGFBQUt4QixPQUFMO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhDVztBQUFBO0FBQUEsZ0NBNkNEO0FBQ1J6a0IsVUFBRTlELE1BQUYsRUFBVW9SLEVBQVYsQ0FBYSx1QkFBYixFQUFzQ3BOLFdBQVd3RSxJQUFYLENBQWdCQyxRQUFoQixDQUF5QixLQUFLOGYsT0FBTCxDQUFhMWQsSUFBYixDQUFrQixJQUFsQixDQUF6QixFQUFrRCxFQUFsRCxDQUF0QztBQUNEOztBQUVEOzs7Ozs7QUFqRFc7QUFBQTtBQUFBLGdDQXNERDtBQUNSLFlBQUk2WixLQUFKOztBQUVBO0FBQ0EsYUFBSyxJQUFJemQsQ0FBVCxJQUFjLEtBQUsyaUIsS0FBbkIsRUFBMEI7QUFDeEIsY0FBRyxLQUFLQSxLQUFMLENBQVdsWixjQUFYLENBQTBCekosQ0FBMUIsQ0FBSCxFQUFpQztBQUMvQixnQkFBSStpQixPQUFPLEtBQUtKLEtBQUwsQ0FBVzNpQixDQUFYLENBQVg7O0FBRUEsZ0JBQUlqSCxPQUFPaVIsVUFBUCxDQUFrQitZLEtBQUtqWixLQUF2QixFQUE4QkcsT0FBbEMsRUFBMkM7QUFDekN3VCxzQkFBUXNGLElBQVI7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsWUFBSXRGLEtBQUosRUFBVztBQUNULGVBQUtoWixPQUFMLENBQWFnWixNQUFNdUYsSUFBbkI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7QUF6RVc7QUFBQTtBQUFBLHdDQThFTztBQUNoQixhQUFLLElBQUloakIsQ0FBVCxJQUFjakQsV0FBV3NGLFVBQVgsQ0FBc0I2RyxPQUFwQyxFQUE2QztBQUMzQyxjQUFJbk0sV0FBV3NGLFVBQVgsQ0FBc0I2RyxPQUF0QixDQUE4Qk8sY0FBOUIsQ0FBNkN6SixDQUE3QyxDQUFKLEVBQXFEO0FBQ25ELGdCQUFJOEosUUFBUS9NLFdBQVdzRixVQUFYLENBQXNCNkcsT0FBdEIsQ0FBOEJsSixDQUE5QixDQUFaO0FBQ0EwaUIsd0JBQVlPLGVBQVosQ0FBNEJuWixNQUFNeE0sSUFBbEMsSUFBMEN3TSxNQUFNdFAsS0FBaEQ7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQ7Ozs7Ozs7O0FBdkZXO0FBQUE7QUFBQSxxQ0E4Rkl1SyxPQTlGSixFQThGYTtBQUN0QixZQUFJbWUsWUFBWSxFQUFoQjtBQUNBLFlBQUlQLEtBQUo7O0FBRUEsWUFBSSxLQUFLelUsT0FBTCxDQUFheVUsS0FBakIsRUFBd0I7QUFDdEJBLGtCQUFRLEtBQUt6VSxPQUFMLENBQWF5VSxLQUFyQjtBQUNELFNBRkQsTUFHSztBQUNIQSxrQkFBUSxLQUFLM2tCLFFBQUwsQ0FBY0MsSUFBZCxDQUFtQixhQUFuQixFQUFrQ3dmLEtBQWxDLENBQXdDLFVBQXhDLENBQVI7QUFDRDs7QUFFRCxhQUFLLElBQUl6ZCxDQUFULElBQWMyaUIsS0FBZCxFQUFxQjtBQUNuQixjQUFHQSxNQUFNbFosY0FBTixDQUFxQnpKLENBQXJCLENBQUgsRUFBNEI7QUFDMUIsZ0JBQUkraUIsT0FBT0osTUFBTTNpQixDQUFOLEVBQVNILEtBQVQsQ0FBZSxDQUFmLEVBQWtCLENBQUMsQ0FBbkIsRUFBc0JXLEtBQXRCLENBQTRCLElBQTVCLENBQVg7QUFDQSxnQkFBSXdpQixPQUFPRCxLQUFLbGpCLEtBQUwsQ0FBVyxDQUFYLEVBQWMsQ0FBQyxDQUFmLEVBQWtCK1MsSUFBbEIsQ0FBdUIsRUFBdkIsQ0FBWDtBQUNBLGdCQUFJOUksUUFBUWlaLEtBQUtBLEtBQUt6akIsTUFBTCxHQUFjLENBQW5CLENBQVo7O0FBRUEsZ0JBQUlvakIsWUFBWU8sZUFBWixDQUE0Qm5aLEtBQTVCLENBQUosRUFBd0M7QUFDdENBLHNCQUFRNFksWUFBWU8sZUFBWixDQUE0Qm5aLEtBQTVCLENBQVI7QUFDRDs7QUFFRG9aLHNCQUFVMW5CLElBQVYsQ0FBZTtBQUNid25CLG9CQUFNQSxJQURPO0FBRWJsWixxQkFBT0E7QUFGTSxhQUFmO0FBSUQ7QUFDRjs7QUFFRCxhQUFLNlksS0FBTCxHQUFhTyxTQUFiO0FBQ0Q7O0FBRUQ7Ozs7Ozs7QUE3SFc7QUFBQTtBQUFBLDhCQW1JSEYsSUFuSUcsRUFtSUc7QUFDWixZQUFJLEtBQUtKLFdBQUwsS0FBcUJJLElBQXpCLEVBQStCOztBQUUvQixZQUFJcGtCLFFBQVEsSUFBWjtBQUFBLFlBQ0lWLFVBQVUseUJBRGQ7O0FBR0E7QUFDQSxZQUFJLEtBQUtGLFFBQUwsQ0FBYyxDQUFkLEVBQWlCbEQsUUFBakIsS0FBOEIsS0FBbEMsRUFBeUM7QUFDdkMsZUFBS2tELFFBQUwsQ0FBY1osSUFBZCxDQUFtQixLQUFuQixFQUEwQjRsQixJQUExQixFQUFnQzdRLElBQWhDLENBQXFDLFlBQVc7QUFDOUN2VCxrQkFBTWdrQixXQUFOLEdBQW9CSSxJQUFwQjtBQUNELFdBRkQsRUFHQzlrQixPQUhELENBR1NBLE9BSFQ7QUFJRDtBQUNEO0FBTkEsYUFPSyxJQUFJOGtCLEtBQUt2RixLQUFMLENBQVcseUNBQVgsQ0FBSixFQUEyRDtBQUM5RCxpQkFBS3pmLFFBQUwsQ0FBY3NMLEdBQWQsQ0FBa0IsRUFBRSxvQkFBb0IsU0FBTzBaLElBQVAsR0FBWSxHQUFsQyxFQUFsQixFQUNLOWtCLE9BREwsQ0FDYUEsT0FEYjtBQUVEO0FBQ0Q7QUFKSyxlQUtBO0FBQ0hyQixnQkFBRWtOLEdBQUYsQ0FBTWlaLElBQU4sRUFBWSxVQUFTRyxRQUFULEVBQW1CO0FBQzdCdmtCLHNCQUFNWixRQUFOLENBQWVvbEIsSUFBZixDQUFvQkQsUUFBcEIsRUFDTWpsQixPQUROLENBQ2NBLE9BRGQ7QUFFQXJCLGtCQUFFc21CLFFBQUYsRUFBWWxrQixVQUFaO0FBQ0FMLHNCQUFNZ2tCLFdBQU4sR0FBb0JJLElBQXBCO0FBQ0QsZUFMRDtBQU1EOztBQUVEOzs7O0FBSUE7QUFDRDs7QUFFRDs7Ozs7QUF0S1c7QUFBQTtBQUFBLGdDQTBLRDtBQUNSO0FBQ0Q7QUE1S1U7O0FBQUE7QUFBQTs7QUErS2I7Ozs7O0FBR0FOLGNBQVkxTyxRQUFaLEdBQXVCO0FBQ3JCOzs7O0FBSUEyTyxXQUFPO0FBTGMsR0FBdkI7O0FBUUFELGNBQVlPLGVBQVosR0FBOEI7QUFDNUIsaUJBQWEscUNBRGU7QUFFNUIsZ0JBQVksb0NBRmdCO0FBRzVCLGNBQVU7QUFIa0IsR0FBOUI7O0FBTUE7QUFDQWxtQixhQUFXTSxNQUFYLENBQWtCcWxCLFdBQWxCLEVBQStCLGFBQS9CO0FBRUMsQ0FuTUEsQ0FtTUNoZSxNQW5NRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7QUFGYSxNQU9Qd21CLFFBUE87QUFRWDs7Ozs7OztBQU9BLHNCQUFZdGUsT0FBWixFQUFxQm1KLE9BQXJCLEVBQThCO0FBQUE7O0FBQzVCLFdBQUtsUSxRQUFMLEdBQWdCK0csT0FBaEI7QUFDQSxXQUFLbUosT0FBTCxHQUFnQnJSLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFhbWIsU0FBU3JQLFFBQXRCLEVBQWdDLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBaEMsRUFBc0RpUSxPQUF0RCxDQUFoQjs7QUFFQSxXQUFLdlAsS0FBTDs7QUFFQTVCLGlCQUFXWSxjQUFYLENBQTBCLElBQTFCLEVBQWdDLFVBQWhDO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhCVztBQUFBO0FBQUEsOEJBNEJIO0FBQ04sWUFBSWdOLEtBQUssS0FBSzNNLFFBQUwsQ0FBYyxDQUFkLEVBQWlCMk0sRUFBakIsSUFBdUI1TixXQUFXZ0IsV0FBWCxDQUF1QixDQUF2QixFQUEwQixVQUExQixDQUFoQztBQUNBLFlBQUlhLFFBQVEsSUFBWjtBQUNBLGFBQUswa0IsUUFBTCxHQUFnQnptQixFQUFFLHdCQUFGLENBQWhCO0FBQ0EsYUFBSzBtQixNQUFMLEdBQWMsS0FBS3ZsQixRQUFMLENBQWNrQyxJQUFkLENBQW1CLEdBQW5CLENBQWQ7QUFDQSxhQUFLbEMsUUFBTCxDQUFjWixJQUFkLENBQW1CO0FBQ2pCLHlCQUFldU4sRUFERTtBQUVqQix5QkFBZUEsRUFGRTtBQUdqQixnQkFBTUE7QUFIVyxTQUFuQjtBQUtBLGFBQUs2WSxPQUFMLEdBQWUzbUIsR0FBZjtBQUNBLGFBQUs0bUIsU0FBTCxHQUFpQkMsU0FBUzNxQixPQUFPc04sV0FBaEIsRUFBNkIsRUFBN0IsQ0FBakI7O0FBRUEsYUFBSzZOLE9BQUw7QUFDRDs7QUFFRDs7Ozs7O0FBNUNXO0FBQUE7QUFBQSxtQ0FpREU7QUFDWCxZQUFJdFYsUUFBUSxJQUFaO0FBQUEsWUFDSTFGLE9BQU84QyxTQUFTOUMsSUFEcEI7QUFBQSxZQUVJa3FCLE9BQU9wbkIsU0FBU2lULGVBRnBCOztBQUlBLGFBQUswVSxNQUFMLEdBQWMsRUFBZDtBQUNBLGFBQUtDLFNBQUwsR0FBaUJwa0IsS0FBS0MsS0FBTCxDQUFXRCxLQUFLZ0UsR0FBTCxDQUFTekssT0FBTzhxQixXQUFoQixFQUE2QlQsS0FBS1UsWUFBbEMsQ0FBWCxDQUFqQjtBQUNBLGFBQUtDLFNBQUwsR0FBaUJ2a0IsS0FBS0MsS0FBTCxDQUFXRCxLQUFLZ0UsR0FBTCxDQUFTdEssS0FBSzhxQixZQUFkLEVBQTRCOXFCLEtBQUsrb0IsWUFBakMsRUFBK0NtQixLQUFLVSxZQUFwRCxFQUFrRVYsS0FBS1ksWUFBdkUsRUFBcUZaLEtBQUtuQixZQUExRixDQUFYLENBQWpCOztBQUVBLGFBQUtxQixRQUFMLENBQWM1a0IsSUFBZCxDQUFtQixZQUFVO0FBQzNCLGNBQUl1bEIsT0FBT3BuQixFQUFFLElBQUYsQ0FBWDtBQUFBLGNBQ0lxbkIsS0FBSzFrQixLQUFLQyxLQUFMLENBQVd3a0IsS0FBS3hlLE1BQUwsR0FBY0wsR0FBZCxHQUFvQnhHLE1BQU1zUCxPQUFOLENBQWNpVyxTQUE3QyxDQURUO0FBRUFGLGVBQUtHLFdBQUwsR0FBbUJGLEVBQW5CO0FBQ0F0bEIsZ0JBQU0ra0IsTUFBTixDQUFhbm9CLElBQWIsQ0FBa0Iwb0IsRUFBbEI7QUFDRCxTQUxEO0FBTUQ7O0FBRUQ7Ozs7O0FBbEVXO0FBQUE7QUFBQSxnQ0FzRUQ7QUFDUixZQUFJdGxCLFFBQVEsSUFBWjtBQUFBLFlBQ0k0ZCxRQUFRM2YsRUFBRSxZQUFGLENBRFo7QUFBQSxZQUVJd0QsT0FBTztBQUNMZ00sb0JBQVV6TixNQUFNc1AsT0FBTixDQUFjbVcsaUJBRG5CO0FBRUxDLGtCQUFVMWxCLE1BQU1zUCxPQUFOLENBQWNxVztBQUZuQixTQUZYO0FBTUExbkIsVUFBRTlELE1BQUYsRUFBVW1VLEdBQVYsQ0FBYyxNQUFkLEVBQXNCLFlBQVU7QUFDOUIsY0FBR3RPLE1BQU1zUCxPQUFOLENBQWNzVyxXQUFqQixFQUE2QjtBQUMzQixnQkFBR0MsU0FBU0MsSUFBWixFQUFpQjtBQUNmOWxCLG9CQUFNK2xCLFdBQU4sQ0FBa0JGLFNBQVNDLElBQTNCO0FBQ0Q7QUFDRjtBQUNEOWxCLGdCQUFNZ21CLFVBQU47QUFDQWhtQixnQkFBTWltQixhQUFOO0FBQ0QsU0FSRDs7QUFVQSxhQUFLN21CLFFBQUwsQ0FBY21NLEVBQWQsQ0FBaUI7QUFDZixpQ0FBdUIsS0FBS3JLLE1BQUwsQ0FBWThELElBQVosQ0FBaUIsSUFBakIsQ0FEUjtBQUVmLGlDQUF1QixLQUFLaWhCLGFBQUwsQ0FBbUJqaEIsSUFBbkIsQ0FBd0IsSUFBeEI7QUFGUixTQUFqQixFQUdHdUcsRUFISCxDQUdNLG1CQUhOLEVBRzJCLGNBSDNCLEVBRzJDLFVBQVMxSixDQUFULEVBQVk7QUFDbkRBLFlBQUV5TyxjQUFGO0FBQ0EsY0FBSTRWLFVBQVksS0FBSzdwQixZQUFMLENBQWtCLE1BQWxCLENBQWhCO0FBQ0EyRCxnQkFBTStsQixXQUFOLENBQWtCRyxPQUFsQjtBQUNILFNBUEQ7QUFRRDs7QUFFRDs7Ozs7O0FBakdXO0FBQUE7QUFBQSxrQ0FzR0NDLEdBdEdELEVBc0dNO0FBQ2YsWUFBSXRCLFlBQVlqa0IsS0FBS0MsS0FBTCxDQUFXNUMsRUFBRWtvQixHQUFGLEVBQU90ZixNQUFQLEdBQWdCTCxHQUFoQixHQUFzQixLQUFLOEksT0FBTCxDQUFhaVcsU0FBYixHQUF5QixDQUEvQyxHQUFtRCxLQUFLalcsT0FBTCxDQUFhOFcsU0FBM0UsQ0FBaEI7O0FBRUFub0IsVUFBRSxZQUFGLEVBQWdCaWQsSUFBaEIsQ0FBcUIsSUFBckIsRUFBMkI1TixPQUEzQixDQUFtQyxFQUFFK1ksV0FBV3hCLFNBQWIsRUFBbkMsRUFBNkQsS0FBS3ZWLE9BQUwsQ0FBYW1XLGlCQUExRSxFQUE2RixLQUFLblcsT0FBTCxDQUFhcVcsZUFBMUc7QUFDRDs7QUFFRDs7Ozs7QUE1R1c7QUFBQTtBQUFBLCtCQWdIRjtBQUNQLGFBQUtLLFVBQUw7QUFDQSxhQUFLQyxhQUFMO0FBQ0Q7O0FBRUQ7Ozs7Ozs7QUFySFc7QUFBQTtBQUFBLHNDQTJIRyx3QkFBMEI7QUFDdEMsWUFBSUssU0FBUyxnQkFBaUJ4QixTQUFTM3FCLE9BQU9zTixXQUFoQixFQUE2QixFQUE3QixDQUE5QjtBQUFBLFlBQ0k4ZSxNQURKOztBQUdBLFlBQUdELFNBQVMsS0FBS3RCLFNBQWQsS0FBNEIsS0FBS0csU0FBcEMsRUFBOEM7QUFBRW9CLG1CQUFTLEtBQUt4QixNQUFMLENBQVlya0IsTUFBWixHQUFxQixDQUE5QjtBQUFrQyxTQUFsRixNQUNLLElBQUc0bEIsU0FBUyxLQUFLdkIsTUFBTCxDQUFZLENBQVosQ0FBWixFQUEyQjtBQUFFd0IsbUJBQVMsQ0FBVDtBQUFhLFNBQTFDLE1BQ0Q7QUFDRixjQUFJQyxTQUFTLEtBQUszQixTQUFMLEdBQWlCeUIsTUFBOUI7QUFBQSxjQUNJdG1CLFFBQVEsSUFEWjtBQUFBLGNBRUl5bUIsYUFBYSxLQUFLMUIsTUFBTCxDQUFZcGIsTUFBWixDQUFtQixVQUFTdkosQ0FBVCxFQUFZZ0IsQ0FBWixFQUFjO0FBQzVDLG1CQUFPb2xCLFNBQVNwbUIsSUFBSUosTUFBTXNQLE9BQU4sQ0FBYzhXLFNBQWxCLElBQStCRSxNQUF4QyxHQUFpRGxtQixJQUFJSixNQUFNc1AsT0FBTixDQUFjOFcsU0FBbEIsR0FBOEJwbUIsTUFBTXNQLE9BQU4sQ0FBY2lXLFNBQTVDLElBQXlEZSxNQUFqSDtBQUNELFdBRlksQ0FGakI7QUFLQUMsbUJBQVNFLFdBQVcvbEIsTUFBWCxHQUFvQitsQixXQUFXL2xCLE1BQVgsR0FBb0IsQ0FBeEMsR0FBNEMsQ0FBckQ7QUFDRDs7QUFFRCxhQUFLa2tCLE9BQUwsQ0FBYXBoQixXQUFiLENBQXlCLEtBQUs4TCxPQUFMLENBQWFyQixXQUF0QztBQUNBLGFBQUsyVyxPQUFMLEdBQWUsS0FBS0QsTUFBTCxDQUFZNVcsRUFBWixDQUFld1ksTUFBZixFQUF1QnBZLFFBQXZCLENBQWdDLEtBQUttQixPQUFMLENBQWFyQixXQUE3QyxDQUFmOztBQUVBLFlBQUcsS0FBS3FCLE9BQUwsQ0FBYXNXLFdBQWhCLEVBQTRCO0FBQzFCLGNBQUlFLE9BQU8sS0FBS2xCLE9BQUwsQ0FBYSxDQUFiLEVBQWdCdm9CLFlBQWhCLENBQTZCLE1BQTdCLENBQVg7QUFDQSxjQUFHbEMsT0FBT3VzQixPQUFQLENBQWVDLFNBQWxCLEVBQTRCO0FBQzFCeHNCLG1CQUFPdXNCLE9BQVAsQ0FBZUMsU0FBZixDQUF5QixJQUF6QixFQUErQixJQUEvQixFQUFxQ2IsSUFBckM7QUFDRCxXQUZELE1BRUs7QUFDSDNyQixtQkFBTzByQixRQUFQLENBQWdCQyxJQUFoQixHQUF1QkEsSUFBdkI7QUFDRDtBQUNGOztBQUVELGFBQUtqQixTQUFMLEdBQWlCeUIsTUFBakI7QUFDQTs7OztBQUlBLGFBQUtsbkIsUUFBTCxDQUFjRSxPQUFkLENBQXNCLG9CQUF0QixFQUE0QyxDQUFDLEtBQUtzbEIsT0FBTixDQUE1QztBQUNEOztBQUVEOzs7OztBQTlKVztBQUFBO0FBQUEsZ0NBa0tEO0FBQ1IsYUFBS3hsQixRQUFMLENBQWM2VSxHQUFkLENBQWtCLDBCQUFsQixFQUNLM1MsSUFETCxPQUNjLEtBQUtnTyxPQUFMLENBQWFyQixXQUQzQixFQUMwQ3pLLFdBRDFDLENBQ3NELEtBQUs4TCxPQUFMLENBQWFyQixXQURuRTs7QUFHQSxZQUFHLEtBQUtxQixPQUFMLENBQWFzVyxXQUFoQixFQUE0QjtBQUMxQixjQUFJRSxPQUFPLEtBQUtsQixPQUFMLENBQWEsQ0FBYixFQUFnQnZvQixZQUFoQixDQUE2QixNQUE3QixDQUFYO0FBQ0FsQyxpQkFBTzByQixRQUFQLENBQWdCQyxJQUFoQixDQUFxQmpnQixPQUFyQixDQUE2QmlnQixJQUE3QixFQUFtQyxFQUFuQztBQUNEOztBQUVEM25CLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQTVLVTs7QUFBQTtBQUFBOztBQStLYjs7Ozs7QUFHQWtsQixXQUFTclAsUUFBVCxHQUFvQjtBQUNsQjs7Ozs7QUFLQXFRLHVCQUFtQixHQU5EO0FBT2xCOzs7OztBQUtBRSxxQkFBaUIsUUFaQztBQWFsQjs7Ozs7QUFLQUosZUFBVyxFQWxCTztBQW1CbEI7Ozs7O0FBS0F0WCxpQkFBYSxRQXhCSztBQXlCbEI7Ozs7O0FBS0EyWCxpQkFBYSxLQTlCSztBQStCbEI7Ozs7O0FBS0FRLGVBQVc7QUFwQ08sR0FBcEI7O0FBdUNBO0FBQ0Fqb0IsYUFBV00sTUFBWCxDQUFrQmdtQixRQUFsQixFQUE0QixVQUE1QjtBQUVDLENBNU5BLENBNE5DM2UsTUE1TkQsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7Ozs7OztBQUZhLE1BV1Ayb0IsS0FYTztBQVlYOzs7Ozs7QUFNQSxtQkFBWXpnQixPQUFaLEVBQXFCbUosT0FBckIsRUFBNkI7QUFBQTs7QUFDM0IsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYXNkLE1BQU14UixRQUFuQixFQUE2QixLQUFLaFcsUUFBTCxDQUFjQyxJQUFkLEVBQTdCLEVBQW1EaVEsT0FBbkQsQ0FBZjs7QUFFQSxXQUFLdlAsS0FBTDs7QUFFQTVCLGlCQUFXWSxjQUFYLENBQTBCLElBQTFCLEVBQWdDLE9BQWhDO0FBQ0FaLGlCQUFXbUssUUFBWCxDQUFvQnVCLFFBQXBCLENBQTZCLE9BQTdCLEVBQXNDO0FBQ3BDLGVBQU87QUFDTCx5QkFBZSxNQURWO0FBRUwsd0JBQWM7QUFGVCxTQUQ2QjtBQUtwQyxlQUFPO0FBQ0wsd0JBQWMsTUFEVDtBQUVMLHlCQUFlO0FBRlY7QUFMNkIsT0FBdEM7QUFVRDs7QUFFRDs7Ozs7OztBQXJDVztBQUFBO0FBQUEsOEJBMENIO0FBQ04sYUFBSzBULFFBQUwsR0FBZ0IsS0FBS25lLFFBQUwsQ0FBY2tDLElBQWQsT0FBdUIsS0FBS2dPLE9BQUwsQ0FBYXVYLGNBQXBDLENBQWhCO0FBQ0EsYUFBS0MsT0FBTCxHQUFlLEtBQUsxbkIsUUFBTCxDQUFja0MsSUFBZCxPQUF1QixLQUFLZ08sT0FBTCxDQUFheVgsVUFBcEMsQ0FBZjtBQUNBLFlBQUlDLFVBQVUsS0FBSzVuQixRQUFMLENBQWNrQyxJQUFkLENBQW1CLEtBQW5CLENBQWQ7QUFBQSxZQUNBMmxCLGFBQWEsS0FBS0gsT0FBTCxDQUFhbmQsTUFBYixDQUFvQixZQUFwQixDQURiOztBQUdBLFlBQUksQ0FBQ3NkLFdBQVd2bUIsTUFBaEIsRUFBd0I7QUFDdEIsZUFBS29tQixPQUFMLENBQWEvWSxFQUFiLENBQWdCLENBQWhCLEVBQW1CSSxRQUFuQixDQUE0QixXQUE1QjtBQUNEOztBQUVELFlBQUksQ0FBQyxLQUFLbUIsT0FBTCxDQUFhNFgsTUFBbEIsRUFBMEI7QUFDeEIsZUFBS0osT0FBTCxDQUFhM1ksUUFBYixDQUFzQixhQUF0QjtBQUNEOztBQUVELFlBQUk2WSxRQUFRdG1CLE1BQVosRUFBb0I7QUFDbEJ2QyxxQkFBVzBSLGNBQVgsQ0FBMEJtWCxPQUExQixFQUFtQyxLQUFLRyxnQkFBTCxDQUFzQm5pQixJQUF0QixDQUEyQixJQUEzQixDQUFuQztBQUNELFNBRkQsTUFFTztBQUNMLGVBQUttaUIsZ0JBQUwsR0FESyxDQUNtQjtBQUN6Qjs7QUFFRCxZQUFJLEtBQUs3WCxPQUFMLENBQWE4WCxPQUFqQixFQUEwQjtBQUN4QixlQUFLQyxZQUFMO0FBQ0Q7O0FBRUQsYUFBSy9SLE9BQUw7O0FBRUEsWUFBSSxLQUFLaEcsT0FBTCxDQUFhZ1ksUUFBYixJQUF5QixLQUFLUixPQUFMLENBQWFwbUIsTUFBYixHQUFzQixDQUFuRCxFQUFzRDtBQUNwRCxlQUFLNm1CLE9BQUw7QUFDRDs7QUFFRCxZQUFJLEtBQUtqWSxPQUFMLENBQWFrWSxVQUFqQixFQUE2QjtBQUFFO0FBQzdCLGVBQUtqSyxRQUFMLENBQWMvZSxJQUFkLENBQW1CLFVBQW5CLEVBQStCLENBQS9CO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7O0FBN0VXO0FBQUE7QUFBQSxxQ0FrRkk7QUFDYixhQUFLaXBCLFFBQUwsR0FBZ0IsS0FBS3JvQixRQUFMLENBQWNrQyxJQUFkLE9BQXVCLEtBQUtnTyxPQUFMLENBQWFvWSxZQUFwQyxFQUFvRHBtQixJQUFwRCxDQUF5RCxRQUF6RCxDQUFoQjtBQUNEOztBQUVEOzs7OztBQXRGVztBQUFBO0FBQUEsZ0NBMEZEO0FBQ1IsWUFBSXRCLFFBQVEsSUFBWjtBQUNBLGFBQUsvRSxLQUFMLEdBQWEsSUFBSWtELFdBQVdrUixLQUFmLENBQ1gsS0FBS2pRLFFBRE0sRUFFWDtBQUNFcU8sb0JBQVUsS0FBSzZCLE9BQUwsQ0FBYXFZLFVBRHpCO0FBRUVoWSxvQkFBVTtBQUZaLFNBRlcsRUFNWCxZQUFXO0FBQ1QzUCxnQkFBTTRuQixXQUFOLENBQWtCLElBQWxCO0FBQ0QsU0FSVSxDQUFiO0FBU0EsYUFBSzNzQixLQUFMLENBQVc2SixLQUFYO0FBQ0Q7O0FBRUQ7Ozs7OztBQXhHVztBQUFBO0FBQUEseUNBNkdRO0FBQ2pCLFlBQUk5RSxRQUFRLElBQVo7QUFDQSxhQUFLNm5CLGlCQUFMLENBQXVCLFVBQVNqakIsR0FBVCxFQUFhO0FBQ2xDNUUsZ0JBQU04bkIsZUFBTixDQUFzQmxqQixHQUF0QjtBQUNELFNBRkQ7QUFHRDs7QUFFRDs7Ozs7OztBQXBIVztBQUFBO0FBQUEsd0NBMEhPeUksRUExSFAsRUEwSFc7QUFBQztBQUNyQixZQUFJekksTUFBTSxDQUFWO0FBQUEsWUFBYW1qQixJQUFiO0FBQUEsWUFBbUJySixVQUFVLENBQTdCOztBQUVBLGFBQUtvSSxPQUFMLENBQWFobkIsSUFBYixDQUFrQixZQUFXO0FBQzNCaW9CLGlCQUFPLEtBQUszZ0IscUJBQUwsR0FBNkJOLE1BQXBDO0FBQ0E3SSxZQUFFLElBQUYsRUFBUU8sSUFBUixDQUFhLFlBQWIsRUFBMkJrZ0IsT0FBM0I7O0FBRUEsY0FBSUEsT0FBSixFQUFhO0FBQUM7QUFDWnpnQixjQUFFLElBQUYsRUFBUXlNLEdBQVIsQ0FBWSxFQUFDLFlBQVksVUFBYixFQUF5QixXQUFXLE1BQXBDLEVBQVo7QUFDRDtBQUNEOUYsZ0JBQU1takIsT0FBT25qQixHQUFQLEdBQWFtakIsSUFBYixHQUFvQm5qQixHQUExQjtBQUNBOFo7QUFDRCxTQVREOztBQVdBLFlBQUlBLFlBQVksS0FBS29JLE9BQUwsQ0FBYXBtQixNQUE3QixFQUFxQztBQUNuQyxlQUFLNmMsUUFBTCxDQUFjN1MsR0FBZCxDQUFrQixFQUFDLFVBQVU5RixHQUFYLEVBQWxCLEVBRG1DLENBQ0M7QUFDcEN5SSxhQUFHekksR0FBSCxFQUZtQyxDQUUxQjtBQUNWO0FBQ0Y7O0FBRUQ7Ozs7OztBQTlJVztBQUFBO0FBQUEsc0NBbUpLa0MsTUFuSkwsRUFtSmE7QUFDdEIsYUFBS2dnQixPQUFMLENBQWFobkIsSUFBYixDQUFrQixZQUFXO0FBQzNCN0IsWUFBRSxJQUFGLEVBQVF5TSxHQUFSLENBQVksWUFBWixFQUEwQjVELE1BQTFCO0FBQ0QsU0FGRDtBQUdEOztBQUVEOzs7Ozs7QUF6Slc7QUFBQTtBQUFBLGdDQThKRDtBQUNSLFlBQUk5RyxRQUFRLElBQVo7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFJLEtBQUs4bUIsT0FBTCxDQUFhcG1CLE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7O0FBRTNCLGNBQUksS0FBSzRPLE9BQUwsQ0FBYXdDLEtBQWpCLEVBQXdCO0FBQ3RCLGlCQUFLZ1YsT0FBTCxDQUFhN1MsR0FBYixDQUFpQix3Q0FBakIsRUFDQzFJLEVBREQsQ0FDSSxvQkFESixFQUMwQixVQUFTMUosQ0FBVCxFQUFXO0FBQ25DQSxnQkFBRXlPLGNBQUY7QUFDQXRRLG9CQUFNNG5CLFdBQU4sQ0FBa0IsSUFBbEI7QUFDRCxhQUpELEVBSUdyYyxFQUpILENBSU0scUJBSk4sRUFJNkIsVUFBUzFKLENBQVQsRUFBVztBQUN0Q0EsZ0JBQUV5TyxjQUFGO0FBQ0F0USxvQkFBTTRuQixXQUFOLENBQWtCLEtBQWxCO0FBQ0QsYUFQRDtBQVFEO0FBQ0Q7O0FBRUEsY0FBSSxLQUFLdFksT0FBTCxDQUFhZ1ksUUFBakIsRUFBMkI7QUFDekIsaUJBQUtSLE9BQUwsQ0FBYXZiLEVBQWIsQ0FBZ0IsZ0JBQWhCLEVBQWtDLFlBQVc7QUFDM0N2TCxvQkFBTVosUUFBTixDQUFlQyxJQUFmLENBQW9CLFdBQXBCLEVBQWlDVyxNQUFNWixRQUFOLENBQWVDLElBQWYsQ0FBb0IsV0FBcEIsSUFBbUMsS0FBbkMsR0FBMkMsSUFBNUU7QUFDQVcsb0JBQU0vRSxLQUFOLENBQVkrRSxNQUFNWixRQUFOLENBQWVDLElBQWYsQ0FBb0IsV0FBcEIsSUFBbUMsT0FBbkMsR0FBNkMsT0FBekQ7QUFDRCxhQUhEOztBQUtBLGdCQUFJLEtBQUtpUSxPQUFMLENBQWEwWSxZQUFqQixFQUErQjtBQUM3QixtQkFBSzVvQixRQUFMLENBQWNtTSxFQUFkLENBQWlCLHFCQUFqQixFQUF3QyxZQUFXO0FBQ2pEdkwsc0JBQU0vRSxLQUFOLENBQVkyVSxLQUFaO0FBQ0QsZUFGRCxFQUVHckUsRUFGSCxDQUVNLHFCQUZOLEVBRTZCLFlBQVc7QUFDdEMsb0JBQUksQ0FBQ3ZMLE1BQU1aLFFBQU4sQ0FBZUMsSUFBZixDQUFvQixXQUFwQixDQUFMLEVBQXVDO0FBQ3JDVyx3QkFBTS9FLEtBQU4sQ0FBWTZKLEtBQVo7QUFDRDtBQUNGLGVBTkQ7QUFPRDtBQUNGOztBQUVELGNBQUksS0FBS3dLLE9BQUwsQ0FBYTJZLFVBQWpCLEVBQTZCO0FBQzNCLGdCQUFJQyxZQUFZLEtBQUs5b0IsUUFBTCxDQUFja0MsSUFBZCxPQUF1QixLQUFLZ08sT0FBTCxDQUFhNlksU0FBcEMsV0FBbUQsS0FBSzdZLE9BQUwsQ0FBYThZLFNBQWhFLENBQWhCO0FBQ0FGLHNCQUFVMXBCLElBQVYsQ0FBZSxVQUFmLEVBQTJCLENBQTNCO0FBQ0E7QUFEQSxhQUVDK00sRUFGRCxDQUVJLGtDQUZKLEVBRXdDLFVBQVMxSixDQUFULEVBQVc7QUFDeERBLGdCQUFFeU8sY0FBRjtBQUNPdFEsb0JBQU00bkIsV0FBTixDQUFrQjNwQixFQUFFLElBQUYsRUFBUWdjLFFBQVIsQ0FBaUJqYSxNQUFNc1AsT0FBTixDQUFjNlksU0FBL0IsQ0FBbEI7QUFDRCxhQUxEO0FBTUQ7O0FBRUQsY0FBSSxLQUFLN1ksT0FBTCxDQUFhOFgsT0FBakIsRUFBMEI7QUFDeEIsaUJBQUtLLFFBQUwsQ0FBY2xjLEVBQWQsQ0FBaUIsa0NBQWpCLEVBQXFELFlBQVc7QUFDOUQsa0JBQUksYUFBYWpILElBQWIsQ0FBa0IsS0FBSzNGLFNBQXZCLENBQUosRUFBdUM7QUFBRSx1QkFBTyxLQUFQO0FBQWUsZUFETSxDQUNOO0FBQ3hELGtCQUFJZ2IsTUFBTTFiLEVBQUUsSUFBRixFQUFRb0IsSUFBUixDQUFhLE9BQWIsQ0FBVjtBQUFBLGtCQUNBZ0ssTUFBTXNRLE1BQU0zWixNQUFNOG1CLE9BQU4sQ0FBY25kLE1BQWQsQ0FBcUIsWUFBckIsRUFBbUN0SyxJQUFuQyxDQUF3QyxPQUF4QyxDQURaO0FBQUEsa0JBRUFncEIsU0FBU3JvQixNQUFNOG1CLE9BQU4sQ0FBYy9ZLEVBQWQsQ0FBaUI0TCxHQUFqQixDQUZUOztBQUlBM1osb0JBQU00bkIsV0FBTixDQUFrQnZlLEdBQWxCLEVBQXVCZ2YsTUFBdkIsRUFBK0IxTyxHQUEvQjtBQUNELGFBUEQ7QUFRRDs7QUFFRCxlQUFLNEQsUUFBTCxDQUFjbEIsR0FBZCxDQUFrQixLQUFLb0wsUUFBdkIsRUFBaUNsYyxFQUFqQyxDQUFvQyxrQkFBcEMsRUFBd0QsVUFBUzFKLENBQVQsRUFBWTtBQUNsRTtBQUNBMUQsdUJBQVdtSyxRQUFYLENBQW9CUyxTQUFwQixDQUE4QmxILENBQTlCLEVBQWlDLE9BQWpDLEVBQTBDO0FBQ3hDd1ksb0JBQU0sWUFBVztBQUNmcmEsc0JBQU00bkIsV0FBTixDQUFrQixJQUFsQjtBQUNELGVBSHVDO0FBSXhDbk4sd0JBQVUsWUFBVztBQUNuQnphLHNCQUFNNG5CLFdBQU4sQ0FBa0IsS0FBbEI7QUFDRCxlQU51QztBQU94Q3BlLHVCQUFTLFlBQVc7QUFBRTtBQUNwQixvQkFBSXZMLEVBQUU0RCxFQUFFN0YsTUFBSixFQUFZNE4sRUFBWixDQUFlNUosTUFBTXluQixRQUFyQixDQUFKLEVBQW9DO0FBQ2xDem5CLHdCQUFNeW5CLFFBQU4sQ0FBZTlkLE1BQWYsQ0FBc0IsWUFBdEIsRUFBb0M0USxLQUFwQztBQUNEO0FBQ0Y7QUFYdUMsYUFBMUM7QUFhRCxXQWZEO0FBZ0JEO0FBQ0Y7O0FBRUQ7Ozs7Ozs7OztBQTVPVztBQUFBO0FBQUEsa0NBb1BDK04sS0FwUEQsRUFvUFFDLFdBcFBSLEVBb1BxQjVPLEdBcFByQixFQW9QMEI7QUFDbkMsWUFBSTZPLFlBQVksS0FBSzFCLE9BQUwsQ0FBYW5kLE1BQWIsQ0FBb0IsWUFBcEIsRUFBa0NvRSxFQUFsQyxDQUFxQyxDQUFyQyxDQUFoQjs7QUFFQSxZQUFJLE9BQU96SixJQUFQLENBQVlra0IsVUFBVSxDQUFWLEVBQWE3cEIsU0FBekIsQ0FBSixFQUF5QztBQUFFLGlCQUFPLEtBQVA7QUFBZSxTQUh2QixDQUd3Qjs7QUFFM0QsWUFBSThwQixjQUFjLEtBQUszQixPQUFMLENBQWExVSxLQUFiLEVBQWxCO0FBQUEsWUFDQXNXLGFBQWEsS0FBSzVCLE9BQUwsQ0FBYTZCLElBQWIsRUFEYjtBQUFBLFlBRUFDLFFBQVFOLFFBQVEsT0FBUixHQUFrQixNQUYxQjtBQUFBLFlBR0FPLFNBQVNQLFFBQVEsTUFBUixHQUFpQixPQUgxQjtBQUFBLFlBSUF0b0IsUUFBUSxJQUpSO0FBQUEsWUFLQThvQixTQUxBOztBQU9BLFlBQUksQ0FBQ1AsV0FBTCxFQUFrQjtBQUFFO0FBQ2xCTyxzQkFBWVIsUUFBUTtBQUNuQixlQUFLaFosT0FBTCxDQUFheVosWUFBYixHQUE0QlAsVUFBVW5PLElBQVYsT0FBbUIsS0FBSy9LLE9BQUwsQ0FBYXlYLFVBQWhDLEVBQThDcm1CLE1BQTlDLEdBQXVEOG5CLFVBQVVuTyxJQUFWLE9BQW1CLEtBQUsvSyxPQUFMLENBQWF5WCxVQUFoQyxDQUF2RCxHQUF1RzBCLFdBQW5JLEdBQWlKRCxVQUFVbk8sSUFBVixPQUFtQixLQUFLL0ssT0FBTCxDQUFheVgsVUFBaEMsQ0FEdEksR0FDb0w7QUFFL0wsZUFBS3pYLE9BQUwsQ0FBYXlaLFlBQWIsR0FBNEJQLFVBQVU5TixJQUFWLE9BQW1CLEtBQUtwTCxPQUFMLENBQWF5WCxVQUFoQyxFQUE4Q3JtQixNQUE5QyxHQUF1RDhuQixVQUFVOU4sSUFBVixPQUFtQixLQUFLcEwsT0FBTCxDQUFheVgsVUFBaEMsQ0FBdkQsR0FBdUcyQixVQUFuSSxHQUFnSkYsVUFBVTlOLElBQVYsT0FBbUIsS0FBS3BMLE9BQUwsQ0FBYXlYLFVBQWhDLENBSGpKLENBRGdCLENBSWdMO0FBQ2pNLFNBTEQsTUFLTztBQUNMK0Isc0JBQVlQLFdBQVo7QUFDRDs7QUFFRCxZQUFJTyxVQUFVcG9CLE1BQWQsRUFBc0I7QUFDcEIsY0FBSSxLQUFLNE8sT0FBTCxDQUFhOFgsT0FBakIsRUFBMEI7QUFDeEJ6TixrQkFBTUEsT0FBTyxLQUFLbU4sT0FBTCxDQUFhN0YsS0FBYixDQUFtQjZILFNBQW5CLENBQWIsQ0FEd0IsQ0FDb0I7QUFDNUMsaUJBQUtFLGNBQUwsQ0FBb0JyUCxHQUFwQjtBQUNEOztBQUVELGNBQUksS0FBS3JLLE9BQUwsQ0FBYTRYLE1BQWpCLEVBQXlCO0FBQ3ZCL29CLHVCQUFXK08sTUFBWCxDQUFrQkMsU0FBbEIsQ0FDRTJiLFVBQVUzYSxRQUFWLENBQW1CLFdBQW5CLEVBQWdDekQsR0FBaEMsQ0FBb0MsRUFBQyxZQUFZLFVBQWIsRUFBeUIsT0FBTyxDQUFoQyxFQUFwQyxDQURGLEVBRUUsS0FBSzRFLE9BQUwsZ0JBQTBCc1osS0FBMUIsQ0FGRixFQUdFLFlBQVU7QUFDUkUsd0JBQVVwZSxHQUFWLENBQWMsRUFBQyxZQUFZLFVBQWIsRUFBeUIsV0FBVyxPQUFwQyxFQUFkLEVBQ0NsTSxJQURELENBQ00sV0FETixFQUNtQixRQURuQjtBQUVILGFBTkQ7O0FBUUFMLHVCQUFXK08sTUFBWCxDQUFrQkssVUFBbEIsQ0FDRWliLFVBQVVobEIsV0FBVixDQUFzQixXQUF0QixDQURGLEVBRUUsS0FBSzhMLE9BQUwsZUFBeUJ1WixNQUF6QixDQUZGLEVBR0UsWUFBVTtBQUNSTCx3QkFBVWhwQixVQUFWLENBQXFCLFdBQXJCO0FBQ0Esa0JBQUdRLE1BQU1zUCxPQUFOLENBQWNnWSxRQUFkLElBQTBCLENBQUN0bkIsTUFBTS9FLEtBQU4sQ0FBWXdVLFFBQTFDLEVBQW1EO0FBQ2pEelAsc0JBQU0vRSxLQUFOLENBQVl5VSxPQUFaO0FBQ0Q7QUFDRDtBQUNELGFBVEg7QUFVRCxXQW5CRCxNQW1CTztBQUNMOFksc0JBQVVobEIsV0FBVixDQUFzQixpQkFBdEIsRUFBeUNoRSxVQUF6QyxDQUFvRCxXQUFwRCxFQUFpRWdQLElBQWpFO0FBQ0FzYSxzQkFBVTNhLFFBQVYsQ0FBbUIsaUJBQW5CLEVBQXNDM1AsSUFBdEMsQ0FBMkMsV0FBM0MsRUFBd0QsUUFBeEQsRUFBa0U0UCxJQUFsRTtBQUNBLGdCQUFJLEtBQUtrQixPQUFMLENBQWFnWSxRQUFiLElBQXlCLENBQUMsS0FBS3JzQixLQUFMLENBQVd3VSxRQUF6QyxFQUFtRDtBQUNqRCxtQkFBS3hVLEtBQUwsQ0FBV3lVLE9BQVg7QUFDRDtBQUNGO0FBQ0g7Ozs7QUFJRSxlQUFLdFEsUUFBTCxDQUFjRSxPQUFkLENBQXNCLHNCQUF0QixFQUE4QyxDQUFDd3BCLFNBQUQsQ0FBOUM7QUFDRDtBQUNGOztBQUVEOzs7Ozs7O0FBalRXO0FBQUE7QUFBQSxxQ0F1VEluUCxHQXZUSixFQXVUUztBQUNsQixZQUFJc1AsYUFBYSxLQUFLN3BCLFFBQUwsQ0FBY2tDLElBQWQsT0FBdUIsS0FBS2dPLE9BQUwsQ0FBYW9ZLFlBQXBDLEVBQ2hCcG1CLElBRGdCLENBQ1gsWUFEVyxFQUNHa0MsV0FESCxDQUNlLFdBRGYsRUFDNEJ3YSxJQUQ1QixFQUFqQjtBQUFBLFlBRUFrTCxPQUFPRCxXQUFXM25CLElBQVgsQ0FBZ0IsV0FBaEIsRUFBNkI2bkIsTUFBN0IsRUFGUDtBQUFBLFlBR0FDLGFBQWEsS0FBSzNCLFFBQUwsQ0FBYzFaLEVBQWQsQ0FBaUI0TCxHQUFqQixFQUFzQnhMLFFBQXRCLENBQStCLFdBQS9CLEVBQTRDa2IsTUFBNUMsQ0FBbURILElBQW5ELENBSGI7QUFJRDs7QUFFRDs7Ozs7QUE5VFc7QUFBQTtBQUFBLGdDQWtVRDtBQUNSLGFBQUs5cEIsUUFBTCxDQUFjNlUsR0FBZCxDQUFrQixXQUFsQixFQUErQjNTLElBQS9CLENBQW9DLEdBQXBDLEVBQXlDMlMsR0FBekMsQ0FBNkMsV0FBN0MsRUFBMEQxUixHQUExRCxHQUFnRWlNLElBQWhFO0FBQ0FyUSxtQkFBV29CLGdCQUFYLENBQTRCLElBQTVCO0FBQ0Q7QUFyVVU7O0FBQUE7QUFBQTs7QUF3VWJxbkIsUUFBTXhSLFFBQU4sR0FBaUI7QUFDZjs7Ozs7QUFLQWdTLGFBQVMsSUFOTTtBQU9mOzs7OztBQUtBYSxnQkFBWSxJQVpHO0FBYWY7Ozs7O0FBS0FxQixxQkFBaUIsZ0JBbEJGO0FBbUJmOzs7OztBQUtBQyxvQkFBZ0IsaUJBeEJEO0FBeUJmOzs7Ozs7QUFNQUMsb0JBQWdCLGVBL0JEO0FBZ0NmOzs7OztBQUtBQyxtQkFBZSxnQkFyQ0E7QUFzQ2Y7Ozs7O0FBS0FuQyxjQUFVLElBM0NLO0FBNENmOzs7OztBQUtBSyxnQkFBWSxJQWpERztBQWtEZjs7Ozs7QUFLQW9CLGtCQUFjLElBdkRDO0FBd0RmOzs7OztBQUtBalgsV0FBTyxJQTdEUTtBQThEZjs7Ozs7QUFLQWtXLGtCQUFjLElBbkVDO0FBb0VmOzs7OztBQUtBUixnQkFBWSxJQXpFRztBQTBFZjs7Ozs7QUFLQVgsb0JBQWdCLGlCQS9FRDtBQWdGZjs7Ozs7QUFLQUUsZ0JBQVksYUFyRkc7QUFzRmY7Ozs7O0FBS0FXLGtCQUFjLGVBM0ZDO0FBNEZmOzs7OztBQUtBUyxlQUFXLFlBakdJO0FBa0dmOzs7OztBQUtBQyxlQUFXLGdCQXZHSTtBQXdHZjs7Ozs7QUFLQWxCLFlBQVE7QUE3R08sR0FBakI7O0FBZ0hBO0FBQ0Evb0IsYUFBV00sTUFBWCxDQUFrQm1vQixLQUFsQixFQUF5QixPQUF6QjtBQUVDLENBM2JBLENBMmJDOWdCLE1BM2JELENBQUQ7Q0NGQTs7Ozs7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7Ozs7Ozs7O0FBRmEsTUFZUHlyQixjQVpPO0FBYVg7Ozs7Ozs7QUFPQSw0QkFBWXZqQixPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0JuQixFQUFFa0ksT0FBRixDQUFoQjtBQUNBLFdBQUs0ZCxLQUFMLEdBQWEsS0FBSzNrQixRQUFMLENBQWNDLElBQWQsQ0FBbUIsaUJBQW5CLENBQWI7QUFDQSxXQUFLc3FCLFNBQUwsR0FBaUIsSUFBakI7QUFDQSxXQUFLQyxhQUFMLEdBQXFCLElBQXJCOztBQUVBLFdBQUs3cEIsS0FBTDtBQUNBLFdBQUt1VixPQUFMOztBQUVBblgsaUJBQVdZLGNBQVgsQ0FBMEIsSUFBMUIsRUFBZ0MsZ0JBQWhDO0FBQ0Q7O0FBRUQ7Ozs7Ozs7QUFoQ1c7QUFBQTtBQUFBLDhCQXFDSDtBQUNOO0FBQ0EsWUFBSSxPQUFPLEtBQUtnbEIsS0FBWixLQUFzQixRQUExQixFQUFvQztBQUNsQyxjQUFJOEYsWUFBWSxFQUFoQjs7QUFFQTtBQUNBLGNBQUk5RixRQUFRLEtBQUtBLEtBQUwsQ0FBV25pQixLQUFYLENBQWlCLEdBQWpCLENBQVo7O0FBRUE7QUFDQSxlQUFLLElBQUlSLElBQUksQ0FBYixFQUFnQkEsSUFBSTJpQixNQUFNcmpCLE1BQTFCLEVBQWtDVSxHQUFsQyxFQUF1QztBQUNyQyxnQkFBSStpQixPQUFPSixNQUFNM2lCLENBQU4sRUFBU1EsS0FBVCxDQUFlLEdBQWYsQ0FBWDtBQUNBLGdCQUFJa29CLFdBQVczRixLQUFLempCLE1BQUwsR0FBYyxDQUFkLEdBQWtCeWpCLEtBQUssQ0FBTCxDQUFsQixHQUE0QixPQUEzQztBQUNBLGdCQUFJNEYsYUFBYTVGLEtBQUt6akIsTUFBTCxHQUFjLENBQWQsR0FBa0J5akIsS0FBSyxDQUFMLENBQWxCLEdBQTRCQSxLQUFLLENBQUwsQ0FBN0M7O0FBRUEsZ0JBQUk2RixZQUFZRCxVQUFaLE1BQTRCLElBQWhDLEVBQXNDO0FBQ3BDRix3QkFBVUMsUUFBVixJQUFzQkUsWUFBWUQsVUFBWixDQUF0QjtBQUNEO0FBQ0Y7O0FBRUQsZUFBS2hHLEtBQUwsR0FBYThGLFNBQWI7QUFDRDs7QUFFRCxZQUFJLENBQUM1ckIsRUFBRWdzQixhQUFGLENBQWdCLEtBQUtsRyxLQUFyQixDQUFMLEVBQWtDO0FBQ2hDLGVBQUttRyxrQkFBTDtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7OztBQWhFVztBQUFBO0FBQUEsZ0NBcUVEO0FBQ1IsWUFBSWxxQixRQUFRLElBQVo7O0FBRUEvQixVQUFFOUQsTUFBRixFQUFVb1IsRUFBVixDQUFhLHVCQUFiLEVBQXNDLFlBQVc7QUFDL0N2TCxnQkFBTWtxQixrQkFBTjtBQUNELFNBRkQ7QUFHQTtBQUNBO0FBQ0E7QUFDRDs7QUFFRDs7Ozs7O0FBaEZXO0FBQUE7QUFBQSwyQ0FxRlU7QUFDbkIsWUFBSUMsU0FBSjtBQUFBLFlBQWVucUIsUUFBUSxJQUF2QjtBQUNBO0FBQ0EvQixVQUFFNkIsSUFBRixDQUFPLEtBQUtpa0IsS0FBWixFQUFtQixVQUFTcG9CLEdBQVQsRUFBYztBQUMvQixjQUFJd0MsV0FBV3NGLFVBQVgsQ0FBc0J1SCxPQUF0QixDQUE4QnJQLEdBQTlCLENBQUosRUFBd0M7QUFDdEN3dUIsd0JBQVl4dUIsR0FBWjtBQUNEO0FBQ0YsU0FKRDs7QUFNQTtBQUNBLFlBQUksQ0FBQ3d1QixTQUFMLEVBQWdCOztBQUVoQjtBQUNBLFlBQUksS0FBS1AsYUFBTCxZQUE4QixLQUFLN0YsS0FBTCxDQUFXb0csU0FBWCxFQUFzQjFyQixNQUF4RCxFQUFnRTs7QUFFaEU7QUFDQVIsVUFBRTZCLElBQUYsQ0FBT2txQixXQUFQLEVBQW9CLFVBQVNydUIsR0FBVCxFQUFjQyxLQUFkLEVBQXFCO0FBQ3ZDb0UsZ0JBQU1aLFFBQU4sQ0FBZW9FLFdBQWYsQ0FBMkI1SCxNQUFNd3VCLFFBQWpDO0FBQ0QsU0FGRDs7QUFJQTtBQUNBLGFBQUtockIsUUFBTCxDQUFjK08sUUFBZCxDQUF1QixLQUFLNFYsS0FBTCxDQUFXb0csU0FBWCxFQUFzQkMsUUFBN0M7O0FBRUE7QUFDQSxZQUFJLEtBQUtSLGFBQVQsRUFBd0IsS0FBS0EsYUFBTCxDQUFtQlMsT0FBbkI7QUFDeEIsYUFBS1QsYUFBTCxHQUFxQixJQUFJLEtBQUs3RixLQUFMLENBQVdvRyxTQUFYLEVBQXNCMXJCLE1BQTFCLENBQWlDLEtBQUtXLFFBQXRDLEVBQWdELEVBQWhELENBQXJCO0FBQ0Q7O0FBRUQ7Ozs7O0FBakhXO0FBQUE7QUFBQSxnQ0FxSEQ7QUFDUixhQUFLd3FCLGFBQUwsQ0FBbUJTLE9BQW5CO0FBQ0Fwc0IsVUFBRTlELE1BQUYsRUFBVThaLEdBQVYsQ0FBYyxvQkFBZDtBQUNBOVYsbUJBQVdvQixnQkFBWCxDQUE0QixJQUE1QjtBQUNEO0FBekhVOztBQUFBO0FBQUE7O0FBNEhibXFCLGlCQUFldFUsUUFBZixHQUEwQixFQUExQjs7QUFFQTtBQUNBLE1BQUk0VSxjQUFjO0FBQ2hCTSxjQUFVO0FBQ1JGLGdCQUFVLFVBREY7QUFFUjNyQixjQUFRTixXQUFXRSxRQUFYLENBQW9CLGVBQXBCLEtBQXdDO0FBRnhDLEtBRE07QUFLakJrc0IsZUFBVztBQUNSSCxnQkFBVSxXQURGO0FBRVIzckIsY0FBUU4sV0FBV0UsUUFBWCxDQUFvQixXQUFwQixLQUFvQztBQUZwQyxLQUxNO0FBU2hCbXNCLGVBQVc7QUFDVEosZ0JBQVUsZ0JBREQ7QUFFVDNyQixjQUFRTixXQUFXRSxRQUFYLENBQW9CLGdCQUFwQixLQUF5QztBQUZ4QztBQVRLLEdBQWxCOztBQWVBO0FBQ0FGLGFBQVdNLE1BQVgsQ0FBa0JpckIsY0FBbEIsRUFBa0MsZ0JBQWxDO0FBRUMsQ0FqSkEsQ0FpSkM1akIsTUFqSkQsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7OztBQUZhLE1BUVB3c0IsZ0JBUk87QUFTWDs7Ozs7OztBQU9BLDhCQUFZdGtCLE9BQVosRUFBcUJtSixPQUFyQixFQUE4QjtBQUFBOztBQUM1QixXQUFLbFEsUUFBTCxHQUFnQm5CLEVBQUVrSSxPQUFGLENBQWhCO0FBQ0EsV0FBS21KLE9BQUwsR0FBZXJSLEVBQUVxTCxNQUFGLENBQVMsRUFBVCxFQUFhbWhCLGlCQUFpQnJWLFFBQTlCLEVBQXdDLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBeEMsRUFBOERpUSxPQUE5RCxDQUFmOztBQUVBLFdBQUt2UCxLQUFMO0FBQ0EsV0FBS3VWLE9BQUw7O0FBRUFuWCxpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxrQkFBaEM7QUFDRDs7QUFFRDs7Ozs7OztBQTFCVztBQUFBO0FBQUEsOEJBK0JIO0FBQ04sWUFBSTJyQixXQUFXLEtBQUt0ckIsUUFBTCxDQUFjQyxJQUFkLENBQW1CLG1CQUFuQixDQUFmO0FBQ0EsWUFBSSxDQUFDcXJCLFFBQUwsRUFBZTtBQUNibHFCLGtCQUFRQyxLQUFSLENBQWMsa0VBQWQ7QUFDRDs7QUFFRCxhQUFLa3FCLFdBQUwsR0FBbUIxc0IsUUFBTXlzQixRQUFOLENBQW5CO0FBQ0EsYUFBS0UsUUFBTCxHQUFnQixLQUFLeHJCLFFBQUwsQ0FBY2tDLElBQWQsQ0FBbUIsZUFBbkIsQ0FBaEI7O0FBRUEsYUFBS3VwQixPQUFMO0FBQ0Q7O0FBRUQ7Ozs7OztBQTNDVztBQUFBO0FBQUEsZ0NBZ0REO0FBQ1IsWUFBSTdxQixRQUFRLElBQVo7O0FBRUEsYUFBSzhxQixnQkFBTCxHQUF3QixLQUFLRCxPQUFMLENBQWE3bEIsSUFBYixDQUFrQixJQUFsQixDQUF4Qjs7QUFFQS9HLFVBQUU5RCxNQUFGLEVBQVVvUixFQUFWLENBQWEsdUJBQWIsRUFBc0MsS0FBS3VmLGdCQUEzQzs7QUFFQSxhQUFLRixRQUFMLENBQWNyZixFQUFkLENBQWlCLDJCQUFqQixFQUE4QyxLQUFLd2YsVUFBTCxDQUFnQi9sQixJQUFoQixDQUFxQixJQUFyQixDQUE5QztBQUNEOztBQUVEOzs7Ozs7QUExRFc7QUFBQTtBQUFBLGdDQStERDtBQUNSO0FBQ0EsWUFBSSxDQUFDN0csV0FBV3NGLFVBQVgsQ0FBc0J1SCxPQUF0QixDQUE4QixLQUFLc0UsT0FBTCxDQUFhMGIsT0FBM0MsQ0FBTCxFQUEwRDtBQUN4RCxlQUFLNXJCLFFBQUwsQ0FBY2dQLElBQWQ7QUFDQSxlQUFLdWMsV0FBTCxDQUFpQm5jLElBQWpCO0FBQ0Q7O0FBRUQ7QUFMQSxhQU1LO0FBQ0gsaUJBQUtwUCxRQUFMLENBQWNvUCxJQUFkO0FBQ0EsaUJBQUttYyxXQUFMLENBQWlCdmMsSUFBakI7QUFDRDtBQUNGOztBQUVEOzs7Ozs7QUE3RVc7QUFBQTtBQUFBLG1DQWtGRTtBQUNYLFlBQUksQ0FBQ2pRLFdBQVdzRixVQUFYLENBQXNCdUgsT0FBdEIsQ0FBOEIsS0FBS3NFLE9BQUwsQ0FBYTBiLE9BQTNDLENBQUwsRUFBMEQ7QUFDeEQsZUFBS0wsV0FBTCxDQUFpQnZRLE1BQWpCLENBQXdCLENBQXhCOztBQUVBOzs7O0FBSUEsZUFBS2hiLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQiw2QkFBdEI7QUFDRDtBQUNGO0FBNUZVO0FBQUE7QUFBQSxnQ0E4RkQ7QUFDUixhQUFLRixRQUFMLENBQWM2VSxHQUFkLENBQWtCLHNCQUFsQjtBQUNBLGFBQUsyVyxRQUFMLENBQWMzVyxHQUFkLENBQWtCLHNCQUFsQjs7QUFFQWhXLFVBQUU5RCxNQUFGLEVBQVU4WixHQUFWLENBQWMsdUJBQWQsRUFBdUMsS0FBSzZXLGdCQUE1Qzs7QUFFQTNzQixtQkFBV29CLGdCQUFYLENBQTRCLElBQTVCO0FBQ0Q7QUFyR1U7O0FBQUE7QUFBQTs7QUF3R2JrckIsbUJBQWlCclYsUUFBakIsR0FBNEI7QUFDMUI7Ozs7O0FBS0E0VixhQUFTO0FBTmlCLEdBQTVCOztBQVNBO0FBQ0E3c0IsYUFBV00sTUFBWCxDQUFrQmdzQixnQkFBbEIsRUFBb0Msa0JBQXBDO0FBRUMsQ0FwSEEsQ0FvSEMza0IsTUFwSEQsQ0FBRDtDQ0ZBOzs7Ozs7QUFFQSxDQUFDLFVBQVM3SCxDQUFULEVBQVk7O0FBRWI7Ozs7Ozs7Ozs7QUFGYSxNQVlQZ3RCLE1BWk87QUFhWDs7Ozs7O0FBTUEsb0JBQVk5a0IsT0FBWixFQUFxQm1KLE9BQXJCLEVBQThCO0FBQUE7O0FBQzVCLFdBQUtsUSxRQUFMLEdBQWdCK0csT0FBaEI7QUFDQSxXQUFLbUosT0FBTCxHQUFlclIsRUFBRXFMLE1BQUYsQ0FBUyxFQUFULEVBQWEyaEIsT0FBTzdWLFFBQXBCLEVBQThCLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBOUIsRUFBb0RpUSxPQUFwRCxDQUFmO0FBQ0EsV0FBS3ZQLEtBQUw7O0FBRUE1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxRQUFoQztBQUNBWixpQkFBV21LLFFBQVgsQ0FBb0J1QixRQUFwQixDQUE2QixRQUE3QixFQUF1QztBQUNyQyxpQkFBUyxNQUQ0QjtBQUVyQyxpQkFBUyxNQUY0QjtBQUdyQyxrQkFBVSxPQUgyQjtBQUlyQyxlQUFPLGFBSjhCO0FBS3JDLHFCQUFhO0FBTHdCLE9BQXZDO0FBT0Q7O0FBRUQ7Ozs7OztBQWxDVztBQUFBO0FBQUEsOEJBc0NIO0FBQ04sYUFBS2tDLEVBQUwsR0FBVSxLQUFLM00sUUFBTCxDQUFjWixJQUFkLENBQW1CLElBQW5CLENBQVY7QUFDQSxhQUFLK2MsUUFBTCxHQUFnQixLQUFoQjtBQUNBLGFBQUsyUCxNQUFMLEdBQWMsRUFBQ0MsSUFBSWh0QixXQUFXc0YsVUFBWCxDQUFzQjhHLE9BQTNCLEVBQWQ7QUFDQSxhQUFLNmdCLFFBQUwsR0FBZ0JDLGFBQWhCOztBQUVBLGFBQUs5TSxPQUFMLEdBQWV0Z0IsbUJBQWlCLEtBQUs4TixFQUF0QixTQUE4QnJMLE1BQTlCLEdBQXVDekMsbUJBQWlCLEtBQUs4TixFQUF0QixRQUF2QyxHQUF1RTlOLHFCQUFtQixLQUFLOE4sRUFBeEIsUUFBdEY7QUFDQSxhQUFLd1MsT0FBTCxDQUFhL2YsSUFBYixDQUFrQjtBQUNoQiwyQkFBaUIsS0FBS3VOLEVBRE47QUFFaEIsMkJBQWlCLElBRkQ7QUFHaEIsc0JBQVk7QUFISSxTQUFsQjs7QUFNQSxZQUFJLEtBQUt1RCxPQUFMLENBQWFnYyxVQUFiLElBQTJCLEtBQUtsc0IsUUFBTCxDQUFjNmEsUUFBZCxDQUF1QixNQUF2QixDQUEvQixFQUErRDtBQUM3RCxlQUFLM0ssT0FBTCxDQUFhZ2MsVUFBYixHQUEwQixJQUExQjtBQUNBLGVBQUtoYyxPQUFMLENBQWFpYyxPQUFiLEdBQXVCLEtBQXZCO0FBQ0Q7QUFDRCxZQUFJLEtBQUtqYyxPQUFMLENBQWFpYyxPQUFiLElBQXdCLENBQUMsS0FBS0MsUUFBbEMsRUFBNEM7QUFDMUMsZUFBS0EsUUFBTCxHQUFnQixLQUFLQyxZQUFMLENBQWtCLEtBQUsxZixFQUF2QixDQUFoQjtBQUNEOztBQUVELGFBQUszTSxRQUFMLENBQWNaLElBQWQsQ0FBbUI7QUFDZixrQkFBUSxRQURPO0FBRWYseUJBQWUsSUFGQTtBQUdmLDJCQUFpQixLQUFLdU4sRUFIUDtBQUlmLHlCQUFlLEtBQUtBO0FBSkwsU0FBbkI7O0FBT0EsWUFBRyxLQUFLeWYsUUFBUixFQUFrQjtBQUNoQixlQUFLcHNCLFFBQUwsQ0FBYytwQixNQUFkLEdBQXVCN2xCLFFBQXZCLENBQWdDLEtBQUtrb0IsUUFBckM7QUFDRCxTQUZELE1BRU87QUFDTCxlQUFLcHNCLFFBQUwsQ0FBYytwQixNQUFkLEdBQXVCN2xCLFFBQXZCLENBQWdDckYsRUFBRSxNQUFGLENBQWhDO0FBQ0EsZUFBS21CLFFBQUwsQ0FBYytPLFFBQWQsQ0FBdUIsaUJBQXZCO0FBQ0Q7QUFDRCxhQUFLbUgsT0FBTDtBQUNBLFlBQUksS0FBS2hHLE9BQUwsQ0FBYW9jLFFBQWIsSUFBeUJ2eEIsT0FBTzByQixRQUFQLENBQWdCQyxJQUFoQixXQUErQixLQUFLL1osRUFBakUsRUFBd0U7QUFDdEU5TixZQUFFOUQsTUFBRixFQUFVbVUsR0FBVixDQUFjLGdCQUFkLEVBQWdDLEtBQUt5TixJQUFMLENBQVUvVyxJQUFWLENBQWUsSUFBZixDQUFoQztBQUNEO0FBQ0Y7O0FBRUQ7Ozs7O0FBOUVXO0FBQUE7QUFBQSxtQ0FrRkUrRyxFQWxGRixFQWtGTTtBQUNmLFlBQUl5ZixXQUFXdnRCLEVBQUUsYUFBRixFQUNFa1EsUUFERixDQUNXLGdCQURYLEVBRUU3SyxRQUZGLENBRVcsTUFGWCxDQUFmO0FBR0EsZUFBT2tvQixRQUFQO0FBQ0Q7O0FBRUQ7Ozs7OztBQXpGVztBQUFBO0FBQUEsd0NBOEZPO0FBQ2hCLFlBQUl6a0IsUUFBUSxLQUFLM0gsUUFBTCxDQUFjdXNCLFVBQWQsRUFBWjtBQUNBLFlBQUlBLGFBQWExdEIsRUFBRTlELE1BQUYsRUFBVTRNLEtBQVYsRUFBakI7QUFDQSxZQUFJRCxTQUFTLEtBQUsxSCxRQUFMLENBQWN3c0IsV0FBZCxFQUFiO0FBQ0EsWUFBSUEsY0FBYzN0QixFQUFFOUQsTUFBRixFQUFVMk0sTUFBVixFQUFsQjtBQUNBLFlBQUlKLElBQUosRUFBVUYsR0FBVjtBQUNBLFlBQUksS0FBSzhJLE9BQUwsQ0FBYXRILE9BQWIsS0FBeUIsTUFBN0IsRUFBcUM7QUFDbkN0QixpQkFBT29lLFNBQVMsQ0FBQzZHLGFBQWE1a0IsS0FBZCxJQUF1QixDQUFoQyxFQUFtQyxFQUFuQyxDQUFQO0FBQ0QsU0FGRCxNQUVPO0FBQ0xMLGlCQUFPb2UsU0FBUyxLQUFLeFYsT0FBTCxDQUFhdEgsT0FBdEIsRUFBK0IsRUFBL0IsQ0FBUDtBQUNEO0FBQ0QsWUFBSSxLQUFLc0gsT0FBTCxDQUFhdkgsT0FBYixLQUF5QixNQUE3QixFQUFxQztBQUNuQyxjQUFJakIsU0FBUzhrQixXQUFiLEVBQTBCO0FBQ3hCcGxCLGtCQUFNc2UsU0FBU2xrQixLQUFLaWIsR0FBTCxDQUFTLEdBQVQsRUFBYytQLGNBQWMsRUFBNUIsQ0FBVCxFQUEwQyxFQUExQyxDQUFOO0FBQ0QsV0FGRCxNQUVPO0FBQ0xwbEIsa0JBQU1zZSxTQUFTLENBQUM4RyxjQUFjOWtCLE1BQWYsSUFBeUIsQ0FBbEMsRUFBcUMsRUFBckMsQ0FBTjtBQUNEO0FBQ0YsU0FORCxNQU1PO0FBQ0xOLGdCQUFNc2UsU0FBUyxLQUFLeFYsT0FBTCxDQUFhdkgsT0FBdEIsRUFBK0IsRUFBL0IsQ0FBTjtBQUNEO0FBQ0QsYUFBSzNJLFFBQUwsQ0FBY3NMLEdBQWQsQ0FBa0IsRUFBQ2xFLEtBQUtBLE1BQU0sSUFBWixFQUFsQjtBQUNBO0FBQ0E7QUFDQSxZQUFHLENBQUMsS0FBS2dsQixRQUFOLElBQW1CLEtBQUtsYyxPQUFMLENBQWF0SCxPQUFiLEtBQXlCLE1BQS9DLEVBQXdEO0FBQ3RELGVBQUs1SSxRQUFMLENBQWNzTCxHQUFkLENBQWtCLEVBQUNoRSxNQUFNQSxPQUFPLElBQWQsRUFBbEI7QUFDQSxlQUFLdEgsUUFBTCxDQUFjc0wsR0FBZCxDQUFrQixFQUFDbWhCLFFBQVEsS0FBVCxFQUFsQjtBQUNEO0FBRUY7O0FBRUQ7Ozs7O0FBNUhXO0FBQUE7QUFBQSxnQ0FnSUQ7QUFBQTs7QUFDUixZQUFJN3JCLFFBQVEsSUFBWjs7QUFFQSxhQUFLWixRQUFMLENBQWNtTSxFQUFkLENBQWlCO0FBQ2YsNkJBQW1CLEtBQUt3USxJQUFMLENBQVUvVyxJQUFWLENBQWUsSUFBZixDQURKO0FBRWYsOEJBQW9CLFVBQUMzSixLQUFELEVBQVErRCxRQUFSLEVBQXFCO0FBQ3ZDLGdCQUFLL0QsTUFBTVcsTUFBTixLQUFpQmdFLE1BQU1aLFFBQU4sQ0FBZSxDQUFmLENBQWxCLElBQ0NuQixFQUFFNUMsTUFBTVcsTUFBUixFQUFnQjhmLE9BQWhCLENBQXdCLGlCQUF4QixFQUEyQyxDQUEzQyxNQUFrRDFjLFFBRHZELEVBQ2tFO0FBQUU7QUFDbEUscUJBQU8sT0FBSzRjLEtBQUwsQ0FBVzlZLEtBQVgsUUFBUDtBQUNEO0FBQ0YsV0FQYztBQVFmLCtCQUFxQixLQUFLa1gsTUFBTCxDQUFZcFYsSUFBWixDQUFpQixJQUFqQixDQVJOO0FBU2YsaUNBQXVCLFlBQVc7QUFDaENoRixrQkFBTThyQixlQUFOO0FBQ0Q7QUFYYyxTQUFqQjs7QUFjQSxZQUFJLEtBQUt2TixPQUFMLENBQWE3ZCxNQUFqQixFQUF5QjtBQUN2QixlQUFLNmQsT0FBTCxDQUFhaFQsRUFBYixDQUFnQixtQkFBaEIsRUFBcUMsVUFBUzFKLENBQVQsRUFBWTtBQUMvQyxnQkFBSUEsRUFBRS9FLEtBQUYsS0FBWSxFQUFaLElBQWtCK0UsRUFBRS9FLEtBQUYsS0FBWSxFQUFsQyxFQUFzQztBQUNwQytFLGdCQUFFd1IsZUFBRjtBQUNBeFIsZ0JBQUV5TyxjQUFGO0FBQ0F0USxvQkFBTStiLElBQU47QUFDRDtBQUNGLFdBTkQ7QUFPRDs7QUFFRCxZQUFJLEtBQUt6TSxPQUFMLENBQWFxTyxZQUFiLElBQTZCLEtBQUtyTyxPQUFMLENBQWFpYyxPQUE5QyxFQUF1RDtBQUNyRCxlQUFLQyxRQUFMLENBQWN2WCxHQUFkLENBQWtCLFlBQWxCLEVBQWdDMUksRUFBaEMsQ0FBbUMsaUJBQW5DLEVBQXNELFVBQVMxSixDQUFULEVBQVk7QUFDaEUsZ0JBQUlBLEVBQUU3RixNQUFGLEtBQWFnRSxNQUFNWixRQUFOLENBQWUsQ0FBZixDQUFiLElBQWtDbkIsRUFBRTRmLFFBQUYsQ0FBVzdkLE1BQU1aLFFBQU4sQ0FBZSxDQUFmLENBQVgsRUFBOEJ5QyxFQUFFN0YsTUFBaEMsQ0FBdEMsRUFBK0U7QUFBRTtBQUFTO0FBQzFGZ0Usa0JBQU1nYyxLQUFOO0FBQ0QsV0FIRDtBQUlEO0FBQ0QsWUFBSSxLQUFLMU0sT0FBTCxDQUFhb2MsUUFBakIsRUFBMkI7QUFDekJ6dEIsWUFBRTlELE1BQUYsRUFBVW9SLEVBQVYseUJBQW1DLEtBQUtRLEVBQXhDLEVBQThDLEtBQUtnZ0IsWUFBTCxDQUFrQi9tQixJQUFsQixDQUF1QixJQUF2QixDQUE5QztBQUNEO0FBQ0Y7O0FBRUQ7Ozs7O0FBdEtXO0FBQUE7QUFBQSxtQ0EwS0VuRCxDQTFLRixFQTBLSztBQUNkLFlBQUcxSCxPQUFPMHJCLFFBQVAsQ0FBZ0JDLElBQWhCLEtBQTJCLE1BQU0sS0FBSy9aLEVBQXRDLElBQTZDLENBQUMsS0FBS3dQLFFBQXRELEVBQStEO0FBQUUsZUFBS1EsSUFBTDtBQUFjLFNBQS9FLE1BQ0k7QUFBRSxlQUFLQyxLQUFMO0FBQWU7QUFDdEI7O0FBR0Q7Ozs7Ozs7QUFoTFc7QUFBQTtBQUFBLDZCQXNMSjtBQUFBOztBQUNMLFlBQUksS0FBSzFNLE9BQUwsQ0FBYW9jLFFBQWpCLEVBQTJCO0FBQ3pCLGNBQUk1RixhQUFXLEtBQUsvWixFQUFwQjs7QUFFQSxjQUFJNVIsT0FBT3VzQixPQUFQLENBQWVDLFNBQW5CLEVBQThCO0FBQzVCeHNCLG1CQUFPdXNCLE9BQVAsQ0FBZUMsU0FBZixDQUF5QixJQUF6QixFQUErQixJQUEvQixFQUFxQ2IsSUFBckM7QUFDRCxXQUZELE1BRU87QUFDTDNyQixtQkFBTzByQixRQUFQLENBQWdCQyxJQUFoQixHQUF1QkEsSUFBdkI7QUFDRDtBQUNGOztBQUVELGFBQUt2SyxRQUFMLEdBQWdCLElBQWhCOztBQUVBO0FBQ0EsYUFBS25jLFFBQUwsQ0FDS3NMLEdBREwsQ0FDUyxFQUFFLGNBQWMsUUFBaEIsRUFEVCxFQUVLMEQsSUFGTCxHQUdLaVksU0FITCxDQUdlLENBSGY7QUFJQSxZQUFJLEtBQUsvVyxPQUFMLENBQWFpYyxPQUFqQixFQUEwQjtBQUN4QixlQUFLQyxRQUFMLENBQWM5Z0IsR0FBZCxDQUFrQixFQUFDLGNBQWMsUUFBZixFQUFsQixFQUE0QzBELElBQTVDO0FBQ0Q7O0FBRUQsYUFBSzBkLGVBQUw7O0FBRUEsYUFBSzFzQixRQUFMLENBQ0dvUCxJQURILEdBRUc5RCxHQUZILENBRU8sRUFBRSxjQUFjLEVBQWhCLEVBRlA7O0FBSUEsWUFBRyxLQUFLOGdCLFFBQVIsRUFBa0I7QUFDaEIsZUFBS0EsUUFBTCxDQUFjOWdCLEdBQWQsQ0FBa0IsRUFBQyxjQUFjLEVBQWYsRUFBbEIsRUFBc0M4RCxJQUF0QztBQUNBLGNBQUcsS0FBS3BQLFFBQUwsQ0FBYzZhLFFBQWQsQ0FBdUIsTUFBdkIsQ0FBSCxFQUFtQztBQUNqQyxpQkFBS3VSLFFBQUwsQ0FBY3JkLFFBQWQsQ0FBdUIsTUFBdkI7QUFDRCxXQUZELE1BRU8sSUFBSSxLQUFLL08sUUFBTCxDQUFjNmEsUUFBZCxDQUF1QixNQUF2QixDQUFKLEVBQW9DO0FBQ3pDLGlCQUFLdVIsUUFBTCxDQUFjcmQsUUFBZCxDQUF1QixNQUF2QjtBQUNEO0FBQ0Y7O0FBR0QsWUFBSSxDQUFDLEtBQUttQixPQUFMLENBQWEwYyxjQUFsQixFQUFrQztBQUNoQzs7Ozs7QUFLQSxlQUFLNXNCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixtQkFBdEIsRUFBMkMsS0FBS3lNLEVBQWhEO0FBQ0Q7QUFDRDtBQUNBLFlBQUksS0FBS3VELE9BQUwsQ0FBYTJjLFdBQWpCLEVBQThCO0FBQUEsY0FDeEJqc0IsS0FEd0I7O0FBQUE7QUFBQSxnQkFFbkJrc0IsbUJBRm1CLEdBRTVCLFlBQThCO0FBQzVCbHNCLG9CQUFNWixRQUFOLENBQ0daLElBREgsQ0FDUTtBQUNKLCtCQUFlLEtBRFg7QUFFSiw0QkFBWSxDQUFDO0FBRlQsZUFEUixFQUtHK2IsS0FMSDtBQU1FL1osc0JBQVEyckIsR0FBUixDQUFZLE9BQVo7QUFDSCxhQVYyQjs7QUFDeEJuc0IsMEJBRHdCOztBQVc1QixnQkFBSSxPQUFLc1AsT0FBTCxDQUFhaWMsT0FBakIsRUFBMEI7QUFDeEJwdEIseUJBQVcrTyxNQUFYLENBQWtCQyxTQUFsQixDQUE0QixPQUFLcWUsUUFBakMsRUFBMkMsU0FBM0M7QUFDRDtBQUNEcnRCLHVCQUFXK08sTUFBWCxDQUFrQkMsU0FBbEIsQ0FBNEIsT0FBSy9OLFFBQWpDLEVBQTJDLE9BQUtrUSxPQUFMLENBQWEyYyxXQUF4RCxFQUFxRSxZQUFNO0FBQ3pFLHFCQUFLRyxpQkFBTCxHQUF5Qmp1QixXQUFXbUssUUFBWCxDQUFvQm9CLGFBQXBCLENBQWtDLE9BQUt0SyxRQUF2QyxDQUF6QjtBQUNBOHNCO0FBQ0QsYUFIRDtBQWQ0QjtBQWtCN0I7QUFDRDtBQW5CQSxhQW9CSztBQUNILGdCQUFJLEtBQUs1YyxPQUFMLENBQWFpYyxPQUFqQixFQUEwQjtBQUN4QixtQkFBS0MsUUFBTCxDQUFjcGQsSUFBZCxDQUFtQixDQUFuQjtBQUNEO0FBQ0QsaUJBQUtoUCxRQUFMLENBQWNnUCxJQUFkLENBQW1CLEtBQUtrQixPQUFMLENBQWErYyxTQUFoQztBQUNEOztBQUVEO0FBQ0EsYUFBS2p0QixRQUFMLENBQ0daLElBREgsQ0FDUTtBQUNKLHlCQUFlLEtBRFg7QUFFSixzQkFBWSxDQUFDO0FBRlQsU0FEUixFQUtHK2IsS0FMSDs7QUFPQTs7OztBQUlBLGFBQUtuYixRQUFMLENBQWNFLE9BQWQsQ0FBc0IsZ0JBQXRCOztBQUVBLFlBQUksS0FBSzhyQixRQUFULEVBQW1CO0FBQ2pCLGVBQUtrQixpQkFBTCxHQUF5Qm55QixPQUFPc04sV0FBaEM7QUFDQXhKLFlBQUUsWUFBRixFQUFnQmtRLFFBQWhCLENBQXlCLGdCQUF6QjtBQUNELFNBSEQsTUFJSztBQUNIbFEsWUFBRSxNQUFGLEVBQVVrUSxRQUFWLENBQW1CLGdCQUFuQjtBQUNEOztBQUVEN1MsbUJBQVcsWUFBTTtBQUNmLGlCQUFLaXhCLGNBQUw7QUFDRCxTQUZELEVBRUcsQ0FGSDtBQUdEOztBQUVEOzs7OztBQTNSVztBQUFBO0FBQUEsdUNBK1JNO0FBQ2YsWUFBSXZzQixRQUFRLElBQVo7QUFDQSxhQUFLb3NCLGlCQUFMLEdBQXlCanVCLFdBQVdtSyxRQUFYLENBQW9Cb0IsYUFBcEIsQ0FBa0MsS0FBS3RLLFFBQXZDLENBQXpCOztBQUVBLFlBQUksQ0FBQyxLQUFLa1EsT0FBTCxDQUFhaWMsT0FBZCxJQUF5QixLQUFLamMsT0FBTCxDQUFhcU8sWUFBdEMsSUFBc0QsQ0FBQyxLQUFLck8sT0FBTCxDQUFhZ2MsVUFBeEUsRUFBb0Y7QUFDbEZydEIsWUFBRSxNQUFGLEVBQVVzTixFQUFWLENBQWEsaUJBQWIsRUFBZ0MsVUFBUzFKLENBQVQsRUFBWTtBQUMxQyxnQkFBSUEsRUFBRTdGLE1BQUYsS0FBYWdFLE1BQU1aLFFBQU4sQ0FBZSxDQUFmLENBQWIsSUFBa0NuQixFQUFFNGYsUUFBRixDQUFXN2QsTUFBTVosUUFBTixDQUFlLENBQWYsQ0FBWCxFQUE4QnlDLEVBQUU3RixNQUFoQyxDQUF0QyxFQUErRTtBQUFFO0FBQVM7QUFDMUZnRSxrQkFBTWdjLEtBQU47QUFDRCxXQUhEO0FBSUQ7O0FBRUQsWUFBSSxLQUFLMU0sT0FBTCxDQUFha2QsVUFBakIsRUFBNkI7QUFDM0J2dUIsWUFBRTlELE1BQUYsRUFBVW9SLEVBQVYsQ0FBYSxtQkFBYixFQUFrQyxVQUFTMUosQ0FBVCxFQUFZO0FBQzVDMUQsdUJBQVdtSyxRQUFYLENBQW9CUyxTQUFwQixDQUE4QmxILENBQTlCLEVBQWlDLFFBQWpDLEVBQTJDO0FBQ3pDbWEscUJBQU8sWUFBVztBQUNoQixvQkFBSWhjLE1BQU1zUCxPQUFOLENBQWNrZCxVQUFsQixFQUE4QjtBQUM1QnhzQix3QkFBTWdjLEtBQU47QUFDQWhjLHdCQUFNdWUsT0FBTixDQUFjaEUsS0FBZDtBQUNEO0FBQ0Y7QUFOd0MsYUFBM0M7QUFRRCxXQVREO0FBVUQ7O0FBRUQ7QUFDQSxhQUFLbmIsUUFBTCxDQUFjbU0sRUFBZCxDQUFpQixtQkFBakIsRUFBc0MsVUFBUzFKLENBQVQsRUFBWTtBQUNoRCxjQUFJNlMsVUFBVXpXLEVBQUUsSUFBRixDQUFkO0FBQ0E7QUFDQUUscUJBQVdtSyxRQUFYLENBQW9CUyxTQUFwQixDQUE4QmxILENBQTlCLEVBQWlDLFFBQWpDLEVBQTJDO0FBQ3pDMmQseUJBQWEsWUFBVztBQUN0QixrQkFBSXhmLE1BQU1aLFFBQU4sQ0FBZWtDLElBQWYsQ0FBb0IsUUFBcEIsRUFBOEJzSSxFQUE5QixDQUFpQzVKLE1BQU1vc0IsaUJBQU4sQ0FBd0JyZSxFQUF4QixDQUEyQixDQUFDLENBQTVCLENBQWpDLENBQUosRUFBc0U7QUFBRTtBQUN0RS9OLHNCQUFNb3NCLGlCQUFOLENBQXdCcmUsRUFBeEIsQ0FBMkIsQ0FBM0IsRUFBOEJ3TSxLQUE5QjtBQUNBLHVCQUFPLElBQVA7QUFDRDtBQUNELGtCQUFJdmEsTUFBTW9zQixpQkFBTixDQUF3QjFyQixNQUF4QixLQUFtQyxDQUF2QyxFQUEwQztBQUFFO0FBQzFDLHVCQUFPLElBQVA7QUFDRDtBQUNGLGFBVHdDO0FBVXpDZ2YsMEJBQWMsWUFBVztBQUN2QixrQkFBSTFmLE1BQU1aLFFBQU4sQ0FBZWtDLElBQWYsQ0FBb0IsUUFBcEIsRUFBOEJzSSxFQUE5QixDQUFpQzVKLE1BQU1vc0IsaUJBQU4sQ0FBd0JyZSxFQUF4QixDQUEyQixDQUEzQixDQUFqQyxLQUFtRS9OLE1BQU1aLFFBQU4sQ0FBZXdLLEVBQWYsQ0FBa0IsUUFBbEIsQ0FBdkUsRUFBb0c7QUFBRTtBQUNwRzVKLHNCQUFNb3NCLGlCQUFOLENBQXdCcmUsRUFBeEIsQ0FBMkIsQ0FBQyxDQUE1QixFQUErQndNLEtBQS9CO0FBQ0EsdUJBQU8sSUFBUDtBQUNEO0FBQ0Qsa0JBQUl2YSxNQUFNb3NCLGlCQUFOLENBQXdCMXJCLE1BQXhCLEtBQW1DLENBQXZDLEVBQTBDO0FBQUU7QUFDMUMsdUJBQU8sSUFBUDtBQUNEO0FBQ0YsYUFsQndDO0FBbUJ6Q3FiLGtCQUFNLFlBQVc7QUFDZixrQkFBSS9iLE1BQU1aLFFBQU4sQ0FBZWtDLElBQWYsQ0FBb0IsUUFBcEIsRUFBOEJzSSxFQUE5QixDQUFpQzVKLE1BQU1aLFFBQU4sQ0FBZWtDLElBQWYsQ0FBb0IsY0FBcEIsQ0FBakMsQ0FBSixFQUEyRTtBQUN6RWhHLDJCQUFXLFlBQVc7QUFBRTtBQUN0QjBFLHdCQUFNdWUsT0FBTixDQUFjaEUsS0FBZDtBQUNELGlCQUZELEVBRUcsQ0FGSDtBQUdELGVBSkQsTUFJTyxJQUFJN0YsUUFBUTlLLEVBQVIsQ0FBVzVKLE1BQU1vc0IsaUJBQWpCLENBQUosRUFBeUM7QUFBRTtBQUNoRHBzQixzQkFBTStiLElBQU47QUFDRDtBQUNGLGFBM0J3QztBQTRCekNDLG1CQUFPLFlBQVc7QUFDaEIsa0JBQUloYyxNQUFNc1AsT0FBTixDQUFja2QsVUFBbEIsRUFBOEI7QUFDNUJ4c0Isc0JBQU1nYyxLQUFOO0FBQ0FoYyxzQkFBTXVlLE9BQU4sQ0FBY2hFLEtBQWQ7QUFDRDtBQUNGLGFBakN3QztBQWtDekMvUSxxQkFBUyxVQUFTOEcsY0FBVCxFQUF5QjtBQUNoQyxrQkFBSUEsY0FBSixFQUFvQjtBQUNsQnpPLGtCQUFFeU8sY0FBRjtBQUNEO0FBQ0Y7QUF0Q3dDLFdBQTNDO0FBd0NELFNBM0NEO0FBNENEOztBQUVEOzs7Ozs7QUF0V1c7QUFBQTtBQUFBLDhCQTJXSDtBQUNOLFlBQUksQ0FBQyxLQUFLaUwsUUFBTixJQUFrQixDQUFDLEtBQUtuYyxRQUFMLENBQWN3SyxFQUFkLENBQWlCLFVBQWpCLENBQXZCLEVBQXFEO0FBQ25ELGlCQUFPLEtBQVA7QUFDRDtBQUNELFlBQUk1SixRQUFRLElBQVo7O0FBRUE7QUFDQSxZQUFJLEtBQUtzUCxPQUFMLENBQWFtZCxZQUFqQixFQUErQjtBQUM3QixjQUFJLEtBQUtuZCxPQUFMLENBQWFpYyxPQUFqQixFQUEwQjtBQUN4QnB0Qix1QkFBVytPLE1BQVgsQ0FBa0JLLFVBQWxCLENBQTZCLEtBQUtpZSxRQUFsQyxFQUE0QyxVQUE1QyxFQUF3RGtCLFFBQXhEO0FBQ0QsV0FGRCxNQUdLO0FBQ0hBO0FBQ0Q7O0FBRUR2dUIscUJBQVcrTyxNQUFYLENBQWtCSyxVQUFsQixDQUE2QixLQUFLbk8sUUFBbEMsRUFBNEMsS0FBS2tRLE9BQUwsQ0FBYW1kLFlBQXpEO0FBQ0Q7QUFDRDtBQVZBLGFBV0s7QUFDSCxnQkFBSSxLQUFLbmQsT0FBTCxDQUFhaWMsT0FBakIsRUFBMEI7QUFDeEIsbUJBQUtDLFFBQUwsQ0FBY2hkLElBQWQsQ0FBbUIsQ0FBbkIsRUFBc0JrZSxRQUF0QjtBQUNELGFBRkQsTUFHSztBQUNIQTtBQUNEOztBQUVELGlCQUFLdHRCLFFBQUwsQ0FBY29QLElBQWQsQ0FBbUIsS0FBS2MsT0FBTCxDQUFhcWQsU0FBaEM7QUFDRDs7QUFFRDtBQUNBLFlBQUksS0FBS3JkLE9BQUwsQ0FBYWtkLFVBQWpCLEVBQTZCO0FBQzNCdnVCLFlBQUU5RCxNQUFGLEVBQVU4WixHQUFWLENBQWMsbUJBQWQ7QUFDRDs7QUFFRCxZQUFJLENBQUMsS0FBSzNFLE9BQUwsQ0FBYWljLE9BQWQsSUFBeUIsS0FBS2pjLE9BQUwsQ0FBYXFPLFlBQTFDLEVBQXdEO0FBQ3REMWYsWUFBRSxNQUFGLEVBQVVnVyxHQUFWLENBQWMsaUJBQWQ7QUFDRDs7QUFFRCxhQUFLN1UsUUFBTCxDQUFjNlUsR0FBZCxDQUFrQixtQkFBbEI7O0FBRUEsaUJBQVN5WSxRQUFULEdBQW9CO0FBQ2xCLGNBQUkxc0IsTUFBTW9yQixRQUFWLEVBQW9CO0FBQ2xCbnRCLGNBQUUsWUFBRixFQUFnQnVGLFdBQWhCLENBQTRCLGdCQUE1QjtBQUNBLGdCQUFHeEQsTUFBTXNzQixpQkFBVCxFQUE0QjtBQUMxQnJ1QixnQkFBRSxNQUFGLEVBQVVvb0IsU0FBVixDQUFvQnJtQixNQUFNc3NCLGlCQUExQjtBQUNBdHNCLG9CQUFNc3NCLGlCQUFOLEdBQTBCLElBQTFCO0FBQ0Q7QUFDRixXQU5ELE1BT0s7QUFDSHJ1QixjQUFFLE1BQUYsRUFBVXVGLFdBQVYsQ0FBc0IsZ0JBQXRCO0FBQ0Q7O0FBRUR4RCxnQkFBTVosUUFBTixDQUFlWixJQUFmLENBQW9CLGFBQXBCLEVBQW1DLElBQW5DOztBQUVBOzs7O0FBSUF3QixnQkFBTVosUUFBTixDQUFlRSxPQUFmLENBQXVCLGtCQUF2QjtBQUNEOztBQUVEOzs7O0FBSUEsWUFBSSxLQUFLZ1EsT0FBTCxDQUFhc2QsWUFBakIsRUFBK0I7QUFDN0IsZUFBS3h0QixRQUFMLENBQWNvbEIsSUFBZCxDQUFtQixLQUFLcGxCLFFBQUwsQ0FBY29sQixJQUFkLEVBQW5CO0FBQ0Q7O0FBRUQsYUFBS2pKLFFBQUwsR0FBZ0IsS0FBaEI7QUFDQyxZQUFJdmIsTUFBTXNQLE9BQU4sQ0FBY29jLFFBQWxCLEVBQTRCO0FBQzFCLGNBQUl2eEIsT0FBT3VzQixPQUFQLENBQWVtRyxZQUFuQixFQUFpQztBQUMvQjF5QixtQkFBT3VzQixPQUFQLENBQWVtRyxZQUFmLENBQTRCLEVBQTVCLEVBQWdDenZCLFNBQVMwdkIsS0FBekMsRUFBZ0QzeUIsT0FBTzByQixRQUFQLENBQWdCa0gsUUFBaEU7QUFDRCxXQUZELE1BRU87QUFDTDV5QixtQkFBTzByQixRQUFQLENBQWdCQyxJQUFoQixHQUF1QixFQUF2QjtBQUNEO0FBQ0Y7QUFDSDs7QUFFRDs7Ozs7QUExYlc7QUFBQTtBQUFBLCtCQThiRjtBQUNQLFlBQUksS0FBS3ZLLFFBQVQsRUFBbUI7QUFDakIsZUFBS1MsS0FBTDtBQUNELFNBRkQsTUFFTztBQUNMLGVBQUtELElBQUw7QUFDRDtBQUNGO0FBcGNVO0FBQUE7OztBQXNjWDs7OztBQXRjVyxnQ0EwY0Q7QUFDUixZQUFJLEtBQUt6TSxPQUFMLENBQWFpYyxPQUFqQixFQUEwQjtBQUN4QixlQUFLbnNCLFFBQUwsQ0FBY2tFLFFBQWQsQ0FBdUJyRixFQUFFLE1BQUYsQ0FBdkIsRUFEd0IsQ0FDVztBQUNuQyxlQUFLdXRCLFFBQUwsQ0FBY2hkLElBQWQsR0FBcUJ5RixHQUFyQixHQUEyQm1LLE1BQTNCO0FBQ0Q7QUFDRCxhQUFLaGYsUUFBTCxDQUFjb1AsSUFBZCxHQUFxQnlGLEdBQXJCO0FBQ0EsYUFBS3NLLE9BQUwsQ0FBYXRLLEdBQWIsQ0FBaUIsS0FBakI7QUFDQWhXLFVBQUU5RCxNQUFGLEVBQVU4WixHQUFWLGlCQUE0QixLQUFLbEksRUFBakM7O0FBRUE1TixtQkFBV29CLGdCQUFYLENBQTRCLElBQTVCO0FBQ0Q7QUFwZFU7O0FBQUE7QUFBQTs7QUF1ZGIwckIsU0FBTzdWLFFBQVAsR0FBa0I7QUFDaEI7Ozs7O0FBS0E2VyxpQkFBYSxFQU5HO0FBT2hCOzs7OztBQUtBUSxrQkFBYyxFQVpFO0FBYWhCOzs7OztBQUtBSixlQUFXLENBbEJLO0FBbUJoQjs7Ozs7QUFLQU0sZUFBVyxDQXhCSztBQXlCaEI7Ozs7O0FBS0FoUCxrQkFBYyxJQTlCRTtBQStCaEI7Ozs7O0FBS0E2TyxnQkFBWSxJQXBDSTtBQXFDaEI7Ozs7O0FBS0FSLG9CQUFnQixLQTFDQTtBQTJDaEI7Ozs7O0FBS0Fqa0IsYUFBUyxNQWhETztBQWlEaEI7Ozs7O0FBS0FDLGFBQVMsTUF0RE87QUF1RGhCOzs7OztBQUtBc2pCLGdCQUFZLEtBNURJO0FBNkRoQjs7Ozs7QUFLQTBCLGtCQUFjLEVBbEVFO0FBbUVoQjs7Ozs7QUFLQXpCLGFBQVMsSUF4RU87QUF5RWhCOzs7OztBQUtBcUIsa0JBQWMsS0E5RUU7QUErRWhCOzs7OztBQUtBbEIsY0FBVTtBQXBGTSxHQUFsQjs7QUF1RkE7QUFDQXZ0QixhQUFXTSxNQUFYLENBQWtCd3NCLE1BQWxCLEVBQTBCLFFBQTFCOztBQUVBLFdBQVNnQyxXQUFULEdBQXVCO0FBQ3JCLFdBQU8sc0JBQXFCM29CLElBQXJCLENBQTBCbkssT0FBT29LLFNBQVAsQ0FBaUJDLFNBQTNDO0FBQVA7QUFDRDs7QUFFRCxXQUFTMG9CLFlBQVQsR0FBd0I7QUFDdEIsV0FBTyxXQUFVNW9CLElBQVYsQ0FBZW5LLE9BQU9vSyxTQUFQLENBQWlCQyxTQUFoQztBQUFQO0FBQ0Q7O0FBRUQsV0FBUzZtQixXQUFULEdBQXVCO0FBQ3JCLFdBQU80QixpQkFBaUJDLGNBQXhCO0FBQ0Q7QUFFQSxDQTdqQkEsQ0E2akJDcG5CLE1BN2pCRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7OztBQUZhLE1BU1BrdkIsTUFUTztBQVVYOzs7Ozs7QUFNQSxvQkFBWWhuQixPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYTZqQixPQUFPL1gsUUFBcEIsRUFBOEIsS0FBS2hXLFFBQUwsQ0FBY0MsSUFBZCxFQUE5QixFQUFvRGlRLE9BQXBELENBQWY7O0FBRUEsV0FBS3ZQLEtBQUw7O0FBRUE1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxRQUFoQztBQUNEOztBQUVEOzs7Ozs7O0FBekJXO0FBQUE7QUFBQSw4QkE4Qkg7QUFDTixZQUFJcXVCLFVBQVUsS0FBS2h1QixRQUFMLENBQWNnSCxNQUFkLENBQXFCLHlCQUFyQixDQUFkO0FBQUEsWUFDSTJGLEtBQUssS0FBSzNNLFFBQUwsQ0FBYyxDQUFkLEVBQWlCMk0sRUFBakIsSUFBdUI1TixXQUFXZ0IsV0FBWCxDQUF1QixDQUF2QixFQUEwQixRQUExQixDQURoQztBQUFBLFlBRUlhLFFBQVEsSUFGWjs7QUFJQSxZQUFJLENBQUNvdEIsUUFBUTFzQixNQUFiLEVBQXFCO0FBQ25CLGVBQUsyc0IsVUFBTCxHQUFrQixJQUFsQjtBQUNEO0FBQ0QsYUFBS0MsVUFBTCxHQUFrQkYsUUFBUTFzQixNQUFSLEdBQWlCMHNCLE9BQWpCLEdBQTJCbnZCLEVBQUUsS0FBS3FSLE9BQUwsQ0FBYWllLFNBQWYsRUFBMEJDLFNBQTFCLENBQW9DLEtBQUtwdUIsUUFBekMsQ0FBN0M7QUFDQSxhQUFLa3VCLFVBQUwsQ0FBZ0JuZixRQUFoQixDQUF5QixLQUFLbUIsT0FBTCxDQUFhdVgsY0FBdEM7O0FBRUEsYUFBS3puQixRQUFMLENBQWMrTyxRQUFkLENBQXVCLEtBQUttQixPQUFMLENBQWFtZSxXQUFwQyxFQUNjanZCLElBRGQsQ0FDbUIsRUFBQyxlQUFldU4sRUFBaEIsRUFEbkI7O0FBR0EsYUFBSzJoQixXQUFMLEdBQW1CLEtBQUtwZSxPQUFMLENBQWFxZSxVQUFoQztBQUNBLGFBQUtDLE9BQUwsR0FBZSxLQUFmO0FBQ0EzdkIsVUFBRTlELE1BQUYsRUFBVW1VLEdBQVYsQ0FBYyxnQkFBZCxFQUFnQyxZQUFVO0FBQ3hDLGNBQUd0TyxNQUFNc1AsT0FBTixDQUFjekgsTUFBZCxLQUF5QixFQUE1QixFQUErQjtBQUM3QjdILGtCQUFNdWUsT0FBTixHQUFnQnRnQixFQUFFLE1BQU0rQixNQUFNc1AsT0FBTixDQUFjekgsTUFBdEIsQ0FBaEI7QUFDRCxXQUZELE1BRUs7QUFDSDdILGtCQUFNNnRCLFlBQU47QUFDRDs7QUFFRDd0QixnQkFBTTh0QixTQUFOLENBQWdCLFlBQVU7QUFDeEI5dEIsa0JBQU0rdEIsS0FBTixDQUFZLEtBQVo7QUFDRCxXQUZEO0FBR0EvdEIsZ0JBQU1zVixPQUFOLENBQWN2SixHQUFHbkssS0FBSCxDQUFTLEdBQVQsRUFBY29zQixPQUFkLEdBQXdCaGEsSUFBeEIsQ0FBNkIsR0FBN0IsQ0FBZDtBQUNELFNBWEQ7QUFZRDs7QUFFRDs7Ozs7O0FBNURXO0FBQUE7QUFBQSxxQ0FpRUk7QUFDYixZQUFJeE4sTUFBTSxLQUFLOEksT0FBTCxDQUFhMmUsU0FBYixJQUEwQixFQUExQixHQUErQixDQUEvQixHQUFtQyxLQUFLM2UsT0FBTCxDQUFhMmUsU0FBMUQ7QUFBQSxZQUNJQyxNQUFNLEtBQUs1ZSxPQUFMLENBQWE2ZSxTQUFiLElBQXlCLEVBQXpCLEdBQThCL3dCLFNBQVNpVCxlQUFULENBQXlCK1UsWUFBdkQsR0FBc0UsS0FBSzlWLE9BQUwsQ0FBYTZlLFNBRDdGO0FBQUEsWUFFSUMsTUFBTSxDQUFDNW5CLEdBQUQsRUFBTTBuQixHQUFOLENBRlY7QUFBQSxZQUdJRyxTQUFTLEVBSGI7QUFJQSxhQUFLLElBQUlqdEIsSUFBSSxDQUFSLEVBQVdnaUIsTUFBTWdMLElBQUkxdEIsTUFBMUIsRUFBa0NVLElBQUlnaUIsR0FBSixJQUFXZ0wsSUFBSWh0QixDQUFKLENBQTdDLEVBQXFEQSxHQUFyRCxFQUEwRDtBQUN4RCxjQUFJa2tCLEVBQUo7QUFDQSxjQUFJLE9BQU84SSxJQUFJaHRCLENBQUosQ0FBUCxLQUFrQixRQUF0QixFQUFnQztBQUM5QmtrQixpQkFBSzhJLElBQUlodEIsQ0FBSixDQUFMO0FBQ0QsV0FGRCxNQUVPO0FBQ0wsZ0JBQUlrdEIsUUFBUUYsSUFBSWh0QixDQUFKLEVBQU9RLEtBQVAsQ0FBYSxHQUFiLENBQVo7QUFBQSxnQkFDSWlHLFNBQVM1SixRQUFNcXdCLE1BQU0sQ0FBTixDQUFOLENBRGI7O0FBR0FoSixpQkFBS3pkLE9BQU9oQixNQUFQLEdBQWdCTCxHQUFyQjtBQUNBLGdCQUFJOG5CLE1BQU0sQ0FBTixLQUFZQSxNQUFNLENBQU4sRUFBU255QixXQUFULE9BQTJCLFFBQTNDLEVBQXFEO0FBQ25EbXBCLG9CQUFNemQsT0FBTyxDQUFQLEVBQVVULHFCQUFWLEdBQWtDTixNQUF4QztBQUNEO0FBQ0Y7QUFDRHVuQixpQkFBT2p0QixDQUFQLElBQVlra0IsRUFBWjtBQUNEOztBQUdELGFBQUtQLE1BQUwsR0FBY3NKLE1BQWQ7QUFDQTtBQUNEOztBQUVEOzs7Ozs7QUEzRlc7QUFBQTtBQUFBLDhCQWdHSHRpQixFQWhHRyxFQWdHQztBQUNWLFlBQUkvTCxRQUFRLElBQVo7QUFBQSxZQUNJMlQsaUJBQWlCLEtBQUtBLGNBQUwsa0JBQW1DNUgsRUFEeEQ7QUFFQSxZQUFJLEtBQUtpVyxJQUFULEVBQWU7QUFBRTtBQUFTO0FBQzFCLFlBQUksS0FBS3VNLFFBQVQsRUFBbUI7QUFDakIsZUFBS3ZNLElBQUwsR0FBWSxJQUFaO0FBQ0EvakIsWUFBRTlELE1BQUYsRUFBVThaLEdBQVYsQ0FBY04sY0FBZCxFQUNVcEksRUFEVixDQUNhb0ksY0FEYixFQUM2QixVQUFTOVIsQ0FBVCxFQUFZO0FBQzlCLGdCQUFJN0IsTUFBTTB0QixXQUFOLEtBQXNCLENBQTFCLEVBQTZCO0FBQzNCMXRCLG9CQUFNMHRCLFdBQU4sR0FBb0IxdEIsTUFBTXNQLE9BQU4sQ0FBY3FlLFVBQWxDO0FBQ0EzdEIsb0JBQU04dEIsU0FBTixDQUFnQixZQUFXO0FBQ3pCOXRCLHNCQUFNK3RCLEtBQU4sQ0FBWSxLQUFaLEVBQW1CNXpCLE9BQU9zTixXQUExQjtBQUNELGVBRkQ7QUFHRCxhQUxELE1BS087QUFDTHpILG9CQUFNMHRCLFdBQU47QUFDQTF0QixvQkFBTSt0QixLQUFOLENBQVksS0FBWixFQUFtQjV6QixPQUFPc04sV0FBMUI7QUFDRDtBQUNILFdBWFQ7QUFZRDs7QUFFRCxhQUFLckksUUFBTCxDQUFjNlUsR0FBZCxDQUFrQixxQkFBbEIsRUFDYzFJLEVBRGQsQ0FDaUIscUJBRGpCLEVBQ3dDLFVBQVMxSixDQUFULEVBQVlHLEVBQVosRUFBZ0I7QUFDdkNoQyxnQkFBTTh0QixTQUFOLENBQWdCLFlBQVc7QUFDekI5dEIsa0JBQU0rdEIsS0FBTixDQUFZLEtBQVo7QUFDQSxnQkFBSS90QixNQUFNdXVCLFFBQVYsRUFBb0I7QUFDbEIsa0JBQUksQ0FBQ3Z1QixNQUFNZ2lCLElBQVgsRUFBaUI7QUFDZmhpQixzQkFBTXNWLE9BQU4sQ0FBY3ZKLEVBQWQ7QUFDRDtBQUNGLGFBSkQsTUFJTyxJQUFJL0wsTUFBTWdpQixJQUFWLEVBQWdCO0FBQ3JCaGlCLG9CQUFNd3VCLGVBQU4sQ0FBc0I3YSxjQUF0QjtBQUNEO0FBQ0YsV0FURDtBQVVoQixTQVpEO0FBYUQ7O0FBRUQ7Ozs7OztBQW5JVztBQUFBO0FBQUEsc0NBd0lLQSxjQXhJTCxFQXdJcUI7QUFDOUIsYUFBS3FPLElBQUwsR0FBWSxLQUFaO0FBQ0EvakIsVUFBRTlELE1BQUYsRUFBVThaLEdBQVYsQ0FBY04sY0FBZDs7QUFFQTs7Ozs7QUFLQyxhQUFLdlUsUUFBTCxDQUFjRSxPQUFkLENBQXNCLGlCQUF0QjtBQUNGOztBQUVEOzs7Ozs7O0FBcEpXO0FBQUE7QUFBQSw0QkEwSkxtdkIsVUExSkssRUEwSk9DLE1BMUpQLEVBMEplO0FBQ3hCLFlBQUlELFVBQUosRUFBZ0I7QUFBRSxlQUFLWCxTQUFMO0FBQW1COztBQUVyQyxZQUFJLENBQUMsS0FBS1MsUUFBVixFQUFvQjtBQUNsQixjQUFJLEtBQUtYLE9BQVQsRUFBa0I7QUFDaEIsaUJBQUtlLGFBQUwsQ0FBbUIsSUFBbkI7QUFDRDtBQUNELGlCQUFPLEtBQVA7QUFDRDs7QUFFRCxZQUFJLENBQUNELE1BQUwsRUFBYTtBQUFFQSxtQkFBU3YwQixPQUFPc04sV0FBaEI7QUFBOEI7O0FBRTdDLFlBQUlpbkIsVUFBVSxLQUFLRSxRQUFuQixFQUE2QjtBQUMzQixjQUFJRixVQUFVLEtBQUtHLFdBQW5CLEVBQWdDO0FBQzlCLGdCQUFJLENBQUMsS0FBS2pCLE9BQVYsRUFBbUI7QUFDakIsbUJBQUtrQixVQUFMO0FBQ0Q7QUFDRixXQUpELE1BSU87QUFDTCxnQkFBSSxLQUFLbEIsT0FBVCxFQUFrQjtBQUNoQixtQkFBS2UsYUFBTCxDQUFtQixLQUFuQjtBQUNEO0FBQ0Y7QUFDRixTQVZELE1BVU87QUFDTCxjQUFJLEtBQUtmLE9BQVQsRUFBa0I7QUFDaEIsaUJBQUtlLGFBQUwsQ0FBbUIsSUFBbkI7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQ7Ozs7Ozs7O0FBdkxXO0FBQUE7QUFBQSxtQ0E4TEU7QUFDWCxZQUFJM3VCLFFBQVEsSUFBWjtBQUFBLFlBQ0krdUIsVUFBVSxLQUFLemYsT0FBTCxDQUFheWYsT0FEM0I7QUFBQSxZQUVJQyxPQUFPRCxZQUFZLEtBQVosR0FBb0IsV0FBcEIsR0FBa0MsY0FGN0M7QUFBQSxZQUdJRSxhQUFhRixZQUFZLEtBQVosR0FBb0IsUUFBcEIsR0FBK0IsS0FIaEQ7QUFBQSxZQUlJcmtCLE1BQU0sRUFKVjs7QUFNQUEsWUFBSXNrQixJQUFKLElBQWUsS0FBSzFmLE9BQUwsQ0FBYTBmLElBQWIsQ0FBZjtBQUNBdGtCLFlBQUlxa0IsT0FBSixJQUFlLENBQWY7QUFDQXJrQixZQUFJdWtCLFVBQUosSUFBa0IsTUFBbEI7QUFDQXZrQixZQUFJLE1BQUosSUFBYyxLQUFLNGlCLFVBQUwsQ0FBZ0J6bUIsTUFBaEIsR0FBeUJILElBQXpCLEdBQWdDb2UsU0FBUzNxQixPQUFPOFIsZ0JBQVAsQ0FBd0IsS0FBS3FoQixVQUFMLENBQWdCLENBQWhCLENBQXhCLEVBQTRDLGNBQTVDLENBQVQsRUFBc0UsRUFBdEUsQ0FBOUM7QUFDQSxhQUFLTSxPQUFMLEdBQWUsSUFBZjtBQUNBLGFBQUt4dUIsUUFBTCxDQUFjb0UsV0FBZCx3QkFBK0N5ckIsVUFBL0MsRUFDYzlnQixRQURkLHFCQUN5QzRnQixPQUR6QyxFQUVjcmtCLEdBRmQsQ0FFa0JBLEdBRmxCO0FBR2E7Ozs7O0FBSGIsU0FRY3BMLE9BUmQsd0JBUTJDeXZCLE9BUjNDO0FBU0EsYUFBSzN2QixRQUFMLENBQWNtTSxFQUFkLENBQWlCLGlGQUFqQixFQUFvRyxZQUFXO0FBQzdHdkwsZ0JBQU04dEIsU0FBTjtBQUNELFNBRkQ7QUFHRDs7QUFFRDs7Ozs7Ozs7O0FBeE5XO0FBQUE7QUFBQSxvQ0FnT0dvQixLQWhPSCxFQWdPVTtBQUNuQixZQUFJSCxVQUFVLEtBQUt6ZixPQUFMLENBQWF5ZixPQUEzQjtBQUFBLFlBQ0lJLGFBQWFKLFlBQVksS0FEN0I7QUFBQSxZQUVJcmtCLE1BQU0sRUFGVjtBQUFBLFlBR0kwa0IsV0FBVyxDQUFDLEtBQUtySyxNQUFMLEdBQWMsS0FBS0EsTUFBTCxDQUFZLENBQVosSUFBaUIsS0FBS0EsTUFBTCxDQUFZLENBQVosQ0FBL0IsR0FBZ0QsS0FBS3NLLFlBQXRELElBQXNFLEtBQUtDLFVBSDFGO0FBQUEsWUFJSU4sT0FBT0csYUFBYSxXQUFiLEdBQTJCLGNBSnRDO0FBQUEsWUFLSUYsYUFBYUUsYUFBYSxRQUFiLEdBQXdCLEtBTHpDO0FBQUEsWUFNSUksY0FBY0wsUUFBUSxLQUFSLEdBQWdCLFFBTmxDOztBQVFBeGtCLFlBQUlza0IsSUFBSixJQUFZLENBQVo7O0FBRUF0a0IsWUFBSSxRQUFKLElBQWdCLE1BQWhCO0FBQ0EsWUFBR3drQixLQUFILEVBQVU7QUFDUnhrQixjQUFJLEtBQUosSUFBYSxDQUFiO0FBQ0QsU0FGRCxNQUVPO0FBQ0xBLGNBQUksS0FBSixJQUFhMGtCLFFBQWI7QUFDRDs7QUFFRDFrQixZQUFJLE1BQUosSUFBYyxFQUFkO0FBQ0EsYUFBS2tqQixPQUFMLEdBQWUsS0FBZjtBQUNBLGFBQUt4dUIsUUFBTCxDQUFjb0UsV0FBZCxxQkFBNEN1ckIsT0FBNUMsRUFDYzVnQixRQURkLHdCQUM0Q29oQixXQUQ1QyxFQUVjN2tCLEdBRmQsQ0FFa0JBLEdBRmxCO0FBR2E7Ozs7O0FBSGIsU0FRY3BMLE9BUmQsNEJBUStDaXdCLFdBUi9DO0FBU0Q7O0FBRUQ7Ozs7Ozs7QUEvUFc7QUFBQTtBQUFBLGdDQXFRRGxpQixFQXJRQyxFQXFRRztBQUNaLGFBQUtraEIsUUFBTCxHQUFnQnB3QixXQUFXc0YsVUFBWCxDQUFzQnVILE9BQXRCLENBQThCLEtBQUtzRSxPQUFMLENBQWFrZ0IsUUFBM0MsQ0FBaEI7QUFDQSxZQUFJLENBQUMsS0FBS2pCLFFBQVYsRUFBb0I7QUFBRWxoQjtBQUFPO0FBQzdCLFlBQUlyTixRQUFRLElBQVo7QUFBQSxZQUNJeXZCLGVBQWUsS0FBS25DLFVBQUwsQ0FBZ0IsQ0FBaEIsRUFBbUJsbUIscUJBQW5CLEdBQTJDTCxLQUQ5RDtBQUFBLFlBRUkyb0IsT0FBT3YxQixPQUFPOFIsZ0JBQVAsQ0FBd0IsS0FBS3FoQixVQUFMLENBQWdCLENBQWhCLENBQXhCLENBRlg7QUFBQSxZQUdJcUMsT0FBTzdLLFNBQVM0SyxLQUFLLGVBQUwsQ0FBVCxFQUFnQyxFQUFoQyxDQUhYOztBQUtBLFlBQUksS0FBS25SLE9BQUwsSUFBZ0IsS0FBS0EsT0FBTCxDQUFhN2QsTUFBakMsRUFBeUM7QUFDdkMsZUFBSzJ1QixZQUFMLEdBQW9CLEtBQUs5USxPQUFMLENBQWEsQ0FBYixFQUFnQm5YLHFCQUFoQixHQUF3Q04sTUFBNUQ7QUFDRCxTQUZELE1BRU87QUFDTCxlQUFLK21CLFlBQUw7QUFDRDs7QUFFRCxhQUFLenVCLFFBQUwsQ0FBY3NMLEdBQWQsQ0FBa0I7QUFDaEIsdUJBQWdCK2tCLGVBQWVFLElBQS9CO0FBRGdCLFNBQWxCOztBQUlBLFlBQUlDLHFCQUFxQixLQUFLeHdCLFFBQUwsQ0FBYyxDQUFkLEVBQWlCZ0kscUJBQWpCLEdBQXlDTixNQUF6QyxJQUFtRCxLQUFLK29CLGVBQWpGO0FBQ0EsWUFBSSxLQUFLendCLFFBQUwsQ0FBY3NMLEdBQWQsQ0FBa0IsU0FBbEIsS0FBZ0MsTUFBcEMsRUFBNEM7QUFDMUNrbEIsK0JBQXFCLENBQXJCO0FBQ0Q7QUFDRCxhQUFLQyxlQUFMLEdBQXVCRCxrQkFBdkI7QUFDQSxhQUFLdEMsVUFBTCxDQUFnQjVpQixHQUFoQixDQUFvQjtBQUNsQjVELGtCQUFROG9CO0FBRFUsU0FBcEI7QUFHQSxhQUFLTixVQUFMLEdBQWtCTSxrQkFBbEI7O0FBRUQsWUFBSSxLQUFLaEMsT0FBVCxFQUFrQjtBQUNqQixlQUFLeHVCLFFBQUwsQ0FBY3NMLEdBQWQsQ0FBa0IsRUFBQyxRQUFPLEtBQUs0aUIsVUFBTCxDQUFnQnptQixNQUFoQixHQUF5QkgsSUFBekIsR0FBZ0NvZSxTQUFTNEssS0FBSyxjQUFMLENBQVQsRUFBK0IsRUFBL0IsQ0FBeEMsRUFBbEI7QUFDQTs7QUFFQSxhQUFLSSxlQUFMLENBQXFCRixrQkFBckIsRUFBeUMsWUFBVztBQUNsRCxjQUFJdmlCLEVBQUosRUFBUTtBQUFFQTtBQUFPO0FBQ2xCLFNBRkQ7QUFHRDs7QUFFRDs7Ozs7OztBQTFTVztBQUFBO0FBQUEsc0NBZ1RLaWlCLFVBaFRMLEVBZ1RpQmppQixFQWhUakIsRUFnVHFCO0FBQzlCLFlBQUksQ0FBQyxLQUFLa2hCLFFBQVYsRUFBb0I7QUFDbEIsY0FBSWxoQixFQUFKLEVBQVE7QUFBRUE7QUFBTyxXQUFqQixNQUNLO0FBQUUsbUJBQU8sS0FBUDtBQUFlO0FBQ3ZCO0FBQ0QsWUFBSTBpQixPQUFPQyxPQUFPLEtBQUsxZ0IsT0FBTCxDQUFhMmdCLFNBQXBCLENBQVg7QUFBQSxZQUNJQyxPQUFPRixPQUFPLEtBQUsxZ0IsT0FBTCxDQUFhNmdCLFlBQXBCLENBRFg7QUFBQSxZQUVJdkIsV0FBVyxLQUFLN0osTUFBTCxHQUFjLEtBQUtBLE1BQUwsQ0FBWSxDQUFaLENBQWQsR0FBK0IsS0FBS3hHLE9BQUwsQ0FBYTFYLE1BQWIsR0FBc0JMLEdBRnBFO0FBQUEsWUFHSXFvQixjQUFjLEtBQUs5SixNQUFMLEdBQWMsS0FBS0EsTUFBTCxDQUFZLENBQVosQ0FBZCxHQUErQjZKLFdBQVcsS0FBS1MsWUFIakU7O0FBSUk7QUFDQTtBQUNBckssb0JBQVk3cUIsT0FBTzhxQixXQU52Qjs7QUFRQSxZQUFJLEtBQUszVixPQUFMLENBQWF5ZixPQUFiLEtBQXlCLEtBQTdCLEVBQW9DO0FBQ2xDSCxzQkFBWW1CLElBQVo7QUFDQWxCLHlCQUFnQlMsYUFBYVMsSUFBN0I7QUFDRCxTQUhELE1BR08sSUFBSSxLQUFLemdCLE9BQUwsQ0FBYXlmLE9BQWIsS0FBeUIsUUFBN0IsRUFBdUM7QUFDNUNILHNCQUFhNUosYUFBYXNLLGFBQWFZLElBQTFCLENBQWI7QUFDQXJCLHlCQUFnQjdKLFlBQVlrTCxJQUE1QjtBQUNELFNBSE0sTUFHQTtBQUNMO0FBQ0Q7O0FBRUQsYUFBS3RCLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0EsYUFBS0MsV0FBTCxHQUFtQkEsV0FBbkI7O0FBRUEsWUFBSXhoQixFQUFKLEVBQVE7QUFBRUE7QUFBTztBQUNsQjs7QUFFRDs7Ozs7OztBQTdVVztBQUFBO0FBQUEsZ0NBbVZEO0FBQ1IsYUFBS3NoQixhQUFMLENBQW1CLElBQW5COztBQUVBLGFBQUt2dkIsUUFBTCxDQUFjb0UsV0FBZCxDQUE2QixLQUFLOEwsT0FBTCxDQUFhbWUsV0FBMUMsNkJBQ2MvaUIsR0FEZCxDQUNrQjtBQUNINUQsa0JBQVEsRUFETDtBQUVITixlQUFLLEVBRkY7QUFHSEMsa0JBQVEsRUFITDtBQUlILHVCQUFhO0FBSlYsU0FEbEIsRUFPY3dOLEdBUGQsQ0FPa0IscUJBUGxCO0FBUUEsWUFBSSxLQUFLc0ssT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWE3ZCxNQUFqQyxFQUF5QztBQUN2QyxlQUFLNmQsT0FBTCxDQUFhdEssR0FBYixDQUFpQixrQkFBakI7QUFDRDtBQUNEaFcsVUFBRTlELE1BQUYsRUFBVThaLEdBQVYsQ0FBYyxLQUFLTixjQUFuQjs7QUFFQSxZQUFJLEtBQUswWixVQUFULEVBQXFCO0FBQ25CLGVBQUtqdUIsUUFBTCxDQUFjK2UsTUFBZDtBQUNELFNBRkQsTUFFTztBQUNMLGVBQUttUCxVQUFMLENBQWdCOXBCLFdBQWhCLENBQTRCLEtBQUs4TCxPQUFMLENBQWF1WCxjQUF6QyxFQUNnQm5jLEdBRGhCLENBQ29CO0FBQ0g1RCxvQkFBUTtBQURMLFdBRHBCO0FBSUQ7QUFDRDNJLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQTVXVTs7QUFBQTtBQUFBOztBQStXYjR0QixTQUFPL1gsUUFBUCxHQUFrQjtBQUNoQjs7Ozs7QUFLQW1ZLGVBQVcsbUNBTks7QUFPaEI7Ozs7O0FBS0F3QixhQUFTLEtBWk87QUFhaEI7Ozs7O0FBS0FsbkIsWUFBUSxFQWxCUTtBQW1CaEI7Ozs7O0FBS0FvbUIsZUFBVyxFQXhCSztBQXlCaEI7Ozs7O0FBS0FFLGVBQVcsRUE5Qks7QUErQmhCOzs7OztBQUtBOEIsZUFBVyxDQXBDSztBQXFDaEI7Ozs7O0FBS0FFLGtCQUFjLENBMUNFO0FBMkNoQjs7Ozs7QUFLQVgsY0FBVSxRQWhETTtBQWlEaEI7Ozs7O0FBS0EvQixpQkFBYSxRQXRERztBQXVEaEI7Ozs7O0FBS0E1RyxvQkFBZ0Isa0JBNURBO0FBNkRoQjs7Ozs7QUFLQThHLGdCQUFZLENBQUM7QUFsRUcsR0FBbEI7O0FBcUVBOzs7O0FBSUEsV0FBU3FDLE1BQVQsQ0FBZ0JJLEVBQWhCLEVBQW9CO0FBQ2xCLFdBQU90TCxTQUFTM3FCLE9BQU84UixnQkFBUCxDQUF3QjdPLFNBQVM5QyxJQUFqQyxFQUF1QyxJQUF2QyxFQUE2QysxQixRQUF0RCxFQUFnRSxFQUFoRSxJQUFzRUQsRUFBN0U7QUFDRDs7QUFFRDtBQUNBanlCLGFBQVdNLE1BQVgsQ0FBa0IwdUIsTUFBbEIsRUFBMEIsUUFBMUI7QUFFQyxDQS9iQSxDQStiQ3JuQixNQS9iRCxDQUFEO0NDRkE7Ozs7OztBQUVBLENBQUMsVUFBUzdILENBQVQsRUFBWTs7QUFFYjs7Ozs7OztBQUZhLE1BU1BxeUIsSUFUTztBQVVYOzs7Ozs7O0FBT0Esa0JBQVlucUIsT0FBWixFQUFxQm1KLE9BQXJCLEVBQThCO0FBQUE7O0FBQzVCLFdBQUtsUSxRQUFMLEdBQWdCK0csT0FBaEI7QUFDQSxXQUFLbUosT0FBTCxHQUFlclIsRUFBRXFMLE1BQUYsQ0FBUyxFQUFULEVBQWFnbkIsS0FBS2xiLFFBQWxCLEVBQTRCLEtBQUtoVyxRQUFMLENBQWNDLElBQWQsRUFBNUIsRUFBa0RpUSxPQUFsRCxDQUFmOztBQUVBLFdBQUt2UCxLQUFMO0FBQ0E1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxNQUFoQztBQUNBWixpQkFBV21LLFFBQVgsQ0FBb0J1QixRQUFwQixDQUE2QixNQUE3QixFQUFxQztBQUNuQyxpQkFBUyxNQUQwQjtBQUVuQyxpQkFBUyxNQUYwQjtBQUduQyx1QkFBZSxNQUhvQjtBQUluQyxvQkFBWSxVQUp1QjtBQUtuQyxzQkFBYyxNQUxxQjtBQU1uQyxzQkFBYztBQUNkO0FBQ0E7QUFSbUMsT0FBckM7QUFVRDs7QUFFRDs7Ozs7O0FBbkNXO0FBQUE7QUFBQSw4QkF1Q0g7QUFDTixZQUFJN0osUUFBUSxJQUFaOztBQUVBLGFBQUt1d0IsVUFBTCxHQUFrQixLQUFLbnhCLFFBQUwsQ0FBY2tDLElBQWQsT0FBdUIsS0FBS2dPLE9BQUwsQ0FBYWtoQixTQUFwQyxDQUFsQjtBQUNBLGFBQUt4VyxXQUFMLEdBQW1CL2IsMkJBQXlCLEtBQUttQixRQUFMLENBQWMsQ0FBZCxFQUFpQjJNLEVBQTFDLFFBQW5COztBQUVBLGFBQUt3a0IsVUFBTCxDQUFnQnp3QixJQUFoQixDQUFxQixZQUFVO0FBQzdCLGNBQUl1QixRQUFRcEQsRUFBRSxJQUFGLENBQVo7QUFBQSxjQUNJNGUsUUFBUXhiLE1BQU1DLElBQU4sQ0FBVyxHQUFYLENBRFo7QUFBQSxjQUVJaWEsV0FBV2xhLE1BQU00WSxRQUFOLENBQWUsV0FBZixDQUZmO0FBQUEsY0FHSTZMLE9BQU9qSixNQUFNLENBQU4sRUFBU2lKLElBQVQsQ0FBYzdrQixLQUFkLENBQW9CLENBQXBCLENBSFg7QUFBQSxjQUlJNFksU0FBU2dELE1BQU0sQ0FBTixFQUFTOVEsRUFBVCxHQUFjOFEsTUFBTSxDQUFOLEVBQVM5USxFQUF2QixHQUErQitaLElBQS9CLFdBSmI7QUFBQSxjQUtJOUwsY0FBYy9iLFFBQU02bkIsSUFBTixDQUxsQjs7QUFPQXprQixnQkFBTTdDLElBQU4sQ0FBVyxFQUFDLFFBQVEsY0FBVCxFQUFYOztBQUVBcWUsZ0JBQU1yZSxJQUFOLENBQVc7QUFDVCxvQkFBUSxLQURDO0FBRVQsNkJBQWlCc25CLElBRlI7QUFHVCw2QkFBaUJ2SyxRQUhSO0FBSVQsa0JBQU0xQjtBQUpHLFdBQVg7O0FBT0FHLHNCQUFZeGIsSUFBWixDQUFpQjtBQUNmLG9CQUFRLFVBRE87QUFFZiwyQkFBZSxDQUFDK2MsUUFGRDtBQUdmLCtCQUFtQjFCO0FBSEosV0FBakI7O0FBTUEsY0FBRzBCLFlBQVl2YixNQUFNc1AsT0FBTixDQUFjcVEsU0FBN0IsRUFBdUM7QUFDckM5QyxrQkFBTXRDLEtBQU47QUFDRDtBQUNGLFNBMUJEOztBQTRCQSxZQUFHLEtBQUtqTCxPQUFMLENBQWFtaEIsV0FBaEIsRUFBNkI7QUFDM0IsY0FBSXpKLFVBQVUsS0FBS2hOLFdBQUwsQ0FBaUIxWSxJQUFqQixDQUFzQixLQUF0QixDQUFkOztBQUVBLGNBQUkwbEIsUUFBUXRtQixNQUFaLEVBQW9CO0FBQ2xCdkMsdUJBQVcwUixjQUFYLENBQTBCbVgsT0FBMUIsRUFBbUMsS0FBSzBKLFVBQUwsQ0FBZ0IxckIsSUFBaEIsQ0FBcUIsSUFBckIsQ0FBbkM7QUFDRCxXQUZELE1BRU87QUFDTCxpQkFBSzByQixVQUFMO0FBQ0Q7QUFDRjs7QUFFRCxhQUFLcGIsT0FBTDtBQUNEOztBQUVEOzs7OztBQXRGVztBQUFBO0FBQUEsZ0NBMEZEO0FBQ1IsYUFBS3FiLGNBQUw7QUFDQSxhQUFLQyxnQkFBTDtBQUNBLGFBQUtDLG1CQUFMLEdBQTJCLElBQTNCOztBQUVBLFlBQUksS0FBS3ZoQixPQUFMLENBQWFtaEIsV0FBakIsRUFBOEI7QUFDNUIsZUFBS0ksbUJBQUwsR0FBMkIsS0FBS0gsVUFBTCxDQUFnQjFyQixJQUFoQixDQUFxQixJQUFyQixDQUEzQjs7QUFFQS9HLFlBQUU5RCxNQUFGLEVBQVVvUixFQUFWLENBQWEsdUJBQWIsRUFBc0MsS0FBS3NsQixtQkFBM0M7QUFDRDtBQUNGOztBQUVEOzs7OztBQXRHVztBQUFBO0FBQUEseUNBMEdRO0FBQ2pCLFlBQUk3d0IsUUFBUSxJQUFaOztBQUVBLGFBQUtaLFFBQUwsQ0FDRzZVLEdBREgsQ0FDTyxlQURQLEVBRUcxSSxFQUZILENBRU0sZUFGTixRQUUyQixLQUFLK0QsT0FBTCxDQUFha2hCLFNBRnhDLEVBRXFELFVBQVMzdUIsQ0FBVCxFQUFXO0FBQzVEQSxZQUFFeU8sY0FBRjtBQUNBek8sWUFBRXdSLGVBQUY7QUFDQSxjQUFJcFYsRUFBRSxJQUFGLEVBQVFnYyxRQUFSLENBQWlCLFdBQWpCLENBQUosRUFBbUM7QUFDakM7QUFDRDtBQUNEamEsZ0JBQU04d0IsZ0JBQU4sQ0FBdUI3eUIsRUFBRSxJQUFGLENBQXZCO0FBQ0QsU0FUSDtBQVVEOztBQUVEOzs7OztBQXpIVztBQUFBO0FBQUEsdUNBNkhNO0FBQ2YsWUFBSStCLFFBQVEsSUFBWjtBQUNBLFlBQUkrd0IsWUFBWS93QixNQUFNWixRQUFOLENBQWVrQyxJQUFmLENBQW9CLGtCQUFwQixDQUFoQjtBQUNBLFlBQUkwdkIsV0FBV2h4QixNQUFNWixRQUFOLENBQWVrQyxJQUFmLENBQW9CLGlCQUFwQixDQUFmOztBQUVBLGFBQUtpdkIsVUFBTCxDQUFnQnRjLEdBQWhCLENBQW9CLGlCQUFwQixFQUF1QzFJLEVBQXZDLENBQTBDLGlCQUExQyxFQUE2RCxVQUFTMUosQ0FBVCxFQUFXO0FBQ3RFLGNBQUlBLEVBQUUvRSxLQUFGLEtBQVksQ0FBaEIsRUFBbUI7O0FBR25CLGNBQUlzQyxXQUFXbkIsRUFBRSxJQUFGLENBQWY7QUFBQSxjQUNFeWQsWUFBWXRjLFNBQVNnSCxNQUFULENBQWdCLElBQWhCLEVBQXNCK0ksUUFBdEIsQ0FBK0IsSUFBL0IsQ0FEZDtBQUFBLGNBRUV3TSxZQUZGO0FBQUEsY0FHRUMsWUFIRjs7QUFLQUYsb0JBQVU1YixJQUFWLENBQWUsVUFBU3NCLENBQVQsRUFBWTtBQUN6QixnQkFBSW5ELEVBQUUsSUFBRixFQUFRMkwsRUFBUixDQUFXeEssUUFBWCxDQUFKLEVBQTBCO0FBQ3hCLGtCQUFJWSxNQUFNc1AsT0FBTixDQUFjMmhCLFVBQWxCLEVBQThCO0FBQzVCdFYsK0JBQWV2YSxNQUFNLENBQU4sR0FBVXNhLFVBQVVpTixJQUFWLEVBQVYsR0FBNkJqTixVQUFVM04sRUFBVixDQUFhM00sSUFBRSxDQUFmLENBQTVDO0FBQ0F3YSwrQkFBZXhhLE1BQU1zYSxVQUFVaGIsTUFBVixHQUFrQixDQUF4QixHQUE0QmdiLFVBQVV0SixLQUFWLEVBQTVCLEdBQWdEc0osVUFBVTNOLEVBQVYsQ0FBYTNNLElBQUUsQ0FBZixDQUEvRDtBQUNELGVBSEQsTUFHTztBQUNMdWEsK0JBQWVELFVBQVUzTixFQUFWLENBQWFuTixLQUFLZ0UsR0FBTCxDQUFTLENBQVQsRUFBWXhELElBQUUsQ0FBZCxDQUFiLENBQWY7QUFDQXdhLCtCQUFlRixVQUFVM04sRUFBVixDQUFhbk4sS0FBS2liLEdBQUwsQ0FBU3phLElBQUUsQ0FBWCxFQUFjc2EsVUFBVWhiLE1BQVYsR0FBaUIsQ0FBL0IsQ0FBYixDQUFmO0FBQ0Q7QUFDRDtBQUNEO0FBQ0YsV0FYRDs7QUFhQTtBQUNBdkMscUJBQVdtSyxRQUFYLENBQW9CUyxTQUFwQixDQUE4QmxILENBQTlCLEVBQWlDLE1BQWpDLEVBQXlDO0FBQ3ZDa2Esa0JBQU0sWUFBVztBQUNmM2MsdUJBQVNrQyxJQUFULENBQWMsY0FBZCxFQUE4QmlaLEtBQTlCO0FBQ0F2YSxvQkFBTTh3QixnQkFBTixDQUF1QjF4QixRQUF2QjtBQUNELGFBSnNDO0FBS3ZDcWIsc0JBQVUsWUFBVztBQUNuQmtCLDJCQUFhcmEsSUFBYixDQUFrQixjQUFsQixFQUFrQ2laLEtBQWxDO0FBQ0F2YSxvQkFBTTh3QixnQkFBTixDQUF1Qm5WLFlBQXZCO0FBQ0QsYUFSc0M7QUFTdkN0QixrQkFBTSxZQUFXO0FBQ2Z1QiwyQkFBYXRhLElBQWIsQ0FBa0IsY0FBbEIsRUFBa0NpWixLQUFsQztBQUNBdmEsb0JBQU04d0IsZ0JBQU4sQ0FBdUJsVixZQUF2QjtBQUNELGFBWnNDO0FBYXZDcFMscUJBQVMsWUFBVztBQUNsQjNILGdCQUFFd1IsZUFBRjtBQUNBeFIsZ0JBQUV5TyxjQUFGO0FBQ0Q7QUFoQnNDLFdBQXpDO0FBa0JELFNBekNEO0FBMENEOztBQUVEOzs7Ozs7O0FBOUtXO0FBQUE7QUFBQSx1Q0FvTE1vRSxPQXBMTixFQW9MZTtBQUN4QixZQUFJd2MsV0FBV3hjLFFBQVFwVCxJQUFSLENBQWEsY0FBYixDQUFmO0FBQUEsWUFDSXdrQixPQUFPb0wsU0FBUyxDQUFULEVBQVlwTCxJQUR2QjtBQUFBLFlBRUlxTCxpQkFBaUIsS0FBS25YLFdBQUwsQ0FBaUIxWSxJQUFqQixDQUFzQndrQixJQUF0QixDQUZyQjtBQUFBLFlBR0lzTCxVQUFVLEtBQUtoeUIsUUFBTCxDQUNSa0MsSUFEUSxPQUNDLEtBQUtnTyxPQUFMLENBQWFraEIsU0FEZCxpQkFFUGh0QixXQUZPLENBRUssV0FGTCxFQUdQbEMsSUFITyxDQUdGLGNBSEUsRUFJUDlDLElBSk8sQ0FJRixFQUFFLGlCQUFpQixPQUFuQixFQUpFLENBSGQ7O0FBU0FQLGdCQUFNbXpCLFFBQVE1eUIsSUFBUixDQUFhLGVBQWIsQ0FBTixFQUNHZ0YsV0FESCxDQUNlLFdBRGYsRUFFR2hGLElBRkgsQ0FFUSxFQUFFLGVBQWUsTUFBakIsRUFGUjs7QUFJQWtXLGdCQUFRdkcsUUFBUixDQUFpQixXQUFqQjs7QUFFQStpQixpQkFBUzF5QixJQUFULENBQWMsRUFBQyxpQkFBaUIsTUFBbEIsRUFBZDs7QUFFQTJ5Qix1QkFDR2hqQixRQURILENBQ1ksV0FEWixFQUVHM1AsSUFGSCxDQUVRLEVBQUMsZUFBZSxPQUFoQixFQUZSOztBQUlBOzs7O0FBSUEsYUFBS1ksUUFBTCxDQUFjRSxPQUFkLENBQXNCLGdCQUF0QixFQUF3QyxDQUFDb1YsT0FBRCxDQUF4QztBQUNEOztBQUVEOzs7Ozs7QUFqTlc7QUFBQTtBQUFBLGdDQXNORHZULElBdE5DLEVBc05LO0FBQ2QsWUFBSWt3QixLQUFKOztBQUVBLFlBQUksT0FBT2x3QixJQUFQLEtBQWdCLFFBQXBCLEVBQThCO0FBQzVCa3dCLGtCQUFRbHdCLEtBQUssQ0FBTCxFQUFRNEssRUFBaEI7QUFDRCxTQUZELE1BRU87QUFDTHNsQixrQkFBUWx3QixJQUFSO0FBQ0Q7O0FBRUQsWUFBSWt3QixNQUFNOTBCLE9BQU4sQ0FBYyxHQUFkLElBQXFCLENBQXpCLEVBQTRCO0FBQzFCODBCLHdCQUFZQSxLQUFaO0FBQ0Q7O0FBRUQsWUFBSTNjLFVBQVUsS0FBSzZiLFVBQUwsQ0FBZ0JqdkIsSUFBaEIsYUFBK0IrdkIsS0FBL0IsU0FBMENqckIsTUFBMUMsT0FBcUQsS0FBS2tKLE9BQUwsQ0FBYWtoQixTQUFsRSxDQUFkOztBQUVBLGFBQUtNLGdCQUFMLENBQXNCcGMsT0FBdEI7QUFDRDtBQXRPVTtBQUFBOztBQXVPWDs7Ozs7OztBQXZPVyxtQ0E4T0U7QUFDWCxZQUFJOVAsTUFBTSxDQUFWO0FBQ0EsYUFBS29WLFdBQUwsQ0FDRzFZLElBREgsT0FDWSxLQUFLZ08sT0FBTCxDQUFhZ2lCLFVBRHpCLEVBRUc1bUIsR0FGSCxDQUVPLFFBRlAsRUFFaUIsRUFGakIsRUFHRzVLLElBSEgsQ0FHUSxZQUFXO0FBQ2YsY0FBSXl4QixRQUFRdHpCLEVBQUUsSUFBRixDQUFaO0FBQUEsY0FDSXNkLFdBQVdnVyxNQUFNdFgsUUFBTixDQUFlLFdBQWYsQ0FEZjs7QUFHQSxjQUFJLENBQUNzQixRQUFMLEVBQWU7QUFDYmdXLGtCQUFNN21CLEdBQU4sQ0FBVSxFQUFDLGNBQWMsUUFBZixFQUF5QixXQUFXLE9BQXBDLEVBQVY7QUFDRDs7QUFFRCxjQUFJcWQsT0FBTyxLQUFLM2dCLHFCQUFMLEdBQTZCTixNQUF4Qzs7QUFFQSxjQUFJLENBQUN5VSxRQUFMLEVBQWU7QUFDYmdXLGtCQUFNN21CLEdBQU4sQ0FBVTtBQUNSLDRCQUFjLEVBRE47QUFFUix5QkFBVztBQUZILGFBQVY7QUFJRDs7QUFFRDlGLGdCQUFNbWpCLE9BQU9uakIsR0FBUCxHQUFhbWpCLElBQWIsR0FBb0JuakIsR0FBMUI7QUFDRCxTQXJCSCxFQXNCRzhGLEdBdEJILENBc0JPLFFBdEJQLEVBc0JvQjlGLEdBdEJwQjtBQXVCRDs7QUFFRDs7Ozs7QUF6UVc7QUFBQTtBQUFBLGdDQTZRRDtBQUNSLGFBQUt4RixRQUFMLENBQ0drQyxJQURILE9BQ1ksS0FBS2dPLE9BQUwsQ0FBYWtoQixTQUR6QixFQUVHdmMsR0FGSCxDQUVPLFVBRlAsRUFFbUJ6RixJQUZuQixHQUUwQmpNLEdBRjFCLEdBR0dqQixJQUhILE9BR1ksS0FBS2dPLE9BQUwsQ0FBYWdpQixVQUh6QixFQUlHOWlCLElBSkg7O0FBTUEsWUFBSSxLQUFLYyxPQUFMLENBQWFtaEIsV0FBakIsRUFBOEI7QUFDNUIsY0FBSSxLQUFLSSxtQkFBTCxJQUE0QixJQUFoQyxFQUFzQztBQUNuQzV5QixjQUFFOUQsTUFBRixFQUFVOFosR0FBVixDQUFjLHVCQUFkLEVBQXVDLEtBQUs0YyxtQkFBNUM7QUFDRjtBQUNGOztBQUVEMXlCLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQTNSVTs7QUFBQTtBQUFBOztBQThSYit3QixPQUFLbGIsUUFBTCxHQUFnQjtBQUNkOzs7OztBQUtBdUssZUFBVyxLQU5HOztBQVFkOzs7OztBQUtBc1IsZ0JBQVksSUFiRTs7QUFlZDs7Ozs7QUFLQVIsaUJBQWEsS0FwQkM7O0FBc0JkOzs7OztBQUtBRCxlQUFXLFlBM0JHOztBQTZCZDs7Ozs7QUFLQWMsZ0JBQVk7QUFsQ0UsR0FBaEI7O0FBcUNBLFdBQVNFLFVBQVQsQ0FBb0Jud0IsS0FBcEIsRUFBMEI7QUFDeEIsV0FBT0EsTUFBTTRZLFFBQU4sQ0FBZSxXQUFmLENBQVA7QUFDRDs7QUFFRDtBQUNBOWIsYUFBV00sTUFBWCxDQUFrQjZ4QixJQUFsQixFQUF3QixNQUF4QjtBQUVDLENBMVVBLENBMFVDeHFCLE1BMVVELENBQUQ7Q0NGQTs7Ozs7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7Ozs7O0FBRmEsTUFTUHd6QixPQVRPO0FBVVg7Ozs7Ozs7QUFPQSxxQkFBWXRyQixPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYW1vQixRQUFRcmMsUUFBckIsRUFBK0JqUCxRQUFROUcsSUFBUixFQUEvQixFQUErQ2lRLE9BQS9DLENBQWY7QUFDQSxXQUFLM1EsU0FBTCxHQUFpQixFQUFqQjs7QUFFQSxXQUFLb0IsS0FBTDtBQUNBLFdBQUt1VixPQUFMOztBQUVBblgsaUJBQVdZLGNBQVgsQ0FBMEIsSUFBMUIsRUFBZ0MsU0FBaEM7QUFDRDs7QUFFRDs7Ozs7OztBQTVCVztBQUFBO0FBQUEsOEJBaUNIO0FBQ04sWUFBSTJ5QixLQUFKO0FBQ0E7QUFDQSxZQUFJLEtBQUtwaUIsT0FBTCxDQUFhaEMsT0FBakIsRUFBMEI7QUFDeEJva0Isa0JBQVEsS0FBS3BpQixPQUFMLENBQWFoQyxPQUFiLENBQXFCMUwsS0FBckIsQ0FBMkIsR0FBM0IsQ0FBUjs7QUFFQSxlQUFLcXFCLFdBQUwsR0FBbUJ5RixNQUFNLENBQU4sQ0FBbkI7QUFDQSxlQUFLakYsWUFBTCxHQUFvQmlGLE1BQU0sQ0FBTixLQUFZLElBQWhDO0FBQ0Q7QUFDRDtBQU5BLGFBT0s7QUFDSEEsb0JBQVEsS0FBS3R5QixRQUFMLENBQWNDLElBQWQsQ0FBbUIsU0FBbkIsQ0FBUjtBQUNBO0FBQ0EsaUJBQUtWLFNBQUwsR0FBaUIreUIsTUFBTSxDQUFOLE1BQWEsR0FBYixHQUFtQkEsTUFBTXp3QixLQUFOLENBQVksQ0FBWixDQUFuQixHQUFvQ3l3QixLQUFyRDtBQUNEOztBQUVEO0FBQ0EsWUFBSTNsQixLQUFLLEtBQUszTSxRQUFMLENBQWMsQ0FBZCxFQUFpQjJNLEVBQTFCO0FBQ0E5TiwyQkFBaUI4TixFQUFqQix5QkFBdUNBLEVBQXZDLDBCQUE4REEsRUFBOUQsU0FDR3ZOLElBREgsQ0FDUSxlQURSLEVBQ3lCdU4sRUFEekI7QUFFQTtBQUNBLGFBQUszTSxRQUFMLENBQWNaLElBQWQsQ0FBbUIsZUFBbkIsRUFBb0MsS0FBS1ksUUFBTCxDQUFjd0ssRUFBZCxDQUFpQixTQUFqQixJQUE4QixLQUE5QixHQUFzQyxJQUExRTtBQUNEOztBQUVEOzs7Ozs7QUF6RFc7QUFBQTtBQUFBLGdDQThERDtBQUNSLGFBQUt4SyxRQUFMLENBQWM2VSxHQUFkLENBQWtCLG1CQUFsQixFQUF1QzFJLEVBQXZDLENBQTBDLG1CQUExQyxFQUErRCxLQUFLNk8sTUFBTCxDQUFZcFYsSUFBWixDQUFpQixJQUFqQixDQUEvRDtBQUNEOztBQUVEOzs7Ozs7O0FBbEVXO0FBQUE7QUFBQSwrQkF3RUY7QUFDUCxhQUFNLEtBQUtzSyxPQUFMLENBQWFoQyxPQUFiLEdBQXVCLGdCQUF2QixHQUEwQyxjQUFoRDtBQUNEO0FBMUVVO0FBQUE7QUFBQSxxQ0E0RUk7QUFDYixhQUFLbE8sUUFBTCxDQUFjdXlCLFdBQWQsQ0FBMEIsS0FBS2h6QixTQUEvQjs7QUFFQSxZQUFJcWpCLE9BQU8sS0FBSzVpQixRQUFMLENBQWM2YSxRQUFkLENBQXVCLEtBQUt0YixTQUE1QixDQUFYO0FBQ0EsWUFBSXFqQixJQUFKLEVBQVU7QUFDUjs7OztBQUlBLGVBQUs1aUIsUUFBTCxDQUFjRSxPQUFkLENBQXNCLGVBQXRCO0FBQ0QsU0FORCxNQU9LO0FBQ0g7Ozs7QUFJQSxlQUFLRixRQUFMLENBQWNFLE9BQWQsQ0FBc0IsZ0JBQXRCO0FBQ0Q7O0FBRUQsYUFBS3N5QixXQUFMLENBQWlCNVAsSUFBakI7QUFDRDtBQWhHVTtBQUFBO0FBQUEsdUNBa0dNO0FBQ2YsWUFBSWhpQixRQUFRLElBQVo7O0FBRUEsWUFBSSxLQUFLWixRQUFMLENBQWN3SyxFQUFkLENBQWlCLFNBQWpCLENBQUosRUFBaUM7QUFDL0J6TCxxQkFBVytPLE1BQVgsQ0FBa0JDLFNBQWxCLENBQTRCLEtBQUsvTixRQUFqQyxFQUEyQyxLQUFLNnNCLFdBQWhELEVBQTZELFlBQVc7QUFDdEVqc0Isa0JBQU00eEIsV0FBTixDQUFrQixJQUFsQjtBQUNBLGlCQUFLdHlCLE9BQUwsQ0FBYSxlQUFiO0FBQ0QsV0FIRDtBQUlELFNBTEQsTUFNSztBQUNIbkIscUJBQVcrTyxNQUFYLENBQWtCSyxVQUFsQixDQUE2QixLQUFLbk8sUUFBbEMsRUFBNEMsS0FBS3F0QixZQUFqRCxFQUErRCxZQUFXO0FBQ3hFenNCLGtCQUFNNHhCLFdBQU4sQ0FBa0IsS0FBbEI7QUFDQSxpQkFBS3R5QixPQUFMLENBQWEsZ0JBQWI7QUFDRCxXQUhEO0FBSUQ7QUFDRjtBQWpIVTtBQUFBO0FBQUEsa0NBbUhDMGlCLElBbkhELEVBbUhPO0FBQ2hCLGFBQUs1aUIsUUFBTCxDQUFjWixJQUFkLENBQW1CLGVBQW5CLEVBQW9Dd2pCLE9BQU8sSUFBUCxHQUFjLEtBQWxEO0FBQ0Q7O0FBRUQ7Ozs7O0FBdkhXO0FBQUE7QUFBQSxnQ0EySEQ7QUFDUixhQUFLNWlCLFFBQUwsQ0FBYzZVLEdBQWQsQ0FBa0IsYUFBbEI7QUFDQTlWLG1CQUFXb0IsZ0JBQVgsQ0FBNEIsSUFBNUI7QUFDRDtBQTlIVTs7QUFBQTtBQUFBOztBQWlJYmt5QixVQUFRcmMsUUFBUixHQUFtQjtBQUNqQjs7Ozs7QUFLQTlILGFBQVM7QUFOUSxHQUFuQjs7QUFTQTtBQUNBblAsYUFBV00sTUFBWCxDQUFrQmd6QixPQUFsQixFQUEyQixTQUEzQjtBQUVDLENBN0lBLENBNklDM3JCLE1BN0lELENBQUQ7Q0NGQTs7Ozs7O0FBRUEsQ0FBQyxVQUFTN0gsQ0FBVCxFQUFZOztBQUViOzs7Ozs7O0FBRmEsTUFTUDR6QixPQVRPO0FBVVg7Ozs7Ozs7QUFPQSxxQkFBWTFyQixPQUFaLEVBQXFCbUosT0FBckIsRUFBOEI7QUFBQTs7QUFDNUIsV0FBS2xRLFFBQUwsR0FBZ0IrRyxPQUFoQjtBQUNBLFdBQUttSixPQUFMLEdBQWVyUixFQUFFcUwsTUFBRixDQUFTLEVBQVQsRUFBYXVvQixRQUFRemMsUUFBckIsRUFBK0IsS0FBS2hXLFFBQUwsQ0FBY0MsSUFBZCxFQUEvQixFQUFxRGlRLE9BQXJELENBQWY7O0FBRUEsV0FBS2lNLFFBQUwsR0FBZ0IsS0FBaEI7QUFDQSxXQUFLdVcsT0FBTCxHQUFlLEtBQWY7QUFDQSxXQUFLL3hCLEtBQUw7O0FBRUE1QixpQkFBV1ksY0FBWCxDQUEwQixJQUExQixFQUFnQyxTQUFoQztBQUNEOztBQUVEOzs7Ozs7QUE1Qlc7QUFBQTtBQUFBLDhCQWdDSDtBQUNOLFlBQUlnekIsU0FBUyxLQUFLM3lCLFFBQUwsQ0FBY1osSUFBZCxDQUFtQixrQkFBbkIsS0FBMENMLFdBQVdnQixXQUFYLENBQXVCLENBQXZCLEVBQTBCLFNBQTFCLENBQXZEOztBQUVBLGFBQUttUSxPQUFMLENBQWFrUCxhQUFiLEdBQTZCLEtBQUtsUCxPQUFMLENBQWFrUCxhQUFiLElBQThCLEtBQUt3VCxpQkFBTCxDQUF1QixLQUFLNXlCLFFBQTVCLENBQTNEO0FBQ0EsYUFBS2tRLE9BQUwsQ0FBYTJpQixPQUFiLEdBQXVCLEtBQUszaUIsT0FBTCxDQUFhMmlCLE9BQWIsSUFBd0IsS0FBSzd5QixRQUFMLENBQWNaLElBQWQsQ0FBbUIsT0FBbkIsQ0FBL0M7QUFDQSxhQUFLMHpCLFFBQUwsR0FBZ0IsS0FBSzVpQixPQUFMLENBQWE0aUIsUUFBYixHQUF3QmowQixFQUFFLEtBQUtxUixPQUFMLENBQWE0aUIsUUFBZixDQUF4QixHQUFtRCxLQUFLQyxjQUFMLENBQW9CSixNQUFwQixDQUFuRTs7QUFFQSxhQUFLRyxRQUFMLENBQWM1dUIsUUFBZCxDQUF1QmxHLFNBQVM5QyxJQUFoQyxFQUNLOFIsSUFETCxDQUNVLEtBQUtrRCxPQUFMLENBQWEyaUIsT0FEdkIsRUFFS3pqQixJQUZMOztBQUlBLGFBQUtwUCxRQUFMLENBQWNaLElBQWQsQ0FBbUI7QUFDakIsbUJBQVMsRUFEUTtBQUVqQiw4QkFBb0J1ekIsTUFGSDtBQUdqQiwyQkFBaUJBLE1BSEE7QUFJakIseUJBQWVBLE1BSkU7QUFLakIseUJBQWVBO0FBTEUsU0FBbkIsRUFNRzVqQixRQU5ILENBTVksS0FBS2lrQixZQU5qQjs7QUFRQTtBQUNBLGFBQUt6VCxhQUFMLEdBQXFCLEVBQXJCO0FBQ0EsYUFBS0QsT0FBTCxHQUFlLENBQWY7QUFDQSxhQUFLSyxZQUFMLEdBQW9CLEtBQXBCOztBQUVBLGFBQUt6SixPQUFMO0FBQ0Q7O0FBRUQ7Ozs7O0FBM0RXO0FBQUE7QUFBQSx3Q0ErRE9uUCxPQS9EUCxFQStEZ0I7QUFDekIsWUFBSSxDQUFDQSxPQUFMLEVBQWM7QUFBRSxpQkFBTyxFQUFQO0FBQVk7QUFDNUI7QUFDQSxZQUFJMkIsV0FBVzNCLFFBQVEsQ0FBUixFQUFXeEgsU0FBWCxDQUFxQmtnQixLQUFyQixDQUEyQix1QkFBM0IsQ0FBZjtBQUNJL1csbUJBQVdBLFdBQVdBLFNBQVMsQ0FBVCxDQUFYLEdBQXlCLEVBQXBDO0FBQ0osZUFBT0EsUUFBUDtBQUNEO0FBckVVO0FBQUE7O0FBc0VYOzs7O0FBdEVXLHFDQTBFSWlFLEVBMUVKLEVBMEVRO0FBQ2pCLFlBQUlzbUIsa0JBQWtCLENBQUksS0FBSy9pQixPQUFMLENBQWFnakIsWUFBakIsU0FBaUMsS0FBS2hqQixPQUFMLENBQWFrUCxhQUE5QyxTQUErRCxLQUFLbFAsT0FBTCxDQUFhK2lCLGVBQTVFLEVBQStGcHdCLElBQS9GLEVBQXRCO0FBQ0EsWUFBSXN3QixZQUFhdDBCLEVBQUUsYUFBRixFQUFpQmtRLFFBQWpCLENBQTBCa2tCLGVBQTFCLEVBQTJDN3pCLElBQTNDLENBQWdEO0FBQy9ELGtCQUFRLFNBRHVEO0FBRS9ELHlCQUFlLElBRmdEO0FBRy9ELDRCQUFrQixLQUg2QztBQUkvRCwyQkFBaUIsS0FKOEM7QUFLL0QsZ0JBQU11TjtBQUx5RCxTQUFoRCxDQUFqQjtBQU9BLGVBQU93bUIsU0FBUDtBQUNEOztBQUVEOzs7Ozs7QUF0Rlc7QUFBQTtBQUFBLGtDQTJGQ3pxQixRQTNGRCxFQTJGVztBQUNwQixhQUFLNlcsYUFBTCxDQUFtQi9oQixJQUFuQixDQUF3QmtMLFdBQVdBLFFBQVgsR0FBc0IsUUFBOUM7O0FBRUE7QUFDQSxZQUFJLENBQUNBLFFBQUQsSUFBYyxLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixLQUEzQixJQUFvQyxDQUF0RCxFQUEwRDtBQUN4RCxlQUFLMjFCLFFBQUwsQ0FBYy9qQixRQUFkLENBQXVCLEtBQXZCO0FBQ0QsU0FGRCxNQUVPLElBQUlyRyxhQUFhLEtBQWIsSUFBdUIsS0FBSzZXLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsUUFBM0IsSUFBdUMsQ0FBbEUsRUFBc0U7QUFDM0UsZUFBSzIxQixRQUFMLENBQWMxdUIsV0FBZCxDQUEwQnNFLFFBQTFCO0FBQ0QsU0FGTSxNQUVBLElBQUlBLGFBQWEsTUFBYixJQUF3QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixPQUEzQixJQUFzQyxDQUFsRSxFQUFzRTtBQUMzRSxlQUFLMjFCLFFBQUwsQ0FBYzF1QixXQUFkLENBQTBCc0UsUUFBMUIsRUFDS3FHLFFBREwsQ0FDYyxPQURkO0FBRUQsU0FITSxNQUdBLElBQUlyRyxhQUFhLE9BQWIsSUFBeUIsS0FBSzZXLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsTUFBM0IsSUFBcUMsQ0FBbEUsRUFBc0U7QUFDM0UsZUFBSzIxQixRQUFMLENBQWMxdUIsV0FBZCxDQUEwQnNFLFFBQTFCLEVBQ0txRyxRQURMLENBQ2MsTUFEZDtBQUVEOztBQUVEO0FBTE8sYUFNRixJQUFJLENBQUNyRyxRQUFELElBQWMsS0FBSzZXLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsS0FBM0IsSUFBb0MsQ0FBQyxDQUFuRCxJQUEwRCxLQUFLb2lCLGFBQUwsQ0FBbUJwaUIsT0FBbkIsQ0FBMkIsTUFBM0IsSUFBcUMsQ0FBbkcsRUFBdUc7QUFDMUcsaUJBQUsyMUIsUUFBTCxDQUFjL2pCLFFBQWQsQ0FBdUIsTUFBdkI7QUFDRCxXQUZJLE1BRUUsSUFBSXJHLGFBQWEsS0FBYixJQUF1QixLQUFLNlcsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixRQUEzQixJQUF1QyxDQUFDLENBQS9ELElBQXNFLEtBQUtvaUIsYUFBTCxDQUFtQnBpQixPQUFuQixDQUEyQixNQUEzQixJQUFxQyxDQUEvRyxFQUFtSDtBQUN4SCxpQkFBSzIxQixRQUFMLENBQWMxdUIsV0FBZCxDQUEwQnNFLFFBQTFCLEVBQ0txRyxRQURMLENBQ2MsTUFEZDtBQUVELFdBSE0sTUFHQSxJQUFJckcsYUFBYSxNQUFiLElBQXdCLEtBQUs2VyxhQUFMLENBQW1CcGlCLE9BQW5CLENBQTJCLE9BQTNCLElBQXNDLENBQUMsQ0FBL0QsSUFBc0UsS0FBS29pQixhQUFMLENBQW1CcGlCLE9BQW5CLENBQTJCLFFBQTNCLElBQXVDLENBQWpILEVBQXFIO0FBQzFILGlCQUFLMjFCLFFBQUwsQ0FBYzF1QixXQUFkLENBQTBCc0UsUUFBMUI7QUFDRCxXQUZNLE1BRUEsSUFBSUEsYUFBYSxPQUFiLElBQXlCLEtBQUs2VyxhQUFMLENBQW1CcGlCLE9BQW5CLENBQTJCLE1BQTNCLElBQXFDLENBQUMsQ0FBL0QsSUFBc0UsS0FBS29pQixhQUFMLENBQW1CcGlCLE9BQW5CLENBQTJCLFFBQTNCLElBQXVDLENBQWpILEVBQXFIO0FBQzFILGlCQUFLMjFCLFFBQUwsQ0FBYzF1QixXQUFkLENBQTBCc0UsUUFBMUI7QUFDRDtBQUNEO0FBSE8sZUFJRjtBQUNILG1CQUFLb3FCLFFBQUwsQ0FBYzF1QixXQUFkLENBQTBCc0UsUUFBMUI7QUFDRDtBQUNELGFBQUtpWCxZQUFMLEdBQW9CLElBQXBCO0FBQ0EsYUFBS0wsT0FBTDtBQUNEOztBQUVEOzs7Ozs7QUE5SFc7QUFBQTtBQUFBLHFDQW1JSTtBQUNiLFlBQUk1VyxXQUFXLEtBQUtrcUIsaUJBQUwsQ0FBdUIsS0FBS0UsUUFBNUIsQ0FBZjtBQUFBLFlBQ0lNLFdBQVdyMEIsV0FBVzRILEdBQVgsQ0FBZUUsYUFBZixDQUE2QixLQUFLaXNCLFFBQWxDLENBRGY7QUFBQSxZQUVJL3BCLGNBQWNoSyxXQUFXNEgsR0FBWCxDQUFlRSxhQUFmLENBQTZCLEtBQUs3RyxRQUFsQyxDQUZsQjtBQUFBLFlBR0k0ZixZQUFhbFgsYUFBYSxNQUFiLEdBQXNCLE1BQXRCLEdBQWlDQSxhQUFhLE9BQWQsR0FBeUIsTUFBekIsR0FBa0MsS0FIbkY7QUFBQSxZQUlJNkUsUUFBU3FTLGNBQWMsS0FBZixHQUF3QixRQUF4QixHQUFtQyxPQUovQztBQUFBLFlBS0luWSxTQUFVOEYsVUFBVSxRQUFYLEdBQXVCLEtBQUsyQyxPQUFMLENBQWF2SCxPQUFwQyxHQUE4QyxLQUFLdUgsT0FBTCxDQUFhdEgsT0FMeEU7QUFBQSxZQU1JaEksUUFBUSxJQU5aOztBQVFBLFlBQUt3eUIsU0FBU3pyQixLQUFULElBQWtCeXJCLFNBQVN4ckIsVUFBVCxDQUFvQkQsS0FBdkMsSUFBa0QsQ0FBQyxLQUFLMlgsT0FBTixJQUFpQixDQUFDdmdCLFdBQVc0SCxHQUFYLENBQWVDLGdCQUFmLENBQWdDLEtBQUtrc0IsUUFBckMsQ0FBeEUsRUFBeUg7QUFDdkgsZUFBS0EsUUFBTCxDQUFjcnJCLE1BQWQsQ0FBcUIxSSxXQUFXNEgsR0FBWCxDQUFlRyxVQUFmLENBQTBCLEtBQUtnc0IsUUFBL0IsRUFBeUMsS0FBSzl5QixRQUE5QyxFQUF3RCxlQUF4RCxFQUF5RSxLQUFLa1EsT0FBTCxDQUFhdkgsT0FBdEYsRUFBK0YsS0FBS3VILE9BQUwsQ0FBYXRILE9BQTVHLEVBQXFILElBQXJILENBQXJCLEVBQWlKMEMsR0FBakosQ0FBcUo7QUFDcko7QUFDRSxxQkFBU3ZDLFlBQVluQixVQUFaLENBQXVCRCxLQUF2QixHQUFnQyxLQUFLdUksT0FBTCxDQUFhdEgsT0FBYixHQUF1QixDQUZtRjtBQUduSixzQkFBVTtBQUh5SSxXQUFySjtBQUtBLGlCQUFPLEtBQVA7QUFDRDs7QUFFRCxhQUFLa3FCLFFBQUwsQ0FBY3JyQixNQUFkLENBQXFCMUksV0FBVzRILEdBQVgsQ0FBZUcsVUFBZixDQUEwQixLQUFLZ3NCLFFBQS9CLEVBQXlDLEtBQUs5eUIsUUFBOUMsRUFBdUQsYUFBYTBJLFlBQVksUUFBekIsQ0FBdkQsRUFBMkYsS0FBS3dILE9BQUwsQ0FBYXZILE9BQXhHLEVBQWlILEtBQUt1SCxPQUFMLENBQWF0SCxPQUE5SCxDQUFyQjs7QUFFQSxlQUFNLENBQUM3SixXQUFXNEgsR0FBWCxDQUFlQyxnQkFBZixDQUFnQyxLQUFLa3NCLFFBQXJDLENBQUQsSUFBbUQsS0FBS3hULE9BQTlELEVBQXVFO0FBQ3JFLGVBQUtPLFdBQUwsQ0FBaUJuWCxRQUFqQjtBQUNBLGVBQUtvWCxZQUFMO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7OztBQTdKVztBQUFBO0FBQUEsNkJBbUtKO0FBQ0wsWUFBSSxLQUFLNVAsT0FBTCxDQUFhbWpCLE1BQWIsS0FBd0IsS0FBeEIsSUFBaUMsQ0FBQ3QwQixXQUFXc0YsVUFBWCxDQUFzQnVILE9BQXRCLENBQThCLEtBQUtzRSxPQUFMLENBQWFtakIsTUFBM0MsQ0FBdEMsRUFBMEY7QUFDeEY7QUFDQSxpQkFBTyxLQUFQO0FBQ0Q7O0FBRUQsWUFBSXp5QixRQUFRLElBQVo7QUFDQSxhQUFLa3lCLFFBQUwsQ0FBY3huQixHQUFkLENBQWtCLFlBQWxCLEVBQWdDLFFBQWhDLEVBQTBDMEQsSUFBMUM7QUFDQSxhQUFLOFEsWUFBTDs7QUFFQTs7OztBQUlBLGFBQUs5ZixRQUFMLENBQWNFLE9BQWQsQ0FBc0Isb0JBQXRCLEVBQTRDLEtBQUs0eUIsUUFBTCxDQUFjMXpCLElBQWQsQ0FBbUIsSUFBbkIsQ0FBNUM7O0FBR0EsYUFBSzB6QixRQUFMLENBQWMxekIsSUFBZCxDQUFtQjtBQUNqQiw0QkFBa0IsSUFERDtBQUVqQix5QkFBZTtBQUZFLFNBQW5CO0FBSUF3QixjQUFNdWIsUUFBTixHQUFpQixJQUFqQjtBQUNBO0FBQ0EsYUFBSzJXLFFBQUwsQ0FBY2hYLElBQWQsR0FBcUIxTSxJQUFyQixHQUE0QjlELEdBQTVCLENBQWdDLFlBQWhDLEVBQThDLEVBQTlDLEVBQWtEZ29CLE1BQWxELENBQXlELEtBQUtwakIsT0FBTCxDQUFhcWpCLGNBQXRFLEVBQXNGLFlBQVc7QUFDL0Y7QUFDRCxTQUZEO0FBR0E7Ozs7QUFJQSxhQUFLdnpCLFFBQUwsQ0FBY0UsT0FBZCxDQUFzQixpQkFBdEI7QUFDRDs7QUFFRDs7Ozs7O0FBcE1XO0FBQUE7QUFBQSw2QkF5TUo7QUFDTDtBQUNBLFlBQUlVLFFBQVEsSUFBWjtBQUNBLGFBQUtreUIsUUFBTCxDQUFjaFgsSUFBZCxHQUFxQjFjLElBQXJCLENBQTBCO0FBQ3hCLHlCQUFlLElBRFM7QUFFeEIsNEJBQWtCO0FBRk0sU0FBMUIsRUFHRzhVLE9BSEgsQ0FHVyxLQUFLaEUsT0FBTCxDQUFhc2pCLGVBSHhCLEVBR3lDLFlBQVc7QUFDbEQ1eUIsZ0JBQU11YixRQUFOLEdBQWlCLEtBQWpCO0FBQ0F2YixnQkFBTTh4QixPQUFOLEdBQWdCLEtBQWhCO0FBQ0EsY0FBSTl4QixNQUFNK2UsWUFBVixFQUF3QjtBQUN0Qi9lLGtCQUFNa3lCLFFBQU4sQ0FDTTF1QixXQUROLENBQ2tCeEQsTUFBTWd5QixpQkFBTixDQUF3Qmh5QixNQUFNa3lCLFFBQTlCLENBRGxCLEVBRU0vakIsUUFGTixDQUVlbk8sTUFBTXNQLE9BQU4sQ0FBY2tQLGFBRjdCOztBQUlEeGUsa0JBQU0yZSxhQUFOLEdBQXNCLEVBQXRCO0FBQ0EzZSxrQkFBTTBlLE9BQU4sR0FBZ0IsQ0FBaEI7QUFDQTFlLGtCQUFNK2UsWUFBTixHQUFxQixLQUFyQjtBQUNBO0FBQ0YsU0FmRDtBQWdCQTs7OztBQUlBLGFBQUszZixRQUFMLENBQWNFLE9BQWQsQ0FBc0IsaUJBQXRCO0FBQ0Q7O0FBRUQ7Ozs7OztBQW5PVztBQUFBO0FBQUEsZ0NBd09EO0FBQ1IsWUFBSVUsUUFBUSxJQUFaO0FBQ0EsWUFBSXV5QixZQUFZLEtBQUtMLFFBQXJCO0FBQ0EsWUFBSVcsVUFBVSxLQUFkOztBQUVBLFlBQUksQ0FBQyxLQUFLdmpCLE9BQUwsQ0FBYXVSLFlBQWxCLEVBQWdDOztBQUU5QixlQUFLemhCLFFBQUwsQ0FDQ21NLEVBREQsQ0FDSSx1QkFESixFQUM2QixVQUFTMUosQ0FBVCxFQUFZO0FBQ3ZDLGdCQUFJLENBQUM3QixNQUFNdWIsUUFBWCxFQUFxQjtBQUNuQnZiLG9CQUFNb2YsT0FBTixHQUFnQjlqQixXQUFXLFlBQVc7QUFDcEMwRSxzQkFBTW9PLElBQU47QUFDRCxlQUZlLEVBRWJwTyxNQUFNc1AsT0FBTixDQUFjK1AsVUFGRCxDQUFoQjtBQUdEO0FBQ0YsV0FQRCxFQVFDOVQsRUFSRCxDQVFJLHVCQVJKLEVBUTZCLFVBQVMxSixDQUFULEVBQVk7QUFDdkNwRyx5QkFBYXVFLE1BQU1vZixPQUFuQjtBQUNBLGdCQUFJLENBQUN5VCxPQUFELElBQWE3eUIsTUFBTTh4QixPQUFOLElBQWlCLENBQUM5eEIsTUFBTXNQLE9BQU4sQ0FBY3FSLFNBQWpELEVBQTZEO0FBQzNEM2dCLG9CQUFNd08sSUFBTjtBQUNEO0FBQ0YsV0FiRDtBQWNEOztBQUVELFlBQUksS0FBS2MsT0FBTCxDQUFhcVIsU0FBakIsRUFBNEI7QUFDMUIsZUFBS3ZoQixRQUFMLENBQWNtTSxFQUFkLENBQWlCLHNCQUFqQixFQUF5QyxVQUFTMUosQ0FBVCxFQUFZO0FBQ25EQSxjQUFFc2Esd0JBQUY7QUFDQSxnQkFBSW5jLE1BQU04eEIsT0FBVixFQUFtQjtBQUNqQjtBQUNBO0FBQ0QsYUFIRCxNQUdPO0FBQ0w5eEIsb0JBQU04eEIsT0FBTixHQUFnQixJQUFoQjtBQUNBLGtCQUFJLENBQUM5eEIsTUFBTXNQLE9BQU4sQ0FBY3VSLFlBQWQsSUFBOEIsQ0FBQzdnQixNQUFNWixRQUFOLENBQWVaLElBQWYsQ0FBb0IsVUFBcEIsQ0FBaEMsS0FBb0UsQ0FBQ3dCLE1BQU11YixRQUEvRSxFQUF5RjtBQUN2RnZiLHNCQUFNb08sSUFBTjtBQUNEO0FBQ0Y7QUFDRixXQVhEO0FBWUQsU0FiRCxNQWFPO0FBQ0wsZUFBS2hQLFFBQUwsQ0FBY21NLEVBQWQsQ0FBaUIsc0JBQWpCLEVBQXlDLFVBQVMxSixDQUFULEVBQVk7QUFDbkRBLGNBQUVzYSx3QkFBRjtBQUNBbmMsa0JBQU04eEIsT0FBTixHQUFnQixJQUFoQjtBQUNELFdBSEQ7QUFJRDs7QUFFRCxZQUFJLENBQUMsS0FBS3hpQixPQUFMLENBQWF3akIsZUFBbEIsRUFBbUM7QUFDakMsZUFBSzF6QixRQUFMLENBQ0NtTSxFQURELENBQ0ksb0NBREosRUFDMEMsVUFBUzFKLENBQVQsRUFBWTtBQUNwRDdCLGtCQUFNdWIsUUFBTixHQUFpQnZiLE1BQU13TyxJQUFOLEVBQWpCLEdBQWdDeE8sTUFBTW9PLElBQU4sRUFBaEM7QUFDRCxXQUhEO0FBSUQ7O0FBRUQsYUFBS2hQLFFBQUwsQ0FBY21NLEVBQWQsQ0FBaUI7QUFDZjtBQUNBO0FBQ0EsOEJBQW9CLEtBQUtpRCxJQUFMLENBQVV4SixJQUFWLENBQWUsSUFBZjtBQUhMLFNBQWpCOztBQU1BLGFBQUs1RixRQUFMLENBQ0dtTSxFQURILENBQ00sa0JBRE4sRUFDMEIsVUFBUzFKLENBQVQsRUFBWTtBQUNsQ2d4QixvQkFBVSxJQUFWO0FBQ0EsY0FBSTd5QixNQUFNOHhCLE9BQVYsRUFBbUI7QUFDakI7QUFDQTtBQUNBLGdCQUFHLENBQUM5eEIsTUFBTXNQLE9BQU4sQ0FBY3FSLFNBQWxCLEVBQTZCO0FBQUVrUyx3QkFBVSxLQUFWO0FBQWtCO0FBQ2pELG1CQUFPLEtBQVA7QUFDRCxXQUxELE1BS087QUFDTDd5QixrQkFBTW9PLElBQU47QUFDRDtBQUNGLFNBWEgsRUFhRzdDLEVBYkgsQ0FhTSxxQkFiTixFQWE2QixVQUFTMUosQ0FBVCxFQUFZO0FBQ3JDZ3hCLG9CQUFVLEtBQVY7QUFDQTd5QixnQkFBTTh4QixPQUFOLEdBQWdCLEtBQWhCO0FBQ0E5eEIsZ0JBQU13TyxJQUFOO0FBQ0QsU0FqQkgsRUFtQkdqRCxFQW5CSCxDQW1CTSxxQkFuQk4sRUFtQjZCLFlBQVc7QUFDcEMsY0FBSXZMLE1BQU11YixRQUFWLEVBQW9CO0FBQ2xCdmIsa0JBQU1rZixZQUFOO0FBQ0Q7QUFDRixTQXZCSDtBQXdCRDs7QUFFRDs7Ozs7QUExVFc7QUFBQTtBQUFBLCtCQThURjtBQUNQLFlBQUksS0FBSzNELFFBQVQsRUFBbUI7QUFDakIsZUFBSy9NLElBQUw7QUFDRCxTQUZELE1BRU87QUFDTCxlQUFLSixJQUFMO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7QUF0VVc7QUFBQTtBQUFBLGdDQTBVRDtBQUNSLGFBQUtoUCxRQUFMLENBQWNaLElBQWQsQ0FBbUIsT0FBbkIsRUFBNEIsS0FBSzB6QixRQUFMLENBQWM5bEIsSUFBZCxFQUE1QixFQUNjNkgsR0FEZCxDQUNrQix3QkFEbEI7QUFFWTtBQUZaLFNBR2N6VSxVQUhkLENBR3lCLGtCQUh6QixFQUljQSxVQUpkLENBSXlCLGVBSnpCLEVBS2NBLFVBTGQsQ0FLeUIsYUFMekIsRUFNY0EsVUFOZCxDQU15QixhQU56Qjs7QUFRQSxhQUFLMHlCLFFBQUwsQ0FBYzlULE1BQWQ7O0FBRUFqZ0IsbUJBQVdvQixnQkFBWCxDQUE0QixJQUE1QjtBQUNEO0FBdFZVOztBQUFBO0FBQUE7O0FBeVZic3lCLFVBQVF6YyxRQUFSLEdBQW1CO0FBQ2pCMGQscUJBQWlCLEtBREE7QUFFakI7Ozs7O0FBS0F6VCxnQkFBWSxHQVBLO0FBUWpCOzs7OztBQUtBc1Qsb0JBQWdCLEdBYkM7QUFjakI7Ozs7O0FBS0FDLHFCQUFpQixHQW5CQTtBQW9CakI7Ozs7O0FBS0EvUixrQkFBYyxLQXpCRztBQTBCakI7Ozs7O0FBS0F3UixxQkFBaUIsRUEvQkE7QUFnQ2pCOzs7OztBQUtBQyxrQkFBYyxTQXJDRztBQXNDakI7Ozs7O0FBS0FGLGtCQUFjLFNBM0NHO0FBNENqQjs7Ozs7QUFLQUssWUFBUSxPQWpEUztBQWtEakI7Ozs7O0FBS0FQLGNBQVUsRUF2RE87QUF3RGpCOzs7OztBQUtBRCxhQUFTLEVBN0RRO0FBOERqQmMsb0JBQWdCLGVBOURDO0FBK0RqQjs7Ozs7QUFLQXBTLGVBQVcsSUFwRU07QUFxRWpCOzs7OztBQUtBbkMsbUJBQWUsRUExRUU7QUEyRWpCOzs7OztBQUtBelcsYUFBUyxFQWhGUTtBQWlGakI7Ozs7O0FBS0FDLGFBQVM7QUF0RlEsR0FBbkI7O0FBeUZBOzs7O0FBSUE7QUFDQTdKLGFBQVdNLE1BQVgsQ0FBa0JvekIsT0FBbEIsRUFBMkIsU0FBM0I7QUFFQyxDQXpiQSxDQXliQy9yQixNQXpiRCxDQUFEOzs7QUNGQSxJQUFJa3RCLGtCQUFnQixZQUFVO0FBQUM7QUFBYSxNQUFJbnhCLElBQUUsb0ZBQU4sQ0FBMkYsSUFBSVcsSUFBRSxrREFBTixDQUF5RCxJQUFJcEIsSUFBRSxnQkFBZWhFLFNBQVNJLGFBQVQsQ0FBdUIsR0FBdkIsRUFBNEJpRixLQUFqRCxDQUF1RCxJQUFJd3dCLElBQUUsS0FBTixDQUFZLFNBQVNDLENBQVQsQ0FBV3J4QixDQUFYLEVBQWE7QUFBQyxRQUFJVCxJQUFFNkssaUJBQWlCcEssQ0FBakIsRUFBb0JzeEIsVUFBMUIsQ0FBcUMsSUFBSUYsQ0FBSixDQUFNLElBQUlDLElBQUUsRUFBTixDQUFTLE9BQU0sQ0FBQ0QsSUFBRXp3QixFQUFFaUQsSUFBRixDQUFPckUsQ0FBUCxDQUFILE1BQWdCLElBQXRCLEVBQTJCO0FBQUM4eEIsUUFBRUQsRUFBRSxDQUFGLENBQUYsSUFBUUEsRUFBRSxDQUFGLENBQVI7QUFBYSxZQUFPQyxDQUFQO0FBQVMsWUFBU0UsQ0FBVCxDQUFXNXdCLENBQVgsRUFBYXBCLENBQWIsRUFBZTtBQUFDLFFBQUk2eEIsSUFBRUMsRUFBRTF3QixDQUFGLENBQU4sQ0FBVyxJQUFHLENBQUN5d0IsRUFBRSxZQUFGLENBQUQsSUFBa0JBLEVBQUUsWUFBRixNQUFrQixNQUF2QyxFQUE4QztBQUFDO0FBQU8sU0FBRTd4QixLQUFHb0IsRUFBRTZ3QixVQUFMLElBQWlCN3dCLEVBQUU4d0IsR0FBckIsQ0FBeUIsSUFBRzl3QixFQUFFK3dCLE1BQUwsRUFBWTtBQUFDL3dCLFFBQUUrd0IsTUFBRixHQUFTLEVBQVQ7QUFBWSxTQUFHLENBQUMvd0IsRUFBRVgsQ0FBRixDQUFKLEVBQVM7QUFBQ1csUUFBRTh3QixHQUFGLEdBQU16eEIsQ0FBTixDQUFRMnhCLEVBQUVoeEIsQ0FBRjtBQUFLLE9BQUVYLENBQUYsSUFBS1csRUFBRVgsQ0FBRixLQUFNLEVBQUM0eEIsR0FBRXJ5QixDQUFILEVBQVgsQ0FBaUJvQixFQUFFQyxLQUFGLENBQVFpeEIsZUFBUixHQUF3QixTQUFPdHlCLENBQVAsR0FBUyxHQUFqQyxDQUFxQ29CLEVBQUVDLEtBQUYsQ0FBUWt4QixrQkFBUixHQUEyQlYsRUFBRSxpQkFBRixLQUFzQixRQUFqRCxDQUEwRHp3QixFQUFFQyxLQUFGLENBQVFteEIsZ0JBQVIsR0FBeUIsV0FBekIsQ0FBcUMsSUFBR1gsRUFBRSxZQUFGLEVBQWdCMTJCLE9BQWhCLENBQXdCLFlBQXhCLElBQXNDLENBQXpDLEVBQTJDO0FBQUNpRyxRQUFFQyxLQUFGLENBQVFveEIsY0FBUixHQUF1QlosRUFBRSxZQUFGLEVBQWdCcHRCLE9BQWhCLENBQXdCLE1BQXhCLEVBQStCLE1BQS9CLENBQXZCO0FBQThELEtBQTFHLE1BQThHO0FBQUMsVUFBRyxDQUFDckQsRUFBRVgsQ0FBRixFQUFLVCxDQUFULEVBQVc7QUFBQ29CLFVBQUVYLENBQUYsRUFBS1QsQ0FBTCxHQUFPLElBQUkweUIsS0FBSixFQUFQLENBQWlCdHhCLEVBQUVYLENBQUYsRUFBS1QsQ0FBTCxDQUFPa3lCLEdBQVAsR0FBV2x5QixDQUFYO0FBQWEsUUFBQyxTQUFTZ3lCLENBQVQsR0FBWTtBQUFDLFlBQUc1d0IsRUFBRVgsQ0FBRixFQUFLVCxDQUFMLENBQU84TyxZQUFWLEVBQXVCO0FBQUMsY0FBRzFOLEVBQUVYLENBQUYsRUFBS1QsQ0FBTCxDQUFPOE8sWUFBUCxHQUFvQjFOLEVBQUV1RSxLQUF0QixJQUE2QnZFLEVBQUVYLENBQUYsRUFBS1QsQ0FBTCxDQUFPMnlCLGFBQVAsR0FBcUJ2eEIsRUFBRXNFLE1BQXZELEVBQThEO0FBQUN0RSxjQUFFQyxLQUFGLENBQVFveEIsY0FBUixHQUF1QixTQUF2QjtBQUFpQyxXQUFoRyxNQUFvRztBQUFDcnhCLGNBQUVDLEtBQUYsQ0FBUW94QixjQUFSLEdBQXVCLE1BQXZCO0FBQThCO0FBQU8sb0JBQVdULENBQVgsRUFBYSxHQUFiO0FBQWtCLE9BQWxNO0FBQXNNO0FBQUMsWUFBU0ksQ0FBVCxDQUFXaHhCLENBQVgsRUFBYTtBQUFDLFFBQUlwQixJQUFFLEVBQUMrSixLQUFJLFlBQVU7QUFBQyxlQUFPM0ksRUFBRVgsQ0FBRixFQUFLNHhCLENBQVo7QUFBYyxPQUE5QixFQUErQnoxQixLQUFJLFVBQVNvRCxDQUFULEVBQVc7QUFBQyxlQUFPb0IsRUFBRVgsQ0FBRixFQUFLVCxDQUFaLENBQWMsT0FBT2d5QixFQUFFNXdCLENBQUYsRUFBSXBCLENBQUosQ0FBUDtBQUFjLE9BQTNFLEVBQU4sQ0FBbUZkLE9BQU8wekIsY0FBUCxDQUFzQnh4QixDQUF0QixFQUF3QixLQUF4QixFQUE4QnBCLENBQTlCLEVBQWlDZCxPQUFPMHpCLGNBQVAsQ0FBc0J4eEIsQ0FBdEIsRUFBd0IsWUFBeEIsRUFBcUMsRUFBQzJJLEtBQUkvSixFQUFFK0osR0FBUCxFQUFyQztBQUFrRCxZQUFTOG9CLENBQVQsQ0FBV3B5QixDQUFYLEVBQWE7QUFBQzFILFdBQU9tRCxnQkFBUCxDQUF3QixRQUF4QixFQUFpQzQyQixFQUFFbHZCLElBQUYsQ0FBTyxJQUFQLEVBQVluRCxDQUFaLENBQWpDO0FBQWlELFlBQVNzeUIsQ0FBVCxDQUFXdHlCLENBQVgsRUFBYTtBQUFDLFFBQUdBLEVBQUU3RixNQUFGLENBQVNvNEIsT0FBVCxLQUFtQixLQUF0QixFQUE0QjtBQUFDaEIsUUFBRXZ4QixFQUFFN0YsTUFBSjtBQUFZO0FBQUMsWUFBU2s0QixDQUFULENBQVdyeUIsQ0FBWCxFQUFhVyxDQUFiLEVBQWU7QUFBQyxRQUFHcEIsQ0FBSCxFQUFLO0FBQUMsYUFBTyxLQUFQO0FBQWEsU0FBSTh4QixJQUFFLENBQUNELENBQUQsSUFBSSxDQUFDcHhCLENBQVgsQ0FBYVcsSUFBRUEsS0FBRyxFQUFMLENBQVFYLElBQUVBLEtBQUcsS0FBTCxDQUFXLElBQUcsT0FBT0EsQ0FBUCxLQUFXLFFBQWQsRUFBdUI7QUFBQ0EsVUFBRXpFLFNBQVNtWCxnQkFBVCxDQUEwQixLQUExQixDQUFGO0FBQW1DLEtBQTNELE1BQWdFLElBQUcsQ0FBQzFTLEVBQUVuQixNQUFOLEVBQWE7QUFBQ21CLFVBQUUsQ0FBQ0EsQ0FBRCxDQUFGO0FBQU0sVUFBSSxJQUFJMnhCLElBQUUsQ0FBVixFQUFZQSxJQUFFM3hCLEVBQUVuQixNQUFoQixFQUF1Qjh5QixHQUF2QixFQUEyQjtBQUFDSixRQUFFdnhCLEVBQUUyeEIsQ0FBRixDQUFGO0FBQVEsU0FBR04sQ0FBSCxFQUFLO0FBQUM5MUIsZUFBUzlDLElBQVQsQ0FBY2dELGdCQUFkLENBQStCLE1BQS9CLEVBQXNDNjJCLENBQXRDLEVBQXdDLElBQXhDLEVBQThDbEIsSUFBRSxJQUFGLENBQU9weEIsSUFBRSxLQUFGO0FBQVEsU0FBR1csRUFBRTZ4QixPQUFMLEVBQWE7QUFBQ0osUUFBRXB5QixDQUFGO0FBQUs7QUFBQyxVQUFPcXlCLENBQVA7QUFBUyxDQUF4akQsRUFBcEI7OztBQ0FBOzs7QUFHQSxDQUFDLFVBQVNWLENBQVQsRUFBVztBQUFDLGdCQUFZLE9BQU9jLE1BQW5CLElBQTJCQSxPQUFPQyxHQUFsQyxHQUFzQ0QsT0FBTyxDQUFDLFFBQUQsQ0FBUCxFQUFrQmQsQ0FBbEIsQ0FBdEMsR0FBMkQsWUFBVSxPQUFPZ0IsTUFBakIsSUFBeUJBLE9BQU9DLE9BQWhDLEdBQXdDRCxPQUFPQyxPQUFQLEdBQWVqQixFQUFFa0IsUUFBUSxRQUFSLENBQUYsQ0FBdkQsR0FBNEVsQixFQUFFMXRCLE1BQUYsQ0FBdkk7QUFBaUosQ0FBN0osQ0FBOEosVUFBUzB0QixDQUFULEVBQVc7QUFBQ0EsSUFBRWxxQixNQUFGLENBQVNrcUIsRUFBRTF2QixFQUFYLEVBQWMsRUFBQzZ3QixVQUFTLFVBQVNDLENBQVQsRUFBVztBQUFDLFVBQUcsQ0FBQyxLQUFLbDBCLE1BQVQsRUFBZ0IsT0FBTyxNQUFLazBCLEtBQUdBLEVBQUVDLEtBQUwsSUFBWTE2QixPQUFPcUcsT0FBbkIsSUFBNEJBLFFBQVFrQixJQUFSLENBQWEsc0RBQWIsQ0FBakMsQ0FBUCxDQUE4RyxJQUFJdXlCLElBQUVULEVBQUVuMEIsSUFBRixDQUFPLEtBQUssQ0FBTCxDQUFQLEVBQWUsV0FBZixDQUFOLENBQWtDLE9BQU80MEIsSUFBRUEsQ0FBRixJQUFLLEtBQUt6MUIsSUFBTCxDQUFVLFlBQVYsRUFBdUIsWUFBdkIsR0FBcUN5MUIsSUFBRSxJQUFJVCxFQUFFcGMsU0FBTixDQUFnQndkLENBQWhCLEVBQWtCLEtBQUssQ0FBTCxDQUFsQixDQUF2QyxFQUFrRXBCLEVBQUVuMEIsSUFBRixDQUFPLEtBQUssQ0FBTCxDQUFQLEVBQWUsV0FBZixFQUEyQjQwQixDQUEzQixDQUFsRSxFQUFnR0EsRUFBRWEsUUFBRixDQUFXQyxRQUFYLEtBQXNCLEtBQUt4cEIsRUFBTCxDQUFRLGdCQUFSLEVBQXlCLFNBQXpCLEVBQW1DLFVBQVNxcEIsQ0FBVCxFQUFXO0FBQUNYLFVBQUVhLFFBQUYsQ0FBV0UsYUFBWCxLQUEyQmYsRUFBRWdCLFlBQUYsR0FBZUwsRUFBRTU0QixNQUE1QyxHQUFvRHczQixFQUFFLElBQUYsRUFBUXZaLFFBQVIsQ0FBaUIsUUFBakIsTUFBNkJnYSxFQUFFaUIsWUFBRixHQUFlLENBQUMsQ0FBN0MsQ0FBcEQsRUFBb0csS0FBSyxDQUFMLEtBQVMxQixFQUFFLElBQUYsRUFBUWgxQixJQUFSLENBQWEsZ0JBQWIsQ0FBVCxLQUEwQ3kxQixFQUFFaUIsWUFBRixHQUFlLENBQUMsQ0FBMUQsQ0FBcEc7QUFBaUssT0FBaE4sR0FBa04sS0FBSzNwQixFQUFMLENBQVEsaUJBQVIsRUFBMEIsVUFBU3FwQixDQUFULEVBQVc7QUFBQyxpQkFBU08sQ0FBVCxHQUFZO0FBQUMsY0FBSUEsQ0FBSixFQUFNdHpCLENBQU4sQ0FBUSxPQUFNLENBQUNveUIsRUFBRWEsUUFBRixDQUFXRSxhQUFaLEtBQTRCZixFQUFFZ0IsWUFBRixLQUFpQkUsSUFBRTNCLEVBQUUsd0JBQUYsRUFBNEJoMUIsSUFBNUIsQ0FBaUMsTUFBakMsRUFBd0N5MUIsRUFBRWdCLFlBQUYsQ0FBZXYyQixJQUF2RCxFQUE2RG1PLEdBQTdELENBQWlFMm1CLEVBQUVTLEVBQUVnQixZQUFKLEVBQWtCcG9CLEdBQWxCLEVBQWpFLEVBQTBGdkosUUFBMUYsQ0FBbUcyd0IsRUFBRW1CLFdBQXJHLENBQW5CLEdBQXNJdnpCLElBQUVveUIsRUFBRWEsUUFBRixDQUFXRSxhQUFYLENBQXlCdHhCLElBQXpCLENBQThCdXdCLENBQTlCLEVBQWdDQSxFQUFFbUIsV0FBbEMsRUFBOENSLENBQTlDLENBQXhJLEVBQXlMWCxFQUFFZ0IsWUFBRixJQUFnQkUsRUFBRS9XLE1BQUYsRUFBek0sRUFBb04sS0FBSyxDQUFMLEtBQVN2YyxDQUFULElBQVlBLENBQTVQLENBQU47QUFBcVEsZ0JBQU9veUIsRUFBRWEsUUFBRixDQUFXRCxLQUFYLElBQWtCRCxFQUFFdGtCLGNBQUYsRUFBbEIsRUFBcUMyakIsRUFBRWlCLFlBQUYsSUFBZ0JqQixFQUFFaUIsWUFBRixHQUFlLENBQUMsQ0FBaEIsRUFBa0JDLEdBQWxDLElBQXVDbEIsRUFBRW9CLElBQUYsS0FBU3BCLEVBQUVxQixjQUFGLElBQWtCckIsRUFBRXNCLGFBQUYsR0FBZ0IsQ0FBQyxDQUFqQixFQUFtQixDQUFDLENBQXRDLElBQXlDSixHQUFsRCxJQUF1RGxCLEVBQUV1QixZQUFGLElBQWlCLENBQUMsQ0FBekUsQ0FBbkY7QUFBK0osT0FBL2QsQ0FBeE8sQ0FBaEcsRUFBMHlCdkIsQ0FBL3lCLENBQVA7QUFBeXpCLEtBQS8rQixFQUFnL0JqYyxPQUFNLFlBQVU7QUFBQyxVQUFJNGMsQ0FBSixFQUFNWCxDQUFOLEVBQVFrQixDQUFSLENBQVUsT0FBTzNCLEVBQUUsS0FBSyxDQUFMLENBQUYsRUFBVzVwQixFQUFYLENBQWMsTUFBZCxJQUFzQmdyQixJQUFFLEtBQUtELFFBQUwsR0FBZ0JVLElBQWhCLEVBQXhCLElBQWdERixJQUFFLEVBQUYsRUFBS1AsSUFBRSxDQUFDLENBQVIsRUFBVVgsSUFBRVQsRUFBRSxLQUFLLENBQUwsRUFBUTZCLElBQVYsRUFBZ0JWLFFBQWhCLEVBQVosRUFBdUMsS0FBSzcwQixJQUFMLENBQVUsWUFBVTtBQUFDODBCLFlBQUVYLEVBQUU5dEIsT0FBRixDQUFVLElBQVYsS0FBaUJ5dUIsQ0FBbkIsRUFBcUJBLE1BQUlPLElBQUVBLEVBQUU3dkIsTUFBRixDQUFTMnVCLEVBQUV3QixTQUFYLENBQU4sQ0FBckI7QUFBa0QsT0FBdkUsQ0FBdkMsRUFBZ0h4QixFQUFFd0IsU0FBRixHQUFZTixDQUE1SyxHQUErS1AsQ0FBdEw7QUFBd0wsS0FBbnNDLEVBQW9zQzdRLE9BQU0sVUFBUzZRLENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsVUFBSWtCLENBQUo7QUFBQSxVQUFNdHpCLENBQU47QUFBQSxVQUFRcXlCLENBQVI7QUFBQSxVQUFVd0IsQ0FBVjtBQUFBLFVBQVlDLENBQVo7QUFBQSxVQUFjdjBCLENBQWQ7QUFBQSxVQUFnQnNpQixJQUFFLEtBQUssQ0FBTCxDQUFsQixDQUEwQixJQUFHLFFBQU1BLENBQU4sSUFBUyxRQUFNQSxFQUFFMlIsSUFBcEIsRUFBeUI7QUFBQyxZQUFHVCxDQUFILEVBQUssUUFBT08sSUFBRTNCLEVBQUVuMEIsSUFBRixDQUFPcWtCLEVBQUUyUixJQUFULEVBQWMsV0FBZCxFQUEyQlAsUUFBN0IsRUFBc0NqekIsSUFBRXN6QixFQUFFcFIsS0FBMUMsRUFBZ0RtUSxJQUFFVixFQUFFcGMsU0FBRixDQUFZd2UsV0FBWixDQUF3QmxTLENBQXhCLENBQWxELEVBQTZFa1IsQ0FBcEYsR0FBdUYsS0FBSSxLQUFKO0FBQVVwQixjQUFFbHFCLE1BQUYsQ0FBUzRxQixDQUFULEVBQVdWLEVBQUVwYyxTQUFGLENBQVl5ZSxhQUFaLENBQTBCNUIsQ0FBMUIsQ0FBWCxHQUF5QyxPQUFPQyxFQUFFNEIsUUFBbEQsRUFBMkRqMEIsRUFBRTZoQixFQUFFaGxCLElBQUosSUFBVXcxQixDQUFyRSxFQUF1RUQsRUFBRTZCLFFBQUYsS0FBYVgsRUFBRVcsUUFBRixDQUFXcFMsRUFBRWhsQixJQUFiLElBQW1CODBCLEVBQUVscUIsTUFBRixDQUFTNnJCLEVBQUVXLFFBQUYsQ0FBV3BTLEVBQUVobEIsSUFBYixDQUFULEVBQTRCdTFCLEVBQUU2QixRQUE5QixDQUFoQyxDQUF2RSxDQUFnSixNQUFNLEtBQUksUUFBSjtBQUFhLG1CQUFPN0IsS0FBRzd5QixJQUFFLEVBQUYsRUFBS295QixFQUFFMXpCLElBQUYsQ0FBT20wQixFQUFFcnlCLEtBQUYsQ0FBUSxJQUFSLENBQVAsRUFBcUIsVUFBU2d6QixDQUFULEVBQVdYLENBQVgsRUFBYTtBQUFDN3lCLGdCQUFFNnlCLENBQUYsSUFBS0MsRUFBRUQsQ0FBRixDQUFMLEVBQVUsT0FBT0MsRUFBRUQsQ0FBRixDQUFqQixFQUFzQixlQUFhQSxDQUFiLElBQWdCVCxFQUFFOVAsQ0FBRixFQUFLbGtCLFVBQUwsQ0FBZ0IsZUFBaEIsQ0FBdEM7QUFBdUUsYUFBMUcsQ0FBTCxFQUFpSDRCLENBQXBILEtBQXdILE9BQU9TLEVBQUU2aEIsRUFBRWhsQixJQUFKLENBQVAsRUFBaUJ3MUIsQ0FBekksQ0FBUCxDQUFwUSxDQUF1WixPQUFPd0IsSUFBRWxDLEVBQUVwYyxTQUFGLENBQVkyZSxjQUFaLENBQTJCdkMsRUFBRWxxQixNQUFGLENBQVMsRUFBVCxFQUFZa3FCLEVBQUVwYyxTQUFGLENBQVk0ZSxVQUFaLENBQXVCdFMsQ0FBdkIsQ0FBWixFQUFzQzhQLEVBQUVwYyxTQUFGLENBQVk2ZSxjQUFaLENBQTJCdlMsQ0FBM0IsQ0FBdEMsRUFBb0U4UCxFQUFFcGMsU0FBRixDQUFZOGUsU0FBWixDQUFzQnhTLENBQXRCLENBQXBFLEVBQTZGOFAsRUFBRXBjLFNBQUYsQ0FBWXdlLFdBQVosQ0FBd0JsUyxDQUF4QixDQUE3RixDQUEzQixFQUFvSkEsQ0FBcEosQ0FBRixFQUF5SmdTLEVBQUV0ZCxRQUFGLEtBQWF1ZCxJQUFFRCxFQUFFdGQsUUFBSixFQUFhLE9BQU9zZCxFQUFFdGQsUUFBdEIsRUFBK0JzZCxJQUFFbEMsRUFBRWxxQixNQUFGLENBQVMsRUFBQzhPLFVBQVN1ZCxDQUFWLEVBQVQsRUFBc0JELENBQXRCLENBQWpDLEVBQTBEbEMsRUFBRTlQLENBQUYsRUFBS2xsQixJQUFMLENBQVUsZUFBVixFQUEwQixNQUExQixDQUF2RSxDQUF6SixFQUFtUWszQixFQUFFUyxNQUFGLEtBQVdSLElBQUVELEVBQUVTLE1BQUosRUFBVyxPQUFPVCxFQUFFUyxNQUFwQixFQUEyQlQsSUFBRWxDLEVBQUVscUIsTUFBRixDQUFTb3NCLENBQVQsRUFBVyxFQUFDUyxRQUFPUixDQUFSLEVBQVgsQ0FBeEMsQ0FBblEsRUFBbVVELENBQTFVO0FBQTRVO0FBQUMsS0FBci9ELEVBQWQsR0FBc2dFbEMsRUFBRWxxQixNQUFGLENBQVNrcUIsRUFBRTRDLElBQUYsQ0FBTyxHQUFQLENBQVQsRUFBcUIsRUFBQ0MsT0FBTSxVQUFTekIsQ0FBVCxFQUFXO0FBQUMsYUFBTSxDQUFDcEIsRUFBRXZ4QixJQUFGLENBQU8sS0FBR3V4QixFQUFFb0IsQ0FBRixFQUFLL25CLEdBQUwsRUFBVixDQUFQO0FBQTZCLEtBQWhELEVBQWlEeXBCLFFBQU8sVUFBUzFCLENBQVQsRUFBVztBQUFDLFVBQUlYLElBQUVULEVBQUVvQixDQUFGLEVBQUsvbkIsR0FBTCxFQUFOLENBQWlCLE9BQU8sU0FBT29uQixDQUFQLElBQVUsQ0FBQyxDQUFDVCxFQUFFdnhCLElBQUYsQ0FBTyxLQUFHZ3lCLENBQVYsQ0FBbkI7QUFBZ0MsS0FBckgsRUFBc0hzQyxXQUFVLFVBQVMzQixDQUFULEVBQVc7QUFBQyxhQUFNLENBQUNwQixFQUFFb0IsQ0FBRixFQUFLbDFCLElBQUwsQ0FBVSxTQUFWLENBQVA7QUFBNEIsS0FBeEssRUFBckIsQ0FBdGdFLEVBQXNzRTh6QixFQUFFcGMsU0FBRixHQUFZLFVBQVN3ZCxDQUFULEVBQVdYLENBQVgsRUFBYTtBQUFDLFNBQUthLFFBQUwsR0FBY3RCLEVBQUVscUIsTUFBRixDQUFTLENBQUMsQ0FBVixFQUFZLEVBQVosRUFBZWtxQixFQUFFcGMsU0FBRixDQUFZaEMsUUFBM0IsRUFBb0N3ZixDQUFwQyxDQUFkLEVBQXFELEtBQUtRLFdBQUwsR0FBaUJuQixDQUF0RSxFQUF3RSxLQUFLdGlCLElBQUwsRUFBeEU7QUFBb0YsR0FBcHpFLEVBQXF6RTZoQixFQUFFcGMsU0FBRixDQUFZb2YsTUFBWixHQUFtQixVQUFTNUIsQ0FBVCxFQUFXWCxDQUFYLEVBQWE7QUFBQyxXQUFPLE1BQUloeEIsVUFBVXZDLE1BQWQsR0FBcUIsWUFBVTtBQUFDLFVBQUl1ekIsSUFBRVQsRUFBRWlELFNBQUYsQ0FBWXh6QixTQUFaLENBQU4sQ0FBNkIsT0FBT2d4QixFQUFFeUMsT0FBRixDQUFVOUIsQ0FBVixHQUFhcEIsRUFBRXBjLFNBQUYsQ0FBWW9mLE1BQVosQ0FBbUJ0ekIsS0FBbkIsQ0FBeUIsSUFBekIsRUFBOEIrd0IsQ0FBOUIsQ0FBcEI7QUFBcUQsS0FBbEgsR0FBbUgsS0FBSyxDQUFMLEtBQVNBLENBQVQsR0FBV1csQ0FBWCxJQUFjM3hCLFVBQVV2QyxNQUFWLEdBQWlCLENBQWpCLElBQW9CdXpCLEVBQUVoMUIsV0FBRixLQUFnQnRCLEtBQXBDLEtBQTRDczJCLElBQUVULEVBQUVpRCxTQUFGLENBQVl4ekIsU0FBWixFQUF1QmhDLEtBQXZCLENBQTZCLENBQTdCLENBQTlDLEdBQStFZ3pCLEVBQUVoMUIsV0FBRixLQUFnQnRCLEtBQWhCLEtBQXdCczJCLElBQUUsQ0FBQ0EsQ0FBRCxDQUExQixDQUEvRSxFQUE4R1QsRUFBRTF6QixJQUFGLENBQU9tMEIsQ0FBUCxFQUFTLFVBQVNULENBQVQsRUFBV1MsQ0FBWCxFQUFhO0FBQUNXLFVBQUVBLEVBQUUvdUIsT0FBRixDQUFVLElBQUlxUyxNQUFKLENBQVcsUUFBTXNiLENBQU4sR0FBUSxLQUFuQixFQUF5QixHQUF6QixDQUFWLEVBQXdDLFlBQVU7QUFBQyxlQUFPUyxDQUFQO0FBQVMsT0FBNUQsQ0FBRjtBQUFnRSxLQUF2RixDQUE5RyxFQUF1TVcsQ0FBck4sQ0FBMUg7QUFBa1YsR0FBeHFGLEVBQXlxRnBCLEVBQUVscUIsTUFBRixDQUFTa3FCLEVBQUVwYyxTQUFYLEVBQXFCLEVBQUNoQyxVQUFTLEVBQUMwZ0IsVUFBUyxFQUFWLEVBQWF2UyxRQUFPLEVBQXBCLEVBQXVCUSxPQUFNLEVBQTdCLEVBQWdDNFMsWUFBVyxPQUEzQyxFQUFtREMsY0FBYSxTQUFoRSxFQUEwRUMsWUFBVyxPQUFyRixFQUE2RkMsY0FBYSxPQUExRyxFQUFrSEMsY0FBYSxDQUFDLENBQWhJLEVBQWtJdkIsY0FBYSxDQUFDLENBQWhKLEVBQWtKd0IsZ0JBQWV4RCxFQUFFLEVBQUYsQ0FBakssRUFBdUt5RCxxQkFBb0J6RCxFQUFFLEVBQUYsQ0FBM0wsRUFBaU11QixVQUFTLENBQUMsQ0FBM00sRUFBNk1tQyxRQUFPLFNBQXBOLEVBQThOQyxhQUFZLENBQUMsQ0FBM08sRUFBNk9DLFdBQVUsVUFBUzVELENBQVQsRUFBVztBQUFDLGFBQUs2RCxVQUFMLEdBQWdCN0QsQ0FBaEIsRUFBa0IsS0FBS3NCLFFBQUwsQ0FBY2lDLFlBQWQsS0FBNkIsS0FBS2pDLFFBQUwsQ0FBY3dDLFdBQWQsSUFBMkIsS0FBS3hDLFFBQUwsQ0FBY3dDLFdBQWQsQ0FBMEI1ekIsSUFBMUIsQ0FBK0IsSUFBL0IsRUFBb0M4dkIsQ0FBcEMsRUFBc0MsS0FBS3NCLFFBQUwsQ0FBYzZCLFVBQXBELEVBQStELEtBQUs3QixRQUFMLENBQWMrQixVQUE3RSxDQUEzQixFQUFvSCxLQUFLVSxTQUFMLENBQWUsS0FBS0MsU0FBTCxDQUFlaEUsQ0FBZixDQUFmLENBQWpKLENBQWxCO0FBQXNNLE9BQXpjLEVBQTBjaUUsWUFBVyxVQUFTakUsQ0FBVCxFQUFXO0FBQUMsYUFBS2tFLFNBQUwsQ0FBZWxFLENBQWYsS0FBbUIsRUFBRUEsRUFBRTkwQixJQUFGLElBQVUsS0FBS2k1QixTQUFqQixLQUE2QixLQUFLQyxRQUFMLENBQWNwRSxDQUFkLENBQWhELElBQWtFLEtBQUtydEIsT0FBTCxDQUFhcXRCLENBQWIsQ0FBbEU7QUFBa0YsT0FBbmpCLEVBQW9qQnFFLFNBQVEsVUFBU2pELENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsWUFBSWtCLElBQUUsQ0FBQyxFQUFELEVBQUksRUFBSixFQUFPLEVBQVAsRUFBVSxFQUFWLEVBQWEsRUFBYixFQUFnQixFQUFoQixFQUFtQixFQUFuQixFQUFzQixFQUF0QixFQUF5QixFQUF6QixFQUE0QixFQUE1QixFQUErQixFQUEvQixFQUFrQyxHQUFsQyxFQUFzQyxHQUF0QyxDQUFOLENBQWlELE1BQUlsQixFQUFFbjNCLEtBQU4sSUFBYSxPQUFLLEtBQUtnN0IsWUFBTCxDQUFrQmxELENBQWxCLENBQWxCLElBQXdDcEIsRUFBRXVFLE9BQUYsQ0FBVTlELEVBQUVwM0IsT0FBWixFQUFvQnM0QixDQUFwQixNQUF5QixDQUFDLENBQWxFLElBQXFFLENBQUNQLEVBQUVsMkIsSUFBRixJQUFVLEtBQUtpNUIsU0FBZixJQUEwQi9DLEVBQUVsMkIsSUFBRixJQUFVLEtBQUtzNUIsT0FBMUMsS0FBb0QsS0FBSzd4QixPQUFMLENBQWF5dUIsQ0FBYixDQUF6SDtBQUF5SSxPQUFwd0IsRUFBcXdCcUQsU0FBUSxVQUFTekUsQ0FBVCxFQUFXO0FBQUNBLFVBQUU5MEIsSUFBRixJQUFVLEtBQUtpNUIsU0FBZixHQUF5QixLQUFLeHhCLE9BQUwsQ0FBYXF0QixDQUFiLENBQXpCLEdBQXlDQSxFQUFFbHNCLFVBQUYsQ0FBYTVJLElBQWIsSUFBcUIsS0FBS2k1QixTQUExQixJQUFxQyxLQUFLeHhCLE9BQUwsQ0FBYXF0QixFQUFFbHNCLFVBQWYsQ0FBOUU7QUFBeUcsT0FBbDRCLEVBQW00QjR3QixXQUFVLFVBQVN0RCxDQUFULEVBQVdYLENBQVgsRUFBYWtCLENBQWIsRUFBZTtBQUFDLG9CQUFVUCxFQUFFLzRCLElBQVosR0FBaUIsS0FBS3M4QixVQUFMLENBQWdCdkQsRUFBRWwyQixJQUFsQixFQUF3QnlQLFFBQXhCLENBQWlDOGxCLENBQWpDLEVBQW9DendCLFdBQXBDLENBQWdEMnhCLENBQWhELENBQWpCLEdBQW9FM0IsRUFBRW9CLENBQUYsRUFBS3ptQixRQUFMLENBQWM4bEIsQ0FBZCxFQUFpQnp3QixXQUFqQixDQUE2QjJ4QixDQUE3QixDQUFwRTtBQUFvRyxPQUFqZ0MsRUFBa2dDbUMsYUFBWSxVQUFTMUMsQ0FBVCxFQUFXWCxDQUFYLEVBQWFrQixDQUFiLEVBQWU7QUFBQyxvQkFBVVAsRUFBRS80QixJQUFaLEdBQWlCLEtBQUtzOEIsVUFBTCxDQUFnQnZELEVBQUVsMkIsSUFBbEIsRUFBd0I4RSxXQUF4QixDQUFvQ3l3QixDQUFwQyxFQUF1QzlsQixRQUF2QyxDQUFnRGduQixDQUFoRCxDQUFqQixHQUFvRTNCLEVBQUVvQixDQUFGLEVBQUtweEIsV0FBTCxDQUFpQnl3QixDQUFqQixFQUFvQjlsQixRQUFwQixDQUE2QmduQixDQUE3QixDQUFwRTtBQUFvRyxPQUFsb0MsRUFBVixFQUE4b0NpRCxhQUFZLFVBQVN4RCxDQUFULEVBQVc7QUFBQ3BCLFFBQUVscUIsTUFBRixDQUFTa3FCLEVBQUVwYyxTQUFGLENBQVloQyxRQUFyQixFQUE4QndmLENBQTlCO0FBQWlDLEtBQXZzQyxFQUF3c0NrQixVQUFTLEVBQUMxZCxVQUFTLHlCQUFWLEVBQW9DK2QsUUFBTyx3QkFBM0MsRUFBb0VwZCxPQUFNLHFDQUExRSxFQUFnSEMsS0FBSSwyQkFBcEgsRUFBZ0pHLE1BQUssNEJBQXJKLEVBQWtMRSxTQUFRLGtDQUExTCxFQUE2TlQsUUFBTyw4QkFBcE8sRUFBbVF5ZixRQUFPLDJCQUExUSxFQUFzU2hoQixTQUFRLG9DQUE5UyxFQUFtVmloQixXQUFVOUUsRUFBRXBjLFNBQUYsQ0FBWW9mLE1BQVosQ0FBbUIsMkNBQW5CLENBQTdWLEVBQTZaK0IsV0FBVS9FLEVBQUVwYyxTQUFGLENBQVlvZixNQUFaLENBQW1CLHVDQUFuQixDQUF2YSxFQUFtZWdDLGFBQVloRixFQUFFcGMsU0FBRixDQUFZb2YsTUFBWixDQUFtQiwyREFBbkIsQ0FBL2UsRUFBK2pCaUMsT0FBTWpGLEVBQUVwYyxTQUFGLENBQVlvZixNQUFaLENBQW1CLDJDQUFuQixDQUFya0IsRUFBcW9CNXhCLEtBQUk0dUIsRUFBRXBjLFNBQUYsQ0FBWW9mLE1BQVosQ0FBbUIsaURBQW5CLENBQXpvQixFQUErc0IzYSxLQUFJMlgsRUFBRXBjLFNBQUYsQ0FBWW9mLE1BQVosQ0FBbUIsb0RBQW5CLENBQW50QixFQUE0eEJrQyxNQUFLbEYsRUFBRXBjLFNBQUYsQ0FBWW9mLE1BQVosQ0FBbUIsaUNBQW5CLENBQWp5QixFQUFqdEMsRUFBeWlFbUMsa0JBQWlCLENBQUMsQ0FBM2pFLEVBQTZqRS82QixXQUFVLEVBQUMrVCxNQUFLLFlBQVU7QUFBQyxpQkFBU2lqQixDQUFULENBQVdBLENBQVgsRUFBYTtBQUFDLFdBQUMsS0FBS1MsSUFBTixJQUFZLEtBQUsvNEIsWUFBTCxDQUFrQixpQkFBbEIsQ0FBWixLQUFtRCxLQUFLKzRCLElBQUwsR0FBVTdCLEVBQUUsSUFBRixFQUFRdGQsT0FBUixDQUFnQixNQUFoQixFQUF3QixDQUF4QixDQUE3RCxFQUF5RixJQUFJK2QsSUFBRVQsRUFBRW4wQixJQUFGLENBQU8sS0FBS2cyQixJQUFaLEVBQWlCLFdBQWpCLENBQU47QUFBQSxjQUFvQ0YsSUFBRSxPQUFLUCxFQUFFLzRCLElBQUYsQ0FBT2dLLE9BQVAsQ0FBZSxXQUFmLEVBQTJCLEVBQTNCLENBQTNDO0FBQUEsY0FBMEVoRSxJQUFFb3lCLEVBQUVhLFFBQTlFLENBQXVGanpCLEVBQUVzekIsQ0FBRixLQUFNLENBQUMzQixFQUFFLElBQUYsRUFBUTVwQixFQUFSLENBQVcvSCxFQUFFcTFCLE1BQWIsQ0FBUCxJQUE2QnIxQixFQUFFc3pCLENBQUYsRUFBS3p4QixJQUFMLENBQVV1d0IsQ0FBVixFQUFZLElBQVosRUFBaUJXLENBQWpCLENBQTdCO0FBQWlELGNBQUtnRSxjQUFMLEdBQW9CcEYsRUFBRSxLQUFLc0IsUUFBTCxDQUFjbUMsbUJBQWhCLENBQXBCLEVBQXlELEtBQUs0QixZQUFMLEdBQWtCLEtBQUtELGNBQUwsQ0FBb0JsNEIsTUFBcEIsSUFBNEIsS0FBS2s0QixjQUFqQyxJQUFpRHBGLEVBQUUsS0FBSzRCLFdBQVAsQ0FBNUgsRUFBZ0osS0FBSzBELFVBQUwsR0FBZ0J0RixFQUFFLEtBQUtzQixRQUFMLENBQWNrQyxjQUFoQixFQUFnQzNhLEdBQWhDLENBQW9DLEtBQUt5WSxRQUFMLENBQWNtQyxtQkFBbEQsQ0FBaEssRUFBdU8sS0FBS1UsU0FBTCxHQUFlLEVBQXRQLEVBQXlQLEtBQUtvQixVQUFMLEdBQWdCLEVBQXpRLEVBQTRRLEtBQUt6RCxjQUFMLEdBQW9CLENBQWhTLEVBQWtTLEtBQUswRCxPQUFMLEdBQWEsRUFBL1MsRUFBa1QsS0FBS2hCLE9BQUwsR0FBYSxFQUEvVCxFQUFrVSxLQUFLOXBCLEtBQUwsRUFBbFUsQ0FBK1UsSUFBSStsQixDQUFKO0FBQUEsWUFBTWtCLElBQUUsS0FBSzVSLE1BQUwsR0FBWSxFQUFwQixDQUF1QmlRLEVBQUUxekIsSUFBRixDQUFPLEtBQUtnMUIsUUFBTCxDQUFjdlIsTUFBckIsRUFBNEIsVUFBU3FSLENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsc0JBQVUsT0FBT0EsQ0FBakIsS0FBcUJBLElBQUVBLEVBQUVyeUIsS0FBRixDQUFRLElBQVIsQ0FBdkIsR0FBc0M0eEIsRUFBRTF6QixJQUFGLENBQU9tMEIsQ0FBUCxFQUFTLFVBQVNULENBQVQsRUFBV1MsQ0FBWCxFQUFhO0FBQUNrQixjQUFFbEIsQ0FBRixJQUFLVyxDQUFMO0FBQU8sV0FBOUIsQ0FBdEM7QUFBc0UsU0FBaEgsR0FBa0hYLElBQUUsS0FBS2EsUUFBTCxDQUFjL1EsS0FBbEksRUFBd0l5UCxFQUFFMXpCLElBQUYsQ0FBT20wQixDQUFQLEVBQVMsVUFBU1csQ0FBVCxFQUFXTyxDQUFYLEVBQWE7QUFBQ2xCLFlBQUVXLENBQUYsSUFBS3BCLEVBQUVwYyxTQUFGLENBQVl5ZSxhQUFaLENBQTBCVixDQUExQixDQUFMO0FBQWtDLFNBQXpELENBQXhJLEVBQW1NM0IsRUFBRSxLQUFLNEIsV0FBUCxFQUFvQjdwQixFQUFwQixDQUF1QixtREFBdkIsRUFBMkUsd1VBQTNFLEVBQW9acXBCLENBQXBaLEVBQXVacnBCLEVBQXZaLENBQTBaLGdCQUExWixFQUEyYSxtREFBM2EsRUFBK2RxcEIsQ0FBL2QsQ0FBbk0sRUFBcXFCLEtBQUtFLFFBQUwsQ0FBY21FLGNBQWQsSUFBOEJ6RixFQUFFLEtBQUs0QixXQUFQLEVBQW9CN3BCLEVBQXBCLENBQXVCLHVCQUF2QixFQUErQyxLQUFLdXBCLFFBQUwsQ0FBY21FLGNBQTdELENBQW5zQixFQUFneEJ6RixFQUFFLEtBQUs0QixXQUFQLEVBQW9COXpCLElBQXBCLENBQXlCLDZDQUF6QixFQUF3RTlDLElBQXhFLENBQTZFLGVBQTdFLEVBQTZGLE1BQTdGLENBQWh4QjtBQUFxM0IsT0FBMzlDLEVBQTQ5QzYyQixNQUFLLFlBQVU7QUFBQyxlQUFPLEtBQUs2RCxTQUFMLElBQWlCMUYsRUFBRWxxQixNQUFGLENBQVMsS0FBS3F1QixTQUFkLEVBQXdCLEtBQUt3QixRQUE3QixDQUFqQixFQUF3RCxLQUFLbkIsT0FBTCxHQUFheEUsRUFBRWxxQixNQUFGLENBQVMsRUFBVCxFQUFZLEtBQUs2dkIsUUFBakIsQ0FBckUsRUFBZ0csS0FBS25oQixLQUFMLE1BQWN3YixFQUFFLEtBQUs0QixXQUFQLEVBQW9CMXlCLGNBQXBCLENBQW1DLGNBQW5DLEVBQWtELENBQUMsSUFBRCxDQUFsRCxDQUE5RyxFQUF3SyxLQUFLMDJCLFVBQUwsRUFBeEssRUFBMEwsS0FBS3BoQixLQUFMLEVBQWpNO0FBQThNLE9BQTFyRCxFQUEyckRraEIsV0FBVSxZQUFVO0FBQUMsYUFBS0csV0FBTCxHQUFtQixLQUFJLElBQUk3RixJQUFFLENBQU4sRUFBUW9CLElBQUUsS0FBSzBFLGVBQUwsR0FBcUIsS0FBS0MsUUFBTCxFQUFuQyxFQUFtRDNFLEVBQUVwQixDQUFGLENBQW5ELEVBQXdEQSxHQUF4RDtBQUE0RCxlQUFLZ0csS0FBTCxDQUFXNUUsRUFBRXBCLENBQUYsQ0FBWDtBQUE1RCxTQUE2RSxPQUFPLEtBQUt4YixLQUFMLEVBQVA7QUFBb0IsT0FBcDBELEVBQXEwRDdSLFNBQVEsVUFBU3l1QixDQUFULEVBQVc7QUFBQyxZQUFJWCxDQUFKO0FBQUEsWUFBTWtCLENBQU47QUFBQSxZQUFRdHpCLElBQUUsS0FBSzQzQixLQUFMLENBQVc3RSxDQUFYLENBQVY7QUFBQSxZQUF3QlYsSUFBRSxLQUFLd0YsbUJBQUwsQ0FBeUI3M0IsQ0FBekIsQ0FBMUI7QUFBQSxZQUFzRDZ6QixJQUFFLElBQXhEO0FBQUEsWUFBNkRDLElBQUUsQ0FBQyxDQUFoRSxDQUFrRSxPQUFPLEtBQUssQ0FBTCxLQUFTekIsQ0FBVCxHQUFXLE9BQU8sS0FBSzhELE9BQUwsQ0FBYW4yQixFQUFFbkQsSUFBZixDQUFsQixJQUF3QyxLQUFLaTdCLGNBQUwsQ0FBb0J6RixDQUFwQixHQUF1QixLQUFLb0YsZUFBTCxHQUFxQjlGLEVBQUVVLENBQUYsQ0FBNUMsRUFBaURpQixJQUFFLEtBQUs1UixNQUFMLENBQVkyUSxFQUFFeDFCLElBQWQsQ0FBbkQsRUFBdUV5MkIsS0FBRzNCLEVBQUUxekIsSUFBRixDQUFPLEtBQUt5akIsTUFBWixFQUFtQixVQUFTaVEsQ0FBVCxFQUFXb0IsQ0FBWCxFQUFhO0FBQUNBLGdCQUFJTyxDQUFKLElBQU8zQixNQUFJVSxFQUFFeDFCLElBQWIsS0FBb0JtRCxJQUFFNnpCLEVBQUVnRSxtQkFBRixDQUFzQmhFLEVBQUUrRCxLQUFGLENBQVEvRCxFQUFFeUMsVUFBRixDQUFhM0UsQ0FBYixDQUFSLENBQXRCLENBQUYsRUFBa0QzeEIsS0FBR0EsRUFBRW5ELElBQUYsSUFBVWczQixFQUFFc0MsT0FBZixLQUF5QnRDLEVBQUU0RCxlQUFGLENBQWtCMThCLElBQWxCLENBQXVCaUYsQ0FBdkIsR0FBMEI4ekIsSUFBRUQsRUFBRThELEtBQUYsQ0FBUTMzQixDQUFSLEtBQVk4ekIsQ0FBakUsQ0FBdEU7QUFBMkksU0FBNUssQ0FBMUUsRUFBd1AxQixJQUFFLEtBQUt1RixLQUFMLENBQVd0RixDQUFYLE1BQWdCLENBQUMsQ0FBM1EsRUFBNlF5QixJQUFFQSxLQUFHMUIsQ0FBbFIsRUFBb1JBLElBQUUsS0FBSytELE9BQUwsQ0FBYTlELEVBQUV4MUIsSUFBZixJQUFxQixDQUFDLENBQXhCLEdBQTBCLEtBQUtzNUIsT0FBTCxDQUFhOUQsRUFBRXgxQixJQUFmLElBQXFCLENBQUMsQ0FBcFUsRUFBc1UsS0FBS2s3QixnQkFBTCxPQUEwQixLQUFLQyxNQUFMLEdBQVksS0FBS0EsTUFBTCxDQUFZeGQsR0FBWixDQUFnQixLQUFLeWMsVUFBckIsQ0FBdEMsQ0FBdFUsRUFBOFksS0FBS00sVUFBTCxFQUE5WSxFQUFnYTVGLEVBQUVvQixDQUFGLEVBQUtwMkIsSUFBTCxDQUFVLGNBQVYsRUFBeUIsQ0FBQ3kxQixDQUExQixDQUF4YyxHQUFzZTBCLENBQTdlO0FBQStlLE9BQTE0RSxFQUEyNEV5RCxZQUFXLFVBQVN4RSxDQUFULEVBQVc7QUFBQyxZQUFHQSxDQUFILEVBQUs7QUFBQyxjQUFJWCxJQUFFLElBQU4sQ0FBV1QsRUFBRWxxQixNQUFGLENBQVMsS0FBSzZ2QixRQUFkLEVBQXVCdkUsQ0FBdkIsR0FBMEIsS0FBS2EsU0FBTCxHQUFlakMsRUFBRXp4QixHQUFGLENBQU0sS0FBS28zQixRQUFYLEVBQW9CLFVBQVMzRixDQUFULEVBQVdvQixDQUFYLEVBQWE7QUFBQyxtQkFBTSxFQUFDamQsU0FBUTZiLENBQVQsRUFBV3J0QixTQUFROHRCLEVBQUVrRSxVQUFGLENBQWF2RCxDQUFiLEVBQWdCLENBQWhCLENBQW5CLEVBQU47QUFBNkMsV0FBL0UsQ0FBekMsRUFBMEgsS0FBS2tGLFdBQUwsR0FBaUJ0RyxFQUFFdUcsSUFBRixDQUFPLEtBQUtELFdBQVosRUFBd0IsVUFBU3RHLENBQVQsRUFBVztBQUFDLG1CQUFNLEVBQUVBLEVBQUU5MEIsSUFBRixJQUFVazJCLENBQVosQ0FBTjtBQUFxQixXQUF6RCxDQUEzSTtBQUFzTSxjQUFLRSxRQUFMLENBQWNzRSxVQUFkLEdBQXlCLEtBQUt0RSxRQUFMLENBQWNzRSxVQUFkLENBQXlCMTFCLElBQXpCLENBQThCLElBQTlCLEVBQW1DLEtBQUt5MUIsUUFBeEMsRUFBaUQsS0FBSzFELFNBQXRELENBQXpCLEdBQTBGLEtBQUt1RSxpQkFBTCxFQUExRjtBQUFtSCxPQUE1dUYsRUFBNnVGemtCLFdBQVUsWUFBVTtBQUFDaWUsVUFBRTF2QixFQUFGLENBQUt5UixTQUFMLElBQWdCaWUsRUFBRSxLQUFLNEIsV0FBUCxFQUFvQjdmLFNBQXBCLEVBQWhCLEVBQWdELEtBQUt5aUIsT0FBTCxHQUFhLEVBQTdELEVBQWdFLEtBQUtMLFNBQUwsR0FBZSxFQUEvRSxFQUFrRixLQUFLMEIsV0FBTCxFQUFsRixFQUFxRyxLQUFLWSxVQUFMLEVBQXJHLENBQXVILElBQUlyRixJQUFFLEtBQUsyRSxRQUFMLEdBQWdCOTVCLFVBQWhCLENBQTJCLGVBQTNCLEVBQTRDRCxVQUE1QyxDQUF1RCxjQUF2RCxDQUFOLENBQTZFLEtBQUswNkIsYUFBTCxDQUFtQnRGLENBQW5CO0FBQXNCLE9BQTU5RixFQUE2OUZzRixlQUFjLFVBQVMxRyxDQUFULEVBQVc7QUFBQyxZQUFJb0IsQ0FBSixDQUFNLElBQUcsS0FBS0UsUUFBTCxDQUFjd0MsV0FBakIsRUFBNkIsS0FBSTFDLElBQUUsQ0FBTixFQUFRcEIsRUFBRW9CLENBQUYsQ0FBUixFQUFhQSxHQUFiO0FBQWlCLGVBQUtFLFFBQUwsQ0FBY3dDLFdBQWQsQ0FBMEI1ekIsSUFBMUIsQ0FBK0IsSUFBL0IsRUFBb0M4dkIsRUFBRW9CLENBQUYsQ0FBcEMsRUFBeUMsS0FBS0UsUUFBTCxDQUFjNkIsVUFBdkQsRUFBa0UsRUFBbEUsR0FBc0UsS0FBS3dCLFVBQUwsQ0FBZ0IzRSxFQUFFb0IsQ0FBRixFQUFLbDJCLElBQXJCLEVBQTJCOEUsV0FBM0IsQ0FBdUMsS0FBS3N4QixRQUFMLENBQWMrQixVQUFyRCxDQUF0RTtBQUFqQixTQUE3QixNQUEwTHJELEVBQUVod0IsV0FBRixDQUFjLEtBQUtzeEIsUUFBTCxDQUFjNkIsVUFBNUIsRUFBd0NuekIsV0FBeEMsQ0FBb0QsS0FBS3N4QixRQUFMLENBQWMrQixVQUFsRTtBQUE4RSxPQUFyd0csRUFBc3dHK0Msa0JBQWlCLFlBQVU7QUFBQyxlQUFPLEtBQUtPLFlBQUwsQ0FBa0IsS0FBS25DLE9BQXZCLENBQVA7QUFBdUMsT0FBejBHLEVBQTAwR21DLGNBQWEsVUFBUzNHLENBQVQsRUFBVztBQUFDLFlBQUlvQixDQUFKO0FBQUEsWUFBTVgsSUFBRSxDQUFSLENBQVUsS0FBSVcsQ0FBSixJQUFTcEIsQ0FBVDtBQUFXQSxZQUFFb0IsQ0FBRixLQUFNWCxHQUFOO0FBQVgsU0FBcUIsT0FBT0EsQ0FBUDtBQUFTLE9BQTM0RyxFQUE0NEdnRyxZQUFXLFlBQVU7QUFBQyxhQUFLMUMsU0FBTCxDQUFlLEtBQUtzQyxNQUFwQjtBQUE0QixPQUE5N0csRUFBKzdHdEMsV0FBVSxVQUFTL0QsQ0FBVCxFQUFXO0FBQUNBLFVBQUVyZixHQUFGLENBQU0sS0FBSzJrQixVQUFYLEVBQXVCMXNCLElBQXZCLENBQTRCLEVBQTVCLEdBQWdDLEtBQUtndUIsVUFBTCxDQUFnQjVHLENBQWhCLEVBQW1CaGxCLElBQW5CLEVBQWhDO0FBQTBELE9BQS9nSCxFQUFnaEh3SixPQUFNLFlBQVU7QUFBQyxlQUFPLE1BQUksS0FBSy9NLElBQUwsRUFBWDtBQUF1QixPQUF4akgsRUFBeWpIQSxNQUFLLFlBQVU7QUFBQyxlQUFPLEtBQUt3cUIsU0FBTCxDQUFlLzBCLE1BQXRCO0FBQTZCLE9BQXRtSCxFQUF1bUg4MEIsY0FBYSxZQUFVO0FBQUMsWUFBRyxLQUFLVixRQUFMLENBQWNVLFlBQWpCLEVBQThCLElBQUc7QUFBQ2hDLFlBQUUsS0FBSzZHLGNBQUwsTUFBdUIsS0FBSzVFLFNBQUwsQ0FBZS8wQixNQUFmLElBQXVCLEtBQUsrMEIsU0FBTCxDQUFlLENBQWYsRUFBa0J0dkIsT0FBaEUsSUFBeUUsRUFBM0UsRUFBK0V3RCxNQUEvRSxDQUFzRixVQUF0RixFQUFrRzRRLEtBQWxHLEdBQTBHamIsT0FBMUcsQ0FBa0gsU0FBbEg7QUFBNkgsU0FBakksQ0FBaUksT0FBTWswQixDQUFOLEVBQVEsQ0FBRTtBQUFDLE9BQXp5SCxFQUEweUg2RyxnQkFBZSxZQUFVO0FBQUMsWUFBSXpGLElBQUUsS0FBS3lDLFVBQVgsQ0FBc0IsT0FBT3pDLEtBQUcsTUFBSXBCLEVBQUV1RyxJQUFGLENBQU8sS0FBS3RFLFNBQVosRUFBc0IsVUFBU2pDLENBQVQsRUFBVztBQUFDLGlCQUFPQSxFQUFFcnRCLE9BQUYsQ0FBVXpILElBQVYsS0FBaUJrMkIsRUFBRWwyQixJQUExQjtBQUErQixTQUFqRSxFQUFtRWdDLE1BQTFFLElBQWtGazBCLENBQXpGO0FBQTJGLE9BQXI3SCxFQUFzN0gyRSxVQUFTLFlBQVU7QUFBQyxZQUFJM0UsSUFBRSxJQUFOO0FBQUEsWUFBV1gsSUFBRSxFQUFiLENBQWdCLE9BQU9ULEVBQUUsS0FBSzRCLFdBQVAsRUFBb0I5ekIsSUFBcEIsQ0FBeUIsNENBQXpCLEVBQXVFNlMsR0FBdkUsQ0FBMkUsb0NBQTNFLEVBQWlIQSxHQUFqSCxDQUFxSCxLQUFLMmdCLFFBQUwsQ0FBY29DLE1BQW5JLEVBQTJJdnRCLE1BQTNJLENBQWtKLFlBQVU7QUFBQyxjQUFJd3JCLElBQUUsS0FBS3oyQixJQUFMLElBQVc4MEIsRUFBRSxJQUFGLEVBQVFoMUIsSUFBUixDQUFhLE1BQWIsQ0FBakIsQ0FBc0MsT0FBTSxDQUFDMjJCLENBQUQsSUFBSVAsRUFBRUUsUUFBRixDQUFXRCxLQUFmLElBQXNCMTZCLE9BQU9xRyxPQUE3QixJQUFzQ0EsUUFBUUMsS0FBUixDQUFjLHlCQUFkLEVBQXdDLElBQXhDLENBQXRDLEVBQW9GLEtBQUtuRSxZQUFMLENBQWtCLGlCQUFsQixNQUF1QyxLQUFLKzRCLElBQUwsR0FBVTdCLEVBQUUsSUFBRixFQUFRdGQsT0FBUixDQUFnQixNQUFoQixFQUF3QixDQUF4QixDQUFqRCxDQUFwRixFQUFpSyxFQUFFaWYsS0FBS2xCLENBQUwsSUFBUSxDQUFDVyxFQUFFdUYsWUFBRixDQUFlM0csRUFBRSxJQUFGLEVBQVF6UCxLQUFSLEVBQWYsQ0FBWCxNQUE4Q2tRLEVBQUVrQixDQUFGLElBQUssQ0FBQyxDQUFOLEVBQVEsQ0FBQyxDQUF2RCxDQUF2SztBQUFpTyxTQUFwYSxDQUFQO0FBQTZhLE9BQXY0SSxFQUF3NElzRSxPQUFNLFVBQVM3RSxDQUFULEVBQVc7QUFBQyxlQUFPcEIsRUFBRW9CLENBQUYsRUFBSyxDQUFMLENBQVA7QUFBZSxPQUF6NkksRUFBMDZJMEYsUUFBTyxZQUFVO0FBQUMsWUFBSTFGLElBQUUsS0FBS0UsUUFBTCxDQUFjNkIsVUFBZCxDQUF5Qi8wQixLQUF6QixDQUErQixHQUEvQixFQUFvQ29TLElBQXBDLENBQXlDLEdBQXpDLENBQU4sQ0FBb0QsT0FBT3dmLEVBQUUsS0FBS3NCLFFBQUwsQ0FBY2dDLFlBQWQsR0FBMkIsR0FBM0IsR0FBK0JsQyxDQUFqQyxFQUFtQyxLQUFLaUUsWUFBeEMsQ0FBUDtBQUE2RCxPQUE3aUosRUFBOGlKMEIsZ0JBQWUsWUFBVTtBQUFDLGFBQUtULFdBQUwsR0FBaUIsRUFBakIsRUFBb0IsS0FBS3JFLFNBQUwsR0FBZSxFQUFuQyxFQUFzQyxLQUFLMEQsUUFBTCxHQUFjLEVBQXBELEVBQXVELEtBQUtxQixNQUFMLEdBQVloSCxFQUFFLEVBQUYsQ0FBbkUsRUFBeUUsS0FBS3FHLE1BQUwsR0FBWXJHLEVBQUUsRUFBRixDQUFyRjtBQUEyRixPQUFucUosRUFBb3FKdGxCLE9BQU0sWUFBVTtBQUFDLGFBQUtxc0IsY0FBTCxJQUFzQixLQUFLakIsZUFBTCxHQUFxQjlGLEVBQUUsRUFBRixDQUEzQztBQUFpRCxPQUF0dUosRUFBdXVKNkYsYUFBWSxZQUFVO0FBQUMsYUFBS25yQixLQUFMLElBQWEsS0FBSzJyQixNQUFMLEdBQVksS0FBS1MsTUFBTCxHQUFjamUsR0FBZCxDQUFrQixLQUFLeWMsVUFBdkIsQ0FBekI7QUFBNEQsT0FBMXpKLEVBQTJ6SmEsZ0JBQWUsVUFBU25HLENBQVQsRUFBVztBQUFDLGFBQUt0bEIsS0FBTCxJQUFhLEtBQUsyckIsTUFBTCxHQUFZLEtBQUtyQyxTQUFMLENBQWVoRSxDQUFmLENBQXpCO0FBQTJDLE9BQWo0SixFQUFrNEpzRSxjQUFhLFVBQVNsRCxDQUFULEVBQVc7QUFBQyxZQUFJWCxDQUFKO0FBQUEsWUFBTWtCLENBQU47QUFBQSxZQUFRdHpCLElBQUUyeEIsRUFBRW9CLENBQUYsQ0FBVjtBQUFBLFlBQWVWLElBQUVVLEVBQUUvNEIsSUFBbkIsQ0FBd0IsT0FBTSxZQUFVcTRCLENBQVYsSUFBYSxlQUFhQSxDQUExQixHQUE0QixLQUFLaUUsVUFBTCxDQUFnQnZELEVBQUVsMkIsSUFBbEIsRUFBd0JpTCxNQUF4QixDQUErQixVQUEvQixFQUEyQ2tELEdBQTNDLEVBQTVCLEdBQTZFLGFBQVdxbkIsQ0FBWCxJQUFjLGVBQWEsT0FBT1UsRUFBRTZGLFFBQXBDLEdBQTZDN0YsRUFBRTZGLFFBQUYsQ0FBV0MsUUFBWCxHQUFvQixLQUFwQixHQUEwQjc0QixFQUFFZ0wsR0FBRixFQUF2RSxJQUFnRm9uQixJQUFFVyxFQUFFdDRCLFlBQUYsQ0FBZSxpQkFBZixJQUFrQ3VGLEVBQUV1SyxJQUFGLEVBQWxDLEdBQTJDdkssRUFBRWdMLEdBQUYsRUFBN0MsRUFBcUQsV0FBU3FuQixDQUFULEdBQVcscUJBQW1CRCxFQUFFMEcsTUFBRixDQUFTLENBQVQsRUFBVyxFQUFYLENBQW5CLEdBQWtDMUcsRUFBRTBHLE1BQUYsQ0FBUyxFQUFULENBQWxDLElBQWdEeEYsSUFBRWxCLEVBQUUyRyxXQUFGLENBQWMsR0FBZCxDQUFGLEVBQXFCekYsS0FBRyxDQUFILEdBQUtsQixFQUFFMEcsTUFBRixDQUFTeEYsSUFBRSxDQUFYLENBQUwsSUFBb0JBLElBQUVsQixFQUFFMkcsV0FBRixDQUFjLElBQWQsQ0FBRixFQUFzQnpGLEtBQUcsQ0FBSCxHQUFLbEIsRUFBRTBHLE1BQUYsQ0FBU3hGLElBQUUsQ0FBWCxDQUFMLEdBQW1CbEIsQ0FBN0QsQ0FBckUsQ0FBWCxHQUFpSixZQUFVLE9BQU9BLENBQWpCLEdBQW1CQSxFQUFFcHVCLE9BQUYsQ0FBVSxLQUFWLEVBQWdCLEVBQWhCLENBQW5CLEdBQXVDb3VCLENBQTdULENBQW5GO0FBQW1aLE9BQXQwSyxFQUF1MEt1RixPQUFNLFVBQVM1RSxDQUFULEVBQVc7QUFBQ0EsWUFBRSxLQUFLOEUsbUJBQUwsQ0FBeUIsS0FBS0QsS0FBTCxDQUFXN0UsQ0FBWCxDQUF6QixDQUFGLENBQTBDLElBQUlYLENBQUo7QUFBQSxZQUFNa0IsQ0FBTjtBQUFBLFlBQVF0ekIsQ0FBUjtBQUFBLFlBQVVxeUIsSUFBRVYsRUFBRW9CLENBQUYsRUFBSzdRLEtBQUwsRUFBWjtBQUFBLFlBQXlCMlIsSUFBRWxDLEVBQUV6eEIsR0FBRixDQUFNbXlCLENBQU4sRUFBUSxVQUFTVixDQUFULEVBQVdvQixDQUFYLEVBQWE7QUFBQyxpQkFBT0EsQ0FBUDtBQUFTLFNBQS9CLEVBQWlDbDBCLE1BQTVEO0FBQUEsWUFBbUVpMUIsSUFBRSxDQUFDLENBQXRFO0FBQUEsWUFBd0V2MEIsSUFBRSxLQUFLMDJCLFlBQUwsQ0FBa0JsRCxDQUFsQixDQUExRSxDQUErRixJQUFHLGNBQVksT0FBT1YsRUFBRTJHLFVBQXhCLEVBQW1DO0FBQUMsY0FBR3o1QixJQUFFOHlCLEVBQUUyRyxVQUFGLENBQWFuM0IsSUFBYixDQUFrQmt4QixDQUFsQixFQUFvQnh6QixDQUFwQixDQUFGLEVBQXlCLFlBQVUsT0FBT0EsQ0FBN0MsRUFBK0MsTUFBTSxJQUFJeUMsU0FBSixDQUFjLDhDQUFkLENBQU4sQ0FBb0UsT0FBT3F3QixFQUFFMkcsVUFBVDtBQUFvQixjQUFJMUYsQ0FBSixJQUFTakIsQ0FBVCxFQUFXO0FBQUNyeUIsY0FBRSxFQUFDc0IsUUFBT2d5QixDQUFSLEVBQVUyRixZQUFXNUcsRUFBRWlCLENBQUYsQ0FBckIsRUFBRixDQUE2QixJQUFHO0FBQUMsZ0JBQUdsQixJQUFFVCxFQUFFcGMsU0FBRixDQUFZMmpCLE9BQVosQ0FBb0I1RixDQUFwQixFQUF1Qnp4QixJQUF2QixDQUE0QixJQUE1QixFQUFpQ3RDLENBQWpDLEVBQW1Dd3pCLENBQW5DLEVBQXFDL3lCLEVBQUVpNUIsVUFBdkMsQ0FBRixFQUFxRCwwQkFBd0I3RyxDQUF4QixJQUEyQixNQUFJeUIsQ0FBdkYsRUFBeUY7QUFBQ0Msa0JBQUUsQ0FBQyxDQUFILENBQUs7QUFBUyxpQkFBR0EsSUFBRSxDQUFDLENBQUgsRUFBSyxjQUFZMUIsQ0FBcEIsRUFBc0IsT0FBTyxNQUFLLEtBQUs0RixNQUFMLEdBQVksS0FBS0EsTUFBTCxDQUFZMWxCLEdBQVosQ0FBZ0IsS0FBS3FqQixTQUFMLENBQWU1QyxDQUFmLENBQWhCLENBQWpCLENBQVAsQ0FBNEQsSUFBRyxDQUFDWCxDQUFKLEVBQU0sT0FBTyxLQUFLK0csWUFBTCxDQUFrQnBHLENBQWxCLEVBQW9CL3lCLENBQXBCLEdBQXVCLENBQUMsQ0FBL0I7QUFBaUMsV0FBck8sQ0FBcU8sT0FBTTJ4QixDQUFOLEVBQVE7QUFBQyxrQkFBTSxLQUFLc0IsUUFBTCxDQUFjRCxLQUFkLElBQXFCMTZCLE9BQU9xRyxPQUE1QixJQUFxQ0EsUUFBUTJyQixHQUFSLENBQVksOENBQTRDeUksRUFBRTdvQixFQUE5QyxHQUFpRCxlQUFqRCxHQUFpRWxLLEVBQUVzQixNQUFuRSxHQUEwRSxXQUF0RixFQUFrR3F3QixDQUFsRyxDQUFyQyxFQUEwSUEsYUFBYTN2QixTQUFiLEtBQXlCMnZCLEVBQUU3YixPQUFGLElBQVcsaURBQStDaWQsRUFBRTdvQixFQUFqRCxHQUFvRCxlQUFwRCxHQUFvRWxLLEVBQUVzQixNQUF0RSxHQUE2RSxXQUFqSCxDQUExSSxFQUF3UXF3QixDQUE5UTtBQUFnUjtBQUFDLGFBQUcsQ0FBQ21DLENBQUosRUFBTSxPQUFPLEtBQUt3RSxZQUFMLENBQWtCakcsQ0FBbEIsS0FBc0IsS0FBSzRGLFdBQUwsQ0FBaUJsOUIsSUFBakIsQ0FBc0JnNEIsQ0FBdEIsQ0FBdEIsRUFBK0MsQ0FBQyxDQUF2RDtBQUF5RCxPQUFwdk0sRUFBcXZNcUcsbUJBQWtCLFVBQVNyRyxDQUFULEVBQVdYLENBQVgsRUFBYTtBQUFDLGVBQU9ULEVBQUVvQixDQUFGLEVBQUt2MUIsSUFBTCxDQUFVLFFBQU00MEIsRUFBRWlILE1BQUYsQ0FBUyxDQUFULEVBQVl2eUIsV0FBWixFQUFOLEdBQWdDc3JCLEVBQUVrSCxTQUFGLENBQVksQ0FBWixFQUFlaC9CLFdBQWYsRUFBMUMsS0FBeUVxM0IsRUFBRW9CLENBQUYsRUFBS3YxQixJQUFMLENBQVUsS0FBVixDQUFoRjtBQUFpRyxPQUF0M00sRUFBdTNNKzdCLGVBQWMsVUFBUzVILENBQVQsRUFBV29CLENBQVgsRUFBYTtBQUFDLFlBQUlYLElBQUUsS0FBS2EsUUFBTCxDQUFjZ0IsUUFBZCxDQUF1QnRDLENBQXZCLENBQU4sQ0FBZ0MsT0FBT1MsTUFBSUEsRUFBRWgxQixXQUFGLEtBQWdCd0osTUFBaEIsR0FBdUJ3ckIsQ0FBdkIsR0FBeUJBLEVBQUVXLENBQUYsQ0FBN0IsQ0FBUDtBQUEwQyxPQUE3OU0sRUFBODlNeUcsYUFBWSxZQUFVO0FBQUMsYUFBSSxJQUFJN0gsSUFBRSxDQUFWLEVBQVlBLElBQUV2d0IsVUFBVXZDLE1BQXhCLEVBQStCOHlCLEdBQS9CO0FBQW1DLGNBQUcsS0FBSyxDQUFMLEtBQVN2d0IsVUFBVXV3QixDQUFWLENBQVosRUFBeUIsT0FBT3Z3QixVQUFVdXdCLENBQVYsQ0FBUDtBQUE1RDtBQUFnRixPQUFya04sRUFBc2tOOEgsZ0JBQWUsVUFBUzFHLENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsb0JBQVUsT0FBT0EsQ0FBakIsS0FBcUJBLElBQUUsRUFBQzl3QixRQUFPOHdCLENBQVIsRUFBdkIsRUFBbUMsSUFBSWtCLElBQUUsS0FBS2tHLFdBQUwsQ0FBaUIsS0FBS0QsYUFBTCxDQUFtQnhHLEVBQUVsMkIsSUFBckIsRUFBMEJ1MUIsRUFBRTl3QixNQUE1QixDQUFqQixFQUFxRCxLQUFLODNCLGlCQUFMLENBQXVCckcsQ0FBdkIsRUFBeUJYLEVBQUU5d0IsTUFBM0IsQ0FBckQsRUFBd0YsQ0FBQyxLQUFLMnhCLFFBQUwsQ0FBY3FDLFdBQWYsSUFBNEJ2QyxFQUFFOUgsS0FBOUIsSUFBcUMsS0FBSyxDQUFsSSxFQUFvSTBHLEVBQUVwYyxTQUFGLENBQVkwZSxRQUFaLENBQXFCN0IsRUFBRTl3QixNQUF2QixDQUFwSSxFQUFtSyw2Q0FBMkN5eEIsRUFBRWwyQixJQUE3QyxHQUFrRCxXQUFyTixDQUFOO0FBQUEsWUFBd09tRCxJQUFFLGVBQTFPLENBQTBQLE9BQU0sY0FBWSxPQUFPc3pCLENBQW5CLEdBQXFCQSxJQUFFQSxFQUFFenhCLElBQUYsQ0FBTyxJQUFQLEVBQVl1d0IsRUFBRTZHLFVBQWQsRUFBeUJsRyxDQUF6QixDQUF2QixHQUFtRC95QixFQUFFeUMsSUFBRixDQUFPNndCLENBQVAsTUFBWUEsSUFBRTNCLEVBQUVwYyxTQUFGLENBQVlvZixNQUFaLENBQW1CckIsRUFBRXR2QixPQUFGLENBQVVoRSxDQUFWLEVBQVksTUFBWixDQUFuQixFQUF1Q295QixFQUFFNkcsVUFBekMsQ0FBZCxDQUFuRCxFQUF1SDNGLENBQTdIO0FBQStILE9BQS8vTixFQUFnZ082RixjQUFhLFVBQVN4SCxDQUFULEVBQVdvQixDQUFYLEVBQWE7QUFBQyxZQUFJWCxJQUFFLEtBQUtxSCxjQUFMLENBQW9COUgsQ0FBcEIsRUFBc0JvQixDQUF0QixDQUFOLENBQStCLEtBQUthLFNBQUwsQ0FBZTc0QixJQUFmLENBQW9CLEVBQUMrYSxTQUFRc2MsQ0FBVCxFQUFXOXRCLFNBQVFxdEIsQ0FBbkIsRUFBcUJyd0IsUUFBT3l4QixFQUFFenhCLE1BQTlCLEVBQXBCLEdBQTJELEtBQUtnMkIsUUFBTCxDQUFjM0YsRUFBRTkwQixJQUFoQixJQUFzQnUxQixDQUFqRixFQUFtRixLQUFLMEQsU0FBTCxDQUFlbkUsRUFBRTkwQixJQUFqQixJQUF1QnUxQixDQUExRztBQUE0RyxPQUF0cU8sRUFBdXFPbUcsWUFBVyxVQUFTNUcsQ0FBVCxFQUFXO0FBQUMsZUFBTyxLQUFLc0IsUUFBTCxDQUFjdFgsT0FBZCxLQUF3QmdXLElBQUVBLEVBQUVuWCxHQUFGLENBQU1tWCxFQUFFcHRCLE1BQUYsQ0FBUyxLQUFLMHVCLFFBQUwsQ0FBY3RYLE9BQXZCLENBQU4sQ0FBMUIsR0FBa0VnVyxDQUF6RTtBQUEyRSxPQUF6d08sRUFBMHdPd0csbUJBQWtCLFlBQVU7QUFBQyxZQUFJeEcsQ0FBSixFQUFNb0IsQ0FBTixFQUFRWCxDQUFSLENBQVUsS0FBSVQsSUFBRSxDQUFOLEVBQVEsS0FBS2lDLFNBQUwsQ0FBZWpDLENBQWYsQ0FBUixFQUEwQkEsR0FBMUI7QUFBOEJTLGNBQUUsS0FBS3dCLFNBQUwsQ0FBZWpDLENBQWYsQ0FBRixFQUFvQixLQUFLc0IsUUFBTCxDQUFjb0QsU0FBZCxJQUF5QixLQUFLcEQsUUFBTCxDQUFjb0QsU0FBZCxDQUF3QngwQixJQUF4QixDQUE2QixJQUE3QixFQUFrQ3V3QixFQUFFOXRCLE9BQXBDLEVBQTRDLEtBQUsydUIsUUFBTCxDQUFjNkIsVUFBMUQsRUFBcUUsS0FBSzdCLFFBQUwsQ0FBYytCLFVBQW5GLENBQTdDLEVBQTRJLEtBQUswRSxTQUFMLENBQWV0SCxFQUFFOXRCLE9BQWpCLEVBQXlCOHRCLEVBQUV0YyxPQUEzQixDQUE1STtBQUE5QixTQUE4TSxJQUFHLEtBQUs4ZCxTQUFMLENBQWUvMEIsTUFBZixLQUF3QixLQUFLODVCLE1BQUwsR0FBWSxLQUFLQSxNQUFMLENBQVluZSxHQUFaLENBQWdCLEtBQUt5YyxVQUFyQixDQUFwQyxHQUFzRSxLQUFLaEUsUUFBTCxDQUFjMEcsT0FBdkYsRUFBK0YsS0FBSWhJLElBQUUsQ0FBTixFQUFRLEtBQUtzRyxXQUFMLENBQWlCdEcsQ0FBakIsQ0FBUixFQUE0QkEsR0FBNUI7QUFBZ0MsZUFBSytILFNBQUwsQ0FBZSxLQUFLekIsV0FBTCxDQUFpQnRHLENBQWpCLENBQWY7QUFBaEMsU0FBb0UsSUFBRyxLQUFLc0IsUUFBTCxDQUFjd0MsV0FBakIsRUFBNkIsS0FBSTlELElBQUUsQ0FBRixFQUFJb0IsSUFBRSxLQUFLNkcsYUFBTCxFQUFWLEVBQStCN0csRUFBRXBCLENBQUYsQ0FBL0IsRUFBb0NBLEdBQXBDO0FBQXdDLGVBQUtzQixRQUFMLENBQWN3QyxXQUFkLENBQTBCNXpCLElBQTFCLENBQStCLElBQS9CLEVBQW9Da3hCLEVBQUVwQixDQUFGLENBQXBDLEVBQXlDLEtBQUtzQixRQUFMLENBQWM2QixVQUF2RCxFQUFrRSxLQUFLN0IsUUFBTCxDQUFjK0IsVUFBaEY7QUFBeEMsU0FBb0ksS0FBS2dELE1BQUwsR0FBWSxLQUFLQSxNQUFMLENBQVkxbEIsR0FBWixDQUFnQixLQUFLcW1CLE1BQXJCLENBQVosRUFBeUMsS0FBS1AsVUFBTCxFQUF6QyxFQUEyRCxLQUFLRyxVQUFMLENBQWdCLEtBQUtJLE1BQXJCLEVBQTZCcHNCLElBQTdCLEVBQTNEO0FBQStGLE9BQWw2UCxFQUFtNlBxdEIsZUFBYyxZQUFVO0FBQUMsZUFBTyxLQUFLbkMsZUFBTCxDQUFxQm5sQixHQUFyQixDQUF5QixLQUFLdW5CLGVBQUwsRUFBekIsQ0FBUDtBQUF3RCxPQUFwL1AsRUFBcS9QQSxpQkFBZ0IsWUFBVTtBQUFDLGVBQU9sSSxFQUFFLEtBQUtpQyxTQUFQLEVBQWtCMXpCLEdBQWxCLENBQXNCLFlBQVU7QUFBQyxpQkFBTyxLQUFLb0UsT0FBWjtBQUFvQixTQUFyRCxDQUFQO0FBQThELE9BQTlrUSxFQUEra1FvMUIsV0FBVSxVQUFTM0csQ0FBVCxFQUFXWCxDQUFYLEVBQWE7QUFBQyxZQUFJa0IsQ0FBSjtBQUFBLFlBQU10ekIsQ0FBTjtBQUFBLFlBQVFxeUIsQ0FBUjtBQUFBLFlBQVV3QixDQUFWO0FBQUEsWUFBWUMsSUFBRSxLQUFLNkIsU0FBTCxDQUFlNUMsQ0FBZixDQUFkO0FBQUEsWUFBZ0N4ekIsSUFBRSxLQUFLdTZCLFFBQUwsQ0FBYy9HLENBQWQsQ0FBbEM7QUFBQSxZQUFtRGxSLElBQUU4UCxFQUFFb0IsQ0FBRixFQUFLcDJCLElBQUwsQ0FBVSxrQkFBVixDQUFyRCxDQUFtRm0zQixFQUFFajFCLE1BQUYsSUFBVWkxQixFQUFFbnlCLFdBQUYsQ0FBYyxLQUFLc3hCLFFBQUwsQ0FBYytCLFVBQTVCLEVBQXdDMW9CLFFBQXhDLENBQWlELEtBQUsybUIsUUFBTCxDQUFjNkIsVUFBL0QsR0FBMkVoQixFQUFFblIsSUFBRixDQUFPeVAsQ0FBUCxDQUFyRixLQUFpRzBCLElBQUVuQyxFQUFFLE1BQUksS0FBS3NCLFFBQUwsQ0FBY2dDLFlBQWxCLEdBQStCLEdBQWpDLEVBQXNDdDRCLElBQXRDLENBQTJDLElBQTNDLEVBQWdENEMsSUFBRSxRQUFsRCxFQUE0RCtNLFFBQTVELENBQXFFLEtBQUsybUIsUUFBTCxDQUFjNkIsVUFBbkYsRUFBK0ZuUyxJQUEvRixDQUFvR3lQLEtBQUcsRUFBdkcsQ0FBRixFQUE2R2tCLElBQUVRLENBQS9HLEVBQWlILEtBQUtiLFFBQUwsQ0FBY3RYLE9BQWQsS0FBd0IyWCxJQUFFUSxFQUFFbm5CLElBQUYsR0FBU0osSUFBVCxHQUFnQjZPLElBQWhCLENBQXFCLE1BQUksS0FBSzZYLFFBQUwsQ0FBY3RYLE9BQWxCLEdBQTBCLElBQS9DLEVBQXFEcFgsTUFBckQsRUFBMUIsQ0FBakgsRUFBME0sS0FBS3d5QixjQUFMLENBQW9CbDRCLE1BQXBCLEdBQTJCLEtBQUtrNEIsY0FBTCxDQUFvQnZQLE1BQXBCLENBQTJCOEwsQ0FBM0IsQ0FBM0IsR0FBeUQsS0FBS0wsUUFBTCxDQUFjOEcsY0FBZCxHQUE2QixLQUFLOUcsUUFBTCxDQUFjOEcsY0FBZCxDQUE2Qmw0QixJQUE3QixDQUFrQyxJQUFsQyxFQUF1Q3l4QixDQUF2QyxFQUF5QzNCLEVBQUVvQixDQUFGLENBQXpDLENBQTdCLEdBQTRFTyxFQUFFMEcsV0FBRixDQUFjakgsQ0FBZCxDQUEvVSxFQUFnV2UsRUFBRS9yQixFQUFGLENBQUssT0FBTCxJQUFjK3JCLEVBQUVuM0IsSUFBRixDQUFPLEtBQVAsRUFBYTRDLENBQWIsQ0FBZCxHQUE4QixNQUFJdTBCLEVBQUU3WixPQUFGLENBQVUsZ0JBQWMsS0FBS2dnQixhQUFMLENBQW1CMTZCLENBQW5CLENBQWQsR0FBb0MsSUFBOUMsRUFBb0RWLE1BQXhELEtBQWlFd3pCLElBQUV5QixFQUFFbjNCLElBQUYsQ0FBTyxJQUFQLENBQUYsRUFBZWtsQixJQUFFQSxFQUFFN0UsS0FBRixDQUFRLElBQUkzRyxNQUFKLENBQVcsUUFBTSxLQUFLNGpCLGFBQUwsQ0FBbUI1SCxDQUFuQixDQUFOLEdBQTRCLEtBQXZDLENBQVIsTUFBeUR4USxLQUFHLE1BQUl3USxDQUFoRSxDQUFGLEdBQXFFeFEsSUFBRXdRLENBQXRGLEVBQXdGVixFQUFFb0IsQ0FBRixFQUFLcDJCLElBQUwsQ0FBVSxrQkFBVixFQUE2QmtsQixDQUE3QixDQUF4RixFQUF3SDdoQixJQUFFLEtBQUswaEIsTUFBTCxDQUFZcVIsRUFBRWwyQixJQUFkLENBQTFILEVBQThJbUQsTUFBSTZ6QixJQUFFLElBQUYsRUFBT2xDLEVBQUUxekIsSUFBRixDQUFPNDFCLEVBQUVuUyxNQUFULEVBQWdCLFVBQVNxUixDQUFULEVBQVdYLENBQVgsRUFBYTtBQUFDQSxnQkFBSXB5QixDQUFKLElBQU8yeEIsRUFBRSxZQUFVa0MsRUFBRW9HLGFBQUYsQ0FBZ0JsSCxDQUFoQixDQUFWLEdBQTZCLElBQS9CLEVBQW9DYyxFQUFFTixXQUF0QyxFQUFtRDUyQixJQUFuRCxDQUF3RCxrQkFBeEQsRUFBMkVtM0IsRUFBRW4zQixJQUFGLENBQU8sSUFBUCxDQUEzRSxDQUFQO0FBQWdHLFNBQTlILENBQVgsQ0FBL00sQ0FBL2QsR0FBNHpCLENBQUN5MUIsQ0FBRCxJQUFJLEtBQUthLFFBQUwsQ0FBYzBHLE9BQWxCLEtBQTRCN0YsRUFBRXZwQixJQUFGLENBQU8sRUFBUCxHQUFXLFlBQVUsT0FBTyxLQUFLMG9CLFFBQUwsQ0FBYzBHLE9BQS9CLEdBQXVDN0YsRUFBRXhuQixRQUFGLENBQVcsS0FBSzJtQixRQUFMLENBQWMwRyxPQUF6QixDQUF2QyxHQUF5RSxLQUFLMUcsUUFBTCxDQUFjMEcsT0FBZCxDQUFzQjdGLENBQXRCLEVBQXdCZixDQUF4QixDQUFoSCxDQUE1ekIsRUFBdzhCLEtBQUs0RixNQUFMLEdBQVksS0FBS0EsTUFBTCxDQUFZbmUsR0FBWixDQUFnQnNaLENBQWhCLENBQXA5QjtBQUF1K0IsT0FBanFTLEVBQWtxUzZCLFdBQVUsVUFBUzVDLENBQVQsRUFBVztBQUFDLFlBQUlYLElBQUUsS0FBSzZILGFBQUwsQ0FBbUIsS0FBS0gsUUFBTCxDQUFjL0csQ0FBZCxDQUFuQixDQUFOO0FBQUEsWUFBMkNPLElBQUUzQixFQUFFb0IsQ0FBRixFQUFLcDJCLElBQUwsQ0FBVSxrQkFBVixDQUE3QztBQUFBLFlBQTJFcUQsSUFBRSxnQkFBY295QixDQUFkLEdBQWdCLGlCQUFoQixHQUFrQ0EsQ0FBbEMsR0FBb0MsTUFBakgsQ0FBd0gsT0FBT2tCLE1BQUl0ekIsSUFBRUEsSUFBRSxLQUFGLEdBQVEsS0FBS2k2QixhQUFMLENBQW1CM0csQ0FBbkIsRUFBc0J0dkIsT0FBdEIsQ0FBOEIsTUFBOUIsRUFBcUMsS0FBckMsQ0FBZCxHQUEyRCxLQUFLeTBCLE1BQUwsR0FBYzN3QixNQUFkLENBQXFCOUgsQ0FBckIsQ0FBbEU7QUFBMEYsT0FBMTRTLEVBQTI0U2k2QixlQUFjLFVBQVN0SSxDQUFULEVBQVc7QUFBQyxlQUFPQSxFQUFFM3RCLE9BQUYsQ0FBVSx3Q0FBVixFQUFtRCxNQUFuRCxDQUFQO0FBQWtFLE9BQXYrUyxFQUF3K1M4MUIsVUFBUyxVQUFTbkksQ0FBVCxFQUFXO0FBQUMsZUFBTyxLQUFLalEsTUFBTCxDQUFZaVEsRUFBRTkwQixJQUFkLE1BQXNCLEtBQUtnNUIsU0FBTCxDQUFlbEUsQ0FBZixJQUFrQkEsRUFBRTkwQixJQUFwQixHQUF5QjgwQixFQUFFem5CLEVBQUYsSUFBTXluQixFQUFFOTBCLElBQXZELENBQVA7QUFBb0UsT0FBamtULEVBQWtrVGc3QixxQkFBb0IsVUFBUzlFLENBQVQsRUFBVztBQUFDLGVBQU8sS0FBSzhDLFNBQUwsQ0FBZTlDLENBQWYsTUFBb0JBLElBQUUsS0FBS3VELFVBQUwsQ0FBZ0J2RCxFQUFFbDJCLElBQWxCLENBQXRCLEdBQStDODBCLEVBQUVvQixDQUFGLEVBQUt6Z0IsR0FBTCxDQUFTLEtBQUsyZ0IsUUFBTCxDQUFjb0MsTUFBdkIsRUFBK0IsQ0FBL0IsQ0FBdEQ7QUFBd0YsT0FBMXJULEVBQTJyVFEsV0FBVSxVQUFTbEUsQ0FBVCxFQUFXO0FBQUMsZUFBTSxtQkFBa0JsdkIsSUFBbEIsQ0FBdUJrdkIsRUFBRTMzQixJQUF6QjtBQUFOO0FBQXFDLE9BQXR2VCxFQUF1dlRzOEIsWUFBVyxVQUFTdkQsQ0FBVCxFQUFXO0FBQUMsZUFBT3BCLEVBQUUsS0FBSzRCLFdBQVAsRUFBb0I5ekIsSUFBcEIsQ0FBeUIsWUFBVSxLQUFLdzZCLGFBQUwsQ0FBbUJsSCxDQUFuQixDQUFWLEdBQWdDLElBQXpELENBQVA7QUFBc0UsT0FBcDFULEVBQXExVG1ILFdBQVUsVUFBU25ILENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsZ0JBQU9BLEVBQUUvM0IsUUFBRixDQUFXQyxXQUFYLEVBQVAsR0FBaUMsS0FBSSxRQUFKO0FBQWEsbUJBQU9xM0IsRUFBRSxpQkFBRixFQUFvQlMsQ0FBcEIsRUFBdUJ2ekIsTUFBOUIsQ0FBcUMsS0FBSSxPQUFKO0FBQVksZ0JBQUcsS0FBS2czQixTQUFMLENBQWV6RCxDQUFmLENBQUgsRUFBcUIsT0FBTyxLQUFLa0UsVUFBTCxDQUFnQmxFLEVBQUV2MUIsSUFBbEIsRUFBd0JpTCxNQUF4QixDQUErQixVQUEvQixFQUEyQ2pKLE1BQWxELENBQXBILENBQTZLLE9BQU9rMEIsRUFBRWwwQixNQUFUO0FBQWdCLE9BQTFpVSxFQUEyaVVzN0IsUUFBTyxVQUFTeEksQ0FBVCxFQUFXb0IsQ0FBWCxFQUFhO0FBQUMsZUFBTSxDQUFDLEtBQUtxSCxXQUFMLENBQWlCLE9BQU96SSxDQUF4QixDQUFELElBQTZCLEtBQUt5SSxXQUFMLENBQWlCLE9BQU96SSxDQUF4QixFQUEyQkEsQ0FBM0IsRUFBNkJvQixDQUE3QixDQUFuQztBQUFtRSxPQUFub1UsRUFBb29VcUgsYUFBWSxFQUFDQyxTQUFRLFVBQVMxSSxDQUFULEVBQVc7QUFBQyxpQkFBT0EsQ0FBUDtBQUFTLFNBQTlCLEVBQStCOTJCLFFBQU8sVUFBU2s0QixDQUFULEVBQVdYLENBQVgsRUFBYTtBQUFDLGlCQUFNLENBQUMsQ0FBQ1QsRUFBRW9CLENBQUYsRUFBSVgsRUFBRW9CLElBQU4sRUFBWTMwQixNQUFwQjtBQUEyQixTQUEvRSxFQUFnRnk3QixVQUFTLFVBQVMzSSxDQUFULEVBQVdvQixDQUFYLEVBQWE7QUFBQyxpQkFBT3BCLEVBQUVvQixDQUFGLENBQVA7QUFBWSxTQUFuSCxFQUFocFUsRUFBcXdVZ0QsVUFBUyxVQUFTaEQsQ0FBVCxFQUFXO0FBQUMsWUFBSVgsSUFBRSxLQUFLNkQsWUFBTCxDQUFrQmxELENBQWxCLENBQU4sQ0FBMkIsT0FBTSxDQUFDcEIsRUFBRXBjLFNBQUYsQ0FBWTJqQixPQUFaLENBQW9CM2lCLFFBQXBCLENBQTZCMVUsSUFBN0IsQ0FBa0MsSUFBbEMsRUFBdUN1d0IsQ0FBdkMsRUFBeUNXLENBQXpDLENBQUQsSUFBOEMscUJBQXBEO0FBQTBFLE9BQS8zVSxFQUFnNFV3SCxjQUFhLFVBQVN4SCxDQUFULEVBQVc7QUFBQyxhQUFLb0UsT0FBTCxDQUFhcEUsRUFBRWwyQixJQUFmLE1BQXVCLEtBQUs0MkIsY0FBTCxJQUFzQjlCLEVBQUVvQixDQUFGLEVBQUt6bUIsUUFBTCxDQUFjLEtBQUsybUIsUUFBTCxDQUFjOEIsWUFBNUIsQ0FBdEIsRUFBZ0UsS0FBS29DLE9BQUwsQ0FBYXBFLEVBQUVsMkIsSUFBZixJQUFxQixDQUFDLENBQTdHO0FBQWdILE9BQXpnVixFQUEwZ1YyOUIsYUFBWSxVQUFTekgsQ0FBVCxFQUFXWCxDQUFYLEVBQWE7QUFBQyxhQUFLcUIsY0FBTCxJQUFzQixLQUFLQSxjQUFMLEdBQW9CLENBQXBCLEtBQXdCLEtBQUtBLGNBQUwsR0FBb0IsQ0FBNUMsQ0FBdEIsRUFBcUUsT0FBTyxLQUFLMEQsT0FBTCxDQUFhcEUsRUFBRWwyQixJQUFmLENBQTVFLEVBQWlHODBCLEVBQUVvQixDQUFGLEVBQUtweEIsV0FBTCxDQUFpQixLQUFLc3hCLFFBQUwsQ0FBYzhCLFlBQS9CLENBQWpHLEVBQThJM0MsS0FBRyxNQUFJLEtBQUtxQixjQUFaLElBQTRCLEtBQUtDLGFBQWpDLElBQWdELEtBQUtGLElBQUwsRUFBaEQsSUFBNkQ3QixFQUFFLEtBQUs0QixXQUFQLEVBQW9Ca0gsTUFBcEIsSUFBNkIsS0FBSy9HLGFBQUwsR0FBbUIsQ0FBQyxDQUE5RyxJQUFpSCxDQUFDdEIsQ0FBRCxJQUFJLE1BQUksS0FBS3FCLGNBQWIsSUFBNkIsS0FBS0MsYUFBbEMsS0FBa0QvQixFQUFFLEtBQUs0QixXQUFQLEVBQW9CMXlCLGNBQXBCLENBQW1DLGNBQW5DLEVBQWtELENBQUMsSUFBRCxDQUFsRCxHQUEwRCxLQUFLNnlCLGFBQUwsR0FBbUIsQ0FBQyxDQUFoSSxDQUEvUDtBQUFrWSxPQUF0NlYsRUFBdTZWZ0gsZUFBYyxVQUFTM0gsQ0FBVCxFQUFXWCxDQUFYLEVBQWE7QUFBQyxlQUFPQSxJQUFFLFlBQVUsT0FBT0EsQ0FBakIsSUFBb0JBLENBQXBCLElBQXVCLFFBQXpCLEVBQWtDVCxFQUFFbjBCLElBQUYsQ0FBT3UxQixDQUFQLEVBQVMsZUFBVCxLQUEyQnBCLEVBQUVuMEIsSUFBRixDQUFPdTFCLENBQVAsRUFBUyxlQUFULEVBQXlCLEVBQUM0SCxLQUFJLElBQUwsRUFBVXhrQixPQUFNLENBQUMsQ0FBakIsRUFBbUJMLFNBQVEsS0FBSzJqQixjQUFMLENBQW9CMUcsQ0FBcEIsRUFBc0IsRUFBQ3p4QixRQUFPOHdCLENBQVIsRUFBdEIsQ0FBM0IsRUFBekIsQ0FBcEU7QUFBNEosT0FBL2xXLEVBQWdtVzVKLFNBQVEsWUFBVTtBQUFDLGFBQUs5VSxTQUFMLElBQWlCaWUsRUFBRSxLQUFLNEIsV0FBUCxFQUFvQm5oQixHQUFwQixDQUF3QixXQUF4QixFQUFxQ3hVLFVBQXJDLENBQWdELFdBQWhELEVBQTZENkIsSUFBN0QsQ0FBa0Usd0JBQWxFLEVBQTRGMlMsR0FBNUYsQ0FBZ0csbUJBQWhHLEVBQXFIelEsV0FBckgsQ0FBaUksdUJBQWpJLENBQWpCO0FBQTJLLE9BQTl4VyxFQUF2a0UsRUFBdTJhaTVCLG1CQUFrQixFQUFDcmtCLFVBQVMsRUFBQ0EsVUFBUyxDQUFDLENBQVgsRUFBVixFQUF3QlcsT0FBTSxFQUFDQSxPQUFNLENBQUMsQ0FBUixFQUE5QixFQUF5Q0MsS0FBSSxFQUFDQSxLQUFJLENBQUMsQ0FBTixFQUE3QyxFQUFzREcsTUFBSyxFQUFDQSxNQUFLLENBQUMsQ0FBUCxFQUEzRCxFQUFxRUUsU0FBUSxFQUFDQSxTQUFRLENBQUMsQ0FBVixFQUE3RSxFQUEwRlQsUUFBTyxFQUFDQSxRQUFPLENBQUMsQ0FBVCxFQUFqRyxFQUE2R3lmLFFBQU8sRUFBQ0EsUUFBTyxDQUFDLENBQVQsRUFBcEgsRUFBZ0lxRSxZQUFXLEVBQUNBLFlBQVcsQ0FBQyxDQUFiLEVBQTNJLEVBQXozYSxFQUFxaGJDLGVBQWMsVUFBUy9ILENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUNXLFFBQUUzMUIsV0FBRixLQUFnQndKLE1BQWhCLEdBQXVCLEtBQUtnMEIsaUJBQUwsQ0FBdUI3SCxDQUF2QixJQUEwQlgsQ0FBakQsR0FBbURULEVBQUVscUIsTUFBRixDQUFTLEtBQUttekIsaUJBQWQsRUFBZ0M3SCxDQUFoQyxDQUFuRDtBQUFzRixLQUF2b2IsRUFBd29ib0IsWUFBVyxVQUFTcEIsQ0FBVCxFQUFXO0FBQUMsVUFBSVgsSUFBRSxFQUFOO0FBQUEsVUFBU2tCLElBQUUzQixFQUFFb0IsQ0FBRixFQUFLcDJCLElBQUwsQ0FBVSxPQUFWLENBQVgsQ0FBOEIsT0FBTzIyQixLQUFHM0IsRUFBRTF6QixJQUFGLENBQU9xMUIsRUFBRXZ6QixLQUFGLENBQVEsR0FBUixDQUFQLEVBQW9CLFlBQVU7QUFBQyxnQkFBUTR4QixFQUFFcGMsU0FBRixDQUFZcWxCLGlCQUFwQixJQUF1Q2pKLEVBQUVscUIsTUFBRixDQUFTMnFCLENBQVQsRUFBV1QsRUFBRXBjLFNBQUYsQ0FBWXFsQixpQkFBWixDQUE4QixJQUE5QixDQUFYLENBQXZDO0FBQXVGLE9BQXRILENBQUgsRUFBMkh4SSxDQUFsSTtBQUFvSSxLQUFqMGIsRUFBazBiMkksd0JBQXVCLFVBQVNwSixDQUFULEVBQVdvQixDQUFYLEVBQWFYLENBQWIsRUFBZWtCLENBQWYsRUFBaUI7QUFBQyxxQkFBZTd3QixJQUFmLENBQW9CMnZCLENBQXBCLE1BQXlCLFNBQU9XLENBQVAsSUFBVSxvQkFBb0J0d0IsSUFBcEIsQ0FBeUJzd0IsQ0FBekIsQ0FBbkMsTUFBa0VPLElBQUUwSCxPQUFPMUgsQ0FBUCxDQUFGLEVBQVl4dkIsTUFBTXd2QixDQUFOLE1BQVdBLElBQUUsS0FBSyxDQUFsQixDQUE5RSxHQUFvR0EsS0FBRyxNQUFJQSxDQUFQLEdBQVMzQixFQUFFUyxDQUFGLElBQUtrQixDQUFkLEdBQWdCUCxNQUFJWCxDQUFKLElBQU8sWUFBVVcsQ0FBakIsS0FBcUJwQixFQUFFUyxDQUFGLElBQUssQ0FBQyxDQUEzQixDQUFwSDtBQUFrSixLQUE3L2IsRUFBOC9iZ0MsZ0JBQWUsVUFBU3JCLENBQVQsRUFBVztBQUFDLFVBQUlYLENBQUo7QUFBQSxVQUFNa0IsQ0FBTjtBQUFBLFVBQVF0ekIsSUFBRSxFQUFWO0FBQUEsVUFBYXF5QixJQUFFVixFQUFFb0IsQ0FBRixDQUFmO0FBQUEsVUFBb0JjLElBQUVkLEVBQUV2NEIsWUFBRixDQUFlLE1BQWYsQ0FBdEIsQ0FBNkMsS0FBSTQzQixDQUFKLElBQVNULEVBQUVwYyxTQUFGLENBQVkyakIsT0FBckI7QUFBNkIsdUJBQWE5RyxDQUFiLElBQWdCa0IsSUFBRVAsRUFBRXY0QixZQUFGLENBQWU0M0IsQ0FBZixDQUFGLEVBQW9CLE9BQUtrQixDQUFMLEtBQVNBLElBQUUsQ0FBQyxDQUFaLENBQXBCLEVBQW1DQSxJQUFFLENBQUMsQ0FBQ0EsQ0FBdkQsSUFBMERBLElBQUVqQixFQUFFMTFCLElBQUYsQ0FBT3kxQixDQUFQLENBQTVELEVBQXNFLEtBQUsySSxzQkFBTCxDQUE0Qi82QixDQUE1QixFQUE4QjZ6QixDQUE5QixFQUFnQ3pCLENBQWhDLEVBQWtDa0IsQ0FBbEMsQ0FBdEU7QUFBN0IsT0FBd0ksT0FBT3R6QixFQUFFeTJCLFNBQUYsSUFBYSx1QkFBdUJoMEIsSUFBdkIsQ0FBNEJ6QyxFQUFFeTJCLFNBQTlCLENBQWIsSUFBdUQsT0FBT3oyQixFQUFFeTJCLFNBQWhFLEVBQTBFejJCLENBQWpGO0FBQW1GLEtBQWp5YyxFQUFreWNxMEIsV0FBVSxVQUFTdEIsQ0FBVCxFQUFXO0FBQUMsVUFBSVgsQ0FBSjtBQUFBLFVBQU1rQixDQUFOO0FBQUEsVUFBUXR6QixJQUFFLEVBQVY7QUFBQSxVQUFhcXlCLElBQUVWLEVBQUVvQixDQUFGLENBQWY7QUFBQSxVQUFvQmMsSUFBRWQsRUFBRXY0QixZQUFGLENBQWUsTUFBZixDQUF0QixDQUE2QyxLQUFJNDNCLENBQUosSUFBU1QsRUFBRXBjLFNBQUYsQ0FBWTJqQixPQUFyQjtBQUE2QjVGLFlBQUVqQixFQUFFNzBCLElBQUYsQ0FBTyxTQUFPNDBCLEVBQUVpSCxNQUFGLENBQVMsQ0FBVCxFQUFZdnlCLFdBQVosRUFBUCxHQUFpQ3NyQixFQUFFa0gsU0FBRixDQUFZLENBQVosRUFBZWgvQixXQUFmLEVBQXhDLENBQUYsRUFBd0UsS0FBS3lnQyxzQkFBTCxDQUE0Qi82QixDQUE1QixFQUE4QjZ6QixDQUE5QixFQUFnQ3pCLENBQWhDLEVBQWtDa0IsQ0FBbEMsQ0FBeEU7QUFBN0IsT0FBMEksT0FBT3R6QixDQUFQO0FBQVMsS0FBeC9jLEVBQXkvYyt6QixhQUFZLFVBQVNoQixDQUFULEVBQVc7QUFBQyxVQUFJWCxJQUFFLEVBQU47QUFBQSxVQUFTa0IsSUFBRTNCLEVBQUVuMEIsSUFBRixDQUFPdTFCLEVBQUVTLElBQVQsRUFBYyxXQUFkLENBQVgsQ0FBc0MsT0FBT0YsRUFBRUwsUUFBRixDQUFXL1EsS0FBWCxLQUFtQmtRLElBQUVULEVBQUVwYyxTQUFGLENBQVl5ZSxhQUFaLENBQTBCVixFQUFFTCxRQUFGLENBQVcvUSxLQUFYLENBQWlCNlEsRUFBRWwyQixJQUFuQixDQUExQixLQUFxRCxFQUExRSxHQUE4RXUxQixDQUFyRjtBQUF1RixLQUE5b2QsRUFBK29kOEIsZ0JBQWUsVUFBU25CLENBQVQsRUFBV1gsQ0FBWCxFQUFhO0FBQUMsYUFBT1QsRUFBRTF6QixJQUFGLENBQU84MEIsQ0FBUCxFQUFTLFVBQVNPLENBQVQsRUFBV3R6QixDQUFYLEVBQWE7QUFBQyxZQUFHQSxNQUFJLENBQUMsQ0FBUixFQUFVLE9BQU8sS0FBSyxPQUFPK3lCLEVBQUVPLENBQUYsQ0FBbkIsQ0FBd0IsSUFBR3R6QixFQUFFOEssS0FBRixJQUFTOUssRUFBRWk3QixPQUFkLEVBQXNCO0FBQUMsY0FBSTVJLElBQUUsQ0FBQyxDQUFQLENBQVMsUUFBTyxPQUFPcnlCLEVBQUVpN0IsT0FBaEIsR0FBeUIsS0FBSSxRQUFKO0FBQWE1SSxrQkFBRSxDQUFDLENBQUNWLEVBQUUzeEIsRUFBRWk3QixPQUFKLEVBQVk3SSxFQUFFb0IsSUFBZCxFQUFvQjMwQixNQUF4QixDQUErQixNQUFNLEtBQUksVUFBSjtBQUFld3pCLGtCQUFFcnlCLEVBQUVpN0IsT0FBRixDQUFVcDVCLElBQVYsQ0FBZXV3QixDQUFmLEVBQWlCQSxDQUFqQixDQUFGLENBQTFGLENBQWdIQyxJQUFFVSxFQUFFTyxDQUFGLElBQUssS0FBSyxDQUFMLEtBQVN0ekIsRUFBRThLLEtBQVgsSUFBa0I5SyxFQUFFOEssS0FBM0IsSUFBa0M2bUIsRUFBRW4wQixJQUFGLENBQU80MEIsRUFBRW9CLElBQVQsRUFBYyxXQUFkLEVBQTJCNkUsYUFBM0IsQ0FBeUMxRyxFQUFFUyxDQUFGLENBQXpDLEdBQStDLE9BQU9XLEVBQUVPLENBQUYsQ0FBeEY7QUFBOEY7QUFBQyxPQUF4UyxHQUEwUzNCLEVBQUUxekIsSUFBRixDQUFPODBCLENBQVAsRUFBUyxVQUFTTyxDQUFULEVBQVd0ekIsQ0FBWCxFQUFhO0FBQUMreUIsVUFBRU8sQ0FBRixJQUFLM0IsRUFBRXVKLFVBQUYsQ0FBYWw3QixDQUFiLEtBQWlCLGlCQUFlc3pCLENBQWhDLEdBQWtDdHpCLEVBQUVveUIsQ0FBRixDQUFsQyxHQUF1Q3B5QixDQUE1QztBQUE4QyxPQUFyRSxDQUExUyxFQUFpWDJ4QixFQUFFMXpCLElBQUYsQ0FBTyxDQUFDLFdBQUQsRUFBYSxXQUFiLENBQVAsRUFBaUMsWUFBVTtBQUFDODBCLFVBQUUsSUFBRixNQUFVQSxFQUFFLElBQUYsSUFBUWlJLE9BQU9qSSxFQUFFLElBQUYsQ0FBUCxDQUFsQjtBQUFtQyxPQUEvRSxDQUFqWCxFQUFrY3BCLEVBQUUxekIsSUFBRixDQUFPLENBQUMsYUFBRCxFQUFlLE9BQWYsQ0FBUCxFQUErQixZQUFVO0FBQUMsWUFBSW0wQixDQUFKLENBQU1XLEVBQUUsSUFBRixNQUFVcEIsRUFBRXptQixPQUFGLENBQVU2bkIsRUFBRSxJQUFGLENBQVYsSUFBbUJBLEVBQUUsSUFBRixJQUFRLENBQUNpSSxPQUFPakksRUFBRSxJQUFGLEVBQVEsQ0FBUixDQUFQLENBQUQsRUFBb0JpSSxPQUFPakksRUFBRSxJQUFGLEVBQVEsQ0FBUixDQUFQLENBQXBCLENBQTNCLEdBQW1FLFlBQVUsT0FBT0EsRUFBRSxJQUFGLENBQWpCLEtBQTJCWCxJQUFFVyxFQUFFLElBQUYsRUFBUS91QixPQUFSLENBQWdCLFNBQWhCLEVBQTBCLEVBQTFCLEVBQThCakUsS0FBOUIsQ0FBb0MsUUFBcEMsQ0FBRixFQUFnRGd6QixFQUFFLElBQUYsSUFBUSxDQUFDaUksT0FBTzVJLEVBQUUsQ0FBRixDQUFQLENBQUQsRUFBYzRJLE9BQU81SSxFQUFFLENBQUYsQ0FBUCxDQUFkLENBQW5GLENBQTdFO0FBQThMLE9BQTlPLENBQWxjLEVBQWtyQlQsRUFBRXBjLFNBQUYsQ0FBWXVoQixnQkFBWixLQUErQixRQUFNL0QsRUFBRS9ZLEdBQVIsSUFBYSxRQUFNK1ksRUFBRWh3QixHQUFyQixLQUEyQmd3QixFQUFFNkQsS0FBRixHQUFRLENBQUM3RCxFQUFFL1ksR0FBSCxFQUFPK1ksRUFBRWh3QixHQUFULENBQVIsRUFBc0IsT0FBT2d3QixFQUFFL1ksR0FBL0IsRUFBbUMsT0FBTytZLEVBQUVod0IsR0FBdkUsR0FBNEUsUUFBTWd3QixFQUFFMkQsU0FBUixJQUFtQixRQUFNM0QsRUFBRTBELFNBQTNCLEtBQXVDMUQsRUFBRTRELFdBQUYsR0FBYyxDQUFDNUQsRUFBRTJELFNBQUgsRUFBYTNELEVBQUUwRCxTQUFmLENBQWQsRUFBd0MsT0FBTzFELEVBQUUyRCxTQUFqRCxFQUEyRCxPQUFPM0QsRUFBRTBELFNBQTNHLENBQTNHLENBQWxyQixFQUFvNUIxRCxDQUEzNUI7QUFBNjVCLEtBQXprZixFQUEwa2ZpQixlQUFjLFVBQVNqQixDQUFULEVBQVc7QUFBQyxVQUFHLFlBQVUsT0FBT0EsQ0FBcEIsRUFBc0I7QUFBQyxZQUFJWCxJQUFFLEVBQU4sQ0FBU1QsRUFBRTF6QixJQUFGLENBQU84MEIsRUFBRWh6QixLQUFGLENBQVEsSUFBUixDQUFQLEVBQXFCLFlBQVU7QUFBQ3F5QixZQUFFLElBQUYsSUFBUSxDQUFDLENBQVQ7QUFBVyxTQUEzQyxHQUE2Q1csSUFBRVgsQ0FBL0M7QUFBaUQsY0FBT1csQ0FBUDtBQUFTLEtBQTlyZixFQUErcmZvSSxXQUFVLFVBQVNwSSxDQUFULEVBQVdYLENBQVgsRUFBYWtCLENBQWIsRUFBZTtBQUFDM0IsUUFBRXBjLFNBQUYsQ0FBWTJqQixPQUFaLENBQW9CbkcsQ0FBcEIsSUFBdUJYLENBQXZCLEVBQXlCVCxFQUFFcGMsU0FBRixDQUFZMGUsUUFBWixDQUFxQmxCLENBQXJCLElBQXdCLEtBQUssQ0FBTCxLQUFTTyxDQUFULEdBQVdBLENBQVgsR0FBYTNCLEVBQUVwYyxTQUFGLENBQVkwZSxRQUFaLENBQXFCbEIsQ0FBckIsQ0FBOUQsRUFBc0ZYLEVBQUV2ekIsTUFBRixHQUFTLENBQVQsSUFBWTh5QixFQUFFcGMsU0FBRixDQUFZdWxCLGFBQVosQ0FBMEIvSCxDQUExQixFQUE0QnBCLEVBQUVwYyxTQUFGLENBQVl5ZSxhQUFaLENBQTBCakIsQ0FBMUIsQ0FBNUIsQ0FBbEc7QUFBNEosS0FBcjNmLEVBQXMzZm1HLFNBQVEsRUFBQzNpQixVQUFTLFVBQVN3YyxDQUFULEVBQVdYLENBQVgsRUFBYWtCLENBQWIsRUFBZTtBQUFDLFlBQUcsQ0FBQyxLQUFLNkcsTUFBTCxDQUFZN0csQ0FBWixFQUFjbEIsQ0FBZCxDQUFKLEVBQXFCLE9BQU0scUJBQU4sQ0FBNEIsSUFBRyxhQUFXQSxFQUFFLzNCLFFBQUYsQ0FBV0MsV0FBWCxFQUFkLEVBQXVDO0FBQUMsY0FBSTBGLElBQUUyeEIsRUFBRVMsQ0FBRixFQUFLcG5CLEdBQUwsRUFBTixDQUFpQixPQUFPaEwsS0FBR0EsRUFBRW5CLE1BQUYsR0FBUyxDQUFuQjtBQUFxQixnQkFBTyxLQUFLZzNCLFNBQUwsQ0FBZXpELENBQWYsSUFBa0IsS0FBSzhILFNBQUwsQ0FBZW5ILENBQWYsRUFBaUJYLENBQWpCLElBQW9CLENBQXRDLEdBQXdDVyxFQUFFbDBCLE1BQUYsR0FBUyxDQUF4RDtBQUEwRCxPQUFuTixFQUFvTnFZLE9BQU0sVUFBU3lhLENBQVQsRUFBV29CLENBQVgsRUFBYTtBQUFDLGVBQU8sS0FBS2dELFFBQUwsQ0FBY2hELENBQWQsS0FBa0Isd0lBQXdJdHdCLElBQXhJLENBQTZJa3ZCLENBQTdJLENBQXpCO0FBQXlLLE9BQWpaLEVBQWtaeGEsS0FBSSxVQUFTd2EsQ0FBVCxFQUFXb0IsQ0FBWCxFQUFhO0FBQUMsZUFBTyxLQUFLZ0QsUUFBTCxDQUFjaEQsQ0FBZCxLQUFrQiwyY0FBMmN0d0IsSUFBM2MsQ0FBZ2RrdkIsQ0FBaGQsQ0FBekI7QUFBNGUsT0FBaDVCLEVBQWk1QnJhLE1BQUssVUFBU3FhLENBQVQsRUFBV29CLENBQVgsRUFBYTtBQUFDLGVBQU8sS0FBS2dELFFBQUwsQ0FBY2hELENBQWQsS0FBa0IsQ0FBQyxjQUFjdHdCLElBQWQsQ0FBbUIsSUFBSVAsSUFBSixDQUFTeXZCLENBQVQsRUFBWXh5QixRQUFaLEVBQW5CLENBQTFCO0FBQXFFLE9BQXorQixFQUEwK0JxWSxTQUFRLFVBQVNtYSxDQUFULEVBQVdvQixDQUFYLEVBQWE7QUFBQyxlQUFPLEtBQUtnRCxRQUFMLENBQWNoRCxDQUFkLEtBQWtCLCtEQUErRHR3QixJQUEvRCxDQUFvRWt2QixDQUFwRSxDQUF6QjtBQUFnRyxPQUFobUMsRUFBaW1DNWEsUUFBTyxVQUFTNGEsQ0FBVCxFQUFXb0IsQ0FBWCxFQUFhO0FBQUMsZUFBTyxLQUFLZ0QsUUFBTCxDQUFjaEQsQ0FBZCxLQUFrQiw4Q0FBOEN0d0IsSUFBOUMsQ0FBbURrdkIsQ0FBbkQsQ0FBekI7QUFBK0UsT0FBcnNDLEVBQXNzQzZFLFFBQU8sVUFBUzdFLENBQVQsRUFBV29CLENBQVgsRUFBYTtBQUFDLGVBQU8sS0FBS2dELFFBQUwsQ0FBY2hELENBQWQsS0FBa0IsUUFBUXR3QixJQUFSLENBQWFrdkIsQ0FBYixDQUF6QjtBQUF5QyxPQUFwd0MsRUFBcXdDK0UsV0FBVSxVQUFTM0QsQ0FBVCxFQUFXWCxDQUFYLEVBQWFrQixDQUFiLEVBQWU7QUFBQyxZQUFJdHpCLElBQUUyeEIsRUFBRXptQixPQUFGLENBQVU2bkIsQ0FBVixJQUFhQSxFQUFFbDBCLE1BQWYsR0FBc0IsS0FBS3E3QixTQUFMLENBQWVuSCxDQUFmLEVBQWlCWCxDQUFqQixDQUE1QixDQUFnRCxPQUFPLEtBQUsyRCxRQUFMLENBQWMzRCxDQUFkLEtBQWtCcHlCLEtBQUdzekIsQ0FBNUI7QUFBOEIsT0FBNzJDLEVBQTgyQ21ELFdBQVUsVUFBUzFELENBQVQsRUFBV1gsQ0FBWCxFQUFha0IsQ0FBYixFQUFlO0FBQUMsWUFBSXR6QixJQUFFMnhCLEVBQUV6bUIsT0FBRixDQUFVNm5CLENBQVYsSUFBYUEsRUFBRWwwQixNQUFmLEdBQXNCLEtBQUtxN0IsU0FBTCxDQUFlbkgsQ0FBZixFQUFpQlgsQ0FBakIsQ0FBNUIsQ0FBZ0QsT0FBTyxLQUFLMkQsUUFBTCxDQUFjM0QsQ0FBZCxLQUFrQnB5QixLQUFHc3pCLENBQTVCO0FBQThCLE9BQXQ5QyxFQUF1OUNxRCxhQUFZLFVBQVM1RCxDQUFULEVBQVdYLENBQVgsRUFBYWtCLENBQWIsRUFBZTtBQUFDLFlBQUl0ekIsSUFBRTJ4QixFQUFFem1CLE9BQUYsQ0FBVTZuQixDQUFWLElBQWFBLEVBQUVsMEIsTUFBZixHQUFzQixLQUFLcTdCLFNBQUwsQ0FBZW5ILENBQWYsRUFBaUJYLENBQWpCLENBQTVCLENBQWdELE9BQU8sS0FBSzJELFFBQUwsQ0FBYzNELENBQWQsS0FBa0JweUIsS0FBR3N6QixFQUFFLENBQUYsQ0FBSCxJQUFTdHpCLEtBQUdzekIsRUFBRSxDQUFGLENBQXJDO0FBQTBDLE9BQTdrRCxFQUE4a0R0WixLQUFJLFVBQVMyWCxDQUFULEVBQVdvQixDQUFYLEVBQWFYLENBQWIsRUFBZTtBQUFDLGVBQU8sS0FBSzJELFFBQUwsQ0FBY2hELENBQWQsS0FBa0JwQixLQUFHUyxDQUE1QjtBQUE4QixPQUFob0QsRUFBaW9EcnZCLEtBQUksVUFBUzR1QixDQUFULEVBQVdvQixDQUFYLEVBQWFYLENBQWIsRUFBZTtBQUFDLGVBQU8sS0FBSzJELFFBQUwsQ0FBY2hELENBQWQsS0FBa0JwQixLQUFHUyxDQUE1QjtBQUE4QixPQUFuckQsRUFBb3JEd0UsT0FBTSxVQUFTakYsQ0FBVCxFQUFXb0IsQ0FBWCxFQUFhWCxDQUFiLEVBQWU7QUFBQyxlQUFPLEtBQUsyRCxRQUFMLENBQWNoRCxDQUFkLEtBQWtCcEIsS0FBR1MsRUFBRSxDQUFGLENBQUgsSUFBU1QsS0FBR1MsRUFBRSxDQUFGLENBQXJDO0FBQTBDLE9BQXB2RCxFQUFxdkR5RSxNQUFLLFVBQVM5RCxDQUFULEVBQVdYLENBQVgsRUFBYWtCLENBQWIsRUFBZTtBQUFDLFlBQUl0ekIsQ0FBSjtBQUFBLFlBQU1xeUIsSUFBRVYsRUFBRVMsQ0FBRixFQUFLejFCLElBQUwsQ0FBVSxNQUFWLENBQVI7QUFBQSxZQUEwQmszQixJQUFFLGtDQUFnQ3hCLENBQWhDLEdBQWtDLG9CQUE5RDtBQUFBLFlBQW1GeUIsSUFBRSxDQUFDLE1BQUQsRUFBUSxRQUFSLEVBQWlCLE9BQWpCLENBQXJGO0FBQUEsWUFBK0d2MEIsSUFBRSxJQUFJOFcsTUFBSixDQUFXLFFBQU1nYyxDQUFOLEdBQVEsS0FBbkIsQ0FBakg7QUFBQSxZQUEySXhRLElBQUV3USxLQUFHLENBQUM5eUIsRUFBRWtELElBQUYsQ0FBT3F4QixFQUFFM2hCLElBQUYsRUFBUCxDQUFqSjtBQUFBLFlBQWtLaEssSUFBRSxVQUFTd3BCLENBQVQsRUFBVztBQUFDLGNBQUlvQixJQUFFLENBQUMsS0FBR3BCLENBQUosRUFBTzNVLEtBQVAsQ0FBYSxlQUFiLENBQU4sQ0FBb0MsT0FBTytWLEtBQUdBLEVBQUUsQ0FBRixDQUFILEdBQVFBLEVBQUUsQ0FBRixFQUFLbDBCLE1BQWIsR0FBb0IsQ0FBM0I7QUFBNkIsU0FBalA7QUFBQSxZQUFrUHU4QixJQUFFLFVBQVN6SixDQUFULEVBQVc7QUFBQyxpQkFBTzV5QixLQUFLQyxLQUFMLENBQVcyeUIsSUFBRTV5QixLQUFLRSxHQUFMLENBQVMsRUFBVCxFQUFZZSxDQUFaLENBQWIsQ0FBUDtBQUFvQyxTQUFwUztBQUFBLFlBQXFTcTdCLElBQUUsQ0FBQyxDQUF4UyxDQUEwUyxJQUFHeFosQ0FBSCxFQUFLLE1BQU0sSUFBSXhjLEtBQUosQ0FBVXd1QixDQUFWLENBQU4sQ0FBbUIsT0FBTzd6QixJQUFFbUksRUFBRW1yQixDQUFGLENBQUYsRUFBTyxDQUFDbnJCLEVBQUU0cUIsQ0FBRixJQUFLL3lCLENBQUwsSUFBUW83QixFQUFFckksQ0FBRixJQUFLcUksRUFBRTlILENBQUYsQ0FBTCxLQUFZLENBQXJCLE1BQTBCK0gsSUFBRSxDQUFDLENBQTdCLENBQVAsRUFBdUMsS0FBS3RGLFFBQUwsQ0FBYzNELENBQWQsS0FBa0JpSixDQUFoRTtBQUFrRSxPQUE5b0UsRUFBK29FN2xCLFNBQVEsVUFBU3VkLENBQVQsRUFBV1gsQ0FBWCxFQUFha0IsQ0FBYixFQUFlO0FBQUMsWUFBSXR6QixJQUFFMnhCLEVBQUUyQixDQUFGLENBQU4sQ0FBVyxPQUFPLEtBQUtMLFFBQUwsQ0FBYzJDLFVBQWQsSUFBMEI1MUIsRUFBRXNTLEdBQUYsQ0FBTSx3QkFBTixFQUFnQ3pULE1BQTFELElBQWtFbUIsRUFBRXNNLFFBQUYsQ0FBVyx1QkFBWCxFQUFvQzVDLEVBQXBDLENBQXVDLHVCQUF2QyxFQUErRCxZQUFVO0FBQUNpb0IsWUFBRVMsQ0FBRixFQUFLamMsS0FBTDtBQUFhLFNBQXZGLENBQWxFLEVBQTJKNGMsTUFBSS95QixFQUFFZ0wsR0FBRixFQUF0SztBQUE4SyxPQUFoMkUsRUFBaTJFc3BCLFFBQU8sVUFBU3ZCLENBQVQsRUFBV1gsQ0FBWCxFQUFha0IsQ0FBYixFQUFldHpCLENBQWYsRUFBaUI7QUFBQyxZQUFHLEtBQUsrMUIsUUFBTCxDQUFjM0QsQ0FBZCxDQUFILEVBQW9CLE9BQU0scUJBQU4sQ0FBNEJweUIsSUFBRSxZQUFVLE9BQU9BLENBQWpCLElBQW9CQSxDQUFwQixJQUF1QixRQUF6QixDQUFrQyxJQUFJcXlCLENBQUo7QUFBQSxZQUFNd0IsQ0FBTjtBQUFBLFlBQVFDLENBQVI7QUFBQSxZQUFVdjBCLElBQUUsS0FBS203QixhQUFMLENBQW1CdEksQ0FBbkIsRUFBcUJweUIsQ0FBckIsQ0FBWixDQUFvQyxPQUFPLEtBQUtpekIsUUFBTCxDQUFjZ0IsUUFBZCxDQUF1QjdCLEVBQUV2MUIsSUFBekIsTUFBaUMsS0FBS28yQixRQUFMLENBQWNnQixRQUFkLENBQXVCN0IsRUFBRXYxQixJQUF6QixJQUErQixFQUFoRSxHQUFvRTBDLEVBQUUrN0IsZUFBRixHQUFrQi83QixFQUFFKzdCLGVBQUYsSUFBbUIsS0FBS3JJLFFBQUwsQ0FBY2dCLFFBQWQsQ0FBdUI3QixFQUFFdjFCLElBQXpCLEVBQStCbUQsQ0FBL0IsQ0FBekcsRUFBMkksS0FBS2l6QixRQUFMLENBQWNnQixRQUFkLENBQXVCN0IsRUFBRXYxQixJQUF6QixFQUErQm1ELENBQS9CLElBQWtDVCxFQUFFdVcsT0FBL0ssRUFBdUx3ZCxJQUFFLFlBQVUsT0FBT0EsQ0FBakIsSUFBb0IsRUFBQ25jLEtBQUltYyxDQUFMLEVBQXBCLElBQTZCQSxDQUF0TixFQUF3TlEsSUFBRW5DLEVBQUU3bUIsS0FBRixDQUFRNm1CLEVBQUVscUIsTUFBRixDQUFTLEVBQUNqSyxNQUFLdTFCLENBQU4sRUFBVCxFQUFrQk8sRUFBRTkxQixJQUFwQixDQUFSLENBQTFOLEVBQTZQK0IsRUFBRW83QixHQUFGLEtBQVE3RyxDQUFSLEdBQVV2MEIsRUFBRTRXLEtBQVosSUFBbUI1VyxFQUFFbzdCLEdBQUYsR0FBTTdHLENBQU4sRUFBUXpCLElBQUUsSUFBVixFQUFlLEtBQUtrSSxZQUFMLENBQWtCbkksQ0FBbEIsQ0FBZixFQUFvQ3lCLElBQUUsRUFBdEMsRUFBeUNBLEVBQUV6QixFQUFFdjFCLElBQUosSUFBVWsyQixDQUFuRCxFQUFxRHBCLEVBQUU0SixJQUFGLENBQU81SixFQUFFbHFCLE1BQUYsQ0FBUyxDQUFDLENBQVYsRUFBWSxFQUFDK3pCLE1BQUssT0FBTixFQUFjQyxNQUFLLGFBQVdySixFQUFFdjFCLElBQWhDLEVBQXFDNitCLFVBQVMsTUFBOUMsRUFBcURsK0IsTUFBS3EyQixDQUExRCxFQUE0RDN5QixTQUFRbXhCLEVBQUVrQixXQUF0RSxFQUFrRm9HLFNBQVEsVUFBU2hJLENBQVQsRUFBVztBQUFDLGdCQUFJMkIsQ0FBSjtBQUFBLGdCQUFNTyxDQUFOO0FBQUEsZ0JBQVFDLENBQVI7QUFBQSxnQkFBVWpTLElBQUU4UCxNQUFJLENBQUMsQ0FBTCxJQUFRLFdBQVNBLENBQTdCLENBQStCVSxFQUFFWSxRQUFGLENBQVdnQixRQUFYLENBQW9CN0IsRUFBRXYxQixJQUF0QixFQUE0Qm1ELENBQTVCLElBQStCVCxFQUFFKzdCLGVBQWpDLEVBQWlEelosS0FBR2lTLElBQUV6QixFQUFFcUIsYUFBSixFQUFrQnJCLEVBQUVxRyxjQUFGLEVBQWxCLEVBQXFDckcsRUFBRTJGLE1BQUYsR0FBUzNGLEVBQUVzRCxTQUFGLENBQVl2RCxDQUFaLENBQTlDLEVBQTZEQyxFQUFFcUIsYUFBRixHQUFnQkksQ0FBN0UsRUFBK0V6QixFQUFFNEYsV0FBRixDQUFjbDlCLElBQWQsQ0FBbUJxM0IsQ0FBbkIsQ0FBL0UsRUFBcUdDLEVBQUU4RCxPQUFGLENBQVUvRCxFQUFFdjFCLElBQVosSUFBa0IsQ0FBQyxDQUF4SCxFQUEwSHcxQixFQUFFa0YsVUFBRixFQUE3SCxLQUE4SWpFLElBQUUsRUFBRixFQUFLTyxJQUFFbEMsS0FBR1UsRUFBRW9ILGNBQUYsQ0FBaUJySCxDQUFqQixFQUFtQixFQUFDOXdCLFFBQU90QixDQUFSLEVBQVVpNUIsWUFBV2xHLENBQXJCLEVBQW5CLENBQVYsRUFBc0RPLEVBQUVsQixFQUFFdjFCLElBQUosSUFBVTBDLEVBQUV1VyxPQUFGLEdBQVUrZCxDQUExRSxFQUE0RXhCLEVBQUU4RCxPQUFGLENBQVUvRCxFQUFFdjFCLElBQVosSUFBa0IsQ0FBQyxDQUEvRixFQUFpR3cxQixFQUFFa0YsVUFBRixDQUFhakUsQ0FBYixDQUEvTyxDQUFqRCxFQUFpVC96QixFQUFFNFcsS0FBRixHQUFRMEwsQ0FBelQsRUFBMlR3USxFQUFFbUksV0FBRixDQUFjcEksQ0FBZCxFQUFnQnZRLENBQWhCLENBQTNUO0FBQThVLFdBQW5kLEVBQVosRUFBaWV5UixDQUFqZSxDQUFQLENBQXJELEVBQWlpQixTQUFwakIsQ0FBcFE7QUFBbTBCLE9BQW56RyxFQUE5M2YsRUFBckIsQ0FBenFGLENBQW0zckIsSUFBSVAsQ0FBSjtBQUFBLE1BQU1YLElBQUUsRUFBUixDQUFXVCxFQUFFZ0ssYUFBRixHQUFnQmhLLEVBQUVnSyxhQUFGLENBQWdCLFVBQVNoSyxDQUFULEVBQVdvQixDQUFYLEVBQWFPLENBQWIsRUFBZTtBQUFDLFFBQUl0ekIsSUFBRTJ4QixFQUFFOEosSUFBUixDQUFhLFlBQVU5SixFQUFFNkosSUFBWixLQUFtQnBKLEVBQUVweUIsQ0FBRixLQUFNb3lCLEVBQUVweUIsQ0FBRixFQUFLNDdCLEtBQUwsRUFBTixFQUFtQnhKLEVBQUVweUIsQ0FBRixJQUFLc3pCLENBQTNDO0FBQThDLEdBQTNGLENBQWhCLElBQThHUCxJQUFFcEIsRUFBRTRKLElBQUosRUFBUzVKLEVBQUU0SixJQUFGLEdBQU8sVUFBU2pJLENBQVQsRUFBVztBQUFDLFFBQUl0ekIsSUFBRSxDQUFDLFVBQVNzekIsQ0FBVCxHQUFXQSxDQUFYLEdBQWEzQixFQUFFa0ssWUFBaEIsRUFBOEJMLElBQXBDO0FBQUEsUUFBeUNuSixJQUFFLENBQUMsVUFBU2lCLENBQVQsR0FBV0EsQ0FBWCxHQUFhM0IsRUFBRWtLLFlBQWhCLEVBQThCSixJQUF6RSxDQUE4RSxPQUFNLFlBQVV6N0IsQ0FBVixJQUFhb3lCLEVBQUVDLENBQUYsS0FBTUQsRUFBRUMsQ0FBRixFQUFLdUosS0FBTCxFQUFOLEVBQW1CeEosRUFBRUMsQ0FBRixJQUFLVSxFQUFFMXhCLEtBQUYsQ0FBUSxJQUFSLEVBQWFELFNBQWIsQ0FBeEIsRUFBZ0RneEIsRUFBRUMsQ0FBRixDQUE3RCxJQUFtRVUsRUFBRTF4QixLQUFGLENBQVEsSUFBUixFQUFhRCxTQUFiLENBQXpFO0FBQWlHLEdBQXpUO0FBQTJULENBQW4yc0IsQ0FBRDtDQ0hBOztBQUVBOztBQUNBLENBQUMsWUFBVztBQUNWLE1BQUksQ0FBQ2MsS0FBS0MsR0FBVixFQUNFRCxLQUFLQyxHQUFMLEdBQVcsWUFBVztBQUFFLFdBQU8sSUFBSUQsSUFBSixHQUFXRSxPQUFYLEVBQVA7QUFBOEIsR0FBdEQ7O0FBRUYsTUFBSUMsVUFBVSxDQUFDLFFBQUQsRUFBVyxLQUFYLENBQWQ7QUFDQSxPQUFLLElBQUk5QyxJQUFJLENBQWIsRUFBZ0JBLElBQUk4QyxRQUFReEQsTUFBWixJQUFzQixDQUFDdkcsT0FBT2dLLHFCQUE5QyxFQUFxRSxFQUFFL0MsQ0FBdkUsRUFBMEU7QUFDdEUsUUFBSWdELEtBQUtGLFFBQVE5QyxDQUFSLENBQVQ7QUFDQWpILFdBQU9nSyxxQkFBUCxHQUErQmhLLE9BQU9pSyxLQUFHLHVCQUFWLENBQS9CO0FBQ0FqSyxXQUFPa0ssb0JBQVAsR0FBK0JsSyxPQUFPaUssS0FBRyxzQkFBVixLQUNEakssT0FBT2lLLEtBQUcsNkJBQVYsQ0FEOUI7QUFFSDtBQUNELE1BQUksdUJBQXVCRSxJQUF2QixDQUE0Qm5LLE9BQU9vSyxTQUFQLENBQWlCQyxTQUE3QyxLQUNDLENBQUNySyxPQUFPZ0sscUJBRFQsSUFDa0MsQ0FBQ2hLLE9BQU9rSyxvQkFEOUMsRUFDb0U7QUFDbEUsUUFBSUksV0FBVyxDQUFmO0FBQ0F0SyxXQUFPZ0sscUJBQVAsR0FBK0IsVUFBU08sUUFBVCxFQUFtQjtBQUM5QyxVQUFJVixNQUFNRCxLQUFLQyxHQUFMLEVBQVY7QUFDQSxVQUFJVyxXQUFXL0QsS0FBS2dFLEdBQUwsQ0FBU0gsV0FBVyxFQUFwQixFQUF3QlQsR0FBeEIsQ0FBZjtBQUNBLGFBQU8xSSxXQUFXLFlBQVc7QUFBRW9KLGlCQUFTRCxXQUFXRSxRQUFwQjtBQUFnQyxPQUF4RCxFQUNXQSxXQUFXWCxHQUR0QixDQUFQO0FBRUgsS0FMRDtBQU1BN0osV0FBT2tLLG9CQUFQLEdBQThCNUksWUFBOUI7QUFDRDtBQUNGLENBdEJEOztBQXdCQSxJQUFJdVIsY0FBZ0IsQ0FBQyxXQUFELEVBQWMsV0FBZCxDQUFwQjtBQUNBLElBQUlDLGdCQUFnQixDQUFDLGtCQUFELEVBQXFCLGtCQUFyQixDQUFwQjs7QUFFQTtBQUNBLElBQUkwd0IsV0FBWSxZQUFXO0FBQ3pCLE1BQUlyN0IsY0FBYztBQUNoQixrQkFBYyxlQURFO0FBRWhCLHdCQUFvQixxQkFGSjtBQUdoQixxQkFBaUIsZUFIRDtBQUloQixtQkFBZTtBQUpDLEdBQWxCO0FBTUEsTUFBSW5CLE9BQU9oSCxPQUFPaUQsUUFBUCxDQUFnQkksYUFBaEIsQ0FBOEIsS0FBOUIsQ0FBWDs7QUFFQSxPQUFLLElBQUlnRixDQUFULElBQWNGLFdBQWQsRUFBMkI7QUFDekIsUUFBSSxPQUFPbkIsS0FBS3NCLEtBQUwsQ0FBV0QsQ0FBWCxDQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDLGFBQU9GLFlBQVlFLENBQVosQ0FBUDtBQUNEO0FBQ0Y7O0FBRUQsU0FBTyxJQUFQO0FBQ0QsQ0FoQmMsRUFBZjs7QUFrQkEsU0FBUzhLLE9BQVQsQ0FBaUJRLElBQWpCLEVBQXVCM0gsT0FBdkIsRUFBZ0NpSCxTQUFoQyxFQUEyQ0MsRUFBM0MsRUFBK0M7QUFDN0NsSCxZQUFVbEksRUFBRWtJLE9BQUYsRUFBVzRILEVBQVgsQ0FBYyxDQUFkLENBQVY7O0FBRUEsTUFBSSxDQUFDNUgsUUFBUXpGLE1BQWIsRUFBcUI7O0FBRXJCLE1BQUlpOUIsYUFBYSxJQUFqQixFQUF1QjtBQUNyQjd2QixXQUFPM0gsUUFBUWlJLElBQVIsRUFBUCxHQUF3QmpJLFFBQVFxSSxJQUFSLEVBQXhCO0FBQ0FuQjtBQUNBO0FBQ0Q7O0FBRUQsTUFBSVcsWUFBWUYsT0FBT2QsWUFBWSxDQUFaLENBQVAsR0FBd0JBLFlBQVksQ0FBWixDQUF4QztBQUNBLE1BQUlpQixjQUFjSCxPQUFPYixjQUFjLENBQWQsQ0FBUCxHQUEwQkEsY0FBYyxDQUFkLENBQTVDOztBQUVBO0FBQ0FpQjtBQUNBL0gsVUFBUWdJLFFBQVIsQ0FBaUJmLFNBQWpCO0FBQ0FqSCxVQUFRdUUsR0FBUixDQUFZLFlBQVosRUFBMEIsTUFBMUI7QUFDQXZHLHdCQUFzQixZQUFXO0FBQy9CZ0MsWUFBUWdJLFFBQVIsQ0FBaUJILFNBQWpCO0FBQ0EsUUFBSUYsSUFBSixFQUFVM0gsUUFBUWlJLElBQVI7QUFDWCxHQUhEOztBQUtBO0FBQ0FqSyx3QkFBc0IsWUFBVztBQUMvQmdDLFlBQVEsQ0FBUixFQUFXa0ksV0FBWDtBQUNBbEksWUFBUXVFLEdBQVIsQ0FBWSxZQUFaLEVBQTBCLEVBQTFCO0FBQ0F2RSxZQUFRZ0ksUUFBUixDQUFpQkYsV0FBakI7QUFDRCxHQUpEOztBQU1BO0FBQ0E5SCxVQUFRbUksR0FBUixDQUFZLGVBQVosRUFBNkJDLE1BQTdCOztBQUVBO0FBQ0EsV0FBU0EsTUFBVCxHQUFrQjtBQUNoQixRQUFJLENBQUNULElBQUwsRUFBVzNILFFBQVFxSSxJQUFSO0FBQ1hOO0FBQ0EsUUFBSWIsRUFBSixFQUFRQSxHQUFHbkssS0FBSCxDQUFTaUQsT0FBVDtBQUNUOztBQUVEO0FBQ0EsV0FBUytILEtBQVQsR0FBaUI7QUFDZi9ILFlBQVEsQ0FBUixFQUFXMUQsS0FBWCxDQUFpQmdNLGtCQUFqQixHQUFzQyxDQUF0QztBQUNBdEksWUFBUTNDLFdBQVIsQ0FBb0J3SyxZQUFZLEdBQVosR0FBa0JDLFdBQWxCLEdBQWdDLEdBQWhDLEdBQXNDYixTQUExRDtBQUNEO0FBQ0Y7O0FBRUQsSUFBSXd3QixXQUFXO0FBQ2J6d0IsYUFBVyxVQUFTaEgsT0FBVCxFQUFrQmlILFNBQWxCLEVBQTZCQyxFQUE3QixFQUFpQztBQUMxQ0MsWUFBUSxJQUFSLEVBQWNuSCxPQUFkLEVBQXVCaUgsU0FBdkIsRUFBa0NDLEVBQWxDO0FBQ0QsR0FIWTs7QUFLYkUsY0FBWSxVQUFTcEgsT0FBVCxFQUFrQmlILFNBQWxCLEVBQTZCQyxFQUE3QixFQUFpQztBQUMzQ0MsWUFBUSxLQUFSLEVBQWVuSCxPQUFmLEVBQXdCaUgsU0FBeEIsRUFBbUNDLEVBQW5DO0FBQ0Q7QUFQWSxDQUFmOzs7QUNoR0F2SCxPQUFRLDRCQUFSLEVBQXNDbVgsSUFBdEMsQ0FBMkMsc0NBQTNDO0FBQ0FuWCxPQUFRLDBCQUFSLEVBQW9DbVgsSUFBcEMsQ0FBeUMsNENBQXpDOzs7QUNEQW5YLE9BQU8xSSxRQUFQLEVBQWlCaUQsVUFBakI7OztBQ0FBOzs7OztBQUtBeUYsT0FBT3NSLFNBQVAsQ0FBaUI0bEIsU0FBakIsQ0FBMkIsY0FBM0IsRUFBMkMsVUFBU3BoQyxLQUFULEVBQWdCdUssT0FBaEIsRUFBeUI7QUFDbEU7QUFDQSxRQUFPLEtBQUt5eEIsUUFBTCxDQUFlenhCLE9BQWYsS0FBNEIsZ0VBQWdFN0IsSUFBaEUsQ0FBc0UxSSxLQUF0RSxDQUFuQztBQUNELENBSEQsRUFHRyxxQ0FISDs7QUFLQWtLLE9BQU8xSSxRQUFQLEVBQWlCeWdDLEtBQWpCLENBQXVCLFVBQVM1L0IsQ0FBVCxFQUFZO0FBQ2xDQSxHQUFFLGNBQUYsRUFBa0IwMkIsUUFBbEIsQ0FBMkI7QUFDMUI1USxTQUFPO0FBQ0wrWixXQUFRO0FBQ1QxbEIsY0FBVSxJQUREO0FBRVRtZ0IsZUFBVztBQUZGLElBREg7QUFLTHhmLFVBQU87QUFDUlgsY0FBVSxJQURGO0FBRVJXLFdBQU87QUFGQyxJQUxGO0FBU0xnbEIsWUFBUztBQUNWM2xCLGNBQVUsSUFEQTtBQUVWbWdCLGVBQVc7QUFGRDtBQVRKLEdBRG1CO0FBZTFCekMsWUFBVTtBQUNSZ0ksV0FBUSx3QkFEQTtBQUVSL2tCLFVBQU8sb0NBRkM7QUFHUmdsQixZQUFTO0FBSEQsR0FmZ0I7QUFvQjFCakgsZ0JBQWMsS0FwQlk7QUFxQjFCOEUsa0JBQWdCLFVBQVNuN0IsS0FBVCxFQUFnQjBGLE9BQWhCLEVBQXlCO0FBQ3ZDQSxXQUFRNjNCLEtBQVIsQ0FBY3Y5QixLQUFkO0FBQ0Q7QUF2QnlCLEVBQTNCO0FBeUJBLENBMUJEOzs7QUNWQXFGLE9BQU8sVUFBUzdILENBQVQsRUFBVztBQUNqQkUsZUFBV3dCLE1BQVgsQ0FBa0IsV0FBbEI7QUFDRyxRQUFJMUIsRUFBRSx5QkFBRixFQUE2QnlDLE1BQWpDLEVBQXlDO0FBQUU7QUFDdkM7QUFDQXpDLFVBQUUsc0JBQUYsRUFBMEJ1USxJQUExQjtBQUNBdlEsVUFBRSx5QkFBRixFQUE2Qm9yQixNQUE3QixDQUFxQyxpQ0FBckM7QUFDQTs7QUFFQTtBQUNBcHJCLFVBQUdiLFFBQUgsRUFBYzZnQyxZQUFkLENBQTRCLFlBQVc7QUFDbkM5L0IsdUJBQVd3QixNQUFYLENBQWtCLFdBQWxCLEVBRG1DLENBQ0g7QUFDbkMsU0FGRDs7QUFJQSxZQUFJdStCLFNBQVNqZ0MsRUFBRSxvQ0FBRixDQUFiO0FBQ0EsWUFBSWtnQyxPQUFPLENBQVg7QUFDQSxZQUFJQyxVQUFVLEtBQWQ7QUFDQSxZQUFJQyxVQUFVLEtBQWQ7QUFDQSxZQUFJQyxpQkFBaUI7QUFDakJDLG1CQUFPLElBRFU7QUFFakJDLHFCQUFTLFlBQVc7QUFDaEJGLCtCQUFlQyxLQUFmLEdBQXVCLElBQXZCO0FBQ0gsYUFKZ0I7QUFLakJ6N0IsbUJBQU8sR0FMVSxDQUtOO0FBTE0sU0FBckI7O0FBUUE3RSxVQUFFOUQsTUFBRixFQUFVdTBCLE1BQVYsQ0FBaUIsWUFBVTtBQUN2QixnQkFBSSxDQUFFMFAsT0FBRixJQUFhRSxlQUFlQyxLQUFoQyxFQUF3QztBQUNwQyxvQkFBS0YsT0FBTCxFQUFlO0FBQ1g7QUFDSDtBQUNEQywrQkFBZUMsS0FBZixHQUF1QixLQUF2QjtBQUNBampDLDJCQUFXZ2pDLGVBQWVFLE9BQTFCLEVBQW1DRixlQUFleDdCLEtBQWxEO0FBQ0Esb0JBQUkrRCxTQUFTNUksRUFBRWlnQyxNQUFGLEVBQVVyM0IsTUFBVixHQUFtQkwsR0FBbkIsR0FBeUJ2SSxFQUFFOUQsTUFBRixFQUFVa3NCLFNBQVYsRUFBdEM7QUFDQSxvQkFBSSxPQUFPeGYsTUFBWCxFQUFvQjtBQUNoQnUzQiw4QkFBVSxJQUFWO0FBQ0Esd0JBQUkvK0IsT0FBTztBQUNQby9CLGdDQUFRLG1CQUREO0FBRVBDLCtCQUFPQyxXQUFXRCxLQUZYO0FBR1BQLDhCQUFNQSxJQUhDO0FBSVBqekIsK0JBQU95ekIsV0FBV3p6QjtBQUpYLHFCQUFYO0FBTUFqTixzQkFBRTJnQyxJQUFGLENBQU9ELFdBQVczbEIsR0FBbEIsRUFBdUIzWixJQUF2QixFQUE2QixVQUFTdy9CLEdBQVQsRUFBYztBQUN2Qyw0QkFBSUEsSUFBSXJELE9BQVIsRUFBaUI7QUFDYnY5Qiw4QkFBRSx5QkFBRixFQUE2Qm9yQixNQUE3QixDQUFxQ3dWLElBQUl4L0IsSUFBekM7QUFDQXBCLDhCQUFFLHlCQUFGLEVBQTZCb3JCLE1BQTdCLENBQXFDNlUsTUFBckM7QUFDQUMsbUNBQU9BLE9BQU8sQ0FBZDtBQUNBQyxzQ0FBVSxLQUFWO0FBQ0EsZ0NBQUksQ0FBQ1MsSUFBSXgvQixJQUFULEVBQWdCO0FBQ1pnL0IsMENBQVUsSUFBVjtBQUNIO0FBQ0oseUJBUkQsTUFRTztBQUNIO0FBQ0g7QUFDSixxQkFaRCxFQVlHUyxJQVpILENBWVEsVUFBU0MsR0FBVCxFQUFjQyxVQUFkLEVBQTBCbjlCLENBQTFCLEVBQTZCO0FBQ2pDO0FBQ0gscUJBZEQ7QUFnQkg7QUFDSjtBQUNKLFNBbENEO0FBbUNIO0FBQ0osQ0E3REQ7OztBQ0FBOztBQUVBNUQsRUFBRSxXQUFGLEVBQWVPLElBQWYsQ0FBb0IsYUFBcEIsRUFBbUMsMEJBQW5DOztBQUVBO0FBQ0FMLFdBQVd3QixNQUFYLENBQWtCLFdBQWxCOztBQUVBO0FBQ0FxekI7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQS8wQixFQUFHOUQsTUFBSCxFQUFZdTBCLE1BQVosQ0FBbUIsWUFBVztBQUM1QjtBQUNBLE1BQUt6d0IsRUFBRSxrQkFBRixFQUFzQjRJLE1BQXRCLEdBQStCTCxHQUEvQixHQUFxQyxHQUExQyxFQUErQztBQUM3Q3ZJLE1BQUUsb0JBQUYsRUFBd0J1RixXQUF4QixDQUFvQyxNQUFwQztBQUNELEdBRkQsTUFFTztBQUNMdkYsTUFBRSxvQkFBRixFQUF3QmtRLFFBQXhCLENBQWlDLE1BQWpDO0FBQ0Q7QUFDRixDQVBEOzs7QUNwQkEsSUFBS2xRLEVBQUUsd0JBQUYsRUFBNEJ5QyxNQUFqQyxFQUEwQztBQUN4Q3pDLElBQUUsd0JBQUYsRUFBNEJnaEMsS0FBNUIsQ0FBa0M7QUFDaENDLFdBQU8sSUFEeUI7QUFFaENDLGtCQUFjLENBRmtCO0FBR2hDQyxvQkFBZ0IsQ0FIZ0I7QUFJaENDLFlBQVEsS0FKd0I7QUFLaENDLFVBQU0sSUFMMEI7QUFNaENDLGNBQVU7QUFOc0IsR0FBbEM7O0FBU0F0aEMsSUFBRSwwQkFBRixFQUE4QmdoQyxLQUE5QixDQUFvQztBQUNsQ0MsV0FBTyxJQUQyQjtBQUVsQ0Msa0JBQWMsQ0FGb0I7QUFHbENDLG9CQUFnQixDQUhrQjtBQUlsQ0csY0FBVSx3QkFKd0I7QUFLbENGLFlBQVEsS0FMMEI7QUFNbENHLFVBQU0sS0FONEI7QUFPbENDLGdCQUFZLEtBUHNCO0FBUWxDQyxtQkFBZTtBQVJtQixHQUFwQztBQVVEIiwiZmlsZSI6ImZvdW5kYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cud2hhdElucHV0ID0gKGZ1bmN0aW9uKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHZhcmlhYmxlc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFycmF5IG9mIGFjdGl2ZWx5IHByZXNzZWQga2V5c1xuICB2YXIgYWN0aXZlS2V5cyA9IFtdO1xuXG4gIC8vIGNhY2hlIGRvY3VtZW50LmJvZHlcbiAgdmFyIGJvZHk7XG5cbiAgLy8gYm9vbGVhbjogdHJ1ZSBpZiB0b3VjaCBidWZmZXIgdGltZXIgaXMgcnVubmluZ1xuICB2YXIgYnVmZmVyID0gZmFsc2U7XG5cbiAgLy8gdGhlIGxhc3QgdXNlZCBpbnB1dCB0eXBlXG4gIHZhciBjdXJyZW50SW5wdXQgPSBudWxsO1xuXG4gIC8vIGBpbnB1dGAgdHlwZXMgdGhhdCBkb24ndCBhY2NlcHQgdGV4dFxuICB2YXIgbm9uVHlwaW5nSW5wdXRzID0gW1xuICAgICdidXR0b24nLFxuICAgICdjaGVja2JveCcsXG4gICAgJ2ZpbGUnLFxuICAgICdpbWFnZScsXG4gICAgJ3JhZGlvJyxcbiAgICAncmVzZXQnLFxuICAgICdzdWJtaXQnXG4gIF07XG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgdmFyIG1vdXNlV2hlZWwgPSBkZXRlY3RXaGVlbCgpO1xuXG4gIC8vIGxpc3Qgb2YgbW9kaWZpZXIga2V5cyBjb21tb25seSB1c2VkIHdpdGggdGhlIG1vdXNlIGFuZFxuICAvLyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgdG8gcHJldmVudCBmYWxzZSBrZXlib2FyZCBkZXRlY3Rpb25cbiAgdmFyIGlnbm9yZU1hcCA9IFtcbiAgICAxNiwgLy8gc2hpZnRcbiAgICAxNywgLy8gY29udHJvbFxuICAgIDE4LCAvLyBhbHRcbiAgICA5MSwgLy8gV2luZG93cyBrZXkgLyBsZWZ0IEFwcGxlIGNtZFxuICAgIDkzICAvLyBXaW5kb3dzIG1lbnUgLyByaWdodCBBcHBsZSBjbWRcbiAgXTtcblxuICAvLyBtYXBwaW5nIG9mIGV2ZW50cyB0byBpbnB1dCB0eXBlc1xuICB2YXIgaW5wdXRNYXAgPSB7XG4gICAgJ2tleWRvd24nOiAna2V5Ym9hcmQnLFxuICAgICdrZXl1cCc6ICdrZXlib2FyZCcsXG4gICAgJ21vdXNlZG93bic6ICdtb3VzZScsXG4gICAgJ21vdXNlbW92ZSc6ICdtb3VzZScsXG4gICAgJ01TUG9pbnRlckRvd24nOiAncG9pbnRlcicsXG4gICAgJ01TUG9pbnRlck1vdmUnOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJkb3duJzogJ3BvaW50ZXInLFxuICAgICdwb2ludGVybW92ZSc6ICdwb2ludGVyJyxcbiAgICAndG91Y2hzdGFydCc6ICd0b3VjaCdcbiAgfTtcblxuICAvLyBhZGQgY29ycmVjdCBtb3VzZSB3aGVlbCBldmVudCBtYXBwaW5nIHRvIGBpbnB1dE1hcGBcbiAgaW5wdXRNYXBbZGV0ZWN0V2hlZWwoKV0gPSAnbW91c2UnO1xuXG4gIC8vIGFycmF5IG9mIGFsbCB1c2VkIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dFR5cGVzID0gW107XG5cbiAgLy8gbWFwcGluZyBvZiBrZXkgY29kZXMgdG8gYSBjb21tb24gbmFtZVxuICB2YXIga2V5TWFwID0ge1xuICAgIDk6ICd0YWInLFxuICAgIDEzOiAnZW50ZXInLFxuICAgIDE2OiAnc2hpZnQnLFxuICAgIDI3OiAnZXNjJyxcbiAgICAzMjogJ3NwYWNlJyxcbiAgICAzNzogJ2xlZnQnLFxuICAgIDM4OiAndXAnLFxuICAgIDM5OiAncmlnaHQnLFxuICAgIDQwOiAnZG93bidcbiAgfTtcblxuICAvLyBtYXAgb2YgSUUgMTAgcG9pbnRlciBldmVudHNcbiAgdmFyIHBvaW50ZXJNYXAgPSB7XG4gICAgMjogJ3RvdWNoJyxcbiAgICAzOiAndG91Y2gnLCAvLyB0cmVhdCBwZW4gbGlrZSB0b3VjaFxuICAgIDQ6ICdtb3VzZSdcbiAgfTtcblxuICAvLyB0b3VjaCBidWZmZXIgdGltZXJcbiAgdmFyIHRpbWVyO1xuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbnNcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICAvLyBhbGxvd3MgZXZlbnRzIHRoYXQgYXJlIGFsc28gdHJpZ2dlcmVkIHRvIGJlIGZpbHRlcmVkIG91dCBmb3IgYHRvdWNoc3RhcnRgXG4gIGZ1bmN0aW9uIGV2ZW50QnVmZmVyKCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG5cbiAgICBidWZmZXIgPSB0cnVlO1xuICAgIHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBidWZmZXIgPSBmYWxzZTtcbiAgICB9LCA2NTApO1xuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGlmICghYnVmZmVyKSBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkJ1ZmZlcmVkRXZlbnQoZXZlbnQpIHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgc2V0SW5wdXQoZXZlbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJUaW1lcigpIHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldElucHV0KGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgdmFsdWUgPSBpbnB1dE1hcFtldmVudC50eXBlXTtcbiAgICBpZiAodmFsdWUgPT09ICdwb2ludGVyJykgdmFsdWUgPSBwb2ludGVyVHlwZShldmVudCk7XG5cbiAgICAvLyBkb24ndCBkbyBhbnl0aGluZyBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgaW5wdXQgdHlwZSBhbHJlYWR5IHNldFxuICAgIGlmIChjdXJyZW50SW5wdXQgIT09IHZhbHVlKSB7XG4gICAgICB2YXIgZXZlbnRUYXJnZXQgPSB0YXJnZXQoZXZlbnQpO1xuICAgICAgdmFyIGV2ZW50VGFyZ2V0Tm9kZSA9IGV2ZW50VGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXRUeXBlID0gKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JykgPyBldmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA6IG51bGw7XG5cbiAgICAgIGlmIChcbiAgICAgICAgKC8vIG9ubHkgaWYgdGhlIHVzZXIgZmxhZyB0byBhbGxvdyB0eXBpbmcgaW4gZm9ybSBmaWVsZHMgaXNuJ3Qgc2V0XG4gICAgICAgICFib2R5Lmhhc0F0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQtZm9ybXR5cGluZycpICYmXG5cbiAgICAgICAgLy8gb25seSBpZiBjdXJyZW50SW5wdXQgaGFzIGEgdmFsdWVcbiAgICAgICAgY3VycmVudElucHV0ICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgaW5wdXQgaXMgYGtleWJvYXJkYFxuICAgICAgICB2YWx1ZSA9PT0gJ2tleWJvYXJkJyAmJlxuXG4gICAgICAgIC8vIG5vdCBpZiB0aGUga2V5IGlzIGBUQUJgXG4gICAgICAgIGtleU1hcFtldmVudEtleV0gIT09ICd0YWInICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgdGFyZ2V0IGlzIGEgZm9ybSBpbnB1dCB0aGF0IGFjY2VwdHMgdGV4dFxuICAgICAgICAoXG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3RleHRhcmVhJyB8fFxuICAgICAgICAgICBldmVudFRhcmdldE5vZGUgPT09ICdzZWxlY3QnIHx8XG4gICAgICAgICAgIChldmVudFRhcmdldE5vZGUgPT09ICdpbnB1dCcgJiYgbm9uVHlwaW5nSW5wdXRzLmluZGV4T2YoZXZlbnRUYXJnZXRUeXBlKSA8IDApXG4gICAgICAgICkpIHx8IChcbiAgICAgICAgICAvLyBpZ25vcmUgbW9kaWZpZXIga2V5c1xuICAgICAgICAgIGlnbm9yZU1hcC5pbmRleE9mKGV2ZW50S2V5KSA+IC0xXG4gICAgICAgIClcbiAgICAgICkge1xuICAgICAgICAvLyBpZ25vcmUga2V5Ym9hcmQgdHlwaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2hJbnB1dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSAna2V5Ym9hcmQnKSBsb2dLZXlzKGV2ZW50S2V5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN3aXRjaElucHV0KHN0cmluZykge1xuICAgIGN1cnJlbnRJbnB1dCA9IHN0cmluZztcbiAgICBib2R5LnNldEF0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQnLCBjdXJyZW50SW5wdXQpO1xuXG4gICAgaWYgKGlucHV0VHlwZXMuaW5kZXhPZihjdXJyZW50SW5wdXQpID09PSAtMSkgaW5wdXRUeXBlcy5wdXNoKGN1cnJlbnRJbnB1dCk7XG4gIH1cblxuICBmdW5jdGlvbiBrZXkoZXZlbnQpIHtcbiAgICByZXR1cm4gKGV2ZW50LmtleUNvZGUpID8gZXZlbnQua2V5Q29kZSA6IGV2ZW50LndoaWNoO1xuICB9XG5cbiAgZnVuY3Rpb24gdGFyZ2V0KGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gcG9pbnRlclR5cGUoZXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50LnBvaW50ZXJUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHBvaW50ZXJNYXBbZXZlbnQucG9pbnRlclR5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKGV2ZW50LnBvaW50ZXJUeXBlID09PSAncGVuJykgPyAndG91Y2gnIDogZXZlbnQucG9pbnRlclR5cGU7IC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgfVxuICB9XG5cbiAgLy8ga2V5Ym9hcmQgbG9nZ2luZ1xuICBmdW5jdGlvbiBsb2dLZXlzKGV2ZW50S2V5KSB7XG4gICAgaWYgKGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKSA9PT0gLTEgJiYga2V5TWFwW2V2ZW50S2V5XSkgYWN0aXZlS2V5cy5wdXNoKGtleU1hcFtldmVudEtleV0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5Mb2dLZXlzKGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgYXJyYXlQb3MgPSBhY3RpdmVLZXlzLmluZGV4T2Yoa2V5TWFwW2V2ZW50S2V5XSk7XG5cbiAgICBpZiAoYXJyYXlQb3MgIT09IC0xKSBhY3RpdmVLZXlzLnNwbGljZShhcnJheVBvcywgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kRXZlbnRzKCkge1xuICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgLy8gcG9pbnRlciBldmVudHMgKG1vdXNlLCBwZW4sIHRvdWNoKVxuICAgIGlmICh3aW5kb3cuUG9pbnRlckV2ZW50KSB7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuTVNQb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignTVNQb2ludGVyRG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJNb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gbW91c2UgZXZlbnRzXG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBidWZmZXJlZEV2ZW50KTtcblxuICAgICAgLy8gdG91Y2ggZXZlbnRzXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB7XG4gICAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGV2ZW50QnVmZmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtb3VzZSB3aGVlbFxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcihtb3VzZVdoZWVsLCBidWZmZXJlZEV2ZW50KTtcblxuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCB1bkxvZ0tleXMpO1xuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHV0aWxpdGllc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGRldGVjdCB2ZXJzaW9uIG9mIG1vdXNlIHdoZWVsIGV2ZW50IHRvIHVzZVxuICAvLyB2aWEgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzL3doZWVsXG4gIGZ1bmN0aW9uIGRldGVjdFdoZWVsKCkge1xuICAgIHJldHVybiBtb3VzZVdoZWVsID0gJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpID9cbiAgICAgICd3aGVlbCcgOiAvLyBNb2Rlcm4gYnJvd3NlcnMgc3VwcG9ydCBcIndoZWVsXCJcblxuICAgICAgZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAnbW91c2V3aGVlbCcgOiAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcbiAgICAgICAgJ0RPTU1vdXNlU2Nyb2xsJzsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgaW5pdFxuXG4gICAgZG9uJ3Qgc3RhcnQgc2NyaXB0IHVubGVzcyBicm93c2VyIGN1dHMgdGhlIG11c3RhcmQsXG4gICAgYWxzbyBwYXNzZXMgaWYgcG9seWZpbGxzIGFyZSB1c2VkXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgaWYgKFxuICAgICdhZGRFdmVudExpc3RlbmVyJyBpbiB3aW5kb3cgJiZcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZlxuICApIHtcblxuICAgIC8vIGlmIHRoZSBkb20gaXMgYWxyZWFkeSByZWFkeSBhbHJlYWR5IChzY3JpcHQgd2FzIHBsYWNlZCBhdCBib3R0b20gb2YgPGJvZHk+KVxuICAgIGlmIChkb2N1bWVudC5ib2R5KSB7XG4gICAgICBiaW5kRXZlbnRzKCk7XG5cbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIGRvbSB0byBsb2FkIChzY3JpcHQgd2FzIHBsYWNlZCBpbiB0aGUgPGhlYWQ+KVxuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgYmluZEV2ZW50cyk7XG4gICAgfVxuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGFwaVxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIHJldHVybiB7XG5cbiAgICAvLyByZXR1cm5zIHN0cmluZzogdGhlIGN1cnJlbnQgaW5wdXQgdHlwZVxuICAgIGFzazogZnVuY3Rpb24oKSB7IHJldHVybiBjdXJyZW50SW5wdXQ7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBjdXJyZW50bHkgcHJlc3NlZCBrZXlzXG4gICAga2V5czogZnVuY3Rpb24oKSB7IHJldHVybiBhY3RpdmVLZXlzOyB9LFxuXG4gICAgLy8gcmV0dXJucyBhcnJheTogYWxsIHRoZSBkZXRlY3RlZCBpbnB1dCB0eXBlc1xuICAgIHR5cGVzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGlucHV0VHlwZXM7IH0sXG5cbiAgICAvLyBhY2NlcHRzIHN0cmluZzogbWFudWFsbHkgc2V0IHRoZSBpbnB1dCB0eXBlXG4gICAgc2V0OiBzd2l0Y2hJbnB1dFxuICB9O1xuXG59KCkpO1xuIiwiIWZ1bmN0aW9uKCQpIHtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBGT1VOREFUSU9OX1ZFUlNJT04gPSAnNi4yLjInO1xuXG4vLyBHbG9iYWwgRm91bmRhdGlvbiBvYmplY3Rcbi8vIFRoaXMgaXMgYXR0YWNoZWQgdG8gdGhlIHdpbmRvdywgb3IgdXNlZCBhcyBhIG1vZHVsZSBmb3IgQU1EL0Jyb3dzZXJpZnlcbnZhciBGb3VuZGF0aW9uID0ge1xuICB2ZXJzaW9uOiBGT1VOREFUSU9OX1ZFUlNJT04sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBpbml0aWFsaXplZCBwbHVnaW5zLlxuICAgKi9cbiAgX3BsdWdpbnM6IHt9LFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgZ2VuZXJhdGVkIHVuaXF1ZSBpZHMgZm9yIHBsdWdpbiBpbnN0YW5jZXNcbiAgICovXG4gIF91dWlkczogW10sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBib29sZWFuIGZvciBSVEwgc3VwcG9ydFxuICAgKi9cbiAgcnRsOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiAkKCdodG1sJykuYXR0cignZGlyJykgPT09ICdydGwnO1xuICB9LFxuICAvKipcbiAgICogRGVmaW5lcyBhIEZvdW5kYXRpb24gcGx1Z2luLCBhZGRpbmcgaXQgdG8gdGhlIGBGb3VuZGF0aW9uYCBuYW1lc3BhY2UgYW5kIHRoZSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZSB3aGVuIHJlZmxvd2luZy5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcGx1Z2luLlxuICAgKi9cbiAgcGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIGFkZGluZyB0byBnbG9iYWwgRm91bmRhdGlvbiBvYmplY3RcbiAgICAvLyBFeGFtcGxlczogRm91bmRhdGlvbi5SZXZlYWwsIEZvdW5kYXRpb24uT2ZmQ2FudmFzXG4gICAgdmFyIGNsYXNzTmFtZSA9IChuYW1lIHx8IGZ1bmN0aW9uTmFtZShwbHVnaW4pKTtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIHN0b3JpbmcgdGhlIHBsdWdpbiwgYWxzbyB1c2VkIHRvIGNyZWF0ZSB0aGUgaWRlbnRpZnlpbmcgZGF0YSBhdHRyaWJ1dGUgZm9yIHRoZSBwbHVnaW5cbiAgICAvLyBFeGFtcGxlczogZGF0YS1yZXZlYWwsIGRhdGEtb2ZmLWNhbnZhc1xuICAgIHZhciBhdHRyTmFtZSAgPSBoeXBoZW5hdGUoY2xhc3NOYW1lKTtcblxuICAgIC8vIEFkZCB0byB0aGUgRm91bmRhdGlvbiBvYmplY3QgYW5kIHRoZSBwbHVnaW5zIGxpc3QgKGZvciByZWZsb3dpbmcpXG4gICAgdGhpcy5fcGx1Z2luc1thdHRyTmFtZV0gPSB0aGlzW2NsYXNzTmFtZV0gPSBwbHVnaW47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUG9wdWxhdGVzIHRoZSBfdXVpZHMgYXJyYXkgd2l0aCBwb2ludGVycyB0byBlYWNoIGluZGl2aWR1YWwgcGx1Z2luIGluc3RhbmNlLlxuICAgKiBBZGRzIHRoZSBgemZQbHVnaW5gIGRhdGEtYXR0cmlidXRlIHRvIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlZCBwbHVnaW5zIHRvIGFsbG93IHVzZSBvZiAkKHNlbGVjdG9yKS5mb3VuZGF0aW9uKG1ldGhvZCkgY2FsbHMuXG4gICAqIEFsc28gZmlyZXMgdGhlIGluaXRpYWxpemF0aW9uIGV2ZW50IGZvciBlYWNoIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLCBwYXNzZWQgYXMgYSBjYW1lbENhc2VkIHN0cmluZy5cbiAgICogQGZpcmVzIFBsdWdpbiNpbml0XG4gICAqL1xuICByZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IG5hbWUgPyBoeXBoZW5hdGUobmFtZSkgOiBmdW5jdGlvbk5hbWUocGx1Z2luLmNvbnN0cnVjdG9yKS50b0xvd2VyQ2FzZSgpO1xuICAgIHBsdWdpbi51dWlkID0gdGhpcy5HZXRZb0RpZ2l0cyg2LCBwbHVnaW5OYW1lKTtcblxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkpeyBwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCwgcGx1Z2luLnV1aWQpOyB9XG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpKXsgcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJywgcGx1Z2luKTsgfVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgaW5pdGlhbGl6ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNpbml0XG4gICAgICAgICAgICovXG4gICAgcGx1Z2luLiRlbGVtZW50LnRyaWdnZXIoYGluaXQuemYuJHtwbHVnaW5OYW1lfWApO1xuXG4gICAgdGhpcy5fdXVpZHMucHVzaChwbHVnaW4udXVpZCk7XG5cbiAgICByZXR1cm47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUmVtb3ZlcyB0aGUgcGx1Z2lucyB1dWlkIGZyb20gdGhlIF91dWlkcyBhcnJheS5cbiAgICogUmVtb3ZlcyB0aGUgemZQbHVnaW4gZGF0YSBhdHRyaWJ1dGUsIGFzIHdlbGwgYXMgdGhlIGRhdGEtcGx1Z2luLW5hbWUgYXR0cmlidXRlLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBkZXN0cm95ZWQgZXZlbnQgZm9yIHRoZSBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBmaXJlcyBQbHVnaW4jZGVzdHJveWVkXG4gICAqL1xuICB1bnJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHZhciBwbHVnaW5OYW1lID0gaHlwaGVuYXRlKGZ1bmN0aW9uTmFtZShwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKS5jb25zdHJ1Y3RvcikpO1xuXG4gICAgdGhpcy5fdXVpZHMuc3BsaWNlKHRoaXMuX3V1aWRzLmluZGV4T2YocGx1Z2luLnV1aWQpLCAxKTtcbiAgICBwbHVnaW4uJGVsZW1lbnQucmVtb3ZlQXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkucmVtb3ZlRGF0YSgnemZQbHVnaW4nKVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNkZXN0cm95ZWRcbiAgICAgICAgICAgKi9cbiAgICAgICAgICAudHJpZ2dlcihgZGVzdHJveWVkLnpmLiR7cGx1Z2luTmFtZX1gKTtcbiAgICBmb3IodmFyIHByb3AgaW4gcGx1Z2luKXtcbiAgICAgIHBsdWdpbltwcm9wXSA9IG51bGw7Ly9jbGVhbiB1cCBzY3JpcHQgdG8gcHJlcCBmb3IgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICAgIH1cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBDYXVzZXMgb25lIG9yIG1vcmUgYWN0aXZlIHBsdWdpbnMgdG8gcmUtaW5pdGlhbGl6ZSwgcmVzZXR0aW5nIGV2ZW50IGxpc3RlbmVycywgcmVjYWxjdWxhdGluZyBwb3NpdGlvbnMsIGV0Yy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbnMgLSBvcHRpb25hbCBzdHJpbmcgb2YgYW4gaW5kaXZpZHVhbCBwbHVnaW4ga2V5LCBhdHRhaW5lZCBieSBjYWxsaW5nIGAkKGVsZW1lbnQpLmRhdGEoJ3BsdWdpbk5hbWUnKWAsIG9yIHN0cmluZyBvZiBhIHBsdWdpbiBjbGFzcyBpLmUuIGAnZHJvcGRvd24nYFxuICAgKiBAZGVmYXVsdCBJZiBubyBhcmd1bWVudCBpcyBwYXNzZWQsIHJlZmxvdyBhbGwgY3VycmVudGx5IGFjdGl2ZSBwbHVnaW5zLlxuICAgKi9cbiAgIHJlSW5pdDogZnVuY3Rpb24ocGx1Z2lucyl7XG4gICAgIHZhciBpc0pRID0gcGx1Z2lucyBpbnN0YW5jZW9mICQ7XG4gICAgIHRyeXtcbiAgICAgICBpZihpc0pRKXtcbiAgICAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAkKHRoaXMpLmRhdGEoJ3pmUGx1Z2luJykuX2luaXQoKTtcbiAgICAgICAgIH0pO1xuICAgICAgIH1lbHNle1xuICAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgcGx1Z2lucyxcbiAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgIGZucyA9IHtcbiAgICAgICAgICAgJ29iamVjdCc6IGZ1bmN0aW9uKHBsZ3Mpe1xuICAgICAgICAgICAgIHBsZ3MuZm9yRWFjaChmdW5jdGlvbihwKXtcbiAgICAgICAgICAgICAgIHAgPSBoeXBoZW5hdGUocCk7XG4gICAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICdzdHJpbmcnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHBsdWdpbnMgPSBoeXBoZW5hdGUocGx1Z2lucyk7XG4gICAgICAgICAgICAgJCgnW2RhdGEtJysgcGx1Z2lucyArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAndW5kZWZpbmVkJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICB0aGlzWydvYmplY3QnXShPYmplY3Qua2V5cyhfdGhpcy5fcGx1Z2lucykpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9O1xuICAgICAgICAgZm5zW3R5cGVdKHBsdWdpbnMpO1xuICAgICAgIH1cbiAgICAgfWNhdGNoKGVycil7XG4gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICB9ZmluYWxseXtcbiAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICAgfVxuICAgfSxcblxuICAvKipcbiAgICogcmV0dXJucyBhIHJhbmRvbSBiYXNlLTM2IHVpZCB3aXRoIG5hbWVzcGFjaW5nXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIC0gbnVtYmVyIG9mIHJhbmRvbSBiYXNlLTM2IGRpZ2l0cyBkZXNpcmVkLiBJbmNyZWFzZSBmb3IgbW9yZSByYW5kb20gc3RyaW5ncy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZSAtIG5hbWUgb2YgcGx1Z2luIHRvIGJlIGluY29ycG9yYXRlZCBpbiB1aWQsIG9wdGlvbmFsLlxuICAgKiBAZGVmYXVsdCB7U3RyaW5nfSAnJyAtIGlmIG5vIHBsdWdpbiBuYW1lIGlzIHByb3ZpZGVkLCBub3RoaW5nIGlzIGFwcGVuZGVkIHRvIHRoZSB1aWQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IC0gdW5pcXVlIGlkXG4gICAqL1xuICBHZXRZb0RpZ2l0czogZnVuY3Rpb24obGVuZ3RoLCBuYW1lc3BhY2Upe1xuICAgIGxlbmd0aCA9IGxlbmd0aCB8fCA2O1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnBvdygzNiwgbGVuZ3RoICsgMSkgLSBNYXRoLnJhbmRvbSgpICogTWF0aC5wb3coMzYsIGxlbmd0aCkpKS50b1N0cmluZygzNikuc2xpY2UoMSkgKyAobmFtZXNwYWNlID8gYC0ke25hbWVzcGFjZX1gIDogJycpO1xuICB9LFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBwbHVnaW5zIG9uIGFueSBlbGVtZW50cyB3aXRoaW4gYGVsZW1gIChhbmQgYGVsZW1gIGl0c2VsZikgdGhhdCBhcmVuJ3QgYWxyZWFkeSBpbml0aWFsaXplZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgdG8gY2hlY2sgaW5zaWRlLiBBbHNvIGNoZWNrcyB0aGUgZWxlbWVudCBpdHNlbGYsIHVubGVzcyBpdCdzIHRoZSBgZG9jdW1lbnRgIG9iamVjdC5cbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHBsdWdpbnMgLSBBIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplLiBMZWF2ZSB0aGlzIG91dCB0byBpbml0aWFsaXplIGV2ZXJ5dGhpbmcuXG4gICAqL1xuICByZWZsb3c6IGZ1bmN0aW9uKGVsZW0sIHBsdWdpbnMpIHtcblxuICAgIC8vIElmIHBsdWdpbnMgaXMgdW5kZWZpbmVkLCBqdXN0IGdyYWIgZXZlcnl0aGluZ1xuICAgIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHBsdWdpbnMgPSBPYmplY3Qua2V5cyh0aGlzLl9wbHVnaW5zKTtcbiAgICB9XG4gICAgLy8gSWYgcGx1Z2lucyBpcyBhIHN0cmluZywgY29udmVydCBpdCB0byBhbiBhcnJheSB3aXRoIG9uZSBpdGVtXG4gICAgZWxzZSBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBwbHVnaW5zID0gW3BsdWdpbnNdO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBwbHVnaW5cbiAgICAkLmVhY2gocGx1Z2lucywgZnVuY3Rpb24oaSwgbmFtZSkge1xuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBsdWdpblxuICAgICAgdmFyIHBsdWdpbiA9IF90aGlzLl9wbHVnaW5zW25hbWVdO1xuXG4gICAgICAvLyBMb2NhbGl6ZSB0aGUgc2VhcmNoIHRvIGFsbCBlbGVtZW50cyBpbnNpZGUgZWxlbSwgYXMgd2VsbCBhcyBlbGVtIGl0c2VsZiwgdW5sZXNzIGVsZW0gPT09IGRvY3VtZW50XG4gICAgICB2YXIgJGVsZW0gPSAkKGVsZW0pLmZpbmQoJ1tkYXRhLScrbmFtZSsnXScpLmFkZEJhY2soJ1tkYXRhLScrbmFtZSsnXScpO1xuXG4gICAgICAvLyBGb3IgZWFjaCBwbHVnaW4gZm91bmQsIGluaXRpYWxpemUgaXRcbiAgICAgICRlbGVtLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciAkZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICAvLyBEb24ndCBkb3VibGUtZGlwIG9uIHBsdWdpbnNcbiAgICAgICAgaWYgKCRlbC5kYXRhKCd6ZlBsdWdpbicpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHJpZWQgdG8gaW5pdGlhbGl6ZSBcIituYW1lK1wiIG9uIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGhhcyBhIEZvdW5kYXRpb24gcGx1Z2luLlwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZigkZWwuYXR0cignZGF0YS1vcHRpb25zJykpe1xuICAgICAgICAgIHZhciB0aGluZyA9ICRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKS5zcGxpdCgnOycpLmZvckVhY2goZnVuY3Rpb24oZSwgaSl7XG4gICAgICAgICAgICB2YXIgb3B0ID0gZS5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihlbCl7IHJldHVybiBlbC50cmltKCk7IH0pO1xuICAgICAgICAgICAgaWYob3B0WzBdKSBvcHRzW29wdFswXV0gPSBwYXJzZVZhbHVlKG9wdFsxXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICRlbC5kYXRhKCd6ZlBsdWdpbicsIG5ldyBwbHVnaW4oJCh0aGlzKSwgb3B0cykpO1xuICAgICAgICB9Y2F0Y2goZXIpe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXIpO1xuICAgICAgICB9ZmluYWxseXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBnZXRGbk5hbWU6IGZ1bmN0aW9uTmFtZSxcbiAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24oJGVsZW0pe1xuICAgIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAgICd0cmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdPVHJhbnNpdGlvbic6ICdvdHJhbnNpdGlvbmVuZCdcbiAgICB9O1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgIGVuZDtcblxuICAgIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpe1xuICAgICAgaWYgKHR5cGVvZiBlbGVtLnN0eWxlW3RdICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGVuZCA9IHRyYW5zaXRpb25zW3RdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihlbmQpe1xuICAgICAgcmV0dXJuIGVuZDtcbiAgICB9ZWxzZXtcbiAgICAgIGVuZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJGVsZW0udHJpZ2dlckhhbmRsZXIoJ3RyYW5zaXRpb25lbmQnLCBbJGVsZW1dKTtcbiAgICAgIH0sIDEpO1xuICAgICAgcmV0dXJuICd0cmFuc2l0aW9uZW5kJztcbiAgICB9XG4gIH1cbn07XG5cbkZvdW5kYXRpb24udXRpbCA9IHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBhcHBseWluZyBhIGRlYm91bmNlIGVmZmVjdCB0byBhIGZ1bmN0aW9uIGNhbGwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IGVuZCBvZiB0aW1lb3V0LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgLSBUaW1lIGluIG1zIHRvIGRlbGF5IHRoZSBjYWxsIG9mIGBmdW5jYC5cbiAgICogQHJldHVybnMgZnVuY3Rpb25cbiAgICovXG4gIHRocm90dGxlOiBmdW5jdGlvbiAoZnVuYywgZGVsYXkpIHtcbiAgICB2YXIgdGltZXIgPSBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgaWYgKHRpbWVyID09PSBudWxsKSB7XG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICB0aW1lciA9IG51bGw7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciBub3QgbWFraW5nIHRoaXMgYSBqUXVlcnkgZnVuY3Rpb25cbi8vIFRPRE86IG5lZWQgd2F5IHRvIHJlZmxvdyB2cy4gcmUtaW5pdGlhbGl6ZVxuLyoqXG4gKiBUaGUgRm91bmRhdGlvbiBqUXVlcnkgbWV0aG9kLlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG1ldGhvZCAtIEFuIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBjdXJyZW50IGpRdWVyeSBvYmplY3QuXG4gKi9cbnZhciBmb3VuZGF0aW9uID0gZnVuY3Rpb24obWV0aG9kKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIG1ldGhvZCxcbiAgICAgICRtZXRhID0gJCgnbWV0YS5mb3VuZGF0aW9uLW1xJyksXG4gICAgICAkbm9KUyA9ICQoJy5uby1qcycpO1xuXG4gIGlmKCEkbWV0YS5sZW5ndGgpe1xuICAgICQoJzxtZXRhIGNsYXNzPVwiZm91bmRhdGlvbi1tcVwiPicpLmFwcGVuZFRvKGRvY3VtZW50LmhlYWQpO1xuICB9XG4gIGlmKCRub0pTLmxlbmd0aCl7XG4gICAgJG5vSlMucmVtb3ZlQ2xhc3MoJ25vLWpzJyk7XG4gIH1cblxuICBpZih0eXBlID09PSAndW5kZWZpbmVkJyl7Ly9uZWVkcyB0byBpbml0aWFsaXplIHRoZSBGb3VuZGF0aW9uIG9iamVjdCwgb3IgYW4gaW5kaXZpZHVhbCBwbHVnaW4uXG4gICAgRm91bmRhdGlvbi5NZWRpYVF1ZXJ5Ll9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWZsb3codGhpcyk7XG4gIH1lbHNlIGlmKHR5cGUgPT09ICdzdHJpbmcnKXsvL2FuIGluZGl2aWR1YWwgbWV0aG9kIHRvIGludm9rZSBvbiBhIHBsdWdpbiBvciBncm91cCBvZiBwbHVnaW5zXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOy8vY29sbGVjdCBhbGwgdGhlIGFyZ3VtZW50cywgaWYgbmVjZXNzYXJ5XG4gICAgdmFyIHBsdWdDbGFzcyA9IHRoaXMuZGF0YSgnemZQbHVnaW4nKTsvL2RldGVybWluZSB0aGUgY2xhc3Mgb2YgcGx1Z2luXG5cbiAgICBpZihwbHVnQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBwbHVnQ2xhc3NbbWV0aG9kXSAhPT0gdW5kZWZpbmVkKXsvL21ha2Ugc3VyZSBib3RoIHRoZSBjbGFzcyBhbmQgbWV0aG9kIGV4aXN0XG4gICAgICBpZih0aGlzLmxlbmd0aCA9PT0gMSl7Ly9pZiB0aGVyZSdzIG9ubHkgb25lLCBjYWxsIGl0IGRpcmVjdGx5LlxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KHBsdWdDbGFzcywgYXJncyk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksIGVsKXsvL290aGVyd2lzZSBsb29wIHRocm91Z2ggdGhlIGpRdWVyeSBjb2xsZWN0aW9uIGFuZCBpbnZva2UgdGhlIG1ldGhvZCBvbiBlYWNoXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkoJChlbCkuZGF0YSgnemZQbHVnaW4nKSwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1lbHNley8vZXJyb3IgZm9yIG5vIGNsYXNzIG9yIG5vIG1ldGhvZFxuICAgICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwiV2UncmUgc29ycnksICdcIiArIG1ldGhvZCArIFwiJyBpcyBub3QgYW4gYXZhaWxhYmxlIG1ldGhvZCBmb3IgXCIgKyAocGx1Z0NsYXNzID8gZnVuY3Rpb25OYW1lKHBsdWdDbGFzcykgOiAndGhpcyBlbGVtZW50JykgKyAnLicpO1xuICAgIH1cbiAgfWVsc2V7Ly9lcnJvciBmb3IgaW52YWxpZCBhcmd1bWVudCB0eXBlXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgV2UncmUgc29ycnksICR7dHlwZX0gaXMgbm90IGEgdmFsaWQgcGFyYW1ldGVyLiBZb3UgbXVzdCB1c2UgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtZXRob2QgeW91IHdpc2ggdG8gaW52b2tlLmApO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxud2luZG93LkZvdW5kYXRpb24gPSBGb3VuZGF0aW9uO1xuJC5mbi5mb3VuZGF0aW9uID0gZm91bmRhdGlvbjtcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93IHx8ICF3aW5kb3cuRGF0ZS5ub3cpXG4gICAgd2luZG93LkRhdGUubm93ID0gRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG4gIC8qKlxuICAgKiBQb2x5ZmlsbCBmb3IgcGVyZm9ybWFuY2Uubm93LCByZXF1aXJlZCBieSByQUZcbiAgICovXG4gIGlmKCF3aW5kb3cucGVyZm9ybWFuY2UgfHwgIXdpbmRvdy5wZXJmb3JtYW5jZS5ub3cpe1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIHN0YXJ0OiBEYXRlLm5vdygpLFxuICAgICAgbm93OiBmdW5jdGlvbigpeyByZXR1cm4gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnQ7IH1cbiAgICB9O1xuICB9XG59KSgpO1xuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBjbG9zZXN0IHRoaW5nIHBvc3NpYmxlIHRvIHRoZSBFQ01BU2NyaXB0IDVcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgIGZCb3VuZCAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgZk5PUFxuICAgICAgICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAgOiBvVGhpcyxcbiAgICAgICAgICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcblxuICAgIGlmICh0aGlzLnByb3RvdHlwZSkge1xuICAgICAgLy8gbmF0aXZlIGZ1bmN0aW9ucyBkb24ndCBoYXZlIGEgcHJvdG90eXBlXG4gICAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIH1cbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcblxuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59XG4vLyBQb2x5ZmlsbCB0byBnZXQgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiBpbiBJRTlcbmZ1bmN0aW9uIGZ1bmN0aW9uTmFtZShmbikge1xuICBpZiAoRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmdW5jTmFtZVJlZ2V4ID0gL2Z1bmN0aW9uXFxzKFteKF17MSx9KVxcKC87XG4gICAgdmFyIHJlc3VsdHMgPSAoZnVuY05hbWVSZWdleCkuZXhlYygoZm4pLnRvU3RyaW5nKCkpO1xuICAgIHJldHVybiAocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA+IDEpID8gcmVzdWx0c1sxXS50cmltKCkgOiBcIlwiO1xuICB9XG4gIGVsc2UgaWYgKGZuLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZuLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGZuLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG59XG5mdW5jdGlvbiBwYXJzZVZhbHVlKHN0cil7XG4gIGlmKC90cnVlLy50ZXN0KHN0cikpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmKC9mYWxzZS8udGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIGVsc2UgaWYoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgLSAkZWxlRGltcy53aWR0aCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gIH1cbn1cblxufShqUXVlcnkpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiBUaGlzIHV0aWwgd2FzIGNyZWF0ZWQgYnkgTWFyaXVzIE9sYmVydHogKlxuICogUGxlYXNlIHRoYW5rIE1hcml1cyBvbiBHaXRIdWIgL293bGJlcnR6ICpcbiAqIG9yIHRoZSB3ZWIgaHR0cDovL3d3dy5tYXJpdXNvbGJlcnR6LmRlLyAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBrZXlDb2RlcyA9IHtcbiAgOTogJ1RBQicsXG4gIDEzOiAnRU5URVInLFxuICAyNzogJ0VTQ0FQRScsXG4gIDMyOiAnU1BBQ0UnLFxuICAzNzogJ0FSUk9XX0xFRlQnLFxuICAzODogJ0FSUk9XX1VQJyxcbiAgMzk6ICdBUlJPV19SSUdIVCcsXG4gIDQwOiAnQVJST1dfRE9XTidcbn1cblxudmFyIGNvbW1hbmRzID0ge31cblxudmFyIEtleWJvYXJkID0ge1xuICBrZXlzOiBnZXRLZXlDb2RlcyhrZXlDb2RlcyksXG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgKGtleWJvYXJkKSBldmVudCBhbmQgcmV0dXJucyBhIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgaXRzIGtleVxuICAgKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEByZXR1cm4gU3RyaW5nIGtleSAtIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgdGhlIGtleSBwcmVzc2VkXG4gICAqL1xuICBwYXJzZUtleShldmVudCkge1xuICAgIHZhciBrZXkgPSBrZXlDb2Rlc1tldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlXSB8fCBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChldmVudC5zaGlmdEtleSkga2V5ID0gYFNISUZUXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmFsdEtleSkga2V5ID0gYEFMVF8ke2tleX1gO1xuICAgIHJldHVybiBrZXk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIGdpdmVuIChrZXlib2FyZCkgZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCdzIG5hbWUsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcGFyYW0ge09iamVjdHN9IGZ1bmN0aW9ucyAtIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHRoYXQgYXJlIHRvIGJlIGV4ZWN1dGVkXG4gICAqL1xuICBoYW5kbGVLZXkoZXZlbnQsIGNvbXBvbmVudCwgZnVuY3Rpb25zKSB7XG4gICAgdmFyIGNvbW1hbmRMaXN0ID0gY29tbWFuZHNbY29tcG9uZW50XSxcbiAgICAgIGtleUNvZGUgPSB0aGlzLnBhcnNlS2V5KGV2ZW50KSxcbiAgICAgIGNtZHMsXG4gICAgICBjb21tYW5kLFxuICAgICAgZm47XG5cbiAgICBpZiAoIWNvbW1hbmRMaXN0KSByZXR1cm4gY29uc29sZS53YXJuKCdDb21wb25lbnQgbm90IGRlZmluZWQhJyk7XG5cbiAgICBpZiAodHlwZW9mIGNvbW1hbmRMaXN0Lmx0ciA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gdGhpcyBjb21wb25lbnQgZG9lcyBub3QgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGx0ciBhbmQgcnRsXG4gICAgICAgIGNtZHMgPSBjb21tYW5kTGlzdDsgLy8gdXNlIHBsYWluIGxpc3RcbiAgICB9IGVsc2UgeyAvLyBtZXJnZSBsdHIgYW5kIHJ0bDogaWYgZG9jdW1lbnQgaXMgcnRsLCBydGwgb3ZlcndyaXRlcyBsdHIgYW5kIHZpY2UgdmVyc2FcbiAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QubHRyLCBjb21tYW5kTGlzdC5ydGwpO1xuXG4gICAgICAgIGVsc2UgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5ydGwsIGNvbW1hbmRMaXN0Lmx0cik7XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjbWRzW2tleUNvZGVdO1xuXG4gICAgZm4gPSBmdW5jdGlvbnNbY29tbWFuZF07XG4gICAgaWYgKGZuICYmIHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uICBpZiBleGlzdHNcbiAgICAgIHZhciByZXR1cm5WYWx1ZSA9IGZuLmFwcGx5KCk7XG4gICAgICBpZiAoZnVuY3Rpb25zLmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy5oYW5kbGVkKHJldHVyblZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZ1bmN0aW9ucy51bmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy51bmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBub3QgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy51bmhhbmRsZWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIHRoZSBnaXZlbiBgJGVsZW1lbnRgXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gc2VhcmNoIHdpdGhpblxuICAgKiBAcmV0dXJuIHtqUXVlcnl9ICRmb2N1c2FibGUgLSBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiBgJGVsZW1lbnRgXG4gICAqL1xuICBmaW5kRm9jdXNhYmxlKCRlbGVtZW50KSB7XG4gICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJ2FbaHJlZl0sIGFyZWFbaHJlZl0sIGlucHV0Om5vdChbZGlzYWJsZWRdKSwgc2VsZWN0Om5vdChbZGlzYWJsZWRdKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pLCBidXR0b246bm90KFtkaXNhYmxlZF0pLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsICpbdGFiaW5kZXhdLCAqW2NvbnRlbnRlZGl0YWJsZV0nKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISQodGhpcykuaXMoJzp2aXNpYmxlJykgfHwgJCh0aGlzKS5hdHRyKCd0YWJpbmRleCcpIDwgMCkgeyByZXR1cm4gZmFsc2U7IH0gLy9vbmx5IGhhdmUgdmlzaWJsZSBlbGVtZW50cyBhbmQgdGhvc2UgdGhhdCBoYXZlIGEgdGFiaW5kZXggZ3JlYXRlciBvciBlcXVhbCAwXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY29tcG9uZW50IG5hbWUgbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcmV0dXJuIFN0cmluZyBjb21wb25lbnROYW1lXG4gICAqL1xuXG4gIHJlZ2lzdGVyKGNvbXBvbmVudE5hbWUsIGNtZHMpIHtcbiAgICBjb21tYW5kc1tjb21wb25lbnROYW1lXSA9IGNtZHM7XG4gIH1cbn1cblxuLypcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cbiAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICovXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcbiAgdmFyIGsgPSB7fTtcbiAgZm9yICh2YXIga2MgaW4ga2NzKSBrW2tjc1trY11dID0ga2NzW2tjXTtcbiAgcmV0dXJuIGs7XG59XG5cbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vLyBEZWZhdWx0IHNldCBvZiBtZWRpYSBxdWVyaWVzXG5jb25zdCBkZWZhdWx0UXVlcmllcyA9IHtcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcbiAgbGFuZHNjYXBlIDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICBwb3J0cmFpdCA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxudmFyIE1lZGlhUXVlcnkgPSB7XG4gIHF1ZXJpZXM6IFtdLFxuXG4gIGN1cnJlbnQ6ICcnLFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbWVkaWEgcXVlcnkgaGVscGVyLCBieSBleHRyYWN0aW5nIHRoZSBicmVha3BvaW50IGxpc3QgZnJvbSB0aGUgQ1NTIGFuZCBhY3RpdmF0aW5nIHRoZSBicmVha3BvaW50IHdhdGNoZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleHRyYWN0ZWRTdHlsZXMgPSAkKCcuZm91bmRhdGlvbi1tcScpLmNzcygnZm9udC1mYW1pbHknKTtcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xuXG4gICAgbmFtZWRRdWVyaWVzID0gcGFyc2VTdHlsZVRvT2JqZWN0KGV4dHJhY3RlZFN0eWxlcyk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZWRRdWVyaWVzKSB7XG4gICAgICBpZihuYW1lZFF1ZXJpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiBgb25seSBzY3JlZW4gYW5kIChtaW4td2lkdGg6ICR7bmFtZWRRdWVyaWVzW2tleV19KWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKTtcblxuICAgIHRoaXMuX3dhdGNoZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gaXMgYXQgbGVhc3QgYXMgd2lkZSBhcyBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCdzIHNtYWxsZXIuXG4gICAqL1xuICBhdExlYXN0KHNpemUpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLmdldChzaXplKTtcblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KS5tYXRjaGVzO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgbWVkaWEgcXVlcnkgb2YgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGdldC5cbiAgICogQHJldHVybnMge1N0cmluZ3xudWxsfSAtIFRoZSBtZWRpYSBxdWVyeSBvZiB0aGUgYnJlYWtwb2ludCwgb3IgYG51bGxgIGlmIHRoZSBicmVha3BvaW50IGRvZXNuJ3QgZXhpc3QuXG4gICAqL1xuICBnZXQoc2l6ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyaWVzKSB7XG4gICAgICBpZih0aGlzLnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuICAgICAgICBpZiAoc2l6ZSA9PT0gcXVlcnkubmFtZSkgcmV0dXJuIHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQgbmFtZSBieSB0ZXN0aW5nIGV2ZXJ5IGJyZWFrcG9pbnQgYW5kIHJldHVybmluZyB0aGUgbGFzdCBvbmUgdG8gbWF0Y2ggKHRoZSBiaWdnZXN0IG9uZSkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBOYW1lIG9mIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQuXG4gICAqL1xuICBfZ2V0Q3VycmVudFNpemUoKSB7XG4gICAgdmFyIG1hdGNoZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucXVlcmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuXG4gICAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEocXVlcnkudmFsdWUpLm1hdGNoZXMpIHtcbiAgICAgICAgbWF0Y2hlZCA9IHF1ZXJ5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbWF0Y2hlZCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBtYXRjaGVkLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQWN0aXZhdGVzIHRoZSBicmVha3BvaW50IHdhdGNoZXIsIHdoaWNoIGZpcmVzIGFuIGV2ZW50IG9uIHRoZSB3aW5kb3cgd2hlbmV2ZXIgdGhlIGJyZWFrcG9pbnQgY2hhbmdlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfd2F0Y2hlcigpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5tZWRpYXF1ZXJ5JywgKCkgPT4ge1xuICAgICAgdmFyIG5ld1NpemUgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpLCBjdXJyZW50U2l6ZSA9IHRoaXMuY3VycmVudDtcblxuICAgICAgaWYgKG5ld1NpemUgIT09IGN1cnJlbnRTaXplKSB7XG4gICAgICAgIC8vIENoYW5nZSB0aGUgY3VycmVudCBtZWRpYSBxdWVyeVxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBuZXdTaXplO1xuXG4gICAgICAgIC8vIEJyb2FkY2FzdCB0aGUgbWVkaWEgcXVlcnkgY2hhbmdlIG9uIHRoZSB3aW5kb3dcbiAgICAgICAgJCh3aW5kb3cpLnRyaWdnZXIoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIFtuZXdTaXplLCBjdXJyZW50U2l6ZV0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5Gb3VuZGF0aW9uLk1lZGlhUXVlcnkgPSBNZWRpYVF1ZXJ5O1xuXG4vLyBtYXRjaE1lZGlhKCkgcG9seWZpbGwgLSBUZXN0IGEgQ1NTIG1lZGlhIHR5cGUvcXVlcnkgaW4gSlMuXG4vLyBBdXRob3JzICYgY29weXJpZ2h0IChjKSAyMDEyOiBTY290dCBKZWhsLCBQYXVsIElyaXNoLCBOaWNob2xhcyBaYWthcywgRGF2aWQgS25pZ2h0LiBEdWFsIE1JVC9CU0QgbGljZW5zZVxud2luZG93Lm1hdGNoTWVkaWEgfHwgKHdpbmRvdy5tYXRjaE1lZGlhID0gZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IG1hdGNoTWVkaXVtIGFwaSBzdWNoIGFzIElFIDkgYW5kIHdlYmtpdFxuICB2YXIgc3R5bGVNZWRpYSA9ICh3aW5kb3cuc3R5bGVNZWRpYSB8fCB3aW5kb3cubWVkaWEpO1xuXG4gIC8vIEZvciB0aG9zZSB0aGF0IGRvbid0IHN1cHBvcnQgbWF0Y2hNZWRpdW1cbiAgaWYgKCFzdHlsZU1lZGlhKSB7XG4gICAgdmFyIHN0eWxlICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpLFxuICAgIHNjcmlwdCAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdLFxuICAgIGluZm8gICAgICAgID0gbnVsbDtcblxuICAgIHN0eWxlLnR5cGUgID0gJ3RleHQvY3NzJztcbiAgICBzdHlsZS5pZCAgICA9ICdtYXRjaG1lZGlhanMtdGVzdCc7XG5cbiAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XG5cbiAgICAvLyAnc3R5bGUuY3VycmVudFN0eWxlJyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICd3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZScgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcblxuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xuICAgICAgICB2YXIgdGV4dCA9IGBAbWVkaWEgJHttZWRpYX17ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfWA7XG5cbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZXN0IGlmIG1lZGlhIHF1ZXJ5IGlzIHRydWUgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIGluZm8ud2lkdGggPT09ICcxcHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihtZWRpYSkge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcbiAgICAgIG1lZGlhOiBtZWRpYSB8fCAnYWxsJ1xuICAgIH07XG4gIH1cbn0oKSk7XG5cbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcbmZ1bmN0aW9uIHBhcnNlU3R5bGVUb09iamVjdChzdHIpIHtcbiAgdmFyIHN0eWxlT2JqZWN0ID0ge307XG5cbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3RyID0gc3RyLnRyaW0oKS5zbGljZSgxLCAtMSk7IC8vIGJyb3dzZXJzIHJlLXF1b3RlIHN0cmluZyBzdHlsZSB2YWx1ZXNcblxuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0eWxlT2JqZWN0ID0gc3RyLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHJldCwgcGFyYW0pIHtcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICAgIHZhciBrZXkgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsID0gcGFydHNbMV07XG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cbiAgICAvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgICB2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sIHt9KTtcblxuICByZXR1cm4gc3R5bGVPYmplY3Q7XG59XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNb3Rpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1vdGlvblxuICovXG5cbmNvbnN0IGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbmNvbnN0IGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG5jb25zdCBNb3Rpb24gPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIE1vdmUoZHVyYXRpb24sIGVsZW0sIGZuKXtcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcbiAgLy8gY29uc29sZS5sb2coJ2NhbGxlZCcpO1xuXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xuICAgIGlmKCFzdGFydCkgc3RhcnQgPSB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgLy8gY29uc29sZS5sb2coc3RhcnQsIHRzKTtcbiAgICBwcm9nID0gdHMgLSBzdGFydDtcbiAgICBmbi5hcHBseShlbGVtKTtcblxuICAgIGlmKHByb2cgPCBkdXJhdGlvbil7IGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUsIGVsZW0pOyB9XG4gICAgZWxzZXtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShhbmltKTtcbiAgICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIH1cbiAgfVxuICBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlKTtcbn1cblxuLyoqXG4gKiBBbmltYXRlcyBhbiBlbGVtZW50IGluIG9yIG91dCB1c2luZyBhIENTUyB0cmFuc2l0aW9uIGNsYXNzLlxuICogQGZ1bmN0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtCb29sZWFufSBpc0luIC0gRGVmaW5lcyBpZiB0aGUgYW5pbWF0aW9uIGlzIGluIG9yIG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9yIEhUTUwgb2JqZWN0IHRvIGFuaW1hdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gYW5pbWF0aW9uIC0gQ1NTIGNsYXNzIHRvIHVzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgdG8gcnVuIHdoZW4gYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICovXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBpbml0Q2xhc3MgPSBpc0luID8gaW5pdENsYXNzZXNbMF0gOiBpbml0Q2xhc3Nlc1sxXTtcbiAgdmFyIGFjdGl2ZUNsYXNzID0gaXNJbiA/IGFjdGl2ZUNsYXNzZXNbMF0gOiBhY3RpdmVDbGFzc2VzWzFdO1xuXG4gIC8vIFNldCB1cCB0aGUgYW5pbWF0aW9uXG4gIHJlc2V0KCk7XG5cbiAgZWxlbWVudFxuICAgIC5hZGRDbGFzcyhhbmltYXRpb24pXG4gICAgLmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG5cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aDtcbiAgICBlbGVtZW50XG4gICAgICAuY3NzKCd0cmFuc2l0aW9uJywgJycpXG4gICAgICAuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKGVsZW1lbnQpLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGAke2luaXRDbGFzc30gJHthY3RpdmVDbGFzc30gJHthbmltYXRpb259YCk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5Nb3ZlID0gTW92ZTtcbkZvdW5kYXRpb24uTW90aW9uID0gTW90aW9uO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE5lc3QgPSB7XG4gIEZlYXRoZXIobWVudSwgdHlwZSA9ICd6ZicpIHtcbiAgICBtZW51LmF0dHIoJ3JvbGUnLCAnbWVudWJhcicpO1xuXG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLmF0dHIoeydyb2xlJzogJ21lbnVpdGVtJ30pLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51LmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKCd0YWJpbmRleCcsIDApO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJGl0ZW0uY2hpbGRyZW4oJ2E6Zmlyc3QnKS50ZXh0KClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAkc3ViXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2RhdGEtc3VibWVudSc6ICcnLFxuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLnJlbW92ZUF0dHIoJ3RhYmluZGV4JyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCcqJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfSwgcmVtYWluKTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVyc3RhcnQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cblxuICB0aGlzLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IHRydWU7XG4gICAgLy9pZihlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCB0cnVlKTtcbiAgICB2YXIgZW5kID0gRGF0ZS5ub3coKTtcbiAgICByZW1haW4gPSByZW1haW4gLSAoZW5kIC0gc3RhcnQpO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJwYXVzZWQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIGEgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBpbWFnZXMgYXJlIGZ1bGx5IGxvYWRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWFnZXMgLSBJbWFnZShzKSB0byBjaGVjayBpZiBsb2FkZWQuXG4gKiBAcGFyYW0ge0Z1bmN9IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGltYWdlIGlzIGZ1bGx5IGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gb25JbWFnZXNMb2FkZWQoaW1hZ2VzLCBjYWxsYmFjayl7XG4gIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHVubG9hZGVkID0gaW1hZ2VzLmxlbmd0aDtcblxuICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG5cbiAgaW1hZ2VzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29tcGxldGUpIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB0aGlzLm5hdHVyYWxXaWR0aCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5uYXR1cmFsV2lkdGggPiAwKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQodGhpcykub25lKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHNpbmdsZUltYWdlTG9hZGVkKCkge1xuICAgIHVubG9hZGVkLS07XG4gICAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxufVxuXG5Gb3VuZGF0aW9uLlRpbWVyID0gVGltZXI7XG5Gb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkID0gb25JbWFnZXNMb2FkZWQ7XG5cbn0oalF1ZXJ5KTtcbiIsIi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipXb3JrIGluc3BpcmVkIGJ5IG11bHRpcGxlIGpxdWVyeSBzd2lwZSBwbHVnaW5zKipcbi8vKipEb25lIGJ5IFlvaGFpIEFyYXJhdCAqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbihmdW5jdGlvbigkKSB7XG5cbiAgJC5zcG90U3dpcGUgPSB7XG4gICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICBlbmFibGVkOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgcHJldmVudERlZmF1bHQ6IGZhbHNlLFxuICAgIG1vdmVUaHJlc2hvbGQ6IDc1LFxuICAgIHRpbWVUaHJlc2hvbGQ6IDIwMFxuICB9O1xuXG4gIHZhciAgIHN0YXJ0UG9zWCxcbiAgICAgICAgc3RhcnRQb3NZLFxuICAgICAgICBzdGFydFRpbWUsXG4gICAgICAgIGVsYXBzZWRUaW1lLFxuICAgICAgICBpc01vdmluZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XG4gICAgLy8gIGFsZXJ0KHRoaXMpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKTtcbiAgICBpc01vdmluZyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaE1vdmUoZSkge1xuICAgIGlmICgkLnNwb3RTd2lwZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICBpZihpc01vdmluZykge1xuICAgICAgdmFyIHggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICB2YXIgeSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIHZhciBkeCA9IHN0YXJ0UG9zWCAtIHg7XG4gICAgICB2YXIgZHkgPSBzdGFydFBvc1kgLSB5O1xuICAgICAgdmFyIGRpcjtcbiAgICAgIGVsYXBzZWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWU7XG4gICAgICBpZihNYXRoLmFicyhkeCkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAgIGRpciA9IGR4ID4gMCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgICB9XG4gICAgICAvLyBlbHNlIGlmKE1hdGguYWJzKGR5KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgIC8vICAgZGlyID0gZHkgPiAwID8gJ2Rvd24nIDogJ3VwJztcbiAgICAgIC8vIH1cbiAgICAgIGlmKGRpcikge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIG9uVG91Y2hFbmQuY2FsbCh0aGlzKTtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzd2lwZScsIGRpcikudHJpZ2dlcihgc3dpcGUke2Rpcn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xuICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHN0YXJ0UG9zWCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHN0YXJ0UG9zWSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIGlzTW92aW5nID0gdHJ1ZTtcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciAmJiB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCk7XG4gIH1cblxuICAkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7IHNldHVwOiBpbml0IH07XG5cbiAgJC5lYWNoKFsnbGVmdCcsICd1cCcsICdkb3duJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcbiAgICAkLmV2ZW50LnNwZWNpYWxbYHN3aXBlJHt0aGlzfWBdID0geyBzZXR1cDogZnVuY3Rpb24oKXtcbiAgICAgICQodGhpcykub24oJ3N3aXBlJywgJC5ub29wKTtcbiAgICB9IH07XG4gIH0pO1xufSkoalF1ZXJ5KTtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNZXRob2QgZm9yIGFkZGluZyBwc3VlZG8gZHJhZyBldmVudHMgdG8gZWxlbWVudHMgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiFmdW5jdGlvbigkKXtcbiAgJC5mbi5hZGRUb3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgJChlbCkuYmluZCgndG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vd2UgcGFzcyB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0IGJlY2F1c2UgdGhlIGpRdWVyeSBldmVudFxuICAgICAgICAvL29iamVjdCBpcyBub3JtYWxpemVkIHRvIHczYyBzcGVjcyBhbmQgZG9lcyBub3QgcHJvdmlkZSB0aGUgVG91Y2hMaXN0XG4gICAgICAgIGhhbmRsZVRvdWNoKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGhhbmRsZVRvdWNoID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgdmFyIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcyxcbiAgICAgICAgICBmaXJzdCA9IHRvdWNoZXNbMF0sXG4gICAgICAgICAgZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIHRvdWNoc3RhcnQ6ICdtb3VzZWRvd24nLFxuICAgICAgICAgICAgdG91Y2htb3ZlOiAnbW91c2Vtb3ZlJyxcbiAgICAgICAgICAgIHRvdWNoZW5kOiAnbW91c2V1cCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHR5cGUgPSBldmVudFR5cGVzW2V2ZW50LnR5cGVdLFxuICAgICAgICAgIHNpbXVsYXRlZEV2ZW50XG4gICAgICAgIDtcblxuICAgICAgaWYoJ01vdXNlRXZlbnQnIGluIHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93Lk1vdXNlRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBuZXcgd2luZG93Lk1vdXNlRXZlbnQodHlwZSwge1xuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAnY2FuY2VsYWJsZSc6IHRydWUsXG4gICAgICAgICAgJ3NjcmVlblgnOiBmaXJzdC5zY3JlZW5YLFxuICAgICAgICAgICdzY3JlZW5ZJzogZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAnY2xpZW50WCc6IGZpcnN0LmNsaWVudFgsXG4gICAgICAgICAgJ2NsaWVudFknOiBmaXJzdC5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudCcpO1xuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsIGZpcnN0LnNjcmVlblgsIGZpcnN0LnNjcmVlblksIGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFksIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLypsZWZ0Ki8sIG51bGwpO1xuICAgICAgfVxuICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuICAgIH07XG4gIH07XG59KGpRdWVyeSk7XG5cblxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqRnJvbSB0aGUgalF1ZXJ5IE1vYmlsZSBMaWJyYXJ5Kipcbi8vKipuZWVkIHRvIHJlY3JlYXRlIGZ1bmN0aW9uYWxpdHkqKlxuLy8qKmFuZCB0cnkgdG8gaW1wcm92ZSBpZiBwb3NzaWJsZSoqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyogUmVtb3ZpbmcgdGhlIGpRdWVyeSBmdW5jdGlvbiAqKioqXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuKGZ1bmN0aW9uKCAkLCB3aW5kb3csIHVuZGVmaW5lZCApIHtcblxuXHR2YXIgJGRvY3VtZW50ID0gJCggZG9jdW1lbnQgKSxcblx0XHQvLyBzdXBwb3J0VG91Y2ggPSAkLm1vYmlsZS5zdXBwb3J0LnRvdWNoLFxuXHRcdHRvdWNoU3RhcnRFdmVudCA9ICd0b3VjaHN0YXJ0Jy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiLFxuXHRcdHRvdWNoU3RvcEV2ZW50ID0gJ3RvdWNoZW5kJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCIsXG5cdFx0dG91Y2hNb3ZlRXZlbnQgPSAndG91Y2htb3ZlJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG5cblx0Ly8gc2V0dXAgbmV3IGV2ZW50IHNob3J0Y3V0c1xuXHQkLmVhY2goICggXCJ0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCBcIiArXG5cdFx0XCJzd2lwZSBzd2lwZWxlZnQgc3dpcGVyaWdodFwiICkuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXG5cdFx0JC5mblsgbmFtZSBdID0gZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0cmV0dXJuIGZuID8gdGhpcy5iaW5kKCBuYW1lLCBmbiApIDogdGhpcy50cmlnZ2VyKCBuYW1lICk7XG5cdFx0fTtcblxuXHRcdC8vIGpRdWVyeSA8IDEuOFxuXHRcdGlmICggJC5hdHRyRm4gKSB7XG5cdFx0XHQkLmF0dHJGblsgbmFtZSBdID0gdHJ1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRyaWdnZXJDdXN0b21FdmVudCggb2JqLCBldmVudFR5cGUsIGV2ZW50LCBidWJibGUgKSB7XG5cdFx0dmFyIG9yaWdpbmFsVHlwZSA9IGV2ZW50LnR5cGU7XG5cdFx0ZXZlbnQudHlwZSA9IGV2ZW50VHlwZTtcblx0XHRpZiAoIGJ1YmJsZSApIHtcblx0XHRcdCQuZXZlbnQudHJpZ2dlciggZXZlbnQsIHVuZGVmaW5lZCwgb2JqICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQuZXZlbnQuZGlzcGF0Y2guY2FsbCggb2JqLCBldmVudCApO1xuXHRcdH1cblx0XHRldmVudC50eXBlID0gb3JpZ2luYWxUeXBlO1xuXHR9XG5cblx0Ly8gYWxzbyBoYW5kbGVzIHRhcGhvbGRcblxuXHQvLyBBbHNvIGhhbmRsZXMgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0XG5cdCQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHtcblxuXHRcdC8vIE1vcmUgdGhhbiB0aGlzIGhvcml6b250YWwgZGlzcGxhY2VtZW50LCBhbmQgd2Ugd2lsbCBzdXBwcmVzcyBzY3JvbGxpbmcuXG5cdFx0c2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZDogMzAsXG5cblx0XHQvLyBNb3JlIHRpbWUgdGhhbiB0aGlzLCBhbmQgaXQgaXNuJ3QgYSBzd2lwZS5cblx0XHRkdXJhdGlvblRocmVzaG9sZDogMTAwMCxcblxuXHRcdC8vIFN3aXBlIGhvcml6b250YWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbW9yZSB0aGFuIHRoaXMuXG5cdFx0aG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdC8vIFN3aXBlIHZlcnRpY2FsIGRpc3BsYWNlbWVudCBtdXN0IGJlIGxlc3MgdGhhbiB0aGlzLlxuXHRcdHZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Z2V0TG9jYXRpb246IGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHR2YXIgd2luUGFnZVggPSB3aW5kb3cucGFnZVhPZmZzZXQsXG5cdFx0XHRcdHdpblBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuXHRcdFx0XHR4ID0gZXZlbnQuY2xpZW50WCxcblx0XHRcdFx0eSA9IGV2ZW50LmNsaWVudFk7XG5cblx0XHRcdGlmICggZXZlbnQucGFnZVkgPT09IDAgJiYgTWF0aC5mbG9vciggeSApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVkgKSB8fFxuXHRcdFx0XHRldmVudC5wYWdlWCA9PT0gMCAmJiBNYXRoLmZsb29yKCB4ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIGlPUzQgY2xpZW50WC9jbGllbnRZIGhhdmUgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGhhdmUgYmVlblxuXHRcdFx0XHQvLyBpbiBwYWdlWC9wYWdlWS4gV2hpbGUgcGFnZVgvcGFnZS8gaGF2ZSB0aGUgdmFsdWUgMFxuXHRcdFx0XHR4ID0geCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0geSAtIHdpblBhZ2VZO1xuXHRcdFx0fSBlbHNlIGlmICggeSA8ICggZXZlbnQucGFnZVkgLSB3aW5QYWdlWSkgfHwgeCA8ICggZXZlbnQucGFnZVggLSB3aW5QYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIFNvbWUgQW5kcm9pZCBicm93c2VycyBoYXZlIHRvdGFsbHkgYm9ndXMgdmFsdWVzIGZvciBjbGllbnRYL1lcblx0XHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcvem9vbWluZyBhIHBhZ2UuIERldGVjdGFibGUgc2luY2UgY2xpZW50WC9jbGllbnRZXG5cdFx0XHRcdC8vIHNob3VsZCBuZXZlciBiZSBzbWFsbGVyIHRoYW4gcGFnZVgvcGFnZVkgbWludXMgcGFnZSBzY3JvbGxcblx0XHRcdFx0eCA9IGV2ZW50LnBhZ2VYIC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSBldmVudC5wYWdlWSAtIHdpblBhZ2VZO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiB4LFxuXHRcdFx0XHR5OiB5XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXSxcblx0XHRcdFx0XHRcdG9yaWdpbjogJCggZXZlbnQudGFyZ2V0IClcblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlU3dpcGU6IGZ1bmN0aW9uKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApIHtcblx0XHRcdGlmICggc3RvcC50aW1lIC0gc3RhcnQudGltZSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5kdXJhdGlvblRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDEgXSAtIHN0b3AuY29vcmRzWyAxIF0gKSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS52ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkICkge1xuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gc3RhcnQuY29vcmRzWzBdID4gc3RvcC5jb29yZHNbIDAgXSA/IFwic3dpcGVsZWZ0XCIgOiBcInN3aXBlcmlnaHRcIjtcblxuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIFwic3dpcGVcIiwgJC5FdmVudCggXCJzd2lwZVwiLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9KSwgdHJ1ZSApO1xuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIGRpcmVjdGlvbiwkLkV2ZW50KCBkaXJlY3Rpb24sIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0gKSwgdHJ1ZSApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdH0sXG5cblx0XHQvLyBUaGlzIHNlcnZlcyBhcyBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgYXQgbW9zdCBvbmUgc3dpcGUgZXZlbnQgZXZlbnQgaXNcblx0XHQvLyBpbiB3b3JrIGF0IGFueSBnaXZlbiB0aW1lXG5cdFx0ZXZlbnRJblByb2dyZXNzOiBmYWxzZSxcblxuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsXG5cdFx0XHRcdHRoaXNPYmplY3QgPSB0aGlzLFxuXHRcdFx0XHQkdGhpcyA9ICQoIHRoaXNPYmplY3QgKSxcblx0XHRcdFx0Y29udGV4dCA9IHt9O1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSB0aGUgZXZlbnRzIGRhdGEgZm9yIHRoaXMgZWxlbWVudCBhbmQgYWRkIHRoZSBzd2lwZSBjb250ZXh0XG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoICFldmVudHMgKSB7XG5cdFx0XHRcdGV2ZW50cyA9IHsgbGVuZ3RoOiAwIH07XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIsIGV2ZW50cyApO1xuXHRcdFx0fVxuXHRcdFx0ZXZlbnRzLmxlbmd0aCsrO1xuXHRcdFx0ZXZlbnRzLnN3aXBlID0gY29udGV4dDtcblxuXHRcdFx0Y29udGV4dC5zdGFydCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblxuXHRcdFx0XHQvLyBCYWlsIGlmIHdlJ3JlIGFscmVhZHkgd29ya2luZyBvbiBhIHN3aXBlIGV2ZW50XG5cdFx0XHRcdGlmICggJC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IHRydWU7XG5cblx0XHRcdFx0dmFyIHN0b3AsXG5cdFx0XHRcdFx0c3RhcnQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RhcnQoIGV2ZW50ICksXG5cdFx0XHRcdFx0b3JpZ1RhcmdldCA9IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRlbWl0dGVkID0gZmFsc2U7XG5cblx0XHRcdFx0Y29udGV4dC5tb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGlmICggIXN0YXJ0IHx8IGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHN0b3AgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RvcCggZXZlbnQgKTtcblx0XHRcdFx0XHRpZiAoICFlbWl0dGVkICkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5oYW5kbGVTd2lwZSggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKTtcblx0XHRcdFx0XHRcdGlmICggZW1pdHRlZCApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBwcmV2ZW50IHNjcm9sbGluZ1xuXHRcdFx0XHRcdGlmICggTWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQgKSB7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb250ZXh0LnN0b3AgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0XHRcdGNvbnRleHQubW92ZSA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JGRvY3VtZW50Lm9uKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlIClcblx0XHRcdFx0XHQub25lKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHR9O1xuXHRcdFx0JHRoaXMub24oIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLCBjb250ZXh0O1xuXG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoIGV2ZW50cyApIHtcblx0XHRcdFx0Y29udGV4dCA9IGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZGVsZXRlIGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZXZlbnRzLmxlbmd0aC0tO1xuXHRcdFx0XHRpZiAoIGV2ZW50cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRcdFx0JC5yZW1vdmVEYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggY29udGV4dCApIHtcblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0YXJ0ICkge1xuXHRcdFx0XHRcdCQoIHRoaXMgKS5vZmYoIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5tb3ZlICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RvcCApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdCQuZWFjaCh7XG5cdFx0c3dpcGVsZWZ0OiBcInN3aXBlLmxlZnRcIixcblx0XHRzd2lwZXJpZ2h0OiBcInN3aXBlLnJpZ2h0XCJcblx0fSwgZnVuY3Rpb24oIGV2ZW50LCBzb3VyY2VFdmVudCApIHtcblxuXHRcdCQuZXZlbnQuc3BlY2lhbFsgZXZlbnQgXSA9IHtcblx0XHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLmJpbmQoIHNvdXJjZUV2ZW50LCAkLm5vb3AgKTtcblx0XHRcdH0sXG5cdFx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS51bmJpbmQoIHNvdXJjZUV2ZW50ICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59KSggalF1ZXJ5LCB0aGlzICk7XG4qL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4gIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGAke3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgIGluIHdpbmRvdykge1xuICAgICAgcmV0dXJuIHdpbmRvd1tgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYF07XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn0oKSk7XG5cbmNvbnN0IHRyaWdnZXJzID0gKGVsLCB0eXBlKSA9PiB7XG4gIGVsLmRhdGEodHlwZSkuc3BsaXQoJyAnKS5mb3JFYWNoKGlkID0+IHtcbiAgICAkKGAjJHtpZH1gKVsgdHlwZSA9PT0gJ2Nsb3NlJyA/ICd0cmlnZ2VyJyA6ICd0cmlnZ2VySGFuZGxlciddKGAke3R5cGV9LnpmLnRyaWdnZXJgLCBbZWxdKTtcbiAgfSk7XG59O1xuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1vcGVuXSB3aWxsIHJldmVhbCBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLW9wZW5dJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICdvcGVuJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zZV0gd2lsbCBjbG9zZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbi8vIElmIHVzZWQgd2l0aG91dCBhIHZhbHVlIG9uIFtkYXRhLWNsb3NlXSwgdGhlIGV2ZW50IHdpbGwgYnViYmxlLCBhbGxvd2luZyBpdCB0byBjbG9zZSBhIHBhcmVudCBjb21wb25lbnQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1jbG9zZV0nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCdjbG9zZScpO1xuICBpZiAoaWQpIHtcbiAgICB0cmlnZ2VycygkKHRoaXMpLCAnY2xvc2UnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlLnpmLnRyaWdnZXInKTtcbiAgfVxufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtdG9nZ2xlXSB3aWxsIHRvZ2dsZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZV0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ3RvZ2dsZScpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2FibGVdIHdpbGwgcmVzcG9uZCB0byBjbG9zZS56Zi50cmlnZ2VyIGV2ZW50cy5cbiQoZG9jdW1lbnQpLm9uKCdjbG9zZS56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NhYmxlXScsIGZ1bmN0aW9uKGUpe1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBsZXQgYW5pbWF0aW9uID0gJCh0aGlzKS5kYXRhKCdjbG9zYWJsZScpO1xuXG4gIGlmKGFuaW1hdGlvbiAhPT0gJycpe1xuICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoJCh0aGlzKSwgYW5pbWF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gICAgfSk7XG4gIH1lbHNle1xuICAgICQodGhpcykuZmFkZU91dCgpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICB9XG59KTtcblxuJChkb2N1bWVudCkub24oJ2ZvY3VzLnpmLnRyaWdnZXIgYmx1ci56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZS1mb2N1c10nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUtZm9jdXMnKTtcbiAgJChgIyR7aWR9YCkudHJpZ2dlckhhbmRsZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJywgWyQodGhpcyldKTtcbn0pO1xuXG4vKipcbiogRmlyZXMgb25jZSBhZnRlciBhbGwgb3RoZXIgc2NyaXB0cyBoYXZlIGxvYWRlZFxuKiBAZnVuY3Rpb25cbiogQHByaXZhdGVcbiovXG4kKHdpbmRvdykubG9hZCgoKSA9PiB7XG4gIGNoZWNrTGlzdGVuZXJzKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lcnMoKSB7XG4gIGV2ZW50c0xpc3RlbmVyKCk7XG4gIHJlc2l6ZUxpc3RlbmVyKCk7XG4gIHNjcm9sbExpc3RlbmVyKCk7XG4gIGNsb3NlbWVMaXN0ZW5lcigpO1xufVxuXG4vLyoqKioqKioqIG9ubHkgZmlyZXMgdGhpcyBmdW5jdGlvbiBvbmNlIG9uIGxvYWQsIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRvIHdhdGNoICoqKioqKioqXG5mdW5jdGlvbiBjbG9zZW1lTGlzdGVuZXIocGx1Z2luTmFtZSkge1xuICB2YXIgeWV0aUJveGVzID0gJCgnW2RhdGEteWV0aS1ib3hdJyksXG4gICAgICBwbHVnTmFtZXMgPSBbJ2Ryb3Bkb3duJywgJ3Rvb2x0aXAnLCAncmV2ZWFsJ107XG5cbiAgaWYocGx1Z2luTmFtZSl7XG4gICAgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5wdXNoKHBsdWdpbk5hbWUpO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGx1Z2luTmFtZVswXSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLmNvbmNhdChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsdWdpbiBuYW1lcyBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gIH1cbiAgaWYoeWV0aUJveGVzLmxlbmd0aCl7XG4gICAgbGV0IGxpc3RlbmVycyA9IHBsdWdOYW1lcy5tYXAoKG5hbWUpID0+IHtcbiAgICAgIHJldHVybiBgY2xvc2VtZS56Zi4ke25hbWV9YDtcbiAgICB9KS5qb2luKCcgJyk7XG5cbiAgICAkKHdpbmRvdykub2ZmKGxpc3RlbmVycykub24obGlzdGVuZXJzLCBmdW5jdGlvbihlLCBwbHVnaW5JZCl7XG4gICAgICBsZXQgcGx1Z2luID0gZS5uYW1lc3BhY2Uuc3BsaXQoJy4nKVswXTtcbiAgICAgIGxldCBwbHVnaW5zID0gJChgW2RhdGEtJHtwbHVnaW59XWApLm5vdChgW2RhdGEteWV0aS1ib3g9XCIke3BsdWdpbklkfVwiXWApO1xuXG4gICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IF90aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBfdGhpcy50cmlnZ2VySGFuZGxlcignY2xvc2UuemYudHJpZ2dlcicsIFtfdGhpc10pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzaXplTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1yZXNpemVdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Jlc2l6ZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSByZXNpemUgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJyZXNpemVcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCByZXNpemUgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXNjcm9sbF0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLnRyaWdnZXInKVxuICAgIC5vbignc2Nyb2xsLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKHRpbWVyKXsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHNjcm9sbCBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInNjcm9sbFwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHNjcm9sbCBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2ZW50c0xpc3RlbmVyKCkge1xuICBpZighTXV0YXRpb25PYnNlcnZlcil7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yZXNpemVdLCBbZGF0YS1zY3JvbGxdLCBbZGF0YS1tdXRhdGVdJyk7XG5cbiAgLy9lbGVtZW50IGNhbGxiYWNrXG4gIHZhciBsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uID0gZnVuY3Rpb24obXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgIHZhciAkdGFyZ2V0ID0gJChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnRhcmdldCk7XG4gICAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgIHN3aXRjaCAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikpIHtcblxuICAgICAgY2FzZSBcInJlc2l6ZVwiIDpcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJzY3JvbGxcIiA6XG4gICAgICAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgXCJtdXRhdGVcIiA6XG4gICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRlJywgJHRhcmdldCk7XG4gICAgICAvLyAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdtdXRhdGUuemYudHJpZ2dlcicpO1xuICAgICAgLy9cbiAgICAgIC8vIC8vbWFrZSBzdXJlIHdlIGRvbid0IGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wIGZyb20gc2xvcHB5IGNvZGVpbmdcbiAgICAgIC8vIGlmICgkdGFyZ2V0LmluZGV4KCdbZGF0YS1tdXRhdGVdJykgPT0gJChcIltkYXRhLW11dGF0ZV1cIikubGVuZ3RoLTEpIHtcbiAgICAgIC8vICAgZG9tTXV0YXRpb25PYnNlcnZlcigpO1xuICAgICAgLy8gfVxuICAgICAgLy8gYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQgOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy9ub3RoaW5nXG4gICAgfVxuICB9XG5cbiAgaWYobm9kZXMubGVuZ3RoKXtcbiAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIChvciBjb21pbmcgc29vbiBtdXRhdGlvbikgYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoLTE7IGkrKykge1xuICAgICAgbGV0IGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiBmYWxzZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6ZmFsc2UsIGF0dHJpYnV0ZUZpbHRlcjpbXCJkYXRhLWV2ZW50c1wiXX0pO1xuICAgIH1cbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XG4vLyAgIC8vICEhISBUaGlzIGlzIGNvbWluZyBzb29uIGFuZCBuZWVkcyBtb3JlIHdvcms7IG5vdCBhY3RpdmUgICEhISAvL1xuLy8gICB2YXIgdGltZXIsXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xuLy8gICAvL1xuLy8gICBpZiAobm9kZXMubGVuZ3RoKSB7XG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuLy8gICAgIC8vICAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4vLyAgICAgLy8gICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XG4vLyAgICAgLy8gICAgICAgcmV0dXJuIHdpbmRvd1twcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJ107XG4vLyAgICAgLy8gICAgIH1cbi8vICAgICAvLyAgIH1cbi8vICAgICAvLyAgIHJldHVybiBmYWxzZTtcbi8vICAgICAvLyB9KCkpO1xuLy9cbi8vXG4vLyAgICAgLy9mb3IgdGhlIGJvZHksIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBhbGwgY2hhbmdlcyBlZmZlY3RpbmcgdGhlIHN0eWxlIGFuZCBjbGFzcyBhdHRyaWJ1dGVzXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XG4vLyAgICAgYm9keU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOnRydWUsIGF0dHJpYnV0ZUZpbHRlcjpbXCJzdHlsZVwiLCBcImNsYXNzXCJdfSk7XG4vL1xuLy9cbi8vICAgICAvL2JvZHkgY2FsbGJhY2tcbi8vICAgICBmdW5jdGlvbiBib2R5TXV0YXRpb24obXV0YXRlKSB7XG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcbi8vICAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG4vL1xuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBib2R5T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuLy8gICAgICAgICAkKCdbZGF0YS1tdXRhdGVdJykuYXR0cignZGF0YS1ldmVudHMnLFwibXV0YXRlXCIpO1xuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBYmlkZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWJpZGVcbiAqL1xuXG5jbGFzcyBBYmlkZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFiaWRlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBBYmlkZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWJpZGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgQWJpZGUgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IEFiaWRlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRpbnB1dHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0Jyk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEFiaWRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLmFiaWRlJylcbiAgICAgIC5vbigncmVzZXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzZXRGb3JtKCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdzdWJtaXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlRm9ybSgpO1xuICAgICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnZhbGlkYXRlT24gPT09ICdmaWVsZENoYW5nZScpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdjaGFuZ2UuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2NoYW5nZS56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5saXZlVmFsaWRhdGUpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdpbnB1dC56Zi5hYmlkZScpXG4gICAgICAgIC5vbignaW5wdXQuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBBYmlkZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIG9yIG5vdCBhIGZvcm0gZWxlbWVudCBoYXMgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBhbmQgaWYgaXQncyBjaGVja2VkIG9yIG5vdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICByZXF1aXJlZENoZWNrKCRlbCkge1xuICAgIGlmICghJGVsLmF0dHIoJ3JlcXVpcmVkJykpIHJldHVybiB0cnVlO1xuXG4gICAgdmFyIGlzR29vZCA9IHRydWU7XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIGlzR29vZCA9ICRlbFswXS5jaGVja2VkO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFyIG9wdCA9ICRlbC5maW5kKCdvcHRpb246c2VsZWN0ZWQnKTtcbiAgICAgICAgaWYgKCFvcHQubGVuZ3RoIHx8ICFvcHQudmFsKCkpIGlzR29vZCA9IGZhbHNlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYoISRlbC52YWwoKSB8fCAhJGVsLnZhbCgpLmxlbmd0aCkgaXNHb29kID0gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzR29vZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYXNlZCBvbiAkZWwsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB3aXRoIHNlbGVjdG9yIGluIHRoaXMgb3JkZXI6XG4gICAqIDEuIFRoZSBlbGVtZW50J3MgZGlyZWN0IHNpYmxpbmcoJ3MpLlxuICAgKiAzLiBUaGUgZWxlbWVudCdzIHBhcmVudCdzIGNoaWxkcmVuLlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyBmb3IgbXVsdGlwbGUgZm9ybSBlcnJvcnMgcGVyIGlucHV0LCB0aG91Z2ggaWYgbm9uZSBhcmUgZm91bmQsIG5vIGZvcm0gZXJyb3JzIHdpbGwgYmUgc2hvd24uXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyByZWZlcmVuY2UgdG8gZmluZCB0aGUgZm9ybSBlcnJvciBzZWxlY3Rvci5cbiAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IG9iamVjdCB3aXRoIHRoZSBzZWxlY3Rvci5cbiAgICovXG4gIGZpbmRGb3JtRXJyb3IoJGVsKSB7XG4gICAgdmFyICRlcnJvciA9ICRlbC5zaWJsaW5ncyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuXG4gICAgaWYgKCEkZXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZXJyb3IgPSAkZWwucGFyZW50KCkuZmluZCh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiAkZXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoaXMgb3JkZXI6XG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kTGFiZWwoJGVsKSB7XG4gICAgdmFyIGlkID0gJGVsWzBdLmlkO1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLiRlbGVtZW50LmZpbmQoYGxhYmVsW2Zvcj1cIiR7aWR9XCJdYCk7XG5cbiAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAkZWwuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGxhYmVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2V0IG9mIGxhYmVscyBhc3NvY2lhdGVkIHdpdGggYSBzZXQgb2YgcmFkaW8gZWxzIGluIHRoaXMgb3JkZXJcbiAgICogMi4gVGhlIDxsYWJlbD4gd2l0aCB0aGUgYXR0cmlidXRlIGBbZm9yPVwic29tZUlucHV0SWRcIl1gXG4gICAqIDMuIFRoZSBgLmNsb3Nlc3QoKWAgPGxhYmVsPlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIGZpbmRSYWRpb0xhYmVscygkZWxzKSB7XG4gICAgdmFyIGxhYmVscyA9ICRlbHMubWFwKChpLCBlbCkgPT4ge1xuICAgICAgdmFyIGlkID0gZWwuaWQ7XG4gICAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgJGxhYmVsID0gJChlbCkuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAkbGFiZWxbMF07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gJChsYWJlbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIENTUyBlcnJvciBjbGFzcyBhcyBzcGVjaWZpZWQgYnkgdGhlIEFiaWRlIHNldHRpbmdzIHRvIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIGNsYXNzIHRvXG4gICAqL1xuICBhZGRFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgdmFyICRsYWJlbCA9IHRoaXMuZmluZExhYmVsKCRlbCk7XG4gICAgdmFyICRmb3JtRXJyb3IgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVsKTtcblxuICAgIGlmICgkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAkbGFiZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZm9ybUVycm9yLmFkZENsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLmF0dHIoJ2RhdGEtaW52YWxpZCcsICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgQ1NTIGVycm9yIGNsYXNzZXMgZXRjIGZyb20gYW4gZW50aXJlIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICpcbiAgICovXG5cbiAgcmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMoZ3JvdXBOYW1lKSB7XG4gICAgdmFyICRlbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyICRsYWJlbHMgPSB0aGlzLmZpbmRSYWRpb0xhYmVscygkZWxzKTtcbiAgICB2YXIgJGZvcm1FcnJvcnMgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVscyk7XG5cbiAgICBpZiAoJGxhYmVscy5sZW5ndGgpIHtcbiAgICAgICRsYWJlbHMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3JzLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvcnMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyBmcm9tIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byByZW1vdmUgdGhlIGNsYXNzIGZyb21cbiAgICovXG4gIHJlbW92ZUVycm9yQ2xhc3NlcygkZWwpIHtcbiAgICAvLyByYWRpb3MgbmVlZCB0byBjbGVhciBhbGwgb2YgdGhlIGVsc1xuICAgIGlmKCRlbFswXS50eXBlID09ICdyYWRpbycpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKCRlbC5hdHRyKCduYW1lJykpO1xuICAgIH1cblxuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIHRvIGZpbmQgaW5wdXRzIGFuZCBwcm9jZWVkcyB0byB2YWxpZGF0ZSB0aGVtIGluIHdheXMgc3BlY2lmaWMgdG8gdGhlaXIgdHlwZVxuICAgKiBAZmlyZXMgQWJpZGUjaW52YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjdmFsaWRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYW4gSFRNTCBpbnB1dFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZ29vZFRvR28gLSBJZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LlxuICAgKi9cbiAgdmFsaWRhdGVJbnB1dCgkZWwpIHtcbiAgICB2YXIgY2xlYXJSZXF1aXJlID0gdGhpcy5yZXF1aXJlZENoZWNrKCRlbCksXG4gICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlLFxuICAgICAgICBjdXN0b21WYWxpZGF0b3IgPSB0cnVlLFxuICAgICAgICB2YWxpZGF0b3IgPSAkZWwuYXR0cignZGF0YS12YWxpZGF0b3InKSxcbiAgICAgICAgZXF1YWxUbyA9IHRydWU7XG5cbiAgICAvLyBkb24ndCB2YWxpZGF0ZSBpZ25vcmVkIGlucHV0cyBvciBoaWRkZW4gaW5wdXRzXG4gICAgaWYgKCRlbC5pcygnW2RhdGEtYWJpZGUtaWdub3JlXScpIHx8ICRlbC5pcygnW3R5cGU9XCJoaWRkZW5cIl0nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlUmFkaW8oJGVsLmF0dHIoJ25hbWUnKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVUZXh0KCRlbCk7XG4gICAgfVxuXG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdGhpcy5tYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3IsICRlbC5hdHRyKCdyZXF1aXJlZCcpKTtcbiAgICB9XG5cbiAgICBpZiAoJGVsLmF0dHIoJ2RhdGEtZXF1YWx0bycpKSB7XG4gICAgICBlcXVhbFRvID0gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnMuZXF1YWxUbygkZWwpO1xuICAgIH1cblxuXG4gICAgdmFyIGdvb2RUb0dvID0gW2NsZWFyUmVxdWlyZSwgdmFsaWRhdGVkLCBjdXN0b21WYWxpZGF0b3IsIGVxdWFsVG9dLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbiAgICB2YXIgbWVzc2FnZSA9IChnb29kVG9HbyA/ICd2YWxpZCcgOiAnaW52YWxpZCcpICsgJy56Zi5hYmlkZSc7XG5cbiAgICB0aGlzW2dvb2RUb0dvID8gJ3JlbW92ZUVycm9yQ2xhc3NlcycgOiAnYWRkRXJyb3JDbGFzc2VzJ10oJGVsKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGlucHV0IGlzIGRvbmUgY2hlY2tpbmcgZm9yIHZhbGlkYXRpb24uIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGB2YWxpZC56Zi5hYmlkZWAgb3IgYGludmFsaWQuemYuYWJpZGVgXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIGlucHV0LlxuICAgICAqIEBldmVudCBBYmlkZSN2YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNpbnZhbGlkXG4gICAgICovXG4gICAgJGVsLnRyaWdnZXIobWVzc2FnZSwgWyRlbF0pO1xuXG4gICAgcmV0dXJuIGdvb2RUb0dvO1xuICB9XG5cbiAgLyoqXG4gICAqIEdvZXMgdGhyb3VnaCBhIGZvcm0gYW5kIGlmIHRoZXJlIGFyZSBhbnkgaW52YWxpZCBpbnB1dHMsIGl0IHdpbGwgZGlzcGxheSB0aGUgZm9ybSBlcnJvciBlbGVtZW50XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBub0Vycm9yIC0gdHJ1ZSBpZiBubyBlcnJvcnMgd2VyZSBkZXRlY3RlZC4uLlxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXZhbGlkXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtaW52YWxpZFxuICAgKi9cbiAgdmFsaWRhdGVGb3JtKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kaW5wdXRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBhY2MucHVzaChfdGhpcy52YWxpZGF0ZUlucHV0KCQodGhpcykpKTtcbiAgICB9KTtcblxuICAgIHZhciBub0Vycm9yID0gYWNjLmluZGV4T2YoZmFsc2UpID09PSAtMTtcblxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgKG5vRXJyb3IgPyAnbm9uZScgOiAnYmxvY2snKSk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGlzIGZpbmlzaGVkIHZhbGlkYXRpbmcuIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGBmb3JtdmFsaWQuemYuYWJpZGVgIG9yIGBmb3JtaW52YWxpZC56Zi5hYmlkZWAuXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgZWxlbWVudCBvZiB0aGUgZm9ybS5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXZhbGlkXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm1pbnZhbGlkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKChub0Vycm9yID8gJ2Zvcm12YWxpZCcgOiAnZm9ybWludmFsaWQnKSArICcuemYuYWJpZGUnLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgcmV0dXJuIG5vRXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgdGV4dCBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB0aGUgcGF0dGVybiBzcGVjaWZpZWQgaW4gdGhlIGF0dHJpYnV0ZS4gSWYgbm8gbWF0Y2hpbmcgcGF0dGVybiBpcyBmb3VuZCwgcmV0dXJucyB0cnVlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGEgdGV4dCBpbnB1dCBIVE1MIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdHRlcm4gLSBzdHJpbmcgdmFsdWUgb2Ygb25lIG9mIHRoZSBSZWdFeCBwYXR0ZXJucyBpbiBBYmlkZS5vcHRpb25zLnBhdHRlcm5zXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgdGhlIGlucHV0IHZhbHVlIG1hdGNoZXMgdGhlIHBhdHRlcm4gc3BlY2lmaWVkXG4gICAqL1xuICB2YWxpZGF0ZVRleHQoJGVsLCBwYXR0ZXJuKSB7XG4gICAgLy8gQSBwYXR0ZXJuIGNhbiBiZSBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgb3IgaXQgd2lsbCBiZSBpbmZlcmVkIGZyb20gdGhlIGlucHV0J3MgXCJwYXR0ZXJuXCIgYXR0cmlidXRlLCBvciBpdCdzIFwidHlwZVwiIGF0dHJpYnV0ZVxuICAgIHBhdHRlcm4gPSAocGF0dGVybiB8fCAkZWwuYXR0cigncGF0dGVybicpIHx8ICRlbC5hdHRyKCd0eXBlJykpO1xuICAgIHZhciBpbnB1dFRleHQgPSAkZWwudmFsKCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2U7XG5cbiAgICBpZiAoaW5wdXRUZXh0Lmxlbmd0aCkge1xuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGlzIGluIEFiaWRlJ3MgbGlzdCBvZiBwYXR0ZXJucywgdGhlbiB0ZXN0IHRoYXQgcmVnZXhwXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnBhdHRlcm5zLmhhc093blByb3BlcnR5KHBhdHRlcm4pKSB7XG4gICAgICAgIHZhbGlkID0gdGhpcy5vcHRpb25zLnBhdHRlcm5zW3BhdHRlcm5dLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIG5hbWUgaXNuJ3QgYWxzbyB0aGUgdHlwZSBhdHRyaWJ1dGUgb2YgdGhlIGZpZWxkLCB0aGVuIHRlc3QgaXQgYXMgYSByZWdleHBcbiAgICAgIGVsc2UgaWYgKHBhdHRlcm4gIT09ICRlbC5hdHRyKCd0eXBlJykpIHtcbiAgICAgICAgdmFsaWQgPSBuZXcgUmVnRXhwKHBhdHRlcm4pLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFuIGVtcHR5IGZpZWxkIGlzIHZhbGlkIGlmIGl0J3Mgbm90IHJlcXVpcmVkXG4gICAgZWxzZSBpZiAoISRlbC5wcm9wKCdyZXF1aXJlZCcpKSB7XG4gICAgICB2YWxpZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkO1xuICAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSByYWRpbyBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB3aGV0aGVyIG9yIG5vdCBpdCBpcyByZXF1aXJlZCBhbmQgc2VsZWN0ZWQuIEFsdGhvdWdoIHRoZSBmdW5jdGlvbiB0YXJnZXRzIGEgc2luZ2xlIGA8aW5wdXQ+YCwgaXQgdmFsaWRhdGVzIGJ5IGNoZWNraW5nIHRoZSBgcmVxdWlyZWRgIGFuZCBgY2hlY2tlZGAgcHJvcGVydGllcyBvZiBhbGwgcmFkaW8gYnV0dG9ucyBpbiBpdHMgZ3JvdXAuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBncm91cE5hbWUgLSBBIHN0cmluZyB0aGF0IHNwZWNpZmllcyB0aGUgbmFtZSBvZiBhIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0IGxlYXN0IG9uZSByYWRpbyBpbnB1dCBoYXMgYmVlbiBzZWxlY3RlZCAoaWYgaXQncyByZXF1aXJlZClcbiAgICovXG4gIHZhbGlkYXRlUmFkaW8oZ3JvdXBOYW1lKSB7XG4gICAgLy8gSWYgYXQgbGVhc3Qgb25lIHJhZGlvIGluIHRoZSBncm91cCBoYXMgdGhlIGByZXF1aXJlZGAgYXR0cmlidXRlLCB0aGUgZ3JvdXAgaXMgY29uc2lkZXJlZCByZXF1aXJlZFxuICAgIC8vIFBlciBXM0Mgc3BlYywgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gYSBncm91cCBzaG91bGQgaGF2ZSBgcmVxdWlyZWRgLCBidXQgd2UncmUgYmVpbmcgbmljZVxuICAgIHZhciAkZ3JvdXAgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2UsIHJlcXVpcmVkID0gZmFsc2U7XG5cbiAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHJlcXVpcmVkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgcmVxdWlyZWRcbiAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgaWYgKCQoZSkuYXR0cigncmVxdWlyZWQnKSkge1xuICAgICAgICByZXF1aXJlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYoIXJlcXVpcmVkKSB2YWxpZD10cnVlO1xuXG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSB2YWxpZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIGNoZWNrZWRcbiAgICAgICRncm91cC5lYWNoKChpLCBlKSA9PiB7XG4gICAgICAgIGlmICgkKGUpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgc2VsZWN0ZWQgaW5wdXQgcGFzc2VzIGEgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb24uIE11bHRpcGxlIHZhbGlkYXRpb25zIGNhbiBiZSB1c2VkLCBpZiBwYXNzZWQgdG8gdGhlIGVsZW1lbnQgd2l0aCBgZGF0YS12YWxpZGF0b3I9XCJmb28gYmFyIGJhelwiYCBpbiBhIHNwYWNlIHNlcGFyYXRlZCBsaXN0ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgaW5wdXQgZWxlbWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbGlkYXRvcnMgLSBhIHN0cmluZyBvZiBmdW5jdGlvbiBuYW1lcyBtYXRjaGluZyBmdW5jdGlvbnMgaW4gdGhlIEFiaWRlLm9wdGlvbnMudmFsaWRhdG9ycyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgLSBzZWxmIGV4cGxhbmF0b3J5P1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIHZhbGlkYXRpb25zIHBhc3NlZC5cbiAgICovXG4gIG1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvcnMsIHJlcXVpcmVkKSB7XG4gICAgcmVxdWlyZWQgPSByZXF1aXJlZCA/IHRydWUgOiBmYWxzZTtcblxuICAgIHZhciBjbGVhciA9IHZhbGlkYXRvcnMuc3BsaXQoJyAnKS5tYXAoKHYpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMudmFsaWRhdG9yc1t2XSgkZWwsIHJlcXVpcmVkLCAkZWwucGFyZW50KCkpO1xuICAgIH0pO1xuICAgIHJldHVybiBjbGVhci5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIGZvcm0gaW5wdXRzIGFuZCBzdHlsZXNcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1yZXNldFxuICAgKi9cbiAgcmVzZXRGb3JtKCkge1xuICAgIHZhciAkZm9ybSA9IHRoaXMuJGVsZW1lbnQsXG4gICAgICAgIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAkKGAuJHtvcHRzLmxhYmVsRXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMubGFiZWxFcnJvckNsYXNzKTtcbiAgICAkKGAuJHtvcHRzLmlucHV0RXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMuaW5wdXRFcnJvckNsYXNzKTtcbiAgICAkKGAke29wdHMuZm9ybUVycm9yU2VsZWN0b3J9LiR7b3B0cy5mb3JtRXJyb3JDbGFzc31gKS5yZW1vdmVDbGFzcyhvcHRzLmZvcm1FcnJvckNsYXNzKTtcbiAgICAkZm9ybS5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICQoJzppbnB1dCcsICRmb3JtKS5ub3QoJzpidXR0b24sIDpzdWJtaXQsIDpyZXNldCwgOmhpZGRlbiwgOnJhZGlvLCA6Y2hlY2tib3gsIFtkYXRhLWFiaWRlLWlnbm9yZV0nKS52YWwoJycpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpyYWRpbycsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgJCgnOmlucHV0OmNoZWNrYm94JywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGhhcyBiZWVuIHJlc2V0LlxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtcmVzZXRcbiAgICAgKi9cbiAgICAkZm9ybS50cmlnZ2VyKCdmb3JtcmVzZXQuemYuYWJpZGUnLCBbJGZvcm1dKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogUmVtb3ZlcyBlcnJvciBzdHlsZXMgYW5kIGNsYXNzZXMgZnJvbSBlbGVtZW50cywgd2l0aG91dCByZXNldHRpbmcgdGhlaXIgdmFsdWVzLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJylcbiAgICAgICAgLmNzcygnZGlzcGxheScsICdub25lJyk7XG5cbiAgICB0aGlzLiRpbnB1dHNcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMucmVtb3ZlRXJyb3JDbGFzc2VzKCQodGhpcykpO1xuICAgICAgfSk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuQWJpZGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBldmVudCB0byB2YWxpZGF0ZSBpbnB1dHMuIENoZWNrYm94ZXMgYW5kIHJhZGlvcyB2YWxpZGF0ZSBpbW1lZGlhdGVseS5cbiAgICogUmVtb3ZlIG9yIGNoYW5nZSB0aGlzIHZhbHVlIGZvciBtYW51YWwgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZmllbGRDaGFuZ2UnXG4gICAqL1xuICB2YWxpZGF0ZU9uOiAnZmllbGRDaGFuZ2UnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0IGxhYmVscyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1sYWJlbCdcbiAgICovXG4gIGxhYmVsRXJyb3JDbGFzczogJ2lzLWludmFsaWQtbGFiZWwnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0cyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1pbnB1dCdcbiAgICovXG4gIGlucHV0RXJyb3JDbGFzczogJ2lzLWludmFsaWQtaW5wdXQnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBzZWxlY3RvciB0byB1c2UgdG8gdGFyZ2V0IEZvcm0gRXJyb3JzIGZvciBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJy5mb3JtLWVycm9yJ1xuICAgKi9cbiAgZm9ybUVycm9yU2VsZWN0b3I6ICcuZm9ybS1lcnJvcicsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFkZGVkIHRvIEZvcm0gRXJyb3JzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy12aXNpYmxlJ1xuICAgKi9cbiAgZm9ybUVycm9yQ2xhc3M6ICdpcy12aXNpYmxlJyxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgdGV4dCBpbnB1dHMgb24gYW55IHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbGl2ZVZhbGlkYXRlOiBmYWxzZSxcblxuICBwYXR0ZXJuczoge1xuICAgIGFscGhhIDogL15bYS16QS1aXSskLyxcbiAgICBhbHBoYV9udW1lcmljIDogL15bYS16QS1aMC05XSskLyxcbiAgICBpbnRlZ2VyIDogL15bLStdP1xcZCskLyxcbiAgICBudW1iZXIgOiAvXlstK10/XFxkKig/OltcXC5cXCxdXFxkKyk/JC8sXG5cbiAgICAvLyBhbWV4LCB2aXNhLCBkaW5lcnNcbiAgICBjYXJkIDogL14oPzo0WzAtOV17MTJ9KD86WzAtOV17M30pP3w1WzEtNV1bMC05XXsxNH18Nig/OjAxMXw1WzAtOV1bMC05XSlbMC05XXsxMn18M1s0N11bMC05XXsxM318Myg/OjBbMC01XXxbNjhdWzAtOV0pWzAtOV17MTF9fCg/OjIxMzF8MTgwMHwzNVxcZHszfSlcXGR7MTF9KSQvLFxuICAgIGN2diA6IC9eKFswLTldKXszLDR9JC8sXG5cbiAgICAvLyBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9zdGF0ZXMtb2YtdGhlLXR5cGUtYXR0cmlidXRlLmh0bWwjdmFsaWQtZS1tYWlsLWFkZHJlc3NcbiAgICBlbWFpbCA6IC9eW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKyQvLFxuXG4gICAgdXJsIDogL14oaHR0cHM/fGZ0cHxmaWxlfHNzaCk6XFwvXFwvKCgoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKkApPygoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KCgoW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuPykoOlxcZCopPykoXFwvKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSsoXFwvKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKikqKT8pPyhcXD8oKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KFxcIygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8XFwvfFxcPykqKT8kLyxcbiAgICAvLyBhYmMuZGVcbiAgICBkb21haW4gOiAvXihbYS16QS1aMC05XShbYS16QS1aMC05XFwtXXswLDYxfVthLXpBLVowLTldKT9cXC4pK1thLXpBLVpdezIsOH0kLyxcblxuICAgIGRhdGV0aW1lIDogL14oWzAtMl1bMC05XXszfSlcXC0oWzAtMV1bMC05XSlcXC0oWzAtM11bMC05XSlUKFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pKFp8KFtcXC1cXCtdKFswLTFdWzAtOV0pXFw6MDApKSQvLFxuICAgIC8vIFlZWVktTU0tRERcbiAgICBkYXRlIDogLyg/OjE5fDIwKVswLTldezJ9LSg/Oig/OjBbMS05XXwxWzAtMl0pLSg/OjBbMS05XXwxWzAtOV18MlswLTldKXwoPzooPyEwMikoPzowWzEtOV18MVswLTJdKS0oPzozMCkpfCg/Oig/OjBbMTM1NzhdfDFbMDJdKS0zMSkpJC8sXG4gICAgLy8gSEg6TU06U1NcbiAgICB0aW1lIDogL14oMFswLTldfDFbMC05XXwyWzAtM10pKDpbMC01XVswLTldKXsyfSQvLFxuICAgIGRhdGVJU08gOiAvXlxcZHs0fVtcXC9cXC1dXFxkezEsMn1bXFwvXFwtXVxcZHsxLDJ9JC8sXG4gICAgLy8gTU0vREQvWVlZWVxuICAgIG1vbnRoX2RheV95ZWFyIDogL14oMFsxLTldfDFbMDEyXSlbLSBcXC8uXSgwWzEtOV18WzEyXVswLTldfDNbMDFdKVstIFxcLy5dXFxkezR9JC8sXG4gICAgLy8gREQvTU0vWVlZWVxuICAgIGRheV9tb250aF95ZWFyIDogL14oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXSgwWzEtOV18MVswMTJdKVstIFxcLy5dXFxkezR9JC8sXG5cbiAgICAvLyAjRkZGIG9yICNGRkZGRkZcbiAgICBjb2xvciA6IC9eIz8oW2EtZkEtRjAtOV17Nn18W2EtZkEtRjAtOV17M30pJC9cbiAgfSxcblxuICAvKipcbiAgICogT3B0aW9uYWwgdmFsaWRhdGlvbiBmdW5jdGlvbnMgdG8gYmUgdXNlZC4gYGVxdWFsVG9gIGJlaW5nIHRoZSBvbmx5IGRlZmF1bHQgaW5jbHVkZWQgZnVuY3Rpb24uXG4gICAqIEZ1bmN0aW9ucyBzaG91bGQgcmV0dXJuIG9ubHkgYSBib29sZWFuIGlmIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3QuIEZ1bmN0aW9ucyBhcmUgZ2l2ZW4gdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAqIGVsIDogVGhlIGpRdWVyeSBlbGVtZW50IHRvIHZhbGlkYXRlLlxuICAgKiByZXF1aXJlZCA6IEJvb2xlYW4gdmFsdWUgb2YgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBiZSBwcmVzZW50IG9yIG5vdC5cbiAgICogcGFyZW50IDogVGhlIGRpcmVjdCBwYXJlbnQgb2YgdGhlIGlucHV0LlxuICAgKiBAb3B0aW9uXG4gICAqL1xuICB2YWxpZGF0b3JzOiB7XG4gICAgZXF1YWxUbzogZnVuY3Rpb24gKGVsLCByZXF1aXJlZCwgcGFyZW50KSB7XG4gICAgICByZXR1cm4gJChgIyR7ZWwuYXR0cignZGF0YS1lcXVhbHRvJyl9YCkudmFsKCkgPT09IGVsLnZhbCgpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWJpZGUsICdBYmlkZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hY2NvcmRpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKi9cblxuY2xhc3MgQWNjb3JkaW9uIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFjY29yZGlvbiNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIGEgcGxhaW4gb2JqZWN0IHdpdGggc2V0dGluZ3MgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdBY2NvcmRpb24nLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBieSBhbmltYXRpbmcgdGhlIHByZXNldCBhY3RpdmUgcGFuZShzKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cigncm9sZScsICd0YWJsaXN0Jyk7XG4gICAgdGhpcy4kdGFicyA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJ2xpLCBbZGF0YS1hY2NvcmRpb24taXRlbV0nKTtcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbihpZHgsIGVsKSB7XG4gICAgICB2YXIgJGVsID0gJChlbCksXG4gICAgICAgICAgJGNvbnRlbnQgPSAkZWwuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpLFxuICAgICAgICAgIGlkID0gJGNvbnRlbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjb3JkaW9uJyksXG4gICAgICAgICAgbGlua0lkID0gZWwuaWQgfHwgYCR7aWR9LWxhYmVsYDtcblxuICAgICAgJGVsLmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2lkJzogbGlua0lkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgJGNvbnRlbnQuYXR0cih7J3JvbGUnOiAndGFicGFuZWwnLCAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLCAnYXJpYS1oaWRkZW4nOiB0cnVlLCAnaWQnOiBpZH0pO1xuICAgIH0pO1xuICAgIHZhciAkaW5pdEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICBpZigkaW5pdEFjdGl2ZS5sZW5ndGgpe1xuICAgICAgdGhpcy5kb3duKCRpbml0QWN0aXZlLCB0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBhY2NvcmRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpO1xuICAgICAgdmFyICR0YWJDb250ZW50ID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCR0YWJDb250ZW50Lmxlbmd0aCkge1xuICAgICAgICAkZWxlbS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uIGtleWRvd24uemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyAkKHRoaXMpLmNoaWxkcmVuKCdhJykub24oJ2NsaWNrLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaWYgKCRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCB8fCAkZWxlbS5zaWJsaW5ncygpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSl7XG4gICAgICAgICAgICAgIF90aGlzLnVwKCR0YWJDb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YWJDb250ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb24nLCB7XG4gICAgICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy50b2dnbGUoJHRhYkNvbnRlbnQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5uZXh0KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLnByZXYoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHNlbGVjdGVkIGNvbnRlbnQgcGFuZSdzIG9wZW4vY2xvc2Ugc3RhdGUuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0galF1ZXJ5IG9iamVjdCBvZiB0aGUgcGFuZSB0byB0b2dnbGUuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpIHtcbiAgICBpZigkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgaWYodGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkIHx8ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpe1xuICAgICAgICB0aGlzLnVwKCR0YXJnZXQpO1xuICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHBhbmUgdG8gb3Blbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBmaXJzdFRpbWUgLSBmbGFnIHRvIGRldGVybWluZSBpZiByZWZsb3cgc2hvdWxkIGhhcHBlbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkb3duXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZG93bigkdGFyZ2V0LCBmaXJzdFRpbWUpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCAmJiAhZmlyc3RUaW1lKSB7XG4gICAgICB2YXIgJGN1cnJlbnRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYoJGN1cnJlbnRBY3RpdmUubGVuZ3RoKXtcbiAgICAgICAgdGhpcy51cCgkY3VycmVudEFjdGl2ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHRhcmdldFxuICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpXG4gICAgICAucGFyZW50KCdbZGF0YS10YWItY29udGVudF0nKVxuICAgICAgLmFkZEJhY2soKVxuICAgICAgLnBhcmVudCgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICR0YXJnZXQuc2xpZGVEb3duKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAoKSA9PiB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI2Rvd25cbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdkb3duLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgfSk7XG5cbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiB0cnVlLFxuICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiB0cnVlXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHRhYiB0byBjbG9zZS5cbiAgICogQGZpcmVzIEFjY29yZGlvbiN1cFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgJGF1bnRzID0gJHRhcmdldC5wYXJlbnQoKS5zaWJsaW5ncygpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIGNhbkNsb3NlID0gdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kID8gJGF1bnRzLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSA6ICR0YXJnZXQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCAmJiAhY2FuQ2xvc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCl7XG4gICAgICAkdGFyZ2V0LnNsaWRlVXAoX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB0YWIgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb24nLCBbJHRhcmdldF0pO1xuICAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAkdGFyZ2V0LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSlcbiAgICAgICAgICAgLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICdhcmlhLXNlbGVjdGVkJzogZmFsc2VcbiAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkZXN0cm95ZWRcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdGFiLWNvbnRlbnRdJykuc3RvcCh0cnVlKS5zbGlkZVVwKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJy56Zi5hY2NvcmRpb24nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBhbmltYXRlIHRoZSBvcGVuaW5nIG9mIGFuIGFjY29yZGlvbiBwYW5lLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpRXhwYW5kOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gY2xvc2UgYWxsIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbGxvd0FsbENsb3NlZDogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb24sICdBY2NvcmRpb24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBBY2NvcmRpb25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZUFsbCcsXG4gICAgICAnVEFCJzogJ2Rvd24nLFxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBtZW51IGJ5IGhpZGluZyBhbGwgbmVzdGVkIG1lbnVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLm5vdCgnLmlzLWFjdGl2ZScpLnNsaWRlVXAoMCk7Ly8uZmluZCgnYScpLmNzcygncGFkZGluZy1sZWZ0JywgJzFyZW0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndGFibGlzdCcsXG4gICAgICAnYXJpYS1tdWx0aXNlbGVjdGFibGUnOiB0aGlzLm9wdGlvbnMubXVsdGlPcGVuXG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZW51TGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpbmtJZCA9IHRoaXMuaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUtbGluaycpLFxuICAgICAgICAgICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXG4gICAgICAgICAgc3ViSWQgPSAkc3ViWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51JyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkc3ViLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRlbGVtLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IHN1YklkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnaWQnOiBsaW5rSWRcbiAgICAgIH0pO1xuICAgICAgJHN1Yi5hdHRyKHtcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZCxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdpZCc6IHN1YklkXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgaW5pdFBhbmVzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJyk7XG4gICAgaWYoaW5pdFBhbmVzLmxlbmd0aCl7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgaW5pdFBhbmVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgX3RoaXMuZG93bigkKHRoaXMpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkc3VibWVudSA9ICQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG5cbiAgICAgIGlmICgkc3VibWVudS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpLm9uKCdjbGljay56Zi5hY2NvcmRpb25NZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIF90aGlzLnRvZ2dsZSgkc3VibWVudSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbm1lbnUnLCBmdW5jdGlvbihlKXtcbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQsXG4gICAgICAgICAgJHRhcmdldCA9ICRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcblxuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5maW5kKCdsaTpmaXJzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmZpcnN0LWNoaWxkJykpIHsgLy8gaXMgZmlyc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHByZXZFbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGlmIHByZXZpb3VzIGVsZW1lbnQgaGFzIG9wZW4gc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRwcmV2RWxlbWVudC5maW5kKCdsaTpsYXN0LWNoaWxkJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6bGFzdC1jaGlsZCcpKSB7IC8vIGlzIGxhc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLm5leHQoJ2xpJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb25NZW51Jywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgICAgICAgJHRhcmdldC5maW5kKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxuICAgICAgICAgICAgX3RoaXMudXAoJHRhcmdldCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7IC8vIGNsb3NlIGN1cnJlbnRseSBvcGVuIHN1YlxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy50b2dnbGUoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGVBbGwoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSB0aGUgc3VibWVudSB0byB0b2dnbGVcbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KXtcbiAgICBpZighJHRhcmdldC5pcygnOmFuaW1hdGVkJykpIHtcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gb3Blbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxuICAgKi9cbiAgZG93bigkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMubXVsdGlPcGVuKSB7XG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG5cbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHRhcmdldC5zbGlkZURvd24oX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjZG93blxuICAgICAgICAgICAqL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICAgIH0pO1xuICAgICAgLy99KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I3VwXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvL30pO1xuXG4gICAgdmFyICRtZW51cyA9ICR0YXJnZXQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKDApLmFkZEJhY2soKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVEb3duKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIG11bHRpT3BlbjogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbk1lbnUsICdBY2NvcmRpb25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcmlsbGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIERyaWxsZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJpbGxkb3duIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbiBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyaWxsZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJpbGxkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJpbGxkb3duJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ2Rvd24nLFxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgZHJpbGxkb3duIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucyBvZiBlbGVtZW50c1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCdhJyk7XG4gICAgdGhpcy4kc3VibWVudXMgPSB0aGlzLiRzdWJtZW51QW5jaG9ycy5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG4gICAgdGhpcy4kbWVudUl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLm5vdCgnLmpzLWRyaWxsZG93bi1iYWNrJykuYXR0cigncm9sZScsICdtZW51aXRlbScpLmZpbmQoJ2EnKTtcblxuICAgIHRoaXMuX3ByZXBhcmVNZW51KCk7XG5cbiAgICB0aGlzLl9rZXlib2FyZEV2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIHByZXBhcmVzIGRyaWxsZG93biBtZW51IGJ5IHNldHRpbmcgYXR0cmlidXRlcyB0byBsaW5rcyBhbmQgZWxlbWVudHNcbiAgICogc2V0cyBhIG1pbiBoZWlnaHQgdG8gcHJldmVudCBjb250ZW50IGp1bXBpbmdcbiAgICogd3JhcHMgdGhlIGVsZW1lbnQgaWYgbm90IGFscmVhZHkgd3JhcHBlZFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9wcmVwYXJlTWVudSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vIGlmKCF0aGlzLm9wdGlvbnMuaG9sZE9wZW4pe1xuICAgIC8vICAgdGhpcy5fbWVudUxpbmtFdmVudHMoKTtcbiAgICAvLyB9XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRsaW5rID0gJCh0aGlzKTtcbiAgICAgIHZhciAkc3ViID0gJGxpbmsucGFyZW50KCk7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLnBhcmVudExpbmspe1xuICAgICAgICAkbGluay5jbG9uZSgpLnByZXBlbmRUbygkc3ViLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpKS53cmFwKCc8bGkgY2xhc3M9XCJpcy1zdWJtZW51LXBhcmVudC1pdGVtIGlzLXN1Ym1lbnUtaXRlbSBpcy1kcmlsbGRvd24tc3VibWVudS1pdGVtXCIgcm9sZT1cIm1lbnUtaXRlbVwiPjwvbGk+Jyk7XG4gICAgICB9XG4gICAgICAkbGluay5kYXRhKCdzYXZlZEhyZWYnLCAkbGluay5hdHRyKCdocmVmJykpLnJlbW92ZUF0dHIoJ2hyZWYnKTtcbiAgICAgICRsaW5rLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IDAsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cygkbGluayk7XG4gICAgfSk7XG4gICAgdGhpcy4kc3VibWVudXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRtZW51ID0gJCh0aGlzKSxcbiAgICAgICAgICAkYmFjayA9ICRtZW51LmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaycpO1xuICAgICAgaWYoISRiYWNrLmxlbmd0aCl7XG4gICAgICAgICRtZW51LnByZXBlbmQoX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uKTtcbiAgICAgIH1cbiAgICAgIF90aGlzLl9iYWNrKCRtZW51KTtcbiAgICB9KTtcbiAgICBpZighdGhpcy4kZWxlbWVudC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtZHJpbGxkb3duJykpe1xuICAgICAgdGhpcy4kd3JhcHBlciA9ICQodGhpcy5vcHRpb25zLndyYXBwZXIpLmFkZENsYXNzKCdpcy1kcmlsbGRvd24nKTtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LndyYXAodGhpcy4kd3JhcHBlcikucGFyZW50KCkuY3NzKHRoaXMuX2dldE1heERpbXMoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gZWxlbWVudHMgaW4gdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBtZW51IGl0ZW0gdG8gYWRkIGhhbmRsZXJzIHRvLlxuICAgKi9cbiAgX2V2ZW50cygkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKCQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCAnbGknKS5oYXNDbGFzcygnaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50Jykpe1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQuZmlyc3RFbGVtZW50Q2hpbGQpe1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyB9XG4gICAgICBfdGhpcy5fc2hvdygkZWxlbS5wYXJlbnQoJ2xpJykpO1xuXG4gICAgICBpZihfdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayl7XG4gICAgICAgIHZhciAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICAgICAgJGJvZHkub2ZmKCcuemYuZHJpbGxkb3duJykub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgdG8gYGxpYCdzIGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tleWJvYXJkRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMuYWRkKHRoaXMuJGVsZW1lbnQuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrID4gYScpKS5vbigna2V5ZG93bi56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcblxuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcbiAgICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLmNoaWxkcmVuKCdhJyksXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAgICRuZXh0RWxlbWVudDtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0RyaWxsZG93bicsIHtcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRlbGVtZW50LmlzKF90aGlzLiRzdWJtZW51QW5jaG9ycykpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5maW5kKCd1bCBsaSBhJykuZmlsdGVyKF90aGlzLiRtZW51SXRlbXMpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKSk7XG4gICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpLmNoaWxkcmVuKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5fYmFjaygpO1xuICAgICAgICAgIC8vX3RoaXMuJG1lbnVJdGVtcy5maXJzdCgpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCEkZWxlbWVudC5pcyhfdGhpcy4kbWVudUl0ZW1zKSkgeyAvLyBub3QgbWVudSBpdGVtIG1lYW5zIGJhY2sgYnV0dG9uXG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbWVudC5wYXJlbnQoJ2xpJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIG9wZW4gZWxlbWVudHMsIGFuZCByZXR1cm5zIHRvIHJvb3QgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXG4gICAqL1xuICBfaGlkZUFsbCgpIHtcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xuICAgICRlbGVtLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbihlKXtcbiAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xuICAgIH0pO1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBmdWxseSBjbG9zZWQuXG4gICAgICAgICAqIEBldmVudCBEcmlsbGRvd24jY2xvc2VkXG4gICAgICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLmRyaWxsZG93bicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgZm9yIGVhY2ggYGJhY2tgIGJ1dHRvbiwgYW5kIGNsb3NlcyBvcGVuIG1lbnVzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNiYWNrXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGFkZCBgYmFja2AgZXZlbnQuXG4gICAqL1xuICBfYmFjaygkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKTtcbiAgICAkZWxlbS5jaGlsZHJlbignLmpzLWRyaWxsZG93bi1iYWNrJylcbiAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdtb3VzZXVwIG9uIGJhY2snKTtcbiAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciB0byBtZW51IGl0ZW1zIHcvbyBzdWJtZW51cyB0byBjbG9zZSBvcGVuIG1lbnVzIG9uIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tZW51TGlua0V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJG1lbnVJdGVtcy5ub3QoJy5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKVxuICAgICAgICAub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgICAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIC8vIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgc3VibWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jb3BlblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIG9wZW4sIGkuZS4gdGhlIGBsaWAgdGFnLlxuICAgKi9cbiAgX3Nob3coJGVsZW0pIHtcbiAgICAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgb3BlbmVkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcbiAgfTtcblxuICAvKipcbiAgICogSGlkZXMgYSBzdWJtZW51XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2hpZGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gaGlkZSwgaS5lLiB0aGUgYHVsYCB0YWcuXG4gICAqL1xuICBfaGlkZSgkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0uYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpO1xuICAgICAgICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgY2xvc2VkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jaGlkZVxuICAgICAqL1xuICAgICRlbGVtLnRyaWdnZXIoJ2hpZGUuemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgdGhyb3VnaCB0aGUgbmVzdGVkIG1lbnVzIHRvIGNhbGN1bGF0ZSB0aGUgbWluLWhlaWdodCwgYW5kIG1heC13aWR0aCBmb3IgdGhlIG1lbnUuXG4gICAqIFByZXZlbnRzIGNvbnRlbnQganVtcGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0TWF4RGltcygpIHtcbiAgICB2YXIgbWF4ID0gMCwgcmVzdWx0ID0ge307XG4gICAgdGhpcy4kc3VibWVudXMuYWRkKHRoaXMuJGVsZW1lbnQpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciBudW1PZkVsZW1zID0gJCh0aGlzKS5jaGlsZHJlbignbGknKS5sZW5ndGg7XG4gICAgICBtYXggPSBudW1PZkVsZW1zID4gbWF4ID8gbnVtT2ZFbGVtcyA6IG1heDtcbiAgICB9KTtcblxuICAgIHJlc3VsdFsnbWluLWhlaWdodCddID0gYCR7bWF4ICogdGhpcy4kbWVudUl0ZW1zWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodH1weGA7XG4gICAgcmVzdWx0WydtYXgtd2lkdGgnXSA9IGAke3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGh9cHhgO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgRHJpbGxkb3duIE1lbnVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX2hpZGVBbGwoKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG4gICAgdGhpcy4kZWxlbWVudC51bndyYXAoKVxuICAgICAgICAgICAgICAgICAuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbScpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCcuaXMtYWN0aXZlLCAuaXMtY2xvc2luZywgLmlzLWRyaWxsZG93bi1zdWJtZW51JykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nIGlzLWRyaWxsZG93bi1zdWJtZW51JylcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gdGFiaW5kZXggcm9sZScpO1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XG4gICAgICBpZigkbGluay5kYXRhKCdzYXZlZEhyZWYnKSl7XG4gICAgICAgICRsaW5rLmF0dHIoJ2hyZWYnLCAkbGluay5kYXRhKCdzYXZlZEhyZWYnKSkucmVtb3ZlRGF0YSgnc2F2ZWRIcmVmJyk7XG4gICAgICB9ZWxzZXsgcmV0dXJuOyB9XG4gICAgfSk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5EcmlsbGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCBmb3IgSlMgZ2VuZXJhdGVkIGJhY2sgYnV0dG9uLiBQcmVwZW5kZWQgdG8gc3VibWVudSBsaXN0cyBhbmQgZGVsZXRlZCBvbiBgZGVzdHJveWAgbWV0aG9kLCAnanMtZHJpbGxkb3duLWJhY2snIGNsYXNzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcbGk+PFxcYT5CYWNrPFxcL2E+PFxcL2xpPidcbiAgICovXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxuICAvKipcbiAgICogTWFya3VwIHVzZWQgdG8gd3JhcCBkcmlsbGRvd24gbWVudS4gVXNlIGEgY2xhc3MgbmFtZSBmb3IgaW5kZXBlbmRlbnQgc3R5bGluZzsgdGhlIEpTIGFwcGxpZWQgY2xhc3M6IGBpcy1kcmlsbGRvd25gIGlzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcZGl2IGNsYXNzPVwiaXMtZHJpbGxkb3duXCI+PFxcL2Rpdj4nXG4gICAqL1xuICB3cmFwcGVyOiAnPGRpdj48L2Rpdj4nLFxuICAvKipcbiAgICogQWRkcyB0aGUgcGFyZW50IGxpbmsgdG8gdGhlIHN1Ym1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHBhcmVudExpbms6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gcmV0dXJuIHRvIHJvb3QgbGlzdCBvbiBib2R5IGNsaWNrLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG4gIC8vIGhvbGRPcGVuOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyaWxsZG93biwgJ0RyaWxsZG93bicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJvcGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIERyb3Bkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcm9wZG93bi5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93bi5cbiAgICogICAgICAgIE9iamVjdCBzaG91bGQgYmUgb2YgdGhlIGRyb3Bkb3duIHBhbmVsLCByYXRoZXIgdGhhbiBpdHMgYW5jaG9yLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyb3Bkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICd0YWJfZm9yd2FyZCcsXG4gICAgICAnU0hJRlRfVEFCJzogJ3RhYl9iYWNrd2FyZCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IHNldHRpbmcvY2hlY2tpbmcgb3B0aW9ucyBhbmQgYXR0cmlidXRlcywgYWRkaW5nIGhlbHBlciB2YXJpYWJsZXMsIGFuZCBzYXZpbmcgdGhlIGFuY2hvci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgJGlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtdG9nZ2xlPVwiJHskaWR9XCJdYCkgfHwgJChgW2RhdGEtb3Blbj1cIiR7JGlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogJGlkLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZVxuXG4gICAgfSk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6ICd0cnVlJyxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2RhdGEtcmVzaXplJzogJGlkLFxuICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IHRoaXMuJGFuY2hvclswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdkZC1hbmNob3InKVxuICAgIH0pO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBkZXRlcm1pbmUgY3VycmVudCBvcmllbnRhdGlvbiBvZiBkcm9wZG93biBwYW5lLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHJldHVybnMge1N0cmluZ30gcG9zaXRpb24gLSBzdHJpbmcgdmFsdWUgb2YgYSBwb3NpdGlvbiBjbGFzcy5cbiAgICovXG4gIGdldFBvc2l0aW9uQ2xhc3MoKSB7XG4gICAgdmFyIHZlcnRpY2FsUG9zaXRpb24gPSB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHRvcHxsZWZ0fHJpZ2h0fGJvdHRvbSkvZyk7XG4gICAgICAgIHZlcnRpY2FsUG9zaXRpb24gPSB2ZXJ0aWNhbFBvc2l0aW9uID8gdmVydGljYWxQb3NpdGlvblswXSA6ICcnO1xuICAgIHZhciBob3Jpem9udGFsUG9zaXRpb24gPSAvZmxvYXQtKFxcUyspXFxzLy5leGVjKHRoaXMuJGFuY2hvclswXS5jbGFzc05hbWUpO1xuICAgICAgICBob3Jpem9udGFsUG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb25bMV0gOiAnJztcbiAgICB2YXIgcG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb24gKyAnICcgKyB2ZXJ0aWNhbFBvc2l0aW9uIDogdmVydGljYWxQb3NpdGlvbjtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cblxuXG4gICAgaWYoKCRlbGVEaW1zLndpZHRoID49ICRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMuJGVsZW1lbnQpKSl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMuJGVsZW1lbnQsIHRoaXMuJGFuY2hvciwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCBmYWxzZSwgdHJ1ZSkgJiYgdGhpcy5jb3VudGVyKXtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIGVsZW1lbnQgdXRpbGl6aW5nIHRoZSB0cmlnZ2VycyB1dGlsaXR5IGxpYnJhcnkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9zZXRQb3NpdGlvbi5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXIpe1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgIH0pO1xuICAgICAgaWYodGhpcy5vcHRpb25zLmhvdmVyUGFuZSl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duIG1vdXNlbGVhdmUuemYuZHJvcGRvd24nKVxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuJGFuY2hvci5hZGQodGhpcy4kZWxlbWVudCkub24oJ2tleWRvd24uemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKSB7XG5cbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKSxcbiAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duJywge1xuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgtMSkpKSB7IC8vIGxlZnQgbW9kYWwgZG93bndhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLnRyYXBGb2N1cykgeyAvLyBpZiBmb2N1cyBzaGFsbCBiZSB0cmFwcGVkXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpZiBmb2N1cyBpcyBub3QgdHJhcHBlZCwgY2xvc2UgZHJvcGRvd24gb24gZm9jdXMgb3V0XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyh2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoMCkpIHx8IF90aGlzLiRlbGVtZW50LmlzKCc6Zm9jdXMnKSkgeyAvLyBsZWZ0IG1vZGFsIHVwd2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gbGFzdCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxuICAgICAgICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGlmIGZvY3VzIGlzIG5vdCB0cmFwcGVkLCBjbG9zZSBkcm9wZG93biBvbiBmb2N1cyBvdXRcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBvbmNlIHRoZSBkcm9wZG93biBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93biNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9wZW4gZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNoaWRlXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZighdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XG5cbiAgICB0aGlzLiRhbmNob3IucmVtb3ZlQ2xhc3MoJ2hvdmVyJylcbiAgICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG5cbiAgICBpZih0aGlzLmNsYXNzQ2hhbmdlZCl7XG4gICAgICB2YXIgY3VyUG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgICAgaWYoY3VyUG9zaXRpb25DbGFzcyl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoY3VyUG9zaXRpb25DbGFzcyk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzKVxuICAgICAgICAgIC8qLmhpZGUoKSovLmNzcyh7aGVpZ2h0OiAnJywgd2lkdGg6ICcnfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICAgIHRoaXMudXNlZFBvc2l0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGRyb3Bkb3duIHBhbmUncyB2aXNpYmlsaXR5LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpe1xuICAgICAgaWYodGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJykpIHJldHVybjtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgZHJvcGRvd24uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXInKS5oaWRlKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmLmRyb3Bkb3duJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuRHJvcGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHN1Ym1lbnVzIHRvIG9wZW4gb24gaG92ZXIgZXZlbnRzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgaG92ZXJQYW5lOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIHZPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIGJldHdlZW4gdGhlIGRyb3Bkb3duIHBhbmUgYW5kIHRoZSB0cmlnZ2VyaW5nIGVsZW1lbnQgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBoT2Zmc2V0OiAxLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBhZGp1c3Qgb3BlbiBwb3NpdGlvbi4gSlMgd2lsbCB0ZXN0IGFuZCBmaWxsIHRoaXMgaW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byB0cmFwIGZvY3VzIHRvIHRoZSBkcm9wZG93biBwYW5lIGlmIG9wZW5lZCB3aXRoIGtleWJvYXJkIGNvbW1hbmRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkgdG8gY2xvc2UgdGhlIGRyb3Bkb3duLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGVsZW1lbnRzIHdpdGhpbiB0aGUgbWVudVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHwgKHR5cGVvZiB3aW5kb3cub250b3VjaHN0YXJ0ICE9PSAndW5kZWZpbmVkJyksXG4gICAgICAgIHBhckNsYXNzID0gJ2lzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JztcblxuICAgIC8vIHVzZWQgZm9yIG9uQ2xpY2sgYW5kIGluIHRoZSBrZXlib2FyZCBoYW5kbGVyc1xuICAgIHZhciBoYW5kbGVDbGlja0ZuID0gZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsIGAuJHtwYXJDbGFzc31gKSxcbiAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyksXG4gICAgICAgICAgaGFzQ2xpY2tlZCA9ICRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKTtcblxuICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICBpZiAoaGFzQ2xpY2tlZCkge1xuICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgfHwgKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbiAmJiAhaGFzVG91Y2gpIHx8IChfdGhpcy5vcHRpb25zLmZvcmNlRm9sbG93ICYmIGhhc1RvdWNoKSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuIHx8IGhhc1RvdWNoKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcblxuICAgICAgICBpZiAoaGFzU3ViKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5jbG9zaW5nVGltZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdbcm9sZT1cIm1lbnVpdGVtXCJdJyksXG4gICAgICAgICAgaXNUYWIgPSBfdGhpcy4kdGFicy5pbmRleCgkZWxlbWVudCkgPiAtMSxcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISRlbGVtZW50LmlzKCc6bGFzdC1jaGlsZCcpKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHByZXZTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sIG9wZW5TdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xuICAgICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL2lmICgkZWxlbWVudC5pcygnOmZpcnN0LWNoaWxkJykpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKTtcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBfdGhpcy5faGlkZShjbG9zZSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy99XG4gICAgICB9O1xuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICAgICAgb3Blbjogb3BlblN1YixcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoaXNUYWIpIHtcbiAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50Lmhhc0NsYXNzKF90aGlzLm9wdGlvbnMudmVydGljYWxDbGFzcykpIHsgLy8gdmVydGljYWwgbWVudVxuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnKSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogb3BlblN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBob3Jpem9udGFsIG1lbnVcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgcHJldmlvdXM6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgZG93bjogb3BlblN1YixcbiAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXG4gICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnKSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YixcbiAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd25NZW51JywgZnVuY3Rpb25zKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXG4gICAgICAgICAub24oJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgdmFyICRsaW5rID0gX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCk7XG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgZHJvcGRvd24gcGFuZSwgYW5kIGNoZWNrcyBmb3IgY29sbGlzaW9ucyBmaXJzdC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xuICAgKi9cbiAgX3Nob3coJHN1Yikge1xuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICByZXR1cm4gJChlbCkuZmluZCgkc3ViKS5sZW5ndGggPiAwO1xuICAgIH0pKTtcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLl9oaWRlKCRzaWJzLCBpZHgpO1xuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLmFkZENsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAgIC5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcbiAgICB2YXIgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgIGlmICghY2xlYXIpIHtcbiAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICctcmlnaHQnIDogJy1sZWZ0JyxcbiAgICAgICAgICAkcGFyZW50TGkgPSAkc3ViLnBhcmVudCgnLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xuICAgICAgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgICAgaWYgKCFjbGVhcikge1xuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJycpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBuZXcgZHJvcGRvd24gcGFuZSBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bm1lbnUnLCBbJHN1Yl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc2luZ2xlLCBjdXJyZW50bHkgb3BlbiBkcm9wZG93biBwYW5lLCBpZiBwYXNzZWQgYSBwYXJhbWV0ZXIsIG90aGVyd2lzZSwgaGlkZXMgZXZlcnl0aGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gaGlkZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlICR0YWJzIGNvbGxlY3Rpb24gdG8gaGlkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hpZGUoJGVsZW0sIGlkeCkge1xuICAgIHZhciAkdG9DbG9zZTtcbiAgICBpZiAoJGVsZW0gJiYgJGVsZW0ubGVuZ3RoKSB7XG4gICAgICAkdG9DbG9zZSA9ICRlbGVtO1xuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kdGFicy5ub3QoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgcmV0dXJuIGkgPT09IGlkeDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcbiAgICB9XG4gICAgdmFyIHNvbWV0aGluZ1RvQ2xvc2UgPSAkdG9DbG9zZS5oYXNDbGFzcygnaXMtYWN0aXZlJykgfHwgJHRvQ2xvc2UuZmluZCgnLmlzLWFjdGl2ZScpLmxlbmd0aCA+IDA7XG5cbiAgICBpZiAoc29tZXRoaW5nVG9DbG9zZSkge1xuICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtYWN0aXZlJykuYWRkKCR0b0Nsb3NlKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgJ2RhdGEtaXMtY2xpY2snOiBmYWxzZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAkdG9DbG9zZS5maW5kKCd1bC5qcy1kcm9wZG93bi1hY3RpdmUnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2pzLWRyb3Bkb3duLWFjdGl2ZScpO1xuXG4gICAgICBpZiAodGhpcy5jaGFuZ2VkIHx8ICR0b0Nsb3NlLmZpbmQoJ29wZW5zLWlubmVyJykubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICdyaWdodCcgOiAnbGVmdCc7XG4gICAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkKCR0b0Nsb3NlKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgb3BlbnMtaW5uZXIgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGBvcGVucy0ke29sZENsYXNzfWApO1xuICAgICAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb3BlbiBtZW51cyBhcmUgY2xvc2VkLlxuICAgICAgICogQGV2ZW50IERyb3Bkb3duTWVudSNoaWRlXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi5kcm9wZG93bm1lbnUnLCBbJHRvQ2xvc2VdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIHBsdWdpbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJG1lbnVJdGVtcy5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKS5yZW1vdmVBdHRyKCdkYXRhLWlzLWNsaWNrJylcbiAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1yaWdodC1hcnJvdyBpcy1sZWZ0LWFycm93IGlzLWRvd24tYXJyb3cgb3BlbnMtcmlnaHQgb3BlbnMtbGVmdCBvcGVucy1pbm5lcicpO1xuICAgICQoZG9jdW1lbnQuYm9keSkub2ZmKCcuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkRyb3Bkb3duTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIERpc2FsbG93cyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHN1Ym1lbnVzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gYXV0b21hdGljYWxseSBjbG9zZSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQsIGlmIG5vdCBjbGlja2VkIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b2Nsb3NlOiB0cnVlLFxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgb3BlbmluZyBhIHN1Ym1lbnUgb24gaG92ZXIgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDUwLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIG9wZW4vcmVtYWluIG9wZW4gb24gcGFyZW50IGNsaWNrIGV2ZW50LiBBbGxvd3MgY3Vyc29yIHRvIG1vdmUgYXdheSBmcm9tIG1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IGNsb3NpbmcgYSBzdWJtZW51IG9uIGEgbW91c2VsZWF2ZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG5cbiAgY2xvc2luZ1RpbWU6IDUwMCxcbiAgLyoqXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbGVmdCdcbiAgICovXG4gIGFsaWdubWVudDogJ2xlZnQnLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndmVydGljYWwnXG4gICAqL1xuICB2ZXJ0aWNhbENsYXNzOiAndmVydGljYWwnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2FsaWduLXJpZ2h0J1xuICAgKi9cbiAgcmlnaHRDbGFzczogJ2FsaWduLXJpZ2h0JyxcbiAgLyoqXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZvcmNlRm9sbG93OiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd25NZW51LCAnRHJvcGRvd25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBFcXVhbGl6ZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmVxdWFsaXplclxuICovXG5cbmNsYXNzIEVxdWFsaXplciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEVxdWFsaXplciBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcbiAgICB2YXIgJHdhdGNoZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsaXplci13YXRjaD1cIiR7ZXFJZH1cIl1gKTtcblxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1yZXNpemUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQucGFyZW50c1VudGlsKGRvY3VtZW50LmJvZHksICdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcbiAgICAgIG9uUmVzaXplTWVCb3VuZDogdGhpcy5fb25SZXNpemVNZS5iaW5kKHRoaXMpLFxuICAgICAgb25Qb3N0RXF1YWxpemVkQm91bmQ6IHRoaXMuX29uUG9zdEVxdWFsaXplZC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHZhciBpbWdzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICB2YXIgdG9vU21hbGw7XG4gICAgaWYodGhpcy5vcHRpb25zLmVxdWFsaXplT24pe1xuICAgICAgdG9vU21hbGwgPSB0aGlzLl9jaGVja01RKCk7XG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICB9XG4gICAgaWYoKHRvb1NtYWxsICE9PSB1bmRlZmluZWQgJiYgdG9vU21hbGwgPT09IGZhbHNlKSB8fCB0b29TbWFsbCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGlmKGltZ3MubGVuZ3RoKXtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fcmVmbG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzIGlmIHRoZSBicmVha3BvaW50IGlzIHRvbyBzbWFsbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXVzZUV2ZW50cygpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZih7XG4gICAgICAnLnpmLmVxdWFsaXplcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHJlc2l6ZW1lLnpmLnRyaWdnZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25SZXNpemVNZShlKSB7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyBwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUG9zdEVxdWFsaXplZChlKSB7XG4gICAgaWYoZS50YXJnZXQgIT09IHRoaXMuJGVsZW1lbnRbMF0peyB0aGlzLl9yZWZsb3coKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcbiAgICB9XG4gICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTVEoKSB7XG4gICAgdmFyIHRvb1NtYWxsID0gIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uKTtcbiAgICBpZih0b29TbWFsbCl7XG4gICAgICBpZih0aGlzLmlzT24pe1xuICAgICAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIGlmKCF0aGlzLmlzT24pe1xuICAgICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRvb1NtYWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgbm9vcCB2ZXJzaW9uIGZvciB0aGUgcGx1Z2luXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2lsbHN3aXRjaCgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgRXF1YWxpemVyIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICBpZighdGhpcy5vcHRpb25zLmVxdWFsaXplT25TdGFjayl7XG4gICAgICBpZih0aGlzLl9pc1N0YWNrZWQoKSl7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZXF1YWxpemVCeVJvdykge1xuICAgICAgdGhpcy5nZXRIZWlnaHRzQnlSb3codGhpcy5hcHBseUhlaWdodEJ5Um93LmJpbmQodGhpcykpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5nZXRIZWlnaHRzKHRoaXMuYXBwbHlIZWlnaHQuYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hbnVhbGx5IGRldGVybWluZXMgaWYgdGhlIGZpcnN0IDIgZWxlbWVudHMgYXJlICpOT1QqIHN0YWNrZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaXNTdGFja2VkKCkge1xuICAgIHJldHVybiB0aGlzLiR3YXRjaGVkWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCAhPT0gdGhpcy4kd2F0Y2hlZFsxXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICovXG4gIGdldEhlaWdodHMoY2IpIHtcbiAgICB2YXIgaGVpZ2h0cyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHRoaXMuJHdhdGNoZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspe1xuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICBoZWlnaHRzLnB1c2godGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHQpO1xuICAgIH1cbiAgICBjYihoZWlnaHRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqL1xuICBnZXRIZWlnaHRzQnlSb3coY2IpIHtcbiAgICB2YXIgbGFzdEVsVG9wT2Zmc2V0ID0gKHRoaXMuJHdhdGNoZWQubGVuZ3RoID8gdGhpcy4kd2F0Y2hlZC5maXJzdCgpLm9mZnNldCgpLnRvcCA6IDApLFxuICAgICAgICBncm91cHMgPSBbXSxcbiAgICAgICAgZ3JvdXAgPSAwO1xuICAgIC8vZ3JvdXAgYnkgUm93XG4gICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHRoaXMuJHdhdGNoZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspe1xuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAvL21heWJlIGNvdWxkIHVzZSB0aGlzLiR3YXRjaGVkW2ldLm9mZnNldFRvcFxuICAgICAgdmFyIGVsT2Zmc2V0VG9wID0gJCh0aGlzLiR3YXRjaGVkW2ldKS5vZmZzZXQoKS50b3A7XG4gICAgICBpZiAoZWxPZmZzZXRUb3AhPWxhc3RFbFRvcE9mZnNldCkge1xuICAgICAgICBncm91cCsrO1xuICAgICAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgICAgIGxhc3RFbFRvcE9mZnNldD1lbE9mZnNldFRvcDtcbiAgICAgIH1cbiAgICAgIGdyb3Vwc1tncm91cF0ucHVzaChbdGhpcy4kd2F0Y2hlZFtpXSx0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodF0pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwLCBsbiA9IGdyb3Vwcy5sZW5ndGg7IGogPCBsbjsgaisrKSB7XG4gICAgICB2YXIgaGVpZ2h0cyA9ICQoZ3JvdXBzW2pdKS5tYXAoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXNbMV07IH0pLmdldCgpO1xuICAgICAgdmFyIG1heCAgICAgICAgID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgICBncm91cHNbal0ucHVzaChtYXgpO1xuICAgIH1cbiAgICBjYihncm91cHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0XG4gICAqIEBwYXJhbSB7YXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHQoaGVpZ2h0cykge1xuICAgIHZhciBtYXggPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuXG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsIG1heCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdCBieSByb3dcbiAgICogQHBhcmFtIHthcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRSb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodEJ5Um93KGdyb3Vwcykge1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBncm91cHMubGVuZ3RoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICB2YXIgZ3JvdXBzSUxlbmd0aCA9IGdyb3Vwc1tpXS5sZW5ndGgsXG4gICAgICAgICAgbWF4ID0gZ3JvdXBzW2ldW2dyb3Vwc0lMZW5ndGggLSAxXTtcbiAgICAgIGlmIChncm91cHNJTGVuZ3RoPD0yKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldWzBdWzBdKS5jc3MoeydoZWlnaHQnOidhdXRvJ30pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBwZXIgcm93IGFyZSBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRSb3dcbiAgICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgICAgZm9yICh2YXIgaiA9IDAsIGxlbkogPSAoZ3JvdXBzSUxlbmd0aC0xKTsgaiA8IGxlbkogOyBqKyspIHtcbiAgICAgICAgJChncm91cHNbaV1bal1bMF0pLmNzcyh7J2hlaWdodCc6bWF4fSk7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIHBlciByb3cgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRSb3dcbiAgICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5FcXVhbGl6ZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiB3aGVuIHN0YWNrZWQgb24gc21hbGxlciBzY3JlZW5zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGVxdWFsaXplT25TdGFjazogdHJ1ZSxcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHJvdyBieSByb3cuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplQnlSb3c6IGZhbHNlLFxuICAvKipcbiAgICogU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWluaW11bSBicmVha3BvaW50IHNpemUgdGhlIHBsdWdpbiBzaG91bGQgZXF1YWxpemUgaGVpZ2h0cyBvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgZXF1YWxpemVPbjogJydcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihFcXVhbGl6ZXIsICdFcXVhbGl6ZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEludGVyY2hhbmdlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5pbnRlcmNoYW5nZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqL1xuXG5jbGFzcyBJbnRlcmNoYW5nZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEludGVyY2hhbmdlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEludGVyY2hhbmdlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBJbnRlcmNoYW5nZS5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0ludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEludGVyY2hhbmdlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBpbnRlcmNoYW5nZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuX2FkZEJyZWFrcG9pbnRzKCk7XG4gICAgdGhpcy5fZ2VuZXJhdGVSdWxlcygpO1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgSW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5pbnRlcmNoYW5nZScsIEZvdW5kYXRpb24udXRpbC50aHJvdHRsZSh0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSwgNTApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBJbnRlcmNoYW5nZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHZhciBtYXRjaDtcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUsIGJ1dCBvbmx5IHNhdmUgdGhlIGxhc3QgbWF0Y2hcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGlmKHRoaXMucnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLnJ1bGVzW2ldO1xuXG4gICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShydWxlLnF1ZXJ5KS5tYXRjaGVzKSB7XG4gICAgICAgICAgbWF0Y2ggPSBydWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB0aGlzLnJlcGxhY2UobWF0Y2gucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEZvdW5kYXRpb24gYnJlYWtwb2ludHMgYW5kIGFkZHMgdGhlbSB0byB0aGUgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTIG9iamVjdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQnJlYWtwb2ludHMoKSB7XG4gICAgZm9yICh2YXIgaSBpbiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllcykge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzW2ldO1xuICAgICAgICBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnkubmFtZV0gPSBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBJbnRlcmNoYW5nZSBlbGVtZW50IGZvciB0aGUgcHJvdmlkZWQgbWVkaWEgcXVlcnkgKyBjb250ZW50IHBhaXJpbmdzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdGhhdCBpcyBhbiBJbnRlcmNoYW5nZSBpbnN0YW5jZVxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHNjZW5hcmlvcyAtIEFycmF5IG9mIG9iamVjdHMgdGhhdCBoYXZlICdtcScgYW5kICdwYXRoJyBrZXlzIHdpdGggY29ycmVzcG9uZGluZyBrZXlzXG4gICAqL1xuICBfZ2VuZXJhdGVSdWxlcyhlbGVtZW50KSB7XG4gICAgdmFyIHJ1bGVzTGlzdCA9IFtdO1xuICAgIHZhciBydWxlcztcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucnVsZXMpIHtcbiAgICAgIHJ1bGVzID0gdGhpcy5vcHRpb25zLnJ1bGVzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdpbnRlcmNoYW5nZScpLm1hdGNoKC9cXFsuKj9cXF0vZyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBydWxlcykge1xuICAgICAgaWYocnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tpXS5zbGljZSgxLCAtMSkuc3BsaXQoJywgJyk7XG4gICAgICAgIHZhciBwYXRoID0gcnVsZS5zbGljZSgwLCAtMSkuam9pbignJyk7XG4gICAgICAgIHZhciBxdWVyeSA9IHJ1bGVbcnVsZS5sZW5ndGggLSAxXTtcblxuICAgICAgICBpZiAoSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XSkge1xuICAgICAgICAgIHF1ZXJ5ID0gSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bGVzTGlzdC5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJ1bGVzID0gcnVsZXNMaXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgYHNyY2AgcHJvcGVydHkgb2YgYW4gaW1hZ2UsIG9yIGNoYW5nZSB0aGUgSFRNTCBvZiBhIGNvbnRhaW5lciwgdG8gdGhlIHNwZWNpZmllZCBwYXRoLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggLSBQYXRoIHRvIHRoZSBpbWFnZSBvciBIVE1MIHBhcnRpYWwuXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgKi9cbiAgcmVwbGFjZShwYXRoKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGggPT09IHBhdGgpIHJldHVybjtcblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHRyaWdnZXIgPSAncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnO1xuXG4gICAgLy8gUmVwbGFjaW5nIGltYWdlc1xuICAgIGlmICh0aGlzLiRlbGVtZW50WzBdLm5vZGVOYW1lID09PSAnSU1HJykge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdzcmMnLCBwYXRoKS5sb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KVxuICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBiYWNrZ3JvdW5kIGltYWdlc1xuICAgIGVsc2UgaWYgKHBhdGgubWF0Y2goL1xcLihnaWZ8anBnfGpwZWd8cG5nfHN2Z3x0aWZmKShbPyNdLiopPy9pKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3MoeyAnYmFja2dyb3VuZC1pbWFnZSc6ICd1cmwoJytwYXRoKycpJyB9KVxuICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNpbmcgSFRNTFxuICAgIGVsc2Uge1xuICAgICAgJC5nZXQocGF0aCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQuaHRtbChyZXNwb25zZSlcbiAgICAgICAgICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICAgICAgJChyZXNwb25zZSkuZm91bmRhdGlvbigpO1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIGNvbnRlbnQgaW4gYW4gSW50ZXJjaGFuZ2UgZWxlbWVudCBpcyBkb25lIGJlaW5nIGxvYWRlZC5cbiAgICAgKiBAZXZlbnQgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcbiAgICAgKi9cbiAgICAvLyB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3JlcGxhY2VkLnpmLmludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgaW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICAvL1RPRE8gdGhpcy5cbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5JbnRlcmNoYW5nZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFJ1bGVzIHRvIGJlIGFwcGxpZWQgdG8gSW50ZXJjaGFuZ2UgZWxlbWVudHMuIFNldCB3aXRoIHRoZSBgZGF0YS1pbnRlcmNoYW5nZWAgYXJyYXkgbm90YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHJ1bGVzOiBudWxsXG59O1xuXG5JbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgPSB7XG4gICdsYW5kc2NhcGUnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICAncG9ydHJhaXQnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gICdyZXRpbmEnOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwgb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEludGVyY2hhbmdlLCAnSW50ZXJjaGFuZ2UnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1hZ2VsbGFuIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tYWdlbGxhblxuICovXG5cbmNsYXNzIE1hZ2VsbGFuIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgTWFnZWxsYW4uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgTWFnZWxsYW4jaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBNYWdlbGxhbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnTWFnZWxsYW4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWFnZWxsYW4gcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdtYWdlbGxhbicpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kdGFyZ2V0cyA9ICQoJ1tkYXRhLW1hZ2VsbGFuLXRhcmdldF0nKTtcbiAgICB0aGlzLiRsaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnYScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnZGF0YS1yZXNpemUnOiBpZCxcbiAgICAgICdkYXRhLXNjcm9sbCc6IGlkLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICB0aGlzLiRhY3RpdmUgPSAkKCk7XG4gICAgdGhpcy5zY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgYW4gYXJyYXkgb2YgcGl4ZWwgdmFsdWVzIHRoYXQgYXJlIHRoZSBkZW1hcmNhdGlvbiBsaW5lcyBiZXR3ZWVuIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAgICogQ2FuIGJlIGludm9rZWQgaWYgbmV3IGVsZW1lbnRzIGFyZSBhZGRlZCBvciB0aGUgc2l6ZSBvZiBhIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgY2FsY1BvaW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBib2R5ID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgaHRtbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy53aW5IZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KHdpbmRvdy5pbm5lckhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQpKTtcbiAgICB0aGlzLmRvY0hlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KSk7XG5cbiAgICB0aGlzLiR0YXJnZXRzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkdGFyID0gJCh0aGlzKSxcbiAgICAgICAgICBwdCA9IE1hdGgucm91bmQoJHRhci5vZmZzZXQoKS50b3AgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCk7XG4gICAgICAkdGFyLnRhcmdldFBvaW50ID0gcHQ7XG4gICAgICBfdGhpcy5wb2ludHMucHVzaChwdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBNYWdlbGxhbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgJGJvZHkgPSAkKCdodG1sLCBib2R5JyksXG4gICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgZHVyYXRpb246IF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgZWFzaW5nOiAgIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nXG4gICAgICAgIH07XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgICAgaWYobG9jYXRpb24uaGFzaCl7XG4gICAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MobG9jYXRpb24uaGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF90aGlzLmNhbGNQb2ludHMoKTtcbiAgICAgIF90aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLnJlZmxvdy5iaW5kKHRoaXMpLFxuICAgICAgJ3Njcm9sbG1lLnpmLnRyaWdnZXInOiB0aGlzLl91cGRhdGVBY3RpdmUuYmluZCh0aGlzKVxuICAgIH0pLm9uKCdjbGljay56Zi5tYWdlbGxhbicsICdhW2hyZWZePVwiI1wiXScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgYXJyaXZhbCAgID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MoYXJyaXZhbCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdG8gc2Nyb2xsIHRvIGEgZ2l2ZW4gbG9jYXRpb24gb24gdGhlIHBhZ2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2MgLSBhIHByb3Blcmx5IGZvcm1hdHRlZCBqUXVlcnkgaWQgc2VsZWN0b3IuIEV4YW1wbGU6ICcjZm9vJ1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNjcm9sbFRvTG9jKGxvYykge1xuICAgIHZhciBzY3JvbGxQb3MgPSBNYXRoLnJvdW5kKCQobG9jKS5vZmZzZXQoKS50b3AgLSB0aGlzLm9wdGlvbnMudGhyZXNob2xkIC8gMiAtIHRoaXMub3B0aW9ucy5iYXJPZmZzZXQpO1xuXG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sIHRoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgTWFnZWxsYW4gdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgcmVmbG93KCkge1xuICAgIHRoaXMuY2FsY1BvaW50cygpO1xuICAgIHRoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHZpc2liaWxpdHkgb2YgYW4gYWN0aXZlIGxvY2F0aW9uIGxpbmssIGFuZCB1cGRhdGVzIHRoZSB1cmwgaGFzaCBmb3IgdGhlIHBhZ2UsIGlmIGRlZXBMaW5raW5nIGVuYWJsZWQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgTWFnZWxsYW4jdXBkYXRlXG4gICAqL1xuICBfdXBkYXRlQWN0aXZlKC8qZXZ0LCBlbGVtLCBzY3JvbGxQb3MqLykge1xuICAgIHZhciB3aW5Qb3MgPSAvKnNjcm9sbFBvcyB8fCovIHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApLFxuICAgICAgICBjdXJJZHg7XG5cbiAgICBpZih3aW5Qb3MgKyB0aGlzLndpbkhlaWdodCA9PT0gdGhpcy5kb2NIZWlnaHQpeyBjdXJJZHggPSB0aGlzLnBvaW50cy5sZW5ndGggLSAxOyB9XG4gICAgZWxzZSBpZih3aW5Qb3MgPCB0aGlzLnBvaW50c1swXSl7IGN1cklkeCA9IDA7IH1cbiAgICBlbHNle1xuICAgICAgdmFyIGlzRG93biA9IHRoaXMuc2Nyb2xsUG9zIDwgd2luUG9zLFxuICAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgICBjdXJWaXNpYmxlID0gdGhpcy5wb2ludHMuZmlsdGVyKGZ1bmN0aW9uKHAsIGkpe1xuICAgICAgICAgICAgcmV0dXJuIGlzRG93biA/IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCA8PSB3aW5Qb3MgOiBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCA8PSB3aW5Qb3M7XG4gICAgICAgICAgfSk7XG4gICAgICBjdXJJZHggPSBjdXJWaXNpYmxlLmxlbmd0aCA/IGN1clZpc2libGUubGVuZ3RoIC0gMSA6IDA7XG4gICAgfVxuXG4gICAgdGhpcy4kYWN0aXZlLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG4gICAgdGhpcy4kYWN0aXZlID0gdGhpcy4kbGlua3MuZXEoY3VySWR4KS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgaWYod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKXtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFBvcyA9IHdpblBvcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXG4gICAgICogQGV2ZW50IE1hZ2VsbGFuI3VwZGF0ZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIE1hZ2VsbGFuIGFuZCByZXNldHMgdGhlIHVybCBvZiB0aGUgd2luZG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5tYWdlbGxhbicpXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoaGFzaCwgJycpO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5NYWdlbGxhbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgdGhlIGFuaW1hdGVkIHNjcm9sbGluZyBzaG91bGQgdGFrZSBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBBbmltYXRpb24gc3R5bGUgdG8gdXNlIHdoZW4gc2Nyb2xsaW5nIGJldHdlZW4gbG9jYXRpb25zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdlYXNlLWluLW91dCdcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ2xpbmVhcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIHVzZSBhcyBhIG1hcmtlciBmb3IgbG9jYXRpb24gY2hhbmdlcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgdGhyZXNob2xkOiA1MCxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGFjdGl2ZSBsb2NhdGlvbnMgbGluayBvbiB0aGUgbWFnZWxsYW4gY29udGFpbmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdhY3RpdmUnXG4gICAqL1xuICBhY3RpdmVDbGFzczogJ2FjdGl2ZScsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHNjcmlwdCB0byBtYW5pcHVsYXRlIHRoZSB1cmwgb2YgdGhlIGN1cnJlbnQgcGFnZSwgYW5kIGlmIHN1cHBvcnRlZCwgYWx0ZXIgdGhlIGhpc3RvcnkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZGVlcExpbmtpbmc6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyB0byBvZmZzZXQgdGhlIHNjcm9sbCBvZiB0aGUgcGFnZSBvbiBpdGVtIGNsaWNrIGlmIHVzaW5nIGEgc3RpY2t5IG5hdiBiYXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjVcbiAgICovXG4gIGJhck9mZnNldDogMFxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT3JiaXQgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm9yYml0XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXG4gKi9cblxuY2xhc3MgT3JiaXQge1xuICAvKipcbiAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIG9yYml0IGNhcm91c2VsLlxuICAqIEBjbGFzc1xuICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gT3JiaXQgQ2Fyb3VzZWwuXG4gICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT3JiaXQuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ09yYml0Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignT3JiaXQnLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJ1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAncHJldmlvdXMnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucywgc2V0dGluZyBhdHRyaWJ1dGVzLCBhbmQgc3RhcnRpbmcgdGhlIGFuaW1hdGlvbi5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3N9YCk7XG4gICAgdGhpcy4kc2xpZGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKTtcbiAgICB2YXIgJGltYWdlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyksXG4gICAgaW5pdEFjdGl2ZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKTtcblxuICAgIGlmICghaW5pdEFjdGl2ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5lcSgwKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlTVVJKSB7XG4gICAgICB0aGlzLiRzbGlkZXMuYWRkQ2xhc3MoJ25vLW1vdGlvbnVpJyk7XG4gICAgfVxuXG4gICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3ByZXBhcmVGb3JPcmJpdC5iaW5kKHRoaXMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcHJlcGFyZUZvck9yYml0KCk7Ly9oZWhlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICB0aGlzLl9sb2FkQnVsbGV0cygpO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiB0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhpcy5nZW9TeW5jKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7IC8vIGFsbG93IHdyYXBwZXIgdG8gYmUgZm9jdXNhYmxlIHRvIGVuYWJsZSBhcnJvdyBuYXZpZ2F0aW9uXG4gICAgICB0aGlzLiR3cmFwcGVyLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlcyBhIGpRdWVyeSBjb2xsZWN0aW9uIG9mIGJ1bGxldHMsIGlmIHRoZXkgYXJlIGJlaW5nIHVzZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2xvYWRCdWxsZXRzKCkge1xuICAgIHRoaXMuJGJ1bGxldHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YCkuZmluZCgnYnV0dG9uJyk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIGEgYHRpbWVyYCBvYmplY3Qgb24gdGhlIG9yYml0LCBhbmQgc3RhcnRzIHRoZSBjb3VudGVyIGZvciB0aGUgbmV4dCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKi9cbiAgZ2VvU3luYygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGltZXIgPSBuZXcgRm91bmRhdGlvbi5UaW1lcihcbiAgICAgIHRoaXMuJGVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgIGR1cmF0aW9uOiB0aGlzLm9wdGlvbnMudGltZXJEZWxheSxcbiAgICAgICAgaW5maW5pdGU6IGZhbHNlXG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgfSk7XG4gICAgdGhpcy50aW1lci5zdGFydCgpO1xuICB9XG5cbiAgLyoqXG4gICogU2V0cyB3cmFwcGVyIGFuZCBzbGlkZSBoZWlnaHRzIGZvciB0aGUgb3JiaXQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3ByZXBhcmVGb3JPcmJpdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3NldFdyYXBwZXJIZWlnaHQoZnVuY3Rpb24obWF4KXtcbiAgICAgIF90aGlzLl9zZXRTbGlkZUhlaWdodChtYXgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQ2FsdWxhdGVzIHRoZSBoZWlnaHQgb2YgZWFjaCBzbGlkZSBpbiB0aGUgY29sbGVjdGlvbiwgYW5kIHVzZXMgdGhlIHRhbGxlc3Qgb25lIGZvciB0aGUgd3JhcHBlciBoZWlnaHQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSB3aGVuIGNvbXBsZXRlLlxuICAqL1xuICBfc2V0V3JhcHBlckhlaWdodChjYikgey8vcmV3cml0ZSB0aGlzIHRvIGBmb3JgIGxvb3BcbiAgICB2YXIgbWF4ID0gMCwgdGVtcCwgY291bnRlciA9IDA7XG5cbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHRlbXAgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICQodGhpcykuYXR0cignZGF0YS1zbGlkZScsIGNvdW50ZXIpO1xuXG4gICAgICBpZiAoY291bnRlcikgey8vaWYgbm90IHRoZSBmaXJzdCBzbGlkZSwgc2V0IGNzcyBwb3NpdGlvbiBhbmQgZGlzcGxheSBwcm9wZXJ0eVxuICAgICAgICAkKHRoaXMpLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnbm9uZSd9KTtcbiAgICAgIH1cbiAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgY291bnRlcisrO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvdW50ZXIgPT09IHRoaXMuJHNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHdyYXBwZXIuY3NzKHsnaGVpZ2h0JzogbWF4fSk7IC8vb25seSBjaGFuZ2UgdGhlIHdyYXBwZXIgaGVpZ2h0IHByb3BlcnR5IG9uY2UuXG4gICAgICBjYihtYXgpOyAvL2ZpcmUgY2FsbGJhY2sgd2l0aCBtYXggaGVpZ2h0IGRpbWVuc2lvbi5cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHRoZSBtYXgtaGVpZ2h0IG9mIGVhY2ggc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3NldFNsaWRlSGVpZ2h0KGhlaWdodCkge1xuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5jc3MoJ21heC1oZWlnaHQnLCBoZWlnaHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gYmFzaWNhbGx5IGV2ZXJ5dGhpbmcgd2l0aGluIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy8qKk5vdyB1c2luZyBjdXN0b20gZXZlbnQgLSB0aGFua3MgdG86KipcbiAgICAvLyoqICAgICAgWW9oYWkgQXJhcmF0IG9mIFRvcm9udG8gICAgICAqKlxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgaWYgKHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3dpcGUpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9mZignc3dpcGVsZWZ0LnpmLm9yYml0IHN3aXBlcmlnaHQuemYub3JiaXQnKVxuICAgICAgICAub24oJ3N3aXBlbGVmdC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgICAgfSkub24oJ3N3aXBlcmlnaHQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9uKCdjbGljay56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicsIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gZmFsc2UgOiB0cnVlKTtcbiAgICAgICAgICBfdGhpcy50aW1lcltfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/ICdwYXVzZScgOiAnc3RhcnQnXSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnBhdXNlT25Ib3Zlcikge1xuICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZW50ZXIuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnRpbWVyLnBhdXNlKCk7XG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykpIHtcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm5hdkJ1dHRvbnMpIHtcbiAgICAgICAgdmFyICRjb250cm9scyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLm5leHRDbGFzc30sIC4ke3RoaXMub3B0aW9ucy5wcmV2Q2xhc3N9YCk7XG4gICAgICAgICRjb250cm9scy5hdHRyKCd0YWJpbmRleCcsIDApXG4gICAgICAgIC8vYWxzbyBuZWVkIHRvIGhhbmRsZSBlbnRlci9yZXR1cm4gYW5kIHNwYWNlYmFyIGtleSBwcmVzc2VzXG4gICAgICAgIC5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcblx0ICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoJCh0aGlzKS5oYXNDbGFzcyhfdGhpcy5vcHRpb25zLm5leHRDbGFzcykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIHRoaXMuJGJ1bGxldHMub24oJ2NsaWNrLnpmLm9yYml0IHRvdWNoZW5kLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKC9pcy1hY3RpdmUvZy50ZXN0KHRoaXMuY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0vL2lmIHRoaXMgaXMgYWN0aXZlLCBraWNrIG91dCBvZiBmdW5jdGlvbi5cbiAgICAgICAgICB2YXIgaWR4ID0gJCh0aGlzKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgIGx0ciA9IGlkeCA+IF90aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZGF0YSgnc2xpZGUnKSxcbiAgICAgICAgICAkc2xpZGUgPSBfdGhpcy4kc2xpZGVzLmVxKGlkeCk7XG5cbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShsdHIsICRzbGlkZSwgaWR4KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJHdyYXBwZXIuYWRkKHRoaXMuJGJ1bGxldHMpLm9uKCdrZXlkb3duLnpmLm9yYml0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPcmJpdCcsIHtcbiAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIGlmIGJ1bGxldCBpcyBmb2N1c2VkLCBtYWtlIHN1cmUgZm9jdXMgbW92ZXNcbiAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5pcyhfdGhpcy4kYnVsbGV0cykpIHtcbiAgICAgICAgICAgICAgX3RoaXMuJGJ1bGxldHMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hhbmdlcyB0aGUgY3VycmVudCBzbGlkZSB0byBhIG5ldyBvbmUuXG4gICogQGZ1bmN0aW9uXG4gICogQHBhcmFtIHtCb29sZWFufSBpc0xUUiAtIGZsYWcgaWYgdGhlIHNsaWRlIHNob3VsZCBtb3ZlIGxlZnQgdG8gcmlnaHQuXG4gICogQHBhcmFtIHtqUXVlcnl9IGNob3NlblNsaWRlIC0gdGhlIGpRdWVyeSBlbGVtZW50IG9mIHRoZSBzbGlkZSB0byBzaG93IG5leHQsIGlmIG9uZSBpcyBzZWxlY3RlZC5cbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBuZXcgc2xpZGUgaW4gaXRzIGNvbGxlY3Rpb24sIGlmIG9uZSBjaG9zZW4uXG4gICogQGZpcmVzIE9yYml0I3NsaWRlY2hhbmdlXG4gICovXG4gIGNoYW5nZVNsaWRlKGlzTFRSLCBjaG9zZW5TbGlkZSwgaWR4KSB7XG4gICAgdmFyICRjdXJTbGlkZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5lcSgwKTtcblxuICAgIGlmICgvbXVpL2cudGVzdCgkY3VyU2xpZGVbMF0uY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0gLy9pZiB0aGUgc2xpZGUgaXMgY3VycmVudGx5IGFuaW1hdGluZywga2ljayBvdXQgb2YgdGhlIGZ1bmN0aW9uXG5cbiAgICB2YXIgJGZpcnN0U2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlyc3QoKSxcbiAgICAkbGFzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmxhc3QoKSxcbiAgICBkaXJJbiA9IGlzTFRSID8gJ1JpZ2h0JyA6ICdMZWZ0JyxcbiAgICBkaXJPdXQgPSBpc0xUUiA/ICdMZWZ0JyA6ICdSaWdodCcsXG4gICAgX3RoaXMgPSB0aGlzLFxuICAgICRuZXdTbGlkZTtcblxuICAgIGlmICghY2hvc2VuU2xpZGUpIHsgLy9tb3N0IG9mIHRoZSB0aW1lLCB0aGlzIHdpbGwgYmUgYXV0byBwbGF5ZWQgb3IgY2xpY2tlZCBmcm9tIHRoZSBuYXZCdXR0b25zLlxuICAgICAgJG5ld1NsaWRlID0gaXNMVFIgPyAvL2lmIHdyYXBwaW5nIGVuYWJsZWQsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBpcyBhIGBuZXh0YCBvciBgcHJldmAgc2libGluZywgaWYgbm90LCBzZWxlY3QgdGhlIGZpcnN0IG9yIGxhc3Qgc2xpZGUgdG8gZmlsbCBpbi4gaWYgd3JhcHBpbmcgbm90IGVuYWJsZWQsIGF0dGVtcHQgdG8gc2VsZWN0IGBuZXh0YCBvciBgcHJldmAsIGlmIHRoZXJlJ3Mgbm90aGluZyB0aGVyZSwgdGhlIGZ1bmN0aW9uIHdpbGwga2ljayBvdXQgb24gbmV4dCBzdGVwLiBDUkFaWSBORVNURUQgVEVSTkFSSUVTISEhISFcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRmaXJzdFNsaWRlIDogJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKS8vcGljayBuZXh0IHNsaWRlIGlmIG1vdmluZyBsZWZ0IHRvIHJpZ2h0XG4gICAgICA6XG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkbGFzdFNsaWRlIDogJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKTsvL3BpY2sgcHJldiBzbGlkZSBpZiBtb3ZpbmcgcmlnaHQgdG8gbGVmdFxuICAgIH0gZWxzZSB7XG4gICAgICAkbmV3U2xpZGUgPSBjaG9zZW5TbGlkZTtcbiAgICB9XG5cbiAgICBpZiAoJG5ld1NsaWRlLmxlbmd0aCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIGlkeCA9IGlkeCB8fCB0aGlzLiRzbGlkZXMuaW5kZXgoJG5ld1NsaWRlKTsgLy9ncmFiIGluZGV4IHRvIHVwZGF0ZSBidWxsZXRzXG4gICAgICAgIHRoaXMuX3VwZGF0ZUJ1bGxldHMoaWR4KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKFxuICAgICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlJykuY3NzKHsncG9zaXRpb24nOiAnYWJzb2x1dGUnLCAndG9wJzogMH0pLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbUluRnJvbSR7ZGlySW59YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRuZXdTbGlkZS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ2Jsb2NrJ30pXG4gICAgICAgICAgICAuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KFxuICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltT3V0VG8ke2Rpck91dH1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpO1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhX3RoaXMudGltZXIuaXNQYXVzZWQpe1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2RvIHN0dWZmP1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKS5oaWRlKCk7XG4gICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlIGlzLWluJykuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpLnNob3coKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhdGhpcy50aW1lci5pc1BhdXNlZCkge1xuICAgICAgICAgIHRoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgLyoqXG4gICAgKiBUcmlnZ2VycyB3aGVuIHRoZSBzbGlkZSBoYXMgZmluaXNoZWQgYW5pbWF0aW5nIGluLlxuICAgICogQGV2ZW50IE9yYml0I3NsaWRlY2hhbmdlXG4gICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbJG5ld1NsaWRlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogVXBkYXRlcyB0aGUgYWN0aXZlIHN0YXRlIG9mIHRoZSBidWxsZXRzLCBpZiBkaXNwbGF5ZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNsaWRlLlxuICAqL1xuICBfdXBkYXRlQnVsbGV0cyhpZHgpIHtcbiAgICB2YXIgJG9sZEJ1bGxldCA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKVxuICAgIC5maW5kKCcuaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLmJsdXIoKSxcbiAgICBzcGFuID0gJG9sZEJ1bGxldC5maW5kKCdzcGFuOmxhc3QnKS5kZXRhY2goKSxcbiAgICAkbmV3QnVsbGV0ID0gdGhpcy4kYnVsbGV0cy5lcShpZHgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hcHBlbmQoc3Bhbik7XG4gIH1cblxuICAvKipcbiAgKiBEZXN0cm95cyB0aGUgY2Fyb3VzZWwgYW5kIGhpZGVzIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKS5lbmQoKS5oaWRlKCk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9yYml0LmRlZmF1bHRzID0ge1xuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gbG9vayBmb3IgYW5kIGxvYWRCdWxsZXRzLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGJ1bGxldHM6IHRydWUsXG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBhcHBseSBldmVudCBsaXN0ZW5lcnMgdG8gbmF2IGJ1dHRvbnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBuYXZCdXR0b25zOiB0cnVlLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1yaWdodCdcbiAgKi9cbiAgYW5pbUluRnJvbVJpZ2h0OiAnc2xpZGUtaW4tcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICovXG4gIGFuaW1PdXRUb1JpZ2h0OiAnc2xpZGUtb3V0LXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgKlxuICAqL1xuICBhbmltSW5Gcm9tTGVmdDogJ3NsaWRlLWluLWxlZnQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtbGVmdCdcbiAgKi9cbiAgYW5pbU91dFRvTGVmdDogJ3NsaWRlLW91dC1sZWZ0JyxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGF1dG9tYXRpY2FsbHkgYW5pbWF0ZSBvbiBwYWdlIGxvYWQuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYXV0b1BsYXk6IHRydWUsXG4gIC8qKlxuICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgYmV0d2VlbiBzbGlkZSB0cmFuc2l0aW9uc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSA1MDAwXG4gICovXG4gIHRpbWVyRGVsYXk6IDUwMDAsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBpbmZpbml0ZWx5IGxvb3AgdGhyb3VnaCB0aGUgc2xpZGVzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgaW5maW5pdGVXcmFwOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIE9yYml0IHNsaWRlcyB0byBiaW5kIHRvIHN3aXBlIGV2ZW50cyBmb3IgbW9iaWxlLCByZXF1aXJlcyBhbiBhZGRpdGlvbmFsIHV0aWwgbGlicmFyeVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHN3aXBlOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIHRpbWluZyBmdW5jdGlvbiB0byBwYXVzZSBhbmltYXRpb24gb24gaG92ZXIuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgcGF1c2VPbkhvdmVyOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYmluZCBrZXlib2FyZCBldmVudHMgdG8gdGhlIHNsaWRlciwgdG8gYW5pbWF0ZSBmcmFtZXMgd2l0aCBhcnJvdyBrZXlzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYWNjZXNzaWJsZTogdHJ1ZSxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGFpbmVyIG9mIE9yYml0XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1jb250YWluZXInXG4gICovXG4gIGNvbnRhaW5lckNsYXNzOiAnb3JiaXQtY29udGFpbmVyJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byBpbmRpdmlkdWFsIHNsaWRlcy5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXNsaWRlJ1xuICAqL1xuICBzbGlkZUNsYXNzOiAnb3JiaXQtc2xpZGUnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBidWxsZXQgY29udGFpbmVyLiBZb3UncmUgd2VsY29tZS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LWJ1bGxldHMnXG4gICovXG4gIGJveE9mQnVsbGV0czogJ29yYml0LWJ1bGxldHMnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgbmV4dGAgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1uZXh0J1xuICAqL1xuICBuZXh0Q2xhc3M6ICdvcmJpdC1uZXh0JyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYHByZXZpb3VzYCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXByZXZpb3VzJ1xuICAqL1xuICBwcmV2Q2xhc3M6ICdvcmJpdC1wcmV2aW91cycsXG4gIC8qKlxuICAqIEJvb2xlYW4gdG8gZmxhZyB0aGUganMgdG8gdXNlIG1vdGlvbiB1aSBjbGFzc2VzIG9yIG5vdC4gRGVmYXVsdCB0byB0cnVlIGZvciBiYWNrd2FyZHMgY29tcGF0YWJpbGl0eS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICB1c2VNVUk6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihPcmJpdCwgJ09yYml0Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5hY2NvcmRpb25NZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcm9wZG93bi1tZW51XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZU1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS1tZW51Jyk7XG4gICAgdGhpcy5jdXJyZW50TXEgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlTWVudScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNZW51IGJ5IHBhcnNpbmcgdGhlIGNsYXNzZXMgZnJvbSB0aGUgJ2RhdGEtUmVzcG9uc2l2ZU1lbnUnIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICAvLyBUaGUgZmlyc3QgdGltZSBhbiBJbnRlcmNoYW5nZSBwbHVnaW4gaXMgaW5pdGlhbGl6ZWQsIHRoaXMucnVsZXMgaXMgY29udmVydGVkIGZyb20gYSBzdHJpbmcgb2YgXCJjbGFzc2VzXCIgdG8gYW4gb2JqZWN0IG9mIHJ1bGVzXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bGVzID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IHJ1bGVzVHJlZSA9IHt9O1xuXG4gICAgICAvLyBQYXJzZSBydWxlcyBmcm9tIFwiY2xhc3Nlc1wiIHB1bGxlZCBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICBsZXQgcnVsZXMgPSB0aGlzLnJ1bGVzLnNwbGl0KCcgJyk7XG5cbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBldmVyeSBydWxlIGZvdW5kXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBydWxlID0gcnVsZXNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgbGV0IHJ1bGVTaXplID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVswXSA6ICdzbWFsbCc7XG4gICAgICAgIGxldCBydWxlUGx1Z2luID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVsxXSA6IHJ1bGVbMF07XG5cbiAgICAgICAgaWYgKE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dICE9PSBudWxsKSB7XG4gICAgICAgICAgcnVsZXNUcmVlW3J1bGVTaXplXSA9IE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMucnVsZXMgPSBydWxlc1RyZWU7XG4gICAgfVxuXG4gICAgaWYgKCEkLmlzRW1wdHlPYmplY3QodGhpcy5ydWxlcykpIHtcbiAgICAgIHRoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICAgIC8vICQod2luZG93KS5vbigncmVzaXplLnpmLlJlc3BvbnNpdmVNZW51JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgc2NyZWVuIHdpZHRoIGFnYWluc3QgYXZhaWxhYmxlIG1lZGlhIHF1ZXJpZXMuIElmIHRoZSBtZWRpYSBxdWVyeSBoYXMgY2hhbmdlZCwgYW5kIHRoZSBwbHVnaW4gbmVlZGVkIGhhcyBjaGFuZ2VkLCB0aGUgcGx1Z2lucyB3aWxsIHN3YXAgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01lZGlhUXVlcmllcygpIHtcbiAgICB2YXIgbWF0Y2hlZE1xLCBfdGhpcyA9IHRoaXM7XG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSBhbmQgZmluZCB0aGUgbGFzdCBtYXRjaGluZyBydWxlXG4gICAgJC5lYWNoKHRoaXMucnVsZXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KGtleSkpIHtcbiAgICAgICAgbWF0Y2hlZE1xID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm8gbWF0Y2g/IE5vIGRpY2VcbiAgICBpZiAoIW1hdGNoZWRNcSkgcmV0dXJuO1xuXG4gICAgLy8gUGx1Z2luIGFscmVhZHkgaW5pdGlhbGl6ZWQ/IFdlIGdvb2RcbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luIGluc3RhbmNlb2YgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbikgcmV0dXJuO1xuXG4gICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBsdWdpbi1zcGVjaWZpYyBDU1MgY2xhc3Nlc1xuICAgICQuZWFjaChNZW51UGx1Z2lucywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModmFsdWUuY3NzQ2xhc3MpO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRoZSBDU1MgY2xhc3MgZm9yIHRoZSBuZXcgcGx1Z2luXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLnJ1bGVzW21hdGNoZWRNcV0uY3NzQ2xhc3MpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBuZXcgcGx1Z2luXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbikgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVNZW51Jyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVNZW51LmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICBkcm9wZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJvcGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJvcGRvd24tbWVudSddIHx8IG51bGxcbiAgfSxcbiBkcmlsbGRvd246IHtcbiAgICBjc3NDbGFzczogJ2RyaWxsZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcmlsbGRvd24nXSB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uLW1lbnUnLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snYWNjb3JkaW9uLW1lbnUnXSB8fCBudWxsXG4gIH1cbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlTWVudSwgJ1Jlc3BvbnNpdmVNZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlVG9nZ2xlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlVG9nZ2xlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVGFiIEJhci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCB0YWIgYmFyIGZ1bmN0aW9uYWxpdHkgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWIgYmFyIGJ5IGZpbmRpbmcgdGhlIHRhcmdldCBlbGVtZW50LCB0b2dnbGluZyBlbGVtZW50LCBhbmQgcnVubmluZyB1cGRhdGUoKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgdGFyZ2V0SUQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtdG9nZ2xlJyk7XG4gICAgaWYgKCF0YXJnZXRJRCkge1xuICAgICAgY29uc29sZS5lcnJvcignWW91ciB0YWIgYmFyIG5lZWRzIGFuIElEIG9mIGEgTWVudSBhcyB0aGUgdmFsdWUgb2YgZGF0YS10YWItYmFyLicpO1xuICAgIH1cblxuICAgIHRoaXMuJHRhcmdldE1lbnUgPSAkKGAjJHt0YXJnZXRJRH1gKTtcbiAgICB0aGlzLiR0b2dnbGVyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10b2dnbGVdJyk7XG5cbiAgICB0aGlzLl91cGRhdGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhlIHRhYiBiYXIgdG8gd29yay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLl91cGRhdGVNcUhhbmRsZXIgPSB0aGlzLl91cGRhdGUuYmluZCh0aGlzKTtcbiAgICBcbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICB0aGlzLiR0b2dnbGVyLm9uKCdjbGljay56Zi5yZXNwb25zaXZlVG9nZ2xlJywgdGhpcy50b2dnbGVNZW51LmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBtZWRpYSBxdWVyeSB0byBkZXRlcm1pbmUgaWYgdGhlIHRhYiBiYXIgc2hvdWxkIGJlIHZpc2libGUgb3IgaGlkZGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGUoKSB7XG4gICAgLy8gTW9iaWxlXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdygpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhci4gVGhlIHRvZ2dsZSBvbmx5IGhhcHBlbnMgaWYgdGhlIHNjcmVlbiBpcyBzbWFsbCBlbm91Z2ggdG8gYWxsb3cgaXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAqL1xuICB0b2dnbGVNZW51KCkgeyAgIFxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnRvZ2dsZSgwKTtcblxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyIHRvZ2dsZXMuXG4gICAgICAgKiBAZXZlbnQgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndG9nZ2xlZC56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgfVxuICB9O1xuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgdGhpcy4kdG9nZ2xlci5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgXG4gICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcbiAgICBcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBicmVha3BvaW50IGFmdGVyIHdoaWNoIHRoZSBtZW51IGlzIGFsd2F5cyBzaG93biwgYW5kIHRoZSB0YWIgYmFyIGlzIGhpZGRlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgaGlkZUZvcjogJ21lZGl1bSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlVG9nZ2xlLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmV2ZWFsIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXZlYWxcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uIGlmIHVzaW5nIGFuaW1hdGlvbnNcbiAqL1xuXG5jbGFzcyBSZXZlYWwge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBSZXZlYWwuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmV2ZWFsLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmV2ZWFsJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignUmV2ZWFsJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ3RhYl9mb3J3YXJkJyxcbiAgICAgICdTSElGVF9UQUInOiAndGFiX2JhY2t3YXJkJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtb2RhbCBieSBhZGRpbmcgdGhlIG92ZXJsYXkgYW5kIGNsb3NlIGJ1dHRvbnMsIChpZiBzZWxlY3RlZCkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmNhY2hlZCA9IHttcTogRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmN1cnJlbnR9O1xuICAgIHRoaXMuaXNNb2JpbGUgPSBtb2JpbGVTbmlmZigpO1xuXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApIDogJChgW2RhdGEtdG9nZ2xlPVwiJHt0aGlzLmlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogdGhpcy5pZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICd0YWJpbmRleCc6IDBcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmdWxsJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuID0gdHJ1ZTtcbiAgICAgIHRoaXMub3B0aW9ucy5vdmVybGF5ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiAhdGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheSA9IHRoaXMuX21ha2VPdmVybGF5KHRoaXMuaWQpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ2RpYWxvZycsXG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICdkYXRhLXlldGktYm94JzogdGhpcy5pZCxcbiAgICAgICAgJ2RhdGEtcmVzaXplJzogdGhpcy5pZFxuICAgIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbyh0aGlzLiRvdmVybGF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbygkKCdib2R5JykpO1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnd2l0aG91dC1vdmVybGF5Jyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmsgJiYgd2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggYCMke3RoaXMuaWR9YCkpIHtcbiAgICAgICQod2luZG93KS5vbmUoJ2xvYWQuemYucmV2ZWFsJywgdGhpcy5vcGVuLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG92ZXJsYXkgZGl2IHRvIGRpc3BsYXkgYmVoaW5kIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tYWtlT3ZlcmxheShpZCkge1xuICAgIHZhciAkb3ZlcmxheSA9ICQoJzxkaXY+PC9kaXY+JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdyZXZlYWwtb3ZlcmxheScpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmRUbygnYm9keScpO1xuICAgIHJldHVybiAkb3ZlcmxheTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHBvc2l0aW9uIG9mIG1vZGFsXG4gICAqIFRPRE86ICBGaWd1cmUgb3V0IGlmIHdlIGFjdHVhbGx5IG5lZWQgdG8gY2FjaGUgdGhlc2UgdmFsdWVzIG9yIGlmIGl0IGRvZXNuJ3QgbWF0dGVyXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlUG9zaXRpb24oKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy4kZWxlbWVudC5vdXRlcldpZHRoKCk7XG4gICAgdmFyIG91dGVyV2lkdGggPSAkKHdpbmRvdykud2lkdGgoKTtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy4kZWxlbWVudC5vdXRlckhlaWdodCgpO1xuICAgIHZhciBvdXRlckhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICB2YXIgbGVmdCwgdG9wO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaE9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQoKG91dGVyV2lkdGggLSB3aWR0aCkgLyAyLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMuaE9mZnNldCwgMTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnZPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgaWYgKGhlaWdodCA+IG91dGVySGVpZ2h0KSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KE1hdGgubWluKDEwMCwgb3V0ZXJIZWlnaHQgLyAxMCksIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KChvdXRlckhlaWdodCAtIGhlaWdodCkgLyA0LCAxMCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy52T2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHt0b3A6IHRvcCArICdweCd9KTtcbiAgICAvLyBvbmx5IHdvcnJ5IGFib3V0IGxlZnQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBvdmVybGF5IG9yIHdlIGhhdmVhICBob3Jpem9udGFsIG9mZnNldCxcbiAgICAvLyBvdGhlcndpc2Ugd2UncmUgcGVyZmVjdGx5IGluIHRoZSBtaWRkbGVcbiAgICBpZighdGhpcy4kb3ZlcmxheSB8fCAodGhpcy5vcHRpb25zLmhPZmZzZXQgIT09ICdhdXRvJykpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtsZWZ0OiBsZWZ0ICsgJ3B4J30pO1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe21hcmdpbjogJzBweCd9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogKGV2ZW50LCAkZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoKGV2ZW50LnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0pIHx8XG4gICAgICAgICAgICAoJChldmVudC50YXJnZXQpLnBhcmVudHMoJ1tkYXRhLWNsb3NhYmxlXScpWzBdID09PSAkZWxlbWVudCkpIHsgLy8gb25seSBjbG9zZSByZXZlYWwgd2hlbiBpdCdzIGV4cGxpY2l0bHkgY2FsbGVkXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UuYXBwbHkodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzIHx8IGUud2hpY2ggPT09IDMyKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiB0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5yZXZlYWwnKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub24oYHBvcHN0YXRlLnpmLnJldmVhbDoke3RoaXMuaWR9YCwgdGhpcy5faGFuZGxlU3RhdGUuYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgbW9kYWwgbWV0aG9kcyBvbiBiYWNrL2ZvcndhcmQgYnV0dG9uIGNsaWNrcyBvciBhbnkgb3RoZXIgZXZlbnQgdGhhdCB0cmlnZ2VycyBwb3BzdGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVTdGF0ZShlKSB7XG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggJyMnICsgdGhpcy5pZCkgJiYgIXRoaXMuaXNBY3RpdmUpeyB0aGlzLm9wZW4oKTsgfVxuICAgIGVsc2V7IHRoaXMuY2xvc2UoKTsgfVxuICB9XG5cblxuICAvKipcbiAgICogT3BlbnMgdGhlIG1vZGFsIGNvbnRyb2xsZWQgYnkgYHRoaXMuJGFuY2hvcmAsIGFuZCBjbG9zZXMgYWxsIG90aGVycyBieSBkZWZhdWx0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZW1lXG4gICAqIEBmaXJlcyBSZXZlYWwjb3BlblxuICAgKi9cbiAgb3BlbigpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB2YXIgaGFzaCA9IGAjJHt0aGlzLmlkfWA7XG5cbiAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gTWFrZSBlbGVtZW50cyBpbnZpc2libGUsIGJ1dCByZW1vdmUgZGlzcGxheTogbm9uZSBzbyB3ZSBjYW4gZ2V0IHNpemUgYW5kIHBvc2l0aW9uaW5nXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJyB9KVxuICAgICAgICAuc2hvdygpXG4gICAgICAgIC5zY3JvbGxUb3AoMCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJ30pLnNob3coKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmhpZGUoKVxuICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJycgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnJ30pLmhpZGUoKTtcbiAgICAgIGlmKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Zhc3QnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdmYXN0Jyk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3Nsb3cnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdzbG93Jyk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aXBsZU9wZW5lZCkge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG1vZGFsIG9wZW5zLlxuICAgICAgICogQ2xvc2VzIGFueSBvdGhlciBtb2RhbHMgdGhhdCBhcmUgY3VycmVudGx5IG9wZW5cbiAgICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VtZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYucmV2ZWFsJywgdGhpcy5pZCk7XG4gICAgfVxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25Jbikge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGZ1bmN0aW9uIGFmdGVyQW5pbWF0aW9uRm9jdXMoKXtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnRcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZm9jdXMoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kb3ZlcmxheSwgJ2ZhZGUtaW4nKTtcbiAgICAgIH1cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4sICgpID0+IHtcbiAgICAgICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgICAgYWZ0ZXJBbmltYXRpb25Gb2N1cygpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5zaG93KDApO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KHRoaXMub3B0aW9ucy5zaG93RGVsYXkpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBhY2Nlc3NpYmlsaXR5XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmF0dHIoe1xuICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgIH0pXG4gICAgICAuZm9jdXMoKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGhhcyBzdWNjZXNzZnVsbHkgb3BlbmVkLlxuICAgICAqIEBldmVudCBSZXZlYWwjb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5yZXZlYWwnKTtcblxuICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XG4gICAgICB0aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgJCgnaHRtbCwgYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX2V4dHJhSGFuZGxlcnMoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV4dHJhIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgYm9keSBhbmQgd2luZG93IGlmIG5lY2Vzc2FyeS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9leHRyYUhhbmRsZXJzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiAhdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4pIHtcbiAgICAgICQoJ2JvZHknKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9jayBmb2N1cyB3aXRoaW4gbW9kYWwgd2hpbGUgdGFiYmluZ1xuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgdGFiX2ZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgtMSkpKSB7IC8vIGxlZnQgbW9kYWwgZG93bndhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKDApLmZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYl9iYWNrd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKDApKSB8fCBfdGhpcy4kZWxlbWVudC5pcygnOmZvY3VzJykpIHsgLy8gbGVmdCBtb2RhbCB1cHdhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGxhc3QgZWxlbWVudFxuICAgICAgICAgICAgX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKSkpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IC8vIHNldCBmb2N1cyBiYWNrIHRvIGFuY2hvciBpZiBjbG9zZSBidXR0b24gaGFzIGJlZW4gYWN0aXZhdGVkXG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cykpIHsgLy8gZG9udCd0IHRyaWdnZXIgaWYgYWN1YWwgZWxlbWVudCBoYXMgZm9jdXMgKGkuZS4gaW5wdXRzLCBsaW5rcywgLi4uKVxuICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VkXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZiAoIXRoaXMuaXNBY3RpdmUgfHwgIXRoaXMuJGVsZW1lbnQuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJG92ZXJsYXksICdmYWRlLW91dCcsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgwLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKHRoaXMub3B0aW9ucy5oaWRlRGVsYXkpO1xuICAgIH1cblxuICAgIC8vIENvbmRpdGlvbmFscyB0byByZW1vdmUgZXh0cmEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkIG9uIG9wZW5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICAkKCdib2R5Jykub2ZmKCdjbGljay56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcblxuICAgIGZ1bmN0aW9uIGZpbmlzaFVwKCkge1xuICAgICAgaWYgKF90aGlzLmlzTW9iaWxlKSB7XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgICAgaWYoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpIHtcbiAgICAgICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKTtcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG5cbiAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAgIC8qKlxuICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBpcyBkb25lIGNsb3NpbmcuXG4gICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VkXG4gICAgICAqL1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICogUmVzZXRzIHRoZSBtb2RhbCBjb250ZW50XG4gICAgKiBUaGlzIHByZXZlbnRzIGEgcnVubmluZyB2aWRlbyB0byBrZWVwIGdvaW5nIGluIHRoZSBiYWNrZ3JvdW5kXG4gICAgKi9cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc2V0T25DbG9zZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5odG1sKHRoaXMuJGVsZW1lbnQuaHRtbCgpKTtcbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgIGlmIChfdGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSkge1xuICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKFwiXCIsIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcnO1xuICAgICAgIH1cbiAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2VkIHN0YXRlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hcHBlbmRUbygkKCdib2R5JykpOyAvLyBtb3ZlICRlbGVtZW50IG91dHNpZGUgb2YgJG92ZXJsYXkgdG8gcHJldmVudCBlcnJvciB1bnJlZ2lzdGVyUGx1Z2luKClcbiAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgpLm9mZigpLnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmhpZGUoKS5vZmYoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYnKTtcbiAgICAkKHdpbmRvdykub2ZmKGAuemYucmV2ZWFsOiR7dGhpcy5pZH1gKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuUmV2ZWFsLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgICovXG4gIGFuaW1hdGlvbkluOiAnJyxcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLW91dC1yaWdodCdcbiAgICovXG4gIGFuaW1hdGlvbk91dDogJycsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIG9wZW5pbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBzaG93RGVsYXk6IDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIGNsb3Npbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBoaWRlRGVsYXk6IDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keS9vdmVybGF5IHRvIGNsb3NlIHRoZSBtb2RhbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGNsb3NlIGlmIHRoZSB1c2VyIHByZXNzZXMgdGhlIGBFU0NBUEVgIGtleS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uRXNjOiB0cnVlLFxuICAvKipcbiAgICogSWYgdHJ1ZSwgYWxsb3dzIG11bHRpcGxlIG1vZGFscyB0byBiZSBkaXNwbGF5ZWQgYXQgb25jZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlwbGVPcGVuZWQ6IGZhbHNlLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGRvd24gZnJvbSB0aGUgdG9wIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgdk9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGluIGZyb20gdGhlIHNpZGUgb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBhdXRvXG4gICAqL1xuICBoT2Zmc2V0OiAnYXV0bycsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGJlIGZ1bGxzY3JlZW4sIGNvbXBsZXRlbHkgYmxvY2tpbmcgb3V0IHRoZSByZXN0IG9mIHRoZSB2aWV3LiBKUyBjaGVja3MgZm9yIHRoaXMgYXMgd2VsbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZnVsbFNjcmVlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBQZXJjZW50YWdlIG9mIHNjcmVlbiBoZWlnaHQgdGhlIG1vZGFsIHNob3VsZCBwdXNoIHVwIGZyb20gdGhlIGJvdHRvbSBvZiB0aGUgdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgYnRtT2Zmc2V0UGN0OiAxMCxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gZ2VuZXJhdGUgYW4gb3ZlcmxheSBkaXYsIHdoaWNoIHdpbGwgY292ZXIgdGhlIHZpZXcgd2hlbiBtb2RhbCBvcGVucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBvdmVybGF5OiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byByZW1vdmUgYW5kIHJlaW5qZWN0IG1hcmt1cCBvbiBjbG9zZS4gU2hvdWxkIGJlIHRydWUgaWYgdXNpbmcgdmlkZW8gZWxlbWVudHMgdy9vIHVzaW5nIHByb3ZpZGVyJ3MgYXBpLCBvdGhlcndpc2UsIHZpZGVvcyB3aWxsIGNvbnRpbnVlIHRvIHBsYXkgaW4gdGhlIGJhY2tncm91bmQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHJlc2V0T25DbG9zZTogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGFsdGVyIHRoZSB1cmwgb24gb3Blbi9jbG9zZSwgYW5kIGFsbG93cyB0aGUgdXNlIG9mIHRoZSBgYmFja2AgYnV0dG9uIHRvIGNsb3NlIG1vZGFscy4gQUxTTywgYWxsb3dzIGEgbW9kYWwgdG8gYXV0by1tYW5pYWNhbGx5IG9wZW4gb24gcGFnZSBsb2FkIElGIHRoZSBoYXNoID09PSB0aGUgbW9kYWwncyB1c2VyLXNldCBpZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmV2ZWFsLCAnUmV2ZWFsJyk7XG5cbmZ1bmN0aW9uIGlQaG9uZVNuaWZmKCkge1xuICByZXR1cm4gL2lQKGFkfGhvbmV8b2QpLipPUy8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIGFuZHJvaWRTbmlmZigpIHtcbiAgcmV0dXJuIC9BbmRyb2lkLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gbW9iaWxlU25pZmYoKSB7XG4gIHJldHVybiBpUGhvbmVTbmlmZigpIHx8IGFuZHJvaWRTbmlmZigpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogU3RpY2t5IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5zdGlja3lcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICovXG5cbmNsYXNzIFN0aWNreSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgc3RpY2t5IHRoaW5nLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2Ugc3RpY2t5LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbnMgb2JqZWN0IHBhc3NlZCB3aGVuIGNyZWF0aW5nIHRoZSBlbGVtZW50IHByb2dyYW1tYXRpY2FsbHkuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFN0aWNreS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnU3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHN0aWNreSBlbGVtZW50IGJ5IGFkZGluZyBjbGFzc2VzLCBnZXR0aW5nL3NldHRpbmcgZGltZW5zaW9ucywgYnJlYWtwb2ludHMgYW5kIGF0dHJpYnV0ZXNcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdGlja3ktY29udGFpbmVyXScpLFxuICAgICAgICBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc3RpY2t5JyksXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICghJHBhcmVudC5sZW5ndGgpIHtcbiAgICAgIHRoaXMud2FzV3JhcHBlZCA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuJGNvbnRhaW5lciA9ICRwYXJlbnQubGVuZ3RoID8gJHBhcmVudCA6ICQodGhpcy5vcHRpb25zLmNvbnRhaW5lcikud3JhcElubmVyKHRoaXMuJGVsZW1lbnQpO1xuICAgIHRoaXMuJGNvbnRhaW5lci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3MpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3MpXG4gICAgICAgICAgICAgICAgIC5hdHRyKHsnZGF0YS1yZXNpemUnOiBpZH0pO1xuXG4gICAgdGhpcy5zY3JvbGxDb3VudCA9IHRoaXMub3B0aW9ucy5jaGVja0V2ZXJ5O1xuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgICQod2luZG93KS5vbmUoJ2xvYWQuemYuc3RpY2t5JywgZnVuY3Rpb24oKXtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuYW5jaG9yICE9PSAnJyl7XG4gICAgICAgIF90aGlzLiRhbmNob3IgPSAkKCcjJyArIF90aGlzLm9wdGlvbnMuYW5jaG9yKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBfdGhpcy5fcGFyc2VQb2ludHMoKTtcbiAgICAgIH1cblxuICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cyhpZC5zcGxpdCgnLScpLnJldmVyc2UoKS5qb2luKCctJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHVzaW5nIG11bHRpcGxlIGVsZW1lbnRzIGFzIGFuY2hvcnMsIGNhbGN1bGF0ZXMgdGhlIHRvcCBhbmQgYm90dG9tIHBpeGVsIHZhbHVlcyB0aGUgc3RpY2t5IHRoaW5nIHNob3VsZCBzdGljayBhbmQgdW5zdGljayBvbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGFyc2VQb2ludHMoKSB7XG4gICAgdmFyIHRvcCA9IHRoaXMub3B0aW9ucy50b3BBbmNob3IgPT0gXCJcIiA/IDEgOiB0aGlzLm9wdGlvbnMudG9wQW5jaG9yLFxuICAgICAgICBidG0gPSB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yPT0gXCJcIiA/IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgOiB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yLFxuICAgICAgICBwdHMgPSBbdG9wLCBidG1dLFxuICAgICAgICBicmVha3MgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcHRzLmxlbmd0aDsgaSA8IGxlbiAmJiBwdHNbaV07IGkrKykge1xuICAgICAgdmFyIHB0O1xuICAgICAgaWYgKHR5cGVvZiBwdHNbaV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHB0ID0gcHRzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBsYWNlID0gcHRzW2ldLnNwbGl0KCc6JyksXG4gICAgICAgICAgICBhbmNob3IgPSAkKGAjJHtwbGFjZVswXX1gKTtcblxuICAgICAgICBwdCA9IGFuY2hvci5vZmZzZXQoKS50b3A7XG4gICAgICAgIGlmIChwbGFjZVsxXSAmJiBwbGFjZVsxXS50b0xvd2VyQ2FzZSgpID09PSAnYm90dG9tJykge1xuICAgICAgICAgIHB0ICs9IGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrc1tpXSA9IHB0O1xuICAgIH1cblxuXG4gICAgdGhpcy5wb2ludHMgPSBicmVha3M7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBzY3JvbGxpbmcgZWxlbWVudC5cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIC0gcHN1ZWRvLXJhbmRvbSBpZCBmb3IgdW5pcXVlIHNjcm9sbCBldmVudCBsaXN0ZW5lci5cbiAgICovXG4gIF9ldmVudHMoaWQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxMaXN0ZW5lciA9IHRoaXMuc2Nyb2xsTGlzdGVuZXIgPSBgc2Nyb2xsLnpmLiR7aWR9YDtcbiAgICBpZiAodGhpcy5pc09uKSB7IHJldHVybjsgfVxuICAgIGlmICh0aGlzLmNhblN0aWNrKSB7XG4gICAgICB0aGlzLmlzT24gPSB0cnVlO1xuICAgICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcilcbiAgICAgICAgICAgICAgIC5vbihzY3JvbGxMaXN0ZW5lciwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Nyb2xsQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudCA9IF90aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlLCB3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJylcbiAgICAgICAgICAgICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSwgZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY2FuU3RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV90aGlzLmlzT24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9ldmVudHMoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBoYW5kbGVycyBmb3Igc2Nyb2xsIGFuZCBjaGFuZ2UgZXZlbnRzIG9uIGFuY2hvci5cbiAgICogQGZpcmVzIFN0aWNreSNwYXVzZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2Nyb2xsTGlzdGVuZXIgLSB1bmlxdWUsIG5hbWVzcGFjZWQgc2Nyb2xsIGxpc3RlbmVyIGF0dGFjaGVkIHRvIGB3aW5kb3dgXG4gICAqL1xuICBfcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBpcyBwYXVzZWQgZHVlIHRvIHJlc2l6ZSBldmVudCBzaHJpbmtpbmcgdGhlIHZpZXcuXG4gICAgICogQGV2ZW50IFN0aWNreSNwYXVzZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncGF1c2UuemYuc3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGV2ZXJ5IGBzY3JvbGxgIGV2ZW50IGFuZCBvbiBgX2luaXRgXG4gICAqIGZpcmVzIGZ1bmN0aW9ucyBiYXNlZCBvbiBib29sZWFucyBhbmQgY2FjaGVkIHZhbHVlc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGNoZWNrU2l6ZXMgLSB0cnVlIGlmIHBsdWdpbiBzaG91bGQgcmVjYWxjdWxhdGUgc2l6ZXMgYW5kIGJyZWFrcG9pbnRzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gc2Nyb2xsIC0gY3VycmVudCBzY3JvbGwgcG9zaXRpb24gcGFzc2VkIGZyb20gc2Nyb2xsIGV2ZW50IGNiIGZ1bmN0aW9uLiBJZiBub3QgcGFzc2VkLCBkZWZhdWx0cyB0byBgd2luZG93LnBhZ2VZT2Zmc2V0YC5cbiAgICovXG4gIF9jYWxjKGNoZWNrU2l6ZXMsIHNjcm9sbCkge1xuICAgIGlmIChjaGVja1NpemVzKSB7IHRoaXMuX3NldFNpemVzKCk7IH1cblxuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFzY3JvbGwpIHsgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0OyB9XG5cbiAgICBpZiAoc2Nyb2xsID49IHRoaXMudG9wUG9pbnQpIHtcbiAgICAgIGlmIChzY3JvbGwgPD0gdGhpcy5ib3R0b21Qb2ludCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3NldFN0aWNreSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgc3R1Y2suXG4gICAqIEFkZHMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBmaXJlcyBTdGlja3kjc3R1Y2t0b1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTdGlja3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBtcmduID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fTtcblxuICAgIGNzc1ttcmduXSA9IGAke3RoaXMub3B0aW9uc1ttcmduXX1lbWA7XG4gICAgY3NzW3N0aWNrVG9dID0gMDtcbiAgICBjc3Nbbm90U3R1Y2tUb10gPSAnYXV0byc7XG4gICAgY3NzWydsZWZ0J10gPSB0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSlbXCJwYWRkaW5nLWxlZnRcIl0sIDEwKTtcbiAgICB0aGlzLmlzU3R1Y2sgPSB0cnVlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7bm90U3R1Y2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcbiAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYHBvc2l0aW9uOiBmaXhlZDtgXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi5zdHVja3RvOnRvcGBcbiAgICAgICAgICAgICAgICAgICogQGV2ZW50IFN0aWNreSNzdHVja3RvXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnN0dWNrdG86JHtzdGlja1RvfWApO1xuICAgIHRoaXMuJGVsZW1lbnQub24oXCJ0cmFuc2l0aW9uZW5kIHdlYmtpdFRyYW5zaXRpb25FbmQgb1RyYW5zaXRpb25FbmQgb3RyYW5zaXRpb25lbmQgTVNUcmFuc2l0aW9uRW5kXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuX3NldFNpemVzKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgdW5zdHVjay5cbiAgICogUmVtb3ZlcyBgcG9zaXRpb246IGZpeGVkO2AsIGFuZCBoZWxwZXIgY2xhc3Nlcy5cbiAgICogQWRkcyBvdGhlciBoZWxwZXIgY2xhc3Nlcy5cbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1RvcCAtIHRlbGxzIHRoZSBmdW5jdGlvbiBpZiB0aGUgJGVsZW1lbnQgc2hvdWxkIGFuY2hvciB0byB0aGUgdG9wIG9yIGJvdHRvbSBvZiBpdHMgJGFuY2hvciBlbGVtZW50LlxuICAgKiBAZmlyZXMgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVtb3ZlU3RpY2t5KGlzVG9wKSB7XG4gICAgdmFyIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgc3RpY2tUb1RvcCA9IHN0aWNrVG8gPT09ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fSxcbiAgICAgICAgYW5jaG9yUHQgPSAodGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSAtIHRoaXMucG9pbnRzWzBdIDogdGhpcy5hbmNob3JIZWlnaHQpIC0gdGhpcy5lbGVtSGVpZ2h0LFxuICAgICAgICBtcmduID0gc3RpY2tUb1RvcCA/ICdtYXJnaW5Ub3AnIDogJ21hcmdpbkJvdHRvbScsXG4gICAgICAgIG5vdFN0dWNrVG8gPSBzdGlja1RvVG9wID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgdG9wT3JCb3R0b20gPSBpc1RvcCA/ICd0b3AnIDogJ2JvdHRvbSc7XG5cbiAgICBjc3NbbXJnbl0gPSAwO1xuXG4gICAgY3NzWydib3R0b20nXSA9ICdhdXRvJztcbiAgICBpZihpc1RvcCkge1xuICAgICAgY3NzWyd0b3AnXSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNzc1sndG9wJ10gPSBhbmNob3JQdDtcbiAgICB9XG5cbiAgICBjc3NbJ2xlZnQnXSA9ICcnO1xuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7dG9wT3JCb3R0b219YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGFuY2hvcmVkLlxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYudW5zdHVja2Zyb206Ym90dG9tYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOiR7dG9wT3JCb3R0b219YCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgJGVsZW1lbnQgYW5kICRjb250YWluZXIgc2l6ZXMgZm9yIHBsdWdpbi5cbiAgICogQ2FsbHMgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uIG9mIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFNpemVzKGNiKSB7XG4gICAgdGhpcy5jYW5TdGljayA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5zdGlja3lPbik7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7IGNiKCk7IH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBuZXdFbGVtV2lkdGggPSB0aGlzLiRjb250YWluZXJbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGgsXG4gICAgICAgIGNvbXAgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLiRjb250YWluZXJbMF0pLFxuICAgICAgICBwZG5nID0gcGFyc2VJbnQoY29tcFsncGFkZGluZy1yaWdodCddLCAxMCk7XG5cbiAgICBpZiAodGhpcy4kYW5jaG9yICYmIHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuYW5jaG9ySGVpZ2h0ID0gdGhpcy4kYW5jaG9yWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcGFyc2VQb2ludHMoKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LmNzcyh7XG4gICAgICAnbWF4LXdpZHRoJzogYCR7bmV3RWxlbVdpZHRoIC0gcGRuZ31weGBcbiAgICB9KTtcblxuICAgIHZhciBuZXdDb250YWluZXJIZWlnaHQgPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCB8fCB0aGlzLmNvbnRhaW5lckhlaWdodDtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5jc3MoXCJkaXNwbGF5XCIpID09IFwibm9uZVwiKSB7XG4gICAgICBuZXdDb250YWluZXJIZWlnaHQgPSAwO1xuICAgIH1cbiAgICB0aGlzLmNvbnRhaW5lckhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcbiAgICB0aGlzLiRjb250YWluZXIuY3NzKHtcbiAgICAgIGhlaWdodDogbmV3Q29udGFpbmVySGVpZ2h0XG4gICAgfSk7XG4gICAgdGhpcy5lbGVtSGVpZ2h0ID0gbmV3Q29udGFpbmVySGVpZ2h0O1xuXG4gIFx0aWYgKHRoaXMuaXNTdHVjaykge1xuICBcdFx0dGhpcy4kZWxlbWVudC5jc3Moe1wibGVmdFwiOnRoaXMuJGNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0ICsgcGFyc2VJbnQoY29tcFsncGFkZGluZy1sZWZ0J10sIDEwKX0pO1xuICBcdH1cblxuICAgIHRoaXMuX3NldEJyZWFrUG9pbnRzKG5ld0NvbnRhaW5lckhlaWdodCwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2IpIHsgY2IoKTsgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHVwcGVyIGFuZCBsb3dlciBicmVha3BvaW50cyBmb3IgdGhlIGVsZW1lbnQgdG8gYmVjb21lIHN0aWNreS91bnN0aWNreS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGVsZW1IZWlnaHQgLSBweCB2YWx1ZSBmb3Igc3RpY2t5LiRlbGVtZW50IGhlaWdodCwgY2FsY3VsYXRlZCBieSBgX3NldFNpemVzYC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gY29tcGxldGlvbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRCcmVha1BvaW50cyhlbGVtSGVpZ2h0LCBjYikge1xuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKGNiKSB7IGNiKCk7IH1cbiAgICAgIGVsc2UgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgdmFyIG1Ub3AgPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpblRvcCksXG4gICAgICAgIG1CdG0gPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpbkJvdHRvbSksXG4gICAgICAgIHRvcFBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1swXSA6IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AsXG4gICAgICAgIGJvdHRvbVBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSA6IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQsXG4gICAgICAgIC8vIHRvcFBvaW50ID0gdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCB8fCB0aGlzLnBvaW50c1swXSxcbiAgICAgICAgLy8gYm90dG9tUG9pbnQgPSB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0IHx8IHRoaXMucG9pbnRzWzFdLFxuICAgICAgICB3aW5IZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICd0b3AnKSB7XG4gICAgICB0b3BQb2ludCAtPSBtVG9wO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKGVsZW1IZWlnaHQgKyBtVG9wKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAnYm90dG9tJykge1xuICAgICAgdG9wUG9pbnQgLT0gKHdpbkhlaWdodCAtIChlbGVtSGVpZ2h0ICsgbUJ0bSkpO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKHdpbkhlaWdodCAtIG1CdG0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvL3RoaXMgd291bGQgYmUgdGhlIHN0aWNrVG86IGJvdGggb3B0aW9uLi4uIHRyaWNreVxuICAgIH1cblxuICAgIHRoaXMudG9wUG9pbnQgPSB0b3BQb2ludDtcbiAgICB0aGlzLmJvdHRvbVBvaW50ID0gYm90dG9tUG9pbnQ7XG5cbiAgICBpZiAoY2IpIHsgY2IoKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBjdXJyZW50IHN0aWNreSBlbGVtZW50LlxuICAgKiBSZXNldHMgdGhlIGVsZW1lbnQgdG8gdGhlIHRvcCBwb3NpdGlvbiBmaXJzdC5cbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMsIEpTLWFkZGVkIGNzcyBwcm9wZXJ0aWVzIGFuZCBjbGFzc2VzLCBhbmQgdW53cmFwcyB0aGUgJGVsZW1lbnQgaWYgdGhlIEpTIGFkZGVkIHRoZSAkY29udGFpbmVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgJHt0aGlzLm9wdGlvbnMuc3RpY2t5Q2xhc3N9IGlzLWFuY2hvcmVkIGlzLWF0LXRvcGApXG4gICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgIGhlaWdodDogJycsXG4gICAgICAgICAgICAgICAgICAgdG9wOiAnJyxcbiAgICAgICAgICAgICAgICAgICBib3R0b206ICcnLFxuICAgICAgICAgICAgICAgICAgICdtYXgtd2lkdGgnOiAnJ1xuICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJyk7XG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub2ZmKCdjaGFuZ2UuemYuc3RpY2t5Jyk7XG4gICAgfVxuICAgICQod2luZG93KS5vZmYodGhpcy5zY3JvbGxMaXN0ZW5lcik7XG5cbiAgICBpZiAodGhpcy53YXNXcmFwcGVkKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRjb250YWluZXIucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKVxuICAgICAgICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJydcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuU3RpY2t5LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQ3VzdG9taXphYmxlIGNvbnRhaW5lciB0ZW1wbGF0ZS4gQWRkIHlvdXIgb3duIGNsYXNzZXMgZm9yIHN0eWxpbmcgYW5kIHNpemluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnJmx0O2RpdiBkYXRhLXN0aWNreS1jb250YWluZXIgY2xhc3M9XCJzbWFsbC02IGNvbHVtbnNcIiZndDsmbHQ7L2RpdiZndDsnXG4gICAqL1xuICBjb250YWluZXI6ICc8ZGl2IGRhdGEtc3RpY2t5LWNvbnRhaW5lcj48L2Rpdj4nLFxuICAvKipcbiAgICogTG9jYXRpb24gaW4gdGhlIHZpZXcgdGhlIGVsZW1lbnQgc3RpY2tzIHRvLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b3AnXG4gICAqL1xuICBzdGlja1RvOiAndG9wJyxcbiAgLyoqXG4gICAqIElmIGFuY2hvcmVkIHRvIGEgc2luZ2xlIGVsZW1lbnQsIHRoZSBpZCBvZiB0aGF0IGVsZW1lbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZCdcbiAgICovXG4gIGFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSB0b3AgYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6dG9wJ1xuICAgKi9cbiAgdG9wQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIGJvdHRvbSBhbmNob3IuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZDpib3R0b20nXG4gICAqL1xuICBidG1BbmNob3I6ICcnLFxuICAvKipcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIHRvcCBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIG1hcmdpblRvcDogMSxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSBib3R0b20gb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Cb3R0b206IDEsXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IHN0cmluZyB0aGF0IGlzIHRoZSBtaW5pbXVtIHNjcmVlbiBzaXplIGFuIGVsZW1lbnQgc2hvdWxkIGJlY29tZSBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcbiAgICovXG4gIHN0aWNreU9uOiAnbWVkaXVtJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGVsZW1lbnQsIGFuZCByZW1vdmVkIG9uIGRlc3RydWN0aW9uLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3lgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzdGlja3knXG4gICAqL1xuICBzdGlja3lDbGFzczogJ3N0aWNreScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBjb250YWluZXIuIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreS1jb250YWluZXJgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzdGlja3ktY29udGFpbmVyJ1xuICAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdzdGlja3ktY29udGFpbmVyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBzY3JvbGwgZXZlbnRzIGJldHdlZW4gdGhlIHBsdWdpbidzIHJlY2FsY3VsYXRpbmcgc3RpY2t5IHBvaW50cy4gU2V0dGluZyBpdCB0byBgMGAgd2lsbCBjYXVzZSBpdCB0byByZWNhbGMgZXZlcnkgc2Nyb2xsIGV2ZW50LCBzZXR0aW5nIGl0IHRvIGAtMWAgd2lsbCBwcmV2ZW50IHJlY2FsYyBvbiBzY3JvbGwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIGNoZWNrRXZlcnk6IC0xXG59O1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjYWxjdWxhdGUgZW0gdmFsdWVzXG4gKiBAcGFyYW0gTnVtYmVyIHtlbX0gLSBudW1iZXIgb2YgZW0ncyB0byBjYWxjdWxhdGUgaW50byBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZW1DYWxjKGVtKSB7XG4gIHJldHVybiBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBudWxsKS5mb250U2l6ZSwgMTApICogZW07XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTdGlja3ksICdTdGlja3knKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRhYnMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRhYnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlciBpZiB0YWJzIGNvbnRhaW4gaW1hZ2VzXG4gKi9cblxuY2xhc3MgVGFicyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVGFicyNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gdGFicy5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUYWJzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVGFicycpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1RhYnMnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIC8vICdUQUInOiAnbmV4dCcsXG4gICAgICAvLyAnU0hJRlRfVEFCJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWJzIGJ5IHNob3dpbmcgYW5kIGZvY3VzaW5nIChpZiBhdXRvRm9jdXM9dHJ1ZSkgdGhlIHByZXNldCBhY3RpdmUgdGFiLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJHRhYlRpdGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcbiAgICB0aGlzLiR0YWJDb250ZW50ID0gJChgW2RhdGEtdGFicy1jb250ZW50PVwiJHt0aGlzLiRlbGVtZW50WzBdLmlkfVwiXWApO1xuXG4gICAgdGhpcy4kdGFiVGl0bGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgJGxpbmsgPSAkZWxlbS5maW5kKCdhJyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkZWxlbS5oYXNDbGFzcygnaXMtYWN0aXZlJyksXG4gICAgICAgICAgaGFzaCA9ICRsaW5rWzBdLmhhc2guc2xpY2UoMSksXG4gICAgICAgICAgbGlua0lkID0gJGxpbmtbMF0uaWQgPyAkbGlua1swXS5pZCA6IGAke2hhc2h9LWxhYmVsYCxcbiAgICAgICAgICAkdGFiQ29udGVudCA9ICQoYCMke2hhc2h9YCk7XG5cbiAgICAgICRlbGVtLmF0dHIoeydyb2xlJzogJ3ByZXNlbnRhdGlvbid9KTtcblxuICAgICAgJGxpbmsuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaGFzaCxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBpc0FjdGl2ZSxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgJHRhYkNvbnRlbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYnBhbmVsJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgaWYoaXNBY3RpdmUgJiYgX3RoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xuICAgICAgICAkbGluay5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB2YXIgJGltYWdlcyA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZCgnaW1nJyk7XG5cbiAgICAgIGlmICgkaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldEhlaWdodCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy5fYWRkS2V5SGFuZGxlcigpO1xuICAgIHRoaXMuX2FkZENsaWNrSGFuZGxlcigpO1xuICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IG51bGw7XG4gICAgXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyID0gdGhpcy5fc2V0SGVpZ2h0LmJpbmQodGhpcyk7XG4gICAgICBcbiAgICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBjbGljayBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZENsaWNrSGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9mZignY2xpY2suemYudGFicycpXG4gICAgICAub24oJ2NsaWNrLnpmLnRhYnMnLCBgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkKHRoaXMpKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5Ym9hcmQgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRLZXlIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICRmaXJzdFRhYiA9IF90aGlzLiRlbGVtZW50LmZpbmQoJ2xpOmZpcnN0LW9mLXR5cGUnKTtcbiAgICB2YXIgJGxhc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpsYXN0LW9mLXR5cGUnKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5vZmYoJ2tleWRvd24uemYudGFicycpLm9uKCdrZXlkb3duLnpmLnRhYnMnLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmIChlLndoaWNoID09PSA5KSByZXR1cm47XG4gICAgICBcblxuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcbiAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxuICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICRuZXh0RWxlbWVudDtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy53cmFwT25LZXlzKSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSBpID09PSAwID8gJGVsZW1lbnRzLmxhc3QoKSA6ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gaSA9PT0gJGVsZW1lbnRzLmxlbmd0aCAtMSA/ICRlbGVtZW50cy5maXJzdCgpIDogJGVsZW1lbnRzLmVxKGkrMSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1pbihpKzEsICRlbGVtZW50cy5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnVGFicycsIHtcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJGVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJGVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRwcmV2RWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkbmV4dEVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIHRhYiBgJHRhcmdldENvbnRlbnRgIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBvcGVuLlxuICAgKiBAZmlyZXMgVGFicyNjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaGFuZGxlVGFiQ2hhbmdlKCR0YXJnZXQpIHtcbiAgICB2YXIgJHRhYkxpbmsgPSAkdGFyZ2V0LmZpbmQoJ1tyb2xlPVwidGFiXCJdJyksXG4gICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxuICAgICAgICAkdGFyZ2V0Q29udGVudCA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZChoYXNoKSxcbiAgICAgICAgJG9sZFRhYiA9IHRoaXMuJGVsZW1lbnQuXG4gICAgICAgICAgZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc30uaXMtYWN0aXZlYClcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpXG4gICAgICAgICAgLmZpbmQoJ1tyb2xlPVwidGFiXCJdJylcbiAgICAgICAgICAuYXR0cih7ICdhcmlhLXNlbGVjdGVkJzogJ2ZhbHNlJyB9KTtcblxuICAgICQoYCMkeyRvbGRUYWIuYXR0cignYXJpYS1jb250cm9scycpfWApXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpXG4gICAgICAuYXR0cih7ICdhcmlhLWhpZGRlbic6ICd0cnVlJyB9KTtcblxuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJHRhYkxpbmsuYXR0cih7J2FyaWEtc2VsZWN0ZWQnOiAndHJ1ZSd9KTtcblxuICAgICR0YXJnZXRDb250ZW50XG4gICAgICAuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpXG4gICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogJ2ZhbHNlJ30pO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBzdWNjZXNzZnVsbHkgY2hhbmdlZCB0YWJzLlxuICAgICAqIEBldmVudCBUYWJzI2NoYW5nZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlLnpmLnRhYnMnLCBbJHRhcmdldF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYyBtZXRob2QgZm9yIHNlbGVjdGluZyBhIGNvbnRlbnQgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAcGFyYW0ge2pRdWVyeSB8IFN0cmluZ30gZWxlbSAtIGpRdWVyeSBvYmplY3Qgb3Igc3RyaW5nIG9mIHRoZSBpZCBvZiB0aGUgcGFuZSB0byBkaXNwbGF5LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNlbGVjdFRhYihlbGVtKSB7XG4gICAgdmFyIGlkU3RyO1xuXG4gICAgaWYgKHR5cGVvZiBlbGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgaWRTdHIgPSBlbGVtWzBdLmlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZFN0ciA9IGVsZW07XG4gICAgfVxuXG4gICAgaWYgKGlkU3RyLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIGlkU3RyID0gYCMke2lkU3RyfWA7XG4gICAgfVxuXG4gICAgdmFyICR0YXJnZXQgPSB0aGlzLiR0YWJUaXRsZXMuZmluZChgW2hyZWY9XCIke2lkU3RyfVwiXWApLnBhcmVudChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcblxuICAgIHRoaXMuX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0KTtcbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGhlaWdodCBvZiBlYWNoIHBhbmVsIHRvIHRoZSBoZWlnaHQgb2YgdGhlIHRhbGxlc3QgcGFuZWwuXG4gICAqIElmIGVuYWJsZWQgaW4gb3B0aW9ucywgZ2V0cyBjYWxsZWQgb24gbWVkaWEgcXVlcnkgY2hhbmdlLlxuICAgKiBJZiBsb2FkaW5nIGNvbnRlbnQgdmlhIGV4dGVybmFsIHNvdXJjZSwgY2FuIGJlIGNhbGxlZCBkaXJlY3RseSBvciB3aXRoIF9yZWZsb3cuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEhlaWdodCgpIHtcbiAgICB2YXIgbWF4ID0gMDtcbiAgICB0aGlzLiR0YWJDb250ZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5jc3MoJ2hlaWdodCcsICcnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBwYW5lbCA9ICQodGhpcyksXG4gICAgICAgICAgICBpc0FjdGl2ZSA9IHBhbmVsLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICAgICAgcGFuZWwuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nLCAnZGlzcGxheSc6ICdibG9jayd9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0ZW1wID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7XG4gICAgICAgICAgICAndmlzaWJpbGl0eSc6ICcnLFxuICAgICAgICAgICAgJ2Rpc3BsYXknOiAnJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XG4gICAgICB9KVxuICAgICAgLmNzcygnaGVpZ2h0JywgYCR7bWF4fXB4YCk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gdGFicy5cbiAgICogQGZpcmVzIFRhYnMjZGVzdHJveWVkXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApXG4gICAgICAub2ZmKCcuemYudGFicycpLmhpZGUoKS5lbmQoKVxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuaGlkZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgaWYgKHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciAhPSBudWxsKSB7XG4gICAgICAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5UYWJzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3dzIHRoZSB3aW5kb3cgdG8gc2Nyb2xsIHRvIGNvbnRlbnQgb2YgYWN0aXZlIHBhbmUgb24gbG9hZCBpZiBzZXQgdG8gdHJ1ZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiBmYWxzZSxcblxuICAvKipcbiAgICogQWxsb3dzIGtleWJvYXJkIGlucHV0IHRvICd3cmFwJyBhcm91bmQgdGhlIHRhYiBsaW5rcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICB3cmFwT25LZXlzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRhYiBjb250ZW50IHBhbmVzIHRvIG1hdGNoIGhlaWdodHMgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG1hdGNoSGVpZ2h0OiBmYWxzZSxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBgbGlgJ3MgaW4gdGFiIGxpbmsgbGlzdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndGFicy10aXRsZSdcbiAgICovXG4gIGxpbmtDbGFzczogJ3RhYnMtdGl0bGUnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBjb250ZW50IGNvbnRhaW5lcnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RhYnMtcGFuZWwnXG4gICAqL1xuICBwYW5lbENsYXNzOiAndGFicy1wYW5lbCdcbn07XG5cbmZ1bmN0aW9uIGNoZWNrQ2xhc3MoJGVsZW0pe1xuICByZXR1cm4gJGVsZW0uaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVGFicywgJ1RhYnMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvZ2dsZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvZ2dsZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9nZ2xlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRvZ2dsZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9nZ2xlciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9nZ2xlci5kZWZhdWx0cywgZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xhc3NOYW1lID0gJyc7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb2dnbGVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFRvZ2dsZXIgcGx1Z2luIGJ5IHBhcnNpbmcgdGhlIHRvZ2dsZSBjbGFzcyBmcm9tIGRhdGEtdG9nZ2xlciwgb3IgYW5pbWF0aW9uIGNsYXNzZXMgZnJvbSBkYXRhLWFuaW1hdGUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlucHV0O1xuICAgIC8vIFBhcnNlIGFuaW1hdGlvbiBjbGFzc2VzIGlmIHRoZXkgd2VyZSBzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIGlucHV0ID0gdGhpcy5vcHRpb25zLmFuaW1hdGUuc3BsaXQoJyAnKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25JbiA9IGlucHV0WzBdO1xuICAgICAgdGhpcy5hbmltYXRpb25PdXQgPSBpbnB1dFsxXSB8fCBudWxsO1xuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHBhcnNlIHRvZ2dsZSBjbGFzc1xuICAgIGVsc2Uge1xuICAgICAgaW5wdXQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3RvZ2dsZXInKTtcbiAgICAgIC8vIEFsbG93IGZvciBhIC4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IGlucHV0WzBdID09PSAnLicgPyBpbnB1dC5zbGljZSgxKSA6IGlucHV0O1xuICAgIH1cblxuICAgIC8vIEFkZCBBUklBIGF0dHJpYnV0ZXMgdG8gdHJpZ2dlcnNcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkO1xuICAgICQoYFtkYXRhLW9wZW49XCIke2lkfVwiXSwgW2RhdGEtY2xvc2U9XCIke2lkfVwiXSwgW2RhdGEtdG9nZ2xlPVwiJHtpZH1cIl1gKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG4gICAgLy8gSWYgdGhlIHRhcmdldCBpcyBoaWRkZW4sIGFkZCBhcmlhLWhpZGRlblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgdG9nZ2xlIHRyaWdnZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZigndG9nZ2xlLnpmLnRyaWdnZXInKS5vbigndG9nZ2xlLnpmLnRyaWdnZXInLCB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSB0YXJnZXQgY2xhc3Mgb24gdGhlIHRhcmdldCBlbGVtZW50LiBBbiBldmVudCBpcyBmaXJlZCBmcm9tIHRoZSBvcmlnaW5hbCB0cmlnZ2VyIGRlcGVuZGluZyBvbiBpZiB0aGUgcmVzdWx0YW50IHN0YXRlIHdhcyBcIm9uXCIgb3IgXCJvZmZcIi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29mZlxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIHRoaXNbIHRoaXMub3B0aW9ucy5hbmltYXRlID8gJ190b2dnbGVBbmltYXRlJyA6ICdfdG9nZ2xlQ2xhc3MnXSgpO1xuICB9XG5cbiAgX3RvZ2dsZUNsYXNzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQudG9nZ2xlQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuXG4gICAgdmFyIGlzT24gPSB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMuY2xhc3NOYW1lKTtcbiAgICBpZiAoaXNPbikge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29uXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXMgbm90IGhhdmUgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb2ZmXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVBUklBKGlzT24pO1xuICB9XG5cbiAgX3RvZ2dsZUFuaW1hdGUoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbkluLCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZUFSSUEodHJ1ZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbk91dCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKGZhbHNlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgX3VwZGF0ZUFSSUEoaXNPbikge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIGlzT24gPyB0cnVlIDogZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiBUb2dnbGVyIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50b2dnbGVyJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvZ2dsZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUZWxscyB0aGUgcGx1Z2luIGlmIHRoZSBlbGVtZW50IHNob3VsZCBhbmltYXRlZCB3aGVuIHRvZ2dsZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9nZ2xlciwgJ1RvZ2dsZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvb2x0aXAgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvb2x0aXBcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9vbHRpcCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgVG9vbHRpcC5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUb29sdGlwI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCBhIHRvb2x0aXAgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb2JqZWN0IHRvIGV4dGVuZCB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUb29sdGlwLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0b29sdGlwIGJ5IHNldHRpbmcgdGhlIGNyZWF0aW5nIHRoZSB0aXAgZWxlbWVudCwgYWRkaW5nIGl0J3MgdGV4dCwgc2V0dGluZyBwcml2YXRlIHZhcmlhYmxlcyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIG9uIHRoZSBhbmNob3IuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZWxlbUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAndG9vbHRpcCcpO1xuXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyB8fCB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMuJGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucy50aXBUZXh0ID0gdGhpcy5vcHRpb25zLnRpcFRleHQgfHwgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLm9wdGlvbnMudGVtcGxhdGUgPyAkKHRoaXMub3B0aW9ucy50ZW1wbGF0ZSkgOiB0aGlzLl9idWlsZFRlbXBsYXRlKGVsZW1JZCk7XG5cbiAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC50ZXh0KHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICd0aXRsZSc6ICcnLFxuICAgICAgJ2FyaWEtZGVzY3JpYmVkYnknOiBlbGVtSWQsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXRvZ2dsZSc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6IGVsZW1JZFxuICAgIH0pLmFkZENsYXNzKHRoaXMudHJpZ2dlckNsYXNzKTtcblxuICAgIC8vaGVscGVyIHZhcmlhYmxlcyB0byB0cmFjayBtb3ZlbWVudCBvbiBjb2xsaXNpb25zXG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogR3JhYnMgdGhlIGN1cnJlbnQgcG9zaXRpb25pbmcgY2xhc3MsIGlmIHByZXNlbnQsIGFuZCByZXR1cm5zIHRoZSB2YWx1ZSBvciBhbiBlbXB0eSBzdHJpbmcuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0UG9zaXRpb25DbGFzcyhlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50KSB7IHJldHVybiAnJzsgfVxuICAgIC8vIHZhciBwb3NpdGlvbiA9IGVsZW1lbnQuYXR0cignY2xhc3MnKS5tYXRjaCgvdG9wfGxlZnR8cmlnaHQvZyk7XG4gICAgdmFyIHBvc2l0aW9uID0gZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goL1xcYih0b3B8bGVmdHxyaWdodClcXGIvZyk7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gPyBwb3NpdGlvblswXSA6ICcnO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcbiAgLyoqXG4gICAqIGJ1aWxkcyB0aGUgdG9vbHRpcCBlbGVtZW50LCBhZGRzIGF0dHJpYnV0ZXMsIGFuZCByZXR1cm5zIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9idWlsZFRlbXBsYXRlKGlkKSB7XG4gICAgdmFyIHRlbXBsYXRlQ2xhc3NlcyA9IChgJHt0aGlzLm9wdGlvbnMudG9vbHRpcENsYXNzfSAke3RoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzfSAke3RoaXMub3B0aW9ucy50ZW1wbGF0ZUNsYXNzZXN9YCkudHJpbSgpO1xuICAgIHZhciAkdGVtcGxhdGUgPSAgJCgnPGRpdj48L2Rpdj4nKS5hZGRDbGFzcyh0ZW1wbGF0ZUNsYXNzZXMpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndG9vbHRpcCcsXG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2UsXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICByZXR1cm4gJHRlbXBsYXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uaW5nIGNsYXNzIHRvIHRyeVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xuXG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygndG9wJyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldHMgdGhlIHBvc2l0aW9uIGNsYXNzIG9mIGFuIGVsZW1lbnQgYW5kIHJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB1bnRpbCB0aGVyZSBhcmUgbm8gbW9yZSBwb3NzaWJsZSBwb3NpdGlvbnMgdG8gYXR0ZW1wdCwgb3IgdGhlIHRvb2x0aXAgZWxlbWVudCBpcyBubyBsb25nZXIgY29sbGlkaW5nLlxuICAgKiBpZiB0aGUgdG9vbHRpcCBpcyBsYXJnZXIgdGhhbiB0aGUgc2NyZWVuIHdpZHRoLCBkZWZhdWx0IHRvIGZ1bGwgd2lkdGggLSBhbnkgdXNlciBzZWxlY3RlZCBtYXJnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkdGlwRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQsXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICgoJHRpcERpbXMud2lkdGggPj0gJHRpcERpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkpKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgIC8vIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6ICRhbmNob3JEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCdjZW50ZXIgJyArIChwb3NpdGlvbiB8fCAnYm90dG9tJyksIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xuXG4gICAgd2hpbGUoIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkgJiYgdGhpcy5jb3VudGVyKSB7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHJldmVhbHMgdGhlIHRvb2x0aXAsIGFuZCBmaXJlcyBhbiBldmVudCB0byBjbG9zZSBhbnkgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNjbG9zZW1lXG4gICAqIEBmaXJlcyBUb29sdGlwI3Nob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd09uICE9PSAnYWxsJyAmJiAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLnNob3dPbikpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoJ1RoZSBzY3JlZW4gaXMgdG9vIHNtYWxsIHRvIGRpc3BsYXkgdGhpcyB0b29sdGlwJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5zaG93KCk7XG4gICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIGFsbCBvdGhlciBvcGVuIHRvb2x0aXBzIG9uIHRoZSBwYWdlXG4gICAgICogQGV2ZW50IENsb3NlbWUjdG9vbHRpcFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi50b29sdGlwJywgdGhpcy50ZW1wbGF0ZS5hdHRyKCdpZCcpKTtcblxuXG4gICAgdGhpcy50ZW1wbGF0ZS5hdHRyKHtcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IHRydWUsXG4gICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZVxuICAgIH0pO1xuICAgIF90aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnRlbXBsYXRlKTtcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5oaWRlKCkuY3NzKCd2aXNpYmlsaXR5JywgJycpLmZhZGVJbih0aGlzLm9wdGlvbnMuZmFkZUluRHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgLy9tYXliZSBkbyBzdHVmZj9cbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSB0b29sdGlwIGlzIHNob3duXG4gICAgICogQGV2ZW50IFRvb2x0aXAjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi50b29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogSGlkZXMgdGhlIGN1cnJlbnQgdG9vbHRpcCwgYW5kIHJlc2V0cyB0aGUgcG9zaXRpb25pbmcgY2xhc3MgaWYgaXQgd2FzIGNoYW5nZWQgZHVlIHRvIGNvbGxpc2lvblxuICAgKiBAZmlyZXMgVG9vbHRpcCNoaWRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgaGlkZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnaGlkaW5nJywgdGhpcy4kZWxlbWVudC5kYXRhKCd5ZXRpLWJveCcpKTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUuc3RvcCgpLmF0dHIoe1xuICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlXG4gICAgfSkuZmFkZU91dCh0aGlzLm9wdGlvbnMuZmFkZU91dER1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgICBpZiAoX3RoaXMuY2xhc3NDaGFuZ2VkKSB7XG4gICAgICAgIF90aGlzLnRlbXBsYXRlXG4gICAgICAgICAgICAgLnJlbW92ZUNsYXNzKF90aGlzLl9nZXRQb3NpdGlvbkNsYXNzKF90aGlzLnRlbXBsYXRlKSlcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoX3RoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzKTtcblxuICAgICAgIF90aGlzLnVzZWRQb3NpdGlvbnMgPSBbXTtcbiAgICAgICBfdGhpcy5jb3VudGVyID0gNDtcbiAgICAgICBfdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBmaXJlcyB3aGVuIHRoZSB0b29sdGlwIGlzIGhpZGRlblxuICAgICAqIEBldmVudCBUb29sdGlwI2hpZGVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgdG9vbHRpcCBhbmQgaXRzIGFuY2hvclxuICAgKiBUT0RPIGNvbWJpbmUgc29tZSBvZiB0aGUgbGlzdGVuZXJzIGxpa2UgZm9jdXMgYW5kIG1vdXNlZW50ZXIsIGV0Yy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgJHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZTtcbiAgICB2YXIgaXNGb2N1cyA9IGZhbHNlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyKSB7XG5cbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbignbW91c2VlbnRlci56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoIV90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5zaG93KCk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5vbignbW91c2VsZWF2ZS56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgIGlmICghaXNGb2N1cyB8fCAoX3RoaXMuaXNDbGljayAmJiAhX3RoaXMub3B0aW9ucy5jbGlja09wZW4pKSB7XG4gICAgICAgICAgX3RoaXMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3Blbikge1xuICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGlmIChfdGhpcy5pc0NsaWNrKSB7XG4gICAgICAgICAgLy9fdGhpcy5oaWRlKCk7XG4gICAgICAgICAgLy8gX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF90aGlzLmlzQ2xpY2sgPSB0cnVlO1xuICAgICAgICAgIGlmICgoX3RoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIgfHwgIV90aGlzLiRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JykpICYmICFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVGb3JUb3VjaCkge1xuICAgICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCd0YXAuemYudG9vbHRpcCB0b3VjaGVuZC56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBfdGhpcy5pc0FjdGl2ZSA/IF90aGlzLmhpZGUoKSA6IF90aGlzLnNob3coKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgLy8gJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgIC8vICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5oaWRlLmJpbmQodGhpcylcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5oaWRlLmJpbmQodGhpcylcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbignZm9jdXMuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaXNGb2N1cyA9IHRydWU7XG4gICAgICAgIGlmIChfdGhpcy5pc0NsaWNrKSB7XG4gICAgICAgICAgLy8gSWYgd2UncmUgbm90IHNob3dpbmcgb3BlbiBvbiBjbGlja3MsIHdlIG5lZWQgdG8gcHJldGVuZCBhIGNsaWNrLWxhdW5jaGVkIGZvY3VzIGlzbid0XG4gICAgICAgICAgLy8gYSByZWFsIGZvY3VzLCBvdGhlcndpc2Ugb24gaG92ZXIgYW5kIGNvbWUgYmFjayB3ZSBnZXQgYmFkIGJlaGF2aW9yXG4gICAgICAgICAgaWYoIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IGlzRm9jdXMgPSBmYWxzZTsgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIC5vbignZm9jdXNvdXQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaXNGb2N1cyA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgIH0pXG5cbiAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICBfdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogYWRkcyBhIHRvZ2dsZSBtZXRob2QsIGluIGFkZGl0aW9uIHRvIHRoZSBzdGF0aWMgc2hvdygpICYgaGlkZSgpIGZ1bmN0aW9uc1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvdygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiB0b29sdGlwLCByZW1vdmVzIHRlbXBsYXRlIGVsZW1lbnQgZnJvbSB0aGUgdmlldy5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cigndGl0bGUnLCB0aGlzLnRlbXBsYXRlLnRleHQoKSlcbiAgICAgICAgICAgICAgICAgLm9mZignLnpmLnRyaWdnZXIgLnpmLnRvb3RpcCcpXG4gICAgICAgICAgICAgICAgLy8gIC5yZW1vdmVDbGFzcygnaGFzLXRpcCcpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEteWV0aS1ib3gnKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS10b2dnbGUnKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1yZXNpemUnKTtcblxuICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlKCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9vbHRpcC5kZWZhdWx0cyA9IHtcbiAgZGlzYWJsZUZvclRvdWNoOiBmYWxzZSxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBiZWZvcmUgYSB0b29sdGlwIHNob3VsZCBvcGVuIG9uIGhvdmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDIwMFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIGludG8gdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxNTBcbiAgICovXG4gIGZhZGVJbkR1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgb3V0IG9mIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTUwXG4gICAqL1xuICBmYWRlT3V0RHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIERpc2FibGVzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgdGhlIHRvb2x0aXAgaWYgc2V0IHRvIHRydWVcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZUhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIE9wdGlvbmFsIGFkZHRpb25hbCBjbGFzc2VzIHRvIGFwcGx5IHRvIHRoZSB0b29sdGlwIHRlbXBsYXRlIG9uIGluaXQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ215LWNvb2wtdGlwLWNsYXNzJ1xuICAgKi9cbiAgdGVtcGxhdGVDbGFzc2VzOiAnJyxcbiAgLyoqXG4gICAqIE5vbi1vcHRpb25hbCBjbGFzcyBhZGRlZCB0byB0b29sdGlwIHRlbXBsYXRlcy4gRm91bmRhdGlvbiBkZWZhdWx0IGlzICd0b29sdGlwJy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9vbHRpcCdcbiAgICovXG4gIHRvb2x0aXBDbGFzczogJ3Rvb2x0aXAnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgdG9vbHRpcCBhbmNob3IgZWxlbWVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaGFzLXRpcCdcbiAgICovXG4gIHRyaWdnZXJDbGFzczogJ2hhcy10aXAnLFxuICAvKipcbiAgICogTWluaW11bSBicmVha3BvaW50IHNpemUgYXQgd2hpY2ggdG8gb3BlbiB0aGUgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc21hbGwnXG4gICAqL1xuICBzaG93T246ICdzbWFsbCcsXG4gIC8qKlxuICAgKiBDdXN0b20gdGVtcGxhdGUgdG8gYmUgdXNlZCB0byBnZW5lcmF0ZSBtYXJrdXAgZm9yIHRvb2x0aXAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgY2xhc3M9XCJ0b29sdGlwXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgdGVtcGxhdGU6ICcnLFxuICAvKipcbiAgICogVGV4dCBkaXNwbGF5ZWQgaW4gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnU29tZSBjb29sIHNwYWNlIGZhY3QgaGVyZS4nXG4gICAqL1xuICB0aXBUZXh0OiAnJyxcbiAgdG91Y2hDbG9zZVRleHQ6ICdUYXAgdG8gY2xvc2UuJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdG9vbHRpcCB0byByZW1haW4gb3BlbiBpZiB0cmlnZ2VyZWQgd2l0aCBhIGNsaWNrIG9yIHRvdWNoIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrT3BlbjogdHJ1ZSxcbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgcG9zaXRpb25pbmcgY2xhc3Nlcywgc2V0IGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b3AnXG4gICAqL1xuICBwb3NpdGlvbkNsYXNzOiAnJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgcHVzaCBhd2F5IGZyb20gdGhlIGFuY2hvciBvbiB0aGUgWSBheGlzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICB2T2Zmc2V0OiAxMCxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgcHVzaCBhd2F5IGZyb20gdGhlIGFuY2hvciBvbiB0aGUgWCBheGlzLCBpZiBhbGlnbmVkIHRvIGEgc2lkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMlxuICAgKi9cbiAgaE9mZnNldDogMTJcbn07XG5cbi8qKlxuICogVE9ETyB1dGlsaXplIHJlc2l6ZSBldmVudCB0cmlnZ2VyXG4gKi9cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvb2x0aXAsICdUb29sdGlwJyk7XG5cbn0oalF1ZXJ5KTsiLCJ2YXIgb2JqZWN0Rml0SW1hZ2VzPWZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIGU9XCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUlBQUFQLy8vd0FBQUNINUJBRUFBQUFBTEFBQUFBQUJBQUVBQUFJQ1JBRUFPdz09XCI7dmFyIHQ9LyhvYmplY3QtZml0fG9iamVjdC1wb3NpdGlvbilcXHMqOlxccyooW147JFwiJ1xcc10rKS9nO3ZhciBpPVwib2JqZWN0LWZpdFwiaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlcIikuc3R5bGU7dmFyIG49ZmFsc2U7ZnVuY3Rpb24gcihlKXt2YXIgaT1nZXRDb21wdXRlZFN0eWxlKGUpLmZvbnRGYW1pbHk7dmFyIG47dmFyIHI9e307d2hpbGUoKG49dC5leGVjKGkpKSE9PW51bGwpe3JbblsxXV09blsyXX1yZXR1cm4gcn1mdW5jdGlvbiBvKHQsaSl7dmFyIG49cih0KTtpZighbltcIm9iamVjdC1maXRcIl18fG5bXCJvYmplY3QtZml0XCJdPT09XCJmaWxsXCIpe3JldHVybn1pPWl8fHQuY3VycmVudFNyY3x8dC5zcmM7aWYodC5zcmNzZXQpe3Quc3Jjc2V0PVwiXCJ9aWYoIXRbZV0pe3Quc3JjPWU7YSh0KX10W2VdPXRbZV18fHtzOml9O3Quc3R5bGUuYmFja2dyb3VuZEltYWdlPVwidXJsKFwiK2krXCIpXCI7dC5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb249bltcIm9iamVjdC1wb3NpdGlvblwiXXx8XCJjZW50ZXJcIjt0LnN0eWxlLmJhY2tncm91bmRSZXBlYXQ9XCJuby1yZXBlYXRcIjtpZihuW1wib2JqZWN0LWZpdFwiXS5pbmRleE9mKFwic2NhbGUtZG93blwiKTwwKXt0LnN0eWxlLmJhY2tncm91bmRTaXplPW5bXCJvYmplY3QtZml0XCJdLnJlcGxhY2UoXCJub25lXCIsXCJhdXRvXCIpfWVsc2V7aWYoIXRbZV0uaSl7dFtlXS5pPW5ldyBJbWFnZTt0W2VdLmkuc3JjPWl9KGZ1bmN0aW9uIG8oKXtpZih0W2VdLmkubmF0dXJhbFdpZHRoKXtpZih0W2VdLmkubmF0dXJhbFdpZHRoPnQud2lkdGh8fHRbZV0uaS5uYXR1cmFsSGVpZ2h0PnQuaGVpZ2h0KXt0LnN0eWxlLmJhY2tncm91bmRTaXplPVwiY29udGFpblwifWVsc2V7dC5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT1cImF1dG9cIn1yZXR1cm59c2V0VGltZW91dChvLDEwMCl9KSgpfX1mdW5jdGlvbiBhKHQpe3ZhciBpPXtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdFtlXS5zfSxzZXQ6ZnVuY3Rpb24oaSl7ZGVsZXRlIHRbZV0uaTtyZXR1cm4gbyh0LGkpfX07T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsXCJzcmNcIixpKTtPYmplY3QuZGVmaW5lUHJvcGVydHkodCxcImN1cnJlbnRTcmNcIix7Z2V0OmkuZ2V0fSl9ZnVuY3Rpb24gYyhlKXt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLGYuYmluZChudWxsLGUpKX1mdW5jdGlvbiB1KGUpe2lmKGUudGFyZ2V0LnRhZ05hbWU9PT1cIklNR1wiKXtvKGUudGFyZ2V0KX19ZnVuY3Rpb24gZihlLHQpe2lmKGkpe3JldHVybiBmYWxzZX12YXIgcj0hbiYmIWU7dD10fHx7fTtlPWV8fFwiaW1nXCI7aWYodHlwZW9mIGU9PT1cInN0cmluZ1wiKXtlPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIil9ZWxzZSBpZighZS5sZW5ndGgpe2U9W2VdfWZvcih2YXIgYT0wO2E8ZS5sZW5ndGg7YSsrKXtvKGVbYV0pfWlmKHIpe2RvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIix1LHRydWUpO249dHJ1ZTtlPVwiaW1nXCJ9aWYodC53YXRjaE1RKXtjKGUpfX1yZXR1cm4gZn0oKTtcbiIsIi8qISBqUXVlcnkgVmFsaWRhdGlvbiBQbHVnaW4gLSB2MS4xNS4xIC0gNy8yMi8yMDE2XG4gKiBodHRwOi8vanF1ZXJ5dmFsaWRhdGlvbi5vcmcvXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTYgSsO2cm4gWmFlZmZlcmVyOyBMaWNlbnNlZCBNSVQgKi9cbiFmdW5jdGlvbihhKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtcImpxdWVyeVwiXSxhKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1hKHJlcXVpcmUoXCJqcXVlcnlcIikpOmEoalF1ZXJ5KX0oZnVuY3Rpb24oYSl7YS5leHRlbmQoYS5mbix7dmFsaWRhdGU6ZnVuY3Rpb24oYil7aWYoIXRoaXMubGVuZ3RoKXJldHVybiB2b2lkKGImJmIuZGVidWcmJndpbmRvdy5jb25zb2xlJiZjb25zb2xlLndhcm4oXCJOb3RoaW5nIHNlbGVjdGVkLCBjYW4ndCB2YWxpZGF0ZSwgcmV0dXJuaW5nIG5vdGhpbmcuXCIpKTt2YXIgYz1hLmRhdGEodGhpc1swXSxcInZhbGlkYXRvclwiKTtyZXR1cm4gYz9jOih0aGlzLmF0dHIoXCJub3ZhbGlkYXRlXCIsXCJub3ZhbGlkYXRlXCIpLGM9bmV3IGEudmFsaWRhdG9yKGIsdGhpc1swXSksYS5kYXRhKHRoaXNbMF0sXCJ2YWxpZGF0b3JcIixjKSxjLnNldHRpbmdzLm9uc3VibWl0JiYodGhpcy5vbihcImNsaWNrLnZhbGlkYXRlXCIsXCI6c3VibWl0XCIsZnVuY3Rpb24oYil7Yy5zZXR0aW5ncy5zdWJtaXRIYW5kbGVyJiYoYy5zdWJtaXRCdXR0b249Yi50YXJnZXQpLGEodGhpcykuaGFzQ2xhc3MoXCJjYW5jZWxcIikmJihjLmNhbmNlbFN1Ym1pdD0hMCksdm9pZCAwIT09YSh0aGlzKS5hdHRyKFwiZm9ybW5vdmFsaWRhdGVcIikmJihjLmNhbmNlbFN1Ym1pdD0hMCl9KSx0aGlzLm9uKFwic3VibWl0LnZhbGlkYXRlXCIsZnVuY3Rpb24oYil7ZnVuY3Rpb24gZCgpe3ZhciBkLGU7cmV0dXJuIWMuc2V0dGluZ3Muc3VibWl0SGFuZGxlcnx8KGMuc3VibWl0QnV0dG9uJiYoZD1hKFwiPGlucHV0IHR5cGU9J2hpZGRlbicvPlwiKS5hdHRyKFwibmFtZVwiLGMuc3VibWl0QnV0dG9uLm5hbWUpLnZhbChhKGMuc3VibWl0QnV0dG9uKS52YWwoKSkuYXBwZW5kVG8oYy5jdXJyZW50Rm9ybSkpLGU9Yy5zZXR0aW5ncy5zdWJtaXRIYW5kbGVyLmNhbGwoYyxjLmN1cnJlbnRGb3JtLGIpLGMuc3VibWl0QnV0dG9uJiZkLnJlbW92ZSgpLHZvaWQgMCE9PWUmJmUpfXJldHVybiBjLnNldHRpbmdzLmRlYnVnJiZiLnByZXZlbnREZWZhdWx0KCksYy5jYW5jZWxTdWJtaXQ/KGMuY2FuY2VsU3VibWl0PSExLGQoKSk6Yy5mb3JtKCk/Yy5wZW5kaW5nUmVxdWVzdD8oYy5mb3JtU3VibWl0dGVkPSEwLCExKTpkKCk6KGMuZm9jdXNJbnZhbGlkKCksITEpfSkpLGMpfSx2YWxpZDpmdW5jdGlvbigpe3ZhciBiLGMsZDtyZXR1cm4gYSh0aGlzWzBdKS5pcyhcImZvcm1cIik/Yj10aGlzLnZhbGlkYXRlKCkuZm9ybSgpOihkPVtdLGI9ITAsYz1hKHRoaXNbMF0uZm9ybSkudmFsaWRhdGUoKSx0aGlzLmVhY2goZnVuY3Rpb24oKXtiPWMuZWxlbWVudCh0aGlzKSYmYixifHwoZD1kLmNvbmNhdChjLmVycm9yTGlzdCkpfSksYy5lcnJvckxpc3Q9ZCksYn0scnVsZXM6ZnVuY3Rpb24oYixjKXt2YXIgZCxlLGYsZyxoLGksaj10aGlzWzBdO2lmKG51bGwhPWomJm51bGwhPWouZm9ybSl7aWYoYilzd2l0Y2goZD1hLmRhdGEoai5mb3JtLFwidmFsaWRhdG9yXCIpLnNldHRpbmdzLGU9ZC5ydWxlcyxmPWEudmFsaWRhdG9yLnN0YXRpY1J1bGVzKGopLGIpe2Nhc2VcImFkZFwiOmEuZXh0ZW5kKGYsYS52YWxpZGF0b3Iubm9ybWFsaXplUnVsZShjKSksZGVsZXRlIGYubWVzc2FnZXMsZVtqLm5hbWVdPWYsYy5tZXNzYWdlcyYmKGQubWVzc2FnZXNbai5uYW1lXT1hLmV4dGVuZChkLm1lc3NhZ2VzW2oubmFtZV0sYy5tZXNzYWdlcykpO2JyZWFrO2Nhc2VcInJlbW92ZVwiOnJldHVybiBjPyhpPXt9LGEuZWFjaChjLnNwbGl0KC9cXHMvKSxmdW5jdGlvbihiLGMpe2lbY109ZltjXSxkZWxldGUgZltjXSxcInJlcXVpcmVkXCI9PT1jJiZhKGopLnJlbW92ZUF0dHIoXCJhcmlhLXJlcXVpcmVkXCIpfSksaSk6KGRlbGV0ZSBlW2oubmFtZV0sZil9cmV0dXJuIGc9YS52YWxpZGF0b3Iubm9ybWFsaXplUnVsZXMoYS5leHRlbmQoe30sYS52YWxpZGF0b3IuY2xhc3NSdWxlcyhqKSxhLnZhbGlkYXRvci5hdHRyaWJ1dGVSdWxlcyhqKSxhLnZhbGlkYXRvci5kYXRhUnVsZXMoaiksYS52YWxpZGF0b3Iuc3RhdGljUnVsZXMoaikpLGopLGcucmVxdWlyZWQmJihoPWcucmVxdWlyZWQsZGVsZXRlIGcucmVxdWlyZWQsZz1hLmV4dGVuZCh7cmVxdWlyZWQ6aH0sZyksYShqKS5hdHRyKFwiYXJpYS1yZXF1aXJlZFwiLFwidHJ1ZVwiKSksZy5yZW1vdGUmJihoPWcucmVtb3RlLGRlbGV0ZSBnLnJlbW90ZSxnPWEuZXh0ZW5kKGcse3JlbW90ZTpofSkpLGd9fX0pLGEuZXh0ZW5kKGEuZXhwcltcIjpcIl0se2JsYW5rOmZ1bmN0aW9uKGIpe3JldHVybiFhLnRyaW0oXCJcIithKGIpLnZhbCgpKX0sZmlsbGVkOmZ1bmN0aW9uKGIpe3ZhciBjPWEoYikudmFsKCk7cmV0dXJuIG51bGwhPT1jJiYhIWEudHJpbShcIlwiK2MpfSx1bmNoZWNrZWQ6ZnVuY3Rpb24oYil7cmV0dXJuIWEoYikucHJvcChcImNoZWNrZWRcIil9fSksYS52YWxpZGF0b3I9ZnVuY3Rpb24oYixjKXt0aGlzLnNldHRpbmdzPWEuZXh0ZW5kKCEwLHt9LGEudmFsaWRhdG9yLmRlZmF1bHRzLGIpLHRoaXMuY3VycmVudEZvcm09Yyx0aGlzLmluaXQoKX0sYS52YWxpZGF0b3IuZm9ybWF0PWZ1bmN0aW9uKGIsYyl7cmV0dXJuIDE9PT1hcmd1bWVudHMubGVuZ3RoP2Z1bmN0aW9uKCl7dmFyIGM9YS5tYWtlQXJyYXkoYXJndW1lbnRzKTtyZXR1cm4gYy51bnNoaWZ0KGIpLGEudmFsaWRhdG9yLmZvcm1hdC5hcHBseSh0aGlzLGMpfTp2b2lkIDA9PT1jP2I6KGFyZ3VtZW50cy5sZW5ndGg+MiYmYy5jb25zdHJ1Y3RvciE9PUFycmF5JiYoYz1hLm1ha2VBcnJheShhcmd1bWVudHMpLnNsaWNlKDEpKSxjLmNvbnN0cnVjdG9yIT09QXJyYXkmJihjPVtjXSksYS5lYWNoKGMsZnVuY3Rpb24oYSxjKXtiPWIucmVwbGFjZShuZXcgUmVnRXhwKFwiXFxcXHtcIithK1wiXFxcXH1cIixcImdcIiksZnVuY3Rpb24oKXtyZXR1cm4gY30pfSksYil9LGEuZXh0ZW5kKGEudmFsaWRhdG9yLHtkZWZhdWx0czp7bWVzc2FnZXM6e30sZ3JvdXBzOnt9LHJ1bGVzOnt9LGVycm9yQ2xhc3M6XCJlcnJvclwiLHBlbmRpbmdDbGFzczpcInBlbmRpbmdcIix2YWxpZENsYXNzOlwidmFsaWRcIixlcnJvckVsZW1lbnQ6XCJsYWJlbFwiLGZvY3VzQ2xlYW51cDohMSxmb2N1c0ludmFsaWQ6ITAsZXJyb3JDb250YWluZXI6YShbXSksZXJyb3JMYWJlbENvbnRhaW5lcjphKFtdKSxvbnN1Ym1pdDohMCxpZ25vcmU6XCI6aGlkZGVuXCIsaWdub3JlVGl0bGU6ITEsb25mb2N1c2luOmZ1bmN0aW9uKGEpe3RoaXMubGFzdEFjdGl2ZT1hLHRoaXMuc2V0dGluZ3MuZm9jdXNDbGVhbnVwJiYodGhpcy5zZXR0aW5ncy51bmhpZ2hsaWdodCYmdGhpcy5zZXR0aW5ncy51bmhpZ2hsaWdodC5jYWxsKHRoaXMsYSx0aGlzLnNldHRpbmdzLmVycm9yQ2xhc3MsdGhpcy5zZXR0aW5ncy52YWxpZENsYXNzKSx0aGlzLmhpZGVUaGVzZSh0aGlzLmVycm9yc0ZvcihhKSkpfSxvbmZvY3Vzb3V0OmZ1bmN0aW9uKGEpe3RoaXMuY2hlY2thYmxlKGEpfHwhKGEubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZCkmJnRoaXMub3B0aW9uYWwoYSl8fHRoaXMuZWxlbWVudChhKX0sb25rZXl1cDpmdW5jdGlvbihiLGMpe3ZhciBkPVsxNiwxNywxOCwyMCwzNSwzNiwzNywzOCwzOSw0MCw0NSwxNDQsMjI1XTs5PT09Yy53aGljaCYmXCJcIj09PXRoaXMuZWxlbWVudFZhbHVlKGIpfHxhLmluQXJyYXkoYy5rZXlDb2RlLGQpIT09LTF8fChiLm5hbWUgaW4gdGhpcy5zdWJtaXR0ZWR8fGIubmFtZSBpbiB0aGlzLmludmFsaWQpJiZ0aGlzLmVsZW1lbnQoYil9LG9uY2xpY2s6ZnVuY3Rpb24oYSl7YS5uYW1lIGluIHRoaXMuc3VibWl0dGVkP3RoaXMuZWxlbWVudChhKTphLnBhcmVudE5vZGUubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZCYmdGhpcy5lbGVtZW50KGEucGFyZW50Tm9kZSl9LGhpZ2hsaWdodDpmdW5jdGlvbihiLGMsZCl7XCJyYWRpb1wiPT09Yi50eXBlP3RoaXMuZmluZEJ5TmFtZShiLm5hbWUpLmFkZENsYXNzKGMpLnJlbW92ZUNsYXNzKGQpOmEoYikuYWRkQ2xhc3MoYykucmVtb3ZlQ2xhc3MoZCl9LHVuaGlnaGxpZ2h0OmZ1bmN0aW9uKGIsYyxkKXtcInJhZGlvXCI9PT1iLnR5cGU/dGhpcy5maW5kQnlOYW1lKGIubmFtZSkucmVtb3ZlQ2xhc3MoYykuYWRkQ2xhc3MoZCk6YShiKS5yZW1vdmVDbGFzcyhjKS5hZGRDbGFzcyhkKX19LHNldERlZmF1bHRzOmZ1bmN0aW9uKGIpe2EuZXh0ZW5kKGEudmFsaWRhdG9yLmRlZmF1bHRzLGIpfSxtZXNzYWdlczp7cmVxdWlyZWQ6XCJUaGlzIGZpZWxkIGlzIHJlcXVpcmVkLlwiLHJlbW90ZTpcIlBsZWFzZSBmaXggdGhpcyBmaWVsZC5cIixlbWFpbDpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIGVtYWlsIGFkZHJlc3MuXCIsdXJsOlwiUGxlYXNlIGVudGVyIGEgdmFsaWQgVVJMLlwiLGRhdGU6XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBkYXRlLlwiLGRhdGVJU086XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBkYXRlIChJU08pLlwiLG51bWJlcjpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIG51bWJlci5cIixkaWdpdHM6XCJQbGVhc2UgZW50ZXIgb25seSBkaWdpdHMuXCIsZXF1YWxUbzpcIlBsZWFzZSBlbnRlciB0aGUgc2FtZSB2YWx1ZSBhZ2Fpbi5cIixtYXhsZW5ndGg6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIG5vIG1vcmUgdGhhbiB7MH0gY2hhcmFjdGVycy5cIiksbWlubGVuZ3RoOmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBhdCBsZWFzdCB7MH0gY2hhcmFjdGVycy5cIikscmFuZ2VsZW5ndGg6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGEgdmFsdWUgYmV0d2VlbiB7MH0gYW5kIHsxfSBjaGFyYWN0ZXJzIGxvbmcuXCIpLHJhbmdlOmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBhIHZhbHVlIGJldHdlZW4gezB9IGFuZCB7MX0uXCIpLG1heDphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYSB2YWx1ZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gezB9LlwiKSxtaW46YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGEgdmFsdWUgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIHswfS5cIiksc3RlcDphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYSBtdWx0aXBsZSBvZiB7MH0uXCIpfSxhdXRvQ3JlYXRlUmFuZ2VzOiExLHByb3RvdHlwZTp7aW5pdDpmdW5jdGlvbigpe2Z1bmN0aW9uIGIoYil7IXRoaXMuZm9ybSYmdGhpcy5oYXNBdHRyaWJ1dGUoXCJjb250ZW50ZWRpdGFibGVcIikmJih0aGlzLmZvcm09YSh0aGlzKS5jbG9zZXN0KFwiZm9ybVwiKVswXSk7dmFyIGM9YS5kYXRhKHRoaXMuZm9ybSxcInZhbGlkYXRvclwiKSxkPVwib25cIitiLnR5cGUucmVwbGFjZSgvXnZhbGlkYXRlLyxcIlwiKSxlPWMuc2V0dGluZ3M7ZVtkXSYmIWEodGhpcykuaXMoZS5pZ25vcmUpJiZlW2RdLmNhbGwoYyx0aGlzLGIpfXRoaXMubGFiZWxDb250YWluZXI9YSh0aGlzLnNldHRpbmdzLmVycm9yTGFiZWxDb250YWluZXIpLHRoaXMuZXJyb3JDb250ZXh0PXRoaXMubGFiZWxDb250YWluZXIubGVuZ3RoJiZ0aGlzLmxhYmVsQ29udGFpbmVyfHxhKHRoaXMuY3VycmVudEZvcm0pLHRoaXMuY29udGFpbmVycz1hKHRoaXMuc2V0dGluZ3MuZXJyb3JDb250YWluZXIpLmFkZCh0aGlzLnNldHRpbmdzLmVycm9yTGFiZWxDb250YWluZXIpLHRoaXMuc3VibWl0dGVkPXt9LHRoaXMudmFsdWVDYWNoZT17fSx0aGlzLnBlbmRpbmdSZXF1ZXN0PTAsdGhpcy5wZW5kaW5nPXt9LHRoaXMuaW52YWxpZD17fSx0aGlzLnJlc2V0KCk7dmFyIGMsZD10aGlzLmdyb3Vwcz17fTthLmVhY2godGhpcy5zZXR0aW5ncy5ncm91cHMsZnVuY3Rpb24oYixjKXtcInN0cmluZ1wiPT10eXBlb2YgYyYmKGM9Yy5zcGxpdCgvXFxzLykpLGEuZWFjaChjLGZ1bmN0aW9uKGEsYyl7ZFtjXT1ifSl9KSxjPXRoaXMuc2V0dGluZ3MucnVsZXMsYS5lYWNoKGMsZnVuY3Rpb24oYixkKXtjW2JdPWEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGUoZCl9KSxhKHRoaXMuY3VycmVudEZvcm0pLm9uKFwiZm9jdXNpbi52YWxpZGF0ZSBmb2N1c291dC52YWxpZGF0ZSBrZXl1cC52YWxpZGF0ZVwiLFwiOnRleHQsIFt0eXBlPSdwYXNzd29yZCddLCBbdHlwZT0nZmlsZSddLCBzZWxlY3QsIHRleHRhcmVhLCBbdHlwZT0nbnVtYmVyJ10sIFt0eXBlPSdzZWFyY2gnXSwgW3R5cGU9J3RlbCddLCBbdHlwZT0ndXJsJ10sIFt0eXBlPSdlbWFpbCddLCBbdHlwZT0nZGF0ZXRpbWUnXSwgW3R5cGU9J2RhdGUnXSwgW3R5cGU9J21vbnRoJ10sIFt0eXBlPSd3ZWVrJ10sIFt0eXBlPSd0aW1lJ10sIFt0eXBlPSdkYXRldGltZS1sb2NhbCddLCBbdHlwZT0ncmFuZ2UnXSwgW3R5cGU9J2NvbG9yJ10sIFt0eXBlPSdyYWRpbyddLCBbdHlwZT0nY2hlY2tib3gnXSwgW2NvbnRlbnRlZGl0YWJsZV1cIixiKS5vbihcImNsaWNrLnZhbGlkYXRlXCIsXCJzZWxlY3QsIG9wdGlvbiwgW3R5cGU9J3JhZGlvJ10sIFt0eXBlPSdjaGVja2JveCddXCIsYiksdGhpcy5zZXR0aW5ncy5pbnZhbGlkSGFuZGxlciYmYSh0aGlzLmN1cnJlbnRGb3JtKS5vbihcImludmFsaWQtZm9ybS52YWxpZGF0ZVwiLHRoaXMuc2V0dGluZ3MuaW52YWxpZEhhbmRsZXIpLGEodGhpcy5jdXJyZW50Rm9ybSkuZmluZChcIltyZXF1aXJlZF0sIFtkYXRhLXJ1bGUtcmVxdWlyZWRdLCAucmVxdWlyZWRcIikuYXR0cihcImFyaWEtcmVxdWlyZWRcIixcInRydWVcIil9LGZvcm06ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jaGVja0Zvcm0oKSxhLmV4dGVuZCh0aGlzLnN1Ym1pdHRlZCx0aGlzLmVycm9yTWFwKSx0aGlzLmludmFsaWQ9YS5leHRlbmQoe30sdGhpcy5lcnJvck1hcCksdGhpcy52YWxpZCgpfHxhKHRoaXMuY3VycmVudEZvcm0pLnRyaWdnZXJIYW5kbGVyKFwiaW52YWxpZC1mb3JtXCIsW3RoaXNdKSx0aGlzLnNob3dFcnJvcnMoKSx0aGlzLnZhbGlkKCl9LGNoZWNrRm9ybTpmdW5jdGlvbigpe3RoaXMucHJlcGFyZUZvcm0oKTtmb3IodmFyIGE9MCxiPXRoaXMuY3VycmVudEVsZW1lbnRzPXRoaXMuZWxlbWVudHMoKTtiW2FdO2ErKyl0aGlzLmNoZWNrKGJbYV0pO3JldHVybiB0aGlzLnZhbGlkKCl9LGVsZW1lbnQ6ZnVuY3Rpb24oYil7dmFyIGMsZCxlPXRoaXMuY2xlYW4oYiksZj10aGlzLnZhbGlkYXRpb25UYXJnZXRGb3IoZSksZz10aGlzLGg9ITA7cmV0dXJuIHZvaWQgMD09PWY/ZGVsZXRlIHRoaXMuaW52YWxpZFtlLm5hbWVdOih0aGlzLnByZXBhcmVFbGVtZW50KGYpLHRoaXMuY3VycmVudEVsZW1lbnRzPWEoZiksZD10aGlzLmdyb3Vwc1tmLm5hbWVdLGQmJmEuZWFjaCh0aGlzLmdyb3VwcyxmdW5jdGlvbihhLGIpe2I9PT1kJiZhIT09Zi5uYW1lJiYoZT1nLnZhbGlkYXRpb25UYXJnZXRGb3IoZy5jbGVhbihnLmZpbmRCeU5hbWUoYSkpKSxlJiZlLm5hbWUgaW4gZy5pbnZhbGlkJiYoZy5jdXJyZW50RWxlbWVudHMucHVzaChlKSxoPWcuY2hlY2soZSkmJmgpKX0pLGM9dGhpcy5jaGVjayhmKSE9PSExLGg9aCYmYyxjP3RoaXMuaW52YWxpZFtmLm5hbWVdPSExOnRoaXMuaW52YWxpZFtmLm5hbWVdPSEwLHRoaXMubnVtYmVyT2ZJbnZhbGlkcygpfHwodGhpcy50b0hpZGU9dGhpcy50b0hpZGUuYWRkKHRoaXMuY29udGFpbmVycykpLHRoaXMuc2hvd0Vycm9ycygpLGEoYikuYXR0cihcImFyaWEtaW52YWxpZFwiLCFjKSksaH0sc2hvd0Vycm9yczpmdW5jdGlvbihiKXtpZihiKXt2YXIgYz10aGlzO2EuZXh0ZW5kKHRoaXMuZXJyb3JNYXAsYiksdGhpcy5lcnJvckxpc3Q9YS5tYXAodGhpcy5lcnJvck1hcCxmdW5jdGlvbihhLGIpe3JldHVybnttZXNzYWdlOmEsZWxlbWVudDpjLmZpbmRCeU5hbWUoYilbMF19fSksdGhpcy5zdWNjZXNzTGlzdD1hLmdyZXAodGhpcy5zdWNjZXNzTGlzdCxmdW5jdGlvbihhKXtyZXR1cm4hKGEubmFtZSBpbiBiKX0pfXRoaXMuc2V0dGluZ3Muc2hvd0Vycm9ycz90aGlzLnNldHRpbmdzLnNob3dFcnJvcnMuY2FsbCh0aGlzLHRoaXMuZXJyb3JNYXAsdGhpcy5lcnJvckxpc3QpOnRoaXMuZGVmYXVsdFNob3dFcnJvcnMoKX0scmVzZXRGb3JtOmZ1bmN0aW9uKCl7YS5mbi5yZXNldEZvcm0mJmEodGhpcy5jdXJyZW50Rm9ybSkucmVzZXRGb3JtKCksdGhpcy5pbnZhbGlkPXt9LHRoaXMuc3VibWl0dGVkPXt9LHRoaXMucHJlcGFyZUZvcm0oKSx0aGlzLmhpZGVFcnJvcnMoKTt2YXIgYj10aGlzLmVsZW1lbnRzKCkucmVtb3ZlRGF0YShcInByZXZpb3VzVmFsdWVcIikucmVtb3ZlQXR0cihcImFyaWEtaW52YWxpZFwiKTt0aGlzLnJlc2V0RWxlbWVudHMoYil9LHJlc2V0RWxlbWVudHM6ZnVuY3Rpb24oYSl7dmFyIGI7aWYodGhpcy5zZXR0aW5ncy51bmhpZ2hsaWdodClmb3IoYj0wO2FbYl07YisrKXRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQuY2FsbCh0aGlzLGFbYl0sdGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLFwiXCIpLHRoaXMuZmluZEJ5TmFtZShhW2JdLm5hbWUpLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyk7ZWxzZSBhLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcykucmVtb3ZlQ2xhc3ModGhpcy5zZXR0aW5ncy52YWxpZENsYXNzKX0sbnVtYmVyT2ZJbnZhbGlkczpmdW5jdGlvbigpe3JldHVybiB0aGlzLm9iamVjdExlbmd0aCh0aGlzLmludmFsaWQpfSxvYmplY3RMZW5ndGg6ZnVuY3Rpb24oYSl7dmFyIGIsYz0wO2ZvcihiIGluIGEpYVtiXSYmYysrO3JldHVybiBjfSxoaWRlRXJyb3JzOmZ1bmN0aW9uKCl7dGhpcy5oaWRlVGhlc2UodGhpcy50b0hpZGUpfSxoaWRlVGhlc2U6ZnVuY3Rpb24oYSl7YS5ub3QodGhpcy5jb250YWluZXJzKS50ZXh0KFwiXCIpLHRoaXMuYWRkV3JhcHBlcihhKS5oaWRlKCl9LHZhbGlkOmZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemUoKX0sc2l6ZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmVycm9yTGlzdC5sZW5ndGh9LGZvY3VzSW52YWxpZDpmdW5jdGlvbigpe2lmKHRoaXMuc2V0dGluZ3MuZm9jdXNJbnZhbGlkKXRyeXthKHRoaXMuZmluZExhc3RBY3RpdmUoKXx8dGhpcy5lcnJvckxpc3QubGVuZ3RoJiZ0aGlzLmVycm9yTGlzdFswXS5lbGVtZW50fHxbXSkuZmlsdGVyKFwiOnZpc2libGVcIikuZm9jdXMoKS50cmlnZ2VyKFwiZm9jdXNpblwiKX1jYXRjaChhKXt9fSxmaW5kTGFzdEFjdGl2ZTpmdW5jdGlvbigpe3ZhciBiPXRoaXMubGFzdEFjdGl2ZTtyZXR1cm4gYiYmMT09PWEuZ3JlcCh0aGlzLmVycm9yTGlzdCxmdW5jdGlvbihhKXtyZXR1cm4gYS5lbGVtZW50Lm5hbWU9PT1iLm5hbWV9KS5sZW5ndGgmJmJ9LGVsZW1lbnRzOmZ1bmN0aW9uKCl7dmFyIGI9dGhpcyxjPXt9O3JldHVybiBhKHRoaXMuY3VycmVudEZvcm0pLmZpbmQoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYSwgW2NvbnRlbnRlZGl0YWJsZV1cIikubm90KFwiOnN1Ym1pdCwgOnJlc2V0LCA6aW1hZ2UsIDpkaXNhYmxlZFwiKS5ub3QodGhpcy5zZXR0aW5ncy5pZ25vcmUpLmZpbHRlcihmdW5jdGlvbigpe3ZhciBkPXRoaXMubmFtZXx8YSh0aGlzKS5hdHRyKFwibmFtZVwiKTtyZXR1cm4hZCYmYi5zZXR0aW5ncy5kZWJ1ZyYmd2luZG93LmNvbnNvbGUmJmNvbnNvbGUuZXJyb3IoXCIlbyBoYXMgbm8gbmFtZSBhc3NpZ25lZFwiLHRoaXMpLHRoaXMuaGFzQXR0cmlidXRlKFwiY29udGVudGVkaXRhYmxlXCIpJiYodGhpcy5mb3JtPWEodGhpcykuY2xvc2VzdChcImZvcm1cIilbMF0pLCEoZCBpbiBjfHwhYi5vYmplY3RMZW5ndGgoYSh0aGlzKS5ydWxlcygpKSkmJihjW2RdPSEwLCEwKX0pfSxjbGVhbjpmdW5jdGlvbihiKXtyZXR1cm4gYShiKVswXX0sZXJyb3JzOmZ1bmN0aW9uKCl7dmFyIGI9dGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLnNwbGl0KFwiIFwiKS5qb2luKFwiLlwiKTtyZXR1cm4gYSh0aGlzLnNldHRpbmdzLmVycm9yRWxlbWVudCtcIi5cIitiLHRoaXMuZXJyb3JDb250ZXh0KX0scmVzZXRJbnRlcm5hbHM6ZnVuY3Rpb24oKXt0aGlzLnN1Y2Nlc3NMaXN0PVtdLHRoaXMuZXJyb3JMaXN0PVtdLHRoaXMuZXJyb3JNYXA9e30sdGhpcy50b1Nob3c9YShbXSksdGhpcy50b0hpZGU9YShbXSl9LHJlc2V0OmZ1bmN0aW9uKCl7dGhpcy5yZXNldEludGVybmFscygpLHRoaXMuY3VycmVudEVsZW1lbnRzPWEoW10pfSxwcmVwYXJlRm9ybTpmdW5jdGlvbigpe3RoaXMucmVzZXQoKSx0aGlzLnRvSGlkZT10aGlzLmVycm9ycygpLmFkZCh0aGlzLmNvbnRhaW5lcnMpfSxwcmVwYXJlRWxlbWVudDpmdW5jdGlvbihhKXt0aGlzLnJlc2V0KCksdGhpcy50b0hpZGU9dGhpcy5lcnJvcnNGb3IoYSl9LGVsZW1lbnRWYWx1ZTpmdW5jdGlvbihiKXt2YXIgYyxkLGU9YShiKSxmPWIudHlwZTtyZXR1cm5cInJhZGlvXCI9PT1mfHxcImNoZWNrYm94XCI9PT1mP3RoaXMuZmluZEJ5TmFtZShiLm5hbWUpLmZpbHRlcihcIjpjaGVja2VkXCIpLnZhbCgpOlwibnVtYmVyXCI9PT1mJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgYi52YWxpZGl0eT9iLnZhbGlkaXR5LmJhZElucHV0P1wiTmFOXCI6ZS52YWwoKTooYz1iLmhhc0F0dHJpYnV0ZShcImNvbnRlbnRlZGl0YWJsZVwiKT9lLnRleHQoKTplLnZhbCgpLFwiZmlsZVwiPT09Zj9cIkM6XFxcXGZha2VwYXRoXFxcXFwiPT09Yy5zdWJzdHIoMCwxMik/Yy5zdWJzdHIoMTIpOihkPWMubGFzdEluZGV4T2YoXCIvXCIpLGQ+PTA/Yy5zdWJzdHIoZCsxKTooZD1jLmxhc3RJbmRleE9mKFwiXFxcXFwiKSxkPj0wP2Muc3Vic3RyKGQrMSk6YykpOlwic3RyaW5nXCI9PXR5cGVvZiBjP2MucmVwbGFjZSgvXFxyL2csXCJcIik6Yyl9LGNoZWNrOmZ1bmN0aW9uKGIpe2I9dGhpcy52YWxpZGF0aW9uVGFyZ2V0Rm9yKHRoaXMuY2xlYW4oYikpO3ZhciBjLGQsZSxmPWEoYikucnVsZXMoKSxnPWEubWFwKGYsZnVuY3Rpb24oYSxiKXtyZXR1cm4gYn0pLmxlbmd0aCxoPSExLGk9dGhpcy5lbGVtZW50VmFsdWUoYik7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZi5ub3JtYWxpemVyKXtpZihpPWYubm9ybWFsaXplci5jYWxsKGIsaSksXCJzdHJpbmdcIiE9dHlwZW9mIGkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIlRoZSBub3JtYWxpemVyIHNob3VsZCByZXR1cm4gYSBzdHJpbmcgdmFsdWUuXCIpO2RlbGV0ZSBmLm5vcm1hbGl6ZXJ9Zm9yKGQgaW4gZil7ZT17bWV0aG9kOmQscGFyYW1ldGVyczpmW2RdfTt0cnl7aWYoYz1hLnZhbGlkYXRvci5tZXRob2RzW2RdLmNhbGwodGhpcyxpLGIsZS5wYXJhbWV0ZXJzKSxcImRlcGVuZGVuY3ktbWlzbWF0Y2hcIj09PWMmJjE9PT1nKXtoPSEwO2NvbnRpbnVlfWlmKGg9ITEsXCJwZW5kaW5nXCI9PT1jKXJldHVybiB2b2lkKHRoaXMudG9IaWRlPXRoaXMudG9IaWRlLm5vdCh0aGlzLmVycm9yc0ZvcihiKSkpO2lmKCFjKXJldHVybiB0aGlzLmZvcm1hdEFuZEFkZChiLGUpLCExfWNhdGNoKGEpe3Rocm93IHRoaXMuc2V0dGluZ3MuZGVidWcmJndpbmRvdy5jb25zb2xlJiZjb25zb2xlLmxvZyhcIkV4Y2VwdGlvbiBvY2N1cnJlZCB3aGVuIGNoZWNraW5nIGVsZW1lbnQgXCIrYi5pZCtcIiwgY2hlY2sgdGhlICdcIitlLm1ldGhvZCtcIicgbWV0aG9kLlwiLGEpLGEgaW5zdGFuY2VvZiBUeXBlRXJyb3ImJihhLm1lc3NhZ2UrPVwiLiAgRXhjZXB0aW9uIG9jY3VycmVkIHdoZW4gY2hlY2tpbmcgZWxlbWVudCBcIitiLmlkK1wiLCBjaGVjayB0aGUgJ1wiK2UubWV0aG9kK1wiJyBtZXRob2QuXCIpLGF9fWlmKCFoKXJldHVybiB0aGlzLm9iamVjdExlbmd0aChmKSYmdGhpcy5zdWNjZXNzTGlzdC5wdXNoKGIpLCEwfSxjdXN0b21EYXRhTWVzc2FnZTpmdW5jdGlvbihiLGMpe3JldHVybiBhKGIpLmRhdGEoXCJtc2dcIitjLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpK2Muc3Vic3RyaW5nKDEpLnRvTG93ZXJDYXNlKCkpfHxhKGIpLmRhdGEoXCJtc2dcIil9LGN1c3RvbU1lc3NhZ2U6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLnNldHRpbmdzLm1lc3NhZ2VzW2FdO3JldHVybiBjJiYoYy5jb25zdHJ1Y3Rvcj09PVN0cmluZz9jOmNbYl0pfSxmaW5kRGVmaW5lZDpmdW5jdGlvbigpe2Zvcih2YXIgYT0wO2E8YXJndW1lbnRzLmxlbmd0aDthKyspaWYodm9pZCAwIT09YXJndW1lbnRzW2FdKXJldHVybiBhcmd1bWVudHNbYV19LGRlZmF1bHRNZXNzYWdlOmZ1bmN0aW9uKGIsYyl7XCJzdHJpbmdcIj09dHlwZW9mIGMmJihjPXttZXRob2Q6Y30pO3ZhciBkPXRoaXMuZmluZERlZmluZWQodGhpcy5jdXN0b21NZXNzYWdlKGIubmFtZSxjLm1ldGhvZCksdGhpcy5jdXN0b21EYXRhTWVzc2FnZShiLGMubWV0aG9kKSwhdGhpcy5zZXR0aW5ncy5pZ25vcmVUaXRsZSYmYi50aXRsZXx8dm9pZCAwLGEudmFsaWRhdG9yLm1lc3NhZ2VzW2MubWV0aG9kXSxcIjxzdHJvbmc+V2FybmluZzogTm8gbWVzc2FnZSBkZWZpbmVkIGZvciBcIitiLm5hbWUrXCI8L3N0cm9uZz5cIiksZT0vXFwkP1xceyhcXGQrKVxcfS9nO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGQ/ZD1kLmNhbGwodGhpcyxjLnBhcmFtZXRlcnMsYik6ZS50ZXN0KGQpJiYoZD1hLnZhbGlkYXRvci5mb3JtYXQoZC5yZXBsYWNlKGUsXCJ7JDF9XCIpLGMucGFyYW1ldGVycykpLGR9LGZvcm1hdEFuZEFkZDpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuZGVmYXVsdE1lc3NhZ2UoYSxiKTt0aGlzLmVycm9yTGlzdC5wdXNoKHttZXNzYWdlOmMsZWxlbWVudDphLG1ldGhvZDpiLm1ldGhvZH0pLHRoaXMuZXJyb3JNYXBbYS5uYW1lXT1jLHRoaXMuc3VibWl0dGVkW2EubmFtZV09Y30sYWRkV3JhcHBlcjpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5zZXR0aW5ncy53cmFwcGVyJiYoYT1hLmFkZChhLnBhcmVudCh0aGlzLnNldHRpbmdzLndyYXBwZXIpKSksYX0sZGVmYXVsdFNob3dFcnJvcnM6ZnVuY3Rpb24oKXt2YXIgYSxiLGM7Zm9yKGE9MDt0aGlzLmVycm9yTGlzdFthXTthKyspYz10aGlzLmVycm9yTGlzdFthXSx0aGlzLnNldHRpbmdzLmhpZ2hsaWdodCYmdGhpcy5zZXR0aW5ncy5oaWdobGlnaHQuY2FsbCh0aGlzLGMuZWxlbWVudCx0aGlzLnNldHRpbmdzLmVycm9yQ2xhc3MsdGhpcy5zZXR0aW5ncy52YWxpZENsYXNzKSx0aGlzLnNob3dMYWJlbChjLmVsZW1lbnQsYy5tZXNzYWdlKTtpZih0aGlzLmVycm9yTGlzdC5sZW5ndGgmJih0aGlzLnRvU2hvdz10aGlzLnRvU2hvdy5hZGQodGhpcy5jb250YWluZXJzKSksdGhpcy5zZXR0aW5ncy5zdWNjZXNzKWZvcihhPTA7dGhpcy5zdWNjZXNzTGlzdFthXTthKyspdGhpcy5zaG93TGFiZWwodGhpcy5zdWNjZXNzTGlzdFthXSk7aWYodGhpcy5zZXR0aW5ncy51bmhpZ2hsaWdodClmb3IoYT0wLGI9dGhpcy52YWxpZEVsZW1lbnRzKCk7YlthXTthKyspdGhpcy5zZXR0aW5ncy51bmhpZ2hsaWdodC5jYWxsKHRoaXMsYlthXSx0aGlzLnNldHRpbmdzLmVycm9yQ2xhc3MsdGhpcy5zZXR0aW5ncy52YWxpZENsYXNzKTt0aGlzLnRvSGlkZT10aGlzLnRvSGlkZS5ub3QodGhpcy50b1Nob3cpLHRoaXMuaGlkZUVycm9ycygpLHRoaXMuYWRkV3JhcHBlcih0aGlzLnRvU2hvdykuc2hvdygpfSx2YWxpZEVsZW1lbnRzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY3VycmVudEVsZW1lbnRzLm5vdCh0aGlzLmludmFsaWRFbGVtZW50cygpKX0saW52YWxpZEVsZW1lbnRzOmZ1bmN0aW9uKCl7cmV0dXJuIGEodGhpcy5lcnJvckxpc3QpLm1hcChmdW5jdGlvbigpe3JldHVybiB0aGlzLmVsZW1lbnR9KX0sc2hvd0xhYmVsOmZ1bmN0aW9uKGIsYyl7dmFyIGQsZSxmLGcsaD10aGlzLmVycm9yc0ZvcihiKSxpPXRoaXMuaWRPck5hbWUoYiksaj1hKGIpLmF0dHIoXCJhcmlhLWRlc2NyaWJlZGJ5XCIpO2gubGVuZ3RoPyhoLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcykuYWRkQ2xhc3ModGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzKSxoLmh0bWwoYykpOihoPWEoXCI8XCIrdGhpcy5zZXR0aW5ncy5lcnJvckVsZW1lbnQrXCI+XCIpLmF0dHIoXCJpZFwiLGkrXCItZXJyb3JcIikuYWRkQ2xhc3ModGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzKS5odG1sKGN8fFwiXCIpLGQ9aCx0aGlzLnNldHRpbmdzLndyYXBwZXImJihkPWguaGlkZSgpLnNob3coKS53cmFwKFwiPFwiK3RoaXMuc2V0dGluZ3Mud3JhcHBlcitcIi8+XCIpLnBhcmVudCgpKSx0aGlzLmxhYmVsQ29udGFpbmVyLmxlbmd0aD90aGlzLmxhYmVsQ29udGFpbmVyLmFwcGVuZChkKTp0aGlzLnNldHRpbmdzLmVycm9yUGxhY2VtZW50P3RoaXMuc2V0dGluZ3MuZXJyb3JQbGFjZW1lbnQuY2FsbCh0aGlzLGQsYShiKSk6ZC5pbnNlcnRBZnRlcihiKSxoLmlzKFwibGFiZWxcIik/aC5hdHRyKFwiZm9yXCIsaSk6MD09PWgucGFyZW50cyhcImxhYmVsW2Zvcj0nXCIrdGhpcy5lc2NhcGVDc3NNZXRhKGkpK1wiJ11cIikubGVuZ3RoJiYoZj1oLmF0dHIoXCJpZFwiKSxqP2oubWF0Y2gobmV3IFJlZ0V4cChcIlxcXFxiXCIrdGhpcy5lc2NhcGVDc3NNZXRhKGYpK1wiXFxcXGJcIikpfHwoais9XCIgXCIrZik6aj1mLGEoYikuYXR0cihcImFyaWEtZGVzY3JpYmVkYnlcIixqKSxlPXRoaXMuZ3JvdXBzW2IubmFtZV0sZSYmKGc9dGhpcyxhLmVhY2goZy5ncm91cHMsZnVuY3Rpb24oYixjKXtjPT09ZSYmYShcIltuYW1lPSdcIitnLmVzY2FwZUNzc01ldGEoYikrXCInXVwiLGcuY3VycmVudEZvcm0pLmF0dHIoXCJhcmlhLWRlc2NyaWJlZGJ5XCIsaC5hdHRyKFwiaWRcIikpfSkpKSksIWMmJnRoaXMuc2V0dGluZ3Muc3VjY2VzcyYmKGgudGV4dChcIlwiKSxcInN0cmluZ1wiPT10eXBlb2YgdGhpcy5zZXR0aW5ncy5zdWNjZXNzP2guYWRkQ2xhc3ModGhpcy5zZXR0aW5ncy5zdWNjZXNzKTp0aGlzLnNldHRpbmdzLnN1Y2Nlc3MoaCxiKSksdGhpcy50b1Nob3c9dGhpcy50b1Nob3cuYWRkKGgpfSxlcnJvcnNGb3I6ZnVuY3Rpb24oYil7dmFyIGM9dGhpcy5lc2NhcGVDc3NNZXRhKHRoaXMuaWRPck5hbWUoYikpLGQ9YShiKS5hdHRyKFwiYXJpYS1kZXNjcmliZWRieVwiKSxlPVwibGFiZWxbZm9yPSdcIitjK1wiJ10sIGxhYmVsW2Zvcj0nXCIrYytcIiddICpcIjtyZXR1cm4gZCYmKGU9ZStcIiwgI1wiK3RoaXMuZXNjYXBlQ3NzTWV0YShkKS5yZXBsYWNlKC9cXHMrL2csXCIsICNcIikpLHRoaXMuZXJyb3JzKCkuZmlsdGVyKGUpfSxlc2NhcGVDc3NNZXRhOmZ1bmN0aW9uKGEpe3JldHVybiBhLnJlcGxhY2UoLyhbXFxcXCFcIiMkJSYnKCkqKywuLzo7PD0+P0BcXFtcXF1eYHt8fX5dKS9nLFwiXFxcXCQxXCIpfSxpZE9yTmFtZTpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5ncm91cHNbYS5uYW1lXXx8KHRoaXMuY2hlY2thYmxlKGEpP2EubmFtZTphLmlkfHxhLm5hbWUpfSx2YWxpZGF0aW9uVGFyZ2V0Rm9yOmZ1bmN0aW9uKGIpe3JldHVybiB0aGlzLmNoZWNrYWJsZShiKSYmKGI9dGhpcy5maW5kQnlOYW1lKGIubmFtZSkpLGEoYikubm90KHRoaXMuc2V0dGluZ3MuaWdub3JlKVswXX0sY2hlY2thYmxlOmZ1bmN0aW9uKGEpe3JldHVybi9yYWRpb3xjaGVja2JveC9pLnRlc3QoYS50eXBlKX0sZmluZEJ5TmFtZTpmdW5jdGlvbihiKXtyZXR1cm4gYSh0aGlzLmN1cnJlbnRGb3JtKS5maW5kKFwiW25hbWU9J1wiK3RoaXMuZXNjYXBlQ3NzTWV0YShiKStcIiddXCIpfSxnZXRMZW5ndGg6ZnVuY3Rpb24oYixjKXtzd2l0Y2goYy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKXtjYXNlXCJzZWxlY3RcIjpyZXR1cm4gYShcIm9wdGlvbjpzZWxlY3RlZFwiLGMpLmxlbmd0aDtjYXNlXCJpbnB1dFwiOmlmKHRoaXMuY2hlY2thYmxlKGMpKXJldHVybiB0aGlzLmZpbmRCeU5hbWUoYy5uYW1lKS5maWx0ZXIoXCI6Y2hlY2tlZFwiKS5sZW5ndGh9cmV0dXJuIGIubGVuZ3RofSxkZXBlbmQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4hdGhpcy5kZXBlbmRUeXBlc1t0eXBlb2YgYV18fHRoaXMuZGVwZW5kVHlwZXNbdHlwZW9mIGFdKGEsYil9LGRlcGVuZFR5cGVzOntib29sZWFuOmZ1bmN0aW9uKGEpe3JldHVybiBhfSxzdHJpbmc6ZnVuY3Rpb24oYixjKXtyZXR1cm4hIWEoYixjLmZvcm0pLmxlbmd0aH0sZnVuY3Rpb246ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYShiKX19LG9wdGlvbmFsOmZ1bmN0aW9uKGIpe3ZhciBjPXRoaXMuZWxlbWVudFZhbHVlKGIpO3JldHVybiFhLnZhbGlkYXRvci5tZXRob2RzLnJlcXVpcmVkLmNhbGwodGhpcyxjLGIpJiZcImRlcGVuZGVuY3ktbWlzbWF0Y2hcIn0sc3RhcnRSZXF1ZXN0OmZ1bmN0aW9uKGIpe3RoaXMucGVuZGluZ1tiLm5hbWVdfHwodGhpcy5wZW5kaW5nUmVxdWVzdCsrLGEoYikuYWRkQ2xhc3ModGhpcy5zZXR0aW5ncy5wZW5kaW5nQ2xhc3MpLHRoaXMucGVuZGluZ1tiLm5hbWVdPSEwKX0sc3RvcFJlcXVlc3Q6ZnVuY3Rpb24oYixjKXt0aGlzLnBlbmRpbmdSZXF1ZXN0LS0sdGhpcy5wZW5kaW5nUmVxdWVzdDwwJiYodGhpcy5wZW5kaW5nUmVxdWVzdD0wKSxkZWxldGUgdGhpcy5wZW5kaW5nW2IubmFtZV0sYShiKS5yZW1vdmVDbGFzcyh0aGlzLnNldHRpbmdzLnBlbmRpbmdDbGFzcyksYyYmMD09PXRoaXMucGVuZGluZ1JlcXVlc3QmJnRoaXMuZm9ybVN1Ym1pdHRlZCYmdGhpcy5mb3JtKCk/KGEodGhpcy5jdXJyZW50Rm9ybSkuc3VibWl0KCksdGhpcy5mb3JtU3VibWl0dGVkPSExKTohYyYmMD09PXRoaXMucGVuZGluZ1JlcXVlc3QmJnRoaXMuZm9ybVN1Ym1pdHRlZCYmKGEodGhpcy5jdXJyZW50Rm9ybSkudHJpZ2dlckhhbmRsZXIoXCJpbnZhbGlkLWZvcm1cIixbdGhpc10pLHRoaXMuZm9ybVN1Ym1pdHRlZD0hMSl9LHByZXZpb3VzVmFsdWU6ZnVuY3Rpb24oYixjKXtyZXR1cm4gYz1cInN0cmluZ1wiPT10eXBlb2YgYyYmY3x8XCJyZW1vdGVcIixhLmRhdGEoYixcInByZXZpb3VzVmFsdWVcIil8fGEuZGF0YShiLFwicHJldmlvdXNWYWx1ZVwiLHtvbGQ6bnVsbCx2YWxpZDohMCxtZXNzYWdlOnRoaXMuZGVmYXVsdE1lc3NhZ2UoYix7bWV0aG9kOmN9KX0pfSxkZXN0cm95OmZ1bmN0aW9uKCl7dGhpcy5yZXNldEZvcm0oKSxhKHRoaXMuY3VycmVudEZvcm0pLm9mZihcIi52YWxpZGF0ZVwiKS5yZW1vdmVEYXRhKFwidmFsaWRhdG9yXCIpLmZpbmQoXCIudmFsaWRhdGUtZXF1YWxUby1ibHVyXCIpLm9mZihcIi52YWxpZGF0ZS1lcXVhbFRvXCIpLnJlbW92ZUNsYXNzKFwidmFsaWRhdGUtZXF1YWxUby1ibHVyXCIpfX0sY2xhc3NSdWxlU2V0dGluZ3M6e3JlcXVpcmVkOntyZXF1aXJlZDohMH0sZW1haWw6e2VtYWlsOiEwfSx1cmw6e3VybDohMH0sZGF0ZTp7ZGF0ZTohMH0sZGF0ZUlTTzp7ZGF0ZUlTTzohMH0sbnVtYmVyOntudW1iZXI6ITB9LGRpZ2l0czp7ZGlnaXRzOiEwfSxjcmVkaXRjYXJkOntjcmVkaXRjYXJkOiEwfX0sYWRkQ2xhc3NSdWxlczpmdW5jdGlvbihiLGMpe2IuY29uc3RydWN0b3I9PT1TdHJpbmc/dGhpcy5jbGFzc1J1bGVTZXR0aW5nc1tiXT1jOmEuZXh0ZW5kKHRoaXMuY2xhc3NSdWxlU2V0dGluZ3MsYil9LGNsYXNzUnVsZXM6ZnVuY3Rpb24oYil7dmFyIGM9e30sZD1hKGIpLmF0dHIoXCJjbGFzc1wiKTtyZXR1cm4gZCYmYS5lYWNoKGQuc3BsaXQoXCIgXCIpLGZ1bmN0aW9uKCl7dGhpcyBpbiBhLnZhbGlkYXRvci5jbGFzc1J1bGVTZXR0aW5ncyYmYS5leHRlbmQoYyxhLnZhbGlkYXRvci5jbGFzc1J1bGVTZXR0aW5nc1t0aGlzXSl9KSxjfSxub3JtYWxpemVBdHRyaWJ1dGVSdWxlOmZ1bmN0aW9uKGEsYixjLGQpey9taW58bWF4fHN0ZXAvLnRlc3QoYykmJihudWxsPT09Ynx8L251bWJlcnxyYW5nZXx0ZXh0Ly50ZXN0KGIpKSYmKGQ9TnVtYmVyKGQpLGlzTmFOKGQpJiYoZD12b2lkIDApKSxkfHwwPT09ZD9hW2NdPWQ6Yj09PWMmJlwicmFuZ2VcIiE9PWImJihhW2NdPSEwKX0sYXR0cmlidXRlUnVsZXM6ZnVuY3Rpb24oYil7dmFyIGMsZCxlPXt9LGY9YShiKSxnPWIuZ2V0QXR0cmlidXRlKFwidHlwZVwiKTtmb3IoYyBpbiBhLnZhbGlkYXRvci5tZXRob2RzKVwicmVxdWlyZWRcIj09PWM/KGQ9Yi5nZXRBdHRyaWJ1dGUoYyksXCJcIj09PWQmJihkPSEwKSxkPSEhZCk6ZD1mLmF0dHIoYyksdGhpcy5ub3JtYWxpemVBdHRyaWJ1dGVSdWxlKGUsZyxjLGQpO3JldHVybiBlLm1heGxlbmd0aCYmLy0xfDIxNDc0ODM2NDd8NTI0Mjg4Ly50ZXN0KGUubWF4bGVuZ3RoKSYmZGVsZXRlIGUubWF4bGVuZ3RoLGV9LGRhdGFSdWxlczpmdW5jdGlvbihiKXt2YXIgYyxkLGU9e30sZj1hKGIpLGc9Yi5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpO2ZvcihjIGluIGEudmFsaWRhdG9yLm1ldGhvZHMpZD1mLmRhdGEoXCJydWxlXCIrYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKStjLnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpKSx0aGlzLm5vcm1hbGl6ZUF0dHJpYnV0ZVJ1bGUoZSxnLGMsZCk7cmV0dXJuIGV9LHN0YXRpY1J1bGVzOmZ1bmN0aW9uKGIpe3ZhciBjPXt9LGQ9YS5kYXRhKGIuZm9ybSxcInZhbGlkYXRvclwiKTtyZXR1cm4gZC5zZXR0aW5ncy5ydWxlcyYmKGM9YS52YWxpZGF0b3Iubm9ybWFsaXplUnVsZShkLnNldHRpbmdzLnJ1bGVzW2IubmFtZV0pfHx7fSksY30sbm9ybWFsaXplUnVsZXM6ZnVuY3Rpb24oYixjKXtyZXR1cm4gYS5lYWNoKGIsZnVuY3Rpb24oZCxlKXtpZihlPT09ITEpcmV0dXJuIHZvaWQgZGVsZXRlIGJbZF07aWYoZS5wYXJhbXx8ZS5kZXBlbmRzKXt2YXIgZj0hMDtzd2l0Y2godHlwZW9mIGUuZGVwZW5kcyl7Y2FzZVwic3RyaW5nXCI6Zj0hIWEoZS5kZXBlbmRzLGMuZm9ybSkubGVuZ3RoO2JyZWFrO2Nhc2VcImZ1bmN0aW9uXCI6Zj1lLmRlcGVuZHMuY2FsbChjLGMpfWY/YltkXT12b2lkIDA9PT1lLnBhcmFtfHxlLnBhcmFtOihhLmRhdGEoYy5mb3JtLFwidmFsaWRhdG9yXCIpLnJlc2V0RWxlbWVudHMoYShjKSksZGVsZXRlIGJbZF0pfX0pLGEuZWFjaChiLGZ1bmN0aW9uKGQsZSl7YltkXT1hLmlzRnVuY3Rpb24oZSkmJlwibm9ybWFsaXplclwiIT09ZD9lKGMpOmV9KSxhLmVhY2goW1wibWlubGVuZ3RoXCIsXCJtYXhsZW5ndGhcIl0sZnVuY3Rpb24oKXtiW3RoaXNdJiYoYlt0aGlzXT1OdW1iZXIoYlt0aGlzXSkpfSksYS5lYWNoKFtcInJhbmdlbGVuZ3RoXCIsXCJyYW5nZVwiXSxmdW5jdGlvbigpe3ZhciBjO2JbdGhpc10mJihhLmlzQXJyYXkoYlt0aGlzXSk/Ylt0aGlzXT1bTnVtYmVyKGJbdGhpc11bMF0pLE51bWJlcihiW3RoaXNdWzFdKV06XCJzdHJpbmdcIj09dHlwZW9mIGJbdGhpc10mJihjPWJbdGhpc10ucmVwbGFjZSgvW1xcW1xcXV0vZyxcIlwiKS5zcGxpdCgvW1xccyxdKy8pLGJbdGhpc109W051bWJlcihjWzBdKSxOdW1iZXIoY1sxXSldKSl9KSxhLnZhbGlkYXRvci5hdXRvQ3JlYXRlUmFuZ2VzJiYobnVsbCE9Yi5taW4mJm51bGwhPWIubWF4JiYoYi5yYW5nZT1bYi5taW4sYi5tYXhdLGRlbGV0ZSBiLm1pbixkZWxldGUgYi5tYXgpLG51bGwhPWIubWlubGVuZ3RoJiZudWxsIT1iLm1heGxlbmd0aCYmKGIucmFuZ2VsZW5ndGg9W2IubWlubGVuZ3RoLGIubWF4bGVuZ3RoXSxkZWxldGUgYi5taW5sZW5ndGgsZGVsZXRlIGIubWF4bGVuZ3RoKSksYn0sbm9ybWFsaXplUnVsZTpmdW5jdGlvbihiKXtpZihcInN0cmluZ1wiPT10eXBlb2YgYil7dmFyIGM9e307YS5lYWNoKGIuc3BsaXQoL1xccy8pLGZ1bmN0aW9uKCl7Y1t0aGlzXT0hMH0pLGI9Y31yZXR1cm4gYn0sYWRkTWV0aG9kOmZ1bmN0aW9uKGIsYyxkKXthLnZhbGlkYXRvci5tZXRob2RzW2JdPWMsYS52YWxpZGF0b3IubWVzc2FnZXNbYl09dm9pZCAwIT09ZD9kOmEudmFsaWRhdG9yLm1lc3NhZ2VzW2JdLGMubGVuZ3RoPDMmJmEudmFsaWRhdG9yLmFkZENsYXNzUnVsZXMoYixhLnZhbGlkYXRvci5ub3JtYWxpemVSdWxlKGIpKX0sbWV0aG9kczp7cmVxdWlyZWQ6ZnVuY3Rpb24oYixjLGQpe2lmKCF0aGlzLmRlcGVuZChkLGMpKXJldHVyblwiZGVwZW5kZW5jeS1taXNtYXRjaFwiO2lmKFwic2VsZWN0XCI9PT1jLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpe3ZhciBlPWEoYykudmFsKCk7cmV0dXJuIGUmJmUubGVuZ3RoPjB9cmV0dXJuIHRoaXMuY2hlY2thYmxlKGMpP3RoaXMuZ2V0TGVuZ3RoKGIsYyk+MDpiLmxlbmd0aD4wfSxlbWFpbDpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHwvXlthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSokLy50ZXN0KGEpfSx1cmw6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L14oPzooPzooPzpodHRwcz98ZnRwKTopP1xcL1xcLykoPzpcXFMrKD86OlxcUyopP0ApPyg/Oig/ISg/OjEwfDEyNykoPzpcXC5cXGR7MSwzfSl7M30pKD8hKD86MTY5XFwuMjU0fDE5MlxcLjE2OCkoPzpcXC5cXGR7MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJcXGR8M1swLTFdKSg/OlxcLlxcZHsxLDN9KXsyfSkoPzpbMS05XVxcZD98MVxcZFxcZHwyWzAxXVxcZHwyMlswLTNdKSg/OlxcLig/OjE/XFxkezEsMn18MlswLTRdXFxkfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldXFxkP3wxXFxkXFxkfDJbMC00XVxcZHwyNVswLTRdKSl8KD86KD86W2EtelxcdTAwYTEtXFx1ZmZmZjAtOV0tKikqW2EtelxcdTAwYTEtXFx1ZmZmZjAtOV0rKSg/OlxcLig/OlthLXpcXHUwMGExLVxcdWZmZmYwLTldLSopKlthLXpcXHUwMGExLVxcdWZmZmYwLTldKykqKD86XFwuKD86W2EtelxcdTAwYTEtXFx1ZmZmZl17Mix9KSkuPykoPzo6XFxkezIsNX0pPyg/OlsvPyNdXFxTKik/JC9pLnRlc3QoYSl9LGRhdGU6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8IS9JbnZhbGlkfE5hTi8udGVzdChuZXcgRGF0ZShhKS50b1N0cmluZygpKX0sZGF0ZUlTTzpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHwvXlxcZHs0fVtcXC9cXC1dKDA/WzEtOV18MVswMTJdKVtcXC9cXC1dKDA/WzEtOV18WzEyXVswLTldfDNbMDFdKSQvLnRlc3QoYSl9LG51bWJlcjpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHwvXig/Oi0/XFxkK3wtP1xcZHsxLDN9KD86LFxcZHszfSkrKT8oPzpcXC5cXGQrKT8kLy50ZXN0KGEpfSxkaWdpdHM6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L15cXGQrJC8udGVzdChhKX0sbWlubGVuZ3RoOmZ1bmN0aW9uKGIsYyxkKXt2YXIgZT1hLmlzQXJyYXkoYik/Yi5sZW5ndGg6dGhpcy5nZXRMZW5ndGgoYixjKTtyZXR1cm4gdGhpcy5vcHRpb25hbChjKXx8ZT49ZH0sbWF4bGVuZ3RoOmZ1bmN0aW9uKGIsYyxkKXt2YXIgZT1hLmlzQXJyYXkoYik/Yi5sZW5ndGg6dGhpcy5nZXRMZW5ndGgoYixjKTtyZXR1cm4gdGhpcy5vcHRpb25hbChjKXx8ZTw9ZH0scmFuZ2VsZW5ndGg6ZnVuY3Rpb24oYixjLGQpe3ZhciBlPWEuaXNBcnJheShiKT9iLmxlbmd0aDp0aGlzLmdldExlbmd0aChiLGMpO3JldHVybiB0aGlzLm9wdGlvbmFsKGMpfHxlPj1kWzBdJiZlPD1kWzFdfSxtaW46ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHxhPj1jfSxtYXg6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHxhPD1jfSxyYW5nZTpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fGE+PWNbMF0mJmE8PWNbMV19LHN0ZXA6ZnVuY3Rpb24oYixjLGQpe3ZhciBlLGY9YShjKS5hdHRyKFwidHlwZVwiKSxnPVwiU3RlcCBhdHRyaWJ1dGUgb24gaW5wdXQgdHlwZSBcIitmK1wiIGlzIG5vdCBzdXBwb3J0ZWQuXCIsaD1bXCJ0ZXh0XCIsXCJudW1iZXJcIixcInJhbmdlXCJdLGk9bmV3IFJlZ0V4cChcIlxcXFxiXCIrZitcIlxcXFxiXCIpLGo9ZiYmIWkudGVzdChoLmpvaW4oKSksaz1mdW5jdGlvbihhKXt2YXIgYj0oXCJcIithKS5tYXRjaCgvKD86XFwuKFxcZCspKT8kLyk7cmV0dXJuIGImJmJbMV0/YlsxXS5sZW5ndGg6MH0sbD1mdW5jdGlvbihhKXtyZXR1cm4gTWF0aC5yb3VuZChhKk1hdGgucG93KDEwLGUpKX0sbT0hMDtpZihqKXRocm93IG5ldyBFcnJvcihnKTtyZXR1cm4gZT1rKGQpLChrKGIpPmV8fGwoYiklbChkKSE9PTApJiYobT0hMSksdGhpcy5vcHRpb25hbChjKXx8bX0sZXF1YWxUbzpmdW5jdGlvbihiLGMsZCl7dmFyIGU9YShkKTtyZXR1cm4gdGhpcy5zZXR0aW5ncy5vbmZvY3Vzb3V0JiZlLm5vdChcIi52YWxpZGF0ZS1lcXVhbFRvLWJsdXJcIikubGVuZ3RoJiZlLmFkZENsYXNzKFwidmFsaWRhdGUtZXF1YWxUby1ibHVyXCIpLm9uKFwiYmx1ci52YWxpZGF0ZS1lcXVhbFRvXCIsZnVuY3Rpb24oKXthKGMpLnZhbGlkKCl9KSxiPT09ZS52YWwoKX0scmVtb3RlOmZ1bmN0aW9uKGIsYyxkLGUpe2lmKHRoaXMub3B0aW9uYWwoYykpcmV0dXJuXCJkZXBlbmRlbmN5LW1pc21hdGNoXCI7ZT1cInN0cmluZ1wiPT10eXBlb2YgZSYmZXx8XCJyZW1vdGVcIjt2YXIgZixnLGgsaT10aGlzLnByZXZpb3VzVmFsdWUoYyxlKTtyZXR1cm4gdGhpcy5zZXR0aW5ncy5tZXNzYWdlc1tjLm5hbWVdfHwodGhpcy5zZXR0aW5ncy5tZXNzYWdlc1tjLm5hbWVdPXt9KSxpLm9yaWdpbmFsTWVzc2FnZT1pLm9yaWdpbmFsTWVzc2FnZXx8dGhpcy5zZXR0aW5ncy5tZXNzYWdlc1tjLm5hbWVdW2VdLHRoaXMuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXVtlXT1pLm1lc3NhZ2UsZD1cInN0cmluZ1wiPT10eXBlb2YgZCYme3VybDpkfXx8ZCxoPWEucGFyYW0oYS5leHRlbmQoe2RhdGE6Yn0sZC5kYXRhKSksaS5vbGQ9PT1oP2kudmFsaWQ6KGkub2xkPWgsZj10aGlzLHRoaXMuc3RhcnRSZXF1ZXN0KGMpLGc9e30sZ1tjLm5hbWVdPWIsYS5hamF4KGEuZXh0ZW5kKCEwLHttb2RlOlwiYWJvcnRcIixwb3J0OlwidmFsaWRhdGVcIitjLm5hbWUsZGF0YVR5cGU6XCJqc29uXCIsZGF0YTpnLGNvbnRleHQ6Zi5jdXJyZW50Rm9ybSxzdWNjZXNzOmZ1bmN0aW9uKGEpe3ZhciBkLGcsaCxqPWE9PT0hMHx8XCJ0cnVlXCI9PT1hO2Yuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXVtlXT1pLm9yaWdpbmFsTWVzc2FnZSxqPyhoPWYuZm9ybVN1Ym1pdHRlZCxmLnJlc2V0SW50ZXJuYWxzKCksZi50b0hpZGU9Zi5lcnJvcnNGb3IoYyksZi5mb3JtU3VibWl0dGVkPWgsZi5zdWNjZXNzTGlzdC5wdXNoKGMpLGYuaW52YWxpZFtjLm5hbWVdPSExLGYuc2hvd0Vycm9ycygpKTooZD17fSxnPWF8fGYuZGVmYXVsdE1lc3NhZ2UoYyx7bWV0aG9kOmUscGFyYW1ldGVyczpifSksZFtjLm5hbWVdPWkubWVzc2FnZT1nLGYuaW52YWxpZFtjLm5hbWVdPSEwLGYuc2hvd0Vycm9ycyhkKSksaS52YWxpZD1qLGYuc3RvcFJlcXVlc3QoYyxqKX19LGQpKSxcInBlbmRpbmdcIil9fX0pO3ZhciBiLGM9e307YS5hamF4UHJlZmlsdGVyP2EuYWpheFByZWZpbHRlcihmdW5jdGlvbihhLGIsZCl7dmFyIGU9YS5wb3J0O1wiYWJvcnRcIj09PWEubW9kZSYmKGNbZV0mJmNbZV0uYWJvcnQoKSxjW2VdPWQpfSk6KGI9YS5hamF4LGEuYWpheD1mdW5jdGlvbihkKXt2YXIgZT0oXCJtb2RlXCJpbiBkP2Q6YS5hamF4U2V0dGluZ3MpLm1vZGUsZj0oXCJwb3J0XCJpbiBkP2Q6YS5hamF4U2V0dGluZ3MpLnBvcnQ7cmV0dXJuXCJhYm9ydFwiPT09ZT8oY1tmXSYmY1tmXS5hYm9ydCgpLGNbZl09Yi5hcHBseSh0aGlzLGFyZ3VtZW50cyksY1tmXSk6Yi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9KX0pOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93KVxuICAgIERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxufSkoKTtcblxudmFyIGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbnZhciBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuLy8gRmluZCB0aGUgcmlnaHQgXCJ0cmFuc2l0aW9uZW5kXCIgZXZlbnQgZm9yIHRoaXMgYnJvd3NlclxudmFyIGVuZEV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICB9XG4gIHZhciBlbGVtID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJhbnNpdGlvbnNbdF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59KSgpO1xuXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIGlmIChlbmRFdmVudCA9PT0gbnVsbCkge1xuICAgIGlzSW4gPyBlbGVtZW50LnNob3coKSA6IGVsZW1lbnQuaGlkZSgpO1xuICAgIGNiKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcbiAgZWxlbWVudC5hZGRDbGFzcyhhbmltYXRpb24pO1xuICBlbGVtZW50LmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJycpO1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoJ3RyYW5zaXRpb25lbmQnLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGluaXRDbGFzcyArICcgJyArIGFjdGl2ZUNsYXNzICsgJyAnICsgYW5pbWF0aW9uKTtcbiAgfVxufVxuXG52YXIgTW90aW9uVUkgPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG4iLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcbmpRdWVyeSggJ2lmcmFtZVtzcmMqPVwidmltZW8uY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbiB2aW1lbycvPlwiKTtcbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLyohLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogSW5zdGFudCBDb21tZW50IFZhbGlkYXRpb24gLSB2MS4wIC0gMzAvNi8yMDE0XG4gKiBodHRwOi8vd29yZHByZXNzLm9yZy9wbHVnaW5zL2luc3RhbnQtY29tbWVudC12YWxpZGF0aW9uL1xuICogQ29weXJpZ2h0IChjKSAyMDE0IE1yaW5hbCBLYW50aSBSb3k7IExpY2Vuc2U6IEdQTHYyIG9yIGxhdGVyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xualF1ZXJ5LnZhbGlkYXRvci5hZGRNZXRob2QoXCJiZXR0ZXJfZW1haWxcIiwgZnVuY3Rpb24odmFsdWUsIGVsZW1lbnQpIHtcbiAgLy8gYSBiZXR0ZXIgKGJ1dCBub3QgMTAwJSBwZXJmZWN0KSBlbWFpbCB2YWxpZGF0aW9uXG4gIHJldHVybiB0aGlzLm9wdGlvbmFsKCBlbGVtZW50ICkgfHwgL14oW2EtekEtWjAtOV8uKy1dKStcXEAoKFthLXpBLVowLTktXSkrXFwuKSsoW2EtekEtWjAtOV17Miw0fSkrJC8udGVzdCggdmFsdWUgKTtcbn0sICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLicpO1xuXG5qUXVlcnkoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCQpIHtcblx0JCgnI2NvbW1lbnRmb3JtJykudmFsaWRhdGUoe1x0IFxuXHRcdHJ1bGVzOiB7XG5cdFx0ICBhdXRob3I6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9LFx0XHQgXG5cdFx0ICBlbWFpbDoge1xuXHRcdFx0cmVxdWlyZWQ6IHRydWUsXG5cdFx0XHRlbWFpbDogdHJ1ZVxuXHRcdCAgfSxcblx0XHQgIGNvbW1lbnQ6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9XG5cdFx0fSxcdFx0IFxuXHRcdG1lc3NhZ2VzOiB7XG5cdFx0ICBhdXRob3I6IFwiUGxlYXNlIGVudGVyIHlvdXIgbmFtZVwiLFxuXHRcdCAgZW1haWw6IFwiUGxlYXNlIGVudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzc1wiLFxuXHRcdCAgY29tbWVudDogXCJQbGVhc2UgdHlwZSB5b3VyIGNvbW1lbnRcIlxuXHRcdH0sXHRcdCBcblx0XHRlcnJvckVsZW1lbnQ6IFwiZGl2XCIsXG5cdFx0ZXJyb3JQbGFjZW1lbnQ6IGZ1bmN0aW9uKGVycm9yLCBlbGVtZW50KSB7XG5cdFx0ICBlbGVtZW50LmFmdGVyKGVycm9yKTtcblx0XHR9XHQgXG5cdH0pO1xufSk7XG4iLCJqUXVlcnkoZnVuY3Rpb24oJCl7XG5cdEZvdW5kYXRpb24ucmVJbml0KCdlcXVhbGl6ZXInKTtcbiAgICBpZiAoJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInKS5sZW5ndGgpIHsgLy9hcmUgd2UgZXZlbiBvbiBhIHBhZ2Ugd2l0aCBpbmZpbml0ZSBzY3JvbGw/XG4gICAgICAgIC8vaGlkZSBleGlzdGluZyBwYWdlclxuICAgICAgICAkKFwiLnBhZ2luYXRpb24tY2VudGVyZWRcIikuaGlkZSgpO1xuICAgICAgICAkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwibG9hZC1tb3JlXCI+PC9zcGFuPicgKTtcbiAgICAgICAgLy8kKCAnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInICkuZm91bmRhdGlvbigpOyAvL2luaXRpYWxpemUgZXF1YWxpemVyIHRoZSBmaXJzdCB0aW1lXG5cbiAgICAgICAgLy9SZWluaXRpYWxpemUgZXF1YWxpemVyIG9uIGV2ZXJ5IGFqYXggY2FsbFxuICAgICAgICAkKCBkb2N1bWVudCApLmFqYXhDb21wbGV0ZSggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3VuZGF0aW9uLnJlSW5pdCgnZXF1YWxpemVyJyk7IC8vaHR0cDovL2ZvdW5kYXRpb24uenVyYi5jb20vZm9ydW0vcG9zdHMvMzkzNjMtcmVmbG93LWVxdWFsaXNlclxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYnV0dG9uID0gJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXIgLmxvYWQtbW9yZScpO1xuICAgICAgICB2YXIgcGFnZSA9IDI7XG4gICAgICAgIHZhciBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHZhciBhbGxEb25lID0gZmFsc2U7XG4gICAgICAgIHZhciBzY3JvbGxIYW5kbGluZyA9IHtcbiAgICAgICAgICAgIGFsbG93OiB0cnVlLFxuICAgICAgICAgICAgcmVhbGxvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGF5OiA0MDAgLy8obWlsbGlzZWNvbmRzKSBhZGp1c3QgdG8gdGhlIGhpZ2hlc3QgYWNjZXB0YWJsZSB2YWx1ZVxuICAgICAgICB9O1xuXG4gICAgICAgICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKCAhIGxvYWRpbmcgJiYgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBhbGxEb25lICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNjcm9sbEhhbmRsaW5nLmFsbG93ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChzY3JvbGxIYW5kbGluZy5yZWFsbG93LCBzY3JvbGxIYW5kbGluZy5kZWxheSk7XG4gICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9ICQoYnV0dG9uKS5vZmZzZXQoKS50b3AgLSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgaWYoIDQwMDAgPiBvZmZzZXQgKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2JlX2FqYXhfbG9hZF9tb3JlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmNlOiBiZWxvYWRtb3JlLm5vbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZTogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiBiZWxvYWRtb3JlLnF1ZXJ5LFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAkLnBvc3QoYmVsb2FkbW9yZS51cmwsIGRhdGEsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIHJlcy5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIHJlcy5kYXRhICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIGJ1dHRvbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2UgPSBwYWdlICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoICFyZXMuZGF0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVx0XG59KTsiLCIvKiBHZW5lcmFsIHNpdGUtd2lkZSBzY3JpcHRzIGZvciBNU1AgRmx5IE1hZyAqL1xuXG4kKCcubWNfaW5wdXQnKS5hdHRyKFwicGxhY2Vob2xkZXJcIiwgXCJFbnRlciB5b3VyIGVtYWlsIGFkZHJlc3NcIik7XG5cbi8vU29tZSBwYWdlcyBkb24ndCBnZXQgZXF1YWxpemVkLCBzbyBtYWtlIHN1cmUgdGhleSBkb1xuRm91bmRhdGlvbi5yZUluaXQoJ2VxdWFsaXplcicpO1xuXG4vL0FjdGl2YXRlIHBvbHlmaWxsIGZvciBPYmplY3QgRml0IG9uIElFL0VkZ2Vcbm9iamVjdEZpdEltYWdlcygpO1xuXG5cbi8vaWYod2luZG93LmxvY2F0aW9uLmhyZWYuaW5kZXhPZihcIiNtY19zaWdudXBcIikgPiAtMSkge1xuLy9cdHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgXG4vL1x0XHR2YXIgc2hhcmVDb250YWluZXIgPSAkKCcjc2hhcmUtZm9sbG93Jyk7XG4vL1x0XHR2YXIgc2hhcmVQb3NpdGlvbiA9IHNoYXJlQ29udGFpbmVyLm9mZnNldCgpLnRvcDtcbi8vXHRcdCQoXCJodG1sLCBib2R5XCIpLmFuaW1hdGUoeyBzY3JvbGxUb3A6IHNoYXJlUG9zaXRpb24tNDB9LCA1MDApO1xuLy9cdCB9LCA1MDApO1xuLy99XG5cbi8vSGlkZSBtb2JpbGUgdG9wYmFyIGxvZ28gdW50aWwgd2Ugc2Nyb2xsIGRvd24gcGFnZVxuJCggd2luZG93ICkuc2Nyb2xsKGZ1bmN0aW9uKCkge1xuICAvL2NvbnNvbGUubG9nKCQoJy50aXRsZS1iYXItdGl0bGUnKS5vZmZzZXQoKS50b3ApO1xuICBpZiAoICQoJy50aXRsZS1iYXItdGl0bGUnKS5vZmZzZXQoKS50b3AgPiAxNDgpIHtcbiAgICAkKCcuaG9tZSAubW9iaWxlLWxvZ28nKS5yZW1vdmVDbGFzcygnaGlkZScpO1xuICB9IGVsc2Uge1xuICAgICQoJy5ob21lIC5tb2JpbGUtbG9nbycpLmFkZENsYXNzKCdoaWRlJyk7XG4gIH1cbn0pOyIsImlmICggJCgnLnBob3RvLWNhcm91c2VsLXNsaWRlcycpLmxlbmd0aCApIHtcbiAgJCgnLnBob3RvLWNhcm91c2VsLXNsaWRlcycpLnNsaWNrKHtcbiAgICBzbGlkZTogJ2xpJyxcbiAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgYXJyb3dzOiBmYWxzZSxcbiAgICBmYWRlOiB0cnVlLFxuICAgIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLWNvbnRyb2xzJ1xuICB9KTtcblxuICAkKCcucGhvdG8tY2Fyb3VzZWwtY29udHJvbHMnKS5zbGljayh7XG4gICAgc2xpZGU6ICdsaScsXG4gICAgc2xpZGVzVG9TaG93OiA3LFxuICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLXNsaWRlcycsXG4gICAgYXJyb3dzOiBmYWxzZSxcbiAgICBkb3RzOiBmYWxzZSxcbiAgICBjZW50ZXJNb2RlOiBmYWxzZSxcbiAgICBmb2N1c09uU2VsZWN0OiB0cnVlXG4gIH0pO1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
