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
  var G_API_KEY = ''; // <-- Put your Google API key here (https://code.google.com/apis/console/?pli=1#project:352002749240:apis_apis)
  var TRANSLATE_URL = 'https://www.googleapis.com/language/translate/v2?key='+G_API_KEY;
  var LANGUAGES = [];
  var DEFAULT_FROM_LANG = 'en';
  var WIDTH = 300;
  var HEIGHT = 400;
  var OFFSET = 30;

  // Load external resources
  var _loadFiles = function(readyFn)
  {
    // Load css
    _loadCSS('http://www.leif.fi/translate-bookmarklet/ext-min.css');

    // Hack: Pages with an older Ext loaded doesn't work properly,
    // so I reset it here. This might break page functionality though.
    Ext = undefined;

    // Set all js files to be loaded
    var js =  
      [ 
       ['google.load', 'https://www.google.com/jsapi?key='+G_API_KEY],
       ['Ext', 'http://extjs-public.googlecode.com/svn/tags/'+EXTJS_V+'/release/adapter/ext/ext-base.js'],
       ['Ext.data.ArrayStore','http://www.leif.fi/translate-bookmarklet/ext-min.js']
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

            window._TBJS = 'loaded';
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
    document.getElementsByTagName('body')[0].appendChild(js);
  };

  var _loadCSS = function(href,first)
  {
    var ss = document.createElement('link');
    ss.setAttribute('rel','stylesheet');
    ss.setAttribute('type','text/css');
    ss.setAttribute('href',href);

    var head  = document.getElementsByTagName('head')[0];
    if(first)
      head.insertBefore(ss,head.firstChild);
    else
      head.appendChild(ss);
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
        Ext.state.Manager.get('from') : DEFAULT_FROM_LANG;

    // Set to language from session, default value, or client
    var to = ( typeof(Ext.state.Manager.get('to') ) != 'undefined') ? 
        Ext.state.Manager.get('to') : 
      ( typeof(window._DEFAULT_TO_LANG) != 'undefined' && window._DEFAULT_TO_LANG != null ) ?
          window._DEFAULT_TO_LANG : _matchLang( _getClientLang() );
    
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
        window._IE_QUIRK = true;
      else if( document.compatMode && document.compatMode != "CSS1Compat")
        window._IE_QUIRK = true;
    }
    var style = { position: "fixed"};
    var shadow = true;
    if(window._IE_QUIRK)
    {
      style = {};
      shadow = false;
    }

    // Window
    window._TBWin = new Ext.Window( 
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
                 window._TBWin.hide();
               }
             }
             ], 
             style: style,
             listeners:
             {
               'afterrender': function()
               {
                 // Substract scrollbar offsets from x,y
                 var w = window._TBWin;
                 Ext.sequence(
                     w.dd, 
                     'endDrag', 
                     function()
                     { 
                       if(!window._IE_QUIRK)
                       {
                         var s = Ext.getBody().getScroll();
                         w.setPosition( (w.x-s.left), (w.y-s.top) );
                       }
                     } 
                 )

                 // TODO: Set shadow css position fixed
               }
             }
        }
    );
  };

  var _getWinSize = function()
  {
    if( window.innerWidth && window.innerHeight )
      return { width: window.innerWidth, height: window.innerHeight };
      // IE
      return { width: document.documentElement.clientWidth, 
        height: document.documentElement.clientHeight };
  }

  var _showWin = function()
  {
    var w = window._TBWin;
    var opened = w.isVisible();

    // Show win
    w.show();

    // Make sure css fixed window allways stays visible
    if(!opened && !window._IE_QUIRK)
    {
      var pos = w.getPosition();
      var s = Ext.getBody().getScroll();
      var x = pos[0]-s.left;
      var y = pos[1]-s.top;
      if( (x + WIDTH) > _getWinSize().width ) 
        x = ( _getWinSize().width - WIDTH - OFFSET );
      if ( x < 0 ) x = OFFSET;
      if ( y + HEIGHT > _getWinSize().height ) 
        y = ( _getWinSize().height - HEIGHT - OFFSET );
      if( y < 0 ) y = OFFSET;
      w.setPosition(x,y);
    }

    // In IE Quirks Mode, simply center the window
    else if(window._IE_QUIRK)
      w.center();
    
    // Tranlsate
    _translateSel();
  };

  var _hideWin = function()
  {
    window._TBWin.hide();  
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
      if( typeof(window._TBJS) == 'undefined' || window._TBJS == null )
      {
        window._TBJS = "loading";
        _loadFiles(_onLoad); 
      }

    },


    show: function() 
    { 
      if( typeof(window._TBJS) == 'undefined' || window._TBJS != 'loaded' )
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