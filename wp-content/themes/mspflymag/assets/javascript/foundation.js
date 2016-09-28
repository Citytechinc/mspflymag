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
      var type = arguments.length <= 1 || arguments[1] === undefined ? 'zf' : arguments[1];

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
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

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
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add a close trigger over the body if necessary
        if (this.options.closeOnClick) {
          if ($('.js-off-canvas-exit').length) {
            this.$exiter = $('.js-off-canvas-exit');
          } else {
            var exiter = document.createElement('div');
            exiter.setAttribute('class', 'js-off-canvas-exit');
            $('[data-off-canvas-content]').append(exiter);

            this.$exiter = $(exiter);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-wrapper]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick && this.$exiter.length) {
          this.$exiter.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          // if (!this.options.forceTop) {
          //   var scrollPos = parseInt(window.pageYOffset);
          //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
          // }
          // if (this.options.isSticky) { this._stick(); }
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          // if (this.options.isSticky || !this.options.forceTop) {
          //   this.$element[0].style.transform = '';
          //   $(window).off('scroll.zf.offcanvas');
          // }
          this.$element.on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this,
            $body = $(document.body);

        if (this.options.forceTop) {
          $('body').scrollTop(0);
        }
        // window.pageYOffset = 0;

        // if (!this.options.forceTop) {
        //   var scrollPos = parseInt(window.pageYOffset);
        //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   if (this.$exiter.length) {
        //     this.$exiter[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        //   }
        // }
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        Foundation.Move(this.options.transitionTime, this.$element, function () {
          $('[data-off-canvas-wrapper]').addClass('is-off-canvas-open is-open-' + _this.options.position);

          _this.$element.addClass('is-open');

          // if (_this.options.isSticky) {
          //   _this._stick();
          // }
        });

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        if (this.options.closeOnClick) {
          this.$exiter.addClass('is-visible');
        }

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.autoFocus) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            _this.$element.find('a, button').eq(0).focus();
          });
        }

        if (this.options.trapFocus) {
          $('[data-off-canvas-content]').attr('tabindex', '-1');
          this._trapFocus();
        }
      }

      /**
       * Traps focus within the offcanvas on open.
       * @private
       */

    }, {
      key: '_trapFocus',
      value: function _trapFocus() {
        var focusable = Foundation.Keyboard.findFocusable(this.$element),
            first = focusable.eq(0),
            last = focusable.eq(-1);

        focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function (e) {
          if (e.which === 9 || e.keycode === 9) {
            if (e.target === last[0] && !e.shiftKey) {
              e.preventDefault();
              first.focus();
            }
            if (e.target === first[0] && e.shiftKey) {
              e.preventDefault();
              last.focus();
            }
          }
        });
      }

      /**
       * Allows the offcanvas to appear sticky utilizing translate properties.
       * @private
       */
      // OffCanvas.prototype._stick = function() {
      //   var elStyle = this.$element[0].style;
      //
      //   if (this.options.closeOnClick) {
      //     var exitStyle = this.$exiter[0].style;
      //   }
      //
      //   $(window).on('scroll.zf.offcanvas', function(e) {
      //     console.log(e);
      //     var pageY = window.pageYOffset;
      //     elStyle.transform = 'translate(0,' + pageY + 'px)';
      //     if (exitStyle !== undefined) { exitStyle.transform = 'translate(0,' + pageY + 'px)'; }
      //   });
      //   // this.$element.trigger('stuck.zf.offcanvas');
      // };
      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        //  Foundation.Move(this.options.transitionTime, this.$element, function() {
        $('[data-off-canvas-wrapper]').removeClass('is-off-canvas-open is-open-' + _this.options.position);
        _this.$element.removeClass('is-open');
        // Foundation._reflow();
        // });
        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');
        // if (_this.options.isSticky || !_this.options.forceTop) {
        //   setTimeout(function() {
        //     _this.$element[0].style.transform = '';
        //     $(window).off('scroll.zf.offcanvas');
        //   }, this.options.transitionTime);
        // }
        if (this.options.closeOnClick) {
          this.$exiter.removeClass('is-visible');
        }

        this.$triggers.attr('aria-expanded', 'false');
        if (this.options.trapFocus) {
          $('[data-off-canvas-content]').removeAttr('tabindex');
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(event) {
        if (event.which !== 27) return;

        event.stopPropagation();
        event.preventDefault();
        this.close();
        this.$lastTrigger.focus();
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$exiter.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Direction the offcanvas opens from. Determines class applied to body.
     * @option
     * @example left
     */
    position: 'left',

    /**
     * Force the page to scroll to top on open.
     * @option
     * @example true
     */
    forceTop: true,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
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
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  var Slider = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Slider(element, options) {
      _classCallCheck(this, Slider);

      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */


    _createClass(Slider, [{
      key: '_init',
      value: function _init() {
        this.inputs = this.$element.find('input');
        this.handles = this.$element.find('[data-slider-handle]');

        this.$handle = this.handles.eq(0);
        this.$input = this.inputs.length ? this.inputs.eq(0) : $('#' + this.$handle.attr('aria-controls'));
        this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

        var isDbl = false,
            _this = this;
        if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
          this.options.disabled = true;
          this.$element.addClass(this.options.disabledClass);
        }
        if (!this.inputs.length) {
          this.inputs = $().add(this.$input);
          this.options.binding = true;
        }
        this._setInitAttr(0);
        this._events(this.$handle);

        if (this.handles[1]) {
          this.options.doubleSided = true;
          this.$handle2 = this.handles.eq(1);
          this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $('#' + this.$handle2.attr('aria-controls'));

          if (!this.inputs[1]) {
            this.inputs = this.inputs.add(this.$input2);
          }
          isDbl = true;

          this._setHandlePos(this.$handle, this.options.initialStart, true, function () {

            _this._setHandlePos(_this.$handle2, _this.options.initialEnd, true);
          });
          // this.$handle.triggerHandler('click.zf.slider');
          this._setInitAttr(1);
          this._events(this.$handle2);
        }

        if (!isDbl) {
          this._setHandlePos(this.$handle, this.options.initialStart, true);
        }
      }

      /**
       * Sets the position of the selected handle and fill bar.
       * @function
       * @private
       * @param {jQuery} $hndl - the selected handle to move.
       * @param {Number} location - floating point between the start and end values of the slider bar.
       * @param {Function} cb - callback function to fire on completion.
       * @fires Slider#moved
       * @fires Slider#changed
       */

    }, {
      key: '_setHandlePos',
      value: function _setHandlePos($hndl, location, noInvert, cb) {
        // don't move if the slider has been disabled since its initialization
        if (this.$element.hasClass(this.options.disabledClass)) {
          return;
        }
        //might need to alter that slightly for bars that will have odd number selections.
        location = parseFloat(location); //on input change events, convert string to number...grumble.

        // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
        if (location < this.options.start) {
          location = this.options.start;
        } else if (location > this.options.end) {
          location = this.options.end;
        }

        var isDbl = this.options.doubleSided;

        if (isDbl) {
          //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
          if (this.handles.index($hndl) === 0) {
            var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
            location = location >= h2Val ? h2Val - this.options.step : location;
          } else {
            var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
            location = location <= h1Val ? h1Val + this.options.step : location;
          }
        }

        //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
        //for click and drag events, it's weird due to the scale(-1, 1) css property
        if (this.options.vertical && !noInvert) {
          location = this.options.end - location;
        }

        var _this = this,
            vert = this.options.vertical,
            hOrW = vert ? 'height' : 'width',
            lOrT = vert ? 'top' : 'left',
            handleDim = $hndl[0].getBoundingClientRect()[hOrW],
            elemDim = this.$element[0].getBoundingClientRect()[hOrW],

        //percentage of bar min/max value based on click or drag point
        pctOfBar = percent(location - this.options.start, this.options.end - this.options.start).toFixed(2),

        //number of actual pixels to shift the handle, based on the percentage obtained above
        pxToMove = (elemDim - handleDim) * pctOfBar,

        //percentage of bar to shift the handle
        movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
        //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
        location = parseFloat(location.toFixed(this.options.decimal));
        // declare empty object for css adjustments, only used with 2 handled-sliders
        var css = {};

        this._setValues($hndl, location);

        // TODO update to calculate based on values set to respective inputs??
        if (isDbl) {
          var isLeftHndl = this.handles.index($hndl) === 0,

          //empty variable, will be used for min-height/width for fill bar
          dim,

          //percentage w/h of the handle compared to the slider bar
          handlePct = ~~(percent(handleDim, elemDim) * 100);
          //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
          if (isLeftHndl) {
            //left or top percentage value to apply to the fill bar.
            css[lOrT] = movement + '%';
            //calculate the new min-height/width for the fill bar.
            dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
            //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
            //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
            if (cb && typeof cb === 'function') {
              cb();
            } //this is only needed for the initialization of 2 handled sliders
          } else {
            //just caching the value of the left/bottom handle's left/top property
            var handlePos = parseFloat(this.$handle[0].style[lOrT]);
            //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
            //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
            dim = movement - (isNaN(handlePos) ? this.options.initialStart / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
          }
          // assign the min-height/width to our css object
          css['min-' + hOrW] = dim + '%';
        }

        this.$element.one('finished.zf.animate', function () {
          /**
           * Fires when the handle is done moving.
           * @event Slider#moved
           */
          _this.$element.trigger('moved.zf.slider', [$hndl]);
        });

        //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
        var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

        Foundation.Move(moveTime, $hndl, function () {
          //adjusting the left/top property of the handle, based on the percentage calculated above
          $hndl.css(lOrT, movement + '%');

          if (!_this.options.doubleSided) {
            //if single-handled, a simple method to expand the fill bar
            _this.$fill.css(hOrW, pctOfBar * 100 + '%');
          } else {
            //otherwise, use the css object we created above
            _this.$fill.css(css);
          }
        });

        /**
         * Fires when the value has not been change for a given time.
         * @event Slider#changed
         */
        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
          _this.$element.trigger('changed.zf.slider', [$hndl]);
        }, _this.options.changedDelay);
      }

      /**
       * Sets the initial attribute for the slider element.
       * @function
       * @private
       * @param {Number} idx - index of the current handle/input to use.
       */

    }, {
      key: '_setInitAttr',
      value: function _setInitAttr(idx) {
        var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
        this.inputs.eq(idx).attr({
          'id': id,
          'max': this.options.end,
          'min': this.options.start,
          'step': this.options.step
        });
        this.handles.eq(idx).attr({
          'role': 'slider',
          'aria-controls': id,
          'aria-valuemax': this.options.end,
          'aria-valuemin': this.options.start,
          'aria-valuenow': idx === 0 ? this.options.initialStart : this.options.initialEnd,
          'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
          'tabindex': 0
        });
      }

      /**
       * Sets the input and `aria-valuenow` values for the slider element.
       * @function
       * @private
       * @param {jQuery} $handle - the currently selected handle.
       * @param {Number} val - floating point of the new value.
       */

    }, {
      key: '_setValues',
      value: function _setValues($handle, val) {
        var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
        this.inputs.eq(idx).val(val);
        $handle.attr('aria-valuenow', val);
      }

      /**
       * Handles events on the slider element.
       * Calculates the new location of the current handle.
       * If there are two handles and the bar was clicked, it determines which handle to move.
       * @function
       * @private
       * @param {Object} e - the `event` object passed from the listener.
       * @param {jQuery} $handle - the current handle to calculate for, if selected.
       * @param {Number} val - floating point number for the new value of the slider.
       * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
       */

    }, {
      key: '_handleEvent',
      value: function _handleEvent(e, $handle, val) {
        var value, hasVal;
        if (!val) {
          //click or drag events
          e.preventDefault();
          var _this = this,
              vertical = this.options.vertical,
              param = vertical ? 'height' : 'width',
              direction = vertical ? 'top' : 'left',
              eventOffset = vertical ? e.pageY : e.pageX,
              halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
              barDim = this.$element[0].getBoundingClientRect()[param],
              windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

          var elemOffset = this.$element.offset()[direction];

          // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
          // best way to guess this is simulated is if clientY == pageY
          if (e.clientY === e.pageY) {
            eventOffset = eventOffset + windowScroll;
          }
          var eventFromBar = eventOffset - elemOffset;
          var barXY;
          if (eventFromBar < 0) {
            barXY = 0;
          } else if (eventFromBar > barDim) {
            barXY = barDim;
          } else {
            barXY = eventFromBar;
          }
          offsetPct = percent(barXY, barDim);

          value = (this.options.end - this.options.start) * offsetPct + this.options.start;

          // turn everything around for RTL, yay math!
          if (Foundation.rtl() && !this.options.vertical) {
            value = this.options.end - value;
          }

          value = _this._adjustValue(null, value);
          //boolean flag for the setHandlePos fn, specifically for vertical sliders
          hasVal = false;

          if (!$handle) {
            //figure out which handle it is, pass it to the next function.
            var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
                secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
            $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
          }
        } else {
          //change event on input
          value = this._adjustValue(null, val);
          hasVal = true;
        }

        this._setHandlePos($handle, value, hasVal);
      }

      /**
       * Adjustes value for handle in regard to step value. returns adjusted value
       * @function
       * @private
       * @param {jQuery} $handle - the selected handle.
       * @param {Number} value - value to adjust. used if $handle is falsy
       */

    }, {
      key: '_adjustValue',
      value: function _adjustValue($handle, value) {
        var val,
            step = this.options.step,
            div = parseFloat(step / 2),
            left,
            prev_val,
            next_val;
        if (!!$handle) {
          val = parseFloat($handle.attr('aria-valuenow'));
        } else {
          val = value;
        }
        left = val % step;
        prev_val = val - left;
        next_val = prev_val + step;
        if (left === 0) {
          return val;
        }
        val = val >= prev_val + div ? next_val : prev_val;
        return val;
      }

      /**
       * Adds event listeners to the slider elements.
       * @function
       * @private
       * @param {jQuery} $handle - the current handle to apply listeners to.
       */

    }, {
      key: '_events',
      value: function _events($handle) {
        var _this = this,
            curHandle,
            timer;

        this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
          var idx = _this.inputs.index($(this));
          _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
        });

        if (this.options.clickSelect) {
          this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
            if (_this.$element.data('dragging')) {
              return false;
            }

            if (!$(e.target).is('[data-slider-handle]')) {
              if (_this.options.doubleSided) {
                _this._handleEvent(e);
              } else {
                _this._handleEvent(e, _this.$handle);
              }
            }
          });
        }

        if (this.options.draggable) {
          this.handles.addTouch();

          var $body = $('body');
          $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
            $handle.addClass('is-dragging');
            _this.$fill.addClass('is-dragging'); //
            _this.$element.data('dragging', true);

            curHandle = $(e.currentTarget);

            $body.on('mousemove.zf.slider', function (e) {
              e.preventDefault();
              _this._handleEvent(e, curHandle);
            }).on('mouseup.zf.slider', function (e) {
              _this._handleEvent(e, curHandle);

              $handle.removeClass('is-dragging');
              _this.$fill.removeClass('is-dragging');
              _this.$element.data('dragging', false);

              $body.off('mousemove.zf.slider mouseup.zf.slider');
            });
          })
          // prevent events triggered by touch
          .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
            e.preventDefault();
          });
        }

        $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
          var _$handle = $(this),
              idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
              oldValue = parseFloat(_this.inputs.eq(idx).val()),
              newValue;

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Slider', {
            decrease: function () {
              newValue = oldValue - _this.options.step;
            },
            increase: function () {
              newValue = oldValue + _this.options.step;
            },
            decrease_fast: function () {
              newValue = oldValue - _this.options.step * 10;
            },
            increase_fast: function () {
              newValue = oldValue + _this.options.step * 10;
            },
            handled: function () {
              // only set handle pos when event was handled specially
              e.preventDefault();
              _this._setHandlePos(_$handle, newValue, true);
            }
          });
          /*if (newValue) { // if pressed key has special function, update value
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue);
          }*/
        });
      }

      /**
       * Destroys the slider plugin.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.handles.off('.zf.slider');
        this.inputs.off('.zf.slider');
        this.$element.off('.zf.slider');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Slider;
  }();

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @example 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @example 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @example 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @example 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @example 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @example false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @example true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @example false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @example true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @example false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @example false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @example 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @example 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @example 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @example false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @example 500
     */
    changedDelay: 500
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);

//*********this is in case we go to static, absolute positions instead of dynamic positioning********
// this.setSteps(function() {
//   _this._events();
//   var initStart = _this.options.positions[_this.options.initialStart - 1] || null;
//   var initEnd = _this.options.initialEnd ? _this.options.position[_this.options.initialEnd - 1] : null;
//   if (initStart || initEnd) {
//     _this._handleEvent(initStart, initEnd);
//   }
// });

//***********the other part of absolute positions*************
// Slider.prototype.setSteps = function(cb) {
//   var posChange = this.$element.outerWidth() / this.options.steps;
//   var counter = 0
//   while(counter < this.options.steps) {
//     if (counter) {
//       this.options.positions.push(this.options.positions[counter - 1] + posChange);
//     } else {
//       this.options.positions.push(posChange);
//     }
//     counter++;
//   }
//   cb();
// };
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
;'use strict';

jQuery('iframe[src*="youtube.com"]').wrap("<div class='flex-video widescreen'/>");
jQuery('iframe[src*="vimeo.com"]').wrap("<div class='flex-video widescreen vimeo'/>");
;"use strict";

jQuery(document).foundation();
;'use strict';

// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
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
                            //$( '#content-grid-container' ).foundation();
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

//General site-wide scripts for MSP Fly Mag

$('.mc_input').attr("placeholder", "Enter your email address");

if (window.location.href.indexOf("#mc_signup") > -1) {
	setTimeout(function () {
		var shareContainer = $('#share-follow');
		var sharePosition = shareContainer.offset().top;
		$("html, body").animate({ scrollTop: sharePosition - 40 }, 500);
	}, 500);
}
;"use strict";
;'use strict';

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
;'use strict';

$(window).bind(' load resize orientationChange ', function () {
  var footer = $("#footer-container");
  var pos = footer.position();
  var height = $(window).height();
  height = height - pos.top;
  height = height - footer.height() - 1;

  function stickyFooter() {
    footer.css({
      'margin-top': height + 'px'
    });
  }

  if (height > 0) {
    stickyFooter();
  }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub2ZmY2FudmFzLmpzIiwiZm91bmRhdGlvbi5vcmJpdC5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnUuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGUuanMiLCJmb3VuZGF0aW9uLnJldmVhbC5qcyIsImZvdW5kYXRpb24uc2xpZGVyLmpzIiwiZm91bmRhdGlvbi5zdGlja3kuanMiLCJmb3VuZGF0aW9uLnRhYnMuanMiLCJmb3VuZGF0aW9uLnRvZ2dsZXIuanMiLCJmb3VuZGF0aW9uLnRvb2x0aXAuanMiLCJtb3Rpb24tdWkuanMiLCJmbGV4LXZpZGVvLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwiam95cmlkZS1kZW1vLmpzIiwibG9hZC1tb3JlLmpzIiwibXNwZmx5LmpzIiwib2ZmQ2FudmFzLmpzIiwicGhvdG8tY2Fyb3VzZWwuanMiLCJzdGlja3lmb290ZXIuanMiXSwibmFtZXMiOlsid2luZG93Iiwid2hhdElucHV0IiwiYWN0aXZlS2V5cyIsImJvZHkiLCJidWZmZXIiLCJjdXJyZW50SW5wdXQiLCJub25UeXBpbmdJbnB1dHMiLCJtb3VzZVdoZWVsIiwiZGV0ZWN0V2hlZWwiLCJpZ25vcmVNYXAiLCJpbnB1dE1hcCIsImlucHV0VHlwZXMiLCJrZXlNYXAiLCJwb2ludGVyTWFwIiwidGltZXIiLCJldmVudEJ1ZmZlciIsImNsZWFyVGltZXIiLCJzZXRJbnB1dCIsImV2ZW50Iiwic2V0VGltZW91dCIsImJ1ZmZlcmVkRXZlbnQiLCJ1bkJ1ZmZlcmVkRXZlbnQiLCJjbGVhclRpbWVvdXQiLCJldmVudEtleSIsImtleSIsInZhbHVlIiwidHlwZSIsInBvaW50ZXJUeXBlIiwiZXZlbnRUYXJnZXQiLCJ0YXJnZXQiLCJldmVudFRhcmdldE5vZGUiLCJub2RlTmFtZSIsInRvTG93ZXJDYXNlIiwiZXZlbnRUYXJnZXRUeXBlIiwiZ2V0QXR0cmlidXRlIiwiaGFzQXR0cmlidXRlIiwiaW5kZXhPZiIsInN3aXRjaElucHV0IiwibG9nS2V5cyIsInN0cmluZyIsInNldEF0dHJpYnV0ZSIsInB1c2giLCJrZXlDb2RlIiwid2hpY2giLCJzcmNFbGVtZW50IiwidW5Mb2dLZXlzIiwiYXJyYXlQb3MiLCJzcGxpY2UiLCJiaW5kRXZlbnRzIiwiZG9jdW1lbnQiLCJQb2ludGVyRXZlbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiTVNQb2ludGVyRXZlbnQiLCJjcmVhdGVFbGVtZW50Iiwib25tb3VzZXdoZWVsIiwidW5kZWZpbmVkIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJhc2siLCJrZXlzIiwidHlwZXMiLCJzZXQiLCIkIiwiRk9VTkRBVElPTl9WRVJTSU9OIiwiRm91bmRhdGlvbiIsInZlcnNpb24iLCJfcGx1Z2lucyIsIl91dWlkcyIsInJ0bCIsImF0dHIiLCJwbHVnaW4iLCJuYW1lIiwiY2xhc3NOYW1lIiwiZnVuY3Rpb25OYW1lIiwiYXR0ck5hbWUiLCJoeXBoZW5hdGUiLCJyZWdpc3RlclBsdWdpbiIsInBsdWdpbk5hbWUiLCJjb25zdHJ1Y3RvciIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJ1bnJlZ2lzdGVyUGx1Z2luIiwicmVtb3ZlQXR0ciIsInJlbW92ZURhdGEiLCJwcm9wIiwicmVJbml0IiwicGx1Z2lucyIsImlzSlEiLCJlYWNoIiwiX2luaXQiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJsZW5ndGgiLCJuYW1lc3BhY2UiLCJNYXRoIiwicm91bmQiLCJwb3ciLCJyYW5kb20iLCJ0b1N0cmluZyIsInNsaWNlIiwicmVmbG93IiwiZWxlbSIsImkiLCIkZWxlbSIsImZpbmQiLCJhZGRCYWNrIiwiJGVsIiwib3B0cyIsIndhcm4iLCJ0aGluZyIsInNwbGl0IiwiZSIsIm9wdCIsIm1hcCIsImVsIiwidHJpbSIsInBhcnNlVmFsdWUiLCJlciIsImdldEZuTmFtZSIsInRyYW5zaXRpb25lbmQiLCJ0cmFuc2l0aW9ucyIsImVuZCIsInQiLCJzdHlsZSIsInRyaWdnZXJIYW5kbGVyIiwidXRpbCIsInRocm90dGxlIiwiZnVuYyIsImRlbGF5IiwiY29udGV4dCIsImFyZ3MiLCJhcmd1bWVudHMiLCJhcHBseSIsIm1ldGhvZCIsIiRtZXRhIiwiJG5vSlMiLCJhcHBlbmRUbyIsImhlYWQiLCJyZW1vdmVDbGFzcyIsIk1lZGlhUXVlcnkiLCJjYWxsIiwicGx1Z0NsYXNzIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0Iiwid2luWSIsInBhZ2VZT2Zmc2V0Iiwid2luWCIsInBhZ2VYT2Zmc2V0IiwicGFyZW50RGltcyIsImFuY2hvciIsInBvc2l0aW9uIiwidk9mZnNldCIsImhPZmZzZXQiLCJpc092ZXJmbG93IiwiJGVsZURpbXMiLCIkYW5jaG9yRGltcyIsImtleUNvZGVzIiwiY29tbWFuZHMiLCJLZXlib2FyZCIsImdldEtleUNvZGVzIiwicGFyc2VLZXkiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJrY3MiLCJrIiwia2MiLCJkZWZhdWx0UXVlcmllcyIsImxhbmRzY2FwZSIsInBvcnRyYWl0IiwicmV0aW5hIiwicXVlcmllcyIsImN1cnJlbnQiLCJzZWxmIiwiZXh0cmFjdGVkU3R5bGVzIiwiY3NzIiwibmFtZWRRdWVyaWVzIiwicGFyc2VTdHlsZVRvT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCJfZ2V0Q3VycmVudFNpemUiLCJfd2F0Y2hlciIsImF0TGVhc3QiLCJzaXplIiwicXVlcnkiLCJnZXQiLCJtYXRjaE1lZGlhIiwibWF0Y2hlcyIsIm1hdGNoZWQiLCJvbiIsIm5ld1NpemUiLCJjdXJyZW50U2l6ZSIsInN0eWxlTWVkaWEiLCJtZWRpYSIsInNjcmlwdCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwiaW5mbyIsImlkIiwiaW5zZXJ0QmVmb3JlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImN1cnJlbnRTdHlsZSIsIm1hdGNoTWVkaXVtIiwidGV4dCIsInN0eWxlU2hlZXQiLCJjc3NUZXh0IiwidGV4dENvbnRlbnQiLCJzdHlsZU9iamVjdCIsInJlZHVjZSIsInJldCIsInBhcmFtIiwicGFydHMiLCJ2YWwiLCJkZWNvZGVVUklDb21wb25lbnQiLCJpc0FycmF5IiwiaW5pdENsYXNzZXMiLCJhY3RpdmVDbGFzc2VzIiwiTW90aW9uIiwiYW5pbWF0ZUluIiwiYW5pbWF0aW9uIiwiY2IiLCJhbmltYXRlIiwiYW5pbWF0ZU91dCIsIk1vdmUiLCJkdXJhdGlvbiIsImFuaW0iLCJwcm9nIiwibW92ZSIsInRzIiwiaXNJbiIsImVxIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwic2luZ2xlSW1hZ2VMb2FkZWQiLCJuYXR1cmFsV2lkdGgiLCJzcG90U3dpcGUiLCJlbmFibGVkIiwiZG9jdW1lbnRFbGVtZW50IiwicHJldmVudERlZmF1bHQiLCJtb3ZlVGhyZXNob2xkIiwidGltZVRocmVzaG9sZCIsInN0YXJ0UG9zWCIsInN0YXJ0UG9zWSIsInN0YXJ0VGltZSIsImVsYXBzZWRUaW1lIiwiaXNNb3ZpbmciLCJvblRvdWNoRW5kIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9uVG91Y2hNb3ZlIiwieCIsInRvdWNoZXMiLCJwYWdlWCIsInkiLCJwYWdlWSIsImR4IiwiZHkiLCJkaXIiLCJhYnMiLCJvblRvdWNoU3RhcnQiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJsb2FkIiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJjbG9zZW1lTGlzdGVuZXIiLCJ5ZXRpQm94ZXMiLCJwbHVnTmFtZXMiLCJsaXN0ZW5lcnMiLCJqb2luIiwib2ZmIiwicGx1Z2luSWQiLCJub3QiLCJkZWJvdW5jZSIsIiRub2RlcyIsIm5vZGVzIiwicXVlcnlTZWxlY3RvckFsbCIsImxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24iLCJtdXRhdGlvblJlY29yZHNMaXN0IiwiJHRhcmdldCIsImVsZW1lbnRPYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVzIiwiY2hpbGRMaXN0IiwiY2hhcmFjdGVyRGF0YSIsInN1YnRyZWUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJJSGVhcllvdSIsIkFiaWRlIiwiZGVmYXVsdHMiLCIkaW5wdXRzIiwiX2V2ZW50cyIsInJlc2V0Rm9ybSIsInZhbGlkYXRlRm9ybSIsInZhbGlkYXRlT24iLCJ2YWxpZGF0ZUlucHV0IiwibGl2ZVZhbGlkYXRlIiwiaXNHb29kIiwiY2hlY2tlZCIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCIkbGFiZWwiLCJjbG9zZXN0IiwiJGVscyIsImxhYmVscyIsImZpbmRMYWJlbCIsIiRmb3JtRXJyb3IiLCJmaW5kRm9ybUVycm9yIiwibGFiZWxFcnJvckNsYXNzIiwiZm9ybUVycm9yQ2xhc3MiLCJpbnB1dEVycm9yQ2xhc3MiLCJncm91cE5hbWUiLCIkbGFiZWxzIiwiZmluZFJhZGlvTGFiZWxzIiwiJGZvcm1FcnJvcnMiLCJyZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcyIsImNsZWFyUmVxdWlyZSIsInJlcXVpcmVkQ2hlY2siLCJ2YWxpZGF0ZWQiLCJjdXN0b21WYWxpZGF0b3IiLCJ2YWxpZGF0b3IiLCJlcXVhbFRvIiwidmFsaWRhdGVSYWRpbyIsInZhbGlkYXRlVGV4dCIsIm1hdGNoVmFsaWRhdGlvbiIsInZhbGlkYXRvcnMiLCJnb29kVG9HbyIsIm1lc3NhZ2UiLCJhY2MiLCJub0Vycm9yIiwicGF0dGVybiIsImlucHV0VGV4dCIsInZhbGlkIiwicGF0dGVybnMiLCJSZWdFeHAiLCIkZ3JvdXAiLCJyZXF1aXJlZCIsImNsZWFyIiwidiIsIiRmb3JtIiwicmVtb3ZlRXJyb3JDbGFzc2VzIiwiYWxwaGEiLCJhbHBoYV9udW1lcmljIiwiaW50ZWdlciIsIm51bWJlciIsImNhcmQiLCJjdnYiLCJlbWFpbCIsInVybCIsImRvbWFpbiIsImRhdGV0aW1lIiwiZGF0ZSIsInRpbWUiLCJkYXRlSVNPIiwibW9udGhfZGF5X3llYXIiLCJkYXlfbW9udGhfeWVhciIsImNvbG9yIiwiQWNjb3JkaW9uIiwiJHRhYnMiLCJpZHgiLCIkY29udGVudCIsImxpbmtJZCIsIiRpbml0QWN0aXZlIiwiZG93biIsIiR0YWJDb250ZW50IiwiaGFzQ2xhc3MiLCJhbGxvd0FsbENsb3NlZCIsInVwIiwidG9nZ2xlIiwibmV4dCIsIiRhIiwiZm9jdXMiLCJtdWx0aUV4cGFuZCIsInByZXZpb3VzIiwicHJldiIsImZpcnN0VGltZSIsIiRjdXJyZW50QWN0aXZlIiwic2xpZGVEb3duIiwic2xpZGVTcGVlZCIsIiRhdW50cyIsImNhbkNsb3NlIiwic2xpZGVVcCIsInN0b3AiLCJBY2NvcmRpb25NZW51IiwibXVsdGlPcGVuIiwiJG1lbnVMaW5rcyIsInN1YklkIiwiaXNBY3RpdmUiLCJpbml0UGFuZXMiLCIkc3VibWVudSIsIiRlbGVtZW50cyIsIiRwcmV2RWxlbWVudCIsIiRuZXh0RWxlbWVudCIsIm1pbiIsInBhcmVudHMiLCJvcGVuIiwiY2xvc2UiLCJjbG9zZUFsbCIsImhpZGVBbGwiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJwYXJlbnRzVW50aWwiLCJhZGQiLCIkbWVudXMiLCJEcmlsbGRvd24iLCIkc3VibWVudUFuY2hvcnMiLCIkc3VibWVudXMiLCIkbWVudUl0ZW1zIiwiX3ByZXBhcmVNZW51IiwiX2tleWJvYXJkRXZlbnRzIiwiJGxpbmsiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsInByZXBlbmQiLCJiYWNrQnV0dG9uIiwiX2JhY2siLCIkd3JhcHBlciIsIndyYXBwZXIiLCJfZ2V0TWF4RGltcyIsIl9zaG93IiwiY2xvc2VPbkNsaWNrIiwiJGJvZHkiLCJjb250YWlucyIsIl9oaWRlQWxsIiwiX2hpZGUiLCJibHVyIiwicmVzdWx0IiwibnVtT2ZFbGVtcyIsInVud3JhcCIsInJlbW92ZSIsIkRyb3Bkb3duIiwiJGlkIiwiJGFuY2hvciIsInBvc2l0aW9uQ2xhc3MiLCJnZXRQb3NpdGlvbkNsYXNzIiwiY291bnRlciIsInVzZWRQb3NpdGlvbnMiLCJ2ZXJ0aWNhbFBvc2l0aW9uIiwibWF0Y2giLCJob3Jpem9udGFsUG9zaXRpb24iLCJjbGFzc0NoYW5nZWQiLCJkaXJlY3Rpb24iLCJfcmVwb3NpdGlvbiIsIl9zZXRQb3NpdGlvbiIsImhvdmVyIiwidGltZW91dCIsImhvdmVyRGVsYXkiLCJob3ZlclBhbmUiLCJ2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMiLCJ0YWJfZm9yd2FyZCIsInRyYXBGb2N1cyIsInRhYl9iYWNrd2FyZCIsImF1dG9Gb2N1cyIsIiRmb2N1c2FibGUiLCJfYWRkQm9keUhhbmRsZXIiLCJjdXJQb3NpdGlvbkNsYXNzIiwiRHJvcGRvd25NZW51Iiwic3VicyIsInZlcnRpY2FsQ2xhc3MiLCJyaWdodENsYXNzIiwiYWxpZ25tZW50IiwiY2hhbmdlZCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIiRzaWJzIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJFcXVhbGl6ZXIiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsImlzT24iLCJfYmluZEhhbmRsZXIiLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9yZWZsb3ciLCJfcGF1c2VFdmVudHMiLCJlcXVhbGl6ZU9uU3RhY2siLCJfaXNTdGFja2VkIiwiZXF1YWxpemVCeVJvdyIsImdldEhlaWdodHNCeVJvdyIsImFwcGx5SGVpZ2h0QnlSb3ciLCJnZXRIZWlnaHRzIiwiYXBwbHlIZWlnaHQiLCJoZWlnaHRzIiwibGVuIiwib2Zmc2V0SGVpZ2h0IiwibGFzdEVsVG9wT2Zmc2V0IiwiZ3JvdXBzIiwiZ3JvdXAiLCJlbE9mZnNldFRvcCIsImoiLCJsbiIsImdyb3Vwc0lMZW5ndGgiLCJsZW5KIiwiSW50ZXJjaGFuZ2UiLCJydWxlcyIsImN1cnJlbnRQYXRoIiwiX2FkZEJyZWFrcG9pbnRzIiwiX2dlbmVyYXRlUnVsZXMiLCJydWxlIiwicGF0aCIsIlNQRUNJQUxfUVVFUklFUyIsInJ1bGVzTGlzdCIsInJlc3BvbnNlIiwiaHRtbCIsIk1hZ2VsbGFuIiwiJHRhcmdldHMiLCIkbGlua3MiLCIkYWN0aXZlIiwic2Nyb2xsUG9zIiwicGFyc2VJbnQiLCJwb2ludHMiLCJ3aW5IZWlnaHQiLCJpbm5lckhlaWdodCIsImNsaWVudEhlaWdodCIsImRvY0hlaWdodCIsInNjcm9sbEhlaWdodCIsIiR0YXIiLCJwdCIsInRocmVzaG9sZCIsInRhcmdldFBvaW50IiwiYW5pbWF0aW9uRHVyYXRpb24iLCJlYXNpbmciLCJhbmltYXRpb25FYXNpbmciLCJkZWVwTGlua2luZyIsImxvY2F0aW9uIiwiaGFzaCIsInNjcm9sbFRvTG9jIiwiY2FsY1BvaW50cyIsIl91cGRhdGVBY3RpdmUiLCJhcnJpdmFsIiwibG9jIiwiYmFyT2Zmc2V0Iiwic2Nyb2xsVG9wIiwid2luUG9zIiwiY3VySWR4IiwiaXNEb3duIiwiY3VyVmlzaWJsZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJPZmZDYW52YXMiLCIkbGFzdFRyaWdnZXIiLCIkdHJpZ2dlcnMiLCIkZXhpdGVyIiwiZXhpdGVyIiwiYXBwZW5kIiwiaXNSZXZlYWxlZCIsInJldmVhbENsYXNzIiwicmV2ZWFsT24iLCJfc2V0TVFDaGVja2VyIiwidHJhbnNpdGlvblRpbWUiLCJfaGFuZGxlS2V5Ym9hcmQiLCJyZXZlYWwiLCIkY2xvc2VyIiwiZm9yY2VUb3AiLCJfdHJhcEZvY3VzIiwiZm9jdXNhYmxlIiwibGFzdCIsImtleWNvZGUiLCJPcmJpdCIsImNvbnRhaW5lckNsYXNzIiwiJHNsaWRlcyIsInNsaWRlQ2xhc3MiLCIkaW1hZ2VzIiwiaW5pdEFjdGl2ZSIsInVzZU1VSSIsIl9wcmVwYXJlRm9yT3JiaXQiLCJidWxsZXRzIiwiX2xvYWRCdWxsZXRzIiwiYXV0b1BsYXkiLCJnZW9TeW5jIiwiYWNjZXNzaWJsZSIsIiRidWxsZXRzIiwiYm94T2ZCdWxsZXRzIiwidGltZXJEZWxheSIsImNoYW5nZVNsaWRlIiwiX3NldFdyYXBwZXJIZWlnaHQiLCJfc2V0U2xpZGVIZWlnaHQiLCJ0ZW1wIiwicGF1c2VPbkhvdmVyIiwibmF2QnV0dG9ucyIsIiRjb250cm9scyIsIm5leHRDbGFzcyIsInByZXZDbGFzcyIsIiRzbGlkZSIsImlzTFRSIiwiY2hvc2VuU2xpZGUiLCIkY3VyU2xpZGUiLCIkZmlyc3RTbGlkZSIsIiRsYXN0U2xpZGUiLCJkaXJJbiIsImRpck91dCIsIiRuZXdTbGlkZSIsImluZmluaXRlV3JhcCIsIl91cGRhdGVCdWxsZXRzIiwiJG9sZEJ1bGxldCIsInNwYW4iLCJkZXRhY2giLCIkbmV3QnVsbGV0IiwiYW5pbUluRnJvbVJpZ2h0IiwiYW5pbU91dFRvUmlnaHQiLCJhbmltSW5Gcm9tTGVmdCIsImFuaW1PdXRUb0xlZnQiLCJSZXNwb25zaXZlTWVudSIsImN1cnJlbnRNcSIsImN1cnJlbnRQbHVnaW4iLCJydWxlc1RyZWUiLCJydWxlU2l6ZSIsInJ1bGVQbHVnaW4iLCJNZW51UGx1Z2lucyIsImlzRW1wdHlPYmplY3QiLCJfY2hlY2tNZWRpYVF1ZXJpZXMiLCJtYXRjaGVkTXEiLCJjc3NDbGFzcyIsImRlc3Ryb3kiLCJkcm9wZG93biIsImRyaWxsZG93biIsImFjY29yZGlvbiIsIlJlc3BvbnNpdmVUb2dnbGUiLCJ0YXJnZXRJRCIsIiR0YXJnZXRNZW51IiwiJHRvZ2dsZXIiLCJfdXBkYXRlIiwiX3VwZGF0ZU1xSGFuZGxlciIsInRvZ2dsZU1lbnUiLCJoaWRlRm9yIiwiUmV2ZWFsIiwiY2FjaGVkIiwibXEiLCJpc01vYmlsZSIsIm1vYmlsZVNuaWZmIiwiZnVsbFNjcmVlbiIsIm92ZXJsYXkiLCIkb3ZlcmxheSIsIl9tYWtlT3ZlcmxheSIsImRlZXBMaW5rIiwib3V0ZXJXaWR0aCIsIm91dGVySGVpZ2h0IiwibWFyZ2luIiwiX3VwZGF0ZVBvc2l0aW9uIiwiX2hhbmRsZVN0YXRlIiwibXVsdGlwbGVPcGVuZWQiLCJhbmltYXRpb25JbiIsImFmdGVyQW5pbWF0aW9uRm9jdXMiLCJsb2ciLCJmb2N1c2FibGVFbGVtZW50cyIsInNob3dEZWxheSIsIm9yaWdpbmFsU2Nyb2xsUG9zIiwiX2V4dHJhSGFuZGxlcnMiLCJjbG9zZU9uRXNjIiwiYW5pbWF0aW9uT3V0IiwiZmluaXNoVXAiLCJoaWRlRGVsYXkiLCJyZXNldE9uQ2xvc2UiLCJyZXBsYWNlU3RhdGUiLCJ0aXRsZSIsInBhdGhuYW1lIiwiYnRtT2Zmc2V0UGN0IiwiaVBob25lU25pZmYiLCJhbmRyb2lkU25pZmYiLCJTbGlkZXIiLCJpbnB1dHMiLCJoYW5kbGVzIiwiJGhhbmRsZSIsIiRpbnB1dCIsIiRmaWxsIiwidmVydGljYWwiLCJpc0RibCIsImRpc2FibGVkIiwiZGlzYWJsZWRDbGFzcyIsImJpbmRpbmciLCJfc2V0SW5pdEF0dHIiLCJkb3VibGVTaWRlZCIsIiRoYW5kbGUyIiwiJGlucHV0MiIsIl9zZXRIYW5kbGVQb3MiLCJpbml0aWFsU3RhcnQiLCJpbml0aWFsRW5kIiwiJGhuZGwiLCJub0ludmVydCIsImgyVmFsIiwic3RlcCIsImgxVmFsIiwidmVydCIsImhPclciLCJsT3JUIiwiaGFuZGxlRGltIiwiZWxlbURpbSIsInBjdE9mQmFyIiwicGVyY2VudCIsInRvRml4ZWQiLCJweFRvTW92ZSIsIm1vdmVtZW50IiwiZGVjaW1hbCIsIl9zZXRWYWx1ZXMiLCJpc0xlZnRIbmRsIiwiZGltIiwiaGFuZGxlUGN0IiwiaGFuZGxlUG9zIiwibW92ZVRpbWUiLCJjaGFuZ2VkRGVsYXkiLCJoYXNWYWwiLCJldmVudE9mZnNldCIsImhhbGZPZkhhbmRsZSIsImJhckRpbSIsIndpbmRvd1Njcm9sbCIsInNjcm9sbExlZnQiLCJlbGVtT2Zmc2V0IiwiZXZlbnRGcm9tQmFyIiwiYmFyWFkiLCJvZmZzZXRQY3QiLCJfYWRqdXN0VmFsdWUiLCJmaXJzdEhuZGxQb3MiLCJhYnNQb3NpdGlvbiIsInNlY25kSG5kbFBvcyIsImRpdiIsInByZXZfdmFsIiwibmV4dF92YWwiLCJjdXJIYW5kbGUiLCJfaGFuZGxlRXZlbnQiLCJjbGlja1NlbGVjdCIsImRyYWdnYWJsZSIsImN1cnJlbnRUYXJnZXQiLCJfJGhhbmRsZSIsIm9sZFZhbHVlIiwibmV3VmFsdWUiLCJkZWNyZWFzZSIsImluY3JlYXNlIiwiZGVjcmVhc2VfZmFzdCIsImluY3JlYXNlX2Zhc3QiLCJpbnZlcnRWZXJ0aWNhbCIsImZyYWMiLCJudW0iLCJjbGlja1BvcyIsIlN0aWNreSIsIiRwYXJlbnQiLCJ3YXNXcmFwcGVkIiwiJGNvbnRhaW5lciIsImNvbnRhaW5lciIsIndyYXBJbm5lciIsInN0aWNreUNsYXNzIiwic2Nyb2xsQ291bnQiLCJjaGVja0V2ZXJ5IiwiaXNTdHVjayIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsIl9jYWxjIiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwic2Nyb2xsIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJlbGVtSGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiY29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIiRmaXJzdFRhYiIsIiRsYXN0VGFiIiwid3JhcE9uS2V5cyIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCIkb2xkVGFiIiwiaWRTdHIiLCJwYW5lbENsYXNzIiwicGFuZWwiLCJjaGVja0NsYXNzIiwiVG9nZ2xlciIsImlucHV0IiwidG9nZ2xlQ2xhc3MiLCJfdXBkYXRlQVJJQSIsIlRvb2x0aXAiLCJpc0NsaWNrIiwiZWxlbUlkIiwiX2dldFBvc2l0aW9uQ2xhc3MiLCJ0aXBUZXh0IiwidGVtcGxhdGUiLCJfYnVpbGRUZW1wbGF0ZSIsInRyaWdnZXJDbGFzcyIsInRlbXBsYXRlQ2xhc3NlcyIsInRvb2x0aXBDbGFzcyIsIiR0ZW1wbGF0ZSIsIiR0aXBEaW1zIiwic2hvd09uIiwiZmFkZUluIiwiZmFkZUluRHVyYXRpb24iLCJmYWRlT3V0RHVyYXRpb24iLCJpc0ZvY3VzIiwiZGlzYWJsZUZvclRvdWNoIiwidG91Y2hDbG9zZVRleHQiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwiYWpheENvbXBsZXRlIiwiYnV0dG9uIiwicGFnZSIsImxvYWRpbmciLCJhbGxEb25lIiwic2Nyb2xsSGFuZGxpbmciLCJhbGxvdyIsInJlYWxsb3ciLCJhY3Rpb24iLCJub25jZSIsImJlbG9hZG1vcmUiLCJwb3N0IiwicmVzIiwic3VjY2VzcyIsImZhaWwiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiaHJlZiIsInNoYXJlQ29udGFpbmVyIiwic2hhcmVQb3NpdGlvbiIsInNsaWNrIiwic2xpZGUiLCJzbGlkZXNUb1Nob3ciLCJzbGlkZXNUb1Njcm9sbCIsImFycm93cyIsImZhZGUiLCJhc05hdkZvciIsImRvdHMiLCJjZW50ZXJNb2RlIiwiZm9jdXNPblNlbGVjdCIsImZvb3RlciIsInBvcyIsInN0aWNreUZvb3RlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsT0FBT0MsU0FBUCxHQUFvQixZQUFXOztBQUU3Qjs7QUFFQTs7Ozs7O0FBTUE7O0FBQ0EsTUFBSUMsYUFBYSxFQUFqQjs7QUFFQTtBQUNBLE1BQUlDLElBQUo7O0FBRUE7QUFDQSxNQUFJQyxTQUFTLEtBQWI7O0FBRUE7QUFDQSxNQUFJQyxlQUFlLElBQW5COztBQUVBO0FBQ0EsTUFBSUMsa0JBQWtCLENBQ3BCLFFBRG9CLEVBRXBCLFVBRm9CLEVBR3BCLE1BSG9CLEVBSXBCLE9BSm9CLEVBS3BCLE9BTG9CLEVBTXBCLE9BTm9CLEVBT3BCLFFBUG9CLENBQXRCOztBQVVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhQyxhQUFqQjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsWUFBWSxDQUNkLEVBRGMsRUFDVjtBQUNKLElBRmMsRUFFVjtBQUNKLElBSGMsRUFHVjtBQUNKLElBSmMsRUFJVjtBQUNKLElBTGMsQ0FLVjtBQUxVLEdBQWhCOztBQVFBO0FBQ0EsTUFBSUMsV0FBVztBQUNiLGVBQVcsVUFERTtBQUViLGFBQVMsVUFGSTtBQUdiLGlCQUFhLE9BSEE7QUFJYixpQkFBYSxPQUpBO0FBS2IscUJBQWlCLFNBTEo7QUFNYixxQkFBaUIsU0FOSjtBQU9iLG1CQUFlLFNBUEY7QUFRYixtQkFBZSxTQVJGO0FBU2Isa0JBQWM7QUFURCxHQUFmOztBQVlBO0FBQ0FBLFdBQVNGLGFBQVQsSUFBMEIsT0FB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aUJBQWU7QUFSbUIsQ0FBcEM7OztBQ1JBejhCLEVBQUU5RCxNQUFGLEVBQVU2SyxJQUFWLENBQWUsaUNBQWYsRUFBa0QsWUFBWTtBQUMzRCxNQUFJMjFCLFNBQVMxOEIsRUFBRSxtQkFBRixDQUFiO0FBQ0EsTUFBSTI4QixNQUFNRCxPQUFPN3lCLFFBQVAsRUFBVjtBQUNBLE1BQUloQixTQUFTN0ksRUFBRTlELE1BQUYsRUFBVTJNLE1BQVYsRUFBYjtBQUNBQSxXQUFTQSxTQUFTOHpCLElBQUlwMEIsR0FBdEI7QUFDQU0sV0FBU0EsU0FBUzZ6QixPQUFPN3pCLE1BQVAsRUFBVCxHQUEwQixDQUFuQzs7QUFFQSxXQUFTK3pCLFlBQVQsR0FBd0I7QUFDdEJGLFdBQU9qd0IsR0FBUCxDQUFXO0FBQ1Asb0JBQWM1RCxTQUFTO0FBRGhCLEtBQVg7QUFHRDs7QUFFRCxNQUFJQSxTQUFTLENBQWIsRUFBZ0I7QUFDZCt6QjtBQUNEO0FBQ0gsQ0FoQkQiLCJmaWxlIjoiZm91bmRhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aGF0SW5wdXQgPSAoZnVuY3Rpb24oKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdmFyaWFibGVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gYXJyYXkgb2YgYWN0aXZlbHkgcHJlc3NlZCBrZXlzXG4gIHZhciBhY3RpdmVLZXlzID0gW107XG5cbiAgLy8gY2FjaGUgZG9jdW1lbnQuYm9keVxuICB2YXIgYm9keTtcblxuICAvLyBib29sZWFuOiB0cnVlIGlmIHRvdWNoIGJ1ZmZlciB0aW1lciBpcyBydW5uaW5nXG4gIHZhciBidWZmZXIgPSBmYWxzZTtcblxuICAvLyB0aGUgbGFzdCB1c2VkIGlucHV0IHR5cGVcbiAgdmFyIGN1cnJlbnRJbnB1dCA9IG51bGw7XG5cbiAgLy8gYGlucHV0YCB0eXBlcyB0aGF0IGRvbid0IGFjY2VwdCB0ZXh0XG4gIHZhciBub25UeXBpbmdJbnB1dHMgPSBbXG4gICAgJ2J1dHRvbicsXG4gICAgJ2NoZWNrYm94JyxcbiAgICAnZmlsZScsXG4gICAgJ2ltYWdlJyxcbiAgICAncmFkaW8nLFxuICAgICdyZXNldCcsXG4gICAgJ3N1Ym1pdCdcbiAgXTtcblxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcbiAgLy8gdmlhIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbFxuICB2YXIgbW91c2VXaGVlbCA9IGRldGVjdFdoZWVsKCk7XG5cbiAgLy8gbGlzdCBvZiBtb2RpZmllciBrZXlzIGNvbW1vbmx5IHVzZWQgd2l0aCB0aGUgbW91c2UgYW5kXG4gIC8vIGNhbiBiZSBzYWZlbHkgaWdub3JlZCB0byBwcmV2ZW50IGZhbHNlIGtleWJvYXJkIGRldGVjdGlvblxuICB2YXIgaWdub3JlTWFwID0gW1xuICAgIDE2LCAvLyBzaGlmdFxuICAgIDE3LCAvLyBjb250cm9sXG4gICAgMTgsIC8vIGFsdFxuICAgIDkxLCAvLyBXaW5kb3dzIGtleSAvIGxlZnQgQXBwbGUgY21kXG4gICAgOTMgIC8vIFdpbmRvd3MgbWVudSAvIHJpZ2h0IEFwcGxlIGNtZFxuICBdO1xuXG4gIC8vIG1hcHBpbmcgb2YgZXZlbnRzIHRvIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dE1hcCA9IHtcbiAgICAna2V5ZG93bic6ICdrZXlib2FyZCcsXG4gICAgJ2tleXVwJzogJ2tleWJvYXJkJyxcbiAgICAnbW91c2Vkb3duJzogJ21vdXNlJyxcbiAgICAnbW91c2Vtb3ZlJzogJ21vdXNlJyxcbiAgICAnTVNQb2ludGVyRG93bic6ICdwb2ludGVyJyxcbiAgICAnTVNQb2ludGVyTW92ZSc6ICdwb2ludGVyJyxcbiAgICAncG9pbnRlcmRvd24nOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJtb3ZlJzogJ3BvaW50ZXInLFxuICAgICd0b3VjaHN0YXJ0JzogJ3RvdWNoJ1xuICB9O1xuXG4gIC8vIGFkZCBjb3JyZWN0IG1vdXNlIHdoZWVsIGV2ZW50IG1hcHBpbmcgdG8gYGlucHV0TWFwYFxuICBpbnB1dE1hcFtkZXRlY3RXaGVlbCgpXSA9ICdtb3VzZSc7XG5cbiAgLy8gYXJyYXkgb2YgYWxsIHVzZWQgaW5wdXQgdHlwZXNcbiAgdmFyIGlucHV0VHlwZXMgPSBbXTtcblxuICAvLyBtYXBwaW5nIG9mIGtleSBjb2RlcyB0byBhIGNvbW1vbiBuYW1lXG4gIHZhciBrZXlNYXAgPSB7XG4gICAgOTogJ3RhYicsXG4gICAgMTM6ICdlbnRlcicsXG4gICAgMTY6ICdzaGlmdCcsXG4gICAgMjc6ICdlc2MnLFxuICAgIDMyOiAnc3BhY2UnLFxuICAgIDM3OiAnbGVmdCcsXG4gICAgMzg6ICd1cCcsXG4gICAgMzk6ICdyaWdodCcsXG4gICAgNDA6ICdkb3duJ1xuICB9O1xuXG4gIC8vIG1hcCBvZiBJRSAxMCBwb2ludGVyIGV2ZW50c1xuICB2YXIgcG9pbnRlck1hcCA9IHtcbiAgICAyOiAndG91Y2gnLFxuICAgIDM6ICd0b3VjaCcsIC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgNDogJ21vdXNlJ1xuICB9O1xuXG4gIC8vIHRvdWNoIGJ1ZmZlciB0aW1lclxuICB2YXIgdGltZXI7XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFsbG93cyBldmVudHMgdGhhdCBhcmUgYWxzbyB0cmlnZ2VyZWQgdG8gYmUgZmlsdGVyZWQgb3V0IGZvciBgdG91Y2hzdGFydGBcbiAgZnVuY3Rpb24gZXZlbnRCdWZmZXIoKSB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHNldElucHV0KGV2ZW50KTtcblxuICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGJ1ZmZlciA9IGZhbHNlO1xuICAgIH0sIDY1MCk7XG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJlZEV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFidWZmZXIpIHNldElucHV0KGV2ZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuQnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhclRpbWVyKCkge1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0SW5wdXQoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciB2YWx1ZSA9IGlucHV0TWFwW2V2ZW50LnR5cGVdO1xuICAgIGlmICh2YWx1ZSA9PT0gJ3BvaW50ZXInKSB2YWx1ZSA9IHBvaW50ZXJUeXBlKGV2ZW50KTtcblxuICAgIC8vIGRvbid0IGRvIGFueXRoaW5nIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBpbnB1dCB0eXBlIGFscmVhZHkgc2V0XG4gICAgaWYgKGN1cnJlbnRJbnB1dCAhPT0gdmFsdWUpIHtcbiAgICAgIHZhciBldmVudFRhcmdldCA9IHRhcmdldChldmVudCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXROb2RlID0gZXZlbnRUYXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBldmVudFRhcmdldFR5cGUgPSAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnKSA/IGV2ZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgndHlwZScpIDogbnVsbDtcblxuICAgICAgaWYgKFxuICAgICAgICAoLy8gb25seSBpZiB0aGUgdXNlciBmbGFnIHRvIGFsbG93IHR5cGluZyBpbiBmb3JtIGZpZWxkcyBpc24ndCBzZXRcbiAgICAgICAgIWJvZHkuaGFzQXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dC1mb3JtdHlwaW5nJykgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIGN1cnJlbnRJbnB1dCBoYXMgYSB2YWx1ZVxuICAgICAgICBjdXJyZW50SW5wdXQgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSBpbnB1dCBpcyBga2V5Ym9hcmRgXG4gICAgICAgIHZhbHVlID09PSAna2V5Ym9hcmQnICYmXG5cbiAgICAgICAgLy8gbm90IGlmIHRoZSBrZXkgaXMgYFRBQmBcbiAgICAgICAga2V5TWFwW2V2ZW50S2V5XSAhPT0gJ3RhYicgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSB0YXJnZXQgaXMgYSBmb3JtIGlucHV0IHRoYXQgYWNjZXB0cyB0ZXh0XG4gICAgICAgIChcbiAgICAgICAgICAgZXZlbnRUYXJnZXROb2RlID09PSAndGV4dGFyZWEnIHx8XG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3NlbGVjdCcgfHxcbiAgICAgICAgICAgKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JyAmJiBub25UeXBpbmdJbnB1dHMuaW5kZXhPZihldmVudFRhcmdldFR5cGUpIDwgMClcbiAgICAgICAgKSkgfHwgKFxuICAgICAgICAgIC8vIGlnbm9yZSBtb2RpZmllciBrZXlzXG4gICAgICAgICAgaWdub3JlTWFwLmluZGV4T2YoZXZlbnRLZXkpID4gLTFcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIC8vIGlnbm9yZSBrZXlib2FyZCB0eXBpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaElucHV0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09ICdrZXlib2FyZCcpIGxvZ0tleXMoZXZlbnRLZXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3dpdGNoSW5wdXQoc3RyaW5nKSB7XG4gICAgY3VycmVudElucHV0ID0gc3RyaW5nO1xuICAgIGJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dCcsIGN1cnJlbnRJbnB1dCk7XG5cbiAgICBpZiAoaW5wdXRUeXBlcy5pbmRleE9mKGN1cnJlbnRJbnB1dCkgPT09IC0xKSBpbnB1dFR5cGVzLnB1c2goY3VycmVudElucHV0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleShldmVudCkge1xuICAgIHJldHVybiAoZXZlbnQua2V5Q29kZSkgPyBldmVudC5rZXlDb2RlIDogZXZlbnQud2hpY2g7XG4gIH1cblxuICBmdW5jdGlvbiB0YXJnZXQoZXZlbnQpIHtcbiAgICByZXR1cm4gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludGVyVHlwZShldmVudCkge1xuICAgIGlmICh0eXBlb2YgZXZlbnQucG9pbnRlclR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gcG9pbnRlck1hcFtldmVudC5wb2ludGVyVHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoZXZlbnQucG9pbnRlclR5cGUgPT09ICdwZW4nKSA/ICd0b3VjaCcgOiBldmVudC5wb2ludGVyVHlwZTsgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcbiAgICB9XG4gIH1cblxuICAvLyBrZXlib2FyZCBsb2dnaW5nXG4gIGZ1bmN0aW9uIGxvZ0tleXMoZXZlbnRLZXkpIHtcbiAgICBpZiAoYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pID09PSAtMSAmJiBrZXlNYXBbZXZlbnRLZXldKSBhY3RpdmVLZXlzLnB1c2goa2V5TWFwW2V2ZW50S2V5XSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkxvZ0tleXMoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciBhcnJheVBvcyA9IGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKTtcblxuICAgIGlmIChhcnJheVBvcyAhPT0gLTEpIGFjdGl2ZUtleXMuc3BsaWNlKGFycmF5UG9zLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XG4gICAgYm9keSA9IGRvY3VtZW50LmJvZHk7XG5cbiAgICAvLyBwb2ludGVyIGV2ZW50cyAobW91c2UsIHBlbiwgdG91Y2gpXG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5NU1BvaW50ZXJFdmVudCkge1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJEb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlck1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBtb3VzZSBldmVudHNcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHNcbiAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZXZlbnRCdWZmZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdXNlIHdoZWVsXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKG1vdXNlV2hlZWwsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuTG9nS2V5cyk7XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdXRpbGl0aWVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgZnVuY3Rpb24gZGV0ZWN0V2hlZWwoKSB7XG4gICAgcmV0dXJuIG1vdXNlV2hlZWwgPSAnb253aGVlbCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykgP1xuICAgICAgJ3doZWVsJyA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuXG4gICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgICdtb3VzZXdoZWVsJyA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxuICAgICAgICAnRE9NTW91c2VTY3JvbGwnOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBpbml0XG5cbiAgICBkb24ndCBzdGFydCBzY3JpcHQgdW5sZXNzIGJyb3dzZXIgY3V0cyB0aGUgbXVzdGFyZCxcbiAgICBhbHNvIHBhc3NlcyBpZiBwb2x5ZmlsbHMgYXJlIHVzZWRcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICBpZiAoXG4gICAgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJlxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mXG4gICkge1xuXG4gICAgLy8gaWYgdGhlIGRvbSBpcyBhbHJlYWR5IHJlYWR5IGFscmVhZHkgKHNjcmlwdCB3YXMgcGxhY2VkIGF0IGJvdHRvbSBvZiA8Ym9keT4pXG4gICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGJpbmRFdmVudHMoKTtcblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgZG9tIHRvIGxvYWQgKHNjcmlwdCB3YXMgcGxhY2VkIGluIHRoZSA8aGVhZD4pXG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBiaW5kRXZlbnRzKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgYXBpXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgcmV0dXJuIHtcblxuICAgIC8vIHJldHVybnMgc3RyaW5nOiB0aGUgY3VycmVudCBpbnB1dCB0eXBlXG4gICAgYXNrOiBmdW5jdGlvbigpIHsgcmV0dXJuIGN1cnJlbnRJbnB1dDsgfSxcblxuICAgIC8vIHJldHVybnMgYXJyYXk6IGN1cnJlbnRseSBwcmVzc2VkIGtleXNcbiAgICBrZXlzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGFjdGl2ZUtleXM7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBhbGwgdGhlIGRldGVjdGVkIGlucHV0IHR5cGVzXG4gICAgdHlwZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5wdXRUeXBlczsgfSxcblxuICAgIC8vIGFjY2VwdHMgc3RyaW5nOiBtYW51YWxseSBzZXQgdGhlIGlucHV0IHR5cGVcbiAgICBzZXQ6IHN3aXRjaElucHV0XG4gIH07XG5cbn0oKSk7XG4iLCIhZnVuY3Rpb24oJCkge1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEZPVU5EQVRJT05fVkVSU0lPTiA9ICc2LjIuMic7XG5cbi8vIEdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuLy8gVGhpcyBpcyBhdHRhY2hlZCB0byB0aGUgd2luZG93LCBvciB1c2VkIGFzIGEgbW9kdWxlIGZvciBBTUQvQnJvd3NlcmlmeVxudmFyIEZvdW5kYXRpb24gPSB7XG4gIHZlcnNpb246IEZPVU5EQVRJT05fVkVSU0lPTixcblxuICAvKipcbiAgICogU3RvcmVzIGluaXRpYWxpemVkIHBsdWdpbnMuXG4gICAqL1xuICBfcGx1Z2luczoge30sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xuICAgKi9cbiAgX3V1aWRzOiBbXSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIGJvb2xlYW4gZm9yIFJUTCBzdXBwb3J0XG4gICAqL1xuICBydGw6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuICQoJ2h0bWwnKS5hdHRyKCdkaXInKSA9PT0gJ3J0bCc7XG4gIH0sXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgRm91bmRhdGlvbiBwbHVnaW4sIGFkZGluZyBpdCB0byB0aGUgYEZvdW5kYXRpb25gIG5hbWVzcGFjZSBhbmQgdGhlIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplIHdoZW4gcmVmbG93aW5nLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXG4gICAqL1xuICBwbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSkge1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuICAgIC8vIEV4YW1wbGVzOiBGb3VuZGF0aW9uLlJldmVhbCwgRm91bmRhdGlvbi5PZmZDYW52YXNcbiAgICB2YXIgY2xhc3NOYW1lID0gKG5hbWUgfHwgZnVuY3Rpb25OYW1lKHBsdWdpbikpO1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxuICAgIC8vIEV4YW1wbGVzOiBkYXRhLXJldmVhbCwgZGF0YS1vZmYtY2FudmFzXG4gICAgdmFyIGF0dHJOYW1lICA9IGh5cGhlbmF0ZShjbGFzc05hbWUpO1xuXG4gICAgLy8gQWRkIHRvIHRoZSBGb3VuZGF0aW9uIG9iamVjdCBhbmQgdGhlIHBsdWdpbnMgbGlzdCAoZm9yIHJlZmxvd2luZylcbiAgICB0aGlzLl9wbHVnaW5zW2F0dHJOYW1lXSA9IHRoaXNbY2xhc3NOYW1lXSA9IHBsdWdpbjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXG4gICAqIEFkZHMgdGhlIGB6ZlBsdWdpbmAgZGF0YS1hdHRyaWJ1dGUgdG8gcHJvZ3JhbW1hdGljYWxseSBjcmVhdGVkIHBsdWdpbnMgdG8gYWxsb3cgdXNlIG9mICQoc2VsZWN0b3IpLmZvdW5kYXRpb24obWV0aG9kKSBjYWxscy5cbiAgICogQWxzbyBmaXJlcyB0aGUgaW5pdGlhbGl6YXRpb24gZXZlbnQgZm9yIGVhY2ggcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4sIHBhc3NlZCBhcyBhIGNhbWVsQ2FzZWQgc3RyaW5nLlxuICAgKiBAZmlyZXMgUGx1Z2luI2luaXRcbiAgICovXG4gIHJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpe1xuICAgIHZhciBwbHVnaW5OYW1lID0gbmFtZSA/IGh5cGhlbmF0ZShuYW1lKSA6IGZ1bmN0aW9uTmFtZShwbHVnaW4uY29uc3RydWN0b3IpLnRvTG93ZXJDYXNlKCk7XG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xuXG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKSl7IHBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gLCBwbHVnaW4udXVpZCk7IH1cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBpbml0aWFsaXplZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcbiAgICAgICAgICAgKi9cbiAgICBwbHVnaW4uJGVsZW1lbnQudHJpZ2dlcihgaW5pdC56Zi4ke3BsdWdpbk5hbWV9YCk7XG5cbiAgICB0aGlzLl91dWlkcy5wdXNoKHBsdWdpbi51dWlkKTtcblxuICAgIHJldHVybjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBSZW1vdmVzIHRoZSBwbHVnaW5zIHV1aWQgZnJvbSB0aGUgX3V1aWRzIGFycmF5LlxuICAgKiBSZW1vdmVzIHRoZSB6ZlBsdWdpbiBkYXRhIGF0dHJpYnV0ZSwgYXMgd2VsbCBhcyB0aGUgZGF0YS1wbHVnaW4tbmFtZSBhdHRyaWJ1dGUuXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQGZpcmVzIFBsdWdpbiNkZXN0cm95ZWRcbiAgICovXG4gIHVucmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBoeXBoZW5hdGUoZnVuY3Rpb25OYW1lKHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpLmNvbnN0cnVjdG9yKSk7XG5cbiAgICB0aGlzLl91dWlkcy5zcGxpY2UodGhpcy5fdXVpZHMuaW5kZXhPZihwbHVnaW4udXVpZCksIDEpO1xuICAgIHBsdWdpbi4kZWxlbWVudC5yZW1vdmVBdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKS5yZW1vdmVEYXRhKCd6ZlBsdWdpbicpXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2Rlc3Ryb3llZFxuICAgICAgICAgICAqL1xuICAgICAgICAgIC50cmlnZ2VyKGBkZXN0cm95ZWQuemYuJHtwbHVnaW5OYW1lfWApO1xuICAgIGZvcih2YXIgcHJvcCBpbiBwbHVnaW4pe1xuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gICAgfVxuICAgIHJldHVybjtcbiAgfSxcblxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIENhdXNlcyBvbmUgb3IgbW9yZSBhY3RpdmUgcGx1Z2lucyB0byByZS1pbml0aWFsaXplLCByZXNldHRpbmcgZXZlbnQgbGlzdGVuZXJzLCByZWNhbGN1bGF0aW5nIHBvc2l0aW9ucywgZXRjLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGx1Z2lucyAtIG9wdGlvbmFsIHN0cmluZyBvZiBhbiBpbmRpdmlkdWFsIHBsdWdpbiBrZXksIGF0dGFpbmVkIGJ5IGNhbGxpbmcgYCQoZWxlbWVudCkuZGF0YSgncGx1Z2luTmFtZScpYCwgb3Igc3RyaW5nIG9mIGEgcGx1Z2luIGNsYXNzIGkuZS4gYCdkcm9wZG93bidgXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXG4gICAqL1xuICAgcmVJbml0OiBmdW5jdGlvbihwbHVnaW5zKXtcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcbiAgICAgdHJ5e1xuICAgICAgIGlmKGlzSlEpe1xuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICQodGhpcykuZGF0YSgnemZQbHVnaW4nKS5faW5pdCgpO1xuICAgICAgICAgfSk7XG4gICAgICAgfWVsc2V7XG4gICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBwbHVnaW5zLFxuICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgZm5zID0ge1xuICAgICAgICAgICAnb2JqZWN0JzogZnVuY3Rpb24ocGxncyl7XG4gICAgICAgICAgICAgcGxncy5mb3JFYWNoKGZ1bmN0aW9uKHApe1xuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcbiAgICAgICAgICAgICAgICQoJ1tkYXRhLScrIHAgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3N0cmluZyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgcGx1Z2lucyA9IGh5cGhlbmF0ZShwbHVnaW5zKTtcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICd1bmRlZmluZWQnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgIH07XG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XG4gICAgICAgfVxuICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgIH1maW5hbGx5e1xuICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgICB9XG4gICB9LFxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgcmFuZG9tIGJhc2UtMzYgdWlkIHdpdGggbmFtZXNwYWNpbmdcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlIC0gbmFtZSBvZiBwbHVnaW4gdG8gYmUgaW5jb3Jwb3JhdGVkIGluIHVpZCwgb3B0aW9uYWwuXG4gICAqIEBkZWZhdWx0IHtTdHJpbmd9ICcnIC0gaWYgbm8gcGx1Z2luIG5hbWUgaXMgcHJvdmlkZWQsIG5vdGhpbmcgaXMgYXBwZW5kZWQgdG8gdGhlIHVpZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcbiAgICovXG4gIEdldFlvRGlnaXRzOiBmdW5jdGlvbihsZW5ndGgsIG5hbWVzcGFjZSl7XG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucG93KDM2LCBsZW5ndGggKyAxKSAtIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygzNiwgbGVuZ3RoKSkpLnRvU3RyaW5nKDM2KS5zbGljZSgxKSArIChuYW1lc3BhY2UgPyBgLSR7bmFtZXNwYWNlfWAgOiAnJyk7XG4gIH0sXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBsdWdpbnMgb24gYW55IGVsZW1lbnRzIHdpdGhpbiBgZWxlbWAgKGFuZCBgZWxlbWAgaXRzZWxmKSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluaXRpYWxpemVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbSAtIGpRdWVyeSBvYmplY3QgY29udGFpbmluZyB0aGUgZWxlbWVudCB0byBjaGVjayBpbnNpZGUuIEFsc28gY2hlY2tzIHRoZSBlbGVtZW50IGl0c2VsZiwgdW5sZXNzIGl0J3MgdGhlIGBkb2N1bWVudGAgb2JqZWN0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cbiAgICovXG4gIHJlZmxvdzogZnVuY3Rpb24oZWxlbSwgcGx1Z2lucykge1xuXG4gICAgLy8gSWYgcGx1Z2lucyBpcyB1bmRlZmluZWQsIGp1c3QgZ3JhYiBldmVyeXRoaW5nXG4gICAgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xuICAgIH1cbiAgICAvLyBJZiBwbHVnaW5zIGlzIGEgc3RyaW5nLCBjb252ZXJ0IGl0IHRvIGFuIGFycmF5IHdpdGggb25lIGl0ZW1cbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBsdWdpbnMgPSBbcGx1Z2luc107XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxuICAgICQuZWFjaChwbHVnaW5zLCBmdW5jdGlvbihpLCBuYW1lKSB7XG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgcGx1Z2luXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XG5cbiAgICAgIC8vIExvY2FsaXplIHRoZSBzZWFyY2ggdG8gYWxsIGVsZW1lbnRzIGluc2lkZSBlbGVtLCBhcyB3ZWxsIGFzIGVsZW0gaXRzZWxmLCB1bmxlc3MgZWxlbSA9PT0gZG9jdW1lbnRcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHBsdWdpbiBmb3VuZCwgaW5pdGlhbGl6ZSBpdFxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xuICAgICAgICBpZiAoJGVsLmRhdGEoJ3pmUGx1Z2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmllZCB0byBpbml0aWFsaXplIFwiK25hbWUrXCIgb24gYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgaGFzIGEgRm91bmRhdGlvbiBwbHVnaW4uXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XG4gICAgICAgICAgdmFyIHRoaW5nID0gJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpLnNwbGl0KCc7JykuZm9yRWFjaChmdW5jdGlvbihlLCBpKXtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKGVsKXsgcmV0dXJuIGVsLnRyaW0oKTsgfSk7XG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgJGVsLmRhdGEoJ3pmUGx1Z2luJywgbmV3IHBsdWdpbigkKHRoaXMpLCBvcHRzKSk7XG4gICAgICAgIH1jYXRjaChlcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XG4gICAgICAgIH1maW5hbGx5e1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldEZuTmFtZTogZnVuY3Rpb25OYW1lLFxuICB0cmFuc2l0aW9uZW5kOiBmdW5jdGlvbigkZWxlbSl7XG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xuICAgICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICAgIH07XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgZW5kO1xuXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XG4gICAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgZW5kID0gdHJhbnNpdGlvbnNbdF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKGVuZCl7XG4gICAgICByZXR1cm4gZW5kO1xuICAgIH1lbHNle1xuICAgICAgZW5kID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xuICAgICAgfSwgMSk7XG4gICAgICByZXR1cm4gJ3RyYW5zaXRpb25lbmQnO1xuICAgIH1cbiAgfVxufTtcblxuRm91bmRhdGlvbi51dGlsID0ge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgZW5kIG9mIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxuICAgKiBAcmV0dXJucyBmdW5jdGlvblxuICAgKi9cbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xuICAgIHZhciB0aW1lciA9IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFRPRE86IGNvbnNpZGVyIG5vdCBtYWtpbmcgdGhpcyBhIGpRdWVyeSBmdW5jdGlvblxuLy8gVE9ETzogbmVlZCB3YXkgdG8gcmVmbG93IHZzLiByZS1pbml0aWFsaXplXG4vKipcbiAqIFRoZSBGb3VuZGF0aW9uIGpRdWVyeSBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gbWV0aG9kIC0gQW4gYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGN1cnJlbnQgalF1ZXJ5IG9iamVjdC5cbiAqL1xudmFyIGZvdW5kYXRpb24gPSBmdW5jdGlvbihtZXRob2QpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgbWV0aG9kLFxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcbiAgICAgICRub0pTID0gJCgnLm5vLWpzJyk7XG5cbiAgaWYoISRtZXRhLmxlbmd0aCl7XG4gICAgJCgnPG1ldGEgY2xhc3M9XCJmb3VuZGF0aW9uLW1xXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCk7XG4gIH1cbiAgaWYoJG5vSlMubGVuZ3RoKXtcbiAgICAkbm9KUy5yZW1vdmVDbGFzcygnbm8tanMnKTtcbiAgfVxuXG4gIGlmKHR5cGUgPT09ICd1bmRlZmluZWQnKXsvL25lZWRzIHRvIGluaXRpYWxpemUgdGhlIEZvdW5kYXRpb24gb2JqZWN0LCBvciBhbiBpbmRpdmlkdWFsIHBsdWdpbi5cbiAgICBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcbiAgfWVsc2UgaWYodHlwZSA9PT0gJ3N0cmluZycpey8vYW4gaW5kaXZpZHVhbCBtZXRob2QgdG8gaW52b2tlIG9uIGEgcGx1Z2luIG9yIGdyb3VwIG9mIHBsdWdpbnNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7Ly9jb2xsZWN0IGFsbCB0aGUgYXJndW1lbnRzLCBpZiBuZWNlc3NhcnlcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cblxuICAgIGlmKHBsdWdDbGFzcyAhPT0gdW5kZWZpbmVkICYmIHBsdWdDbGFzc1ttZXRob2RdICE9PSB1bmRlZmluZWQpey8vbWFrZSBzdXJlIGJvdGggdGhlIGNsYXNzIGFuZCBtZXRob2QgZXhpc3RcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkocGx1Z0NsYXNzLCBhcmdzKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseSgkKGVsKS5kYXRhKCd6ZlBsdWdpbicpLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfWVsc2V7Ly9lcnJvciBmb3Igbm8gY2xhc3Mgb3Igbm8gbWV0aG9kXG4gICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJXZSdyZSBzb3JyeSwgJ1wiICsgbWV0aG9kICsgXCInIGlzIG5vdCBhbiBhdmFpbGFibGUgbWV0aG9kIGZvciBcIiArIChwbHVnQ2xhc3MgPyBmdW5jdGlvbk5hbWUocGx1Z0NsYXNzKSA6ICd0aGlzIGVsZW1lbnQnKSArICcuJyk7XG4gICAgfVxuICB9ZWxzZXsvL2Vycm9yIGZvciBpbnZhbGlkIGFyZ3VtZW50IHR5cGVcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBXZSdyZSBzb3JyeSwgJHt0eXBlfSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuIFlvdSBtdXN0IHVzZSBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1ldGhvZCB5b3Ugd2lzaCB0byBpbnZva2UuYCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG53aW5kb3cuRm91bmRhdGlvbiA9IEZvdW5kYXRpb247XG4kLmZuLmZvdW5kYXRpb24gPSBmb3VuZGF0aW9uO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcbiAgICB3aW5kb3cuRGF0ZS5ub3cgPSBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdnArJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddKTtcbiAgfVxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSAtIG5vdyk7XG4gICAgfTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG4gIH1cbiAgLyoqXG4gICAqIFBvbHlmaWxsIGZvciBwZXJmb3JtYW5jZS5ub3csIHJlcXVpcmVkIGJ5IHJBRlxuICAgKi9cbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgc3RhcnQ6IERhdGUubm93KCksXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGNsb3Nlc3QgdGhpbmcgcG9zc2libGUgdG8gdGhlIEVDTUFTY3JpcHQgNVxuICAgICAgLy8gaW50ZXJuYWwgSXNDYWxsYWJsZSBmdW5jdGlvblxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG5cbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgICBmTk9QICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICB9O1xuXG4gICAgaWYgKHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAvLyBuYXRpdmUgZnVuY3Rpb25zIGRvbid0IGhhdmUgYSBwcm90b3R5cGVcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cbi8vIFBvbHlmaWxsIHRvIGdldCB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGluIElFOVxuZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZuKSB7XG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZ1bmNOYW1lUmVnZXggPSAvZnVuY3Rpb25cXHMoW14oXXsxLH0pXFwoLztcbiAgICB2YXIgcmVzdWx0cyA9IChmdW5jTmFtZVJlZ2V4KS5leGVjKChmbikudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XG4gIH1cbiAgZWxzZSBpZiAoZm4ucHJvdG90eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcbiAgaWYoL3RydWUvLnRlc3Qoc3RyKSkgcmV0dXJuIHRydWU7XG4gIGVsc2UgaWYoL2ZhbHNlLy50ZXN0KHN0cikpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZighaXNOYU4oc3RyICogMSkpIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XG4gIHJldHVybiBzdHI7XG59XG4vLyBDb252ZXJ0IFBhc2NhbENhc2UgdG8ga2ViYWItY2FzZVxuLy8gVGhhbmsgeW91OiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS84OTU1NTgwXG5mdW5jdGlvbiBoeXBoZW5hdGUoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5Gb3VuZGF0aW9uLkJveCA9IHtcbiAgSW1Ob3RUb3VjaGluZ1lvdTogSW1Ob3RUb3VjaGluZ1lvdSxcbiAgR2V0RGltZW5zaW9uczogR2V0RGltZW5zaW9ucyxcbiAgR2V0T2Zmc2V0czogR2V0T2Zmc2V0c1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBkaW1lbnNpb25zIG9mIGFuIGVsZW1lbnQgdG8gYSBjb250YWluZXIgYW5kIGRldGVybWluZXMgY29sbGlzaW9uIGV2ZW50cyB3aXRoIGNvbnRhaW5lci5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHRlc3QgZm9yIGNvbGxpc2lvbnMuXG4gKiBAcGFyYW0ge2pRdWVyeX0gcGFyZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgYm91bmRpbmcgY29udGFpbmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBsck9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayBsZWZ0IGFuZCByaWdodCB2YWx1ZXMgb25seS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgdG9wIGFuZCBib3R0b20gdmFsdWVzIG9ubHkuXG4gKiBAZGVmYXVsdCBpZiBubyBwYXJlbnQgb2JqZWN0IHBhc3NlZCwgZGV0ZWN0cyBjb2xsaXNpb25zIHdpdGggYHdpbmRvd2AuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIGNvbGxpc2lvbiBmcmVlLCBmYWxzZSBpZiBhIGNvbGxpc2lvbiBpbiBhbnkgZGlyZWN0aW9uLlxuICovXG5mdW5jdGlvbiBJbU5vdFRvdWNoaW5nWW91KGVsZW1lbnQsIHBhcmVudCwgbHJPbmx5LCB0Yk9ubHkpIHtcbiAgdmFyIGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgdG9wLCBib3R0b20sIGxlZnQsIHJpZ2h0O1xuXG4gIGlmIChwYXJlbnQpIHtcbiAgICB2YXIgcGFyRGltcyA9IEdldERpbWVuc2lvbnMocGFyZW50KTtcblxuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBwYXJEaW1zLmhlaWdodCArIHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBwYXJEaW1zLndpZHRoICsgcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgKyBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKTtcbiAgfVxuXG4gIHZhciBhbGxEaXJzID0gW2JvdHRvbSwgdG9wLCBsZWZ0LCByaWdodF07XG5cbiAgaWYgKGxyT25seSkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodCA9PT0gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0Yk9ubHkpIHtcbiAgICByZXR1cm4gdG9wID09PSBib3R0b20gPT09IHRydWU7XG4gIH1cblxuICByZXR1cm4gYWxsRGlycy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG59O1xuXG4vKipcbiAqIFVzZXMgbmF0aXZlIG1ldGhvZHMgdG8gcmV0dXJuIGFuIG9iamVjdCBvZiBkaW1lbnNpb24gdmFsdWVzLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeSB8fCBIVE1MfSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBvciBET00gZWxlbWVudCBmb3Igd2hpY2ggdG8gZ2V0IHRoZSBkaW1lbnNpb25zLiBDYW4gYmUgYW55IGVsZW1lbnQgb3RoZXIgdGhhdCBkb2N1bWVudCBvciB3aW5kb3cuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIG5lc3RlZCBvYmplY3Qgb2YgaW50ZWdlciBwaXhlbCB2YWx1ZXNcbiAqIFRPRE8gLSBpZiBlbGVtZW50IGlzIHdpbmRvdywgcmV0dXJuIG9ubHkgdGhvc2UgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBHZXREaW1lbnNpb25zKGVsZW0sIHRlc3Qpe1xuICBlbGVtID0gZWxlbS5sZW5ndGggPyBlbGVtWzBdIDogZWxlbTtcblxuICBpZiAoZWxlbSA9PT0gd2luZG93IHx8IGVsZW0gPT09IGRvY3VtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSSdtIHNvcnJ5LCBEYXZlLiBJJ20gYWZyYWlkIEkgY2FuJ3QgZG8gdGhhdC5cIik7XG4gIH1cblxuICB2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICBwYXJSZWN0ID0gZWxlbS5wYXJlbnROb2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5ZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuICAgICAgd2luWCA9IHdpbmRvdy5wYWdlWE9mZnNldDtcblxuICByZXR1cm4ge1xuICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgb2Zmc2V0OiB7XG4gICAgICB0b3A6IHJlY3QudG9wICsgd2luWSxcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpblhcbiAgICB9LFxuICAgIHBhcmVudERpbXM6IHtcbiAgICAgIHdpZHRoOiBwYXJSZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBwYXJSZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHBhclJlY3QudG9wICsgd2luWSxcbiAgICAgICAgbGVmdDogcGFyUmVjdC5sZWZ0ICsgd2luWFxuICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93RGltczoge1xuICAgICAgd2lkdGg6IHdpblJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHdpblJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogd2luWSxcbiAgICAgICAgbGVmdDogd2luWFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IG9mIHRvcCBhbmQgbGVmdCBpbnRlZ2VyIHBpeGVsIHZhbHVlcyBmb3IgZHluYW1pY2FsbHkgcmVuZGVyZWQgZWxlbWVudHMsXG4gKiBzdWNoIGFzOiBUb29sdGlwLCBSZXZlYWwsIGFuZCBEcm9wZG93blxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IGJlaW5nIHBvc2l0aW9uZWQuXG4gKiBAcGFyYW0ge2pRdWVyeX0gYW5jaG9yIC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQncyBhbmNob3IgcG9pbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBhIHN0cmluZyByZWxhdGluZyB0byB0aGUgZGVzaXJlZCBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCwgcmVsYXRpdmUgdG8gaXQncyBhbmNob3JcbiAqIEBwYXJhbSB7TnVtYmVyfSB2T2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIHZlcnRpY2FsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0gaE9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCBob3Jpem9udGFsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzT3ZlcmZsb3cgLSBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZCwgc2V0cyB0byB0cnVlIHRvIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gZnVsbCB3aWR0aCAtIGFueSBkZXNpcmVkIG9mZnNldC5cbiAqIFRPRE8gYWx0ZXIvcmV3cml0ZSB0byB3b3JrIHdpdGggYGVtYCB2YWx1ZXMgYXMgd2VsbC9pbnN0ZWFkIG9mIHBpeGVsc1xuICovXG5mdW5jdGlvbiBHZXRPZmZzZXRzKGVsZW1lbnQsIGFuY2hvciwgcG9zaXRpb24sIHZPZmZzZXQsIGhPZmZzZXQsIGlzT3ZlcmZsb3cpIHtcbiAgdmFyICRlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgICRhbmNob3JEaW1zID0gYW5jaG9yID8gR2V0RGltZW5zaW9ucyhhbmNob3IpIDogbnVsbDtcblxuICBzd2l0Y2ggKHBvc2l0aW9uKSB7XG4gICAgY2FzZSAndG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgdG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogaXNPdmVyZmxvdyA/IGhPZmZzZXQgOiAoKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMikpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHJpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0ICsgMSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlcic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCArICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArICgkZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmV2ZWFsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gJGVsZURpbXMud2lkdGgpIC8gMixcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgY2FzZSAncmV2ZWFsIGZ1bGwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgfVxufVxuXG59KGpRdWVyeSk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXG4gKiBQbGVhc2UgdGhhbmsgTWFyaXVzIG9uIEdpdEh1YiAvb3dsYmVydHogKlxuICogb3IgdGhlIHdlYiBodHRwOi8vd3d3Lm1hcml1c29sYmVydHouZGUvICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IGtleUNvZGVzID0ge1xuICA5OiAnVEFCJyxcbiAgMTM6ICdFTlRFUicsXG4gIDI3OiAnRVNDQVBFJyxcbiAgMzI6ICdTUEFDRScsXG4gIDM3OiAnQVJST1dfTEVGVCcsXG4gIDM4OiAnQVJST1dfVVAnLFxuICAzOTogJ0FSUk9XX1JJR0hUJyxcbiAgNDA6ICdBUlJPV19ET1dOJ1xufVxuXG52YXIgY29tbWFuZHMgPSB7fVxuXG52YXIgS2V5Ym9hcmQgPSB7XG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcblxuICAvKipcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XG4gICAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcbiAgICovXG4gIHBhcnNlS2V5KGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSBrZXkgPSBgU0hJRlRfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuY3RybEtleSkga2V5ID0gYENUUkxfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuYWx0S2V5KSBrZXkgPSBgQUxUXyR7a2V5fWA7XG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgZ2l2ZW4gKGtleWJvYXJkKSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50J3MgbmFtZSwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEBwYXJhbSB7T2JqZWN0c30gZnVuY3Rpb25zIC0gY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgdG8gYmUgZXhlY3V0ZWRcbiAgICovXG4gIGhhbmRsZUtleShldmVudCwgY29tcG9uZW50LCBmdW5jdGlvbnMpIHtcbiAgICB2YXIgY29tbWFuZExpc3QgPSBjb21tYW5kc1tjb21wb25lbnRdLFxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxuICAgICAgY21kcyxcbiAgICAgIGNvbW1hbmQsXG4gICAgICBmbjtcblxuICAgIGlmICghY29tbWFuZExpc3QpIHJldHVybiBjb25zb2xlLndhcm4oJ0NvbXBvbmVudCBub3QgZGVmaW5lZCEnKTtcblxuICAgIGlmICh0eXBlb2YgY29tbWFuZExpc3QubHRyID09PSAndW5kZWZpbmVkJykgeyAvLyB0aGlzIGNvbXBvbmVudCBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIGJldHdlZW4gbHRyIGFuZCBydGxcbiAgICAgICAgY21kcyA9IGNvbW1hbmRMaXN0OyAvLyB1c2UgcGxhaW4gbGlzdFxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5sdHIsIGNvbW1hbmRMaXN0LnJ0bCk7XG5cbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcbiAgICB9XG4gICAgY29tbWFuZCA9IGNtZHNba2V5Q29kZV07XG5cbiAgICBmbiA9IGZ1bmN0aW9uc1tjb21tYW5kXTtcbiAgICBpZiAoZm4gJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gIGlmIGV4aXN0c1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcbiAgICAgIGlmIChmdW5jdGlvbnMuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLmhhbmRsZWQocmV0dXJuVmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnVuY3Rpb25zLnVuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLnVuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBzZWFyY2ggd2l0aGluXG4gICAqIEByZXR1cm4ge2pRdWVyeX0gJGZvY3VzYWJsZSAtIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIGAkZWxlbWVudGBcbiAgICovXG4gIGZpbmRGb2N1c2FibGUoJGVsZW1lbnQpIHtcbiAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnYVtocmVmXSwgYXJlYVtocmVmXSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBzZWxlY3Q6bm90KFtkaXNhYmxlZF0pLCB0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSksIGJ1dHRvbjpub3QoW2Rpc2FibGVkXSksIGlmcmFtZSwgb2JqZWN0LCBlbWJlZCwgKlt0YWJpbmRleF0sICpbY29udGVudGVkaXRhYmxlXScpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEByZXR1cm4gU3RyaW5nIGNvbXBvbmVudE5hbWVcbiAgICovXG5cbiAgcmVnaXN0ZXIoY29tcG9uZW50TmFtZSwgY21kcykge1xuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcbiAgfVxufVxuXG4vKlxuICogQ29uc3RhbnRzIGZvciBlYXNpZXIgY29tcGFyaW5nLlxuICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gKi9cbmZ1bmN0aW9uIGdldEtleUNvZGVzKGtjcykge1xuICB2YXIgayA9IHt9O1xuICBmb3IgKHZhciBrYyBpbiBrY3MpIGtba2NzW2tjXV0gPSBrY3Nba2NdO1xuICByZXR1cm4gaztcbn1cblxuRm91bmRhdGlvbi5LZXlib2FyZCA9IEtleWJvYXJkO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8vIERlZmF1bHQgc2V0IG9mIG1lZGlhIHF1ZXJpZXNcbmNvbnN0IGRlZmF1bHRRdWVyaWVzID0ge1xuICAnZGVmYXVsdCcgOiAnb25seSBzY3JlZW4nLFxuICBsYW5kc2NhcGUgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gIHBvcnRyYWl0IDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gIHJldGluYSA6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG52YXIgTWVkaWFRdWVyeSA9IHtcbiAgcXVlcmllczogW10sXG5cbiAgY3VycmVudDogJycsXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtZWRpYSBxdWVyeSBoZWxwZXIsIGJ5IGV4dHJhY3RpbmcgdGhlIGJyZWFrcG9pbnQgbGlzdCBmcm9tIHRoZSBDU1MgYW5kIGFjdGl2YXRpbmcgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGV4dHJhY3RlZFN0eWxlcyA9ICQoJy5mb3VuZGF0aW9uLW1xJykuY3NzKCdmb250LWZhbWlseScpO1xuICAgIHZhciBuYW1lZFF1ZXJpZXM7XG5cbiAgICBuYW1lZFF1ZXJpZXMgPSBwYXJzZVN0eWxlVG9PYmplY3QoZXh0cmFjdGVkU3R5bGVzKTtcblxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lZFF1ZXJpZXMpIHtcbiAgICAgIGlmKG5hbWVkUXVlcmllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNlbGYucXVlcmllcy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgdmFsdWU6IGBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogJHtuYW1lZFF1ZXJpZXNba2V5XX0pYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpO1xuXG4gICAgdGhpcy5fd2F0Y2hlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBpcyBhdCBsZWFzdCBhcyB3aWRlIGFzIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0J3Mgc21hbGxlci5cbiAgICovXG4gIGF0TGVhc3Qoc2l6ZSkge1xuICAgIHZhciBxdWVyeSA9IHRoaXMuZ2V0KHNpemUpO1xuXG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICByZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpLm1hdGNoZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZWRpYSBxdWVyeSBvZiBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfG51bGx9IC0gVGhlIG1lZGlhIHF1ZXJ5IG9mIHRoZSBicmVha3BvaW50LCBvciBgbnVsbGAgaWYgdGhlIGJyZWFrcG9pbnQgZG9lc24ndCBleGlzdC5cbiAgICovXG4gIGdldChzaXplKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJpZXMpIHtcbiAgICAgIGlmKHRoaXMucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG4gICAgICAgIGlmIChzaXplID09PSBxdWVyeS5uYW1lKSByZXR1cm4gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cbiAgICovXG4gIF9nZXRDdXJyZW50U2l6ZSgpIHtcbiAgICB2YXIgbWF0Y2hlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5xdWVyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG5cbiAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShxdWVyeS52YWx1ZSkubWF0Y2hlcykge1xuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG1hdGNoZWQubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXRjaGVyKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLm1lZGlhcXVlcnknLCAoKSA9PiB7XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xuXG4gICAgICBpZiAobmV3U2l6ZSAhPT0gY3VycmVudFNpemUpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5ld1NpemU7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xuICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgW25ld1NpemUsIGN1cnJlbnRTaXplXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cbi8vIEF1dGhvcnMgJiBjb3B5cmlnaHQgKGMpIDIwMTI6IFNjb3R0IEplaGwsIFBhdWwgSXJpc2gsIE5pY2hvbGFzIFpha2FzLCBEYXZpZCBLbmlnaHQuIER1YWwgTUlUL0JTRCBsaWNlbnNlXG53aW5kb3cubWF0Y2hNZWRpYSB8fCAod2luZG93Lm1hdGNoTWVkaWEgPSBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XG5cbiAgLy8gRm9yIHRob3NlIHRoYXQgZG9uJ3Qgc3VwcG9ydCBtYXRjaE1lZGl1bVxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyksXG4gICAgc2NyaXB0ICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xuXG4gICAgc3R5bGUudHlwZSAgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcblxuICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAvLyBjb25zb2xlLmxvZyhzdGFydCwgdHMpO1xuICAgIHByb2cgPSB0cyAtIHN0YXJ0O1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuXG4gICAgaWYocHJvZyA8IGR1cmF0aW9uKXsgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSwgZWxlbSk7IH1cbiAgICBlbHNle1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW0pO1xuICAgICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgfVxuICB9XG4gIGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUpO1xufVxuXG4vKipcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb3IgSFRNTCBvYmplY3QgdG8gYW5pbWF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhbmltYXRpb24gLSBDU1MgY2xhc3MgdG8gdXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcblxuICBlbGVtZW50XG4gICAgLmFkZENsYXNzKGFuaW1hdGlvbilcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnRcbiAgICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnJylcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoZWxlbWVudCksIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7aW5pdENsYXNzfSAke2FjdGl2ZUNsYXNzfSAke2FuaW1hdGlvbn1gKTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk1vdmUgPSBNb3ZlO1xuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTmVzdCA9IHtcbiAgRmVhdGhlcihtZW51LCB0eXBlID0gJ3pmJykge1xuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XG5cbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykuYXR0cih7J3JvbGUnOiAnbWVudWl0ZW0nfSksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnUuZmluZCgnYTpmaXJzdCcpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG5cbiAgICBpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG5cbiAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAkaXRlbVxuICAgICAgICAgIC5hZGRDbGFzcyhoYXNTdWJDbGFzcylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW0uYWRkQ2xhc3MoYGlzLXN1Ym1lbnUtaXRlbSAke3N1Ykl0ZW1DbGFzc31gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfSxcblxuICBCdXJuKG1lbnUsIHR5cGUpIHtcbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgbWVudVxuICAgICAgLmZpbmQoJyonKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3N1Yk1lbnVDbGFzc30gJHtzdWJJdGVtQ2xhc3N9ICR7aGFzU3ViQ2xhc3N9IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51IGlzLWFjdGl2ZWApXG4gICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykuY3NzKCdkaXNwbGF5JywgJycpO1xuXG4gICAgLy8gY29uc29sZS5sb2coICAgICAgbWVudS5maW5kKCcuJyArIHN1Yk1lbnVDbGFzcyArICcsIC4nICsgc3ViSXRlbUNsYXNzICsgJywgLmhhcy1zdWJtZW51LCAuaXMtc3VibWVudS1pdGVtLCAuc3VibWVudSwgW2RhdGEtc3VibWVudV0nKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQ2xhc3Moc3ViTWVudUNsYXNzICsgJyAnICsgc3ViSXRlbUNsYXNzICsgJyBoYXMtc3VibWVudSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKSk7XG4gICAgLy8gaXRlbXMuZWFjaChmdW5jdGlvbigpe1xuICAgIC8vICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAvLyAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG4gICAgLy8gICBpZigkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2lzLXN1Ym1lbnUtaXRlbSAnICsgc3ViSXRlbUNsYXNzKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGlmKCRzdWIubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2hhcy1zdWJtZW51Jyk7XG4gICAgLy8gICAgICRzdWIucmVtb3ZlQ2xhc3MoJ3N1Ym1lbnUgJyArIHN1Yk1lbnVDbGFzcykucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5OZXN0ID0gTmVzdDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5mdW5jdGlvbiBUaW1lcihlbGVtLCBvcHRpb25zLCBjYikge1xuICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uLC8vb3B0aW9ucyBpcyBhbiBvYmplY3QgZm9yIGVhc2lseSBhZGRpbmcgZmVhdHVyZXMgbGF0ZXIuXG4gICAgICBuYW1lU3BhY2UgPSBPYmplY3Qua2V5cyhlbGVtLmRhdGEoKSlbMF0gfHwgJ3RpbWVyJyxcbiAgICAgIHJlbWFpbiA9IC0xLFxuICAgICAgc3RhcnQsXG4gICAgICB0aW1lcjtcblxuICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG5cbiAgdGhpcy5yZXN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVtYWluID0gLTE7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aGlzLnN0YXJ0KCk7XG4gIH1cblxuICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICAgIC8vIGlmKCFlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgcmVtYWluID0gcmVtYWluIDw9IDAgPyBkdXJhdGlvbiA6IHJlbWFpbjtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIGZhbHNlKTtcbiAgICBzdGFydCA9IERhdGUubm93KCk7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBpZihvcHRpb25zLmluZmluaXRlKXtcbiAgICAgICAgX3RoaXMucmVzdGFydCgpOy8vcmVydW4gdGhlIHRpbWVyLlxuICAgICAgfVxuICAgICAgY2IoKTtcbiAgICB9LCByZW1haW4pO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJzdGFydC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxuXG4gIHRoaXMucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gdHJ1ZTtcbiAgICAvL2lmKGVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIHRydWUpO1xuICAgIHZhciBlbmQgPSBEYXRlLm5vdygpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiAtIChlbmQgLSBzdGFydCk7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnBhdXNlZC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1bnMgYSBjYWxsYmFjayBmdW5jdGlvbiB3aGVuIGltYWdlcyBhcmUgZnVsbHkgbG9hZGVkLlxuICogQHBhcmFtIHtPYmplY3R9IGltYWdlcyAtIEltYWdlKHMpIHRvIGNoZWNrIGlmIGxvYWRlZC5cbiAqIEBwYXJhbSB7RnVuY30gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gaW1hZ2UgaXMgZnVsbHkgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBvbkltYWdlc0xvYWRlZChpbWFnZXMsIGNhbGxiYWNrKXtcbiAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgdW5sb2FkZWQgPSBpbWFnZXMubGVuZ3RoO1xuXG4gIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICBpbWFnZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHRoaXMubmF0dXJhbFdpZHRoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLm5hdHVyYWxXaWR0aCA+IDApIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJCh0aGlzKS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gc2luZ2xlSW1hZ2VMb2FkZWQoKSB7XG4gICAgdW5sb2FkZWQtLTtcbiAgICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG59XG5cbkZvdW5kYXRpb24uVGltZXIgPSBUaW1lcjtcbkZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQgPSBvbkltYWdlc0xvYWRlZDtcblxufShqUXVlcnkpO1xuIiwiLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKldvcmsgaW5zcGlyZWQgYnkgbXVsdGlwbGUganF1ZXJ5IHN3aXBlIHBsdWdpbnMqKlxuLy8qKkRvbmUgYnkgWW9oYWkgQXJhcmF0ICoqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKGZ1bmN0aW9uKCQpIHtcblxuICAkLnNwb3RTd2lwZSA9IHtcbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgIGVuYWJsZWQ6ICdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICBwcmV2ZW50RGVmYXVsdDogZmFsc2UsXG4gICAgbW92ZVRocmVzaG9sZDogNzUsXG4gICAgdGltZVRocmVzaG9sZDogMjAwXG4gIH07XG5cbiAgdmFyICAgc3RhcnRQb3NYLFxuICAgICAgICBzdGFydFBvc1ksXG4gICAgICAgIHN0YXJ0VGltZSxcbiAgICAgICAgZWxhcHNlZFRpbWUsXG4gICAgICAgIGlzTW92aW5nID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gb25Ub3VjaEVuZCgpIHtcbiAgICAvLyAgYWxlcnQodGhpcyk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQpO1xuICAgIGlzTW92aW5nID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoTW92ZShlKSB7XG4gICAgaWYgKCQuc3BvdFN3aXBlLnByZXZlbnREZWZhdWx0KSB7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgIGlmKGlzTW92aW5nKSB7XG4gICAgICB2YXIgeCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHZhciB5ID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgdmFyIGR4ID0gc3RhcnRQb3NYIC0geDtcbiAgICAgIHZhciBkeSA9IHN0YXJ0UG9zWSAtIHk7XG4gICAgICB2YXIgZGlyO1xuICAgICAgZWxhcHNlZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZTtcbiAgICAgIGlmKE1hdGguYWJzKGR4KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgICAgZGlyID0gZHggPiAwID8gJ2xlZnQnIDogJ3JpZ2h0JztcbiAgICAgIH1cbiAgICAgIC8vIGVsc2UgaWYoTWF0aC5hYnMoZHkpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgLy8gICBkaXIgPSBkeSA+IDAgPyAnZG93bicgOiAndXAnO1xuICAgICAgLy8gfVxuICAgICAgaWYoZGlyKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgb25Ub3VjaEVuZC5jYWxsKHRoaXMpO1xuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3N3aXBlJywgZGlyKS50cmlnZ2VyKGBzd2lwZSR7ZGlyfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hTdGFydChlKSB7XG4gICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgc3RhcnRQb3NYID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgc3RhcnRQb3NZID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgaXNNb3ZpbmcgPSB0cnVlO1xuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlLCBmYWxzZSk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyICYmIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCwgZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGVhcmRvd24oKSB7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0KTtcbiAgfVxuXG4gICQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHsgc2V0dXA6IGluaXQgfTtcblxuICAkLmVhY2goWydsZWZ0JywgJ3VwJywgJ2Rvd24nLCAncmlnaHQnXSwgZnVuY3Rpb24gKCkge1xuICAgICQuZXZlbnQuc3BlY2lhbFtgc3dpcGUke3RoaXN9YF0gPSB7IHNldHVwOiBmdW5jdGlvbigpe1xuICAgICAgJCh0aGlzKS5vbignc3dpcGUnLCAkLm5vb3ApO1xuICAgIH0gfTtcbiAgfSk7XG59KShqUXVlcnkpO1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1ldGhvZCBmb3IgYWRkaW5nIHBzdWVkbyBkcmFnIGV2ZW50cyB0byBlbGVtZW50cyAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIWZ1bmN0aW9uKCQpe1xuICAkLmZuLmFkZFRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSxlbCl7XG4gICAgICAkKGVsKS5iaW5kKCd0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsZnVuY3Rpb24oKXtcbiAgICAgICAgLy93ZSBwYXNzIHRoZSBvcmlnaW5hbCBldmVudCBvYmplY3QgYmVjYXVzZSB0aGUgalF1ZXJ5IGV2ZW50XG4gICAgICAgIC8vb2JqZWN0IGlzIG5vcm1hbGl6ZWQgdG8gdzNjIHNwZWNzIGFuZCBkb2VzIG5vdCBwcm92aWRlIHRoZSBUb3VjaExpc3RcbiAgICAgICAgaGFuZGxlVG91Y2goZXZlbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgaGFuZGxlVG91Y2ggPSBmdW5jdGlvbihldmVudCl7XG4gICAgICB2YXIgdG91Y2hlcyA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzLFxuICAgICAgICAgIGZpcnN0ID0gdG91Y2hlc1swXSxcbiAgICAgICAgICBldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgdG91Y2hzdGFydDogJ21vdXNlZG93bicsXG4gICAgICAgICAgICB0b3VjaG1vdmU6ICdtb3VzZW1vdmUnLFxuICAgICAgICAgICAgdG91Y2hlbmQ6ICdtb3VzZXVwJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdHlwZSA9IGV2ZW50VHlwZXNbZXZlbnQudHlwZV0sXG4gICAgICAgICAgc2ltdWxhdGVkRXZlbnRcbiAgICAgICAgO1xuXG4gICAgICBpZignTW91c2VFdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuTW91c2VFdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IG5ldyB3aW5kb3cuTW91c2VFdmVudCh0eXBlLCB7XG4gICAgICAgICAgJ2J1YmJsZXMnOiB0cnVlLFxuICAgICAgICAgICdjYW5jZWxhYmxlJzogdHJ1ZSxcbiAgICAgICAgICAnc2NyZWVuWCc6IGZpcnN0LnNjcmVlblgsXG4gICAgICAgICAgJ3NjcmVlblknOiBmaXJzdC5zY3JlZW5ZLFxuICAgICAgICAgICdjbGllbnRYJzogZmlyc3QuY2xpZW50WCxcbiAgICAgICAgICAnY2xpZW50WSc6IGZpcnN0LmNsaWVudFlcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdNb3VzZUV2ZW50Jyk7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50LmluaXRNb3VzZUV2ZW50KHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSwgZmlyc3Quc2NyZWVuWCwgZmlyc3Quc2NyZWVuWSwgZmlyc3QuY2xpZW50WCwgZmlyc3QuY2xpZW50WSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAvKmxlZnQqLywgbnVsbCk7XG4gICAgICB9XG4gICAgICBmaXJzdC50YXJnZXQuZGlzcGF0Y2hFdmVudChzaW11bGF0ZWRFdmVudCk7XG4gICAgfTtcbiAgfTtcbn0oalF1ZXJ5KTtcblxuXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipGcm9tIHRoZSBqUXVlcnkgTW9iaWxlIExpYnJhcnkqKlxuLy8qKm5lZWQgdG8gcmVjcmVhdGUgZnVuY3Rpb25hbGl0eSoqXG4vLyoqYW5kIHRyeSB0byBpbXByb3ZlIGlmIHBvc3NpYmxlKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKiBSZW1vdmluZyB0aGUgalF1ZXJ5IGZ1bmN0aW9uICoqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4oZnVuY3Rpb24oICQsIHdpbmRvdywgdW5kZWZpbmVkICkge1xuXG5cdHZhciAkZG9jdW1lbnQgPSAkKCBkb2N1bWVudCApLFxuXHRcdC8vIHN1cHBvcnRUb3VjaCA9ICQubW9iaWxlLnN1cHBvcnQudG91Y2gsXG5cdFx0dG91Y2hTdGFydEV2ZW50ID0gJ3RvdWNoc3RhcnQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCIsXG5cdFx0dG91Y2hTdG9wRXZlbnQgPSAndG91Y2hlbmQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIixcblx0XHR0b3VjaE1vdmVFdmVudCA9ICd0b3VjaG1vdmUnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNobW92ZVwiIDogXCJtb3VzZW1vdmVcIjtcblxuXHQvLyBzZXR1cCBuZXcgZXZlbnQgc2hvcnRjdXRzXG5cdCQuZWFjaCggKCBcInRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIFwiICtcblx0XHRcInN3aXBlIHN3aXBlbGVmdCBzd2lwZXJpZ2h0XCIgKS5zcGxpdCggXCIgXCIgKSwgZnVuY3Rpb24oIGksIG5hbWUgKSB7XG5cblx0XHQkLmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRyZXR1cm4gZm4gPyB0aGlzLmJpbmQoIG5hbWUsIGZuICkgOiB0aGlzLnRyaWdnZXIoIG5hbWUgKTtcblx0XHR9O1xuXG5cdFx0Ly8galF1ZXJ5IDwgMS44XG5cdFx0aWYgKCAkLmF0dHJGbiApIHtcblx0XHRcdCQuYXR0ckZuWyBuYW1lIF0gPSB0cnVlO1xuXHRcdH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gdHJpZ2dlckN1c3RvbUV2ZW50KCBvYmosIGV2ZW50VHlwZSwgZXZlbnQsIGJ1YmJsZSApIHtcblx0XHR2YXIgb3JpZ2luYWxUeXBlID0gZXZlbnQudHlwZTtcblx0XHRldmVudC50eXBlID0gZXZlbnRUeXBlO1xuXHRcdGlmICggYnViYmxlICkge1xuXHRcdFx0JC5ldmVudC50cmlnZ2VyKCBldmVudCwgdW5kZWZpbmVkLCBvYmogKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JC5ldmVudC5kaXNwYXRjaC5jYWxsKCBvYmosIGV2ZW50ICk7XG5cdFx0fVxuXHRcdGV2ZW50LnR5cGUgPSBvcmlnaW5hbFR5cGU7XG5cdH1cblxuXHQvLyBhbHNvIGhhbmRsZXMgdGFwaG9sZFxuXG5cdC8vIEFsc28gaGFuZGxlcyBzd2lwZWxlZnQsIHN3aXBlcmlnaHRcblx0JC5ldmVudC5zcGVjaWFsLnN3aXBlID0ge1xuXG5cdFx0Ly8gTW9yZSB0aGFuIHRoaXMgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQsIGFuZCB3ZSB3aWxsIHN1cHByZXNzIHNjcm9sbGluZy5cblx0XHRzY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkOiAzMCxcblxuXHRcdC8vIE1vcmUgdGltZSB0aGFuIHRoaXMsIGFuZCBpdCBpc24ndCBhIHN3aXBlLlxuXHRcdGR1cmF0aW9uVGhyZXNob2xkOiAxMDAwLFxuXG5cdFx0Ly8gU3dpcGUgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBtb3JlIHRoYW4gdGhpcy5cblx0XHRob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Ly8gU3dpcGUgdmVydGljYWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbGVzcyB0aGFuIHRoaXMuXG5cdFx0dmVydGljYWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHRnZXRMb2NhdGlvbjogZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRcdHZhciB3aW5QYWdlWCA9IHdpbmRvdy5wYWdlWE9mZnNldCxcblx0XHRcdFx0d2luUGFnZVkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG5cdFx0XHRcdHggPSBldmVudC5jbGllbnRYLFxuXHRcdFx0XHR5ID0gZXZlbnQuY2xpZW50WTtcblxuXHRcdFx0aWYgKCBldmVudC5wYWdlWSA9PT0gMCAmJiBNYXRoLmZsb29yKCB5ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWSApIHx8XG5cdFx0XHRcdGV2ZW50LnBhZ2VYID09PSAwICYmIE1hdGguZmxvb3IoIHggKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gaU9TNCBjbGllbnRYL2NsaWVudFkgaGF2ZSB0aGUgdmFsdWUgdGhhdCBzaG91bGQgaGF2ZSBiZWVuXG5cdFx0XHRcdC8vIGluIHBhZ2VYL3BhZ2VZLiBXaGlsZSBwYWdlWC9wYWdlLyBoYXZlIHRoZSB2YWx1ZSAwXG5cdFx0XHRcdHggPSB4IC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSB5IC0gd2luUGFnZVk7XG5cdFx0XHR9IGVsc2UgaWYgKCB5IDwgKCBldmVudC5wYWdlWSAtIHdpblBhZ2VZKSB8fCB4IDwgKCBldmVudC5wYWdlWCAtIHdpblBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gU29tZSBBbmRyb2lkIGJyb3dzZXJzIGhhdmUgdG90YWxseSBib2d1cyB2YWx1ZXMgZm9yIGNsaWVudFgvWVxuXHRcdFx0XHQvLyB3aGVuIHNjcm9sbGluZy96b29taW5nIGEgcGFnZS4gRGV0ZWN0YWJsZSBzaW5jZSBjbGllbnRYL2NsaWVudFlcblx0XHRcdFx0Ly8gc2hvdWxkIG5ldmVyIGJlIHNtYWxsZXIgdGhhbiBwYWdlWC9wYWdlWSBtaW51cyBwYWdlIHNjcm9sbFxuXHRcdFx0XHR4ID0gZXZlbnQucGFnZVggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IGV2ZW50LnBhZ2VZIC0gd2luUGFnZVk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0YXJ0OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdLFxuXHRcdFx0XHRcdFx0b3JpZ2luOiAkKCBldmVudC50YXJnZXQgKVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF1cblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRoYW5kbGVTd2lwZTogZnVuY3Rpb24oIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICkge1xuXHRcdFx0aWYgKCBzdG9wLnRpbWUgLSBzdGFydC50aW1lIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLmR1cmF0aW9uVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMSBdIC0gc3RvcC5jb29yZHNbIDEgXSApIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLnZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQgKSB7XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSBzdGFydC5jb29yZHNbMF0gPiBzdG9wLmNvb3Jkc1sgMCBdID8gXCJzd2lwZWxlZnRcIiA6IFwic3dpcGVyaWdodFwiO1xuXG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgXCJzd2lwZVwiLCAkLkV2ZW50KCBcInN3aXBlXCIsIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0pLCB0cnVlICk7XG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgZGlyZWN0aW9uLCQuRXZlbnQoIGRpcmVjdGlvbiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSApLCB0cnVlICk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0fSxcblxuXHRcdC8vIFRoaXMgc2VydmVzIGFzIGEgZmxhZyB0byBlbnN1cmUgdGhhdCBhdCBtb3N0IG9uZSBzd2lwZSBldmVudCBldmVudCBpc1xuXHRcdC8vIGluIHdvcmsgYXQgYW55IGdpdmVuIHRpbWVcblx0XHRldmVudEluUHJvZ3Jlc3M6IGZhbHNlLFxuXG5cdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cyxcblx0XHRcdFx0dGhpc09iamVjdCA9IHRoaXMsXG5cdFx0XHRcdCR0aGlzID0gJCggdGhpc09iamVjdCApLFxuXHRcdFx0XHRjb250ZXh0ID0ge307XG5cblx0XHRcdC8vIFJldHJpZXZlIHRoZSBldmVudHMgZGF0YSBmb3IgdGhpcyBlbGVtZW50IGFuZCBhZGQgdGhlIHN3aXBlIGNvbnRleHRcblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggIWV2ZW50cyApIHtcblx0XHRcdFx0ZXZlbnRzID0geyBsZW5ndGg6IDAgfTtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiwgZXZlbnRzICk7XG5cdFx0XHR9XG5cdFx0XHRldmVudHMubGVuZ3RoKys7XG5cdFx0XHRldmVudHMuc3dpcGUgPSBjb250ZXh0O1xuXG5cdFx0XHRjb250ZXh0LnN0YXJ0ID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXG5cdFx0XHRcdC8vIEJhaWwgaWYgd2UncmUgYWxyZWFkeSB3b3JraW5nIG9uIGEgc3dpcGUgZXZlbnRcblx0XHRcdFx0aWYgKCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gdHJ1ZTtcblxuXHRcdFx0XHR2YXIgc3RvcCxcblx0XHRcdFx0XHRzdGFydCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdGFydCggZXZlbnQgKSxcblx0XHRcdFx0XHRvcmlnVGFyZ2V0ID0gZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHRcdGVtaXR0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhc3RhcnQgfHwgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3RvcCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdG9wKCBldmVudCApO1xuXHRcdFx0XHRcdGlmICggIWVtaXR0ZWQgKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhhbmRsZVN3aXBlKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApO1xuXHRcdFx0XHRcdFx0aWYgKCBlbWl0dGVkICkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIHByZXZlbnQgc2Nyb2xsaW5nXG5cdFx0XHRcdFx0aWYgKCBNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZCApIHtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnRleHQuc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9IHRydWU7XG5cblx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHRcdFx0Y29udGV4dC5tb3ZlID0gbnVsbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkZG9jdW1lbnQub24oIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKVxuXHRcdFx0XHRcdC5vbmUoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdH07XG5cdFx0XHQkdGhpcy5vbiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0fSxcblxuXHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsIGNvbnRleHQ7XG5cblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggZXZlbnRzICkge1xuXHRcdFx0XHRjb250ZXh0ID0gZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRkZWxldGUgZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRldmVudHMubGVuZ3RoLS07XG5cdFx0XHRcdGlmICggZXZlbnRzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdFx0XHQkLnJlbW92ZURhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBjb250ZXh0ICkge1xuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RhcnQgKSB7XG5cdFx0XHRcdFx0JCggdGhpcyApLm9mZiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0Lm1vdmUgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5zdG9wICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0JC5lYWNoKHtcblx0XHRzd2lwZWxlZnQ6IFwic3dpcGUubGVmdFwiLFxuXHRcdHN3aXBlcmlnaHQ6IFwic3dpcGUucmlnaHRcIlxuXHR9LCBmdW5jdGlvbiggZXZlbnQsIHNvdXJjZUV2ZW50ICkge1xuXG5cdFx0JC5ldmVudC5zcGVjaWFsWyBldmVudCBdID0ge1xuXHRcdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkuYmluZCggc291cmNlRXZlbnQsICQubm9vcCApO1xuXHRcdFx0fSxcblx0XHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnVuYmluZCggc291cmNlRXZlbnQgKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn0pKCBqUXVlcnksIHRoaXMgKTtcbiovXG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmAgaW4gd2luZG93KSB7XG4gICAgICByZXR1cm4gd2luZG93W2Ake3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSgpKTtcblxuY29uc3QgdHJpZ2dlcnMgPSAoZWwsIHR5cGUpID0+IHtcbiAgZWwuZGF0YSh0eXBlKS5zcGxpdCgnICcpLmZvckVhY2goaWQgPT4ge1xuICAgICQoYCMke2lkfWApWyB0eXBlID09PSAnY2xvc2UnID8gJ3RyaWdnZXInIDogJ3RyaWdnZXJIYW5kbGVyJ10oYCR7dHlwZX0uemYudHJpZ2dlcmAsIFtlbF0pO1xuICB9KTtcbn07XG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLW9wZW5dIHdpbGwgcmV2ZWFsIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtb3Blbl0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ29wZW4nKTtcbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NlXSB3aWxsIGNsb3NlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuLy8gSWYgdXNlZCB3aXRob3V0IGEgdmFsdWUgb24gW2RhdGEtY2xvc2VdLCB0aGUgZXZlbnQgd2lsbCBidWJibGUsIGFsbG93aW5nIGl0IHRvIGNsb3NlIGEgcGFyZW50IGNvbXBvbmVudC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NlXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ2Nsb3NlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICdjbG9zZScpO1xuICB9XG4gIGVsc2Uge1xuICAgICQodGhpcykudHJpZ2dlcignY2xvc2UuemYudHJpZ2dlcicpO1xuICB9XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS10b2dnbGVdIHdpbGwgdG9nZ2xlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAndG9nZ2xlJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zYWJsZV0gd2lsbCByZXNwb25kIHRvIGNsb3NlLnpmLnRyaWdnZXIgZXZlbnRzLlxuJChkb2N1bWVudCkub24oJ2Nsb3NlLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2FibGVdJywgZnVuY3Rpb24oZSl7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGxldCBhbmltYXRpb24gPSAkKHRoaXMpLmRhdGEoJ2Nsb3NhYmxlJyk7XG5cbiAgaWYoYW5pbWF0aW9uICE9PSAnJyl7XG4gICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCgkKHRoaXMpLCBhbmltYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgICB9KTtcbiAgfWVsc2V7XG4gICAgJCh0aGlzKS5mYWRlT3V0KCkudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gIH1cbn0pO1xuXG4kKGRvY3VtZW50KS5vbignZm9jdXMuemYudHJpZ2dlciBibHVyLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlLWZvY3VzXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ3RvZ2dsZS1mb2N1cycpO1xuICAkKGAjJHtpZH1gKS50cmlnZ2VySGFuZGxlcigndG9nZ2xlLnpmLnRyaWdnZXInLCBbJCh0aGlzKV0pO1xufSk7XG5cbi8qKlxuKiBGaXJlcyBvbmNlIGFmdGVyIGFsbCBvdGhlciBzY3JpcHRzIGhhdmUgbG9hZGVkXG4qIEBmdW5jdGlvblxuKiBAcHJpdmF0ZVxuKi9cbiQod2luZG93KS5sb2FkKCgpID0+IHtcbiAgY2hlY2tMaXN0ZW5lcnMoKTtcbn0pO1xuXG5mdW5jdGlvbiBjaGVja0xpc3RlbmVycygpIHtcbiAgZXZlbnRzTGlzdGVuZXIoKTtcbiAgcmVzaXplTGlzdGVuZXIoKTtcbiAgc2Nyb2xsTGlzdGVuZXIoKTtcbiAgY2xvc2VtZUxpc3RlbmVyKCk7XG59XG5cbi8vKioqKioqKiogb25seSBmaXJlcyB0aGlzIGZ1bmN0aW9uIG9uY2Ugb24gbG9hZCwgaWYgdGhlcmUncyBzb21ldGhpbmcgdG8gd2F0Y2ggKioqKioqKipcbmZ1bmN0aW9uIGNsb3NlbWVMaXN0ZW5lcihwbHVnaW5OYW1lKSB7XG4gIHZhciB5ZXRpQm94ZXMgPSAkKCdbZGF0YS15ZXRpLWJveF0nKSxcbiAgICAgIHBsdWdOYW1lcyA9IFsnZHJvcGRvd24nLCAndG9vbHRpcCcsICdyZXZlYWwnXTtcblxuICBpZihwbHVnaW5OYW1lKXtcbiAgICBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLnB1c2gocGx1Z2luTmFtZSk7XG4gICAgfWVsc2UgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwbHVnaW5OYW1lWzBdID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMuY29uY2F0KHBsdWdpbk5hbWUpO1xuICAgIH1lbHNle1xuICAgICAgY29uc29sZS5lcnJvcignUGx1Z2luIG5hbWVzIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgfVxuICBpZih5ZXRpQm94ZXMubGVuZ3RoKXtcbiAgICBsZXQgbGlzdGVuZXJzID0gcGx1Z05hbWVzLm1hcCgobmFtZSkgPT4ge1xuICAgICAgcmV0dXJuIGBjbG9zZW1lLnpmLiR7bmFtZX1gO1xuICAgIH0pLmpvaW4oJyAnKTtcblxuICAgICQod2luZG93KS5vZmYobGlzdGVuZXJzKS5vbihsaXN0ZW5lcnMsIGZ1bmN0aW9uKGUsIHBsdWdpbklkKXtcbiAgICAgIGxldCBwbHVnaW4gPSBlLm5hbWVzcGFjZS5zcGxpdCgnLicpWzBdO1xuICAgICAgbGV0IHBsdWdpbnMgPSAkKGBbZGF0YS0ke3BsdWdpbn1dYCkubm90KGBbZGF0YS15ZXRpLWJveD1cIiR7cGx1Z2luSWR9XCJdYCk7XG5cbiAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICBsZXQgX3RoaXMgPSAkKHRoaXMpO1xuXG4gICAgICAgIF90aGlzLnRyaWdnZXJIYW5kbGVyKCdjbG9zZS56Zi50cmlnZ2VyJywgW190aGlzXSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNpemVMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXJlc2l6ZV0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZigncmVzaXplLnpmLnRyaWdnZXInKVxuICAgIC5vbigncmVzaXplLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAodGltZXIpIHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHJlc2l6ZSBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInJlc2l6ZVwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHJlc2l6ZSBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNjcm9sbExpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtc2Nyb2xsXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYudHJpZ2dlcicpXG4gICAgLm9uKCdzY3JvbGwuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYodGltZXIpeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgc2Nyb2xsIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwic2Nyb2xsXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgc2Nyb2xsIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XG4gIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2l6ZV0sIFtkYXRhLXNjcm9sbF0sIFtkYXRhLW11dGF0ZV0nKTtcblxuICAvL2VsZW1lbnQgY2FsbGJhY2tcbiAgdmFyIGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24gPSBmdW5jdGlvbihtdXRhdGlvblJlY29yZHNMaXN0KSB7XG4gICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcbiAgICAvL3RyaWdnZXIgdGhlIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBlbGVtZW50IGRlcGVuZGluZyBvbiB0eXBlXG4gICAgc3dpdGNoICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSkge1xuXG4gICAgICBjYXNlIFwicmVzaXplXCIgOlxuICAgICAgJHRhcmdldC50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0XSk7XG4gICAgICBicmVhaztcblxuICAgICAgY2FzZSBcInNjcm9sbFwiIDpcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInLCBbJHRhcmdldCwgd2luZG93LnBhZ2VZT2Zmc2V0XSk7XG4gICAgICBicmVhaztcblxuICAgICAgLy8gY2FzZSBcIm11dGF0ZVwiIDpcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGUnLCAkdGFyZ2V0KTtcbiAgICAgIC8vICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ211dGF0ZS56Zi50cmlnZ2VyJyk7XG4gICAgICAvL1xuICAgICAgLy8gLy9tYWtlIHN1cmUgd2UgZG9uJ3QgZ2V0IHN0dWNrIGluIGFuIGluZmluaXRlIGxvb3AgZnJvbSBzbG9wcHkgY29kZWluZ1xuICAgICAgLy8gaWYgKCR0YXJnZXQuaW5kZXgoJ1tkYXRhLW11dGF0ZV0nKSA9PSAkKFwiW2RhdGEtbXV0YXRlXVwiKS5sZW5ndGgtMSkge1xuICAgICAgLy8gICBkb21NdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgICAvLyB9XG4gICAgICAvLyBicmVhaztcblxuICAgICAgZGVmYXVsdCA6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvL25vdGhpbmdcbiAgICB9XG4gIH1cblxuICBpZihub2Rlcy5sZW5ndGgpe1xuICAgIC8vZm9yIGVhY2ggZWxlbWVudCB0aGF0IG5lZWRzIHRvIGxpc3RlbiBmb3IgcmVzaXppbmcsIHNjcm9sbGluZywgKG9yIGNvbWluZyBzb29uIG11dGF0aW9uKSBhZGQgYSBzaW5nbGUgb2JzZXJ2ZXJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGgtMTsgaSsrKSB7XG4gICAgICBsZXQgZWxlbWVudE9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIobGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbik7XG4gICAgICBlbGVtZW50T2JzZXJ2ZXIub2JzZXJ2ZShub2Rlc1tpXSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IGZhbHNlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTpmYWxzZSwgYXR0cmlidXRlRmlsdGVyOltcImRhdGEtZXZlbnRzXCJdfSk7XG4gICAgfVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBbUEhdXG4vLyBGb3VuZGF0aW9uLkNoZWNrV2F0Y2hlcnMgPSBjaGVja1dhdGNoZXJzO1xuRm91bmRhdGlvbi5JSGVhcllvdSA9IGNoZWNrTGlzdGVuZXJzO1xuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XG4vLyBGb3VuZGF0aW9uLklGZWVsWW91ID0gY2xvc2VtZUxpc3RlbmVyO1xuXG59KGpRdWVyeSk7XG5cbi8vIGZ1bmN0aW9uIGRvbU11dGF0aW9uT2JzZXJ2ZXIoZGVib3VuY2UpIHtcbi8vICAgLy8gISEhIFRoaXMgaXMgY29taW5nIHNvb24gYW5kIG5lZWRzIG1vcmUgd29yazsgbm90IGFjdGl2ZSAgISEhIC8vXG4vLyAgIHZhciB0aW1lcixcbi8vICAgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1tdXRhdGVdJyk7XG4vLyAgIC8vXG4vLyAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbi8vICAgICAvLyB2YXIgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4vLyAgICAgLy8gICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbi8vICAgICAvLyAgIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgLy8gICAgIGlmIChwcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJyBpbiB3aW5kb3cpIHtcbi8vICAgICAvLyAgICAgICByZXR1cm4gd2luZG93W3ByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInXTtcbi8vICAgICAvLyAgICAgfVxuLy8gICAgIC8vICAgfVxuLy8gICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuLy8gICAgIC8vIH0oKSk7XG4vL1xuLy9cbi8vICAgICAvL2ZvciB0aGUgYm9keSwgd2UgbmVlZCB0byBsaXN0ZW4gZm9yIGFsbCBjaGFuZ2VzIGVmZmVjdGluZyB0aGUgc3R5bGUgYW5kIGNsYXNzIGF0dHJpYnV0ZXNcbi8vICAgICB2YXIgYm9keU9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoYm9keU11dGF0aW9uKTtcbi8vICAgICBib2R5T2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6dHJ1ZSwgYXR0cmlidXRlRmlsdGVyOltcInN0eWxlXCIsIFwiY2xhc3NcIl19KTtcbi8vXG4vL1xuLy8gICAgIC8vYm9keSBjYWxsYmFja1xuLy8gICAgIGZ1bmN0aW9uIGJvZHlNdXRhdGlvbihtdXRhdGUpIHtcbi8vICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBtdXRhdGlvbiBldmVudFxuLy8gICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cbi8vXG4vLyAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgIGJvZHlPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4vLyAgICAgICAgICQoJ1tkYXRhLW11dGF0ZV0nKS5hdHRyKCdkYXRhLWV2ZW50cycsXCJtdXRhdGVcIik7XG4vLyAgICAgICB9LCBkZWJvdW5jZSB8fCAxNTApO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFiaWRlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hYmlkZVxuICovXG5cbmNsYXNzIEFiaWRlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWJpZGUjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEFiaWRlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBYmlkZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBBYmlkZSBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgQWJpZGUgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQsIHRleHRhcmVhLCBzZWxlY3QnKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgQWJpZGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuYWJpZGUnKVxuICAgICAgLm9uKCdyZXNldC56Zi5hYmlkZScsICgpID0+IHtcbiAgICAgICAgdGhpcy5yZXNldEZvcm0oKTtcbiAgICAgIH0pXG4gICAgICAub24oJ3N1Ym1pdC56Zi5hYmlkZScsICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVGb3JtKCk7XG4gICAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudmFsaWRhdGVPbiA9PT0gJ2ZpZWxkQ2hhbmdlJykge1xuICAgICAgdGhpcy4kaW5wdXRzXG4gICAgICAgIC5vZmYoJ2NoYW5nZS56Zi5hYmlkZScpXG4gICAgICAgIC5vbignY2hhbmdlLnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmxpdmVWYWxpZGF0ZSkge1xuICAgICAgdGhpcy4kaW5wdXRzXG4gICAgICAgIC5vZmYoJ2lucHV0LnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdpbnB1dC56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEFiaWRlIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB0aGlzLl9pbml0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgb3Igbm90IGEgZm9ybSBlbGVtZW50IGhhcyB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGFuZCBpZiBpdCdzIGNoZWNrZWQgb3Igbm90XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIHJlcXVpcmVkQ2hlY2soJGVsKSB7XG4gICAgaWYgKCEkZWwuYXR0cigncmVxdWlyZWQnKSkgcmV0dXJuIHRydWU7XG5cbiAgICB2YXIgaXNHb29kID0gdHJ1ZTtcblxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgaXNHb29kID0gJGVsWzBdLmNoZWNrZWQ7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XG4gICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICB2YXIgb3B0ID0gJGVsLmZpbmQoJ29wdGlvbjpzZWxlY3RlZCcpO1xuICAgICAgICBpZiAoIW9wdC5sZW5ndGggfHwgIW9wdC52YWwoKSkgaXNHb29kID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZighJGVsLnZhbCgpIHx8ICEkZWwudmFsKCkubGVuZ3RoKSBpc0dvb2QgPSBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXNHb29kO1xuICB9XG5cbiAgLyoqXG4gICAqIEJhc2VkIG9uICRlbCwgZ2V0IHRoZSBmaXJzdCBlbGVtZW50IHdpdGggc2VsZWN0b3IgaW4gdGhpcyBvcmRlcjpcbiAgICogMS4gVGhlIGVsZW1lbnQncyBkaXJlY3Qgc2libGluZygncykuXG4gICAqIDMuIFRoZSBlbGVtZW50J3MgcGFyZW50J3MgY2hpbGRyZW4uXG4gICAqXG4gICAqIFRoaXMgYWxsb3dzIGZvciBtdWx0aXBsZSBmb3JtIGVycm9ycyBwZXIgaW5wdXQsIHRob3VnaCBpZiBub25lIGFyZSBmb3VuZCwgbm8gZm9ybSBlcnJvcnMgd2lsbCBiZSBzaG93bi5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIHJlZmVyZW5jZSB0byBmaW5kIHRoZSBmb3JtIGVycm9yIHNlbGVjdG9yLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBqUXVlcnkgb2JqZWN0IHdpdGggdGhlIHNlbGVjdG9yLlxuICAgKi9cbiAgZmluZEZvcm1FcnJvcigkZWwpIHtcbiAgICB2YXIgJGVycm9yID0gJGVsLnNpYmxpbmdzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XG5cbiAgICBpZiAoISRlcnJvci5sZW5ndGgpIHtcbiAgICAgICRlcnJvciA9ICRlbC5wYXJlbnQoKS5maW5kKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JTZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICRlcnJvcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhpcyBvcmRlcjpcbiAgICogMi4gVGhlIDxsYWJlbD4gd2l0aCB0aGUgYXR0cmlidXRlIGBbZm9yPVwic29tZUlucHV0SWRcIl1gXG4gICAqIDMuIFRoZSBgLmNsb3Nlc3QoKWAgPGxhYmVsPlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIGZpbmRMYWJlbCgkZWwpIHtcbiAgICB2YXIgaWQgPSAkZWxbMF0uaWQ7XG4gICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgIGlmICghJGxhYmVsLmxlbmd0aCkge1xuICAgICAgcmV0dXJuICRlbC5jbG9zZXN0KCdsYWJlbCcpO1xuICAgIH1cblxuICAgIHJldHVybiAkbGFiZWw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZXQgb2YgbGFiZWxzIGFzc29jaWF0ZWQgd2l0aCBhIHNldCBvZiByYWRpbyBlbHMgaW4gdGhpcyBvcmRlclxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZFJhZGlvTGFiZWxzKCRlbHMpIHtcbiAgICB2YXIgbGFiZWxzID0gJGVscy5tYXAoKGksIGVsKSA9PiB7XG4gICAgICB2YXIgaWQgPSBlbC5pZDtcbiAgICAgIHZhciAkbGFiZWwgPSB0aGlzLiRlbGVtZW50LmZpbmQoYGxhYmVsW2Zvcj1cIiR7aWR9XCJdYCk7XG5cbiAgICAgIGlmICghJGxhYmVsLmxlbmd0aCkge1xuICAgICAgICAkbGFiZWwgPSAkKGVsKS5jbG9zZXN0KCdsYWJlbCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuICRsYWJlbFswXTtcbiAgICB9KTtcblxuICAgIHJldHVybiAkKGxhYmVscyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgdG8gdGhlIGxhYmVsLCBpbnB1dCwgYW5kIHRoZSBmb3JtXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgY2xhc3MgdG9cbiAgICovXG4gIGFkZEVycm9yQ2xhc3NlcygkZWwpIHtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykuYXR0cignZGF0YS1pbnZhbGlkJywgJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBDU1MgZXJyb3IgY2xhc3NlcyBldGMgZnJvbSBhbiBlbnRpcmUgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBncm91cE5hbWUgLSBBIHN0cmluZyB0aGF0IHNwZWNpZmllcyB0aGUgbmFtZSBvZiBhIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKlxuICAgKi9cblxuICByZW1vdmVSYWRpb0Vycm9yQ2xhc3Nlcyhncm91cE5hbWUpIHtcbiAgICB2YXIgJGVscyA9IHRoaXMuJGVsZW1lbnQuZmluZChgOnJhZGlvW25hbWU9XCIke2dyb3VwTmFtZX1cIl1gKTtcbiAgICB2YXIgJGxhYmVscyA9IHRoaXMuZmluZFJhZGlvTGFiZWxzKCRlbHMpO1xuICAgIHZhciAkZm9ybUVycm9ycyA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWxzKTtcblxuICAgIGlmICgkbGFiZWxzLmxlbmd0aCkge1xuICAgICAgJGxhYmVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvcnMubGVuZ3RoKSB7XG4gICAgICAkZm9ybUVycm9ycy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbHMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIENTUyBlcnJvciBjbGFzcyBhcyBzcGVjaWZpZWQgYnkgdGhlIEFiaWRlIHNldHRpbmdzIGZyb20gdGhlIGxhYmVsLCBpbnB1dCwgYW5kIHRoZSBmb3JtXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHJlbW92ZSB0aGUgY2xhc3MgZnJvbVxuICAgKi9cbiAgcmVtb3ZlRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIC8vIHJhZGlvcyBuZWVkIHRvIGNsZWFyIGFsbCBvZiB0aGUgZWxzXG4gICAgaWYoJGVsWzBdLnR5cGUgPT0gJ3JhZGlvJykge1xuICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMoJGVsLmF0dHIoJ25hbWUnKSk7XG4gICAgfVxuXG4gICAgdmFyICRsYWJlbCA9IHRoaXMuZmluZExhYmVsKCRlbCk7XG4gICAgdmFyICRmb3JtRXJyb3IgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVsKTtcblxuICAgIGlmICgkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAkbGFiZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZm9ybUVycm9yLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVsLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdvZXMgdGhyb3VnaCBhIGZvcm0gdG8gZmluZCBpbnB1dHMgYW5kIHByb2NlZWRzIHRvIHZhbGlkYXRlIHRoZW0gaW4gd2F5cyBzcGVjaWZpYyB0byB0aGVpciB0eXBlXG4gICAqIEBmaXJlcyBBYmlkZSNpbnZhbGlkXG4gICAqIEBmaXJlcyBBYmlkZSN2YWxpZFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhbiBIVE1MIGlucHV0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBnb29kVG9HbyAtIElmIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3QuXG4gICAqL1xuICB2YWxpZGF0ZUlucHV0KCRlbCkge1xuICAgIHZhciBjbGVhclJlcXVpcmUgPSB0aGlzLnJlcXVpcmVkQ2hlY2soJGVsKSxcbiAgICAgICAgdmFsaWRhdGVkID0gZmFsc2UsXG4gICAgICAgIGN1c3RvbVZhbGlkYXRvciA9IHRydWUsXG4gICAgICAgIHZhbGlkYXRvciA9ICRlbC5hdHRyKCdkYXRhLXZhbGlkYXRvcicpLFxuICAgICAgICBlcXVhbFRvID0gdHJ1ZTtcblxuICAgIC8vIGRvbid0IHZhbGlkYXRlIGlnbm9yZWQgaW5wdXRzIG9yIGhpZGRlbiBpbnB1dHNcbiAgICBpZiAoJGVsLmlzKCdbZGF0YS1hYmlkZS1pZ25vcmVdJykgfHwgJGVsLmlzKCdbdHlwZT1cImhpZGRlblwiXScpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVSYWRpbygkZWwuYXR0cignbmFtZScpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVRleHQoJGVsKTtcbiAgICB9XG5cbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICBjdXN0b21WYWxpZGF0b3IgPSB0aGlzLm1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvciwgJGVsLmF0dHIoJ3JlcXVpcmVkJykpO1xuICAgIH1cblxuICAgIGlmICgkZWwuYXR0cignZGF0YS1lcXVhbHRvJykpIHtcbiAgICAgIGVxdWFsVG8gPSB0aGlzLm9wdGlvbnMudmFsaWRhdG9ycy5lcXVhbFRvKCRlbCk7XG4gICAgfVxuXG5cbiAgICB2YXIgZ29vZFRvR28gPSBbY2xlYXJSZXF1aXJlLCB2YWxpZGF0ZWQsIGN1c3RvbVZhbGlkYXRvciwgZXF1YWxUb10uaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICAgIHZhciBtZXNzYWdlID0gKGdvb2RUb0dvID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJykgKyAnLnpmLmFiaWRlJztcblxuICAgIHRoaXNbZ29vZFRvR28gPyAncmVtb3ZlRXJyb3JDbGFzc2VzJyA6ICdhZGRFcnJvckNsYXNzZXMnXSgkZWwpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaW5wdXQgaXMgZG9uZSBjaGVja2luZyBmb3IgdmFsaWRhdGlvbi4gRXZlbnQgdHJpZ2dlciBpcyBlaXRoZXIgYHZhbGlkLnpmLmFiaWRlYCBvciBgaW52YWxpZC56Zi5hYmlkZWBcbiAgICAgKiBUcmlnZ2VyIGluY2x1ZGVzIHRoZSBET00gZWxlbWVudCBvZiB0aGUgaW5wdXQuXG4gICAgICogQGV2ZW50IEFiaWRlI3ZhbGlkXG4gICAgICogQGV2ZW50IEFiaWRlI2ludmFsaWRcbiAgICAgKi9cbiAgICAkZWwudHJpZ2dlcihtZXNzYWdlLCBbJGVsXSk7XG5cbiAgICByZXR1cm4gZ29vZFRvR287XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSBhbmQgaWYgdGhlcmUgYXJlIGFueSBpbnZhbGlkIGlucHV0cywgaXQgd2lsbCBkaXNwbGF5IHRoZSBmb3JtIGVycm9yIGVsZW1lbnRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IG5vRXJyb3IgLSB0cnVlIGlmIG5vIGVycm9ycyB3ZXJlIGRldGVjdGVkLi4uXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtdmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1pbnZhbGlkXG4gICAqL1xuICB2YWxpZGF0ZUZvcm0oKSB7XG4gICAgdmFyIGFjYyA9IFtdO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRpbnB1dHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGFjYy5wdXNoKF90aGlzLnZhbGlkYXRlSW5wdXQoJCh0aGlzKSkpO1xuICAgIH0pO1xuXG4gICAgdmFyIG5vRXJyb3IgPSBhY2MuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAobm9FcnJvciA/ICdub25lJyA6ICdibG9jaycpKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGZvcm0gaXMgZmluaXNoZWQgdmFsaWRhdGluZy4gRXZlbnQgdHJpZ2dlciBpcyBlaXRoZXIgYGZvcm12YWxpZC56Zi5hYmlkZWAgb3IgYGZvcm1pbnZhbGlkLnpmLmFiaWRlYC5cbiAgICAgKiBUcmlnZ2VyIGluY2x1ZGVzIHRoZSBlbGVtZW50IG9mIHRoZSBmb3JtLlxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybWludmFsaWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoKG5vRXJyb3IgPyAnZm9ybXZhbGlkJyA6ICdmb3JtaW52YWxpZCcpICsgJy56Zi5hYmlkZScsIFt0aGlzLiRlbGVtZW50XSk7XG5cbiAgICByZXR1cm4gbm9FcnJvcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSB0ZXh0IGlucHV0IGlzIHZhbGlkIGJhc2VkIG9uIHRoZSBwYXR0ZXJuIHNwZWNpZmllZCBpbiB0aGUgYXR0cmlidXRlLiBJZiBubyBtYXRjaGluZyBwYXR0ZXJuIGlzIGZvdW5kLCByZXR1cm5zIHRydWUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYSB0ZXh0IGlucHV0IEhUTUwgZWxlbWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0dGVybiAtIHN0cmluZyB2YWx1ZSBvZiBvbmUgb2YgdGhlIFJlZ0V4IHBhdHRlcm5zIGluIEFiaWRlLm9wdGlvbnMucGF0dGVybnNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCB0aGUgaW5wdXQgdmFsdWUgbWF0Y2hlcyB0aGUgcGF0dGVybiBzcGVjaWZpZWRcbiAgICovXG4gIHZhbGlkYXRlVGV4dCgkZWwsIHBhdHRlcm4pIHtcbiAgICAvLyBBIHBhdHRlcm4gY2FuIGJlIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uLCBvciBpdCB3aWxsIGJlIGluZmVyZWQgZnJvbSB0aGUgaW5wdXQncyBcInBhdHRlcm5cIiBhdHRyaWJ1dGUsIG9yIGl0J3MgXCJ0eXBlXCIgYXR0cmlidXRlXG4gICAgcGF0dGVybiA9IChwYXR0ZXJuIHx8ICRlbC5hdHRyKCdwYXR0ZXJuJykgfHwgJGVsLmF0dHIoJ3R5cGUnKSk7XG4gICAgdmFyIGlucHV0VGV4dCA9ICRlbC52YWwoKTtcbiAgICB2YXIgdmFsaWQgPSBmYWxzZTtcblxuICAgIGlmIChpbnB1dFRleHQubGVuZ3RoKSB7XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQgaXMgaW4gQWJpZGUncyBsaXN0IG9mIHBhdHRlcm5zLCB0aGVuIHRlc3QgdGhhdCByZWdleHBcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF0dGVybnMuaGFzT3duUHJvcGVydHkocGF0dGVybikpIHtcbiAgICAgICAgdmFsaWQgPSB0aGlzLm9wdGlvbnMucGF0dGVybnNbcGF0dGVybl0udGVzdChpbnB1dFRleHQpO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gbmFtZSBpc24ndCBhbHNvIHRoZSB0eXBlIGF0dHJpYnV0ZSBvZiB0aGUgZmllbGQsIHRoZW4gdGVzdCBpdCBhcyBhIHJlZ2V4cFxuICAgICAgZWxzZSBpZiAocGF0dGVybiAhPT0gJGVsLmF0dHIoJ3R5cGUnKSkge1xuICAgICAgICB2YWxpZCA9IG5ldyBSZWdFeHAocGF0dGVybikudGVzdChpbnB1dFRleHQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQW4gZW1wdHkgZmllbGQgaXMgdmFsaWQgaWYgaXQncyBub3QgcmVxdWlyZWRcbiAgICBlbHNlIGlmICghJGVsLnByb3AoJ3JlcXVpcmVkJykpIHtcbiAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHJhZGlvIGlucHV0IGlzIHZhbGlkIGJhc2VkIG9uIHdoZXRoZXIgb3Igbm90IGl0IGlzIHJlcXVpcmVkIGFuZCBzZWxlY3RlZC4gQWx0aG91Z2ggdGhlIGZ1bmN0aW9uIHRhcmdldHMgYSBzaW5nbGUgYDxpbnB1dD5gLCBpdCB2YWxpZGF0ZXMgYnkgY2hlY2tpbmcgdGhlIGByZXF1aXJlZGAgYW5kIGBjaGVja2VkYCBwcm9wZXJ0aWVzIG9mIGFsbCByYWRpbyBidXR0b25zIGluIGl0cyBncm91cC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXQgbGVhc3Qgb25lIHJhZGlvIGlucHV0IGhhcyBiZWVuIHNlbGVjdGVkIChpZiBpdCdzIHJlcXVpcmVkKVxuICAgKi9cbiAgdmFsaWRhdGVSYWRpbyhncm91cE5hbWUpIHtcbiAgICAvLyBJZiBhdCBsZWFzdCBvbmUgcmFkaW8gaW4gdGhlIGdyb3VwIGhhcyB0aGUgYHJlcXVpcmVkYCBhdHRyaWJ1dGUsIHRoZSBncm91cCBpcyBjb25zaWRlcmVkIHJlcXVpcmVkXG4gICAgLy8gUGVyIFczQyBzcGVjLCBhbGwgcmFkaW8gYnV0dG9ucyBpbiBhIGdyb3VwIHNob3VsZCBoYXZlIGByZXF1aXJlZGAsIGJ1dCB3ZSdyZSBiZWluZyBuaWNlXG4gICAgdmFyICRncm91cCA9IHRoaXMuJGVsZW1lbnQuZmluZChgOnJhZGlvW25hbWU9XCIke2dyb3VwTmFtZX1cIl1gKTtcbiAgICB2YXIgdmFsaWQgPSBmYWxzZSwgcmVxdWlyZWQgPSBmYWxzZTtcblxuICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgcmVxdWlyZWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSByZXF1aXJlZFxuICAgICRncm91cC5lYWNoKChpLCBlKSA9PiB7XG4gICAgICBpZiAoJChlKS5hdHRyKCdyZXF1aXJlZCcpKSB7XG4gICAgICAgIHJlcXVpcmVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZighcmVxdWlyZWQpIHZhbGlkPXRydWU7XG5cbiAgICBpZiAoIXZhbGlkKSB7XG4gICAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHZhbGlkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgY2hlY2tlZFxuICAgICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgICAgaWYgKCQoZSkucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZhbGlkO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgYSBzZWxlY3RlZCBpbnB1dCBwYXNzZXMgYSBjdXN0b20gdmFsaWRhdGlvbiBmdW5jdGlvbi4gTXVsdGlwbGUgdmFsaWRhdGlvbnMgY2FuIGJlIHVzZWQsIGlmIHBhc3NlZCB0byB0aGUgZWxlbWVudCB3aXRoIGBkYXRhLXZhbGlkYXRvcj1cImZvbyBiYXIgYmF6XCJgIGluIGEgc3BhY2Ugc2VwYXJhdGVkIGxpc3RlZC5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBpbnB1dCBlbGVtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmFsaWRhdG9ycyAtIGEgc3RyaW5nIG9mIGZ1bmN0aW9uIG5hbWVzIG1hdGNoaW5nIGZ1bmN0aW9ucyBpbiB0aGUgQWJpZGUub3B0aW9ucy52YWxpZGF0b3JzIG9iamVjdC5cbiAgICogQHBhcmFtIHtCb29sZWFufSByZXF1aXJlZCAtIHNlbGYgZXhwbGFuYXRvcnk/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgdmFsaWRhdGlvbnMgcGFzc2VkLlxuICAgKi9cbiAgbWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9ycywgcmVxdWlyZWQpIHtcbiAgICByZXF1aXJlZCA9IHJlcXVpcmVkID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgdmFyIGNsZWFyID0gdmFsaWRhdG9ycy5zcGxpdCgnICcpLm1hcCgodikgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy52YWxpZGF0b3JzW3ZdKCRlbCwgcmVxdWlyZWQsICRlbC5wYXJlbnQoKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsZWFyLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgZm9ybSBpbnB1dHMgYW5kIHN0eWxlc1xuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXJlc2V0XG4gICAqL1xuICByZXNldEZvcm0oKSB7XG4gICAgdmFyICRmb3JtID0gdGhpcy4kZWxlbWVudCxcbiAgICAgICAgb3B0cyA9IHRoaXMub3B0aW9ucztcblxuICAgICQoYC4ke29wdHMubGFiZWxFcnJvckNsYXNzfWAsICRmb3JtKS5ub3QoJ3NtYWxsJykucmVtb3ZlQ2xhc3Mob3B0cy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgICQoYC4ke29wdHMuaW5wdXRFcnJvckNsYXNzfWAsICRmb3JtKS5ub3QoJ3NtYWxsJykucmVtb3ZlQ2xhc3Mob3B0cy5pbnB1dEVycm9yQ2xhc3MpO1xuICAgICQoYCR7b3B0cy5mb3JtRXJyb3JTZWxlY3Rvcn0uJHtvcHRzLmZvcm1FcnJvckNsYXNzfWApLnJlbW92ZUNsYXNzKG9wdHMuZm9ybUVycm9yQ2xhc3MpO1xuICAgICRmb3JtLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgJCgnOmlucHV0JywgJGZvcm0pLm5vdCgnOmJ1dHRvbiwgOnN1Ym1pdCwgOnJlc2V0LCA6aGlkZGVuLCA6cmFkaW8sIDpjaGVja2JveCwgW2RhdGEtYWJpZGUtaWdub3JlXScpLnZhbCgnJykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgJCgnOmlucHV0OnJhZGlvJywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6Y2hlY2tib3gnLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGZvcm0gaGFzIGJlZW4gcmVzZXQuXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm1yZXNldFxuICAgICAqL1xuICAgICRmb3JtLnRyaWdnZXIoJ2Zvcm1yZXNldC56Zi5hYmlkZScsIFskZm9ybV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBSZW1vdmVzIGVycm9yIHN0eWxlcyBhbmQgY2xhc3NlcyBmcm9tIGVsZW1lbnRzLCB3aXRob3V0IHJlc2V0dGluZyB0aGVpciB2YWx1ZXMuXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9mZignLmFiaWRlJylcbiAgICAgIC5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKVxuICAgICAgICAuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcblxuICAgIHRoaXMuJGlucHV0c1xuICAgICAgLm9mZignLmFiaWRlJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5yZW1vdmVFcnJvckNsYXNzZXMoJCh0aGlzKSk7XG4gICAgICB9KTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5BYmlkZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGV2ZW50IHRvIHZhbGlkYXRlIGlucHV0cy4gQ2hlY2tib3hlcyBhbmQgcmFkaW9zIHZhbGlkYXRlIGltbWVkaWF0ZWx5LlxuICAgKiBSZW1vdmUgb3IgY2hhbmdlIHRoaXMgdmFsdWUgZm9yIG1hbnVhbCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdmaWVsZENoYW5nZSdcbiAgICovXG4gIHZhbGlkYXRlT246ICdmaWVsZENoYW5nZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXQgbGFiZWxzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1pbnZhbGlkLWxhYmVsJ1xuICAgKi9cbiAgbGFiZWxFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1sYWJlbCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXRzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1pbnZhbGlkLWlucHV0J1xuICAgKi9cbiAgaW5wdXRFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1pbnB1dCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHNlbGVjdG9yIHRvIHVzZSB0byB0YXJnZXQgRm9ybSBFcnJvcnMgZm9yIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnLmZvcm0tZXJyb3InXG4gICAqL1xuICBmb3JtRXJyb3JTZWxlY3RvcjogJy5mb3JtLWVycm9yJyxcblxuICAvKipcbiAgICogQ2xhc3MgYWRkZWQgdG8gRm9ybSBFcnJvcnMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLXZpc2libGUnXG4gICAqL1xuICBmb3JtRXJyb3JDbGFzczogJ2lzLXZpc2libGUnLFxuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSB0ZXh0IGlucHV0cyBvbiBhbnkgdmFsdWUgY2hhbmdlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBsaXZlVmFsaWRhdGU6IGZhbHNlLFxuXG4gIHBhdHRlcm5zOiB7XG4gICAgYWxwaGEgOiAvXlthLXpBLVpdKyQvLFxuICAgIGFscGhhX251bWVyaWMgOiAvXlthLXpBLVowLTldKyQvLFxuICAgIGludGVnZXIgOiAvXlstK10/XFxkKyQvLFxuICAgIG51bWJlciA6IC9eWy0rXT9cXGQqKD86W1xcLlxcLF1cXGQrKT8kLyxcblxuICAgIC8vIGFtZXgsIHZpc2EsIGRpbmVyc1xuICAgIGNhcmQgOiAvXig/OjRbMC05XXsxMn0oPzpbMC05XXszfSk/fDVbMS01XVswLTldezE0fXw2KD86MDExfDVbMC05XVswLTldKVswLTldezEyfXwzWzQ3XVswLTldezEzfXwzKD86MFswLTVdfFs2OF1bMC05XSlbMC05XXsxMX18KD86MjEzMXwxODAwfDM1XFxkezN9KVxcZHsxMX0pJC8sXG4gICAgY3Z2IDogL14oWzAtOV0pezMsNH0kLyxcblxuICAgIC8vIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3N0YXRlcy1vZi10aGUtdHlwZS1hdHRyaWJ1dGUuaHRtbCN2YWxpZC1lLW1haWwtYWRkcmVzc1xuICAgIGVtYWlsIDogL15bYS16QS1aMC05LiEjJCUmJyorXFwvPT9eX2B7fH1+LV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykrJC8sXG5cbiAgICB1cmwgOiAvXihodHRwcz98ZnRwfGZpbGV8c3NoKTpcXC9cXC8oKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OikqQCk/KCgoXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pKXwoKChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuKSsoKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4/KSg6XFxkKik/KShcXC8oKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKyhcXC8oKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSopPyk/KFxcPygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8W1xcdUUwMDAtXFx1RjhGRl18XFwvfFxcPykqKT8oXFwjKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxcXC98XFw/KSopPyQvLFxuICAgIC8vIGFiYy5kZVxuICAgIGRvbWFpbiA6IC9eKFthLXpBLVowLTldKFthLXpBLVowLTlcXC1dezAsNjF9W2EtekEtWjAtOV0pP1xcLikrW2EtekEtWl17Miw4fSQvLFxuXG4gICAgZGF0ZXRpbWUgOiAvXihbMC0yXVswLTldezN9KVxcLShbMC0xXVswLTldKVxcLShbMC0zXVswLTldKVQoWzAtNV1bMC05XSlcXDooWzAtNV1bMC05XSlcXDooWzAtNV1bMC05XSkoWnwoW1xcLVxcK10oWzAtMV1bMC05XSlcXDowMCkpJC8sXG4gICAgLy8gWVlZWS1NTS1ERFxuICAgIGRhdGUgOiAvKD86MTl8MjApWzAtOV17Mn0tKD86KD86MFsxLTldfDFbMC0yXSktKD86MFsxLTldfDFbMC05XXwyWzAtOV0pfCg/Oig/ITAyKSg/OjBbMS05XXwxWzAtMl0pLSg/OjMwKSl8KD86KD86MFsxMzU3OF18MVswMl0pLTMxKSkkLyxcbiAgICAvLyBISDpNTTpTU1xuICAgIHRpbWUgOiAvXigwWzAtOV18MVswLTldfDJbMC0zXSkoOlswLTVdWzAtOV0pezJ9JC8sXG4gICAgZGF0ZUlTTyA6IC9eXFxkezR9W1xcL1xcLV1cXGR7MSwyfVtcXC9cXC1dXFxkezEsMn0kLyxcbiAgICAvLyBNTS9ERC9ZWVlZXG4gICAgbW9udGhfZGF5X3llYXIgOiAvXigwWzEtOV18MVswMTJdKVstIFxcLy5dKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl1cXGR7NH0kLyxcbiAgICAvLyBERC9NTS9ZWVlZXG4gICAgZGF5X21vbnRoX3llYXIgOiAvXigwWzEtOV18WzEyXVswLTldfDNbMDFdKVstIFxcLy5dKDBbMS05XXwxWzAxMl0pWy0gXFwvLl1cXGR7NH0kLyxcblxuICAgIC8vICNGRkYgb3IgI0ZGRkZGRlxuICAgIGNvbG9yIDogL14jPyhbYS1mQS1GMC05XXs2fXxbYS1mQS1GMC05XXszfSkkL1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcHRpb25hbCB2YWxpZGF0aW9uIGZ1bmN0aW9ucyB0byBiZSB1c2VkLiBgZXF1YWxUb2AgYmVpbmcgdGhlIG9ubHkgZGVmYXVsdCBpbmNsdWRlZCBmdW5jdGlvbi5cbiAgICogRnVuY3Rpb25zIHNob3VsZCByZXR1cm4gb25seSBhIGJvb2xlYW4gaWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC4gRnVuY3Rpb25zIGFyZSBnaXZlbiB0aGUgZm9sbG93aW5nIGFyZ3VtZW50czpcbiAgICogZWwgOiBUaGUgalF1ZXJ5IGVsZW1lbnQgdG8gdmFsaWRhdGUuXG4gICAqIHJlcXVpcmVkIDogQm9vbGVhbiB2YWx1ZSBvZiB0aGUgcmVxdWlyZWQgYXR0cmlidXRlIGJlIHByZXNlbnQgb3Igbm90LlxuICAgKiBwYXJlbnQgOiBUaGUgZGlyZWN0IHBhcmVudCBvZiB0aGUgaW5wdXQuXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHZhbGlkYXRvcnM6IHtcbiAgICBlcXVhbFRvOiBmdW5jdGlvbiAoZWwsIHJlcXVpcmVkLCBwYXJlbnQpIHtcbiAgICAgIHJldHVybiAkKGAjJHtlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKX1gKS52YWwoKSA9PT0gZWwudmFsKCk7XG4gICAgfVxuICB9XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBYmlkZSwgJ0FiaWRlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBY2NvcmRpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBBY2NvcmRpb24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gYSBwbGFpbiBvYmplY3Qgd2l0aCBzZXR0aW5ncyB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCBvcHRpb25zLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FjY29yZGlvbicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbicsIHtcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxuICAgICAgJ1NQQUNFJzogJ3RvZ2dsZScsXG4gICAgICAnQVJST1dfRE9XTic6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIGJ5IGFuaW1hdGluZyB0aGUgcHJlc2V0IGFjdGl2ZSBwYW5lKHMpLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdyb2xlJywgJ3RhYmxpc3QnKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignbGksIFtkYXRhLWFjY29yZGlvbi1pdGVtXScpO1xuXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKGlkeCwgZWwpIHtcbiAgICAgIHZhciAkZWwgPSAkKGVsKSxcbiAgICAgICAgICAkY29udGVudCA9ICRlbC5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyksXG4gICAgICAgICAgaWQgPSAkY29udGVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2NvcmRpb24nKSxcbiAgICAgICAgICBsaW5rSWQgPSBlbC5pZCB8fCBgJHtpZH0tbGFiZWxgO1xuXG4gICAgICAkZWwuZmluZCgnYTpmaXJzdCcpLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IGlkLFxuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnaWQnOiBsaW5rSWQsXG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICAkY29udGVudC5hdHRyKHsncm9sZSc6ICd0YWJwYW5lbCcsICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWQsICdhcmlhLWhpZGRlbic6IHRydWUsICdpZCc6IGlkfSk7XG4gICAgfSk7XG4gICAgdmFyICRpbml0QWN0aXZlID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgIGlmKCRpbml0QWN0aXZlLmxlbmd0aCl7XG4gICAgICB0aGlzLmRvd24oJGluaXRBY3RpdmUsIHRydWUpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIGFjY29yZGlvbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQodGhpcyk7XG4gICAgICB2YXIgJHRhYkNvbnRlbnQgPSAkZWxlbS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgICBpZiAoJHRhYkNvbnRlbnQubGVuZ3RoKSB7XG4gICAgICAgICRlbGVtLmNoaWxkcmVuKCdhJykub2ZmKCdjbGljay56Zi5hY2NvcmRpb24ga2V5ZG93bi56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICAgLm9uKCdjbGljay56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIC8vICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBpZiAoJGVsZW0uaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkIHx8ICRlbGVtLnNpYmxpbmdzKCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKXtcbiAgICAgICAgICAgICAgX3RoaXMudXAoJHRhYkNvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIF90aGlzLmRvd24oJHRhYkNvbnRlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkub24oJ2tleWRvd24uemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbicsIHtcbiAgICAgICAgICAgIHRvZ2dsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkdGFiQ29udGVudCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLm5leHQoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ucHJldigpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgc2VsZWN0ZWQgY29udGVudCBwYW5lJ3Mgb3Blbi9jbG9zZSBzdGF0ZS5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBwYW5lIHRvIHRvZ2dsZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoJHRhcmdldCkge1xuICAgIGlmKCR0YXJnZXQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgfHwgJHRhcmdldC5wYXJlbnQoKS5zaWJsaW5ncygpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSl7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgYWNjb3JkaW9uIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gcGFuZSB0byBvcGVuLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZpcnN0VGltZSAtIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIHJlZmxvdyBzaG91bGQgaGFwcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rvd25cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkb3duKCR0YXJnZXQsIGZpcnN0VGltZSkge1xuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kICYmICFmaXJzdFRpbWUpIHtcbiAgICAgIHZhciAkY3VycmVudEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgICBpZigkY3VycmVudEFjdGl2ZS5sZW5ndGgpe1xuICAgICAgICB0aGlzLnVwKCRjdXJyZW50QWN0aXZlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkdGFyZ2V0XG4gICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCBmYWxzZSlcbiAgICAgIC5wYXJlbnQoJ1tkYXRhLXRhYi1jb250ZW50XScpXG4gICAgICAuYWRkQmFjaygpXG4gICAgICAucGFyZW50KCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJHRhcmdldC5zbGlkZURvd24odGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICgpID0+IHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAqIEBldmVudCBBY2NvcmRpb24jZG93blxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICB9KTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICAnYXJpYS1leHBhbmRlZCc6IHRydWUsXG4gICAgICAnYXJpYS1zZWxlY3RlZCc6IHRydWVcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gdGFiIHRvIGNsb3NlLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI3VwXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdXAoJHRhcmdldCkge1xuICAgIHZhciAkYXVudHMgPSAkdGFyZ2V0LnBhcmVudCgpLnNpYmxpbmdzKCksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICB2YXIgY2FuQ2xvc2UgPSB0aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQgPyAkYXVudHMuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIDogJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICBpZighdGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkICYmICFjYW5DbG9zZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb24jdXBcbiAgICAgICAgICovXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvLyB9KTtcblxuICAgICR0YXJnZXQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKVxuICAgICAgICAgICAucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rlc3Ryb3llZFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10YWItY29udGVudF0nKS5zdG9wKHRydWUpLnNsaWRlVXAoMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignLnpmLmFjY29yZGlvbicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkFjY29yZGlvbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYW4gYWNjb3JkaW9uIHBhbmUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgYWNjb3JkaW9uIHRvIGhhdmUgbXVsdGlwbGUgb3BlbiBwYW5lcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlFeHBhbmQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBjbG9zZSBhbGwgcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFsbG93QWxsQ2xvc2VkOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbiwgJ0FjY29yZGlvbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIEFjY29yZGlvbk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb25NZW51Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uTWVudScsIHtcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxuICAgICAgJ1NQQUNFJzogJ3RvZ2dsZScsXG4gICAgICAnQVJST1dfUklHSFQnOiAnb3BlbicsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdjbG9zZScsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlQWxsJyxcbiAgICAgICdUQUInOiAnZG93bicsXG4gICAgICAnU0hJRlRfVEFCJzogJ3VwJ1xuICAgIH0pO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIG1lbnUgYnkgaGlkaW5nIGFsbCBuZXN0ZWQgbWVudXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykubm90KCcuaXMtYWN0aXZlJykuc2xpZGVVcCgwKTsvLy5maW5kKCdhJykuY3NzKCdwYWRkaW5nLWxlZnQnLCAnMXJlbScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAncm9sZSc6ICd0YWJsaXN0JyxcbiAgICAgICdhcmlhLW11bHRpc2VsZWN0YWJsZSc6IHRoaXMub3B0aW9ucy5tdWx0aU9wZW5cbiAgICB9KTtcblxuICAgIHRoaXMuJG1lbnVMaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuJG1lbnVMaW5rcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbGlua0lkID0gdGhpcy5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2MtbWVudS1saW5rJyksXG4gICAgICAgICAgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSxcbiAgICAgICAgICBzdWJJZCA9ICRzdWJbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUnKSxcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRzdWIuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgJGVsZW0uYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogc3ViSWQsXG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG4gICAgICAkc3ViLmF0dHIoe1xuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiAhaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ3RhYnBhbmVsJyxcbiAgICAgICAgJ2lkJzogc3ViSWRcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBpbml0UGFuZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKTtcbiAgICBpZihpbml0UGFuZXMubGVuZ3RoKXtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICBpbml0UGFuZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICBfdGhpcy5kb3duKCQodGhpcykpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgbWVudS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnbGknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRzdWJtZW51ID0gJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcblxuICAgICAgaWYgKCRzdWJtZW51Lmxlbmd0aCkge1xuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdhJykub2ZmKCdjbGljay56Zi5hY2NvcmRpb25NZW51Jykub24oJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgX3RoaXMudG9nZ2xlKCRzdWJtZW51KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkub24oJ2tleWRvd24uemYuYWNjb3JkaW9ubWVudScsIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcbiAgICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJyksXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAgICRuZXh0RWxlbWVudCxcbiAgICAgICAgICAkdGFyZ2V0ID0gJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1pbihpKzEsICRlbGVtZW50cy5sZW5ndGgtMSkpLmZpbmQoJ2EnKS5maXJzdCgpO1xuXG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaGFzIG9wZW4gc3ViIG1lbnVcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50LmZpbmQoJ2xpOmZpcnN0LWNoaWxkJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6Zmlyc3QtY2hpbGQnKSkgeyAvLyBpcyBmaXJzdCBlbGVtZW50IG9mIHN1YiBtZW51XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkcHJldkVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaWYgcHJldmlvdXMgZWxlbWVudCBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJHByZXZFbGVtZW50LmZpbmQoJ2xpOmxhc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCQodGhpcykuaXMoJzpsYXN0LWNoaWxkJykpIHsgLy8gaXMgbGFzdCBlbGVtZW50IG9mIHN1YiBtZW51XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkubmV4dCgnbGknKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICAgIF90aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICAgICAgICAkdGFyZ2V0LmZpbmQoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0Lmxlbmd0aCAmJiAhJHRhcmdldC5pcygnOmhpZGRlbicpKSB7IC8vIGNsb3NlIGFjdGl2ZSBzdWIgb2YgdGhpcyBpdGVtXG4gICAgICAgICAgICBfdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHsgLy8gY2xvc2UgY3VycmVudGx5IG9wZW4gc3ViXG4gICAgICAgICAgICBfdGhpcy51cCgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgLTEpLmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuaGlkZUFsbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTsvLy5hdHRyKCd0YWJpbmRleCcsIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcGFuZXMgb2YgdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgaGlkZUFsbCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVVcCh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZSBzdGF0ZSBvZiBhIHN1Ym1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIHRoZSBzdWJtZW51IHRvIHRvZ2dsZVxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpe1xuICAgIGlmKCEkdGFyZ2V0LmlzKCc6YW5pbWF0ZWQnKSkge1xuICAgICAgaWYgKCEkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBzdWItbWVudSBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBvcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNkb3duXG4gICAqL1xuICBkb3duKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5tdWx0aU9wZW4pIHtcbiAgICAgIHRoaXMudXAodGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJykubm90KCR0YXJnZXQucGFyZW50c1VudGlsKHRoaXMuJGVsZW1lbnQpLmFkZCgkdGFyZ2V0KSkpO1xuICAgIH1cblxuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSlcbiAgICAgIC5wYXJlbnQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcblxuICAgICAgLy9Gb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkdGFyZ2V0LnNsaWRlRG93bihfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSNkb3duXG4gICAgICAgICAgICovXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignZG93bi56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgICAgfSk7XG4gICAgICAvL30pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuIEFsbCBzdWItbWVudXMgaW5zaWRlIHRoZSB0YXJnZXQgd2lsbCBiZSBjbG9zZWQgYXMgd2VsbC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBjbG9zZS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjdXBcbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpe1xuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb25NZW51I3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgIH0pO1xuICAgIC8vfSk7XG5cbiAgICB2YXIgJG1lbnVzID0gJHRhcmdldC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAoMCkuYWRkQmFjaygpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAkbWVudXMucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhY2NvcmRpb24gbWVudS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZGVzdHJveWVkXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZURvd24oMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhIHN1Ym1lbnUgaW4gbXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgbXVsdGlPcGVuOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWNjb3JkaW9uTWVudSwgJ0FjY29yZGlvbk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyaWxsZG93biBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJpbGxkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5uZXN0XG4gKi9cblxuY2xhc3MgRHJpbGxkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcmlsbGRvd24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJpbGxkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcmlsbGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcmlsbGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAnZG93bicsXG4gICAgICAnU0hJRlRfVEFCJzogJ3VwJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBkcmlsbGRvd24gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zIG9mIGVsZW1lbnRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50JykuY2hpbGRyZW4oJ2EnKTtcbiAgICB0aGlzLiRzdWJtZW51cyA9IHRoaXMuJHN1Ym1lbnVBbmNob3JzLnBhcmVudCgnbGknKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykubm90KCcuanMtZHJpbGxkb3duLWJhY2snKS5hdHRyKCdyb2xlJywgJ21lbnVpdGVtJykuZmluZCgnYScpO1xuXG4gICAgdGhpcy5fcHJlcGFyZU1lbnUoKTtcblxuICAgIHRoaXMuX2tleWJvYXJkRXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogcHJlcGFyZXMgZHJpbGxkb3duIG1lbnUgYnkgc2V0dGluZyBhdHRyaWJ1dGVzIHRvIGxpbmtzIGFuZCBlbGVtZW50c1xuICAgKiBzZXRzIGEgbWluIGhlaWdodCB0byBwcmV2ZW50IGNvbnRlbnQganVtcGluZ1xuICAgKiB3cmFwcyB0aGUgZWxlbWVudCBpZiBub3QgYWxyZWFkeSB3cmFwcGVkXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX3ByZXBhcmVNZW51KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLy8gaWYoIXRoaXMub3B0aW9ucy5ob2xkT3Blbil7XG4gICAgLy8gICB0aGlzLl9tZW51TGlua0V2ZW50cygpO1xuICAgIC8vIH1cbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgdmFyICRzdWIgPSAkbGluay5wYXJlbnQoKTtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMucGFyZW50TGluayl7XG4gICAgICAgICRsaW5rLmNsb25lKCkucHJlcGVuZFRvKCRzdWIuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpLndyYXAoJzxsaSBjbGFzcz1cImlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gaXMtc3VibWVudS1pdGVtIGlzLWRyaWxsZG93bi1zdWJtZW51LWl0ZW1cIiByb2xlPVwibWVudS1pdGVtXCI+PC9saT4nKTtcbiAgICAgIH1cbiAgICAgICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicsICRsaW5rLmF0dHIoJ2hyZWYnKSkucmVtb3ZlQXR0cignaHJlZicpO1xuICAgICAgJGxpbmsuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogMCxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICBfdGhpcy5fZXZlbnRzKCRsaW5rKTtcbiAgICB9KTtcbiAgICB0aGlzLiRzdWJtZW51cy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJG1lbnUgPSAkKHRoaXMpLFxuICAgICAgICAgICRiYWNrID0gJG1lbnUuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrJyk7XG4gICAgICBpZighJGJhY2subGVuZ3RoKXtcbiAgICAgICAgJG1lbnUucHJlcGVuZChfdGhpcy5vcHRpb25zLmJhY2tCdXR0b24pO1xuICAgICAgfVxuICAgICAgX3RoaXMuX2JhY2soJG1lbnUpO1xuICAgIH0pO1xuICAgIGlmKCF0aGlzLiRlbGVtZW50LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24nKSl7XG4gICAgICB0aGlzLiR3cmFwcGVyID0gJCh0aGlzLm9wdGlvbnMud3JhcHBlcikuYWRkQ2xhc3MoJ2lzLWRyaWxsZG93bicpO1xuICAgICAgdGhpcy4kd3JhcHBlciA9IHRoaXMuJGVsZW1lbnQud3JhcCh0aGlzLiR3cmFwcGVyKS5wYXJlbnQoKS5jc3ModGhpcy5fZ2V0TWF4RGltcygpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byBlbGVtZW50cyBpbiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IG1lbnUgaXRlbSB0byBhZGQgaGFuZGxlcnMgdG8uXG4gICAqL1xuICBfZXZlbnRzKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICRlbGVtLm9mZignY2xpY2suemYuZHJpbGxkb3duJylcbiAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYoJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdsaScpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKSl7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYoZS50YXJnZXQgIT09IGUuY3VycmVudFRhcmdldC5maXJzdEVsZW1lbnRDaGlsZCl7XG4gICAgICAvLyAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICAgIF90aGlzLl9zaG93KCRlbGVtLnBhcmVudCgnbGknKSk7XG5cbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKXtcbiAgICAgICAgdmFyICRib2R5ID0gJCgnYm9keScpO1xuICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKS5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLl9oaWRlQWxsKCk7XG4gICAgICAgICAgJGJvZHkub2ZmKCcuemYuZHJpbGxkb3duJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5ZG93biBldmVudCBsaXN0ZW5lciB0byBgbGlgJ3MgaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2V5Ym9hcmRFdmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJG1lbnVJdGVtcy5hZGQodGhpcy4kZWxlbWVudC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2sgPiBhJykpLm9uKCdrZXlkb3duLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJykuY2hpbGRyZW4oJ2EnKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJpbGxkb3duJywge1xuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9iYWNrKCk7XG4gICAgICAgICAgLy9fdGhpcy4kbWVudUl0ZW1zLmZpcnN0KCkuZm9jdXMoKTsgLy8gZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRtZW51SXRlbXMpKSB7IC8vIG5vdCBtZW51IGl0ZW0gbWVhbnMgYmFjayBidXR0b25cbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRlbGVtZW50LmlzKF90aGlzLiRzdWJtZW51QW5jaG9ycykpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5maW5kKCd1bCBsaSBhJykuZmlsdGVyKF90aGlzLiRtZW51SXRlbXMpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7IC8vIGVuZCBrZXlib2FyZEFjY2Vzc1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgb3BlbiBlbGVtZW50cywgYW5kIHJldHVybnMgdG8gcm9vdCBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNjbG9zZWRcbiAgICovXG4gIF9oaWRlQWxsKCkge1xuICAgIHZhciAkZWxlbSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LmlzLWFjdGl2ZScpLmFkZENsYXNzKCdpcy1jbG9zaW5nJyk7XG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xuICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgfSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGZ1bGx5IGNsb3NlZC5cbiAgICAgICAgICogQGV2ZW50IERyaWxsZG93biNjbG9zZWRcbiAgICAgICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYuZHJpbGxkb3duJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciBmb3IgZWFjaCBgYmFja2AgYnV0dG9uLCBhbmQgY2xvc2VzIG9wZW4gbWVudXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2JhY2tcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gYWRkIGBiYWNrYCBldmVudC5cbiAgICovXG4gIF9iYWNrKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xuICAgICRlbGVtLmNoaWxkcmVuKCcuanMtZHJpbGxkb3duLWJhY2snKVxuICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ21vdXNldXAgb24gYmFjaycpO1xuICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVyIHRvIG1lbnUgaXRlbXMgdy9vIHN1Ym1lbnVzIHRvIGNsb3NlIG9wZW4gbWVudXMgb24gY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21lbnVMaW5rRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm5vdCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpXG4gICAgICAgIC5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNvcGVuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gb3BlbiwgaS5lLiB0aGUgYGxpYCB0YWcuXG4gICAqL1xuICBfc2hvdygkZWxlbSkge1xuICAgICRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBzdWJtZW51IGhhcyBvcGVuZWQuXG4gICAgICogQGV2ZW50IERyaWxsZG93biNvcGVuXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvcGVuLnpmLmRyaWxsZG93bicsIFskZWxlbV0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBIaWRlcyBhIHN1Ym1lbnVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jaGlkZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBzdWItbWVudSB0byBoaWRlLCBpLmUuIHRoZSBgdWxgIHRhZy5cbiAgICovXG4gIF9oaWRlKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5hZGRDbGFzcygnaXMtY2xvc2luZycpXG4gICAgICAgICAub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xuICAgICAgICAgICAkZWxlbS5ibHVyKCk7XG4gICAgICAgICB9KTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBzdWJtZW51IGhhcyBjbG9zZWQuXG4gICAgICogQGV2ZW50IERyaWxsZG93biNoaWRlXG4gICAgICovXG4gICAgJGVsZW0udHJpZ2dlcignaGlkZS56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyB0aHJvdWdoIHRoZSBuZXN0ZWQgbWVudXMgdG8gY2FsY3VsYXRlIHRoZSBtaW4taGVpZ2h0LCBhbmQgbWF4LXdpZHRoIGZvciB0aGUgbWVudS5cbiAgICogUHJldmVudHMgY29udGVudCBqdW1waW5nLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9nZXRNYXhEaW1zKCkge1xuICAgIHZhciBtYXggPSAwLCByZXN1bHQgPSB7fTtcbiAgICB0aGlzLiRzdWJtZW51cy5hZGQodGhpcy4kZWxlbWVudCkuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIG51bU9mRWxlbXMgPSAkKHRoaXMpLmNoaWxkcmVuKCdsaScpLmxlbmd0aDtcbiAgICAgIG1heCA9IG51bU9mRWxlbXMgPiBtYXggPyBudW1PZkVsZW1zIDogbWF4O1xuICAgIH0pO1xuXG4gICAgcmVzdWx0WydtaW4taGVpZ2h0J10gPSBgJHttYXggKiB0aGlzLiRtZW51SXRlbXNbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0fXB4YDtcbiAgICByZXN1bHRbJ21heC13aWR0aCddID0gYCR7dGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aH1weGA7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBEcmlsbGRvd24gTWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5faGlkZUFsbCgpO1xuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdkcmlsbGRvd24nKTtcbiAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpXG4gICAgICAgICAgICAgICAgIC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2ssIC5pcy1zdWJtZW51LXBhcmVudC1pdGVtJykucmVtb3ZlKClcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJy5pcy1hY3RpdmUsIC5pcy1jbG9zaW5nLCAuaXMtZHJpbGxkb3duLXN1Ym1lbnUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcgaXMtZHJpbGxkb3duLXN1Ym1lbnUnKVxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnW2RhdGEtc3VibWVudV0nKS5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiB0YWJpbmRleCByb2xlJyk7XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykub2ZmKCcuemYuZHJpbGxkb3duJyk7XG4gICAgfSk7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdhJykuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRsaW5rID0gJCh0aGlzKTtcbiAgICAgIGlmKCRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKXtcbiAgICAgICAgJGxpbmsuYXR0cignaHJlZicsICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKS5yZW1vdmVEYXRhKCdzYXZlZEhyZWYnKTtcbiAgICAgIH1lbHNleyByZXR1cm47IH1cbiAgICB9KTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cbkRyaWxsZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIGZvciBKUyBnZW5lcmF0ZWQgYmFjayBidXR0b24uIFByZXBlbmRlZCB0byBzdWJtZW51IGxpc3RzIGFuZCBkZWxldGVkIG9uIGBkZXN0cm95YCBtZXRob2QsICdqcy1kcmlsbGRvd24tYmFjaycgY2xhc3MgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxsaT48XFxhPkJhY2s8XFwvYT48XFwvbGk+J1xuICAgKi9cbiAgYmFja0J1dHRvbjogJzxsaSBjbGFzcz1cImpzLWRyaWxsZG93bi1iYWNrXCI+PGEgdGFiaW5kZXg9XCIwXCI+QmFjazwvYT48L2xpPicsXG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCB0byB3cmFwIGRyaWxsZG93biBtZW51LiBVc2UgYSBjbGFzcyBuYW1lIGZvciBpbmRlcGVuZGVudCBzdHlsaW5nOyB0aGUgSlMgYXBwbGllZCBjbGFzczogYGlzLWRyaWxsZG93bmAgaXMgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxkaXYgY2xhc3M9XCJpcy1kcmlsbGRvd25cIj48XFwvZGl2PidcbiAgICovXG4gIHdyYXBwZXI6ICc8ZGl2PjwvZGl2PicsXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBwYXJlbnQgbGluayB0byB0aGUgc3VibWVudS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgcGFyZW50TGluazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byByZXR1cm4gdG8gcm9vdCBsaXN0IG9uIGJvZHkgY2xpY2suXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGNsb3NlT25DbGljazogZmFsc2VcbiAgLy8gaG9sZE9wZW46IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJpbGxkb3duLCAnRHJpbGxkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93biBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJvcGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgRHJvcGRvd24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyb3Bkb3duLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duLlxuICAgKiAgICAgICAgT2JqZWN0IHNob3VsZCBiZSBvZiB0aGUgZHJvcGRvd24gcGFuZWwsIHJhdGhlciB0aGFuIGl0cyBhbmNob3IuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ3RhYl9mb3J3YXJkJyxcbiAgICAgICdTSElGVF9UQUInOiAndGFiX2JhY2t3YXJkJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgc2V0dGluZy9jaGVja2luZyBvcHRpb25zIGFuZCBhdHRyaWJ1dGVzLCBhZGRpbmcgaGVscGVyIHZhcmlhYmxlcywgYW5kIHNhdmluZyB0aGUgYW5jaG9yLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKSB8fCAkKGBbZGF0YS1vcGVuPVwiJHskaWR9XCJdYCk7XG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xuICAgICAgJ2FyaWEtY29udHJvbHMnOiAkaWQsXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiAkaWQsXG4gICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlXG5cbiAgICB9KTtcblxuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCk7XG4gICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMgPSBbXTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2FyaWEtaGlkZGVuJzogJ3RydWUnLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiAkaWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiAkaWQsXG4gICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogdGhpcy4kYW5jaG9yWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2RkLWFuY2hvcicpXG4gICAgfSk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIGRldGVybWluZSBjdXJyZW50IG9yaWVudGF0aW9uIG9mIGRyb3Bkb3duIHBhbmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBwb3NpdGlvbiAtIHN0cmluZyB2YWx1ZSBvZiBhIHBvc2l0aW9uIGNsYXNzLlxuICAgKi9cbiAgZ2V0UG9zaXRpb25DbGFzcygpIHtcbiAgICB2YXIgdmVydGljYWxQb3NpdGlvbiA9IHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC8odG9wfGxlZnR8cmlnaHR8Ym90dG9tKS9nKTtcbiAgICAgICAgdmVydGljYWxQb3NpdGlvbiA9IHZlcnRpY2FsUG9zaXRpb24gPyB2ZXJ0aWNhbFBvc2l0aW9uWzBdIDogJyc7XG4gICAgdmFyIGhvcml6b250YWxQb3NpdGlvbiA9IC9mbG9hdC0oXFxTKylcXHMvLmV4ZWModGhpcy4kYW5jaG9yWzBdLmNsYXNzTmFtZSk7XG4gICAgICAgIGhvcml6b250YWxQb3NpdGlvbiA9IGhvcml6b250YWxQb3NpdGlvbiA/IGhvcml6b250YWxQb3NpdGlvblsxXSA6ICcnO1xuICAgIHZhciBwb3NpdGlvbiA9IGhvcml6b250YWxQb3NpdGlvbiA/IGhvcml6b250YWxQb3NpdGlvbiArICcgJyArIHZlcnRpY2FsUG9zaXRpb24gOiB2ZXJ0aWNhbFBvc2l0aW9uO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIHRoZSBkcm9wZG93biBwYW5lcyBvcmllbnRhdGlvbiBieSBhZGRpbmcvcmVtb3ZpbmcgcG9zaXRpb25pbmcgY2xhc3Nlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uIGNsYXNzIHRvIHJlbW92ZS5cbiAgICovXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcbiAgICAvL2RlZmF1bHQsIHRyeSBzd2l0Y2hpbmcgdG8gb3Bwb3NpdGUgc2lkZVxuICAgIGlmKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygndG9wJyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxuICAgIGVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHBvc2l0aW9uIGFuZCBvcmllbnRhdGlvbiBvZiB0aGUgZHJvcGRvd24gcGFuZSwgY2hlY2tzIGZvciBjb2xsaXNpb25zLlxuICAgKiBSZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgaWYgYSBjb2xsaXNpb24gaXMgZGV0ZWN0ZWQsIHdpdGggYSBuZXcgcG9zaXRpb24gY2xhc3MuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFBvc2l0aW9uKCkge1xuICAgIGlmKHRoaXMuJGFuY2hvci5hdHRyKCdhcmlhLWV4cGFuZGVkJykgPT09ICdmYWxzZScpeyByZXR1cm4gZmFsc2U7IH1cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKSxcbiAgICAgICAgJGVsZURpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGVsZW1lbnQpLFxuICAgICAgICAkYW5jaG9yRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kYW5jaG9yKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcbiAgICAgICAgcGFyYW0gPSAoZGlyZWN0aW9uID09PSAndG9wJykgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIG9mZnNldCA9IChwYXJhbSA9PT0gJ2hlaWdodCcpID8gdGhpcy5vcHRpb25zLnZPZmZzZXQgOiB0aGlzLm9wdGlvbnMuaE9mZnNldDtcblxuXG5cbiAgICBpZigoJGVsZURpbXMud2lkdGggPj0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCkpKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6ICRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsIHBvc2l0aW9uLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcblxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMuJGVsZW1lbnQsIGZhbHNlLCB0cnVlKSAmJiB0aGlzLmNvdW50ZXIpe1xuICAgICAgdGhpcy5fcmVwb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgZWxlbWVudCB1dGlsaXppbmcgdGhlIHRyaWdnZXJzIHV0aWxpdHkgbGlicmFyeS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX3NldFBvc2l0aW9uLmJpbmQodGhpcylcbiAgICB9KTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5ob3Zlcil7XG4gICAgICB0aGlzLiRhbmNob3Iub2ZmKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duIG1vdXNlbGVhdmUuemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCB0cnVlKTtcbiAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgfSk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXJQYW5lKXtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy4kYW5jaG9yLmFkZCh0aGlzLiRlbGVtZW50KS5vbigna2V5ZG93bi56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpLFxuICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoX3RoaXMuJGVsZW1lbnQpO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd24nLCB7XG4gICAgICAgIHRhYl9mb3J3YXJkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXModmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKSkpIHsgLy8gbGVmdCBtb2RhbCBkb3dud2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7IC8vIGlmIGZvY3VzIHNoYWxsIGJlIHRyYXBwZWRcbiAgICAgICAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzLmVxKDApLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGlmIGZvY3VzIGlzIG5vdCB0cmFwcGVkLCBjbG9zZSBkcm9wZG93biBvbiBmb2N1cyBvdXRcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYl9iYWNrd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgwKSkgfHwgX3RoaXMuJGVsZW1lbnQuaXMoJzpmb2N1cycpKSB7IC8vIGxlZnQgbW9kYWwgdXB3YXJkcywgc2V0dGluZyBmb2N1cyB0byBsYXN0IGVsZW1lbnRcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLnRyYXBGb2N1cykgeyAvLyBpZiBmb2N1cyBzaGFsbCBiZSB0cmFwcGVkXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgtMSkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaWYgZm9jdXMgaXMgbm90IHRyYXBwZWQsIGNsb3NlIGRyb3Bkb3duIG9uIGZvY3VzIG91dFxuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCR0YXJnZXQuaXMoX3RoaXMuJGFuY2hvcikpIHtcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLm5vdCh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgIF90aGlzID0gdGhpcztcbiAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpXG4gICAgICAgICAgLm9uKCdjbGljay56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgaWYoX3RoaXMuJGFuY2hvci5pcyhlLnRhcmdldCkgfHwgX3RoaXMuJGFuY2hvci5maW5kKGUudGFyZ2V0KS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAkYm9keS5vZmYoJ2NsaWNrLnpmLmRyb3Bkb3duJyk7XG4gICAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGRyb3Bkb3duIHBhbmUsIGFuZCBmaXJlcyBhIGJ1YmJsaW5nIGV2ZW50IHRvIGNsb3NlIG90aGVyIGRyb3Bkb3ducy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNjbG9zZW1lXG4gICAqIEBmaXJlcyBEcm9wZG93biNzaG93XG4gICAqL1xuICBvcGVuKCkge1xuICAgIC8vIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLyoqXG4gICAgICogRmlyZXMgdG8gY2xvc2Ugb3RoZXIgb3BlbiBkcm9wZG93bnNcbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jY2xvc2VtZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5kcm9wZG93bicsIHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKSk7XG4gICAgdGhpcy4kYW5jaG9yLmFkZENsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcbiAgICAvLyB0aGlzLiRlbGVtZW50Lyouc2hvdygpKi87XG4gICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcbiAgICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgIHZhciAkZm9jdXNhYmxlID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgaWYoJGZvY3VzYWJsZS5sZW5ndGgpe1xuICAgICAgICAkZm9jdXNhYmxlLmVxKDApLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayl7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIG9uY2UgdGhlIGRyb3Bkb3duIGlzIHZpc2libGUuXG4gICAgICogQGV2ZW50IERyb3Bkb3duI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgb3BlbiBkcm9wZG93biBwYW5lLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyb3Bkb3duI2hpZGVcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGlmKCF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdpcy1vcGVuJylcbiAgICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6IHRydWV9KTtcblxuICAgIHRoaXMuJGFuY2hvci5yZW1vdmVDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcblxuICAgIGlmKHRoaXMuY2xhc3NDaGFuZ2VkKXtcbiAgICAgIHZhciBjdXJQb3NpdGlvbkNsYXNzID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCk7XG4gICAgICBpZihjdXJQb3NpdGlvbkNsYXNzKXtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhjdXJQb3NpdGlvbkNsYXNzKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpXG4gICAgICAgICAgLyouaGlkZSgpKi8uY3NzKHtoZWlnaHQ6ICcnLCB3aWR0aDogJyd9KTtcbiAgICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgICAgdGhpcy51c2VkUG9zaXRpb25zLmxlbmd0aCA9IDA7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZHJvcGRvd24gcGFuZSdzIHZpc2liaWxpdHkuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICBpZih0aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInKSkgcmV0dXJuO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBkcm9wZG93bi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlcicpLmhpZGUoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYuZHJvcGRvd24nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ecm9wZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjUwLFxuICAvKipcbiAgICogQWxsb3cgc3VibWVudXMgdG8gb3BlbiBvbiBob3ZlciBldmVudHNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgaG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogRG9uJ3QgY2xvc2UgZHJvcGRvd24gd2hlbiBob3ZlcmluZyBvdmVyIGRyb3Bkb3duIHBhbmVcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBob3ZlclBhbmU6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgdk9mZnNldDogMSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIGhPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGFkanVzdCBvcGVuIHBvc2l0aW9uLiBKUyB3aWxsIHRlc3QgYW5kIGZpbGwgdGhpcyBpbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHRyYXAgZm9jdXMgdG8gdGhlIGRyb3Bkb3duIHBhbmUgaWYgb3BlbmVkIHdpdGgga2V5Ym9hcmQgY29tbWFuZHMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHRyYXBGb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHNldCBmb2N1cyB0byB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnQgd2l0aGluIHRoZSBwYW5lLCByZWdhcmRsZXNzIG9mIG1ldGhvZCBvZiBvcGVuaW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keSB0byBjbG9zZSB0aGUgZHJvcGRvd24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGNsb3NlT25DbGljazogZmFsc2Vcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyb3Bkb3duLCAnRHJvcGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJvcGRvd24tbWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIERyb3Bkb3duTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIERyb3Bkb3duTWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bk1lbnUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdkcm9wZG93bicpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duTWVudScsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBsdWdpbiwgYW5kIGNhbGxzIF9wcmVwYXJlTWVudVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzdWJzID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKCdmaXJzdC1zdWInKTtcblxuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdbcm9sZT1cIm1lbnVpdGVtXCJdJyk7XG4gICAgdGhpcy4kdGFicy5maW5kKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51JykuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnZlcnRpY2FsQ2xhc3MpO1xuXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLnJpZ2h0Q2xhc3MpIHx8IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdyaWdodCcgfHwgRm91bmRhdGlvbi5ydGwoKSB8fCB0aGlzLiRlbGVtZW50LnBhcmVudHMoJy50b3AtYmFyLXJpZ2h0JykuaXMoJyonKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmFsaWdubWVudCA9ICdyaWdodCc7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1sZWZ0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YnMuYWRkQ2xhc3MoJ29wZW5zLXJpZ2h0Jyk7XG4gICAgfVxuICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9O1xuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gZWxlbWVudHMgd2l0aGluIHRoZSBtZW51XG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBoYXNUb3VjaCA9ICdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fCAodHlwZW9mIHdpbmRvdy5vbnRvdWNoc3RhcnQgIT09ICd1bmRlZmluZWQnKSxcbiAgICAgICAgcGFyQ2xhc3MgPSAnaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnO1xuXG4gICAgLy8gdXNlZCBmb3Igb25DbGljayBhbmQgaW4gdGhlIGtleWJvYXJkIGhhbmRsZXJzXG4gICAgdmFyIGhhbmRsZUNsaWNrRm4gPSBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgYC4ke3BhckNsYXNzfWApLFxuICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKSxcbiAgICAgICAgICBoYXNDbGlja2VkID0gJGVsZW0uYXR0cignZGF0YS1pcy1jbGljaycpID09PSAndHJ1ZScsXG4gICAgICAgICAgJHN1YiA9ICRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpO1xuXG4gICAgICBpZiAoaGFzU3ViKSB7XG4gICAgICAgIGlmIChoYXNDbGlja2VkKSB7XG4gICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayB8fCAoIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuICYmICFoYXNUb3VjaCkgfHwgKF90aGlzLm9wdGlvbnMuZm9yY2VGb2xsb3cgJiYgaGFzVG91Y2gpKSB7IHJldHVybjsgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51JykpO1xuICAgICAgICAgICRlbGVtLmFkZCgkZWxlbS5wYXJlbnRzVW50aWwoX3RoaXMuJGVsZW1lbnQsIGAuJHtwYXJDbGFzc31gKSkuYXR0cignZGF0YS1pcy1jbGljaycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICB9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4gfHwgaGFzVG91Y2gpIHtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignY2xpY2suemYuZHJvcGRvd25tZW51IHRvdWNoc3RhcnQuemYuZHJvcGRvd25tZW51JywgaGFuZGxlQ2xpY2tGbik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuXG4gICAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMuZGVsYXkpO1xuICAgICAgICAgIF90aGlzLmRlbGF5ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XG4gICAgICAgIGlmIChoYXNTdWIgJiYgX3RoaXMub3B0aW9ucy5hdXRvY2xvc2UpIHtcbiAgICAgICAgICBpZiAoJGVsZW0uYXR0cignZGF0YS1pcy1jbGljaycpID09PSAndHJ1ZScgJiYgX3RoaXMub3B0aW9ucy5jbGlja09wZW4pIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMuZGVsYXkpO1xuICAgICAgICAgIF90aGlzLmRlbGF5ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmNsb3NpbmdUaW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuJG1lbnVJdGVtcy5vbigna2V5ZG93bi56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ1tyb2xlPVwibWVudWl0ZW1cIl0nKSxcbiAgICAgICAgICBpc1RhYiA9IF90aGlzLiR0YWJzLmluZGV4KCRlbGVtZW50KSA+IC0xLFxuICAgICAgICAgICRlbGVtZW50cyA9IGlzVGFiID8gX3RoaXMuJHRhYnMgOiAkZWxlbWVudC5zaWJsaW5ncygnbGknKS5hZGQoJGVsZW1lbnQpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGkrMSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIG5leHRTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghJGVsZW1lbnQuaXMoJzpsYXN0LWNoaWxkJykpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJldlNpYmxpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHByZXZFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSwgb3BlblN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJHN1YiA9ICRlbGVtZW50LmNoaWxkcmVuKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG4gICAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KCRzdWIpO1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ2xpID4gYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICAgIH0sIGNsb3NlU3ViID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vaWYgKCRlbGVtZW50LmlzKCc6Zmlyc3QtY2hpbGQnKSkge1xuICAgICAgICB2YXIgY2xvc2UgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpO1xuICAgICAgICBjbG9zZS5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIF90aGlzLl9oaWRlKGNsb3NlKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvL31cbiAgICAgIH07XG4gICAgICB2YXIgZnVuY3Rpb25zID0ge1xuICAgICAgICBvcGVuOiBvcGVuU3ViLFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoX3RoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIF90aGlzLiRtZW51SXRlbXMuZmluZCgnYTpmaXJzdCcpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmIChpc1RhYikge1xuICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoX3RoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKSkgeyAvLyB2ZXJ0aWNhbCBtZW51XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcpIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgbmV4dDogY2xvc2VTdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGhvcml6b250YWwgbWVudVxuICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgbmV4dDogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICBwcmV2aW91czogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgdXA6IGNsb3NlU3ViXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7IC8vIG5vdCB0YWJzIC0+IG9uZSBzdWJcbiAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcpIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgbmV4dDogY2xvc2VTdWIsXG4gICAgICAgICAgICBwcmV2aW91czogb3BlblN1YixcbiAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcm9wZG93bk1lbnUnLCBmdW5jdGlvbnMpO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhbiBldmVudCBoYW5kbGVyIHRvIHRoZSBib2R5IHRvIGNsb3NlIGFueSBkcm9wZG93bnMgb24gYSBjbGljay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQm9keUhhbmRsZXIoKSB7XG4gICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgICRib2R5Lm9mZignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51JylcbiAgICAgICAgIC5vbignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICB2YXIgJGxpbmsgPSBfdGhpcy4kZWxlbWVudC5maW5kKGUudGFyZ2V0KTtcbiAgICAgICAgICAgaWYgKCRsaW5rLmxlbmd0aCkgeyByZXR1cm47IH1cblxuICAgICAgICAgICBfdGhpcy5faGlkZSgpO1xuICAgICAgICAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpO1xuICAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBkcm9wZG93biBwYW5lLCBhbmQgY2hlY2tzIGZvciBjb2xsaXNpb25zIGZpcnN0LlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHN1YiAtIHVsIGVsZW1lbnQgdGhhdCBpcyBhIHN1Ym1lbnUgdG8gc2hvd1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQGZpcmVzIERyb3Bkb3duTWVudSNzaG93XG4gICAqL1xuICBfc2hvdygkc3ViKSB7XG4gICAgdmFyIGlkeCA9IHRoaXMuJHRhYnMuaW5kZXgodGhpcy4kdGFicy5maWx0ZXIoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgIHJldHVybiAkKGVsKS5maW5kKCRzdWIpLmxlbmd0aCA+IDA7XG4gICAgfSkpO1xuICAgIHZhciAkc2licyA9ICRzdWIucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLnNpYmxpbmdzKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuX2hpZGUoJHNpYnMsIGlkeCk7XG4gICAgJHN1Yi5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuYWRkQ2xhc3MoJ2pzLWRyb3Bkb3duLWFjdGl2ZScpLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSlcbiAgICAgICAgLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGRDbGFzcygnaXMtYWN0aXZlJylcbiAgICAgICAgLmF0dHIoeydhcmlhLWV4cGFuZGVkJzogdHJ1ZX0pO1xuICAgIHZhciBjbGVhciA9IEZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UoJHN1YiwgbnVsbCwgdHJ1ZSk7XG4gICAgaWYgKCFjbGVhcikge1xuICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJy1yaWdodCcgOiAnLWxlZnQnLFxuICAgICAgICAgICRwYXJlbnRMaSA9ICRzdWIucGFyZW50KCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICAgICRwYXJlbnRMaS5yZW1vdmVDbGFzcyhgb3BlbnMke29sZENsYXNzfWApLmFkZENsYXNzKGBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YCk7XG4gICAgICBjbGVhciA9IEZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UoJHN1YiwgbnVsbCwgdHJ1ZSk7XG4gICAgICBpZiAoIWNsZWFyKSB7XG4gICAgICAgICRwYXJlbnRMaS5yZW1vdmVDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApLmFkZENsYXNzKCdvcGVucy1pbm5lcicpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgJHN1Yi5jc3MoJ3Zpc2liaWxpdHknLCAnJyk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHsgdGhpcy5fYWRkQm9keUhhbmRsZXIoKTsgfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG5ldyBkcm9wZG93biBwYW5lIGlzIHZpc2libGUuXG4gICAgICogQGV2ZW50IERyb3Bkb3duTWVudSNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3dubWVudScsIFskc3ViXSk7XG4gIH1cblxuICAvKipcbiAgICogSGlkZXMgYSBzaW5nbGUsIGN1cnJlbnRseSBvcGVuIGRyb3Bkb3duIHBhbmUsIGlmIHBhc3NlZCBhIHBhcmFtZXRlciwgb3RoZXJ3aXNlLCBoaWRlcyBldmVyeXRoaW5nLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gZWxlbWVudCB3aXRoIGEgc3VibWVudSB0byBoaWRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSBpbmRleCBvZiB0aGUgJHRhYnMgY29sbGVjdGlvbiB0byBoaWRlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGlkZSgkZWxlbSwgaWR4KSB7XG4gICAgdmFyICR0b0Nsb3NlO1xuICAgIGlmICgkZWxlbSAmJiAkZWxlbS5sZW5ndGgpIHtcbiAgICAgICR0b0Nsb3NlID0gJGVsZW07XG4gICAgfSBlbHNlIGlmIChpZHggIT09IHVuZGVmaW5lZCkge1xuICAgICAgJHRvQ2xvc2UgPSB0aGlzLiR0YWJzLm5vdChmdW5jdGlvbihpLCBlbCkge1xuICAgICAgICByZXR1cm4gaSA9PT0gaWR4O1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJHRvQ2xvc2UgPSB0aGlzLiRlbGVtZW50O1xuICAgIH1cbiAgICB2YXIgc29tZXRoaW5nVG9DbG9zZSA9ICR0b0Nsb3NlLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSB8fCAkdG9DbG9zZS5maW5kKCcuaXMtYWN0aXZlJykubGVuZ3RoID4gMDtcblxuICAgIGlmIChzb21ldGhpbmdUb0Nsb3NlKSB7XG4gICAgICAkdG9DbG9zZS5maW5kKCdsaS5pcy1hY3RpdmUnKS5hZGQoJHRvQ2xvc2UpLmF0dHIoe1xuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAnZGF0YS1pcy1jbGljayc6IGZhbHNlXG4gICAgICB9KS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAgICR0b0Nsb3NlLmZpbmQoJ3VsLmpzLWRyb3Bkb3duLWFjdGl2ZScpLmF0dHIoe1xuICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlXG4gICAgICB9KS5yZW1vdmVDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJyk7XG5cbiAgICAgIGlmICh0aGlzLmNoYW5nZWQgfHwgJHRvQ2xvc2UuZmluZCgnb3BlbnMtaW5uZXInKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JztcbiAgICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGQoJHRvQ2xvc2UpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGBvcGVucy1pbm5lciBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYG9wZW5zLSR7b2xkQ2xhc3N9YCk7XG4gICAgICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvcGVuIG1lbnVzIGFyZSBjbG9zZWQuXG4gICAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I2hpZGVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3dubWVudScsIFskdG9DbG9zZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm9mZignLnpmLmRyb3Bkb3dubWVudScpLnJlbW92ZUF0dHIoJ2RhdGEtaXMtY2xpY2snKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2lzLXJpZ2h0LWFycm93IGlzLWxlZnQtYXJyb3cgaXMtZG93bi1hcnJvdyBvcGVucy1yaWdodCBvcGVucy1sZWZ0IG9wZW5zLWlubmVyJyk7XG4gICAgJChkb2N1bWVudC5ib2R5KS5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRHJvcGRvd25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRGlzYWxsb3dzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgc3VibWVudXNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZUhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBhdXRvbWF0aWNhbGx5IGNsb3NlIG9uIGEgbW91c2VsZWF2ZSBldmVudCwgaWYgbm90IGNsaWNrZWQgb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvY2xvc2U6IHRydWUsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogNTAsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gb3Blbi9yZW1haW4gb3BlbiBvbiBwYXJlbnQgY2xpY2sgZXZlbnQuIEFsbG93cyBjdXJzb3IgdG8gbW92ZSBhd2F5IGZyb20gbWVudS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja09wZW46IGZhbHNlLFxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgY2xvc2luZyBhIHN1Ym1lbnUgb24gYSBtb3VzZWxlYXZlIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cblxuICBjbG9zaW5nVGltZTogNTAwLFxuICAvKipcbiAgICogUG9zaXRpb24gb2YgdGhlIG1lbnUgcmVsYXRpdmUgdG8gd2hhdCBkaXJlY3Rpb24gdGhlIHN1Ym1lbnVzIHNob3VsZCBvcGVuLiBIYW5kbGVkIGJ5IEpTLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdsZWZ0J1xuICAgKi9cbiAgYWxpZ25tZW50OiAnbGVmdCcsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gdGhlIGJvZHkgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB2ZXJ0aWNhbCBvcmllbnRlZCBtZW51cywgRm91bmRhdGlvbiBkZWZhdWx0IGlzIGB2ZXJ0aWNhbGAuIFVwZGF0ZSB0aGlzIGlmIHVzaW5nIHlvdXIgb3duIGNsYXNzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd2ZXJ0aWNhbCdcbiAgICovXG4gIHZlcnRpY2FsQ2xhc3M6ICd2ZXJ0aWNhbCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHJpZ2h0LXNpZGUgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgYWxpZ24tcmlnaHRgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnYWxpZ24tcmlnaHQnXG4gICAqL1xuICByaWdodENsYXNzOiAnYWxpZ24tcmlnaHQnLFxuICAvKipcbiAgICogQm9vbGVhbiB0byBmb3JjZSBvdmVyaWRlIHRoZSBjbGlja2luZyBvZiBsaW5rcyB0byBwZXJmb3JtIGRlZmF1bHQgYWN0aW9uLCBvbiBzZWNvbmQgdG91Y2ggZXZlbnQgZm9yIG1vYmlsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZm9yY2VGb2xsb3c6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93bk1lbnUsICdEcm9wZG93bk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEVxdWFsaXplciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZXF1YWxpemVyXG4gKi9cblxuY2xhc3MgRXF1YWxpemVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEVxdWFsaXplciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgRXF1YWxpemVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdFcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgRXF1YWxpemVyIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlcUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLWVxdWFsaXplcicpIHx8ICcnO1xuICAgIHZhciAkd2F0Y2hlZCA9IHRoaXMuJGVsZW1lbnQuZmluZChgW2RhdGEtZXF1YWxpemVyLXdhdGNoPVwiJHtlcUlkfVwiXWApO1xuXG4gICAgdGhpcy4kd2F0Y2hlZCA9ICR3YXRjaGVkLmxlbmd0aCA/ICR3YXRjaGVkIDogdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXItd2F0Y2hdJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLXJlc2l6ZScsIChlcUlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2VxJykpKTtcblxuICAgIHRoaXMuaGFzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzVW50aWwoZG9jdW1lbnQuYm9keSwgJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuX2JpbmRIYW5kbGVyID0ge1xuICAgICAgb25SZXNpemVNZUJvdW5kOiB0aGlzLl9vblJlc2l6ZU1lLmJpbmQodGhpcyksXG4gICAgICBvblBvc3RFcXVhbGl6ZWRCb3VuZDogdGhpcy5fb25Qb3N0RXF1YWxpemVkLmJpbmQodGhpcylcbiAgICB9O1xuXG4gICAgdmFyIGltZ3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgIHZhciB0b29TbWFsbDtcbiAgICBpZih0aGlzLm9wdGlvbnMuZXF1YWxpemVPbil7XG4gICAgICB0b29TbWFsbCA9IHRoaXMuX2NoZWNrTVEoKTtcbiAgICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fY2hlY2tNUS5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIH1cbiAgICBpZigodG9vU21hbGwgIT09IHVuZGVmaW5lZCAmJiB0b29TbWFsbCA9PT0gZmFsc2UpIHx8IHRvb1NtYWxsID09PSB1bmRlZmluZWQpe1xuICAgICAgaWYoaW1ncy5sZW5ndGgpe1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKGltZ3MsIHRoaXMuX3JlZmxvdy5iaW5kKHRoaXMpKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9yZWZsb3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMgaWYgdGhlIGJyZWFrcG9pbnQgaXMgdG9vIHNtYWxsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhdXNlRXZlbnRzKCkge1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKHtcbiAgICAgICcuemYuZXF1YWxpemVyJzogdGhpcy5fYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmQsXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGZ1bmN0aW9uIHRvIGhhbmRsZSAkZWxlbWVudHMgcmVzaXplbWUuemYudHJpZ2dlciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vblJlc2l6ZU1lKGUpIHtcbiAgICB0aGlzLl9yZWZsb3coKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHBvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25Qb3N0RXF1YWxpemVkKGUpIHtcbiAgICBpZihlLnRhcmdldCAhPT0gdGhpcy4kZWxlbWVudFswXSl7IHRoaXMuX3JlZmxvdygpOyB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBFcXVhbGl6ZXIuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICBpZih0aGlzLmhhc05lc3RlZCl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQpO1xuICAgIH1cbiAgICB0aGlzLmlzT24gPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBicmVha3BvaW50IHRvIHRoZSBtaW5pbXVtIHJlcXVpcmVkIHNpemUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNUSgpIHtcbiAgICB2YXIgdG9vU21hbGwgPSAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmVxdWFsaXplT24pO1xuICAgIGlmKHRvb1NtYWxsKXtcbiAgICAgIGlmKHRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgaWYoIXRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdG9vU21hbGw7XG4gIH1cblxuICAvKipcbiAgICogQSBub29wIHZlcnNpb24gZm9yIHRoZSBwbHVnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9raWxsc3dpdGNoKCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBFcXVhbGl6ZXIgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuZXF1YWxpemVPblN0YWNrKXtcbiAgICAgIGlmKHRoaXMuX2lzU3RhY2tlZCgpKXtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lcXVhbGl6ZUJ5Um93KSB7XG4gICAgICB0aGlzLmdldEhlaWdodHNCeVJvdyh0aGlzLmFwcGx5SGVpZ2h0QnlSb3cuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmdldEhlaWdodHModGhpcy5hcHBseUhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFudWFsbHkgZGV0ZXJtaW5lcyBpZiB0aGUgZmlyc3QgMiBlbGVtZW50cyBhcmUgKk5PVCogc3RhY2tlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pc1N0YWNrZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuJHdhdGNoZWRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICE9PSB0aGlzLiR3YXRjaGVkWzFdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKi9cbiAgZ2V0SGVpZ2h0cyhjYikge1xuICAgIHZhciBoZWlnaHRzID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIGhlaWdodHMucHVzaCh0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodCk7XG4gICAgfVxuICAgIGNiKGhlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICovXG4gIGdldEhlaWdodHNCeVJvdyhjYikge1xuICAgIHZhciBsYXN0RWxUb3BPZmZzZXQgPSAodGhpcy4kd2F0Y2hlZC5sZW5ndGggPyB0aGlzLiR3YXRjaGVkLmZpcnN0KCkub2Zmc2V0KCkudG9wIDogMCksXG4gICAgICAgIGdyb3VwcyA9IFtdLFxuICAgICAgICBncm91cCA9IDA7XG4gICAgLy9ncm91cCBieSBSb3dcbiAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIC8vbWF5YmUgY291bGQgdXNlIHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0VG9wXG4gICAgICB2YXIgZWxPZmZzZXRUb3AgPSAkKHRoaXMuJHdhdGNoZWRbaV0pLm9mZnNldCgpLnRvcDtcbiAgICAgIGlmIChlbE9mZnNldFRvcCE9bGFzdEVsVG9wT2Zmc2V0KSB7XG4gICAgICAgIGdyb3VwKys7XG4gICAgICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICAgICAgbGFzdEVsVG9wT2Zmc2V0PWVsT2Zmc2V0VG9wO1xuICAgICAgfVxuICAgICAgZ3JvdXBzW2dyb3VwXS5wdXNoKFt0aGlzLiR3YXRjaGVkW2ldLHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0XSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDAsIGxuID0gZ3JvdXBzLmxlbmd0aDsgaiA8IGxuOyBqKyspIHtcbiAgICAgIHZhciBoZWlnaHRzID0gJChncm91cHNbal0pLm1hcChmdW5jdGlvbigpeyByZXR1cm4gdGhpc1sxXTsgfSkuZ2V0KCk7XG4gICAgICB2YXIgbWF4ICAgICAgICAgPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAgIGdyb3Vwc1tqXS5wdXNoKG1heCk7XG4gICAgfVxuICAgIGNiKGdyb3Vwcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3RcbiAgICogQHBhcmFtIHthcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodChoZWlnaHRzKSB7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG5cbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgbWF4KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0IGJ5IHJvd1xuICAgKiBAcGFyYW0ge2FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkUm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0QnlSb3coZ3JvdXBzKSB7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgIHZhciBncm91cHNJTGVuZ3RoID0gZ3JvdXBzW2ldLmxlbmd0aCxcbiAgICAgICAgICBtYXggPSBncm91cHNbaV1bZ3JvdXBzSUxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGdyb3Vwc0lMZW5ndGg8PTIpIHtcbiAgICAgICAgJChncm91cHNbaV1bMF1bMF0pLmNzcyh7J2hlaWdodCc6J2F1dG8nfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIHBlciByb3cgYXJlIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgICBmb3IgKHZhciBqID0gMCwgbGVuSiA9IChncm91cHNJTGVuZ3RoLTEpOyBqIDwgbGVuSiA7IGorKykge1xuICAgICAgICAkKGdyb3Vwc1tpXVtqXVswXSkuY3NzKHsnaGVpZ2h0JzptYXh9KTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgcGVyIHJvdyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkVxdWFsaXplci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHdoZW4gc3RhY2tlZCBvbiBzbWFsbGVyIHNjcmVlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZXF1YWxpemVPblN0YWNrOiB0cnVlLFxuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gcm93IGJ5IHJvdy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXG4gIC8qKlxuICAgKiBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSB0aGUgcGx1Z2luIHNob3VsZCBlcXVhbGl6ZSBoZWlnaHRzIG9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBlcXVhbGl6ZU9uOiAnJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEVxdWFsaXplciwgJ0VxdWFsaXplcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmludGVyY2hhbmdlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICovXG5cbmNsYXNzIEludGVyY2hhbmdlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgSW50ZXJjaGFuZ2UuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEludGVyY2hhbmdlLmRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnJ1bGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnSW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5fYWRkQnJlYWtwb2ludHMoKTtcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBJbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLmludGVyY2hhbmdlJywgRm91bmRhdGlvbi51dGlsLnRocm90dGxlKHRoaXMuX3JlZmxvdy5iaW5kKHRoaXMpLCA1MCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEludGVyY2hhbmdlIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdmFyIG1hdGNoO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSwgYnV0IG9ubHkgc2F2ZSB0aGUgbGFzdCBtYXRjaFxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlcykge1xuICAgICAgaWYodGhpcy5ydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHRoaXMucnVsZXNbaV07XG5cbiAgICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHJ1bGUucXVlcnkpLm1hdGNoZXMpIHtcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgRm91bmRhdGlvbiBicmVha3BvaW50cyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgb2JqZWN0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCcmVha3BvaW50cygpIHtcbiAgICBmb3IgKHZhciBpIGluIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XG4gICAgICAgIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeS5uYW1lXSA9IHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIEludGVyY2hhbmdlIGVsZW1lbnQgZm9yIHRoZSBwcm92aWRlZCBtZWRpYSBxdWVyeSArIGNvbnRlbnQgcGFpcmluZ3NcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0aGF0IGlzIGFuIEludGVyY2hhbmdlIGluc3RhbmNlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gc2NlbmFyaW9zIC0gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGhhdmUgJ21xJyBhbmQgJ3BhdGgnIGtleXMgd2l0aCBjb3JyZXNwb25kaW5nIGtleXNcbiAgICovXG4gIF9nZW5lcmF0ZVJ1bGVzKGVsZW1lbnQpIHtcbiAgICB2YXIgcnVsZXNMaXN0ID0gW107XG4gICAgdmFyIHJ1bGVzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ydWxlcykge1xuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJykubWF0Y2goL1xcWy4qP1xcXS9nKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XG4gICAgICBpZihydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2ldLnNsaWNlKDEsIC0xKS5zcGxpdCgnLCAnKTtcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gcnVsZVtydWxlLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XG4gICAgICAgICAgcXVlcnkgPSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVsZXNMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBydWxlc0xpc3Q7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAtIFBhdGggdG8gdGhlIGltYWdlIG9yIEhUTUwgcGFydGlhbC5cbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAqL1xuICByZXBsYWNlKHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XG5cbiAgICAvLyBSZXBsYWNpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3NyYycsIHBhdGgpLmxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pXG4gICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXG4gICAgZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwuKGdpZnxqcGd8anBlZ3xwbmd8c3ZnfHRpZmYpKFs/I10uKik/L2kpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7ICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybCgnK3BhdGgrJyknIH0pXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBIVE1MXG4gICAgZWxzZSB7XG4gICAgICAkLmdldChwYXRoLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5odG1sKHJlc3BvbnNlKVxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgICAgICAkKHJlc3BvbnNlKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gY29udGVudCBpbiBhbiBJbnRlcmNoYW5nZSBlbGVtZW50IGlzIGRvbmUgYmVpbmcgbG9hZGVkLlxuICAgICAqIEBldmVudCBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgICAqL1xuICAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBpbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIC8vVE9ETyB0aGlzLlxuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkludGVyY2hhbmdlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgcnVsZXM6IG51bGxcbn07XG5cbkludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFUyA9IHtcbiAgJ2xhbmRzY2FwZSc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gICdwb3J0cmFpdCc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgJ3JldGluYSc6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oSW50ZXJjaGFuZ2UsICdJbnRlcmNoYW5nZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogTWFnZWxsYW4gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1hZ2VsbGFuXG4gKi9cblxuY2xhc3MgTWFnZWxsYW4ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBNYWdlbGxhbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBNYWdlbGxhbiNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIE1hZ2VsbGFuLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdNYWdlbGxhbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNYWdlbGxhbiBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ21hZ2VsbGFuJyk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiR0YXJnZXRzID0gJCgnW2RhdGEtbWFnZWxsYW4tdGFyZ2V0XScpO1xuICAgIHRoaXMuJGxpbmtzID0gdGhpcy4kZWxlbWVudC5maW5kKCdhJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdkYXRhLXJlc2l6ZSc6IGlkLFxuICAgICAgJ2RhdGEtc2Nyb2xsJzogaWQsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuICAgIHRoaXMuJGFjdGl2ZSA9ICQoKTtcbiAgICB0aGlzLnNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBhbiBhcnJheSBvZiBwaXhlbCB2YWx1ZXMgdGhhdCBhcmUgdGhlIGRlbWFyY2F0aW9uIGxpbmVzIGJldHdlZW4gbG9jYXRpb25zIG9uIHRoZSBwYWdlLlxuICAgKiBDYW4gYmUgaW52b2tlZCBpZiBuZXcgZWxlbWVudHMgYXJlIGFkZGVkIG9yIHRoZSBzaXplIG9mIGEgbG9jYXRpb24gY2hhbmdlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBjYWxjUG9pbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5LFxuICAgICAgICBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgdGhpcy5wb2ludHMgPSBbXTtcbiAgICB0aGlzLndpbkhlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgod2luZG93LmlubmVySGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCkpO1xuICAgIHRoaXMuZG9jSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heChib2R5LnNjcm9sbEhlaWdodCwgYm9keS5vZmZzZXRIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0LCBodG1sLnNjcm9sbEhlaWdodCwgaHRtbC5vZmZzZXRIZWlnaHQpKTtcblxuICAgIHRoaXMuJHRhcmdldHMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICR0YXIgPSAkKHRoaXMpLFxuICAgICAgICAgIHB0ID0gTWF0aC5yb3VuZCgkdGFyLm9mZnNldCgpLnRvcCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkKTtcbiAgICAgICR0YXIudGFyZ2V0UG9pbnQgPSBwdDtcbiAgICAgIF90aGlzLnBvaW50cy5wdXNoKHB0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIE1hZ2VsbGFuLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAkYm9keSA9ICQoJ2h0bWwsIGJvZHknKSxcbiAgICAgICAgb3B0cyA9IHtcbiAgICAgICAgICBkdXJhdGlvbjogX3RoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgICAgICBlYXNpbmc6ICAgX3RoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmdcbiAgICAgICAgfTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkJywgZnVuY3Rpb24oKXtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgICBpZihsb2NhdGlvbi5oYXNoKXtcbiAgICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyhsb2NhdGlvbi5oYXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3RoaXMuY2FsY1BvaW50cygpO1xuICAgICAgX3RoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMucmVmbG93LmJpbmQodGhpcyksXG4gICAgICAnc2Nyb2xsbWUuemYudHJpZ2dlcic6IHRoaXMuX3VwZGF0ZUFjdGl2ZS5iaW5kKHRoaXMpXG4gICAgfSkub24oJ2NsaWNrLnpmLm1hZ2VsbGFuJywgJ2FbaHJlZl49XCIjXCJdJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBhcnJpdmFsICAgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyhhcnJpdmFsKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0byBzY3JvbGwgdG8gYSBnaXZlbiBsb2NhdGlvbiBvbiB0aGUgcGFnZS5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvYyAtIGEgcHJvcGVybHkgZm9ybWF0dGVkIGpRdWVyeSBpZCBzZWxlY3Rvci4gRXhhbXBsZTogJyNmb28nXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2Nyb2xsVG9Mb2MobG9jKSB7XG4gICAgdmFyIHNjcm9sbFBvcyA9IE1hdGgucm91bmQoJChsb2MpLm9mZnNldCgpLnRvcCAtIHRoaXMub3B0aW9ucy50aHJlc2hvbGQgLyAyIC0gdGhpcy5vcHRpb25zLmJhck9mZnNldCk7XG5cbiAgICAkKCdodG1sLCBib2R5Jykuc3RvcCh0cnVlKS5hbmltYXRlKHsgc2Nyb2xsVG9wOiBzY3JvbGxQb3MgfSwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBNYWdlbGxhbiB1cG9uIERPTSBjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICByZWZsb3coKSB7XG4gICAgdGhpcy5jYWxjUG9pbnRzKCk7XG4gICAgdGhpcy5fdXBkYXRlQWN0aXZlKCk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgdmlzaWJpbGl0eSBvZiBhbiBhY3RpdmUgbG9jYXRpb24gbGluaywgYW5kIHVwZGF0ZXMgdGhlIHVybCBoYXNoIGZvciB0aGUgcGFnZSwgaWYgZGVlcExpbmtpbmcgZW5hYmxlZC5cbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBNYWdlbGxhbiN1cGRhdGVcbiAgICovXG4gIF91cGRhdGVBY3RpdmUoLypldnQsIGVsZW0sIHNjcm9sbFBvcyovKSB7XG4gICAgdmFyIHdpblBvcyA9IC8qc2Nyb2xsUG9zIHx8Ki8gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0LCAxMCksXG4gICAgICAgIGN1cklkeDtcblxuICAgIGlmKHdpblBvcyArIHRoaXMud2luSGVpZ2h0ID09PSB0aGlzLmRvY0hlaWdodCl7IGN1cklkeCA9IHRoaXMucG9pbnRzLmxlbmd0aCAtIDE7IH1cbiAgICBlbHNlIGlmKHdpblBvcyA8IHRoaXMucG9pbnRzWzBdKXsgY3VySWR4ID0gMDsgfVxuICAgIGVsc2V7XG4gICAgICB2YXIgaXNEb3duID0gdGhpcy5zY3JvbGxQb3MgPCB3aW5Qb3MsXG4gICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIGN1clZpc2libGUgPSB0aGlzLnBvaW50cy5maWx0ZXIoZnVuY3Rpb24ocCwgaSl7XG4gICAgICAgICAgICByZXR1cm4gaXNEb3duID8gcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IDw9IHdpblBvcyA6IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkIDw9IHdpblBvcztcbiAgICAgICAgICB9KTtcbiAgICAgIGN1cklkeCA9IGN1clZpc2libGUubGVuZ3RoID8gY3VyVmlzaWJsZS5sZW5ndGggLSAxIDogMDtcbiAgICB9XG5cbiAgICB0aGlzLiRhY3RpdmUucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcbiAgICB0aGlzLiRhY3RpdmUgPSB0aGlzLiRsaW5rcy5lcShjdXJJZHgpLmFkZENsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpe1xuICAgICAgdmFyIGhhc2ggPSB0aGlzLiRhY3RpdmVbMF0uZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICBpZih3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpe1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsUG9zID0gd2luUG9zO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gbWFnZWxsYW4gaXMgZmluaXNoZWQgdXBkYXRpbmcgdG8gdGhlIG5ldyBhY3RpdmUgZWxlbWVudC5cbiAgICAgKiBAZXZlbnQgTWFnZWxsYW4jdXBkYXRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cGRhdGUuemYubWFnZWxsYW4nLCBbdGhpcy4kYWN0aXZlXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgTWFnZWxsYW4gYW5kIHJlc2V0cyB0aGUgdXJsIG9mIHRoZSB3aW5kb3cuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm1hZ2VsbGFuJylcbiAgICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5hY3RpdmVDbGFzc31gKS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZShoYXNoLCAnJyk7XG4gICAgfVxuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbk1hZ2VsbGFuLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCB0aGUgYW5pbWF0ZWQgc2Nyb2xsaW5nIHNob3VsZCB0YWtlIGJldHdlZW4gbG9jYXRpb25zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cbiAgYW5pbWF0aW9uRHVyYXRpb246IDUwMCxcbiAgLyoqXG4gICAqIEFuaW1hdGlvbiBzdHlsZSB0byB1c2Ugd2hlbiBzY3JvbGxpbmcgYmV0d2VlbiBsb2NhdGlvbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2Vhc2UtaW4tb3V0J1xuICAgKi9cbiAgYW5pbWF0aW9uRWFzaW5nOiAnbGluZWFyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gdXNlIGFzIGEgbWFya2VyIGZvciBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICB0aHJlc2hvbGQ6IDUwLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGxvY2F0aW9ucyBsaW5rIG9uIHRoZSBtYWdlbGxhbiBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2FjdGl2ZSdcbiAgICovXG4gIGFjdGl2ZUNsYXNzOiAnYWN0aXZlJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgc2NyaXB0IHRvIG1hbmlwdWxhdGUgdGhlIHVybCBvZiB0aGUgY3VycmVudCBwYWdlLCBhbmQgaWYgc3VwcG9ydGVkLCBhbHRlciB0aGUgaGlzdG9yeS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBkZWVwTGlua2luZzogZmFsc2UsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIG9mZnNldCB0aGUgc2Nyb2xsIG9mIHRoZSBwYWdlIG9uIGl0ZW0gY2xpY2sgaWYgdXNpbmcgYSBzdGlja3kgbmF2IGJhci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNVxuICAgKi9cbiAgYmFyT2Zmc2V0OiAwXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihNYWdlbGxhbiwgJ01hZ2VsbGFuJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBPZmZDYW52YXMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm9mZmNhbnZhc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIE9mZkNhbnZhcyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIG9mZi1jYW52YXMgd3JhcHBlci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gaW5pdGlhbGl6ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPZmZDYW52YXMuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLiRsYXN0VHJpZ2dlciA9ICQoKTtcbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ09mZkNhbnZhcycpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBvZmYtY2FudmFzIHdyYXBwZXIgYnkgYWRkaW5nIHRoZSBleGl0IG92ZXJsYXkgKGlmIG5lZWRlZCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cbiAgICAvLyBGaW5kIHRyaWdnZXJzIHRoYXQgYWZmZWN0IHRoaXMgZWxlbWVudCBhbmQgYWRkIGFyaWEtZXhwYW5kZWQgdG8gdGhlbVxuICAgIHRoaXMuJHRyaWdnZXJzID0gJChkb2N1bWVudClcbiAgICAgIC5maW5kKCdbZGF0YS1vcGVuPVwiJytpZCsnXCJdLCBbZGF0YS1jbG9zZT1cIicraWQrJ1wiXSwgW2RhdGEtdG9nZ2xlPVwiJytpZCsnXCJdJylcbiAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJylcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuXG4gICAgLy8gQWRkIGEgY2xvc2UgdHJpZ2dlciBvdmVyIHRoZSBib2R5IGlmIG5lY2Vzc2FyeVxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICBpZiAoJCgnLmpzLW9mZi1jYW52YXMtZXhpdCcpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLiRleGl0ZXIgPSAkKCcuanMtb2ZmLWNhbnZhcy1leGl0Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZXhpdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGV4aXRlci5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2pzLW9mZi1jYW52YXMtZXhpdCcpO1xuICAgICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykuYXBwZW5kKGV4aXRlcik7XG5cbiAgICAgICAgdGhpcy4kZXhpdGVyID0gJChleGl0ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5pc1JldmVhbGVkID0gdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgfHwgbmV3IFJlZ0V4cCh0aGlzLm9wdGlvbnMucmV2ZWFsQ2xhc3MsICdnJykudGVzdCh0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5yZXZlYWxPbiA9IHRoaXMub3B0aW9ucy5yZXZlYWxPbiB8fCB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHJldmVhbC1mb3ItbWVkaXVtfHJldmVhbC1mb3ItbGFyZ2UpL2cpWzBdLnNwbGl0KCctJylbMl07XG4gICAgICB0aGlzLl9zZXRNUUNoZWNrZXIoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUpIHtcbiAgICAgIHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSA9IHBhcnNlRmxvYXQod2luZG93LmdldENvbXB1dGVkU3R5bGUoJCgnW2RhdGEtb2ZmLWNhbnZhcy13cmFwcGVyXScpWzBdKS50cmFuc2l0aW9uRHVyYXRpb24pICogMTAwMDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGFuZCB0aGUgZXhpdCBvdmVybGF5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKS5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAna2V5ZG93bi56Zi5vZmZjYW52YXMnOiB0aGlzLl9oYW5kbGVLZXlib2FyZC5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiB0aGlzLiRleGl0ZXIubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRleGl0ZXIub24oeydjbGljay56Zi5vZmZjYW52YXMnOiB0aGlzLmNsb3NlLmJpbmQodGhpcyl9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBldmVudCBsaXN0ZW5lciBmb3IgZWxlbWVudHMgdGhhdCB3aWxsIHJldmVhbCBhdCBjZXJ0YWluIGJyZWFrcG9pbnRzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldE1RQ2hlY2tlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChfdGhpcy5vcHRpb25zLnJldmVhbE9uKSkge1xuICAgICAgICBfdGhpcy5yZXZlYWwodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfdGhpcy5yZXZlYWwoZmFsc2UpO1xuICAgICAgfVxuICAgIH0pLm9uZSgnbG9hZC56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChfdGhpcy5vcHRpb25zLnJldmVhbE9uKSkge1xuICAgICAgICBfdGhpcy5yZXZlYWwodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgcmV2ZWFsaW5nL2hpZGluZyB0aGUgb2ZmLWNhbnZhcyBhdCBicmVha3BvaW50cywgbm90IHRoZSBzYW1lIGFzIG9wZW4uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSZXZlYWxlZCAtIHRydWUgaWYgZWxlbWVudCBzaG91bGQgYmUgcmV2ZWFsZWQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgcmV2ZWFsKGlzUmV2ZWFsZWQpIHtcbiAgICB2YXIgJGNsb3NlciA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJyk7XG4gICAgaWYgKGlzUmV2ZWFsZWQpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHRoaXMuaXNSZXZlYWxlZCA9IHRydWU7XG4gICAgICAvLyBpZiAoIXRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xuICAgICAgLy8gICB2YXIgc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xuICAgICAgLy8gfVxuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5pc1N0aWNreSkgeyB0aGlzLl9zdGljaygpOyB9XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZignb3Blbi56Zi50cmlnZ2VyIHRvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gICAgICBpZiAoJGNsb3Nlci5sZW5ndGgpIHsgJGNsb3Nlci5oaWRlKCk7IH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pc1JldmVhbGVkID0gZmFsc2U7XG4gICAgICAvLyBpZiAodGhpcy5vcHRpb25zLmlzU3RpY2t5IHx8ICF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAnJztcbiAgICAgIC8vICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLm9mZmNhbnZhcycpO1xuICAgICAgLy8gfVxuICAgICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKVxuICAgICAgfSk7XG4gICAgICBpZiAoJGNsb3Nlci5sZW5ndGgpIHtcbiAgICAgICAgJGNsb3Nlci5zaG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBvZmYtY2FudmFzIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSB0cmlnZ2VyIC0gZWxlbWVudCB0aGF0IHRyaWdnZXJlZCB0aGUgb2ZmLWNhbnZhcyB0byBvcGVuLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI29wZW5lZFxuICAgKi9cbiAgb3BlbihldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgICRib2R5ID0gJChkb2N1bWVudC5ib2R5KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAgICQoJ2JvZHknKS5zY3JvbGxUb3AoMCk7XG4gICAgfVxuICAgIC8vIHdpbmRvdy5wYWdlWU9mZnNldCA9IDA7XG5cbiAgICAvLyBpZiAoIXRoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xuICAgIC8vICAgdmFyIHNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgLy8gICB0aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgc2Nyb2xsUG9zICsgJ3B4KSc7XG4gICAgLy8gICBpZiAodGhpcy4kZXhpdGVyLmxlbmd0aCkge1xuICAgIC8vICAgICB0aGlzLiRleGl0ZXJbMF0uc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBzY3JvbGxQb3MgKyAncHgpJztcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxuICAgICAqIEBldmVudCBPZmZDYW52YXMjb3BlbmVkXG4gICAgICovXG4gICAgRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSwgdGhpcy4kZWxlbWVudCwgZnVuY3Rpb24oKSB7XG4gICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLXdyYXBwZXJdJykuYWRkQ2xhc3MoJ2lzLW9mZi1jYW52YXMtb3BlbiBpcy1vcGVuLScrIF90aGlzLm9wdGlvbnMucG9zaXRpb24pO1xuXG4gICAgICBfdGhpcy4kZWxlbWVudFxuICAgICAgICAuYWRkQ2xhc3MoJ2lzLW9wZW4nKVxuXG4gICAgICAvLyBpZiAoX3RoaXMub3B0aW9ucy5pc1N0aWNreSkge1xuICAgICAgLy8gICBfdGhpcy5fc3RpY2soKTtcbiAgICAgIC8vIH1cbiAgICB9KTtcblxuICAgIHRoaXMuJHRyaWdnZXJzLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAndHJ1ZScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKVxuICAgICAgICAudHJpZ2dlcignb3BlbmVkLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgIHRoaXMuJGV4aXRlci5hZGRDbGFzcygnaXMtdmlzaWJsZScpO1xuICAgIH1cblxuICAgIGlmICh0cmlnZ2VyKSB7XG4gICAgICB0aGlzLiRsYXN0VHJpZ2dlciA9IHRyaWdnZXI7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvRm9jdXMpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCh0aGlzLiRlbGVtZW50KSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLiRlbGVtZW50LmZpbmQoJ2EsIGJ1dHRvbicpLmVxKDApLmZvY3VzKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLmF0dHIoJ3RhYmluZGV4JywgJy0xJyk7XG4gICAgICB0aGlzLl90cmFwRm9jdXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJhcHMgZm9jdXMgd2l0aGluIHRoZSBvZmZjYW52YXMgb24gb3Blbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF90cmFwRm9jdXMoKSB7XG4gICAgdmFyIGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZmlyc3QgPSBmb2N1c2FibGUuZXEoMCksXG4gICAgICAgIGxhc3QgPSBmb2N1c2FibGUuZXEoLTEpO1xuXG4gICAgZm9jdXNhYmxlLm9mZignLnpmLm9mZmNhbnZhcycpLm9uKCdrZXlkb3duLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChlLndoaWNoID09PSA5IHx8IGUua2V5Y29kZSA9PT0gOSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IGxhc3RbMF0gJiYgIWUuc2hpZnRLZXkpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZmlyc3QuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS50YXJnZXQgPT09IGZpcnN0WzBdICYmIGUuc2hpZnRLZXkpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgbGFzdC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWxsb3dzIHRoZSBvZmZjYW52YXMgdG8gYXBwZWFyIHN0aWNreSB1dGlsaXppbmcgdHJhbnNsYXRlIHByb3BlcnRpZXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICAvLyBPZmZDYW52YXMucHJvdG90eXBlLl9zdGljayA9IGZ1bmN0aW9uKCkge1xuICAvLyAgIHZhciBlbFN0eWxlID0gdGhpcy4kZWxlbWVudFswXS5zdHlsZTtcbiAgLy9cbiAgLy8gICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAvLyAgICAgdmFyIGV4aXRTdHlsZSA9IHRoaXMuJGV4aXRlclswXS5zdHlsZTtcbiAgLy8gICB9XG4gIC8vXG4gIC8vICAgJCh3aW5kb3cpLm9uKCdzY3JvbGwuemYub2ZmY2FudmFzJywgZnVuY3Rpb24oZSkge1xuICAvLyAgICAgY29uc29sZS5sb2coZSk7XG4gIC8vICAgICB2YXIgcGFnZVkgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gIC8vICAgICBlbFN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgcGFnZVkgKyAncHgpJztcbiAgLy8gICAgIGlmIChleGl0U3R5bGUgIT09IHVuZGVmaW5lZCkgeyBleGl0U3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBwYWdlWSArICdweCknOyB9XG4gIC8vICAgfSk7XG4gIC8vICAgLy8gdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzdHVjay56Zi5vZmZjYW52YXMnKTtcbiAgLy8gfTtcbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYiB0byBmaXJlIGFmdGVyIGNsb3N1cmUuXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjY2xvc2VkXG4gICAqL1xuICBjbG9zZShjYikge1xuICAgIGlmICghdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyAgRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSwgdGhpcy4kZWxlbWVudCwgZnVuY3Rpb24oKSB7XG4gICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy13cmFwcGVyXScpLnJlbW92ZUNsYXNzKGBpcy1vZmYtY2FudmFzLW9wZW4gaXMtb3Blbi0ke190aGlzLm9wdGlvbnMucG9zaXRpb259YCk7XG4gICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKTtcbiAgICAgIC8vIEZvdW5kYXRpb24uX3JlZmxvdygpO1xuICAgIC8vIH0pO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgICAqIEBldmVudCBPZmZDYW52YXMjY2xvc2VkXG4gICAgICAgKi9cbiAgICAgICAgLnRyaWdnZXIoJ2Nsb3NlZC56Zi5vZmZjYW52YXMnKTtcbiAgICAvLyBpZiAoX3RoaXMub3B0aW9ucy5pc1N0aWNreSB8fCAhX3RoaXMub3B0aW9ucy5mb3JjZVRvcCkge1xuICAgIC8vICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgX3RoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgLy8gICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi5vZmZjYW52YXMnKTtcbiAgICAvLyAgIH0sIHRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSk7XG4gICAgLy8gfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICB0aGlzLiRleGl0ZXIucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMpIHtcbiAgICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbiBvciBjbG9zZWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSB0cmlnZ2VyIC0gZWxlbWVudCB0aGF0IHRyaWdnZXJlZCB0aGUgb2ZmLWNhbnZhcyB0byBvcGVuLlxuICAgKi9cbiAgdG9nZ2xlKGV2ZW50LCB0cmlnZ2VyKSB7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSkge1xuICAgICAgdGhpcy5jbG9zZShldmVudCwgdHJpZ2dlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5vcGVuKGV2ZW50LCB0cmlnZ2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBrZXlib2FyZCBpbnB1dCB3aGVuIGRldGVjdGVkLiBXaGVuIHRoZSBlc2NhcGUga2V5IGlzIHByZXNzZWQsIHRoZSBvZmYtY2FudmFzIG1lbnUgY2xvc2VzLCBhbmQgZm9jdXMgaXMgcmVzdG9yZWQgdG8gdGhlIGVsZW1lbnQgdGhhdCBvcGVuZWQgdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hhbmRsZUtleWJvYXJkKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LndoaWNoICE9PSAyNykgcmV0dXJuO1xuXG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgdGhpcy4kbGFzdFRyaWdnZXIuZm9jdXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgb2ZmY2FudmFzIHBsdWdpbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm9mZmNhbnZhcycpO1xuICAgIHRoaXMuJGV4aXRlci5vZmYoJy56Zi5vZmZjYW52YXMnKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5PZmZDYW52YXMuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgdXNlciB0byBjbGljayBvdXRzaWRlIG9mIHRoZSBtZW51IHRvIGNsb3NlIGl0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcblxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgaW4gbXMgdGhlIG9wZW4gYW5kIGNsb3NlIHRyYW5zaXRpb24gcmVxdWlyZXMuIElmIG5vbmUgc2VsZWN0ZWQsIHB1bGxzIGZyb20gYm9keSBzdHlsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIHRyYW5zaXRpb25UaW1lOiAwLFxuXG4gIC8qKlxuICAgKiBEaXJlY3Rpb24gdGhlIG9mZmNhbnZhcyBvcGVucyBmcm9tLiBEZXRlcm1pbmVzIGNsYXNzIGFwcGxpZWQgdG8gYm9keS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBsZWZ0XG4gICAqL1xuICBwb3NpdGlvbjogJ2xlZnQnLFxuXG4gIC8qKlxuICAgKiBGb3JjZSB0aGUgcGFnZSB0byBzY3JvbGwgdG8gdG9wIG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZm9yY2VUb3A6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFsbG93IHRoZSBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4gZm9yIGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGlzUmV2ZWFsZWQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IGF0IHdoaWNoIHRvIHJldmVhbC4gSlMgd2lsbCB1c2UgYSBSZWdFeHAgdG8gdGFyZ2V0IHN0YW5kYXJkIGNsYXNzZXMsIGlmIGNoYW5naW5nIGNsYXNzbmFtZXMsIHBhc3MgeW91ciBjbGFzcyB3aXRoIHRoZSBgcmV2ZWFsQ2xhc3NgIG9wdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSByZXZlYWwtZm9yLWxhcmdlXG4gICAqL1xuICByZXZlYWxPbjogbnVsbCxcblxuICAvKipcbiAgICogRm9yY2UgZm9jdXMgdG8gdGhlIG9mZmNhbnZhcyBvbiBvcGVuLiBJZiB0cnVlLCB3aWxsIGZvY3VzIHRoZSBvcGVuaW5nIHRyaWdnZXIgb24gY2xvc2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB1c2VkIHRvIGZvcmNlIGFuIG9mZmNhbnZhcyB0byByZW1haW4gb3Blbi4gRm91bmRhdGlvbiBkZWZhdWx0cyBmb3IgdGhpcyBhcmUgYHJldmVhbC1mb3ItbGFyZ2VgICYgYHJldmVhbC1mb3ItbWVkaXVtYC5cbiAgICogQG9wdGlvblxuICAgKiBUT0RPIGltcHJvdmUgdGhlIHJlZ2V4IHRlc3RpbmcgZm9yIHRoaXMuXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcbiAgICovXG4gIHJldmVhbENsYXNzOiAncmV2ZWFsLWZvci0nLFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBvcHRpb25hbCBmb2N1cyB0cmFwcGluZyB3aGVuIG9wZW5pbmcgYW4gb2ZmY2FudmFzLiBTZXRzIHRhYmluZGV4IG9mIFtkYXRhLW9mZi1jYW52YXMtY29udGVudF0gdG8gLTEgZm9yIGFjY2Vzc2liaWxpdHkgcHVycG9zZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgdHJhcEZvY3VzOiBmYWxzZVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT2ZmQ2FudmFzLCAnT2ZmQ2FudmFzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBPcmJpdCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ub3JiaXRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBPcmJpdCB7XG4gIC8qKlxuICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb3JiaXQgY2Fyb3VzZWwuXG4gICogQGNsYXNzXG4gICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBPcmJpdCBDYXJvdXNlbC5cbiAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPcmJpdC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT3JiaXQnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdPcmJpdCcsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdwcmV2aW91cydcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zLCBzZXR0aW5nIGF0dHJpYnV0ZXMsIGFuZCBzdGFydGluZyB0aGUgYW5pbWF0aW9uLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5jb250YWluZXJDbGFzc31gKTtcbiAgICB0aGlzLiRzbGlkZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApO1xuICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKSxcbiAgICBpbml0QWN0aXZlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpO1xuXG4gICAgaWYgKCFpbml0QWN0aXZlLmxlbmd0aCkge1xuICAgICAgdGhpcy4kc2xpZGVzLmVxKDApLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5hZGRDbGFzcygnbm8tbW90aW9udWknKTtcbiAgICB9XG5cbiAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmVwYXJlRm9yT3JiaXQoKTsvL2hlaGVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgIHRoaXMuX2xvYWRCdWxsZXRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmIHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmdlb1N5bmMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHsgLy8gYWxsb3cgd3JhcHBlciB0byBiZSBmb2N1c2FibGUgdG8gZW5hYmxlIGFycm93IG5hdmlnYXRpb25cbiAgICAgIHRoaXMuJHdyYXBwZXIuYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDcmVhdGVzIGEgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgYnVsbGV0cywgaWYgdGhleSBhcmUgYmVpbmcgdXNlZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfbG9hZEJ1bGxldHMoKSB7XG4gICAgdGhpcy4kYnVsbGV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKS5maW5kKCdidXR0b24nKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgYSBgdGltZXJgIG9iamVjdCBvbiB0aGUgb3JiaXQsIGFuZCBzdGFydHMgdGhlIGNvdW50ZXIgZm9yIHRoZSBuZXh0IHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBnZW9TeW5jKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50aW1lciA9IG5ldyBGb3VuZGF0aW9uLlRpbWVyKFxuICAgICAgdGhpcy4kZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgZHVyYXRpb246IHRoaXMub3B0aW9ucy50aW1lckRlbGF5LFxuICAgICAgICBpbmZpbml0ZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB0aGlzLnRpbWVyLnN0YXJ0KCk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHdyYXBwZXIgYW5kIHNsaWRlIGhlaWdodHMgZm9yIHRoZSBvcmJpdC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfcHJlcGFyZUZvck9yYml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fc2V0V3JhcHBlckhlaWdodChmdW5jdGlvbihtYXgpe1xuICAgICAgX3RoaXMuX3NldFNsaWRlSGVpZ2h0KG1heCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBDYWx1bGF0ZXMgdGhlIGhlaWdodCBvZiBlYWNoIHNsaWRlIGluIHRoZSBjb2xsZWN0aW9uLCBhbmQgdXNlcyB0aGUgdGFsbGVzdCBvbmUgZm9yIHRoZSB3cmFwcGVyIGhlaWdodC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gYSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIHdoZW4gY29tcGxldGUuXG4gICovXG4gIF9zZXRXcmFwcGVySGVpZ2h0KGNiKSB7Ly9yZXdyaXRlIHRoaXMgdG8gYGZvcmAgbG9vcFxuICAgIHZhciBtYXggPSAwLCB0ZW1wLCBjb3VudGVyID0gMDtcblxuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXNsaWRlJywgY291bnRlcik7XG5cbiAgICAgIGlmIChjb3VudGVyKSB7Ly9pZiBub3QgdGhlIGZpcnN0IHNsaWRlLCBzZXQgY3NzIHBvc2l0aW9uIGFuZCBkaXNwbGF5IHByb3BlcnR5XG4gICAgICAgICQodGhpcykuY3NzKHsncG9zaXRpb24nOiAncmVsYXRpdmUnLCAnZGlzcGxheSc6ICdub25lJ30pO1xuICAgICAgfVxuICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XG4gICAgICBjb3VudGVyKys7XG4gICAgfSk7XG5cbiAgICBpZiAoY291bnRlciA9PT0gdGhpcy4kc2xpZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy4kd3JhcHBlci5jc3MoeydoZWlnaHQnOiBtYXh9KTsgLy9vbmx5IGNoYW5nZSB0aGUgd3JhcHBlciBoZWlnaHQgcHJvcGVydHkgb25jZS5cbiAgICAgIGNiKG1heCk7IC8vZmlyZSBjYWxsYmFjayB3aXRoIG1heCBoZWlnaHQgZGltZW5zaW9uLlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgdGhlIG1heC1oZWlnaHQgb2YgZWFjaCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfc2V0U2xpZGVIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLmNzcygnbWF4LWhlaWdodCcsIGhlaWdodCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBiYXNpY2FsbHkgZXZlcnl0aGluZyB3aXRoaW4gdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAvLyoqTm93IHVzaW5nIGN1c3RvbSBldmVudCAtIHRoYW5rcyB0bzoqKlxuICAgIC8vKiogICAgICBZb2hhaSBBcmFyYXQgb2YgVG9yb250byAgICAgICoqXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zd2lwZSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub2ZmKCdzd2lwZWxlZnQuemYub3JiaXQgc3dpcGVyaWdodC56Zi5vcmJpdCcpXG4gICAgICAgIC5vbignc3dpcGVsZWZ0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICB9KS5vbignc3dpcGVyaWdodC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub24oJ2NsaWNrLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJywgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICAgIF90aGlzLnRpbWVyW190aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gJ3BhdXNlJyA6ICdzdGFydCddKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF1c2VPbkhvdmVyKSB7XG4gICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2VlbnRlci56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMudGltZXIucGF1c2UoKTtcbiAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSkge1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5zdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubmF2QnV0dG9ucykge1xuICAgICAgICB2YXIgJGNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubmV4dENsYXNzfSwgLiR7dGhpcy5vcHRpb25zLnByZXZDbGFzc31gKTtcbiAgICAgICAgJGNvbnRyb2xzLmF0dHIoJ3RhYmluZGV4JywgMClcbiAgICAgICAgLy9hbHNvIG5lZWQgdG8gaGFuZGxlIGVudGVyL3JldHVybiBhbmQgc3BhY2ViYXIga2V5IHByZXNzZXNcbiAgICAgICAgLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuXHQgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSgkKHRoaXMpLmhhc0NsYXNzKF90aGlzLm9wdGlvbnMubmV4dENsYXNzKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgdGhpcy4kYnVsbGV0cy5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoL2lzLWFjdGl2ZS9nLnRlc3QodGhpcy5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfS8vaWYgdGhpcyBpcyBhY3RpdmUsIGtpY2sgb3V0IG9mIGZ1bmN0aW9uLlxuICAgICAgICAgIHZhciBpZHggPSAkKHRoaXMpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgbHRyID0gaWR4ID4gX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgICRzbGlkZSA9IF90aGlzLiRzbGlkZXMuZXEoaWR4KTtcblxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGx0ciwgJHNsaWRlLCBpZHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy4kd3JhcHBlci5hZGQodGhpcy4kYnVsbGV0cykub24oJ2tleWRvd24uemYub3JiaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ09yYml0Jywge1xuICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHsgLy8gaWYgYnVsbGV0IGlzIGZvY3VzZWQsIG1ha2Ugc3VyZSBmb2N1cyBtb3Zlc1xuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKF90aGlzLiRidWxsZXRzKSkge1xuICAgICAgICAgICAgICBfdGhpcy4kYnVsbGV0cy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDaGFuZ2VzIHRoZSBjdXJyZW50IHNsaWRlIHRvIGEgbmV3IG9uZS5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzTFRSIC0gZmxhZyBpZiB0aGUgc2xpZGUgc2hvdWxkIG1vdmUgbGVmdCB0byByaWdodC5cbiAgKiBAcGFyYW0ge2pRdWVyeX0gY2hvc2VuU2xpZGUgLSB0aGUgalF1ZXJ5IGVsZW1lbnQgb2YgdGhlIHNsaWRlIHRvIHNob3cgbmV4dCwgaWYgb25lIGlzIHNlbGVjdGVkLlxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIG5ldyBzbGlkZSBpbiBpdHMgY29sbGVjdGlvbiwgaWYgb25lIGNob3Nlbi5cbiAgKiBAZmlyZXMgT3JiaXQjc2xpZGVjaGFuZ2VcbiAgKi9cbiAgY2hhbmdlU2xpZGUoaXNMVFIsIGNob3NlblNsaWRlLCBpZHgpIHtcbiAgICB2YXIgJGN1clNsaWRlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLmVxKDApO1xuXG4gICAgaWYgKC9tdWkvZy50ZXN0KCRjdXJTbGlkZVswXS5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfSAvL2lmIHRoZSBzbGlkZSBpcyBjdXJyZW50bHkgYW5pbWF0aW5nLCBraWNrIG91dCBvZiB0aGUgZnVuY3Rpb25cblxuICAgIHZhciAkZmlyc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5maXJzdCgpLFxuICAgICRsYXN0U2xpZGUgPSB0aGlzLiRzbGlkZXMubGFzdCgpLFxuICAgIGRpckluID0gaXNMVFIgPyAnUmlnaHQnIDogJ0xlZnQnLFxuICAgIGRpck91dCA9IGlzTFRSID8gJ0xlZnQnIDogJ1JpZ2h0JyxcbiAgICBfdGhpcyA9IHRoaXMsXG4gICAgJG5ld1NsaWRlO1xuXG4gICAgaWYgKCFjaG9zZW5TbGlkZSkgeyAvL21vc3Qgb2YgdGhlIHRpbWUsIHRoaXMgd2lsbCBiZSBhdXRvIHBsYXllZCBvciBjbGlja2VkIGZyb20gdGhlIG5hdkJ1dHRvbnMuXG4gICAgICAkbmV3U2xpZGUgPSBpc0xUUiA/IC8vaWYgd3JhcHBpbmcgZW5hYmxlZCwgY2hlY2sgdG8gc2VlIGlmIHRoZXJlIGlzIGEgYG5leHRgIG9yIGBwcmV2YCBzaWJsaW5nLCBpZiBub3QsIHNlbGVjdCB0aGUgZmlyc3Qgb3IgbGFzdCBzbGlkZSB0byBmaWxsIGluLiBpZiB3cmFwcGluZyBub3QgZW5hYmxlZCwgYXR0ZW1wdCB0byBzZWxlY3QgYG5leHRgIG9yIGBwcmV2YCwgaWYgdGhlcmUncyBub3RoaW5nIHRoZXJlLCB0aGUgZnVuY3Rpb24gd2lsbCBraWNrIG91dCBvbiBuZXh0IHN0ZXAuIENSQVpZIE5FU1RFRCBURVJOQVJJRVMhISEhIVxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGZpcnN0U2xpZGUgOiAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpLy9waWNrIG5leHQgc2xpZGUgaWYgbW92aW5nIGxlZnQgdG8gcmlnaHRcbiAgICAgIDpcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRsYXN0U2xpZGUgOiAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkpOy8vcGljayBwcmV2IHNsaWRlIGlmIG1vdmluZyByaWdodCB0byBsZWZ0XG4gICAgfSBlbHNlIHtcbiAgICAgICRuZXdTbGlkZSA9IGNob3NlblNsaWRlO1xuICAgIH1cblxuICAgIGlmICgkbmV3U2xpZGUubGVuZ3RoKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgaWR4ID0gaWR4IHx8IHRoaXMuJHNsaWRlcy5pbmRleCgkbmV3U2xpZGUpOyAvL2dyYWIgaW5kZXggdG8gdXBkYXRlIGJ1bGxldHNcbiAgICAgICAgdGhpcy5fdXBkYXRlQnVsbGV0cyhpZHgpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnVzZU1VSSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4oXG4gICAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5jc3Moeydwb3NpdGlvbic6ICdhYnNvbHV0ZScsICd0b3AnOiAwfSksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltSW5Gcm9tJHtkaXJJbn1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJG5ld1NsaWRlLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnYmxvY2snfSlcbiAgICAgICAgICAgIC5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoXG4gICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1PdXRUbyR7ZGlyT3V0fWBdLFxuICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQXR0cignYXJpYS1saXZlJyk7XG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICFfdGhpcy50aW1lci5pc1BhdXNlZCl7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vZG8gc3R1ZmY/XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpLmhpZGUoKTtcbiAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJykuc2hvdygpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICF0aGlzLnRpbWVyLmlzUGF1c2VkKSB7XG4gICAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAvKipcbiAgICAqIFRyaWdnZXJzIHdoZW4gdGhlIHNsaWRlIGhhcyBmaW5pc2hlZCBhbmltYXRpbmcgaW4uXG4gICAgKiBAZXZlbnQgT3JiaXQjc2xpZGVjaGFuZ2VcbiAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFskbmV3U2xpZGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBVcGRhdGVzIHRoZSBhY3RpdmUgc3RhdGUgb2YgdGhlIGJ1bGxldHMsIGlmIGRpc3BsYXllZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2xpZGUuXG4gICovXG4gIF91cGRhdGVCdWxsZXRzKGlkeCkge1xuICAgIHZhciAkb2xkQnVsbGV0ID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApXG4gICAgLmZpbmQoJy5pcy1hY3RpdmUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJykuYmx1cigpLFxuICAgIHNwYW4gPSAkb2xkQnVsbGV0LmZpbmQoJ3NwYW46bGFzdCcpLmRldGFjaCgpLFxuICAgICRuZXdCdWxsZXQgPSB0aGlzLiRidWxsZXRzLmVxKGlkeCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmFwcGVuZChzcGFuKTtcbiAgfVxuXG4gIC8qKlxuICAqIERlc3Ryb3lzIHRoZSBjYXJvdXNlbCBhbmQgaGlkZXMgdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5vcmJpdCcpLmZpbmQoJyonKS5vZmYoJy56Zi5vcmJpdCcpLmVuZCgpLmhpZGUoKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT3JiaXQuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBsb29rIGZvciBhbmQgbG9hZEJ1bGxldHMuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYnVsbGV0czogdHJ1ZSxcbiAgLyoqXG4gICogVGVsbHMgdGhlIEpTIHRvIGFwcGx5IGV2ZW50IGxpc3RlbmVycyB0byBuYXYgYnV0dG9uc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIG5hdkJ1dHRvbnM6IHRydWUsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLWluLXJpZ2h0J1xuICAqL1xuICBhbmltSW5Gcm9tUmlnaHQ6ICdzbGlkZS1pbi1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLW91dC1yaWdodCdcbiAgKi9cbiAgYW5pbU91dFRvUmlnaHQ6ICdzbGlkZS1vdXQtcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1sZWZ0J1xuICAqXG4gICovXG4gIGFuaW1JbkZyb21MZWZ0OiAnc2xpZGUtaW4tbGVmdCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLW91dC1sZWZ0J1xuICAqL1xuICBhbmltT3V0VG9MZWZ0OiAnc2xpZGUtb3V0LWxlZnQnLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYXV0b21hdGljYWxseSBhbmltYXRlIG9uIHBhZ2UgbG9hZC5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBhdXRvUGxheTogdHJ1ZSxcbiAgLyoqXG4gICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCBiZXR3ZWVuIHNsaWRlIHRyYW5zaXRpb25zXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIDUwMDBcbiAgKi9cbiAgdGltZXJEZWxheTogNTAwMCxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGluZmluaXRlbHkgbG9vcCB0aHJvdWdoIHRoZSBzbGlkZXNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBpbmZpbml0ZVdyYXA6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyB0aGUgT3JiaXQgc2xpZGVzIHRvIGJpbmQgdG8gc3dpcGUgZXZlbnRzIGZvciBtb2JpbGUsIHJlcXVpcmVzIGFuIGFkZGl0aW9uYWwgdXRpbCBsaWJyYXJ5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgc3dpcGU6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyB0aGUgdGltaW5nIGZ1bmN0aW9uIHRvIHBhdXNlIGFuaW1hdGlvbiBvbiBob3Zlci5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBwYXVzZU9uSG92ZXI6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBiaW5kIGtleWJvYXJkIGV2ZW50cyB0byB0aGUgc2xpZGVyLCB0byBhbmltYXRlIGZyYW1lcyB3aXRoIGFycm93IGtleXNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBhY2Nlc3NpYmxlOiB0cnVlLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBjb250YWluZXIgb2YgT3JiaXRcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LWNvbnRhaW5lcidcbiAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdvcmJpdC1jb250YWluZXInLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIGluZGl2aWR1YWwgc2xpZGVzLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtc2xpZGUnXG4gICovXG4gIHNsaWRlQ2xhc3M6ICdvcmJpdC1zbGlkZScsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGJ1bGxldCBjb250YWluZXIuIFlvdSdyZSB3ZWxjb21lLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtYnVsbGV0cydcbiAgKi9cbiAgYm94T2ZCdWxsZXRzOiAnb3JiaXQtYnVsbGV0cycsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBuZXh0YCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LW5leHQnXG4gICovXG4gIG5leHRDbGFzczogJ29yYml0LW5leHQnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgcHJldmlvdXNgIG5hdmlnYXRpb24gYnV0dG9uLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtcHJldmlvdXMnXG4gICovXG4gIHByZXZDbGFzczogJ29yYml0LXByZXZpb3VzJyxcbiAgLyoqXG4gICogQm9vbGVhbiB0byBmbGFnIHRoZSBqcyB0byB1c2UgbW90aW9uIHVpIGNsYXNzZXMgb3Igbm90LiBEZWZhdWx0IHRvIHRydWUgZm9yIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5LlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHVzZU1VSTogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9yYml0LCAnT3JiaXQnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVNZW51IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuZHJpbGxkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmRyb3Bkb3duLW1lbnVcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgcmVzcG9uc2l2ZSBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVNZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLW1lbnUnKTtcbiAgICB0aGlzLmN1cnJlbnRNcSA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbnVsbDtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVNZW51Jyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1lbnUgYnkgcGFyc2luZyB0aGUgY2xhc3NlcyBmcm9tIHRoZSAnZGF0YS1SZXNwb25zaXZlTWVudScgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIC8vIFRoZSBmaXJzdCB0aW1lIGFuIEludGVyY2hhbmdlIHBsdWdpbiBpcyBpbml0aWFsaXplZCwgdGhpcy5ydWxlcyBpcyBjb252ZXJ0ZWQgZnJvbSBhIHN0cmluZyBvZiBcImNsYXNzZXNcIiB0byBhbiBvYmplY3Qgb2YgcnVsZXNcbiAgICBpZiAodHlwZW9mIHRoaXMucnVsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgcnVsZXNUcmVlID0ge307XG5cbiAgICAgIC8vIFBhcnNlIHJ1bGVzIGZyb20gXCJjbGFzc2VzXCIgcHVsbGVkIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgIGxldCBydWxlcyA9IHRoaXMucnVsZXMuc3BsaXQoJyAnKTtcblxuICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGV2ZXJ5IHJ1bGUgZm91bmRcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHJ1bGUgPSBydWxlc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBsZXQgcnVsZVNpemUgPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzBdIDogJ3NtYWxsJztcbiAgICAgICAgbGV0IHJ1bGVQbHVnaW4gPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzFdIDogcnVsZVswXTtcblxuICAgICAgICBpZiAoTWVudVBsdWdpbnNbcnVsZVBsdWdpbl0gIT09IG51bGwpIHtcbiAgICAgICAgICBydWxlc1RyZWVbcnVsZVNpemVdID0gTWVudVBsdWdpbnNbcnVsZVBsdWdpbl07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ydWxlcyA9IHJ1bGVzVHJlZTtcbiAgICB9XG5cbiAgICBpZiAoISQuaXNFbXB0eU9iamVjdCh0aGlzLnJ1bGVzKSkge1xuICAgICAgdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgTWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfSk7XG4gICAgLy8gJCh3aW5kb3cpLm9uKCdyZXNpemUuemYuUmVzcG9uc2l2ZU1lbnUnLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIC8vIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBzY3JlZW4gd2lkdGggYWdhaW5zdCBhdmFpbGFibGUgbWVkaWEgcXVlcmllcy4gSWYgdGhlIG1lZGlhIHF1ZXJ5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIHBsdWdpbiBuZWVkZWQgaGFzIGNoYW5nZWQsIHRoZSBwbHVnaW5zIHdpbGwgc3dhcCBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xuICAgIHZhciBtYXRjaGVkTXEsIF90aGlzID0gdGhpcztcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlIGFuZCBmaW5kIHRoZSBsYXN0IG1hdGNoaW5nIHJ1bGVcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3Qoa2V5KSkge1xuICAgICAgICBtYXRjaGVkTXEgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxuICAgIGlmICghbWF0Y2hlZE1xKSByZXR1cm47XG5cbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4gaW5zdGFuY2VvZiB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKSByZXR1cm47XG5cbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXG4gICAgJC5lYWNoKE1lbnVQbHVnaW5zLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh2YWx1ZS5jc3NDbGFzcyk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIENTUyBjbGFzcyBmb3IgdGhlIG5ldyBwbHVnaW5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIG5ldyBwbHVnaW5cbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG5ldyB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKHRoaXMuJGVsZW1lbnQsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgdGhlIGN1cnJlbnQgcGx1Z2luIG9uIHRoaXMgZWxlbWVudCwgYXMgd2VsbCBhcyB0aGUgd2luZG93IHJlc2l6ZSBoYW5kbGVyIHRoYXQgc3dpdGNoZXMgdGhlIHBsdWdpbnMgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICAkKHdpbmRvdykub2ZmKCcuemYuUmVzcG9uc2l2ZU1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZU1lbnUuZGVmYXVsdHMgPSB7fTtcblxuLy8gVGhlIHBsdWdpbiBtYXRjaGVzIHRoZSBwbHVnaW4gY2xhc3NlcyB3aXRoIHRoZXNlIHBsdWdpbiBpbnN0YW5jZXMuXG52YXIgTWVudVBsdWdpbnMgPSB7XG4gIGRyb3Bkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcm9wZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcm9wZG93bi1tZW51J10gfHwgbnVsbFxuICB9LFxuIGRyaWxsZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJpbGxkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2RyaWxsZG93biddIHx8IG51bGxcbiAgfSxcbiAgYWNjb3JkaW9uOiB7XG4gICAgY3NzQ2xhc3M6ICdhY2NvcmRpb24tbWVudScsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydhY2NvcmRpb24tbWVudSddIHx8IG51bGxcbiAgfVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVNZW51LCAnUmVzcG9uc2l2ZU1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVUb2dnbGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVUb2dnbGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUYWIgQmFyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIHRhYiBiYXIgZnVuY3Rpb25hbGl0eSB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYiBiYXIgYnkgZmluZGluZyB0aGUgdGFyZ2V0IGVsZW1lbnQsIHRvZ2dsaW5nIGVsZW1lbnQsIGFuZCBydW5uaW5nIHVwZGF0ZSgpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciB0YXJnZXRJRCA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS10b2dnbGUnKTtcbiAgICBpZiAoIXRhcmdldElEKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdZb3VyIHRhYiBiYXIgbmVlZHMgYW4gSUQgb2YgYSBNZW51IGFzIHRoZSB2YWx1ZSBvZiBkYXRhLXRhYi1iYXIuJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdGFyZ2V0TWVudSA9ICQoYCMke3RhcmdldElEfWApO1xuICAgIHRoaXMuJHRvZ2dsZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRvZ2dsZV0nKTtcblxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgdGFiIGJhciB0byB3b3JrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuX3VwZGF0ZU1xSGFuZGxlciA9IHRoaXMuX3VwZGF0ZS5iaW5kKHRoaXMpO1xuICAgIFxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcblxuICAgIHRoaXMuJHRvZ2dsZXIub24oJ2NsaWNrLnpmLnJlc3BvbnNpdmVUb2dnbGUnLCB0aGlzLnRvZ2dsZU1lbnUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5IHRvIGRldGVybWluZSBpZiB0aGUgdGFiIGJhciBzaG91bGQgYmUgdmlzaWJsZSBvciBoaWRkZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZSgpIHtcbiAgICAvLyBNb2JpbGVcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LmhpZGUoKTtcbiAgICB9XG5cbiAgICAvLyBEZXNrdG9wXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUoKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuc2hvdygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyLiBUaGUgdG9nZ2xlIG9ubHkgaGFwcGVucyBpZiB0aGUgc2NyZWVuIGlzIHNtYWxsIGVub3VnaCB0byBhbGxvdyBpdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICovXG4gIHRvZ2dsZU1lbnUoKSB7ICAgXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUudG9nZ2xlKDApO1xuXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cbiAgICAgICAqIEBldmVudCBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB9XG4gIH07XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB0aGlzLiR0b2dnbGVyLm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICBcbiAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuICAgIFxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGJyZWFrcG9pbnQgYWZ0ZXIgd2hpY2ggdGhlIG1lbnUgaXMgYWx3YXlzIHNob3duLCBhbmQgdGhlIHRhYiBiYXIgaXMgaGlkZGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBoaWRlRm9yOiAnbWVkaXVtJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVUb2dnbGUsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXZlYWwgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJldmVhbFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb24gaWYgdXNpbmcgYW5pbWF0aW9uc1xuICovXG5cbmNsYXNzIFJldmVhbCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFJldmVhbC5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgZm9yIHRoZSBtb2RhbC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXZlYWwuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXZlYWwnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdSZXZlYWwnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAndGFiX2ZvcndhcmQnLFxuICAgICAgJ1NISUZUX1RBQic6ICd0YWJfYmFja3dhcmQnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZGFsIGJ5IGFkZGluZyB0aGUgb3ZlcmxheSBhbmQgY2xvc2UgYnV0dG9ucywgKGlmIHNlbGVjdGVkKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FjaGVkID0ge21xOiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuY3VycmVudH07XG4gICAgdGhpcy5pc01vYmlsZSA9IG1vYmlsZVNuaWZmKCk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApLmxlbmd0aCA/ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkgOiAkKGBbZGF0YS10b2dnbGU9XCIke3RoaXMuaWR9XCJdYCk7XG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xuICAgICAgJ2FyaWEtY29udHJvbHMnOiB0aGlzLmlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuIHx8IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Z1bGwnKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gPSB0cnVlO1xuICAgICAgdGhpcy5vcHRpb25zLm92ZXJsYXkgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5ICYmICF0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5ID0gdGhpcy5fbWFrZU92ZXJsYXkodGhpcy5pZCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAnZGlhbG9nJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgJ2RhdGEteWV0aS1ib3gnOiB0aGlzLmlkLFxuICAgICAgICAnZGF0YS1yZXNpemUnOiB0aGlzLmlkXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKHRoaXMuJG92ZXJsYXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKCQoJ2JvZHknKSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd3aXRob3V0LW92ZXJsYXknKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluayAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCBgIyR7dGhpcy5pZH1gKSkge1xuICAgICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5yZXZlYWwnLCB0aGlzLm9wZW4uYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb3ZlcmxheSBkaXYgdG8gZGlzcGxheSBiZWhpbmQgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21ha2VPdmVybGF5KGlkKSB7XG4gICAgdmFyICRvdmVybGF5ID0gJCgnPGRpdj48L2Rpdj4nKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3JldmVhbC1vdmVybGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgcmV0dXJuICRvdmVybGF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgcG9zaXRpb24gb2YgbW9kYWxcbiAgICogVE9ETzogIEZpZ3VyZSBvdXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBjYWNoZSB0aGVzZSB2YWx1ZXMgb3IgaWYgaXQgZG9lc24ndCBtYXR0ZXJcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVQb3NpdGlvbigpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKTtcbiAgICB2YXIgb3V0ZXJXaWR0aCA9ICQod2luZG93KS53aWR0aCgpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLiRlbGVtZW50Lm91dGVySGVpZ2h0KCk7XG4gICAgdmFyIG91dGVySGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIHZhciBsZWZ0LCB0b3A7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCgob3V0ZXJXaWR0aCAtIHdpZHRoKSAvIDIsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy5oT2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudk9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBpZiAoaGVpZ2h0ID4gb3V0ZXJIZWlnaHQpIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoTWF0aC5taW4oMTAwLCBvdXRlckhlaWdodCAvIDEwKSwgMTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoKG91dGVySGVpZ2h0IC0gaGVpZ2h0KSAvIDQsIDEwKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdG9wID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLnZPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe3RvcDogdG9wICsgJ3B4J30pO1xuICAgIC8vIG9ubHkgd29ycnkgYWJvdXQgbGVmdCBpZiB3ZSBkb24ndCBoYXZlIGFuIG92ZXJsYXkgb3Igd2UgaGF2ZWEgIGhvcml6b250YWwgb2Zmc2V0LFxuICAgIC8vIG90aGVyd2lzZSB3ZSdyZSBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZVxuICAgIGlmKCF0aGlzLiRvdmVybGF5IHx8ICh0aGlzLm9wdGlvbnMuaE9mZnNldCAhPT0gJ2F1dG8nKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe2xlZnQ6IGxlZnQgKyAncHgnfSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bWFyZ2luOiAnMHB4J30pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiAoZXZlbnQsICRlbGVtZW50KSA9PiB7XG4gICAgICAgIGlmICgoZXZlbnQudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSkgfHxcbiAgICAgICAgICAgICgkKGV2ZW50LnRhcmdldCkucGFyZW50cygnW2RhdGEtY2xvc2FibGVdJylbMF0gPT09ICRlbGVtZW50KSkgeyAvLyBvbmx5IGNsb3NlIHJldmVhbCB3aGVuIGl0J3MgZXhwbGljaXRseSBjYWxsZWRcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZS5hcHBseSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMgfHwgZS53aGljaCA9PT0gMzIpIHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmIHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5Lm9mZignLnpmLnJldmVhbCcpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxuICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICQod2luZG93KS5vbihgcG9wc3RhdGUuemYucmV2ZWFsOiR7dGhpcy5pZH1gLCB0aGlzLl9oYW5kbGVTdGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBtb2RhbCBtZXRob2RzIG9uIGJhY2svZm9yd2FyZCBidXR0b24gY2xpY2tzIG9yIGFueSBvdGhlciBldmVudCB0aGF0IHRyaWdnZXJzIHBvcHN0YXRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hhbmRsZVN0YXRlKGUpIHtcbiAgICBpZih3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCAnIycgKyB0aGlzLmlkKSAmJiAhdGhpcy5pc0FjdGl2ZSl7IHRoaXMub3BlbigpOyB9XG4gICAgZWxzZXsgdGhpcy5jbG9zZSgpOyB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgbW9kYWwgY29udHJvbGxlZCBieSBgdGhpcy4kYW5jaG9yYCwgYW5kIGNsb3NlcyBhbGwgb3RoZXJzIGJ5IGRlZmF1bHQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlbWVcbiAgICogQGZpcmVzIFJldmVhbCNvcGVuXG4gICAqL1xuICBvcGVuKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgIHZhciBoYXNoID0gYCMke3RoaXMuaWR9YDtcblxuICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSkge1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBNYWtlIGVsZW1lbnRzIGludmlzaWJsZSwgYnV0IHJlbW92ZSBkaXNwbGF5OiBub25lIHNvIHdlIGNhbiBnZXQgc2l6ZSBhbmQgcG9zaXRpb25pbmdcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICdoaWRkZW4nIH0pXG4gICAgICAgIC5zaG93KClcbiAgICAgICAgLnNjcm9sbFRvcCgwKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nfSkuc2hvdygpO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuaGlkZSgpXG4gICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnJyB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICcnfSkuaGlkZSgpO1xuICAgICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZmFzdCcpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2Zhc3QnKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnc2xvdycpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ3Nsb3cnKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpcGxlT3BlbmVkKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgbW9kYWwgb3BlbnMuXG4gICAgICAgKiBDbG9zZXMgYW55IG90aGVyIG1vZGFscyB0aGF0IGFyZSBjdXJyZW50bHkgb3BlblxuICAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZW1lXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5yZXZlYWwnLCB0aGlzLmlkKTtcbiAgICB9XG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiByZXZlYWxcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkluKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgZnVuY3Rpb24gYWZ0ZXJBbmltYXRpb25Gb2N1cygpe1xuICAgICAgICBfdGhpcy4kZWxlbWVudFxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mb2N1cygpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdmb2N1cycpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRvdmVybGF5LCAnZmFkZS1pbicpO1xuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25JbiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgICBhZnRlckFuaW1hdGlvbkZvY3VzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiByZXZlYWxcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LnNob3coMCk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3codGhpcy5vcHRpb25zLnNob3dEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGFjY2Vzc2liaWxpdHlcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgfSlcbiAgICAgIC5mb2N1cygpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQuXG4gICAgICogQGV2ZW50IFJldmVhbCNvcGVuXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvcGVuLnpmLnJldmVhbCcpO1xuXG4gICAgaWYgKHRoaXMuaXNNb2JpbGUpIHtcbiAgICAgIHRoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAkKCdodG1sLCBib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgIH1cblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fZXh0cmFIYW5kbGVycygpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXh0cmEgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBib2R5IGFuZCB3aW5kb3cgaWYgbmVjZXNzYXJ5LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V4dHJhSGFuZGxlcnMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmICF0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbikge1xuICAgICAgJCgnYm9keScpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxuICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnUmV2ZWFsJywge1xuICAgICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBsb2NrIGZvY3VzIHdpdGhpbiBtb2RhbCB3aGlsZSB0YWJiaW5nXG4gICAgdGhpcy4kZWxlbWVudC5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyk7XG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnUmV2ZWFsJywge1xuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKSkpIHsgLy8gbGVmdCBtb2RhbCBkb3dud2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gZmlyc3QgZWxlbWVudFxuICAgICAgICAgICAgX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoMCkuZm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMubGVuZ3RoID09PSAwKSB7IC8vIG5vIGZvY3VzYWJsZSBlbGVtZW50cyBpbnNpZGUgdGhlIG1vZGFsIGF0IGFsbCwgcHJldmVudCB0YWJiaW5nIGluIGdlbmVyYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFiX2JhY2t3YXJkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoMCkpIHx8IF90aGlzLiRlbGVtZW50LmlzKCc6Zm9jdXMnKSkgeyAvLyBsZWZ0IG1vZGFsIHVwd2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gbGFzdCBlbGVtZW50XG4gICAgICAgICAgICBfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgtMSkuZm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMubGVuZ3RoID09PSAwKSB7IC8vIG5vIGZvY3VzYWJsZSBlbGVtZW50cyBpbnNpZGUgdGhlIG1vZGFsIGF0IGFsbCwgcHJldmVudCB0YWJiaW5nIGluIGdlbmVyYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpKSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgLy8gc2V0IGZvY3VzIGJhY2sgdG8gYW5jaG9yIGlmIGNsb3NlIGJ1dHRvbiBoYXMgYmVlbiBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0LmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzKSkgeyAvLyBkb250J3QgdHJpZ2dlciBpZiBhY3VhbCBlbGVtZW50IGhhcyBmb2N1cyAoaS5lLiBpbnB1dHMsIGxpbmtzLCAuLi4pXG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZWRcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGlmICghdGhpcy5pc0FjdGl2ZSB8fCAhdGhpcy4kZWxlbWVudC5pcygnOnZpc2libGUnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiBoaWRpbmdcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kb3ZlcmxheSwgJ2ZhZGUtb3V0JywgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKDAsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUodGhpcy5vcHRpb25zLmhpZGVEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gQ29uZGl0aW9uYWxzIHRvIHJlbW92ZSBleHRyYSBldmVudCBsaXN0ZW5lcnMgYWRkZWQgb24gb3BlblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgICQoJ2JvZHknKS5vZmYoJ2NsaWNrLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuXG4gICAgZnVuY3Rpb24gZmluaXNoVXAoKSB7XG4gICAgICBpZiAoX3RoaXMuaXNNb2JpbGUpIHtcbiAgICAgICAgJCgnaHRtbCwgYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgICBpZihfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcykge1xuICAgICAgICAgICQoJ2JvZHknKS5zY3JvbGxUb3AoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpO1xuICAgICAgICAgIF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgIH1cblxuICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgLyoqXG4gICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGlzIGRvbmUgY2xvc2luZy5cbiAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZWRcbiAgICAgICovXG4gICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBSZXNldHMgdGhlIG1vZGFsIGNvbnRlbnRcbiAgICAqIFRoaXMgcHJldmVudHMgYSBydW5uaW5nIHZpZGVvIHRvIGtlZXAgZ29pbmcgaW4gdGhlIGJhY2tncm91bmRcbiAgICAqL1xuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzZXRPbkNsb3NlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lmh0bWwodGhpcy4kZWxlbWVudC5odG1sKCkpO1xuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICBpZiAod2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKSB7XG4gICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoXCJcIiwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgfVxuICAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZWQgc3RhdGUgb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmFwcGVuZFRvKCQoJ2JvZHknKSk7IC8vIG1vdmUgJGVsZW1lbnQgb3V0c2lkZSBvZiAkb3ZlcmxheSB0byBwcmV2ZW50IGVycm9yIHVucmVnaXN0ZXJQbHVnaW4oKVxuICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKCkub2ZmKCkucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpLm9mZigpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56ZicpO1xuICAgICQod2luZG93KS5vZmYoYC56Zi5yZXZlYWw6JHt0aGlzLmlkfWApO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5SZXZlYWwuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbGlkZS1pbi1sZWZ0J1xuICAgKi9cbiAgYW5pbWF0aW9uSW46ICcnLFxuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LXJpZ2h0J1xuICAgKi9cbiAgYW5pbWF0aW9uT3V0OiAnJyxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBkZWxheSB0aGUgb3BlbmluZyBvZiBhIG1vZGFsIGFmdGVyIGEgY2xpY2sgaWYgbm8gYW5pbWF0aW9uIHVzZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIHNob3dEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBkZWxheSB0aGUgY2xvc2luZyBvZiBhIG1vZGFsIGFmdGVyIGEgY2xpY2sgaWYgbm8gYW5pbWF0aW9uIHVzZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIGhpZGVEZWxheTogMCxcbiAgLyoqXG4gICAqIEFsbG93cyBhIGNsaWNrIG9uIHRoZSBib2R5L292ZXJsYXkgdG8gY2xvc2UgdGhlIG1vZGFsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gY2xvc2UgaWYgdGhlIHVzZXIgcHJlc3NlcyB0aGUgYEVTQ0FQRWAga2V5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25Fc2M6IHRydWUsXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBhbGxvd3MgbXVsdGlwbGUgbW9kYWxzIHRvIGJlIGRpc3BsYXllZCBhdCBvbmNlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtdWx0aXBsZU9wZW5lZDogZmFsc2UsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggZG93biBmcm9tIHRoZSB0b3Agb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBhdXRvXG4gICAqL1xuICB2T2Zmc2V0OiAnYXV0bycsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggaW4gZnJvbSB0aGUgc2lkZSBvZiB0aGUgc2NyZWVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGF1dG9cbiAgICovXG4gIGhPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYmUgZnVsbHNjcmVlbiwgY29tcGxldGVseSBibG9ja2luZyBvdXQgdGhlIHJlc3Qgb2YgdGhlIHZpZXcuIEpTIGNoZWNrcyBmb3IgdGhpcyBhcyB3ZWxsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBmdWxsU2NyZWVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBlcmNlbnRhZ2Ugb2Ygc2NyZWVuIGhlaWdodCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggdXAgZnJvbSB0aGUgYm90dG9tIG9mIHRoZSB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBidG1PZmZzZXRQY3Q6IDEwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBnZW5lcmF0ZSBhbiBvdmVybGF5IGRpdiwgd2hpY2ggd2lsbCBjb3ZlciB0aGUgdmlldyB3aGVuIG1vZGFsIG9wZW5zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIG92ZXJsYXk6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIHJlbW92ZSBhbmQgcmVpbmplY3QgbWFya3VwIG9uIGNsb3NlLiBTaG91bGQgYmUgdHJ1ZSBpZiB1c2luZyB2aWRlbyBlbGVtZW50cyB3L28gdXNpbmcgcHJvdmlkZXIncyBhcGksIG90aGVyd2lzZSwgdmlkZW9zIHdpbGwgY29udGludWUgdG8gcGxheSBpbiB0aGUgYmFja2dyb3VuZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgcmVzZXRPbkNsb3NlOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYWx0ZXIgdGhlIHVybCBvbiBvcGVuL2Nsb3NlLCBhbmQgYWxsb3dzIHRoZSB1c2Ugb2YgdGhlIGBiYWNrYCBidXR0b24gdG8gY2xvc2UgbW9kYWxzLiBBTFNPLCBhbGxvd3MgYSBtb2RhbCB0byBhdXRvLW1hbmlhY2FsbHkgb3BlbiBvbiBwYWdlIGxvYWQgSUYgdGhlIGhhc2ggPT09IHRoZSBtb2RhbCdzIHVzZXItc2V0IGlkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkZWVwTGluazogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXZlYWwsICdSZXZlYWwnKTtcblxuZnVuY3Rpb24gaVBob25lU25pZmYoKSB7XG4gIHJldHVybiAvaVAoYWR8aG9uZXxvZCkuKk9TLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gYW5kcm9pZFNuaWZmKCkge1xuICByZXR1cm4gL0FuZHJvaWQvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBtb2JpbGVTbmlmZigpIHtcbiAgcmV0dXJuIGlQaG9uZVNuaWZmKCkgfHwgYW5kcm9pZFNuaWZmKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTbGlkZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnNsaWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBTbGlkZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTbGlkZXIuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1NsaWRlcicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1NsaWRlcicsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19VUCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19ET1dOJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfUklHSFQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19VUCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0RPV04nOiAnZGVjcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19MRUZUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlsaXplcyB0aGUgcGx1Z2luIGJ5IHJlYWRpbmcvc2V0dGluZyBhdHRyaWJ1dGVzLCBjcmVhdGluZyBjb2xsZWN0aW9ucyBhbmQgc2V0dGluZyB0aGUgaW5pdGlhbCBwb3NpdGlvbiBvZiB0aGUgaGFuZGxlKHMpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuICAgIHRoaXMuaGFuZGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKTtcblxuICAgIHRoaXMuJGhhbmRsZSA9IHRoaXMuaGFuZGxlcy5lcSgwKTtcbiAgICB0aGlzLiRpbnB1dCA9IHRoaXMuaW5wdXRzLmxlbmd0aCA/IHRoaXMuaW5wdXRzLmVxKDApIDogJChgIyR7dGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcbiAgICB0aGlzLiRmaWxsID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zbGlkZXItZmlsbF0nKS5jc3ModGhpcy5vcHRpb25zLnZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLCAwKTtcblxuICAgIHZhciBpc0RibCA9IGZhbHNlLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kaXNhYmxlZCB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbnB1dHMgPSAkKCkuYWRkKHRoaXMuJGlucHV0KTtcbiAgICAgIHRoaXMub3B0aW9ucy5iaW5kaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fc2V0SW5pdEF0dHIoMCk7XG4gICAgdGhpcy5fZXZlbnRzKHRoaXMuJGhhbmRsZSk7XG5cbiAgICBpZiAodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kaGFuZGxlMiA9IHRoaXMuaGFuZGxlcy5lcSgxKTtcbiAgICAgIHRoaXMuJGlucHV0MiA9IHRoaXMuaW5wdXRzLmxlbmd0aCA+IDEgPyB0aGlzLmlucHV0cy5lcSgxKSA6ICQoYCMke3RoaXMuJGhhbmRsZTIuYXR0cignYXJpYS1jb250cm9scycpfWApO1xuXG4gICAgICBpZiAoIXRoaXMuaW5wdXRzWzFdKSB7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gdGhpcy5pbnB1dHMuYWRkKHRoaXMuJGlucHV0Mik7XG4gICAgICB9XG4gICAgICBpc0RibCA9IHRydWU7XG5cbiAgICAgIHRoaXMuX3NldEhhbmRsZVBvcyh0aGlzLiRoYW5kbGUsIHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQsIHRydWUsIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoX3RoaXMuJGhhbmRsZTIsIF90aGlzLm9wdGlvbnMuaW5pdGlhbEVuZCwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIC8vIHRoaXMuJGhhbmRsZS50cmlnZ2VySGFuZGxlcignY2xpY2suemYuc2xpZGVyJyk7XG4gICAgICB0aGlzLl9zZXRJbml0QXR0cigxKTtcbiAgICAgIHRoaXMuX2V2ZW50cyh0aGlzLiRoYW5kbGUyKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRGJsKSB7XG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgcG9zaXRpb24gb2YgdGhlIHNlbGVjdGVkIGhhbmRsZSBhbmQgZmlsbCBiYXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhuZGwgLSB0aGUgc2VsZWN0ZWQgaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsb2NhdGlvbiAtIGZsb2F0aW5nIHBvaW50IGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgdmFsdWVzIG9mIHRoZSBzbGlkZXIgYmFyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgb24gY29tcGxldGlvbi5cbiAgICogQGZpcmVzIFNsaWRlciNtb3ZlZFxuICAgKiBAZmlyZXMgU2xpZGVyI2NoYW5nZWRcbiAgICovXG4gIF9zZXRIYW5kbGVQb3MoJGhuZGwsIGxvY2F0aW9uLCBub0ludmVydCwgY2IpIHtcbiAgICAvLyBkb24ndCBtb3ZlIGlmIHRoZSBzbGlkZXIgaGFzIGJlZW4gZGlzYWJsZWQgc2luY2UgaXRzIGluaXRpYWxpemF0aW9uXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vbWlnaHQgbmVlZCB0byBhbHRlciB0aGF0IHNsaWdodGx5IGZvciBiYXJzIHRoYXQgd2lsbCBoYXZlIG9kZCBudW1iZXIgc2VsZWN0aW9ucy5cbiAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24pOy8vb24gaW5wdXQgY2hhbmdlIGV2ZW50cywgY29udmVydCBzdHJpbmcgdG8gbnVtYmVyLi4uZ3J1bWJsZS5cblxuICAgIC8vIHByZXZlbnQgc2xpZGVyIGZyb20gcnVubmluZyBvdXQgb2YgYm91bmRzLCBpZiB2YWx1ZSBleGNlZWRzIHRoZSBsaW1pdHMgc2V0IHRocm91Z2ggb3B0aW9ucywgb3ZlcnJpZGUgdGhlIHZhbHVlIHRvIG1pbi9tYXhcbiAgICBpZiAobG9jYXRpb24gPCB0aGlzLm9wdGlvbnMuc3RhcnQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuc3RhcnQ7IH1cbiAgICBlbHNlIGlmIChsb2NhdGlvbiA+IHRoaXMub3B0aW9ucy5lbmQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kOyB9XG5cbiAgICB2YXIgaXNEYmwgPSB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQ7XG5cbiAgICBpZiAoaXNEYmwpIHsgLy90aGlzIGJsb2NrIGlzIHRvIHByZXZlbnQgMiBoYW5kbGVzIGZyb20gY3Jvc3NpbmcgZWFjaG90aGVyLiBDb3VsZC9zaG91bGQgYmUgaW1wcm92ZWQuXG4gICAgICBpZiAodGhpcy5oYW5kbGVzLmluZGV4KCRobmRsKSA9PT0gMCkge1xuICAgICAgICB2YXIgaDJWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZTIuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA+PSBoMlZhbCA/IGgyVmFsIC0gdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoMVZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgICAgIGxvY2F0aW9uID0gbG9jYXRpb24gPD0gaDFWYWwgPyBoMVZhbCArIHRoaXMub3B0aW9ucy5zdGVwIDogbG9jYXRpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy90aGlzIGlzIGZvciBzaW5nbGUtaGFuZGxlZCB2ZXJ0aWNhbCBzbGlkZXJzLCBpdCBhZGp1c3RzIHRoZSB2YWx1ZSB0byBhY2NvdW50IGZvciB0aGUgc2xpZGVyIGJlaW5nIFwidXBzaWRlLWRvd25cIlxuICAgIC8vZm9yIGNsaWNrIGFuZCBkcmFnIGV2ZW50cywgaXQncyB3ZWlyZCBkdWUgdG8gdGhlIHNjYWxlKC0xLCAxKSBjc3MgcHJvcGVydHlcbiAgICBpZiAodGhpcy5vcHRpb25zLnZlcnRpY2FsICYmICFub0ludmVydCkge1xuICAgICAgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kIC0gbG9jYXRpb247XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdmVydCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcbiAgICAgICAgaE9yVyA9IHZlcnQgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIGxPclQgPSB2ZXJ0ID8gJ3RvcCcgOiAnbGVmdCcsXG4gICAgICAgIGhhbmRsZURpbSA9ICRobmRsWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxuICAgICAgICBlbGVtRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtoT3JXXSxcbiAgICAgICAgLy9wZXJjZW50YWdlIG9mIGJhciBtaW4vbWF4IHZhbHVlIGJhc2VkIG9uIGNsaWNrIG9yIGRyYWcgcG9pbnRcbiAgICAgICAgcGN0T2ZCYXIgPSBwZXJjZW50KGxvY2F0aW9uIC0gdGhpcy5vcHRpb25zLnN0YXJ0LCB0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KS50b0ZpeGVkKDIpLFxuICAgICAgICAvL251bWJlciBvZiBhY3R1YWwgcGl4ZWxzIHRvIHNoaWZ0IHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIG9idGFpbmVkIGFib3ZlXG4gICAgICAgIHB4VG9Nb3ZlID0gKGVsZW1EaW0gLSBoYW5kbGVEaW0pICogcGN0T2ZCYXIsXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgdG8gc2hpZnQgdGhlIGhhbmRsZVxuICAgICAgICBtb3ZlbWVudCA9IChwZXJjZW50KHB4VG9Nb3ZlLCBlbGVtRGltKSAqIDEwMCkudG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCk7XG4gICAgICAgIC8vZml4aW5nIHRoZSBkZWNpbWFsIHZhbHVlIGZvciB0aGUgbG9jYXRpb24gbnVtYmVyLCBpcyBwYXNzZWQgdG8gb3RoZXIgbWV0aG9kcyBhcyBhIGZpeGVkIGZsb2F0aW5nLXBvaW50IHZhbHVlXG4gICAgICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbi50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKSk7XG4gICAgICAgIC8vIGRlY2xhcmUgZW1wdHkgb2JqZWN0IGZvciBjc3MgYWRqdXN0bWVudHMsIG9ubHkgdXNlZCB3aXRoIDIgaGFuZGxlZC1zbGlkZXJzXG4gICAgdmFyIGNzcyA9IHt9O1xuXG4gICAgdGhpcy5fc2V0VmFsdWVzKCRobmRsLCBsb2NhdGlvbik7XG5cbiAgICAvLyBUT0RPIHVwZGF0ZSB0byBjYWxjdWxhdGUgYmFzZWQgb24gdmFsdWVzIHNldCB0byByZXNwZWN0aXZlIGlucHV0cz8/XG4gICAgaWYgKGlzRGJsKSB7XG4gICAgICB2YXIgaXNMZWZ0SG5kbCA9IHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDAsXG4gICAgICAgICAgLy9lbXB0eSB2YXJpYWJsZSwgd2lsbCBiZSB1c2VkIGZvciBtaW4taGVpZ2h0L3dpZHRoIGZvciBmaWxsIGJhclxuICAgICAgICAgIGRpbSxcbiAgICAgICAgICAvL3BlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgY29tcGFyZWQgdG8gdGhlIHNsaWRlciBiYXJcbiAgICAgICAgICBoYW5kbGVQY3QgPSAgfn4ocGVyY2VudChoYW5kbGVEaW0sIGVsZW1EaW0pICogMTAwKTtcbiAgICAgIC8vaWYgbGVmdCBoYW5kbGUsIHRoZSBtYXRoIGlzIHNsaWdodGx5IGRpZmZlcmVudCB0aGFuIGlmIGl0J3MgdGhlIHJpZ2h0IGhhbmRsZSwgYW5kIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBuZWVkcyB0byBiZSBjaGFuZ2VkIGZvciB0aGUgZmlsbCBiYXJcbiAgICAgIGlmIChpc0xlZnRIbmRsKSB7XG4gICAgICAgIC8vbGVmdCBvciB0b3AgcGVyY2VudGFnZSB2YWx1ZSB0byBhcHBseSB0byB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGNzc1tsT3JUXSA9IGAke21vdmVtZW50fSVgO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci5cbiAgICAgICAgZGltID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyWzBdLnN0eWxlW2xPclRdKSAtIG1vdmVtZW50ICsgaGFuZGxlUGN0O1xuICAgICAgICAvL3RoaXMgY2FsbGJhY2sgaXMgbmVjZXNzYXJ5IHRvIHByZXZlbnQgZXJyb3JzIGFuZCBhbGxvdyB0aGUgcHJvcGVyIHBsYWNlbWVudCBhbmQgaW5pdGlhbGl6YXRpb24gb2YgYSAyLWhhbmRsZWQgc2xpZGVyXG4gICAgICAgIC8vcGx1cywgaXQgbWVhbnMgd2UgZG9uJ3QgY2FyZSBpZiAnZGltJyBpc05hTiBvbiBpbml0LCBpdCB3b24ndCBiZSBpbiB0aGUgZnV0dXJlLlxuICAgICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH0vL3RoaXMgaXMgb25seSBuZWVkZWQgZm9yIHRoZSBpbml0aWFsaXphdGlvbiBvZiAyIGhhbmRsZWQgc2xpZGVyc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9qdXN0IGNhY2hpbmcgdGhlIHZhbHVlIG9mIHRoZSBsZWZ0L2JvdHRvbSBoYW5kbGUncyBsZWZ0L3RvcCBwcm9wZXJ0eVxuICAgICAgICB2YXIgaGFuZGxlUG9zID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGVbMF0uc3R5bGVbbE9yVF0pO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci4gVXNlIGlzTmFOIHRvIHByZXZlbnQgZmFsc2UgcG9zaXRpdmVzIGZvciBudW1iZXJzIDw9IDBcbiAgICAgICAgLy9iYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvZiBtb3ZlbWVudCBvZiB0aGUgaGFuZGxlIGJlaW5nIG1hbmlwdWxhdGVkLCBsZXNzIHRoZSBvcHBvc2luZyBoYW5kbGUncyBsZWZ0L3RvcCBwb3NpdGlvbiwgcGx1cyB0aGUgcGVyY2VudGFnZSB3L2ggb2YgdGhlIGhhbmRsZSBpdHNlbGZcbiAgICAgICAgZGltID0gbW92ZW1lbnQgLSAoaXNOYU4oaGFuZGxlUG9zKSA/IHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQvKCh0aGlzLm9wdGlvbnMuZW5kLXRoaXMub3B0aW9ucy5zdGFydCkvMTAwKSA6IGhhbmRsZVBvcykgKyBoYW5kbGVQY3Q7XG4gICAgICB9XG4gICAgICAvLyBhc3NpZ24gdGhlIG1pbi1oZWlnaHQvd2lkdGggdG8gb3VyIGNzcyBvYmplY3RcbiAgICAgIGNzc1tgbWluLSR7aE9yV31gXSA9IGAke2RpbX0lYDtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uZSgnZmluaXNoZWQuemYuYW5pbWF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGFuZGxlIGlzIGRvbmUgbW92aW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU2xpZGVyI21vdmVkXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdtb3ZlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgIC8vYmVjYXVzZSB3ZSBkb24ndCBrbm93IGV4YWN0bHkgaG93IHRoZSBoYW5kbGUgd2lsbCBiZSBtb3ZlZCwgY2hlY2sgdGhlIGFtb3VudCBvZiB0aW1lIGl0IHNob3VsZCB0YWtlIHRvIG1vdmUuXG4gICAgdmFyIG1vdmVUaW1lID0gdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpID8gMTAwMC82MCA6IHRoaXMub3B0aW9ucy5tb3ZlVGltZTtcblxuICAgIEZvdW5kYXRpb24uTW92ZShtb3ZlVGltZSwgJGhuZGwsIGZ1bmN0aW9uKCkge1xuICAgICAgLy9hZGp1c3RpbmcgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG9mIHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIGNhbGN1bGF0ZWQgYWJvdmVcbiAgICAgICRobmRsLmNzcyhsT3JULCBgJHttb3ZlbWVudH0lYCk7XG5cbiAgICAgIGlmICghX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xuICAgICAgICAvL2lmIHNpbmdsZS1oYW5kbGVkLCBhIHNpbXBsZSBtZXRob2QgdG8gZXhwYW5kIHRoZSBmaWxsIGJhclxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoaE9yVywgYCR7cGN0T2ZCYXIgKiAxMDB9JWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9vdGhlcndpc2UsIHVzZSB0aGUgY3NzIG9iamVjdCB3ZSBjcmVhdGVkIGFib3ZlXG4gICAgICAgIF90aGlzLiRmaWxsLmNzcyhjc3MpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdmFsdWUgaGFzIG5vdCBiZWVuIGNoYW5nZSBmb3IgYSBnaXZlbiB0aW1lLlxuICAgICAqIEBldmVudCBTbGlkZXIjY2hhbmdlZFxuICAgICAqL1xuICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICB9LCBfdGhpcy5vcHRpb25zLmNoYW5nZWREZWxheSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5pdGlhbCBhdHRyaWJ1dGUgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSBpbmRleCBvZiB0aGUgY3VycmVudCBoYW5kbGUvaW5wdXQgdG8gdXNlLlxuICAgKi9cbiAgX3NldEluaXRBdHRyKGlkeCkge1xuICAgIHZhciBpZCA9IHRoaXMuaW5wdXRzLmVxKGlkeCkuYXR0cignaWQnKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzbGlkZXInKTtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoe1xuICAgICAgJ2lkJzogaWQsXG4gICAgICAnbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXG4gICAgICAnc3RlcCc6IHRoaXMub3B0aW9ucy5zdGVwXG4gICAgfSk7XG4gICAgdGhpcy5oYW5kbGVzLmVxKGlkeCkuYXR0cih7XG4gICAgICAncm9sZSc6ICdzbGlkZXInLFxuICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICdhcmlhLXZhbHVlbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdhcmlhLXZhbHVlbWluJzogdGhpcy5vcHRpb25zLnN0YXJ0LFxuICAgICAgJ2FyaWEtdmFsdWVub3cnOiBpZHggPT09IDAgPyB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IDogdGhpcy5vcHRpb25zLmluaXRpYWxFbmQsXG4gICAgICAnYXJpYS1vcmllbnRhdGlvbic6IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCcsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5wdXQgYW5kIGBhcmlhLXZhbHVlbm93YCB2YWx1ZXMgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgLSBmbG9hdGluZyBwb2ludCBvZiB0aGUgbmV3IHZhbHVlLlxuICAgKi9cbiAgX3NldFZhbHVlcygkaGFuZGxlLCB2YWwpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gdGhpcy5oYW5kbGVzLmluZGV4KCRoYW5kbGUpIDogMDtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbCh2YWwpO1xuICAgICRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycsIHZhbCk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBldmVudHMgb24gdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBDYWxjdWxhdGVzIHRoZSBuZXcgbG9jYXRpb24gb2YgdGhlIGN1cnJlbnQgaGFuZGxlLlxuICAgKiBJZiB0aGVyZSBhcmUgdHdvIGhhbmRsZXMgYW5kIHRoZSBiYXIgd2FzIGNsaWNrZWQsIGl0IGRldGVybWluZXMgd2hpY2ggaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZSAtIHRoZSBgZXZlbnRgIG9iamVjdCBwYXNzZWQgZnJvbSB0aGUgbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGNhbGN1bGF0ZSBmb3IsIGlmIHNlbGVjdGVkLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgbnVtYmVyIGZvciB0aGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAqIFRPRE8gY2xlYW4gdGhpcyB1cCwgdGhlcmUncyBhIGxvdCBvZiByZXBlYXRlZCBjb2RlIGJldHdlZW4gdGhpcyBhbmQgdGhlIF9zZXRIYW5kbGVQb3MgZm4uXG4gICAqL1xuICBfaGFuZGxlRXZlbnQoZSwgJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIHZhbHVlLCBoYXNWYWw7XG4gICAgaWYgKCF2YWwpIHsvL2NsaWNrIG9yIGRyYWcgZXZlbnRzXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIHZlcnRpY2FsID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICAgIHBhcmFtID0gdmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgICAgZGlyZWN0aW9uID0gdmVydGljYWwgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgICBldmVudE9mZnNldCA9IHZlcnRpY2FsID8gZS5wYWdlWSA6IGUucGFnZVgsXG4gICAgICAgICAgaGFsZk9mSGFuZGxlID0gdGhpcy4kaGFuZGxlWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3BhcmFtXSAvIDIsXG4gICAgICAgICAgYmFyRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0sXG4gICAgICAgICAgd2luZG93U2Nyb2xsID0gdmVydGljYWwgPyAkKHdpbmRvdykuc2Nyb2xsVG9wKCkgOiAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXG5cbiAgICAgIHZhciBlbGVtT2Zmc2V0ID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKVtkaXJlY3Rpb25dO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHMgZW11bGF0ZWQgYnkgdGhlIHRvdWNoIHV0aWwgZ2l2ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBzY3JlZW4sIGFkZCB3aW5kb3cuc2Nyb2xsIHRvIGV2ZW50IGNvb3JkaW5hdGVzLi4uXG4gICAgICAvLyBiZXN0IHdheSB0byBndWVzcyB0aGlzIGlzIHNpbXVsYXRlZCBpcyBpZiBjbGllbnRZID09IHBhZ2VZXG4gICAgICBpZiAoZS5jbGllbnRZID09PSBlLnBhZ2VZKSB7IGV2ZW50T2Zmc2V0ID0gZXZlbnRPZmZzZXQgKyB3aW5kb3dTY3JvbGw7IH1cbiAgICAgIHZhciBldmVudEZyb21CYXIgPSBldmVudE9mZnNldCAtIGVsZW1PZmZzZXQ7XG4gICAgICB2YXIgYmFyWFk7XG4gICAgICBpZiAoZXZlbnRGcm9tQmFyIDwgMCkge1xuICAgICAgICBiYXJYWSA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RnJvbUJhciA+IGJhckRpbSkge1xuICAgICAgICBiYXJYWSA9IGJhckRpbTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhclhZID0gZXZlbnRGcm9tQmFyO1xuICAgICAgfVxuICAgICAgb2Zmc2V0UGN0ID0gcGVyY2VudChiYXJYWSwgYmFyRGltKTtcblxuICAgICAgdmFsdWUgPSAodGhpcy5vcHRpb25zLmVuZCAtIHRoaXMub3B0aW9ucy5zdGFydCkgKiBvZmZzZXRQY3QgKyB0aGlzLm9wdGlvbnMuc3RhcnQ7XG5cbiAgICAgIC8vIHR1cm4gZXZlcnl0aGluZyBhcm91bmQgZm9yIFJUTCwgeWF5IG1hdGghXG4gICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSAmJiAhdGhpcy5vcHRpb25zLnZlcnRpY2FsKSB7dmFsdWUgPSB0aGlzLm9wdGlvbnMuZW5kIC0gdmFsdWU7fVxuXG4gICAgICB2YWx1ZSA9IF90aGlzLl9hZGp1c3RWYWx1ZShudWxsLCB2YWx1ZSk7XG4gICAgICAvL2Jvb2xlYW4gZmxhZyBmb3IgdGhlIHNldEhhbmRsZVBvcyBmbiwgc3BlY2lmaWNhbGx5IGZvciB2ZXJ0aWNhbCBzbGlkZXJzXG4gICAgICBoYXNWYWwgPSBmYWxzZTtcblxuICAgICAgaWYgKCEkaGFuZGxlKSB7Ly9maWd1cmUgb3V0IHdoaWNoIGhhbmRsZSBpdCBpcywgcGFzcyBpdCB0byB0aGUgbmV4dCBmdW5jdGlvbi5cbiAgICAgICAgdmFyIGZpcnN0SG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZSwgZGlyZWN0aW9uLCBiYXJYWSwgcGFyYW0pLFxuICAgICAgICAgICAgc2VjbmRIbmRsUG9zID0gYWJzUG9zaXRpb24odGhpcy4kaGFuZGxlMiwgZGlyZWN0aW9uLCBiYXJYWSwgcGFyYW0pO1xuICAgICAgICAgICAgJGhhbmRsZSA9IGZpcnN0SG5kbFBvcyA8PSBzZWNuZEhuZGxQb3MgPyB0aGlzLiRoYW5kbGUgOiB0aGlzLiRoYW5kbGUyO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHsvL2NoYW5nZSBldmVudCBvbiBpbnB1dFxuICAgICAgdmFsdWUgPSB0aGlzLl9hZGp1c3RWYWx1ZShudWxsLCB2YWwpO1xuICAgICAgaGFzVmFsID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXRIYW5kbGVQb3MoJGhhbmRsZSwgdmFsdWUsIGhhc1ZhbCk7XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0ZXMgdmFsdWUgZm9yIGhhbmRsZSBpbiByZWdhcmQgdG8gc3RlcCB2YWx1ZS4gcmV0dXJucyBhZGp1c3RlZCB2YWx1ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgc2VsZWN0ZWQgaGFuZGxlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSB2YWx1ZSB0byBhZGp1c3QuIHVzZWQgaWYgJGhhbmRsZSBpcyBmYWxzeVxuICAgKi9cbiAgX2FkanVzdFZhbHVlKCRoYW5kbGUsIHZhbHVlKSB7XG4gICAgdmFyIHZhbCxcbiAgICAgIHN0ZXAgPSB0aGlzLm9wdGlvbnMuc3RlcCxcbiAgICAgIGRpdiA9IHBhcnNlRmxvYXQoc3RlcC8yKSxcbiAgICAgIGxlZnQsIHByZXZfdmFsLCBuZXh0X3ZhbDtcbiAgICBpZiAoISEkaGFuZGxlKSB7XG4gICAgICB2YWwgPSBwYXJzZUZsb2F0KCRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YWwgPSB2YWx1ZTtcbiAgICB9XG4gICAgbGVmdCA9IHZhbCAlIHN0ZXA7XG4gICAgcHJldl92YWwgPSB2YWwgLSBsZWZ0O1xuICAgIG5leHRfdmFsID0gcHJldl92YWwgKyBzdGVwO1xuICAgIGlmIChsZWZ0ID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgICB2YWwgPSB2YWwgPj0gcHJldl92YWwgKyBkaXYgPyBuZXh0X3ZhbCA6IHByZXZfdmFsO1xuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIHNsaWRlciBlbGVtZW50cy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGFwcGx5IGxpc3RlbmVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGhhbmRsZSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGN1ckhhbmRsZSxcbiAgICAgICAgdGltZXI7XG5cbiAgICAgIHRoaXMuaW5wdXRzLm9mZignY2hhbmdlLnpmLnNsaWRlcicpLm9uKCdjaGFuZ2UuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgaWR4ID0gX3RoaXMuaW5wdXRzLmluZGV4KCQodGhpcykpO1xuICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgX3RoaXMuaGFuZGxlcy5lcShpZHgpLCAkKHRoaXMpLnZhbCgpKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrU2VsZWN0KSB7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdjbGljay56Zi5zbGlkZXInKS5vbignY2xpY2suemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgaWYgKCEkKGUudGFyZ2V0KS5pcygnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKSkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIF90aGlzLiRoYW5kbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRyYWdnYWJsZSkge1xuICAgICAgdGhpcy5oYW5kbGVzLmFkZFRvdWNoKCk7XG5cbiAgICAgIHZhciAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICAgICRoYW5kbGVcbiAgICAgICAgLm9mZignbW91c2Vkb3duLnpmLnNsaWRlcicpXG4gICAgICAgIC5vbignbW91c2Vkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAkaGFuZGxlLmFkZENsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgIF90aGlzLiRmaWxsLmFkZENsYXNzKCdpcy1kcmFnZ2luZycpOy8vXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnLCB0cnVlKTtcblxuICAgICAgICAgIGN1ckhhbmRsZSA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcblxuICAgICAgICAgICRib2R5Lm9uKCdtb3VzZW1vdmUuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XG5cbiAgICAgICAgICB9KS5vbignbW91c2V1cC56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgY3VySGFuZGxlKTtcblxuICAgICAgICAgICAgJGhhbmRsZS5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIF90aGlzLiRmaWxsLnJlbW92ZUNsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICRib2R5Lm9mZignbW91c2Vtb3ZlLnpmLnNsaWRlciBtb3VzZXVwLnpmLnNsaWRlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC8vIHByZXZlbnQgZXZlbnRzIHRyaWdnZXJlZCBieSB0b3VjaFxuICAgICAgLm9uKCdzZWxlY3RzdGFydC56Zi5zbGlkZXIgdG91Y2htb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgJGhhbmRsZS5vZmYoJ2tleWRvd24uemYuc2xpZGVyJykub24oJ2tleWRvd24uemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIF8kaGFuZGxlID0gJCh0aGlzKSxcbiAgICAgICAgICBpZHggPSBfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gX3RoaXMuaGFuZGxlcy5pbmRleChfJGhhbmRsZSkgOiAwLFxuICAgICAgICAgIG9sZFZhbHVlID0gcGFyc2VGbG9hdChfdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwoKSksXG4gICAgICAgICAgbmV3VmFsdWU7XG5cbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdTbGlkZXInLCB7XG4gICAgICAgIGRlY3JlYXNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlIC0gX3RoaXMub3B0aW9ucy5zdGVwO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcDtcbiAgICAgICAgfSxcbiAgICAgICAgZGVjcmVhc2VfZmFzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZV9mYXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlICsgX3RoaXMub3B0aW9ucy5zdGVwICogMTA7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkgeyAvLyBvbmx5IHNldCBoYW5kbGUgcG9zIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWQgc3BlY2lhbGx5XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvKmlmIChuZXdWYWx1ZSkgeyAvLyBpZiBwcmVzc2VkIGtleSBoYXMgc3BlY2lhbCBmdW5jdGlvbiwgdXBkYXRlIHZhbHVlXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgX3RoaXMuX3NldEhhbmRsZVBvcyhfJGhhbmRsZSwgbmV3VmFsdWUpO1xuICAgICAgfSovXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIHNsaWRlciBwbHVnaW4uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuaGFuZGxlcy5vZmYoJy56Zi5zbGlkZXInKTtcbiAgICB0aGlzLmlucHV0cy5vZmYoJy56Zi5zbGlkZXInKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnNsaWRlcicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblNsaWRlci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1pbmltdW0gdmFsdWUgZm9yIHRoZSBzbGlkZXIgc2NhbGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMFxuICAgKi9cbiAgc3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBNYXhpbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwMFxuICAgKi9cbiAgZW5kOiAxMDAsXG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGNoYW5nZSBwZXIgY2hhbmdlIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIHN0ZXA6IDEsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgaGFuZGxlL2lucHV0ICoobGVmdCBoYW5kbGUvZmlyc3QgaW5wdXQpKiBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDBcbiAgICovXG4gIGluaXRpYWxTdGFydDogMCxcbiAgLyoqXG4gICAqIFZhbHVlIGF0IHdoaWNoIHRoZSByaWdodCBoYW5kbGUvc2Vjb25kIGlucHV0IHNob3VsZCBiZSBzZXQgdG8gb24gaW5pdGlhbGl6YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTAwXG4gICAqL1xuICBpbml0aWFsRW5kOiAxMDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIGlucHV0IHRvIGJlIGxvY2F0ZWQgb3V0c2lkZSB0aGUgY29udGFpbmVyIGFuZCB2aXNpYmxlLiBTZXQgdG8gYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGJpbmRpbmc6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB1c2VyIHRvIGNsaWNrL3RhcCBvbiB0aGUgc2xpZGVyIGJhciB0byBzZWxlY3QgYSB2YWx1ZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja1NlbGVjdDogdHJ1ZSxcbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIGFuZCB1c2UgdGhlIGB2ZXJ0aWNhbGAgY2xhc3MgdG8gY2hhbmdlIGFsaWdubWVudCB0byB2ZXJ0aWNhbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgdmVydGljYWw6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB1c2VyIHRvIGRyYWcgdGhlIHNsaWRlciBoYW5kbGUocykgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZHJhZ2dhYmxlOiB0cnVlLFxuICAvKipcbiAgICogRGlzYWJsZXMgdGhlIHNsaWRlciBhbmQgcHJldmVudHMgZXZlbnQgbGlzdGVuZXJzIGZyb20gYmVpbmcgYXBwbGllZC4gRG91YmxlIGNoZWNrZWQgYnkgSlMgd2l0aCBgZGlzYWJsZWRDbGFzc2AuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlIG9mIHR3byBoYW5kbGVzLiBEb3VibGUgY2hlY2tlZCBieSB0aGUgSlMuIENoYW5nZXMgc29tZSBsb2dpYyBoYW5kbGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZG91YmxlU2lkZWQ6IGZhbHNlLFxuICAvKipcbiAgICogUG90ZW50aWFsIGZ1dHVyZSBmZWF0dXJlLlxuICAgKi9cbiAgLy8gc3RlcHM6IDEwMCxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlcyB0aGUgcGx1Z2luIHNob3VsZCBnbyB0byBmb3IgZmxvYXRpbmcgcG9pbnQgcHJlY2lzaW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDJcbiAgICovXG4gIGRlY2ltYWw6IDIsXG4gIC8qKlxuICAgKiBUaW1lIGRlbGF5IGZvciBkcmFnZ2VkIGVsZW1lbnRzLlxuICAgKi9cbiAgLy8gZHJhZ0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGFuaW1hdGUgdGhlIG1vdmVtZW50IG9mIGEgc2xpZGVyIGhhbmRsZSBpZiB1c2VyIGNsaWNrcy90YXBzIG9uIHRoZSBiYXIuIE5lZWRzIHRvIGJlIG1hbnVhbGx5IHNldCBpZiB1cGRhdGluZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBTYXNzIHNldHRpbmdzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDIwMFxuICAgKi9cbiAgbW92ZVRpbWU6IDIwMCwvL3VwZGF0ZSB0aGlzIGlmIGNoYW5naW5nIHRoZSB0cmFuc2l0aW9uIHRpbWUgaW4gdGhlIHNhc3NcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gZGlzYWJsZWQgc2xpZGVycy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZGlzYWJsZWQnXG4gICAqL1xuICBkaXNhYmxlZENsYXNzOiAnZGlzYWJsZWQnLFxuICAvKipcbiAgICogV2lsbCBpbnZlcnQgdGhlIGRlZmF1bHQgbGF5b3V0IGZvciBhIHZlcnRpY2FsPHNwYW4gZGF0YS10b29sdGlwIHRpdGxlPVwid2hvIHdvdWxkIGRvIHRoaXM/Pz9cIj4gPC9zcGFuPnNsaWRlci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgaW52ZXJ0VmVydGljYWw6IGZhbHNlLFxuICAvKipcbiAgICogTWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgYGNoYW5nZWQuemYtc2xpZGVyYCBldmVudCBpcyB0cmlnZ2VyZWQgYWZ0ZXIgdmFsdWUgY2hhbmdlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cbiAgY2hhbmdlZERlbGF5OiA1MDBcbn07XG5cbmZ1bmN0aW9uIHBlcmNlbnQoZnJhYywgbnVtKSB7XG4gIHJldHVybiAoZnJhYyAvIG51bSk7XG59XG5mdW5jdGlvbiBhYnNQb3NpdGlvbigkaGFuZGxlLCBkaXIsIGNsaWNrUG9zLCBwYXJhbSkge1xuICByZXR1cm4gTWF0aC5hYnMoKCRoYW5kbGUucG9zaXRpb24oKVtkaXJdICsgKCRoYW5kbGVbcGFyYW1dKCkgLyAyKSkgLSBjbGlja1Bvcyk7XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTbGlkZXIsICdTbGlkZXInKTtcblxufShqUXVlcnkpO1xuXG4vLyoqKioqKioqKnRoaXMgaXMgaW4gY2FzZSB3ZSBnbyB0byBzdGF0aWMsIGFic29sdXRlIHBvc2l0aW9ucyBpbnN0ZWFkIG9mIGR5bmFtaWMgcG9zaXRpb25pbmcqKioqKioqKlxuLy8gdGhpcy5zZXRTdGVwcyhmdW5jdGlvbigpIHtcbi8vICAgX3RoaXMuX2V2ZW50cygpO1xuLy8gICB2YXIgaW5pdFN0YXJ0ID0gX3RoaXMub3B0aW9ucy5wb3NpdGlvbnNbX3RoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQgLSAxXSB8fCBudWxsO1xuLy8gICB2YXIgaW5pdEVuZCA9IF90aGlzLm9wdGlvbnMuaW5pdGlhbEVuZCA/IF90aGlzLm9wdGlvbnMucG9zaXRpb25bX3RoaXMub3B0aW9ucy5pbml0aWFsRW5kIC0gMV0gOiBudWxsO1xuLy8gICBpZiAoaW5pdFN0YXJ0IHx8IGluaXRFbmQpIHtcbi8vICAgICBfdGhpcy5faGFuZGxlRXZlbnQoaW5pdFN0YXJ0LCBpbml0RW5kKTtcbi8vICAgfVxuLy8gfSk7XG5cbi8vKioqKioqKioqKip0aGUgb3RoZXIgcGFydCBvZiBhYnNvbHV0ZSBwb3NpdGlvbnMqKioqKioqKioqKioqXG4vLyBTbGlkZXIucHJvdG90eXBlLnNldFN0ZXBzID0gZnVuY3Rpb24oY2IpIHtcbi8vICAgdmFyIHBvc0NoYW5nZSA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpIC8gdGhpcy5vcHRpb25zLnN0ZXBzO1xuLy8gICB2YXIgY291bnRlciA9IDBcbi8vICAgd2hpbGUoY291bnRlciA8IHRoaXMub3B0aW9ucy5zdGVwcykge1xuLy8gICAgIGlmIChjb3VudGVyKSB7XG4vLyAgICAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25zLnB1c2godGhpcy5vcHRpb25zLnBvc2l0aW9uc1tjb3VudGVyIC0gMV0gKyBwb3NDaGFuZ2UpO1xuLy8gICAgIH0gZWxzZSB7XG4vLyAgICAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25zLnB1c2gocG9zQ2hhbmdlKTtcbi8vICAgICB9XG4vLyAgICAgY291bnRlcisrO1xuLy8gICB9XG4vLyAgIGNiKCk7XG4vLyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFN0aWNreSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc3RpY2t5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBTdGlja3kge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHN0aWNreSB0aGluZy5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIHN0aWNreS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25zIG9iamVjdCBwYXNzZWQgd2hlbiBjcmVhdGluZyB0aGUgZWxlbWVudCBwcm9ncmFtbWF0aWNhbGx5LlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTdGlja3kuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1N0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBzdGlja3kgZWxlbWVudCBieSBhZGRpbmcgY2xhc3NlcywgZ2V0dGluZy9zZXR0aW5nIGRpbWVuc2lvbnMsIGJyZWFrcG9pbnRzIGFuZCBhdHRyaWJ1dGVzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRwYXJlbnQgPSB0aGlzLiRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3RpY2t5LWNvbnRhaW5lcl0nKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3N0aWNreScpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoISRwYXJlbnQubGVuZ3RoKSB7XG4gICAgICB0aGlzLndhc1dyYXBwZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLiRjb250YWluZXIgPSAkcGFyZW50Lmxlbmd0aCA/ICRwYXJlbnQgOiAkKHRoaXMub3B0aW9ucy5jb250YWluZXIpLndyYXBJbm5lcih0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLiRjb250YWluZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnN0aWNreUNsYXNzKVxuICAgICAgICAgICAgICAgICAuYXR0cih7J2RhdGEtcmVzaXplJzogaWR9KTtcblxuICAgIHRoaXMuc2Nyb2xsQ291bnQgPSB0aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmFuY2hvciAhPT0gJycpe1xuICAgICAgICBfdGhpcy4kYW5jaG9yID0gJCgnIycgKyBfdGhpcy5vcHRpb25zLmFuY2hvcik7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgX3RoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgICB9XG5cbiAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpe1xuICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSk7XG4gICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoaWQuc3BsaXQoJy0nKS5yZXZlcnNlKCkuam9pbignLScpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlUG9pbnRzKCkge1xuICAgIHZhciB0b3AgPSB0aGlzLm9wdGlvbnMudG9wQW5jaG9yID09IFwiXCIgPyAxIDogdGhpcy5vcHRpb25zLnRvcEFuY2hvcixcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcbiAgICAgICAgcHRzID0gW3RvcCwgYnRtXSxcbiAgICAgICAgYnJlYWtzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcbiAgICAgIHZhciBwdDtcbiAgICAgIGlmICh0eXBlb2YgcHRzW2ldID09PSAnbnVtYmVyJykge1xuICAgICAgICBwdCA9IHB0c1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwbGFjZSA9IHB0c1tpXS5zcGxpdCgnOicpLFxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XG5cbiAgICAgICAgcHQgPSBhbmNob3Iub2Zmc2V0KCkudG9wO1xuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICBwdCArPSBhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha3NbaV0gPSBwdDtcbiAgICB9XG5cblxuICAgIHRoaXMucG9pbnRzID0gYnJlYWtzO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXG4gICAqL1xuICBfZXZlbnRzKGlkKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsTGlzdGVuZXIgPSB0aGlzLnNjcm9sbExpc3RlbmVyID0gYHNjcm9sbC56Zi4ke2lkfWA7XG4gICAgaWYgKHRoaXMuaXNPbikgeyByZXR1cm47IH1cbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xuICAgICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNjcm9sbENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQgPSBfdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpXG4gICAgICAgICAgICAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUsIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmNhblN0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fZXZlbnRzKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3RoaXMuaXNPbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9wYXVzZUxpc3RlbmVycyhzY3JvbGxMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgaGFuZGxlcnMgZm9yIHNjcm9sbCBhbmQgY2hhbmdlIGV2ZW50cyBvbiBhbmNob3IuXG4gICAqIEBmaXJlcyBTdGlja3kjcGF1c2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNjcm9sbExpc3RlbmVyIC0gdW5pcXVlLCBuYW1lc3BhY2VkIHNjcm9sbCBsaXN0ZW5lciBhdHRhY2hlZCB0byBgd2luZG93YFxuICAgKi9cbiAgX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcik7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaXMgcGF1c2VkIGR1ZSB0byByZXNpemUgZXZlbnQgc2hyaW5raW5nIHRoZSB2aWV3LlxuICAgICAqIEBldmVudCBTdGlja3kjcGF1c2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3BhdXNlLnpmLnN0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBldmVyeSBgc2Nyb2xsYCBldmVudCBhbmQgb24gYF9pbml0YFxuICAgKiBmaXJlcyBmdW5jdGlvbnMgYmFzZWQgb24gYm9vbGVhbnMgYW5kIGNhY2hlZCB2YWx1ZXNcbiAgICogQHBhcmFtIHtCb29sZWFufSBjaGVja1NpemVzIC0gdHJ1ZSBpZiBwbHVnaW4gc2hvdWxkIHJlY2FsY3VsYXRlIHNpemVzIGFuZCBicmVha3BvaW50cy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHNjcm9sbCAtIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHBhc3NlZCBmcm9tIHNjcm9sbCBldmVudCBjYiBmdW5jdGlvbi4gSWYgbm90IHBhc3NlZCwgZGVmYXVsdHMgdG8gYHdpbmRvdy5wYWdlWU9mZnNldGAuXG4gICAqL1xuICBfY2FsYyhjaGVja1NpemVzLCBzY3JvbGwpIHtcbiAgICBpZiAoY2hlY2tTaXplcykgeyB0aGlzLl9zZXRTaXplcygpOyB9XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghc2Nyb2xsKSB7IHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDsgfVxuXG4gICAgaWYgKHNjcm9sbCA+PSB0aGlzLnRvcFBvaW50KSB7XG4gICAgICBpZiAoc2Nyb2xsIDw9IHRoaXMuYm90dG9tUG9pbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgICB0aGlzLl9zZXRTdGlja3koKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreShmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHN0dWNrLlxuICAgKiBBZGRzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAZmlyZXMgU3RpY2t5I3N0dWNrdG9cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U3RpY2t5KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgY3NzID0ge307XG5cbiAgICBjc3NbbXJnbl0gPSBgJHt0aGlzLm9wdGlvbnNbbXJnbl19ZW1gO1xuICAgIGNzc1tzdGlja1RvXSA9IDA7XG4gICAgY3NzW25vdFN0dWNrVG9dID0gJ2F1dG8nO1xuICAgIGNzc1snbGVmdCddID0gdGhpcy4kY29udGFpbmVyLm9mZnNldCgpLmxlZnQgKyBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLiRjb250YWluZXJbMF0pW1wicGFkZGluZy1sZWZ0XCJdLCAxMCk7XG4gICAgdGhpcy5pc1N0dWNrID0gdHJ1ZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke25vdFN0dWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGBwb3NpdGlvbjogZml4ZWQ7YFxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYuc3R1Y2t0bzp0b3BgXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjc3R1Y2t0b1xuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi5zdHVja3RvOiR7c3RpY2tUb31gKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9uKFwidHJhbnNpdGlvbmVuZCB3ZWJraXRUcmFuc2l0aW9uRW5kIG9UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIE1TVHJhbnNpdGlvbkVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9zZXRTaXplcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHVuc3R1Y2suXG4gICAqIFJlbW92ZXMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEFkZHMgb3RoZXIgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNUb3AgLSB0ZWxscyB0aGUgZnVuY3Rpb24gaWYgdGhlICRlbGVtZW50IHNob3VsZCBhbmNob3IgdG8gdGhlIHRvcCBvciBib3R0b20gb2YgaXRzICRhbmNob3IgZWxlbWVudC5cbiAgICogQGZpcmVzIFN0aWNreSN1bnN0dWNrZnJvbVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlbW92ZVN0aWNreShpc1RvcCkge1xuICAgIHZhciBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXG4gICAgICAgIHN0aWNrVG9Ub3AgPSBzdGlja1RvID09PSAndG9wJyxcbiAgICAgICAgY3NzID0ge30sXG4gICAgICAgIGFuY2hvclB0ID0gKHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gLSB0aGlzLnBvaW50c1swXSA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodCxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG9Ub3AgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUb1RvcCA/ICdib3R0b20nIDogJ3RvcCcsXG4gICAgICAgIHRvcE9yQm90dG9tID0gaXNUb3AgPyAndG9wJyA6ICdib3R0b20nO1xuXG4gICAgY3NzW21yZ25dID0gMDtcblxuICAgIGNzc1snYm90dG9tJ10gPSAnYXV0byc7XG4gICAgaWYoaXNUb3ApIHtcbiAgICAgIGNzc1sndG9wJ10gPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBjc3NbJ3RvcCddID0gYW5jaG9yUHQ7XG4gICAgfVxuXG4gICAgY3NzWydsZWZ0J10gPSAnJztcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGBpcy1zdHVjayBpcy1hdC0ke3N0aWNrVG99YClcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKGBpcy1hbmNob3JlZCBpcy1hdC0ke3RvcE9yQm90dG9tfWApXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxuICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgJGVsZW1lbnQgaGFzIGJlY29tZSBhbmNob3JlZC5cbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOmJvdHRvbWBcbiAgICAgICAgICAgICAgICAgICogQGV2ZW50IFN0aWNreSN1bnN0dWNrZnJvbVxuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgLnRyaWdnZXIoYHN0aWNreS56Zi51bnN0dWNrZnJvbToke3RvcE9yQm90dG9tfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlICRlbGVtZW50IGFuZCAkY29udGFpbmVyIHNpemVzIGZvciBwbHVnaW4uXG4gICAqIENhbGxzIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgb24gY29tcGxldGlvbiBvZiBgX3NldEJyZWFrUG9pbnRzYC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTaXplcyhjYikge1xuICAgIHRoaXMuY2FuU3RpY2sgPSBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuc3RpY2t5T24pO1xuICAgIGlmICghdGhpcy5jYW5TdGljaykgeyBjYigpOyB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxuICAgICAgICBjb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKSxcbiAgICAgICAgcGRuZyA9IHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctcmlnaHQnXSwgMTApO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLmFuY2hvckhlaWdodCA9IHRoaXMuJGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe1xuICAgICAgJ21heC13aWR0aCc6IGAke25ld0VsZW1XaWR0aCAtIHBkbmd9cHhgXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3Q29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgfHwgdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xuICAgICAgbmV3Q29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICB9XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG4gICAgdGhpcy4kY29udGFpbmVyLmNzcyh7XG4gICAgICBoZWlnaHQ6IG5ld0NvbnRhaW5lckhlaWdodFxuICAgIH0pO1xuICAgIHRoaXMuZWxlbUhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcblxuICBcdGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgXHRcdHRoaXMuJGVsZW1lbnQuY3NzKHtcImxlZnRcIjp0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctbGVmdCddLCAxMCl9KTtcbiAgXHR9XG5cbiAgICB0aGlzLl9zZXRCcmVha1BvaW50cyhuZXdDb250YWluZXJIZWlnaHQsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNiKSB7IGNiKCk7IH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB1cHBlciBhbmQgbG93ZXIgYnJlYWtwb2ludHMgZm9yIHRoZSBlbGVtZW50IHRvIGJlY29tZSBzdGlja3kvdW5zdGlja3kuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBlbGVtSGVpZ2h0IC0gcHggdmFsdWUgZm9yIHN0aWNreS4kZWxlbWVudCBoZWlnaHQsIGNhbGN1bGF0ZWQgYnkgYF9zZXRTaXplc2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGNvbXBsZXRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0QnJlYWtQb2ludHMoZWxlbUhlaWdodCwgY2IpIHtcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmIChjYikgeyBjYigpOyB9XG4gICAgICBlbHNlIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuICAgIHZhciBtVG9wID0gZW1DYWxjKHRoaXMub3B0aW9ucy5tYXJnaW5Ub3ApLFxuICAgICAgICBtQnRtID0gZW1DYWxjKHRoaXMub3B0aW9ucy5tYXJnaW5Cb3R0b20pLFxuICAgICAgICB0b3BQb2ludCA9IHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMF0gOiB0aGlzLiRhbmNob3Iub2Zmc2V0KCkudG9wLFxuICAgICAgICBib3R0b21Qb2ludCA9IHRoaXMucG9pbnRzID8gdGhpcy5wb2ludHNbMV0gOiB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0LFxuICAgICAgICAvLyB0b3BQb2ludCA9IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AgfHwgdGhpcy5wb2ludHNbMF0sXG4gICAgICAgIC8vIGJvdHRvbVBvaW50ID0gdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCB8fCB0aGlzLnBvaW50c1sxXSxcbiAgICAgICAgd2luSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAndG9wJykge1xuICAgICAgdG9wUG9pbnQgLT0gbVRvcDtcbiAgICAgIGJvdHRvbVBvaW50IC09IChlbGVtSGVpZ2h0ICsgbVRvcCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc3RpY2tUbyA9PT0gJ2JvdHRvbScpIHtcbiAgICAgIHRvcFBvaW50IC09ICh3aW5IZWlnaHQgLSAoZWxlbUhlaWdodCArIG1CdG0pKTtcbiAgICAgIGJvdHRvbVBvaW50IC09ICh3aW5IZWlnaHQgLSBtQnRtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy90aGlzIHdvdWxkIGJlIHRoZSBzdGlja1RvOiBib3RoIG9wdGlvbi4uLiB0cmlja3lcbiAgICB9XG5cbiAgICB0aGlzLnRvcFBvaW50ID0gdG9wUG9pbnQ7XG4gICAgdGhpcy5ib3R0b21Qb2ludCA9IGJvdHRvbVBvaW50O1xuXG4gICAgaWYgKGNiKSB7IGNiKCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cbiAgICogUmVzZXRzIHRoZSBlbGVtZW50IHRvIHRoZSB0b3AgcG9zaXRpb24gZmlyc3QuXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzLCBKUy1hZGRlZCBjc3MgcHJvcGVydGllcyBhbmQgY2xhc3NlcywgYW5kIHVud3JhcHMgdGhlICRlbGVtZW50IGlmIHRoZSBKUyBhZGRlZCB0aGUgJGNvbnRhaW5lci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcblxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnN0aWNreUNsYXNzfSBpcy1hbmNob3JlZCBpcy1hdC10b3BgKVxuICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgIHRvcDogJycsXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAnbWF4LXdpZHRoJzogJydcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyIGNsYXNzPVwic21hbGwtNiBjb2x1bW5zXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgY29udGFpbmVyOiAnPGRpdiBkYXRhLXN0aWNreS1jb250YWluZXI+PC9kaXY+JyxcbiAgLyoqXG4gICAqIExvY2F0aW9uIGluIHRoZSB2aWV3IHRoZSBlbGVtZW50IHN0aWNrcyB0by5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgc3RpY2tUbzogJ3RvcCcsXG4gIC8qKlxuICAgKiBJZiBhbmNob3JlZCB0byBhIHNpbmdsZSBlbGVtZW50LCB0aGUgaWQgb2YgdGhhdCBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQnXG4gICAqL1xuICBhbmNob3I6ICcnLFxuICAvKipcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgdG9wIGFuY2hvci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkOnRvcCdcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6Ym90dG9tJ1xuICAgKi9cbiAgYnRtQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSB0b3Agb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Ub3A6IDEsXG4gIC8qKlxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgYm90dG9tIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgbWFyZ2luQm90dG9tOiAxLFxuICAvKipcbiAgICogQnJlYWtwb2ludCBzdHJpbmcgdGhhdCBpcyB0aGUgbWluaW11bSBzY3JlZW4gc2l6ZSBhbiBlbGVtZW50IHNob3VsZCBiZWNvbWUgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBzdGlja3lPbjogJ21lZGl1bScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBlbGVtZW50LCBhbmQgcmVtb3ZlZCBvbiBkZXN0cnVjdGlvbi4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5YC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5J1xuICAgKi9cbiAgc3RpY2t5Q2xhc3M6ICdzdGlja3knLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgY29udGFpbmVyLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3ktY29udGFpbmVyYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5LWNvbnRhaW5lcidcbiAgICovXG4gIGNvbnRhaW5lckNsYXNzOiAnc3RpY2t5LWNvbnRhaW5lcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygc2Nyb2xsIGV2ZW50cyBiZXR3ZWVuIHRoZSBwbHVnaW4ncyByZWNhbGN1bGF0aW5nIHN0aWNreSBwb2ludHMuIFNldHRpbmcgaXQgdG8gYDBgIHdpbGwgY2F1c2UgaXQgdG8gcmVjYWxjIGV2ZXJ5IHNjcm9sbCBldmVudCwgc2V0dGluZyBpdCB0byBgLTFgIHdpbGwgcHJldmVudCByZWNhbGMgb24gc2Nyb2xsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBjaGVja0V2ZXJ5OiAtMVxufTtcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2FsY3VsYXRlIGVtIHZhbHVlc1xuICogQHBhcmFtIE51bWJlciB7ZW19IC0gbnVtYmVyIG9mIGVtJ3MgdG8gY2FsY3VsYXRlIGludG8gcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIGVtQ2FsYyhlbSkge1xuICByZXR1cm4gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgbnVsbCkuZm9udFNpemUsIDEwKSAqIGVtO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU3RpY2t5LCAnU3RpY2t5Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50YWJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgdGFicyBjb250YWluIGltYWdlc1xuICovXG5cbmNsYXNzIFRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0YWJzLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIHRhYnMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVGFicy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RhYnMnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdUYWJzJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICAvLyAnVEFCJzogJ25leHQnLFxuICAgICAgLy8gJ1NISUZUX1RBQic6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFicyBieSBzaG93aW5nIGFuZCBmb2N1c2luZyAoaWYgYXV0b0ZvY3VzPXRydWUpIHRoZSBwcmVzZXQgYWN0aXZlIHRhYi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpLFxuICAgICAgICAgIGhhc2ggPSAkbGlua1swXS5oYXNoLnNsaWNlKDEpLFxuICAgICAgICAgIGxpbmtJZCA9ICRsaW5rWzBdLmlkID8gJGxpbmtbMF0uaWQgOiBgJHtoYXNofS1sYWJlbGAsXG4gICAgICAgICAgJHRhYkNvbnRlbnQgPSAkKGAjJHtoYXNofWApO1xuXG4gICAgICAkZWxlbS5hdHRyKHsncm9sZSc6ICdwcmVzZW50YXRpb24nfSk7XG5cbiAgICAgICRsaW5rLmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnYXJpYS1jb250cm9scyc6IGhhc2gsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgICR0YWJDb250ZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgIGlmKGlzQWN0aXZlICYmIF90aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgdmFyICRpbWFnZXMgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoJ2ltZycpO1xuXG4gICAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCgkaW1hZ2VzLCB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRIZWlnaHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuX2FkZEtleUhhbmRsZXIoKTtcbiAgICB0aGlzLl9hZGRDbGlja0hhbmRsZXIoKTtcbiAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSBudWxsO1xuICAgIFxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpO1xuICAgICAgXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJ2NsaWNrLnpmLnRhYnMnKVxuICAgICAgLm9uKCdjbGljay56Zi50YWJzJywgYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCwgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKCQodGhpcykuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWJvYXJkIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkS2V5SGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkZmlyc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpmaXJzdC1vZi10eXBlJyk7XG4gICAgdmFyICRsYXN0VGFiID0gX3RoaXMuJGVsZW1lbnQuZmluZCgnbGk6bGFzdC1vZi10eXBlJyk7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSkgcmV0dXJuO1xuICAgICAgXG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMud3JhcE9uS2V5cykge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9IGkgPT09ICRlbGVtZW50cy5sZW5ndGggLTEgPyAkZWxlbWVudHMuZmlyc3QoKSA6ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1RhYnMnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRlbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJG5leHRFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUYWIgdG8gb3Blbi5cbiAgICogQGZpcmVzIFRhYnMjY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0KSB7XG4gICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICBoYXNoID0gJHRhYkxpbmtbMF0uaGFzaCxcbiAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCksXG4gICAgICAgICRvbGRUYWIgPSB0aGlzLiRlbGVtZW50LlxuICAgICAgICAgIGZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9LmlzLWFjdGl2ZWApXG4gICAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAgICAgLmF0dHIoeyAnYXJpYS1zZWxlY3RlZCc6ICdmYWxzZScgfSk7XG5cbiAgICAkKGAjJHskb2xkVGFiLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxuICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeyAnYXJpYS1oaWRkZW4nOiAndHJ1ZScgfSk7XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XG5cbiAgICAkdGFyZ2V0Q29udGVudFxuICAgICAgLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6ICdmYWxzZSd9KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQgdGFicy5cbiAgICAgKiBAZXZlbnQgVGFicyNjaGFuZ2VcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZS56Zi50YWJzJywgWyR0YXJnZXRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciBzZWxlY3RpbmcgYSBjb250ZW50IHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzZWxlY3RUYWIoZWxlbSkge1xuICAgIHZhciBpZFN0cjtcblxuICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlkU3RyID0gZWxlbVswXS5pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRTdHIgPSBlbGVtO1xuICAgIH1cblxuICAgIGlmIChpZFN0ci5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICBpZFN0ciA9IGAjJHtpZFN0cn1gO1xuICAgIH1cblxuICAgIHZhciAkdGFyZ2V0ID0gdGhpcy4kdGFiVGl0bGVzLmZpbmQoYFtocmVmPVwiJHtpZFN0cn1cIl1gKS5wYXJlbnQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG5cbiAgICB0aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDA7XG4gICAgdGhpcy4kdGFiQ29udGVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuY3NzKCdoZWlnaHQnLCAnJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGFuZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgaXNBY3RpdmUgPSBwYW5lbC5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJywgJ2Rpc3BsYXknOiAnYmxvY2snfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moe1xuICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgfSlcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIHRhYnMuXG4gICAqIEBmaXJlcyBUYWJzI2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxuICAgICAgLm9mZignLnpmLnRhYnMnKS5oaWRlKCkuZW5kKClcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmhpZGUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVGFicy5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgd2luZG93IHRvIHNjcm9sbCB0byBjb250ZW50IG9mIGFjdGl2ZSBwYW5lIG9uIGxvYWQgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBrZXlib2FyZCBpbnB1dCB0byAnd3JhcCcgYXJvdW5kIHRoZSB0YWIgbGlua3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgd3JhcE9uS2V5czogdHJ1ZSxcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0YWIgY29udGVudCBwYW5lcyB0byBtYXRjaCBoZWlnaHRzIGlmIHNldCB0byB0cnVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYGxpYCdzIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RhYnMtdGl0bGUnXG4gICAqL1xuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0YWJzLXBhbmVsJ1xuICAgKi9cbiAgcGFuZWxDbGFzczogJ3RhYnMtcGFuZWwnXG59O1xuXG5mdW5jdGlvbiBjaGVja0NsYXNzKCRlbGVtKXtcbiAgcmV0dXJuICRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRhYnMsICdUYWJzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb2dnbGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b2dnbGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvZ2dsZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUb2dnbGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvZ2dsZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvZ2dsZXIuZGVmYXVsdHMsIGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLmNsYXNzTmFtZSA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9nZ2xlcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBUb2dnbGVyIHBsdWdpbiBieSBwYXJzaW5nIHRoZSB0b2dnbGUgY2xhc3MgZnJvbSBkYXRhLXRvZ2dsZXIsIG9yIGFuaW1hdGlvbiBjbGFzc2VzIGZyb20gZGF0YS1hbmltYXRlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpbnB1dDtcbiAgICAvLyBQYXJzZSBhbmltYXRpb24gY2xhc3NlcyBpZiB0aGV5IHdlcmUgc2V0XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XG5cbiAgICAgIHRoaXMuYW5pbWF0aW9uSW4gPSBpbnB1dFswXTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCBwYXJzZSB0b2dnbGUgY2xhc3NcbiAgICBlbHNlIHtcbiAgICAgIGlucHV0ID0gdGhpcy4kZWxlbWVudC5kYXRhKCd0b2dnbGVyJyk7XG4gICAgICAvLyBBbGxvdyBmb3IgYSAuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZ1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBpbnB1dFswXSA9PT0gJy4nID8gaW5wdXQuc2xpY2UoMSkgOiBpbnB1dDtcbiAgICB9XG5cbiAgICAvLyBBZGQgQVJJQSBhdHRyaWJ1dGVzIHRvIHRyaWdnZXJzXG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZDtcbiAgICAkKGBbZGF0YS1vcGVuPVwiJHtpZH1cIl0sIFtkYXRhLWNsb3NlPVwiJHtpZH1cIl0sIFtkYXRhLXRvZ2dsZT1cIiR7aWR9XCJdYClcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuICAgIC8vIElmIHRoZSB0YXJnZXQgaXMgaGlkZGVuLCBhZGQgYXJpYS1oaWRkZW5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykgPyBmYWxzZSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIHRvZ2dsZSB0cmlnZ2VyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ3RvZ2dsZS56Zi50cmlnZ2VyJykub24oJ3RvZ2dsZS56Zi50cmlnZ2VyJywgdGhpcy50b2dnbGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgdGFyZ2V0IGNsYXNzIG9uIHRoZSB0YXJnZXQgZWxlbWVudC4gQW4gZXZlbnQgaXMgZmlyZWQgZnJvbSB0aGUgb3JpZ2luYWwgdHJpZ2dlciBkZXBlbmRpbmcgb24gaWYgdGhlIHJlc3VsdGFudCBzdGF0ZSB3YXMgXCJvblwiIG9yIFwib2ZmXCIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvZmZcbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICB0aGlzWyB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA/ICdfdG9nZ2xlQW5pbWF0ZScgOiAnX3RvZ2dsZUNsYXNzJ10oKTtcbiAgfVxuXG4gIF90b2dnbGVDbGFzcygpIHtcbiAgICB0aGlzLiRlbGVtZW50LnRvZ2dsZUNsYXNzKHRoaXMuY2xhc3NOYW1lKTtcblxuICAgIHZhciBpc09uID0gdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG4gICAgaWYgKGlzT24pIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGhhcyB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvblxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29mZlxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlQVJJQShpc09uKTtcbiAgfVxuXG4gIF90b2dnbGVBbmltYXRlKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25JbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25PdXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQShmYWxzZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF91cGRhdGVBUklBKGlzT24pIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09uID8gdHJ1ZSA6IGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgVG9nZ2xlciBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudG9nZ2xlcicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub2dnbGVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGVsbHMgdGhlIHBsdWdpbiBpZiB0aGUgZWxlbWVudCBzaG91bGQgYW5pbWF0ZWQgd2hlbiB0b2dnbGVkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbmltYXRlOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvZ2dsZXIsICdUb2dnbGVyJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb29sdGlwIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b29sdGlwXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvb2x0aXAge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIFRvb2x0aXAuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9vbHRpcCNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggYSB0b29sdGlwIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9iamVjdCB0byBleHRlbmQgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9vbHRpcC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Rvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdG9vbHRpcCBieSBzZXR0aW5nIHRoZSBjcmVhdGluZyB0aGUgdGlwIGVsZW1lbnQsIGFkZGluZyBpdCdzIHRleHQsIHNldHRpbmcgcHJpdmF0ZSB2YXJpYWJsZXMgYW5kIHNldHRpbmcgYXR0cmlidXRlcyBvbiB0aGUgYW5jaG9yLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGVsZW1JZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1kZXNjcmliZWRieScpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3Rvb2x0aXAnKTtcblxuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgfHwgdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyh0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMudGlwVGV4dCA9IHRoaXMub3B0aW9ucy50aXBUZXh0IHx8IHRoaXMuJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5vcHRpb25zLnRlbXBsYXRlID8gJCh0aGlzLm9wdGlvbnMudGVtcGxhdGUpIDogdGhpcy5fYnVpbGRUZW1wbGF0ZShlbGVtSWQpO1xuXG4gICAgdGhpcy50ZW1wbGF0ZS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICAgICAgICAudGV4dCh0aGlzLm9wdGlvbnMudGlwVGV4dClcbiAgICAgICAgLmhpZGUoKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAndGl0bGUnOiAnJyxcbiAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogZWxlbUlkLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXG4gICAgICAnZGF0YS10b2dnbGUnOiBlbGVtSWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiBlbGVtSWRcbiAgICB9KS5hZGRDbGFzcyh0aGlzLnRyaWdnZXJDbGFzcyk7XG5cbiAgICAvL2hlbHBlciB2YXJpYWJsZXMgdG8gdHJhY2sgbW92ZW1lbnQgb24gY29sbGlzaW9uc1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdyYWJzIHRoZSBjdXJyZW50IHBvc2l0aW9uaW5nIGNsYXNzLCBpZiBwcmVzZW50LCBhbmQgcmV0dXJucyB0aGUgdmFsdWUgb3IgYW4gZW1wdHkgc3RyaW5nLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldFBvc2l0aW9uQ2xhc3MoZWxlbWVudCkge1xuICAgIGlmICghZWxlbWVudCkgeyByZXR1cm4gJyc7IH1cbiAgICAvLyB2YXIgcG9zaXRpb24gPSBlbGVtZW50LmF0dHIoJ2NsYXNzJykubWF0Y2goL3RvcHxsZWZ0fHJpZ2h0L2cpO1xuICAgIHZhciBwb3NpdGlvbiA9IGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC9cXGIodG9wfGxlZnR8cmlnaHQpXFxiL2cpO1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uID8gcG9zaXRpb25bMF0gOiAnJztcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH07XG4gIC8qKlxuICAgKiBidWlsZHMgdGhlIHRvb2x0aXAgZWxlbWVudCwgYWRkcyBhdHRyaWJ1dGVzLCBhbmQgcmV0dXJucyB0aGUgdGVtcGxhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYnVpbGRUZW1wbGF0ZShpZCkge1xuICAgIHZhciB0ZW1wbGF0ZUNsYXNzZXMgPSAoYCR7dGhpcy5vcHRpb25zLnRvb2x0aXBDbGFzc30gJHt0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzc30gJHt0aGlzLm9wdGlvbnMudGVtcGxhdGVDbGFzc2VzfWApLnRyaW0oKTtcbiAgICB2YXIgJHRlbXBsYXRlID0gICQoJzxkaXY+PC9kaXY+JykuYWRkQ2xhc3ModGVtcGxhdGVDbGFzc2VzKS5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3Rvb2x0aXAnLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgcmV0dXJuICR0ZW1wbGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbmluZyBjbGFzcyB0byB0cnlcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcblxuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXG4gICAgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzZXRzIHRoZSBwb3NpdGlvbiBjbGFzcyBvZiBhbiBlbGVtZW50IGFuZCByZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdW50aWwgdGhlcmUgYXJlIG5vIG1vcmUgcG9zc2libGUgcG9zaXRpb25zIHRvIGF0dGVtcHQsIG9yIHRoZSB0b29sdGlwIGVsZW1lbnQgaXMgbm8gbG9uZ2VyIGNvbGxpZGluZy5cbiAgICogaWYgdGhlIHRvb2x0aXAgaXMgbGFyZ2VyIHRoYW4gdGhlIHNjcmVlbiB3aWR0aCwgZGVmYXVsdCB0byBmdWxsIHdpZHRoIC0gYW55IHVzZXIgc2VsZWN0ZWQgbWFyZ2luXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0UG9zaXRpb24oKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyh0aGlzLnRlbXBsYXRlKSxcbiAgICAgICAgJHRpcERpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkYW5jaG9yRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kZWxlbWVudCksXG4gICAgICAgIGRpcmVjdGlvbiA9IChwb3NpdGlvbiA9PT0gJ2xlZnQnID8gJ2xlZnQnIDogKChwb3NpdGlvbiA9PT0gJ3JpZ2h0JykgPyAnbGVmdCcgOiAndG9wJykpLFxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgb2Zmc2V0ID0gKHBhcmFtID09PSAnaGVpZ2h0JykgPyB0aGlzLm9wdGlvbnMudk9mZnNldCA6IHRoaXMub3B0aW9ucy5oT2Zmc2V0LFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoKCR0aXBEaW1zLndpZHRoID49ICR0aXBEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAvLyB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkYW5jaG9yRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwnY2VudGVyICcgKyAocG9zaXRpb24gfHwgJ2JvdHRvbScpLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcblxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpICYmIHRoaXMuY291bnRlcikge1xuICAgICAgdGhpcy5fcmVwb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiByZXZlYWxzIHRoZSB0b29sdGlwLCBhbmQgZmlyZXMgYW4gZXZlbnQgdG8gY2xvc2UgYW55IG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICogQGZpcmVzIFRvb2x0aXAjY2xvc2VtZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2hvdygpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dPbiAhPT0gJ2FsbCcgJiYgIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5zaG93T24pKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKCdUaGUgc2NyZWVuIGlzIHRvbyBzbWFsbCB0byBkaXNwbGF5IHRoaXMgdG9vbHRpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuc2hvdygpO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBhbGwgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYudG9vbHRpcCcsIHRoaXMudGVtcGxhdGUuYXR0cignaWQnKSk7XG5cblxuICAgIHRoaXMudGVtcGxhdGUuYXR0cih7XG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2VcbiAgICB9KTtcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy50ZW1wbGF0ZSk7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuaGlkZSgpLmNzcygndmlzaWJpbGl0eScsICcnKS5mYWRlSW4odGhpcy5vcHRpb25zLmZhZGVJbkR1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxuICAgICAqIEBldmVudCBUb29sdGlwI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBjdXJyZW50IHRvb2x0aXAsIGFuZCByZXNldHMgdGhlIHBvc2l0aW9uaW5nIGNsYXNzIGlmIGl0IHdhcyBjaGFuZ2VkIGR1ZSB0byBjb2xsaXNpb25cbiAgICogQGZpcmVzIFRvb2x0aXAjaGlkZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZVxuICAgIH0pLmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVPdXREdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgaWYgKF90aGlzLmNsYXNzQ2hhbmdlZCkge1xuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxuICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhfdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyhfdGhpcy50ZW1wbGF0ZSkpXG4gICAgICAgICAgICAgLmFkZENsYXNzKF90aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICBfdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgICAgX3RoaXMuY291bnRlciA9IDQ7XG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogZmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBoaWRkZW5cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNoaWRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgdGhlIHRvb2x0aXAgYW5kIGl0cyBhbmNob3JcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICR0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXIuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICBpZiAoIWlzRm9jdXMgfHwgKF90aGlzLmlzQ2xpY2sgJiYgIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xuICAgICAgICAgIC8vIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoKF90aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyIHx8ICFfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpKSAmJiAhX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRm9yVG91Y2gpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgX3RoaXMuaXNBY3RpdmUgPyBfdGhpcy5oaWRlKCkgOiBfdGhpcy5zaG93KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAvLyAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSB0cnVlO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxuICAgICAgICAgIC8vIGEgcmVhbCBmb2N1cywgb3RoZXJ3aXNlIG9uIGhvdmVyIGFuZCBjb21lIGJhY2sgd2UgZ2V0IGJhZCBiZWhhdmlvclxuICAgICAgICAgIGlmKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyBpc0ZvY3VzID0gZmFsc2U7IH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICB9KVxuXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgYSB0b2dnbGUgbWV0aG9kLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhdGljIHNob3coKSAmIGhpZGUoKSBmdW5jdGlvbnNcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgdG9vbHRpcCwgcmVtb3ZlcyB0ZW1wbGF0ZSBlbGVtZW50IGZyb20gdGhlIHZpZXcuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXG4gICAgICAgICAgICAgICAgIC5vZmYoJy56Zi50cmlnZ2VyIC56Zi50b290aXAnKVxuICAgICAgICAgICAgICAgIC8vICAucmVtb3ZlQ2xhc3MoJ2hhcy10aXAnKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1kZXNjcmliZWRieScpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXlldGktYm94JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9nZ2xlJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcmVzaXplJyk7XG5cbiAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZSgpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvb2x0aXAuZGVmYXVsdHMgPSB7XG4gIGRpc2FibGVGb3JUb3VjaDogZmFsc2UsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYmVmb3JlIGEgdG9vbHRpcCBzaG91bGQgb3BlbiBvbiBob3Zlci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDIwMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBpbnRvIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTUwXG4gICAqL1xuICBmYWRlSW5EdXJhdGlvbjogMTUwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIG91dCBvZiB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDE1MFxuICAgKi9cbiAgZmFkZU91dER1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBEaXNhYmxlcyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHRoZSB0b29sdGlwIGlmIHNldCB0byB0cnVlXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBPcHRpb25hbCBhZGR0aW9uYWwgY2xhc3NlcyB0byBhcHBseSB0byB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBpbml0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdteS1jb29sLXRpcC1jbGFzcydcbiAgICovXG4gIHRlbXBsYXRlQ2xhc3NlczogJycsXG4gIC8qKlxuICAgKiBOb24tb3B0aW9uYWwgY2xhc3MgYWRkZWQgdG8gdG9vbHRpcCB0ZW1wbGF0ZXMuIEZvdW5kYXRpb24gZGVmYXVsdCBpcyAndG9vbHRpcCcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3Rvb2x0aXAnXG4gICAqL1xuICB0b29sdGlwQ2xhc3M6ICd0b29sdGlwJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIHRvb2x0aXAgYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2hhcy10aXAnXG4gICAqL1xuICB0cmlnZ2VyQ2xhc3M6ICdoYXMtdGlwJyxcbiAgLyoqXG4gICAqIE1pbmltdW0gYnJlYWtwb2ludCBzaXplIGF0IHdoaWNoIHRvIG9wZW4gdGhlIHRvb2x0aXAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NtYWxsJ1xuICAgKi9cbiAgc2hvd09uOiAnc21hbGwnLFxuICAvKipcbiAgICogQ3VzdG9tIHRlbXBsYXRlIHRvIGJlIHVzZWQgdG8gZ2VuZXJhdGUgbWFya3VwIGZvciB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcmbHQ7ZGl2IGNsYXNzPVwidG9vbHRpcFwiJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIHRlbXBsYXRlOiAnJyxcbiAgLyoqXG4gICAqIFRleHQgZGlzcGxheWVkIGluIHRoZSB0b29sdGlwIHRlbXBsYXRlIG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ1NvbWUgY29vbCBzcGFjZSBmYWN0IGhlcmUuJ1xuICAgKi9cbiAgdGlwVGV4dDogJycsXG4gIHRvdWNoQ2xvc2VUZXh0OiAnVGFwIHRvIGNsb3NlLicsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja09wZW46IHRydWUsXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIHBvc2l0aW9uaW5nIGNsYXNzZXMsIHNldCBieSB0aGUgSlNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFkgYXhpcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgdk9mZnNldDogMTAsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFggYXhpcywgaWYgYWxpZ25lZCB0byBhIHNpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTJcbiAgICovXG4gIGhPZmZzZXQ6IDEyXG59O1xuXG4vKipcbiAqIFRPRE8gdXRpbGl6ZSByZXNpemUgZXZlbnQgdHJpZ2dlclxuICovXG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihUb29sdGlwLCAnVG9vbHRpcCcpO1xuXG59KGpRdWVyeSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cpXG4gICAgRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG59KSgpO1xuXG52YXIgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG4vLyBGaW5kIHRoZSByaWdodCBcInRyYW5zaXRpb25lbmRcIiBldmVudCBmb3IgdGhpcyBicm93c2VyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gIH1cbiAgdmFyIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cmFuc2l0aW9uc1t0XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgaWYgKGVuZEV2ZW50ID09PSBudWxsKSB7XG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XG4gICAgY2IoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuICBlbGVtZW50LmFkZENsYXNzKGFuaW1hdGlvbik7XG4gIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudC5jc3MoJ3RyYW5zaXRpb24nLCAnJyk7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZSgndHJhbnNpdGlvbmVuZCcsIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoaW5pdENsYXNzICsgJyAnICsgYWN0aXZlQ2xhc3MgKyAnICcgKyBhbmltYXRpb24pO1xuICB9XG59XG5cbnZhciBNb3Rpb25VSSA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cbiIsImpRdWVyeSggJ2lmcmFtZVtzcmMqPVwieW91dHViZS5jb21cIl0nKS53cmFwKFwiPGRpdiBjbGFzcz0nZmxleC12aWRlbyB3aWRlc2NyZWVuJy8+XCIpO1xualF1ZXJ5KCAnaWZyYW1lW3NyYyo9XCJ2aW1lby5jb21cIl0nKS53cmFwKFwiPGRpdiBjbGFzcz0nZmxleC12aWRlbyB3aWRlc2NyZWVuIHZpbWVvJy8+XCIpO1xuIiwialF1ZXJ5KGRvY3VtZW50KS5mb3VuZGF0aW9uKCk7XG4iLCIvLyBKb3lyaWRlIGRlbW9cbiQoJyNzdGFydC1qcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAkKGRvY3VtZW50KS5mb3VuZGF0aW9uKCdqb3lyaWRlJywnc3RhcnQnKTtcbn0pOyIsImpRdWVyeShmdW5jdGlvbigkKXtcblx0Rm91bmRhdGlvbi5yZUluaXQoJ2VxdWFsaXplcicpO1xuICAgIGlmICgkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmxlbmd0aCkgeyAvL2FyZSB3ZSBldmVuIG9uIGEgcGFnZSB3aXRoIGluZmluaXRlIHNjcm9sbD9cbiAgICAgICAgLy9oaWRlIGV4aXN0aW5nIHBhZ2VyXG4gICAgICAgICQoXCIucGFnaW5hdGlvbi1jZW50ZXJlZFwiKS5oaWRlKCk7XG4gICAgICAgICQoJyNjb250ZW50LWdyaWQtY29udGFpbmVyJykuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJsb2FkLW1vcmVcIj48L3NwYW4+JyApO1xuICAgICAgICAvLyQoICcjY29udGVudC1ncmlkLWNvbnRhaW5lcicgKS5mb3VuZGF0aW9uKCk7IC8vaW5pdGlhbGl6ZSBlcXVhbGl6ZXIgdGhlIGZpcnN0IHRpbWVcblxuICAgICAgICAvL1JlaW5pdGlhbGl6ZSBlcXVhbGl6ZXIgb24gZXZlcnkgYWpheCBjYWxsXG4gICAgICAgICQoIGRvY3VtZW50ICkuYWpheENvbXBsZXRlKCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvdW5kYXRpb24ucmVJbml0KCdlcXVhbGl6ZXInKTsgLy9odHRwOi8vZm91bmRhdGlvbi56dXJiLmNvbS9mb3J1bS9wb3N0cy8zOTM2My1yZWZsb3ctZXF1YWxpc2VyXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBidXR0b24gPSAkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lciAubG9hZC1tb3JlJyk7XG4gICAgICAgIHZhciBwYWdlID0gMjtcbiAgICAgICAgdmFyIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdmFyIGFsbERvbmUgPSBmYWxzZTtcbiAgICAgICAgdmFyIHNjcm9sbEhhbmRsaW5nID0ge1xuICAgICAgICAgICAgYWxsb3c6IHRydWUsXG4gICAgICAgICAgICByZWFsbG93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY3JvbGxIYW5kbGluZy5hbGxvdyA9IHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsYXk6IDQwMCAvLyhtaWxsaXNlY29uZHMpIGFkanVzdCB0byB0aGUgaGlnaGVzdCBhY2NlcHRhYmxlIHZhbHVlXG4gICAgICAgIH07XG5cbiAgICAgICAgJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYoICEgbG9hZGluZyAmJiBzY3JvbGxIYW5kbGluZy5hbGxvdyApIHtcbiAgICAgICAgICAgICAgICBpZiAoIGFsbERvbmUgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHNjcm9sbEhhbmRsaW5nLnJlYWxsb3csIHNjcm9sbEhhbmRsaW5nLmRlbGF5KTtcbiAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJChidXR0b24pLm9mZnNldCgpLnRvcCAtICQod2luZG93KS5zY3JvbGxUb3AoKTtcbiAgICAgICAgICAgICAgICBpZiggNDAwMCA+IG9mZnNldCApIHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnYmVfYWpheF9sb2FkX21vcmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9uY2U6IGJlbG9hZG1vcmUubm9uY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdlOiBwYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnk6IGJlbG9hZG1vcmUucXVlcnksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICQucG9zdChiZWxvYWRtb3JlLnVybCwgZGF0YSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggcmVzLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcuY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggcmVzLmRhdGEgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcuY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggYnV0dG9uICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZSA9IHBhZ2UgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyQoICcjY29udGVudC1ncmlkLWNvbnRhaW5lcicgKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoICFyZXMuZGF0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVx0XG59KTsiLCIvL0dlbmVyYWwgc2l0ZS13aWRlIHNjcmlwdHMgZm9yIE1TUCBGbHkgTWFnXG5cbiQoJy5tY19pbnB1dCcpLmF0dHIoXCJwbGFjZWhvbGRlclwiLCBcIkVudGVyIHlvdXIgZW1haWwgYWRkcmVzc1wiKTtcblxuaWYod2luZG93LmxvY2F0aW9uLmhyZWYuaW5kZXhPZihcIiNtY19zaWdudXBcIikgPiAtMSkge1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IFxuXHRcdHZhciBzaGFyZUNvbnRhaW5lciA9ICQoJyNzaGFyZS1mb2xsb3cnKTtcblx0XHR2YXIgc2hhcmVQb3NpdGlvbiA9IHNoYXJlQ29udGFpbmVyLm9mZnNldCgpLnRvcDtcblx0XHQkKFwiaHRtbCwgYm9keVwiKS5hbmltYXRlKHsgc2Nyb2xsVG9wOiBzaGFyZVBvc2l0aW9uLTQwfSwgNTAwKTtcblx0IH0sIDUwMCk7XG5cblx0XG59IiwiIiwiJCgnLnBob3RvLWNhcm91c2VsLXNsaWRlcycpLnNsaWNrKHtcbiAgc2xpZGU6ICdsaScsXG4gIHNsaWRlc1RvU2hvdzogMSxcbiAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gIGFycm93czogZmFsc2UsXG4gIGZhZGU6IHRydWUsXG4gIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLWNvbnRyb2xzJ1xufSk7XG5cbiQoJy5waG90by1jYXJvdXNlbC1jb250cm9scycpLnNsaWNrKHtcbiAgc2xpZGU6ICdsaScsXG4gIHNsaWRlc1RvU2hvdzogNyxcbiAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLXNsaWRlcycsXG4gIGFycm93czogZmFsc2UsXG4gIGRvdHM6IGZhbHNlLFxuICBjZW50ZXJNb2RlOiBmYWxzZSxcbiAgZm9jdXNPblNlbGVjdDogdHJ1ZVxufSk7IiwiXG4kKHdpbmRvdykuYmluZCgnIGxvYWQgcmVzaXplIG9yaWVudGF0aW9uQ2hhbmdlICcsIGZ1bmN0aW9uICgpIHtcbiAgIHZhciBmb290ZXIgPSAkKFwiI2Zvb3Rlci1jb250YWluZXJcIik7XG4gICB2YXIgcG9zID0gZm9vdGVyLnBvc2l0aW9uKCk7XG4gICB2YXIgaGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgaGVpZ2h0ID0gaGVpZ2h0IC0gcG9zLnRvcDtcbiAgIGhlaWdodCA9IGhlaWdodCAtIGZvb3Rlci5oZWlnaHQoKSAtMTtcblxuICAgZnVuY3Rpb24gc3RpY2t5Rm9vdGVyKCkge1xuICAgICBmb290ZXIuY3NzKHtcbiAgICAgICAgICdtYXJnaW4tdG9wJzogaGVpZ2h0ICsgJ3B4J1xuICAgICB9KTtcbiAgIH1cblxuICAgaWYgKGhlaWdodCA+IDApIHtcbiAgICAgc3RpY2t5Rm9vdGVyKCk7XG4gICB9XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
