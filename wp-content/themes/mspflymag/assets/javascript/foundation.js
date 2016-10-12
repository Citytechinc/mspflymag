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

//Hide mobile topbar logo until we scroll down page
if ($('.home').length) {
	$(window).scroll(function () {
		if ($(this).scrollTop() > 148) {
			$('.title-bar-title').fadeIn();
		} else {
			$('.title-bar-title').fadeOut();
		}
	});
}
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
;'use strict';

$(document).ready(function () {

	//Check to see if the window is top if not then display button
	$(window).scroll(function () {
		if ($(this).scrollTop() > 800) {
			$('#scroll-to-top').fadeIn();
		} else {
			$('#scroll-to-top').fadeOut();
		}
	});

	//Click event to scroll to top
	$('#scroll-to-top').click(function () {
		$('html, body').animate({ scrollTop: 0 }, 800);
		return false;
	});
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uZXF1YWxpemVyLmpzIiwiZm91bmRhdGlvbi5pbnRlcmNoYW5nZS5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnUuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGUuanMiLCJmb3VuZGF0aW9uLnJldmVhbC5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsIm9maS5icm93c2VyLmpzIiwianF1ZXJ5LnZhbGlkYXRlLm1pbi5qcyIsImZsZXgtdmlkZW8uanMiLCJpbml0LWZvdW5kYXRpb24uanMiLCJpbnN0YW50LWNvbW1lbnQtdmFsaWRhdGlvbi5qcyIsImxvYWQtbW9yZS5qcyIsIm1zcGZseS5qcyIsInBob3RvLWNhcm91c2VsLmpzIiwic2Nyb2xsLXRvLXRvcC5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJ3aGF0SW5wdXQiLCJhY3RpdmVLZXlzIiwiYm9keSIsImJ1ZmZlciIsImN1cnJlbnRJbnB1dCIsIm5vblR5cGluZ0lucHV0cyIsIm1vdXNlV2hlZWwiLCJkZXRlY3RXaGVlbCIsImlnbm9yZU1hcCIsImlucHV0TWFwIiwiaW5wdXRUeXBlcyIsImtleU1hcCIsInBvaW50ZXJNYXAiLCJ0aW1lciIsImV2ZW50QnVmZmVyIiwiY2xlYXJUaW1lciIsInNldElucHV0IiwiZXZlbnQiLCJzZXRUaW1lb3V0IiwiYnVmZmVyZWRFdmVudCIsInVuQnVmZmVyZWRFdmVudCIsImNsZWFyVGltZW91dCIsImV2ZW50S2V5Iiwia2V5IiwidmFsdWUiLCJ0eXBlIiwicG9pbnRlclR5cGUiLCJldmVudFRhcmdldCIsInRhcmdldCIsImV2ZW50VGFyZ2V0Tm9kZSIsIm5vZGVOYW1lIiwidG9Mb3dlckNhc2UiLCJldmVudFRhcmdldFR5cGUiLCJnZXRBdHRyaWJ1dGUiLCJoYXNBdHRyaWJ1dGUiLCJpbmRleE9mIiwic3dpdGNoSW5wdXQiLCJsb2dLZXlzIiwic3RyaW5nIiwic2V0QXR0cmlidXRlIiwicHVzaCIsImtleUNvZGUiLCJ3aGljaCIsInNyY0VsZW1lbnQiLCJ1bkxvZ0tleXMiLCJhcnJheVBvcyIsInNwbGljZSIsImJpbmRFdmVudHMiLCJkb2N1bWVudCIsIlBvaW50ZXJFdmVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJNU1BvaW50ZXJFdmVudCIsImNyZWF0ZUVsZW1lbnQiLCJvbm1vdXNld2hlZWwiLCJ1bmRlZmluZWQiLCJBcnJheSIsInByb3RvdHlwZSIsImFzayIsImtleXMiLCJ0eXBlcyIsInNldCIsIiQiLCJGT1VOREFUSU9OX1ZFUlNJT04iLCJGb3VuZGF0aW9uIiwidmVyc2lvbiIsIl9wbHVnaW5zIiwiX3V1aWRzIiwicnRsIiwiYXR0ciIsInBsdWdpbiIsIm5hbWUiLCJjbGFzc05hbWUiLCJmdW5jdGlvbk5hbWUiLCJhdHRyTmFtZSIsImh5cGhlbmF0ZSIsInJlZ2lzdGVyUGx1Z2luIiwicGx1Z2luTmFtZSIsImNvbnN0cnVjdG9yIiwidXVpZCIsIkdldFlvRGlnaXRzIiwiJGVsZW1lbnQiLCJkYXRhIiwidHJpZ2dlciIsInVucmVnaXN0ZXJQbHVnaW4iLCJyZW1vdmVBdHRyIiwicmVtb3ZlRGF0YSIsInByb3AiLCJyZUluaXQiLCJwbHVnaW5zIiwiaXNKUSIsImVhY2giLCJfaW5pdCIsIl90aGlzIiwiZm5zIiwicGxncyIsImZvckVhY2giLCJwIiwiZm91bmRhdGlvbiIsIk9iamVjdCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsImxlbmd0aCIsIm5hbWVzcGFjZSIsIk1hdGgiLCJyb3VuZCIsInBvdyIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJyZWZsb3ciLCJlbGVtIiwiaSIsIiRlbGVtIiwiZmluZCIsImFkZEJhY2siLCIkZWwiLCJvcHRzIiwid2FybiIsInRoaW5nIiwic3BsaXQiLCJlIiwib3B0IiwibWFwIiwiZWwiLCJ0cmltIiwicGFyc2VWYWx1ZSIsImVyIiwiZ2V0Rm5OYW1lIiwidHJhbnNpdGlvbmVuZCIsInRyYW5zaXRpb25zIiwiZW5kIiwidCIsInN0eWxlIiwidHJpZ2dlckhhbmRsZXIiLCJ1dGlsIiwidGhyb3R0bGUiLCJmdW5jIiwiZGVsYXkiLCJjb250ZXh0IiwiYXJncyIsImFyZ3VtZW50cyIsImFwcGx5IiwibWV0aG9kIiwiJG1ldGEiLCIkbm9KUyIsImFwcGVuZFRvIiwiaGVhZCIsInJlbW92ZUNsYXNzIiwiTWVkaWFRdWVyeSIsImNhbGwiLCJwbHVnQ2xhc3MiLCJSZWZlcmVuY2VFcnJvciIsIlR5cGVFcnJvciIsImZuIiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJ2ZW5kb3JzIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwidnAiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInRlc3QiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJsYXN0VGltZSIsImNhbGxiYWNrIiwibmV4dFRpbWUiLCJtYXgiLCJwZXJmb3JtYW5jZSIsInN0YXJ0IiwiRnVuY3Rpb24iLCJiaW5kIiwib1RoaXMiLCJhQXJncyIsImZUb0JpbmQiLCJmTk9QIiwiZkJvdW5kIiwiY29uY2F0IiwiZnVuY05hbWVSZWdleCIsInJlc3VsdHMiLCJleGVjIiwic3RyIiwiaXNOYU4iLCJwYXJzZUZsb2F0IiwicmVwbGFjZSIsImpRdWVyeSIsIkJveCIsIkltTm90VG91Y2hpbmdZb3UiLCJHZXREaW1lbnNpb25zIiwiR2V0T2Zmc2V0cyIsImVsZW1lbnQiLCJwYXJlbnQiLCJsck9ubHkiLCJ0Yk9ubHkiLCJlbGVEaW1zIiwidG9wIiwiYm90dG9tIiwibGVmdCIsInJpZ2h0IiwicGFyRGltcyIsIm9mZnNldCIsImhlaWdodCIsIndpZHRoIiwid2luZG93RGltcyIsImFsbERpcnMiLCJFcnJvciIsInJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJwYXJSZWN0IiwicGFyZW50Tm9kZSIsIndpblJlY3QiLCJ3aW5ZIiwicGFnZVlPZmZzZXQiLCJ3aW5YIiwicGFnZVhPZmZzZXQiLCJwYXJlbnREaW1zIiwiYW5jaG9yIiwicG9zaXRpb24iLCJ2T2Zmc2V0IiwiaE9mZnNldCIsImlzT3ZlcmZsb3ciLCIkZWxlRGltcyIsIiRhbmNob3JEaW1zIiwia2V5Q29kZXMiLCJjb21tYW5kcyIsIktleWJvYXJkIiwiZ2V0S2V5Q29kZXMiLCJwYXJzZUtleSIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvVXBwZXJDYXNlIiwic2hpZnRLZXkiLCJjdHJsS2V5IiwiYWx0S2V5IiwiaGFuZGxlS2V5IiwiY29tcG9uZW50IiwiZnVuY3Rpb25zIiwiY29tbWFuZExpc3QiLCJjbWRzIiwiY29tbWFuZCIsImx0ciIsImV4dGVuZCIsInJldHVyblZhbHVlIiwiaGFuZGxlZCIsInVuaGFuZGxlZCIsImZpbmRGb2N1c2FibGUiLCJmaWx0ZXIiLCJpcyIsInJlZ2lzdGVyIiwiY29tcG9uZW50TmFtZSIsImtjcyIsImsiLCJrYyIsImRlZmF1bHRRdWVyaWVzIiwibGFuZHNjYXBlIiwicG9ydHJhaXQiLCJyZXRpbmEiLCJxdWVyaWVzIiwiY3VycmVudCIsInNlbGYiLCJleHRyYWN0ZWRTdHlsZXMiLCJjc3MiLCJuYW1lZFF1ZXJpZXMiLCJwYXJzZVN0eWxlVG9PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsIl9nZXRDdXJyZW50U2l6ZSIsIl93YXRjaGVyIiwiYXRMZWFzdCIsInNpemUiLCJxdWVyeSIsImdldCIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwibWF0Y2hlZCIsIm9uIiwibmV3U2l6ZSIsImN1cnJlbnRTaXplIiwic3R5bGVNZWRpYSIsIm1lZGlhIiwic2NyaXB0IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJpbmZvIiwiaWQiLCJpbnNlcnRCZWZvcmUiLCJnZXRDb21wdXRlZFN0eWxlIiwiY3VycmVudFN0eWxlIiwibWF0Y2hNZWRpdW0iLCJ0ZXh0Iiwic3R5bGVTaGVldCIsImNzc1RleHQiLCJ0ZXh0Q29udGVudCIsInN0eWxlT2JqZWN0IiwicmVkdWNlIiwicmV0IiwicGFyYW0iLCJwYXJ0cyIsInZhbCIsImRlY29kZVVSSUNvbXBvbmVudCIsImlzQXJyYXkiLCJpbml0Q2xhc3NlcyIsImFjdGl2ZUNsYXNzZXMiLCJNb3Rpb24iLCJhbmltYXRlSW4iLCJhbmltYXRpb24iLCJjYiIsImFuaW1hdGUiLCJhbmltYXRlT3V0IiwiTW92ZSIsImR1cmF0aW9uIiwiYW5pbSIsInByb2ciLCJtb3ZlIiwidHMiLCJpc0luIiwiZXEiLCJpbml0Q2xhc3MiLCJhY3RpdmVDbGFzcyIsInJlc2V0IiwiYWRkQ2xhc3MiLCJzaG93Iiwib2Zmc2V0V2lkdGgiLCJvbmUiLCJmaW5pc2giLCJoaWRlIiwidHJhbnNpdGlvbkR1cmF0aW9uIiwiTmVzdCIsIkZlYXRoZXIiLCJtZW51IiwiaXRlbXMiLCJzdWJNZW51Q2xhc3MiLCJzdWJJdGVtQ2xhc3MiLCJoYXNTdWJDbGFzcyIsIiRpdGVtIiwiJHN1YiIsImNoaWxkcmVuIiwiQnVybiIsIlRpbWVyIiwib3B0aW9ucyIsIm5hbWVTcGFjZSIsInJlbWFpbiIsImlzUGF1c2VkIiwicmVzdGFydCIsImluZmluaXRlIiwicGF1c2UiLCJvbkltYWdlc0xvYWRlZCIsImltYWdlcyIsInVubG9hZGVkIiwiY29tcGxldGUiLCJzaW5nbGVJbWFnZUxvYWRlZCIsIm5hdHVyYWxXaWR0aCIsInNwb3RTd2lwZSIsImVuYWJsZWQiLCJkb2N1bWVudEVsZW1lbnQiLCJwcmV2ZW50RGVmYXVsdCIsIm1vdmVUaHJlc2hvbGQiLCJ0aW1lVGhyZXNob2xkIiwic3RhcnRQb3NYIiwic3RhcnRQb3NZIiwic3RhcnRUaW1lIiwiZWxhcHNlZFRpbWUiLCJpc01vdmluZyIsIm9uVG91Y2hFbmQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib25Ub3VjaE1vdmUiLCJ4IiwidG91Y2hlcyIsInBhZ2VYIiwieSIsInBhZ2VZIiwiZHgiLCJkeSIsImRpciIsImFicyIsIm9uVG91Y2hTdGFydCIsImluaXQiLCJ0ZWFyZG93biIsInNwZWNpYWwiLCJzd2lwZSIsInNldHVwIiwibm9vcCIsImFkZFRvdWNoIiwiaGFuZGxlVG91Y2giLCJjaGFuZ2VkVG91Y2hlcyIsImZpcnN0IiwiZXZlbnRUeXBlcyIsInRvdWNoc3RhcnQiLCJ0b3VjaG1vdmUiLCJ0b3VjaGVuZCIsInNpbXVsYXRlZEV2ZW50IiwiTW91c2VFdmVudCIsInNjcmVlblgiLCJzY3JlZW5ZIiwiY2xpZW50WCIsImNsaWVudFkiLCJjcmVhdGVFdmVudCIsImluaXRNb3VzZUV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJwcmVmaXhlcyIsInRyaWdnZXJzIiwic3RvcFByb3BhZ2F0aW9uIiwiZmFkZU91dCIsImxvYWQiLCJjaGVja0xpc3RlbmVycyIsImV2ZW50c0xpc3RlbmVyIiwicmVzaXplTGlzdGVuZXIiLCJzY3JvbGxMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJvZmYiLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiZWxlbWVudE9ic2VydmVyIiwib2JzZXJ2ZSIsImF0dHJpYnV0ZXMiLCJjaGlsZExpc3QiLCJjaGFyYWN0ZXJEYXRhIiwic3VidHJlZSIsImF0dHJpYnV0ZUZpbHRlciIsIklIZWFyWW91IiwiRXF1YWxpemVyIiwiZGVmYXVsdHMiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsInBhcmVudHNVbnRpbCIsImlzT24iLCJfYmluZEhhbmRsZXIiLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9ldmVudHMiLCJfcmVmbG93IiwiX3BhdXNlRXZlbnRzIiwiZXF1YWxpemVPblN0YWNrIiwiX2lzU3RhY2tlZCIsImVxdWFsaXplQnlSb3ciLCJnZXRIZWlnaHRzQnlSb3ciLCJhcHBseUhlaWdodEJ5Um93IiwiZ2V0SGVpZ2h0cyIsImFwcGx5SGVpZ2h0IiwiaGVpZ2h0cyIsImxlbiIsIm9mZnNldEhlaWdodCIsImxhc3RFbFRvcE9mZnNldCIsImdyb3VwcyIsImdyb3VwIiwiZWxPZmZzZXRUb3AiLCJqIiwibG4iLCJncm91cHNJTGVuZ3RoIiwibGVuSiIsIkludGVyY2hhbmdlIiwicnVsZXMiLCJjdXJyZW50UGF0aCIsIl9hZGRCcmVha3BvaW50cyIsIl9nZW5lcmF0ZVJ1bGVzIiwibWF0Y2giLCJydWxlIiwicGF0aCIsIlNQRUNJQUxfUVVFUklFUyIsInJ1bGVzTGlzdCIsInJlc3BvbnNlIiwiaHRtbCIsIlJlc3BvbnNpdmVNZW51IiwiY3VycmVudE1xIiwiY3VycmVudFBsdWdpbiIsInJ1bGVzVHJlZSIsInJ1bGVTaXplIiwicnVsZVBsdWdpbiIsIk1lbnVQbHVnaW5zIiwiaXNFbXB0eU9iamVjdCIsIl9jaGVja01lZGlhUXVlcmllcyIsIm1hdGNoZWRNcSIsImNzc0NsYXNzIiwiZGVzdHJveSIsImRyb3Bkb3duIiwiZHJpbGxkb3duIiwiYWNjb3JkaW9uIiwiUmVzcG9uc2l2ZVRvZ2dsZSIsInRhcmdldElEIiwiJHRhcmdldE1lbnUiLCIkdG9nZ2xlciIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJ0b2dnbGUiLCJSZXZlYWwiLCJpc0FjdGl2ZSIsImNhY2hlZCIsIm1xIiwiaXNNb2JpbGUiLCJtb2JpbGVTbmlmZiIsIiRhbmNob3IiLCJmdWxsU2NyZWVuIiwiaGFzQ2xhc3MiLCJvdmVybGF5IiwiJG92ZXJsYXkiLCJfbWFrZU92ZXJsYXkiLCJkZXRhY2giLCJkZWVwTGluayIsImxvY2F0aW9uIiwiaGFzaCIsIm9wZW4iLCJvdXRlcldpZHRoIiwib3V0ZXJIZWlnaHQiLCJwYXJzZUludCIsIm1pbiIsIm1hcmdpbiIsInBhcmVudHMiLCJjbG9zZSIsIl91cGRhdGVQb3NpdGlvbiIsImNsb3NlT25DbGljayIsImNvbnRhaW5zIiwiX2hhbmRsZVN0YXRlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInNjcm9sbFRvcCIsIm11bHRpcGxlT3BlbmVkIiwiYW5pbWF0aW9uSW4iLCJhZnRlckFuaW1hdGlvbkZvY3VzIiwiZm9jdXMiLCJsb2ciLCJmb2N1c2FibGVFbGVtZW50cyIsInNob3dEZWxheSIsIm9yaWdpbmFsU2Nyb2xsUG9zIiwiX2V4dHJhSGFuZGxlcnMiLCJjbG9zZU9uRXNjIiwidGFiX2ZvcndhcmQiLCJ0YWJfYmFja3dhcmQiLCJhbmltYXRpb25PdXQiLCJmaW5pc2hVcCIsImhpZGVEZWxheSIsInJlc2V0T25DbG9zZSIsInJlcGxhY2VTdGF0ZSIsInRpdGxlIiwicGF0aG5hbWUiLCJyZW1vdmUiLCJidG1PZmZzZXRQY3QiLCJpUGhvbmVTbmlmZiIsImFuZHJvaWRTbmlmZiIsIlRvZ2dsZXIiLCJpbnB1dCIsInRvZ2dsZUNsYXNzIiwiX3VwZGF0ZUFSSUEiLCJvYmplY3RGaXRJbWFnZXMiLCJuIiwiciIsImZvbnRGYW1pbHkiLCJvIiwiY3VycmVudFNyYyIsInNyYyIsInNyY3NldCIsImEiLCJzIiwiYmFja2dyb3VuZEltYWdlIiwiYmFja2dyb3VuZFBvc2l0aW9uIiwiYmFja2dyb3VuZFJlcGVhdCIsImJhY2tncm91bmRTaXplIiwiSW1hZ2UiLCJuYXR1cmFsSGVpZ2h0IiwiZGVmaW5lUHJvcGVydHkiLCJjIiwiZiIsInUiLCJ0YWdOYW1lIiwid2F0Y2hNUSIsImRlZmluZSIsImFtZCIsIm1vZHVsZSIsImV4cG9ydHMiLCJyZXF1aXJlIiwidmFsaWRhdGUiLCJiIiwiZGVidWciLCJ2YWxpZGF0b3IiLCJzZXR0aW5ncyIsIm9uc3VibWl0Iiwic3VibWl0SGFuZGxlciIsInN1Ym1pdEJ1dHRvbiIsImNhbmNlbFN1Ym1pdCIsImQiLCJjdXJyZW50Rm9ybSIsImZvcm0iLCJwZW5kaW5nUmVxdWVzdCIsImZvcm1TdWJtaXR0ZWQiLCJmb2N1c0ludmFsaWQiLCJ2YWxpZCIsImVycm9yTGlzdCIsImciLCJoIiwic3RhdGljUnVsZXMiLCJub3JtYWxpemVSdWxlIiwibWVzc2FnZXMiLCJub3JtYWxpemVSdWxlcyIsImNsYXNzUnVsZXMiLCJhdHRyaWJ1dGVSdWxlcyIsImRhdGFSdWxlcyIsInJlcXVpcmVkIiwicmVtb3RlIiwiZXhwciIsImJsYW5rIiwiZmlsbGVkIiwidW5jaGVja2VkIiwiZm9ybWF0IiwibWFrZUFycmF5IiwidW5zaGlmdCIsIlJlZ0V4cCIsImVycm9yQ2xhc3MiLCJwZW5kaW5nQ2xhc3MiLCJ2YWxpZENsYXNzIiwiZXJyb3JFbGVtZW50IiwiZm9jdXNDbGVhbnVwIiwiZXJyb3JDb250YWluZXIiLCJlcnJvckxhYmVsQ29udGFpbmVyIiwiaWdub3JlIiwiaWdub3JlVGl0bGUiLCJvbmZvY3VzaW4iLCJsYXN0QWN0aXZlIiwidW5oaWdobGlnaHQiLCJoaWRlVGhlc2UiLCJlcnJvcnNGb3IiLCJvbmZvY3Vzb3V0IiwiY2hlY2thYmxlIiwic3VibWl0dGVkIiwib3B0aW9uYWwiLCJvbmtleXVwIiwiZWxlbWVudFZhbHVlIiwiaW5BcnJheSIsImludmFsaWQiLCJvbmNsaWNrIiwiaGlnaGxpZ2h0IiwiZmluZEJ5TmFtZSIsInNldERlZmF1bHRzIiwiZW1haWwiLCJ1cmwiLCJkYXRlIiwiZGF0ZUlTTyIsIm51bWJlciIsImRpZ2l0cyIsImVxdWFsVG8iLCJtYXhsZW5ndGgiLCJtaW5sZW5ndGgiLCJyYW5nZWxlbmd0aCIsInJhbmdlIiwic3RlcCIsImF1dG9DcmVhdGVSYW5nZXMiLCJjbG9zZXN0IiwibGFiZWxDb250YWluZXIiLCJlcnJvckNvbnRleHQiLCJjb250YWluZXJzIiwiYWRkIiwidmFsdWVDYWNoZSIsInBlbmRpbmciLCJpbnZhbGlkSGFuZGxlciIsImNoZWNrRm9ybSIsImVycm9yTWFwIiwic2hvd0Vycm9ycyIsInByZXBhcmVGb3JtIiwiY3VycmVudEVsZW1lbnRzIiwiZWxlbWVudHMiLCJjaGVjayIsImNsZWFuIiwidmFsaWRhdGlvblRhcmdldEZvciIsInByZXBhcmVFbGVtZW50IiwibnVtYmVyT2ZJbnZhbGlkcyIsInRvSGlkZSIsIm1lc3NhZ2UiLCJzdWNjZXNzTGlzdCIsImdyZXAiLCJkZWZhdWx0U2hvd0Vycm9ycyIsInJlc2V0Rm9ybSIsImhpZGVFcnJvcnMiLCJyZXNldEVsZW1lbnRzIiwib2JqZWN0TGVuZ3RoIiwiYWRkV3JhcHBlciIsImZpbmRMYXN0QWN0aXZlIiwiZXJyb3JzIiwicmVzZXRJbnRlcm5hbHMiLCJ0b1Nob3ciLCJ2YWxpZGl0eSIsImJhZElucHV0Iiwic3Vic3RyIiwibGFzdEluZGV4T2YiLCJub3JtYWxpemVyIiwicGFyYW1ldGVycyIsIm1ldGhvZHMiLCJmb3JtYXRBbmRBZGQiLCJjdXN0b21EYXRhTWVzc2FnZSIsImNoYXJBdCIsInN1YnN0cmluZyIsImN1c3RvbU1lc3NhZ2UiLCJmaW5kRGVmaW5lZCIsImRlZmF1bHRNZXNzYWdlIiwid3JhcHBlciIsInNob3dMYWJlbCIsInN1Y2Nlc3MiLCJ2YWxpZEVsZW1lbnRzIiwiaW52YWxpZEVsZW1lbnRzIiwiaWRPck5hbWUiLCJ3cmFwIiwiYXBwZW5kIiwiZXJyb3JQbGFjZW1lbnQiLCJpbnNlcnRBZnRlciIsImVzY2FwZUNzc01ldGEiLCJnZXRMZW5ndGgiLCJkZXBlbmQiLCJkZXBlbmRUeXBlcyIsImJvb2xlYW4iLCJmdW5jdGlvbiIsInN0YXJ0UmVxdWVzdCIsInN0b3BSZXF1ZXN0Iiwic3VibWl0IiwicHJldmlvdXNWYWx1ZSIsIm9sZCIsImNsYXNzUnVsZVNldHRpbmdzIiwiY3JlZGl0Y2FyZCIsImFkZENsYXNzUnVsZXMiLCJub3JtYWxpemVBdHRyaWJ1dGVSdWxlIiwiTnVtYmVyIiwiZGVwZW5kcyIsImlzRnVuY3Rpb24iLCJhZGRNZXRob2QiLCJsIiwibSIsIm9yaWdpbmFsTWVzc2FnZSIsImFqYXgiLCJtb2RlIiwicG9ydCIsImRhdGFUeXBlIiwiYWpheFByZWZpbHRlciIsImFib3J0IiwiYWpheFNldHRpbmdzIiwicmVhZHkiLCJhdXRob3IiLCJjb21tZW50IiwiYWZ0ZXIiLCJhamF4Q29tcGxldGUiLCJidXR0b24iLCJwYWdlIiwibG9hZGluZyIsImFsbERvbmUiLCJzY3JvbGxIYW5kbGluZyIsImFsbG93IiwicmVhbGxvdyIsInNjcm9sbCIsImFjdGlvbiIsIm5vbmNlIiwiYmVsb2FkbW9yZSIsInBvc3QiLCJyZXMiLCJmYWlsIiwieGhyIiwidGV4dFN0YXR1cyIsImZhZGVJbiIsInNsaWNrIiwic2xpZGUiLCJzbGlkZXNUb1Nob3ciLCJzbGlkZXNUb1Njcm9sbCIsImFycm93cyIsImZhZGUiLCJhc05hdkZvciIsImRvdHMiLCJjZW50ZXJNb2RlIiwiZm9jdXNPblNlbGVjdCIsImNsaWNrIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxPQUFPQyxTQUFQLEdBQW9CLFlBQVc7O0FBRTdCOztBQUVBOzs7Ozs7QUFNQTs7QUFDQSxNQUFJQyxhQUFhLEVBQWpCOztBQUVBO0FBQ0EsTUFBSUMsSUFBSjs7QUFFQTtBQUNBLE1BQUlDLFNBQVMsS0FBYjs7QUFFQTtBQUNBLE1BQUlDLGVBQWUsSUFBbkI7O0FBRUE7QUFDQSxNQUFJQyxrQkFBa0IsQ0FDcEIsUUFEb0IsRUFFcEIsVUFGb0IsRUFHcEIsTUFIb0IsRUFJcEIsT0FKb0IsRUFLcEIsT0FMb0IsRUFNcEIsT0FOb0IsRUFPcEIsUUFQb0IsQ0FBdEI7O0FBVUE7QUFDQTtBQUNBLE1BQUlDLGFBQWFDLGFBQWpCOztBQUVBO0FBQ0E7QUFDQSxNQUFJQyxZQUFZLENBQ2QsRUFEYyxFQUNWO0FBQ0osSUFGYyxF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QUFGLEVBQVU0dkIsTUFBVixDQUFpQixZQUFVO0FBQzFCLE1BQUk5ckIsRUFBRSxJQUFGLEVBQVEwZCxTQUFSLEtBQXNCLEdBQTFCLEVBQStCO0FBQzlCMWQsS0FBRSxnQkFBRixFQUFvQnVzQixNQUFwQjtBQUNBLEdBRkQsTUFFTztBQUNOdnNCLEtBQUUsZ0JBQUYsRUFBb0JxVixPQUFwQjtBQUNBO0FBQ0QsRUFORDs7QUFRQTtBQUNBclYsR0FBRSxnQkFBRixFQUFvQmt0QixLQUFwQixDQUEwQixZQUFVO0FBQ25DbHRCLElBQUUsWUFBRixFQUFnQnFQLE9BQWhCLENBQXdCLEVBQUNxTyxXQUFZLENBQWIsRUFBeEIsRUFBd0MsR0FBeEM7QUFDQSxTQUFPLEtBQVA7QUFDQSxFQUhEO0FBS0EsQ0FqQkQiLCJmaWxlIjoiZm91bmRhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy53aGF0SW5wdXQgPSAoZnVuY3Rpb24oKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdmFyaWFibGVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gYXJyYXkgb2YgYWN0aXZlbHkgcHJlc3NlZCBrZXlzXG4gIHZhciBhY3RpdmVLZXlzID0gW107XG5cbiAgLy8gY2FjaGUgZG9jdW1lbnQuYm9keVxuICB2YXIgYm9keTtcblxuICAvLyBib29sZWFuOiB0cnVlIGlmIHRvdWNoIGJ1ZmZlciB0aW1lciBpcyBydW5uaW5nXG4gIHZhciBidWZmZXIgPSBmYWxzZTtcblxuICAvLyB0aGUgbGFzdCB1c2VkIGlucHV0IHR5cGVcbiAgdmFyIGN1cnJlbnRJbnB1dCA9IG51bGw7XG5cbiAgLy8gYGlucHV0YCB0eXBlcyB0aGF0IGRvbid0IGFjY2VwdCB0ZXh0XG4gIHZhciBub25UeXBpbmdJbnB1dHMgPSBbXG4gICAgJ2J1dHRvbicsXG4gICAgJ2NoZWNrYm94JyxcbiAgICAnZmlsZScsXG4gICAgJ2ltYWdlJyxcbiAgICAncmFkaW8nLFxuICAgICdyZXNldCcsXG4gICAgJ3N1Ym1pdCdcbiAgXTtcblxuICAvLyBkZXRlY3QgdmVyc2lvbiBvZiBtb3VzZSB3aGVlbCBldmVudCB0byB1c2VcbiAgLy8gdmlhIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbFxuICB2YXIgbW91c2VXaGVlbCA9IGRldGVjdFdoZWVsKCk7XG5cbiAgLy8gbGlzdCBvZiBtb2RpZmllciBrZXlzIGNvbW1vbmx5IHVzZWQgd2l0aCB0aGUgbW91c2UgYW5kXG4gIC8vIGNhbiBiZSBzYWZlbHkgaWdub3JlZCB0byBwcmV2ZW50IGZhbHNlIGtleWJvYXJkIGRldGVjdGlvblxuICB2YXIgaWdub3JlTWFwID0gW1xuICAgIDE2LCAvLyBzaGlmdFxuICAgIDE3LCAvLyBjb250cm9sXG4gICAgMTgsIC8vIGFsdFxuICAgIDkxLCAvLyBXaW5kb3dzIGtleSAvIGxlZnQgQXBwbGUgY21kXG4gICAgOTMgIC8vIFdpbmRvd3MgbWVudSAvIHJpZ2h0IEFwcGxlIGNtZFxuICBdO1xuXG4gIC8vIG1hcHBpbmcgb2YgZXZlbnRzIHRvIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dE1hcCA9IHtcbiAgICAna2V5ZG93bic6ICdrZXlib2FyZCcsXG4gICAgJ2tleXVwJzogJ2tleWJvYXJkJyxcbiAgICAnbW91c2Vkb3duJzogJ21vdXNlJyxcbiAgICAnbW91c2Vtb3ZlJzogJ21vdXNlJyxcbiAgICAnTVNQb2ludGVyRG93bic6ICdwb2ludGVyJyxcbiAgICAnTVNQb2ludGVyTW92ZSc6ICdwb2ludGVyJyxcbiAgICAncG9pbnRlcmRvd24nOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJtb3ZlJzogJ3BvaW50ZXInLFxuICAgICd0b3VjaHN0YXJ0JzogJ3RvdWNoJ1xuICB9O1xuXG4gIC8vIGFkZCBjb3JyZWN0IG1vdXNlIHdoZWVsIGV2ZW50IG1hcHBpbmcgdG8gYGlucHV0TWFwYFxuICBpbnB1dE1hcFtkZXRlY3RXaGVlbCgpXSA9ICdtb3VzZSc7XG5cbiAgLy8gYXJyYXkgb2YgYWxsIHVzZWQgaW5wdXQgdHlwZXNcbiAgdmFyIGlucHV0VHlwZXMgPSBbXTtcblxuICAvLyBtYXBwaW5nIG9mIGtleSBjb2RlcyB0byBhIGNvbW1vbiBuYW1lXG4gIHZhciBrZXlNYXAgPSB7XG4gICAgOTogJ3RhYicsXG4gICAgMTM6ICdlbnRlcicsXG4gICAgMTY6ICdzaGlmdCcsXG4gICAgMjc6ICdlc2MnLFxuICAgIDMyOiAnc3BhY2UnLFxuICAgIDM3OiAnbGVmdCcsXG4gICAgMzg6ICd1cCcsXG4gICAgMzk6ICdyaWdodCcsXG4gICAgNDA6ICdkb3duJ1xuICB9O1xuXG4gIC8vIG1hcCBvZiBJRSAxMCBwb2ludGVyIGV2ZW50c1xuICB2YXIgcG9pbnRlck1hcCA9IHtcbiAgICAyOiAndG91Y2gnLFxuICAgIDM6ICd0b3VjaCcsIC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgNDogJ21vdXNlJ1xuICB9O1xuXG4gIC8vIHRvdWNoIGJ1ZmZlciB0aW1lclxuICB2YXIgdGltZXI7XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFsbG93cyBldmVudHMgdGhhdCBhcmUgYWxzbyB0cmlnZ2VyZWQgdG8gYmUgZmlsdGVyZWQgb3V0IGZvciBgdG91Y2hzdGFydGBcbiAgZnVuY3Rpb24gZXZlbnRCdWZmZXIoKSB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHNldElucHV0KGV2ZW50KTtcblxuICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGJ1ZmZlciA9IGZhbHNlO1xuICAgIH0sIDY1MCk7XG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJlZEV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFidWZmZXIpIHNldElucHV0KGV2ZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuQnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhclRpbWVyKCkge1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0SW5wdXQoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciB2YWx1ZSA9IGlucHV0TWFwW2V2ZW50LnR5cGVdO1xuICAgIGlmICh2YWx1ZSA9PT0gJ3BvaW50ZXInKSB2YWx1ZSA9IHBvaW50ZXJUeXBlKGV2ZW50KTtcblxuICAgIC8vIGRvbid0IGRvIGFueXRoaW5nIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBpbnB1dCB0eXBlIGFscmVhZHkgc2V0XG4gICAgaWYgKGN1cnJlbnRJbnB1dCAhPT0gdmFsdWUpIHtcbiAgICAgIHZhciBldmVudFRhcmdldCA9IHRhcmdldChldmVudCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXROb2RlID0gZXZlbnRUYXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBldmVudFRhcmdldFR5cGUgPSAoZXZlbnRUYXJnZXROb2RlID09PSAnaW5wdXQnKSA/IGV2ZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgndHlwZScpIDogbnVsbDtcblxuICAgICAgaWYgKFxuICAgICAgICAoLy8gb25seSBpZiB0aGUgdXNlciBmbGFnIHRvIGFsbG93IHR5cGluZyBpbiBmb3JtIGZpZWxkcyBpc24ndCBzZXRcbiAgICAgICAgIWJvZHkuaGFzQXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dC1mb3JtdHlwaW5nJykgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIGN1cnJlbnRJbnB1dCBoYXMgYSB2YWx1ZVxuICAgICAgICBjdXJyZW50SW5wdXQgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSBpbnB1dCBpcyBga2V5Ym9hcmRgXG4gICAgICAgIHZhbHVlID09PSAna2V5Ym9hcmQnICYmXG5cbiAgICAgICAgLy8gbm90IGlmIHRoZSBrZXkgaXMgYFRBQmBcbiAgICAgICAga2V5TWFwW2V2ZW50S2V5XSAhPT0gJ3RhYicgJiZcblxuICAgICAgICAvLyBvbmx5IGlmIHRoZSB0YXJnZXQgaXMgYSBmb3JtIGlucHV0IHRoYXQgYWNjZXB0cyB0ZXh0XG4gICAgICAgIChcbiAgICAgICAgICAgZXZlbnRUYXJnZXROb2RlID09PSAndGV4dGFyZWEnIHx8XG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3NlbGVjdCcgfHxcbiAgICAgICAgICAgKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JyAmJiBub25UeXBpbmdJbnB1dHMuaW5kZXhPZihldmVudFRhcmdldFR5cGUpIDwgMClcbiAgICAgICAgKSkgfHwgKFxuICAgICAgICAgIC8vIGlnbm9yZSBtb2RpZmllciBrZXlzXG4gICAgICAgICAgaWdub3JlTWFwLmluZGV4T2YoZXZlbnRLZXkpID4gLTFcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIC8vIGlnbm9yZSBrZXlib2FyZCB0eXBpbmdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaElucHV0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09ICdrZXlib2FyZCcpIGxvZ0tleXMoZXZlbnRLZXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3dpdGNoSW5wdXQoc3RyaW5nKSB7XG4gICAgY3VycmVudElucHV0ID0gc3RyaW5nO1xuICAgIGJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXdoYXRpbnB1dCcsIGN1cnJlbnRJbnB1dCk7XG5cbiAgICBpZiAoaW5wdXRUeXBlcy5pbmRleE9mKGN1cnJlbnRJbnB1dCkgPT09IC0xKSBpbnB1dFR5cGVzLnB1c2goY3VycmVudElucHV0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleShldmVudCkge1xuICAgIHJldHVybiAoZXZlbnQua2V5Q29kZSkgPyBldmVudC5rZXlDb2RlIDogZXZlbnQud2hpY2g7XG4gIH1cblxuICBmdW5jdGlvbiB0YXJnZXQoZXZlbnQpIHtcbiAgICByZXR1cm4gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludGVyVHlwZShldmVudCkge1xuICAgIGlmICh0eXBlb2YgZXZlbnQucG9pbnRlclR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gcG9pbnRlck1hcFtldmVudC5wb2ludGVyVHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoZXZlbnQucG9pbnRlclR5cGUgPT09ICdwZW4nKSA/ICd0b3VjaCcgOiBldmVudC5wb2ludGVyVHlwZTsgLy8gdHJlYXQgcGVuIGxpa2UgdG91Y2hcbiAgICB9XG4gIH1cblxuICAvLyBrZXlib2FyZCBsb2dnaW5nXG4gIGZ1bmN0aW9uIGxvZ0tleXMoZXZlbnRLZXkpIHtcbiAgICBpZiAoYWN0aXZlS2V5cy5pbmRleE9mKGtleU1hcFtldmVudEtleV0pID09PSAtMSAmJiBrZXlNYXBbZXZlbnRLZXldKSBhY3RpdmVLZXlzLnB1c2goa2V5TWFwW2V2ZW50S2V5XSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkxvZ0tleXMoZXZlbnQpIHtcbiAgICB2YXIgZXZlbnRLZXkgPSBrZXkoZXZlbnQpO1xuICAgIHZhciBhcnJheVBvcyA9IGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKTtcblxuICAgIGlmIChhcnJheVBvcyAhPT0gLTEpIGFjdGl2ZUtleXMuc3BsaWNlKGFycmF5UG9zLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XG4gICAgYm9keSA9IGRvY3VtZW50LmJvZHk7XG5cbiAgICAvLyBwb2ludGVyIGV2ZW50cyAobW91c2UsIHBlbiwgdG91Y2gpXG4gICAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBidWZmZXJlZEV2ZW50KTtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5NU1BvaW50ZXJFdmVudCkge1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJEb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ01TUG9pbnRlck1vdmUnLCBidWZmZXJlZEV2ZW50KTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBtb3VzZSBldmVudHNcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHNcbiAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZXZlbnRCdWZmZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdXNlIHdoZWVsXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKG1vdXNlV2hlZWwsIGJ1ZmZlcmVkRXZlbnQpO1xuXG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdW5CdWZmZXJlZEV2ZW50KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuTG9nS2V5cyk7XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgdXRpbGl0aWVzXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgZnVuY3Rpb24gZGV0ZWN0V2hlZWwoKSB7XG4gICAgcmV0dXJuIG1vdXNlV2hlZWwgPSAnb253aGVlbCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykgP1xuICAgICAgJ3doZWVsJyA6IC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxuXG4gICAgICBkb2N1bWVudC5vbm1vdXNld2hlZWwgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgICdtb3VzZXdoZWVsJyA6IC8vIFdlYmtpdCBhbmQgSUUgc3VwcG9ydCBhdCBsZWFzdCBcIm1vdXNld2hlZWxcIlxuICAgICAgICAnRE9NTW91c2VTY3JvbGwnOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcbiAgfVxuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBpbml0XG5cbiAgICBkb24ndCBzdGFydCBzY3JpcHQgdW5sZXNzIGJyb3dzZXIgY3V0cyB0aGUgbXVzdGFyZCxcbiAgICBhbHNvIHBhc3NlcyBpZiBwb2x5ZmlsbHMgYXJlIHVzZWRcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICBpZiAoXG4gICAgJ2FkZEV2ZW50TGlzdGVuZXInIGluIHdpbmRvdyAmJlxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mXG4gICkge1xuXG4gICAgLy8gaWYgdGhlIGRvbSBpcyBhbHJlYWR5IHJlYWR5IGFscmVhZHkgKHNjcmlwdCB3YXMgcGxhY2VkIGF0IGJvdHRvbSBvZiA8Ym9keT4pXG4gICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGJpbmRFdmVudHMoKTtcblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgZG9tIHRvIGxvYWQgKHNjcmlwdCB3YXMgcGxhY2VkIGluIHRoZSA8aGVhZD4pXG4gICAgfSBlbHNlIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBiaW5kRXZlbnRzKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgYXBpXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgcmV0dXJuIHtcblxuICAgIC8vIHJldHVybnMgc3RyaW5nOiB0aGUgY3VycmVudCBpbnB1dCB0eXBlXG4gICAgYXNrOiBmdW5jdGlvbigpIHsgcmV0dXJuIGN1cnJlbnRJbnB1dDsgfSxcblxuICAgIC8vIHJldHVybnMgYXJyYXk6IGN1cnJlbnRseSBwcmVzc2VkIGtleXNcbiAgICBrZXlzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGFjdGl2ZUtleXM7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBhbGwgdGhlIGRldGVjdGVkIGlucHV0IHR5cGVzXG4gICAgdHlwZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5wdXRUeXBlczsgfSxcblxuICAgIC8vIGFjY2VwdHMgc3RyaW5nOiBtYW51YWxseSBzZXQgdGhlIGlucHV0IHR5cGVcbiAgICBzZXQ6IHN3aXRjaElucHV0XG4gIH07XG5cbn0oKSk7XG4iLCIhZnVuY3Rpb24oJCkge1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEZPVU5EQVRJT05fVkVSU0lPTiA9ICc2LjIuMic7XG5cbi8vIEdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuLy8gVGhpcyBpcyBhdHRhY2hlZCB0byB0aGUgd2luZG93LCBvciB1c2VkIGFzIGEgbW9kdWxlIGZvciBBTUQvQnJvd3NlcmlmeVxudmFyIEZvdW5kYXRpb24gPSB7XG4gIHZlcnNpb246IEZPVU5EQVRJT05fVkVSU0lPTixcblxuICAvKipcbiAgICogU3RvcmVzIGluaXRpYWxpemVkIHBsdWdpbnMuXG4gICAqL1xuICBfcGx1Z2luczoge30sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xuICAgKi9cbiAgX3V1aWRzOiBbXSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIGJvb2xlYW4gZm9yIFJUTCBzdXBwb3J0XG4gICAqL1xuICBydGw6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuICQoJ2h0bWwnKS5hdHRyKCdkaXInKSA9PT0gJ3J0bCc7XG4gIH0sXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgRm91bmRhdGlvbiBwbHVnaW4sIGFkZGluZyBpdCB0byB0aGUgYEZvdW5kYXRpb25gIG5hbWVzcGFjZSBhbmQgdGhlIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplIHdoZW4gcmVmbG93aW5nLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXG4gICAqL1xuICBwbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSkge1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuICAgIC8vIEV4YW1wbGVzOiBGb3VuZGF0aW9uLlJldmVhbCwgRm91bmRhdGlvbi5PZmZDYW52YXNcbiAgICB2YXIgY2xhc3NOYW1lID0gKG5hbWUgfHwgZnVuY3Rpb25OYW1lKHBsdWdpbikpO1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxuICAgIC8vIEV4YW1wbGVzOiBkYXRhLXJldmVhbCwgZGF0YS1vZmYtY2FudmFzXG4gICAgdmFyIGF0dHJOYW1lICA9IGh5cGhlbmF0ZShjbGFzc05hbWUpO1xuXG4gICAgLy8gQWRkIHRvIHRoZSBGb3VuZGF0aW9uIG9iamVjdCBhbmQgdGhlIHBsdWdpbnMgbGlzdCAoZm9yIHJlZmxvd2luZylcbiAgICB0aGlzLl9wbHVnaW5zW2F0dHJOYW1lXSA9IHRoaXNbY2xhc3NOYW1lXSA9IHBsdWdpbjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXG4gICAqIEFkZHMgdGhlIGB6ZlBsdWdpbmAgZGF0YS1hdHRyaWJ1dGUgdG8gcHJvZ3JhbW1hdGljYWxseSBjcmVhdGVkIHBsdWdpbnMgdG8gYWxsb3cgdXNlIG9mICQoc2VsZWN0b3IpLmZvdW5kYXRpb24obWV0aG9kKSBjYWxscy5cbiAgICogQWxzbyBmaXJlcyB0aGUgaW5pdGlhbGl6YXRpb24gZXZlbnQgZm9yIGVhY2ggcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4sIHBhc3NlZCBhcyBhIGNhbWVsQ2FzZWQgc3RyaW5nLlxuICAgKiBAZmlyZXMgUGx1Z2luI2luaXRcbiAgICovXG4gIHJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpe1xuICAgIHZhciBwbHVnaW5OYW1lID0gbmFtZSA/IGh5cGhlbmF0ZShuYW1lKSA6IGZ1bmN0aW9uTmFtZShwbHVnaW4uY29uc3RydWN0b3IpLnRvTG93ZXJDYXNlKCk7XG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xuXG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKSl7IHBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gLCBwbHVnaW4udXVpZCk7IH1cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBpbml0aWFsaXplZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcbiAgICAgICAgICAgKi9cbiAgICBwbHVnaW4uJGVsZW1lbnQudHJpZ2dlcihgaW5pdC56Zi4ke3BsdWdpbk5hbWV9YCk7XG5cbiAgICB0aGlzLl91dWlkcy5wdXNoKHBsdWdpbi51dWlkKTtcblxuICAgIHJldHVybjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBSZW1vdmVzIHRoZSBwbHVnaW5zIHV1aWQgZnJvbSB0aGUgX3V1aWRzIGFycmF5LlxuICAgKiBSZW1vdmVzIHRoZSB6ZlBsdWdpbiBkYXRhIGF0dHJpYnV0ZSwgYXMgd2VsbCBhcyB0aGUgZGF0YS1wbHVnaW4tbmFtZSBhdHRyaWJ1dGUuXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQGZpcmVzIFBsdWdpbiNkZXN0cm95ZWRcbiAgICovXG4gIHVucmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBoeXBoZW5hdGUoZnVuY3Rpb25OYW1lKHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpLmNvbnN0cnVjdG9yKSk7XG5cbiAgICB0aGlzLl91dWlkcy5zcGxpY2UodGhpcy5fdXVpZHMuaW5kZXhPZihwbHVnaW4udXVpZCksIDEpO1xuICAgIHBsdWdpbi4kZWxlbWVudC5yZW1vdmVBdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKS5yZW1vdmVEYXRhKCd6ZlBsdWdpbicpXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2Rlc3Ryb3llZFxuICAgICAgICAgICAqL1xuICAgICAgICAgIC50cmlnZ2VyKGBkZXN0cm95ZWQuemYuJHtwbHVnaW5OYW1lfWApO1xuICAgIGZvcih2YXIgcHJvcCBpbiBwbHVnaW4pe1xuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gICAgfVxuICAgIHJldHVybjtcbiAgfSxcblxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIENhdXNlcyBvbmUgb3IgbW9yZSBhY3RpdmUgcGx1Z2lucyB0byByZS1pbml0aWFsaXplLCByZXNldHRpbmcgZXZlbnQgbGlzdGVuZXJzLCByZWNhbGN1bGF0aW5nIHBvc2l0aW9ucywgZXRjLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGx1Z2lucyAtIG9wdGlvbmFsIHN0cmluZyBvZiBhbiBpbmRpdmlkdWFsIHBsdWdpbiBrZXksIGF0dGFpbmVkIGJ5IGNhbGxpbmcgYCQoZWxlbWVudCkuZGF0YSgncGx1Z2luTmFtZScpYCwgb3Igc3RyaW5nIG9mIGEgcGx1Z2luIGNsYXNzIGkuZS4gYCdkcm9wZG93bidgXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXG4gICAqL1xuICAgcmVJbml0OiBmdW5jdGlvbihwbHVnaW5zKXtcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcbiAgICAgdHJ5e1xuICAgICAgIGlmKGlzSlEpe1xuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICQodGhpcykuZGF0YSgnemZQbHVnaW4nKS5faW5pdCgpO1xuICAgICAgICAgfSk7XG4gICAgICAgfWVsc2V7XG4gICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBwbHVnaW5zLFxuICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgZm5zID0ge1xuICAgICAgICAgICAnb2JqZWN0JzogZnVuY3Rpb24ocGxncyl7XG4gICAgICAgICAgICAgcGxncy5mb3JFYWNoKGZ1bmN0aW9uKHApe1xuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcbiAgICAgICAgICAgICAgICQoJ1tkYXRhLScrIHAgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3N0cmluZyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgcGx1Z2lucyA9IGh5cGhlbmF0ZShwbHVnaW5zKTtcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICd1bmRlZmluZWQnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgIH07XG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XG4gICAgICAgfVxuICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgIH1maW5hbGx5e1xuICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgICB9XG4gICB9LFxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgcmFuZG9tIGJhc2UtMzYgdWlkIHdpdGggbmFtZXNwYWNpbmdcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlIC0gbmFtZSBvZiBwbHVnaW4gdG8gYmUgaW5jb3Jwb3JhdGVkIGluIHVpZCwgb3B0aW9uYWwuXG4gICAqIEBkZWZhdWx0IHtTdHJpbmd9ICcnIC0gaWYgbm8gcGx1Z2luIG5hbWUgaXMgcHJvdmlkZWQsIG5vdGhpbmcgaXMgYXBwZW5kZWQgdG8gdGhlIHVpZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcbiAgICovXG4gIEdldFlvRGlnaXRzOiBmdW5jdGlvbihsZW5ndGgsIG5hbWVzcGFjZSl7XG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucG93KDM2LCBsZW5ndGggKyAxKSAtIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygzNiwgbGVuZ3RoKSkpLnRvU3RyaW5nKDM2KS5zbGljZSgxKSArIChuYW1lc3BhY2UgPyBgLSR7bmFtZXNwYWNlfWAgOiAnJyk7XG4gIH0sXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBsdWdpbnMgb24gYW55IGVsZW1lbnRzIHdpdGhpbiBgZWxlbWAgKGFuZCBgZWxlbWAgaXRzZWxmKSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluaXRpYWxpemVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbSAtIGpRdWVyeSBvYmplY3QgY29udGFpbmluZyB0aGUgZWxlbWVudCB0byBjaGVjayBpbnNpZGUuIEFsc28gY2hlY2tzIHRoZSBlbGVtZW50IGl0c2VsZiwgdW5sZXNzIGl0J3MgdGhlIGBkb2N1bWVudGAgb2JqZWN0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cbiAgICovXG4gIHJlZmxvdzogZnVuY3Rpb24oZWxlbSwgcGx1Z2lucykge1xuXG4gICAgLy8gSWYgcGx1Z2lucyBpcyB1bmRlZmluZWQsIGp1c3QgZ3JhYiBldmVyeXRoaW5nXG4gICAgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xuICAgIH1cbiAgICAvLyBJZiBwbHVnaW5zIGlzIGEgc3RyaW5nLCBjb252ZXJ0IGl0IHRvIGFuIGFycmF5IHdpdGggb25lIGl0ZW1cbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBsdWdpbnMgPSBbcGx1Z2luc107XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxuICAgICQuZWFjaChwbHVnaW5zLCBmdW5jdGlvbihpLCBuYW1lKSB7XG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgcGx1Z2luXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XG5cbiAgICAgIC8vIExvY2FsaXplIHRoZSBzZWFyY2ggdG8gYWxsIGVsZW1lbnRzIGluc2lkZSBlbGVtLCBhcyB3ZWxsIGFzIGVsZW0gaXRzZWxmLCB1bmxlc3MgZWxlbSA9PT0gZG9jdW1lbnRcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHBsdWdpbiBmb3VuZCwgaW5pdGlhbGl6ZSBpdFxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xuICAgICAgICBpZiAoJGVsLmRhdGEoJ3pmUGx1Z2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmllZCB0byBpbml0aWFsaXplIFwiK25hbWUrXCIgb24gYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgaGFzIGEgRm91bmRhdGlvbiBwbHVnaW4uXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XG4gICAgICAgICAgdmFyIHRoaW5nID0gJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpLnNwbGl0KCc7JykuZm9yRWFjaChmdW5jdGlvbihlLCBpKXtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKGVsKXsgcmV0dXJuIGVsLnRyaW0oKTsgfSk7XG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgJGVsLmRhdGEoJ3pmUGx1Z2luJywgbmV3IHBsdWdpbigkKHRoaXMpLCBvcHRzKSk7XG4gICAgICAgIH1jYXRjaChlcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XG4gICAgICAgIH1maW5hbGx5e1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldEZuTmFtZTogZnVuY3Rpb25OYW1lLFxuICB0cmFuc2l0aW9uZW5kOiBmdW5jdGlvbigkZWxlbSl7XG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xuICAgICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICAgIH07XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgZW5kO1xuXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XG4gICAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgZW5kID0gdHJhbnNpdGlvbnNbdF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKGVuZCl7XG4gICAgICByZXR1cm4gZW5kO1xuICAgIH1lbHNle1xuICAgICAgZW5kID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xuICAgICAgfSwgMSk7XG4gICAgICByZXR1cm4gJ3RyYW5zaXRpb25lbmQnO1xuICAgIH1cbiAgfVxufTtcblxuRm91bmRhdGlvbi51dGlsID0ge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgZW5kIG9mIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxuICAgKiBAcmV0dXJucyBmdW5jdGlvblxuICAgKi9cbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xuICAgIHZhciB0aW1lciA9IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFRPRE86IGNvbnNpZGVyIG5vdCBtYWtpbmcgdGhpcyBhIGpRdWVyeSBmdW5jdGlvblxuLy8gVE9ETzogbmVlZCB3YXkgdG8gcmVmbG93IHZzLiByZS1pbml0aWFsaXplXG4vKipcbiAqIFRoZSBGb3VuZGF0aW9uIGpRdWVyeSBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gbWV0aG9kIC0gQW4gYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGN1cnJlbnQgalF1ZXJ5IG9iamVjdC5cbiAqL1xudmFyIGZvdW5kYXRpb24gPSBmdW5jdGlvbihtZXRob2QpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgbWV0aG9kLFxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcbiAgICAgICRub0pTID0gJCgnLm5vLWpzJyk7XG5cbiAgaWYoISRtZXRhLmxlbmd0aCl7XG4gICAgJCgnPG1ldGEgY2xhc3M9XCJmb3VuZGF0aW9uLW1xXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCk7XG4gIH1cbiAgaWYoJG5vSlMubGVuZ3RoKXtcbiAgICAkbm9KUy5yZW1vdmVDbGFzcygnbm8tanMnKTtcbiAgfVxuXG4gIGlmKHR5cGUgPT09ICd1bmRlZmluZWQnKXsvL25lZWRzIHRvIGluaXRpYWxpemUgdGhlIEZvdW5kYXRpb24gb2JqZWN0LCBvciBhbiBpbmRpdmlkdWFsIHBsdWdpbi5cbiAgICBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcbiAgfWVsc2UgaWYodHlwZSA9PT0gJ3N0cmluZycpey8vYW4gaW5kaXZpZHVhbCBtZXRob2QgdG8gaW52b2tlIG9uIGEgcGx1Z2luIG9yIGdyb3VwIG9mIHBsdWdpbnNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7Ly9jb2xsZWN0IGFsbCB0aGUgYXJndW1lbnRzLCBpZiBuZWNlc3NhcnlcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cblxuICAgIGlmKHBsdWdDbGFzcyAhPT0gdW5kZWZpbmVkICYmIHBsdWdDbGFzc1ttZXRob2RdICE9PSB1bmRlZmluZWQpey8vbWFrZSBzdXJlIGJvdGggdGhlIGNsYXNzIGFuZCBtZXRob2QgZXhpc3RcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkocGx1Z0NsYXNzLCBhcmdzKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseSgkKGVsKS5kYXRhKCd6ZlBsdWdpbicpLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfWVsc2V7Ly9lcnJvciBmb3Igbm8gY2xhc3Mgb3Igbm8gbWV0aG9kXG4gICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJXZSdyZSBzb3JyeSwgJ1wiICsgbWV0aG9kICsgXCInIGlzIG5vdCBhbiBhdmFpbGFibGUgbWV0aG9kIGZvciBcIiArIChwbHVnQ2xhc3MgPyBmdW5jdGlvbk5hbWUocGx1Z0NsYXNzKSA6ICd0aGlzIGVsZW1lbnQnKSArICcuJyk7XG4gICAgfVxuICB9ZWxzZXsvL2Vycm9yIGZvciBpbnZhbGlkIGFyZ3VtZW50IHR5cGVcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBXZSdyZSBzb3JyeSwgJHt0eXBlfSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuIFlvdSBtdXN0IHVzZSBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1ldGhvZCB5b3Ugd2lzaCB0byBpbnZva2UuYCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG53aW5kb3cuRm91bmRhdGlvbiA9IEZvdW5kYXRpb247XG4kLmZuLmZvdW5kYXRpb24gPSBmb3VuZGF0aW9uO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcbiAgICB3aW5kb3cuRGF0ZS5ub3cgPSBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdnArJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddKTtcbiAgfVxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSAtIG5vdyk7XG4gICAgfTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG4gIH1cbiAgLyoqXG4gICAqIFBvbHlmaWxsIGZvciBwZXJmb3JtYW5jZS5ub3csIHJlcXVpcmVkIGJ5IHJBRlxuICAgKi9cbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgc3RhcnQ6IERhdGUubm93KCksXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGNsb3Nlc3QgdGhpbmcgcG9zc2libGUgdG8gdGhlIEVDTUFTY3JpcHQgNVxuICAgICAgLy8gaW50ZXJuYWwgSXNDYWxsYWJsZSBmdW5jdGlvblxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG5cbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgICBmTk9QICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICB9O1xuXG4gICAgaWYgKHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAvLyBuYXRpdmUgZnVuY3Rpb25zIGRvbid0IGhhdmUgYSBwcm90b3R5cGVcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cbi8vIFBvbHlmaWxsIHRvIGdldCB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGluIElFOVxuZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZuKSB7XG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZ1bmNOYW1lUmVnZXggPSAvZnVuY3Rpb25cXHMoW14oXXsxLH0pXFwoLztcbiAgICB2YXIgcmVzdWx0cyA9IChmdW5jTmFtZVJlZ2V4KS5leGVjKChmbikudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XG4gIH1cbiAgZWxzZSBpZiAoZm4ucHJvdG90eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcbiAgaWYoL3RydWUvLnRlc3Qoc3RyKSkgcmV0dXJuIHRydWU7XG4gIGVsc2UgaWYoL2ZhbHNlLy50ZXN0KHN0cikpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZighaXNOYU4oc3RyICogMSkpIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XG4gIHJldHVybiBzdHI7XG59XG4vLyBDb252ZXJ0IFBhc2NhbENhc2UgdG8ga2ViYWItY2FzZVxuLy8gVGhhbmsgeW91OiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS84OTU1NTgwXG5mdW5jdGlvbiBoeXBoZW5hdGUoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5Gb3VuZGF0aW9uLkJveCA9IHtcbiAgSW1Ob3RUb3VjaGluZ1lvdTogSW1Ob3RUb3VjaGluZ1lvdSxcbiAgR2V0RGltZW5zaW9uczogR2V0RGltZW5zaW9ucyxcbiAgR2V0T2Zmc2V0czogR2V0T2Zmc2V0c1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBkaW1lbnNpb25zIG9mIGFuIGVsZW1lbnQgdG8gYSBjb250YWluZXIgYW5kIGRldGVybWluZXMgY29sbGlzaW9uIGV2ZW50cyB3aXRoIGNvbnRhaW5lci5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHRlc3QgZm9yIGNvbGxpc2lvbnMuXG4gKiBAcGFyYW0ge2pRdWVyeX0gcGFyZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgYm91bmRpbmcgY29udGFpbmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBsck9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayBsZWZ0IGFuZCByaWdodCB2YWx1ZXMgb25seS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgdG9wIGFuZCBib3R0b20gdmFsdWVzIG9ubHkuXG4gKiBAZGVmYXVsdCBpZiBubyBwYXJlbnQgb2JqZWN0IHBhc3NlZCwgZGV0ZWN0cyBjb2xsaXNpb25zIHdpdGggYHdpbmRvd2AuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIGNvbGxpc2lvbiBmcmVlLCBmYWxzZSBpZiBhIGNvbGxpc2lvbiBpbiBhbnkgZGlyZWN0aW9uLlxuICovXG5mdW5jdGlvbiBJbU5vdFRvdWNoaW5nWW91KGVsZW1lbnQsIHBhcmVudCwgbHJPbmx5LCB0Yk9ubHkpIHtcbiAgdmFyIGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgdG9wLCBib3R0b20sIGxlZnQsIHJpZ2h0O1xuXG4gIGlmIChwYXJlbnQpIHtcbiAgICB2YXIgcGFyRGltcyA9IEdldERpbWVuc2lvbnMocGFyZW50KTtcblxuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBwYXJEaW1zLmhlaWdodCArIHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBwYXJEaW1zLndpZHRoICsgcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgKyBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKTtcbiAgfVxuXG4gIHZhciBhbGxEaXJzID0gW2JvdHRvbSwgdG9wLCBsZWZ0LCByaWdodF07XG5cbiAgaWYgKGxyT25seSkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodCA9PT0gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0Yk9ubHkpIHtcbiAgICByZXR1cm4gdG9wID09PSBib3R0b20gPT09IHRydWU7XG4gIH1cblxuICByZXR1cm4gYWxsRGlycy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG59O1xuXG4vKipcbiAqIFVzZXMgbmF0aXZlIG1ldGhvZHMgdG8gcmV0dXJuIGFuIG9iamVjdCBvZiBkaW1lbnNpb24gdmFsdWVzLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeSB8fCBIVE1MfSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBvciBET00gZWxlbWVudCBmb3Igd2hpY2ggdG8gZ2V0IHRoZSBkaW1lbnNpb25zLiBDYW4gYmUgYW55IGVsZW1lbnQgb3RoZXIgdGhhdCBkb2N1bWVudCBvciB3aW5kb3cuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIG5lc3RlZCBvYmplY3Qgb2YgaW50ZWdlciBwaXhlbCB2YWx1ZXNcbiAqIFRPRE8gLSBpZiBlbGVtZW50IGlzIHdpbmRvdywgcmV0dXJuIG9ubHkgdGhvc2UgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBHZXREaW1lbnNpb25zKGVsZW0sIHRlc3Qpe1xuICBlbGVtID0gZWxlbS5sZW5ndGggPyBlbGVtWzBdIDogZWxlbTtcblxuICBpZiAoZWxlbSA9PT0gd2luZG93IHx8IGVsZW0gPT09IGRvY3VtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSSdtIHNvcnJ5LCBEYXZlLiBJJ20gYWZyYWlkIEkgY2FuJ3QgZG8gdGhhdC5cIik7XG4gIH1cblxuICB2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICBwYXJSZWN0ID0gZWxlbS5wYXJlbnROb2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5ZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuICAgICAgd2luWCA9IHdpbmRvdy5wYWdlWE9mZnNldDtcblxuICByZXR1cm4ge1xuICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgb2Zmc2V0OiB7XG4gICAgICB0b3A6IHJlY3QudG9wICsgd2luWSxcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpblhcbiAgICB9LFxuICAgIHBhcmVudERpbXM6IHtcbiAgICAgIHdpZHRoOiBwYXJSZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBwYXJSZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHBhclJlY3QudG9wICsgd2luWSxcbiAgICAgICAgbGVmdDogcGFyUmVjdC5sZWZ0ICsgd2luWFxuICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93RGltczoge1xuICAgICAgd2lkdGg6IHdpblJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHdpblJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogd2luWSxcbiAgICAgICAgbGVmdDogd2luWFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IG9mIHRvcCBhbmQgbGVmdCBpbnRlZ2VyIHBpeGVsIHZhbHVlcyBmb3IgZHluYW1pY2FsbHkgcmVuZGVyZWQgZWxlbWVudHMsXG4gKiBzdWNoIGFzOiBUb29sdGlwLCBSZXZlYWwsIGFuZCBEcm9wZG93blxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IGJlaW5nIHBvc2l0aW9uZWQuXG4gKiBAcGFyYW0ge2pRdWVyeX0gYW5jaG9yIC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQncyBhbmNob3IgcG9pbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBhIHN0cmluZyByZWxhdGluZyB0byB0aGUgZGVzaXJlZCBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCwgcmVsYXRpdmUgdG8gaXQncyBhbmNob3JcbiAqIEBwYXJhbSB7TnVtYmVyfSB2T2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIHZlcnRpY2FsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0gaE9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCBob3Jpem9udGFsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzT3ZlcmZsb3cgLSBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZCwgc2V0cyB0byB0cnVlIHRvIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gZnVsbCB3aWR0aCAtIGFueSBkZXNpcmVkIG9mZnNldC5cbiAqIFRPRE8gYWx0ZXIvcmV3cml0ZSB0byB3b3JrIHdpdGggYGVtYCB2YWx1ZXMgYXMgd2VsbC9pbnN0ZWFkIG9mIHBpeGVsc1xuICovXG5mdW5jdGlvbiBHZXRPZmZzZXRzKGVsZW1lbnQsIGFuY2hvciwgcG9zaXRpb24sIHZPZmZzZXQsIGhPZmZzZXQsIGlzT3ZlcmZsb3cpIHtcbiAgdmFyICRlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgICRhbmNob3JEaW1zID0gYW5jaG9yID8gR2V0RGltZW5zaW9ucyhhbmNob3IpIDogbnVsbDtcblxuICBzd2l0Y2ggKHBvc2l0aW9uKSB7XG4gICAgY2FzZSAndG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgdG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogaXNPdmVyZmxvdyA/IGhPZmZzZXQgOiAoKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMikpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHJpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0ICsgMSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlcic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCArICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArICgkZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmV2ZWFsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gJGVsZURpbXMud2lkdGgpIC8gMixcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgY2FzZSAncmV2ZWFsIGZ1bGwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgfVxufVxuXG59KGpRdWVyeSk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXG4gKiBQbGVhc2UgdGhhbmsgTWFyaXVzIG9uIEdpdEh1YiAvb3dsYmVydHogKlxuICogb3IgdGhlIHdlYiBodHRwOi8vd3d3Lm1hcml1c29sYmVydHouZGUvICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IGtleUNvZGVzID0ge1xuICA5OiAnVEFCJyxcbiAgMTM6ICdFTlRFUicsXG4gIDI3OiAnRVNDQVBFJyxcbiAgMzI6ICdTUEFDRScsXG4gIDM3OiAnQVJST1dfTEVGVCcsXG4gIDM4OiAnQVJST1dfVVAnLFxuICAzOTogJ0FSUk9XX1JJR0hUJyxcbiAgNDA6ICdBUlJPV19ET1dOJ1xufVxuXG52YXIgY29tbWFuZHMgPSB7fVxuXG52YXIgS2V5Ym9hcmQgPSB7XG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcblxuICAvKipcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XG4gICAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcbiAgICovXG4gIHBhcnNlS2V5KGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSBrZXkgPSBgU0hJRlRfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuY3RybEtleSkga2V5ID0gYENUUkxfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuYWx0S2V5KSBrZXkgPSBgQUxUXyR7a2V5fWA7XG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgZ2l2ZW4gKGtleWJvYXJkKSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50J3MgbmFtZSwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEBwYXJhbSB7T2JqZWN0c30gZnVuY3Rpb25zIC0gY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgdG8gYmUgZXhlY3V0ZWRcbiAgICovXG4gIGhhbmRsZUtleShldmVudCwgY29tcG9uZW50LCBmdW5jdGlvbnMpIHtcbiAgICB2YXIgY29tbWFuZExpc3QgPSBjb21tYW5kc1tjb21wb25lbnRdLFxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxuICAgICAgY21kcyxcbiAgICAgIGNvbW1hbmQsXG4gICAgICBmbjtcblxuICAgIGlmICghY29tbWFuZExpc3QpIHJldHVybiBjb25zb2xlLndhcm4oJ0NvbXBvbmVudCBub3QgZGVmaW5lZCEnKTtcblxuICAgIGlmICh0eXBlb2YgY29tbWFuZExpc3QubHRyID09PSAndW5kZWZpbmVkJykgeyAvLyB0aGlzIGNvbXBvbmVudCBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIGJldHdlZW4gbHRyIGFuZCBydGxcbiAgICAgICAgY21kcyA9IGNvbW1hbmRMaXN0OyAvLyB1c2UgcGxhaW4gbGlzdFxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5sdHIsIGNvbW1hbmRMaXN0LnJ0bCk7XG5cbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcbiAgICB9XG4gICAgY29tbWFuZCA9IGNtZHNba2V5Q29kZV07XG5cbiAgICBmbiA9IGZ1bmN0aW9uc1tjb21tYW5kXTtcbiAgICBpZiAoZm4gJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gIGlmIGV4aXN0c1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcbiAgICAgIGlmIChmdW5jdGlvbnMuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLmhhbmRsZWQocmV0dXJuVmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnVuY3Rpb25zLnVuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLnVuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBzZWFyY2ggd2l0aGluXG4gICAqIEByZXR1cm4ge2pRdWVyeX0gJGZvY3VzYWJsZSAtIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIGAkZWxlbWVudGBcbiAgICovXG4gIGZpbmRGb2N1c2FibGUoJGVsZW1lbnQpIHtcbiAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnYVtocmVmXSwgYXJlYVtocmVmXSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBzZWxlY3Q6bm90KFtkaXNhYmxlZF0pLCB0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSksIGJ1dHRvbjpub3QoW2Rpc2FibGVkXSksIGlmcmFtZSwgb2JqZWN0LCBlbWJlZCwgKlt0YWJpbmRleF0sICpbY29udGVudGVkaXRhYmxlXScpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEByZXR1cm4gU3RyaW5nIGNvbXBvbmVudE5hbWVcbiAgICovXG5cbiAgcmVnaXN0ZXIoY29tcG9uZW50TmFtZSwgY21kcykge1xuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcbiAgfVxufVxuXG4vKlxuICogQ29uc3RhbnRzIGZvciBlYXNpZXIgY29tcGFyaW5nLlxuICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gKi9cbmZ1bmN0aW9uIGdldEtleUNvZGVzKGtjcykge1xuICB2YXIgayA9IHt9O1xuICBmb3IgKHZhciBrYyBpbiBrY3MpIGtba2NzW2tjXV0gPSBrY3Nba2NdO1xuICByZXR1cm4gaztcbn1cblxuRm91bmRhdGlvbi5LZXlib2FyZCA9IEtleWJvYXJkO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8vIERlZmF1bHQgc2V0IG9mIG1lZGlhIHF1ZXJpZXNcbmNvbnN0IGRlZmF1bHRRdWVyaWVzID0ge1xuICAnZGVmYXVsdCcgOiAnb25seSBzY3JlZW4nLFxuICBsYW5kc2NhcGUgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gIHBvcnRyYWl0IDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gIHJldGluYSA6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG52YXIgTWVkaWFRdWVyeSA9IHtcbiAgcXVlcmllczogW10sXG5cbiAgY3VycmVudDogJycsXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtZWRpYSBxdWVyeSBoZWxwZXIsIGJ5IGV4dHJhY3RpbmcgdGhlIGJyZWFrcG9pbnQgbGlzdCBmcm9tIHRoZSBDU1MgYW5kIGFjdGl2YXRpbmcgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGV4dHJhY3RlZFN0eWxlcyA9ICQoJy5mb3VuZGF0aW9uLW1xJykuY3NzKCdmb250LWZhbWlseScpO1xuICAgIHZhciBuYW1lZFF1ZXJpZXM7XG5cbiAgICBuYW1lZFF1ZXJpZXMgPSBwYXJzZVN0eWxlVG9PYmplY3QoZXh0cmFjdGVkU3R5bGVzKTtcblxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lZFF1ZXJpZXMpIHtcbiAgICAgIGlmKG5hbWVkUXVlcmllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNlbGYucXVlcmllcy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgdmFsdWU6IGBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogJHtuYW1lZFF1ZXJpZXNba2V5XX0pYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpO1xuXG4gICAgdGhpcy5fd2F0Y2hlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBpcyBhdCBsZWFzdCBhcyB3aWRlIGFzIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0J3Mgc21hbGxlci5cbiAgICovXG4gIGF0TGVhc3Qoc2l6ZSkge1xuICAgIHZhciBxdWVyeSA9IHRoaXMuZ2V0KHNpemUpO1xuXG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICByZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpLm1hdGNoZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZWRpYSBxdWVyeSBvZiBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfG51bGx9IC0gVGhlIG1lZGlhIHF1ZXJ5IG9mIHRoZSBicmVha3BvaW50LCBvciBgbnVsbGAgaWYgdGhlIGJyZWFrcG9pbnQgZG9lc24ndCBleGlzdC5cbiAgICovXG4gIGdldChzaXplKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJpZXMpIHtcbiAgICAgIGlmKHRoaXMucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG4gICAgICAgIGlmIChzaXplID09PSBxdWVyeS5uYW1lKSByZXR1cm4gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cbiAgICovXG4gIF9nZXRDdXJyZW50U2l6ZSgpIHtcbiAgICB2YXIgbWF0Y2hlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5xdWVyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG5cbiAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShxdWVyeS52YWx1ZSkubWF0Y2hlcykge1xuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG1hdGNoZWQubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXRjaGVyKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLm1lZGlhcXVlcnknLCAoKSA9PiB7XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xuXG4gICAgICBpZiAobmV3U2l6ZSAhPT0gY3VycmVudFNpemUpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5ld1NpemU7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xuICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgW25ld1NpemUsIGN1cnJlbnRTaXplXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cbi8vIEF1dGhvcnMgJiBjb3B5cmlnaHQgKGMpIDIwMTI6IFNjb3R0IEplaGwsIFBhdWwgSXJpc2gsIE5pY2hvbGFzIFpha2FzLCBEYXZpZCBLbmlnaHQuIER1YWwgTUlUL0JTRCBsaWNlbnNlXG53aW5kb3cubWF0Y2hNZWRpYSB8fCAod2luZG93Lm1hdGNoTWVkaWEgPSBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XG5cbiAgLy8gRm9yIHRob3NlIHRoYXQgZG9uJ3Qgc3VwcG9ydCBtYXRjaE1lZGl1bVxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyksXG4gICAgc2NyaXB0ICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xuXG4gICAgc3R5bGUudHlwZSAgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcblxuICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAvLyBjb25zb2xlLmxvZyhzdGFydCwgdHMpO1xuICAgIHByb2cgPSB0cyAtIHN0YXJ0O1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuXG4gICAgaWYocHJvZyA8IGR1cmF0aW9uKXsgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSwgZWxlbSk7IH1cbiAgICBlbHNle1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW0pO1xuICAgICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgfVxuICB9XG4gIGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUpO1xufVxuXG4vKipcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb3IgSFRNTCBvYmplY3QgdG8gYW5pbWF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhbmltYXRpb24gLSBDU1MgY2xhc3MgdG8gdXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcblxuICBlbGVtZW50XG4gICAgLmFkZENsYXNzKGFuaW1hdGlvbilcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnRcbiAgICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnJylcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoZWxlbWVudCksIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7aW5pdENsYXNzfSAke2FjdGl2ZUNsYXNzfSAke2FuaW1hdGlvbn1gKTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk1vdmUgPSBNb3ZlO1xuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTmVzdCA9IHtcbiAgRmVhdGhlcihtZW51LCB0eXBlID0gJ3pmJykge1xuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XG5cbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykuYXR0cih7J3JvbGUnOiAnbWVudWl0ZW0nfSksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnUuZmluZCgnYTpmaXJzdCcpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG5cbiAgICBpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG5cbiAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAkaXRlbVxuICAgICAgICAgIC5hZGRDbGFzcyhoYXNTdWJDbGFzcylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW0uYWRkQ2xhc3MoYGlzLXN1Ym1lbnUtaXRlbSAke3N1Ykl0ZW1DbGFzc31gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfSxcblxuICBCdXJuKG1lbnUsIHR5cGUpIHtcbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgbWVudVxuICAgICAgLmZpbmQoJyonKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3N1Yk1lbnVDbGFzc30gJHtzdWJJdGVtQ2xhc3N9ICR7aGFzU3ViQ2xhc3N9IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51IGlzLWFjdGl2ZWApXG4gICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykuY3NzKCdkaXNwbGF5JywgJycpO1xuXG4gICAgLy8gY29uc29sZS5sb2coICAgICAgbWVudS5maW5kKCcuJyArIHN1Yk1lbnVDbGFzcyArICcsIC4nICsgc3ViSXRlbUNsYXNzICsgJywgLmhhcy1zdWJtZW51LCAuaXMtc3VibWVudS1pdGVtLCAuc3VibWVudSwgW2RhdGEtc3VibWVudV0nKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQ2xhc3Moc3ViTWVudUNsYXNzICsgJyAnICsgc3ViSXRlbUNsYXNzICsgJyBoYXMtc3VibWVudSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKSk7XG4gICAgLy8gaXRlbXMuZWFjaChmdW5jdGlvbigpe1xuICAgIC8vICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAvLyAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG4gICAgLy8gICBpZigkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2lzLXN1Ym1lbnUtaXRlbSAnICsgc3ViSXRlbUNsYXNzKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGlmKCRzdWIubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2hhcy1zdWJtZW51Jyk7XG4gICAgLy8gICAgICRzdWIucmVtb3ZlQ2xhc3MoJ3N1Ym1lbnUgJyArIHN1Yk1lbnVDbGFzcykucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5OZXN0ID0gTmVzdDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5mdW5jdGlvbiBUaW1lcihlbGVtLCBvcHRpb25zLCBjYikge1xuICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uLC8vb3B0aW9ucyBpcyBhbiBvYmplY3QgZm9yIGVhc2lseSBhZGRpbmcgZmVhdHVyZXMgbGF0ZXIuXG4gICAgICBuYW1lU3BhY2UgPSBPYmplY3Qua2V5cyhlbGVtLmRhdGEoKSlbMF0gfHwgJ3RpbWVyJyxcbiAgICAgIHJlbWFpbiA9IC0xLFxuICAgICAgc3RhcnQsXG4gICAgICB0aW1lcjtcblxuICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG5cbiAgdGhpcy5yZXN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVtYWluID0gLTE7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aGlzLnN0YXJ0KCk7XG4gIH1cblxuICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICAgIC8vIGlmKCFlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgcmVtYWluID0gcmVtYWluIDw9IDAgPyBkdXJhdGlvbiA6IHJlbWFpbjtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIGZhbHNlKTtcbiAgICBzdGFydCA9IERhdGUubm93KCk7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBpZihvcHRpb25zLmluZmluaXRlKXtcbiAgICAgICAgX3RoaXMucmVzdGFydCgpOy8vcmVydW4gdGhlIHRpbWVyLlxuICAgICAgfVxuICAgICAgY2IoKTtcbiAgICB9LCByZW1haW4pO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJzdGFydC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxuXG4gIHRoaXMucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gdHJ1ZTtcbiAgICAvL2lmKGVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIHRydWUpO1xuICAgIHZhciBlbmQgPSBEYXRlLm5vdygpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiAtIChlbmQgLSBzdGFydCk7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnBhdXNlZC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1bnMgYSBjYWxsYmFjayBmdW5jdGlvbiB3aGVuIGltYWdlcyBhcmUgZnVsbHkgbG9hZGVkLlxuICogQHBhcmFtIHtPYmplY3R9IGltYWdlcyAtIEltYWdlKHMpIHRvIGNoZWNrIGlmIGxvYWRlZC5cbiAqIEBwYXJhbSB7RnVuY30gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gaW1hZ2UgaXMgZnVsbHkgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBvbkltYWdlc0xvYWRlZChpbWFnZXMsIGNhbGxiYWNrKXtcbiAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgdW5sb2FkZWQgPSBpbWFnZXMubGVuZ3RoO1xuXG4gIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICBpbWFnZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb21wbGV0ZSkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHRoaXMubmF0dXJhbFdpZHRoICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLm5hdHVyYWxXaWR0aCA+IDApIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJCh0aGlzKS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gc2luZ2xlSW1hZ2VMb2FkZWQoKSB7XG4gICAgdW5sb2FkZWQtLTtcbiAgICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG59XG5cbkZvdW5kYXRpb24uVGltZXIgPSBUaW1lcjtcbkZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQgPSBvbkltYWdlc0xvYWRlZDtcblxufShqUXVlcnkpO1xuIiwiLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKldvcmsgaW5zcGlyZWQgYnkgbXVsdGlwbGUganF1ZXJ5IHN3aXBlIHBsdWdpbnMqKlxuLy8qKkRvbmUgYnkgWW9oYWkgQXJhcmF0ICoqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKGZ1bmN0aW9uKCQpIHtcblxuICAkLnNwb3RTd2lwZSA9IHtcbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgIGVuYWJsZWQ6ICdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICBwcmV2ZW50RGVmYXVsdDogZmFsc2UsXG4gICAgbW92ZVRocmVzaG9sZDogNzUsXG4gICAgdGltZVRocmVzaG9sZDogMjAwXG4gIH07XG5cbiAgdmFyICAgc3RhcnRQb3NYLFxuICAgICAgICBzdGFydFBvc1ksXG4gICAgICAgIHN0YXJ0VGltZSxcbiAgICAgICAgZWxhcHNlZFRpbWUsXG4gICAgICAgIGlzTW92aW5nID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gb25Ub3VjaEVuZCgpIHtcbiAgICAvLyAgYWxlcnQodGhpcyk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQpO1xuICAgIGlzTW92aW5nID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoTW92ZShlKSB7XG4gICAgaWYgKCQuc3BvdFN3aXBlLnByZXZlbnREZWZhdWx0KSB7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgIGlmKGlzTW92aW5nKSB7XG4gICAgICB2YXIgeCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHZhciB5ID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgdmFyIGR4ID0gc3RhcnRQb3NYIC0geDtcbiAgICAgIHZhciBkeSA9IHN0YXJ0UG9zWSAtIHk7XG4gICAgICB2YXIgZGlyO1xuICAgICAgZWxhcHNlZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZTtcbiAgICAgIGlmKE1hdGguYWJzKGR4KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgICAgZGlyID0gZHggPiAwID8gJ2xlZnQnIDogJ3JpZ2h0JztcbiAgICAgIH1cbiAgICAgIC8vIGVsc2UgaWYoTWF0aC5hYnMoZHkpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgLy8gICBkaXIgPSBkeSA+IDAgPyAnZG93bicgOiAndXAnO1xuICAgICAgLy8gfVxuICAgICAgaWYoZGlyKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgb25Ub3VjaEVuZC5jYWxsKHRoaXMpO1xuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3N3aXBlJywgZGlyKS50cmlnZ2VyKGBzd2lwZSR7ZGlyfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hTdGFydChlKSB7XG4gICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgc3RhcnRQb3NYID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgc3RhcnRQb3NZID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgaXNNb3ZpbmcgPSB0cnVlO1xuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlLCBmYWxzZSk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyICYmIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCwgZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGVhcmRvd24oKSB7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0KTtcbiAgfVxuXG4gICQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHsgc2V0dXA6IGluaXQgfTtcblxuICAkLmVhY2goWydsZWZ0JywgJ3VwJywgJ2Rvd24nLCAncmlnaHQnXSwgZnVuY3Rpb24gKCkge1xuICAgICQuZXZlbnQuc3BlY2lhbFtgc3dpcGUke3RoaXN9YF0gPSB7IHNldHVwOiBmdW5jdGlvbigpe1xuICAgICAgJCh0aGlzKS5vbignc3dpcGUnLCAkLm5vb3ApO1xuICAgIH0gfTtcbiAgfSk7XG59KShqUXVlcnkpO1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1ldGhvZCBmb3IgYWRkaW5nIHBzdWVkbyBkcmFnIGV2ZW50cyB0byBlbGVtZW50cyAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIWZ1bmN0aW9uKCQpe1xuICAkLmZuLmFkZFRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSxlbCl7XG4gICAgICAkKGVsKS5iaW5kKCd0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsZnVuY3Rpb24oKXtcbiAgICAgICAgLy93ZSBwYXNzIHRoZSBvcmlnaW5hbCBldmVudCBvYmplY3QgYmVjYXVzZSB0aGUgalF1ZXJ5IGV2ZW50XG4gICAgICAgIC8vb2JqZWN0IGlzIG5vcm1hbGl6ZWQgdG8gdzNjIHNwZWNzIGFuZCBkb2VzIG5vdCBwcm92aWRlIHRoZSBUb3VjaExpc3RcbiAgICAgICAgaGFuZGxlVG91Y2goZXZlbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgaGFuZGxlVG91Y2ggPSBmdW5jdGlvbihldmVudCl7XG4gICAgICB2YXIgdG91Y2hlcyA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzLFxuICAgICAgICAgIGZpcnN0ID0gdG91Y2hlc1swXSxcbiAgICAgICAgICBldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgdG91Y2hzdGFydDogJ21vdXNlZG93bicsXG4gICAgICAgICAgICB0b3VjaG1vdmU6ICdtb3VzZW1vdmUnLFxuICAgICAgICAgICAgdG91Y2hlbmQ6ICdtb3VzZXVwJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdHlwZSA9IGV2ZW50VHlwZXNbZXZlbnQudHlwZV0sXG4gICAgICAgICAgc2ltdWxhdGVkRXZlbnRcbiAgICAgICAgO1xuXG4gICAgICBpZignTW91c2VFdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuTW91c2VFdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IG5ldyB3aW5kb3cuTW91c2VFdmVudCh0eXBlLCB7XG4gICAgICAgICAgJ2J1YmJsZXMnOiB0cnVlLFxuICAgICAgICAgICdjYW5jZWxhYmxlJzogdHJ1ZSxcbiAgICAgICAgICAnc2NyZWVuWCc6IGZpcnN0LnNjcmVlblgsXG4gICAgICAgICAgJ3NjcmVlblknOiBmaXJzdC5zY3JlZW5ZLFxuICAgICAgICAgICdjbGllbnRYJzogZmlyc3QuY2xpZW50WCxcbiAgICAgICAgICAnY2xpZW50WSc6IGZpcnN0LmNsaWVudFlcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdNb3VzZUV2ZW50Jyk7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50LmluaXRNb3VzZUV2ZW50KHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSwgZmlyc3Quc2NyZWVuWCwgZmlyc3Quc2NyZWVuWSwgZmlyc3QuY2xpZW50WCwgZmlyc3QuY2xpZW50WSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAvKmxlZnQqLywgbnVsbCk7XG4gICAgICB9XG4gICAgICBmaXJzdC50YXJnZXQuZGlzcGF0Y2hFdmVudChzaW11bGF0ZWRFdmVudCk7XG4gICAgfTtcbiAgfTtcbn0oalF1ZXJ5KTtcblxuXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipGcm9tIHRoZSBqUXVlcnkgTW9iaWxlIExpYnJhcnkqKlxuLy8qKm5lZWQgdG8gcmVjcmVhdGUgZnVuY3Rpb25hbGl0eSoqXG4vLyoqYW5kIHRyeSB0byBpbXByb3ZlIGlmIHBvc3NpYmxlKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKiBSZW1vdmluZyB0aGUgalF1ZXJ5IGZ1bmN0aW9uICoqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4oZnVuY3Rpb24oICQsIHdpbmRvdywgdW5kZWZpbmVkICkge1xuXG5cdHZhciAkZG9jdW1lbnQgPSAkKCBkb2N1bWVudCApLFxuXHRcdC8vIHN1cHBvcnRUb3VjaCA9ICQubW9iaWxlLnN1cHBvcnQudG91Y2gsXG5cdFx0dG91Y2hTdGFydEV2ZW50ID0gJ3RvdWNoc3RhcnQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCIsXG5cdFx0dG91Y2hTdG9wRXZlbnQgPSAndG91Y2hlbmQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIixcblx0XHR0b3VjaE1vdmVFdmVudCA9ICd0b3VjaG1vdmUnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNobW92ZVwiIDogXCJtb3VzZW1vdmVcIjtcblxuXHQvLyBzZXR1cCBuZXcgZXZlbnQgc2hvcnRjdXRzXG5cdCQuZWFjaCggKCBcInRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIFwiICtcblx0XHRcInN3aXBlIHN3aXBlbGVmdCBzd2lwZXJpZ2h0XCIgKS5zcGxpdCggXCIgXCIgKSwgZnVuY3Rpb24oIGksIG5hbWUgKSB7XG5cblx0XHQkLmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRyZXR1cm4gZm4gPyB0aGlzLmJpbmQoIG5hbWUsIGZuICkgOiB0aGlzLnRyaWdnZXIoIG5hbWUgKTtcblx0XHR9O1xuXG5cdFx0Ly8galF1ZXJ5IDwgMS44XG5cdFx0aWYgKCAkLmF0dHJGbiApIHtcblx0XHRcdCQuYXR0ckZuWyBuYW1lIF0gPSB0cnVlO1xuXHRcdH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gdHJpZ2dlckN1c3RvbUV2ZW50KCBvYmosIGV2ZW50VHlwZSwgZXZlbnQsIGJ1YmJsZSApIHtcblx0XHR2YXIgb3JpZ2luYWxUeXBlID0gZXZlbnQudHlwZTtcblx0XHRldmVudC50eXBlID0gZXZlbnRUeXBlO1xuXHRcdGlmICggYnViYmxlICkge1xuXHRcdFx0JC5ldmVudC50cmlnZ2VyKCBldmVudCwgdW5kZWZpbmVkLCBvYmogKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JC5ldmVudC5kaXNwYXRjaC5jYWxsKCBvYmosIGV2ZW50ICk7XG5cdFx0fVxuXHRcdGV2ZW50LnR5cGUgPSBvcmlnaW5hbFR5cGU7XG5cdH1cblxuXHQvLyBhbHNvIGhhbmRsZXMgdGFwaG9sZFxuXG5cdC8vIEFsc28gaGFuZGxlcyBzd2lwZWxlZnQsIHN3aXBlcmlnaHRcblx0JC5ldmVudC5zcGVjaWFsLnN3aXBlID0ge1xuXG5cdFx0Ly8gTW9yZSB0aGFuIHRoaXMgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQsIGFuZCB3ZSB3aWxsIHN1cHByZXNzIHNjcm9sbGluZy5cblx0XHRzY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkOiAzMCxcblxuXHRcdC8vIE1vcmUgdGltZSB0aGFuIHRoaXMsIGFuZCBpdCBpc24ndCBhIHN3aXBlLlxuXHRcdGR1cmF0aW9uVGhyZXNob2xkOiAxMDAwLFxuXG5cdFx0Ly8gU3dpcGUgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBtb3JlIHRoYW4gdGhpcy5cblx0XHRob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Ly8gU3dpcGUgdmVydGljYWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbGVzcyB0aGFuIHRoaXMuXG5cdFx0dmVydGljYWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHRnZXRMb2NhdGlvbjogZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRcdHZhciB3aW5QYWdlWCA9IHdpbmRvdy5wYWdlWE9mZnNldCxcblx0XHRcdFx0d2luUGFnZVkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG5cdFx0XHRcdHggPSBldmVudC5jbGllbnRYLFxuXHRcdFx0XHR5ID0gZXZlbnQuY2xpZW50WTtcblxuXHRcdFx0aWYgKCBldmVudC5wYWdlWSA9PT0gMCAmJiBNYXRoLmZsb29yKCB5ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWSApIHx8XG5cdFx0XHRcdGV2ZW50LnBhZ2VYID09PSAwICYmIE1hdGguZmxvb3IoIHggKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gaU9TNCBjbGllbnRYL2NsaWVudFkgaGF2ZSB0aGUgdmFsdWUgdGhhdCBzaG91bGQgaGF2ZSBiZWVuXG5cdFx0XHRcdC8vIGluIHBhZ2VYL3BhZ2VZLiBXaGlsZSBwYWdlWC9wYWdlLyBoYXZlIHRoZSB2YWx1ZSAwXG5cdFx0XHRcdHggPSB4IC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSB5IC0gd2luUGFnZVk7XG5cdFx0XHR9IGVsc2UgaWYgKCB5IDwgKCBldmVudC5wYWdlWSAtIHdpblBhZ2VZKSB8fCB4IDwgKCBldmVudC5wYWdlWCAtIHdpblBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gU29tZSBBbmRyb2lkIGJyb3dzZXJzIGhhdmUgdG90YWxseSBib2d1cyB2YWx1ZXMgZm9yIGNsaWVudFgvWVxuXHRcdFx0XHQvLyB3aGVuIHNjcm9sbGluZy96b29taW5nIGEgcGFnZS4gRGV0ZWN0YWJsZSBzaW5jZSBjbGllbnRYL2NsaWVudFlcblx0XHRcdFx0Ly8gc2hvdWxkIG5ldmVyIGJlIHNtYWxsZXIgdGhhbiBwYWdlWC9wYWdlWSBtaW51cyBwYWdlIHNjcm9sbFxuXHRcdFx0XHR4ID0gZXZlbnQucGFnZVggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IGV2ZW50LnBhZ2VZIC0gd2luUGFnZVk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0YXJ0OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdLFxuXHRcdFx0XHRcdFx0b3JpZ2luOiAkKCBldmVudC50YXJnZXQgKVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF1cblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRoYW5kbGVTd2lwZTogZnVuY3Rpb24oIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICkge1xuXHRcdFx0aWYgKCBzdG9wLnRpbWUgLSBzdGFydC50aW1lIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLmR1cmF0aW9uVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMSBdIC0gc3RvcC5jb29yZHNbIDEgXSApIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLnZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQgKSB7XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSBzdGFydC5jb29yZHNbMF0gPiBzdG9wLmNvb3Jkc1sgMCBdID8gXCJzd2lwZWxlZnRcIiA6IFwic3dpcGVyaWdodFwiO1xuXG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgXCJzd2lwZVwiLCAkLkV2ZW50KCBcInN3aXBlXCIsIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0pLCB0cnVlICk7XG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgZGlyZWN0aW9uLCQuRXZlbnQoIGRpcmVjdGlvbiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSApLCB0cnVlICk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0fSxcblxuXHRcdC8vIFRoaXMgc2VydmVzIGFzIGEgZmxhZyB0byBlbnN1cmUgdGhhdCBhdCBtb3N0IG9uZSBzd2lwZSBldmVudCBldmVudCBpc1xuXHRcdC8vIGluIHdvcmsgYXQgYW55IGdpdmVuIHRpbWVcblx0XHRldmVudEluUHJvZ3Jlc3M6IGZhbHNlLFxuXG5cdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cyxcblx0XHRcdFx0dGhpc09iamVjdCA9IHRoaXMsXG5cdFx0XHRcdCR0aGlzID0gJCggdGhpc09iamVjdCApLFxuXHRcdFx0XHRjb250ZXh0ID0ge307XG5cblx0XHRcdC8vIFJldHJpZXZlIHRoZSBldmVudHMgZGF0YSBmb3IgdGhpcyBlbGVtZW50IGFuZCBhZGQgdGhlIHN3aXBlIGNvbnRleHRcblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggIWV2ZW50cyApIHtcblx0XHRcdFx0ZXZlbnRzID0geyBsZW5ndGg6IDAgfTtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiwgZXZlbnRzICk7XG5cdFx0XHR9XG5cdFx0XHRldmVudHMubGVuZ3RoKys7XG5cdFx0XHRldmVudHMuc3dpcGUgPSBjb250ZXh0O1xuXG5cdFx0XHRjb250ZXh0LnN0YXJ0ID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXG5cdFx0XHRcdC8vIEJhaWwgaWYgd2UncmUgYWxyZWFkeSB3b3JraW5nIG9uIGEgc3dpcGUgZXZlbnRcblx0XHRcdFx0aWYgKCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gdHJ1ZTtcblxuXHRcdFx0XHR2YXIgc3RvcCxcblx0XHRcdFx0XHRzdGFydCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdGFydCggZXZlbnQgKSxcblx0XHRcdFx0XHRvcmlnVGFyZ2V0ID0gZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHRcdGVtaXR0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhc3RhcnQgfHwgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3RvcCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdG9wKCBldmVudCApO1xuXHRcdFx0XHRcdGlmICggIWVtaXR0ZWQgKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhhbmRsZVN3aXBlKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApO1xuXHRcdFx0XHRcdFx0aWYgKCBlbWl0dGVkICkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIHByZXZlbnQgc2Nyb2xsaW5nXG5cdFx0XHRcdFx0aWYgKCBNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZCApIHtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnRleHQuc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9IHRydWU7XG5cblx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHRcdFx0Y29udGV4dC5tb3ZlID0gbnVsbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkZG9jdW1lbnQub24oIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKVxuXHRcdFx0XHRcdC5vbmUoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdH07XG5cdFx0XHQkdGhpcy5vbiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0fSxcblxuXHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsIGNvbnRleHQ7XG5cblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggZXZlbnRzICkge1xuXHRcdFx0XHRjb250ZXh0ID0gZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRkZWxldGUgZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRldmVudHMubGVuZ3RoLS07XG5cdFx0XHRcdGlmICggZXZlbnRzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdFx0XHQkLnJlbW92ZURhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBjb250ZXh0ICkge1xuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RhcnQgKSB7XG5cdFx0XHRcdFx0JCggdGhpcyApLm9mZiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0Lm1vdmUgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5zdG9wICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0JC5lYWNoKHtcblx0XHRzd2lwZWxlZnQ6IFwic3dpcGUubGVmdFwiLFxuXHRcdHN3aXBlcmlnaHQ6IFwic3dpcGUucmlnaHRcIlxuXHR9LCBmdW5jdGlvbiggZXZlbnQsIHNvdXJjZUV2ZW50ICkge1xuXG5cdFx0JC5ldmVudC5zcGVjaWFsWyBldmVudCBdID0ge1xuXHRcdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkuYmluZCggc291cmNlRXZlbnQsICQubm9vcCApO1xuXHRcdFx0fSxcblx0XHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnVuYmluZCggc291cmNlRXZlbnQgKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn0pKCBqUXVlcnksIHRoaXMgKTtcbiovXG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmAgaW4gd2luZG93KSB7XG4gICAgICByZXR1cm4gd2luZG93W2Ake3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSgpKTtcblxuY29uc3QgdHJpZ2dlcnMgPSAoZWwsIHR5cGUpID0+IHtcbiAgZWwuZGF0YSh0eXBlKS5zcGxpdCgnICcpLmZvckVhY2goaWQgPT4ge1xuICAgICQoYCMke2lkfWApWyB0eXBlID09PSAnY2xvc2UnID8gJ3RyaWdnZXInIDogJ3RyaWdnZXJIYW5kbGVyJ10oYCR7dHlwZX0uemYudHJpZ2dlcmAsIFtlbF0pO1xuICB9KTtcbn07XG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLW9wZW5dIHdpbGwgcmV2ZWFsIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtb3Blbl0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ29wZW4nKTtcbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NlXSB3aWxsIGNsb3NlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuLy8gSWYgdXNlZCB3aXRob3V0IGEgdmFsdWUgb24gW2RhdGEtY2xvc2VdLCB0aGUgZXZlbnQgd2lsbCBidWJibGUsIGFsbG93aW5nIGl0IHRvIGNsb3NlIGEgcGFyZW50IGNvbXBvbmVudC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NlXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ2Nsb3NlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICdjbG9zZScpO1xuICB9XG4gIGVsc2Uge1xuICAgICQodGhpcykudHJpZ2dlcignY2xvc2UuemYudHJpZ2dlcicpO1xuICB9XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS10b2dnbGVdIHdpbGwgdG9nZ2xlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAndG9nZ2xlJyk7XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zYWJsZV0gd2lsbCByZXNwb25kIHRvIGNsb3NlLnpmLnRyaWdnZXIgZXZlbnRzLlxuJChkb2N1bWVudCkub24oJ2Nsb3NlLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2FibGVdJywgZnVuY3Rpb24oZSl7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGxldCBhbmltYXRpb24gPSAkKHRoaXMpLmRhdGEoJ2Nsb3NhYmxlJyk7XG5cbiAgaWYoYW5pbWF0aW9uICE9PSAnJyl7XG4gICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCgkKHRoaXMpLCBhbmltYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgICB9KTtcbiAgfWVsc2V7XG4gICAgJCh0aGlzKS5mYWRlT3V0KCkudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gIH1cbn0pO1xuXG4kKGRvY3VtZW50KS5vbignZm9jdXMuemYudHJpZ2dlciBibHVyLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlLWZvY3VzXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ3RvZ2dsZS1mb2N1cycpO1xuICAkKGAjJHtpZH1gKS50cmlnZ2VySGFuZGxlcigndG9nZ2xlLnpmLnRyaWdnZXInLCBbJCh0aGlzKV0pO1xufSk7XG5cbi8qKlxuKiBGaXJlcyBvbmNlIGFmdGVyIGFsbCBvdGhlciBzY3JpcHRzIGhhdmUgbG9hZGVkXG4qIEBmdW5jdGlvblxuKiBAcHJpdmF0ZVxuKi9cbiQod2luZG93KS5sb2FkKCgpID0+IHtcbiAgY2hlY2tMaXN0ZW5lcnMoKTtcbn0pO1xuXG5mdW5jdGlvbiBjaGVja0xpc3RlbmVycygpIHtcbiAgZXZlbnRzTGlzdGVuZXIoKTtcbiAgcmVzaXplTGlzdGVuZXIoKTtcbiAgc2Nyb2xsTGlzdGVuZXIoKTtcbiAgY2xvc2VtZUxpc3RlbmVyKCk7XG59XG5cbi8vKioqKioqKiogb25seSBmaXJlcyB0aGlzIGZ1bmN0aW9uIG9uY2Ugb24gbG9hZCwgaWYgdGhlcmUncyBzb21ldGhpbmcgdG8gd2F0Y2ggKioqKioqKipcbmZ1bmN0aW9uIGNsb3NlbWVMaXN0ZW5lcihwbHVnaW5OYW1lKSB7XG4gIHZhciB5ZXRpQm94ZXMgPSAkKCdbZGF0YS15ZXRpLWJveF0nKSxcbiAgICAgIHBsdWdOYW1lcyA9IFsnZHJvcGRvd24nLCAndG9vbHRpcCcsICdyZXZlYWwnXTtcblxuICBpZihwbHVnaW5OYW1lKXtcbiAgICBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLnB1c2gocGx1Z2luTmFtZSk7XG4gICAgfWVsc2UgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwbHVnaW5OYW1lWzBdID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMuY29uY2F0KHBsdWdpbk5hbWUpO1xuICAgIH1lbHNle1xuICAgICAgY29uc29sZS5lcnJvcignUGx1Z2luIG5hbWVzIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgfVxuICBpZih5ZXRpQm94ZXMubGVuZ3RoKXtcbiAgICBsZXQgbGlzdGVuZXJzID0gcGx1Z05hbWVzLm1hcCgobmFtZSkgPT4ge1xuICAgICAgcmV0dXJuIGBjbG9zZW1lLnpmLiR7bmFtZX1gO1xuICAgIH0pLmpvaW4oJyAnKTtcblxuICAgICQod2luZG93KS5vZmYobGlzdGVuZXJzKS5vbihsaXN0ZW5lcnMsIGZ1bmN0aW9uKGUsIHBsdWdpbklkKXtcbiAgICAgIGxldCBwbHVnaW4gPSBlLm5hbWVzcGFjZS5zcGxpdCgnLicpWzBdO1xuICAgICAgbGV0IHBsdWdpbnMgPSAkKGBbZGF0YS0ke3BsdWdpbn1dYCkubm90KGBbZGF0YS15ZXRpLWJveD1cIiR7cGx1Z2luSWR9XCJdYCk7XG5cbiAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICBsZXQgX3RoaXMgPSAkKHRoaXMpO1xuXG4gICAgICAgIF90aGlzLnRyaWdnZXJIYW5kbGVyKCdjbG9zZS56Zi50cmlnZ2VyJywgW190aGlzXSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNpemVMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXJlc2l6ZV0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZigncmVzaXplLnpmLnRyaWdnZXInKVxuICAgIC5vbigncmVzaXplLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAodGltZXIpIHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHJlc2l6ZSBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInJlc2l6ZVwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHJlc2l6ZSBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNjcm9sbExpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtc2Nyb2xsXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYudHJpZ2dlcicpXG4gICAgLm9uKCdzY3JvbGwuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYodGltZXIpeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgc2Nyb2xsIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwic2Nyb2xsXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgc2Nyb2xsIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XG4gIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2l6ZV0sIFtkYXRhLXNjcm9sbF0sIFtkYXRhLW11dGF0ZV0nKTtcblxuICAvL2VsZW1lbnQgY2FsbGJhY2tcbiAgdmFyIGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24gPSBmdW5jdGlvbihtdXRhdGlvblJlY29yZHNMaXN0KSB7XG4gICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcbiAgICAvL3RyaWdnZXIgdGhlIGV2ZW50IGhhbmRsZXIgZm9yIHRoZSBlbGVtZW50IGRlcGVuZGluZyBvbiB0eXBlXG4gICAgc3dpdGNoICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSkge1xuXG4gICAgICBjYXNlIFwicmVzaXplXCIgOlxuICAgICAgJHRhcmdldC50cmlnZ2VySGFuZGxlcigncmVzaXplbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0XSk7XG4gICAgICBicmVhaztcblxuICAgICAgY2FzZSBcInNjcm9sbFwiIDpcbiAgICAgICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInLCBbJHRhcmdldCwgd2luZG93LnBhZ2VZT2Zmc2V0XSk7XG4gICAgICBicmVhaztcblxuICAgICAgLy8gY2FzZSBcIm11dGF0ZVwiIDpcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGUnLCAkdGFyZ2V0KTtcbiAgICAgIC8vICR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ211dGF0ZS56Zi50cmlnZ2VyJyk7XG4gICAgICAvL1xuICAgICAgLy8gLy9tYWtlIHN1cmUgd2UgZG9uJ3QgZ2V0IHN0dWNrIGluIGFuIGluZmluaXRlIGxvb3AgZnJvbSBzbG9wcHkgY29kZWluZ1xuICAgICAgLy8gaWYgKCR0YXJnZXQuaW5kZXgoJ1tkYXRhLW11dGF0ZV0nKSA9PSAkKFwiW2RhdGEtbXV0YXRlXVwiKS5sZW5ndGgtMSkge1xuICAgICAgLy8gICBkb21NdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgICAvLyB9XG4gICAgICAvLyBicmVhaztcblxuICAgICAgZGVmYXVsdCA6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvL25vdGhpbmdcbiAgICB9XG4gIH1cblxuICBpZihub2Rlcy5sZW5ndGgpe1xuICAgIC8vZm9yIGVhY2ggZWxlbWVudCB0aGF0IG5lZWRzIHRvIGxpc3RlbiBmb3IgcmVzaXppbmcsIHNjcm9sbGluZywgKG9yIGNvbWluZyBzb29uIG11dGF0aW9uKSBhZGQgYSBzaW5nbGUgb2JzZXJ2ZXJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGgtMTsgaSsrKSB7XG4gICAgICBsZXQgZWxlbWVudE9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIobGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbik7XG4gICAgICBlbGVtZW50T2JzZXJ2ZXIub2JzZXJ2ZShub2Rlc1tpXSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IGZhbHNlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTpmYWxzZSwgYXR0cmlidXRlRmlsdGVyOltcImRhdGEtZXZlbnRzXCJdfSk7XG4gICAgfVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBbUEhdXG4vLyBGb3VuZGF0aW9uLkNoZWNrV2F0Y2hlcnMgPSBjaGVja1dhdGNoZXJzO1xuRm91bmRhdGlvbi5JSGVhcllvdSA9IGNoZWNrTGlzdGVuZXJzO1xuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XG4vLyBGb3VuZGF0aW9uLklGZWVsWW91ID0gY2xvc2VtZUxpc3RlbmVyO1xuXG59KGpRdWVyeSk7XG5cbi8vIGZ1bmN0aW9uIGRvbU11dGF0aW9uT2JzZXJ2ZXIoZGVib3VuY2UpIHtcbi8vICAgLy8gISEhIFRoaXMgaXMgY29taW5nIHNvb24gYW5kIG5lZWRzIG1vcmUgd29yazsgbm90IGFjdGl2ZSAgISEhIC8vXG4vLyAgIHZhciB0aW1lcixcbi8vICAgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1tdXRhdGVdJyk7XG4vLyAgIC8vXG4vLyAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbi8vICAgICAvLyB2YXIgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4vLyAgICAgLy8gICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbi8vICAgICAvLyAgIGZvciAodmFyIGk9MDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgLy8gICAgIGlmIChwcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJyBpbiB3aW5kb3cpIHtcbi8vICAgICAvLyAgICAgICByZXR1cm4gd2luZG93W3ByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInXTtcbi8vICAgICAvLyAgICAgfVxuLy8gICAgIC8vICAgfVxuLy8gICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuLy8gICAgIC8vIH0oKSk7XG4vL1xuLy9cbi8vICAgICAvL2ZvciB0aGUgYm9keSwgd2UgbmVlZCB0byBsaXN0ZW4gZm9yIGFsbCBjaGFuZ2VzIGVmZmVjdGluZyB0aGUgc3R5bGUgYW5kIGNsYXNzIGF0dHJpYnV0ZXNcbi8vICAgICB2YXIgYm9keU9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoYm9keU11dGF0aW9uKTtcbi8vICAgICBib2R5T2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UsIHN1YnRyZWU6dHJ1ZSwgYXR0cmlidXRlRmlsdGVyOltcInN0eWxlXCIsIFwiY2xhc3NcIl19KTtcbi8vXG4vL1xuLy8gICAgIC8vYm9keSBjYWxsYmFja1xuLy8gICAgIGZ1bmN0aW9uIGJvZHlNdXRhdGlvbihtdXRhdGUpIHtcbi8vICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBtdXRhdGlvbiBldmVudFxuLy8gICAgICAgaWYgKHRpbWVyKSB7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cbi8vXG4vLyAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgIGJvZHlPYnNlcnZlci5kaXNjb25uZWN0KCk7XG4vLyAgICAgICAgICQoJ1tkYXRhLW11dGF0ZV0nKS5hdHRyKCdkYXRhLWV2ZW50cycsXCJtdXRhdGVcIik7XG4vLyAgICAgICB9LCBkZWJvdW5jZSB8fCAxNTApO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEVxdWFsaXplciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZXF1YWxpemVyXG4gKi9cblxuY2xhc3MgRXF1YWxpemVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEVxdWFsaXplciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgRXF1YWxpemVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdFcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgRXF1YWxpemVyIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlcUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLWVxdWFsaXplcicpIHx8ICcnO1xuICAgIHZhciAkd2F0Y2hlZCA9IHRoaXMuJGVsZW1lbnQuZmluZChgW2RhdGEtZXF1YWxpemVyLXdhdGNoPVwiJHtlcUlkfVwiXWApO1xuXG4gICAgdGhpcy4kd2F0Y2hlZCA9ICR3YXRjaGVkLmxlbmd0aCA/ICR3YXRjaGVkIDogdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXItd2F0Y2hdJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLXJlc2l6ZScsIChlcUlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2VxJykpKTtcblxuICAgIHRoaXMuaGFzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzVW50aWwoZG9jdW1lbnQuYm9keSwgJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuX2JpbmRIYW5kbGVyID0ge1xuICAgICAgb25SZXNpemVNZUJvdW5kOiB0aGlzLl9vblJlc2l6ZU1lLmJpbmQodGhpcyksXG4gICAgICBvblBvc3RFcXVhbGl6ZWRCb3VuZDogdGhpcy5fb25Qb3N0RXF1YWxpemVkLmJpbmQodGhpcylcbiAgICB9O1xuXG4gICAgdmFyIGltZ3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgIHZhciB0b29TbWFsbDtcbiAgICBpZih0aGlzLm9wdGlvbnMuZXF1YWxpemVPbil7XG4gICAgICB0b29TbWFsbCA9IHRoaXMuX2NoZWNrTVEoKTtcbiAgICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fY2hlY2tNUS5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIH1cbiAgICBpZigodG9vU21hbGwgIT09IHVuZGVmaW5lZCAmJiB0b29TbWFsbCA9PT0gZmFsc2UpIHx8IHRvb1NtYWxsID09PSB1bmRlZmluZWQpe1xuICAgICAgaWYoaW1ncy5sZW5ndGgpe1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKGltZ3MsIHRoaXMuX3JlZmxvdy5iaW5kKHRoaXMpKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9yZWZsb3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMgaWYgdGhlIGJyZWFrcG9pbnQgaXMgdG9vIHNtYWxsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhdXNlRXZlbnRzKCkge1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKHtcbiAgICAgICcuemYuZXF1YWxpemVyJzogdGhpcy5fYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmQsXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGZ1bmN0aW9uIHRvIGhhbmRsZSAkZWxlbWVudHMgcmVzaXplbWUuemYudHJpZ2dlciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vblJlc2l6ZU1lKGUpIHtcbiAgICB0aGlzLl9yZWZsb3coKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHBvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25Qb3N0RXF1YWxpemVkKGUpIHtcbiAgICBpZihlLnRhcmdldCAhPT0gdGhpcy4kZWxlbWVudFswXSl7IHRoaXMuX3JlZmxvdygpOyB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBFcXVhbGl6ZXIuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICBpZih0aGlzLmhhc05lc3RlZCl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQpO1xuICAgIH1cbiAgICB0aGlzLmlzT24gPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBicmVha3BvaW50IHRvIHRoZSBtaW5pbXVtIHJlcXVpcmVkIHNpemUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNUSgpIHtcbiAgICB2YXIgdG9vU21hbGwgPSAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmVxdWFsaXplT24pO1xuICAgIGlmKHRvb1NtYWxsKXtcbiAgICAgIGlmKHRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgaWYoIXRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdG9vU21hbGw7XG4gIH1cblxuICAvKipcbiAgICogQSBub29wIHZlcnNpb24gZm9yIHRoZSBwbHVnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9raWxsc3dpdGNoKCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBFcXVhbGl6ZXIgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuZXF1YWxpemVPblN0YWNrKXtcbiAgICAgIGlmKHRoaXMuX2lzU3RhY2tlZCgpKXtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lcXVhbGl6ZUJ5Um93KSB7XG4gICAgICB0aGlzLmdldEhlaWdodHNCeVJvdyh0aGlzLmFwcGx5SGVpZ2h0QnlSb3cuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmdldEhlaWdodHModGhpcy5hcHBseUhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFudWFsbHkgZGV0ZXJtaW5lcyBpZiB0aGUgZmlyc3QgMiBlbGVtZW50cyBhcmUgKk5PVCogc3RhY2tlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pc1N0YWNrZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuJHdhdGNoZWRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICE9PSB0aGlzLiR3YXRjaGVkWzFdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKi9cbiAgZ2V0SGVpZ2h0cyhjYikge1xuICAgIHZhciBoZWlnaHRzID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIGhlaWdodHMucHVzaCh0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodCk7XG4gICAgfVxuICAgIGNiKGhlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICovXG4gIGdldEhlaWdodHNCeVJvdyhjYikge1xuICAgIHZhciBsYXN0RWxUb3BPZmZzZXQgPSAodGhpcy4kd2F0Y2hlZC5sZW5ndGggPyB0aGlzLiR3YXRjaGVkLmZpcnN0KCkub2Zmc2V0KCkudG9wIDogMCksXG4gICAgICAgIGdyb3VwcyA9IFtdLFxuICAgICAgICBncm91cCA9IDA7XG4gICAgLy9ncm91cCBieSBSb3dcbiAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIC8vbWF5YmUgY291bGQgdXNlIHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0VG9wXG4gICAgICB2YXIgZWxPZmZzZXRUb3AgPSAkKHRoaXMuJHdhdGNoZWRbaV0pLm9mZnNldCgpLnRvcDtcbiAgICAgIGlmIChlbE9mZnNldFRvcCE9bGFzdEVsVG9wT2Zmc2V0KSB7XG4gICAgICAgIGdyb3VwKys7XG4gICAgICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICAgICAgbGFzdEVsVG9wT2Zmc2V0PWVsT2Zmc2V0VG9wO1xuICAgICAgfVxuICAgICAgZ3JvdXBzW2dyb3VwXS5wdXNoKFt0aGlzLiR3YXRjaGVkW2ldLHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0XSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDAsIGxuID0gZ3JvdXBzLmxlbmd0aDsgaiA8IGxuOyBqKyspIHtcbiAgICAgIHZhciBoZWlnaHRzID0gJChncm91cHNbal0pLm1hcChmdW5jdGlvbigpeyByZXR1cm4gdGhpc1sxXTsgfSkuZ2V0KCk7XG4gICAgICB2YXIgbWF4ICAgICAgICAgPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAgIGdyb3Vwc1tqXS5wdXNoKG1heCk7XG4gICAgfVxuICAgIGNiKGdyb3Vwcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3RcbiAgICogQHBhcmFtIHthcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodChoZWlnaHRzKSB7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG5cbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgbWF4KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0IGJ5IHJvd1xuICAgKiBAcGFyYW0ge2FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkUm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0QnlSb3coZ3JvdXBzKSB7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgIHZhciBncm91cHNJTGVuZ3RoID0gZ3JvdXBzW2ldLmxlbmd0aCxcbiAgICAgICAgICBtYXggPSBncm91cHNbaV1bZ3JvdXBzSUxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGdyb3Vwc0lMZW5ndGg8PTIpIHtcbiAgICAgICAgJChncm91cHNbaV1bMF1bMF0pLmNzcyh7J2hlaWdodCc6J2F1dG8nfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIHBlciByb3cgYXJlIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgICBmb3IgKHZhciBqID0gMCwgbGVuSiA9IChncm91cHNJTGVuZ3RoLTEpOyBqIDwgbGVuSiA7IGorKykge1xuICAgICAgICAkKGdyb3Vwc1tpXVtqXVswXSkuY3NzKHsnaGVpZ2h0JzptYXh9KTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgcGVyIHJvdyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkVxdWFsaXplci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHdoZW4gc3RhY2tlZCBvbiBzbWFsbGVyIHNjcmVlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZXF1YWxpemVPblN0YWNrOiB0cnVlLFxuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gcm93IGJ5IHJvdy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXG4gIC8qKlxuICAgKiBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSB0aGUgcGx1Z2luIHNob3VsZCBlcXVhbGl6ZSBoZWlnaHRzIG9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBlcXVhbGl6ZU9uOiAnJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEVxdWFsaXplciwgJ0VxdWFsaXplcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmludGVyY2hhbmdlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICovXG5cbmNsYXNzIEludGVyY2hhbmdlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgSW50ZXJjaGFuZ2UuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEludGVyY2hhbmdlLmRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnJ1bGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnSW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5fYWRkQnJlYWtwb2ludHMoKTtcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBJbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLmludGVyY2hhbmdlJywgRm91bmRhdGlvbi51dGlsLnRocm90dGxlKHRoaXMuX3JlZmxvdy5iaW5kKHRoaXMpLCA1MCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEludGVyY2hhbmdlIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdmFyIG1hdGNoO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSwgYnV0IG9ubHkgc2F2ZSB0aGUgbGFzdCBtYXRjaFxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlcykge1xuICAgICAgaWYodGhpcy5ydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHRoaXMucnVsZXNbaV07XG5cbiAgICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHJ1bGUucXVlcnkpLm1hdGNoZXMpIHtcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgRm91bmRhdGlvbiBicmVha3BvaW50cyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgb2JqZWN0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCcmVha3BvaW50cygpIHtcbiAgICBmb3IgKHZhciBpIGluIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XG4gICAgICAgIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeS5uYW1lXSA9IHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIEludGVyY2hhbmdlIGVsZW1lbnQgZm9yIHRoZSBwcm92aWRlZCBtZWRpYSBxdWVyeSArIGNvbnRlbnQgcGFpcmluZ3NcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0aGF0IGlzIGFuIEludGVyY2hhbmdlIGluc3RhbmNlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gc2NlbmFyaW9zIC0gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGhhdmUgJ21xJyBhbmQgJ3BhdGgnIGtleXMgd2l0aCBjb3JyZXNwb25kaW5nIGtleXNcbiAgICovXG4gIF9nZW5lcmF0ZVJ1bGVzKGVsZW1lbnQpIHtcbiAgICB2YXIgcnVsZXNMaXN0ID0gW107XG4gICAgdmFyIHJ1bGVzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ydWxlcykge1xuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJykubWF0Y2goL1xcWy4qP1xcXS9nKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XG4gICAgICBpZihydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2ldLnNsaWNlKDEsIC0xKS5zcGxpdCgnLCAnKTtcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gcnVsZVtydWxlLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XG4gICAgICAgICAgcXVlcnkgPSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVsZXNMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBydWxlc0xpc3Q7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAtIFBhdGggdG8gdGhlIGltYWdlIG9yIEhUTUwgcGFydGlhbC5cbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAqL1xuICByZXBsYWNlKHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XG5cbiAgICAvLyBSZXBsYWNpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3NyYycsIHBhdGgpLmxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pXG4gICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXG4gICAgZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwuKGdpZnxqcGd8anBlZ3xwbmd8c3ZnfHRpZmYpKFs/I10uKik/L2kpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7ICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybCgnK3BhdGgrJyknIH0pXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBIVE1MXG4gICAgZWxzZSB7XG4gICAgICAkLmdldChwYXRoLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5odG1sKHJlc3BvbnNlKVxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgICAgICAkKHJlc3BvbnNlKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gY29udGVudCBpbiBhbiBJbnRlcmNoYW5nZSBlbGVtZW50IGlzIGRvbmUgYmVpbmcgbG9hZGVkLlxuICAgICAqIEBldmVudCBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgICAqL1xuICAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBpbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIC8vVE9ETyB0aGlzLlxuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkludGVyY2hhbmdlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgcnVsZXM6IG51bGxcbn07XG5cbkludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFUyA9IHtcbiAgJ2xhbmRzY2FwZSc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gICdwb3J0cmFpdCc6ICdzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgJ3JldGluYSc6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oSW50ZXJjaGFuZ2UsICdJbnRlcmNoYW5nZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZU1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuZHJvcGRvd24tbWVudVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVNZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSByZXNwb25zaXZlIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZU1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtbWVudScpO1xuICAgIHRoaXMuY3VycmVudE1xID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZU1lbnUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWVudSBieSBwYXJzaW5nIHRoZSBjbGFzc2VzIGZyb20gdGhlICdkYXRhLVJlc3BvbnNpdmVNZW51JyBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xuICAgIGlmICh0eXBlb2YgdGhpcy5ydWxlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBydWxlc1RyZWUgPSB7fTtcblxuICAgICAgLy8gUGFyc2UgcnVsZXMgZnJvbSBcImNsYXNzZXNcIiBwdWxsZWQgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgbGV0IHJ1bGVzID0gdGhpcy5ydWxlcy5zcGxpdCgnICcpO1xuXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZXZlcnkgcnVsZSBmb3VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGxldCBydWxlU2l6ZSA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMF0gOiAnc21hbGwnO1xuICAgICAgICBsZXQgcnVsZVBsdWdpbiA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMV0gOiBydWxlWzBdO1xuXG4gICAgICAgIGlmIChNZW51UGx1Z2luc1tydWxlUGx1Z2luXSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJ1bGVzVHJlZVtydWxlU2l6ZV0gPSBNZW51UGx1Z2luc1tydWxlUGx1Z2luXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xuICAgIH1cblxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XG4gICAgICB0aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSBNZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9KTtcbiAgICAvLyAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5SZXNwb25zaXZlTWVudScsIGZ1bmN0aW9uKCkge1xuICAgIC8vICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgLy8gfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IHNjcmVlbiB3aWR0aCBhZ2FpbnN0IGF2YWlsYWJsZSBtZWRpYSBxdWVyaWVzLiBJZiB0aGUgbWVkaWEgcXVlcnkgaGFzIGNoYW5nZWQsIGFuZCB0aGUgcGx1Z2luIG5lZWRlZCBoYXMgY2hhbmdlZCwgdGhlIHBsdWdpbnMgd2lsbCBzd2FwIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNZWRpYVF1ZXJpZXMoKSB7XG4gICAgdmFyIG1hdGNoZWRNcSwgX3RoaXMgPSB0aGlzO1xuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUgYW5kIGZpbmQgdGhlIGxhc3QgbWF0Y2hpbmcgcnVsZVxuICAgICQuZWFjaCh0aGlzLnJ1bGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChrZXkpKSB7XG4gICAgICAgIG1hdGNoZWRNcSA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vIG1hdGNoPyBObyBkaWNlXG4gICAgaWYgKCFtYXRjaGVkTXEpIHJldHVybjtcblxuICAgIC8vIFBsdWdpbiBhbHJlYWR5IGluaXRpYWxpemVkPyBXZSBnb29kXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbiBpbnN0YW5jZW9mIHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4pIHJldHVybjtcblxuICAgIC8vIFJlbW92ZSBleGlzdGluZyBwbHVnaW4tc3BlY2lmaWMgQ1NTIGNsYXNzZXNcbiAgICAkLmVhY2goTWVudVBsdWdpbnMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHZhbHVlLmNzc0NsYXNzKTtcbiAgICB9KTtcblxuICAgIC8vIEFkZCB0aGUgQ1NTIGNsYXNzIGZvciB0aGUgbmV3IHBsdWdpblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5ydWxlc1ttYXRjaGVkTXFdLmNzc0NsYXNzKTtcblxuICAgIC8vIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiB0aGUgbmV3IHBsdWdpblxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4pIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbmV3IHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4odGhpcy4kZWxlbWVudCwge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiB0aGUgY3VycmVudCBwbHVnaW4gb24gdGhpcyBlbGVtZW50LCBhcyB3ZWxsIGFzIHRoZSB3aW5kb3cgcmVzaXplIGhhbmRsZXIgdGhhdCBzd2l0Y2hlcyB0aGUgcGx1Z2lucyBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgICQod2luZG93KS5vZmYoJy56Zi5SZXNwb25zaXZlTWVudScpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlTWVudS5kZWZhdWx0cyA9IHt9O1xuXG4vLyBUaGUgcGx1Z2luIG1hdGNoZXMgdGhlIHBsdWdpbiBjbGFzc2VzIHdpdGggdGhlc2UgcGx1Z2luIGluc3RhbmNlcy5cbnZhciBNZW51UGx1Z2lucyA9IHtcbiAgZHJvcGRvd246IHtcbiAgICBjc3NDbGFzczogJ2Ryb3Bkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2Ryb3Bkb3duLW1lbnUnXSB8fCBudWxsXG4gIH0sXG4gZHJpbGxkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcmlsbGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJpbGxkb3duJ10gfHwgbnVsbFxuICB9LFxuICBhY2NvcmRpb246IHtcbiAgICBjc3NDbGFzczogJ2FjY29yZGlvbi1tZW51JyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2FjY29yZGlvbi1tZW51J10gfHwgbnVsbFxuICB9XG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZU1lbnUsICdSZXNwb25zaXZlTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZVRvZ2dsZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZVRvZ2dsZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRhYiBCYXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggdGFiIGJhciBmdW5jdGlvbmFsaXR5IHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFiIGJhciBieSBmaW5kaW5nIHRoZSB0YXJnZXQgZWxlbWVudCwgdG9nZ2xpbmcgZWxlbWVudCwgYW5kIHJ1bm5pbmcgdXBkYXRlKCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHRhcmdldElEID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLXRvZ2dsZScpO1xuICAgIGlmICghdGFyZ2V0SUQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdXIgdGFiIGJhciBuZWVkcyBhbiBJRCBvZiBhIE1lbnUgYXMgdGhlIHZhbHVlIG9mIGRhdGEtdGFiLWJhci4nKTtcbiAgICB9XG5cbiAgICB0aGlzLiR0YXJnZXRNZW51ID0gJChgIyR7dGFyZ2V0SUR9YCk7XG4gICAgdGhpcy4kdG9nZ2xlciA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdG9nZ2xlXScpO1xuXG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSB0YWIgYmFyIHRvIHdvcmsuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy5fdXBkYXRlTXFIYW5kbGVyID0gdGhpcy5fdXBkYXRlLmJpbmQodGhpcyk7XG4gICAgXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuXG4gICAgdGhpcy4kdG9nZ2xlci5vbignY2xpY2suemYucmVzcG9uc2l2ZVRvZ2dsZScsIHRoaXMudG9nZ2xlTWVudS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnkgdG8gZGV0ZXJtaW5lIGlmIHRoZSB0YWIgYmFyIHNob3VsZCBiZSB2aXNpYmxlIG9yIGhpZGRlbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlKCkge1xuICAgIC8vIE1vYmlsZVxuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3coKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuaGlkZSgpO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIuIFRoZSB0b2dnbGUgb25seSBoYXBwZW5zIGlmIHRoZSBzY3JlZW4gaXMgc21hbGwgZW5vdWdoIHRvIGFsbG93IGl0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgKi9cbiAgdG9nZ2xlTWVudSgpIHsgICBcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS50b2dnbGUoMCk7XG5cbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhciB0b2dnbGVzLlxuICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIH1cbiAgfTtcblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIHRoaXMuJHRvZ2dsZXIub2ZmKCcuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgIFxuICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG4gICAgXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgYnJlYWtwb2ludCBhZnRlciB3aGljaCB0aGUgbWVudSBpcyBhbHdheXMgc2hvd24sIGFuZCB0aGUgdGFiIGJhciBpcyBoaWRkZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ21lZGl1bSdcbiAgICovXG4gIGhpZGVGb3I6ICdtZWRpdW0nXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZVRvZ2dsZSwgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJldmVhbCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmV2ZWFsXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvbiBpZiB1c2luZyBhbmltYXRpb25zXG4gKi9cblxuY2xhc3MgUmV2ZWFsIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgUmV2ZWFsLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJldmVhbC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1JldmVhbCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1JldmVhbCcsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICd0YWJfZm9yd2FyZCcsXG4gICAgICAnU0hJRlRfVEFCJzogJ3RhYl9iYWNrd2FyZCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbW9kYWwgYnkgYWRkaW5nIHRoZSBvdmVybGF5IGFuZCBjbG9zZSBidXR0b25zLCAoaWYgc2VsZWN0ZWQpLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5pZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYWNoZWQgPSB7bXE6IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5jdXJyZW50fTtcbiAgICB0aGlzLmlzTW9iaWxlID0gbW9iaWxlU25pZmYoKTtcblxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkubGVuZ3RoID8gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKSA6ICQoYFtkYXRhLXRvZ2dsZT1cIiR7dGhpcy5pZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6IHRoaXMuaWQsXG4gICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZnVsbCcpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiA9IHRydWU7XG4gICAgICB0aGlzLm9wdGlvbnMub3ZlcmxheSA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgIXRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSB0aGlzLl9tYWtlT3ZlcmxheSh0aGlzLmlkKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICdkaWFsb2cnLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAnZGF0YS15ZXRpLWJveCc6IHRoaXMuaWQsXG4gICAgICAgICdkYXRhLXJlc2l6ZSc6IHRoaXMuaWRcbiAgICB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8odGhpcy4kb3ZlcmxheSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8oJCgnYm9keScpKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3dpdGhvdXQtb3ZlcmxheScpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rICYmIHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoIGAjJHt0aGlzLmlkfWApKSB7XG4gICAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnJldmVhbCcsIHRoaXMub3Blbi5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvdmVybGF5IGRpdiB0byBkaXNwbGF5IGJlaGluZCB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfbWFrZU92ZXJsYXkoaWQpIHtcbiAgICB2YXIgJG92ZXJsYXkgPSAkKCc8ZGl2PjwvZGl2PicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygncmV2ZWFsLW92ZXJsYXknKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICByZXR1cm4gJG92ZXJsYXk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBwb3NpdGlvbiBvZiBtb2RhbFxuICAgKiBUT0RPOiAgRmlndXJlIG91dCBpZiB3ZSBhY3R1YWxseSBuZWVkIHRvIGNhY2hlIHRoZXNlIHZhbHVlcyBvciBpZiBpdCBkb2Vzbid0IG1hdHRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZVBvc2l0aW9uKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpO1xuICAgIHZhciBvdXRlcldpZHRoID0gJCh3aW5kb3cpLndpZHRoKCk7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJIZWlnaHQoKTtcbiAgICB2YXIgb3V0ZXJIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgdmFyIGxlZnQsIHRvcDtcbiAgICBpZiAodGhpcy5vcHRpb25zLmhPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KChvdXRlcldpZHRoIC0gd2lkdGgpIC8gMiwgMTApO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLmhPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy52T2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGlmIChoZWlnaHQgPiBvdXRlckhlaWdodCkge1xuICAgICAgICB0b3AgPSBwYXJzZUludChNYXRoLm1pbigxMDAsIG91dGVySGVpZ2h0IC8gMTApLCAxMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b3AgPSBwYXJzZUludCgob3V0ZXJIZWlnaHQgLSBoZWlnaHQpIC8gNCwgMTApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0b3AgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMudk9mZnNldCwgMTApO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmNzcyh7dG9wOiB0b3AgKyAncHgnfSk7XG4gICAgLy8gb25seSB3b3JyeSBhYm91dCBsZWZ0IGlmIHdlIGRvbid0IGhhdmUgYW4gb3ZlcmxheSBvciB3ZSBoYXZlYSAgaG9yaXpvbnRhbCBvZmZzZXQsXG4gICAgLy8gb3RoZXJ3aXNlIHdlJ3JlIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlXG4gICAgaWYoIXRoaXMuJG92ZXJsYXkgfHwgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICE9PSAnYXV0bycpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bGVmdDogbGVmdCArICdweCd9KTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHttYXJnaW46ICcwcHgnfSk7XG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IChldmVudCwgJGVsZW1lbnQpID0+IHtcbiAgICAgICAgaWYgKChldmVudC50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdKSB8fFxuICAgICAgICAgICAgKCQoZXZlbnQudGFyZ2V0KS5wYXJlbnRzKCdbZGF0YS1jbG9zYWJsZV0nKVswXSA9PT0gJGVsZW1lbnQpKSB7IC8vIG9ubHkgY2xvc2UgcmV2ZWFsIHdoZW4gaXQncyBleHBsaWNpdGx5IGNhbGxlZFxuICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlLmFwcGx5KHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGFuY2hvci5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLndoaWNoID09PSAxMyB8fCBlLndoaWNoID09PSAzMikge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkub2ZmKCcuemYucmV2ZWFsJykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9uKGBwb3BzdGF0ZS56Zi5yZXZlYWw6JHt0aGlzLmlkfWAsIHRoaXMuX2hhbmRsZVN0YXRlLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIG1vZGFsIG1ldGhvZHMgb24gYmFjay9mb3J3YXJkIGJ1dHRvbiBjbGlja3Mgb3IgYW55IG90aGVyIGV2ZW50IHRoYXQgdHJpZ2dlcnMgcG9wc3RhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlU3RhdGUoZSkge1xuICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoICcjJyArIHRoaXMuaWQpICYmICF0aGlzLmlzQWN0aXZlKXsgdGhpcy5vcGVuKCk7IH1cbiAgICBlbHNleyB0aGlzLmNsb3NlKCk7IH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBtb2RhbCBjb250cm9sbGVkIGJ5IGB0aGlzLiRhbmNob3JgLCBhbmQgY2xvc2VzIGFsbCBvdGhlcnMgYnkgZGVmYXVsdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VtZVxuICAgKiBAZmlyZXMgUmV2ZWFsI29wZW5cbiAgICovXG4gIG9wZW4oKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGhhc2ggPSBgIyR7dGhpcy5pZH1gO1xuXG4gICAgICBpZiAod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKSB7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCBoYXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIE1ha2UgZWxlbWVudHMgaW52aXNpYmxlLCBidXQgcmVtb3ZlIGRpc3BsYXk6IG5vbmUgc28gd2UgY2FuIGdldCBzaXplIGFuZCBwb3NpdGlvbmluZ1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJ2hpZGRlbicgfSlcbiAgICAgICAgLnNob3coKVxuICAgICAgICAuc2Nyb2xsVG9wKDApO1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJ2hpZGRlbid9KS5zaG93KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5oaWRlKClcbiAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICcnIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5jc3Moeyd2aXNpYmlsaXR5JzogJyd9KS5oaWRlKCk7XG4gICAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYXN0JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnZmFzdCcpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdzbG93JykpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5hZGRDbGFzcygnc2xvdycpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlwbGVPcGVuZWQpIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBtb2RhbCBvcGVucy5cbiAgICAgICAqIENsb3NlcyBhbnkgb3RoZXIgbW9kYWxzIHRoYXQgYXJlIGN1cnJlbnRseSBvcGVuXG4gICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlbWVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnJldmVhbCcsIHRoaXMuaWQpO1xuICAgIH1cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uSW4pIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICBmdW5jdGlvbiBhZnRlckFuaW1hdGlvbkZvY3VzKCl7XG4gICAgICAgIF90aGlzLiRlbGVtZW50XG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZvY3VzKCk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2ZvY3VzJyk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJG92ZXJsYXksICdmYWRlLWluJyk7XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkluLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG4gICAgICAgIGFmdGVyQW5pbWF0aW9uRm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIHJldmVhbFxuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuc2hvdygwKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdyh0aGlzLm9wdGlvbnMuc2hvd0RlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgYWNjZXNzaWJpbGl0eVxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2UsXG4gICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICB9KVxuICAgICAgLmZvY3VzKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBtb2RhbCBoYXMgc3VjY2Vzc2Z1bGx5IG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgUmV2ZWFsI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYucmV2ZWFsJyk7XG5cbiAgICBpZiAodGhpcy5pc01vYmlsZSkge1xuICAgICAgdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICQoJ2h0bWwsIGJvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgfVxuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9leHRyYUhhbmRsZXJzKCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBleHRyYSBldmVudCBoYW5kbGVycyBmb3IgdGhlIGJvZHkgYW5kIHdpbmRvdyBpZiBuZWNlc3NhcnkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXh0cmFIYW5kbGVycygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgIXRoaXMub3B0aW9ucy5mdWxsU2NyZWVuKSB7XG4gICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGxvY2sgZm9jdXMgd2l0aGluIG1vZGFsIHdoaWxlIHRhYmJpbmdcbiAgICB0aGlzLiRlbGVtZW50Lm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKTtcbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgIHRhYl9mb3J3YXJkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpKSkgeyAvLyBsZWZ0IG1vZGFsIGRvd253YXJkcywgc2V0dGluZyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgICBfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5sZW5ndGggPT09IDApIHsgLy8gbm8gZm9jdXNhYmxlIGVsZW1lbnRzIGluc2lkZSB0aGUgbW9kYWwgYXQgYWxsLCBwcmV2ZW50IHRhYmJpbmcgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKSkgfHwgX3RoaXMuJGVsZW1lbnQuaXMoJzpmb2N1cycpKSB7IC8vIGxlZnQgbW9kYWwgdXB3YXJkcywgc2V0dGluZyBmb2N1cyB0byBsYXN0IGVsZW1lbnRcbiAgICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzLmVxKC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5sZW5ndGggPT09IDApIHsgLy8gbm8gZm9jdXNhYmxlIGVsZW1lbnRzIGluc2lkZSB0aGUgbW9kYWwgYXQgYWxsLCBwcmV2ZW50IHRhYmJpbmcgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJykpKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyAvLyBzZXQgZm9jdXMgYmFjayB0byBhbmNob3IgaWYgY2xvc2UgYnV0dG9uIGhhcyBiZWVuIGFjdGl2YXRlZFxuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMpKSB7IC8vIGRvbnQndCB0cmlnZ2VyIGlmIGFjdWFsIGVsZW1lbnQgaGFzIGZvY3VzIChpLmUuIGlucHV0cywgbGlua3MsIC4uLilcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYgKCF0aGlzLmlzQWN0aXZlIHx8ICF0aGlzLiRlbGVtZW50LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRvdmVybGF5LCAnZmFkZS1vdXQnLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiBoaWRpbmdcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmhpZGUoMCwgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSh0aGlzLm9wdGlvbnMuaGlkZURlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBDb25kaXRpb25hbHMgdG8gcmVtb3ZlIGV4dHJhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCBvbiBvcGVuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgJCgnYm9keScpLm9mZignY2xpY2suemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG5cbiAgICBmdW5jdGlvbiBmaW5pc2hVcCgpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICAgIGlmKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKSB7XG4gICAgICAgICAgJCgnYm9keScpLnNjcm9sbFRvcChfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyk7XG4gICAgICAgICAgX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgICAvKipcbiAgICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaXMgZG9uZSBjbG9zaW5nLlxuICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlZFxuICAgICAgKi9cbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlZC56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAqIFJlc2V0cyB0aGUgbW9kYWwgY29udGVudFxuICAgICogVGhpcyBwcmV2ZW50cyBhIHJ1bm5pbmcgdmlkZW8gdG8ga2VlcCBnb2luZyBpbiB0aGUgYmFja2dyb3VuZFxuICAgICovXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNldE9uQ2xvc2UpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaHRtbCh0aGlzLiRlbGVtZW50Lmh0bWwoKSk7XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICBpZiAoX3RoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUpIHtcbiAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShcIlwiLCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICAgICB9XG4gICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvcGVuL2Nsb3NlZCBzdGF0ZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXBwZW5kVG8oJCgnYm9keScpKTsgLy8gbW92ZSAkZWxlbWVudCBvdXRzaWRlIG9mICRvdmVybGF5IHRvIHByZXZlbnQgZXJyb3IgdW5yZWdpc3RlclBsdWdpbigpXG4gICAgICB0aGlzLiRvdmVybGF5LmhpZGUoKS5vZmYoKS5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5oaWRlKCkub2ZmKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmJyk7XG4gICAgJCh3aW5kb3cpLm9mZihgLnpmLnJldmVhbDoke3RoaXMuaWR9YCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cblJldmVhbC5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLWluLWxlZnQnXG4gICAqL1xuICBhbmltYXRpb25JbjogJycsXG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICAqL1xuICBhbmltYXRpb25PdXQ6ICcnLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBvcGVuaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgc2hvd0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBjbG9zaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgaGlkZURlbGF5OiAwLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkvb3ZlcmxheSB0byBjbG9zZSB0aGUgbW9kYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBjbG9zZSBpZiB0aGUgdXNlciBwcmVzc2VzIHRoZSBgRVNDQVBFYCBrZXkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkVzYzogdHJ1ZSxcbiAgLyoqXG4gICAqIElmIHRydWUsIGFsbG93cyBtdWx0aXBsZSBtb2RhbHMgdG8gYmUgZGlzcGxheWVkIGF0IG9uY2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpcGxlT3BlbmVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBkb3duIGZyb20gdGhlIHRvcCBvZiB0aGUgc2NyZWVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGF1dG9cbiAgICovXG4gIHZPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBpbiBmcm9tIHRoZSBzaWRlIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgaE9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBiZSBmdWxsc2NyZWVuLCBjb21wbGV0ZWx5IGJsb2NraW5nIG91dCB0aGUgcmVzdCBvZiB0aGUgdmlldy4gSlMgY2hlY2tzIGZvciB0aGlzIGFzIHdlbGwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZ1bGxTY3JlZW46IGZhbHNlLFxuICAvKipcbiAgICogUGVyY2VudGFnZSBvZiBzY3JlZW4gaGVpZ2h0IHRoZSBtb2RhbCBzaG91bGQgcHVzaCB1cCBmcm9tIHRoZSBib3R0b20gb2YgdGhlIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIGJ0bU9mZnNldFBjdDogMTAsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGdlbmVyYXRlIGFuIG92ZXJsYXkgZGl2LCB3aGljaCB3aWxsIGNvdmVyIHRoZSB2aWV3IHdoZW4gbW9kYWwgb3BlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgb3ZlcmxheTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gcmVtb3ZlIGFuZCByZWluamVjdCBtYXJrdXAgb24gY2xvc2UuIFNob3VsZCBiZSB0cnVlIGlmIHVzaW5nIHZpZGVvIGVsZW1lbnRzIHcvbyB1c2luZyBwcm92aWRlcidzIGFwaSwgb3RoZXJ3aXNlLCB2aWRlb3Mgd2lsbCBjb250aW51ZSB0byBwbGF5IGluIHRoZSBiYWNrZ3JvdW5kLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICByZXNldE9uQ2xvc2U6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhbHRlciB0aGUgdXJsIG9uIG9wZW4vY2xvc2UsIGFuZCBhbGxvd3MgdGhlIHVzZSBvZiB0aGUgYGJhY2tgIGJ1dHRvbiB0byBjbG9zZSBtb2RhbHMuIEFMU08sIGFsbG93cyBhIG1vZGFsIHRvIGF1dG8tbWFuaWFjYWxseSBvcGVuIG9uIHBhZ2UgbG9hZCBJRiB0aGUgaGFzaCA9PT0gdGhlIG1vZGFsJ3MgdXNlci1zZXQgaWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJldmVhbCwgJ1JldmVhbCcpO1xuXG5mdW5jdGlvbiBpUGhvbmVTbmlmZigpIHtcbiAgcmV0dXJuIC9pUChhZHxob25lfG9kKS4qT1MvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBhbmRyb2lkU25pZmYoKSB7XG4gIHJldHVybiAvQW5kcm9pZC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIG1vYmlsZVNuaWZmKCkge1xuICByZXR1cm4gaVBob25lU25pZmYoKSB8fCBhbmRyb2lkU25pZmYoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvZ2dsZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvZ2dsZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9nZ2xlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRvZ2dsZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9nZ2xlciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9nZ2xlci5kZWZhdWx0cywgZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xhc3NOYW1lID0gJyc7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb2dnbGVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFRvZ2dsZXIgcGx1Z2luIGJ5IHBhcnNpbmcgdGhlIHRvZ2dsZSBjbGFzcyBmcm9tIGRhdGEtdG9nZ2xlciwgb3IgYW5pbWF0aW9uIGNsYXNzZXMgZnJvbSBkYXRhLWFuaW1hdGUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlucHV0O1xuICAgIC8vIFBhcnNlIGFuaW1hdGlvbiBjbGFzc2VzIGlmIHRoZXkgd2VyZSBzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIGlucHV0ID0gdGhpcy5vcHRpb25zLmFuaW1hdGUuc3BsaXQoJyAnKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25JbiA9IGlucHV0WzBdO1xuICAgICAgdGhpcy5hbmltYXRpb25PdXQgPSBpbnB1dFsxXSB8fCBudWxsO1xuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHBhcnNlIHRvZ2dsZSBjbGFzc1xuICAgIGVsc2Uge1xuICAgICAgaW5wdXQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3RvZ2dsZXInKTtcbiAgICAgIC8vIEFsbG93IGZvciBhIC4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IGlucHV0WzBdID09PSAnLicgPyBpbnB1dC5zbGljZSgxKSA6IGlucHV0O1xuICAgIH1cblxuICAgIC8vIEFkZCBBUklBIGF0dHJpYnV0ZXMgdG8gdHJpZ2dlcnNcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkO1xuICAgICQoYFtkYXRhLW9wZW49XCIke2lkfVwiXSwgW2RhdGEtY2xvc2U9XCIke2lkfVwiXSwgW2RhdGEtdG9nZ2xlPVwiJHtpZH1cIl1gKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG4gICAgLy8gSWYgdGhlIHRhcmdldCBpcyBoaWRkZW4sIGFkZCBhcmlhLWhpZGRlblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgdG9nZ2xlIHRyaWdnZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZigndG9nZ2xlLnpmLnRyaWdnZXInKS5vbigndG9nZ2xlLnpmLnRyaWdnZXInLCB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSB0YXJnZXQgY2xhc3Mgb24gdGhlIHRhcmdldCBlbGVtZW50LiBBbiBldmVudCBpcyBmaXJlZCBmcm9tIHRoZSBvcmlnaW5hbCB0cmlnZ2VyIGRlcGVuZGluZyBvbiBpZiB0aGUgcmVzdWx0YW50IHN0YXRlIHdhcyBcIm9uXCIgb3IgXCJvZmZcIi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29mZlxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIHRoaXNbIHRoaXMub3B0aW9ucy5hbmltYXRlID8gJ190b2dnbGVBbmltYXRlJyA6ICdfdG9nZ2xlQ2xhc3MnXSgpO1xuICB9XG5cbiAgX3RvZ2dsZUNsYXNzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQudG9nZ2xlQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuXG4gICAgdmFyIGlzT24gPSB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMuY2xhc3NOYW1lKTtcbiAgICBpZiAoaXNPbikge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29uXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXMgbm90IGhhdmUgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb2ZmXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVBUklBKGlzT24pO1xuICB9XG5cbiAgX3RvZ2dsZUFuaW1hdGUoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbkluLCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZUFSSUEodHJ1ZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbk91dCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKGZhbHNlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgX3VwZGF0ZUFSSUEoaXNPbikge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIGlzT24gPyB0cnVlIDogZmFsc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiBUb2dnbGVyIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50b2dnbGVyJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvZ2dsZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUZWxscyB0aGUgcGx1Z2luIGlmIHRoZSBlbGVtZW50IHNob3VsZCBhbmltYXRlZCB3aGVuIHRvZ2dsZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9nZ2xlciwgJ1RvZ2dsZXInKTtcblxufShqUXVlcnkpO1xuIiwidmFyIG9iamVjdEZpdEltYWdlcz1mdW5jdGlvbigpe1widXNlIHN0cmljdFwiO3ZhciBlPVwiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoQVFBQkFJQUFBUC8vL3dBQUFDSDVCQUVBQUFBQUxBQUFBQUFCQUFFQUFBSUNSQUVBT3c9PVwiO3ZhciB0PS8ob2JqZWN0LWZpdHxvYmplY3QtcG9zaXRpb24pXFxzKjpcXHMqKFteOyRcIidcXHNdKykvZzt2YXIgaT1cIm9iamVjdC1maXRcImluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpXCIpLnN0eWxlO3ZhciBuPWZhbHNlO2Z1bmN0aW9uIHIoZSl7dmFyIGk9Z2V0Q29tcHV0ZWRTdHlsZShlKS5mb250RmFtaWx5O3ZhciBuO3ZhciByPXt9O3doaWxlKChuPXQuZXhlYyhpKSkhPT1udWxsKXtyW25bMV1dPW5bMl19cmV0dXJuIHJ9ZnVuY3Rpb24gbyh0LGkpe3ZhciBuPXIodCk7aWYoIW5bXCJvYmplY3QtZml0XCJdfHxuW1wib2JqZWN0LWZpdFwiXT09PVwiZmlsbFwiKXtyZXR1cm59aT1pfHx0LmN1cnJlbnRTcmN8fHQuc3JjO2lmKHQuc3Jjc2V0KXt0LnNyY3NldD1cIlwifWlmKCF0W2VdKXt0LnNyYz1lO2EodCl9dFtlXT10W2VdfHx7czppfTt0LnN0eWxlLmJhY2tncm91bmRJbWFnZT1cInVybChcIitpK1wiKVwiO3Quc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPW5bXCJvYmplY3QtcG9zaXRpb25cIl18fFwiY2VudGVyXCI7dC5zdHlsZS5iYWNrZ3JvdW5kUmVwZWF0PVwibm8tcmVwZWF0XCI7aWYobltcIm9iamVjdC1maXRcIl0uaW5kZXhPZihcInNjYWxlLWRvd25cIik8MCl7dC5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT1uW1wib2JqZWN0LWZpdFwiXS5yZXBsYWNlKFwibm9uZVwiLFwiYXV0b1wiKX1lbHNle2lmKCF0W2VdLmkpe3RbZV0uaT1uZXcgSW1hZ2U7dFtlXS5pLnNyYz1pfShmdW5jdGlvbiBvKCl7aWYodFtlXS5pLm5hdHVyYWxXaWR0aCl7aWYodFtlXS5pLm5hdHVyYWxXaWR0aD50LndpZHRofHx0W2VdLmkubmF0dXJhbEhlaWdodD50LmhlaWdodCl7dC5zdHlsZS5iYWNrZ3JvdW5kU2l6ZT1cImNvbnRhaW5cIn1lbHNle3Quc3R5bGUuYmFja2dyb3VuZFNpemU9XCJhdXRvXCJ9cmV0dXJufXNldFRpbWVvdXQobywxMDApfSkoKX19ZnVuY3Rpb24gYSh0KXt2YXIgaT17Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRbZV0uc30sc2V0OmZ1bmN0aW9uKGkpe2RlbGV0ZSB0W2VdLmk7cmV0dXJuIG8odCxpKX19O09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LFwic3JjXCIsaSk7T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsXCJjdXJyZW50U3JjXCIse2dldDppLmdldH0pfWZ1bmN0aW9uIGMoZSl7d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIixmLmJpbmQobnVsbCxlKSl9ZnVuY3Rpb24gdShlKXtpZihlLnRhcmdldC50YWdOYW1lPT09XCJJTUdcIil7byhlLnRhcmdldCl9fWZ1bmN0aW9uIGYoZSx0KXtpZihpKXtyZXR1cm4gZmFsc2V9dmFyIHI9IW4mJiFlO3Q9dHx8e307ZT1lfHxcImltZ1wiO2lmKHR5cGVvZiBlPT09XCJzdHJpbmdcIil7ZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpfWVsc2UgaWYoIWUubGVuZ3RoKXtlPVtlXX1mb3IodmFyIGE9MDthPGUubGVuZ3RoO2ErKyl7byhlW2FdKX1pZihyKXtkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsdSx0cnVlKTtuPXRydWU7ZT1cImltZ1wifWlmKHQud2F0Y2hNUSl7YyhlKX19cmV0dXJuIGZ9KCk7XG4iLCIvKiEgalF1ZXJ5IFZhbGlkYXRpb24gUGx1Z2luIC0gdjEuMTUuMSAtIDcvMjIvMjAxNlxuICogaHR0cDovL2pxdWVyeXZhbGlkYXRpb24ub3JnL1xuICogQ29weXJpZ2h0IChjKSAyMDE2IErDtnJuIFphZWZmZXJlcjsgTGljZW5zZWQgTUlUICovXG4hZnVuY3Rpb24oYSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJqcXVlcnlcIl0sYSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9YShyZXF1aXJlKFwianF1ZXJ5XCIpKTphKGpRdWVyeSl9KGZ1bmN0aW9uKGEpe2EuZXh0ZW5kKGEuZm4se3ZhbGlkYXRlOmZ1bmN0aW9uKGIpe2lmKCF0aGlzLmxlbmd0aClyZXR1cm4gdm9pZChiJiZiLmRlYnVnJiZ3aW5kb3cuY29uc29sZSYmY29uc29sZS53YXJuKFwiTm90aGluZyBzZWxlY3RlZCwgY2FuJ3QgdmFsaWRhdGUsIHJldHVybmluZyBub3RoaW5nLlwiKSk7dmFyIGM9YS5kYXRhKHRoaXNbMF0sXCJ2YWxpZGF0b3JcIik7cmV0dXJuIGM/YzoodGhpcy5hdHRyKFwibm92YWxpZGF0ZVwiLFwibm92YWxpZGF0ZVwiKSxjPW5ldyBhLnZhbGlkYXRvcihiLHRoaXNbMF0pLGEuZGF0YSh0aGlzWzBdLFwidmFsaWRhdG9yXCIsYyksYy5zZXR0aW5ncy5vbnN1Ym1pdCYmKHRoaXMub24oXCJjbGljay52YWxpZGF0ZVwiLFwiOnN1Ym1pdFwiLGZ1bmN0aW9uKGIpe2Muc2V0dGluZ3Muc3VibWl0SGFuZGxlciYmKGMuc3VibWl0QnV0dG9uPWIudGFyZ2V0KSxhKHRoaXMpLmhhc0NsYXNzKFwiY2FuY2VsXCIpJiYoYy5jYW5jZWxTdWJtaXQ9ITApLHZvaWQgMCE9PWEodGhpcykuYXR0cihcImZvcm1ub3ZhbGlkYXRlXCIpJiYoYy5jYW5jZWxTdWJtaXQ9ITApfSksdGhpcy5vbihcInN1Ym1pdC52YWxpZGF0ZVwiLGZ1bmN0aW9uKGIpe2Z1bmN0aW9uIGQoKXt2YXIgZCxlO3JldHVybiFjLnNldHRpbmdzLnN1Ym1pdEhhbmRsZXJ8fChjLnN1Ym1pdEJ1dHRvbiYmKGQ9YShcIjxpbnB1dCB0eXBlPSdoaWRkZW4nLz5cIikuYXR0cihcIm5hbWVcIixjLnN1Ym1pdEJ1dHRvbi5uYW1lKS52YWwoYShjLnN1Ym1pdEJ1dHRvbikudmFsKCkpLmFwcGVuZFRvKGMuY3VycmVudEZvcm0pKSxlPWMuc2V0dGluZ3Muc3VibWl0SGFuZGxlci5jYWxsKGMsYy5jdXJyZW50Rm9ybSxiKSxjLnN1Ym1pdEJ1dHRvbiYmZC5yZW1vdmUoKSx2b2lkIDAhPT1lJiZlKX1yZXR1cm4gYy5zZXR0aW5ncy5kZWJ1ZyYmYi5wcmV2ZW50RGVmYXVsdCgpLGMuY2FuY2VsU3VibWl0PyhjLmNhbmNlbFN1Ym1pdD0hMSxkKCkpOmMuZm9ybSgpP2MucGVuZGluZ1JlcXVlc3Q/KGMuZm9ybVN1Ym1pdHRlZD0hMCwhMSk6ZCgpOihjLmZvY3VzSW52YWxpZCgpLCExKX0pKSxjKX0sdmFsaWQ6ZnVuY3Rpb24oKXt2YXIgYixjLGQ7cmV0dXJuIGEodGhpc1swXSkuaXMoXCJmb3JtXCIpP2I9dGhpcy52YWxpZGF0ZSgpLmZvcm0oKTooZD1bXSxiPSEwLGM9YSh0aGlzWzBdLmZvcm0pLnZhbGlkYXRlKCksdGhpcy5lYWNoKGZ1bmN0aW9uKCl7Yj1jLmVsZW1lbnQodGhpcykmJmIsYnx8KGQ9ZC5jb25jYXQoYy5lcnJvckxpc3QpKX0pLGMuZXJyb3JMaXN0PWQpLGJ9LHJ1bGVzOmZ1bmN0aW9uKGIsYyl7dmFyIGQsZSxmLGcsaCxpLGo9dGhpc1swXTtpZihudWxsIT1qJiZudWxsIT1qLmZvcm0pe2lmKGIpc3dpdGNoKGQ9YS5kYXRhKGouZm9ybSxcInZhbGlkYXRvclwiKS5zZXR0aW5ncyxlPWQucnVsZXMsZj1hLnZhbGlkYXRvci5zdGF0aWNSdWxlcyhqKSxiKXtjYXNlXCJhZGRcIjphLmV4dGVuZChmLGEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGUoYykpLGRlbGV0ZSBmLm1lc3NhZ2VzLGVbai5uYW1lXT1mLGMubWVzc2FnZXMmJihkLm1lc3NhZ2VzW2oubmFtZV09YS5leHRlbmQoZC5tZXNzYWdlc1tqLm5hbWVdLGMubWVzc2FnZXMpKTticmVhaztjYXNlXCJyZW1vdmVcIjpyZXR1cm4gYz8oaT17fSxhLmVhY2goYy5zcGxpdCgvXFxzLyksZnVuY3Rpb24oYixjKXtpW2NdPWZbY10sZGVsZXRlIGZbY10sXCJyZXF1aXJlZFwiPT09YyYmYShqKS5yZW1vdmVBdHRyKFwiYXJpYS1yZXF1aXJlZFwiKX0pLGkpOihkZWxldGUgZVtqLm5hbWVdLGYpfXJldHVybiBnPWEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGVzKGEuZXh0ZW5kKHt9LGEudmFsaWRhdG9yLmNsYXNzUnVsZXMoaiksYS52YWxpZGF0b3IuYXR0cmlidXRlUnVsZXMoaiksYS52YWxpZGF0b3IuZGF0YVJ1bGVzKGopLGEudmFsaWRhdG9yLnN0YXRpY1J1bGVzKGopKSxqKSxnLnJlcXVpcmVkJiYoaD1nLnJlcXVpcmVkLGRlbGV0ZSBnLnJlcXVpcmVkLGc9YS5leHRlbmQoe3JlcXVpcmVkOmh9LGcpLGEoaikuYXR0cihcImFyaWEtcmVxdWlyZWRcIixcInRydWVcIikpLGcucmVtb3RlJiYoaD1nLnJlbW90ZSxkZWxldGUgZy5yZW1vdGUsZz1hLmV4dGVuZChnLHtyZW1vdGU6aH0pKSxnfX19KSxhLmV4dGVuZChhLmV4cHJbXCI6XCJdLHtibGFuazpmdW5jdGlvbihiKXtyZXR1cm4hYS50cmltKFwiXCIrYShiKS52YWwoKSl9LGZpbGxlZDpmdW5jdGlvbihiKXt2YXIgYz1hKGIpLnZhbCgpO3JldHVybiBudWxsIT09YyYmISFhLnRyaW0oXCJcIitjKX0sdW5jaGVja2VkOmZ1bmN0aW9uKGIpe3JldHVybiFhKGIpLnByb3AoXCJjaGVja2VkXCIpfX0pLGEudmFsaWRhdG9yPWZ1bmN0aW9uKGIsYyl7dGhpcy5zZXR0aW5ncz1hLmV4dGVuZCghMCx7fSxhLnZhbGlkYXRvci5kZWZhdWx0cyxiKSx0aGlzLmN1cnJlbnRGb3JtPWMsdGhpcy5pbml0KCl9LGEudmFsaWRhdG9yLmZvcm1hdD1mdW5jdGlvbihiLGMpe3JldHVybiAxPT09YXJndW1lbnRzLmxlbmd0aD9mdW5jdGlvbigpe3ZhciBjPWEubWFrZUFycmF5KGFyZ3VtZW50cyk7cmV0dXJuIGMudW5zaGlmdChiKSxhLnZhbGlkYXRvci5mb3JtYXQuYXBwbHkodGhpcyxjKX06dm9pZCAwPT09Yz9iOihhcmd1bWVudHMubGVuZ3RoPjImJmMuY29uc3RydWN0b3IhPT1BcnJheSYmKGM9YS5tYWtlQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKSksYy5jb25zdHJ1Y3RvciE9PUFycmF5JiYoYz1bY10pLGEuZWFjaChjLGZ1bmN0aW9uKGEsYyl7Yj1iLnJlcGxhY2UobmV3IFJlZ0V4cChcIlxcXFx7XCIrYStcIlxcXFx9XCIsXCJnXCIpLGZ1bmN0aW9uKCl7cmV0dXJuIGN9KX0pLGIpfSxhLmV4dGVuZChhLnZhbGlkYXRvcix7ZGVmYXVsdHM6e21lc3NhZ2VzOnt9LGdyb3Vwczp7fSxydWxlczp7fSxlcnJvckNsYXNzOlwiZXJyb3JcIixwZW5kaW5nQ2xhc3M6XCJwZW5kaW5nXCIsdmFsaWRDbGFzczpcInZhbGlkXCIsZXJyb3JFbGVtZW50OlwibGFiZWxcIixmb2N1c0NsZWFudXA6ITEsZm9jdXNJbnZhbGlkOiEwLGVycm9yQ29udGFpbmVyOmEoW10pLGVycm9yTGFiZWxDb250YWluZXI6YShbXSksb25zdWJtaXQ6ITAsaWdub3JlOlwiOmhpZGRlblwiLGlnbm9yZVRpdGxlOiExLG9uZm9jdXNpbjpmdW5jdGlvbihhKXt0aGlzLmxhc3RBY3RpdmU9YSx0aGlzLnNldHRpbmdzLmZvY3VzQ2xlYW51cCYmKHRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQmJnRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQuY2FsbCh0aGlzLGEsdGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyksdGhpcy5oaWRlVGhlc2UodGhpcy5lcnJvcnNGb3IoYSkpKX0sb25mb2N1c291dDpmdW5jdGlvbihhKXt0aGlzLmNoZWNrYWJsZShhKXx8IShhLm5hbWUgaW4gdGhpcy5zdWJtaXR0ZWQpJiZ0aGlzLm9wdGlvbmFsKGEpfHx0aGlzLmVsZW1lbnQoYSl9LG9ua2V5dXA6ZnVuY3Rpb24oYixjKXt2YXIgZD1bMTYsMTcsMTgsMjAsMzUsMzYsMzcsMzgsMzksNDAsNDUsMTQ0LDIyNV07OT09PWMud2hpY2gmJlwiXCI9PT10aGlzLmVsZW1lbnRWYWx1ZShiKXx8YS5pbkFycmF5KGMua2V5Q29kZSxkKSE9PS0xfHwoYi5uYW1lIGluIHRoaXMuc3VibWl0dGVkfHxiLm5hbWUgaW4gdGhpcy5pbnZhbGlkKSYmdGhpcy5lbGVtZW50KGIpfSxvbmNsaWNrOmZ1bmN0aW9uKGEpe2EubmFtZSBpbiB0aGlzLnN1Ym1pdHRlZD90aGlzLmVsZW1lbnQoYSk6YS5wYXJlbnROb2RlLm5hbWUgaW4gdGhpcy5zdWJtaXR0ZWQmJnRoaXMuZWxlbWVudChhLnBhcmVudE5vZGUpfSxoaWdobGlnaHQ6ZnVuY3Rpb24oYixjLGQpe1wicmFkaW9cIj09PWIudHlwZT90aGlzLmZpbmRCeU5hbWUoYi5uYW1lKS5hZGRDbGFzcyhjKS5yZW1vdmVDbGFzcyhkKTphKGIpLmFkZENsYXNzKGMpLnJlbW92ZUNsYXNzKGQpfSx1bmhpZ2hsaWdodDpmdW5jdGlvbihiLGMsZCl7XCJyYWRpb1wiPT09Yi50eXBlP3RoaXMuZmluZEJ5TmFtZShiLm5hbWUpLnJlbW92ZUNsYXNzKGMpLmFkZENsYXNzKGQpOmEoYikucmVtb3ZlQ2xhc3MoYykuYWRkQ2xhc3MoZCl9fSxzZXREZWZhdWx0czpmdW5jdGlvbihiKXthLmV4dGVuZChhLnZhbGlkYXRvci5kZWZhdWx0cyxiKX0sbWVzc2FnZXM6e3JlcXVpcmVkOlwiVGhpcyBmaWVsZCBpcyByZXF1aXJlZC5cIixyZW1vdGU6XCJQbGVhc2UgZml4IHRoaXMgZmllbGQuXCIsZW1haWw6XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLlwiLHVybDpcIlBsZWFzZSBlbnRlciBhIHZhbGlkIFVSTC5cIixkYXRlOlwiUGxlYXNlIGVudGVyIGEgdmFsaWQgZGF0ZS5cIixkYXRlSVNPOlwiUGxlYXNlIGVudGVyIGEgdmFsaWQgZGF0ZSAoSVNPKS5cIixudW1iZXI6XCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBudW1iZXIuXCIsZGlnaXRzOlwiUGxlYXNlIGVudGVyIG9ubHkgZGlnaXRzLlwiLGVxdWFsVG86XCJQbGVhc2UgZW50ZXIgdGhlIHNhbWUgdmFsdWUgYWdhaW4uXCIsbWF4bGVuZ3RoOmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBubyBtb3JlIHRoYW4gezB9IGNoYXJhY3RlcnMuXCIpLG1pbmxlbmd0aDphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYXQgbGVhc3QgezB9IGNoYXJhY3RlcnMuXCIpLHJhbmdlbGVuZ3RoOmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBhIHZhbHVlIGJldHdlZW4gezB9IGFuZCB7MX0gY2hhcmFjdGVycyBsb25nLlwiKSxyYW5nZTphLnZhbGlkYXRvci5mb3JtYXQoXCJQbGVhc2UgZW50ZXIgYSB2YWx1ZSBiZXR3ZWVuIHswfSBhbmQgezF9LlwiKSxtYXg6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGEgdmFsdWUgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHswfS5cIiksbWluOmEudmFsaWRhdG9yLmZvcm1hdChcIlBsZWFzZSBlbnRlciBhIHZhbHVlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB7MH0uXCIpLHN0ZXA6YS52YWxpZGF0b3IuZm9ybWF0KFwiUGxlYXNlIGVudGVyIGEgbXVsdGlwbGUgb2YgezB9LlwiKX0sYXV0b0NyZWF0ZVJhbmdlczohMSxwcm90b3R5cGU6e2luaXQ6ZnVuY3Rpb24oKXtmdW5jdGlvbiBiKGIpeyF0aGlzLmZvcm0mJnRoaXMuaGFzQXR0cmlidXRlKFwiY29udGVudGVkaXRhYmxlXCIpJiYodGhpcy5mb3JtPWEodGhpcykuY2xvc2VzdChcImZvcm1cIilbMF0pO3ZhciBjPWEuZGF0YSh0aGlzLmZvcm0sXCJ2YWxpZGF0b3JcIiksZD1cIm9uXCIrYi50eXBlLnJlcGxhY2UoL152YWxpZGF0ZS8sXCJcIiksZT1jLnNldHRpbmdzO2VbZF0mJiFhKHRoaXMpLmlzKGUuaWdub3JlKSYmZVtkXS5jYWxsKGMsdGhpcyxiKX10aGlzLmxhYmVsQ29udGFpbmVyPWEodGhpcy5zZXR0aW5ncy5lcnJvckxhYmVsQ29udGFpbmVyKSx0aGlzLmVycm9yQ29udGV4dD10aGlzLmxhYmVsQ29udGFpbmVyLmxlbmd0aCYmdGhpcy5sYWJlbENvbnRhaW5lcnx8YSh0aGlzLmN1cnJlbnRGb3JtKSx0aGlzLmNvbnRhaW5lcnM9YSh0aGlzLnNldHRpbmdzLmVycm9yQ29udGFpbmVyKS5hZGQodGhpcy5zZXR0aW5ncy5lcnJvckxhYmVsQ29udGFpbmVyKSx0aGlzLnN1Ym1pdHRlZD17fSx0aGlzLnZhbHVlQ2FjaGU9e30sdGhpcy5wZW5kaW5nUmVxdWVzdD0wLHRoaXMucGVuZGluZz17fSx0aGlzLmludmFsaWQ9e30sdGhpcy5yZXNldCgpO3ZhciBjLGQ9dGhpcy5ncm91cHM9e307YS5lYWNoKHRoaXMuc2V0dGluZ3MuZ3JvdXBzLGZ1bmN0aW9uKGIsYyl7XCJzdHJpbmdcIj09dHlwZW9mIGMmJihjPWMuc3BsaXQoL1xccy8pKSxhLmVhY2goYyxmdW5jdGlvbihhLGMpe2RbY109Yn0pfSksYz10aGlzLnNldHRpbmdzLnJ1bGVzLGEuZWFjaChjLGZ1bmN0aW9uKGIsZCl7Y1tiXT1hLnZhbGlkYXRvci5ub3JtYWxpemVSdWxlKGQpfSksYSh0aGlzLmN1cnJlbnRGb3JtKS5vbihcImZvY3VzaW4udmFsaWRhdGUgZm9jdXNvdXQudmFsaWRhdGUga2V5dXAudmFsaWRhdGVcIixcIjp0ZXh0LCBbdHlwZT0ncGFzc3dvcmQnXSwgW3R5cGU9J2ZpbGUnXSwgc2VsZWN0LCB0ZXh0YXJlYSwgW3R5cGU9J251bWJlciddLCBbdHlwZT0nc2VhcmNoJ10sIFt0eXBlPSd0ZWwnXSwgW3R5cGU9J3VybCddLCBbdHlwZT0nZW1haWwnXSwgW3R5cGU9J2RhdGV0aW1lJ10sIFt0eXBlPSdkYXRlJ10sIFt0eXBlPSdtb250aCddLCBbdHlwZT0nd2VlayddLCBbdHlwZT0ndGltZSddLCBbdHlwZT0nZGF0ZXRpbWUtbG9jYWwnXSwgW3R5cGU9J3JhbmdlJ10sIFt0eXBlPSdjb2xvciddLCBbdHlwZT0ncmFkaW8nXSwgW3R5cGU9J2NoZWNrYm94J10sIFtjb250ZW50ZWRpdGFibGVdXCIsYikub24oXCJjbGljay52YWxpZGF0ZVwiLFwic2VsZWN0LCBvcHRpb24sIFt0eXBlPSdyYWRpbyddLCBbdHlwZT0nY2hlY2tib3gnXVwiLGIpLHRoaXMuc2V0dGluZ3MuaW52YWxpZEhhbmRsZXImJmEodGhpcy5jdXJyZW50Rm9ybSkub24oXCJpbnZhbGlkLWZvcm0udmFsaWRhdGVcIix0aGlzLnNldHRpbmdzLmludmFsaWRIYW5kbGVyKSxhKHRoaXMuY3VycmVudEZvcm0pLmZpbmQoXCJbcmVxdWlyZWRdLCBbZGF0YS1ydWxlLXJlcXVpcmVkXSwgLnJlcXVpcmVkXCIpLmF0dHIoXCJhcmlhLXJlcXVpcmVkXCIsXCJ0cnVlXCIpfSxmb3JtOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY2hlY2tGb3JtKCksYS5leHRlbmQodGhpcy5zdWJtaXR0ZWQsdGhpcy5lcnJvck1hcCksdGhpcy5pbnZhbGlkPWEuZXh0ZW5kKHt9LHRoaXMuZXJyb3JNYXApLHRoaXMudmFsaWQoKXx8YSh0aGlzLmN1cnJlbnRGb3JtKS50cmlnZ2VySGFuZGxlcihcImludmFsaWQtZm9ybVwiLFt0aGlzXSksdGhpcy5zaG93RXJyb3JzKCksdGhpcy52YWxpZCgpfSxjaGVja0Zvcm06ZnVuY3Rpb24oKXt0aGlzLnByZXBhcmVGb3JtKCk7Zm9yKHZhciBhPTAsYj10aGlzLmN1cnJlbnRFbGVtZW50cz10aGlzLmVsZW1lbnRzKCk7YlthXTthKyspdGhpcy5jaGVjayhiW2FdKTtyZXR1cm4gdGhpcy52YWxpZCgpfSxlbGVtZW50OmZ1bmN0aW9uKGIpe3ZhciBjLGQsZT10aGlzLmNsZWFuKGIpLGY9dGhpcy52YWxpZGF0aW9uVGFyZ2V0Rm9yKGUpLGc9dGhpcyxoPSEwO3JldHVybiB2b2lkIDA9PT1mP2RlbGV0ZSB0aGlzLmludmFsaWRbZS5uYW1lXToodGhpcy5wcmVwYXJlRWxlbWVudChmKSx0aGlzLmN1cnJlbnRFbGVtZW50cz1hKGYpLGQ9dGhpcy5ncm91cHNbZi5uYW1lXSxkJiZhLmVhY2godGhpcy5ncm91cHMsZnVuY3Rpb24oYSxiKXtiPT09ZCYmYSE9PWYubmFtZSYmKGU9Zy52YWxpZGF0aW9uVGFyZ2V0Rm9yKGcuY2xlYW4oZy5maW5kQnlOYW1lKGEpKSksZSYmZS5uYW1lIGluIGcuaW52YWxpZCYmKGcuY3VycmVudEVsZW1lbnRzLnB1c2goZSksaD1nLmNoZWNrKGUpJiZoKSl9KSxjPXRoaXMuY2hlY2soZikhPT0hMSxoPWgmJmMsYz90aGlzLmludmFsaWRbZi5uYW1lXT0hMTp0aGlzLmludmFsaWRbZi5uYW1lXT0hMCx0aGlzLm51bWJlck9mSW52YWxpZHMoKXx8KHRoaXMudG9IaWRlPXRoaXMudG9IaWRlLmFkZCh0aGlzLmNvbnRhaW5lcnMpKSx0aGlzLnNob3dFcnJvcnMoKSxhKGIpLmF0dHIoXCJhcmlhLWludmFsaWRcIiwhYykpLGh9LHNob3dFcnJvcnM6ZnVuY3Rpb24oYil7aWYoYil7dmFyIGM9dGhpczthLmV4dGVuZCh0aGlzLmVycm9yTWFwLGIpLHRoaXMuZXJyb3JMaXN0PWEubWFwKHRoaXMuZXJyb3JNYXAsZnVuY3Rpb24oYSxiKXtyZXR1cm57bWVzc2FnZTphLGVsZW1lbnQ6Yy5maW5kQnlOYW1lKGIpWzBdfX0pLHRoaXMuc3VjY2Vzc0xpc3Q9YS5ncmVwKHRoaXMuc3VjY2Vzc0xpc3QsZnVuY3Rpb24oYSl7cmV0dXJuIShhLm5hbWUgaW4gYil9KX10aGlzLnNldHRpbmdzLnNob3dFcnJvcnM/dGhpcy5zZXR0aW5ncy5zaG93RXJyb3JzLmNhbGwodGhpcyx0aGlzLmVycm9yTWFwLHRoaXMuZXJyb3JMaXN0KTp0aGlzLmRlZmF1bHRTaG93RXJyb3JzKCl9LHJlc2V0Rm9ybTpmdW5jdGlvbigpe2EuZm4ucmVzZXRGb3JtJiZhKHRoaXMuY3VycmVudEZvcm0pLnJlc2V0Rm9ybSgpLHRoaXMuaW52YWxpZD17fSx0aGlzLnN1Ym1pdHRlZD17fSx0aGlzLnByZXBhcmVGb3JtKCksdGhpcy5oaWRlRXJyb3JzKCk7dmFyIGI9dGhpcy5lbGVtZW50cygpLnJlbW92ZURhdGEoXCJwcmV2aW91c1ZhbHVlXCIpLnJlbW92ZUF0dHIoXCJhcmlhLWludmFsaWRcIik7dGhpcy5yZXNldEVsZW1lbnRzKGIpfSxyZXNldEVsZW1lbnRzOmZ1bmN0aW9uKGEpe3ZhciBiO2lmKHRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQpZm9yKGI9MDthW2JdO2IrKyl0aGlzLnNldHRpbmdzLnVuaGlnaGxpZ2h0LmNhbGwodGhpcyxhW2JdLHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcyxcIlwiKSx0aGlzLmZpbmRCeU5hbWUoYVtiXS5uYW1lKS5yZW1vdmVDbGFzcyh0aGlzLnNldHRpbmdzLnZhbGlkQ2xhc3MpO2Vsc2UgYS5yZW1vdmVDbGFzcyh0aGlzLnNldHRpbmdzLmVycm9yQ2xhc3MpLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyl9LG51bWJlck9mSW52YWxpZHM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5vYmplY3RMZW5ndGgodGhpcy5pbnZhbGlkKX0sb2JqZWN0TGVuZ3RoOmZ1bmN0aW9uKGEpe3ZhciBiLGM9MDtmb3IoYiBpbiBhKWFbYl0mJmMrKztyZXR1cm4gY30saGlkZUVycm9yczpmdW5jdGlvbigpe3RoaXMuaGlkZVRoZXNlKHRoaXMudG9IaWRlKX0saGlkZVRoZXNlOmZ1bmN0aW9uKGEpe2Eubm90KHRoaXMuY29udGFpbmVycykudGV4dChcIlwiKSx0aGlzLmFkZFdyYXBwZXIoYSkuaGlkZSgpfSx2YWxpZDpmdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplKCl9LHNpemU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5lcnJvckxpc3QubGVuZ3RofSxmb2N1c0ludmFsaWQ6ZnVuY3Rpb24oKXtpZih0aGlzLnNldHRpbmdzLmZvY3VzSW52YWxpZCl0cnl7YSh0aGlzLmZpbmRMYXN0QWN0aXZlKCl8fHRoaXMuZXJyb3JMaXN0Lmxlbmd0aCYmdGhpcy5lcnJvckxpc3RbMF0uZWxlbWVudHx8W10pLmZpbHRlcihcIjp2aXNpYmxlXCIpLmZvY3VzKCkudHJpZ2dlcihcImZvY3VzaW5cIil9Y2F0Y2goYSl7fX0sZmluZExhc3RBY3RpdmU6ZnVuY3Rpb24oKXt2YXIgYj10aGlzLmxhc3RBY3RpdmU7cmV0dXJuIGImJjE9PT1hLmdyZXAodGhpcy5lcnJvckxpc3QsZnVuY3Rpb24oYSl7cmV0dXJuIGEuZWxlbWVudC5uYW1lPT09Yi5uYW1lfSkubGVuZ3RoJiZifSxlbGVtZW50czpmdW5jdGlvbigpe3ZhciBiPXRoaXMsYz17fTtyZXR1cm4gYSh0aGlzLmN1cnJlbnRGb3JtKS5maW5kKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEsIFtjb250ZW50ZWRpdGFibGVdXCIpLm5vdChcIjpzdWJtaXQsIDpyZXNldCwgOmltYWdlLCA6ZGlzYWJsZWRcIikubm90KHRoaXMuc2V0dGluZ3MuaWdub3JlKS5maWx0ZXIoZnVuY3Rpb24oKXt2YXIgZD10aGlzLm5hbWV8fGEodGhpcykuYXR0cihcIm5hbWVcIik7cmV0dXJuIWQmJmIuc2V0dGluZ3MuZGVidWcmJndpbmRvdy5jb25zb2xlJiZjb25zb2xlLmVycm9yKFwiJW8gaGFzIG5vIG5hbWUgYXNzaWduZWRcIix0aGlzKSx0aGlzLmhhc0F0dHJpYnV0ZShcImNvbnRlbnRlZGl0YWJsZVwiKSYmKHRoaXMuZm9ybT1hKHRoaXMpLmNsb3Nlc3QoXCJmb3JtXCIpWzBdKSwhKGQgaW4gY3x8IWIub2JqZWN0TGVuZ3RoKGEodGhpcykucnVsZXMoKSkpJiYoY1tkXT0hMCwhMCl9KX0sY2xlYW46ZnVuY3Rpb24oYil7cmV0dXJuIGEoYilbMF19LGVycm9yczpmdW5jdGlvbigpe3ZhciBiPXRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcy5zcGxpdChcIiBcIikuam9pbihcIi5cIik7cmV0dXJuIGEodGhpcy5zZXR0aW5ncy5lcnJvckVsZW1lbnQrXCIuXCIrYix0aGlzLmVycm9yQ29udGV4dCl9LHJlc2V0SW50ZXJuYWxzOmZ1bmN0aW9uKCl7dGhpcy5zdWNjZXNzTGlzdD1bXSx0aGlzLmVycm9yTGlzdD1bXSx0aGlzLmVycm9yTWFwPXt9LHRoaXMudG9TaG93PWEoW10pLHRoaXMudG9IaWRlPWEoW10pfSxyZXNldDpmdW5jdGlvbigpe3RoaXMucmVzZXRJbnRlcm5hbHMoKSx0aGlzLmN1cnJlbnRFbGVtZW50cz1hKFtdKX0scHJlcGFyZUZvcm06ZnVuY3Rpb24oKXt0aGlzLnJlc2V0KCksdGhpcy50b0hpZGU9dGhpcy5lcnJvcnMoKS5hZGQodGhpcy5jb250YWluZXJzKX0scHJlcGFyZUVsZW1lbnQ6ZnVuY3Rpb24oYSl7dGhpcy5yZXNldCgpLHRoaXMudG9IaWRlPXRoaXMuZXJyb3JzRm9yKGEpfSxlbGVtZW50VmFsdWU6ZnVuY3Rpb24oYil7dmFyIGMsZCxlPWEoYiksZj1iLnR5cGU7cmV0dXJuXCJyYWRpb1wiPT09Znx8XCJjaGVja2JveFwiPT09Zj90aGlzLmZpbmRCeU5hbWUoYi5uYW1lKS5maWx0ZXIoXCI6Y2hlY2tlZFwiKS52YWwoKTpcIm51bWJlclwiPT09ZiYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGIudmFsaWRpdHk/Yi52YWxpZGl0eS5iYWRJbnB1dD9cIk5hTlwiOmUudmFsKCk6KGM9Yi5oYXNBdHRyaWJ1dGUoXCJjb250ZW50ZWRpdGFibGVcIik/ZS50ZXh0KCk6ZS52YWwoKSxcImZpbGVcIj09PWY/XCJDOlxcXFxmYWtlcGF0aFxcXFxcIj09PWMuc3Vic3RyKDAsMTIpP2Muc3Vic3RyKDEyKTooZD1jLmxhc3RJbmRleE9mKFwiL1wiKSxkPj0wP2Muc3Vic3RyKGQrMSk6KGQ9Yy5sYXN0SW5kZXhPZihcIlxcXFxcIiksZD49MD9jLnN1YnN0cihkKzEpOmMpKTpcInN0cmluZ1wiPT10eXBlb2YgYz9jLnJlcGxhY2UoL1xcci9nLFwiXCIpOmMpfSxjaGVjazpmdW5jdGlvbihiKXtiPXRoaXMudmFsaWRhdGlvblRhcmdldEZvcih0aGlzLmNsZWFuKGIpKTt2YXIgYyxkLGUsZj1hKGIpLnJ1bGVzKCksZz1hLm1hcChmLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGJ9KS5sZW5ndGgsaD0hMSxpPXRoaXMuZWxlbWVudFZhbHVlKGIpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGYubm9ybWFsaXplcil7aWYoaT1mLm5vcm1hbGl6ZXIuY2FsbChiLGkpLFwic3RyaW5nXCIhPXR5cGVvZiBpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGUgbm9ybWFsaXplciBzaG91bGQgcmV0dXJuIGEgc3RyaW5nIHZhbHVlLlwiKTtkZWxldGUgZi5ub3JtYWxpemVyfWZvcihkIGluIGYpe2U9e21ldGhvZDpkLHBhcmFtZXRlcnM6ZltkXX07dHJ5e2lmKGM9YS52YWxpZGF0b3IubWV0aG9kc1tkXS5jYWxsKHRoaXMsaSxiLGUucGFyYW1ldGVycyksXCJkZXBlbmRlbmN5LW1pc21hdGNoXCI9PT1jJiYxPT09Zyl7aD0hMDtjb250aW51ZX1pZihoPSExLFwicGVuZGluZ1wiPT09YylyZXR1cm4gdm9pZCh0aGlzLnRvSGlkZT10aGlzLnRvSGlkZS5ub3QodGhpcy5lcnJvcnNGb3IoYikpKTtpZighYylyZXR1cm4gdGhpcy5mb3JtYXRBbmRBZGQoYixlKSwhMX1jYXRjaChhKXt0aHJvdyB0aGlzLnNldHRpbmdzLmRlYnVnJiZ3aW5kb3cuY29uc29sZSYmY29uc29sZS5sb2coXCJFeGNlcHRpb24gb2NjdXJyZWQgd2hlbiBjaGVja2luZyBlbGVtZW50IFwiK2IuaWQrXCIsIGNoZWNrIHRoZSAnXCIrZS5tZXRob2QrXCInIG1ldGhvZC5cIixhKSxhIGluc3RhbmNlb2YgVHlwZUVycm9yJiYoYS5tZXNzYWdlKz1cIi4gIEV4Y2VwdGlvbiBvY2N1cnJlZCB3aGVuIGNoZWNraW5nIGVsZW1lbnQgXCIrYi5pZCtcIiwgY2hlY2sgdGhlICdcIitlLm1ldGhvZCtcIicgbWV0aG9kLlwiKSxhfX1pZighaClyZXR1cm4gdGhpcy5vYmplY3RMZW5ndGgoZikmJnRoaXMuc3VjY2Vzc0xpc3QucHVzaChiKSwhMH0sY3VzdG9tRGF0YU1lc3NhZ2U6ZnVuY3Rpb24oYixjKXtyZXR1cm4gYShiKS5kYXRhKFwibXNnXCIrYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKStjLnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpKXx8YShiKS5kYXRhKFwibXNnXCIpfSxjdXN0b21NZXNzYWdlOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5zZXR0aW5ncy5tZXNzYWdlc1thXTtyZXR1cm4gYyYmKGMuY29uc3RydWN0b3I9PT1TdHJpbmc/YzpjW2JdKX0sZmluZERlZmluZWQ6ZnVuY3Rpb24oKXtmb3IodmFyIGE9MDthPGFyZ3VtZW50cy5sZW5ndGg7YSsrKWlmKHZvaWQgMCE9PWFyZ3VtZW50c1thXSlyZXR1cm4gYXJndW1lbnRzW2FdfSxkZWZhdWx0TWVzc2FnZTpmdW5jdGlvbihiLGMpe1wic3RyaW5nXCI9PXR5cGVvZiBjJiYoYz17bWV0aG9kOmN9KTt2YXIgZD10aGlzLmZpbmREZWZpbmVkKHRoaXMuY3VzdG9tTWVzc2FnZShiLm5hbWUsYy5tZXRob2QpLHRoaXMuY3VzdG9tRGF0YU1lc3NhZ2UoYixjLm1ldGhvZCksIXRoaXMuc2V0dGluZ3MuaWdub3JlVGl0bGUmJmIudGl0bGV8fHZvaWQgMCxhLnZhbGlkYXRvci5tZXNzYWdlc1tjLm1ldGhvZF0sXCI8c3Ryb25nPldhcm5pbmc6IE5vIG1lc3NhZ2UgZGVmaW5lZCBmb3IgXCIrYi5uYW1lK1wiPC9zdHJvbmc+XCIpLGU9L1xcJD9cXHsoXFxkKylcXH0vZztyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBkP2Q9ZC5jYWxsKHRoaXMsYy5wYXJhbWV0ZXJzLGIpOmUudGVzdChkKSYmKGQ9YS52YWxpZGF0b3IuZm9ybWF0KGQucmVwbGFjZShlLFwieyQxfVwiKSxjLnBhcmFtZXRlcnMpKSxkfSxmb3JtYXRBbmRBZGQ6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmRlZmF1bHRNZXNzYWdlKGEsYik7dGhpcy5lcnJvckxpc3QucHVzaCh7bWVzc2FnZTpjLGVsZW1lbnQ6YSxtZXRob2Q6Yi5tZXRob2R9KSx0aGlzLmVycm9yTWFwW2EubmFtZV09Yyx0aGlzLnN1Ym1pdHRlZFthLm5hbWVdPWN9LGFkZFdyYXBwZXI6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuc2V0dGluZ3Mud3JhcHBlciYmKGE9YS5hZGQoYS5wYXJlbnQodGhpcy5zZXR0aW5ncy53cmFwcGVyKSkpLGF9LGRlZmF1bHRTaG93RXJyb3JzOmZ1bmN0aW9uKCl7dmFyIGEsYixjO2ZvcihhPTA7dGhpcy5lcnJvckxpc3RbYV07YSsrKWM9dGhpcy5lcnJvckxpc3RbYV0sdGhpcy5zZXR0aW5ncy5oaWdobGlnaHQmJnRoaXMuc2V0dGluZ3MuaGlnaGxpZ2h0LmNhbGwodGhpcyxjLmVsZW1lbnQsdGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyksdGhpcy5zaG93TGFiZWwoYy5lbGVtZW50LGMubWVzc2FnZSk7aWYodGhpcy5lcnJvckxpc3QubGVuZ3RoJiYodGhpcy50b1Nob3c9dGhpcy50b1Nob3cuYWRkKHRoaXMuY29udGFpbmVycykpLHRoaXMuc2V0dGluZ3Muc3VjY2Vzcylmb3IoYT0wO3RoaXMuc3VjY2Vzc0xpc3RbYV07YSsrKXRoaXMuc2hvd0xhYmVsKHRoaXMuc3VjY2Vzc0xpc3RbYV0pO2lmKHRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQpZm9yKGE9MCxiPXRoaXMudmFsaWRFbGVtZW50cygpO2JbYV07YSsrKXRoaXMuc2V0dGluZ3MudW5oaWdobGlnaHQuY2FsbCh0aGlzLGJbYV0sdGhpcy5zZXR0aW5ncy5lcnJvckNsYXNzLHRoaXMuc2V0dGluZ3MudmFsaWRDbGFzcyk7dGhpcy50b0hpZGU9dGhpcy50b0hpZGUubm90KHRoaXMudG9TaG93KSx0aGlzLmhpZGVFcnJvcnMoKSx0aGlzLmFkZFdyYXBwZXIodGhpcy50b1Nob3cpLnNob3coKX0sdmFsaWRFbGVtZW50czpmdW5jdGlvbigpe3JldHVybiB0aGlzLmN1cnJlbnRFbGVtZW50cy5ub3QodGhpcy5pbnZhbGlkRWxlbWVudHMoKSl9LGludmFsaWRFbGVtZW50czpmdW5jdGlvbigpe3JldHVybiBhKHRoaXMuZXJyb3JMaXN0KS5tYXAoZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5lbGVtZW50fSl9LHNob3dMYWJlbDpmdW5jdGlvbihiLGMpe3ZhciBkLGUsZixnLGg9dGhpcy5lcnJvcnNGb3IoYiksaT10aGlzLmlkT3JOYW1lKGIpLGo9YShiKS5hdHRyKFwiYXJpYS1kZXNjcmliZWRieVwiKTtoLmxlbmd0aD8oaC5yZW1vdmVDbGFzcyh0aGlzLnNldHRpbmdzLnZhbGlkQ2xhc3MpLmFkZENsYXNzKHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcyksaC5odG1sKGMpKTooaD1hKFwiPFwiK3RoaXMuc2V0dGluZ3MuZXJyb3JFbGVtZW50K1wiPlwiKS5hdHRyKFwiaWRcIixpK1wiLWVycm9yXCIpLmFkZENsYXNzKHRoaXMuc2V0dGluZ3MuZXJyb3JDbGFzcykuaHRtbChjfHxcIlwiKSxkPWgsdGhpcy5zZXR0aW5ncy53cmFwcGVyJiYoZD1oLmhpZGUoKS5zaG93KCkud3JhcChcIjxcIit0aGlzLnNldHRpbmdzLndyYXBwZXIrXCIvPlwiKS5wYXJlbnQoKSksdGhpcy5sYWJlbENvbnRhaW5lci5sZW5ndGg/dGhpcy5sYWJlbENvbnRhaW5lci5hcHBlbmQoZCk6dGhpcy5zZXR0aW5ncy5lcnJvclBsYWNlbWVudD90aGlzLnNldHRpbmdzLmVycm9yUGxhY2VtZW50LmNhbGwodGhpcyxkLGEoYikpOmQuaW5zZXJ0QWZ0ZXIoYiksaC5pcyhcImxhYmVsXCIpP2guYXR0cihcImZvclwiLGkpOjA9PT1oLnBhcmVudHMoXCJsYWJlbFtmb3I9J1wiK3RoaXMuZXNjYXBlQ3NzTWV0YShpKStcIiddXCIpLmxlbmd0aCYmKGY9aC5hdHRyKFwiaWRcIiksaj9qLm1hdGNoKG5ldyBSZWdFeHAoXCJcXFxcYlwiK3RoaXMuZXNjYXBlQ3NzTWV0YShmKStcIlxcXFxiXCIpKXx8KGorPVwiIFwiK2YpOmo9ZixhKGIpLmF0dHIoXCJhcmlhLWRlc2NyaWJlZGJ5XCIsaiksZT10aGlzLmdyb3Vwc1tiLm5hbWVdLGUmJihnPXRoaXMsYS5lYWNoKGcuZ3JvdXBzLGZ1bmN0aW9uKGIsYyl7Yz09PWUmJmEoXCJbbmFtZT0nXCIrZy5lc2NhcGVDc3NNZXRhKGIpK1wiJ11cIixnLmN1cnJlbnRGb3JtKS5hdHRyKFwiYXJpYS1kZXNjcmliZWRieVwiLGguYXR0cihcImlkXCIpKX0pKSkpLCFjJiZ0aGlzLnNldHRpbmdzLnN1Y2Nlc3MmJihoLnRleHQoXCJcIiksXCJzdHJpbmdcIj09dHlwZW9mIHRoaXMuc2V0dGluZ3Muc3VjY2Vzcz9oLmFkZENsYXNzKHRoaXMuc2V0dGluZ3Muc3VjY2Vzcyk6dGhpcy5zZXR0aW5ncy5zdWNjZXNzKGgsYikpLHRoaXMudG9TaG93PXRoaXMudG9TaG93LmFkZChoKX0sZXJyb3JzRm9yOmZ1bmN0aW9uKGIpe3ZhciBjPXRoaXMuZXNjYXBlQ3NzTWV0YSh0aGlzLmlkT3JOYW1lKGIpKSxkPWEoYikuYXR0cihcImFyaWEtZGVzY3JpYmVkYnlcIiksZT1cImxhYmVsW2Zvcj0nXCIrYytcIiddLCBsYWJlbFtmb3I9J1wiK2MrXCInXSAqXCI7cmV0dXJuIGQmJihlPWUrXCIsICNcIit0aGlzLmVzY2FwZUNzc01ldGEoZCkucmVwbGFjZSgvXFxzKy9nLFwiLCAjXCIpKSx0aGlzLmVycm9ycygpLmZpbHRlcihlKX0sZXNjYXBlQ3NzTWV0YTpmdW5jdGlvbihhKXtyZXR1cm4gYS5yZXBsYWNlKC8oW1xcXFwhXCIjJCUmJygpKissLi86Ozw9Pj9AXFxbXFxdXmB7fH1+XSkvZyxcIlxcXFwkMVwiKX0saWRPck5hbWU6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuZ3JvdXBzW2EubmFtZV18fCh0aGlzLmNoZWNrYWJsZShhKT9hLm5hbWU6YS5pZHx8YS5uYW1lKX0sdmFsaWRhdGlvblRhcmdldEZvcjpmdW5jdGlvbihiKXtyZXR1cm4gdGhpcy5jaGVja2FibGUoYikmJihiPXRoaXMuZmluZEJ5TmFtZShiLm5hbWUpKSxhKGIpLm5vdCh0aGlzLnNldHRpbmdzLmlnbm9yZSlbMF19LGNoZWNrYWJsZTpmdW5jdGlvbihhKXtyZXR1cm4vcmFkaW98Y2hlY2tib3gvaS50ZXN0KGEudHlwZSl9LGZpbmRCeU5hbWU6ZnVuY3Rpb24oYil7cmV0dXJuIGEodGhpcy5jdXJyZW50Rm9ybSkuZmluZChcIltuYW1lPSdcIit0aGlzLmVzY2FwZUNzc01ldGEoYikrXCInXVwiKX0sZ2V0TGVuZ3RoOmZ1bmN0aW9uKGIsYyl7c3dpdGNoKGMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSl7Y2FzZVwic2VsZWN0XCI6cmV0dXJuIGEoXCJvcHRpb246c2VsZWN0ZWRcIixjKS5sZW5ndGg7Y2FzZVwiaW5wdXRcIjppZih0aGlzLmNoZWNrYWJsZShjKSlyZXR1cm4gdGhpcy5maW5kQnlOYW1lKGMubmFtZSkuZmlsdGVyKFwiOmNoZWNrZWRcIikubGVuZ3RofXJldHVybiBiLmxlbmd0aH0sZGVwZW5kOmZ1bmN0aW9uKGEsYil7cmV0dXJuIXRoaXMuZGVwZW5kVHlwZXNbdHlwZW9mIGFdfHx0aGlzLmRlcGVuZFR5cGVzW3R5cGVvZiBhXShhLGIpfSxkZXBlbmRUeXBlczp7Ym9vbGVhbjpmdW5jdGlvbihhKXtyZXR1cm4gYX0sc3RyaW5nOmZ1bmN0aW9uKGIsYyl7cmV0dXJuISFhKGIsYy5mb3JtKS5sZW5ndGh9LGZ1bmN0aW9uOmZ1bmN0aW9uKGEsYil7cmV0dXJuIGEoYil9fSxvcHRpb25hbDpmdW5jdGlvbihiKXt2YXIgYz10aGlzLmVsZW1lbnRWYWx1ZShiKTtyZXR1cm4hYS52YWxpZGF0b3IubWV0aG9kcy5yZXF1aXJlZC5jYWxsKHRoaXMsYyxiKSYmXCJkZXBlbmRlbmN5LW1pc21hdGNoXCJ9LHN0YXJ0UmVxdWVzdDpmdW5jdGlvbihiKXt0aGlzLnBlbmRpbmdbYi5uYW1lXXx8KHRoaXMucGVuZGluZ1JlcXVlc3QrKyxhKGIpLmFkZENsYXNzKHRoaXMuc2V0dGluZ3MucGVuZGluZ0NsYXNzKSx0aGlzLnBlbmRpbmdbYi5uYW1lXT0hMCl9LHN0b3BSZXF1ZXN0OmZ1bmN0aW9uKGIsYyl7dGhpcy5wZW5kaW5nUmVxdWVzdC0tLHRoaXMucGVuZGluZ1JlcXVlc3Q8MCYmKHRoaXMucGVuZGluZ1JlcXVlc3Q9MCksZGVsZXRlIHRoaXMucGVuZGluZ1tiLm5hbWVdLGEoYikucmVtb3ZlQ2xhc3ModGhpcy5zZXR0aW5ncy5wZW5kaW5nQ2xhc3MpLGMmJjA9PT10aGlzLnBlbmRpbmdSZXF1ZXN0JiZ0aGlzLmZvcm1TdWJtaXR0ZWQmJnRoaXMuZm9ybSgpPyhhKHRoaXMuY3VycmVudEZvcm0pLnN1Ym1pdCgpLHRoaXMuZm9ybVN1Ym1pdHRlZD0hMSk6IWMmJjA9PT10aGlzLnBlbmRpbmdSZXF1ZXN0JiZ0aGlzLmZvcm1TdWJtaXR0ZWQmJihhKHRoaXMuY3VycmVudEZvcm0pLnRyaWdnZXJIYW5kbGVyKFwiaW52YWxpZC1mb3JtXCIsW3RoaXNdKSx0aGlzLmZvcm1TdWJtaXR0ZWQ9ITEpfSxwcmV2aW91c1ZhbHVlOmZ1bmN0aW9uKGIsYyl7cmV0dXJuIGM9XCJzdHJpbmdcIj09dHlwZW9mIGMmJmN8fFwicmVtb3RlXCIsYS5kYXRhKGIsXCJwcmV2aW91c1ZhbHVlXCIpfHxhLmRhdGEoYixcInByZXZpb3VzVmFsdWVcIix7b2xkOm51bGwsdmFsaWQ6ITAsbWVzc2FnZTp0aGlzLmRlZmF1bHRNZXNzYWdlKGIse21ldGhvZDpjfSl9KX0sZGVzdHJveTpmdW5jdGlvbigpe3RoaXMucmVzZXRGb3JtKCksYSh0aGlzLmN1cnJlbnRGb3JtKS5vZmYoXCIudmFsaWRhdGVcIikucmVtb3ZlRGF0YShcInZhbGlkYXRvclwiKS5maW5kKFwiLnZhbGlkYXRlLWVxdWFsVG8tYmx1clwiKS5vZmYoXCIudmFsaWRhdGUtZXF1YWxUb1wiKS5yZW1vdmVDbGFzcyhcInZhbGlkYXRlLWVxdWFsVG8tYmx1clwiKX19LGNsYXNzUnVsZVNldHRpbmdzOntyZXF1aXJlZDp7cmVxdWlyZWQ6ITB9LGVtYWlsOntlbWFpbDohMH0sdXJsOnt1cmw6ITB9LGRhdGU6e2RhdGU6ITB9LGRhdGVJU086e2RhdGVJU086ITB9LG51bWJlcjp7bnVtYmVyOiEwfSxkaWdpdHM6e2RpZ2l0czohMH0sY3JlZGl0Y2FyZDp7Y3JlZGl0Y2FyZDohMH19LGFkZENsYXNzUnVsZXM6ZnVuY3Rpb24oYixjKXtiLmNvbnN0cnVjdG9yPT09U3RyaW5nP3RoaXMuY2xhc3NSdWxlU2V0dGluZ3NbYl09YzphLmV4dGVuZCh0aGlzLmNsYXNzUnVsZVNldHRpbmdzLGIpfSxjbGFzc1J1bGVzOmZ1bmN0aW9uKGIpe3ZhciBjPXt9LGQ9YShiKS5hdHRyKFwiY2xhc3NcIik7cmV0dXJuIGQmJmEuZWFjaChkLnNwbGl0KFwiIFwiKSxmdW5jdGlvbigpe3RoaXMgaW4gYS52YWxpZGF0b3IuY2xhc3NSdWxlU2V0dGluZ3MmJmEuZXh0ZW5kKGMsYS52YWxpZGF0b3IuY2xhc3NSdWxlU2V0dGluZ3NbdGhpc10pfSksY30sbm9ybWFsaXplQXR0cmlidXRlUnVsZTpmdW5jdGlvbihhLGIsYyxkKXsvbWlufG1heHxzdGVwLy50ZXN0KGMpJiYobnVsbD09PWJ8fC9udW1iZXJ8cmFuZ2V8dGV4dC8udGVzdChiKSkmJihkPU51bWJlcihkKSxpc05hTihkKSYmKGQ9dm9pZCAwKSksZHx8MD09PWQ/YVtjXT1kOmI9PT1jJiZcInJhbmdlXCIhPT1iJiYoYVtjXT0hMCl9LGF0dHJpYnV0ZVJ1bGVzOmZ1bmN0aW9uKGIpe3ZhciBjLGQsZT17fSxmPWEoYiksZz1iLmdldEF0dHJpYnV0ZShcInR5cGVcIik7Zm9yKGMgaW4gYS52YWxpZGF0b3IubWV0aG9kcylcInJlcXVpcmVkXCI9PT1jPyhkPWIuZ2V0QXR0cmlidXRlKGMpLFwiXCI9PT1kJiYoZD0hMCksZD0hIWQpOmQ9Zi5hdHRyKGMpLHRoaXMubm9ybWFsaXplQXR0cmlidXRlUnVsZShlLGcsYyxkKTtyZXR1cm4gZS5tYXhsZW5ndGgmJi8tMXwyMTQ3NDgzNjQ3fDUyNDI4OC8udGVzdChlLm1heGxlbmd0aCkmJmRlbGV0ZSBlLm1heGxlbmd0aCxlfSxkYXRhUnVsZXM6ZnVuY3Rpb24oYil7dmFyIGMsZCxlPXt9LGY9YShiKSxnPWIuZ2V0QXR0cmlidXRlKFwidHlwZVwiKTtmb3IoYyBpbiBhLnZhbGlkYXRvci5tZXRob2RzKWQ9Zi5kYXRhKFwicnVsZVwiK2MuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkrYy5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSksdGhpcy5ub3JtYWxpemVBdHRyaWJ1dGVSdWxlKGUsZyxjLGQpO3JldHVybiBlfSxzdGF0aWNSdWxlczpmdW5jdGlvbihiKXt2YXIgYz17fSxkPWEuZGF0YShiLmZvcm0sXCJ2YWxpZGF0b3JcIik7cmV0dXJuIGQuc2V0dGluZ3MucnVsZXMmJihjPWEudmFsaWRhdG9yLm5vcm1hbGl6ZVJ1bGUoZC5zZXR0aW5ncy5ydWxlc1tiLm5hbWVdKXx8e30pLGN9LG5vcm1hbGl6ZVJ1bGVzOmZ1bmN0aW9uKGIsYyl7cmV0dXJuIGEuZWFjaChiLGZ1bmN0aW9uKGQsZSl7aWYoZT09PSExKXJldHVybiB2b2lkIGRlbGV0ZSBiW2RdO2lmKGUucGFyYW18fGUuZGVwZW5kcyl7dmFyIGY9ITA7c3dpdGNoKHR5cGVvZiBlLmRlcGVuZHMpe2Nhc2VcInN0cmluZ1wiOmY9ISFhKGUuZGVwZW5kcyxjLmZvcm0pLmxlbmd0aDticmVhaztjYXNlXCJmdW5jdGlvblwiOmY9ZS5kZXBlbmRzLmNhbGwoYyxjKX1mP2JbZF09dm9pZCAwPT09ZS5wYXJhbXx8ZS5wYXJhbTooYS5kYXRhKGMuZm9ybSxcInZhbGlkYXRvclwiKS5yZXNldEVsZW1lbnRzKGEoYykpLGRlbGV0ZSBiW2RdKX19KSxhLmVhY2goYixmdW5jdGlvbihkLGUpe2JbZF09YS5pc0Z1bmN0aW9uKGUpJiZcIm5vcm1hbGl6ZXJcIiE9PWQ/ZShjKTplfSksYS5lYWNoKFtcIm1pbmxlbmd0aFwiLFwibWF4bGVuZ3RoXCJdLGZ1bmN0aW9uKCl7Ylt0aGlzXSYmKGJbdGhpc109TnVtYmVyKGJbdGhpc10pKX0pLGEuZWFjaChbXCJyYW5nZWxlbmd0aFwiLFwicmFuZ2VcIl0sZnVuY3Rpb24oKXt2YXIgYztiW3RoaXNdJiYoYS5pc0FycmF5KGJbdGhpc10pP2JbdGhpc109W051bWJlcihiW3RoaXNdWzBdKSxOdW1iZXIoYlt0aGlzXVsxXSldOlwic3RyaW5nXCI9PXR5cGVvZiBiW3RoaXNdJiYoYz1iW3RoaXNdLnJlcGxhY2UoL1tcXFtcXF1dL2csXCJcIikuc3BsaXQoL1tcXHMsXSsvKSxiW3RoaXNdPVtOdW1iZXIoY1swXSksTnVtYmVyKGNbMV0pXSkpfSksYS52YWxpZGF0b3IuYXV0b0NyZWF0ZVJhbmdlcyYmKG51bGwhPWIubWluJiZudWxsIT1iLm1heCYmKGIucmFuZ2U9W2IubWluLGIubWF4XSxkZWxldGUgYi5taW4sZGVsZXRlIGIubWF4KSxudWxsIT1iLm1pbmxlbmd0aCYmbnVsbCE9Yi5tYXhsZW5ndGgmJihiLnJhbmdlbGVuZ3RoPVtiLm1pbmxlbmd0aCxiLm1heGxlbmd0aF0sZGVsZXRlIGIubWlubGVuZ3RoLGRlbGV0ZSBiLm1heGxlbmd0aCkpLGJ9LG5vcm1hbGl6ZVJ1bGU6ZnVuY3Rpb24oYil7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGIpe3ZhciBjPXt9O2EuZWFjaChiLnNwbGl0KC9cXHMvKSxmdW5jdGlvbigpe2NbdGhpc109ITB9KSxiPWN9cmV0dXJuIGJ9LGFkZE1ldGhvZDpmdW5jdGlvbihiLGMsZCl7YS52YWxpZGF0b3IubWV0aG9kc1tiXT1jLGEudmFsaWRhdG9yLm1lc3NhZ2VzW2JdPXZvaWQgMCE9PWQ/ZDphLnZhbGlkYXRvci5tZXNzYWdlc1tiXSxjLmxlbmd0aDwzJiZhLnZhbGlkYXRvci5hZGRDbGFzc1J1bGVzKGIsYS52YWxpZGF0b3Iubm9ybWFsaXplUnVsZShiKSl9LG1ldGhvZHM6e3JlcXVpcmVkOmZ1bmN0aW9uKGIsYyxkKXtpZighdGhpcy5kZXBlbmQoZCxjKSlyZXR1cm5cImRlcGVuZGVuY3ktbWlzbWF0Y2hcIjtpZihcInNlbGVjdFwiPT09Yy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKXt2YXIgZT1hKGMpLnZhbCgpO3JldHVybiBlJiZlLmxlbmd0aD4wfXJldHVybiB0aGlzLmNoZWNrYWJsZShjKT90aGlzLmdldExlbmd0aChiLGMpPjA6Yi5sZW5ndGg+MH0sZW1haWw6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L15bYS16QS1aMC05LiEjJCUmJyorXFwvPT9eX2B7fH1+LV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykqJC8udGVzdChhKX0sdXJsOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fC9eKD86KD86KD86aHR0cHM/fGZ0cCk6KT9cXC9cXC8pKD86XFxTKyg/OjpcXFMqKT9AKT8oPzooPyEoPzoxMHwxMjcpKD86XFwuXFxkezEsM30pezN9KSg/ISg/OjE2OVxcLjI1NHwxOTJcXC4xNjgpKD86XFwuXFxkezEsM30pezJ9KSg/ITE3MlxcLig/OjFbNi05XXwyXFxkfDNbMC0xXSkoPzpcXC5cXGR7MSwzfSl7Mn0pKD86WzEtOV1cXGQ/fDFcXGRcXGR8MlswMV1cXGR8MjJbMC0zXSkoPzpcXC4oPzoxP1xcZHsxLDJ9fDJbMC00XVxcZHwyNVswLTVdKSl7Mn0oPzpcXC4oPzpbMS05XVxcZD98MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC00XSkpfCg/Oig/OlthLXpcXHUwMGExLVxcdWZmZmYwLTldLSopKlthLXpcXHUwMGExLVxcdWZmZmYwLTldKykoPzpcXC4oPzpbYS16XFx1MDBhMS1cXHVmZmZmMC05XS0qKSpbYS16XFx1MDBhMS1cXHVmZmZmMC05XSspKig/OlxcLig/OlthLXpcXHUwMGExLVxcdWZmZmZdezIsfSkpLj8pKD86OlxcZHsyLDV9KT8oPzpbLz8jXVxcUyopPyQvaS50ZXN0KGEpfSxkYXRlOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fCEvSW52YWxpZHxOYU4vLnRlc3QobmV3IERhdGUoYSkudG9TdHJpbmcoKSl9LGRhdGVJU086ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L15cXGR7NH1bXFwvXFwtXSgwP1sxLTldfDFbMDEyXSlbXFwvXFwtXSgwP1sxLTldfFsxMl1bMC05XXwzWzAxXSkkLy50ZXN0KGEpfSxudW1iZXI6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8L14oPzotP1xcZCt8LT9cXGR7MSwzfSg/OixcXGR7M30pKyk/KD86XFwuXFxkKyk/JC8udGVzdChhKX0sZGlnaXRzOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub3B0aW9uYWwoYil8fC9eXFxkKyQvLnRlc3QoYSl9LG1pbmxlbmd0aDpmdW5jdGlvbihiLGMsZCl7dmFyIGU9YS5pc0FycmF5KGIpP2IubGVuZ3RoOnRoaXMuZ2V0TGVuZ3RoKGIsYyk7cmV0dXJuIHRoaXMub3B0aW9uYWwoYyl8fGU+PWR9LG1heGxlbmd0aDpmdW5jdGlvbihiLGMsZCl7dmFyIGU9YS5pc0FycmF5KGIpP2IubGVuZ3RoOnRoaXMuZ2V0TGVuZ3RoKGIsYyk7cmV0dXJuIHRoaXMub3B0aW9uYWwoYyl8fGU8PWR9LHJhbmdlbGVuZ3RoOmZ1bmN0aW9uKGIsYyxkKXt2YXIgZT1hLmlzQXJyYXkoYik/Yi5sZW5ndGg6dGhpcy5nZXRMZW5ndGgoYixjKTtyZXR1cm4gdGhpcy5vcHRpb25hbChjKXx8ZT49ZFswXSYmZTw9ZFsxXX0sbWluOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8YT49Y30sbWF4OmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gdGhpcy5vcHRpb25hbChiKXx8YTw9Y30scmFuZ2U6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLm9wdGlvbmFsKGIpfHxhPj1jWzBdJiZhPD1jWzFdfSxzdGVwOmZ1bmN0aW9uKGIsYyxkKXt2YXIgZSxmPWEoYykuYXR0cihcInR5cGVcIiksZz1cIlN0ZXAgYXR0cmlidXRlIG9uIGlucHV0IHR5cGUgXCIrZitcIiBpcyBub3Qgc3VwcG9ydGVkLlwiLGg9W1widGV4dFwiLFwibnVtYmVyXCIsXCJyYW5nZVwiXSxpPW5ldyBSZWdFeHAoXCJcXFxcYlwiK2YrXCJcXFxcYlwiKSxqPWYmJiFpLnRlc3QoaC5qb2luKCkpLGs9ZnVuY3Rpb24oYSl7dmFyIGI9KFwiXCIrYSkubWF0Y2goLyg/OlxcLihcXGQrKSk/JC8pO3JldHVybiBiJiZiWzFdP2JbMV0ubGVuZ3RoOjB9LGw9ZnVuY3Rpb24oYSl7cmV0dXJuIE1hdGgucm91bmQoYSpNYXRoLnBvdygxMCxlKSl9LG09ITA7aWYoail0aHJvdyBuZXcgRXJyb3IoZyk7cmV0dXJuIGU9ayhkKSwoayhiKT5lfHxsKGIpJWwoZCkhPT0wKSYmKG09ITEpLHRoaXMub3B0aW9uYWwoYyl8fG19LGVxdWFsVG86ZnVuY3Rpb24oYixjLGQpe3ZhciBlPWEoZCk7cmV0dXJuIHRoaXMuc2V0dGluZ3Mub25mb2N1c291dCYmZS5ub3QoXCIudmFsaWRhdGUtZXF1YWxUby1ibHVyXCIpLmxlbmd0aCYmZS5hZGRDbGFzcyhcInZhbGlkYXRlLWVxdWFsVG8tYmx1clwiKS5vbihcImJsdXIudmFsaWRhdGUtZXF1YWxUb1wiLGZ1bmN0aW9uKCl7YShjKS52YWxpZCgpfSksYj09PWUudmFsKCl9LHJlbW90ZTpmdW5jdGlvbihiLGMsZCxlKXtpZih0aGlzLm9wdGlvbmFsKGMpKXJldHVyblwiZGVwZW5kZW5jeS1taXNtYXRjaFwiO2U9XCJzdHJpbmdcIj09dHlwZW9mIGUmJmV8fFwicmVtb3RlXCI7dmFyIGYsZyxoLGk9dGhpcy5wcmV2aW91c1ZhbHVlKGMsZSk7cmV0dXJuIHRoaXMuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXXx8KHRoaXMuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXT17fSksaS5vcmlnaW5hbE1lc3NhZ2U9aS5vcmlnaW5hbE1lc3NhZ2V8fHRoaXMuc2V0dGluZ3MubWVzc2FnZXNbYy5uYW1lXVtlXSx0aGlzLnNldHRpbmdzLm1lc3NhZ2VzW2MubmFtZV1bZV09aS5tZXNzYWdlLGQ9XCJzdHJpbmdcIj09dHlwZW9mIGQmJnt1cmw6ZH18fGQsaD1hLnBhcmFtKGEuZXh0ZW5kKHtkYXRhOmJ9LGQuZGF0YSkpLGkub2xkPT09aD9pLnZhbGlkOihpLm9sZD1oLGY9dGhpcyx0aGlzLnN0YXJ0UmVxdWVzdChjKSxnPXt9LGdbYy5uYW1lXT1iLGEuYWpheChhLmV4dGVuZCghMCx7bW9kZTpcImFib3J0XCIscG9ydDpcInZhbGlkYXRlXCIrYy5uYW1lLGRhdGFUeXBlOlwianNvblwiLGRhdGE6Zyxjb250ZXh0OmYuY3VycmVudEZvcm0sc3VjY2VzczpmdW5jdGlvbihhKXt2YXIgZCxnLGgsaj1hPT09ITB8fFwidHJ1ZVwiPT09YTtmLnNldHRpbmdzLm1lc3NhZ2VzW2MubmFtZV1bZV09aS5vcmlnaW5hbE1lc3NhZ2Usaj8oaD1mLmZvcm1TdWJtaXR0ZWQsZi5yZXNldEludGVybmFscygpLGYudG9IaWRlPWYuZXJyb3JzRm9yKGMpLGYuZm9ybVN1Ym1pdHRlZD1oLGYuc3VjY2Vzc0xpc3QucHVzaChjKSxmLmludmFsaWRbYy5uYW1lXT0hMSxmLnNob3dFcnJvcnMoKSk6KGQ9e30sZz1hfHxmLmRlZmF1bHRNZXNzYWdlKGMse21ldGhvZDplLHBhcmFtZXRlcnM6Yn0pLGRbYy5uYW1lXT1pLm1lc3NhZ2U9ZyxmLmludmFsaWRbYy5uYW1lXT0hMCxmLnNob3dFcnJvcnMoZCkpLGkudmFsaWQ9aixmLnN0b3BSZXF1ZXN0KGMsail9fSxkKSksXCJwZW5kaW5nXCIpfX19KTt2YXIgYixjPXt9O2EuYWpheFByZWZpbHRlcj9hLmFqYXhQcmVmaWx0ZXIoZnVuY3Rpb24oYSxiLGQpe3ZhciBlPWEucG9ydDtcImFib3J0XCI9PT1hLm1vZGUmJihjW2VdJiZjW2VdLmFib3J0KCksY1tlXT1kKX0pOihiPWEuYWpheCxhLmFqYXg9ZnVuY3Rpb24oZCl7dmFyIGU9KFwibW9kZVwiaW4gZD9kOmEuYWpheFNldHRpbmdzKS5tb2RlLGY9KFwicG9ydFwiaW4gZD9kOmEuYWpheFNldHRpbmdzKS5wb3J0O3JldHVyblwiYWJvcnRcIj09PWU/KGNbZl0mJmNbZl0uYWJvcnQoKSxjW2ZdPWIuYXBwbHkodGhpcyxhcmd1bWVudHMpLGNbZl0pOmIuYXBwbHkodGhpcyxhcmd1bWVudHMpfSl9KTsiLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcbmpRdWVyeSggJ2lmcmFtZVtzcmMqPVwidmltZW8uY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbiB2aW1lbycvPlwiKTtcbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLyohLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogSW5zdGFudCBDb21tZW50IFZhbGlkYXRpb24gLSB2MS4wIC0gMzAvNi8yMDE0XG4gKiBodHRwOi8vd29yZHByZXNzLm9yZy9wbHVnaW5zL2luc3RhbnQtY29tbWVudC12YWxpZGF0aW9uL1xuICogQ29weXJpZ2h0IChjKSAyMDE0IE1yaW5hbCBLYW50aSBSb3k7IExpY2Vuc2U6IEdQTHYyIG9yIGxhdGVyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xualF1ZXJ5LnZhbGlkYXRvci5hZGRNZXRob2QoXCJiZXR0ZXJfZW1haWxcIiwgZnVuY3Rpb24odmFsdWUsIGVsZW1lbnQpIHtcbiAgLy8gYSBiZXR0ZXIgKGJ1dCBub3QgMTAwJSBwZXJmZWN0KSBlbWFpbCB2YWxpZGF0aW9uXG4gIHJldHVybiB0aGlzLm9wdGlvbmFsKCBlbGVtZW50ICkgfHwgL14oW2EtekEtWjAtOV8uKy1dKStcXEAoKFthLXpBLVowLTktXSkrXFwuKSsoW2EtekEtWjAtOV17Miw0fSkrJC8udGVzdCggdmFsdWUgKTtcbn0sICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLicpO1xuXG5qUXVlcnkoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCQpIHtcblx0JCgnI2NvbW1lbnRmb3JtJykudmFsaWRhdGUoe1x0IFxuXHRcdHJ1bGVzOiB7XG5cdFx0ICBhdXRob3I6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9LFx0XHQgXG5cdFx0ICBlbWFpbDoge1xuXHRcdFx0cmVxdWlyZWQ6IHRydWUsXG5cdFx0XHRlbWFpbDogdHJ1ZVxuXHRcdCAgfSxcblx0XHQgIGNvbW1lbnQ6IHtcblx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0bWlubGVuZ3RoOiAyXG5cdFx0ICB9XG5cdFx0fSxcdFx0IFxuXHRcdG1lc3NhZ2VzOiB7XG5cdFx0ICBhdXRob3I6IFwiUGxlYXNlIGVudGVyIHlvdXIgbmFtZVwiLFxuXHRcdCAgZW1haWw6IFwiUGxlYXNlIGVudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzc1wiLFxuXHRcdCAgY29tbWVudDogXCJQbGVhc2UgdHlwZSB5b3VyIGNvbW1lbnRcIlxuXHRcdH0sXHRcdCBcblx0XHRlcnJvckVsZW1lbnQ6IFwiZGl2XCIsXG5cdFx0ZXJyb3JQbGFjZW1lbnQ6IGZ1bmN0aW9uKGVycm9yLCBlbGVtZW50KSB7XG5cdFx0ICBlbGVtZW50LmFmdGVyKGVycm9yKTtcblx0XHR9XHQgXG5cdH0pO1xufSk7XG4iLCJqUXVlcnkoZnVuY3Rpb24oJCl7XG5cdEZvdW5kYXRpb24ucmVJbml0KCdlcXVhbGl6ZXInKTtcbiAgICBpZiAoJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInKS5sZW5ndGgpIHsgLy9hcmUgd2UgZXZlbiBvbiBhIHBhZ2Ugd2l0aCBpbmZpbml0ZSBzY3JvbGw/XG4gICAgICAgIC8vaGlkZSBleGlzdGluZyBwYWdlclxuICAgICAgICAkKFwiLnBhZ2luYXRpb24tY2VudGVyZWRcIikuaGlkZSgpO1xuICAgICAgICAkKCcjY29udGVudC1ncmlkLWNvbnRhaW5lcicpLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwibG9hZC1tb3JlXCI+PC9zcGFuPicgKTtcbiAgICAgICAgLy8kKCAnI2NvbnRlbnQtZ3JpZC1jb250YWluZXInICkuZm91bmRhdGlvbigpOyAvL2luaXRpYWxpemUgZXF1YWxpemVyIHRoZSBmaXJzdCB0aW1lXG5cbiAgICAgICAgLy9SZWluaXRpYWxpemUgZXF1YWxpemVyIG9uIGV2ZXJ5IGFqYXggY2FsbFxuICAgICAgICAkKCBkb2N1bWVudCApLmFqYXhDb21wbGV0ZSggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3VuZGF0aW9uLnJlSW5pdCgnZXF1YWxpemVyJyk7IC8vaHR0cDovL2ZvdW5kYXRpb24uenVyYi5jb20vZm9ydW0vcG9zdHMvMzkzNjMtcmVmbG93LWVxdWFsaXNlclxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYnV0dG9uID0gJCgnI2NvbnRlbnQtZ3JpZC1jb250YWluZXIgLmxvYWQtbW9yZScpO1xuICAgICAgICB2YXIgcGFnZSA9IDI7XG4gICAgICAgIHZhciBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHZhciBhbGxEb25lID0gZmFsc2U7XG4gICAgICAgIHZhciBzY3JvbGxIYW5kbGluZyA9IHtcbiAgICAgICAgICAgIGFsbG93OiB0cnVlLFxuICAgICAgICAgICAgcmVhbGxvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGF5OiA0MDAgLy8obWlsbGlzZWNvbmRzKSBhZGp1c3QgdG8gdGhlIGhpZ2hlc3QgYWNjZXB0YWJsZSB2YWx1ZVxuICAgICAgICB9O1xuXG4gICAgICAgICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKCAhIGxvYWRpbmcgJiYgc2Nyb2xsSGFuZGxpbmcuYWxsb3cgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBhbGxEb25lICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNjcm9sbEhhbmRsaW5nLmFsbG93ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChzY3JvbGxIYW5kbGluZy5yZWFsbG93LCBzY3JvbGxIYW5kbGluZy5kZWxheSk7XG4gICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9ICQoYnV0dG9uKS5vZmZzZXQoKS50b3AgLSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgaWYoIDQwMDAgPiBvZmZzZXQgKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2JlX2FqYXhfbG9hZF9tb3JlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmNlOiBiZWxvYWRtb3JlLm5vbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZTogcGFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiBiZWxvYWRtb3JlLnF1ZXJ5LFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAkLnBvc3QoYmVsb2FkbW9yZS51cmwsIGRhdGEsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIHJlcy5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIHJlcy5kYXRhICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNvbnRlbnQtZ3JpZC1jb250YWluZXInKS5hcHBlbmQoIGJ1dHRvbiApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2UgPSBwYWdlICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoICFyZXMuZGF0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVx0XG59KTsiLCIvKiBHZW5lcmFsIHNpdGUtd2lkZSBzY3JpcHRzIGZvciBNU1AgRmx5IE1hZyAqL1xuXG4kKCcubWNfaW5wdXQnKS5hdHRyKFwicGxhY2Vob2xkZXJcIiwgXCJFbnRlciB5b3VyIGVtYWlsIGFkZHJlc3NcIik7XG5cbi8vU29tZSBwYWdlcyBkb24ndCBnZXQgZXF1YWxpemVkLCBzbyBtYWtlIHN1cmUgdGhleSBkb1xuRm91bmRhdGlvbi5yZUluaXQoJ2VxdWFsaXplcicpO1xuXG4vL0FjdGl2YXRlIHBvbHlmaWxsIGZvciBPYmplY3QgRml0IG9uIElFL0VkZ2Vcbm9iamVjdEZpdEltYWdlcygpO1xuXG4vL0hpZGUgbW9iaWxlIHRvcGJhciBsb2dvIHVudGlsIHdlIHNjcm9sbCBkb3duIHBhZ2VcbmlmICggJCggJy5ob21lJyApLmxlbmd0aCApIHtcbiAgJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbigpe1xuXHRcdGlmICgkKHRoaXMpLnNjcm9sbFRvcCgpID4gMTQ4KSB7XG5cdFx0XHQkKCcudGl0bGUtYmFyLXRpdGxlJykuZmFkZUluKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy50aXRsZS1iYXItdGl0bGUnKS5mYWRlT3V0KCk7XG5cdFx0fVxuXHR9KTtcbn1cbiIsImlmICggJCgnLnBob3RvLWNhcm91c2VsLXNsaWRlcycpLmxlbmd0aCApIHtcbiAgJCgnLnBob3RvLWNhcm91c2VsLXNsaWRlcycpLnNsaWNrKHtcbiAgICBzbGlkZTogJ2xpJyxcbiAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgYXJyb3dzOiBmYWxzZSxcbiAgICBmYWRlOiB0cnVlLFxuICAgIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLWNvbnRyb2xzJ1xuICB9KTtcblxuICAkKCcucGhvdG8tY2Fyb3VzZWwtY29udHJvbHMnKS5zbGljayh7XG4gICAgc2xpZGU6ICdsaScsXG4gICAgc2xpZGVzVG9TaG93OiA3LFxuICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgIGFzTmF2Rm9yOiAnLnBob3RvLWNhcm91c2VsLXNsaWRlcycsXG4gICAgYXJyb3dzOiBmYWxzZSxcbiAgICBkb3RzOiBmYWxzZSxcbiAgICBjZW50ZXJNb2RlOiBmYWxzZSxcbiAgICBmb2N1c09uU2VsZWN0OiB0cnVlXG4gIH0pO1xufVxuIiwiJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvL0NoZWNrIHRvIHNlZSBpZiB0aGUgd2luZG93IGlzIHRvcCBpZiBub3QgdGhlbiBkaXNwbGF5IGJ1dHRvblxyXG5cdCQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKXtcclxuXHRcdGlmICgkKHRoaXMpLnNjcm9sbFRvcCgpID4gODAwKSB7XHJcblx0XHRcdCQoJyNzY3JvbGwtdG8tdG9wJykuZmFkZUluKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQkKCcjc2Nyb2xsLXRvLXRvcCcpLmZhZGVPdXQoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHRcclxuXHQvL0NsaWNrIGV2ZW50IHRvIHNjcm9sbCB0byB0b3BcclxuXHQkKCcjc2Nyb2xsLXRvLXRvcCcpLmNsaWNrKGZ1bmN0aW9uKCl7XHJcblx0XHQkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7c2Nyb2xsVG9wIDogMH0sODAwKTtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9KTtcclxuXHRcclxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
