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

//if(window.location.href.indexOf("#mc_signup") > -1) {
//	setTimeout(function(){ 
//		var shareContainer = $('#share-follow');
//		var sharePosition = shareContainer.offset().top;
//		$("html, body").animate({ scrollTop: sharePosition-40}, 500);
//	 }, 500);
//}

//Hide mobile topbar logo until we scroll down page
$(window).scroll(function () {
  console.log($('.title-bar-title').offset().top);
  if ($('.title-bar-title').offset().top > 148) {
    $('.home .mobile-logo').removeClass('hide');
  } else {
    $('.home .mobile-logo').addClass('hide');
  }
});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub2ZmY2FudmFzLmpzIiwiZm91bmRhdGlvbi5vcmJpdC5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnUuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGUuanMiLCJmb3VuZGF0aW9uLnJldmVhbC5qcyIsImZvdW5kYXRpb24uc2xpZGVyLmpzIiwiZm91bmRhdGlvbi5zdGlja3kuanMiLCJmb3VuZGF0aW9uLnRhYnMuanMiLCJmb3VuZGF0aW9uLnRvZ2dsZXIuanMiLCJmb3VuZGF0aW9uLnRvb2x0aXAuanMiLCJtb3Rpb24tdWkuanMiLCJmbGV4LXZpZGVvLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwiam95cmlkZS1kZW1vLmpzIiwibG9hZC1tb3JlLmpzIiwibXNwZmx5LmpzIiwib2ZmQ2FudmFzLmpzIiwicGhvdG8tY2Fyb3VzZWwuanMiLCJzdGlja3lmb290ZXIuanMiXSwibmFtZXMiOlsid2luZG93Iiwid2hhdElucHV0IiwiYWN0aXZlS2V5cyIsImJvZHkiLCJidWZmZXIiLCJjdXJyZW50SW5wdXQiLCJub25UeXBpbmdJbnB1dHMiLCJtb3VzZVdoZWVsIiwiZGV0ZWN0V2hlZWwiLCJpZ25vcmVNYXAiLCJpbnB1dE1hcCIsImlucHV0VHlwZXMiLCJrZXlNYXAiLCJwb2ludGVyTWFwIiwidGltZXIiLCJldmVudEJ1ZmZlciIsImNsZWFyVGltZXIiLCJzZXRJbnB1dCIsImV2ZW50Iiwic2V0VGltZW91dCIsImJ1ZmZlcmVkRXZlbnQiLCJ1bkJ1ZmZlcmVkRXZlbnQiLCJjbGVhclRpbWVvdXQiLCJldmVudEtleSIsImtleSIsInZhbHVlIiwidHlwZSIsInBvaW50ZXJUeXBlIiwiZXZlbnRUYXJnZXQiLCJ0YXJnZXQiLCJldmVudFRhcmdldE5vZGUiLCJub2RlTmFtZSIsInRvTG93ZXJDYXNlIiwiZXZlbnRUYXJnZXRUeXBlIiwiZ2V0QXR0cmlidXRlIiwiaGFzQXR0cmlidXRlIiwiaW5kZXhPZiIsInN3aXRjaElucHV0IiwibG9nS2V5cyIsInN0cmluZyIsInNldEF0dHJpYnV0ZSIsInB1c2giLCJrZXlDb2RlIiwid2hpY2giLCJzcmNFbGVtZW50IiwidW5Mb2dLZXlzIiwiYXJyYXlQb3MiLCJzcGxpY2UiLCJiaW5kRXZlbnRzIiwiZG9jdW1lbnQiLCJQb2ludGVyRXZlbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiTVNQb2ludGVyRXZlbnQiLCJjcmVhdGVFbGVtZW50Iiwib25tb3VzZXdoZWVsIiwidW5kZWZpbmVkIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJhc2siLCJrZXlzIiwidHlwZXMiLCJzZXQiLCIkIiwiRk9VTkRBVElPTl9WRVJTSU9OIiwiRm91bmRhdGlvbiIsInZlcnNpb24iLCJfcGx1Z2lucyIsIl91dWlkcyIsInJ0bCIsImF0dHIiLCJwbHVnaW4iLCJuYW1lIiwiY2xhc3NOYW1lIiwiZnVuY3Rpb25OYW1lIiwiYXR0ck5hbWUiLCJoeXBoZW5hdGUiLCJyZWdpc3RlclBsdWdpbiIsInBsdWdpbk5hbWUiLCJjb25zdHJ1Y3RvciIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJ1bnJlZ2lzdGVyUGx1Z2luIiwicmVtb3ZlQXR0ciIsInJlbW92ZURhdGEiLCJwcm9wIiwicmVJbml0IiwicGx1Z2lucyIsImlzSlEiLCJlYWNoIiwiX2luaXQiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJsZW5ndGgiLCJuYW1lc3BhY2UiLCJNYXRoIiwicm91bmQiLCJwb3ciLCJyYW5kb20iLCJ0b1N0cmluZyIsInNsaWNlIiwicmVmbG93IiwiZWxlbSIsImkiLCIkZWxlbSIsImZpbmQiLCJhZGRCYWNrIiwiJGVsIiwib3B0cyIsIndhcm4iLCJ0aGluZyIsInNwbGl0IiwiZSIsIm9wdCIsIm1hcCIsImVsIiwidHJpbSIsInBhcnNlVmFsdWUiLCJlciIsImdldEZuTmFtZSIsInRyYW5zaXRpb25lbmQiLCJ0cmFuc2l0aW9ucyIsImVuZCIsInQiLCJzdHlsZSIsInRyaWdnZXJIYW5kbGVyIiwidXRpbCIsInRocm90dGxlIiwiZnVuYyIsImRlbGF5IiwiY29udGV4dCIsImFyZ3MiLCJhcmd1bWVudHMiLCJhcHBseSIsIm1ldGhvZCIsIiRtZXRhIiwiJG5vSlMiLCJhcHBlbmRUbyIsImhlYWQiLCJyZW1vdmVDbGFzcyIsIk1lZGlhUXVlcnkiLCJjYWxsIiwicGx1Z0NsYXNzIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0Iiwid2luWSIsInBhZ2VZT2Zmc2V0Iiwid2luWCIsInBhZ2VYT2Zmc2V0IiwicGFyZW50RGltcyIsImFuY2hvciIsInBvc2l0aW9uIiwidk9mZnNldCIsImhPZmZzZXQiLCJpc092ZXJmbG93IiwiJGVsZURpbXMiLCIkYW5jaG9yRGltcyIsImtleUNvZGVzIiwiY29tbWFuZHMiLCJLZXlib2FyZCIsImdldEtleUNvZGVzIiwicGFyc2VLZXkiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJrY3MiLCJrIiwia2MiLCJkZWZhdWx0UXVlcmllcyIsImxhbmRzY2FwZSIsInBvcnRyYWl0IiwicmV0aW5hIiwicXVlcmllcyIsImN1cnJlbnQiLCJzZWxmIiwiZXh0cmFjdGVkU3R5bGVzIiwiY3NzIiwibmFtZWRRdWVyaWVzIiwicGFyc2VTdHlsZVRvT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCJfZ2V0Q3VycmVudFNpemUiLCJfd2F0Y2hlciIsImF0TGVhc3QiLCJzaXplIiwicXVlcnkiLCJnZXQiLCJtYXRjaE1lZGlhIiwibWF0Y2hlcyIsIm1hdGNoZWQiLCJvbiIsIm5ld1NpemUiLCJjdXJyZW50U2l6ZSIsInN0eWxlTWVkaWEiLCJtZWRpYSIsInNjcmlwdCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwiaW5mbyIsImlkIiwiaW5zZXJ0QmVmb3JlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImN1cnJlbnRTdHlsZSIsIm1hdGNoTWVkaXVtIiwidGV4dCIsInN0eWxlU2hlZXQiLCJjc3NUZXh0IiwidGV4dENvbnRlbnQiLCJzdHlsZU9iamVjdCIsInJlZHVjZSIsInJldCIsInBhcmFtIiwicGFydHMiLCJ2YWwiLCJkZWNvZGVVUklDb21wb25lbnQiLCJpc0FycmF5IiwiaW5pdENsYXNzZXMiLCJhY3RpdmVDbGFzc2VzIiwiTW90aW9uIiwiYW5pbWF0ZUluIiwiYW5pbWF0aW9uIiwiY2IiLCJhbmltYXRlIiwiYW5pbWF0ZU91dCIsIk1vdmUiLCJkdXJhdGlvbiIsImFuaW0iLCJwcm9nIiwibW92ZSIsInRzIiwiaXNJbiIsImVxIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwic2luZ2xlSW1hZ2VMb2FkZWQiLCJuYXR1cmFsV2lkdGgiLCJzcG90U3dpcGUiLCJlbmFibGVkIiwiZG9jdW1lbnRFbGVtZW50IiwicHJldmVudERlZmF1bHQiLCJtb3ZlVGhyZXNob2xkIiwidGltZVRocmVzaG9sZCIsInN0YXJ0UG9zWCIsInN0YXJ0UG9zWSIsInN0YXJ0VGltZSIsImVsYXBzZWRUaW1lIiwiaXNNb3ZpbmciLCJvblRvdWNoRW5kIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9uVG91Y2hNb3ZlIiwieCIsInRvdWNoZXMiLCJwYWdlWCIsInkiLCJwYWdlWSIsImR4IiwiZHkiLCJkaXIiLCJhYnMiLCJvblRvdWNoU3RhcnQiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJsb2FkIiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJjbG9zZW1lTGlzdGVuZXIiLCJ5ZXRpQm94ZXMiLCJwbHVnTmFtZXMiLCJsaXN0ZW5lcnMiLCJqb2luIiwib2ZmIiwicGx1Z2luSWQiLCJub3QiLCJkZWJvdW5jZSIsIiRub2RlcyIsIm5vZGVzIiwicXVlcnlTZWxlY3RvckFsbCIsImxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24iLCJtdXRhdGlvblJlY29yZHNMaXN0IiwiJHRhcmdldCIsImVsZW1lbnRPYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVzIiwiY2hpbGRMaXN0IiwiY2hhcmFjdGVyRGF0YSIsInN1YnRyZWUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJJSGVhcllvdSIsIkFiaWRlIiwiZGVmYXVsdHMiLCIkaW5wdXRzIiwiX2V2ZW50cyIsInJlc2V0Rm9ybSIsInZhbGlkYXRlRm9ybSIsInZhbGlkYXRlT24iLCJ2YWxpZGF0ZUlucHV0IiwibGl2ZVZhbGlkYXRlIiwiaXNHb29kIiwiY2hlY2tlZCIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCIkbGFiZWwiLCJjbG9zZXN0IiwiJGVscyIsImxhYmVscyIsImZpbmRMYWJlbCIsIiRmb3JtRXJyb3IiLCJmaW5kRm9ybUVycm9yIiwibGFiZWxFcnJvckNsYXNzIiwiZm9ybUVycm9yQ2xhc3MiLCJpbnB1dEVycm9yQ2xhc3MiLCJncm91cE5hbWUiLCIkbGFiZWxzIiwiZmluZFJhZGlvTGFiZWxzIiwiJGZvcm1FcnJvcnMiLCJyZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcyIsImNsZWFyUmVxdWlyZSIsInJlcXVpcmVkQ2hlY2siLCJ2YWxpZGF0ZWQiLCJjdXN0b21WYWxpZGF0b3IiLCJ2YWxpZGF0b3IiLCJlcXVhbFRvIiwidmFsaWRhdGVSYWRpbyIsInZhbGlkYXRlVGV4dCIsIm1hdGNoVmFsaWRhdGlvbiIsInZhbGlkYXRvcnMiLCJnb29kVG9HbyIsIm1lc3NhZ2UiLCJhY2MiLCJub0Vycm9yIiwicGF0dGVybiIsImlucHV0VGV4dCIsInZhbGlkIiwicGF0dGVybnMiLCJSZWdFeHAiLCIkZ3JvdXAiLCJyZXF1aXJlZCIsImNsZWFyIiwidiIsIiRmb3JtIiwicmVtb3ZlRXJyb3JDbGFzc2VzIiwiYWxwaGEiLCJhbHBoYV9udW1lcmljIiwiaW50ZWdlciIsIm51bWJlciIsImNhcmQiLCJjdnYiLCJlbWFpbCIsInVybCIsImRvbWFpbiIsImRhdGV0aW1lIiwiZGF0ZSIsInRpbWUiLCJkYXRlSVNPIiwibW9udGhfZGF5X3llYXIiLCJkYXlfbW9udGhfeWVhciIsImNvbG9yIiwiQWNjb3JkaW9uIiwiJHRhYnMiLCJpZHgiLCIkY29udGVudCIsImxpbmtJZCIsIiRpbml0QWN0aXZlIiwiZG93biIsIiR0YWJDb250ZW50IiwiaGFzQ2xhc3MiLCJhbGxvd0FsbENsb3NlZCIsInVwIiwidG9nZ2xlIiwibmV4dCIsIiRhIiwiZm9jdXMiLCJtdWx0aUV4cGFuZCIsInByZXZpb3VzIiwicHJldiIsImZpcnN0VGltZSIsIiRjdXJyZW50QWN0aXZlIiwic2xpZGVEb3duIiwic2xpZGVTcGVlZCIsIiRhdW50cyIsImNhbkNsb3NlIiwic2xpZGVVcCIsInN0b3AiLCJBY2NvcmRpb25NZW51IiwibXVsdGlPcGVuIiwiJG1lbnVMaW5rcyIsInN1YklkIiwiaXNBY3RpdmUiLCJpbml0UGFuZXMiLCIkc3VibWVudSIsIiRlbGVtZW50cyIsIiRwcmV2RWxlbWVudCIsIiRuZXh0RWxlbWVudCIsIm1pbiIsInBhcmVudHMiLCJvcGVuIiwiY2xvc2UiLCJjbG9zZUFsbCIsImhpZGVBbGwiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJwYXJlbnRzVW50aWwiLCJhZGQiLCIkbWVudXMiLCJEcmlsbGRvd24iLCIkc3VibWVudUFuY2hvcnMiLCIkc3VibWVudXMiLCIkbWVudUl0ZW1zIiwiX3ByZXBhcmVNZW51IiwiX2tleWJvYXJkRXZlbnRzIiwiJGxpbmsiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsInByZXBlbmQiLCJiYWNrQnV0dG9uIiwiX2JhY2siLCIkd3JhcHBlciIsIndyYXBwZXIiLCJfZ2V0TWF4RGltcyIsIl9zaG93IiwiY2xvc2VPbkNsaWNrIiwiJGJvZHkiLCJjb250YWlucyIsIl9oaWRlQWxsIiwiX2hpZGUiLCJibHVyIiwicmVzdWx0IiwibnVtT2ZFbGVtcyIsInVud3JhcCIsInJlbW92ZSIsIkRyb3Bkb3duIiwiJGlkIiwiJGFuY2hvciIsInBvc2l0aW9uQ2xhc3MiLCJnZXRQb3NpdGlvbkNsYXNzIiwiY291bnRlciIsInVzZWRQb3NpdGlvbnMiLCJ2ZXJ0aWNhbFBvc2l0aW9uIiwibWF0Y2giLCJob3Jpem9udGFsUG9zaXRpb24iLCJjbGFzc0NoYW5nZWQiLCJkaXJlY3Rpb24iLCJfcmVwb3NpdGlvbiIsIl9zZXRQb3NpdGlvbiIsImhvdmVyIiwidGltZW91dCIsImhvdmVyRGVsYXkiLCJob3ZlclBhbmUiLCJ2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMiLCJ0YWJfZm9yd2FyZCIsInRyYXBGb2N1cyIsInRhYl9iYWNrd2FyZCIsImF1dG9Gb2N1cyIsIiRmb2N1c2FibGUiLCJfYWRkQm9keUhhbmRsZXIiLCJjdXJQb3NpdGlvbkNsYXNzIiwiRHJvcGRvd25NZW51Iiwic3VicyIsInZlcnRpY2FsQ2xhc3MiLCJyaWdodENsYXNzIiwiYWxpZ25tZW50IiwiY2hhbmdlZCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIiRzaWJzIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJFcXVhbGl6ZXIiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsImlzT24iLCJfYmluZEhhbmRsZXIiLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9yZWZsb3ciLCJfcGF1c2VFdmVudHMiLCJlcXVhbGl6ZU9uU3RhY2siLCJfaXNTdGFja2VkIiwiZXF1YWxpemVCeVJvdyIsImdldEhlaWdodHNCeVJvdyIsImFwcGx5SGVpZ2h0QnlSb3ciLCJnZXRIZWlnaHRzIiwiYXBwbHlIZWlnaHQiLCJoZWlnaHRzIiwibGVuIiwib2Zmc2V0SGVpZ2h0IiwibGFzdEVsVG9wT2Zmc2V0IiwiZ3JvdXBzIiwiZ3JvdXAiLCJlbE9mZnNldFRvcCIsImoiLCJsbiIsImdyb3Vwc0lMZW5ndGgiLCJsZW5KIiwiSW50ZXJjaGFuZ2UiLCJydWxlcyIsImN1cnJlbnRQYXRoIiwiX2FkZEJyZWFrcG9pbnRzIiwiX2dlbmVyYXRlUnVsZXMiLCJydWxlIiwicGF0aCIsIlNQRUNJQUxfUVVFUklFUyIsInJ1bGVzTGlzdCIsInJlc3BvbnNlIiwiaHRtbCIsIk1hZ2VsbGFuIiwiJHRhcmdldHMiLCIkbGlua3MiLCIkYWN0aXZlIiwic2Nyb2xsUG9zIiwicGFyc2VJbnQiLCJwb2ludHMiLCJ3aW5IZWlnaHQiLCJpbm5lckhlaWdodCIsImNsaWVudEhlaWdodCIsImRvY0hlaWdodCIsInNjcm9sbEhlaWdodCIsIiR0YXIiLCJwdCIsInRocmVzaG9sZCIsInRhcmdldFBvaW50IiwiYW5pbWF0aW9uRHVyYXRpb24iLCJlYXNpbmciLCJhbmltYXRpb25FYXNpbmciLCJkZWVwTGlua2luZyIsImxvY2F0aW9uIiwiaGFzaCIsInNjcm9sbFRvTG9jIiwiY2FsY1BvaW50cyIsIl91cGRhdGVBY3RpdmUiLCJhcnJpdmFsIiwibG9jIiwiYmFyT2Zmc2V0Iiwic2Nyb2xsVG9wIiwid2luUG9zIiwiY3VySWR4IiwiaXNEb3duIiwiY3VyVmlzaWJsZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJPZmZDYW52YXMiLCIkbGFzdFRyaWdnZXIiLCIkdHJpZ2dlcnMiLCIkZXhpdGVyIiwiZXhpdGVyIiwiYXBwZW5kIiwiaXNSZXZlYWxlZCIsInJldmVhbENsYXNzIiwicmV2ZWFsT24iLCJfc2V0TVFDaGVja2VyIiwidHJhbnNpdGlvblRpbWUiLCJfaGFuZGxlS2V5Ym9hcmQiLCJyZXZlYWwiLCIkY2xvc2VyIiwiZm9yY2VUb3AiLCJfdHJhcEZvY3VzIiwiZm9jdXNhYmxlIiwibGFzdCIsImtleWNvZGUiLCJPcmJpdCIsImNvbnRhaW5lckNsYXNzIiwiJHNsaWRlcyIsInNsaWRlQ2xhc3MiLCIkaW1hZ2VzIiwiaW5pdEFjdGl2ZSIsInVzZU1VSSIsIl9wcmVwYXJlRm9yT3JiaXQiLCJidWxsZXRzIiwiX2xvYWRCdWxsZXRzIiwiYXV0b1BsYXkiLCJnZW9TeW5jIiwiYWNjZXNzaWJsZSIsIiRidWxsZXRzIiwiYm94T2ZCdWxsZXRzIiwidGltZXJEZWxheSIsImNoYW5nZVNsaWRlIiwiX3NldFdyYXBwZXJIZWlnaHQiLCJfc2V0U2xpZGVIZWlnaHQiLCJ0ZW1wIiwicGF1c2VPbkhvdmVyIiwibmF2QnV0dG9ucyIsIiRjb250cm9scyIsIm5leHRDbGFzcyIsInByZXZDbGFzcyIsIiRzbGlkZSIsImlzTFRSIiwiY2hvc2VuU2xpZGUiLCIkY3VyU2xpZGUiLCIkZmlyc3RTbGlkZSIsIiRsYXN0U2xpZGUiLCJkaXJJbiIsImRpck91dCIsIiRuZXdTbGlkZSIsImluZmluaXRlV3JhcCIsIl91cGRhdGVCdWxsZXRzIiwiJG9sZEJ1bGxldCIsInNwYW4iLCJkZXRhY2giLCIkbmV3QnVsbGV0IiwiYW5pbUluRnJvbVJpZ2h0IiwiYW5pbU91dFRvUmlnaHQiLCJhbmltSW5Gcm9tTGVmdCIsImFuaW1PdXRUb0xlZnQiLCJSZXNwb25zaXZlTWVudSIsImN1cnJlbnRNcSIsImN1cnJlbnRQbHVnaW4iLCJydWxlc1RyZWUiLCJydWxlU2l6ZSIsInJ1bGVQbHVnaW4iLCJNZW51UGx1Z2lucyIsImlzRW1wdHlPYmplY3QiLCJfY2hlY2tNZWRpYVF1ZXJpZXMiLCJtYXRjaGVkTXEiLCJjc3NDbGFzcyIsImRlc3Ryb3kiLCJkcm9wZG93biIsImRyaWxsZG93biIsImFjY29yZGlvbiIsIlJlc3BvbnNpdmVUb2dnbGUiLCJ0YXJnZXRJRCIsIiR0YXJnZXRNZW51IiwiJHRvZ2dsZXIiLCJfdXBkYXRlIiwiX3VwZGF0ZU1xSGFuZGxlciIsInRvZ2dsZU1lbnUiLCJoaWRlRm9yIiwiUmV2ZWFsIiwiY2FjaGVkIiwibXEiLCJpc01vYmlsZSIsIm1vYmlsZVNuaWZmIiwiZnVsbFNjcmVlbiIsIm92ZXJsYXkiLCIkb3ZlcmxheSIsIl9tYWtlT3ZlcmxheSIsImRlZXBMaW5rIiwib3V0ZXJXaWR0aCIsIm91dGVySGVpZ2h0IiwibWFyZ2luIiwiX3VwZGF0ZVBvc2l0aW9uIiwiX2hhbmRsZVN0YXRlIiwibXVsdGlwbGVPcGVuZWQiLCJhbmltYXRpb25JbiIsImFmdGVyQW5pbWF0aW9uRm9jdXMiLCJsb2ciLCJmb2N1c2FibGVFbGVtZW50cyIsInNob3dEZWxheSIsIm9yaWdpbmFsU2Nyb2xsUG9zIiwiX2V4dHJhSGFuZGxlcnMiLCJjbG9zZU9uRXNjIiwiYW5pbWF0aW9uT3V0IiwiZmluaXNoVXAiLCJoaWRlRGVsYXkiLCJyZXNldE9uQ2xvc2UiLCJyZXBsYWNlU3RhdGUiLCJ0aXRsZSIsInBhdGhuYW1lIiwiYnRtT2Zmc2V0UGN0IiwiaVBob25lU25pZmYiLCJhbmRyb2lkU25pZmYiLCJTbGlkZXIiLCJpbnB1dHMiLCJoYW5kbGVzIiwiJGhhbmRsZSIsIiRpbnB1dCIsIiRmaWxsIiwidmVydGljYWwiLCJpc0RibCIsImRpc2FibGVkIiwiZGlzYWJsZWRDbGFzcyIsImJpbmRpbmciLCJfc2V0SW5pdEF0dHIiLCJkb3VibGVTaWRlZCIsIiRoYW5kbGUyIiwiJGlucHV0MiIsIl9zZXRIYW5kbGVQb3MiLCJpbml0aWFsU3RhcnQiLCJpbml0aWFsRW5kIiwiJGhuZGwiLCJub0ludmVydCIsImgyVmFsIiwic3RlcCIsImgxVmFsIiwidmVydCIsImhPclciLCJsT3JUIiwiaGFuZGxlRGltIiwiZWxlbURpbSIsInBjdE9mQmFyIiwicGVyY2VudCIsInRvRml4ZWQiLCJweFRvTW92ZSIsIm1vdmVtZW50IiwiZGVjaW1hbCIsIl9zZXRWYWx1ZXMiLCJpc0xlZnRIbmRsIiwiZGltIiwiaGFuZGxlUGN0IiwiaGFuZGxlUG9zIiwibW92ZVRpbWUiLCJjaGFuZ2VkRGVsYXkiLCJoYXNWYWwiLCJldmVudE9mZnNldCIsImhhbGZPZkhhbmRsZSIsImJhckRpbSIsIndpbmRvd1Njcm9sbCIsInNjcm9sbExlZnQiLCJlbGVtT2Zmc2V0IiwiZXZlbnRGcm9tQmFyIiwiYmFyWFkiLCJvZmZzZXRQY3QiLCJfYWRqdXN0VmFsdWUiLCJmaXJzdEhuZGxQb3MiLCJhYnNQb3NpdGlvbiIsInNlY25kSG5kbFBvcyIsImRpdiIsInByZXZfdmFsIiwibmV4dF92YWwiLCJjdXJIYW5kbGUiLCJfaGFuZGxlRXZlbnQiLCJjbGlja1NlbGVjdCIsImRyYWdnYWJsZSIsImN1cnJlbnRUYXJnZXQiLCJfJGhhbmRsZSIsIm9sZFZhbHVlIiwibmV3VmFsdWUiLCJkZWNyZWFzZSIsImluY3JlYXNlIiwiZGVjcmVhc2VfZmFzdCIsImluY3JlYXNlX2Zhc3QiLCJpbnZlcnRWZXJ0aWNhbCIsImZyYWMiLCJudW0iLCJjbGlja1BvcyIsIlN0aWNreSIsIiRwYXJlbnQiLCJ3YXNXcmFwcGVkIiwiJGNvbnRhaW5lciIsImNvbnRhaW5lciIsIndyYXBJbm5lciIsInN0aWNreUNsYXNzIiwic2Nyb2xsQ291bnQiLCJjaGVja0V2ZXJ5IiwiaXNTdHVjayIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsIl9jYWxjIiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwic2Nyb2xsIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJlbGVtSGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiY29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIiRmaXJzdFRhYiIsIiRsYXN0VGFiIiwid3JhcE9uS2V5cyIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCIkb2xkVGFiIiwiaWRTdHIiLCJwYW5lbENsYXNzIiwicGFuZWwiLCJjaGVja0NsYXNzIiwiVG9nZ2xlciIsImlucHV0IiwidG9nZ2xlQ2xhc3MiLCJfdXBkYXRlQVJJQSIsIlRvb2x0aXAiLCJpc0NsaWNrIiwiZWxlbUlkIiwiX2dldFBvc2l0aW9uQ2xhc3MiLCJ0aXBUZXh0IiwidGVtcGxhdGUiLCJfYnVpbGRUZW1wbGF0ZSIsInRyaWdnZXJDbGFzcyIsInRlbXBsYXRlQ2xhc3NlcyIsInRvb2x0aXBDbGFzcyIsIiR0ZW1wbGF0ZSIsIiR0aXBEaW1zIiwic2hvd09uIiwiZmFkZUluIiwiZmFkZUluRHVyYXRpb24iLCJmYWRlT3V0RHVyYXRpb24iLCJpc0ZvY3VzIiwiZGlzYWJsZUZvclRvdWNoIiwidG91Y2hDbG9zZVRleHQiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwiYWpheENvbXBsZXRlIiwiYnV0dG9uIiwicGFnZSIsImxvYWRpbmciLCJhbGxEb25lIiwic2Nyb2xsSGFuZGxpbmciLCJhbGxvdyIsInJlYWxsb3ciLCJhY3Rpb24iLCJub25jZSIsImJlbG9hZG1vcmUiLCJwb3N0IiwicmVzIiwic3VjY2VzcyIsImZhaWwiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwic2xpY2siLCJzbGlkZSIsInNsaWRlc1RvU2hvdyIsInNsaWRlc1RvU2Nyb2xsIiwiYXJyb3dzIiwiZmFkZSIsImFzTmF2Rm9yIiwiZG90cyIsImNlbnRlck1vZGUiLCJmb2N1c09uU2VsZWN0IiwiZm9vdGVyIiwicG9zIiwic3RpY2t5Rm9vdGVyIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxPQUFPQyxTQUFQLEdBQW9CLFlBQVc7O0FBRTdCOztBQUVBOzs7Ozs7QUFNQTs7QUFDQSxNQUFJQyxhQUFhLEVBQWpCOztBQUVBO0FBQ0EsTUFBSUMsSUFBSjs7QUFFQTtBQUNBLE1BQUlDLFNBQVMsS0FBYjs7QUFFQTtBQUNBLE1BQUlDLGVBQWUsSUFBbkI7O0FBRUE7QUFDQSxNQUFJQyxrQkFBa0IsQ0FDcEIsUUFEb0IsRUFFcEIsVUFGb0IsRUFHcEIsTUFIb0IsRUFJcEIsT0FKb0IsRUFLcEIsT0FMb0IsRUFNcEIsT0FOb0IsRUFPcEIsUUFQb0IsQ0FBdEI7O0FBVUE7QUFDQTtBQUNBLE1BQUlDLGFBQWFDLGFBQWpCOztBQUVBO0FBQ0E7QUFDQSxNQUFJQyxZQUFZLENBQ2QsRUFEYyxFQUNWO0FBQ0osSUFGYyxFQUVWO0FBQ0osSUFIYyxFQUdWO0FBQ0osSUFKYyxFQUlWO0FBQ0osSUFMYyxDQUtWO0FBTFUsR0FBaEI7O0FBUUE7QUFDQSxNQUFJQyxXQUFXO0FBQ2IsZUFBVyxVQURFO0FBRWIsYUFBUyxVQUZJO0FBR2IsaUJBQWEsT0FIQTtBQUliLGlCQUFhLE9BSkE7QUFLYixxQkFBaUIsU0FMSjtBQU1iLHFCQUFpQixTQU5KO0FBT2IsbUJBQWUsU0FQRjtBQVFiLG1CQUFlLFNBUkY7QUFTYixrQkFBYztBQVRELEdBQWY7O0FBWUE7QUFDQUEsV0FBU0YsYUFBVCxJQUEwQixPQUExQjs7QUFFQTtBQUNBLE1BQUlHLGFBQWEsRUFBakI7O0FBRUE7QUFD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Um1CLENBQXBDOzs7QUNSQXQ4QixFQUFFOUQsTUFBRixFQUFVNkssSUFBVixDQUFlLGlDQUFmLEVBQWtELFlBQVk7QUFDM0QsTUFBSXcxQixTQUFTdjhCLEVBQUUsbUJBQUYsQ0FBYjtBQUNBLE1BQUl3OEIsTUFBTUQsT0FBTzF5QixRQUFQLEVBQVY7QUFDQSxNQUFJaEIsU0FBUzdJLEVBQUU5RCxNQUFGLEVBQVUyTSxNQUFWLEVBQWI7QUFDQUEsV0FBU0EsU0FBUzJ6QixJQUFJajBCLEdBQXRCO0FBQ0FNLFdBQVNBLFNBQVMwekIsT0FBTzF6QixNQUFQLEVBQVQsR0FBMEIsQ0FBbkM7O0FBRUEsV0FBUzR6QixZQUFULEdBQXdCO0FBQ3RCRixXQUFPOXZCLEdBQVAsQ0FBVztBQUNQLG9CQUFjNUQsU0FBUztBQURoQixLQUFYO0FBR0Q7O0FBRUQsTUFBSUEsU0FBUyxDQUFiLEVBQWdCO0FBQ2Q0ekI7QUFDRDtBQUNILENBaEJEIiwiZmlsZSI6ImZvdW5kYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cud2hhdElucHV0ID0gKGZ1bmN0aW9uKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHZhcmlhYmxlc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFycmF5IG9mIGFjdGl2ZWx5IHByZXNzZWQga2V5c1xuICB2YXIgYWN0aXZlS2V5cyA9IFtdO1xuXG4gIC8vIGNhY2hlIGRvY3VtZW50LmJvZHlcbiAgdmFyIGJvZHk7XG5cbiAgLy8gYm9vbGVhbjogdHJ1ZSBpZiB0b3VjaCBidWZmZXIgdGltZXIgaXMgcnVubmluZ1xuICB2YXIgYnVmZmVyID0gZmFsc2U7XG5cbiAgLy8gdGhlIGxhc3QgdXNlZCBpbnB1dCB0eXBlXG4gIHZhciBjdXJyZW50SW5wdXQgPSBudWxsO1xuXG4gIC8vIGBpbnB1dGAgdHlwZXMgdGhhdCBkb24ndCBhY2NlcHQgdGV4dFxuICB2YXIgbm9uVHlwaW5nSW5wdXRzID0gW1xuICAgICdidXR0b24nLFxuICAgICdjaGVja2JveCcsXG4gICAgJ2ZpbGUnLFxuICAgICdpbWFnZScsXG4gICAgJ3JhZGlvJyxcbiAgICAncmVzZXQnLFxuICAgICdzdWJtaXQnXG4gIF07XG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgdmFyIG1vdXNlV2hlZWwgPSBkZXRlY3RXaGVlbCgpO1xuXG4gIC8vIGxpc3Qgb2YgbW9kaWZpZXIga2V5cyBjb21tb25seSB1c2VkIHdpdGggdGhlIG1vdXNlIGFuZFxuICAvLyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgdG8gcHJldmVudCBmYWxzZSBrZXlib2FyZCBkZXRlY3Rpb25cbiAgdmFyIGlnbm9yZU1hcCA9IFtcbiAgICAxNiwgLy8gc2hpZnRcbiAgICAxNywgLy8gY29udHJvbFxuICAgIDE4LCAvLyBhbHRcbiAgICA5MSwgLy8gV2luZG93cyBrZXkgLyBsZWZ0IEFwcGxlIGNtZFxuICAgIDkzICAvLyBXaW5kb3dzIG1lbnUgLyByaWdodCBBcHBsZSBjbWRcbiAgXTtcblxuICAvLyBtYXBwaW5nIG9mIGV2ZW50cyB0byBpbnB1dCB0eXBlc1xuICB2YXIgaW5wdXRNYXAgPSB7XG4gICAgJ2tleWRvd24nOiAna2V5Ym9hcmQnLFxuICAgICdrZXl1cCc6ICdrZXlib2FyZCcsXG4gICAgJ21vdXNlZG93bic6ICdtb3VzZScsXG4gICAgJ21vdXNlbW92ZSc6ICdtb3VzZScsXG4gICAgJ01TUG9pbnRlckRvd24nOiAncG9pbnRlcicsXG4gICAgJ01TUG9pbnRlck1vdmUnOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJkb3duJzogJ3BvaW50ZXInLFxuICAgICdwb2ludGVybW92ZSc6ICdwb2ludGVyJyxcbiAgICAndG91Y2hzdGFydCc6ICd0b3VjaCdcbiAgfTtcblxuICAvLyBhZGQgY29ycmVjdCBtb3VzZSB3aGVlbCBldmVudCBtYXBwaW5nIHRvIGBpbnB1dE1hcGBcbiAgaW5wdXRNYXBbZGV0ZWN0V2hlZWwoKV0gPSAnbW91c2UnO1xuXG4gIC8vIGFycmF5IG9mIGFsbCB1c2VkIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dFR5cGVzID0gW107XG5cbiAgLy8gbWFwcGluZyBvZiBrZXkgY29kZXMgdG8gYSBjb21tb24gbmFtZVxuICB2YXIga2V5TWFwID0ge1xuICAgIDk6ICd0YWInLFxuICAgIDEzOiAnZW50ZXInLFxuICAgIDE2OiAnc2hpZnQnLFxuICAgIDI3OiAnZXNjJyxcbiAgICAzMjogJ3NwYWNlJyxcbiAgICAzNzogJ2xlZnQnLFxuICAgIDM4OiAndXAnLFxuICAgIDM5OiAncmlnaHQnLFxuICAgIDQwOiAnZG93bidcbiAgfTtcblxuICAvLyBtYXAgb2YgSUUgMTAgcG9pbnRlciBldmVudHNcbiAgdmFyIHBvaW50ZXJNYXAgPSB7XG4gICAgMjogJ3RvdWNoJyxcbiAgICAzOiAndG91Y2gnLCAvLyB0cmVhdCBwZW4gbGlrZSB0b3VjaFxuICAgIDQ6ICdtb3VzZSdcbiAgfTtcblxuICAvLyB0b3VjaCBidWZmZXIgdGltZXJcbiAgdmFyIHRpbWVyO1xuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbnNcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICAvLyBhbGxvd3MgZXZlbnRzIHRoYXQgYXJlIGFsc28gdHJpZ2dlcmVkIHRvIGJlIGZpbHRlcmVkIG91dCBmb3IgYHRvdWNoc3RhcnRgXG4gIGZ1bmN0aW9uIGV2ZW50QnVmZmVyKCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG5cbiAgICBidWZmZXIgPSB0cnVlO1xuICAgIHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBidWZmZXIgPSBmYWxzZTtcbiAgICB9LCA2NTApO1xuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGlmICghYnVmZmVyKSBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkJ1ZmZlcmVkRXZlbnQoZXZlbnQpIHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgc2V0SW5wdXQoZXZlbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJUaW1lcigpIHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldElucHV0KGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgdmFsdWUgPSBpbnB1dE1hcFtldmVudC50eXBlXTtcbiAgICBpZiAodmFsdWUgPT09ICdwb2ludGVyJykgdmFsdWUgPSBwb2ludGVyVHlwZShldmVudCk7XG5cbiAgICAvLyBkb24ndCBkbyBhbnl0aGluZyBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgaW5wdXQgdHlwZSBhbHJlYWR5IHNldFxuICAgIGlmIChjdXJyZW50SW5wdXQgIT09IHZhbHVlKSB7XG4gICAgICB2YXIgZXZlbnRUYXJnZXQgPSB0YXJnZXQoZXZlbnQpO1xuICAgICAgdmFyIGV2ZW50VGFyZ2V0Tm9kZSA9IGV2ZW50VGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXRUeXBlID0gKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JykgPyBldmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA6IG51bGw7XG5cbiAgICAgIGlmIChcbiAgICAgICAgKC8vIG9ubHkgaWYgdGhlIHVzZXIgZmxhZyB0byBhbGxvdyB0eXBpbmcgaW4gZm9ybSBmaWVsZHMgaXNuJ3Qgc2V0XG4gICAgICAgICFib2R5Lmhhc0F0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQtZm9ybXR5cGluZycpICYmXG5cbiAgICAgICAgLy8gb25seSBpZiBjdXJyZW50SW5wdXQgaGFzIGEgdmFsdWVcbiAgICAgICAgY3VycmVudElucHV0ICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgaW5wdXQgaXMgYGtleWJvYXJkYFxuICAgICAgICB2YWx1ZSA9PT0gJ2tleWJvYXJkJyAmJlxuXG4gICAgICAgIC8vIG5vdCBpZiB0aGUga2V5IGlzIGBUQUJgXG4gICAgICAgIGtleU1hcFtldmVudEtleV0gIT09ICd0YWInICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgdGFyZ2V0IGlzIGEgZm9ybSBpbnB1dCB0aGF0IGFjY2VwdHMgdGV4dFxuICAgICAgICAoXG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3RleHRhcmVhJyB8fFxuICAgICAgICAgICBldmVudFRhcmdldE5vZGUgPT09ICdzZWxlY3QnIHx8XG4gICAgICAgICAgIChldmVudFRhcmdldE5vZGUgPT09ICdpbnB1dCcgJiYgbm9uVHlwaW5nSW5wdXRzLmluZGV4T2YoZXZlbnRUYXJnZXRUeXBlKSA8IDApXG4gICAgICAgICkpIHx8IChcbiAgICAgICAgICAvLyBpZ25vcmUgbW9kaWZpZXIga2V5c1xuICAgICAgICAgIGlnbm9yZU1hcC5pbmRleE9mKGV2ZW50S2V5KSA+IC0xXG4gICAgICAgIClcbiAgICAgICkge1xuICAgICAgICAvLyBpZ25vcmUga2V5Ym9hcmQgdHlwaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2hJbnB1dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSAna2V5Ym9hcmQnKSBsb2dLZXlzKGV2ZW50S2V5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN3aXRjaElucHV0KHN0cmluZykge1xuICAgIGN1cnJlbnRJbnB1dCA9IHN0cmluZztcbiAgICBib2R5LnNldEF0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQnLCBjdXJyZW50SW5wdXQpO1xuXG4gICAgaWYgKGlucHV0VHlwZXMuaW5kZXhPZihjdXJyZW50SW5wdXQpID09PSAtMSkgaW5wdXRUeXBlcy5wdXNoKGN1cnJlbnRJbnB1dCk7XG4gIH1cblxuICBmdW5jdGlvbiBrZXkoZXZlbnQpIHtcbiAgICByZXR1cm4gKGV2ZW50LmtleUNvZGUpID8gZXZlbnQua2V5Q29kZSA6IGV2ZW50LndoaWNoO1xuICB9XG5cbiAgZnVuY3Rpb24gdGFyZ2V0KGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gcG9pbnRlclR5cGUoZXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50LnBvaW50ZXJUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHBvaW50ZXJNYXBbZXZlbnQucG9pbnRlclR5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKGV2ZW50LnBvaW50ZXJUeXBlID09PSAncGVuJykgPyAndG91Y2gnIDogZXZlbnQucG9pbnRlclR5cGU7IC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgfVxuICB9XG5cbiAgLy8ga2V5Ym9hcmQgbG9nZ2luZ1xuICBmdW5jdGlvbiBsb2dLZXlzKGV2ZW50S2V5KSB7XG4gICAgaWYgKGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKSA9PT0gLTEgJiYga2V5TWFwW2V2ZW50S2V5XSkgYWN0aXZlS2V5cy5wdXNoKGtleU1hcFtldmVudEtleV0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5Mb2dLZXlzKGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgYXJyYXlQb3MgPSBhY3RpdmVLZXlzLmluZGV4T2Yoa2V5TWFwW2V2ZW50S2V5XSk7XG5cbiAgICBpZiAoYXJyYXlQb3MgIT09IC0xKSBhY3RpdmVLZXlzLnNwbGljZShhcnJheVBvcywgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kRXZlbnRzKCkge1xuICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgLy8gcG9pbnRlciBldmVudHMgKG1vdXNlLCBwZW4sIHRvdWNoKVxuICAgIGlmICh3aW5kb3cuUG9pbnRlckV2ZW50KSB7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuTVNQb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignTVNQb2ludGVyRG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJNb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gbW91c2UgZXZlbnRzXG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBidWZmZXJlZEV2ZW50KTtcblxuICAgICAgLy8gdG91Y2ggZXZlbnRzXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB7XG4gICAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGV2ZW50QnVmZmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtb3VzZSB3aGVlbFxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcihtb3VzZVdoZWVsLCBidWZmZXJlZEV2ZW50KTtcblxuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCB1bkxvZ0tleXMpO1xuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHV0aWxpdGllc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGRldGVjdCB2ZXJzaW9uIG9mIG1vdXNlIHdoZWVsIGV2ZW50IHRvIHVzZVxuICAvLyB2aWEgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzL3doZWVsXG4gIGZ1bmN0aW9uIGRldGVjdFdoZWVsKCkge1xuICAgIHJldHVybiBtb3VzZVdoZWVsID0gJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpID9cbiAgICAgICd3aGVlbCcgOiAvLyBNb2Rlcm4gYnJvd3NlcnMgc3VwcG9ydCBcIndoZWVsXCJcblxuICAgICAgZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAnbW91c2V3aGVlbCcgOiAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcbiAgICAgICAgJ0RPTU1vdXNlU2Nyb2xsJzsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgaW5pdFxuXG4gICAgZG9uJ3Qgc3RhcnQgc2NyaXB0IHVubGVzcyBicm93c2VyIGN1dHMgdGhlIG11c3RhcmQsXG4gICAgYWxzbyBwYXNzZXMgaWYgcG9seWZpbGxzIGFyZSB1c2VkXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgaWYgKFxuICAgICdhZGRFdmVudExpc3RlbmVyJyBpbiB3aW5kb3cgJiZcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZlxuICApIHtcblxuICAgIC8vIGlmIHRoZSBkb20gaXMgYWxyZWFkeSByZWFkeSBhbHJlYWR5IChzY3JpcHQgd2FzIHBsYWNlZCBhdCBib3R0b20gb2YgPGJvZHk+KVxuICAgIGlmIChkb2N1bWVudC5ib2R5KSB7XG4gICAgICBiaW5kRXZlbnRzKCk7XG5cbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIGRvbSB0byBsb2FkIChzY3JpcHQgd2FzIHBsYWNlZCBpbiB0aGUgPGhlYWQ+KVxuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgYmluZEV2ZW50cyk7XG4gICAgfVxuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGFwaVxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIHJldHVybiB7XG5cbiAgICAvLyByZXR1cm5zIHN0cmluZzogdGhlIGN1cnJlbnQgaW5wdXQgdHlwZVxuICAgIGFzazogZnVuY3Rpb24oKSB7IHJldHVybiBjdXJyZW50SW5wdXQ7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBjdXJyZW50bHkgcHJlc3NlZCBrZXlzXG4gICAga2V5czogZnVuY3Rpb24oKSB7IHJldHVybiBhY3RpdmVLZXlzOyB9LFxuXG4gICAgLy8gcmV0dXJucyBhcnJheTogYWxsIHRoZSBkZXRlY3RlZCBpbnB1dCB0eXBlc1xuICAgIHR5cGVzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGlucHV0VHlwZXM7IH0sXG5cbiAgICAvLyBhY2NlcHRzIHN0cmluZzogbWFudWFsbHkgc2V0IHRoZSBpbnB1dCB0eXBlXG4gICAgc2V0OiBzd2l0Y2hJbnB1dFxuICB9O1xuXG59KCkpO1xuIiwiIWZ1bmN0aW9uKCQpIHtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBGT1VOREFUSU9OX1ZFUlNJT04gPSAnNi4yLjInO1xuXG4vLyBHbG9iYWwgRm91bmRhdGlvbiBvYmplY3Rcbi8vIFRoaXMgaXMgYXR0YWNoZWQgdG8gdGhlIHdpbmRvdywgb3IgdXNlZCBhcyBhIG1vZHVsZSBmb3IgQU1EL0Jyb3dzZXJpZnlcbnZhciBGb3VuZGF0aW9uID0ge1xuICB2ZXJzaW9uOiBGT1VOREFUSU9OX1ZFUlNJT04sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBpbml0aWFsaXplZCBwbHVnaW5zLlxuICAgKi9cbiAgX3BsdWdpbnM6IHt9LFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgZ2VuZXJhdGVkIHVuaXF1ZSBpZHMgZm9yIHBsdWdpbiBpbnN0YW5jZXNcbiAgICovXG4gIF91dWlkczogW10sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBib29sZWFuIGZvciBSVEwgc3VwcG9ydFxuICAgKi9cbiAgcnRsOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiAkKCdodG1sJykuYXR0cignZGlyJykgPT09ICdydGwnO1xuICB9LFxuICAvKipcbiAgICogRGVmaW5lcyBhIEZvdW5kYXRpb24gcGx1Z2luLCBhZGRpbmcgaXQgdG8gdGhlIGBGb3VuZGF0aW9uYCBuYW1lc3BhY2UgYW5kIHRoZSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZSB3aGVuIHJlZmxvd2luZy5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcGx1Z2luLlxuICAgKi9cbiAgcGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIGFkZGluZyB0byBnbG9iYWwgRm91bmRhdGlvbiBvYmplY3RcbiAgICAvLyBFeGFtcGxlczogRm91bmRhdGlvbi5SZXZlYWwsIEZvdW5kYXRpb24uT2ZmQ2FudmFzXG4gICAgdmFyIGNsYXNzTmFtZSA9IChuYW1lIHx8IGZ1bmN0aW9uTmFtZShwbHVnaW4pKTtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIHN0b3JpbmcgdGhlIHBsdWdpbiwgYWxzbyB1c2VkIHRvIGNyZWF0ZSB0aGUgaWRlbnRpZnlpbmcgZGF0YSBhdHRyaWJ1dGUgZm9yIHRoZSBwbHVnaW5cbiAgICAvLyBFeGFtcGxlczogZGF0YS1yZXZlYWwsIGRhdGEtb2ZmLWNhbnZhc1xuICAgIHZhciBhdHRyTmFtZSAgPSBoeXBoZW5hdGUoY2xhc3NOYW1lKTtcblxuICAgIC8vIEFkZCB0byB0aGUgRm91bmRhdGlvbiBvYmplY3QgYW5kIHRoZSBwbHVnaW5zIGxpc3QgKGZvciByZWZsb3dpbmcpXG4gICAgdGhpcy5fcGx1Z2luc1thdHRyTmFtZV0gPSB0aGlzW2NsYXNzTmFtZV0gPSBwbHVnaW47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUG9wdWxhdGVzIHRoZSBfdXVpZHMgYXJyYXkgd2l0aCBwb2ludGVycyB0byBlYWNoIGluZGl2aWR1YWwgcGx1Z2luIGluc3RhbmNlLlxuICAgKiBBZGRzIHRoZSBgemZQbHVnaW5gIGRhdGEtYXR0cmlidXRlIHRvIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlZCBwbHVnaW5zIHRvIGFsbG93IHVzZSBvZiAkKHNlbGVjdG9yKS5mb3VuZGF0aW9uKG1ldGhvZCkgY2FsbHMuXG4gICAqIEFsc28gZmlyZXMgdGhlIGluaXRpYWxpemF0aW9uIGV2ZW50IGZvciBlYWNoIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLCBwYXNzZWQgYXMgYSBjYW1lbENhc2VkIHN0cmluZy5cbiAgICogQGZpcmVzIFBsdWdpbiNpbml0XG4gICAqL1xuICByZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IG5hbWUgPyBoeXBoZW5hdGUobmFtZSkgOiBmdW5jdGlvbk5hbWUocGx1Z2luLmNvbnN0cnVjdG9yKS50b0xvd2VyQ2FzZSgpO1xuICAgIHBsdWdpbi51dWlkID0gdGhpcy5HZXRZb0RpZ2l0cyg2LCBwbHVnaW5OYW1lKTtcblxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkpeyBwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCwgcGx1Z2luLnV1aWQpOyB9XG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpKXsgcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJywgcGx1Z2luKTsgfVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgaW5pdGlhbGl6ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNpbml0XG4gICAgICAgICAgICovXG4gICAgcGx1Z2luLiRlbGVtZW50LnRyaWdnZXIoYGluaXQuemYuJHtwbHVnaW5OYW1lfWApO1xuXG4gICAgdGhpcy5fdXVpZHMucHVzaChwbHVnaW4udXVpZCk7XG5cbiAgICByZXR1cm47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUmVtb3ZlcyB0aGUgcGx1Z2lucyB1dWlkIGZyb20gdGhlIF91dWlkcyBhcnJheS5cbiAgICogUmVtb3ZlcyB0aGUgemZQbHVnaW4gZGF0YSBhdHRyaWJ1dGUsIGFzIHdlbGwgYXMgdGhlIGRhdGEtcGx1Z2luLW5hbWUgYXR0cmlidXRlLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBkZXN0cm95ZWQgZXZlbnQgZm9yIHRoZSBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBmaXJlcyBQbHVnaW4jZGVzdHJveWVkXG4gICAqL1xuICB1bnJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHZhciBwbHVnaW5OYW1lID0gaHlwaGVuYXRlKGZ1bmN0aW9uTmFtZShwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKS5jb25zdHJ1Y3RvcikpO1xuXG4gICAgdGhpcy5fdXVpZHMuc3BsaWNlKHRoaXMuX3V1aWRzLmluZGV4T2YocGx1Z2luLnV1aWQpLCAxKTtcbiAgICBwbHVnaW4uJGVsZW1lbnQucmVtb3ZlQXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkucmVtb3ZlRGF0YSgnemZQbHVnaW4nKVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNkZXN0cm95ZWRcbiAgICAgICAgICAgKi9cbiAgICAgICAgICAudHJpZ2dlcihgZGVzdHJveWVkLnpmLiR7cGx1Z2luTmFtZX1gKTtcbiAgICBmb3IodmFyIHByb3AgaW4gcGx1Z2luKXtcbiAgICAgIHBsdWdpbltwcm9wXSA9IG51bGw7Ly9jbGVhbiB1cCBzY3JpcHQgdG8gcHJlcCBmb3IgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICAgIH1cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBDYXVzZXMgb25lIG9yIG1vcmUgYWN0aXZlIHBsdWdpbnMgdG8gcmUtaW5pdGlhbGl6ZSwgcmVzZXR0aW5nIGV2ZW50IGxpc3RlbmVycywgcmVjYWxjdWxhdGluZyBwb3NpdGlvbnMsIGV0Yy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbnMgLSBvcHRpb25hbCBzdHJpbmcgb2YgYW4gaW5kaXZpZHVhbCBwbHVnaW4ga2V5LCBhdHRhaW5lZCBieSBjYWxsaW5nIGAkKGVsZW1lbnQpLmRhdGEoJ3BsdWdpbk5hbWUnKWAsIG9yIHN0cmluZyBvZiBhIHBsdWdpbiBjbGFzcyBpLmUuIGAnZHJvcGRvd24nYFxuICAgKiBAZGVmYXVsdCBJZiBubyBhcmd1bWVudCBpcyBwYXNzZWQsIHJlZmxvdyBhbGwgY3VycmVudGx5IGFjdGl2ZSBwbHVnaW5zLlxuICAgKi9cbiAgIHJlSW5pdDogZnVuY3Rpb24ocGx1Z2lucyl7XG4gICAgIHZhciBpc0pRID0gcGx1Z2lucyBpbnN0YW5jZW9mICQ7XG4gICAgIHRyeXtcbiAgICAgICBpZihpc0pRKXtcbiAgICAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAkKHRoaXMpLmRhdGEoJ3pmUGx1Z2luJykuX2luaXQoKTtcbiAgICAgICAgIH0pO1xuICAgICAgIH1lbHNle1xuICAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgcGx1Z2lucyxcbiAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgIGZucyA9IHtcbiAgICAgICAgICAgJ29iamVjdCc6IGZ1bmN0aW9uKHBsZ3Mpe1xuICAgICAgICAgICAgIHBsZ3MuZm9yRWFjaChmdW5jdGlvbihwKXtcbiAgICAgICAgICAgICAgIHAgPSBoeXBoZW5hdGUocCk7XG4gICAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICdzdHJpbmcnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHBsdWdpbnMgPSBoeXBoZW5hdGUocGx1Z2lucyk7XG4gICAgICAgICAgICAgJCgnW2RhdGEtJysgcGx1Z2lucyArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAndW5kZWZpbmVkJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICB0aGlzWydvYmplY3QnXShPYmplY3Qua2V5cyhfdGhpcy5fcGx1Z2lucykpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9O1xuICAgICAgICAgZm5zW3R5cGVdKHBsdWdpbnMpO1xuICAgICAgIH1cbiAgICAgfWNhdGNoKGVycil7XG4gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICB9ZmluYWxseXtcbiAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICAgfVxuICAgfSxcblxuICAvKipcbiAgICogcmV0dXJucyBhIHJhbmRvbSBiYXNlLTM2IHVpZCB3aXRoIG5hbWVzcGFjaW5nXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIC0gbnVtYmVyIG9mIHJhbmRvbSBiYXNlLTM2IGRpZ2l0cyBkZXNpcmVkLiBJbmNyZWFzZSBmb3IgbW9yZSByYW5kb20gc3RyaW5ncy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZSAtIG5hbWUgb2YgcGx1Z2luIHRvIGJlIGluY29ycG9yYXRlZCBpbiB1aWQsIG9wdGlvbmFsLlxuICAgKiBAZGVmYXVsdCB7U3RyaW5nfSAnJyAtIGlmIG5vIHBsdWdpbiBuYW1lIGlzIHByb3ZpZGVkLCBub3RoaW5nIGlzIGFwcGVuZGVkIHRvIHRoZSB1aWQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IC0gdW5pcXVlIGlkXG4gICAqL1xuICBHZXRZb0RpZ2l0czogZnVuY3Rpb24obGVuZ3RoLCBuYW1lc3BhY2Upe1xuICAgIGxlbmd0aCA9IGxlbmd0aCB8fCA2O1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnBvdygzNiwgbGVuZ3RoICsgMSkgLSBNYXRoLnJhbmRvbSgpICogTWF0aC5wb3coMzYsIGxlbmd0aCkpKS50b1N0cmluZygzNikuc2xpY2UoMSkgKyAobmFtZXNwYWNlID8gYC0ke25hbWVzcGFjZX1gIDogJycpO1xuICB9LFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBwbHVnaW5zIG9uIGFueSBlbGVtZW50cyB3aXRoaW4gYGVsZW1gIChhbmQgYGVsZW1gIGl0c2VsZikgdGhhdCBhcmVuJ3QgYWxyZWFkeSBpbml0aWFsaXplZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgdG8gY2hlY2sgaW5zaWRlLiBBbHNvIGNoZWNrcyB0aGUgZWxlbWVudCBpdHNlbGYsIHVubGVzcyBpdCdzIHRoZSBgZG9jdW1lbnRgIG9iamVjdC5cbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHBsdWdpbnMgLSBBIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplLiBMZWF2ZSB0aGlzIG91dCB0byBpbml0aWFsaXplIGV2ZXJ5dGhpbmcuXG4gICAqL1xuICByZWZsb3c6IGZ1bmN0aW9uKGVsZW0sIHBsdWdpbnMpIHtcblxuICAgIC8vIElmIHBsdWdpbnMgaXMgdW5kZWZpbmVkLCBqdXN0IGdyYWIgZXZlcnl0aGluZ1xuICAgIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHBsdWdpbnMgPSBPYmplY3Qua2V5cyh0aGlzLl9wbHVnaW5zKTtcbiAgICB9XG4gICAgLy8gSWYgcGx1Z2lucyBpcyBhIHN0cmluZywgY29udmVydCBpdCB0byBhbiBhcnJheSB3aXRoIG9uZSBpdGVtXG4gICAgZWxzZSBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBwbHVnaW5zID0gW3BsdWdpbnNdO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBwbHVnaW5cbiAgICAkLmVhY2gocGx1Z2lucywgZnVuY3Rpb24oaSwgbmFtZSkge1xuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBsdWdpblxuICAgICAgdmFyIHBsdWdpbiA9IF90aGlzLl9wbHVnaW5zW25hbWVdO1xuXG4gICAgICAvLyBMb2NhbGl6ZSB0aGUgc2VhcmNoIHRvIGFsbCBlbGVtZW50cyBpbnNpZGUgZWxlbSwgYXMgd2VsbCBhcyBlbGVtIGl0c2VsZiwgdW5sZXNzIGVsZW0gPT09IGRvY3VtZW50XG4gICAgICB2YXIgJGVsZW0gPSAkKGVsZW0pLmZpbmQoJ1tkYXRhLScrbmFtZSsnXScpLmFkZEJhY2soJ1tkYXRhLScrbmFtZSsnXScpO1xuXG4gICAgICAvLyBGb3IgZWFjaCBwbHVnaW4gZm91bmQsIGluaXRpYWxpemUgaXRcbiAgICAgICRlbGVtLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciAkZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICAvLyBEb24ndCBkb3VibGUtZGlwIG9uIHBsdWdpbnNcbiAgICAgICAgaWYgKCRlbC5kYXRhKCd6ZlBsdWdpbicpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHJpZWQgdG8gaW5pdGlhbGl6ZSBcIituYW1lK1wiIG9uIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGhhcyBhIEZvdW5kYXRpb24gcGx1Z2luLlwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZigkZWwuYXR0cignZGF0YS1vcHRpb25zJykpe1xuICAgICAgICAgIHZhciB0aGluZyA9ICRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKS5zcGxpdCgnOycpLmZvckVhY2goZnVuY3Rpb24oZSwgaSl7XG4gICAgICAgICAgICB2YXIgb3B0ID0gZS5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihlbCl7IHJldHVybiBlbC50cmltKCk7IH0pO1xuICAgICAgICAgICAgaWYob3B0WzBdKSBvcHRzW29wdFswXV0gPSBwYXJzZVZhbHVlKG9wdFsxXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICRlbC5kYXRhKCd6ZlBsdWdpbicsIG5ldyBwbHVnaW4oJCh0aGlzKSwgb3B0cykpO1xuICAgICAgICB9Y2F0Y2goZXIpe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXIpO1xuICAgICAgICB9ZmluYWxseXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBnZXRGbk5hbWU6IGZ1bmN0aW9uTmFtZSxcbiAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24oJGVsZW0pe1xuICAgIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAgICd0cmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdPVHJhbnNpdGlvbic6ICdvdHJhbnNpdGlvbmVuZCdcbiAgICB9O1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgIGVuZDtcblxuICAgIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpe1xuICAgICAgaWYgKHR5cGVvZiBlbGVtLnN0eWxlW3RdICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGVuZCA9IHRyYW5zaXRpb25zW3RdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihlbmQpe1xuICAgICAgcmV0dXJuIGVuZDtcbiAgICB9ZWxzZXtcbiAgICAgIGVuZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJGVsZW0udHJpZ2dlckhhbmRsZXIoJ3RyYW5zaXRpb25lbmQnLCBbJGVsZW1dKTtcbiAgICAgIH0sIDEpO1xuICAgICAgcmV0dXJuICd0cmFuc2l0aW9uZW5kJztcbiAgICB9XG4gIH1cbn07XG5cbkZvdW5kYXRpb24udXRpbCA9IHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBhcHBseWluZyBhIGRlYm91bmNlIGVmZmVjdCB0byBhIGZ1bmN0aW9uIGNhbGwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IGVuZCBvZiB0aW1lb3V0LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgLSBUaW1lIGluIG1zIHRvIGRlbGF5IHRoZSBjYWxsIG9mIGBmdW5jYC5cbiAgICogQHJldHVybnMgZnVuY3Rpb25cbiAgICovXG4gIHRocm90dGxlOiBmdW5jdGlvbiAoZnVuYywgZGVsYXkpIHtcbiAgICB2YXIgdGltZXIgPSBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgaWYgKHRpbWVyID09PSBudWxsKSB7XG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICB0aW1lciA9IG51bGw7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciBub3QgbWFraW5nIHRoaXMgYSBqUXVlcnkgZnVuY3Rpb25cbi8vIFRPRE86IG5lZWQgd2F5IHRvIHJlZmxvdyB2cy4gcmUtaW5pdGlhbGl6ZVxuLyoqXG4gKiBUaGUgRm91bmRhdGlvbiBqUXVlcnkgbWV0aG9kLlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG1ldGhvZCAtIEFuIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBjdXJyZW50IGpRdWVyeSBvYmplY3QuXG4gKi9cbnZhciBmb3VuZGF0aW9uID0gZnVuY3Rpb24obWV0aG9kKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIG1ldGhvZCxcbiAgICAgICRtZXRhID0gJCgnbWV0YS5mb3VuZGF0aW9uLW1xJyksXG4gICAgICAkbm9KUyA9ICQoJy5uby1qcycpO1xuXG4gIGlmKCEkbWV0YS5sZW5ndGgpe1xuICAgICQoJzxtZXRhIGNsYXNzPVwiZm91bmRhdGlvbi1tcVwiPicpLmFwcGVuZFRvKGRvY3VtZW50LmhlYWQpO1xuICB9XG4gIGlmKCRub0pTLmxlbmd0aCl7XG4gICAgJG5vSlMucmVtb3ZlQ2xhc3MoJ25vLWpzJyk7XG4gIH1cblxuICBpZih0eXBlID09PSAndW5kZWZpbmVkJyl7Ly9uZWVkcyB0byBpbml0aWFsaXplIHRoZSBGb3VuZGF0aW9uIG9iamVjdCwgb3IgYW4gaW5kaXZpZHVhbCBwbHVnaW4uXG4gICAgRm91bmRhdGlvbi5NZWRpYVF1ZXJ5Ll9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWZsb3codGhpcyk7XG4gIH1lbHNlIGlmKHR5cGUgPT09ICdzdHJpbmcnKXsvL2FuIGluZGl2aWR1YWwgbWV0aG9kIHRvIGludm9rZSBvbiBhIHBsdWdpbiBvciBncm91cCBvZiBwbHVnaW5zXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOy8vY29sbGVjdCBhbGwgdGhlIGFyZ3VtZW50cywgaWYgbmVjZXNzYXJ5XG4gICAgdmFyIHBsdWdDbGFzcyA9IHRoaXMuZGF0YSgnemZQbHVnaW4nKTsvL2RldGVybWluZSB0aGUgY2xhc3Mgb2YgcGx1Z2luXG5cbiAgICBpZihwbHVnQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBwbHVnQ2xhc3NbbWV0aG9kXSAhPT0gdW5kZWZpbmVkKXsvL21ha2Ugc3VyZSBib3RoIHRoZSBjbGFzcyBhbmQgbWV0aG9kIGV4aXN0XG4gICAgICBpZih0aGlzLmxlbmd0aCA9PT0gMSl7Ly9pZiB0aGVyZSdzIG9ubHkgb25lLCBjYWxsIGl0IGRpcmVjdGx5LlxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KHBsdWdDbGFzcywgYXJncyk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksIGVsKXsvL290aGVyd2lzZSBsb29wIHRocm91Z2ggdGhlIGpRdWVyeSBjb2xsZWN0aW9uIGFuZCBpbnZva2UgdGhlIG1ldGhvZCBvbiBlYWNoXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkoJChlbCkuZGF0YSgnemZQbHVnaW4nKSwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1lbHNley8vZXJyb3IgZm9yIG5vIGNsYXNzIG9yIG5vIG1ldGhvZFxuICAgICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwiV2UncmUgc29ycnksICdcIiArIG1ldGhvZCArIFwiJyBpcyBub3QgYW4gYXZhaWxhYmxlIG1ldGhvZCBmb3IgXCIgKyAocGx1Z0NsYXNzID8gZnVuY3Rpb25OYW1lKHBsdWdDbGFzcykgOiAndGhpcyBlbGVtZW50JykgKyAnLicpO1xuICAgIH1cbiAgfWVsc2V7Ly9lcnJvciBmb3IgaW52YWxpZCBhcmd1bWVudCB0eXBlXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgV2UncmUgc29ycnksICR7dHlwZX0gaXMgbm90IGEgdmFsaWQgcGFyYW1ldGVyLiBZb3UgbXVzdCB1c2UgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtZXRob2QgeW91IHdpc2ggdG8gaW52b2tlLmApO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxud2luZG93LkZvdW5kYXRpb24gPSBGb3VuZGF0aW9uO1xuJC5mbi5mb3VuZGF0aW9uID0gZm91bmRhdGlvbjtcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93IHx8ICF3aW5kb3cuRGF0ZS5ub3cpXG4gICAgd2luZG93LkRhdGUubm93ID0gRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG4gIC8qKlxuICAgKiBQb2x5ZmlsbCBmb3IgcGVyZm9ybWFuY2Uubm93LCByZXF1aXJlZCBieSByQUZcbiAgICovXG4gIGlmKCF3aW5kb3cucGVyZm9ybWFuY2UgfHwgIXdpbmRvdy5wZXJmb3JtYW5jZS5ub3cpe1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIHN0YXJ0OiBEYXRlLm5vdygpLFxuICAgICAgbm93OiBmdW5jdGlvbigpeyByZXR1cm4gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnQ7IH1cbiAgICB9O1xuICB9XG59KSgpO1xuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBjbG9zZXN0IHRoaW5nIHBvc3NpYmxlIHRvIHRoZSBFQ01BU2NyaXB0IDVcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgIGZCb3VuZCAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgZk5PUFxuICAgICAgICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAgOiBvVGhpcyxcbiAgICAgICAgICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcblxuICAgIGlmICh0aGlzLnByb3RvdHlwZSkge1xuICAgICAgLy8gbmF0aXZlIGZ1bmN0aW9ucyBkb24ndCBoYXZlIGEgcHJvdG90eXBlXG4gICAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIH1cbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcblxuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59XG4vLyBQb2x5ZmlsbCB0byBnZXQgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiBpbiBJRTlcbmZ1bmN0aW9uIGZ1bmN0aW9uTmFtZShmbikge1xuICBpZiAoRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmdW5jTmFtZVJlZ2V4ID0gL2Z1bmN0aW9uXFxzKFteKF17MSx9KVxcKC87XG4gICAgdmFyIHJlc3VsdHMgPSAoZnVuY05hbWVSZWdleCkuZXhlYygoZm4pLnRvU3RyaW5nKCkpO1xuICAgIHJldHVybiAocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA+IDEpID8gcmVzdWx0c1sxXS50cmltKCkgOiBcIlwiO1xuICB9XG4gIGVsc2UgaWYgKGZuLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZuLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGZuLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG59XG5mdW5jdGlvbiBwYXJzZVZhbHVlKHN0cil7XG4gIGlmKC90cnVlLy50ZXN0KHN0cikpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmKC9mYWxzZS8udGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIGVsc2UgaWYoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgLSAkZWxlRGltcy53aWR0aCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gIH1cbn1cblxufShqUXVlcnkpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiBUaGlzIHV0aWwgd2FzIGNyZWF0ZWQgYnkgTWFyaXVzIE9sYmVydHogKlxuICogUGxlYXNlIHRoYW5rIE1hcml1cyBvbiBHaXRIdWIgL293bGJlcnR6ICpcbiAqIG9yIHRoZSB3ZWIgaHR0cDovL3d3dy5tYXJpdXNvbGJlcnR6LmRlLyAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBrZXlDb2RlcyA9IHtcbiAgOTogJ1RBQicsXG4gIDEzOiAnRU5URVInLFxuICAyNzogJ0VTQ0FQRScsXG4gIDMyOiAnU1BBQ0UnLFxuICAzNzogJ0FSUk9XX0xFRlQnLFxuICAzODogJ0FSUk9XX1VQJyxcbiAgMzk6ICdBUlJPV19SSUdIVCcsXG4gIDQwOiAnQVJST1dfRE9XTidcbn1cblxudmFyIGNvbW1hbmRzID0ge31cblxudmFyIEtleWJvYXJkID0ge1xuICBrZXlzOiBnZXRLZXlDb2RlcyhrZXlDb2RlcyksXG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgKGtleWJvYXJkKSBldmVudCBhbmQgcmV0dXJucyBhIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgaXRzIGtleVxuICAgKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEByZXR1cm4gU3RyaW5nIGtleSAtIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgdGhlIGtleSBwcmVzc2VkXG4gICAqL1xuICBwYXJzZUtleShldmVudCkge1xuICAgIHZhciBrZXkgPSBrZXlDb2Rlc1tldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlXSB8fCBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmIChldmVudC5zaGlmdEtleSkga2V5ID0gYFNISUZUXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmFsdEtleSkga2V5ID0gYEFMVF8ke2tleX1gO1xuICAgIHJldHVybiBrZXk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIGdpdmVuIChrZXlib2FyZCkgZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCdzIG5hbWUsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcGFyYW0ge09iamVjdHN9IGZ1bmN0aW9ucyAtIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHRoYXQgYXJlIHRvIGJlIGV4ZWN1dGVkXG4gICAqL1xuICBoYW5kbGVLZXkoZXZlbnQsIGNvbXBvbmVudCwgZnVuY3Rpb25zKSB7XG4gICAgdmFyIGNvbW1hbmRMaXN0ID0gY29tbWFuZHNbY29tcG9uZW50XSxcbiAgICAgIGtleUNvZGUgPSB0aGlzLnBhcnNlS2V5KGV2ZW50KSxcbiAgICAgIGNtZHMsXG4gICAgICBjb21tYW5kLFxuICAgICAgZm47XG5cbiAgICBpZiAoIWNvbW1hbmRMaXN0KSByZXR1cm4gY29uc29sZS53YXJuKCdDb21wb25lbnQgbm90IGRlZmluZWQhJyk7XG5cbiAgICBpZiAodHlwZW9mIGNvbW1hbmRMaXN0Lmx0ciA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gdGhpcyBjb21wb25lbnQgZG9lcyBub3QgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGx0ciBhbmQgcnRsXG4gICAgICAgIGNtZHMgPSBjb21tYW5kTGlzdDsgLy8gdXNlIHBsYWluIGxpc3RcbiAgICB9IGVsc2UgeyAvLyBtZXJnZSBsdHIgYW5kIHJ0bDogaWYgZG9jdW1lbnQgaXMgcnRsLCBydGwgb3ZlcndyaXRlcyBsdHIgYW5kIHZpY2UgdmVyc2FcbiAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QubHRyLCBjb21tYW5kTGlzdC5ydGwpO1xuXG4gICAgICAgIGVsc2UgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5ydGwsIGNvbW1hbmRMaXN0Lmx0cik7XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjbWRzW2tleUNvZGVdO1xuXG4gICAgZm4gPSBmdW5jdGlvbnNbY29tbWFuZF07XG4gICAgaWYgKGZuICYmIHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uICBpZiBleGlzdHNcbiAgICAgIHZhciByZXR1cm5WYWx1ZSA9IGZuLmFwcGx5KCk7XG4gICAgICBpZiAoZnVuY3Rpb25zLmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy5oYW5kbGVkKHJldHVyblZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZ1bmN0aW9ucy51bmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy51bmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBub3QgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy51bmhhbmRsZWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIHRoZSBnaXZlbiBgJGVsZW1lbnRgXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gc2VhcmNoIHdpdGhpblxuICAgKiBAcmV0dXJuIHtqUXVlcnl9ICRmb2N1c2FibGUgLSBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiBgJGVsZW1lbnRgXG4gICAqL1xuICBmaW5kRm9jdXNhYmxlKCRlbGVtZW50KSB7XG4gICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJ2FbaHJlZl0sIGFyZWFbaHJlZl0sIGlucHV0Om5vdChbZGlzYWJsZWRdKSwgc2VsZWN0Om5vdChbZGlzYWJsZWRdKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pLCBidXR0b246bm90KFtkaXNhYmxlZF0pLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsICpbdGFiaW5kZXhdLCAqW2NvbnRlbnRlZGl0YWJsZV0nKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISQodGhpcykuaXMoJzp2aXNpYmxlJykgfHwgJCh0aGlzKS5hdHRyKCd0YWJpbmRleCcpIDwgMCkgeyByZXR1cm4gZmFsc2U7IH0gLy9vbmx5IGhhdmUgdmlzaWJsZSBlbGVtZW50cyBhbmQgdGhvc2UgdGhhdCBoYXZlIGEgdGFiaW5kZXggZ3JlYXRlciBvciBlcXVhbCAwXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY29tcG9uZW50IG5hbWUgbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcmV0dXJuIFN0cmluZyBjb21wb25lbnROYW1lXG4gICAqL1xuXG4gIHJlZ2lzdGVyKGNvbXBvbmVudE5hbWUsIGNtZHMpIHtcbiAgICBjb21tYW5kc1tjb21wb25lbnROYW1lXSA9IGNtZHM7XG4gIH1cbn1cblxuLypcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cbiAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICovXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcbiAgdmFyIGsgPSB7fTtcbiAgZm9yICh2YXIga2MgaW4ga2NzKSBrW2tjc1trY11dID0ga2NzW2tjXTtcbiAgcmV0dXJuIGs7XG59XG5cbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vLyBEZWZhdWx0IHNldCBvZiBtZWRpYSBxdWVyaWVzXG5jb25zdCBkZWZhdWx0UXVlcmllcyA9IHtcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcbiAgbGFuZHNjYXBlIDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICBwb3J0cmFpdCA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxudmFyIE1lZGlhUXVlcnkgPSB7XG4gIHF1ZXJpZXM6IFtdLFxuXG4gIGN1cnJlbnQ6ICcnLFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbWVkaWEgcXVlcnkgaGVscGVyLCBieSBleHRyYWN0aW5nIHRoZSBicmVha3BvaW50IGxpc3QgZnJvbSB0aGUgQ1NTIGFuZCBhY3RpdmF0aW5nIHRoZSBicmVha3BvaW50IHdhdGNoZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleHRyYWN0ZWRTdHlsZXMgPSAkKCcuZm91bmRhdGlvbi1tcScpLmNzcygnZm9udC1mYW1pbHknKTtcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xuXG4gICAgbmFtZWRRdWVyaWVzID0gcGFyc2VTdHlsZVRvT2JqZWN0KGV4dHJhY3RlZFN0eWxlcyk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZWRRdWVyaWVzKSB7XG4gICAgICBpZihuYW1lZFF1ZXJpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiBgb25seSBzY3JlZW4gYW5kIChtaW4td2lkdGg6ICR7bmFtZWRRdWVyaWVzW2tleV19KWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKTtcblxuICAgIHRoaXMuX3dhdGNoZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gaXMgYXQgbGVhc3QgYXMgd2lkZSBhcyBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCdzIHNtYWxsZXIuXG4gICAqL1xuICBhdExlYXN0KHNpemUpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLmdldChzaXplKTtcblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KS5tYXRjaGVzO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgbWVkaWEgcXVlcnkgb2YgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGdldC5cbiAgICogQHJldHVybnMge1N0cmluZ3xudWxsfSAtIFRoZSBtZWRpYSBxdWVyeSBvZiB0aGUgYnJlYWtwb2ludCwgb3IgYG51bGxgIGlmIHRoZSBicmVha3BvaW50IGRvZXNuJ3QgZXhpc3QuXG4gICAqL1xuICBnZXQoc2l6ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyaWVzKSB7XG4gICAgICBpZih0aGlzLnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuICAgICAgICBpZiAoc2l6ZSA9PT0gcXVlcnkubmFtZSkgcmV0dXJuIHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQgbmFtZSBieSB0ZXN0aW5nIGV2ZXJ5IGJyZWFrcG9pbnQgYW5kIHJldHVybmluZyB0aGUgbGFzdCBvbmUgdG8gbWF0Y2ggKHRoZSBiaWdnZXN0IG9uZSkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBOYW1lIG9mIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQuXG4gICAqL1xuICBfZ2V0Q3VycmVudFNpemUoKSB7XG4gICAgdmFyIG1hdGNoZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucXVlcmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuXG4gICAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEocXVlcnkudmFsdWUpLm1hdGNoZXMpIHtcbiAgICAgICAgbWF0Y2hlZCA9IHF1ZXJ5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbWF0Y2hlZCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBtYXRjaGVkLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQWN0aXZhdGVzIHRoZSBicmVha3BvaW50IHdhdGNoZXIsIHdoaWNoIGZpcmVzIGFuIGV2ZW50IG9uIHRoZSB3aW5kb3cgd2hlbmV2ZXIgdGhlIGJyZWFrcG9pbnQgY2hhbmdlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfd2F0Y2hlcigpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5tZWRpYXF1ZXJ5JywgKCkgPT4ge1xuICAgICAgdmFyIG5ld1NpemUgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpLCBjdXJyZW50U2l6ZSA9IHRoaXMuY3VycmVudDtcblxuICAgICAgaWYgKG5ld1NpemUgIT09IGN1cnJlbnRTaXplKSB7XG4gICAgICAgIC8vIENoYW5nZSB0aGUgY3VycmVudCBtZWRpYSBxdWVyeVxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBuZXdTaXplO1xuXG4gICAgICAgIC8vIEJyb2FkY2FzdCB0aGUgbWVkaWEgcXVlcnkgY2hhbmdlIG9uIHRoZSB3aW5kb3dcbiAgICAgICAgJCh3aW5kb3cpLnRyaWdnZXIoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIFtuZXdTaXplLCBjdXJyZW50U2l6ZV0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5Gb3VuZGF0aW9uLk1lZGlhUXVlcnkgPSBNZWRpYVF1ZXJ5O1xuXG4vLyBtYXRjaE1lZGlhKCkgcG9seWZpbGwgLSBUZXN0IGEgQ1NTIG1lZGlhIHR5cGUvcXVlcnkgaW4gSlMuXG4vLyBBdXRob3JzICYgY29weXJpZ2h0IChjKSAyMDEyOiBTY290dCBKZWhsLCBQYXVsIElyaXNoLCBOaWNob2xhcyBaYWthcywgRGF2aWQgS25pZ2h0LiBEdWFsIE1JVC9CU0QgbGljZW5zZVxud2luZG93Lm1hdGNoTWVkaWEgfHwgKHdpbmRvdy5tYXRjaE1lZGlhID0gZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IG1hdGNoTWVkaXVtIGFwaSBzdWNoIGFzIElFIDkgYW5kIHdlYmtpdFxuICB2YXIgc3R5bGVNZWRpYSA9ICh3aW5kb3cuc3R5bGVNZWRpYSB8fCB3aW5kb3cubWVkaWEpO1xuXG4gIC8vIEZvciB0aG9zZSB0aGF0IGRvbid0IHN1cHBvcnQgbWF0Y2hNZWRpdW1cbiAgaWYgKCFzdHlsZU1lZGlhKSB7XG4gICAgdmFyIHN0eWxlICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpLFxuICAgIHNjcmlwdCAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdLFxuICAgIGluZm8gICAgICAgID0gbnVsbDtcblxuICAgIHN0eWxlLnR5cGUgID0gJ3RleHQvY3NzJztcbiAgICBzdHlsZS5pZCAgICA9ICdtYXRjaG1lZGlhanMtdGVzdCc7XG5cbiAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XG5cbiAgICAvLyAnc3R5bGUuY3VycmVudFN0eWxlJyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICd3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZScgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcblxuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xuICAgICAgICB2YXIgdGV4dCA9IGBAbWVkaWEgJHttZWRpYX17ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfWA7XG5cbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZXN0IGlmIG1lZGlhIHF1ZXJ5IGlzIHRydWUgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIGluZm8ud2lkdGggPT09ICcxcHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihtZWRpYSkge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcbiAgICAgIG1lZGlhOiBtZWRpYSB8fCAnYWxsJ1xuICAgIH07XG4gIH1cbn0oKSk7XG5cbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcbmZ1bmN0aW9uIHBhcnNlU3R5bGVUb09iamVjdChzdHIpIHtcbiAgdmFyIHN0eWxlT2JqZWN0ID0ge307XG5cbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3RyID0gc3RyLnRyaW0oKS5zbGljZSgxLCAtMSk7IC8vIGJyb3dzZXJzIHJlLXF1b3RlIHN0cmluZyBzdHlsZSB2YWx1ZXNcblxuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0eWxlT2JqZWN0ID0gc3RyLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHJldCwgcGFyYW0pIHtcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICAgIHZhciBrZXkgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsID0gcGFydHNbMV07XG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cbiAgICAvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgICB2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sIHt9KTtcblxuICByZXR1cm4gc3R5bGVPYmplY3Q7XG59XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNb3Rpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1vdGlvblxuICovXG5cbmNvbnN0IGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbmNvbnN0IGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG5jb25zdCBNb3Rpb24gPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIE1vdmUoZHVyYXRpb24sIGVsZW0sIGZuKXtcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcbiAgLy8gY29uc29sZS5sb2coJ2NhbGxlZCcpO1xuXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xuICAgIGlmKCFzdGFydCkgc3RhcnQgPSB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgLy8gY29uc29sZS5sb2coc3RhcnQsIHRzKTtcbiAgICBwcm9nID0gdHMgLSBzdGFydDtcbiAgICBmbi5hcHBseShlbGVtKTtcblxuICAgIGlmKHByb2cgPCBkdXJhdGlvbil7IGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUsIGVsZW0pOyB9XG4gICAgZWxzZXtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShhbmltKTtcbiAgICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIH1cbiAgfVxuICBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlKTtcbn1cblxuLyoqXG4gKiBBbmltYXRlcyBhbiBlbGVtZW50IGluIG9yIG91dCB1c2luZyBhIENTUyB0cmFuc2l0aW9uIGNsYXNzLlxuICogQGZ1bmN0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtCb29sZWFufSBpc0luIC0gRGVmaW5lcyBpZiB0aGUgYW5pbWF0aW9uIGlzIGluIG9yIG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9yIEhUTUwgb2JqZWN0IHRvIGFuaW1hdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gYW5pbWF0aW9uIC0gQ1NTIGNsYXNzIHRvIHVzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgdG8gcnVuIHdoZW4gYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICovXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBpbml0Q2xhc3MgPSBpc0luID8gaW5pdENsYXNzZXNbMF0gOiBpbml0Q2xhc3Nlc1sxXTtcbiAgdmFyIGFjdGl2ZUNsYXNzID0gaXNJbiA/IGFjdGl2ZUNsYXNzZXNbMF0gOiBhY3RpdmVDbGFzc2VzWzFdO1xuXG4gIC8vIFNldCB1cCB0aGUgYW5pbWF0aW9uXG4gIHJlc2V0KCk7XG5cbiAgZWxlbWVudFxuICAgIC5hZGRDbGFzcyhhbmltYXRpb24pXG4gICAgLmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG5cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aDtcbiAgICBlbGVtZW50XG4gICAgICAuY3NzKCd0cmFuc2l0aW9uJywgJycpXG4gICAgICAuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKGVsZW1lbnQpLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGAke2luaXRDbGFzc30gJHthY3RpdmVDbGFzc30gJHthbmltYXRpb259YCk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5Nb3ZlID0gTW92ZTtcbkZvdW5kYXRpb24uTW90aW9uID0gTW90aW9uO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE5lc3QgPSB7XG4gIEZlYXRoZXIobWVudSwgdHlwZSA9ICd6ZicpIHtcbiAgICBtZW51LmF0dHIoJ3JvbGUnLCAnbWVudWJhcicpO1xuXG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLmF0dHIoeydyb2xlJzogJ21lbnVpdGVtJ30pLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51LmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKCd0YWJpbmRleCcsIDApO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJGl0ZW0uY2hpbGRyZW4oJ2E6Zmlyc3QnKS50ZXh0KClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAkc3ViXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2RhdGEtc3VibWVudSc6ICcnLFxuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLnJlbW92ZUF0dHIoJ3RhYmluZGV4JyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCcqJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfSwgcmVtYWluKTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVyc3RhcnQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cblxuICB0aGlzLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IHRydWU7XG4gICAgLy9pZihlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCB0cnVlKTtcbiAgICB2YXIgZW5kID0gRGF0ZS5ub3coKTtcbiAgICByZW1haW4gPSByZW1haW4gLSAoZW5kIC0gc3RhcnQpO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJwYXVzZWQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIGEgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBpbWFnZXMgYXJlIGZ1bGx5IGxvYWRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWFnZXMgLSBJbWFnZShzKSB0byBjaGVjayBpZiBsb2FkZWQuXG4gKiBAcGFyYW0ge0Z1bmN9IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGltYWdlIGlzIGZ1bGx5IGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gb25JbWFnZXNMb2FkZWQoaW1hZ2VzLCBjYWxsYmFjayl7XG4gIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHVubG9hZGVkID0gaW1hZ2VzLmxlbmd0aDtcblxuICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG5cbiAgaW1hZ2VzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29tcGxldGUpIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB0aGlzLm5hdHVyYWxXaWR0aCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5uYXR1cmFsV2lkdGggPiAwKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQodGhpcykub25lKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHNpbmdsZUltYWdlTG9hZGVkKCkge1xuICAgIHVubG9hZGVkLS07XG4gICAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxufVxuXG5Gb3VuZGF0aW9uLlRpbWVyID0gVGltZXI7XG5Gb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkID0gb25JbWFnZXNMb2FkZWQ7XG5cbn0oalF1ZXJ5KTtcbiIsIi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipXb3JrIGluc3BpcmVkIGJ5IG11bHRpcGxlIGpxdWVyeSBzd2lwZSBwbHVnaW5zKipcbi8vKipEb25lIGJ5IFlvaGFpIEFyYXJhdCAqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbihmdW5jdGlvbigkKSB7XG5cbiAgJC5zcG90U3dpcGUgPSB7XG4gICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICBlbmFibGVkOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgcHJldmVudERlZmF1bHQ6IGZhbHNlLFxuICAgIG1vdmVUaHJlc2hvbGQ6IDc1LFxuICAgIHRpbWVUaHJlc2hvbGQ6IDIwMFxuICB9O1xuXG4gIHZhciAgIHN0YXJ0UG9zWCxcbiAgICAgICAgc3RhcnRQb3NZLFxuICAgICAgICBzdGFydFRpbWUsXG4gICAgICAgIGVsYXBzZWRUaW1lLFxuICAgICAgICBpc01vdmluZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XG4gICAgLy8gIGFsZXJ0KHRoaXMpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKTtcbiAgICBpc01vdmluZyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaE1vdmUoZSkge1xuICAgIGlmICgkLnNwb3RTd2lwZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICBpZihpc01vdmluZykge1xuICAgICAgdmFyIHggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICB2YXIgeSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIHZhciBkeCA9IHN0YXJ0UG9zWCAtIHg7XG4gICAgICB2YXIgZHkgPSBzdGFydFBvc1kgLSB5O1xuICAgICAgdmFyIGRpcjtcbiAgICAgIGVsYXBzZWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWU7XG4gICAgICBpZihNYXRoLmFicyhkeCkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAgIGRpciA9IGR4ID4gMCA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgICB9XG4gICAgICAvLyBlbHNlIGlmKE1hdGguYWJzKGR5KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgIC8vICAgZGlyID0gZHkgPiAwID8gJ2Rvd24nIDogJ3VwJztcbiAgICAgIC8vIH1cbiAgICAgIGlmKGRpcikge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIG9uVG91Y2hFbmQuY2FsbCh0aGlzKTtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzd2lwZScsIGRpcikudHJpZ2dlcihgc3dpcGUke2Rpcn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xuICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHN0YXJ0UG9zWCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHN0YXJ0UG9zWSA9IGUudG91Y2hlc1swXS5wYWdlWTtcbiAgICAgIGlzTW92aW5nID0gdHJ1ZTtcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lciAmJiB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCk7XG4gIH1cblxuICAkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7IHNldHVwOiBpbml0IH07XG5cbiAgJC5lYWNoKFsnbGVmdCcsICd1cCcsICdkb3duJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcbiAgICAkLmV2ZW50LnNwZWNpYWxbYHN3aXBlJHt0aGlzfWBdID0geyBzZXR1cDogZnVuY3Rpb24oKXtcbiAgICAgICQodGhpcykub24oJ3N3aXBlJywgJC5ub29wKTtcbiAgICB9IH07XG4gIH0pO1xufSkoalF1ZXJ5KTtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBNZXRob2QgZm9yIGFkZGluZyBwc3VlZG8gZHJhZyBldmVudHMgdG8gZWxlbWVudHMgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiFmdW5jdGlvbigkKXtcbiAgJC5mbi5hZGRUb3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgJChlbCkuYmluZCgndG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vd2UgcGFzcyB0aGUgb3JpZ2luYWwgZXZlbnQgb2JqZWN0IGJlY2F1c2UgdGhlIGpRdWVyeSBldmVudFxuICAgICAgICAvL29iamVjdCBpcyBub3JtYWxpemVkIHRvIHczYyBzcGVjcyBhbmQgZG9lcyBub3QgcHJvdmlkZSB0aGUgVG91Y2hMaXN0XG4gICAgICAgIGhhbmRsZVRvdWNoKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGhhbmRsZVRvdWNoID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgdmFyIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcyxcbiAgICAgICAgICBmaXJzdCA9IHRvdWNoZXNbMF0sXG4gICAgICAgICAgZXZlbnRUeXBlcyA9IHtcbiAgICAgICAgICAgIHRvdWNoc3RhcnQ6ICdtb3VzZWRvd24nLFxuICAgICAgICAgICAgdG91Y2htb3ZlOiAnbW91c2Vtb3ZlJyxcbiAgICAgICAgICAgIHRvdWNoZW5kOiAnbW91c2V1cCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHR5cGUgPSBldmVudFR5cGVzW2V2ZW50LnR5cGVdLFxuICAgICAgICAgIHNpbXVsYXRlZEV2ZW50XG4gICAgICAgIDtcblxuICAgICAgaWYoJ01vdXNlRXZlbnQnIGluIHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93Lk1vdXNlRXZlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBuZXcgd2luZG93Lk1vdXNlRXZlbnQodHlwZSwge1xuICAgICAgICAgICdidWJibGVzJzogdHJ1ZSxcbiAgICAgICAgICAnY2FuY2VsYWJsZSc6IHRydWUsXG4gICAgICAgICAgJ3NjcmVlblgnOiBmaXJzdC5zY3JlZW5YLFxuICAgICAgICAgICdzY3JlZW5ZJzogZmlyc3Quc2NyZWVuWSxcbiAgICAgICAgICAnY2xpZW50WCc6IGZpcnN0LmNsaWVudFgsXG4gICAgICAgICAgJ2NsaWVudFknOiBmaXJzdC5jbGllbnRZXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudCcpO1xuICAgICAgICBzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudCh0eXBlLCB0cnVlLCB0cnVlLCB3aW5kb3csIDEsIGZpcnN0LnNjcmVlblgsIGZpcnN0LnNjcmVlblksIGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFksIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLypsZWZ0Ki8sIG51bGwpO1xuICAgICAgfVxuICAgICAgZmlyc3QudGFyZ2V0LmRpc3BhdGNoRXZlbnQoc2ltdWxhdGVkRXZlbnQpO1xuICAgIH07XG4gIH07XG59KGpRdWVyeSk7XG5cblxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqRnJvbSB0aGUgalF1ZXJ5IE1vYmlsZSBMaWJyYXJ5Kipcbi8vKipuZWVkIHRvIHJlY3JlYXRlIGZ1bmN0aW9uYWxpdHkqKlxuLy8qKmFuZCB0cnkgdG8gaW1wcm92ZSBpZiBwb3NzaWJsZSoqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyogUmVtb3ZpbmcgdGhlIGpRdWVyeSBmdW5jdGlvbiAqKioqXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuKGZ1bmN0aW9uKCAkLCB3aW5kb3csIHVuZGVmaW5lZCApIHtcblxuXHR2YXIgJGRvY3VtZW50ID0gJCggZG9jdW1lbnQgKSxcblx0XHQvLyBzdXBwb3J0VG91Y2ggPSAkLm1vYmlsZS5zdXBwb3J0LnRvdWNoLFxuXHRcdHRvdWNoU3RhcnRFdmVudCA9ICd0b3VjaHN0YXJ0Jy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiLFxuXHRcdHRvdWNoU3RvcEV2ZW50ID0gJ3RvdWNoZW5kJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCIsXG5cdFx0dG91Y2hNb3ZlRXZlbnQgPSAndG91Y2htb3ZlJy8vc3VwcG9ydFRvdWNoID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG5cblx0Ly8gc2V0dXAgbmV3IGV2ZW50IHNob3J0Y3V0c1xuXHQkLmVhY2goICggXCJ0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCBcIiArXG5cdFx0XCJzd2lwZSBzd2lwZWxlZnQgc3dpcGVyaWdodFwiICkuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXG5cdFx0JC5mblsgbmFtZSBdID0gZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0cmV0dXJuIGZuID8gdGhpcy5iaW5kKCBuYW1lLCBmbiApIDogdGhpcy50cmlnZ2VyKCBuYW1lICk7XG5cdFx0fTtcblxuXHRcdC8vIGpRdWVyeSA8IDEuOFxuXHRcdGlmICggJC5hdHRyRm4gKSB7XG5cdFx0XHQkLmF0dHJGblsgbmFtZSBdID0gdHJ1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHRyaWdnZXJDdXN0b21FdmVudCggb2JqLCBldmVudFR5cGUsIGV2ZW50LCBidWJibGUgKSB7XG5cdFx0dmFyIG9yaWdpbmFsVHlwZSA9IGV2ZW50LnR5cGU7XG5cdFx0ZXZlbnQudHlwZSA9IGV2ZW50VHlwZTtcblx0XHRpZiAoIGJ1YmJsZSApIHtcblx0XHRcdCQuZXZlbnQudHJpZ2dlciggZXZlbnQsIHVuZGVmaW5lZCwgb2JqICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQuZXZlbnQuZGlzcGF0Y2guY2FsbCggb2JqLCBldmVudCApO1xuXHRcdH1cblx0XHRldmVudC50eXBlID0gb3JpZ2luYWxUeXBlO1xuXHR9XG5cblx0Ly8gYWxzbyBoYW5kbGVzIHRhcGhvbGRcblxuXHQvLyBBbHNvIGhhbmRsZXMgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0XG5cdCQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHtcblxuXHRcdC8vIE1vcmUgdGhhbiB0aGlzIGhvcml6b250YWwgZGlzcGxhY2VtZW50LCBhbmQgd2Ugd2lsbCBzdXBwcmVzcyBzY3JvbGxpbmcuXG5cdFx0c2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZDogMzAsXG5cblx0XHQvLyBNb3JlIHRpbWUgdGhhbiB0aGlzLCBhbmQgaXQgaXNuJ3QgYSBzd2lwZS5cblx0XHRkdXJhdGlvblRocmVzaG9sZDogMTAwMCxcblxuXHRcdC8vIFN3aXBlIGhvcml6b250YWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbW9yZSB0aGFuIHRoaXMuXG5cdFx0aG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdC8vIFN3aXBlIHZlcnRpY2FsIGRpc3BsYWNlbWVudCBtdXN0IGJlIGxlc3MgdGhhbiB0aGlzLlxuXHRcdHZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Z2V0TG9jYXRpb246IGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHR2YXIgd2luUGFnZVggPSB3aW5kb3cucGFnZVhPZmZzZXQsXG5cdFx0XHRcdHdpblBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuXHRcdFx0XHR4ID0gZXZlbnQuY2xpZW50WCxcblx0XHRcdFx0eSA9IGV2ZW50LmNsaWVudFk7XG5cblx0XHRcdGlmICggZXZlbnQucGFnZVkgPT09IDAgJiYgTWF0aC5mbG9vciggeSApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVkgKSB8fFxuXHRcdFx0XHRldmVudC5wYWdlWCA9PT0gMCAmJiBNYXRoLmZsb29yKCB4ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIGlPUzQgY2xpZW50WC9jbGllbnRZIGhhdmUgdGhlIHZhbHVlIHRoYXQgc2hvdWxkIGhhdmUgYmVlblxuXHRcdFx0XHQvLyBpbiBwYWdlWC9wYWdlWS4gV2hpbGUgcGFnZVgvcGFnZS8gaGF2ZSB0aGUgdmFsdWUgMFxuXHRcdFx0XHR4ID0geCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0geSAtIHdpblBhZ2VZO1xuXHRcdFx0fSBlbHNlIGlmICggeSA8ICggZXZlbnQucGFnZVkgLSB3aW5QYWdlWSkgfHwgeCA8ICggZXZlbnQucGFnZVggLSB3aW5QYWdlWCApICkge1xuXG5cdFx0XHRcdC8vIFNvbWUgQW5kcm9pZCBicm93c2VycyBoYXZlIHRvdGFsbHkgYm9ndXMgdmFsdWVzIGZvciBjbGllbnRYL1lcblx0XHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcvem9vbWluZyBhIHBhZ2UuIERldGVjdGFibGUgc2luY2UgY2xpZW50WC9jbGllbnRZXG5cdFx0XHRcdC8vIHNob3VsZCBuZXZlciBiZSBzbWFsbGVyIHRoYW4gcGFnZVgvcGFnZVkgbWludXMgcGFnZSBzY3JvbGxcblx0XHRcdFx0eCA9IGV2ZW50LnBhZ2VYIC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSBldmVudC5wYWdlWSAtIHdpblBhZ2VZO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiB4LFxuXHRcdFx0XHR5OiB5XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXSxcblx0XHRcdFx0XHRcdG9yaWdpbjogJCggZXZlbnQudGFyZ2V0IClcblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlU3dpcGU6IGZ1bmN0aW9uKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApIHtcblx0XHRcdGlmICggc3RvcC50aW1lIC0gc3RhcnQudGltZSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5kdXJhdGlvblRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaG9yaXpvbnRhbERpc3RhbmNlVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDEgXSAtIHN0b3AuY29vcmRzWyAxIF0gKSA8ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS52ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkICkge1xuXHRcdFx0XHR2YXIgZGlyZWN0aW9uID0gc3RhcnQuY29vcmRzWzBdID4gc3RvcC5jb29yZHNbIDAgXSA/IFwic3dpcGVsZWZ0XCIgOiBcInN3aXBlcmlnaHRcIjtcblxuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIFwic3dpcGVcIiwgJC5FdmVudCggXCJzd2lwZVwiLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9KSwgdHJ1ZSApO1xuXHRcdFx0XHR0cmlnZ2VyQ3VzdG9tRXZlbnQoIHRoaXNPYmplY3QsIGRpcmVjdGlvbiwkLkV2ZW50KCBkaXJlY3Rpb24sIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0gKSwgdHJ1ZSApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdH0sXG5cblx0XHQvLyBUaGlzIHNlcnZlcyBhcyBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgYXQgbW9zdCBvbmUgc3dpcGUgZXZlbnQgZXZlbnQgaXNcblx0XHQvLyBpbiB3b3JrIGF0IGFueSBnaXZlbiB0aW1lXG5cdFx0ZXZlbnRJblByb2dyZXNzOiBmYWxzZSxcblxuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsXG5cdFx0XHRcdHRoaXNPYmplY3QgPSB0aGlzLFxuXHRcdFx0XHQkdGhpcyA9ICQoIHRoaXNPYmplY3QgKSxcblx0XHRcdFx0Y29udGV4dCA9IHt9O1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSB0aGUgZXZlbnRzIGRhdGEgZm9yIHRoaXMgZWxlbWVudCBhbmQgYWRkIHRoZSBzd2lwZSBjb250ZXh0XG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoICFldmVudHMgKSB7XG5cdFx0XHRcdGV2ZW50cyA9IHsgbGVuZ3RoOiAwIH07XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIsIGV2ZW50cyApO1xuXHRcdFx0fVxuXHRcdFx0ZXZlbnRzLmxlbmd0aCsrO1xuXHRcdFx0ZXZlbnRzLnN3aXBlID0gY29udGV4dDtcblxuXHRcdFx0Y29udGV4dC5zdGFydCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblxuXHRcdFx0XHQvLyBCYWlsIGlmIHdlJ3JlIGFscmVhZHkgd29ya2luZyBvbiBhIHN3aXBlIGV2ZW50XG5cdFx0XHRcdGlmICggJC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IHRydWU7XG5cblx0XHRcdFx0dmFyIHN0b3AsXG5cdFx0XHRcdFx0c3RhcnQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RhcnQoIGV2ZW50ICksXG5cdFx0XHRcdFx0b3JpZ1RhcmdldCA9IGV2ZW50LnRhcmdldCxcblx0XHRcdFx0XHRlbWl0dGVkID0gZmFsc2U7XG5cblx0XHRcdFx0Y29udGV4dC5tb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGlmICggIXN0YXJ0IHx8IGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHN0b3AgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc3RvcCggZXZlbnQgKTtcblx0XHRcdFx0XHRpZiAoICFlbWl0dGVkICkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5oYW5kbGVTd2lwZSggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKTtcblx0XHRcdFx0XHRcdGlmICggZW1pdHRlZCApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBwcmV2ZW50IHNjcm9sbGluZ1xuXHRcdFx0XHRcdGlmICggTWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQgKSB7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRjb250ZXh0LnN0b3AgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY29udGV4dCB0byBtYWtlIHdheSBmb3IgdGhlIG5leHQgc3dpcGUgZXZlbnRcblx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0XHRcdGNvbnRleHQubW92ZSA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JGRvY3VtZW50Lm9uKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlIClcblx0XHRcdFx0XHQub25lKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHR9O1xuXHRcdFx0JHRoaXMub24oIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLCBjb250ZXh0O1xuXG5cdFx0XHRldmVudHMgPSAkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRpZiAoIGV2ZW50cyApIHtcblx0XHRcdFx0Y29udGV4dCA9IGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZGVsZXRlIGV2ZW50cy5zd2lwZTtcblx0XHRcdFx0ZXZlbnRzLmxlbmd0aC0tO1xuXHRcdFx0XHRpZiAoIGV2ZW50cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRcdFx0JC5yZW1vdmVEYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggY29udGV4dCApIHtcblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0YXJ0ICkge1xuXHRcdFx0XHRcdCQoIHRoaXMgKS5vZmYoIHRvdWNoU3RhcnRFdmVudCwgY29udGV4dC5zdGFydCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5tb3ZlICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RvcCApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaFN0b3BFdmVudCwgY29udGV4dC5zdG9wICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdCQuZWFjaCh7XG5cdFx0c3dpcGVsZWZ0OiBcInN3aXBlLmxlZnRcIixcblx0XHRzd2lwZXJpZ2h0OiBcInN3aXBlLnJpZ2h0XCJcblx0fSwgZnVuY3Rpb24oIGV2ZW50LCBzb3VyY2VFdmVudCApIHtcblxuXHRcdCQuZXZlbnQuc3BlY2lhbFsgZXZlbnQgXSA9IHtcblx0XHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLmJpbmQoIHNvdXJjZUV2ZW50LCAkLm5vb3AgKTtcblx0XHRcdH0sXG5cdFx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS51bmJpbmQoIHNvdXJjZUV2ZW50ICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59KSggalF1ZXJ5LCB0aGlzICk7XG4qL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4gIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGAke3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgIGluIHdpbmRvdykge1xuICAgICAgcmV0dXJuIHdpbmRvd1tgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYF07XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn0oKSk7XG5cbmNvbnN0IHRyaWdnZXJzID0gKGVsLCB0eXBlKSA9PiB7XG4gIGVsLmRhdGEodHlwZSkuc3BsaXQoJyAnKS5mb3JFYWNoKGlkID0+IHtcbiAgICAkKGAjJHtpZH1gKVsgdHlwZSA9PT0gJ2Nsb3NlJyA/ICd0cmlnZ2VyJyA6ICd0cmlnZ2VySGFuZGxlciddKGAke3R5cGV9LnpmLnRyaWdnZXJgLCBbZWxdKTtcbiAgfSk7XG59O1xuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1vcGVuXSB3aWxsIHJldmVhbCBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLW9wZW5dJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICdvcGVuJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zZV0gd2lsbCBjbG9zZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbi8vIElmIHVzZWQgd2l0aG91dCBhIHZhbHVlIG9uIFtkYXRhLWNsb3NlXSwgdGhlIGV2ZW50IHdpbGwgYnViYmxlLCBhbGxvd2luZyBpdCB0byBjbG9zZSBhIHBhcmVudCBjb21wb25lbnQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1jbG9zZV0nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCdjbG9zZScpO1xuICBpZiAoaWQpIHtcbiAgICB0cmlnZ2VycygkKHRoaXMpLCAnY2xvc2UnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlLnpmLnRyaWdnZXInKTtcbiAgfVxufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtdG9nZ2xlXSB3aWxsIHRvZ2dsZSBhIHBsdWdpbiB0aGF0IHN1cHBvcnRzIGl0IHdoZW4gY2xpY2tlZC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZV0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ3RvZ2dsZScpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2FibGVdIHdpbGwgcmVzcG9uZCB0byBjbG9zZS56Zi50cmlnZ2VyIGV2ZW50cy5cbiQoZG9jdW1lbnQpLm9uKCdjbG9zZS56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NhYmxlXScsIGZ1bmN0aW9uKGUpe1xuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBsZXQgYW5pbWF0aW9uID0gJCh0aGlzKS5kYXRhKCdjbG9zYWJsZScpO1xuXG4gIGlmKGFuaW1hdGlvbiAhPT0gJycpe1xuICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoJCh0aGlzKSwgYW5pbWF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gICAgfSk7XG4gIH1lbHNle1xuICAgICQodGhpcykuZmFkZU91dCgpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICB9XG59KTtcblxuJChkb2N1bWVudCkub24oJ2ZvY3VzLnpmLnRyaWdnZXIgYmx1ci56Zi50cmlnZ2VyJywgJ1tkYXRhLXRvZ2dsZS1mb2N1c10nLCBmdW5jdGlvbigpIHtcbiAgbGV0IGlkID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUtZm9jdXMnKTtcbiAgJChgIyR7aWR9YCkudHJpZ2dlckhhbmRsZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJywgWyQodGhpcyldKTtcbn0pO1xuXG4vKipcbiogRmlyZXMgb25jZSBhZnRlciBhbGwgb3RoZXIgc2NyaXB0cyBoYXZlIGxvYWRlZFxuKiBAZnVuY3Rpb25cbiogQHByaXZhdGVcbiovXG4kKHdpbmRvdykubG9hZCgoKSA9PiB7XG4gIGNoZWNrTGlzdGVuZXJzKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lcnMoKSB7XG4gIGV2ZW50c0xpc3RlbmVyKCk7XG4gIHJlc2l6ZUxpc3RlbmVyKCk7XG4gIHNjcm9sbExpc3RlbmVyKCk7XG4gIGNsb3NlbWVMaXN0ZW5lcigpO1xufVxuXG4vLyoqKioqKioqIG9ubHkgZmlyZXMgdGhpcyBmdW5jdGlvbiBvbmNlIG9uIGxvYWQsIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRvIHdhdGNoICoqKioqKioqXG5mdW5jdGlvbiBjbG9zZW1lTGlzdGVuZXIocGx1Z2luTmFtZSkge1xuICB2YXIgeWV0aUJveGVzID0gJCgnW2RhdGEteWV0aS1ib3hdJyksXG4gICAgICBwbHVnTmFtZXMgPSBbJ2Ryb3Bkb3duJywgJ3Rvb2x0aXAnLCAncmV2ZWFsJ107XG5cbiAgaWYocGx1Z2luTmFtZSl7XG4gICAgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5wdXNoKHBsdWdpbk5hbWUpO1xuICAgIH1lbHNlIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGx1Z2luTmFtZVswXSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLmNvbmNhdChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZXtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsdWdpbiBuYW1lcyBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gIH1cbiAgaWYoeWV0aUJveGVzLmxlbmd0aCl7XG4gICAgbGV0IGxpc3RlbmVycyA9IHBsdWdOYW1lcy5tYXAoKG5hbWUpID0+IHtcbiAgICAgIHJldHVybiBgY2xvc2VtZS56Zi4ke25hbWV9YDtcbiAgICB9KS5qb2luKCcgJyk7XG5cbiAgICAkKHdpbmRvdykub2ZmKGxpc3RlbmVycykub24obGlzdGVuZXJzLCBmdW5jdGlvbihlLCBwbHVnaW5JZCl7XG4gICAgICBsZXQgcGx1Z2luID0gZS5uYW1lc3BhY2Uuc3BsaXQoJy4nKVswXTtcbiAgICAgIGxldCBwbHVnaW5zID0gJChgW2RhdGEtJHtwbHVnaW59XWApLm5vdChgW2RhdGEteWV0aS1ib3g9XCIke3BsdWdpbklkfVwiXWApO1xuXG4gICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IF90aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBfdGhpcy50cmlnZ2VySGFuZGxlcignY2xvc2UuemYudHJpZ2dlcicsIFtfdGhpc10pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzaXplTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1yZXNpemVdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Jlc2l6ZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSByZXNpemUgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJyZXNpemVcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCByZXNpemUgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXNjcm9sbF0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZignc2Nyb2xsLnpmLnRyaWdnZXInKVxuICAgIC5vbignc2Nyb2xsLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKHRpbWVyKXsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHNjcm9sbCBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInNjcm9sbFwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHNjcm9sbCBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2ZW50c0xpc3RlbmVyKCkge1xuICBpZighTXV0YXRpb25PYnNlcnZlcil7IHJldHVybiBmYWxzZTsgfVxuICBsZXQgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yZXNpemVdLCBbZGF0YS1zY3JvbGxdLCBbZGF0YS1tdXRhdGVdJyk7XG5cbiAgLy9lbGVtZW50IGNhbGxiYWNrXG4gIHZhciBsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uID0gZnVuY3Rpb24obXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgIHZhciAkdGFyZ2V0ID0gJChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnRhcmdldCk7XG4gICAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgIHN3aXRjaCAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikpIHtcblxuICAgICAgY2FzZSBcInJlc2l6ZVwiIDpcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJzY3JvbGxcIiA6XG4gICAgICAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgXCJtdXRhdGVcIiA6XG4gICAgICAvLyBjb25zb2xlLmxvZygnbXV0YXRlJywgJHRhcmdldCk7XG4gICAgICAvLyAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdtdXRhdGUuemYudHJpZ2dlcicpO1xuICAgICAgLy9cbiAgICAgIC8vIC8vbWFrZSBzdXJlIHdlIGRvbid0IGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wIGZyb20gc2xvcHB5IGNvZGVpbmdcbiAgICAgIC8vIGlmICgkdGFyZ2V0LmluZGV4KCdbZGF0YS1tdXRhdGVdJykgPT0gJChcIltkYXRhLW11dGF0ZV1cIikubGVuZ3RoLTEpIHtcbiAgICAgIC8vICAgZG9tTXV0YXRpb25PYnNlcnZlcigpO1xuICAgICAgLy8gfVxuICAgICAgLy8gYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQgOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy9ub3RoaW5nXG4gICAgfVxuICB9XG5cbiAgaWYobm9kZXMubGVuZ3RoKXtcbiAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIChvciBjb21pbmcgc29vbiBtdXRhdGlvbikgYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoLTE7IGkrKykge1xuICAgICAgbGV0IGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiBmYWxzZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6ZmFsc2UsIGF0dHJpYnV0ZUZpbHRlcjpbXCJkYXRhLWV2ZW50c1wiXX0pO1xuICAgIH1cbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XG4vLyAgIC8vICEhISBUaGlzIGlzIGNvbWluZyBzb29uIGFuZCBuZWVkcyBtb3JlIHdvcms7IG5vdCBhY3RpdmUgICEhISAvL1xuLy8gICB2YXIgdGltZXIsXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xuLy8gICAvL1xuLy8gICBpZiAobm9kZXMubGVuZ3RoKSB7XG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuLy8gICAgIC8vICAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4vLyAgICAgLy8gICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XG4vLyAgICAgLy8gICAgICAgcmV0dXJuIHdpbmRvd1twcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJ107XG4vLyAgICAgLy8gICAgIH1cbi8vICAgICAvLyAgIH1cbi8vICAgICAvLyAgIHJldHVybiBmYWxzZTtcbi8vICAgICAvLyB9KCkpO1xuLy9cbi8vXG4vLyAgICAgLy9mb3IgdGhlIGJvZHksIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBhbGwgY2hhbmdlcyBlZmZlY3RpbmcgdGhlIHN0eWxlIGFuZCBjbGFzcyBhdHRyaWJ1dGVzXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XG4vLyAgICAgYm9keU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOnRydWUsIGF0dHJpYnV0ZUZpbHRlcjpbXCJzdHlsZVwiLCBcImNsYXNzXCJdfSk7XG4vL1xuLy9cbi8vICAgICAvL2JvZHkgY2FsbGJhY2tcbi8vICAgICBmdW5jdGlvbiBib2R5TXV0YXRpb24obXV0YXRlKSB7XG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcbi8vICAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG4vL1xuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBib2R5T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuLy8gICAgICAgICAkKCdbZGF0YS1tdXRhdGVdJykuYXR0cignZGF0YS1ldmVudHMnLFwibXV0YXRlXCIpO1xuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBYmlkZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWJpZGVcbiAqL1xuXG5jbGFzcyBBYmlkZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFiaWRlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBBYmlkZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWJpZGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgQWJpZGUgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IEFiaWRlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRpbnB1dHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0Jyk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEFiaWRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLmFiaWRlJylcbiAgICAgIC5vbigncmVzZXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzZXRGb3JtKCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdzdWJtaXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlRm9ybSgpO1xuICAgICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnZhbGlkYXRlT24gPT09ICdmaWVsZENoYW5nZScpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdjaGFuZ2UuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2NoYW5nZS56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5saXZlVmFsaWRhdGUpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdpbnB1dC56Zi5hYmlkZScpXG4gICAgICAgIC5vbignaW5wdXQuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBBYmlkZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIG9yIG5vdCBhIGZvcm0gZWxlbWVudCBoYXMgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBhbmQgaWYgaXQncyBjaGVja2VkIG9yIG5vdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICByZXF1aXJlZENoZWNrKCRlbCkge1xuICAgIGlmICghJGVsLmF0dHIoJ3JlcXVpcmVkJykpIHJldHVybiB0cnVlO1xuXG4gICAgdmFyIGlzR29vZCA9IHRydWU7XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIGlzR29vZCA9ICRlbFswXS5jaGVja2VkO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFyIG9wdCA9ICRlbC5maW5kKCdvcHRpb246c2VsZWN0ZWQnKTtcbiAgICAgICAgaWYgKCFvcHQubGVuZ3RoIHx8ICFvcHQudmFsKCkpIGlzR29vZCA9IGZhbHNlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYoISRlbC52YWwoKSB8fCAhJGVsLnZhbCgpLmxlbmd0aCkgaXNHb29kID0gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzR29vZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYXNlZCBvbiAkZWwsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB3aXRoIHNlbGVjdG9yIGluIHRoaXMgb3JkZXI6XG4gICAqIDEuIFRoZSBlbGVtZW50J3MgZGlyZWN0IHNpYmxpbmcoJ3MpLlxuICAgKiAzLiBUaGUgZWxlbWVudCdzIHBhcmVudCdzIGNoaWxkcmVuLlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyBmb3IgbXVsdGlwbGUgZm9ybSBlcnJvcnMgcGVyIGlucHV0LCB0aG91Z2ggaWYgbm9uZSBhcmUgZm91bmQsIG5vIGZvcm0gZXJyb3JzIHdpbGwgYmUgc2hvd24uXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyByZWZlcmVuY2UgdG8gZmluZCB0aGUgZm9ybSBlcnJvciBzZWxlY3Rvci5cbiAgICogQHJldHVybnMge09iamVjdH0galF1ZXJ5IG9iamVjdCB3aXRoIHRoZSBzZWxlY3Rvci5cbiAgICovXG4gIGZpbmRGb3JtRXJyb3IoJGVsKSB7XG4gICAgdmFyICRlcnJvciA9ICRlbC5zaWJsaW5ncyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuXG4gICAgaWYgKCEkZXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZXJyb3IgPSAkZWwucGFyZW50KCkuZmluZCh0aGlzLm9wdGlvbnMuZm9ybUVycm9yU2VsZWN0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiAkZXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoaXMgb3JkZXI6XG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kTGFiZWwoJGVsKSB7XG4gICAgdmFyIGlkID0gJGVsWzBdLmlkO1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLiRlbGVtZW50LmZpbmQoYGxhYmVsW2Zvcj1cIiR7aWR9XCJdYCk7XG5cbiAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAkZWwuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGxhYmVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2V0IG9mIGxhYmVscyBhc3NvY2lhdGVkIHdpdGggYSBzZXQgb2YgcmFkaW8gZWxzIGluIHRoaXMgb3JkZXJcbiAgICogMi4gVGhlIDxsYWJlbD4gd2l0aCB0aGUgYXR0cmlidXRlIGBbZm9yPVwic29tZUlucHV0SWRcIl1gXG4gICAqIDMuIFRoZSBgLmNsb3Nlc3QoKWAgPGxhYmVsPlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBjaGVjayBmb3IgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgYXR0cmlidXRlIGlzIGNoZWNrZWQgb3IgZW1wdHlcbiAgICovXG4gIGZpbmRSYWRpb0xhYmVscygkZWxzKSB7XG4gICAgdmFyIGxhYmVscyA9ICRlbHMubWFwKChpLCBlbCkgPT4ge1xuICAgICAgdmFyIGlkID0gZWwuaWQ7XG4gICAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgICBpZiAoISRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgJGxhYmVsID0gJChlbCkuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAkbGFiZWxbMF07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gJChsYWJlbHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIENTUyBlcnJvciBjbGFzcyBhcyBzcGVjaWZpZWQgYnkgdGhlIEFiaWRlIHNldHRpbmdzIHRvIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIGNsYXNzIHRvXG4gICAqL1xuICBhZGRFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgdmFyICRsYWJlbCA9IHRoaXMuZmluZExhYmVsKCRlbCk7XG4gICAgdmFyICRmb3JtRXJyb3IgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVsKTtcblxuICAgIGlmICgkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAkbGFiZWwuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3IubGVuZ3RoKSB7XG4gICAgICAkZm9ybUVycm9yLmFkZENsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLmF0dHIoJ2RhdGEtaW52YWxpZCcsICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgQ1NTIGVycm9yIGNsYXNzZXMgZXRjIGZyb20gYW4gZW50aXJlIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICpcbiAgICovXG5cbiAgcmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMoZ3JvdXBOYW1lKSB7XG4gICAgdmFyICRlbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyICRsYWJlbHMgPSB0aGlzLmZpbmRSYWRpb0xhYmVscygkZWxzKTtcbiAgICB2YXIgJGZvcm1FcnJvcnMgPSB0aGlzLmZpbmRGb3JtRXJyb3IoJGVscyk7XG5cbiAgICBpZiAoJGxhYmVscy5sZW5ndGgpIHtcbiAgICAgICRsYWJlbHMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgaWYgKCRmb3JtRXJyb3JzLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvcnMucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5pbnB1dEVycm9yQ2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyBmcm9tIHRoZSBsYWJlbCwgaW5wdXQsIGFuZCB0aGUgZm9ybVxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byByZW1vdmUgdGhlIGNsYXNzIGZyb21cbiAgICovXG4gIHJlbW92ZUVycm9yQ2xhc3NlcygkZWwpIHtcbiAgICAvLyByYWRpb3MgbmVlZCB0byBjbGVhciBhbGwgb2YgdGhlIGVsc1xuICAgIGlmKCRlbFswXS50eXBlID09ICdyYWRpbycpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKCRlbC5hdHRyKCduYW1lJykpO1xuICAgIH1cblxuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIHRvIGZpbmQgaW5wdXRzIGFuZCBwcm9jZWVkcyB0byB2YWxpZGF0ZSB0aGVtIGluIHdheXMgc3BlY2lmaWMgdG8gdGhlaXIgdHlwZVxuICAgKiBAZmlyZXMgQWJpZGUjaW52YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjdmFsaWRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHZhbGlkYXRlLCBzaG91bGQgYmUgYW4gSFRNTCBpbnB1dFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZ29vZFRvR28gLSBJZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LlxuICAgKi9cbiAgdmFsaWRhdGVJbnB1dCgkZWwpIHtcbiAgICB2YXIgY2xlYXJSZXF1aXJlID0gdGhpcy5yZXF1aXJlZENoZWNrKCRlbCksXG4gICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlLFxuICAgICAgICBjdXN0b21WYWxpZGF0b3IgPSB0cnVlLFxuICAgICAgICB2YWxpZGF0b3IgPSAkZWwuYXR0cignZGF0YS12YWxpZGF0b3InKSxcbiAgICAgICAgZXF1YWxUbyA9IHRydWU7XG5cbiAgICAvLyBkb24ndCB2YWxpZGF0ZSBpZ25vcmVkIGlucHV0cyBvciBoaWRkZW4gaW5wdXRzXG4gICAgaWYgKCRlbC5pcygnW2RhdGEtYWJpZGUtaWdub3JlXScpIHx8ICRlbC5pcygnW3R5cGU9XCJoaWRkZW5cIl0nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlUmFkaW8oJGVsLmF0dHIoJ25hbWUnKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhbGlkYXRlZCA9IGNsZWFyUmVxdWlyZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVUZXh0KCRlbCk7XG4gICAgfVxuXG4gICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdGhpcy5tYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3IsICRlbC5hdHRyKCdyZXF1aXJlZCcpKTtcbiAgICB9XG5cbiAgICBpZiAoJGVsLmF0dHIoJ2RhdGEtZXF1YWx0bycpKSB7XG4gICAgICBlcXVhbFRvID0gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnMuZXF1YWxUbygkZWwpO1xuICAgIH1cblxuXG4gICAgdmFyIGdvb2RUb0dvID0gW2NsZWFyUmVxdWlyZSwgdmFsaWRhdGVkLCBjdXN0b21WYWxpZGF0b3IsIGVxdWFsVG9dLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbiAgICB2YXIgbWVzc2FnZSA9IChnb29kVG9HbyA/ICd2YWxpZCcgOiAnaW52YWxpZCcpICsgJy56Zi5hYmlkZSc7XG5cbiAgICB0aGlzW2dvb2RUb0dvID8gJ3JlbW92ZUVycm9yQ2xhc3NlcycgOiAnYWRkRXJyb3JDbGFzc2VzJ10oJGVsKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGlucHV0IGlzIGRvbmUgY2hlY2tpbmcgZm9yIHZhbGlkYXRpb24uIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGB2YWxpZC56Zi5hYmlkZWAgb3IgYGludmFsaWQuemYuYWJpZGVgXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIGlucHV0LlxuICAgICAqIEBldmVudCBBYmlkZSN2YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNpbnZhbGlkXG4gICAgICovXG4gICAgJGVsLnRyaWdnZXIobWVzc2FnZSwgWyRlbF0pO1xuXG4gICAgcmV0dXJuIGdvb2RUb0dvO1xuICB9XG5cbiAgLyoqXG4gICAqIEdvZXMgdGhyb3VnaCBhIGZvcm0gYW5kIGlmIHRoZXJlIGFyZSBhbnkgaW52YWxpZCBpbnB1dHMsIGl0IHdpbGwgZGlzcGxheSB0aGUgZm9ybSBlcnJvciBlbGVtZW50XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBub0Vycm9yIC0gdHJ1ZSBpZiBubyBlcnJvcnMgd2VyZSBkZXRlY3RlZC4uLlxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXZhbGlkXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtaW52YWxpZFxuICAgKi9cbiAgdmFsaWRhdGVGb3JtKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kaW5wdXRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBhY2MucHVzaChfdGhpcy52YWxpZGF0ZUlucHV0KCQodGhpcykpKTtcbiAgICB9KTtcblxuICAgIHZhciBub0Vycm9yID0gYWNjLmluZGV4T2YoZmFsc2UpID09PSAtMTtcblxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgKG5vRXJyb3IgPyAnbm9uZScgOiAnYmxvY2snKSk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGlzIGZpbmlzaGVkIHZhbGlkYXRpbmcuIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGBmb3JtdmFsaWQuemYuYWJpZGVgIG9yIGBmb3JtaW52YWxpZC56Zi5hYmlkZWAuXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgZWxlbWVudCBvZiB0aGUgZm9ybS5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXZhbGlkXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm1pbnZhbGlkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKChub0Vycm9yID8gJ2Zvcm12YWxpZCcgOiAnZm9ybWludmFsaWQnKSArICcuemYuYWJpZGUnLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgcmV0dXJuIG5vRXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgdGV4dCBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB0aGUgcGF0dGVybiBzcGVjaWZpZWQgaW4gdGhlIGF0dHJpYnV0ZS4gSWYgbm8gbWF0Y2hpbmcgcGF0dGVybiBpcyBmb3VuZCwgcmV0dXJucyB0cnVlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGEgdGV4dCBpbnB1dCBIVE1MIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdHRlcm4gLSBzdHJpbmcgdmFsdWUgb2Ygb25lIG9mIHRoZSBSZWdFeCBwYXR0ZXJucyBpbiBBYmlkZS5vcHRpb25zLnBhdHRlcm5zXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgdGhlIGlucHV0IHZhbHVlIG1hdGNoZXMgdGhlIHBhdHRlcm4gc3BlY2lmaWVkXG4gICAqL1xuICB2YWxpZGF0ZVRleHQoJGVsLCBwYXR0ZXJuKSB7XG4gICAgLy8gQSBwYXR0ZXJuIGNhbiBiZSBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgb3IgaXQgd2lsbCBiZSBpbmZlcmVkIGZyb20gdGhlIGlucHV0J3MgXCJwYXR0ZXJuXCIgYXR0cmlidXRlLCBvciBpdCdzIFwidHlwZVwiIGF0dHJpYnV0ZVxuICAgIHBhdHRlcm4gPSAocGF0dGVybiB8fCAkZWwuYXR0cigncGF0dGVybicpIHx8ICRlbC5hdHRyKCd0eXBlJykpO1xuICAgIHZhciBpbnB1dFRleHQgPSAkZWwudmFsKCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2U7XG5cbiAgICBpZiAoaW5wdXRUZXh0Lmxlbmd0aCkge1xuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGlzIGluIEFiaWRlJ3MgbGlzdCBvZiBwYXR0ZXJucywgdGhlbiB0ZXN0IHRoYXQgcmVnZXhwXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnBhdHRlcm5zLmhhc093blByb3BlcnR5KHBhdHRlcm4pKSB7XG4gICAgICAgIHZhbGlkID0gdGhpcy5vcHRpb25zLnBhdHRlcm5zW3BhdHRlcm5dLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIG5hbWUgaXNuJ3QgYWxzbyB0aGUgdHlwZSBhdHRyaWJ1dGUgb2YgdGhlIGZpZWxkLCB0aGVuIHRlc3QgaXQgYXMgYSByZWdleHBcbiAgICAgIGVsc2UgaWYgKHBhdHRlcm4gIT09ICRlbC5hdHRyKCd0eXBlJykpIHtcbiAgICAgICAgdmFsaWQgPSBuZXcgUmVnRXhwKHBhdHRlcm4pLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFuIGVtcHR5IGZpZWxkIGlzIHZhbGlkIGlmIGl0J3Mgbm90IHJlcXVpcmVkXG4gICAgZWxzZSBpZiAoISRlbC5wcm9wKCdyZXF1aXJlZCcpKSB7XG4gICAgICB2YWxpZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkO1xuICAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSByYWRpbyBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB3aGV0aGVyIG9yIG5vdCBpdCBpcyByZXF1aXJlZCBhbmQgc2VsZWN0ZWQuIEFsdGhvdWdoIHRoZSBmdW5jdGlvbiB0YXJnZXRzIGEgc2luZ2xlIGA8aW5wdXQ+YCwgaXQgdmFsaWRhdGVzIGJ5IGNoZWNraW5nIHRoZSBgcmVxdWlyZWRgIGFuZCBgY2hlY2tlZGAgcHJvcGVydGllcyBvZiBhbGwgcmFkaW8gYnV0dG9ucyBpbiBpdHMgZ3JvdXAuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBncm91cE5hbWUgLSBBIHN0cmluZyB0aGF0IHNwZWNpZmllcyB0aGUgbmFtZSBvZiBhIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0IGxlYXN0IG9uZSByYWRpbyBpbnB1dCBoYXMgYmVlbiBzZWxlY3RlZCAoaWYgaXQncyByZXF1aXJlZClcbiAgICovXG4gIHZhbGlkYXRlUmFkaW8oZ3JvdXBOYW1lKSB7XG4gICAgLy8gSWYgYXQgbGVhc3Qgb25lIHJhZGlvIGluIHRoZSBncm91cCBoYXMgdGhlIGByZXF1aXJlZGAgYXR0cmlidXRlLCB0aGUgZ3JvdXAgaXMgY29uc2lkZXJlZCByZXF1aXJlZFxuICAgIC8vIFBlciBXM0Mgc3BlYywgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gYSBncm91cCBzaG91bGQgaGF2ZSBgcmVxdWlyZWRgLCBidXQgd2UncmUgYmVpbmcgbmljZVxuICAgIHZhciAkZ3JvdXAgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2UsIHJlcXVpcmVkID0gZmFsc2U7XG5cbiAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHJlcXVpcmVkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgcmVxdWlyZWRcbiAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgaWYgKCQoZSkuYXR0cigncmVxdWlyZWQnKSkge1xuICAgICAgICByZXF1aXJlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYoIXJlcXVpcmVkKSB2YWxpZD10cnVlO1xuXG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSB2YWxpZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIGNoZWNrZWRcbiAgICAgICRncm91cC5lYWNoKChpLCBlKSA9PiB7XG4gICAgICAgIGlmICgkKGUpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgc2VsZWN0ZWQgaW5wdXQgcGFzc2VzIGEgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb24uIE11bHRpcGxlIHZhbGlkYXRpb25zIGNhbiBiZSB1c2VkLCBpZiBwYXNzZWQgdG8gdGhlIGVsZW1lbnQgd2l0aCBgZGF0YS12YWxpZGF0b3I9XCJmb28gYmFyIGJhelwiYCBpbiBhIHNwYWNlIHNlcGFyYXRlZCBsaXN0ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgaW5wdXQgZWxlbWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbGlkYXRvcnMgLSBhIHN0cmluZyBvZiBmdW5jdGlvbiBuYW1lcyBtYXRjaGluZyBmdW5jdGlvbnMgaW4gdGhlIEFiaWRlLm9wdGlvbnMudmFsaWRhdG9ycyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgLSBzZWxmIGV4cGxhbmF0b3J5P1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIHZhbGlkYXRpb25zIHBhc3NlZC5cbiAgICovXG4gIG1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvcnMsIHJlcXVpcmVkKSB7XG4gICAgcmVxdWlyZWQgPSByZXF1aXJlZCA/IHRydWUgOiBmYWxzZTtcblxuICAgIHZhciBjbGVhciA9IHZhbGlkYXRvcnMuc3BsaXQoJyAnKS5tYXAoKHYpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMudmFsaWRhdG9yc1t2XSgkZWwsIHJlcXVpcmVkLCAkZWwucGFyZW50KCkpO1xuICAgIH0pO1xuICAgIHJldHVybiBjbGVhci5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIGZvcm0gaW5wdXRzIGFuZCBzdHlsZXNcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1yZXNldFxuICAgKi9cbiAgcmVzZXRGb3JtKCkge1xuICAgIHZhciAkZm9ybSA9IHRoaXMuJGVsZW1lbnQsXG4gICAgICAgIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAkKGAuJHtvcHRzLmxhYmVsRXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMubGFiZWxFcnJvckNsYXNzKTtcbiAgICAkKGAuJHtvcHRzLmlucHV0RXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMuaW5wdXRFcnJvckNsYXNzKTtcbiAgICAkKGAke29wdHMuZm9ybUVycm9yU2VsZWN0b3J9LiR7b3B0cy5mb3JtRXJyb3JDbGFzc31gKS5yZW1vdmVDbGFzcyhvcHRzLmZvcm1FcnJvckNsYXNzKTtcbiAgICAkZm9ybS5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICQoJzppbnB1dCcsICRmb3JtKS5ub3QoJzpidXR0b24sIDpzdWJtaXQsIDpyZXNldCwgOmhpZGRlbiwgOnJhZGlvLCA6Y2hlY2tib3gsIFtkYXRhLWFiaWRlLWlnbm9yZV0nKS52YWwoJycpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpyYWRpbycsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgJCgnOmlucHV0OmNoZWNrYm94JywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGhhcyBiZWVuIHJlc2V0LlxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtcmVzZXRcbiAgICAgKi9cbiAgICAkZm9ybS50cmlnZ2VyKCdmb3JtcmVzZXQuemYuYWJpZGUnLCBbJGZvcm1dKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogUmVtb3ZlcyBlcnJvciBzdHlsZXMgYW5kIGNsYXNzZXMgZnJvbSBlbGVtZW50cywgd2l0aG91dCByZXNldHRpbmcgdGhlaXIgdmFsdWVzLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJylcbiAgICAgICAgLmNzcygnZGlzcGxheScsICdub25lJyk7XG5cbiAgICB0aGlzLiRpbnB1dHNcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMucmVtb3ZlRXJyb3JDbGFzc2VzKCQodGhpcykpO1xuICAgICAgfSk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuQWJpZGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBldmVudCB0byB2YWxpZGF0ZSBpbnB1dHMuIENoZWNrYm94ZXMgYW5kIHJhZGlvcyB2YWxpZGF0ZSBpbW1lZGlhdGVseS5cbiAgICogUmVtb3ZlIG9yIGNoYW5nZSB0aGlzIHZhbHVlIGZvciBtYW51YWwgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZmllbGRDaGFuZ2UnXG4gICAqL1xuICB2YWxpZGF0ZU9uOiAnZmllbGRDaGFuZ2UnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0IGxhYmVscyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1sYWJlbCdcbiAgICovXG4gIGxhYmVsRXJyb3JDbGFzczogJ2lzLWludmFsaWQtbGFiZWwnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0cyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1pbnB1dCdcbiAgICovXG4gIGlucHV0RXJyb3JDbGFzczogJ2lzLWludmFsaWQtaW5wdXQnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBzZWxlY3RvciB0byB1c2UgdG8gdGFyZ2V0IEZvcm0gRXJyb3JzIGZvciBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJy5mb3JtLWVycm9yJ1xuICAgKi9cbiAgZm9ybUVycm9yU2VsZWN0b3I6ICcuZm9ybS1lcnJvcicsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFkZGVkIHRvIEZvcm0gRXJyb3JzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy12aXNpYmxlJ1xuICAgKi9cbiAgZm9ybUVycm9yQ2xhc3M6ICdpcy12aXNpYmxlJyxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgdGV4dCBpbnB1dHMgb24gYW55IHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbGl2ZVZhbGlkYXRlOiBmYWxzZSxcblxuICBwYXR0ZXJuczoge1xuICAgIGFscGhhIDogL15bYS16QS1aXSskLyxcbiAgICBhbHBoYV9udW1lcmljIDogL15bYS16QS1aMC05XSskLyxcbiAgICBpbnRlZ2VyIDogL15bLStdP1xcZCskLyxcbiAgICBudW1iZXIgOiAvXlstK10/XFxkKig/OltcXC5cXCxdXFxkKyk/JC8sXG5cbiAgICAvLyBhbWV4LCB2aXNhLCBkaW5lcnNcbiAgICBjYXJkIDogL14oPzo0WzAtOV17MTJ9KD86WzAtOV17M30pP3w1WzEtNV1bMC05XXsxNH18Nig/OjAxMXw1WzAtOV1bMC05XSlbMC05XXsxMn18M1s0N11bMC05XXsxM318Myg/OjBbMC01XXxbNjhdWzAtOV0pWzAtOV17MTF9fCg/OjIxMzF8MTgwMHwzNVxcZHszfSlcXGR7MTF9KSQvLFxuICAgIGN2diA6IC9eKFswLTldKXszLDR9JC8sXG5cbiAgICAvLyBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9zdGF0ZXMtb2YtdGhlLXR5cGUtYXR0cmlidXRlLmh0bWwjdmFsaWQtZS1tYWlsLWFkZHJlc3NcbiAgICBlbWFpbCA6IC9eW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKyQvLFxuXG4gICAgdXJsIDogL14oaHR0cHM/fGZ0cHxmaWxlfHNzaCk6XFwvXFwvKCgoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKkApPygoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KCgoW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuPykoOlxcZCopPykoXFwvKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSsoXFwvKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKikqKT8pPyhcXD8oKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KFxcIygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8XFwvfFxcPykqKT8kLyxcbiAgICAvLyBhYmMuZGVcbiAgICBkb21haW4gOiAvXihbYS16QS1aMC05XShbYS16QS1aMC05XFwtXXswLDYxfVthLXpBLVowLTldKT9cXC4pK1thLXpBLVpdezIsOH0kLyxcblxuICAgIGRhdGV0aW1lIDogL14oWzAtMl1bMC05XXszfSlcXC0oWzAtMV1bMC05XSlcXC0oWzAtM11bMC05XSlUKFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pKFp8KFtcXC1cXCtdKFswLTFdWzAtOV0pXFw6MDApKSQvLFxuICAgIC8vIFlZWVktTU0tRERcbiAgICBkYXRlIDogLyg/OjE5fDIwKVswLTldezJ9LSg/Oig/OjBbMS05XXwxWzAtMl0pLSg/OjBbMS05XXwxWzAtOV18MlswLTldKXwoPzooPyEwMikoPzowWzEtOV18MVswLTJdKS0oPzozMCkpfCg/Oig/OjBbMTM1NzhdfDFbMDJdKS0zMSkpJC8sXG4gICAgLy8gSEg6TU06U1NcbiAgICB0aW1lIDogL14oMFswLTldfDFbMC05XXwyWzAtM10pKDpbMC01XVswLTldKXsyfSQvLFxuICAgIGRhdGVJU08gOiAvXlxcZHs0fVtcXC9cXC1dXFxkezEsMn1bXFwvXFwtXVxcZHsxLDJ9JC8sXG4gICAgLy8gTU0vREQvWVlZWVxuICAgIG1vbnRoX2RheV95ZWFyIDogL14oMFsxLTldfDFbMDEyXSlbLSBcXC8uXSgwWzEtOV18WzEyXVswLTldfDNbMDFdKVstIFxcLy5dXFxkezR9JC8sXG4gICAgLy8gREQvTU0vWVlZWVxuICAgIGRheV9tb250aF95ZWFyIDogL14oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXSgwWzEtOV18MVswMTJdKVstIFxcLy5dXFxkezR9JC8sXG5cbiAgICAvLyAjRkZGIG9yICNGRkZGRkZcbiAgICBjb2xvciA6IC9eIz8oW2EtZkEtRjAtOV17Nn18W2EtZkEtRjAtOV17M30pJC9cbiAgfSxcblxuICAvKipcbiAgICogT3B0aW9uYWwgdmFsaWRhdGlvbiBmdW5jdGlvbnMgdG8gYmUgdXNlZC4gYGVxdWFsVG9gIGJlaW5nIHRoZSBvbmx5IGRlZmF1bHQgaW5jbHVkZWQgZnVuY3Rpb24uXG4gICAqIEZ1bmN0aW9ucyBzaG91bGQgcmV0dXJuIG9ubHkgYSBib29sZWFuIGlmIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3QuIEZ1bmN0aW9ucyBhcmUgZ2l2ZW4gdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAqIGVsIDogVGhlIGpRdWVyeSBlbGVtZW50IHRvIHZhbGlkYXRlLlxuICAgKiByZXF1aXJlZCA6IEJvb2xlYW4gdmFsdWUgb2YgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBiZSBwcmVzZW50IG9yIG5vdC5cbiAgICogcGFyZW50IDogVGhlIGRpcmVjdCBwYXJlbnQgb2YgdGhlIGlucHV0LlxuICAgKiBAb3B0aW9uXG4gICAqL1xuICB2YWxpZGF0b3JzOiB7XG4gICAgZXF1YWxUbzogZnVuY3Rpb24gKGVsLCByZXF1aXJlZCwgcGFyZW50KSB7XG4gICAgICByZXR1cm4gJChgIyR7ZWwuYXR0cignZGF0YS1lcXVhbHRvJyl9YCkudmFsKCkgPT09IGVsLnZhbCgpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWJpZGUsICdBYmlkZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hY2NvcmRpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKi9cblxuY2xhc3MgQWNjb3JkaW9uIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFjY29yZGlvbiNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIGEgcGxhaW4gb2JqZWN0IHdpdGggc2V0dGluZ3MgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdBY2NvcmRpb24nLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBieSBhbmltYXRpbmcgdGhlIHByZXNldCBhY3RpdmUgcGFuZShzKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cigncm9sZScsICd0YWJsaXN0Jyk7XG4gICAgdGhpcy4kdGFicyA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJ2xpLCBbZGF0YS1hY2NvcmRpb24taXRlbV0nKTtcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbihpZHgsIGVsKSB7XG4gICAgICB2YXIgJGVsID0gJChlbCksXG4gICAgICAgICAgJGNvbnRlbnQgPSAkZWwuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpLFxuICAgICAgICAgIGlkID0gJGNvbnRlbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjb3JkaW9uJyksXG4gICAgICAgICAgbGlua0lkID0gZWwuaWQgfHwgYCR7aWR9LWxhYmVsYDtcblxuICAgICAgJGVsLmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2lkJzogbGlua0lkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgJGNvbnRlbnQuYXR0cih7J3JvbGUnOiAndGFicGFuZWwnLCAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLCAnYXJpYS1oaWRkZW4nOiB0cnVlLCAnaWQnOiBpZH0pO1xuICAgIH0pO1xuICAgIHZhciAkaW5pdEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICBpZigkaW5pdEFjdGl2ZS5sZW5ndGgpe1xuICAgICAgdGhpcy5kb3duKCRpbml0QWN0aXZlLCB0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBhY2NvcmRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpO1xuICAgICAgdmFyICR0YWJDb250ZW50ID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCR0YWJDb250ZW50Lmxlbmd0aCkge1xuICAgICAgICAkZWxlbS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uIGtleWRvd24uemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyAkKHRoaXMpLmNoaWxkcmVuKCdhJykub24oJ2NsaWNrLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaWYgKCRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCB8fCAkZWxlbS5zaWJsaW5ncygpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSl7XG4gICAgICAgICAgICAgIF90aGlzLnVwKCR0YWJDb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YWJDb250ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb24nLCB7XG4gICAgICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy50b2dnbGUoJHRhYkNvbnRlbnQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5uZXh0KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLnByZXYoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHNlbGVjdGVkIGNvbnRlbnQgcGFuZSdzIG9wZW4vY2xvc2Ugc3RhdGUuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0galF1ZXJ5IG9iamVjdCBvZiB0aGUgcGFuZSB0byB0b2dnbGUuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpIHtcbiAgICBpZigkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgaWYodGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkIHx8ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpe1xuICAgICAgICB0aGlzLnVwKCR0YXJnZXQpO1xuICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHBhbmUgdG8gb3Blbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBmaXJzdFRpbWUgLSBmbGFnIHRvIGRldGVybWluZSBpZiByZWZsb3cgc2hvdWxkIGhhcHBlbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkb3duXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZG93bigkdGFyZ2V0LCBmaXJzdFRpbWUpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCAmJiAhZmlyc3RUaW1lKSB7XG4gICAgICB2YXIgJGN1cnJlbnRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYoJGN1cnJlbnRBY3RpdmUubGVuZ3RoKXtcbiAgICAgICAgdGhpcy51cCgkY3VycmVudEFjdGl2ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHRhcmdldFxuICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpXG4gICAgICAucGFyZW50KCdbZGF0YS10YWItY29udGVudF0nKVxuICAgICAgLmFkZEJhY2soKVxuICAgICAgLnBhcmVudCgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICR0YXJnZXQuc2xpZGVEb3duKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAoKSA9PiB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI2Rvd25cbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdkb3duLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgfSk7XG5cbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiB0cnVlLFxuICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiB0cnVlXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHRhYiB0byBjbG9zZS5cbiAgICogQGZpcmVzIEFjY29yZGlvbiN1cFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgJGF1bnRzID0gJHRhcmdldC5wYXJlbnQoKS5zaWJsaW5ncygpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIGNhbkNsb3NlID0gdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kID8gJGF1bnRzLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSA6ICR0YXJnZXQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCAmJiAhY2FuQ2xvc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCl7XG4gICAgICAkdGFyZ2V0LnNsaWRlVXAoX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB0YWIgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb24nLCBbJHRhcmdldF0pO1xuICAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAkdGFyZ2V0LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSlcbiAgICAgICAgICAgLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICdhcmlhLXNlbGVjdGVkJzogZmFsc2VcbiAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkZXN0cm95ZWRcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdGFiLWNvbnRlbnRdJykuc3RvcCh0cnVlKS5zbGlkZVVwKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJy56Zi5hY2NvcmRpb24nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBhbmltYXRlIHRoZSBvcGVuaW5nIG9mIGFuIGFjY29yZGlvbiBwYW5lLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpRXhwYW5kOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gY2xvc2UgYWxsIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbGxvd0FsbENsb3NlZDogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb24sICdBY2NvcmRpb24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBBY2NvcmRpb25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZUFsbCcsXG4gICAgICAnVEFCJzogJ2Rvd24nLFxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBtZW51IGJ5IGhpZGluZyBhbGwgbmVzdGVkIG1lbnVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLm5vdCgnLmlzLWFjdGl2ZScpLnNsaWRlVXAoMCk7Ly8uZmluZCgnYScpLmNzcygncGFkZGluZy1sZWZ0JywgJzFyZW0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndGFibGlzdCcsXG4gICAgICAnYXJpYS1tdWx0aXNlbGVjdGFibGUnOiB0aGlzLm9wdGlvbnMubXVsdGlPcGVuXG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZW51TGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpbmtJZCA9IHRoaXMuaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUtbGluaycpLFxuICAgICAgICAgICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXG4gICAgICAgICAgc3ViSWQgPSAkc3ViWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51JyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkc3ViLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRlbGVtLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IHN1YklkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnaWQnOiBsaW5rSWRcbiAgICAgIH0pO1xuICAgICAgJHN1Yi5hdHRyKHtcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZCxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdpZCc6IHN1YklkXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgaW5pdFBhbmVzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJyk7XG4gICAgaWYoaW5pdFBhbmVzLmxlbmd0aCl7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgaW5pdFBhbmVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgX3RoaXMuZG93bigkKHRoaXMpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkc3VibWVudSA9ICQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG5cbiAgICAgIGlmICgkc3VibWVudS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpLm9uKCdjbGljay56Zi5hY2NvcmRpb25NZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIF90aGlzLnRvZ2dsZSgkc3VibWVudSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbm1lbnUnLCBmdW5jdGlvbihlKXtcbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQsXG4gICAgICAgICAgJHRhcmdldCA9ICRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcblxuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5maW5kKCdsaTpmaXJzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmZpcnN0LWNoaWxkJykpIHsgLy8gaXMgZmlyc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHByZXZFbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGlmIHByZXZpb3VzIGVsZW1lbnQgaGFzIG9wZW4gc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRwcmV2RWxlbWVudC5maW5kKCdsaTpsYXN0LWNoaWxkJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6bGFzdC1jaGlsZCcpKSB7IC8vIGlzIGxhc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLm5leHQoJ2xpJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb25NZW51Jywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgICAgICAgJHRhcmdldC5maW5kKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxuICAgICAgICAgICAgX3RoaXMudXAoJHRhcmdldCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7IC8vIGNsb3NlIGN1cnJlbnRseSBvcGVuIHN1YlxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCAtMSkuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy50b2dnbGUoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGVBbGwoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSB0aGUgc3VibWVudSB0byB0b2dnbGVcbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KXtcbiAgICBpZighJHRhcmdldC5pcygnOmFuaW1hdGVkJykpIHtcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gb3Blbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxuICAgKi9cbiAgZG93bigkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMubXVsdGlPcGVuKSB7XG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG5cbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHRhcmdldC5zbGlkZURvd24oX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjZG93blxuICAgICAgICAgICAqL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICAgIH0pO1xuICAgICAgLy99KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I3VwXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvL30pO1xuXG4gICAgdmFyICRtZW51cyA9ICR0YXJnZXQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKDApLmFkZEJhY2soKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVEb3duKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIG11bHRpT3BlbjogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbk1lbnUsICdBY2NvcmRpb25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcmlsbGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIERyaWxsZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJpbGxkb3duIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbiBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyaWxsZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJpbGxkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJpbGxkb3duJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ2Rvd24nLFxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgZHJpbGxkb3duIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucyBvZiBlbGVtZW50c1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCdhJyk7XG4gICAgdGhpcy4kc3VibWVudXMgPSB0aGlzLiRzdWJtZW51QW5jaG9ycy5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG4gICAgdGhpcy4kbWVudUl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLm5vdCgnLmpzLWRyaWxsZG93bi1iYWNrJykuYXR0cigncm9sZScsICdtZW51aXRlbScpLmZpbmQoJ2EnKTtcblxuICAgIHRoaXMuX3ByZXBhcmVNZW51KCk7XG5cbiAgICB0aGlzLl9rZXlib2FyZEV2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIHByZXBhcmVzIGRyaWxsZG93biBtZW51IGJ5IHNldHRpbmcgYXR0cmlidXRlcyB0byBsaW5rcyBhbmQgZWxlbWVudHNcbiAgICogc2V0cyBhIG1pbiBoZWlnaHQgdG8gcHJldmVudCBjb250ZW50IGp1bXBpbmdcbiAgICogd3JhcHMgdGhlIGVsZW1lbnQgaWYgbm90IGFscmVhZHkgd3JhcHBlZFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9wcmVwYXJlTWVudSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vIGlmKCF0aGlzLm9wdGlvbnMuaG9sZE9wZW4pe1xuICAgIC8vICAgdGhpcy5fbWVudUxpbmtFdmVudHMoKTtcbiAgICAvLyB9XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRsaW5rID0gJCh0aGlzKTtcbiAgICAgIHZhciAkc3ViID0gJGxpbmsucGFyZW50KCk7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLnBhcmVudExpbmspe1xuICAgICAgICAkbGluay5jbG9uZSgpLnByZXBlbmRUbygkc3ViLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpKS53cmFwKCc8bGkgY2xhc3M9XCJpcy1zdWJtZW51LXBhcmVudC1pdGVtIGlzLXN1Ym1lbnUtaXRlbSBpcy1kcmlsbGRvd24tc3VibWVudS1pdGVtXCIgcm9sZT1cIm1lbnUtaXRlbVwiPjwvbGk+Jyk7XG4gICAgICB9XG4gICAgICAkbGluay5kYXRhKCdzYXZlZEhyZWYnLCAkbGluay5hdHRyKCdocmVmJykpLnJlbW92ZUF0dHIoJ2hyZWYnKTtcbiAgICAgICRsaW5rLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IDAsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cygkbGluayk7XG4gICAgfSk7XG4gICAgdGhpcy4kc3VibWVudXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRtZW51ID0gJCh0aGlzKSxcbiAgICAgICAgICAkYmFjayA9ICRtZW51LmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaycpO1xuICAgICAgaWYoISRiYWNrLmxlbmd0aCl7XG4gICAgICAgICRtZW51LnByZXBlbmQoX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uKTtcbiAgICAgIH1cbiAgICAgIF90aGlzLl9iYWNrKCRtZW51KTtcbiAgICB9KTtcbiAgICBpZighdGhpcy4kZWxlbWVudC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtZHJpbGxkb3duJykpe1xuICAgICAgdGhpcy4kd3JhcHBlciA9ICQodGhpcy5vcHRpb25zLndyYXBwZXIpLmFkZENsYXNzKCdpcy1kcmlsbGRvd24nKTtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LndyYXAodGhpcy4kd3JhcHBlcikucGFyZW50KCkuY3NzKHRoaXMuX2dldE1heERpbXMoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gZWxlbWVudHMgaW4gdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBtZW51IGl0ZW0gdG8gYWRkIGhhbmRsZXJzIHRvLlxuICAgKi9cbiAgX2V2ZW50cygkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgIGlmKCQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCAnbGknKS5oYXNDbGFzcygnaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50Jykpe1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQuZmlyc3RFbGVtZW50Q2hpbGQpe1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyB9XG4gICAgICBfdGhpcy5fc2hvdygkZWxlbS5wYXJlbnQoJ2xpJykpO1xuXG4gICAgICBpZihfdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayl7XG4gICAgICAgIHZhciAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICAgICAgJGJvZHkub2ZmKCcuemYuZHJpbGxkb3duJykub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgdG8gYGxpYCdzIGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tleWJvYXJkRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMuYWRkKHRoaXMuJGVsZW1lbnQuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrID4gYScpKS5vbigna2V5ZG93bi56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcblxuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcbiAgICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLmNoaWxkcmVuKCdhJyksXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAgICRuZXh0RWxlbWVudDtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0RyaWxsZG93bicsIHtcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRlbGVtZW50LmlzKF90aGlzLiRzdWJtZW51QW5jaG9ycykpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5maW5kKCd1bCBsaSBhJykuZmlsdGVyKF90aGlzLiRtZW51SXRlbXMpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKSk7XG4gICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpLmNoaWxkcmVuKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5fYmFjaygpO1xuICAgICAgICAgIC8vX3RoaXMuJG1lbnVJdGVtcy5maXJzdCgpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCEkZWxlbWVudC5pcyhfdGhpcy4kbWVudUl0ZW1zKSkgeyAvLyBub3QgbWVudSBpdGVtIG1lYW5zIGJhY2sgYnV0dG9uXG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbWVudC5wYXJlbnQoJ2xpJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIG9wZW4gZWxlbWVudHMsIGFuZCByZXR1cm5zIHRvIHJvb3QgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXG4gICAqL1xuICBfaGlkZUFsbCgpIHtcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xuICAgICRlbGVtLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbihlKXtcbiAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xuICAgIH0pO1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBmdWxseSBjbG9zZWQuXG4gICAgICAgICAqIEBldmVudCBEcmlsbGRvd24jY2xvc2VkXG4gICAgICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLmRyaWxsZG93bicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgZm9yIGVhY2ggYGJhY2tgIGJ1dHRvbiwgYW5kIGNsb3NlcyBvcGVuIG1lbnVzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNiYWNrXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGFkZCBgYmFja2AgZXZlbnQuXG4gICAqL1xuICBfYmFjaygkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKTtcbiAgICAkZWxlbS5jaGlsZHJlbignLmpzLWRyaWxsZG93bi1iYWNrJylcbiAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdtb3VzZXVwIG9uIGJhY2snKTtcbiAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciB0byBtZW51IGl0ZW1zIHcvbyBzdWJtZW51cyB0byBjbG9zZSBvcGVuIG1lbnVzIG9uIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tZW51TGlua0V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJG1lbnVJdGVtcy5ub3QoJy5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKVxuICAgICAgICAub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgICAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIC8vIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgc3VibWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jb3BlblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIG9wZW4sIGkuZS4gdGhlIGBsaWAgdGFnLlxuICAgKi9cbiAgX3Nob3coJGVsZW0pIHtcbiAgICAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgb3BlbmVkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5kcmlsbGRvd24nLCBbJGVsZW1dKTtcbiAgfTtcblxuICAvKipcbiAgICogSGlkZXMgYSBzdWJtZW51XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2hpZGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gaGlkZSwgaS5lLiB0aGUgYHVsYCB0YWcuXG4gICAqL1xuICBfaGlkZSgkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0uYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpO1xuICAgICAgICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgY2xvc2VkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jaGlkZVxuICAgICAqL1xuICAgICRlbGVtLnRyaWdnZXIoJ2hpZGUuemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgdGhyb3VnaCB0aGUgbmVzdGVkIG1lbnVzIHRvIGNhbGN1bGF0ZSB0aGUgbWluLWhlaWdodCwgYW5kIG1heC13aWR0aCBmb3IgdGhlIG1lbnUuXG4gICAqIFByZXZlbnRzIGNvbnRlbnQganVtcGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0TWF4RGltcygpIHtcbiAgICB2YXIgbWF4ID0gMCwgcmVzdWx0ID0ge307XG4gICAgdGhpcy4kc3VibWVudXMuYWRkKHRoaXMuJGVsZW1lbnQpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciBudW1PZkVsZW1zID0gJCh0aGlzKS5jaGlsZHJlbignbGknKS5sZW5ndGg7XG4gICAgICBtYXggPSBudW1PZkVsZW1zID4gbWF4ID8gbnVtT2ZFbGVtcyA6IG1heDtcbiAgICB9KTtcblxuICAgIHJlc3VsdFsnbWluLWhlaWdodCddID0gYCR7bWF4ICogdGhpcy4kbWVudUl0ZW1zWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodH1weGA7XG4gICAgcmVzdWx0WydtYXgtd2lkdGgnXSA9IGAke3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGh9cHhgO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgRHJpbGxkb3duIE1lbnVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX2hpZGVBbGwoKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG4gICAgdGhpcy4kZWxlbWVudC51bndyYXAoKVxuICAgICAgICAgICAgICAgICAuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbScpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCcuaXMtYWN0aXZlLCAuaXMtY2xvc2luZywgLmlzLWRyaWxsZG93bi1zdWJtZW51JykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nIGlzLWRyaWxsZG93bi1zdWJtZW51JylcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gdGFiaW5kZXggcm9sZScpO1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XG4gICAgICBpZigkbGluay5kYXRhKCdzYXZlZEhyZWYnKSl7XG4gICAgICAgICRsaW5rLmF0dHIoJ2hyZWYnLCAkbGluay5kYXRhKCdzYXZlZEhyZWYnKSkucmVtb3ZlRGF0YSgnc2F2ZWRIcmVmJyk7XG4gICAgICB9ZWxzZXsgcmV0dXJuOyB9XG4gICAgfSk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5EcmlsbGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCBmb3IgSlMgZ2VuZXJhdGVkIGJhY2sgYnV0dG9uLiBQcmVwZW5kZWQgdG8gc3VibWVudSBsaXN0cyBhbmQgZGVsZXRlZCBvbiBgZGVzdHJveWAgbWV0aG9kLCAnanMtZHJpbGxkb3duLWJhY2snIGNsYXNzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcbGk+PFxcYT5CYWNrPFxcL2E+PFxcL2xpPidcbiAgICovXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxuICAvKipcbiAgICogTWFya3VwIHVzZWQgdG8gd3JhcCBkcmlsbGRvd24gbWVudS4gVXNlIGEgY2xhc3MgbmFtZSBmb3IgaW5kZXBlbmRlbnQgc3R5bGluZzsgdGhlIEpTIGFwcGxpZWQgY2xhc3M6IGBpcy1kcmlsbGRvd25gIGlzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcZGl2IGNsYXNzPVwiaXMtZHJpbGxkb3duXCI+PFxcL2Rpdj4nXG4gICAqL1xuICB3cmFwcGVyOiAnPGRpdj48L2Rpdj4nLFxuICAvKipcbiAgICogQWRkcyB0aGUgcGFyZW50IGxpbmsgdG8gdGhlIHN1Ym1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHBhcmVudExpbms6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gcmV0dXJuIHRvIHJvb3QgbGlzdCBvbiBib2R5IGNsaWNrLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG4gIC8vIGhvbGRPcGVuOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyaWxsZG93biwgJ0RyaWxsZG93bicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJvcGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIERyb3Bkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcm9wZG93bi5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93bi5cbiAgICogICAgICAgIE9iamVjdCBzaG91bGQgYmUgb2YgdGhlIGRyb3Bkb3duIHBhbmVsLCByYXRoZXIgdGhhbiBpdHMgYW5jaG9yLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyb3Bkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICd0YWJfZm9yd2FyZCcsXG4gICAgICAnU0hJRlRfVEFCJzogJ3RhYl9iYWNrd2FyZCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IHNldHRpbmcvY2hlY2tpbmcgb3B0aW9ucyBhbmQgYXR0cmlidXRlcywgYWRkaW5nIGhlbHBlciB2YXJpYWJsZXMsIGFuZCBzYXZpbmcgdGhlIGFuY2hvci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgJGlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtdG9nZ2xlPVwiJHskaWR9XCJdYCkgfHwgJChgW2RhdGEtb3Blbj1cIiR7JGlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogJGlkLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZVxuXG4gICAgfSk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6ICd0cnVlJyxcbiAgICAgICdkYXRhLXlldGktYm94JzogJGlkLFxuICAgICAgJ2RhdGEtcmVzaXplJzogJGlkLFxuICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IHRoaXMuJGFuY2hvclswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdkZC1hbmNob3InKVxuICAgIH0pO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBkZXRlcm1pbmUgY3VycmVudCBvcmllbnRhdGlvbiBvZiBkcm9wZG93biBwYW5lLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHJldHVybnMge1N0cmluZ30gcG9zaXRpb24gLSBzdHJpbmcgdmFsdWUgb2YgYSBwb3NpdGlvbiBjbGFzcy5cbiAgICovXG4gIGdldFBvc2l0aW9uQ2xhc3MoKSB7XG4gICAgdmFyIHZlcnRpY2FsUG9zaXRpb24gPSB0aGlzLiRlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvKHRvcHxsZWZ0fHJpZ2h0fGJvdHRvbSkvZyk7XG4gICAgICAgIHZlcnRpY2FsUG9zaXRpb24gPSB2ZXJ0aWNhbFBvc2l0aW9uID8gdmVydGljYWxQb3NpdGlvblswXSA6ICcnO1xuICAgIHZhciBob3Jpem9udGFsUG9zaXRpb24gPSAvZmxvYXQtKFxcUyspXFxzLy5leGVjKHRoaXMuJGFuY2hvclswXS5jbGFzc05hbWUpO1xuICAgICAgICBob3Jpem9udGFsUG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb25bMV0gOiAnJztcbiAgICB2YXIgcG9zaXRpb24gPSBob3Jpem9udGFsUG9zaXRpb24gPyBob3Jpem9udGFsUG9zaXRpb24gKyAnICcgKyB2ZXJ0aWNhbFBvc2l0aW9uIDogdmVydGljYWxQb3NpdGlvbjtcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cblxuXG4gICAgaWYoKCRlbGVEaW1zLndpZHRoID49ICRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMuJGVsZW1lbnQpKSl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMuJGVsZW1lbnQsIHRoaXMuJGFuY2hvciwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCBmYWxzZSwgdHJ1ZSkgJiYgdGhpcy5jb3VudGVyKXtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIGVsZW1lbnQgdXRpbGl6aW5nIHRoZSB0cmlnZ2VycyB1dGlsaXR5IGxpYnJhcnkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9zZXRQb3NpdGlvbi5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXIpe1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgIH0pO1xuICAgICAgaWYodGhpcy5vcHRpb25zLmhvdmVyUGFuZSl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duIG1vdXNlbGVhdmUuemYuZHJvcGRvd24nKVxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuJGFuY2hvci5hZGQodGhpcy4kZWxlbWVudCkub24oJ2tleWRvd24uemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKSB7XG5cbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKSxcbiAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duJywge1xuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgtMSkpKSB7IC8vIGxlZnQgbW9kYWwgZG93bndhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLnRyYXBGb2N1cykgeyAvLyBpZiBmb2N1cyBzaGFsbCBiZSB0cmFwcGVkXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpZiBmb2N1cyBpcyBub3QgdHJhcHBlZCwgY2xvc2UgZHJvcGRvd24gb24gZm9jdXMgb3V0XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyh2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoMCkpIHx8IF90aGlzLiRlbGVtZW50LmlzKCc6Zm9jdXMnKSkgeyAvLyBsZWZ0IG1vZGFsIHVwd2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gbGFzdCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxuICAgICAgICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGlmIGZvY3VzIGlzIG5vdCB0cmFwcGVkLCBjbG9zZSBkcm9wZG93biBvbiBmb2N1cyBvdXRcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBvbmNlIHRoZSBkcm9wZG93biBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93biNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9wZW4gZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNoaWRlXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZighdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XG5cbiAgICB0aGlzLiRhbmNob3IucmVtb3ZlQ2xhc3MoJ2hvdmVyJylcbiAgICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG5cbiAgICBpZih0aGlzLmNsYXNzQ2hhbmdlZCl7XG4gICAgICB2YXIgY3VyUG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgICAgaWYoY3VyUG9zaXRpb25DbGFzcyl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoY3VyUG9zaXRpb25DbGFzcyk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzKVxuICAgICAgICAgIC8qLmhpZGUoKSovLmNzcyh7aGVpZ2h0OiAnJywgd2lkdGg6ICcnfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICAgIHRoaXMudXNlZFBvc2l0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGRyb3Bkb3duIHBhbmUncyB2aXNpYmlsaXR5LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpe1xuICAgICAgaWYodGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJykpIHJldHVybjtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgZHJvcGRvd24uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXInKS5oaWRlKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmLmRyb3Bkb3duJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuRHJvcGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHN1Ym1lbnVzIHRvIG9wZW4gb24gaG92ZXIgZXZlbnRzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgaG92ZXJQYW5lOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIHZPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIGJldHdlZW4gdGhlIGRyb3Bkb3duIHBhbmUgYW5kIHRoZSB0cmlnZ2VyaW5nIGVsZW1lbnQgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBoT2Zmc2V0OiAxLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBhZGp1c3Qgb3BlbiBwb3NpdGlvbi4gSlMgd2lsbCB0ZXN0IGFuZCBmaWxsIHRoaXMgaW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byB0cmFwIGZvY3VzIHRvIHRoZSBkcm9wZG93biBwYW5lIGlmIG9wZW5lZCB3aXRoIGtleWJvYXJkIGNvbW1hbmRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkgdG8gY2xvc2UgdGhlIGRyb3Bkb3duLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGVsZW1lbnRzIHdpdGhpbiB0aGUgbWVudVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgaGFzVG91Y2ggPSAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHwgKHR5cGVvZiB3aW5kb3cub250b3VjaHN0YXJ0ICE9PSAndW5kZWZpbmVkJyksXG4gICAgICAgIHBhckNsYXNzID0gJ2lzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JztcblxuICAgIC8vIHVzZWQgZm9yIG9uQ2xpY2sgYW5kIGluIHRoZSBrZXlib2FyZCBoYW5kbGVyc1xuICAgIHZhciBoYW5kbGVDbGlja0ZuID0gZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsIGAuJHtwYXJDbGFzc31gKSxcbiAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyksXG4gICAgICAgICAgaGFzQ2xpY2tlZCA9ICRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKTtcblxuICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICBpZiAoaGFzQ2xpY2tlZCkge1xuICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgfHwgKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbiAmJiAhaGFzVG91Y2gpIHx8IChfdGhpcy5vcHRpb25zLmZvcmNlRm9sbG93ICYmIGhhc1RvdWNoKSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuIHx8IGhhc1RvdWNoKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcblxuICAgICAgICBpZiAoaGFzU3ViKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5jbG9zaW5nVGltZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdbcm9sZT1cIm1lbnVpdGVtXCJdJyksXG4gICAgICAgICAgaXNUYWIgPSBfdGhpcy4kdGFicy5pbmRleCgkZWxlbWVudCkgPiAtMSxcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISRlbGVtZW50LmlzKCc6bGFzdC1jaGlsZCcpKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHByZXZTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sIG9wZW5TdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xuICAgICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL2lmICgkZWxlbWVudC5pcygnOmZpcnN0LWNoaWxkJykpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKTtcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBfdGhpcy5faGlkZShjbG9zZSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy99XG4gICAgICB9O1xuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICAgICAgb3Blbjogb3BlblN1YixcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoaXNUYWIpIHtcbiAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50Lmhhc0NsYXNzKF90aGlzLm9wdGlvbnMudmVydGljYWxDbGFzcykpIHsgLy8gdmVydGljYWwgbWVudVxuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnKSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogb3BlblN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBob3Jpem9udGFsIG1lbnVcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgcHJldmlvdXM6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgZG93bjogb3BlblN1YixcbiAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXG4gICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnKSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YixcbiAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd25NZW51JywgZnVuY3Rpb25zKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXG4gICAgICAgICAub24oJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgdmFyICRsaW5rID0gX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCk7XG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgZHJvcGRvd24gcGFuZSwgYW5kIGNoZWNrcyBmb3IgY29sbGlzaW9ucyBmaXJzdC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xuICAgKi9cbiAgX3Nob3coJHN1Yikge1xuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICByZXR1cm4gJChlbCkuZmluZCgkc3ViKS5sZW5ndGggPiAwO1xuICAgIH0pKTtcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLl9oaWRlKCRzaWJzLCBpZHgpO1xuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLmFkZENsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAgIC5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcbiAgICB2YXIgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgIGlmICghY2xlYXIpIHtcbiAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICctcmlnaHQnIDogJy1sZWZ0JyxcbiAgICAgICAgICAkcGFyZW50TGkgPSAkc3ViLnBhcmVudCgnLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xuICAgICAgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgICAgaWYgKCFjbGVhcikge1xuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJycpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBuZXcgZHJvcGRvd24gcGFuZSBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bm1lbnUnLCBbJHN1Yl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc2luZ2xlLCBjdXJyZW50bHkgb3BlbiBkcm9wZG93biBwYW5lLCBpZiBwYXNzZWQgYSBwYXJhbWV0ZXIsIG90aGVyd2lzZSwgaGlkZXMgZXZlcnl0aGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gaGlkZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlICR0YWJzIGNvbGxlY3Rpb24gdG8gaGlkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hpZGUoJGVsZW0sIGlkeCkge1xuICAgIHZhciAkdG9DbG9zZTtcbiAgICBpZiAoJGVsZW0gJiYgJGVsZW0ubGVuZ3RoKSB7XG4gICAgICAkdG9DbG9zZSA9ICRlbGVtO1xuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kdGFicy5ub3QoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgcmV0dXJuIGkgPT09IGlkeDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcbiAgICB9XG4gICAgdmFyIHNvbWV0aGluZ1RvQ2xvc2UgPSAkdG9DbG9zZS5oYXNDbGFzcygnaXMtYWN0aXZlJykgfHwgJHRvQ2xvc2UuZmluZCgnLmlzLWFjdGl2ZScpLmxlbmd0aCA+IDA7XG5cbiAgICBpZiAoc29tZXRoaW5nVG9DbG9zZSkge1xuICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtYWN0aXZlJykuYWRkKCR0b0Nsb3NlKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgJ2RhdGEtaXMtY2xpY2snOiBmYWxzZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAkdG9DbG9zZS5maW5kKCd1bC5qcy1kcm9wZG93bi1hY3RpdmUnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2pzLWRyb3Bkb3duLWFjdGl2ZScpO1xuXG4gICAgICBpZiAodGhpcy5jaGFuZ2VkIHx8ICR0b0Nsb3NlLmZpbmQoJ29wZW5zLWlubmVyJykubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICdyaWdodCcgOiAnbGVmdCc7XG4gICAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkKCR0b0Nsb3NlKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgb3BlbnMtaW5uZXIgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGBvcGVucy0ke29sZENsYXNzfWApO1xuICAgICAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb3BlbiBtZW51cyBhcmUgY2xvc2VkLlxuICAgICAgICogQGV2ZW50IERyb3Bkb3duTWVudSNoaWRlXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi5kcm9wZG93bm1lbnUnLCBbJHRvQ2xvc2VdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIHBsdWdpbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJG1lbnVJdGVtcy5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKS5yZW1vdmVBdHRyKCdkYXRhLWlzLWNsaWNrJylcbiAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1yaWdodC1hcnJvdyBpcy1sZWZ0LWFycm93IGlzLWRvd24tYXJyb3cgb3BlbnMtcmlnaHQgb3BlbnMtbGVmdCBvcGVucy1pbm5lcicpO1xuICAgICQoZG9jdW1lbnQuYm9keSkub2ZmKCcuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkRyb3Bkb3duTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIERpc2FsbG93cyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHN1Ym1lbnVzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gYXV0b21hdGljYWxseSBjbG9zZSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQsIGlmIG5vdCBjbGlja2VkIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b2Nsb3NlOiB0cnVlLFxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgb3BlbmluZyBhIHN1Ym1lbnUgb24gaG92ZXIgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDUwLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIG9wZW4vcmVtYWluIG9wZW4gb24gcGFyZW50IGNsaWNrIGV2ZW50LiBBbGxvd3MgY3Vyc29yIHRvIG1vdmUgYXdheSBmcm9tIG1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IGNsb3NpbmcgYSBzdWJtZW51IG9uIGEgbW91c2VsZWF2ZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG5cbiAgY2xvc2luZ1RpbWU6IDUwMCxcbiAgLyoqXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbGVmdCdcbiAgICovXG4gIGFsaWdubWVudDogJ2xlZnQnLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndmVydGljYWwnXG4gICAqL1xuICB2ZXJ0aWNhbENsYXNzOiAndmVydGljYWwnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2FsaWduLXJpZ2h0J1xuICAgKi9cbiAgcmlnaHRDbGFzczogJ2FsaWduLXJpZ2h0JyxcbiAgLyoqXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZvcmNlRm9sbG93OiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd25NZW51LCAnRHJvcGRvd25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBFcXVhbGl6ZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmVxdWFsaXplclxuICovXG5cbmNsYXNzIEVxdWFsaXplciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEVxdWFsaXplciBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcbiAgICB2YXIgJHdhdGNoZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsaXplci13YXRjaD1cIiR7ZXFJZH1cIl1gKTtcblxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1yZXNpemUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQucGFyZW50c1VudGlsKGRvY3VtZW50LmJvZHksICdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcbiAgICAgIG9uUmVzaXplTWVCb3VuZDogdGhpcy5fb25SZXNpemVNZS5iaW5kKHRoaXMpLFxuICAgICAgb25Qb3N0RXF1YWxpemVkQm91bmQ6IHRoaXMuX29uUG9zdEVxdWFsaXplZC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHZhciBpbWdzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICB2YXIgdG9vU21hbGw7XG4gICAgaWYodGhpcy5vcHRpb25zLmVxdWFsaXplT24pe1xuICAgICAgdG9vU21hbGwgPSB0aGlzLl9jaGVja01RKCk7XG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICB9XG4gICAgaWYoKHRvb1NtYWxsICE9PSB1bmRlZmluZWQgJiYgdG9vU21hbGwgPT09IGZhbHNlKSB8fCB0b29TbWFsbCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGlmKGltZ3MubGVuZ3RoKXtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fcmVmbG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzIGlmIHRoZSBicmVha3BvaW50IGlzIHRvbyBzbWFsbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXVzZUV2ZW50cygpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZih7XG4gICAgICAnLnpmLmVxdWFsaXplcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHJlc2l6ZW1lLnpmLnRyaWdnZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25SZXNpemVNZShlKSB7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyBwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUG9zdEVxdWFsaXplZChlKSB7XG4gICAgaWYoZS50YXJnZXQgIT09IHRoaXMuJGVsZW1lbnRbMF0peyB0aGlzLl9yZWZsb3coKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcbiAgICB9XG4gICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTVEoKSB7XG4gICAgdmFyIHRvb1NtYWxsID0gIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uKTtcbiAgICBpZih0b29TbWFsbCl7XG4gICAgICBpZih0aGlzLmlzT24pe1xuICAgICAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIGlmKCF0aGlzLmlzT24pe1xuICAgICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRvb1NtYWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgbm9vcCB2ZXJzaW9uIGZvciB0aGUgcGx1Z2luXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2lsbHN3aXRjaCgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgRXF1YWxpemVyIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICBpZighdGhpcy5vcHRpb25zLmVxdWFsaXplT25TdGFjayl7XG4gICAgICBpZih0aGlzLl9pc1N0YWNrZWQoKSl7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZXF1YWxpemVCeVJvdykge1xuICAgICAgdGhpcy5nZXRIZWlnaHRzQnlSb3codGhpcy5hcHBseUhlaWdodEJ5Um93LmJpbmQodGhpcykpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5nZXRIZWlnaHRzKHRoaXMuYXBwbHlIZWlnaHQuYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hbnVhbGx5IGRldGVybWluZXMgaWYgdGhlIGZpcnN0IDIgZWxlbWVudHMgYXJlICpOT1QqIHN0YWNrZWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaXNTdGFja2VkKCkge1xuICAgIHJldHVybiB0aGlzLiR3YXRjaGVkWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCAhPT0gdGhpcy4kd2F0Y2hlZFsxXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICovXG4gIGdldEhlaWdodHMoY2IpIHtcbiAgICB2YXIgaGVpZ2h0cyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHRoaXMuJHdhdGNoZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspe1xuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICBoZWlnaHRzLnB1c2godGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHQpO1xuICAgIH1cbiAgICBjYihoZWlnaHRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqL1xuICBnZXRIZWlnaHRzQnlSb3coY2IpIHtcbiAgICB2YXIgbGFzdEVsVG9wT2Zmc2V0ID0gKHRoaXMuJHdhdGNoZWQubGVuZ3RoID8gdGhpcy4kd2F0Y2hlZC5maXJzdCgpLm9mZnNldCgpLnRvcCA6IDApLFxuICAgICAgICBncm91cHMgPSBbXSxcbiAgICAgICAgZ3JvdXAgPSAwO1xuICAgIC8vZ3JvdXAgYnkgUm93XG4gICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHRoaXMuJHdhdGNoZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspe1xuICAgICAgdGhpcy4kd2F0Y2hlZFtpXS5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAvL21heWJlIGNvdWxkIHVzZSB0aGlzLiR3YXRjaGVkW2ldLm9mZnNldFRvcFxuICAgICAgdmFyIGVsT2Zmc2V0VG9wID0gJCh0aGlzLiR3YXRjaGVkW2ldKS5vZmZzZXQoKS50b3A7XG4gICAgICBpZiAoZWxPZmZzZXRUb3AhPWxhc3RFbFRvcE9mZnNldCkge1xuICAgICAgICBncm91cCsrO1xuICAgICAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgICAgIGxhc3RFbFRvcE9mZnNldD1lbE9mZnNldFRvcDtcbiAgICAgIH1cbiAgICAgIGdyb3Vwc1tncm91cF0ucHVzaChbdGhpcy4kd2F0Y2hlZFtpXSx0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodF0pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwLCBsbiA9IGdyb3Vwcy5sZW5ndGg7IGogPCBsbjsgaisrKSB7XG4gICAgICB2YXIgaGVpZ2h0cyA9ICQoZ3JvdXBzW2pdKS5tYXAoZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXNbMV07IH0pLmdldCgpO1xuICAgICAgdmFyIG1heCAgICAgICAgID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgICBncm91cHNbal0ucHVzaChtYXgpO1xuICAgIH1cbiAgICBjYihncm91cHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0XG4gICAqIEBwYXJhbSB7YXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHQoaGVpZ2h0cykge1xuICAgIHZhciBtYXggPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuXG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsIG1heCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdCBieSByb3dcbiAgICogQHBhcmFtIHthcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRSb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodEJ5Um93KGdyb3Vwcykge1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBncm91cHMubGVuZ3RoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICB2YXIgZ3JvdXBzSUxlbmd0aCA9IGdyb3Vwc1tpXS5sZW5ndGgsXG4gICAgICAgICAgbWF4ID0gZ3JvdXBzW2ldW2dyb3Vwc0lMZW5ndGggLSAxXTtcbiAgICAgIGlmIChncm91cHNJTGVuZ3RoPD0yKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldWzBdWzBdKS5jc3MoeydoZWlnaHQnOidhdXRvJ30pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBwZXIgcm93IGFyZSBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRSb3dcbiAgICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncHJlZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgICAgZm9yICh2YXIgaiA9IDAsIGxlbkogPSAoZ3JvdXBzSUxlbmd0aC0xKTsgaiA8IGxlbkogOyBqKyspIHtcbiAgICAgICAgJChncm91cHNbaV1bal1bMF0pLmNzcyh7J2hlaWdodCc6bWF4fSk7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIHBlciByb3cgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRSb3dcbiAgICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5FcXVhbGl6ZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiB3aGVuIHN0YWNrZWQgb24gc21hbGxlciBzY3JlZW5zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGVxdWFsaXplT25TdGFjazogdHJ1ZSxcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHJvdyBieSByb3cuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplQnlSb3c6IGZhbHNlLFxuICAvKipcbiAgICogU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWluaW11bSBicmVha3BvaW50IHNpemUgdGhlIHBsdWdpbiBzaG91bGQgZXF1YWxpemUgaGVpZ2h0cyBvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgZXF1YWxpemVPbjogJydcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihFcXVhbGl6ZXIsICdFcXVhbGl6ZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEludGVyY2hhbmdlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5pbnRlcmNoYW5nZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqL1xuXG5jbGFzcyBJbnRlcmNoYW5nZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEludGVyY2hhbmdlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEludGVyY2hhbmdlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBJbnRlcmNoYW5nZS5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0ludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEludGVyY2hhbmdlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBpbnRlcmNoYW5nZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuX2FkZEJyZWFrcG9pbnRzKCk7XG4gICAgdGhpcy5fZ2VuZXJhdGVSdWxlcygpO1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgSW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5pbnRlcmNoYW5nZScsIEZvdW5kYXRpb24udXRpbC50aHJvdHRsZSh0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSwgNTApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBJbnRlcmNoYW5nZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHZhciBtYXRjaDtcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUsIGJ1dCBvbmx5IHNhdmUgdGhlIGxhc3QgbWF0Y2hcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGlmKHRoaXMucnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLnJ1bGVzW2ldO1xuXG4gICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShydWxlLnF1ZXJ5KS5tYXRjaGVzKSB7XG4gICAgICAgICAgbWF0Y2ggPSBydWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB0aGlzLnJlcGxhY2UobWF0Y2gucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEZvdW5kYXRpb24gYnJlYWtwb2ludHMgYW5kIGFkZHMgdGhlbSB0byB0aGUgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTIG9iamVjdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQnJlYWtwb2ludHMoKSB7XG4gICAgZm9yICh2YXIgaSBpbiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllcykge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzW2ldO1xuICAgICAgICBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnkubmFtZV0gPSBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBJbnRlcmNoYW5nZSBlbGVtZW50IGZvciB0aGUgcHJvdmlkZWQgbWVkaWEgcXVlcnkgKyBjb250ZW50IHBhaXJpbmdzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdGhhdCBpcyBhbiBJbnRlcmNoYW5nZSBpbnN0YW5jZVxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHNjZW5hcmlvcyAtIEFycmF5IG9mIG9iamVjdHMgdGhhdCBoYXZlICdtcScgYW5kICdwYXRoJyBrZXlzIHdpdGggY29ycmVzcG9uZGluZyBrZXlzXG4gICAqL1xuICBfZ2VuZXJhdGVSdWxlcyhlbGVtZW50KSB7XG4gICAgdmFyIHJ1bGVzTGlzdCA9IFtdO1xuICAgIHZhciBydWxlcztcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucnVsZXMpIHtcbiAgICAgIHJ1bGVzID0gdGhpcy5vcHRpb25zLnJ1bGVzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdpbnRlcmNoYW5nZScpLm1hdGNoKC9cXFsuKj9cXF0vZyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBydWxlcykge1xuICAgICAgaWYocnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tpXS5zbGljZSgxLCAtMSkuc3BsaXQoJywgJyk7XG4gICAgICAgIHZhciBwYXRoID0gcnVsZS5zbGljZSgwLCAtMSkuam9pbignJyk7XG4gICAgICAgIHZhciBxdWVyeSA9IHJ1bGVbcnVsZS5sZW5ndGggLSAxXTtcblxuICAgICAgICBpZiAoSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XSkge1xuICAgICAgICAgIHF1ZXJ5ID0gSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bGVzTGlzdC5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJ1bGVzID0gcnVsZXNMaXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgYHNyY2AgcHJvcGVydHkgb2YgYW4gaW1hZ2UsIG9yIGNoYW5nZSB0aGUgSFRNTCBvZiBhIGNvbnRhaW5lciwgdG8gdGhlIHNwZWNpZmllZCBwYXRoLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggLSBQYXRoIHRvIHRoZSBpbWFnZSBvciBIVE1MIHBhcnRpYWwuXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgKi9cbiAgcmVwbGFjZShwYXRoKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGggPT09IHBhdGgpIHJldHVybjtcblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHRyaWdnZXIgPSAncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnO1xuXG4gICAgLy8gUmVwbGFjaW5nIGltYWdlc1xuICAgIGlmICh0aGlzLiRlbGVtZW50WzBdLm5vZGVOYW1lID09PSAnSU1HJykge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdzcmMnLCBwYXRoKS5sb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KVxuICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBiYWNrZ3JvdW5kIGltYWdlc1xuICAgIGVsc2UgaWYgKHBhdGgubWF0Y2goL1xcLihnaWZ8anBnfGpwZWd8cG5nfHN2Z3x0aWZmKShbPyNdLiopPy9pKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3MoeyAnYmFja2dyb3VuZC1pbWFnZSc6ICd1cmwoJytwYXRoKycpJyB9KVxuICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNpbmcgSFRNTFxuICAgIGVsc2Uge1xuICAgICAgJC5nZXQocGF0aCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQuaHRtbChyZXNwb25zZSlcbiAgICAgICAgICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICAgICAgJChyZXNwb25zZSkuZm91bmRhdGlvbigpO1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIGNvbnRlbnQgaW4gYW4gSW50ZXJjaGFuZ2UgZWxlbWVudCBpcyBkb25lIGJlaW5nIGxvYWRlZC5cbiAgICAgKiBAZXZlbnQgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcbiAgICAgKi9cbiAgICAvLyB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3JlcGxhY2VkLnpmLmludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgaW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICAvL1RPRE8gdGhpcy5cbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5JbnRlcmNoYW5nZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFJ1bGVzIHRvIGJlIGFwcGxpZWQgdG8gSW50ZXJjaGFuZ2UgZWxlbWVudHMuIFNldCB3aXRoIHRoZSBgZGF0YS1pbnRlcmNoYW5nZWAgYXJyYXkgbm90YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHJ1bGVzOiBudWxsXG59O1xuXG5JbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgPSB7XG4gICdsYW5kc2NhcGUnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICAncG9ydHJhaXQnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gICdyZXRpbmEnOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwgb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEludGVyY2hhbmdlLCAnSW50ZXJjaGFuZ2UnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1hZ2VsbGFuIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tYWdlbGxhblxuICovXG5cbmNsYXNzIE1hZ2VsbGFuIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgTWFnZWxsYW4uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgTWFnZWxsYW4jaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBNYWdlbGxhbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnTWFnZWxsYW4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWFnZWxsYW4gcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdtYWdlbGxhbicpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kdGFyZ2V0cyA9ICQoJ1tkYXRhLW1hZ2VsbGFuLXRhcmdldF0nKTtcbiAgICB0aGlzLiRsaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnYScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnZGF0YS1yZXNpemUnOiBpZCxcbiAgICAgICdkYXRhLXNjcm9sbCc6IGlkLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICB0aGlzLiRhY3RpdmUgPSAkKCk7XG4gICAgdGhpcy5zY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgYW4gYXJyYXkgb2YgcGl4ZWwgdmFsdWVzIHRoYXQgYXJlIHRoZSBkZW1hcmNhdGlvbiBsaW5lcyBiZXR3ZWVuIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAgICogQ2FuIGJlIGludm9rZWQgaWYgbmV3IGVsZW1lbnRzIGFyZSBhZGRlZCBvciB0aGUgc2l6ZSBvZiBhIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgY2FsY1BvaW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBib2R5ID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgaHRtbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy53aW5IZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KHdpbmRvdy5pbm5lckhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQpKTtcbiAgICB0aGlzLmRvY0hlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KSk7XG5cbiAgICB0aGlzLiR0YXJnZXRzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkdGFyID0gJCh0aGlzKSxcbiAgICAgICAgICBwdCA9IE1hdGgucm91bmQoJHRhci5vZmZzZXQoKS50b3AgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCk7XG4gICAgICAkdGFyLnRhcmdldFBvaW50ID0gcHQ7XG4gICAgICBfdGhpcy5wb2ludHMucHVzaChwdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBNYWdlbGxhbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgJGJvZHkgPSAkKCdodG1sLCBib2R5JyksXG4gICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgZHVyYXRpb246IF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgZWFzaW5nOiAgIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nXG4gICAgICAgIH07XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgICAgaWYobG9jYXRpb24uaGFzaCl7XG4gICAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MobG9jYXRpb24uaGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF90aGlzLmNhbGNQb2ludHMoKTtcbiAgICAgIF90aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLnJlZmxvdy5iaW5kKHRoaXMpLFxuICAgICAgJ3Njcm9sbG1lLnpmLnRyaWdnZXInOiB0aGlzLl91cGRhdGVBY3RpdmUuYmluZCh0aGlzKVxuICAgIH0pLm9uKCdjbGljay56Zi5tYWdlbGxhbicsICdhW2hyZWZePVwiI1wiXScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgYXJyaXZhbCAgID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MoYXJyaXZhbCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdG8gc2Nyb2xsIHRvIGEgZ2l2ZW4gbG9jYXRpb24gb24gdGhlIHBhZ2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2MgLSBhIHByb3Blcmx5IGZvcm1hdHRlZCBqUXVlcnkgaWQgc2VsZWN0b3IuIEV4YW1wbGU6ICcjZm9vJ1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNjcm9sbFRvTG9jKGxvYykge1xuICAgIHZhciBzY3JvbGxQb3MgPSBNYXRoLnJvdW5kKCQobG9jKS5vZmZzZXQoKS50b3AgLSB0aGlzLm9wdGlvbnMudGhyZXNob2xkIC8gMiAtIHRoaXMub3B0aW9ucy5iYXJPZmZzZXQpO1xuXG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sIHRoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbiwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgTWFnZWxsYW4gdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgcmVmbG93KCkge1xuICAgIHRoaXMuY2FsY1BvaW50cygpO1xuICAgIHRoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHZpc2liaWxpdHkgb2YgYW4gYWN0aXZlIGxvY2F0aW9uIGxpbmssIGFuZCB1cGRhdGVzIHRoZSB1cmwgaGFzaCBmb3IgdGhlIHBhZ2UsIGlmIGRlZXBMaW5raW5nIGVuYWJsZWQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgTWFnZWxsYW4jdXBkYXRlXG4gICAqL1xuICBfdXBkYXRlQWN0aXZlKC8qZXZ0LCBlbGVtLCBzY3JvbGxQb3MqLykge1xuICAgIHZhciB3aW5Qb3MgPSAvKnNjcm9sbFBvcyB8fCovIHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApLFxuICAgICAgICBjdXJJZHg7XG5cbiAgICBpZih3aW5Qb3MgKyB0aGlzLndpbkhlaWdodCA9PT0gdGhpcy5kb2NIZWlnaHQpeyBjdXJJZHggPSB0aGlzLnBvaW50cy5sZW5ndGggLSAxOyB9XG4gICAgZWxzZSBpZih3aW5Qb3MgPCB0aGlzLnBvaW50c1swXSl7IGN1cklkeCA9IDA7IH1cbiAgICBlbHNle1xuICAgICAgdmFyIGlzRG93biA9IHRoaXMuc2Nyb2xsUG9zIDwgd2luUG9zLFxuICAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgICBjdXJWaXNpYmxlID0gdGhpcy5wb2ludHMuZmlsdGVyKGZ1bmN0aW9uKHAsIGkpe1xuICAgICAgICAgICAgcmV0dXJuIGlzRG93biA/IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCA8PSB3aW5Qb3MgOiBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCA8PSB3aW5Qb3M7XG4gICAgICAgICAgfSk7XG4gICAgICBjdXJJZHggPSBjdXJWaXNpYmxlLmxlbmd0aCA/IGN1clZpc2libGUubGVuZ3RoIC0gMSA6IDA7XG4gICAgfVxuXG4gICAgdGhpcy4kYWN0aXZlLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG4gICAgdGhpcy4kYWN0aXZlID0gdGhpcy4kbGlua3MuZXEoY3VySWR4KS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgaWYod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKXtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFBvcyA9IHdpblBvcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXG4gICAgICogQGV2ZW50IE1hZ2VsbGFuI3VwZGF0ZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIE1hZ2VsbGFuIGFuZCByZXNldHMgdGhlIHVybCBvZiB0aGUgd2luZG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5tYWdlbGxhbicpXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoaGFzaCwgJycpO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5NYWdlbGxhbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgdGhlIGFuaW1hdGVkIHNjcm9sbGluZyBzaG91bGQgdGFrZSBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBBbmltYXRpb24gc3R5bGUgdG8gdXNlIHdoZW4gc2Nyb2xsaW5nIGJldHdlZW4gbG9jYXRpb25zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdlYXNlLWluLW91dCdcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ2xpbmVhcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIHVzZSBhcyBhIG1hcmtlciBmb3IgbG9jYXRpb24gY2hhbmdlcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgdGhyZXNob2xkOiA1MCxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGFjdGl2ZSBsb2NhdGlvbnMgbGluayBvbiB0aGUgbWFnZWxsYW4gY29udGFpbmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdhY3RpdmUnXG4gICAqL1xuICBhY3RpdmVDbGFzczogJ2FjdGl2ZScsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHNjcmlwdCB0byBtYW5pcHVsYXRlIHRoZSB1cmwgb2YgdGhlIGN1cnJlbnQgcGFnZSwgYW5kIGlmIHN1cHBvcnRlZCwgYWx0ZXIgdGhlIGhpc3RvcnkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZGVlcExpbmtpbmc6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyB0byBvZmZzZXQgdGhlIHNjcm9sbCBvZiB0aGUgcGFnZSBvbiBpdGVtIGNsaWNrIGlmIHVzaW5nIGEgc3RpY2t5IG5hdiBiYXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjVcbiAgICovXG4gIGJhck9mZnNldDogMFxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT2ZmQ2FudmFzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vZmZjYW52YXNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBPZmZDYW52YXMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvZmYtY2FudmFzIHdyYXBwZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGluaXRpYWxpemUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT2ZmQ2FudmFzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy4kbGFzdFRyaWdnZXIgPSAkKCk7XG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKCk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPZmZDYW52YXMnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGJ5IGFkZGluZyB0aGUgZXhpdCBvdmVybGF5IChpZiBuZWVkZWQpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgLy8gRmluZCB0cmlnZ2VycyB0aGF0IGFmZmVjdCB0aGlzIGVsZW1lbnQgYW5kIGFkZCBhcmlhLWV4cGFuZGVkIHRvIHRoZW1cbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoZG9jdW1lbnQpXG4gICAgICAuZmluZCgnW2RhdGEtb3Blbj1cIicraWQrJ1wiXSwgW2RhdGEtY2xvc2U9XCInK2lkKydcIl0sIFtkYXRhLXRvZ2dsZT1cIicraWQrJ1wiXScpXG4gICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcblxuICAgIC8vIEFkZCBhIGNsb3NlIHRyaWdnZXIgb3ZlciB0aGUgYm9keSBpZiBuZWNlc3NhcnlcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgaWYgKCQoJy5qcy1vZmYtY2FudmFzLWV4aXQnKS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy4kZXhpdGVyID0gJCgnLmpzLW9mZi1jYW52YXMtZXhpdCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGV4aXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBleGl0ZXIuc2V0QXR0cmlidXRlKCdjbGFzcycsICdqcy1vZmYtY2FudmFzLWV4aXQnKTtcbiAgICAgICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLmFwcGVuZChleGl0ZXIpO1xuXG4gICAgICAgIHRoaXMuJGV4aXRlciA9ICQoZXhpdGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCA9IHRoaXMub3B0aW9ucy5pc1JldmVhbGVkIHx8IG5ldyBSZWdFeHAodGhpcy5vcHRpb25zLnJldmVhbENsYXNzLCAnZycpLnRlc3QodGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pc1JldmVhbGVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMucmV2ZWFsT24gPSB0aGlzLm9wdGlvbnMucmV2ZWFsT24gfHwgdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyhyZXZlYWwtZm9yLW1lZGl1bXxyZXZlYWwtZm9yLWxhcmdlKS9nKVswXS5zcGxpdCgnLScpWzJdO1xuICAgICAgdGhpcy5fc2V0TVFDaGVja2VyKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lKSB7XG4gICAgICB0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUgPSBwYXJzZUZsb2F0KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCQoJ1tkYXRhLW9mZi1jYW52YXMtd3JhcHBlcl0nKVswXSkudHJhbnNpdGlvbkR1cmF0aW9uKSAqIDEwMDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gdGhlIG9mZi1jYW52YXMgd3JhcHBlciBhbmQgdGhlIGV4aXQgb3ZlcmxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJykub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ2tleWRvd24uemYub2ZmY2FudmFzJzogdGhpcy5faGFuZGxlS2V5Ym9hcmQuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy4kZXhpdGVyLmxlbmd0aCkge1xuICAgICAgdGhpcy4kZXhpdGVyLm9uKHsnY2xpY2suemYub2ZmY2FudmFzJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgZXZlbnQgbGlzdGVuZXIgZm9yIGVsZW1lbnRzIHRoYXQgd2lsbCByZXZlYWwgYXQgY2VydGFpbiBicmVha3BvaW50cy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRNUUNoZWNrZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKGZhbHNlKTtcbiAgICAgIH1cbiAgICB9KS5vbmUoJ2xvYWQuemYub2ZmY2FudmFzJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIHJldmVhbGluZy9oaWRpbmcgdGhlIG9mZi1jYW52YXMgYXQgYnJlYWtwb2ludHMsIG5vdCB0aGUgc2FtZSBhcyBvcGVuLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzUmV2ZWFsZWQgLSB0cnVlIGlmIGVsZW1lbnQgc2hvdWxkIGJlIHJldmVhbGVkLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJldmVhbChpc1JldmVhbGVkKSB7XG4gICAgdmFyICRjbG9zZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpO1xuICAgIGlmIChpc1JldmVhbGVkKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSB0cnVlO1xuICAgICAgLy8gaWYgKCF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAgIC8vICAgdmFyIHNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAvLyAgIHRoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBzY3JvbGxQb3MgKyAncHgpJztcbiAgICAgIC8vIH1cbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMuaXNTdGlja3kpIHsgdGhpcy5fc3RpY2soKTsgfVxuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ29wZW4uemYudHJpZ2dlciB0b2dnbGUuemYudHJpZ2dlcicpO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7ICRjbG9zZXIuaGlkZSgpOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaXNSZXZlYWxlZCA9IGZhbHNlO1xuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5pc1N0aWNreSB8fCAhdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgICAvLyAgIHRoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgICAvLyAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi5vZmZjYW52YXMnKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcylcbiAgICAgIH0pO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7XG4gICAgICAgICRjbG9zZXIuc2hvdygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICogQGZpcmVzIE9mZkNhbnZhcyNvcGVuZWRcbiAgICovXG4gIG9wZW4oZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKDApO1xuICAgIH1cbiAgICAvLyB3aW5kb3cucGFnZVlPZmZzZXQgPSAwO1xuXG4gICAgLy8gaWYgKCF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAvLyAgIHZhciBzY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xuICAgIC8vICAgaWYgKHRoaXMuJGV4aXRlci5sZW5ndGgpIHtcbiAgICAvLyAgICAgdGhpcy4kZXhpdGVyWzBdLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgc2Nyb2xsUG9zICsgJ3B4KSc7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI29wZW5lZFxuICAgICAqL1xuICAgIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUsIHRoaXMuJGVsZW1lbnQsIGZ1bmN0aW9uKCkge1xuICAgICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy13cmFwcGVyXScpLmFkZENsYXNzKCdpcy1vZmYtY2FudmFzLW9wZW4gaXMtb3Blbi0nKyBfdGhpcy5vcHRpb25zLnBvc2l0aW9uKTtcblxuICAgICAgX3RoaXMuJGVsZW1lbnRcbiAgICAgICAgLmFkZENsYXNzKCdpcy1vcGVuJylcblxuICAgICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kpIHtcbiAgICAgIC8vICAgX3RoaXMuX3N0aWNrKCk7XG4gICAgICAvLyB9XG4gICAgfSk7XG5cbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ3RydWUnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJylcbiAgICAgICAgLnRyaWdnZXIoJ29wZW5lZC56Zi5vZmZjYW52YXMnKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICB0aGlzLiRleGl0ZXIuYWRkQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodHJpZ2dlcikge1xuICAgICAgdGhpcy4kbGFzdFRyaWdnZXIgPSB0cmlnZ2VyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQodGhpcy4kZWxlbWVudCksIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5maW5kKCdhLCBidXR0b24nKS5lcSgwKS5mb2N1cygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMpIHtcbiAgICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hdHRyKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgdGhpcy5fdHJhcEZvY3VzKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXBzIGZvY3VzIHdpdGhpbiB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdHJhcEZvY3VzKCkge1xuICAgIHZhciBmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCksXG4gICAgICAgIGZpcnN0ID0gZm9jdXNhYmxlLmVxKDApLFxuICAgICAgICBsYXN0ID0gZm9jdXNhYmxlLmVxKC0xKTtcblxuICAgIGZvY3VzYWJsZS5vZmYoJy56Zi5vZmZjYW52YXMnKS5vbigna2V5ZG93bi56Zi5vZmZjYW52YXMnLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSB8fCBlLmtleWNvZGUgPT09IDkpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBsYXN0WzBdICYmICFlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBmaXJzdFswXSAmJiBlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGxhc3QuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgb2ZmY2FudmFzIHRvIGFwcGVhciBzdGlja3kgdXRpbGl6aW5nIHRyYW5zbGF0ZSBwcm9wZXJ0aWVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgLy8gT2ZmQ2FudmFzLnByb3RvdHlwZS5fc3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgZWxTdHlsZSA9IHRoaXMuJGVsZW1lbnRbMF0uc3R5bGU7XG4gIC8vXG4gIC8vICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgLy8gICAgIHZhciBleGl0U3R5bGUgPSB0aGlzLiRleGl0ZXJbMF0uc3R5bGU7XG4gIC8vICAgfVxuICAvL1xuICAvLyAgICQod2luZG93KS5vbignc2Nyb2xsLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKGUpIHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKGUpO1xuICAvLyAgICAgdmFyIHBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAvLyAgICAgZWxTdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHBhZ2VZICsgJ3B4KSc7XG4gIC8vICAgICBpZiAoZXhpdFN0eWxlICE9PSB1bmRlZmluZWQpIHsgZXhpdFN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgcGFnZVkgKyAncHgpJzsgfVxuICAvLyAgIH0pO1xuICAvLyAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc3R1Y2suemYub2ZmY2FudmFzJyk7XG4gIC8vIH07XG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9mZi1jYW52YXMgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2IgdG8gZmlyZSBhZnRlciBjbG9zdXJlLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoY2IpIHtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUsIHRoaXMuJGVsZW1lbnQsIGZ1bmN0aW9uKCkge1xuICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtd3JhcHBlcl0nKS5yZW1vdmVDbGFzcyhgaXMtb2ZmLWNhbnZhcy1vcGVuIGlzLW9wZW4tJHtfdGhpcy5vcHRpb25zLnBvc2l0aW9ufWApO1xuICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdpcy1vcGVuJyk7XG4gICAgICAvLyBGb3VuZGF0aW9uLl9yZWZsb3coKTtcbiAgICAvLyB9KTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbnMuXG4gICAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgICAgICovXG4gICAgICAgIC50cmlnZ2VyKCdjbG9zZWQuemYub2ZmY2FudmFzJyk7XG4gICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kgfHwgIV90aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAvLyAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIF90aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgIC8vICAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYub2ZmY2FudmFzJyk7XG4gICAgLy8gICB9LCB0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUpO1xuICAgIC8vIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgdGhpcy4kZXhpdGVyLnJlbW92ZUNsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XG4gICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW4gb3IgY2xvc2VkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICovXG4gIHRvZ2dsZShldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpIHtcbiAgICAgIHRoaXMuY2xvc2UoZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMub3BlbihldmVudCwgdHJpZ2dlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMga2V5Ym9hcmQgaW5wdXQgd2hlbiBkZXRlY3RlZC4gV2hlbiB0aGUgZXNjYXBlIGtleSBpcyBwcmVzc2VkLCB0aGUgb2ZmLWNhbnZhcyBtZW51IGNsb3NlcywgYW5kIGZvY3VzIGlzIHJlc3RvcmVkIHRvIHRoZSBlbGVtZW50IHRoYXQgb3BlbmVkIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVLZXlib2FyZChldmVudCkge1xuICAgIGlmIChldmVudC53aGljaCAhPT0gMjcpIHJldHVybjtcblxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHRoaXMuJGxhc3RUcmlnZ2VyLmZvY3VzKCk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIG9mZmNhbnZhcyBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKTtcbiAgICB0aGlzLiRleGl0ZXIub2ZmKCcuemYub2ZmY2FudmFzJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT2ZmQ2FudmFzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3cgdGhlIHVzZXIgdG8gY2xpY2sgb3V0c2lkZSBvZiB0aGUgbWVudSB0byBjbG9zZSBpdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIGluIG1zIHRoZSBvcGVuIGFuZCBjbG9zZSB0cmFuc2l0aW9uIHJlcXVpcmVzLiBJZiBub25lIHNlbGVjdGVkLCBwdWxscyBmcm9tIGJvZHkgc3R5bGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICB0cmFuc2l0aW9uVGltZTogMCxcblxuICAvKipcbiAgICogRGlyZWN0aW9uIHRoZSBvZmZjYW52YXMgb3BlbnMgZnJvbS4gRGV0ZXJtaW5lcyBjbGFzcyBhcHBsaWVkIHRvIGJvZHkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgbGVmdFxuICAgKi9cbiAgcG9zaXRpb246ICdsZWZ0JyxcblxuICAvKipcbiAgICogRm9yY2UgdGhlIHBhZ2UgdG8gc2Nyb2xsIHRvIHRvcCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGZvcmNlVG9wOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgb2ZmY2FudmFzIHRvIHJlbWFpbiBvcGVuIGZvciBjZXJ0YWluIGJyZWFrcG9pbnRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBpc1JldmVhbGVkOiBmYWxzZSxcblxuICAvKipcbiAgICogQnJlYWtwb2ludCBhdCB3aGljaCB0byByZXZlYWwuIEpTIHdpbGwgdXNlIGEgUmVnRXhwIHRvIHRhcmdldCBzdGFuZGFyZCBjbGFzc2VzLCBpZiBjaGFuZ2luZyBjbGFzc25hbWVzLCBwYXNzIHlvdXIgY2xhc3Mgd2l0aCB0aGUgYHJldmVhbENsYXNzYCBvcHRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgcmV2ZWFsLWZvci1sYXJnZVxuICAgKi9cbiAgcmV2ZWFsT246IG51bGwsXG5cbiAgLyoqXG4gICAqIEZvcmNlIGZvY3VzIHRvIHRoZSBvZmZjYW52YXMgb24gb3Blbi4gSWYgdHJ1ZSwgd2lsbCBmb2N1cyB0aGUgb3BlbmluZyB0cmlnZ2VyIG9uIGNsb3NlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9Gb2N1czogdHJ1ZSxcblxuICAvKipcbiAgICogQ2xhc3MgdXNlZCB0byBmb3JjZSBhbiBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4uIEZvdW5kYXRpb24gZGVmYXVsdHMgZm9yIHRoaXMgYXJlIGByZXZlYWwtZm9yLWxhcmdlYCAmIGByZXZlYWwtZm9yLW1lZGl1bWAuXG4gICAqIEBvcHRpb25cbiAgICogVE9ETyBpbXByb3ZlIHRoZSByZWdleCB0ZXN0aW5nIGZvciB0aGlzLlxuICAgKiBAZXhhbXBsZSByZXZlYWwtZm9yLWxhcmdlXG4gICAqL1xuICByZXZlYWxDbGFzczogJ3JldmVhbC1mb3ItJyxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgb3B0aW9uYWwgZm9jdXMgdHJhcHBpbmcgd2hlbiBvcGVuaW5nIGFuIG9mZmNhbnZhcy4gU2V0cyB0YWJpbmRleCBvZiBbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdIHRvIC0xIGZvciBhY2Nlc3NpYmlsaXR5IHB1cnBvc2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIHRyYXBGb2N1czogZmFsc2Vcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9mZkNhbnZhcywgJ09mZkNhbnZhcycpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT3JiaXQgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm9yYml0XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXG4gKi9cblxuY2xhc3MgT3JiaXQge1xuICAvKipcbiAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIG9yYml0IGNhcm91c2VsLlxuICAqIEBjbGFzc1xuICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gT3JiaXQgQ2Fyb3VzZWwuXG4gICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT3JiaXQuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ09yYml0Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignT3JiaXQnLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJ1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAncHJldmlvdXMnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucywgc2V0dGluZyBhdHRyaWJ1dGVzLCBhbmQgc3RhcnRpbmcgdGhlIGFuaW1hdGlvbi5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3N9YCk7XG4gICAgdGhpcy4kc2xpZGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKTtcbiAgICB2YXIgJGltYWdlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyksXG4gICAgaW5pdEFjdGl2ZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKTtcblxuICAgIGlmICghaW5pdEFjdGl2ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5lcSgwKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlTVVJKSB7XG4gICAgICB0aGlzLiRzbGlkZXMuYWRkQ2xhc3MoJ25vLW1vdGlvbnVpJyk7XG4gICAgfVxuXG4gICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3ByZXBhcmVGb3JPcmJpdC5iaW5kKHRoaXMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcHJlcGFyZUZvck9yYml0KCk7Ly9oZWhlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICB0aGlzLl9sb2FkQnVsbGV0cygpO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiB0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhpcy5nZW9TeW5jKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7IC8vIGFsbG93IHdyYXBwZXIgdG8gYmUgZm9jdXNhYmxlIHRvIGVuYWJsZSBhcnJvdyBuYXZpZ2F0aW9uXG4gICAgICB0aGlzLiR3cmFwcGVyLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlcyBhIGpRdWVyeSBjb2xsZWN0aW9uIG9mIGJ1bGxldHMsIGlmIHRoZXkgYXJlIGJlaW5nIHVzZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2xvYWRCdWxsZXRzKCkge1xuICAgIHRoaXMuJGJ1bGxldHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YCkuZmluZCgnYnV0dG9uJyk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIGEgYHRpbWVyYCBvYmplY3Qgb24gdGhlIG9yYml0LCBhbmQgc3RhcnRzIHRoZSBjb3VudGVyIGZvciB0aGUgbmV4dCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKi9cbiAgZ2VvU3luYygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGltZXIgPSBuZXcgRm91bmRhdGlvbi5UaW1lcihcbiAgICAgIHRoaXMuJGVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgIGR1cmF0aW9uOiB0aGlzLm9wdGlvbnMudGltZXJEZWxheSxcbiAgICAgICAgaW5maW5pdGU6IGZhbHNlXG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgfSk7XG4gICAgdGhpcy50aW1lci5zdGFydCgpO1xuICB9XG5cbiAgLyoqXG4gICogU2V0cyB3cmFwcGVyIGFuZCBzbGlkZSBoZWlnaHRzIGZvciB0aGUgb3JiaXQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3ByZXBhcmVGb3JPcmJpdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3NldFdyYXBwZXJIZWlnaHQoZnVuY3Rpb24obWF4KXtcbiAgICAgIF90aGlzLl9zZXRTbGlkZUhlaWdodChtYXgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQ2FsdWxhdGVzIHRoZSBoZWlnaHQgb2YgZWFjaCBzbGlkZSBpbiB0aGUgY29sbGVjdGlvbiwgYW5kIHVzZXMgdGhlIHRhbGxlc3Qgb25lIGZvciB0aGUgd3JhcHBlciBoZWlnaHQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSB3aGVuIGNvbXBsZXRlLlxuICAqL1xuICBfc2V0V3JhcHBlckhlaWdodChjYikgey8vcmV3cml0ZSB0aGlzIHRvIGBmb3JgIGxvb3BcbiAgICB2YXIgbWF4ID0gMCwgdGVtcCwgY291bnRlciA9IDA7XG5cbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHRlbXAgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICQodGhpcykuYXR0cignZGF0YS1zbGlkZScsIGNvdW50ZXIpO1xuXG4gICAgICBpZiAoY291bnRlcikgey8vaWYgbm90IHRoZSBmaXJzdCBzbGlkZSwgc2V0IGNzcyBwb3NpdGlvbiBhbmQgZGlzcGxheSBwcm9wZXJ0eVxuICAgICAgICAkKHRoaXMpLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnbm9uZSd9KTtcbiAgICAgIH1cbiAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgY291bnRlcisrO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvdW50ZXIgPT09IHRoaXMuJHNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHdyYXBwZXIuY3NzKHsnaGVpZ2h0JzogbWF4fSk7IC8vb25seSBjaGFuZ2UgdGhlIHdyYXBwZXIgaGVpZ2h0IHByb3BlcnR5IG9uY2UuXG4gICAgICBjYihtYXgpOyAvL2ZpcmUgY2FsbGJhY2sgd2l0aCBtYXggaGVpZ2h0IGRpbWVuc2lvbi5cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHRoZSBtYXgtaGVpZ2h0IG9mIGVhY2ggc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3NldFNsaWRlSGVpZ2h0KGhlaWdodCkge1xuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5jc3MoJ21heC1oZWlnaHQnLCBoZWlnaHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gYmFzaWNhbGx5IGV2ZXJ5dGhpbmcgd2l0aGluIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgLy8qKk5vdyB1c2luZyBjdXN0b20gZXZlbnQgLSB0aGFua3MgdG86KipcbiAgICAvLyoqICAgICAgWW9oYWkgQXJhcmF0IG9mIFRvcm9udG8gICAgICAqKlxuICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgaWYgKHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3dpcGUpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9mZignc3dpcGVsZWZ0LnpmLm9yYml0IHN3aXBlcmlnaHQuemYub3JiaXQnKVxuICAgICAgICAub24oJ3N3aXBlbGVmdC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgICAgfSkub24oJ3N3aXBlcmlnaHQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9uKCdjbGljay56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicsIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gZmFsc2UgOiB0cnVlKTtcbiAgICAgICAgICBfdGhpcy50aW1lcltfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/ICdwYXVzZScgOiAnc3RhcnQnXSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnBhdXNlT25Ib3Zlcikge1xuICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZW50ZXIuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnRpbWVyLnBhdXNlKCk7XG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykpIHtcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm5hdkJ1dHRvbnMpIHtcbiAgICAgICAgdmFyICRjb250cm9scyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLm5leHRDbGFzc30sIC4ke3RoaXMub3B0aW9ucy5wcmV2Q2xhc3N9YCk7XG4gICAgICAgICRjb250cm9scy5hdHRyKCd0YWJpbmRleCcsIDApXG4gICAgICAgIC8vYWxzbyBuZWVkIHRvIGhhbmRsZSBlbnRlci9yZXR1cm4gYW5kIHNwYWNlYmFyIGtleSBwcmVzc2VzXG4gICAgICAgIC5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcblx0ICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoJCh0aGlzKS5oYXNDbGFzcyhfdGhpcy5vcHRpb25zLm5leHRDbGFzcykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIHRoaXMuJGJ1bGxldHMub24oJ2NsaWNrLnpmLm9yYml0IHRvdWNoZW5kLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKC9pcy1hY3RpdmUvZy50ZXN0KHRoaXMuY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0vL2lmIHRoaXMgaXMgYWN0aXZlLCBraWNrIG91dCBvZiBmdW5jdGlvbi5cbiAgICAgICAgICB2YXIgaWR4ID0gJCh0aGlzKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgIGx0ciA9IGlkeCA+IF90aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZGF0YSgnc2xpZGUnKSxcbiAgICAgICAgICAkc2xpZGUgPSBfdGhpcy4kc2xpZGVzLmVxKGlkeCk7XG5cbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShsdHIsICRzbGlkZSwgaWR4KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJHdyYXBwZXIuYWRkKHRoaXMuJGJ1bGxldHMpLm9uKCdrZXlkb3duLnpmLm9yYml0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPcmJpdCcsIHtcbiAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIGlmIGJ1bGxldCBpcyBmb2N1c2VkLCBtYWtlIHN1cmUgZm9jdXMgbW92ZXNcbiAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5pcyhfdGhpcy4kYnVsbGV0cykpIHtcbiAgICAgICAgICAgICAgX3RoaXMuJGJ1bGxldHMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hhbmdlcyB0aGUgY3VycmVudCBzbGlkZSB0byBhIG5ldyBvbmUuXG4gICogQGZ1bmN0aW9uXG4gICogQHBhcmFtIHtCb29sZWFufSBpc0xUUiAtIGZsYWcgaWYgdGhlIHNsaWRlIHNob3VsZCBtb3ZlIGxlZnQgdG8gcmlnaHQuXG4gICogQHBhcmFtIHtqUXVlcnl9IGNob3NlblNsaWRlIC0gdGhlIGpRdWVyeSBlbGVtZW50IG9mIHRoZSBzbGlkZSB0byBzaG93IG5leHQsIGlmIG9uZSBpcyBzZWxlY3RlZC5cbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBuZXcgc2xpZGUgaW4gaXRzIGNvbGxlY3Rpb24sIGlmIG9uZSBjaG9zZW4uXG4gICogQGZpcmVzIE9yYml0I3NsaWRlY2hhbmdlXG4gICovXG4gIGNoYW5nZVNsaWRlKGlzTFRSLCBjaG9zZW5TbGlkZSwgaWR4KSB7XG4gICAgdmFyICRjdXJTbGlkZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5lcSgwKTtcblxuICAgIGlmICgvbXVpL2cudGVzdCgkY3VyU2xpZGVbMF0uY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0gLy9pZiB0aGUgc2xpZGUgaXMgY3VycmVudGx5IGFuaW1hdGluZywga2ljayBvdXQgb2YgdGhlIGZ1bmN0aW9uXG5cbiAgICB2YXIgJGZpcnN0U2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlyc3QoKSxcbiAgICAkbGFzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmxhc3QoKSxcbiAgICBkaXJJbiA9IGlzTFRSID8gJ1JpZ2h0JyA6ICdMZWZ0JyxcbiAgICBkaXJPdXQgPSBpc0xUUiA/ICdMZWZ0JyA6ICdSaWdodCcsXG4gICAgX3RoaXMgPSB0aGlzLFxuICAgICRuZXdTbGlkZTtcblxuICAgIGlmICghY2hvc2VuU2xpZGUpIHsgLy9tb3N0IG9mIHRoZSB0aW1lLCB0aGlzIHdpbGwgYmUgYXV0byBwbGF5ZWQgb3IgY2xpY2tlZCBmcm9tIHRoZSBuYXZCdXR0b25zLlxuICAgICAgJG5ld1NsaWRlID0gaXNMVFIgPyAvL2lmIHdyYXBwaW5nIGVuYWJsZWQsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBpcyBhIGBuZXh0YCBvciBgcHJldmAgc2libGluZywgaWYgbm90LCBzZWxlY3QgdGhlIGZpcnN0IG9yIGxhc3Qgc2xpZGUgdG8gZmlsbCBpbi4gaWYgd3JhcHBpbmcgbm90IGVuYWJsZWQsIGF0dGVtcHQgdG8gc2VsZWN0IGBuZXh0YCBvciBgcHJldmAsIGlmIHRoZXJlJ3Mgbm90aGluZyB0aGVyZSwgdGhlIGZ1bmN0aW9uIHdpbGwga2ljayBvdXQgb24gbmV4dCBzdGVwLiBDUkFaWSBORVNURUQgVEVSTkFSSUVTISEhISFcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRmaXJzdFNsaWRlIDogJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKS8vcGljayBuZXh0IHNsaWRlIGlmIG1vdmluZyBsZWZ0IHRvIHJpZ2h0XG4gICAgICA6XG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkbGFzdFNsaWRlIDogJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKTsvL3BpY2sgcHJldiBzbGlkZSBpZiBtb3ZpbmcgcmlnaHQgdG8gbGVmdFxuICAgIH0gZWxzZSB7XG4gICAgICAkbmV3U2xpZGUgPSBjaG9zZW5TbGlkZTtcbiAgICB9XG5cbiAgICBpZiAoJG5ld1NsaWRlLmxlbmd0aCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIGlkeCA9IGlkeCB8fCB0aGlzLiRzbGlkZXMuaW5kZXgoJG5ld1NsaWRlKTsgLy9ncmFiIGluZGV4IHRvIHVwZGF0ZSBidWxsZXRzXG4gICAgICAgIHRoaXMuX3VwZGF0ZUJ1bGxldHMoaWR4KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKFxuICAgICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlJykuY3NzKHsncG9zaXRpb24nOiAnYWJzb2x1dGUnLCAndG9wJzogMH0pLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbUluRnJvbSR7ZGlySW59YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRuZXdTbGlkZS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ2Jsb2NrJ30pXG4gICAgICAgICAgICAuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KFxuICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltT3V0VG8ke2Rpck91dH1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpO1xuICAgICAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhX3RoaXMudGltZXIuaXNQYXVzZWQpe1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2RvIHN0dWZmP1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKS5oaWRlKCk7XG4gICAgICAgICRuZXdTbGlkZS5hZGRDbGFzcygnaXMtYWN0aXZlIGlzLWluJykuYXR0cignYXJpYS1saXZlJywgJ3BvbGl0ZScpLnNob3coKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiAhdGhpcy50aW1lci5pc1BhdXNlZCkge1xuICAgICAgICAgIHRoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgLyoqXG4gICAgKiBUcmlnZ2VycyB3aGVuIHRoZSBzbGlkZSBoYXMgZmluaXNoZWQgYW5pbWF0aW5nIGluLlxuICAgICogQGV2ZW50IE9yYml0I3NsaWRlY2hhbmdlXG4gICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbJG5ld1NsaWRlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogVXBkYXRlcyB0aGUgYWN0aXZlIHN0YXRlIG9mIHRoZSBidWxsZXRzLCBpZiBkaXNwbGF5ZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNsaWRlLlxuICAqL1xuICBfdXBkYXRlQnVsbGV0cyhpZHgpIHtcbiAgICB2YXIgJG9sZEJ1bGxldCA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKVxuICAgIC5maW5kKCcuaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLmJsdXIoKSxcbiAgICBzcGFuID0gJG9sZEJ1bGxldC5maW5kKCdzcGFuOmxhc3QnKS5kZXRhY2goKSxcbiAgICAkbmV3QnVsbGV0ID0gdGhpcy4kYnVsbGV0cy5lcShpZHgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hcHBlbmQoc3Bhbik7XG4gIH1cblxuICAvKipcbiAgKiBEZXN0cm95cyB0aGUgY2Fyb3VzZWwgYW5kIGhpZGVzIHRoZSBlbGVtZW50LlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYub3JiaXQnKS5maW5kKCcqJykub2ZmKCcuemYub3JiaXQnKS5lbmQoKS5oaWRlKCk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbk9yYml0LmRlZmF1bHRzID0ge1xuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gbG9vayBmb3IgYW5kIGxvYWRCdWxsZXRzLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGJ1bGxldHM6IHRydWUsXG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBhcHBseSBldmVudCBsaXN0ZW5lcnMgdG8gbmF2IGJ1dHRvbnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBuYXZCdXR0b25zOiB0cnVlLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1yaWdodCdcbiAgKi9cbiAgYW5pbUluRnJvbVJpZ2h0OiAnc2xpZGUtaW4tcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICovXG4gIGFuaW1PdXRUb1JpZ2h0OiAnc2xpZGUtb3V0LXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgKlxuICAqL1xuICBhbmltSW5Gcm9tTGVmdDogJ3NsaWRlLWluLWxlZnQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1vdXQtbGVmdCdcbiAgKi9cbiAgYW5pbU91dFRvTGVmdDogJ3NsaWRlLW91dC1sZWZ0JyxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGF1dG9tYXRpY2FsbHkgYW5pbWF0ZSBvbiBwYWdlIGxvYWQuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYXV0b1BsYXk6IHRydWUsXG4gIC8qKlxuICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgYmV0d2VlbiBzbGlkZSB0cmFuc2l0aW9uc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSA1MDAwXG4gICovXG4gIHRpbWVyRGVsYXk6IDUwMDAsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBpbmZpbml0ZWx5IGxvb3AgdGhyb3VnaCB0aGUgc2xpZGVzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgaW5maW5pdGVXcmFwOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIE9yYml0IHNsaWRlcyB0byBiaW5kIHRvIHN3aXBlIGV2ZW50cyBmb3IgbW9iaWxlLCByZXF1aXJlcyBhbiBhZGRpdGlvbmFsIHV0aWwgbGlicmFyeVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHN3aXBlOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIHRpbWluZyBmdW5jdGlvbiB0byBwYXVzZSBhbmltYXRpb24gb24gaG92ZXIuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgcGF1c2VPbkhvdmVyOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYmluZCBrZXlib2FyZCBldmVudHMgdG8gdGhlIHNsaWRlciwgdG8gYW5pbWF0ZSBmcmFtZXMgd2l0aCBhcnJvdyBrZXlzXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYWNjZXNzaWJsZTogdHJ1ZSxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGFpbmVyIG9mIE9yYml0XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1jb250YWluZXInXG4gICovXG4gIGNvbnRhaW5lckNsYXNzOiAnb3JiaXQtY29udGFpbmVyJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byBpbmRpdmlkdWFsIHNsaWRlcy5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXNsaWRlJ1xuICAqL1xuICBzbGlkZUNsYXNzOiAnb3JiaXQtc2xpZGUnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBidWxsZXQgY29udGFpbmVyLiBZb3UncmUgd2VsY29tZS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LWJ1bGxldHMnXG4gICovXG4gIGJveE9mQnVsbGV0czogJ29yYml0LWJ1bGxldHMnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgbmV4dGAgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1uZXh0J1xuICAqL1xuICBuZXh0Q2xhc3M6ICdvcmJpdC1uZXh0JyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYHByZXZpb3VzYCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LXByZXZpb3VzJ1xuICAqL1xuICBwcmV2Q2xhc3M6ICdvcmJpdC1wcmV2aW91cycsXG4gIC8qKlxuICAqIEJvb2xlYW4gdG8gZmxhZyB0aGUganMgdG8gdXNlIG1vdGlvbiB1aSBjbGFzc2VzIG9yIG5vdC4gRGVmYXVsdCB0byB0cnVlIGZvciBiYWNrd2FyZHMgY29tcGF0YWJpbGl0eS5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICB1c2VNVUk6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihPcmJpdCwgJ09yYml0Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5hY2NvcmRpb25NZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcm9wZG93bi1tZW51XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZU1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBkcm9wZG93biBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS1tZW51Jyk7XG4gICAgdGhpcy5jdXJyZW50TXEgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlTWVudScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBNZW51IGJ5IHBhcnNpbmcgdGhlIGNsYXNzZXMgZnJvbSB0aGUgJ2RhdGEtUmVzcG9uc2l2ZU1lbnUnIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICAvLyBUaGUgZmlyc3QgdGltZSBhbiBJbnRlcmNoYW5nZSBwbHVnaW4gaXMgaW5pdGlhbGl6ZWQsIHRoaXMucnVsZXMgaXMgY29udmVydGVkIGZyb20gYSBzdHJpbmcgb2YgXCJjbGFzc2VzXCIgdG8gYW4gb2JqZWN0IG9mIHJ1bGVzXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bGVzID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IHJ1bGVzVHJlZSA9IHt9O1xuXG4gICAgICAvLyBQYXJzZSBydWxlcyBmcm9tIFwiY2xhc3Nlc1wiIHB1bGxlZCBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICBsZXQgcnVsZXMgPSB0aGlzLnJ1bGVzLnNwbGl0KCcgJyk7XG5cbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBldmVyeSBydWxlIGZvdW5kXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBydWxlID0gcnVsZXNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgbGV0IHJ1bGVTaXplID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVswXSA6ICdzbWFsbCc7XG4gICAgICAgIGxldCBydWxlUGx1Z2luID0gcnVsZS5sZW5ndGggPiAxID8gcnVsZVsxXSA6IHJ1bGVbMF07XG5cbiAgICAgICAgaWYgKE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dICE9PSBudWxsKSB7XG4gICAgICAgICAgcnVsZXNUcmVlW3J1bGVTaXplXSA9IE1lbnVQbHVnaW5zW3J1bGVQbHVnaW5dO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMucnVsZXMgPSBydWxlc1RyZWU7XG4gICAgfVxuXG4gICAgaWYgKCEkLmlzRW1wdHlPYmplY3QodGhpcy5ydWxlcykpIHtcbiAgICAgIHRoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICAgIC8vICQod2luZG93KS5vbigncmVzaXplLnpmLlJlc3BvbnNpdmVNZW51JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgc2NyZWVuIHdpZHRoIGFnYWluc3QgYXZhaWxhYmxlIG1lZGlhIHF1ZXJpZXMuIElmIHRoZSBtZWRpYSBxdWVyeSBoYXMgY2hhbmdlZCwgYW5kIHRoZSBwbHVnaW4gbmVlZGVkIGhhcyBjaGFuZ2VkLCB0aGUgcGx1Z2lucyB3aWxsIHN3YXAgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01lZGlhUXVlcmllcygpIHtcbiAgICB2YXIgbWF0Y2hlZE1xLCBfdGhpcyA9IHRoaXM7XG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSBhbmQgZmluZCB0aGUgbGFzdCBtYXRjaGluZyBydWxlXG4gICAgJC5lYWNoKHRoaXMucnVsZXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KGtleSkpIHtcbiAgICAgICAgbWF0Y2hlZE1xID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm8gbWF0Y2g/IE5vIGRpY2VcbiAgICBpZiAoIW1hdGNoZWRNcSkgcmV0dXJuO1xuXG4gICAgLy8gUGx1Z2luIGFscmVhZHkgaW5pdGlhbGl6ZWQ/IFdlIGdvb2RcbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luIGluc3RhbmNlb2YgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbikgcmV0dXJuO1xuXG4gICAgLy8gUmVtb3ZlIGV4aXN0aW5nIHBsdWdpbi1zcGVjaWZpYyBDU1MgY2xhc3Nlc1xuICAgICQuZWFjaChNZW51UGx1Z2lucywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgX3RoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModmFsdWUuY3NzQ2xhc3MpO1xuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRoZSBDU1MgY2xhc3MgZm9yIHRoZSBuZXcgcGx1Z2luXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLnJ1bGVzW21hdGNoZWRNcV0uY3NzQ2xhc3MpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIHRoZSBuZXcgcGx1Z2luXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbikgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVNZW51Jyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVNZW51LmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICBkcm9wZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJvcGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJvcGRvd24tbWVudSddIHx8IG51bGxcbiAgfSxcbiBkcmlsbGRvd246IHtcbiAgICBjc3NDbGFzczogJ2RyaWxsZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcmlsbGRvd24nXSB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uLW1lbnUnLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snYWNjb3JkaW9uLW1lbnUnXSB8fCBudWxsXG4gIH1cbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlTWVudSwgJ1Jlc3BvbnNpdmVNZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXNwb25zaXZlVG9nZ2xlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlVG9nZ2xlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlVG9nZ2xlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVGFiIEJhci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCB0YWIgYmFyIGZ1bmN0aW9uYWxpdHkgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWIgYmFyIGJ5IGZpbmRpbmcgdGhlIHRhcmdldCBlbGVtZW50LCB0b2dnbGluZyBlbGVtZW50LCBhbmQgcnVubmluZyB1cGRhdGUoKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgdGFyZ2V0SUQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtdG9nZ2xlJyk7XG4gICAgaWYgKCF0YXJnZXRJRCkge1xuICAgICAgY29uc29sZS5lcnJvcignWW91ciB0YWIgYmFyIG5lZWRzIGFuIElEIG9mIGEgTWVudSBhcyB0aGUgdmFsdWUgb2YgZGF0YS10YWItYmFyLicpO1xuICAgIH1cblxuICAgIHRoaXMuJHRhcmdldE1lbnUgPSAkKGAjJHt0YXJnZXRJRH1gKTtcbiAgICB0aGlzLiR0b2dnbGVyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10b2dnbGVdJyk7XG5cbiAgICB0aGlzLl91cGRhdGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhlIHRhYiBiYXIgdG8gd29yay5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLl91cGRhdGVNcUhhbmRsZXIgPSB0aGlzLl91cGRhdGUuYmluZCh0aGlzKTtcbiAgICBcbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICB0aGlzLiR0b2dnbGVyLm9uKCdjbGljay56Zi5yZXNwb25zaXZlVG9nZ2xlJywgdGhpcy50b2dnbGVNZW51LmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBtZWRpYSBxdWVyeSB0byBkZXRlcm1pbmUgaWYgdGhlIHRhYiBiYXIgc2hvdWxkIGJlIHZpc2libGUgb3IgaGlkZGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGUoKSB7XG4gICAgLy8gTW9iaWxlXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdygpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhci4gVGhlIHRvZ2dsZSBvbmx5IGhhcHBlbnMgaWYgdGhlIHNjcmVlbiBpcyBzbWFsbCBlbm91Z2ggdG8gYWxsb3cgaXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAqL1xuICB0b2dnbGVNZW51KCkgeyAgIFxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnRvZ2dsZSgwKTtcblxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyIHRvZ2dsZXMuXG4gICAgICAgKiBAZXZlbnQgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndG9nZ2xlZC56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgfVxuICB9O1xuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgdGhpcy4kdG9nZ2xlci5vZmYoJy56Zi5yZXNwb25zaXZlVG9nZ2xlJyk7XG4gICAgXG4gICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcbiAgICBcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBicmVha3BvaW50IGFmdGVyIHdoaWNoIHRoZSBtZW51IGlzIGFsd2F5cyBzaG93biwgYW5kIHRoZSB0YWIgYmFyIGlzIGhpZGRlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgaGlkZUZvcjogJ21lZGl1bSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXNwb25zaXZlVG9nZ2xlLCAnUmVzcG9uc2l2ZVRvZ2dsZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmV2ZWFsIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXZlYWxcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uIGlmIHVzaW5nIGFuaW1hdGlvbnNcbiAqL1xuXG5jbGFzcyBSZXZlYWwge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBSZXZlYWwuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgUmV2ZWFsLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmV2ZWFsJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignUmV2ZWFsJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ3RhYl9mb3J3YXJkJyxcbiAgICAgICdTSElGVF9UQUInOiAndGFiX2JhY2t3YXJkJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtb2RhbCBieSBhZGRpbmcgdGhlIG92ZXJsYXkgYW5kIGNsb3NlIGJ1dHRvbnMsIChpZiBzZWxlY3RlZCkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmNhY2hlZCA9IHttcTogRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmN1cnJlbnR9O1xuICAgIHRoaXMuaXNNb2JpbGUgPSBtb2JpbGVTbmlmZigpO1xuXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApIDogJChgW2RhdGEtdG9nZ2xlPVwiJHt0aGlzLmlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogdGhpcy5pZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICd0YWJpbmRleCc6IDBcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmdWxsJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuID0gdHJ1ZTtcbiAgICAgIHRoaXMub3B0aW9ucy5vdmVybGF5ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiAhdGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheSA9IHRoaXMuX21ha2VPdmVybGF5KHRoaXMuaWQpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ2RpYWxvZycsXG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICdkYXRhLXlldGktYm94JzogdGhpcy5pZCxcbiAgICAgICAgJ2RhdGEtcmVzaXplJzogdGhpcy5pZFxuICAgIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbyh0aGlzLiRvdmVybGF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbygkKCdib2R5JykpO1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnd2l0aG91dC1vdmVybGF5Jyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmsgJiYgd2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggYCMke3RoaXMuaWR9YCkpIHtcbiAgICAgICQod2luZG93KS5vbmUoJ2xvYWQuemYucmV2ZWFsJywgdGhpcy5vcGVuLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG92ZXJsYXkgZGl2IHRvIGRpc3BsYXkgYmVoaW5kIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tYWtlT3ZlcmxheShpZCkge1xuICAgIHZhciAkb3ZlcmxheSA9ICQoJzxkaXY+PC9kaXY+JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdyZXZlYWwtb3ZlcmxheScpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmRUbygnYm9keScpO1xuICAgIHJldHVybiAkb3ZlcmxheTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHBvc2l0aW9uIG9mIG1vZGFsXG4gICAqIFRPRE86ICBGaWd1cmUgb3V0IGlmIHdlIGFjdHVhbGx5IG5lZWQgdG8gY2FjaGUgdGhlc2UgdmFsdWVzIG9yIGlmIGl0IGRvZXNuJ3QgbWF0dGVyXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlUG9zaXRpb24oKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy4kZWxlbWVudC5vdXRlcldpZHRoKCk7XG4gICAgdmFyIG91dGVyV2lkdGggPSAkKHdpbmRvdykud2lkdGgoKTtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy4kZWxlbWVudC5vdXRlckhlaWdodCgpO1xuICAgIHZhciBvdXRlckhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICB2YXIgbGVmdCwgdG9wO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaE9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQoKG91dGVyV2lkdGggLSB3aWR0aCkgLyAyLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMuaE9mZnNldCwgMTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnZPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgaWYgKGhlaWdodCA+IG91dGVySGVpZ2h0KSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KE1hdGgubWluKDEwMCwgb3V0ZXJIZWlnaHQgLyAxMCksIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KChvdXRlckhlaWdodCAtIGhlaWdodCkgLyA0LCAxMCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy52T2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHt0b3A6IHRvcCArICdweCd9KTtcbiAgICAvLyBvbmx5IHdvcnJ5IGFib3V0IGxlZnQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBvdmVybGF5IG9yIHdlIGhhdmVhICBob3Jpem9udGFsIG9mZnNldCxcbiAgICAvLyBvdGhlcndpc2Ugd2UncmUgcGVyZmVjdGx5IGluIHRoZSBtaWRkbGVcbiAgICBpZighdGhpcy4kb3ZlcmxheSB8fCAodGhpcy5vcHRpb25zLmhPZmZzZXQgIT09ICdhdXRvJykpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtsZWZ0OiBsZWZ0ICsgJ3B4J30pO1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe21hcmdpbjogJzBweCd9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogKGV2ZW50LCAkZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoKGV2ZW50LnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0pIHx8XG4gICAgICAgICAgICAoJChldmVudC50YXJnZXQpLnBhcmVudHMoJ1tkYXRhLWNsb3NhYmxlXScpWzBdID09PSAkZWxlbWVudCkpIHsgLy8gb25seSBjbG9zZSByZXZlYWwgd2hlbiBpdCdzIGV4cGxpY2l0bHkgY2FsbGVkXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UuYXBwbHkodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzIHx8IGUud2hpY2ggPT09IDMyKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiB0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5yZXZlYWwnKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub24oYHBvcHN0YXRlLnpmLnJldmVhbDoke3RoaXMuaWR9YCwgdGhpcy5faGFuZGxlU3RhdGUuYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgbW9kYWwgbWV0aG9kcyBvbiBiYWNrL2ZvcndhcmQgYnV0dG9uIGNsaWNrcyBvciBhbnkgb3RoZXIgZXZlbnQgdGhhdCB0cmlnZ2VycyBwb3BzdGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVTdGF0ZShlKSB7XG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggJyMnICsgdGhpcy5pZCkgJiYgIXRoaXMuaXNBY3RpdmUpeyB0aGlzLm9wZW4oKTsgfVxuICAgIGVsc2V7IHRoaXMuY2xvc2UoKTsgfVxuICB9XG5cblxuICAvKipcbiAgICogT3BlbnMgdGhlIG1vZGFsIGNvbnRyb2xsZWQgYnkgYHRoaXMuJGFuY2hvcmAsIGFuZCBjbG9zZXMgYWxsIG90aGVycyBieSBkZWZhdWx0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZW1lXG4gICAqIEBmaXJlcyBSZXZlYWwjb3BlblxuICAgKi9cbiAgb3BlbigpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB2YXIgaGFzaCA9IGAjJHt0aGlzLmlkfWA7XG5cbiAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gTWFrZSBlbGVtZW50cyBpbnZpc2libGUsIGJ1dCByZW1vdmUgZGlzcGxheTogbm9uZSBzbyB3ZSBjYW4gZ2V0IHNpemUgYW5kIHBvc2l0aW9uaW5nXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJyB9KVxuICAgICAgICAuc2hvdygpXG4gICAgICAgIC5zY3JvbGxUb3AoMCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJ30pLnNob3coKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmhpZGUoKVxuICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJycgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnJ30pLmhpZGUoKTtcbiAgICAgIGlmKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Zhc3QnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdmYXN0Jyk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3Nsb3cnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdzbG93Jyk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aXBsZU9wZW5lZCkge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG1vZGFsIG9wZW5zLlxuICAgICAgICogQ2xvc2VzIGFueSBvdGhlciBtb2RhbHMgdGhhdCBhcmUgY3VycmVudGx5IG9wZW5cbiAgICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VtZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYucmV2ZWFsJywgdGhpcy5pZCk7XG4gICAgfVxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25Jbikge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGZ1bmN0aW9uIGFmdGVyQW5pbWF0aW9uRm9jdXMoKXtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnRcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZm9jdXMoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kb3ZlcmxheSwgJ2ZhZGUtaW4nKTtcbiAgICAgIH1cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4sICgpID0+IHtcbiAgICAgICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgICAgYWZ0ZXJBbmltYXRpb25Gb2N1cygpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5zaG93KDApO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KHRoaXMub3B0aW9ucy5zaG93RGVsYXkpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBhY2Nlc3NpYmlsaXR5XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmF0dHIoe1xuICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgIH0pXG4gICAgICAuZm9jdXMoKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGhhcyBzdWNjZXNzZnVsbHkgb3BlbmVkLlxuICAgICAqIEBldmVudCBSZXZlYWwjb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5yZXZlYWwnKTtcblxuICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XG4gICAgICB0aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgJCgnaHRtbCwgYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX2V4dHJhSGFuZGxlcnMoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV4dHJhIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgYm9keSBhbmQgd2luZG93IGlmIG5lY2Vzc2FyeS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9leHRyYUhhbmRsZXJzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiAhdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4pIHtcbiAgICAgICQoJ2JvZHknKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9jayBmb2N1cyB3aXRoaW4gbW9kYWwgd2hpbGUgdGFiYmluZ1xuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgdGFiX2ZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgtMSkpKSB7IC8vIGxlZnQgbW9kYWwgZG93bndhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKDApLmZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYl9iYWNrd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKDApKSB8fCBfdGhpcy4kZWxlbWVudC5pcygnOmZvY3VzJykpIHsgLy8gbGVmdCBtb2RhbCB1cHdhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGxhc3QgZWxlbWVudFxuICAgICAgICAgICAgX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgeyAvLyBubyBmb2N1c2FibGUgZWxlbWVudHMgaW5zaWRlIHRoZSBtb2RhbCBhdCBhbGwsIHByZXZlbnQgdGFiYmluZyBpbiBnZW5lcmFsXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKSkpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IC8vIHNldCBmb2N1cyBiYWNrIHRvIGFuY2hvciBpZiBjbG9zZSBidXR0b24gaGFzIGJlZW4gYWN0aXZhdGVkXG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cykpIHsgLy8gZG9udCd0IHRyaWdnZXIgaWYgYWN1YWwgZWxlbWVudCBoYXMgZm9jdXMgKGkuZS4gaW5wdXRzLCBsaW5rcywgLi4uKVxuICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VkXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZiAoIXRoaXMuaXNBY3RpdmUgfHwgIXRoaXMuJGVsZW1lbnQuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJG92ZXJsYXksICdmYWRlLW91dCcsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgwLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKHRoaXMub3B0aW9ucy5oaWRlRGVsYXkpO1xuICAgIH1cblxuICAgIC8vIENvbmRpdGlvbmFscyB0byByZW1vdmUgZXh0cmEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkIG9uIG9wZW5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICAkKCdib2R5Jykub2ZmKCdjbGljay56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcblxuICAgIGZ1bmN0aW9uIGZpbmlzaFVwKCkge1xuICAgICAgaWYgKF90aGlzLmlzTW9iaWxlKSB7XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgICAgaWYoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpIHtcbiAgICAgICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKTtcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG5cbiAgICAgIF90aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAgIC8qKlxuICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBpcyBkb25lIGNsb3NpbmcuXG4gICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VkXG4gICAgICAqL1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICogUmVzZXRzIHRoZSBtb2RhbCBjb250ZW50XG4gICAgKiBUaGlzIHByZXZlbnRzIGEgcnVubmluZyB2aWRlbyB0byBrZWVwIGdvaW5nIGluIHRoZSBiYWNrZ3JvdW5kXG4gICAgKi9cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc2V0T25DbG9zZSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5odG1sKHRoaXMuJGVsZW1lbnQuaHRtbCgpKTtcbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgIGlmIChfdGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSkge1xuICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKFwiXCIsIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcnO1xuICAgICAgIH1cbiAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2VkIHN0YXRlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hcHBlbmRUbygkKCdib2R5JykpOyAvLyBtb3ZlICRlbGVtZW50IG91dHNpZGUgb2YgJG92ZXJsYXkgdG8gcHJldmVudCBlcnJvciB1bnJlZ2lzdGVyUGx1Z2luKClcbiAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgpLm9mZigpLnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmhpZGUoKS5vZmYoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYnKTtcbiAgICAkKHdpbmRvdykub2ZmKGAuemYucmV2ZWFsOiR7dGhpcy5pZH1gKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuUmV2ZWFsLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tbGVmdCdcbiAgICovXG4gIGFuaW1hdGlvbkluOiAnJyxcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLW91dC1yaWdodCdcbiAgICovXG4gIGFuaW1hdGlvbk91dDogJycsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIG9wZW5pbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBzaG93RGVsYXk6IDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIGNsb3Npbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBoaWRlRGVsYXk6IDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keS9vdmVybGF5IHRvIGNsb3NlIHRoZSBtb2RhbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGNsb3NlIGlmIHRoZSB1c2VyIHByZXNzZXMgdGhlIGBFU0NBUEVgIGtleS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uRXNjOiB0cnVlLFxuICAvKipcbiAgICogSWYgdHJ1ZSwgYWxsb3dzIG11bHRpcGxlIG1vZGFscyB0byBiZSBkaXNwbGF5ZWQgYXQgb25jZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlwbGVPcGVuZWQ6IGZhbHNlLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGRvd24gZnJvbSB0aGUgdG9wIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgdk9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGluIGZyb20gdGhlIHNpZGUgb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBhdXRvXG4gICAqL1xuICBoT2Zmc2V0OiAnYXV0bycsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGJlIGZ1bGxzY3JlZW4sIGNvbXBsZXRlbHkgYmxvY2tpbmcgb3V0IHRoZSByZXN0IG9mIHRoZSB2aWV3LiBKUyBjaGVja3MgZm9yIHRoaXMgYXMgd2VsbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZnVsbFNjcmVlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBQZXJjZW50YWdlIG9mIHNjcmVlbiBoZWlnaHQgdGhlIG1vZGFsIHNob3VsZCBwdXNoIHVwIGZyb20gdGhlIGJvdHRvbSBvZiB0aGUgdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgYnRtT2Zmc2V0UGN0OiAxMCxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gZ2VuZXJhdGUgYW4gb3ZlcmxheSBkaXYsIHdoaWNoIHdpbGwgY292ZXIgdGhlIHZpZXcgd2hlbiBtb2RhbCBvcGVucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBvdmVybGF5OiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byByZW1vdmUgYW5kIHJlaW5qZWN0IG1hcmt1cCBvbiBjbG9zZS4gU2hvdWxkIGJlIHRydWUgaWYgdXNpbmcgdmlkZW8gZWxlbWVudHMgdy9vIHVzaW5nIHByb3ZpZGVyJ3MgYXBpLCBvdGhlcndpc2UsIHZpZGVvcyB3aWxsIGNvbnRpbnVlIHRvIHBsYXkgaW4gdGhlIGJhY2tncm91bmQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHJlc2V0T25DbG9zZTogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGFsdGVyIHRoZSB1cmwgb24gb3Blbi9jbG9zZSwgYW5kIGFsbG93cyB0aGUgdXNlIG9mIHRoZSBgYmFja2AgYnV0dG9uIHRvIGNsb3NlIG1vZGFscy4gQUxTTywgYWxsb3dzIGEgbW9kYWwgdG8gYXV0by1tYW5pYWNhbGx5IG9wZW4gb24gcGFnZSBsb2FkIElGIHRoZSBoYXNoID09PSB0aGUgbW9kYWwncyB1c2VyLXNldCBpZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmV2ZWFsLCAnUmV2ZWFsJyk7XG5cbmZ1bmN0aW9uIGlQaG9uZVNuaWZmKCkge1xuICByZXR1cm4gL2lQKGFkfGhvbmV8b2QpLipPUy8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIGFuZHJvaWRTbmlmZigpIHtcbiAgcmV0dXJuIC9BbmRyb2lkLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gbW9iaWxlU25pZmYoKSB7XG4gIHJldHVybiBpUGhvbmVTbmlmZigpIHx8IGFuZHJvaWRTbmlmZigpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogU2xpZGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5zbGlkZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXG4gKi9cblxuY2xhc3MgU2xpZGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcmlsbGRvd24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU2xpZGVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTbGlkZXInKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdTbGlkZXInLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfVVAnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfRE9XTic6ICdkZWNyZWFzZScsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2luY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfVVAnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19ET1dOJzogJ2RlY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ2luY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0xFRlQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19SSUdIVCc6ICdkZWNyZWFzZV9mYXN0J1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpbGl6ZXMgdGhlIHBsdWdpbiBieSByZWFkaW5nL3NldHRpbmcgYXR0cmlidXRlcywgY3JlYXRpbmcgY29sbGVjdGlvbnMgYW5kIHNldHRpbmcgdGhlIGluaXRpYWwgcG9zaXRpb24gb2YgdGhlIGhhbmRsZShzKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlucHV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQnKTtcbiAgICB0aGlzLmhhbmRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJyk7XG5cbiAgICB0aGlzLiRoYW5kbGUgPSB0aGlzLmhhbmRsZXMuZXEoMCk7XG4gICAgdGhpcy4kaW5wdXQgPSB0aGlzLmlucHV0cy5sZW5ndGggPyB0aGlzLmlucHV0cy5lcSgwKSA6ICQoYCMke3RoaXMuJGhhbmRsZS5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YCk7XG4gICAgdGhpcy4kZmlsbCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWZpbGxdJykuY3NzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICdoZWlnaHQnIDogJ3dpZHRoJywgMCk7XG5cbiAgICB2YXIgaXNEYmwgPSBmYWxzZSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZWQgfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5kaXNhYmxlZCA9IHRydWU7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5wdXRzID0gJCgpLmFkZCh0aGlzLiRpbnB1dCk7XG4gICAgICB0aGlzLm9wdGlvbnMuYmluZGluZyA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX3NldEluaXRBdHRyKDApO1xuICAgIHRoaXMuX2V2ZW50cyh0aGlzLiRoYW5kbGUpO1xuXG4gICAgaWYgKHRoaXMuaGFuZGxlc1sxXSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGhhbmRsZTIgPSB0aGlzLmhhbmRsZXMuZXEoMSk7XG4gICAgICB0aGlzLiRpbnB1dDIgPSB0aGlzLmlucHV0cy5sZW5ndGggPiAxID8gdGhpcy5pbnB1dHMuZXEoMSkgOiAkKGAjJHt0aGlzLiRoYW5kbGUyLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcblxuICAgICAgaWYgKCF0aGlzLmlucHV0c1sxXSkge1xuICAgICAgICB0aGlzLmlucHV0cyA9IHRoaXMuaW5wdXRzLmFkZCh0aGlzLiRpbnB1dDIpO1xuICAgICAgfVxuICAgICAgaXNEYmwgPSB0cnVlO1xuXG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LCB0cnVlLCBmdW5jdGlvbigpIHtcblxuICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF90aGlzLiRoYW5kbGUyLCBfdGhpcy5vcHRpb25zLmluaXRpYWxFbmQsIHRydWUpO1xuICAgICAgfSk7XG4gICAgICAvLyB0aGlzLiRoYW5kbGUudHJpZ2dlckhhbmRsZXIoJ2NsaWNrLnpmLnNsaWRlcicpO1xuICAgICAgdGhpcy5fc2V0SW5pdEF0dHIoMSk7XG4gICAgICB0aGlzLl9ldmVudHModGhpcy4kaGFuZGxlMik7XG4gICAgfVxuXG4gICAgaWYgKCFpc0RibCkge1xuICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZSwgdGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCwgdHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzZWxlY3RlZCBoYW5kbGUgYW5kIGZpbGwgYmFyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRobmRsIC0gdGhlIHNlbGVjdGVkIGhhbmRsZSB0byBtb3ZlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gbG9jYXRpb24gLSBmbG9hdGluZyBwb2ludCBiZXR3ZWVuIHRoZSBzdGFydCBhbmQgZW5kIHZhbHVlcyBvZiB0aGUgc2xpZGVyIGJhci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24uXG4gICAqIEBmaXJlcyBTbGlkZXIjbW92ZWRcbiAgICogQGZpcmVzIFNsaWRlciNjaGFuZ2VkXG4gICAqL1xuICBfc2V0SGFuZGxlUG9zKCRobmRsLCBsb2NhdGlvbiwgbm9JbnZlcnQsIGNiKSB7XG4gICAgLy8gZG9uJ3QgbW92ZSBpZiB0aGUgc2xpZGVyIGhhcyBiZWVuIGRpc2FibGVkIHNpbmNlIGl0cyBpbml0aWFsaXphdGlvblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL21pZ2h0IG5lZWQgdG8gYWx0ZXIgdGhhdCBzbGlnaHRseSBmb3IgYmFycyB0aGF0IHdpbGwgaGF2ZSBvZGQgbnVtYmVyIHNlbGVjdGlvbnMuXG4gICAgbG9jYXRpb24gPSBwYXJzZUZsb2F0KGxvY2F0aW9uKTsvL29uIGlucHV0IGNoYW5nZSBldmVudHMsIGNvbnZlcnQgc3RyaW5nIHRvIG51bWJlci4uLmdydW1ibGUuXG5cbiAgICAvLyBwcmV2ZW50IHNsaWRlciBmcm9tIHJ1bm5pbmcgb3V0IG9mIGJvdW5kcywgaWYgdmFsdWUgZXhjZWVkcyB0aGUgbGltaXRzIHNldCB0aHJvdWdoIG9wdGlvbnMsIG92ZXJyaWRlIHRoZSB2YWx1ZSB0byBtaW4vbWF4XG4gICAgaWYgKGxvY2F0aW9uIDwgdGhpcy5vcHRpb25zLnN0YXJ0KSB7IGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLnN0YXJ0OyB9XG4gICAgZWxzZSBpZiAobG9jYXRpb24gPiB0aGlzLm9wdGlvbnMuZW5kKSB7IGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLmVuZDsgfVxuXG4gICAgdmFyIGlzRGJsID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkO1xuXG4gICAgaWYgKGlzRGJsKSB7IC8vdGhpcyBibG9jayBpcyB0byBwcmV2ZW50IDIgaGFuZGxlcyBmcm9tIGNyb3NzaW5nIGVhY2hvdGhlci4gQ291bGQvc2hvdWxkIGJlIGltcHJvdmVkLlxuICAgICAgaWYgKHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDApIHtcbiAgICAgICAgdmFyIGgyVmFsID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgICAgIGxvY2F0aW9uID0gbG9jYXRpb24gPj0gaDJWYWwgPyBoMlZhbCAtIHRoaXMub3B0aW9ucy5zdGVwIDogbG9jYXRpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaDFWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZS5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uIDw9IGgxVmFsID8gaDFWYWwgKyB0aGlzLm9wdGlvbnMuc3RlcCA6IGxvY2F0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vdGhpcyBpcyBmb3Igc2luZ2xlLWhhbmRsZWQgdmVydGljYWwgc2xpZGVycywgaXQgYWRqdXN0cyB0aGUgdmFsdWUgdG8gYWNjb3VudCBmb3IgdGhlIHNsaWRlciBiZWluZyBcInVwc2lkZS1kb3duXCJcbiAgICAvL2ZvciBjbGljayBhbmQgZHJhZyBldmVudHMsIGl0J3Mgd2VpcmQgZHVlIHRvIHRoZSBzY2FsZSgtMSwgMSkgY3NzIHByb3BlcnR5XG4gICAgaWYgKHRoaXMub3B0aW9ucy52ZXJ0aWNhbCAmJiAhbm9JbnZlcnQpIHtcbiAgICAgIGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLmVuZCAtIGxvY2F0aW9uO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHZlcnQgPSB0aGlzLm9wdGlvbnMudmVydGljYWwsXG4gICAgICAgIGhPclcgPSB2ZXJ0ID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBsT3JUID0gdmVydCA/ICd0b3AnIDogJ2xlZnQnLFxuICAgICAgICBoYW5kbGVEaW0gPSAkaG5kbFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtoT3JXXSxcbiAgICAgICAgZWxlbURpbSA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbaE9yV10sXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgbWluL21heCB2YWx1ZSBiYXNlZCBvbiBjbGljayBvciBkcmFnIHBvaW50XG4gICAgICAgIHBjdE9mQmFyID0gcGVyY2VudChsb2NhdGlvbiAtIHRoaXMub3B0aW9ucy5zdGFydCwgdGhpcy5vcHRpb25zLmVuZCAtIHRoaXMub3B0aW9ucy5zdGFydCkudG9GaXhlZCgyKSxcbiAgICAgICAgLy9udW1iZXIgb2YgYWN0dWFsIHBpeGVscyB0byBzaGlmdCB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvYnRhaW5lZCBhYm92ZVxuICAgICAgICBweFRvTW92ZSA9IChlbGVtRGltIC0gaGFuZGxlRGltKSAqIHBjdE9mQmFyLFxuICAgICAgICAvL3BlcmNlbnRhZ2Ugb2YgYmFyIHRvIHNoaWZ0IHRoZSBoYW5kbGVcbiAgICAgICAgbW92ZW1lbnQgPSAocGVyY2VudChweFRvTW92ZSwgZWxlbURpbSkgKiAxMDApLnRvRml4ZWQodGhpcy5vcHRpb25zLmRlY2ltYWwpO1xuICAgICAgICAvL2ZpeGluZyB0aGUgZGVjaW1hbCB2YWx1ZSBmb3IgdGhlIGxvY2F0aW9uIG51bWJlciwgaXMgcGFzc2VkIHRvIG90aGVyIG1ldGhvZHMgYXMgYSBmaXhlZCBmbG9hdGluZy1wb2ludCB2YWx1ZVxuICAgICAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24udG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCkpO1xuICAgICAgICAvLyBkZWNsYXJlIGVtcHR5IG9iamVjdCBmb3IgY3NzIGFkanVzdG1lbnRzLCBvbmx5IHVzZWQgd2l0aCAyIGhhbmRsZWQtc2xpZGVyc1xuICAgIHZhciBjc3MgPSB7fTtcblxuICAgIHRoaXMuX3NldFZhbHVlcygkaG5kbCwgbG9jYXRpb24pO1xuXG4gICAgLy8gVE9ETyB1cGRhdGUgdG8gY2FsY3VsYXRlIGJhc2VkIG9uIHZhbHVlcyBzZXQgdG8gcmVzcGVjdGl2ZSBpbnB1dHM/P1xuICAgIGlmIChpc0RibCkge1xuICAgICAgdmFyIGlzTGVmdEhuZGwgPSB0aGlzLmhhbmRsZXMuaW5kZXgoJGhuZGwpID09PSAwLFxuICAgICAgICAgIC8vZW1wdHkgdmFyaWFibGUsIHdpbGwgYmUgdXNlZCBmb3IgbWluLWhlaWdodC93aWR0aCBmb3IgZmlsbCBiYXJcbiAgICAgICAgICBkaW0sXG4gICAgICAgICAgLy9wZXJjZW50YWdlIHcvaCBvZiB0aGUgaGFuZGxlIGNvbXBhcmVkIHRvIHRoZSBzbGlkZXIgYmFyXG4gICAgICAgICAgaGFuZGxlUGN0ID0gIH5+KHBlcmNlbnQoaGFuZGxlRGltLCBlbGVtRGltKSAqIDEwMCk7XG4gICAgICAvL2lmIGxlZnQgaGFuZGxlLCB0aGUgbWF0aCBpcyBzbGlnaHRseSBkaWZmZXJlbnQgdGhhbiBpZiBpdCdzIHRoZSByaWdodCBoYW5kbGUsIGFuZCB0aGUgbGVmdC90b3AgcHJvcGVydHkgbmVlZHMgdG8gYmUgY2hhbmdlZCBmb3IgdGhlIGZpbGwgYmFyXG4gICAgICBpZiAoaXNMZWZ0SG5kbCkge1xuICAgICAgICAvL2xlZnQgb3IgdG9wIHBlcmNlbnRhZ2UgdmFsdWUgdG8gYXBwbHkgdG8gdGhlIGZpbGwgYmFyLlxuICAgICAgICBjc3NbbE9yVF0gPSBgJHttb3ZlbWVudH0lYDtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGRpbSA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlMlswXS5zdHlsZVtsT3JUXSkgLSBtb3ZlbWVudCArIGhhbmRsZVBjdDtcbiAgICAgICAgLy90aGlzIGNhbGxiYWNrIGlzIG5lY2Vzc2FyeSB0byBwcmV2ZW50IGVycm9ycyBhbmQgYWxsb3cgdGhlIHByb3BlciBwbGFjZW1lbnQgYW5kIGluaXRpYWxpemF0aW9uIG9mIGEgMi1oYW5kbGVkIHNsaWRlclxuICAgICAgICAvL3BsdXMsIGl0IG1lYW5zIHdlIGRvbid0IGNhcmUgaWYgJ2RpbScgaXNOYU4gb24gaW5pdCwgaXQgd29uJ3QgYmUgaW4gdGhlIGZ1dHVyZS5cbiAgICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9Ly90aGlzIGlzIG9ubHkgbmVlZGVkIGZvciB0aGUgaW5pdGlhbGl6YXRpb24gb2YgMiBoYW5kbGVkIHNsaWRlcnNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vanVzdCBjYWNoaW5nIHRoZSB2YWx1ZSBvZiB0aGUgbGVmdC9ib3R0b20gaGFuZGxlJ3MgbGVmdC90b3AgcHJvcGVydHlcbiAgICAgICAgdmFyIGhhbmRsZVBvcyA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlWzBdLnN0eWxlW2xPclRdKTtcbiAgICAgICAgLy9jYWxjdWxhdGUgdGhlIG5ldyBtaW4taGVpZ2h0L3dpZHRoIGZvciB0aGUgZmlsbCBiYXIuIFVzZSBpc05hTiB0byBwcmV2ZW50IGZhbHNlIHBvc2l0aXZlcyBmb3IgbnVtYmVycyA8PSAwXG4gICAgICAgIC8vYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2YgbW92ZW1lbnQgb2YgdGhlIGhhbmRsZSBiZWluZyBtYW5pcHVsYXRlZCwgbGVzcyB0aGUgb3Bwb3NpbmcgaGFuZGxlJ3MgbGVmdC90b3AgcG9zaXRpb24sIHBsdXMgdGhlIHBlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgaXRzZWxmXG4gICAgICAgIGRpbSA9IG1vdmVtZW50IC0gKGlzTmFOKGhhbmRsZVBvcykgPyB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LygodGhpcy5vcHRpb25zLmVuZC10aGlzLm9wdGlvbnMuc3RhcnQpLzEwMCkgOiBoYW5kbGVQb3MpICsgaGFuZGxlUGN0O1xuICAgICAgfVxuICAgICAgLy8gYXNzaWduIHRoZSBtaW4taGVpZ2h0L3dpZHRoIHRvIG91ciBjc3Mgb2JqZWN0XG4gICAgICBjc3NbYG1pbi0ke2hPcld9YF0gPSBgJHtkaW19JWA7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbmUoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhhbmRsZSBpcyBkb25lIG1vdmluZy5cbiAgICAgICAgICAgICAgICAgICAgICogQGV2ZW50IFNsaWRlciNtb3ZlZFxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignbW92ZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAvL2JlY2F1c2Ugd2UgZG9uJ3Qga25vdyBleGFjdGx5IGhvdyB0aGUgaGFuZGxlIHdpbGwgYmUgbW92ZWQsIGNoZWNrIHRoZSBhbW91bnQgb2YgdGltZSBpdCBzaG91bGQgdGFrZSB0byBtb3ZlLlxuICAgIHZhciBtb3ZlVGltZSA9IHRoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSA/IDEwMDAvNjAgOiB0aGlzLm9wdGlvbnMubW92ZVRpbWU7XG5cbiAgICBGb3VuZGF0aW9uLk1vdmUobW92ZVRpbWUsICRobmRsLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vYWRqdXN0aW5nIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBvZiB0aGUgaGFuZGxlLCBiYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBjYWxjdWxhdGVkIGFib3ZlXG4gICAgICAkaG5kbC5jc3MobE9yVCwgYCR7bW92ZW1lbnR9JWApO1xuXG4gICAgICBpZiAoIV90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQpIHtcbiAgICAgICAgLy9pZiBzaW5nbGUtaGFuZGxlZCwgYSBzaW1wbGUgbWV0aG9kIHRvIGV4cGFuZCB0aGUgZmlsbCBiYXJcbiAgICAgICAgX3RoaXMuJGZpbGwuY3NzKGhPclcsIGAke3BjdE9mQmFyICogMTAwfSVgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vb3RoZXJ3aXNlLCB1c2UgdGhlIGNzcyBvYmplY3Qgd2UgY3JlYXRlZCBhYm92ZVxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoY3NzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHZhbHVlIGhhcyBub3QgYmVlbiBjaGFuZ2UgZm9yIGEgZ2l2ZW4gdGltZS5cbiAgICAgKiBAZXZlbnQgU2xpZGVyI2NoYW5nZWRcbiAgICAgKi9cbiAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XG4gICAgfSwgX3RoaXMub3B0aW9ucy5jaGFuZ2VkRGVsYXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGluaXRpYWwgYXR0cmlidXRlIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlIGN1cnJlbnQgaGFuZGxlL2lucHV0IHRvIHVzZS5cbiAgICovXG4gIF9zZXRJbml0QXR0cihpZHgpIHtcbiAgICB2YXIgaWQgPSB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoJ2lkJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc2xpZGVyJyk7XG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS5hdHRyKHtcbiAgICAgICdpZCc6IGlkLFxuICAgICAgJ21heCc6IHRoaXMub3B0aW9ucy5lbmQsXG4gICAgICAnbWluJzogdGhpcy5vcHRpb25zLnN0YXJ0LFxuICAgICAgJ3N0ZXAnOiB0aGlzLm9wdGlvbnMuc3RlcFxuICAgIH0pO1xuICAgIHRoaXMuaGFuZGxlcy5lcShpZHgpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAnc2xpZGVyJyxcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXG4gICAgICAnYXJpYS12YWx1ZW1heCc6IHRoaXMub3B0aW9ucy5lbmQsXG4gICAgICAnYXJpYS12YWx1ZW1pbic6IHRoaXMub3B0aW9ucy5zdGFydCxcbiAgICAgICdhcmlhLXZhbHVlbm93JzogaWR4ID09PSAwID8gdGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCA6IHRoaXMub3B0aW9ucy5pbml0aWFsRW5kLFxuICAgICAgJ2FyaWEtb3JpZW50YXRpb24nOiB0aGlzLm9wdGlvbnMudmVydGljYWwgPyAndmVydGljYWwnIDogJ2hvcml6b250YWwnLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGlucHV0IGFuZCBgYXJpYS12YWx1ZW5vd2AgdmFsdWVzIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgaGFuZGxlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgb2YgdGhlIG5ldyB2YWx1ZS5cbiAgICovXG4gIF9zZXRWYWx1ZXMoJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIGlkeCA9IHRoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA/IHRoaXMuaGFuZGxlcy5pbmRleCgkaGFuZGxlKSA6IDA7XG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwodmFsKTtcbiAgICAkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCB2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgZXZlbnRzIG9uIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQ2FsY3VsYXRlcyB0aGUgbmV3IGxvY2F0aW9uIG9mIHRoZSBjdXJyZW50IGhhbmRsZS5cbiAgICogSWYgdGhlcmUgYXJlIHR3byBoYW5kbGVzIGFuZCB0aGUgYmFyIHdhcyBjbGlja2VkLCBpdCBkZXRlcm1pbmVzIHdoaWNoIGhhbmRsZSB0byBtb3ZlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGUgLSB0aGUgYGV2ZW50YCBvYmplY3QgcGFzc2VkIGZyb20gdGhlIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50IGhhbmRsZSB0byBjYWxjdWxhdGUgZm9yLCBpZiBzZWxlY3RlZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbCAtIGZsb2F0aW5nIHBvaW50IG51bWJlciBmb3IgdGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgKiBUT0RPIGNsZWFuIHRoaXMgdXAsIHRoZXJlJ3MgYSBsb3Qgb2YgcmVwZWF0ZWQgY29kZSBiZXR3ZWVuIHRoaXMgYW5kIHRoZSBfc2V0SGFuZGxlUG9zIGZuLlxuICAgKi9cbiAgX2hhbmRsZUV2ZW50KGUsICRoYW5kbGUsIHZhbCkge1xuICAgIHZhciB2YWx1ZSwgaGFzVmFsO1xuICAgIGlmICghdmFsKSB7Ly9jbGljayBvciBkcmFnIGV2ZW50c1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgICB2ZXJ0aWNhbCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcbiAgICAgICAgICBwYXJhbSA9IHZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICAgIGRpcmVjdGlvbiA9IHZlcnRpY2FsID8gJ3RvcCcgOiAnbGVmdCcsXG4gICAgICAgICAgZXZlbnRPZmZzZXQgPSB2ZXJ0aWNhbCA/IGUucGFnZVkgOiBlLnBhZ2VYLFxuICAgICAgICAgIGhhbGZPZkhhbmRsZSA9IHRoaXMuJGhhbmRsZVswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0gLyAyLFxuICAgICAgICAgIGJhckRpbSA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbcGFyYW1dLFxuICAgICAgICAgIHdpbmRvd1Njcm9sbCA9IHZlcnRpY2FsID8gJCh3aW5kb3cpLnNjcm9sbFRvcCgpIDogJCh3aW5kb3cpLnNjcm9sbExlZnQoKTtcblxuXG4gICAgICB2YXIgZWxlbU9mZnNldCA9IHRoaXMuJGVsZW1lbnQub2Zmc2V0KClbZGlyZWN0aW9uXTtcblxuICAgICAgLy8gdG91Y2ggZXZlbnRzIGVtdWxhdGVkIGJ5IHRoZSB0b3VjaCB1dGlsIGdpdmUgcG9zaXRpb24gcmVsYXRpdmUgdG8gc2NyZWVuLCBhZGQgd2luZG93LnNjcm9sbCB0byBldmVudCBjb29yZGluYXRlcy4uLlxuICAgICAgLy8gYmVzdCB3YXkgdG8gZ3Vlc3MgdGhpcyBpcyBzaW11bGF0ZWQgaXMgaWYgY2xpZW50WSA9PSBwYWdlWVxuICAgICAgaWYgKGUuY2xpZW50WSA9PT0gZS5wYWdlWSkgeyBldmVudE9mZnNldCA9IGV2ZW50T2Zmc2V0ICsgd2luZG93U2Nyb2xsOyB9XG4gICAgICB2YXIgZXZlbnRGcm9tQmFyID0gZXZlbnRPZmZzZXQgLSBlbGVtT2Zmc2V0O1xuICAgICAgdmFyIGJhclhZO1xuICAgICAgaWYgKGV2ZW50RnJvbUJhciA8IDApIHtcbiAgICAgICAgYmFyWFkgPSAwO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZyb21CYXIgPiBiYXJEaW0pIHtcbiAgICAgICAgYmFyWFkgPSBiYXJEaW07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYXJYWSA9IGV2ZW50RnJvbUJhcjtcbiAgICAgIH1cbiAgICAgIG9mZnNldFBjdCA9IHBlcmNlbnQoYmFyWFksIGJhckRpbSk7XG5cbiAgICAgIHZhbHVlID0gKHRoaXMub3B0aW9ucy5lbmQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpICogb2Zmc2V0UGN0ICsgdGhpcy5vcHRpb25zLnN0YXJ0O1xuXG4gICAgICAvLyB0dXJuIGV2ZXJ5dGhpbmcgYXJvdW5kIGZvciBSVEwsIHlheSBtYXRoIVxuICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkgJiYgIXRoaXMub3B0aW9ucy52ZXJ0aWNhbCkge3ZhbHVlID0gdGhpcy5vcHRpb25zLmVuZCAtIHZhbHVlO31cblxuICAgICAgdmFsdWUgPSBfdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsdWUpO1xuICAgICAgLy9ib29sZWFuIGZsYWcgZm9yIHRoZSBzZXRIYW5kbGVQb3MgZm4sIHNwZWNpZmljYWxseSBmb3IgdmVydGljYWwgc2xpZGVyc1xuICAgICAgaGFzVmFsID0gZmFsc2U7XG5cbiAgICAgIGlmICghJGhhbmRsZSkgey8vZmlndXJlIG91dCB3aGljaCBoYW5kbGUgaXQgaXMsIHBhc3MgaXQgdG8gdGhlIG5leHQgZnVuY3Rpb24uXG4gICAgICAgIHZhciBmaXJzdEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKSxcbiAgICAgICAgICAgIHNlY25kSG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZTIsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKTtcbiAgICAgICAgICAgICRoYW5kbGUgPSBmaXJzdEhuZGxQb3MgPD0gc2VjbmRIbmRsUG9zID8gdGhpcy4kaGFuZGxlIDogdGhpcy4kaGFuZGxlMjtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7Ly9jaGFuZ2UgZXZlbnQgb24gaW5wdXRcbiAgICAgIHZhbHVlID0gdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsKTtcbiAgICAgIGhhc1ZhbCA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0SGFuZGxlUG9zKCRoYW5kbGUsIHZhbHVlLCBoYXNWYWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdGVzIHZhbHVlIGZvciBoYW5kbGUgaW4gcmVnYXJkIHRvIHN0ZXAgdmFsdWUuIHJldHVybnMgYWRqdXN0ZWQgdmFsdWVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIHNlbGVjdGVkIGhhbmRsZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gdmFsdWUgdG8gYWRqdXN0LiB1c2VkIGlmICRoYW5kbGUgaXMgZmFsc3lcbiAgICovXG4gIF9hZGp1c3RWYWx1ZSgkaGFuZGxlLCB2YWx1ZSkge1xuICAgIHZhciB2YWwsXG4gICAgICBzdGVwID0gdGhpcy5vcHRpb25zLnN0ZXAsXG4gICAgICBkaXYgPSBwYXJzZUZsb2F0KHN0ZXAvMiksXG4gICAgICBsZWZ0LCBwcmV2X3ZhbCwgbmV4dF92YWw7XG4gICAgaWYgKCEhJGhhbmRsZSkge1xuICAgICAgdmFsID0gcGFyc2VGbG9hdCgkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFsID0gdmFsdWU7XG4gICAgfVxuICAgIGxlZnQgPSB2YWwgJSBzdGVwO1xuICAgIHByZXZfdmFsID0gdmFsIC0gbGVmdDtcbiAgICBuZXh0X3ZhbCA9IHByZXZfdmFsICsgc3RlcDtcbiAgICBpZiAobGVmdCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG4gICAgdmFsID0gdmFsID49IHByZXZfdmFsICsgZGl2ID8gbmV4dF92YWwgOiBwcmV2X3ZhbDtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzbGlkZXIgZWxlbWVudHMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50IGhhbmRsZSB0byBhcHBseSBsaXN0ZW5lcnMgdG8uXG4gICAqL1xuICBfZXZlbnRzKCRoYW5kbGUpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBjdXJIYW5kbGUsXG4gICAgICAgIHRpbWVyO1xuXG4gICAgICB0aGlzLmlucHV0cy5vZmYoJ2NoYW5nZS56Zi5zbGlkZXInKS5vbignY2hhbmdlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGlkeCA9IF90aGlzLmlucHV0cy5pbmRleCgkKHRoaXMpKTtcbiAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIF90aGlzLmhhbmRsZXMuZXEoaWR4KSwgJCh0aGlzKS52YWwoKSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja1NlbGVjdCkge1xuICAgICAgICB0aGlzLiRlbGVtZW50Lm9mZignY2xpY2suemYuc2xpZGVyJykub24oJ2NsaWNrLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgICAgIGlmICghJChlLnRhcmdldCkuaXMoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJykpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy4kaGFuZGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUpIHtcbiAgICAgIHRoaXMuaGFuZGxlcy5hZGRUb3VjaCgpO1xuXG4gICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAkaGFuZGxlXG4gICAgICAgIC5vZmYoJ21vdXNlZG93bi56Zi5zbGlkZXInKVxuICAgICAgICAub24oJ21vdXNlZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgJGhhbmRsZS5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICBfdGhpcy4kZmlsbC5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTsvL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgdHJ1ZSk7XG5cbiAgICAgICAgICBjdXJIYW5kbGUgPSAkKGUuY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgICAkYm9keS5vbignbW91c2Vtb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xuXG4gICAgICAgICAgfSkub24oJ21vdXNldXAuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XG5cbiAgICAgICAgICAgICRoYW5kbGUucmVtb3ZlQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy4kZmlsbC5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgZmFsc2UpO1xuXG4gICAgICAgICAgICAkYm9keS5vZmYoJ21vdXNlbW92ZS56Zi5zbGlkZXIgbW91c2V1cC56Zi5zbGlkZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAvLyBwcmV2ZW50IGV2ZW50cyB0cmlnZ2VyZWQgYnkgdG91Y2hcbiAgICAgIC5vbignc2VsZWN0c3RhcnQuemYuc2xpZGVyIHRvdWNobW92ZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgICRoYW5kbGUub2ZmKCdrZXlkb3duLnpmLnNsaWRlcicpLm9uKCdrZXlkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBfJGhhbmRsZSA9ICQodGhpcyksXG4gICAgICAgICAgaWR4ID0gX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA/IF90aGlzLmhhbmRsZXMuaW5kZXgoXyRoYW5kbGUpIDogMCxcbiAgICAgICAgICBvbGRWYWx1ZSA9IHBhcnNlRmxvYXQoX3RoaXMuaW5wdXRzLmVxKGlkeCkudmFsKCkpLFxuICAgICAgICAgIG5ld1ZhbHVlO1xuXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnU2xpZGVyJywge1xuICAgICAgICBkZWNyZWFzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXA7XG4gICAgICAgIH0sXG4gICAgICAgIGRlY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2VfZmFzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHsgLy8gb25seSBzZXQgaGFuZGxlIHBvcyB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkIHNwZWNpYWxseVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF8kaGFuZGxlLCBuZXdWYWx1ZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLyppZiAobmV3VmFsdWUpIHsgLy8gaWYgcHJlc3NlZCBrZXkgaGFzIHNwZWNpYWwgZnVuY3Rpb24sIHVwZGF0ZSB2YWx1ZVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlKTtcbiAgICAgIH0qL1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBzbGlkZXIgcGx1Z2luLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmhhbmRsZXMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy5pbnB1dHMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5zbGlkZXInKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5TbGlkZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDBcbiAgICovXG4gIHN0YXJ0OiAwLFxuICAvKipcbiAgICogTWF4aW11bSB2YWx1ZSBmb3IgdGhlIHNsaWRlciBzY2FsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMDBcbiAgICovXG4gIGVuZDogMTAwLFxuICAvKipcbiAgICogTWluaW11bSB2YWx1ZSBjaGFuZ2UgcGVyIGNoYW5nZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBzdGVwOiAxLFxuICAvKipcbiAgICogVmFsdWUgYXQgd2hpY2ggdGhlIGhhbmRsZS9pbnB1dCAqKGxlZnQgaGFuZGxlL2ZpcnN0IGlucHV0KSogc2hvdWxkIGJlIHNldCB0byBvbiBpbml0aWFsaXphdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAwXG4gICAqL1xuICBpbml0aWFsU3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgcmlnaHQgaGFuZGxlL3NlY29uZCBpbnB1dCBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwMFxuICAgKi9cbiAgaW5pdGlhbEVuZDogMTAwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBpbnB1dCB0byBiZSBsb2NhdGVkIG91dHNpZGUgdGhlIGNvbnRhaW5lciBhbmQgdmlzaWJsZS4gU2V0IHRvIGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBiaW5kaW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBjbGljay90YXAgb24gdGhlIHNsaWRlciBiYXIgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tTZWxlY3Q6IHRydWUsXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBhbmQgdXNlIHRoZSBgdmVydGljYWxgIGNsYXNzIHRvIGNoYW5nZSBhbGlnbm1lbnQgdG8gdmVydGljYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBkcmFnIHRoZSBzbGlkZXIgaGFuZGxlKHMpIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGRyYWdnYWJsZTogdHJ1ZSxcbiAgLyoqXG4gICAqIERpc2FibGVzIHRoZSBzbGlkZXIgYW5kIHByZXZlbnRzIGV2ZW50IGxpc3RlbmVycyBmcm9tIGJlaW5nIGFwcGxpZWQuIERvdWJsZSBjaGVja2VkIGJ5IEpTIHdpdGggYGRpc2FibGVkQ2xhc3NgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlZDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZSBvZiB0d28gaGFuZGxlcy4gRG91YmxlIGNoZWNrZWQgYnkgdGhlIEpTLiBDaGFuZ2VzIHNvbWUgbG9naWMgaGFuZGxpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRvdWJsZVNpZGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBvdGVudGlhbCBmdXR1cmUgZmVhdHVyZS5cbiAgICovXG4gIC8vIHN0ZXBzOiAxMDAsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdGhlIHBsdWdpbiBzaG91bGQgZ28gdG8gZm9yIGZsb2F0aW5nIHBvaW50IHByZWNpc2lvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyXG4gICAqL1xuICBkZWNpbWFsOiAyLFxuICAvKipcbiAgICogVGltZSBkZWxheSBmb3IgZHJhZ2dlZCBlbGVtZW50cy5cbiAgICovXG4gIC8vIGRyYWdEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBhbmltYXRlIHRoZSBtb3ZlbWVudCBvZiBhIHNsaWRlciBoYW5kbGUgaWYgdXNlciBjbGlja3MvdGFwcyBvbiB0aGUgYmFyLiBOZWVkcyB0byBiZSBtYW51YWxseSBzZXQgaWYgdXBkYXRpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgU2FzcyBzZXR0aW5ncy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIG1vdmVUaW1lOiAyMDAsLy91cGRhdGUgdGhpcyBpZiBjaGFuZ2luZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBzYXNzXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGRpc2FibGVkIHNsaWRlcnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2Rpc2FibGVkJ1xuICAgKi9cbiAgZGlzYWJsZWRDbGFzczogJ2Rpc2FibGVkJyxcbiAgLyoqXG4gICAqIFdpbGwgaW52ZXJ0IHRoZSBkZWZhdWx0IGxheW91dCBmb3IgYSB2ZXJ0aWNhbDxzcGFuIGRhdGEtdG9vbHRpcCB0aXRsZT1cIndobyB3b3VsZCBkbyB0aGlzPz8/XCI+IDwvc3Bhbj5zbGlkZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGludmVydFZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIE1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGBjaGFuZ2VkLnpmLXNsaWRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIGFmdGVyIHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGNoYW5nZWREZWxheTogNTAwXG59O1xuXG5mdW5jdGlvbiBwZXJjZW50KGZyYWMsIG51bSkge1xuICByZXR1cm4gKGZyYWMgLyBudW0pO1xufVxuZnVuY3Rpb24gYWJzUG9zaXRpb24oJGhhbmRsZSwgZGlyLCBjbGlja1BvcywgcGFyYW0pIHtcbiAgcmV0dXJuIE1hdGguYWJzKCgkaGFuZGxlLnBvc2l0aW9uKClbZGlyXSArICgkaGFuZGxlW3BhcmFtXSgpIC8gMikpIC0gY2xpY2tQb3MpO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU2xpZGVyLCAnU2xpZGVyJyk7XG5cbn0oalF1ZXJ5KTtcblxuLy8qKioqKioqKip0aGlzIGlzIGluIGNhc2Ugd2UgZ28gdG8gc3RhdGljLCBhYnNvbHV0ZSBwb3NpdGlvbnMgaW5zdGVhZCBvZiBkeW5hbWljIHBvc2l0aW9uaW5nKioqKioqKipcbi8vIHRoaXMuc2V0U3RlcHMoZnVuY3Rpb24oKSB7XG4vLyAgIF90aGlzLl9ldmVudHMoKTtcbi8vICAgdmFyIGluaXRTdGFydCA9IF90aGlzLm9wdGlvbnMucG9zaXRpb25zW190aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IC0gMV0gfHwgbnVsbDtcbi8vICAgdmFyIGluaXRFbmQgPSBfdGhpcy5vcHRpb25zLmluaXRpYWxFbmQgPyBfdGhpcy5vcHRpb25zLnBvc2l0aW9uW190aGlzLm9wdGlvbnMuaW5pdGlhbEVuZCAtIDFdIDogbnVsbDtcbi8vICAgaWYgKGluaXRTdGFydCB8fCBpbml0RW5kKSB7XG4vLyAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGluaXRTdGFydCwgaW5pdEVuZCk7XG4vLyAgIH1cbi8vIH0pO1xuXG4vLyoqKioqKioqKioqdGhlIG90aGVyIHBhcnQgb2YgYWJzb2x1dGUgcG9zaXRpb25zKioqKioqKioqKioqKlxuLy8gU2xpZGVyLnByb3RvdHlwZS5zZXRTdGVwcyA9IGZ1bmN0aW9uKGNiKSB7XG4vLyAgIHZhciBwb3NDaGFuZ2UgPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKSAvIHRoaXMub3B0aW9ucy5zdGVwcztcbi8vICAgdmFyIGNvdW50ZXIgPSAwXG4vLyAgIHdoaWxlKGNvdW50ZXIgPCB0aGlzLm9wdGlvbnMuc3RlcHMpIHtcbi8vICAgICBpZiAoY291bnRlcikge1xuLy8gICAgICAgdGhpcy5vcHRpb25zLnBvc2l0aW9ucy5wdXNoKHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbY291bnRlciAtIDFdICsgcG9zQ2hhbmdlKTtcbi8vICAgICB9IGVsc2Uge1xuLy8gICAgICAgdGhpcy5vcHRpb25zLnBvc2l0aW9ucy5wdXNoKHBvc0NoYW5nZSk7XG4vLyAgICAgfVxuLy8gICAgIGNvdW50ZXIrKztcbi8vICAgfVxuLy8gICBjYigpO1xuLy8gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTdGlja3kgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnN0aWNreVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgU3RpY2t5IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzdGlja3kgdGhpbmcuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBzdGlja3kuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9ucyBvYmplY3QgcGFzc2VkIHdoZW4gY3JlYXRpbmcgdGhlIGVsZW1lbnQgcHJvZ3JhbW1hdGljYWxseS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU3RpY2t5LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTdGlja3knKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgc3RpY2t5IGVsZW1lbnQgYnkgYWRkaW5nIGNsYXNzZXMsIGdldHRpbmcvc2V0dGluZyBkaW1lbnNpb25zLCBicmVha3BvaW50cyBhbmQgYXR0cmlidXRlc1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkcGFyZW50ID0gdGhpcy4kZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN0aWNreS1jb250YWluZXJdJyksXG4gICAgICAgIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzdGlja3knKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCEkcGFyZW50Lmxlbmd0aCkge1xuICAgICAgdGhpcy53YXNXcmFwcGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy4kY29udGFpbmVyID0gJHBhcmVudC5sZW5ndGggPyAkcGFyZW50IDogJCh0aGlzLm9wdGlvbnMuY29udGFpbmVyKS53cmFwSW5uZXIodGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy4kY29udGFpbmVyLmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5zdGlja3lDbGFzcylcbiAgICAgICAgICAgICAgICAgLmF0dHIoeydkYXRhLXJlc2l6ZSc6IGlkfSk7XG5cbiAgICB0aGlzLnNjcm9sbENvdW50ID0gdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5zdGlja3knLCBmdW5jdGlvbigpe1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbmNob3IgIT09ICcnKXtcbiAgICAgICAgX3RoaXMuJGFuY2hvciA9ICQoJyMnICsgX3RoaXMub3B0aW9ucy5hbmNob3IpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIF90aGlzLl9wYXJzZVBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xuICAgICAgfSk7XG4gICAgICBfdGhpcy5fZXZlbnRzKGlkLnNwbGl0KCctJykucmV2ZXJzZSgpLmpvaW4oJy0nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSWYgdXNpbmcgbXVsdGlwbGUgZWxlbWVudHMgYXMgYW5jaG9ycywgY2FsY3VsYXRlcyB0aGUgdG9wIGFuZCBib3R0b20gcGl4ZWwgdmFsdWVzIHRoZSBzdGlja3kgdGhpbmcgc2hvdWxkIHN0aWNrIGFuZCB1bnN0aWNrIG9uLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXJzZVBvaW50cygpIHtcbiAgICB2YXIgdG9wID0gdGhpcy5vcHRpb25zLnRvcEFuY2hvciA9PSBcIlwiID8gMSA6IHRoaXMub3B0aW9ucy50b3BBbmNob3IsXG4gICAgICAgIGJ0bSA9IHRoaXMub3B0aW9ucy5idG1BbmNob3I9PSBcIlwiID8gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCA6IHRoaXMub3B0aW9ucy5idG1BbmNob3IsXG4gICAgICAgIHB0cyA9IFt0b3AsIGJ0bV0sXG4gICAgICAgIGJyZWFrcyA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwdHMubGVuZ3RoOyBpIDwgbGVuICYmIHB0c1tpXTsgaSsrKSB7XG4gICAgICB2YXIgcHQ7XG4gICAgICBpZiAodHlwZW9mIHB0c1tpXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcHQgPSBwdHNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGxhY2UgPSBwdHNbaV0uc3BsaXQoJzonKSxcbiAgICAgICAgICAgIGFuY2hvciA9ICQoYCMke3BsYWNlWzBdfWApO1xuXG4gICAgICAgIHB0ID0gYW5jaG9yLm9mZnNldCgpLnRvcDtcbiAgICAgICAgaWYgKHBsYWNlWzFdICYmIHBsYWNlWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgcHQgKz0gYW5jaG9yWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWtzW2ldID0gcHQ7XG4gICAgfVxuXG5cbiAgICB0aGlzLnBvaW50cyA9IGJyZWFrcztcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgdGhlIHNjcm9sbGluZyBlbGVtZW50LlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgLSBwc3VlZG8tcmFuZG9tIGlkIGZvciB1bmlxdWUgc2Nyb2xsIGV2ZW50IGxpc3RlbmVyLlxuICAgKi9cbiAgX2V2ZW50cyhpZCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHNjcm9sbExpc3RlbmVyID0gdGhpcy5zY3JvbGxMaXN0ZW5lciA9IGBzY3JvbGwuemYuJHtpZH1gO1xuICAgIGlmICh0aGlzLmlzT24pIHsgcmV0dXJuOyB9XG4gICAgaWYgKHRoaXMuY2FuU3RpY2spIHtcbiAgICAgIHRoaXMuaXNPbiA9IHRydWU7XG4gICAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKVxuICAgICAgICAgICAgICAgLm9uKHNjcm9sbExpc3RlbmVyLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zY3JvbGxDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgIF90aGlzLnNjcm9sbENvdW50ID0gX3RoaXMub3B0aW9ucy5jaGVja0V2ZXJ5O1xuICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlLCB3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgIF90aGlzLnNjcm9sbENvdW50LS07XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKVxuICAgICAgICAgICAgICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlLCBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5jYW5TdGljaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX3RoaXMuaXNPbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2V2ZW50cyhpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF90aGlzLmlzT24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGV2ZW50IGhhbmRsZXJzIGZvciBzY3JvbGwgYW5kIGNoYW5nZSBldmVudHMgb24gYW5jaG9yLlxuICAgKiBAZmlyZXMgU3RpY2t5I3BhdXNlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzY3JvbGxMaXN0ZW5lciAtIHVuaXF1ZSwgbmFtZXNwYWNlZCBzY3JvbGwgbGlzdGVuZXIgYXR0YWNoZWQgdG8gYHdpbmRvd2BcbiAgICovXG4gIF9wYXVzZUxpc3RlbmVycyhzY3JvbGxMaXN0ZW5lcikge1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGlzIHBhdXNlZCBkdWUgdG8gcmVzaXplIGV2ZW50IHNocmlua2luZyB0aGUgdmlldy5cbiAgICAgKiBAZXZlbnQgU3RpY2t5I3BhdXNlXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwYXVzZS56Zi5zdGlja3knKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgb24gZXZlcnkgYHNjcm9sbGAgZXZlbnQgYW5kIG9uIGBfaW5pdGBcbiAgICogZmlyZXMgZnVuY3Rpb25zIGJhc2VkIG9uIGJvb2xlYW5zIGFuZCBjYWNoZWQgdmFsdWVzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gY2hlY2tTaXplcyAtIHRydWUgaWYgcGx1Z2luIHNob3VsZCByZWNhbGN1bGF0ZSBzaXplcyBhbmQgYnJlYWtwb2ludHMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBzY3JvbGwgLSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiBwYXNzZWQgZnJvbSBzY3JvbGwgZXZlbnQgY2IgZnVuY3Rpb24uIElmIG5vdCBwYXNzZWQsIGRlZmF1bHRzIHRvIGB3aW5kb3cucGFnZVlPZmZzZXRgLlxuICAgKi9cbiAgX2NhbGMoY2hlY2tTaXplcywgc2Nyb2xsKSB7XG4gICAgaWYgKGNoZWNrU2l6ZXMpIHsgdGhpcy5fc2V0U2l6ZXMoKTsgfVxuXG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXNjcm9sbCkgeyBzY3JvbGwgPSB3aW5kb3cucGFnZVlPZmZzZXQ7IH1cblxuICAgIGlmIChzY3JvbGwgPj0gdGhpcy50b3BQb2ludCkge1xuICAgICAgaWYgKHNjcm9sbCA8PSB0aGlzLmJvdHRvbVBvaW50KSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgdGhpcy5fc2V0U3RpY2t5KCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3koZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYXVzZXMgdGhlICRlbGVtZW50IHRvIGJlY29tZSBzdHVjay5cbiAgICogQWRkcyBgcG9zaXRpb246IGZpeGVkO2AsIGFuZCBoZWxwZXIgY2xhc3Nlcy5cbiAgICogQGZpcmVzIFN0aWNreSNzdHVja3RvXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFN0aWNreSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzdGlja1RvID0gdGhpcy5vcHRpb25zLnN0aWNrVG8sXG4gICAgICAgIG1yZ24gPSBzdGlja1RvID09PSAndG9wJyA/ICdtYXJnaW5Ub3AnIDogJ21hcmdpbkJvdHRvbScsXG4gICAgICAgIG5vdFN0dWNrVG8gPSBzdGlja1RvID09PSAndG9wJyA/ICdib3R0b20nIDogJ3RvcCcsXG4gICAgICAgIGNzcyA9IHt9O1xuXG4gICAgY3NzW21yZ25dID0gYCR7dGhpcy5vcHRpb25zW21yZ25dfWVtYDtcbiAgICBjc3Nbc3RpY2tUb10gPSAwO1xuICAgIGNzc1tub3RTdHVja1RvXSA9ICdhdXRvJztcbiAgICBjc3NbJ2xlZnQnXSA9IHRoaXMuJGNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0ICsgcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKVtcInBhZGRpbmctbGVmdFwiXSwgMTApO1xuICAgIHRoaXMuaXNTdHVjayA9IHRydWU7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHtub3RTdHVja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxuICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgJGVsZW1lbnQgaGFzIGJlY29tZSBgcG9zaXRpb246IGZpeGVkO2BcbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnN0dWNrdG86dG9wYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3N0dWNrdG9cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYuc3R1Y2t0bzoke3N0aWNrVG99YCk7XG4gICAgdGhpcy4kZWxlbWVudC5vbihcInRyYW5zaXRpb25lbmQgd2Via2l0VHJhbnNpdGlvbkVuZCBvVHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBNU1RyYW5zaXRpb25FbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYXVzZXMgdGhlICRlbGVtZW50IHRvIGJlY29tZSB1bnN0dWNrLlxuICAgKiBSZW1vdmVzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBBZGRzIG90aGVyIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVG9wIC0gdGVsbHMgdGhlIGZ1bmN0aW9uIGlmIHRoZSAkZWxlbWVudCBzaG91bGQgYW5jaG9yIHRvIHRoZSB0b3Agb3IgYm90dG9tIG9mIGl0cyAkYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBmaXJlcyBTdGlja3kjdW5zdHVja2Zyb21cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZW1vdmVTdGlja3koaXNUb3ApIHtcbiAgICB2YXIgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBzdGlja1RvVG9wID0gc3RpY2tUbyA9PT0gJ3RvcCcsXG4gICAgICAgIGNzcyA9IHt9LFxuICAgICAgICBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy5wb2ludHNbMF0gOiB0aGlzLmFuY2hvckhlaWdodCkgLSB0aGlzLmVsZW1IZWlnaHQsXG4gICAgICAgIG1yZ24gPSBzdGlja1RvVG9wID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG9Ub3AgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICB0b3BPckJvdHRvbSA9IGlzVG9wID8gJ3RvcCcgOiAnYm90dG9tJztcblxuICAgIGNzc1ttcmduXSA9IDA7XG5cbiAgICBjc3NbJ2JvdHRvbSddID0gJ2F1dG8nO1xuICAgIGlmKGlzVG9wKSB7XG4gICAgICBjc3NbJ3RvcCddID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3NzWyd0b3AnXSA9IGFuY2hvclB0O1xuICAgIH1cblxuICAgIGNzc1snbGVmdCddID0gJyc7XG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHt0b3BPckJvdHRvbX1gKVxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcbiAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYW5jaG9yZWQuXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi51bnN0dWNrZnJvbTpib3R0b21gXG4gICAgICAgICAgICAgICAgICAqIEBldmVudCBTdGlja3kjdW5zdHVja2Zyb21cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYudW5zdHVja2Zyb206JHt0b3BPckJvdHRvbX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSAkZWxlbWVudCBhbmQgJGNvbnRhaW5lciBzaXplcyBmb3IgcGx1Z2luLlxuICAgKiBDYWxscyBgX3NldEJyZWFrUG9pbnRzYC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24gb2YgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U2l6ZXMoY2IpIHtcbiAgICB0aGlzLmNhblN0aWNrID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLnN0aWNreU9uKTtcbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHsgY2IoKTsgfVxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIG5ld0VsZW1XaWR0aCA9IHRoaXMuJGNvbnRhaW5lclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCxcbiAgICAgICAgY29tcCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSksXG4gICAgICAgIHBkbmcgPSBwYXJzZUludChjb21wWydwYWRkaW5nLXJpZ2h0J10sIDEwKTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy5hbmNob3JIZWlnaHQgPSB0aGlzLiRhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wYXJzZVBvaW50cygpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcbiAgICAgICdtYXgtd2lkdGgnOiBgJHtuZXdFbGVtV2lkdGggLSBwZG5nfXB4YFxuICAgIH0pO1xuXG4gICAgdmFyIG5ld0NvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0IHx8IHRoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgIGlmICh0aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIpIHtcbiAgICAgIG5ld0NvbnRhaW5lckhlaWdodCA9IDA7XG4gICAgfVxuICAgIHRoaXMuY29udGFpbmVySGVpZ2h0ID0gbmV3Q29udGFpbmVySGVpZ2h0O1xuICAgIHRoaXMuJGNvbnRhaW5lci5jc3Moe1xuICAgICAgaGVpZ2h0OiBuZXdDb250YWluZXJIZWlnaHRcbiAgICB9KTtcbiAgICB0aGlzLmVsZW1IZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG5cbiAgXHRpZiAodGhpcy5pc1N0dWNrKSB7XG4gIFx0XHR0aGlzLiRlbGVtZW50LmNzcyh7XCJsZWZ0XCI6dGhpcy4kY29udGFpbmVyLm9mZnNldCgpLmxlZnQgKyBwYXJzZUludChjb21wWydwYWRkaW5nLWxlZnQnXSwgMTApfSk7XG4gIFx0fVxuXG4gICAgdGhpcy5fc2V0QnJlYWtQb2ludHMobmV3Q29udGFpbmVySGVpZ2h0LCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjYikgeyBjYigpOyB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdXBwZXIgYW5kIGxvd2VyIGJyZWFrcG9pbnRzIGZvciB0aGUgZWxlbWVudCB0byBiZWNvbWUgc3RpY2t5L3Vuc3RpY2t5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZWxlbUhlaWdodCAtIHB4IHZhbHVlIGZvciBzdGlja3kuJGVsZW1lbnQgaGVpZ2h0LCBjYWxjdWxhdGVkIGJ5IGBfc2V0U2l6ZXNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBjb21wbGV0aW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEJyZWFrUG9pbnRzKGVsZW1IZWlnaHQsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IpIHsgY2IoKTsgfVxuICAgICAgZWxzZSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cbiAgICB2YXIgbVRvcCA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luVG9wKSxcbiAgICAgICAgbUJ0bSA9IGVtQ2FsYyh0aGlzLm9wdGlvbnMubWFyZ2luQm90dG9tKSxcbiAgICAgICAgdG9wUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzBdIDogdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCxcbiAgICAgICAgYm90dG9tUG9pbnQgPSB0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIDogdG9wUG9pbnQgKyB0aGlzLmFuY2hvckhlaWdodCxcbiAgICAgICAgLy8gdG9wUG9pbnQgPSB0aGlzLiRhbmNob3Iub2Zmc2V0KCkudG9wIHx8IHRoaXMucG9pbnRzWzBdLFxuICAgICAgICAvLyBib3R0b21Qb2ludCA9IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQgfHwgdGhpcy5wb2ludHNbMV0sXG4gICAgICAgIHdpbkhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RpY2tUbyA9PT0gJ3RvcCcpIHtcbiAgICAgIHRvcFBvaW50IC09IG1Ub3A7XG4gICAgICBib3R0b21Qb2ludCAtPSAoZWxlbUhlaWdodCArIG1Ub3ApO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICdib3R0b20nKSB7XG4gICAgICB0b3BQb2ludCAtPSAod2luSGVpZ2h0IC0gKGVsZW1IZWlnaHQgKyBtQnRtKSk7XG4gICAgICBib3R0b21Qb2ludCAtPSAod2luSGVpZ2h0IC0gbUJ0bSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vdGhpcyB3b3VsZCBiZSB0aGUgc3RpY2tUbzogYm90aCBvcHRpb24uLi4gdHJpY2t5XG4gICAgfVxuXG4gICAgdGhpcy50b3BQb2ludCA9IHRvcFBvaW50O1xuICAgIHRoaXMuYm90dG9tUG9pbnQgPSBib3R0b21Qb2ludDtcblxuICAgIGlmIChjYikgeyBjYigpOyB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGN1cnJlbnQgc3RpY2t5IGVsZW1lbnQuXG4gICAqIFJlc2V0cyB0aGUgZWxlbWVudCB0byB0aGUgdG9wIHBvc2l0aW9uIGZpcnN0LlxuICAgKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycywgSlMtYWRkZWQgY3NzIHByb3BlcnRpZXMgYW5kIGNsYXNzZXMsIGFuZCB1bndyYXBzIHRoZSAkZWxlbWVudCBpZiB0aGUgSlMgYWRkZWQgdGhlICRjb250YWluZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG5cbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5zdGlja3lDbGFzc30gaXMtYW5jaG9yZWQgaXMtYXQtdG9wYClcbiAgICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnJyxcbiAgICAgICAgICAgICAgICAgICB0b3A6ICcnLFxuICAgICAgICAgICAgICAgICAgIGJvdHRvbTogJycsXG4gICAgICAgICAgICAgICAgICAgJ21heC13aWR0aCc6ICcnXG4gICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgIC5vZmYoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICBpZiAodGhpcy4kYW5jaG9yICYmIHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ2NoYW5nZS56Zi5zdGlja3knKTtcbiAgICB9XG4gICAgJCh3aW5kb3cpLm9mZih0aGlzLnNjcm9sbExpc3RlbmVyKTtcblxuICAgIGlmICh0aGlzLndhc1dyYXBwZWQpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQudW53cmFwKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGNvbnRhaW5lci5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuY29udGFpbmVyQ2xhc3MpXG4gICAgICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnJ1xuICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgfVxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5TdGlja3kuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBDdXN0b21pemFibGUgY29udGFpbmVyIHRlbXBsYXRlLiBBZGQgeW91ciBvd24gY2xhc3NlcyBmb3Igc3R5bGluZyBhbmQgc2l6aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcmbHQ7ZGl2IGRhdGEtc3RpY2t5LWNvbnRhaW5lciBjbGFzcz1cInNtYWxsLTYgY29sdW1uc1wiJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIGNvbnRhaW5lcjogJzxkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyPjwvZGl2PicsXG4gIC8qKlxuICAgKiBMb2NhdGlvbiBpbiB0aGUgdmlldyB0aGUgZWxlbWVudCBzdGlja3MgdG8uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHN0aWNrVG86ICd0b3AnLFxuICAvKipcbiAgICogSWYgYW5jaG9yZWQgdG8gYSBzaW5nbGUgZWxlbWVudCwgdGhlIGlkIG9mIHRoYXQgZWxlbWVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkJ1xuICAgKi9cbiAgYW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIHRvcCBhbmNob3IuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2V4YW1wbGVJZDp0b3AnXG4gICAqL1xuICB0b3BBbmNob3I6ICcnLFxuICAvKipcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgYm90dG9tIGFuY2hvci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkOmJvdHRvbSdcbiAgICovXG4gIGJ0bUFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgdG9wIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgbWFyZ2luVG9wOiAxLFxuICAvKipcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIGJvdHRvbSBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIG1hcmdpbkJvdHRvbTogMSxcbiAgLyoqXG4gICAqIEJyZWFrcG9pbnQgc3RyaW5nIHRoYXQgaXMgdGhlIG1pbmltdW0gc2NyZWVuIHNpemUgYW4gZWxlbWVudCBzaG91bGQgYmVjb21lIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgc3RpY2t5T246ICdtZWRpdW0nLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgZWxlbWVudCwgYW5kIHJlbW92ZWQgb24gZGVzdHJ1Y3Rpb24uIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreWAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3N0aWNreSdcbiAgICovXG4gIHN0aWNreUNsYXNzOiAnc3RpY2t5JyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGNvbnRhaW5lci4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5LWNvbnRhaW5lcmAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3N0aWNreS1jb250YWluZXInXG4gICAqL1xuICBjb250YWluZXJDbGFzczogJ3N0aWNreS1jb250YWluZXInLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHNjcm9sbCBldmVudHMgYmV0d2VlbiB0aGUgcGx1Z2luJ3MgcmVjYWxjdWxhdGluZyBzdGlja3kgcG9pbnRzLiBTZXR0aW5nIGl0IHRvIGAwYCB3aWxsIGNhdXNlIGl0IHRvIHJlY2FsYyBldmVyeSBzY3JvbGwgZXZlbnQsIHNldHRpbmcgaXQgdG8gYC0xYCB3aWxsIHByZXZlbnQgcmVjYWxjIG9uIHNjcm9sbC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgY2hlY2tFdmVyeTogLTFcbn07XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNhbGN1bGF0ZSBlbSB2YWx1ZXNcbiAqIEBwYXJhbSBOdW1iZXIge2VtfSAtIG51bWJlciBvZiBlbSdzIHRvIGNhbGN1bGF0ZSBpbnRvIHBpeGVsc1xuICovXG5mdW5jdGlvbiBlbUNhbGMoZW0pIHtcbiAgcmV0dXJuIHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHksIG51bGwpLmZvbnRTaXplLCAxMCkgKiBlbTtcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFN0aWNreSwgJ1N0aWNreScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogVGFicyBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24udGFic1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyIGlmIHRhYnMgY29udGFpbiBpbWFnZXNcbiAqL1xuXG5jbGFzcyBUYWJzIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgdGFicy5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUYWJzI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byB0YWJzLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRhYnMuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUYWJzJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignVGFicycsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICdwcmV2aW91cycsXG4gICAgICAnQVJST1dfRE9XTic6ICduZXh0JyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJ1xuICAgICAgLy8gJ1RBQic6ICduZXh0JyxcbiAgICAgIC8vICdTSElGVF9UQUInOiAncHJldmlvdXMnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYnMgYnkgc2hvd2luZyBhbmQgZm9jdXNpbmcgKGlmIGF1dG9Gb2N1cz10cnVlKSB0aGUgcHJlc2V0IGFjdGl2ZSB0YWIuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFiVGl0bGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApO1xuICAgIHRoaXMuJHRhYkNvbnRlbnQgPSAkKGBbZGF0YS10YWJzLWNvbnRlbnQ9XCIke3RoaXMuJGVsZW1lbnRbMF0uaWR9XCJdYCk7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkbGluayA9ICRlbGVtLmZpbmQoJ2EnKSxcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSxcbiAgICAgICAgICBoYXNoID0gJGxpbmtbMF0uaGFzaC5zbGljZSgxKSxcbiAgICAgICAgICBsaW5rSWQgPSAkbGlua1swXS5pZCA/ICRsaW5rWzBdLmlkIDogYCR7aGFzaH0tbGFiZWxgLFxuICAgICAgICAgICR0YWJDb250ZW50ID0gJChgIyR7aGFzaH1gKTtcblxuICAgICAgJGVsZW0uYXR0cih7J3JvbGUnOiAncHJlc2VudGF0aW9uJ30pO1xuXG4gICAgICAkbGluay5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBoYXNoLFxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGlzQWN0aXZlLFxuICAgICAgICAnaWQnOiBsaW5rSWRcbiAgICAgIH0pO1xuXG4gICAgICAkdGFiQ29udGVudC5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAndGFicGFuZWwnLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiAhaXNBY3RpdmUsXG4gICAgICAgICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWRcbiAgICAgIH0pO1xuXG4gICAgICBpZihpc0FjdGl2ZSAmJiBfdGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICAgICRsaW5rLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kdGFiQ29udGVudC5maW5kKCdpbWcnKTtcblxuICAgICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fc2V0SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2V0SGVpZ2h0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLl9hZGRLZXlIYW5kbGVyKCk7XG4gICAgdGhpcy5fYWRkQ2xpY2tIYW5kbGVyKCk7XG4gICAgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyID0gbnVsbDtcbiAgICBcbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKTtcbiAgICAgIFxuICAgICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGNsaWNrIGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQ2xpY2tIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCdjbGljay56Zi50YWJzJylcbiAgICAgIC5vbignY2xpY2suemYudGFicycsIGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWAsIGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCQodGhpcykpO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBrZXlib2FyZCBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSB0YWJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEtleUhhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgJGZpcnN0VGFiID0gX3RoaXMuJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3Qtb2YtdHlwZScpO1xuICAgIHZhciAkbGFzdFRhYiA9IF90aGlzLiRlbGVtZW50LmZpbmQoJ2xpOmxhc3Qtb2YtdHlwZScpO1xuXG4gICAgdGhpcy4kdGFiVGl0bGVzLm9mZigna2V5ZG93bi56Zi50YWJzJykub24oJ2tleWRvd24uemYudGFicycsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYgKGUud2hpY2ggPT09IDkpIHJldHVybjtcbiAgICAgIFxuXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJyksXG4gICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLndyYXBPbktleXMpIHtcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9IGkgPT09IDAgPyAkZWxlbWVudHMubGFzdCgpIDogJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSBpID09PSAkZWxlbWVudHMubGVuZ3RoIC0xID8gJGVsZW1lbnRzLmZpcnN0KCkgOiAkZWxlbWVudHMuZXEoaSsxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpO1xuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdUYWJzJywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkZWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHByZXZFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRuZXh0RWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgdGFiIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIG9wZW4uXG4gICAqIEBmaXJlcyBUYWJzI2NoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCkge1xuICAgIHZhciAkdGFiTGluayA9ICR0YXJnZXQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKSxcbiAgICAgICAgaGFzaCA9ICR0YWJMaW5rWzBdLmhhc2gsXG4gICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpLFxuICAgICAgICAkb2xkVGFiID0gdGhpcy4kZWxlbWVudC5cbiAgICAgICAgICBmaW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfS5pcy1hY3RpdmVgKVxuICAgICAgICAgIC5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJylcbiAgICAgICAgICAuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKVxuICAgICAgICAgIC5hdHRyKHsgJ2FyaWEtc2VsZWN0ZWQnOiAnZmFsc2UnIH0pO1xuXG4gICAgJChgIyR7JG9sZFRhYi5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YClcbiAgICAgIC5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJylcbiAgICAgIC5hdHRyKHsgJ2FyaWEtaGlkZGVuJzogJ3RydWUnIH0pO1xuXG4gICAgJHRhcmdldC5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAkdGFiTGluay5hdHRyKHsnYXJpYS1zZWxlY3RlZCc6ICd0cnVlJ30pO1xuXG4gICAgJHRhcmdldENvbnRlbnRcbiAgICAgIC5hZGRDbGFzcygnaXMtYWN0aXZlJylcbiAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiAnZmFsc2UnfSk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkIHRhYnMuXG4gICAgICogQGV2ZW50IFRhYnMjY2hhbmdlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjaGFuZ2UuemYudGFicycsIFskdGFyZ2V0XSk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljIG1ldGhvZCBmb3Igc2VsZWN0aW5nIGEgY29udGVudCBwYW5lIHRvIGRpc3BsYXkuXG4gICAqIEBwYXJhbSB7alF1ZXJ5IHwgU3RyaW5nfSBlbGVtIC0galF1ZXJ5IG9iamVjdCBvciBzdHJpbmcgb2YgdGhlIGlkIG9mIHRoZSBwYW5lIHRvIGRpc3BsYXkuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2VsZWN0VGFiKGVsZW0pIHtcbiAgICB2YXIgaWRTdHI7XG5cbiAgICBpZiAodHlwZW9mIGVsZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICBpZFN0ciA9IGVsZW1bMF0uaWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkU3RyID0gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoaWRTdHIuaW5kZXhPZignIycpIDwgMCkge1xuICAgICAgaWRTdHIgPSBgIyR7aWRTdHJ9YDtcbiAgICB9XG5cbiAgICB2YXIgJHRhcmdldCA9IHRoaXMuJHRhYlRpdGxlcy5maW5kKGBbaHJlZj1cIiR7aWRTdHJ9XCJdYCkucGFyZW50KGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApO1xuXG4gICAgdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCR0YXJnZXQpO1xuICB9O1xuICAvKipcbiAgICogU2V0cyB0aGUgaGVpZ2h0IG9mIGVhY2ggcGFuZWwgdG8gdGhlIGhlaWdodCBvZiB0aGUgdGFsbGVzdCBwYW5lbC5cbiAgICogSWYgZW5hYmxlZCBpbiBvcHRpb25zLCBnZXRzIGNhbGxlZCBvbiBtZWRpYSBxdWVyeSBjaGFuZ2UuXG4gICAqIElmIGxvYWRpbmcgY29udGVudCB2aWEgZXh0ZXJuYWwgc291cmNlLCBjYW4gYmUgY2FsbGVkIGRpcmVjdGx5IG9yIHdpdGggX3JlZmxvdy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0SGVpZ2h0KCkge1xuICAgIHZhciBtYXggPSAwO1xuICAgIHRoaXMuJHRhYkNvbnRlbnRcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmNzcygnaGVpZ2h0JywgJycpXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBhbmVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGlzQWN0aXZlID0gcGFuZWwuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbicsICdkaXNwbGF5JzogJ2Jsb2NrJ30pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRlbXAgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcblxuICAgICAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICAgICAgcGFuZWwuY3NzKHtcbiAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJycsXG4gICAgICAgICAgICAnZGlzcGxheSc6ICcnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXggPSB0ZW1wID4gbWF4ID8gdGVtcCA6IG1heDtcbiAgICAgIH0pXG4gICAgICAuY3NzKCdoZWlnaHQnLCBgJHttYXh9cHhgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhbiB0YWJzLlxuICAgKiBAZmlyZXMgVGFicyNkZXN0cm95ZWRcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YClcbiAgICAgIC5vZmYoJy56Zi50YWJzJykuaGlkZSgpLmVuZCgpXG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5oaWRlKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICBpZiAodGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyICE9IG51bGwpIHtcbiAgICAgICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRhYnMuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBhY3RpdmUgcGFuZSBvbiBsb2FkIGlmIHNldCB0byB0cnVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3Mga2V5Ym9hcmQgaW5wdXQgdG8gJ3dyYXAnIGFyb3VuZCB0aGUgdGFiIGxpbmtzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIHdyYXBPbktleXM6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdGFiIGNvbnRlbnQgcGFuZXMgdG8gbWF0Y2ggaGVpZ2h0cyBpZiBzZXQgdG8gdHJ1ZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbWF0Y2hIZWlnaHQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGBsaWAncyBpbiB0YWIgbGluayBsaXN0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0YWJzLXRpdGxlJ1xuICAgKi9cbiAgbGlua0NsYXNzOiAndGFicy10aXRsZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRlbnQgY29udGFpbmVycy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndGFicy1wYW5lbCdcbiAgICovXG4gIHBhbmVsQ2xhc3M6ICd0YWJzLXBhbmVsJ1xufTtcblxuZnVuY3Rpb24gY2hlY2tDbGFzcygkZWxlbSl7XG4gIHJldHVybiAkZWxlbS5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihUYWJzLCAnVGFicycpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogVG9nZ2xlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24udG9nZ2xlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb2dnbGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVG9nZ2xlci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUb2dnbGVyI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUb2dnbGVyLmRlZmF1bHRzLCBlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5jbGFzc05hbWUgPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RvZ2dsZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgVG9nZ2xlciBwbHVnaW4gYnkgcGFyc2luZyB0aGUgdG9nZ2xlIGNsYXNzIGZyb20gZGF0YS10b2dnbGVyLCBvciBhbmltYXRpb24gY2xhc3NlcyBmcm9tIGRhdGEtYW5pbWF0ZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaW5wdXQ7XG4gICAgLy8gUGFyc2UgYW5pbWF0aW9uIGNsYXNzZXMgaWYgdGhleSB3ZXJlIHNldFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgaW5wdXQgPSB0aGlzLm9wdGlvbnMuYW5pbWF0ZS5zcGxpdCgnICcpO1xuXG4gICAgICB0aGlzLmFuaW1hdGlvbkluID0gaW5wdXRbMF07XG4gICAgICB0aGlzLmFuaW1hdGlvbk91dCA9IGlucHV0WzFdIHx8IG51bGw7XG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgcGFyc2UgdG9nZ2xlIGNsYXNzXG4gICAgZWxzZSB7XG4gICAgICBpbnB1dCA9IHRoaXMuJGVsZW1lbnQuZGF0YSgndG9nZ2xlcicpO1xuICAgICAgLy8gQWxsb3cgZm9yIGEgLiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmdcbiAgICAgIHRoaXMuY2xhc3NOYW1lID0gaW5wdXRbMF0gPT09ICcuJyA/IGlucHV0LnNsaWNlKDEpIDogaW5wdXQ7XG4gICAgfVxuXG4gICAgLy8gQWRkIEFSSUEgYXR0cmlidXRlcyB0byB0cmlnZ2Vyc1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQ7XG4gICAgJChgW2RhdGEtb3Blbj1cIiR7aWR9XCJdLCBbZGF0YS1jbG9zZT1cIiR7aWR9XCJdLCBbZGF0YS10b2dnbGU9XCIke2lkfVwiXWApXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcbiAgICAvLyBJZiB0aGUgdGFyZ2V0IGlzIGhpZGRlbiwgYWRkIGFyaWEtaGlkZGVuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgdGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpID8gZmFsc2UgOiB0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSB0b2dnbGUgdHJpZ2dlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCd0b2dnbGUuemYudHJpZ2dlcicpLm9uKCd0b2dnbGUuemYudHJpZ2dlcicsIHRoaXMudG9nZ2xlLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHRhcmdldCBjbGFzcyBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuIEFuIGV2ZW50IGlzIGZpcmVkIGZyb20gdGhlIG9yaWdpbmFsIHRyaWdnZXIgZGVwZW5kaW5nIG9uIGlmIHRoZSByZXN1bHRhbnQgc3RhdGUgd2FzIFwib25cIiBvciBcIm9mZlwiLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFRvZ2dsZXIjb25cbiAgICogQGZpcmVzIFRvZ2dsZXIjb2ZmXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgdGhpc1sgdGhpcy5vcHRpb25zLmFuaW1hdGUgPyAnX3RvZ2dsZUFuaW1hdGUnIDogJ190b2dnbGVDbGFzcyddKCk7XG4gIH1cblxuICBfdG9nZ2xlQ2xhc3MoKSB7XG4gICAgdGhpcy4kZWxlbWVudC50b2dnbGVDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG5cbiAgICB2YXIgaXNPbiA9IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuICAgIGlmIChpc09uKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBoYXMgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb25cbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvbi56Zi50b2dnbGVyJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgZG9lcyBub3QgaGF2ZSB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvZmZcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZUFSSUEoaXNPbik7XG4gIH1cblxuICBfdG9nZ2xlQW5pbWF0ZSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uSW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQSh0cnVlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvbi56Zi50b2dnbGVyJyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uT3V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZUFSSUEoZmFsc2UpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfdXBkYXRlQVJJQShpc09uKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPbiA/IHRydWUgOiBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIFRvZ2dsZXIgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRvZ2dsZXInKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9nZ2xlci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRlbGxzIHRoZSBwbHVnaW4gaWYgdGhlIGVsZW1lbnQgc2hvdWxkIGFuaW1hdGVkIHdoZW4gdG9nZ2xlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYW5pbWF0ZTogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihUb2dnbGVyLCAnVG9nZ2xlcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogVG9vbHRpcCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24udG9vbHRpcFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb29sdGlwIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBUb29sdGlwLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvb2x0aXAjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIGEgdG9vbHRpcCB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvYmplY3QgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvb2x0aXAuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRvb2x0aXAgYnkgc2V0dGluZyB0aGUgY3JlYXRpbmcgdGhlIHRpcCBlbGVtZW50LCBhZGRpbmcgaXQncyB0ZXh0LCBzZXR0aW5nIHByaXZhdGUgdmFyaWFibGVzIGFuZCBzZXR0aW5nIGF0dHJpYnV0ZXMgb24gdGhlIGFuY2hvci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlbGVtSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICd0b29sdGlwJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzIHx8IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zLnRpcFRleHQgPSB0aGlzLm9wdGlvbnMudGlwVGV4dCB8fCB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZSA/ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKSA6IHRoaXMuX2J1aWxkVGVtcGxhdGUoZWxlbUlkKTtcblxuICAgIHRoaXMudGVtcGxhdGUuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcbiAgICAgICAgLnRleHQodGhpcy5vcHRpb25zLnRpcFRleHQpXG4gICAgICAgIC5oaWRlKCk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3RpdGxlJzogJycsXG4gICAgICAnYXJpYS1kZXNjcmliZWRieSc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXlldGktYm94JzogZWxlbUlkLFxuICAgICAgJ2RhdGEtdG9nZ2xlJzogZWxlbUlkLFxuICAgICAgJ2RhdGEtcmVzaXplJzogZWxlbUlkXG4gICAgfSkuYWRkQ2xhc3ModGhpcy50cmlnZ2VyQ2xhc3MpO1xuXG4gICAgLy9oZWxwZXIgdmFyaWFibGVzIHRvIHRyYWNrIG1vdmVtZW50IG9uIGNvbGxpc2lvbnNcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMgPSBbXTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHcmFicyB0aGUgY3VycmVudCBwb3NpdGlvbmluZyBjbGFzcywgaWYgcHJlc2VudCwgYW5kIHJldHVybnMgdGhlIHZhbHVlIG9yIGFuIGVtcHR5IHN0cmluZy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9nZXRQb3NpdGlvbkNsYXNzKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHsgcmV0dXJuICcnOyB9XG4gICAgLy8gdmFyIHBvc2l0aW9uID0gZWxlbWVudC5hdHRyKCdjbGFzcycpLm1hdGNoKC90b3B8bGVmdHxyaWdodC9nKTtcbiAgICB2YXIgcG9zaXRpb24gPSBlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvXFxiKHRvcHxsZWZ0fHJpZ2h0KVxcYi9nKTtcbiAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiA/IHBvc2l0aW9uWzBdIDogJyc7XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9O1xuICAvKipcbiAgICogYnVpbGRzIHRoZSB0b29sdGlwIGVsZW1lbnQsIGFkZHMgYXR0cmlidXRlcywgYW5kIHJldHVybnMgdGhlIHRlbXBsYXRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2J1aWxkVGVtcGxhdGUoaWQpIHtcbiAgICB2YXIgdGVtcGxhdGVDbGFzc2VzID0gKGAke3RoaXMub3B0aW9ucy50b29sdGlwQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnRlbXBsYXRlQ2xhc3Nlc31gKS50cmltKCk7XG4gICAgdmFyICR0ZW1wbGF0ZSA9ICAkKCc8ZGl2PjwvZGl2PicpLmFkZENsYXNzKHRlbXBsYXRlQ2xhc3NlcykuYXR0cih7XG4gICAgICAncm9sZSc6ICd0b29sdGlwJyxcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZSxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuICAgIHJldHVybiAkdGVtcGxhdGU7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gcG9zaXRpb25pbmcgY2xhc3MgdG8gdHJ5XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG5cbiAgICAvL2RlZmF1bHQsIHRyeSBzd2l0Y2hpbmcgdG8gb3Bwb3NpdGUgc2lkZVxuICAgIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCd0b3AnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1cblxuICAgIC8vaWYgZGVmYXVsdCBjaGFuZ2UgZGlkbid0IHdvcmssIHRyeSBib3R0b20gb3IgbGVmdCBmaXJzdFxuICAgIGVsc2UgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IHRydWU7XG4gICAgdGhpcy5jb3VudGVyLS07XG4gIH1cblxuICAvKipcbiAgICogc2V0cyB0aGUgcG9zaXRpb24gY2xhc3Mgb2YgYW4gZWxlbWVudCBhbmQgcmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIHVudGlsIHRoZXJlIGFyZSBubyBtb3JlIHBvc3NpYmxlIHBvc2l0aW9ucyB0byBhdHRlbXB0LCBvciB0aGUgdG9vbHRpcCBlbGVtZW50IGlzIG5vIGxvbmdlciBjb2xsaWRpbmcuXG4gICAqIGlmIHRoZSB0b29sdGlwIGlzIGxhcmdlciB0aGFuIHRoZSBzY3JlZW4gd2lkdGgsIGRlZmF1bHQgdG8gZnVsbCB3aWR0aCAtIGFueSB1c2VyIHNlbGVjdGVkIG1hcmdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFBvc2l0aW9uKCkge1xuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICR0aXBEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLnRlbXBsYXRlKSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGVsZW1lbnQpLFxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcbiAgICAgICAgcGFyYW0gPSAoZGlyZWN0aW9uID09PSAndG9wJykgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIG9mZnNldCA9IChwYXJhbSA9PT0gJ2hlaWdodCcpID8gdGhpcy5vcHRpb25zLnZPZmZzZXQgOiB0aGlzLm9wdGlvbnMuaE9mZnNldCxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCgkdGlwRGltcy53aWR0aCA+PSAkdGlwRGltcy53aW5kb3dEaW1zLndpZHRoKSB8fCAoIXRoaXMuY291bnRlciAmJiAhRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLnRlbXBsYXRlKSkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgLy8gdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgICAgJ3dpZHRoJzogJGFuY2hvckRpbXMud2luZG93RGltcy53aWR0aCAtICh0aGlzLm9wdGlvbnMuaE9mZnNldCAqIDIpLFxuICAgICAgICAnaGVpZ2h0JzogJ2F1dG8nXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsJ2NlbnRlciAnICsgKHBvc2l0aW9uIHx8ICdib3R0b20nKSwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLnRlbXBsYXRlKSAmJiB0aGlzLmNvdW50ZXIpIHtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogcmV2ZWFscyB0aGUgdG9vbHRpcCwgYW5kIGZpcmVzIGFuIGV2ZW50IHRvIGNsb3NlIGFueSBvdGhlciBvcGVuIHRvb2x0aXBzIG9uIHRoZSBwYWdlXG4gICAqIEBmaXJlcyBUb29sdGlwI2Nsb3NlbWVcbiAgICogQGZpcmVzIFRvb2x0aXAjc2hvd1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNob3coKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93T24gIT09ICdhbGwnICYmICFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuc2hvd09uKSkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcignVGhlIHNjcmVlbiBpcyB0b28gc21hbGwgdG8gZGlzcGxheSB0aGlzIHRvb2x0aXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLnNob3coKTtcbiAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgdG8gY2xvc2UgYWxsIG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICAgKiBAZXZlbnQgQ2xvc2VtZSN0b29sdGlwXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnRvb2x0aXAnLCB0aGlzLnRlbXBsYXRlLmF0dHIoJ2lkJykpO1xuXG5cbiAgICB0aGlzLnRlbXBsYXRlLmF0dHIoe1xuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogdHJ1ZSxcbiAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlXG4gICAgfSk7XG4gICAgX3RoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudGVtcGxhdGUpO1xuICAgIHRoaXMudGVtcGxhdGUuc3RvcCgpLmhpZGUoKS5jc3MoJ3Zpc2liaWxpdHknLCAnJykuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlSW5EdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAvL21heWJlIGRvIHN0dWZmP1xuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgc2hvd25cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyB0aGUgY3VycmVudCB0b29sdGlwLCBhbmQgcmVzZXRzIHRoZSBwb3NpdGlvbmluZyBjbGFzcyBpZiBpdCB3YXMgY2hhbmdlZCBkdWUgdG8gY29sbGlzaW9uXG4gICAqIEBmaXJlcyBUb29sdGlwI2hpZGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBoaWRlKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdoaWRpbmcnLCB0aGlzLiRlbGVtZW50LmRhdGEoJ3lldGktYm94JykpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2VcbiAgICB9KS5mYWRlT3V0KHRoaXMub3B0aW9ucy5mYWRlT3V0RHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgIGlmIChfdGhpcy5jbGFzc0NoYW5nZWQpIHtcbiAgICAgICAgX3RoaXMudGVtcGxhdGVcbiAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoX3RoaXMuX2dldFBvc2l0aW9uQ2xhc3MoX3RoaXMudGVtcGxhdGUpKVxuICAgICAgICAgICAgIC5hZGRDbGFzcyhfdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpO1xuXG4gICAgICAgX3RoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgICAgIF90aGlzLmNvdW50ZXIgPSA0O1xuICAgICAgIF90aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIGZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgaGlkZGVuXG4gICAgICogQGV2ZW50IFRvb2x0aXAjaGlkZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi50b29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogYWRkcyBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSB0b29sdGlwIGFuZCBpdHMgYW5jaG9yXG4gICAqIFRPRE8gY29tYmluZSBzb21lIG9mIHRoZSBsaXN0ZW5lcnMgbGlrZSBmb2N1cyBhbmQgbW91c2VlbnRlciwgZXRjLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlO1xuICAgIHZhciBpc0ZvY3VzID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcblxuICAgICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICghX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWxlYXZlLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgaWYgKCFpc0ZvY3VzIHx8IChfdGhpcy5pc0NsaWNrICYmICFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikpIHtcbiAgICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvL190aGlzLmhpZGUoKTtcbiAgICAgICAgICAvLyBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICAgICAgaWYgKChfdGhpcy5vcHRpb25zLmRpc2FibGVIb3ZlciB8fCAhX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKSkgJiYgIV90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBfdGhpcy5zaG93KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUZvclRvdWNoKSB7XG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ3RhcC56Zi50b29sdGlwIHRvdWNoZW5kLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIF90aGlzLmlzQWN0aXZlID8gX3RoaXMuaGlkZSgpIDogX3RoaXMuc2hvdygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAvLyAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgLy8gJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdmb2N1cy56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvLyBJZiB3ZSdyZSBub3Qgc2hvd2luZyBvcGVuIG9uIGNsaWNrcywgd2UgbmVlZCB0byBwcmV0ZW5kIGEgY2xpY2stbGF1bmNoZWQgZm9jdXMgaXNuJ3RcbiAgICAgICAgICAvLyBhIHJlYWwgZm9jdXMsIG90aGVyd2lzZSBvbiBob3ZlciBhbmQgY29tZSBiYWNrIHdlIGdldCBiYWQgYmVoYXZpb3JcbiAgICAgICAgICBpZighX3RoaXMub3B0aW9ucy5jbGlja09wZW4pIHsgaXNGb2N1cyA9IGZhbHNlOyB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLm9uKCdmb2N1c291dC56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaGlkZSgpO1xuICAgICAgfSlcblxuICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGEgdG9nZ2xlIG1ldGhvZCwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YXRpYyBzaG93KCkgJiBoaWRlKCkgZnVuY3Rpb25zXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmhpZGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIHRvb2x0aXAsIHJlbW92ZXMgdGVtcGxhdGUgZWxlbWVudCBmcm9tIHRoZSB2aWV3LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScsIHRoaXMudGVtcGxhdGUudGV4dCgpKVxuICAgICAgICAgICAgICAgICAub2ZmKCcuemYudHJpZ2dlciAuemYudG9vdGlwJylcbiAgICAgICAgICAgICAgICAvLyAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS15ZXRpLWJveCcpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvZ2dsZScpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXJlc2l6ZScpO1xuXG4gICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmUoKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub29sdGlwLmRlZmF1bHRzID0ge1xuICBkaXNhYmxlRm9yVG91Y2g6IGZhbHNlLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGJlZm9yZSBhIHRvb2x0aXAgc2hvdWxkIG9wZW4gb24gaG92ZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjAwXG4gICAqL1xuICBob3ZlckRlbGF5OiAyMDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgaW50byB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDE1MFxuICAgKi9cbiAgZmFkZUluRHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBvdXQgb2Ygdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxNTBcbiAgICovXG4gIGZhZGVPdXREdXJhdGlvbjogMTUwLFxuICAvKipcbiAgICogRGlzYWJsZXMgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyB0aGUgdG9vbHRpcCBpZiBzZXQgdG8gdHJ1ZVxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlSG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogT3B0aW9uYWwgYWRkdGlvbmFsIGNsYXNzZXMgdG8gYXBwbHkgdG8gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gaW5pdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbXktY29vbC10aXAtY2xhc3MnXG4gICAqL1xuICB0ZW1wbGF0ZUNsYXNzZXM6ICcnLFxuICAvKipcbiAgICogTm9uLW9wdGlvbmFsIGNsYXNzIGFkZGVkIHRvIHRvb2x0aXAgdGVtcGxhdGVzLiBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgJ3Rvb2x0aXAnLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b29sdGlwJ1xuICAgKi9cbiAgdG9vbHRpcENsYXNzOiAndG9vbHRpcCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSB0b29sdGlwIGFuY2hvciBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdoYXMtdGlwJ1xuICAgKi9cbiAgdHJpZ2dlckNsYXNzOiAnaGFzLXRpcCcsXG4gIC8qKlxuICAgKiBNaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSBhdCB3aGljaCB0byBvcGVuIHRoZSB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbWFsbCdcbiAgICovXG4gIHNob3dPbjogJ3NtYWxsJyxcbiAgLyoqXG4gICAqIEN1c3RvbSB0ZW1wbGF0ZSB0byBiZSB1c2VkIHRvIGdlbmVyYXRlIG1hcmt1cCBmb3IgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnJmx0O2RpdiBjbGFzcz1cInRvb2x0aXBcIiZndDsmbHQ7L2RpdiZndDsnXG4gICAqL1xuICB0ZW1wbGF0ZTogJycsXG4gIC8qKlxuICAgKiBUZXh0IGRpc3BsYXllZCBpbiB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdTb21lIGNvb2wgc3BhY2UgZmFjdCBoZXJlLidcbiAgICovXG4gIHRpcFRleHQ6ICcnLFxuICB0b3VjaENsb3NlVGV4dDogJ1RhcCB0byBjbG9zZS4nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0b29sdGlwIHRvIHJlbWFpbiBvcGVuIGlmIHRyaWdnZXJlZCB3aXRoIGEgY2xpY2sgb3IgdG91Y2ggZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiB0cnVlLFxuICAvKipcbiAgICogQWRkaXRpb25hbCBwb3NpdGlvbmluZyBjbGFzc2VzLCBzZXQgYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBZIGF4aXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIHZPZmZzZXQ6IDEwLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBYIGF4aXMsIGlmIGFsaWduZWQgdG8gYSBzaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEyXG4gICAqL1xuICBoT2Zmc2V0OiAxMlxufTtcblxuLyoqXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcbiAqL1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9vbHRpcCwgJ1Rvb2x0aXAnKTtcblxufShqUXVlcnkpOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93KVxuICAgIERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxufSkoKTtcblxudmFyIGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbnZhciBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuLy8gRmluZCB0aGUgcmlnaHQgXCJ0cmFuc2l0aW9uZW5kXCIgZXZlbnQgZm9yIHRoaXMgYnJvd3NlclxudmFyIGVuZEV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICB9XG4gIHZhciBlbGVtID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJhbnNpdGlvbnNbdF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59KSgpO1xuXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIGlmIChlbmRFdmVudCA9PT0gbnVsbCkge1xuICAgIGlzSW4gPyBlbGVtZW50LnNob3coKSA6IGVsZW1lbnQuaGlkZSgpO1xuICAgIGNiKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcbiAgZWxlbWVudC5hZGRDbGFzcyhhbmltYXRpb24pO1xuICBlbGVtZW50LmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJycpO1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoJ3RyYW5zaXRpb25lbmQnLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGluaXRDbGFzcyArICcgJyArIGFjdGl2ZUNsYXNzICsgJyAnICsgYW5pbWF0aW9uKTtcbiAgfVxufVxuXG52YXIgTW90aW9uVUkgPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG4iLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcbmpRdWVyeSggJ2lmcmFtZVtzcmMqPVwidmltZW8uY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbiB2aW1lbycvPlwiKTtcbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLy8gSm95cmlkZSBkZW1vXG4kKCcjc3RhcnQtanInKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgJChkb2N1bWVudCkuZm91bmRhdGlvbignam95cmlkZScsJ3N0YXJ0Jyk7XG59KTsiLCJqUXVlcnkoZnVuY3Rpb24oJCl7XG5cdEZvdW5kYXRpb24ucmVJbml0KCdlcXVhbGl6ZXInKTtcbiAgICBpZiAoJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInKS5sZW5ndGgpIHsgLy9hcmUgd2UgZXZlbiBvbiBhIHBhZ2Ugd2l0aCBpbmZpbml0ZSBzY3JvbGw/XG4gICAgICAgIC8vaGlkZSBleGlzdGluZyBwYWdlclxuICAgICAgICAkKFwiLnBhZ2luYXRpb24tY2VudGVyZWRcIikuaGlkZSgpO1xuICAgICAgICAkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwibG9hZC1tb3JlXCI+PC9zcGFuPicgKTtcbiAgICAgICAgLy8kKCAnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInICkuZm91bmRhdGlvbigpOyAvL2luaXRpYWxpemUgZXF1YWxpemVyIHRoZSBmaXJzdCB0aW1lXG5cbiAgICAgICAgLy9SZWluaXRpYWxpemUgZXF1YWxpemVyIG9uIGV2ZXJ5IGFqYXggY2FsbFxuICAgICAgICAkKCBkb2N1bWVudCApLmFqYXhDb21wbGV0ZSggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3VuZGF0aW9uLnJlSW5pdCgnZXF1YWxpemVyJyk7IC8vaHR0cDovL2ZvdW5kYXRpb24uenVyYi5jb20vZm9ydW0vcG9zdHMvMzkzNjMtcmVmbG93LWVxdWFsaXNlclxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYnV0dG9uID0gJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXIgLmxvYWQtbW9yZScpO1xuICAgICAgICB2YXIgcGFnZSA9IDI7XG4gICAgICAgIHZhciBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHZhciBhbGxEb25lID0gZmFsc2U7XG4gICAgICAgIHZhciBzY3JvbGxIYW5kbGluZyA9IHtcbiAgICAgICAgICAgIGFsbG93OiB0cnVlLFxuICAgICAgICAgICAgcmVhbGxvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGF5OiA0MDAgLy8obWlsbGlzZWNvbmRzKSBhZGp1c3QgdG8gdGhlIGhpZ2hlc3QgYWNjZXB0YWJsZSB2YWx1ZVxuICAgICAgICB9O1xuXG4gICAgICAgICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKCAhIGxvYWRpbmcgJiYgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBhbGxEb25lICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNjcm9sbEhhbmRsaW5nLmFsbG93ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChzY3JvbGxIYW5kbGluZy5yZWFsbG93LCBzY3JvbGxIYW5kbGluZy5kZWxheSk7XG4gICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9ICQoYnV0dG9uKS5vZmZzZXQoKS50b3AgLSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgaWYoIDQwMDAgPiBvZmZzZXQgKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2JlX2FqYXhfbG9hZF9tb3JlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmNlOiBiZWxvYWRtb3JlLm5vbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZTogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiBiZWxvYWRtb3JlLnF1ZXJ5LFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAkLnBvc3QoYmVsb2FkbW9yZS51cmwsIGRhdGEsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIHJlcy5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIHJlcy5kYXRhICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIGJ1dHRvbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2UgPSBwYWdlICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoICFyZXMuZGF0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVx0XG59KTsiLCIvL0dlbmVyYWwgc2l0ZS13aWRlIHNjcmlwdHMgZm9yIE1TUCBGbHkgTWFnXG5cbiQoJy5tY19pbnB1dCcpLmF0dHIoXCJwbGFjZWhvbGRlclwiLCBcIkVudGVyIHlvdXIgZW1haWwgYWRkcmVzc1wiKTtcblxuLy9pZih3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKFwiI21jX3NpZ251cFwiKSA+IC0xKSB7XG4vL1x0c2V0VGltZW91dChmdW5jdGlvbigpeyBcbi8vXHRcdHZhciBzaGFyZUNvbnRhaW5lciA9ICQoJyNzaGFyZS1mb2xsb3cnKTtcbi8vXHRcdHZhciBzaGFyZVBvc2l0aW9uID0gc2hhcmVDb250YWluZXIub2Zmc2V0KCkudG9wO1xuLy9cdFx0JChcImh0bWwsIGJvZHlcIikuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2hhcmVQb3NpdGlvbi00MH0sIDUwMCk7XG4vL1x0IH0sIDUwMCk7XG4vL31cblxuLy9IaWRlIG1vYmlsZSB0b3BiYXIgbG9nbyB1bnRpbCB3ZSBzY3JvbGwgZG93biBwYWdlXG4kKCB3aW5kb3cgKS5zY3JvbGwoZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCQoJy50aXRsZS1iYXItdGl0bGUnKS5vZmZzZXQoKS50b3ApO1xuICBpZiAoICQoJy50aXRsZS1iYXItdGl0bGUnKS5vZmZzZXQoKS50b3AgPiAxNDgpIHtcbiAgICAkKCcuaG9tZSAubW9iaWxlLWxvZ28nKS5yZW1vdmVDbGFzcygnaGlkZScpO1xuICB9IGVsc2Uge1xuICAgICQoJy5ob21lIC5tb2JpbGUtbG9nbycpLmFkZENsYXNzKCdoaWRlJyk7XG4gIH1cbn0pOyIsIiIsIiQoJy5waG90by1jYXJvdXNlbC1zbGlkZXMnKS5zbGljayh7XG4gIHNsaWRlOiAnbGknLFxuICBzbGlkZXNUb1Nob3c6IDEsXG4gIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICBhcnJvd3M6IGZhbHNlLFxuICBmYWRlOiB0cnVlLFxuICBhc05hdkZvcjogJy5waG90by1jYXJvdXNlbC1jb250cm9scydcbn0pO1xuXG4kKCcucGhvdG8tY2Fyb3VzZWwtY29udHJvbHMnKS5zbGljayh7XG4gIHNsaWRlOiAnbGknLFxuICBzbGlkZXNUb1Nob3c6IDcsXG4gIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICBhc05hdkZvcjogJy5waG90by1jYXJvdXNlbC1zbGlkZXMnLFxuICBhcnJvd3M6IGZhbHNlLFxuICBkb3RzOiBmYWxzZSxcbiAgY2VudGVyTW9kZTogZmFsc2UsXG4gIGZvY3VzT25TZWxlY3Q6IHRydWVcbn0pOyIsIlxuJCh3aW5kb3cpLmJpbmQoJyBsb2FkIHJlc2l6ZSBvcmllbnRhdGlvbkNoYW5nZSAnLCBmdW5jdGlvbiAoKSB7XG4gICB2YXIgZm9vdGVyID0gJChcIiNmb290ZXItY29udGFpbmVyXCIpO1xuICAgdmFyIHBvcyA9IGZvb3Rlci5wb3NpdGlvbigpO1xuICAgdmFyIGhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgIGhlaWdodCA9IGhlaWdodCAtIHBvcy50b3A7XG4gICBoZWlnaHQgPSBoZWlnaHQgLSBmb290ZXIuaGVpZ2h0KCkgLTE7XG5cbiAgIGZ1bmN0aW9uIHN0aWNreUZvb3RlcigpIHtcbiAgICAgZm9vdGVyLmNzcyh7XG4gICAgICAgICAnbWFyZ2luLXRvcCc6IGhlaWdodCArICdweCdcbiAgICAgfSk7XG4gICB9XG5cbiAgIGlmIChoZWlnaHQgPiAwKSB7XG4gICAgIHN0aWNreUZvb3RlcigpO1xuICAgfVxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
