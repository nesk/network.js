(function() {

  // Constructor

    function SpeedTest(settings, startNow) {
      
      // Properties
        this.requesting = false; // Indicates if a resquest is currently running
        this.timers; // Values stored in this array are used to calculate the connexion speed

        this.maxTime = 6000; // Maximum time used for one test (download OR upload)
        this.serverFile = 'speedtest.php'; // PHP file that will be used to download and upload binary data
      
      // Events
        this.download = {
          onprogress: function(){},
          onload: function(){}
        };

        this.upload = {
          onprogress: function(){},
          onload: function(){}
        };
      
      // Init
        this.applySettings(settings, this);

        startNow && startRequest(true, true); // Immediatly launch the two requests if the user specified it

    }


  // Methods
    
    var fn = SpeedTest.prototype; // Shortcut

    fn.startRequest = function(download, twoRequests) { // Can start requests for both uses : download or upload
      
      if(this.requesting) return; // Multiple requests are bad!

      // Init
        var o = this,
            xhr = new XMLHttpRequest();

        xhr.open('POST', this.serverFile);

      // Events
        var xhrProgress = function(e) {
          
          var timers = o.timers,
              progress = e.progress || e.loaded; // Firefox 6 fix

          timers.push([new Date().getTime(), progress]); // Adding time and progression to be able to calculate speed

          var timersLen = timers.length - 1,
              timeDelta = timers[timersLen][0] - timers[timersLen - 1][0],
              progressDelta = timers[timersLen][1] - timers[timersLen - 1][1],
              instantSpeed = Math.ceil(progressDelta / timeDelta); // Here is your instant speed!

          // User event
            if(download) {
              o.download.onprogress(instantSpeed);
            } else {
              o.upload.onprogress(instantSpeed);
            }

        };

        if(download) {
          xhr.onprogress = xhrProgress;
        } else {
          xhr.upload.onprogress = xhrProgress;
        }

        var xhrLoad = function() {

          o.requesting = false;

          var timers = o.timers,
              timeDelta = new Date().getTime() - timers[0][0],
              avgSpeed = Math.ceil(timers[timers.length - 1][1] / timeDelta);

          // User event
            if(download) {
              o.download.onload(avgSpeed);
            } else {
              o.upload.onload(avgSpeed);
            }
          
          // Second request
            twoRequests && o.startRequest(!download);

        };

        xhr.onload = xhrLoad;

      // Data
        if(!download) {

          // I didn't find HOW to be able to upload an arrayBuffer in AJAX (help ?),
          // so I use text data. Yeah, it's crappy, but I have, actually, no choice...

          var data = '';

          for(var i = 0 ; i < 10485760 ; i++) { // 10 Mo
            data += ' ';
          }

        }

        var form = new FormData();

        if(download) {
          form.append('d', 'd'); // "d" for download
        } else {
          form.append('u', data); // "u" for upload
        }

      // Send
        this.requesting = true;
        this.timers = [[ new Date().getTime(), 0]]; // Initializes the timers list

        this.maxTime && setTimeout(function() { // timeout property isn't supported by many recent web browsers
          
          if(xhr.readyState < 4) {
            xhr.abort();
            xhrLoad();
          }

        }, this.maxTime);
        
        xhr.send(form);

    };


    fn.applySettings = function(settings, applyTo) {

      for(var i in settings) {
        if(typeof applyTo[i] != undefined) {
          
          if(typeof settings[i] != 'object') {
            applyTo[i] = settings[i];
          } else {
            this.applySettings(settings[i], applyTo[i]);
          }

        }
      }

    };


  // Exposure
    window.SpeedTest = SpeedTest;

})();