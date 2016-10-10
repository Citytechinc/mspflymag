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
;"use strict";

var objectFitImages = function () {
  "use strict";
  function t(t) {
    for (var e, r = getComputedStyle(t).fontFamily, i = {}; null !== (e = n.exec(r));) {
      i[e[1]] = e[2];
    }return i;
  }function e(e, i) {
    if (!e[c].parsingSrcset) {
      var s = t(e);if (s["object-fit"] = s["object-fit"] || "fill", !e[c].s) {
        if ("fill" === s["object-fit"]) return;if (!e[c].skipTest && l && !s["object-position"]) return;
      }var n = e[c].ios7src || e.currentSrc || e.src;if (i) n = i;else if (e.srcset && !a && window.picturefill) {
        var o = window.picturefill._.ns;e[c].parsingSrcset = !0, e[o] && e[o].evaled || window.picturefill._.fillImg(e, { reselect: !0 }), e[o].curSrc || (e[o].supported = !1, window.picturefill._.fillImg(e, { reselect: !0 })), delete e[c].parsingSrcset, n = e[o].curSrc || n;
      }if (e[c].s) e[c].s = n, i && (e[c].srcAttr = i);else {
        e[c] = { s: n, srcAttr: i || f.call(e, "src"), srcsetAttr: e.srcset }, e.src = c;try {
          e.srcset && (e.srcset = "", Object.defineProperty(e, "srcset", { value: e[c].srcsetAttr })), r(e);
        } catch (t) {
          e[c].ios7src = n;
        }
      }e.style.backgroundImage = 'url("' + n + '")', e.style.backgroundPosition = s["object-position"] || "center", e.style.backgroundRepeat = "no-repeat", /scale-down/.test(s["object-fit"]) ? (e[c].i || (e[c].i = new Image(), e[c].i.src = n), function t() {
        return e[c].i.naturalWidth ? void (e[c].i.naturalWidth > e.width || e[c].i.naturalHeight > e.height ? e.style.backgroundSize = "contain" : e.style.backgroundSize = "auto") : void setTimeout(t, 100);
      }()) : e.style.backgroundSize = s["object-fit"].replace("none", "auto").replace("fill", "100% 100%");
    }
  }function r(t) {
    var r = { get: function () {
        return t[c].s;
      }, set: function (r) {
        return delete t[c].i, e(t, r), r;
      } };Object.defineProperty(t, "src", r), Object.defineProperty(t, "currentSrc", { get: r.get });
  }function i() {
    u || (HTMLImageElement.prototype.getAttribute = function (t) {
      return !this[c] || "src" !== t && "srcset" !== t ? f.call(this, t) : this[c][t + "Attr"];
    }, HTMLImageElement.prototype.setAttribute = function (t, e) {
      !this[c] || "src" !== t && "srcset" !== t ? g.call(this, t, e) : this["src" === t ? "src" : t + "Attr"] = String(e);
    });
  }function s(t, r) {
    var i = !A && !t;if (r = r || {}, t = t || "img", u && !r.skipTest) return !1;"string" == typeof t ? t = document.querySelectorAll("img") : t.length || (t = [t]);for (var n = 0; n < t.length; n++) {
      t[n][c] = t[n][c] || r, e(t[n]);
    }i && (document.body.addEventListener("load", function (t) {
      "IMG" === t.target.tagName && s(t.target, { skipTest: r.skipTest });
    }, !0), A = !0, t = "img"), r.watchMQ && window.addEventListener("resize", s.bind(null, t, { skipTest: r.skipTest }));
  }var c = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      n = /(object-fit|object-position)\s*:\s*([-\w\s%]+)/g,
      o = new Image(),
      l = "object-fit" in o.style,
      u = "object-position" in o.style,
      a = "string" == typeof o.currentSrc,
      f = o.getAttribute,
      g = o.setAttribute,
      A = !1;return s.supportsObjectFit = l, s.supportsObjectPosition = u, i(), s;
}();
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
;"use strict";

/*!-------------------------------------------------------
 * jQuery Validation Plugin - v1.12.0 - 4/1/2014
 * http://jqueryvalidation.org/
 * Copyright (c) 2014 JÃ¶rn Zaefferer; Licensed MIT 
---------------------------------------------------------*/
!function (a) {
  a.extend(a.fn, { validate: function (b) {
      if (!this.length) return void (b && b.debug && window.console && console.warn("Nothing selected, can't validate, returning nothing."));var c = a.data(this[0], "validator");return c ? c : (this.attr("novalidate", "novalidate"), c = new a.validator(b, this[0]), a.data(this[0], "validator", c), c.settings.onsubmit && (this.validateDelegate(":submit", "click", function (b) {
        c.settings.submitHandler && (c.submitButton = b.target), a(b.target).hasClass("cancel") && (c.cancelSubmit = !0), void 0 !== a(b.target).attr("formnovalidate") && (c.cancelSubmit = !0);
      }), this.submit(function (b) {
        function d() {
          var d;return c.settings.submitHandler ? (c.submitButton && (d = a("<input type='hidden'/>").attr("name", c.submitButton.name).val(a(c.submitButton).val()).appendTo(c.currentForm)), c.settings.submitHandler.call(c, c.currentForm, b), c.submitButton && d.remove(), !1) : !0;
        }return c.settings.debug && b.preventDefault(), c.cancelSubmit ? (c.cancelSubmit = !1, d()) : c.form() ? c.pendingRequest ? (c.formSubmitted = !0, !1) : d() : (c.focusInvalid(), !1);
      })), c);
    }, valid: function () {
      var b, c;return a(this[0]).is("form") ? b = this.validate().form() : (b = !0, c = a(this[0].form).validate(), this.each(function () {
        b = c.element(this) && b;
      })), b;
    }, removeAttrs: function (b) {
      var c = {},
          d = this;return a.each(b.split(/\s/), function (a, b) {
        c[b] = d.attr(b), d.removeAttr(b);
      }), c;
    }, rules: function (b, c) {
      var d,
          e,
          f,
          g,
          h,
          i,
          j = this[0];if (b) switch (d = a.data(j.form, "validator").settings, e = d.rules, f = a.validator.staticRules(j), b) {case "add":
          a.extend(f, a.validator.normalizeRule(c)), delete f.messages, e[j.name] = f, c.messages && (d.messages[j.name] = a.extend(d.messages[j.name], c.messages));break;case "remove":
          return c ? (i = {}, a.each(c.split(/\s/), function (b, c) {
            i[c] = f[c], delete f[c], "required" === c && a(j).removeAttr("aria-required");
          }), i) : (delete e[j.name], f);}return g = a.validator.normalizeRules(a.extend({}, a.validator.classRules(j), a.validator.attributeRules(j), a.validator.dataRules(j), a.validator.staticRules(j)), j), g.required && (h = g.required, delete g.required, g = a.extend({ required: h }, g), a(j).attr("aria-required", "true")), g.remote && (h = g.remote, delete g.remote, g = a.extend(g, { remote: h })), g;
    } }), a.extend(a.expr[":"], { blank: function (b) {
      return !a.trim("" + a(b).val());
    }, filled: function (b) {
      return !!a.trim("" + a(b).val());
    }, unchecked: function (b) {
      return !a(b).prop("checked");
    } }), a.validator = function (b, c) {
    this.settings = a.extend(!0, {}, a.validator.defaults, b), this.currentForm = c, this.init();
  }, a.validator.format = function (b, c) {
    return 1 === arguments.length ? function () {
      var c = a.makeArray(arguments);return c.unshift(b), a.validator.format.apply(this, c);
    } : (arguments.length > 2 && c.constructor !== Array && (c = a.makeArray(arguments).slice(1)), c.constructor !== Array && (c = [c]), a.each(c, function (a, c) {
      b = b.replace(new RegExp("\\{" + a + "\\}", "g"), function () {
        return c;
      });
    }), b);
  }, a.extend(a.validator, { defaults: { messages: {}, groups: {}, rules: {}, errorClass: "error", validClass: "valid", errorElement: "label", focusInvalid: !0, errorContainer: a([]), errorLabelContainer: a([]), onsubmit: !0, ignore: ":hidden", ignoreTitle: !1, onfocusin: function (a) {
        this.lastActive = a, this.settings.focusCleanup && !this.blockFocusCleanup && (this.settings.unhighlight && this.settings.unhighlight.call(this, a, this.settings.errorClass, this.settings.validClass), this.addWrapper(this.errorsFor(a)).hide());
      }, onfocusout: function (a) {
        this.checkable(a) || !(a.name in this.submitted) && this.optional(a) || this.element(a);
      }, onkeyup: function (a, b) {
        (9 !== b.which || "" !== this.elementValue(a)) && (a.name in this.submitted || a === this.lastElement) && this.element(a);
      }, onclick: function (a) {
        a.name in this.submitted ? this.element(a) : a.parentNode.name in this.submitted && this.element(a.parentNode);
      }, highlight: function (b, c, d) {
        "radio" === b.type ? this.findByName(b.name).addClass(c).removeClass(d) : a(b).addClass(c).removeClass(d);
      }, unhighlight: function (b, c, d) {
        "radio" === b.type ? this.findByName(b.name).removeClass(c).addClass(d) : a(b).removeClass(c).addClass(d);
      } }, setDefaults: function (b) {
      a.extend(a.validator.defaults, b);
    }, messages: { required: "This field is required.", remote: "Please fix this field.", email: "Please enter a valid email address.", url: "Please enter a valid URL.", date: "Please enter a valid date.", dateISO: "Please enter a valid date (ISO).", number: "Please enter a valid number.", digits: "Please enter only digits.", creditcard: "Please enter a valid credit card number.", equalTo: "Please enter the same value again.", maxlength: a.validator.format("Please enter no more than {0} characters."), minlength: a.validator.format("Please enter at least {0} characters."), rangelength: a.validator.format("Please enter a value between {0} and {1} characters long."), range: a.validator.format("Please enter a value between {0} and {1}."), max: a.validator.format("Please enter a value less than or equal to {0}."), min: a.validator.format("Please enter a value greater than or equal to {0}.") }, autoCreateRanges: !1, prototype: { init: function () {
        function b(b) {
          var c = a.data(this[0].form, "validator"),
              d = "on" + b.type.replace(/^validate/, ""),
              e = c.settings;e[d] && !this.is(e.ignore) && e[d].call(c, this[0], b);
        }this.labelContainer = a(this.settings.errorLabelContainer), this.errorContext = this.labelContainer.length && this.labelContainer || a(this.currentForm), this.containers = a(this.settings.errorContainer).add(this.settings.errorLabelContainer), this.submitted = {}, this.valueCache = {}, this.pendingRequest = 0, this.pending = {}, this.invalid = {}, this.reset();var c,
            d = this.groups = {};a.each(this.settings.groups, function (b, c) {
          "string" == typeof c && (c = c.split(/\s/)), a.each(c, function (a, c) {
            d[c] = b;
          });
        }), c = this.settings.rules, a.each(c, function (b, d) {
          c[b] = a.validator.normalizeRule(d);
        }), a(this.currentForm).validateDelegate(":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'] ,[type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], [type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'] ", "focusin focusout keyup", b).validateDelegate("[type='radio'], [type='checkbox'], select, option", "click", b), this.settings.invalidHandler && a(this.currentForm).bind("invalid-form.validate", this.settings.invalidHandler), a(this.currentForm).find("[required], [data-rule-required], .required").attr("aria-required", "true");
      }, form: function () {
        return this.checkForm(), a.extend(this.submitted, this.errorMap), this.invalid = a.extend({}, this.errorMap), this.valid() || a(this.currentForm).triggerHandler("invalid-form", [this]), this.showErrors(), this.valid();
      }, checkForm: function () {
        this.prepareForm();for (var a = 0, b = this.currentElements = this.elements(); b[a]; a++) {
          this.check(b[a]);
        }return this.valid();
      }, element: function (b) {
        var c = this.clean(b),
            d = this.validationTargetFor(c),
            e = !0;return this.lastElement = d, void 0 === d ? delete this.invalid[c.name] : (this.prepareElement(d), this.currentElements = a(d), e = this.check(d) !== !1, e ? delete this.invalid[d.name] : this.invalid[d.name] = !0), a(b).attr("aria-invalid", !e), this.numberOfInvalids() || (this.toHide = this.toHide.add(this.containers)), this.showErrors(), e;
      }, showErrors: function (b) {
        if (b) {
          a.extend(this.errorMap, b), this.errorList = [];for (var c in b) {
            this.errorList.push({ message: b[c], element: this.findByName(c)[0] });
          }this.successList = a.grep(this.successList, function (a) {
            return !(a.name in b);
          });
        }this.settings.showErrors ? this.settings.showErrors.call(this, this.errorMap, this.errorList) : this.defaultShowErrors();
      }, resetForm: function () {
        a.fn.resetForm && a(this.currentForm).resetForm(), this.submitted = {}, this.lastElement = null, this.prepareForm(), this.hideErrors(), this.elements().removeClass(this.settings.errorClass).removeData("previousValue").removeAttr("aria-invalid");
      }, numberOfInvalids: function () {
        return this.objectLength(this.invalid);
      }, objectLength: function (a) {
        var b,
            c = 0;for (b in a) {
          c++;
        }return c;
      }, hideErrors: function () {
        this.addWrapper(this.toHide).hide();
      }, valid: function () {
        return 0 === this.size();
      }, size: function () {
        return this.errorList.length;
      }, focusInvalid: function () {
        if (this.settings.focusInvalid) try {
          a(this.findLastActive() || this.errorList.length && this.errorList[0].element || []).filter(":visible").focus().trigger("focusin");
        } catch (b) {}
      }, findLastActive: function () {
        var b = this.lastActive;return b && 1 === a.grep(this.errorList, function (a) {
          return a.element.name === b.name;
        }).length && b;
      }, elements: function () {
        var b = this,
            c = {};return a(this.currentForm).find("input, select, textarea").not(":submit, :reset, :image, [disabled]").not(this.settings.ignore).filter(function () {
          return !this.name && b.settings.debug && window.console && console.error("%o has no name assigned", this), this.name in c || !b.objectLength(a(this).rules()) ? !1 : (c[this.name] = !0, !0);
        });
      }, clean: function (b) {
        return a(b)[0];
      }, errors: function () {
        var b = this.settings.errorClass.split(" ").join(".");return a(this.settings.errorElement + "." + b, this.errorContext);
      }, reset: function () {
        this.successList = [], this.errorList = [], this.errorMap = {}, this.toShow = a([]), this.toHide = a([]), this.currentElements = a([]);
      }, prepareForm: function () {
        this.reset(), this.toHide = this.errors().add(this.containers);
      }, prepareElement: function (a) {
        this.reset(), this.toHide = this.errorsFor(a);
      }, elementValue: function (b) {
        var c,
            d = a(b),
            e = d.attr("type");return "radio" === e || "checkbox" === e ? a("input[name='" + d.attr("name") + "']:checked").val() : (c = d.val(), "string" == typeof c ? c.replace(/\r/g, "") : c);
      }, check: function (b) {
        b = this.validationTargetFor(this.clean(b));var c,
            d,
            e,
            f = a(b).rules(),
            g = a.map(f, function (a, b) {
          return b;
        }).length,
            h = !1,
            i = this.elementValue(b);for (d in f) {
          e = { method: d, parameters: f[d] };try {
            if (c = a.validator.methods[d].call(this, i, b, e.parameters), "dependency-mismatch" === c && 1 === g) {
              h = !0;continue;
            }if (h = !1, "pending" === c) return void (this.toHide = this.toHide.not(this.errorsFor(b)));if (!c) return this.formatAndAdd(b, e), !1;
          } catch (j) {
            throw this.settings.debug && window.console && console.log("Exception occurred when checking element " + b.id + ", check the '" + e.method + "' method.", j), j;
          }
        }if (!h) return this.objectLength(f) && this.successList.push(b), !0;
      }, customDataMessage: function (b, c) {
        return a(b).data("msg" + c[0].toUpperCase() + c.substring(1).toLowerCase()) || a(b).data("msg");
      }, customMessage: function (a, b) {
        var c = this.settings.messages[a];return c && (c.constructor === String ? c : c[b]);
      }, findDefined: function () {
        for (var a = 0; a < arguments.length; a++) {
          if (void 0 !== arguments[a]) return arguments[a];
        }return void 0;
      }, defaultMessage: function (b, c) {
        return this.findDefined(this.customMessage(b.name, c), this.customDataMessage(b, c), !this.settings.ignoreTitle && b.title || void 0, a.validator.messages[c], "<strong>Warning: No message defined for " + b.name + "</strong>");
      }, formatAndAdd: function (b, c) {
        var d = this.defaultMessage(b, c.method),
            e = /\$?\{(\d+)\}/g;"function" == typeof d ? d = d.call(this, c.parameters, b) : e.test(d) && (d = a.validator.format(d.replace(e, "{$1}"), c.parameters)), this.errorList.push({ message: d, element: b, method: c.method }), this.errorMap[b.name] = d, this.submitted[b.name] = d;
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
        var d = this.errorsFor(b);d.length ? (d.removeClass(this.settings.validClass).addClass(this.settings.errorClass), d.html(c)) : (d = a("<" + this.settings.errorElement + ">").attr("for", this.idOrName(b)).addClass(this.settings.errorClass).html(c || ""), this.settings.wrapper && (d = d.hide().show().wrap("<" + this.settings.wrapper + "/>").parent()), this.labelContainer.append(d).length || (this.settings.errorPlacement ? this.settings.errorPlacement(d, a(b)) : d.insertAfter(b))), !c && this.settings.success && (d.text(""), "string" == typeof this.settings.success ? d.addClass(this.settings.success) : this.settings.success(d, b)), this.toShow = this.toShow.add(d);
      }, errorsFor: function (b) {
        var c = this.idOrName(b);return this.errors().filter(function () {
          return a(this).attr("for") === c;
        });
      }, idOrName: function (a) {
        return this.groups[a.name] || (this.checkable(a) ? a.name : a.id || a.name);
      }, validationTargetFor: function (a) {
        return this.checkable(a) && (a = this.findByName(a.name).not(this.settings.ignore)[0]), a;
      }, checkable: function (a) {
        return (/radio|checkbox/i.test(a.type)
        );
      }, findByName: function (b) {
        return a(this.currentForm).find("[name='" + b + "']");
      }, getLength: function (b, c) {
        switch (c.nodeName.toLowerCase()) {case "select":
            return a("option:selected", c).length;case "input":
            if (this.checkable(c)) return this.findByName(c.name).filter(":checked").length;}return b.length;
      }, depend: function (a, b) {
        return this.dependTypes[typeof a] ? this.dependTypes[typeof a](a, b) : !0;
      }, dependTypes: { "boolean": function (a) {
          return a;
        }, string: function (b, c) {
          return !!a(b, c.form).length;
        }, "function": function (a, b) {
          return a(b);
        } }, optional: function (b) {
        var c = this.elementValue(b);return !a.validator.methods.required.call(this, c, b) && "dependency-mismatch";
      }, startRequest: function (a) {
        this.pending[a.name] || (this.pendingRequest++, this.pending[a.name] = !0);
      }, stopRequest: function (b, c) {
        this.pendingRequest--, this.pendingRequest < 0 && (this.pendingRequest = 0), delete this.pending[b.name], c && 0 === this.pendingRequest && this.formSubmitted && this.form() ? (a(this.currentForm).submit(), this.formSubmitted = !1) : !c && 0 === this.pendingRequest && this.formSubmitted && (a(this.currentForm).triggerHandler("invalid-form", [this]), this.formSubmitted = !1);
      }, previousValue: function (b) {
        return a.data(b, "previousValue") || a.data(b, "previousValue", { old: null, valid: !0, message: this.defaultMessage(b, "remote") });
      } }, classRuleSettings: { required: { required: !0 }, email: { email: !0 }, url: { url: !0 }, date: { date: !0 }, dateISO: { dateISO: !0 }, number: { number: !0 }, digits: { digits: !0 }, creditcard: { creditcard: !0 } }, addClassRules: function (b, c) {
      b.constructor === String ? this.classRuleSettings[b] = c : a.extend(this.classRuleSettings, b);
    }, classRules: function (b) {
      var c = {},
          d = a(b).attr("class");return d && a.each(d.split(" "), function () {
        this in a.validator.classRuleSettings && a.extend(c, a.validator.classRuleSettings[this]);
      }), c;
    }, attributeRules: function (b) {
      var c,
          d,
          e = {},
          f = a(b),
          g = b.getAttribute("type");for (c in a.validator.methods) {
        "required" === c ? (d = b.getAttribute(c), "" === d && (d = !0), d = !!d) : d = f.attr(c), /min|max/.test(c) && (null === g || /number|range|text/.test(g)) && (d = Number(d)), d || 0 === d ? e[c] = d : g === c && "range" !== g && (e[c] = !0);
      }return e.maxlength && /-1|2147483647|524288/.test(e.maxlength) && delete e.maxlength, e;
    }, dataRules: function (b) {
      var c,
          d,
          e = {},
          f = a(b);for (c in a.validator.methods) {
        d = f.data("rule" + c[0].toUpperCase() + c.substring(1).toLowerCase()), void 0 !== d && (e[c] = d);
      }return e;
    }, staticRules: function (b) {
      var c = {},
          d = a.data(b.form, "validator");return d.settings.rules && (c = a.validator.normalizeRule(d.settings.rules[b.name]) || {}), c;
    }, normalizeRules: function (b, c) {
      return a.each(b, function (d, e) {
        if (e === !1) return void delete b[d];if (e.param || e.depends) {
          var f = !0;switch (typeof e.depends) {case "string":
              f = !!a(e.depends, c.form).length;break;case "function":
              f = e.depends.call(c, c);}f ? b[d] = void 0 !== e.param ? e.param : !0 : delete b[d];
        }
      }), a.each(b, function (d, e) {
        b[d] = a.isFunction(e) ? e(c) : e;
      }), a.each(["minlength", "maxlength"], function () {
        b[this] && (b[this] = Number(b[this]));
      }), a.each(["rangelength", "range"], function () {
        var c;b[this] && (a.isArray(b[this]) ? b[this] = [Number(b[this][0]), Number(b[this][1])] : "string" == typeof b[this] && (c = b[this].split(/[\s,]+/), b[this] = [Number(c[0]), Number(c[1])]));
      }), a.validator.autoCreateRanges && (b.min && b.max && (b.range = [b.min, b.max], delete b.min, delete b.max), b.minlength && b.maxlength && (b.rangelength = [b.minlength, b.maxlength], delete b.minlength, delete b.maxlength)), b;
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
        }return this.checkable(c) ? this.getLength(b, c) > 0 : a.trim(b).length > 0;
      }, email: function (a, b) {
        return this.optional(b) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(a);
      }, url: function (a, b) {
        return this.optional(b) || /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(a);
      }, date: function (a, b) {
        return this.optional(b) || !/Invalid|NaN/.test(new Date(a).toString());
      }, dateISO: function (a, b) {
        return this.optional(b) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(a);
      }, number: function (a, b) {
        return this.optional(b) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(a);
      }, digits: function (a, b) {
        return this.optional(b) || /^\d+$/.test(a);
      }, creditcard: function (a, b) {
        if (this.optional(b)) return "dependency-mismatch";if (/[^0-9 \-]+/.test(a)) return !1;var c,
            d,
            e = 0,
            f = 0,
            g = !1;if (a = a.replace(/\D/g, ""), a.length < 13 || a.length > 19) return !1;for (c = a.length - 1; c >= 0; c--) {
          d = a.charAt(c), f = parseInt(d, 10), g && (f *= 2) > 9 && (f -= 9), e += f, g = !g;
        }return e % 10 === 0;
      }, minlength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(a.trim(b), c);return this.optional(c) || e >= d;
      }, maxlength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(a.trim(b), c);return this.optional(c) || d >= e;
      }, rangelength: function (b, c, d) {
        var e = a.isArray(b) ? b.length : this.getLength(a.trim(b), c);return this.optional(c) || e >= d[0] && e <= d[1];
      }, min: function (a, b, c) {
        return this.optional(b) || a >= c;
      }, max: function (a, b, c) {
        return this.optional(b) || c >= a;
      }, range: function (a, b, c) {
        return this.optional(b) || a >= c[0] && a <= c[1];
      }, equalTo: function (b, c, d) {
        var e = a(d);return this.settings.onfocusout && e.unbind(".validate-equalTo").bind("blur.validate-equalTo", function () {
          a(c).valid();
        }), b === e.val();
      }, remote: function (b, c, d) {
        if (this.optional(c)) return "dependency-mismatch";var e,
            f,
            g = this.previousValue(c);return this.settings.messages[c.name] || (this.settings.messages[c.name] = {}), g.originalMessage = this.settings.messages[c.name].remote, this.settings.messages[c.name].remote = g.message, d = "string" == typeof d && { url: d } || d, g.old === b ? g.valid : (g.old = b, e = this, this.startRequest(c), f = {}, f[c.name] = b, a.ajax(a.extend(!0, { url: d, mode: "abort", port: "validate" + c.name, dataType: "json", data: f, context: e.currentForm, success: function (d) {
            var f,
                h,
                i,
                j = d === !0 || "true" === d;e.settings.messages[c.name].remote = g.originalMessage, j ? (i = e.formSubmitted, e.prepareElement(c), e.formSubmitted = i, e.successList.push(c), delete e.invalid[c.name], e.showErrors()) : (f = {}, h = d || e.defaultMessage(c, "remote"), f[c.name] = g.message = a.isFunction(h) ? h(b) : h, e.invalid[c.name] = !0, e.showErrors(f)), g.valid = j, e.stopRequest(c, j);
          } }, d)), "pending");
      } } }), a.format = function () {
    throw "$.format has been deprecated. Please use $.validator.format instead.";
  };
}(jQuery), function (a) {
  var b,
      c = {};a.ajaxPrefilter ? a.ajaxPrefilter(function (a, b, d) {
    var e = a.port;"abort" === a.mode && (c[e] && c[e].abort(), c[e] = d);
  }) : (b = a.ajax, a.ajax = function (d) {
    var e = ("mode" in d ? d : a.ajaxSettings).mode,
        f = ("port" in d ? d : a.ajaxSettings).port;return "abort" === e ? (c[f] && c[f].abort(), c[f] = b.apply(this, arguments), c[f]) : b.apply(this, arguments);
  });
}(jQuery), function (a) {
  a.extend(a.fn, { validateDelegate: function (b, c, d) {
      return this.bind(c, function (c) {
        var e = a(c.target);return e.is(b) ? d.apply(e, arguments) : void 0;
      });
    } });
}(jQuery);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub3JiaXQuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlLmpzIiwiZm91bmRhdGlvbi5yZXZlYWwuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsIm1vdGlvbi11aS5qcyIsIm9maS5icm93c2VyLmpzIiwiZmxleC12aWRlby5qcyIsImluaXQtZm91bmRhdGlvbi5qcyIsImluc3RhbnQtY29tbWVudC12YWxpZGF0aW9uLmpzIiwianF1ZXJ5LnZhbGlkYXRlLm1pbi5qcyIsImxvYWQtbW9yZS5qcyIsIm1zcGZseS5qcyIsInBob3RvLWNhcm91c2VsLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIndoYXRJbnB1dCIsImFjdGl2ZUtleXMiLCJib2R5IiwiYnVmZmVyIiwiY3VycmVudElucHV0Iiwibm9uVHlwaW5nSW5wdXRzIiwibW91c2VXaGVlbCIsImRldGVjdFdoZWVsIiwiaWdub3JlTWFwIiwiaW5wdXRNYXAiLCJpbnB1dFR5cGVzIiwia2V5TWFwIiwicG9pbnRlck1hcCIsInRpbWVyIiwiZXZlbnRCdWZmZXIiLCJjbGVhclRpbWVyIiwic2V0SW5wdXQiLCJldmVudCIsInNldFRpbWVvdXQiLCJidWZmZXJlZEV2ZW50IiwidW5CdWZmZXJlZEV2ZW50IiwiY2xlYXJUaW1lb3V0IiwiZXZlbnRLZXkiLCJrZXkiLCJ2YWx1ZSIsInR5cGUiLCJwb2ludGVyVHlwZSIsImV2ZW50VGFyZ2V0IiwidGFyZ2V0IiwiZXZlbnRUYXJnZXROb2RlIiwibm9kZU5hbWUiLCJ0b0xvd2VyQ2FzZSIsImV2ZW50VGFyZ2V0VHlwZSIsImdldEF0dHJpYnV0ZSIsImhhc0F0dHJpYnV0ZSIsImluZGV4T2YiLCJzd2l0Y2hJbnB1dCIsImxvZ0tleXMiLCJzdHJpbmciLCJzZXRBdHRyaWJ1dGUiLCJwdXNoIiwia2V5Q29kZSIsIndoaWNoIiwic3JjRWxlbWVudCIsInVuTG9nS2V5cyIsImFycmF5UG9zIiwic3BsaWNlIiwiYmluZEV2ZW50cyIsImRvY3VtZW50IiwiUG9pbnRlckV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsIk1TUG9pbnRlckV2ZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubW91c2V3aGVlbCIsInVuZGVmaW5lZCIsIkFycmF5IiwicHJvdG90eXBlIiwiYXNrIiwia2V5cyIsInR5cGVzIiwic2V0IiwiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwidW5yZWdpc3RlclBsdWdpbiIsInJlbW92ZUF0dHIiLCJyZW1vdmVEYXRhIiwicHJvcCIsInJlSW5pdCIsInBsdWdpbnMiLCJpc0pRIiwiZWFjaCIsIl9pbml0IiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0IiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJlbmQiLCJ0Iiwic3R5bGUiLCJ0cmlnZ2VySGFuZGxlciIsInV0aWwiLCJ0aHJvdHRsZSIsImZ1bmMiLCJkZWxheSIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiY2FsbCIsInBsdWdDbGFzcyIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwia2NzIiwiayIsImtjIiwiZGVmYXVsdFF1ZXJpZXMiLCJsYW5kc2NhcGUiLCJwb3J0cmFpdCIsInJldGluYSIsInF1ZXJpZXMiLCJjdXJyZW50Iiwic2VsZiIsImV4dHJhY3RlZFN0eWxlcyIsImNzcyIsIm5hbWVkUXVlcmllcyIsInBhcnNlU3R5bGVUb09iamVjdCIsImhhc093blByb3BlcnR5IiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwib24iLCJuZXdTaXplIiwiY3VycmVudFNpemUiLCJzdHlsZU1lZGlhIiwibWVkaWEiLCJzY3JpcHQiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsImluZm8iLCJpZCIsImluc2VydEJlZm9yZSIsImdldENvbXB1dGVkU3R5bGUiLCJjdXJyZW50U3R5bGUiLCJtYXRjaE1lZGl1bSIsInRleHQiLCJzdHlsZVNoZWV0IiwiY3NzVGV4dCIsInRleHRDb250ZW50Iiwic3R5bGVPYmplY3QiLCJyZWR1Y2UiLCJyZXQiLCJwYXJhbSIsInBhcnRzIiwidmFsIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiaXNBcnJheSIsImluaXRDbGFzc2VzIiwiYWN0aXZlQ2xhc3NlcyIsIk1vdGlvbiIsImFuaW1hdGVJbiIsImFuaW1hdGlvbiIsImNiIiwiYW5pbWF0ZSIsImFuaW1hdGVPdXQiLCJNb3ZlIiwiZHVyYXRpb24iLCJhbmltIiwicHJvZyIsIm1vdmUiLCJ0cyIsImlzSW4iLCJlcSIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwibmF0dXJhbFdpZHRoIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsInByZXZlbnREZWZhdWx0IiwibW92ZVRocmVzaG9sZCIsInRpbWVUaHJlc2hvbGQiLCJzdGFydFBvc1giLCJzdGFydFBvc1kiLCJzdGFydFRpbWUiLCJlbGFwc2VkVGltZSIsImlzTW92aW5nIiwib25Ub3VjaEVuZCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvblRvdWNoTW92ZSIsIngiLCJ0b3VjaGVzIiwicGFnZVgiLCJ5IiwicGFnZVkiLCJkeCIsImR5IiwiZGlyIiwiYWJzIiwib25Ub3VjaFN0YXJ0IiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwibG9hZCIsImNoZWNrTGlzdGVuZXJzIiwiZXZlbnRzTGlzdGVuZXIiLCJyZXNpemVMaXN0ZW5lciIsInNjcm9sbExpc3RlbmVyIiwiY2xvc2VtZUxpc3RlbmVyIiwieWV0aUJveGVzIiwicGx1Z05hbWVzIiwibGlzdGVuZXJzIiwiam9pbiIsIm9mZiIsInBsdWdpbklkIiwibm90IiwiZGVib3VuY2UiLCIkbm9kZXMiLCJub2RlcyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uIiwibXV0YXRpb25SZWNvcmRzTGlzdCIsIiR0YXJnZXQiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJBYmlkZSIsImRlZmF1bHRzIiwiJGlucHV0cyIsIl9ldmVudHMiLCJyZXNldEZvcm0iLCJ2YWxpZGF0ZUZvcm0iLCJ2YWxpZGF0ZU9uIiwidmFsaWRhdGVJbnB1dCIsImxpdmVWYWxpZGF0ZSIsImlzR29vZCIsImNoZWNrZWQiLCIkZXJyb3IiLCJzaWJsaW5ncyIsImZvcm1FcnJvclNlbGVjdG9yIiwiJGxhYmVsIiwiY2xvc2VzdCIsIiRlbHMiLCJsYWJlbHMiLCJmaW5kTGFiZWwiLCIkZm9ybUVycm9yIiwiZmluZEZvcm1FcnJvciIsImxhYmVsRXJyb3JDbGFzcyIsImZvcm1FcnJvckNsYXNzIiwiaW5wdXRFcnJvckNsYXNzIiwiZ3JvdXBOYW1lIiwiJGxhYmVscyIsImZpbmRSYWRpb0xhYmVscyIsIiRmb3JtRXJyb3JzIiwicmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMiLCJjbGVhclJlcXVpcmUiLCJyZXF1aXJlZENoZWNrIiwidmFsaWRhdGVkIiwiY3VzdG9tVmFsaWRhdG9yIiwidmFsaWRhdG9yIiwiZXF1YWxUbyIsInZhbGlkYXRlUmFkaW8iLCJ2YWxpZGF0ZVRleHQiLCJtYXRjaFZhbGlkYXRpb24iLCJ2YWxpZGF0b3JzIiwiZ29vZFRvR28iLCJtZXNzYWdlIiwiYWNjIiwibm9FcnJvciIsInBhdHRlcm4iLCJpbnB1dFRleHQiLCJ2YWxpZCIsInBhdHRlcm5zIiwiUmVnRXhwIiwiJGdyb3VwIiwicmVxdWlyZWQiLCJjbGVhciIsInYiLCIkZm9ybSIsInJlbW92ZUVycm9yQ2xhc3NlcyIsImFscGhhIiwiYWxwaGFfbnVtZXJpYyIsImludGVnZXIiLCJudW1iZXIiLCJjYXJkIiwiY3Z2IiwiZW1haWwiLCJ1cmwiLCJkb21haW4iLCJkYXRldGltZSIsImRhdGUiLCJ0aW1lIiwiZGF0ZUlTTyIsIm1vbnRoX2RheV95ZWFyIiwiZGF5X21vbnRoX3llYXIiLCJjb2xvciIsIkFjY29yZGlvbiIsIiR0YWJzIiwiaWR4IiwiJGNvbnRlbnQiLCJsaW5rSWQiLCIkaW5pdEFjdGl2ZSIsImRvd24iLCIkdGFiQ29udGVudCIsImhhc0NsYXNzIiwiYWxsb3dBbGxDbG9zZWQiLCJ1cCIsInRvZ2dsZSIsIm5leHQiLCIkYSIsImZvY3VzIiwibXVsdGlFeHBhbmQiLCJwcmV2aW91cyIsInByZXYiLCJmaXJzdFRpbWUiLCIkY3VycmVudEFjdGl2ZSIsInNsaWRlRG93biIsInNsaWRlU3BlZWQiLCIkYXVudHMiLCJjYW5DbG9zZSIsInNsaWRlVXAiLCJzdG9wIiwiQWNjb3JkaW9uTWVudSIsIm11bHRpT3BlbiIsIiRtZW51TGlua3MiLCJzdWJJZCIsImlzQWN0aXZlIiwiaW5pdFBhbmVzIiwiJHN1Ym1lbnUiLCIkZWxlbWVudHMiLCIkcHJldkVsZW1lbnQiLCIkbmV4dEVsZW1lbnQiLCJtaW4iLCJwYXJlbnRzIiwib3BlbiIsImNsb3NlIiwiY2xvc2VBbGwiLCJoaWRlQWxsIiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwicGFyZW50c1VudGlsIiwiYWRkIiwiJG1lbnVzIiwiRHJpbGxkb3duIiwiJHN1Ym1lbnVBbmNob3JzIiwiJHN1Ym1lbnVzIiwiJG1lbnVJdGVtcyIsIl9wcmVwYXJlTWVudSIsIl9rZXlib2FyZEV2ZW50cyIsIiRsaW5rIiwicGFyZW50TGluayIsImNsb25lIiwicHJlcGVuZFRvIiwid3JhcCIsIiRtZW51IiwiJGJhY2siLCJwcmVwZW5kIiwiYmFja0J1dHRvbiIsIl9iYWNrIiwiJHdyYXBwZXIiLCJ3cmFwcGVyIiwiX2dldE1heERpbXMiLCJfc2hvdyIsImNsb3NlT25DbGljayIsIiRib2R5IiwiY29udGFpbnMiLCJfaGlkZUFsbCIsIl9oaWRlIiwiYmx1ciIsInJlc3VsdCIsIm51bU9mRWxlbXMiLCJ1bndyYXAiLCJyZW1vdmUiLCJEcm9wZG93biIsIiRpZCIsIiRhbmNob3IiLCJwb3NpdGlvbkNsYXNzIiwiZ2V0UG9zaXRpb25DbGFzcyIsImNvdW50ZXIiLCJ1c2VkUG9zaXRpb25zIiwidmVydGljYWxQb3NpdGlvbiIsIm1hdGNoIiwiaG9yaXpvbnRhbFBvc2l0aW9uIiwiY2xhc3NDaGFuZ2VkIiwiZGlyZWN0aW9uIiwiX3JlcG9zaXRpb24iLCJfc2V0UG9zaXRpb24iLCJob3ZlciIsInRpbWVvdXQiLCJob3ZlckRlbGF5IiwiaG92ZXJQYW5lIiwidmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzIiwidGFiX2ZvcndhcmQiLCJ0cmFwRm9jdXMiLCJ0YWJfYmFja3dhcmQiLCJhdXRvRm9jdXMiLCIkZm9jdXNhYmxlIiwiX2FkZEJvZHlIYW5kbGVyIiwiY3VyUG9zaXRpb25DbGFzcyIsIkRyb3Bkb3duTWVudSIsInN1YnMiLCJ2ZXJ0aWNhbENsYXNzIiwicmlnaHRDbGFzcyIsImFsaWdubWVudCIsImNoYW5nZWQiLCJoYXNUb3VjaCIsIm9udG91Y2hzdGFydCIsInBhckNsYXNzIiwiaGFuZGxlQ2xpY2tGbiIsImhhc1N1YiIsImhhc0NsaWNrZWQiLCJjbGlja09wZW4iLCJmb3JjZUZvbGxvdyIsImRpc2FibGVIb3ZlciIsImF1dG9jbG9zZSIsImNsb3NpbmdUaW1lIiwiaXNUYWIiLCJpbmRleCIsIm5leHRTaWJsaW5nIiwicHJldlNpYmxpbmciLCJvcGVuU3ViIiwiY2xvc2VTdWIiLCIkc2licyIsIm9sZENsYXNzIiwiJHBhcmVudExpIiwiJHRvQ2xvc2UiLCJzb21ldGhpbmdUb0Nsb3NlIiwiRXF1YWxpemVyIiwiZXFJZCIsIiR3YXRjaGVkIiwiaGFzTmVzdGVkIiwiaXNOZXN0ZWQiLCJpc09uIiwiX2JpbmRIYW5kbGVyIiwib25SZXNpemVNZUJvdW5kIiwiX29uUmVzaXplTWUiLCJvblBvc3RFcXVhbGl6ZWRCb3VuZCIsIl9vblBvc3RFcXVhbGl6ZWQiLCJpbWdzIiwidG9vU21hbGwiLCJlcXVhbGl6ZU9uIiwiX2NoZWNrTVEiLCJfcmVmbG93IiwiX3BhdXNlRXZlbnRzIiwiZXF1YWxpemVPblN0YWNrIiwiX2lzU3RhY2tlZCIsImVxdWFsaXplQnlSb3ciLCJnZXRIZWlnaHRzQnlSb3ciLCJhcHBseUhlaWdodEJ5Um93IiwiZ2V0SGVpZ2h0cyIsImFwcGx5SGVpZ2h0IiwiaGVpZ2h0cyIsImxlbiIsIm9mZnNldEhlaWdodCIsImxhc3RFbFRvcE9mZnNldCIsImdyb3VwcyIsImdyb3VwIiwiZWxPZmZzZXRUb3AiLCJqIiwibG4iLCJncm91cHNJTGVuZ3RoIiwibGVuSiIsIkludGVyY2hhbmdlIiwicnVsZXMiLCJjdXJyZW50UGF0aCIsIl9hZGRCcmVha3BvaW50cyIsIl9nZW5lcmF0ZVJ1bGVzIiwicnVsZSIsInBhdGgiLCJTUEVDSUFMX1FVRVJJRVMiLCJydWxlc0xpc3QiLCJyZXNwb25zZSIsImh0bWwiLCJNYWdlbGxhbiIsIiR0YXJnZXRzIiwiJGxpbmtzIiwiJGFjdGl2ZSIsInNjcm9sbFBvcyIsInBhcnNlSW50IiwicG9pbnRzIiwid2luSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJkb2NIZWlnaHQiLCJzY3JvbGxIZWlnaHQiLCIkdGFyIiwicHQiLCJ0aHJlc2hvbGQiLCJ0YXJnZXRQb2ludCIsImFuaW1hdGlvbkR1cmF0aW9uIiwiZWFzaW5nIiwiYW5pbWF0aW9uRWFzaW5nIiwiZGVlcExpbmtpbmciLCJsb2NhdGlvbiIsImhhc2giLCJzY3JvbGxUb0xvYyIsImNhbGNQb2ludHMiLCJfdXBkYXRlQWN0aXZlIiwiYXJyaXZhbCIsImxvYyIsImJhck9mZnNldCIsInNjcm9sbFRvcCIsIndpblBvcyIsImN1cklkeCIsImlzRG93biIsImN1clZpc2libGUiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiT3JiaXQiLCJjb250YWluZXJDbGFzcyIsIiRzbGlkZXMiLCJzbGlkZUNsYXNzIiwiJGltYWdlcyIsImluaXRBY3RpdmUiLCJ1c2VNVUkiLCJfcHJlcGFyZUZvck9yYml0IiwiYnVsbGV0cyIsIl9sb2FkQnVsbGV0cyIsImF1dG9QbGF5IiwiZ2VvU3luYyIsImFjY2Vzc2libGUiLCIkYnVsbGV0cyIsImJveE9mQnVsbGV0cyIsInRpbWVyRGVsYXkiLCJjaGFuZ2VTbGlkZSIsIl9zZXRXcmFwcGVySGVpZ2h0IiwiX3NldFNsaWRlSGVpZ2h0IiwidGVtcCIsInBhdXNlT25Ib3ZlciIsIm5hdkJ1dHRvbnMiLCIkY29udHJvbHMiLCJuZXh0Q2xhc3MiLCJwcmV2Q2xhc3MiLCIkc2xpZGUiLCJpc0xUUiIsImNob3NlblNsaWRlIiwiJGN1clNsaWRlIiwiJGZpcnN0U2xpZGUiLCIkbGFzdFNsaWRlIiwibGFzdCIsImRpckluIiwiZGlyT3V0IiwiJG5ld1NsaWRlIiwiaW5maW5pdGVXcmFwIiwiX3VwZGF0ZUJ1bGxldHMiLCIkb2xkQnVsbGV0Iiwic3BhbiIsImRldGFjaCIsIiRuZXdCdWxsZXQiLCJhcHBlbmQiLCJhbmltSW5Gcm9tUmlnaHQiLCJhbmltT3V0VG9SaWdodCIsImFuaW1JbkZyb21MZWZ0IiwiYW5pbU91dFRvTGVmdCIsIlJlc3BvbnNpdmVNZW51IiwiY3VycmVudE1xIiwiY3VycmVudFBsdWdpbiIsInJ1bGVzVHJlZSIsInJ1bGVTaXplIiwicnVsZVBsdWdpbiIsIk1lbnVQbHVnaW5zIiwiaXNFbXB0eU9iamVjdCIsIl9jaGVja01lZGlhUXVlcmllcyIsIm1hdGNoZWRNcSIsImNzc0NsYXNzIiwiZGVzdHJveSIsImRyb3Bkb3duIiwiZHJpbGxkb3duIiwiYWNjb3JkaW9uIiwiUmVzcG9uc2l2ZVRvZ2dsZSIsInRhcmdldElEIiwiJHRhcmdldE1lbnUiLCIkdG9nZ2xlciIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJSZXZlYWwiLCJjYWNoZWQiLCJtcSIsImlzTW9iaWxlIiwibW9iaWxlU25pZmYiLCJmdWxsU2NyZWVuIiwib3ZlcmxheSIsIiRvdmVybGF5IiwiX21ha2VPdmVybGF5IiwiZGVlcExpbmsiLCJvdXRlcldpZHRoIiwib3V0ZXJIZWlnaHQiLCJtYXJnaW4iLCJfdXBkYXRlUG9zaXRpb24iLCJfaGFuZGxlU3RhdGUiLCJtdWx0aXBsZU9wZW5lZCIsImFuaW1hdGlvbkluIiwiYWZ0ZXJBbmltYXRpb25Gb2N1cyIsImxvZyIsImZvY3VzYWJsZUVsZW1lbnRzIiwic2hvd0RlbGF5Iiwib3JpZ2luYWxTY3JvbGxQb3MiLCJfZXh0cmFIYW5kbGVycyIsImNsb3NlT25Fc2MiLCJhbmltYXRpb25PdXQiLCJmaW5pc2hVcCIsImhpZGVEZWxheSIsInJlc2V0T25DbG9zZSIsInJlcGxhY2VTdGF0ZSIsInRpdGxlIiwicGF0aG5hbWUiLCJidG1PZmZzZXRQY3QiLCJpUGhvbmVTbmlmZiIsImFuZHJvaWRTbmlmZiIsIlN0aWNreSIsIiRwYXJlbnQiLCJ3YXNXcmFwcGVkIiwiJGNvbnRhaW5lciIsImNvbnRhaW5lciIsIndyYXBJbm5lciIsInN0aWNreUNsYXNzIiwic2Nyb2xsQ291bnQiLCJjaGVja0V2ZXJ5IiwiaXNTdHVjayIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsIl9jYWxjIiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwic2Nyb2xsIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJlbGVtSGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiY29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIiRmaXJzdFRhYiIsIiRsYXN0VGFiIiwid3JhcE9uS2V5cyIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCIkb2xkVGFiIiwiaWRTdHIiLCJwYW5lbENsYXNzIiwicGFuZWwiLCJjaGVja0NsYXNzIiwiVG9nZ2xlciIsImlucHV0IiwidG9nZ2xlQ2xhc3MiLCJfdXBkYXRlQVJJQSIsIlRvb2x0aXAiLCJpc0NsaWNrIiwiZWxlbUlkIiwiX2dldFBvc2l0aW9uQ2xhc3MiLCJ0aXBUZXh0IiwidGVtcGxhdGUiLCJfYnVpbGRUZW1wbGF0ZSIsInRyaWdnZXJDbGFzcyIsInRlbXBsYXRlQ2xhc3NlcyIsInRvb2x0aXBDbGFzcyIsIiR0ZW1wbGF0ZSIsIiR0aXBEaW1zIiwic2hvd09uIiwiZmFkZUluIiwiZmFkZUluRHVyYXRpb24iLCJmYWRlT3V0RHVyYXRpb24iLCJpc0ZvY3VzIiwiZGlzYWJsZUZvclRvdWNoIiwidG91Y2hDbG9zZVRleHQiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwib2JqZWN0Rml0SW1hZ2VzIiwiciIsImZvbnRGYW1pbHkiLCJuIiwiYyIsInBhcnNpbmdTcmNzZXQiLCJzIiwic2tpcFRlc3QiLCJsIiwiaW9zN3NyYyIsImN1cnJlbnRTcmMiLCJzcmMiLCJzcmNzZXQiLCJhIiwicGljdHVyZWZpbGwiLCJvIiwiXyIsIm5zIiwiZXZhbGVkIiwiZmlsbEltZyIsInJlc2VsZWN0IiwiY3VyU3JjIiwic3VwcG9ydGVkIiwic3JjQXR0ciIsImYiLCJzcmNzZXRBdHRyIiwiZGVmaW5lUHJvcGVydHkiLCJiYWNrZ3JvdW5kSW1hZ2UiLCJiYWNrZ3JvdW5kUG9zaXRpb24iLCJiYWNrZ3JvdW5kUmVwZWF0IiwiSW1hZ2UiLCJuYXR1cmFsSGVpZ2h0IiwiYmFja2dyb3VuZFNpemUiLCJ1IiwiSFRNTEltYWdlRWxlbWVudCIsImciLCJBIiwidGFnTmFtZSIsIndhdGNoTVEiLCJzdXBwb3J0c09iamVjdEZpdCIsInN1cHBvcnRzT2JqZWN0UG9zaXRpb24iLCJhZGRNZXRob2QiLCJvcHRpb25hbCIsInJlYWR5IiwidmFsaWRhdGUiLCJhdXRob3IiLCJtaW5sZW5ndGgiLCJjb21tZW50IiwibWVzc2FnZXMiLCJlcnJvckVsZW1lbnQiLCJlcnJvclBsYWNlbWVudCIsImFmdGVyIiwiYiIsImRlYnVnIiwic2V0dGluZ3MiLCJvbnN1Ym1pdCIsInZhbGlkYXRlRGVsZWdhdGUiLCJzdWJtaXRIYW5kbGVyIiwic3VibWl0QnV0dG9uIiwiY2FuY2VsU3VibWl0Iiwic3VibWl0IiwiZCIsImN1cnJlbnRGb3JtIiwiZm9ybSIsInBlbmRpbmdSZXF1ZXN0IiwiZm9ybVN1Ym1pdHRlZCIsImZvY3VzSW52YWxpZCIsInJlbW92ZUF0dHJzIiwiaCIsInN0YXRpY1J1bGVzIiwibm9ybWFsaXplUnVsZSIsIm5vcm1hbGl6ZVJ1bGVzIiwiY2xhc3NSdWxlcyIsImF0dHJpYnV0ZVJ1bGVzIiwiZGF0YVJ1bGVzIiwicmVtb3RlIiwiZXhwciIsImJsYW5rIiwiZmlsbGVkIiwidW5jaGVja2VkIiwiZm9ybWF0IiwibWFrZUFycmF5IiwidW5zaGlmdCIsImVycm9yQ2xhc3MiLCJ2YWxpZENsYXNzIiwiZXJyb3JDb250YWluZXIiLCJlcnJvckxhYmVsQ29udGFpbmVyIiwiaWdub3JlIiwiaWdub3JlVGl0bGUiLCJvbmZvY3VzaW4iLCJsYXN0QWN0aXZlIiwiZm9jdXNDbGVhbnVwIiwiYmxvY2tGb2N1c0NsZWFudXAiLCJ1bmhpZ2hsaWdodCIsImFkZFdyYXBwZXIiLCJlcnJvcnNGb3IiLCJvbmZvY3Vzb3V0IiwiY2hlY2thYmxlIiwic3VibWl0dGVkIiwib25rZXl1cCIsImVsZW1lbnRWYWx1ZSIsImxhc3RFbGVtZW50Iiwib25jbGljayIsImhpZ2hsaWdodCIsImZpbmRCeU5hbWUiLCJzZXREZWZhdWx0cyIsImRpZ2l0cyIsImNyZWRpdGNhcmQiLCJtYXhsZW5ndGgiLCJyYW5nZWxlbmd0aCIsInJhbmdlIiwiYXV0b0NyZWF0ZVJhbmdlcyIsImxhYmVsQ29udGFpbmVyIiwiZXJyb3JDb250ZXh0IiwiY29udGFpbmVycyIsInZhbHVlQ2FjaGUiLCJwZW5kaW5nIiwiaW52YWxpZCIsImludmFsaWRIYW5kbGVyIiwiY2hlY2tGb3JtIiwiZXJyb3JNYXAiLCJzaG93RXJyb3JzIiwicHJlcGFyZUZvcm0iLCJjdXJyZW50RWxlbWVudHMiLCJlbGVtZW50cyIsImNoZWNrIiwiY2xlYW4iLCJ2YWxpZGF0aW9uVGFyZ2V0Rm9yIiwicHJlcGFyZUVsZW1lbnQiLCJudW1iZXJPZkludmFsaWRzIiwidG9IaWRlIiwiZXJyb3JMaXN0Iiwic3VjY2Vzc0xpc3QiLCJncmVwIiwiZGVmYXVsdFNob3dFcnJvcnMiLCJoaWRlRXJyb3JzIiwib2JqZWN0TGVuZ3RoIiwiZmluZExhc3RBY3RpdmUiLCJlcnJvcnMiLCJ0b1Nob3ciLCJwYXJhbWV0ZXJzIiwibWV0aG9kcyIsImZvcm1hdEFuZEFkZCIsImN1c3RvbURhdGFNZXNzYWdlIiwic3Vic3RyaW5nIiwiY3VzdG9tTWVzc2FnZSIsImZpbmREZWZpbmVkIiwiZGVmYXVsdE1lc3NhZ2UiLCJzaG93TGFiZWwiLCJzdWNjZXNzIiwidmFsaWRFbGVtZW50cyIsImludmFsaWRFbGVtZW50cyIsImlkT3JOYW1lIiwiaW5zZXJ0QWZ0ZXIiLCJnZXRMZW5ndGgiLCJkZXBlbmQiLCJkZXBlbmRUeXBlcyIsInN0YXJ0UmVxdWVzdCIsInN0b3BSZXF1ZXN0IiwicHJldmlvdXNWYWx1ZSIsIm9sZCIsImNsYXNzUnVsZVNldHRpbmdzIiwiYWRkQ2xhc3NSdWxlcyIsIk51bWJlciIsImRlcGVuZHMiLCJpc0Z1bmN0aW9uIiwiY2hhckF0IiwidW5iaW5kIiwib3JpZ2luYWxNZXNzYWdlIiwiYWpheCIsIm1vZGUiLCJwb3J0IiwiZGF0YVR5cGUiLCJhamF4UHJlZmlsdGVyIiwiYWJvcnQiLCJhamF4U2V0dGluZ3MiLCJhamF4Q29tcGxldGUiLCJidXR0b24iLCJwYWdlIiwibG9hZGluZyIsImFsbERvbmUiLCJzY3JvbGxIYW5kbGluZyIsImFsbG93IiwicmVhbGxvdyIsImFjdGlvbiIsIm5vbmNlIiwiYmVsb2FkbW9yZSIsInBvc3QiLCJyZXMiLCJmYWlsIiwieGhyIiwidGV4dFN0YXR1cyIsInNsaWNrIiwic2xpZGUiLCJzbGlkZXNUb1Nob3ciLCJzbGlkZXNUb1Njcm9sbCIsImFycm93cyIsImZhZGUiLCJhc05hdkZvciIsImRvdHMiLCJjZW50ZXJNb2RlIiwiZm9jdXNPblNlbGVjdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsT0FBT0MsU0FBUCxHQUFvQixZQUFXOztBQUU3Qjs7QUFFQTs7Ozs7O0FBTUE7O0FBQ0EsTUFBSUMsYUFBYSxFQUFqQjs7QUFFQTtBQUNBLE1BQUlDLElBQUo7O0FBRUE7QUFDQSxNQUFJQyxTQUFTLEtBQWI7O0FBRUE7QUFDQSxNQUFJQyxlQUFlLElBQW5COztBQUVBO0FBQ0EsTUFBSUMsa0JBQWtCLENBQ3BCLFFBRG9CLEVBRXBCLFVBRm9CLEVBR3BCLE1BSG9CLEVBSXBCLE9BSm9CLEVBS3BCLE9BTG9CLEVBTXBCLE9BTm9CLEVBT3BCLFFBUG9CLENBQXRCOztBQVVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhQyxhQUFqQjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsWUFBWSxDQUNkLEVBRGMsRUFDVjtBQUNKLElBRmMsRUFFVjtBQUNKLElBSGMsRUFHVjtBQUNKLElBSmMsRUFJVjtBQUNKLElBTGMsQ0FLVjtBQUxVLEdBQWhCOztBQVFBO0FBQ0EsTUFBSUMsV0FBVztBQUNiLGVBQVcsVUFERTtBQUViLGFBQVMsVUFGSTtBQUdiLGlCQUFhLE9BSEE7QUFJYixpQkFBYSxPQUpBO0FBS2IscUJBQWlCLFNBTEo7QUFNYixxQkFBaUIsU0FOSjtB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LENBSGdCO0FBSWhDQyxZQUFRLEtBSndCO0FBS2hDQyxVQUFNLElBTDBCO0FBTWhDQyxjQUFVO0FBTnNCLEdBQWxDOztBQVNBdmhDLElBQUUsMEJBQUYsRUFBOEJpaEMsS0FBOUIsQ0FBb0M7QUFDbENDLFdBQU8sSUFEMkI7QUFFbENDLGtCQUFjLENBRm9CO0FBR2xDQyxvQkFBZ0IsQ0FIa0I7QUFJbENHLGNBQVUsd0JBSndCO0FBS2xDRixZQUFRLEtBTDBCO0FBTWxDRyxVQUFNLEtBTjRCO0FBT2xDQyxnQkFBWSxLQVBzQjtBQVFsQ0MsbUJBQWU7QUFSbUIsR0FBcEM7QUFVRCIsImZpbGUiOiJmb3VuZGF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LndoYXRJbnB1dCA9IChmdW5jdGlvbigpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICB2YXJpYWJsZXNcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICAvLyBhcnJheSBvZiBhY3RpdmVseSBwcmVzc2VkIGtleXNcbiAgdmFyIGFjdGl2ZUtleXMgPSBbXTtcblxuICAvLyBjYWNoZSBkb2N1bWVudC5ib2R5XG4gIHZhciBib2R5O1xuXG4gIC8vIGJvb2xlYW46IHRydWUgaWYgdG91Y2ggYnVmZmVyIHRpbWVyIGlzIHJ1bm5pbmdcbiAgdmFyIGJ1ZmZlciA9IGZhbHNlO1xuXG4gIC8vIHRoZSBsYXN0IHVzZWQgaW5wdXQgdHlwZVxuICB2YXIgY3VycmVudElucHV0ID0gbnVsbDtcblxuICAvLyBgaW5wdXRgIHR5cGVzIHRoYXQgZG9uJ3QgYWNjZXB0IHRleHRcbiAgdmFyIG5vblR5cGluZ0lucHV0cyA9IFtcbiAgICAnYnV0dG9uJyxcbiAgICAnY2hlY2tib3gnLFxuICAgICdmaWxlJyxcbiAgICAnaW1hZ2UnLFxuICAgICdyYWRpbycsXG4gICAgJ3Jlc2V0JyxcbiAgICAnc3VibWl0J1xuICBdO1xuXG4gIC8vIGRldGVjdCB2ZXJzaW9uIG9mIG1vdXNlIHdoZWVsIGV2ZW50IHRvIHVzZVxuICAvLyB2aWEgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzL3doZWVsXG4gIHZhciBtb3VzZVdoZWVsID0gZGV0ZWN0V2hlZWwoKTtcblxuICAvLyBsaXN0IG9mIG1vZGlmaWVyIGtleXMgY29tbW9ubHkgdXNlZCB3aXRoIHRoZSBtb3VzZSBhbmRcbiAgLy8gY2FuIGJlIHNhZmVseSBpZ25vcmVkIHRvIHByZXZlbnQgZmFsc2Uga2V5Ym9hcmQgZGV0ZWN0aW9uXG4gIHZhciBpZ25vcmVNYXAgPSBbXG4gICAgMTYsIC8vIHNoaWZ0XG4gICAgMTcsIC8vIGNvbnRyb2xcbiAgICAxOCwgLy8gYWx0XG4gICAgOTEsIC8vIFdpbmRvd3Mga2V5IC8gbGVmdCBBcHBsZSBjbWRcbiAgICA5MyAgLy8gV2luZG93cyBtZW51IC8gcmlnaHQgQXBwbGUgY21kXG4gIF07XG5cbiAgLy8gbWFwcGluZyBvZiBldmVudHMgdG8gaW5wdXQgdHlwZXNcbiAgdmFyIGlucHV0TWFwID0ge1xuICAgICdrZXlkb3duJzogJ2tleWJvYXJkJyxcbiAgICAna2V5dXAnOiAna2V5Ym9hcmQnLFxuICAgICdtb3VzZWRvd24nOiAnbW91c2UnLFxuICAgICdtb3VzZW1vdmUnOiAnbW91c2UnLFxuICAgICdNU1BvaW50ZXJEb3duJzogJ3BvaW50ZXInLFxuICAgICdNU1BvaW50ZXJNb3ZlJzogJ3BvaW50ZXInLFxuICAgICdwb2ludGVyZG93bic6ICdwb2ludGVyJyxcbiAgICAncG9pbnRlcm1vdmUnOiAncG9pbnRlcicsXG4gICAgJ3RvdWNoc3RhcnQnOiAndG91Y2gnXG4gIH07XG5cbiAgLy8gYWRkIGNvcnJlY3QgbW91c2Ugd2hlZWwgZXZlbnQgbWFwcGluZyB0byBgaW5wdXRNYXBgXG4gIGlucHV0TWFwW2RldGVjdFdoZWVsKCldID0gJ21vdXNlJztcblxuICAvLyBhcnJheSBvZiBhbGwgdXNlZCBpbnB1dCB0eXBlc1xuICB2YXIgaW5wdXRUeXBlcyA9IFtdO1xuXG4gIC8vIG1hcHBpbmcgb2Yga2V5IGNvZGVzIHRvIGEgY29tbW9uIG5hbWVcbiAgdmFyIGtleU1hcCA9IHtcbiAgICA5OiAndGFiJyxcbiAgICAxMzogJ2VudGVyJyxcbiAgICAxNjogJ3NoaWZ0JyxcbiAgICAyNzogJ2VzYycsXG4gICAgMzI6ICdzcGFjZScsXG4gICAgMzc6ICdsZWZ0JyxcbiAgICAzODogJ3VwJyxcbiAgICAzOTogJ3JpZ2h0JyxcbiAgICA0MDogJ2Rvd24nXG4gIH07XG5cbiAgLy8gbWFwIG9mIElFIDEwIHBvaW50ZXIgZXZlbnRzXG4gIHZhciBwb2ludGVyTWFwID0ge1xuICAgIDI6ICd0b3VjaCcsXG4gICAgMzogJ3RvdWNoJywgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcbiAgICA0OiAnbW91c2UnXG4gIH07XG5cbiAgLy8gdG91Y2ggYnVmZmVyIHRpbWVyXG4gIHZhciB0aW1lcjtcblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgZnVuY3Rpb25zXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gYWxsb3dzIGV2ZW50cyB0aGF0IGFyZSBhbHNvIHRyaWdnZXJlZCB0byBiZSBmaWx0ZXJlZCBvdXQgZm9yIGB0b3VjaHN0YXJ0YFxuICBmdW5jdGlvbiBldmVudEJ1ZmZlcigpIHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgc2V0SW5wdXQoZXZlbnQpO1xuXG4gICAgYnVmZmVyID0gdHJ1ZTtcbiAgICB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgYnVmZmVyID0gZmFsc2U7XG4gICAgfSwgNjUwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlcmVkRXZlbnQoZXZlbnQpIHtcbiAgICBpZiAoIWJ1ZmZlcikgc2V0SW5wdXQoZXZlbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5CdWZmZXJlZEV2ZW50KGV2ZW50KSB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHNldElucHV0KGV2ZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyVGltZXIoKSB7XG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lcik7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRJbnB1dChldmVudCkge1xuICAgIHZhciBldmVudEtleSA9IGtleShldmVudCk7XG4gICAgdmFyIHZhbHVlID0gaW5wdXRNYXBbZXZlbnQudHlwZV07XG4gICAgaWYgKHZhbHVlID09PSAncG9pbnRlcicpIHZhbHVlID0gcG9pbnRlclR5cGUoZXZlbnQpO1xuXG4gICAgLy8gZG9uJ3QgZG8gYW55dGhpbmcgaWYgdGhlIHZhbHVlIG1hdGNoZXMgdGhlIGlucHV0IHR5cGUgYWxyZWFkeSBzZXRcbiAgICBpZiAoY3VycmVudElucHV0ICE9PSB2YWx1ZSkge1xuICAgICAgdmFyIGV2ZW50VGFyZ2V0ID0gdGFyZ2V0KGV2ZW50KTtcbiAgICAgIHZhciBldmVudFRhcmdldE5vZGUgPSBldmVudFRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIGV2ZW50VGFyZ2V0VHlwZSA9IChldmVudFRhcmdldE5vZGUgPT09ICdpbnB1dCcpID8gZXZlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKCd0eXBlJykgOiBudWxsO1xuXG4gICAgICBpZiAoXG4gICAgICAgICgvLyBvbmx5IGlmIHRoZSB1c2VyIGZsYWcgdG8gYWxsb3cgdHlwaW5nIGluIGZvcm0gZmllbGRzIGlzbid0IHNldFxuICAgICAgICAhYm9keS5oYXNBdHRyaWJ1dGUoJ2RhdGEtd2hhdGlucHV0LWZvcm10eXBpbmcnKSAmJlxuXG4gICAgICAgIC8vIG9ubHkgaWYgY3VycmVudElucHV0IGhhcyBhIHZhbHVlXG4gICAgICAgIGN1cnJlbnRJbnB1dCAmJlxuXG4gICAgICAgIC8vIG9ubHkgaWYgdGhlIGlucHV0IGlzIGBrZXlib2FyZGBcbiAgICAgICAgdmFsdWUgPT09ICdrZXlib2FyZCcgJiZcblxuICAgICAgICAvLyBub3QgaWYgdGhlIGtleSBpcyBgVEFCYFxuICAgICAgICBrZXlNYXBbZXZlbnRLZXldICE9PSAndGFiJyAmJlxuXG4gICAgICAgIC8vIG9ubHkgaWYgdGhlIHRhcmdldCBpcyBhIGZvcm0gaW5wdXQgdGhhdCBhY2NlcHRzIHRleHRcbiAgICAgICAgKFxuICAgICAgICAgICBldmVudFRhcmdldE5vZGUgPT09ICd0ZXh0YXJlYScgfHxcbiAgICAgICAgICAgZXZlbnRUYXJnZXROb2RlID09PSAnc2VsZWN0JyB8fFxuICAgICAgICAgICAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnICYmIG5vblR5cGluZ0lucHV0cy5pbmRleE9mKGV2ZW50VGFyZ2V0VHlwZSkgPCAwKVxuICAgICAgICApKSB8fCAoXG4gICAgICAgICAgLy8gaWdub3JlIG1vZGlmaWVyIGtleXNcbiAgICAgICAgICBpZ25vcmVNYXAuaW5kZXhPZihldmVudEtleSkgPiAtMVxuICAgICAgICApXG4gICAgICApIHtcbiAgICAgICAgLy8gaWdub3JlIGtleWJvYXJkIHR5cGluZ1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoSW5wdXQodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gJ2tleWJvYXJkJykgbG9nS2V5cyhldmVudEtleSk7XG4gIH1cblxuICBmdW5jdGlvbiBzd2l0Y2hJbnB1dChzdHJpbmcpIHtcbiAgICBjdXJyZW50SW5wdXQgPSBzdHJpbmc7XG4gICAgYm9keS5zZXRBdHRyaWJ1dGUoJ2RhdGEtd2hhdGlucHV0JywgY3VycmVudElucHV0KTtcblxuICAgIGlmIChpbnB1dFR5cGVzLmluZGV4T2YoY3VycmVudElucHV0KSA9PT0gLTEpIGlucHV0VHlwZXMucHVzaChjdXJyZW50SW5wdXQpO1xuICB9XG5cbiAgZnVuY3Rpb24ga2V5KGV2ZW50KSB7XG4gICAgcmV0dXJuIChldmVudC5rZXlDb2RlKSA/IGV2ZW50LmtleUNvZGUgOiBldmVudC53aGljaDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRhcmdldChldmVudCkge1xuICAgIHJldHVybiBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvaW50ZXJUeXBlKGV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiBldmVudC5wb2ludGVyVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBwb2ludGVyTWFwW2V2ZW50LnBvaW50ZXJUeXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIChldmVudC5wb2ludGVyVHlwZSA9PT0gJ3BlbicpID8gJ3RvdWNoJyA6IGV2ZW50LnBvaW50ZXJUeXBlOyAvLyB0cmVhdCBwZW4gbGlrZSB0b3VjaFxuICAgIH1cbiAgfVxuXG4gIC8vIGtleWJvYXJkIGxvZ2dpbmdcbiAgZnVuY3Rpb24gbG9nS2V5cyhldmVudEtleSkge1xuICAgIGlmIChhY3RpdmVLZXlzLmluZGV4T2Yoa2V5TWFwW2V2ZW50S2V5XSkgPT09IC0xICYmIGtleU1hcFtldmVudEtleV0pIGFjdGl2ZUtleXMucHVzaChrZXlNYXBbZXZlbnRLZXldKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuTG9nS2V5cyhldmVudCkge1xuICAgIHZhciBldmVudEtleSA9IGtleShldmVudCk7XG4gICAgdmFyIGFycmF5UG9zID0gYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pO1xuXG4gICAgaWYgKGFycmF5UG9zICE9PSAtMSkgYWN0aXZlS2V5cy5zcGxpY2UoYXJyYXlQb3MsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmluZEV2ZW50cygpIHtcbiAgICBib2R5ID0gZG9jdW1lbnQuYm9keTtcblxuICAgIC8vIHBvaW50ZXIgZXZlbnRzIChtb3VzZSwgcGVuLCB0b3VjaClcbiAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkge1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgIH0gZWxzZSBpZiAod2luZG93Lk1TUG9pbnRlckV2ZW50KSB7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlckRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignTVNQb2ludGVyTW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgIH0gZWxzZSB7XG5cbiAgICAgIC8vIG1vdXNlIGV2ZW50c1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgYnVmZmVyZWRFdmVudCk7XG5cbiAgICAgIC8vIHRvdWNoIGV2ZW50c1xuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykge1xuICAgICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBldmVudEJ1ZmZlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbW91c2Ugd2hlZWxcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIobW91c2VXaGVlbCwgYnVmZmVyZWRFdmVudCk7XG5cbiAgICAvLyBrZXlib2FyZCBldmVudHNcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB1bkJ1ZmZlcmVkRXZlbnQpO1xuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCB1bkJ1ZmZlcmVkRXZlbnQpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5Mb2dLZXlzKTtcbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICB1dGlsaXRpZXNcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcbiAgLy8gdmlhIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbFxuICBmdW5jdGlvbiBkZXRlY3RXaGVlbCgpIHtcbiAgICByZXR1cm4gbW91c2VXaGVlbCA9ICdvbndoZWVsJyBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSA/XG4gICAgICAnd2hlZWwnIDogLy8gTW9kZXJuIGJyb3dzZXJzIHN1cHBvcnQgXCJ3aGVlbFwiXG5cbiAgICAgIGRvY3VtZW50Lm9ubW91c2V3aGVlbCAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgJ21vdXNld2hlZWwnIDogLy8gV2Via2l0IGFuZCBJRSBzdXBwb3J0IGF0IGxlYXN0IFwibW91c2V3aGVlbFwiXG4gICAgICAgICdET01Nb3VzZVNjcm9sbCc7IC8vIGxldCdzIGFzc3VtZSB0aGF0IHJlbWFpbmluZyBicm93c2VycyBhcmUgb2xkZXIgRmlyZWZveFxuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGluaXRcblxuICAgIGRvbid0IHN0YXJ0IHNjcmlwdCB1bmxlc3MgYnJvd3NlciBjdXRzIHRoZSBtdXN0YXJkLFxuICAgIGFsc28gcGFzc2VzIGlmIHBvbHlmaWxscyBhcmUgdXNlZFxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIGlmIChcbiAgICAnYWRkRXZlbnRMaXN0ZW5lcicgaW4gd2luZG93ICYmXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2ZcbiAgKSB7XG5cbiAgICAvLyBpZiB0aGUgZG9tIGlzIGFscmVhZHkgcmVhZHkgYWxyZWFkeSAoc2NyaXB0IHdhcyBwbGFjZWQgYXQgYm90dG9tIG9mIDxib2R5PilcbiAgICBpZiAoZG9jdW1lbnQuYm9keSkge1xuICAgICAgYmluZEV2ZW50cygpO1xuXG4gICAgLy8gb3RoZXJ3aXNlIHdhaXQgZm9yIHRoZSBkb20gdG8gbG9hZCAoc2NyaXB0IHdhcyBwbGFjZWQgaW4gdGhlIDxoZWFkPilcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGJpbmRFdmVudHMpO1xuICAgIH1cbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBhcGlcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICByZXR1cm4ge1xuXG4gICAgLy8gcmV0dXJucyBzdHJpbmc6IHRoZSBjdXJyZW50IGlucHV0IHR5cGVcbiAgICBhc2s6IGZ1bmN0aW9uKCkgeyByZXR1cm4gY3VycmVudElucHV0OyB9LFxuXG4gICAgLy8gcmV0dXJucyBhcnJheTogY3VycmVudGx5IHByZXNzZWQga2V5c1xuICAgIGtleXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYWN0aXZlS2V5czsgfSxcblxuICAgIC8vIHJldHVybnMgYXJyYXk6IGFsbCB0aGUgZGV0ZWN0ZWQgaW5wdXQgdHlwZXNcbiAgICB0eXBlczogZnVuY3Rpb24oKSB7IHJldHVybiBpbnB1dFR5cGVzOyB9LFxuXG4gICAgLy8gYWNjZXB0cyBzdHJpbmc6IG1hbnVhbGx5IHNldCB0aGUgaW5wdXQgdHlwZVxuICAgIHNldDogc3dpdGNoSW5wdXRcbiAgfTtcblxufSgpKTtcbiIsIiFmdW5jdGlvbigkKSB7XG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgRk9VTkRBVElPTl9WRVJTSU9OID0gJzYuMi4yJztcblxuLy8gR2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4vLyBUaGlzIGlzIGF0dGFjaGVkIHRvIHRoZSB3aW5kb3csIG9yIHVzZWQgYXMgYSBtb2R1bGUgZm9yIEFNRC9Ccm93c2VyaWZ5XG52YXIgRm91bmRhdGlvbiA9IHtcbiAgdmVyc2lvbjogRk9VTkRBVElPTl9WRVJTSU9OLFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgaW5pdGlhbGl6ZWQgcGx1Z2lucy5cbiAgICovXG4gIF9wbHVnaW5zOiB7fSxcblxuICAvKipcbiAgICogU3RvcmVzIGdlbmVyYXRlZCB1bmlxdWUgaWRzIGZvciBwbHVnaW4gaW5zdGFuY2VzXG4gICAqL1xuICBfdXVpZHM6IFtdLFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYm9vbGVhbiBmb3IgUlRMIHN1cHBvcnRcbiAgICovXG4gIHJ0bDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gJCgnaHRtbCcpLmF0dHIoJ2RpcicpID09PSAncnRsJztcbiAgfSxcbiAgLyoqXG4gICAqIERlZmluZXMgYSBGb3VuZGF0aW9uIHBsdWdpbiwgYWRkaW5nIGl0IHRvIHRoZSBgRm91bmRhdGlvbmAgbmFtZXNwYWNlIGFuZCB0aGUgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUgd2hlbiByZWZsb3dpbmcuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIHBsdWdpbi5cbiAgICovXG4gIHBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBhZGRpbmcgdG8gZ2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4gICAgLy8gRXhhbXBsZXM6IEZvdW5kYXRpb24uUmV2ZWFsLCBGb3VuZGF0aW9uLk9mZkNhbnZhc1xuICAgIHZhciBjbGFzc05hbWUgPSAobmFtZSB8fCBmdW5jdGlvbk5hbWUocGx1Z2luKSk7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBzdG9yaW5nIHRoZSBwbHVnaW4sIGFsc28gdXNlZCB0byBjcmVhdGUgdGhlIGlkZW50aWZ5aW5nIGRhdGEgYXR0cmlidXRlIGZvciB0aGUgcGx1Z2luXG4gICAgLy8gRXhhbXBsZXM6IGRhdGEtcmV2ZWFsLCBkYXRhLW9mZi1jYW52YXNcbiAgICB2YXIgYXR0ck5hbWUgID0gaHlwaGVuYXRlKGNsYXNzTmFtZSk7XG5cbiAgICAvLyBBZGQgdG8gdGhlIEZvdW5kYXRpb24gb2JqZWN0IGFuZCB0aGUgcGx1Z2lucyBsaXN0IChmb3IgcmVmbG93aW5nKVxuICAgIHRoaXMuX3BsdWdpbnNbYXR0ck5hbWVdID0gdGhpc1tjbGFzc05hbWVdID0gcGx1Z2luO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFBvcHVsYXRlcyB0aGUgX3V1aWRzIGFycmF5IHdpdGggcG9pbnRlcnMgdG8gZWFjaCBpbmRpdmlkdWFsIHBsdWdpbiBpbnN0YW5jZS5cbiAgICogQWRkcyB0aGUgYHpmUGx1Z2luYCBkYXRhLWF0dHJpYnV0ZSB0byBwcm9ncmFtbWF0aWNhbGx5IGNyZWF0ZWQgcGx1Z2lucyB0byBhbGxvdyB1c2Ugb2YgJChzZWxlY3RvcikuZm91bmRhdGlvbihtZXRob2QpIGNhbGxzLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBpbml0aWFsaXphdGlvbiBldmVudCBmb3IgZWFjaCBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHBsdWdpbiwgcGFzc2VkIGFzIGEgY2FtZWxDYXNlZCBzdHJpbmcuXG4gICAqIEBmaXJlcyBQbHVnaW4jaW5pdFxuICAgKi9cbiAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSl7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBuYW1lID8gaHlwaGVuYXRlKG5hbWUpIDogZnVuY3Rpb25OYW1lKHBsdWdpbi5jb25zdHJ1Y3RvcikudG9Mb3dlckNhc2UoKTtcbiAgICBwbHVnaW4udXVpZCA9IHRoaXMuR2V0WW9EaWdpdHMoNiwgcGx1Z2luTmFtZSk7XG5cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApKXsgcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWAsIHBsdWdpbi51dWlkKTsgfVxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKSl7IHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsIHBsdWdpbik7IH1cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGluaXRpYWxpemVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jaW5pdFxuICAgICAgICAgICAqL1xuICAgIHBsdWdpbi4kZWxlbWVudC50cmlnZ2VyKGBpbml0LnpmLiR7cGx1Z2luTmFtZX1gKTtcblxuICAgIHRoaXMuX3V1aWRzLnB1c2gocGx1Z2luLnV1aWQpO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFJlbW92ZXMgdGhlIHBsdWdpbnMgdXVpZCBmcm9tIHRoZSBfdXVpZHMgYXJyYXkuXG4gICAqIFJlbW92ZXMgdGhlIHpmUGx1Z2luIGRhdGEgYXR0cmlidXRlLCBhcyB3ZWxsIGFzIHRoZSBkYXRhLXBsdWdpbi1uYW1lIGF0dHJpYnV0ZS5cbiAgICogQWxzbyBmaXJlcyB0aGUgZGVzdHJveWVkIGV2ZW50IGZvciB0aGUgcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAZmlyZXMgUGx1Z2luI2Rlc3Ryb3llZFxuICAgKi9cbiAgdW5yZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IGh5cGhlbmF0ZShmdW5jdGlvbk5hbWUocGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykuY29uc3RydWN0b3IpKTtcblxuICAgIHRoaXMuX3V1aWRzLnNwbGljZSh0aGlzLl91dWlkcy5pbmRleE9mKHBsdWdpbi51dWlkKSwgMSk7XG4gICAgcGx1Z2luLiRlbGVtZW50LnJlbW92ZUF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApLnJlbW92ZURhdGEoJ3pmUGx1Z2luJylcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGJlZW4gZGVzdHJveWVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jZGVzdHJveWVkXG4gICAgICAgICAgICovXG4gICAgICAgICAgLnRyaWdnZXIoYGRlc3Ryb3llZC56Zi4ke3BsdWdpbk5hbWV9YCk7XG4gICAgZm9yKHZhciBwcm9wIGluIHBsdWdpbil7XG4gICAgICBwbHVnaW5bcHJvcF0gPSBudWxsOy8vY2xlYW4gdXAgc2NyaXB0IHRvIHByZXAgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogQ2F1c2VzIG9uZSBvciBtb3JlIGFjdGl2ZSBwbHVnaW5zIHRvIHJlLWluaXRpYWxpemUsIHJlc2V0dGluZyBldmVudCBsaXN0ZW5lcnMsIHJlY2FsY3VsYXRpbmcgcG9zaXRpb25zLCBldGMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwbHVnaW5zIC0gb3B0aW9uYWwgc3RyaW5nIG9mIGFuIGluZGl2aWR1YWwgcGx1Z2luIGtleSwgYXR0YWluZWQgYnkgY2FsbGluZyBgJChlbGVtZW50KS5kYXRhKCdwbHVnaW5OYW1lJylgLCBvciBzdHJpbmcgb2YgYSBwbHVnaW4gY2xhc3MgaS5lLiBgJ2Ryb3Bkb3duJ2BcbiAgICogQGRlZmF1bHQgSWYgbm8gYXJndW1lbnQgaXMgcGFzc2VkLCByZWZsb3cgYWxsIGN1cnJlbnRseSBhY3RpdmUgcGx1Z2lucy5cbiAgICovXG4gICByZUluaXQ6IGZ1bmN0aW9uKHBsdWdpbnMpe1xuICAgICB2YXIgaXNKUSA9IHBsdWdpbnMgaW5zdGFuY2VvZiAkO1xuICAgICB0cnl7XG4gICAgICAgaWYoaXNKUSl7XG4gICAgICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgJCh0aGlzKS5kYXRhKCd6ZlBsdWdpbicpLl9pbml0KCk7XG4gICAgICAgICB9KTtcbiAgICAgICB9ZWxzZXtcbiAgICAgICAgIHZhciB0eXBlID0gdHlwZW9mIHBsdWdpbnMsXG4gICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICBmbnMgPSB7XG4gICAgICAgICAgICdvYmplY3QnOiBmdW5jdGlvbihwbGdzKXtcbiAgICAgICAgICAgICBwbGdzLmZvckVhY2goZnVuY3Rpb24ocCl7XG4gICAgICAgICAgICAgICBwID0gaHlwaGVuYXRlKHApO1xuICAgICAgICAgICAgICAgJCgnW2RhdGEtJysgcCArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAnc3RyaW5nJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICBwbHVnaW5zID0gaHlwaGVuYXRlKHBsdWdpbnMpO1xuICAgICAgICAgICAgICQoJ1tkYXRhLScrIHBsdWdpbnMgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3VuZGVmaW5lZCc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgdGhpc1snb2JqZWN0J10oT2JqZWN0LmtleXMoX3RoaXMuX3BsdWdpbnMpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfTtcbiAgICAgICAgIGZuc1t0eXBlXShwbHVnaW5zKTtcbiAgICAgICB9XG4gICAgIH1jYXRjaChlcnIpe1xuICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgfWZpbmFsbHl7XG4gICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgIH1cbiAgIH0sXG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSByYW5kb20gYmFzZS0zNiB1aWQgd2l0aCBuYW1lc3BhY2luZ1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAtIG51bWJlciBvZiByYW5kb20gYmFzZS0zNiBkaWdpdHMgZGVzaXJlZC4gSW5jcmVhc2UgZm9yIG1vcmUgcmFuZG9tIHN0cmluZ3MuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2UgLSBuYW1lIG9mIHBsdWdpbiB0byBiZSBpbmNvcnBvcmF0ZWQgaW4gdWlkLCBvcHRpb25hbC5cbiAgICogQGRlZmF1bHQge1N0cmluZ30gJycgLSBpZiBubyBwbHVnaW4gbmFtZSBpcyBwcm92aWRlZCwgbm90aGluZyBpcyBhcHBlbmRlZCB0byB0aGUgdWlkLlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAtIHVuaXF1ZSBpZFxuICAgKi9cbiAgR2V0WW9EaWdpdHM6IGZ1bmN0aW9uKGxlbmd0aCwgbmFtZXNwYWNlKXtcbiAgICBsZW5ndGggPSBsZW5ndGggfHwgNjtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5wb3coMzYsIGxlbmd0aCArIDEpIC0gTWF0aC5yYW5kb20oKSAqIE1hdGgucG93KDM2LCBsZW5ndGgpKSkudG9TdHJpbmcoMzYpLnNsaWNlKDEpICsgKG5hbWVzcGFjZSA/IGAtJHtuYW1lc3BhY2V9YCA6ICcnKTtcbiAgfSxcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgcGx1Z2lucyBvbiBhbnkgZWxlbWVudHMgd2l0aGluIGBlbGVtYCAoYW5kIGBlbGVtYCBpdHNlbGYpIHRoYXQgYXJlbid0IGFscmVhZHkgaW5pdGlhbGl6ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0galF1ZXJ5IG9iamVjdCBjb250YWluaW5nIHRoZSBlbGVtZW50IHRvIGNoZWNrIGluc2lkZS4gQWxzbyBjaGVja3MgdGhlIGVsZW1lbnQgaXRzZWxmLCB1bmxlc3MgaXQncyB0aGUgYGRvY3VtZW50YCBvYmplY3QuXG4gICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBwbHVnaW5zIC0gQSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZS4gTGVhdmUgdGhpcyBvdXQgdG8gaW5pdGlhbGl6ZSBldmVyeXRoaW5nLlxuICAgKi9cbiAgcmVmbG93OiBmdW5jdGlvbihlbGVtLCBwbHVnaW5zKSB7XG5cbiAgICAvLyBJZiBwbHVnaW5zIGlzIHVuZGVmaW5lZCwganVzdCBncmFiIGV2ZXJ5dGhpbmdcbiAgICBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwbHVnaW5zID0gT2JqZWN0LmtleXModGhpcy5fcGx1Z2lucyk7XG4gICAgfVxuICAgIC8vIElmIHBsdWdpbnMgaXMgYSBzdHJpbmcsIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgd2l0aCBvbmUgaXRlbVxuICAgIGVsc2UgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAnc3RyaW5nJykge1xuICAgICAgcGx1Z2lucyA9IFtwbHVnaW5zXTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcGx1Z2luXG4gICAgJC5lYWNoKHBsdWdpbnMsIGZ1bmN0aW9uKGksIG5hbWUpIHtcbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBwbHVnaW5cbiAgICAgIHZhciBwbHVnaW4gPSBfdGhpcy5fcGx1Z2luc1tuYW1lXTtcblxuICAgICAgLy8gTG9jYWxpemUgdGhlIHNlYXJjaCB0byBhbGwgZWxlbWVudHMgaW5zaWRlIGVsZW0sIGFzIHdlbGwgYXMgZWxlbSBpdHNlbGYsIHVubGVzcyBlbGVtID09PSBkb2N1bWVudFxuICAgICAgdmFyICRlbGVtID0gJChlbGVtKS5maW5kKCdbZGF0YS0nK25hbWUrJ10nKS5hZGRCYWNrKCdbZGF0YS0nK25hbWUrJ10nKTtcblxuICAgICAgLy8gRm9yIGVhY2ggcGx1Z2luIGZvdW5kLCBpbml0aWFsaXplIGl0XG4gICAgICAkZWxlbS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJGVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIG9wdHMgPSB7fTtcbiAgICAgICAgLy8gRG9uJ3QgZG91YmxlLWRpcCBvbiBwbHVnaW5zXG4gICAgICAgIGlmICgkZWwuZGF0YSgnemZQbHVnaW4nKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIlRyaWVkIHRvIGluaXRpYWxpemUgXCIrbmFtZStcIiBvbiBhbiBlbGVtZW50IHRoYXQgYWxyZWFkeSBoYXMgYSBGb3VuZGF0aW9uIHBsdWdpbi5cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpKXtcbiAgICAgICAgICB2YXIgdGhpbmcgPSAkZWwuYXR0cignZGF0YS1vcHRpb25zJykuc3BsaXQoJzsnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpe1xuICAgICAgICAgICAgdmFyIG9wdCA9IGUuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24oZWwpeyByZXR1cm4gZWwudHJpbSgpOyB9KTtcbiAgICAgICAgICAgIGlmKG9wdFswXSkgb3B0c1tvcHRbMF1dID0gcGFyc2VWYWx1ZShvcHRbMV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAkZWwuZGF0YSgnemZQbHVnaW4nLCBuZXcgcGx1Z2luKCQodGhpcyksIG9wdHMpKTtcbiAgICAgICAgfWNhdGNoKGVyKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVyKTtcbiAgICAgICAgfWZpbmFsbHl7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0Rm5OYW1lOiBmdW5jdGlvbk5hbWUsXG4gIHRyYW5zaXRpb25lbmQ6IGZ1bmN0aW9uKCRlbGVtKXtcbiAgICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdXZWJraXRUcmFuc2l0aW9uJzogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gICAgfTtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBlbmQ7XG5cbiAgICBmb3IgKHZhciB0IGluIHRyYW5zaXRpb25zKXtcbiAgICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBlbmQgPSB0cmFuc2l0aW9uc1t0XTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoZW5kKXtcbiAgICAgIHJldHVybiBlbmQ7XG4gICAgfWVsc2V7XG4gICAgICBlbmQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICRlbGVtLnRyaWdnZXJIYW5kbGVyKCd0cmFuc2l0aW9uZW5kJywgWyRlbGVtXSk7XG4gICAgICB9LCAxKTtcbiAgICAgIHJldHVybiAndHJhbnNpdGlvbmVuZCc7XG4gICAgfVxuICB9XG59O1xuXG5Gb3VuZGF0aW9uLnV0aWwgPSB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgYXBwbHlpbmcgYSBkZWJvdW5jZSBlZmZlY3QgdG8gYSBmdW5jdGlvbiBjYWxsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyAtIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBlbmQgb2YgdGltZW91dC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IC0gVGltZSBpbiBtcyB0byBkZWxheSB0aGUgY2FsbCBvZiBgZnVuY2AuXG4gICAqIEByZXR1cm5zIGZ1bmN0aW9uXG4gICAqL1xuICB0aHJvdHRsZTogZnVuY3Rpb24gKGZ1bmMsIGRlbGF5KSB7XG4gICAgdmFyIHRpbWVyID0gbnVsbDtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIGlmICh0aW1lciA9PT0gbnVsbCkge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufTtcblxuLy8gVE9ETzogY29uc2lkZXIgbm90IG1ha2luZyB0aGlzIGEgalF1ZXJ5IGZ1bmN0aW9uXG4vLyBUT0RPOiBuZWVkIHdheSB0byByZWZsb3cgdnMuIHJlLWluaXRpYWxpemVcbi8qKlxuICogVGhlIEZvdW5kYXRpb24galF1ZXJ5IG1ldGhvZC5cbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBtZXRob2QgLSBBbiBhY3Rpb24gdG8gcGVyZm9ybSBvbiB0aGUgY3VycmVudCBqUXVlcnkgb2JqZWN0LlxuICovXG52YXIgZm91bmRhdGlvbiA9IGZ1bmN0aW9uKG1ldGhvZCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBtZXRob2QsXG4gICAgICAkbWV0YSA9ICQoJ21ldGEuZm91bmRhdGlvbi1tcScpLFxuICAgICAgJG5vSlMgPSAkKCcubm8tanMnKTtcblxuICBpZighJG1ldGEubGVuZ3RoKXtcbiAgICAkKCc8bWV0YSBjbGFzcz1cImZvdW5kYXRpb24tbXFcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKTtcbiAgfVxuICBpZigkbm9KUy5sZW5ndGgpe1xuICAgICRub0pTLnJlbW92ZUNsYXNzKCduby1qcycpO1xuICB9XG5cbiAgaWYodHlwZSA9PT0gJ3VuZGVmaW5lZCcpey8vbmVlZHMgdG8gaW5pdGlhbGl6ZSB0aGUgRm91bmRhdGlvbiBvYmplY3QsIG9yIGFuIGluZGl2aWR1YWwgcGx1Z2luLlxuICAgIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVmbG93KHRoaXMpO1xuICB9ZWxzZSBpZih0eXBlID09PSAnc3RyaW5nJyl7Ly9hbiBpbmRpdmlkdWFsIG1ldGhvZCB0byBpbnZva2Ugb24gYSBwbHVnaW4gb3IgZ3JvdXAgb2YgcGx1Z2luc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTsvL2NvbGxlY3QgYWxsIHRoZSBhcmd1bWVudHMsIGlmIG5lY2Vzc2FyeVxuICAgIHZhciBwbHVnQ2xhc3MgPSB0aGlzLmRhdGEoJ3pmUGx1Z2luJyk7Ly9kZXRlcm1pbmUgdGhlIGNsYXNzIG9mIHBsdWdpblxuXG4gICAgaWYocGx1Z0NsYXNzICE9PSB1bmRlZmluZWQgJiYgcGx1Z0NsYXNzW21ldGhvZF0gIT09IHVuZGVmaW5lZCl7Ly9tYWtlIHN1cmUgYm90aCB0aGUgY2xhc3MgYW5kIG1ldGhvZCBleGlzdFxuICAgICAgaWYodGhpcy5sZW5ndGggPT09IDEpey8vaWYgdGhlcmUncyBvbmx5IG9uZSwgY2FsbCBpdCBkaXJlY3RseS5cbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseShwbHVnQ2xhc3MsIGFyZ3MpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLCBlbCl7Ly9vdGhlcndpc2UgbG9vcCB0aHJvdWdoIHRoZSBqUXVlcnkgY29sbGVjdGlvbiBhbmQgaW52b2tlIHRoZSBtZXRob2Qgb24gZWFjaFxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KCQoZWwpLmRhdGEoJ3pmUGx1Z2luJyksIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9ZWxzZXsvL2Vycm9yIGZvciBubyBjbGFzcyBvciBubyBtZXRob2RcbiAgICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIldlJ3JlIHNvcnJ5LCAnXCIgKyBtZXRob2QgKyBcIicgaXMgbm90IGFuIGF2YWlsYWJsZSBtZXRob2QgZm9yIFwiICsgKHBsdWdDbGFzcyA/IGZ1bmN0aW9uTmFtZShwbHVnQ2xhc3MpIDogJ3RoaXMgZWxlbWVudCcpICsgJy4nKTtcbiAgICB9XG4gIH1lbHNley8vZXJyb3IgZm9yIGludmFsaWQgYXJndW1lbnQgdHlwZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFdlJ3JlIHNvcnJ5LCAke3R5cGV9IGlzIG5vdCBhIHZhbGlkIHBhcmFtZXRlci4gWW91IG11c3QgdXNlIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWV0aG9kIHlvdSB3aXNoIHRvIGludm9rZS5gKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbndpbmRvdy5Gb3VuZGF0aW9uID0gRm91bmRhdGlvbjtcbiQuZm4uZm91bmRhdGlvbiA9IGZvdW5kYXRpb247XG5cbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbihmdW5jdGlvbigpIHtcbiAgaWYgKCFEYXRlLm5vdyB8fCAhd2luZG93LkRhdGUubm93KVxuICAgIHdpbmRvdy5EYXRlLm5vdyA9IERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxuICAvKipcbiAgICogUG9seWZpbGwgZm9yIHBlcmZvcm1hbmNlLm5vdywgcmVxdWlyZWQgYnkgckFGXG4gICAqL1xuICBpZighd2luZG93LnBlcmZvcm1hbmNlIHx8ICF3aW5kb3cucGVyZm9ybWFuY2Uubm93KXtcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgICBzdGFydDogRGF0ZS5ub3coKSxcbiAgICAgIG5vdzogZnVuY3Rpb24oKXsgcmV0dXJuIERhdGUubm93KCkgLSB0aGlzLnN0YXJ0OyB9XG4gICAgfTtcbiAgfVxufSkoKTtcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gY2xvc2VzdCB0aGluZyBwb3NzaWJsZSB0byB0aGUgRUNNQVNjcmlwdCA1XG4gICAgICAvLyBpbnRlcm5hbCBJc0NhbGxhYmxlIGZ1bmN0aW9uXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCAtIHdoYXQgaXMgdHJ5aW5nIHRvIGJlIGJvdW5kIGlzIG5vdCBjYWxsYWJsZScpO1xuICAgIH1cblxuICAgIHZhciBhQXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgZlRvQmluZCA9IHRoaXMsXG4gICAgICAgIGZOT1AgICAgPSBmdW5jdGlvbigpIHt9LFxuICAgICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1BcbiAgICAgICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICAgIH07XG5cbiAgICBpZiAodGhpcy5wcm90b3R5cGUpIHtcbiAgICAgIC8vIG5hdGl2ZSBmdW5jdGlvbnMgZG9uJ3QgaGF2ZSBhIHByb3RvdHlwZVxuICAgICAgZk5PUC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICB9XG4gICAgZkJvdW5kLnByb3RvdHlwZSA9IG5ldyBmTk9QKCk7XG5cbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufVxuLy8gUG9seWZpbGwgdG8gZ2V0IHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gaW4gSUU5XG5mdW5jdGlvbiBmdW5jdGlvbk5hbWUoZm4pIHtcbiAgaWYgKEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZnVuY05hbWVSZWdleCA9IC9mdW5jdGlvblxccyhbXihdezEsfSlcXCgvO1xuICAgIHZhciByZXN1bHRzID0gKGZ1bmNOYW1lUmVnZXgpLmV4ZWMoKGZuKS50b1N0cmluZygpKTtcbiAgICByZXR1cm4gKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGggPiAxKSA/IHJlc3VsdHNbMV0udHJpbSgpIDogXCJcIjtcbiAgfVxuICBlbHNlIGlmIChmbi5wcm90b3R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmbi5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmbi5wcm90b3R5cGUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2VWYWx1ZShzdHIpe1xuICBpZigvdHJ1ZS8udGVzdChzdHIpKSByZXR1cm4gdHJ1ZTtcbiAgZWxzZSBpZigvZmFsc2UvLnRlc3Qoc3RyKSkgcmV0dXJuIGZhbHNlO1xuICBlbHNlIGlmKCFpc05hTihzdHIgKiAxKSkgcmV0dXJuIHBhcnNlRmxvYXQoc3RyKTtcbiAgcmV0dXJuIHN0cjtcbn1cbi8vIENvbnZlcnQgUGFzY2FsQ2FzZSB0byBrZWJhYi1jYXNlXG4vLyBUaGFuayB5b3U6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzg5NTU1ODBcbmZ1bmN0aW9uIGh5cGhlbmF0ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCAnJDEtJDInKS50b0xvd2VyQ2FzZSgpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbkZvdW5kYXRpb24uQm94ID0ge1xuICBJbU5vdFRvdWNoaW5nWW91OiBJbU5vdFRvdWNoaW5nWW91LFxuICBHZXREaW1lbnNpb25zOiBHZXREaW1lbnNpb25zLFxuICBHZXRPZmZzZXRzOiBHZXRPZmZzZXRzXG59XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIGRpbWVuc2lvbnMgb2YgYW4gZWxlbWVudCB0byBhIGNvbnRhaW5lciBhbmQgZGV0ZXJtaW5lcyBjb2xsaXNpb24gZXZlbnRzIHdpdGggY29udGFpbmVyLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdGVzdCBmb3IgY29sbGlzaW9ucy5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBwYXJlbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyBib3VuZGluZyBjb250YWluZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGxyT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIGxlZnQgYW5kIHJpZ2h0IHZhbHVlcyBvbmx5LlxuICogQHBhcmFtIHtCb29sZWFufSB0Yk9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayB0b3AgYW5kIGJvdHRvbSB2YWx1ZXMgb25seS5cbiAqIEBkZWZhdWx0IGlmIG5vIHBhcmVudCBvYmplY3QgcGFzc2VkLCBkZXRlY3RzIGNvbGxpc2lvbnMgd2l0aCBgd2luZG93YC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgY29sbGlzaW9uIGZyZWUsIGZhbHNlIGlmIGEgY29sbGlzaW9uIGluIGFueSBkaXJlY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIEltTm90VG91Y2hpbmdZb3UoZWxlbWVudCwgcGFyZW50LCBsck9ubHksIHRiT25seSkge1xuICB2YXIgZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICB0b3AsIGJvdHRvbSwgbGVmdCwgcmlnaHQ7XG5cbiAgaWYgKHBhcmVudCkge1xuICAgIHZhciBwYXJEaW1zID0gR2V0RGltZW5zaW9ucyhwYXJlbnQpO1xuXG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IHBhckRpbXMuaGVpZ2h0ICsgcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IHBhckRpbXMud2lkdGggKyBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgfVxuICBlbHNlIHtcbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCArIGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpO1xuICB9XG5cbiAgdmFyIGFsbERpcnMgPSBbYm90dG9tLCB0b3AsIGxlZnQsIHJpZ2h0XTtcblxuICBpZiAobHJPbmx5KSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0ID09PSB0cnVlO1xuICB9XG5cbiAgaWYgKHRiT25seSkge1xuICAgIHJldHVybiB0b3AgPT09IGJvdHRvbSA9PT0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBhbGxEaXJzLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbn07XG5cbi8qKlxuICogVXNlcyBuYXRpdmUgbWV0aG9kcyB0byByZXR1cm4gYW4gb2JqZWN0IG9mIGRpbWVuc2lvbiB2YWx1ZXMuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5IHx8IEhUTUx9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IG9yIERPTSBlbGVtZW50IGZvciB3aGljaCB0byBnZXQgdGhlIGRpbWVuc2lvbnMuIENhbiBiZSBhbnkgZWxlbWVudCBvdGhlciB0aGF0IGRvY3VtZW50IG9yIHdpbmRvdy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IC0gbmVzdGVkIG9iamVjdCBvZiBpbnRlZ2VyIHBpeGVsIHZhbHVlc1xuICogVE9ETyAtIGlmIGVsZW1lbnQgaXMgd2luZG93LCByZXR1cm4gb25seSB0aG9zZSB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIEdldERpbWVuc2lvbnMoZWxlbSwgdGVzdCl7XG4gIGVsZW0gPSBlbGVtLmxlbmd0aCA/IGVsZW1bMF0gOiBlbGVtO1xuXG4gIGlmIChlbGVtID09PSB3aW5kb3cgfHwgZWxlbSA9PT0gZG9jdW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gc29ycnksIERhdmUuIEknbSBhZnJhaWQgSSBjYW4ndCBkbyB0aGF0LlwiKTtcbiAgfVxuXG4gIHZhciByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHBhclJlY3QgPSBlbGVtLnBhcmVudE5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5SZWN0ID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG4gICAgICB3aW5YID0gd2luZG93LnBhZ2VYT2Zmc2V0O1xuXG4gIHJldHVybiB7XG4gICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICBvZmZzZXQ6IHtcbiAgICAgIHRvcDogcmVjdC50b3AgKyB3aW5ZLFxuICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgd2luWFxuICAgIH0sXG4gICAgcGFyZW50RGltczoge1xuICAgICAgd2lkdGg6IHBhclJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHBhclJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogcGFyUmVjdC50b3AgKyB3aW5ZLFxuICAgICAgICBsZWZ0OiBwYXJSZWN0LmxlZnQgKyB3aW5YXG4gICAgICB9XG4gICAgfSxcbiAgICB3aW5kb3dEaW1zOiB7XG4gICAgICB3aWR0aDogd2luUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogd2luUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiB3aW5ZLFxuICAgICAgICBsZWZ0OiB3aW5YXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgb2YgdG9wIGFuZCBsZWZ0IGludGVnZXIgcGl4ZWwgdmFsdWVzIGZvciBkeW5hbWljYWxseSByZW5kZXJlZCBlbGVtZW50cyxcbiAqIHN1Y2ggYXM6IFRvb2x0aXAsIFJldmVhbCwgYW5kIERyb3Bkb3duXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgYmVpbmcgcG9zaXRpb25lZC5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBhbmNob3IgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCdzIGFuY2hvciBwb2ludC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIGEgc3RyaW5nIHJlbGF0aW5nIHRvIHRoZSBkZXNpcmVkIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50LCByZWxhdGl2ZSB0byBpdCdzIGFuY2hvclxuICogQHBhcmFtIHtOdW1iZXJ9IHZPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgdmVydGljYWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBoT2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIGhvcml6b250YWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNPdmVyZmxvdyAtIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLCBzZXRzIHRvIHRydWUgdG8gZGVmYXVsdCB0aGUgZWxlbWVudCB0byBmdWxsIHdpZHRoIC0gYW55IGRlc2lyZWQgb2Zmc2V0LlxuICogVE9ETyBhbHRlci9yZXdyaXRlIHRvIHdvcmsgd2l0aCBgZW1gIHZhbHVlcyBhcyB3ZWxsL2luc3RlYWQgb2YgcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIEdldE9mZnNldHMoZWxlbWVudCwgYW5jaG9yLCBwb3NpdGlvbiwgdk9mZnNldCwgaE9mZnNldCwgaXNPdmVyZmxvdykge1xuICB2YXIgJGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgJGFuY2hvckRpbXMgPSBhbmNob3IgPyBHZXREaW1lbnNpb25zKGFuY2hvcikgOiBudWxsO1xuXG4gIHN3aXRjaCAocG9zaXRpb24pIHtcbiAgICBjYXNlICd0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0LFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciB0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiBpc092ZXJmbG93ID8gaE9mZnNldCA6ICgoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgcmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgKyAxLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0ICsgKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgKCRlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZXZlYWwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLSAkZWxlRGltcy53aWR0aCkgLyAyLFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICBjYXNlICdyZXZlYWwgZnVsbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0LFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0IC0gJGVsZURpbXMud2lkdGgsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICB9XG59XG5cbn0oalF1ZXJ5KTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogVGhpcyB1dGlsIHdhcyBjcmVhdGVkIGJ5IE1hcml1cyBPbGJlcnR6ICpcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXG4gKiBvciB0aGUgd2ViIGh0dHA6Ly93d3cubWFyaXVzb2xiZXJ0ei5kZS8gKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3Qga2V5Q29kZXMgPSB7XG4gIDk6ICdUQUInLFxuICAxMzogJ0VOVEVSJyxcbiAgMjc6ICdFU0NBUEUnLFxuICAzMjogJ1NQQUNFJyxcbiAgMzc6ICdBUlJPV19MRUZUJyxcbiAgMzg6ICdBUlJPV19VUCcsXG4gIDM5OiAnQVJST1dfUklHSFQnLFxuICA0MDogJ0FSUk9XX0RPV04nXG59XG5cbnZhciBjb21tYW5kcyA9IHt9XG5cbnZhciBLZXlib2FyZCA9IHtcbiAga2V5czogZ2V0S2V5Q29kZXMoa2V5Q29kZXMpLFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIChrZXlib2FyZCkgZXZlbnQgYW5kIHJldHVybnMgYSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIGl0cyBrZXlcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcmV0dXJuIFN0cmluZyBrZXkgLSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIHRoZSBrZXkgcHJlc3NlZFxuICAgKi9cbiAgcGFyc2VLZXkoZXZlbnQpIHtcbiAgICB2YXIga2V5ID0ga2V5Q29kZXNbZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZV0gfHwgU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCkudG9VcHBlckNhc2UoKTtcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIGtleSA9IGBTSElGVF8ke2tleX1gO1xuICAgIGlmIChldmVudC5jdHJsS2V5KSBrZXkgPSBgQ1RSTF8ke2tleX1gO1xuICAgIGlmIChldmVudC5hbHRLZXkpIGtleSA9IGBBTFRfJHtrZXl9YDtcbiAgICByZXR1cm4ga2V5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBnaXZlbiAoa2V5Ym9hcmQpIGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHBhcmFtIHtPYmplY3RzfSBmdW5jdGlvbnMgLSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSB0byBiZSBleGVjdXRlZFxuICAgKi9cbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xuICAgIHZhciBjb21tYW5kTGlzdCA9IGNvbW1hbmRzW2NvbXBvbmVudF0sXG4gICAgICBrZXlDb2RlID0gdGhpcy5wYXJzZUtleShldmVudCksXG4gICAgICBjbWRzLFxuICAgICAgY29tbWFuZCxcbiAgICAgIGZuO1xuXG4gICAgaWYgKCFjb21tYW5kTGlzdCkgcmV0dXJuIGNvbnNvbGUud2FybignQ29tcG9uZW50IG5vdCBkZWZpbmVkIScpO1xuXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxuICAgICAgICBjbWRzID0gY29tbWFuZExpc3Q7IC8vIHVzZSBwbGFpbiBsaXN0XG4gICAgfSBlbHNlIHsgLy8gbWVyZ2UgbHRyIGFuZCBydGw6IGlmIGRvY3VtZW50IGlzIHJ0bCwgcnRsIG92ZXJ3cml0ZXMgbHRyIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcblxuICAgICAgICBlbHNlIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QucnRsLCBjb21tYW5kTGlzdC5sdHIpO1xuICAgIH1cbiAgICBjb21tYW5kID0gY21kc1trZXlDb2RlXTtcblxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiAgaWYgZXhpc3RzXG4gICAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSgpO1xuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMuaGFuZGxlZChyZXR1cm5WYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdW5jdGlvbnMudW5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMudW5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgbm90IGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMudW5oYW5kbGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gYCRlbGVtZW50YFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cbiAgICogQHJldHVybiB7alF1ZXJ5fSAkZm9jdXNhYmxlIC0gYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gYCRlbGVtZW50YFxuICAgKi9cbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xuICAgIHJldHVybiAkZWxlbWVudC5maW5kKCdhW2hyZWZdLCBhcmVhW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCAqW3RhYmluZGV4XSwgKltjb250ZW50ZWRpdGFibGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEkKHRoaXMpLmlzKCc6dmlzaWJsZScpIHx8ICQodGhpcykuYXR0cigndGFiaW5kZXgnKSA8IDApIHsgcmV0dXJuIGZhbHNlOyB9IC8vb25seSBoYXZlIHZpc2libGUgZWxlbWVudHMgYW5kIHRob3NlIHRoYXQgaGF2ZSBhIHRhYmluZGV4IGdyZWF0ZXIgb3IgZXF1YWwgMFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGNvbXBvbmVudCBuYW1lIG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHJldHVybiBTdHJpbmcgY29tcG9uZW50TmFtZVxuICAgKi9cblxuICByZWdpc3Rlcihjb21wb25lbnROYW1lLCBjbWRzKSB7XG4gICAgY29tbWFuZHNbY29tcG9uZW50TmFtZV0gPSBjbWRzO1xuICB9XG59XG5cbi8qXG4gKiBDb25zdGFudHMgZm9yIGVhc2llciBjb21wYXJpbmcuXG4gKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAqL1xuZnVuY3Rpb24gZ2V0S2V5Q29kZXMoa2NzKSB7XG4gIHZhciBrID0ge307XG4gIGZvciAodmFyIGtjIGluIGtjcykga1trY3Nba2NdXSA9IGtjc1trY107XG4gIHJldHVybiBrO1xufVxuXG5Gb3VuZGF0aW9uLktleWJvYXJkID0gS2V5Ym9hcmQ7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLy8gRGVmYXVsdCBzZXQgb2YgbWVkaWEgcXVlcmllc1xuY29uc3QgZGVmYXVsdFF1ZXJpZXMgPSB7XG4gICdkZWZhdWx0JyA6ICdvbmx5IHNjcmVlbicsXG4gIGxhbmRzY2FwZSA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgcG9ydHJhaXQgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgcmV0aW5hIDogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbnZhciBNZWRpYVF1ZXJ5ID0ge1xuICBxdWVyaWVzOiBbXSxcblxuICBjdXJyZW50OiAnJyxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1lZGlhIHF1ZXJ5IGhlbHBlciwgYnkgZXh0cmFjdGluZyB0aGUgYnJlYWtwb2ludCBsaXN0IGZyb20gdGhlIENTUyBhbmQgYWN0aXZhdGluZyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXh0cmFjdGVkU3R5bGVzID0gJCgnLmZvdW5kYXRpb24tbXEnKS5jc3MoJ2ZvbnQtZmFtaWx5Jyk7XG4gICAgdmFyIG5hbWVkUXVlcmllcztcblxuICAgIG5hbWVkUXVlcmllcyA9IHBhcnNlU3R5bGVUb09iamVjdChleHRyYWN0ZWRTdHlsZXMpO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWVkUXVlcmllcykge1xuICAgICAgaWYobmFtZWRRdWVyaWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2VsZi5xdWVyaWVzLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICB2YWx1ZTogYG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAke25hbWVkUXVlcmllc1trZXldfSlgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCk7XG5cbiAgICB0aGlzLl93YXRjaGVyKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIGlzIGF0IGxlYXN0IGFzIHdpZGUgYXMgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBicmVha3BvaW50IG1hdGNoZXMsIGBmYWxzZWAgaWYgaXQncyBzbWFsbGVyLlxuICAgKi9cbiAgYXRMZWFzdChzaXplKSB7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5nZXQoc2l6ZSk7XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSkubWF0Y2hlcztcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxuICAgKi9cbiAgZ2V0KHNpemUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xuICAgICAgaWYodGhpcy5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBicmVha3BvaW50IG5hbWUgYnkgdGVzdGluZyBldmVyeSBicmVha3BvaW50IGFuZCByZXR1cm5pbmcgdGhlIGxhc3Qgb25lIHRvIG1hdGNoICh0aGUgYmlnZ2VzdCBvbmUpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge1N0cmluZ30gTmFtZSBvZiB0aGUgY3VycmVudCBicmVha3BvaW50LlxuICAgKi9cbiAgX2dldEN1cnJlbnRTaXplKCkge1xuICAgIHZhciBtYXRjaGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnF1ZXJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcblxuICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5LnZhbHVlKS5tYXRjaGVzKSB7XG4gICAgICAgIG1hdGNoZWQgPSBxdWVyeTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZC5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdGl2YXRlcyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLCB3aGljaCBmaXJlcyBhbiBldmVudCBvbiB0aGUgd2luZG93IHdoZW5ldmVyIHRoZSBicmVha3BvaW50IGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3dhdGNoZXIoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYubWVkaWFxdWVyeScsICgpID0+IHtcbiAgICAgIHZhciBuZXdTaXplID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSwgY3VycmVudFNpemUgPSB0aGlzLmN1cnJlbnQ7XG5cbiAgICAgIGlmIChuZXdTaXplICE9PSBjdXJyZW50U2l6ZSkge1xuICAgICAgICAvLyBDaGFuZ2UgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnlcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcblxuICAgICAgICAvLyBCcm9hZGNhc3QgdGhlIG1lZGlhIHF1ZXJ5IGNoYW5nZSBvbiB0aGUgd2luZG93XG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxuLy8gbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLlxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2VcbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBtYXRjaE1lZGl1bSBhcGkgc3VjaCBhcyBJRSA5IGFuZCB3ZWJraXRcbiAgdmFyIHN0eWxlTWVkaWEgPSAod2luZG93LnN0eWxlTWVkaWEgfHwgd2luZG93Lm1lZGlhKTtcblxuICAvLyBGb3IgdGhvc2UgdGhhdCBkb24ndCBzdXBwb3J0IG1hdGNoTWVkaXVtXG4gIGlmICghc3R5bGVNZWRpYSkge1xuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcbiAgICBzY3JpcHQgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXSxcbiAgICBpbmZvICAgICAgICA9IG51bGw7XG5cbiAgICBzdHlsZS50eXBlICA9ICd0ZXh0L2Nzcyc7XG4gICAgc3R5bGUuaWQgICAgPSAnbWF0Y2htZWRpYWpzLXRlc3QnO1xuXG4gICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0eWxlLCBzY3JpcHQpO1xuXG4gICAgLy8gJ3N0eWxlLmN1cnJlbnRTdHlsZScgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnd2luZG93LmdldENvbXB1dGVkU3R5bGUnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICBpbmZvID0gKCdnZXRDb21wdXRlZFN0eWxlJyBpbiB3aW5kb3cpICYmIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHN0eWxlLCBudWxsKSB8fCBzdHlsZS5jdXJyZW50U3R5bGU7XG5cbiAgICBzdHlsZU1lZGlhID0ge1xuICAgICAgbWF0Y2hNZWRpdW0obWVkaWEpIHtcbiAgICAgICAgdmFyIHRleHQgPSBgQG1lZGlhICR7bWVkaWF9eyAjbWF0Y2htZWRpYWpzLXRlc3QgeyB3aWR0aDogMXB4OyB9IH1gO1xuXG4gICAgICAgIC8vICdzdHlsZS5zdHlsZVNoZWV0JyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICdzdHlsZS50ZXh0Q29udGVudCcgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgICAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IHRleHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3R5bGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVzdCBpZiBtZWRpYSBxdWVyeSBpcyB0cnVlIG9yIGZhbHNlXG4gICAgICAgIHJldHVybiBpbmZvLndpZHRoID09PSAnMXB4JztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24obWVkaWEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWF0Y2hlczogc3R5bGVNZWRpYS5tYXRjaE1lZGl1bShtZWRpYSB8fCAnYWxsJyksXG4gICAgICBtZWRpYTogbWVkaWEgfHwgJ2FsbCdcbiAgICB9O1xuICB9XG59KCkpO1xuXG4vLyBUaGFuayB5b3U6IGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvcXVlcnktc3RyaW5nXG5mdW5jdGlvbiBwYXJzZVN0eWxlVG9PYmplY3Qoc3RyKSB7XG4gIHZhciBzdHlsZU9iamVjdCA9IHt9O1xuXG4gIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0ciA9IHN0ci50cmltKCkuc2xpY2UoMSwgLTEpOyAvLyBicm93c2VycyByZS1xdW90ZSBzdHJpbmcgc3R5bGUgdmFsdWVzXG5cbiAgaWYgKCFzdHIpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHlsZU9iamVjdCA9IHN0ci5zcGxpdCgnJicpLnJlZHVjZShmdW5jdGlvbihyZXQsIHBhcmFtKSB7XG4gICAgdmFyIHBhcnRzID0gcGFyYW0ucmVwbGFjZSgvXFwrL2csICcgJykuc3BsaXQoJz0nKTtcbiAgICB2YXIga2V5ID0gcGFydHNbMF07XG4gICAgdmFyIHZhbCA9IHBhcnRzWzFdO1xuICAgIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChrZXkpO1xuXG4gICAgLy8gbWlzc2luZyBgPWAgc2hvdWxkIGJlIGBudWxsYDpcbiAgICAvLyBodHRwOi8vdzMub3JnL1RSLzIwMTIvV0QtdXJsLTIwMTIwNTI0LyNjb2xsZWN0LXVybC1wYXJhbWV0ZXJzXG4gICAgdmFsID0gdmFsID09PSB1bmRlZmluZWQgPyBudWxsIDogZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XG5cbiAgICBpZiAoIXJldC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICByZXRba2V5XSA9IHZhbDtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmV0W2tleV0pKSB7XG4gICAgICByZXRba2V5XS5wdXNoKHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldFtrZXldID0gW3JldFtrZXldLCB2YWxdO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LCB7fSk7XG5cbiAgcmV0dXJuIHN0eWxlT2JqZWN0O1xufVxuXG5Gb3VuZGF0aW9uLk1lZGlhUXVlcnkgPSBNZWRpYVF1ZXJ5O1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogTW90aW9uIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tb3Rpb25cbiAqL1xuXG5jb25zdCBpbml0Q2xhc3NlcyAgID0gWydtdWktZW50ZXInLCAnbXVpLWxlYXZlJ107XG5jb25zdCBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuY29uc3QgTW90aW9uID0ge1xuICBhbmltYXRlSW46IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgICBhbmltYXRlKHRydWUsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9LFxuXG4gIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgICBhbmltYXRlKGZhbHNlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBNb3ZlKGR1cmF0aW9uLCBlbGVtLCBmbil7XG4gIHZhciBhbmltLCBwcm9nLCBzdGFydCA9IG51bGw7XG4gIC8vIGNvbnNvbGUubG9nKCdjYWxsZWQnKTtcblxuICBmdW5jdGlvbiBtb3ZlKHRzKXtcbiAgICBpZighc3RhcnQpIHN0YXJ0ID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpO1xuICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0LCB0cyk7XG4gICAgcHJvZyA9IHRzIC0gc3RhcnQ7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG5cbiAgICBpZihwcm9nIDwgZHVyYXRpb24peyBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlLCBlbGVtKTsgfVxuICAgIGVsc2V7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbSk7XG4gICAgICBlbGVtLnRyaWdnZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pLnRyaWdnZXJIYW5kbGVyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKTtcbiAgICB9XG4gIH1cbiAgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSk7XG59XG5cbi8qKlxuICogQW5pbWF0ZXMgYW4gZWxlbWVudCBpbiBvciBvdXQgdXNpbmcgYSBDU1MgdHJhbnNpdGlvbiBjbGFzcy5cbiAqIEBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNJbiAtIERlZmluZXMgaWYgdGhlIGFuaW1hdGlvbiBpcyBpbiBvciBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvciBIVE1MIG9iamVjdCB0byBhbmltYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGFuaW1hdGlvbiAtIENTUyBjbGFzcyB0byB1c2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIENhbGxiYWNrIHRvIHJ1biB3aGVuIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAqL1xuZnVuY3Rpb24gYW5pbWF0ZShpc0luLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gIGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApO1xuXG4gIGlmICghZWxlbWVudC5sZW5ndGgpIHJldHVybjtcblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuXG4gIGVsZW1lbnRcbiAgICAuYWRkQ2xhc3MoYW5pbWF0aW9uKVxuICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnbm9uZScpO1xuXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhpbml0Q2xhc3MpO1xuICAgIGlmIChpc0luKSBlbGVtZW50LnNob3coKTtcbiAgfSk7XG5cbiAgLy8gU3RhcnQgdGhlIGFuaW1hdGlvblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudFxuICAgICAgLmNzcygndHJhbnNpdGlvbicsICcnKVxuICAgICAgLmFkZENsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgfSk7XG5cbiAgLy8gQ2xlYW4gdXAgdGhlIGFuaW1hdGlvbiB3aGVuIGl0IGZpbmlzaGVzXG4gIGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZChlbGVtZW50KSwgZmluaXNoKTtcblxuICAvLyBIaWRlcyB0aGUgZWxlbWVudCAoZm9yIG91dCBhbmltYXRpb25zKSwgcmVzZXRzIHRoZSBlbGVtZW50LCBhbmQgcnVucyBhIGNhbGxiYWNrXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICBpZiAoIWlzSW4pIGVsZW1lbnQuaGlkZSgpO1xuICAgIHJlc2V0KCk7XG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcbiAgfVxuXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBlbGVtZW50WzBdLnN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9IDA7XG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhgJHtpbml0Q2xhc3N9ICR7YWN0aXZlQ2xhc3N9ICR7YW5pbWF0aW9ufWApO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTW92ZSA9IE1vdmU7XG5Gb3VuZGF0aW9uLk1vdGlvbiA9IE1vdGlvbjtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBOZXN0ID0ge1xuICBGZWF0aGVyKG1lbnUsIHR5cGUgPSAnemYnKSB7XG4gICAgbWVudS5hdHRyKCdyb2xlJywgJ21lbnViYXInKTtcblxuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5hdHRyKHsncm9sZSc6ICdtZW51aXRlbSd9KSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgbWVudS5maW5kKCdhOmZpcnN0JykuYXR0cigndGFiaW5kZXgnLCAwKTtcblxuICAgIGl0ZW1zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcblxuICAgICAgaWYgKCRzdWIubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtXG4gICAgICAgICAgLmFkZENsYXNzKGhhc1N1YkNsYXNzKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICAgICAnYXJpYS1sYWJlbCc6ICRpdGVtLmNoaWxkcmVuKCdhOmZpcnN0JykudGV4dCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgJHN1YlxuICAgICAgICAgIC5hZGRDbGFzcyhgc3VibWVudSAke3N1Yk1lbnVDbGFzc31gKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdkYXRhLXN1Ym1lbnUnOiAnJyxcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkge1xuICAgICAgICAkaXRlbS5hZGRDbGFzcyhgaXMtc3VibWVudS1pdGVtICR7c3ViSXRlbUNsYXNzfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIEJ1cm4obWVudSwgdHlwZSkge1xuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51XG4gICAgICAuZmluZCgnKicpXG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7c3ViTWVudUNsYXNzfSAke3N1Ykl0ZW1DbGFzc30gJHtoYXNTdWJDbGFzc30gaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUgaXMtYWN0aXZlYClcbiAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyggICAgICBtZW51LmZpbmQoJy4nICsgc3ViTWVudUNsYXNzICsgJywgLicgKyBzdWJJdGVtQ2xhc3MgKyAnLCAuaGFzLXN1Ym1lbnUsIC5pcy1zdWJtZW51LWl0ZW0sIC5zdWJtZW51LCBbZGF0YS1zdWJtZW51XScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVDbGFzcyhzdWJNZW51Q2xhc3MgKyAnICcgKyBzdWJJdGVtQ2xhc3MgKyAnIGhhcy1zdWJtZW51IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51JylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpKTtcbiAgICAvLyBpdGVtcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgLy8gICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgIC8vICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcbiAgICAvLyAgIGlmKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaXMtc3VibWVudS1pdGVtICcgKyBzdWJJdGVtQ2xhc3MpO1xuICAgIC8vICAgfVxuICAgIC8vICAgaWYoJHN1Yi5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaGFzLXN1Ym1lbnUnKTtcbiAgICAvLyAgICAgJHN1Yi5yZW1vdmVDbGFzcygnc3VibWVudSAnICsgc3ViTWVudUNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk5lc3QgPSBOZXN0O1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmZ1bmN0aW9uIFRpbWVyKGVsZW0sIG9wdGlvbnMsIGNiKSB7XG4gIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24sLy9vcHRpb25zIGlzIGFuIG9iamVjdCBmb3IgZWFzaWx5IGFkZGluZyBmZWF0dXJlcyBsYXRlci5cbiAgICAgIG5hbWVTcGFjZSA9IE9iamVjdC5rZXlzKGVsZW0uZGF0YSgpKVswXSB8fCAndGltZXInLFxuICAgICAgcmVtYWluID0gLTEsXG4gICAgICBzdGFydCxcbiAgICAgIHRpbWVyO1xuXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcblxuICB0aGlzLnJlc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICByZW1haW4gPSAtMTtcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHRoaXMuc3RhcnQoKTtcbiAgfVxuXG4gIHRoaXMuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG4gICAgLy8gaWYoIWVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICByZW1haW4gPSByZW1haW4gPD0gMCA/IGR1cmF0aW9uIDogcmVtYWluO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgZmFsc2UpO1xuICAgIHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGlmKG9wdGlvbnMuaW5maW5pdGUpe1xuICAgICAgICBfdGhpcy5yZXN0YXJ0KCk7Ly9yZXJ1biB0aGUgdGltZXIuXG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH0sIHJlbWFpbik7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG5cbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSB0cnVlO1xuICAgIC8vaWYoZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgdHJ1ZSk7XG4gICAgdmFyIGVuZCA9IERhdGUubm93KCk7XG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVycGF1c2VkLnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG59XG5cbi8qKlxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gaW1hZ2VzIC0gSW1hZ2UocykgdG8gY2hlY2sgaWYgbG9hZGVkLlxuICogQHBhcmFtIHtGdW5jfSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBpbWFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKi9cbmZ1bmN0aW9uIG9uSW1hZ2VzTG9hZGVkKGltYWdlcywgY2FsbGJhY2spe1xuICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XG5cbiAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgdGhpcy5uYXR1cmFsV2lkdGggIT09ICd1bmRlZmluZWQnICYmIHRoaXMubmF0dXJhbFdpZHRoID4gMCkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLmxvYWQoKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudHNMaXN0ZW5lcigpIHtcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaXplXSwgW2RhdGEtc2Nyb2xsXSwgW2RhdGEtbXV0YXRlXScpO1xuXG4gIC8vZWxlbWVudCBjYWxsYmFja1xuICB2YXIgbGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiA9IGZ1bmN0aW9uKG11dGF0aW9uUmVjb3Jkc0xpc3QpIHtcbiAgICB2YXIgJHRhcmdldCA9ICQobXV0YXRpb25SZWNvcmRzTGlzdFswXS50YXJnZXQpO1xuICAgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKCR0YXJnZXQuYXR0cihcImRhdGEtZXZlbnRzXCIpKSB7XG5cbiAgICAgIGNhc2UgXCJyZXNpemVcIiA6XG4gICAgICAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXRdKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwic2Nyb2xsXCIgOlxuICAgICAgJHRhcmdldC50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LCB3aW5kb3cucGFnZVlPZmZzZXRdKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIFwibXV0YXRlXCIgOlxuICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0ZScsICR0YXJnZXQpO1xuICAgICAgLy8gJHRhcmdldC50cmlnZ2VySGFuZGxlcignbXV0YXRlLnpmLnRyaWdnZXInKTtcbiAgICAgIC8vXG4gICAgICAvLyAvL21ha2Ugc3VyZSB3ZSBkb24ndCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcCBmcm9tIHNsb3BweSBjb2RlaW5nXG4gICAgICAvLyBpZiAoJHRhcmdldC5pbmRleCgnW2RhdGEtbXV0YXRlXScpID09ICQoXCJbZGF0YS1tdXRhdGVdXCIpLmxlbmd0aC0xKSB7XG4gICAgICAvLyAgIGRvbU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0IDpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vbm90aGluZ1xuICAgIH1cbiAgfVxuXG4gIGlmKG5vZGVzLmxlbmd0aCl7XG4gICAgLy9mb3IgZWFjaCBlbGVtZW50IHRoYXQgbmVlZHMgdG8gbGlzdGVuIGZvciByZXNpemluZywgc2Nyb2xsaW5nLCAob3IgY29taW5nIHNvb24gbXV0YXRpb24pIGFkZCBhIHNpbmdsZSBvYnNlcnZlclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IG5vZGVzLmxlbmd0aC0xOyBpKyspIHtcbiAgICAgIGxldCBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcbiAgICAgIGVsZW1lbnRPYnNlcnZlci5vYnNlcnZlKG5vZGVzW2ldLCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogZmFsc2UsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOmZhbHNlLCBhdHRyaWJ1dGVGaWx0ZXI6W1wiZGF0YS1ldmVudHNcIl19KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFtQSF1cbi8vIEZvdW5kYXRpb24uQ2hlY2tXYXRjaGVycyA9IGNoZWNrV2F0Y2hlcnM7XG5Gb3VuZGF0aW9uLklIZWFyWW91ID0gY2hlY2tMaXN0ZW5lcnM7XG4vLyBGb3VuZGF0aW9uLklTZWVZb3UgPSBzY3JvbGxMaXN0ZW5lcjtcbi8vIEZvdW5kYXRpb24uSUZlZWxZb3UgPSBjbG9zZW1lTGlzdGVuZXI7XG5cbn0oalF1ZXJ5KTtcblxuLy8gZnVuY3Rpb24gZG9tTXV0YXRpb25PYnNlcnZlcihkZWJvdW5jZSkge1xuLy8gICAvLyAhISEgVGhpcyBpcyBjb21pbmcgc29vbiBhbmQgbmVlZHMgbW9yZSB3b3JrOyBub3QgYWN0aXZlICAhISEgLy9cbi8vICAgdmFyIHRpbWVyLFxuLy8gICBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLW11dGF0ZV0nKTtcbi8vICAgLy9cbi8vICAgaWYgKG5vZGVzLmxlbmd0aCkge1xuLy8gICAgIC8vIHZhciBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbi8vICAgICAvLyAgIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuLy8gICAgIC8vICAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbi8vICAgICAvLyAgICAgaWYgKHByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInIGluIHdpbmRvdykge1xuLy8gICAgIC8vICAgICAgIHJldHVybiB3aW5kb3dbcHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlciddO1xuLy8gICAgIC8vICAgICB9XG4vLyAgICAgLy8gICB9XG4vLyAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4vLyAgICAgLy8gfSgpKTtcbi8vXG4vL1xuLy8gICAgIC8vZm9yIHRoZSBib2R5LCB3ZSBuZWVkIHRvIGxpc3RlbiBmb3IgYWxsIGNoYW5nZXMgZWZmZWN0aW5nIHRoZSBzdHlsZSBhbmQgY2xhc3MgYXR0cmlidXRlc1xuLy8gICAgIHZhciBib2R5T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihib2R5TXV0YXRpb24pO1xuLy8gICAgIGJvZHlPYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTp0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6W1wic3R5bGVcIiwgXCJjbGFzc1wiXX0pO1xuLy9cbi8vXG4vLyAgICAgLy9ib2R5IGNhbGxiYWNrXG4vLyAgICAgZnVuY3Rpb24gYm9keU11dGF0aW9uKG11dGF0ZSkge1xuLy8gICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIG11dGF0aW9uIGV2ZW50XG4vLyAgICAgICBpZiAodGltZXIpIHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuLy9cbi8vICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbi8vICAgICAgICAgYm9keU9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbi8vICAgICAgICAgJCgnW2RhdGEtbXV0YXRlXScpLmF0dHIoJ2RhdGEtZXZlbnRzJyxcIm11dGF0ZVwiKTtcbi8vICAgICAgIH0sIGRlYm91bmNlIHx8IDE1MCk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWJpZGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFiaWRlXG4gKi9cblxuY2xhc3MgQWJpZGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBYmlkZSNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgQWJpZGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FiaWRlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEFiaWRlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBBYmlkZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBBYmlkZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy5hYmlkZScpXG4gICAgICAub24oJ3Jlc2V0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICB0aGlzLnJlc2V0Rm9ybSgpO1xuICAgICAgfSlcbiAgICAgIC5vbignc3VibWl0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZUZvcm0oKTtcbiAgICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52YWxpZGF0ZU9uID09PSAnZmllbGRDaGFuZ2UnKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignY2hhbmdlLnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdjaGFuZ2UuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMubGl2ZVZhbGlkYXRlKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignaW5wdXQuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2lucHV0LnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgQWJpZGUgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciBvciBub3QgYSBmb3JtIGVsZW1lbnQgaGFzIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYW5kIGlmIGl0J3MgY2hlY2tlZCBvciBub3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgcmVxdWlyZWRDaGVjaygkZWwpIHtcbiAgICBpZiAoISRlbC5hdHRyKCdyZXF1aXJlZCcpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHZhciBpc0dvb2QgPSB0cnVlO1xuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBpc0dvb2QgPSAkZWxbMF0uY2hlY2tlZDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhciBvcHQgPSAkZWwuZmluZCgnb3B0aW9uOnNlbGVjdGVkJyk7XG4gICAgICAgIGlmICghb3B0Lmxlbmd0aCB8fCAhb3B0LnZhbCgpKSBpc0dvb2QgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmKCEkZWwudmFsKCkgfHwgISRlbC52YWwoKS5sZW5ndGgpIGlzR29vZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBpc0dvb2Q7XG4gIH1cblxuICAvKipcbiAgICogQmFzZWQgb24gJGVsLCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aCBzZWxlY3RvciBpbiB0aGlzIG9yZGVyOlxuICAgKiAxLiBUaGUgZWxlbWVudCdzIGRpcmVjdCBzaWJsaW5nKCdzKS5cbiAgICogMy4gVGhlIGVsZW1lbnQncyBwYXJlbnQncyBjaGlsZHJlbi5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIG11bHRpcGxlIGZvcm0gZXJyb3JzIHBlciBpbnB1dCwgdGhvdWdoIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBmb3JtIGVycm9ycyB3aWxsIGJlIHNob3duLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgcmVmZXJlbmNlIHRvIGZpbmQgdGhlIGZvcm0gZXJyb3Igc2VsZWN0b3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBvYmplY3Qgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAqL1xuICBmaW5kRm9ybUVycm9yKCRlbCkge1xuICAgIHZhciAkZXJyb3IgPSAkZWwuc2libGluZ3ModGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcblxuICAgIGlmICghJGVycm9yLmxlbmd0aCkge1xuICAgICAgJGVycm9yID0gJGVsLnBhcmVudCgpLmZpbmQodGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZExhYmVsKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRsYWJlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNldCBvZiBsYWJlbHMgYXNzb2NpYXRlZCB3aXRoIGEgc2V0IG9mIHJhZGlvIGVscyBpbiB0aGlzIG9yZGVyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kUmFkaW9MYWJlbHMoJGVscykge1xuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcbiAgICAgIHZhciBpZCA9IGVsLmlkO1xuICAgICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICRsYWJlbCA9ICQoZWwpLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGxhYmVsWzBdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICQobGFiZWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyB0byB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xuICAgKi9cbiAgYWRkRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5hdHRyKCdkYXRhLWludmFsaWQnLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqXG4gICAqL1xuXG4gIHJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKGdyb3VwTmFtZSkge1xuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciAkbGFiZWxzID0gdGhpcy5maW5kUmFkaW9MYWJlbHMoJGVscyk7XG4gICAgdmFyICRmb3JtRXJyb3JzID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbHMpO1xuXG4gICAgaWYgKCRsYWJlbHMubGVuZ3RoKSB7XG4gICAgICAkbGFiZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9ycy5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgZnJvbSB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXG4gICAqL1xuICByZW1vdmVFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcbiAgICBpZigkZWxbMF0udHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcygkZWwuYXR0cignbmFtZScpKTtcbiAgICB9XG5cbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSB0byBmaW5kIGlucHV0cyBhbmQgcHJvY2VlZHMgdG8gdmFsaWRhdGUgdGhlbSBpbiB3YXlzIHNwZWNpZmljIHRvIHRoZWlyIHR5cGVcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI3ZhbGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGFuIEhUTUwgaW5wdXRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cbiAgICovXG4gIHZhbGlkYXRlSW5wdXQoJGVsKSB7XG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxuICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZSxcbiAgICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdHJ1ZSxcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXG4gICAgICAgIGVxdWFsVG8gPSB0cnVlO1xuXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0c1xuICAgIGlmICgkZWwuaXMoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKSB8fCAkZWwuaXMoJ1t0eXBlPVwiaGlkZGVuXCJdJykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVJhZGlvKCRlbC5hdHRyKCduYW1lJykpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XG4gICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlVGV4dCgkZWwpO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIGN1c3RvbVZhbGlkYXRvciA9IHRoaXMubWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9yLCAkZWwuYXR0cigncmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgaWYgKCRlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKSkge1xuICAgICAgZXF1YWxUbyA9IHRoaXMub3B0aW9ucy52YWxpZGF0b3JzLmVxdWFsVG8oJGVsKTtcbiAgICB9XG5cblxuICAgIHZhciBnb29kVG9HbyA9IFtjbGVhclJlcXVpcmUsIHZhbGlkYXRlZCwgY3VzdG9tVmFsaWRhdG9yLCBlcXVhbFRvXS5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gICAgdmFyIG1lc3NhZ2UgPSAoZ29vZFRvR28gPyAndmFsaWQnIDogJ2ludmFsaWQnKSArICcuemYuYWJpZGUnO1xuXG4gICAgdGhpc1tnb29kVG9HbyA/ICdyZW1vdmVFcnJvckNsYXNzZXMnIDogJ2FkZEVycm9yQ2xhc3NlcyddKCRlbCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBpbnB1dCBpcyBkb25lIGNoZWNraW5nIGZvciB2YWxpZGF0aW9uLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgdmFsaWQuemYuYWJpZGVgIG9yIGBpbnZhbGlkLnpmLmFiaWRlYFxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIERPTSBlbGVtZW50IG9mIHRoZSBpbnB1dC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjaW52YWxpZFxuICAgICAqL1xuICAgICRlbC50cmlnZ2VyKG1lc3NhZ2UsIFskZWxdKTtcblxuICAgIHJldHVybiBnb29kVG9HbztcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIGFuZCBpZiB0aGVyZSBhcmUgYW55IGludmFsaWQgaW5wdXRzLCBpdCB3aWxsIGRpc3BsYXkgdGhlIGZvcm0gZXJyb3IgZWxlbWVudFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gbm9FcnJvciAtIHRydWUgaWYgbm8gZXJyb3JzIHdlcmUgZGV0ZWN0ZWQuLi5cbiAgICogQGZpcmVzIEFiaWRlI2Zvcm12YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybWludmFsaWRcbiAgICovXG4gIHZhbGlkYXRlRm9ybSgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgYWNjLnB1c2goX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbm9FcnJvciA9IGFjYy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsIChub0Vycm9yID8gJ25vbmUnIDogJ2Jsb2NrJykpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBpcyBmaW5pc2hlZCB2YWxpZGF0aW5nLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgZm9ybXZhbGlkLnpmLmFiaWRlYCBvciBgZm9ybWludmFsaWQuemYuYWJpZGVgLlxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIGVsZW1lbnQgb2YgdGhlIGZvcm0uXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm12YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtaW52YWxpZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigobm9FcnJvciA/ICdmb3JtdmFsaWQnIDogJ2Zvcm1pbnZhbGlkJykgKyAnLnpmLmFiaWRlJywgW3RoaXMuJGVsZW1lbnRdKTtcblxuICAgIHJldHVybiBub0Vycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHRleHQgaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gdGhlIHBhdHRlcm4gc3BlY2lmaWVkIGluIHRoZSBhdHRyaWJ1dGUuIElmIG5vIG1hdGNoaW5nIHBhdHRlcm4gaXMgZm91bmQsIHJldHVybnMgdHJ1ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhIHRleHQgaW5wdXQgSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXR0ZXJuIC0gc3RyaW5nIHZhbHVlIG9mIG9uZSBvZiB0aGUgUmVnRXggcGF0dGVybnMgaW4gQWJpZGUub3B0aW9ucy5wYXR0ZXJuc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBpbnB1dCB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuIHNwZWNpZmllZFxuICAgKi9cbiAgdmFsaWRhdGVUZXh0KCRlbCwgcGF0dGVybikge1xuICAgIC8vIEEgcGF0dGVybiBjYW4gYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIG9yIGl0IHdpbGwgYmUgaW5mZXJlZCBmcm9tIHRoZSBpbnB1dCdzIFwicGF0dGVyblwiIGF0dHJpYnV0ZSwgb3IgaXQncyBcInR5cGVcIiBhdHRyaWJ1dGVcbiAgICBwYXR0ZXJuID0gKHBhdHRlcm4gfHwgJGVsLmF0dHIoJ3BhdHRlcm4nKSB8fCAkZWwuYXR0cigndHlwZScpKTtcbiAgICB2YXIgaW5wdXRUZXh0ID0gJGVsLnZhbCgpO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuXG4gICAgaWYgKGlucHV0VGV4dC5sZW5ndGgpIHtcbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBpcyBpbiBBYmlkZSdzIGxpc3Qgb2YgcGF0dGVybnMsIHRoZW4gdGVzdCB0aGF0IHJlZ2V4cFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShwYXR0ZXJuKSkge1xuICAgICAgICB2YWxpZCA9IHRoaXMub3B0aW9ucy5wYXR0ZXJuc1twYXR0ZXJuXS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBuYW1lIGlzbid0IGFsc28gdGhlIHR5cGUgYXR0cmlidXRlIG9mIHRoZSBmaWVsZCwgdGhlbiB0ZXN0IGl0IGFzIGEgcmVnZXhwXG4gICAgICBlbHNlIGlmIChwYXR0ZXJuICE9PSAkZWwuYXR0cigndHlwZScpKSB7XG4gICAgICAgIHZhbGlkID0gbmV3IFJlZ0V4cChwYXR0ZXJuKS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbiBlbXB0eSBmaWVsZCBpcyB2YWxpZCBpZiBpdCdzIG5vdCByZXF1aXJlZFxuICAgIGVsc2UgaWYgKCEkZWwucHJvcCgncmVxdWlyZWQnKSkge1xuICAgICAgdmFsaWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgcmFkaW8gaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gd2hldGhlciBvciBub3QgaXQgaXMgcmVxdWlyZWQgYW5kIHNlbGVjdGVkLiBBbHRob3VnaCB0aGUgZnVuY3Rpb24gdGFyZ2V0cyBhIHNpbmdsZSBgPGlucHV0PmAsIGl0IHZhbGlkYXRlcyBieSBjaGVja2luZyB0aGUgYHJlcXVpcmVkYCBhbmQgYGNoZWNrZWRgIHByb3BlcnRpZXMgb2YgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gaXRzIGdyb3VwLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdCBsZWFzdCBvbmUgcmFkaW8gaW5wdXQgaGFzIGJlZW4gc2VsZWN0ZWQgKGlmIGl0J3MgcmVxdWlyZWQpXG4gICAqL1xuICB2YWxpZGF0ZVJhZGlvKGdyb3VwTmFtZSkge1xuICAgIC8vIElmIGF0IGxlYXN0IG9uZSByYWRpbyBpbiB0aGUgZ3JvdXAgaGFzIHRoZSBgcmVxdWlyZWRgIGF0dHJpYnV0ZSwgdGhlIGdyb3VwIGlzIGNvbnNpZGVyZWQgcmVxdWlyZWRcbiAgICAvLyBQZXIgVzNDIHNwZWMsIGFsbCByYWRpbyBidXR0b25zIGluIGEgZ3JvdXAgc2hvdWxkIGhhdmUgYHJlcXVpcmVkYCwgYnV0IHdlJ3JlIGJlaW5nIG5pY2VcbiAgICB2YXIgJGdyb3VwID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlLCByZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSByZXF1aXJlZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIHJlcXVpcmVkXG4gICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgIGlmICgkKGUpLmF0dHIoJ3JlcXVpcmVkJykpIHtcbiAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmKCFyZXF1aXJlZCkgdmFsaWQ9dHJ1ZTtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgdmFsaWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSBjaGVja2VkXG4gICAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgICBpZiAoJChlKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiBhIHNlbGVjdGVkIGlucHV0IHBhc3NlcyBhIGN1c3RvbSB2YWxpZGF0aW9uIGZ1bmN0aW9uLiBNdWx0aXBsZSB2YWxpZGF0aW9ucyBjYW4gYmUgdXNlZCwgaWYgcGFzc2VkIHRvIHRoZSBlbGVtZW50IHdpdGggYGRhdGEtdmFsaWRhdG9yPVwiZm9vIGJhciBiYXpcImAgaW4gYSBzcGFjZSBzZXBhcmF0ZWQgbGlzdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IGlucHV0IGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxpZGF0b3JzIC0gYSBzdHJpbmcgb2YgZnVuY3Rpb24gbmFtZXMgbWF0Y2hpbmcgZnVuY3Rpb25zIGluIHRoZSBBYmlkZS5vcHRpb25zLnZhbGlkYXRvcnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIC0gc2VsZiBleHBsYW5hdG9yeT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiB2YWxpZGF0aW9ucyBwYXNzZWQuXG4gICAqL1xuICBtYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3JzLCByZXF1aXJlZCkge1xuICAgIHJlcXVpcmVkID0gcmVxdWlyZWQgPyB0cnVlIDogZmFsc2U7XG5cbiAgICB2YXIgY2xlYXIgPSB2YWxpZGF0b3JzLnNwbGl0KCcgJykubWFwKCh2KSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnNbdl0oJGVsLCByZXF1aXJlZCwgJGVsLnBhcmVudCgpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xlYXIuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBmb3JtIGlucHV0cyBhbmQgc3R5bGVzXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtcmVzZXRcbiAgICovXG4gIHJlc2V0Rm9ybSgpIHtcbiAgICB2YXIgJGZvcm0gPSB0aGlzLiRlbGVtZW50LFxuICAgICAgICBvcHRzID0gdGhpcy5vcHRpb25zO1xuXG4gICAgJChgLiR7b3B0cy5sYWJlbEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgJChgLiR7b3B0cy5pbnB1dEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmlucHV0RXJyb3JDbGFzcyk7XG4gICAgJChgJHtvcHRzLmZvcm1FcnJvclNlbGVjdG9yfS4ke29wdHMuZm9ybUVycm9yQ2xhc3N9YCkucmVtb3ZlQ2xhc3Mob3B0cy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgJGZvcm0uZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAkKCc6aW5wdXQnLCAkZm9ybSkubm90KCc6YnV0dG9uLCA6c3VibWl0LCA6cmVzZXQsIDpoaWRkZW4sIDpyYWRpbywgOmNoZWNrYm94LCBbZGF0YS1hYmlkZS1pZ25vcmVdJykudmFsKCcnKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6cmFkaW8nLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpjaGVja2JveCcsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBoYXMgYmVlbiByZXNldC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXJlc2V0XG4gICAgICovXG4gICAgJGZvcm0udHJpZ2dlcignZm9ybXJlc2V0LnpmLmFiaWRlJywgWyRmb3JtXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIFJlbW92ZXMgZXJyb3Igc3R5bGVzIGFuZCBjbGFzc2VzIGZyb20gZWxlbWVudHMsIHdpdGhvdXQgcmVzZXR0aW5nIHRoZWlyIHZhbHVlcy5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpXG4gICAgICAgIC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG4gICAgdGhpcy4kaW5wdXRzXG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLnJlbW92ZUVycm9yQ2xhc3NlcygkKHRoaXMpKTtcbiAgICAgIH0pO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkFiaWRlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZXZlbnQgdG8gdmFsaWRhdGUgaW5wdXRzLiBDaGVja2JveGVzIGFuZCByYWRpb3MgdmFsaWRhdGUgaW1tZWRpYXRlbHkuXG4gICAqIFJlbW92ZSBvciBjaGFuZ2UgdGhpcyB2YWx1ZSBmb3IgbWFudWFsIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2ZpZWxkQ2hhbmdlJ1xuICAgKi9cbiAgdmFsaWRhdGVPbjogJ2ZpZWxkQ2hhbmdlJyxcblxuICAvKipcbiAgICogQ2xhc3MgdG8gYmUgYXBwbGllZCB0byBpbnB1dCBsYWJlbHMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLWludmFsaWQtbGFiZWwnXG4gICAqL1xuICBsYWJlbEVycm9yQ2xhc3M6ICdpcy1pbnZhbGlkLWxhYmVsJyxcblxuICAvKipcbiAgICogQ2xhc3MgdG8gYmUgYXBwbGllZCB0byBpbnB1dHMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLWludmFsaWQtaW5wdXQnXG4gICAqL1xuICBpbnB1dEVycm9yQ2xhc3M6ICdpcy1pbnZhbGlkLWlucHV0JyxcblxuICAvKipcbiAgICogQ2xhc3Mgc2VsZWN0b3IgdG8gdXNlIHRvIHRhcmdldCBGb3JtIEVycm9ycyBmb3Igc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcuZm9ybS1lcnJvcidcbiAgICovXG4gIGZvcm1FcnJvclNlbGVjdG9yOiAnLmZvcm0tZXJyb3InLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhZGRlZCB0byBGb3JtIEVycm9ycyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtdmlzaWJsZSdcbiAgICovXG4gIGZvcm1FcnJvckNsYXNzOiAnaXMtdmlzaWJsZScsXG5cbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIHRvIHZhbGlkYXRlIHRleHQgaW5wdXRzIG9uIGFueSB2YWx1ZSBjaGFuZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGxpdmVWYWxpZGF0ZTogZmFsc2UsXG5cbiAgcGF0dGVybnM6IHtcbiAgICBhbHBoYSA6IC9eW2EtekEtWl0rJC8sXG4gICAgYWxwaGFfbnVtZXJpYyA6IC9eW2EtekEtWjAtOV0rJC8sXG4gICAgaW50ZWdlciA6IC9eWy0rXT9cXGQrJC8sXG4gICAgbnVtYmVyIDogL15bLStdP1xcZCooPzpbXFwuXFwsXVxcZCspPyQvLFxuXG4gICAgLy8gYW1leCwgdmlzYSwgZGluZXJzXG4gICAgY2FyZCA6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcbiAgICBjdnYgOiAvXihbMC05XSl7Myw0fSQvLFxuXG4gICAgLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3RhdGVzLW9mLXRoZS10eXBlLWF0dHJpYnV0ZS5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzXG4gICAgZW1haWwgOiAvXlthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSskLyxcblxuICAgIHVybCA6IC9eKGh0dHBzP3xmdHB8ZmlsZXxzc2gpOlxcL1xcLygoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4pKygoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLj8pKDpcXGQqKT8pKFxcLygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KT8oXFw/KCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC8sXG4gICAgLy8gYWJjLmRlXG4gICAgZG9tYWluIDogL14oW2EtekEtWjAtOV0oW2EtekEtWjAtOVxcLV17MCw2MX1bYS16QS1aMC05XSk/XFwuKStbYS16QS1aXXsyLDh9JC8sXG5cbiAgICBkYXRldGltZSA6IC9eKFswLTJdWzAtOV17M30pXFwtKFswLTFdWzAtOV0pXFwtKFswLTNdWzAtOV0pVChbMC01XVswLTldKVxcOihbMC01XVswLTldKVxcOihbMC01XVswLTldKShafChbXFwtXFwrXShbMC0xXVswLTldKVxcOjAwKSkkLyxcbiAgICAvLyBZWVlZLU1NLUREXG4gICAgZGF0ZSA6IC8oPzoxOXwyMClbMC05XXsyfS0oPzooPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18MVswLTldfDJbMC05XSl8KD86KD8hMDIpKD86MFsxLTldfDFbMC0yXSktKD86MzApKXwoPzooPzowWzEzNTc4XXwxWzAyXSktMzEpKSQvLFxuICAgIC8vIEhIOk1NOlNTXG4gICAgdGltZSA6IC9eKDBbMC05XXwxWzAtOV18MlswLTNdKSg6WzAtNV1bMC05XSl7Mn0kLyxcbiAgICBkYXRlSVNPIDogL15cXGR7NH1bXFwvXFwtXVxcZHsxLDJ9W1xcL1xcLV1cXGR7MSwyfSQvLFxuICAgIC8vIE1NL0REL1lZWVlcbiAgICBtb250aF9kYXlfeWVhciA6IC9eKDBbMS05XXwxWzAxMl0pWy0gXFwvLl0oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXVxcZHs0fSQvLFxuICAgIC8vIEREL01NL1lZWVlcbiAgICBkYXlfbW9udGhfeWVhciA6IC9eKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl0oMFsxLTldfDFbMDEyXSlbLSBcXC8uXVxcZHs0fSQvLFxuXG4gICAgLy8gI0ZGRiBvciAjRkZGRkZGXG4gICAgY29sb3IgOiAvXiM/KFthLWZBLUYwLTldezZ9fFthLWZBLUYwLTldezN9KSQvXG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHZhbGlkYXRpb24gZnVuY3Rpb25zIHRvIGJlIHVzZWQuIGBlcXVhbFRvYCBiZWluZyB0aGUgb25seSBkZWZhdWx0IGluY2x1ZGVkIGZ1bmN0aW9uLlxuICAgKiBGdW5jdGlvbnMgc2hvdWxkIHJldHVybiBvbmx5IGEgYm9vbGVhbiBpZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LiBGdW5jdGlvbnMgYXJlIGdpdmVuIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgKiBlbCA6IFRoZSBqUXVlcnkgZWxlbWVudCB0byB2YWxpZGF0ZS5cbiAgICogcmVxdWlyZWQgOiBCb29sZWFuIHZhbHVlIG9mIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYmUgcHJlc2VudCBvciBub3QuXG4gICAqIHBhcmVudCA6IFRoZSBkaXJlY3QgcGFyZW50IG9mIHRoZSBpbnB1dC5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgdmFsaWRhdG9yczoge1xuICAgIGVxdWFsVG86IGZ1bmN0aW9uIChlbCwgcmVxdWlyZWQsIHBhcmVudCkge1xuICAgICAgcmV0dXJuICQoYCMke2VsLmF0dHIoJ2RhdGEtZXF1YWx0bycpfWApLnZhbCgpID09PSBlbC52YWwoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFiaWRlLCAnQWJpZGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIEFjY29yZGlvbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbi5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBhIHBsYWluIG9iamVjdCB3aXRoIHNldHRpbmdzIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uJywge1xuICAgICAgJ0VOVEVSJzogJ3RvZ2dsZScsXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBhY2NvcmRpb24gYnkgYW5pbWF0aW5nIHRoZSBwcmVzZXQgYWN0aXZlIHBhbmUocykuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3JvbGUnLCAndGFibGlzdCcpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdsaSwgW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJyk7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oaWR4LCBlbCkge1xuICAgICAgdmFyICRlbCA9ICQoZWwpLFxuICAgICAgICAgICRjb250ZW50ID0gJGVsLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKSxcbiAgICAgICAgICBpZCA9ICRjb250ZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjY29yZGlvbicpLFxuICAgICAgICAgIGxpbmtJZCA9IGVsLmlkIHx8IGAke2lkfS1sYWJlbGA7XG5cbiAgICAgICRlbC5maW5kKCdhOmZpcnN0JykuYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdpZCc6IGxpbmtJZCxcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgICRjb250ZW50LmF0dHIoeydyb2xlJzogJ3RhYnBhbmVsJywgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZCwgJ2FyaWEtaGlkZGVuJzogdHJ1ZSwgJ2lkJzogaWR9KTtcbiAgICB9KTtcbiAgICB2YXIgJGluaXRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgaWYoJGluaXRBY3RpdmUubGVuZ3RoKXtcbiAgICAgIHRoaXMuZG93bigkaW5pdEFjdGl2ZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgYWNjb3JkaW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKTtcbiAgICAgIHZhciAkdGFiQ29udGVudCA9ICRlbGVtLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICAgIGlmICgkdGFiQ29udGVudC5sZW5ndGgpIHtcbiAgICAgICAgJGVsZW0uY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbiBrZXlkb3duLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgICAub24oJ2NsaWNrLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gJCh0aGlzKS5jaGlsZHJlbignYScpLm9uKCdjbGljay56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGlmICgkZWxlbS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgICAgICAgIGlmKF90aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgfHwgJGVsZW0uc2libGluZ3MoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpe1xuICAgICAgICAgICAgICBfdGhpcy51cCgkdGFiQ29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgX3RoaXMuZG93bigkdGFiQ29udGVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnQWNjb3JkaW9uJywge1xuICAgICAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ubmV4dCgpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5wcmV2KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBzZWxlY3RlZCBjb250ZW50IHBhbmUncyBvcGVuL2Nsb3NlIHN0YXRlLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIGpRdWVyeSBvYmplY3Qgb2YgdGhlIHBhbmUgdG8gdG9nZ2xlLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KSB7XG4gICAgaWYoJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCB8fCAkdGFyZ2V0LnBhcmVudCgpLnNpYmxpbmdzKCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKXtcbiAgICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRvd24oJHRhcmdldCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBhY2NvcmRpb24gdGFiIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIEFjY29yZGlvbiBwYW5lIHRvIG9wZW4uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZmlyc3RUaW1lIC0gZmxhZyB0byBkZXRlcm1pbmUgaWYgcmVmbG93IHNob3VsZCBoYXBwZW4uXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jZG93blxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRvd24oJHRhcmdldCwgZmlyc3RUaW1lKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQgJiYgIWZpcnN0VGltZSkge1xuICAgICAgdmFyICRjdXJyZW50QWN0aXZlID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICAgIGlmKCRjdXJyZW50QWN0aXZlLmxlbmd0aCl7XG4gICAgICAgIHRoaXMudXAoJGN1cnJlbnRBY3RpdmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgICR0YXJnZXRcbiAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsIGZhbHNlKVxuICAgICAgLnBhcmVudCgnW2RhdGEtdGFiLWNvbnRlbnRdJylcbiAgICAgIC5hZGRCYWNrKClcbiAgICAgIC5wYXJlbnQoKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAkdGFyZ2V0LnNsaWRlRG93bih0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgKCkgPT4ge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSB0YWIgaXMgZG9uZSBvcGVuaW5nLlxuICAgICAgICogQGV2ZW50IEFjY29yZGlvbiNkb3duXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignZG93bi56Zi5hY2NvcmRpb24nLCBbJHRhcmdldF0pO1xuICAgIH0pO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogdHJ1ZSxcbiAgICAgICdhcmlhLXNlbGVjdGVkJzogdHJ1ZVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgdGFiIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIEFjY29yZGlvbiB0YWIgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jdXBcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyICRhdW50cyA9ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgIHZhciBjYW5DbG9zZSA9IHRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCA/ICRhdW50cy5oYXNDbGFzcygnaXMtYWN0aXZlJykgOiAkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgJiYgIWNhbkNsb3NlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpe1xuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgY29sbGFwc2luZyB1cC5cbiAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbiN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICAgIH0pO1xuICAgIC8vIH0pO1xuXG4gICAgJHRhcmdldC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpXG4gICAgICAgICAgIC5wYXJlbnQoKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xuICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24uXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jZGVzdHJveWVkXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRhYi1jb250ZW50XScpLnN0b3AodHJ1ZSkuc2xpZGVVcCgwKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdhJykub2ZmKCcuemYuYWNjb3JkaW9uJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhbiBhY2NvcmRpb24gcGFuZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIHNsaWRlU3BlZWQ6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtdWx0aUV4cGFuZDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgYWNjb3JkaW9uIHRvIGNsb3NlIGFsbCBwYW5lcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYWxsb3dBbGxDbG9zZWQ6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWNjb3JkaW9uLCAnQWNjb3JkaW9uJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBY2NvcmRpb25NZW51IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hY2NvcmRpb25NZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5uZXN0XG4gKi9cblxuY2xhc3MgQWNjb3JkaW9uTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbiBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbiBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbk1lbnUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FjY29yZGlvbk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdBY2NvcmRpb25NZW51Jywge1xuICAgICAgJ0VOVEVSJzogJ3RvZ2dsZScsXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ2Nsb3NlJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2VBbGwnLFxuICAgICAgJ1RBQic6ICdkb3duJyxcbiAgICAgICdTSElGVF9UQUInOiAndXAnXG4gICAgfSk7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBhY2NvcmRpb24gbWVudSBieSBoaWRpbmcgYWxsIG5lc3RlZCBtZW51cy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5ub3QoJy5pcy1hY3RpdmUnKS5zbGlkZVVwKDApOy8vLmZpbmQoJ2EnKS5jc3MoJ3BhZGRpbmctbGVmdCcsICcxcmVtJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3RhYmxpc3QnLFxuICAgICAgJ2FyaWEtbXVsdGlzZWxlY3RhYmxlJzogdGhpcy5vcHRpb25zLm11bHRpT3BlblxuICAgIH0pO1xuXG4gICAgdGhpcy4kbWVudUxpbmtzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy4kbWVudUxpbmtzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciBsaW5rSWQgPSB0aGlzLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51LWxpbmsnKSxcbiAgICAgICAgICAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLFxuICAgICAgICAgIHN1YklkID0gJHN1YlswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2MtbWVudScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJHN1Yi5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAkZWxlbS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBzdWJJZCxcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBpc0FjdGl2ZSxcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcbiAgICAgICRzdWIuYXR0cih7XG4gICAgICAgICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWQsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ3JvbGUnOiAndGFicGFuZWwnLFxuICAgICAgICAnaWQnOiBzdWJJZFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIGluaXRQYW5lcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpO1xuICAgIGlmKGluaXRQYW5lcy5sZW5ndGgpe1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGluaXRQYW5lcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLmRvd24oJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJHN1Ym1lbnUgPSAkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICBpZiAoJHN1Ym1lbnUubGVuZ3RoKSB7XG4gICAgICAgICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKS5vbignY2xpY2suemYuYWNjb3JkaW9uTWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHN1Ym1lbnUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb25tZW51JywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50LFxuICAgICAgICAgICR0YXJnZXQgPSAkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG5cbiAgICAgICAgICBpZiAoJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCQodGhpcykuaXMoJzpmaXJzdC1jaGlsZCcpKSB7IC8vIGlzIGZpcnN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRwcmV2RWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBpZiBwcmV2aW91cyBlbGVtZW50IGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkcHJldkVsZW1lbnQuZmluZCgnbGk6bGFzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmxhc3QtY2hpbGQnKSkgeyAvLyBpcyBsYXN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5uZXh0KCdsaScpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnQWNjb3JkaW9uTWVudScsIHtcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCR0YXJnZXQuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgICAgICAgX3RoaXMuZG93bigkdGFyZ2V0KTtcbiAgICAgICAgICAgICR0YXJnZXQuZmluZCgnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCR0YXJnZXQubGVuZ3RoICYmICEkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHsgLy8gY2xvc2UgYWN0aXZlIHN1YiBvZiB0aGlzIGl0ZW1cbiAgICAgICAgICAgIF90aGlzLnVwKCR0YXJnZXQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkgeyAvLyBjbG9zZSBjdXJyZW50bHkgb3BlbiBzdWJcbiAgICAgICAgICAgIF90aGlzLnVwKCRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3VibWVudV0nKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgLTEpLmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHRvZ2dsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkge1xuICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5oaWRlQWxsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOy8vLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCBwYW5lcyBvZiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBoaWRlQWxsKCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvcGVuL2Nsb3NlIHN0YXRlIG9mIGEgc3VibWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gdGhlIHN1Ym1lbnUgdG8gdG9nZ2xlXG4gICAqL1xuICB0b2dnbGUoJHRhcmdldCl7XG4gICAgaWYoISR0YXJnZXQuaXMoJzphbmltYXRlZCcpKSB7XG4gICAgICBpZiAoISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgICB0aGlzLnVwKCR0YXJnZXQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFN1Yi1tZW51IHRvIG9wZW4uXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rvd25cbiAgICovXG4gIGRvd24oJHRhcmdldCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZighdGhpcy5vcHRpb25zLm11bHRpT3Blbikge1xuICAgICAgdGhpcy51cCh0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKS5ub3QoJHRhcmdldC5wYXJlbnRzVW50aWwodGhpcy4kZWxlbWVudCkuYWRkKCR0YXJnZXQpKSk7XG4gICAgfVxuXG4gICAgJHRhcmdldC5hZGRDbGFzcygnaXMtYWN0aXZlJykuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KVxuICAgICAgLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoeydhcmlhLWV4cGFuZGVkJzogdHJ1ZX0pO1xuXG4gICAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICR0YXJnZXQuc2xpZGVEb3duKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBvcGVuaW5nLlxuICAgICAgICAgICAqIEBldmVudCBBY2NvcmRpb25NZW51I2Rvd25cbiAgICAgICAgICAgKi9cbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdkb3duLnpmLmFjY29yZGlvbk1lbnUnLCBbJHRhcmdldF0pO1xuICAgICAgICB9KTtcbiAgICAgIC8vfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBzdWItbWVudSBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC4gQWxsIHN1Yi1tZW51cyBpbnNpZGUgdGhlIHRhcmdldCB3aWxsIGJlIGNsb3NlZCBhcyB3ZWxsLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFN1Yi1tZW51IHRvIGNsb3NlLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSN1cFxuICAgKi9cbiAgdXAoJHRhcmdldCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLy9Gb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCl7XG4gICAgICAkdGFyZ2V0LnNsaWRlVXAoX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGRvbmUgY29sbGFwc2luZyB1cC5cbiAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjdXBcbiAgICAgICAgICovXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbk1lbnUnLCBbJHRhcmdldF0pO1xuICAgICAgfSk7XG4gICAgLy99KTtcblxuICAgIHZhciAkbWVudXMgPSAkdGFyZ2V0LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVVcCgwKS5hZGRCYWNrKCkuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICRtZW51cy5wYXJlbnQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFjY29yZGlvbiBtZW51LlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNkZXN0cm95ZWRcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlRG93bigwKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdhJykub2ZmKCdjbGljay56Zi5hY2NvcmRpb25NZW51Jyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkFjY29yZGlvbk1lbnUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBhbmltYXRlIHRoZSBvcGVuaW5nIG9mIGEgc3VibWVudSBpbiBtcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIHNsaWRlU3BlZWQ6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBtZW51IHRvIGhhdmUgbXVsdGlwbGUgb3BlbiBwYW5lcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBtdWx0aU9wZW46IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb25NZW51LCAnQWNjb3JkaW9uTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJpbGxkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcmlsbGRvd24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcmlsbGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdkcmlsbGRvd24nKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0RyaWxsZG93bicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0RyaWxsZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICdkb3duJyxcbiAgICAgICdTSElGVF9UQUInOiAndXAnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGRyaWxsZG93biBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMgb2YgZWxlbWVudHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaS5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignYScpO1xuICAgIHRoaXMuJHN1Ym1lbnVzID0gdGhpcy4kc3VibWVudUFuY2hvcnMucGFyZW50KCdsaScpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGknKS5ub3QoJy5qcy1kcmlsbGRvd24tYmFjaycpLmF0dHIoJ3JvbGUnLCAnbWVudWl0ZW0nKS5maW5kKCdhJyk7XG5cbiAgICB0aGlzLl9wcmVwYXJlTWVudSgpO1xuXG4gICAgdGhpcy5fa2V5Ym9hcmRFdmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBwcmVwYXJlcyBkcmlsbGRvd24gbWVudSBieSBzZXR0aW5nIGF0dHJpYnV0ZXMgdG8gbGlua3MgYW5kIGVsZW1lbnRzXG4gICAqIHNldHMgYSBtaW4gaGVpZ2h0IHRvIHByZXZlbnQgY29udGVudCBqdW1waW5nXG4gICAqIHdyYXBzIHRoZSBlbGVtZW50IGlmIG5vdCBhbHJlYWR5IHdyYXBwZWRcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfcHJlcGFyZU1lbnUoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvLyBpZighdGhpcy5vcHRpb25zLmhvbGRPcGVuKXtcbiAgICAvLyAgIHRoaXMuX21lbnVMaW5rRXZlbnRzKCk7XG4gICAgLy8gfVxuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XG4gICAgICB2YXIgJHN1YiA9ICRsaW5rLnBhcmVudCgpO1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5wYXJlbnRMaW5rKXtcbiAgICAgICAgJGxpbmsuY2xvbmUoKS5wcmVwZW5kVG8oJHN1Yi5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSkud3JhcCgnPGxpIGNsYXNzPVwiaXMtc3VibWVudS1wYXJlbnQtaXRlbSBpcy1zdWJtZW51LWl0ZW0gaXMtZHJpbGxkb3duLXN1Ym1lbnUtaXRlbVwiIHJvbGU9XCJtZW51LWl0ZW1cIj48L2xpPicpO1xuICAgICAgfVxuICAgICAgJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJywgJGxpbmsuYXR0cignaHJlZicpKS5yZW1vdmVBdHRyKCdocmVmJyk7XG4gICAgICAkbGluay5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAwLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoJGxpbmspO1xuICAgIH0pO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbWVudSA9ICQodGhpcyksXG4gICAgICAgICAgJGJhY2sgPSAkbWVudS5maW5kKCcuanMtZHJpbGxkb3duLWJhY2snKTtcbiAgICAgIGlmKCEkYmFjay5sZW5ndGgpe1xuICAgICAgICAkbWVudS5wcmVwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICB9XG4gICAgICBfdGhpcy5fYmFjaygkbWVudSk7XG4gICAgfSk7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSAkKHRoaXMub3B0aW9ucy53cmFwcGVyKS5hZGRDbGFzcygnaXMtZHJpbGxkb3duJyk7XG4gICAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC53cmFwKHRoaXMuJHdyYXBwZXIpLnBhcmVudCgpLmNzcyh0aGlzLl9nZXRNYXhEaW1zKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIGVsZW1lbnRzIGluIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgbWVudSBpdGVtIHRvIGFkZCBoYW5kbGVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZigkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ2xpJykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZihlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkKXtcbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgX3RoaXMuX3Nob3coJGVsZW0ucGFyZW50KCdsaScpKTtcblxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xuICAgICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIHRvIGBsaWAncyBpbiB0aGUgbWVudS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9rZXlib2FyZEV2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kbWVudUl0ZW1zLmFkZCh0aGlzLiRlbGVtZW50LmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjayA+IGEnKSkub24oJ2tleWRvd24uemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKS5jaGlsZHJlbignYScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1pbihpKzEsICRlbGVtZW50cy5sZW5ndGgtMSkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcmlsbGRvd24nLCB7XG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbWVudC5wYXJlbnQoJ2xpJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2JhY2soKTtcbiAgICAgICAgICAvL190aGlzLiRtZW51SXRlbXMuZmlyc3QoKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghJGVsZW1lbnQuaXMoX3RoaXMuJG1lbnVJdGVtcykpIHsgLy8gbm90IG1lbnUgaXRlbSBtZWFucyBiYWNrIGJ1dHRvblxuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpLmNoaWxkcmVuKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTsgLy8gZW5kIGtleWJvYXJkQWNjZXNzXG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCBvcGVuIGVsZW1lbnRzLCBhbmQgcmV0dXJucyB0byByb290IG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2Nsb3NlZFxuICAgKi9cbiAgX2hpZGVBbGwoKSB7XG4gICAgdmFyICRlbGVtID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtZHJpbGxkb3duLXN1Ym1lbnUuaXMtYWN0aXZlJykuYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKTtcbiAgICAkZWxlbS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtKSwgZnVuY3Rpb24oZSl7XG4gICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICB9KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZnVsbHkgY2xvc2VkLlxuICAgICAgICAgKiBAZXZlbnQgRHJpbGxkb3duI2Nsb3NlZFxuICAgICAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlZC56Zi5kcmlsbGRvd24nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVyIGZvciBlYWNoIGBiYWNrYCBidXR0b24sIGFuZCBjbG9zZXMgb3BlbiBtZW51cy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jYmFja1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBzdWItbWVudSB0byBhZGQgYGJhY2tgIGV2ZW50LlxuICAgKi9cbiAgX2JhY2soJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICRlbGVtLm9mZignY2xpY2suemYuZHJpbGxkb3duJyk7XG4gICAgJGVsZW0uY2hpbGRyZW4oJy5qcy1kcmlsbGRvd24tYmFjaycpXG4gICAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnbW91c2V1cCBvbiBiYWNrJyk7XG4gICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgdG8gbWVudSBpdGVtcyB3L28gc3VibWVudXMgdG8gY2xvc2Ugb3BlbiBtZW51cyBvbiBjbGljay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfbWVudUxpbmtFdmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRtZW51SXRlbXMubm90KCcuaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50JylcbiAgICAgICAgLm9mZignY2xpY2suemYuZHJpbGxkb3duJylcbiAgICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAvLyBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF90aGlzLl9oaWRlQWxsKCk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIHN1Ym1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI29wZW5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgZWxlbWVudCB3aXRoIGEgc3VibWVudSB0byBvcGVuLCBpLmUuIHRoZSBgbGlgIHRhZy5cbiAgICovXG4gIF9zaG93KCRlbGVtKSB7XG4gICAgJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc3VibWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNoaWRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGhpZGUsIGkuZS4gdGhlIGB1bGAgdGFnLlxuICAgKi9cbiAgX2hpZGUoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICRlbGVtLmFkZENsYXNzKCdpcy1jbG9zaW5nJylcbiAgICAgICAgIC5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtKSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgICAgICAgICRlbGVtLmJsdXIoKTtcbiAgICAgICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIGNsb3NlZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI2hpZGVcbiAgICAgKi9cbiAgICAkZWxlbS50cmlnZ2VyKCdoaWRlLnpmLmRyaWxsZG93bicsIFskZWxlbV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIG5lc3RlZCBtZW51cyB0byBjYWxjdWxhdGUgdGhlIG1pbi1oZWlnaHQsIGFuZCBtYXgtd2lkdGggZm9yIHRoZSBtZW51LlxuICAgKiBQcmV2ZW50cyBjb250ZW50IGp1bXBpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldE1heERpbXMoKSB7XG4gICAgdmFyIG1heCA9IDAsIHJlc3VsdCA9IHt9O1xuICAgIHRoaXMuJHN1Ym1lbnVzLmFkZCh0aGlzLiRlbGVtZW50KS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbnVtT2ZFbGVtcyA9ICQodGhpcykuY2hpbGRyZW4oJ2xpJykubGVuZ3RoO1xuICAgICAgbWF4ID0gbnVtT2ZFbGVtcyA+IG1heCA/IG51bU9mRWxlbXMgOiBtYXg7XG4gICAgfSk7XG5cbiAgICByZXN1bHRbJ21pbi1oZWlnaHQnXSA9IGAke21heCAqIHRoaXMuJG1lbnVJdGVtc1swXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHR9cHhgO1xuICAgIHJlc3VsdFsnbWF4LXdpZHRoJ10gPSBgJHt0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRofXB4YDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIERyaWxsZG93biBNZW51XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9oaWRlQWxsKCk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuICAgIHRoaXMuJGVsZW1lbnQudW53cmFwKClcbiAgICAgICAgICAgICAgICAgLmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaywgLmlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0nKS5yZW1vdmUoKVxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnLmlzLWFjdGl2ZSwgLmlzLWNsb3NpbmcsIC5pcy1kcmlsbGRvd24tc3VibWVudScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZyBpcy1kcmlsbGRvd24tc3VibWVudScpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCdbZGF0YS1zdWJtZW51XScpLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIHRhYmluZGV4IHJvbGUnKTtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICB9KTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgaWYoJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJykpe1xuICAgICAgICAkbGluay5hdHRyKCdocmVmJywgJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJykpLnJlbW92ZURhdGEoJ3NhdmVkSHJlZicpO1xuICAgICAgfWVsc2V7IHJldHVybjsgfVxuICAgIH0pO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuRHJpbGxkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTWFya3VwIHVzZWQgZm9yIEpTIGdlbmVyYXRlZCBiYWNrIGJ1dHRvbi4gUHJlcGVuZGVkIHRvIHN1Ym1lbnUgbGlzdHMgYW5kIGRlbGV0ZWQgb24gYGRlc3Ryb3lgIG1ldGhvZCwgJ2pzLWRyaWxsZG93bi1iYWNrJyBjbGFzcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJzxcXGxpPjxcXGE+QmFjazxcXC9hPjxcXC9saT4nXG4gICAqL1xuICBiYWNrQnV0dG9uOiAnPGxpIGNsYXNzPVwianMtZHJpbGxkb3duLWJhY2tcIj48YSB0YWJpbmRleD1cIjBcIj5CYWNrPC9hPjwvbGk+JyxcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIHRvIHdyYXAgZHJpbGxkb3duIG1lbnUuIFVzZSBhIGNsYXNzIG5hbWUgZm9yIGluZGVwZW5kZW50IHN0eWxpbmc7IHRoZSBKUyBhcHBsaWVkIGNsYXNzOiBgaXMtZHJpbGxkb3duYCBpcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJzxcXGRpdiBjbGFzcz1cImlzLWRyaWxsZG93blwiPjxcXC9kaXY+J1xuICAgKi9cbiAgd3JhcHBlcjogJzxkaXY+PC9kaXY+JyxcbiAgLyoqXG4gICAqIEFkZHMgdGhlIHBhcmVudCBsaW5rIHRvIHRoZSBzdWJtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBwYXJlbnRMaW5rOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBtZW51IHRvIHJldHVybiB0byByb290IGxpc3Qgb24gYm9keSBjbGljay5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiBmYWxzZVxuICAvLyBob2xkT3BlbjogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcmlsbGRvd24sICdEcmlsbGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBEcm9wZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJvcGRvd24uXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24uXG4gICAqICAgICAgICBPYmplY3Qgc2hvdWxkIGJlIG9mIHRoZSBkcm9wZG93biBwYW5lbCwgcmF0aGVyIHRoYW4gaXRzIGFuY2hvci5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJvcGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAndGFiX2ZvcndhcmQnLFxuICAgICAgJ1NISUZUX1RBQic6ICd0YWJfYmFja3dhcmQnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBzZXR0aW5nL2NoZWNraW5nIG9wdGlvbnMgYW5kIGF0dHJpYnV0ZXMsIGFkZGluZyBoZWxwZXIgdmFyaWFibGVzLCBhbmQgc2F2aW5nIHRoZSBhbmNob3IuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLXRvZ2dsZT1cIiR7JGlkfVwiXWApIHx8ICQoYFtkYXRhLW9wZW49XCIkeyRpZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2VcblxuICAgIH0pO1xuXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6ICRpZCxcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcbiAgICB9KTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IHBvc2l0aW9uIC0gc3RyaW5nIHZhbHVlIG9mIGEgcG9zaXRpb24gY2xhc3MuXG4gICAqL1xuICBnZXRQb3NpdGlvbkNsYXNzKCkge1xuICAgIHZhciB2ZXJ0aWNhbFBvc2l0aW9uID0gdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyh0b3B8bGVmdHxyaWdodHxib3R0b20pL2cpO1xuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcbiAgICB2YXIgaG9yaXpvbnRhbFBvc2l0aW9uID0gL2Zsb2F0LShcXFMrKVxccy8uZXhlYyh0aGlzLiRhbmNob3JbMF0uY2xhc3NOYW1lKTtcbiAgICAgICAgaG9yaXpvbnRhbFBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uWzFdIDogJyc7XG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdHMgdGhlIGRyb3Bkb3duIHBhbmVzIG9yaWVudGF0aW9uIGJ5IGFkZGluZy9yZW1vdmluZyBwb3NpdGlvbmluZyBjbGFzc2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gcG9zaXRpb24gY2xhc3MgdG8gcmVtb3ZlLlxuICAgKi9cbiAgX3JlcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXG4gICAgaWYoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd0b3AnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1cblxuICAgIC8vaWYgZGVmYXVsdCBjaGFuZ2UgZGlkbid0IHdvcmssIHRyeSBib3R0b20gb3IgbGVmdCBmaXJzdFxuICAgIGVsc2UgaWYoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXG4gICAgZWxzZXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IHRydWU7XG4gICAgdGhpcy5jb3VudGVyLS07XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgcG9zaXRpb24gYW5kIG9yaWVudGF0aW9uIG9mIHRoZSBkcm9wZG93biBwYW5lLCBjaGVja3MgZm9yIGNvbGxpc2lvbnMuXG4gICAqIFJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiBpZiBhIGNvbGxpc2lvbiBpcyBkZXRlY3RlZCwgd2l0aCBhIG5ldyBwb3NpdGlvbiBjbGFzcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0UG9zaXRpb24oKSB7XG4gICAgaWYodGhpcy4kYW5jaG9yLmF0dHIoJ2FyaWEtZXhwYW5kZWQnKSA9PT0gJ2ZhbHNlJyl7IHJldHVybiBmYWxzZTsgfVxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpLFxuICAgICAgICAkZWxlRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kZWxlbWVudCksXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRhbmNob3IpLFxuICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGRpcmVjdGlvbiA9IChwb3NpdGlvbiA9PT0gJ2xlZnQnID8gJ2xlZnQnIDogKChwb3NpdGlvbiA9PT0gJ3JpZ2h0JykgPyAnbGVmdCcgOiAndG9wJykpLFxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgb2Zmc2V0ID0gKHBhcmFtID09PSAnaGVpZ2h0JykgPyB0aGlzLm9wdGlvbnMudk9mZnNldCA6IHRoaXMub3B0aW9ucy5oT2Zmc2V0O1xuXG5cblxuICAgIGlmKCgkZWxlRGltcy53aWR0aCA+PSAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKSB8fCAoIXRoaXMuY291bnRlciAmJiAhRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50KSkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgICAgJ3dpZHRoJzogJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICh0aGlzLm9wdGlvbnMuaE9mZnNldCAqIDIpLFxuICAgICAgICAnaGVpZ2h0JzogJ2F1dG8nXG4gICAgICB9KTtcbiAgICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMuJGVsZW1lbnQsIHRoaXMuJGFuY2hvciwgcG9zaXRpb24sIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xuXG4gICAgd2hpbGUoIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCwgZmFsc2UsIHRydWUpICYmIHRoaXMuY291bnRlcil7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBlbGVtZW50IHV0aWxpemluZyB0aGUgdHJpZ2dlcnMgdXRpbGl0eSBsaWJyYXJ5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fc2V0UG9zaXRpb24uYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmhvdmVyKXtcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIHRydWUpO1xuICAgICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgICB9KTtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5ob3ZlclBhbmUpe1xuICAgICAgICB0aGlzLiRlbGVtZW50Lm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIGZhbHNlKTtcbiAgICAgICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiRhbmNob3IuYWRkKHRoaXMuJGVsZW1lbnQpLm9uKCdrZXlkb3duLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oZSkge1xuXG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyksXG4gICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZShfdGhpcy4kZWxlbWVudCk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcm9wZG93bicsIHtcbiAgICAgICAgdGFiX2ZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyh2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpKSkgeyAvLyBsZWZ0IG1vZGFsIGRvd253YXJkcywgc2V0dGluZyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxuICAgICAgICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoMCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaWYgZm9jdXMgaXMgbm90IHRyYXBwZWQsIGNsb3NlIGRyb3Bkb3duIG9uIGZvY3VzIG91dFxuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFiX2JhY2t3YXJkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXModmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKDApKSB8fCBfdGhpcy4kZWxlbWVudC5pcygnOmZvY3VzJykpIHsgLy8gbGVmdCBtb2RhbCB1cHdhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGxhc3QgZWxlbWVudFxuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7IC8vIGlmIGZvY3VzIHNoYWxsIGJlIHRyYXBwZWRcbiAgICAgICAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpZiBmb2N1cyBpcyBub3QgdHJhcHBlZCwgY2xvc2UgZHJvcGRvd24gb24gZm9jdXMgb3V0XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcyhfdGhpcy4kYW5jaG9yKSkge1xuICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhbiBldmVudCBoYW5kbGVyIHRvIHRoZSBib2R5IHRvIGNsb3NlIGFueSBkcm9wZG93bnMgb24gYSBjbGljay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQm9keUhhbmRsZXIoKSB7XG4gICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSkubm90KHRoaXMuJGVsZW1lbnQpLFxuICAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgICAkYm9keS5vZmYoJ2NsaWNrLnpmLmRyb3Bkb3duJylcbiAgICAgICAgICAub24oJ2NsaWNrLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICBpZihfdGhpcy4kYW5jaG9yLmlzKGUudGFyZ2V0KSB8fCBfdGhpcy4kYW5jaG9yLmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihfdGhpcy4kZWxlbWVudC5maW5kKGUudGFyZ2V0KS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKTtcbiAgICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgZHJvcGRvd24gcGFuZSwgYW5kIGZpcmVzIGEgYnViYmxpbmcgZXZlbnQgdG8gY2xvc2Ugb3RoZXIgZHJvcGRvd25zLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyb3Bkb3duI2Nsb3NlbWVcbiAgICogQGZpcmVzIERyb3Bkb3duI3Nob3dcbiAgICovXG4gIG9wZW4oKSB7XG4gICAgLy8gdmFyIF90aGlzID0gdGhpcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBvdGhlciBvcGVuIGRyb3Bkb3duc1xuICAgICAqIEBldmVudCBEcm9wZG93biNjbG9zZW1lXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLmRyb3Bkb3duJywgdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcbiAgICB0aGlzLiRhbmNob3IuYWRkQ2xhc3MoJ2hvdmVyJylcbiAgICAgICAgLmF0dHIoeydhcmlhLWV4cGFuZGVkJzogdHJ1ZX0pO1xuICAgIC8vIHRoaXMuJGVsZW1lbnQvKi5zaG93KCkqLztcbiAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2lzLW9wZW4nKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xuICAgICAgdmFyICRmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG4gICAgICBpZigkZm9jdXNhYmxlLmxlbmd0aCl7XG4gICAgICAgICRmb2N1c2FibGUuZXEoMCkuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKXsgdGhpcy5fYWRkQm9keUhhbmRsZXIoKTsgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvcGVuIGRyb3Bkb3duIHBhbmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jaGlkZVxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuXG4gICAgdGhpcy4kYW5jaG9yLnJlbW92ZUNsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgaWYodGhpcy5jbGFzc0NoYW5nZWQpe1xuICAgICAgdmFyIGN1clBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICAgIGlmKGN1clBvc2l0aW9uQ2xhc3Mpe1xuICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGN1clBvc2l0aW9uQ2xhc3MpO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcylcbiAgICAgICAgICAvKi5oaWRlKCkqLy5jc3Moe2hlaWdodDogJycsIHdpZHRoOiAnJ30pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgICB0aGlzLnVzZWRQb3NpdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBkcm9wZG93biBwYW5lJ3MgdmlzaWJpbGl0eS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIGlmKHRoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicpKSByZXR1cm47XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGRyb3Bkb3duLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyJykuaGlkZSgpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56Zi5kcm9wZG93bicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkRyb3Bkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgb3BlbmluZyBhIHN1Ym1lbnUgb24gaG92ZXIgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBob3ZlckRlbGF5OiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyBzdWJtZW51cyB0byBvcGVuIG9uIGhvdmVyIGV2ZW50c1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBob3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBEb24ndCBjbG9zZSBkcm9wZG93biB3aGVuIGhvdmVyaW5nIG92ZXIgZHJvcGRvd24gcGFuZVxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGhvdmVyUGFuZTogZmFsc2UsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIGJldHdlZW4gdGhlIGRyb3Bkb3duIHBhbmUgYW5kIHRoZSB0cmlnZ2VyaW5nIGVsZW1lbnQgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICB2T2Zmc2V0OiAxLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgaE9mZnNldDogMSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYWRqdXN0IG9wZW4gcG9zaXRpb24uIEpTIHdpbGwgdGVzdCBhbmQgZmlsbCB0aGlzIGluLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b3AnXG4gICAqL1xuICBwb3NpdGlvbkNsYXNzOiAnJyxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBwbHVnaW4gdG8gdHJhcCBmb2N1cyB0byB0aGUgZHJvcGRvd24gcGFuZSBpZiBvcGVuZWQgd2l0aCBrZXlib2FyZCBjb21tYW5kcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgdHJhcEZvY3VzOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBwbHVnaW4gdG8gc2V0IGZvY3VzIHRvIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudCB3aXRoaW4gdGhlIHBhbmUsIHJlZ2FyZGxlc3Mgb2YgbWV0aG9kIG9mIG9wZW5pbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyBhIGNsaWNrIG9uIHRoZSBib2R5IHRvIGNsb3NlIHRoZSBkcm9wZG93bi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiBmYWxzZVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd24sICdEcm9wZG93bicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJvcGRvd25NZW51IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93bi1tZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5uZXN0XG4gKi9cblxuY2xhc3MgRHJvcGRvd25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRHJvcGRvd25NZW51LlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIERyb3Bkb3duTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyb3Bkb3duTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2Ryb3Bkb3duJyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJvcGRvd25NZW51Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJvcGRvd25NZW51Jywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZSdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luLCBhbmQgY2FsbHMgX3ByZXBhcmVNZW51XG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHN1YnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51JykuYWRkQ2xhc3MoJ2ZpcnN0LXN1YicpO1xuXG4gICAgdGhpcy4kbWVudUl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKCdbcm9sZT1cIm1lbnVpdGVtXCJdJyk7XG4gICAgdGhpcy4kdGFicyA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzLmZpbmQoJ3VsLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMudmVydGljYWxDbGFzcyk7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMucmlnaHRDbGFzcykgfHwgdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ3JpZ2h0JyB8fCBGb3VuZGF0aW9uLnJ0bCgpIHx8IHRoaXMuJGVsZW1lbnQucGFyZW50cygnLnRvcC1iYXItcmlnaHQnKS5pcygnKicpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID0gJ3JpZ2h0JztcbiAgICAgIHN1YnMuYWRkQ2xhc3MoJ29wZW5zLWxlZnQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtcmlnaHQnKTtcbiAgICB9XG4gICAgdGhpcy5jaGFuZ2VkID0gZmFsc2U7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH07XG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgJGVsZW0uYWRkKCRlbGVtLnBhcmVudHNVbnRpbChfdGhpcy4kZWxlbWVudCwgYC4ke3BhckNsYXNzfWApKS5hdHRyKCdkYXRhLWlzLWNsaWNrJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3BlbiB8fCBoYXNUb3VjaCkge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdjbGljay56Zi5kcm9wZG93bm1lbnUgdG91Y2hzdGFydC56Zi5kcm9wZG93bm1lbnUnLCBoYW5kbGVDbGlja0ZuKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XG5cbiAgICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5kZWxheSk7XG4gICAgICAgICAgX3RoaXMuZGVsYXkgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51JykpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcbiAgICAgICAgaWYgKGhhc1N1YiAmJiBfdGhpcy5vcHRpb25zLmF1dG9jbG9zZSkge1xuICAgICAgICAgIGlmICgkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyAmJiBfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5kZWxheSk7XG4gICAgICAgICAgX3RoaXMuZGVsYXkgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuY2xvc2luZ1RpbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdrZXlkb3duLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbWVudCA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCAnW3JvbGU9XCJtZW51aXRlbVwiXScpLFxuICAgICAgICAgIGlzVGFiID0gX3RoaXMuJHRhYnMuaW5kZXgoJGVsZW1lbnQpID4gLTEsXG4gICAgICAgICAgJGVsZW1lbnRzID0gaXNUYWIgPyBfdGhpcy4kdGFicyA6ICRlbGVtZW50LnNpYmxpbmdzKCdsaScpLmFkZCgkZWxlbWVudCksXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAgICRuZXh0RWxlbWVudDtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoaSsxKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgbmV4dFNpYmxpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCEkZWxlbWVudC5pcygnOmxhc3QtY2hpbGQnKSkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICB9LCBwcmV2U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkcHJldkVsZW1lbnQuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9LCBvcGVuU3ViID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciAkc3ViID0gJGVsZW1lbnQuY2hpbGRyZW4oJ3VsLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKTtcbiAgICAgICAgaWYgKCRzdWIubGVuZ3RoKSB7XG4gICAgICAgICAgX3RoaXMuX3Nob3coJHN1Yik7XG4gICAgICAgICAgJGVsZW1lbnQuZmluZCgnbGkgPiBhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0gZWxzZSB7IHJldHVybjsgfVxuICAgICAgfSwgY2xvc2VTdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9pZiAoJGVsZW1lbnQuaXMoJzpmaXJzdC1jaGlsZCcpKSB7XG4gICAgICAgIHZhciBjbG9zZSA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XG4gICAgICAgIGNsb3NlLmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgX3RoaXMuX2hpZGUoY2xvc2UpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIC8vfVxuICAgICAgfTtcbiAgICAgIHZhciBmdW5jdGlvbnMgPSB7XG4gICAgICAgIG9wZW46IG9wZW5TdWIsXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5faGlkZShfdGhpcy4kZWxlbWVudCk7XG4gICAgICAgICAgX3RoaXMuJG1lbnVJdGVtcy5maW5kKCdhOmZpcnN0JykuZm9jdXMoKTsgLy8gZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKGlzVGFiKSB7XG4gICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5oYXNDbGFzcyhfdGhpcy5vcHRpb25zLnZlcnRpY2FsQ2xhc3MpKSB7IC8vIHZlcnRpY2FsIG1lbnVcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JykgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHsgLy8gaG9yaXpvbnRhbCBtZW51XG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHByZXZpb3VzOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgIGRvd246IG9wZW5TdWIsXG4gICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gbm90IHRhYnMgLT4gb25lIHN1YlxuICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JykgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICBwcmV2aW91czogY2xvc2VTdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duTWVudScsIGZ1bmN0aW9ucyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKVxuICAgICAgICAgLm9uKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgIHZhciAkbGluayA9IF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpO1xuICAgICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgIF90aGlzLl9oaWRlKCk7XG4gICAgICAgICAgICRib2R5Lm9mZignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGRyb3Bkb3duIHBhbmUsIGFuZCBjaGVja3MgZm9yIGNvbGxpc2lvbnMgZmlyc3QuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkc3ViIC0gdWwgZWxlbWVudCB0aGF0IGlzIGEgc3VibWVudSB0byBzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I3Nob3dcbiAgICovXG4gIF9zaG93KCRzdWIpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy4kdGFicy5pbmRleCh0aGlzLiR0YWJzLmZpbHRlcihmdW5jdGlvbihpLCBlbCkge1xuICAgICAgcmV0dXJuICQoZWwpLmZpbmQoJHN1YikubGVuZ3RoID4gMDtcbiAgICB9KSk7XG4gICAgdmFyICRzaWJzID0gJHN1Yi5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jykuc2libGluZ3MoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy5faGlkZSgkc2licywgaWR4KTtcbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5hZGRDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgdmFyIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICBpZiAoIWNsZWFyKSB7XG4gICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAnLXJpZ2h0JyA6ICctbGVmdCcsXG4gICAgICAgICAgJHBhcmVudExpID0gJHN1Yi5wYXJlbnQoJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucyR7b2xkQ2xhc3N9YCkuYWRkQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKTtcbiAgICAgIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICAgIGlmICghY2xlYXIpIHtcbiAgICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YCkuYWRkQ2xhc3MoJ29wZW5zLWlubmVyJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICcnKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykgeyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbmV3IGRyb3Bkb3duIHBhbmUgaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYuZHJvcGRvd25tZW51JywgWyRzdWJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyBhIHNpbmdsZSwgY3VycmVudGx5IG9wZW4gZHJvcGRvd24gcGFuZSwgaWYgcGFzc2VkIGEgcGFyYW1ldGVyLCBvdGhlcndpc2UsIGhpZGVzIGV2ZXJ5dGhpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIGhpZGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSAkdGFicyBjb2xsZWN0aW9uIHRvIGhpZGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oaWRlKCRlbGVtLCBpZHgpIHtcbiAgICB2YXIgJHRvQ2xvc2U7XG4gICAgaWYgKCRlbGVtICYmICRlbGVtLmxlbmd0aCkge1xuICAgICAgJHRvQ2xvc2UgPSAkZWxlbTtcbiAgICB9IGVsc2UgaWYgKGlkeCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJHRhYnMubm90KGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICAgIHJldHVybiBpID09PSBpZHg7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJGVsZW1lbnQ7XG4gICAgfVxuICAgIHZhciBzb21ldGhpbmdUb0Nsb3NlID0gJHRvQ2xvc2UuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIHx8ICR0b0Nsb3NlLmZpbmQoJy5pcy1hY3RpdmUnKS5sZW5ndGggPiAwO1xuXG4gICAgaWYgKHNvbWV0aGluZ1RvQ2xvc2UpIHtcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWFjdGl2ZScpLmFkZCgkdG9DbG9zZSkuYXR0cih7XG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICdkYXRhLWlzLWNsaWNrJzogZmFsc2VcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICAgJHRvQ2xvc2UuZmluZCgndWwuanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWVcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKTtcblxuICAgICAgaWYgKHRoaXMuY2hhbmdlZCB8fCAkdG9DbG9zZS5maW5kKCdvcGVucy1pbm5lcicpLmxlbmd0aCkge1xuICAgICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAncmlnaHQnIDogJ2xlZnQnO1xuICAgICAgICAkdG9DbG9zZS5maW5kKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZCgkdG9DbG9zZSlcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYG9wZW5zLWlubmVyIG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgb3BlbnMtJHtvbGRDbGFzc31gKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG9wZW4gbWVudXMgYXJlIGNsb3NlZC5cbiAgICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjaGlkZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd25tZW51JywgWyR0b0Nsb3NlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRtZW51SXRlbXMub2ZmKCcuemYuZHJvcGRvd25tZW51JykucmVtb3ZlQXR0cignZGF0YS1pcy1jbGljaycpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnaXMtcmlnaHQtYXJyb3cgaXMtbGVmdC1hcnJvdyBpcy1kb3duLWFycm93IG9wZW5zLXJpZ2h0IG9wZW5zLWxlZnQgb3BlbnMtaW5uZXInKTtcbiAgICAkKGRvY3VtZW50LmJvZHkpLm9mZignLnpmLmRyb3Bkb3dubWVudScpO1xuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdkcm9wZG93bicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5Ecm9wZG93bk1lbnUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBEaXNhbGxvd3MgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyBzdWJtZW51c1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlSG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIGF1dG9tYXRpY2FsbHkgY2xvc2Ugb24gYSBtb3VzZWxlYXZlIGV2ZW50LCBpZiBub3QgY2xpY2tlZCBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9jbG9zZTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBob3ZlckRlbGF5OiA1MCxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrT3BlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBjbG9zaW5nIGEgc3VibWVudSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuXG4gIGNsb3NpbmdUaW1lOiA1MDAsXG4gIC8qKlxuICAgKiBQb3NpdGlvbiBvZiB0aGUgbWVudSByZWxhdGl2ZSB0byB3aGF0IGRpcmVjdGlvbiB0aGUgc3VibWVudXMgc2hvdWxkIG9wZW4uIEhhbmRsZWQgYnkgSlMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2xlZnQnXG4gICAqL1xuICBhbGlnbm1lbnQ6ICdsZWZ0JyxcbiAgLyoqXG4gICAqIEFsbG93IGNsaWNrcyBvbiB0aGUgYm9keSB0byBjbG9zZSBhbnkgb3BlbiBzdWJtZW51cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHZlcnRpY2FsIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYHZlcnRpY2FsYC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3ZlcnRpY2FsJ1xuICAgKi9cbiAgdmVydGljYWxDbGFzczogJ3ZlcnRpY2FsJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gcmlnaHQtc2lkZSBvcmllbnRlZCBtZW51cywgRm91bmRhdGlvbiBkZWZhdWx0IGlzIGBhbGlnbi1yaWdodGAuIFVwZGF0ZSB0aGlzIGlmIHVzaW5nIHlvdXIgb3duIGNsYXNzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdhbGlnbi1yaWdodCdcbiAgICovXG4gIHJpZ2h0Q2xhc3M6ICdhbGlnbi1yaWdodCcsXG4gIC8qKlxuICAgKiBCb29sZWFuIHRvIGZvcmNlIG92ZXJpZGUgdGhlIGNsaWNraW5nIG9mIGxpbmtzIHRvIHBlcmZvcm0gZGVmYXVsdCBhY3Rpb24sIG9uIHNlY29uZCB0b3VjaCBldmVudCBmb3IgbW9iaWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBmb3JjZUZvbGxvdzogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyb3Bkb3duTWVudSwgJ0Ryb3Bkb3duTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRXF1YWxpemVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5lcXVhbGl6ZXJcbiAqL1xuXG5jbGFzcyBFcXVhbGl6ZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBFcXVhbGl6ZXIuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0VxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBFcXVhbGl6ZXIgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGVxSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtZXF1YWxpemVyJykgfHwgJyc7XG4gICAgdmFyICR3YXRjaGVkID0gdGhpcy4kZWxlbWVudC5maW5kKGBbZGF0YS1lcXVhbGl6ZXItd2F0Y2g9XCIke2VxSWR9XCJdYCk7XG5cbiAgICB0aGlzLiR3YXRjaGVkID0gJHdhdGNoZWQubGVuZ3RoID8gJHdhdGNoZWQgOiB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWVxdWFsaXplci13YXRjaF0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtcmVzaXplJywgKGVxSWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZXEnKSkpO1xuXG4gICAgdGhpcy5oYXNOZXN0ZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xuICAgIHRoaXMuaXNOZXN0ZWQgPSB0aGlzLiRlbGVtZW50LnBhcmVudHNVbnRpbChkb2N1bWVudC5ib2R5LCAnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgdGhpcy5fYmluZEhhbmRsZXIgPSB7XG4gICAgICBvblJlc2l6ZU1lQm91bmQ6IHRoaXMuX29uUmVzaXplTWUuYmluZCh0aGlzKSxcbiAgICAgIG9uUG9zdEVxdWFsaXplZEJvdW5kOiB0aGlzLl9vblBvc3RFcXVhbGl6ZWQuYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB2YXIgaW1ncyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyk7XG4gICAgdmFyIHRvb1NtYWxsO1xuICAgIGlmKHRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uKXtcbiAgICAgIHRvb1NtYWxsID0gdGhpcy5fY2hlY2tNUSgpO1xuICAgICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9jaGVja01RLmJpbmQodGhpcykpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgfVxuICAgIGlmKCh0b29TbWFsbCAhPT0gdW5kZWZpbmVkICYmIHRvb1NtYWxsID09PSBmYWxzZSkgfHwgdG9vU21hbGwgPT09IHVuZGVmaW5lZCl7XG4gICAgICBpZihpbWdzLmxlbmd0aCl7XG4gICAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoaW1ncywgdGhpcy5fcmVmbG93LmJpbmQodGhpcykpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuX3JlZmxvdygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycyBpZiB0aGUgYnJlYWtwb2ludCBpcyB0b28gc21hbGwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGF1c2VFdmVudHMoKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoe1xuICAgICAgJy56Zi5lcXVhbGl6ZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyByZXNpemVtZS56Zi50cmlnZ2VyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUmVzaXplTWUoZSkge1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIGZ1bmN0aW9uIHRvIGhhbmRsZSAkZWxlbWVudHMgcG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vblBvc3RFcXVhbGl6ZWQoZSkge1xuICAgIGlmKGUudGFyZ2V0ICE9PSB0aGlzLiRlbGVtZW50WzBdKXsgdGhpcy5fcmVmbG93KCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEVxdWFsaXplci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIGlmKHRoaXMuaGFzTmVzdGVkKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJywgdGhpcy5fYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmQpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZCk7XG4gICAgfVxuICAgIHRoaXMuaXNPbiA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQgdG8gdGhlIG1pbmltdW0gcmVxdWlyZWQgc2l6ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01RKCkge1xuICAgIHZhciB0b29TbWFsbCA9ICFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuZXF1YWxpemVPbik7XG4gICAgaWYodG9vU21hbGwpe1xuICAgICAgaWYodGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICB9XG4gICAgfWVsc2V7XG4gICAgICBpZighdGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0b29TbWFsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIG5vb3AgdmVyc2lvbiBmb3IgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tpbGxzd2l0Y2goKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEVxdWFsaXplciB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgaWYoIXRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uU3RhY2spe1xuICAgICAgaWYodGhpcy5faXNTdGFja2VkKCkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmVxdWFsaXplQnlSb3cpIHtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0c0J5Um93KHRoaXMuYXBwbHlIZWlnaHRCeVJvdy5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0cyh0aGlzLmFwcGx5SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYW51YWxseSBkZXRlcm1pbmVzIGlmIHRoZSBmaXJzdCAyIGVsZW1lbnRzIGFyZSAqTk9UKiBzdGFja2VkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2lzU3RhY2tlZCgpIHtcbiAgICByZXR1cm4gdGhpcy4kd2F0Y2hlZFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgIT09IHRoaXMuJHdhdGNoZWRbMV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqL1xuICBnZXRIZWlnaHRzKGNiKSB7XG4gICAgdmFyIGhlaWdodHMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgaGVpZ2h0cy5wdXNoKHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG4gICAgY2IoaGVpZ2h0cyk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKi9cbiAgZ2V0SGVpZ2h0c0J5Um93KGNiKSB7XG4gICAgdmFyIGxhc3RFbFRvcE9mZnNldCA9ICh0aGlzLiR3YXRjaGVkLmxlbmd0aCA/IHRoaXMuJHdhdGNoZWQuZmlyc3QoKS5vZmZzZXQoKS50b3AgOiAwKSxcbiAgICAgICAgZ3JvdXBzID0gW10sXG4gICAgICAgIGdyb3VwID0gMDtcbiAgICAvL2dyb3VwIGJ5IFJvd1xuICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgLy9tYXliZSBjb3VsZCB1c2UgdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRUb3BcbiAgICAgIHZhciBlbE9mZnNldFRvcCA9ICQodGhpcy4kd2F0Y2hlZFtpXSkub2Zmc2V0KCkudG9wO1xuICAgICAgaWYgKGVsT2Zmc2V0VG9wIT1sYXN0RWxUb3BPZmZzZXQpIHtcbiAgICAgICAgZ3JvdXArKztcbiAgICAgICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgICAgICBsYXN0RWxUb3BPZmZzZXQ9ZWxPZmZzZXRUb3A7XG4gICAgICB9XG4gICAgICBncm91cHNbZ3JvdXBdLnB1c2goW3RoaXMuJHdhdGNoZWRbaV0sdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHRdKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMCwgbG4gPSBncm91cHMubGVuZ3RoOyBqIDwgbG47IGorKykge1xuICAgICAgdmFyIGhlaWdodHMgPSAkKGdyb3Vwc1tqXSkubWFwKGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzWzFdOyB9KS5nZXQoKTtcbiAgICAgIHZhciBtYXggICAgICAgICA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgICAgZ3JvdXBzW2pdLnB1c2gobWF4KTtcbiAgICB9XG4gICAgY2IoZ3JvdXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdFxuICAgKiBAcGFyYW0ge2FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0KGhlaWdodHMpIHtcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcblxuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCBtYXgpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3QgYnkgcm93XG4gICAqIEBwYXJhbSB7YXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRSb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkUm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHRCeVJvdyhncm91cHMpIHtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZ3JvdXBzLmxlbmd0aDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgdmFyIGdyb3Vwc0lMZW5ndGggPSBncm91cHNbaV0ubGVuZ3RoLFxuICAgICAgICAgIG1heCA9IGdyb3Vwc1tpXVtncm91cHNJTGVuZ3RoIC0gMV07XG4gICAgICBpZiAoZ3JvdXBzSUxlbmd0aDw9Mikge1xuICAgICAgICAkKGdyb3Vwc1tpXVswXVswXSkuY3NzKHsnaGVpZ2h0JzonYXV0byd9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgcGVyIHJvdyBhcmUgYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkUm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICAgIGZvciAodmFyIGogPSAwLCBsZW5KID0gKGdyb3Vwc0lMZW5ndGgtMSk7IGogPCBsZW5KIDsgaisrKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldW2pdWzBdKS5jc3MoeydoZWlnaHQnOm1heH0pO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBwZXIgcm93IGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkUm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRXF1YWxpemVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gd2hlbiBzdGFja2VkIG9uIHNtYWxsZXIgc2NyZWVucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBlcXVhbGl6ZU9uU3RhY2s6IHRydWUsXG4gIC8qKlxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiByb3cgYnkgcm93LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBlcXVhbGl6ZUJ5Um93OiBmYWxzZSxcbiAgLyoqXG4gICAqIFN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1pbmltdW0gYnJlYWtwb2ludCBzaXplIHRoZSBwbHVnaW4gc2hvdWxkIGVxdWFsaXplIGhlaWdodHMgb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcbiAgICovXG4gIGVxdWFsaXplT246ICcnXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRXF1YWxpemVyLCAnRXF1YWxpemVyJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBJbnRlcmNoYW5nZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uaW50ZXJjaGFuZ2VcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKi9cblxuY2xhc3MgSW50ZXJjaGFuZ2Uge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBJbnRlcmNoYW5nZS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgSW50ZXJjaGFuZ2UuZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMucnVsZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gJyc7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdJbnRlcmNoYW5nZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBJbnRlcmNoYW5nZSBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgaW50ZXJjaGFuZ2UgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLl9hZGRCcmVha3BvaW50cygpO1xuICAgIHRoaXMuX2dlbmVyYXRlUnVsZXMoKTtcbiAgICB0aGlzLl9yZWZsb3coKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEludGVyY2hhbmdlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYuaW50ZXJjaGFuZ2UnLCBGb3VuZGF0aW9uLnV0aWwudGhyb3R0bGUodGhpcy5fcmVmbG93LmJpbmQodGhpcyksIDUwKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgSW50ZXJjaGFuZ2UgdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB2YXIgbWF0Y2g7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlLCBidXQgb25seSBzYXZlIHRoZSBsYXN0IG1hdGNoXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBpZih0aGlzLnJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBydWxlID0gdGhpcy5ydWxlc1tpXTtcblxuICAgICAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEocnVsZS5xdWVyeSkubWF0Y2hlcykge1xuICAgICAgICAgIG1hdGNoID0gcnVsZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXRjaCkge1xuICAgICAgdGhpcy5yZXBsYWNlKG1hdGNoLnBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBGb3VuZGF0aW9uIGJyZWFrcG9pbnRzIGFuZCBhZGRzIHRoZW0gdG8gdGhlIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFUyBvYmplY3QuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJyZWFrcG9pbnRzKCkge1xuICAgIGZvciAodmFyIGkgaW4gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSBGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllc1tpXTtcbiAgICAgICAgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5Lm5hbWVdID0gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgSW50ZXJjaGFuZ2UgZWxlbWVudCBmb3IgdGhlIHByb3ZpZGVkIG1lZGlhIHF1ZXJ5ICsgY29udGVudCBwYWlyaW5nc1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRoYXQgaXMgYW4gSW50ZXJjaGFuZ2UgaW5zdGFuY2VcbiAgICogQHJldHVybnMge0FycmF5fSBzY2VuYXJpb3MgLSBBcnJheSBvZiBvYmplY3RzIHRoYXQgaGF2ZSAnbXEnIGFuZCAncGF0aCcga2V5cyB3aXRoIGNvcnJlc3BvbmRpbmcga2V5c1xuICAgKi9cbiAgX2dlbmVyYXRlUnVsZXMoZWxlbWVudCkge1xuICAgIHZhciBydWxlc0xpc3QgPSBbXTtcbiAgICB2YXIgcnVsZXM7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJ1bGVzKSB7XG4gICAgICBydWxlcyA9IHRoaXMub3B0aW9ucy5ydWxlcztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBydWxlcyA9IHRoaXMuJGVsZW1lbnQuZGF0YSgnaW50ZXJjaGFuZ2UnKS5tYXRjaCgvXFxbLio/XFxdL2cpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgaW4gcnVsZXMpIHtcbiAgICAgIGlmKHJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBydWxlID0gcnVsZXNbaV0uc2xpY2UoMSwgLTEpLnNwbGl0KCcsICcpO1xuICAgICAgICB2YXIgcGF0aCA9IHJ1bGUuc2xpY2UoMCwgLTEpLmpvaW4oJycpO1xuICAgICAgICB2YXIgcXVlcnkgPSBydWxlW3J1bGUubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgaWYgKEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeV0pIHtcbiAgICAgICAgICBxdWVyeSA9IEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeV07XG4gICAgICAgIH1cblxuICAgICAgICBydWxlc0xpc3QucHVzaCh7XG4gICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICBxdWVyeTogcXVlcnlcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5ydWxlcyA9IHJ1bGVzTGlzdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIGBzcmNgIHByb3BlcnR5IG9mIGFuIGltYWdlLCBvciBjaGFuZ2UgdGhlIEhUTUwgb2YgYSBjb250YWluZXIsIHRvIHRoZSBzcGVjaWZpZWQgcGF0aC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIC0gUGF0aCB0byB0aGUgaW1hZ2Ugb3IgSFRNTCBwYXJ0aWFsLlxuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcbiAgICovXG4gIHJlcGxhY2UocGF0aCkge1xuICAgIGlmICh0aGlzLmN1cnJlbnRQYXRoID09PSBwYXRoKSByZXR1cm47XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICB0cmlnZ2VyID0gJ3JlcGxhY2VkLnpmLmludGVyY2hhbmdlJztcblxuICAgIC8vIFJlcGxhY2luZyBpbWFnZXNcbiAgICBpZiAodGhpcy4kZWxlbWVudFswXS5ub2RlTmFtZSA9PT0gJ0lNRycpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignc3JjJywgcGF0aCkubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuY3VycmVudFBhdGggPSBwYXRoO1xuICAgICAgfSlcbiAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNpbmcgYmFja2dyb3VuZCBpbWFnZXNcbiAgICBlbHNlIGlmIChwYXRoLm1hdGNoKC9cXC4oZ2lmfGpwZ3xqcGVnfHBuZ3xzdmd8dGlmZikoWz8jXS4qKT8vaSkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHsgJ2JhY2tncm91bmQtaW1hZ2UnOiAndXJsKCcrcGF0aCsnKScgfSlcbiAgICAgICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIEhUTUxcbiAgICBlbHNlIHtcbiAgICAgICQuZ2V0KHBhdGgsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIF90aGlzLiRlbGVtZW50Lmh0bWwocmVzcG9uc2UpXG4gICAgICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgICAgICQocmVzcG9uc2UpLmZvdW5kYXRpb24oKTtcbiAgICAgICAgX3RoaXMuY3VycmVudFBhdGggPSBwYXRoO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiBjb250ZW50IGluIGFuIEludGVyY2hhbmdlIGVsZW1lbnQgaXMgZG9uZSBiZWluZyBsb2FkZWQuXG4gICAgICogQGV2ZW50IEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAgICovXG4gICAgLy8gdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGludGVyY2hhbmdlLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgLy9UT0RPIHRoaXMuXG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuSW50ZXJjaGFuZ2UuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBSdWxlcyB0byBiZSBhcHBsaWVkIHRvIEludGVyY2hhbmdlIGVsZW1lbnRzLiBTZXQgd2l0aCB0aGUgYGRhdGEtaW50ZXJjaGFuZ2VgIGFycmF5IG5vdGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqL1xuICBydWxlczogbnVsbFxufTtcblxuSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTID0ge1xuICAnbGFuZHNjYXBlJzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgJ3BvcnRyYWl0JzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICAncmV0aW5hJzogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksIG9ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihJbnRlcmNoYW5nZSwgJ0ludGVyY2hhbmdlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNYWdlbGxhbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubWFnZWxsYW5cbiAqL1xuXG5jbGFzcyBNYWdlbGxhbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIE1hZ2VsbGFuLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIE1hZ2VsbGFuI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgTWFnZWxsYW4uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ01hZ2VsbGFuJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2VsbGFuIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnbWFnZWxsYW4nKTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJHRhcmdldHMgPSAkKCdbZGF0YS1tYWdlbGxhbi10YXJnZXRdJyk7XG4gICAgdGhpcy4kbGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXG4gICAgICAnZGF0YS1zY3JvbGwnOiBpZCxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgdGhpcy4kYWN0aXZlID0gJCgpO1xuICAgIHRoaXMuc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0LCAxMCk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIGFuIGFycmF5IG9mIHBpeGVsIHZhbHVlcyB0aGF0IGFyZSB0aGUgZGVtYXJjYXRpb24gbGluZXMgYmV0d2VlbiBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gICAqIENhbiBiZSBpbnZva2VkIGlmIG5ldyBlbGVtZW50cyBhcmUgYWRkZWQgb3IgdGhlIHNpemUgb2YgYSBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGNhbGNQb2ludHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgYm9keSA9IGRvY3VtZW50LmJvZHksXG4gICAgICAgIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHRoaXMud2luSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heCh3aW5kb3cuaW5uZXJIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0KSk7XG4gICAgdGhpcy5kb2NIZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KGJvZHkuc2Nyb2xsSGVpZ2h0LCBib2R5Lm9mZnNldEhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQsIGh0bWwuc2Nyb2xsSGVpZ2h0LCBodG1sLm9mZnNldEhlaWdodCkpO1xuXG4gICAgdGhpcy4kdGFyZ2V0cy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJHRhciA9ICQodGhpcyksXG4gICAgICAgICAgcHQgPSBNYXRoLnJvdW5kKCR0YXIub2Zmc2V0KCkudG9wIC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQpO1xuICAgICAgJHRhci50YXJnZXRQb2ludCA9IHB0O1xuICAgICAgX3RoaXMucG9pbnRzLnB1c2gocHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgTWFnZWxsYW4uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgICRib2R5ID0gJCgnaHRtbCwgYm9keScpLFxuICAgICAgICBvcHRzID0ge1xuICAgICAgICAgIGR1cmF0aW9uOiBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgIGVhc2luZzogICBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZ1xuICAgICAgICB9O1xuICAgICQod2luZG93KS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpe1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICAgIGlmKGxvY2F0aW9uLmhhc2gpe1xuICAgICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGxvY2F0aW9uLmhhc2gpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfdGhpcy5jYWxjUG9pbnRzKCk7XG4gICAgICBfdGhpcy5fdXBkYXRlQWN0aXZlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5yZWZsb3cuYmluZCh0aGlzKSxcbiAgICAgICdzY3JvbGxtZS56Zi50cmlnZ2VyJzogdGhpcy5fdXBkYXRlQWN0aXZlLmJpbmQodGhpcylcbiAgICB9KS5vbignY2xpY2suemYubWFnZWxsYW4nLCAnYVtocmVmXj1cIiNcIl0nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGFycml2YWwgICA9IHRoaXMuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGFycml2YWwpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRvIHNjcm9sbCB0byBhIGdpdmVuIGxvY2F0aW9uIG9uIHRoZSBwYWdlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jIC0gYSBwcm9wZXJseSBmb3JtYXR0ZWQgalF1ZXJ5IGlkIHNlbGVjdG9yLiBFeGFtcGxlOiAnI2ZvbydcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzY3JvbGxUb0xvYyhsb2MpIHtcbiAgICB2YXIgc2Nyb2xsUG9zID0gTWF0aC5yb3VuZCgkKGxvYykub2Zmc2V0KCkudG9wIC0gdGhpcy5vcHRpb25zLnRocmVzaG9sZCAvIDIgLSB0aGlzLm9wdGlvbnMuYmFyT2Zmc2V0KTtcblxuICAgICQoJ2h0bWwsIGJvZHknKS5zdG9wKHRydWUpLmFuaW1hdGUoeyBzY3JvbGxUb3A6IHNjcm9sbFBvcyB9LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sIHRoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIE1hZ2VsbGFuIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJlZmxvdygpIHtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcbiAgICB0aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIGFuIGFjdGl2ZSBsb2NhdGlvbiBsaW5rLCBhbmQgdXBkYXRlcyB0aGUgdXJsIGhhc2ggZm9yIHRoZSBwYWdlLCBpZiBkZWVwTGlua2luZyBlbmFibGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIE1hZ2VsbGFuI3VwZGF0ZVxuICAgKi9cbiAgX3VwZGF0ZUFjdGl2ZSgvKmV2dCwgZWxlbSwgc2Nyb2xsUG9zKi8pIHtcbiAgICB2YXIgd2luUG9zID0gLypzY3JvbGxQb3MgfHwqLyBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKSxcbiAgICAgICAgY3VySWR4O1xuXG4gICAgaWYod2luUG9zICsgdGhpcy53aW5IZWlnaHQgPT09IHRoaXMuZG9jSGVpZ2h0KXsgY3VySWR4ID0gdGhpcy5wb2ludHMubGVuZ3RoIC0gMTsgfVxuICAgIGVsc2UgaWYod2luUG9zIDwgdGhpcy5wb2ludHNbMF0peyBjdXJJZHggPSAwOyB9XG4gICAgZWxzZXtcbiAgICAgIHZhciBpc0Rvd24gPSB0aGlzLnNjcm9sbFBvcyA8IHdpblBvcyxcbiAgICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICAgY3VyVmlzaWJsZSA9IHRoaXMucG9pbnRzLmZpbHRlcihmdW5jdGlvbihwLCBpKXtcbiAgICAgICAgICAgIHJldHVybiBpc0Rvd24gPyBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgPD0gd2luUG9zIDogcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQgPD0gd2luUG9zO1xuICAgICAgICAgIH0pO1xuICAgICAgY3VySWR4ID0gY3VyVmlzaWJsZS5sZW5ndGggPyBjdXJWaXNpYmxlLmxlbmd0aCAtIDEgOiAwO1xuICAgIH1cblxuICAgIHRoaXMuJGFjdGl2ZS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuICAgIHRoaXMuJGFjdGl2ZSA9IHRoaXMuJGxpbmtzLmVxKGN1cklkeCkuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIGlmKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSl7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zY3JvbGxQb3MgPSB3aW5Qb3M7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiBtYWdlbGxhbiBpcyBmaW5pc2hlZCB1cGRhdGluZyB0byB0aGUgbmV3IGFjdGl2ZSBlbGVtZW50LlxuICAgICAqIEBldmVudCBNYWdlbGxhbiN1cGRhdGVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwZGF0ZS56Zi5tYWdlbGxhbicsIFt0aGlzLiRhY3RpdmVdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBNYWdlbGxhbiBhbmQgcmVzZXRzIHRoZSB1cmwgb2YgdGhlIHdpbmRvdy5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYubWFnZWxsYW4nKVxuICAgICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzfWApLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgdmFyIGhhc2ggPSB0aGlzLiRhY3RpdmVbMF0uZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaC5yZXBsYWNlKGhhc2gsICcnKTtcbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuTWFnZWxsYW4uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSwgaW4gbXMsIHRoZSBhbmltYXRlZCBzY3JvbGxpbmcgc2hvdWxkIHRha2UgYmV0d2VlbiBsb2NhdGlvbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxuICAvKipcbiAgICogQW5pbWF0aW9uIHN0eWxlIHRvIHVzZSB3aGVuIHNjcm9sbGluZyBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZWFzZS1pbi1vdXQnXG4gICAqL1xuICBhbmltYXRpb25FYXNpbmc6ICdsaW5lYXInLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyB0byB1c2UgYXMgYSBtYXJrZXIgZm9yIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIHRocmVzaG9sZDogNTAsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBhY3RpdmUgbG9jYXRpb25zIGxpbmsgb24gdGhlIG1hZ2VsbGFuIGNvbnRhaW5lci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnYWN0aXZlJ1xuICAgKi9cbiAgYWN0aXZlQ2xhc3M6ICdhY3RpdmUnLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBzY3JpcHQgdG8gbWFuaXB1bGF0ZSB0aGUgdXJsIG9mIHRoZSBjdXJyZW50IHBhZ2UsIGFuZCBpZiBzdXBwb3J0ZWQsIGFsdGVyIHRoZSBoaXN0b3J5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGRlZXBMaW5raW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gb2Zmc2V0IHRoZSBzY3JvbGwgb2YgdGhlIHBhZ2Ugb24gaXRlbSBjbGljayBpZiB1c2luZyBhIHN0aWNreSBuYXYgYmFyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1XG4gICAqL1xuICBiYXJPZmZzZXQ6IDBcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE1hZ2VsbGFuLCAnTWFnZWxsYW4nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE9yYml0IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vcmJpdFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50b3VjaFxuICovXG5cbmNsYXNzIE9yYml0IHtcbiAgLyoqXG4gICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvcmJpdCBjYXJvdXNlbC5cbiAgKiBAY2xhc3NcbiAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIE9yYml0IENhcm91c2VsLlxuICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIE9yYml0LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPcmJpdCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09yYml0Jywge1xuICAgICAgJ2x0cic6IHtcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIH0sXG4gICAgICAncnRsJzoge1xuICAgICAgICAnQVJST1dfTEVGVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ3ByZXZpb3VzJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMsIHNldHRpbmcgYXR0cmlidXRlcywgYW5kIHN0YXJ0aW5nIHRoZSBhbmltYXRpb24uXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kd3JhcHBlciA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzfWApO1xuICAgIHRoaXMuJHNsaWRlcyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCk7XG4gICAgdmFyICRpbWFnZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2ltZycpLFxuICAgIGluaXRBY3RpdmUgPSB0aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJyk7XG5cbiAgICBpZiAoIWluaXRBY3RpdmUubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRzbGlkZXMuZXEoMCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZU1VSSkge1xuICAgICAgdGhpcy4kc2xpZGVzLmFkZENsYXNzKCduby1tb3Rpb251aScpO1xuICAgIH1cblxuICAgIGlmICgkaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCgkaW1hZ2VzLCB0aGlzLl9wcmVwYXJlRm9yT3JiaXQuYmluZCh0aGlzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ByZXBhcmVGb3JPcmJpdCgpOy8vaGVoZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgdGhpcy5fbG9hZEJ1bGxldHMoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgdGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMuZ2VvU3luYygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzaWJsZSkgeyAvLyBhbGxvdyB3cmFwcGVyIHRvIGJlIGZvY3VzYWJsZSB0byBlbmFibGUgYXJyb3cgbmF2aWdhdGlvblxuICAgICAgdGhpcy4kd3JhcHBlci5hdHRyKCd0YWJpbmRleCcsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENyZWF0ZXMgYSBqUXVlcnkgY29sbGVjdGlvbiBvZiBidWxsZXRzLCBpZiB0aGV5IGFyZSBiZWluZyB1c2VkLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9sb2FkQnVsbGV0cygpIHtcbiAgICB0aGlzLiRidWxsZXRzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApLmZpbmQoJ2J1dHRvbicpO1xuICB9XG5cbiAgLyoqXG4gICogU2V0cyBhIGB0aW1lcmAgb2JqZWN0IG9uIHRoZSBvcmJpdCwgYW5kIHN0YXJ0cyB0aGUgY291bnRlciBmb3IgdGhlIG5leHQgc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICovXG4gIGdlb1N5bmMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRpbWVyID0gbmV3IEZvdW5kYXRpb24uVGltZXIoXG4gICAgICB0aGlzLiRlbGVtZW50LFxuICAgICAge1xuICAgICAgICBkdXJhdGlvbjogdGhpcy5vcHRpb25zLnRpbWVyRGVsYXksXG4gICAgICAgIGluZmluaXRlOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgIH0pO1xuICAgIHRoaXMudGltZXIuc3RhcnQoKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgd3JhcHBlciBhbmQgc2xpZGUgaGVpZ2h0cyBmb3IgdGhlIG9yYml0LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9wcmVwYXJlRm9yT3JiaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl9zZXRXcmFwcGVySGVpZ2h0KGZ1bmN0aW9uKG1heCl7XG4gICAgICBfdGhpcy5fc2V0U2xpZGVIZWlnaHQobWF4KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIENhbHVsYXRlcyB0aGUgaGVpZ2h0IG9mIGVhY2ggc2xpZGUgaW4gdGhlIGNvbGxlY3Rpb24sIGFuZCB1c2VzIHRoZSB0YWxsZXN0IG9uZSBmb3IgdGhlIHdyYXBwZXIgaGVpZ2h0LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgd2hlbiBjb21wbGV0ZS5cbiAgKi9cbiAgX3NldFdyYXBwZXJIZWlnaHQoY2IpIHsvL3Jld3JpdGUgdGhpcyB0byBgZm9yYCBsb29wXG4gICAgdmFyIG1heCA9IDAsIHRlbXAsIGNvdW50ZXIgPSAwO1xuXG4gICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB0ZW1wID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICAkKHRoaXMpLmF0dHIoJ2RhdGEtc2xpZGUnLCBjb3VudGVyKTtcblxuICAgICAgaWYgKGNvdW50ZXIpIHsvL2lmIG5vdCB0aGUgZmlyc3Qgc2xpZGUsIHNldCBjc3MgcG9zaXRpb24gYW5kIGRpc3BsYXkgcHJvcGVydHlcbiAgICAgICAgJCh0aGlzKS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ25vbmUnfSk7XG4gICAgICB9XG4gICAgICBtYXggPSB0ZW1wID4gbWF4ID8gdGVtcCA6IG1heDtcbiAgICAgIGNvdW50ZXIrKztcbiAgICB9KTtcblxuICAgIGlmIChjb3VudGVyID09PSB0aGlzLiRzbGlkZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLiR3cmFwcGVyLmNzcyh7J2hlaWdodCc6IG1heH0pOyAvL29ubHkgY2hhbmdlIHRoZSB3cmFwcGVyIGhlaWdodCBwcm9wZXJ0eSBvbmNlLlxuICAgICAgY2IobWF4KTsgLy9maXJlIGNhbGxiYWNrIHdpdGggbWF4IGhlaWdodCBkaW1lbnNpb24uXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogU2V0cyB0aGUgbWF4LWhlaWdodCBvZiBlYWNoIHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9zZXRTbGlkZUhlaWdodChoZWlnaHQpIHtcbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykuY3NzKCdtYXgtaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGJhc2ljYWxseSBldmVyeXRoaW5nIHdpdGhpbiB0aGUgZWxlbWVudC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgIC8vKipOb3cgdXNpbmcgY3VzdG9tIGV2ZW50IC0gdGhhbmtzIHRvOioqXG4gICAgLy8qKiAgICAgIFlvaGFpIEFyYXJhdCBvZiBUb3JvbnRvICAgICAgKipcbiAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgIGlmICh0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnN3aXBlKSB7XG4gICAgICAgIHRoaXMuJHNsaWRlcy5vZmYoJ3N3aXBlbGVmdC56Zi5vcmJpdCBzd2lwZXJpZ2h0LnpmLm9yYml0JylcbiAgICAgICAgLm9uKCdzd2lwZWxlZnQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgIH0pLm9uKCdzd2lwZXJpZ2h0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5KSB7XG4gICAgICAgIHRoaXMuJHNsaWRlcy5vbignY2xpY2suemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nLCBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gICAgICAgICAgX3RoaXMudGltZXJbX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyAncGF1c2UnIDogJ3N0YXJ0J10oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXVzZU9uSG92ZXIpIHtcbiAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWVudGVyLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy50aW1lci5wYXVzZSgpO1xuICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIV90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpKSB7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5uYXZCdXR0b25zKSB7XG4gICAgICAgIHZhciAkY29udHJvbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5uZXh0Q2xhc3N9LCAuJHt0aGlzLm9wdGlvbnMucHJldkNsYXNzfWApO1xuICAgICAgICAkY29udHJvbHMuYXR0cigndGFiaW5kZXgnLCAwKVxuICAgICAgICAvL2Fsc28gbmVlZCB0byBoYW5kbGUgZW50ZXIvcmV0dXJuIGFuZCBzcGFjZWJhciBrZXkgcHJlc3Nlc1xuICAgICAgICAub24oJ2NsaWNrLnpmLm9yYml0IHRvdWNoZW5kLnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG5cdCAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKCQodGhpcykuaGFzQ2xhc3MoX3RoaXMub3B0aW9ucy5uZXh0Q2xhc3MpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICB0aGlzLiRidWxsZXRzLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgvaXMtYWN0aXZlL2cudGVzdCh0aGlzLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9Ly9pZiB0aGlzIGlzIGFjdGl2ZSwga2ljayBvdXQgb2YgZnVuY3Rpb24uXG4gICAgICAgICAgdmFyIGlkeCA9ICQodGhpcykuZGF0YSgnc2xpZGUnKSxcbiAgICAgICAgICBsdHIgPSBpZHggPiBfdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgJHNsaWRlID0gX3RoaXMuJHNsaWRlcy5lcShpZHgpO1xuXG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUobHRyLCAkc2xpZGUsIGlkeCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLiR3cmFwcGVyLmFkZCh0aGlzLiRidWxsZXRzKS5vbigna2V5ZG93bi56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnT3JiaXQnLCB7XG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGZhbHNlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkgeyAvLyBpZiBidWxsZXQgaXMgZm9jdXNlZCwgbWFrZSBzdXJlIGZvY3VzIG1vdmVzXG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaXMoX3RoaXMuJGJ1bGxldHMpKSB7XG4gICAgICAgICAgICAgIF90aGlzLiRidWxsZXRzLmZpbHRlcignLmlzLWFjdGl2ZScpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENoYW5nZXMgdGhlIGN1cnJlbnQgc2xpZGUgdG8gYSBuZXcgb25lLlxuICAqIEBmdW5jdGlvblxuICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNMVFIgLSBmbGFnIGlmIHRoZSBzbGlkZSBzaG91bGQgbW92ZSBsZWZ0IHRvIHJpZ2h0LlxuICAqIEBwYXJhbSB7alF1ZXJ5fSBjaG9zZW5TbGlkZSAtIHRoZSBqUXVlcnkgZWxlbWVudCBvZiB0aGUgc2xpZGUgdG8gc2hvdyBuZXh0LCBpZiBvbmUgaXMgc2VsZWN0ZWQuXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgbmV3IHNsaWRlIGluIGl0cyBjb2xsZWN0aW9uLCBpZiBvbmUgY2hvc2VuLlxuICAqIEBmaXJlcyBPcmJpdCNzbGlkZWNoYW5nZVxuICAqL1xuICBjaGFuZ2VTbGlkZShpc0xUUiwgY2hvc2VuU2xpZGUsIGlkeCkge1xuICAgIHZhciAkY3VyU2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZXEoMCk7XG5cbiAgICBpZiAoL211aS9nLnRlc3QoJGN1clNsaWRlWzBdLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9IC8vaWYgdGhlIHNsaWRlIGlzIGN1cnJlbnRseSBhbmltYXRpbmcsIGtpY2sgb3V0IG9mIHRoZSBmdW5jdGlvblxuXG4gICAgdmFyICRmaXJzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmZpcnN0KCksXG4gICAgJGxhc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5sYXN0KCksXG4gICAgZGlySW4gPSBpc0xUUiA/ICdSaWdodCcgOiAnTGVmdCcsXG4gICAgZGlyT3V0ID0gaXNMVFIgPyAnTGVmdCcgOiAnUmlnaHQnLFxuICAgIF90aGlzID0gdGhpcyxcbiAgICAkbmV3U2xpZGU7XG5cbiAgICBpZiAoIWNob3NlblNsaWRlKSB7IC8vbW9zdCBvZiB0aGUgdGltZSwgdGhpcyB3aWxsIGJlIGF1dG8gcGxheWVkIG9yIGNsaWNrZWQgZnJvbSB0aGUgbmF2QnV0dG9ucy5cbiAgICAgICRuZXdTbGlkZSA9IGlzTFRSID8gLy9pZiB3cmFwcGluZyBlbmFibGVkLCBjaGVjayB0byBzZWUgaWYgdGhlcmUgaXMgYSBgbmV4dGAgb3IgYHByZXZgIHNpYmxpbmcsIGlmIG5vdCwgc2VsZWN0IHRoZSBmaXJzdCBvciBsYXN0IHNsaWRlIHRvIGZpbGwgaW4uIGlmIHdyYXBwaW5nIG5vdCBlbmFibGVkLCBhdHRlbXB0IHRvIHNlbGVjdCBgbmV4dGAgb3IgYHByZXZgLCBpZiB0aGVyZSdzIG5vdGhpbmcgdGhlcmUsIHRoZSBmdW5jdGlvbiB3aWxsIGtpY2sgb3V0IG9uIG5leHQgc3RlcC4gQ1JBWlkgTkVTVEVEIFRFUk5BUklFUyEhISEhXG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkZmlyc3RTbGlkZSA6ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSkvL3BpY2sgbmV4dCBzbGlkZSBpZiBtb3ZpbmcgbGVmdCB0byByaWdodFxuICAgICAgOlxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGxhc3RTbGlkZSA6ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSk7Ly9waWNrIHByZXYgc2xpZGUgaWYgbW92aW5nIHJpZ2h0IHRvIGxlZnRcbiAgICB9IGVsc2Uge1xuICAgICAgJG5ld1NsaWRlID0gY2hvc2VuU2xpZGU7XG4gICAgfVxuXG4gICAgaWYgKCRuZXdTbGlkZS5sZW5ndGgpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICBpZHggPSBpZHggfHwgdGhpcy4kc2xpZGVzLmluZGV4KCRuZXdTbGlkZSk7IC8vZ3JhYiBpbmRleCB0byB1cGRhdGUgYnVsbGV0c1xuICAgICAgICB0aGlzLl91cGRhdGVCdWxsZXRzKGlkeCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudXNlTVVJKSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbihcbiAgICAgICAgICAkbmV3U2xpZGUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmNzcyh7J3Bvc2l0aW9uJzogJ2Fic29sdXRlJywgJ3RvcCc6IDB9KSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1JbkZyb20ke2RpcklufWBdLFxuICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkbmV3U2xpZGUuY3NzKHsncG9zaXRpb24nOiAncmVsYXRpdmUnLCAnZGlzcGxheSc6ICdibG9jayd9KVxuICAgICAgICAgICAgLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dChcbiAgICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbU91dFRvJHtkaXJPdXR9YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKTtcbiAgICAgICAgICAgIGlmKF90aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgIV90aGlzLnRpbWVyLmlzUGF1c2VkKXtcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9kbyBzdHVmZj9cbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWluJykucmVtb3ZlQXR0cignYXJpYS1saXZlJykuaGlkZSgpO1xuICAgICAgICAkbmV3U2xpZGUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKS5zaG93KCk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgIXRoaXMudGltZXIuaXNQYXVzZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIC8qKlxuICAgICogVHJpZ2dlcnMgd2hlbiB0aGUgc2xpZGUgaGFzIGZpbmlzaGVkIGFuaW1hdGluZyBpbi5cbiAgICAqIEBldmVudCBPcmJpdCNzbGlkZWNoYW5nZVxuICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3NsaWRlY2hhbmdlLnpmLm9yYml0JywgWyRuZXdTbGlkZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFVwZGF0ZXMgdGhlIGFjdGl2ZSBzdGF0ZSBvZiB0aGUgYnVsbGV0cywgaWYgZGlzcGxheWVkLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBzbGlkZS5cbiAgKi9cbiAgX3VwZGF0ZUJ1bGxldHMoaWR4KSB7XG4gICAgdmFyICRvbGRCdWxsZXQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YClcbiAgICAuZmluZCgnLmlzLWFjdGl2ZScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKS5ibHVyKCksXG4gICAgc3BhbiA9ICRvbGRCdWxsZXQuZmluZCgnc3BhbjpsYXN0JykuZGV0YWNoKCksXG4gICAgJG5ld0J1bGxldCA9IHRoaXMuJGJ1bGxldHMuZXEoaWR4KS5hZGRDbGFzcygnaXMtYWN0aXZlJykuYXBwZW5kKHNwYW4pO1xuICB9XG5cbiAgLyoqXG4gICogRGVzdHJveXMgdGhlIGNhcm91c2VsIGFuZCBoaWRlcyB0aGUgZWxlbWVudC5cbiAgKiBAZnVuY3Rpb25cbiAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLm9yYml0JykuZmluZCgnKicpLm9mZignLnpmLm9yYml0JykuZW5kKCkuaGlkZSgpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5PcmJpdC5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICogVGVsbHMgdGhlIEpTIHRvIGxvb2sgZm9yIGFuZCBsb2FkQnVsbGV0cy5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBidWxsZXRzOiB0cnVlLFxuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gYXBwbHkgZXZlbnQgbGlzdGVuZXJzIHRvIG5hdiBidXR0b25zXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgbmF2QnV0dG9uczogdHJ1ZSxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tcmlnaHQnXG4gICovXG4gIGFuaW1JbkZyb21SaWdodDogJ3NsaWRlLWluLXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LXJpZ2h0J1xuICAqL1xuICBhbmltT3V0VG9SaWdodDogJ3NsaWRlLW91dC1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLWluLWxlZnQnXG4gICpcbiAgKi9cbiAgYW5pbUluRnJvbUxlZnQ6ICdzbGlkZS1pbi1sZWZ0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LWxlZnQnXG4gICovXG4gIGFuaW1PdXRUb0xlZnQ6ICdzbGlkZS1vdXQtbGVmdCcsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBhdXRvbWF0aWNhbGx5IGFuaW1hdGUgb24gcGFnZSBsb2FkLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGF1dG9QbGF5OiB0cnVlLFxuICAvKipcbiAgKiBBbW91bnQgb2YgdGltZSwgaW4gbXMsIGJldHdlZW4gc2xpZGUgdHJhbnNpdGlvbnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgNTAwMFxuICAqL1xuICB0aW1lckRlbGF5OiA1MDAwLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gaW5maW5pdGVseSBsb29wIHRocm91Z2ggdGhlIHNsaWRlc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGluZmluaXRlV3JhcDogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSBPcmJpdCBzbGlkZXMgdG8gYmluZCB0byBzd2lwZSBldmVudHMgZm9yIG1vYmlsZSwgcmVxdWlyZXMgYW4gYWRkaXRpb25hbCB1dGlsIGxpYnJhcnlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBzd2lwZTogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSB0aW1pbmcgZnVuY3Rpb24gdG8gcGF1c2UgYW5pbWF0aW9uIG9uIGhvdmVyLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHBhdXNlT25Ib3ZlcjogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGJpbmQga2V5Ym9hcmQgZXZlbnRzIHRvIHRoZSBzbGlkZXIsIHRvIGFuaW1hdGUgZnJhbWVzIHdpdGggYXJyb3cga2V5c1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGFjY2Vzc2libGU6IHRydWUsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRhaW5lciBvZiBPcmJpdFxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtY29udGFpbmVyJ1xuICAqL1xuICBjb250YWluZXJDbGFzczogJ29yYml0LWNvbnRhaW5lcicsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gaW5kaXZpZHVhbCBzbGlkZXMuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1zbGlkZSdcbiAgKi9cbiAgc2xpZGVDbGFzczogJ29yYml0LXNsaWRlJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYnVsbGV0IGNvbnRhaW5lci4gWW91J3JlIHdlbGNvbWUuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1idWxsZXRzJ1xuICAqL1xuICBib3hPZkJ1bGxldHM6ICdvcmJpdC1idWxsZXRzJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYG5leHRgIG5hdmlnYXRpb24gYnV0dG9uLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtbmV4dCdcbiAgKi9cbiAgbmV4dENsYXNzOiAnb3JiaXQtbmV4dCcsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBwcmV2aW91c2AgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1wcmV2aW91cydcbiAgKi9cbiAgcHJldkNsYXNzOiAnb3JiaXQtcHJldmlvdXMnLFxuICAvKipcbiAgKiBCb29sZWFuIHRvIGZsYWcgdGhlIGpzIHRvIHVzZSBtb3Rpb24gdWkgY2xhc3NlcyBvciBub3QuIERlZmF1bHQgdG8gdHJ1ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGFiaWxpdHkuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgdXNlTVVJOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT3JiaXQsICdPcmJpdCcpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZU1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuZHJvcGRvd24tbWVudVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVNZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSByZXNwb25zaXZlIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZU1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtbWVudScpO1xuICAgIHRoaXMuY3VycmVudE1xID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZU1lbnUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWVudSBieSBwYXJzaW5nIHRoZSBjbGFzc2VzIGZyb20gdGhlICdkYXRhLVJlc3BvbnNpdmVNZW51JyBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xuICAgIGlmICh0eXBlb2YgdGhpcy5ydWxlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBydWxlc1RyZWUgPSB7fTtcblxuICAgICAgLy8gUGFyc2UgcnVsZXMgZnJvbSBcImNsYXNzZXNcIiBwdWxsZWQgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgbGV0IHJ1bGVzID0gdGhpcy5ydWxlcy5zcGxpdCgnICcpO1xuXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZXZlcnkgcnVsZSBmb3VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGxldCBydWxlU2l6ZSA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMF0gOiAnc21hbGwnO1xuICAgICAgICBsZXQgcnVsZVBsdWdpbiA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMV0gOiBydWxlWzBdO1xuXG4gICAgICAgIGlmIChNZW51UGx1Z2luc1tydWxlUGx1Z2luXSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJ1bGVzVHJlZVtydWxlU2l6ZV0gPSBNZW51UGx1Z2luc1tydWxlUGx1Z2luXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xuICAgIH1cblxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XG4gICAgICB0aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSBNZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9KTtcbiAgICAvLyAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5SZXNwb25zaXZlTWVudScsIGZ1bmN0aW9uKCkge1xuICAgIC8vICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgLy8gfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IHNjcmVlbiB3aWR0aCBhZ2FpbnN0IGF2YWlsYWJsZSBtZWRpYSBxdWVyaWVzLiBJZiB0aGUgbWVkaWEgcXVlcnkgaGFzIGNoYW5nZWQsIGFuZCB0aGUgcGx1Z2luIG5lZWRlZCBoYXMgY2hhbmdlZCwgdGhlIHBsdWdpbnMgd2lsbCBzd2FwIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNZWRpYVF1ZXJpZXMoKSB7XG4gICAgdmFyIG1hdGNoZWRNcSwgX3RoaXMgPSB0aGlzO1xuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUgYW5kIGZpbmQgdGhlIGxhc3QgbWF0Y2hpbmcgcnVsZVxuICAgICQuZWFjaCh0aGlzLnJ1bGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChrZXkpKSB7XG4gICAgICAgIG1hdGNoZWRNcSA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vIG1hdGNoPyBObyBkaWNlXG4gICAgaWYgKCFtYXRjaGVkTXEpIHJldHVybjtcblxuICAgIC8vIFBsdWdpbiBhbHJlYWR5IGluaXRpYWxpemVkPyBXZSBnb29kXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbiBpbnN0YW5jZW9mIHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4pIHJldHVybjtcblxuICAgIC8vIFJlbW92ZSBleGlzdGluZyBwbHVnaW4tc3BlY2lmaWMgQ1NTIGNsYXNzZXNcbiAgICAkLmVhY2goTWVudVBsdWdpbnMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHZhbHVlLmNzc0NsYXNzKTtcbiAgICB9KTtcblxuICAgIC8vIEFkZCB0aGUgQ1NTIGNsYXNzIGZvciB0aGUgbmV3IHBsdWdpblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5ydWxlc1ttYXRjaGVkTXFdLmNzc0NsYXNzKTtcblxuICAgIC8vIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiB0aGUgbmV3IHBsdWdpblxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4pIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbmV3IHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4odGhpcy4kZWxlbWVudCwge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiB0aGUgY3VycmVudCBwbHVnaW4gb24gdGhpcyBlbGVtZW50LCBhcyB3ZWxsIGFzIHRoZSB3aW5kb3cgcmVzaXplIGhhbmRsZXIgdGhhdCBzd2l0Y2hlcyB0aGUgcGx1Z2lucyBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgICQod2luZG93KS5vZmYoJy56Zi5SZXNwb25zaXZlTWVudScpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlTWVudS5kZWZhdWx0cyA9IHt9O1xuXG4vLyBUaGUgcGx1Z2luIG1hdGNoZXMgdGhlIHBsdWdpbiBjbGFzc2VzIHdpdGggdGhlc2UgcGx1Z2luIGluc3RhbmNlcy5cbnZhciBNZW51UGx1Z2lucyA9IHtcbiAgZHJvcGRvd246IHtcbiAgICBjc3NDbGFzczogJ2Ryb3Bkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2Ryb3Bkb3duLW1lbnUnXSB8fCBudWxsXG4gIH0sXG4gZHJpbGxkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcmlsbGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJpbGxkb3duJ10gfHwgbnVsbFxuICB9LFxuICBhY2NvcmRpb246IHtcbiAgICBjc3NDbGFzczogJ2FjY29yZGlvbi1tZW51JyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2FjY29yZGlvbi1tZW51J10gfHwgbnVsbFxuICB9XG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZU1lbnUsICdSZXNwb25zaXZlTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZVRvZ2dsZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZVRvZ2dsZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRhYiBCYXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggdGFiIGJhciBmdW5jdGlvbmFsaXR5IHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFiIGJhciBieSBmaW5kaW5nIHRoZSB0YXJnZXQgZWxlbWVudCwgdG9nZ2xpbmcgZWxlbWVudCwgYW5kIHJ1bm5pbmcgdXBkYXRlKCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHRhcmdldElEID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLXRvZ2dsZScpO1xuICAgIGlmICghdGFyZ2V0SUQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdXIgdGFiIGJhciBuZWVkcyBhbiBJRCBvZiBhIE1lbnUgYXMgdGhlIHZhbHVlIG9mIGRhdGEtdGFiLWJhci4nKTtcbiAgICB9XG5cbiAgICB0aGlzLiR0YXJnZXRNZW51ID0gJChgIyR7dGFyZ2V0SUR9YCk7XG4gICAgdGhpcy4kdG9nZ2xlciA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdG9nZ2xlXScpO1xuXG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSB0YWIgYmFyIHRvIHdvcmsuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy5fdXBkYXRlTXFIYW5kbGVyID0gdGhpcy5fdXBkYXRlLmJpbmQodGhpcyk7XG4gICAgXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuXG4gICAgdGhpcy4kdG9nZ2xlci5vbignY2xpY2suemYucmVzcG9uc2l2ZVRvZ2dsZScsIHRoaXMudG9nZ2xlTWVudS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnkgdG8gZGV0ZXJtaW5lIGlmIHRoZSB0YWIgYmFyIHNob3VsZCBiZSB2aXNpYmxlIG9yIGhpZGRlbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlKCkge1xuICAgIC8vIE1vYmlsZVxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3coKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuaGlkZSgpO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIuIFRoZSB0b2dnbGUgb25seSBoYXBwZW5zIGlmIHRoZSBzY3JlZW4gaXMgc21hbGwgZW5vdWdoIHRvIGFsbG93IGl0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgKi9cbiAgdG9nZ2xlTWVudSgpIHsgICBcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS50b2dnbGUoMCk7XG5cbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhciB0b2dnbGVzLlxuICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIH1cbiAgfTtcblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIHRoaXMuJHRvZ2dsZXIub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIFxuICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG4gICAgXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgYnJlYWtwb2ludCBhZnRlciB3aGljaCB0aGUgbWVudSBpcyBhbHdheXMgc2hvd24sIGFuZCB0aGUgdGFiIGJhciBpcyBoaWRkZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcbiAgICovXG4gIGhpZGVGb3I6ICdtZWRpdW0nXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZVRvZ2dsZSwgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJldmVhbCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmV2ZWFsXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvbiBpZiB1c2luZyBhbmltYXRpb25zXG4gKi9cblxuY2xhc3MgUmV2ZWFsIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgUmV2ZWFsLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJldmVhbC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1JldmVhbCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1JldmVhbCcsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICd0YWJfZm9yd2FyZCcsXG4gICAgICAnU0hJRlRfVEFCJzogJ3RhYl9iYWNrd2FyZCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbW9kYWwgYnkgYWRkaW5nIHRoZSBvdmVybGF5IGFuZCBjbG9zZSBidXR0b25zLCAoaWYgc2VsZWN0ZWQpLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5pZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYWNoZWQgPSB7bXE6IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5jdXJyZW50fTtcbiAgICB0aGlzLmlzTW9iaWxlID0gbW9iaWxlU25pZmYoKTtcblxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkubGVuZ3RoID8gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKSA6ICQoYFtkYXRhLXRvZ2dsZT1cIiR7dGhpcy5pZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6IHRoaXMuaWQsXG4gICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZnVsbCcpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiA9IHRydWU7XG4gICAgICB0aGlzLm9wdGlvbnMub3ZlcmxheSA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgIXRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSB0aGlzLl9tYWtlT3ZlcmxheSh0aGlzLmlkKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICdkaWFsb2cnLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAnZGF0YS15ZXRpLWJveCc6IHRoaXMuaWQsXG4gICAgICAgICdkYXRhLXJlc2l6ZSc6IHRoaXMuaWRcbiAgICB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8odGhpcy4kb3ZlcmxheSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8oJCgnYm9keScpKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3dpdGhvdXQtb3ZlcmxheScpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rICYmIHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoIGAjJHt0aGlzLmlkfWApKSB7XG4gICAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnJldmVhbCcsIHRoaXMub3Blbi5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvdmVybGF5IGRpdiB0byBkaXNwbGF5IGJlaGluZCB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfbWFrZU92ZXJsYXkoaWQpIHtcbiAgICB2YXIgJG92ZXJsYXkgPSAkKCc8ZGl2PjwvZGl2PicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygncmV2ZWFsLW92ZXJsYXknKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICByZXR1cm4gJG92ZXJsYXk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBwb3NpdGlvbiBvZiBtb2RhbFxuICAgKiBUT0RPOiAgRmlndXJlIG91dCBpZiB3ZSBhY3R1YWxseSBuZWVkIHRvIGNhY2hlIHRoZXNlIHZhbHVlcyBvciBpZiBpdCBkb2Vzbid0IG1hdHRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZVBvc2l0aW9uKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpO1xuICAgIHZhciBvdXRlcldpZHRoID0gJCh3aW5kb3cpLndpZHRoKCk7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJIZWlnaHQoKTtcbiAgICB2YXIgb3V0ZXJIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgdmFyIGxlZnQsIHRvcDtcbiAgICBpZiAodGhpcy5vcHRpb25zLmhPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KChvdXRlcldpZHRoIC0gd2lkdGgpIC8gMiwgMTApO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLmhPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy52T2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGlmIChoZWlnaHQgPiBvdXRlckhlaWdodCkge1xuICAgICAgICB0b3AgPSBwYXJzZUludChNYXRoLm1pbigxMDAsIG91dGVySGVpZ2h0IC8gMTApLCAxMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b3AgPSBwYXJzZUludCgob3V0ZXJIZWlnaHQgLSBoZWlnaHQpIC8gNCwgMTApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0b3AgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMudk9mZnNldCwgMTApO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmNzcyh7dG9wOiB0b3AgKyAncHgnfSk7XG4gICAgLy8gb25seSB3b3JyeSBhYm91dCBsZWZ0IGlmIHdlIGRvbid0IGhhdmUgYW4gb3ZlcmxheSBvciB3ZSBoYXZlYSAgaG9yaXpvbnRhbCBvZmZzZXQsXG4gICAgLy8gb3RoZXJ3aXNlIHdlJ3JlIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlXG4gICAgaWYoIXRoaXMuJG92ZXJsYXkgfHwgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICE9PSAnYXV0bycpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bGVmdDogbGVmdCArICdweCd9KTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHttYXJnaW46ICcwcHgnfSk7XG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IChldmVudCwgJGVsZW1lbnQpID0+IHtcbiAgICAgICAgaWYgKChldmVudC50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdKSB8fFxuICAgICAgICAgICAgKCQoZXZlbnQudGFyZ2V0KS5wYXJlbnRzKCdbZGF0YS1jbG9zYWJsZV0nKVswXSA9PT0gJGVsZW1lbnQpKSB7IC8vIG9ubHkgY2xvc2UgcmV2ZWFsIHdoZW4gaXQncyBleHBsaWNpdGx5IGNhbGxlZFxuICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlLmFwcGx5KHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGFuY2hvci5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLndoaWNoID09PSAxMyB8fCBlLndoaWNoID09PSAzMikge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkub2ZmKCcuemYucmV2ZWFsJykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9uKGBwb3BzdGF0ZS56Zi5yZXZlYWw6JHt0aGlzLmlkfWAsIHRoaXMuX2hhbmRsZVN0YXRlLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIG1vZGFsIG1ldGhvZHMgb24gYmFjay9mb3J3YXJkIGJ1dHRvbiBjbGlja3Mgb3IgYW55IG90aGVyIGV2ZW50IHRoYXQgdHJpZ2dlcnMgcG9wc3RhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlU3RhdGUoZSkge1xuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoICcjJyArIHRoaXMuaWQpICYmICF0aGlzLmlzQWN0aXZlKXsgdGhpcy5vcGVuKCk7IH1cbiAgICBlbHNleyB0aGlzLmNsb3NlKCk7IH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBtb2RhbCBjb250cm9sbGVkIGJ5IGB0aGlzLiRhbmNob3JgLCBhbmQgY2xvc2VzIGFsbCBvdGhlcnMgYnkgZGVmYXVsdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VtZVxuICAgKiBAZmlyZXMgUmV2ZWFsI29wZW5cbiAgICovXG4gIG9wZW4oKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGhhc2ggPSBgIyR7dGhpcy5pZH1gO1xuXG4gICAgICBpZiAod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKSB7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIE1ha2UgZWxlbWVudHMgaW52aXNpYmxlLCBidXQgcmVtb3ZlIGRpc3BsYXk6IG5vbmUgc28gd2UgY2FuIGdldCBzaXplIGFuZCBwb3NpdGlvbmluZ1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJ2hpZGRlbicgfSlcbiAgICAgICAgLnNob3coKVxuICAgICAgICAuc2Nyb2xsVG9wKDApO1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbid9KS5zaG93KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5oaWRlKClcbiAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICcnIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJyd9KS5oaWRlKCk7XG4gICAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYXN0JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnZmFzdCcpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdzbG93JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnc2xvdycpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlwbGVPcGVuZWQpIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBtb2RhbCBvcGVucy5cbiAgICAgICAqIENsb3NlcyBhbnkgb3RoZXIgbW9kYWxzIHRoYXQgYXJlIGN1cnJlbnRseSBvcGVuXG4gICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlbWVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnJldmVhbCcsIHRoaXMuaWQpO1xuICAgIH1cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4pIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICBmdW5jdGlvbiBhZnRlckFuaW1hdGlvbkZvY3VzKCl7XG4gICAgICAgIF90aGlzLiRlbGVtZW50XG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZvY3VzKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2ZvY3VzJyk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJG92ZXJsYXksICdmYWRlLWluJyk7XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkluLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG4gICAgICAgIGFmdGVyQW5pbWF0aW9uRm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuc2hvdygwKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdyh0aGlzLm9wdGlvbnMuc2hvd0RlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgYWNjZXNzaWJpbGl0eVxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICB9KVxuICAgICAgLmZvY3VzKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBoYXMgc3VjY2Vzc2Z1bGx5IG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgUmV2ZWFsI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYucmV2ZWFsJyk7XG5cbiAgICBpZiAodGhpcy5pc01vYmlsZSkge1xuICAgICAgdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICQoJ2h0bWwsIGJvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgfVxuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9leHRyYUhhbmRsZXJzKCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBleHRyYSBldmVudCBoYW5kbGVycyBmb3IgdGhlIGJvZHkgYW5kIHdpbmRvdyBpZiBuZWNlc3NhcnkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXh0cmFIYW5kbGVycygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgIXRoaXMub3B0aW9ucy5mdWxsU2NyZWVuKSB7XG4gICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGxvY2sgZm9jdXMgd2l0aGluIG1vZGFsIHdoaWxlIHRhYmJpbmdcbiAgICB0aGlzLiRlbGVtZW50Lm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKTtcbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgIHRhYl9mb3J3YXJkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpKSkgeyAvLyBsZWZ0IG1vZGFsIGRvd253YXJkcywgc2V0dGluZyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgICBfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5sZW5ndGggPT09IDApIHsgLy8gbm8gZm9jdXNhYmxlIGVsZW1lbnRzIGluc2lkZSB0aGUgbW9kYWwgYXQgYWxsLCBwcmV2ZW50IHRhYmJpbmcgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKSkgfHwgX3RoaXMuJGVsZW1lbnQuaXMoJzpmb2N1cycpKSB7IC8vIGxlZnQgbW9kYWwgdXB3YXJkcywgc2V0dGluZyBmb2N1cyB0byBsYXN0IGVsZW1lbnRcbiAgICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5sZW5ndGggPT09IDApIHsgLy8gbm8gZm9jdXNhYmxlIGVsZW1lbnRzIGluc2lkZSB0aGUgbW9kYWwgYXQgYWxsLCBwcmV2ZW50IHRhYmJpbmcgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJykpKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyAvLyBzZXQgZm9jdXMgYmFjayB0byBhbmNob3IgaWYgY2xvc2UgYnV0dG9uIGhhcyBiZWVuIGFjdGl2YXRlZFxuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMpKSB7IC8vIGRvbnQndCB0cmlnZ2VyIGlmIGFjdWFsIGVsZW1lbnQgaGFzIGZvY3VzIChpLmUuIGlucHV0cywgbGlua3MsIC4uLilcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYgKCF0aGlzLmlzQWN0aXZlIHx8ICF0aGlzLiRlbGVtZW50LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRvdmVybGF5LCAnZmFkZS1vdXQnLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiBoaWRpbmdcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmhpZGUoMCwgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSh0aGlzLm9wdGlvbnMuaGlkZURlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBDb25kaXRpb25hbHMgdG8gcmVtb3ZlIGV4dHJhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCBvbiBvcGVuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgJCgnYm9keScpLm9mZignY2xpY2suemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG5cbiAgICBmdW5jdGlvbiBmaW5pc2hVcCgpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICAgIGlmKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKSB7XG4gICAgICAgICAgJCgnYm9keScpLnNjcm9sbFRvcChfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyk7XG4gICAgICAgICAgX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgICAvKipcbiAgICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaXMgZG9uZSBjbG9zaW5nLlxuICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlZFxuICAgICAgKi9cbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlZC56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAqIFJlc2V0cyB0aGUgbW9kYWwgY29udGVudFxuICAgICogVGhpcyBwcmV2ZW50cyBhIHJ1bm5pbmcgdmlkZW8gdG8ga2VlcCBnb2luZyBpbiB0aGUgYmFja2dyb3VuZFxuICAgICovXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNldE9uQ2xvc2UpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaHRtbCh0aGlzLiRlbGVtZW50Lmh0bWwoKSk7XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICBpZiAoX3RoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUpIHtcbiAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShcIlwiLCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICAgICB9XG4gICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvcGVuL2Nsb3NlZCBzdGF0ZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXBwZW5kVG8oJCgnYm9keScpKTsgLy8gbW92ZSAkZWxlbWVudCBvdXRzaWRlIG9mICRvdmVybGF5IHRvIHByZXZlbnQgZXJyb3IgdW5yZWdpc3RlclBsdWdpbigpXG4gICAgICB0aGlzLiRvdmVybGF5LmhpZGUoKS5vZmYoKS5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5oaWRlKCkub2ZmKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmJyk7XG4gICAgJCh3aW5kb3cpLm9mZihgLnpmLnJldmVhbDoke3RoaXMuaWR9YCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cblJldmVhbC5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLWluLWxlZnQnXG4gICAqL1xuICBhbmltYXRpb25JbjogJycsXG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICAqL1xuICBhbmltYXRpb25PdXQ6ICcnLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBvcGVuaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgc2hvd0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBjbG9zaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgaGlkZURlbGF5OiAwLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkvb3ZlcmxheSB0byBjbG9zZSB0aGUgbW9kYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBjbG9zZSBpZiB0aGUgdXNlciBwcmVzc2VzIHRoZSBgRVNDQVBFYCBrZXkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkVzYzogdHJ1ZSxcbiAgLyoqXG4gICAqIElmIHRydWUsIGFsbG93cyBtdWx0aXBsZSBtb2RhbHMgdG8gYmUgZGlzcGxheWVkIGF0IG9uY2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpcGxlT3BlbmVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBkb3duIGZyb20gdGhlIHRvcCBvZiB0aGUgc2NyZWVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGF1dG9cbiAgICovXG4gIHZPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBpbiBmcm9tIHRoZSBzaWRlIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgaE9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBiZSBmdWxsc2NyZWVuLCBjb21wbGV0ZWx5IGJsb2NraW5nIG91dCB0aGUgcmVzdCBvZiB0aGUgdmlldy4gSlMgY2hlY2tzIGZvciB0aGlzIGFzIHdlbGwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZ1bGxTY3JlZW46IGZhbHNlLFxuICAvKipcbiAgICogUGVyY2VudGFnZSBvZiBzY3JlZW4gaGVpZ2h0IHRoZSBtb2RhbCBzaG91bGQgcHVzaCB1cCBmcm9tIHRoZSBib3R0b20gb2YgdGhlIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIGJ0bU9mZnNldFBjdDogMTAsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGdlbmVyYXRlIGFuIG92ZXJsYXkgZGl2LCB3aGljaCB3aWxsIGNvdmVyIHRoZSB2aWV3IHdoZW4gbW9kYWwgb3BlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgb3ZlcmxheTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gcmVtb3ZlIGFuZCByZWluamVjdCBtYXJrdXAgb24gY2xvc2UuIFNob3VsZCBiZSB0cnVlIGlmIHVzaW5nIHZpZGVvIGVsZW1lbnRzIHcvbyB1c2luZyBwcm92aWRlcidzIGFwaSwgb3RoZXJ3aXNlLCB2aWRlb3Mgd2lsbCBjb250aW51ZSB0byBwbGF5IGluIHRoZSBiYWNrZ3JvdW5kLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICByZXNldE9uQ2xvc2U6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhbHRlciB0aGUgdXJsIG9uIG9wZW4vY2xvc2UsIGFuZCBhbGxvd3MgdGhlIHVzZSBvZiB0aGUgYGJhY2tgIGJ1dHRvbiB0byBjbG9zZSBtb2RhbHMuIEFMU08sIGFsbG93cyBhIG1vZGFsIHRvIGF1dG8tbWFuaWFjYWxseSBvcGVuIG9uIHBhZ2UgbG9hZCBJRiB0aGUgaGFzaCA9PT0gdGhlIG1vZGFsJ3MgdXNlci1zZXQgaWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJldmVhbCwgJ1JldmVhbCcpO1xuXG5mdW5jdGlvbiBpUGhvbmVTbmlmZigpIHtcbiAgcmV0dXJuIC9pUChhZHxob25lfG9kKS4qT1MvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBhbmRyb2lkU25pZmYoKSB7XG4gIHJldHVybiAvQW5kcm9pZC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIG1vYmlsZVNuaWZmKCkge1xuICByZXR1cm4gaVBob25lU25pZmYoKSB8fCBhbmRyb2lkU25pZmYoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFN0aWNreSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc3RpY2t5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBTdGlja3kge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHN0aWNreSB0aGluZy5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIHN0aWNreS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25zIG9iamVjdCBwYXNzZWQgd2hlbiBjcmVhdGluZyB0aGUgZWxlbWVudCBwcm9ncmFtbWF0aWNhbGx5LlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTdGlja3kuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1N0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBzdGlja3kgZWxlbWVudCBieSBhZGRpbmcgY2xhc3NlcywgZ2V0dGluZy9zZXR0aW5nIGRpbWVuc2lvbnMsIGJyZWFrcG9pbnRzIGFuZCBhdHRyaWJ1dGVzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRwYXJlbnQgPSB0aGlzLiRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3RpY2t5LWNvbnRhaW5lcl0nKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3N0aWNreScpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoISRwYXJlbnQubGVuZ3RoKSB7XG4gICAgICB0aGlzLndhc1dyYXBwZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLiRjb250YWluZXIgPSAkcGFyZW50Lmxlbmd0aCA/ICRwYXJlbnQgOiAkKHRoaXMub3B0aW9ucy5jb250YWluZXIpLndyYXBJbm5lcih0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLiRjb250YWluZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnN0aWNreUNsYXNzKVxuICAgICAgICAgICAgICAgICAuYXR0cih7J2RhdGEtcmVzaXplJzogaWR9KTtcblxuICAgIHRoaXMuc2Nyb2xsQ291bnQgPSB0aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmFuY2hvciAhPT0gJycpe1xuICAgICAgICBfdGhpcy4kYW5jaG9yID0gJCgnIycgKyBfdGhpcy5vcHRpb25zLmFuY2hvcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgX3RoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgICB9XG5cbiAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpe1xuICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSk7XG4gICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoaWQuc3BsaXQoJy0nKS5yZXZlcnNlKCkuam9pbignLScpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlUG9pbnRzKCkge1xuICAgIHZhciB0b3AgPSB0aGlzLm9wdGlvbnMudG9wQW5jaG9yID09IFwiXCIgPyAxIDogdGhpcy5vcHRpb25zLnRvcEFuY2hvcixcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcbiAgICAgICAgcHRzID0gW3RvcCwgYnRtXSxcbiAgICAgICAgYnJlYWtzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcbiAgICAgIHZhciBwdDtcbiAgICAgIGlmICh0eXBlb2YgcHRzW2ldID09PSAnbnVtYmVyJykge1xuICAgICAgICBwdCA9IHB0c1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwbGFjZSA9IHB0c1tpXS5zcGxpdCgnOicpLFxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XG5cbiAgICAgICAgcHQgPSBhbmNob3Iub2Zmc2V0KCkudG9wO1xuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICBwdCArPSBhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha3NbaV0gPSBwdDtcbiAgICB9XG5cblxuICAgIHRoaXMucG9pbnRzID0gYnJlYWtzO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXG4gICAqL1xuICBfZXZlbnRzKGlkKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsTGlzdGVuZXIgPSB0aGlzLnNjcm9sbExpc3RlbmVyID0gYHNjcm9sbC56Zi4ke2lkfWA7XG4gICAgaWYgKHRoaXMuaXNPbikgeyByZXR1cm47IH1cbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xuICAgICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNjcm9sbENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQgPSBfdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpXG4gICAgICAgICAgICAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUsIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmNhblN0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fZXZlbnRzKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3RoaXMuaXNPbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9wYXVzZUxpc3RlbmVycyhzY3JvbGxMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgaGFuZGxlcnMgZm9yIHNjcm9sbCBhbmQgY2hhbmdlIGV2ZW50cyBvbiBhbmNob3IuXG4gICAqIEBmaXJlcyBTdGlja3kjcGF1c2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNjcm9sbExpc3RlbmVyIC0gdW5pcXVlLCBuYW1lc3BhY2VkIHNjcm9sbCBsaXN0ZW5lciBhdHRhY2hlZCB0byBgd2luZG93YFxuICAgKi9cbiAgX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcik7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaXMgcGF1c2VkIGR1ZSB0byByZXNpemUgZXZlbnQgc2hyaW5raW5nIHRoZSB2aWV3LlxuICAgICAqIEBldmVudCBTdGlja3kjcGF1c2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3BhdXNlLnpmLnN0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBldmVyeSBgc2Nyb2xsYCBldmVudCBhbmQgb24gYF9pbml0YFxuICAgKiBmaXJlcyBmdW5jdGlvbnMgYmFzZWQgb24gYm9vbGVhbnMgYW5kIGNhY2hlZCB2YWx1ZXNcbiAgICogQHBhcmFtIHtCb29sZWFufSBjaGVja1NpemVzIC0gdHJ1ZSBpZiBwbHVnaW4gc2hvdWxkIHJlY2FsY3VsYXRlIHNpemVzIGFuZCBicmVha3BvaW50cy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHNjcm9sbCAtIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHBhc3NlZCBmcm9tIHNjcm9sbCBldmVudCBjYiBmdW5jdGlvbi4gSWYgbm90IHBhc3NlZCwgZGVmYXVsdHMgdG8gYHdpbmRvdy5wYWdlWU9mZnNldGAuXG4gICAqL1xuICBfY2FsYyhjaGVja1NpemVzLCBzY3JvbGwpIHtcbiAgICBpZiAoY2hlY2tTaXplcykgeyB0aGlzLl9zZXRTaXplcygpOyB9XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghc2Nyb2xsKSB7IHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDsgfVxuXG4gICAgaWYgKHNjcm9sbCA+PSB0aGlzLnRvcFBvaW50KSB7XG4gICAgICBpZiAoc2Nyb2xsIDw9IHRoaXMuYm90dG9tUG9pbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgICB0aGlzLl9zZXRTdGlja3koKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreShmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHN0dWNrLlxuICAgKiBBZGRzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAZmlyZXMgU3RpY2t5I3N0dWNrdG9cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U3RpY2t5KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgY3NzID0ge307XG5cbiAgICBjc3NbbXJnbl0gPSBgJHt0aGlzLm9wdGlvbnNbbXJnbl19ZW1gO1xuICAgIGNzc1tzdGlja1RvXSA9IDA7XG4gICAgY3NzW25vdFN0dWNrVG9dID0gJ2F1dG8nO1xuICAgIGNzc1snbGVmdCddID0gdGhpcy4kY29udGFpbmVyLm9mZnNldCgpLmxlZnQgKyBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLiRjb250YWluZXJbMF0pW1wicGFkZGluZy1sZWZ0XCJdLCAxMCk7XG4gICAgdGhpcy5pc1N0dWNrID0gdHJ1ZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke25vdFN0dWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGBwb3NpdGlvbjogZml4ZWQ7YFxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYuc3R1Y2t0bzp0b3BgXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjc3R1Y2t0b1xuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi5zdHVja3RvOiR7c3RpY2tUb31gKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9uKFwidHJhbnNpdGlvbmVuZCB3ZWJraXRUcmFuc2l0aW9uRW5kIG9UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIE1TVHJhbnNpdGlvbkVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9zZXRTaXplcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHVuc3R1Y2suXG4gICAqIFJlbW92ZXMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEFkZHMgb3RoZXIgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNUb3AgLSB0ZWxscyB0aGUgZnVuY3Rpb24gaWYgdGhlICRlbGVtZW50IHNob3VsZCBhbmNob3IgdG8gdGhlIHRvcCBvciBib3R0b20gb2YgaXRzICRhbmNob3IgZWxlbWVudC5cbiAgICogQGZpcmVzIFN0aWNreSN1bnN0dWNrZnJvbVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlbW92ZVN0aWNreShpc1RvcCkge1xuICAgIHZhciBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXG4gICAgICAgIHN0aWNrVG9Ub3AgPSBzdGlja1RvID09PSAndG9wJyxcbiAgICAgICAgY3NzID0ge30sXG4gICAgICAgIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLnBvaW50c1swXSA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodCxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG9Ub3AgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUb1RvcCA/ICdib3R0b20nIDogJ3RvcCcsXG4gICAgICAgIHRvcE9yQm90dG9tID0gaXNUb3AgPyAndG9wJyA6ICdib3R0b20nO1xuXG4gICAgY3NzW21yZ25dID0gMDtcblxuICAgIGNzc1snYm90dG9tJ10gPSAnYXV0byc7XG4gICAgaWYoaXNUb3ApIHtcbiAgICAgIGNzc1sndG9wJ10gPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBjc3NbJ3RvcCddID0gYW5jaG9yUHQ7XG4gICAgfVxuXG4gICAgY3NzWydsZWZ0J10gPSAnJztcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke3RvcE9yQm90dG9tfWApXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxuICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgJGVsZW1lbnQgaGFzIGJlY29tZSBhbmNob3JlZC5cbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOmJvdHRvbWBcbiAgICAgICAgICAgICAgICAgICogQGV2ZW50IFN0aWNreSN1bnN0dWNrZnJvbVxuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi51bnN0dWNrZnJvbToke3RvcE9yQm90dG9tfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlICRlbGVtZW50IGFuZCAkY29udGFpbmVyIHNpemVzIGZvciBwbHVnaW4uXG4gICAqIENhbGxzIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgb24gY29tcGxldGlvbiBvZiBgX3NldEJyZWFrUG9pbnRzYC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTaXplcyhjYikge1xuICAgIHRoaXMuY2FuU3RpY2sgPSBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuc3RpY2t5T24pO1xuICAgIGlmICghdGhpcy5jYW5TdGljaykgeyBjYigpOyB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxuICAgICAgICBjb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKSxcbiAgICAgICAgcGRuZyA9IHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctcmlnaHQnXSwgMTApO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLmFuY2hvckhlaWdodCA9IHRoaXMuJGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe1xuICAgICAgJ21heC13aWR0aCc6IGAke25ld0VsZW1XaWR0aCAtIHBkbmd9cHhgXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3Q29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgfHwgdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xuICAgICAgbmV3Q29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICB9XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG4gICAgdGhpcy4kY29udGFpbmVyLmNzcyh7XG4gICAgICBoZWlnaHQ6IG5ld0NvbnRhaW5lckhlaWdodFxuICAgIH0pO1xuICAgIHRoaXMuZWxlbUhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcblxuICBcdGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgXHRcdHRoaXMuJGVsZW1lbnQuY3NzKHtcImxlZnRcIjp0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctbGVmdCddLCAxMCl9KTtcbiAgXHR9XG5cbiAgICB0aGlzLl9zZXRCcmVha1BvaW50cyhuZXdDb250YWluZXJIZWlnaHQsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNiKSB7IGNiKCk7IH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB1cHBlciBhbmQgbG93ZXIgYnJlYWtwb2ludHMgZm9yIHRoZSBlbGVtZW50IHRvIGJlY29tZSBzdGlja3kvdW5zdGlja3kuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBlbGVtSGVpZ2h0IC0gcHggdmFsdWUgZm9yIHN0aWNreS4kZWxlbWVudCBoZWlnaHQsIGNhbGN1bGF0ZWQgYnkgYF9zZXRTaXplc2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGNvbXBsZXRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0QnJlYWtQb2ludHMoZWxlbUhlaWdodCwgY2IpIHtcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmIChjYikgeyBjYigpOyB9XG4gICAgICBlbHNlIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuICAgIHZhciBtVG9wID0gZW1DYWxjKHRoaXMub3B0aW9ucy5tYXJnaW5Ub3ApLFxuICAgICAgICBtQnRtID0gZW1DYWxjKHRoaXMub3B0aW9ucy5tYXJnaW5Cb3R0b20pLFxuICAgICAgICB0b3BQb2ludCA9IHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMF0gOiB0aGlzLiRhbmNob3Iub2Zmc2V0KCkudG9wLFxuICAgICAgICBib3R0b21Qb2ludCA9IHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gOiB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0LFxuICAgICAgICAvLyB0b3BQb2ludCA9IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AgfHwgdGhpcy5wb2ludHNbMF0sXG4gICAgICAgIC8vIGJvdHRvbVBvaW50ID0gdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCB8fCB0aGlzLnBvaW50c1sxXSxcbiAgICAgICAgd2luSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAndG9wJykge1xuICAgICAgdG9wUG9pbnQgLT0gbVRvcDtcbiAgICAgIGJvdHRvbVBvaW50IC09IChlbGVtSGVpZ2h0ICsgbVRvcCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc3RpY2tUbyA9PT0gJ2JvdHRvbScpIHtcbiAgICAgIHRvcFBvaW50IC09ICh3aW5IZWlnaHQgLSAoZWxlbUhlaWdodCArIG1CdG0pKTtcbiAgICAgIGJvdHRvbVBvaW50IC09ICh3aW5IZWlnaHQgLSBtQnRtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy90aGlzIHdvdWxkIGJlIHRoZSBzdGlja1RvOiBib3RoIG9wdGlvbi4uLiB0cmlja3lcbiAgICB9XG5cbiAgICB0aGlzLnRvcFBvaW50ID0gdG9wUG9pbnQ7XG4gICAgdGhpcy5ib3R0b21Qb2ludCA9IGJvdHRvbVBvaW50O1xuXG4gICAgaWYgKGNiKSB7IGNiKCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cbiAgICogUmVzZXRzIHRoZSBlbGVtZW50IHRvIHRoZSB0b3AgcG9zaXRpb24gZmlyc3QuXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzLCBKUy1hZGRlZCBjc3MgcHJvcGVydGllcyBhbmQgY2xhc3NlcywgYW5kIHVud3JhcHMgdGhlICRlbGVtZW50IGlmIHRoZSBKUyBhZGRlZCB0aGUgJGNvbnRhaW5lci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcblxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnN0aWNreUNsYXNzfSBpcy1hbmNob3JlZCBpcy1hdC10b3BgKVxuICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgIHRvcDogJycsXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAnbWF4LXdpZHRoJzogJydcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyIGNsYXNzPVwic21hbGwtNiBjb2x1bW5zXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgY29udGFpbmVyOiAnPGRpdiBkYXRhLXN0aWNreS1jb250YWluZXI+PC9kaXY+JyxcbiAgLyoqXG4gICAqIExvY2F0aW9uIGluIHRoZSB2aWV3IHRoZSBlbGVtZW50IHN0aWNrcyB0by5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgc3RpY2tUbzogJ3RvcCcsXG4gIC8qKlxuICAgKiBJZiBhbmNob3JlZCB0byBhIHNpbmdsZSBlbGVtZW50LCB0aGUgaWQgb2YgdGhhdCBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQnXG4gICAqL1xuICBhbmNob3I6ICcnLFxuICAvKipcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgdG9wIGFuY2hvci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkOnRvcCdcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6Ym90dG9tJ1xuICAgKi9cbiAgYnRtQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSB0b3Agb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Ub3A6IDEsXG4gIC8qKlxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgYm90dG9tIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgbWFyZ2luQm90dG9tOiAxLFxuICAvKipcbiAgICogQnJlYWtwb2ludCBzdHJpbmcgdGhhdCBpcyB0aGUgbWluaW11bSBzY3JlZW4gc2l6ZSBhbiBlbGVtZW50IHNob3VsZCBiZWNvbWUgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBzdGlja3lPbjogJ21lZGl1bScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBlbGVtZW50LCBhbmQgcmVtb3ZlZCBvbiBkZXN0cnVjdGlvbi4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5YC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5J1xuICAgKi9cbiAgc3RpY2t5Q2xhc3M6ICdzdGlja3knLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgY29udGFpbmVyLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3ktY29udGFpbmVyYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5LWNvbnRhaW5lcidcbiAgICovXG4gIGNvbnRhaW5lckNsYXNzOiAnc3RpY2t5LWNvbnRhaW5lcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygc2Nyb2xsIGV2ZW50cyBiZXR3ZWVuIHRoZSBwbHVnaW4ncyByZWNhbGN1bGF0aW5nIHN0aWNreSBwb2ludHMuIFNldHRpbmcgaXQgdG8gYDBgIHdpbGwgY2F1c2UgaXQgdG8gcmVjYWxjIGV2ZXJ5IHNjcm9sbCBldmVudCwgc2V0dGluZyBpdCB0byBgLTFgIHdpbGwgcHJldmVudCByZWNhbGMgb24gc2Nyb2xsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBjaGVja0V2ZXJ5OiAtMVxufTtcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2FsY3VsYXRlIGVtIHZhbHVlc1xuICogQHBhcmFtIE51bWJlciB7ZW19IC0gbnVtYmVyIG9mIGVtJ3MgdG8gY2FsY3VsYXRlIGludG8gcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIGVtQ2FsYyhlbSkge1xuICByZXR1cm4gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgbnVsbCkuZm9udFNpemUsIDEwKSAqIGVtO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU3RpY2t5LCAnU3RpY2t5Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50YWJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgdGFicyBjb250YWluIGltYWdlc1xuICovXG5cbmNsYXNzIFRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0YWJzLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIHRhYnMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVGFicy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RhYnMnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdUYWJzJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICAvLyAnVEFCJzogJ25leHQnLFxuICAgICAgLy8gJ1NISUZUX1RBQic6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFicyBieSBzaG93aW5nIGFuZCBmb2N1c2luZyAoaWYgYXV0b0ZvY3VzPXRydWUpIHRoZSBwcmVzZXQgYWN0aXZlIHRhYi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpLFxuICAgICAgICAgIGhhc2ggPSAkbGlua1swXS5oYXNoLnNsaWNlKDEpLFxuICAgICAgICAgIGxpbmtJZCA9ICRsaW5rWzBdLmlkID8gJGxpbmtbMF0uaWQgOiBgJHtoYXNofS1sYWJlbGAsXG4gICAgICAgICAgJHRhYkNvbnRlbnQgPSAkKGAjJHtoYXNofWApO1xuXG4gICAgICAkZWxlbS5hdHRyKHsncm9sZSc6ICdwcmVzZW50YXRpb24nfSk7XG5cbiAgICAgICRsaW5rLmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnYXJpYS1jb250cm9scyc6IGhhc2gsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgICR0YWJDb250ZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgIGlmKGlzQWN0aXZlICYmIF90aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgdmFyICRpbWFnZXMgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoJ2ltZycpO1xuXG4gICAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCgkaW1hZ2VzLCB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRIZWlnaHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuX2FkZEtleUhhbmRsZXIoKTtcbiAgICB0aGlzLl9hZGRDbGlja0hhbmRsZXIoKTtcbiAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSBudWxsO1xuICAgIFxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpO1xuICAgICAgXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJ2NsaWNrLnpmLnRhYnMnKVxuICAgICAgLm9uKCdjbGljay56Zi50YWJzJywgYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCwgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKCQodGhpcykuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWJvYXJkIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkS2V5SGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkZmlyc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpmaXJzdC1vZi10eXBlJyk7XG4gICAgdmFyICRsYXN0VGFiID0gX3RoaXMuJGVsZW1lbnQuZmluZCgnbGk6bGFzdC1vZi10eXBlJyk7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSkgcmV0dXJuO1xuICAgICAgXG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMud3JhcE9uS2V5cykge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9IGkgPT09ICRlbGVtZW50cy5sZW5ndGggLTEgPyAkZWxlbWVudHMuZmlyc3QoKSA6ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1RhYnMnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRlbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJG5leHRFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUYWIgdG8gb3Blbi5cbiAgICogQGZpcmVzIFRhYnMjY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0KSB7XG4gICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICBoYXNoID0gJHRhYkxpbmtbMF0uaGFzaCxcbiAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCksXG4gICAgICAgICRvbGRUYWIgPSB0aGlzLiRlbGVtZW50LlxuICAgICAgICAgIGZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9LmlzLWFjdGl2ZWApXG4gICAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAgICAgLmF0dHIoeyAnYXJpYS1zZWxlY3RlZCc6ICdmYWxzZScgfSk7XG5cbiAgICAkKGAjJHskb2xkVGFiLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxuICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeyAnYXJpYS1oaWRkZW4nOiAndHJ1ZScgfSk7XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XG5cbiAgICAkdGFyZ2V0Q29udGVudFxuICAgICAgLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6ICdmYWxzZSd9KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQgdGFicy5cbiAgICAgKiBAZXZlbnQgVGFicyNjaGFuZ2VcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZS56Zi50YWJzJywgWyR0YXJnZXRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciBzZWxlY3RpbmcgYSBjb250ZW50IHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzZWxlY3RUYWIoZWxlbSkge1xuICAgIHZhciBpZFN0cjtcblxuICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlkU3RyID0gZWxlbVswXS5pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRTdHIgPSBlbGVtO1xuICAgIH1cblxuICAgIGlmIChpZFN0ci5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICBpZFN0ciA9IGAjJHtpZFN0cn1gO1xuICAgIH1cblxuICAgIHZhciAkdGFyZ2V0ID0gdGhpcy4kdGFiVGl0bGVzLmZpbmQoYFtocmVmPVwiJHtpZFN0cn1cIl1gKS5wYXJlbnQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG5cbiAgICB0aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDA7XG4gICAgdGhpcy4kdGFiQ29udGVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuY3NzKCdoZWlnaHQnLCAnJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGFuZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgaXNBY3RpdmUgPSBwYW5lbC5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJywgJ2Rpc3BsYXknOiAnYmxvY2snfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moe1xuICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgfSlcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIHRhYnMuXG4gICAqIEBmaXJlcyBUYWJzI2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxuICAgICAgLm9mZignLnpmLnRhYnMnKS5oaWRlKCkuZW5kKClcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmhpZGUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVGFicy5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgd2luZG93IHRvIHNjcm9sbCB0byBjb250ZW50IG9mIGFjdGl2ZSBwYW5lIG9uIGxvYWQgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBrZXlib2FyZCBpbnB1dCB0byAnd3JhcCcgYXJvdW5kIHRoZSB0YWIgbGlua3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgd3JhcE9uS2V5czogdHJ1ZSxcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0YWIgY29udGVudCBwYW5lcyB0byBtYXRjaCBoZWlnaHRzIGlmIHNldCB0byB0cnVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYGxpYCdzIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RhYnMtdGl0bGUnXG4gICAqL1xuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0YWJzLXBhbmVsJ1xuICAgKi9cbiAgcGFuZWxDbGFzczogJ3RhYnMtcGFuZWwnXG59O1xuXG5mdW5jdGlvbiBjaGVja0NsYXNzKCRlbGVtKXtcbiAgcmV0dXJuICRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRhYnMsICdUYWJzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb2dnbGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b2dnbGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvZ2dsZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUb2dnbGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvZ2dsZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvZ2dsZXIuZGVmYXVsdHMsIGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLmNsYXNzTmFtZSA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9nZ2xlcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBUb2dnbGVyIHBsdWdpbiBieSBwYXJzaW5nIHRoZSB0b2dnbGUgY2xhc3MgZnJvbSBkYXRhLXRvZ2dsZXIsIG9yIGFuaW1hdGlvbiBjbGFzc2VzIGZyb20gZGF0YS1hbmltYXRlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpbnB1dDtcbiAgICAvLyBQYXJzZSBhbmltYXRpb24gY2xhc3NlcyBpZiB0aGV5IHdlcmUgc2V0XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XG5cbiAgICAgIHRoaXMuYW5pbWF0aW9uSW4gPSBpbnB1dFswXTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCBwYXJzZSB0b2dnbGUgY2xhc3NcbiAgICBlbHNlIHtcbiAgICAgIGlucHV0ID0gdGhpcy4kZWxlbWVudC5kYXRhKCd0b2dnbGVyJyk7XG4gICAgICAvLyBBbGxvdyBmb3IgYSAuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZ1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBpbnB1dFswXSA9PT0gJy4nID8gaW5wdXQuc2xpY2UoMSkgOiBpbnB1dDtcbiAgICB9XG5cbiAgICAvLyBBZGQgQVJJQSBhdHRyaWJ1dGVzIHRvIHRyaWdnZXJzXG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZDtcbiAgICAkKGBbZGF0YS1vcGVuPVwiJHtpZH1cIl0sIFtkYXRhLWNsb3NlPVwiJHtpZH1cIl0sIFtkYXRhLXRvZ2dsZT1cIiR7aWR9XCJdYClcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuICAgIC8vIElmIHRoZSB0YXJnZXQgaXMgaGlkZGVuLCBhZGQgYXJpYS1oaWRkZW5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykgPyBmYWxzZSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIHRvZ2dsZSB0cmlnZ2VyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ3RvZ2dsZS56Zi50cmlnZ2VyJykub24oJ3RvZ2dsZS56Zi50cmlnZ2VyJywgdGhpcy50b2dnbGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgdGFyZ2V0IGNsYXNzIG9uIHRoZSB0YXJnZXQgZWxlbWVudC4gQW4gZXZlbnQgaXMgZmlyZWQgZnJvbSB0aGUgb3JpZ2luYWwgdHJpZ2dlciBkZXBlbmRpbmcgb24gaWYgdGhlIHJlc3VsdGFudCBzdGF0ZSB3YXMgXCJvblwiIG9yIFwib2ZmXCIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvZmZcbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICB0aGlzWyB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA/ICdfdG9nZ2xlQW5pbWF0ZScgOiAnX3RvZ2dsZUNsYXNzJ10oKTtcbiAgfVxuXG4gIF90b2dnbGVDbGFzcygpIHtcbiAgICB0aGlzLiRlbGVtZW50LnRvZ2dsZUNsYXNzKHRoaXMuY2xhc3NOYW1lKTtcblxuICAgIHZhciBpc09uID0gdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG4gICAgaWYgKGlzT24pIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGhhcyB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvblxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29mZlxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlQVJJQShpc09uKTtcbiAgfVxuXG4gIF90b2dnbGVBbmltYXRlKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25JbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25PdXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQShmYWxzZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF91cGRhdGVBUklBKGlzT24pIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09uID8gdHJ1ZSA6IGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgVG9nZ2xlciBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudG9nZ2xlcicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub2dnbGVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGVsbHMgdGhlIHBsdWdpbiBpZiB0aGUgZWxlbWVudCBzaG91bGQgYW5pbWF0ZWQgd2hlbiB0b2dnbGVkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbmltYXRlOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvZ2dsZXIsICdUb2dnbGVyJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb29sdGlwIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b29sdGlwXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvb2x0aXAge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIFRvb2x0aXAuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9vbHRpcCNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggYSB0b29sdGlwIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9iamVjdCB0byBleHRlbmQgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9vbHRpcC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Rvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdG9vbHRpcCBieSBzZXR0aW5nIHRoZSBjcmVhdGluZyB0aGUgdGlwIGVsZW1lbnQsIGFkZGluZyBpdCdzIHRleHQsIHNldHRpbmcgcHJpdmF0ZSB2YXJpYWJsZXMgYW5kIHNldHRpbmcgYXR0cmlidXRlcyBvbiB0aGUgYW5jaG9yLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGVsZW1JZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1kZXNjcmliZWRieScpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3Rvb2x0aXAnKTtcblxuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgfHwgdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyh0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMudGlwVGV4dCA9IHRoaXMub3B0aW9ucy50aXBUZXh0IHx8IHRoaXMuJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5vcHRpb25zLnRlbXBsYXRlID8gJCh0aGlzLm9wdGlvbnMudGVtcGxhdGUpIDogdGhpcy5fYnVpbGRUZW1wbGF0ZShlbGVtSWQpO1xuXG4gICAgdGhpcy50ZW1wbGF0ZS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICAgICAgICAudGV4dCh0aGlzLm9wdGlvbnMudGlwVGV4dClcbiAgICAgICAgLmhpZGUoKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAndGl0bGUnOiAnJyxcbiAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogZWxlbUlkLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXG4gICAgICAnZGF0YS10b2dnbGUnOiBlbGVtSWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiBlbGVtSWRcbiAgICB9KS5hZGRDbGFzcyh0aGlzLnRyaWdnZXJDbGFzcyk7XG5cbiAgICAvL2hlbHBlciB2YXJpYWJsZXMgdG8gdHJhY2sgbW92ZW1lbnQgb24gY29sbGlzaW9uc1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdyYWJzIHRoZSBjdXJyZW50IHBvc2l0aW9uaW5nIGNsYXNzLCBpZiBwcmVzZW50LCBhbmQgcmV0dXJucyB0aGUgdmFsdWUgb3IgYW4gZW1wdHkgc3RyaW5nLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldFBvc2l0aW9uQ2xhc3MoZWxlbWVudCkge1xuICAgIGlmICghZWxlbWVudCkgeyByZXR1cm4gJyc7IH1cbiAgICAvLyB2YXIgcG9zaXRpb24gPSBlbGVtZW50LmF0dHIoJ2NsYXNzJykubWF0Y2goL3RvcHxsZWZ0fHJpZ2h0L2cpO1xuICAgIHZhciBwb3NpdGlvbiA9IGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC9cXGIodG9wfGxlZnR8cmlnaHQpXFxiL2cpO1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uID8gcG9zaXRpb25bMF0gOiAnJztcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH07XG4gIC8qKlxuICAgKiBidWlsZHMgdGhlIHRvb2x0aXAgZWxlbWVudCwgYWRkcyBhdHRyaWJ1dGVzLCBhbmQgcmV0dXJucyB0aGUgdGVtcGxhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYnVpbGRUZW1wbGF0ZShpZCkge1xuICAgIHZhciB0ZW1wbGF0ZUNsYXNzZXMgPSAoYCR7dGhpcy5vcHRpb25zLnRvb2x0aXBDbGFzc30gJHt0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzc30gJHt0aGlzLm9wdGlvbnMudGVtcGxhdGVDbGFzc2VzfWApLnRyaW0oKTtcbiAgICB2YXIgJHRlbXBsYXRlID0gICQoJzxkaXY+PC9kaXY+JykuYWRkQ2xhc3ModGVtcGxhdGVDbGFzc2VzKS5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3Rvb2x0aXAnLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgcmV0dXJuICR0ZW1wbGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbmluZyBjbGFzcyB0byB0cnlcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcblxuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXG4gICAgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzZXRzIHRoZSBwb3NpdGlvbiBjbGFzcyBvZiBhbiBlbGVtZW50IGFuZCByZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdW50aWwgdGhlcmUgYXJlIG5vIG1vcmUgcG9zc2libGUgcG9zaXRpb25zIHRvIGF0dGVtcHQsIG9yIHRoZSB0b29sdGlwIGVsZW1lbnQgaXMgbm8gbG9uZ2VyIGNvbGxpZGluZy5cbiAgICogaWYgdGhlIHRvb2x0aXAgaXMgbGFyZ2VyIHRoYW4gdGhlIHNjcmVlbiB3aWR0aCwgZGVmYXVsdCB0byBmdWxsIHdpZHRoIC0gYW55IHVzZXIgc2VsZWN0ZWQgbWFyZ2luXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0UG9zaXRpb24oKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyh0aGlzLnRlbXBsYXRlKSxcbiAgICAgICAgJHRpcERpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkYW5jaG9yRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kZWxlbWVudCksXG4gICAgICAgIGRpcmVjdGlvbiA9IChwb3NpdGlvbiA9PT0gJ2xlZnQnID8gJ2xlZnQnIDogKChwb3NpdGlvbiA9PT0gJ3JpZ2h0JykgPyAnbGVmdCcgOiAndG9wJykpLFxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgb2Zmc2V0ID0gKHBhcmFtID09PSAnaGVpZ2h0JykgPyB0aGlzLm9wdGlvbnMudk9mZnNldCA6IHRoaXMub3B0aW9ucy5oT2Zmc2V0LFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoKCR0aXBEaW1zLndpZHRoID49ICR0aXBEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAvLyB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkYW5jaG9yRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwnY2VudGVyICcgKyAocG9zaXRpb24gfHwgJ2JvdHRvbScpLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcblxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpICYmIHRoaXMuY291bnRlcikge1xuICAgICAgdGhpcy5fcmVwb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiByZXZlYWxzIHRoZSB0b29sdGlwLCBhbmQgZmlyZXMgYW4gZXZlbnQgdG8gY2xvc2UgYW55IG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICogQGZpcmVzIFRvb2x0aXAjY2xvc2VtZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2hvdygpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dPbiAhPT0gJ2FsbCcgJiYgIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5zaG93T24pKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKCdUaGUgc2NyZWVuIGlzIHRvbyBzbWFsbCB0byBkaXNwbGF5IHRoaXMgdG9vbHRpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuc2hvdygpO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBhbGwgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYudG9vbHRpcCcsIHRoaXMudGVtcGxhdGUuYXR0cignaWQnKSk7XG5cblxuICAgIHRoaXMudGVtcGxhdGUuYXR0cih7XG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2VcbiAgICB9KTtcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy50ZW1wbGF0ZSk7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuaGlkZSgpLmNzcygndmlzaWJpbGl0eScsICcnKS5mYWRlSW4odGhpcy5vcHRpb25zLmZhZGVJbkR1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxuICAgICAqIEBldmVudCBUb29sdGlwI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBjdXJyZW50IHRvb2x0aXAsIGFuZCByZXNldHMgdGhlIHBvc2l0aW9uaW5nIGNsYXNzIGlmIGl0IHdhcyBjaGFuZ2VkIGR1ZSB0byBjb2xsaXNpb25cbiAgICogQGZpcmVzIFRvb2x0aXAjaGlkZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZVxuICAgIH0pLmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVPdXREdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgaWYgKF90aGlzLmNsYXNzQ2hhbmdlZCkge1xuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxuICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhfdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyhfdGhpcy50ZW1wbGF0ZSkpXG4gICAgICAgICAgICAgLmFkZENsYXNzKF90aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICBfdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgICAgX3RoaXMuY291bnRlciA9IDQ7XG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogZmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBoaWRkZW5cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNoaWRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgdGhlIHRvb2x0aXAgYW5kIGl0cyBhbmNob3JcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICR0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXIuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICBpZiAoIWlzRm9jdXMgfHwgKF90aGlzLmlzQ2xpY2sgJiYgIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xuICAgICAgICAgIC8vIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoKF90aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyIHx8ICFfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpKSAmJiAhX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRm9yVG91Y2gpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgX3RoaXMuaXNBY3RpdmUgPyBfdGhpcy5oaWRlKCkgOiBfdGhpcy5zaG93KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAvLyAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSB0cnVlO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxuICAgICAgICAgIC8vIGEgcmVhbCBmb2N1cywgb3RoZXJ3aXNlIG9uIGhvdmVyIGFuZCBjb21lIGJhY2sgd2UgZ2V0IGJhZCBiZWhhdmlvclxuICAgICAgICAgIGlmKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyBpc0ZvY3VzID0gZmFsc2U7IH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICB9KVxuXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgYSB0b2dnbGUgbWV0aG9kLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhdGljIHNob3coKSAmIGhpZGUoKSBmdW5jdGlvbnNcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgdG9vbHRpcCwgcmVtb3ZlcyB0ZW1wbGF0ZSBlbGVtZW50IGZyb20gdGhlIHZpZXcuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXG4gICAgICAgICAgICAgICAgIC5vZmYoJy56Zi50cmlnZ2VyIC56Zi50b290aXAnKVxuICAgICAgICAgICAgICAgIC8vICAucmVtb3ZlQ2xhc3MoJ2hhcy10aXAnKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1kZXNjcmliZWRieScpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXlldGktYm94JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9nZ2xlJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcmVzaXplJyk7XG5cbiAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZSgpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvb2x0aXAuZGVmYXVsdHMgPSB7XG4gIGRpc2FibGVGb3JUb3VjaDogZmFsc2UsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYmVmb3JlIGEgdG9vbHRpcCBzaG91bGQgb3BlbiBvbiBob3Zlci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDIwMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBpbnRvIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTUwXG4gICAqL1xuICBmYWRlSW5EdXJhdGlvbjogMTUwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIG91dCBvZiB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDE1MFxuICAgKi9cbiAgZmFkZU91dER1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBEaXNhYmxlcyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHRoZSB0b29sdGlwIGlmIHNldCB0byB0cnVlXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBPcHRpb25hbCBhZGR0aW9uYWwgY2xhc3NlcyB0byBhcHBseSB0byB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBpbml0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdteS1jb29sLXRpcC1jbGFzcydcbiAgICovXG4gIHRlbXBsYXRlQ2xhc3NlczogJycsXG4gIC8qKlxuICAgKiBOb24tb3B0aW9uYWwgY2xhc3MgYWRkZWQgdG8gdG9vbHRpcCB0ZW1wbGF0ZXMuIEZvdW5kYXRpb24gZGVmYXVsdCBpcyAndG9vbHRpcCcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3Rvb2x0aXAnXG4gICAqL1xuICB0b29sdGlwQ2xhc3M6ICd0b29sdGlwJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIHRvb2x0aXAgYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2hhcy10aXAnXG4gICAqL1xuICB0cmlnZ2VyQ2xhc3M6ICdoYXMtdGlwJyxcbiAgLyoqXG4gICAqIE1pbmltdW0gYnJlYWtwb2ludCBzaXplIGF0IHdoaWNoIHRvIG9wZW4gdGhlIHRvb2x0aXAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NtYWxsJ1xuICAgKi9cbiAgc2hvd09uOiAnc21hbGwnLFxuICAvKipcbiAgICogQ3VzdG9tIHRlbXBsYXRlIHRvIGJlIHVzZWQgdG8gZ2VuZXJhdGUgbWFya3VwIGZvciB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcmbHQ7ZGl2IGNsYXNzPVwidG9vbHRpcFwiJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIHRlbXBsYXRlOiAnJyxcbiAgLyoqXG4gICAqIFRleHQgZGlzcGxheWVkIGluIHRoZSB0b29sdGlwIHRlbXBsYXRlIG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ1NvbWUgY29vbCBzcGFjZSBmYWN0IGhlcmUuJ1xuICAgKi9cbiAgdGlwVGV4dDogJycsXG4gIHRvdWNoQ2xvc2VUZXh0OiAnVGFwIHRvIGNsb3NlLicsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja09wZW46IHRydWUsXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIHBvc2l0aW9uaW5nIGNsYXNzZXMsIHNldCBieSB0aGUgSlNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFkgYXhpcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgdk9mZnNldDogMTAsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFggYXhpcywgaWYgYWxpZ25lZCB0byBhIHNpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTJcbiAgICovXG4gIGhPZmZzZXQ6IDEyXG59O1xuXG4vKipcbiAqIFRPRE8gdXRpbGl6ZSByZXNpemUgZXZlbnQgdHJpZ2dlclxuICovXG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihUb29sdGlwLCAnVG9vbHRpcCcpO1xuXG59KGpRdWVyeSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cpXG4gICAgRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG59KSgpO1xuXG52YXIgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG4vLyBGaW5kIHRoZSByaWdodCBcInRyYW5zaXRpb25lbmRcIiBldmVudCBmb3IgdGhpcyBicm93c2VyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gIH1cbiAgdmFyIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cmFuc2l0aW9uc1t0XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgaWYgKGVuZEV2ZW50ID09PSBudWxsKSB7XG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XG4gICAgY2IoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuICBlbGVtZW50LmFkZENsYXNzKGFuaW1hdGlvbik7XG4gIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudC5jc3MoJ3RyYW5zaXRpb24nLCAnJyk7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZSgndHJhbnNpdGlvbmVuZCcsIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoaW5pdENsYXNzICsgJyAnICsgYWN0aXZlQ2xhc3MgKyAnICcgKyBhbmltYXRpb24pO1xuICB9XG59XG5cbnZhciBNb3Rpb25VSSA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cbiIsInZhciBvYmplY3RGaXRJbWFnZXM9ZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQpe2Zvcih2YXIgZSxyPWdldENvbXB1dGVkU3R5bGUodCkuZm9udEZhbWlseSxpPXt9O251bGwhPT0oZT1uLmV4ZWMocikpOylpW2VbMV1dPWVbMl07cmV0dXJuIGl9ZnVuY3Rpb24gZShlLGkpe2lmKCFlW2NdLnBhcnNpbmdTcmNzZXQpe3ZhciBzPXQoZSk7aWYoc1tcIm9iamVjdC1maXRcIl09c1tcIm9iamVjdC1maXRcIl18fFwiZmlsbFwiLCFlW2NdLnMpe2lmKFwiZmlsbFwiPT09c1tcIm9iamVjdC1maXRcIl0pcmV0dXJuO2lmKCFlW2NdLnNraXBUZXN0JiZsJiYhc1tcIm9iamVjdC1wb3NpdGlvblwiXSlyZXR1cm59dmFyIG49ZVtjXS5pb3M3c3JjfHxlLmN1cnJlbnRTcmN8fGUuc3JjO2lmKGkpbj1pO2Vsc2UgaWYoZS5zcmNzZXQmJiFhJiZ3aW5kb3cucGljdHVyZWZpbGwpe3ZhciBvPXdpbmRvdy5waWN0dXJlZmlsbC5fLm5zO2VbY10ucGFyc2luZ1NyY3NldD0hMCxlW29dJiZlW29dLmV2YWxlZHx8d2luZG93LnBpY3R1cmVmaWxsLl8uZmlsbEltZyhlLHtyZXNlbGVjdDohMH0pLGVbb10uY3VyU3JjfHwoZVtvXS5zdXBwb3J0ZWQ9ITEsd2luZG93LnBpY3R1cmVmaWxsLl8uZmlsbEltZyhlLHtyZXNlbGVjdDohMH0pKSxkZWxldGUgZVtjXS5wYXJzaW5nU3Jjc2V0LG49ZVtvXS5jdXJTcmN8fG59aWYoZVtjXS5zKWVbY10ucz1uLGkmJihlW2NdLnNyY0F0dHI9aSk7ZWxzZXtlW2NdPXtzOm4sc3JjQXR0cjppfHxmLmNhbGwoZSxcInNyY1wiKSxzcmNzZXRBdHRyOmUuc3Jjc2V0fSxlLnNyYz1jO3RyeXtlLnNyY3NldCYmKGUuc3Jjc2V0PVwiXCIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsXCJzcmNzZXRcIix7dmFsdWU6ZVtjXS5zcmNzZXRBdHRyfSkpLHIoZSl9Y2F0Y2godCl7ZVtjXS5pb3M3c3JjPW59fWUuc3R5bGUuYmFja2dyb3VuZEltYWdlPSd1cmwoXCInK24rJ1wiKScsZS5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb249c1tcIm9iamVjdC1wb3NpdGlvblwiXXx8XCJjZW50ZXJcIixlLnN0eWxlLmJhY2tncm91bmRSZXBlYXQ9XCJuby1yZXBlYXRcIiwvc2NhbGUtZG93bi8udGVzdChzW1wib2JqZWN0LWZpdFwiXSk/KGVbY10uaXx8KGVbY10uaT1uZXcgSW1hZ2UsZVtjXS5pLnNyYz1uKSxmdW5jdGlvbiB0KCl7cmV0dXJuIGVbY10uaS5uYXR1cmFsV2lkdGg/dm9pZChlW2NdLmkubmF0dXJhbFdpZHRoPmUud2lkdGh8fGVbY10uaS5uYXR1cmFsSGVpZ2h0PmUuaGVpZ2h0P2Uuc3R5bGUuYmFja2dyb3VuZFNpemU9XCJjb250YWluXCI6ZS5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT1cImF1dG9cIik6dm9pZCBzZXRUaW1lb3V0KHQsMTAwKX0oKSk6ZS5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT1zW1wib2JqZWN0LWZpdFwiXS5yZXBsYWNlKFwibm9uZVwiLFwiYXV0b1wiKS5yZXBsYWNlKFwiZmlsbFwiLFwiMTAwJSAxMDAlXCIpfX1mdW5jdGlvbiByKHQpe3ZhciByPXtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdFtjXS5zfSxzZXQ6ZnVuY3Rpb24ocil7cmV0dXJuIGRlbGV0ZSB0W2NdLmksZSh0LHIpLHJ9fTtPYmplY3QuZGVmaW5lUHJvcGVydHkodCxcInNyY1wiLHIpLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LFwiY3VycmVudFNyY1wiLHtnZXQ6ci5nZXR9KX1mdW5jdGlvbiBpKCl7dXx8KEhUTUxJbWFnZUVsZW1lbnQucHJvdG90eXBlLmdldEF0dHJpYnV0ZT1mdW5jdGlvbih0KXtyZXR1cm4hdGhpc1tjXXx8XCJzcmNcIiE9PXQmJlwic3Jjc2V0XCIhPT10P2YuY2FsbCh0aGlzLHQpOnRoaXNbY11bdCtcIkF0dHJcIl19LEhUTUxJbWFnZUVsZW1lbnQucHJvdG90eXBlLnNldEF0dHJpYnV0ZT1mdW5jdGlvbih0LGUpeyF0aGlzW2NdfHxcInNyY1wiIT09dCYmXCJzcmNzZXRcIiE9PXQ/Zy5jYWxsKHRoaXMsdCxlKTp0aGlzW1wic3JjXCI9PT10P1wic3JjXCI6dCtcIkF0dHJcIl09U3RyaW5nKGUpfSl9ZnVuY3Rpb24gcyh0LHIpe3ZhciBpPSFBJiYhdDtpZihyPXJ8fHt9LHQ9dHx8XCJpbWdcIix1JiYhci5za2lwVGVzdClyZXR1cm4hMTtcInN0cmluZ1wiPT10eXBlb2YgdD90PWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIik6dC5sZW5ndGh8fCh0PVt0XSk7Zm9yKHZhciBuPTA7bjx0Lmxlbmd0aDtuKyspdFtuXVtjXT10W25dW2NdfHxyLGUodFtuXSk7aSYmKGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIixmdW5jdGlvbih0KXtcIklNR1wiPT09dC50YXJnZXQudGFnTmFtZSYmcyh0LnRhcmdldCx7c2tpcFRlc3Q6ci5za2lwVGVzdH0pfSwhMCksQT0hMCx0PVwiaW1nXCIpLHIud2F0Y2hNUSYmd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIixzLmJpbmQobnVsbCx0LHtza2lwVGVzdDpyLnNraXBUZXN0fSkpfXZhciBjPVwiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoQVFBQkFJQUFBUC8vL3dBQUFDSDVCQUVBQUFBQUxBQUFBQUFCQUFFQUFBSUNSQUVBT3c9PVwiLG49LyhvYmplY3QtZml0fG9iamVjdC1wb3NpdGlvbilcXHMqOlxccyooWy1cXHdcXHMlXSspL2csbz1uZXcgSW1hZ2UsbD1cIm9iamVjdC1maXRcImluIG8uc3R5bGUsdT1cIm9iamVjdC1wb3NpdGlvblwiaW4gby5zdHlsZSxhPVwic3RyaW5nXCI9PXR5cGVvZiBvLmN1cnJlbnRTcmMsZj1vLmdldEF0dHJpYnV0ZSxnPW8uc2V0QXR0cmlidXRlLEE9ITE7cmV0dXJuIHMuc3VwcG9ydHNPYmplY3RGaXQ9bCxzLnN1cHBvcnRzT2JqZWN0UG9zaXRpb249dSxpKCksc30oKTsiLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcbmpRdWVyeSggJ2lmcmFtZVtzcmMqPVwidmltZW8uY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbiB2aW1lbycvPlwiKTtcbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLyohLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogSW5zdGFudCBDb21tZW50IFZhbGlkYXRpb24gLSB2MS4wIC0gMzAvNi8yMDE0XG4gKiBodHRwOi8vd29yZHByZXNzLm9yZy9wbHVnaW5zL2luc3RhbnQtY29tbWVudC12YWxpZGF0aW9uL1xuICogQ29weXJpZ2h0IChjKSAyMDE0IE1yaW5hbCBLYW50aSBSb3k7IExpY2Vuc2U6IEdQTHYyIG9yIGxhdGVyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xualF1ZXJ5LnZhbGlkYXRvci5hZGRNZXRob2QoXCJiZXR0ZXJfZW1haWxcIiwgZnVuY3Rpb24odmFsdWUsIGVsZW1lbnQpIHtcbiAgLy8gYSBiZXR0ZXIgKGJ1dCBub3QgMTAwJSBwZXJmZWN0KSBlbWFpbCB2YWxpZGF0aW9uXG4gIHJldHVybiB0aGlzLm9wdGlvbmFsKCBlbGVtZW50ICkgfHwgL14oW2EtekEtWjAtOV8uKy1dKStcXEAoKFthLXpBLVowLTktXSkrXFwuKSsoW2EtekEtWjAtOV17Miw0fSkrJC8udGVzdCggdmFsdWUgKTtcbn0sICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLicpO1xuXG5qUXVlcnkoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCQpIHtcblx0JCgnI2NvbW1lbnRmb3JtJykudmFsaWRhdGUoe1x0IFxuXHRcdHJ1bGVzOiB7XG5cdFx0ICBhdXRob3I6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9LFx0XHQgXG5cdFx0ICBlbWFpbDoge1xuXHRcdFx0cmVxdWlyZWQ6IHRydWUsXG5cdFx0XHRlbWFpbDogdHJ1ZVxuXHRcdCAgfSxcblx0XHQgIGNvbW1lbnQ6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9XG5cdFx0fSxcdFx0IFxuXHRcdG1lc3NhZ2VzOiB7XG5cdFx0ICBhdXRob3I6IFwiUGxlYXNlIGVudGVyIHlvdXIgbmFtZVwiLFxuXHRcdCAgZW1haWw6IFwiUGxlYXNlIGVudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzc1wiLFxuXHRcdCAgY29tbWVudDogXCJQbGVhc2UgdHlwZSB5b3VyIGNvbW1lbnRcIlxuXHRcdH0sXHRcdCBcblx0XHRlcnJvckVsZW1lbnQ6IFwiZGl2XCIsXG5cdFx0ZXJyb3JQbGFjZW1lbnQ6IGZ1bmN0aW9uKGVycm9yLCBlbGVtZW50KSB7XG5cdFx0ICBlbGVtZW50LmFmdGVyKGVycm9yKTtcblx0XHR9XHQgXG5cdH0pO1xufSk7XG4iLCIvKiEtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBqUXVlcnkgVmFsaWRhdGlvbiBQbHVnaW4gLSB2MS4xMi4wIC0gNC8xLzIwMTRcbiAqIGh0dHA6Ly9qcXVlcnl2YWxpZGF0aW9uLm9yZy9cbiAqIENvcHlyaWdodCAoYykgMjAxNCBKw4PCtnJuIFphZWZmZXJlcjsgTGljZW5zZWQgTUlUIFxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbiFmdW5jdGlvbihhKXthLmV4dGVuZChhLmZuLHt2YWxpZGF0ZTpmdW5jdGlvbihiKXtpZighdGhpcy5sZW5ndGgpcmV0dXJuIHZvaWQoYiYmYi5kZWJ1ZyYmd2luZG93LmNvbnNvbGUmJmNvbnNvbGUud2FybihcIk5vdGhpbmcgc2VsZWN0ZWQsIGNhbid0IHZhbGlkYXRlLCByZXR1cm5pbmcgbm90aGluZy5cIikpO3ZhciBjPWEuZGF0YSh0aGlzWzBdLFwidmFsaWRhdG9yXCIpO3JldHVybiBjP2M6KHRoaXMuYXR0cihcIm5vdmFsaWRhdGVcIixcIm5vdmFsaWRhdGVcIiksYz1uZXcgYS52YWxpZGF0b3IoYix0aGlzWzBdKSxhLmRhdGEodGhpc1swXSxcInZhbGlkYXRvclwiLGMpLGMuc2V0dGluZ3Mub25zdWJtaXQmJih0aGlzLnZhbGlkYXRlRGVsZWdhdGUoXCI6c3VibWl0XCIsXCJjbGlja1wiLGZ1bmN0aW9uKGIpe2Muc2V0dGluZ3Muc3VibWl0SGFuZGxlciYmKGMuc3VibWl0QnV0dG9uPWIudGFyZ2V0KSxhKGIudGFyZ2V0KS5oYXNDbGFzcyhcImNhbmNlbFwiKSYmKGMuY2FuY2VsU3VibWl0PSEwKSx2b2lkIDAhPT1hKGIudGFyZ2V0KS5hdHRyKFwiZm9ybW5vdmFsaWRhdGVcIikmJihjLmNhbmNlbFN1Ym1pdD0hMCl9KSx0aGlzLnN1Ym1pdChmdW5jdGlvbihiKXtmdW5jdGlvbiBkKCl7dmFyIGQ7cmV0dXJuIGMuc2V0dGluZ3Muc3VibWl0SGFuZGxlcj8oYy5zdWJtaXRCdXR0b24mJihkPWEoXCI8aW5wdXQgdHlwZT0naGlkZGVuJy8+XCIpLmF0dHIoXCJuYW1lXCIsYy5zdWJtaXRCdXR0b24ubmFtZSkudmFsKGEoYy5zdWJtaXRCdXR0b24pLnZhbCgpKS5hcHBlbmRUbyhjLmN1cnJlbnRGb3JtKSksYy5zZXR0aW5ncy5zdWJtaXRIYW5kbGVyLmNhbGwoYyxjLmN1cnJlbnRGb3JtLGIpLGMuc3VibWl0QnV0dG9uJiZkLnJlbW92ZSgpLCExKTohMH1yZXR1cm4gYy5zZXR0aW5ncy5kZWJ1ZyYmYi5wcmV2ZW50RGVmYXVsdCgpLGMuY2FuY2VsU3VibWl0PyhjLmNhbmNlbFN1Ym1pdD0hMSxkKCkpOmMuZm9ybSgpP2MucGVuZGluZ1JlcXVlc3Q/KGMuZm9ybVN1Ym1pdHRlZD0hMCwhMSk6ZCgpOihjLmZvY3VzSW52YWxpZCgpLCExKX0pKSxjKX0sdmFsaWQ6ZnVuY3Rpb24oKXt2YXIgYixjO3JldHVybiBhKHRoaXNbMF0pLmlzKFwiZm9ybVwiKT9iPXRoaXMudmFsaWRhdGUoKS5mb3JtKCk6KGI9ITAsYz1hKHRoaXNbMF0uZm9ybSkudmFsaWRhdGUoKSx0aGlzLmVhY2goZnVuY3Rpb24oKXtiPWMuZWxlbWVudCh0aGlzKSYmYn0pKSxifSxyZW1vdmVBdHRyczpmdW5jdGlvbihiKXt2YXIgYz17fSxkPXRoaXM7cmV0dXJuIGEuZWFjaChiLnNwbGl0KC9cXHMvKSxmdW5jdGlvbihhLGIpe2NbYl09ZC5hdHRyKGIpLGQucmVtb3ZlQXR0cihiKX0pLGN9LHJ1bGVzOmZ1bmN0aW9uKGIsYyl7dmFyIGQsZSxmLGcsaCxpLGo9dGhpc1swXTtpZihiKXN3aXRjaChkPWEuZGF0YShqLmZvcm0sXCJ2YWxpZGF0b3JcIikuc2V0dGluZ3MsZT1kLnJ1bGVzLGY9YS52YWxpZGF0b3Iuc3RhdGljUnVsZXMoaiksYil7Y2FzZVwiYWRkXCI6YS5leHRlbmQoZixhLnZhbGlkYXRvci5ub3JtYWxpemVSdWxlKGMpKSxkZWxldGUgZi5tZXNzYWdlcyxlW2oubmFtZV09ZixjLm1lc3NhZ2VzJiYoZC5tZXNzYWdlc1tqLm5hbWVdPWEuZXh0ZW5kKGQubWVzc2FnZXNbai5uYW1lXSxjLm1lc3NhZ2VzKSk7YnJlYWs7Y2FzZVwicmVtb3ZlXCI6cmV0dXJuIGM/KGk9e30sYS5lYWNoKGMuc3BsaXQoL1xccy8pLGZ1bmN0aW9uKGIsYyl7aVtjXT1mW2NdLGRlbGV0ZSBmW2NdLFwicmVxdWlyZWRcIj09PWMmJmEoaikucmVtb3ZlQXR0cihcImFyaWEtcmVxdWlyZWRcIil9KSxpKTooZGVsZXRlIGVbai5uYW1lXSxmKX1yZXR1cm4gZz1hLnZhbGlkYXRvci5ub3JtYWxpemVSdWxlcyhhLmV4dGVuZCh7fSxhLnZhbGlkYXRvci5jbGFzc1J1bGVzKGopLGEudmFsaWRhdG9yLmF0dHJpYnV0ZVJ1bGVzKGopLGEudmFsaWRhdG9yLmRhdGFSdWxlcyhqKSxhLnZhbGlkYXRvci5zdGF0aWNSdWxlcyhqKSksaiksZy5yZXF1aXJlZCYmKGg9Zy5yZXF1aXJlZCxkZWxldGUgZy5yZXF1aXJlZCxnPWEuZXh0ZW5kKHtyZXF1aXJlZDpofSxnKSxhKGopLmF0dHIoXCJhcmlhLXJlcXVpcmVkXCIsXCJ0cnVlXCIpKSxnLnJlbW90ZSYmKGg9Zy5yZW1vdGUsZGVsZXRlIGcucmVtb3RlLGc9YS5leHRlbmQoZyx7cmVtb3RlOmh9KSksZ319KSxhLmV4dGVuZChhLmV4cHJbXCI6XCJdLHtibGFuazpmdW5jdGlvbihiKXtyZXR1cm4hYS50cmltKFwiXCIrYShiKS52YWwoKSl9LGZpbGxlZDpmdW5jdGlvbihiKXtyZXR1cm4hIWEudHJpbShcIlwiK2EoYikudmFsKCkpfSx1bmNoZWNrZWQ6ZnVuY3Rpb24oYil7cmV0dXJuIWEoYikucHJvcChcImNoZWNrZWRcIil9fSksYS52YWxpZGF0b3I9ZnVuY3Rpb24oYixjKXt0aGlzLnNldHRpbmdzPWEuZXh0ZW5kKCEwLHt9LGEudmFsaWRhdG9yLmRlZmF1bHRzLGIpLHRoaXMuY3VycmVudEZvcm09Yyx0aGlzLmluaXQoKX0sYS52YWxpZGF0b3IuZm9ybWF0PWZ1bmN0aW9uKGIsYyl7cmV0dXJuIDE9PT1hcmd1bWVudHMubGVuZ3RoP2Z1bmN0aW9uKCl7dmFyIGM9YS5tYWtlQXJyYXkoYXJndW1lbnRzKTtyZXR1cm4gYy51bnNoaWZ0KGIpLGEudmFsaWRhdG9yLmZvcm1hdC5hcHBseSh0aGlzLGMpfTooYXJndW1lbnRzLmxlbmd0aD4yJiZjLmNvbnN0cnVjdG9yIT09QXJyYXkmJihjPWEubWFrZUFycmF5KGFyZ3VtZW50cykuc2xpY2UoMSkpLGMuY29uc3RydWN0b3IhPT1BcnJheSYmKGM9W2NdKSxhLmVhY2goYyxmdW5jdGlvbihhLGMpe2I9Yi5yZXBsYWNlKG5ldyBSZWdFeHAoXCJcXFxce1wiK2ErXCJcXFxcfVwiLFwiZ1wiKSxmdW5jdGlvbigpe3JldHVybiBjfSl9KSxiKX0sYS5leHRlbmQoYS52YWxpZGF0b3Ise2RlZmF1bHRzOnttZXNzYWdlczp7fSxncm91cHM6e30scnVsZXM6e30sZXJyb3JDbGFzczpcImVycm9yXCIsdmFsaWRDbGFzczpcInZhbGlkXCIsZXJyb3JFbGVtZW50OlwibGFiZWxcIixmb2N1c0ludmFsaWQ6ITAsZXJyb3JDb250YWluZXI6YShbXSksZXJyb3JMYWJlbENvbnRhaW5lcjphKFtdKSxvbnN1Ym1pdDohMCxpZ25vcmU6XCI6aGlkZGVuXCIsaWdub3JlVGl0bGU6ITEsb25mb2N1c2luOmZ1bmN0aW9uKGEpe3RoaXMubGFzdEFjdGl2ZT1hLHRoaXMuc2V0dGluZ3MuZm9jdXNDbGVhbnVwJiYhdGhpcy5ibG9ja0ZvY3VzQ2xlYW51cCYmKHRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQmJnRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQuY2FsbCh0aGlzLGEsdGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyksdGhpcy5hZGRXcmFwcGVyKHRoaXMuZXJyb3JzRm9yKGEpKS5oaWRlKCkpfSxvbmZvY3Vzb3V0OmZ1bmN0aW9uKGEpe3RoaXMuY2hlY2thYmxlKGEpfHwhKGEubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZCkmJnRoaXMub3B0aW9uYWwoYSl8fHRoaXMuZWxlbWVudChhKX0sb25rZXl1cDpmdW5jdGlvbihhLGIpeyg5IT09Yi53aGljaHx8XCJcIiE9PXRoaXMuZWxlbWVudFZhbHVlKGEpKSYmKGEubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZHx8YT09PXRoaXMubGFzdEVsZW1lbnQpJiZ0aGlzLmVsZW1lbnQoYSl9LG9uY2xpY2s6ZnVuY3Rpb24oYSl7YS5uYW1lIGluIHRoaXMuc3VibWl0dGVkP3RoaXMuZWxlbWVudChhKTphLnBhcmVudE5vZGUubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZCYmdGhpcy5lbGVtZW50KGEucGFyZW50Tm9kZSl9LGhpZ2hsaWdodDpmdW5jdGlvbihiLGMsZCl7XCJyYWRpb1wiPT09Yi50eXBlP3RoaXMuZmluZEJ5TmFtZShiLm5hbWUpLmFkZENsYXNzKGMpLnJlbW92ZUNsYXNzKGQpOmEoYikuYWRkQ2xhc3MoYykucmVtb3ZlQ2xhc3MoZCl9LHVuaGlnaGxpZ2h0OmZ1bmN0aW9uKGIsYyxkKXtcInJhZGlvXCI9PT1iLnR5cGU/dGhpcy5maW5kQnlOYW1lKGIubmFtZSkucmVtb3ZlQ2xhc3MoYykuYWRkQ2xhc3MoZCk6YShiKS5yZW1vdmVDbGFzcyhjKS5hZGRDbGFzcyhkKX19LHNldERlZmF1bHRzOmZ1bmN0aW9uKGIpe2EuZXh0ZW5kKGEudmFsaWRhdG9yLmRlZmF1bHRzLGIpfSxtZXNzYWdlczp7cmVxdWlyZWQ6XCJUaGlzIGZpZWxkIGlzIHJlcXVpcmVkLlwiLHJlbW90ZTpcIlBsZWFzZSBmaXggdGhpcyBmaWVsZC5cIixlbWFpbDpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIGVtYWlsIGFkZHJlc3MuXCIsdXJsOlwiUGxlYXNlIGVudGVyIGEgdmFsaWQgVVJMLlwiLGRhdGU6XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBkYXRlLlwiLGRhdGVJU086XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBkYXRlIChJU08pLlwiLG51bWJlcjpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIG51bWJlci5cIixkaWdpdHM6XCJQbGVhc2UgZW50ZXIgb25seSBkaWdpdHMuXCIsY3JlZGl0Y2FyZDpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIGNyZWRpdCBjYXJkIG51bWJlci5cIixlcXVhbFRvOlwiUGxlYXNlIGVudGVyIHRoZSBzYW1lIHZhbHVlIGFnYWluLlwiLG1heGxlbmd0aDphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgbm8gbW9yZSB0aGFuIHswfSBjaGFyYWN0ZXJzLlwiKSxtaW5sZW5ndGg6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGF0IGxlYXN0IHswfSBjaGFyYWN0ZXJzLlwiKSxyYW5nZWxlbmd0aDphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYSB2YWx1ZSBiZXR3ZWVuIHswfSBhbmQgezF9IGNoYXJhY3RlcnMgbG9uZy5cIikscmFuZ2U6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGEgdmFsdWUgYmV0d2VlbiB7MH0gYW5kIHsxfS5cIiksbWF4OmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBhIHZhbHVlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7MH0uXCIpLG1pbjphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYSB2YWx1ZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gezB9LlwiKX0sYXV0b0NyZWF0ZVJhbmdlczohMSxwcm90b3R5cGU6e2luaXQ6ZnVuY3Rpb24oKXtmdW5jdGlvbiBiKGIpe3ZhciBjPWEuZGF0YSh0aGlzWzBdLmZvcm0sXCJ2YWxpZGF0b3JcIiksZD1cIm9uXCIrYi50eXBlLnJlcGxhY2UoL152YWxpZGF0ZS8sXCJcIiksZT1jLnNldHRpbmdzO2VbZF0mJiF0aGlzLmlzKGUuaWdub3JlKSYmZVtkXS5jYWxsKGMsdGhpc1swXSxiKX10aGlzLmxhYmVsQ29udGFpbmVyPWEodGhpcy5zZXR0aW5ncy5lcnJvckxhYmVsQ29udGFpbmVyKSx0aGlzLmVycm9yQ29udGV4dD10aGlzLmxhYmVsQ29udGFpbmVyLmxlbmd0aCYmdGhpcy5sYWJlbENvbnRhaW5lcnx8YSh0aGlzLmN1cnJlbnRGb3JtKSx0aGlzLmNvbnRhaW5lcnM9YSh0aGlzLnNldHRpbmdzLmVycm9yQ29udGFpbmVyKS5hZGQodGhpcy5zZXR0aW5ncy5lcnJvckxhYmVsQ29udGFpbmVyKSx0aGlzLnN1Ym1pdHRlZD17fSx0aGlzLnZhbHVlQ2FjaGU9e30sdGhpcy5wZW5kaW5nUmVxdWVzdD0wLHRoaXMucGVuZGluZz17fSx0aGlzLmludmFsaWQ9e30sdGhpcy5yZXNldCgpO3ZhciBjLGQ9dGhpcy5ncm91cHM9e307YS5lYWNoKHRoaXMuc2V0dGluZ3MuZ3JvdXBzLGZ1bmN0aW9uKGIsYyl7XCJzdHJpbmdcIj09dHlwZW9mIGMmJihjPWMuc3BsaXQoL1xccy8pKSxhLmVhY2goYyxmdW5jdGlvbihhLGMpe2RbY109Yn0pfSksYz10aGlzLnNldHRpbmdzLnJ1bGVzLGEuZWFjaChjLGZ1bmN0aW9uKGIsZCl7Y1tiXT1hLnZhbGlkYXRvci5ub3JtYWxpemVSdWxlKGQpfSksYSh0aGlzLmN1cnJlbnRGb3JtKS52YWxpZGF0ZURlbGVnYXRlKFwiOnRleHQsIFt0eXBlPSdwYXNzd29yZCddLCBbdHlwZT0nZmlsZSddLCBzZWxlY3QsIHRleHRhcmVhLCBbdHlwZT0nbnVtYmVyJ10sIFt0eXBlPSdzZWFyY2gnXSAsW3R5cGU9J3RlbCddLCBbdHlwZT0ndXJsJ10sIFt0eXBlPSdlbWFpbCddLCBbdHlwZT0nZGF0ZXRpbWUnXSwgW3R5cGU9J2RhdGUnXSwgW3R5cGU9J21vbnRoJ10sIFt0eXBlPSd3ZWVrJ10sIFt0eXBlPSd0aW1lJ10sIFt0eXBlPSdkYXRldGltZS1sb2NhbCddLCBbdHlwZT0ncmFuZ2UnXSwgW3R5cGU9J2NvbG9yJ10gXCIsXCJmb2N1c2luIGZvY3Vzb3V0IGtleXVwXCIsYikudmFsaWRhdGVEZWxlZ2F0ZShcIlt0eXBlPSdyYWRpbyddLCBbdHlwZT0nY2hlY2tib3gnXSwgc2VsZWN0LCBvcHRpb25cIixcImNsaWNrXCIsYiksdGhpcy5zZXR0aW5ncy5pbnZhbGlkSGFuZGxlciYmYSh0aGlzLmN1cnJlbnRGb3JtKS5iaW5kKFwiaW52YWxpZC1mb3JtLnZhbGlkYXRlXCIsdGhpcy5zZXR0aW5ncy5pbnZhbGlkSGFuZGxlciksYSh0aGlzLmN1cnJlbnRGb3JtKS5maW5kKFwiW3JlcXVpcmVkXSwgW2RhdGEtcnVsZS1yZXF1aXJlZF0sIC5yZXF1aXJlZFwiKS5hdHRyKFwiYXJpYS1yZXF1aXJlZFwiLFwidHJ1ZVwiKX0sZm9ybTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmNoZWNrRm9ybSgpLGEuZXh0ZW5kKHRoaXMuc3VibWl0dGVkLHRoaXMuZXJyb3JNYXApLHRoaXMuaW52YWxpZD1hLmV4dGVuZCh7fSx0aGlzLmVycm9yTWFwKSx0aGlzLnZhbGlkKCl8fGEodGhpcy5jdXJyZW50Rm9ybSkudHJpZ2dlckhhbmRsZXIoXCJpbnZhbGlkLWZvcm1cIixbdGhpc10pLHRoaXMuc2hvd0Vycm9ycygpLHRoaXMudmFsaWQoKX0sY2hlY2tGb3JtOmZ1bmN0aW9uKCl7dGhpcy5wcmVwYXJlRm9ybSgpO2Zvcih2YXIgYT0wLGI9dGhpcy5jdXJyZW50RWxlbWVudHM9dGhpcy5lbGVtZW50cygpO2JbYV07YSsrKXRoaXMuY2hlY2soYlthXSk7cmV0dXJuIHRoaXMudmFsaWQoKX0sZWxlbWVudDpmdW5jdGlvbihiKXt2YXIgYz10aGlzLmNsZWFuKGIpLGQ9dGhpcy52YWxpZGF0aW9uVGFyZ2V0Rm9yKGMpLGU9ITA7cmV0dXJuIHRoaXMubGFzdEVsZW1lbnQ9ZCx2b2lkIDA9PT1kP2RlbGV0ZSB0aGlzLmludmFsaWRbYy5uYW1lXToodGhpcy5wcmVwYXJlRWxlbWVudChkKSx0aGlzLmN1cnJlbnRFbGVtZW50cz1hKGQpLGU9dGhpcy5jaGVjayhkKSE9PSExLGU/ZGVsZXRlIHRoaXMuaW52YWxpZFtkLm5hbWVdOnRoaXMuaW52YWxpZFtkLm5hbWVdPSEwKSxhKGIpLmF0dHIoXCJhcmlhLWludmFsaWRcIiwhZSksdGhpcy5udW1iZXJPZkludmFsaWRzKCl8fCh0aGlzLnRvSGlkZT10aGlzLnRvSGlkZS5hZGQodGhpcy5jb250YWluZXJzKSksdGhpcy5zaG93RXJyb3JzKCksZX0sc2hvd0Vycm9yczpmdW5jdGlvbihiKXtpZihiKXthLmV4dGVuZCh0aGlzLmVycm9yTWFwLGIpLHRoaXMuZXJyb3JMaXN0PVtdO2Zvcih2YXIgYyBpbiBiKXRoaXMuZXJyb3JMaXN0LnB1c2goe21lc3NhZ2U6YltjXSxlbGVtZW50OnRoaXMuZmluZEJ5TmFtZShjKVswXX0pO3RoaXMuc3VjY2Vzc0xpc3Q9YS5ncmVwKHRoaXMuc3VjY2Vzc0xpc3QsZnVuY3Rpb24oYSl7cmV0dXJuIShhLm5hbWUgaW4gYil9KX10aGlzLnNldHRpbmdzLnNob3dFcnJvcnM/dGhpcy5zZXR0aW5ncy5zaG93RXJyb3JzLmNhbGwodGhpcyx0aGlzLmVycm9yTWFwLHRoaXMuZXJyb3JMaXN0KTp0aGlzLmRlZmF1bHRTaG93RXJyb3JzKCl9LHJlc2V0Rm9ybTpmdW5jdGlvbigpe2EuZm4ucmVzZXRGb3JtJiZhKHRoaXMuY3VycmVudEZvcm0pLnJlc2V0Rm9ybSgpLHRoaXMuc3VibWl0dGVkPXt9LHRoaXMubGFzdEVsZW1lbnQ9bnVsbCx0aGlzLnByZXBhcmVGb3JtKCksdGhpcy5oaWRlRXJyb3JzKCksdGhpcy5lbGVtZW50cygpLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcykucmVtb3ZlRGF0YShcInByZXZpb3VzVmFsdWVcIikucmVtb3ZlQXR0cihcImFyaWEtaW52YWxpZFwiKX0sbnVtYmVyT2ZJbnZhbGlkczpmdW5jdGlvbigpe3JldHVybiB0aGlzLm9iamVjdExlbmd0aCh0aGlzLmludmFsaWQpfSxvYmplY3RMZW5ndGg6ZnVuY3Rpb24oYSl7dmFyIGIsYz0wO2ZvcihiIGluIGEpYysrO3JldHVybiBjfSxoaWRlRXJyb3JzOmZ1bmN0aW9uKCl7dGhpcy5hZGRXcmFwcGVyKHRoaXMudG9IaWRlKS5oaWRlKCl9LHZhbGlkOmZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemUoKX0sc2l6ZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmVycm9yTGlzdC5sZW5ndGh9LGZvY3VzSW52YWxpZDpmdW5jdGlvbigpe2lmKHRoaXMuc2V0dGluZ3MuZm9jdXNJbnZhbGlkKXRyeXthKHRoaXMuZmluZExhc3RBY3RpdmUoKXx8dGhpcy5lcnJvckxpc3QubGVuZ3RoJiZ0aGlzLmVycm9yTGlzdFswXS5lbGVtZW50fHxbXSkuZmlsdGVyKFwiOnZpc2libGVcIikuZm9jdXMoKS50cmlnZ2VyKFwiZm9jdXNpblwiKX1jYXRjaChiKXt9fSxmaW5kTGFzdEFjdGl2ZTpmdW5jdGlvbigpe3ZhciBiPXRoaXMubGFzdEFjdGl2ZTtyZXR1cm4gYiYmMT09PWEuZ3JlcCh0aGlzLmVycm9yTGlzdCxmdW5jdGlvbihhKXtyZXR1cm4gYS5lbGVtZW50Lm5hbWU9PT1iLm5hbWV9KS5sZW5ndGgmJmJ9LGVsZW1lbnRzOmZ1bmN0aW9uKCl7dmFyIGI9dGhpcyxjPXt9O3JldHVybiBhKHRoaXMuY3VycmVudEZvcm0pLmZpbmQoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYVwiKS5ub3QoXCI6c3VibWl0LCA6cmVzZXQsIDppbWFnZSwgW2Rpc2FibGVkXVwiKS5ub3QodGhpcy5zZXR0aW5ncy5pZ25vcmUpLmZpbHRlcihmdW5jdGlvbigpe3JldHVybiF0aGlzLm5hbWUmJmIuc2V0dGluZ3MuZGVidWcmJndpbmRvdy5jb25zb2xlJiZjb25zb2xlLmVycm9yKFwiJW8gaGFzIG5vIG5hbWUgYXNzaWduZWRcIix0aGlzKSx0aGlzLm5hbWUgaW4gY3x8IWIub2JqZWN0TGVuZ3RoKGEodGhpcykucnVsZXMoKSk/ITE6KGNbdGhpcy5uYW1lXT0hMCwhMCl9KX0sY2xlYW46ZnVuY3Rpb24oYil7cmV0dXJuIGEoYilbMF19LGVycm9yczpmdW5jdGlvbigpe3ZhciBiPXRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcy5zcGxpdChcIiBcIikuam9pbihcIi5cIik7cmV0dXJuIGEodGhpcy5zZXR0aW5ncy5lcnJvckVsZW1lbnQrXCIuXCIrYix0aGlzLmVycm9yQ29udGV4dCl9LHJlc2V0OmZ1bmN0aW9uKCl7dGhpcy5zdWNjZXNzTGlzdD1bXSx0aGlzLmVycm9yTGlzdD1bXSx0aGlzLmVycm9yTWFwPXt9LHRoaXMudG9TaG93PWEoW10pLHRoaXMudG9IaWRlPWEoW10pLHRoaXMuY3VycmVudEVsZW1lbnRzPWEoW10pfSxwcmVwYXJlRm9ybTpmdW5jdGlvbigpe3RoaXMucmVzZXQoKSx0aGlzLnRvSGlkZT10aGlzLmVycm9ycygpLmFkZCh0aGlzLmNvbnRhaW5lcnMpfSxwcmVwYXJlRWxlbWVudDpmdW5jdGlvbihhKXt0aGlzLnJlc2V0KCksdGhpcy50b0hpZGU9dGhpcy5lcnJvcnNGb3IoYSl9LGVsZW1lbnRWYWx1ZTpmdW5jdGlvbihiKXt2YXIgYyxkPWEoYiksZT1kLmF0dHIoXCJ0eXBlXCIpO3JldHVyblwicmFkaW9cIj09PWV8fFwiY2hlY2tib3hcIj09PWU/YShcImlucHV0W25hbWU9J1wiK2QuYXR0cihcIm5hbWVcIikrXCInXTpjaGVja2VkXCIpLnZhbCgpOihjPWQudmFsKCksXCJzdHJpbmdcIj09dHlwZW9mIGM/Yy5yZXBsYWNlKC9cXHIvZyxcIlwiKTpjKX0sY2hlY2s6ZnVuY3Rpb24oYil7Yj10aGlzLnZhbGlkYXRpb25UYXJnZXRGb3IodGhpcy5jbGVhbihiKSk7dmFyIGMsZCxlLGY9YShiKS5ydWxlcygpLGc9YS5tYXAoZixmdW5jdGlvbihhLGIpe3JldHVybiBifSkubGVuZ3RoLGg9ITEsaT10aGlzLmVsZW1lbnRWYWx1ZShiKTtmb3IoZCBpbiBmKXtlPXttZXRob2Q6ZCxwYXJhbWV0ZXJzOmZbZF19O3RyeXtpZihjPWEudmFsaWRhdG9yLm1ldGhvZHNbZF0uY2FsbCh0aGlzLGksYixlLnBhcmFtZXRlcnMpLFwiZGVwZW5kZW5jeS1taXNtYXRjaFwiPT09YyYmMT09PWcpe2g9ITA7Y29udGludWV9aWYoaD0hMSxcInBlbmRpbmdcIj09PWMpcmV0dXJuIHZvaWQodGhpcy50b0hpZGU9dGhpcy50b0hpZGUubm90KHRoaXMuZXJyb3JzRm9yKGIpKSk7aWYoIWMpcmV0dXJuIHRoaXMuZm9ybWF0QW5kQWRkKGIsZSksITF9Y2F0Y2goail7dGhyb3cgdGhpcy5zZXR0aW5ncy5kZWJ1ZyYmd2luZG93LmNvbnNvbGUmJmNvbnNvbGUubG9nKFwiRXhjZXB0aW9uIG9jY3VycmVkIHdoZW4gY2hlY2tpbmcgZWxlbWVudCBcIitiLmlkK1wiLCBjaGVjayB0aGUgJ1wiK2UubWV0aG9kK1wiJyBtZXRob2QuXCIsaiksan19aWYoIWgpcmV0dXJuIHRoaXMub2JqZWN0TGVuZ3RoKGYpJiZ0aGlzLnN1Y2Nlc3NMaXN0LnB1c2goYiksITB9LGN1c3RvbURhdGFNZXNzYWdlOmZ1bmN0aW9uKGIsYyl7cmV0dXJuIGEoYikuZGF0YShcIm1zZ1wiK2NbMF0udG9VcHBlckNhc2UoKStjLnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpKXx8YShiKS5kYXRhKFwibXNnXCIpfSxjdXN0b21NZXNzYWdlOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5zZXR0aW5ncy5tZXNzYWdlc1thXTtyZXR1cm4gYyYmKGMuY29uc3RydWN0b3I9PT1TdHJpbmc/YzpjW2JdKX0sZmluZERlZmluZWQ6ZnVuY3Rpb24oKXtmb3IodmFyIGE9MDthPGFyZ3VtZW50cy5sZW5ndGg7YSsrKWlmKHZvaWQgMCE9PWFyZ3VtZW50c1thXSlyZXR1cm4gYXJndW1lbnRzW2FdO3JldHVybiB2b2lkIDB9LGRlZmF1bHRNZXNzYWdlOmZ1bmN0aW9uKGIsYyl7cmV0dXJuIHRoaXMuZmluZERlZmluZWQodGhpcy5jdXN0b21NZXNzYWdlKGIubmFtZSxjKSx0aGlzLmN1c3RvbURhdGFNZXNzYWdlKGIsYyksIXRoaXMuc2V0dGluZ3MuaWdub3JlVGl0bGUmJmIudGl0bGV8fHZvaWQgMCxhLnZhbGlkYXRvci5tZXNzYWdlc1tjXSxcIjxzdHJvbmc+V2FybmluZzogTm8gbWVzc2FnZSBkZWZpbmVkIGZvciBcIitiLm5hbWUrXCI8L3N0cm9uZz5cIil9LGZvcm1hdEFuZEFkZDpmdW5jdGlvbihiLGMpe3ZhciBkPXRoaXMuZGVmYXVsdE1lc3NhZ2UoYixjLm1ldGhvZCksZT0vXFwkP1xceyhcXGQrKVxcfS9nO1wiZnVuY3Rpb25cIj09dHlwZW9mIGQ/ZD1kLmNhbGwodGhpcyxjLnBhcmFtZXRlcnMsYik6ZS50ZXN0KGQpJiYoZD1hLnZhbGlkYXRvci5mb3JtYXQoZC5yZXBsYWNlKGUsXCJ7JDF9XCIpLGMucGFyYW1ldGVycykpLHRoaXMuZXJyb3JMaXN0LnB1c2goe21lc3NhZ2U6ZCxlbGVtZW50OmIsbWV0aG9kOmMubWV0aG9kfSksdGhpcy5lcnJvck1hcFtiLm5hbWVdPWQsdGhpcy5zdWJtaXR0ZWRbYi5uYW1lXT1kfSxhZGRXcmFwcGVyOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnNldHRpbmdzLndyYXBwZXImJihhPWEuYWRkKGEucGFyZW50KHRoaXMuc2V0dGluZ3Mud3JhcHBlcikpKSxhfSxkZWZhdWx0U2hvd0Vycm9yczpmdW5jdGlvbigpe3ZhciBhLGIsYztmb3IoYT0wO3RoaXMuZXJyb3JMaXN0W2FdO2ErKyljPXRoaXMuZXJyb3JMaXN0W2FdLHRoaXMuc2V0dGluZ3MuaGlnaGxpZ2h0JiZ0aGlzLnNldHRpbmdzLmhpZ2hsaWdodC5jYWxsKHRoaXMsYy5lbGVtZW50LHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcyx0aGlzLnNldHRpbmdzLnZhbGlkQ2xhc3MpLHRoaXMuc2hvd0xhYmVsKGMuZWxlbWVudCxjLm1lc3NhZ2UpO2lmKHRoaXMuZXJyb3JMaXN0Lmxlbmd0aCYmKHRoaXMudG9TaG93PXRoaXMudG9TaG93LmFkZCh0aGlzLmNvbnRhaW5lcnMpKSx0aGlzLnNldHRpbmdzLnN1Y2Nlc3MpZm9yKGE9MDt0aGlzLnN1Y2Nlc3NMaXN0W2FdO2ErKyl0aGlzLnNob3dMYWJlbCh0aGlzLnN1Y2Nlc3NMaXN0W2FdKTtpZih0aGlzLnNldHRpbmdzLnVuaGlnaGxpZ2h0KWZvcihhPTAsYj10aGlzLnZhbGlkRWxlbWVudHMoKTtiW2FdO2ErKyl0aGlzLnNldHRpbmdzLnVuaGlnaGxpZ2h0LmNhbGwodGhpcyxiW2FdLHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcyx0aGlzLnNldHRpbmdzLnZhbGlkQ2xhc3MpO3RoaXMudG9IaWRlPXRoaXMudG9IaWRlLm5vdCh0aGlzLnRvU2hvdyksdGhpcy5oaWRlRXJyb3JzKCksdGhpcy5hZGRXcmFwcGVyKHRoaXMudG9TaG93KS5zaG93KCl9LHZhbGlkRWxlbWVudHM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jdXJyZW50RWxlbWVudHMubm90KHRoaXMuaW52YWxpZEVsZW1lbnRzKCkpfSxpbnZhbGlkRWxlbWVudHM6ZnVuY3Rpb24oKXtyZXR1cm4gYSh0aGlzLmVycm9yTGlzdCkubWFwKGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZWxlbWVudH0pfSxzaG93TGFiZWw6ZnVuY3Rpb24oYixjKXt2YXIgZD10aGlzLmVycm9yc0ZvcihiKTtkLmxlbmd0aD8oZC5yZW1vdmVDbGFzcyh0aGlzLnNldHRpbmdzLnZhbGlkQ2xhc3MpLmFkZENsYXNzKHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcyksZC5odG1sKGMpKTooZD1hKFwiPFwiK3RoaXMuc2V0dGluZ3MuZXJyb3JFbGVtZW50K1wiPlwiKS5hdHRyKFwiZm9yXCIsdGhpcy5pZE9yTmFtZShiKSkuYWRkQ2xhc3ModGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzKS5odG1sKGN8fFwiXCIpLHRoaXMuc2V0dGluZ3Mud3JhcHBlciYmKGQ9ZC5oaWRlKCkuc2hvdygpLndyYXAoXCI8XCIrdGhpcy5zZXR0aW5ncy53cmFwcGVyK1wiLz5cIikucGFyZW50KCkpLHRoaXMubGFiZWxDb250YWluZXIuYXBwZW5kKGQpLmxlbmd0aHx8KHRoaXMuc2V0dGluZ3MuZXJyb3JQbGFjZW1lbnQ/dGhpcy5zZXR0aW5ncy5lcnJvclBsYWNlbWVudChkLGEoYikpOmQuaW5zZXJ0QWZ0ZXIoYikpKSwhYyYmdGhpcy5zZXR0aW5ncy5zdWNjZXNzJiYoZC50ZXh0KFwiXCIpLFwic3RyaW5nXCI9PXR5cGVvZiB0aGlzLnNldHRpbmdzLnN1Y2Nlc3M/ZC5hZGRDbGFzcyh0aGlzLnNldHRpbmdzLnN1Y2Nlc3MpOnRoaXMuc2V0dGluZ3Muc3VjY2VzcyhkLGIpKSx0aGlzLnRvU2hvdz10aGlzLnRvU2hvdy5hZGQoZCl9LGVycm9yc0ZvcjpmdW5jdGlvbihiKXt2YXIgYz10aGlzLmlkT3JOYW1lKGIpO3JldHVybiB0aGlzLmVycm9ycygpLmZpbHRlcihmdW5jdGlvbigpe3JldHVybiBhKHRoaXMpLmF0dHIoXCJmb3JcIik9PT1jfSl9LGlkT3JOYW1lOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmdyb3Vwc1thLm5hbWVdfHwodGhpcy5jaGVja2FibGUoYSk/YS5uYW1lOmEuaWR8fGEubmFtZSl9LHZhbGlkYXRpb25UYXJnZXRGb3I6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuY2hlY2thYmxlKGEpJiYoYT10aGlzLmZpbmRCeU5hbWUoYS5uYW1lKS5ub3QodGhpcy5zZXR0aW5ncy5pZ25vcmUpWzBdKSxhfSxjaGVja2FibGU6ZnVuY3Rpb24oYSl7cmV0dXJuL3JhZGlvfGNoZWNrYm94L2kudGVzdChhLnR5cGUpfSxmaW5kQnlOYW1lOmZ1bmN0aW9uKGIpe3JldHVybiBhKHRoaXMuY3VycmVudEZvcm0pLmZpbmQoXCJbbmFtZT0nXCIrYitcIiddXCIpfSxnZXRMZW5ndGg6ZnVuY3Rpb24oYixjKXtzd2l0Y2goYy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKXtjYXNlXCJzZWxlY3RcIjpyZXR1cm4gYShcIm9wdGlvbjpzZWxlY3RlZFwiLGMpLmxlbmd0aDtjYXNlXCJpbnB1dFwiOmlmKHRoaXMuY2hlY2thYmxlKGMpKXJldHVybiB0aGlzLmZpbmRCeU5hbWUoYy5uYW1lKS5maWx0ZXIoXCI6Y2hlY2tlZFwiKS5sZW5ndGh9cmV0dXJuIGIubGVuZ3RofSxkZXBlbmQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5kZXBlbmRUeXBlc1t0eXBlb2YgYV0/dGhpcy5kZXBlbmRUeXBlc1t0eXBlb2YgYV0oYSxiKTohMH0sZGVwZW5kVHlwZXM6e1wiYm9vbGVhblwiOmZ1bmN0aW9uKGEpe3JldHVybiBhfSxzdHJpbmc6ZnVuY3Rpb24oYixjKXtyZXR1cm4hIWEoYixjLmZvcm0pLmxlbmd0aH0sXCJmdW5jdGlvblwiOmZ1bmN0aW9uKGEsYil7cmV0dXJuIGEoYil9fSxvcHRpb25hbDpmdW5jdGlvbihiKXt2YXIgYz10aGlzLmVsZW1lbnRWYWx1ZShiKTtyZXR1cm4hYS52YWxpZGF0b3IubWV0aG9kcy5yZXF1aXJlZC5jYWxsKHRoaXMsYyxiKSYmXCJkZXBlbmRlbmN5LW1pc21hdGNoXCJ9LHN0YXJ0UmVxdWVzdDpmdW5jdGlvbihhKXt0aGlzLnBlbmRpbmdbYS5uYW1lXXx8KHRoaXMucGVuZGluZ1JlcXVlc3QrKyx0aGlzLnBlbmRpbmdbYS5uYW1lXT0hMCl9LHN0b3BSZXF1ZXN0OmZ1bmN0aW9uKGIsYyl7dGhpcy5wZW5kaW5nUmVxdWVzdC0tLHRoaXMucGVuZGluZ1JlcXVlc3Q8MCYmKHRoaXMucGVuZGluZ1JlcXVlc3Q9MCksZGVsZXRlIHRoaXMucGVuZGluZ1tiLm5hbWVdLGMmJjA9PT10aGlzLnBlbmRpbmdSZXF1ZXN0JiZ0aGlzLmZvcm1TdWJtaXR0ZWQmJnRoaXMuZm9ybSgpPyhhKHRoaXMuY3VycmVudEZvcm0pLnN1Ym1pdCgpLHRoaXMuZm9ybVN1Ym1pdHRlZD0hMSk6IWMmJjA9PT10aGlzLnBlbmRpbmdSZXF1ZXN0JiZ0aGlzLmZvcm1TdWJtaXR0ZWQmJihhKHRoaXMuY3VycmVudEZvcm0pLnRyaWdnZXJIYW5kbGVyKFwiaW52YWxpZC1mb3JtXCIsW3RoaXNdKSx0aGlzLmZvcm1TdWJtaXR0ZWQ9ITEpfSxwcmV2aW91c1ZhbHVlOmZ1bmN0aW9uKGIpe3JldHVybiBhLmRhdGEoYixcInByZXZpb3VzVmFsdWVcIil8fGEuZGF0YShiLFwicHJldmlvdXNWYWx1ZVwiLHtvbGQ6bnVsbCx2YWxpZDohMCxtZXNzYWdlOnRoaXMuZGVmYXVsdE1lc3NhZ2UoYixcInJlbW90ZVwiKX0pfX0sY2xhc3NSdWxlU2V0dGluZ3M6e3JlcXVpcmVkOntyZXF1aXJlZDohMH0sZW1haWw6e2VtYWlsOiEwfSx1cmw6e3VybDohMH0sZGF0ZTp7ZGF0ZTohMH0sZGF0ZUlTTzp7ZGF0ZUlTTzohMH0sbnVtYmVyOntudW1iZXI6ITB9LGRpZ2l0czp7ZGlnaXRzOiEwfSxjcmVkaXRjYXJkOntjcmVkaXRjYXJkOiEwfX0sYWRkQ2xhc3NSdWxlczpmdW5jdGlvbihiLGMpe2IuY29uc3RydWN0b3I9PT1TdHJpbmc/dGhpcy5jbGFzc1J1bGVTZXR0aW5nc1tiXT1jOmEuZXh0ZW5kKHRoaXMuY2xhc3NSdWxlU2V0dGluZ3MsYil9LGNsYXNzUnVsZXM6ZnVuY3Rpb24oYil7dmFyIGM9e30sZD1hKGIpLmF0dHIoXCJjbGFzc1wiKTtyZXR1cm4gZCYmYS5lYWNoKGQuc3BsaXQoXCIgXCIpLGZ1bmN0aW9uKCl7dGhpcyBpbiBhLnZhbGlkYXRvci5jbGFzc1J1bGVTZXR0aW5ncyYmYS5leHRlbmQoYyxhLnZhbGlkYXRvci5jbGFzc1J1bGVTZXR0aW5nc1t0aGlzXSl9KSxjfSxhdHRyaWJ1dGVSdWxlczpmdW5jdGlvbihiKXt2YXIgYyxkLGU9e30sZj1hKGIpLGc9Yi5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpO2ZvcihjIGluIGEudmFsaWRhdG9yLm1ldGhvZHMpXCJyZXF1aXJlZFwiPT09Yz8oZD1iLmdldEF0dHJpYnV0ZShjKSxcIlwiPT09ZCYmKGQ9ITApLGQ9ISFkKTpkPWYuYXR0cihjKSwvbWlufG1heC8udGVzdChjKSYmKG51bGw9PT1nfHwvbnVtYmVyfHJhbmdlfHRleHQvLnRlc3QoZykpJiYoZD1OdW1iZXIoZCkpLGR8fDA9PT1kP2VbY109ZDpnPT09YyYmXCJyYW5nZVwiIT09ZyYmKGVbY109ITApO3JldHVybiBlLm1heGxlbmd0aCYmLy0xfDIxNDc0ODM2NDd8NTI0Mjg4Ly50ZXN0KGUubWF4bGVuZ3RoKSYmZGVsZXRlIGUubWF4bGVuZ3RoLGV9LGRhdGFSdWxlczpmdW5jdGlvbihiKXt2YXIgYyxkLGU9e30sZj1hKGIpO2ZvcihjIGluIGEudmFsaWRhdG9yLm1ldGhvZHMpZD1mLmRhdGEoXCJydWxlXCIrY1swXS50b1VwcGVyQ2FzZSgpK2Muc3Vic3RyaW5nKDEpLnRvTG93ZXJDYXNlKCkpLHZvaWQgMCE9PWQmJihlW2NdPWQpO3JldHVybiBlfSxzdGF0aWNSdWxlczpmdW5jdGlvbihiKXt2YXIgYz17fSxkPWEuZGF0YShiLmZvcm0sXCJ2YWxpZGF0b3JcIik7cmV0dXJuIGQuc2V0dGluZ3MucnVsZXMmJihjPWEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGUoZC5zZXR0aW5ncy5ydWxlc1tiLm5hbWVdKXx8e30pLGN9LG5vcm1hbGl6ZVJ1bGVzOmZ1bmN0aW9uKGIsYyl7cmV0dXJuIGEuZWFjaChiLGZ1bmN0aW9uKGQsZSl7aWYoZT09PSExKXJldHVybiB2b2lkIGRlbGV0ZSBiW2RdO2lmKGUucGFyYW18fGUuZGVwZW5kcyl7dmFyIGY9ITA7c3dpdGNoKHR5cGVvZiBlLmRlcGVuZHMpe2Nhc2VcInN0cmluZ1wiOmY9ISFhKGUuZGVwZW5kcyxjLmZvcm0pLmxlbmd0aDticmVhaztjYXNlXCJmdW5jdGlvblwiOmY9ZS5kZXBlbmRzLmNhbGwoYyxjKX1mP2JbZF09dm9pZCAwIT09ZS5wYXJhbT9lLnBhcmFtOiEwOmRlbGV0ZSBiW2RdfX0pLGEuZWFjaChiLGZ1bmN0aW9uKGQsZSl7YltkXT1hLmlzRnVuY3Rpb24oZSk/ZShjKTplfSksYS5lYWNoKFtcIm1pbmxlbmd0aFwiLFwibWF4bGVuZ3RoXCJdLGZ1bmN0aW9uKCl7Ylt0aGlzXSYmKGJbdGhpc109TnVtYmVyKGJbdGhpc10pKX0pLGEuZWFjaChbXCJyYW5nZWxlbmd0aFwiLFwicmFuZ2VcIl0sZnVuY3Rpb24oKXt2YXIgYztiW3RoaXNdJiYoYS5pc0FycmF5KGJbdGhpc10pP2JbdGhpc109W051bWJlcihiW3RoaXNdWzBdKSxOdW1iZXIoYlt0aGlzXVsxXSldOlwic3RyaW5nXCI9PXR5cGVvZiBiW3RoaXNdJiYoYz1iW3RoaXNdLnNwbGl0KC9bXFxzLF0rLyksYlt0aGlzXT1bTnVtYmVyKGNbMF0pLE51bWJlcihjWzFdKV0pKX0pLGEudmFsaWRhdG9yLmF1dG9DcmVhdGVSYW5nZXMmJihiLm1pbiYmYi5tYXgmJihiLnJhbmdlPVtiLm1pbixiLm1heF0sZGVsZXRlIGIubWluLGRlbGV0ZSBiLm1heCksYi5taW5sZW5ndGgmJmIubWF4bGVuZ3RoJiYoYi5yYW5nZWxlbmd0aD1bYi5taW5sZW5ndGgsYi5tYXhsZW5ndGhdLGRlbGV0ZSBiLm1pbmxlbmd0aCxkZWxldGUgYi5tYXhsZW5ndGgpKSxifSxub3JtYWxpemVSdWxlOmZ1bmN0aW9uKGIpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiBiKXt2YXIgYz17fTthLmVhY2goYi5zcGxpdCgvXFxzLyksZnVuY3Rpb24oKXtjW3RoaXNdPSEwfSksYj1jfXJldHVybiBifSxhZGRNZXRob2Q6ZnVuY3Rpb24oYixjLGQpe2EudmFsaWRhdG9yLm1ldGhvZHNbYl09YyxhLnZhbGlkYXRvci5tZXNzYWdlc1tiXT12b2lkIDAhPT1kP2Q6YS52YWxpZGF0b3IubWVzc2FnZXNbYl0sYy5sZW5ndGg8MyYmYS52YWxpZGF0b3IuYWRkQ2xhc3NSdWxlcyhiLGEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGUoYikpfSxtZXRob2RzOntyZXF1aXJlZDpmdW5jdGlvbihiLGMsZCl7aWYoIXRoaXMuZGVwZW5kKGQsYykpcmV0dXJuXCJkZXBlbmRlbmN5LW1pc21hdGNoXCI7aWYoXCJzZWxlY3RcIj09PWMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSl7dmFyIGU9YShjKS52YWwoKTtyZXR1cm4gZSYmZS5sZW5ndGg+MH1yZXR1cm4gdGhpcy5jaGVja2FibGUoYyk/dGhpcy5nZXRMZW5ndGgoYixjKT4wOmEudHJpbShiKS5sZW5ndGg+MH0sZW1haWw6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L15bYS16QS1aMC05LiEjJCUmJyorXFwvPT9eX2B7fH1+LV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykqJC8udGVzdChhKX0sdXJsOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fC9eKGh0dHBzP3xzP2Z0cCk6XFwvXFwvKCgoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKkApPygoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KCgoW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuPykoOlxcZCopPykoXFwvKCgoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSsoXFwvKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKikqKT8pPyhcXD8oKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KCMoKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC9pLnRlc3QoYSl9LGRhdGU6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8IS9JbnZhbGlkfE5hTi8udGVzdChuZXcgRGF0ZShhKS50b1N0cmluZygpKX0sZGF0ZUlTTzpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHwvXlxcZHs0fVtcXC9cXC1dXFxkezEsMn1bXFwvXFwtXVxcZHsxLDJ9JC8udGVzdChhKX0sbnVtYmVyOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fC9eLT8oPzpcXGQrfFxcZHsxLDN9KD86LFxcZHszfSkrKT8oPzpcXC5cXGQrKT8kLy50ZXN0KGEpfSxkaWdpdHM6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L15cXGQrJC8udGVzdChhKX0sY3JlZGl0Y2FyZDpmdW5jdGlvbihhLGIpe2lmKHRoaXMub3B0aW9uYWwoYikpcmV0dXJuXCJkZXBlbmRlbmN5LW1pc21hdGNoXCI7aWYoL1teMC05IFxcLV0rLy50ZXN0KGEpKXJldHVybiExO3ZhciBjLGQsZT0wLGY9MCxnPSExO2lmKGE9YS5yZXBsYWNlKC9cXEQvZyxcIlwiKSxhLmxlbmd0aDwxM3x8YS5sZW5ndGg+MTkpcmV0dXJuITE7Zm9yKGM9YS5sZW5ndGgtMTtjPj0wO2MtLSlkPWEuY2hhckF0KGMpLGY9cGFyc2VJbnQoZCwxMCksZyYmKGYqPTIpPjkmJihmLT05KSxlKz1mLGc9IWc7cmV0dXJuIGUlMTA9PT0wfSxtaW5sZW5ndGg6ZnVuY3Rpb24oYixjLGQpe3ZhciBlPWEuaXNBcnJheShiKT9iLmxlbmd0aDp0aGlzLmdldExlbmd0aChhLnRyaW0oYiksYyk7cmV0dXJuIHRoaXMub3B0aW9uYWwoYyl8fGU+PWR9LG1heGxlbmd0aDpmdW5jdGlvbihiLGMsZCl7dmFyIGU9YS5pc0FycmF5KGIpP2IubGVuZ3RoOnRoaXMuZ2V0TGVuZ3RoKGEudHJpbShiKSxjKTtyZXR1cm4gdGhpcy5vcHRpb25hbChjKXx8ZD49ZX0scmFuZ2VsZW5ndGg6ZnVuY3Rpb24oYixjLGQpe3ZhciBlPWEuaXNBcnJheShiKT9iLmxlbmd0aDp0aGlzLmdldExlbmd0aChhLnRyaW0oYiksYyk7cmV0dXJuIHRoaXMub3B0aW9uYWwoYyl8fGU+PWRbMF0mJmU8PWRbMV19LG1pbjpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fGE+PWN9LG1heDpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fGM+PWF9LHJhbmdlOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8YT49Y1swXSYmYTw9Y1sxXX0sZXF1YWxUbzpmdW5jdGlvbihiLGMsZCl7dmFyIGU9YShkKTtyZXR1cm4gdGhpcy5zZXR0aW5ncy5vbmZvY3Vzb3V0JiZlLnVuYmluZChcIi52YWxpZGF0ZS1lcXVhbFRvXCIpLmJpbmQoXCJibHVyLnZhbGlkYXRlLWVxdWFsVG9cIixmdW5jdGlvbigpe2EoYykudmFsaWQoKX0pLGI9PT1lLnZhbCgpfSxyZW1vdGU6ZnVuY3Rpb24oYixjLGQpe2lmKHRoaXMub3B0aW9uYWwoYykpcmV0dXJuXCJkZXBlbmRlbmN5LW1pc21hdGNoXCI7dmFyIGUsZixnPXRoaXMucHJldmlvdXNWYWx1ZShjKTtyZXR1cm4gdGhpcy5zZXR0aW5ncy5tZXNzYWdlc1tjLm5hbWVdfHwodGhpcy5zZXR0aW5ncy5tZXNzYWdlc1tjLm5hbWVdPXt9KSxnLm9yaWdpbmFsTWVzc2FnZT10aGlzLnNldHRpbmdzLm1lc3NhZ2VzW2MubmFtZV0ucmVtb3RlLHRoaXMuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXS5yZW1vdGU9Zy5tZXNzYWdlLGQ9XCJzdHJpbmdcIj09dHlwZW9mIGQmJnt1cmw6ZH18fGQsZy5vbGQ9PT1iP2cudmFsaWQ6KGcub2xkPWIsZT10aGlzLHRoaXMuc3RhcnRSZXF1ZXN0KGMpLGY9e30sZltjLm5hbWVdPWIsYS5hamF4KGEuZXh0ZW5kKCEwLHt1cmw6ZCxtb2RlOlwiYWJvcnRcIixwb3J0OlwidmFsaWRhdGVcIitjLm5hbWUsZGF0YVR5cGU6XCJqc29uXCIsZGF0YTpmLGNvbnRleHQ6ZS5jdXJyZW50Rm9ybSxzdWNjZXNzOmZ1bmN0aW9uKGQpe3ZhciBmLGgsaSxqPWQ9PT0hMHx8XCJ0cnVlXCI9PT1kO2Uuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXS5yZW1vdGU9Zy5vcmlnaW5hbE1lc3NhZ2Usaj8oaT1lLmZvcm1TdWJtaXR0ZWQsZS5wcmVwYXJlRWxlbWVudChjKSxlLmZvcm1TdWJtaXR0ZWQ9aSxlLnN1Y2Nlc3NMaXN0LnB1c2goYyksZGVsZXRlIGUuaW52YWxpZFtjLm5hbWVdLGUuc2hvd0Vycm9ycygpKTooZj17fSxoPWR8fGUuZGVmYXVsdE1lc3NhZ2UoYyxcInJlbW90ZVwiKSxmW2MubmFtZV09Zy5tZXNzYWdlPWEuaXNGdW5jdGlvbihoKT9oKGIpOmgsZS5pbnZhbGlkW2MubmFtZV09ITAsZS5zaG93RXJyb3JzKGYpKSxnLnZhbGlkPWosZS5zdG9wUmVxdWVzdChjLGopfX0sZCkpLFwicGVuZGluZ1wiKX19fSksYS5mb3JtYXQ9ZnVuY3Rpb24oKXt0aHJvd1wiJC5mb3JtYXQgaGFzIGJlZW4gZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSAkLnZhbGlkYXRvci5mb3JtYXQgaW5zdGVhZC5cIn19KGpRdWVyeSksZnVuY3Rpb24oYSl7dmFyIGIsYz17fTthLmFqYXhQcmVmaWx0ZXI/YS5hamF4UHJlZmlsdGVyKGZ1bmN0aW9uKGEsYixkKXt2YXIgZT1hLnBvcnQ7XCJhYm9ydFwiPT09YS5tb2RlJiYoY1tlXSYmY1tlXS5hYm9ydCgpLGNbZV09ZCl9KTooYj1hLmFqYXgsYS5hamF4PWZ1bmN0aW9uKGQpe3ZhciBlPShcIm1vZGVcImluIGQ/ZDphLmFqYXhTZXR0aW5ncykubW9kZSxmPShcInBvcnRcImluIGQ/ZDphLmFqYXhTZXR0aW5ncykucG9ydDtyZXR1cm5cImFib3J0XCI9PT1lPyhjW2ZdJiZjW2ZdLmFib3J0KCksY1tmXT1iLmFwcGx5KHRoaXMsYXJndW1lbnRzKSxjW2ZdKTpiLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0pfShqUXVlcnkpLGZ1bmN0aW9uKGEpe2EuZXh0ZW5kKGEuZm4se3ZhbGlkYXRlRGVsZWdhdGU6ZnVuY3Rpb24oYixjLGQpe3JldHVybiB0aGlzLmJpbmQoYyxmdW5jdGlvbihjKXt2YXIgZT1hKGMudGFyZ2V0KTtyZXR1cm4gZS5pcyhiKT9kLmFwcGx5KGUsYXJndW1lbnRzKTp2b2lkIDB9KX19KX0oalF1ZXJ5KTtcbiIsImpRdWVyeShmdW5jdGlvbigkKXtcblx0Rm91bmRhdGlvbi5yZUluaXQoJ2VxdWFsaXplcicpO1xuICAgIGlmICgkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmxlbmd0aCkgeyAvL2FyZSB3ZSBldmVuIG9uIGEgcGFnZSB3aXRoIGluZmluaXRlIHNjcm9sbD9cbiAgICAgICAgLy9oaWRlIGV4aXN0aW5nIHBhZ2VyXG4gICAgICAgICQoXCIucGFnaW5hdGlvbi1jZW50ZXJlZFwiKS5oaWRlKCk7XG4gICAgICAgICQoJyNjb250ZW50LWdyaWQtY29udGFpbmVyJykuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJsb2FkLW1vcmVcIj48L3NwYW4+JyApO1xuICAgICAgICAvLyQoICcjY29udGVudC1ncmlkLWNvbnRhaW5lcicgKS5mb3VuZGF0aW9uKCk7IC8vaW5pdGlhbGl6ZSBlcXVhbGl6ZXIgdGhlIGZpcnN0IHRpbWVcblxuICAgICAgICAvL1JlaW5pdGlhbGl6ZSBlcXVhbGl6ZXIgb24gZXZlcnkgYWpheCBjYWxsXG4gICAgICAgICQoIGRvY3VtZW50ICkuYWpheENvbXBsZXRlKCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvdW5kYXRpb24ucmVJbml0KCdlcXVhbGl6ZXInKTsgLy9odHRwOi8vZm91bmRhdGlvbi56dXJiLmNvbS9mb3J1bS9wb3N0cy8zOTM2My1yZWZsb3ctZXF1YWxpc2VyXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBidXR0b24gPSAkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lciAubG9hZC1tb3JlJyk7XG4gICAgICAgIHZhciBwYWdlID0gMjtcbiAgICAgICAgdmFyIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdmFyIGFsbERvbmUgPSBmYWxzZTtcbiAgICAgICAgdmFyIHNjcm9sbEhhbmRsaW5nID0ge1xuICAgICAgICAgICAgYWxsb3c6IHRydWUsXG4gICAgICAgICAgICByZWFsbG93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY3JvbGxIYW5kbGluZy5hbGxvdyA9IHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsYXk6IDQwMCAvLyhtaWxsaXNlY29uZHMpIGFkanVzdCB0byB0aGUgaGlnaGVzdCBhY2NlcHRhYmxlIHZhbHVlXG4gICAgICAgIH07XG5cbiAgICAgICAgJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYoICEgbG9hZGluZyAmJiBzY3JvbGxIYW5kbGluZy5hbGxvdyApIHtcbiAgICAgICAgICAgICAgICBpZiAoIGFsbERvbmUgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHNjcm9sbEhhbmRsaW5nLnJlYWxsb3csIHNjcm9sbEhhbmRsaW5nLmRlbGF5KTtcbiAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJChidXR0b24pLm9mZnNldCgpLnRvcCAtICQod2luZG93KS5zY3JvbGxUb3AoKTtcbiAgICAgICAgICAgICAgICBpZiggNDAwMCA+IG9mZnNldCApIHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnYmVfYWpheF9sb2FkX21vcmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9uY2U6IGJlbG9hZG1vcmUubm9uY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdlOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnk6IGJlbG9hZG1vcmUucXVlcnksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICQucG9zdChiZWxvYWRtb3JlLnVybCwgZGF0YSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggcmVzLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcuY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggcmVzLmRhdGEgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcuY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggYnV0dG9uICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZSA9IHBhZ2UgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiggIXJlcy5kYXRhICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxEb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkuZmFpbChmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XHRcbn0pOyIsIi8qIEdlbmVyYWwgc2l0ZS13aWRlIHNjcmlwdHMgZm9yIE1TUCBGbHkgTWFnICovXG5cbiQoJy5tY19pbnB1dCcpLmF0dHIoXCJwbGFjZWhvbGRlclwiLCBcIkVudGVyIHlvdXIgZW1haWwgYWRkcmVzc1wiKTtcblxuLy9Tb21lIHBhZ2VzIGRvbid0IGdldCBlcXVhbGl6ZWQsIHNvIG1ha2Ugc3VyZSB0aGV5IGRvXG5Gb3VuZGF0aW9uLnJlSW5pdCgnZXF1YWxpemVyJyk7XG5cbi8vQWN0aXZhdGUgcG9seWZpbGwgZm9yIE9iamVjdCBGaXQgb24gSUUvRWRnZVxub2JqZWN0Rml0SW1hZ2VzKCk7XG5cblxuLy9pZih3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKFwiI21jX3NpZ251cFwiKSA+IC0xKSB7XG4vL1x0c2V0VGltZW91dChmdW5jdGlvbigpeyBcbi8vXHRcdHZhciBzaGFyZUNvbnRhaW5lciA9ICQoJyNzaGFyZS1mb2xsb3cnKTtcbi8vXHRcdHZhciBzaGFyZVBvc2l0aW9uID0gc2hhcmVDb250YWluZXIub2Zmc2V0KCkudG9wO1xuLy9cdFx0JChcImh0bWwsIGJvZHlcIikuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2hhcmVQb3NpdGlvbi00MH0sIDUwMCk7XG4vL1x0IH0sIDUwMCk7XG4vL31cblxuLy9IaWRlIG1vYmlsZSB0b3BiYXIgbG9nbyB1bnRpbCB3ZSBzY3JvbGwgZG93biBwYWdlXG4kKCB3aW5kb3cgKS5zY3JvbGwoZnVuY3Rpb24oKSB7XG4gIC8vY29uc29sZS5sb2coJCgnLnRpdGxlLWJhci10aXRsZScpLm9mZnNldCgpLnRvcCk7XG4gIGlmICggJCgnLnRpdGxlLWJhci10aXRsZScpLm9mZnNldCgpLnRvcCA+IDE0OCkge1xuICAgICQoJy5ob21lIC5tb2JpbGUtbG9nbycpLnJlbW92ZUNsYXNzKCdoaWRlJyk7XG4gIH0gZWxzZSB7XG4gICAgJCgnLmhvbWUgLm1vYmlsZS1sb2dvJykuYWRkQ2xhc3MoJ2hpZGUnKTtcbiAgfVxufSk7IiwiaWYgKCAkKCcucGhvdG8tY2Fyb3VzZWwtc2xpZGVzJykubGVuZ3RoICkge1xuICAkKCcucGhvdG8tY2Fyb3VzZWwtc2xpZGVzJykuc2xpY2soe1xuICAgIHNsaWRlOiAnbGknLFxuICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICBzbGlkZXNUb1Njcm9sbDogMSxcbiAgICBhcnJvd3M6IGZhbHNlLFxuICAgIGZhZGU6IHRydWUsXG4gICAgYXNOYXZGb3I6ICcucGhvdG8tY2Fyb3VzZWwtY29udHJvbHMnXG4gIH0pO1xuXG4gICQoJy5waG90by1jYXJvdXNlbC1jb250cm9scycpLnNsaWNrKHtcbiAgICBzbGlkZTogJ2xpJyxcbiAgICBzbGlkZXNUb1Nob3c6IDcsXG4gICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgYXNOYXZGb3I6ICcucGhvdG8tY2Fyb3VzZWwtc2xpZGVzJyxcbiAgICBhcnJvd3M6IGZhbHNlLFxuICAgIGRvdHM6IGZhbHNlLFxuICAgIGNlbnRlck1vZGU6IGZhbHNlLFxuICAgIGZvY3VzT25TZWxlY3Q6IHRydWVcbiAgfSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
