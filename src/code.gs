
// using http://www.nslabs.jp/js-class-and-inheritance.rhtml
var classInherits = function(subClass, superClass) { 
  if (typeof superClass !== "function" && superClass !== null) { 
    throw new TypeError("superClass must be null or a constructor"); 
  } 
  
  subClass.prototype = Object.create(superClass.prototype, { 
    constructor: { value: subClass, 
                  enumerable: false, 
                  writable: true, 
                  configurable: true } 
  }); 

  if (Object.setPrototypeOf) 
    Object.setPrototypeOf(subClass, superClass); 
  else 
    subClass.__proto__ = superClass;  
}


//----------------------------------------------
/* GCalendarSynchronizerEventProcessor */

GCalendarSynchronizerEventProcessor = function() {
};

GCalendarSynchronizerEventProcessor.prototype.proc = function(event) {
  throw new Error('Not Implemented');
}

GCalendarSynchronizerEventProcessor.prototype.doWhenFullSync = function() {
  /* please implement if necessary...for example alerting. by default, do nothing. */
}


//----------------------------------------------
/* GCalendarSynchronizerEventProcessorTest */

GCalendarSynchronizerEventProcessorTest = function() {
  GCalendarSynchronizerEventProcessor.call(this);
}
classInherits(GCalendarSynchronizerEventProcessorTest, GCalendarSynchronizerEventProcessor);

GCalendarSynchronizerEventProcessorTest.prototype.proc = function(event) {
  Logger.log('event.summary:%s, event.start:%s, event.end:%s, status:%s', event.summary, event.start, event.end, event.status);
  Logger.log(event.organizer.email);
}

GCalendarSynchronizerEventProcessorTest.prototype.doWhenFullSync = function() {
  Logger.log("[warning]full sync");
}


//----------------------------------------------
/* GCalendarSynchronizerTokenManager */

GCalendarSynchronizerTokenManager = function(calendarId, syncTokenKeyName) {
  this._calendarId = calendarId;
  this._syncTokenKeyName = syncTokenKeyName ? syncTokenKeyName : "GCAL_SYNC_TOKEN_" + this._calendarId;
};

GCalendarSynchronizerTokenManager.prototype.loadSyncToken = function() {
  throw new Error('Not Implemented');
};

GCalendarSynchronizerTokenManager.prototype.saveSyncToken = function(syncTokenVal) {
  throw new Error('Not Implemented');
};

GCalendarSynchronizerTokenManager.prototype.deleteSyncToken = function() {
  throw new Error('Not Implemented');
};


//----------------------------------------------
/* GCalendarSynchronizerTokenManagerUsingScriptProp */

GCalendarSynchronizerTokenManagerUsingScriptProp = function(calendarId, syncTokenKeyName, scriptProp) {
  GCalendarSynchronizerTokenManager.call(this, calendarId, syncTokenKeyName);
  this._scriptProp = scriptProp;
};
classInherits(GCalendarSynchronizerTokenManagerUsingScriptProp, GCalendarSynchronizerTokenManager);

GCalendarSynchronizerTokenManagerUsingScriptProp.prototype.loadSyncToken = function() {
  var syncTokenVal = this._scriptProp.getProperty(this._syncTokenKeyName);
  if (syncTokenVal) {
    console.log('loadSyncToken:%s', syncTokenVal ? syncTokenVal : "N/A");
  }
  return syncTokenVal;
};

GCalendarSynchronizerTokenManager.prototype.saveSyncToken = function(syncTokenVal) {
  console.log('saveSyncToken:%s', syncTokenVal);
  this._scriptProp.setProperty(this._syncTokenKeyName, syncTokenVal);
};

GCalendarSynchronizerTokenManager.prototype.deleteSyncToken = function() {
  console.log('deleteSyncToken');
  this._scriptProp.deleteProperty(this._syncTokenKeyName);
};


//----------------------------------------------
/* GCalendarSynchronizer */

GCalendarSynchronizer = function(calendarId, gCalSyncTokenManager) {
  this._calendarId = calendarId;
  this._gCalSyncTokenManager = gCalSyncTokenManager;
};


GCalendarSynchronizer.prototype.proc = function(eventProcessor) {
  var syncToken = this._gCalSyncTokenManager.loadSyncToken();    
  var pageToken = null;
  var events = null;
  var ret = [];
  
  if (!syncToken) {
    eventProcessor.doWhenFullSync();
  }
  
  do {
    var params = pageToken ? {'pageToken': pageToken} : 
      (syncToken ? {"syncToken": syncToken} : {'timeMin': new Date().toISOString()});
    if (syncToken || pageToken) {
      params["showDeleted"] = true;
    }
    
    try {
      events = Calendar.Events.list(this._calendarId, params);
    } catch (e) {
      if (e.message.indexOf('Sync token is no longer valid, a full sync is required.') != -1) {
        this._gCalSyncTokenManager.deleteSyncToken();
        return this.proc(eventProcessor);
      } else {
        throw new Error(e.message);
      }
    }

    if (!events.items) {
      break;
    }
    
    for (var i = 0; i < events.items.length; i++) {
      ret.push(eventProcessor.proc(events.items[i]));
    }
    
    pageToken = events.nextPageToken;
  } while (pageToken);
  
  this._gCalSyncTokenManager.saveSyncToken(events.nextSyncToken);
  return ret;
}


function test() {
  var calendarId = "go1v09pqgsfc586u5ugeco97j4@group.calendar.google.com";
  var gcs = new GCalendarSynchronizer(
    calendarId,
    new GCalendarSynchronizerTokenManagerUsingScriptProp(calendarId)
  );
  var eventProcor = new GCalendarSynchronizerEventProcessorTest();
  gcs.proc(eventProcor);
}

