/*
Copyright (c) 2010: Leif Eriksson (http://leif.fi/)
License: GPLv3 (http://www.gnu.org/licenses/gpl.html)

This software depends on the ExtJS library (http://www.sencha.com/products/js/), 
and the Google Map JavaScript API 3.0 (http://code.google.com/apis/maps/documentation/javascript/)
 */

var MapBooklet = function()
{
  /*****************************************************************************
   * PRIVATE SPACE
   ****************************************************************************/

  var EXTJS_V = 'extjs-3.3.0';
  var WIDTH = 400;
  var HEIGHT = 400;
  var OFFSET = 30;
  
  var JS_STATE = false;
  var IE_QUIRK = false;
  var WIN = false;
  
  // Load external resources
  var _loadFiles = function(readyFn)
  {
    // Load css
    _loadCSS('http://www.leif.fi/bookmarklets/ext-min.css');

    // Hack: Pages with an older Ext loaded don't work properly,
    // so I reset it here. This might break page functionality though.
    Ext = undefined;

    // Set all js files to be loaded
    var js =  
      [ 
       ['http://maps.google.com/maps/api/js?sensor=false'],
       ['Ext', 'http://extjs-public.googlecode.com/svn/tags/'+EXTJS_V+'/release/adapter/ext/ext-base.js'],
       ['Ext.data.ArrayStore','http://www.leif.fi/bookmarklets/ext-min.js']
//     ['Ext.data.ArrayStore','http://extjs-public.googlecode.com/svn/tags/'+EXTJS_V+'/release/ext-all.js']
       ];

    // Load files
    _loadJSFiles(js, 0, readyFn);
  }

  // Function called when all loaded
  var _onLoad = function()
  {
    // Init Ext
    Ext.BLANK_IMAGE_URL = 'http://extjs-public.googlecode.com/svn/tags/'+
    EXTJS_V+'/release/resources/images/default/s.gif';
    Ext.state.Manager.setProvider( 
        new Ext.state.CookieProvider( 
            {
              expires: new Date( new Date().getTime()+(1000*60*60*24*365) )
            } 
        ) 
    );

    // Init window
    _initWin();

    JS_STATE = 'loaded';
  };

  var _loadJSFiles = function(jss,i,ready)
  {
    var js = jss[i];

    // Next step
    var next = ( i == ( jss.length-1 ) ) ? ready : 
      function() { _loadJSFiles(jss, i+1, ready); }

    // JS not loaded, load it
    try
    {
      if( eval(js[0] ) == undefined )
        _loadJS(js[1], next);
      else
        next();
    }
    catch(e)
    {
      _loadJS(js[1], next);
    }
  };

  var _loadJS = function(src, onload)
  {
    var js = document.createElement('script');
    js.setAttribute('src', src);
    if(onload)
    {
      js.onreadystatechange = onload; // <-- IE only
      var e = function() { alert("Error: Failed to load "+js); }
      js.onerror = e;
      js.onabort = e;
      js.onload = onload;
    }
    
    var body  = document.getElementsByTagName('body')[0];
    if(!body) return;
    
    body.appendChild(js);
  };
  
  var _loadCSS = function(href,first)
  {
    var ss = document.createElement('link');
    ss.setAttribute('rel','stylesheet');
    ss.setAttribute('type','text/css');
    ss.setAttribute('href',href);

    var head  = document.getElementsByTagName('head')[0];
    if(!head) return;
    
    if(first)
      head.insertBefore(ss,head.firstChild);
    else
      head.appendChild(ss);
  };

  // Init window
  var _initWin = function()
  {
    // Init a bit different for IE Quirks Mode
    if (window.navigator.appName == "Microsoft Internet Explorer")
    {
      if (document.documentMode && document.documentMode == 5) // IE8
        IE_QUIRK = true;
      else if( document.compatMode && document.compatMode != "CSS1Compat")
        IE_QUIRK = true;
    }
    var style = { position: "fixed"};
    var shadow = true;
    if(IE_QUIRK)
    {
      style = {};
      shadow = false;
    }

    // Window
    WIN = new Ext.Window( 
        {
          title: 'Map Bookmarklet',
          layout: 
          {
            type: 'vbox',
            align: 'stretch'
          },
          x: ( (_getWinSize().width/2) - (WIDTH/2) ),
          y: ( (_getWinSize().height/2) - (HEIGHT/2) ),
          width: WIDTH,
          height:HEIGHT,
          minWidth: WIDTH,
          minHeight: HEIGHT,
          shadow:shadow,
          buttonAlign:'center',
          closable: true,
          closeAction: 'hide',
//          items: items,
          //stateId: 'win',
          draggable: true,
          maximizable: true,
          // minimizable: true,
          buttons: 
            [
             {
               text: 'Close',
               handler: function()
               {
                 WIN.hide();
               }
             }
             ], 
             style: style,
             listeners:
             {
               'afterrender': function()
               {
                 // Substract scrollbar offsets from x,y
                 Ext.sequence(
                     WIN.dd, 
                     'endDrag', 
                     function()
                     { 
                       if(!IE_QUIRK)
                       {
                         var s = Ext.getBody().getScroll();
                         WIN.setPosition( (WIN.x-s.left), (WIN.y-s.top) );
                       }
                     } 
                 )

                 // TODO: Set shadow css position fixed
               }
             }
        }
    );
  };

  var _showWin = function()
  {
    var opened = WIN.isVisible();

    // Show win
    WIN.show();

    // Make sure css fixed window allways stays visible
    if(!opened && !IE_QUIRK)
    {
      var pos = WIN.getPosition();
      var s = Ext.getBody().getScroll();
      var x = pos[0] - s.left;
      var y = pos[1] - s.top;
      var size = _getWinSize();
      if( (x + WIDTH) > size.width ) 
        x = ( size.width - WIDTH - OFFSET );
      if ( x < 0 ) x = OFFSET;
      if ( y + HEIGHT > size.height ) 
        y = ( size.height - HEIGHT - OFFSET );
      if( y < 0 ) y = OFFSET;
      WIN.setPosition(x,y);
    }

    // In IE Quirks Mode, simply center the window
    else if(IE_QUIRK)
      WIN.center();
  };

  var _hideWin = function()
  {
    WIN.hide();  
  };

  var _getWinSize = function()
  {
    // All except IE
    if( window.innerWidth && window.innerHeight )
      return { width: window.innerWidth, height: window.innerHeight };
      
    // IE
    return { width: document.documentElement.clientWidth, 
      height: documen.documentElement.clientHeight };
  };
  
  var _getSel = function()
  {
    var txt = '';
    if (window.getSelection)
      return window.getSelection();
    else if (document.getSelection)
      return document.getSelection();
    else if (document.selection)
      return document.selection.createRange().text;
    return txt;
  };

  /*****************************************************************************
   * PUBLIC SPACE
   ****************************************************************************/

  return {
    init: function() 
    { 
      // Warn about framesets for now, TODO later
      if( document.getElementsByTagName('frame').length > 0 )
        alert("Warning: This page uses framesets! Map Bookmarklet will probably fail.");
      
      if( !JS_STATE )
      {
        JS_STATE = 'loading';
        _loadFiles(_onLoad); 
      }
    },


    show: function() 
    {
      if( JS_STATE != 'loaded' )
        setTimeout('MapBooklet.show()', 100);
      else
        _showWin(); 
    }
  }
}();

/*******************************************************************************
 * CONTROLLER
 ******************************************************************************/

//Init
MapBooklet.init();

//Show window
MapBooklet.show();