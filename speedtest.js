(function() {

  // Constructor

    function SpeedTest(settings, startNow) {
      
      // Properties
        this.requesting = false; // Indicates if a resquest is currently running
        this.steps; // Values stored in this array are used to calculate the connexion speed

        this.maxTime = 8000; // Maximum time used for one test (download OR upload)
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
        this.maxSpeed = null;
        this.minSpeed = null;
        this.readyForMaxMin = false; // maxSpeed and minSpeed values aren't accurate when the request is starting, a delay is needed

        var o = this,
            xhr = new XMLHttpRequest();

        xhr.open('POST', this.serverFile);

      // Events
        var xhrProgress = function(e) {
          
          var steps = o.steps,
              progress = e.progress || e.loaded; // Firefox 6 fix

          steps.push([new Date().getTime(), progress]); // Adding time and progression to be able to calculate speed

          var stepsLen = steps.length - 1,
              timeDelta = steps[stepsLen][0] - steps[stepsLen - 1][0],
              progressDelta = steps[stepsLen][1] - steps[stepsLen - 1][1],
              currentSpeed = Math.ceil(progressDelta / timeDelta); // Here is your instant speed!
          
          if(o.readyForMaxMin) { // See the initialization of the startRequest() function for details on this
            if(o.maxSpeed == null || o.maxSpeed < currentSpeed) {
              o.maxSpeed = currentSpeed;
            }

            if(o.minSpeed == null || o.minSpeed > currentSpeed) {
              o.minSpeed = currentSpeed;
            }
          }

          // User event
            if(download) {
              o.download.onprogress(currentSpeed, o.readyForMaxMin ? o.minSpeed : 0, o.readyForMaxMin ? o.maxSpeed : 0);
            } else {
              o.upload.onprogress(currentSpeed, o.readyForMaxMin ? o.minSpeed : 0, o.readyForMaxMin ? o.maxSpeed : 0);
            }

        };

        if(download) {
          xhr.onprogress = xhrProgress;
        } else {
          xhr.upload.onprogress = xhrProgress;
        }

        var xhrLoad = function() {

          o.requesting = false;

          var steps = o.steps,
              timeDelta = new Date().getTime() - steps[0][0],
              avgSpeed = Math.ceil(steps[steps.length - 1][1] / timeDelta);

          // User event
            if(download) {
              o.download.onload(avgSpeed, o.minSpeed, o.maxSpeed);
            } else {
              o.upload.onload(avgSpeed, o.minSpeed, o.maxSpeed);
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
        this.steps = [[ new Date().getTime(), 0]]; // Initializes the steps list

        this.maxTime && setTimeout(function() { // timeout property isn't supported by many recent web browsers
          
          if(xhr.readyState < 4) {
            xhr.abort();
            xhrLoad();
          }

        }, this.maxTime);

        setTimeout(function() { // The delay needed for max and min values to be accurate
          o.readyForMaxMin = true;
        }, 1000);
        
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