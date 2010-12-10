/*
Copyright (c) 2010: Leif Eriksson (http://leif.fi/)
License: GPLv3 (http://www.gnu.org/licenses/gpl.html)

This software depends on the ExtJS library (http://www.sencha.com/products/js/), 
and the Google Translate API (http://code.google.com/apis/language/translate/overview.html)
 */

var TransBooklet = function()
{
  /*****************************************************************************
   * PRIVATE SPACE
   ****************************************************************************/

  var EXTJS_V = 'extjs-3.3.0';
  var G_API_KEY = 'AIzaSyCdzVWP18WnxcF0j78pXnXiKLbgGzS3zsU'; // <-- Put your Google API key here (https://code.google.com/apis/console/?pli=1#project:352002749240:apis_apis)
  var LANGUAGES = [];
  var TRANSLATE_FROM = 'en';
  var WIDTH = 300;
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
       ['google.load', 'https://www.google.com/jsapi?key='+G_API_KEY],
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
    if( typeof(google) == 'undefined' || !google.load) 
      return;  // <-- IE hacking

    // Load google language
    google.load(
        "language", 
        "1", 
        {
          'callback': function()
          {
            // Init language list
            _setLangList();   

            if( typeof(Ext) == 'undefined' ||
                typeof(Ext.state) == 'undefined' ||
                typeof(Ext.state.Manager) == 'undefined' ) 
              return; // <-- IE hacking

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
          } 
        } 
    );
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

  var _getWinSize = function()
  {
    // All except IE
    if( window.innerWidth && window.innerHeight )
      return { width: window.innerWidth, height: window.innerHeight };
      
    // IE
    return { width: document.documentElement.clientWidth, 
      height: documen.documentElement.clientHeight };
  };
  
  var _setLangList = function()
  {
    for(var name in google.language.Languages)
    {
      var val = google.language.Languages[name];
      name = name.substring(0,1).toUpperCase() + 
      name.substring(1).toLowerCase();
      LANGUAGES.push( [ val, name ] );
    }
  };

  // Init window
  var _initWin = function()
  {
    // Data store
    var store = new Ext.data.ArrayStore( 
        {
          fields: ['value','name'],
          data: LANGUAGES
        } 
    ); 

    // Set from language from session, if exists
    var from = ( typeof(Ext.state.Manager.get('from') ) != 'undefined') ? 
        Ext.state.Manager.get('from') : TRANSLATE_FROM;

    // Set to language from session, default value, or client
    var to = ( typeof(Ext.state.Manager.get('to') ) != 'undefined') ? 
        Ext.state.Manager.get('to') : 
      ( typeof(window._TRANSLATE_TO) != 'undefined' && window._TRANSLATE_TO != null ) ?
          window._TRANSLATE_TO : _matchLang( _getClientLang() );
    
    // Windows items
    var items = 
      [ 
       {
         xtype:'panel',
         title: 'Source',
         flex: 2,
         layout: 
         {
           type: 'vbox',
           align: 'stretch'
         },
         items: 
           [
            // From fieldset
            {
              xtype: 'combo',
              shadow: false,
              fieldLabel: 'Source',
              name: 'from',
              id: 'from',
              displayField:'name',
              store: store,
              typeAhead: true,
              mode: 'local',
              forceSelection: true,
              triggerAction: 'all',
              emptyText:'Select a language...',
              valueField: 'value',
              value: from,
              stateful: true,
              stateId: 'from',
              stateEvents: ['select'],
              getState: function() { return Ext.getCmp('from').value; }
            },
            {
              fieldLabel: 'Text',
              xtype: 'textarea',
              style: 
              {
                color: '#cccccc'
              },
              name: 'fromText',
              id: 'fromText',
              emptyText: '',
              selectOnFocus: true,
              flex: 1
            }
            ]
       },
       // To fieldset
       {
         xtype:'panel',
         title: 'Translation',
         flex: 3, 
         layout: 
         {
           type: 'vbox',
           align: 'stretch'
         },
         items :
           [
            {
              xtype: 'combo',
              shadow: false,
              fieldLabel: 'Translation',
              name: 'to',
              id: 'to',
              displayField:'name',
              store: store,
              typeAhead: true,
              mode: 'local',
              forceSelection: true,
              triggerAction: 'all',
              emptyText:'Select a language...',
              valueField: 'value',
              value: to,
              stateful: true,
              stateId: 'to',
              stateEvents: ['select'],
              getState: function() { return Ext.getCmp('to').value; }
            },
            {
              fieldLabel: 'Text',
              xtype: 'textarea',
              name: 'toText',
              id: 'toText',
              emptyText: '',
              selectOnFocus: true,
              flex: 1
            }
            ]
       }
       ]

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
          title: 'Translate Bookmarklet (Powered by Google)',
          layout: 
          {
            type: 'vbox',
            align: 'stretch'
          },
          x: ( _getWinSize().width - WIDTH - OFFSET ),
          y: OFFSET,
          width: WIDTH,
          height:HEIGHT,
          // maximizable: true,
          minWidth: WIDTH,
          minHeight: HEIGHT,
          shadow:shadow,
          //bodyStyle:'padding:5px;',
          buttonAlign:'center',
          closable: true,
          closeAction: 'hide',
          items: items,
          //stateId: 'win',
          draggable: true,
          maximizable: true,
          // minimizable: true,
          buttons: 
            [
             {
               text: 'Translate',
               handler: _translateSel
             },
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
    
    // Tranlsate
    _translateSel();
  };

  var _hideWin = function()
  {
    WIN.hide();  
  };

  var _getClientLang = function()
  {
    return (navigator.language) ? 
        navigator.language : navigator.userLanguage;
  };

  var _matchLang = function(m)
  {
    if(!m) return '';

    for(var i=0; i<LANGUAGES.length; i++)
    {
      var l = LANGUAGES[i][0];
      if( l == m.substring(0,l.length) )
        return l;
    }

    return '';
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

  var _detectLanguage = function(fn)
  {
    var text = Ext.getCmp('fromText').getValue();
    google.language.detect(
        text, 
        function(result) 
        {
          if(!result.error)
          {
            var l = result.language;
            Ext.getCmp('from').setValue(l);
            if(fn)
              fn(text);
          }
        } 
    );
  };

  var _translateSel = function()
  {
    // Translate from selection if exists
    var text = ''+_getSel();
    if(text != '')
    {
      Ext.getCmp('fromText').setValue( text );
      _detectLanguage( _translate );
    }
    else
      _translate();
  };

  var _translate = function()
  {
    // Translate
    var text = Ext.getCmp('fromText').getValue();
    var from = Ext.getCmp('from').getValue();
    var to = Ext.getCmp('to').getValue();

    google.language.translate(
        text, 
        from, 
        to, 
        function(result) 
        {
          if(result.translation)
          {
            Ext.getCmp('toText').setValue( result.translation );
          }
        } 
    );
  };

  /*****************************************************************************
   * PUBLIC SPACE
   ****************************************************************************/

  return {
    init: function() 
    { 
      // Warn about framesets for now, TODO later
      if( document.getElementsByTagName('frame').length > 0 )
        alert("Warning: This page uses framesets! Translation Bookmarklet will probably fail.");
      
      if( !JS_STATE )
      {
        JS_STATE = 'loading';
        _loadFiles(_onLoad); 
      }
    },


    show: function() 
    {
      if( JS_STATE != 'loaded' )
        setTimeout('TransBooklet.show()', 100);
      else
        _showWin(); 
    }
  }
}();

/*******************************************************************************
 * CONTROLLER
 ******************************************************************************/

//Init
TransBooklet.init();

//Show window
TransBooklet.show();