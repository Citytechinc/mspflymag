var objectFitImages=function(){"use strict";function t(t){for(var e,r=getComputedStyle(t).fontFamily,i={};null!==(e=n.exec(r));)i[e[1]]=e[2];return i}function e(e,i){if(!e[c].parsingSrcset){var s=t(e);if(s["object-fit"]=s["object-fit"]||"fill",!e[c].s){if("fill"===s["object-fit"])return;if(!e[c].skipTest&&l&&!s["object-position"])return}var n=e[c].ios7src||e.currentSrc||e.src;if(i)n=i;else if(e.srcset&&!a&&window.picturefill){var o=window.picturefill._.ns;e[c].parsingSrcset=!0,e[o]&&e[o].evaled||window.picturefill._.fillImg(e,{reselect:!0}),e[o].curSrc||(e[o].supported=!1,window.picturefill._.fillImg(e,{reselect:!0})),delete e[c].parsingSrcset,n=e[o].curSrc||n}if(e[c].s)e[c].s=n,i&&(e[c].srcAttr=i);else{e[c]={s:n,srcAttr:i||f.call(e,"src"),srcsetAttr:e.srcset},e.src=c;try{e.srcset&&(e.srcset="",Object.defineProperty(e,"srcset",{value:e[c].srcsetAttr})),r(e)}catch(t){e[c].ios7src=n}}e.style.backgroundImage='url("'+n+'")',e.style.backgroundPosition=s["object-position"]||"center",e.style.backgroundRepeat="no-repeat",/scale-down/.test(s["object-fit"])?(e[c].i||(e[c].i=new Image,e[c].i.src=n),function t(){return e[c].i.naturalWidth?void(e[c].i.naturalWidth>e.width||e[c].i.naturalHeight>e.height?e.style.backgroundSize="contain":e.style.backgroundSize="auto"):void setTimeout(t,100)}()):e.style.backgroundSize=s["object-fit"].replace("none","auto").replace("fill","100% 100%")}}function r(t){var r={get:function(){return t[c].s},set:function(r){return delete t[c].i,e(t,r),r}};Object.defineProperty(t,"src",r),Object.defineProperty(t,"currentSrc",{get:r.get})}function i(){u||(HTMLImageElement.prototype.getAttribute=function(t){return!this[c]||"src"!==t&&"srcset"!==t?f.call(this,t):this[c][t+"Attr"]},HTMLImageElement.prototype.setAttribute=function(t,e){!this[c]||"src"!==t&&"srcset"!==t?g.call(this,t,e):this["src"===t?"src":t+"Attr"]=String(e)})}function s(t,r){var i=!A&&!t;if(r=r||{},t=t||"img",u&&!r.skipTest)return!1;"string"==typeof t?t=document.querySelectorAll("img"):t.length||(t=[t]);for(var n=0;n<t.length;n++)t[n][c]=t[n][c]||r,e(t[n]);i&&(document.body.addEventListener("load",function(t){"IMG"===t.target.tagName&&s(t.target,{skipTest:r.skipTest})},!0),A=!0,t="img"),r.watchMQ&&window.addEventListener("resize",s.bind(null,t,{skipTest:r.skipTest}))}var c="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",n=/(object-fit|object-position)\s*:\s*([-\w\s%]+)/g,o=new Image,l="object-fit"in o.style,u="object-position"in o.style,a="string"==typeof o.currentSrc,f=o.getAttribute,g=o.setAttribute,A=!1;return s.supportsObjectFit=l,s.supportsObjectPosition=u,i(),s}();